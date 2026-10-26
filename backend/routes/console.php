<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

\Illuminate\Support\Facades\Schedule::command('ozon:sync-tracking')
    ->hourly()
    ->withoutOverlapping()
    ->appendOutputTo(storage_path('logs/ozon-sync.log'));

