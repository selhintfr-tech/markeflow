import React, { useState } from 'react';
import {
  MoreHorizontal,
  X,
  User,
  Calendar,
  TrendingUp,
  FileText,
  Megaphone,
  Pencil,
  ExternalLink,
  ChevronDown,
  Trash2,
} from 'lucide-react';
import type { TaskItem, TaskStatus } from '../types';
import { ActionDropdown } from '../../../components/ui/ActionDropdown';

interface TaskDetailsPanelProps {
  task: TaskItem;
  onClose: () => void;
  onUpdateTask: (task: TaskItem) => void;
  onEditTask: (task: TaskItem) => void;
  onViewCampaign: (campaignId: string) => void;
  onDeleteTask: (id: string) => void;
}

export const TaskDetailsPanel: React.FC<TaskDetailsPanelProps> = ({
  task,
  onClose,
  onUpdateTask,
  onEditTask,
  onViewCampaign,
  onDeleteTask,
}) => {
  const [isStatusDropdownOpen, setIsStatusDropdownOpen] = useState(false);
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);

  const handleStatusChange = (newStatus: TaskStatus) => {
    onUpdateTask({ ...task, status: newStatus });
    setIsStatusDropdownOpen(false);
  };


  const renderStatusPill = () => {
    const statusConfig = {
      'In Progress': { dot: 'bg-[#2563EB]', text: 'text-[#2563EB]', bg: 'bg-[#EFF6FF]' },
      'To Do': { dot: 'bg-[#64748B]', text: 'text-[#64748B]', bg: 'bg-[#F1F5F9]' },
      'Completed': { dot: 'bg-[#0D9488]', text: 'text-[#0D9488]', bg: 'bg-[#ECFDF5]' },
      'Overdue': { dot: 'bg-[#EF4444]', text: 'text-[#EF4444]', bg: 'bg-[#FEF2F2]' },
      'In Review': { dot: 'bg-[#D97706]', text: 'text-[#D97706]', bg: 'bg-[#FFFBEB]' },
    };

    const cfg = statusConfig[task.status] || statusConfig['In Progress'];

    return (
      <div className="relative inline-block">
        <button
          type="button"
          onClick={() => setIsStatusDropdownOpen(!isStatusDropdownOpen)}
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${cfg.bg} ${cfg.text} hover:opacity-90 transition-opacity`}
        >
          <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
          <span>{task.status}</span>
          <ChevronDown className="w-3 h-3 ml-0.5" />
        </button>

        {isStatusDropdownOpen && (
          <div className="absolute left-0 top-8 w-36 bg-white rounded-lg shadow-lg border border-[#E2E8F0] py-1 z-30">
            {(['In Progress', 'To Do', 'In Review', 'Completed', 'Overdue'] as TaskStatus[]).map(
              (status) => (
                <button
                  key={status}
                  type="button"
                  onClick={() => handleStatusChange(status)}
                  className={`w-full text-left px-3 py-1.5 text-xs hover:bg-slate-50 flex items-center gap-2 ${
                    task.status === status ? 'font-bold text-[#6D28D9]' : 'text-[#1E1B4B]'
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      status === 'In Progress'
                        ? 'bg-[#2563EB]'
                        : status === 'Completed'
                        ? 'bg-[#0D9488]'
                        : status === 'Overdue'
                        ? 'bg-[#EF4444]'
                        : status === 'In Review'
                        ? 'bg-[#D97706]'
                        : 'bg-[#64748B]'
                    }`}
                  />
                  {status}
                </button>
              )
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="bg-white rounded-xl border border-[#E2E8F0] p-5 shadow-xs flex flex-col justify-between space-y-5">
      <div>
        {/* Panel Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h3 className="text-base font-bold text-[#1E1B4B] tracking-tight leading-snug">
              {task.title}
            </h3>
            <div className="mt-2">{renderStatusPill()}</div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <ActionDropdown
              isOpen={isMoreMenuOpen}
              onClose={() => setIsMoreMenuOpen(false)}
              ariaLabel={`Actions for task ${task.title}`}
              className="w-36 py-1 text-left text-xs"
              trigger={
                <button
                  type="button"
                  onClick={() => setIsMoreMenuOpen(!isMoreMenuOpen)}
                  className="p-1 rounded text-[#94A3B8] hover:text-[#1E1B4B] hover:bg-slate-100 transition-colors cursor-pointer"
                  aria-label="More task options"
                >
                  <MoreHorizontal className="w-4 h-4" />
                </button>
              }
            >
              <button
                type="button"
                onClick={() => {
                  setIsMoreMenuOpen(false);
                  onEditTask(task);
                }}
                className="w-full text-left px-3 py-1.5 text-xs text-[#1E1B4B] hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
              >
                <Pencil className="w-3.5 h-3.5 text-[#64748B]" />
                Edit Task
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsMoreMenuOpen(false);
                  onDeleteTask(task.id);
                }}
                className="w-full text-left px-3 py-1.5 text-xs text-red-600 hover:bg-red-50 flex items-center gap-2 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5 text-red-500" />
                Delete Task
              </button>
            </ActionDropdown>

            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded text-[#94A3B8] hover:text-[#1E1B4B] hover:bg-slate-100 transition-colors cursor-pointer"
              aria-label="Close task details"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Info Grid (2 Columns) */}
        <div className="grid grid-cols-2 gap-x-4 gap-y-3 mt-4 pt-4 border-t border-[#F1F5F9]">
          {/* Assignee */}
          <div>
            <div className="flex items-center gap-1 text-[11px] text-[#64748B] font-medium">
              <User className="w-3 h-3 text-[#64748B]" />
              <span>Assignee</span>
            </div>
            <div className="flex items-center gap-1.5 mt-1">
              {task.assignee.avatarUrl ? (
                <img
                  src={task.assignee.avatarUrl}
                  alt={task.assignee.name}
                  className="w-5 h-5 rounded-full object-cover shrink-0"
                />
              ) : (
                <div
                  className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0"
                  style={{
                    backgroundColor: task.assignee.bgColor || '#EDE9FE',
                    color: task.assignee.textColor || '#6D28D9',
                  }}
                >
                  {task.assignee.initials}
                </div>
              )}
              <span className="text-xs font-semibold text-[#1E1B4B] truncate">
                {task.assignee.name}
              </span>
            </div>
          </div>

          {/* Project */}
          <div>
            <div className="flex items-center gap-1 text-[11px] text-[#64748B] font-medium">
              <FileText className="w-3 h-3 text-[#64748B]" />
              <span>Project</span>
            </div>
            <div className="text-xs font-semibold text-[#1E1B4B] mt-1 truncate">
              {task.project}
            </div>
          </div>

          {/* Due date */}
          <div>
            <div className="flex items-center gap-1 text-[11px] text-[#64748B] font-medium">
              <Calendar className="w-3 h-3 text-[#64748B]" />
              <span>Due date</span>
            </div>
            <div className="text-xs font-semibold text-[#1E1B4B] mt-1">
              {task.dueDate || 'No deadline'}
            </div>
          </div>

          {/* Campaign */}
          <div>
            <div className="flex items-center gap-1 text-[11px] text-[#8B5CF6] font-medium">
              <Megaphone className="w-3 h-3 text-[#8B5CF6]" />
              <span className="text-[#64748B]">Campaign</span>
            </div>
            <div className="text-xs font-semibold text-[#1E1B4B] mt-1 truncate">
              {task.campaign}
            </div>
          </div>

          {/* Priority */}
          <div>
            <div className="flex items-center gap-1 text-[11px] text-[#EF4444] font-medium">
              <TrendingUp className="w-3 h-3 text-[#EF4444]" />
              <span className="text-[#64748B]">Priority</span>
            </div>
            <div className="text-xs font-bold text-[#EF4444] mt-1">
              {task.priority}
            </div>
          </div>
        </div>

        {task.description && (
          <div className="mt-5 border-t border-[#F1F5F9] pt-4">
            <div className="text-xs font-bold text-[#1E1B4B] mb-2">Description</div>
            <p className="whitespace-pre-wrap text-xs leading-relaxed text-[#475569]">{task.description}</p>
          </div>
        )}
      </div>

      {/* Footer Action Buttons */}
      <div className="pt-4 border-t border-[#F1F5F9] flex items-center gap-2">
        <button
          type="button"
          onClick={() => onEditTask(task)}
          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-[#6D28D9] text-white text-xs font-semibold rounded-lg hover:bg-[#5B21B6] transition-colors shadow-2xs"
        >
          <Pencil className="w-3.5 h-3.5" />
          <span>Edit Task</span>
        </button>

        {task.campaignId && (
          <button
            type="button"
            onClick={() => onViewCampaign(task.campaignId!)}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-white border border-[#E2E8F0] text-[#1E1B4B] text-xs font-semibold rounded-lg hover:bg-slate-50 transition-colors shadow-2xs"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>View Campaign</span>
          </button>
        )}

        <button
          type="button"
          onClick={() => onDeleteTask(task.id)}
          title="Delete task"
          className="p-2 bg-white border border-[#E2E8F0] text-[#64748B] hover:text-red-500 rounded-lg hover:bg-slate-50 transition-colors shadow-2xs"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
