<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('sales_order_financial_records', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->foreignUuid('workspace_id')->constrained('workspaces')->cascadeOnDelete();
            $table->foreignUuid('order_id')->unique()->constrained('sales_orders')->cascadeOnDelete();
            $table->foreignUuid('campaign_id')->nullable()->constrained('campaigns')->nullOnDelete();
            $table->decimal('product_cost_total', 14, 2)->nullable();
            $table->decimal('customer_shipping_charge', 14, 2)->nullable();
            $table->decimal('sales_collected', 14, 2)->nullable();
            $table->decimal('shipping_collected', 14, 2)->nullable();
            $table->decimal('courier_cost', 14, 2)->nullable();
            $table->decimal('other_expenses', 14, 2)->nullable();
            $table->decimal('refund_return_cost', 14, 2)->nullable();
            $table->decimal('profit_share_percent', 5, 2)->nullable();
            $table->foreignId('updated_by')->constrained('users')->restrictOnDelete();
            $table->timestamps();
            $table->index(['workspace_id', 'campaign_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('sales_order_financial_records');
    }
};
