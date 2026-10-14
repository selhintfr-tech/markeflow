import React, { useState } from 'react';
import {
  Users,
  Layers,
  Target,
  Plus,
  Search,
  ChevronDown,
  UserCheck,
  Megaphone,
  MoreHorizontal,
  MapPin,
  User,
  Tag,
  Link as LinkIcon,
  ChevronRight,
  Edit2,
  X,
  Check,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { audiencesKPIs, initialAudienceSegments } from '../../data/mock';
import type { AudienceSegment, CustomerType } from '../../types';

export const AudiencesPage: React.FC = () => {
  const navigate = useNavigate();

  // State
  const [segments, setSegments] = useState<AudienceSegment[]>(initialAudienceSegments);
  const [selectedSegmentId, setSelectedSegmentId] = useState<string>('seg-1');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRegion, setSelectedRegion] = useState('All regions');
  const [sortBy, setSortBy] = useState<'updated' | 'name' | 'contacts'>('updated');

  // Dialog states
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isUseInCampaignOpen, setIsUseInCampaignOpen] = useState(false);
  const [activeMenuSegmentId, setActiveMenuSegmentId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Form states for Create / Edit
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    region: 'Casablanca, Rabat',
    customerType: 'Prospects' as CustomerType,
    ageRange: '25–40',
    contactCount: 5000,
    associatedCampaigns: 'Autumn Launch 2026',
    cityCondition: 'Casablanca, Rabat',
    interests: 'Promotions, everyday essentials, online shopping',
    source: 'Website forms, social campaigns',
    status: 'Active' as 'Active' | 'Draft' | 'Archived',
  });

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // The active selected segment
  const selectedSegment =
    segments.find((s) => s.id === selectedSegmentId) || segments[0] || initialAudienceSegments[0];

  // Filtering and sorting
  const filteredSegments = segments
    .filter((seg) => {
      const matchesSearch =
        seg.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        seg.region.toLowerCase().includes(searchQuery.toLowerCase()) ||
        seg.customerType.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesRegion =
        selectedRegion === 'All regions' ||
        seg.region.toLowerCase().includes(selectedRegion.toLowerCase());
      return matchesSearch && matchesRegion;
    })
    .sort((a, b) => {
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      if (sortBy === 'contacts') return b.contactCount - a.contactCount;
      return 0; // default updated order preserved
    });

  // Open Edit Modal
  const handleOpenEdit = (seg: AudienceSegment) => {
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

  // Open Create Modal
  const handleOpenCreate = () => {
    setFormData({
      name: '',
      description: '',
      region: 'Casablanca, Rabat',
      customerType: 'Prospects',
      ageRange: '25–40',
      contactCount: 2500,
      associatedCampaigns: 'Autumn Launch 2026',
      cityCondition: 'Casablanca, Rabat',
      interests: 'Promotions, modern fashion, accessories',
      source: 'Website forms, social campaigns',
      status: 'Active',
    });
    setIsCreateOpen(true);
  };

  const handleSaveCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    const newSeg: AudienceSegment = {
      id: `seg-${Date.now()}`,
      name: formData.name.trim(),
      description: formData.description.trim() || `${formData.name} audience in Morocco`,
      region: formData.region,
      customerType: formData.customerType,
      ageRange: formData.ageRange,
      contactCount: Number(formData.contactCount) || 1200,
      associatedCampaigns: formData.associatedCampaigns
        .split(',')
        .map((c) => c.trim())
        .filter(Boolean),
      updated: 'Just now',
      status: formData.status,
      filterConditions: {
        city: formData.cityCondition,
        ageRange: formData.ageRange,
        customerStatus: formData.customerType === 'Prospects' ? 'Prospect' : formData.customerType,
        interests: formData.interests,
        acquisitionSource: formData.source,
      },
      moduleConnections: {
        crmContactsCount: Number(formData.contactCount) || 1200,
        campaigns: formData.associatedCampaigns
          .split(',')
          .map((c) => c.trim())
          .filter(Boolean),
      },
    };

    setSegments((prev) => [newSeg, ...prev]);
    setSelectedSegmentId(newSeg.id);
    setIsCreateOpen(false);
    showToast(`Created segment "${newSeg.name}"`);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSegment) return;

    const updatedSeg: AudienceSegment = {
      ...selectedSegment,
      name: formData.name.trim() || selectedSegment.name,
      description: formData.description.trim() || selectedSegment.description,
      region: formData.region,
      customerType: formData.customerType,
      ageRange: formData.ageRange,
      contactCount: Number(formData.contactCount) || selectedSegment.contactCount,
      associatedCampaigns: formData.associatedCampaigns
        .split(',')
        .map((c) => c.trim())
        .filter(Boolean),
      status: formData.status,
      updated: 'Just now',
      filterConditions: {
        city: formData.cityCondition,
        ageRange: formData.ageRange,
        customerStatus: formData.customerType === 'Prospects' ? 'Prospect' : formData.customerType,
        interests: formData.interests,
        acquisitionSource: formData.source,
      },
      moduleConnections: {
        crmContactsCount: Number(formData.contactCount) || selectedSegment.contactCount,
        campaigns: formData.associatedCampaigns
          .split(',')
          .map((c) => c.trim())
          .filter(Boolean),
      },
    };

    setSegments((prev) => prev.map((s) => (s.id === updatedSeg.id ? updatedSeg : s)));
    setIsEditOpen(false);
    showToast(`Updated "${updatedSeg.name}" successfully`);
  };

  // Helper for customer type badge color
  const getCustomerTypeBadgeClass = (type: CustomerType) => {
    switch (type) {
      case 'Prospects':
        return 'bg-[#E0F2FE] text-[#0369A1]'; // light blue
      case 'Existing customers':
        return 'bg-[#CCFBF1] text-[#0D9488]'; // soft teal
      case 'Leads':
        return 'bg-[#FEF3C7] text-[#D97706]'; // pale amber
      default:
        return 'bg-[#F1F5F9] text-[#475569]';
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
        <span className="hover:text-[#1E1B4B] cursor-pointer">Management</span>
        <span>/</span>
        <span className="text-[#1E1B4B] font-medium">Audiences</span>
      </div>

      {/* Title & Primary Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-extrabold tracking-tight text-[#1E1B4B]">
            Audience Segments
          </h1>
          <p className="text-sm text-[#64748B] mt-1">
            Organize and understand your target customers
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenCreate}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-[#6D28D9] hover:bg-[#5B21B6] text-white text-sm font-semibold shadow-xs transition-colors shrink-0"
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
              {audiencesKPIs.totalContacts.value.toLocaleString()}
            </div>
            <div className="flex items-center gap-1 mt-2 text-xs">
              <span className="text-[#0D9488] font-bold inline-flex items-center">
                ↗ +{audiencesKPIs.totalContacts.trend}%
              </span>
              <span className="text-[#94A3B8]">{audiencesKPIs.totalContacts.trendLabel}</span>
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
              {audiencesKPIs.activeSegments.value}
            </div>
            <div className="flex items-center gap-1 mt-2 text-xs">
              <span className="text-[#0D9488] font-bold inline-flex items-center">
                ↗ +{audiencesKPIs.activeSegments.trend}
              </span>
              <span className="text-[#94A3B8]">{audiencesKPIs.activeSegments.trendLabel}</span>
            </div>
          </div>
        </div>

        {/* KPI 3 — Qualified Leads */}
        <div className="bg-white rounded-xl border border-[#E2E8F0] p-6 shadow-xs flex items-center gap-4">
          <div className="w-14 h-14 rounded-xl bg-[#CCFBF1] text-[#0D9488] flex items-center justify-center shrink-0">
            <Target className="w-7 h-7 stroke-[1.8]" />
          </div>
          <div className="min-w-0">
            <div className="text-xs font-medium text-[#64748B]">Qualified Leads</div>
            <div className="text-2xl lg:text-[28px] font-extrabold text-[#1E1B4B] tracking-tight leading-none mt-1">
              {audiencesKPIs.qualifiedLeads.value.toLocaleString()}
            </div>
            <div className="flex items-center gap-1 mt-2 text-xs">
              <span className="text-[#0D9488] font-bold inline-flex items-center">
                ↗ +{audiencesKPIs.qualifiedLeads.trend}%
              </span>
              <span className="text-[#94A3B8]">{audiencesKPIs.qualifiedLeads.trendLabel}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Two-Column Content Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* LEFT PANEL: Segments list (2/3 width) */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-[#E2E8F0] p-6 shadow-xs min-h-[640px] flex flex-col justify-between">
          <div>
            {/* Header: Title */}
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-[#1E1B4B]">
                Segments ({filteredSegments.length})
              </h2>
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
                    onChange={(e) => setSortBy(e.target.value as any)}
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

            {/* Segments Table */}
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
                          isSelected
                            ? 'bg-[#F5F3FF]' // Pale purple selected row background from screenshot
                            : 'hover:bg-slate-50/70'
                        }`}
                      >
                        {/* Name */}
                        <td className="py-4 px-3 font-semibold text-[#6D28D9] hover:underline">
                          {seg.name}
                        </td>

                        {/* Region */}
                        <td className="py-4 px-3 text-[#475569]">{seg.region}</td>

                        {/* Customer Type Badge */}
                        <td className="py-4 px-3">
                          <span
                            className={`inline-block px-2.5 py-1 rounded-full font-medium text-[11px] leading-tight ${getCustomerTypeBadgeClass(
                              seg.customerType
                            )}`}
                          >
                            {seg.customerType}
                          </span>
                        </td>

                        {/* Age Range */}
                        <td className="py-4 px-3 text-[#475569]">{seg.ageRange}</td>

                        {/* Contact Count */}
                        <td className="py-4 px-3 text-[#1E1B4B] font-medium">
                          {seg.contactCount.toLocaleString()}
                        </td>

                        {/* Associated Campaigns Badges */}
                        <td className="py-4 px-3">
                          <div className="flex flex-col gap-1 items-start">
                            {seg.associatedCampaigns.map((camp, idx) => (
                              <span
                                key={idx}
                                className="inline-block px-2 py-0.5 rounded bg-[#EDE9FE] text-[#6D28D9] font-medium text-[10px]"
                              >
                                {camp}
                              </span>
                            ))}
                          </div>
                        </td>

                        {/* Updated */}
                        <td className="py-4 px-3 text-[#64748B] whitespace-nowrap">
                          {seg.updated}
                        </td>

                        {/* Actions menu */}
                        <td className="py-4 px-3 text-right relative">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveMenuSegmentId(
                                activeMenuSegmentId === seg.id ? null : seg.id
                              );
                            }}
                            className="p-1 rounded hover:bg-slate-200/60 text-[#94A3B8] hover:text-[#1E1B4B] transition-colors"
                          >
                            <MoreHorizontal className="w-4 h-4" />
                          </button>

                          {activeMenuSegmentId === seg.id && (
                            <div className="absolute right-3 top-10 w-36 bg-white border border-[#E2E8F0] rounded-lg shadow-lg py-1 z-30 text-left">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveMenuSegmentId(null);
                                  handleOpenEdit(seg);
                                }}
                                className="w-full px-3 py-1.5 text-xs text-[#1E1B4B] hover:bg-slate-50 flex items-center gap-2"
                              >
                                <Edit2 className="w-3.5 h-3.5 text-[#64748B]" />
                                <span>Edit Segment</span>
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveMenuSegmentId(null);
                                  setSelectedSegmentId(seg.id);
                                  setIsUseInCampaignOpen(true);
                                }}
                                className="w-full px-3 py-1.5 text-xs text-[#1E1B4B] hover:bg-slate-50 flex items-center gap-2"
                              >
                                <Megaphone className="w-3.5 h-3.5 text-[#64748B]" />
                                <span>Use in Campaign</span>
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {filteredSegments.length === 0 && (
                <div className="py-12 text-center text-xs text-[#94A3B8]">
                  No segments match your current filter.
                </div>
              )}
            </div>
          </div>

          {/* Large blank area under segment table to strictly mirror the screenshot composition */}
          <div className="h-28" />
        </div>

        {/* RIGHT PANEL: Selected Segment Details (1/3 width) */}
        {selectedSegment && (
          <div className="bg-white rounded-xl border border-[#E2E8F0] p-6 shadow-xs flex flex-col justify-between">
            <div>
              {/* Header: Title, subtitle & three-dot actions */}
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h2 className="text-lg font-bold text-[#1E1B4B]">{selectedSegment.name}</h2>
                  <p className="text-xs text-[#64748B] mt-0.5">
                    {selectedSegment.description || 'Target customer segment'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleOpenEdit(selectedSegment)}
                  className="p-1 rounded text-[#94A3B8] hover:text-[#1E1B4B] hover:bg-slate-50 transition-colors"
                >
                  <MoreHorizontal className="w-4 h-4" />
                </button>
              </div>

              {/* Status Badges Row */}
              <div className="flex flex-wrap items-center gap-2 mt-3.5">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#CCFBF1] text-[#0D9488]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#0D9488]" />
                  {selectedSegment.status}
                </span>

                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#EDE9FE] text-[#6D28D9]">
                  <UserCheck className="w-3 h-3 text-[#6D28D9]" />
                  From CRM & Leads
                </span>

                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#EDE9FE] text-[#6D28D9]">
                  <Megaphone className="w-3 h-3 text-[#6D28D9]" />
                  Used in Campaigns
                </span>
              </div>

              {/* Filter conditions Section */}
              <div className="mt-6">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-bold text-[#1E1B4B]">Filter conditions</h3>
                  <button
                    type="button"
                    onClick={() => handleOpenEdit(selectedSegment)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-[#64748B] hover:text-[#1E1B4B] border border-[#E2E8F0] rounded-md hover:bg-slate-50 transition-colors"
                  >
                    <Edit2 className="w-3 h-3 text-[#64748B]" />
                    <span>Edit</span>
                  </button>
                </div>

                {/* 5 Filter Conditions bordered rows */}
                <div className="space-y-2 text-xs">
                  {/* Condition 1: City */}
                  <div className="flex items-center justify-between p-2.5 rounded-lg border border-[#F1F5F9] bg-[#F8F7FC]/50">
                    <div className="flex items-center gap-2.5 text-[#64748B]">
                      <MapPin className="w-4 h-4 text-[#6D28D9] shrink-0" />
                      <span>City</span>
                    </div>
                    <span className="font-medium text-[#1E1B4B] text-right">
                      {selectedSegment.filterConditions.city}
                    </span>
                  </div>

                  {/* Condition 2: Age Range */}
                  <div className="flex items-center justify-between p-2.5 rounded-lg border border-[#F1F5F9] bg-[#F8F7FC]/50">
                    <div className="flex items-center gap-2.5 text-[#64748B]">
                      <Users className="w-4 h-4 text-[#6D28D9] shrink-0" />
                      <span>Age Range</span>
                    </div>
                    <span className="font-medium text-[#1E1B4B] text-right">
                      {selectedSegment.filterConditions.ageRange}
                    </span>
                  </div>

                  {/* Condition 3: Customer Status */}
                  <div className="flex items-center justify-between p-2.5 rounded-lg border border-[#F1F5F9] bg-[#F8F7FC]/50">
                    <div className="flex items-center gap-2.5 text-[#64748B]">
                      <User className="w-4 h-4 text-[#6D28D9] shrink-0" />
                      <span>Customer Status</span>
                    </div>
                    <span className="font-medium text-[#1E1B4B] text-right">
                      {selectedSegment.filterConditions.customerStatus}
                    </span>
                  </div>

                  {/* Condition 4: Interests */}
                  <div className="flex items-center justify-between p-2.5 rounded-lg border border-[#F1F5F9] bg-[#F8F7FC]/50">
                    <div className="flex items-center gap-2.5 text-[#64748B] shrink-0">
                      <Tag className="w-4 h-4 text-[#6D28D9] shrink-0" />
                      <span>Interests</span>
                    </div>
                    <span className="font-medium text-[#1E1B4B] text-right ml-3 truncate max-w-[200px]" title={selectedSegment.filterConditions.interests}>
                      {selectedSegment.filterConditions.interests}
                    </span>
                  </div>

                  {/* Condition 5: Acquisition Source */}
                  <div className="flex items-center justify-between p-2.5 rounded-lg border border-[#F1F5F9] bg-[#F8F7FC]/50">
                    <div className="flex items-center gap-2.5 text-[#64748B] shrink-0">
                      <LinkIcon className="w-4 h-4 text-[#6D28D9] shrink-0" />
                      <span>Acquisition Source</span>
                    </div>
                    <span className="font-medium text-[#1E1B4B] text-right ml-3 truncate max-w-[200px]" title={selectedSegment.filterConditions.acquisitionSource}>
                      {selectedSegment.filterConditions.acquisitionSource}
                    </span>
                  </div>
                </div>
              </div>

              {/* Module connections Section */}
              <div className="mt-6 pt-5 border-t border-[#F1F5F9]">
                <h3 className="text-xs font-bold text-[#1E1B4B] mb-3">Module connections</h3>
                <div className="space-y-2 text-xs">
                  {/* Connection 1: CRM & Leads */}
                  <div
                    onClick={() => navigate('/crm')}
                    className="flex items-center justify-between p-3 rounded-lg border border-[#F1F5F9] hover:border-[#E2E8F0] hover:bg-slate-50 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      <Users className="w-4 h-4 text-[#6D28D9]" />
                      <span className="font-medium text-[#1E1B4B]">CRM & Leads</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[#64748B]">
                        {selectedSegment.moduleConnections.crmContactsCount.toLocaleString()} contacts
                      </span>
                      <ChevronRight className="w-3.5 h-3.5 text-[#94A3B8]" />
                    </div>
                  </div>

                  {/* Connection 2: Campaigns */}
                  <div
                    onClick={() => navigate('/campaigns')}
                    className="flex items-center justify-between p-3 rounded-lg border border-[#F1F5F9] hover:border-[#E2E8F0] hover:bg-slate-50 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      <Megaphone className="w-4 h-4 text-[#6D28D9]" />
                      <span className="font-medium text-[#1E1B4B]">Campaigns</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="text-right">
                        {selectedSegment.moduleConnections.campaigns.map((camp, idx) => (
                          <div key={idx} className="text-[#64748B] font-medium leading-tight">
                            {camp}
                          </div>
                        ))}
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 text-[#94A3B8] shrink-0" />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Actions: 3 horizontally arranged buttons */}
            <div className="mt-8 pt-5 border-t border-[#F1F5F9] flex items-center gap-2">
              {/* Edit Segment: Purple filled */}
              <button
                type="button"
                onClick={() => handleOpenEdit(selectedSegment)}
                className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg bg-[#6D28D9] hover:bg-[#5B21B6] text-white text-xs font-semibold shadow-xs transition-colors"
              >
                <Edit2 className="w-3.5 h-3.5" />
                <span>Edit Segment</span>
              </button>

              {/* View Contacts: Outlined button */}
              <button
                type="button"
                onClick={() => {
                  showToast(`Showing ${selectedSegment.contactCount.toLocaleString()} contacts in CRM & Leads`);
                  navigate('/crm');
                }}
                className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg border border-[#E2E8F0] hover:bg-slate-50 text-[#1E1B4B] text-xs font-medium transition-colors"
              >
                <Users className="w-3.5 h-3.5 text-[#64748B]" />
                <span>View Contacts</span>
              </button>

              {/* Use in Campaign: Outlined button */}
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
        )}
      </div>

      {/* CREATE SEGMENT MODAL */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-2xs p-4">
          <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
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
                  <label className="block font-medium text-[#1E1B4B] mb-1">Region / Cities</label>
                  <input
                    type="text"
                    value={formData.region}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        region: e.target.value,
                        cityCondition: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 rounded-lg border border-[#E2E8F0] text-xs text-[#1E1B4B] focus:outline-none focus:ring-2 focus:ring-[#6D28D9]/20 focus:border-[#6D28D9]"
                  />
                </div>

                <div>
                  <label className="block font-medium text-[#1E1B4B] mb-1">Customer Type</label>
                  <select
                    value={formData.customerType}
                    onChange={(e) =>
                      setFormData({ ...formData, customerType: e.target.value as CustomerType })
                    }
                    className="w-full px-3 py-2 rounded-lg border border-[#E2E8F0] text-xs text-[#1E1B4B] focus:outline-none focus:ring-2 focus:ring-[#6D28D9]/20 focus:border-[#6D28D9]"
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
                    placeholder="e.g. 25–45"
                    value={formData.ageRange}
                    onChange={(e) => setFormData({ ...formData, ageRange: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-[#E2E8F0] text-xs text-[#1E1B4B] focus:outline-none focus:ring-2 focus:ring-[#6D28D9]/20 focus:border-[#6D28D9]"
                  />
                </div>

                <div>
                  <label className="block font-medium text-[#1E1B4B] mb-1">Estimated Contacts</label>
                  <input
                    type="number"
                    value={formData.contactCount}
                    onChange={(e) =>
                      setFormData({ ...formData, contactCount: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 rounded-lg border border-[#E2E8F0] text-xs text-[#1E1B4B] focus:outline-none focus:ring-2 focus:ring-[#6D28D9]/20 focus:border-[#6D28D9]"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-[#1E1B4B] mb-1">Interests</label>
                <input
                  type="text"
                  value={formData.interests}
                  onChange={(e) => setFormData({ ...formData, interests: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-[#E2E8F0] text-xs text-[#1E1B4B] focus:outline-none focus:ring-2 focus:ring-[#6D28D9]/20 focus:border-[#6D28D9]"
                />
              </div>

              <div>
                <label className="block font-medium text-[#1E1B4B] mb-1">Acquisition Source</label>
                <input
                  type="text"
                  value={formData.source}
                  onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-[#E2E8F0] text-xs text-[#1E1B4B] focus:outline-none focus:ring-2 focus:ring-[#6D28D9]/20 focus:border-[#6D28D9]"
                />
              </div>

              <div>
                <label className="block font-medium text-[#1E1B4B] mb-1">
                  Associated Campaigns (comma separated)
                </label>
                <input
                  type="text"
                  value={formData.associatedCampaigns}
                  onChange={(e) => setFormData({ ...formData, associatedCampaigns: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-[#E2E8F0] text-xs text-[#1E1B4B] focus:outline-none focus:ring-2 focus:ring-[#6D28D9]/20 focus:border-[#6D28D9]"
                />
              </div>

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-[#F1F5F9]">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-4 py-2 rounded-lg border border-[#E2E8F0] text-[#64748B] hover:bg-slate-50 text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-[#6D28D9] text-white hover:bg-[#5B21B6] text-xs font-semibold"
                >
                  Create Segment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT SEGMENT MODAL */}
      {isEditOpen && selectedSegment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-2xs p-4">
          <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-[#E2E8F0] flex items-center justify-between">
              <h3 className="text-base font-bold text-[#1E1B4B]">Edit Segment Details</h3>
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
                <label className="block font-medium text-[#1E1B4B] mb-1">Segment Name</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-[#E2E8F0] text-xs text-[#1E1B4B] focus:outline-none focus:ring-2 focus:ring-[#6D28D9]/20 focus:border-[#6D28D9]"
                />
              </div>

              <div>
                <label className="block font-medium text-[#1E1B4B] mb-1">Description</label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-[#E2E8F0] text-xs text-[#1E1B4B] focus:outline-none focus:ring-2 focus:ring-[#6D28D9]/20 focus:border-[#6D28D9]"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-medium text-[#1E1B4B] mb-1">City / Region Filter</label>
                  <input
                    type="text"
                    value={formData.cityCondition}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        cityCondition: e.target.value,
                        region: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 rounded-lg border border-[#E2E8F0] text-xs text-[#1E1B4B] focus:outline-none focus:ring-2 focus:ring-[#6D28D9]/20 focus:border-[#6D28D9]"
                  />
                </div>

                <div>
                  <label className="block font-medium text-[#1E1B4B] mb-1">Customer Type</label>
                  <select
                    value={formData.customerType}
                    onChange={(e) =>
                      setFormData({ ...formData, customerType: e.target.value as CustomerType })
                    }
                    className="w-full px-3 py-2 rounded-lg border border-[#E2E8F0] text-xs text-[#1E1B4B] focus:outline-none focus:ring-2 focus:ring-[#6D28D9]/20 focus:border-[#6D28D9]"
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
                  <label className="block font-medium text-[#1E1B4B] mb-1">Contacts</label>
                  <input
                    type="number"
                    value={formData.contactCount}
                    onChange={(e) =>
                      setFormData({ ...formData, contactCount: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 rounded-lg border border-[#E2E8F0] text-xs text-[#1E1B4B] focus:outline-none focus:ring-2 focus:ring-[#6D28D9]/20 focus:border-[#6D28D9]"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-[#1E1B4B] mb-1">Interests</label>
                <input
                  type="text"
                  value={formData.interests}
                  onChange={(e) => setFormData({ ...formData, interests: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-[#E2E8F0] text-xs text-[#1E1B4B] focus:outline-none focus:ring-2 focus:ring-[#6D28D9]/20 focus:border-[#6D28D9]"
                />
              </div>

              <div>
                <label className="block font-medium text-[#1E1B4B] mb-1">Acquisition Source</label>
                <input
                  type="text"
                  value={formData.source}
                  onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-[#E2E8F0] text-xs text-[#1E1B4B] focus:outline-none focus:ring-2 focus:ring-[#6D28D9]/20 focus:border-[#6D28D9]"
                />
              </div>

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-[#F1F5F9]">
                <button
                  type="button"
                  onClick={() => setIsEditOpen(false)}
                  className="px-4 py-2 rounded-lg border border-[#E2E8F0] text-[#64748B] hover:bg-slate-50 text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-[#6D28D9] text-white hover:bg-[#5B21B6] text-xs font-semibold"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* USE IN CAMPAIGN MODAL */}
      {isUseInCampaignOpen && selectedSegment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-2xs p-4">
          <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-[#1E1B4B]">Use Segment in Campaign</h3>
              <button
                type="button"
                onClick={() => setIsUseInCampaignOpen(false)}
                className="text-[#94A3B8] hover:text-[#1E1B4B]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-[#64748B] mb-4">
              Attach <strong>{selectedSegment.name}</strong> ({selectedSegment.contactCount.toLocaleString()} contacts) to an upcoming or active campaign:
            </p>

            <div className="space-y-2 mb-6">
              {[
                'Autumn Launch 2026',
                'Retargeting Boost',
                'Holiday Season Push',
                'Brand Awareness Q4',
              ].map((camp) => {
                const isAlreadyLinked = selectedSegment.associatedCampaigns.includes(camp);
                return (
                  <div
                    key={camp}
                    onClick={() => {
                      if (!isAlreadyLinked) {
                        const updated = {
                          ...selectedSegment,
                          associatedCampaigns: [...selectedSegment.associatedCampaigns, camp],
                          moduleConnections: {
                            ...selectedSegment.moduleConnections,
                            campaigns: [...selectedSegment.moduleConnections.campaigns, camp],
                          },
                        };
                        setSegments((prev) =>
                          prev.map((s) => (s.id === updated.id ? updated : s))
                        );
                        showToast(`Attached to "${camp}"`);
                      }
                      setIsUseInCampaignOpen(false);
                    }}
                    className={`flex items-center justify-between p-3 rounded-lg border text-xs cursor-pointer transition-colors ${
                      isAlreadyLinked
                        ? 'bg-[#F5F3FF] border-[#DDD6FE] text-[#6D28D9] font-medium'
                        : 'border-[#E2E8F0] hover:bg-slate-50 text-[#1E1B4B]'
                    }`}
                  >
                    <span>{camp}</span>
                    {isAlreadyLinked ? (
                      <span className="text-[11px] font-semibold text-[#6D28D9]">Connected</span>
                    ) : (
                      <span className="text-[11px] text-[#94A3B8]">Attach +</span>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="flex justify-end">
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
    </div>
  );
};
