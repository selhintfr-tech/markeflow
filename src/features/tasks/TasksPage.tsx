import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useWorkspace } from '../../context/WorkspaceContext';
import { useAuth } from '../../context/AuthContext';
import { projectService, type ProjectRecord } from '../projects/projectService';
import { campaignService, type CampaignRecord } from '../campaigns/campaignService';
import { taskService, type TaskRecord } from './taskService';
import { ApiError } from '../api/apiClient';
import { TaskKpiCards } from './components/TaskKpiCards';
import { TasksToolbar } from './components/TasksToolbar';
import { TasksTable } from './components/TasksTable';
import { TaskDetailsPanel } from './components/TaskDetailsPanel';
import { TasksBoardView } from './components/TasksBoardView';
import { TaskModal } from './components/TaskModal';
import type { TaskItem } from './types';

function toTaskItem(
  record: TaskRecord,
  projectsById: Map<string, ProjectRecord>,
  campaignsById: Map<string, CampaignRecord>,
): TaskItem {
  const assigneeName = record.assignee?.name || 'Unassigned';
  return {
    id: record.id,
    workspaceId: record.workspace_id,
    title: record.title,
    description: record.description || '',
    projectId: record.project_id || undefined,
    project: record.project?.name || projectsById.get(record.project_id || '')?.name || '',
    campaignId: record.campaign_id || undefined,
    campaign: record.campaign?.name || campaignsById.get(record.campaign_id || '')?.name || '',
    assigneeId: record.assignee_id || undefined,
    assignee: {
      id: record.assignee?.id,
      name: assigneeName,
      initials: assigneeName === 'Unassigned' ? '—' : assigneeName.split(/\s+/).map((part) => part[0] || '').join('').slice(0, 2).toUpperCase(),
    },
    priority: record.priority,
    dueDate: record.due_date,
    status: record.status,
    checklist: [],
    comments: [],
    attachments: [],
    createdAt: record.created_at,
  };
}

