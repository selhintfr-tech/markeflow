<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\MetaAdConnection;
use App\Models\MetaOAuthTransaction;
use App\Models\User;
use App\Models\Workspace;
use App\Models\WorkspaceUser;
use App\Services\Meta\MetaApiException;
use App\Services\Meta\MetaMarketingApi;
use App\Services\Meta\MetaMarketingStudyBuilder;
use App\Services\TenantContext;
use App\Services\WorkspaceModuleAccessService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;

class MetaIntegrationController extends Controller
{
    public function __construct(
        private readonly TenantContext $tenantContext,
        private readonly WorkspaceModuleAccessService $access,
        private readonly MetaMarketingApi $meta,
        private readonly MetaMarketingStudyBuilder $studyBuilder,
    ) {}

    public function status(Request $request)
    {
        $this->access->authorize($request->user());
        $connection = $this->connection();
        if ($connection?->status === 'connected' && $connection->token_expires_at?->isPast()) {
            $connection->forceFill(['status' => 'expired'])->save();
            $connection->refresh();
        }

        return response()->json(['data' => [
            'configured' => $this->meta->isConfigured(),
            'connected' => $connection?->status === 'connected',
            'status' => $connection?->status ?? 'disconnected',
            'connected_at' => $connection?->created_at?->toIso8601String(),
            'token_expires_at' => $connection?->token_expires_at?->toIso8601String(),
            'connected_by' => $connection?->user?->name,
            'scopes' => $connection?->scopes ?? [],
            'preferred_account_id' => $connection?->preferred_account_id,
        ]]);
    }

    public function connect(Request $request)
    {
        $this->access->authorize($request->user(), true);
        $existingConnection = $this->connection();
        if ($existingConnection?->status === 'connected' && $existingConnection->token_expires_at?->isPast()) {
            $existingConnection->forceFill(['status' => 'expired'])->save();
        }
        abort_if(
            $existingConnection?->status === 'connected'
                && is_string($existingConnection->access_token)
                && $existingConnection->access_token !== ''
                && ! $existingConnection->token_expires_at?->isPast(),
            409,
            'This workspace already has an active Meta Ads connection. Disconnect it explicitly before connecting another account.'
        );
        $state = bin2hex(random_bytes(32));

        try {
            $authorizationUrl = $this->meta->authorizationUrl($state);
        } catch (MetaApiException $exception) {
            return $this->apiError($exception);
        }

        MetaOAuthTransaction::query()->where('expires_at', '<=', now())->delete();
        MetaOAuthTransaction::create([
            'state_hash' => hash('sha256', $state),
            'user_id' => $request->user()->id,
            'workspace_id' => $this->tenantContext->getWorkspaceId(),
            'expires_at' => now()->addMinutes(10),
        ]);

        return response()->json(['data' => ['authorization_url' => $authorizationUrl]]);
    }

