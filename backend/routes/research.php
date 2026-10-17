<?php

use App\Http\Controllers\Api\MarketResearchController;
use Illuminate\Support\Facades\Route;

Route::middleware(['web', 'auth', 'tenant', 'tenant.required'])
    ->prefix('research')
    ->group(function (): void {
        Route::get('/', [MarketResearchController::class, 'index']);
        Route::post('/', [MarketResearchController::class, 'store']);
        Route::get('/{research}', [MarketResearchController::class, 'show']);
        Route::put('/{research}', [MarketResearchController::class, 'update']);
        Route::patch('/{research}', [MarketResearchController::class, 'update']);
        Route::delete('/{research}', [MarketResearchController::class, 'destroy']);
    });
