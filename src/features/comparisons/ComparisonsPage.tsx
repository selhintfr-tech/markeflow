import React, { useEffect, useRef, useState } from 'react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { campaignService, type CampaignRecord } from '../campaigns/campaignService';
import { analyticsApi, type CampaignComparison, type PeriodComparison } from '../analytics/analyticsApi';

const inputClass = 'rounded-lg border border-[#E2E8F0] bg-white px-3 py-2 text-sm text-[#1E1B4B]';
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

type CompareMode = 'periods' | 'campaigns';

function displayMetric(key: string) {
  return key.split('.').map((part) => part.replaceAll('_', ' ')).join(' / ');
}
function displayValue(value: number | null, key: string) {
  if (value === null) return 'Unavailable';
  return key.includes('rate') ? `${value}%` : value.toLocaleString(undefined, { maximumFractionDigits: 2 });
}
function ComparisonTable({ metrics, leftName, rightName, leftValue, rightValue }: {
  metrics: Record<string, { change: number | null; percent_change: number | null }>;
  leftName: string;
  rightName: string;
  leftValue: (key: string) => number | null;
  rightValue: (key: string) => number | null;
}) {
  const entries = Object.entries(metrics);
  return <div className="overflow-x-auto rounded-xl border border-[#E2E8F0] bg-white"><table className="w-full min-w-[680px] text-left text-sm">
    <thead><tr className="border-b text-xs text-[#64748B]"><th className="p-3">Metric</th><th className="p-3">{leftName}</th><th className="p-3">{rightName}</th><th className="p-3">Change</th><th className="p-3">Change %</th></tr></thead>
    <tbody>{entries.map(([key, row]) => <tr key={key} className="border-b last:border-0"><td className="p-3 capitalize">{displayMetric(key)}</td><td className="p-3">{displayValue(leftValue(key), key)}</td><td className="p-3">{displayValue(rightValue(key), key)}</td><td className="p-3">{row.change === null ? 'Unavailable' : displayValue(row.change, key)}</td><td className="p-3">{row.percent_change === null ? '—' : `${row.percent_change}%`}</td></tr>)}</tbody>
  </table></div>;
}

