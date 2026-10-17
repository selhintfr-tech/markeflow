<?php

use App\Http\Controllers\Api\AnalyticsController;
use Illuminate\Support\Facades\Route;

Route::middleware(['web', 'auth', 'tenant', 'tenant.required'])
    ->prefix('analytics')
    ->name('analytics.')
    ->group(function (): void {
        Route::get('/overview', [AnalyticsController::class, 'overview'])->name('overview');
        Route::get('/timeseries', [AnalyticsController::class, 'timeSeries'])->name('timeseries');
    });
