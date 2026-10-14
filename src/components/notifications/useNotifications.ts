import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import type { ReadStateMap, StorageSchema } from './notificationTypes';
import { initialNotifications } from './notificationData';

const STORAGE_VERSION = 1;
const BASE_STORAGE_KEY = 'marketflow_notifications';

const getStorageKey = (workspaceId?: string): string => {
  return workspaceId
    ? `${BASE_STORAGE_KEY}_${workspaceId}_v${STORAGE_VERSION}`
    : `${BASE_STORAGE_KEY}_demo_v${STORAGE_VERSION}`;
};

const isValidReadStateMap = (value: unknown): value is ReadStateMap => {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const map = value as Record<string, unknown>;
  for (const key in map) {
    if (typeof map[key] !== 'boolean') {
      return false;
    }
  }
  return true;
};

const isValidStorageSchema = (value: unknown): value is StorageSchema => {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const schema = value as StorageSchema;
  return (
    typeof schema.version === 'number' &&
    schema.version === STORAGE_VERSION &&
    isValidReadStateMap(schema.readStates)
  );
};

interface UseNotificationsOptions {
  workspaceId?: string;
}

export const useNotifications = (options: UseNotificationsOptions = {}) => {
  const { workspaceId } = options;
  const storageKey = useMemo(() => getStorageKey(workspaceId), [workspaceId]);
  const prevWorkspaceIdRef = useRef<string | undefined>(workspaceId);

  const [readStates, setReadStates] = useState<ReadStateMap>(() => {
    // Initial load for the first workspace
    try {
      if (typeof localStorage === 'undefined') {
        return {};
      }
      const stored = localStorage.getItem(storageKey);
      if (!stored) {
        return {};
      }
      const parsed = JSON.parse(stored);
      if (isValidStorageSchema(parsed)) {
        return parsed.readStates;
      }
      console.warn('Invalid storage schema detected, using default state');
      return {};
    } catch (error) {
      console.warn('Failed to load notifications from localStorage:', error);
      return {};
    }
  });

  // Load read states when workspaceId changes
  // eslint-disable-next-line react-hooks/exhaustive-deps, react/set-state-in-effect
  useEffect(() => {
    if (workspaceId !== prevWorkspaceIdRef.current) {
      prevWorkspaceIdRef.current = workspaceId;
      
      try {
        if (typeof localStorage === 'undefined') {
          setReadStates({});
          return;
        }
        const stored = localStorage.getItem(storageKey);
        if (!stored) {
          setReadStates({});
          return;
        }
        const parsed = JSON.parse(stored);
        if (isValidStorageSchema(parsed)) {
          setReadStates(parsed.readStates);
        } else {
          console.warn('Invalid storage schema detected, using default state');
          setReadStates({});
        }
      } catch (error) {
        console.warn('Failed to load notifications from localStorage:', error);
        setReadStates({});
      }
    }
  }, [storageKey, workspaceId]);

  const notifications = useMemo(() => {
    // In demo mode (no workspaceId), show demo notifications
    // In workspace mode, show empty state (real data will come from backend)
    if (!workspaceId) {
      return initialNotifications.map((notification) => ({
        ...notification,
        isRead: readStates[notification.id] ?? notification.isRead,
      }));
    }
    // Workspace-specific mode: no demo notifications, empty state will be shown
    return [];
  }, [readStates, workspaceId]);

  const unreadCount = useMemo(() => {
    return notifications.filter((n) => !n.isRead).length;
  }, [notifications]);

  const markAsRead = useCallback((id: string) => {
    setReadStates((prev) => ({
      ...prev,
      [id]: true,
    }));
  }, []);

  const markAllAsRead = useCallback(() => {
    setReadStates((prev) => {
      const newStates: ReadStateMap = {};
      notifications.forEach((notification) => {
        newStates[notification.id] = true;
      });
      return { ...prev, ...newStates };
    });
  }, [notifications]);

  const resetNotifications = useCallback(() => {
    setReadStates({});
  }, []);

  useEffect(() => {
    try {
      if (typeof localStorage === 'undefined') {
        return;
      }
      const schema: StorageSchema = {
        version: STORAGE_VERSION,
        readStates,
      };
      localStorage.setItem(storageKey, JSON.stringify(schema));
    } catch (error) {
      console.warn('Failed to save notifications to localStorage:', error);
    }
  }, [storageKey, readStates]);

  return {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    resetNotifications,
  };
};
