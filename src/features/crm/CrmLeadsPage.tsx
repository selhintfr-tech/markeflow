import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useWorkspace } from '../../context/WorkspaceContext';
import {
  crmService,
  type CrmActivity,
  type CrmContact,
  type CrmCustomer,
  type CrmLead,
  type CrmNote,
  type CrmPipeline,
  type CrmStage,
  type FunnelStage,
} from './crmService';

type Section = 'leads' | 'contacts' | 'customers' | 'pipeline';
type EntityForm =
  | { type: 'lead'; record?: CrmLead }
  | { type: 'contact'; record?: CrmContact }
  | { type: 'customer'; record?: CrmCustomer }
  | { type: 'pipeline'; record?: CrmPipeline }
  | { type: 'stage'; pipelineId: string; record?: CrmStage };
type ProfileView =
  | { kind: 'contact'; loading: boolean; record?: CrmContact; error?: string }
  | { kind: 'customer'; loading: boolean; record?: CrmCustomer; error?: string };

const inputClass = 'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-100';
const buttonClass = 'rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50';
const primaryClass = 'rounded-lg bg-violet-700 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-800 disabled:opacity-50';
const leadStatuses = ['New', 'Contacted', 'Qualified', 'Converted', 'Lost'];
const activityTypes = ['call', 'email', 'meeting', 'note'];

function dateTimeLocal(value?: string | null) {
  if (!value) return '';
  const date = new Date(value);
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60000).toISOString().slice(0, 16);
}

