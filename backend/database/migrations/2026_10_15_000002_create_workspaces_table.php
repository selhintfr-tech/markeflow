<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * Core multi-tenant workspace table.
     */
    public function up(): void
    {
        Schema::create('workspaces', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('name');
            $table->string('slug')->unique();
            $table->string('business_type', 50)->default('general_business');
            $table->string('industry', 100)->nullable();
            $table->string('location', 100)->nullable();
            $table->string('currency', 10)->default('MAD');
            $table->string('timezone', 50)->default('Africa/Casablanca');
            $table->string('date_format', 20)->default('DD/MM/YYYY');
            $table->json('enabled_modules')->nullable();
            $table->string('status', 30)->default('Active');
            $table->uuid('parent_workspace_id')->nullable();
            $table->timestamps();

            $table->index('business_type');
            $table->index('status');
        });

        Schema::table('workspaces', function (Blueprint $table) {
            $table->foreign('parent_workspace_id')
                ->references('id')
                ->on('workspaces')
                ->onDelete('set null');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('workspaces');
    }
};
