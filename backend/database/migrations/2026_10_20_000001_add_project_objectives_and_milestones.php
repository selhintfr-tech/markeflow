<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('projects', function (Blueprint $table): void {
            $table->json('objectives')->nullable();
        });

        Schema::create('project_milestones', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->foreignUuid('workspace_id')->constrained('workspaces')->cascadeOnDelete();
            $table->foreignUuid('project_id')->constrained('projects')->cascadeOnDelete();
            $table->foreignId('created_by')->constrained('users')->restrictOnDelete();
            $table->string('title', 255);
            $table->text('description')->nullable();
            $table->date('due_date')->nullable();
            $table->string('status', 30)->default('planned');
            $table->timestampTz('completed_at')->nullable();
            $table->timestamps();
            $table->index(['workspace_id', 'project_id', 'due_date'], 'project_milestones_workspace_project_due_index');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('project_milestones');
        Schema::table('projects', function (Blueprint $table): void {
            $table->dropColumn('objectives');
        });
    }
};
