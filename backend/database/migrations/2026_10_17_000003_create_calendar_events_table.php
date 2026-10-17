<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('calendar_events', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->foreignUuid('workspace_id')->constrained('workspaces')->cascadeOnDelete();
            $table->foreignId('created_by')->constrained('users')->restrictOnDelete();
            $table->foreignUuid('project_id')->nullable()->constrained('projects')->nullOnDelete();
            $table->foreignUuid('task_id')->nullable()->constrained('tasks')->nullOnDelete();
            $table->string('title', 255);
            $table->text('description')->nullable();
            $table->timestampTz('starts_at');
            $table->timestampTz('ends_at');
            $table->string('timezone', 64);
            $table->timestamps();
            $table->index(['workspace_id', 'starts_at', 'ends_at'], 'calendar_events_workspace_range_index');
            $table->index(['workspace_id', 'project_id'], 'calendar_events_workspace_project_index');
            $table->index(['workspace_id', 'task_id'], 'calendar_events_workspace_task_index');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('calendar_events');
    }
};
