export type NotificationType = 'budget' | 'lead' | 'task' | 'campaign' | 'report';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  description: string;
  timestamp: string;
  isRead: boolean;
  workspaceId?: string;
}

export interface ReadStateMap {
  [notificationId: string]: boolean;
}

export interface StorageSchema {
  version: number;
  readStates: ReadStateMap;
}
