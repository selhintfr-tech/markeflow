<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('content_posts', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->foreignUuid('workspace_id')->constrained('workspaces')->cascadeOnDelete();
            $table->foreignId('created_by')->constrained('users')->restrictOnDelete();
            $table->foreignId('assigned_to')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignUuid('campaign_id')->nullable()->constrained('campaigns')->nullOnDelete();
            $table->foreignId('approved_by')->nullable()->constrained('users')->nullOnDelete();
            $table->string('title', 255);
            $table->string('platform', 40);
            $table->string('status', 30)->default('Draft');
            $table->text('caption')->nullable();
            $table->timestampTz('scheduled_at')->nullable();
            $table->string('timezone', 64)->default('UTC');
            $table->timestampTz('approved_at')->nullable();
            $table->timestamps();
            $table->index(['workspace_id', 'scheduled_at'], 'content_posts_workspace_schedule_index');
            $table->index(['workspace_id', 'platform', 'status'], 'content_posts_workspace_platform_status_index');
            $table->index(['workspace_id', 'campaign_id'], 'content_posts_workspace_campaign_index');
            $table->index(['workspace_id', 'assigned_to'], 'content_posts_workspace_assignee_index');
        });

        Schema::create('content_post_attachments', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->foreignUuid('workspace_id')->constrained('workspaces')->cascadeOnDelete();
            $table->foreignUuid('content_post_id')->constrained('content_posts')->cascadeOnDelete();
            $table->foreignId('uploaded_by')->constrained('users')->restrictOnDelete();
            $table->string('original_name', 255);
            $table->string('storage_path', 1024)->unique();
            $table->string('mime_type', 127);
            $table->unsignedBigInteger('size');
            $table->timestamps();
            $table->index(['workspace_id', 'content_post_id'], 'content_post_attachments_workspace_post_index');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('content_post_attachments');
        Schema::dropIfExists('content_posts');
    }
};
