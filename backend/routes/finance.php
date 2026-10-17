<?php

use App\Http\Controllers\Api\FinanceController;
use Illuminate\Support\Facades\Route;

Route::middleware(['web', 'auth', 'tenant', 'tenant.required'])
    ->prefix('finance')
    ->group(function (): void {
        Route::get('/budgets', [FinanceController::class, 'budgets']);
        Route::post('/budgets', [FinanceController::class, 'storeBudget']);
        Route::get('/budgets/{budget}', [FinanceController::class, 'showBudget']);
        Route::put('/budgets/{budget}', [FinanceController::class, 'updateBudget']);
        Route::patch('/budgets/{budget}', [FinanceController::class, 'updateBudget']);
        Route::delete('/budgets/{budget}', [FinanceController::class, 'destroyBudget']);

        Route::get('/transactions', [FinanceController::class, 'transactions']);
        Route::post('/transactions', [FinanceController::class, 'storeTransaction']);
        Route::get('/transactions/{transaction}', [FinanceController::class, 'showTransaction']);
        Route::put('/transactions/{transaction}', [FinanceController::class, 'updateTransaction']);
        Route::patch('/transactions/{transaction}', [FinanceController::class, 'updateTransaction']);
        Route::delete('/transactions/{transaction}', [FinanceController::class, 'destroyTransaction']);

        Route::get('/categories', [FinanceController::class, 'categories']);
        Route::get('/summary', [FinanceController::class, 'summary']);
    });
