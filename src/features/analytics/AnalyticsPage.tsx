import React, { useEffect, useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useWorkspace } from '../../context/WorkspaceContext';
import { analyticsApi, type AnalyticsOverview, type TimeSeries } from './analyticsApi';

const inputClass = 'rounded-lg border border-[#E2E8F0] bg-white px-3 py-2 text-sm text-[#1E1B4B]';
const today = new Date();
const localDate = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
const monthStart = (date: Date) => localDate(new Date(date.getFullYear(), date.getMonth(), 1));

function formatMetric(value: number | string | null | undefined, currency = false) {
  if (value === null || value === undefined) return 'Unavailable';
  const number = Number(value);
  return currency ? `${number.toLocaleString(undefined, { maximumFractionDigits: 2 })} (currency not specified)` : number.toLocaleString();
}

const MetricCard = ({ title, value }: { title: string; value: string }) => (
  <article className="rounded-xl border border-[#E2E8F0] bg-white p-4 shadow-xs">
    <p className="text-xs font-medium text-[#64748B]">{title}</p>
    <p className="mt-2 text-xl font-bold text-[#1E1B4B]">{value}</p>
  </article>
);

export const AnalyticsPage: React.FC = () => {
  const { currentWorkspace, hasWorkspace } = useWorkspace();
  const workspaceId = currentWorkspace.id;
  const [from, setFrom] = useState(monthStart(today));
  const [to, setTo] = useState(localDate(today));
  const [overview, setOverview] = useState<AnalyticsOverview | null>(null);
  const [timeseries, setTimeseries] = useState<TimeSeries | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);
  const [selectedSeries, setSelectedSeries] = useState('projects');

  useEffect(() => {
    if (!workspaceId || !hasWorkspace) {
      setOverview(null);
      setTimeseries(null);
      return;
    }
    let active = true;
    setOverview(null);
    setTimeseries(null);
    setLoading(true);
    setError('');
    Promise.all([
      analyticsApi.overview(workspaceId, from, to),
      analyticsApi.timeseries(workspaceId, from, to),
    ]).then(([nextOverview, nextSeries]) => {
      if (!active) return;
      setOverview(nextOverview);
      setTimeseries(nextSeries);
    }).catch((cause: unknown) => {
      if (active) setError(cause instanceof Error ? cause.message : 'Unable to load analytics.');
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, [workspaceId, hasWorkspace, from, to, refreshKey]);

  const chartRows = useMemo(() => {
    const series = timeseries?.series[selectedSeries];
    return (series || []).map((item) => ({ date: item.date, value: Number(item.value) }));
  }, [timeseries, selectedSeries]);
  const seriesNames = useMemo(() => timeseries ? Object.keys(timeseries.series) : [], [timeseries]);
  useEffect(() => {
    if (seriesNames.length && !seriesNames.includes(selectedSeries)) setSelectedSeries(seriesNames[0]);
  }, [seriesNames, selectedSeries]);

  const financial = overview?.campaign_financials;
  const task = overview?.tasks;
  const crm = overview?.crm;
  const finance = overview?.finance;
  const cards: Array<[string, string]> = [
    ['Projects', formatMetric(overview?.projects)],
    ['Campaigns', formatMetric(overview?.campaigns)],
    ['Tasks', formatMetric(task?.total)],
    ['Completed tasks', formatMetric(task?.completed)],
    ['Task completion rate', task?.completion_rate == null ? 'Unavailable' : `${task.completion_rate}%`],
    ['CRM leads', formatMetric(crm?.leads)],
    ['Converted leads', formatMetric(crm?.converted_leads)],
    ['Lead conversion rate', crm?.conversion_rate == null ? 'Unavailable' : `${crm.conversion_rate}%`],
    ['Customers', formatMetric(crm?.customers)],
    ['Campaign budget', formatMetric(financial?.budget, true)],
    ['Campaign spend', formatMetric(financial?.spend, true)],
    ['Campaign revenue', formatMetric(financial?.revenue, true)],
    ['Return on spend', financial?.return_on_spend == null ? 'Unavailable' : `${financial.return_on_spend}×`],
    ['Finance income', formatMetric(finance?.income, true)],
    ['Finance expenses', formatMetric(finance?.expenses, true)],
    ['Finance profit', formatMetric(finance?.profit, true)],
    ['Budgeted expenses', formatMetric(finance?.budgeted_expenses, true)],
  ];

  return <main className="mx-auto max-w-[1400px] space-y-6 pb-12">
    <header><div className="text-xs text-[#64748B]">Insights / Analytics</div><h1 className="mt-2 text-3xl font-extrabold text-[#1E1B4B]">Marketing Analytics</h1><p className="mt-1 text-sm text-[#64748B]">Workspace performance from persisted projects, campaigns, tasks, CRM and finance data.</p></header>
    <section className="flex flex-wrap items-end gap-3 rounded-xl border border-[#E2E8F0] bg-white p-4">
      <label className="grid gap-1 text-xs font-medium text-[#64748B]">From<input className={inputClass} type="date" value={from} max={to} onChange={(event) => setFrom(event.target.value)} /></label>
      <label className="grid gap-1 text-xs font-medium text-[#64748B]">To<input className={inputClass} type="date" value={to} min={from} onChange={(event) => setTo(event.target.value)} /></label>
      <button className="rounded-lg bg-[#6D28D9] px-4 py-2 text-sm font-semibold text-white" onClick={() => setRefreshKey((key) => key + 1)}>Refresh</button>
    </section>
    {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>}
    {loading && <p role="status" className="text-sm text-[#64748B]">Loading workspace analytics…</p>}
    {!hasWorkspace && <p className="rounded-lg border bg-white p-4 text-sm text-[#64748B]">Select a workspace to view analytics.</p>}
    {overview && <>
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map(([label, value]) => <MetricCard key={label} title={label} value={value} />)}
      </section>
      <section className="rounded-xl border border-[#E2E8F0] bg-white p-5">
        <h2 className="font-bold text-[#1E1B4B]">Performance over time</h2>
        <p className="mb-4 text-xs text-[#64748B]">{from} – {to}; daily source activity/amount.</p>
        {seriesNames.length > 0 && <label className="mb-3 block text-xs font-medium capitalize text-[#64748B]">Metric <select className={`${inputClass} ml-2 capitalize`} value={selectedSeries} onChange={(event) => setSelectedSeries(event.target.value)}>{seriesNames.map((name) => <option key={name} value={name}>{name.replaceAll('_', ' ')}</option>)}</select></label>}
        {timeseries?.series[selectedSeries] === null && <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">{selectedSeries} is unavailable from this workspace’s data sources.</p>}
        {chartRows.length ? <div className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartRows}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="date" /><YAxis /><Tooltip /><Bar dataKey="value" name={selectedSeries.replaceAll('_', ' ')} fill="#6D28D9" /></BarChart>
          </ResponsiveContainer>
        </div> : timeseries?.series[selectedSeries] !== null && <p className="py-10 text-center text-sm text-[#64748B]">No timeseries records for this date range.</p>}
        {timeseries && Object.entries(timeseries.series).filter(([, value]) => value === null).map(([name]) => <p key={name} className="mt-1 text-xs text-amber-700">{name}: unavailable from this workspace’s data sources.</p>)}
      </section>
      {crm?.funnel && <section className="rounded-xl border border-[#E2E8F0] bg-white p-5"><h2 className="mb-3 font-bold text-[#1E1B4B]">Lead funnel</h2><div className="flex flex-wrap gap-3">{crm.funnel.map((stage) => <MetricCard key={stage.status} title={stage.status} value={formatMetric(stage.count)} />)}</div></section>}
      <details className="rounded-xl border border-[#E2E8F0] bg-white p-4"><summary className="cursor-pointer text-sm font-semibold text-[#1E1B4B]">Metric definitions</summary><dl className="mt-3 space-y-2 text-xs text-[#64748B]">{Object.entries(overview.definitions).map(([key, value]) => <div key={key}><dt className="font-semibold">{key.replaceAll('_', ' ')}</dt><dd>{value}</dd></div>)}</dl></details>
    </>}
  </main>;
};
