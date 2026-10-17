<?php

namespace Tests\Feature\Api\Crm;

use App\Models\Crm\CrmActivity;
use App\Models\Crm\CrmLead;
use App\Models\WorkspaceUser;
use App\Services\TenantContext;

class CrmLeadApiTest extends CrmTestCase
{
    public function test_owner_can_create_lead_with_default_pipeline_and_activity(): void
    {
        $owner = $this->createUser('leadowner@example.test');
        $workspace = $this->createWorkspace($owner);

        $payload = [
            'name' => 'Alice Johnson',
            'company' => 'Johnson Ltd',
            'email' => 'alice@johnson.test',
            'phone' => '+1555123456',
            'source' => 'Meta Ads',
            'source_campaign_name' => 'Autumn Launch 2026',
            'related_project_name' => 'Autumn Sales Growth',
            'estimated_value' => 12500.00,
            'preferred_contact' => 'Email',
            'location' => 'Casablanca, Morocco',
            'internal_notes' => 'High intent prospect from web campaign.',
        ];

        $response = $this->actingAs($owner)
            ->withHeader('X-Workspace-Id', $workspace->id)
            ->postJson('/api/crm/leads', $payload)
            ->assertCreated()
            ->assertJsonPath('data.name', 'Alice Johnson')
            ->assertJsonPath('data.company', 'Johnson Ltd')
            ->assertJsonPath('data.status', 'New')
            ->assertJsonPath('data.leadStatus', 'New')
            ->assertJsonPath('data.estimated_value', 12500)
            ->assertJsonPath('data.assignedTo.id', $owner->id);

        $leadId = $response->json('data.id');
        $this->assertNotEmpty($leadId);

        // Verify default pipeline and stage were assigned
        $this->assertNotEmpty($response->json('data.pipeline_id'));
        $this->assertNotEmpty($response->json('data.stage_id'));

        // Verify initial activity was created
        $this->assertDatabaseHas('crm_activities', [
            'workspace_id' => $workspace->id,
            'lead_id' => $leadId,
            'type' => CrmActivity::TYPE_CREATE,
        ]);
    }

