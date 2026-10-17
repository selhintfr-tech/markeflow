<?php

namespace Tests\Feature\Api\Crm;

use App\Models\Crm\CrmContact;
use App\Models\WorkspaceUser;
use App\Services\TenantContext;

class CrmContactApiTest extends CrmTestCase
{
    public function test_unauthenticated_request_is_rejected(): void
    {
        $response = $this->getJson('/api/crm/contacts');
        $response->assertUnauthorized();
    }

    public function test_missing_workspace_header_is_rejected(): void
    {
        $user = $this->createUser('user@example.test');

        $response = $this->actingAs($user)->getJson('/api/crm/contacts');
        $response->assertForbidden();
    }

    public function test_owner_can_create_and_list_contacts(): void
    {
        $owner = $this->createUser('owner@example.test');
        $workspace = $this->createWorkspace($owner);

        $payload = [
            'first_name' => 'John',
            'last_name' => 'Doe',
            'company_name' => 'Acme Corp',
            'email' => 'john.doe@acme.test',
            'phone' => '+1234567890',
            'job_title' => 'Chief Marketing Officer',
            'preferred_contact' => 'Email',
            'location' => 'New York, USA',
            'lifecycle_stage' => 'lead',
            'status' => 'Active',
            'owner_id' => $owner->id,
            'notes' => 'Important prospect.',
        ];

        $createResponse = $this->actingAs($owner)
            ->withHeader('X-Workspace-Id', $workspace->id)
            ->postJson('/api/crm/contacts', $payload)
            ->assertCreated()
            ->assertJsonPath('data.first_name', 'John')
            ->assertJsonPath('data.name', 'John Doe')
            ->assertJsonPath('data.company_name', 'Acme Corp')
            ->assertJsonPath('data.workspace_id', $workspace->id);

        $contactId = $createResponse->json('data.id');

        $this->actingAs($owner)
            ->withHeader('X-Workspace-Id', $workspace->id)
            ->getJson('/api/crm/contacts')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $contactId);

