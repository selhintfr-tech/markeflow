import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { ArrowRightLeft, BarChart3, CalendarDays, Check, FileText, Megaphone, Scale, Users } from 'lucide-react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { campaignService, type CampaignRecord } from '../campaigns/campaignService';
import { analyticsApi, type CampaignPerformanceComparison, type PeriodComparison } from '../analytics/analyticsApi';
import { MetaHistoricalStudiesPanel } from '../integrations/meta/MetaHistoricalStudiesPanel';

const inputClass = 'w-full rounded-lg border border-[#E2E8F0] bg-white px-3 py-2 text-sm text-[#1E1B4B] outline-none focus:border-[#7C3AED] focus:ring-2 focus:ring-[#7C3AED]/10';
const dateNow = new Date();
const formatDate = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
const addDays = (dateString: string, days: number) => {
  const [year, month, day] = dateString.split('-').map(Number);
  return formatDate(new Date(year, month - 1, day + days));
};
const endDefault = formatDate(dateNow);
const startDefault = formatDate(new Date(dateNow.getFullYear(), dateNow.getMonth(), 1));
const previousEndDefault = addDays(startDefault, -1);
const periodDays = Math.round((new Date(`${endDefault}T00:00:00`).getTime() - new Date(`${startDefault}T00:00:00`).getTime()) / 86400000);
const previousStartDefault = addDays(previousEndDefault, -periodDays);
const campaignMetricKeys = ['revenue', 'costs', 'profit', 'leads'] as const;
type CampaignMetricKey = typeof campaignMetricKeys[number];
type ChartRow = { name: string; revenue: number; costs: number; profit: number; leads: number };

function formatNumber(value: number | null, maximumFractionDigits = 2): string {
  return value === null ? 'Unavailable' : value.toLocaleString(undefined, { maximumFractionDigits });
}

function formatMoney(value: number | null, currency: string): string {
  return value === null ? 'Unavailable' : `${formatNumber(value)} ${currency || 'Currency unavailable'}`;
}

function metricLabel(key: string): string {
  return key.split('.').map((part) => part.replaceAll('_', ' ')).join(' / ');
}

function CampaignKpi({ label, value, currency, icon: Icon, accent }: {
  label: string;
  value: number;
  currency: string;
  icon: React.ElementType;
  accent: 'purple' | 'teal';
}) {
  const valueLabel = label === 'Leads' ? formatNumber(value, 0) : formatMoney(value, currency);
  return <div className="min-w-0 rounded-lg border border-[#EDF0F6] bg-[#FAFBFD] p-2.5">
    <div className="flex items-center gap-1.5 text-[10px] font-medium text-[#64748B]">
      <Icon className={`h-3.5 w-3.5 shrink-0 ${accent === 'teal' ? 'text-[#0D9488]' : 'text-[#6D28D9]'}`} />
      <span className="truncate">{label}</span>
    </div>
    <div className={`mt-1 text-[13px] font-bold ${accent === 'teal' ? (value < 0 ? 'text-rose-600' : 'text-[#0D9488]') : 'text-[#1E1B4B]'}`}>{valueLabel}</div>
  </div>;
}

function CampaignSummary({ name, label, metrics, currency }: {
  name: string;
  label: 'Campaign A' | 'Campaign B';
  metrics: Record<CampaignMetricKey, number>;
  currency: string;
}) {
  return <article className="rounded-xl border border-[#E2E8F0] bg-white p-4 shadow-2xs">
    <div className="mb-3 flex items-center gap-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#EDE9FE] text-[#6D28D9]"><Megaphone className="h-4 w-4" /></div>
      <div className="min-w-0">
        <h2 className="truncate text-sm font-bold text-[#1E1B4B]">{name}</h2>
        <p className="mt-0.5 flex items-center gap-1.5 text-[10px] text-[#64748B]">{label}<span>·</span><span className="h-1.5 w-1.5 rounded-full bg-[#0D9488]" /><span>Persisted workspace data</span></p>
      </div>
    </div>
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      <CampaignKpi label="Revenue" value={metrics.revenue} currency={currency} icon={BarChart3} accent="purple" />
      <CampaignKpi label="Total Recorded Costs" value={metrics.costs} currency={currency} icon={FileText} accent="purple" />
      <CampaignKpi label="Estimated Profit" value={metrics.profit} currency={currency} icon={Scale} accent="teal" />
      <CampaignKpi label="Leads" value={metrics.leads} currency={currency} icon={Users} accent="purple" />
    </div>
  </article>;
}

