<?php

namespace App\Providers;

use App\Models\Workspace;
use App\Policies\WorkspacePolicy;
use App\Services\TenantContext;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        // Bind TenantContext as a scoped singleton that resets between requests, Octane workers, and job lifecycles
        $this->app->scoped(TenantContext::class, function () {
            return new TenantContext;
        });

        // Bind WorkspaceAuthorizationService as a scoped singleton with in-memory memoization
        $this->app->scoped(\App\Services\WorkspaceAuthorizationService::class, function () {
            return new \App\Services\WorkspaceAuthorizationService;
        });

        // Register Ozon Delivery Provider Adapter for Moroccan logistics
        $this->app->singleton(\App\Services\Delivery\Ozon\OzonApiClient::class);
        $this->app->singleton(\App\Services\Delivery\Ozon\OzonDeliveryAdapter::class);
        $this->app->tag(\App\Services\Delivery\Ozon\OzonDeliveryAdapter::class, 'delivery.providers');
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // Register Workspace authorization policy
        Gate::policy(Workspace::class, WorkspacePolicy::class);
    }
}
