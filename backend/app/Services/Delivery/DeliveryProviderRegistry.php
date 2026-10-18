<?php

namespace App\Services\Delivery;

class DeliveryProviderRegistry
{
    /** @return array<string, DeliveryProviderAdapter> */
    public function all(): array
    {
        $adapters = [];
        foreach (app()->tagged('delivery.providers') as $adapter) {
            if (! $adapter instanceof DeliveryProviderAdapter) {
                throw new \LogicException('Every delivery.providers binding must implement DeliveryProviderAdapter.');
            }
            $adapters[$adapter->key()] = $adapter;
        }

        return $adapters;
    }

    public function find(string $key): ?DeliveryProviderAdapter
    {
        return $this->all()[$key] ?? null;
    }
}
