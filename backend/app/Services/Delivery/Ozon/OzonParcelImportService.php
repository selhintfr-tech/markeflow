<?php

namespace App\Services\Delivery\Ozon;

use App\Models\Delivery\DeliveryShipment;
use App\Models\Delivery\DeliveryShipmentStatusHistory;
use App\Models\Sales\SalesCustomer;
use App\Models\Sales\SalesOrder;
use App\Models\Sales\SalesShipment;
use App\Models\User;
use App\Models\WorkspaceAuditLog;
use App\Services\Sales\OrderLifecycle;
use App\Services\TenantContext;
use Illuminate\Support\Facades\DB;

class OzonParcelImportService
{
    public function __construct(
        private readonly OzonDeliveryAdapter $adapter,
        private readonly OrderLifecycle $orderLifecycle,
        private readonly TenantContext $tenantContext,
    ) {}

    /**
     * Preview an Ozon CSV / TSV parcel export.
     *
     * @param string $workspaceId
     * @param string $content
     * @return array<string, mixed>
     */
    public function preview(string $workspaceId, string $content): array
    {
        return $this->tenantContext->runInContext($workspaceId, function () use ($workspaceId, $content): array {
            $parsedRows = $this->parseCsvContent($content);

            if (empty($parsedRows)) {
                return [
                    'success' => false,
                    'message' => 'The uploaded file contains no readable rows or headers.',
                    'total_rows' => 0,
                    'matched_tracking_count' => 0,
                    'matched_order_count' => 0,
                    'matched_customer_count' => 0,
                    'review_queue_count' => 0,
                    'duplicate_in_file_count' => 0,
                    'rows' => [],
                ];
            }

            $seenTracking = [];
            $previewRows = [];
            $matchedTrackingCount = 0;
            $matchedOrderCount = 0;
            $matchedCustomerCount = 0;
            $reviewQueueCount = 0;
            $duplicateCount = 0;

            // Pre-load workspace data for fast, accurate matching
            $existingSalesShipments = SalesShipment::query()
                ->where('workspace_id', $workspaceId)
                ->with(['order.customer'])
                ->get()
                ->keyBy(fn ($s) => strtoupper(trim((string) $s->tracking_number)));

            $existingDeliveryShipments = DeliveryShipment::query()
                ->where('workspace_id', $workspaceId)
                ->get()
                ->keyBy(fn ($s) => strtoupper(trim((string) $s->tracking_number)));

            $ordersByNumber = SalesOrder::query()
                ->where('workspace_id', $workspaceId)
                ->with(['customer', 'shipments'])
                ->get()
                ->keyBy(fn ($o) => strtoupper(trim((string) $o->order_number)));

            $customers = SalesCustomer::query()
                ->where('workspace_id', $workspaceId)
                ->with(['orders' => fn ($q) => $q->whereNotIn('status', ['Delivered', 'Cancelled', 'Returned'])])
                ->get();

            $customersByPhone = [];
            foreach ($customers as $c) {
                $cleaned = $this->normalizePhone((string) $c->phone);
                if ($cleaned) {
                    $customersByPhone[$cleaned][] = $c;
                }
            }

            foreach ($parsedRows as $index => $row) {
                $rawTracking = trim((string) ($row['tracking_number'] ?? ''));
                $trackingKey = strtoupper($rawTracking);
                $rawPhone = trim((string) ($row['phone'] ?? ''));
                $cleanedPhone = $this->normalizePhone($rawPhone);
                $rawRef = trim((string) ($row['order_reference'] ?? ''));
                $refKey = strtoupper($rawRef);
                $rawStatus = trim((string) ($row['status'] ?? ''));
                $normalizedStatus = $this->adapter->normalizeStatus($rawStatus);
                $cod = (float) ($row['cod_amount'] ?? 0);

                $isDuplicateInFile = false;
                if (! empty($trackingKey)) {
                    if (isset($seenTracking[$trackingKey])) {
                        $isDuplicateInFile = true;
                        $duplicateCount++;
                    } else {
                        $seenTracking[$trackingKey] = true;
                    }
                }

                $matchType = 'none';
                $proposedAction = 'review_queue';
                $matchedOrder = null;
                $matchedCustomer = null;
                $explanation = '';

                // Hierarchy Match 1: Exact Tracking Number Match
                if (! empty($trackingKey) && (isset($existingSalesShipments[$trackingKey]) || isset($existingDeliveryShipments[$trackingKey]))) {
                    $salesShipment = $existingSalesShipments[$trackingKey] ?? null;
                    $matchedOrder = $salesShipment?->order;
                    $matchedCustomer = $matchedOrder?->customer;
                    $matchType = 'tracking_number';
                    $matchedTrackingCount++;

                    $currentStatus = $salesShipment?->status ?? 'Unknown';
                    if (in_array($currentStatus, ['Delivered', 'Returned'], true)) {
                        $proposedAction = 'preserve_terminal';
                        $explanation = "Shipment already exists with terminal status [{$currentStatus}]. Terminal status will be preserved.";
                    } else {
                        $proposedAction = 'update_existing_status';
                        $explanation = "Existing shipment found for order [{$matchedOrder?->order_number}]. Status will be synchronized to [{$normalizedStatus}].";
                    }
                }
                // Hierarchy Match 2: Order Reference Match
                elseif (! empty($refKey) && isset($ordersByNumber[$refKey])) {
                    $order = $ordersByNumber[$refKey];
                    $matchedOrder = $order;
                    $matchedCustomer = $order->customer;
                    $matchType = 'order_reference';
                    $matchedOrderCount++;

                    $hasOzonTracking = $order->shipments->first(fn ($s) => ! empty($s->tracking_number));
                    if ($hasOzonTracking) {
                        $proposedAction = 'verify_reference_conflict';
                        $explanation = "Order [{$order->order_number}] already has tracking [{$hasOzonTracking->tracking_number}]. Manual verification required.";
                    } else {
                        $proposedAction = 'link_to_order';
                        $explanation = "Matches order [{$order->order_number}]. Will link tracking [{$rawTracking}] to this order.";
                    }
                }
                // Hierarchy Match 3: Customer Phone Match
                elseif (! empty($cleanedPhone) && isset($customersByPhone[$cleanedPhone])) {
                    $matchingCustomers = $customersByPhone[$cleanedPhone];
                    if (count($matchingCustomers) === 1) {
                        $candidateCustomer = $matchingCustomers[0];
                        $matchedCustomer = $candidateCustomer;
                        $openOrders = $candidateCustomer->orders;

                        if ($openOrders->count() === 1) {
                            $matchedOrder = $openOrders->first();
                            $matchType = 'customer_single_open_order';
                            $matchedCustomerCount++;
                            $proposedAction = 'link_to_customer_order';
                            $explanation = "Matches customer [{$candidateCustomer->first_name} {$candidateCustomer->last_name}] and single open order [{$matchedOrder->order_number}].";
                        } else {
                            $matchType = 'customer_ambiguous_orders';
                            $reviewQueueCount++;
                            $proposedAction = 'review_queue';
                            $explanation = "Matches customer [{$candidateCustomer->first_name} {$candidateCustomer->last_name}] but has {$openOrders->count()} orders. Added to review queue.";
                        }
                    } else {
                        $matchType = 'multiple_customers_phone';
                        $reviewQueueCount++;
                        $proposedAction = 'review_queue';
                        $explanation = 'Multiple customers share this phone number. Added to review queue.';
                    }
                }
                // Hierarchy Match 4: Truly New / Ambiguous -> Review Queue
                else {
                    $matchType = 'none';
                    $reviewQueueCount++;
                    $proposedAction = 'import_to_review_queue';
                    $explanation = 'No existing order or customer matched. Will safely import to Delivery Integrations review queue without creating fake sales orders.';
                }

                $previewRows[] = [
                    'row_index' => $index + 1,
                    'tracking_number' => $rawTracking,
                    'recipient_name' => $row['recipient_name'] ?? '',
                    'phone' => $rawPhone,
                    'address' => $row['address'] ?? '',
                    'city' => $row['city'] ?? '',
                    'cod_amount' => $cod,
                    'raw_status' => $rawStatus,
                    'normalized_status' => $normalizedStatus,
                    'order_reference' => $rawRef,
                    'match_type' => $matchType,
                    'proposed_action' => $proposedAction,
                    'matched_order_number' => $matchedOrder?->order_number,
                    'matched_order_id' => $matchedOrder?->id,
                    'matched_customer_name' => $matchedCustomer ? trim("{$matchedCustomer->first_name} {$matchedCustomer->last_name}") : null,
                    'is_duplicate_in_file' => $isDuplicateInFile,
                    'explanation' => $explanation,
                ];
            }

            return [
                'success' => true,
                'message' => "Parsed {$parsedRows->count()} parcel row(s). {$matchedTrackingCount} existing tracking matched, {$matchedOrderCount} order references matched, {$matchedCustomerCount} customer orders matched, {$reviewQueueCount} in review queue.",
                'total_rows' => count($previewRows),
                'matched_tracking_count' => $matchedTrackingCount,
                'matched_order_count' => $matchedOrderCount,
                'matched_customer_count' => $matchedCustomerCount,
                'review_queue_count' => $reviewQueueCount,
                'duplicate_in_file_count' => $duplicateCount,
                'rows' => $previewRows,
            ];
        });
    }