export const CrmLeadsPage: React.FC = () => {
  const { currentWorkspace, hasWorkspace, isLoadingWorkspaces } = useWorkspace();
  const workspaceId = currentWorkspace.id;
  const [section, setSection] = useState<Section>('leads');
  const [leads, setLeads] = useState<CrmLead[]>([]);
  const [contacts, setContacts] = useState<CrmContact[]>([]);
  const [customers, setCustomers] = useState<CrmCustomer[]>([]);
  const [pipelines, setPipelines] = useState<CrmPipeline[]>([]);
  const [funnel, setFunnel] = useState<FunnelStage[]>([]);
  const [notes, setNotes] = useState<CrmNote[]>([]);
  const [activities, setActivities] = useState<CrmActivity[]>([]);
  const [selectedLeadId, setSelectedLeadId] = useState('');
  const [pipelineId, setPipelineId] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [sortBy, setSortBy] = useState('recent');
  const [form, setForm] = useState<EntityForm | null>(null);
  const [profile, setProfile] = useState<ProfileView | null>(null);
  const [noteText, setNoteText] = useState('');
  const [activityForm, setActivityForm] = useState({ type: 'call', title: '', description: '', activity_date: dateTimeLocal(new Date().toISOString()) });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [detailError, setDetailError] = useState('');
  const requestId = useRef(0);
  const profileRequestId = useRef(0);
  const loadedWorkspaceId = useRef(workspaceId);

  const refresh = useCallback(async () => {
    const currentRequest = ++requestId.current;
    if (loadedWorkspaceId.current !== workspaceId) {
      loadedWorkspaceId.current = workspaceId;
      setLeads([]);
      setContacts([]);
      setCustomers([]);
      setPipelines([]);
      setFunnel([]);
      setNotes([]);
      setActivities([]);
      setSelectedLeadId('');
      setPipelineId('');
      setProfile(null);
    }
    if (!workspaceId) return;
    setLoading(true);
    setError('');
    try {
      const [leadResult, contactResult, customerResult, pipelineResult, funnelResult] = await Promise.all([
        crmService.leads(workspaceId, { search: search || undefined, status: status || undefined, sort_by: sortBy }),
        crmService.contacts(workspaceId, { search: section === 'contacts' ? search || undefined : undefined }),
        crmService.customers(workspaceId, { search: section === 'customers' ? search || undefined : undefined }),
        crmService.pipelines(workspaceId),
        crmService.funnel(workspaceId),
      ]);
      if (currentRequest !== requestId.current) return;
      setLeads(leadResult.data);
      setContacts(contactResult.data);
      setCustomers(customerResult.data);
      setPipelines(pipelineResult);
      setFunnel(funnelResult);
      setSelectedLeadId((selected) => leadResult.data.some((lead) => lead.id === selected) ? selected : leadResult.data[0]?.id || '');
      setPipelineId((selected) => pipelineResult.some((pipeline) => pipeline.id === selected)
        ? selected
        : pipelineResult.find((pipeline) => pipeline.is_default)?.id || pipelineResult[0]?.id || '');
    } catch (cause) {
      if (currentRequest === requestId.current) setError(cause instanceof Error ? cause.message : 'Unable to load CRM records.');
    } finally {
      if (currentRequest === requestId.current) setLoading(false);
    }
  }, [workspaceId, search, status, sortBy, section]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    profileRequestId.current += 1;
    setProfile(null);
  }, [workspaceId]);

  const selectedLead = useMemo(
    () => leads.find((lead) => lead.id === selectedLeadId) || null,
    [leads, selectedLeadId],
  );
  const selectedPipeline = pipelines.find((pipeline) => pipeline.id === pipelineId) || null;

  const loadLeadDetails = useCallback(async (leadId: string) => {
    if (!workspaceId || !leadId) {
      setNotes([]);
      setActivities([]);
      return;
    }
    setDetailError('');
    try {
      const [nextNotes, nextActivities] = await Promise.all([
        crmService.notes(workspaceId, { lead_id: leadId }),
        crmService.activities(workspaceId, { lead_id: leadId }),
      ]);
      setNotes(nextNotes);
      setActivities(nextActivities);
    } catch (cause) {
      setDetailError(cause instanceof Error ? cause.message : 'Unable to load lead history.');
    }
  }, [workspaceId]);

  useEffect(() => {
    void loadLeadDetails(selectedLeadId);
  }, [loadLeadDetails, selectedLeadId]);

  const save = async (operation: () => Promise<unknown>) => {
    setSaving(true);
    setError('');
    try {
      await operation();
      setForm(null);
      await refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'The CRM record could not be saved.');
    } finally {
      setSaving(false);
    }
  };

  const openProfile = async (kind: ProfileView['kind'], id: string) => {
    if (!workspaceId) return;
    const currentRequest = ++profileRequestId.current;
    setProfile(kind === 'contact'
      ? { kind, loading: true }
      : { kind, loading: true });
    try {
      if (kind === 'contact') {
        const record = await crmService.contact(workspaceId, id);
        if (currentRequest !== profileRequestId.current) return;
        setProfile({ kind, loading: false, record });
      } else {
        const record = await crmService.customer(workspaceId, id);
        if (currentRequest !== profileRequestId.current) return;
        setProfile({ kind, loading: false, record });
      }
    } catch (cause) {
      if (currentRequest !== profileRequestId.current) return;
      setProfile(kind === 'contact'
        ? { kind, loading: false, error: cause instanceof Error ? cause.message : 'Unable to load contact.' }
        : { kind, loading: false, error: cause instanceof Error ? cause.message : 'Unable to load customer.' });
    }
  };

  const submitEntity = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!workspaceId || !form) return;
    const values = Object.fromEntries(new FormData(event.currentTarget).entries());
    const numeric = (key: string) => values[key] ? Number(values[key]) : null;
    const text = (key: string) => String(values[key] || '').trim();
    const optional = (key: string) => text(key) || null;

    if (form.type === 'lead') {
      const payload = {
        name: text('name'),
        company: optional('company'),
        email: optional('email'),
        phone: optional('phone'),
        source: optional('source'),
        status: text('status'),
        pipeline_id: optional('pipeline_id'),
        stage_id: optional('stage_id'),
        source_campaign_id: optional('source_campaign_id'),
        related_project_id: optional('related_project_id'),
        estimated_value: numeric('estimated_value'),
        currency: text('currency') || 'USD',
        owner_id: numeric('owner_id'),
        preferred_contact: optional('preferred_contact'),
        location: optional('location'),
        next_follow_up_at: optional('next_follow_up_at'),
        internal_notes: optional('internal_notes'),
      };
      void save(() => form.record
        ? crmService.updateLead(workspaceId, form.record.id, payload)
        : crmService.createLead(workspaceId, payload));
    } else if (form.type === 'contact') {
      const payload = {
        first_name: text('first_name'),
        last_name: optional('last_name'),
        company_name: optional('company_name'),
        email: optional('email'),
        phone: optional('phone'),
        job_title: optional('job_title'),
        preferred_contact: optional('preferred_contact'),
        location: optional('location'),
        lifecycle_stage: text('lifecycle_stage') || 'lead',
        status: text('status') || 'Active',
        owner_id: numeric('owner_id'),
        notes: optional('notes'),
      };
      void save(() => form.record
        ? crmService.updateContact(workspaceId, form.record.id, payload)
        : crmService.createContact(workspaceId, payload));
    } else if (form.type === 'customer') {
      const payload = {
        company_name: text('company_name'),
        contact_name: text('contact_name'),
        email: optional('email'),
        phone: optional('phone'),
        status: text('status') || 'Active',
        customer_tier: text('customer_tier') || 'Standard',
        total_revenue: numeric('total_revenue') ?? 0,
        currency: text('currency') || 'USD',
        contact_id: optional('contact_id'),
        owner_id: numeric('owner_id'),
        notes: optional('notes'),
      };
      void save(() => form.record
        ? crmService.updateCustomer(workspaceId, form.record.id, payload)
        : crmService.createCustomer(workspaceId, payload));
    } else if (form.type === 'pipeline') {
      const payload = {
        name: text('name'),
        slug: optional('slug'),
        description: optional('description'),
        display_order: numeric('display_order') ?? 1,
      };
      void save(() => form.record
        ? crmService.updatePipeline(workspaceId, form.record.id, payload)
        : crmService.createPipeline(workspaceId, payload));
    } else {
      const payload = {
        name: text('name'),
        code: optional('code'),
        color: optional('color'),
        probability: numeric('probability') ?? 0,
        display_order: numeric('display_order') ?? 1,
        is_won: values.is_won === 'on',
        is_lost: values.is_lost === 'on',
      };
      void save(() => form.record
        ? crmService.updateStage(workspaceId, form.record.id, payload)
        : crmService.createStage(workspaceId, form.pipelineId, payload));
    }
  };

  const remove = async (label: string, operation: () => Promise<unknown>) => {
    if (!window.confirm(`Delete this ${label}?`)) return;
    await save(operation);
  };

  const moveStage = async (lead: CrmLead, stage: CrmStage) => {
    if (!workspaceId || lead.stage_id === stage.id) return;
    await save(() => crmService.updateLead(workspaceId, lead.id, {
      pipeline_id: stage.pipeline_id,
      stage_id: stage.id,
    }));
  };

  const reorder = async (index: number, direction: -1 | 1) => {
    if (!workspaceId || !selectedPipeline) return;
    const stages = [...selectedPipeline.stages].sort((a, b) => a.display_order - b.display_order);
    const target = index + direction;
    if (target < 0 || target >= stages.length) return;
    [stages[index], stages[target]] = [stages[target], stages[index]];
    const ordered = stages.map((stage, stageIndex) => ({ ...stage, display_order: stageIndex + 1 }));
    await save(async () => {
      await crmService.reorderStages(workspaceId, ordered.map(({ id, display_order }) => ({ id, display_order })));
    });
  };

  const createNote = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!workspaceId || !selectedLead || !noteText.trim()) return;
    await save(async () => {
      await crmService.createNote(workspaceId, { lead_id: selectedLead.id, content: noteText.trim() });
      setNoteText('');
      await loadLeadDetails(selectedLead.id);
    });
  };

  const submitActivity = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!workspaceId || !selectedLead) return;
    await save(async () => {
      await crmService.createActivity(workspaceId, {
        lead_id: selectedLead.id,
        type: activityForm.type,
        title: activityForm.title.trim(),
        description: activityForm.description.trim() || null,
        activity_date: new Date(activityForm.activity_date).toISOString(),
      });
      setActivityForm({ type: 'call', title: '', description: '', activity_date: dateTimeLocal(new Date().toISOString()) });
      await loadLeadDetails(selectedLead.id);
    });
  };

  const convertLead = async (lead: CrmLead) => {
    if (!workspaceId || !window.confirm(`Convert ${lead.name} into a customer?`)) return;
    await save(() => crmService.convertLead(workspaceId, lead.id));
    setSection('customers');
  };

  if (isLoadingWorkspaces) return <p className="p-6 text-sm text-slate-500">Loading workspaces…</p>;
  if (!hasWorkspace) return <p className="p-6 text-sm text-slate-600">Select or create a workspace to use CRM.</p>;

  return (
    <main className="mx-auto max-w-[1500px] space-y-5 p-4 text-slate-900 sm:p-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm text-slate-500">Workspace CRM</p>
          <h1 className="mt-1 text-2xl font-bold">Customers &amp; Leads</h1>
          <p className="mt-1 text-sm text-slate-600">{currentWorkspace.name} · live CRM records</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button className={buttonClass} onClick={() => void refresh()} disabled={loading}>{loading ? 'Loading…' : 'Refresh'}</button>
          {section === 'leads' && <button className={primaryClass} onClick={() => setForm({ type: 'lead' })}>Add lead</button>}
          {section === 'contacts' && <button className={primaryClass} onClick={() => setForm({ type: 'contact' })}>Add contact</button>}
          {section === 'customers' && <button className={primaryClass} onClick={() => setForm({ type: 'customer' })}>Add customer</button>}
          {section === 'pipeline' && <button className={primaryClass} onClick={() => setForm({ type: 'pipeline' })}>New pipeline</button>}
        </div>
      </header>

      {error && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</div>}

      <nav className="flex flex-wrap gap-2 border-b pb-3">
        {([['leads', 'Leads'], ['contacts', 'Contacts'], ['customers', 'Customers'], ['pipeline', 'Sales pipeline']] as const).map(([key, label]) =>
          <button key={key} onClick={() => setSection(key)} className={`rounded-lg px-4 py-2 text-sm font-medium ${section === key ? 'bg-violet-100 text-violet-800' : 'text-slate-600 hover:bg-slate-100'}`}>{label}</button>
        )}
      </nav>

      {section === 'leads' && <>
        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Metric label="Total leads" value={funnel.reduce((sum, stage) => sum + stage.count, 0)} />
          {funnel.map((stage) => <Metric key={stage.status} label={stage.label} value={stage.count} />)}
        </section>
        <section className="rounded-xl border bg-white p-4">
          <div className="mb-4 flex flex-wrap gap-2">
            <input aria-label="Search leads" className={`${inputClass} max-w-sm`} placeholder="Search name, company, email…" value={search} onChange={(event) => setSearch(event.target.value)} />
            <select aria-label="Filter leads by status" className={`${inputClass} max-w-48`} value={status} onChange={(event) => setStatus(event.target.value)}>
              <option value="">All statuses</option>{leadStatuses.map((value) => <option key={value}>{value}</option>)}
            </select>
            <select aria-label="Sort leads" className={`${inputClass} max-w-48`} value={sortBy} onChange={(event) => setSortBy(event.target.value)}>
              <option value="recent">Most recent</option><option value="oldest">Oldest</option><option value="name">Name</option><option value="company">Company</option>
            </select>
          </div>
          {!leads.length && !loading ? <Empty text="No leads found. Create your first lead." /> : (
            <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[740px] text-left text-sm">
                  <thead className="border-b text-xs uppercase text-slate-500"><tr><th className="py-3">Lead</th><th>Company</th><th>Status</th><th>Source</th><th>Owner</th><th /></tr></thead>
                  <tbody className="divide-y">{leads.map((lead) => <tr key={lead.id} onClick={() => setSelectedLeadId(lead.id)} className={`cursor-pointer hover:bg-violet-50 ${selectedLeadId === lead.id ? 'bg-violet-50' : ''}`}>
                    <td className="py-3"><span className="block font-medium">{lead.name}</span><span className="text-xs text-slate-500">{lead.email || 'No email'}</span></td>
                    <td>{lead.company || '—'}</td><td><StatusPill status={lead.status} /></td><td>{lead.source || '—'}</td><td>{lead.assignedTo?.name || '—'}</td>
                    <td className="whitespace-nowrap text-right" onClick={(event) => event.stopPropagation()}>
                      <button className="mr-2 text-violet-700 hover:underline" onClick={() => setForm({ type: 'lead', record: lead })}>Edit</button>
                      {lead.status !== 'Converted' && <button className="mr-2 text-emerald-700 hover:underline" onClick={() => void convertLead(lead)}>Convert</button>}
                      <button className="text-red-700 hover:underline" onClick={() => void remove('lead', () => crmService.deleteLead(workspaceId, lead.id))}>Delete</button>
                    </td>
                  </tr>)}</tbody>
                </table>
              </div>
              {selectedLead && <LeadDetails
                lead={selectedLead}
                notes={notes}
                activities={activities}
                pipelines={pipelines}
                detailError={detailError}
                noteText={noteText}
                setNoteText={setNoteText}
                activityForm={activityForm}
                setActivityForm={setActivityForm}
                onEdit={() => setForm({ type: 'lead', record: selectedLead })}
                onCreateNote={createNote}
                onSubmitActivity={submitActivity}
                onUpdateNote={(note, content) => void save(async () => { await crmService.updateNote(workspaceId, note.id, { content }); await loadLeadDetails(selectedLead.id); })}
                onDeleteNote={(note) => void remove('note', async () => { await crmService.deleteNote(workspaceId, note.id); await loadLeadDetails(selectedLead.id); })}
                onDeleteActivity={(activity) => void remove('activity', async () => { await crmService.deleteActivity(workspaceId, activity.id); await loadLeadDetails(selectedLead.id); })}
              />}
            </div>
          )}
        </section>
      </>}

      {section === 'contacts' && <RecordSection
        title="Contacts"
        search={search}
        setSearch={setSearch}
        empty={contacts.length === 0 && !loading}
        emptyText="No contacts found."
      >
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="border-b text-xs uppercase text-slate-500"><tr><th className="py-3">Contact</th><th>Company</th><th>Lifecycle</th><th>Status</th><th>Owner</th><th /></tr></thead>
          <tbody className="divide-y">{contacts.map((contact) => <tr key={contact.id}>
            <td className="py-3"><button className="block text-left font-medium hover:text-violet-700" onClick={() => void openProfile('contact', contact.id)}>{contact.name}</button><span className="text-xs text-slate-500">{contact.email || 'No email'} · {contact.phone || 'No phone'}</span></td>
            <td>{contact.company_name || '—'}</td><td>{contact.lifecycle_stage}</td><td>{contact.status}</td><td>{contact.owner?.name || '—'}</td>
            <td className="whitespace-nowrap text-right"><button className="mr-3 text-violet-700 hover:underline" onClick={() => setForm({ type: 'contact', record: contact })}>Edit</button><button className="text-red-700 hover:underline" onClick={() => void remove('contact', () => crmService.deleteContact(workspaceId, contact.id))}>Delete</button></td>
          </tr>)}</tbody>
        </table>
      </RecordSection>}

      {section === 'customers' && <RecordSection
        title="Customers"
        search={search}
        setSearch={setSearch}
        empty={customers.length === 0 && !loading}
        emptyText="No customers found. Convert a qualified lead or add a customer."
      >
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="border-b text-xs uppercase text-slate-500"><tr><th className="py-3">Customer</th><th>Contact</th><th>Tier</th><th>Status</th><th>Revenue</th><th>Owner</th><th /></tr></thead>
          <tbody className="divide-y">{customers.map((customer) => <tr key={customer.id}>
            <td className="py-3"><button className="text-left font-medium hover:text-violet-700" onClick={() => void openProfile('customer', customer.id)}>{customer.company_name}</button></td><td>{customer.contact_name}<span className="block text-xs text-slate-500">{customer.email || 'No email'}</span></td>
            <td>{customer.customer_tier}</td><td>{customer.status}</td><td>{customer.currency} {customer.total_revenue.toLocaleString()}</td><td>{customer.owner?.name || '—'}</td>
            <td className="whitespace-nowrap text-right"><button className="mr-3 text-violet-700 hover:underline" onClick={() => setForm({ type: 'customer', record: customer })}>Edit</button><button className="text-red-700 hover:underline" onClick={() => void remove('customer', () => crmService.deleteCustomer(workspaceId, customer.id))}>Delete</button></td>
          </tr>)}</tbody>
        </table>
      </RecordSection>}

      {section === 'pipeline' && <section className="space-y-4 rounded-xl border bg-white p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div><h2 className="text-lg font-semibold">Sales pipeline</h2><p className="text-sm text-slate-500">Stage movement and funnel counts are saved by the CRM API.</p></div>
          <select aria-label="Select pipeline" className={`${inputClass} max-w-xs`} value={pipelineId} onChange={(event) => setPipelineId(event.target.value)}>{pipelines.map((pipeline) => <option key={pipeline.id} value={pipeline.id}>{pipeline.name}{pipeline.is_default ? ' (default)' : ''}</option>)}</select>
        </div>
        {selectedPipeline && <>
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-600">{selectedPipeline.description || 'No description'}</p>
            <span className="flex gap-2"><button className={buttonClass} onClick={() => setForm({ type: 'pipeline', record: selectedPipeline })}>Edit pipeline</button>{!selectedPipeline.is_default && <button className={buttonClass} onClick={() => void remove('pipeline', () => crmService.deletePipeline(workspaceId, selectedPipeline.id))}>Delete pipeline</button>}</span>
          </div>
          <div className="grid gap-4 overflow-x-auto pb-2 md:grid-cols-2 xl:grid-cols-5">
            {[...selectedPipeline.stages].sort((a, b) => a.display_order - b.display_order).map((stage, index) => {
              const stageLeads = leads.filter((lead) => lead.pipeline_id === selectedPipeline.id && lead.stage_id === stage.id);
              return <article key={stage.id} className="min-w-56 rounded-lg border bg-slate-50 p-3">
                <header className="mb-3 flex items-center justify-between gap-2">
                  <div><h3 className="font-semibold">{stage.name} <span className="text-xs text-slate-500">({stageLeads.length})</span></h3><p className="text-xs text-slate-500">{stage.probability}% probability</p></div>
                  <div className="flex gap-1"><button aria-label="Move stage up" className="rounded p-1 hover:bg-white" onClick={() => void reorder(index, -1)}>↑</button><button aria-label="Move stage down" className="rounded p-1 hover:bg-white" onClick={() => void reorder(index, 1)}>↓</button><button aria-label="Edit stage" className="rounded p-1 text-violet-700 hover:bg-white" onClick={() => setForm({ type: 'stage', pipelineId: selectedPipeline.id, record: stage })}>Edit</button></div>
                </header>
                {stageLeads.map((lead) => <article key={lead.id} className="mb-2 rounded-lg border bg-white p-3">
                  <button className="text-left font-medium hover:text-violet-700" onClick={() => { setSection('leads'); setSelectedLeadId(lead.id); }}>{lead.name}</button>
                  <p className="text-xs text-slate-500">{lead.company || lead.email || '—'}</p>
                  <select aria-label={`Move ${lead.name} to stage`} className={`${inputClass} mt-2 bg-white`} value={lead.stage_id || ''} onChange={(event) => { const nextStage = selectedPipeline.stages.find((item) => item.id === event.target.value); if (nextStage) void moveStage(lead, nextStage); }}>
                    {selectedPipeline.stages.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                  </select>
                </article>)}
                {stageLeads.length === 0 && <p className="py-3 text-center text-xs text-slate-500">No leads in this stage.</p>}
              </article>;
            })}
          </div>
          <button className={buttonClass} onClick={() => setForm({ type: 'stage', pipelineId: selectedPipeline.id })}>Add stage</button>
        </>}
        {!pipelines.length && <Empty text="No sales pipelines are available." />}
      </section>}

      {form && <EntityDialog
        form={form}
        pipelines={pipelines}
        contacts={contacts}
        saving={saving}
        onClose={() => setForm(null)}
        onSubmit={submitEntity}
      />}
      {profile && <ProfileDialog profile={profile} onClose={() => setProfile(null)} />}
    </main>
  );
};