    public function callback(Request $request)
    {
        $this->tenantContext->clear();
        $state = $request->query('state');
        if (! is_string($state) || ! preg_match('/\A[a-f0-9]{64}\z/', $state)) {
            return $this->frontendRedirect('error');
        }

        $pending = $this->consumeOAuthTransaction($state);
        if (! $pending) {
            return $this->frontendRedirect('error');
        }

        $user = User::query()->find($pending['user_id']);
        $workspace = Workspace::query()->whereKey($pending['workspace_id'])->where('status', 'Active')->first();
        $membership = WorkspaceUser::query()
            ->where('workspace_id', $pending['workspace_id'])
            ->where('user_id', $pending['user_id'])
            ->first();
        if (! $user || ! $workspace || ! $membership) {
            return $this->frontendRedirect('error');
        }

        $code = $request->query('code');
        if ($request->query->has('error') || ! is_string($code) || $code === '' || strlen($code) > 4096) {
            return $this->frontendRedirect('error');
        }

        $this->tenantContext->setWorkspace($workspace, $membership);
        try {
            if (! in_array($membership->role, [
                WorkspaceUser::ROLE_OWNER,
                WorkspaceUser::ROLE_ADMIN,
                WorkspaceUser::ROLE_MEMBER,
            ], true)) {
                return $this->frontendRedirect('error');
            }
            if (in_array($membership->role, [WorkspaceUser::ROLE_OWNER, WorkspaceUser::ROLE_ADMIN], true)
                && ! Gate::forUser($user)->allows('update', $workspace)) {
                return $this->frontendRedirect('error');
            }

            try {
                $credentials = $this->meta->exchangeCode($code);
            } catch (MetaApiException) {
                return $this->frontendRedirect('error');
            }

            MetaAdConnection::updateOrCreate(
                ['workspace_id' => $workspace->id],
                [
                    'user_id' => $user->id,
                    'meta_user_id' => $credentials['meta_user_id'],
                    'access_token' => $credentials['access_token'],
                    'token_expires_at' => $credentials['expires_in'] === null ? null : now()->addSeconds($credentials['expires_in']),
                    'scopes' => $credentials['scopes'],
                    'status' => 'connected',
                ]
            );

            return $this->frontendRedirect('connected');
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

    public function historicalStudies(Request $request)
    {
        $this->access->authorize($request->user());
        $filters = $request->validate([
            'account_id' => ['required', 'string', 'regex:/^act_[0-9]+$/', 'max:100'],
        ]);
        $connection = $this->requireConnection();

        try {
            $accounts = $this->meta->adAccounts($connection->access_token);
            $account = collect($accounts['data'])->firstWhere('id', $filters['account_id']);
            abort_unless($account, 403, 'The selected Meta ad account is not accessible through this workspace connection.');

            $historicalData = $this->meta->historicalAccountData($connection->access_token, $filters['account_id']);
            $historicalData['truncated'] = $historicalData['truncated'] || $accounts['truncated'];

            return response()->json([
                'data' => $this->studyBuilder->build($historicalData, $account),
            ]);
        } catch (MetaApiException $exception) {
            $this->markTokenFailure($connection, $exception);

            return $this->apiError($exception);
        }
    }

    public function preferredAccount(Request $request)
    {
        $this->access->authorize($request->user(), true);
        $validated = $request->validate([
            'account_id' => ['required', 'string', 'regex:/^act_[0-9]+$/', 'max:100'],
        ]);
        $connection = $this->requireConnection();

        try {
            $accounts = $this->meta->adAccounts($connection->access_token);
        } catch (MetaApiException $exception) {
            $this->markTokenFailure($connection, $exception);

            return $this->apiError($exception);
        }
        abort_unless(
            collect($accounts['data'])->contains('id', $validated['account_id']),
            403,
            'The selected Meta ad account is not accessible through this workspace connection.'
        );

        $connection->forceFill(['preferred_account_id' => $validated['account_id']])->save();

        return response()->json(['data' => ['preferred_account_id' => $connection->preferred_account_id]]);
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
                'preferred_account_id' => null,
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
        abort_unless($connection && is_string($connection->access_token) && $connection->access_token !== '', 409, 'Connect a Meta advertising account before requesting account data.');
        if ($connection->token_expires_at?->isPast()) {
            $connection->forceFill(['status' => 'expired'])->save();
            abort(409, 'The Meta connection has expired. Reconnect the advertising account.');
        }
        abort_unless($connection->status === 'connected', 409, 'Connect a Meta advertising account before requesting account data.');

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

    /**
     * @return array{user_id: int, workspace_id: string}|null
     */
    private function consumeOAuthTransaction(string $state): ?array
    {
        return DB::transaction(function () use ($state): ?array {
            $transaction = MetaOAuthTransaction::query()
                ->where('state_hash', hash('sha256', $state))
                ->lockForUpdate()
                ->first();

            if (! $transaction) {
                return null;
            }

            $transaction->delete();
            if ($transaction->expires_at->isPast()) {
                return null;
            }

            return [
                'user_id' => (int) $transaction->user_id,
                'workspace_id' => (string) $transaction->workspace_id,
            ];
        });
    }

    private function frontendRedirect(string $status)
    {
        $frontend = env('META_FRONTEND_REDIRECT_URI');
        $parts = is_string($frontend) ? parse_url($frontend) : false;
        $isSecureUrl = is_array($parts)
            && in_array($parts['scheme'] ?? null, ['https', 'http'], true)
            && isset($parts['host'])
            && ! array_key_exists('user', $parts)
            && ! array_key_exists('pass', $parts)
            && ! array_key_exists('query', $parts)
            && ! array_key_exists('fragment', $parts)
            && (($parts['scheme'] ?? null) === 'https'
                || in_array(strtolower($parts['host']), ['localhost', '127.0.0.1', '::1'], true));
        abort_unless($isSecureUrl && in_array($status, ['connected', 'error'], true), 503, 'Meta frontend redirect is not safely configured.');

        return redirect()->away($frontend.'?'.http_build_query(['meta_status' => $status]));
    }
}