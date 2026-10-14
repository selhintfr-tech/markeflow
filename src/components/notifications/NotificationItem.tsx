import type { Notification } from './notificationTypes';
import { Bell, DollarSign, Users, CheckCircle, TrendingUp, FileText } from 'lucide-react';

interface NotificationItemProps {
  notification: Notification;
  onClick: (id: string) => void;
}

const iconMap = {
  budget: DollarSign,
  lead: Users,
  task: CheckCircle,
  campaign: TrendingUp,
  report: FileText,
};

export const NotificationItem = ({ notification, onClick }: NotificationItemProps) => {
  const Icon = iconMap[notification.type] || Bell;

  return (
    <button
      onClick={() => onClick(notification.id)}
      className={`w-full text-left p-4 border-b border-gray-100 transition-colors ${
        notification.isRead ? 'bg-white hover:bg-gray-50' : 'bg-purple-50 hover:bg-purple-100'
      }`}
      type="button"
      aria-label={`${notification.title}: ${notification.description}`}
    >
      <div className="flex items-start gap-3">
        <div
          className={`flex-shrink-0 p-2 rounded-lg ${
            notification.isRead ? 'bg-gray-100 text-gray-600' : 'bg-purple-100 text-purple-600'
          }`}
          aria-hidden="true"
        >
          <Icon size={18} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p
              className={`text-sm font-medium truncate ${
                notification.isRead ? 'text-gray-700' : 'text-gray-900'
              }`}
            >
              {notification.title}
            </p>
            {!notification.isRead && (
              <div
                className="flex-shrink-0 w-2 h-2 rounded-full bg-purple-600"
                aria-label="Unread"
              />
            )}
          </div>
          <p className="text-sm text-gray-600 mt-1 line-clamp-2">
            {notification.description}
          </p>
          <p className="text-xs text-gray-500 mt-2">{notification.timestamp}</p>
        </div>
      </div>
    </button>
  );
};
