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
        Route::patch('/customers/{customer}', 'updateCustomer')->name('customers.update');
        Route::delete('/customers/{customer}', 'destroyCustomer')->name('customers.destroy');
        Route::get('/orders', 'orders')->name('orders.index');
        Route::post('/orders', 'storeOrder')->name('orders.store');
        Route::patch('/orders/{order}/status', 'updateStatus')->name('orders.status');
        Route::patch('/orders/{order}/payment-status', 'updatePaymentStatus')->name('orders.payment-status');
        Route::delete('/orders/{order}', 'destroyOrder')->name('orders.destroy');
        Route::patch('/shipments/{shipment}', 'updateShipment')->name('shipments.update');

        Route::get('/orders/{order}/ozon-preview', [\App\Http\Controllers\Api\Sales\OzonIntegrationController::class, 'preview'])->name('orders.ozon-preview');
        Route::post('/orders/{order}/send-to-ozon', [\App\Http\Controllers\Api\Sales\OzonIntegrationController::class, 'sendToOzon'])->name('orders.send-to-ozon');
        Route::post('/orders/sync-ozon-tracking', [\App\Http\Controllers\Api\Sales\OzonIntegrationController::class, 'syncTracking'])->name('orders.sync-ozon-tracking');
        Route::get('/ozon/pdf-status', [\App\Http\Controllers\Api\Sales\OzonIntegrationController::class, 'pdfStatus'])->name('ozon.pdf-status');
        Route::get('/ozon/connection-status', [\App\Http\Controllers\Api\Sales\OzonIntegrationController::class, 'connectionStatus'])->name('ozon.connection-status');
        Route::get('/ozon/sync-status', [\App\Http\Controllers\Api\Sales\OzonIntegrationController::class, 'syncStatus'])->name('ozon.sync-status');
        Route::get('/ozon/review-queue', [\App\Http\Controllers\Api\Sales\OzonIntegrationController::class, 'reviewQueue'])->name('ozon.review-queue');
        Route::post('/ozon/review-queue/{id}/link', [\App\Http\Controllers\Api\Sales\OzonIntegrationController::class, 'linkReviewQueue'])->name('ozon.review-queue.link');
        Route::post('/ozon/review-queue/{id}/create-order', [\App\Http\Controllers\Api\Sales\OzonIntegrationController::class, 'createOrderFromReviewQueue'])->name('ozon.review-queue.create-order');
        Route::post('/ozon/import-preview', [\App\Http\Controllers\Api\Sales\OzonIntegrationController::class, 'importPreview'])->name('ozon.import-preview');
        Route::post('/ozon/import-execute', [\App\Http\Controllers\Api\Sales\OzonIntegrationController::class, 'importExecute'])->name('ozon.import-execute');
    });
