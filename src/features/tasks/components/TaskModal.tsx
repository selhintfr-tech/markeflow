import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import type { TaskItem, TaskPriority, TaskStatus } from '../types';
import { teamMembers } from '../tasksData';

interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (taskData: Partial<TaskItem>) => void;
  initialTask?: TaskItem | null;
  availableProjects: string[];
  availableCampaigns: string[];
}

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/**
 * Converts a display string ('15 Oct 2026') or ISO string ('2026-10-15')
 * to standard ISO format 'YYYY-MM-DD' for native HTML5 date input.
 */
const displayToIsoDate = (dateStr: string): string => {
  if (!dateStr) return '';
  const trimmed = dateStr.trim();

  // Already YYYY-MM-DD
  const matchIso = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (matchIso) return trimmed;

  // DD MMM YYYY (e.g., '15 Oct 2026')
  const matchFormatted = trimmed.match(/^(\d{1,2})\s+([A-Za-z]{3})\s+(\d{4})$/);
  if (matchFormatted) {
    const day = matchFormatted[1].padStart(2, '0');
    const monthStr = matchFormatted[2].toLowerCase();
    const monthIdx = MONTH_NAMES.findIndex((m) => m.toLowerCase() === monthStr);
    const year = matchFormatted[3];
    if (monthIdx !== -1) {
      const month = String(monthIdx + 1).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
  }

  // Fallback try Date object
  const parsed = new Date(trimmed);
  if (!isNaN(parsed.getTime())) {
    const year = parsed.getFullYear();
    const month = String(parsed.getMonth() + 1).padStart(2, '0');
    const day = String(parsed.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  return '';
};

/**
 * Converts ISO format 'YYYY-MM-DD' back to application standard format 'DD MMM YYYY'
 * (e.g. '2026-10-15' -> '15 Oct 2026') preserving stored date compatibility.
 */
const isoToDisplayDate = (isoStr: string): string => {
  if (!isoStr) return '';
  const trimmed = isoStr.trim();

  // If already DD MMM YYYY
  const matchFormatted = trimmed.match(/^(\d{1,2})\s+([A-Za-z]{3})\s+(\d{4})$/);
  if (matchFormatted) return trimmed;

  // YYYY-MM-DD
  const matchIso = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (matchIso) {
    const year = matchIso[1];
    const monthIdx = parseInt(matchIso[2], 10) - 1;
    const day = matchIso[3];
    if (monthIdx >= 0 && monthIdx < 12) {
      return `${day} ${MONTH_NAMES[monthIdx]} ${year}`;
    }
  }

  const parsed = new Date(trimmed);
  if (!isNaN(parsed.getTime())) {
    const day = String(parsed.getDate()).padStart(2, '0');
    const month = MONTH_NAMES[parsed.getMonth()];
    const year = parsed.getFullYear();
    return `${day} ${month} ${year}`;
  }

  return trimmed;
};

export const TaskModal: React.FC<TaskModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialTask,
  availableProjects,
  availableCampaigns,
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [project, setProject] = useState('');
  const [campaign, setCampaign] = useState('');
  const [assigneeName, setAssigneeName] = useState(teamMembers[0].name);
  const [priority, setPriority] = useState<TaskPriority>('Medium');
  const [isoDueDate, setIsoDueDate] = useState('2026-10-25');
  const [status, setStatus] = useState<TaskStatus>('In Progress');
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  // Sync state during render when initialTask or isOpen transitions (avoids cascading effect renders)
  const [prevTask, setPrevTask] = useState(initialTask);
  const [prevIsOpen, setPrevIsOpen] = useState(isOpen);

  if (isOpen !== prevIsOpen || initialTask !== prevTask) {
    setPrevIsOpen(isOpen);
    setPrevTask(initialTask);
    if (initialTask) {
      setTitle(initialTask.title);
      setDescription(initialTask.description || '');
      setProject(initialTask.project);
      setCampaign(initialTask.campaign);
      setAssigneeName(initialTask.assignee.name);
      setPriority(initialTask.priority);
      setIsoDueDate(displayToIsoDate(initialTask.dueDate) || '2026-10-25');
      setStatus(initialTask.status);
    } else {
      setTitle('');
      setDescription('');
      setProject(availableProjects[0] || 'Autumn Sales Growth');
      setCampaign(availableCampaigns[0] || 'Autumn Launch 2026');
      setAssigneeName(teamMembers[0].name);
      setPriority('Medium');
      setIsoDueDate('2026-10-25');
      setStatus('In Progress');
    }
    setErrors({});
  }

  // Handle ESC key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const validate = () => {
    const newErrors: { [key: string]: string } = {};
    if (!title.trim()) {
      newErrors.title = 'Task name is required';
    }
    if (!isoDueDate.trim()) {
      newErrors.dueDate = 'Due date is required';
    } else {
      const parsed = new Date(isoDueDate);
      if (isNaN(parsed.getTime())) {
        newErrors.dueDate = 'Please select a valid date';
      }
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    const matchedAssignee =
      teamMembers.find((m) => m.name === assigneeName) || teamMembers[0];

    onSave({
      title: title.trim(),
      description: description.trim(),
      project: project || availableProjects[0] || 'Autumn Sales Growth',
      campaign: campaign || availableCampaigns[0] || 'Autumn Launch 2026',
      assignee: matchedAssignee,
      priority,
      dueDate: isoToDisplayDate(isoDueDate),
      status,
    });

    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="task-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs"
    >
      <div className="bg-white rounded-xl shadow-xl border border-[#E2E8F0] w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-[#F1F5F9] flex items-center justify-between">
          <h3 id="task-modal-title" className="text-base font-bold text-[#1E1B4B]">
            {initialTask ? 'Edit Task' : 'New Task'}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded text-[#94A3B8] hover:text-[#1E1B4B] hover:bg-slate-100 transition-colors focus:outline-none focus:ring-2 focus:ring-[#6D28D9]/20"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Task Name */}
          <div>
            <label htmlFor="task-modal-title-input" className="block text-xs font-semibold text-[#1E1B4B] mb-1">
              Task Name <span className="text-red-500">*</span>
            </label>
            <input
              id="task-modal-title-input"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Review creative assets"
              className={`w-full px-3 py-2 text-xs bg-white border rounded-lg text-[#1E1B4B] focus:outline-none focus:ring-1 focus:ring-[#6D28D9] ${
                errors.title ? 'border-red-500' : 'border-[#E2E8F0]'
              }`}
            />
            {errors.title && (
              <p className="text-[11px] text-red-500 mt-1">{errors.title}</p>
            )}
          </div>

          {/* Description */}
          <div>
            <label htmlFor="task-modal-desc-input" className="block text-xs font-semibold text-[#1E1B4B] mb-1">
              Description
            </label>
            <textarea
              id="task-modal-desc-input"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="Brief summary of requirements..."
              className="w-full px-3 py-2 text-xs bg-white border border-[#E2E8F0] rounded-lg text-[#1E1B4B] focus:outline-none focus:ring-1 focus:ring-[#6D28D9]"
            />
          </div>

          {/* Project & Campaign Row */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="task-modal-project-select" className="block text-xs font-semibold text-[#1E1B4B] mb-1">
                Project
              </label>
              <select
                id="task-modal-project-select"
                value={project}
                onChange={(e) => setProject(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-white border border-[#E2E8F0] rounded-lg text-[#1E1B4B] focus:outline-none focus:ring-1 focus:ring-[#6D28D9]"
              >
                {availableProjects.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="task-modal-campaign-select" className="block text-xs font-semibold text-[#1E1B4B] mb-1">
                Campaign
              </label>
              <select
                id="task-modal-campaign-select"
                value={campaign}
                onChange={(e) => setCampaign(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-white border border-[#E2E8F0] rounded-lg text-[#1E1B4B] focus:outline-none focus:ring-1 focus:ring-[#6D28D9]"
              >
                {availableCampaigns.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Assignee & Due Date Row */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="task-modal-assignee-select" className="block text-xs font-semibold text-[#1E1B4B] mb-1">
                Assignee
              </label>
              <select
                id="task-modal-assignee-select"
                value={assigneeName}
                onChange={(e) => setAssigneeName(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-white border border-[#E2E8F0] rounded-lg text-[#1E1B4B] focus:outline-none focus:ring-1 focus:ring-[#6D28D9]"
              >
                {teamMembers.map((member) => (
                  <option key={member.name} value={member.name}>
                    {member.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="task-modal-duedate-input" className="block text-xs font-semibold text-[#1E1B4B] mb-1">
                Due Date <span className="text-red-500">*</span>
              </label>
              <input
                id="task-modal-duedate-input"
                type="date"
                value={isoDueDate}
                onChange={(e) => setIsoDueDate(e.target.value)}
                className={`w-full px-3 py-2 text-xs bg-white border rounded-lg text-[#1E1B4B] focus:outline-none focus:ring-1 focus:ring-[#6D28D9] ${
                  errors.dueDate ? 'border-red-500' : 'border-[#E2E8F0]'
                }`}
              />
              {errors.dueDate && (
                <p className="text-[11px] text-red-500 mt-1">{errors.dueDate}</p>
              )}
            </div>
          </div>

          {/* Priority & Status Row */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="task-modal-priority-select" className="block text-xs font-semibold text-[#1E1B4B] mb-1">
                Priority
              </label>
              <select
                id="task-modal-priority-select"
                value={priority}
                onChange={(e) => setPriority(e.target.value as TaskPriority)}
                className="w-full px-3 py-2 text-xs bg-white border border-[#E2E8F0] rounded-lg text-[#1E1B4B] focus:outline-none focus:ring-1 focus:ring-[#6D28D9]"
              >
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </select>
            </div>

            <div>
              <label htmlFor="task-modal-status-select" className="block text-xs font-semibold text-[#1E1B4B] mb-1">
                Status
              </label>
              <select
                id="task-modal-status-select"
                value={status}
                onChange={(e) => setStatus(e.target.value as TaskStatus)}
                className="w-full px-3 py-2 text-xs bg-white border border-[#E2E8F0] rounded-lg text-[#1E1B4B] focus:outline-none focus:ring-1 focus:ring-[#6D28D9]"
              >
                <option value="In Progress">In Progress</option>
                <option value="To Do">To Do</option>
                <option value="In Review">In Review</option>
                <option value="Completed">Completed</option>
                <option value="Overdue">Overdue</option>
              </select>
            </div>
          </div>

          {/* Modal Footer Buttons */}
          <div className="pt-4 border-t border-[#F1F5F9] flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-[#64748B] hover:text-[#1E1B4B] border border-[#E2E8F0] rounded-lg hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-semibold text-white bg-[#6D28D9] rounded-lg hover:bg-[#5B21B6] transition-colors shadow-2xs"
            >
              {initialTask ? 'Save Changes' : 'Create Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
