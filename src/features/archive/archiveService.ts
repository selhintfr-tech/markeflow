import { apiRequest, type ApiCollection } from '../api/apiClient';

export interface ArchiveRecord {
  id: string;
  recordId: string;
  recordType: 'Project' | 'Campaign';
  name: string;
  subtitle: string;
  type: 'Project' | 'Campaign';
  category: 'Projects' | 'Campaigns';
  workspace: string;
  archivedAt: string;
  archivedDate: string;
  archivedTime: string;
  archivedBy: string;
  previousStatus: string;
  destination: string;
  description: string | null;
}

export interface ArchiveFilters {
  search?: string;
  type?: ArchiveRecord['recordType'];
  status?: string;
  from?: string;
  to?: string;
}

export const archiveService = {
  async list(workspaceId: string, filters: ArchiveFilters = {}): Promise<ArchiveRecord[]> {
    const query = new URLSearchParams({ per_page: '100', page: '1' });
    for (const [key, value] of Object.entries(filters)) {
      if (value) query.set(key, value);
    }
    const records: ArchiveRecord[] = [];
    while (true) {
      const response = await apiRequest<ApiCollection<ArchiveRecord>>(`/api/archive?${query}`, { workspaceId });
      records.push(...response.data);
      if (!response.meta || Number(query.get('page')) >= response.meta.last_page) return records;
      query.set('page', String(Number(query.get('page')) + 1));
    }
  },
  async archive(workspaceId: string, record: ArchiveRecord): Promise<void> {
    await apiRequest(`/api/archive/${record.recordType}/${encodeURIComponent(record.recordId)}`, {
      method: 'POST',
      workspaceId,
    });
  },
  async restore(workspaceId: string, record: ArchiveRecord): Promise<void> {
    await apiRequest(`/api/archive/${record.recordType}/${encodeURIComponent(record.recordId)}/restore`, {
      method: 'POST',
      workspaceId,
    });
  },
};