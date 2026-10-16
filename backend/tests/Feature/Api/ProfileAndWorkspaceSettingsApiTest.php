<?php

namespace Tests\Feature\Api;

use App\Http\Controllers\Api\ProfileController;
use App\Http\Controllers\Api\WorkspaceSettingsController;
use App\Models\User;
use App\Models\Workspace;
use App\Models\WorkspaceUser;
use App\Services\TenantContext;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Route;
use Tests\TestCase;

class ProfileAndWorkspaceSettingsApiTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        Route::middleware(['web'])->prefix('api')->group(function () {
            Route::get('/profile', [ProfileController::class, 'show'])->middleware('auth');
            Route::patch('/profile', [ProfileController::class, 'update'])->middleware('auth');
            Route::patch('/profile/password', [ProfileController::class, 'changePassword'])->middleware('auth');
            Route::get('/workspaces/{workspace}/settings', [WorkspaceSettingsController::class, 'show'])->middleware('auth');
            Route::patch('/workspaces/{workspace}/settings', [WorkspaceSettingsController::class, 'update'])->middleware('auth');
        });
    }

    private function createUser(string $name, string $email, string $role = WorkspaceUser::ROLE_OWNER, ?Workspace $workspace = null): User
    {
        $user = User::create([
            'name' => $name,
            'email' => $email,
            'password' => 'CorrectPass123!',
        ]);

        if ($workspace) {
            WorkspaceUser::create([
                'workspace_id' => $workspace->id,
                'user_id' => $user->id,
                'role' => $role,
                'joined_at' => now(),
            ]);
        }

        return $user;
    }

    public function test_profile_is_authenticated_and_returns_only_safe_fields(): void
    {
        $user = $this->createUser('Profile User', 'profile@example.com');

        $this->getJson('/api/profile')->assertUnauthorized();

        $this->actingAs($user)->getJson('/api/profile')
            ->assertOk()
            ->assertJsonPath('data.id', $user->id)
            ->assertJsonPath('data.name', 'Profile User')
            ->assertJsonMissingPath('data.password')
            ->assertJsonMissingPath('data.remember_token')
            ->assertJsonMissingPath('data.email_verified_at');
    }

    public function test_user_can_update_own_profile_and_email_change_clears_verification(): void
    {
        $user = $this->createUser('Old Name', 'old@example.com');
        $user->forceFill(['email_verified_at' => now()])->save();

        $this->actingAs($user)->patchJson('/api/profile', [
            'name' => 'New Name',
            'email' => 'new@example.com',
            'phone' => '+212600000000',
            'job_title' => 'Marketing Lead',
            'timezone' => 'Africa/Casablanca',
            'locale' => 'fr',
        ])->assertOk()
            ->assertJsonPath('data.name', 'New Name')
            ->assertJsonPath('data.email', 'new@example.com')
            ->assertJsonPath('data.locale', 'fr')
            ->assertJsonMissingPath('data.password')
            ->assertJsonMissingPath('data.remember_token');

        $this->assertDatabaseHas('users', [
            'id' => $user->id,
            'email' => 'new@example.com',
            'email_verified_at' => null,
            'job_title' => 'Marketing Lead',
        ]);
    }

    public function test_profile_update_validates_fields_and_rejects_sensitive_attributes(): void
    {
        $user = $this->createUser('Valid User', 'valid@example.com');

        $this->actingAs($user)->patchJson('/api/profile', [
            'name' => '',
            'email' => 'not-an-email',
            'timezone' => 'not-a-timezone',
        ])->assertUnprocessable()
            ->assertJsonValidationErrors(['name', 'email', 'timezone']);

        $this->actingAs($user)->patchJson('/api/profile', [
            'password' => 'attacker-controlled',
        ])->assertUnprocessable()
            ->assertJsonValidationErrors(['password']);

        $this->assertTrue(Hash::check('CorrectPass123!', $user->fresh()->password));
    }

    public function test_user_can_change_password_only_after_current_password_verification(): void
    {
        $user = $this->createUser('Password User', 'password@example.com');

        $this->actingAs($user)->patchJson('/api/profile/password', [
            'current_password' => 'incorrect',
            'new_password' => 'NewSecurePass123!',
            'new_password_confirmation' => 'NewSecurePass123!',
        ])->assertUnprocessable()
            ->assertJsonValidationErrors(['current_password']);
        $this->assertTrue(Hash::check('CorrectPass123!', $user->fresh()->password));

        $this->actingAs($user)->patchJson('/api/profile/password', [
            'current_password' => 'CorrectPass123!',
            'new_password' => 'NewSecurePass123!',
            'new_password_confirmation' => 'NewSecurePass123!',
        ])->assertOk()
            ->assertJsonPath('message', 'Password updated successfully.')
            ->assertJsonMissingPath('password');
        $this->assertTrue(Hash::check('NewSecurePass123!', $user->fresh()->password));
    }

    public function test_password_change_rejects_weak_or_unconfirmed_passwords(): void
    {
        $user = $this->createUser('Password User', 'weak-password@example.com');

        $this->actingAs($user)->patchJson('/api/profile/password', [
            'current_password' => 'CorrectPass123!',
            'new_password' => 'short',
            'new_password_confirmation' => 'different',
        ])->assertUnprocessable()
            ->assertJsonValidationErrors(['new_password']);
    }

    public function test_workspace_member_can_read_only_their_workspace_settings(): void
    {
        $owner = $this->createUser('Owner', 'settings-owner@example.com');
        $workspace = Workspace::createWithInitialOwner($owner, [
            'name' => 'Owner Workspace',
            'slug' => 'owner-workspace',
        ]);
        $member = $this->createUser('Member', 'settings-member@example.com', WorkspaceUser::ROLE_MEMBER, $workspace);
        $otherOwner = $this->createUser('Other Owner', 'other-settings-owner@example.com');
        $otherWorkspace = Workspace::createWithInitialOwner($otherOwner, [
            'name' => 'Other Workspace',
            'slug' => 'other-workspace',
        ]);

        $this->actingAs($member)->getJson("/api/workspaces/{$workspace->id}/settings")
            ->assertOk()
            ->assertJsonPath('data.workspace_id', $workspace->id)
            ->assertJsonPath('data.settings', []);

        $this->actingAs($member)->getJson("/api/workspaces/{$otherWorkspace->id}/settings")
            ->assertForbidden();
    }

    public function test_owner_and_admin_can_update_allowlisted_workspace_settings(): void
    {
        $owner = $this->createUser('Settings Owner', 'settings-owner2@example.com');
        $workspace = Workspace::createWithInitialOwner($owner, [
            'name' => 'Settings Workspace',
            'slug' => 'settings-workspace',
        ]);
        $admin = $this->createUser('Settings Admin', 'settings-admin@example.com', WorkspaceUser::ROLE_ADMIN, $workspace);
        $payload = [
            'settings' => [
                'general' => ['currency' => 'EUR', 'reportingPeriod' => 'Current quarter'],
                'notifications' => ['taskUpdates' => false],
                'appearance' => ['theme' => 'dark'],
            ],
        ];

        $this->actingAs($owner)->patchJson("/api/workspaces/{$workspace->id}/settings", $payload)
            ->assertOk()
            ->assertJsonPath('data.workspace_id', $workspace->id)
            ->assertJsonPath('data.settings.general.currency', 'EUR')
            ->assertJsonPath('data.settings.notifications.taskUpdates', false);

        $this->actingAs($admin)->patchJson("/api/workspaces/{$workspace->id}/settings", [
            'settings' => ['general' => ['currency' => 'USD']],
        ])->assertOk()
            ->assertJsonPath('data.settings.general.currency', 'USD')
            ->assertJsonPath('data.settings.general.reportingPeriod', 'Current quarter');

        $this->assertDatabaseHas('workspace_settings', [
            'workspace_id' => $workspace->id,
        ]);
    }

    public function test_member_and_viewer_cannot_modify_settings_even_with_custom_permission(): void
    {
        $owner = $this->createUser('Permission Owner', 'permission-owner@example.com');
        $workspace = Workspace::createWithInitialOwner($owner, [
            'name' => 'Permission Workspace',
            'slug' => 'permission-workspace',
        ]);
        $member = $this->createUser('Permission Member', 'permission-member@example.com', WorkspaceUser::ROLE_MEMBER, $workspace);
        $viewer = $this->createUser('Permission Viewer', 'permission-viewer@example.com', WorkspaceUser::ROLE_VIEWER, $workspace);
        WorkspaceUser::query()->where('user_id', $member->id)->update([
            'custom_permissions' => json_encode(['settings.update']),
        ]);

        foreach ([$member, $viewer] as $user) {
            $this->actingAs($user)->patchJson("/api/workspaces/{$workspace->id}/settings", [
                'settings' => ['general' => ['currency' => 'USD']],
            ])->assertForbidden();
        }

        $settings = app(TenantContext::class)->runInContext($workspace, fn () => $workspace->settings()->first()->settings);
        $this->assertSame([], $settings);
    }

    public function test_workspace_settings_validation_rejects_unknown_and_invalid_fields(): void
    {
        $owner = $this->createUser('Validation Owner', 'validation-owner@example.com');
        $workspace = Workspace::createWithInitialOwner($owner, [
            'name' => 'Validation Workspace',
            'slug' => 'validation-workspace',
        ]);

        $this->actingAs($owner)->patchJson("/api/workspaces/{$workspace->id}/settings", [
            'workspace_id' => 'another-workspace-id',
            'settings' => [
                'general' => ['currency' => 'BTC'],
                'unknownSection' => ['privileged' => true],
            ],
        ])->assertUnprocessable()
            ->assertJsonValidationErrors(['settings', 'workspace_id']);

        $this->actingAs($owner)->patchJson("/api/workspaces/{$workspace->id}/settings", [
            'settings' => ['notifications' => ['taskUpdates' => 'sometimes']],
        ])->assertUnprocessable()
            ->assertJsonValidationErrors(['settings.notifications.taskUpdates']);
    }

    public function test_non_member_cannot_read_or_write_another_workspaces_settings(): void
    {
        $owner = $this->createUser('Tenant Owner', 'tenant-owner@example.com');
        $workspace = Workspace::createWithInitialOwner($owner, [
            'name' => 'Tenant Workspace',
            'slug' => 'tenant-workspace',
        ]);
        $outsider = $this->createUser('Outsider', 'tenant-outsider@example.com');

        $this->actingAs($outsider)->getJson("/api/workspaces/{$workspace->id}/settings")->assertForbidden();
        $this->actingAs($outsider)->patchJson("/api/workspaces/{$workspace->id}/settings", [
            'settings' => ['general' => ['currency' => 'USD']],
        ])->assertForbidden();

        $settings = app(TenantContext::class)->runInContext($workspace, fn () => $workspace->settings()->first()->settings);
        $this->assertSame([], $settings);
    }
}
