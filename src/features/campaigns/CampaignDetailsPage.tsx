import React, { useState, useMemo, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ChevronRight,
  Edit2,
  Plus,
  ChevronDown,
  Building2,
  Calendar,
  FolderGit2,
  Wallet,
  BarChart2,
  Users,
  UserCheck,
  TrendingUp,
  ArrowDownRight,
  ArrowUpRight,
  CheckCircle2,
  CircleDot,
  Database,
  Info,
  Activity,
  ExternalLink,
  CalendarDays,
  ArrowRight,
  Archive,
  Trash2,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { useWorkspace } from '../../context/WorkspaceContext';
import type {
  CampaignItem,
  CampaignObjective,
  CampaignActivityItem,
  SpendPerformancePoint,
} from './types';
import {
  initialCampaignsList,
  initialSpendPerformanceData,
  initialCampaignObjectives,
  initialCampaignActivity,
} from './campaignsData';
import { CreateCampaignModal } from './components/CreateCampaignModal';
import { AddResultsModal } from './components/AddResultsModal';
import { EditObjectivesModal } from './components/EditObjectivesModal';

const STORAGE_KEY = 'marketflow_campaigns_v1';
const OBJECTIVES_KEY = 'marketflow_campaign_objectives_v1';
const ACTIVITY_KEY = 'marketflow_campaign_activity_v1';

// Custom Recharts Tooltip
const CustomSpendTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white border border-[#E2E8F0] rounded-lg shadow-md p-2.5 text-xs">
        <p className="font-semibold text-[#1E1B4B] mb-1">{label}</p>
        <div className="flex items-center gap-2 text-[#6D28D9]">
          <span className="w-2 h-2 rounded-full bg-[#6D28D9]" />
          <span>Actual spend: {payload[0]?.value?.toLocaleString()} MAD</span>
        </div>
        {payload[1] && (
          <div className="flex items-center gap-2 text-[#7C3AED] mt-0.5">
            <span className="w-2 h-2 rounded-full bg-[#A78BFA]" />
            <span>Planned budget: {payload[1]?.value?.toLocaleString()} MAD</span>
          </div>
        )}
      </div>
    );
  }
  return null;
};

