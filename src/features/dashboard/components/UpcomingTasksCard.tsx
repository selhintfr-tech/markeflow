import React, { useState } from 'react';
import { ChevronRight, Calendar } from 'lucide-react';
import { Link } from 'react-router-dom';
import { upcomingTasksList } from '../../../data/mock';
import type { UpcomingTask } from '../../../types';

export const UpcomingTasksCard: React.FC = () => {
  const [tasks, setTasks] = useState<UpcomingTask[]>(upcomingTasksList);

  const toggleTask = (id: string) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t))
    );
  };

  return (
    <div className="bg-white rounded-xl border border-[#E2E8F0] p-6 shadow-xs flex flex-col justify-between">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-base font-bold text-[#1E1B4B]">
            Upcoming Tasks
          </h2>
          <p className="text-xs text-[#64748B] mt-0.5">
            Your key tasks and deadlines.
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

      {/* Task List */}
      <div className="space-y-4">
        {tasks.map((task) => (
          <div
            key={task.id}
            className="flex items-start justify-between gap-3 group"
          >
            <div className="flex items-start gap-3 flex-1 min-w-0">
              <input
                type="checkbox"
                checked={task.completed}
                onChange={() => toggleTask(task.id)}
                aria-label={`Mark "${task.title}" as ${task.completed ? 'incomplete' : 'complete'}`}
                className="mt-0.5 w-4 h-4 rounded border-[#CBD5E1] text-[#6D28D9] focus:ring-[#6D28D9] cursor-pointer"
              />
              <div className="min-w-0 flex-1">
                <div
                  className={`text-sm font-semibold text-[#1E1B4B] cursor-pointer ${
                    task.completed ? 'line-through text-[#94A3B8]' : ''
                  }`}
                  onClick={() => toggleTask(task.id)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      toggleTask(task.id);
                    }
                  }}
                >
                  {task.title}
                </div>
                <div className="text-xs text-[#64748B] mt-0.5 leading-relaxed line-clamp-2">
                  {task.description}
                </div>
              </div>
            </div>

            {/* Date Tag */}
            <div className={`flex items-center gap-1 text-xs font-medium shrink-0 mt-0.5 ${
              task.completed ? 'text-[#94A3B8]' : 'text-[#EF4444]'
            }`}>
              <Calendar className="w-3.5 h-3.5" />
              <span>{task.dueDate}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