    public function test_lead_prohibited_injection_is_rejected(): void
    {
        $owner = $this->createUser('owner@example.test');
        $workspace = $this->createWorkspace($owner);

        $this->actingAs($owner)
            ->withHeader('X-Workspace-Id', $workspace->id)
            ->postJson('/api/crm/leads', [
                'name' => 'Hacker Lead',
                'workspace_id' => '00000000-0000-0000-0000-000000000000',
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['workspace_id']);

        $this->actingAs($owner)
            ->withHeader('X-Workspace-Id', $workspace->id)
            ->postJson('/api/crm/leads', [
                'name' => 'Hacker Lead',
                'converted_at' => now()->toIso8601String(),
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['converted_at']);
    }

    public function test_lead_listing_with_search_filter_and_sorting(): void
    {
        $owner = $this->createUser('leadowner@example.test');
        $workspace = $this->createWorkspace($owner);

        app(TenantContext::class)->runInContext($workspace, function () {
            CrmLead::create([
                'name' => 'Nadia Cherkaoui',
                'company' => 'Atlas Logistics',
                'email' => 'nadia@atlas.ma',
                'status' => 'New',
                'source' => 'Meta Ads',
                'source_campaign_name' => 'Spring 2026',
                'estimated_value' => 5000,
            ]);

            CrmLead::create([
                'name' => 'Tariq Mansouri',
                'company' => 'Sahara Solar',
                'email' => 'tariq@sahara.ma',
                'status' => 'Qualified',
                'source' => 'Google Ads',
                'source_campaign_name' => 'Summer 2026',
                'estimated_value' => 25000,
            ]);
        });

        // Search by company
        $this->actingAs($owner)
            ->withHeader('X-Workspace-Id', $workspace->id)
            ->getJson('/api/crm/leads?search=Logistics')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.name', 'Nadia Cherkaoui');

        // Filter by status
        $this->actingAs($owner)
            ->withHeader('X-Workspace-Id', $workspace->id)
            ->getJson('/api/crm/leads?status=Qualified')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.name', 'Tariq Mansouri');

        // Sort by value desc
        $this->actingAs($owner)
            ->withHeader('X-Workspace-Id', $workspace->id)
            ->getJson('/api/crm/leads?sort_by=value')
            ->assertOk()
            ->assertJsonPath('data.0.name', 'Tariq Mansouri');
    }

    public function test_lead_update_and_status_change_activity(): void
    {
        $owner = $this->createUser('owner@example.test');
        $workspace = $this->createWorkspace($owner);

        $lead = app(TenantContext::class)->runInContext($workspace, function () {
            return CrmLead::create([
                'name' => 'Salma Bennani',
                'status' => 'New',
            ]);
        });

        $this->actingAs($owner)
            ->withHeader('X-Workspace-Id', $workspace->id)
            ->putJson('/api/crm/leads/'.$lead->id, [
                'status' => 'Contacted',
                'internal_notes' => 'Reached out via telephone.',
            ])
            ->assertOk()
            ->assertJsonPath('data.status', 'Contacted');

        // Verify status_change activity recorded
        $this->assertDatabaseHas('crm_activities', [
            'workspace_id' => $workspace->id,
            'lead_id' => $lead->id,
            'type' => CrmActivity::TYPE_STATUS_CHANGE,
        ]);
    }

    public function test_lead_deletion(): void
    {
        $owner = $this->createUser('owner@example.test');
        $workspace = $this->createWorkspace($owner);

        $lead = app(TenantContext::class)->runInContext($workspace, function () {
            return CrmLead::create([
                'name' => 'To Delete',
                'status' => 'New',
            ]);
        });

        $this->actingAs($owner)
            ->withHeader('X-Workspace-Id', $workspace->id)
            ->deleteJson('/api/crm/leads/'.$lead->id)
            ->assertOk()
            ->assertJsonPath('message', 'Lead deleted successfully.');

        $this->assertDatabaseMissing('crm_leads', ['id' => $lead->id]);
    }

    public function test_funnel_statistics_endpoint(): void
    {
        $owner = $this->createUser('owner@example.test');
        $workspace = $this->createWorkspace($owner);

        app(TenantContext::class)->runInContext($workspace, function () {
            CrmLead::create(['name' => 'Lead 1', 'status' => 'New']);
            CrmLead::create(['name' => 'Lead 2', 'status' => 'New']);
            CrmLead::create(['name' => 'Lead 3', 'status' => 'Contacted']);
            CrmLead::create(['name' => 'Lead 4', 'status' => 'Qualified']);
        });

        $response = $this->actingAs($owner)
            ->withHeader('X-Workspace-Id', $workspace->id)
            ->getJson('/api/crm/leads/funnel')
            ->assertOk();

        $data = collect($response->json('data'))->keyBy('status');
        $this->assertEquals(2, $data['New']['count']);
        $this->assertEquals(1, $data['Contacted']['count']);
        $this->assertEquals(1, $data['Qualified']['count']);
        $this->assertEquals(0, $data['Converted']['count']);
    }

    public function test_viewer_cannot_modify_leads(): void
    {
        $owner = $this->createUser('owner@example.test');
        $workspace = $this->createWorkspace($owner);
        $viewer = $this->createUser('viewer@example.test');
        $this->addMemberToWorkspace($workspace, $viewer, WorkspaceUser::ROLE_VIEWER);

        $lead = app(TenantContext::class)->runInContext($workspace, function () {
            return CrmLead::create(['name' => 'Secure Lead', 'status' => 'New']);
        });

        // Viewer can read
        $this->actingAs($viewer)
            ->withHeader('X-Workspace-Id', $workspace->id)
            ->getJson('/api/crm/leads')
            ->assertOk();

        // Viewer cannot write
        $this->actingAs($viewer)
            ->withHeader('X-Workspace-Id', $workspace->id)
            ->postJson('/api/crm/leads', ['name' => 'Blocked'])
            ->assertForbidden();

        // Viewer cannot update
        $this->actingAs($viewer)
            ->withHeader('X-Workspace-Id', $workspace->id)
            ->putJson('/api/crm/leads/'.$lead->id, ['name' => 'Blocked'])
            ->assertForbidden();

        // Viewer cannot delete
        $this->actingAs($viewer)
            ->withHeader('X-Workspace-Id', $workspace->id)
            ->deleteJson('/api/crm/leads/'.$lead->id)
            ->assertForbidden();
    }

    public function test_cross_workspace_lead_isolation(): void
    {
        $owner1 = $this->createUser('owner1@example.test');
        $workspace1 = $this->createWorkspace($owner1);

        $owner2 = $this->createUser('owner2@example.test');
        $workspace2 = $this->createWorkspace($owner2);

        $leadW1 = app(TenantContext::class)->runInContext($workspace1, function () {
            return CrmLead::create(['name' => 'Tenant 1 Lead', 'status' => 'New']);
        });

        // User in Workspace 2 cannot see or update Tenant 1 lead
        $this->actingAs($owner2)
            ->withHeader('X-Workspace-Id', $workspace2->id)
            ->getJson('/api/crm/leads')
            ->assertOk()
            ->assertJsonCount(0, 'data');

        $this->actingAs($owner2)
            ->withHeader('X-Workspace-Id', $workspace2->id)
            ->getJson('/api/crm/leads/'.$leadW1->id)
            ->assertNotFound();

        $this->actingAs($owner2)
            ->withHeader('X-Workspace-Id', $workspace2->id)
            ->putJson('/api/crm/leads/'.$leadW1->id, ['name' => 'Hacked'])
            ->assertNotFound();
    }
}