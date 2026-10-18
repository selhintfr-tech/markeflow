<?php

use App\Http\Controllers\Api\Delivery\DeliveryController;
use Illuminate\Support\Facades\Route;

Route::middleware(['web', 'auth', 'tenant', 'tenant.required'])
    ->prefix('delivery')
    ->name('delivery.')
    ->group(function (): void {
        Route::get('/connections', [DeliveryController::class, 'connections'])->name('connections.index');
        Route::post('/connections', [DeliveryController::class, 'saveConnection'])->name('connections.store');
        Route::post('/connections/{id}/test', [DeliveryController::class, 'testConnection'])->name('connections.test');
        Route::delete('/connections/{id}', [DeliveryController::class, 'disconnect'])->name('connections.destroy');

        Route::get('/shipments', [DeliveryController::class, 'shipments'])->name('shipments.index');
        Route::post('/shipments', [DeliveryController::class, 'createShipment'])->name('shipments.store');
        Route::post('/shipments/{id}/dispatch', [DeliveryController::class, 'dispatch'])->name('shipments.dispatch');
        Route::post('/shipments/{id}/refresh', [DeliveryController::class, 'refreshShipment'])->name('shipments.refresh');
    });

Route::post('/delivery/webhooks/{connectionId}', [DeliveryController::class, 'webhook'])
    ->middleware('throttle:60,1')
    ->name('delivery.webhooks.receive');
