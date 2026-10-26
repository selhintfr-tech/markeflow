# MarketFlow - Background Task Scheduler (PowerShell)
# Runs Laravel schedule:work for automatic hourly Ozon synchronization
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host " MarketFlow - Background Task Scheduler (Windows/PS)" -ForegroundColor Cyan
Write-Host " Active Task: Ozon Express Tracking Sync (Hourly)" -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan

$backendDir = Join-Path $PSScriptRoot "backend"
Set-Location $backendDir
Write-Host "Starting Laravel schedule worker in $backendDir..." -ForegroundColor Green
php artisan schedule:work
