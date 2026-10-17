<?php

use App\Http\Controllers\Api\ComparisonController;
use Illuminate\Support\Facades\Route;

Route::middleware(['web', 'auth', 'tenant', 'tenant.required'])
    ->prefix('comparisons')
    ->name('comparisons.')
    ->group(function (): void {
        Route::get('/periods', [ComparisonController::class, 'periods'])->name('periods');
        Route::get('/campaigns', [ComparisonController::class, 'campaigns'])->name('campaigns');
    });
