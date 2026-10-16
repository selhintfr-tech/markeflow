<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * Immutable audit logs table for multi-tenant workspace tracking.
     */
    public function up(): void
    {
        Schema::create('workspace_audit_logs', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('workspace_id')->constrained('workspaces')->onDelete('cascade');
            $table->foreignId('user_id')->nullable()->constrained('users')->onDelete('set null');
            $table->string('action', 100);
            $table->string('entity_type', 100);
            $table->string('entity_id', 100);
            $table->json('payload')->nullable();
            $table->string('ip_address', 45)->nullable();
            $table->text('user_agent')->nullable();
            $table->timestamp('created_at')->useCurrent();

            $table->index(['workspace_id', 'created_at']);
            $table->index(['workspace_id', 'action']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('workspace_audit_logs');
    }
};
