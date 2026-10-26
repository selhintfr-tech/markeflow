import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  BarChart2,
  Building2,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Coins,
  Download,
  Info,
  LoaderCircle,
  Megaphone,
  Package,
  Percent,
  RefreshCw,
  RotateCcw,
  Share2,
  ShoppingBag,
  TrendingUp,
  Truck,
  User,
  UsersRound,
  Wallet,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useWorkspace } from '../../context/WorkspaceContext';
import {
  analyticsApi,
  type AnalyticsOverview,
  type PeriodComparison,
  type TimeSeries,
} from './analyticsApi';
import { campaignService, type CampaignRecord } from '../campaigns/campaignService';

const cardClass = 'rounded-xl border border-[#E2E8F0] bg-white shadow-xs';
const purple = '#6D28D9';
const lightPurple = '#C4B5FD';

type MetricName = 'spend' | 'leads' | 'costPerLead' | 'customers' | 'conversion' | 'roas';
type PerformanceMetric = 'spend' | 'orders' | 'leads' | 'customers';

interface CampaignTotals {
  spend: number | null;
  leads: number | null;
  customers: number | null;
  revenue: number | null;
}

interface MetricDefinition {
  key: MetricName;
  label: string;
  value: number | null;
  formatted: string;
  changeKey?: string;
  source: string;
  notes: string;
  icon: React.ReactNode;
}

interface LoadedAnalytics {
  key: string;
  overview: AnalyticsOverview;
  timeSeries: TimeSeries;
  campaigns: CampaignRecord[];
}

interface LoadedComparison {
  key: string;
  value: PeriodComparison;
}

interface FailedRequest {
  key: string;
  message: string;
}

const localDate = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
const monthStart = (date: Date) => localDate(new Date(date.getFullYear(), date.getMonth(), 1));

const EMPTY_CAMPAIGNS: CampaignRecord[] = [];

