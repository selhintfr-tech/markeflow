import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Calendar,
  Plus,
  Megaphone,
  CreditCard,
  BarChart2,
  FileText,
  ChevronDown,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { StatCard } from '../../components/ui/StatCard';
import { MarketingPerformanceChart } from './components/MarketingPerformanceChart';
import { BudgetUtilizationCard } from './components/BudgetUtilizationCard';
import { ActiveCampaignsTable } from './components/ActiveCampaignsTable';
import { UpcomingTasksCard } from './components/UpcomingTasksCard';
import {
  dashboardService,
  getPeriodDateRange,
  type AnalyticsOverview,
  type AnalyticsTimeSeries,
} from './dashboardService';
import { campaignService, type CampaignRecord } from '../campaigns/campaignService';
import { taskService, type TaskRecord } from '../tasks/taskService';

const PERIOD_OPTIONS = [
  'October 2026',
  'September 2026',
  'August 2026',
  'Last 30 days',
  'Year to date (2026)',
  'All time',
];

const getPercentageChange = (
  points: Array<{ date: string; value: number | string }> | null | undefined
): number | null => {
  if (!points || points.length < 2) return null;

  const orderedPoints = [...points].sort((a, b) => a.date.localeCompare(b.date));
  const previous = Number(orderedPoints[orderedPoints.length - 2].value);
  const current = Number(orderedPoints[orderedPoints.length - 1].value);
  if (!Number.isFinite(previous) || !Number.isFinite(current) || previous === 0) return null;

  return Math.round(((current - previous) / Math.abs(previous)) * 100);
};

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { currentWorkspace } = useWorkspace();
  const workspaceId = currentWorkspace?.id ?? '';
  const workspaceName = currentWorkspace?.name ?? 'Workspace';

  const [selectedPeriod, setSelectedPeriod] = useState<string>('October 2026');
  const [showPeriodDropdown, setShowPeriodDropdown] = useState(false);

  const [overview, setOverview] = useState<AnalyticsOverview | null>(null);
  const [timeSeries, setTimeSeries] = useState<AnalyticsTimeSeries | null>(null);
  const [campaigns, setCampaigns] = useState<CampaignRecord[]>([]);
  const [tasks, setTasks] = useState<TaskRecord[]>([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Stale request protection
  const activeWorkspaceIdRef = useRef(workspaceId);
  activeWorkspaceIdRef.current = workspaceId;

  const fetchDashboardData = useCallback(async () => {
    if (!workspaceId) {
      setOverview(null);
      setTimeSeries(null);
      setCampaigns([]);
      setTasks([]);
      setError(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const { from, to } = getPeriodDateRange(selectedPeriod);

    try {
      const [overviewData, timeSeriesData, campaignsData, tasksData] = await Promise.all([
        dashboardService.getOverview(workspaceId, { from, to }),
        dashboardService.getTimeSeries(workspaceId, { from, to }),
        campaignService.list(workspaceId),
        taskService.list(workspaceId),
      ]);

      // Guard against stale response if workspace changed while fetching
      if (activeWorkspaceIdRef.current !== workspaceId) return;

      setOverview(overviewData);
      setTimeSeries(timeSeriesData);
      setCampaigns(campaignsData);
      setTasks(tasksData);
    } catch (err) {
      if (activeWorkspaceIdRef.current === workspaceId) {
        setError(err instanceof Error ? err.message : 'Failed to load dashboard data.');
        setOverview(null);
        setTimeSeries(null);
        setCampaigns([]);
        setTasks([]);
      }
    } finally {
      if (activeWorkspaceIdRef.current === workspaceId) {
        setLoading(false);
      }
    }
  }, [workspaceId, selectedPeriod]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const handleToggleTask = async (taskId: string, currentStatus: string) => {
    if (!workspaceId) return;
    const newStatus = currentStatus === 'Completed' ? 'Pending' : 'Completed';
    try {
      await taskService.update(workspaceId, taskId, { status: newStatus as any });
      // Optimistically update local tasks list
      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, status: newStatus as any } : t))
      );
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to update task.');
    }
  };

  // Derive top KPI metric values safely
  const activeCampaignsCount = campaigns.filter((campaign) => campaign.status === 'Active').length;
  const campaignChange = getPercentageChange(timeSeries?.series.campaigns);
  const spendChange = getPercentageChange(timeSeries?.series.expenses);

  const spendRaw =
    overview?.campaign_financials?.spend !== undefined && overview?.campaign_financials?.spend !== null
      ? Number(overview.campaign_financials.spend)
      : overview?.finance?.expenses !== undefined && overview?.finance?.expenses !== null
      ? Number(overview.finance.expenses)
      : null;

  const budgetRaw =
    overview?.campaign_financials?.budget !== undefined && overview?.campaign_financials?.budget !== null
      ? Number(overview.campaign_financials.budget)
      : null;

  const leadsRaw =
    overview?.crm?.leads !== undefined && overview?.crm?.leads !== null
      ? overview.crm.leads
      : null;

  const conversionRate = overview?.crm?.conversion_rate ?? 0;
  const convertedLeads = overview?.crm?.converted_leads ?? 0;

  // Profit calculation: campaign revenue - spend, or finance profit
  let profitRaw: number | null = null;
  if (
    overview?.campaign_financials?.revenue !== undefined &&
    overview?.campaign_financials?.revenue !== null &&
    overview?.campaign_financials?.spend !== undefined &&
    overview?.campaign_financials?.spend !== null
  ) {
    profitRaw = Math.round(
      Number(overview.campaign_financials.revenue) - Number(overview.campaign_financials.spend)
    );
  } else if (overview?.finance?.profit !== undefined && overview?.finance?.profit !== null) {
    profitRaw = Math.round(overview.finance.profit);
  }

  const returnOnSpend = overview?.campaign_financials?.return_on_spend ?? null;

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto pb-12">
      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-[#64748B]">
        <Link to="/" className="hover:text-[#1E1B4B] transition-colors">
          Overview
        </Link>
        <span>/</span>
        <span className="text-[#1E1B4B] font-medium" aria-current="page">
          Dashboard
        </span>
      </nav>

      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-extrabold tracking-tight text-[#1E1B4B]">
            Marketing Overview
          </h1>
          <p className="text-sm text-[#64748B] mt-1">
            Real performance, campaign execution and financial metrics for <span className="font-semibold text-[#1E1B4B]">{workspaceName}</span>.
          </p>
        </div>

        {/* Right Header Controls: Period dropdown + New Campaign CTA */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowPeriodDropdown(!showPeriodDropdown)}
              aria-haspopup="listbox"
              aria-expanded={showPeriodDropdown}
              aria-label="Select reporting period"
              className="flex items-center gap-2 px-3.5 py-2 rounded-lg border border-[#E2E8F0] bg-white text-xs font-medium text-[#1E1B4B] hover:bg-slate-50 shadow-2xs transition-colors focus:outline-none focus:ring-2 focus:ring-[#6D28D9]/20 cursor-pointer"
            >
              <Calendar className="w-3.5 h-3.5 text-[#64748B]" />
              <span>{selectedPeriod}</span>
              <ChevronDown className="w-3.5 h-3.5 text-[#94A3B8]" />
            </button>

            {showPeriodDropdown && (
              <div
                role="listbox"
                className="absolute right-0 mt-1.5 w-48 rounded-lg bg-white border border-[#E2E8F0] shadow-lg py-1 z-40"
              >
                {PERIOD_OPTIONS.map((period) => (
                  <button
                    key={period}
                    role="option"
                    aria-selected={selectedPeriod === period}
                    onClick={() => {
                      setSelectedPeriod(period);
                      setShowPeriodDropdown(false);
                    }}
                    className={`w-full text-left px-3.5 py-2 text-xs hover:bg-[#F5F3FF] transition-colors cursor-pointer ${
                      selectedPeriod === period
                        ? 'text-[#6D28D9] font-semibold bg-[#F5F3FF]'
                        : 'text-[#1E1B4B]'
                    }`}
                  >
                    {period}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => navigate('/campaigns')}
            aria-label="Create new campaign"
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#6D28D9] hover:bg-[#5B21B6] text-white text-xs font-semibold shadow-xs hover:shadow-md transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#6D28D9] focus:ring-offset-2"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>New Campaign</span>
          </button>
        </div>
      </div>

      {/* Error Banner with Retry */}
      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 flex items-center justify-between text-xs text-rose-800">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={fetchDashboardData}
            className="flex items-center gap-1.5 px-3 py-1 bg-white border border-rose-200 rounded-md font-semibold text-rose-700 hover:bg-rose-100 transition-colors cursor-pointer"
          >
            <RefreshCw className="w-3 h-3" />
            <span>Retry</span>
          </button>
        </div>
      )}

      {/* Quick Action Navigation links */}
      <div className="flex flex-wrap items-center justify-start md:justify-end gap-4 sm:gap-6 text-xs font-semibold text-[#6D28D9]">
        <Link
          to="/campaigns"
          className="flex items-center gap-1.5 hover:text-[#5B21B6] transition-colors focus:outline-none focus:underline"
        >
          <Megaphone className="w-4 h-4" />
          <span>Campaigns</span>
        </Link>
        <Link
          to="/finance/budget"
          className="flex items-center gap-1.5 hover:text-[#5B21B6] transition-colors focus:outline-none focus:underline"
        >
          <CreditCard className="w-4 h-4" />
          <span>Budget</span>
        </Link>
        <Link
          to="/analytics"
          className="flex items-center gap-1.5 hover:text-[#5B21B6] transition-colors focus:outline-none focus:underline"
        >
          <BarChart2 className="w-4 h-4" />
          <span>Analytics</span>
        </Link>
        <Link
          to="/reports"
          className="flex items-center gap-1.5 hover:text-[#5B21B6] transition-colors focus:outline-none focus:underline"
        >
          <FileText className="w-4 h-4" />
          <span>Reports</span>
        </Link>
      </div>

      {/* Top 4 KPI Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard
          icon={<Megaphone className="w-5 h-5 text-[#6D28D9]" />}
          iconBgColor="bg-[#F5F3FF]"
          title="Active Campaigns"
          value={loading ? '...' : activeCampaignsCount}
          changePercentage={campaignChange ?? 0}
          changeLabel={campaignChange === null ? 'trend unavailable' : 'vs previous data point'}
          onClick={() => navigate('/campaigns')}
        />
        <StatCard
          icon={<CreditCard className="w-5 h-5 text-[#6D28D9]" />}
          iconBgColor="bg-[#F5F3FF]"
          title="Advertising Spend"
          value={
            loading
              ? '...'
              : spendRaw !== null
              ? `${spendRaw.toLocaleString()} MAD`
              : '—'
          }
          changePercentage={spendChange ?? 0}
          changeLabel={
            spendChange === null
              ? 'trend unavailable'
              : budgetRaw
              ? `of ${budgetRaw.toLocaleString()} MAD budget`
              : 'vs previous data point'
          }
          onClick={() => navigate('/finance/budget')}
        />
        <StatCard
          icon={
            <svg
              className="w-5 h-5 text-[#0D9488]"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          }
          iconBgColor="bg-[#CCFBF1]/40"
          title="Leads Generated"
          value={loading ? '...' : leadsRaw !== null ? leadsRaw : '—'}
          changePercentage={conversionRate}
          changeLabel={
            conversionRate > 0
              ? `conversion rate (${convertedLeads} converted)`
              : 'leads in CRM'
          }
          onClick={() => navigate('/crm')}
        />
        <StatCard
          icon={
            <svg
              className="w-5 h-5 text-[#0D9488]"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="12" y1="20" x2="12" y2="10" />
              <line x1="18" y1="20" x2="18" y2="4" />
              <line x1="6" y1="20" x2="6" y2="16" />
            </svg>
          }
          iconBgColor="bg-[#CCFBF1]/40"
          title="Estimated Campaign Profit"
          value={
            loading
              ? '...'
              : profitRaw !== null
              ? `${profitRaw >= 0 ? '+' : ''}${profitRaw.toLocaleString()} MAD`
              : '—'
          }
          changePercentage={returnOnSpend ? Math.round(returnOnSpend * 100) : 0}
          changeLabel={
            returnOnSpend
              ? `${returnOnSpend}x return on spend`
              : 'recorded net profit'
          }
          onClick={() => navigate('/analytics')}
        />
      </div>

      {/* Middle Row: Marketing Performance (2/3 width) + Budget Utilization (1/3 width) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <MarketingPerformanceChart timeSeries={timeSeries} loading={loading} />
        </div>
        <div className="lg:col-span-1">
          <BudgetUtilizationCard
            overview={overview}
            loading={loading}
            selectedPeriod={selectedPeriod}
          />
        </div>
      </div>

      {/* Bottom Row: Active Campaigns Table (2/3 width) + Upcoming Tasks (1/3 width) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <ActiveCampaignsTable campaigns={campaigns} loading={loading} />
        </div>
        <div className="lg:col-span-1">
          <UpcomingTasksCard
            tasks={tasks}
            loading={loading}
            onToggleTask={handleToggleTask}
          />
        </div>
      </div>
    </div>
  );
};
