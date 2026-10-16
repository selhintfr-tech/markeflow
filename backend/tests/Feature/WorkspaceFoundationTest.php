<?php

namespace Tests\Feature;

use App\Exceptions\CannotRemoveLastOwnerException;
use App\Exceptions\InvalidInvitationException;
use App\Exceptions\MissingTenantContextException;
use App\Exceptions\TenantMismatchException;
use App\Exceptions\UnauthorizedWorkspaceActionException;
use App\Models\User;
use App\Models\Workspace;
use App\Models\WorkspaceAuditLog;
use App\Models\WorkspaceInvitation;
use App\Models\WorkspaceSetting;
use App\Models\WorkspaceUser;
use App\Policies\WorkspacePolicy;
use App\Security\WorkspacePermission;
use App\Services\TenantContext;
use App\Services\WorkspaceAuthorizationService;
use App\Services\WorkspaceInvitationService;
use App\Services\WorkspaceMemberService;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\TestCase;

class WorkspaceFoundationTest extends TestCase
{
    use RefreshDatabase;

    protected TenantContext $tenantContext;

    protected WorkspaceAuthorizationService $authorizationService;

    protected WorkspaceInvitationService $invitationService;

    protected WorkspaceMemberService $memberService;

    protected WorkspacePolicy $workspacePolicy;

    protected function setUp(): void
    {
        parent::setUp();

        $this->tenantContext = app(TenantContext::class);
        $this->authorizationService = app(WorkspaceAuthorizationService::class);
        $this->invitationService = app(WorkspaceInvitationService::class);
        $this->memberService = app(WorkspaceMemberService::class);
        $this->workspacePolicy = app(WorkspacePolicy::class);
    }

    public function test_workspace_creation_with_owner_membership_generates_uuid_and_initializes_settings_and_audit(): void
    {
        $owner = User::create([
            'name' => 'Owner User',
            'email' => 'owner@example.com',
            'password' => 'secret123',
        ]);

        $workspace = Workspace::createWithInitialOwner($owner, [
            'name' => 'MarketFlow Headquarters',
            'slug' => 'marketflow-hq',
            'business_type' => Workspace::TYPE_AGENCY,
        ]);

        // 1. Verify UUID primary key
        $this->assertNotEmpty($workspace->id);
        $this->assertMatchesRegularExpression(
            '/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i',
            $workspace->id
        );

        // 2. Verify initial owner membership
        $this->assertSame(1, $workspace->members()->count());
        $membership = $workspace->members()->first();
        $this->assertNotNull($membership);
        $this->assertSame($owner->id, $membership->user_id);
        $this->assertSame(WorkspaceUser::ROLE_OWNER, $membership->role);
        $this->assertTrue($membership->isOwner());

        // 3. Verify 1:1 settings initialization within tenant context
        $settings = $this->tenantContext->runInContext($workspace, function () use ($workspace) {
            return $workspace->settings()->first();
        });
        $this->assertNotNull($settings);
        $this->assertSame($workspace->id, $settings->workspace_id);
        $this->assertSame([], $settings->settings);

        // 4. Verify immutable audit log
        $auditLog = $this->tenantContext->runInContext($workspace, function () use ($workspace) {
            return $workspace->auditLogs()->first();
        });
        $this->assertNotNull($auditLog);
        $this->assertSame('workspace.created', $auditLog->action);
        $this->assertSame($owner->id, $auditLog->user_id);
        $this->assertSame($workspace->id, $auditLog->entity_id);
    }

