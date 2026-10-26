<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('sales_shipments', function (Blueprint $table): void {
            $table->decimal('customer_shipping_charge', 12, 2)->nullable()->after('shipping_cost');
        });
    }

    public function down(): void
    {
        Schema::table('sales_shipments', function (Blueprint $table): void {
            $table->dropColumn('customer_shipping_charge');
        });
    }
};
