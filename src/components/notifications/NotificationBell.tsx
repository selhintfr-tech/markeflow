import { useState, useEffect, useRef, useCallback } from 'react';
import { Bell } from 'lucide-react';
import { useNotifications } from './useNotifications';
import { NotificationsPanel } from './NotificationsPanel';

const PANEL_ID = 'notifications-panel';

interface NotificationBellProps {
  workspaceId?: string;
}

export const NotificationBell = ({ workspaceId }: NotificationBellProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const { unreadCount } = useNotifications({ workspaceId });
  const bellRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  const togglePanel = useCallback(() => {
    setIsOpen((prev) => !prev);
  }, []);

  const closePanel = useCallback(() => {
    setIsOpen(false);
  }, []);

  const restoreFocusToBell = useCallback(() => {
    bellRef.current?.focus();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        bellRef.current &&
        !bellRef.current.contains(event.target as Node) &&
        panelRef.current &&
        !panelRef.current.contains(event.target as Node)
      ) {
        closePanel();
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        closePanel();
        restoreFocusToBell();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);

      // Focus the close button after the panel is rendered
      const requestRef = requestAnimationFrame(() => {
        closeRef.current?.focus();
      });

      return () => {
        cancelAnimationFrame(requestRef);
        document.removeEventListener('mousedown', handleClickOutside);
        document.removeEventListener('keydown', handleEscape);
      };
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, closePanel, restoreFocusToBell]);

  const displayCount = unreadCount > 9 ? '9+' : unreadCount.toString();

  return (
    <div className="relative">
      <button
        ref={bellRef}
        onClick={togglePanel}
        className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-purple-600 focus:ring-offset-2"
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
        aria-expanded={isOpen}
        aria-controls={PANEL_ID}
        aria-haspopup="dialog"
        type="button"
      >
        <Bell size={20} className="text-gray-700" />
        {unreadCount > 0 && (
          <span
            className="absolute -top-1 -right-1 bg-purple-600 text-white text-xs font-bold rounded-full min-w-[20px] h-5 flex items-center justify-center px-1"
            aria-label={`${unreadCount} unread notifications`}
          >
            {displayCount}
          </span>
        )}
      </button>

      <div ref={panelRef}>
        <NotificationsPanel
          isOpen={isOpen}
          onClose={closePanel}
          panelId={PANEL_ID}
          closeRef={closeRef}
          workspaceId={workspaceId}
        />
      </div>
    </div>
  );
};
