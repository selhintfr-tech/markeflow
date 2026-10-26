<?php

namespace Tests\Feature\Api;

use App\Models\Campaign;
use App\Models\ContentPost;
use App\Models\ContentPostAttachment;
use App\Models\Project;
use App\Models\User;
use App\Models\Workspace;
use App\Models\WorkspaceUser;
use App\Services\TenantContext;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class ContentCalendarApiTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('local');
        Route::prefix('api')->group(base_path('routes/content.php'));
    }

    public function test_member_can_create_filter_approve_schedule_and_manage_private_attachments(): void
    {
        $owner = $this->createUser('content-owner@example.test');
        $workspace = $this->createWorkspace($owner);
        $campaign = $this->createCampaign($workspace, $owner);
        $editor = $this->createUser('content-editor@example.test');
        WorkspaceUser::create([
            'workspace_id' => $workspace->id,
            'user_id' => $editor->id,
            'role' => WorkspaceUser::ROLE_MEMBER,
        ]);
        $scheduledAt = '2026-10-28T10:30:00+01:00';

        $created = $this->actingAs($owner)
            ->withHeader('X-Workspace-Id', $workspace->id)
            ->postJson('/api/content/posts', [
                'title' => 'Autumn collection announcement',
                'platform' => 'Instagram',
                'content_type' => 'Carousel',
                'caption' => 'New season, new arrivals.',
                'internal_notes' => 'Use the approved autumn product photography.',
                'campaign_id' => $campaign->id,
                'assigned_to' => $editor->id,
                'timezone' => 'Africa/Casablanca',
            ])
            ->assertCreated()
            ->assertJsonPath('data.status', ContentPost::STATUS_DRAFT)
            ->assertJsonPath('data.content_type', 'Carousel')
            ->assertJsonPath('data.internal_notes', 'Use the approved autumn product photography.')
            ->assertJsonPath('data.campaign.id', $campaign->id)
            ->assertJsonPath('data.assignee.id', $editor->id);
        $postId = $created->json('data.id');

        $this->patchJson('/api/content/posts/'.$postId, ['status' => ContentPost::STATUS_APPROVED])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['status']);

        $this->patchJson('/api/content/posts/'.$postId, ['status' => ContentPost::STATUS_IN_REVIEW])
            ->assertOk()
            ->assertJsonPath('data.status', ContentPost::STATUS_IN_REVIEW);
        $this->actingAs($editor)
            ->patchJson('/api/content/posts/'.$postId, ['status' => ContentPost::STATUS_APPROVED])
            ->assertForbidden();
        $this->actingAs($owner);
        $this->patchJson('/api/content/posts/'.$postId, ['status' => ContentPost::STATUS_APPROVED])
            ->assertOk()
            ->assertJsonPath('data.approved_by', $owner->id);
        $this->patchJson('/api/content/posts/'.$postId, [
            'status' => ContentPost::STATUS_SCHEDULED,
            'scheduled_at' => $scheduledAt,
            'content_type' => 'Carousel',
            'internal_notes' => 'Final crop approved by the campaign owner.',
        ])
            ->assertOk()
            ->assertJsonPath('data.status', ContentPost::STATUS_SCHEDULED)
            ->assertJsonPath('data.content_type', 'Carousel')
            ->assertJsonPath('data.internal_notes', 'Final crop approved by the campaign owner.')
            ->assertJsonPath('data.scheduled_at', '2026-10-28T09:30:00+00:00');
        $this->patchJson('/api/content/posts/'.$postId, ['scheduled_at' => null])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['scheduled_at']);

        $this->getJson('/api/content/posts?platform=Instagram&status=Scheduled&campaign_id='.$campaign->id.'&assigned_to='.$editor->id)
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $postId);
        $this->getJson('/api/content/posts?from=2026-10-28T00:00:00Z&to=2026-10-29T00:00:00Z')
            ->assertOk()
            ->assertJsonCount(1, 'data');

        $attachment = $this->post('/api/content/posts/'.$postId.'/attachments', [
            'attachment' => UploadedFile::fake()->create('creative.png', 100, 'image/png'),
        ], ['X-Workspace-Id' => $workspace->id])
            ->assertCreated()
            ->assertJsonPath('data.original_name', 'creative.png');
        $attachmentId = $attachment->json('data.id');
        $storedAttachment = app(TenantContext::class)->runInContext(
            $workspace,
            fn () => ContentPostAttachment::query()->findOrFail($attachmentId)
        );
        Storage::disk('local')->assertExists($storedAttachment->storage_path);

        $this->get('/api/content/posts/'.$postId.'/attachments/'.$attachmentId, [
            'X-Workspace-Id' => $workspace->id,
            'Accept' => 'application/octet-stream',
        ])->assertOk();

        $this->deleteJson('/api/content/posts/'.$postId.'/attachments/'.$attachmentId)
            ->assertOk();
        $this->assertDatabaseMissing('content_post_attachments', ['id' => $attachmentId]);
        Storage::disk('local')->assertMissing($storedAttachment->storage_path);
    }

    public function test_content_posts_and_attachments_are_isolated_and_viewers_cannot_write(): void
    {
        $this->getJson('/api/content/posts')->assertUnauthorized();

        $owner = $this->createUser('content-isolation-owner@example.test');
        $workspace = $this->createWorkspace($owner);
        $viewer = $this->createUser('content-viewer@example.test');
        WorkspaceUser::create([
            'workspace_id' => $workspace->id,
            'user_id' => $viewer->id,
            'role' => WorkspaceUser::ROLE_VIEWER,
        ]);
        $foreignOwner = $this->createUser('content-foreign-owner@example.test');
        $foreignWorkspace = $this->createWorkspace($foreignOwner);
        $foreignPost = app(TenantContext::class)->runInContext($foreignWorkspace, function () use ($foreignWorkspace, $foreignOwner): ContentPost {
            $post = new ContentPost([
                'title' => 'Private foreign post',
                'platform' => 'LinkedIn',
                'timezone' => 'UTC',
            ]);
            $post->workspace_id = $foreignWorkspace->id;
            $post->created_by = $foreignOwner->id;
            $post->status = ContentPost::STATUS_DRAFT;
            $post->save();

            return $post;
        });

        $this->actingAs($owner)
            ->getJson('/api/content/posts')
            ->assertForbidden();

        $this->actingAs($viewer)
            ->withHeader('X-Workspace-Id', $workspace->id)
            ->getJson('/api/content/posts')
            ->assertOk()
            ->assertJsonCount(0, 'data');

        $this->postJson('/api/content/posts', [
            'title' => 'Forbidden post',
            'platform' => 'Instagram',
            'timezone' => 'UTC',
        ])->assertForbidden();

        $this->actingAs($owner)
            ->withHeader('X-Workspace-Id', $workspace->id)
            ->getJson('/api/content/posts/'.$foreignPost->id)
            ->assertNotFound();

        $this->postJson('/api/content/posts', [
            'title' => 'Forged assignment',
            'platform' => 'Instagram',
            'assigned_to' => $foreignOwner->id,
            'timezone' => 'UTC',
            'workspace_id' => $foreignWorkspace->id,
        ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['assigned_to', 'workspace_id']);
    }

    private function createUser(string $email): User
    {
        return User::create(['name' => 'Content User', 'email' => $email, 'password' => 'password']);
    }

    private function createWorkspace(User $owner): Workspace
    {
        return Workspace::createWithInitialOwner($owner, [
            'name' => 'Content '.$owner->id,
            'slug' => 'content-'.$owner->id,
        ]);
    }

    private function createCampaign(Workspace $workspace, User $owner): Campaign
    {
        return app(TenantContext::class)->runInContext($workspace, function () use ($workspace, $owner): Campaign {
            $project = new Project([
                'name' => 'Content campaign project',
                'status' => Project::STATUS_ACTIVE,
                'start_date' => '2026-10-01',
                'end_date' => '2026-11-01',
            ]);
            $project->owner_id = $owner->id;
            $project->save();

            $campaign = new Campaign([
                'project_id' => $project->id,
                'name' => 'Autumn launch',
                'status' => Campaign::STATUS_ACTIVE,
                'platform' => Campaign::PLATFORM_META,
                'channel' => 'Organic social',
                'start_date' => '2026-10-01',
                'end_date' => '2026-11-01',
                'budget' => '100.00',
                'spend' => '0.00',
                'leads' => 0,
                'customers' => 0,
                'revenue' => '0.00',
            ]);
            $campaign->created_by = $owner->id;
            $campaign->workspace_id = $workspace->id;
            $campaign->save();

            return $campaign;
        });
    }
}
