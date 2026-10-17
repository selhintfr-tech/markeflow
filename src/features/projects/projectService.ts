import { apiRequest, type ApiCollection } from '../api/apiClient';

export interface ProjectRecord {
  id: string;
  workspace_id: string;
  owner_id: number;
  name: string;
  description: string | null;
  status: string;
  start_date: string;
  end_date: string;
  progress: number;
  created_at: string;
  updated_at: string;
}

export type ProjectInput = Pick<ProjectRecord, 'name' | 'start_date' | 'end_date'> &
  Partial<Pick<ProjectRecord, 'description' | 'status' | 'progress'>>;

export const projectService = {
  async list(workspaceId: string, params: { search?: string; status?: string } = {}): Promise<ProjectRecord[]> {
    const query = new URLSearchParams({ per_page: '100', page: '1' });
    if (params.search) query.set('search', params.search);
    if (params.status) query.set('status', params.status);
    const records: ProjectRecord[] = [];
    while (true) {
      const result = await apiRequest<ApiCollection<ProjectRecord>>(`/api/projects?${query}`, { workspaceId });
      records.push(...result.data);
      if (!result.meta || Number(query.get('page')) >= result.meta.last_page) break;
      query.set('page', String(Number(query.get('page')) + 1));
    }
    return records;
  },
  async show(workspaceId: string, id: string): Promise<ProjectRecord> {
    const result = await apiRequest<{ data: ProjectRecord }>(`/api/projects/${encodeURIComponent(id)}`, { workspaceId });
    return result.data;
  },
  async create(workspaceId: string, payload: ProjectInput): Promise<ProjectRecord> {
    const result = await apiRequest<{ data: ProjectRecord }>('/api/projects', {
      method: 'POST',
      workspaceId,
      body: payload,
    });
    return result.data;
  },
  async update(workspaceId: string, id: string, payload: Partial<ProjectInput>): Promise<ProjectRecord> {
    const result = await apiRequest<{ data: ProjectRecord }>(`/api/projects/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      workspaceId,
      body: payload,
    });
    return result.data;
  },
  async remove(workspaceId: string, id: string): Promise<void> {
    await apiRequest(`/api/projects/${encodeURIComponent(id)}`, { method: 'DELETE', workspaceId });
  },
};
