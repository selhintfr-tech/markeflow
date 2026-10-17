<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('marketing_strategies', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->foreignUuid('workspace_id')->constrained('workspaces')->cascadeOnDelete();
            $table->foreignId('created_by')->constrained('users')->restrictOnDelete();
            $table->foreignUuid('project_id')->nullable()->constrained('projects')->nullOnDelete();
            $table->foreignUuid('campaign_id')->nullable()->constrained('campaigns')->nullOnDelete();
            $table->string('name', 255);
            $table->text('description')->nullable();
            $table->json('objectives')->nullable();
            $table->json('success_metrics')->nullable();
            $table->json('channels')->nullable();
            $table->decimal('budget', 14, 2)->nullable();
            $table->date('starts_on')->nullable();
            $table->date('ends_on')->nullable();
            $table->string('status', 30)->default('Draft');
            $table->unsignedTinyInteger('progress')->default(0);
            $table->json('action_plan')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();
            $table->index(['workspace_id', 'status']);
            $table->index(['workspace_id', 'starts_on', 'ends_on']);
            $table->index(['workspace_id', 'project_id']);
            $table->index(['workspace_id', 'campaign_id']);
        });

        Schema::create('marketing_strategy_audience', function (Blueprint $table): void {
            $table->foreignUuid('workspace_id')->constrained('workspaces')->cascadeOnDelete();
            $table->foreignUuid('marketing_strategy_id')->constrained('marketing_strategies')->cascadeOnDelete();
            $table->foreignUuid('audience_id')->constrained('audiences')->cascadeOnDelete();
            $table->primary(['marketing_strategy_id', 'audience_id']);
            $table->index(['workspace_id', 'audience_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('marketing_strategy_audience');
        Schema::dropIfExists('marketing_strategies');
    }
};
