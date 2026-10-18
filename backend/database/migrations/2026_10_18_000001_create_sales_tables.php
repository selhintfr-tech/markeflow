<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('sales_customers', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->foreignUuid('workspace_id')->constrained('workspaces')->cascadeOnDelete();
            $table->string('first_name');
            $table->string('last_name')->nullable();
            $table->string('email')->nullable();
            $table->string('phone')->nullable();
            $table->text('address')->nullable();
            $table->timestamps();
            $table->index(['workspace_id', 'email']);
            $table->index(['workspace_id', 'created_at']);
        });

        Schema::create('sales_orders', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->foreignUuid('workspace_id')->constrained('workspaces')->cascadeOnDelete();
            $table->foreignUuid('customer_id')->constrained('sales_customers')->restrictOnDelete();
            $table->string('order_number');
            $table->string('status')->default('Pending');
            $table->string('payment_status')->default('Pending');
            $table->decimal('subtotal', 12, 2)->default(0);
            $table->decimal('total', 12, 2)->default(0);
            $table->string('currency', 3)->default('USD');
            $table->json('items')->nullable();
            $table->string('source')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();
            $table->unique(['workspace_id', 'order_number']);
            $table->index(['workspace_id', 'status', 'created_at']);
            $table->index(['workspace_id', 'payment_status']);
        });

        Schema::create('sales_shipments', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->foreignUuid('workspace_id')->constrained('workspaces')->cascadeOnDelete();
            $table->foreignUuid('order_id')->constrained('sales_orders')->cascadeOnDelete();
            $table->string('status')->default('Pending');
            $table->string('delivery_company_id')->nullable();
            $table->string('tracking_number')->nullable();
            $table->decimal('shipping_cost', 12, 2)->default(0);
            $table->decimal('cod_amount', 12, 2)->default(0);
            $table->string('payment_collection_status')->default('Pending');
            $table->timestamps();
            $table->index(['workspace_id', 'order_id']);
            $table->index(['delivery_company_id', 'tracking_number']);
        });

        Schema::create('sales_order_status_history', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->foreignUuid('workspace_id')->constrained('workspaces')->cascadeOnDelete();
            $table->foreignUuid('order_id')->constrained('sales_orders')->cascadeOnDelete();
            $table->string('from_status')->nullable();
            $table->string('to_status');
            $table->string('source')->default('manual');
            $table->foreignId('changed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->json('metadata')->nullable();
            $table->timestamp('created_at')->useCurrent();
            $table->index(['workspace_id', 'order_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('sales_order_status_history');
        Schema::dropIfExists('sales_shipments');
        Schema::dropIfExists('sales_orders');
        Schema::dropIfExists('sales_customers');
    }
};
