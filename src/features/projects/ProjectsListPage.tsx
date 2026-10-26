import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  FolderKanban,
  Play,
  CheckCircle2,
  Archive,
  ChevronRight,
  Search,
  ChevronDown,
  Building2,
  Plus,
  MoreHorizontal,
  X,
  Edit2,
  Trash2,
  RotateCcw,
  AlertCircle,
} from 'lucide-react';
import { useWorkspace } from '../../context/WorkspaceContext';
import type { MarketingProjectItem, MarketingProjectStatus } from '../../types';
import { projectService, type ProjectRecord } from './projectService';
import { ApiError } from '../api/apiClient';
import { useAuth } from '../../context/AuthContext';
import { ActionDropdown } from '../../components/ui/ActionDropdown';

function toProjectItem(record: ProjectRecord, workspaceName: string, currentUserId?: string): MarketingProjectItem {
  const ownerName = currentUserId && String(record.owner_id) === currentUserId ? 'You' : `Member ${record.owner_id}`;
  return {
    id: record.id,
    name: record.name,
    description: record.description || '',
    workspaceId: record.workspace_id,
    workspaceName,
    workspaceIconType: 'building',
    owner: {
      name: ownerName,
      initials: ownerName.split(/\s+/).map((part) => part[0] || '').join('').slice(0, 2).toUpperCase(),
      avatarBg: '#EDE9FE',
      avatarColor: '#6D28D9',
    },
    progress: record.progress,
    startDate: record.start_date,
    endDate: record.end_date,
    status: record.status as MarketingProjectStatus,
    createdAt: record.created_at,
  };
}