export const CampaignDetailsPage: React.FC = () => {
  const { campaignId } = useParams<{ campaignId: string }>();
  const navigate = useNavigate();
  const { currentWorkspace } = useWorkspace();

  // Campaign list from localStorage
  const [campaigns, setCampaigns] = useState<CampaignItem[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) return JSON.parse(stored);
    } catch {
      // fallback
    }
    return initialCampaignsList;
  });

  // Current active campaign
  const campaign = useMemo(() => {
    if (!campaignId) return campaigns[0] || initialCampaignsList[0];
    const found = campaigns.find((c) => c.id === campaignId);
    if (found) return found;
    // Fallback to initial matching campaign or first campaign
    const initMatch = initialCampaignsList.find((c) => c.id === campaignId);
    return initMatch || campaigns[0] || initialCampaignsList[0];
  }, [campaignId, campaigns]);

  // Tab state
  const [activeTab, setActiveTab] = useState<string>('Overview');

  // Objectives state
  const [objectives, setObjectives] = useState<CampaignObjective[]>(() => {
    try {
      const stored = localStorage.getItem(OBJECTIVES_KEY);
      if (stored) return JSON.parse(stored);
    } catch {
      // fallback
    }
    return initialCampaignObjectives;
  });

  // Activity state
  const [activities, setActivities] = useState<CampaignActivityItem[]>(() => {
    try {
      const stored = localStorage.getItem(ACTIVITY_KEY);
      if (stored) return JSON.parse(stored);
    } catch {
      // fallback
    }
    return initialCampaignActivity;
  });

  // Spend chart curve data
  const [chartData, setChartData] = useState<SpendPerformancePoint[]>(initialSpendPerformanceData);

  // Modals state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isAddResultsOpen, setIsAddResultsOpen] = useState(false);
  const [isEditObjectivesOpen, setIsEditObjectivesOpen] = useState(false);
  const [showMoreActions, setShowMoreActions] = useState(false);

  // Save changes to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(campaigns));
    } catch {
      // ignore
    }
  }, [campaigns]);

  useEffect(() => {
    try {
      localStorage.setItem(OBJECTIVES_KEY, JSON.stringify(objectives));
    } catch {
      // ignore
    }
  }, [objectives]);

  useEffect(() => {
    try {
      localStorage.setItem(ACTIVITY_KEY, JSON.stringify(activities));
    } catch {
      // ignore
    }
  }, [activities]);

  // Handlers
  const handleUpdateCampaign = (campaignData: Partial<CampaignItem>) => {
    setCampaigns((prev) =>
      prev.map((c) => (c.id === campaign.id ? ({ ...c, ...campaignData } as CampaignItem) : c))
    );
  };

  const handleAddResults = (results: {
    reportingDate: string;
    adSpend: number;
    leads: number;
    customers: number;
    revenue: number;
    isIncremental: boolean;
  }) => {
    setCampaigns((prev) =>
      prev.map((c) => {
        if (c.id !== campaign.id) return c;
        const newSpend = results.isIncremental ? c.adSpend + results.adSpend : results.adSpend;
        const newLeads = results.isIncremental ? c.leads + results.leads : results.leads;
        const newCustomers = results.isIncremental
          ? (c.acquiredCustomers || 0) + results.customers
          : results.customers;
        const newRevenue = results.isIncremental
          ? (c.revenue || 0) + results.revenue
          : results.revenue;
        const newRoas = newSpend > 0 ? parseFloat((newRevenue / newSpend).toFixed(2)) : c.roas;

        return {
          ...c,
          adSpend: newSpend,
          leads: newLeads,
          acquiredCustomers: newCustomers,
          revenue: newRevenue,
          roas: newRoas,
        };
      })
    );

    // Add activity record
    const newActivity: CampaignActivityItem = {
      id: `act-${Date.now()}`,
      icon: 'import',
      title: 'Results imported',
      description: `${results.reportingDate}: ${results.adSpend.toLocaleString()} MAD spend, ${results.leads} leads recorded`,
      timestamp: 'Just now',
    };
    setActivities((prev) => [newActivity, ...prev]);

    // Update last chart point if relevant
    setChartData((prev) => {
      const copy = [...prev];
      if (copy.length > 0) {
        const last = copy[copy.length - 1];
        copy[copy.length - 1] = {
          ...last,
          actualSpend: results.isIncremental ? last.actualSpend + results.adSpend : results.adSpend,
        };
      }
      return copy;
    });
  };

  const handleArchiveCampaign = () => {
    setCampaigns((prev) =>
      prev.map((c) => (c.id === campaign.id ? { ...c, status: 'Archived' } : c))
    );
    setShowMoreActions(false);
  };

  const handleDeleteCampaign = () => {
    if (window.confirm('Are you sure you want to delete this campaign?')) {
      setCampaigns((prev) => prev.filter((c) => c.id !== campaign.id));
      navigate('/campaigns');
    }
  };

  // Calculations for KPI & Progress
  const adBudget = campaign.adBudget || 7500;
  const adSpend = campaign.adSpend || 5400;
  const leads = campaign.leads || 180;
  const acquiredCustomers = campaign.acquiredCustomers ?? 60;
  const roas = campaign.roas ?? 2.48;

  const remainingBudget = Math.max(0, adBudget - adSpend);
  const budgetUtilization = adBudget > 0 ? Math.round((adSpend / adBudget) * 100) : 0;
  const underBudgetPct = adBudget > 0 ? Math.round(((adBudget - adSpend) / adBudget) * 100) : 0;

  return (
    <div className="min-h-screen bg-[#F8F7FC] p-6 lg:p-8 space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-xs text-[#64748B]">
        <Link to="/campaigns" className="hover:text-[#6D28D9] font-medium transition-colors">
          Campaigns
        </Link>
        <span>/</span>
        <span className="text-[#1E1B4B] font-medium">{campaign.name}</span>
      </div>

      {/* Header with Title and Action Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-bold text-[#1E1B4B] tracking-tight">{campaign.name}</h1>
        <div className="flex items-center gap-2 relative">
          <button
            type="button"
            onClick={() => setIsEditModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 border border-[#6D28D9] text-[#6D28D9] hover:bg-[#F5F3FF] text-xs font-semibold rounded-lg bg-white transition-colors"
          >
            <Edit2 className="w-3.5 h-3.5" />
            <span>Edit Campaign</span>
          </button>

          <button
            type="button"
            onClick={() => setIsAddResultsOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#6D28D9] hover:bg-[#5B21B6] text-white text-xs font-semibold rounded-lg shadow-2xs transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Add Results</span>
          </button>

          <div className="relative">
            <button
              type="button"
              onClick={() => setShowMoreActions(!showMoreActions)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 border border-[#E2E8F0] hover:border-[#CBD5E1] text-[#1E1B4B] text-xs font-semibold rounded-lg bg-white transition-colors"
            >
              <span>More Actions</span>
              <ChevronDown className="w-3.5 h-3.5 text-[#94A3B8]" />
            </button>

            {showMoreActions && (
              <div className="absolute right-0 mt-1 w-44 bg-white border border-[#E2E8F0] rounded-lg shadow-lg z-30 py-1 text-xs text-[#1E1B4B]">
                <button
                  type="button"
                  onClick={() => {
                    setShowMoreActions(false);
                    setIsEditModalOpen(true);
                  }}
                  className="w-full text-left px-3 py-1.5 hover:bg-[#F5F3FF] flex items-center gap-2 text-[#1E1B4B]"
                >
                  <Edit2 className="w-3.5 h-3.5 text-[#6D28D9]" />
                  Edit Campaign
                </button>
                <button
                  type="button"
                  onClick={handleArchiveCampaign}
                  className="w-full text-left px-3 py-1.5 hover:bg-[#F5F3FF] flex items-center gap-2 text-[#64748B]"
                >
                  <Archive className="w-3.5 h-3.5 text-[#94A3B8]" />
                  Archive Campaign
                </button>
                <button
                  type="button"
                  onClick={handleDeleteCampaign}
                  className="w-full text-left px-3 py-1.5 hover:bg-red-50 flex items-center gap-2 text-red-600"
                >
                  <Trash2 className="w-3.5 h-3.5 text-red-500" />
                  Delete Campaign
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Metadata Strip */}
      <div className="flex flex-wrap items-center gap-4 sm:gap-6 py-2 text-xs">
        {/* Status Pill */}
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-[#ECFDF5] text-[#059669]">
          <span className="w-1.5 h-1.5 rounded-full bg-[#059669]" />
          {campaign.status}
        </span>

        {/* Platform */}
        <div className="flex items-center gap-2 border-l border-[#E2E8F0] pl-4 sm:pl-6">
          <div className="w-5 h-5 flex items-center justify-center text-[#0081FB]">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.477 2 2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.879V14.89h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.989C18.343 21.129 22 16.99 22 12c0-5.523-4.477-10-10-10z" />
            </svg>
          </div>
          <div>
            <div className="font-semibold text-[#1E1B4B]">{campaign.platform || 'Meta Ads'}</div>
            <div className="text-[10px] text-[#94A3B8]">Platform</div>
          </div>
        </div>

        {/* Project */}
        <div className="flex items-center gap-2 border-l border-[#E2E8F0] pl-4 sm:pl-6">
          <FolderGit2 className="w-4 h-4 text-[#6D28D9]" />
          <div>
            <Link
              to={`/projects/${campaign.projectId || 'autumn-sales-growth'}`}
              className="font-semibold text-[#1E1B4B] hover:text-[#6D28D9] hover:underline transition-colors"
            >
              {campaign.projectName || 'Autumn Sales Growth'}
            </Link>
            <div className="text-[10px] text-[#94A3B8]">Project</div>
          </div>
        </div>

        {/* Workspace */}
        <div className="flex items-center gap-2 border-l border-[#E2E8F0] pl-4 sm:pl-6">
          <Building2 className="w-4 h-4 text-[#64748B]" />
          <div>
            <div className="font-semibold text-[#1E1B4B]">
              {campaign.workspaceName || currentWorkspace?.name || 'Atlas Retail SARL'}
            </div>
            <div className="text-[10px] text-[#94A3B8]">Workspace</div>
          </div>
        </div>

        {/* Period */}
        <div className="flex items-center gap-2 border-l border-[#E2E8F0] pl-4 sm:pl-6">
          <Calendar className="w-4 h-4 text-[#64748B]" />
          <div>
            <div className="font-semibold text-[#1E1B4B]">
              {campaign.periodLabel || `${campaign.startDate} – ${campaign.endDate}`}
            </div>
            <div className="text-[10px] text-[#94A3B8]">Period</div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-[#E2E8F0] flex items-center gap-6 text-xs font-medium">
        {['Overview', 'Performance', 'Leads', 'Expenses', 'Content', 'Activity'].map((tab) => {
          const isActive = activeTab === tab;
          return (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`pb-2.5 transition-colors relative ${
                isActive
                  ? 'text-[#6D28D9] font-bold border-b-2 border-[#6D28D9]'
                  : 'text-[#64748B] hover:text-[#1E1B4B]'
              }`}
            >
              {tab}
            </button>
          );
        })}
      </div>

      {/* Main Tab Content */}
      {activeTab === 'Overview' ? (
        <>
          {/* 5 KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* KPI 1: Planned Ad Budget */}
            <div className="bg-white rounded-xl border border-[#E2E8F0] p-4 flex flex-col justify-between hover:shadow-xs transition-shadow">
              <div className="flex items-start justify-between">
                <div className="w-9 h-9 rounded-xl bg-[#F5F3FF] text-[#7C3AED] flex items-center justify-center">
                  <Wallet className="w-4.5 h-4.5" />
                </div>
                <div className="flex items-center gap-0.5 text-xs text-[#64748B]">
                  <span className="font-medium text-[11px]">Planned Ad Budget</span>
                  <ChevronRight className="w-3 h-3 text-[#94A3B8]" />
                </div>
              </div>
              <div className="mt-3">
                <div className="text-xl font-bold text-[#1E1B4B]">
                  {adBudget.toLocaleString()} MAD
                </div>
              </div>
            </div>

            {/* KPI 2: Actual Ad Spend */}
            <div className="bg-white rounded-xl border border-[#E2E8F0] p-4 flex flex-col justify-between hover:shadow-xs transition-shadow">
              <div className="flex items-start justify-between">
                <div className="w-9 h-9 rounded-xl bg-[#F0FDFA] text-[#0D9488] flex items-center justify-center">
                  <BarChart2 className="w-4.5 h-4.5" />
                </div>
                <div className="flex items-center gap-0.5 text-xs text-[#64748B]">
                  <span className="font-medium text-[11px]">Actual Ad Spend</span>
                  <ChevronRight className="w-3 h-3 text-[#94A3B8]" />
                </div>
              </div>
              <div className="mt-3">
                <div className="text-xl font-bold text-[#1E1B4B]">
                  {adSpend.toLocaleString()} MAD
                </div>
                <div className="flex items-center gap-1 text-[11px] font-medium text-[#0D9488] mt-1">
                  <ArrowDownRight className="w-3.5 h-3.5" />
                  <span>{underBudgetPct}% under budget</span>
                </div>
              </div>
            </div>

            {/* KPI 3: Leads */}
            <div className="bg-white rounded-xl border border-[#E2E8F0] p-4 flex flex-col justify-between hover:shadow-xs transition-shadow">
              <div className="flex items-start justify-between">
                <div className="w-9 h-9 rounded-xl bg-[#F0FDFA] text-[#0D9488] flex items-center justify-center">
                  <Users className="w-4.5 h-4.5" />
                </div>
                <div className="flex items-center gap-0.5 text-xs text-[#64748B]">
                  <span className="font-medium text-[11px]">Leads</span>
                  <ChevronRight className="w-3 h-3 text-[#94A3B8]" />
                </div>
              </div>
              <div className="mt-3">
                <div className="text-xl font-bold text-[#1E1B4B]">{leads}</div>
                <div className="flex items-center gap-1 text-[11px] font-medium text-[#0D9488] mt-1">
                  <ArrowUpRight className="w-3.5 h-3.5" />
                  <span>24% from target</span>
                </div>
              </div>
            </div>

            {/* KPI 4: Acquired Customers */}
            <div className="bg-white rounded-xl border border-[#E2E8F0] p-4 flex flex-col justify-between hover:shadow-xs transition-shadow">
              <div className="flex items-start justify-between">
                <div className="w-9 h-9 rounded-xl bg-[#F5F3FF] text-[#6D28D9] flex items-center justify-center">
                  <UserCheck className="w-4.5 h-4.5" />
                </div>
                <div className="flex items-center gap-0.5 text-xs text-[#64748B]">
                  <span className="font-medium text-[11px]">Acquired Customers</span>
                  <ChevronRight className="w-3 h-3 text-[#94A3B8]" />
                </div>
              </div>
              <div className="mt-3">
                <div className="text-xl font-bold text-[#1E1B4B]">{acquiredCustomers}</div>
                <div className="flex items-center gap-1 text-[11px] font-medium text-[#0D9488] mt-1">
                  <ArrowUpRight className="w-3.5 h-3.5" />
                  <span>20% from target</span>
                </div>
              </div>
            </div>

            {/* KPI 5: ROAS */}
            <div className="bg-white rounded-xl border border-[#E2E8F0] p-4 flex flex-col justify-between hover:shadow-xs transition-shadow">
              <div className="flex items-start justify-between">
                <div className="w-9 h-9 rounded-xl bg-[#F0FDFA] text-[#0D9488] flex items-center justify-center">
                  <TrendingUp className="w-4.5 h-4.5" />
                </div>
                <div className="flex items-center gap-0.5 text-xs text-[#64748B]">
                  <span className="font-medium text-[11px]">ROAS</span>
                  <ChevronRight className="w-3 h-3 text-[#94A3B8]" />
                </div>
              </div>
              <div className="mt-3">
                <div className="text-xl font-bold text-[#1E1B4B]">{roas}×</div>
                <div className="flex items-center gap-1 text-[11px] font-medium text-[#0D9488] mt-1">
                  <ArrowUpRight className="w-3.5 h-3.5" />
                  <span>18% from target</span>
                </div>
              </div>
            </div>
          </div>

          {/* Middle Grid: Left 2 cols, Right 1 col */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left 2 Cols: Spend Performance & Campaign Objectives & Linked Project */}
            <div className="lg:col-span-2 space-y-6">
              {/* Spend Performance Card */}
              <div className="bg-white rounded-xl border border-[#E2E8F0] p-5 shadow-2xs">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                  <h3 className="text-sm font-bold text-[#1E1B4B]">Spend performance</h3>
                  <div className="flex items-center gap-4 text-xs">
                    {/* Legend */}
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1.5 text-[#1E1B4B]">
                        <span className="w-2.5 h-2.5 rounded-full bg-[#6D28D9]" />
                        <span className="text-[11px]">Actual spend</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-[#64748B]">
                        <span className="w-3 h-0.5 border-t-2 border-dashed border-[#A78BFA]" />
                        <span className="text-[11px]">Planned budget</span>
                      </div>
                    </div>

                    {/* Selector */}
                    <div className="px-2 py-1 border border-[#E2E8F0] rounded-lg text-[11px] text-[#1E1B4B] flex items-center gap-1">
                      <span>Cumulative</span>
                      <ChevronDown className="w-3 h-3 text-[#94A3B8]" />
                    </div>
                  </div>
                </div>

                {/* Recharts Chart */}
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={chartData}
                      margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
                    >
                      <defs>
                        <linearGradient id="spendGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.25} />
                          <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0.0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                      <XAxis
                        dataKey="date"
                        stroke="#94A3B8"
                        fontSize={11}
                        tickLine={false}
                        axisLine={{ stroke: '#F1F5F9' }}
                      />
                      <YAxis
                        stroke="#94A3B8"
                        fontSize={11}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(v) => v.toLocaleString()}
                        domain={[0, 8000]}
                        ticks={[0, 2000, 4000, 6000, 8000]}
                      />
                      <Tooltip content={<CustomSpendTooltip />} />
                      {/* Planned Budget Dashed Line */}
                      <Line
                        type="monotone"
                        dataKey="plannedBudget"
                        stroke="#A78BFA"
                        strokeDasharray="4 4"
                        strokeWidth={1.5}
                        dot={false}
                      />
                      {/* Actual Spend Area + Line */}
                      <Area
                        type="monotone"
                        dataKey="actualSpend"
                        stroke="#6D28D9"
                        strokeWidth={2}
                        fill="url(#spendGradient)"
                        dot={{ r: 3, fill: '#6D28D9', strokeWidth: 0 }}
                        activeDot={{ r: 5, fill: '#6D28D9', stroke: '#FFFFFF', strokeWidth: 2 }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Campaign Objectives */}
              <div className="bg-white rounded-xl border border-[#E2E8F0] p-5 shadow-2xs">
                <div className="flex items-center justify-between mb-3.5">
                  <h3 className="text-sm font-bold text-[#1E1B4B]">Campaign objectives</h3>
                  <button
                    type="button"
                    onClick={() => setIsEditObjectivesOpen(true)}
                    className="text-xs font-semibold text-[#6D28D9] hover:underline flex items-center gap-1 transition-colors"
                  >
                    <span>Edit Objectives</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="space-y-3">
                  {objectives.map((obj) => (
                    <div
                      key={obj.id}
                      className="flex items-center justify-between py-2 border-b border-[#F8F7FC] last:border-b-0"
                    >
                      <div className="flex items-center gap-2.5">
                        {obj.status === 'On track' || obj.status === 'Completed' ? (
                          <CheckCircle2 className="w-4 h-4 text-[#0D9488] shrink-0" />
                        ) : (
                          <CircleDot className="w-4 h-4 text-[#7C3AED] shrink-0" />
                        )}
                        <span className="text-xs text-[#1E1B4B] font-medium">{obj.text}</span>
                      </div>
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium ${
                          obj.status === 'On track' || obj.status === 'Completed'
                            ? 'bg-[#ECFDF5] text-[#059669]'
                            : 'bg-[#F5F3FF] text-[#7C3AED]'
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            obj.status === 'On track' || obj.status === 'Completed'
                              ? 'bg-[#059669]'
                              : 'bg-[#7C3AED]'
                          }`}
                        />
                        {obj.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Linked Project Card */}
              <div className="bg-white rounded-xl border border-[#E2E8F0] p-5 shadow-2xs">
                <div className="text-[11px] font-semibold text-[#64748B] mb-3">Linked project</div>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#F5F3FF] text-[#6D28D9] flex items-center justify-center shrink-0">
                      <FolderGit2 className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-[#1E1B4B]">
                        {campaign.projectName || 'Autumn Sales Growth'}
                      </h4>
                      <p className="text-xs text-[#64748B] mt-0.5 max-w-lg leading-relaxed">
                        A multi-channel initiative focused on increasing seasonal sales through audience
                        targeting, promotional creative, and coordinated campaign execution.
                      </p>
                    </div>
                  </div>
                  <Link
                    to={`/projects/${campaign.projectId || 'autumn-sales-growth'}`}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 border border-[#6D28D9] text-[#6D28D9] hover:bg-[#F5F3FF] text-xs font-semibold rounded-lg transition-colors shrink-0"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Open Project</span>
                  </Link>
                </div>
              </div>
            </div>

            {/* Right Column: Budget Progress, Channel Information, Recent Activity */}
            <div className="space-y-6">
              {/* Budget Progress Card */}
              <div className="bg-white rounded-xl border border-[#E2E8F0] p-5 shadow-2xs">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-bold text-[#1E1B4B]">Budget progress</h3>
                  <Link
                    to="/finance/budget"
                    className="text-xs font-semibold text-[#6D28D9] hover:underline flex items-center gap-1 transition-colors"
                  >
                    <span>Budget &amp; Expenses</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>

                {/* Progress bar */}
                <div className="flex items-center gap-3 my-3">
                  <div className="flex-1 bg-[#F1F5F9] h-2.5 rounded-full overflow-hidden">
                    <div
                      className="bg-[#0D9488] h-full rounded-full transition-all duration-300"
                      style={{ width: `${Math.min(100, budgetUtilization)}%` }}
                    />
                  </div>
                  <span className="text-sm font-bold text-[#1E1B4B] shrink-0">
                    {budgetUtilization}%
                  </span>
                </div>

                {/* Stats 3 columns */}
                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-[#F8F7FC] text-center">
                  <div>
                    <div className="text-[10px] text-[#64748B]">Allocated budget</div>
                    <div className="text-xs font-bold text-[#1E1B4B] mt-0.5">
                      {adBudget.toLocaleString()} MAD
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-[#64748B]">Spent</div>
                    <div className="text-xs font-bold text-[#1E1B4B] mt-0.5">
                      {adSpend.toLocaleString()} MAD
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-[#64748B]">Remaining</div>
                    <div className="text-xs font-bold text-[#0D9488] mt-0.5">
                      {remainingBudget.toLocaleString()} MAD
                    </div>
                  </div>
                </div>
              </div>

              {/* Channel Information Card */}
              <div className="bg-white rounded-xl border border-[#E2E8F0] p-5 shadow-2xs space-y-3">
                <h3 className="text-sm font-bold text-[#1E1B4B] mb-2">Channel information</h3>

                <div className="space-y-2.5 text-xs">
                  <div className="flex items-center justify-between py-1 border-b border-[#F8F7FC]">
                    <span className="text-[#64748B]">Platform</span>
                    <div className="flex items-center gap-1.5 font-medium text-[#1E1B4B]">
                      <span className="w-4 h-4 flex items-center justify-center text-[#0081FB]">
                        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M12 2C6.477 2 2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.879V14.89h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.989C18.343 21.129 22 16.99 22 12c0-5.523-4.477-10-10-10z" />
                        </svg>
                      </span>
                      <span>{campaign.platform || 'Meta Ads'}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between py-1 border-b border-[#F8F7FC]">
                    <span className="text-[#64748B]">Campaign type</span>
                    <span className="font-medium text-[#1E1B4B]">
                      {campaign.campaignType || 'Multi-channel'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between py-1 border-b border-[#F8F7FC]">
                    <span className="text-[#64748B]">Objective type</span>
                    <span className="font-medium text-[#1E1B4B]">
                      {campaign.objectiveType || 'Sales / Conversions'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between py-1">
                    <span className="text-[#64748B]">Data source</span>
                    <div className="flex items-center gap-1.5 font-medium text-[#1E1B4B]">
                      <Database className="w-3.5 h-3.5 text-[#6D28D9]" />
                      <span>{campaign.dataSource || 'Manual entry / CSV import'}</span>
                      <Info className="w-3.5 h-3.5 text-[#94A3B8]" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Recent Activity Card */}
              <div className="bg-white rounded-xl border border-[#E2E8F0] p-5 shadow-2xs">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-bold text-[#1E1B4B]">Recent activity</h3>
                  <button
                    type="button"
                    onClick={() => setActiveTab('Activity')}
                    className="text-xs font-semibold text-[#6D28D9] hover:underline flex items-center gap-1 transition-colors"
                  >
                    <span>View all activity</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="relative pl-6 space-y-4">
                  {/* Vertical connecting line */}
                  <div className="absolute left-2.5 top-2 bottom-2 w-0.5 bg-[#E2E8F0]" />

                  {activities.map((act) => (
                    <div key={act.id} className="relative">
                      {/* Timeline Dot Icon */}
                      <div className="absolute -left-6 top-0.5 w-5 h-5 rounded-full bg-white border-2 border-[#6D28D9] flex items-center justify-center">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#6D28D9]" />
                      </div>

                      <div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-[#1E1B4B]">{act.title}</span>
                          <span className="text-[10px] text-[#94A3B8]">{act.timestamp}</span>
                        </div>
                        <p className="text-[11px] text-[#64748B] mt-0.5">{act.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Related Modules Navigation */}
          <div>
            <div className="text-xs font-semibold text-[#64748B] mb-3">Related modules</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
              {/* CRM & Leads */}
              <Link
                to="/crm"
                className="bg-white rounded-xl border border-[#E2E8F0] p-3.5 flex items-center justify-between hover:border-[#6D28D9] hover:shadow-2xs transition-all group"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-[#F5F3FF] text-[#6D28D9] flex items-center justify-center group-hover:scale-105 transition-transform">
                    <Users className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-[#1E1B4B]">CRM &amp; Leads</div>
                    <div className="text-[10px] text-[#94A3B8]">View leads from this campaign</div>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-[#94A3B8] group-hover:text-[#6D28D9] transition-colors" />
              </Link>

              {/* Budget & Expenses */}
              <Link
                to="/finance/budget"
                className="bg-white rounded-xl border border-[#E2E8F0] p-3.5 flex items-center justify-between hover:border-[#6D28D9] hover:shadow-2xs transition-all group"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-[#F5F3FF] text-[#7C3AED] flex items-center justify-center group-hover:scale-105 transition-transform">
                    <Wallet className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-[#1E1B4B]">Budget &amp; Expenses</div>
                    <div className="text-[10px] text-[#94A3B8]">Manage campaign costs</div>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-[#94A3B8] group-hover:text-[#6D28D9] transition-colors" />
              </Link>

              {/* Profitability */}
              <Link
                to="/finance/profitability"
                className="bg-white rounded-xl border border-[#E2E8F0] p-3.5 flex items-center justify-between hover:border-[#6D28D9] hover:shadow-2xs transition-all group"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-[#F0FDFA] text-[#0D9488] flex items-center justify-center group-hover:scale-105 transition-transform">
                    <TrendingUp className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-[#1E1B4B]">Profitability</div>
                    <div className="text-[10px] text-[#94A3B8]">View ROI and margins</div>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-[#94A3B8] group-hover:text-[#6D28D9] transition-colors" />
              </Link>

              {/* Content Calendar */}
              <Link
                to="/calendar"
                className="bg-white rounded-xl border border-[#E2E8F0] p-3.5 flex items-center justify-between hover:border-[#6D28D9] hover:shadow-2xs transition-all group"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-[#F5F3FF] text-[#6D28D9] flex items-center justify-center group-hover:scale-105 transition-transform">
                    <CalendarDays className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-[#1E1B4B]">Content Calendar</div>
                    <div className="text-[10px] text-[#94A3B8]">View related content</div>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-[#94A3B8] group-hover:text-[#6D28D9] transition-colors" />
              </Link>

              {/* Analytics */}
              <Link
                to="/analytics"
                className="bg-white rounded-xl border border-[#E2E8F0] p-3.5 flex items-center justify-between hover:border-[#6D28D9] hover:shadow-2xs transition-all group"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-[#F0FDFA] text-[#0D9488] flex items-center justify-center group-hover:scale-105 transition-transform">
                    <BarChart2 className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-[#1E1B4B]">Analytics</div>
                    <div className="text-[10px] text-[#94A3B8]">See detailed analytics</div>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-[#94A3B8] group-hover:text-[#6D28D9] transition-colors" />
              </Link>
            </div>
          </div>
        </>
      ) : (
        /* Other Tabs Fallback Content */
        <div className="bg-white rounded-xl border border-[#E2E8F0] p-8 text-center shadow-2xs">
          <div className="w-12 h-12 rounded-xl bg-[#F5F3FF] text-[#6D28D9] flex items-center justify-center mx-auto mb-3">
            <Activity className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-[#1E1B4B]">{activeTab} Details</h3>
          <p className="text-xs text-[#64748B] mt-1 max-w-md mx-auto leading-relaxed">
            Viewing detailed {activeTab.toLowerCase()} data for{' '}
            <span className="font-semibold text-[#1E1B4B]">{campaign.name}</span>. Additional
            granularity is synchronized with workspace performance records.
          </p>
          <div className="mt-4">
            <button
              type="button"
              onClick={() => setActiveTab('Overview')}
              className="px-4 py-2 bg-[#6D28D9] text-white rounded-lg text-xs font-semibold hover:bg-[#5B21B6] transition-colors"
            >
              Return to Overview
            </button>
          </div>
        </div>
      )}

      {/* Edit Campaign Modal */}
      <CreateCampaignModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSave={handleUpdateCampaign}
        initialCampaign={campaign}
        workspaceName={campaign.workspaceName || currentWorkspace?.name || 'Atlas Retail SARL'}
      />

      {/* Add Results Modal */}
      <AddResultsModal
        isOpen={isAddResultsOpen}
        onClose={() => setIsAddResultsOpen(false)}
        onSave={handleAddResults}
        campaignName={campaign.name}
      />

      {/* Edit Objectives Modal */}
      <EditObjectivesModal
        isOpen={isEditObjectivesOpen}
        onClose={() => setIsEditObjectivesOpen(false)}
        objectives={objectives}
        onSave={(updated) => setObjectives(updated)}
      />
    </div>
  );
};
