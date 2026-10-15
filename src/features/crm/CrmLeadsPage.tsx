import React, { useState, useMemo, useRef } from 'react';
import {
  Upload,
  Plus,
  Users,
  UserCheck,
  TrendingUp,
  ChevronRight,
  ChevronDown,
  Info,
  Search,
  MoreHorizontal,
  Mail,
  Phone,
  MapPin,
  Building,
  Megaphone,
  Folder,
  Calendar,
  Pencil,
  ExternalLink,
  X,
  Check,
  AlertCircle,
  Trash2,
  MessageSquare,
  FileSpreadsheet,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  crmKpiStats,
  initialFunnelStages,
  initialCrmLeads,
} from '../../data/mock';
import type {
  CRMLead,
  CRMLeadStatus,
  CRMLeadActivity,
  CRMFunnelStage,
} from '../../types';

export const CrmLeadsPage: React.FC = () => {
  const navigate = useNavigate();

  // State
  const [leads, setLeads] = useState<CRMLead[]>(initialCrmLeads);
  const [selectedLeadId, setSelectedLeadId] = useState<string>('lead-1');
  const [isDetailPanelOpen, setIsDetailPanelOpen] = useState(true);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [campaignFilter, setCampaignFilter] = useState('All');
  const [assigneeFilter, setAssigneeFilter] = useState('All');
  const [sortOption, setSortOption] = useState<'recent' | 'oldest' | 'name' | 'company'>('recent');

  // Modals & Feedback
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isAddActivityModalOpen, setIsAddActivityModalOpen] = useState(false);
  const [menuOpenLeadId, setMenuOpenLeadId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // CSV Import State
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvPreviewRows, setCsvPreviewRows] = useState<any[]>([]);
  const [csvErrors, setCsvErrors] = useState<string[]>([]);

  // Form State for Add / Edit Lead
  const [leadFormData, setLeadFormData] = useState({
    name: '',
    company: '',
    email: '',
    phone: '',
    sourceCampaign: 'Autumn Launch 2026',
    relatedProject: 'Autumn Sales Growth',
    leadStatus: 'New' as CRMLeadStatus,
    assignedToName: 'Sara El Amrani',
    assignedToInitials: 'SE',
    preferredContact: 'Email',
    location: 'Casablanca, Morocco',
    nextFollowUp: '18 Oct 2026, 10:00 AM',
    internalNotes: '',
  });
  const [formError, setFormError] = useState('');

  // Activity Form State
  const [activityForm, setActivityForm] = useState({
    title: '',
    date: '15 Oct 2026, 03:00 PM',
    description: '',
    type: 'call' as 'call' | 'email' | 'meeting' | 'note',
  });

  // Escape key handler for all active modals
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (deleteConfirmId) setDeleteConfirmId(null);
        else if (isAddModalOpen) setIsAddModalOpen(false);
        else if (isEditModalOpen) setIsEditModalOpen(false);
        else if (isAddActivityModalOpen) setIsAddActivityModalOpen(false);
        else if (isImportModalOpen) setIsImportModalOpen(false);
        else if (menuOpenLeadId) setMenuOpenLeadId(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [deleteConfirmId, isAddModalOpen, isEditModalOpen, isAddActivityModalOpen, isImportModalOpen, menuOpenLeadId]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Find currently selected lead
  const selectedLead = useMemo(() => {
    return leads.find((l) => l.id === selectedLeadId) || leads[0] || null;
  }, [leads, selectedLeadId]);

  // Derived KPI & Funnel Stats
  const dynamicFunnelStages = useMemo<CRMFunnelStage[]>(() => {
    const initialStatusCounts: Record<CRMLeadStatus, number> = {
      New: initialCrmLeads.filter((l: CRMLead) => l.leadStatus === 'New').length,
      Contacted: initialCrmLeads.filter((l: CRMLead) => l.leadStatus === 'Contacted').length,
      Qualified: initialCrmLeads.filter((l: CRMLead) => l.leadStatus === 'Qualified').length,
      Converted: initialCrmLeads.filter((l: CRMLead) => l.leadStatus === 'Converted').length,
    };

    const currentStatusCounts: Record<CRMLeadStatus, number> = {
      New: leads.filter((l: CRMLead) => l.leadStatus === 'New').length,
      Contacted: leads.filter((l: CRMLead) => l.leadStatus === 'Contacted').length,
      Qualified: leads.filter((l: CRMLead) => l.leadStatus === 'Qualified').length,
      Converted: leads.filter((l: CRMLead) => l.leadStatus === 'Converted').length,
    };

    return initialFunnelStages.map((stage) => {
      const delta = (currentStatusCounts[stage.status] || 0) - (initialStatusCounts[stage.status] || 0);
      return {
        ...stage,
        count: Math.max(0, stage.count + delta),
      };
    });
  }, [leads]);

  // Dynamic KPI counts based on live CRM state
  const dynamicKpis = useMemo(() => {
    const leadDelta = leads.length - initialCrmLeads.length;
    const initialConverted = initialCrmLeads.filter((l) => l.leadStatus === 'Converted').length;
    const currentConverted = leads.filter((l) => l.leadStatus === 'Converted').length;
    const convertedDelta = currentConverted - initialConverted;

    const totalVal = Math.max(0, crmKpiStats.totalLeads.value + leadDelta);
    const convertedVal = Math.max(0, crmKpiStats.convertedCustomers.value + convertedDelta);
    const rateVal = totalVal > 0 ? ((convertedVal / totalVal) * 100).toFixed(1) + '%' : '0.0%';

    return {
      totalLeads: totalVal,
      convertedCustomers: convertedVal,
      conversionRate: rateVal,
    };
  }, [leads]);

  // Filtered & Sorted Leads
  const filteredLeads = useMemo(() => {
    return leads
      .filter((lead) => {
        const matchesSearch =
          lead.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          lead.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
          lead.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
          lead.sourceCampaign.toLowerCase().includes(searchQuery.toLowerCase());

        const matchesStatus =
          statusFilter === 'All' || lead.leadStatus === statusFilter;

        const matchesCampaign =
          campaignFilter === 'All' || lead.sourceCampaign === campaignFilter;

        const matchesAssignee =
          assigneeFilter === 'All' || lead.assignedTo.name === assigneeFilter;

        return matchesSearch && matchesStatus && matchesCampaign && matchesAssignee;
      })
      .sort((a, b) => {
        if (sortOption === 'name') return a.name.localeCompare(b.name);
        if (sortOption === 'company') return a.company.localeCompare(b.company);
        if (sortOption === 'oldest') {
          return new Date(a.createdDate).getTime() - new Date(b.createdDate).getTime();
        }
        return new Date(b.createdDate).getTime() - new Date(a.createdDate).getTime();
      });
  }, [leads, searchQuery, statusFilter, campaignFilter, assigneeFilter, sortOption]);

  // Open Add Lead
  const handleOpenAdd = () => {
    setLeadFormData({
      name: '',
      company: '',
      email: '',
      phone: '+212 6 ',
      sourceCampaign: 'Autumn Launch 2026',
      relatedProject: 'Autumn Sales Growth',
      leadStatus: 'New',
      assignedToName: 'Sara El Amrani',
      assignedToInitials: 'SE',
      preferredContact: 'Email',
      location: 'Casablanca, Morocco',
      nextFollowUp: '18 Oct 2026, 10:00 AM',
      internalNotes: '',
    });
    setFormError('');
    setIsAddModalOpen(true);
  };

  // Open Edit Lead
  const handleOpenEdit = (lead: CRMLead) => {
    setLeadFormData({
      name: lead.name,
      company: lead.company,
      email: lead.email,
      phone: lead.phone,
      sourceCampaign: lead.sourceCampaign,
      relatedProject: lead.relatedProject || 'Autumn Sales Growth',
      leadStatus: lead.leadStatus,
      assignedToName: lead.assignedTo.name,
      assignedToInitials: lead.assignedTo.initials,
      preferredContact: lead.preferredContact || 'Email',
      location: lead.location || 'Casablanca, Morocco',
      nextFollowUp: lead.nextFollowUp || '18 Oct 2026, 10:00 AM',
      internalNotes: lead.internalNotes || '',
    });
    setSelectedLeadId(lead.id);
    setFormError('');
    setMenuOpenLeadId(null);
    setIsEditModalOpen(true);
  };

  // Submit Add Lead
  const handleSaveAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!leadFormData.name.trim()) {
      setFormError('Please enter a contact name.');
      return;
    }
    if (!leadFormData.company.trim()) {
      setFormError('Please enter a company name.');
      return;
    }
    if (!leadFormData.email.trim() || !leadFormData.email.includes('@')) {
      setFormError('Please enter a valid email address.');
      return;
    }

    // Check duplicate email
    if (leads.some((l) => l.email.toLowerCase() === leadFormData.email.trim().toLowerCase())) {
      setFormError('A lead with this email address already exists in the system.');
      return;
    }

    const newLead: CRMLead = {
      id: `lead-${Date.now()}`,
      name: leadFormData.name.trim(),
      company: leadFormData.company.trim(),
      email: leadFormData.email.trim(),
      phone: leadFormData.phone.trim(),
      sourceCampaign: leadFormData.sourceCampaign,
      relatedProject: leadFormData.relatedProject,
      leadStatus: leadFormData.leadStatus,
      assignedTo: {
        name: leadFormData.assignedToName,
        initials: leadFormData.assignedToInitials,
        avatarBg: 'bg-[#EDE9FE]',
        avatarColor: 'text-[#6D28D9]',
      },
      createdDate: '15 Oct 2026',
      preferredContact: leadFormData.preferredContact,
      location: leadFormData.location,
      nextFollowUp: leadFormData.nextFollowUp,
      internalNotes: leadFormData.internalNotes,
      activities: [
        {
          id: `act-${Date.now()}`,
          title: 'Lead created',
          date: '15 Oct 2026, 11:00 AM',
          description: `Lead added manually from ${leadFormData.sourceCampaign}.`,
          type: 'create',
        },
      ],
    };

    setLeads([newLead, ...leads]);
    setSelectedLeadId(newLead.id);
    setIsDetailPanelOpen(true);
    setIsAddModalOpen(false);
    showToast(`Lead "${newLead.name}" created successfully.`);
  };

  // Submit Edit Lead
  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLead) return;
    if (!leadFormData.name.trim()) {
      setFormError('Please enter a contact name.');
      return;
    }
    if (!leadFormData.company.trim()) {
      setFormError('Please enter a company name.');
      return;
    }

    setLeads((prev) =>
      prev.map((item) =>
        item.id === selectedLead.id
          ? {
              ...item,
              name: leadFormData.name.trim(),
              company: leadFormData.company.trim(),
              email: leadFormData.email.trim(),
              phone: leadFormData.phone.trim(),
              sourceCampaign: leadFormData.sourceCampaign,
              relatedProject: leadFormData.relatedProject,
              leadStatus: leadFormData.leadStatus,
              assignedTo: {
                name: leadFormData.assignedToName,
                initials: leadFormData.assignedToInitials,
                avatarBg: 'bg-[#EDE9FE]',
                avatarColor: 'text-[#6D28D9]',
              },
              preferredContact: leadFormData.preferredContact,
              location: leadFormData.location,
              nextFollowUp: leadFormData.nextFollowUp,
              internalNotes: leadFormData.internalNotes,
            }
          : item
      )
    );
    setIsEditModalOpen(false);
    showToast('Lead details updated successfully.');
  };

  // Delete Lead
  const handleDeleteLead = (id: string) => {
    setLeads((prev) => prev.filter((l) => l.id !== id));
    if (selectedLeadId === id) {
      const remaining = leads.filter((l) => l.id !== id);
      if (remaining.length > 0) {
        setSelectedLeadId(remaining[0].id);
      }
    }
    setDeleteConfirmId(null);
    setMenuOpenLeadId(null);
    showToast('Lead removed from CRM.');
  };

  // Quick Change Lead Status
  const handleQuickStatusChange = (leadId: string, newStatus: CRMLeadStatus) => {
    setLeads((prev) =>
      prev.map((l) => {
        if (l.id === leadId) {
          const updatedActivities = [
            ...l.activities,
            {
              id: `act-${Date.now()}`,
              title: `Status changed to ${newStatus}`,
              date: 'Just now',
              description: `Status updated from ${l.leadStatus} to ${newStatus}.`,
              type: 'note' as const,
            },
          ];
          return { ...l, leadStatus: newStatus, activities: updatedActivities };
        }
        return l;
      })
    );
    setMenuOpenLeadId(null);
    showToast(`Status updated to ${newStatus}.`);
  };

  // Add Activity to selected lead
  const handleAddActivity = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLead || !activityForm.title.trim()) return;

    const newActivity: CRMLeadActivity = {
      id: `act-${Date.now()}`,
      title: activityForm.title.trim(),
      date: activityForm.date,
      description: activityForm.description.trim() || 'Activity recorded.',
      type: activityForm.type,
    };

    setLeads((prev) =>
      prev.map((l) =>
        l.id === selectedLead.id
          ? { ...l, activities: [...l.activities, newActivity] }
          : l
      )
    );

    setIsAddActivityModalOpen(false);
    setActivityForm({
      title: '',
      date: '15 Oct 2026, 03:00 PM',
      description: '',
      type: 'call',
    });
    showToast('Activity logged to timeline.');
  };

  // CSV File Handler & Parser
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCsvFile(file);
    setCsvErrors([]);

    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target?.result as string;
      if (!text) return;

      const lines = text
        .split('\n')
        .map((l) => l.trim())
        .filter((l) => l.length > 0);
      if (lines.length <= 1) {
        setCsvErrors(['CSV file must have a header row and at least one data row.']);
        return;
      }

      const headers = lines[0].split(',').map((h) => h.trim().replace(/^"|"$/g, '').toLowerCase());
      const nameIdx = headers.findIndex((h) => h.includes('name'));
      const companyIdx = headers.findIndex((h) => h.includes('company'));
      const emailIdx = headers.findIndex((h) => h.includes('email'));
      const phoneIdx = headers.findIndex((h) => h.includes('phone'));
      const statusIdx = headers.findIndex((h) => h.includes('status'));

      if (nameIdx === -1 || emailIdx === -1) {
        setCsvErrors(['CSV header must include at least "Name" and "Email" columns.']);
        return;
      }

      const parsed: any[] = [];
      const errors: string[] = [];

      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(',').map((c) => c.trim().replace(/^"|"$/g, ''));
        const name = cols[nameIdx];
        const email = cols[emailIdx];
        const company = companyIdx !== -1 ? cols[companyIdx] : 'Unknown';
        const phone = phoneIdx !== -1 ? cols[phoneIdx] : '+212 6 --';
        const rawStatus = statusIdx !== -1 ? cols[statusIdx] : 'New';

        if (!name || !email) {
          errors.push(`Row ${i + 1}: Missing name or email.`);
          continue;
        }

        let status: CRMLeadStatus = 'New';
        if (['new', 'contacted', 'qualified', 'converted'].includes(rawStatus.toLowerCase())) {
          status = (rawStatus[0].toUpperCase() + rawStatus.slice(1).toLowerCase()) as CRMLeadStatus;
        }

        parsed.push({
          name,
          email,
          company,
          phone,
          status,
        });
      }

      setCsvPreviewRows(parsed);
      setCsvErrors(errors);
    };
    reader.readAsText(file);
  };

  const handleConfirmImport = () => {
    if (csvPreviewRows.length === 0) return;

    let addedCount = 0;
    let duplicateCount = 0;
    const newItems: CRMLead[] = [];

    csvPreviewRows.forEach((row, index) => {
      // Check existing leads
      if (leads.some((l) => l.email.toLowerCase() === row.email.toLowerCase())) {
        duplicateCount++;
        return;
      }

      newItems.push({
        id: `lead-imported-${Date.now()}-${index}`,
        name: row.name,
        company: row.company,
        email: row.email,
        phone: row.phone,
        sourceCampaign: 'Autumn Launch 2026',
        relatedProject: 'Autumn Sales Growth',
        leadStatus: row.status,
        assignedTo: {
          name: 'Sara El Amrani',
          initials: 'SE',
          avatarBg: 'bg-[#EDE9FE]',
          avatarColor: 'text-[#6D28D9]',
        },
        createdDate: '15 Oct 2026',
        preferredContact: 'Email',
        location: 'Morocco',
        nextFollowUp: '19 Oct 2026, 10:00 AM',
        internalNotes: 'Imported via CSV.',
        activities: [
          {
            id: `act-imp-${Date.now()}-${index}`,
            title: 'Lead imported',
            date: '15 Oct 2026, 11:30 AM',
            description: 'Imported through bulk CSV file upload.',
            type: 'create',
          },
        ],
      });
      addedCount++;
    });

    if (newItems.length > 0) {
      setLeads((prev) => [...newItems, ...prev]);
      setSelectedLeadId(newItems[0].id);
    }

    setIsImportModalOpen(false);
    setCsvFile(null);
    setCsvPreviewRows([]);
    showToast(
      `Imported ${addedCount} lead${addedCount === 1 ? '' : 's'}.${
        duplicateCount > 0 ? ` Skipped ${duplicateCount} duplicate(s).` : ''
      }`
    );
  };

  // Helper for Status Badge
  const getStatusBadge = (status: CRMLeadStatus) => {
    switch (status) {
      case 'New':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#EDE9FE] text-[#6D28D9]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#6D28D9]" />
            New
          </span>
        );
      case 'Contacted':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#E0F2FE] text-[#0284C7]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#0284C7]" />
            Contacted
          </span>
        );
      case 'Qualified':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#FEF3C7] text-[#D97706]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#D97706]" />
            Qualified
          </span>
        );
      case 'Converted':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#CCFBF1] text-[#0D9488]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#0D9488]" />
            Converted
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto pb-12 font-sans text-[#1E1B4B]">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#1E1B4B] text-white px-4 py-2.5 rounded-lg shadow-xl text-sm flex items-center gap-2 border border-slate-700 animate-fade-in">
          <Check className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-xs text-[#64748B]">
        <span className="hover:text-[#1E1B4B] cursor-pointer" onClick={() => navigate('/')}>
          Customers
        </span>
        <span>/</span>
        <span className="text-[#1E1B4B] font-medium">CRM & Leads</span>
      </div>

      {/* Page Title & Primary Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-extrabold tracking-tight text-[#1E1B4B]">
            CRM & Leads
          </h1>
          <p className="text-sm text-[#64748B] mt-1">
            Manage contacts, track lead status and monitor customer conversion.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => setIsImportModalOpen(true)}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-white border border-[#DDD6FE] text-[#6D28D9] hover:bg-[#F5F3FF] text-sm font-semibold shadow-2xs transition-colors"
          >
            <Upload className="w-4 h-4 stroke-[2.2]" />
            <span>Import CSV</span>
          </button>

          <button
            type="button"
            onClick={handleOpenAdd}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-[#6D28D9] hover:bg-[#5B21B6] text-white text-sm font-semibold shadow-2xs transition-colors"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Add Lead</span>
          </button>
        </div>
      </div>

      {/* CRM Top KPI Cards (Three equal-width white cards) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* KPI 1: Leads from Autumn Launch 2026 */}
        <div className="bg-white rounded-xl border border-[#E2E8F0] p-4.5 shadow-2xs flex flex-col justify-between hover:shadow-xs transition-shadow">
          <div className="flex items-start justify-between">
            <div className="w-10 h-10 rounded-xl bg-[#EDE9FE] text-[#6D28D9] flex items-center justify-center shrink-0">
              <Users className="w-5 h-5 stroke-[2]" />
            </div>
            <ChevronRight className="w-4 h-4 text-[#94A3B8]" />
          </div>
          <div className="mt-3">
            <div className="text-xs font-medium text-[#64748B]">
              {crmKpiStats.totalLeads.label}
            </div>
            <div className="text-2xl font-extrabold text-[#1E1B4B] tracking-tight mt-0.5">
              {dynamicKpis.totalLeads}
            </div>
            <div className="flex items-center gap-1 mt-1.5 text-xs text-[#0D9488] font-semibold">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>+{crmKpiStats.totalLeads.trend}% {crmKpiStats.totalLeads.trendLabel}</span>
            </div>
          </div>
        </div>

        {/* KPI 2: Converted Customers */}
        <div className="bg-white rounded-xl border border-[#E2E8F0] p-4.5 shadow-2xs flex flex-col justify-between hover:shadow-xs transition-shadow">
          <div className="flex items-start justify-between">
            <div className="w-10 h-10 rounded-xl bg-[#CCFBF1] text-[#0D9488] flex items-center justify-center shrink-0">
              <UserCheck className="w-5 h-5 stroke-[2]" />
            </div>
            <ChevronRight className="w-4 h-4 text-[#94A3B8]" />
          </div>
          <div className="mt-3">
            <div className="text-xs font-medium text-[#64748B]">
              {crmKpiStats.convertedCustomers.label}
            </div>
            <div className="text-2xl font-extrabold text-[#1E1B4B] tracking-tight mt-0.5">
              {dynamicKpis.convertedCustomers}
            </div>
            <div className="flex items-center gap-1 mt-1.5 text-xs text-[#0D9488] font-semibold">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>+{crmKpiStats.convertedCustomers.trend}% {crmKpiStats.convertedCustomers.trendLabel}</span>
            </div>
          </div>
        </div>

        {/* KPI 3: Lead-to-customer Conversion Rate */}
        <div className="bg-white rounded-xl border border-[#E2E8F0] p-4.5 shadow-2xs flex flex-col justify-between hover:shadow-xs transition-shadow">
          <div className="flex items-start justify-between">
            <div className="w-10 h-10 rounded-xl bg-[#E0F2FE] text-[#0284C7] flex items-center justify-center shrink-0">
              <TrendingUp className="w-5 h-5 stroke-[2]" />
            </div>
            <ChevronRight className="w-4 h-4 text-[#94A3B8]" />
          </div>
          <div className="mt-3">
            <div className="text-xs font-medium text-[#64748B]">
              {crmKpiStats.conversionRate.label}
            </div>
            <div className="text-2xl font-extrabold text-[#1E1B4B] tracking-tight mt-0.5">
              {dynamicKpis.conversionRate}
            </div>
            <div className="flex items-center gap-1 mt-1.5 text-xs text-[#0D9488] font-semibold">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>+{crmKpiStats.conversionRate.trend}% {crmKpiStats.conversionRate.trendLabel}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Lead Funnel Full-Width Card */}
      <div className="bg-white rounded-xl border border-[#E2E8F0] p-5 shadow-2xs">
        <div className="flex items-center justify-between pb-4">
          <h2 className="text-base font-bold text-[#1E1B4B]">Lead Funnel</h2>
          <div className="flex items-center gap-1 text-xs text-[#64748B]">
            <span>Based on <strong>CRM</strong> lead records</span>
            <Info className="w-3.5 h-3.5 text-[#94A3B8]" />
          </div>
        </div>

        {/* Horizontal 4-Stage Segmented Funnel with Chevron Connections */}
        <div className="relative pt-2 pb-1">
          <div className="grid grid-cols-4 gap-1">
            {dynamicFunnelStages.map((stage, idx) => (
              <div
                key={stage.status}
                onClick={() => setStatusFilter(statusFilter === stage.status ? 'All' : stage.status)}
                className="cursor-pointer group flex flex-col items-center"
              >
                {/* Segment Chevron Shape */}
                <div
                  className="w-full h-8 flex items-center justify-center relative transition-transform duration-200 group-hover:scale-[1.02]"
                  style={{
                    backgroundColor: stage.color,
                    clipPath:
                      idx === 0
                        ? 'polygon(0% 0%, 94% 0%, 100% 50%, 94% 100%, 0% 100%)'
                        : idx === dynamicFunnelStages.length - 1
                        ? 'polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%, 6% 50%)'
                        : 'polygon(0% 0%, 94% 0%, 100% 50%, 94% 100%, 0% 100%, 6% 50%)',
                  }}
                >
                  {/* Central Dot Marker */}
                  <div
                    className="w-2.5 h-2.5 rounded-full transition-transform group-hover:scale-125 shadow-xs"
                    style={{ backgroundColor: stage.dotColor }}
                  />
                </div>

                {/* Status & Count Label below segment */}
                <div className="text-center mt-3">
                  <div className="text-xs font-medium text-[#64748B] group-hover:text-[#1E1B4B]">
                    {stage.label}
                  </div>
                  <div className="text-base font-bold text-[#1E1B4B]">
                    {stage.count}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main CRM Content Layout: Left Table (~70%) + Right Detail Panel (~30%) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left Column: Leads & Contacts Table */}
        <div className={`${isDetailPanelOpen && selectedLead ? 'lg:col-span-8' : 'lg:col-span-12'} bg-white rounded-xl border border-[#E2E8F0] shadow-2xs overflow-hidden transition-all duration-300`}>
          {/* Card Header & Filter Toolbar */}
          <div className="p-5 border-b border-[#E2E8F0] space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-[#1E1B4B]">Leads & Contacts</h2>
              {!isDetailPanelOpen && selectedLead && (
                <button
                  type="button"
                  onClick={() => setIsDetailPanelOpen(true)}
                  className="text-xs text-[#6D28D9] font-medium hover:underline flex items-center gap-1"
                >
                  <span>Open Detail Panel</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Filter Toolbar Controls */}
            <div className="flex flex-wrap items-center gap-2.5">
              {/* Search input */}
              <div className="relative flex-1 min-w-[200px]">
                <Search className="w-3.5 h-3.5 text-[#94A3B8] absolute left-3 top-1/2 -translate-y-1/2" aria-hidden="true" />
                <input
                  type="text"
                  id="crm-search-input"
                  aria-label="Search leads, companies, or emails"
                  placeholder="Search leads, companies, or emails..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-[#E2E8F0] bg-[#F8F7FC] text-xs text-[#1E1B4B] placeholder-[#94A3B8] focus:outline-none focus:ring-1 focus:ring-[#6D28D9] focus:bg-white"
                />
              </div>

              {/* Status dropdown */}
              <div className="relative">
                <select
                  id="crm-status-filter"
                  aria-label="Filter by lead status"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="pl-3 pr-7 py-1.5 rounded-lg border border-[#E2E8F0] bg-white text-xs font-medium text-[#1E1B4B] focus:outline-none appearance-none cursor-pointer"
                >
                  <option value="All">Status (All)</option>
                  <option value="New">New</option>
                  <option value="Contacted">Contacted</option>
                  <option value="Qualified">Qualified</option>
                  <option value="Converted">Converted</option>
                </select>
                <ChevronDown className="w-3 h-3 text-[#94A3B8] absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" aria-hidden="true" />
              </div>

              {/* Campaign dropdown */}
              <div className="relative">
                <select
                  id="crm-campaign-filter"
                  aria-label="Filter by source campaign"
                  value={campaignFilter}
                  onChange={(e) => setCampaignFilter(e.target.value)}
                  className="pl-3 pr-7 py-1.5 rounded-lg border border-[#E2E8F0] bg-white text-xs font-medium text-[#1E1B4B] focus:outline-none appearance-none cursor-pointer"
                >
                  <option value="All">Campaign (All)</option>
                  <option value="Autumn Launch 2026">Autumn Launch 2026</option>
                  <option value="October Retargeting">October Retargeting</option>
                  <option value="Summer Clearance">Summer Clearance</option>
                </select>
                <ChevronDown className="w-3 h-3 text-[#94A3B8] absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" aria-hidden="true" />
              </div>

              {/* Assignee dropdown */}
              <div className="relative">
                <select
                  id="crm-assignee-filter"
                  aria-label="Filter by assignee"
                  value={assigneeFilter}
                  onChange={(e) => setAssigneeFilter(e.target.value)}
                  className="pl-3 pr-7 py-1.5 rounded-lg border border-[#E2E8F0] bg-white text-xs font-medium text-[#1E1B4B] focus:outline-none appearance-none cursor-pointer"
                >
                  <option value="All">Assignee (All)</option>
                  <option value="Sara El Amrani">Sara El Amrani</option>
                  <option value="Imane Benkirane">Imane Benkirane</option>
                  <option value="Yassine Bouchra">Yassine Bouchra</option>
                  <option value="Mehdi Zahraoui">Mehdi Zahraoui</option>
                </select>
                <ChevronDown className="w-3 h-3 text-[#94A3B8] absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" aria-hidden="true" />
              </div>

              {/* Sort dropdown */}
              <div className="relative">
                <select
                  id="crm-sort-option"
                  aria-label="Sort leads list"
                  value={sortOption}
                  onChange={(e) => setSortOption(e.target.value as any)}
                  className="pl-3 pr-7 py-1.5 rounded-lg border border-[#E2E8F0] bg-white text-xs font-medium text-[#1E1B4B] focus:outline-none appearance-none cursor-pointer"
                >
                  <option value="recent">Sort by: Recent</option>
                  <option value="oldest">Sort by: Oldest</option>
                  <option value="name">Sort by: Name</option>
                  <option value="company">Sort by: Company</option>
                </select>
                <ChevronDown className="w-3 h-3 text-[#94A3B8] absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" aria-hidden="true" />
              </div>

              {/* Reset filter button if any active */}
              {(searchQuery || statusFilter !== 'All' || campaignFilter !== 'All' || assigneeFilter !== 'All') && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setStatusFilter('All');
                    setCampaignFilter('All');
                    setAssigneeFilter('All');
                  }}
                  className="px-2.5 py-1.5 rounded-lg text-xs font-medium text-[#6D28D9] hover:bg-[#EDE9FE] transition-colors"
                >
                  Reset filters
                </button>
              )}
            </div>
          </div>

          {/* CRM Data Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#E2E8F0] bg-[#FAF9FD] text-[11px] font-semibold text-[#64748B]">
                  <th className="py-2.5 px-3 w-8">
                    <input
                      type="checkbox"
                      id="crm-select-all"
                      aria-label="Select all leads"
                      checked={filteredLeads.length > 0 && filteredLeads.every((l) => l.id === selectedLeadId)}
                      onChange={() => {
                        if (filteredLeads.length > 0) {
                          setSelectedLeadId(filteredLeads[0].id);
                          setIsDetailPanelOpen(true);
                        }
                      }}
                      className="rounded border-[#CBD5E1] text-[#6D28D9] focus:ring-0 cursor-pointer"
                    />
                  </th>
                  <th className="py-2.5 px-3">Name</th>
                  <th className="py-2.5 px-3">Company</th>
                  <th className="py-2.5 px-3">Email</th>
                  <th className="py-2.5 px-3">Phone</th>
                  <th className="py-2.5 px-3">Source Campaign</th>
                  <th className="py-2.5 px-3">Lead Status</th>
                  <th className="py-2.5 px-3">Assigned To</th>
                  <th className="py-2.5 px-3">Created Date</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1F5F9] text-xs">
                {filteredLeads.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-12 text-center">
                      <div className="flex flex-col items-center justify-center max-w-sm mx-auto">
                        <div className="w-10 h-10 rounded-full bg-[#EDE9FE] text-[#6D28D9] flex items-center justify-center mb-3">
                          <Users className="w-5 h-5" />
                        </div>
                        <h4 className="text-sm font-bold text-[#1E1B4B]">No leads found</h4>
                        <p className="text-xs text-[#64748B] mt-1">
                          {leads.length === 0
                            ? 'No CRM leads exist yet. Click "Add Lead" or import a CSV file to get started.'
                            : 'No leads match your current search and filter criteria.'}
                        </p>
                        <div className="mt-4 flex items-center gap-2">
                          {(searchQuery || statusFilter !== 'All' || campaignFilter !== 'All' || assigneeFilter !== 'All') ? (
                            <button
                              type="button"
                              onClick={() => {
                                setSearchQuery('');
                                setStatusFilter('All');
                                if (campaignFilter !== 'All') setCampaignFilter('All');
                                if (assigneeFilter !== 'All') setAssigneeFilter('All');
                              }}
                              className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-[#EDE9FE] text-[#6D28D9] hover:bg-[#DDD6FE] transition-colors"
                            >
                              Clear filters
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={handleOpenAdd}
                              className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-[#6D28D9] text-white hover:bg-[#5B21B6] transition-colors"
                            >
                              Add New Lead
                            </button>
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredLeads.map((lead) => {
                    const isSelected = selectedLead?.id === lead.id;
                    return (
                      <tr
                        key={lead.id}
                        onClick={() => {
                          setSelectedLeadId(lead.id);
                          setIsDetailPanelOpen(true);
                        }}
                        className={`cursor-pointer transition-colors ${
                          isSelected
                            ? 'bg-[#F5F3FF] border-l-2 border-[#6D28D9]'
                            : 'hover:bg-[#FAF9FD]'
                        }`}
                      >
                        <td className="py-3 px-3" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {
                              setSelectedLeadId(lead.id);
                              setIsDetailPanelOpen(true);
                            }}
                            className="rounded border-[#CBD5E1] text-[#6D28D9] focus:ring-0 cursor-pointer"
                          />
                        </td>

                        <td className="py-3 px-3 font-semibold text-[#1E1B4B] whitespace-nowrap">
                          {lead.name}
                        </td>

                        <td className="py-3 px-3 text-[#64748B] whitespace-nowrap">
                          {lead.company}
                        </td>

                        <td className="py-3 px-3 text-[#64748B] whitespace-nowrap">
                          {lead.email}
                        </td>

                        <td className="py-3 px-3 text-[#64748B] whitespace-nowrap">
                          {lead.phone}
                        </td>

                        <td className="py-3 px-3 text-[#6D28D9] whitespace-nowrap">
                          {lead.sourceCampaign}
                        </td>

                        <td className="py-3 px-3 whitespace-nowrap">
                          {getStatusBadge(lead.leadStatus)}
                        </td>

                        <td className="py-3 px-3 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <span className="w-5 h-5 rounded-full bg-[#EDE9FE] text-[#6D28D9] flex items-center justify-center font-bold text-[9px] shrink-0">
                              {lead.assignedTo.initials}
                            </span>
                            <span className="text-[#1E1B4B]">{lead.assignedTo.name}</span>
                          </div>
                        </td>

                        <td className="py-3 px-3 text-[#64748B] whitespace-nowrap">
                          {lead.createdDate}
                        </td>

                        <td className="py-3 px-3 text-right whitespace-nowrap relative" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            onClick={() =>
                              setMenuOpenLeadId(menuOpenLeadId === lead.id ? null : lead.id)
                            }
                            className="p-1 rounded-md text-[#94A3B8] hover:text-[#1E1B4B] hover:bg-slate-100"
                          >
                            <MoreHorizontal className="w-4 h-4" />
                          </button>

                          {menuOpenLeadId === lead.id && (
                            <div className="absolute right-0 mt-1 w-36 bg-white rounded-lg shadow-lg border border-[#E2E8F0] py-1 z-30 text-xs text-left">
                              <button
                                type="button"
                                onClick={() => handleOpenEdit(lead)}
                                className="w-full text-left px-3 py-1.5 hover:bg-[#F5F3FF] text-[#1E1B4B] flex items-center gap-2"
                              >
                                <Pencil className="w-3.5 h-3.5 text-[#6D28D9]" />
                                <span>Edit Lead</span>
                              </button>
                              <div className="border-t border-[#F1F5F9] my-1" />
                              <div className="px-3 py-1 text-[10px] uppercase font-semibold text-[#94A3B8]">
                                Set Status
                              </div>
                              {(['New', 'Contacted', 'Qualified', 'Converted'] as CRMLeadStatus[]).map((st) => (
                                <button
                                  key={st}
                                  type="button"
                                  onClick={() => handleQuickStatusChange(lead.id, st)}
                                  className="w-full text-left px-3 py-1 hover:bg-[#F5F3FF] text-[#1E1B4B] text-xs"
                                >
                                  {st}
                                </button>
                              ))}
                              <div className="border-t border-[#F1F5F9] my-1" />
                              <button
                                type="button"
                                onClick={() => setDeleteConfirmId(lead.id)}
                                className="w-full text-left px-3 py-1.5 hover:bg-rose-50 text-rose-600 flex items-center gap-2"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>Delete Lead</span>
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Table Footer with Pagination */}
          <div className="p-4 border-t border-[#E2E8F0] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[#64748B]">
            <div>
              Showing {filteredLeads.length === 0 ? 0 : 1}–{filteredLeads.length} of {filteredLeads.length} leads
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled
                className="px-2.5 py-1 rounded-md border border-[#E2E8F0] text-[#94A3B8] bg-slate-50 cursor-not-allowed"
              >
                &lt;
              </button>
              <button
                type="button"
                className="px-3 py-1 rounded-md border border-[#6D28D9] bg-[#6D28D9] text-white font-medium"
              >
                1
              </button>
              <button
                type="button"
                disabled
                className="px-2.5 py-1 rounded-md border border-[#E2E8F0] text-[#94A3B8] bg-slate-50 cursor-not-allowed"
              >
                &gt;
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Selected Lead Detail Panel (~30%) */}
        {isDetailPanelOpen && selectedLead && (
          <div className="lg:col-span-4 bg-white rounded-xl border border-[#E2E8F0] p-5 shadow-2xs space-y-5">
            {/* Top Header: Lead Name + Status + Controls */}
            <div className="flex items-start justify-between pb-3 border-b border-[#F1F5F9]">
              <div className="space-y-1">
                <h3 className="text-base font-bold text-[#1E1B4B]">{selectedLead.name}</h3>
                {getStatusBadge(selectedLead.leadStatus)}
              </div>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => handleOpenEdit(selectedLead)}
                  className="p-1.5 rounded-md text-[#6D28D9] hover:bg-[#EDE9FE] transition-colors"
                  title="Edit Lead"
                  aria-label="Edit lead"
                >
                  <Pencil className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setIsDetailPanelOpen(false)}
                  className="p-1.5 rounded-md text-[#94A3B8] hover:text-[#1E1B4B] hover:bg-slate-100 transition-colors"
                  title="Close Detail Panel"
                  aria-label="Close detail panel"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Contact Information Section */}
            <div className="space-y-2.5 text-xs">
              <h4 className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider">
                Contact information
              </h4>
              <div className="space-y-2">
                <div className="flex items-center gap-2.5 text-[#1E1B4B]">
                  <Building className="w-3.5 h-3.5 text-[#94A3B8] shrink-0" />
                  <span>{selectedLead.company}</span>
                </div>
                <div className="flex items-center gap-2.5 text-[#1E1B4B]">
                  <Mail className="w-3.5 h-3.5 text-[#94A3B8] shrink-0" />
                  <a
                    href={`mailto:${selectedLead.email}`}
                    className="hover:text-[#6D28D9] truncate"
                  >
                    {selectedLead.email}
                  </a>
                </div>
                <div className="flex items-center gap-2.5 text-[#1E1B4B]">
                  <Phone className="w-3.5 h-3.5 text-[#94A3B8] shrink-0" />
                  <span>{selectedLead.phone}</span>
                </div>
                <div className="flex items-center gap-2.5 text-[#1E1B4B]">
                  <MapPin className="w-3.5 h-3.5 text-[#94A3B8] shrink-0" />
                  <span>{selectedLead.location || 'Casablanca, Morocco'}</span>
                </div>
                <div className="flex items-center gap-2.5 text-[#1E1B4B]">
                  <MessageSquare className="w-3.5 h-3.5 text-[#94A3B8] shrink-0" />
                  <span>Preferred channel: {selectedLead.preferredContact || 'Email'}</span>
                </div>
              </div>
            </div>

            {/* Linked Campaign & Project (Two Boxes) */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div
                onClick={() => navigate('/campaigns')}
                className="p-2.5 rounded-lg border border-[#E2E8F0] bg-[#F8F7FC] hover:bg-[#F5F3FF] hover:border-[#DDD6FE] cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-1.5 text-[10px] text-[#64748B]">
                  <Megaphone className="w-3 h-3 text-[#6D28D9]" />
                  <span>Linked campaign</span>
                </div>
                <div className="font-semibold text-[#1E1B4B] mt-1 truncate">
                  {selectedLead.sourceCampaign}
                </div>
              </div>

              <div
                onClick={() => navigate('/projects')}
                className="p-2.5 rounded-lg border border-[#E2E8F0] bg-[#F8F7FC] hover:bg-[#F5F3FF] hover:border-[#DDD6FE] cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-1.5 text-[10px] text-[#64748B]">
                  <Folder className="w-3 h-3 text-[#6D28D9]" />
                  <span>Related project</span>
                </div>
                <div className="font-semibold text-[#1E1B4B] mt-1 truncate">
                  {selectedLead.relatedProject || 'Autumn Sales Growth'}
                </div>
              </div>
            </div>

            {/* Next Follow-up */}
            <div className="space-y-1.5 text-xs">
              <h4 className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider">
                Next follow-up
              </h4>
              <div className="flex items-center gap-2 p-2.5 rounded-lg border border-[#E2E8F0] bg-[#F8F7FC] text-[#1E1B4B] font-medium">
                <Calendar className="w-3.5 h-3.5 text-[#6D28D9] shrink-0" />
                <span>{selectedLead.nextFollowUp || 'None scheduled'}</span>
              </div>
            </div>

            {/* Internal Notes */}
            <div className="space-y-1.5 text-xs">
              <div className="flex items-center justify-between">
                <h4 className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider">
                  Internal notes
                </h4>
                <button
                  type="button"
                  onClick={() => handleOpenEdit(selectedLead)}
                  className="text-[10px] text-[#6D28D9] hover:underline flex items-center gap-1"
                >
                  <Pencil className="w-2.5 h-2.5" />
                  <span>Edit</span>
                </button>
              </div>
              <div className="p-3 rounded-lg border border-[#E2E8F0] bg-[#FAF9FD] text-[#1E1B4B] text-xs leading-relaxed">
                {selectedLead.internalNotes || 'No internal notes recorded yet.'}
              </div>
            </div>

            {/* Activity Timeline */}
            <div className="space-y-2.5 text-xs">
              <div className="flex items-center justify-between">
                <h4 className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider">
                  Activity timeline
                </h4>
                <button
                  type="button"
                  onClick={() => setIsAddActivityModalOpen(true)}
                  className="text-[10px] text-[#6D28D9] font-medium hover:underline flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" />
                  <span>Add activity</span>
                </button>
              </div>

              {/* Vertical Timeline */}
              <div className="relative pl-5 space-y-4 before:content-[''] before:absolute before:left-2 before:top-2 before:bottom-2 before:w-[1.5px] before:bg-[#E2E8F0]">
                {selectedLead.activities.map((act: CRMLeadActivity, index: number) => {
                  const markerColor =
                    index === 0
                      ? 'bg-[#6D28D9]'
                      : index === 1
                      ? 'bg-[#0284C7]'
                      : 'bg-[#D97706]';
                  return (
                    <div key={act.id} className="relative">
                      {/* Timeline Dot Marker */}
                      <span
                        className={`absolute -left-5 top-1 w-2.5 h-2.5 rounded-full ${markerColor} ring-4 ring-white`}
                      />
                      <div className="space-y-0.5">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-[#1E1B4B]">{act.title}</span>
                          <span className="text-[10px] text-[#94A3B8]">{act.date}</span>
                        </div>
                        <p className="text-[#64748B] text-[11px]">{act.description}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Bottom Panel Actions */}
            <div className="pt-3 border-t border-[#E2E8F0] flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleOpenEdit(selectedLead)}
                className="flex-1 py-2 px-3 rounded-lg bg-[#6D28D9] hover:bg-[#5B21B6] text-white text-xs font-semibold flex items-center justify-center gap-1.5 shadow-2xs transition-colors"
              >
                <Pencil className="w-3.5 h-3.5" />
                <span>Edit Lead</span>
              </button>

              <button
                type="button"
                onClick={() => navigate('/campaigns')}
                className="py-2 px-3 rounded-lg border border-[#E2E8F0] hover:bg-[#F8F7FC] text-[#1E1B4B] text-xs font-medium flex items-center justify-center gap-1.5 transition-colors"
              >
                <span>View Campaign</span>
                <ExternalLink className="w-3.5 h-3.5 text-[#64748B]" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Add Lead Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-[#1E1B4B]/40 backdrop-blur-xs flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="add-lead-modal-title">
          <div className="bg-white rounded-xl shadow-2xl border border-[#E2E8F0] w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-[#E2E8F0] flex items-center justify-between">
              <h3 id="add-lead-modal-title" className="text-base font-bold text-[#1E1B4B]">Add New Lead</h3>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="text-[#94A3B8] hover:text-[#1E1B4B] p-1 rounded"
                aria-label="Close dialog"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveAdd} className="p-6 space-y-4">
              {formError && (
                <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2" role="alert">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="add-lead-name" className="block text-xs font-semibold text-[#64748B] mb-1">Contact Name *</label>
                  <input
                    id="add-lead-name"
                    type="text"
                    value={leadFormData.name}
                    onChange={(e) => setLeadFormData({ ...leadFormData, name: e.target.value })}
                    placeholder="e.g. Amina El Idrissi"
                    className="w-full px-3 py-2 text-xs border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#6D28D9]"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="add-lead-company" className="block text-xs font-semibold text-[#64748B] mb-1">Company *</label>
                  <input
                    id="add-lead-company"
                    type="text"
                    value={leadFormData.company}
                    onChange={(e) => setLeadFormData({ ...leadFormData, company: e.target.value })}
                    placeholder="e.g. Casa Retail Group"
                    className="w-full px-3 py-2 text-xs border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#6D28D9]"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="add-lead-email" className="block text-xs font-semibold text-[#64748B] mb-1">Email *</label>
                  <input
                    id="add-lead-email"
                    type="email"
                    value={leadFormData.email}
                    onChange={(e) => setLeadFormData({ ...leadFormData, email: e.target.value })}
                    placeholder="name@company.ma"
                    className="w-full px-3 py-2 text-xs border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#6D28D9]"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="add-lead-phone" className="block text-xs font-semibold text-[#64748B] mb-1">Phone</label>
                  <input
                    id="add-lead-phone"
                    type="text"
                    value={leadFormData.phone}
                    onChange={(e) => setLeadFormData({ ...leadFormData, phone: e.target.value })}
                    placeholder="+212 6..."
                    className="w-full px-3 py-2 text-xs border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#6D28D9]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="add-lead-source-campaign" className="block text-xs font-semibold text-[#64748B] mb-1">Source Campaign</label>
                  <select
                    id="add-lead-source-campaign"
                    value={leadFormData.sourceCampaign}
                    onChange={(e) => setLeadFormData({ ...leadFormData, sourceCampaign: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-[#E2E8F0] rounded-lg bg-white focus:outline-none"
                  >
                    <option value="Autumn Launch 2026">Autumn Launch 2026</option>
                    <option value="October Retargeting">October Retargeting</option>
                    <option value="Summer Clearance">Summer Clearance</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="add-lead-related-project" className="block text-xs font-semibold text-[#64748B] mb-1">Related Project</label>
                  <input
                    id="add-lead-related-project"
                    type="text"
                    value={leadFormData.relatedProject}
                    onChange={(e) => setLeadFormData({ ...leadFormData, relatedProject: e.target.value })}
                    placeholder="Project name"
                    className="w-full px-3 py-2 text-xs border border-[#E2E8F0] rounded-lg focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="add-lead-status" className="block text-xs font-semibold text-[#64748B] mb-1">Status</label>
                  <select
                    id="add-lead-status"
                    value={leadFormData.leadStatus}
                    onChange={(e) => setLeadFormData({ ...leadFormData, leadStatus: e.target.value as CRMLeadStatus })}
                    className="w-full px-3 py-2 text-xs border border-[#E2E8F0] rounded-lg bg-white focus:outline-none"
                  >
                    <option value="New">New</option>
                    <option value="Contacted">Contacted</option>
                    <option value="Qualified">Qualified</option>
                    <option value="Converted">Converted</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="add-lead-assignee" className="block text-xs font-semibold text-[#64748B] mb-1">Assigned To</label>
                  <select
                    id="add-lead-assignee"
                    value={leadFormData.assignedToName}
                    onChange={(e) => {
                      const name = e.target.value;
                      const initials = name
                        .split(' ')
                        .map((n) => n[0])
                        .join('')
                        .slice(0, 2)
                        .toUpperCase();
                      setLeadFormData({
                        ...leadFormData,
                        assignedToName: name,
                        assignedToInitials: initials,
                      });
                    }}
                    className="w-full px-3 py-2 text-xs border border-[#E2E8F0] rounded-lg bg-white focus:outline-none"
                  >
                    <option value="Sara El Amrani">Sara El Amrani</option>
                    <option value="Imane Benkirane">Imane Benkirane</option>
                    <option value="Yassine Bouchra">Yassine Bouchra</option>
                    <option value="Mehdi Zahraoui">Mehdi Zahraoui</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="add-lead-contact" className="block text-xs font-semibold text-[#64748B] mb-1">Contact Method</label>
                  <select
                    id="add-lead-contact"
                    value={leadFormData.preferredContact}
                    onChange={(e) => setLeadFormData({ ...leadFormData, preferredContact: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-[#E2E8F0] rounded-lg bg-white focus:outline-none"
                  >
                    <option value="Email">Email</option>
                    <option value="Phone">Phone</option>
                    <option value="In-person">In-person</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="add-lead-location" className="block text-xs font-semibold text-[#64748B] mb-1">Location</label>
                  <input
                    id="add-lead-location"
                    type="text"
                    value={leadFormData.location}
                    onChange={(e) => setLeadFormData({ ...leadFormData, location: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-[#E2E8F0] rounded-lg focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="add-lead-followup" className="block text-xs font-semibold text-[#64748B] mb-1">Next Follow-Up</label>
                <input
                  id="add-lead-followup"
                  type="text"
                  value={leadFormData.nextFollowUp}
                  onChange={(e) => setLeadFormData({ ...leadFormData, nextFollowUp: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-[#E2E8F0] rounded-lg focus:outline-none"
                />
              </div>

              <div>
                <label htmlFor="add-lead-notes" className="block text-xs font-semibold text-[#64748B] mb-1">Internal Notes</label>
                <textarea
                  id="add-lead-notes"
                  rows={2}
                  value={leadFormData.internalNotes}
                  onChange={(e) => setLeadFormData({ ...leadFormData, internalNotes: e.target.value })}
                  placeholder="Additional context or requirement details..."
                  className="w-full px-3 py-2 text-xs border border-[#E2E8F0] rounded-lg focus:outline-none"
                />
              </div>

              <div className="pt-4 border-t border-[#E2E8F0] flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-[#64748B] hover:text-[#1E1B4B]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#6D28D9] hover:bg-[#5B21B6] text-white text-xs font-semibold rounded-lg shadow-2xs"
                >
                  Create Lead
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Lead Modal */}
      {isEditModalOpen && selectedLead && (
        <div className="fixed inset-0 z-50 bg-[#1E1B4B]/40 backdrop-blur-xs flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="edit-lead-modal-title">
          <div className="bg-white rounded-xl shadow-2xl border border-[#E2E8F0] w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-[#E2E8F0] flex items-center justify-between">
              <h3 id="edit-lead-modal-title" className="text-base font-bold text-[#1E1B4B]">Edit Lead Details</h3>
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="text-[#94A3B8] hover:text-[#1E1B4B] p-1 rounded"
                aria-label="Close dialog"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="p-6 space-y-4">
              {formError && (
                <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2" role="alert">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="edit-lead-name" className="block text-xs font-semibold text-[#64748B] mb-1">Contact Name *</label>
                  <input
                    id="edit-lead-name"
                    type="text"
                    value={leadFormData.name}
                    onChange={(e) => setLeadFormData({ ...leadFormData, name: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#6D28D9]"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="edit-lead-company" className="block text-xs font-semibold text-[#64748B] mb-1">Company *</label>
                  <input
                    id="edit-lead-company"
                    type="text"
                    value={leadFormData.company}
                    onChange={(e) => setLeadFormData({ ...leadFormData, company: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#6D28D9]"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="edit-lead-email" className="block text-xs font-semibold text-[#64748B] mb-1">Email *</label>
                  <input
                    id="edit-lead-email"
                    type="email"
                    value={leadFormData.email}
                    onChange={(e) => setLeadFormData({ ...leadFormData, email: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#6D28D9]"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="edit-lead-phone" className="block text-xs font-semibold text-[#64748B] mb-1">Phone</label>
                  <input
                    id="edit-lead-phone"
                    type="text"
                    value={leadFormData.phone}
                    onChange={(e) => setLeadFormData({ ...leadFormData, phone: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#6D28D9]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="edit-lead-source-campaign" className="block text-xs font-semibold text-[#64748B] mb-1">Source Campaign</label>
                  <select
                    id="edit-lead-source-campaign"
                    value={leadFormData.sourceCampaign}
                    onChange={(e) => setLeadFormData({ ...leadFormData, sourceCampaign: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-[#E2E8F0] rounded-lg bg-white focus:outline-none"
                  >
                    <option value="Autumn Launch 2026">Autumn Launch 2026</option>
                    <option value="October Retargeting">October Retargeting</option>
                    <option value="Summer Clearance">Summer Clearance</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="edit-lead-related-project" className="block text-xs font-semibold text-[#64748B] mb-1">Related Project</label>
                  <input
                    id="edit-lead-related-project"
                    type="text"
                    value={leadFormData.relatedProject}
                    onChange={(e) => setLeadFormData({ ...leadFormData, relatedProject: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-[#E2E8F0] rounded-lg focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="edit-lead-status" className="block text-xs font-semibold text-[#64748B] mb-1">Status</label>
                  <select
                    id="edit-lead-status"
                    value={leadFormData.leadStatus}
                    onChange={(e) => setLeadFormData({ ...leadFormData, leadStatus: e.target.value as CRMLeadStatus })}
                    className="w-full px-3 py-2 text-xs border border-[#E2E8F0] rounded-lg bg-white focus:outline-none"
                  >
                    <option value="New">New</option>
                    <option value="Contacted">Contacted</option>
                    <option value="Qualified">Qualified</option>
                    <option value="Converted">Converted</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="edit-lead-assignee" className="block text-xs font-semibold text-[#64748B] mb-1">Assigned To</label>
                  <select
                    id="edit-lead-assignee"
                    value={leadFormData.assignedToName}
                    onChange={(e) => {
                      const name = e.target.value;
                      const initials = name
                        .split(' ')
                        .map((n) => n[0])
                        .join('')
                        .slice(0, 2)
                        .toUpperCase();
                      setLeadFormData({
                        ...leadFormData,
                        assignedToName: name,
                        assignedToInitials: initials,
                      });
                    }}
                    className="w-full px-3 py-2 text-xs border border-[#E2E8F0] rounded-lg bg-white focus:outline-none"
                  >
                    <option value="Sara El Amrani">Sara El Amrani</option>
                    <option value="Imane Benkirane">Imane Benkirane</option>
                    <option value="Yassine Bouchra">Yassine Bouchra</option>
                    <option value="Mehdi Zahraoui">Mehdi Zahraoui</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="edit-lead-contact" className="block text-xs font-semibold text-[#64748B] mb-1">Contact Method</label>
                  <select
                    id="edit-lead-contact"
                    value={leadFormData.preferredContact}
                    onChange={(e) => setLeadFormData({ ...leadFormData, preferredContact: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-[#E2E8F0] rounded-lg bg-white focus:outline-none"
                  >
                    <option value="Email">Email</option>
                    <option value="Phone">Phone</option>
                    <option value="In-person">In-person</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="edit-lead-location" className="block text-xs font-semibold text-[#64748B] mb-1">Location</label>
                  <input
                    id="edit-lead-location"
                    type="text"
                    value={leadFormData.location}
                    onChange={(e) => setLeadFormData({ ...leadFormData, location: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-[#E2E8F0] rounded-lg focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="edit-lead-followup" className="block text-xs font-semibold text-[#64748B] mb-1">Next Follow-Up</label>
                <input
                  id="edit-lead-followup"
                  type="text"
                  value={leadFormData.nextFollowUp}
                  onChange={(e) => setLeadFormData({ ...leadFormData, nextFollowUp: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-[#E2E8F0] rounded-lg focus:outline-none"
                />
              </div>

              <div>
                <label htmlFor="edit-lead-notes" className="block text-xs font-semibold text-[#64748B] mb-1">Internal Notes</label>
                <textarea
                  id="edit-lead-notes"
                  rows={2}
                  value={leadFormData.internalNotes}
                  onChange={(e) => setLeadFormData({ ...leadFormData, internalNotes: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-[#E2E8F0] rounded-lg focus:outline-none"
                />
              </div>

              <div className="pt-4 border-t border-[#E2E8F0] flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-[#64748B] hover:text-[#1E1B4B]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#6D28D9] hover:bg-[#5B21B6] text-white text-xs font-semibold rounded-lg shadow-2xs"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Activity Modal */}
      {isAddActivityModalOpen && selectedLead && (
        <div className="fixed inset-0 z-50 bg-[#1E1B4B]/40 backdrop-blur-xs flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="add-activity-modal-title">
          <div className="bg-white rounded-xl shadow-2xl border border-[#E2E8F0] w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-[#E2E8F0] flex items-center justify-between">
              <h3 id="add-activity-modal-title" className="text-base font-bold text-[#1E1B4B]">Log Activity</h3>
              <button
                type="button"
                onClick={() => setIsAddActivityModalOpen(false)}
                className="text-[#94A3B8] hover:text-[#1E1B4B] p-1 rounded"
                aria-label="Close dialog"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddActivity} className="p-6 space-y-4">
              <div>
                <label htmlFor="activity-type" className="block text-xs font-semibold text-[#64748B] mb-1">Activity Type</label>
                <select
                  id="activity-type"
                  value={activityForm.type}
                  onChange={(e) => setActivityForm({ ...activityForm, type: e.target.value as any })}
                  className="w-full px-3 py-2 text-xs border border-[#E2E8F0] rounded-lg bg-white focus:outline-none"
                >
                  <option value="call">Call</option>
                  <option value="email">Email</option>
                  <option value="meeting">Meeting</option>
                  <option value="note">Internal Note</option>
                </select>
              </div>

              <div>
                <label htmlFor="activity-title" className="block text-xs font-semibold text-[#64748B] mb-1">Title *</label>
                <input
                  id="activity-title"
                  type="text"
                  value={activityForm.title}
                  onChange={(e) => setActivityForm({ ...activityForm, title: e.target.value })}
                  placeholder="e.g. Discovery Call with Operations Team"
                  className="w-full px-3 py-2 text-xs border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#6D28D9]"
                  required
                />
              </div>

              <div>
                <label htmlFor="activity-date" className="block text-xs font-semibold text-[#64748B] mb-1">Date & Time</label>
                <input
                  id="activity-date"
                  type="text"
                  value={activityForm.date}
                  onChange={(e) => setActivityForm({ ...activityForm, date: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-[#E2E8F0] rounded-lg focus:outline-none"
                />
              </div>

              <div>
                <label htmlFor="activity-desc" className="block text-xs font-semibold text-[#64748B] mb-1">Description</label>
                <textarea
                  id="activity-desc"
                  rows={3}
                  value={activityForm.description}
                  onChange={(e) => setActivityForm({ ...activityForm, description: e.target.value })}
                  placeholder="Summary of conversation, questions raised, commitments made..."
                  className="w-full px-3 py-2 text-xs border border-[#E2E8F0] rounded-lg focus:outline-none"
                />
              </div>

              <div className="pt-4 border-t border-[#E2E8F0] flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsAddActivityModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-[#64748B] hover:text-[#1E1B4B]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#6D28D9] hover:bg-[#5B21B6] text-white text-xs font-semibold rounded-lg shadow-2xs"
                >
                  Log Activity
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Import CSV Modal */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 bg-[#1E1B4B]/40 backdrop-blur-xs flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="import-csv-modal-title">
          <div className="bg-white rounded-xl shadow-2xl border border-[#E2E8F0] w-full max-w-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-[#E2E8F0] flex items-center justify-between">
              <h3 id="import-csv-modal-title" className="text-base font-bold text-[#1E1B4B]">Import Leads from CSV</h3>
              <button
                type="button"
                onClick={() => {
                  setIsImportModalOpen(false);
                  setCsvFile(null);
                  setCsvPreviewRows([]);
                  setCsvErrors([]);
                }}
                className="text-[#94A3B8] hover:text-[#1E1B4B] p-1 rounded"
                aria-label="Close dialog"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="p-4 rounded-xl border-2 border-dashed border-[#DDD6FE] bg-[#FAF9FD] text-center">
                <FileSpreadsheet className="w-8 h-8 text-[#6D28D9] mx-auto mb-2" />
                <p className="text-xs font-medium text-[#1E1B4B]">
                  Select or drag a CSV file with columns: <span className="font-bold">Name, Email, Company, Phone, Status</span>
                </p>
                <p className="text-[11px] text-[#64748B] mt-1">UTF-8 encoded .csv files up to 5MB</p>
                <input
                  ref={fileInputRef}
                  id="crm-csv-file-input"
                  type="file"
                  accept=".csv"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="mt-3 px-4 py-2 bg-white border border-[#DDD6FE] text-[#6D28D9] hover:bg-[#F5F3FF] text-xs font-semibold rounded-lg shadow-2xs inline-flex items-center gap-2"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>{csvFile ? csvFile.name : 'Choose CSV File'}</span>
                </button>
              </div>

              {csvErrors.length > 0 && (
                <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs space-y-1" role="alert">
                  <div className="flex items-center gap-1.5 font-semibold">
                    <AlertCircle className="w-4 h-4" />
                    <span>Upload Issue</span>
                  </div>
                  {csvErrors.map((err, i) => (
                    <div key={i}>{err}</div>
                  ))}
                </div>
              )}

              {csvPreviewRows.length > 0 && (
                <div>
                  <div className="text-xs font-bold text-[#1E1B4B] mb-2 flex items-center justify-between">
                    <span>File Preview ({csvPreviewRows.length} leads detected)</span>
                    <span className="text-[11px] text-[#0D9488] font-normal">Ready to import</span>
                  </div>
                  <div className="max-h-48 overflow-y-auto border border-[#E2E8F0] rounded-lg">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-[#FAF9FD] text-[11px] text-[#64748B] sticky top-0 border-b border-[#E2E8F0]">
                        <tr>
                          <th className="py-2 px-3">Name</th>
                          <th className="py-2 px-3">Company</th>
                          <th className="py-2 px-3">Email</th>
                          <th className="py-2 px-3">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#F1F5F9]">
                        {csvPreviewRows.slice(0, 10).map((row, i) => (
                          <tr key={i} className="hover:bg-slate-50">
                            <td className="py-1.5 px-3 font-medium text-[#1E1B4B]">{row.name}</td>
                            <td className="py-1.5 px-3 text-[#64748B]">{row.company}</td>
                            <td className="py-1.5 px-3 text-[#64748B]">{row.email}</td>
                            <td className="py-1.5 px-3">
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#EDE9FE] text-[#6D28D9]">
                                {row.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <div className="pt-4 border-t border-[#E2E8F0] flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setIsImportModalOpen(false);
                    setCsvFile(null);
                    setCsvPreviewRows([]);
                    setCsvErrors([]);
                  }}
                  className="px-4 py-2 text-xs font-medium text-[#64748B] hover:text-[#1E1B4B]"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={csvPreviewRows.length === 0}
                  onClick={handleConfirmImport}
                  className="px-4 py-2 bg-[#6D28D9] hover:bg-[#5B21B6] disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-semibold rounded-lg shadow-2xs inline-flex items-center gap-1.5"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Import {csvPreviewRows.length} Leads</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 bg-[#1E1B4B]/40 backdrop-blur-xs flex items-center justify-center p-4" role="alertdialog" aria-modal="true" aria-labelledby="delete-lead-modal-title" aria-describedby="delete-lead-modal-desc">
          <div className="bg-white rounded-xl shadow-2xl border border-[#E2E8F0] w-full max-w-sm p-6 text-center animate-in fade-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-3">
              <Trash2 className="w-6 h-6" />
            </div>
            <h4 id="delete-lead-modal-title" className="text-base font-bold text-[#1E1B4B]">Delete Contact?</h4>
            <p id="delete-lead-modal-desc" className="text-xs text-[#64748B] mt-1.5">
              This lead record and its associated activity history will be deleted.
            </p>
            <div className="mt-5 flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => setDeleteConfirmId(null)}
                className="px-4 py-2 text-xs font-medium text-[#64748B] hover:text-[#1E1B4B]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleDeleteLead(deleteConfirmId)}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-lg shadow-2xs"
              >
                Delete Contact
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
