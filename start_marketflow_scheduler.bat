@echo off
title MarketFlow Background Scheduler
echo ========================================================
echo  MarketFlow - Background Task Scheduler (Windows)
echo  Active Task: Ozon Express Tracking Sync (Hourly)
echo ========================================================
cd /d "%~dp0backend"
echo Starting Laravel schedule worker...
php artisan schedule:work
pause
