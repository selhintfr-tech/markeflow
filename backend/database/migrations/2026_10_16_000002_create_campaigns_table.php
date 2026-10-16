<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('campaigns', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('workspace_id')->constrained('workspaces')->cascadeOnDelete();
            $table->foreignUuid('project_id')->constrained('projects')->restrictOnDelete();
            $table->foreignId('created_by')->constrained('users')->restrictOnDelete();
            $table->string('name');
            $table->text('description')->nullable();
            $table->string('status', 30)->default('Draft');
            $table->string('platform', 50);
            $table->string('channel', 100);
            $table->string('objective', 255)->nullable();
            $table->date('start_date');
            $table->date('end_date');
            $table->decimal('budget', 12, 2)->default(0);
            $table->decimal('spend', 12, 2)->default(0);
            $table->unsignedInteger('leads')->default(0);
            $table->unsignedInteger('customers')->default(0);
            $table->decimal('revenue', 12, 2)->default(0);
            $table->timestamps();

            $table->index(['workspace_id', 'status']);
            $table->index(['workspace_id', 'platform']);
            $table->index(['workspace_id', 'project_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('campaigns');
    }
};
