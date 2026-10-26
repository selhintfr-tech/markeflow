<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('meta_ad_connections', function (Blueprint $table): void {
            $table->string('preferred_account_id', 100)->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('meta_ad_connections', function (Blueprint $table): void {
            $table->dropColumn('preferred_account_id');
        });
    }
};
