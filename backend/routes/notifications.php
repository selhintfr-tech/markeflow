<?php

use App\Http\Controllers\Api\WorkspaceNotificationController;
use Illuminate\Support\Facades\Route;

Route::middleware(['web', 'auth', 'tenant', 'tenant.required'])
    ->prefix('notifications')
    ->name('notifications.')
    ->group(function (): void {
        Route::get('/', [WorkspaceNotificationController::class, 'index'])->name('index');
        Route::get('/unread-count', [WorkspaceNotificationController::class, 'unreadCount'])->name('unread-count');
        Route::post('/read-all', [WorkspaceNotificationController::class, 'markAllAsRead'])->name('read-all');
        Route::patch('/{notification}/read', [WorkspaceNotificationController::class, 'markAsRead'])->name('read');
    });
