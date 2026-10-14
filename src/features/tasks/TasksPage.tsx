import React, { useState, useMemo, useEffect } from 'react';
import { Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useWorkspace } from '../../context/WorkspaceContext';
import { TaskKpiCards } from './components/TaskKpiCards';
import { TasksToolbar } from './components/TasksToolbar';
import { TasksTable } from './components/TasksTable';
import { TaskDetailsPanel } from './components/TaskDetailsPanel';
import { TasksBoardView } from './components/TasksBoardView';
import { TaskModal } from './components/TaskModal';
import { initialTasks } from './tasksData';
import type { TaskItem } from './types';

export const TasksPage: React.FC = () => {
  const navigate = useNavigate();
  const { currentWorkspace, projects: workspaceProjects } = useWorkspace();

  const storageKey = `marketflow_tasks_${currentWorkspace?.id || 'ws-atlas-retail'}`;

  // Tasks state scoped to workspace
  const [tasks, setTasks] = useState<TaskItem[]>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // ignore
    }
    return initialTasks;
  });

  // Re-sync tasks if workspace changes
  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setTasks(parsed);
          return;
        }
      }
    } catch {
      // ignore
    }
    setTasks(initialTasks);
  }, [storageKey]);

  // Save to localStorage whenever tasks change
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(tasks));
    } catch {
      // ignore
    }
  }, [tasks, storageKey]);

  // Selected task state (default to Review creative assets / task-1)
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>('task-1');
  const [isDetailsPanelOpen, setIsDetailsPanelOpen] = useState(true);

  // Checked tasks for table checkboxes
  const [checkedTaskIds, setCheckedTaskIds] = useState<string[]>(['task-1']);

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
    const set = new Set<string>();
    tasks.forEach((t) => set.add(t.assignee.name));
    return Array.from(set);
  }, [tasks]);

  const availableProjects = useMemo(() => {
    const set = new Set<string>();
    tasks.forEach((t) => set.add(t.project));
    if (workspaceProjects && workspaceProjects.length > 0) {
      workspaceProjects.forEach((p) => set.add(p.name));
    }
    return Array.from(set);
  }, [tasks, workspaceProjects]);

  const availableCampaigns = useMemo(() => {
    const set = new Set<string>();
    tasks.forEach((t) => set.add(t.campaign));
    return Array.from(set);
  }, [tasks]);

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

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [
    searchQuery,
    assigneeFilter,
    priorityFilter,
    statusFilter,
    projectFilter,
    kpiFilter,
  ]);

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
  const handleUpdateTask = (updatedTask: TaskItem) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === updatedTask.id ? updatedTask : t))
    );
  };

  // Delete task
  const handleDeleteTask = (id: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
    setCheckedTaskIds((prev) => prev.filter((itemId) => itemId !== id));
    if (selectedTaskId === id) {
      const remaining = tasks.filter((t) => t.id !== id);
      setSelectedTaskId(remaining[0]?.id || null);
    }
    showToast('Task removed successfully');
  };

  // Save new task
  const handleCreateTask = (newTaskData: Partial<TaskItem>) => {
    const newTask: TaskItem = {
      id: `task-${Date.now()}`,
      workspaceId: currentWorkspace?.id || 'ws-atlas-retail',
      title: newTaskData.title || 'Untitled Task',
      description: newTaskData.description || '',
      project: newTaskData.project || 'Autumn Sales Growth',
      campaign: newTaskData.campaign || 'Autumn Launch 2026',
      assignee: newTaskData.assignee || initialTasks[0].assignee,
      priority: newTaskData.priority || 'Medium',
      dueDate: newTaskData.dueDate || '25 Oct 2026',
      status: newTaskData.status || 'In Progress',
      checklist: [],
      comments: [],
      attachments: [],
      createdAt: new Date().toISOString(),
    };

    setTasks((prev) => [newTask, ...prev]);
    setSelectedTaskId(newTask.id);
    setIsDetailsPanelOpen(true);
    showToast('Task created successfully');
  };

  // Edit existing task
  const handleSaveEditedTask = (taskData: Partial<TaskItem>) => {
    if (!editingTask) return;
    const updated: TaskItem = {
      ...editingTask,
      ...taskData,
    };
    handleUpdateTask(updated);
    setEditingTask(null);
    showToast('Task updated successfully');
  };

  // Navigate to Campaign
  const handleViewCampaign = (campaignName: string) => {
    navigate('/campaigns');
    showToast(`Navigated to campaign: ${campaignName}`);
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
          onClick={() => setIsCreateModalOpen(true)}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#6D28D9] text-white text-xs font-semibold rounded-lg hover:bg-[#5B21B6] transition-colors shadow-2xs self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>New Task</span>
        </button>
      </div>

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
            availableAssignees={availableAssignees}
            availableProjects={availableProjects}
          />

          {/* List View or Board View */}
          {viewMode === 'list' ? (
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
                if (t) handleUpdateTask({ ...t, status });
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
      />

      {/* Edit Task Modal */}
      <TaskModal
        isOpen={!!editingTask}
        onClose={() => setEditingTask(null)}
        onSave={handleSaveEditedTask}
        initialTask={editingTask}
        availableProjects={availableProjects}
        availableCampaigns={availableCampaigns}
      />
    </div>
  );
};
