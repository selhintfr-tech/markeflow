<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('content_posts', function (Blueprint $table): void {
            $table->string('content_type', 30)->default('Post')->after('platform');
            $table->text('internal_notes')->nullable()->after('caption');
        });
    }

    public function down(): void
    {
        Schema::table('content_posts', function (Blueprint $table): void {
            $table->dropColumn(['content_type', 'internal_notes']);
        });
    }
};
