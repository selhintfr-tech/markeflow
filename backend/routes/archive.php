<?php

use App\Http\Controllers\Api\ArchiveController;
use Illuminate\Support\Facades\Route;

Route::middleware(['web', 'auth', 'tenant', 'tenant.required'])
    ->prefix('archive')
    ->name('archive.')
    ->group(function (): void {
        Route::get('/', [ArchiveController::class, 'index'])->name('index');
        Route::post('/{type}/{record}', [ArchiveController::class, 'archive'])->name('archive');
        Route::post('/{type}/{record}/restore', [ArchiveController::class, 'restore'])->name('restore');
    });