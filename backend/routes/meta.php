<?php

use App\Http\Controllers\Api\MetaIntegrationController;
use Illuminate\Support\Facades\Route;

Route::middleware(['web', 'auth', 'tenant', 'tenant.required'])
    ->prefix('integrations/meta')
    ->name('integrations.meta.')
    ->group(function (): void {
        Route::get('/status', [MetaIntegrationController::class, 'status'])->name('status');
        Route::post('/connect', [MetaIntegrationController::class, 'connect'])->name('connect');
        Route::get('/accounts', [MetaIntegrationController::class, 'accounts'])->name('accounts');
        Route::get('/insights', [MetaIntegrationController::class, 'insights'])->name('insights');
        Route::delete('/connection', [MetaIntegrationController::class, 'disconnect'])->name('disconnect');
    });

Route::middleware(['web', 'auth'])
    ->get('/integrations/meta/callback', [MetaIntegrationController::class, 'callback'])
    ->name('integrations.meta.callback');