function Metric({ label, value }: { label: string; value: number }) {
  return <article className="rounded-xl border bg-white p-4"><p className="text-sm text-slate-500">{label}</p><p className="mt-1 text-2xl font-bold">{value}</p></article>;
}

function StatusPill({ status }: { status: string }) {
  return <span className="rounded-full bg-violet-50 px-2.5 py-1 text-xs font-medium text-violet-800">{status}</span>;
}

function Empty({ text }: { text: string }) {
  return <p className="rounded-lg border border-dashed p-8 text-center text-sm text-slate-500">{text}</p>;
}

function RecordSection({ title, search, setSearch, empty, emptyText, children }: {
  title: string;
  search: string;
  setSearch: (value: string) => void;
  empty: boolean;
  emptyText: string;
  children: React.ReactNode;
}) {
  return <section className="rounded-xl border bg-white p-4 sm:p-5">
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><h2 className="text-lg font-semibold">{title}</h2><input aria-label={`Search ${title.toLowerCase()}`} className={`${inputClass} max-w-sm`} placeholder={`Search ${title.toLowerCase()}…`} value={search} onChange={(event) => setSearch(event.target.value)} /></div>
    {empty ? <Empty text={emptyText} /> : <div className="overflow-x-auto">{children}</div>}
  </section>;
}