    public function test_workspace_membership_and_role_authorization_via_policy_and_service(): void
    {
        $owner = User::create(['name' => 'Owner', 'email' => 'owner2@example.com', 'password' => 'password']);
        $admin = User::create(['name' => 'Admin', 'email' => 'admin@example.com', 'password' => 'password']);
        $member = User::create(['name' => 'Member', 'email' => 'member@example.com', 'password' => 'password']);
        $viewer = User::create(['name' => 'Viewer', 'email' => 'viewer@example.com', 'password' => 'password']);

        $workspace = Workspace::createWithInitialOwner($owner, [
            'name' => 'Auth Workspace',
            'slug' => 'auth-workspace',
        ]);

        WorkspaceUser::create(['workspace_id' => $workspace->id, 'user_id' => $admin->id, 'role' => WorkspaceUser::ROLE_ADMIN]);
        WorkspaceUser::create(['workspace_id' => $workspace->id, 'user_id' => $member->id, 'role' => WorkspaceUser::ROLE_MEMBER]);
        WorkspaceUser::create(['workspace_id' => $workspace->id, 'user_id' => $viewer->id, 'role' => WorkspaceUser::ROLE_VIEWER]);

        // Policy checks: Owner
        $this->assertTrue($this->workspacePolicy->view($owner, $workspace));
        $this->assertTrue($this->workspacePolicy->update($owner, $workspace));
        $this->assertTrue($this->workspacePolicy->delete($owner, $workspace));
        $this->assertTrue($this->workspacePolicy->manageSettings($owner, $workspace));
        $this->assertTrue($this->workspacePolicy->inviteMembers($owner, $workspace));

        // Policy checks: Admin
        $this->assertTrue($this->workspacePolicy->view($admin, $workspace));
        $this->assertTrue($this->workspacePolicy->update($admin, $workspace));
        $this->assertFalse($this->workspacePolicy->delete($admin, $workspace)); // Admin cannot delete
        $this->assertTrue($this->workspacePolicy->manageSettings($admin, $workspace));
        $this->assertTrue($this->workspacePolicy->inviteMembers($admin, $workspace));

        // Policy checks: Member
        $this->assertTrue($this->workspacePolicy->view($member, $workspace));
        $this->assertFalse($this->workspacePolicy->update($member, $workspace));
        $this->assertFalse($this->workspacePolicy->delete($member, $workspace));
        $this->assertFalse($this->workspacePolicy->manageSettings($member, $workspace));
        $this->assertFalse($this->workspacePolicy->inviteMembers($member, $workspace));

        // Policy checks: Viewer
        $this->assertTrue($this->workspacePolicy->view($viewer, $workspace));
        $this->assertFalse($this->workspacePolicy->update($viewer, $workspace));
        $this->assertFalse($this->workspacePolicy->delete($viewer, $workspace));
        $this->assertFalse($this->workspacePolicy->manageSettings($viewer, $workspace));
        $this->assertFalse($this->workspacePolicy->inviteMembers($viewer, $workspace));

        // Direct Service Authorization checks
        $this->expectException(UnauthorizedWorkspaceActionException::class);
        $this->authorizationService->authorize($member, $workspace, WorkspacePermission::WORKSPACE_DELETE);
    }

    public function test_unauthorized_access_and_missing_tenant_context_protection(): void
    {
        $owner = User::create(['name' => 'Owner', 'email' => 'owner3@example.com', 'password' => 'password']);
        Workspace::createWithInitialOwner($owner, ['name' => 'Context WS', 'slug' => 'context-ws']);

        $this->tenantContext->clear();

        // 1. Unscoped read fails closed: returns null/0 records
        $this->assertNull(WorkspaceSetting::query()->first());
        $this->assertSame(0, WorkspaceSetting::query()->count());

        // 2. Unscoped write throws MissingTenantContextException
        $this->expectException(MissingTenantContextException::class);
        WorkspaceSetting::create(['settings' => []]);
    }

