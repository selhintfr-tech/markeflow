import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  BarChart3, BriefcaseBusiness, Check, ChevronDown, CircleDollarSign, Download, FileText,
  FolderKanban, Pencil, Plus, RefreshCw, Search, Trash2, Users, X,
} from 'lucide-react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { analyticsApi, type ReportResult, type SavedReport } from '../analytics/analyticsApi';
import { campaignService, type CampaignRecord } from '../campaigns/campaignService';
import { MetaHistoricalStudiesPanel } from '../integrations/meta/MetaHistoricalStudiesPanel';
import { projectService, type ProjectRecord } from '../projects/projectService';
import { workspaceService, type WorkspaceRecord } from '../workspaces/workspaceService';

const inputClass = 'w-full rounded-lg border border-[#E2E8F0] bg-white px-3 py-2 text-sm text-[#1E1B4B] outline-none transition focus:border-[#7C3AED] focus:ring-2 focus:ring-[#7C3AED]/15';
const reportTypes: Array<{
  label: string;
  description: string;
  type: SavedReport['type'];
  template: string;
  icon: typeof BarChart3;
  color: string;
}> = [
  { label: 'Campaign Performance', description: 'Review campaign delivery and recorded performance.', type: 'campaigns', template: 'campaign_performance', icon: BarChart3, color: 'violet' },
  { label: 'Financial Summary', description: 'Summarize recorded finance transactions by category.', type: 'finance', template: 'financial_summary', icon: CircleDollarSign, color: 'teal' },
  { label: 'Lead Conversion', description: 'Review real lead totals, conversion and funnel status.', type: 'crm', template: 'lead_conversion', icon: Users, color: 'purple' },
  { label: 'Project Overview', description: 'Track project status, dates and recorded progress.', type: 'projects', template: 'project_overview', icon: FolderKanban, color: 'blue' },
  { label: 'Custom Report', description: 'Choose a supported data source and its available metrics.', type: 'overview', template: 'custom', icon: FileText, color: 'indigo' },
];
const statuses: SavedReport['status'][] = ['Ready', 'In Review', 'Draft', 'Archived'];
const sourceTypes: Array<{ value: SavedReport['type']; label: string }> = [
  { value: 'overview', label: 'Workspace overview' },
  { value: 'campaigns', label: 'Campaigns' },
  { value: 'finance', label: 'Finance transactions' },
  { value: 'crm', label: 'Lead conversion' },
  { value: 'projects', label: 'Projects' },
  { value: 'tasks', label: 'Tasks' },
  { value: 'timeseries', label: 'Daily activity' },
];
const metricOptions: Record<SavedReport['type'], Array<{ key: string; label: string }>> = {
  overview: [
    { key: 'projects', label: 'Projects' }, { key: 'campaigns', label: 'Campaigns' },
    { key: 'tasks', label: 'Tasks' }, { key: 'crm', label: 'Lead conversion' },
    { key: 'campaign_financials', label: 'Campaign financials' }, { key: 'finance', label: 'Finance ledger' },
  ],
  campaigns: [
    { key: 'budget', label: 'Campaign budget' }, { key: 'spend', label: 'Recorded campaign spend' },
    { key: 'leads', label: 'Leads' }, { key: 'customers', label: 'Customers' }, { key: 'revenue', label: 'Recorded campaign revenue' },
  ],
  finance: [{ key: 'transactions', label: 'Transaction count' }, { key: 'total', label: 'Recorded amount' }],
  crm: [
    { key: 'leads', label: 'Leads' }, { key: 'converted_leads', label: 'Converted leads' },
    { key: 'conversion_rate', label: 'Conversion rate' }, { key: 'funnel', label: 'Status funnel' }, { key: 'customers', label: 'Customers' },
  ],
  projects: [{ key: 'progress', label: 'Progress' }],
  tasks: [{ key: 'count', label: 'Task count' }],
  timeseries: [
    { key: 'projects', label: 'Projects' }, { key: 'campaigns', label: 'Campaigns' }, { key: 'tasks', label: 'Tasks' },
    { key: 'leads', label: 'Leads' }, { key: 'income', label: 'Recorded income' }, { key: 'expenses', label: 'Recorded expenses' },
  ],
};

