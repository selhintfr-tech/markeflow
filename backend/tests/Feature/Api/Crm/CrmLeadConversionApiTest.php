<?php

namespace Tests\Feature\Api\Crm;

use App\Models\Crm\CrmActivity;
use App\Models\Crm\CrmContact;
use App\Models\Crm\CrmCustomer;
use App\Models\Crm\CrmLead;
use App\Models\WorkspaceUser;
use App\Services\TenantContext;

class CrmLeadConversionApiTest extends CrmTestCase
{
    public function test_owner_can_convert_lead_to_customer_atomically(): void
    {
        $owner = $this->createUser('owner@example.test');
        $workspace = $this->createWorkspace($owner);

        $lead = app(TenantContext::class)->runInContext($workspace, function () {
            return CrmLead::create([
                'name' => 'Fatima Zahra',
                'company' => 'Zahra Design',
                'email' => 'fatima@zahradesign.ma',
                'phone' => '+212600112233',
                'status' => 'Qualified',
                'estimated_value' => 45000,
            ]);
        });

        $payload = [
            'company_name' => 'Zahra Design SARL',
            'customer_tier' => 'Premium',
            'total_revenue' => 50000,
            'notes' => 'Contract signed for annual marketing campaign.',
        ];

        $response = $this->actingAs($owner)
            ->withHeader('X-Workspace-Id', $workspace->id)
            ->postJson('/api/crm/leads/'.$lead->id.'/convert', $payload)
            ->assertCreated()
            ->assertJsonPath('data.company_name', 'Zahra Design SARL')
            ->assertJsonPath('data.contact_name', 'Fatima Zahra')
            ->assertJsonPath('data.customer_tier', 'Premium')
            ->assertJsonPath('data.total_revenue', 50000)
            ->assertJsonPath('data.status', 'Active');

        $customerId = $response->json('data.id');
        $this->assertNotEmpty($customerId);

        // Verify Lead state is updated
        $lead->refresh();
        $this->assertEquals(CrmLead::STATUS_CONVERTED, $lead->status);
        $this->assertNotNull($lead->converted_at);
        $this->assertEquals($customerId, $lead->converted_to_customer_id);

        // Verify Contact was created or upgraded
        $this->assertNotNull($lead->contact_id);
        $this->assertDatabaseHas('crm_contacts', [
            'id' => $lead->contact_id,
            'lifecycle_stage' => CrmContact::LIFECYCLE_CUSTOMER,
        ]);

        // Verify conversion activity was logged
        $this->assertDatabaseHas('crm_activities', [
            'workspace_id' => $workspace->id,
            'lead_id' => $lead->id,
            'customer_id' => $customerId,
            'type' => CrmActivity::TYPE_CONVERSION,
        ]);
    }

    public function test_re_converting_already_converted_lead_is_rejected(): void
    {
        $owner = $this->createUser('owner@example.test');
        $workspace = $this->createWorkspace($owner);

        $lead = app(TenantContext::class)->runInContext($workspace, function () {
            return CrmLead::create([
                'name' => 'Already Converted',
                'status' => 'Converted',
                'converted_at' => now(),
                'converted_to_customer_id' => '01a10000-0000-0000-0000-000000000000',
            ]);
        });

        $this->actingAs($owner)
            ->withHeader('X-Workspace-Id', $workspace->id)
            ->postJson('/api/crm/leads/'.$lead->id.'/convert', [
                'company_name' => 'Duplicate Attempt',
            ])
            ->assertStatus(422)
            ->assertJsonPath('message', 'This lead has already been converted to a customer.');
    }

    public function test_viewer_cannot_convert_lead(): void
    {
        $owner = $this->createUser('owner@example.test');
        $workspace = $this->createWorkspace($owner);
        $viewer = $this->createUser('viewer@example.test');
        $this->addMemberToWorkspace($workspace, $viewer, WorkspaceUser::ROLE_VIEWER);

        $lead = app(TenantContext::class)->runInContext($workspace, function () {
            return CrmLead::create(['name' => 'Target Lead', 'status' => 'Qualified']);
        });

        $this->actingAs($viewer)
            ->withHeader('X-Workspace-Id', $workspace->id)
            ->postJson('/api/crm/leads/'.$lead->id.'/convert', [
                'company_name' => 'Forbidden Conversion',
            ])
            ->assertForbidden();
    }

    public function test_cross_workspace_lead_conversion_is_rejected(): void
    {
        $owner1 = $this->createUser('owner1@example.test');
        $workspace1 = $this->createWorkspace($owner1);

        $owner2 = $this->createUser('owner2@example.test');
        $workspace2 = $this->createWorkspace($owner2);

        $leadW1 = app(TenantContext::class)->runInContext($workspace1, function () {
            return CrmLead::create(['name' => 'Tenant 1 Lead', 'status' => 'Qualified']);
        });

        $this->actingAs($owner2)
            ->withHeader('X-Workspace-Id', $workspace2->id)
            ->postJson('/api/crm/leads/'.$leadW1->id.'/convert', [
                'company_name' => 'Malicious Conversion',
            ])
            ->assertNotFound();
    }
}