function ComparisonChart({ title, description, rows, metric, currency }: {
  title: string;
  description: string;
  rows: ChartRow[];
  metric: 'revenue-costs' | 'profit' | 'leads';
  currency: string;
}) {
  const monetary = metric !== 'leads';
  return <section className="min-w-0 rounded-xl border border-[#E2E8F0] bg-white p-4 shadow-2xs">
    <h3 className="text-xs font-bold text-[#1E1B4B]">{title}</h3>
    <p className="mt-0.5 text-[10px] text-[#64748B]">{description}</p>
    <div className="mt-3 h-48 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={rows} margin={{ top: 20, right: 5, left: -20, bottom: 0 }} barGap={8}>
          <CartesianGrid stroke="#F1F5F9" strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 9 }} />
          <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94A3B8', fontSize: 9 }} tickFormatter={(value: number) => value.toLocaleString()} />
          <Tooltip formatter={(value) => [`${Number(value).toLocaleString()}${monetary ? ` ${currency}` : ''}`, '']} />
          {metric === 'revenue-costs' ? <>
            <Bar dataKey="revenue" name="Revenue" fill="#6D28D9" radius={[3, 3, 0, 0]}>
              <LabelList dataKey="revenue" position="top" fill="#1E1B4B" fontSize={9} formatter={(value) => Number(value).toLocaleString()} />
            </Bar>
            <Bar dataKey="costs" name="Total Recorded Costs" fill="#C4B5FD" radius={[3, 3, 0, 0]}>
              <LabelList dataKey="costs" position="top" fill="#1E1B4B" fontSize={9} formatter={(value) => Number(value).toLocaleString()} />
            </Bar>
          </> : <Bar dataKey={metric} name={metric === 'profit' ? 'Estimated Profit' : 'Leads'} radius={[3, 3, 0, 0]}>
            {rows.map((row, index) => <Cell key={`${row.name}-${index}`} fill={metric === 'profit' ? (index === 0 ? '#0D9488' : '#5EEAD4') : (index === 0 ? '#6D28D9' : '#C4B5FD')} />)}
            <LabelList dataKey={metric} position="top" fill="#1E1B4B" fontSize={9} formatter={(value) => Number(value).toLocaleString()} />
          </Bar>}
        </BarChart>
      </ResponsiveContainer>
    </div>
    <div className="mt-2 flex flex-wrap justify-center gap-x-4 gap-y-1 border-t border-[#F1F5F9] pt-2 text-[9px] text-[#64748B]">
      {metric === 'revenue-costs' ? <><span className="flex items-center gap-1"><i className="h-2 w-2 rounded-full bg-[#6D28D9]" />Revenue ({currency})</span><span className="flex items-center gap-1"><i className="h-2 w-2 rounded-full bg-[#C4B5FD]" />Recorded costs ({currency})</span></>
        : <span className="flex items-center gap-1"><i className={`h-2 w-2 rounded-full ${metric === 'profit' ? 'bg-[#0D9488]' : 'bg-[#6D28D9]'}`} />{metric === 'profit' ? `Estimated profit (${currency})` : 'Leads'}</span>}
    </div>
  </section>;
}

function differenceText(value: number, key: CampaignMetricKey, currency: string): string {
  const sign = value > 0 ? '+' : '';
  const amount = key === 'leads' ? formatNumber(value, 0) : formatMoney(value, currency);
  return `${sign}${amount}`;
}

