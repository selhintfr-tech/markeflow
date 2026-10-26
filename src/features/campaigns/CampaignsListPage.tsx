import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  Megaphone,
  Wallet,
  BarChart2,
  Users,
  Search,
  ChevronRight,
  ChevronDown,
  Calendar,
  MoreHorizontal,
  Plus,
  ArrowUpRight,
  FolderGit2,
  Mail,
  Edit2,
  Archive,
  Trash2,
  ExternalLink,
} from 'lucide-react';
import { useWorkspace } from '../../context/WorkspaceContext';
import type { CampaignItem, CampaignStatus } from './types';
import { CreateCampaignModal } from './components/CreateCampaignModal';
import { campaignService, type CampaignRecord } from './campaignService';
import { projectService, type ProjectRecord } from '../projects/projectService';
import { ApiError } from '../api/apiClient';
import { ActionDropdown } from '../../components/ui/ActionDropdown';

function toCampaignItem(record: CampaignRecord, project: ProjectRecord | undefined, workspaceName: string): CampaignItem {
  return {
    id: record.id,
    name: record.name,
    description: record.description || '',
    workspaceId: record.workspace_id,
    workspaceName,
    projectId: record.project_id,
    projectName: project?.name || 'Project',
    platform: record.platform,
    channel: record.channel,
    startDate: record.start_date,
    endDate: record.end_date,
    periodLabel: record.end_date ? `${record.start_date} – ${record.end_date}` : `${record.start_date} – Ongoing`,
    adBudget: Number(record.budget),
    adSpend: Number(record.spend),
    leads: record.leads,
    acquiredCustomers: record.customers,
    revenue: Number(record.revenue),
    status: record.status,
    objectiveType: record.objective || undefined,
  };
}

