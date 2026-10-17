<?php

use App\Http\Controllers\Api\CalendarEventController;
use Illuminate\Support\Facades\Route;

Route::middleware(['web', 'auth', 'tenant', 'tenant.required'])
    ->prefix('calendar/events')
    ->group(function (): void {
        Route::get('/', [CalendarEventController::class, 'index']);
        Route::post('/', [CalendarEventController::class, 'store']);
        Route::get('/{event}', [CalendarEventController::class, 'show']);
        Route::put('/{event}', [CalendarEventController::class, 'update']);
        Route::patch('/{event}', [CalendarEventController::class, 'update']);
        Route::delete('/{event}', [CalendarEventController::class, 'destroy']);
    });