export const ComparisonsPage: React.FC = () => {
  const { workspaces, currentWorkspace, hasWorkspace, setCurrentWorkspace } = useWorkspace();
  const workspaceId = currentWorkspace.id;
  const [mode, setMode] = useState<'campaigns' | 'periods'>('campaigns');
  const [campaigns, setCampaigns] = useState<CampaignRecord[]>([]);
  const [campaignA, setCampaignA] = useState('');
  const [campaignB, setCampaignB] = useState('');
  const [from, setFrom] = useState(startDefault);
  const [to, setTo] = useState(endDefault);
  const [previousFrom, setPreviousFrom] = useState(previousStartDefault);
  const [previousTo, setPreviousTo] = useState(previousEndDefault);
  const [periodResult, setPeriodResult] = useState<PeriodComparison | null>(null);
  const [campaignResult, setCampaignResult] = useState<CampaignPerformanceComparison | null>(null);
  const [campaignLoading, setCampaignLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const campaignLoadId = useRef(0);
  const comparisonId = useRef(0);

  useEffect(() => {
    const current = ++campaignLoadId.current;
    comparisonId.current += 1;
    setError('');
    setCampaigns([]);
    setCampaignA('');
    setCampaignB('');
    setCampaignResult(null);
    if (!workspaceId || !hasWorkspace) {
      setCampaignLoading(false);
      return;
    }
    setCampaignLoading(true);
    campaignService.list(workspaceId).then((records) => {
      if (current !== campaignLoadId.current) return;
      setCampaigns(records);
      setCampaignA(records[0]?.id || '');
      setCampaignB(records.find((record) => record.id !== records[0]?.id)?.id || '');
    }).catch((cause: unknown) => {
      if (current === campaignLoadId.current) setError(cause instanceof Error ? cause.message : 'Unable to load workspace campaigns.');
    }).finally(() => {
      if (current === campaignLoadId.current) setCampaignLoading(false);
    });
    return () => { campaignLoadId.current += 1; };
  }, [workspaceId, hasWorkspace]);

  const invalidateComparison = () => {
    comparisonId.current += 1;
    setLoading(false);
    setPeriodResult(null);
    setCampaignResult(null);
  };

  const compare = async () => {
    if (!workspaceId) return;
    if (mode === 'campaigns' && (!campaignA || !campaignB || campaignA === campaignB)) {
      setError('Choose two different campaigns in the selected workspace.');
      return;
    }
    if (mode === 'campaigns' ? to < from : (to < from || previousTo < previousFrom)) {
      setError('Each reporting period must have an end date on or after its start date.');
      return;
    }
    const current = ++comparisonId.current;
    setLoading(true);
    setError('');
    setPeriodResult(null);
    setCampaignResult(null);
    try {
      if (mode === 'periods') {
        const result = await analyticsApi.comparePeriods(workspaceId, from, to, previousFrom, previousTo);
        if (current === comparisonId.current) setPeriodResult(result);
      } else {
        const result = await analyticsApi.compareCampaignPerformance(workspaceId, campaignA, campaignB, from, to);
        if (current === comparisonId.current) setCampaignResult(result);
      }
    } catch (cause) {
      if (current === comparisonId.current) setError(cause instanceof Error ? cause.message : 'Unable to compare selected data.');
    } finally {
      if (current === comparisonId.current) setLoading(false);
    }
  };

  const metric = (key: CampaignMetricKey) => campaignResult?.metrics[key];
  const rows: ChartRow[] = campaignResult ? [
    {
      name: campaignResult.campaign_a.name,
      revenue: metric('revenue')?.campaign_a ?? 0,
      costs: metric('costs')?.campaign_a ?? 0,
      profit: metric('profit')?.campaign_a ?? 0,
      leads: metric('leads')?.campaign_a ?? 0,
    },
    {
      name: campaignResult.campaign_b.name,
      revenue: metric('revenue')?.campaign_b ?? 0,
      costs: metric('costs')?.campaign_b ?? 0,
      profit: metric('profit')?.campaign_b ?? 0,
      leads: metric('leads')?.campaign_b ?? 0,
    },
  ] : [];
  const campaignMetrics = (side: 'campaign_a' | 'campaign_b') => ({
    revenue: metric('revenue')?.[side] ?? 0,
    costs: metric('costs')?.[side] ?? 0,
    profit: metric('profit')?.[side] ?? 0,
    leads: metric('leads')?.[side] ?? 0,
  });
  const profitDifference = (metric('profit')?.change ?? 0);
  const selectedCampaigns = campaignResult ? [
    { id: campaignResult.campaign_a.id, name: campaignResult.campaign_a.name },
    { id: campaignResult.campaign_b.id, name: campaignResult.campaign_b.name },
  ] : [];
  const currentCurrency = campaignResult?.currency || currentWorkspace.currency || '';

  return <main className="mx-auto max-w-[1400px] space-y-4 pb-12">
    <header>
      <div className="text-xs text-[#64748B]">Insights / Comparisons</div>
      <h1 className="mt-1 text-[28px] font-extrabold tracking-tight text-[#1E1B4B]">Performance Comparison</h1>
      <p className="mt-0.5 text-sm text-[#64748B]">Compare recorded campaign performance over the same reporting period.</p>
    </header>

    <div className="flex flex-wrap items-end gap-3 rounded-xl border border-[#E2E8F0] bg-white p-3">
      <label className="min-w-48 flex-1 text-[10px] font-medium text-[#64748B]">Workspace
        <select aria-label="Workspace" className={`${inputClass} mt-1`} value={workspaceId} onChange={(event) => { invalidateComparison(); setCurrentWorkspace(event.target.value); }}>
          {workspaces.map((workspace) => <option key={workspace.id} value={workspace.id}>{workspace.name}</option>)}
        </select>
      </label>
      {mode === 'campaigns' && <>
        <label className="min-w-48 flex-1 text-[10px] font-medium text-[#64748B]">Campaign A
          <select aria-label="Campaign A" className={`${inputClass} mt-1`} value={campaignA} onChange={(event) => {
            const next = event.target.value;
            setCampaignA(next);
            if (next === campaignB) setCampaignB(campaigns.find((campaign) => campaign.id !== next)?.id || '');
            invalidateComparison();
          }} disabled={campaignLoading || !campaigns.length}>
            <option value="">Select campaign</option>{campaigns.map((campaign) => <option key={campaign.id} value={campaign.id}>{campaign.name}</option>)}
          </select>
        </label>
        <ArrowRightLeft className="mb-2 hidden h-4 w-4 text-[#6D28D9] sm:block" aria-hidden="true" />
        <label className="min-w-48 flex-1 text-[10px] font-medium text-[#64748B]">Campaign B
          <select aria-label="Campaign B" className={`${inputClass} mt-1`} value={campaignB} onChange={(event) => { setCampaignB(event.target.value); invalidateComparison(); }} disabled={campaignLoading || campaigns.filter((campaign) => campaign.id !== campaignA).length === 0}>
            <option value="">Select campaign</option>{campaigns.filter((campaign) => campaign.id !== campaignA).map((campaign) => <option key={campaign.id} value={campaign.id}>{campaign.name}</option>)}
          </select>
        </label>
        <label className="min-w-36 text-[10px] font-medium text-[#64748B]">Period from
          <input aria-label="Reporting period start" type="date" className={`${inputClass} mt-1`} value={from} max={to} onChange={(event) => { setFrom(event.target.value); invalidateComparison(); }} />
        </label>
        <label className="min-w-36 text-[10px] font-medium text-[#64748B]">Period to
          <input aria-label="Reporting period end" type="date" className={`${inputClass} mt-1`} value={to} min={from} onChange={(event) => { setTo(event.target.value); invalidateComparison(); }} />
        </label>
      </>}
      <button type="button" onClick={() => void compare()} disabled={!hasWorkspace || campaignLoading || loading || (mode === 'campaigns' && campaigns.length < 2)} className="inline-flex items-center gap-2 rounded-lg bg-[#6D28D9] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#5B21B6] disabled:cursor-not-allowed disabled:opacity-50">
        <Scale className="h-4 w-4" />{loading ? 'Comparing…' : 'Compare'}
      </button>
    </div>

    <div className="flex gap-2" role="tablist" aria-label="Comparison mode">
      <button type="button" role="tab" aria-selected={mode === 'campaigns'} onClick={() => { setMode('campaigns'); invalidateComparison(); setError(''); }} className={`rounded-lg px-4 py-2 text-xs font-semibold ${mode === 'campaigns' ? 'bg-[#6D28D9] text-white' : 'border border-[#CBD5E1] bg-white text-[#475569]'}`}>Campaigns</button>
      <button type="button" role="tab" aria-selected={mode === 'periods'} onClick={() => { setMode('periods'); invalidateComparison(); setError(''); }} className={`rounded-lg px-4 py-2 text-xs font-semibold ${mode === 'periods' ? 'bg-[#6D28D9] text-white' : 'border border-[#CBD5E1] bg-white text-[#475569]'}`}>Date ranges</button>
    </div>

    {error && <div role="alert" className="flex items-center justify-between rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800"><span>{error}</span><button type="button" onClick={() => {
      if (mode === 'periods' || campaigns.length > 0) {
        void compare();
      } else if (workspaceId) {
        const retryId = ++campaignLoadId.current;
        setCampaignLoading(true);
        setError('');
        void campaignService.list(workspaceId).then((records) => {
          if (retryId !== campaignLoadId.current) return;
          setCampaigns(records);
          setCampaignA(records[0]?.id || '');
          setCampaignB(records.find((record) => record.id !== records[0]?.id)?.id || '');
        }).catch((cause: unknown) => {
          if (retryId === campaignLoadId.current) setError(cause instanceof Error ? cause.message : 'Unable to load workspace campaigns.');
        }).finally(() => {
          if (retryId === campaignLoadId.current) setCampaignLoading(false);
        });
      } else {
        setError('');
      }
    }} className="font-semibold underline">{campaigns.length > 0 ? 'Retry comparison' : 'Retry loading'}</button></div>}
    {campaignLoading && <p role="status" className="rounded-lg border border-[#E2E8F0] bg-white p-4 text-sm text-[#64748B]">Loading campaigns…</p>}
    {!campaignLoading && mode === 'campaigns' && hasWorkspace && campaigns.length === 0 && !error && <p className="rounded-lg border border-[#E2E8F0] bg-white p-4 text-sm text-[#64748B]">No campaigns are available in this workspace.</p>}
    {!campaignLoading && mode === 'campaigns' && hasWorkspace && campaigns.length === 1 && <p className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">A second workspace campaign is needed to compare campaign performance.</p>}

    {mode === 'periods' && <section className="grid gap-3 rounded-xl border border-[#E2E8F0] bg-white p-4 md:grid-cols-2">
      <div className="grid gap-3 sm:grid-cols-2"><label className="text-[10px] font-medium text-[#64748B]">Current from<input aria-label="Current period start" type="date" className={`${inputClass} mt-1`} value={from} max={to} onChange={(event) => { setFrom(event.target.value); invalidateComparison(); }} /></label><label className="text-[10px] font-medium text-[#64748B]">Current to<input aria-label="Current period end" type="date" className={`${inputClass} mt-1`} value={to} min={from} onChange={(event) => { setTo(event.target.value); invalidateComparison(); }} /></label></div>
      <div className="grid gap-3 sm:grid-cols-2"><label className="text-[10px] font-medium text-[#64748B]">Previous from<input aria-label="Previous period start" type="date" className={`${inputClass} mt-1`} value={previousFrom} max={previousTo} onChange={(event) => { setPreviousFrom(event.target.value); invalidateComparison(); }} /></label><label className="text-[10px] font-medium text-[#64748B]">Previous to<input aria-label="Previous period end" type="date" className={`${inputClass} mt-1`} value={previousTo} min={previousFrom} onChange={(event) => { setPreviousTo(event.target.value); invalidateComparison(); }} /></label></div>
      <p className="text-[10px] text-[#64748B] md:col-span-2"><CalendarDays className="mr-1 inline h-3.5 w-3.5" />Date-range comparison remains available as a secondary mode.</p>
    </section>}

    {campaignResult && <>
      <p className="text-[10px] text-[#64748B]">Reporting period: {campaignResult.period.from} – {campaignResult.period.to}. Currency: {currentCurrency}. Amounts below use posted workspace finance-ledger transactions; budgets and Meta Ads spend are excluded. A zero means no matching posted ledger amount in this period, not that no unrecorded business activity occurred.</p>
      <div className="grid gap-3 lg:grid-cols-2">
        <CampaignSummary name={campaignResult.campaign_a.name} label="Campaign A" metrics={campaignMetrics('campaign_a')} currency={currentCurrency} />
        <CampaignSummary name={campaignResult.campaign_b.name} label="Campaign B" metrics={campaignMetrics('campaign_b')} currency={currentCurrency} />
      </div>
      <div className="grid gap-3 lg:grid-cols-3">
        <ComparisonChart title="Revenue vs. Costs Comparison" description="Posted ledger income and expenses for the selected period." rows={rows} metric="revenue-costs" currency={currentCurrency} />
        <ComparisonChart title="Estimated Profit Comparison" description="Recorded income minus recorded expenses." rows={rows} metric="profit" currency={currentCurrency} />
        <ComparisonChart title="Leads Comparison" description="CRM leads linked to each campaign and created in this period." rows={rows} metric="leads" currency={currentCurrency} />
      </div>
      <section className="overflow-hidden rounded-xl border border-[#E2E8F0] bg-white shadow-2xs">
        <div className="border-b border-[#F1F5F9] px-4 py-3"><h3 className="text-sm font-bold text-[#1E1B4B]">Campaign Performance Comparison</h3><p className="mt-0.5 text-[10px] text-[#64748B]">Side-by-side differences use the same currency, accounting basis and reporting period.</p></div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-[11px]">
            <thead className="bg-[#F8F7FC] text-[10px] font-semibold text-[#64748B]"><tr><th className="px-3 py-2">Metric</th><th className="px-3 py-2">{campaignResult.campaign_a.name}</th><th className="px-3 py-2">{campaignResult.campaign_b.name}</th><th className="px-3 py-2">Difference (A − B)</th><th className="px-3 py-2">Observation</th></tr></thead>
            <tbody className="divide-y divide-[#F1F5F9]">
              {campaignMetricKeys.map((key) => {
                const result = metric(key);
                const change = result?.change ?? 0;
                const winner = change === 0 ? 'Both campaigns have the same recorded value.' : `${change > 0 ? campaignResult.campaign_a.name : campaignResult.campaign_b.name} has ${formatNumber(Math.abs(change), key === 'leads' ? 0 : 2)}${key === 'leads' ? '' : ` ${currentCurrency}`} ${key === 'revenue' ? 'more recorded revenue' : key === 'costs' ? 'more recorded costs' : key === 'profit' ? 'higher estimated profit' : 'more recorded leads'}.`;
                const title = key === 'costs' ? 'Total Recorded Costs' : key === 'profit' ? 'Estimated Profit' : key.charAt(0).toUpperCase() + key.slice(1);
                return <tr key={key} className="hover:bg-[#FCFBFE]">
                  <td className="px-3 py-2.5 font-semibold text-[#1E1B4B]">{title}</td>
                  <td className="px-3 py-2.5">{key === 'leads' ? formatNumber(result?.campaign_a ?? 0, 0) : formatMoney(result?.campaign_a ?? 0, currentCurrency)}</td>
                  <td className="px-3 py-2.5">{key === 'leads' ? formatNumber(result?.campaign_b ?? 0, 0) : formatMoney(result?.campaign_b ?? 0, currentCurrency)}</td>
                  <td className={`px-3 py-2.5 font-bold ${change === 0 ? 'text-[#64748B]' : key === 'costs' ? (change > 0 ? 'text-rose-600' : 'text-[#0D9488]') : (change > 0 ? 'text-[#0D9488]' : 'text-rose-600')}`}>{differenceText(change, key, currentCurrency)}</td>
                  <td className="px-3 py-2.5 text-[#64748B]">{winner}</td>
                </tr>;
              })}
            </tbody>
          </table>
        </div>
      </section>
      <div className="grid gap-3 lg:grid-cols-[1.1fr_1.9fr]">
        <section className="flex items-center gap-3 rounded-xl border border-[#A7F3D0] bg-[#ECFDF5] p-4">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#0D9488] text-white"><Check className="h-4 w-4" /></div>
          <div><div className="text-[10px] font-bold uppercase tracking-wider text-[#0D9488]">Conclusion</div><p className="mt-1 text-sm font-bold text-[#1E1B4B]">{profitDifference === 0 ? 'Both campaigns have the same estimated profit based on recorded ledger activity.' : `${profitDifference > 0 ? campaignResult.campaign_a.name : campaignResult.campaign_b.name} has higher estimated profit by ${formatMoney(Math.abs(profitDifference), currentCurrency)} based on recorded ledger activity.`}</p></div>
        </section>
        <section className="rounded-xl border border-[#E2E8F0] bg-white p-4">
          <h3 className="text-xs font-bold text-[#1E1B4B]">Related Links</h3><p className="mt-0.5 text-[10px] text-[#64748B]">Open the selected campaigns and related reporting.</p>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {selectedCampaigns.map((campaign) => <div key={campaign.id} className="flex min-w-0 flex-wrap items-center gap-2 border-t border-[#F1F5F9] pt-2">
              <span className="mr-auto flex min-w-0 items-center gap-1.5 truncate text-[10px] font-semibold text-[#1E1B4B]"><Megaphone className="h-3.5 w-3.5 shrink-0 text-[#6D28D9]" />{campaign.name}</span>
              <Link to={`/campaigns/${campaign.id}`} className="inline-flex items-center gap-1 rounded-md border border-[#E2E8F0] px-2 py-1 text-[9px] font-semibold text-[#6D28D9] hover:bg-[#F5F3FF]"><FileText className="h-3 w-3" />Campaign Details</Link>
              <Link to="/analytics" className="rounded-md border border-[#E2E8F0] px-2 py-1 text-[9px] font-semibold text-[#6D28D9] hover:bg-[#F5F3FF]">Analytics</Link>
              <Link to="/reports" className="rounded-md border border-[#E2E8F0] px-2 py-1 text-[9px] font-semibold text-[#6D28D9] hover:bg-[#F5F3FF]">Reports</Link>
            </div>)}
          </div>
        </section>
      </div>
      <details className="rounded-xl border border-[#E2E8F0] bg-white">
        <summary className="cursor-pointer px-4 py-3 text-xs font-semibold text-[#1E1B4B]">Calculation basis and data limitations</summary>
        <p className="border-t border-[#F1F5F9] px-4 py-3 text-[10px] leading-relaxed text-[#64748B]">{campaignResult.definition}</p>
      </details>
    </>}

    {periodResult && <section className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <article className="rounded-xl border border-[#E2E8F0] bg-white p-3"><p className="text-[10px] text-[#64748B]">Current period</p><p className="mt-1 text-sm font-semibold text-[#1E1B4B]">{periodResult.current_period.from} – {periodResult.current_period.to}</p></article>
        <article className="rounded-xl border border-[#E2E8F0] bg-white p-3"><p className="text-[10px] text-[#64748B]">Previous period</p><p className="mt-1 text-sm font-semibold text-[#1E1B4B]">{periodResult.previous_period.from} – {periodResult.previous_period.to}</p></article>
      </div>
      <div className="overflow-x-auto rounded-xl border border-[#E2E8F0] bg-white"><table className="w-full min-w-[680px] text-left text-xs">
        <thead className="bg-[#F8F7FC] text-[#64748B]"><tr><th className="p-3">Metric</th><th className="p-3">Current</th><th className="p-3">Previous</th><th className="p-3">Change</th><th className="p-3">Change %</th></tr></thead>
        <tbody>{Object.entries(periodResult.metrics).map(([key, row]) => <tr key={key} className="border-t border-[#F1F5F9]"><td className="p-3 capitalize">{metricLabel(key)}</td><td className="p-3">{formatNumber(row.current)}</td><td className="p-3">{formatNumber(row.previous)}</td><td className="p-3">{formatNumber(row.change)}</td><td className="p-3">{row.percent_change === null ? 'Unavailable' : `${row.percent_change}%`}</td></tr>)}</tbody>
      </table></div>
      <p className="text-[10px] text-[#64748B]">{periodResult.definition} Monetary values are in the selected workspace currency ({currentWorkspace.currency || 'unavailable'}).</p>
    </section>}

    <details className="rounded-xl border border-[#E2E8F0] bg-white">
      <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-[#1E1B4B]">Historical Meta Campaign Studies <span className="font-normal text-[#64748B]">· read-only</span></summary>
      <div className="border-t border-[#F1F5F9] p-3"><MetaHistoricalStudiesPanel /></div>
    </details>
  </main>;
};
