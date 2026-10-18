import { apiRequest } from '../api/apiClient';

export interface TaskMetrics {
  total: number;
  completed: number;
  incomplete: number;
  completion_rate: number | null;
}

export interface CrmFunnelItem {
  status: string;
  count: number;
}

export interface CrmMetrics {
  leads: number;
  converted_leads: number;
  conversion_rate: number | null;
  funnel: CrmFunnelItem[];
  customers: number | null;
}

export interface CampaignFinancials {
  budget: string | number;
  spend: string | number;
  revenue: string | number;
  return_on_spend: number | null;
}

export interface FinanceMetrics {
  income: string | number;
  expenses: string | number;
  profit: number;
  budgeted_expenses: number | null;
}

export interface AnalyticsOverview {
  projects: number | null;
  campaigns: number | null;
  tasks: TaskMetrics | null;
  crm: CrmMetrics | null;
  campaign_financials: CampaignFinancials | null;
  finance: FinanceMetrics | null;
  definitions?: Record<string, string>;
}

export interface TimeSeriesPoint {
  date: string;
  value: number | string;
}

export interface AnalyticsTimeSeries {
  series: {
    projects: TimeSeriesPoint[] | null;
    campaigns: TimeSeriesPoint[] | null;
    tasks: TimeSeriesPoint[] | null;
    leads: TimeSeriesPoint[] | null;
    income: TimeSeriesPoint[] | null;
    expenses: TimeSeriesPoint[] | null;
  };
}

export function getPeriodDateRange(period: string): { from?: string; to?: string } {
  switch (period) {
    case 'October 2026':
      return { from: '2026-10-01', to: '2026-10-31' };
    case 'September 2026':
      return { from: '2026-09-01', to: '2026-09-30' };
    case 'August 2026':
      return { from: '2026-08-01', to: '2026-08-31' };
    case 'Last 30 days': {
      const to = new Date();
      const from = new Date();
      from.setDate(to.getDate() - 30);
      return {
        from: from.toISOString().slice(0, 10),
        to: to.toISOString().slice(0, 10),
      };
    }
    case 'Year to date (2026)':
      return { from: '2026-01-01', to: '2026-12-31' };
    case 'All time':
    default:
      return {};
  }
}

export const dashboardService = {
  async getOverview(
    workspaceId: string,
    params: { from?: string; to?: string } = {}
  ): Promise<AnalyticsOverview> {
    const query = new URLSearchParams();
    if (params.from) query.set('from', params.from);
    if (params.to) query.set('to', params.to);
    const queryString = query.toString() ? `?${query.toString()}` : '';
    const res = await apiRequest<{ data: AnalyticsOverview }>(`/api/analytics/overview${queryString}`, {
      workspaceId,
    });
    return res.data;
  },

  async getTimeSeries(
    workspaceId: string,
    params: { from?: string; to?: string } = {}
  ): Promise<AnalyticsTimeSeries> {
    const query = new URLSearchParams();
    if (params.from) query.set('from', params.from);
    if (params.to) query.set('to', params.to);
    const queryString = query.toString() ? `?${query.toString()}` : '';
    const res = await apiRequest<{ data: AnalyticsTimeSeries }>(`/api/analytics/timeseries${queryString}`, {
      workspaceId,
    });
    return res.data;
  },
};
