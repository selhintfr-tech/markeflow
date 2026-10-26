<?php

use App\Http\Controllers\Api\ContentPostController;
use Illuminate\Support\Facades\Route;

Route::middleware(['web', 'auth', 'tenant', 'tenant.required'])
    ->prefix('content')
    ->name('content.')
    ->group(function (): void {
        Route::get('/members', [ContentPostController::class, 'members'])->name('members');
        Route::get('/posts', [ContentPostController::class, 'index'])->name('posts.index');
        Route::post('/posts', [ContentPostController::class, 'store'])->name('posts.store');
        Route::get('/posts/{post}', [ContentPostController::class, 'show'])->name('posts.show');
        Route::patch('/posts/{post}', [ContentPostController::class, 'update'])->name('posts.update');
        Route::delete('/posts/{post}', [ContentPostController::class, 'destroy'])->name('posts.destroy');
        Route::post('/posts/{post}/attachments', [ContentPostController::class, 'storeAttachment'])->name('posts.attachments.store');
        Route::get('/posts/{post}/attachments/{attachment}', [ContentPostController::class, 'downloadAttachment'])->name('posts.attachments.download');
        Route::delete('/posts/{post}/attachments/{attachment}', [ContentPostController::class, 'destroyAttachment'])->name('posts.attachments.destroy');
    });
