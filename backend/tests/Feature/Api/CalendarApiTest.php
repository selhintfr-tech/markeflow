<?php

namespace Tests\Feature\Api;

use App\Models\CalendarEvent;
use App\Models\Project;
use App\Models\User;
use App\Models\Workspace;
use App\Models\WorkspaceUser;
use App\Services\TenantContext;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Route;
use Tests\TestCase;

class CalendarApiTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        Route::prefix('api')->group(base_path('routes/calendar.php'));
    }

    public function test_owner_can_create_filter_update_and_delete_timezone_aware_events(): void
    {
        $owner = $this->createUser('calendar-owner@example.test');
        $workspace = $this->createWorkspace($owner);
        $project = $this->createProject($workspace, $owner);

        $created = $this->actingAs($owner)
            ->withHeader('X-Workspace-Id', $workspace->id)
            ->postJson('/api/calendar/events/', [
                'title' => 'Campaign launch',
                'description' => 'Launch day schedule.',
                'starts_at' => '2026-10-20T09:00:00-04:00',
                'ends_at' => '2026-10-20T10:00:00-04:00',
                'timezone' => 'America/New_York',
                'project_id' => $project->id,
            ])
            ->assertCreated()
            ->assertJsonPath('data.workspace_id', $workspace->id)
            ->assertJsonPath('data.created_by', $owner->id)
            ->assertJsonPath('data.project_id', $project->id)
            ->assertJsonPath('data.timezone', 'America/New_York');
        $eventId = $created->json('data.id');

        $this->getJson('/api/calendar/events?from=2026-10-20T00:00:00Z&to=2026-10-21T00:00:00Z')
            ->assertOk()
            ->assertJsonCount(1, 'data');

        $this->getJson('/api/calendar/events?from=2026-10-21T00:00:00Z&to=2026-10-22T00:00:00Z')
            ->assertOk()
            ->assertJsonCount(0, 'data');

        $this->patchJson('/api/calendar/events/'.$eventId, [
            'title' => 'Launch review',
        ])->assertOk()
            ->assertJsonPath('data.title', 'Launch review');

        $this->deleteJson('/api/calendar/events/'.$eventId)->assertOk();
        $this->assertDatabaseMissing('calendar_events', ['id' => $eventId]);
    }

    public function test_calendar_rejects_missing_offsets_inconsistent_times_and_forged_tenant(): void
    {
        $owner = $this->createUser('calendar-validation@example.test');
        $workspace = $this->createWorkspace($owner);

        $this->actingAs($owner)
            ->withHeader('X-Workspace-Id', $workspace->id)
            ->postJson('/api/calendar/events', [
                'title' => 'Invalid event',
                'starts_at' => '2026-10-20 09:00:00',
                'ends_at' => '2026-10-20T08:00:00Z',
                'timezone' => 'Not/A_Timezone',
                'workspace_id' => '00000000-0000-4000-8000-000000000000',
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['starts_at', 'ends_at', 'timezone', 'workspace_id']);
    }

    public function test_viewers_are_read_only_and_foreign_workspace_events_are_hidden(): void
    {
        $owner = $this->createUser('calendar-first-owner@example.test');
        $workspace = $this->createWorkspace($owner);
        $viewer = $this->createUser('calendar-viewer@example.test');
        WorkspaceUser::create([
            'workspace_id' => $workspace->id,
            'user_id' => $viewer->id,
            'role' => WorkspaceUser::ROLE_VIEWER,
        ]);
        $foreignOwner = $this->createUser('calendar-second-owner@example.test');
        $foreignWorkspace = $this->createWorkspace($foreignOwner);
        $foreignEvent = $this->createEvent($foreignWorkspace, $foreignOwner);

        $this->actingAs($viewer)
            ->withHeader('X-Workspace-Id', $workspace->id)
            ->getJson('/api/calendar/events/'.$foreignEvent->id)
            ->assertNotFound();
        $this->postJson('/api/calendar/events', [
            'title' => 'Denied',
            'starts_at' => '2026-10-20T09:00:00Z',
            'ends_at' => '2026-10-20T10:00:00Z',
            'timezone' => 'UTC',
        ])->assertForbidden();
    }

    public function test_project_links_must_belong_to_the_active_workspace(): void
    {
        $owner = $this->createUser('calendar-project-owner@example.test');
        $workspace = $this->createWorkspace($owner);
        $foreignOwner = $this->createUser('calendar-project-foreign@example.test');
        $foreignWorkspace = $this->createWorkspace($foreignOwner);
        $foreignProject = $this->createProject($foreignWorkspace, $foreignOwner);

        $payload = [
            'title' => 'Linked event',
            'starts_at' => '2026-10-20T09:00:00Z',
            'ends_at' => '2026-10-20T10:00:00Z',
            'timezone' => 'UTC',
            'project_id' => $foreignProject->id,
        ];

        $this->actingAs($owner)
            ->withHeader('X-Workspace-Id', $workspace->id)
            ->postJson('/api/calendar/events', $payload)
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['project_id']);
    }

    private function createUser(string $email): User
    {
        return User::create(['name' => 'Calendar User', 'email' => $email, 'password' => 'password']);
    }

    private function createWorkspace(User $owner): Workspace
    {
        return Workspace::createWithInitialOwner($owner, [
            'name' => 'Calendar '.$owner->id,
            'slug' => 'calendar-'.$owner->id,
        ]);
    }

    private function createEvent(Workspace $workspace, User $creator): CalendarEvent
    {
        return app(TenantContext::class)->runInContext($workspace, function () use ($creator): CalendarEvent {
            $event = new CalendarEvent([
                'title' => 'Private event',
                'starts_at' => '2026-10-20T09:00:00Z',
                'ends_at' => '2026-10-20T10:00:00Z',
                'timezone' => 'UTC',
            ]);
            $event->created_by = $creator->id;
            $event->save();

            return $event;
        });
    }

    private function createProject(Workspace $workspace, User $owner): Project
    {
        return app(TenantContext::class)->runInContext($workspace, function () use ($owner): Project {
            $project = new Project([
                'name' => 'Calendar project',
                'status' => Project::STATUS_ACTIVE,
                'start_date' => '2026-10-01',
                'end_date' => '2026-11-01',
            ]);
            $project->owner_id = $owner->id;
            $project->save();

            return $project;
        });
    }
}
