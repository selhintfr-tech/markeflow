<?php

use App\Http\Controllers\Api\CampaignController;
use App\Http\Controllers\Api\ProfileController;
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
    Route::get('/profile', [ProfileController::class, 'show']);
    Route::patch('/profile', [ProfileController::class, 'update']);
    Route::patch('/profile/password', [ProfileController::class, 'changePassword']);

    Route::apiResource('workspaces', WorkspaceController::class);

    Route::middleware(['tenant', 'tenant.required'])->group(function (): void {
        Route::apiResource('projects', ProjectController::class);
        Route::apiResource('campaigns', CampaignController::class);
        Route::apiResource('tasks', TaskController::class);
    });
});

require base_path('routes/finance.php');
require base_path('routes/calendar.php');
require base_path('routes/audiences.php');
require base_path('routes/strategies.php');
require base_path('routes/research.php');

Route::middleware(['web', 'auth', 'tenant', 'tenant.required'])->group(function (): void {
    require base_path('routes/crm.php');
});
require base_path('routes/analytics.php');
require base_path('routes/reports.php');
require base_path('routes/comparisons.php');
require base_path('routes/sales.php');
require base_path('routes/archive.php');
require base_path('routes/meta.php');
require base_path('routes/delivery.php');
