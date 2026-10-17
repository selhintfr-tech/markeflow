import React, { useEffect, useRef, useState } from 'react';
import { Download, Play, Plus, Trash2 } from 'lucide-react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { analyticsApi, type ReportResult, type SavedReport } from '../analytics/analyticsApi';

const inputClass = 'w-full rounded-lg border border-[#E2E8F0] bg-white px-3 py-2 text-sm text-[#1E1B4B]';
const types: Array<{ value: SavedReport['type']; label: string }> = [
  { value: 'overview', label: 'Overview' },
  { value: 'campaigns', label: 'Campaigns' },
  { value: 'tasks', label: 'Tasks' },
  { value: 'crm', label: 'CRM' },
  { value: 'finance', label: 'Finance' },
  { value: 'timeseries', label: 'Timeseries' },
];

function reportPeriod(report: SavedReport) {
  return report.from_date || report.to_date ? `${report.from_date || 'Start'} – ${report.to_date || 'Present'}` : 'All dates';
}

export const ReportsPage: React.FC = () => {
  const { currentWorkspace, hasWorkspace } = useWorkspace();
  const workspaceId = currentWorkspace.id;
  const [reports, setReports] = useState<SavedReport[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [result, setResult] = useState<ReportResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<SavedReport | null>(null);
  const [form, setForm] = useState({ name: '', type: 'overview' as SavedReport['type'], from_date: '', to_date: '', filters: '{}', configuration: '{}' });
  const workspaceVersion = useRef(0);

  useEffect(() => {
    workspaceVersion.current += 1;
    if (!workspaceId || !hasWorkspace) {
      setReports([]);
      setSelectedId('');
      setResult(null);
      setLoading(false);
      return;
    }
    setReports([]);
    setSelectedId('');
    setResult(null);
    setLoading(true);
    setError('');
    let active = true;
    analyticsApi.reports(workspaceId).then((data) => {
      if (!active) return;
      setReports(data);
      setSelectedId(data[0]?.id || '');
    }).catch((cause: unknown) => {
      if (active) setError(cause instanceof Error ? cause.message : 'Unable to load saved reports.');
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, [workspaceId, hasWorkspace]);

  const selected = reports.find((report) => report.id === selectedId) || null;
  const visibleReports = reports.filter((report) => report.name.toLowerCase().includes(search.toLowerCase()));

  useEffect(() => {
    if (!workspaceId || !selectedId) return;
    let active = true;
    analyticsApi.report(workspaceId, selectedId).then((detail) => {
      if (active) setReports((previous) => previous.map((report) => report.id === detail.id ? detail : report));
    }).catch((cause: unknown) => {
      if (active) setError(cause instanceof Error ? cause.message : 'Unable to load report details.');
    });
    return () => { active = false; };
  }, [workspaceId, selectedId]);

  const openCreate = () => {
    setEditing(null);
    setForm({ name: '', type: 'overview', from_date: '', to_date: '', filters: '{}', configuration: '{}' });
    setShowForm(true);
  };
  const openEdit = (report: SavedReport) => {
    setEditing(report);
    setForm({
      name: report.name,
      type: report.type,
      from_date: report.from_date || '',
      to_date: report.to_date || '',
      filters: JSON.stringify(report.filters || {}, null, 2),
      configuration: JSON.stringify(report.configuration || {}, null, 2),
    });
    setShowForm(true);
  };
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!workspaceId) return;
    const version = workspaceVersion.current;
    setSaving(true);
    setError('');
    let filters: Record<string, string>;
    let configuration: Record<string, unknown>;
    try {
      filters = JSON.parse(form.filters) as Record<string, string>;
      configuration = JSON.parse(form.configuration) as Record<string, unknown>;
      if (!filters || Array.isArray(filters) || typeof filters !== 'object' ||
          !configuration || Array.isArray(configuration) || typeof configuration !== 'object' ||
          Object.values(filters).some((value) => typeof value !== 'string')) {
        throw new Error('Filters must be a JSON object with string values and configuration must be a JSON object.');
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Filters and configuration must be valid JSON objects.');
      setSaving(false);
      return;
    }
    const payload = {
      name: form.name.trim(),
      type: form.type,
      from_date: form.from_date || null,
      to_date: form.to_date || null,
      filters,
      configuration,
    };
    try {
      const saved = editing
        ? await analyticsApi.updateReport(workspaceId, editing.id, payload)
        : await analyticsApi.createReport(workspaceId, payload);
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
  const run = async () => {
    if (!workspaceId || !selected) return;
    const version = workspaceVersion.current;
    setLoading(true);
    setError('');
    try {
      const nextResult = await analyticsApi.runReport(workspaceId, selected.id);
      if (version === workspaceVersion.current) setResult(nextResult);
    } catch (cause) {
      if (version === workspaceVersion.current) setError(cause instanceof Error ? cause.message : 'Unable to generate this report.');
    } finally {
      if (version === workspaceVersion.current) setLoading(false);
    }
  };
  const remove = async () => {
    if (!workspaceId || !selected || !window.confirm(`Delete report "${selected.name}"?`)) return;
    const version = workspaceVersion.current;
    setSaving(true);
    setError('');
    try {
      await analyticsApi.deleteReport(workspaceId, selected.id);
      if (version !== workspaceVersion.current) return;
      const remaining = reports.filter((report) => report.id !== selected.id);
      setReports(remaining);
      setSelectedId(remaining[0]?.id || '');
      setResult(null);
    } catch (cause) {
      if (version === workspaceVersion.current) setError(cause instanceof Error ? cause.message : 'Unable to delete report.');
    } finally {
      if (version === workspaceVersion.current) setSaving(false);
    }
  };
  const exportCsv = async () => {
    if (!workspaceId || !selected) return;
    const version = workspaceVersion.current;
    setError('');
    try {
      await analyticsApi.exportReport(workspaceId, selected.id, selected.name);
    } catch (cause) {
      if (version === workspaceVersion.current) setError(cause instanceof Error ? cause.message : 'Unable to export report.');
    }
  };

  return <main className="space-y-6 pb-12">
    <header className="flex flex-wrap items-end justify-between gap-3"><div><div className="text-xs text-[#64748B]">Insights / Reports</div><h1 className="mt-2 text-3xl font-extrabold text-[#1E1B4B]">Reports</h1><p className="mt-1 text-sm text-[#64748B]">Save report definitions, generate current workspace results and export CSV.</p></div>
      <button onClick={openCreate} disabled={!hasWorkspace} className="flex items-center gap-2 rounded-lg bg-[#6D28D9] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"><Plus className="h-4 w-4" />Create report</button></header>
    {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>}
    {!hasWorkspace && <p className="rounded-lg border bg-white p-4 text-sm text-[#64748B]">Select a workspace to manage reports.</p>}
    {loading && <p role="status" className="text-sm text-[#64748B]">Loading…</p>}
    {hasWorkspace && <div className="grid items-start gap-6 xl:grid-cols-12">
      <section className="rounded-xl border border-[#E2E8F0] bg-white p-5 xl:col-span-7">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2"><div><h2 className="font-bold text-[#1E1B4B]">Saved reports</h2><p className="text-xs text-[#64748B]">{currentWorkspace.name}</p></div><input className={`${inputClass} max-w-xs`} placeholder="Search reports" value={search} onChange={(event) => setSearch(event.target.value)} /></div>
        {!visibleReports.length && !loading ? <p className="py-10 text-center text-sm text-[#64748B]">No saved reports. Create a definition to get started.</p> :
          <div className="overflow-x-auto"><table className="w-full min-w-[580px] text-left text-sm"><thead><tr className="border-b text-xs text-[#64748B]"><th className="p-2">Name</th><th className="p-2">Type</th><th className="p-2">Period</th><th className="p-2">Updated</th><th /></tr></thead><tbody>{visibleReports.map((report) => <tr key={report.id} className={`border-b ${report.id === selectedId ? 'bg-[#F5F3FF]' : ''}`}><td className="p-2"><button className="text-left font-medium text-[#1E1B4B] hover:text-[#6D28D9]" onClick={() => { setSelectedId(report.id); setResult(null); }}>{report.name}</button></td><td className="p-2 capitalize">{report.type}</td><td className="p-2 whitespace-nowrap">{reportPeriod(report)}</td><td className="p-2 whitespace-nowrap">{new Date(report.updated_at).toLocaleDateString()}</td><td className="p-2 text-right"><button className="mr-2 text-[#6D28D9]" onClick={() => openEdit(report)}>Edit</button></td></tr>)}</tbody></table></div>}
      </section>
      <section className="space-y-4 rounded-xl border border-[#E2E8F0] bg-white p-5 xl:col-span-5">
        <div><h2 className="font-bold text-[#1E1B4B]">Report preview</h2><p className="text-xs text-[#64748B]">Generate a fresh result from persisted workspace data.</p></div>
        {selected ? <><div className="rounded-lg bg-[#F8F7FC] p-4"><h3 className="font-semibold text-[#1E1B4B]">{selected.name}</h3><p className="mt-1 text-xs capitalize text-[#64748B]">{selected.type} · {reportPeriod(selected)}</p></div>
          <div className="flex flex-wrap gap-2"><button onClick={() => void run()} disabled={loading} className="flex items-center gap-2 rounded-lg bg-[#6D28D9] px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"><Play className="h-4 w-4" />Run report</button><button onClick={() => void exportCsv()} className="flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold text-[#1E1B4B]"><Download className="h-4 w-4" />Export CSV</button><button onClick={() => void remove()} disabled={saving} className="flex items-center gap-2 rounded-lg border px-3 py-2 text-xs text-red-700 disabled:opacity-50"><Trash2 className="h-4 w-4" />Delete</button></div>
          {result && <div className="max-h-[28rem] overflow-auto rounded-lg border bg-slate-50 p-3"><p className="mb-2 text-xs text-[#64748B]">Generated {new Date(result.generated_at).toLocaleString()}</p><pre className="whitespace-pre-wrap break-words text-xs">{JSON.stringify(result.data, null, 2)}</pre></div>}
          {!result && <p className="text-sm text-[#64748B]">No result generated yet.</p>}</>
          : <p className="py-8 text-center text-sm text-[#64748B]">Select a saved report to view its definition and results.</p>}
      </section>
    </div>}
    {showForm && <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4"><section role="dialog" aria-modal="true" aria-label={editing ? 'Edit report' : 'Create report'} className="w-full max-w-xl rounded-xl bg-white p-6 shadow-xl">
      <h2 className="mb-4 text-lg font-bold text-[#1E1B4B]">{editing ? 'Edit report definition' : 'Create report definition'}</h2>
      <form className="space-y-4" onSubmit={(event) => void submit(event)}>
        <label className="block text-sm font-medium">Name<input required maxLength={255} className={`${inputClass} mt-1`} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></label>
        <label className="block text-sm font-medium">Report type<select className={`${inputClass} mt-1`} value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value as SavedReport['type'] })}>{types.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}</select></label>
        <div className="grid gap-3 sm:grid-cols-2"><label className="text-sm font-medium">From<input className={`${inputClass} mt-1`} type="date" value={form.from_date} max={form.to_date || undefined} onChange={(event) => setForm({ ...form, from_date: event.target.value })} /></label><label className="text-sm font-medium">To<input className={`${inputClass} mt-1`} type="date" value={form.to_date} min={form.from_date || undefined} onChange={(event) => setForm({ ...form, to_date: event.target.value })} /></label></div>
        <label className="block text-sm font-medium">Filters (JSON object)<textarea className={`${inputClass} mt-1 font-mono`} rows={3} value={form.filters} onChange={(event) => setForm({ ...form, filters: event.target.value })} /></label>
        <label className="block text-sm font-medium">Configuration (JSON object)<textarea className={`${inputClass} mt-1 font-mono`} rows={3} value={form.configuration} onChange={(event) => setForm({ ...form, configuration: event.target.value })} /></label>
        <div className="flex justify-end gap-2 border-t pt-4"><button type="button" className="rounded-lg border px-4 py-2 text-sm" onClick={() => setShowForm(false)}>Cancel</button><button disabled={saving} className="rounded-lg bg-[#6D28D9] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{saving ? 'Saving…' : 'Save report'}</button></div>
      </form>
    </section></div>}
  </main>;
};
