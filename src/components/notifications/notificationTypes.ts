export type NotificationType = 'budget' | 'lead' | 'task' | 'campaign' | 'report';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  description: string;
  action_url: string | null;
  created_at: string;
  is_read: boolean;
}

export interface NotificationsResponse {
  data: Notification[];
  meta: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    unread_count: number;
  };
}

export interface UnreadCountResponse {
  data: {
    unread_count: number;
  };
}
