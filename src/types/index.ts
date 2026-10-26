export type AdvertisingPlatform = 'meta_ads' | 'instagram_ads' | 'google_search' | 'youtube_ads';

export type CampaignStatus = 'Active' | 'Scheduled' | 'Completed' | 'Draft' | 'Paused';

export interface Campaign {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  status: CampaignStatus;
  budget: number;
  spent?: number;
  leads: number;
  roi: number; // percentage, e.g. 42 for +42%
  platform: AdvertisingPlatform;
  channel?: string;
  color?: string;
}

export interface UpcomingTask {
  id: string;
  title: string;
  description: string;
  dueDate: string;
  completed: boolean;
}

export interface MarketingPerformancePoint {
  date: string;
  reach: number;
  clicks: number;
}

export interface Workspace {
  id: string;
  name: string;
  icon?: string;
}

export interface WorkspaceMemberAvatar {
  id: string;
  name: string;
  initials: string;
  avatarUrl?: string;
  bgColor?: string;
  textColor?: string;
}

export interface WorkspaceDetail extends Workspace {
  description: string;
  location: string;
  currency?: string;
  membersCount?: number;
  membersAvatars: WorkspaceMemberAvatar[];
  extraMembersCount?: number;
  projectsCount?: number;
  status: 'Active' | 'Inactive' | string;
  iconType?: 'building' | 'users' | 'store';
}

export type MarketingProjectStatus = 'Active' | 'Completed' | 'Archived' | 'Draft';

export interface MarketingProjectItem {
  id: string;
  name: string;
  description: string;
  workspaceId: string;
  workspaceName: string;
  workspaceIconType?: 'building' | 'users';
  owner: {
    name: string;
    initials: string;
    avatarBg?: string;
    avatarColor?: string;
  };
  progress: number;
  startDate: string;
  endDate: string;
  status: MarketingProjectStatus;
  createdAt?: string;
}

export interface UserProfile {
  name: string;
  initials: string;
  email: string;
  avatarUrl?: string;
}

export interface DashboardOverviewStats {
  activeCampaigns: {
    value: number;
    changePercentage: number;
    changeLabel: string;
  };
  advertisingSpend: {
    value: number;
    currency: string;
    changePercentage: number;
    changeLabel: string;
  };
  leadsGenerated: {
    value: number;
    changePercentage: number;
    changeLabel: string;
  };
  estimatedProfit: {
    value: number;
    currency: string;
    changePercentage: number;
    changeLabel: string;
  };
}

export interface BudgetUtilization {
  spent: number;
  allocated: number;
  percentage: number;
  currency: string;
  period: string;
}

// --- Project Types ---
export interface ProjectMilestone {
  id: string;
  number: number;
  title: string;
  status: 'Completed' | 'Upcoming' | 'In progress';
  dueDate: string;
}

export interface ProjectTaskItem {
  id: string;
  title: string;
  assignee: {
    name: string;
    initials: string;
  };
  dueDate: string;
  status: 'Completed' | 'In progress' | 'Upcoming';
  checked: boolean;
}

export interface ProjectLinkedCampaign {
  id: string;
  name: string;
  channel: string;
  status: 'Active' | 'Scheduled' | 'Draft' | 'Completed';
  leads: number | null; // null for '-'
  budget: number;
}

export interface ProjectDetail {
  id: string;
  name: string;
  status: 'Active' | 'Completed' | 'Planned' | 'On hold' | 'Archived';
  owner: UserProfile;
  workspace: string;
  dateRange: string;
  executiveSummary: string;
  objectives: string[];
  progressPercentage: number | null;
  completedTasksCount: number;
  totalTasksCount: number;
  achievedMilestonesCount: number;
  totalMilestonesCount: number;
  milestones: ProjectMilestone[];
  linkedCampaigns: ProjectLinkedCampaign[];
  tasks: ProjectTaskItem[];
  taskCompletionCount: number;
  taskCompletionTotal: number;
  taskCompletionPercentage: number;
  budget: {
    allocated: number;
    spent: number;
    remaining: number;
    utilizationPercentage: number;
    currency: string;
  };
}

// --- Strategy Types ---
export interface StrategyAudienceItem {
  id: string;
  title: string;
  description: string;
  iconType: 'users' | 'cart' | 'lookalike';
}

export interface StrategyMeasurableObjective {
  id: string;
  kpi: string;
  target: string;
  currentProgressText: string;
  progressPercentage: number | null;
  owner: {
    name: string;
    initials: string;
  };
  deadline: string;
  statusType?: 'teal' | 'purple' | 'warning';
}

export interface StrategyChannelAllocation {
  id: string;
  channel: string;
  percentage: number;
  badge: string;
  iconType: 'social' | 'email' | 'search' | 'content';
}

export interface StrategicInitiative {
  id: string;
  name: string;
  relatedArea: string;
  status: 'In progress' | 'Active' | 'Planned' | 'In review' | 'Completed';
  owner: {
    name: string;
    initials: string;
  };
  nextStep: string;
}

