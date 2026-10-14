export type ReportStatus = 'Ready' | 'In Review' | 'Draft' | 'Archived';

export type ReportType = 'Campaign Performance' | 'Financial Summary' | 'Lead Conversion' | 'Project Overview' | 'Custom Report';

export interface ReportTypeCard {
  id: ReportType;
  title: string;
  description: string;
  icon: string;
  color: string;
}

export interface ReportMetrics {
  adSpend: number;
  leads: number;
  revenue: number;
  estimatedProfit: number;
  costOfGoods?: number;
  otherCosts?: number;
}

export interface PerformanceDataPoint {
  date: string;
  leads: number;
  revenue?: number;
}

export interface ChannelPerformance {
  channel: string;
  value: number;
}

export interface Report {
  id: string;
  name: string;
  type: ReportType;
  company: string;
  workspaceId: string;
  reportingPeriod: string;
  createdBy: string;
  createdDate: string;
  status: ReportStatus;
  campaign?: string;
  project?: string;
  metrics?: ReportMetrics;
  performanceData?: PerformanceDataPoint[];
  channelPerformance?: ChannelPerformance[];
  keyTakeaways?: string[];
}

export interface ReportFilterState {
  search: string;
  company: string;
  status: ReportStatus | 'All';
}

export interface ReportFormData {
  name: string;
  type: ReportType;
  workspaceId: string;
  reportingPeriod: string;
  campaign?: string;
  project?: string;
}
