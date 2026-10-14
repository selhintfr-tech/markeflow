import type { Notification } from './notificationTypes';

export const initialNotifications: Notification[] = [
  {
    id: '1',
    type: 'budget',
    title: 'Campaign budget alert',
    description: 'Autumn Launch 2026 has reached 72% of its advertising budget.',
    timestamp: '2 hours ago',
    isRead: false,
  },
  {
    id: '2',
    type: 'lead',
    title: 'New leads recorded',
    description: '15 new leads have been added to your CRM.',
    timestamp: '5 hours ago',
    isRead: false,
  },
  {
    id: '3',
    type: 'task',
    title: 'Task completed',
    description: 'Campaign performance review has been completed.',
    timestamp: 'Yesterday',
    isRead: false,
  },
  {
    id: '4',
    type: 'campaign',
    title: 'Campaign performance updated',
    description: 'Autumn Launch 2026 performance metrics have been updated.',
    timestamp: '2 days ago',
    isRead: true,
  },
  {
    id: '5',
    type: 'report',
    title: 'Monthly report available',
    description: 'Your October 2026 marketing report is ready for review.',
    timestamp: '3 days ago',
    isRead: true,
  },
];
