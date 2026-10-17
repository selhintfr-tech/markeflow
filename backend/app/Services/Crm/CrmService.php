<?php

namespace App\Services\Crm;

use App\Models\Crm\CrmActivity;
use App\Models\Crm\CrmContact;
use App\Models\Crm\CrmCustomer;
use App\Models\Crm\CrmLead;
use App\Models\Crm\CrmPipeline;
use App\Models\Crm\CrmPipelineStage;
use App\Models\User;
use App\Models\Workspace;
use App\Services\TenantContext;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class CrmService
{
    public function __construct(
        protected TenantContext $tenantContext
    ) {}

    /**
     * Ensure the active workspace has a default sales pipeline with funnel stages.
     */
    public function ensureDefaultPipeline(Workspace $workspace): CrmPipeline
    {
        $existing = CrmPipeline::query()
            ->where('workspace_id', $workspace->id)
            ->where('is_default', true)
            ->first();

        if ($existing) {
            return $existing;
        }

        return DB::transaction(function () use ($workspace): CrmPipeline {
            $pipeline = new CrmPipeline([
                'name' => 'Default Sales Pipeline',
                'slug' => 'default-sales-pipeline',
                'description' => 'Standard CRM lead & conversion funnel.',
                'is_default' => true,
                'display_order' => 1,
            ]);
            $pipeline->workspace_id = $workspace->id;
            $pipeline->save();

            $stages = [
                [
                    'name' => 'New',
                    'code' => 'New',
                    'color' => '#3B82F6',
                    'probability' => 10,
                    'display_order' => 1,
                    'is_won' => false,
                    'is_lost' => false,
                ],
                [
                    'name' => 'Contacted',
                    'code' => 'Contacted',
                    'color' => '#EAB308',
                    'probability' => 30,
                    'display_order' => 2,
                    'is_won' => false,
                    'is_lost' => false,
                ],
                [
                    'name' => 'Qualified',
                    'code' => 'Qualified',
                    'color' => '#8B5CF6',
                    'probability' => 60,
                    'display_order' => 3,
                    'is_won' => false,
                    'is_lost' => false,
                ],
                [
                    'name' => 'Converted',
                    'code' => 'Converted',
                    'color' => '#10B981',
                    'probability' => 100,
                    'display_order' => 4,
                    'is_won' => true,
                    'is_lost' => false,
                ],
                [
                    'name' => 'Lost',
                    'code' => 'Lost',
                    'color' => '#EF4444',
                    'probability' => 0,
                    'display_order' => 5,
                    'is_won' => false,
                    'is_lost' => true,
                ],
            ];

            foreach ($stages as $stageData) {
                $stage = new CrmPipelineStage($stageData);
                $stage->workspace_id = $workspace->id;
                $stage->pipeline_id = $pipeline->id;
                $stage->save();
            }

            return $pipeline->load('stages');
        });
    }

    /**
     * Convert an active lead into a paying customer and link associated records.
     */
    public function convertLeadToCustomer(CrmLead $lead, array $data, ?User $actor = null): CrmCustomer
    {
        return DB::transaction(function () use ($lead, $data, $actor): CrmCustomer {
            $workspaceId = $lead->workspace_id;

            // 1. Resolve or create contact record
            $contact = null;
            if ($lead->contact_id) {
                $contact = CrmContact::query()->where('workspace_id', $workspaceId)->find($lead->contact_id);
            }

            if (! $contact) {
                // Break full name into first and last name
                $parts = explode(' ', trim($lead->name), 2);
                $firstName = $parts[0] ?: 'Lead';
                $lastName = $parts[1] ?? null;

                $contact = new CrmContact([
                    'first_name' => $firstName,
                    'last_name' => $lastName,
                    'company_name' => $lead->company,
                    'email' => $lead->email,
                    'phone' => $lead->phone,
                    'preferred_contact' => $lead->preferred_contact,
                    'location' => $lead->location,
                    'lifecycle_stage' => CrmContact::LIFECYCLE_CUSTOMER,
                    'status' => CrmContact::STATUS_ACTIVE,
                    'owner_id' => $data['owner_id'] ?? $lead->owner_id ?? $actor?->id,
                ]);
                $contact->workspace_id = $workspaceId;
                $contact->save();

                $lead->contact_id = $contact->id;
            } else {
                $contact->lifecycle_stage = CrmContact::LIFECYCLE_CUSTOMER;
                $contact->save();
            }

            // 2. Create customer record
            $customer = new CrmCustomer([
                'contact_id' => $contact->id,
                'lead_id' => $lead->id,
                'company_name' => $data['company_name'] ?? $lead->company ?? $lead->name,
                'contact_name' => $data['contact_name'] ?? $lead->name,
                'email' => $data['email'] ?? $lead->email,
                'phone' => $data['phone'] ?? $lead->phone,
                'status' => $data['status'] ?? CrmCustomer::STATUS_ACTIVE,
                'customer_tier' => $data['customer_tier'] ?? CrmCustomer::TIER_STANDARD,
                'total_revenue' => $data['total_revenue'] ?? $lead->estimated_value ?? 0.00,
                'currency' => $data['currency'] ?? $lead->currency ?? 'USD',
                'owner_id' => $data['owner_id'] ?? $lead->owner_id ?? $actor?->id,
                'converted_at' => now(),
                'notes' => $data['notes'] ?? $lead->internal_notes,
            ]);
            $customer->workspace_id = $workspaceId;
            $customer->save();

            // 3. Update lead state
            $lead->status = CrmLead::STATUS_CONVERTED;
            $lead->converted_at = now();
            $lead->converted_to_customer_id = $customer->id;

            // Find converted stage if in pipeline
            if ($lead->pipeline_id) {
                $convertedStage = CrmPipelineStage::query()
                    ->where('workspace_id', $workspaceId)
                    ->where('pipeline_id', $lead->pipeline_id)
                    ->where(function ($q) {
                        $q->where('code', 'Converted')
                            ->orWhere('is_won', true);
                    })
                    ->first();

                if ($convertedStage) {
                    $lead->stage_id = $convertedStage->id;
                }
            }

            $lead->save();

            // 4. Record audit activity
            $activity = new CrmActivity([
                'lead_id' => $lead->id,
                'contact_id' => $contact->id,
                'customer_id' => $customer->id,
                'user_id' => $actor?->id,
                'type' => CrmActivity::TYPE_CONVERSION,
                'title' => 'Lead converted to Customer',
                'description' => 'Successfully converted lead ['.$lead->name.'] into customer ['.$customer->company_name.'].',
                'activity_date' => now(),
                'metadata' => [
                    'customer_id' => $customer->id,
                    'company_name' => $customer->company_name,
                    'total_revenue' => (float) $customer->total_revenue,
                ],
            ]);
            $activity->workspace_id = $workspaceId;
            $activity->save();

            return $customer;
        });
    }

    /**
     * Compute funnel counts per stage for the active workspace.
     */
    public function getFunnelStats(Workspace $workspace): array
    {
        $stages = [
            CrmLead::STATUS_NEW => ['label' => 'New Leads', 'color' => 'blue', 'dotColor' => 'bg-blue-500'],
            CrmLead::STATUS_CONTACTED => ['label' => 'Contacted', 'color' => 'amber', 'dotColor' => 'bg-amber-500'],
            CrmLead::STATUS_QUALIFIED => ['label' => 'Qualified', 'color' => 'purple', 'dotColor' => 'bg-purple-500'],
            CrmLead::STATUS_CONVERTED => ['label' => 'Converted', 'color' => 'emerald', 'dotColor' => 'bg-emerald-500'],
        ];

        $counts = CrmLead::query()
            ->where('workspace_id', $workspace->id)
            ->select('status', DB::raw('count(*) as count'))
            ->groupBy('status')
            ->pluck('count', 'status')
            ->toArray();

        $result = [];
        foreach ($stages as $status => $meta) {
            $result[] = [
                'status' => $status,
                'label' => $meta['label'],
                'count' => (int) ($counts[$status] ?? 0),
                'color' => $meta['color'],
                'dotColor' => $meta['dotColor'],
            ];
        }

        return $result;
    }
}