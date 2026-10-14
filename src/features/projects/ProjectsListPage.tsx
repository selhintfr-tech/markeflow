import React, { useState, useMemo, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  FolderKanban,
  Play,
  CheckCircle2,
  Archive,
  ChevronRight,
  Search,
  ChevronDown,
  SlidersHorizontal,
  Building2,
  Plus,
  MoreHorizontal,
  X,
  Edit2,
  Trash2,
  RotateCcw,
} from 'lucide-react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { initialMarketingProjectsList } from '../../data/mock';
import type { MarketingProjectItem, MarketingProjectStatus } from '../../types';

export const ProjectsListPage: React.FC = () => {
  const navigate = useNavigate();
  const { currentWorkspace, workspaces } = useWorkspace();

  const STORAGE_KEY = 'marketflow_projects_v2';

  // Load projects from localStorage or fallback to initial list
  const [projects, setProjects] = useState<MarketingProjectItem[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // ignore
    }
    return initialMarketingProjectsList;
  });

  // Save to localStorage whenever projects change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
    } catch {
      // ignore
    }
  }, [projects]);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Active' | 'Completed' | 'Archived'>('All');
  const [workspaceFilter, setWorkspaceFilter] = useState<string>('All');
  const [sortBy, setSortBy] = useState<'Recent' | 'Name' | 'Progress' | 'StartDate'>('Recent');
  const [isFilterDropdownOpen, setIsFilterDropdownOpen] = useState(false);
  const [isSortDropdownOpen, setIsSortDropdownOpen] = useState(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 5;

  // Modals & Menu
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<MarketingProjectItem | null>(null);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  // Form states for Create/Edit
  const [formName, setFormName] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formWorkspaceName, setFormWorkspaceName] = useState('Atlas Retail SARL');
  const [formOwnerName, setFormOwnerName] = useState('Sara El Amrani');
  const [formStartDate, setFormStartDate] = useState('01 Nov 2026');
  const [formEndDate, setFormEndDate] = useState('30 Nov 2026');
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

        // Workspace filter
        if (workspaceFilter !== 'All' && project.workspaceName !== workspaceFilter) {
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
  }, [projects, searchQuery, statusFilter, workspaceFilter, sortBy]);

  // Reset page when filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, workspaceFilter, sortBy]);

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
    setFormWorkspaceName(currentWorkspace?.name || 'Atlas Retail SARL');
    setFormOwnerName('Sara El Amrani');
    setFormStartDate('01 Nov 2026');
    setFormEndDate('30 Nov 2026');
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

  const handleSaveProject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    const ownerInitials = formOwnerName
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase();

    if (editingProject) {
      // Edit existing
      setProjects((prev) =>
        prev.map((p) =>
          p.id === editingProject.id
            ? {
                ...p,
                name: formName.trim(),
                description: formDesc.trim(),
                workspaceName: formWorkspaceName,
                owner: {
                  ...p.owner,
                  name: formOwnerName,
                  initials: ownerInitials,
                },
                startDate: formStartDate,
                endDate: formEndDate,
                status: formStatus,
                progress: formProgress,
              }
            : p
        )
      );
    } else {
      // Create new
      const newId = formName.toLowerCase().replace(/[^a-z0-9]+/g, '-') + `-${Date.now().toString().slice(-4)}`;
      const newProj: MarketingProjectItem = {
        id: newId,
        name: formName.trim(),
        description: formDesc.trim() || 'Marketing initiative.',
        workspaceId: currentWorkspace?.id || 'ws-atlas-retail',
        workspaceName: formWorkspaceName,
        workspaceIconType: 'building',
        owner: {
          name: formOwnerName,
          initials: ownerInitials,
          avatarBg: '#EDE9FE',
          avatarColor: '#6D28D9',
        },
        progress: formProgress,
        startDate: formStartDate,
        endDate: formEndDate,
        status: formStatus,
        createdAt: new Date().toISOString().split('T')[0],
      };
      setProjects((prev) => [newProj, ...prev]);
    }

    setIsCreateModalOpen(false);
  };

  // Actions
  const handleToggleArchive = (id: string) => {
    setProjects((prev) =>
      prev.map((p) => {
        if (p.id === id) {
          return {
            ...p,
            status: p.status === 'Archived' ? 'Active' : 'Archived',
          };
        }
        return p;
      })
    );
    setActiveMenuId(null);
  };

  const handleDeleteProject = (id: string) => {
    setProjects((prev) => prev.filter((p) => p.id !== id));
    setActiveMenuId(null);
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
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#6D28D9] text-white text-xs font-semibold rounded-lg hover:bg-[#5B21B6] transition-colors shadow-2xs self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Create project</span>
          </button>
        </div>
      </div>

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

          {/* Filter Button */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsFilterDropdownOpen(!isFilterDropdownOpen)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border bg-white text-xs font-medium shadow-2xs transition-colors ${
                workspaceFilter !== 'All'
                  ? 'border-[#6D28D9] text-[#6D28D9] bg-[#F5F3FF]'
                  : 'border-[#E2E8F0] text-[#1E1B4B] hover:bg-[#F8FAFC]'
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Filter</span>
            </button>

            {isFilterDropdownOpen && (
              <div className="absolute right-0 top-full mt-1 w-52 bg-white border border-[#E2E8F0] rounded-lg shadow-lg p-3 z-30 space-y-2">
                <div className="text-xs font-bold text-[#1E1B4B]">Filter by Workspace</div>
                <select
                  value={workspaceFilter}
                  onChange={(e) => {
                    setWorkspaceFilter(e.target.value);
                    setIsFilterDropdownOpen(false);
                  }}
                  className="w-full px-2 py-1.5 text-xs bg-slate-50 border border-[#E2E8F0] rounded-md text-[#1E1B4B]"
                >
                  <option value="All">All Workspaces</option>
                  <option value="Atlas Retail SARL">Atlas Retail SARL</option>
                  <option value="Nova Studio SARL">Nova Studio SARL</option>
                </select>

                {workspaceFilter !== 'All' && (
                  <button
                    type="button"
                    onClick={() => {
                      setWorkspaceFilter('All');
                      setIsFilterDropdownOpen(false);
                    }}
                    className="text-[11px] text-[#6D28D9] hover:underline block pt-1"
                  >
                    Reset filters
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 4. Projects Table */}
      <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
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
              {paginatedProjects.length === 0 ? (
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
                    <td className="py-3.5 px-4 text-right whitespace-nowrap relative">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => navigate(`/projects/${project.id}`)}
                          className="px-3 py-1 text-xs font-semibold text-[#6D28D9] border border-[#E2E8F0] rounded-lg hover:bg-[#F5F3FF] transition-colors"
                        >
                          Open
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            setActiveMenuId(activeMenuId === project.id ? null : project.id)
                          }
                          className="p-1 rounded text-[#94A3B8] hover:text-[#1E1B4B] hover:bg-slate-100 transition-colors"
                        >
                          <MoreHorizontal className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Contextual Action Menu */}
                      {activeMenuId === project.id && (
                        <div className="absolute right-4 top-11 w-36 bg-white border border-[#E2E8F0] rounded-lg shadow-lg py-1 z-30 text-left">
                          <button
                            type="button"
                            onClick={() => {
                              setActiveMenuId(null);
                              openEditModal(project);
                            }}
                            className="w-full text-left px-3 py-1.5 text-xs text-[#1E1B4B] hover:bg-slate-50 flex items-center gap-2"
                          >
                            <Edit2 className="w-3.5 h-3.5 text-[#64748B]" />
                            Edit Project
                          </button>
                          <button
                            type="button"
                            onClick={() => handleToggleArchive(project.id)}
                            className="w-full text-left px-3 py-1.5 text-xs text-[#1E1B4B] hover:bg-slate-50 flex items-center gap-2"
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
                            onClick={() => handleDeleteProject(project.id)}
                            className="w-full text-left px-3 py-1.5 text-xs text-red-600 hover:bg-red-50 flex items-center gap-2"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-red-500" />
                            Delete
                          </button>
                        </div>
                      )}
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
                    onChange={(e) => setFormWorkspaceName(e.target.value)}
                    className="w-full px-2.5 py-2 text-xs bg-white border border-[#E2E8F0] rounded-lg text-[#1E1B4B] focus:outline-none focus:ring-1 focus:ring-[#6D28D9]"
                  >
                    {workspaces.map((ws) => (
                      <option key={ws.id} value={ws.name}>
                        {ws.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#1E1B4B] mb-1">
                    Owner
                  </label>
                  <select
                    value={formOwnerName}
                    onChange={(e) => setFormOwnerName(e.target.value)}
                    className="w-full px-2.5 py-2 text-xs bg-white border border-[#E2E8F0] rounded-lg text-[#1E1B4B] focus:outline-none focus:ring-1 focus:ring-[#6D28D9]"
                  >
                    <option value="Sara El Amrani">Sara El Amrani</option>
                    <option value="Yassine Bouchra">Yassine Bouchra</option>
                    <option value="Imane Benkirane">Imane Benkirane</option>
                    <option value="Mehdi Zahraoui">Mehdi Zahraoui</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#1E1B4B] mb-1">
                    Start Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formStartDate}
                    onChange={(e) => setFormStartDate(e.target.value)}
                    placeholder="01 Nov 2026"
                    className="w-full px-3 py-2 text-xs bg-white border border-[#E2E8F0] rounded-lg text-[#1E1B4B] focus:outline-none focus:ring-1 focus:ring-[#6D28D9]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#1E1B4B] mb-1">
                    End Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formEndDate}
                    onChange={(e) => setFormEndDate(e.target.value)}
                    placeholder="30 Nov 2026"
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
                  className="px-4 py-2 text-xs font-semibold text-white bg-[#6D28D9] rounded-lg hover:bg-[#5B21B6] transition-colors shadow-2xs"
                >
                  {editingProject ? 'Save Changes' : 'Create Project'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
export default ProjectsListPage;
