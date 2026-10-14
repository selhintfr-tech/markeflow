// Analytics mock data for Marketing Analytics page

export interface AnalyticsKpi {
  id: string;
  label: string;
  value: string;
  icon: string;
}

export interface PerformancePoint {
  date: string;
  leads: number;
  spend: number;
  customers: number;
}

export interface FunnelStage {
  label: string;
  count: number;
  percentage: number;
  color: string;
}

export interface ChannelDataPoint {
  channel: string;
  spend: number;
  leads: number;
  cpl: number;
}

export interface DetailedKpiRow {
  metric: string;
  value: string;
  changeVsPrev: string;
  changeType: 'positive' | 'negative';
  source: string;
  notes: string;
  icon: string;
}

export const analyticsKpis: AnalyticsKpi[] = [
  { id: 'ad-spend', label: 'Ad Spend', value: '5,400 MAD', icon: 'megaphone' },
  { id: 'leads', label: 'Leads', value: '180', icon: 'users' },
  { id: 'cost-per-lead', label: 'Cost Per Lead', value: '30 MAD', icon: 'coins' },
  { id: 'customers', label: 'Customers', value: '60', icon: 'user-check' },
  { id: 'lead-conversion', label: 'Lead Conversion', value: '33.3%', icon: 'percent' },
  { id: 'roas', label: 'ROAS', value: '2.48×', icon: 'trending-up' },
];

export const performanceOverTimeData: PerformancePoint[] = [
  { date: '1 Oct', leads: 3, spend: 180, customers: 1 },
  { date: '3 Oct', leads: 5, spend: 210, customers: 1 },
  { date: '5 Oct', leads: 8, spend: 250, customers: 2 },
  { date: '8 Oct', leads: 7, spend: 240, customers: 2 },
  { date: '10 Oct', leads: 12, spend: 310, customers: 3 },
  { date: '12 Oct', leads: 10, spend: 290, customers: 3 },
  { date: '15 Oct', leads: 22, spend: 420, customers: 6 },
  { date: '18 Oct', leads: 16, spend: 370, customers: 5 },
  { date: '20 Oct', leads: 20, spend: 400, customers: 6 },
  { date: '22 Oct', leads: 18, spend: 380, customers: 6 },
  { date: '25 Oct', leads: 24, spend: 450, customers: 8 },
  { date: '28 Oct', leads: 21, spend: 430, customers: 7 },
  { date: '31 Oct', leads: 34, spend: 560, customers: 10 },
];

export const funnelData: FunnelStage[] = [
  { label: 'New', count: 180, percentage: 100, color: '#6D28D9' },
  { label: 'Contacted', count: 120, percentage: 66.7, color: '#7C3AED' },
  { label: 'Qualified', count: 90, percentage: 50.0, color: '#8B5CF6' },
  { label: 'Converted', count: 60, percentage: 33.3, color: '#14B8A6' },
];

export const channelPerformanceData: ChannelDataPoint[] = [
  { channel: 'Meta Ads', spend: 2400, leads: 80, cpl: 30 },
  { channel: 'Email', spend: 1200, leads: 50, cpl: 24 },
  { channel: 'Search', spend: 1200, leads: 40, cpl: 30 },
  { channel: 'Organic', spend: 600, leads: 10, cpl: 60 },
];

export const detailedKpiRows: DetailedKpiRow[] = [
  {
    metric: 'Ad Spend',
    value: '5,400 MAD',
    changeVsPrev: '+28%',
    changeType: 'positive',
    source: 'Manual entry / CSV import',
    notes: 'Total advertising spend across all channels',
    icon: 'megaphone',
  },
  {
    metric: 'Leads',
    value: '180',
    changeVsPrev: '+20%',
    changeType: 'positive',
    source: 'Manual entry / CSV import',
    notes: 'Total leads generated from campaign',
    icon: 'users',
  },
  {
    metric: 'Cost Per Lead',
    value: '30 MAD',
    changeVsPrev: '+7%',
    changeType: 'positive',
    source: 'Manual entry / CSV import',
    notes: 'Ad spend divided by total leads',
    icon: 'coins',
  },
  {
    metric: 'Customers',
    value: '60',
    changeVsPrev: '+33%',
    changeType: 'positive',
    source: 'Manual entry / CSV import',
    notes: 'Total converted customers',
    icon: 'user-check',
  },
  {
    metric: 'Lead Conversion',
    value: '33.3%',
    changeVsPrev: '+11%',
    changeType: 'positive',
    source: 'Manual entry / CSV import',
    notes: 'Percentage of leads that converted to customers',
    icon: 'percent',
  },
  {
    metric: 'ROAS',
    value: '2.48×',
    changeVsPrev: '+18%',
    changeType: 'positive',
    source: 'Manual entry / CSV import',
    notes: 'Revenue generated per 1 MAD of ad spend',
    icon: 'trending-up',
  },
];

export const campaignOptions = ['Autumn Launch 2026', 'Holiday Season Push', 'Brand Awareness Q4'];
export const channelOptions = ['All channels', 'Meta Ads', 'Email', 'Search', 'Organic'];
export const dateRangeOptions = ['01 Oct 2026 – 31 Oct 2026', '01 Sep 2026 – 30 Sep 2026', '01 Aug 2026 – 31 Aug 2026'];
