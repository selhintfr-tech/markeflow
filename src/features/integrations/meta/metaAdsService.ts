import { apiRequest } from '../../api/apiClient';

export interface MetaConnectionStatus {
  configured: boolean;
  connected: boolean;
  status: 'connected' | 'disconnected' | 'expired' | string;
  connected_at: string | null;
  token_expires_at: string | null;
  connected_by: string | null;
  scopes: string[];
}

export interface MetaAdAccount {
  id: string;
  name: string;
  account_id: string | null;
  currency: string | null;
  account_status: number | null;
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

const base = '/api/integrations/meta';

export const metaAdsService = {
  status: (workspaceId: string) =>
    apiRequest<{ data: MetaConnectionStatus }>(`${base}/status`, { workspaceId }).then((result) => result.data),
  connect: (workspaceId: string) =>
    apiRequest<{ data: { authorization_url: string } }>(`${base}/connect`, { method: 'POST', workspaceId }).then((result) => result.data),
  accounts: (workspaceId: string) =>
    apiRequest<{ data: MetaAdAccount[]; meta: { truncated: boolean } }>(`${base}/accounts`, { workspaceId }),
  insights: (workspaceId: string, accountId: string, datePreset: string) => {
    const params = new URLSearchParams({ account_id: accountId, date_preset: datePreset });
    return apiRequest<{ data: MetaCampaignInsight[]; meta: { truncated: boolean } }>(`${base}/insights?${params}`, { workspaceId });
  },
  disconnect: (workspaceId: string) =>
    apiRequest(`${base}/connection`, { method: 'DELETE', workspaceId }),
};