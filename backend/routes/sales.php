<?php

use App\Http\Controllers\Api\Sales\SalesController;
use Illuminate\Support\Facades\Route;

Route::middleware(['web', 'auth', 'tenant', 'tenant.required'])
    ->prefix('sales')
    ->name('sales.')
    ->controller(SalesController::class)
    ->group(function (): void {
        Route::get('/customers', 'customers')->name('customers.index');
        Route::post('/customers', 'storeCustomer')->name('customers.store');
        Route::get('/orders', 'orders')->name('orders.index');
        Route::post('/orders', 'storeOrder')->name('orders.store');
        Route::patch('/orders/{order}/status', 'updateStatus')->name('orders.status');
        Route::patch('/orders/{order}/payment-status', 'updatePaymentStatus')->name('orders.payment-status');
        Route::patch('/shipments/{shipment}', 'updateShipment')->name('shipments.update');
    });
