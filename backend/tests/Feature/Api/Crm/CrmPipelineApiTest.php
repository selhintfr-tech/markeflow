<?php

namespace Tests\Feature\Api\Crm;

use App\Models\Crm\CrmPipeline;
use App\Models\Crm\CrmPipelineStage;
use App\Models\WorkspaceUser;
use App\Services\TenantContext;

class CrmPipelineApiTest extends CrmTestCase
{
    public function test_owner_can_create_and_list_pipelines(): void
    {
        $owner = $this->createUser('pipe_owner@test.ma');
        $workspace = $this->createWorkspace($owner);

        $payload = [
            'name' => 'B2B Sales Pipeline',
            'description' => 'Dedicated pipeline for enterprise deals.',
            'is_default' => true,
            'display_order' => 1,
        ];

        $createResponse = $this->actingAs($owner)
            ->withHeader('X-Workspace-Id', $workspace->id)
            ->postJson('/api/crm/pipelines', $payload)
            ->assertCreated()
            ->assertJsonPath('data.name', 'B2B Sales Pipeline')
            ->assertJsonPath('data.is_default', true)
            ->assertJsonPath('data.workspace_id', $workspace->id);

        $pipelineId = $createResponse->json('data.id');

        // List
        $this->actingAs($owner)
            ->withHeader('X-Workspace-Id', $workspace->id)
            ->getJson('/api/crm/pipelines')
            ->assertOk()
            ->assertJsonPath('data.0.id', $pipelineId);

        // Show
        $this->actingAs($owner)
            ->withHeader('X-Workspace-Id', $workspace->id)
            ->getJson('/api/crm/pipelines/'.$pipelineId)
            ->assertOk()
            ->assertJsonPath('data.id', $pipelineId);
    }

    public function test_owner_can_manage_stages_and_reorder(): void
    {
        $owner = $this->createUser('pipe_stages@test.ma');
        $workspace = $this->createWorkspace($owner);

        $pipeline = app(TenantContext::class)->runInContext($workspace, function () {
            return CrmPipeline::create([
                'name' => 'Custom Pipeline',
                'is_default' => false,
            ]);
        });

        // Add stage 1
        $stage1Response = $this->actingAs($owner)
            ->withHeader('X-Workspace-Id', $workspace->id)
            ->postJson('/api/crm/pipelines/'.$pipeline->id.'/stages', [
                'pipeline_id' => $pipeline->id,
                'name' => 'Discovery',
                'probability' => 20,
                'display_order' => 1,
            ])
            ->assertCreated()
            ->assertJsonPath('data.name', 'Discovery');

        $stage1Id = $stage1Response->json('data.id');

        // Add stage 2
        $stage2Response = $this->actingAs($owner)
            ->withHeader('X-Workspace-Id', $workspace->id)
            ->postJson('/api/crm/pipelines/'.$pipeline->id.'/stages', [
                'pipeline_id' => $pipeline->id,
                'name' => 'Negotiation',
                'probability' => 80,
                'display_order' => 2,
            ])
            ->assertCreated()
            ->assertJsonPath('data.name', 'Negotiation');

        $stage2Id = $stage2Response->json('data.id');

        // Update stage 1
        $this->actingAs($owner)
            ->withHeader('X-Workspace-Id', $workspace->id)
            ->putJson('/api/crm/stages/'.$stage1Id, [
                'name' => 'Initial Discovery',
                'probability' => 25,
            ])
            ->assertOk()
            ->assertJsonPath('data.name', 'Initial Discovery')
            ->assertJsonPath('data.probability', 25);

        // Reorder stages
        $this->actingAs($owner)
            ->withHeader('X-Workspace-Id', $workspace->id)
            ->postJson('/api/crm/stages/reorder', [
                'stages' => [
                    ['id' => $stage1Id, 'display_order' => 2],
                    ['id' => $stage2Id, 'display_order' => 1],
                ],
            ])
            ->assertOk()
            ->assertJsonPath('message', 'Stages reordered successfully.');

        $this->assertDatabaseHas('crm_pipeline_stages', [
            'id' => $stage1Id,
            'display_order' => 2,
        ]);
        $this->assertDatabaseHas('crm_pipeline_stages', [
            'id' => $stage2Id,
            'display_order' => 1,
        ]);

        // Delete stage
        $this->actingAs($owner)
            ->withHeader('X-Workspace-Id', $workspace->id)
            ->deleteJson('/api/crm/stages/'.$stage1Id)
            ->assertOk();

        $this->assertDatabaseMissing('crm_pipeline_stages', [
            'id' => $stage1Id,
        ]);
    }

    public function test_viewer_cannot_modify_pipelines_or_stages(): void
    {
        $owner = $this->createUser('owner_pipe_v@test.ma');
        $viewer = $this->createUser('viewer_pipe_v@test.ma');
        $workspace = $this->createWorkspace($owner);
        $this->addMemberToWorkspace($workspace, $viewer, WorkspaceUser::ROLE_VIEWER);

        $pipeline = app(TenantContext::class)->runInContext($workspace, function () {
            return CrmPipeline::create([
                'name' => 'Protected Pipeline',
            ]);
        });

        // Viewer cannot create pipeline
        $this->actingAs($viewer)
            ->withHeader('X-Workspace-Id', $workspace->id)
            ->postJson('/api/crm/pipelines', [
                'name' => 'Unauthorized Pipeline',
            ])
            ->assertForbidden();

        // Viewer cannot add stage
        $this->actingAs($viewer)
            ->withHeader('X-Workspace-Id', $workspace->id)
            ->postJson('/api/crm/pipelines/'.$pipeline->id.'/stages', [
                'pipeline_id' => $pipeline->id,
                'name' => 'Unauthorized Stage',
            ])
            ->assertForbidden();
    }

    public function test_cross_workspace_pipeline_isolation(): void
    {
        $owner1 = $this->createUser('owner1_pipe_iso@test.ma');
        $workspace1 = $this->createWorkspace($owner1);

        $owner2 = $this->createUser('owner2_pipe_iso@test.ma');
        $workspace2 = $this->createWorkspace($owner2);

        $pipeline1 = app(TenantContext::class)->runInContext($workspace1, function () {
            return CrmPipeline::create([
                'name' => 'Tenant 1 Pipeline',
            ]);
        });

        // Owner 2 does not see Tenant 1 pipeline in list
        $response = $this->actingAs($owner2)
            ->withHeader('X-Workspace-Id', $workspace2->id)
            ->getJson('/api/crm/pipelines')
            ->assertOk();

        $ids = collect($response->json('data'))->pluck('id')->all();
        $this->assertNotContains($pipeline1->id, $ids);

        // Owner 2 cannot show Tenant 1 pipeline
        $this->actingAs($owner2)
            ->withHeader('X-Workspace-Id', $workspace2->id)
            ->getJson('/api/crm/pipelines/'.$pipeline1->id)
            ->assertNotFound();

        // Owner 2 cannot add stage to Tenant 1 pipeline
        $this->actingAs($owner2)
            ->withHeader('X-Workspace-Id', $workspace2->id)
            ->postJson('/api/crm/pipelines/'.$pipeline1->id.'/stages', [
                'pipeline_id' => $pipeline1->id,
                'name' => 'Injected Stage',
            ])
            ->assertUnprocessable(); // foreign key / exists check fails because pipeline is in workspace 1
    }
}