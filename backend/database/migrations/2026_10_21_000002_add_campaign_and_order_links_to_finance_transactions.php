<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('finance_transactions', function (Blueprint $table): void {
            $table->foreignUuid('campaign_id')->nullable()->after('workspace_id')->constrained('campaigns')->nullOnDelete();
            $table->foreignUuid('order_id')->nullable()->after('campaign_id')->constrained('sales_orders')->nullOnDelete();
            $table->index(['workspace_id', 'campaign_id', 'occurred_on'], 'finance_transactions_campaign_date_index');
            $table->index(['workspace_id', 'order_id', 'occurred_on'], 'finance_transactions_order_date_index');
        });
    }

    public function down(): void
    {
        Schema::table('finance_transactions', function (Blueprint $table): void {
            $table->dropIndex('finance_transactions_campaign_date_index');
            $table->dropIndex('finance_transactions_order_date_index');
            $table->dropConstrainedForeignId('campaign_id');
            $table->dropConstrainedForeignId('order_id');
        });
    }
};
