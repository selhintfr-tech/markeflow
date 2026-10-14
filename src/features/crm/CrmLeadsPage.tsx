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

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Find currently selected lead
  const selectedLead = useMemo(() => {
    return leads.find((l) => l.id === selectedLeadId) || leads[0] || null;
  }, [leads, selectedLeadId]);

  // Derived KPI & Funnel Stats
  const dynamicFunnelStages = useMemo(() => {
    // We preserve the reference snapshot counts while adjusting for added/removed leads
    const stages: CRMFunnelStage[] = [
      {
        status: 'New',
        label: 'New',
        count: initialFunnelStages[0].count,
        color: '#EDE9FE',
        dotColor: '#6D28D9',
      },
      {
        status: 'Contacted',
        label: 'Contacted',
        count: initialFunnelStages[1].count,
        color: '#E0F2FE',
        dotColor: '#0284C7',
      },
      {
        status: 'Qualified',
        label: 'Qualified',
        count: initialFunnelStages[2].count,
        color: '#FEF3C7',
        dotColor: '#D97706',
      },
      {
        status: 'Converted',
        label: 'Converted',
        count: initialFunnelStages[3].count,
        color: '#CCFBF1',
        dotColor: '#0D9488',
      },
    ];

    // Recalculate if user adds leads
    const extraLeads = leads.length - initialCrmLeads.length;
    if (extraLeads !== 0) {
      // derive exact status count difference
      const newStatusCounts: Record<CRMLeadStatus, number> = {
        New: leads.filter((l: CRMLead) => l.leadStatus === 'New').length,
        Contacted: leads.filter((l: CRMLead) => l.leadStatus === 'Contacted').length,
        Qualified: leads.filter((l: CRMLead) => l.leadStatus === 'Qualified').length,
        Converted: leads.filter((l: CRMLead) => l.leadStatus === 'Converted').length,
      };
      return stages.map((st) => ({
        ...st,
        count: (initialFunnelStages.find((s: CRMFunnelStage) => s.status === st.status)?.count || 0) +
          (newStatusCounts[st.status] - initialCrmLeads.filter((l: CRMLead) => l.leadStatus === st.status).length),
      }));
    }

    return stages;
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
              {crmKpiStats.totalLeads.value}
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
              {crmKpiStats.convertedCustomers.value}
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
              {crmKpiStats.conversionRate.value}
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
                <Search className="w-3.5 h-3.5 text-[#94A3B8] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search leads, companies, or emails..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-[#E2E8F0] bg-[#F8F7FC] text-xs text-[#1E1B4B] placeholder-[#94A3B8] focus:outline-none focus:ring-1 focus:ring-[#6D28D9] focus:bg-white"
                />
              </div>

              {/* Status dropdown */}
              <div className="relative">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="pl-3 pr-7 py-1.5 rounded-lg border border-[#E2E8F0] bg-white text-xs font-medium text-[#1E1B4B] focus:outline-none appearance-none cursor-pointer"
                >
                  <option value="All">Status</option>
                  <option value="New">New</option>
                  <option value="Contacted">Contacted</option>
                  <option value="Qualified">Qualified</option>
                  <option value="Converted">Converted</option>
                </select>
                <ChevronDown className="w-3 h-3 text-[#94A3B8] absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>

              {/* Campaign dropdown */}
              <div className="relative">
                <select
                  value={campaignFilter}
                  onChange={(e) => setCampaignFilter(e.target.value)}
                  className="pl-3 pr-7 py-1.5 rounded-lg border border-[#E2E8F0] bg-white text-xs font-medium text-[#1E1B4B] focus:outline-none appearance-none cursor-pointer"
                >
                  <option value="All">Campaign</option>
                  <option value="Autumn Launch 2026">Autumn Launch 2026</option>
                  <option value="October Retargeting">October Retargeting</option>
                  <option value="Summer Clearance">Summer Clearance</option>
                </select>
                <ChevronDown className="w-3 h-3 text-[#94A3B8] absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>

              {/* Assignee dropdown */}
              <div className="relative">
                <select
                  value={assigneeFilter}
                  onChange={(e) => setAssigneeFilter(e.target.value)}
                  className="pl-3 pr-7 py-1.5 rounded-lg border border-[#E2E8F0] bg-white text-xs font-medium text-[#1E1B4B] focus:outline-none appearance-none cursor-pointer"
                >
                  <option value="All">Assignee</option>
                  <option value="Sara El Amrani">Sara El Amrani</option>
                  <option value="Imane Benkirane">Imane Benkirane</option>
                  <option value="Yassine Bouchra">Yassine Bouchra</option>
                  <option value="Mehdi Zahraoui">Mehdi Zahraoui</option>
                </select>
                <ChevronDown className="w-3 h-3 text-[#94A3B8] absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>

              {/* Sort dropdown */}
              <div className="relative">
                <select
                  value={sortOption}
                  onChange={(e) => setSortOption(e.target.value as any)}
                  className="pl-3 pr-7 py-1.5 rounded-lg border border-[#E2E8F0] bg-white text-xs font-medium text-[#1E1B4B] focus:outline-none appearance-none cursor-pointer"
                >
                  <option value="recent">Sort by: Recent</option>
                  <option value="oldest">Sort by: Oldest</option>
                  <option value="name">Sort by: Name</option>
                  <option value="company">Sort by: Company</option>
                </select>
                <ChevronDown className="w-3 h-3 text-[#94A3B8] absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
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
                    <td colSpan={10} className="py-10 text-center text-[#64748B]">
                      No leads found matching your criteria.
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
              Showing 1–{filteredLeads.length} of {filteredLeads.length} leads
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
                  className="p-1 rounded-md text-[#94A3B8] hover:text-[#1E1B4B] hover:bg-slate-100"
                  title="Edit Lead"
                >
                  <MoreHorizontal className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setIsDetailPanelOpen(false)}
                  className="p-1 rounded-md text-[#94A3B8] hover:text-[#1E1B4B] hover:bg-slate-100"
                  title="Close Detail Panel"
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
        <div className="fixed inset-0 z-50 bg-[#1E1B4B]/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-[#E2E8F0] w-full max-w-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-[#E2E8F0] flex items-center justify-between">
              <h3 className="text-base font-bold text-[#1E1B4B]">Add New Lead</h3>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="text-[#94A3B8] hover:text-[#1E1B4B]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveAdd} className="p-6 space-y-4">
              {formError && (
                <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#64748B] mb-1">Contact Name</label>
                  <input
                    type="text"
                    value={leadFormData.name}
                    onChange={(e) => setLeadFormData({ ...leadFormData, name: e.target.value })}
                    placeholder="e.g. Amina El Idrissi"
                    className="w-full px-3 py-2 text-xs border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#6D28D9]"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#64748B] mb-1">Company</label>
                  <input
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
                  <label className="block text-xs font-semibold text-[#64748B] mb-1">Email</label>
                  <input
                    type="email"
                    value={leadFormData.email}
                    onChange={(e) => setLeadFormData({ ...leadFormData, email: e.target.value })}
                    placeholder="e.g. amina@casaretail.ma"
                    className="w-full px-3 py-2 text-xs border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#6D28D9]"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#64748B] mb-1">Phone</label>
                  <input
                    type="text"
                    value={leadFormData.phone}
                    onChange={(e) => setLeadFormData({ ...leadFormData, phone: e.target.value })}
                    placeholder="e.g. +212 6 61 24 88 31"
                    className="w-full px-3 py-2 text-xs border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#6D28D9]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#64748B] mb-1">Status</label>
                  <select
                    value={leadFormData.leadStatus}
                    onChange={(e) => setLeadFormData({ ...leadFormData, leadStatus: e.target.value as CRMLeadStatus })}
                    className="w-full px-3 py-2 text-xs border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#6D28D9]"
                  >
                    <option value="New">New</option>
                    <option value="Contacted">Contacted</option>
                    <option value="Qualified">Qualified</option>
                    <option value="Converted">Converted</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#64748B] mb-1">Assigned To</label>
                  <select
                    value={leadFormData.assignedToName}
                    onChange={(e) => {
                      const name = e.target.value;
                      const initials =
                        name === 'Sara El Amrani'
                          ? 'SE'
                          : name === 'Imane Benkirane'
                          ? 'IB'
                          : name === 'Yassine Bouchra'
                          ? 'YB'
                          : 'MZ';
                      setLeadFormData({ ...leadFormData, assignedToName: name, assignedToInitials: initials });
                    }}
                    className="w-full px-3 py-2 text-xs border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#6D28D9]"
                  >
                    <option value="Sara El Amrani">Sara El Amrani (SE)</option>
                    <option value="Imane Benkirane">Imane Benkirane (IB)</option>
                    <option value="Yassine Bouchra">Yassine Bouchra (YB)</option>
                    <option value="Mehdi Zahraoui">Mehdi Zahraoui (MZ)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#64748B] mb-1">Source Campaign</label>
                  <select
                    value={leadFormData.sourceCampaign}
                    onChange={(e) => setLeadFormData({ ...leadFormData, sourceCampaign: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#6D28D9]"
                  >
                    <option value="Autumn Launch 2026">Autumn Launch 2026</option>
                    <option value="October Retargeting">October Retargeting</option>
                    <option value="Summer Clearance">Summer Clearance</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#64748B] mb-1">Next Follow-up</label>
                  <input
                    type="text"
                    value={leadFormData.nextFollowUp}
                    onChange={(e) => setLeadFormData({ ...leadFormData, nextFollowUp: e.target.value })}
                    placeholder="e.g. 18 Oct 2026, 11:00 AM"
                    className="w-full px-3 py-2 text-xs border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#6D28D9]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#64748B] mb-1">Internal Notes</label>
                <textarea
                  rows={2}
                  value={leadFormData.internalNotes}
                  onChange={(e) => setLeadFormData({ ...leadFormData, internalNotes: e.target.value })}
                  placeholder="Notes about lead requirements, conversation points..."
                  className="w-full px-3 py-2 text-xs border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#6D28D9]"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-3 border-t border-[#E2E8F0]">
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
        <div className="fixed inset-0 z-50 bg-[#1E1B4B]/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-[#E2E8F0] w-full max-w-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-[#E2E8F0] flex items-center justify-between">
              <h3 className="text-base font-bold text-[#1E1B4B]">Edit Lead</h3>
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="text-[#94A3B8] hover:text-[#1E1B4B]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="p-6 space-y-4">
              {formError && (
                <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#64748B] mb-1">Contact Name</label>
                  <input
                    type="text"
                    value={leadFormData.name}
                    onChange={(e) => setLeadFormData({ ...leadFormData, name: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#6D28D9]"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#64748B] mb-1">Company</label>
                  <input
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
                  <label className="block text-xs font-semibold text-[#64748B] mb-1">Email</label>
                  <input
                    type="email"
                    value={leadFormData.email}
                    onChange={(e) => setLeadFormData({ ...leadFormData, email: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#6D28D9]"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#64748B] mb-1">Phone</label>
                  <input
                    type="text"
                    value={leadFormData.phone}
                    onChange={(e) => setLeadFormData({ ...leadFormData, phone: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#6D28D9]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#64748B] mb-1">Lead Status</label>
                  <select
                    value={leadFormData.leadStatus}
                    onChange={(e) => setLeadFormData({ ...leadFormData, leadStatus: e.target.value as CRMLeadStatus })}
                    className="w-full px-3 py-2 text-xs border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#6D28D9]"
                  >
                    <option value="New">New</option>
                    <option value="Contacted">Contacted</option>
                    <option value="Qualified">Qualified</option>
                    <option value="Converted">Converted</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#64748B] mb-1">Assigned To</label>
                  <select
                    value={leadFormData.assignedToName}
                    onChange={(e) => {
                      const name = e.target.value;
                      const initials =
                        name === 'Sara El Amrani'
                          ? 'SE'
                          : name === 'Imane Benkirane'
                          ? 'IB'
                          : name === 'Yassine Bouchra'
                          ? 'YB'
                          : 'MZ';
                      setLeadFormData({ ...leadFormData, assignedToName: name, assignedToInitials: initials });
                    }}
                    className="w-full px-3 py-2 text-xs border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#6D28D9]"
                  >
                    <option value="Sara El Amrani">Sara El Amrani (SE)</option>
                    <option value="Imane Benkirane">Imane Benkirane (IB)</option>
                    <option value="Yassine Bouchra">Yassine Bouchra (YB)</option>
                    <option value="Mehdi Zahraoui">Mehdi Zahraoui (MZ)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#64748B] mb-1">Next Follow-up</label>
                  <input
                    type="text"
                    value={leadFormData.nextFollowUp}
                    onChange={(e) => setLeadFormData({ ...leadFormData, nextFollowUp: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#6D28D9]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#64748B] mb-1">Location</label>
                  <input
                    type="text"
                    value={leadFormData.location}
                    onChange={(e) => setLeadFormData({ ...leadFormData, location: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#6D28D9]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#64748B] mb-1">Internal Notes</label>
                <textarea
                  rows={3}
                  value={leadFormData.internalNotes}
                  onChange={(e) => setLeadFormData({ ...leadFormData, internalNotes: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#6D28D9]"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-3 border-t border-[#E2E8F0]">
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
        <div className="fixed inset-0 z-50 bg-[#1E1B4B]/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-[#E2E8F0] w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-[#E2E8F0] flex items-center justify-between">
              <h3 className="text-base font-bold text-[#1E1B4B]">Log Activity</h3>
              <button
                type="button"
                onClick={() => setIsAddActivityModalOpen(false)}
                className="text-[#94A3B8] hover:text-[#1E1B4B]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddActivity} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#64748B] mb-1">Activity Title</label>
                <input
                  type="text"
                  value={activityForm.title}
                  onChange={(e) => setActivityForm({ ...activityForm, title: e.target.value })}
                  placeholder="e.g. Qualification call completed"
                  className="w-full px-3 py-2 text-xs border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#6D28D9]"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#64748B] mb-1">Date & Time</label>
                  <input
                    type="text"
                    value={activityForm.date}
                    onChange={(e) => setActivityForm({ ...activityForm, date: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#6D28D9]"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#64748B] mb-1">Type</label>
                  <select
                    value={activityForm.type}
                    onChange={(e) => setActivityForm({ ...activityForm, type: e.target.value as any })}
                    className="w-full px-3 py-2 text-xs border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#6D28D9]"
                  >
                    <option value="call">Phone Call</option>
                    <option value="email">Email</option>
                    <option value="meeting">Meeting</option>
                    <option value="note">Internal Note</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#64748B] mb-1">Description</label>
                <textarea
                  rows={3}
                  value={activityForm.description}
                  onChange={(e) => setActivityForm({ ...activityForm, description: e.target.value })}
                  placeholder="Summary of what was discussed, next commitments..."
                  className="w-full px-3 py-2 text-xs border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#6D28D9]"
                  required
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-3 border-t border-[#E2E8F0]">
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
        <div className="fixed inset-0 z-50 bg-[#1E1B4B]/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-[#E2E8F0] w-full max-w-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-[#E2E8F0] flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <FileSpreadsheet className="w-5 h-5 text-[#6D28D9]" />
                <h3 className="text-base font-bold text-[#1E1B4B]">Import Leads from CSV</h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsImportModalOpen(false);
                  setCsvFile(null);
                  setCsvPreviewRows([]);
                  setCsvErrors([]);
                }}
                className="text-[#94A3B8] hover:text-[#1E1B4B]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-xs text-[#64748B]">
                Upload a CSV file containing contact records. Expected columns: <strong>Name, Company, Email, Phone, Lead Status</strong>.
              </p>

              {/* Upload Dropzone */}
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-[#DDD6FE] hover:border-[#6D28D9] bg-[#FAF9FD] rounded-xl p-6 text-center cursor-pointer transition-colors"
              >
                <Upload className="w-8 h-8 text-[#6D28D9] mx-auto mb-2" />
                <div className="text-xs font-semibold text-[#1E1B4B]">
                  {csvFile ? csvFile.name : 'Click to select CSV file'}
                </div>
                <div className="text-[11px] text-[#94A3B8] mt-1">
                  Supports UTF-8 CSV documents with comma-separated columns
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </div>

              {/* Validation errors */}
              {csvErrors.length > 0 && (
                <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs space-y-1">
                  {csvErrors.map((err, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>{err}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Preview table */}
              {csvPreviewRows.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-semibold text-[#1E1B4B]">
                    <span>Valid Records Found: {csvPreviewRows.length}</span>
                  </div>
                  <div className="max-h-36 overflow-y-auto border border-[#E2E8F0] rounded-lg">
                    <table className="w-full text-left text-[11px]">
                      <thead className="bg-[#F8F7FC] border-b border-[#E2E8F0] text-[#64748B]">
                        <tr>
                          <th className="p-2">Name</th>
                          <th className="p-2">Company</th>
                          <th className="p-2">Email</th>
                          <th className="p-2">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#F1F5F9]">
                        {csvPreviewRows.map((r, i) => (
                          <tr key={i}>
                            <td className="p-2 font-medium">{r.name}</td>
                            <td className="p-2 text-[#64748B]">{r.company}</td>
                            <td className="p-2 text-[#64748B]">{r.email}</td>
                            <td className="p-2">{r.status}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <div className="pt-3 flex items-center justify-end gap-3 border-t border-[#E2E8F0]">
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
                  className="px-4 py-2 bg-[#6D28D9] hover:bg-[#5B21B6] disabled:bg-[#94A3B8] disabled:cursor-not-allowed text-white text-xs font-semibold rounded-lg shadow-2xs"
                >
                  Import {csvPreviewRows.length > 0 ? `${csvPreviewRows.length} Leads` : ''}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 bg-[#1E1B4B]/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-[#E2E8F0] w-full max-w-sm p-6 text-center">
            <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-3">
              <Trash2 className="w-6 h-6" />
            </div>
            <h4 className="text-base font-bold text-[#1E1B4B]">Delete Contact?</h4>
            <p className="text-xs text-[#64748B] mt-1.5">
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
