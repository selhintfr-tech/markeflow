<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\Api\ContentPostAttachmentResource;
use App\Http\Resources\Api\ContentPostResource;
use App\Models\ContentPost;
use App\Models\ContentPostAttachment;
use App\Models\WorkspaceAuditLog;
use App\Models\WorkspaceUser;
use App\Services\TenantContext;
use App\Services\WorkspaceModuleAccessService;
use Carbon\CarbonImmutable;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ContentPostController extends Controller
{
    private const TRANSITIONS = [
        ContentPost::STATUS_DRAFT => [ContentPost::STATUS_IN_REVIEW],
        ContentPost::STATUS_IN_REVIEW => [ContentPost::STATUS_DRAFT, ContentPost::STATUS_APPROVED],
        ContentPost::STATUS_APPROVED => [ContentPost::STATUS_IN_REVIEW, ContentPost::STATUS_SCHEDULED],
        ContentPost::STATUS_SCHEDULED => [ContentPost::STATUS_APPROVED],
    ];

    public function __construct(
        private readonly TenantContext $tenantContext,
        private readonly WorkspaceModuleAccessService $access,
    ) {}

    public function index(Request $request)
    {
        $this->access->authorize($request->user());
        $workspaceId = $this->tenantContext->getWorkspaceId();
        $filters = $request->validate([
            'from' => ['sometimes', 'date'],
            'to' => ['sometimes', 'date', 'after_or_equal:from'],
            'search' => ['sometimes', 'string', 'max:255'],
            'platform' => ['sometimes', Rule::in(ContentPost::PLATFORMS)],
            'status' => ['sometimes', Rule::in(ContentPost::STATUSES)],
            'campaign_id' => ['sometimes', 'uuid', Rule::exists('campaigns', 'id')->where('workspace_id', $workspaceId)],
            'assigned_to' => ['sometimes', 'integer', Rule::exists('workspace_users', 'user_id')->where('workspace_id', $workspaceId)],
            'per_page' => ['sometimes', 'integer', 'between:1,100'],
            'page' => ['sometimes', 'integer', 'min:1'],
        ]);

        $posts = ContentPost::query()
            ->with(['campaign:id,name', 'assignee:id,name', 'attachments'])
            ->where('workspace_id', $workspaceId)
            ->when(isset($filters['from']) || isset($filters['to']), function ($query) use ($filters): void {
                $query->where(function ($scheduled) use ($filters): void {
                    $scheduled->whereNull('scheduled_at')
                        ->orWhere(function ($range) use ($filters): void {
                            if (isset($filters['from'])) {
                                $range->where('scheduled_at', '>=', CarbonImmutable::parse($filters['from'])->utc());
                            }
                            if (isset($filters['to'])) {
                                $range->where('scheduled_at', '<=', CarbonImmutable::parse($filters['to'])->utc());
                            }
                        });
                });
            })
            ->when($filters['search'] ?? null, function ($query, string $search): void {
                $query->where(fn ($nested) => $nested
                    ->where('title', 'like', '%'.$search.'%')
                    ->orWhere('caption', 'like', '%'.$search.'%'));
            })
            ->when($filters['platform'] ?? null, fn ($query, string $platform) => $query->where('platform', $platform))
            ->when($filters['status'] ?? null, fn ($query, string $status) => $query->where('status', $status))
            ->when($filters['campaign_id'] ?? null, fn ($query, string $id) => $query->where('campaign_id', $id))
            ->when($filters['assigned_to'] ?? null, fn ($query, int $id) => $query->where('assigned_to', $id))
            ->orderByRaw('scheduled_at is null')
            ->orderBy('scheduled_at')
            ->paginate($filters['per_page'] ?? 100)
            ->withQueryString();

        return ContentPostResource::collection($posts);
    }

    public function show(Request $request, string $post)
    {
        $this->access->authorize($request->user());

        return new ContentPostResource($this->findPost($post)->load(['campaign:id,name', 'assignee:id,name', 'attachments']));
    }

    public function members(Request $request)
    {
        $this->access->authorize($request->user());
        $members = WorkspaceUser::query()
            ->with('user:id,name')
            ->where('workspace_id', $this->tenantContext->getWorkspaceId())
            ->orderBy('joined_at')
            ->get()
            ->map(fn (WorkspaceUser $membership): array => [
                'id' => $membership->user_id,
                'name' => $membership->user?->name,
                'job_title' => $membership->job_title,
                'role' => $membership->role,
            ])
            ->values();

        return response()->json(['data' => $members]);
    }

    public function store(Request $request)
    {
        $this->access->authorize($request->user(), true);
        $attributes = $this->validateAttributes($request, true);
        if (isset($attributes['scheduled_at'])) {
            $attributes['scheduled_at'] = CarbonImmutable::parse($attributes['scheduled_at'])->utc();
        }
        $post = DB::transaction(function () use ($attributes, $request): ContentPost {
            $post = new ContentPost($attributes);
            $post->workspace_id = $this->tenantContext->getWorkspaceId();
            $post->created_by = $request->user()->id;
            $post->status = ContentPost::STATUS_DRAFT;
            $post->save();
            $this->logPostActivity($request, $post, 'content_post.created', 'Content draft created');

            return $post;
        });

        return (new ContentPostResource($post->load(['campaign:id,name', 'assignee:id,name', 'attachments'])))
            ->response()
            ->setStatusCode(201);
    }

    public function update(Request $request, string $post)
    {
        $this->access->authorize($request->user(), true);
        $record = $this->findPost($post);
        $attributes = $this->validateAttributes($request, false);
        if (array_key_exists('scheduled_at', $attributes) && $attributes['scheduled_at'] !== null) {
            $attributes['scheduled_at'] = CarbonImmutable::parse($attributes['scheduled_at'])->utc();
        }
        $previousStatus = $record->status;
        $nextStatus = $attributes['status'] ?? $previousStatus;
        if ($nextStatus !== $previousStatus && ! in_array($nextStatus, self::TRANSITIONS[$previousStatus] ?? [], true)) {
            return response()->json([
                'message' => 'The requested editorial status transition is not allowed.',
                'errors' => ['status' => ['Choose a valid next step in the editorial workflow.']],
            ], 422);
        }
        if ($nextStatus === ContentPost::STATUS_APPROVED && $previousStatus !== ContentPost::STATUS_APPROVED) {
            abort_unless(
                in_array($this->tenantContext->getMembership()?->role, [WorkspaceUser::ROLE_OWNER, WorkspaceUser::ROLE_ADMIN], true),
                403,
                'Only workspace owners and admins can approve content.'
            );
        }
        $scheduledAt = array_key_exists('scheduled_at', $attributes)
            ? $attributes['scheduled_at']
            : $record->scheduled_at;
        if ($nextStatus === ContentPost::STATUS_SCHEDULED
            && ! $scheduledAt) {
            return response()->json([
                'message' => 'A schedule date is required before scheduling content.',
                'errors' => ['scheduled_at' => ['Set the publication date and time before scheduling.']],
            ], 422);
        }

        DB::transaction(function () use ($record, $attributes, $nextStatus, $previousStatus, $request): void {
            $record->fill($attributes);
            $record->status = $nextStatus;
            if ($previousStatus !== ContentPost::STATUS_APPROVED && $nextStatus === ContentPost::STATUS_APPROVED) {
                $record->approved_by = $request->user()->id;
                $record->approved_at = now();
            } elseif ($nextStatus !== ContentPost::STATUS_APPROVED) {
                $record->approved_by = null;
                $record->approved_at = null;
            }
            $record->save();
            if ($previousStatus !== $nextStatus) {
                $this->logPostActivity($request, $record, 'content_post.status_changed', 'Editorial status changed from '.$previousStatus.' to '.$nextStatus);
            } else {
                $this->logPostActivity($request, $record, 'content_post.updated', 'Content details updated');
            }
        });

        return new ContentPostResource($record->refresh()->load(['campaign:id,name', 'assignee:id,name', 'attachments']));
    }

    public function destroy(Request $request, string $post)
    {
        $this->access->authorize($request->user(), true);
        $record = $this->findPost($post)->load('attachments');
        $paths = $record->attachments->pluck('storage_path')->all();
        DB::transaction(function () use ($record, $request): void {
            $this->logPostActivity($request, $record, 'content_post.deleted', 'Content draft deleted');
            $record->delete();
        });
        foreach ($paths as $path) {
            $this->deleteStoredFile($path);
        }

        return response()->json(['message' => 'Content post deleted successfully.']);
    }

    public function storeAttachment(Request $request, string $post)
    {
        $this->access->authorize($request->user(), true);
        $record = $this->findPost($post);
        $request->validate([
            'attachment' => ['required', 'file', 'max:20480', 'mimes:jpg,jpeg,png,webp,pdf,mp4'],
        ]);
        $file = $request->file('attachment');
        $path = $file->store('workspace-content/'.$record->workspace_id.'/'.$record->id, 'local');
        if (! is_string($path) || $path === '') {
            throw new \RuntimeException('The content attachment could not be stored.');
        }
        $originalName = basename(str_replace('\\', '/', $file->getClientOriginalName()));
        $originalName = preg_replace('/[\x00-\x1F\x7F]/u', '', $originalName) ?? '';
        if ($originalName === '') {
            $originalName = 'attachment';
        }
        try {
            $attachment = DB::transaction(function () use ($file, $path, $record, $request, $originalName): ContentPostAttachment {
                $attachment = new ContentPostAttachment([
                    'original_name' => mb_substr($originalName, 0, 255),
                    'mime_type' => $file->getMimeType() ?: 'application/octet-stream',
                    'size' => $file->getSize(),
                ]);
                $attachment->workspace_id = $record->workspace_id;
                $attachment->content_post_id = $record->id;
                $attachment->uploaded_by = $request->user()->id;
                $attachment->storage_path = $path;
                $attachment->save();
                return $attachment;
            });
        } catch (\Throwable $exception) {
            $this->deleteStoredFile($path);
            throw $exception;
        }

        return (new ContentPostAttachmentResource($attachment))
            ->response()
            ->setStatusCode(201);
    }

    public function downloadAttachment(Request $request, string $post, string $attachment): StreamedResponse
    {
        $this->access->authorize($request->user());
        $record = $this->findPost($post);
        $file = $record->attachments()->whereKey($attachment)->firstOrFail();
        $disk = Storage::disk('local');
        abort_unless($disk->exists($file->storage_path), 404, 'Content attachment was not found.');

        return $disk->download($file->storage_path, $file->original_name, [
            'Content-Type' => $file->mime_type,
            'X-Content-Type-Options' => 'nosniff',
        ]);
    }

    public function destroyAttachment(Request $request, string $post, string $attachment)
    {
        $this->access->authorize($request->user(), true);
        $record = $this->findPost($post);
        $file = $record->attachments()->whereKey($attachment)->firstOrFail();
        $path = $file->storage_path;
        $file->delete();
        $this->deleteStoredFile($path);

        return response()->json(['message' => 'Content attachment deleted successfully.']);
    }

    private function validateAttributes(Request $request, bool $creating): array
    {
        $workspaceId = $this->tenantContext->getWorkspaceId();

        return $request->validate([
            'title' => [$creating ? 'required' : 'sometimes', 'string', 'max:255'],
            'platform' => [$creating ? 'required' : 'sometimes', Rule::in(ContentPost::PLATFORMS)],
            'content_type' => [$creating ? 'required' : 'sometimes', Rule::in(['Post', 'Carousel', 'Reel', 'Story', 'Video', 'Article', 'Email'])],
            'caption' => ['sometimes', 'nullable', 'string', 'max:10000'],
            'internal_notes' => ['sometimes', 'nullable', 'string', 'max:10000'],
            'scheduled_at' => ['sometimes', 'nullable', 'date', $this->hasExplicitOffset()],
            'timezone' => [$creating ? 'required' : 'sometimes', 'timezone'],
            'campaign_id' => [
                'sometimes',
                'nullable',
                'uuid',
                Rule::exists('campaigns', 'id')->where('workspace_id', $workspaceId),
            ],
            'assigned_to' => [
                'sometimes',
                'nullable',
                'integer',
                Rule::exists('workspace_users', 'user_id')->where('workspace_id', $workspaceId),
            ],
            'status' => $creating
                ? ['prohibited']
                : ['sometimes', 'required', Rule::in(ContentPost::STATUSES)],
            'workspace_id' => ['prohibited'],
            'created_by' => ['prohibited'],
            'approved_by' => ['prohibited'],
        ]);
    }

    private function findPost(string $id): ContentPost
    {
        return ContentPost::query()
            ->where('workspace_id', $this->tenantContext->getWorkspaceId())
            ->findOrFail($id);
    }

    private function logPostActivity(Request $request, ContentPost $post, string $action, string $summary): void
    {
        WorkspaceAuditLog::log(
            $post->workspace_id,
            $action,
            'content_post',
            $post->id,
            ['summary' => $summary],
            $request->user()->id
        );
    }

    private function deleteStoredFile(string $path): void
    {
        if (! Storage::disk('local')->delete($path)) {
            Log::warning('Unable to delete a private content attachment.', ['path' => $path]);
        }
    }

    private function hasExplicitOffset(): \Closure
    {
        return function (string $attribute, mixed $value, \Closure $fail): void {
            if ($value !== null && (! is_string($value) || ! preg_match('/(?:Z|[+-]\d{2}:\d{2})$/i', $value))) {
                $fail("The {$attribute} field must include a UTC offset.");
            }
        };
    }
}
