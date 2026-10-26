import React, { useEffect, useRef, useState } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { metaAdsService, type MetaAdAccount, type MetaCampaignStudy, type MetaHistoricalStudies } from './metaAdsService';
import { useAuth } from '../../../context/AuthContext';
import { useWorkspace } from '../../../context/WorkspaceContext';

type StudyView = 'studies' | 'compare';

function formatMetric(value: number | null | undefined, maximumFractionDigits = 2): string {
  return value === null || value === undefined
    ? 'Unavailable'
    : value.toLocaleString(undefined, { maximumFractionDigits });
}

function formatMoney(value: number | null | undefined, currency: string | null): string {
  if (value === null || value === undefined) return 'Unavailable';
  return `${formatMetric(value)}${currency ? ` ${currency}` : ''}`;
}

function csvCell(value: string | number | null | undefined): string {
  const text = value == null ? '' : String(value);
  const safeText = /^[=+\-@]/.test(text) ? `'${text}` : text;
  return `"${safeText.replaceAll('"', '""')}"`;
}

function exportStudies(studies: MetaHistoricalStudies): void {
  const rows: Array<Array<string | number | null | undefined>> = [[
    'Account', 'Currency', 'Reporting timezone', 'Level', 'Campaign ID', 'Campaign', 'Ad set ID', 'Ad set', 'Ad ID', 'Ad',
    'Objective', 'Status', 'Reporting start', 'Reporting end', 'Spend', 'Impressions',
    'Reach', 'Clicks', 'CTR', 'CPC', 'Meta actions',
  ]];
  for (const campaign of studies.campaigns) {
    const campaignName = campaign.campaign.name;
    const append = (
      level: string,
      adSetId: string | null,
      adSetName: string | null,
      adId: string | null,
      adName: string | null,
      status: string | null,
      metrics: MetaCampaignStudy['metrics'],
    ) => rows.push([
      studies.account.name,
      studies.account.currency,
      studies.account.timezone_name,
      level,
      campaign.campaign.id,
      campaignName,
      adSetId,
      adSetName,
      adId,
      adName,
      campaign.campaign.objective,
      status,
      metrics?.date_start,
      metrics?.date_stop,
      metrics?.spend,
      metrics?.impressions,
      metrics?.reach,
      metrics?.clicks,
      metrics?.ctr,
      metrics?.cpc,
      JSON.stringify(metrics?.results ?? []),
    ]);

    append('campaign', null, null, null, null, campaign.campaign.effective_status || campaign.campaign.status, campaign.metrics);
    for (const adSet of campaign.ad_sets) {
      append('ad set', adSet.ad_set.id, adSet.ad_set.name, null, null, adSet.ad_set.effective_status || adSet.ad_set.status, adSet.metrics);
      for (const ad of adSet.ads) {
        append('ad', adSet.ad_set.id, adSet.ad_set.name, ad.ad.id, ad.ad.name, ad.ad.effective_status || ad.ad.status, ad.metrics);
      }
    }
  }
  const content = rows.map((row) => row.map(csvCell).join(',')).join('\r\n');
  const blob = new Blob([`\uFEFF${content}`], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `meta-historical-studies-${studies.account.id.replaceAll(/[^a-zA-Z0-9_-]/g, '')}.csv`;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function CampaignStudyDetails({ study, currency }: { study: MetaCampaignStudy; currency: string | null }) {
  return <details className="rounded-lg border border-[#E2E8F0] bg-white">
    <summary className="cursor-pointer list-none px-4 py-3">
      <span className="flex flex-wrap items-center justify-between gap-3">
        <span>
          <span className="block font-semibold text-[#1E1B4B]">{study.campaign.name || 'Unnamed Meta campaign'}</span>
          <span className="mt-1 block text-xs text-[#64748B]">
            {[study.campaign.objective, study.campaign.effective_status || study.campaign.status, study.reporting_period.start && study.reporting_period.end
              ? `${study.reporting_period.start} – ${study.reporting_period.end}`
              : 'Reporting dates unavailable'].filter(Boolean).join(' · ')}
          </span>
          <span className="mt-1 block text-[10px] text-[#64748B]">
            Campaign created {study.campaign.created_at || 'unavailable'} · updated {study.campaign.updated_at || 'unavailable'}
          </span>
        </span>
        <span className="text-xs font-semibold text-[#6D28D9]">{study.ad_sets.length} ad sets · {study.ad_sets.reduce((count, adSet) => count + adSet.ads.length, 0)} ads</span>
      </span>
    </summary>
    <div className="space-y-4 border-t border-[#E2E8F0] p-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {[
          ['Spend', formatMoney(study.metrics?.spend, currency)],
          ['Impressions', formatMetric(study.metrics?.impressions, 0)],
          ['Reach', formatMetric(study.metrics?.reach, 0)],
          ['Clicks', formatMetric(study.metrics?.clicks, 0)],
          ['CTR', study.metrics?.ctr == null ? 'Unavailable' : `${formatMetric(study.metrics.ctr)}%`],
          ['CPC', formatMoney(study.metrics?.cpc, currency)],
        ].map(([label, value]) => <div key={label} className="rounded-md bg-slate-50 px-3 py-2">
          <div className="text-[10px] font-semibold uppercase tracking-wide text-[#64748B]">{label}</div>
          <div className="mt-1 text-sm font-semibold text-[#1E1B4B]">{value}</div>
        </div>)}
      </div>
      {!study.metrics && <p className="text-xs text-amber-800">Meta returned no campaign insight row for this reporting period; values are unavailable, not zero.</p>}
      {study.metrics?.results.length ? <div className="text-xs text-[#475569]">
        <strong>Reported Meta actions:</strong> {study.metrics.results.map((result) => `${result.type}: ${formatMetric(result.value)}`).join(' · ')}
      </div> : null}
      <p className="text-xs text-[#64748B]">{study.ad_comparison.criterion}</p>
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wide text-[#1E1B4B]">Ad-set and ad hierarchy</h4>
          {study.ad_sets.length === 0 ? <p className="mt-2 text-xs text-[#64748B]">No accessible ad sets were returned for this campaign.</p>
            : <ul className="mt-2 space-y-2">{study.ad_sets.map((adSet) => <li key={adSet.ad_set.id || adSet.ad_set.name} className="rounded-md bg-slate-50 p-3">
              <div className="text-sm font-semibold text-[#1E1B4B]">{adSet.ad_set.name || 'Unnamed ad set'}</div>
              <div className="mt-1 text-xs text-[#64748B]">
                Spend {formatMoney(adSet.metrics?.spend, currency)} · impressions {formatMetric(adSet.metrics?.impressions, 0)} · reach {formatMetric(adSet.metrics?.reach, 0)}
              </div>
              {(adSet.ad_set.start_at || adSet.ad_set.end_at) && <div className="mt-1 text-[10px] text-[#64748B]">Scheduled {adSet.ad_set.start_at || 'unavailable'} – {adSet.ad_set.end_at || 'open-ended'}</div>}
              <ul className="mt-2 space-y-1 border-l border-[#CBD5E1] pl-3">
                {adSet.ads.map((ad) => <li key={ad.ad.id || ad.ad.name} className="text-xs text-[#475569]">
                  <div>
                    <span className="font-medium text-[#1E1B4B]">{ad.ad.name || 'Unnamed ad'}</span>
                    {' · '}{ad.ad.effective_status || ad.ad.status || 'Status unavailable'}
                    {' · '}CTR {ad.metrics?.ctr == null ? 'Unavailable' : `${formatMetric(ad.metrics.ctr)}%`}
                    {' · '}spend {formatMoney(ad.metrics?.spend, currency)}
                    {ad.reporting_dates.start && ` · reported ${ad.reporting_dates.start} – ${ad.reporting_dates.end}`}
                    {(ad.ad.created_at || ad.ad.updated_at) && <span className="block text-[10px] text-[#64748B]">
                      Created {ad.ad.created_at || 'unavailable'} · updated {ad.ad.updated_at || 'unavailable'}
                    </span>}
                  </div>
                  {ad.daily_trend.length > 0 && <details className="mt-1">
                    <summary className="cursor-pointer text-[11px] text-[#6D28D9]">Daily delivery trend ({ad.daily_trend.length} Meta reporting days)</summary>
                    <div className="mt-1 overflow-x-auto">
                      <table className="w-full min-w-[360px] text-left text-[10px]">
                        <thead><tr className="text-[#64748B]"><th className="p-1">Reporting date</th><th className="p-1">Spend</th><th className="p-1">Impressions</th><th className="p-1">Clicks</th></tr></thead>
                        <tbody>{ad.daily_trend.slice(-10).map((day) => <tr key={day.date} className="border-t border-[#E2E8F0]">
                          <td className="p-1">{day.date || 'Unavailable'}</td>
                          <td className="p-1">{formatMoney(day.metrics?.spend, currency)}</td>
                          <td className="p-1">{formatMetric(day.metrics?.impressions, 0)}</td>
                          <td className="p-1">{formatMetric(day.metrics?.clicks, 0)}</td>
                        </tr>)}</tbody>
                      </table>
                      {ad.daily_trend.length > 10 && <p className="mt-1 text-[10px] text-[#64748B]">Showing the latest 10 of {ad.daily_trend.length} reporting days. Reach is not summed across dates.</p>}
                    </div>
                  </details>}
                </li>)}
              </ul>
            </li>)}</ul>}
        </div>
        <div className="space-y-3">
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wide text-[#1E1B4B]">Ad comparison</h4>
            <p className="mt-2 text-xs text-[#475569]">
              Best observed CTR: {study.ad_comparison.best ? `${study.ad_comparison.best.ad.name || 'Unnamed ad'} (${formatMetric(study.ad_comparison.best.ctr)}%)` : 'Unavailable'}.
              {' '}Lowest observed CTR: {study.ad_comparison.worst ? `${study.ad_comparison.worst.ad.name || 'Unnamed ad'} (${formatMetric(study.ad_comparison.worst.ctr)}%)` : 'Unavailable'}.
            </p>
          </div>
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wide text-[#1E1B4B]">Evidence and recommendations</h4>
            <p className="mt-1 text-[10px] text-[#64748B]">Study confidence: {study.confidence}. SWOT statements are measured-data inferences or explicitly marked unknowns.</p>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {Object.entries(study.swot).map(([category, findings]) => <div key={category} className="rounded-md bg-slate-50 p-2">
                <div className="text-[10px] font-bold uppercase text-[#475569]">{category}</div>
                {findings.length
                  ? <ul className="mt-1 list-disc space-y-1 pl-3 text-[10px] text-[#64748B]">{findings.map((finding) => <li key={finding.statement}>{finding.statement} <span>({finding.type})</span></li>)}</ul>
                  : <p className="mt-1 text-[10px] text-[#64748B]">No supported finding.</p>}
              </div>)}
            </div>
            {study.recommendations.length
              ? <ul className="mt-2 list-disc space-y-1 pl-4 text-xs text-[#475569]">{study.recommendations.map((recommendation, index) => <li key={`${recommendation.basis}-${index}`}>{recommendation.action} <span className="font-medium">({recommendation.basis})</span></li>)}</ul>
              : <p className="mt-2 text-xs text-[#64748B]">No recommendations were generated because this study has insufficient measured evidence.</p>}
            <p className="mt-2 text-xs text-[#64748B]">{study.audience_information.limitation}</p>
            {study.metrics?.cost_per_result.length ? <p className="mt-2 text-xs text-[#64748B]">
              Meta cost per reported action: {study.metrics.cost_per_result.map((result) => `${result.type}: ${formatMoney(result.value, currency)}`).join(' · ')}
            </p> : null}
            {study.limitations.length > 0 && <ul className="mt-2 list-disc space-y-1 pl-4 text-xs text-[#64748B]">{study.limitations.map((limitation) => <li key={limitation}>{limitation}</li>)}</ul>}
          </div>
        </div>
      </div>
      {study.metrics?.results.length === 0 && <p className="text-xs text-[#64748B]">Meta did not return an action/result metric for this campaign. No leads, conversions, sales, revenue, or ROAS are inferred.</p>}
    </div>
  </details>;
}

interface MetaHistoricalStudiesPanelProps {
  userId?: string;
  workspaceId?: string;
  hasWorkspace?: boolean;
  connectionReady?: boolean;
  loadingConnection?: boolean;
  accounts?: MetaAdAccount[];
  selectedAccountId?: string;
}

export const MetaHistoricalStudiesPanel: React.FC<MetaHistoricalStudiesPanelProps> = (props) => {
  const { user } = useAuth();
  const { currentWorkspace, hasWorkspace: workspaceAvailable } = useWorkspace();
  const userId = props.userId ?? user?.id ?? '';
  const workspaceId = props.workspaceId ?? currentWorkspace.id;
  const hasWorkspace = props.hasWorkspace ?? workspaceAvailable;
  const [localAccounts, setLocalAccounts] = useState<MetaAdAccount[]>([]);
  const [localConnectionReady, setLocalConnectionReady] = useState(false);
  const [localLoadingConnection, setLocalLoadingConnection] = useState(false);
  const [localConnectionError, setLocalConnectionError] = useState('');
  const [localAccountId, setLocalAccountId] = useState('');
  const accounts = props.accounts ?? localAccounts;
  const selectedAccountId = props.selectedAccountId ?? localAccountId;
  const connectionReady = props.connectionReady ?? localConnectionReady;
  const loadingConnection = props.loadingConnection ?? localLoadingConnection;
  const [accountId, setAccountId] = useState(selectedAccountId);
  const [loadedStudies, setLoadedStudies] = useState<{ key: string; data: MetaHistoricalStudies } | null>(null);
  const [view, setView] = useState<StudyView>('studies');
  const [compareA, setCompareA] = useState('');
  const [compareB, setCompareB] = useState('');
  const [studyLoadState, setStudyLoadState] = useState<{ key: string; loading: boolean } | null>(null);
  const [error, setError] = useState('');
  const studyRequest = useRef(0);
  const connectionRequest = useRef(0);
  const activeConnection = Boolean(connectionReady && hasWorkspace && userId);
  const studyKey = JSON.stringify([userId, workspaceId, accountId]);
  const studies = loadedStudies?.key === studyKey ? loadedStudies.data : null;
  const loadingStudies = Boolean(studyLoadState?.key === studyKey && studyLoadState.loading);

  useEffect(() => {
    if (
      props.connectionReady !== undefined
      && props.accounts !== undefined
      && props.selectedAccountId !== undefined
    ) return;

    const request = ++connectionRequest.current;
    setLocalConnectionReady(false);
    setLocalAccounts([]);
    setLocalAccountId('');
    setLocalConnectionError('');
    if (!hasWorkspace || !workspaceId || !userId) {
      setLocalLoadingConnection(false);
      return;
    }

    setLocalLoadingConnection(true);
    metaAdsService.status(workspaceId).then(async (status) => {
      if (request !== connectionRequest.current) return;
      if (!status.connected) return;
      const response = await metaAdsService.accounts(workspaceId);
      if (request !== connectionRequest.current) return;
      setLocalConnectionReady(true);
      setLocalAccounts(response.data);
      setLocalAccountId(
        status.preferred_account_id && response.data.some((account) => account.id === status.preferred_account_id)
          ? status.preferred_account_id
          : response.data[0]?.id ?? '',
      );
    }).catch((cause: unknown) => {
      if (request === connectionRequest.current) {
        setLocalConnectionError(cause instanceof Error ? cause.message : 'Unable to load the Meta connection.');
      }
    }).finally(() => {
      if (request === connectionRequest.current) setLocalLoadingConnection(false);
    });
    return () => {
      connectionRequest.current += 1;
    };
  }, [hasWorkspace, props.accounts, props.connectionReady, props.selectedAccountId, userId, workspaceId]);

  useEffect(() => {
    setAccountId(selectedAccountId);
  }, [userId, workspaceId, selectedAccountId]);

  useEffect(() => () => {
    studyRequest.current += 1;
  }, []);

  const loadStudies = (refresh = false) => {
    if (!activeConnection || !accountId) return;
    setError('');
    const request = ++studyRequest.current;
    setStudyLoadState({ key: studyKey, loading: true });
    metaAdsService.historicalStudies(userId, workspaceId, accountId, refresh).then((result) => {
      if (request === studyRequest.current) setLoadedStudies({ key: studyKey, data: result });
    }).catch((cause: unknown) => {
      if (request === studyRequest.current) {
        const message = cause instanceof Error ? cause.message : 'Unable to load historical Meta studies.';
        setError(message);
      }
    }).finally(() => {
      if (request === studyRequest.current) setStudyLoadState({ key: studyKey, loading: false });
    });
  };

  return <section aria-label="Historical Meta campaign studies" className="space-y-4 rounded-xl border border-[#E2E8F0] bg-white p-5">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h2 className="text-lg font-bold text-[#1E1B4B]">Historical Meta campaign studies</h2>
        <p className="mt-1 text-xs text-[#64748B]">Read-only results from Meta Marketing API. Campaigns, ad sets, and ads are measured separately.</p>
      </div>
      {activeConnection && accounts.length > 0 && <div className="flex flex-wrap gap-2">
        <label className="sr-only" htmlFor="meta-study-account">Meta advertising account</label>
        <select id="meta-study-account" className="rounded-lg border border-[#E2E8F0] bg-white px-3 py-2 text-sm text-[#1E1B4B]" value={accountId} onChange={(event) => { setError(''); setAccountId(event.target.value); }} disabled={loadingConnection || loadingStudies}>
          {accounts.map((account) => <option key={account.id} value={account.id}>{account.name} ({account.id})</option>)}
        </select>
        <button type="button" onClick={() => loadStudies(Boolean(studies))} disabled={loadingStudies || !accountId} className="inline-flex items-center gap-2 rounded-lg border border-[#E2E8F0] px-3 py-2 text-sm font-semibold text-[#475569] disabled:opacity-50">
          <RefreshCw className={`h-4 w-4 ${loadingStudies ? 'animate-spin' : ''}`} />{studies ? 'Refresh' : 'Load studies'}
        </button>
      </div>}
    </div>

    {(error || localConnectionError) && <p role="alert" className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />{error || localConnectionError}</p>}
    {loadingConnection && hasWorkspace && <p role="status" className="text-sm text-[#64748B]">Checking the workspace Meta connection…</p>}
    {!loadingConnection && !activeConnection && <p className="rounded-lg bg-slate-50 p-3 text-sm text-[#64748B]">
      {hasWorkspace ? 'Meta Ads is not connected to this workspace. No advertising results are fabricated.' : 'Select a workspace to check its Meta Ads connection.'}
    </p>}
    {activeConnection && accounts.length === 0 && !loadingConnection && <p className="rounded-lg bg-slate-50 p-3 text-sm text-[#64748B]">No accessible Meta advertising accounts were returned.</p>}
    {activeConnection && accounts.length > 0 && !studies && !loadingStudies && <p className="text-sm text-[#64748B]">Historical campaign, ad-set, ad, and daily insight data is retrieved only when you request it.</p>}
    {loadingStudies && activeConnection && accountId && <p role="status" className="text-sm text-[#64748B]">{studies ? 'Refreshing historical Meta studies…' : 'Retrieving historical campaign, ad-set, ad, and daily insights from Meta…'}</p>}
    {studies && <>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg bg-slate-50 p-3"><div className="text-[10px] font-semibold uppercase text-[#64748B]">Account</div><div className="mt-1 font-semibold text-[#1E1B4B]">{studies.account.name}</div><div className="text-xs text-[#64748B]">{studies.account.currency || 'Currency unavailable'} · {studies.account.timezone_name || 'Timezone unavailable'}</div></div>
        <div className="rounded-lg bg-slate-50 p-3"><div className="text-[10px] font-semibold uppercase text-[#64748B]">Historical coverage</div><div className="mt-1 font-semibold text-[#1E1B4B]">{studies.coverage.reporting_start || 'Unavailable'} – {studies.coverage.reporting_end || 'Unavailable'}</div><div className="text-xs text-[#64748B]">{studies.coverage.complete ? 'Meta pagination complete' : 'Partial results'}</div></div>
        <div className="rounded-lg bg-slate-50 p-3"><div className="text-[10px] font-semibold uppercase text-[#64748B]">Retrieved records</div><div className="mt-1 font-semibold text-[#1E1B4B]">{studies.coverage.campaign_count} campaigns · {studies.coverage.ad_set_count} ad sets</div><div className="text-xs text-[#64748B]">{studies.coverage.ad_count} ads</div></div>
        <div className="rounded-lg bg-slate-50 p-3"><div className="text-[10px] font-semibold uppercase text-[#64748B]">Latest reported delivery</div><div className="mt-1 font-semibold text-[#1E1B4B]">{studies.most_recently_delivered_ad?.ad.name || 'Unavailable'}</div><div className="text-xs text-[#64748B]">{studies.most_recently_delivered_ad?.delivery_date || 'No daily delivery with reported impressions'}</div></div>
      </div>
      <p className="text-[11px] text-[#64748B]">{studies.source} · Retrieved {new Date(studies.retrieved_at).toLocaleString()} · {studies.aggregation_note}</p>
      {studies.coverage.limitations.map((limitation) => <p key={limitation} className="text-xs text-amber-800">{limitation}</p>)}
      <div className="flex flex-wrap items-center gap-2 border-b border-[#E2E8F0] pb-3">
        <button type="button" onClick={() => setView('studies')} className={`rounded-lg px-3 py-2 text-xs font-semibold ${view === 'studies' ? 'bg-[#6D28D9] text-white' : 'border border-[#E2E8F0] text-[#475569]'}`}>Campaign studies</button>
        <button type="button" onClick={() => setView('compare')} disabled={studies.campaigns.length < 2} className={`rounded-lg px-3 py-2 text-xs font-semibold disabled:opacity-50 ${view === 'compare' ? 'bg-[#6D28D9] text-white' : 'border border-[#E2E8F0] text-[#475569]'}`}>Compare campaigns</button>
        <button type="button" onClick={() => exportStudies(studies)} disabled={!studies.campaigns.length} className="ml-auto rounded-lg border border-[#E2E8F0] px-3 py-2 text-xs font-semibold text-[#475569] disabled:opacity-50">Export study CSV</button>
      </div>
      {studies.campaigns.length === 0
        ? <p className="rounded-lg bg-slate-50 p-4 text-center text-sm text-[#64748B]">Meta returned no accessible campaigns for this account.</p>
        : view === 'studies'
          ? <div className="space-y-2">{studies.campaigns.map((study, index) => <CampaignStudyDetails
            key={study.campaign.id || `${study.campaign.name}-${index}`}
            study={study}
            currency={studies.account.currency}
          />)}</div>
          : <section className="space-y-3 rounded-lg border border-[#E2E8F0] p-4">
            <div className="grid gap-3 md:grid-cols-2">
              {[{ label: 'Campaign A', value: compareA, change: setCompareA }, { label: 'Campaign B', value: compareB, change: setCompareB }].map((selector) => <label key={selector.label} className="text-xs font-semibold text-[#64748B]">
                {selector.label}
                <select className="mt-1 w-full rounded-lg border border-[#E2E8F0] bg-white px-3 py-2 text-sm text-[#1E1B4B]" value={selector.value || (selector.label === 'Campaign A' ? studies.campaigns[0]?.campaign.id || '' : studies.campaigns.find((item) => item.campaign.id !== studies.campaigns[0]?.campaign.id)?.campaign.id || '')} onChange={(event) => {
                  const nextId = event.target.value;
                  selector.change(nextId);
                  const defaultB = studies.campaigns.find((item) => item.campaign.id !== studies.campaigns[0]?.campaign.id)?.campaign.id || '';
                  if (selector.label === 'Campaign A' && nextId === (compareB || defaultB)) {
                    setCompareB(studies.campaigns.find((item) => item.campaign.id !== nextId)?.campaign.id || '');
                  }
                }}>
                  {studies.campaigns.filter((study) => selector.label === 'Campaign A' || study.campaign.id !== (compareA || studies.campaigns[0]?.campaign.id)).map((study, index) => <option key={study.campaign.id || index} value={study.campaign.id || ''}>{study.campaign.name || 'Unnamed campaign'}</option>)}
                </select>
              </label>)}
            </div>
            {(() => {
              const left = studies.campaigns.find((study) => study.campaign.id === (compareA || studies.campaigns[0]?.campaign.id));
              const right = studies.campaigns.find((study) => study.campaign.id === (compareB || studies.campaigns.find((item) => item.campaign.id !== (compareA || studies.campaigns[0]?.campaign.id))?.campaign.id));
              if (!left || !right || left.campaign.id === right.campaign.id) return <p className="text-sm text-[#64748B]">Choose two distinct Meta campaigns.</p>;
              const rows: Array<[string, number | null, number | null]> = [
                ['Spend', left.metrics?.spend ?? null, right.metrics?.spend ?? null],
                ['Impressions', left.metrics?.impressions ?? null, right.metrics?.impressions ?? null],
                ['Reach', left.metrics?.reach ?? null, right.metrics?.reach ?? null],
                ['Clicks', left.metrics?.clicks ?? null, right.metrics?.clicks ?? null],
                ['CTR (%)', left.metrics?.ctr ?? null, right.metrics?.ctr ?? null],
                ['CPC', left.metrics?.cpc ?? null, right.metrics?.cpc ?? null],
              ];
              return <div className="overflow-x-auto">
                <p className="mb-2 text-xs text-[#64748B]">Same Meta reporting period (Maximum available), account, currency, and metric definitions.</p>
                <table className="w-full min-w-[520px] text-left text-sm"><thead><tr className="border-b text-xs text-[#64748B]"><th className="p-2">Metric</th><th className="p-2">{left.campaign.name}</th><th className="p-2">{right.campaign.name}</th></tr></thead>
                  <tbody>{rows.map(([label, a, b]) => <tr key={label} className="border-b last:border-0"><td className="p-2">{label}</td><td className="p-2">{label === 'Spend' || label === 'CPC' ? formatMoney(a, studies.account.currency) : formatMetric(a)}</td><td className="p-2">{label === 'Spend' || label === 'CPC' ? formatMoney(b, studies.account.currency) : formatMetric(b)}</td></tr>)}</tbody>
                </table>
                {!left.metrics || !right.metrics ? <p className="mt-2 text-xs text-amber-800">One or both campaigns have unavailable Meta insight rows; unavailable values are not treated as zero.</p> : null}
              </div>;
            })()}
          </section>}
    </>}
  </section>;
};
