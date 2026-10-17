<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('finance_transactions', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->foreignUuid('workspace_id')->constrained('workspaces')->cascadeOnDelete();
            $table->foreignId('created_by')->constrained('users')->restrictOnDelete();
            $table->string('type', 20);
            $table->string('category', 100);
            $table->string('description', 255)->nullable();
            $table->decimal('amount', 14, 2);
            $table->date('occurred_on');
            $table->timestamps();
            $table->index(['workspace_id', 'type', 'occurred_on'], 'finance_transactions_workspace_type_date_index');
            $table->index(['workspace_id', 'category', 'occurred_on'], 'finance_transactions_workspace_category_date_index');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('finance_transactions');
    }
};