    public function test_cross_workspace_read_and_write_isolation(): void
    {
        $owner1 = User::create(['name' => 'Owner 1', 'email' => 'owner1@example.com', 'password' => 'password']);
        $owner2 = User::create(['name' => 'Owner 2', 'email' => 'owner2@example.com', 'password' => 'password']);

        $ws1 = Workspace::createWithInitialOwner($owner1, ['name' => 'Workspace One', 'slug' => 'ws-one']);
        $ws2 = Workspace::createWithInitialOwner($owner2, ['name' => 'Workspace Two', 'slug' => 'ws-two']);

        // Set setting in WS1
        $this->tenantContext->runInContext($ws1, function () {
            $setting = WorkspaceSetting::query()->first();
            $setting->set('theme', 'dark');
            $setting->save();
        });

        // Query in WS2: WS1 setting must not be visible
        $this->tenantContext->runInContext($ws2, function () use ($ws2) {
            $setting = WorkspaceSetting::query()->first();
            $this->assertNotNull($setting);
            $this->assertSame($ws2->id, $setting->workspace_id);
            $this->assertNull($setting->get('theme')); // WS2 has no 'theme' set
        });

        // Cross-workspace insert mismatch fails
        $this->tenantContext->runInContext($ws1, function () use ($ws2) {
            $this->expectException(TenantMismatchException::class);
            WorkspaceSetting::query()->insert([
                'id' => (string) Str::uuid(),
                'workspace_id' => $ws2->id,
                'settings' => json_encode(['theme' => 'blue']),
            ]);
        });
    }

    public function test_workspace_switching_and_tenant_context_cleanup(): void
    {
        $owner = User::create(['name' => 'Owner', 'email' => 'switcher@example.com', 'password' => 'password']);
        $ws1 = Workspace::createWithInitialOwner($owner, ['name' => 'Switch 1', 'slug' => 'switch-1']);
        $ws2 = Workspace::createWithInitialOwner($owner, ['name' => 'Switch 2', 'slug' => 'switch-2']);

        $this->tenantContext->setWorkspace($ws1);
        $this->assertSame($ws1->id, $this->tenantContext->getWorkspaceId());

        $this->tenantContext->setWorkspace($ws2);
        $this->assertSame($ws2->id, $this->tenantContext->getWorkspaceId());

        $this->tenantContext->clear();
        $this->assertNull($this->tenantContext->getWorkspaceId());

        // Context cleans up after exception in runInContext
        try {
            $this->tenantContext->runInContext($ws1, function () {
                throw new \RuntimeException('Intentional error');
            });
        } catch (\RuntimeException) {
            // expected
        }

        $this->assertNull($this->tenantContext->getWorkspaceId());
    }

    public function test_last_owner_protection_on_demote_and_remove(): void
    {
        $owner = User::create(['name' => 'Sole Owner', 'email' => 'sole@example.com', 'password' => 'password']);
        $admin = User::create(['name' => 'Admin User', 'email' => 'admin_last@example.com', 'password' => 'password']);

        $workspace = Workspace::createWithInitialOwner($owner, ['name' => 'Last Owner WS', 'slug' => 'last-owner-ws']);
        $ownerMembership = $workspace->members()->where('user_id', $owner->id)->first();

        // 1. Demoting the sole owner throws CannotRemoveLastOwnerException
        $caughtDemote = false;
        try {
            $this->memberService->updateRole($owner, $workspace, $ownerMembership, WorkspaceUser::ROLE_ADMIN);
        } catch (CannotRemoveLastOwnerException) {
            $caughtDemote = true;
        }
        $this->assertTrue($caughtDemote, 'Sole owner cannot be demoted to admin');

        // 2. Removing the sole owner throws CannotRemoveLastOwnerException
        $caughtRemove = false;
        try {
            $this->memberService->removeMember($owner, $workspace, $ownerMembership);
        } catch (CannotRemoveLastOwnerException) {
            $caughtRemove = true;
        }
        $this->assertTrue($caughtRemove, 'Sole owner cannot be removed from workspace');

        // 3. Promote admin to co-owner
        $adminMembership = WorkspaceUser::create([
            'workspace_id' => $workspace->id,
            'user_id' => $admin->id,
            'role' => WorkspaceUser::ROLE_MEMBER,
        ]);
        $this->memberService->updateRole($owner, $workspace, $adminMembership, WorkspaceUser::ROLE_OWNER);

        // 4. Now that 2 owners exist, demoting first owner succeeds
        $updatedMembership = $this->memberService->updateRole($owner, $workspace, $ownerMembership, WorkspaceUser::ROLE_ADMIN);
        $this->assertSame(WorkspaceUser::ROLE_ADMIN, $updatedMembership->role);
        $this->assertSame(1, $workspace->members()->where('role', WorkspaceUser::ROLE_OWNER)->count());
    }

