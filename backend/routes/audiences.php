<?php

use App\Http\Controllers\Api\AudienceController;
use Illuminate\Support\Facades\Route;

Route::middleware(['web', 'auth', 'tenant', 'tenant.required'])
    ->prefix('audiences')
    ->group(function (): void {
        Route::get('/', [AudienceController::class, 'index']);
        Route::post('/', [AudienceController::class, 'store']);
        Route::get('/{audience}', [AudienceController::class, 'show']);
        Route::put('/{audience}', [AudienceController::class, 'update']);
        Route::patch('/{audience}', [AudienceController::class, 'update']);
        Route::delete('/{audience}', [AudienceController::class, 'destroy']);
    });
