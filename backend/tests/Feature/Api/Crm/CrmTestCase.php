<?php

namespace Tests\Feature\Api\Crm;

use App\Http\Middleware\EnsureTenantContext;
use App\Http\Middleware\SetTenantContext;
use App\Models\User;
use App\Models\Workspace;
use App\Models\WorkspaceUser;
use App\Services\TenantContext;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Route;
use Tests\TestCase;

abstract class CrmTestCase extends TestCase
{
    use RefreshDatabase;

    protected function migrateFreshUsing(): array
    {
        return [
            '--path' => realpath(dirname(__DIR__, 4).'/database/migrations'),
            '--realpath' => true,
        ];
    }

    protected function setUp(): void
    {
        parent::setUp();

        app(TenantContext::class)->clear();

        Route::middleware(['auth', SetTenantContext::class, EnsureTenantContext::class])
            ->prefix('api')
            ->group(function (): void {
                require dirname(__DIR__, 4).'/routes/crm.php';
            });
    }

    protected function createUser(string $email): User
    {
        return User::create([
            'name' => 'User '.explode('@', $email)[0],
            'email' => $email,
            'password' => 'password123',
        ]);
    }

    protected function createWorkspace(User $owner): Workspace
    {
        return Workspace::createWithInitialOwner($owner, [
            'name' => 'Workspace '.$owner->id,
            'slug' => 'workspace-'.$owner->id,
        ]);
    }

    protected function addMemberToWorkspace(Workspace $workspace, User $user, string $role): WorkspaceUser
    {
        return WorkspaceUser::create([
            'workspace_id' => $workspace->id,
            'user_id' => $user->id,
            'role' => $role,
        ]);
    }
}