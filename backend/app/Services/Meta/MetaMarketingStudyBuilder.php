<?php

namespace App\Services\Meta;

use Illuminate\Support\Collection;

class MetaMarketingStudyBuilder
{
    /**
     * @param  array{
     *   campaigns: list<array<string, mixed>>,
     *   ad_sets: list<array<string, mixed>>,
     *   ads: list<array<string, mixed>>,
     *   campaign_insights: list<array<string, mixed>>,
     *   ad_set_insights: list<array<string, mixed>>,
     *   ad_insights: list<array<string, mixed>>,
     *   daily_ad_insights: list<array<string, mixed>>,
     *   truncated: bool
     * }  $data
     * @param  array{id: string, name: string, currency: string|null, account_id: string|null}  $account
     * @return array<string, mixed>
     */
    public function build(array $data, array $account): array
    {
        $retrievedAt = now()->toIso8601String();
        $campaignInsights = $this->indexBy($data['campaign_insights'], 'campaign_id');
        $adSetInsights = $this->indexBy($data['ad_set_insights'], 'adset_id');
        $adInsights = $this->indexBy($data['ad_insights'], 'ad_id');
        $dailyByAd = collect($data['daily_ad_insights'])
            ->filter(fn (array $row): bool => isset($row['ad_id']))
            ->groupBy(fn (array $row): string => (string) $row['ad_id'])
            ->map(fn (Collection $rows): Collection => $rows->sortBy('date_start')->values());
        $adSetRows = collect($data['ad_sets'])->keyBy(fn (array $row): string => (string) ($row['id'] ?? ''));
        $adRows = collect($data['ads'])->keyBy(fn (array $row): string => (string) ($row['id'] ?? ''));
        $adsByAdSet = $adRows->groupBy(fn (array $row): string => (string) ($row['adset_id'] ?? ''));
        $adSetsByCampaign = $adSetRows->groupBy(fn (array $row): string => (string) ($row['campaign_id'] ?? ''));

        $campaignStudies = [];
        foreach ($data['campaigns'] as $campaign) {
            $campaignId = (string) ($campaign['id'] ?? '');
            $adSetStudies = [];
            foreach ($adSetsByCampaign->get($campaignId, collect()) as $adSet) {
                $adSetId = (string) ($adSet['id'] ?? '');
                $adStudies = [];
                foreach ($adsByAdSet->get($adSetId, collect()) as $ad) {
                    $adId = (string) ($ad['id'] ?? '');
                    $adDailyRows = $dailyByAd->get($adId, collect());
                    $adStudies[] = [
                        'ad' => $this->identity($ad),
                        'metrics' => $this->metrics($adInsights[$adId] ?? null),
                        'daily_trend' => $adDailyRows->map(fn (array $row): array => [
                            'date' => $row['date_start'] ?? null,
                            'metrics' => $this->metrics($row),
                        ])->all(),
                        'reporting_dates' => $this->dateCoverage($adDailyRows->all()),
                    ];
                }

                $adSetStudies[] = [
                    'ad_set' => $this->identity($adSet),
                    'metrics' => $this->metrics($adSetInsights[$adSetId] ?? null),
                    'ads' => $adStudies,
                ];
            }

            $campaignMetrics = $this->metrics($campaignInsights[$campaignId] ?? null);
            $ads = collect($adSetStudies)->flatMap(fn (array $adSet): array => $adSet['ads'])->values()->all();
            $comparison = $this->adComparison($ads);
            [$strengths, $weaknesses, $opportunities, $recommendations] = $this->evidence($campaignMetrics, $comparison);

            $campaignStudies[] = [
                'campaign' => $this->identity($campaign),
                'reporting_period' => $this->dateCoverage(isset($campaignInsights[$campaignId]) ? [$campaignInsights[$campaignId]] : []),
                'metrics' => $campaignMetrics,
                'ad_sets' => $adSetStudies,
                'ad_comparison' => $comparison,
                'swot' => [
                    'strengths' => $this->inferences($strengths),
                    'weaknesses' => $this->inferences($weaknesses),
                    'opportunities' => $this->inferences($opportunities),
                    'threats' => [['type' => 'unknown', 'statement' => 'External market threats were not measured by the retrieved Meta Ads data.']],
                ],
                'recommendations' => $recommendations,
                'audience_information' => [
                    'available' => false,
                    'limitation' => 'Audience demographics were not retrieved; no demographic conclusions are inferred from ads_read campaign insights.',
                ],
                'confidence' => $campaignMetrics === null
                    ? 'unavailable'
                    : ($data['truncated'] || $comparison['eligible_ads'] === 0 ? 'partial' : 'measured'),
                'limitations' => $this->limitations($campaignMetrics, $comparison, $data['truncated']),
            ];
        }

        return [
            'account' => [
                'id' => $account['id'],
                'name' => $account['name'],
                'account_id' => $account['account_id'],
                'currency' => $account['currency'],
                'account_status' => $account['account_status'] ?? null,
                'timezone_name' => $account['timezone_name'] ?? null,
                'timezone_offset_hours_utc' => $account['timezone_offset_hours_utc'] ?? null,
            ],
            'reporting_period' => 'maximum',
            'retrieved_at' => $retrievedAt,
            'source' => 'Meta Marketing API (read-only ads_read)',
            'coverage' => [
                'complete' => ! $data['truncated'],
                'truncated' => $data['truncated'],
                'campaign_count' => count($data['campaigns']),
                'ad_set_count' => count($data['ad_sets']),
                'ad_count' => count($data['ads']),
                'reporting_start' => $this->earliestDate($data['daily_ad_insights']),
                'reporting_end' => $this->latestDate($data['daily_ad_insights']),
                'limitations' => $data['truncated']
                    ? ['Meta pagination reported incomplete results. The returned studies cover only the retrieved portion.']
                    : [],
            ],
            'campaigns' => $campaignStudies,
            'most_recently_delivered_ad' => $this->mostRecentlyDeliveredAd($data['daily_ad_insights'], $adRows),
            'aggregation_note' => 'Campaign, ad set, and ad metrics are reported at their own Meta insight levels and are never summed across levels. Reach is never summed across reporting dates.',
        ];
    }