type ReportForm = {
  name: string;
  type: SavedReport['type'];
  template: string;
  status: SavedReport['status'] | '';
  workspaceId: string;
  from_date: string;
  to_date: string;
  campaignId: string;
  projectId: string;
  metrics: string[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function reportLabel(report: SavedReport): string {
  const template = report.configuration.report_template;
  return reportTypes.find((item) => item.template === template)?.label
    || sourceTypes.find((item) => item.value === report.type)?.label
    || report.type;
}

function periodLabel(report: SavedReport): string {
  return report.from_date || report.to_date
    ? `${report.from_date || 'Start'} – ${report.to_date || 'Present'}`
    : 'All dates';
}

function formatDate(date: string | null | undefined): string {
  if (!date) return '—';
  const parsed = new Date(date);
  return Number.isNaN(parsed.getTime()) ? date : parsed.toLocaleDateString();
}

function displayValue(value: unknown): string {
  if (value === null || value === undefined || value === '') return 'Unavailable';
  if (typeof value === 'number') return value.toLocaleString(undefined, { maximumFractionDigits: 2 });
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'string') return value;
  return '';
}

function keyLabel(key: string): string {
  return key.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function ResultTable({ rows }: { rows: unknown[] }) {
  const records = rows.filter(isRecord);
  if (records.length === 0) return <p className="text-sm text-[#64748B]">No records were returned for this period.</p>;
  const keys = [...new Set(records.flatMap((row) => Object.keys(row)))];
  return <div className="overflow-x-auto rounded-lg border border-[#E6E9F2]">
    <table className="w-full min-w-[440px] text-left text-xs">
      <thead className="bg-[#F7F7FC] text-[10px] uppercase tracking-wide text-[#64748B]">
        <tr>{keys.map((key) => <th key={key} className="px-3 py-2 font-semibold">{keyLabel(key)}</th>)}</tr>
      </thead>
      <tbody>{records.map((record, index) => <tr key={String(record.id ?? index)} className="border-t border-[#EEF0F6]">
        {keys.map((key) => <td key={key} className="max-w-52 px-3 py-2 text-[#334155]">{displayValue(record[key]) || (Array.isArray(record[key]) ? `${(record[key] as unknown[]).length} items` : 'Details')}</td>)}
      </tr>)}</tbody>
    </table>
  </div>;
}

function SeriesChart({ series }: { series: Record<string, unknown> }) {
  const entries = Object.entries(series).filter(([, points]) => Array.isArray(points));
  if (entries.length === 0) return <p className="text-sm text-[#64748B]">No time-series data is available for this period.</p>;
  return <div className="space-y-4">
    {entries.map(([name, points]) => {
      const values = (points as unknown[]).filter(isRecord)
        .map((point) => ({ date: String(point.date ?? ''), value: Number(point.value) }))
        .filter((point) => Number.isFinite(point.value));
      if (values.length === 0) return <p key={name} className="text-xs text-[#64748B]">{keyLabel(name)}: no data available.</p>;
      const max = Math.max(...values.map((point) => point.value), 1);
      const polyline = values.map((point, index) => {
        const x = values.length === 1 ? 50 : (index / (values.length - 1)) * 100;
        const y = 38 - (point.value / max) * 32;
        return `${x},${y}`;
      }).join(' ');
      return <div key={name} className="rounded-lg border border-[#E6E9F2] bg-white p-3">
        <div className="mb-2 flex justify-between text-xs font-semibold text-[#334155]"><span>{keyLabel(name)}</span><span>{values.length} recorded dates</span></div>
        <svg viewBox="0 0 100 42" preserveAspectRatio="none" className="h-28 w-full overflow-visible" role="img" aria-label={`${keyLabel(name)} time series`}>
          <line x1="0" y1="38" x2="100" y2="38" stroke="#E2E8F0" strokeWidth="0.7" />
          {values.length > 1 && <polyline points={polyline} fill="none" stroke="#6D28D9" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />}
          {values.map((point, index) => {
            const x = values.length === 1 ? 50 : (index / (values.length - 1)) * 100;
            const y = 38 - (point.value / max) * 32;
            return <circle key={`${point.date}-${index}`} cx={x} cy={y} r="1.1" fill="#6D28D9"><title>{point.date}: {displayValue(point.value)}</title></circle>;
          })}
        </svg>
        <div className="flex justify-between text-[10px] text-[#64748B]"><span>{values[0].date}</span><span>{values[values.length - 1].date}</span></div>
      </div>;
    })}
  </div>;
}

function ResultContent({ data }: { data: unknown }) {
  if (Array.isArray(data)) return <ResultTable rows={data} />;
  if (!isRecord(data)) return <p className="text-sm text-[#64748B]">No report data is available.</p>;
  if (isRecord(data.series)) return <SeriesChart series={data.series} />;

  const scalars = Object.entries(data).filter(([, value]) => value === null || ['string', 'number', 'boolean'].includes(typeof value));
  const nested = Object.entries(data).filter(([, value]) => value !== null && typeof value === 'object');
  return <div className="space-y-4">
    {scalars.length > 0 && <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {scalars.map(([key, value]) => <div key={key} className="rounded-lg border border-[#E6E9F2] bg-white px-3 py-2">
        <div className="text-[10px] font-semibold uppercase tracking-wide text-[#64748B]">{keyLabel(key)}</div>
        <div className="mt-1 break-words text-sm font-bold text-[#1E1B4B]">{displayValue(value)}</div>
      </div>)}
    </div>}
    {nested.map(([key, value]) => <section key={key} className="space-y-2">
      <h4 className="text-xs font-bold uppercase tracking-wide text-[#475569]">{keyLabel(key)}</h4>
      {Array.isArray(value) ? <ResultTable rows={value} /> : <ResultContent data={value} />}
    </section>)}
  </div>;
}

function CampaignSummary({ data }: { data: unknown }) {
  if (!Array.isArray(data)) return null;
  const campaigns = data.filter(isRecord);
  const sum = (key: string) => {
    const values = campaigns.map((campaign) => campaign[key]).filter((value): value is number | string => typeof value === 'number' || typeof value === 'string');
    return values.length ? values.reduce<number>((total, value) => total + (Number(value) || 0), 0) : null;
  };
  const metrics = [
    ['Campaigns', campaigns.length, false],
    ['Campaign-record spend', sum('spend'), true],
    ['Leads', sum('leads'), false],
    ['Campaign-record revenue', sum('revenue'), true],
  ].filter(([, value]) => value !== null);
  const channels = new Map<string, number>();
  for (const campaign of campaigns) {
    if (typeof campaign.platform === 'string' && (typeof campaign.spend === 'number' || typeof campaign.spend === 'string')) {
      channels.set(campaign.platform, (channels.get(campaign.platform) || 0) + (Number(campaign.spend) || 0));
    }
  }
  return <div className="space-y-3">
    <div className="grid grid-cols-2 gap-2">{metrics.map(([label, value, monetary]) => <div key={String(label)} className="rounded-lg border border-[#E6E9F2] bg-white px-3 py-2">
      <div className="text-[10px] font-semibold uppercase tracking-wide text-[#64748B]">{label}</div>
      <div className="mt-1 text-sm font-bold text-[#1E1B4B]">{displayValue(value)}{monetary && value !== null ? ' (campaign records)' : ''}</div>
    </div>)}</div>
    {channels.size > 0 && <div className="rounded-lg border border-[#E6E9F2] bg-white p-3">
      <h4 className="mb-2 text-xs font-bold text-[#334155]">Campaign-record spend by platform</h4>
      <div className="space-y-2">{[...channels].sort((a, b) => b[1] - a[1]).map(([channel, spend]) => {
        const maximum = Math.max(...channels.values(), 1);
        return <div key={channel} className="grid grid-cols-[5rem_1fr_auto] items-center gap-2 text-[10px]">
          <span className="truncate text-[#64748B]">{channel}</span><span className="h-2 overflow-hidden rounded-full bg-violet-50"><span className="block h-full rounded-full bg-violet-500" style={{ width: `${Math.max(0, spend / maximum * 100)}%` }} /></span><span className="font-semibold text-[#334155]">{displayValue(spend)}</span>
        </div>;
      })}</div>
    </div>}
  </div>;
}

export const ReportsPage: React.FC = () => {
  const { currentWorkspace, hasWorkspace, workspaces } = useWorkspace();
  const [reports, setReports] = useState<SavedReport[]>([]);
  const [workspaceRecords, setWorkspaceRecords] = useState<WorkspaceRecord[]>([]);
  const [campaigns, setCampaigns] = useState<CampaignRecord[]>([]);
  const [projects, setProjects] = useState<ProjectRecord[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [result, setResult] = useState<ReportResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [running, setRunning] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [workspaceFilter, setWorkspaceFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortKey, setSortKey] = useState<'name' | 'type' | 'period' | 'created' | 'status'>('created');
  const [sortAscending, setSortAscending] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<SavedReport | null>(null);
  const [form, setForm] = useState<ReportForm>({
    name: '', type: 'overview', template: 'custom', status: 'Draft', workspaceId: '',
    from_date: '', to_date: '', campaignId: '', projectId: '', metrics: metricOptions.overview.map((metric) => metric.key),
  });
  const workspaceVersion = useRef(0);
  const selected = reports.find((report) => report.id === selectedId) || null;
  const selectedReportId = selected?.id;
  const selectedWorkspaceId = selected?.workspace_id;
  const selectedUpdatedAt = selected?.updated_at;
  const workspacesById = useMemo(() => new Map(workspaceRecords.map((workspace) => [workspace.id, workspace])), [workspaceRecords]);
  const metricChoices = metricOptions[form.type] || [];
  const resolvedTemplate = reportTypes.find((item) => item.template === form.template);

  useEffect(() => {
    const version = ++workspaceVersion.current;
    if (!hasWorkspace || workspaces.length === 0) {
      setReports([]);
      setSelectedId('');
      setResult(null);
      setLoading(false);
      return;
    }
    let active = true;
    setLoading(true);
    setError('');
    setResult(null);
    Promise.all([
      workspaceService.list(),
      Promise.all(workspaces.map((workspace) => analyticsApi.reports(workspace.id))),
    ]).then(([records, reportLists]) => {
      if (!active || version !== workspaceVersion.current) return;
      setWorkspaceRecords(records.filter((record) => workspaces.some((workspace) => workspace.id === record.id)));
      const combined = reportLists.flat();
      setReports(combined);
      setSelectedId((current) => combined.some((report) => report.id === current) ? current : (combined[0]?.id || ''));
    }).catch((cause: unknown) => {
      if (active && version === workspaceVersion.current) setError(cause instanceof Error ? cause.message : 'Unable to load saved reports.');
    }).finally(() => {
      if (active && version === workspaceVersion.current) setLoading(false);
    });
    return () => { active = false; };
  }, [hasWorkspace, workspaces]);

  useEffect(() => {
    if (!selectedReportId || !selectedWorkspaceId) {
      setResult(null);
      return;
    }
    let active = true;
    const version = workspaceVersion.current;
    setRunning(true);
    setError('');
    analyticsApi.runReport(selectedWorkspaceId, selectedReportId).then((reportResult) => {
      if (active && version === workspaceVersion.current) setResult(reportResult);
    }).catch((cause: unknown) => {
      if (active && version === workspaceVersion.current) setError(cause instanceof Error ? cause.message : 'Unable to generate this report.');
    }).finally(() => {
      if (active && version === workspaceVersion.current) setRunning(false);
    });
    return () => { active = false; };
  }, [selectedReportId, selectedWorkspaceId, selectedUpdatedAt]);

  useEffect(() => {
    if (!showForm || !form.workspaceId) return;
    let active = true;
    const controller = new AbortController();
    Promise.all([
      campaignService.list(form.workspaceId, {}, { signal: controller.signal }),
      projectService.list(form.workspaceId),
    ]).then(([campaignRecords, projectRecords]) => {
      if (!active) return;
      setCampaigns(campaignRecords);
      setProjects(projectRecords);
    }).catch((cause: unknown) => {
      if (active && !controller.signal.aborted) setError(cause instanceof Error ? cause.message : 'Unable to load report filters.');
    });
    return () => { active = false; controller.abort(); };
  }, [showForm, form.workspaceId]);

  const visibleReports = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    return reports.filter((report) => {
      const workspace = workspacesById.get(report.workspace_id);
      const nameMatch = !normalizedSearch || [
        report.name, reportLabel(report), report.created_by_name || '', workspace?.name || '',
      ].some((value) => value.toLowerCase().includes(normalizedSearch));
      return nameMatch
        && (workspaceFilter === 'all' || report.workspace_id === workspaceFilter)
        && (statusFilter === 'all' || (report.status || 'Unassigned') === statusFilter);
    }).sort((a, b) => {
      const workspaceA = workspacesById.get(a.workspace_id)?.name || '';
      const workspaceB = workspacesById.get(b.workspace_id)?.name || '';
      const compare = sortKey === 'name' ? a.name.localeCompare(b.name)
        : sortKey === 'type' ? reportLabel(a).localeCompare(reportLabel(b))
          : sortKey === 'period' ? periodLabel(a).localeCompare(periodLabel(b))
            : sortKey === 'status' ? (a.status || '').localeCompare(b.status || '')
              : new Date(a.created_at).getTime() - new Date(b.created_at).getTime() || workspaceA.localeCompare(workspaceB);
      return sortAscending ? compare : -compare;
    });
  }, [reports, search, workspaceFilter, statusFilter, sortKey, sortAscending, workspacesById]);

  const setSourceType = (type: SavedReport['type']) => {
    setForm((previous) => ({ ...previous, type, metrics: metricOptions[type].map((metric) => metric.key), campaignId: '', projectId: '' }));
  };

  const openCreate = (card = reportTypes[4]) => {
    const type = card.type;
    setEditing(null);
    setForm({
      name: '', type, template: card.template, status: 'Draft', workspaceId: currentWorkspace.id || workspaces[0]?.id || '',
      from_date: '', to_date: '', campaignId: '', projectId: '', metrics: metricOptions[type].map((metric) => metric.key),
    });
    setShowForm(true);
    setError('');
  };

  const openEdit = (report: SavedReport) => {
    const config = report.configuration;
    const filters = report.filters;
    const selectedMetrics = Array.isArray(config.metrics) && config.metrics.every((metric) => typeof metric === 'string')
      ? config.metrics as string[] : metricOptions[report.type].map((metric) => metric.key);
    setEditing(report);
    setForm({
      name: report.name, type: report.type, template: typeof config.report_template === 'string' ? config.report_template : report.type,
      status: report.status || '', workspaceId: report.workspace_id, from_date: report.from_date || '', to_date: report.to_date || '',
      campaignId: filters.campaign_id || '', projectId: filters.project_id || '', metrics: selectedMetrics,
    });
    setShowForm(true);
    setError('');
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.workspaceId) return;
    const version = workspaceVersion.current;
    setSaving(true);
    setError('');
    const filters: Record<string, string> = {};
    if (form.type === 'campaigns' && form.campaignId) filters.campaign_id = form.campaignId;
    if ((form.type === 'projects' || form.type === 'campaigns') && form.projectId) filters.project_id = form.projectId;
    const campaignName = campaigns.find((campaign) => campaign.id === form.campaignId)?.name;
    const projectName = projects.find((project) => project.id === form.projectId)?.name;
    if (form.metrics.length === 0) {
      setError('Select at least one metric for this report.');
      setSaving(false);
      return;
    }
    const payload = {
      name: form.name.trim(),
      type: form.type,
      status: form.status || undefined,
      from_date: form.from_date || null,
      to_date: form.to_date || null,
      filters,
      configuration: {
        report_template: form.template,
        metrics: form.metrics,
        ...(campaignName ? { campaign_name: campaignName } : {}),
        ...(projectName ? { project_name: projectName } : {}),
      },
    };
    try {
      const saved = editing
        ? await analyticsApi.updateReport(form.workspaceId, editing.id, payload)
        : await analyticsApi.createReport(form.workspaceId, payload);
      if (version !== workspaceVersion.current) return;
      setReports((previous) => editing
        ? previous.map((report) => report.id === saved.id ? saved : report)
        : [saved, ...previous]);
      setSelectedId(saved.id);
      setResult(null);
      setShowForm(false);
    } catch (cause) {
      if (version === workspaceVersion.current) setError(cause instanceof Error ? cause.message : 'Unable to save report definition.');
    } finally {
      if (version === workspaceVersion.current) setSaving(false);
    }
  };

  const runSelected = async () => {
    if (!selected) return;
    const version = workspaceVersion.current;
    setRunning(true);
    setError('');
    try {
      const reportResult = await analyticsApi.runReport(selected.workspace_id, selected.id);
      if (version === workspaceVersion.current) setResult(reportResult);
    } catch (cause) {
      if (version === workspaceVersion.current) setError(cause instanceof Error ? cause.message : 'Unable to generate this report.');
    } finally {
      if (version === workspaceVersion.current) setRunning(false);
    }
  };

  const remove = async (report: SavedReport) => {
    if (!window.confirm(`Delete report "${report.name}"? This cannot be undone.`)) return;
    const version = workspaceVersion.current;
    setSaving(true);
    setError('');
    try {
      await analyticsApi.deleteReport(report.workspace_id, report.id);
      if (version !== workspaceVersion.current) return;
      const remaining = reports.filter((item) => item.id !== report.id);
      setReports(remaining);
      if (selectedId === report.id) {
        setSelectedId(remaining[0]?.id || '');
        setResult(null);
      }
    } catch (cause) {
      if (version === workspaceVersion.current) setError(cause instanceof Error ? cause.message : 'Unable to delete report.');
    } finally {
      if (version === workspaceVersion.current) setSaving(false);
    }
  };

  const exportCsv = async () => {
    if (!selected) return;
    try {
      await analyticsApi.exportReport(selected.workspace_id, selected.id, selected.name);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to export report.');
    }
  };

  const changeSort = (key: typeof sortKey) => {
    if (sortKey === key) setSortAscending((value) => !value);
    else {
      setSortKey(key);
      setSortAscending(key !== 'created');
    }
  };

  return <main className="space-y-5 pb-12">
    <header className="flex flex-wrap items-end justify-between gap-3">
      <div><div className="text-xs text-[#64748B]">Insights / Reports</div><h1 className="mt-1 text-3xl font-extrabold tracking-tight text-[#1E1B4B]">Reports</h1><p className="mt-1 text-sm text-[#64748B]">Create, review and export real workspace reporting.</p></div>
      <button onClick={() => openCreate()} disabled={!hasWorkspace} className="flex items-center gap-2 rounded-lg bg-[#6D28D9] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#5B21B6] disabled:opacity-50"><Plus className="h-4 w-4" />Create Report</button>
    </header>

    <section aria-label="Report types" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
      {reportTypes.map((card) => {
        const Icon = card.icon;
        const iconStyle = card.color === 'teal' ? 'bg-teal-50 text-teal-600'
          : card.color === 'blue' ? 'bg-blue-50 text-blue-600'
            : card.color === 'indigo' ? 'bg-indigo-50 text-indigo-600'
              : card.color === 'purple' ? 'bg-purple-50 text-purple-600' : 'bg-violet-50 text-violet-600';
        return <button key={card.template} onClick={() => openCreate(card)} disabled={!hasWorkspace} className="group min-h-28 rounded-lg border border-[#E8EAF2] bg-white p-3 text-left shadow-[0_1px_3px_rgba(30,27,75,0.04)] transition hover:-translate-y-0.5 hover:border-violet-200 hover:shadow-md disabled:opacity-50">
          <span className={`mb-2 grid h-9 w-9 place-items-center rounded-lg ${iconStyle}`}><Icon className="h-5 w-5" /></span>
          <span className="block text-sm font-bold text-[#1E1B4B]">{card.label}</span>
          <span className="mt-1 block text-[11px] leading-4 text-[#64748B]">{card.description}</span>
        </button>;
      })}
    </section>

    <details className="rounded-xl border border-[#E5E7F0] bg-white">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3">
        <span><span className="block text-sm font-bold text-[#1E1B4B]">Historical Meta campaign studies</span><span className="mt-0.5 block text-xs text-[#64748B]">Read-only Meta Marketing API reports, separate from workspace financial records.</span></span>
        <ChevronDown className="h-4 w-4 text-[#64748B]" />
      </summary>
      <div className="border-t border-[#EEF0F6] p-4"><MetaHistoricalStudiesPanel /></div>
    </details>

    {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>}
    {!hasWorkspace && <p className="rounded-lg border bg-white p-4 text-sm text-[#64748B]">Select a workspace to manage reports.</p>}

    {hasWorkspace && <div className="grid items-start gap-4 xl:grid-cols-12">
      <section className="min-w-0 rounded-xl border border-[#E5E7F0] bg-white p-4 shadow-[0_1px_3px_rgba(30,27,75,0.04)] xl:col-span-7">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div><h2 className="text-base font-bold text-[#1E1B4B]">Saved reports</h2><p className="text-xs text-[#64748B]">Definitions and current results for authorized workspaces.</p></div>
          <label className="relative min-w-48 flex-1 sm:max-w-xs"><Search className="absolute left-3 top-2.5 h-4 w-4 text-[#94A3B8]" /><input aria-label="Search reports" className={`${inputClass} pl-9`} placeholder="Search reports" value={search} onChange={(event) => setSearch(event.target.value)} /></label>
        </div>
        <div className="mb-3 grid gap-2 sm:grid-cols-2">
          <label className="text-[11px] font-medium text-[#64748B]">Workspace
            <select className={`${inputClass} mt-1 py-2 text-xs`} value={workspaceFilter} onChange={(event) => setWorkspaceFilter(event.target.value)}>
              <option value="all">All accessible workspaces</option>
              {workspaceRecords.map((workspace) => <option key={workspace.id} value={workspace.id}>{workspace.name}</option>)}
            </select>
          </label>
          <label className="text-[11px] font-medium text-[#64748B]">Status
            <select className={`${inputClass} mt-1 py-2 text-xs`} value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
              <option value="all">All statuses</option><option value="Unassigned">Unassigned (legacy)</option>
              {statuses.map((status) => <option key={status}>{status}</option>)}
            </select>
          </label>
        </div>
        {loading ? <div role="status" className="space-y-2 py-2">{Array.from({ length: 4 }, (_, index) => <div key={index} className="h-11 animate-pulse rounded-md bg-[#F3F4F8]" />)}</div>
          : visibleReports.length === 0 ? <div className="rounded-lg border border-dashed border-[#D9DCE8] px-4 py-12 text-center">
            <BriefcaseBusiness className="mx-auto h-8 w-8 text-[#A5AEC1]" /><p className="mt-2 text-sm font-semibold text-[#334155]">{reports.length ? 'No reports match these filters.' : 'No saved reports yet.'}</p>
            <p className="mt-1 text-xs text-[#64748B]">{reports.length ? 'Try a different search, workspace or status.' : 'Choose a report type above to save your first report definition.'}</p>
          </div>
            : <div className="overflow-x-auto rounded-lg border border-[#EEF0F6]">
              <table className="w-full min-w-[780px] text-left text-xs">
                <thead className="bg-[#FAFAFD] text-[10px] font-semibold uppercase tracking-wide text-[#64748B]">
                  <tr>
                    {([['name', 'Report Name'], ['type', 'Type'], ['period', 'Reporting Period'], ['created', 'Created Date'], ['status', 'Status']] as Array<[typeof sortKey, string]>).map(([key, label]) =>
                      <th key={key} className="px-3 py-3"><button className="inline-flex items-center gap-1 hover:text-violet-700" onClick={() => changeSort(key)}>{label}<span aria-hidden="true">{sortKey === key ? (sortAscending ? '↑' : '↓') : '↕'}</span></button></th>)}
                    <th className="px-3 py-3">Workspace / Linked record</th><th className="px-3 py-3">Created by</th><th className="px-3 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>{visibleReports.map((report) => {
                  const config = report.configuration;
                  const linkedRecord = typeof config.campaign_name === 'string' ? config.campaign_name : typeof config.project_name === 'string' ? config.project_name : '';
                  return <tr key={report.id} className={`border-t border-[#EEF0F6] transition hover:bg-[#FBFAFF] ${selectedId === report.id ? 'bg-[#F2EDFF]' : ''}`}>
                    <td className="px-3 py-3"><button onClick={() => setSelectedId(report.id)} className="text-left font-semibold text-[#312E81] hover:text-violet-700">{report.name}</button></td>
                    <td className="px-3 py-3 text-[#475569]">{reportLabel(report)}</td>
                    <td className="whitespace-nowrap px-3 py-3 text-[#475569]">{periodLabel(report)}</td>
                    <td className="whitespace-nowrap px-3 py-3 text-[#475569]">{formatDate(report.created_at)}</td>
                    <td className="px-3 py-3"><span className={`inline-flex rounded-full px-2 py-1 text-[10px] font-semibold ${report.status === 'Ready' ? 'bg-emerald-50 text-emerald-700' : report.status === 'In Review' ? 'bg-violet-50 text-violet-700' : report.status === 'Archived' ? 'bg-slate-100 text-slate-600' : 'bg-amber-50 text-amber-700'}`}>{report.status || 'Unassigned'}</span></td>
                    <td className="px-3 py-3 text-[#475569]"><span>{workspacesById.get(report.workspace_id)?.name || 'Workspace'}</span>{linkedRecord && <span className="block max-w-40 truncate text-[10px] text-[#64748B]">{linkedRecord}</span>}</td>
                    <td className="px-3 py-3 text-[#475569]">{report.created_by_name || 'Unavailable'}</td>
                    <td className="px-3 py-3"><div className="flex justify-end gap-1">
                      <button aria-label={`View ${report.name}`} title="View report" onClick={() => setSelectedId(report.id)} className="rounded p-1.5 text-violet-700 hover:bg-violet-50"><FileText className="h-4 w-4" /></button>
                      <button aria-label={`Edit ${report.name}`} title="Edit report" onClick={() => openEdit(report)} className="rounded p-1.5 text-[#475569] hover:bg-slate-100"><Pencil className="h-4 w-4" /></button>
                      <button aria-label={`Delete ${report.name}`} title="Delete report" disabled={saving} onClick={() => void remove(report)} className="rounded p-1.5 text-red-600 hover:bg-red-50 disabled:opacity-50"><Trash2 className="h-4 w-4" /></button>
                    </div></td>
                  </tr>;
                })}</tbody>
              </table>
            </div>}
      </section>

      <section className="min-w-0 overflow-hidden rounded-xl border border-[#E5E7F0] bg-white shadow-[0_1px_3px_rgba(30,27,75,0.04)] xl:col-span-5">
        <div className="flex items-start justify-between gap-3 border-b border-[#EEF0F6] px-4 py-4">
          <div><h2 className="text-base font-bold text-[#1E1B4B]">Report preview</h2><p className="mt-0.5 text-xs text-[#64748B]">Generated from authorized saved definitions and workspace records.</p></div>
          {selected && <button aria-label="Refresh report preview" title="Refresh current report" disabled={running} onClick={() => void runSelected()} className="rounded-lg border border-[#E2E8F0] p-2 text-[#64748B] hover:bg-slate-50 disabled:opacity-50"><RefreshCw className={`h-4 w-4 ${running ? 'animate-spin' : ''}`} /></button>}
        </div>
        {selected ? <div className="space-y-4 p-4">
          <div className="rounded-lg border border-[#EAE7F5] bg-gradient-to-br from-white to-[#F8F6FF] p-4">
            <div className="flex items-start justify-between gap-3"><div><div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-violet-700"><span className="grid h-6 w-6 place-items-center rounded bg-violet-100"><BarChart3 className="h-3.5 w-3.5" /></span>MarketFlow · {workspacesById.get(selected.workspace_id)?.name || 'Workspace'}</div><h3 className="mt-3 text-lg font-bold leading-tight text-[#1E1B4B]">{selected.name}</h3><p className="mt-1 text-xs text-[#64748B]">{reportLabel(selected)} · {periodLabel(selected)}</p></div><span className="rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-semibold text-emerald-700">{selected.status || 'Unassigned'}</span></div>
            <div className="mt-3 border-t border-[#E8E5F0] pt-2 text-[10px] text-[#64748B]">
              {result ? `Generated ${new Date(result.generated_at).toLocaleString()}` : 'Loading current workspace data…'} · Finance currency: {workspacesById.get(selected.workspace_id)?.currency || 'unavailable'}.
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => void runSelected()} disabled={running} className="inline-flex items-center gap-2 rounded-lg bg-[#6D28D9] px-3 py-2 text-xs font-semibold text-white hover:bg-[#5B21B6] disabled:opacity-50"><Check className="h-3.5 w-3.5" />View Report</button>
            <button onClick={() => void exportCsv()} className="inline-flex items-center gap-2 rounded-lg border border-[#D9DCE8] px-3 py-2 text-xs font-semibold text-[#334155] hover:bg-slate-50"><Download className="h-3.5 w-3.5" />Download CSV</button>
            <button onClick={() => openEdit(selected)} className="inline-flex items-center gap-2 rounded-lg border border-[#D9DCE8] px-3 py-2 text-xs font-semibold text-[#334155] hover:bg-slate-50"><Pencil className="h-3.5 w-3.5" />Edit</button>
          </div>
          <p className="text-[10px] leading-4 text-[#64748B]">PDF export is not implemented in this application; no placeholder PDF action is provided. Meta historical results remain in account currency and are not combined with MAD finance records.</p>
          {running && !result ? <div role="status" className="space-y-2"><div className="h-14 animate-pulse rounded bg-[#F3F4F8]" /><div className="h-36 animate-pulse rounded bg-[#F3F4F8]" /></div>
            : result ? <div className="max-h-[36rem] space-y-3 overflow-auto rounded-lg bg-[#F8F9FC] p-3">{selected.type === 'campaigns' && <CampaignSummary data={result.data} />}<ResultContent data={result.data} /></div>
              : <p className="rounded-lg border border-dashed p-6 text-center text-sm text-[#64748B]">Select View Report to load this report’s current data.</p>}
          <p className="text-[10px] text-[#64748B]">Source dates follow the report type: campaign start, project start, lead creation, or finance transaction date. Missing values are shown as unavailable.</p>
        </div> : <div className="px-4 py-16 text-center text-sm text-[#64748B]">Select a saved report to preview its definition and live results.</div>}
      </section>
    </div>}

    {showForm && <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-[#111827]/45 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget && !saving) setShowForm(false); }}>
      <section role="dialog" aria-modal="true" aria-labelledby="report-dialog-title" className="my-auto max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-xl border border-[#E6E8EF] bg-white p-5 shadow-2xl sm:p-6">
        <div className="mb-4 flex items-start justify-between"><div><h2 id="report-dialog-title" className="text-lg font-bold text-[#1E1B4B]">{editing ? 'Edit report' : `Create ${resolvedTemplate?.label || 'Custom Report'}`}</h2><p className="mt-1 text-xs text-[#64748B]">Save a report definition that runs against current authorized records.</p></div><button aria-label="Close" disabled={saving} onClick={() => setShowForm(false)} className="rounded p-1 text-[#64748B] hover:bg-slate-100"><X className="h-5 w-5" /></button></div>
        <form className="space-y-4" onSubmit={(event) => void submit(event)}>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-xs font-semibold text-[#475569]">Report name<input required maxLength={255} className={`${inputClass} mt-1.5`} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></label>
            <label className="text-xs font-semibold text-[#475569]">Workspace<select required className={`${inputClass} mt-1.5`} value={form.workspaceId} onChange={(event) => setForm({ ...form, workspaceId: event.target.value, campaignId: '', projectId: '' })}>{workspaces.map((workspace) => <option key={workspace.id} value={workspace.id}>{workspace.name}</option>)}</select></label>
          </div>
          {form.template === 'custom' && <label className="block text-xs font-semibold text-[#475569]">Data source<select className={`${inputClass} mt-1.5`} value={form.type} onChange={(event) => setSourceType(event.target.value as SavedReport['type'])}>{sourceTypes.map((source) => <option key={source.value} value={source.value}>{source.label}</option>)}</select></label>}
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="text-xs font-semibold text-[#475569]">From date<input type="date" max={form.to_date || undefined} className={`${inputClass} mt-1.5`} value={form.from_date} onChange={(event) => setForm({ ...form, from_date: event.target.value })} /></label>
            <label className="text-xs font-semibold text-[#475569]">To date<input type="date" min={form.from_date || undefined} className={`${inputClass} mt-1.5`} value={form.to_date} onChange={(event) => setForm({ ...form, to_date: event.target.value })} /></label>
            <label className="text-xs font-semibold text-[#475569]">Status<select className={`${inputClass} mt-1.5`} value={form.status || ''} onChange={(event) => setForm({ ...form, status: event.target.value as ReportForm['status'] })}><option value="">Unassigned</option>{statuses.map((status) => <option key={status}>{status}</option>)}</select></label>
          </div>
          {(form.type === 'campaigns' || form.type === 'projects') && <div className="grid gap-3 sm:grid-cols-2">
            {form.type === 'campaigns' && <label className="text-xs font-semibold text-[#475569]">Campaign<select className={`${inputClass} mt-1.5`} value={form.campaignId} onChange={(event) => setForm({ ...form, campaignId: event.target.value })}><option value="">All campaigns</option>{campaigns.map((campaign) => <option key={campaign.id} value={campaign.id}>{campaign.name}</option>)}</select></label>}
            {form.type === 'campaigns' && <label className="text-xs font-semibold text-[#475569]">Project filter<select className={`${inputClass} mt-1.5`} value={form.projectId} onChange={(event) => setForm({ ...form, projectId: event.target.value, campaignId: '' })}><option value="">All projects</option>{projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}</select></label>}
            {form.type === 'projects' && <label className="text-xs font-semibold text-[#475569]">Project<select className={`${inputClass} mt-1.5`} value={form.projectId} onChange={(event) => setForm({ ...form, projectId: event.target.value })}><option value="">All projects</option>{projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}</select></label>}
          </div>}
          <fieldset className="rounded-lg border border-[#E6E9F2] p-3">
            <legend className="px-1 text-xs font-semibold text-[#475569]">Metrics included</legend>
            {metricChoices.length === 0 ? <p className="text-xs text-[#64748B]">The selected source has no configurable metrics.</p>
              : <div className="grid gap-2 sm:grid-cols-2">{metricChoices.map((metric) => <label key={metric.key} className="flex items-center gap-2 text-xs text-[#334155]">
                <input type="checkbox" checked={form.metrics.includes(metric.key)} onChange={(event) => setForm((previous) => ({ ...previous, metrics: event.target.checked ? [...previous.metrics, metric.key] : previous.metrics.filter((key) => key !== metric.key) }))} className="rounded border-[#CBD5E1] text-violet-600 focus:ring-violet-500" />
                {metric.label}
              </label>)}</div>}
          </fieldset>
          <p className="rounded-lg bg-[#F8F7FC] p-3 text-[11px] leading-4 text-[#64748B]">
            Campaign figures are campaign records; finance totals are recorded ledger transactions and exclude planned budgets and unpaid orders. Workspace currency: {workspacesById.get(form.workspaceId)?.currency || 'unavailable'}. Meta studies remain separate.
          </p>
          <div className="flex justify-end gap-2 border-t border-[#EEF0F6] pt-4">
            <button type="button" disabled={saving} className="rounded-lg border border-[#D9DCE8] px-4 py-2 text-sm text-[#475569] hover:bg-slate-50 disabled:opacity-50" onClick={() => setShowForm(false)}>Cancel</button>
            <button disabled={saving || !form.workspaceId} className="rounded-lg bg-[#6D28D9] px-4 py-2 text-sm font-semibold text-white hover:bg-[#5B21B6] disabled:opacity-50">{saving ? 'Saving…' : editing ? 'Save changes' : 'Create report'}</button>
          </div>
        </form>
      </section>
    </div>}
  </main>;
};