function LeadDetails({
  lead, notes, activities, pipelines, detailError, noteText, setNoteText, activityForm, setActivityForm,
  onEdit, onCreateNote, onSubmitActivity, onUpdateNote, onDeleteNote, onDeleteActivity,
}: {
  lead: CrmLead;
  notes: CrmNote[];
  activities: CrmActivity[];
  pipelines: CrmPipeline[];
  detailError: string;
  noteText: string;
  setNoteText: (value: string) => void;
  activityForm: { type: string; title: string; description: string; activity_date: string };
  setActivityForm: React.Dispatch<React.SetStateAction<{ type: string; title: string; description: string; activity_date: string }>>;
  onEdit: () => void;
  onCreateNote: (event: React.FormEvent) => void;
  onSubmitActivity: (event: React.FormEvent) => void;
  onUpdateNote: (note: CrmNote, content: string) => void;
  onDeleteNote: (note: CrmNote) => void;
  onDeleteActivity: (activity: CrmActivity) => void;
}) {
  const currentPipeline = pipelines.find((pipeline) => pipeline.id === lead.pipeline_id);
  return <aside className="max-h-[75vh] space-y-4 overflow-y-auto rounded-xl border bg-white p-4">
    <header className="flex items-start justify-between gap-2"><div><h2 className="text-lg font-bold">{lead.name}</h2><p className="text-sm text-slate-500">{lead.company || 'No company'}</p></div><button className="text-sm font-medium text-violet-700" onClick={onEdit}>Edit</button></header>
    <div className="grid grid-cols-2 gap-2 text-sm"><Detail label="Email" value={lead.email} /><Detail label="Phone" value={lead.phone} /><Detail label="Source" value={lead.source} /><Detail label="Stage" value={lead.stage?.name || lead.status} /><Detail label="Owner" value={lead.assignedTo?.name} /><Detail label="Value" value={lead.estimated_value === null ? null : `${lead.currency} ${lead.estimated_value.toLocaleString()}`} /></div>
    {lead.internalNotes && <p className="whitespace-pre-wrap rounded-lg bg-slate-50 p-3 text-sm">{lead.internalNotes}</p>}
    {detailError && <p role="alert" className="text-sm text-red-700">{detailError}</p>}
    <section><h3 className="mb-2 font-semibold">Notes</h3>
      {notes.map((note) => <article key={note.id} className="mb-2 rounded-lg bg-amber-50 p-3 text-sm"><p className="whitespace-pre-wrap">{note.content}</p><p className="mt-1 text-xs text-slate-500">{note.user?.name || 'Team member'} · {new Date(note.created_at).toLocaleDateString()}</p><div className="mt-2 flex gap-3"><button className="text-violet-700" onClick={() => { const content = window.prompt('Edit note', note.content); if (content?.trim()) onUpdateNote(note, content.trim()); }}>Edit</button><button className="text-red-700" onClick={() => onDeleteNote(note)}>Delete</button></div></article>)}
      <form onSubmit={onCreateNote} className="space-y-2"><textarea aria-label="New note" required maxLength={10000} value={noteText} onChange={(event) => setNoteText(event.target.value)} className={inputClass} placeholder="Write a note…" /><button className={buttonClass}>Add note</button></form>
    </section>
    <section><h3 className="mb-2 font-semibold">Activity history</h3>
      {!activities.length && <p className="mb-2 text-sm text-slate-500">No activities recorded.</p>}
      <div className="space-y-2">{activities.map((activity) => <article key={activity.id} className="rounded-lg border p-3 text-sm"><div className="flex justify-between gap-2"><strong>{activity.title}</strong><span className="text-xs text-slate-500">{new Date(activity.activity_date).toLocaleString()}</span></div><p className="text-xs capitalize text-violet-700">{activity.type.replace('_', ' ')}{activity.user?.name ? ` · ${activity.user.name}` : ''}</p>{activity.description && <p className="mt-1">{activity.description}</p>}{!['create', 'conversion', 'status_change'].includes(activity.type) && <button className="mt-1 text-xs text-red-700" onClick={() => onDeleteActivity(activity)}>Delete</button>}</article>)}</div>
      <form onSubmit={onSubmitActivity} className="mt-3 space-y-2 rounded-lg bg-slate-50 p-3">
        <h4 className="text-sm font-semibold">Record activity</h4>
        <select aria-label="Activity type" className={inputClass} value={activityForm.type} onChange={(event) => setActivityForm({ ...activityForm, type: event.target.value })}>{activityTypes.map((type) => <option key={type}>{type}</option>)}</select>
        <input aria-label="Activity title" required maxLength={255} className={inputClass} placeholder="Title" value={activityForm.title} onChange={(event) => setActivityForm({ ...activityForm, title: event.target.value })} />
        <textarea aria-label="Activity description" maxLength={5000} className={inputClass} placeholder="Description" value={activityForm.description} onChange={(event) => setActivityForm({ ...activityForm, description: event.target.value })} />
        <input aria-label="Activity date" type="datetime-local" className={inputClass} value={activityForm.activity_date} onChange={(event) => setActivityForm({ ...activityForm, activity_date: event.target.value })} />
        <button className={buttonClass}>Save activity</button>
      </form>
    </section>
    {currentPipeline && <p className="text-xs text-slate-500">Pipeline: {currentPipeline.name}</p>}
  </aside>;
}

