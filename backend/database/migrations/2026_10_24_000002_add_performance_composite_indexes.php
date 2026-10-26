<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('sales_orders', function (Blueprint $table): void {
            $table->index(['workspace_id', 'created_at'], 'sales_orders_workspace_created_at_idx');
        });

        Schema::table('finance_transactions', function (Blueprint $table): void {
            $table->index(['workspace_id', 'occurred_on', 'type'], 'finance_transactions_workspace_occurred_type_idx');
        });

        Schema::table('saved_reports', function (Blueprint $table): void {
            $table->index(['workspace_id', 'updated_at'], 'saved_reports_workspace_updated_at_idx');
        });

        Schema::table('crm_leads', function (Blueprint $table): void {
            $table->index(['workspace_id', 'created_at'], 'crm_leads_workspace_created_at_idx');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('crm_leads', function (Blueprint $table): void {
            $table->dropIndex('crm_leads_workspace_created_at_idx');
        });

        Schema::table('saved_reports', function (Blueprint $table): void {
            $table->dropIndex('saved_reports_workspace_updated_at_idx');
        });

        Schema::table('finance_transactions', function (Blueprint $table): void {
            $table->dropIndex('finance_transactions_workspace_occurred_type_idx');
        });

        Schema::table('sales_orders', function (Blueprint $table): void {
            $table->dropIndex('sales_orders_workspace_created_at_idx');
        });
    }
};
