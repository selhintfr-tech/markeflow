import { useState, useEffect, useCallback, useRef } from 'react';
import { apiRequest } from '../../features/api/apiClient';
import type { Notification, NotificationsResponse } from './notificationTypes';

interface UseNotificationsOptions {
  workspaceId?: string;
  userId?: string;
}

export const useNotifications = (options: UseNotificationsOptions = {}) => {
  const { workspaceId, userId } = options;
  const contextKey = `${userId || ''}:${workspaceId || ''}`;
  const contextKeyRef = useRef(contextKey);
  const requestIdRef = useRef(0);
  const [state, setState] = useState<{
    contextKey: string;
    notifications: Notification[];
    unreadCount: number;
    hasMore: boolean;
    currentPage: number;
    loading: boolean;
    error: string | null;
  }>({ contextKey, notifications: [], unreadCount: 0, hasMore: false, currentPage: 0, loading: false, error: null });

  const reload = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    contextKeyRef.current = contextKey;
    if (!userId || !workspaceId) {
      setState({ contextKey, notifications: [], unreadCount: 0, hasMore: false, currentPage: 0, loading: false, error: null });
      return;
    }
    setState((current) => ({
      contextKey,
      notifications: current.contextKey === contextKey ? current.notifications : [],
      unreadCount: current.contextKey === contextKey ? current.unreadCount : 0,
      hasMore: current.contextKey === contextKey ? current.hasMore : false,
      currentPage: current.contextKey === contextKey ? current.currentPage : 0,
      loading: true,
      error: null,
    }));
    try {
      const response = await apiRequest<NotificationsResponse>('/api/notifications?per_page=20&page=1', {
        workspaceId,
        cacheTtlMs: 30_000,
      });
      if (requestId !== requestIdRef.current || contextKeyRef.current !== contextKey) return;
      setState({
        contextKey,
        notifications: response.data,
        unreadCount: response.meta.unread_count,
        hasMore: response.meta.current_page < response.meta.last_page,
        currentPage: response.meta.current_page,
        loading: false,
        error: null,
      });
    } catch (error) {
      if (requestId !== requestIdRef.current || contextKeyRef.current !== contextKey) return;
      setState({
        contextKey,
        notifications: [],
        unreadCount: 0,
        hasMore: false,
        currentPage: 0,
        loading: false,
        error: error instanceof Error ? error.message : 'Unable to load notifications.',
      });
    }
  }, [contextKey, userId, workspaceId]);

  const loadMore = useCallback(async () => {
    if (!userId || !workspaceId || !state.hasMore || state.loading || state.contextKey !== contextKey) return;
    const requestId = ++requestIdRef.current;
    const nextPage = state.currentPage + 1;
    setState((current) => ({ ...current, loading: true, error: null }));
    try {
      const response = await apiRequest<NotificationsResponse>(`/api/notifications?per_page=20&page=${nextPage}`, {
        workspaceId,
        cacheTtlMs: 30_000,
      });
      if (requestId !== requestIdRef.current || contextKeyRef.current !== contextKey) return;
      setState((current) => {
        if (current.contextKey !== contextKey) return current;
        const existing = new Set(current.notifications.map((notification) => notification.id));
        return {
          ...current,
          notifications: [...current.notifications, ...response.data.filter((notification) => !existing.has(notification.id))],
          unreadCount: response.meta.unread_count,
          hasMore: response.meta.current_page < response.meta.last_page,
          currentPage: response.meta.current_page,
          loading: false,
          error: null,
        };
      });
    } catch (error) {
      if (requestId !== requestIdRef.current || contextKeyRef.current !== contextKey) return;
      setState((current) => ({
        ...current,
        loading: false,
        error: error instanceof Error ? error.message : 'Unable to load more notifications.',
      }));
    }
  }, [contextKey, state, userId, workspaceId]);

  useEffect(() => {
    if (!userId || !workspaceId) return;
    // Defer initial notification poll by 150ms so primary page metrics (overview, charts) take priority
    const initialTimer = window.setTimeout(() => void reload(), 150);
    const interval = window.setInterval(() => void reload(), 60_000);
    return () => {
      window.clearTimeout(initialTimer);
      window.clearInterval(interval);
      requestIdRef.current += 1;
    };
  }, [reload, userId, workspaceId]);

  const markAsRead = useCallback(async (id: string) => {
    if (!workspaceId || !userId) return;
    await apiRequest(`/api/notifications/${encodeURIComponent(id)}/read`, { method: 'PATCH', workspaceId });
    await reload();
  }, [reload, userId, workspaceId]);

  const markAllAsRead = useCallback(async () => {
    if (!workspaceId || !userId) return;
    await apiRequest('/api/notifications/read-all', { method: 'POST', workspaceId });
    await reload();
  }, [reload, userId, workspaceId]);

  const currentState = state.contextKey === contextKey
    ? state
    : {
      contextKey,
      notifications: [],
      unreadCount: 0,
      hasMore: false,
      currentPage: 0,
      loading: Boolean(userId && workspaceId),
      error: null,
    };

  return {
    notifications: currentState.notifications,
    unreadCount: currentState.unreadCount,
    hasMore: currentState.hasMore,
    loading: currentState.loading,
    error: currentState.error,
    markAsRead,
    markAllAsRead,
    reload,
    loadMore,
  };
};
