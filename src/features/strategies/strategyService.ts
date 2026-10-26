import { apiRequest, type ApiCollection } from '../api/apiClient';
import type { AudienceRecord } from '../audiences/audienceService';

export type StrategyStatus = 'Draft' | 'Planned' | 'Active' | 'Completed' | 'On Hold' | 'Archived';

export interface ActionPlanItem {
  title: string;
  description?: string | null;
  due_date?: string | null;
  status?: 'Pending' | 'In Progress' | 'Completed';
}

export interface StrategyRecord {
  id: string;
  workspace_id: string;
  created_by: number;
  project_id: string | null;
  campaign_id: string | null;
  name: string;
  description: string | null;
  objectives: string[] | null;
  success_metrics: string[] | null;
  channels: string[] | null;
  budget: string | number | null;
  starts_on: string | null;
  ends_on: string | null;
  status: StrategyStatus;
  progress: number | null;
  action_plan: ActionPlanItem[] | null;
  notes: string | null;
  audience_ids?: string[];
  audiences?: AudienceRecord[];
  project?: { id: string; name: string } | null;
  campaign?: { id: string; name: string } | null;
  created_at: string;
  updated_at: string;
}

export interface StrategyInput {
  name: string;
  description?: string | null;
  project_id?: string | null;
  campaign_id?: string | null;
  objectives?: string[] | null;
  success_metrics?: string[] | null;
  channels?: string[] | null;
  budget?: number | null;
  starts_on?: string | null;
  ends_on?: string | null;
  status?: StrategyStatus;
  action_plan?: ActionPlanItem[] | null;
  notes?: string | null;
  audience_ids?: string[];
}

export const strategyService = {
  async list(
    workspaceId: string,
    params: {
      search?: string;
      status?: string;
      project_id?: string;
      campaign_id?: string;
      audience_id?: string;
    } = {},
    options: { signal?: AbortSignal } = {},
  ): Promise<StrategyRecord[]> {
    const query = new URLSearchParams({ per_page: '100', page: '1' });
    if (params.search) query.set('search', params.search);
    if (params.status) query.set('status', params.status);
    if (params.project_id) query.set('project_id', params.project_id);
    if (params.campaign_id) query.set('campaign_id', params.campaign_id);
    if (params.audience_id) query.set('audience_id', params.audience_id);

    const records: StrategyRecord[] = [];
    while (true) {
      const result = await apiRequest<ApiCollection<StrategyRecord>>(`/api/strategies?${query.toString()}`, {
        workspaceId,
        signal: options.signal,
      });
      records.push(...result.data);
      if (!result.meta || Number(query.get('page')) >= result.meta.last_page) break;
      query.set('page', String(Number(query.get('page')) + 1));
    }
    return records;
  },

  async get(workspaceId: string, id: string): Promise<StrategyRecord> {
    const response = await apiRequest<{ data: StrategyRecord }>(`/api/strategies/${id}`, { workspaceId });
    return response.data;
  },

  async create(workspaceId: string, input: StrategyInput): Promise<StrategyRecord> {
    const response = await apiRequest<{ data: StrategyRecord }>('/api/strategies', {
      method: 'POST',
      workspaceId,
      body: input,
    });
    return response.data;
  },

  async update(workspaceId: string, id: string, input: Partial<StrategyInput>): Promise<StrategyRecord> {
    const response = await apiRequest<{ data: StrategyRecord }>(`/api/strategies/${id}`, {
      method: 'PATCH',
      workspaceId,
      body: input,
    });
    return response.data;
  },

  async delete(workspaceId: string, id: string): Promise<void> {
    await apiRequest<{ message: string }>(`/api/strategies/${id}`, {
      method: 'DELETE',
      workspaceId,
    });
  },
};