export const TasksPage: React.FC = () => {
  const navigate = useNavigate();
  const { currentWorkspace, hasWorkspace, isLoadingWorkspaces } = useWorkspace();
  const { user } = useAuth();
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [projects, setProjects] = useState<ProjectRecord[]>([]);
  const [campaigns, setCampaigns] = useState<CampaignRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  const reloadTasks = useCallback(async () => {
    if (!hasWorkspace) {
      setTasks([]);
      setProjects([]);
      setCampaigns([]);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setLoadError(null);
    try {
      const [taskRecords, projectRecords, campaignRecords] = await Promise.all([
        taskService.list(currentWorkspace.id),
        projectService.list(currentWorkspace.id),
        campaignService.list(currentWorkspace.id),
      ]);
      setProjects(projectRecords);
      setCampaigns(campaignRecords);
      const projectsById = new Map(projectRecords.map((project) => [project.id, project]));
      const campaignsById = new Map(campaignRecords.map((campaign) => [campaign.id, campaign]));
      const nextTasks = taskRecords.map((record) => toTaskItem(record, projectsById, campaignsById));
      setTasks(nextTasks);
      setSelectedTaskId((selectedId) => nextTasks.some((task) => task.id === selectedId) ? selectedId : nextTasks[0]?.id || null);
    } catch (error) {
      setTasks([]);
      setProjects([]);
      setCampaigns([]);
      setLoadError(error instanceof Error ? error.message : 'Unable to load tasks.');
    } finally {
      setIsLoading(false);
    }
  }, [hasWorkspace, currentWorkspace.id]);

  useEffect(() => {
    if (!isLoadingWorkspaces) void reloadTasks();
  }, [isLoadingWorkspaces, reloadTasks]);

  const [isDetailsPanelOpen, setIsDetailsPanelOpen] = useState(true);

  // Checked tasks for table checkboxes
  const [checkedTaskIds, setCheckedTaskIds] = useState<string[]>([]);

  // View mode: 'list' or 'board'
  const [viewMode, setViewMode] = useState<'list' | 'board'>('list');

  // Search and filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [assigneeFilter, setAssigneeFilter] = useState('All');
  const [priorityFilter, setPriorityFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [projectFilter, setProjectFilter] = useState('All');
  const [kpiFilter, setKpiFilter] = useState<string | null>(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 5;

  // Modal states
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<TaskItem | null>(null);

  // Toast feedback message
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Available dropdown options
  const availableAssignees = useMemo(() => {
    const assignees = new Map<number, string>();
    const currentUserId = Number(user?.id);
    if (Number.isSafeInteger(currentUserId) && currentUserId > 0 && user?.name) {
      assignees.set(currentUserId, user.name);
    }
    tasks.forEach((task) => {
      if (task.assigneeId) assignees.set(task.assigneeId, task.assignee.name);
    });
    return Array.from(assignees, ([id, name]) => ({ id, name }));
  }, [tasks, user]);

  const availableProjects = useMemo(() => {
    return projects.map((project) => ({ id: project.id, name: project.name }));
  }, [projects]);

  const availableCampaigns = useMemo(() => {
    return campaigns.map((campaign) => ({ id: campaign.id, name: campaign.name, project_id: campaign.project_id }));
  }, [campaigns]);

  // Derived KPI Counts
  const totalCount = tasks.length;
  const inProgressCount = useMemo(
    () =>
      tasks.filter(
        (t) =>
          t.status === 'In Progress' ||
          t.status === 'To Do' ||
          t.status === 'In Review'
      ).length,
    [tasks]
  );
  const completedCount = useMemo(
    () => tasks.filter((t) => t.status === 'Completed').length,
    [tasks]
  );
  const overdueCount = useMemo(
    () => tasks.filter((t) => t.status === 'Overdue').length,
    [tasks]
  );

  // Filter tasks
  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      // Search
      if (
        searchQuery &&
        !task.title.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !task.project.toLowerCase().includes(searchQuery.toLowerCase())
      ) {
        return false;
      }

      // Assignee
      if (assigneeFilter !== 'All' && task.assignee.name !== assigneeFilter) {
        return false;
      }

      // Priority
      if (priorityFilter !== 'All' && task.priority !== priorityFilter) {
        return false;
      }

      // Status
      if (statusFilter !== 'All' && task.status !== statusFilter) {
        return false;
      }

      // Project
      if (projectFilter !== 'All' && task.project !== projectFilter) {
        return false;
      }

      // KPI Card Filter
      if (kpiFilter) {
        if (kpiFilter === 'In Progress') {
          if (
            task.status !== 'In Progress' &&
            task.status !== 'To Do' &&
            task.status !== 'In Review'
          ) {
            return false;
          }
        } else if (task.status !== kpiFilter) {
          return false;
        }
      }

      return true;
    });
  }, [
    tasks,
    searchQuery,
    assigneeFilter,
    priorityFilter,
    statusFilter,
    projectFilter,
    kpiFilter,
  ]);

  // Reset page when filters change (render-phase state adjustment)
  const filterKey = `${searchQuery}-${assigneeFilter}-${priorityFilter}-${statusFilter}-${projectFilter}-${kpiFilter}`;
  const [prevFilterKey, setPrevFilterKey] = useState(filterKey);
  if (filterKey !== prevFilterKey) {
    setPrevFilterKey(filterKey);
    setCurrentPage(1);
  }

  // Paginated tasks
  const paginatedTasks = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredTasks.slice(startIndex, startIndex + pageSize);
  }, [filteredTasks, currentPage, pageSize]);

  // Currently selected task object
  const selectedTask = useMemo(() => {
    if (!selectedTaskId) return null;
    return tasks.find((t) => t.id === selectedTaskId) || null;
  }, [tasks, selectedTaskId]);

  // Handle task selection
  const handleSelectTask = (id: string) => {
    setSelectedTaskId(id);
    setIsDetailsPanelOpen(true);
  };

  // Handle task check/uncheck
  const handleToggleCheckTask = (id: string) => {
    setCheckedTaskIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleToggleCheckAll = () => {
    const currentPageIds = paginatedTasks.map((t) => t.id);
    const allChecked = currentPageIds.every((id) => checkedTaskIds.includes(id));
    if (allChecked) {
      setCheckedTaskIds((prev) => prev.filter((id) => !currentPageIds.includes(id)));
    } else {
      setCheckedTaskIds((prev) => Array.from(new Set([...prev, ...currentPageIds])));
    }
  };

  // Update existing task
  const handleUpdateTask = async (updatedTask: TaskItem) => {
    if (!hasWorkspace) return;
    setActionError(null);
    try {
      const saved = await taskService.update(currentWorkspace.id, updatedTask.id, {
        title: updatedTask.title,
        description: updatedTask.description || null,
        project_id: updatedTask.projectId || null,
        campaign_id: updatedTask.campaignId || null,
        assignee_id: updatedTask.assigneeId || null,
        priority: updatedTask.priority,
        status: updatedTask.status,
        due_date: updatedTask.dueDate,
      });
      const projectsById = new Map(projects.map((project) => [project.id, project]));
      const campaignsById = new Map(campaigns.map((campaign) => [campaign.id, campaign]));
      setTasks((prev) => prev.map((task) => task.id === saved.id ? toTaskItem(saved, projectsById, campaignsById) : task));
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Unable to update task.');
    }
  };

  // Delete task
  const handleDeleteTask = async (id: string) => {
    if (!hasWorkspace || !window.confirm('Are you sure you want to delete this task?')) return;
    setActionError(null);
    try {
      await taskService.remove(currentWorkspace.id, id);
      const remaining = tasks.filter((task) => task.id !== id);
      setTasks(remaining);
      setSelectedTaskId((selectedId) => selectedId === id ? remaining[0]?.id || null : selectedId);
      setCheckedTaskIds((prev) => prev.filter((itemId) => itemId !== id));
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Unable to delete task.');
    }
  };

  // Save new task
  const handleCreateTask = async (newTaskData: Partial<TaskItem>) => {
    if (!hasWorkspace || !newTaskData.title || !newTaskData.dueDate) return;
    setIsSaving(true);
    setActionError(null);
    try {
      const saved = await taskService.create(currentWorkspace.id, {
        title: newTaskData.title,
        description: newTaskData.description || null,
        project_id: newTaskData.projectId || null,
        campaign_id: newTaskData.campaignId || null,
        assignee_id: newTaskData.assigneeId || null,
        priority: newTaskData.priority || 'Medium',
        due_date: newTaskData.dueDate,
        status: newTaskData.status || 'To Do',
      });
      setSelectedTaskId(saved.id);
      setIsDetailsPanelOpen(true);
      await reloadTasks();
      setIsCreateModalOpen(false);
      showToast('Task created successfully');
    } catch (error) {
      setActionError(error instanceof ApiError && error.errors
        ? Object.values(error.errors).flat().join(' ')
        : error instanceof Error ? error.message : 'Unable to create task.');
    } finally {
      setIsSaving(false);
    }
  };

  // Edit existing task
  const handleSaveEditedTask = async (taskData: Partial<TaskItem>) => {
    if (!editingTask || !hasWorkspace) return;
    setIsSaving(true);
    setActionError(null);
    try {
      const saved = await taskService.update(currentWorkspace.id, editingTask.id, {
        title: taskData.title || editingTask.title,
        description: taskData.description || null,
        project_id: taskData.projectId || null,
        campaign_id: taskData.campaignId || null,
        assignee_id: taskData.assigneeId || null,
        priority: taskData.priority || editingTask.priority,
        due_date: taskData.dueDate || editingTask.dueDate,
        status: taskData.status || editingTask.status,
      });
      const projectsById = new Map(projects.map((project) => [project.id, project]));
      const campaignsById = new Map(campaigns.map((campaign) => [campaign.id, campaign]));
      setTasks((prev) => prev.map((task) => task.id === saved.id ? toTaskItem(saved, projectsById, campaignsById) : task));
      setEditingTask(null);
      showToast('Task updated successfully');
    } catch (error) {
      setActionError(error instanceof ApiError && error.errors
        ? Object.values(error.errors).flat().join(' ')
        : error instanceof Error ? error.message : 'Unable to update task.');
    } finally {
      setIsSaving(false);
    }
  };

  // Navigate to Campaign
  const handleViewCampaign = (campaignId: string) => {
    navigate(`/campaigns/${campaignId}`);
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 bg-[#1E1B4B] text-white text-xs font-medium px-4 py-2.5 rounded-lg shadow-lg border border-[#312E81] animate-in fade-in slide-in-from-bottom-2">
          {toastMessage}
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="text-xs font-medium text-[#64748B] mb-1">
            <span>Management</span>
            <span className="mx-1.5">/</span>
            <span className="text-[#6D28D9] font-semibold">Tasks</span>
          </div>
          <h1 className="text-2xl font-bold text-[#1E1B4B] tracking-tight">
            Tasks &amp; Workflow
          </h1>
          <p className="text-xs text-[#64748B] mt-0.5">
            Coordinate execution across projects and campaigns.
          </p>
        </div>

        <button
          type="button"
          disabled={!hasWorkspace || isLoading || isSaving}
          onClick={() => setIsCreateModalOpen(true)}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#6D28D9] text-white text-xs font-semibold rounded-lg hover:bg-[#5B21B6] transition-colors shadow-2xs self-start sm:self-auto disabled:opacity-50"
        >
          <Plus className="w-4 h-4" />
          <span>New Task</span>
        </button>
      </div>

      {(loadError || actionError) && (
        <div role="alert" className="flex items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700">
          <span>{loadError || actionError}</span>
          {loadError && <button type="button" onClick={() => void reloadTasks()} className="font-semibold underline">Retry</button>}
          {actionError && <button type="button" onClick={() => setActionError(null)} aria-label="Dismiss error">×</button>}
        </div>
      )}
      {!isLoadingWorkspaces && !hasWorkspace && (
        <div role="status" className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">Select or create an active workspace before managing tasks.</div>
      )}

      {/* 4 KPI Summary Cards */}
      <TaskKpiCards
        totalCount={totalCount}
        inProgressCount={inProgressCount}
        completedCount={completedCount}
        overdueCount={overdueCount}
        activeFilter={kpiFilter}
        onFilterChange={setKpiFilter}
      />

      {/* Main Two-Column Layout */}
      <div className="flex flex-col lg:flex-row gap-6 items-start">
        {/* Left Column: Toolbar + Table/Board + Pagination (~70%) */}
        <div className="flex-1 min-w-0 space-y-4 w-full">
          {/* Tasks Toolbar */}
          <TasksToolbar
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            assigneeFilter={assigneeFilter}
            onAssigneeChange={setAssigneeFilter}
            priorityFilter={priorityFilter}
            onPriorityChange={setPriorityFilter}
            statusFilter={statusFilter}
            onStatusChange={setStatusFilter}
            projectFilter={projectFilter}
            onProjectChange={setProjectFilter}
            availableAssignees={availableAssignees.map((assignee) => assignee.name)}
            availableProjects={availableProjects.map((project) => project.name)}
          />

          {/* List View or Board View */}
          {isLoading || isLoadingWorkspaces ? (
            <div role="status" className="rounded-xl border border-[#E2E8F0] bg-white p-10 text-center text-xs text-[#64748B]">Loading tasks…</div>
          ) : viewMode === 'list' ? (
            <TasksTable
              tasks={paginatedTasks}
              totalTasksCount={filteredTasks.length}
              selectedTaskId={selectedTaskId}
              onSelectTask={handleSelectTask}
              checkedTaskIds={checkedTaskIds}
              onToggleCheckTask={handleToggleCheckTask}
              onToggleCheckAll={handleToggleCheckAll}
              currentPage={currentPage}
              pageSize={pageSize}
              onPageChange={setCurrentPage}
              onEditTask={(task) => setEditingTask(task)}
              onDeleteTask={handleDeleteTask}
            />
          ) : (
            <TasksBoardView
              tasks={filteredTasks}
              selectedTaskId={selectedTaskId}
              onSelectTask={handleSelectTask}
              onStatusChange={(id, status) => {
                const t = tasks.find((item) => item.id === id);
                if (t) void handleUpdateTask({ ...t, status });
              }}
            />
          )}
        </div>

        {/* Right Column: Selected Task Details Panel (~30%) */}
        {isDetailsPanelOpen && selectedTask && (
          <div className="w-full lg:w-[380px] shrink-0 sticky top-4">
            <TaskDetailsPanel
              task={selectedTask}
              onClose={() => setIsDetailsPanelOpen(false)}
              onUpdateTask={handleUpdateTask}
              onEditTask={(task) => setEditingTask(task)}
              onViewCampaign={handleViewCampaign}
              onDeleteTask={handleDeleteTask}
            />
          </div>
        )}
      </div>

      {/* Create Task Modal */}
      <TaskModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSave={handleCreateTask}
        availableProjects={availableProjects}
        availableCampaigns={availableCampaigns}
        availableAssignees={availableAssignees}
        isSaving={isSaving}
        saveError={actionError}
      />

      {/* Edit Task Modal */}
      <TaskModal
        isOpen={!!editingTask}
        onClose={() => setEditingTask(null)}
        onSave={handleSaveEditedTask}
        initialTask={editingTask}
        availableProjects={availableProjects}
        availableCampaigns={availableCampaigns}
        availableAssignees={availableAssignees}
        isSaving={isSaving}
        saveError={actionError}
      />
    </div>
  );
};
