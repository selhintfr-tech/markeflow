import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Users,
  Layers,
  Target,
  Plus,
  Search,
  ChevronDown,
  UserCheck,
  Megaphone,
  MapPin,
  User,
  Tag,
  Link as LinkIcon,
  ChevronRight,
  Edit2,
  X,
  Check,
  Trash2,
  Loader2,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useWorkspace } from '../../context/WorkspaceContext';
import { audienceService, type AudienceRecord, type AudienceInput } from './audienceService';
import { campaignService, type CampaignRecord } from '../campaigns/campaignService';
import { ApiError } from '../api/apiClient';
import type { AudienceSegment, CustomerType } from '../../types';
import { AudienceActionMenu } from './components/AudienceActionMenu';

function recordToSegment(record: AudienceRecord): AudienceSegment {
  const demographics = record.demographics || {};
  const segCriteria = record.segmentation_criteria || {};
  const locationsStr =
    record.locations && record.locations.length > 0
      ? record.locations.join(', ')
      : ((segCriteria.city as string) || 'Casablanca, Rabat');
  const interestsStr =
    record.interests && record.interests.length > 0
      ? record.interests.join(', ')
      : 'Promotions, everyday essentials, online shopping';
  const ageRangeStr = (demographics.age_range as string) || '25–40';
  const customerTypeVal = (demographics.customer_type as CustomerType) || 'Prospects';
  const sourceStr = (segCriteria.source as string) || 'Website forms, social campaigns';

  const campaignNames = record.campaigns ? record.campaigns.map((c) => c.name) : [];

  return {
    id: record.id,
    name: record.name,
    description: record.description || `${record.name} target audience segment`,
    region: locationsStr,
    customerType: customerTypeVal,
    ageRange: ageRangeStr,
    contactCount: record.estimated_size ?? 0,
    associatedCampaigns: campaignNames,
    updated: record.updated_at
      ? new Date(record.updated_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
      : 'Recently',
    status: record.status || 'Active',
    filterConditions: {
      city: (segCriteria.city as string) || locationsStr,
      ageRange: ageRangeStr,
      customerStatus: customerTypeVal === 'Prospects' ? 'Prospect' : customerTypeVal,
      interests: interestsStr,
      acquisitionSource: sourceStr,
    },
    moduleConnections: {
      crmContactsCount: record.estimated_size ?? 0,
      campaigns: campaignNames,
    },
  };
}

export const AudiencesPage: React.FC = () => {
  const navigate = useNavigate();
  const { currentWorkspace, hasWorkspace, isLoadingWorkspaces } = useWorkspace();

  // State
  const [segments, setSegments] = useState<AudienceSegment[]>([]);
  const [rawRecords, setRawRecords] = useState<AudienceRecord[]>([]);
  const [workspaceCampaigns, setWorkspaceCampaigns] = useState<CampaignRecord[]>([]);
  const [selectedSegmentId, setSelectedSegmentId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRegion, setSelectedRegion] = useState('All regions');
  const [sortBy, setSortBy] = useState<'updated' | 'name' | 'contacts'>('updated');

  // Async UI states
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Dialog states
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isUseInCampaignOpen, setIsUseInCampaignOpen] = useState(false);
  const [activeMenuSegmentId, setActiveMenuSegmentId] = useState<string | null>(null);
  const [deleteConfirmSegId, setDeleteConfirmSegId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Form states for Create / Edit
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    region: 'Casablanca, Rabat',
    customerType: 'Prospects' as CustomerType,
    ageRange: '25–40',
    contactCount: 2500,
    associatedCampaigns: '',
    cityCondition: 'Casablanca, Rabat',
    interests: 'Promotions, everyday essentials, online shopping',
    source: 'Website forms, social campaigns',
    status: 'Active' as 'Active' | 'Draft' | 'Archived',
  });

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Fetch audiences and campaigns for the active workspace
  const loadData = useCallback(async () => {
    if (!currentWorkspace?.id) {
      setSegments([]);
      setRawRecords([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setLoadError(null);

    try {
      const [audienceRecords, campaignRecords] = await Promise.all([
        audienceService.list(currentWorkspace.id),
        campaignService.list(currentWorkspace.id).catch(() => [] as CampaignRecord[]),
      ]);

      setRawRecords(audienceRecords);
      const mapped = audienceRecords.map(recordToSegment);
      setSegments(mapped);
      setWorkspaceCampaigns(campaignRecords);

      if (mapped.length > 0) {
        setSelectedSegmentId((prev) => (mapped.some((s) => s.id === prev) ? prev : mapped[0].id));
      } else {
        setSelectedSegmentId('');
      }
    } catch (err: unknown) {
      const msg = err instanceof ApiError ? err.message : 'Unable to load audience segments for this workspace.';
      setLoadError(msg);
    } finally {
      setIsLoading(false);
    }
  }, [currentWorkspace?.id]);

  useEffect(() => {
    if (!isLoadingWorkspaces) {
      loadData();
    }
  }, [isLoadingWorkspaces, loadData]);

  // Escape key handler for modals
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (deleteConfirmSegId) setDeleteConfirmSegId(null);
        else if (isCreateOpen) setIsCreateOpen(false);
        else if (isEditOpen) setIsEditOpen(false);
        else if (isUseInCampaignOpen) setIsUseInCampaignOpen(false);
        else if (activeMenuSegmentId) setActiveMenuSegmentId(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [deleteConfirmSegId, isCreateOpen, isEditOpen, isUseInCampaignOpen, activeMenuSegmentId]);

  // The active selected segment
  const selectedSegment = useMemo(() => {
    return segments.find((s) => s.id === selectedSegmentId) || segments[0] || null;
  }, [segments, selectedSegmentId]);

  const selectedRawRecord = useMemo(() => {
    return rawRecords.find((r) => r.id === selectedSegment?.id) || null;
  }, [rawRecords, selectedSegment?.id]);

  // Dynamic KPI Stats derived from real data
  const kpiStats = useMemo(() => {
    const totalContacts = segments.reduce((sum, s) => sum + (s.contactCount || 0), 0);
    const activeCount = segments.filter((s) => s.status === 'Active').length;
    const leadsCount = segments
      .filter((s) => s.customerType === 'Leads' || s.customerType === 'Prospects')
      .reduce((sum, s) => sum + (s.contactCount || 0), 0);

    return {
      totalContacts,
      activeSegments: activeCount,
      qualifiedLeads: leadsCount,
    };
  }, [segments]);

  // Filtering and sorting
  const filteredSegments = useMemo(() => {
    return segments
      .filter((seg) => {
        const matchesSearch =
          seg.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          seg.region.toLowerCase().includes(searchQuery.toLowerCase()) ||
          seg.customerType.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesRegion =
          selectedRegion === 'All regions' || seg.region.toLowerCase().includes(selectedRegion.toLowerCase());
        return matchesSearch && matchesRegion;
      })
      .sort((a, b) => {
        if (sortBy === 'name') return a.name.localeCompare(b.name);
        if (sortBy === 'contacts') return b.contactCount - a.contactCount;
        return 0;
      });
  }, [segments, searchQuery, selectedRegion, sortBy]);

  // Handlers for Modals
  const handleOpenCreate = () => {
    setActionError(null);
    setFormData({
      name: '',
      description: '',
      region: 'Casablanca, Rabat',
      customerType: 'Prospects',
      ageRange: '25–40',
      contactCount: 2500,
      associatedCampaigns: '',
      cityCondition: 'Casablanca, Rabat',
      interests: 'Promotions, modern fashion, accessories',
      source: 'Website forms, social campaigns',
      status: 'Active',
    });
    setIsCreateOpen(true);
  };

  const handleSaveCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentWorkspace?.id || !formData.name.trim() || isSubmitting) return;

    setIsSubmitting(true);
    setActionError(null);

    try {
      const locations = formData.region
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      const interests = formData.interests
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);

      const input: AudienceInput = {
        name: formData.name.trim(),
        description: formData.description.trim() || null,
        demographics: {
          age_range: formData.ageRange,
          customer_type: formData.customerType,
        },
        locations: locations.length > 0 ? locations : null,
        interests: interests.length > 0 ? interests : null,
        segmentation_criteria: {
          city: formData.cityCondition,
          source: formData.source,
        },
        estimated_size: Number(formData.contactCount) || 0,
        status: formData.status,
      };

      const created = await audienceService.create(currentWorkspace.id, input);
      setRawRecords((prev) => [created, ...prev]);
      const mapped = recordToSegment(created);
      setSegments((prev) => [mapped, ...prev]);
      setSelectedSegmentId(mapped.id);
      setIsCreateOpen(false);
      showToast(`Created segment "${mapped.name}"`);
    } catch (err: unknown) {
      const msg = err instanceof ApiError ? err.message : 'Failed to create audience segment.';
      setActionError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenEdit = (seg: AudienceSegment) => {
    setActionError(null);
    setFormData({
      name: seg.name,
      description: seg.description || '',
      region: seg.region,
      customerType: seg.customerType,
      ageRange: seg.ageRange,
      contactCount: seg.contactCount,
      associatedCampaigns: seg.associatedCampaigns.join(', '),
      cityCondition: seg.filterConditions.city,
      interests: seg.filterConditions.interests,
      source: seg.filterConditions.acquisitionSource,
      status: seg.status,
    });
    setIsEditOpen(true);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentWorkspace?.id || !selectedSegment || isSubmitting) return;

    setIsSubmitting(true);
    setActionError(null);

    try {
      const locations = formData.region
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      const interests = formData.interests
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);

      const input: Partial<AudienceInput> = {
        name: formData.name.trim() || selectedSegment.name,
        description: formData.description.trim() || null,
        demographics: {
          age_range: formData.ageRange,
          customer_type: formData.customerType,
        },
        locations: locations.length > 0 ? locations : null,
        interests: interests.length > 0 ? interests : null,
        segmentation_criteria: {
          city: formData.cityCondition,
          source: formData.source,
        },
        estimated_size: Number(formData.contactCount) || 0,
        status: formData.status,
      };

      const updated = await audienceService.update(currentWorkspace.id, selectedSegment.id, input);
      setRawRecords((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
      const mapped = recordToSegment(updated);
      setSegments((prev) => prev.map((s) => (s.id === mapped.id ? mapped : s)));
      setIsEditOpen(false);
      showToast(`Updated segment "${mapped.name}"`);
    } catch (err: unknown) {
      const msg = err instanceof ApiError ? err.message : 'Failed to update audience segment.';
      setActionError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteSegment = async (id: string) => {
    if (!currentWorkspace?.id || isSubmitting) return;

    setIsSubmitting(true);
    setActionError(null);

    try {
      await audienceService.delete(currentWorkspace.id, id);
      setRawRecords((prev) => prev.filter((r) => r.id !== id));
      const remaining = segments.filter((s) => s.id !== id);
      setSegments(remaining);
      if (selectedSegmentId === id) {
        setSelectedSegmentId(remaining.length > 0 ? remaining[0].id : '');
      }
      setDeleteConfirmSegId(null);
      setActiveMenuSegmentId(null);
      showToast('Audience segment deleted.');
    } catch (err: unknown) {
      const msg = err instanceof ApiError ? err.message : 'Failed to delete audience segment.';
      setActionError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Toggle attaching a campaign to the selected audience segment
  const handleToggleCampaignAttachment = async (campaign: CampaignRecord) => {
    if (!currentWorkspace?.id || !selectedSegment || !selectedRawRecord || isSubmitting) return;

    const currentCampaignIds = (selectedRawRecord.campaign_ids || []).slice();
    const isAttached = currentCampaignIds.includes(campaign.id);
    const updatedIds = isAttached
      ? currentCampaignIds.filter((cid) => cid !== campaign.id)
      : [...currentCampaignIds, campaign.id];

    setIsSubmitting(true);
    try {
      const updated = await audienceService.update(currentWorkspace.id, selectedSegment.id, {
        campaign_ids: updatedIds,
      });

      setRawRecords((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
      const mapped = recordToSegment(updated);
      setSegments((prev) => prev.map((s) => (s.id === mapped.id ? mapped : s)));
      showToast(isAttached ? `Detached from ${campaign.name}` : `Attached to ${campaign.name}`);
    } catch (err: unknown) {
      const msg = err instanceof ApiError ? err.message : 'Failed to update campaign attachment.';
      showToast(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto pb-12 font-sans">
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
          Management
        </span>
        <span>/</span>
        <span className="text-[#1E1B4B] font-medium">Audiences</span>
      </div>

      {/* Action / Load Error Notification */}
      {(loadError || actionError) && (
        <div className="p-4 rounded-xl border border-rose-200 bg-rose-50 text-rose-800 flex items-start justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{loadError || actionError}</span>
          </div>
          <button
            type="button"
            onClick={loadData}
            className="inline-flex items-center gap-1 text-xs font-semibold text-rose-700 hover:underline shrink-0"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Retry</span>
          </button>
        </div>
      )}

      {/* Title & Primary Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-extrabold tracking-tight text-[#1E1B4B]">
            Audience Segments
          </h1>
          <p className="text-sm text-[#64748B] mt-1">
            Organize and understand your target customers {currentWorkspace?.name ? `in ${currentWorkspace.name}` : ''}
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenCreate}
          disabled={!hasWorkspace}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-[#6D28D9] hover:bg-[#5B21B6] disabled:opacity-50 text-white text-sm font-semibold shadow-xs transition-colors shrink-0"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>Create segment</span>
        </button>
      </div>

      {/* Top KPI Cards (Three large horizontal white cards) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* KPI 1 — Total Contacts */}
        <div className="bg-white rounded-xl border border-[#E2E8F0] p-6 shadow-xs flex items-center gap-4">
          <div className="w-14 h-14 rounded-xl bg-[#EDE9FE] text-[#6D28D9] flex items-center justify-center shrink-0">
            <Users className="w-7 h-7 stroke-[1.8]" />
          </div>
          <div className="min-w-0">
            <div className="text-xs font-medium text-[#64748B]">Total Contacts</div>
            <div className="text-2xl lg:text-[28px] font-extrabold text-[#1E1B4B] tracking-tight leading-none mt-1">
              {isLoading ? '...' : kpiStats.totalContacts.toLocaleString()}
            </div>
            <div className="flex items-center gap-1 mt-2 text-xs">
              <span className="text-[#0D9488] font-bold inline-flex items-center">Active audience</span>
              <span className="text-[#94A3B8]">across segments</span>
            </div>
          </div>
        </div>

        {/* KPI 2 — Active Segments */}
        <div className="bg-white rounded-xl border border-[#E2E8F0] p-6 shadow-xs flex items-center gap-4">
          <div className="w-14 h-14 rounded-xl bg-[#CCFBF1] text-[#0D9488] flex items-center justify-center shrink-0">
            <Layers className="w-7 h-7 stroke-[1.8]" />
          </div>
          <div className="min-w-0">
            <div className="text-xs font-medium text-[#64748B]">Active Segments</div>
            <div className="text-2xl lg:text-[28px] font-extrabold text-[#1E1B4B] tracking-tight leading-none mt-1">
              {isLoading ? '...' : kpiStats.activeSegments}
            </div>
            <div className="flex items-center gap-1 mt-2 text-xs">
              <span className="text-[#0D9488] font-bold inline-flex items-center">{segments.length} Total</span>
              <span className="text-[#94A3B8]">defined in workspace</span>
            </div>
          </div>
        </div>

        {/* KPI 3 — Qualified Leads */}
        <div className="bg-white rounded-xl border border-[#E2E8F0] p-6 shadow-xs flex items-center gap-4">
          <div className="w-14 h-14 rounded-xl bg-[#CCFBF1] text-[#0D9488] flex items-center justify-center shrink-0">
            <Target className="w-7 h-7 stroke-[1.8]" />
          </div>
          <div className="min-w-0">
            <div className="text-xs font-medium text-[#64748B]">Prospects & Leads</div>
            <div className="text-2xl lg:text-[28px] font-extrabold text-[#1E1B4B] tracking-tight leading-none mt-1">
              {isLoading ? '...' : kpiStats.qualifiedLeads.toLocaleString()}
            </div>
            <div className="flex items-center gap-1 mt-2 text-xs">
              <span className="text-[#0D9488] font-bold inline-flex items-center">Targetable</span>
              <span className="text-[#94A3B8]">growth opportunities</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Layout (Table on left, Details on right) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* LEFT COLUMN: Segment Table & Toolbar (2/3 width) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-xl border border-[#E2E8F0] p-6 shadow-xs">
            <div className="flex items-center justify-between pb-4">
              <h2 className="text-base font-bold text-[#1E1B4B]">Segments</h2>
              <span className="text-xs text-[#64748B]">{filteredSegments.length} items</span>
            </div>

            {/* Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-3 pb-5 border-b border-[#F1F5F9]">
              <div className="flex flex-wrap items-center gap-3">
                {/* Search */}
                <div className="relative min-w-[200px]">
                  <Search className="w-4 h-4 text-[#94A3B8] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search segments..."
                    className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-[#E2E8F0] bg-white text-[#1E1B4B] placeholder-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#6D28D9]/20 focus:border-[#6D28D9]"
                  />
                </div>

                {/* Region Filter */}
                <div className="relative">
                  <select
                    value={selectedRegion}
                    onChange={(e) => setSelectedRegion(e.target.value)}
                    className="appearance-none pl-3 pr-8 py-1.5 text-xs rounded-lg border border-[#E2E8F0] bg-white text-[#1E1B4B] focus:outline-none focus:ring-2 focus:ring-[#6D28D9]/20 focus:border-[#6D28D9] cursor-pointer"
                  >
                    <option value="All regions">All regions</option>
                    <option value="Casablanca">Casablanca</option>
                    <option value="Rabat">Rabat</option>
                    <option value="Marrakech">Marrakech</option>
                    <option value="National">National</option>
                  </select>
                  <ChevronDown className="w-3.5 h-3.5 text-[#94A3B8] absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>

                {/* Sort Filter */}
                <div className="relative">
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as 'updated' | 'name' | 'contacts')}
                    className="appearance-none pl-3 pr-8 py-1.5 text-xs rounded-lg border border-[#E2E8F0] bg-white text-[#1E1B4B] focus:outline-none focus:ring-2 focus:ring-[#6D28D9]/20 focus:border-[#6D28D9] cursor-pointer"
                  >
                    <option value="updated">Sort by: Updated</option>
                    <option value="name">Sort by: Name</option>
                    <option value="contacts">Sort by: Size</option>
                  </select>
                  <ChevronDown className="w-3.5 h-3.5 text-[#94A3B8] absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              {/* Cross-Module Navigation Shortcuts */}
              <div className="flex items-center gap-4 text-xs font-medium text-[#6D28D9]">
                <button
                  type="button"
                  onClick={() => navigate('/crm')}
                  className="inline-flex items-center gap-1.5 hover:underline cursor-pointer"
                >
                  <UserCheck className="w-4 h-4 text-[#6D28D9]" />
                  <span>CRM & Leads</span>
                </button>
                <button
                  type="button"
                  onClick={() => navigate('/campaigns')}
                  className="inline-flex items-center gap-1.5 hover:underline cursor-pointer"
                >
                  <Megaphone className="w-4 h-4 text-[#6D28D9]" />
                  <span>Campaigns</span>
                </button>
              </div>
            </div>

            {/* Loading Spinner */}
            {isLoading && (
              <div className="py-16 flex flex-col items-center justify-center text-xs text-[#64748B]">
                <Loader2 className="w-7 h-7 text-[#6D28D9] animate-spin mb-2" />
                <span>Loading audience segments...</span>
              </div>
            )}

            {/* Segments Table */}
            {!isLoading && (
              <div className="overflow-x-auto mt-2">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-[#F1F5F9] text-[#64748B] font-semibold">
                      <th className="py-3 px-3">Segment Name</th>
                      <th className="py-3 px-3">Region</th>
                      <th className="py-3 px-3">Customer Type</th>
                      <th className="py-3 px-3">Age Range</th>
                      <th className="py-3 px-3">Contact Count</th>
                      <th className="py-3 px-3">Associated Campaigns</th>
                      <th className="py-3 px-3">Updated</th>
                      <th className="py-3 px-3 text-right"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F1F5F9]">
                    {filteredSegments.map((seg) => {
                      const isSelected = seg.id === selectedSegmentId;
                      return (
                        <tr
                          key={seg.id}
                          onClick={() => setSelectedSegmentId(seg.id)}
                          className={`transition-colors cursor-pointer ${
                            isSelected ? 'bg-[#F5F3FF]' : 'hover:bg-slate-50/70'
                          }`}
                        >
                          {/* Name */}
                          <td className="py-4 px-3 font-semibold text-[#6D28D9] hover:underline">
                            {seg.name}
                          </td>

                          {/* Region */}
                          <td className="py-4 px-3 text-[#1E1B4B]">{seg.region}</td>

                          {/* Customer Type with soft pill */}
                          <td className="py-4 px-3">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium ${
                                seg.customerType === 'Prospects'
                                  ? 'bg-[#EDE9FE] text-[#6D28D9]'
                                  : seg.customerType === 'Existing customers'
                                  ? 'bg-[#CCFBF1] text-[#0D9488]'
                                  : 'bg-[#FEF3C7] text-[#D97706]'
                              }`}
                            >
                              {seg.customerType}
                            </span>
                          </td>

                          {/* Age Range */}
                          <td className="py-4 px-3 text-[#64748B]">{seg.ageRange}</td>

                          {/* Contact Count */}
                          <td className="py-4 px-3 font-semibold text-[#1E1B4B]">
                            {seg.contactCount.toLocaleString()}
                          </td>

                          {/* Associated Campaigns */}
                          <td className="py-4 px-3 text-[#64748B]">
                            {seg.associatedCampaigns.length > 0 ? (
                              <div className="flex flex-wrap gap-1">
                                {seg.associatedCampaigns.slice(0, 2).map((camp, idx) => (
                                  <span
                                    key={idx}
                                    className="inline-block px-1.5 py-0.5 rounded bg-slate-100 text-[#1E1B4B] text-[10px]"
                                  >
                                    {camp}
                                  </span>
                                ))}
                                {seg.associatedCampaigns.length > 2 && (
                                  <span className="text-[10px] text-[#94A3B8]">
                                    +{seg.associatedCampaigns.length - 2}
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-[#94A3B8]">—</span>
                            )}
                          </td>

                          {/* Updated */}
                          <td className="py-4 px-3 text-[#64748B] whitespace-nowrap">{seg.updated}</td>

                          {/* Row Action Menu */}
                          <td className="py-4 px-3 text-right">
                            <AudienceActionMenu
                              segment={seg}
                              isOpen={activeMenuSegmentId === seg.id}
                              onToggle={() => setActiveMenuSegmentId(activeMenuSegmentId === seg.id ? null : seg.id)}
                              onClose={() => setActiveMenuSegmentId(null)}
                              onEdit={handleOpenEdit}
                              onUseInCampaign={(s) => {
                                setSelectedSegmentId(s.id);
                                setIsUseInCampaignOpen(true);
                              }}
                              onDelete={(s) => {
                                setDeleteConfirmSegId(s.id);
                              }}
                            />
                          </td>
                        </tr>
                      );
                    })}

                    {filteredSegments.length === 0 && (
                      <tr>
                        <td colSpan={8} className="py-12 text-center">
                          <div className="flex flex-col items-center justify-center max-w-sm mx-auto">
                            <div className="w-10 h-10 rounded-full bg-[#EDE9FE] text-[#6D28D9] flex items-center justify-center mb-3">
                              <Users className="w-5 h-5" />
                            </div>
                            <h4 className="text-sm font-bold text-[#1E1B4B]">No audience segments found</h4>
                            <p className="text-xs text-[#64748B] mt-1">
                              {segments.length === 0
                                ? 'No audience segments created yet. Click "Create segment" to get started.'
                                : 'No segments match your current search and region filter.'}
                            </p>
                            <div className="mt-4 flex items-center gap-2">
                              {searchQuery || selectedRegion !== 'All regions' ? (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSearchQuery('');
                                    setSelectedRegion('All regions');
                                  }}
                                  className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-[#EDE9FE] text-[#6D28D9] hover:bg-[#DDD6FE] transition-colors"
                                >
                                  Clear filters
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={handleOpenCreate}
                                  className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-[#6D28D9] text-white hover:bg-[#5B21B6] transition-colors"
                                >
                                  Create Segment
                                </button>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT PANEL: Selected Segment Details (1/3 width) */}
        {selectedSegment ? (
          <div className="bg-white rounded-xl border border-[#E2E8F0] p-6 shadow-xs flex flex-col justify-between space-y-6">
            <div>
              {/* Header: Title, subtitle & three-dot actions */}
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h2 className="text-lg font-bold text-[#1E1B4B]">{selectedSegment.name}</h2>
                  <p className="text-xs text-[#64748B] mt-0.5">
                    {selectedSegment.description || 'Target customer segment'}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => handleOpenEdit(selectedSegment)}
                    className="p-1.5 rounded-lg hover:bg-slate-100 text-[#64748B] hover:text-[#1E1B4B]"
                    title="Edit segment"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteConfirmSegId(selectedSegment.id)}
                    className="p-1.5 rounded-lg hover:bg-rose-50 text-[#94A3B8] hover:text-rose-600"
                    title="Delete segment"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Status & Size Badges */}
              <div className="flex items-center gap-2 mt-3">
                <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-[#EDE9FE] text-[#6D28D9]">
                  {selectedSegment.customerType}
                </span>
                <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-[#F1F5F9] text-[#64748B]">
                  {selectedSegment.status}
                </span>
                <span className="text-xs font-bold text-[#1E1B4B] ml-auto">
                  {selectedSegment.contactCount.toLocaleString()} contacts
                </span>
              </div>

              {/* SECTION: Filter Conditions Applied */}
              <div className="mt-6 pt-5 border-t border-[#F1F5F9] space-y-3.5 text-xs">
                <div className="text-[11px] font-bold text-[#1E1B4B] uppercase tracking-wider">
                  Targeting & Demographics
                </div>

                <div className="flex items-start gap-2.5">
                  <MapPin className="w-4 h-4 text-[#6D28D9] shrink-0 mt-0.5" />
                  <div>
                    <span className="text-[#64748B] block text-[11px]">Locations</span>
                    <span className="font-semibold text-[#1E1B4B]">{selectedSegment.region}</span>
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <User className="w-4 h-4 text-[#6D28D9] shrink-0 mt-0.5" />
                  <div>
                    <span className="text-[#64748B] block text-[11px]">Age & Profile</span>
                    <span className="font-semibold text-[#1E1B4B]">
                      {selectedSegment.ageRange} • {selectedSegment.customerType}
                    </span>
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <Tag className="w-4 h-4 text-[#6D28D9] shrink-0 mt-0.5" />
                  <div>
                    <span className="text-[#64748B] block text-[11px]">Interests</span>
                    <span className="font-semibold text-[#1E1B4B]">
                      {selectedSegment.filterConditions.interests}
                    </span>
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <LinkIcon className="w-4 h-4 text-[#6D28D9] shrink-0 mt-0.5" />
                  <div>
                    <span className="text-[#64748B] block text-[11px]">Acquisition Source</span>
                    <span className="font-semibold text-[#1E1B4B]">
                      {selectedSegment.filterConditions.acquisitionSource}
                    </span>
                  </div>
                </div>
              </div>

              {/* SECTION: Connected Campaigns */}
              <div className="mt-6 pt-5 border-t border-[#F1F5F9] space-y-3 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-[#1E1B4B] uppercase tracking-wider">
                    Associated Campaigns
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsUseInCampaignOpen(true)}
                    className="text-[11px] font-semibold text-[#6D28D9] hover:underline"
                  >
                    Manage
                  </button>
                </div>

                {selectedSegment.associatedCampaigns.length > 0 ? (
                  <div className="space-y-1.5">
                    {selectedSegment.associatedCampaigns.map((campName, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between p-2 rounded-lg bg-[#F8F7FC] border border-[#F1F5F9] text-xs text-[#1E1B4B]"
                      >
                        <div className="flex items-center gap-2">
                          <Megaphone className="w-3.5 h-3.5 text-[#6D28D9]" />
                          <span className="font-medium">{campName}</span>
                        </div>
                        <ChevronRight className="w-3.5 h-3.5 text-[#94A3B8]" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-[#94A3B8]">Not currently connected to any campaigns.</p>
                )}
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="flex flex-col sm:flex-row gap-2 pt-4 border-t border-[#F1F5F9]">
              <button
                type="button"
                onClick={() => handleOpenEdit(selectedSegment)}
                className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg bg-[#6D28D9] hover:bg-[#5B21B6] text-white text-xs font-semibold shadow-xs transition-colors"
              >
                <Edit2 className="w-3.5 h-3.5" />
                <span>Edit Segment</span>
              </button>

              <button
                type="button"
                onClick={() => setIsUseInCampaignOpen(true)}
                className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg border border-[#E2E8F0] hover:bg-slate-50 text-[#1E1B4B] text-xs font-medium transition-colors"
              >
                <Megaphone className="w-3.5 h-3.5 text-[#64748B]" />
                <span>Use in Campaign</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-[#E2E8F0] p-6 shadow-xs text-center text-xs text-[#64748B]">
            Select a segment to view details
          </div>
        )}
      </div>

      {/* CREATE SEGMENT MODAL */}
      {isCreateOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-2xs p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-[#E2E8F0] flex items-center justify-between">
              <h3 className="text-base font-bold text-[#1E1B4B]">Create Audience Segment</h3>
              <button
                type="button"
                onClick={() => setIsCreateOpen(false)}
                className="text-[#94A3B8] hover:text-[#1E1B4B] p-1 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCreate} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-medium text-[#1E1B4B] mb-1">Segment Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Rabat VIP Shoppers"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-[#E2E8F0] text-xs text-[#1E1B4B] focus:outline-none focus:ring-2 focus:ring-[#6D28D9]/20 focus:border-[#6D28D9]"
                />
              </div>

              <div>
                <label className="block font-medium text-[#1E1B4B] mb-1">Description</label>
                <input
                  type="text"
                  placeholder="e.g. High net worth shoppers in modern retail stores"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-[#E2E8F0] text-xs text-[#1E1B4B] focus:outline-none focus:ring-2 focus:ring-[#6D28D9]/20 focus:border-[#6D28D9]"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-medium text-[#1E1B4B] mb-1">Region</label>
                  <input
                    type="text"
                    value={formData.region}
                    onChange={(e) => setFormData({ ...formData, region: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-[#E2E8F0] text-xs text-[#1E1B4B] focus:outline-none focus:ring-2 focus:ring-[#6D28D9]/20 focus:border-[#6D28D9]"
                  />
                </div>

                <div>
                  <label className="block font-medium text-[#1E1B4B] mb-1">Customer Type</label>
                  <select
                    value={formData.customerType}
                    onChange={(e) => setFormData({ ...formData, customerType: e.target.value as CustomerType })}
                    className="w-full px-3 py-2 rounded-lg border border-[#E2E8F0] text-xs text-[#1E1B4B] bg-white focus:outline-none focus:ring-2 focus:ring-[#6D28D9]/20 focus:border-[#6D28D9]"
                  >
                    <option value="Prospects">Prospects</option>
                    <option value="Existing customers">Existing customers</option>
                    <option value="Leads">Leads</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-medium text-[#1E1B4B] mb-1">Age Range</label>
                  <input
                    type="text"
                    value={formData.ageRange}
                    onChange={(e) => setFormData({ ...formData, ageRange: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-[#E2E8F0] text-xs text-[#1E1B4B] focus:outline-none focus:ring-2 focus:ring-[#6D28D9]/20 focus:border-[#6D28D9]"
                  />
                </div>

                <div>
                  <label className="block font-medium text-[#1E1B4B] mb-1">Initial Contact Count</label>
                  <input
                    type="number"
                    value={formData.contactCount}
                    onChange={(e) => setFormData({ ...formData, contactCount: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-lg border border-[#E2E8F0] text-xs text-[#1E1B4B] focus:outline-none focus:ring-2 focus:ring-[#6D28D9]/20 focus:border-[#6D28D9]"
                  />
                </div>
              </div>

              {/* Conditions Sub-section */}
              <div className="p-3 rounded-lg border border-[#F1F5F9] bg-[#F8F7FC] space-y-3">
                <span className="font-bold text-[#1E1B4B] block text-[11px] uppercase tracking-wide">
                  Detailed Filter Conditions
                </span>

                <div>
                  <label className="block text-[#64748B] mb-0.5">Target Cities</label>
                  <input
                    type="text"
                    value={formData.cityCondition}
                    onChange={(e) => setFormData({ ...formData, cityCondition: e.target.value })}
                    className="w-full px-2.5 py-1.5 rounded border border-[#E2E8F0] text-xs bg-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[#64748B] mb-0.5">Key Interests</label>
                  <input
                    type="text"
                    value={formData.interests}
                    onChange={(e) => setFormData({ ...formData, interests: e.target.value })}
                    className="w-full px-2.5 py-1.5 rounded border border-[#E2E8F0] text-xs bg-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[#64748B] mb-0.5">Acquisition Source</label>
                  <input
                    type="text"
                    value={formData.source}
                    onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                    className="w-full px-2.5 py-1.5 rounded border border-[#E2E8F0] text-xs bg-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[#64748B] mb-0.5">Segment Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as 'Active' | 'Draft' | 'Archived' })}
                    className="w-full px-2.5 py-1.5 rounded border border-[#E2E8F0] text-xs bg-white focus:outline-none"
                  >
                    <option value="Active">Active</option>
                    <option value="Draft">Draft</option>
                    <option value="Archived">Archived</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#E2E8F0]">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-4 py-2 rounded-lg border border-[#E2E8F0] text-[#64748B] hover:bg-slate-50 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-lg bg-[#6D28D9] hover:bg-[#5B21B6] disabled:opacity-50 text-white font-semibold shadow-xs inline-flex items-center gap-1.5"
                >
                  {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Create Segment</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT SEGMENT MODAL */}
      {isEditOpen && selectedSegment && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-2xs p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-[#E2E8F0] flex items-center justify-between">
              <h3 className="text-base font-bold text-[#1E1B4B]">Edit Audience Segment</h3>
              <button
                type="button"
                onClick={() => setIsEditOpen(false)}
                className="text-[#94A3B8] hover:text-[#1E1B4B] p-1 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-medium text-[#1E1B4B] mb-1">Segment Name *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-[#E2E8F0] text-xs text-[#1E1B4B] focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-medium text-[#1E1B4B] mb-1">Description</label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-[#E2E8F0] text-xs text-[#1E1B4B] focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-medium text-[#1E1B4B] mb-1">Region</label>
                  <input
                    type="text"
                    value={formData.region}
                    onChange={(e) => setFormData({ ...formData, region: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-[#E2E8F0] text-xs text-[#1E1B4B] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-medium text-[#1E1B4B] mb-1">Customer Type</label>
                  <select
                    value={formData.customerType}
                    onChange={(e) => setFormData({ ...formData, customerType: e.target.value as CustomerType })}
                    className="w-full px-3 py-2 rounded-lg border border-[#E2E8F0] text-xs text-[#1E1B4B] bg-white focus:outline-none"
                  >
                    <option value="Prospects">Prospects</option>
                    <option value="Existing customers">Existing customers</option>
                    <option value="Leads">Leads</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-medium text-[#1E1B4B] mb-1">Age Range</label>
                  <input
                    type="text"
                    value={formData.ageRange}
                    onChange={(e) => setFormData({ ...formData, ageRange: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-[#E2E8F0] text-xs text-[#1E1B4B] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-medium text-[#1E1B4B] mb-1">Contact Count</label>
                  <input
                    type="number"
                    value={formData.contactCount}
                    onChange={(e) => setFormData({ ...formData, contactCount: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-lg border border-[#E2E8F0] text-xs text-[#1E1B4B] focus:outline-none"
                  />
                </div>
              </div>

              <div className="p-3 rounded-lg border border-[#F1F5F9] bg-[#F8F7FC] space-y-3">
                <span className="font-bold text-[#1E1B4B] block text-[11px] uppercase tracking-wide">
                  Detailed Filter Conditions
                </span>

                <div>
                  <label className="block text-[#64748B] mb-0.5">Target Cities</label>
                  <input
                    type="text"
                    value={formData.cityCondition}
                    onChange={(e) => setFormData({ ...formData, cityCondition: e.target.value })}
                    className="w-full px-2.5 py-1.5 rounded border border-[#E2E8F0] text-xs bg-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[#64748B] mb-0.5">Key Interests</label>
                  <input
                    type="text"
                    value={formData.interests}
                    onChange={(e) => setFormData({ ...formData, interests: e.target.value })}
                    className="w-full px-2.5 py-1.5 rounded border border-[#E2E8F0] text-xs bg-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[#64748B] mb-0.5">Acquisition Source</label>
                  <input
                    type="text"
                    value={formData.source}
                    onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                    className="w-full px-2.5 py-1.5 rounded border border-[#E2E8F0] text-xs bg-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[#64748B] mb-0.5">Segment Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as 'Active' | 'Draft' | 'Archived' })}
                    className="w-full px-2.5 py-1.5 rounded border border-[#E2E8F0] text-xs bg-white focus:outline-none"
                  >
                    <option value="Active">Active</option>
                    <option value="Draft">Draft</option>
                    <option value="Archived">Archived</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#E2E8F0]">
                <button
                  type="button"
                  onClick={() => setIsEditOpen(false)}
                  className="px-4 py-2 rounded-lg border border-[#E2E8F0] text-[#64748B] hover:bg-slate-50 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-lg bg-[#6D28D9] hover:bg-[#5B21B6] disabled:opacity-50 text-white font-semibold shadow-xs inline-flex items-center gap-1.5"
                >
                  {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Save Changes</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* USE IN CAMPAIGN MODAL (Uses Real Campaigns) */}
      {isUseInCampaignOpen && selectedSegment && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-2xs p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-2xl w-full max-w-md p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0]">
              <h3 className="text-base font-bold text-[#1E1B4B]">Attach Segment to Campaign</h3>
              <button
                type="button"
                onClick={() => setIsUseInCampaignOpen(false)}
                className="text-[#94A3B8] hover:text-[#1E1B4B] p-1 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-[#64748B]">
              Connect <span className="font-semibold text-[#1E1B4B]">{selectedSegment.name}</span> to active workspace campaigns:
            </p>

            <div className="space-y-2 max-h-60 overflow-y-auto">
              {workspaceCampaigns.length > 0 ? (
                workspaceCampaigns.map((camp) => {
                  const isAlreadyLinked =
                    selectedRawRecord?.campaign_ids?.includes(camp.id) ||
                    selectedSegment.associatedCampaigns.includes(camp.name);
                  return (
                    <div
                      key={camp.id}
                      onClick={() => handleToggleCampaignAttachment(camp)}
                      className={`flex items-center justify-between p-3 rounded-lg border text-xs cursor-pointer transition-colors ${
                        isAlreadyLinked
                          ? 'bg-[#F5F3FF] border-[#DDD6FE] text-[#6D28D9] font-medium'
                          : 'border-[#E2E8F0] hover:bg-slate-50 text-[#1E1B4B]'
                      }`}
                    >
                      <div>
                        <div className="font-semibold">{camp.name}</div>
                        <div className="text-[10px] text-[#94A3B8] capitalize">{camp.channel} • {camp.status}</div>
                      </div>
                      {isAlreadyLinked ? (
                        <span className="text-[11px] font-semibold text-[#6D28D9] inline-flex items-center gap-1">
                          <Check className="w-3.5 h-3.5" /> Connected
                        </span>
                      ) : (
                        <span className="text-[11px] text-[#94A3B8]">Attach +</span>
                      )}
                    </div>
                  );
                })
              ) : (
                <div className="p-4 rounded-lg bg-slate-50 text-center text-xs text-[#64748B]">
                  No campaigns found in this workspace. Create a campaign first.
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setIsUseInCampaignOpen(false)}
                className="px-4 py-2 rounded-lg border border-[#E2E8F0] text-[#64748B] hover:bg-slate-50 text-xs font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deleteConfirmSegId && (
        <div
          className="fixed inset-0 z-50 bg-[#1E1B4B]/40 backdrop-blur-xs flex items-center justify-center p-4"
          role="alertdialog"
          aria-modal="true"
        >
          <div className="bg-white rounded-xl shadow-2xl border border-[#E2E8F0] w-full max-w-sm p-6 text-center animate-in fade-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-3">
              <Trash2 className="w-6 h-6" />
            </div>
            <h4 className="text-base font-bold text-[#1E1B4B]">Delete Audience Segment?</h4>
            <p className="text-xs text-[#64748B] mt-1.5">
              Are you sure you want to delete this segment? This action will remove it from all connected campaigns.
            </p>
            <div className="mt-5 flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => setDeleteConfirmSegId(null)}
                className="px-4 py-2 text-xs font-medium text-[#64748B] hover:text-[#1E1B4B]"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => handleDeleteSegment(deleteConfirmSegId)}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white text-xs font-semibold rounded-lg shadow-2xs inline-flex items-center gap-1.5"
              >
                {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Delete Segment</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
