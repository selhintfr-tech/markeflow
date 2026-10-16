<?php

use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return view('welcome');
});

// CSRF cookie initialization endpoint for single-page application authentication
Route::get('/sanctum/csrf-cookie', function () {
    return response()->noContent();
});
