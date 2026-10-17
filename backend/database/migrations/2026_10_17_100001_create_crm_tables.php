<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // 1. CRM Contacts
        Schema::create('crm_contacts', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->foreignUuid('workspace_id')->constrained('workspaces')->cascadeOnDelete();
            $table->string('first_name');
            $table->string('last_name')->nullable();
            $table->string('company_name')->nullable();
            $table->string('email')->nullable();
            $table->string('phone')->nullable();
            $table->string('job_title')->nullable();
            $table->string('preferred_contact')->nullable();
            $table->string('location')->nullable();
            $table->string('lifecycle_stage')->default('lead');
            $table->string('status')->default('Active');
            $table->foreignId('owner_id')->nullable()->constrained('users')->nullOnDelete();
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->index(['workspace_id', 'email']);
            $table->index(['workspace_id', 'status']);
            $table->index(['workspace_id', 'lifecycle_stage']);
            $table->index(['workspace_id', 'owner_id']);
        });

        // 2. CRM Pipelines
        Schema::create('crm_pipelines', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->foreignUuid('workspace_id')->constrained('workspaces')->cascadeOnDelete();
            $table->string('name');
            $table->string('slug');
            $table->text('description')->nullable();
            $table->boolean('is_default')->default(false);
            $table->integer('display_order')->default(0);
            $table->timestamps();

            $table->index(['workspace_id', 'is_default']);
            $table->index(['workspace_id', 'display_order']);
        });

        // 3. CRM Pipeline Stages
        Schema::create('crm_pipeline_stages', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->foreignUuid('workspace_id')->constrained('workspaces')->cascadeOnDelete();
            $table->foreignUuid('pipeline_id')->constrained('crm_pipelines')->cascadeOnDelete();
            $table->string('name');
            $table->string('code')->nullable();
            $table->string('color')->nullable();
            $table->integer('probability')->default(0);
            $table->integer('display_order')->default(0);
            $table->boolean('is_won')->default(false);
            $table->boolean('is_lost')->default(false);
            $table->timestamps();

            $table->index(['workspace_id', 'pipeline_id', 'display_order']);
        });

        // 4. CRM Leads
        Schema::create('crm_leads', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->foreignUuid('workspace_id')->constrained('workspaces')->cascadeOnDelete();
            $table->foreignUuid('contact_id')->nullable()->constrained('crm_contacts')->nullOnDelete();
            $table->foreignUuid('pipeline_id')->nullable()->constrained('crm_pipelines')->nullOnDelete();
            $table->foreignUuid('stage_id')->nullable()->constrained('crm_pipeline_stages')->nullOnDelete();
            $table->string('name');
            $table->string('company')->nullable();
            $table->string('email')->nullable();
            $table->string('phone')->nullable();
            $table->string('status')->default('New');
            $table->string('source')->nullable();
            $table->foreignUuid('source_campaign_id')->nullable()->constrained('campaigns')->nullOnDelete();
            $table->string('source_campaign_name')->nullable();
            $table->foreignUuid('related_project_id')->nullable()->constrained('projects')->nullOnDelete();
            $table->string('related_project_name')->nullable();
            $table->decimal('estimated_value', 12, 2)->nullable();
            $table->string('currency', 3)->default('USD');
            $table->foreignId('owner_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('preferred_contact')->nullable();
            $table->string('location')->nullable();
            $table->timestamp('next_follow_up_at')->nullable();
            $table->timestamp('converted_at')->nullable();
            $table->uuid('converted_to_customer_id')->nullable();
            $table->text('internal_notes')->nullable();
            $table->timestamps();

            $table->index(['workspace_id', 'status']);
            $table->index(['workspace_id', 'stage_id']);
            $table->index(['workspace_id', 'owner_id']);
            $table->index(['workspace_id', 'contact_id']);
        });

        // 5. CRM Customers
        Schema::create('crm_customers', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->foreignUuid('workspace_id')->constrained('workspaces')->cascadeOnDelete();
            $table->foreignUuid('contact_id')->nullable()->constrained('crm_contacts')->nullOnDelete();
            $table->foreignUuid('lead_id')->nullable()->constrained('crm_leads')->nullOnDelete();
            $table->string('company_name');
            $table->string('contact_name');
            $table->string('email')->nullable();
            $table->string('phone')->nullable();
            $table->string('status')->default('Active');
            $table->string('customer_tier')->default('Standard');
            $table->decimal('total_revenue', 12, 2)->default(0.00);
            $table->string('currency', 3)->default('USD');
            $table->foreignId('owner_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('converted_at')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->index(['workspace_id', 'status']);
            $table->index(['workspace_id', 'owner_id']);
            $table->index(['workspace_id', 'contact_id']);
        });

        // 6. CRM Activities
        Schema::create('crm_activities', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->foreignUuid('workspace_id')->constrained('workspaces')->cascadeOnDelete();
            $table->foreignUuid('lead_id')->nullable()->constrained('crm_leads')->cascadeOnDelete();
            $table->foreignUuid('contact_id')->nullable()->constrained('crm_contacts')->cascadeOnDelete();
            $table->foreignUuid('customer_id')->nullable()->constrained('crm_customers')->cascadeOnDelete();
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('type');
            $table->string('title');
            $table->text('description')->nullable();
            $table->timestamp('activity_date')->useCurrent();
            $table->json('metadata')->nullable();
            $table->timestamps();

            $table->index(['workspace_id', 'lead_id']);
            $table->index(['workspace_id', 'contact_id']);
            $table->index(['workspace_id', 'customer_id']);
            $table->index(['workspace_id', 'activity_date']);
        });

        // 7. CRM Notes
        Schema::create('crm_notes', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->foreignUuid('workspace_id')->constrained('workspaces')->cascadeOnDelete();
            $table->foreignUuid('lead_id')->nullable()->constrained('crm_leads')->cascadeOnDelete();
            $table->foreignUuid('contact_id')->nullable()->constrained('crm_contacts')->cascadeOnDelete();
            $table->foreignUuid('customer_id')->nullable()->constrained('crm_customers')->cascadeOnDelete();
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->text('content');
            $table->boolean('is_pinned')->default(false);
            $table->timestamps();

            $table->index(['workspace_id', 'lead_id']);
            $table->index(['workspace_id', 'contact_id']);
            $table->index(['workspace_id', 'customer_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('crm_notes');
        Schema::dropIfExists('crm_activities');
        Schema::dropIfExists('crm_customers');
        Schema::dropIfExists('crm_leads');
        Schema::dropIfExists('crm_pipeline_stages');
        Schema::dropIfExists('crm_pipelines');
        Schema::dropIfExists('crm_contacts');
    }
};