    public function test_invitation_lifecycle_secure_tokens_expiration_and_single_use(): void
    {
        $owner = User::create(['name' => 'Inviter', 'email' => 'inviter@example.com', 'password' => 'password']);
        $invitee = User::create(['name' => 'Invitee', 'email' => 'invitee@example.com', 'password' => 'password']);

        $workspace = Workspace::createWithInitialOwner($owner, ['name' => 'Invite WS', 'slug' => 'invite-ws']);

        // 1. Create invitation
        $result = $this->invitationService->invite($owner, $workspace, 'invitee@example.com', WorkspaceUser::ROLE_MEMBER);
        $plainToken = $result['plain_token'];
        /** @var WorkspaceInvitation $invitation */
        $invitation = $result['invitation'];

        $this->assertSame(64, strlen($plainToken)); // 256-bit entropy (64 hex characters)
        $this->assertSame(hash('sha256', $plainToken), $invitation->token_hash);
        $this->assertArrayNotHasKey('token_hash', $invitation->toArray()); // Hidden from serialization

        // 2. Expired invitation test
        $this->tenantContext->runInContext($workspace, function () use ($invitation) {
            $invitation->expires_at = Carbon::now()->subMinute();
            $invitation->save();
        });

        $caughtExpired = false;
        try {
            $this->invitationService->accept($plainToken, $invitee);
        } catch (InvalidInvitationException $e) {
            $caughtExpired = true;
            $this->assertStringContainsString('expired', $e->getMessage());
        }
        $this->assertTrue($caughtExpired, 'Accepting expired invitation throws InvalidInvitationException');

        // 3. Reset expiration and accept
        $this->tenantContext->runInContext($workspace, function () use ($invitation) {
            $invitation->expires_at = Carbon::now()->addDays(7);
            $invitation->save();
        });

        $membership = $this->invitationService->accept($plainToken, $invitee);
        $this->assertInstanceOf(WorkspaceUser::class, $membership);
        $this->assertSame($invitee->id, $membership->user_id);
        $this->assertSame(WorkspaceUser::ROLE_MEMBER, $membership->role);

        // Verify single-use: second acceptance fails
        $caughtSingleUse = false;
        try {
            $this->invitationService->accept($plainToken, $invitee);
        } catch (InvalidInvitationException $e) {
            $caughtSingleUse = true;
            $this->assertStringContainsString('already been accepted', $e->getMessage());
        }
        $this->assertTrue($caughtSingleUse, 'Re-accepting consumed invitation throws InvalidInvitationException');
    }

    public function test_invitation_intended_email_identity_verification(): void
    {
        $owner = User::create(['name' => 'Inviter', 'email' => 'inviter2@example.com', 'password' => 'password']);
        $alice = User::create(['name' => 'Alice', 'email' => 'alice@example.com', 'password' => 'password']);
        $bob = User::create(['name' => 'Bob', 'email' => 'bob@example.com', 'password' => 'password']);

        $workspace = Workspace::createWithInitialOwner($owner, ['name' => 'Identity WS', 'slug' => 'identity-ws']);

        $result = $this->invitationService->invite($owner, $workspace, 'alice@example.com', WorkspaceUser::ROLE_MEMBER);
        $plainToken = $result['plain_token'];

        // Bob tries to accept Alice's invitation token
        $caughtMismatch = false;
        try {
            $this->invitationService->accept($plainToken, $bob);
        } catch (InvalidInvitationException $e) {
            $caughtMismatch = true;
            $this->assertStringContainsString('alice@example.com', $e->getMessage());
            $this->assertStringContainsString('bob@example.com', $e->getMessage());
        }
        $this->assertTrue($caughtMismatch, 'User cannot accept an invitation intended for another email');

        // Alice accepts successfully (case-insensitive test)
        $alice->email = 'ALICE@EXAMPLE.COM';
        $membership = $this->invitationService->accept($plainToken, $alice);
        $this->assertNotNull($membership);
        $this->assertSame($alice->id, $membership->user_id);
    }

