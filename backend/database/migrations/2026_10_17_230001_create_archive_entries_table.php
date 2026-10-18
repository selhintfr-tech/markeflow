<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('archive_entries', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->foreignUuid('workspace_id')->constrained()->cascadeOnDelete();
            $table->string('record_type', 30);
            $table->uuid('record_id');
            $table->string('name');
            $table->string('subtitle')->nullable();
            $table->string('previous_status', 30);
            $table->text('description')->nullable();
            $table->foreignId('archived_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('archived_at');
            $table->timestamp('restored_at')->nullable();
            $table->timestamps();
            $table->index(['workspace_id', 'record_type', 'record_id', 'restored_at']);
            $table->index(['workspace_id', 'archived_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('archive_entries');
    }
};