export interface StrategyDetail {
  id: string;
  title: string;
  projectId: string;
  projectName: string;
  status: 'Active' | 'Draft' | 'Completed';
  owner: UserProfile;
  workspace: string;
  period: string;
  overviewDescription: string;
  audiences: StrategyAudienceItem[];
  completionPercentage: number | null;
  objectivesOnTrack: number | null;
  objectivesTotal: number | null;
  channelsActive: number;
  channelsTotal: number;
  initiativesInProgressCount: number;
  objectives: StrategyMeasurableObjective[];
  channelAllocations: StrategyChannelAllocation[];
  initiatives: StrategicInitiative[];
}

// --- Audiences Types ---
export type CustomerType = 'Prospects' | 'Existing customers' | 'Leads';

export interface AudienceSegmentFilterConditions {
  city: string;
  ageRange: string;
  customerStatus: string;
  interests: string;
  acquisitionSource: string;
}

export interface AudienceSegmentModuleConnections {
  crmContactsCount: number;
  campaigns: string[];
}

export interface AudienceSegment {
  id: string;
  name: string;
  region: string;
  customerType: CustomerType;
  ageRange: string;
  contactCount: number;
  associatedCampaigns: string[];
  updated: string;
  status: 'Active' | 'Draft' | 'Archived';
  description?: string;
  filterConditions: AudienceSegmentFilterConditions;
  moduleConnections: AudienceSegmentModuleConnections;
}

export interface AudiencesKPIStats {
  totalContacts: {
    value: number;
    trend: number;
    trendLabel: string;
  };
  activeSegments: {
    value: number;
    trend: number;
    trendLabel: string;
  };
  qualifiedLeads: {
    value: number;
    trend: number;
    trendLabel: string;
  };
}

// --- Content Calendar Types ---
export type ContentPlatform =
  | 'Instagram'
  | 'Facebook'
  | 'Email'
  | 'Meta Ads'
  | 'X'
  | 'LinkedIn'
  | 'YouTube'
  | 'Video'
  | 'Media'
  | 'Blog'
  | 'Website';

export type ContentStatus = 'Draft' | 'In Review' | 'Approved' | 'Scheduled';

export interface ContentAttachment {
  id: string;
  name: string;
  size: string;
  type: 'Image' | 'Text' | 'Document';
  thumbnailUrl?: string;
}

export interface ContentCalendarItem {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  time?: string;
  platform: ContentPlatform;
  status: ContentStatus;
  campaign: string;
  workspace: string;
  caption: string;
  assignedTo: {
    name: string;
    initials: string;
    role: string;
  };
  attachments: ContentAttachment[];
}

// --- Market Research Types (Page 6) ---
export type StudyStatus = 'Active' | 'Completed' | 'Draft' | 'Archived';
export type ConfidenceLevel = 'High' | 'Medium' | 'Low';
export type NeedPriority = 'High' | 'Medium' | 'Low';
export type PriceLevel = 'Low' | 'Medium' | 'High';
export type ReliabilityLevel = 'High' | 'Medium' | 'Low';
export type FindingStatus = 'New' | 'Reviewed' | 'Ready' | 'Archived';

export interface MarketObservation {
  id: string;
  observation: string;
  evidence: string;
  region: string;
  confidence: ConfidenceLevel;
  dateRecorded: string;
}

export interface CustomerNeed {
  id: string;
  need: string;
  segment: string;
  evidenceSource: string;
  priority: NeedPriority;
  owner: string; // initials like 'SE'
}

export interface CompetitorComparison {
  id: string;
  competitor: string;
  positioning: string;
  priceLevel: PriceLevel;
  mainOffer: string;
  strengths: string;
  weaknesses: string;
  lastReviewed: string;
}

export interface PricingObservation {
  id: string;
  category: string;
  observation: string;
  evidence: string;
  impact: 'High' | 'Medium' | 'Low';
}

export interface SourceReference {
  id: string;
  source: string;
  type: string;
  date: string;
  notes: string;
  reliability: ReliabilityLevel;
}

export interface RecordedFinding {
  id: string;
  finding: string;
  status: FindingStatus;
  date: string;
}

export interface MarketStudy {
  id: string;
  title: string;
  workspace: string;
  status: StudyStatus;
  owner: UserProfile;
  period: string;
  evidenceCount: number;
  lastUpdated: string;
  overviewDescription: string;
  linkedLinks: {
    projectsUrl: string;
    audiencesUrl: string;
    campaignsUrl: string;
  };
  observations: MarketObservation[];
  customerNeeds: CustomerNeed[];
  competitors: CompetitorComparison[];
  pricingObservations: PricingObservation[];
  sourceReferences: SourceReference[];
  recordedFindings: RecordedFinding[];
}

// --- SWOT Analysis Types (Page 7) ---
export type SwotCategory = 'strengths' | 'weaknesses' | 'opportunities' | 'threats';

