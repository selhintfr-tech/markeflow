<?php

namespace Tests\Feature\Api;

use App\Http\Controllers\Api\TaskController;
use App\Http\Controllers\Api\WorkspaceNotificationController;
use App\Http\Middleware\EnsureTenantContext;
use App\Http\Middleware\SetTenantContext;
use App\Models\Task;
use App\Models\User;
use App\Models\Workspace;
use App\Models\WorkspaceNotification;
use App\Services\TenantContext;
use App\Services\WorkspaceNotificationService;
use Tests\Feature\Api\Crm\CrmTestCase;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\DB;

class NotificationsApiTest extends CrmTestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        Route::middleware(['auth', SetTenantContext::class, EnsureTenantContext::class])
            ->prefix('api/notifications-test')
            ->group(function (): void {
                Route::get('/', [WorkspaceNotificationController::class, 'index']);
                Route::get('/unread-count', [WorkspaceNotificationController::class, 'unreadCount']);
                Route::post('/read-all', [WorkspaceNotificationController::class, 'markAllAsRead']);
                Route::patch('/{notification}/read', [WorkspaceNotificationController::class, 'markAsRead']);
            });

        Route::middleware(['auth', SetTenantContext::class, EnsureTenantContext::class])
            ->prefix('api/tasks-notification-test')
            ->group(function (): void {
                Route::put('/{task}', [TaskController::class, 'update']);
            });
    }

    public function test_lead_creation_notifies_only_members_of_its_workspace(): void
    {
        $owner = $this->createUser('notifications-owner@example.test');
        $workspace = $this->createWorkspace($owner);
        $member = $this->createUser('notifications-member@example.test');
        $this->addMemberToWorkspace($workspace, $member, 'member');
        $otherOwner = $this->createUser('notifications-other@example.test');
        $otherWorkspace = $this->createWorkspace($otherOwner);

        $lead = $this->actingAs($owner)
            ->withHeader('X-Workspace-Id', $workspace->id)
            ->postJson('/api/crm/leads', ['name' => 'Verified CRM lead'])
            ->assertCreated()
            ->json('data.id');

        $this->assertDatabaseCount('workspace_notifications', 2);
        $this->assertDatabaseHas('workspace_notifications', [
            'workspace_id' => $workspace->id,
            'user_id' => $owner->id,
            'event_key' => 'lead.created:'.$lead,
            'type' => 'lead',
        ]);
        $this->assertDatabaseHas('workspace_notifications', [
            'workspace_id' => $workspace->id,
            'user_id' => $member->id,
            'event_key' => 'lead.created:'.$lead,
        ]);

        $this->actingAs($otherOwner)
            ->withHeader('X-Workspace-Id', $otherWorkspace->id)
            ->getJson('/api/notifications-test/')
            ->assertOk()
            ->assertJsonCount(0, 'data');

        $this->actingAs($owner)
            ->withHeader('X-Workspace-Id', $otherWorkspace->id)
            ->getJson('/api/notifications-test/')
            ->assertForbidden();

        $this->assertSame($workspace->id, DB::table('crm_leads')->where('id', $lead)->value('workspace_id'));
    }

    public function test_task_completion_event_is_generated_once_on_transition(): void
    {
        $owner = $this->createUser('task-notifications-owner@example.test');
        $workspace = $this->createWorkspace($owner);
        $task = app(TenantContext::class)->runInContext($workspace, function () use ($owner): Task {
            $task = new Task([
                'title' => 'Persisted task',
                'status' => Task::STATUS_TO_DO,
                'due_date' => now()->addDay()->toDateString(),
            ]);
            $task->created_by = $owner->id;
            $task->save();

            return $task;
        });

        $this->actingAs($owner)
            ->withHeader('X-Workspace-Id', $workspace->id)
            ->putJson('/api/tasks-notification-test/'.$task->id, ['status' => Task::STATUS_COMPLETED])
            ->assertOk();

        $this->assertDatabaseHas('workspace_notifications', [
            'workspace_id' => $workspace->id,
            'user_id' => $owner->id,
            'type' => 'task',
            'title' => 'Task completed',
        ]);
        $this->assertDatabaseCount('workspace_notifications', 1);

        app(TenantContext::class)->runInContext($workspace, function () use ($task): void {
            app(WorkspaceNotificationService::class)->taskCompleted($task->fresh());
        });
        $this->assertDatabaseCount('workspace_notifications', 1);
    }

    public function test_read_states_and_counts_are_scoped_to_the_current_user_and_workspace(): void
    {
        $owner = $this->createUser('notification-read-owner@example.test');
        $workspace = $this->createWorkspace($owner);
        $member = $this->createUser('notification-read-member@example.test');
        $this->addMemberToWorkspace($workspace, $member, 'member');
        $foreignOwner = $this->createUser('notification-read-foreign@example.test');
        $foreignWorkspace = $this->createWorkspace($foreignOwner);

        $records = collect([$owner, $member])->map(fn (User $recipient, int $index) => WorkspaceNotification::create([
            'user_id' => $recipient->id,
            'workspace_id' => $workspace->id,
            'event_key' => 'test-event-'.$index,
            'type' => 'task',
            'title' => 'Task completed',
            'description' => 'A real test event.',
            'action_url' => '/tasks',
        ]));
        $foreignRecord = WorkspaceNotification::create([
            'user_id' => $foreignOwner->id,
            'workspace_id' => $foreignWorkspace->id,
            'event_key' => 'foreign-event',
            'type' => 'lead',
            'title' => 'New lead added',
            'description' => 'A separate workspace event.',
        ]);

        $this->actingAs($owner)
            ->withHeader('X-Workspace-Id', $workspace->id)
            ->getJson('/api/notifications-test/?per_page=1')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('meta.total', 1)
            ->assertJsonPath('meta.unread_count', 1);
        $this->getJson('/api/notifications-test/unread-count')
            ->assertOk()
            ->assertJsonPath('data.unread_count', 1);

        $this->patchJson('/api/notifications-test/'.$records[0]->id.'/read')
            ->assertOk()
            ->assertJsonPath('data.is_read', true);
        $this->getJson('/api/notifications-test/unread-count')
            ->assertOk()
            ->assertJsonPath('data.unread_count', 0);

        $this->patchJson('/api/notifications-test/'.$records[1]->id.'/read')->assertNotFound();
        $this->patchJson('/api/notifications-test/'.$foreignRecord->id.'/read')->assertNotFound();

        $ownerReadAt = $records[0]->fresh()->read_at;
        $this->actingAs($member)
            ->withHeader('X-Workspace-Id', $workspace->id)
            ->getJson('/api/notifications-test/unread-count')
            ->assertOk()
            ->assertJsonPath('data.unread_count', 1);
        $this->postJson('/api/notifications-test/read-all')->assertOk();
        $this->getJson('/api/notifications-test/')->assertJsonPath('meta.unread_count', 0);

        $this->assertEquals($ownerReadAt, $records[0]->fresh()->read_at);
    }

    public function test_notification_routes_require_authentication_and_workspace_context(): void
    {
        $this->getJson('/api/notifications-test/')->assertUnauthorized();

        $owner = $this->createUser('notification-auth-owner@example.test');
        $workspace = $this->createWorkspace($owner);
        $this->actingAs($owner)
            ->getJson('/api/notifications-test/')
            ->assertForbidden();
    }
}
