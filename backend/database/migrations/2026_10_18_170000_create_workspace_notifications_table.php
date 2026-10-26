<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('workspace_notifications', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignUuid('workspace_id')->constrained('workspaces')->cascadeOnDelete();
            $table->string('event_key', 191);
            $table->string('type', 32);
            $table->string('title', 160);
            $table->string('description', 500);
            $table->string('action_url', 255)->nullable();
            $table->timestamp('read_at')->nullable();
            $table->timestamps();
            $table->unique(['user_id', 'event_key']);
            $table->index(['workspace_id', 'user_id', 'read_at', 'created_at'], 'workspace_notifications_unread_idx');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('workspace_notifications');
    }
};
