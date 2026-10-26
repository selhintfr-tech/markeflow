import React, { useEffect, useRef, useState } from 'react';
import { AlertCircle, CheckCircle2, ExternalLink, RefreshCw, Unplug } from 'lucide-react';
import { useWorkspace } from '../../../context/WorkspaceContext';
import { useAuth } from '../../../context/AuthContext';
import { metaAdsService, type MetaAdAccount, type MetaCampaignInsight, type MetaConnectionStatus } from './metaAdsService';
import { MetaHistoricalStudiesPanel } from './MetaHistoricalStudiesPanel';
import {
  DEFAULT_META_REPORTING_PERIOD,
  isMetaReportingPeriod,
  loadMetaReportingPreference,
  saveMetaReportingPreference,
  type MetaReportingPeriod,
} from './metaReportingPreference';

const inputClass = 'w-full rounded-lg border border-[#E2E8F0] bg-white px-3 py-2 text-sm text-[#1E1B4B]';
const datePresets: { value: MetaReportingPeriod; label: string }[] = [
  { value: 'last_7d', label: 'Last 7 days' },
  { value: 'last_30d', label: 'Last 30 days' },
  { value: 'this_month', label: 'This month' },
  { value: 'last_month', label: 'Last month' },
  { value: 'maximum', label: 'Maximum available' },
];

function formatAmount(value: number | null, currency: string | null) {
  if (value === null) return 'Unavailable';
  return `${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}${currency ? ` ${currency}` : ''}`;
}
function formatCount(value: number | null) {
  return value === null ? 'Unavailable' : value.toLocaleString();
}

function getSavedReportingPeriod(userId: string, workspaceId: string, accountId: string) {
  try {
    return loadMetaReportingPreference(window.localStorage, userId, workspaceId, accountId);
  } catch {
    return DEFAULT_META_REPORTING_PERIOD;
  }
}

