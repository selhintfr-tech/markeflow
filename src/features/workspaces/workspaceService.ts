import { apiRequest, type ApiCollection } from '../api/apiClient';

export interface WorkspaceRecord {
  id: string;
  name: string;
  slug: string;
  business_type: string;
  industry: string | null;
  location: string | null;
  currency: string;
  timezone: string;
  date_format: string;
  enabled_modules: string[];
  status: string;
  current_user_role: string | null;
  is_owner: boolean;
  members_count?: number;
}

export type WorkspaceInput = Partial<Pick<
  WorkspaceRecord,
  'name' | 'slug' | 'business_type' | 'industry' | 'location' | 'currency' | 'timezone' | 'date_format' | 'enabled_modules' | 'status'
>> & Pick<WorkspaceRecord, 'name'>;

export const workspaceService = {
  async list(): Promise<WorkspaceRecord[]> {
    const response = await apiRequest<ApiCollection<WorkspaceRecord>>('/api/workspaces', {
      cacheTtlMs: 10_000,
    });
    return response.data;
  },
  async create(payload: WorkspaceInput): Promise<WorkspaceRecord> {
    const response = await apiRequest<{ data: WorkspaceRecord }>('/api/workspaces', {
      method: 'POST',
      body: payload,
    });
    return response.data;
  },
  async update(id: string, payload: Partial<WorkspaceInput>): Promise<WorkspaceRecord> {
    const response = await apiRequest<{ data: WorkspaceRecord }>(`/api/workspaces/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: payload,
    });
    return response.data;
  },
  async remove(id: string): Promise<void> {
    await apiRequest(`/api/workspaces/${encodeURIComponent(id)}`, { method: 'DELETE' });
  },
};
