import { apiRequest, type ApiCollection } from '../api/apiClient';
import type { CampaignPlatform, CampaignStatus } from './types';

export interface CampaignRecord {
  id: string;
  workspace_id: string;
  project_id: string;
  created_by: number;
  name: string;
  description: string | null;
  status: CampaignStatus;
  platform: CampaignPlatform;
  channel: string;
  objective: string | null;
  start_date: string;
  end_date: string | null;
  budget: string | number;
  spend: string | number;
  leads: number;
  customers: number;
  revenue: string | number;
  created_at: string;
  updated_at: string;
}

export type CampaignInput = Pick<CampaignRecord, 'project_id' | 'name' | 'platform' | 'channel' | 'start_date'> &
  Partial<Pick<CampaignRecord, 'end_date' | 'description' | 'status' | 'objective' | 'budget' | 'spend' | 'leads' | 'customers' | 'revenue'>>;

export const campaignService = {
  async list(
    workspaceId: string,
    params: { search?: string; status?: string; platform?: string } = {},
    options: { signal?: AbortSignal } = {},
  ): Promise<CampaignRecord[]> {
    const query = new URLSearchParams({ per_page: '100', page: '1' });
    if (params.search) query.set('search', params.search);
    if (params.status) query.set('status', params.status);
    if (params.platform) query.set('platform', params.platform);
    const records: CampaignRecord[] = [];
    while (true) {
      const result = await apiRequest<ApiCollection<CampaignRecord>>(`/api/campaigns?${query}`, {
        workspaceId,
        cacheTtlMs: 10_000,
        signal: options.signal,
      });
      records.push(...result.data);
      if (!result.meta || Number(query.get('page')) >= result.meta.last_page) break;
      query.set('page', String(Number(query.get('page')) + 1));
    }
    return records;
  },
  async show(workspaceId: string, id: string): Promise<CampaignRecord> {
    const result = await apiRequest<{ data: CampaignRecord }>(`/api/campaigns/${encodeURIComponent(id)}`, { workspaceId });
    return result.data;
  },
  async create(workspaceId: string, payload: CampaignInput): Promise<CampaignRecord> {
    const result = await apiRequest<{ data: CampaignRecord }>('/api/campaigns', {
      method: 'POST',
      workspaceId,
      body: payload,
    });
    return result.data;
  },
  async update(workspaceId: string, id: string, payload: Partial<CampaignInput>): Promise<CampaignRecord> {
    const result = await apiRequest<{ data: CampaignRecord }>(`/api/campaigns/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      workspaceId,
      body: payload,
    });
    return result.data;
  },
  async remove(workspaceId: string, id: string): Promise<void> {
    await apiRequest(`/api/campaigns/${encodeURIComponent(id)}`, { method: 'DELETE', workspaceId });
  },
};