export const ProjectsListPage: React.FC = () => {
  const navigate = useNavigate();
  const { currentWorkspace, hasWorkspace, isLoadingWorkspaces } = useWorkspace();
  const { user } = useAuth();
  const [projects, setProjects] = useState<MarketingProjectItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const reloadProjects = useCallback(async () => {
    if (!hasWorkspace) {
      setProjects([]);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setLoadError(null);
    try {
      const records = await projectService.list(currentWorkspace.id);
      setProjects(records.map((record) => toProjectItem(record, currentWorkspace.name, user?.id)));
    } catch (error) {
      setProjects([]);
      setLoadError(error instanceof Error ? error.message : 'Unable to load projects.');
    } finally {
      setIsLoading(false);
    }
  }, [hasWorkspace, currentWorkspace.id, currentWorkspace.name, user?.id]);

  useEffect(() => {
    if (!isLoadingWorkspaces) void reloadProjects();
  }, [isLoadingWorkspaces, reloadProjects]);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Active' | 'Completed' | 'Archived'>('All');
  const [sortBy, setSortBy] = useState<'Recent' | 'Name' | 'Progress' | 'StartDate'>('Recent');
  const [isSortDropdownOpen, setIsSortDropdownOpen] = useState(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 5;

  // Modals & Menu
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<MarketingProjectItem | null>(null);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [projectToDelete, setProjectToDelete] = useState<MarketingProjectItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Form states for Create/Edit
  const [formName, setFormName] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formWorkspaceName, setFormWorkspaceName] = useState('');
  const [formOwnerName, setFormOwnerName] = useState('');
  const [formStartDate, setFormStartDate] = useState('2026-11-01');
  const [formEndDate, setFormEndDate] = useState('2026-11-30');
  const [formStatus, setFormStatus] = useState<MarketingProjectStatus>('Active');
  const [formProgress, setFormProgress] = useState(0);
  const [formErrors, setFormErrors] = useState<{ [key: string]: string }>({});

  // Dynamic KPI counts derived from visible projects
  const totalCount = projects.length;
  const activeCount = useMemo(() => projects.filter((p) => p.status === 'Active').length, [projects]);
  const completedCount = useMemo(() => projects.filter((p) => p.status === 'Completed').length, [projects]);
  const archivedCount = useMemo(() => projects.filter((p) => p.status === 'Archived').length, [projects]);

  // Filtered & Sorted Projects
  const filteredProjects = useMemo(() => {
    return projects
      .filter((project) => {
        // Search filter
        if (
          searchQuery &&
          !project.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
          !project.description.toLowerCase().includes(searchQuery.toLowerCase()) &&
          !project.workspaceName.toLowerCase().includes(searchQuery.toLowerCase())
        ) {
          return false;
        }

        // Status filter
        if (statusFilter !== 'All' && project.status !== statusFilter) {
          return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'Name') return a.name.localeCompare(b.name);
        if (sortBy === 'Progress') return b.progress - a.progress;
        if (sortBy === 'StartDate') return a.startDate.localeCompare(b.startDate);
        // Default Recent
        return (b.createdAt || '').localeCompare(a.createdAt || '');
      });
  }, [projects, searchQuery, statusFilter, sortBy]);

  // Reset page when filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, sortBy]);

  const totalPages = Math.max(1, Math.ceil(filteredProjects.length / pageSize));
  const paginatedProjects = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredProjects.slice(start, start + pageSize);
  }, [filteredProjects, currentPage, pageSize]);

  // Handlers for Create/Edit Modal
  const openCreateModal = () => {
    setEditingProject(null);
    setFormName('');
    setFormDesc('');
    setFormWorkspaceName(currentWorkspace.name);
    setFormOwnerName(user?.name || '');
    setFormStartDate('2026-11-01');
    setFormEndDate('2026-11-30');
    setFormStatus('Active');
    setFormProgress(0);
    setFormErrors({});
    setIsCreateModalOpen(true);
  };

  const openEditModal = (proj: MarketingProjectItem) => {
    setEditingProject(proj);
    setFormName(proj.name);
    setFormDesc(proj.description);
    setFormWorkspaceName(proj.workspaceName);
    setFormOwnerName(proj.owner.name);
    setFormStartDate(proj.startDate);
    setFormEndDate(proj.endDate);
    setFormStatus(proj.status as any);
    setFormProgress(proj.progress);
    setFormErrors({});
    setIsCreateModalOpen(true);
  };

  const validateForm = () => {
    const errs: { [key: string]: string } = {};
    if (!formName.trim()) errs.name = 'Project name is required';
    if (!formStartDate.trim()) errs.startDate = 'Start date is required';
    if (!formEndDate.trim()) errs.endDate = 'End date is required';
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSaveProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    if (!hasWorkspace) return;
    setIsSaving(true);
    setActionError(null);
    try {
      const payload = {
        name: formName.trim(),
        description: formDesc.trim() || null,
        start_date: formStartDate,
        end_date: formEndDate,
        status: formStatus,
        progress: formProgress,
      };
      const saved = editingProject
        ? await projectService.update(currentWorkspace.id, editingProject.id, payload)
        : await projectService.create(currentWorkspace.id, payload);
      const mapped = toProjectItem(saved, currentWorkspace.name, user?.id);
      setProjects((prev) => editingProject
        ? prev.map((project) => project.id === mapped.id ? mapped : project)
        : [mapped, ...prev]);
      setIsCreateModalOpen(false);
    } catch (error) {
      setActionError(error instanceof ApiError && error.errors
        ? Object.values(error.errors).flat().join(' ')
        : error instanceof Error ? error.message : 'Unable to save project.');
    } finally {
      setIsSaving(false);
    }
  };

  // Actions
  const handleToggleArchive = async (id: string) => {
    const project = projects.find((item) => item.id === id);
    if (!project || !hasWorkspace) return;
    setActiveMenuId(null);
    try {
      const saved = await projectService.update(currentWorkspace.id, id, {
        status: project.status === 'Archived' ? 'Active' : 'Archived',
      });
      const mapped = toProjectItem(saved, currentWorkspace.name, user?.id);
      setProjects((prev) => prev.map((item) => item.id === id ? mapped : item));
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Unable to update project status.');
    }
  };

  const confirmDeleteProject = async () => {
    if (!projectToDelete || !hasWorkspace) return;
    setIsDeleting(true);
    setDeleteError(null);
    try {
      await projectService.remove(currentWorkspace.id, projectToDelete.id);
      setProjects((prev) => prev.filter((project) => project.id !== projectToDelete.id));
      setProjectToDelete(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to delete project.';
      setDeleteError(message);
    } finally {
      setIsDeleting(false);
    }
  };

  const renderStatusBadge = (status: string) => {
    switch (status) {
      case 'Active':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-[#ECFDF5] text-[#0D9488]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#0D9488]" />
            Active
          </span>
        );
      case 'Completed':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-[#F5F3FF] text-[#6D28D9]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#6D28D9]" />
            Completed
          </span>
        );
      case 'Archived':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-[#F1F5F9] text-[#64748B]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#64748B]" />
            Archived
          </span>
        );
      case 'Draft':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
            Draft
          </span>
        );
      case 'Planned':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-[#FFFBEB] text-[#D97706]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#D97706]" />
            Planned
          </span>
        );
    }
  };

  return (
    <div className="space-y-5">
      {/* 1. Breadcrumbs */}
      <div>
        <div className="text-xs font-medium text-[#64748B] mb-1">
          <span>Management</span>
          <span className="mx-1.5 text-[#94A3B8]">/</span>
          <span className="text-[#6D28D9] font-semibold">Projects</span>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-[#1E1B4B] tracking-tight">
              Marketing Projects
            </h1>
            <p className="text-xs text-[#64748B] mt-0.5">
              Plan, track and manage your marketing initiatives.
            </p>
          </div>

          <button
            type="button"
            onClick={openCreateModal}
            disabled={!hasWorkspace || isLoadingWorkspaces}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#6D28D9] text-white text-xs font-semibold rounded-lg hover:bg-[#5B21B6] transition-colors shadow-2xs self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Create project</span>
          </button>
        </div>
      </div>

      {(loadError || actionError) && (
        <div role="alert" className="flex items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700">
          <span>{actionError || loadError}</span>
          {loadError && <button type="button" onClick={() => void reloadProjects()} className="font-semibold underline">Retry</button>}
          {actionError && <button type="button" onClick={() => setActionError(null)} aria-label="Dismiss error">×</button>}
        </div>
      )}
      {!isLoadingWorkspaces && !hasWorkspace && (
        <div role="status" className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">Select or create an active workspace before managing projects.</div>
      )}

      {/* 2. Four KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Projects */}
        <div
          onClick={() => setStatusFilter('All')}
          className={`bg-white rounded-xl border p-4 shadow-xs transition-all cursor-pointer hover:border-[#CBD5E1] ${
            statusFilter === 'All' ? 'border-[#6D28D9] ring-1 ring-[#6D28D9]/20' : 'border-[#E2E8F0]'
          }`}
        >
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 bg-[#F5F3FF] text-[#6D28D9]">
                <FolderKanban className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs text-[#64748B] font-medium">Total Projects</div>
                <div className="text-2xl font-bold text-[#1E1B4B] tracking-tight mt-0.5">
                  {totalCount}
                </div>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-[#94A3B8] mt-1 shrink-0" />
          </div>
        </div>

        {/* Active */}
        <div
          onClick={() => setStatusFilter('Active')}
          className={`bg-white rounded-xl border p-4 shadow-xs transition-all cursor-pointer hover:border-[#CBD5E1] ${
            statusFilter === 'Active' ? 'border-[#6D28D9] ring-1 ring-[#6D28D9]/20' : 'border-[#E2E8F0]'
          }`}
        >
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 bg-[#ECFDF5] text-[#0D9488]">
                <Play className="w-4 h-4 fill-current ml-0.5" />
              </div>
              <div>
                <div className="text-xs text-[#64748B] font-medium">Active</div>
                <div className="text-2xl font-bold text-[#1E1B4B] tracking-tight mt-0.5">
                  {activeCount}
                </div>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-[#94A3B8] mt-1 shrink-0" />
          </div>
        </div>

        {/* Completed */}
        <div
          onClick={() => setStatusFilter('Completed')}
          className={`bg-white rounded-xl border p-4 shadow-xs transition-all cursor-pointer hover:border-[#CBD5E1] ${
            statusFilter === 'Completed' ? 'border-[#6D28D9] ring-1 ring-[#6D28D9]/20' : 'border-[#E2E8F0]'
          }`}
        >
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 bg-[#F5F3FF] text-[#6D28D9]">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs text-[#64748B] font-medium">Completed</div>
                <div className="text-2xl font-bold text-[#1E1B4B] tracking-tight mt-0.5">
                  {completedCount}
                </div>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-[#94A3B8] mt-1 shrink-0" />
          </div>
        </div>

        {/* Archived */}
        <div
          onClick={() => setStatusFilter('Archived')}
          className={`bg-white rounded-xl border p-4 shadow-xs transition-all cursor-pointer hover:border-[#CBD5E1] ${
            statusFilter === 'Archived' ? 'border-[#6D28D9] ring-1 ring-[#6D28D9]/20' : 'border-[#E2E8F0]'
          }`}
        >
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 bg-[#F1F5F9] text-[#64748B]">
                <Archive className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs text-[#64748B] font-medium">Archived</div>
                <div className="text-2xl font-bold text-[#1E1B4B] tracking-tight mt-0.5">
                  {archivedCount}
                </div>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-[#94A3B8] mt-1 shrink-0" />
          </div>
        </div>
      </div>

      {/* 3. Toolbar: Search, Status Tabs, Sort, and Filter */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Left: Search input */}
        <div className="relative flex-1 min-w-[220px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94A3B8]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search projects..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-[#E2E8F0] rounded-lg text-[#1E1B4B] placeholder-[#94A3B8] focus:outline-none focus:ring-1 focus:ring-[#6D28D9] focus:border-[#6D28D9] shadow-2xs"
          />
        </div>

        {/* Right: Status Tabs, Sort by, Filter */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Segmented Status Tabs */}
          <div className="inline-flex items-center p-1 bg-white border border-[#E2E8F0] rounded-lg shadow-2xs">
            {(['All', 'Active', 'Completed', 'Archived'] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setStatusFilter(tab)}
                className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors ${
                  statusFilter === tab
                    ? 'bg-[#EDE9FE] text-[#6D28D9]'
                    : 'text-[#64748B] hover:text-[#1E1B4B] hover:bg-slate-50'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Sort By Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsSortDropdownOpen(!isSortDropdownOpen)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#E2E8F0] bg-white text-xs font-medium text-[#1E1B4B] hover:bg-[#F8FAFC] shadow-2xs transition-colors"
            >
              <span>Sort by: {sortBy}</span>
              <ChevronDown className="w-3.5 h-3.5 text-[#64748B]" />
            </button>

            {isSortDropdownOpen && (
              <div className="absolute right-0 top-full mt-1 w-36 bg-white border border-[#E2E8F0] rounded-lg shadow-lg py-1 z-30">
                {(['Recent', 'Name', 'Progress', 'StartDate'] as const).map((sortOpt) => (
                  <button
                    key={sortOpt}
                    type="button"
                    onClick={() => {
                      setSortBy(sortOpt);
                      setIsSortDropdownOpen(false);
                    }}
                    className={`w-full text-left px-3 py-1.5 text-xs ${
                      sortBy === sortOpt ? 'font-bold text-[#6D28D9] bg-[#F5F3FF]' : 'text-[#334155] hover:bg-[#F8FAFC]'
                    }`}
                  >
                    {sortOpt}
                  </button>
                ))}
              </div>
            )}
          </div>

        </div>
      </div>

      {/* 4. Projects Table */}
      <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-xs">
        <div className="overflow-x-auto min-h-[220px] pb-16">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#F1F5F9] bg-[#F8FAFC]/60 text-[11px] font-semibold text-[#64748B]">
                <th className="py-3 px-4 font-semibold">Project</th>
                <th className="py-3 px-4 font-semibold">Workspace</th>
                <th className="py-3 px-4 font-semibold">Owner</th>
                <th className="py-3 px-4 font-semibold w-36">Progress</th>
                <th className="py-3 px-4 font-semibold">Start Date</th>
                <th className="py-3 px-4 font-semibold">End Date</th>
                <th className="py-3 px-4 font-semibold">Status</th>
                <th className="py-3 px-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F1F5F9]">
              {isLoading || isLoadingWorkspaces ? (
                <tr><td colSpan={8} className="py-12 text-center text-xs text-[#64748B]">Loading projects…</td></tr>
              ) : paginatedProjects.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-xs text-[#64748B]">
                    No marketing projects found matching your criteria.
                  </td>
                </tr>
              ) : (
                paginatedProjects.map((project) => (
                  <tr
                    key={project.id}
                    className="group hover:bg-[#F8F7FC]/70 transition-colors"
                  >
                    {/* Project Name & Description */}
                    <td className="py-3.5 px-4 min-w-[200px]">
                      <Link
                        to={`/projects/${project.id}`}
                        className="text-xs font-bold text-[#6D28D9] hover:underline block"
                      >
                        {project.name}
                      </Link>
                      <p className="text-[11px] text-[#64748B] mt-0.5 line-clamp-1 max-w-xs">
                        {project.description}
                      </p>
                    </td>

                    {/* Workspace */}
                    <td className="py-3.5 px-4 text-xs text-[#475569] whitespace-nowrap">
                      <div className="flex items-center gap-1.5 font-medium">
                        <Building2 className="w-3.5 h-3.5 text-[#6D28D9] shrink-0" />
                        <span>{project.workspaceName}</span>
                      </div>
                    </td>

                    {/* Owner */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0"
                          style={{
                            backgroundColor: project.owner.avatarBg || '#EDE9FE',
                            color: project.owner.avatarColor || '#6D28D9',
                          }}
                        >
                          {project.owner.initials}
                        </div>
                        <span className="text-xs text-[#1E1B4B] font-medium">
                          {project.owner.name}
                        </span>
                      </div>
                    </td>

                    {/* Progress Bar */}
                    <td className="py-3.5 px-4 w-36 whitespace-nowrap">
                      <div className="flex items-center justify-between text-xs font-semibold text-[#1E1B4B] mb-1">
                        <span>{project.progress}%</span>
                      </div>
                      <div className="w-full bg-[#F1F5F9] rounded-full h-1.5 overflow-hidden">
                        <div
                          className="bg-[#6D28D9] h-1.5 rounded-full transition-all duration-500"
                          style={{ width: `${project.progress}%` }}
                        />
                      </div>
                    </td>

                    {/* Start Date */}
                    <td className="py-3.5 px-4 text-xs text-[#475569] whitespace-nowrap">
                      {project.startDate}
                    </td>

                    {/* End Date */}
                    <td className="py-3.5 px-4 text-xs text-[#475569] whitespace-nowrap">
                      {project.endDate}
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {renderStatusBadge(project.status)}
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => navigate(`/projects/${project.id}`)}
                          className="px-3 py-1 text-xs font-semibold text-[#6D28D9] border border-[#E2E8F0] rounded-lg hover:bg-[#F5F3FF] transition-colors"
                        >
                          Open
                        </button>

                        <ActionDropdown
                          isOpen={activeMenuId === project.id}
                          onClose={() => setActiveMenuId(null)}
                          ariaLabel={`Actions for project ${project.name}`}
                          trigger={
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveMenuId(activeMenuId === project.id ? null : project.id);
                              }}
                              className="p-1 rounded text-[#94A3B8] hover:text-[#1E1B4B] hover:bg-slate-100 transition-colors cursor-pointer"
                              aria-label="Project actions"
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
                              openEditModal(project);
                            }}
                            className="w-full text-left px-3 py-1.5 text-xs text-[#1E1B4B] hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
                          >
                            <Edit2 className="w-3.5 h-3.5 text-[#64748B]" />
                            Edit Project
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setActiveMenuId(null);
                              handleToggleArchive(project.id);
                            }}
                            className="w-full text-left px-3 py-1.5 text-xs text-[#1E1B4B] hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
                          >
                            {project.status === 'Archived' ? (
                              <>
                                <RotateCcw className="w-3.5 h-3.5 text-[#64748B]" />
                                Restore
                              </>
                            ) : (
                              <>
                                <Archive className="w-3.5 h-3.5 text-[#64748B]" />
                                Archive
                              </>
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setActiveMenuId(null);
                              setProjectToDelete(project);
                              setDeleteError(null);
                            }}
                            className="w-full text-left px-3 py-1.5 text-xs text-red-600 hover:bg-red-50 flex items-center gap-2 cursor-pointer"
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

        {/* 5. Pagination Footer */}
        <div className="p-4 border-t border-[#F1F5F9] flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs text-[#64748B]">
            Showing {filteredProjects.length === 0 ? 0 : (currentPage - 1) * pageSize + 1}–
            {Math.min(currentPage * pageSize, filteredProjects.length)} of {filteredProjects.length} projects
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="px-3 py-1 text-xs font-medium text-[#64748B] border border-[#E2E8F0] rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none transition-colors"
            >
              &lt; Previous
            </button>

            {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
              <button
                key={pageNum}
                type="button"
                onClick={() => setCurrentPage(pageNum)}
                className={`min-w-[28px] h-7 px-2 text-xs font-semibold rounded-lg transition-colors ${
                  currentPage === pageNum
                    ? 'border border-[#6D28D9] text-[#6D28D9] bg-white'
                    : 'text-[#64748B] hover:text-[#1E1B4B] hover:bg-slate-50'
                }`}
              >
                {pageNum}
              </button>
            ))}

            <button
              type="button"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="px-3 py-1 text-xs font-medium text-[#64748B] border border-[#E2E8F0] rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none transition-colors"
            >
              Next &gt;
            </button>
          </div>
        </div>
      </div>

      {/* 6. Create / Edit Project Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-xl border border-[#E2E8F0] w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-5 py-4 border-b border-[#F1F5F9] flex items-center justify-between">
              <h3 className="text-base font-bold text-[#1E1B4B]">
                {editingProject ? 'Edit Project' : 'Create New Project'}
              </h3>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1 rounded text-[#94A3B8] hover:text-[#1E1B4B] hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProject} className="p-5 space-y-3.5">
              {actionError && <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-xs text-red-700">{actionError}</p>}
              <div>
                <label className="block text-xs font-semibold text-[#1E1B4B] mb-1">
                  Project Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. Winter Sales Boost"
                  className={`w-full px-3 py-2 text-xs bg-white border rounded-lg text-[#1E1B4B] focus:outline-none focus:ring-1 focus:ring-[#6D28D9] ${
                    formErrors.name ? 'border-red-500' : 'border-[#E2E8F0]'
                  }`}
                />
                {formErrors.name && (
                  <p className="text-[11px] text-red-500 mt-1">{formErrors.name}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#1E1B4B] mb-1">
                  Description
                </label>
                <textarea
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  rows={2}
                  placeholder="Brief description of the marketing initiative..."
                  className="w-full px-3 py-2 text-xs bg-white border border-[#E2E8F0] rounded-lg text-[#1E1B4B] focus:outline-none focus:ring-1 focus:ring-[#6D28D9]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#1E1B4B] mb-1">
                    Workspace
                  </label>
                  <select
                    value={formWorkspaceName}
                    disabled
                    className="w-full px-2.5 py-2 text-xs bg-white border border-[#E2E8F0] rounded-lg text-[#1E1B4B] focus:outline-none focus:ring-1 focus:ring-[#6D28D9]"
                  >
                    <option value={formWorkspaceName}>{formWorkspaceName || 'Select an active workspace'}</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#1E1B4B] mb-1">
                    Owner
                  </label>
                  <input
                    value={formOwnerName}
                    disabled
                    className="w-full px-2.5 py-2 text-xs bg-slate-50 border border-[#E2E8F0] rounded-lg text-[#64748B]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#1E1B4B] mb-1">
                    Start Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={formStartDate}
                    onChange={(e) => setFormStartDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-white border border-[#E2E8F0] rounded-lg text-[#1E1B4B] focus:outline-none focus:ring-1 focus:ring-[#6D28D9]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#1E1B4B] mb-1">
                    End Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={formEndDate}
                    onChange={(e) => setFormEndDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-white border border-[#E2E8F0] rounded-lg text-[#1E1B4B] focus:outline-none focus:ring-1 focus:ring-[#6D28D9]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#1E1B4B] mb-1">
                    Status
                  </label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as MarketingProjectStatus)}
                    className="w-full px-2.5 py-2 text-xs bg-white border border-[#E2E8F0] rounded-lg text-[#1E1B4B] focus:outline-none focus:ring-1 focus:ring-[#6D28D9]"
                  >
                    <option value="Active">Active</option>
                    <option value="Completed">Completed</option>
                    <option value="Archived">Archived</option>
                    <option value="Draft">Draft</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#1E1B4B] mb-1">
                    Progress ({formProgress}%)
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={formProgress}
                    onChange={(e) => setFormProgress(parseInt(e.target.value, 10))}
                    className="w-full mt-2 accent-[#6D28D9]"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-[#F1F5F9] flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-3.5 py-2 text-xs font-semibold text-[#64748B] hover:text-[#1E1B4B] border border-[#E2E8F0] rounded-lg hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving || !hasWorkspace}
                  className="px-4 py-2 text-xs font-semibold text-white bg-[#6D28D9] rounded-lg hover:bg-[#5B21B6] transition-colors shadow-2xs disabled:opacity-50"
                >
                  {isSaving ? 'Saving…' : editingProject ? 'Save Changes' : 'Create Project'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Project Confirmation Modal */}
      {projectToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-xl border border-[#E2E8F0] w-full max-w-md p-6">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-full bg-red-100 text-red-600 shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <h3 className="text-base font-bold text-[#1E1B4B]">Delete Project</h3>
                <p className="text-xs text-[#64748B] mt-1">
                  Are you sure you want to delete <span className="font-semibold text-[#1E1B4B]">"{projectToDelete.name}"</span>?
                </p>
              </div>
            </div>

            {deleteError ? (
              <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div className="text-xs text-amber-800 space-y-1">
                    <p className="font-semibold">Project cannot be deleted</p>
                    <p>{deleteError}</p>
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const projId = projectToDelete.id;
                      setProjectToDelete(null);
                      setDeleteError(null);
                      handleToggleArchive(projId);
                    }}
                    className="px-3 py-1.5 text-xs font-semibold text-[#6D28D9] bg-[#F5F3FF] hover:bg-[#EDE9FE] rounded-lg transition-colors"
                  >
                    Archive Project Instead
                  </button>
                </div>
              </div>
            ) : (
              <div className="mt-4 p-3 bg-red-50 border border-red-100 rounded-lg text-xs text-red-700">
                This action cannot be undone. Any projects with linked tasks, campaigns, strategies, or records will be protected from deletion.
              </div>
            )}

            <div className="mt-6 flex items-center justify-end gap-2">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => {
                  setProjectToDelete(null);
                  setDeleteError(null);
                }}
                className="px-3.5 py-2 text-xs font-semibold text-[#64748B] hover:text-[#1E1B4B] border border-[#E2E8F0] rounded-lg hover:bg-slate-50 transition-colors"
              >
                {deleteError ? 'Close' : 'Cancel'}
              </button>
              {!deleteError && (
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={confirmDeleteProject}
                  className="px-4 py-2 text-xs font-semibold text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors shadow-2xs disabled:opacity-50"
                >
                  {isDeleting ? 'Deleting…' : 'Delete Project'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default ProjectsListPage;
