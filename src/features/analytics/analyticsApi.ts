import { apiRequest, type ApiCollection } from '../api/apiClient';

export interface AnalyticsOverview {
  projects: number | null;
  campaigns: number | null;
  tasks: { total: number; completed: number; incomplete: number; completion_rate: number | null } | null;
  crm: {
    leads: number;
    converted_leads: number;
    conversion_rate: number | null;
    funnel: Array<{ status: string; count: number }>;
    customers: number | null;
  } | null;
  campaign_financials: { budget: string | number; spend: string | number; revenue: string | number; return_on_spend: number | null } | null;
  finance: { income: string | number; expenses: string | number; profit: number; budgeted_expenses: string | number | null } | null;
  definitions: Record<string, string>;
}

export interface TimeSeries {
  series: Record<string, Array<{ date: string; value: number | string }> | null>;
}

export interface SavedReport {
  id: string;
  workspace_id: string;
  created_by: number;
  name: string;
  type: 'overview' | 'campaigns' | 'tasks' | 'crm' | 'finance' | 'timeseries';
  from_date: string | null;
  to_date: string | null;
  filters: Record<string, string>;
  configuration: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface ReportResult {
  report: { id: string; name: string; type: SavedReport['type'] };
  period: { from: string | null; to: string | null };
  generated_at: string;
  data: unknown;
}

export interface PeriodComparison {
  current_period: { from: string; to: string };
  previous_period: { from: string; to: string };
  definition: string;
  metrics: Record<string, { current: number | null; previous: number | null; change: number | null; percent_change: number | null }>;
}

export interface CampaignComparison {
  campaign_a: { id: string; name: string };
  campaign_b: { id: string; name: string };
  definition: string;
  metrics: Record<string, { campaign_a: number; campaign_b: number; change: number; percent_change: number | null }>;
}

export const analyticsApi = {
  overview: (workspaceId: string, from: string, to: string) =>
    apiRequest<{ data: AnalyticsOverview }>(`/api/analytics/overview?from=${from}&to=${to}`, { workspaceId }).then((result) => result.data),
  timeseries: (workspaceId: string, from: string, to: string) =>
    apiRequest<{ data: TimeSeries }>(`/api/analytics/timeseries?from=${from}&to=${to}`, { workspaceId }).then((result) => result.data),
  async reports(workspaceId: string): Promise<SavedReport[]> {
    const query = new URLSearchParams({ per_page: '100', page: '1' });
    const records: SavedReport[] = [];
    while (true) {
      const result = await apiRequest<ApiCollection<SavedReport>>(`/api/reports?${query}`, { workspaceId });
      records.push(...result.data);
      if (!result.meta || Number(query.get('page')) >= result.meta.last_page) return records;
      query.set('page', String(Number(query.get('page')) + 1));
    }
  },
  report: (workspaceId: string, id: string) =>
    apiRequest<{ data: SavedReport }>(`/api/reports/${encodeURIComponent(id)}`, { workspaceId }).then((result) => result.data),
  createReport: (workspaceId: string, body: Partial<SavedReport>) =>
    apiRequest<{ data: SavedReport }>('/api/reports', { method: 'POST', workspaceId, body }).then((result) => result.data),
  updateReport: (workspaceId: string, id: string, body: Partial<SavedReport>) =>
    apiRequest<{ data: SavedReport }>(`/api/reports/${encodeURIComponent(id)}`, { method: 'PATCH', workspaceId, body }).then((result) => result.data),
  deleteReport: (workspaceId: string, id: string) =>
    apiRequest(`/api/reports/${encodeURIComponent(id)}`, { method: 'DELETE', workspaceId }),
  runReport: (workspaceId: string, id: string) =>
    apiRequest<{ data: ReportResult }>(`/api/reports/${encodeURIComponent(id)}/run`, { method: 'POST', workspaceId }).then((result) => result.data),
  async exportReport(workspaceId: string, id: string, name: string): Promise<void> {
    const response = await fetch(`/api/reports/${encodeURIComponent(id)}/export.csv`, {
      credentials: 'include',
      headers: { Accept: 'text/csv', 'X-Workspace-Id': workspaceId },
    });
    if (!response.ok) {
      throw new Error(`CSV export failed with HTTP ${response.status}.`);
    }
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${name.replace(/[^a-z0-9_-]/gi, '_')}.csv`;
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  },
  comparePeriods: (workspaceId: string, from: string, to: string, previousFrom?: string, previousTo?: string) => {
    const params = new URLSearchParams({ from, to });
    if (previousFrom && previousTo) {
      params.set('previous_from', previousFrom);
      params.set('previous_to', previousTo);
    }
    return apiRequest<{ data: PeriodComparison }>(`/api/comparisons/periods?${params}`, { workspaceId }).then((result) => result.data);
  },
  compareCampaigns: (workspaceId: string, campaignA: string, campaignB: string) => {
    const params = new URLSearchParams({ campaign_a: campaignA, campaign_b: campaignB });
    return apiRequest<{ data: CampaignComparison }>(`/api/comparisons/campaigns?${params}`, { workspaceId }).then((result) => result.data);
  },
};
