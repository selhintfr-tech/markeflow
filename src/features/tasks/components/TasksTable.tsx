import React, { useState } from 'react';
import {
  FileText,
  Megaphone,
  ArrowUp,
  ArrowDown,
  MoreHorizontal,
  ChevronLeft,
  ChevronRight,
  Check,
  Edit2,
  Trash2,
} from 'lucide-react';
import type { TaskItem } from '../types';
import { ActionDropdown } from '../../../components/ui/ActionDropdown';

interface TasksTableProps {
  tasks: TaskItem[];
  totalTasksCount: number;
  selectedTaskId: string | null;
  onSelectTask: (id: string) => void;
  checkedTaskIds: string[];
  onToggleCheckTask: (id: string) => void;
  onToggleCheckAll: () => void;
  currentPage: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onEditTask: (task: TaskItem) => void;
  onDeleteTask: (id: string) => void;
}

export const TasksTable: React.FC<TasksTableProps> = ({
  tasks,
  totalTasksCount,
  selectedTaskId,
  onSelectTask,
  checkedTaskIds,
  onToggleCheckTask,
  onToggleCheckAll,
  currentPage,
  pageSize,
  onPageChange,
  onEditTask,
  onDeleteTask,
}) => {
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  const totalPages = Math.max(1, Math.ceil(totalTasksCount / pageSize));
  const startItem = totalTasksCount === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalTasksCount);

  const isAllChecked =
    tasks.length > 0 && tasks.every((t) => checkedTaskIds.includes(t.id));

  const renderPriorityBadge = (priority: TaskItem['priority']) => {
    switch (priority) {
      case 'High':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[#FEF2F2] text-[#EF4444]">
            <ArrowUp className="w-3 h-3 text-[#EF4444]" />
            High
          </span>
        );
      case 'Medium':
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[#FFFBEB] text-[#D97706]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#D97706]" />
            Medium
          </span>
        );
      case 'Low':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[#ECFDF5] text-[#0D9488]">
            <ArrowDown className="w-3 h-3 text-[#0D9488]" />
            Low
          </span>
        );
    }
  };

  const renderStatusBadge = (status: TaskItem['status']) => {
    switch (status) {
      case 'In Progress':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-[#EFF6FF] text-[#2563EB]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#2563EB]" />
            In Progress
          </span>
        );
      case 'To Do':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-[#F1F5F9] text-[#64748B]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#64748B]" />
            To Do
          </span>
        );
      case 'Completed':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-[#ECFDF5] text-[#0D9488]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#0D9488]" />
            Completed
          </span>
        );
      case 'Overdue':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-[#FEF2F2] text-[#EF4444]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#EF4444]" />
            Overdue
          </span>
        );
      case 'In Review':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-[#FFFBEB] text-[#D97706]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#D97706]" />
            In Review
          </span>
        );
    }
  };

  return (
    <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-xs overflow-hidden">
      {/* Header section with Title and Subtitle */}
      <div className="p-5 pb-3">
        <h2 className="text-base font-bold text-[#1E1B4B]">Tasks</h2>
        <p className="text-xs text-[#94A3B8] mt-0.5">
          Showing {startItem}–{endItem} of {totalTasksCount} tasks
        </p>
      </div>

      {/* Table content */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-t border-b border-[#F1F5F9] bg-[#F8FAFC]/60 text-[11px] font-semibold text-[#64748B]">
              <th className="py-3 pl-5 pr-3 w-10">
                <div
                  onClick={onToggleCheckAll}
                  className={`w-4 h-4 rounded border flex items-center justify-center cursor-pointer transition-colors ${
                    isAllChecked
                      ? 'bg-[#6D28D9] border-[#6D28D9] text-white'
                      : 'border-[#CBD5E1] bg-white hover:border-[#6D28D9]'
                  }`}
                >
                  {isAllChecked && <Check className="w-3 h-3 stroke-[3]" />}
                </div>
              </th>
              <th className="py-3 px-3 font-semibold text-[#64748B]">Task Name</th>
              <th className="py-3 px-3 font-semibold text-[#64748B]">Project</th>
              <th className="py-3 px-3 font-semibold text-[#64748B]">Campaign</th>
              <th className="py-3 px-3 font-semibold text-[#64748B]">Assignee</th>
              <th className="py-3 px-3 font-semibold text-[#64748B]">Priority</th>
              <th className="py-3 px-3 font-semibold text-[#64748B]">Due Date</th>
              <th className="py-3 px-3 font-semibold text-[#64748B]">Status</th>
              <th className="py-3 pr-5 pl-3 w-12 text-right"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#F1F5F9]">
            {tasks.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-12 text-center text-xs text-[#64748B]">
                  No tasks found matching your filter criteria.
                </td>
              </tr>
            ) : (
              tasks.map((task) => {
                const isSelected = selectedTaskId === task.id;
                const isChecked = checkedTaskIds.includes(task.id);

                return (
                  <tr
                    key={task.id}
                    onClick={() => onSelectTask(task.id)}
                    className={`group transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-[#F5F3FF]'
                        : 'hover:bg-[#F8F7FC]/80 bg-white'
                    }`}
                  >
                    {/* Checkbox */}
                    <td
                      className="py-3 pl-5 pr-3"
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleCheckTask(task.id);
                      }}
                    >
                      <div
                        className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                          isChecked
                            ? 'bg-[#6D28D9] border-[#6D28D9] text-white'
                            : 'border-[#CBD5E1] bg-white group-hover:border-[#94A3B8]'
                        }`}
                      >
                        {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                      </div>
                    </td>

                    {/* Task Name */}
                    <td className="py-3 px-3">
                      <span className="text-xs font-semibold text-[#1E1B4B] group-hover:text-[#6D28D9] transition-colors">
                        {task.title}
                      </span>
                    </td>

                    {/* Project */}
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-1.5 text-xs text-[#475569]">
                        <FileText className="w-3.5 h-3.5 text-[#6D28D9] shrink-0" />
                        <span className="truncate max-w-[130px]">{task.project}</span>
                      </div>
                    </td>

                    {/* Campaign */}
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-1.5 text-xs text-[#475569]">
                        <Megaphone className="w-3.5 h-3.5 text-[#8B5CF6] shrink-0" />
                        <span className="truncate max-w-[130px]">{task.campaign}</span>
                      </div>
                    </td>

                    {/* Assignee */}
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0"
                          style={{
                            backgroundColor: task.assignee.bgColor || '#EDE9FE',
                            color: task.assignee.textColor || '#6D28D9',
                          }}
                        >
                          {task.assignee.initials}
                        </div>
                        <span className="text-xs text-[#1E1B4B] font-medium whitespace-nowrap">
                          {task.assignee.name}
                        </span>
                      </div>
                    </td>

                    {/* Priority */}
                    <td className="py-3 px-3 whitespace-nowrap">
                      {renderPriorityBadge(task.priority)}
                    </td>

                    {/* Due Date */}
                    <td className="py-3 px-3 text-xs text-[#475569] whitespace-nowrap">
                      {task.dueDate || 'No deadline'}
                    </td>

                    {/* Status */}
                    <td className="py-3 px-3 whitespace-nowrap">
                      {renderStatusBadge(task.status)}
                    </td>

                    {/* Actions Menu */}
                    <td
                      className="py-3 pr-5 pl-3 text-right"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <ActionDropdown
                        isOpen={activeMenuId === task.id}
                        onClose={() => setActiveMenuId(null)}
                        ariaLabel={`Actions for task ${task.title}`}
                        className="w-32 py-1 text-left text-xs"
                        trigger={
                          <button
                            type="button"
                            onClick={() =>
                              setActiveMenuId(activeMenuId === task.id ? null : task.id)
                            }
                            className="p-1 rounded text-[#94A3B8] hover:text-[#1E1B4B] hover:bg-slate-100 transition-colors cursor-pointer"
                            aria-label={`Actions for task ${task.title}`}
                          >
                            <MoreHorizontal className="w-4 h-4" />
                          </button>
                        }
                      >
                        <button
                          type="button"
                          onClick={() => {
                            setActiveMenuId(null);
                            onEditTask(task);
                          }}
                          className="w-full text-left px-3 py-1.5 text-xs text-[#1E1B4B] hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
                        >
                          <Edit2 className="w-3.5 h-3.5 text-[#64748B]" />
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setActiveMenuId(null);
                            onDeleteTask(task.id);
                          }}
                          className="w-full text-left px-3 py-1.5 text-xs text-red-600 hover:bg-red-50 flex items-center gap-2 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-red-500" />
                          Delete
                        </button>
                      </ActionDropdown>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div className="p-4 border-t border-[#F1F5F9] flex flex-wrap items-center justify-between gap-3">
        <div className="text-xs text-[#64748B]">
          Showing {startItem}–{endItem} of {totalTasksCount} tasks
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            disabled={currentPage === 1}
            onClick={() => onPageChange(currentPage - 1)}
            className="flex items-center gap-1 px-3 py-1 text-xs font-medium text-[#64748B] border border-[#E2E8F0] rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none transition-colors"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            Previous
          </button>

          {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
            <button
              key={pageNum}
              type="button"
              onClick={() => onPageChange(pageNum)}
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
            onClick={() => onPageChange(currentPage + 1)}
            className="flex items-center gap-1 px-3 py-1 text-xs font-medium text-[#64748B] border border-[#E2E8F0] rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none transition-colors"
          >
            Next
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
