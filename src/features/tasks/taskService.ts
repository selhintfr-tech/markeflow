import { apiRequest, type ApiCollection } from '../api/apiClient';
import type { TaskPriority, TaskStatus } from './types';

export interface TaskRecord {
  id: string;
  workspace_id: string;
  project_id: string | null;
  campaign_id: string | null;
  created_by: number;
  assignee_id: number | null;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  due_date: string;
  project?: { id: string; name: string } | null;
  campaign?: { id: string; name: string } | null;
  assignee?: { id: number; name: string; email: string } | null;
  created_at: string;
  updated_at: string;
}

export type TaskInput = Pick<TaskRecord, 'title' | 'due_date'> &
  Partial<Pick<TaskRecord, 'project_id' | 'campaign_id' | 'assignee_id' | 'description' | 'status' | 'priority'>>;

export const taskService = {
  async list(workspaceId: string, params: { search?: string; status?: string; priority?: string; project_id?: string; assignee_id?: number } = {}): Promise<TaskRecord[]> {
    const query = new URLSearchParams({ per_page: '100', page: '1' });
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== '') query.set(key, String(value));
    }
    const records: TaskRecord[] = [];
    while (true) {
      const result = await apiRequest<ApiCollection<TaskRecord>>(`/api/tasks?${query}`, { workspaceId });
      records.push(...result.data);
      if (!result.meta || Number(query.get('page')) >= result.meta.last_page) break;
      query.set('page', String(Number(query.get('page')) + 1));
    }
    return records;
  },
  async show(workspaceId: string, id: string): Promise<TaskRecord> {
    const result = await apiRequest<{ data: TaskRecord }>(`/api/tasks/${encodeURIComponent(id)}`, { workspaceId });
    return result.data;
  },
  async create(workspaceId: string, payload: TaskInput): Promise<TaskRecord> {
    const result = await apiRequest<{ data: TaskRecord }>('/api/tasks', {
      method: 'POST',
      workspaceId,
      body: payload,
    });
    return result.data;
  },
  async update(workspaceId: string, id: string, payload: Partial<TaskInput>): Promise<TaskRecord> {
    const result = await apiRequest<{ data: TaskRecord }>(`/api/tasks/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      workspaceId,
      body: payload,
    });
    return result.data;
  },
  async remove(workspaceId: string, id: string): Promise<void> {
    await apiRequest(`/api/tasks/${encodeURIComponent(id)}`, { method: 'DELETE', workspaceId });
  },
};