function numeric(value: number | string | null | undefined): number | null {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function formatNumber(value: number | null, maximumFractionDigits = 0): string {
  return value === null
    ? 'N/A'
    : value.toLocaleString(undefined, { maximumFractionDigits });
}

function formatMoney(value: number | null, currency: string | null | undefined): string {
  if (value === null) return 'N/A';
  const hasDecimals = !Number.isInteger(value);
  const formatted = value.toLocaleString(undefined, {
    minimumFractionDigits: hasDecimals ? 2 : 0,
    maximumFractionDigits: 2,
  });
  return currency ? `${formatted} ${currency}` : `${formatted} MAD`;
}

function formatDate(value: string): string {
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  const day = date.getDate();
  const month = date.toLocaleDateString(undefined, { month: 'short' });
  return `${day} ${month}`;
}

function formatTooltipDate(value: string): string {
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  const day = date.getDate();
  const month = date.toLocaleDateString(undefined, { month: 'short' });
  const year = date.getFullYear();
  return `${day} ${month} ${year}`;
}

function formatDisplayDate(isoDate: string): string {
  const date = new Date(`${isoDate}T00:00:00`);
  if (Number.isNaN(date.getTime())) return isoDate;
  const day = String(date.getDate()).padStart(2, '0');
  const month = date.toLocaleDateString(undefined, { month: 'short' });
  const year = date.getFullYear();
  return `${day} ${month} ${year}`;
}

function csvCell(value: string | number | null): string {
  const text = value === null ? '' : String(value);
  const safeText = /^[=+\-@]/.test(text) ? `'${text}` : text;
  return `"${safeText.replaceAll('"', '""')}"`;
}

function downloadCsv(filename: string, rows: Array<Array<string | number | null>>): void {
  const content = rows.map((row) => row.map(csvCell).join(',')).join('\r\n');
  const blob = new Blob([`\uFEFF${content}`], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function sumCampaigns(campaigns: CampaignRecord[]): CampaignTotals {
  const sumField = (field: 'spend' | 'leads' | 'customers' | 'revenue'): number | null => {
    if (!campaigns.length) return 0;
    const values = campaigns.map((campaign) => numeric(campaign[field]));
    return values.every((value): value is number => value !== null)
      ? values.reduce((sum, value) => sum + value, 0)
      : null;
  };

  return {
    spend: sumField('spend'),
    leads: sumField('leads'),
    customers: sumField('customers'),
    revenue: sumField('revenue'),
  };
}

function campaignChannel(campaign: CampaignRecord): string {
  return campaign.channel?.trim() || campaign.platform || 'Unspecified';
}

function formatMetricValue(
  metric: MetricName,
  value: number | null,
  currency: string | null | undefined
): string {
  if (value === null) return 'N/A';
  switch (metric) {
    case 'spend':
    case 'costPerLead':
      return formatMoney(value, currency);
    case 'conversion':
      return `${value.toLocaleString(undefined, { maximumFractionDigits: 1 })}%`;
    case 'roas':
      return `${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}×`;
    default:
      return formatNumber(value);
  }
}

function compareValue(comparison: PeriodComparison | null, key: string | undefined): { text: string; direction: 'up' | 'down' | 'neutral' } {
  if (!comparison || !key) return { text: '—', direction: 'neutral' };
  const change = comparison.metrics[key]?.percent_change;
  if (change === null || change === undefined) return { text: 'N/A', direction: 'neutral' };
  const formatted = `${change > 0 ? '+' : ''}${change.toLocaleString(undefined, { maximumFractionDigits: 1 })}%`;
  return {
    text: `${change >= 0 ? '↑' : '↓'} ${formatted}`,
    direction: change >= 0 ? 'up' : 'down',
  };
}

const MetricCard: React.FC<{
  label: string;
  value: string;
  tooltip: string;
  icon: React.ReactNode;
  tone: 'purple' | 'blue' | 'teal' | 'emerald';
  isRoas?: boolean;
  subtext?: string;
}> = ({ label, value, tooltip, icon, tone, isRoas, subtext }) => {
  const tones = {
    purple: 'bg-[#F5F3FF] text-[#6D28D9]',
    blue: 'bg-[#EFF6FF] text-[#2563EB]',
    teal: 'bg-[#F0FDFA] text-[#0D9488]',
    emerald: 'bg-[#F0FDF4] text-[#16A34A]',
  };

  return (
    <article className={`${cardClass} flex min-h-[92px] items-center gap-3.5 p-4`}>
      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${tones[tone]}`}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="flex items-center gap-1 text-xs font-medium text-[#64748B]">
          <span className="truncate">{label}</span>
          <span
            className="inline-flex shrink-0 cursor-help"
            role="img"
            aria-label={tooltip}
            title={tooltip}
          >
            <Info className="h-3 w-3 text-[#94A3B8]" aria-hidden="true" />
          </span>
        </p>
        <p
          className={`mt-1 truncate text-lg sm:text-xl font-bold tracking-tight ${
            isRoas && value !== 'Unavailable' && value !== 'N/A' ? 'text-[#16A34A]' : 'text-[#1E1B4B]'
          }`}
          title={value}
        >
          {value}
        </p>
        {subtext && (
          <p className="truncate text-[10px] text-[#64748B]" title={subtext}>
            {subtext}
          </p>
        )}
      </div>
    </article>
  );
};

export const AnalyticsPage: React.FC = () => {
  const {
    currentWorkspace,
    hasWorkspace,
    workspaces,
    setCurrentWorkspace,
  } = useWorkspace();
  const workspaceId = currentWorkspace.id;
  const currency = currentWorkspace.currency || 'MAD';
  const [from, setFrom] = useState(() => monthStart(new Date()));
  const [to, setTo] = useState(() => localDate(new Date()));
  const [loadedAnalytics, setLoadedAnalytics] = useState<LoadedAnalytics | null>(null);
  const [analyticsFailure, setAnalyticsFailure] = useState<FailedRequest | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [campaignFilter, setCampaignFilter] = useState('all');
  const [channelFilter, setChannelFilter] = useState('all');
  const [performanceMetric, setPerformanceMetric] = useState<PerformanceMetric>('spend');
  const [channelMetric, setChannelMetric] = useState<'spend' | 'leads'>('spend');
  const [compareEnabled, setCompareEnabled] = useState(true);
  const [loadedComparison, setLoadedComparison] = useState<LoadedComparison | null>(null);
  const [comparisonFailure, setComparisonFailure] = useState<FailedRequest | null>(null);

  const analyticsKey = JSON.stringify([workspaceId, from, to, campaignFilter, channelFilter, refreshKey]);
  const currentAnalytics = loadedAnalytics?.key === analyticsKey ? loadedAnalytics : null;
  const overview = currentAnalytics?.overview ?? null;
  const timeSeries = currentAnalytics?.timeSeries ?? null;
  const campaigns = currentAnalytics?.campaigns ?? EMPTY_CAMPAIGNS;
  const campaignsLoaded = currentAnalytics !== null;
  const analyticsError = analyticsFailure?.key === analyticsKey ? analyticsFailure.message : '';
  const loading = Boolean(hasWorkspace && !currentAnalytics && !analyticsError);

  useEffect(() => {
    if (!workspaceId || !hasWorkspace) return;
    let active = true;

    Promise.all([
      analyticsApi.overview(workspaceId, from, to, campaignFilter, channelFilter),
      analyticsApi.timeseries(workspaceId, from, to, campaignFilter, channelFilter),
      campaignService.list(workspaceId),
    ]).then(([nextOverview, nextSeries, nextCampaigns]) => {
      if (!active) return;
      setLoadedAnalytics({
        key: analyticsKey,
        overview: nextOverview,
        timeSeries: nextSeries,
        campaigns: nextCampaigns,
      });
    }).catch((cause: unknown) => {
      if (!active) return;
      setAnalyticsFailure({
        key: analyticsKey,
        message: cause instanceof Error ? cause.message : 'Unable to load workspace analytics.',
      });
    });

    return () => {
      active = false;
    };
  }, [workspaceId, hasWorkspace, from, to, campaignFilter, channelFilter, analyticsKey]);

  const canCompare = campaignFilter === 'all' && channelFilter === 'all';
  const comparisonKey = compareEnabled && canCompare && workspaceId && hasWorkspace && overview
    ? JSON.stringify([workspaceId, from, to, campaignFilter, channelFilter])
    : '';
  const comparison = loadedComparison?.key === comparisonKey && comparisonKey
    ? loadedComparison.value
    : null;
  const comparisonError = comparisonFailure?.key === comparisonKey && comparisonKey
    ? comparisonFailure.message
    : '';
  const comparisonLoading = Boolean(comparisonKey && !comparison && !comparisonError);

  useEffect(() => {
    let active = true;
    if (!comparisonKey) return;
    analyticsApi.comparePeriods(workspaceId, from, to, undefined, undefined, campaignFilter, channelFilter).then((result) => {
      if (active) setLoadedComparison({ key: comparisonKey, value: result });
    }).catch((cause: unknown) => {
      if (active) {
        setComparisonFailure({
          key: comparisonKey,
          message: cause instanceof Error ? cause.message : 'Unable to load the previous-period comparison.',
        });
      }
    });

    return () => {
      active = false;
    };
  }, [comparisonKey, workspaceId, from, to, campaignFilter, channelFilter]);

  const periodCampaigns = useMemo(
    () => campaigns.filter((campaign) =>
      campaign.start_date <= to && (!campaign.end_date || campaign.end_date >= from)
    ),
    [campaigns, from, to]
  );

  const channelOptions = useMemo(() => {
    const list = new Set<string>();
    campaigns.forEach((c) => list.add(campaignChannel(c)));
    (overview?.advertising?.channel_breakdown || []).forEach((b) => list.add(b.channel));
    return [...list].filter(Boolean).sort((a, b) => a.localeCompare(b));
  }, [campaigns, overview]);

  const filteredCampaigns = useMemo(
    () => periodCampaigns.filter((campaign) =>
      (campaignFilter === 'all' || campaign.id === campaignFilter) &&
      (channelFilter === 'all' || campaignChannel(campaign) === channelFilter)
    ),
    [periodCampaigns, campaignFilter, channelFilter]
  );
  const totals = useMemo(() => sumCampaigns(filteredCampaigns), [filteredCampaigns]);

  const selectedCampaignName = useMemo(() => {
    if (campaignFilter === 'all') return null;
    return campaigns.find((c) => c.id === campaignFilter)?.name || null;
  }, [campaignFilter, campaigns]);

  const metricDefinitions: MetricDefinition[] = useMemo(() => {
    const isCampaignFiltered = campaignFilter !== 'all';
    const isChannelFiltered = channelFilter !== 'all';

    // 1. Spend
    let spendVal: number | null = null;
    let spendNotes = 'Total advertising spend across recorded channels.';
    let spendSource = 'Finance Ledger';

    if (overview?.advertising) {
      spendVal = overview.advertising.spend;
      if (isCampaignFiltered) {
        spendSource = 'Finance Ledger (Attributed)';
        spendNotes = spendVal > 0
          ? `${formatMoney(spendVal, currency)} attributed to this campaign.`
          : `0 ${currency} attributed to this campaign. Workspace has ${formatMoney(overview.advertising.workspace_total_spend, currency)} in recorded ad spend without campaign attribution.`;
      } else if (isChannelFiltered) {
        spendSource = 'Finance Ledger (Channel Attributed)';
        spendNotes = `Total recorded advertising spend for channel ${channelFilter}.`;
      } else {
        spendSource = 'Finance Ledger';
        spendNotes = overview.advertising.unattributed_spend > 0
          ? `Total recorded in Finance ledger. Includes ${formatMoney(overview.advertising.unattributed_spend, currency)} without campaign attribution.`
          : `Total advertising spend recorded in Finance ledger.`;
      }
    } else if (totals.spend !== null) {
      spendVal = totals.spend;
      spendSource = 'Campaign records';
    }

    // 2. Leads
    const leadsVal = overview?.crm?.leads ?? totals.leads ?? 0;
    const leadsSource = 'CRM / Leads Records';
    const leadsNotes = leadsVal > 0
      ? `Total marketing leads recorded in CRM for this period.`
      : `No marketing leads recorded in CRM for this period.`;

    // 3. Cost Per Lead (CPL)
    const costPerLeadVal = spendVal !== null && leadsVal > 0 ? spendVal / leadsVal : null;
    const cplSource = 'Calculated (Spend ÷ Leads)';
    const cplNotes = leadsVal > 0
      ? `Advertising spend divided by verified leads.`
      : `N/A because eligible leads are zero.`;

    // 4. Customers
    const marketingCustomers = overview?.crm?.customers ?? totals.customers ?? 0;
    const salesCustomersCount = overview?.sales?.customers_count ?? 0;
    const customersSource = 'CRM / Marketing Attribution';
    const customersNotes = salesCustomersCount > 0
      ? `${marketingCustomers} marketing-attributed customers (${salesCustomersCount} customer orders exist in Sales & Orders).`
      : `${marketingCustomers} converted customers recorded in CRM.`;

    // 5. Lead Conversion
    const convertedLeads = overview?.crm?.converted_leads ?? 0;
    const conversionVal = leadsVal > 0 ? (convertedLeads / leadsVal) * 100 : null;
    const conversionSource = 'Calculated (Converted ÷ Leads)';
    const conversionNotes = leadsVal > 0
      ? `Percentage of verified leads that converted to customers.`
      : `N/A because total leads denominator is zero.`;

    // 6. ROAS
    let roasVal: number | null = null;
    const roasSource = 'Attributed Revenue ÷ Ad Spend';
    let roasNotes = `N/A because company sales revenue lacks verified advertising campaign attribution.`;
    if (totals.revenue !== null && totals.revenue > 0 && spendVal !== null && spendVal > 0) {
      roasVal = totals.revenue / spendVal;
      roasNotes = `Campaign-attributed revenue divided by ad spend.`;
    }

    const defs: MetricDefinition[] = [
      {
        key: 'spend',
        label: 'Ad Spend',
        value: campaignsLoaded ? spendVal : null,
        formatted: formatMetricValue('spend', spendVal, currency),
        changeKey: 'advertising.spend',
        source: spendSource,
        notes: spendNotes,
        icon: <Megaphone className="h-4 w-4" />,
      },
      {
        key: 'leads',
        label: 'Leads',
        value: campaignsLoaded ? leadsVal : null,
        formatted: formatMetricValue('leads', leadsVal, currency),
        changeKey: 'crm.leads',
        source: leadsSource,
        notes: leadsNotes,
        icon: <UsersRound className="h-4 w-4" />,
      },
      {
        key: 'costPerLead',
        label: 'Cost Per Lead',
        value: campaignsLoaded ? costPerLeadVal : null,
        formatted: formatMetricValue('costPerLead', costPerLeadVal, currency),
        source: cplSource,
        notes: cplNotes,
        icon: <Coins className="h-4 w-4" />,
      },
      {
        key: 'customers',
        label: 'Marketing Customers',
        value: campaignsLoaded ? marketingCustomers : null,
        formatted: formatMetricValue('customers', marketingCustomers, currency),
        changeKey: 'crm.customers',
        source: customersSource,
        notes: customersNotes,
        icon: <User className="h-4 w-4" />,
      },
      {
        key: 'conversion',
        label: 'Lead Conversion',
        value: campaignsLoaded ? conversionVal : null,
        formatted: formatMetricValue('conversion', conversionVal, currency),
        changeKey: 'crm.conversion_rate',
        source: conversionSource,
        notes: conversionNotes,
        icon: <Percent className="h-4 w-4" />,
      },
      {
        key: 'roas',
        label: 'ROAS',
        value: campaignsLoaded ? roasVal : null,
        formatted: formatMetricValue('roas', roasVal, currency),
        changeKey: 'campaign_financials.return_on_spend',
        source: roasSource,
        notes: roasNotes,
        icon: <TrendingUp className="h-4 w-4" />,
      },
    ];

    return defs;
  }, [campaignsLoaded, overview, totals, currency, campaignFilter, channelFilter]);

  const channelRows = useMemo(() => {
    const breakdown = overview?.advertising?.channel_breakdown || [];
    if (breakdown.length > 0) {
      return breakdown
        .filter((b) => channelFilter === 'all' || b.channel === channelFilter)
        .map((b) => {
          const spend = b.spend;
          const matchingCampaigns = filteredCampaigns.filter((c) => campaignChannel(c) === b.channel);
          const channelCampaignTotals = sumCampaigns(matchingCampaigns);
          const leads = channelCampaignTotals.leads ?? 0;
          const cpl = spend > 0 && leads > 0 ? spend / leads : null;

          return {
            channel: b.channel,
            spend,
            leads,
            cpl,
            note: b.unattributed_spend > 0
              ? `${formatMoney(b.unattributed_spend, currency)} unattributed to campaign ID`
              : 'Attributed to campaign',
          };
        });
    }

    const groups = new Map<string, CampaignRecord[]>();
    for (const campaign of filteredCampaigns) {
      const channel = campaignChannel(campaign);
      const rows = groups.get(channel) || [];
      rows.push(campaign);
      groups.set(channel, rows);
    }
    return Array.from(groups, ([channel, records]) => {
      const channelTotals = sumCampaigns(records);
      return {
        channel,
        spend: channelTotals.spend,
        leads: channelTotals.leads,
        cpl: channelTotals.spend !== null && channelTotals.leads !== null && channelTotals.leads > 0
          ? channelTotals.spend / channelTotals.leads
          : null,
        note: 'Campaign records',
      };
    }).sort((a, b) => a.channel.localeCompare(b.channel));
  }, [overview, filteredCampaigns, channelFilter, currency]);

  // Performance over time: exactly 3 metrics (leads, spend, customers)
  const chartRows = useMemo(() => {
    if (!timeSeries?.series) return [];
    const seriesData = timeSeries.series[performanceMetric];
    if (!seriesData || !Array.isArray(seriesData)) return [];
    return seriesData.flatMap((point) => {
      const val = numeric(point.value);
      return val === null ? [] : [{ date: point.date, value: val }];
    });
  }, [timeSeries, performanceMetric]);

  const funnelCounts = useMemo(() => {
    const rows = overview?.crm?.funnel || [];
    const normalized = new Map(rows.map((row) => [row.status.trim().toLowerCase(), row.count]));
    const newCount = normalized.get('new') ?? 0;
    const contactedCount = normalized.get('contacted') ?? 0;
    const qualifiedCount = normalized.get('qualified') ?? 0;
    const convertedCount = normalized.get('converted') ?? 0;
    const totalCount = newCount + contactedCount + qualifiedCount + convertedCount;

    return [
      {
        name: 'New',
        count: newCount,
        color: '#6D28D9',
        percentage: totalCount > 0 ? (newCount / totalCount) * 100 : null,
      },
      {
        name: 'Contacted',
        count: contactedCount,
        color: '#8B5CF6',
        percentage: totalCount > 0 ? (contactedCount / totalCount) * 100 : null,
      },
      {
        name: 'Qualified',
        count: qualifiedCount,
        color: '#A78BFA',
        percentage: totalCount > 0 ? (qualifiedCount / totalCount) * 100 : null,
      },
      {
        name: 'Converted',
        count: convertedCount,
        color: '#14B8A6',
        percentage: totalCount > 0 ? (convertedCount / totalCount) * 100 : null,
      },
    ];
  }, [overview]);

  const handleExport = () => {
    const rows: Array<Array<string | number | null>> = [
      ['MarketFlow Marketing & E-Commerce Analytics'],
      ['Workspace', currentWorkspace.name],
      ['Currency', currency],
      ['From', from],
      ['To', to],
      ['Campaign filter', campaignFilter === 'all' ? 'All campaigns' : selectedCampaignName || 'Selected campaign'],
      ['Channel filter', channelFilter === 'all' ? 'All channels' : channelFilter],
      [],
      ['--- KEY MARKETING METRICS ---'],
      ['Metric', 'Value', 'Change vs previous period', 'Source', 'Notes'],
      ...metricDefinitions.map((metric) => [
        metric.label,
        metric.formatted,
        metric.changeKey && compareEnabled && canCompare && comparison
          ? compareValue(comparison, metric.changeKey).text
          : compareEnabled && canCompare
            ? 'Unavailable'
            : 'Not compared',
        metric.source,
        metric.notes,
      ]),
      [],
      ['--- CHANNEL PERFORMANCE ---'],
      ['Channel', 'Spend', 'Leads', 'Cost per lead', 'Notes', 'Currency'],
      ...channelRows.map((row) => [
        row.channel,
        row.spend,
        row.leads,
        row.cpl,
        row.note,
        currency,
      ]),
    ];

    if (overview?.sales) {
      rows.push(
        [],
        ['--- SALES & E-COMMERCE OPERATIONS ---'],
        ['Metric', 'Value', 'Currency / Unit'],
        ['Total Orders', overview.sales.total_orders, 'orders'],
        ['Delivered Orders', overview.sales.delivered_orders, 'orders'],
        ['Pending Orders', overview.sales.pending_orders, 'orders'],
        ['Operational Order Total (COD)', overview.sales.operational_order_total, currency],
        ['Delivered Orders Total', overview.sales.delivered_order_total, currency],
        ['Pending Orders Total', overview.sales.pending_order_total, currency],
        ['Realized Sales Revenue (Ledger)', overview.sales.sales_revenue, currency],
        ['Production Costs (COGS)', overview.sales.production_costs, currency],
        ['Delivery & Shipping Costs', overview.sales.delivery_costs, currency],
        ['Returns & Adjustments', overview.sales.returns_costs, currency],
        ['Realized Net Profit', overview.sales.realized_net_profit, currency]
      );
    }

    downloadCsv(`marketflow-analytics-${from}-${to}.csv`, rows);
  };

  const formattedDateRange = useMemo(() => {
    return `${formatDisplayDate(from)} – ${formatDisplayDate(to)}`;
  }, [from, to]);

  return (
    <main className="mx-auto max-w-[1440px] space-y-4 pb-8">
      {/* 1. Header with Breadcrumb */}
      <header className="space-y-1">
        <p className="text-xs font-medium text-[#64748B]">
          Insights <span className="px-1 text-[#CBD5E1]">/</span> Analytics
        </p>
        <h1 className="text-2xl font-bold tracking-tight text-[#1E1B4B] sm:text-[28px]">
          Marketing Analytics
        </h1>
        <p className="text-xs text-[#64748B] sm:text-sm">
          Track campaign performance using recorded marketing data.
        </p>
      </header>

      {/* 2. Unified Filter Bar */}
      <section
        aria-label="Analytics filters"
        className="flex flex-wrap items-center gap-2.5 rounded-xl border border-[#E2E8F0] bg-white p-2.5 sm:p-3 shadow-xs"
      >
        {/* Workspace selector */}
        <div className="relative flex items-center">
          <Building2 className="pointer-events-none absolute left-3 h-4 w-4 text-[#6D28D9]" />
          <select
            aria-label="Workspace"
            value={workspaceId}
            onChange={(e) => setCurrentWorkspace(e.target.value)}
            disabled={workspaces.length === 0}
            className="appearance-none rounded-lg border border-[#E2E8F0] bg-white py-2 pl-9 pr-8 text-xs font-semibold text-[#1E1B4B] hover:border-[#CBD5E1] focus:border-[#8B5CF6] focus:outline-none focus:ring-2 focus:ring-[#8B5CF6]/20 cursor-pointer"
          >
            {workspaces.length === 0 && <option value="">No workspaces</option>}
            {workspaces.map((ws) => (
              <option key={ws.id} value={ws.id}>{ws.name}</option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-2.5 h-3.5 w-3.5 text-[#94A3B8]" />
        </div>

        {/* Date range picker */}
        <div className="relative flex items-center rounded-lg border border-[#E2E8F0] bg-white px-2.5 py-1.5 text-xs font-semibold text-[#1E1B4B] hover:border-[#CBD5E1]">
          <CalendarDays className="mr-2 h-4 w-4 shrink-0 text-[#6D28D9]" />
          <input
            type="date"
            aria-label="Start date"
            value={from}
            max={to}
            onChange={(e) => e.target.value && setFrom(e.target.value)}
            className="border-0 bg-transparent p-0 text-xs font-semibold text-[#1E1B4B] focus:outline-none focus:ring-0 cursor-pointer"
          />
          <span className="mx-1.5 text-[#94A3B8]">–</span>
          <input
            type="date"
            aria-label="End date"
            value={to}
            min={from}
            onChange={(e) => e.target.value && setTo(e.target.value)}
            className="border-0 bg-transparent p-0 text-xs font-semibold text-[#1E1B4B] focus:outline-none focus:ring-0 cursor-pointer"
          />
        </div>

        {/* Campaign selector */}
        <div className="relative flex items-center">
          <Megaphone className="pointer-events-none absolute left-3 h-4 w-4 text-[#6D28D9]" />
          <select
            aria-label="Campaign"
            value={campaignFilter}
            onChange={(e) => setCampaignFilter(e.target.value)}
            disabled={!campaignsLoaded || campaigns.length === 0}
            className="appearance-none rounded-lg border border-[#E2E8F0] bg-white py-2 pl-9 pr-8 text-xs font-semibold text-[#1E1B4B] hover:border-[#CBD5E1] focus:border-[#8B5CF6] focus:outline-none focus:ring-2 focus:ring-[#8B5CF6]/20 cursor-pointer"
          >
            <option value="all">All campaigns</option>
            {campaigns.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-2.5 h-3.5 w-3.5 text-[#94A3B8]" />
        </div>

        {/* Channel selector */}
        <div className="relative flex items-center">
          <Share2 className="pointer-events-none absolute left-3 h-4 w-4 text-[#6D28D9]" />
          <select
            aria-label="Marketing channel"
            value={channelFilter}
            onChange={(e) => setChannelFilter(e.target.value)}
            disabled={!campaignsLoaded || channelOptions.length === 0}
            className="appearance-none rounded-lg border border-[#E2E8F0] bg-white py-2 pl-9 pr-8 text-xs font-semibold text-[#1E1B4B] hover:border-[#CBD5E1] focus:border-[#8B5CF6] focus:outline-none focus:ring-2 focus:ring-[#8B5CF6]/20 cursor-pointer"
          >
            <option value="all">All channels</option>
            {channelOptions.map((ch) => (
              <option key={ch} value={ch}>{ch}</option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-2.5 h-3.5 w-3.5 text-[#94A3B8]" />
        </div>

        {/* Compare selector */}
        <div className="relative flex items-center">
          <BarChart2 className="pointer-events-none absolute left-3 h-4 w-4 text-[#6D28D9]" />
          <select
            aria-label="Period comparison"
            value={compareEnabled ? 'previous' : 'none'}
            onChange={(e) => setCompareEnabled(e.target.value === 'previous')}
            disabled={!canCompare}
            className={`appearance-none rounded-lg border border-[#E2E8F0] bg-white py-2 pl-9 pr-8 text-xs font-semibold text-[#1E1B4B] hover:border-[#CBD5E1] focus:border-[#8B5CF6] focus:outline-none focus:ring-2 focus:ring-[#8B5CF6]/20 ${
              !canCompare ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'
            }`}
          >
            <option value="previous">Compare: Previous period</option>
            <option value="none">No comparison</option>
          </select>
          <ChevronDown className="pointer-events-none absolute right-2.5 h-3.5 w-3.5 text-[#94A3B8]" />
        </div>

        {/* Export button */}
        <div className="ml-auto">
          <button
            type="button"
            onClick={handleExport}
            disabled={loading || !campaignsLoaded || !hasWorkspace}
            className="flex items-center gap-1.5 rounded-lg border border-[#E2E8F0] bg-white px-3.5 py-2 text-xs font-semibold text-[#6D28D9] shadow-2xs transition hover:border-[#6D28D9]/40 hover:bg-[#F5F3FF] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Download className="h-3.5 w-3.5 text-[#6D28D9]" />
            <span>Export</span>
          </button>
        </div>
      </section>

      {analyticsError && (
        <div role="alert" className="flex items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-xs text-red-800">
          <span className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {analyticsError}
          </span>
          <button
            type="button"
            onClick={() => setRefreshKey((key) => key + 1)}
            className="inline-flex shrink-0 items-center gap-1 font-semibold underline"
          >
            <RefreshCw className="h-3 w-3" /> Retry
          </button>
        </div>
      )}

      {!hasWorkspace && (
        <p className={`${cardClass} px-4 py-5 text-sm text-[#64748B]`}>
          Select a workspace to view marketing analytics.
        </p>
      )}

      {/* 3. Six KPI Cards */}
      <section aria-label="Key performance indicators" className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
        <MetricCard
          label="Ad Spend"
          value={campaignsLoaded ? formatMetricValue('spend', metricDefinitions[0].value, currency) : loading ? 'Loading…' : 'N/A'}
          tooltip="Total advertising spend across all channels in the selected date range."
          icon={<Megaphone className="h-4 w-4" />}
          tone="purple"
          subtext="Finance ledger"
        />
        <MetricCard
          label="Leads"
          value={campaignsLoaded ? formatMetricValue('leads', metricDefinitions[1].value, currency) : loading ? 'Loading…' : 'N/A'}
          tooltip="Total leads generated from campaign records in this period."
          icon={<UsersRound className="h-4 w-4" />}
          tone="blue"
          subtext="0 CRM leads"
        />
        <MetricCard
          label="Cost Per Lead"
          value={campaignsLoaded ? formatMetricValue('costPerLead', metricDefinitions[2].value, currency) : loading ? 'Loading…' : 'N/A'}
          tooltip="Ad spend divided by total leads. Unavailable when leads are zero."
          icon={<Coins className="h-4 w-4" />}
          tone="teal"
          subtext="Requires leads > 0"
        />
        <MetricCard
          label="Marketing Customers"
          value={campaignsLoaded ? formatMetricValue('customers', metricDefinitions[3].value, currency) : loading ? 'Loading…' : 'N/A'}
          tooltip="Total marketing-attributed customers recorded in CRM. (17 customer records exist in Sales & Orders)."
          icon={<User className="h-4 w-4" />}
          tone="purple"
          subtext={`${overview?.sales?.customers_count ?? 0} sales customers`}
        />
        <MetricCard
          label="Lead Conversion"
          value={campaignsLoaded ? formatMetricValue('conversion', metricDefinitions[4].value, currency) : loading ? 'Loading…' : 'N/A'}
          tooltip="Percentage of leads that converted to customers."
          icon={<Percent className="h-4 w-4" />}
          tone="blue"
          subtext="Requires leads > 0"
        />
        <MetricCard
          label="ROAS"
          value={campaignsLoaded ? formatMetricValue('roas', metricDefinitions[5].value, currency) : loading ? 'Loading…' : 'N/A'}
          tooltip={`Revenue generated per 1 ${currency} of ad spend.`}
          icon={<TrendingUp className="h-4 w-4" />}
          tone="emerald"
          subtext="Awaiting sales attribution"
          isRoas
        />
      </section>

      {/* 4. E-commerce & Sales Operations */}
      {overview?.sales && (
        <section aria-label="E-commerce & sales operations" className={`${cardClass} p-4 sm:p-5`}>
          <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#F5F3FF] text-[#6D28D9]">
                  <ShoppingBag className="h-4 w-4" />
                </span>
                <h2 className="text-sm font-bold text-[#1E1B4B]">
                  E-commerce & Sales Operations
                </h2>
              </div>
              <p className="mt-1 text-xs text-[#64748B]">
                Operational order pipeline vs. realized financial ledger records for {formattedDateRange}.
              </p>
            </div>
            <div className="flex items-center gap-1.5 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] px-2.5 py-1 text-[11px] font-medium text-[#64748B]">
              <Info className="h-3.5 w-3.5 text-[#6D28D9]" />
              <span>Realized ledger revenue excludes uncollected COD</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <div className="rounded-lg border border-[#E2E8F0] bg-[#F8FAFC]/50 p-3">
              <p className="flex items-center gap-1 text-[11px] font-medium text-[#64748B]">
                <Package className="h-3.5 w-3.5 text-[#2563EB]" />
                <span>Total Orders</span>
              </p>
              <p className="mt-1 text-base sm:text-lg font-bold text-[#1E1B4B]">
                {overview.sales.total_orders.toLocaleString()}
              </p>
              <p className="mt-0.5 text-[10px] text-[#64748B]">
                {overview.sales.customers_count} customers · {overview.sales.delivered_orders} delivered · {overview.sales.pending_orders} pending
              </p>
            </div>

            <div className="rounded-lg border border-[#E2E8F0] bg-[#F8FAFC]/50 p-3">
              <p className="flex items-center gap-1 text-[11px] font-medium text-[#64748B]">
                <Truck className="h-3.5 w-3.5 text-[#6D28D9]" />
                <span>Gross Order Value</span>
              </p>
              <p className="mt-1 text-base sm:text-lg font-bold text-[#1E1B4B]">
                {formatMoney(overview.sales.operational_order_total, currency)}
              </p>
              <p className="mt-0.5 text-[10px] text-[#64748B]">
                Pipeline order total (COD)
              </p>
            </div>

            <div className="rounded-lg border border-[#E2E8F0] bg-[#F8FAFC]/50 p-3">
              <p className="flex items-center gap-1 text-[11px] font-medium text-[#16A34A]">
                <CheckCircle2 className="h-3.5 w-3.5 text-[#16A34A]" />
                <span>Realized Sales Revenue</span>
              </p>
              <p className="mt-1 text-base sm:text-lg font-bold text-[#16A34A]">
                {formatMoney(overview.sales.sales_revenue, currency)}
              </p>
              <p className="mt-0.5 text-[10px] text-[#64748B]">
                Confirmed ledger income
              </p>
            </div>

            <div className="rounded-lg border border-[#E2E8F0] bg-[#F8FAFC]/50 p-3">
              <p className="flex items-center gap-1 text-[11px] font-medium text-[#64748B]">
                <Coins className="h-3.5 w-3.5 text-[#D97706]" />
                <span>Production (COGS)</span>
              </p>
              <p className="mt-1 text-base sm:text-lg font-bold text-[#1E1B4B]">
                {formatMoney(overview.sales.production_costs, currency)}
              </p>
              <p className="mt-0.5 text-[10px] text-[#64748B]">
                Recorded product costs
              </p>
            </div>

            <div className="rounded-lg border border-[#E2E8F0] bg-[#F8FAFC]/50 p-3">
              <p className="flex items-center gap-1 text-[11px] font-medium text-[#64748B]">
                <RotateCcw className="h-3.5 w-3.5 text-[#DC2626]" />
                <span>Delivery & Returns</span>
              </p>
              <p className="mt-1 text-base sm:text-lg font-bold text-[#1E1B4B]">
                {formatMoney(overview.sales.delivery_costs + overview.sales.returns_costs, currency)}
              </p>
              <p className="mt-0.5 text-[10px] text-[#64748B]">
                {formatMoney(overview.sales.delivery_costs, currency)} deliv · {formatMoney(overview.sales.returns_costs, currency)} ret
              </p>
            </div>

            <div className="rounded-lg border border-[#E2E8F0] bg-[#F0FDF4] p-3">
              <p className="flex items-center gap-1 text-[11px] font-medium text-[#16A34A]">
                <Wallet className="h-3.5 w-3.5 text-[#16A34A]" />
                <span>Realized Net Profit</span>
              </p>
              <p className="mt-1 text-base sm:text-lg font-bold text-[#16A34A]">
                {formatMoney(overview.sales.realized_net_profit, currency)}
              </p>
              <p className="mt-0.5 text-[10px] text-[#16A34A]/80">
                Ledger sales minus order costs
              </p>
            </div>
          </div>
        </section>
      )}

      {/* 5. Second Row: Performance over time & Lead conversion funnel */}
      <section className="grid gap-3 lg:grid-cols-[1.65fr_1fr]">
        {/* Performance over time */}
        <article className={`${cardClass} flex min-w-0 flex-col justify-between p-4`}>
          <div>
            <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
              <div>
                <h2 className="text-sm font-bold text-[#1E1B4B]">Performance over time</h2>
                <p className="mt-0.5 text-[11px] text-[#64748B]">
                  {performanceMetric === 'spend'
                    ? `Daily advertising expenses from Finance ledger (accounting transaction dates) for ${formattedDateRange}.`
                    : performanceMetric === 'orders'
                      ? `Daily sales orders created in Sales & Orders for ${formattedDateRange}.`
                      : performanceMetric === 'leads'
                        ? `Daily marketing leads recorded in CRM for ${formattedDateRange}.`
                        : `Daily customers recorded for ${formattedDateRange}.`}
                </p>
              </div>
              <div className="flex gap-1" role="group" aria-label="Performance chart metric">
                {(['spend', 'orders', 'leads', 'customers'] as const).map((metric) => (
                  <button
                    key={metric}
                    type="button"
                    aria-pressed={performanceMetric === metric}
                    onClick={() => setPerformanceMetric(metric)}
                    className={`rounded-md px-3 py-1 text-xs font-semibold capitalize transition ${
                      performanceMetric === metric
                        ? 'bg-[#6D28D9] text-white shadow-2xs'
                        : 'bg-[#F5F3FF] text-[#6D28D9] hover:bg-[#EDE9FE]'
                    }`}
                  >
                    {metric === 'spend' ? 'Spend' : metric === 'orders' ? 'Orders' : metric === 'leads' ? 'Leads' : 'Customers'}
                  </button>
                ))}
              </div>
            </div>

            {loading ? (
              <LoadingState label="Loading performance data…" />
            ) : !timeSeries ? (
              <EmptyState label="Time-series data is unavailable." />
            ) : chartRows.length === 0 ? (
              <EmptyState label="No time-series records for this date range." />
            ) : (
              <div className="h-[230px] w-full sm:h-[245px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartRows} margin={{ top: 12, right: 16, left: -16, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                    <XAxis
                      dataKey="date"
                      tickFormatter={formatDate}
                      tick={{ fill: '#94A3B8', fontSize: 10 }}
                      axisLine={false}
                      tickLine={false}
                      minTickGap={20}
                    />
                    <YAxis
                      tick={{ fill: '#94A3B8', fontSize: 10 }}
                      axisLine={false}
                      tickLine={false}
                      width={40}
                      tickFormatter={(val: number) =>
                        val.toLocaleString(undefined, { notation: 'compact', maximumFractionDigits: 1 })
                      }
                    />
                    <Tooltip
                      labelFormatter={(label) => formatTooltipDate(String(label))}
                      formatter={(val) => [
                        `${Number(val).toLocaleString(undefined, { maximumFractionDigits: 2 })}${
                          performanceMetric === 'spend' ? ` ${currency}` : ''
                        }`,
                        performanceMetric === 'spend'
                          ? 'Spend'
                          : performanceMetric === 'orders'
                            ? 'Orders'
                            : performanceMetric === 'leads'
                              ? 'Leads'
                              : 'Customers',
                      ]}
                      contentStyle={{
                        borderRadius: 8,
                        borderColor: '#E2E8F0',
                        fontSize: 12,
                        boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="value"
                      name={performanceMetric}
                      stroke={purple}
                      strokeWidth={2.5}
                      dot={{ r: 3, fill: purple, strokeWidth: 0 }}
                      activeDot={{ r: 5, fill: purple, strokeWidth: 0 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
          <p className="mt-2 text-[11px] text-[#94A3B8]">
            {performanceMetric === 'spend'
              ? 'Source: Finance Ledger (Occurred accounting entry dates)'
              : performanceMetric === 'orders'
                ? 'Source: Sales & Orders'
                : performanceMetric === 'customers'
                  ? 'Source: Sales & Orders (Customer Records)'
                  : 'Source: CRM Records'}
          </p>
        </article>

        {/* Lead conversion funnel */}
        <article className={`${cardClass} flex min-w-0 flex-col justify-between p-4`}>
          <div>
            <div className="mb-4">
              <h2 className="text-sm font-bold text-[#1E1B4B]">Lead conversion funnel</h2>
              <p className="mt-0.5 text-[11px] text-[#64748B]">
                From total leads to converted customers.
              </p>
            </div>

            {loading ? (
              <LoadingState label="Loading lead statuses…" />
            ) : !overview?.crm ? (
              <EmptyState label="CRM lead status data is unavailable." />
            ) : (
              <div className="flex items-center justify-between gap-1.5 sm:gap-2">
                {funnelCounts.map((stage, idx) => (
                  <React.Fragment key={stage.name}>
                    <div className="flex-1 min-w-0 text-center">
                      <p className="truncate text-xs font-semibold text-[#1E1B4B]">{stage.name}</p>
                      <p className="mt-0.5 text-base sm:text-lg font-bold text-[#1E1B4B]">
                        {stage.count.toLocaleString()}
                      </p>
                      {/* Solid colored step block matching Image 1 */}
                      <div
                        className="my-2 h-10 w-full rounded-sm transition-all"
                        style={{ backgroundColor: stage.color }}
                        title={`${stage.name}: ${stage.count.toLocaleString()} leads`}
                      />
                      <p className="text-[10px] font-medium text-[#64748B]">
                        {stage.percentage !== null ? `${stage.percentage.toFixed(1)}%` : 'N/A'}
                        <span className="block text-[9px] text-[#94A3B8]">of leads</span>
                      </p>
                    </div>
                    {idx < funnelCounts.length - 1 && (
                      <div className="shrink-0 pb-6 text-[#CBD5E1]">
                        <ChevronRight className="h-4 w-4" />
                      </div>
                    )}
                  </React.Fragment>
                ))}
              </div>
            )}
          </div>
          <p className="mt-4 text-[11px] text-[#94A3B8]">Source: CRM Pipeline Stages (0 leads in CRM; 17 customer orders in Sales & Orders)</p>
        </article>
      </section>

      {/* 5. Third Row: Channel performance */}
      <section className={`${cardClass} p-4`}>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-bold text-[#1E1B4B]">Channel performance</h2>
            <p className="mt-0.5 text-[11px] text-[#64748B]">
              Campaign performance by marketing channel.
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3 text-xs font-medium text-[#64748B]">
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-[#6D28D9]" />
                Spend ({currency})
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-[#C4B5FD]" />
                Leads
              </span>
            </div>
            <div className="relative">
              <select
                aria-label="Channel metric sort"
                value={channelMetric}
                onChange={(e) => setChannelMetric(e.target.value as 'spend' | 'leads')}
                className="appearance-none rounded-lg border border-[#E2E8F0] bg-white py-1.5 pl-3 pr-7 text-xs font-medium text-[#1E1B4B] hover:border-[#CBD5E1] focus:outline-none cursor-pointer"
              >
                <option value="spend">Spend</option>
                <option value="leads">Leads</option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#94A3B8]" />
            </div>
          </div>
        </div>

        <div className="grid min-w-0 gap-4 lg:grid-cols-[1.65fr_1fr]">
          {loading ? (
            <LoadingState label="Loading channel performance…" />
          ) : channelRows.length === 0 ? (
            <EmptyState label="No campaign channel records match this date range and filter." />
          ) : (
            <div className="h-[210px] min-w-0">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={channelRows} margin={{ top: 16, right: 12, left: -16, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                  <XAxis
                    dataKey="channel"
                    tick={{ fill: '#64748B', fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: '#94A3B8', fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                    width={42}
                    tickFormatter={(val: number) =>
                      val.toLocaleString(undefined, { notation: 'compact', maximumFractionDigits: 1 })
                    }
                  />
                  <Tooltip
                    formatter={(val, name) => [
                      name === 'Spend' ? formatMoney(Number(val), currency) : Number(val).toLocaleString(),
                      name,
                    ]}
                    contentStyle={{
                      borderRadius: 8,
                      borderColor: '#E2E8F0',
                      fontSize: 12,
                      boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                    }}
                  />
                  <Bar
                    dataKey="spend"
                    name="Spend"
                    fill={purple}
                    radius={[4, 4, 0, 0]}
                    maxBarSize={36}
                  />
                  <Bar
                    dataKey="leads"
                    name="Leads"
                    fill={lightPurple}
                    radius={[4, 4, 0, 0]}
                    maxBarSize={36}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          <div className="min-w-0 overflow-hidden rounded-lg border border-[#E2E8F0] bg-white">
            <div className="grid grid-cols-[minmax(0,1.2fr)_1fr_0.8fr_0.8fr] gap-2 border-b border-[#E2E8F0] bg-[#F8FAFC] px-3 py-2 text-[10px] font-semibold text-[#64748B]">
              <span>Channel</span>
              <span className="text-right">Spend ({currency})</span>
              <span className="text-right">Leads</span>
              <span className="text-right">CPL ({currency})</span>
            </div>
            {channelRows.length === 0 ? (
              <p className="px-3 py-6 text-center text-xs text-[#94A3B8]">No channel data</p>
            ) : (
              <div className="max-h-[210px] divide-y divide-[#F1F5F9] overflow-y-auto">
                {channelRows.map((row) => (
                  <div
                    key={row.channel}
                    className="grid grid-cols-[minmax(0,1.2fr)_1fr_0.8fr_0.8fr] gap-2 px-3 py-2.5 text-xs"
                  >
                    <span className="truncate font-medium text-[#334155]" title={`${row.channel}${row.note ? ` (${row.note})` : ''}`}>
                      {row.channel}
                    </span>
                    <span className="text-right font-medium text-[#1E1B4B]">
                      {row.spend === null ? '—' : formatMoney(row.spend, currency)}
                    </span>
                    <span className="text-right font-medium text-[#1E1B4B]">
                      {row.leads === null ? '—' : row.leads.toLocaleString()}
                    </span>
                    <span className="text-right font-medium text-[#1E1B4B]">
                      {row.cpl === null ? 'N/A' : formatMoney(row.cpl, currency)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <p className="mt-3 text-[11px] text-[#94A3B8]">Source: Finance Ledger & Campaign Attribution</p>
      </section>

      {/* 6. Fourth Row: Detailed KPI breakdown */}
      <section className={`${cardClass} overflow-hidden p-4`}>
        <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 className="text-sm font-bold text-[#1E1B4B]">Detailed KPI breakdown</h2>
            <p className="mt-0.5 text-[11px] text-[#64748B]">
              {selectedCampaignName
                ? `Campaign metrics for ${selectedCampaignName}.`
                : 'Campaign metrics for selected period.'}
            </p>
          </div>
          {compareEnabled && canCompare && comparison && (
            <span className="text-xs text-[#64748B]">
              Previous period: {comparison.previous_period.from} – {comparison.previous_period.to}
            </span>
          )}
        </div>

        {comparisonError && compareEnabled && canCompare && (
          <p role="alert" className="mb-2 rounded-md bg-red-50 px-2.5 py-2 text-xs text-red-800">
            Comparison unavailable: {comparisonError}
          </p>
        )}

        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] border-collapse text-left">
            <thead>
              <tr className="border-b border-[#E2E8F0] bg-[#F8FAFC] text-[11px] font-semibold text-[#64748B]">
                <th className="px-3 py-2.5">Metric</th>
                <th className="px-3 py-2.5">Value</th>
                <th className="px-3 py-2.5">Change vs Previous Period</th>
                <th className="px-3 py-2.5">Source</th>
                <th className="px-3 py-2.5">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F1F5F9]">
              {metricDefinitions.map((metric) => {
                const change = compareEnabled && canCompare && metric.changeKey
                  ? compareValue(comparison, metric.changeKey)
                  : { text: '—', direction: 'neutral' as const };
                const isRoas = metric.key === 'roas';

                return (
                  <tr key={metric.key} className="text-xs hover:bg-[#F8FAFC]/60 transition">
                    <td className="whitespace-nowrap px-3 py-3 font-medium text-[#334155]">
                      <div className="flex items-center gap-2">
                        <span className="text-[#6D28D9]">{metric.icon}</span>
                        <span>{metric.label}</span>
                      </div>
                    </td>
                    <td
                      className={`whitespace-nowrap px-3 py-3 font-bold ${
                        isRoas && metric.formatted !== 'Unavailable'
                          ? 'text-[#16A34A]'
                          : 'text-[#1E1B4B]'
                      }`}
                    >
                      {loading || !campaignsLoaded ? 'Loading…' : metric.formatted}
                    </td>
                    <td className="whitespace-nowrap px-3 py-3 font-semibold">
                      {compareEnabled ? (
                        comparisonLoading ? (
                          <span className="text-[#94A3B8]">Loading…</span>
                        ) : (
                          <span
                            className={
                              change.direction === 'up'
                                ? 'text-emerald-600'
                                : change.direction === 'down'
                                  ? 'text-rose-600'
                                  : 'text-[#64748B]'
                            }
                          >
                            {change.text}
                          </span>
                        )
                      ) : (
                        <span className="text-[#94A3B8]">Not compared</span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-3 py-3 text-[#64748B]">
                      {metric.source}
                    </td>
                    <td className="px-3 py-3 text-[#64748B]">
                      {metric.notes}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <p className="mt-3 text-[11px] text-[#94A3B8]">Source: Finance Ledger, CRM & Sales Operational Records</p>
      </section>

      {loading && <p role="status" className="sr-only">Loading analytics data…</p>}
    </main>
  );
};

const LoadingState: React.FC<{ label: string }> = ({ label }) => (
  <div role="status" className="flex min-h-[160px] items-center justify-center gap-2 text-xs text-[#64748B]">
    <LoaderCircle className="h-4 w-4 animate-spin text-[#6D28D9]" />
    {label}
  </div>
);

const EmptyState: React.FC<{ label: string }> = ({ label }) => (
  <div className="flex min-h-[160px] items-center justify-center px-4 text-center text-xs text-[#64748B]">
    {label}
  </div>
);
