<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\MetaAdConnection;
use App\Models\Workspace;
use App\Models\WorkspaceUser;
use App\Services\Meta\MetaApiException;
use App\Services\Meta\MetaMarketingApi;
use App\Services\TenantContext;
use App\Services\WorkspaceModuleAccessService;
use Illuminate\Http\Request;

class MetaIntegrationController extends Controller
{
    public function __construct(
        private readonly TenantContext $tenantContext,
        private readonly WorkspaceModuleAccessService $access,
        private readonly MetaMarketingApi $meta,
    ) {}

    public function status(Request $request)
    {
        $this->access->authorize($request->user());
        $connection = $this->connection();

        return response()->json(['data' => [
            'configured' => $this->meta->isConfigured(),
            'connected' => $connection?->status === 'connected',
            'status' => $connection?->status ?? 'disconnected',
            'connected_at' => $connection?->created_at?->toIso8601String(),
            'token_expires_at' => $connection?->token_expires_at?->toIso8601String(),
            'connected_by' => $connection?->user?->name,
            'scopes' => $connection?->scopes ?? [],
        ]]);
    }

    public function connect(Request $request)
    {
        $this->access->authorize($request->user(), true);
        $state = bin2hex(random_bytes(32));
        session()->put('meta_ads_oauth_state', [
            'state' => $state,
            'workspace_id' => $this->tenantContext->getWorkspaceId(),
            'user_id' => $request->user()->id,
            'issued_at' => now()->timestamp,
        ]);

        try {
            return response()->json(['data' => ['authorization_url' => $this->meta->authorizationUrl($state)]]);
        } catch (MetaApiException $exception) {
            session()->forget('meta_ads_oauth_state');

            return $this->apiError($exception);
        }
    }

    public function callback(Request $request)
    {
        $request->validate([
            'state' => ['required', 'string', 'min:32', 'max:128'],
            'code' => ['required_without:error', 'nullable', 'string', 'max:4096'],
            'error' => ['sometimes', 'string', 'max:100'],
        ]);
        $pending = session()->pull('meta_ads_oauth_state');
        abort_unless(
            is_array($pending)
                && isset($pending['state'], $pending['workspace_id'], $pending['user_id'], $pending['issued_at'])
                && is_string($pending['state'])
                && hash_equals($pending['state'], $request->string('state')->toString())
                && (int) $pending['issued_at'] >= now()->subMinutes(10)->timestamp
                && (int) $pending['user_id'] === (int) $request->user()->id,
            419,
            'Meta OAuth state is missing, expired, or invalid.'
        );

        $workspace = Workspace::query()->whereKey($pending['workspace_id'])->where('status', 'Active')->first();
        $membership = WorkspaceUser::query()
            ->where('workspace_id', $pending['workspace_id'])
            ->where('user_id', $request->user()->id)
            ->first();
        abort_unless($workspace && $membership, 403, 'Verified membership in the initiating workspace is required.');

        $this->tenantContext->setWorkspace($workspace, $membership);
        try {
            $this->access->authorize($request->user(), true);
            if ($request->filled('error') || ! $request->filled('code')) {
                return $this->frontendRedirect('error', 'Meta authorization was denied. No account was connected.');
            }

            try {
                $credentials = $this->meta->exchangeCode($request->string('code')->toString());
            } catch (MetaApiException $exception) {
                return $this->frontendRedirect('error', $this->meta->displayError($exception));
            }

            MetaAdConnection::updateOrCreate(
                ['workspace_id' => $workspace->id],
                [
                    'user_id' => $request->user()->id,
                    'meta_user_id' => $credentials['meta_user_id'],
                    'access_token' => $credentials['access_token'],
                    'token_expires_at' => $credentials['expires_in'] === null ? null : now()->addSeconds($credentials['expires_in']),
                    'scopes' => $credentials['scopes'],
                    'status' => 'connected',
                ]
            );

            return $this->frontendRedirect('connected', 'Meta advertising account connected.');
        } finally {
            $this->tenantContext->clear();
        }
    }

    public function accounts(Request $request)
    {
        $this->access->authorize($request->user());
        $connection = $this->requireConnection();
        try {
            $accounts = $this->meta->adAccounts($connection->access_token);
        } catch (MetaApiException $exception) {
            $this->markTokenFailure($connection, $exception);

            return $this->apiError($exception);
        }

        return response()->json(['data' => $accounts['data'], 'meta' => ['truncated' => $accounts['truncated']]]);
    }

    public function insights(Request $request)
    {
        $this->access->authorize($request->user());
        $filters = $request->validate([
            'account_id' => ['required', 'string', 'regex:/^act_[0-9]+$/', 'max:100'],
            'date_preset' => ['sometimes', 'string', 'in:last_7d,last_30d,this_month,last_month,maximum'],
        ]);
        $connection = $this->requireConnection();

        try {
            $accounts = $this->meta->adAccounts($connection->access_token);
            abort_unless(collect($accounts['data'])->contains('id', $filters['account_id']), 403, 'The selected Meta ad account is not accessible through this workspace connection.');
            $insights = $this->meta->campaignInsights(
                $connection->access_token,
                $filters['account_id'],
                $filters['date_preset'] ?? 'last_30d',
            );
        } catch (MetaApiException $exception) {
            $this->markTokenFailure($connection, $exception);

            return $this->apiError($exception);
        }

        return response()->json(['data' => $insights['data'], 'meta' => ['truncated' => $insights['truncated']]]);
    }

    public function disconnect(Request $request)
    {
        $this->access->authorize($request->user(), true);
        $connection = $this->connection();
        if ($connection) {
            $connection->forceFill([
                'access_token' => null,
                'token_expires_at' => null,
                'meta_user_id' => null,
                'scopes' => [],
                'status' => 'disconnected',
            ])->save();
        }

        return response()->json(['message' => 'Meta connection disconnected.']);
    }

    private function connection(): ?MetaAdConnection
    {
        return MetaAdConnection::query()
            ->with('user:id,name')
            ->where('workspace_id', $this->tenantContext->getWorkspaceId())
            ->first();
    }

    private function requireConnection(): MetaAdConnection
    {
        $connection = $this->connection();
        abort_unless($connection?->status === 'connected' && is_string($connection->access_token) && $connection->access_token !== '', 409, 'Connect a Meta advertising account before requesting account data.');

        if ($connection->token_expires_at?->isPast()) {
            $connection->forceFill(['status' => 'expired'])->save();
            abort(409, 'The Meta connection has expired. Reconnect the advertising account.');
        }

        return $connection;
    }

    private function markTokenFailure(MetaAdConnection $connection, MetaApiException $exception): void
    {
        if ($exception->tokenInvalid) {
            $connection->forceFill(['status' => 'expired'])->save();
        }
    }

    private function apiError(MetaApiException $exception)
    {
        return response()->json(['message' => $this->meta->displayError($exception)], $exception->httpStatus);
    }

    private function frontendRedirect(string $status, string $message)
    {
        $frontend = env('META_FRONTEND_REDIRECT_URI');
        abort_unless(is_string($frontend) && filter_var($frontend, FILTER_VALIDATE_URL), 503, 'META_FRONTEND_REDIRECT_URI is not configured.');
        $query = http_build_query(['meta_status' => $status, 'meta_message' => $message]);
        $separator = str_contains($frontend, '?') ? '&' : '?';

        return redirect()->away($frontend.$separator.$query);
    }
}