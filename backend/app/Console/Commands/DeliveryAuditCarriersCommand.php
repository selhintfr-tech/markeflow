<?php

namespace App\Console\Commands;

use App\Models\Delivery\DeliveryShipment;
use App\Models\Delivery\DeliveryShipmentStatusHistory;
use App\Models\Sales\SalesOrder;
use App\Models\Sales\SalesShipment;
use App\Models\Workspace;
use App\Services\TenantContext;
use Illuminate\Console\Command;

class DeliveryAuditCarriersCommand extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'delivery:audit-and-fix {--workspace= : Target workspace UUID}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Audit all shipments, correct provider relationships (Soulaiman vs MOTOZONE), and enforce strict sales_order_id linkage.';

    /**
     * Execute the console command.
     */
    public function handle(TenantContext $tenantContext): int
    {
        $targetWorkspaceId = $this->option('workspace');

        $query = Workspace::query()->where('status', 'Active');
        if ($targetWorkspaceId) {
            $query->where('id', $targetWorkspaceId);
        }

        $workspaces = $query->get();

        foreach ($workspaces as $workspace) {
            $this->info("==========================================================================");
            $this->info("Auditing Workspace: {$workspace->name} ({$workspace->id})");
            $this->info("==========================================================================");

            $tenantContext->runInContext($workspace, function () use ($workspace) {
                // 1. Specifically verify and fix Soulaiman (ORD-315CE7B9)
                $soulOrder = SalesOrder::query()->where('order_number', 'ORD-315CE7B9')->with(['customer', 'shipments'])->first();
                if ($soulOrder) {
                    $soulShipment = $soulOrder->shipments->first();
                    if ($soulShipment) {
                        $soulShipment->delivery_company_id = 'Khalid Nait Lmouden';
                        $soulShipment->shipping_cost = 0.00;
                        $soulShipment->cod_amount = 0.00;
                        $soulShipment->status = 'Delivered';
                        $soulShipment->save();
                    }

                    // Strict delivery_shipment by sales_order_id
                    $soulDelivery = DeliveryShipment::query()->where('sales_order_id', $soulOrder->id)->first();
                    if (! $soulDelivery) {
                        $soulDelivery = new DeliveryShipment(['workspace_id' => $workspace->id, 'sales_order_id' => $soulOrder->id]);
                    }
                    $soulDelivery->order_reference = 'ORD-315CE7B9';
                    $soulDelivery->provider_key = 'khalid_nait_lmouden';
                    $soulDelivery->tracking_number = 'CRN-005';
                    $soulDelivery->status = 'delivered';
                    $soulDelivery->raw_status = 'Delivered';
                    $soulDelivery->delivery_fee = 0.00;
                    $soulDelivery->cod_amount = 0.00;
                    $soulDelivery->cod_collected = false;
                    $soulDelivery->status_updated_at = $soulOrder->updated_at ?? now();
                    $soulDelivery->save();

                    DeliveryShipmentStatusHistory::updateOrCreate(
                        ['shipment_id' => $soulDelivery->id, 'status' => 'delivered'],
                        ['raw_status' => 'Delivered', 'occurred_at' => $soulOrder->updated_at ?? now(), 'source' => 'sales_shipment_sync', 'workspace_id' => $workspace->id]
                    );
                }

                // 2. Specifically verify and fix MOTOZONE (ORD-544C56F5)
                $motoOrder = SalesOrder::query()->where('order_number', 'ORD-544C56F5')->with(['customer', 'shipments'])->first();
                if ($motoOrder) {
                    $motoShipment = $motoOrder->shipments->first();
                    if ($motoShipment) {
                        $motoShipment->delivery_company_id = 'ozon';
                        $motoShipment->tracking_number = 'CRN-005';
                        $motoShipment->shipping_cost = 0.00;
                        $motoShipment->cod_amount = (float) $motoOrder->total;
                        $motoShipment->status = 'Delivered';
                        $motoShipment->save();
                    }

                    // Strict delivery_shipment by sales_order_id
                    $motoDelivery = DeliveryShipment::query()->where('sales_order_id', $motoOrder->id)->first();
                    if (! $motoDelivery) {
                        $motoDelivery = new DeliveryShipment(['workspace_id' => $workspace->id, 'sales_order_id' => $motoOrder->id]);
                    }
                    $motoDelivery->order_reference = 'ORD-544C56F5';
                    $motoDelivery->provider_key = 'ozon';
                    $motoDelivery->tracking_number = 'CRN-005';
                    $motoDelivery->status = 'delivered';
                    $motoDelivery->raw_status = 'Delivered';
                    $motoDelivery->delivery_fee = 0.00;
                    $motoDelivery->cod_amount = (float) $motoOrder->total;
                    $motoDelivery->cod_collected = false;
                    $motoDelivery->status_updated_at = $motoOrder->updated_at ?? now();
                    $motoDelivery->save();

                    DeliveryShipmentStatusHistory::updateOrCreate(
                        ['shipment_id' => $motoDelivery->id, 'status' => 'delivered'],
                        ['raw_status' => 'Delivered', 'occurred_at' => $motoOrder->updated_at ?? now(), 'source' => 'sales_shipment_sync', 'workspace_id' => $workspace->id]
                    );
                }

                // 3. Remove any orphaned delivery_shipments with no sales_order_id that duplicate CRN-005
                DeliveryShipment::query()
                    ->where('workspace_id', $workspace->id)
                    ->whereNull('sales_order_id')
                    ->where('tracking_number', 'CRN-005')
                    ->delete();

                // 4. Mirror all orders strictly by sales_order_id
                $orders = SalesOrder::query()->where('workspace_id', $workspace->id)->with(['customer', 'shipments'])->get();
                $rows = [];

                foreach ($orders as $order) {
                    $shipment = $order->shipments->first();
                    if (! $shipment) {
                        continue;
                    }

                    $rawCarrier = trim((string) ($shipment->delivery_company_id ?: 'local'));
                    $providerKey = strtolower(preg_replace('/[^a-zA-Z0-9_-]+/', '_', $rawCarrier));
                    $tn = $shipment->tracking_number ? trim((string) $shipment->tracking_number) : null;
                    $fee = (float) ($shipment->shipping_cost ?? 0);
                    $cod = (float) ($shipment->cod_amount ?? 0);

                    $normalizedStatus = match (strtolower(trim((string) $shipment->status))) {
                        'delivered' => 'delivered',
                        'returned' => 'returned',
                        'cancelled' => 'cancelled',
                        'in transit', 'shipping' => 'in_transit',
                        'ready' => 'label_created',
                        'failed' => 'failed',
                        default => 'pending',
                    };

                    $delivery = DeliveryShipment::query()->where('sales_order_id', $order->id)->first();
                    if (! $delivery) {
                        $delivery = DeliveryShipment::create([
                            'workspace_id' => $workspace->id,
                            'sales_order_id' => $order->id,
                            'order_reference' => $order->order_number,
                            'provider_key' => $providerKey,
                            'tracking_number' => $tn,
                            'status' => $normalizedStatus,
                            'raw_status' => $shipment->status,
                            'delivery_fee' => $fee,
                            'cod_amount' => $cod,
                            'cod_collected' => false,
                            'status_updated_at' => $shipment->updated_at ?? now(),
                        ]);

                        DeliveryShipmentStatusHistory::create([
                            'shipment_id' => $delivery->id,
                            'status' => $normalizedStatus,
                            'raw_status' => $shipment->status,
                            'occurred_at' => $shipment->updated_at ?? now(),
                            'source' => 'sales_shipment_sync',
                        ]);
                    } else {
                        $delivery->update([
                            'order_reference' => $order->order_number,
                            'provider_key' => $providerKey,
                            'tracking_number' => $tn,
                            'delivery_fee' => $fee,
                            'cod_amount' => $cod,
                            'status' => $normalizedStatus,
                            'raw_status' => $shipment->status,
                        ]);
                    }

                    $custName = $order->customer ? trim("{$order->customer->first_name} {$order->customer->last_name}") : 'No customer';
                    $source = ($providerKey === 'ozon') ? 'Local (Pending Live Sync)' : 'Local Courier';

                    $rows[] = [
                        $order->order_number,
                        $custName,
                        $providerKey,
                        $tn ?: '—',
                        $shipment->status,
                        number_format($fee, 2) . ' MAD',
                        number_format($cod, 2) . ' MAD',
                        $source,
                    ];
                }

                $this->table(
                    ['Order Ref', 'Customer', 'Carrier (provider_key)', 'Tracking', 'Status', 'Fee', 'COD', 'Provenance'],
                    $rows
                );
            });
        }

        return Command::SUCCESS;
    }
}
