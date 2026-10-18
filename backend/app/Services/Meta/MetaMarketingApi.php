<?php

namespace App\Services\Meta;

use Illuminate\Http\Client\Response;
use Illuminate\Support\Facades\Http;
use InvalidArgumentException;

class MetaMarketingApi
{
    private const BASE_URL = 'https://graph.facebook.com/';

    private const TIMEOUT_SECONDS = 15;

    private const MAX_PAGES = 20;

    public function isConfigured(): bool
    {
        return $this->configuredValue('META_APP_ID') !== null
            && $this->configuredValue('META_APP_SECRET') !== null
            && $this->configuredValue('META_OAUTH_REDIRECT_URI') !== null
            && $this->configuredValue('META_FRONTEND_REDIRECT_URI') !== null
            && $this->configuredValue('META_GRAPH_API_VERSION') !== null;
    }

    public function authorizationUrl(string $state): string
    {
        $this->requireConfigured();
        $query = http_build_query([
            'client_id' => $this->requiredValue('META_APP_ID'),
            'redirect_uri' => $this->requiredValue('META_OAUTH_REDIRECT_URI'),
            'state' => $state,
            'response_type' => 'code',
            'scope' => implode(',', ['ads_read', 'read_insights']),
        ]);

        return 'https://www.facebook.com/'.$this->version().'/dialog/oauth?'.$query;
    }

    /**
     * @return array{access_token: string, expires_in: int|null, meta_user_id: string|null, scopes: list<string>}
     */
    public function exchangeCode(string $code): array
    {
        $this->requireConfigured();
        $response = Http::acceptJson()->timeout(self::TIMEOUT_SECONDS)->get($this->graphUrl('oauth/access_token'), [
            'client_id' => $this->requiredValue('META_APP_ID'),
            'client_secret' => $this->requiredValue('META_APP_SECRET'),
            'redirect_uri' => $this->requiredValue('META_OAUTH_REDIRECT_URI'),
            'code' => $code,
        ]);
        $payload = $this->decode($response);
        $token = $payload['access_token'] ?? null;
        if (! is_string($token) || $token === '') {
            throw new MetaApiException('Meta did not return an access token. Confirm the OAuth redirect URI and app configuration.', 502);
        }

        $expiresIn = isset($payload['expires_in']) && is_numeric($payload['expires_in']) ? (int) $payload['expires_in'] : null;
        $userId = isset($payload['user_id']) ? (string) $payload['user_id'] : null;
        $scopes = isset($payload['granted_scopes']) && is_string($payload['granted_scopes'])
            ? array_values(array_filter(explode(',', $payload['granted_scopes'])))
            : ['ads_read', 'read_insights'];

        return [
            'access_token' => $token,
            'expires_in' => $expiresIn,
            'meta_user_id' => $userId,
            'scopes' => $scopes,
        ];
    }

    /**
     * @return array{data: list<array{id: string, name: string, account_id: string|null, currency: string|null, account_status: int|null}>, truncated: bool}
     */
    public function adAccounts(string $accessToken): array
    {
        $fields = 'id,name,account_id,currency,account_status';
        $result = $this->pagedGet($this->graphUrl('me/adaccounts'), [
            'fields' => $fields,
            'limit' => 100,
            'access_token' => $accessToken,
        ]);
        $accounts = [];
        foreach ($result['data'] as $account) {
            if (! is_array($account) || ! isset($account['id'], $account['name'])) {
                continue;
            }
            $accounts[] = [
                'id' => (string) $account['id'],
                'name' => (string) $account['name'],
                'account_id' => isset($account['account_id']) ? (string) $account['account_id'] : null,
                'currency' => isset($account['currency']) ? (string) $account['currency'] : null,
                'account_status' => isset($account['account_status']) ? (int) $account['account_status'] : null,
            ];
        }

        return ['data' => $accounts, 'truncated' => $result['truncated']];
    }

    /**
     * @return array{data: list<array<string, string|int|float|null>>, truncated: bool}
     */
    public function campaignInsights(string $accessToken, string $accountId, string $datePreset): array
    {
        if (! preg_match('/^act_[0-9]+$/', $accountId)) {
            throw new InvalidArgumentException('A valid Meta ad account ID is required.');
        }
        $result = $this->pagedGet($this->graphUrl($accountId.'/insights'), [
            'fields' => 'campaign_id,campaign_name,spend,impressions,clicks,reach,ctr,cpc',
            'level' => 'campaign',
            'date_preset' => $datePreset,
            'limit' => 100,
            'access_token' => $accessToken,
        ]);
        $rows = [];
        foreach ($result['data'] as $row) {
            if (! is_array($row)) {
                continue;
            }
            $rows[] = [
                'campaign_id' => isset($row['campaign_id']) ? (string) $row['campaign_id'] : null,
                'campaign_name' => isset($row['campaign_name']) ? (string) $row['campaign_name'] : null,
                'spend' => $this->numeric($row['spend'] ?? null),
                'impressions' => $this->numeric($row['impressions'] ?? null),
                'clicks' => $this->numeric($row['clicks'] ?? null),
                'reach' => $this->numeric($row['reach'] ?? null),
                'ctr' => $this->numeric($row['ctr'] ?? null),
                'cpc' => $this->numeric($row['cpc'] ?? null),
            ];
        }

        return ['data' => $rows, 'truncated' => $result['truncated']];
    }