export const ComparisonsPage: React.FC = () => {
  const { currentWorkspace, hasWorkspace } = useWorkspace();
  const workspaceId = currentWorkspace.id;
  const [mode, setMode] = useState<CompareMode>('periods');
  const [campaigns, setCampaigns] = useState<CampaignRecord[]>([]);
  const [campaignA, setCampaignA] = useState('');
  const [campaignB, setCampaignB] = useState('');
  const [from, setFrom] = useState(startDefault);
  const [to, setTo] = useState(endDefault);
  const [previousFrom, setPreviousFrom] = useState(previousStartDefault);
  const [previousTo, setPreviousTo] = useState(previousEndDefault);
  const [periodResult, setPeriodResult] = useState<PeriodComparison | null>(null);
  const [campaignResult, setCampaignResult] = useState<CampaignComparison | null>(null);
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
    if (!workspaceId || !hasWorkspace) return;
    campaignService.list(workspaceId).then((records) => {
      if (current !== campaignLoadId.current) return;
      setCampaigns(records);
      setCampaignA(records[0]?.id || '');
      setCampaignB(records.find((record) => record.id !== records[0]?.id)?.id || '');
    }).catch((cause: unknown) => {
      if (current === campaignLoadId.current) setError(cause instanceof Error ? cause.message : 'Unable to load workspace campaigns.');
    });
    return () => { campaignLoadId.current += 1; };
  }, [workspaceId, hasWorkspace]);

  const compare = async () => {
    if (!workspaceId) return;
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
        if (!campaignA || !campaignB || campaignA === campaignB) {
          setError('Select two different campaigns in this workspace.');
          return;
        }
        const result = await analyticsApi.compareCampaigns(workspaceId, campaignA, campaignB);
        if (current === comparisonId.current) setCampaignResult(result);
      }
    } catch (cause) {
      if (current === comparisonId.current) setError(cause instanceof Error ? cause.message : 'Unable to compare selected data.');
    } finally {
      if (current === comparisonId.current) setLoading(false);
    }
  };

  const periodRows = periodResult ? Object.fromEntries(Object.entries(periodResult.metrics).map(([key, value]) => [key, value])) : {};
  const campaignRows = campaignResult ? Object.fromEntries(Object.entries(campaignResult.metrics).map(([key, value]) => [key, value])) : {};

  return <main className="mx-auto max-w-[1400px] space-y-6 pb-12">
    <header><div className="text-xs text-[#64748B]">Insights / Comparisons</div><h1 className="mt-2 text-3xl font-extrabold text-[#1E1B4B]">Performance Comparison</h1><p className="mt-1 text-sm text-[#64748B]">Compare persisted workspace periods or campaign totals.</p></header>
    <div className="flex gap-2"><button onClick={() => { setMode('periods'); setPeriodResult(null); setCampaignResult(null); }} className={`rounded-lg px-4 py-2 text-sm font-semibold ${mode === 'periods' ? 'bg-[#6D28D9] text-white' : 'border bg-white text-[#475569]'}`}>Date ranges</button><button onClick={() => { setMode('campaigns'); setPeriodResult(null); setCampaignResult(null); }} className={`rounded-lg px-4 py-2 text-sm font-semibold ${mode === 'campaigns' ? 'bg-[#6D28D9] text-white' : 'border bg-white text-[#475569]'}`}>Campaigns</button></div>
    {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>}
    {!hasWorkspace && <p className="rounded-lg border bg-white p-4 text-sm text-[#64748B]">Select a workspace to compare records.</p>}
    <section className="grid gap-4 rounded-xl border border-[#E2E8F0] bg-white p-5 md:grid-cols-2">
      {mode === 'periods' ? <>
        <div className="grid gap-3 sm:grid-cols-2"><label className="text-xs font-medium text-[#64748B]">Current from<input type="date" className={`${inputClass} mt-1 w-full`} value={from} max={to} onChange={(event) => setFrom(event.target.value)} /></label><label className="text-xs font-medium text-[#64748B]">Current to<input type="date" className={`${inputClass} mt-1 w-full`} value={to} min={from} onChange={(event) => setTo(event.target.value)} /></label></div>
        <div className="grid gap-3 sm:grid-cols-2"><label className="text-xs font-medium text-[#64748B]">Previous from<input type="date" className={`${inputClass} mt-1 w-full`} value={previousFrom} max={previousTo} onChange={(event) => setPreviousFrom(event.target.value)} /></label><label className="text-xs font-medium text-[#64748B]">Previous to<input type="date" className={`${inputClass} mt-1 w-full`} value={previousTo} min={previousFrom} onChange={(event) => setPreviousTo(event.target.value)} /></label></div>
      </> : <>
        <label className="text-xs font-medium text-[#64748B]">Campaign A<select className={`${inputClass} mt-1 w-full`} value={campaignA} onChange={(event) => setCampaignA(event.target.value)}>{campaigns.map((campaign) => <option key={campaign.id} value={campaign.id}>{campaign.name}</option>)}</select></label>
        <label className="text-xs font-medium text-[#64748B]">Campaign B<select className={`${inputClass} mt-1 w-full`} value={campaignB} onChange={(event) => setCampaignB(event.target.value)}>{campaigns.filter((campaign) => campaign.id !== campaignA).map((campaign) => <option key={campaign.id} value={campaign.id}>{campaign.name}</option>)}</select></label>
        {!campaigns.length && <p className="text-sm text-[#64748B] md:col-span-2">No campaigns are available in this workspace.</p>}
      </>}
      <div className="md:col-span-2"><button onClick={() => void compare()} disabled={!hasWorkspace || loading || (mode === 'campaigns' && campaigns.length < 2)} className="rounded-lg bg-[#6D28D9] px-5 py-2 text-sm font-semibold text-white disabled:opacity-50">{loading ? 'Comparing…' : 'Compare'}</button></div>
    </section>
    {periodResult && <><div className="grid gap-3 sm:grid-cols-2"><article className="rounded-xl border bg-white p-4"><p className="text-xs text-[#64748B]">Current period</p><p className="mt-1 font-semibold">{periodResult.current_period.from} – {periodResult.current_period.to}</p></article><article className="rounded-xl border bg-white p-4"><p className="text-xs text-[#64748B]">Previous period</p><p className="mt-1 font-semibold">{periodResult.previous_period.from} – {periodResult.previous_period.to}</p></article></div><ComparisonTable metrics={periodRows} leftName="Current" rightName="Previous" leftValue={(key) => periodResult.metrics[key]?.current ?? null} rightValue={(key) => periodResult.metrics[key]?.previous ?? null} /><p className="text-xs text-[#64748B]">{periodResult.definition} Monetary amounts are shown without a currency symbol because this endpoint does not specify one.</p></>}
    {campaignResult && <><div className="grid gap-3 sm:grid-cols-2"><article className="rounded-xl border bg-white p-4"><p className="text-xs text-[#64748B]">Campaign A</p><p className="mt-1 font-semibold">{campaignResult.campaign_a.name}</p></article><article className="rounded-xl border bg-white p-4"><p className="text-xs text-[#64748B]">Campaign B</p><p className="mt-1 font-semibold">{campaignResult.campaign_b.name}</p></article></div><ComparisonTable metrics={campaignRows} leftName="Campaign A" rightName="Campaign B" leftValue={(key) => campaignResult.metrics[key]?.campaign_a ?? null} rightValue={(key) => campaignResult.metrics[key]?.campaign_b ?? null} /><p className="text-xs text-[#64748B]">{campaignResult.definition} Monetary amounts are shown without a currency symbol because this endpoint does not specify one.</p></>}
  </main>;
};
