<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * Additive profile fields to the standard Laravel users table.
     */
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('phone', 50)->nullable()->after('email');
            $table->string('job_title', 100)->nullable()->after('phone');
            $table->string('avatar_url', 500)->nullable()->after('job_title');
            $table->string('timezone', 50)->nullable()->default('Africa/Casablanca')->after('avatar_url');
            $table->string('locale', 10)->nullable()->default('en')->after('timezone');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn([
                'phone',
                'job_title',
                'avatar_url',
                'timezone',
                'locale',
            ]);
        });
    }
};