    /**
     * @param  list<array<string, mixed>>  $rows
     * @return array<string, array<string, mixed>>
     */
    private function indexBy(array $rows, string $field): array
    {
        $indexed = [];
        foreach ($rows as $row) {
            if (isset($row[$field])) {
                $indexed[(string) $row[$field]] = $row;
            }
        }

        return $indexed;
    }

    /**
     * @param  array<string, mixed>|null  $row
     * @return array<string, mixed>|null
     */
    private function metrics(?array $row): ?array
    {
        if ($row === null) {
            return null;
        }

        $metrics = [];
        foreach (['spend', 'impressions', 'reach', 'clicks', 'ctr', 'cpc'] as $field) {
            $metrics[$field] = $this->numeric($row[$field] ?? null);
        }
        $metrics['results'] = $this->actionValues($row['actions'] ?? []);
        $metrics['cost_per_result'] = $this->actionValues($row['cost_per_action_type'] ?? []);
        $metrics['date_start'] = isset($row['date_start']) ? (string) $row['date_start'] : null;
        $metrics['date_stop'] = isset($row['date_stop']) ? (string) $row['date_stop'] : null;

        return $metrics;
    }

    /**
     * @param  array<string, mixed>  $row
     * @return array<string, mixed>
     */
    private function identity(array $row): array
    {
        return [
            'id' => isset($row['id']) ? (string) $row['id'] : null,
            'name' => isset($row['name']) ? (string) $row['name'] : null,
            'objective' => isset($row['objective']) ? (string) $row['objective'] : null,
            'status' => isset($row['status']) ? (string) $row['status'] : null,
            'effective_status' => isset($row['effective_status']) ? (string) $row['effective_status'] : null,
            'created_at' => isset($row['created_time']) ? (string) $row['created_time'] : null,
            'updated_at' => isset($row['updated_time']) ? (string) $row['updated_time'] : null,
            'start_at' => isset($row['start_time']) ? (string) $row['start_time'] : null,
            'end_at' => isset($row['end_time']) ? (string) $row['end_time'] : null,
        ];
    }

    /**
     * @param  mixed  $values
     * @return list<array{type: string, value: int|float|null}>
     */
    private function actionValues(mixed $values): array
    {
        if (! is_array($values)) {
            return [];
        }
        $actions = [];
        foreach ($values as $action) {
            if (is_array($action) && isset($action['action_type'])) {
                $actions[] = [
                    'type' => (string) $action['action_type'],
                    'value' => $this->numeric($action['value'] ?? null),
                ];
            }
        }

        return $actions;
    }

    /**
     * @param  list<array<string, mixed>>  $ads
     * @return array<string, mixed>
     */
    private function adComparison(array $ads): array
    {
        $eligible = array_values(array_filter($ads, fn (array $ad): bool =>
            is_numeric($ad['metrics']['ctr'] ?? null)
            && is_numeric($ad['metrics']['impressions'] ?? null)
            && $ad['metrics']['impressions'] > 0
        ));
        usort($eligible, fn (array $left, array $right): int =>
            ($right['metrics']['ctr'] <=> $left['metrics']['ctr'])
            ?: strcmp((string) $left['ad']['id'], (string) $right['ad']['id'])
        );
        $best = $eligible[0] ?? null;
        $worst = $eligible === [] ? null : $eligible[array_key_last($eligible)];

        return [
            'criterion' => 'Highest and lowest Meta-reported CTR among ads with reported impressions; no creative or business outcome is inferred.',
            'eligible_ads' => count($eligible),
            'best' => $best === null ? null : ['ad' => $best['ad'], 'ctr' => $best['metrics']['ctr']],
            'worst' => $worst === null ? null : ['ad' => $worst['ad'], 'ctr' => $worst['metrics']['ctr']],
        ];
    }

