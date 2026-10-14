import React, { useState, useMemo, useEffect } from 'react';
import {
  Plus,
  Info,
  Search,
  ChevronDown,
  Building2,
  Users,
  MapPin,
  MoreHorizontal,
  X,
  Check,
  AlertCircle,
  Pencil,
  Trash2,
  ExternalLink,
} from 'lucide-react';
import { useWorkspace } from '../../context/WorkspaceContext';
import type { WorkspaceDetail } from '../../types';

export const WorkspacesPage: React.FC = () => {
  const {
    workspaces,
    currentWorkspace,
    setCurrentWorkspace,
    addWorkspace,
    updateWorkspace,
    deleteWorkspace,
  } = useWorkspace();

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Active' | 'Inactive'>('All');
  const [isStatusDropdownOpen, setIsStatusDropdownOpen] = useState(false);

  // Modals & Menu State
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingWorkspace, setEditingWorkspace] = useState<WorkspaceDetail | null>(null);
  const [activeMenuWorkspaceId, setActiveMenuWorkspaceId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Form State (New Workspace)
  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newLocation, setNewLocation] = useState('Casablanca, Morocco');
  const [newStatus, setNewStatus] = useState('Active');
  const [formError, setFormError] = useState<string | null>(null);

  // Form State (Edit Workspace)
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editLocation, setEditLocation] = useState('');
  const [editStatus, setEditStatus] = useState('Active');

  // Handle Escape key to close modals
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isNewModalOpen) setIsNewModalOpen(false);
        if (isEditModalOpen) setIsEditModalOpen(false);
        if (deleteConfirmId) setDeleteConfirmId(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isNewModalOpen, isEditModalOpen, deleteConfirmId]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Filtered Workspaces
  const filteredWorkspaces = useMemo(() => {
    return workspaces.filter((ws) => {
      const matchesSearch =
        ws.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ws.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ws.location.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus =
        statusFilter === 'All' ||
        (statusFilter === 'Active' && ws.status === 'Active') ||
        (statusFilter === 'Inactive' && ws.status !== 'Active');

      return matchesSearch && matchesStatus;
    });
  }, [workspaces, searchQuery, statusFilter]);

  const handleCreateWorkspace = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) {
      setFormError('Workspace name is required.');
      return;
    }
    const created = addWorkspace({
      name: newName.trim(),
      description: newDescription.trim() || 'Marketing workspace',
      location: newLocation.trim() || 'Casablanca, Morocco',
      status: newStatus,
    });
    setNewName('');
    setNewDescription('');
    setNewLocation('Casablanca, Morocco');
    setNewStatus('Active');
    setFormError(null);
    setIsNewModalOpen(false);
    showToast(`Workspace "${created.name}" created successfully.`);
  };

  const openEditModal = (ws: WorkspaceDetail) => {
    setEditingWorkspace(ws);
    setEditName(ws.name);
    setEditDescription(ws.description);
    setEditLocation(ws.location);
    setEditStatus(ws.status);
    setActiveMenuWorkspaceId(null);
    setIsEditModalOpen(true);
  };

  const handleUpdateWorkspace = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingWorkspace || !editName.trim()) return;
    updateWorkspace(editingWorkspace.id, {
      name: editName.trim(),
      description: editDescription.trim(),
      location: editLocation.trim(),
      status: editStatus,
    });
    setIsEditModalOpen(false);
    setEditingWorkspace(null);
    showToast(`Workspace "${editName.trim()}" updated successfully.`);
  };

  const handleDeleteWorkspace = (id: string) => {
    const success = deleteWorkspace(id);
    if (!success) {
      showToast('Cannot delete the only remaining workspace.');
    } else {
      showToast('Workspace deleted.');
    }
    setDeleteConfirmId(null);
    setActiveMenuWorkspaceId(null);
  };

  const handleSwitchWorkspace = (ws: WorkspaceDetail) => {
    setCurrentWorkspace(ws);
    setActiveMenuWorkspaceId(null);
    showToast(`Switched active workspace to "${ws.name}".`);
  };

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto pb-16">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#1E1B4B] text-white text-xs font-semibold px-4 py-3 rounded-xl shadow-xl flex items-center gap-2.5 animate-in fade-in slide-in-from-bottom-3 duration-200">
          <Check className="w-4 h-4 text-[#10B981] stroke-[2.5]" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-xs text-[#64748B]">
        <span>Organization</span>
        <span>/</span>
        <span className="text-[#1E1B4B] font-medium">Workspaces</span>
      </div>

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-extrabold tracking-tight text-[#1E1B4B]">
            Workspaces
          </h1>
          <p className="text-sm text-[#64748B] mt-1">
            Manage the organizations and teams you work with.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsNewModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#6D28D9] hover:bg-[#5B21B6] text-white text-xs font-semibold shadow-xs hover:shadow-md transition-all self-start sm:self-auto cursor-pointer"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>New workspace</span>
        </button>
      </div>

      {/* Information Banner */}
      <div className="bg-white rounded-xl border border-[#EDE9FE] p-4 shadow-2xs flex items-start gap-3.5">
        <div className="w-9 h-9 rounded-full bg-[#EDE9FE] text-[#6D28D9] flex items-center justify-center shrink-0 mt-0.5">
          <Info className="w-5 h-5 stroke-[2.2]" />
        </div>
        <div className="text-xs space-y-0.5">
          <div className="font-bold text-[#1E1B4B]">
            Each workspace keeps campaigns, budgets, reports and team access separated.
          </div>
          <div className="text-[#64748B] leading-relaxed">
            Create a new workspace for a different brand, client or organization to keep your data, members and settings independent.
          </div>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-2xs overflow-hidden">
        {/* Table Toolbar */}
        <div className="p-4 sm:p-5 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-b border-[#F1F5F9]">
          {/* Search field */}
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-[#94A3B8] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search workspaces..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3.5 py-2 rounded-lg border border-[#E2E8F0] bg-white text-xs text-[#1E1B4B] placeholder-[#94A3B8] focus:outline-none focus:border-[#6D28D9] focus:ring-1 focus:ring-[#6D28D9] transition-colors"
            />
          </div>

          {/* Status Dropdown */}
          <div className="relative self-end sm:self-auto">
            <button
              type="button"
              onClick={() => setIsStatusDropdownOpen(!isStatusDropdownOpen)}
              className="flex items-center gap-2 px-3.5 py-2 rounded-lg border border-[#E2E8F0] bg-white hover:bg-slate-50 text-xs font-medium text-[#1E1B4B] shadow-2xs transition-colors cursor-pointer"
            >
              <span>{statusFilter === 'All' ? 'All statuses' : statusFilter}</span>
              <ChevronDown className="w-3.5 h-3.5 text-[#94A3B8]" />
            </button>

            {isStatusDropdownOpen && (
              <div className="absolute right-0 mt-1.5 w-40 rounded-lg bg-white border border-[#E2E8F0] shadow-lg py-1 z-30 animate-in fade-in zoom-in-95 duration-100">
                {(['All', 'Active', 'Inactive'] as const).map((status) => (
                  <button
                    key={status}
                    type="button"
                    onClick={() => {
                      setStatusFilter(status);
                      setIsStatusDropdownOpen(false);
                    }}
                    className="w-full flex items-center justify-between px-3.5 py-1.5 text-xs text-left hover:bg-[#F5F3FF] text-[#1E1B4B] transition-colors"
                  >
                    <span>{status === 'All' ? 'All statuses' : status}</span>
                    {statusFilter === status && <Check className="w-3.5 h-3.5 text-[#6D28D9]" />}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Workspaces Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#F1F5F9] text-[11px] font-semibold text-[#64748B]">
                <th className="py-3 px-6 font-semibold">Workspace</th>
                <th className="py-3 px-6 font-semibold">Location</th>
                <th className="py-3 px-6 font-semibold">Members</th>
                <th className="py-3 px-6 font-semibold">Projects</th>
                <th className="py-3 px-6 font-semibold">Status</th>
                <th className="py-3 px-6 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F8FAFC]">
              {filteredWorkspaces.map((ws) => {
                const isCurrent = ws.id === currentWorkspace.id;
                const isNova = ws.id === 'ws-nova-studio' || ws.iconType === 'users';

                return (
                  <tr
                    key={ws.id}
                    className={`hover:bg-[#FDFCFE] transition-colors ${
                      isCurrent ? 'bg-[#FCFBFE]/40' : ''
                    }`}
                  >
                    {/* Workspace Column */}
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3.5">
                        <div
                          className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                            isNova ? 'bg-[#FDF2F8] text-[#DB2777]' : 'bg-[#EDE9FE] text-[#6D28D9]'
                          }`}
                        >
                          {isNova ? (
                            <Users className="w-5 h-5 stroke-[2.2]" />
                          ) : (
                            <Building2 className="w-5 h-5 stroke-[2.2]" />
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-[#1E1B4B]">{ws.name}</span>
                            {isCurrent && (
                              <span className="px-2 py-0.5 rounded-md bg-[#EDE9FE] text-[#6D28D9] text-[11px] font-medium leading-none">
                                Current workspace
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-[#64748B] mt-0.5 leading-snug">
                            {ws.description}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Location Column */}
                    <td className="py-4 px-6 text-xs text-[#475569]">
                      <div className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-[#94A3B8] shrink-0" />
                        <span>{ws.location}</span>
                      </div>
                    </td>

                    {/* Members Column */}
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-2">
                        {/* Avatar stack */}
                        <div className="flex items-center -space-x-2">
                          {(ws.membersAvatars || []).slice(0, 4).map((avatar) => (
                            <div
                              key={avatar.id}
                              className="w-6 h-6 rounded-full border-2 border-white overflow-hidden bg-[#EDE9FE] text-[#6D28D9] flex items-center justify-center text-[9px] font-bold shadow-2xs"
                              title={avatar.name}
                            >
                              {avatar.avatarUrl ? (
                                <img
                                  src={avatar.avatarUrl}
                                  alt={avatar.name}
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    // Fallback to initials if image link breaks
                                    (e.target as HTMLElement).style.display = 'none';
                                  }}
                                />
                              ) : (
                                avatar.initials
                              )}
                            </div>
                          ))}
                          {ws.extraMembersCount && ws.extraMembersCount > 0 && (
                            <div className="w-6 h-6 rounded-full border-2 border-white bg-[#EDE9FE] text-[#6D28D9] flex items-center justify-center text-[10px] font-semibold shadow-2xs">
                              +{ws.extraMembersCount}
                            </div>
                          )}
                        </div>
                        <span className="text-xs font-bold text-[#1E1B4B] ml-1">
                          {ws.membersCount}
                        </span>
                      </div>
                    </td>

                    {/* Projects Column */}
                    <td className="py-4 px-6 text-xs font-semibold text-[#1E1B4B]">
                      {ws.projectsCount}
                    </td>

                    {/* Status Column */}
                    <td className="py-4 px-6">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium ${
                          ws.status === 'Active'
                            ? 'bg-[#CCFBF1] text-[#0D9488]'
                            : 'bg-[#F1F5F9] text-[#64748B]'
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            ws.status === 'Active' ? 'bg-[#0D9488]' : 'bg-[#94A3B8]'
                          }`}
                        />
                        <span>{ws.status}</span>
                      </span>
                    </td>

                    {/* Actions Column */}
                    <td className="py-4 px-6 text-right">
                      <div className="relative inline-flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleSwitchWorkspace(ws)}
                          className="px-3.5 py-1.5 rounded-lg border border-[#E2E8F0] hover:border-[#CBD5E1] bg-white hover:bg-slate-50 text-xs font-semibold text-[#1E1B4B] shadow-2xs transition-colors cursor-pointer"
                        >
                          Open Workspace
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            setActiveMenuWorkspaceId(
                              activeMenuWorkspaceId === ws.id ? null : ws.id
                            )
                          }
                          className="p-1.5 rounded-lg text-[#94A3B8] hover:text-[#475569] hover:bg-slate-100 transition-colors cursor-pointer"
                        >
                          <MoreHorizontal className="w-4 h-4" />
                        </button>

                        {/* Three-dot Context Menu */}
                        {activeMenuWorkspaceId === ws.id && (
                          <div className="absolute right-0 top-full mt-1 w-44 rounded-lg bg-white border border-[#E2E8F0] shadow-lg py-1 z-30 text-left animate-in fade-in zoom-in-95 duration-100">
                            {!isCurrent && (
                              <button
                                type="button"
                                onClick={() => handleSwitchWorkspace(ws)}
                                className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-[#1E1B4B] hover:bg-[#F5F3FF]"
                              >
                                <ExternalLink className="w-3.5 h-3.5 text-[#6D28D9]" />
                                <span>Switch to workspace</span>
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => openEditModal(ws)}
                              className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-[#1E1B4B] hover:bg-[#F5F3FF]"
                            >
                              <Pencil className="w-3.5 h-3.5 text-[#64748B]" />
                              <span>Edit workspace</span>
                            </button>
                            {workspaces.length > 1 && (
                              <button
                                type="button"
                                onClick={() => setDeleteConfirmId(ws.id)}
                                className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-red-600 hover:bg-red-50"
                              >
                                <Trash2 className="w-3.5 h-3.5 text-red-500" />
                                <span>Delete workspace</span>
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filteredWorkspaces.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-xs text-[#94A3B8]">
                    No workspaces match your search or filter criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer */}
        <div className="px-6 py-3.5 bg-[#FAFBFD] border-t border-[#F1F5F9] text-xs font-medium text-[#64748B]">
          {filteredWorkspaces.length} workspace{filteredWorkspaces.length !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Modal: Create New Workspace */}
      {isNewModalOpen && (
        <div role="dialog" aria-modal="true" aria-labelledby="new-workspace-modal-title" className="fixed inset-0 z-50 bg-[#0F172A]/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-2xl max-w-md w-full p-6 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-[#F1F5F9]">
              <h2 id="new-workspace-modal-title" className="text-base font-bold text-[#1E1B4B]">Create new workspace</h2>
              <button
                type="button"
                onClick={() => {
                  setIsNewModalOpen(false);
                  setFormError(null);
                }}
                className="p-1 rounded-lg text-[#94A3B8] hover:text-[#475569] hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {formError && (
              <div className="mt-3 p-2.5 rounded-lg bg-red-50 text-red-600 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleCreateWorkspace} className="mt-4 space-y-4 text-xs">
              <div>
                <label htmlFor="new-workspace-name-input" className="block font-semibold text-[#1E1B4B] mb-1">Workspace Name *</label>
                <input
                  id="new-workspace-name-input"
                  type="text"
                  placeholder="e.g. Atlas Growth SARL"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-[#E2E8F0] focus:border-[#6D28D9] focus:ring-1 focus:ring-[#6D28D9] outline-none"
                  autoFocus
                />
              </div>

              <div>
                <label htmlFor="new-workspace-desc-input" className="block font-semibold text-[#1E1B4B] mb-1">Description</label>
                <input
                  id="new-workspace-desc-input"
                  type="text"
                  placeholder="e.g. Retail and omnichannel marketing operations"
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-[#E2E8F0] focus:border-[#6D28D9] focus:ring-1 focus:ring-[#6D28D9] outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#1E1B4B] mb-1">Location</label>
                  <input
                    type="text"
                    value={newLocation}
                    onChange={(e) => setNewLocation(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-[#E2E8F0] focus:border-[#6D28D9] focus:ring-1 focus:ring-[#6D28D9] outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[#1E1B4B] mb-1">Status</label>
                  <select
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-[#E2E8F0] focus:border-[#6D28D9] focus:ring-1 focus:ring-[#6D28D9] outline-none bg-white"
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#F1F5F9]">
                <button
                  type="button"
                  onClick={() => setIsNewModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-[#E2E8F0] text-[#64748B] hover:bg-slate-50 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-[#6D28D9] hover:bg-[#5B21B6] text-white font-semibold shadow-xs"
                >
                  Create workspace
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Edit Workspace */}
      {isEditModalOpen && editingWorkspace && (
        <div role="dialog" aria-modal="true" aria-labelledby="edit-workspace-modal-title" className="fixed inset-0 z-50 bg-[#0F172A]/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-2xl max-w-md w-full p-6 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-[#F1F5F9]">
              <h2 id="edit-workspace-modal-title" className="text-base font-bold text-[#1E1B4B]">Edit workspace</h2>
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="p-1 rounded-lg text-[#94A3B8] hover:text-[#475569] hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUpdateWorkspace} className="mt-4 space-y-4 text-xs">
              <div>
                <label htmlFor="edit-workspace-name-input" className="block font-semibold text-[#1E1B4B] mb-1">Workspace Name *</label>
                <input
                  id="edit-workspace-name-input"
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-[#E2E8F0] focus:border-[#6D28D9] focus:ring-1 focus:ring-[#6D28D9] outline-none"
                  required
                />
              </div>

              <div>
                <label htmlFor="edit-workspace-desc-input" className="block font-semibold text-[#1E1B4B] mb-1">Description</label>
                <input
                  id="edit-workspace-desc-input"
                  type="text"
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-[#E2E8F0] focus:border-[#6D28D9] focus:ring-1 focus:ring-[#6D28D9] outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#1E1B4B] mb-1">Location</label>
                  <input
                    type="text"
                    value={editLocation}
                    onChange={(e) => setEditLocation(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-[#E2E8F0] focus:border-[#6D28D9] focus:ring-1 focus:ring-[#6D28D9] outline-none"
                  />
                </div>
                <div>
                  <label htmlFor="edit-workspace-status-select" className="block font-semibold text-[#1E1B4B] mb-1">Status</label>
                  <select
                    id="edit-workspace-status-select"
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-[#E2E8F0] focus:border-[#6D28D9] focus:ring-1 focus:ring-[#6D28D9] outline-none bg-white"
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#F1F5F9]">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-[#E2E8F0] text-[#64748B] hover:bg-slate-50 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-[#6D28D9] hover:bg-[#5B21B6] text-white font-semibold shadow-xs"
                >
                  Save changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {deleteConfirmId && (
        <div role="alertdialog" aria-modal="true" aria-labelledby="delete-workspace-dialog-title" aria-describedby="delete-workspace-dialog-desc" className="fixed inset-0 z-50 bg-[#0F172A]/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-2xl max-w-sm w-full p-6 animate-in zoom-in-95 duration-150 text-center">
            <div className="w-10 h-10 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-3">
              <Trash2 className="w-5 h-5 stroke-[2.2]" />
            </div>
            <h3 className="text-base font-bold text-[#1E1B4B]">Delete workspace?</h3>
            <p className="text-xs text-[#64748B] mt-1.5 leading-relaxed">
              Are you sure you want to delete this workspace? This will remove its associated projects and settings.
            </p>
            <div className="flex items-center justify-center gap-2.5 mt-5">
              <button
                type="button"
                onClick={() => setDeleteConfirmId(null)}
                className="px-4 py-2 rounded-lg border border-[#E2E8F0] text-[#64748B] hover:bg-slate-50 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleDeleteWorkspace(deleteConfirmId)}
                className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-semibold shadow-xs"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
