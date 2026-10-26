<?php

namespace Tests\Feature\Api;

use App\Models\MetaAdConnection;
use App\Models\User;
use App\Models\Workspace;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class MetaHistoricalStudiesApiTest extends TestCase
{
    use RefreshDatabase;

    private string|false $originalGraphApiVersion;

    protected function setUp(): void
    {
        parent::setUp();
        $this->originalGraphApiVersion = getenv('META_GRAPH_API_VERSION');
        putenv('META_GRAPH_API_VERSION=v25.0');
        $_ENV['META_GRAPH_API_VERSION'] = 'v25.0';
        $_SERVER['META_GRAPH_API_VERSION'] = 'v25.0';
    }

    protected function tearDown(): void
    {
        if ($this->originalGraphApiVersion === false) {
            putenv('META_GRAPH_API_VERSION');
            unset($_ENV['META_GRAPH_API_VERSION'], $_SERVER['META_GRAPH_API_VERSION']);
        } else {
            putenv('META_GRAPH_API_VERSION='.$this->originalGraphApiVersion);
            $_ENV['META_GRAPH_API_VERSION'] = $this->originalGraphApiVersion;
            $_SERVER['META_GRAPH_API_VERSION'] = $this->originalGraphApiVersion;
        }
        parent::tearDown();
    }

    public function test_historical_studies_paginate_and_preserve_the_campaign_adset_ad_hierarchy(): void
    {
        $user = User::create([
            'name' => 'Study Owner',
            'email' => 'meta-study@example.test',
            'password' => 'password',
        ]);
        $workspace = Workspace::createWithInitialOwner($user, [
            'name' => 'Study workspace',
            'slug' => 'study-workspace',
        ]);
        MetaAdConnection::create([
            'workspace_id' => $workspace->id,
            'user_id' => $user->id,
            'access_token' => 'encrypted-test-token',
            'status' => 'connected',
            'scopes' => ['ads_read'],
        ]);

        $accountCalls = 0;
        Http::fake(function (Request $request) use (&$accountCalls) {
            $url = $request->url();
            if (str_contains($url, '/me/adaccounts')) {
                if ($accountCalls++ === 0) {
                    return Http::response(['error' => ['code' => 17]], 429);
                }
                return Http::response(['data' => [[
                    'id' => 'act_12345',
                    'name' => 'Luxe Store Ads',
                    'account_id' => '12345',
                    'currency' => 'MAD',
                    'account_status' => 1,
                    'timezone_name' => 'Africa/Casablanca',
                    'timezone_offset_hours_utc' => 1,
                ]]]);
            }
            if (str_contains($url, '/act_12345/campaigns')) {
                if (str_contains($url, 'after=campaign-page-2')) {
                    return Http::response(['data' => [[
                        'id' => 'campaign-2',
                        'name' => 'Historical campaign',
                        'objective' => 'OUTCOME_TRAFFIC',
                        'status' => 'PAUSED',
                        'effective_status' => 'PAUSED',
                    ]]]);
                }

                return Http::response([
                    'data' => [[
                        'id' => 'campaign-1',
                        'name' => 'Launch campaign',
                        'objective' => 'OUTCOME_SALES',
                        'status' => 'ACTIVE',
                        'effective_status' => 'ACTIVE',
                        'created_time' => '2025-01-01T10:00:00+0000',
                        'updated_time' => '2025-02-01T10:00:00+0000',
                    ]],
                    'paging' => ['next' => 'https://graph.facebook.com/v25.0/act_12345/campaigns?after=campaign-page-2'],
                ]);
            }
            if (str_contains($url, '/act_12345/adsets')) {
                return Http::response(['data' => [[
                    'id' => 'adset-1',
                    'name' => 'Prospecting',
                    'campaign_id' => 'campaign-1',
                    'status' => 'PAUSED',
                    'effective_status' => 'PAUSED',
                    'start_time' => '2025-01-02T00:00:00+0000',
                ]]]);
            }
            if (str_contains($url, '/act_12345/ads')) {
                return Http::response(['data' => [[
                    'id' => 'ad-1',
                    'name' => 'Creative A',
                    'campaign_id' => 'campaign-1',
                    'adset_id' => 'adset-1',
                    'status' => 'PAUSED',
                    'effective_status' => 'PAUSED',
                    'created_time' => '2025-01-03T00:00:00+0000',
                ]]]);
            }
            if (str_contains($url, '/act_12345/insights')) {
                parse_str((string) parse_url($url, PHP_URL_QUERY), $query);
                $level = $query['level'] ?? '';
                $increment = $query['time_increment'] ?? '';
                if ($level === 'campaign') {
                    return Http::response(['data' => [[
                        'campaign_id' => 'campaign-1',
                        'spend' => '149.50',
                        'impressions' => '1500',
                        'reach' => '1200',
                        'clicks' => '75',
                        'ctr' => '5.0',
                        'cpc' => '1.99',
                        'actions' => [['action_type' => 'link_click', 'value' => '75']],
                        'date_start' => '2025-01-01',
                        'date_stop' => '2025-02-01',
                    ]]]);
                }
                if ($level === 'adset') {
                    return Http::response(['data' => [[
                        'adset_id' => 'adset-1',
                        'spend' => '149.50',
                        'impressions' => '1500',
                        'reach' => '1200',
                        'clicks' => '75',
                        'ctr' => '5.0',
                        'cpc' => '1.99',
                    ]]]);
                }
                if ($level === 'ad' && $increment === 'all_days') {
                    return Http::response(['data' => [[
                        'ad_id' => 'ad-1',
                        'spend' => '149.50',
                        'impressions' => '1500',
                        'reach' => '1200',
                        'clicks' => '75',
                        'ctr' => '5.0',
                        'cpc' => '1.99',
                    ]]]);
                }
                if ($level === 'ad' && $increment === '1') {
                    return Http::response(['data' => [
                        [
                            'ad_id' => 'ad-1',
                            'spend' => '20',
                            'impressions' => '200',
                            'clicks' => '10',
                            'ctr' => '5.0',
                            'date_start' => '2025-01-01',
                            'date_stop' => '2025-01-01',
                        ],
                        [
                            'ad_id' => 'ad-1',
                            'spend' => '15',
                            'impressions' => '150',
                            'clicks' => '9',
                            'ctr' => '6.0',
                            'date_start' => '2025-02-01',
                            'date_stop' => '2025-02-01',
                        ],
                    ]]);
                }
            }

            return Http::response(['error' => ['code' => 100]], 400);
        });

        $response = $this->actingAs($user)
            ->withHeader('X-Workspace-Id', $workspace->id)
            ->getJson('/api/integrations/meta/historical-studies?account_id=act_12345');
        $this->assertSame(200, $response->status(), $response->getContent());

        $response
            ->assertJsonPath('data.account.name', 'Luxe Store Ads')
            ->assertJsonPath('data.account.currency', 'MAD')
            ->assertJsonPath('data.account.timezone_name', 'Africa/Casablanca')
            ->assertJsonPath('data.coverage.complete', true)
            ->assertJsonPath('data.coverage.campaign_count', 2)
            ->assertJsonPath('data.campaigns.0.campaign.name', 'Launch campaign')
            ->assertJsonPath('data.campaigns.0.ad_sets.0.ad_set.name', 'Prospecting')
            ->assertJsonPath('data.campaigns.0.ad_sets.0.ads.0.ad.name', 'Creative A')
            ->assertJsonPath('data.campaigns.0.metrics.spend', 149.5)
            ->assertJsonPath('data.campaigns.0.metrics.reach', 1200)
            ->assertJsonPath('data.campaigns.0.metrics.results.0.type', 'link_click')
            ->assertJsonPath('data.most_recently_delivered_ad.delivery_date', '2025-02-01')
            ->assertJsonPath('data.most_recently_delivered_ad.ad.id', 'ad-1')
            ->assertJsonPath('data.campaigns.1.metrics', null)
            ->assertJsonPath('data.campaigns.0.audience_information.available', false);

        $this->assertSame(
            10,
            Http::recorded()->count(),
            'Expected one rate-limit retry plus account authorization and all entity and insight-level requests, including the second campaign page.',
        );
    }

    public function test_historical_studies_reject_an_account_not_accessible_to_the_workspace_connection(): void
    {
        $user = User::create([
            'name' => 'Study Owner',
            'email' => 'meta-study-denied@example.test',
            'password' => 'password',
        ]);
        $workspace = Workspace::createWithInitialOwner($user, [
            'name' => 'Study workspace',
            'slug' => 'study-denied-workspace',
        ]);
        MetaAdConnection::create([
            'workspace_id' => $workspace->id,
            'user_id' => $user->id,
            'access_token' => 'encrypted-test-token',
            'status' => 'connected',
            'scopes' => ['ads_read'],
        ]);
        Http::fake([
            'https://graph.facebook.com/v25.0/me/adaccounts*' => Http::response(['data' => [[
                'id' => 'act_12345',
                'name' => 'Luxe Store Ads',
                'account_id' => '12345',
                'currency' => 'MAD',
                'timezone_name' => 'Africa/Casablanca',
            ]]]),
        ]);

        $this->actingAs($user)
            ->withHeader('X-Workspace-Id', $workspace->id)
            ->getJson('/api/integrations/meta/historical-studies?account_id=act_99999')
            ->assertForbidden();

        $this->assertSame(1, Http::recorded()->count());
    }

    public function test_historical_studies_require_authentication(): void
    {
        $this->get('/api/integrations/meta/historical-studies?account_id=act_12345')
            ->assertUnauthorized()
            ->assertHeader('Content-Type', 'application/json');
    }
}
