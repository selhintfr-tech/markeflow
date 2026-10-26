import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import type { TaskItem, TaskPriority, TaskStatus } from '../types';

interface TaskOption {
  id: string;
  name: string;
  project_id?: string;
}

interface AssigneeOption {
  id: number;
  name: string;
}

interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (taskData: Partial<TaskItem>) => Promise<void>;
  initialTask?: TaskItem | null;
  availableProjects: TaskOption[];
  availableCampaigns: TaskOption[];
  availableAssignees: AssigneeOption[];
  isSaving: boolean;
  saveError: string | null;
}

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/**
 * Converts a display string ('15 Oct 2026') or ISO string ('2026-10-15')
 * to standard ISO format 'YYYY-MM-DD' for native HTML5 date input.
 */
const displayToIsoDate = (dateStr?: string | null): string => {
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

export const TaskModal: React.FC<TaskModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialTask,
  availableProjects,
  availableCampaigns,
  availableAssignees,
  isSaving,
  saveError,
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [projectId, setProjectId] = useState('');
  const [campaignId, setCampaignId] = useState('');
  const [assigneeId, setAssigneeId] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('Medium');
  const [isoDueDate, setIsoDueDate] = useState('');
  const [status, setStatus] = useState<TaskStatus>('To Do');
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
      setProjectId(initialTask.projectId || '');
      setCampaignId(initialTask.campaignId || '');
      setAssigneeId(initialTask.assigneeId ? String(initialTask.assigneeId) : '');
      setPriority(initialTask.priority);
      setIsoDueDate(displayToIsoDate(initialTask.dueDate));
      setStatus(initialTask.status);
    } else {
      setTitle('');
      setDescription('');
      setProjectId(availableProjects[0]?.id || '');
      setCampaignId('');
      setAssigneeId('');
      setPriority('Medium');
      setIsoDueDate('');
      setStatus('To Do');
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
    if (isoDueDate.trim()) {
      const parsed = new Date(isoDueDate);
      if (isNaN(parsed.getTime())) {
        newErrors.dueDate = 'Please select a valid date';
      }
    }
    if (!isoDueDate.trim() && status === 'Overdue') {
      newErrors.status = 'A task without a due date cannot be marked as Overdue.';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    const matchedAssignee = availableAssignees.find((assignee) => String(assignee.id) === assigneeId);
    await onSave({
      title: title.trim(),
      description: description.trim(),
      project: availableProjects.find((projectOption) => projectOption.id === projectId)?.name || '',
      projectId: projectId || undefined,
      campaign: availableCampaigns.find((campaignOption) => campaignOption.id === campaignId)?.name || '',
      campaignId: campaignId || undefined,
      assignee: matchedAssignee
        ? { id: matchedAssignee.id, name: matchedAssignee.name, initials: matchedAssignee.name.split(/\s+/).map((part) => part[0] || '').join('').slice(0, 2).toUpperCase() }
        : { name: 'Unassigned', initials: '—' },
      assigneeId: matchedAssignee?.id,
      priority,
      dueDate: isoDueDate.trim() || undefined,
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
        <form onSubmit={(event) => { void handleSubmit(event); }} className="p-6 space-y-4">
          {saveError && <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-xs text-red-700">{saveError}</p>}
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
                value={projectId}
                onChange={(e) => { setProjectId(e.target.value); setCampaignId(''); }}
                className="w-full px-3 py-2 text-xs bg-white border border-[#E2E8F0] rounded-lg text-[#1E1B4B] focus:outline-none focus:ring-1 focus:ring-[#6D28D9]"
              >
                <option value="">No project</option>
                {availableProjects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
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
                value={campaignId}
                onChange={(e) => setCampaignId(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-white border border-[#E2E8F0] rounded-lg text-[#1E1B4B] focus:outline-none focus:ring-1 focus:ring-[#6D28D9]"
              >
                <option value="">No campaign</option>
                {availableCampaigns.filter((campaignOption) => !projectId || campaignOption.project_id === projectId).map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
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
                value={assigneeId}
                onChange={(e) => setAssigneeId(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-white border border-[#E2E8F0] rounded-lg text-[#1E1B4B] focus:outline-none focus:ring-1 focus:ring-[#6D28D9]"
              >
                <option value="">Unassigned</option>
                {availableAssignees.map((assignee) => (
                  <option key={assignee.id} value={assignee.id}>
                    {assignee.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="task-modal-duedate-input" className="block text-xs font-semibold text-[#1E1B4B] mb-1">
                Due Date <span className="text-[10px] font-normal text-[#94A3B8]">(optional)</span>
              </label>
              <input
                id="task-modal-duedate-input"
                type="date"
                value={isoDueDate}
                onChange={(e) => {
                  const val = e.target.value;
                  setIsoDueDate(val);
                  if (!val && status === 'Overdue') {
                    setStatus('To Do');
                  }
                }}
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
                className={`w-full px-3 py-2 text-xs bg-white border rounded-lg text-[#1E1B4B] focus:outline-none focus:ring-1 focus:ring-[#6D28D9] ${
                  errors.status ? 'border-red-500' : 'border-[#E2E8F0]'
                }`}
              >
                <option value="To Do">To Do</option>
                <option value="In Progress">In Progress</option>
                <option value="In Review">In Review</option>
                <option value="Completed">Completed</option>
                <option value="Overdue" disabled={!isoDueDate.trim()}>
                  Overdue {!isoDueDate.trim() ? '(requires due date)' : ''}
                </option>
              </select>
              {errors.status && (
                <p className="text-[11px] text-red-500 mt-1">{errors.status}</p>
              )}
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
              disabled={isSaving}
              className="px-4 py-2 text-xs font-semibold text-white bg-[#6D28D9] rounded-lg hover:bg-[#5B21B6] transition-colors shadow-2xs disabled:opacity-50"
            >
              {isSaving ? 'Saving…' : initialTask ? 'Save Changes' : 'Create Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
