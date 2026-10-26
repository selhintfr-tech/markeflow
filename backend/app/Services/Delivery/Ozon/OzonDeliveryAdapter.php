<?php

namespace App\Services\Delivery\Ozon;

use App\Services\Delivery\DeliveryProviderAdapter;
use App\Services\Delivery\DeliveryShipmentService;
use Illuminate\Http\Request;

class OzonDeliveryAdapter implements DeliveryProviderAdapter
{
    public function __construct(
        private readonly OzonApiClient $client,
    ) {}

    public function key(): string
    {
        return 'ozon';
    }

    public function supportsConnectionTest(): bool
    {
        return true;
    }

    public function testConnection(array $credentials): void
    {
        $result = $this->client->testConnection($credentials);
        if (! ($result['success'] ?? false) && ($result['connection_status'] ?? '') === 'not_connected') {
            throw new \RuntimeException($result['error_message'] ?? 'Ozon connection test failed.');
        }
    }

    /**
     * Return detailed verification report without throwing exception.
     *
     * @param array<string, mixed> $credentials
     * @param string|null $trackingNumber
     * @return array<string, mixed>
     */
    public function verifyConnectionDetails(array $credentials, ?string $trackingNumber = null): array
    {
        return $this->client->testConnection($credentials, $trackingNumber);
    }

    public function createShipment(array $credentials, array $shipment): array
    {
        $recipientName = $shipment['recipient_name']
            ?? $shipment['customer_name']
            ?? $shipment['name']
            ?? 'Customer';

        $phone = $shipment['phone']
            ?? $shipment['telephone']
            ?? '';

        $address = $shipment['address']
            ?? $shipment['adresse']
            ?? 'Morocco';

        $city = $shipment['city']
            ?? $shipment['ville']
            ?? 'Casablanca';

        $codAmount = (float) ($shipment['cod_amount']
            ?? $shipment['total']
            ?? 0);

        $orderReference = $shipment['order_reference']
            ?? $shipment['order_number']
            ?? 'ORD-' . strtoupper(bin2hex(random_bytes(3)));

        $result = $this->client->addParcel($credentials, [
            'order_reference' => $orderReference,
            'recipient_name' => $recipientName,
            'phone' => $phone,
            'address' => $address,
            'city' => $city,
            'cod_amount' => $codAmount,
            'goods_description' => $shipment['goods_description'] ?? 'Marketing & Print Products',
            'notes' => $shipment['notes'] ?? '',
            'idempotency_key' => (string) ($shipment['idempotency_key'] ?? $shipment['id'] ?? ''),
        ]);

        return [
            'tracking_number' => $result['tracking_number'],
            'status' => $this->normalizeStatus($result['status']),
            'raw_status' => $result['raw_status'],
            'cod_amount' => $codAmount,
            'delivery_fee' => (float) ($shipment['delivery_fee'] ?? $shipment['shipping_cost'] ?? 0),
        ];
    }

    public function trackShipment(array $credentials, string $trackingNumber): array
    {
        $trackingMap = $this->client->tracking($credentials, $trackingNumber);
        $event = $trackingMap[$trackingNumber] ?? null;

        $rawStatus = $event['raw_status'] ?? $event['status'] ?? 'unknown';
        $normalizedStatus = $this->normalizeStatus($rawStatus);

        return [
            'status' => $normalizedStatus,
            'raw_status' => $rawStatus,
            'occurred_at' => $event['occurred_at'] ?? null,
            // CRITICAL: Safe status mapping — never report cod_collected simply because a status is delivered
            'cod_collected' => false,
        ];
    }

    public function verifyWebhook(Request $request, array $credentials): bool
    {
        // Webhooks are not assumed or verified for Ozon until officially documented and contracted.
        return false;
    }

    public function parseWebhook(Request $request, array $credentials): array
    {
        return [];
    }

    /**
     * Normalize Ozon status strings to DeliveryShipmentService::STATUSES.
     */
    public function normalizeStatus(string $providerStatus): string
    {
        $clean = mb_strtolower(trim($providerStatus));

        // Mapping table
        return match (true) {
            str_contains($clean, 'livré') || str_contains($clean, 'livree') || str_contains($clean, 'delivered') => 'delivered',
            str_contains($clean, 'ramassé') || str_contains($clean, 'ramasse') || str_contains($clean, 'enlevé') || str_contains($clean, 'picked') => 'picked_up',
            str_contains($clean, 'distribution') || str_contains($clean, 'en cours de distribution') || str_contains($clean, 'out_for_delivery') => 'out_for_delivery',
            str_contains($clean, 'transit') || str_contains($clean, 'expédition') || str_contains($clean, 'expedie') || str_contains($clean, 'en cours de livraison') || str_contains($clean, 'en cours') => 'in_transit',
            str_contains($clean, 'prêt') || str_contains($clean, 'pret') || str_contains($clean, 'label') || str_contains($clean, 'reçu') => 'label_created',
            str_contains($clean, 'nouveau') || str_contains($clean, 'attente') || str_contains($clean, 'pending') || str_contains($clean, 'créé') || str_contains($clean, 'cree') => 'pending',
            str_contains($clean, 'retour') || str_contains($clean, 'refus') || str_contains($clean, 'returned') || str_contains($clean, 'refuse') => 'returned',
            str_contains($clean, 'annul') || str_contains($clean, 'cancelled') => 'cancelled',
            str_contains($clean, 'injoignable') || str_contains($clean, 'report') || str_contains($clean, 'échec') || str_contains($clean, 'echec') || str_contains($clean, 'failed') => 'failed',
            in_array($clean, DeliveryShipmentService::STATUSES, true) => $clean,
            default => 'unknown',
        };
    }
}