    /**
     * @param  array<string, mixed>|null  $metrics
     * @param  array<string, mixed>  $comparison
     * @return array{list<string>, list<string>, list<string>, list<array<string, mixed>>}
     */
    private function evidence(?array $metrics, array $comparison): array
    {
        $strengths = [];
        $weaknesses = [];
        $opportunities = [];
        $recommendations = [];

        if ($metrics !== null && ($metrics['clicks'] ?? null) !== null && $metrics['clicks'] > 0) {
            $strengths[] = 'Meta reported '.$metrics['clicks'].' clicks during the reporting period.';
        }
        if ($metrics !== null && ($metrics['spend'] ?? null) !== null && $metrics['spend'] > 0
            && ($metrics['clicks'] ?? null) === 0) {
            $weaknesses[] = 'Meta reported spend but no clicks for this reporting period.';
            $recommendations[] = [
                'basis' => 'measured',
                'action' => 'Review delivery, destination, and creative performance before making any campaign changes.',
            ];
        }
        if ($comparison['best'] !== null && $comparison['eligible_ads'] > 1) {
            $best = $comparison['best'];
            $opportunities[] = 'The highest observed ad CTR is '.$best['ctr'].'%; test whether its approach is repeatable.';
            $recommendations[] = [
                'basis' => 'inference',
                'action' => 'Review the highest-CTR ad against lower-CTR ads before proposing a controlled creative test.',
            ];
        }

        return [$strengths, $weaknesses, $opportunities, $recommendations];
    }

    /**
     * @param  list<string>  $statements
     * @return list<array{type: string, statement: string}>
     */
    private function inferences(array $statements): array
    {
        return array_map(fn (string $statement): array => [
            'type' => 'inference_from_measured_data',
            'statement' => $statement,
        ], $statements);
    }

    /**
     * @param  list<array<string, mixed>>  $rows
     * @return array{start: string|null, end: string|null}
     */
    private function dateCoverage(array $rows): array
    {
        $dates = collect($rows)->flatMap(fn (array $row): array => array_filter([
            $row['date_start'] ?? null,
            $row['date_stop'] ?? null,
        ], 'is_string'));

        $dates = $dates->filter(fn (mixed $value): bool => is_string($value));

        return ['start' => $dates->min(), 'end' => $dates->max()];
    }

    /**
     * @param  list<array<string, mixed>>  $rows
     */
    private function earliestDate(array $rows): ?string
    {
        return collect($rows)->pluck('date_start')->filter(fn (mixed $value): bool => is_string($value))->min();
    }

    /**
     * @param  list<array<string, mixed>>  $rows
     */
    private function latestDate(array $rows): ?string
    {
        return collect($rows)->pluck('date_stop')->filter(fn (mixed $value): bool => is_string($value))->max();
    }

    /**
     * @param  list<array<string, mixed>>  $rows
     * @param  Collection<string, array<string, mixed>>  $adRows
     * @return array<string, mixed>|null
     */
    private function mostRecentlyDeliveredAd(array $rows, Collection $adRows): ?array
    {
        $delivered = array_values(array_filter($rows, fn (array $row): bool =>
            isset($row['ad_id'], $row['date_start'])
            && is_numeric($row['impressions'] ?? null)
            && (float) $row['impressions'] > 0
        ));
        usort($delivered, fn (array $left, array $right): int =>
            strcmp((string) $right['date_start'], (string) $left['date_start'])
            ?: strcmp((string) $left['ad_id'], (string) $right['ad_id'])
        );
        $latest = $delivered[0] ?? null;
        if ($latest === null) {
            return null;
        }

        return [
            'ad' => $this->identity($adRows->get((string) $latest['ad_id'], ['id' => $latest['ad_id']])),
            'delivery_date' => (string) $latest['date_start'],
            'daily_metrics' => $this->metrics($latest),
        ];
    }

    private function numeric(mixed $value): int|float|null
    {
        if (! is_numeric($value)) {
            return null;
        }

        return str_contains((string) $value, '.') ? (float) $value : (int) $value;
    }

    /**
     * @param  array<string, mixed>|null  $metrics
     * @param  array<string, mixed>  $comparison
     * @return list<string>
     */
    private function limitations(?array $metrics, array $comparison, bool $truncated): array
    {
        $limitations = [];
        if ($metrics === null) {
            $limitations[] = 'Meta returned no campaign-level insight row; unavailable values are not treated as zero.';
        }
        if ($comparison['eligible_ads'] === 0) {
            $limitations[] = 'No ads with both reported impressions and CTR were available for comparison.';
        }
        if ($truncated) {
            $limitations[] = 'The Meta response was truncated; study coverage is partial.';
        }
        $limitations[] = 'Advertising performance does not establish leads, sales, revenue, profit, attribution, or ROAS.';

        return $limitations;
    }
}
