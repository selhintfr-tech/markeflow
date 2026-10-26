<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\WorkspaceNotification;
use App\Services\TenantContext;
use App\Services\WorkspaceModuleAccessService;
use Illuminate\Http\Request;

class WorkspaceNotificationController extends Controller
{
    public function __construct(
        private readonly TenantContext $tenantContext,
        private readonly WorkspaceModuleAccessService $access,
    ) {}

    public function index(Request $request)
    {
        $this->access->authorize($request->user());
        $filters = $request->validate([
            'per_page' => ['sometimes', 'integer', 'between:1,100'],
            'page' => ['sometimes', 'integer', 'min:1'],
        ]);
        $workspaceId = $this->tenantContext->getWorkspaceId();
        $userId = $request->user()->id;
        $notifications = $this->ownedNotifications($userId, $workspaceId)
            ->orderByDesc('created_at')
            ->paginate($filters['per_page'] ?? 20)
            ->withQueryString();
        $unreadCount = $this->ownedNotifications($userId, $workspaceId)
            ->whereNull('read_at')
            ->count();

        return response()->json([
            'data' => $notifications->getCollection()->map(fn (WorkspaceNotification $notification): array => $this->serialize($notification)),
            'meta' => [
                'current_page' => $notifications->currentPage(),
                'last_page' => $notifications->lastPage(),
                'per_page' => $notifications->perPage(),
                'total' => $notifications->total(),
                'unread_count' => $unreadCount,
            ],
        ]);
    }

    public function unreadCount(Request $request)
    {
        $this->access->authorize($request->user());

        return response()->json(['data' => [
            'unread_count' => $this->ownedNotifications(
                $request->user()->id,
                $this->tenantContext->getWorkspaceId()
            )->whereNull('read_at')->count(),
        ]]);
    }

    public function markAsRead(Request $request, string $notification)
    {
        $this->access->authorize($request->user());
        $record = $this->ownedNotifications(
            $request->user()->id,
            $this->tenantContext->getWorkspaceId()
        )->whereKey($notification)->firstOrFail();
        if ($record->read_at === null) {
            $record->forceFill(['read_at' => now()])->save();
        }

        return response()->json(['data' => $this->serialize($record->refresh())]);
    }

    public function markAllAsRead(Request $request)
    {
        $this->access->authorize($request->user());
        $updated = $this->ownedNotifications(
            $request->user()->id,
            $this->tenantContext->getWorkspaceId()
        )->whereNull('read_at')->update(['read_at' => now(), 'updated_at' => now()]);

        return response()->json(['data' => ['updated' => $updated]]);
    }

    private function ownedNotifications(int|string $userId, ?string $workspaceId)
    {
        return WorkspaceNotification::query()
            ->where('user_id', $userId)
            ->where('workspace_id', $workspaceId);
    }

    /**
     * @return array<string, mixed>
     */
    private function serialize(WorkspaceNotification $notification): array
    {
        return [
            'id' => (string) $notification->id,
            'type' => $notification->type,
            'title' => $notification->title,
            'description' => $notification->description,
            'action_url' => $notification->action_url,
            'is_read' => $notification->read_at !== null,
            'created_at' => $notification->created_at?->toIso8601String(),
        ];
    }
}
