<?php

namespace Tests\Feature\Api;

use App\Http\Controllers\Api\ArchiveController;
use App\Http\Middleware\EnsureTenantContext;
use App\Http\Middleware\SetTenantContext;
use App\Models\Project;
use App\Models\User;
use App\Models\Workspace;
use App\Models\WorkspaceUser;
use App\Services\TenantContext;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Route;
use Tests\TestCase;

class ArchiveApiTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        app(TenantContext::class)->clear();

        Route::middleware(['auth', SetTenantContext::class, EnsureTenantContext::class])
            ->prefix('test-api/archive')
            ->group(function (): void {
                Route::get('/', [ArchiveController::class, 'index']);
                Route::post('/{type}/{record}', [ArchiveController::class, 'archive']);
                Route::post('/{type}/{record}/restore', [ArchiveController::class, 'restore']);
            });
    }

    public function test_archiving_and_restoring_a_project_preserves_its_previous_status(): void
    {
        $owner = $this->createUser('archive-owner@example.test');
        $workspace = $this->createWorkspace($owner);
        $project = $this->createProject($workspace, $owner, 'Restorable project', Project::STATUS_DRAFT);

        $this->actingAs($owner)->withHeader('X-Workspace-Id', $workspace->id)
            ->postJson('/test-api/archive/Project/'.$project->id)
            ->assertCreated();
        $this->assertSame(Project::STATUS_ARCHIVED, $project->fresh()->status);

        $this->getJson('/test-api/archive/')
            ->assertOk()
            ->assertJsonPath('data.0.recordId', $project->id)
            ->assertJsonPath('data.0.previousStatus', Project::STATUS_DRAFT);

        $this->postJson('/test-api/archive/Project/'.$project->id.'/restore')
            ->assertOk()
            ->assertJsonPath('data.status', Project::STATUS_DRAFT);
        $this->assertSame(Project::STATUS_DRAFT, $project->fresh()->status);
    }

    public function test_archive_is_workspace_scoped_and_viewers_cannot_restore(): void
    {
        $owner = $this->createUser('archive-owner-2@example.test');
        $viewer = $this->createUser('archive-viewer@example.test');
        $otherOwner = $this->createUser('archive-other@example.test');
        $workspace = $this->createWorkspace($owner);
        $otherWorkspace = $this->createWorkspace($otherOwner);
        WorkspaceUser::create([
            'workspace_id' => $workspace->id,
            'user_id' => $viewer->id,
            'role' => WorkspaceUser::ROLE_VIEWER,
        ]);
        $foreignProject = $this->createProject($otherWorkspace, $otherOwner, 'Private archived project', Project::STATUS_ARCHIVED);

        $this->actingAs($owner)->withHeader('X-Workspace-Id', $workspace->id)
            ->getJson('/test-api/archive/')
            ->assertOk()
            ->assertJsonCount(0, 'data');

        $this->actingAs($viewer)->withHeader('X-Workspace-Id', $otherWorkspace->id)
            ->postJson('/test-api/archive/Project/'.$foreignProject->id.'/restore')
            ->assertForbidden();

        $this->actingAs($owner)->withHeader('X-Workspace-Id', $workspace->id)
            ->postJson('/test-api/archive/Project/'.$foreignProject->id.'/restore')
            ->assertNotFound();

        $this->assertSame(Project::STATUS_ARCHIVED, $foreignProject->fresh()->status);
    }

    private function createUser(string $email): User
    {
        return User::create(['name' => 'Archive User', 'email' => $email, 'password' => 'password']);
    }

    private function createWorkspace(User $owner): Workspace
    {
        return Workspace::createWithInitialOwner($owner, [
            'name' => 'Archive workspace '.$owner->id,
            'slug' => 'archive-workspace-'.$owner->id,
        ]);
    }

    private function createProject(Workspace $workspace, User $owner, string $name, string $status): Project
    {
        return app(TenantContext::class)->runInContext($workspace, function () use ($owner, $name, $status): Project {
            $project = new Project([
                'name' => $name,
                'status' => $status,
                'start_date' => '2026-10-01',
                'end_date' => '2026-11-01',
            ]);
            $project->owner_id = $owner->id;
            $project->save();

            return $project;
        });
    }
}