export const CampaignsListPage: React.FC = () => {
  const { currentWorkspace, hasWorkspace, isLoadingWorkspaces } = useWorkspace();
  const [campaigns, setCampaigns] = useState<CampaignItem[]>([]);
  const [projects, setProjects] = useState<ProjectRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const campaignLoadVersion = useRef(0);

  const reloadCampaigns = useCallback(async () => {
    const request = ++campaignLoadVersion.current;
    if (!hasWorkspace) {
      setCampaigns([]);
      setProjects([]);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setLoadError(null);
    try {
      const [records, workspaceProjects] = await Promise.all([
        campaignService.list(currentWorkspace.id),
        projectService.list(currentWorkspace.id),
      ]);
      if (request !== campaignLoadVersion.current) return;
      setProjects(workspaceProjects);
      const projectById = new Map(workspaceProjects.map((project) => [project.id, project]));
      setCampaigns(records.map((record) => toCampaignItem(record, projectById.get(record.project_id), currentWorkspace.name)));
    } catch (error) {
      if (request !== campaignLoadVersion.current) return;
      setCampaigns([]);
      setProjects([]);
      setLoadError(error instanceof Error ? error.message : 'Unable to load campaigns.');
    } finally {
      if (request === campaignLoadVersion.current) setIsLoading(false);
    }
  }, [hasWorkspace, currentWorkspace.id, currentWorkspace.name]);

  useEffect(() => {
    if (isLoadingWorkspaces) return;
    void reloadCampaigns();
    return () => {
      campaignLoadVersion.current += 1;
    };
  }, [isLoadingWorkspaces, reloadCampaigns]);

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [platformFilter, setPlatformFilter] = useState<string>('All platforms');
  const [sortBy, setSortBy] = useState<string>('Updated');
  const [showPlatformDropdown, setShowPlatformDropdown] = useState(false);
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  const [showDateDropdown, setShowDateDropdown] = useState(false);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  // Modal state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<CampaignItem | null>(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const workspaceCampaigns = campaigns;
  const currency = currentWorkspace.currency || '';

  // Derived KPI metrics
  const activeCount = useMemo(() => {
    return workspaceCampaigns.filter((c) => c.status === 'Active').length;
  }, [workspaceCampaigns]);

  const plannedBudgetSum = useMemo(() => {
    // Planned ad budget sum of active and planned campaigns
    const relevant = workspaceCampaigns.filter(
      (c) => c.status === 'Active' || c.status === 'Planned'
    );
    return relevant.reduce((sum, c) => sum + (c.adBudget || 0), 0);
  }, [workspaceCampaigns]);

  const adSpendSum = useMemo(() => {
    // Ad spend of active campaigns (or total)
    const activeAndPlanned = workspaceCampaigns.filter(
      (c) => c.status === 'Active' || c.status === 'Planned'
    );
    return activeAndPlanned.reduce((sum, c) => sum + (c.adSpend || 0), 0);
  }, [workspaceCampaigns]);

  const leadsSum = useMemo(() => {
    const activeAndPlanned = workspaceCampaigns.filter(
      (c) => c.status === 'Active' || c.status === 'Planned'
    );
    return activeAndPlanned.reduce((sum, c) => sum + (c.leads || 0), 0);
  }, [workspaceCampaigns]);

  // Filtered & Sorted items
  const filteredCampaigns = useMemo(() => {
    return workspaceCampaigns
      .filter((c) => {
        // Status filter
        if (statusFilter !== 'All' && c.status.toLowerCase() !== statusFilter.toLowerCase()) {
          return false;
        }
        // Platform filter
        if (platformFilter !== 'All platforms' && c.platform !== platformFilter) {
          return false;
        }
        // Search query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchName = c.name.toLowerCase().includes(q);
          const matchDesc = (c.description || '').toLowerCase().includes(q);
          const matchProject = (c.projectName || '').toLowerCase().includes(q);
          const matchChannel = (c.channel || '').toLowerCase().includes(q);
          if (!matchName && !matchDesc && !matchProject && !matchChannel) {
            return false;
          }
        }
        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'Name') {
          return a.name.localeCompare(b.name);
        }
        if (sortBy === 'Budget') {
          return b.adBudget - a.adBudget;
        }
        if (sortBy === 'Spend') {
          return b.adSpend - a.adSpend;
        }
        if (sortBy === 'Leads') {
          return b.leads - a.leads;
        }
        // Default: Updated (keep reference order)
        return 0;
      });
  }, [workspaceCampaigns, statusFilter, platformFilter, searchQuery, sortBy]);

  // Paginated campaigns
  const totalPages = Math.ceil(filteredCampaigns.length / pageSize) || 1;
  const paginatedCampaigns = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredCampaigns.slice(start, start + pageSize);
  }, [filteredCampaigns, currentPage, pageSize]);

  // Handlers
  const handleSaveCampaign = async (campaignData: Partial<CampaignItem>) => {
    if (!hasWorkspace || !campaignData.projectId || !campaignData.name || !campaignData.startDate || !campaignData.platform) return;
    setIsSaving(true);
    setActionError(null);
    try {
      const payload = {
        project_id: campaignData.projectId,
        name: campaignData.name,
        description: campaignData.description || null,
        platform: campaignData.platform,
        channel: campaignData.channel || campaignData.platform,
        objective: campaignData.objectiveType || null,
        start_date: campaignData.startDate,
        end_date: campaignData.endDate || null,
        status: campaignData.status || 'Planned',
        budget: campaignData.adBudget ?? 0,
      };
      const saved = editingCampaign
        ? await campaignService.update(currentWorkspace.id, editingCampaign.id, payload)
        : await campaignService.create(currentWorkspace.id, payload);
      const savedProject = projects.find((project) => project.id === saved.project_id);
      const mapped = toCampaignItem(saved, savedProject, currentWorkspace.name);
      setCampaigns((prev) => editingCampaign
        ? prev.map((campaign) => campaign.id === mapped.id ? mapped : campaign)
        : [mapped, ...prev]);
      setIsCreateModalOpen(false);
      setEditingCampaign(null);
    } catch (error) {
      setActionError(error instanceof ApiError && error.errors
        ? Object.values(error.errors).flat().join(' ')
        : error instanceof Error ? error.message : 'Unable to save campaign.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleArchive = async (id: string) => {
    if (!hasWorkspace) return;
    setActiveMenuId(null);
    try {
      const saved = await campaignService.update(currentWorkspace.id, id, { status: 'Archived' });
      const project = projects.find((item) => item.id === saved.project_id);
      const mapped = toCampaignItem(saved, project, currentWorkspace.name);
      setCampaigns((prev) => prev.map((item) => item.id === id ? mapped : item));
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Unable to archive campaign.');
    }
  };

  const handleDelete = async (id: string) => {
    if (!hasWorkspace || !window.confirm('Are you sure you want to delete this campaign?')) return;
    try {
      await campaignService.remove(currentWorkspace.id, id);
      setCampaigns((prev) => prev.filter((campaign) => campaign.id !== id));
      setActiveMenuId(null);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Unable to delete campaign.');
    }
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, platformFilter]);

  // Channel icon helper
  const renderChannelIcon = (channel: string) => {
    if (channel.toLowerCase().includes('meta')) {
      return (
        <span className="w-5 h-5 flex items-center justify-center text-[#0081FB]">
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.477 2 2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.879V14.89h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.989C18.343 21.129 22 16.99 22 12c0-5.523-4.477-10-10-10z" />
          </svg>
        </span>
      );
    }
    if (channel.toLowerCase().includes('google')) {
      return (
        <span className="w-5 h-5 flex items-center justify-center">
          <svg className="w-4 h-4" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
          </svg>
        </span>
      );
    }
    return <Mail className="w-4 h-4 text-[#7C3AED]" />;
  };

  // Status badge styling
  const renderStatusBadge = (status: CampaignStatus) => {
    switch (status) {
      case 'Active':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-[#ECFDF5] text-[#059669]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#059669]" />
            Active
          </span>
        );
      case 'Planned':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-[#F5F3FF] text-[#7C3AED]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#7C3AED]" />
            Planned
          </span>
        );
      case 'Archived':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-[#F1F5F9] text-[#64748B]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#64748B]" />
            Archived
          </span>
        );
      case 'Completed':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-[#F5F3FF] text-[#6D28D9]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#6D28D9]" />
            Completed
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
            {status}
          </span>
        );
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F7FC] p-6 lg:p-8 space-y-6">
      {/* Breadcrumb & Header */}
      <div>
        <div className="flex items-center gap-1.5 text-xs text-[#64748B] mb-1">
          <Link to="/campaigns" className="hover:text-[#6D28D9] font-medium transition-colors">
            Campaigns
          </Link>
          <span>/</span>
          <span className="text-[#1E1B4B]">All Campaigns</span>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mt-1">
          <div>
            <h1 className="text-2xl font-bold text-[#1E1B4B] tracking-tight">Marketing Campaigns</h1>
            <p className="text-xs text-[#64748B] mt-0.5">
              Manage your marketing activities from planning to performance.
            </p>
          </div>
          <button
            type="button"
            disabled={!hasWorkspace || projects.length === 0 || isLoading || isSaving}
            onClick={() => {
              setEditingCampaign(null);
              setActionError(null);
              setIsCreateModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#6D28D9] hover:bg-[#5B21B6] text-white text-xs font-semibold rounded-lg shadow-2xs transition-colors self-start sm:self-auto disabled:opacity-50"
          >
            <Plus className="w-4 h-4" />
            <span>New Campaign</span>
          </button>
        </div>
      </div>

      {(loadError || actionError) && (
        <div role="alert" className="flex items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700">
          <span>{loadError || actionError}</span>
          {loadError && <button type="button" onClick={() => void reloadCampaigns()} className="font-semibold underline">Retry</button>}
          {actionError && <button type="button" onClick={() => setActionError(null)} aria-label="Dismiss error">×</button>}
        </div>
      )}
      {!isLoadingWorkspaces && !hasWorkspace && (
        <div role="status" className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">Select or create an active workspace before managing campaigns.</div>
      )}
      {hasWorkspace && !isLoading && projects.length === 0 && (
        <div role="status" className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">Create a project in this workspace before adding a campaign.</div>
      )}

      {/* 4 KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Active Campaigns */}
        <div
          onClick={() => setStatusFilter(statusFilter === 'Active' ? 'All' : 'Active')}
          className="bg-white rounded-xl border border-[#E2E8F0] p-4.5 flex flex-col justify-between hover:shadow-xs transition-shadow cursor-pointer"
        >
          <div className="flex items-start justify-between">
            <div className="w-10 h-10 rounded-xl bg-[#F5F3FF] text-[#6D28D9] flex items-center justify-center">
              <Megaphone className="w-5 h-5" />
            </div>
            <div className="flex items-center gap-1 text-xs text-[#64748B]">
              <span className="font-medium">Active Campaigns</span>
              <ChevronRight className="w-3.5 h-3.5 text-[#94A3B8]" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-2xl font-bold text-[#1E1B4B]">{isLoading ? <span className="inline-block h-7 w-12 animate-pulse rounded bg-slate-100" /> : activeCount}</div>
            <div className="flex items-center gap-1 text-xs font-medium text-[#0D9488] mt-1">
              <ArrowUpRight className="w-3.5 h-3.5" />
              <span>0% from last month</span>
            </div>
          </div>
        </div>

        {/* Card 2: Planned Ad Budget */}
        <div className="bg-white rounded-xl border border-[#E2E8F0] p-4.5 flex flex-col justify-between hover:shadow-xs transition-shadow">
          <div className="flex items-start justify-between">
            <div className="w-10 h-10 rounded-xl bg-[#F5F3FF] text-[#7C3AED] flex items-center justify-center">
              <Wallet className="w-5 h-5" />
            </div>
            <div className="flex items-center gap-1 text-xs text-[#64748B]">
              <span className="font-medium">Planned Ad Budget</span>
              <ChevronRight className="w-3.5 h-3.5 text-[#94A3B8]" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-2xl font-bold text-[#1E1B4B]">
              {isLoading ? <span className="inline-block h-7 w-24 animate-pulse rounded bg-slate-100" /> : `${plannedBudgetSum.toLocaleString()} ${currency}`}
            </div>
            <div className="flex items-center gap-1 text-xs font-medium text-[#0D9488] mt-1">
              <ArrowUpRight className="w-3.5 h-3.5" />
              <span>12% from last month</span>
            </div>
          </div>
        </div>

        {/* Card 3: Ad Spend */}
        <div className="bg-white rounded-xl border border-[#E2E8F0] p-4.5 flex flex-col justify-between hover:shadow-xs transition-shadow">
          <div className="flex items-start justify-between">
            <div className="w-10 h-10 rounded-xl bg-[#F0FDFA] text-[#0D9488] flex items-center justify-center">
              <BarChart2 className="w-5 h-5" />
            </div>
            <div className="flex items-center gap-1 text-xs text-[#64748B]">
              <span className="font-medium">Ad Spend</span>
              <ChevronRight className="w-3.5 h-3.5 text-[#94A3B8]" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-2xl font-bold text-[#1E1B4B]">
              {isLoading ? <span className="inline-block h-7 w-24 animate-pulse rounded bg-slate-100" /> : `${adSpendSum.toLocaleString()} ${currency}`}
            </div>
            <div className="flex items-center gap-1 text-xs font-medium text-[#0D9488] mt-1">
              <ArrowUpRight className="w-3.5 h-3.5" />
              <span>18% from last month</span>
            </div>
          </div>
        </div>

        {/* Card 4: Generated Leads */}
        <div className="bg-white rounded-xl border border-[#E2E8F0] p-4.5 flex flex-col justify-between hover:shadow-xs transition-shadow">
          <div className="flex items-start justify-between">
            <div className="w-10 h-10 rounded-xl bg-[#F0FDFA] text-[#0D9488] flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
            <div className="flex items-center gap-1 text-xs text-[#64748B]">
              <span className="font-medium">Generated Leads</span>
              <ChevronRight className="w-3.5 h-3.5 text-[#94A3B8]" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-2xl font-bold text-[#1E1B4B]">{isLoading ? <span className="inline-block h-7 w-12 animate-pulse rounded bg-slate-100" /> : leadsSum}</div>
            <div className="flex items-center gap-1 text-xs font-medium text-[#0D9488] mt-1">
              <ArrowUpRight className="w-3.5 h-3.5" />
              <span>24% from last month</span>
            </div>
          </div>
        </div>
      </div>

      {/* Toolbar: Search, Status pills, Filters */}
      <div className="bg-white rounded-xl border border-[#E2E8F0] p-3 flex flex-wrap items-center justify-between gap-3 shadow-2xs">
        {/* Left: Search bar */}
        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="Search campaigns..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-[#F8F7FC] border border-[#E2E8F0] rounded-lg text-[#1E1B4B] placeholder:text-[#94A3B8] focus:outline-none focus:ring-1 focus:ring-[#6D28D9] focus:bg-white"
          />
        </div>

        {/* Center: Status Tabs */}
        <div className="flex items-center gap-1 bg-[#F8F7FC] p-1 rounded-lg border border-[#E2E8F0]">
          {['All', 'Active', 'Planned', 'Completed', 'Archived'].map((status) => {
            const isActive = statusFilter.toLowerCase() === status.toLowerCase();
            return (
              <button
                key={status}
                type="button"
                onClick={() => {
                  setStatusFilter(status);
                  setCurrentPage(1);
                }}
                className={`px-3 py-1 text-xs rounded-md transition-colors ${
                  isActive
                    ? 'bg-[#EDE9FE] text-[#6D28D9] font-semibold shadow-2xs'
                    : 'text-[#64748B] hover:text-[#1E1B4B]'
                }`}
              >
                {status}
              </button>
            );
          })}
        </div>

        {/* Right: Dropdowns */}
        <div className="flex items-center gap-2 relative">
          {/* Sort By Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setShowSortDropdown(!showSortDropdown);
                setShowPlatformDropdown(false);
                setShowDateDropdown(false);
              }}
              className="px-3 py-1.5 text-xs text-[#1E1B4B] bg-white border border-[#E2E8F0] rounded-lg flex items-center gap-1.5 hover:border-[#CBD5E1] transition-colors"
            >
              <span>Sort by: {sortBy}</span>
              <ChevronDown className="w-3.5 h-3.5 text-[#94A3B8]" />
            </button>
            {showSortDropdown && (
              <div className="absolute right-0 mt-1 w-36 bg-white border border-[#E2E8F0] rounded-lg shadow-lg z-20 py-1 text-xs text-[#1E1B4B]">
                {['Updated', 'Name', 'Budget', 'Spend', 'Leads'].map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => {
                      setSortBy(item);
                      setShowSortDropdown(false);
                    }}
                    className="w-full text-left px-3 py-1.5 hover:bg-[#F5F3FF] hover:text-[#6D28D9]"
                  >
                    {item}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Platform Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setShowPlatformDropdown(!showPlatformDropdown);
                setShowSortDropdown(false);
                setShowDateDropdown(false);
              }}
              className="px-3 py-1.5 text-xs text-[#1E1B4B] bg-white border border-[#E2E8F0] rounded-lg flex items-center gap-1.5 hover:border-[#CBD5E1] transition-colors"
            >
              <span>{platformFilter}</span>
              <ChevronDown className="w-3.5 h-3.5 text-[#94A3B8]" />
            </button>
            {showPlatformDropdown && (
              <div className="absolute right-0 mt-1 w-40 bg-white border border-[#E2E8F0] rounded-lg shadow-lg z-20 py-1 text-xs text-[#1E1B4B]">
                {['All platforms', 'Meta Ads', 'Google Ads', 'Email', 'TikTok Ads'].map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => {
                      setPlatformFilter(p);
                      setShowPlatformDropdown(false);
                      setCurrentPage(1);
                    }}
                    className="w-full text-left px-3 py-1.5 hover:bg-[#F5F3FF] hover:text-[#6D28D9]"
                  >
                    {p}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Date range button */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setShowDateDropdown(!showDateDropdown);
                setShowSortDropdown(false);
                setShowPlatformDropdown(false);
              }}
              className="px-3 py-1.5 text-xs text-[#1E1B4B] bg-white border border-[#E2E8F0] rounded-lg flex items-center gap-1.5 hover:border-[#CBD5E1] transition-colors"
            >
              <Calendar className="w-3.5 h-3.5 text-[#64748B]" />
              <span>Date range</span>
              <ChevronDown className="w-3.5 h-3.5 text-[#94A3B8]" />
            </button>
            {showDateDropdown && (
              <div className="absolute right-0 mt-1 w-44 bg-white border border-[#E2E8F0] rounded-lg shadow-lg z-20 py-1.5 px-2 text-xs text-[#64748B]">
                <div className="text-[11px] font-semibold text-[#1E1B4B] mb-1">Filter by Period:</div>
                <button
                  type="button"
                  onClick={() => setShowDateDropdown(false)}
                  className="w-full text-left px-2 py-1 rounded hover:bg-[#F5F3FF] hover:text-[#6D28D9]"
                >
                  All Dates
                </button>
                <button
                  type="button"
                  onClick={() => setShowDateDropdown(false)}
                  className="w-full text-left px-2 py-1 rounded hover:bg-[#F5F3FF] hover:text-[#6D28D9]"
                >
                  October 2026
                </button>
                <button
                  type="button"
                  onClick={() => setShowDateDropdown(false)}
                  className="w-full text-left px-2 py-1 rounded hover:bg-[#F5F3FF] hover:text-[#6D28D9]"
                >
                  Q4 2026
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Campaigns Table */}
      <div className="bg-white rounded-xl border border-[#E2E8F0] overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#FAF5FF]/60 border-b border-[#F1F5F9] text-[11px] font-semibold text-[#64748B]">
                <th className="py-3 px-4">Campaign Name</th>
                <th className="py-3 px-4">Project</th>
                <th className="py-3 px-4">Channel</th>
                <th className="py-3 px-4">Start Date</th>
                <th className="py-3 px-4">End Date</th>
                <th className="py-3 px-4">Ad Budget</th>
                <th className="py-3 px-4">Ad Spend</th>
                <th className="py-3 px-4">Leads</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F1F5F9] text-xs">
              {isLoading || isLoadingWorkspaces ? (
                Array.from({ length: 5 }, (_, row) => (
                  <tr key={`loading-${row}`} aria-hidden="true">
                    {Array.from({ length: 10 }, (_, column) => (
                      <td key={column} className="px-4 py-3.5">
                        <div className={`h-3 animate-pulse rounded bg-slate-100 ${column === 0 ? 'w-4/5' : column === 9 ? 'mx-auto w-8' : 'w-3/5'}`} />
                      </td>
                    ))}
                  </tr>
                ))
              ) : paginatedCampaigns.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-[#64748B]">
                    <div className="flex flex-col items-center justify-center">
                      <Megaphone className="w-8 h-8 text-[#94A3B8] mb-2" />
                      <p className="font-medium text-sm text-[#1E1B4B]">No campaigns found</p>
                      <p className="text-xs text-[#94A3B8] mt-0.5">
                        Try adjusting your search or filters to find what you're looking for.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedCampaigns.map((c) => (
                  <tr key={c.id} className="hover:bg-[#F8F7FC]/60 transition-colors group">
                    {/* Campaign Name & Description */}
                    <td className="py-3.5 px-4 min-w-[220px]">
                      <Link
                        to={`/campaigns/${c.id}`}
                        className="font-semibold text-[#6D28D9] hover:underline block leading-snug"
                      >
                        {c.name}
                      </Link>
                      <p className="text-[11px] text-[#64748B] mt-0.5 line-clamp-1">
                        {c.description}
                      </p>
                    </td>

                    {/* Project */}
                    <td className="py-3.5 px-4 whitespace-nowrap min-w-[160px]">
                      <div className="flex items-center gap-1.5">
                        <FolderGit2 className="w-3.5 h-3.5 text-[#6D28D9] shrink-0" />
                        <Link
                          to={`/projects/${c.projectId}`}
                          className="text-[#1E1B4B] hover:text-[#6D28D9] hover:underline transition-colors font-medium"
                        >
                          {c.projectName}
                        </Link>
                      </div>
                    </td>

                    {/* Channel */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-1.5 text-[#1E1B4B]">
                        {renderChannelIcon(c.channel || c.platform)}
                        <span>{c.channel || c.platform}</span>
                      </div>
                    </td>

                    {/* Start Date */}
                    <td className="py-3.5 px-4 whitespace-nowrap text-[#1E1B4B]">{c.startDate}</td>

                    {/* End Date */}
                    <td className="py-3.5 px-4 whitespace-nowrap text-[#1E1B4B]">{c.endDate || 'Ongoing'}</td>

                    {/* Ad Budget */}
                    <td className="py-3.5 px-4 whitespace-nowrap text-[#1E1B4B] font-medium">
                      {c.adBudget.toLocaleString()} {currency}
                    </td>

                    {/* Ad Spend */}
                    <td className="py-3.5 px-4 whitespace-nowrap text-[#1E1B4B] font-medium">
                      {c.adSpend.toLocaleString()} {currency}
                    </td>

                    {/* Leads */}
                    <td className="py-3.5 px-4 whitespace-nowrap text-[#1E1B4B] font-medium">
                      {c.leads}
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-4 whitespace-nowrap">{renderStatusBadge(c.status)}</td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-2 relative">
                        {c.status === 'Archived' ? (
                          <Link
                            to="/archive"
                            className="px-3 py-1.5 border border-[#E2E8F0] hover:border-[#6D28D9] text-[#6D28D9] hover:bg-[#F5F3FF] rounded-lg text-xs font-semibold transition-colors flex items-center gap-1"
                          >
                            <span>Open in Archive</span>
                            <ExternalLink className="w-3 h-3 text-[#6D28D9]" />
                          </Link>
                        ) : (
                          <Link
                            to={`/campaigns/${c.id}`}
                            className="px-3 py-1.5 border border-[#E2E8F0] hover:border-[#6D28D9] text-[#6D28D9] hover:bg-[#F5F3FF] rounded-lg text-xs font-semibold transition-colors"
                          >
                            Open
                          </Link>
                        )}

                        <ActionDropdown
                          isOpen={activeMenuId === c.id}
                          onClose={() => setActiveMenuId(null)}
                          ariaLabel={`Actions for campaign ${c.name}`}
                          trigger={
                            <button
                              type="button"
                              onClick={() =>
                                setActiveMenuId(activeMenuId === c.id ? null : c.id)
                              }
                              className="p-1.5 text-[#94A3B8] hover:text-[#1E1B4B] hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                              aria-label={`Actions for campaign ${c.name}`}
                            >
                              <MoreHorizontal className="w-4 h-4" />
                            </button>
                          }
                          className="w-36 py-1 text-xs text-[#1E1B4B]"
                        >
                          <button
                            type="button"
                            onClick={() => {
                              setActiveMenuId(null);
                              setEditingCampaign(c);
                              setIsCreateModalOpen(true);
                            }}
                            className="w-full text-left px-3 py-1.5 hover:bg-[#F5F3FF] flex items-center gap-2 text-[#1E1B4B] cursor-pointer"
                          >
                            <Edit2 className="w-3.5 h-3.5 text-[#6D28D9]" />
                            Edit Campaign
                          </button>
                          {c.status !== 'Archived' && (
                            <button
                              type="button"
                              onClick={() => {
                                setActiveMenuId(null);
                                handleArchive(c.id);
                              }}
                              className="w-full text-left px-3 py-1.5 hover:bg-[#F5F3FF] flex items-center gap-2 text-[#64748B] cursor-pointer"
                            >
                              <Archive className="w-3.5 h-3.5 text-[#94A3B8]" />
                              Archive
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              setActiveMenuId(null);
                              handleDelete(c.id);
                            }}
                            className="w-full text-left px-3 py-1.5 hover:bg-red-50 flex items-center gap-2 text-red-600 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-red-500" />
                            Delete
                          </button>
                        </ActionDropdown>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer / Pagination */}
        <div className="px-4 py-3 border-t border-[#F1F5F9] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[#64748B] bg-white">
          <div>
            Showing{' '}
            <span className="font-semibold text-[#1E1B4B]">
              {filteredCampaigns.length === 0 ? 0 : (currentPage - 1) * pageSize + 1}–
              {Math.min(currentPage * pageSize, filteredCampaigns.length)}
            </span>{' '}
            of <span className="font-semibold text-[#1E1B4B]">{filteredCampaigns.length}</span> campaigns
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="px-2.5 py-1 text-xs border border-[#E2E8F0] rounded-md text-[#64748B] hover:text-[#1E1B4B] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              &lt; Previous
            </button>
            {Array.from({ length: totalPages }).map((_, i) => {
              const page = i + 1;
              return (
                <button
                  key={page}
                  type="button"
                  onClick={() => setCurrentPage(page)}
                  className={`px-2.5 py-1 text-xs rounded-md font-medium transition-colors ${
                    currentPage === page
                      ? 'border border-[#6D28D9] text-[#6D28D9] bg-[#F5F3FF]'
                      : 'border border-[#E2E8F0] text-[#64748B] hover:text-[#1E1B4B]'
                  }`}
                >
                  {page}
                </button>
              );
            })}
            <button
              type="button"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="px-2.5 py-1 text-xs border border-[#E2E8F0] rounded-md text-[#64748B] hover:text-[#1E1B4B] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Next &gt;
            </button>
          </div>
        </div>
      </div>

      {/* Create / Edit Campaign Modal */}
      <CreateCampaignModal
        isOpen={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false);
          setEditingCampaign(null);
        }}
        onSave={handleSaveCampaign}
        initialCampaign={editingCampaign}
        workspaceName={currentWorkspace.name}
        projects={projects}
        isSaving={isSaving}
        saveError={actionError}
      />
    </div>
  );
};
