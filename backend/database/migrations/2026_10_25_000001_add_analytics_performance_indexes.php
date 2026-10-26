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
        Schema::table('campaigns', function (Blueprint $table): void {
            $table->index(['workspace_id', 'start_date', 'end_date'], 'campaigns_workspace_dates_idx');
        });

        Schema::table('crm_customers', function (Blueprint $table): void {
            $table->index(['workspace_id', 'created_at'], 'crm_customers_workspace_created_at_idx');
        });

        Schema::table('finance_budgets', function (Blueprint $table): void {
            $table->index(['workspace_id', 'starts_on', 'ends_on'], 'finance_budgets_workspace_dates_idx');
        });

        Schema::table('tasks', function (Blueprint $table): void {
            $table->index(['workspace_id', 'due_date', 'status'], 'tasks_workspace_due_status_idx');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('tasks', function (Blueprint $table): void {
            $table->dropIndex('tasks_workspace_due_status_idx');
        });

        Schema::table('finance_budgets', function (Blueprint $table): void {
            $table->dropIndex('finance_budgets_workspace_dates_idx');
        });

        Schema::table('crm_customers', function (Blueprint $table): void {
            $table->dropIndex('crm_customers_workspace_created_at_idx');
        });

        Schema::table('campaigns', function (Blueprint $table): void {
            $table->dropIndex('campaigns_workspace_dates_idx');
        });
    }
};
