<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('market_research_projects', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->foreignUuid('workspace_id')->constrained('workspaces')->cascadeOnDelete();
            $table->foreignId('created_by')->constrained('users')->restrictOnDelete();
            $table->string('name', 255);
            $table->string('category', 100);
            $table->string('status', 30)->default('Planned');
            $table->text('description')->nullable();
            $table->date('starts_on')->nullable();
            $table->date('ends_on')->nullable();
            $table->json('competitor_profiles')->nullable();
            $table->json('opportunities')->nullable();
            $table->json('threats')->nullable();
            $table->json('findings')->nullable();
            $table->json('swot')->nullable();
            $table->json('sources')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();
            $table->index(['workspace_id', 'status']);
            $table->index(['workspace_id', 'category']);
            $table->index(['workspace_id', 'starts_on', 'ends_on']);
            $table->index(['workspace_id', 'name']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('market_research_projects');
    }
};
