import { useNotifications } from './useNotifications';
import { NotificationItem } from './NotificationItem';
import { NotificationEmptyState } from './NotificationEmptyState';
import { X } from 'lucide-react';
import type { RefObject } from 'react';

interface NotificationsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  panelId: string;
  closeRef: RefObject<HTMLButtonElement | null>;
  workspaceId?: string;
}

export const NotificationsPanel = ({ isOpen, onClose, panelId, closeRef, workspaceId }: NotificationsPanelProps) => {
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications({ workspaceId });

  if (!isOpen) return null;

  const handleNotificationClick = (id: string) => {
    markAsRead(id);
  };

  const handleMarkAllAsRead = () => {
    markAllAsRead();
  };

  return (
    <div
      id={panelId}
      role="dialog"
      aria-labelledby="notifications-title"
      className="absolute right-0 top-full mt-2 w-[380px] max-w-[calc(100vw-2rem)] bg-white rounded-lg shadow-lg border border-gray-200 z-50"
      style={{
        maxHeight: 'calc(100vh - 100px)',
      }}
    >
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h2 id="notifications-title" className="text-lg font-semibold text-gray-900">
              Notifications
            </h2>
            {unreadCount > 0 && (
              <p className="text-sm text-gray-600">{unreadCount} unread</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                className="text-sm text-purple-600 hover:text-purple-700 font-medium transition-colors"
                type="button"
              >
                Mark all as read
              </button>
            )}
            <button
              ref={closeRef}
              onClick={onClose}
              className="p-1 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
              type="button"
              aria-label="Close notifications"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <ul className="overflow-y-auto" style={{ maxHeight: 'calc(100vh - 250px)' }} role="list" aria-label="Notification list">
        {notifications.length === 0 ? (
          <NotificationEmptyState />
        ) : (
          notifications.map((notification) => (
            <li key={notification.id}>
              <NotificationItem
                notification={notification}
                onClick={handleNotificationClick}
              />
            </li>
          ))
        )}
      </ul>

      {notifications.length > 0 && (
        <div className="p-3 border-t border-gray-200">
          <p className="text-xs text-gray-500 text-center">
            Showing {notifications.length} notifications
          </p>
        </div>
      )}
    </div>
  );
};