    public function test_safe_existing_membership_invitation_handling(): void
    {
        $owner = User::create(['name' => 'Inviter', 'email' => 'inviter3@example.com', 'password' => 'password']);
        $charlie = User::create(['name' => 'Charlie', 'email' => 'charlie@example.com', 'password' => 'password']);

        $workspace = Workspace::createWithInitialOwner($owner, ['name' => 'Duplicate WS', 'slug' => 'duplicate-ws']);

        // Already invited and joined earlier
        $existingMembership = WorkspaceUser::create([
            'workspace_id' => $workspace->id,
            'user_id' => $charlie->id,
            'role' => WorkspaceUser::ROLE_VIEWER,
        ]);

        // Manually create invitation for existing user within context
        $plainToken = bin2hex(random_bytes(32));
        $invitation = $this->tenantContext->runInContext($workspace, function () use ($workspace, $plainToken, $owner) {
            return WorkspaceInvitation::create([
                'workspace_id' => $workspace->id,
                'email' => 'charlie@example.com',
                'role' => WorkspaceUser::ROLE_MEMBER,
                'token_hash' => hash('sha256', $plainToken),
                'invited_by' => $owner->id,
                'expires_at' => Carbon::now()->addDays(7),
            ]);
        });

        // Accept handles gracefully: marks accepted and returns existing membership without DB unique constraint error
        $membership = $this->invitationService->accept($plainToken, $charlie);
        $this->assertSame($existingMembership->id, $membership->id);

        $freshInvitation = $this->tenantContext->runInContext($workspace, function () use ($invitation) {
            return $invitation->fresh();
        });
        $this->assertNotNull($freshInvitation->accepted_at);
    }

    public function test_workspace_settings_isolation_and_dot_notation(): void
    {
        $owner = User::create(['name' => 'Owner', 'email' => 'settings_owner@example.com', 'password' => 'password']);
        $workspace = Workspace::createWithInitialOwner($owner, ['name' => 'Settings WS', 'slug' => 'settings-ws']);

        $this->tenantContext->runInContext($workspace, function () {
            /** @var WorkspaceSetting $setting */
            $setting = WorkspaceSetting::query()->first();
            $setting->set('branding.colors.primary', '#4F46E5');
            $setting->set('features.crm.enabled', true);
            $setting->save();

            $fresh = WorkspaceSetting::query()->first();
            $this->assertSame('#4F46E5', $fresh->get('branding.colors.primary'));
            $this->assertTrue($fresh->get('features.crm.enabled'));
            $this->assertSame('default_val', $fresh->get('non_existent.key', 'default_val'));
        });
    }

    public function test_audit_log_payload_sanitization_prevents_leaking_sensitive_tokens(): void
    {
        $owner = User::create(['name' => 'Owner', 'email' => 'audit_owner@example.com', 'password' => 'password']);
        $workspace = Workspace::createWithInitialOwner($owner, ['name' => 'Audit WS', 'slug' => 'audit-ws']);

        $sensitivePayload = [
            'username' => 'testuser',
            'password' => 'SuperSecretP@ssword123',
            'token' => 'raw_auth_token_value',
            'plain_token' => 'plain_invitation_token',
            'nested' => [
                'api_key' => 'secret_api_key_value',
                'description' => 'safe description',
            ],
        ];

        $log = WorkspaceAuditLog::log(
            $workspace,
            'test.sensitive_action',
            'Security',
            'sec-1',
            $sensitivePayload,
            $owner->id
        );

        $payload = $this->tenantContext->runInContext($workspace, function () use ($log) {
            return $log->fresh()->payload;
        });

        $this->assertSame('testuser', $payload['username']);
        $this->assertSame('[REDACTED]', $payload['password']);
        $this->assertSame('[REDACTED]', $payload['token']);
        $this->assertSame('[REDACTED]', $payload['plain_token']);
        $this->assertSame('[REDACTED]', $payload['nested']['api_key']);
        $this->assertSame('safe description', $payload['nested']['description']);
    }
}
