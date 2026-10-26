import { apiRequest, type ApiCollection } from '../api/apiClient';

export interface ProjectRecord {
  id: string;
  workspace_id: string;
  owner_id: number;
  owner?: { id: number; name: string } | null;
  name: string;
  description: string | null;
  objectives?: string[];
  status: string;
  start_date: string;
  end_date: string;
  progress: number;
  created_at: string;
  updated_at: string;
  milestones?: ProjectMilestoneRecord[];
  activities?: ProjectActivityRecord[];
}

export type ProjectInput = Pick<ProjectRecord, 'name' | 'start_date' | 'end_date'> &
  Partial<Pick<ProjectRecord, 'description' | 'objectives' | 'status' | 'progress'>>;

export interface ProjectMilestoneRecord {
  id: string;
  project_id: string;
  title: string;
  description: string | null;
  due_date: string | null;
  status: 'planned' | 'in_progress' | 'completed';
  completed_at: string | null;
}

export interface ProjectActivityRecord {
  id: string;
  action: string;
  summary: string;
  user: string | null;
  created_at: string;
}

export const projectService = {
  async list(workspaceId: string, params: { search?: string; status?: string } = {}): Promise<ProjectRecord[]> {
    const query = new URLSearchParams({ per_page: '100', page: '1' });
    if (params.search) query.set('search', params.search);
    if (params.status) query.set('status', params.status);
    const records: ProjectRecord[] = [];
    while (true) {
      const result = await apiRequest<ApiCollection<ProjectRecord>>(`/api/projects?${query}`, {
        workspaceId,
        cacheTtlMs: 10_000,
      });
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
  async createMilestone(workspaceId: string, projectId: string, payload: Pick<ProjectMilestoneRecord, 'title'> & Partial<Pick<ProjectMilestoneRecord, 'description' | 'due_date' | 'status'>>): Promise<ProjectMilestoneRecord> {
    const result = await apiRequest<{ data: ProjectMilestoneRecord }>(`/api/projects/${encodeURIComponent(projectId)}/milestones`, {
      method: 'POST',
      workspaceId,
      body: payload,
    });
    return result.data;
  },
  async updateMilestone(workspaceId: string, projectId: string, milestoneId: string, payload: Partial<Pick<ProjectMilestoneRecord, 'title' | 'description' | 'due_date' | 'status'>>): Promise<ProjectMilestoneRecord> {
    const result = await apiRequest<{ data: ProjectMilestoneRecord }>(`/api/projects/${encodeURIComponent(projectId)}/milestones/${encodeURIComponent(milestoneId)}`, {
      method: 'PATCH',
      workspaceId,
      body: payload,
    });
    return result.data;
  },
  async removeMilestone(workspaceId: string, projectId: string, milestoneId: string): Promise<void> {
    await apiRequest(`/api/projects/${encodeURIComponent(projectId)}/milestones/${encodeURIComponent(milestoneId)}`, {
      method: 'DELETE',
      workspaceId,
    });
  },
};
