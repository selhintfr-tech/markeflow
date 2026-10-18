<?php

namespace App\Services\Delivery;

use Illuminate\Http\Request;

interface DeliveryProviderAdapter
{
    public function key(): string;

    public function supportsConnectionTest(): bool;

    /** @param array<string, string> $credentials */
    public function testConnection(array $credentials): void;

    /**
     * @param array<string, string> $credentials
     * `idempotency_key` is always supplied; adapters must forward it using the
     * carrier's documented idempotency mechanism when one is available.
     * @param array<string, mixed> $shipment
     * @return array{tracking_number?: string, status?: string, raw_status?: string, delivery_fee?: numeric-string|int|float, cod_amount?: numeric-string|int|float}
     */
    public function createShipment(array $credentials, array $shipment): array;

    /**
     * @param array<string, string> $credentials
     * @return array{status: string, raw_status?: string, occurred_at?: string, cod_collected?: bool}
     */
    public function trackShipment(array $credentials, string $trackingNumber): array;

    /** @param array<string, string> $credentials */
    public function verifyWebhook(Request $request, array $credentials): bool;

    /**
     * @param array<string, string> $credentials
     * @return list<array{event_id: string, tracking_number: string, status: string, raw_status?: string, occurred_at?: string, cod_collected?: bool}>
     */
    public function parseWebhook(Request $request, array $credentials): array;

    public function normalizeStatus(string $providerStatus): string;
}