export const MetaAdsIntegrationPage: React.FC = () => {
  const { currentWorkspace, hasWorkspace } = useWorkspace();
  const { user } = useAuth();
  const workspaceId = currentWorkspace.id;
  const [connection, setConnection] = useState<MetaConnectionStatus | null>(null);
  const [connectionWorkspaceId, setConnectionWorkspaceId] = useState('');
  const [connectionUserId, setConnectionUserId] = useState('');
  const [accounts, setAccounts] = useState<MetaAdAccount[]>([]);
  const [accountId, setAccountId] = useState('');
  const [datePreset, setDatePreset] = useState<MetaReportingPeriod>(DEFAULT_META_REPORTING_PERIOD);
  const [reportingPreferenceScope, setReportingPreferenceScope] = useState('');
  const [insights, setInsights] = useState<MetaCampaignInsight[]>([]);
  const [truncated, setTruncated] = useState(false);
  const [loading, setLoading] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const loadVersion = useRef(0);
  const insightVersion = useRef(0);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const result = params.get('meta_status');
    if (result === 'connected') setNotice(params.get('meta_message') || 'Meta advertising account connected.');
    if (result === 'error') setError(params.get('meta_message') || 'Meta authorization did not complete.');
    if (result) {
      params.delete('meta_status');
      params.delete('meta_message');
      const query = params.toString();
      window.history.replaceState({}, '', `${window.location.pathname}${query ? `?${query}` : ''}`);
    }
  }, []);

  useEffect(() => {
    const current = ++loadVersion.current;
    insightVersion.current += 1;
    setConnection(null);
    setConnectionWorkspaceId('');
    setConnectionUserId('');
    setAccounts([]);
    setAccountId('');
    setReportingPreferenceScope('');
    setInsights([]);
    setTruncated(false);
    setError('');
    if (!workspaceId || !hasWorkspace) {
      setLoading(false);
      return;
    }
    let active = true;
    setLoading(true);
    metaAdsService.status(workspaceId).then(async (status) => {
      if (!active || current !== loadVersion.current) return;
      setConnection(status);
      setConnectionWorkspaceId(workspaceId);
      setConnectionUserId(user?.id || '');
      if (!status.connected) return;
      const accountResponse = await metaAdsService.accounts(workspaceId);
      if (!active || current !== loadVersion.current) return;
      setAccounts(accountResponse.data);
      setTruncated(accountResponse.meta.truncated);
      const preferredId = status.preferred_account_id
        && accountResponse.data.some((account) => account.id === status.preferred_account_id)
        ? status.preferred_account_id
        : accountResponse.data[0]?.id || '';
      const period = getSavedReportingPeriod(user?.id || '', workspaceId, preferredId);
      setDatePreset(period);
      setAccountId(preferredId);
      if (user?.id && preferredId) {
        setReportingPreferenceScope(`${user.id}:${workspaceId}:${preferredId}`);
      }
    }).catch((cause: unknown) => {
      if (active && current === loadVersion.current) {
        const message = cause instanceof Error ? cause.message : 'Unable to load Meta integration status.';
        setError(message);
        if (message.toLowerCase().includes('expired') || message.toLowerCase().includes('revoked')) {
          setConnection((previous) => previous ? { ...previous, connected: false, status: 'expired' } : previous);
        }
      }
    }).finally(() => {
      if (active && current === loadVersion.current) setLoading(false);
    });
    return () => { active = false; };
  }, [workspaceId, hasWorkspace, user?.id]);

  const activeConnection = hasWorkspace && connectionWorkspaceId === workspaceId && connectionUserId === user?.id ? connection : null;

  useEffect(() => {
    const current = ++insightVersion.current;
    setInsights([]);
    const currentPreferenceScope = `${user?.id || ''}:${workspaceId}:${accountId}`;
    if (
      !workspaceId
      || !hasWorkspace
      || !activeConnection?.connected
      || !accountId
      || !user?.id
      || reportingPreferenceScope !== currentPreferenceScope
    ) return;
    let active = true;
    setLoading(true);
    metaAdsService.insights(workspaceId, accountId, datePreset).then((result) => {
      if (!active || current !== insightVersion.current) return;
      setInsights(result.data);
      setTruncated(result.meta.truncated);
    }).catch((cause: unknown) => {
      if (active && current === insightVersion.current) {
        const message = cause instanceof Error ? cause.message : 'Unable to load Meta campaign insights.';
        setError(message);
        if (message.toLowerCase().includes('expired') || message.toLowerCase().includes('revoked')) {
          setConnection((previous) => previous ? { ...previous, connected: false, status: 'expired' } : previous);
        }
      }
    }).finally(() => {
      if (active && current === insightVersion.current) setLoading(false);
    });
    return () => { active = false; };
  }, [workspaceId, hasWorkspace, activeConnection?.connected, accountId, datePreset, reportingPreferenceScope, user?.id]);

  const connect = async () => {
    if (!workspaceId) return;
    setConnecting(true);
    setError('');
    try {
      const result = await metaAdsService.connect(workspaceId);
      window.location.assign(result.authorization_url);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to start Meta authorization.');
      setConnecting(false);
    }
  };
  const disconnect = async () => {
    if (!workspaceId || !window.confirm('Disconnect Meta Ads for this workspace?')) return;
    setLoading(true);
    setError('');
    try {
      await metaAdsService.disconnect(workspaceId);
      metaAdsService.clearHistoricalStudiesCache();
      insightVersion.current += 1;
      setConnection((previous) => previous ? { ...previous, connected: false, status: 'disconnected', token_expires_at: null, scopes: [] } : previous);
      setAccounts([]);
      setAccountId('');
      setInsights([]);
      setNotice('Meta Ads was disconnected from this workspace.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to disconnect Meta Ads.');
    } finally {
      setLoading(false);
    }
  };

  const selectAccount = async (nextAccountId: string) => {
    if (!workspaceId || !nextAccountId || nextAccountId === accountId) return;
    const current = loadVersion.current;
    setError('');
    try {
      const result = await metaAdsService.setPreferredAccount(workspaceId, nextAccountId);
      if (current !== loadVersion.current) return;
      const period = getSavedReportingPeriod(user?.id || '', workspaceId, result.preferred_account_id);
      insightVersion.current += 1;
      setDatePreset(period);
      setAccountId(result.preferred_account_id);
      if (user?.id) {
        setReportingPreferenceScope(`${user.id}:${workspaceId}:${result.preferred_account_id}`);
      }
      setConnection((previous) => previous ? { ...previous, preferred_account_id: result.preferred_account_id } : previous);
      setInsights([]);
      setTruncated(false);
    } catch (cause) {
      if (current === loadVersion.current) {
        setError(cause instanceof Error ? cause.message : 'Unable to save the preferred advertising account.');
      }
    }
  };

  const selectReportingPeriod = (value: string) => {
    if (!isMetaReportingPeriod(value) || !user?.id || !workspaceId || !accountId) return;
    try {
      saveMetaReportingPreference(window.localStorage, user.id, workspaceId, accountId, value);
      setError('');
    } catch {
      setError('The reporting period could not be saved in this browser. The selected period will apply until you leave this page.');
    }
    insightVersion.current += 1;
    setInsights([]);
    setTruncated(false);
    setDatePreset(value);
  };

  const selectedAccount = accounts.find((account) => account.id === accountId);

  return <main className="mx-auto max-w-[1200px] space-y-6 pb-12">
    <header><div className="text-xs text-[#64748B]">Integrations / Meta Ads</div><h1 className="mt-2 text-3xl font-extrabold text-[#1E1B4B]">Meta Ads</h1><p className="mt-1 text-sm text-[#64748B]">Securely connect a Meta advertising account and view real campaign insights for this workspace.</p></header>
    {notice && <p role="status" className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800"><CheckCircle2 className="h-4 w-4" />{notice}</p>}
    {error && <p role="alert" className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />{error}</p>}
    {!hasWorkspace && <p className="rounded-lg border bg-white p-4 text-sm text-[#64748B]">Select a workspace to manage its Meta Ads integration.</p>}
    {loading && <p role="status" className="text-sm text-[#64748B]">Loading Meta Ads data…</p>}
    {activeConnection && <section className="rounded-xl border border-[#E2E8F0] bg-white p-5">
      <div className="flex flex-wrap items-center justify-between gap-4"><div><h2 className="font-bold text-[#1E1B4B]">Connection status</h2><p className="mt-1 text-sm text-[#64748B]">{activeConnection.connected ? `Connected${activeConnection.connected_by ? ` by ${activeConnection.connected_by}` : ''}` : activeConnection.status === 'expired' ? 'Connection expired or revoked. Reconnect to continue.' : 'No Meta advertising account is connected.'}</p>{activeConnection.token_expires_at && <p className="mt-1 text-xs text-[#64748B]">Token expiry: {new Date(activeConnection.token_expires_at).toLocaleString()}</p>}</div>
        <div className="flex gap-2">{activeConnection.connected ? <button onClick={() => void disconnect()} className="flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-semibold text-red-700"><Unplug className="h-4 w-4" />Disconnect</button> : <button onClick={() => void connect()} disabled={!hasWorkspace || connecting} className="flex items-center gap-2 rounded-lg bg-[#1877F2] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"><ExternalLink className="h-4 w-4" />{connecting ? 'Opening Meta…' : 'Connect Meta Ads'}</button>}</div>
      </div>
      {!activeConnection.configured && <p className="mt-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">Meta server credentials are not configured. An administrator must set the required META_* environment variables before connecting.</p>}
      {activeConnection.connected && activeConnection.scopes.length > 0 && <p className="mt-3 text-xs text-[#64748B]">Granted permissions: {activeConnection.scopes.join(', ')}</p>}
    </section>}
    {activeConnection?.connected && <section className="space-y-4 rounded-xl border border-[#E2E8F0] bg-white p-5">
      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_220px]">
        <label className="text-xs font-semibold text-[#64748B]">Advertising account<select className={`${inputClass} mt-1`} value={accountId} onChange={(event) => void selectAccount(event.target.value)} disabled={loading || accounts.length === 0}>{accounts.map((account) => <option key={account.id} value={account.id}>{account.name}{account.currency ? ` · ${account.currency}` : ''}</option>)}</select></label>
        <label className="text-xs font-semibold text-[#64748B]">Reporting period<select className={`${inputClass} mt-1`} value={datePreset} onChange={(event) => selectReportingPeriod(event.target.value)} disabled={!accountId || loading}>{datePresets.map((preset) => <option key={preset.value} value={preset.value}>{preset.label}</option>)}</select></label>
      </div>
      {truncated && <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">Showing the first pages of Meta results. Narrow the selected period or account if more detail is needed.</p>}
      {!accounts.length && !loading && <p className="py-8 text-center text-sm text-[#64748B]">No advertising accounts were returned for this connected Meta user. Confirm account access and granted permissions.</p>}
      {accounts.length > 0 && !insights.length && !loading && <p className="py-8 text-center text-sm text-[#64748B]">No campaign insights were returned for this account and period.</p>}
      {insights.length > 0 && <div className="overflow-x-auto"><table className="w-full min-w-[850px] text-left text-sm"><thead><tr className="border-b text-xs uppercase text-[#64748B]"><th className="p-3">Campaign</th><th className="p-3">Spend</th><th className="p-3">Impressions</th><th className="p-3">Clicks</th><th className="p-3">Reach</th><th className="p-3">CTR</th><th className="p-3">CPC</th></tr></thead><tbody>{insights.map((row, index) => <tr key={row.campaign_id || `${row.campaign_name}-${index}`} className="border-b last:border-0"><td className="p-3 font-medium text-[#1E1B4B]">{row.campaign_name || 'Unnamed campaign'}</td><td className="p-3">{formatAmount(row.spend, selectedAccount?.currency || null)}</td><td className="p-3">{formatCount(row.impressions)}</td><td className="p-3">{formatCount(row.clicks)}</td><td className="p-3">{formatCount(row.reach)}</td><td className="p-3">{row.ctr === null ? 'Unavailable' : `${row.ctr}%`}</td><td className="p-3">{formatAmount(row.cpc, selectedAccount?.currency || null)}</td></tr>)}</tbody></table></div>}
    </section>}
    <MetaHistoricalStudiesPanel
      userId={user?.id || ''}
      workspaceId={workspaceId}
      hasWorkspace={hasWorkspace}
      connectionReady={Boolean(activeConnection?.connected)}
      loadingConnection={loading && hasWorkspace && connectionWorkspaceId !== workspaceId}
      accounts={activeConnection?.connected ? accounts : []}
      selectedAccountId={activeConnection?.connected ? accountId : ''}
    />
    <div className="flex items-start gap-2 rounded-lg bg-slate-50 p-3 text-xs text-[#64748B]"><RefreshCw className="mt-0.5 h-4 w-4 shrink-0" />Insights are fetched directly from Meta's Marketing API when requested. Meta may expire or revoke access at any time; reconnect if access stops working. MarketFlow does not create estimated results or store imported campaign data in this integration.</div>
  </main>;
};