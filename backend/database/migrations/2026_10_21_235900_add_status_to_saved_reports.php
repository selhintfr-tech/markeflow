<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('saved_reports', function (Blueprint $table): void {
            $table->string('status', 20)->nullable()->after('type');
        });
    }

    public function down(): void
    {
        Schema::table('saved_reports', function (Blueprint $table): void {
            $table->dropColumn('status');
        });
    }
};