    /**
     * Execute verified parcel import without creating fake financial records or sales orders.
     *
     * @param string $workspaceId
     * @param list<array<string, mixed>> $rows
     * @param User|null $actor
     * @return array<string, mixed>
     */
    public function execute(string $workspaceId, array $rows, ?User $actor = null): array
    {
        return $this->tenantContext->runInContext($workspaceId, function () use ($workspaceId, $rows, $actor): array {
            $updatedExisting = 0;
            $linkedOrders = 0;
            $createdInReviewQueue = 0;
            $preservedTerminal = 0;
            $skipped = 0;

            DB::transaction(function () use (
                $workspaceId,
                $rows,
                $actor,
                &$updatedExisting,
                &$linkedOrders,
                &$createdInReviewQueue,
                &$preservedTerminal,
                &$skipped
            ): void {
                foreach ($rows as $item) {
                    $tracking = trim((string) ($item['tracking_number'] ?? ''));
                    $normalizedStatus = trim((string) ($item['normalized_status'] ?? 'pending'));
                    $rawStatus = trim((string) ($item['raw_status'] ?? ''));
                    $action = $item['proposed_action'] ?? 'review_queue';
                    $orderId = $item['matched_order_id'] ?? null;
                    $cod = (float) ($item['cod_amount'] ?? 0);

                    if (empty($tracking)) {
                        $skipped++;
                        continue;
                    }

                    // Check existing DeliveryShipment
                    $deliveryShipment = DeliveryShipment::query()
                        ->where('workspace_id', $workspaceId)
                        ->where('tracking_number', $tracking)
                        ->first();

                    // Check existing SalesShipment
                    $salesShipment = SalesShipment::query()
                        ->where('workspace_id', $workspaceId)
                        ->where('tracking_number', $tracking)
                        ->first();

                    if ($action === 'preserve_terminal') {
                        $preservedTerminal++;
                        continue;
                    }

                    if ($action === 'update_existing_status' && $salesShipment) {
                        if (in_array($salesShipment->status, ['Delivered', 'Returned'], true)) {
                            $preservedTerminal++;
                            continue;
                        }

                        $candidateSalesStatus = match ($normalizedStatus) {
                            'delivered' => 'Delivered',
                            'returned' => 'Returned',
                            'in_transit', 'out_for_delivery', 'picked_up' => 'In transit',
                            default => $salesShipment->status,
                        };

                        $salesShipment->status = $candidateSalesStatus;
                        $salesShipment->save();

                        if ($salesShipment->order) {
                            $this->orderLifecycle->syncOrderFromShipment($salesShipment);
                        }

                        if ($deliveryShipment) {
                            $deliveryShipment->update([
                                'status' => $normalizedStatus,
                                'raw_status' => $rawStatus,
                                'status_updated_at' => now(),
                            ]);
                        }

                        $updatedExisting++;
                        continue;
                    }

                    if (($action === 'link_to_order' || $action === 'link_to_customer_order') && $orderId) {
                        $order = SalesOrder::query()->where('workspace_id', $workspaceId)->find($orderId);
                        if ($order) {
                            $shipment = $order->shipments->first() ?? new SalesShipment();
                            $shipment->workspace_id = $workspaceId;
                            $shipment->order_id = $order->id;
                            $shipment->delivery_company_id = 'ozon';
                            $shipment->tracking_number = $tracking;
                            $shipment->status = match ($normalizedStatus) {
                                'delivered' => 'Delivered',
                                'returned' => 'Returned',
                                'in_transit', 'out_for_delivery', 'picked_up' => 'In transit',
                                default => 'Ready',
                            };
                            $shipment->cod_amount = $cod ?: (float) $order->total;
                            $shipment->payment_collection_status = 'Pending';
                            $shipment->save();

                            $this->orderLifecycle->syncOrderFromShipment($shipment);

                            DeliveryShipment::updateOrCreate(
                                ['workspace_id' => $workspaceId, 'tracking_number' => $tracking],
                                [
                                    'sales_order_id' => $order->id,
                                    'order_reference' => $order->order_number,
                                    'provider_key' => 'ozon',
                                    'status' => $normalizedStatus,
                                    'raw_status' => $rawStatus,
                                    'cod_amount' => $shipment->cod_amount,
                                    'cod_collected' => false,
                                    'status_updated_at' => now(),
                                ]
                            );

                            $linkedOrders++;
                            continue;
                        }
                    }

                    // Otherwise: Add to Delivery module review queue (never create fake sales orders!)
                    DeliveryShipment::updateOrCreate(
                        ['workspace_id' => $workspaceId, 'tracking_number' => $tracking],
                        [
                            'sales_order_id' => null,
                            'order_reference' => $item['order_reference'] ?? null,
                            'provider_key' => 'ozon',
                            'status' => $normalizedStatus,
                            'raw_status' => $rawStatus,
                            'cod_amount' => $cod,
                            'cod_collected' => false,
                            'status_updated_at' => now(),
                            'last_error' => 'Imported from Ozon parcel export. Pending manual order verification in review queue.',
                        ]
                    );

                    DeliveryShipmentStatusHistory::create([
                        'shipment_id' => DeliveryShipment::where('workspace_id', $workspaceId)->where('tracking_number', $tracking)->value('id'),
                        'status' => $normalizedStatus,
                        'raw_status' => $rawStatus,
                        'occurred_at' => now(),
                        'source' => 'ozon_csv_import',
                    ]);

                    $createdInReviewQueue++;
                }

                WorkspaceAuditLog::log(
                    $workspaceId,
                    'delivery.ozon_csv_imported',
                    'delivery_shipment',
                    $workspaceId,
                    [
                        'total_rows' => count($rows),
                        'updated_existing' => $updatedExisting,
                        'linked_orders' => $linkedOrders,
                        'created_in_review_queue' => $createdInReviewQueue,
                        'preserved_terminal' => $preservedTerminal,
                    ],
                    $actor?->id
                );
            });

            return [
                'success' => true,
                'message' => "Import complete. {$updatedExisting} existing shipment(s) updated, {$linkedOrders} order(s) linked, {$createdInReviewQueue} parcel(s) placed in review queue, {$preservedTerminal} terminal status(es) preserved.",
                'updated_existing' => $updatedExisting,
                'linked_orders' => $linkedOrders,
                'created_in_review_queue' => $createdInReviewQueue,
                'preserved_terminal' => $preservedTerminal,
            ];
        });
    }

