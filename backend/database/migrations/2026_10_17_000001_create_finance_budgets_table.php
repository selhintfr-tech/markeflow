<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('finance_budgets', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->foreignUuid('workspace_id')->constrained('workspaces')->cascadeOnDelete();
            $table->foreignId('created_by')->constrained('users')->restrictOnDelete();
            $table->string('name', 255);
            $table->string('category', 100);
            $table->decimal('amount', 14, 2);
            $table->date('starts_on');
            $table->date('ends_on');
            $table->text('notes')->nullable();
            $table->timestamps();
            $table->index(['workspace_id', 'category', 'starts_on', 'ends_on'], 'finance_budgets_workspace_category_dates_index');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('finance_budgets');
    }
};