export interface SwotItem {
  id: string;
  number: number;
  title: string;
  description: string;
}

export type StrategicActionStatus = 'In progress' | 'Planned' | 'Completed' | 'On hold';

export interface StrategicAction {
  id: string;
  action: string;
  factorCategory: 'Strength' | 'Weakness' | 'Opportunity' | 'Threat';
  factorTitle: string;
  owner: {
    name: string;
    initials: string;
  };
  dueDate: string;
  status: StrategicActionStatus;
}

export interface SwotAnalysisData {
  id: string;
  strategyId: string;
  strategyName: string;
  author: string;
  lastUpdated: string;
  strengths: SwotItem[];
  weaknesses: SwotItem[];
  opportunities: SwotItem[];
  threats: SwotItem[];
  strategicActions: StrategicAction[];
}

// --- Budget & Expenses Types ---
export type ExpenseCategory = 'Advertising' | 'Cost of Goods' | 'Other Operating Expenses';

export type ExpenseType =
  | 'Meta Ads'
  | 'Google Ads'
  | 'Printing'
  | 'Product Samples'
  | 'Delivery / Logistics'
  | 'Software / Tools'
  | 'Freelancer'
  | string;

export interface ExpenseItem {
  id: string;
  date: string; // e.g. "03 Oct 2026"
  category: ExpenseCategory;
  expenseType: ExpenseType;
  description: string;
  linkedCampaign?: string;
  linkedProject?: string;
  amount: number;
  recordedBy: {
    name: string;
    initials: string;
    avatarBg?: string;
    avatarColor?: string;
  };
}

export interface ExpenseCategorySummary {
  name: ExpenseCategory;
  amount: number;
  percentage: number;
  iconName: 'Megaphone' | 'Package' | 'Wallet';
  barColor: string;
}

export interface SpendChartPoint {
  date: string;
  planned: number;
  actual: number;
}

export interface BudgetFinancialSnapshot {
  plannedBudget: number;
  actualSpend: number;
  remainingBudget: number;
  budgetUtilization: number;
  currency: string;
  period: string;
  campaign: string;
  project: string;
  workspace: string;
}

// --- CRM & Leads Types ---
export type CRMLeadStatus = 'New' | 'Contacted' | 'Qualified' | 'Converted';

export interface CRMLeadActivity {
  id: string;
  title: string;
  date: string;
  description: string;
  type?: 'create' | 'email' | 'call' | 'note' | 'meeting';
}

export interface CRMLead {
  id: string;
  name: string;
  company: string;
  email: string;
  phone: string;
  sourceCampaign: string;
  leadStatus: CRMLeadStatus;
  assignedTo: {
    name: string;
    initials: string;
    avatarBg?: string;
    avatarColor?: string;
  };
  createdDate: string;
  preferredContact?: string;
  location?: string;
  nextFollowUp?: string;
  relatedProject?: string;
  internalNotes?: string;
  activities: CRMLeadActivity[];
}

export interface CRMFunnelStage {
  status: CRMLeadStatus;
  label: string;
  count: number;
  color: string;
  dotColor: string;
}

// --- Archive Types ---
export type ArchiveCategory = 'Projects' | 'Campaigns' | 'Reports' | 'Files';
export type ArchiveRecordType = 'Campaign' | 'Project' | 'Report' | 'File Bundle';
export type ArchivePreviousStatus = 'Completed' | 'Archived' | 'On Hold' | 'Final';

export interface ArchivedRecord {
  id: string;
  name: string;
  subtitle: string;
  type: ArchiveRecordType;
  category: ArchiveCategory;
  workspace: string;
  archivedDate: string;
  archivedTime?: string;
  archivedBy: string;
  previousStatus: ArchivePreviousStatus;
  destination: string;
  description?: string;
}

// --- Profile & Security Types ---
export interface UserProfile {
  name: string;
  initials: string;
  email: string;
  avatarUrl?: string;
  phone?: string;
  role?: string;
  language?: string;
  timezone?: string;
  memberSince?: string;
  workspaceName?: string;
}

export interface ActiveSession {
  id: string;
  device: string;
  browser: string;
  location: string;
  lastActive: string;
  isCurrent: boolean;
  deviceType: 'desktop' | 'mobile';
  ipAddress?: string;
}

// --- Performance Comparison Types ---
export interface CampaignComparisonMetrics {
  id: string;
  name: string;
  workspaceId: string;
  workspaceName: string;
  revenue: number;
  advertisingSpend: number;
  costOfGoods?: number;
  otherCosts?: number;
  totalCosts: number;
  profit: number;
  leads: number;
  dateRange: string;
  status: string;
  projectId?: string;
}

export interface MetricComparisonRow {
  metric: string;
  iconName: 'Coins' | 'FileText' | 'TrendingUp' | 'Users';
  valA: number;
  valB: number;
  diff: number;
  unit: string;
  isProfit?: boolean;
  isCost?: boolean;
  observation: string;
}

