<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('delivery_provider_connections', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->foreignUuid('workspace_id')->constrained()->cascadeOnDelete();
            $table->string('provider_key', 80);
            $table->text('credentials');
            $table->string('status', 32)->default('unverified');
            $table->timestamp('last_tested_at')->nullable();
            $table->string('last_error')->nullable();
            $table->timestamps();
            $table->unique(['workspace_id', 'provider_key']);
        });

        Schema::create('delivery_shipments', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->foreignUuid('workspace_id')->constrained()->cascadeOnDelete();
            $table->foreignUuid('provider_connection_id')->nullable()
                ->constrained('delivery_provider_connections')->nullOnDelete();
            // Intentionally no FK: the Sales & Orders schema is owned by another module.
            $table->uuid('sales_order_id')->nullable()->index();
            $table->string('order_reference', 120)->nullable();
            $table->string('provider_key', 80);
            $table->string('tracking_number', 160)->nullable()->index();
            $table->text('provider_payload')->nullable();
            $table->string('status', 32)->default('pending');
            $table->string('raw_status', 120)->nullable();
            $table->decimal('delivery_fee', 12, 2)->default(0);
            $table->decimal('cod_amount', 12, 2)->default(0);
            $table->boolean('cod_collected')->default(false);
            $table->timestamp('status_updated_at')->nullable();
            $table->string('last_error')->nullable();
            $table->timestamps();
            $table->index(['workspace_id', 'status']);
        });

        Schema::create('delivery_shipment_status_history', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->foreignUuid('workspace_id')->constrained()->cascadeOnDelete();
            $table->foreignUuid('shipment_id')->constrained('delivery_shipments')->cascadeOnDelete();
            $table->string('status', 32);
            $table->string('raw_status', 120)->nullable();
            $table->timestamp('occurred_at');
            $table->string('source', 32);
            $table->timestamps();
            $table->index(['workspace_id', 'shipment_id', 'occurred_at']);
        });

        Schema::create('delivery_webhook_events', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->foreignUuid('workspace_id')->constrained()->cascadeOnDelete();
            $table->foreignUuid('provider_connection_id')
                ->constrained('delivery_provider_connections')->cascadeOnDelete();
            $table->string('provider_event_id', 190);
            $table->timestamp('processed_at');
            $table->timestamps();
            $table->unique(['provider_connection_id', 'provider_event_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('delivery_webhook_events');
        Schema::dropIfExists('delivery_shipment_status_history');
        Schema::dropIfExists('delivery_shipments');
        Schema::dropIfExists('delivery_provider_connections');
    }
};
