<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('audiences', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->foreignUuid('workspace_id')->constrained('workspaces')->cascadeOnDelete();
            $table->foreignId('created_by')->constrained('users')->restrictOnDelete();
            $table->string('name', 255);
            $table->text('description')->nullable();
            $table->json('demographics')->nullable();
            $table->json('locations')->nullable();
            $table->json('interests')->nullable();
            $table->json('characteristics')->nullable();
            $table->json('segmentation_criteria')->nullable();
            $table->unsignedBigInteger('estimated_size')->nullable();
            $table->string('status', 30)->default('Draft');
            $table->text('notes')->nullable();
            $table->timestamps();
            $table->index(['workspace_id', 'status']);
            $table->index(['workspace_id', 'name']);
        });

        Schema::create('audience_campaign', function (Blueprint $table): void {
            $table->foreignUuid('workspace_id')->constrained('workspaces')->cascadeOnDelete();
            $table->foreignUuid('audience_id')->constrained('audiences')->cascadeOnDelete();
            $table->foreignUuid('campaign_id')->constrained('campaigns')->cascadeOnDelete();
            $table->primary(['audience_id', 'campaign_id']);
            $table->index(['workspace_id', 'campaign_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('audience_campaign');
        Schema::dropIfExists('audiences');
    }
};
