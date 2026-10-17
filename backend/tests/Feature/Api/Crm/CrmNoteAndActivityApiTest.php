<?php

namespace Tests\Feature\Api\Crm;

use App\Models\Crm\CrmActivity;
use App\Models\Crm\CrmContact;
use App\Models\Crm\CrmCustomer;
use App\Models\Crm\CrmLead;
use App\Models\Crm\CrmNote;
use App\Models\WorkspaceUser;
use App\Services\TenantContext;

class CrmNoteAndActivityApiTest extends CrmTestCase
{
    public function test_owner_can_create_and_manage_notes(): void
    {
        $owner = $this->createUser('note_owner@test.ma');
        $workspace = $this->createWorkspace($owner);

        $contact = app(TenantContext::class)->runInContext($workspace, function () {
            return CrmContact::create([
                'first_name' => 'Sara',
                'last_name' => 'El Amrani',
                'email' => 'sara@test.ma',
                'status' => 'Active',
            ]);
        });

        // Create Note
        $createResponse = $this->actingAs($owner)
            ->withHeader('X-Workspace-Id', $workspace->id)
            ->postJson('/api/crm/notes', [
                'contact_id' => $contact->id,
                'content' => 'Discussed pricing and contract renewal terms.',
                'is_pinned' => true,
            ])
            ->assertCreated()
            ->assertJsonPath('data.content', 'Discussed pricing and contract renewal terms.')
            ->assertJsonPath('data.is_pinned', true)
            ->assertJsonPath('data.contact_id', $contact->id);

        $noteId = $createResponse->json('data.id');

        // List notes filtered by contact_id
        $this->actingAs($owner)
            ->withHeader('X-Workspace-Id', $workspace->id)
            ->getJson('/api/crm/notes?contact_id='.$contact->id)
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $noteId);

        // Update Note
        $this->actingAs($owner)
            ->withHeader('X-Workspace-Id', $workspace->id)
            ->putJson('/api/crm/notes/'.$noteId, [
                'content' => 'Updated: Client approved 1-year contract extension.',
                'is_pinned' => false,
            ])
            ->assertOk()
            ->assertJsonPath('data.content', 'Updated: Client approved 1-year contract extension.')
            ->assertJsonPath('data.is_pinned', false);

        // Delete Note
        $this->actingAs($owner)
            ->withHeader('X-Workspace-Id', $workspace->id)
            ->deleteJson('/api/crm/notes/'.$noteId)
            ->assertOk();

        $this->assertDatabaseMissing('crm_notes', [
            'id' => $noteId,
        ]);
    }

    public function test_owner_can_record_and_list_activities(): void
    {
        $owner = $this->createUser('act_owner@test.ma');
        $workspace = $this->createWorkspace($owner);

        $lead = app(TenantContext::class)->runInContext($workspace, function () {
            return CrmLead::create([
                'name' => 'Karim Idrissi',
                'company' => 'Idrissi Tech',
                'status' => 'New',
            ]);
        });

        // Record Activity
        $actResponse = $this->actingAs($owner)
            ->withHeader('X-Workspace-Id', $workspace->id)
            ->postJson('/api/crm/activities', [
                'lead_id' => $lead->id,
                'type' => 'call',
                'title' => 'Discovery call with Founder',
                'description' => 'Covered budget, timeline and core integration requirements.',
                'activity_date' => now()->toIso8601String(),
                'metadata' => ['duration_minutes' => 35],
            ])
            ->assertCreated()
            ->assertJsonPath('data.type', 'call')
            ->assertJsonPath('data.title', 'Discovery call with Founder')
            ->assertJsonPath('data.lead_id', $lead->id);

        $activityId = $actResponse->json('data.id');

        // List Activities filtered by lead_id
        $this->actingAs($owner)
            ->withHeader('X-Workspace-Id', $workspace->id)
            ->getJson('/api/crm/activities?lead_id='.$lead->id)
            ->assertOk()
            ->assertJsonPath('data.0.id', $activityId);

        // Delete Activity
        $this->actingAs($owner)
            ->withHeader('X-Workspace-Id', $workspace->id)
            ->deleteJson('/api/crm/activities/'.$activityId)
            ->assertOk();

        $this->assertDatabaseMissing('crm_activities', [
            'id' => $activityId,
        ]);
    }

    public function test_viewer_cannot_modify_notes_or_activities(): void
    {
        $owner = $this->createUser('owner_na_v@test.ma');
        $viewer = $this->createUser('viewer_na_v@test.ma');
        $workspace = $this->createWorkspace($owner);
        $this->addMemberToWorkspace($workspace, $viewer, WorkspaceUser::ROLE_VIEWER);

        $note = app(TenantContext::class)->runInContext($workspace, function () {
            return CrmNote::create([
                'content' => 'Confidential note.',
            ]);
        });

        // Viewer cannot create note
        $this->actingAs($viewer)
            ->withHeader('X-Workspace-Id', $workspace->id)
            ->postJson('/api/crm/notes', [
                'content' => 'Unauthorized note attempt',
            ])
            ->assertForbidden();

        // Viewer cannot delete note
        $this->actingAs($viewer)
            ->withHeader('X-Workspace-Id', $workspace->id)
            ->deleteJson('/api/crm/notes/'.$note->id)
            ->assertForbidden();

        // Viewer cannot create activity
        $this->actingAs($viewer)
            ->withHeader('X-Workspace-Id', $workspace->id)
            ->postJson('/api/crm/activities', [
                'type' => 'note',
                'title' => 'Unauthorized activity',
            ])
            ->assertForbidden();
    }

    public function test_cross_workspace_note_and_activity_isolation(): void
    {
        $owner1 = $this->createUser('owner1_na_iso@test.ma');
        $workspace1 = $this->createWorkspace($owner1);

        $owner2 = $this->createUser('owner2_na_iso@test.ma');
        $workspace2 = $this->createWorkspace($owner2);

        $note1 = app(TenantContext::class)->runInContext($workspace1, function () {
            return CrmNote::create([
                'content' => 'Workspace 1 secret note',
            ]);
        });

        $act1 = app(TenantContext::class)->runInContext($workspace1, function () {
            return CrmActivity::create([
                'type' => 'call',
                'title' => 'Workspace 1 secret call',
            ]);
        });

        // Owner 2 cannot see note 1
        $this->actingAs($owner2)
            ->withHeader('X-Workspace-Id', $workspace2->id)
            ->getJson('/api/crm/notes/'.$note1->id)
            ->assertNotFound();

        // Owner 2 cannot delete note 1
        $this->actingAs($owner2)
            ->withHeader('X-Workspace-Id', $workspace2->id)
            ->deleteJson('/api/crm/notes/'.$note1->id)
            ->assertNotFound();

        // Owner 2 cannot see activity 1
        $this->actingAs($owner2)
            ->withHeader('X-Workspace-Id', $workspace2->id)
            ->getJson('/api/crm/activities/'.$act1->id)
            ->assertNotFound();

        // Owner 2 cannot delete activity 1
        $this->actingAs($owner2)
            ->withHeader('X-Workspace-Id', $workspace2->id)
            ->deleteJson('/api/crm/activities/'.$act1->id)
            ->assertNotFound();
    }
}