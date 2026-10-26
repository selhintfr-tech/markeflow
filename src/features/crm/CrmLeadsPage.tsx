import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Activity,
  Building2,
  CalendarDays,
  ChartNoAxesColumnIncreasing,
  ChevronLeft,
  ChevronRight,
  CircleUserRound,
  ExternalLink,
  FileText,
  Mail,
  MoreHorizontal,
  Phone,
  Plus,
  RefreshCw,
  Search,
  UserRound,
  UserRoundCheck,
  UsersRound,
} from 'lucide-react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { ActionDropdown } from '../../components/ui/ActionDropdown';
import {
  crmService,
  type CrmActivity,
  type CrmContact,
  type CrmCustomer,
  type CrmLead,
  type CrmNote,
  type CrmPipeline,
  type CrmSalesCustomer,
  type CrmSalesOrder,
  type CrmStage,
  type FunnelStage,
} from './crmService';
import { DeleteSalesCustomerModal } from './components/DeleteSalesCustomerModal';

type Section = 'leads' | 'contacts' | 'customers' | 'pipeline';
type EntityForm =
  | { type: 'lead'; record?: CrmLead }
  | { type: 'contact'; record?: CrmContact }
  | { type: 'customer'; record?: CrmCustomer }
  | { type: 'salesCustomer'; record: CrmSalesCustomer }
  | { type: 'pipeline'; record?: CrmPipeline }
  | { type: 'stage'; pipelineId: string; record?: CrmStage };
type ProfileView =
  | { kind: 'contact'; loading: boolean; record?: CrmContact; error?: string }
  | { kind: 'customer'; loading: boolean; record?: CrmCustomer; error?: string }
  | { kind: 'salesCustomer'; loading: boolean; record?: CrmSalesCustomer; orders?: CrmSalesOrder[]; error?: string };

