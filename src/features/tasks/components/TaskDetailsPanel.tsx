import React, { useState, useRef } from 'react';
import {
  MoreHorizontal,
  X,
  User,
  Calendar,
  TrendingUp,
  FileText,
  Megaphone,
  Check,
  Plus,
  Send,
  Pencil,
  ExternalLink,
  ChevronDown,
  Trash2,
  Paperclip,
} from 'lucide-react';
import type { TaskItem, TaskStatus } from '../types';

interface TaskDetailsPanelProps {
  task: TaskItem;
  onClose: () => void;
  onUpdateTask: (task: TaskItem) => void;
  onEditTask: (task: TaskItem) => void;
  onViewCampaign: (campaignName: string) => void;
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
  const [newCommentText, setNewCommentText] = useState('');
  const [isStatusDropdownOpen, setIsStatusDropdownOpen] = useState(false);
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const completedChecklistCount = task.checklist.filter((item) => item.completed).length;

  const handleToggleChecklistItem = (itemId: string) => {
    const updatedChecklist = task.checklist.map((item) =>
      item.id === itemId ? { ...item, completed: !item.completed } : item
    );
    onUpdateTask({ ...task, checklist: updatedChecklist });
  };

  const handleAddComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommentText.trim()) return;

    const newComment = {
      id: `cm-${Date.now()}`,
      author: 'Sara El Amrani',
      authorInitials: 'SE',
      avatarBgColor: '#EDE9FE',
      avatarTextColor: '#6D28D9',
      timestamp: new Date().toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      }) + ', ' + new Date().toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      }),
      content: newCommentText.trim(),
    };

    onUpdateTask({
      ...task,
      comments: [...task.comments, newComment],
    });
    setNewCommentText('');
  };

  const handleStatusChange = (newStatus: TaskStatus) => {
    onUpdateTask({ ...task, status: newStatus });
    setIsStatusDropdownOpen(false);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    const sizeInKB = Math.round(file.size / 1024);
    const formattedSize =
      sizeInKB > 1024
        ? `${(sizeInKB / 1024).toFixed(1)} MB`
        : `${sizeInKB} KB`;

    const newAttachment = {
      id: `att-${Date.now()}`,
      name: file.name,
      size: formattedSize,
      type: file.type.includes('image')
        ? 'Image'
        : file.type.includes('pdf')
        ? 'PDF Document'
        : 'Document',
      isUploaded: true,
    };

    onUpdateTask({
      ...task,
      attachments: [...task.attachments, newAttachment],
    });

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemoveAttachment = (attachmentId: string) => {
    onUpdateTask({
      ...task,
      attachments: task.attachments.filter((a) => a.id !== attachmentId),
    });
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

          <div className="flex items-center gap-1 shrink-0 relative">
            <button
              type="button"
              onClick={() => setIsMoreMenuOpen(!isMoreMenuOpen)}
              className="p-1 rounded text-[#94A3B8] hover:text-[#1E1B4B] hover:bg-slate-100 transition-colors"
            >
              <MoreHorizontal className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded text-[#94A3B8] hover:text-[#1E1B4B] hover:bg-slate-100 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            {/* More Menu Dropdown */}
            {isMoreMenuOpen && (
              <div className="absolute right-0 top-8 w-36 bg-white rounded-lg shadow-lg border border-[#E2E8F0] py-1 z-30">
                <button
                  type="button"
                  onClick={() => {
                    setIsMoreMenuOpen(false);
                    onEditTask(task);
                  }}
                  className="w-full text-left px-3 py-1.5 text-xs text-[#1E1B4B] hover:bg-slate-50 flex items-center gap-2"
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
                  className="w-full text-left px-3 py-1.5 text-xs text-red-600 hover:bg-red-50 flex items-center gap-2"
                >
                  <Trash2 className="w-3.5 h-3.5 text-red-500" />
                  Delete Task
                </button>
              </div>
            )}
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
              {task.dueDate}
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

        {/* Checklist Section */}
        <div className="mt-5 pt-4 border-t border-[#F1F5F9]">
          <div className="text-xs font-bold text-[#1E1B4B] mb-2.5">
            Checklist ({completedChecklistCount} of {task.checklist.length})
          </div>
          <div className="space-y-2">
            {task.checklist.map((item) => (
              <div
                key={item.id}
                onClick={() => handleToggleChecklistItem(item.id)}
                className="flex items-center gap-2.5 group cursor-pointer"
              >
                <div
                  className={`w-4 h-4 rounded border flex items-center justify-center transition-colors shrink-0 ${
                    item.completed
                      ? 'bg-[#6D28D9] border-[#6D28D9] text-white'
                      : 'border-[#CBD5E1] bg-white group-hover:border-[#6D28D9]'
                  }`}
                >
                  {item.completed && <Check className="w-3 h-3 stroke-[3]" />}
                </div>
                <span
                  className={`text-xs transition-colors select-none ${
                    item.completed
                      ? 'line-through text-[#94A3B8]'
                      : 'text-[#1E1B4B] group-hover:text-[#6D28D9]'
                  }`}
                >
                  {item.text}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Comments Section */}
        <div className="mt-5 pt-4 border-t border-[#F1F5F9]">
          <div className="text-xs font-bold text-[#1E1B4B] mb-2.5">
            Comments ({task.comments.length})
          </div>
          <div className="space-y-3 max-h-48 overflow-y-auto pr-1">
            {task.comments.map((comment) => (
              <div key={comment.id} className="flex items-start gap-2.5 text-xs">
                <div
                  className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5"
                  style={{
                    backgroundColor: comment.avatarBgColor || '#EDE9FE',
                    color: comment.avatarTextColor || '#6D28D9',
                  }}
                >
                  {comment.authorInitials}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-[#1E1B4B]">{comment.author}</span>
                    <span className="text-[10px] text-[#94A3B8]">{comment.timestamp}</span>
                  </div>
                  <p className="text-xs text-[#475569] mt-0.5 leading-relaxed">
                    {comment.content}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Add Comment Input */}
          <form onSubmit={handleAddComment} className="mt-3 flex items-center gap-1.5">
            <input
              type="text"
              value={newCommentText}
              onChange={(e) => setNewCommentText(e.target.value)}
              placeholder="Write a comment..."
              className="flex-1 px-3 py-1.5 text-xs bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg text-[#1E1B4B] placeholder-[#94A3B8] focus:outline-none focus:ring-1 focus:ring-[#6D28D9] focus:bg-white"
            />
            <button
              type="submit"
              disabled={!newCommentText.trim()}
              className="p-1.5 bg-[#6D28D9] text-white rounded-lg hover:bg-[#5B21B6] disabled:opacity-40 disabled:pointer-events-none transition-colors"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>

        {/* Attachments Section */}
        <div className="mt-5 pt-4 border-t border-[#F1F5F9]">
          <div className="flex items-center justify-between mb-2.5">
            <div className="text-xs font-bold text-[#1E1B4B]">
              Attachments ({task.attachments.length})
            </div>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1 text-xs font-semibold text-[#6D28D9] hover:underline"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add</span>
            </button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              className="hidden"
            />
          </div>

          <div className="space-y-2">
            {task.attachments.map((attachment) => (
              <div
                key={attachment.id}
                className="flex items-center justify-between p-2 rounded-lg border border-[#E2E8F0] hover:border-[#CBD5E1] transition-colors"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  {attachment.thumbnailUrl ? (
                    <img
                      src={attachment.thumbnailUrl}
                      alt={attachment.name}
                      className="w-7 h-7 rounded object-cover shrink-0"
                    />
                  ) : (
                    <div className="w-7 h-7 rounded bg-[#F5F3FF] text-[#6D28D9] flex items-center justify-center shrink-0">
                      <Paperclip className="w-3.5 h-3.5" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <div className="text-xs font-medium text-[#1E1B4B] truncate">
                      {attachment.name}
                    </div>
                    <div className="text-[10px] text-[#94A3B8]">
                      {attachment.size} • {attachment.type}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleRemoveAttachment(attachment.id)}
                  title="Remove attachment"
                  className="p-1 text-[#94A3B8] hover:text-red-500 rounded transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
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

        <button
          type="button"
          onClick={() => onViewCampaign(task.campaign)}
          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-white border border-[#E2E8F0] text-[#1E1B4B] text-xs font-semibold rounded-lg hover:bg-slate-50 transition-colors shadow-2xs"
        >
          <ExternalLink className="w-3.5 h-3.5" />
          <span>View Campaign</span>
        </button>

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