function Detail({ label, value }: { label: string; value: string | number | null | undefined }) {
  return <div><p className="text-xs text-slate-500">{label}</p><p className="break-words">{value || '—'}</p></div>;
}

function EntityDialog({ form, pipelines, contacts, saving, onClose, onSubmit }: {
  form: EntityForm;
  pipelines: CrmPipeline[];
  contacts: CrmContact[];
  saving: boolean;
  onClose: () => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
}) {
  const title = form.type === 'stage' ? (form.record ? 'Edit stage' : 'Add stage') : `${form.record ? 'Edit' : 'Create'} ${form.type}`;
  const pipeline = form.type === 'stage' ? pipelines.find((item) => item.id === form.pipelineId) : undefined;
  return <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/40 p-4">
    <section role="dialog" aria-modal="true" aria-label={title} className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-xl bg-white p-5 shadow-xl">
      <header className="mb-4 flex items-center justify-between"><h2 className="text-lg font-semibold">{title}</h2><button aria-label="Close" className="rounded px-2 py-1 hover:bg-slate-100" onClick={onClose}>×</button></header>
      <form onSubmit={onSubmit} className="grid gap-3 sm:grid-cols-2">
        {form.type === 'lead' && <LeadForm record={form.record} pipelines={pipelines} />}
        {form.type === 'contact' && <ContactForm record={form.record} />}
        {form.type === 'customer' && <CustomerForm record={form.record} contacts={contacts} />}
        {form.type === 'pipeline' && <PipelineForm record={form.record} />}
        {form.type === 'stage' && <StageForm record={form.record} pipeline={pipeline} />}
        <div className="col-span-full flex justify-end gap-2 pt-2"><button type="button" className={buttonClass} onClick={onClose}>Cancel</button><button disabled={saving} className={primaryClass}>{saving ? 'Saving…' : 'Save'}</button></div>
      </form>
    </section>
  </div>;
}

