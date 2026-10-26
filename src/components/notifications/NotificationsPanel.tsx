import { NotificationItem } from './NotificationItem';
import { NotificationEmptyState } from './NotificationEmptyState';
import { X } from 'lucide-react';
import type { RefObject } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Notification } from './notificationTypes';
import { useState } from 'react';

interface NotificationsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  panelId: string;
  closeRef: RefObject<HTMLButtonElement | null>;
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  hasMore: boolean;
  error: string | null;
  onMarkAsRead: (id: string) => Promise<void>;
  onMarkAllAsRead: () => Promise<void>;
  onRetry: () => Promise<void>;
  onLoadMore: () => Promise<void>;
}

export const NotificationsPanel = ({
  isOpen, onClose, panelId, closeRef, notifications, unreadCount, loading, hasMore, error,
  onMarkAsRead, onMarkAllAsRead, onRetry, onLoadMore,
}: NotificationsPanelProps) => {
  const navigate = useNavigate();
  const [actionError, setActionError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleNotificationClick = async (notification: Notification) => {
    setActionError(null);
    try {
      await onMarkAsRead(notification.id);
      if (notification.action_url) navigate(notification.action_url);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Unable to update this notification.');
    }
  };

  const handleMarkAllAsRead = async () => {
    setActionError(null);
    try {
      await onMarkAllAsRead();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Unable to update notifications.');
    }
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

      {error && (
        <div role="alert" className="m-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          <p>{error}</p>
          <button type="button" onClick={() => void onRetry()} className="mt-2 font-semibold underline">Try again</button>
        </div>
      )}
      {actionError && (
        <p role="alert" className="mx-4 mt-3 text-sm text-red-700">{actionError}</p>
      )}
      <ul className="overflow-y-auto" style={{ maxHeight: 'calc(100vh - 250px)' }} role="list" aria-label="Notification list" aria-busy={loading}>
        {loading && notifications.length === 0 ? (
          <li className="p-6 text-center text-sm text-gray-500">Loading notifications…</li>
        ) : notifications.length === 0 && !error ? (
          <NotificationEmptyState />
        ) : (
          notifications.map((notification) => (
            <li key={notification.id}>
              <NotificationItem
                notification={notification}
                onClick={() => void handleNotificationClick(notification)}
              />
            </li>
          ))
        )}
      </ul>

      {notifications.length > 0 && (
        <div className="p-3 border-t border-gray-200">
          {hasMore ? (
            <button
              type="button"
              disabled={loading}
              onClick={() => void onLoadMore()}
              className="w-full text-xs font-semibold text-purple-600 hover:text-purple-700 disabled:opacity-60"
            >
              {loading ? 'Loading…' : 'Load more notifications'}
            </button>
          ) : (
            <p className="text-xs text-gray-500 text-center">Showing {notifications.length} notifications</p>
          )}
        </div>
      )}
    </div>
  );
};