        // Show details
        $this->actingAs($owner)
            ->withHeader('X-Workspace-Id', $workspace->id)
            ->getJson('/api/crm/contacts/'.$contactId)
            ->assertOk()
            ->assertJsonPath('data.id', $contactId)
            ->assertJsonPath('data.email', 'john.doe@acme.test');
    }

    public function test_contact_search_and_filtering(): void
    {
        $owner = $this->createUser('owner@example.test');
        $workspace = $this->createWorkspace($owner);

        app(TenantContext::class)->runInContext($workspace, function () {
            CrmContact::create([
                'first_name' => 'Sara',
                'last_name' => 'El Amrani',
                'company_name' => 'Maroc Media',
                'email' => 'sara@marocmedia.ma',
                'lifecycle_stage' => 'lead',
                'status' => 'Active',
            ]);

            CrmContact::create([
                'first_name' => 'Karim',
                'last_name' => 'Bennani',
                'company_name' => 'Atlas Tech',
                'email' => 'karim@atlastech.ma',
                'lifecycle_stage' => 'customer',
                'status' => 'Active',
            ]);
        });

        // Search by name
        $this->actingAs($owner)
            ->withHeader('X-Workspace-Id', $workspace->id)
            ->getJson('/api/crm/contacts?search=Sara')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.first_name', 'Sara');

        // Filter by lifecycle_stage
        $this->actingAs($owner)
            ->withHeader('X-Workspace-Id', $workspace->id)
            ->getJson('/api/crm/contacts?lifecycle_stage=customer')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.first_name', 'Karim');
    }

    public function test_contact_update_and_delete(): void
    {
        $owner = $this->createUser('owner@example.test');
        $workspace = $this->createWorkspace($owner);

        $contact = app(TenantContext::class)->runInContext($workspace, function () {
            return CrmContact::create([
                'first_name' => 'Original',
                'last_name' => 'Contact',
                'email' => 'orig@example.test',
                'status' => 'Active',
            ]);
        });

        $this->actingAs($owner)
            ->withHeader('X-Workspace-Id', $workspace->id)
            ->putJson('/api/crm/contacts/'.$contact->id, [
                'first_name' => 'Updated',
                'company_name' => 'New Company',
            ])
            ->assertOk()
            ->assertJsonPath('data.first_name', 'Updated')
            ->assertJsonPath('data.company_name', 'New Company');

        $this->actingAs($owner)
            ->withHeader('X-Workspace-Id', $workspace->id)
            ->deleteJson('/api/crm/contacts/'.$contact->id)
            ->assertOk()
            ->assertJsonPath('message', 'Contact deleted successfully.');

        $this->assertDatabaseMissing('crm_contacts', ['id' => $contact->id]);
    }

    public function test_viewer_cannot_create_update_or_delete_contact(): void
    {
        $owner = $this->createUser('owner@example.test');
        $workspace = $this->createWorkspace($owner);
        $viewer = $this->createUser('viewer@example.test');
        $this->addMemberToWorkspace($workspace, $viewer, WorkspaceUser::ROLE_VIEWER);

        $contact = app(TenantContext::class)->runInContext($workspace, function () {
            return CrmContact::create([
                'first_name' => 'Protected',
                'status' => 'Active',
            ]);
        });

        // Viewer CAN read
        $this->actingAs($viewer)
            ->withHeader('X-Workspace-Id', $workspace->id)
            ->getJson('/api/crm/contacts')
            ->assertOk();

        // Viewer CANNOT create
        $this->actingAs($viewer)
            ->withHeader('X-Workspace-Id', $workspace->id)
            ->postJson('/api/crm/contacts', [
                'first_name' => 'Illegal',
            ])
            ->assertForbidden();

        // Viewer CANNOT update
        $this->actingAs($viewer)
            ->withHeader('X-Workspace-Id', $workspace->id)
            ->putJson('/api/crm/contacts/'.$contact->id, [
                'first_name' => 'Hacked',
            ])
            ->assertForbidden();

        // Viewer CANNOT delete
        $this->actingAs($viewer)
            ->withHeader('X-Workspace-Id', $workspace->id)
            ->deleteJson('/api/crm/contacts/'.$contact->id)
            ->assertForbidden();
    }

    public function test_cross_workspace_isolation_is_enforced(): void
    {
        $owner1 = $this->createUser('owner1@example.test');
        $workspace1 = $this->createWorkspace($owner1);

        $owner2 = $this->createUser('owner2@example.test');
        $workspace2 = $this->createWorkspace($owner2);

        $contactW1 = app(TenantContext::class)->runInContext($workspace1, function () {
            return CrmContact::create([
                'first_name' => 'Workspace1 Contact',
                'status' => 'Active',
            ]);
        });

        // Owner 2 in Workspace 2 cannot see contact from Workspace 1
        $this->actingAs($owner2)
            ->withHeader('X-Workspace-Id', $workspace2->id)
            ->getJson('/api/crm/contacts')
            ->assertOk()
            ->assertJsonCount(0, 'data');

        // Owner 2 in Workspace 2 cannot view contact from Workspace 1
        $this->actingAs($owner2)
            ->withHeader('X-Workspace-Id', $workspace2->id)
            ->getJson('/api/crm/contacts/'.$contactW1->id)
            ->assertNotFound();

        // Owner 2 in Workspace 2 cannot update contact from Workspace 1
        $this->actingAs($owner2)
            ->withHeader('X-Workspace-Id', $workspace2->id)
            ->putJson('/api/crm/contacts/'.$contactW1->id, ['first_name' => 'Intrusion'])
            ->assertNotFound();
    }

    public function test_assigning_non_workspace_user_as_owner_is_rejected(): void
    {
        $owner = $this->createUser('owner@example.test');
        $workspace = $this->createWorkspace($owner);
        $outsider = $this->createUser('outsider@example.test');

        $this->actingAs($owner)
            ->withHeader('X-Workspace-Id', $workspace->id)
            ->postJson('/api/crm/contacts', [
                'first_name' => 'Test',
                'owner_id' => $outsider->id,
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['owner_id']);
    }
}