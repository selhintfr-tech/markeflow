import React, { useState } from 'react';
import { ChevronRight, Calendar, CheckSquare, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { TaskRecord } from '../../tasks/taskService';

interface UpcomingTasksCardProps {
  tasks: TaskRecord[];
  loading: boolean;
  onToggleTask?: (taskId: string, currentStatus: string) => Promise<void>;
}

export const UpcomingTasksCard: React.FC<UpcomingTasksCardProps> = ({
  tasks,
  loading,
  onToggleTask,
}) => {
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const handleToggle = async (taskId: string, currentStatus: string) => {
    if (!onToggleTask || togglingId) return;
    setTogglingId(taskId);
    try {
      await onToggleTask(taskId, currentStatus);
    } finally {
      setTogglingId(null);
    }
  };

  const displayTasks = tasks.slice(0, 4);

  return (
    <div className="bg-white rounded-xl border border-[#E2E8F0] p-6 shadow-xs flex flex-col justify-between min-h-[300px] relative">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-base font-bold text-[#1E1B4B]">
            Upcoming Tasks
          </h2>
          <p className="text-xs text-[#64748B] mt-0.5">
            Key milestones and deadlines for this workspace.
          </p>
        </div>

        <Link
          to="/tasks"
          className="flex items-center gap-1 text-xs font-semibold text-[#6D28D9] hover:text-[#5B21B6] transition-colors focus:outline-none focus:underline"
        >
          <span>View all</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* Loading state */}
      {loading && (
        <div className="py-12 flex flex-col items-center justify-center text-center">
          <Loader2 className="w-6 h-6 text-[#6D28D9] animate-spin mb-2" />
          <span className="text-xs text-[#64748B]">Loading workspace tasks...</span>
        </div>
      )}

      {/* Empty state */}
      {!loading && displayTasks.length === 0 && (
        <div className="py-10 text-center flex flex-col items-center justify-center">
          <div className="w-10 h-10 rounded-full bg-[#F5F3FF] flex items-center justify-center text-[#6D28D9] mb-2">
            <CheckSquare className="w-5 h-5" />
          </div>
          <p className="text-sm font-semibold text-[#1E1B4B]">No tasks scheduled</p>
          <p className="text-xs text-[#64748B] max-w-sm mt-0.5 mb-3">
            Add marketing tasks and assign them to campaigns or team members.
          </p>
          <Link
            to="/tasks"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#6D28D9] text-white text-xs font-semibold hover:bg-[#5B21B6] transition-colors"
          >
            Go to Tasks
          </Link>
        </div>
      )}

      {/* Task List */}
      {!loading && displayTasks.length > 0 && (
        <div className="space-y-4">
          {displayTasks.map((task) => {
            const isCompleted = task.status === 'Completed';
            const isBusy = togglingId === task.id;

            return (
              <div
                key={task.id}
                className="flex items-start justify-between gap-3 group"
              >
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <input
                    type="checkbox"
                    checked={isCompleted}
                    disabled={isBusy}
                    onChange={() => handleToggle(task.id, task.status)}
                    aria-label={`Mark "${task.title}" as ${isCompleted ? 'incomplete' : 'complete'}`}
                    className="mt-0.5 w-4 h-4 rounded border-[#CBD5E1] text-[#6D28D9] focus:ring-[#6D28D9] cursor-pointer"
                  />
                  <div className="min-w-0 flex-1">
                    <div
                      className={`text-sm font-semibold text-[#1E1B4B] cursor-pointer ${
                        isCompleted ? 'line-through text-[#94A3B8]' : ''
                      }`}
                      onClick={() => handleToggle(task.id, task.status)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          handleToggle(task.id, task.status);
                        }
                      }}
                    >
                      {task.title}
                    </div>
                    {task.description && (
                      <div className="text-xs text-[#64748B] mt-0.5 leading-relaxed line-clamp-2">
                        {task.description}
                      </div>
                    )}
                  </div>
                </div>

                {/* Date Tag */}
                <div
                  className={`flex items-center gap-1 text-xs font-medium shrink-0 mt-0.5 ${
                    isCompleted ? 'text-[#94A3B8]' : 'text-[#EF4444]'
                  }`}
                >
                  <Calendar className="w-3.5 h-3.5" />
                  <span>{task.due_date || 'No date'}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