function Field({ label, name, defaultValue, type = 'text', required = false, maxLength, options, className }: {
  label: string;
  name: string;
  defaultValue?: string | number | null;
  type?: string;
  required?: boolean;
  maxLength?: number;
  options?: Array<string | { value: string; label: string }>;
  className?: string;
}) {
  const common = { id: name, name, required, className: className || inputClass, defaultValue: defaultValue ?? '', maxLength };
  return <label htmlFor={name} className="block space-y-1 text-sm font-medium text-slate-700">{label}
    {options ? <select {...common}><option value="">—</option>{options.map((option) => typeof option === 'string'
      ? <option key={option} value={option}>{option}</option>
      : <option key={option.value} value={option.value}>{option.label}</option>)}</select> : type === 'textarea' ? <textarea {...common} rows={3} /> : <input {...common} type={type} />}
  </label>;
}

function LeadForm({ record, pipelines }: { record?: CrmLead; pipelines: CrmPipeline[] }) {
  const activePipelineId = record?.pipeline_id || pipelines.find((pipeline) => pipeline.is_default)?.id || pipelines[0]?.id || '';
  const [selectedPipelineId, setSelectedPipelineId] = useState(activePipelineId);
  const pipeline = pipelines.find((item) => item.id === selectedPipelineId);
  return <>
    <Field label="Name" name="name" required defaultValue={record?.name} maxLength={255} />
    <Field label="Company" name="company" defaultValue={record?.company} maxLength={255} />
    <Field label="Email" name="email" type="email" defaultValue={record?.email} maxLength={255} />
    <Field label="Phone" name="phone" defaultValue={record?.phone} maxLength={50} />
    <Field label="Status" name="status" defaultValue={record?.status || 'New'} options={leadStatuses} />
    <Field label="Source" name="source" defaultValue={record?.source} maxLength={100} />
    <label className="block space-y-1 text-sm font-medium text-slate-700">Pipeline
      <select name="pipeline_id" className={inputClass} value={selectedPipelineId} onChange={(event) => setSelectedPipelineId(event.target.value)}>
        <option value="">Default pipeline</option>{pipelines.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
      </select>
    </label>
    <Field label="Stage" name="stage_id" defaultValue={record?.stage_id} options={pipeline?.stages.slice().sort((a, b) => a.display_order - b.display_order).map((stage) => ({ value: stage.id, label: stage.name }))} />
    <Field label="Campaign UUID (optional)" name="source_campaign_id" defaultValue={record?.source_campaign_id} />
    <Field label="Project UUID (optional)" name="related_project_id" defaultValue={record?.related_project_id} />
    <Field label="Estimated value" name="estimated_value" type="number" defaultValue={record?.estimated_value} />
    <Field label="Currency" name="currency" defaultValue={record?.currency || 'USD'} maxLength={3} />
    <Field label="Workspace member owner ID (optional)" name="owner_id" type="number" defaultValue={record?.assignedTo?.id} />
    <Field label="Preferred contact" name="preferred_contact" defaultValue={record?.preferredContact} maxLength={50} />
    <Field label="Location" name="location" defaultValue={record?.location} maxLength={255} />
    <Field label="Next follow-up" name="next_follow_up_at" type="datetime-local" defaultValue={dateTimeLocal(record?.next_follow_up_at)} />
    <Field label="Internal notes" name="internal_notes" type="textarea" defaultValue={record?.internalNotes} maxLength={10000} className={`${inputClass} sm:col-span-2`} />
  </>;
}

function ContactForm({ record }: { record?: CrmContact }) {
  return <>
    <Field label="First name" name="first_name" required defaultValue={record?.first_name} maxLength={255} />
    <Field label="Last name" name="last_name" defaultValue={record?.last_name} maxLength={255} />
    <Field label="Company" name="company_name" defaultValue={record?.company_name} maxLength={255} />
    <Field label="Email" name="email" type="email" defaultValue={record?.email} maxLength={255} />
    <Field label="Phone" name="phone" defaultValue={record?.phone} maxLength={50} />
    <Field label="Job title" name="job_title" defaultValue={record?.job_title} maxLength={255} />
    <Field label="Lifecycle" name="lifecycle_stage" defaultValue={record?.lifecycle_stage || 'lead'} options={['lead', 'customer', 'partner', 'other']} />
    <Field label="Status" name="status" defaultValue={record?.status || 'Active'} options={['Active', 'Inactive', 'Archived']} />
    <Field label="Owner member ID (optional)" name="owner_id" type="number" defaultValue={record?.owner_id} />
    <Field label="Preferred contact" name="preferred_contact" defaultValue={record?.preferred_contact} maxLength={50} />
    <Field label="Location" name="location" defaultValue={record?.location} maxLength={255} />
    <Field label="Notes" name="notes" type="textarea" defaultValue={record?.notes} maxLength={10000} className={`${inputClass} sm:col-span-2`} />
  </>;
}

function CustomerForm({ record, contacts }: { record?: CrmCustomer; contacts: CrmContact[] }) {
  return <>
    <Field label="Company name" name="company_name" required defaultValue={record?.company_name} maxLength={255} />
    <Field label="Contact name" name="contact_name" required defaultValue={record?.contact_name} maxLength={255} />
    <Field label="Email" name="email" type="email" defaultValue={record?.email} maxLength={255} />
    <Field label="Phone" name="phone" defaultValue={record?.phone} maxLength={50} />
    <Field label="Status" name="status" defaultValue={record?.status || 'Active'} options={['Active', 'Churned', 'On Hold']} />
    <Field label="Tier" name="customer_tier" defaultValue={record?.customer_tier || 'Standard'} options={['Standard', 'Premium', 'Enterprise']} />
    <Field label="Total revenue" name="total_revenue" type="number" defaultValue={record?.total_revenue || 0} />
    <Field label="Currency" name="currency" defaultValue={record?.currency || 'USD'} maxLength={3} />
    <Field label="Linked contact" name="contact_id" defaultValue={record?.contact_id} options={contacts.map((contact) => ({ value: contact.id, label: contact.name }))} />
    <Field label="Owner member ID (optional)" name="owner_id" type="number" defaultValue={record?.owner_id} />
    <Field label="Notes" name="notes" type="textarea" defaultValue={record?.notes} maxLength={10000} className={`${inputClass} sm:col-span-2`} />
  </>;
}

function PipelineForm({ record }: { record?: CrmPipeline }) {
  return <>
    <Field label="Name" name="name" required defaultValue={record?.name} maxLength={255} />
    <Field label="Slug" name="slug" defaultValue={record?.slug} maxLength={255} />
    <Field label="Display order" name="display_order" type="number" defaultValue={record?.display_order || 1} />
    <Field label="Description" name="description" type="textarea" defaultValue={record?.description} maxLength={1000} className={`${inputClass} sm:col-span-2`} />
  </>;
}

function StageForm({ record, pipeline }: { record?: CrmStage; pipeline?: CrmPipeline }) {
  return <>
    <p className="sm:col-span-2 text-sm text-slate-500">Pipeline: {pipeline?.name || 'Selected pipeline'}</p>
    <Field label="Stage name" name="name" required defaultValue={record?.name} maxLength={255} />
    <Field label="Code" name="code" defaultValue={record?.code} maxLength={50} />
    <Field label="Color" name="color" defaultValue={record?.color} maxLength={50} />
    <Field label="Probability (0–100)" name="probability" type="number" defaultValue={record?.probability ?? 0} />
    <Field label="Display order" name="display_order" type="number" defaultValue={record?.display_order ?? (pipeline?.stages.length || 0) + 1} />
    <label className="flex items-center gap-2 text-sm"><input name="is_won" type="checkbox" defaultChecked={record?.is_won} /> Won stage</label>
    <label className="flex items-center gap-2 text-sm"><input name="is_lost" type="checkbox" defaultChecked={record?.is_lost} /> Lost stage</label>
  </>;
}

function ProfileDialog({ profile, onClose }: { profile: ProfileView; onClose: () => void }) {
  const title = profile.kind === 'contact' ? 'Contact profile' : 'Customer profile';
  return <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/40 p-4">
    <section role="dialog" aria-modal="true" aria-label={title} className="w-full max-w-lg rounded-xl bg-white p-5 shadow-xl">
      <header className="mb-4 flex items-center justify-between"><h2 className="text-lg font-semibold">{title}</h2><button aria-label="Close" className="rounded px-2 py-1 hover:bg-slate-100" onClick={onClose}>×</button></header>
      {profile.loading && <p role="status" className="text-sm text-slate-500">Loading profile…</p>}
      {profile.error && <p role="alert" className="text-sm text-red-700">{profile.error}</p>}
      {profile.kind === 'contact' && profile.record && <div className="grid grid-cols-2 gap-3 text-sm">
        <Detail label="Name" value={profile.record.name} />
        <Detail label="Company" value={profile.record.company_name} />
        <Detail label="Job title" value={profile.record.job_title} />
        <Detail label="Email" value={profile.record.email} />
        <Detail label="Phone" value={profile.record.phone} />
        <Detail label="Preferred contact" value={profile.record.preferred_contact} />
        <Detail label="Location" value={profile.record.location} />
        <Detail label="Lifecycle" value={profile.record.lifecycle_stage} />
        <Detail label="Status" value={profile.record.status} />
        <Detail label="Owner" value={profile.record.owner?.name} />
        <div className="col-span-2"><Detail label="Notes" value={profile.record.notes} /></div>
      </div>}
      {profile.kind === 'customer' && profile.record && <div className="grid grid-cols-2 gap-3 text-sm">
        <Detail label="Company" value={profile.record.company_name} />
        <Detail label="Contact" value={profile.record.contact_name} />
        <Detail label="Email" value={profile.record.email} />
        <Detail label="Phone" value={profile.record.phone} />
        <Detail label="Status" value={profile.record.status} />
        <Detail label="Tier" value={profile.record.customer_tier} />
        <Detail label="Revenue" value={`${profile.record.currency} ${profile.record.total_revenue.toLocaleString()}`} />
        <Detail label="Owner" value={profile.record.owner?.name} />
        <Detail label="Linked contact" value={profile.record.contact_id} />
        <Detail label="Converted from lead" value={profile.record.lead_id} />
        <div className="col-span-2"><Detail label="Notes" value={profile.record.notes} /></div>
      </div>}
    </section>
  </div>;
}
