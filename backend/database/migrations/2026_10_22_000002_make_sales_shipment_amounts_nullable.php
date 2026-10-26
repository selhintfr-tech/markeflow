<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('sales_shipments', function (Blueprint $table): void {
            $table->decimal('shipping_cost', 12, 2)->nullable()->default(null)->change();
            $table->decimal('cod_amount', 12, 2)->nullable()->default(null)->change();
        });
    }

    public function down(): void
    {
        if (DB::table('sales_shipments')->whereNull('shipping_cost')->orWhereNull('cod_amount')->exists()) {
            throw new RuntimeException('Cannot make nullable shipment amounts required without replacing unknown values.');
        }

        Schema::table('sales_shipments', function (Blueprint $table): void {
            $table->decimal('shipping_cost', 12, 2)->default(0)->nullable(false)->change();
            $table->decimal('cod_amount', 12, 2)->default(0)->nullable(false)->change();
        });
    }
};
