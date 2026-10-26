export type CampaignStatus = 'Active' | 'Planned' | 'Completed' | 'Archived' | 'Draft';

export type CampaignPlatform = 'Meta Ads' | 'Google Ads' | 'Email' | 'TikTok Ads' | 'LinkedIn Ads' | 'Multi-channel';

export interface CampaignItem {
  id: string;
  name: string;
  description: string;
  workspaceId: string;
  workspaceName: string;
  projectId: string;
  projectName: string;
  platform: CampaignPlatform;
  channel: string;
  startDate: string;
  endDate: string | null;
  periodLabel?: string;
  adBudget: number;
  adSpend: number;
  leads: number;
  acquiredCustomers?: number;
  revenue?: number;
  roas?: number;
  status: CampaignStatus;
  campaignType?: string;
  objectiveType?: string;
  dataSource?: string;
}

export interface SpendPerformancePoint {
  date: string;
  actualSpend: number;
  plannedBudget: number;
}

export interface CampaignObjective {
  id: string;
  text: string;
  status: 'On track' | 'In progress' | 'Behind' | 'Completed';
}

export interface CampaignActivityItem {
  id: string;
  icon: 'settings' | 'import' | 'status' | 'budget';
  title: string;
  description: string;
  timestamp: string;
}
