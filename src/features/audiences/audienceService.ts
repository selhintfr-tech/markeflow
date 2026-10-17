import { apiRequest, type ApiCollection } from '../api/apiClient';

export type AudienceStatus = 'Draft' | 'Active' | 'Archived';

export interface AudienceRecord {
  id: string;
  workspace_id: string;
  created_by: number;
  name: string;
  description: string | null;
  demographics: {
    age_range?: string;
    customer_type?: string;
    [key: string]: unknown;
  } | null;
  locations: string[] | null;
  interests: string[] | null;
  characteristics: string[] | null;
  segmentation_criteria: {
    city?: string;
    source?: string;
    [key: string]: unknown;
  } | null;
  estimated_size: number | null;
  status: AudienceStatus;
  notes: string | null;
  campaign_ids?: string[];
  campaigns?: Array<{ id: string; name: string }>;
  created_at: string;
  updated_at: string;
}

export interface AudienceInput {
  name: string;
  description?: string | null;
  demographics?: Record<string, unknown> | null;
  locations?: string[] | null;
  interests?: string[] | null;
  characteristics?: string[] | null;
  segmentation_criteria?: Record<string, unknown> | null;
  estimated_size?: number | null;
  status?: AudienceStatus;
  notes?: string | null;
  campaign_ids?: string[];
}

export const audienceService = {
  async list(
    workspaceId: string,
    params: { search?: string; status?: string; campaign_id?: string } = {},
  ): Promise<AudienceRecord[]> {
    const query = new URLSearchParams({ per_page: '100', page: '1' });
    if (params.search) query.set('search', params.search);
    if (params.status) query.set('status', params.status);
    if (params.campaign_id) query.set('campaign_id', params.campaign_id);

    const records: AudienceRecord[] = [];
    while (true) {
      const result = await apiRequest<ApiCollection<AudienceRecord>>(`/api/audiences?${query.toString()}`, {
        workspaceId,
      });
      records.push(...result.data);
      if (!result.meta || Number(query.get('page')) >= result.meta.last_page) break;
      query.set('page', String(Number(query.get('page')) + 1));
    }
    return records;
  },

  async get(workspaceId: string, id: string): Promise<AudienceRecord> {
    const response = await apiRequest<{ data: AudienceRecord }>(`/api/audiences/${id}`, { workspaceId });
    return response.data;
  },

  async create(workspaceId: string, input: AudienceInput): Promise<AudienceRecord> {
    const response = await apiRequest<{ data: AudienceRecord }>('/api/audiences', {
      method: 'POST',
      workspaceId,
      body: input,
    });
    return response.data;
  },

  async update(workspaceId: string, id: string, input: Partial<AudienceInput>): Promise<AudienceRecord> {
    const response = await apiRequest<{ data: AudienceRecord }>(`/api/audiences/${id}`, {
      method: 'PATCH',
      workspaceId,
      body: input,
    });
    return response.data;
  },

  async delete(workspaceId: string, id: string): Promise<void> {
    await apiRequest<{ message: string }>(`/api/audiences/${id}`, {
      method: 'DELETE',
      workspaceId,
    });
  },
};