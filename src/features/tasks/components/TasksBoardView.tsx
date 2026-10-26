import React from 'react';
import {
  FileText,
  Calendar,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';
import type { TaskItem, TaskStatus } from '../types';

interface TasksBoardViewProps {
  tasks: TaskItem[];
  selectedTaskId: string | null;
  onSelectTask: (id: string) => void;
  onStatusChange: (taskId: string, newStatus: TaskStatus) => void;
}

export const TasksBoardView: React.FC<TasksBoardViewProps> = ({
  tasks,
  selectedTaskId,
  onSelectTask,
  onStatusChange,
}) => {
  const columns: { id: TaskStatus; label: string; headerColor: string; dotColor: string }[] = [
    { id: 'To Do', label: 'To Do', headerColor: 'bg-slate-100 text-[#475569]', dotColor: 'bg-[#64748B]' },
    { id: 'In Progress', label: 'In Progress', headerColor: 'bg-[#EFF6FF] text-[#2563EB]', dotColor: 'bg-[#2563EB]' },
    { id: 'In Review', label: 'In Review', headerColor: 'bg-[#FFFBEB] text-[#D97706]', dotColor: 'bg-[#D97706]' },
    { id: 'Completed', label: 'Completed', headerColor: 'bg-[#ECFDF5] text-[#0D9488]', dotColor: 'bg-[#0D9488]' },
    { id: 'Overdue', label: 'Overdue', headerColor: 'bg-[#FEF2F2] text-[#EF4444]', dotColor: 'bg-[#EF4444]' },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
      {columns.map((col) => {
        const colTasks = tasks.filter((t) => t.status === col.id);

        return (
          <div
            key={col.id}
            className="bg-[#F8FAFC] rounded-xl border border-[#E2E8F0] p-3 flex flex-col min-h-[500px]"
          >
            {/* Column Header */}
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-[#E2E8F0]">
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${col.dotColor}`} />
                <span className="text-xs font-bold text-[#1E1B4B]">{col.label}</span>
              </div>
              <span className="text-[11px] font-semibold text-[#64748B] bg-white border border-[#E2E8F0] px-2 py-0.5 rounded-full">
                {colTasks.length}
              </span>
            </div>

            {/* Task Cards */}
            <div className="space-y-2.5 flex-1 overflow-y-auto">
              {colTasks.length === 0 ? (
                <div className="h-24 border border-dashed border-[#CBD5E1] rounded-lg flex items-center justify-center text-[11px] text-[#94A3B8]">
                  No tasks
                </div>
              ) : (
                colTasks.map((task) => {
                  const isSelected = selectedTaskId === task.id;

                  return (
                    <div
                      key={task.id}
                      onClick={() => onSelectTask(task.id)}
                      className={`bg-white rounded-lg border p-3 cursor-pointer shadow-2xs hover:shadow-xs transition-all ${
                        isSelected
                          ? 'border-[#6D28D9] ring-1 ring-[#6D28D9]/20 bg-[#F5F3FF]/30'
                          : 'border-[#E2E8F0] hover:border-[#CBD5E1]'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="text-xs font-bold text-[#1E1B4B] hover:text-[#6D28D9] leading-tight">
                          {task.title}
                        </h4>

                        {/* Status Change Selector */}
                        <select
                          value={task.status}
                          onClick={(e) => e.stopPropagation()}
                          onChange={(e) =>
                            onStatusChange(task.id, e.target.value as TaskStatus)
                          }
                          className="text-[10px] bg-slate-50 border border-[#E2E8F0] rounded px-1 py-0.5 text-[#64748B] cursor-pointer"
                        >
                          <option value="To Do">To Do</option>
                          <option value="In Progress">In Progress</option>
                          <option value="In Review">In Review</option>
                          <option value="Completed">Completed</option>
                          <option value="Overdue">Overdue</option>
                        </select>
                      </div>

                      {/* Project Tag */}
                      <div className="flex items-center gap-1 text-[11px] text-[#64748B] mt-2 truncate">
                        <FileText className="w-3 h-3 text-[#6D28D9] shrink-0" />
                        <span className="truncate">{task.project}</span>
                      </div>

                      {/* Bottom row: Priority, Due Date, Assignee */}
                      <div className="flex items-center justify-between mt-3 pt-2 border-t border-[#F1F5F9] text-[11px]">
                        <div className="flex items-center gap-2">
                          {task.priority === 'High' && (
                            <span className="text-[#EF4444] font-semibold flex items-center gap-0.5">
                              <ArrowUp className="w-3 h-3" /> High
                            </span>
                          )}
                          {task.priority === 'Medium' && (
                            <span className="text-[#D97706] font-semibold flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-[#D97706]" /> Med
                            </span>
                          )}
                          {task.priority === 'Low' && (
                            <span className="text-[#0D9488] font-semibold flex items-center gap-0.5">
                              <ArrowDown className="w-3 h-3" /> Low
                            </span>
                          )}

                          <span className="text-[#94A3B8] flex items-center gap-0.5">
                            <Calendar className="w-3 h-3" /> {task.dueDate ? (task.dueDate.includes(' ') ? `${task.dueDate.split(' ')[0]} ${task.dueDate.split(' ')[1] || ''}`.trim() : task.dueDate) : 'No deadline'}
                          </span>
                        </div>

                        <div
                          className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0"
                          style={{
                            backgroundColor: task.assignee.bgColor || '#EDE9FE',
                            color: task.assignee.textColor || '#6D28D9',
                          }}
                        >
                          {task.assignee.initials}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
