<?php

use App\Http\Controllers\Api\MarketingStrategyController;
use Illuminate\Support\Facades\Route;

Route::middleware(['web', 'auth', 'tenant', 'tenant.required'])
    ->prefix('strategies')
    ->group(function (): void {
        Route::get('/', [MarketingStrategyController::class, 'index']);
        Route::post('/', [MarketingStrategyController::class, 'store']);
        Route::get('/{strategy}', [MarketingStrategyController::class, 'show']);
        Route::put('/{strategy}', [MarketingStrategyController::class, 'update']);
        Route::patch('/{strategy}', [MarketingStrategyController::class, 'update']);
        Route::delete('/{strategy}', [MarketingStrategyController::class, 'destroy']);
    });
