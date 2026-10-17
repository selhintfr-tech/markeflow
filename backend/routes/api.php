<?php

use App\Http\Controllers\Api\CampaignController;
use App\Http\Controllers\Api\ProjectController;
use App\Http\Controllers\Api\TaskController;
use App\Http\Controllers\Api\WorkspaceController;
use App\Http\Controllers\Auth\AuthController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
| State-managed cookie session routes for the MarketFlow SPA application.
*/

Route::middleware('web')->group(function () {
    Route::post('/register', [AuthController::class, 'register']);
    Route::post('/login', [AuthController::class, 'login']);
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/user', [AuthController::class, 'user']);
});

Route::middleware(['web', 'auth'])->group(function () {
    Route::apiResource('workspaces', WorkspaceController::class);

    Route::middleware(['tenant', 'tenant.required'])->group(function (): void {
        Route::apiResource('projects', ProjectController::class);
        Route::apiResource('campaigns', CampaignController::class);
        Route::apiResource('tasks', TaskController::class);
    });
});