const inputClass = 'w-full rounded-lg border border-[#DCE3F0] bg-white px-3 py-2 text-sm text-[#1E1B4B] outline-none placeholder:text-[#96A1B5] focus:border-violet-500 focus:ring-2 focus:ring-violet-100';
const buttonClass = 'rounded-lg border border-[#DCE3F0] bg-white px-3 py-2 text-sm font-medium text-[#33415C] hover:bg-[#F8F7FC] disabled:cursor-not-allowed disabled:opacity-50';
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
  const [salesCustomers, setSalesCustomers] = useState<CrmSalesCustomer[]>([]);
  const [pipelines, setPipelines] = useState<CrmPipeline[]>([]);
  const [funnel, setFunnel] = useState<FunnelStage[]>([]);
  const [notes, setNotes] = useState<CrmNote[]>([]);
  const [activities, setActivities] = useState<CrmActivity[]>([]);
  const [selectedLeadId, setSelectedLeadId] = useState('');
  const [pipelineId, setPipelineId] = useState('');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [status, setStatus] = useState('');
  const [campaignFilter, setCampaignFilter] = useState('');
  const [assigneeFilter, setAssigneeFilter] = useState('');
  const [sortBy, setSortBy] = useState('recent');
  const [form, setForm] = useState<EntityForm | null>(null);
  const [profile, setProfile] = useState<ProfileView | null>(null);
  const [noteText, setNoteText] = useState('');
  const [activityForm, setActivityForm] = useState({ type: 'call', title: '', description: '', activity_date: dateTimeLocal(new Date().toISOString()) });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [detailError, setDetailError] = useState('');
  const [actionMenuLeadId, setActionMenuLeadId] = useState('');
  const [leadPage, setLeadPage] = useState(1);
  const [deleteSalesCustomerTarget, setDeleteSalesCustomerTarget] = useState<CrmSalesCustomer | null>(null);
  const [deletingSalesCustomer, setDeletingSalesCustomer] = useState(false);
  const requestId = useRef(0);
  const profileRequestId = useRef(0);
  const detailRequestId = useRef(0);
  const loadedWorkspaceId = useRef(workspaceId);

  const refresh = useCallback(async () => {
    const currentRequest = ++requestId.current;
    if (loadedWorkspaceId.current !== workspaceId) {
      loadedWorkspaceId.current = workspaceId;
      setLeads([]);
      setContacts([]);
      setCustomers([]);
      setSalesCustomers([]);
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
      const [leadResult, contactResult, customerResult, pipelineResult, funnelResult, salesCustomerResult] = await Promise.all([
        section === 'leads'
          ? crmService.leads(workspaceId, {
            search: debouncedSearch || undefined,
            status: status || undefined,
            source_campaign_id: campaignFilter || undefined,
            owner_id: assigneeFilter || undefined,
            sort_by: sortBy,
          })
          : section === 'pipeline'
            ? crmService.leads(workspaceId, { sort_by: 'recent' })
            : Promise.resolve(null),
        section === 'contacts'
          ? crmService.contacts(workspaceId, { search: debouncedSearch || undefined })
          : Promise.resolve(null),
        section === 'leads' || section === 'customers'
          ? crmService.customers(workspaceId, { search: section === 'customers' ? debouncedSearch || undefined : undefined })
          : Promise.resolve(null),
        section === 'leads' || section === 'pipeline' ? crmService.pipelines(workspaceId) : Promise.resolve(null),
        section === 'leads' ? crmService.funnel(workspaceId) : Promise.resolve(null),
        section === 'customers' ? crmService.salesCustomers(workspaceId) : Promise.resolve<CrmSalesCustomer[]>([]),
      ]);
      if (currentRequest !== requestId.current) return;
      if (leadResult) setLeads(leadResult.data);
      if (contactResult) setContacts(contactResult.data);
      if (customerResult) setCustomers(customerResult.data);
      if (section === 'customers') setSalesCustomers(salesCustomerResult);
      if (pipelineResult) setPipelines(pipelineResult);
      if (funnelResult) setFunnel(funnelResult);
      if (leadResult) setSelectedLeadId((selected) => leadResult.data.some((lead) => lead.id === selected) ? selected : leadResult.data[0]?.id || '');
      if (pipelineResult) setPipelineId((selected) => pipelineResult.some((pipeline) => pipeline.id === selected)
        ? selected
        : pipelineResult.find((pipeline) => pipeline.is_default)?.id || pipelineResult[0]?.id || '');
    } catch (cause) {
      if (currentRequest === requestId.current) setError(cause instanceof Error ? cause.message : 'Unable to load CRM records.');
    } finally {
      if (currentRequest === requestId.current) setLoading(false);
    }
  }, [workspaceId, debouncedSearch, status, campaignFilter, assigneeFilter, sortBy, section]);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search.trim()), 250);
    return () => window.clearTimeout(timer);
  }, [search]);

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
    const currentRequest = ++detailRequestId.current;
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
      if (currentRequest !== detailRequestId.current) return;
      setNotes(nextNotes);
      setActivities(nextActivities);
    } catch (cause) {
      if (currentRequest === detailRequestId.current) {
        setDetailError(cause instanceof Error ? cause.message : 'Unable to load lead history.');
      }
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

  const openProfile = async (kind: 'contact' | 'customer', id: string) => {
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

  const openSalesCustomer = async (customer: CrmSalesCustomer) => {
    if (!workspaceId) return;
    const currentRequest = ++profileRequestId.current;
    setProfile({ kind: 'salesCustomer', loading: true });
    try {
      const orders = await crmService.salesOrdersForCustomer(workspaceId, customer);
      if (currentRequest !== profileRequestId.current) return;
      setProfile({ kind: 'salesCustomer', loading: false, record: customer, orders });
    } catch (cause) {
      if (currentRequest !== profileRequestId.current) return;
      setProfile({
        kind: 'salesCustomer',
        loading: false,
        record: customer,
        error: cause instanceof Error ? cause.message : 'Unable to load related orders.',
      });
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
    } else if (form.type === 'salesCustomer') {
      const payload = {
        first_name: text('first_name'),
        last_name: optional('last_name'),
        email: optional('email'),
        phone: optional('phone'),
        address: optional('address'),
      };
      void save(async () => {
        await crmService.updateSalesCustomer(workspaceId, form.record.id, payload);
        if (profile?.kind === 'salesCustomer' && profile.record?.id === form.record.id) {
          setProfile((prev) => prev && prev.kind === 'salesCustomer' && prev.record ? {
            ...prev,
            record: { ...prev.record, ...payload },
          } : prev);
        }
      });
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

  const handleConfirmDeleteSalesCustomer = async (target: CrmSalesCustomer) => {
    if (!workspaceId) return;
    setDeletingSalesCustomer(true);
    setError('');
    try {
      await crmService.deleteSalesCustomer(workspaceId, target.id);
      setDeleteSalesCustomerTarget(null);
      if (profile?.kind === 'salesCustomer' && profile.record?.id === target.id) {
        setProfile(null);
      }
      await refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to delete sales customer.');
      setDeleteSalesCustomerTarget(null);
    } finally {
      setDeletingSalesCustomer(false);
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

  const openLeadCount = funnel
    .filter((stage) => ['New', 'Contacted', 'Qualified'].includes(stage.status))
    .reduce((sum, stage) => sum + stage.count, 0);
  const convertedCustomerCount = customers.filter((customer) => Boolean(customer.lead_id)).length;
  const conversionDenominator = openLeadCount + convertedCustomerCount;
  const conversionRate = conversionDenominator
    ? `${((convertedCustomerCount / conversionDenominator) * 100).toFixed(1)}%`
    : '0%';
  const campaignOptions = Array.from(new Map(leads
    .filter((lead) => lead.source_campaign_id && lead.sourceCampaign)
    .map((lead) => [lead.source_campaign_id as string, { id: lead.source_campaign_id as string, name: lead.sourceCampaign as string }])).values());
  const assigneeOptions = Array.from(new Map(leads
    .filter((lead) => lead.assignedTo)
    .map((lead) => [String(lead.assignedTo!.id), lead.assignedTo!])).values());
  const pageSize = 5;
  const totalLeadPages = Math.max(1, Math.ceil(leads.length / pageSize));
  const visibleLeads = leads.slice((leadPage - 1) * pageSize, leadPage * pageSize);

  return (
    <main className="mx-auto max-w-[1500px] space-y-3 bg-[#F7F8FC] p-4 text-[#172554] sm:p-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-medium text-[#64748B]">Customers <span className="px-1 text-[#C7D0E0]">/</span> CRM &amp; Leads</p>
          <h1 className="mt-1 text-[26px] font-extrabold tracking-tight text-[#111B44]">CRM &amp; Leads</h1>
          <p className="mt-0.5 text-xs text-[#64748B]">Manage contacts, track lead status and monitor customer conversion.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button className={buttonClass} onClick={() => void refresh()} disabled={loading}><RefreshCw className={`mr-1.5 inline h-4 w-4 ${loading ? 'animate-spin' : ''}`} />{loading ? 'Refreshing…' : 'Refresh'}</button>
          {section === 'leads' && <button className={primaryClass} onClick={() => setForm({ type: 'lead' })}><Plus className="mr-1.5 inline h-4 w-4" />Add lead</button>}
          {section === 'contacts' && <button className={primaryClass} onClick={() => setForm({ type: 'contact' })}><Plus className="mr-1.5 inline h-4 w-4" />Add contact</button>}
          {section === 'customers' && <button className={primaryClass} onClick={() => setForm({ type: 'customer' })}><Plus className="mr-1.5 inline h-4 w-4" />Add customer</button>}
          {section === 'pipeline' && <button className={primaryClass} onClick={() => setForm({ type: 'pipeline' })}><Plus className="mr-1.5 inline h-4 w-4" />New pipeline</button>}
        </div>
      </header>

      {error && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</div>}

      <nav className="flex flex-wrap gap-1 border-b border-[#D5DCE8]">
        {([['leads', 'Leads'], ['contacts', 'Contacts'], ['customers', 'Customers'], ['pipeline', 'Sales pipeline']] as const).map(([key, label]) =>
          <button key={key} onClick={() => { setSection(key); setSearch(''); setDebouncedSearch(''); }} className={`relative rounded-t-lg px-4 py-2 text-xs font-semibold transition-colors ${section === key ? 'bg-[#EEE9FF] text-[#6D28D9] after:absolute after:inset-x-0 after:-bottom-px after:h-0.5 after:bg-[#6D28D9]' : 'text-[#53617C] hover:bg-[#F0F2F8]'}`}>{label}</button>
        )}
      </nav>

      {section === 'leads' && <>
        <section className="grid gap-3 md:grid-cols-3">
          <Metric label="Open leads" value={openLeadCount} icon={<UsersRound className="h-5 w-5" />} accent="violet" detail="New, contacted and qualified" />
          <Metric label="Converted customers" value={convertedCustomerCount} icon={<UserRoundCheck className="h-5 w-5" />} accent="teal" detail="Converted from CRM leads" />
          <Metric label="Lead-to-customer conversion" value={conversionRate} icon={<ChartNoAxesColumnIncreasing className="h-5 w-5" />} accent="blue" detail="From open and converted leads" />
        </section>
        <section aria-label="Lead funnel" className="rounded-xl border border-[#E1E6F0] bg-white px-4 py-3 shadow-[0_2px_8px_rgba(35,52,95,0.03)]">
          <div className="mb-2 flex items-center justify-between gap-2">
            <h2 className="text-sm font-bold text-[#172554]">Lead Funnel</h2>
            <span className="text-[10px] text-[#7A86A0]">Based on CRM lead records <span aria-label="Counts are from the active workspace">ⓘ</span></span>
          </div>
          <div className="grid grid-cols-4">
            {funnel.map((stage, index) => {
              const styles: Record<string, { bar: string; marker: string }> = {
                New: { bar: 'from-[#D9C9FF] to-[#C4A7FF]', marker: 'bg-[#852BFA]' },
                Contacted: { bar: 'from-[#C2D8FF] to-[#9BBEFF]', marker: 'bg-[#287CF5]' },
                Qualified: { bar: 'from-[#FFE5A8] to-[#FFD789]', marker: 'bg-[#E5A000]' },
                Converted: { bar: 'from-[#B9F0DF] to-[#8BE1CF]', marker: 'bg-[#0FA68C]' },
              };
              const style = styles[stage.status] || styles.New;
              return <div key={stage.status} className="min-w-0 text-center">
                <div className={`relative h-4 bg-gradient-to-r ${style.bar} ${index === 0 ? 'rounded-l-md' : ''} ${index === funnel.length - 1 ? 'rounded-r-md' : ''}`}
                  style={{ clipPath: index === funnel.length - 1 ? 'polygon(0 0,100% 0,100% 100%,0 100%,6% 50%)' : index === 0 ? 'polygon(0 0,94% 0,100% 50%,94% 100%,0 100%)' : 'polygon(0 0,94% 0,100% 50%,94% 100%,0 100%,6% 50%)' }}>
                  <span className={`absolute left-1/2 top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white ${style.marker}`} />
                </div>
                <div className="mt-1.5 text-[10px] font-medium text-[#273556]">{stage.label.replace(/ Leads?$/, '')}</div>
                <div className="text-xs font-bold text-[#172554]">{stage.count}</div>
              </div>;
            })}
            {funnel.length === 0 && <p className="col-span-4 py-4 text-center text-xs text-[#8490A8]">Lead funnel data is unavailable.</p>}
          </div>
        </section>
        <section className="grid items-start gap-2 xl:grid-cols-[minmax(0,1fr)_280px]">
          <div className="min-w-0 rounded-xl border border-[#E1E6F0] bg-white p-3 shadow-[0_2px_8px_rgba(35,52,95,0.03)]">
            <header className="mb-2 flex items-center justify-between">
              <div><h2 className="text-sm font-bold text-[#172554]">Leads &amp; Contacts</h2><p className="text-[10px] text-[#8792A8]">Workspace CRM records</p></div>
              <span className="text-[10px] text-[#7A86A0]">{leads.length} records</span>
            </header>
            <div className="mb-2 grid gap-1.5 sm:grid-cols-2 lg:grid-cols-[minmax(140px,1.5fr)_minmax(80px,.65fr)_minmax(90px,.8fr)_minmax(85px,.75fr)_minmax(100px,.9fr)]">
              <label className="relative">
                <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#74819C]" />
                <input aria-label="Search leads" className={`${inputClass} h-8 py-1 pl-7 text-[10px]`} placeholder="Search leads, companies, or emails…" value={search} onChange={(event) => { setSearch(event.target.value); setLeadPage(1); }} />
              </label>
              <select aria-label="Filter leads by status" className={`${inputClass} h-8 px-2 py-1 text-[10px]`} value={status} onChange={(event) => { setStatus(event.target.value); setLeadPage(1); }}>
                <option value="">Status: All</option>{leadStatuses.map((value) => <option key={value}>{value}</option>)}
              </select>
              <select aria-label="Filter leads by campaign" className={`${inputClass} h-8 px-2 py-1 text-[10px]`} value={campaignFilter} onChange={(event) => { setCampaignFilter(event.target.value); setLeadPage(1); }}>
                <option value="">Campaign: All</option>{campaignOptions.map((campaign) => <option key={campaign.id} value={campaign.id}>{campaign.name}</option>)}
              </select>
              <select aria-label="Filter leads by assignee" className={`${inputClass} h-8 px-2 py-1 text-[10px]`} value={assigneeFilter} onChange={(event) => { setAssigneeFilter(event.target.value); setLeadPage(1); }}>
                <option value="">Assignee: All</option>{assigneeOptions.map((owner) => <option key={owner.id} value={owner.id}>{owner.name}</option>)}
              </select>
              <select aria-label="Sort leads" className={`${inputClass} h-8 px-2 py-1 text-[10px]`} value={sortBy} onChange={(event) => { setSortBy(event.target.value); setLeadPage(1); }}>
                <option value="recent">Sort by: Recent</option><option value="oldest">Sort by: Oldest</option><option value="name">Sort by: Name</option><option value="company">Sort by: Company</option>
              </select>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[730px] table-fixed text-left text-[10px] text-[#293653]">
                <thead className="border-y border-[#E9EDF4] bg-[#F9FAFD] text-[9px] font-semibold text-[#707C96]">
                  <tr><th className="w-7 px-1 py-2"><span className="sr-only">Select</span></th><th className="w-[16%] px-1 py-2">Name</th><th className="w-[13%] px-1 py-2">Company</th><th className="w-[17%] px-1 py-2">Email</th><th className="w-[12%] px-1 py-2">Phone</th><th className="w-[13%] px-1 py-2">Source Campaign</th><th className="w-[11%] px-1 py-2">Lead Status</th><th className="w-[12%] px-1 py-2">Assigned To</th><th className="w-[10%] px-1 py-2">Created</th><th className="w-7 px-1 py-2"><span className="sr-only">Actions</span></th></tr>
                </thead>
                <tbody className="divide-y divide-[#EEF1F6]">
                  {loading && leads.length === 0 && Array.from({ length: 4 }, (_, row) => <tr key={`loading-${row}`} aria-hidden="true">{Array.from({ length: 10 }, (_, column) => <td key={column} className="px-1 py-3"><div className="h-3 animate-pulse rounded bg-slate-100" /></td>)}</tr>)}
                  {!loading && leads.length === 0 && <tr><td colSpan={10} className="p-1.5"><div className="rounded-lg border border-dashed border-[#CCD6E5] bg-[#FBFCFE] px-3 py-5 text-center">
                    <UsersRound className="mx-auto mb-1 h-5 w-5 text-[#A6B2C7]" /><p className="text-xs font-semibold text-[#42516E]">{search || status || campaignFilter || assigneeFilter ? 'No leads match these filters.' : 'No leads found.'}</p>
                    <p className="mt-0.5 text-[10px] text-[#8994A9]">{search || status || campaignFilter || assigneeFilter ? 'Adjust your filters or search to see more records.' : 'Create your first lead to start tracking customer conversion.'}</p>
                    {!search && !status && !campaignFilter && !assigneeFilter && <button type="button" className="mt-2 text-[10px] font-semibold text-[#6D28D9] hover:underline" onClick={() => setForm({ type: 'lead' })}>Add your first lead</button>}
                  </div></td></tr>}
                  {visibleLeads.map((lead) => <tr key={lead.id} onClick={() => setSelectedLeadId(lead.id)} className={`cursor-pointer transition-colors hover:bg-[#F7F5FF] ${selectedLeadId === lead.id ? 'bg-[#F0ECFF]' : ''}`}>
                    <td className="px-1 py-2"><input aria-label={`Select ${lead.name}`} type="checkbox" checked={selectedLeadId === lead.id} onChange={() => setSelectedLeadId(lead.id)} onClick={(event) => event.stopPropagation()} className="h-3 w-3 rounded border-[#BCC7D9] accent-violet-600" /></td>
                    <td className="truncate px-1 py-2 font-semibold text-[#202D51]" title={lead.name}>{lead.name}</td><td className="truncate px-1 py-2" title={lead.company}>{lead.company || '—'}</td>
                    <td className="truncate px-1 py-2 text-[#52617D]" title={lead.email}>{lead.email || '—'}</td><td className="truncate px-1 py-2 text-[#52617D]" title={lead.phone}>{lead.phone || '—'}</td>
                    <td className="truncate px-1 py-2 text-[#52617D]" title={lead.sourceCampaign || ''}>{lead.sourceCampaign || '—'}</td>
                    <td className="px-1 py-2"><StatusPill status={lead.status} /></td>
                    <td className="px-1 py-2"><div className="flex min-w-0 items-center gap-1"><span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#E9E3FF] text-[8px] font-bold text-[#6D28D9]">{lead.assignedTo?.initials || '—'}</span><span className="truncate">{lead.assignedTo?.name || 'Unassigned'}</span></div></td>
                    <td className="whitespace-nowrap px-1 py-2 text-[#64748B]">{lead.created_at ? new Date(lead.created_at).toLocaleDateString(undefined, { day: '2-digit', month: 'short' }) : '—'}</td>
                    <td className="px-1 py-2 text-right" onClick={(event) => event.stopPropagation()}>
                      <ActionDropdown
                        isOpen={actionMenuLeadId === lead.id}
                        onClose={() => setActionMenuLeadId('')}
                        ariaLabel={`Actions for ${lead.name}`}
                        menuWidth={140}
                        className="min-w-32 py-1 text-left text-[10px]"
                        trigger={
                          <button
                            type="button"
                            aria-label={`Actions for ${lead.name}`}
                            className="rounded p-1 text-[#6D28D9] hover:bg-[#E9E3FF] cursor-pointer"
                            onClick={() => setActionMenuLeadId(actionMenuLeadId === lead.id ? '' : lead.id)}
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </button>
                        }
                      >
                        <button
                          type="button"
                          className="block w-full rounded px-2.5 py-1.5 text-left text-[10px] text-[#1E1B4B] hover:bg-[#F5F3FF] cursor-pointer"
                          onClick={() => {
                            setForm({ type: 'lead', record: lead });
                            setActionMenuLeadId('');
                          }}
                        >
                          Edit lead
                        </button>
                        {lead.status !== 'Converted' && (
                          <button
                            type="button"
                            className="block w-full rounded px-2.5 py-1.5 text-left text-[10px] text-[#1E1B4B] hover:bg-[#F5F3FF] cursor-pointer"
                            onClick={() => {
                              setActionMenuLeadId('');
                              void convertLead(lead);
                            }}
                          >
                            Convert to customer
                          </button>
                        )}
                        <button
                          type="button"
                          className="block w-full rounded px-2.5 py-1.5 text-left text-[10px] text-red-700 hover:bg-red-50 cursor-pointer"
                          onClick={() => {
                            setActionMenuLeadId('');
                            void remove('lead', () => crmService.deleteLead(workspaceId, lead.id));
                          }}
                        >
                          Delete lead
                        </button>
                      </ActionDropdown>
                    </td>
                  </tr>)}
                </tbody>
              </table>
            </div>
            <footer className="mt-2 flex items-center justify-between border-t border-[#EDF0F5] pt-2 text-[9px] text-[#74819C]">
              <span>{leads.length ? `Showing ${(leadPage - 1) * pageSize + 1}-${Math.min(leadPage * pageSize, leads.length)} of ${leads.length} leads` : 'Showing 0 leads'}</span>
              <div className="flex items-center gap-1">
                <button type="button" aria-label="Previous leads page" className="rounded border border-[#DCE3F0] p-1 disabled:opacity-40" onClick={() => setLeadPage((page) => Math.max(1, page - 1))} disabled={leadPage <= 1}><ChevronLeft className="h-3 w-3" /></button>
                <span className="min-w-5 rounded border border-[#7C3AED] px-1.5 py-1 text-center font-semibold text-[#6D28D9]">{leadPage}</span>
                <button type="button" aria-label="Next leads page" className="rounded border border-[#DCE3F0] p-1 disabled:opacity-40" onClick={() => setLeadPage((page) => Math.min(totalLeadPages, page + 1))} disabled={leadPage >= totalLeadPages}><ChevronRight className="h-3 w-3" /></button>
              </div>
            </footer>
          </div>
          {selectedLead ? <LeadDetails
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
          /> : <aside className="flex min-h-48 flex-col items-center justify-center rounded-xl border border-[#E1E6F0] bg-white p-5 text-center">
            <CircleUserRound className="mb-2 h-8 w-8 text-[#A7B2C7]" /><p className="text-xs font-semibold text-[#42516E]">Lead details</p><p className="mt-1 text-[10px] text-[#8792A8]">Select a lead to view contact details, notes and activity.</p>
          </aside>}
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

      {section === 'customers' && <section className="space-y-4 rounded-xl border border-[#E1E6F0] bg-white p-4 shadow-[0_2px_8px_rgba(35,52,95,0.03)]">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div><h2 className="text-sm font-bold text-[#172554]">Customers</h2><p className="text-[10px] text-[#8792A8]">CRM customers and customers with Sales orders are shown separately.</p></div>
          <input aria-label="Search customers" className={`${inputClass} max-w-sm text-xs`} placeholder="Search customers…" value={search} onChange={(event) => setSearch(event.target.value)} />
        </header>
        <div>
          <h3 className="mb-2 text-xs font-semibold text-[#344260]">CRM Customers</h3>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-xs text-[#293653]">
              <thead className="border-y border-[#E9EDF4] bg-[#F9FAFD] text-[10px] text-[#707C96]"><tr><th className="py-2">Customer</th><th>Contact</th><th>Tier</th><th>Status</th><th>Revenue</th><th>Owner</th><th /></tr></thead>
              <tbody className="divide-y divide-[#EEF1F6]">{customers.map((customer) => <tr key={customer.id}>
                <td className="py-2"><button className="text-left font-semibold hover:text-violet-700" onClick={() => void openProfile('customer', customer.id)}>{customer.company_name}</button></td>
                <td>{customer.contact_name}<span className="block text-[10px] text-slate-500">{customer.email || 'No email'}</span></td>
                <td>{customer.customer_tier}</td><td><StatusPill status={customer.status} /></td>
                <td>{customer.currency} {customer.total_revenue.toLocaleString()}</td><td>{customer.owner?.name || '—'}</td>
                <td className="whitespace-nowrap text-right"><button className="mr-3 text-violet-700 hover:underline" onClick={() => setForm({ type: 'customer', record: customer })}>Edit</button><button className="text-red-700 hover:underline" onClick={() => void remove('customer', () => crmService.deleteCustomer(workspaceId, customer.id))}>Delete</button></td>
              </tr>)}
              {!customers.length && <tr><td colSpan={7} className="py-4 text-center text-xs text-[#8994A9]">{loading ? 'Loading CRM customers…' : 'No CRM customers found. Convert a lead or add a customer.'}</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
        <div>
          <h3 className="mb-2 text-xs font-semibold text-[#344260]">Sales Customers <span className="ml-1 rounded bg-[#EEF2FF] px-1.5 py-0.5 text-[9px] font-medium text-[#596A9A]">Sales orders & customer records</span></h3>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[650px] text-left text-xs text-[#293653]">
              <thead className="border-y border-[#E9EDF4] bg-[#F9FAFD] text-[10px] text-[#707C96]"><tr><th className="py-2">Customer</th><th>Email</th><th>Phone</th><th>Address</th><th>Orders</th><th className="text-right">Actions</th></tr></thead>
              <tbody className="divide-y divide-[#EEF1F6]">
                {salesCustomers.filter((customer) => `${customer.first_name} ${customer.last_name || ''} ${customer.email || ''} ${customer.phone || ''}`.toLowerCase().includes(search.trim().toLowerCase())).map((customer) => <tr key={customer.id}>
                  <td className="py-2 font-medium">{customer.first_name} {customer.last_name}</td>
                  <td>{customer.email || '—'}</td>
                  <td>{customer.phone || '—'}</td>
                  <td className="max-w-[200px] truncate" title={customer.address || undefined}>{customer.address || '—'}</td>
                  <td>
                    <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium ${customer.orders_count ? 'bg-violet-50 text-violet-700' : 'bg-slate-100 text-slate-500'}`}>
                      {customer.orders_count ?? 0} {customer.orders_count === 1 ? 'order' : 'orders'}
                    </span>
                  </td>
                  <td className="whitespace-nowrap text-right">
                    <button className="mr-3 text-slate-600 hover:text-slate-900 hover:underline" onClick={() => void openSalesCustomer(customer)}>View</button>
                    <button className="mr-3 text-violet-700 hover:underline" onClick={() => setForm({ type: 'salesCustomer', record: customer })}>Edit</button>
                    <button className="text-red-700 hover:underline" onClick={() => setDeleteSalesCustomerTarget(customer)}>Delete</button>
                  </td>
                </tr>)}
                {!salesCustomers.filter((customer) => `${customer.first_name} ${customer.last_name || ''} ${customer.email || ''} ${customer.phone || ''}`.toLowerCase().includes(search.trim().toLowerCase())).length && <tr><td colSpan={6} className="py-4 text-center text-xs text-[#8994A9]">{loading ? 'Loading Sales customers…' : 'No Sales customers found.'}</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </section>}

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
      {profile && (
        <ProfileDialog
          profile={profile}
          onClose={() => setProfile(null)}
          onEditSalesCustomer={(customer) => setForm({ type: 'salesCustomer', record: customer })}
          onDeleteSalesCustomer={(customer) => setDeleteSalesCustomerTarget(customer)}
        />
      )}
      <DeleteSalesCustomerModal
        isOpen={Boolean(deleteSalesCustomerTarget)}
        customer={deleteSalesCustomerTarget}
        deleting={deletingSalesCustomer}
        onClose={() => setDeleteSalesCustomerTarget(null)}
        onConfirmDelete={handleConfirmDeleteSalesCustomer}
      />
    </main>
  );
};

function Metric({ label, value, icon, accent, detail }: { label: string; value: string | number; icon: React.ReactNode; accent: 'violet' | 'teal' | 'blue'; detail: string }) {
  const accents = {
    violet: 'bg-[#F0EAFE] text-[#7C3AED]',
    teal: 'bg-[#E5F8F3] text-[#0F9A82]',
    blue: 'bg-[#E9F1FF] text-[#3278D8]',
  };
  return <article className="flex min-h-[92px] items-center justify-between rounded-xl border border-[#E1E6F0] bg-white px-4 py-3 shadow-[0_2px_8px_rgba(35,52,95,0.03)]">
    <div><p className="text-[10px] font-medium text-[#77839A]">{label}</p><p className="mt-1 text-[23px] font-extrabold leading-none tracking-tight text-[#172554]">{value}</p><p className="mt-1.5 text-[9px] text-[#909BB0]">{detail}</p></div>
    <span className={`grid h-10 w-10 place-items-center rounded-xl ${accents[accent]}`}>{icon}</span>
  </article>;
}

function StatusPill({ status }: { status: string }) {
  const normalized = status.toLowerCase();
  const style = normalized === 'converted' || normalized === 'active'
    ? 'bg-[#E5F8F3] text-[#07866F]'
    : normalized === 'qualified'
      ? 'bg-[#FFF4D9] text-[#A66A00]'
      : normalized === 'contacted'
        ? 'bg-[#E9F1FF] text-[#2D69BF]'
        : normalized === 'lost' || normalized === 'inactive'
          ? 'bg-[#FDECEC] text-[#B83D4B]'
          : 'bg-[#F0EAFE] text-[#7041C8]';
  return <span className={`inline-flex whitespace-nowrap rounded-full px-2 py-0.5 text-[9px] font-semibold ${style}`}>{status}</span>;
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
  return <aside className="max-h-[75vh] space-y-3 overflow-y-auto rounded-xl border border-[#E1E6F0] bg-white p-3 shadow-[0_2px_8px_rgba(35,52,95,0.03)]">
    <header className="flex items-start justify-between gap-2 border-b border-[#EDF0F5] pb-3">
      <div className="flex min-w-0 items-center gap-2">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#EEE9FF] text-sm font-bold text-[#6D28D9]">{lead.name.split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase()}</span>
        <div className="min-w-0"><h2 className="truncate text-sm font-bold text-[#172554]">{lead.name}</h2><p className="truncate text-[10px] text-[#77839A]">{lead.company || 'No company'}</p><div className="mt-1"><StatusPill status={lead.status} /></div></div>
      </div>
      <button className="rounded-md border border-[#E2D8FF] px-2 py-1 text-[10px] font-semibold text-[#6D28D9] hover:bg-[#F5F2FF]" onClick={onEdit}>Edit Lead</button>
    </header>
    <section className="space-y-2">
      <h3 className="text-[10px] font-bold uppercase tracking-wide text-[#74819C]">Contact Information</h3>
      <div className="space-y-2 text-[10px] text-[#42516E]">
        <p className="flex min-w-0 items-center gap-2"><Mail className="h-3.5 w-3.5 shrink-0 text-[#8B6AD9]" /><span className="truncate">{lead.email || 'No email'}</span></p>
        <p className="flex min-w-0 items-center gap-2"><Phone className="h-3.5 w-3.5 shrink-0 text-[#8B6AD9]" /><span>{lead.phone || 'No phone'}</span></p>
        <p className="flex min-w-0 items-center gap-2"><Building2 className="h-3.5 w-3.5 shrink-0 text-[#8B6AD9]" /><span className="truncate">{lead.company || 'No company'}</span></p>
        <p className="flex min-w-0 items-center gap-2"><UserRound className="h-3.5 w-3.5 shrink-0 text-[#8B6AD9]" /><span>{lead.assignedTo?.name || 'Unassigned'}</span></p>
      </div>
    </section>
    <section className="grid grid-cols-2 gap-2 rounded-lg bg-[#F8F9FC] p-2 text-[10px]">
      <Detail label="Lead source" value={lead.source} />
      <Detail label="Pipeline stage" value={lead.stage?.name || lead.status} />
      <Detail label="Estimated value" value={lead.estimated_value === null ? null : `${lead.currency} ${lead.estimated_value.toLocaleString()}`} />
      <Detail label="Follow-up" value={lead.next_follow_up_at ? new Date(lead.next_follow_up_at).toLocaleDateString() : null} />
    </section>
    <section className="space-y-1 text-[10px]">
      <h3 className="text-[10px] font-bold uppercase tracking-wide text-[#74819C]">Linked records</h3>
      {lead.sourceCampaign && <p className="flex items-center gap-1.5 text-[#566582]"><ExternalLink className="h-3 w-3 text-[#8B6AD9]" />{lead.source_campaign_id
        ? <Link className="truncate text-[#6D28D9] hover:underline" to={`/campaigns/${lead.source_campaign_id}`}>{lead.sourceCampaign}</Link>
        : <span className="truncate">{lead.sourceCampaign}</span>}</p>}
      {lead.relatedProject && <p className="flex items-center gap-1.5 text-[#566582]"><ExternalLink className="h-3 w-3 text-[#8B6AD9]" />{lead.related_project_id
        ? <Link className="truncate text-[#6D28D9] hover:underline" to={`/projects/${lead.related_project_id}`}>{lead.relatedProject}</Link>
        : <span className="truncate">{lead.relatedProject}</span>}</p>}
      {!lead.sourceCampaign && !lead.relatedProject && <p className="text-[#98A2B4]">No campaign or project linked.</p>}
    </section>
    {lead.internalNotes && <p className="flex gap-2 whitespace-pre-wrap rounded-lg bg-[#F8F9FC] p-2 text-[10px] text-[#52617D]"><FileText className="mt-0.5 h-3 w-3 shrink-0 text-[#8B6AD9]" />{lead.internalNotes}</p>}
    {detailError && <p role="alert" className="text-sm text-red-700">{detailError}</p>}
    <section><h3 className="mb-2 text-[10px] font-bold uppercase tracking-wide text-[#74819C]">Notes</h3>
      {notes.map((note) => <article key={note.id} className="mb-2 rounded-lg border border-[#F0E8D8] bg-[#FFFCF5] p-2 text-[10px]"><p className="whitespace-pre-wrap text-[#42516E]">{note.content}</p><p className="mt-1 text-[9px] text-slate-500">{note.user?.name || 'Team member'} · {new Date(note.created_at).toLocaleDateString()}</p><div className="mt-2 flex gap-3"><button className="text-[9px] font-semibold text-violet-700" onClick={() => { const content = window.prompt('Edit note', note.content); if (content?.trim()) onUpdateNote(note, content.trim()); }}>Edit</button><button className="text-[9px] text-red-700" onClick={() => onDeleteNote(note)}>Delete</button></div></article>)}
      <form onSubmit={onCreateNote} className="space-y-1.5"><textarea aria-label="New note" required maxLength={10000} value={noteText} onChange={(event) => setNoteText(event.target.value)} className={`${inputClass} text-[10px]`} placeholder="Write a note…" /><button className={`${buttonClass} px-2 py-1 text-[10px]`}>Add note</button></form>
    </section>
    <section><h3 className="mb-2 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-[#74819C]"><Activity className="h-3 w-3" />Activity Timeline</h3>
      {!activities.length && <p className="mb-2 text-[10px] text-slate-500">No activities recorded.</p>}
      <div className="space-y-2">{activities.map((activity) => <article key={activity.id} className="rounded-lg border border-[#E9EDF4] p-2 text-[10px]"><div className="flex justify-between gap-2"><strong className="text-[#344260]">{activity.title}</strong><span className="shrink-0 text-[9px] text-slate-500">{new Date(activity.activity_date).toLocaleString()}</span></div><p className="text-[9px] capitalize text-violet-700">{activity.type.replace('_', ' ')}{activity.user?.name ? ` · ${activity.user.name}` : ''}</p>{activity.description && <p className="mt-1 text-[#52617D]">{activity.description}</p>}{!['create', 'conversion', 'status_change'].includes(activity.type) && <button className="mt-1 text-[9px] text-red-700" onClick={() => onDeleteActivity(activity)}>Delete</button>}</article>)}</div>
      <form onSubmit={onSubmitActivity} className="mt-2 space-y-1.5 rounded-lg bg-[#F8F9FC] p-2">
        <h4 className="text-[10px] font-semibold text-[#344260]">Record activity</h4>
        <select aria-label="Activity type" className={`${inputClass} text-[10px]`} value={activityForm.type} onChange={(event) => setActivityForm({ ...activityForm, type: event.target.value })}>{activityTypes.map((type) => <option key={type}>{type}</option>)}</select>
        <input aria-label="Activity title" required maxLength={255} className={`${inputClass} text-[10px]`} placeholder="Title" value={activityForm.title} onChange={(event) => setActivityForm({ ...activityForm, title: event.target.value })} />
        <textarea aria-label="Activity description" maxLength={5000} className={`${inputClass} text-[10px]`} placeholder="Description" value={activityForm.description} onChange={(event) => setActivityForm({ ...activityForm, description: event.target.value })} />
        <label className="flex items-center gap-1 text-[9px] text-[#74819C]"><CalendarDays className="h-3 w-3" /><input aria-label="Activity date" type="datetime-local" className={`${inputClass} text-[10px]`} value={activityForm.activity_date} onChange={(event) => setActivityForm({ ...activityForm, activity_date: event.target.value })} /></label>
        <button className={`${buttonClass} px-2 py-1 text-[10px]`}>Save activity</button>
      </form>
    </section>
    {currentPipeline && <p className="text-[9px] text-slate-500">Pipeline: {currentPipeline.name}</p>}
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
  const title = form.type === 'stage'
    ? (form.record ? 'Edit stage' : 'Add stage')
    : form.type === 'salesCustomer'
      ? 'Edit sales customer'
      : `${form.record ? 'Edit' : 'Create'} ${form.type}`;
  const pipeline = form.type === 'stage' ? pipelines.find((item) => item.id === form.pipelineId) : undefined;
  return <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/40 p-4">
    <section role="dialog" aria-modal="true" aria-label={title} className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-xl bg-white p-5 shadow-xl">
      <header className="mb-4 flex items-center justify-between"><h2 className="text-lg font-semibold">{title}</h2><button aria-label="Close" className="rounded px-2 py-1 hover:bg-slate-100" onClick={onClose}>×</button></header>
      <form onSubmit={onSubmit} className="grid gap-3 sm:grid-cols-2">
        {form.type === 'lead' && <LeadForm record={form.record} pipelines={pipelines} />}
        {form.type === 'contact' && <ContactForm record={form.record} />}
        {form.type === 'customer' && <CustomerForm record={form.record} contacts={contacts} />}
        {form.type === 'salesCustomer' && <SalesCustomerForm record={form.record} />}
        {form.type === 'pipeline' && <PipelineForm record={form.record} />}
        {form.type === 'stage' && <StageForm record={form.record} pipeline={pipeline} />}
        <div className="col-span-full flex justify-end gap-2 pt-2"><button type="button" className={buttonClass} onClick={onClose}>Cancel</button><button disabled={saving} className={primaryClass}>{saving ? 'Saving…' : 'Save'}</button></div>
      </form>
    </section>
  </div>;
}

function SalesCustomerForm({ record }: { record: CrmSalesCustomer }) {
  return <>
    <Field label="First name" name="first_name" required defaultValue={record.first_name} maxLength={255} />
    <Field label="Last name" name="last_name" defaultValue={record.last_name} maxLength={255} />
    <Field label="Phone" name="phone" defaultValue={record.phone} maxLength={50} />
    <Field label="Email" name="email" type="email" defaultValue={record.email} maxLength={255} />
    <Field label="Address" name="address" type="textarea" defaultValue={record.address} maxLength={500} className={`${inputClass} sm:col-span-2`} />
  </>;
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

function ProfileDialog({
  profile,
  onClose,
  onEditSalesCustomer,
  onDeleteSalesCustomer,
}: {
  profile: ProfileView;
  onClose: () => void;
  onEditSalesCustomer?: (customer: CrmSalesCustomer) => void;
  onDeleteSalesCustomer?: (customer: CrmSalesCustomer) => void;
}) {
  const title = profile.kind === 'contact' ? 'Contact profile' : profile.kind === 'salesCustomer' ? 'Sales customer profile' : 'Customer profile';
  return <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/40 p-4">
    <section role="dialog" aria-modal="true" aria-label={title} className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white p-5 shadow-xl">
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
      {profile.kind === 'salesCustomer' && profile.record && <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3 text-sm">
          <Detail label="Name" value={`${profile.record.first_name} ${profile.record.last_name || ''}`.trim()} />
          <Detail label="Email" value={profile.record.email} />
          <Detail label="Phone" value={profile.record.phone} />
          <div className="col-span-2"><Detail label="Address" value={profile.record.address} /></div>
        </div>
        <section>
          <h3 className="mb-2 text-sm font-semibold text-[#172554]">Related Sales orders ({profile.orders?.length ?? 0})</h3>
          {!profile.orders?.length && <p className="text-xs text-slate-500">No related orders found.</p>}
          <div className="space-y-2">{profile.orders?.map((order) => <article key={order.id} className="flex items-center justify-between gap-3 rounded-lg border border-[#E9EDF4] p-3 text-sm">
            <div><p className="font-medium text-[#344260]">{order.order_number}</p><p className="text-xs text-slate-500">{order.status} · {order.payment_status} · {new Date(order.created_at).toLocaleDateString()}</p></div>
            <p className="whitespace-nowrap font-semibold">{order.currency} {Number(order.total).toLocaleString()}</p>
          </article>)}</div>
        </section>
        <div className="flex items-center justify-between border-t border-[#E9EDF4] pt-3">
          <p className="text-xs text-[#66738C]">
            {(profile.orders?.length ?? 0) > 0 ? (
              <span className="font-medium text-amber-700">Protected: customer has linked orders.</span>
            ) : (
              <span className="text-emerald-700">No linked orders. Safe to delete.</span>
            )}
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              className={buttonClass}
              onClick={() => {
                if (profile.record) {
                  onEditSalesCustomer?.(profile.record);
                }
              }}
            >
              Edit customer
            </button>
            <button
              type="button"
              className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100"
              onClick={() => {
                if (profile.record) {
                  onDeleteSalesCustomer?.(profile.record);
                }
              }}
            >
              Delete
            </button>
          </div>
        </div>
      </div>}
    </section>
  </div>;
}
