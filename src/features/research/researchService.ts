import { apiRequest, type ApiCollection } from '../api/apiClient';

export type ResearchStatus = 'Planned' | 'In Progress' | 'Completed' | 'Archived';
export type SwotCategoryBackend = 'strength' | 'weakness' | 'opportunity' | 'threat';

export interface SwotItemBackend {
  category: SwotCategoryBackend;
  item: string;
  notes?: string | null;
}

export interface CompetitorProfileBackend {
  name: string;
  website?: string | null;
  description?: string | null;
  strengths?: string[];
  weaknesses?: string[];
}

export interface OpportunityThreatBackend {
  title: string;
  description?: string | null;
}

export interface FindingBackend {
  title: string;
  insight: string;
}

export interface SourceBackend {
  title: string;
  url: string;
  accessed_on?: string | null;
}

export interface ResearchRecord {
  id: string;
  workspace_id: string;
  created_by: number;
  name: string;
  category: string;
  status: ResearchStatus;
  description: string | null;
  starts_on: string | null;
  ends_on: string | null;
  competitor_profiles: CompetitorProfileBackend[];
  opportunities: OpportunityThreatBackend[];
  threats: OpportunityThreatBackend[];
  findings: FindingBackend[];
  swot: SwotItemBackend[];
  sources: SourceBackend[];
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface ResearchInput {
  name: string;
  category: string;
  status?: ResearchStatus;
  description?: string | null;
  starts_on?: string | null;
  ends_on?: string | null;
  competitor_profiles?: CompetitorProfileBackend[];
  opportunities?: OpportunityThreatBackend[];
  threats?: OpportunityThreatBackend[];
  findings?: FindingBackend[];
  swot?: SwotItemBackend[];
  sources?: SourceBackend[];
  notes?: string | null;
}

export const researchService = {
  async list(
    workspaceId: string,
    params: {
      search?: string;
      category?: string;
      status?: string;
      from?: string;
      to?: string;
    } = {},
  ): Promise<ResearchRecord[]> {
    const query = new URLSearchParams({ per_page: '100', page: '1' });
    if (params.search) query.set('search', params.search);
    if (params.category) query.set('category', params.category);
    if (params.status) query.set('status', params.status);
    if (params.from) query.set('from', params.from);
    if (params.to) query.set('to', params.to);

    const records: ResearchRecord[] = [];
    while (true) {
      const result = await apiRequest<ApiCollection<ResearchRecord>>(`/api/research?${query.toString()}`, {
        workspaceId,
      });
      records.push(...result.data);
      if (!result.meta || Number(query.get('page')) >= result.meta.last_page) break;
      query.set('page', String(Number(query.get('page')) + 1));
    }
    return records;
  },

  async get(workspaceId: string, id: string): Promise<ResearchRecord> {
    const response = await apiRequest<{ data: ResearchRecord }>(`/api/research/${id}`, { workspaceId });
    return response.data;
  },

  async create(workspaceId: string, input: ResearchInput): Promise<ResearchRecord> {
    const response = await apiRequest<{ data: ResearchRecord }>('/api/research', {
      method: 'POST',
      workspaceId,
      body: input,
    });
    return response.data;
  },

  async update(workspaceId: string, id: string, input: Partial<ResearchInput>): Promise<ResearchRecord> {
    const response = await apiRequest<{ data: ResearchRecord }>(`/api/research/${id}`, {
      method: 'PATCH',
      workspaceId,
      body: input,
    });
    return response.data;
  },

  async delete(workspaceId: string, id: string): Promise<void> {
    await apiRequest<{ message: string }>(`/api/research/${id}`, {
      method: 'DELETE',
      workspaceId,
    });
  },
};
