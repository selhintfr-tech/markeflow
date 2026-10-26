import { apiRequest } from '../../api/apiClient';
import { createScopedReportCache } from './scopedReportCache';

export interface MetaConnectionStatus {
  configured: boolean;
  connected: boolean;
  status: 'connected' | 'disconnected' | 'expired' | string;
  connected_at: string | null;
  token_expires_at: string | null;
  connected_by: string | null;
  scopes: string[];
  preferred_account_id: string | null;
}

export interface MetaAdAccount {
  id: string;
  name: string;
  account_id: string | null;
  currency: string | null;
  account_status: number | null;
  timezone_name: string | null;
  timezone_offset_hours_utc: number | null;
}

export interface MetaCampaignInsight {
  campaign_id: string | null;
  campaign_name: string | null;
  spend: number | null;
  impressions: number | null;
  clicks: number | null;
  reach: number | null;
  ctr: number | null;
  cpc: number | null;
}

export interface MetaStudyMetrics {
  spend: number | null;
  impressions: number | null;
  reach: number | null;
  clicks: number | null;
  ctr: number | null;
  cpc: number | null;
  results: Array<{ type: string; value: number | null }>;
  cost_per_result: Array<{ type: string; value: number | null }>;
  date_start: string | null;
  date_stop: string | null;
}

export interface MetaStudyAd {
  ad: {
    id: string | null;
    name: string | null;
    status: string | null;
    effective_status: string | null;
    created_at: string | null;
    updated_at: string | null;
  };
  metrics: MetaStudyMetrics | null;
  daily_trend: Array<{ date: string | null; metrics: MetaStudyMetrics | null }>;
  reporting_dates: { start: string | null; end: string | null };
}

export interface MetaCampaignStudy {
  campaign: {
    id: string | null;
    name: string | null;
    objective: string | null;
    status: string | null;
    effective_status: string | null;
    created_at: string | null;
    updated_at: string | null;
  };
  reporting_period: { start: string | null; end: string | null };
  metrics: MetaStudyMetrics | null;
  ad_sets: Array<{
    ad_set: MetaCampaignStudy['campaign'] & { start_at: string | null; end_at: string | null };
    metrics: MetaStudyMetrics | null;
    ads: MetaStudyAd[];
  }>;
  ad_comparison: {
    criterion: string;
    eligible_ads: number;
    best: { ad: MetaStudyAd['ad']; ctr: number } | null;
    worst: { ad: MetaStudyAd['ad']; ctr: number } | null;
  };
  swot: Record<'strengths' | 'weaknesses' | 'opportunities' | 'threats', Array<{ type: string; statement: string }>>;
  recommendations: Array<{ basis: string; action: string }>;
  audience_information: { available: boolean; limitation: string };
  confidence: string;
  limitations: string[];
}

export interface MetaHistoricalStudies {
  account: MetaAdAccount;
  reporting_period: 'maximum';
  retrieved_at: string;
  source: string;
  coverage: {
    complete: boolean;
    truncated: boolean;
    campaign_count: number;
    ad_set_count: number;
    ad_count: number;
    reporting_start: string | null;
    reporting_end: string | null;
    limitations: string[];
  };
  campaigns: MetaCampaignStudy[];
  most_recently_delivered_ad: {
    ad: MetaStudyAd['ad'];
    delivery_date: string;
    daily_metrics: MetaStudyMetrics;
  } | null;
  aggregation_note: string;
}

const base = '/api/integrations/meta';
const CONNECTION_READ_TTL_MS = 10_000;
const HISTORICAL_STUDIES_TTL_MS = 5 * 60 * 1000;
const historicalStudiesCache = createScopedReportCache<MetaHistoricalStudies>(HISTORICAL_STUDIES_TTL_MS);

export const metaAdsService = {
  status: (workspaceId: string) =>
    apiRequest<{ data: MetaConnectionStatus }>(`${base}/status`, { workspaceId, cacheTtlMs: CONNECTION_READ_TTL_MS })
      .then((result) => result.data),
  connect: (workspaceId: string) =>
    apiRequest<{ data: { authorization_url: string } }>(`${base}/connect`, { method: 'POST', workspaceId }).then((result) => result.data),
  accounts: (workspaceId: string) =>
    apiRequest<{ data: MetaAdAccount[]; meta: { truncated: boolean } }>(`${base}/accounts`, { workspaceId, cacheTtlMs: CONNECTION_READ_TTL_MS }),
  insights: (workspaceId: string, accountId: string, datePreset: string) => {
    const params = new URLSearchParams({ account_id: accountId, date_preset: datePreset });
    return apiRequest<{ data: MetaCampaignInsight[]; meta: { truncated: boolean } }>(`${base}/insights?${params}`, { workspaceId, cache: 'no-store' });
  },
  historicalStudies: (userId: string, workspaceId: string, accountId: string, refresh = false) => {
    const params = new URLSearchParams({ account_id: accountId });
    return historicalStudiesCache.get(
      [userId, workspaceId, accountId],
      () => apiRequest<{ data: MetaHistoricalStudies }>(`${base}/historical-studies?${params}`, { workspaceId, cache: 'no-store' })
        .then((result) => result.data),
      refresh,
    );
  },
  clearHistoricalStudiesCache: () => historicalStudiesCache.clear(),
  disconnect: (workspaceId: string) =>
    apiRequest(`${base}/connection`, { method: 'DELETE', workspaceId }),
  setPreferredAccount: (workspaceId: string, accountId: string) =>
    apiRequest<{ data: { preferred_account_id: string } }>(`${base}/preferred-account`, {
      method: 'PUT',
      workspaceId,
      body: { account_id: accountId },
    }).then((result) => result.data),
};