    /**
     * Parse raw tabular CSV/TSV content into normalized dictionaries.
     *
     * @return \Illuminate\Support\Collection<int, array<string, string>>
     */
    private function parseCsvContent(string $content)
    {
        // Strip BOM if present
        $cleanContent = preg_replace('/^\xEF\xBB\xBF/', '', trim($content));
        $lines = preg_split('/\r\n|\r|\n/', (string) $cleanContent);

        if (empty($lines)) {
            return collect();
        }

        // Detect delimiter: comma, semicolon, tab
        $firstLine = $lines[0];
        $delimiters = [',', ';', "\t"];
        $chosenDelimiter = ',';
        $maxCount = 0;
        foreach ($delimiters as $delim) {
            $count = substr_count($firstLine, $delim);
            if ($count > $maxCount) {
                $maxCount = $count;
                $chosenDelimiter = $delim;
            }
        }

        $headerRow = str_getcsv(array_shift($lines), $chosenDelimiter);
        $headerMap = [];

        foreach ($headerRow as $colIndex => $colName) {
            $cleanName = mb_strtolower(trim((string) $colName));
            $cleanName = preg_replace('/[éèêë]/u', 'e', $cleanName);
            $cleanName = preg_replace('/[àâä]/u', 'a', $cleanName);
            $cleanName = preg_replace('/[îï]/u', 'i', $cleanName);
            $cleanName = preg_replace('/[ôö]/u', 'o', $cleanName);
            $cleanName = preg_replace('/[ùûü]/u', 'u', $cleanName);
            $cleanName = preg_replace('/[ç]/u', 'c', $cleanName);

            if (preg_match('/(code.*suivi|code.*envoi|tracking|num.*suivi|colis|cn)/', $cleanName)) {
                $headerMap['tracking_number'] = $colIndex;
            } elseif (preg_match('/(destinataire|client|nom)/', $cleanName)) {
                $headerMap['recipient_name'] = $colIndex;
            } elseif (preg_match('/(tel|phone|mobile|gsm)/', $cleanName)) {
                $headerMap['phone'] = $colIndex;
            } elseif (preg_match('/(ville|city|destination)/', $cleanName)) {
                $headerMap['city'] = $colIndex;
            } elseif (preg_match('/(adresse|address|quartier)/', $cleanName)) {
                $headerMap['address'] = $colIndex;
            } elseif (preg_match('/(crbt|prix|montant|cod|valeur|total)/', $cleanName)) {
                $headerMap['cod_amount'] = $colIndex;
            } elseif (preg_match('/(statut|etat|status)/', $cleanName)) {
                $headerMap['status'] = $colIndex;
            } elseif (preg_match('/(ref|commande|order)/', $cleanName)) {
                $headerMap['order_reference'] = $colIndex;
            }
        }

        $results = collect();

        foreach ($lines as $line) {
            if (empty(trim($line))) {
                continue;
            }
            $parts = str_getcsv($line, $chosenDelimiter);
            if (empty($parts)) {
                continue;
            }

            $row = [
                'tracking_number' => isset($headerMap['tracking_number']) ? ($parts[$headerMap['tracking_number']] ?? '') : ($parts[0] ?? ''),
                'recipient_name' => isset($headerMap['recipient_name']) ? ($parts[$headerMap['recipient_name']] ?? '') : '',
                'phone' => isset($headerMap['phone']) ? ($parts[$headerMap['phone']] ?? '') : '',
                'city' => isset($headerMap['city']) ? ($parts[$headerMap['city']] ?? '') : '',
                'address' => isset($headerMap['address']) ? ($parts[$headerMap['address']] ?? '') : '',
                'cod_amount' => isset($headerMap['cod_amount']) ? ($parts[$headerMap['cod_amount']] ?? '') : '',
                'status' => isset($headerMap['status']) ? ($parts[$headerMap['status']] ?? '') : '',
                'order_reference' => isset($headerMap['order_reference']) ? ($parts[$headerMap['order_reference']] ?? '') : '',
            ];

            if (! empty(trim($row['tracking_number']))) {
                $results->push($row);
            }
        }

        return $results;
    }

    /**
     * Clean and normalize phone numbers (e.g. +212, 06, 07).
     */
    private function normalizePhone(string $phone): string
    {
        $digits = preg_replace('/\D/', '', $phone);
        if (str_starts_with($digits, '212')) {
            $digits = '0' . substr($digits, 3);
        }

        return $digits;
    }
}
