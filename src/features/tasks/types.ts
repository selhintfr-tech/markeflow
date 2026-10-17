export type TaskStatus = 'In Progress' | 'To Do' | 'Completed' | 'Overdue' | 'In Review';

export type TaskPriority = 'High' | 'Medium' | 'Low';

export interface TaskChecklistItem {
  id: string;
  text: string;
  completed: boolean;
}

export interface TaskComment {
  id: string;
  author: string;
  authorInitials: string;
  authorAvatar?: string;
  avatarBgColor?: string;
  avatarTextColor?: string;
  timestamp: string;
  content: string;
}

export interface TaskAttachment {
  id: string;
  name: string;
  size: string;
  type: string;
  thumbnailUrl?: string;
  isUploaded?: boolean;
}

export interface TaskAssignee {
  id?: number;
  name: string;
  initials: string;
  avatarUrl?: string;
  bgColor?: string;
  textColor?: string;
}

export interface TaskItem {
  id: string;
  workspaceId: string;
  title: string;
  description?: string;
  project: string;
  projectId?: string;
  campaign: string;
  campaignId?: string;
  assigneeId?: number;
  assignee: TaskAssignee;
  priority: TaskPriority;
  dueDate: string;
  status: TaskStatus;
  checklist: TaskChecklistItem[];
  comments: TaskComment[];
  attachments: TaskAttachment[];
  createdAt: string;
}

export interface TaskFilterState {
  searchQuery: string;
  assignee: string;
  priority: string;
  status: string;
  project: string;
  kpiFilter?: string | null;
}
