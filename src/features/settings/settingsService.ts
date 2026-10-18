import { apiRequest } from '../api/apiClient';
import type { WorkspaceRecord } from '../workspaces/workspaceService';

export const settingsService = {
  async getWorkspace(id: string): Promise<WorkspaceRecord> {
    const response = await apiRequest<{ data: WorkspaceRecord }>(
      `/api/workspaces/${encodeURIComponent(id)}`,
    );
    return response.data;
  },
};
