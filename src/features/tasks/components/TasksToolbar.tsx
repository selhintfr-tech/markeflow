import React from 'react';
import { List, Columns3, Search, ChevronDown } from 'lucide-react';

interface TasksToolbarProps {
  viewMode: 'list' | 'board';
  onViewModeChange: (mode: 'list' | 'board') => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  assigneeFilter: string;
  onAssigneeChange: (assignee: string) => void;
  priorityFilter: string;
  onPriorityChange: (priority: string) => void;
  statusFilter: string;
  onStatusChange: (status: string) => void;
  projectFilter: string;
  onProjectChange: (project: string) => void;
  availableAssignees: string[];
  availableProjects: string[];
}

export const TasksToolbar: React.FC<TasksToolbarProps> = ({
  viewMode,
  onViewModeChange,
  searchQuery,
  onSearchChange,
  assigneeFilter,
  onAssigneeChange,
  priorityFilter,
  onPriorityChange,
  statusFilter,
  onStatusChange,
  projectFilter,
  onProjectChange,
  availableAssignees,
  availableProjects,
}) => {
  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* View segmented toggle */}
      <div className="inline-flex items-center p-1 bg-white border border-[#E2E8F0] rounded-lg shadow-2xs">
        <button
          type="button"
          onClick={() => onViewModeChange('list')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
            viewMode === 'list'
              ? 'bg-[#EDE9FE] text-[#6D28D9]'
              : 'text-[#64748B] hover:text-[#1E1B4B] hover:bg-slate-50'
          }`}
        >
          <List className="w-3.5 h-3.5" />
          <span>List</span>
        </button>
        <button
          type="button"
          onClick={() => onViewModeChange('board')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
            viewMode === 'board'
              ? 'bg-[#EDE9FE] text-[#6D28D9]'
              : 'text-[#64748B] hover:text-[#1E1B4B] hover:bg-slate-50'
          }`}
        >
          <Columns3 className="w-3.5 h-3.5" />
          <span>Board</span>
        </button>
      </div>

      {/* Search Input */}
      <div className="relative flex-1 min-w-[200px] max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94A3B8]" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search tasks..."
          className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-[#E2E8F0] rounded-lg text-[#1E1B4B] placeholder-[#94A3B8] focus:outline-none focus:ring-1 focus:ring-[#6D28D9] focus:border-[#6D28D9] shadow-2xs"
        />
      </div>

      {/* Dropdown Filters */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Assignee Filter */}
        <div className="relative">
          <select
            value={assigneeFilter}
            onChange={(e) => onAssigneeChange(e.target.value)}
            className="appearance-none bg-white border border-[#E2E8F0] rounded-lg pl-3 pr-7 py-1.5 text-xs text-[#1E1B4B] font-medium hover:border-[#CBD5E1] focus:outline-none focus:ring-1 focus:ring-[#6D28D9] cursor-pointer shadow-2xs"
          >
            <option value="All">Assignee</option>
            {availableAssignees.map((assignee) => (
              <option key={assignee} value={assignee}>
                {assignee}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#64748B] pointer-events-none" />
        </div>

        {/* Priority Filter */}
        <div className="relative">
          <select
            value={priorityFilter}
            onChange={(e) => onPriorityChange(e.target.value)}
            className="appearance-none bg-white border border-[#E2E8F0] rounded-lg pl-3 pr-7 py-1.5 text-xs text-[#1E1B4B] font-medium hover:border-[#CBD5E1] focus:outline-none focus:ring-1 focus:ring-[#6D28D9] cursor-pointer shadow-2xs"
          >
            <option value="All">Priority</option>
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
          </select>
          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#64748B] pointer-events-none" />
        </div>

        {/* Status Filter */}
        <div className="relative">
          <select
            value={statusFilter}
            onChange={(e) => onStatusChange(e.target.value)}
            className="appearance-none bg-white border border-[#E2E8F0] rounded-lg pl-3 pr-7 py-1.5 text-xs text-[#1E1B4B] font-medium hover:border-[#CBD5E1] focus:outline-none focus:ring-1 focus:ring-[#6D28D9] cursor-pointer shadow-2xs"
          >
            <option value="All">Status</option>
            <option value="In Progress">In Progress</option>
            <option value="To Do">To Do</option>
            <option value="In Review">In Review</option>
            <option value="Completed">Completed</option>
            <option value="Overdue">Overdue</option>
          </select>
          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#64748B] pointer-events-none" />
        </div>

        {/* Project Filter */}
        <div className="relative">
          <select
            value={projectFilter}
            onChange={(e) => onProjectChange(e.target.value)}
            className="appearance-none bg-white border border-[#E2E8F0] rounded-lg pl-3 pr-7 py-1.5 text-xs text-[#1E1B4B] font-medium hover:border-[#CBD5E1] focus:outline-none focus:ring-1 focus:ring-[#6D28D9] cursor-pointer shadow-2xs"
          >
            <option value="All">Project</option>
            {availableProjects.map((project) => (
              <option key={project} value={project}>
                {project}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#64748B] pointer-events-none" />
        </div>
      </div>
    </div>
  );
};