    public function displayError(MetaApiException $exception): string
    {
        if ($exception->tokenInvalid) {
            return 'The Meta connection expired or was revoked. Disconnect and reconnect the advertising account.';
        }
        if (in_array($exception->metaCode, [10, 200], true)) {
            return 'Meta denied this request. Confirm ads_read and read_insights access and that the Meta app has the required permissions.';
        }
        if (in_array($exception->metaCode, [4, 17, 32, 613], true) || $exception->httpStatus === 429) {
            return 'Meta rate limited this request. Wait a little while and try again.';
        }

        return $exception->getMessage();
    }

    private function requireConfigured(): void
    {
        if (! $this->isConfigured()) {
            throw new MetaApiException('Meta integration is not configured. Set META_APP_ID, META_APP_SECRET, META_OAUTH_REDIRECT_URI, META_FRONTEND_REDIRECT_URI and META_GRAPH_API_VERSION.', 503);
        }
    }

    private function version(): string
    {
        $version = $this->requiredValue('META_GRAPH_API_VERSION');
        if (! preg_match('/^v[0-9]+\.[0-9]+$/', $version)) {
            throw new MetaApiException('META_GRAPH_API_VERSION must use the format vNN.0.', 503);
        }

        return $version;
    }

    private function graphUrl(string $path): string
    {
        return self::BASE_URL.$this->version().'/'.$path;
    }

    private function configuredValue(string $name): ?string
    {
        $value = env($name);

        return is_string($value) && trim($value) !== '' ? trim($value) : null;
    }

    private function requiredValue(string $name): string
    {
        return $this->configuredValue($name) ?? throw new MetaApiException('Meta integration is not configured. Check the required META_* environment variables.', 503);
    }

    /**
     * @param  array<string, mixed>  $parameters
     * @return array{data: list<mixed>, truncated: bool}
     */
    private function pagedGet(string $url, array $parameters): array
    {
        $data = [];
        $truncated = false;
        for ($page = 0; $page < self::MAX_PAGES; $page++) {
            $response = $page === 0
                ? Http::acceptJson()->timeout(self::TIMEOUT_SECONDS)->get($url, $parameters)
                : Http::acceptJson()->timeout(self::TIMEOUT_SECONDS)->get($url);
            $payload = $this->decode($response);
            $rows = $payload['data'] ?? null;
            if (! is_array($rows)) {
                throw new MetaApiException('Meta returned an unexpected response while retrieving advertising data.', 502);
            }
            array_push($data, ...array_values($rows));
            $next = $payload['paging']['next'] ?? null;
            if (! is_string($next) || $next === '') {
                break;
            }
            $nextUrl = parse_url($next);
            if (($nextUrl['scheme'] ?? null) !== 'https' || strtolower((string) ($nextUrl['host'] ?? '')) !== 'graph.facebook.com') {
                throw new MetaApiException('Meta returned an invalid pagination URL.', 502);
            }
            if ($page === self::MAX_PAGES - 1) {
                $truncated = true;
                break;
            }
            $url = $next;
        }

        return ['data' => $data, 'truncated' => $truncated];
    }

    /**
     * @return array<string, mixed>
     */
    private function decode(Response $response): array
    {
        $payload = $response->json();
        if (! is_array($payload)) {
            throw new MetaApiException('Meta returned an invalid response. Try again later.', 502);
        }
        $error = $payload['error'] ?? null;
        if ($response->failed() || is_array($error)) {
            $code = is_array($error) && isset($error['code']) && is_numeric($error['code']) ? (int) $error['code'] : null;
            $invalidToken = $code === 190;
            $safeMessage = $invalidToken
                ? 'Meta access token expired or revoked.'
                : (in_array($code, [10, 200], true)
                    ? 'Meta permissions are insufficient for this request.'
                    : (in_array($code, [4, 17, 32, 613], true) || $response->status() === 429
                        ? 'Meta rate limited this request.'
                        : 'Meta could not complete the request. Check the account permissions and try again.'));

            throw new MetaApiException($safeMessage, $response->status() >= 400 ? $response->status() : 502, $code, $invalidToken);
        }

        return $payload;
    }

    private function numeric(mixed $value): int|float|null
    {
        return is_numeric($value) ? (str_contains((string) $value, '.') ? (float) $value : (int) $value) : null;
    }
}