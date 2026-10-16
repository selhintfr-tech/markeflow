<?php

namespace Tests\Feature\Api;

use App\Http\Controllers\Api\WorkspaceController;
use App\Models\User;
use App\Models\Workspace;
use App\Models\WorkspaceUser;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Route;
use Tests\TestCase;

class WorkspaceApiTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        // Register API routes for testing the WorkspaceController endpoints
        Route::middleware(['web'])->prefix('api')->group(function () {
            Route::get('/workspaces', [WorkspaceController::class, 'index'])->middleware('auth');
            Route::post('/workspaces', [WorkspaceController::class, 'store'])->middleware('auth');
            Route::get('/workspaces/{workspace}', [WorkspaceController::class, 'show'])->middleware('auth');
            Route::put('/workspaces/{workspace}', [WorkspaceController::class, 'update'])->middleware('auth');
            Route::patch('/workspaces/{workspace}', [WorkspaceController::class, 'update'])->middleware('auth');
            Route::delete('/workspaces/{workspace}', [WorkspaceController::class, 'destroy'])->middleware('auth');
        });
    }

    protected function createUser(string $name, string $email): User
    {
        return User::create([
            'name' => $name,
            'email' => $email,
            'password' => bcrypt('Password123!'),
        ]);
    }

    public function test_unauthenticated_requests_are_rejected(): void
    {
        $response = $this->getJson('/api/workspaces');
        $response->assertStatus(401);

        $response = $this->postJson('/api/workspaces', ['name' => 'Unauthenticated Space']);
        $response->assertStatus(401);
    }

    public function test_authenticated_user_can_list_their_workspaces(): void
    {
        $user = $this->createUser('Sara El Amrani', 'sara@marketflow.ma');

        $workspace1 = Workspace::createWithInitialOwner($user, [
            'name' => 'Atlas Retail SARL',
            'slug' => 'atlas-retail',
            'business_type' => Workspace::TYPE_ECOMMERCE,
        ]);

        $workspace2 = Workspace::createWithInitialOwner($user, [
            'name' => 'Atlas Growth Lab',
            'slug' => 'atlas-growth',
            'business_type' => Workspace::TYPE_AGENCY,
        ]);

        $response = $this->actingAs($user)->getJson('/api/workspaces');

        $response->assertStatus(200)
            ->assertJsonCount(2, 'data')
            ->assertJsonPath('data.0.name', 'Atlas Growth Lab')
            ->assertJsonPath('data.1.name', 'Atlas Retail SARL');
    }

    public function test_workspace_list_does_not_leak_other_tenants_workspaces(): void
    {
        $userA = $this->createUser('Sara El Amrani', 'sara@atlas.ma');
        $userB = $this->createUser('Karim Tazi', 'karim@solis.ma');

        $workspaceA = Workspace::createWithInitialOwner($userA, [
            'name' => 'Atlas Retail SARL',
            'slug' => 'atlas-retail',
        ]);

        $workspaceB = Workspace::createWithInitialOwner($userB, [
            'name' => 'Solis Energy Tech',
            'slug' => 'solis-energy',
        ]);

        // User A should ONLY see Workspace A
        $responseA = $this->actingAs($userA)->getJson('/api/workspaces');
        $responseA->assertStatus(200)
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $workspaceA->id)
            ->assertJsonPath('data.0.name', 'Atlas Retail SARL');

        // User B should ONLY see Workspace B
        $responseB = $this->actingAs($userB)->getJson('/api/workspaces');
        $responseB->assertStatus(200)
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $workspaceB->id)
            ->assertJsonPath('data.0.name', 'Solis Energy Tech');
    }

    public function test_workspace_list_supports_search_and_filters(): void
    {
        $user = $this->createUser('Mehdi Zahraoui', 'mehdi@marketflow.ma');

        Workspace::createWithInitialOwner($user, [
            'name' => 'Zenith Media Lab',
            'slug' => 'zenith-media',
            'business_type' => Workspace::TYPE_AGENCY,
            'status' => 'Active',
        ]);

        Workspace::createWithInitialOwner($user, [
            'name' => 'Nordic Craft Co',
            'slug' => 'nordic-craft',
            'business_type' => Workspace::TYPE_ECOMMERCE,
            'status' => 'Active',
        ]);

        // Filter by search query
        $searchResponse = $this->actingAs($user)->getJson('/api/workspaces?search=Zenith');
        $searchResponse->assertStatus(200)
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.slug', 'zenith-media');

        // Filter by business type
        $typeResponse = $this->actingAs($user)->getJson('/api/workspaces?business_type='.Workspace::TYPE_ECOMMERCE);
        $typeResponse->assertStatus(200)
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.slug', 'nordic-craft');
    }

    public function test_user_can_create_workspace_with_atomic_owner_membership(): void
    {
        $user = $this->createUser('Sara El Amrani', 'sara@marketflow.ma');

        $payload = [
            'name' => 'Morocco Digital Agency',
            'business_type' => Workspace::TYPE_AGENCY,
            'industry' => 'Digital Marketing',
            'location' => 'Casablanca, Morocco',
            'currency' => 'MAD',
            'timezone' => 'Africa/Casablanca',
        ];

        $response = $this->actingAs($user)->postJson('/api/workspaces', $payload);

        $response->assertStatus(201)
            ->assertJsonPath('data.name', 'Morocco Digital Agency')
            ->assertJsonPath('data.slug', 'morocco-digital-agency')
            ->assertJsonPath('data.business_type', Workspace::TYPE_AGENCY)
            ->assertJsonPath('data.current_user_role', WorkspaceUser::ROLE_OWNER)
            ->assertJsonPath('data.is_owner', true);

        $createdId = $response->json('data.id');
        $this->assertNotEmpty($createdId);

        // Verify database state: membership, settings, and audit log created
        $this->assertDatabaseHas('workspaces', [
            'id' => $createdId,
            'name' => 'Morocco Digital Agency',
            'slug' => 'morocco-digital-agency',
        ]);

        $this->assertDatabaseHas('workspace_users', [
            'workspace_id' => $createdId,
            'user_id' => $user->id,
            'role' => WorkspaceUser::ROLE_OWNER,
        ]);

        $this->assertDatabaseHas('workspace_settings', [
            'workspace_id' => $createdId,
        ]);

        $this->assertDatabaseHas('workspace_audit_logs', [
            'workspace_id' => $createdId,
            'action' => 'workspace.created',
            'user_id' => $user->id,
        ]);
    }

    public function test_workspace_creation_validates_required_fields_and_slug_format(): void
    {
        $user = $this->createUser('Sara El Amrani', 'sara@marketflow.ma');

        // Missing name
        $response = $this->actingAs($user)->postJson('/api/workspaces', []);
        $response->assertStatus(422)
            ->assertJsonValidationErrors(['name']);

        // Invalid slug format
        $response = $this->actingAs($user)->postJson('/api/workspaces', [
            'name' => 'Test Space',
            'slug' => 'INVALID SLUG WITH SPACES',
        ]);
        $response->assertStatus(422)
            ->assertJsonValidationErrors(['slug']);

        // Invalid business type
        $response = $this->actingAs($user)->postJson('/api/workspaces', [
            'name' => 'Test Space',
            'business_type' => 'unsupported_type',
        ]);
        $response->assertStatus(422)
            ->assertJsonValidationErrors(['business_type']);
    }

    public function test_workspace_creation_rejects_client_controlled_owner_or_id_injection(): void
    {
        $user = $this->createUser('Sara El Amrani', 'sara@marketflow.ma');
        $fakeOwner = $this->createUser('Victim User', 'victim@marketflow.ma');

        $maliciousPayload = [
            'name' => 'Exploit Workspace',
            'id' => '00000000-0000-0000-0000-000000000000',
            'owner_id' => $fakeOwner->id,
            'user_id' => $fakeOwner->id,
            'role' => 'admin',
        ];

        $response = $this->actingAs($user)->postJson('/api/workspaces', $maliciousPayload);

        $response->assertStatus(201);
        $newWorkspaceId = $response->json('data.id');

        // ID must be auto-generated, not the client-supplied one
        $this->assertNotEquals('00000000-0000-0000-0000-000000000000', $newWorkspaceId);

        // Owner must be strictly the authenticated user, not fakeOwner
        $this->assertDatabaseHas('workspace_users', [
            'workspace_id' => $newWorkspaceId,
            'user_id' => $user->id,
            'role' => WorkspaceUser::ROLE_OWNER,
        ]);

        $this->assertDatabaseMissing('workspace_users', [
            'workspace_id' => $newWorkspaceId,
            'user_id' => $fakeOwner->id,
        ]);
    }

    public function test_authorized_member_can_view_workspace_detail(): void
    {
        $owner = $this->createUser('Sara El Amrani', 'sara@marketflow.ma');
        $workspace = Workspace::createWithInitialOwner($owner, [
            'name' => 'Atlas Retail SARL',
            'slug' => 'atlas-retail',
            'business_type' => Workspace::TYPE_ECOMMERCE,
        ]);

        $response = $this->actingAs($owner)->getJson("/api/workspaces/{$workspace->id}");

        $response->assertStatus(200)
            ->assertJsonPath('data.id', $workspace->id)
            ->assertJsonPath('data.name', 'Atlas Retail SARL')
            ->assertJsonPath('data.slug', 'atlas-retail')
            ->assertJsonPath('data.current_user_role', WorkspaceUser::ROLE_OWNER)
            ->assertJsonPath('data.is_owner', true);
    }

    public function test_non_member_cannot_view_workspace_detail_and_receives_403(): void
    {
        $owner = $this->createUser('Sara El Amrani', 'sara@atlas.ma');
        $outsider = $this->createUser('Karim Tazi', 'karim@solis.ma');

        $workspace = Workspace::createWithInitialOwner($owner, [
            'name' => 'Atlas Retail SARL',
            'slug' => 'atlas-retail',
        ]);

        $response = $this->actingAs($outsider)->getJson("/api/workspaces/{$workspace->id}");
        $response->assertStatus(403);
    }

    public function test_authorized_owner_or_admin_can_update_workspace(): void
    {
        $owner = $this->createUser('Sara El Amrani', 'sara@marketflow.ma');
        $workspace = Workspace::createWithInitialOwner($owner, [
            'name' => 'Initial Name',
            'slug' => 'initial-slug',
            'business_type' => Workspace::TYPE_GENERAL,
        ]);

        $updatePayload = [
            'name' => 'Updated Brand Workspace',
            'business_type' => Workspace::TYPE_AGENCY,
            'industry' => 'SaaS Marketing',
            'currency' => 'EUR',
        ];

        $response = $this->actingAs($owner)->putJson("/api/workspaces/{$workspace->id}", $updatePayload);

        $response->assertStatus(200)
            ->assertJsonPath('data.name', 'Updated Brand Workspace')
            ->assertJsonPath('data.business_type', Workspace::TYPE_AGENCY)
            ->assertJsonPath('data.industry', 'SaaS Marketing')
            ->assertJsonPath('data.currency', 'EUR');

        $this->assertDatabaseHas('workspaces', [
            'id' => $workspace->id,
            'name' => 'Updated Brand Workspace',
            'currency' => 'EUR',
        ]);

        $this->assertDatabaseHas('workspace_audit_logs', [
            'workspace_id' => $workspace->id,
            'action' => 'workspace.updated',
            'user_id' => $owner->id,
        ]);
    }

    public function test_viewer_cannot_update_workspace_and_receives_403(): void
    {
        $owner = $this->createUser('Sara El Amrani', 'sara@marketflow.ma');
        $viewer = $this->createUser('Omar Viewer', 'omar@marketflow.ma');

        $workspace = Workspace::createWithInitialOwner($owner, [
            'name' => 'Protected Workspace',
            'slug' => 'protected-ws',
        ]);

        // Add user as viewer
        WorkspaceUser::create([
            'workspace_id' => $workspace->id,
            'user_id' => $viewer->id,
            'role' => WorkspaceUser::ROLE_VIEWER,
            'joined_at' => now(),
        ]);

        $response = $this->actingAs($viewer)->putJson("/api/workspaces/{$workspace->id}", [
            'name' => 'Hacked Workspace Name',
        ]);

        $response->assertStatus(403);

        $this->assertDatabaseHas('workspaces', [
            'id' => $workspace->id,
            'name' => 'Protected Workspace',
        ]);
    }

    public function test_owner_can_delete_workspace_and_cascades_records(): void
    {
        $owner = $this->createUser('Sara El Amrani', 'sara@marketflow.ma');
        $workspace = Workspace::createWithInitialOwner($owner, [
            'name' => 'Workspace to Delete',
            'slug' => 'ws-to-delete',
        ]);

        $workspaceId = $workspace->id;

        $response = $this->actingAs($owner)->deleteJson("/api/workspaces/{$workspaceId}");

        $response->assertStatus(200)
            ->assertJsonPath('message', 'Workspace deleted successfully.');

        // Verify complete cascade deletion
        $this->assertDatabaseMissing('workspaces', ['id' => $workspaceId]);
        $this->assertDatabaseMissing('workspace_users', ['workspace_id' => $workspaceId]);
        $this->assertDatabaseMissing('workspace_settings', ['workspace_id' => $workspaceId]);
    }

    public function test_non_owner_member_cannot_delete_workspace(): void
    {
        $owner = $this->createUser('Sara El Amrani', 'sara@marketflow.ma');
        $admin = $this->createUser('Mehdi Admin', 'mehdi@marketflow.ma');

        $workspace = Workspace::createWithInitialOwner($owner, [
            'name' => 'Protected Workspace',
            'slug' => 'protected-space',
        ]);

        // Add Mehdi as Admin (not Owner)
        WorkspaceUser::create([
            'workspace_id' => $workspace->id,
            'user_id' => $admin->id,
            'role' => WorkspaceUser::ROLE_ADMIN,
            'joined_at' => now(),
        ]);

        // Admin attempt to delete workspace must be rejected
        $response = $this->actingAs($admin)->deleteJson("/api/workspaces/{$workspace->id}");
        $response->assertStatus(403);

        // Workspace must remain intact
        $this->assertDatabaseHas('workspaces', ['id' => $workspace->id]);
    }
}
