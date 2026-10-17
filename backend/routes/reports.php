<?php

use App\Http\Controllers\Api\ReportController;
use Illuminate\Support\Facades\Route;

Route::middleware(['web', 'auth', 'tenant', 'tenant.required'])
    ->prefix('reports')
    ->name('reports.')
    ->group(function (): void {
        Route::get('/', [ReportController::class, 'index'])->name('index');
        Route::post('/', [ReportController::class, 'store'])->name('store');
        Route::get('/{report}/export.csv', [ReportController::class, 'export'])->name('export');
        Route::post('/{report}/run', [ReportController::class, 'run'])->name('run');
        Route::get('/{report}', [ReportController::class, 'show'])->name('show');
        Route::match(['put', 'patch'], '/{report}', [ReportController::class, 'update'])->name('update');
        Route::delete('/{report}', [ReportController::class, 'destroy'])->name('destroy');
    });
