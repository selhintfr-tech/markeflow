<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Calendar\StoreCalendarEventRequest;
use App\Http\Requests\Calendar\UpdateCalendarEventRequest;
use App\Http\Resources\Api\CalendarEventResource;
use App\Models\CalendarEvent;
use App\Services\TenantContext;
use App\Services\WorkspaceModuleAccessService;
use Carbon\CarbonImmutable;
use Illuminate\Http\Request;

class CalendarEventController extends Controller
{
    public function __construct(
        private readonly TenantContext $tenantContext,
        private readonly WorkspaceModuleAccessService $access,
    ) {}

    public function index(Request $request)
    {
        $this->access->authorize($request->user());
        $filters = $request->validate([
            'from' => ['sometimes', 'date', $this->hasExplicitOffset('from')],
            'to' => ['sometimes', 'date', $this->hasExplicitOffset('to')],
            'project_id' => ['sometimes', 'uuid'],
            'task_id' => ['sometimes', 'uuid'],
            'per_page' => ['sometimes', 'integer', 'between:1,100'],
            'page' => ['sometimes', 'integer', 'min:1'],
        ]);
        $from = isset($filters['from']) ? $this->utcDatabaseTimestamp($filters['from']) : null;
        $to = isset($filters['to']) ? $this->utcDatabaseTimestamp($filters['to']) : null;

        return CalendarEventResource::collection(
            CalendarEvent::query()
                ->with(['project:id,name', 'task:id,title'])
                ->where('workspace_id', $this->tenantContext->getWorkspaceId())
                ->when($from, fn ($query, string $from) => $query->where('ends_at', '>=', $from))
                ->when($to, fn ($query, string $to) => $query->where('starts_at', '<=', $to))
                ->when($filters['project_id'] ?? null, fn ($query, string $id) => $query->where('project_id', $id))
                ->when($filters['task_id'] ?? null, fn ($query, string $id) => $query->where('task_id', $id))
                ->orderBy('starts_at')
                ->paginate($filters['per_page'] ?? 15)
                ->withQueryString()
        );
    }

    public function store(StoreCalendarEventRequest $request)
    {
        $this->access->authorize($request->user(), true);
        $attributes = $request->validated();
        $attributes['starts_at'] = $this->utcDatabaseTimestamp($attributes['starts_at']);
        $attributes['ends_at'] = $this->utcDatabaseTimestamp($attributes['ends_at']);
        $event = new CalendarEvent($attributes);
        $event->workspace_id = $this->tenantContext->getWorkspaceId();
        $event->created_by = $request->user()->id;
        $event->save();

        return (new CalendarEventResource($event->load(['project:id,name', 'task:id,title'])))
            ->response()
            ->setStatusCode(201);
    }

    public function show(Request $request, string $event)
    {
        $this->access->authorize($request->user());

        return new CalendarEventResource($this->findEvent($event)->load(['project:id,name', 'task:id,title']));
    }

    public function update(UpdateCalendarEventRequest $request, string $event)
    {
        $this->access->authorize($request->user(), true);
        $record = $this->findEvent($event);
        $attributes = $request->validated();
        foreach (['starts_at', 'ends_at'] as $timestamp) {
            if (isset($attributes[$timestamp])) {
                $attributes[$timestamp] = $this->utcDatabaseTimestamp($attributes[$timestamp]);
            }
        }
        $record->fill($attributes);
        $record->save();

        return new CalendarEventResource($record->refresh()->load(['project:id,name', 'task:id,title']));
    }

    public function destroy(Request $request, string $event)
    {
        $this->access->authorize($request->user(), true);
        $this->findEvent($event)->delete();

        return response()->json(['message' => 'Calendar event deleted successfully.']);
    }

    private function findEvent(string $id): CalendarEvent
    {
        return CalendarEvent::query()->where('workspace_id', $this->tenantContext->getWorkspaceId())->findOrFail($id);
    }

    private function hasExplicitOffset(string $attribute): \Closure
    {
        return function (string $attribute, mixed $value, \Closure $fail): void {
            if (! is_string($value) || ! preg_match('/(?:Z|[+-]\d{2}:\d{2})$/i', $value)) {
                $fail("The {$attribute} field must include a UTC offset.");
            }
        };
    }

    private function utcDatabaseTimestamp(string $timestamp): string
    {
        return CarbonImmutable::parse($timestamp)->utc()->format('Y-m-d H:i:s');
    }
}
