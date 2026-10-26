import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import type { WorkspaceDetail, MarketingProjectItem } from '../types';
import { initialMarketingProjectsList } from '../data/mock';
import { workspaceService, type WorkspaceInput, type WorkspaceRecord } from '../features/workspaces/workspaceService';
import { useAuth } from './AuthContext';

interface WorkspaceContextType {
  workspaces: WorkspaceDetail[];
  currentWorkspace: WorkspaceDetail;
  hasWorkspace: boolean;
  isLoadingWorkspaces: boolean;
  workspaceError: string | null;
  reloadWorkspaces: () => Promise<void>;
  setCurrentWorkspace: (workspaceOrId: WorkspaceDetail | string) => void;
  addWorkspace: (workspace: WorkspaceInput) => Promise<WorkspaceDetail>;
  updateWorkspace: (id: string, updates: Partial<WorkspaceInput>) => Promise<void>;
  deleteWorkspace: (id: string) => Promise<void>;
  projects: MarketingProjectItem[];
  addProject: (project: Omit<MarketingProjectItem, 'id' | 'createdAt'>) => MarketingProjectItem;
  updateProject: (id: string, updates: Partial<MarketingProjectItem>) => void;
  deleteProject: (id: string) => void;
  archiveProject: (id: string) => void;
}

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined);

const PROJECTS_STORAGE_KEY = 'marketflow_projects';
const CURRENT_WS_STORAGE_KEY = 'marketflow_current_workspace_id';
const WORKSPACES_CACHE_KEY = 'marketflow_workspaces_list';
const workspaceStorageKey = (userId: string) => `${CURRENT_WS_STORAGE_KEY}_${userId}`;
const workspaceListStorageKey = (userId: string) => `${WORKSPACES_CACHE_KEY}_${userId}`;
const EMPTY_WORKSPACE: WorkspaceDetail = {
  id: '',
  name: '',
  description: '',
  location: '',
  currency: '',
  membersAvatars: [],
  extraMembersCount: 0,
  status: '',
};

function toWorkspaceDetail(record: WorkspaceRecord): WorkspaceDetail {
  return {
    id: record.id,
    name: record.name,
    description: record.industry || '',
    location: record.location || '',
    currency: record.currency,
    membersCount: record.members_count,
    membersAvatars: [],
    extraMembersCount: 0,
    status: record.status,
    iconType: record.business_type === 'agency' ? 'users' : 'building',
  };
}

export const WorkspaceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isLoading: isAuthLoading } = useAuth();
  const userId = user?.id;
  const [workspaces, setWorkspaces] = useState<WorkspaceDetail[]>([]);
  const [workspaceOwnerId, setWorkspaceOwnerId] = useState<string | null>(null);
  const [isLoadingWorkspaces, setIsLoadingWorkspaces] = useState(true);
  const [workspaceError, setWorkspaceError] = useState<string | null>(null);

  const [currentWorkspaceId, setCurrentWorkspaceId] = useState('');
  const currentWorkspaceIdRef = useRef(currentWorkspaceId);
  currentWorkspaceIdRef.current = currentWorkspaceId;
  const workspaceOwnerIdRef = useRef(workspaceOwnerId);
  workspaceOwnerIdRef.current = workspaceOwnerId;
  const workspacesCountRef = useRef(workspaces.length);
  workspacesCountRef.current = workspaces.length;
  const workspaceLoadVersion = useRef(0);

  // Hydrate workspaces immediately from local storage cache when userId is available
  useEffect(() => {
    if (!userId) return;
    try {
      const cached = localStorage.getItem(workspaceListStorageKey(userId));
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setWorkspaces(parsed);
          setWorkspaceOwnerId(userId);
          const savedId = localStorage.getItem(workspaceStorageKey(userId)) || user?.workspaceId || parsed[0]?.id;
          if (savedId) {
            setCurrentWorkspaceId(savedId);
          }
        }
      }
    } catch {
      // ignore
    }
  }, [userId, user?.workspaceId]);

  // Load initial projects from localStorage or fallback to mock
  const [projects, setProjects] = useState<MarketingProjectItem[]>(() => {
    try {
      const saved = localStorage.getItem(PROJECTS_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // ignore
    }
    return initialMarketingProjectsList;
  });

  const reloadWorkspaces = useCallback(async () => {
    const loadVersion = ++workspaceLoadVersion.current;
    if (!userId) {
      setWorkspaces([]);
      setWorkspaceOwnerId(null);
      setCurrentWorkspaceId('');
      setIsLoadingWorkspaces(false);
      setWorkspaceError(null);
      return;
    }

    const isSameUser = workspaceOwnerIdRef.current === userId && workspacesCountRef.current > 0;
    if (!isSameUser) {
      setIsLoadingWorkspaces(true);
      let initialCandidateId = '';
      try {
        initialCandidateId = localStorage.getItem(workspaceStorageKey(userId)) || user?.workspaceId || '';
      } catch {
        // ignore
      }
      if (initialCandidateId) {
        setCurrentWorkspaceId(initialCandidateId);
      }
    }
    setWorkspaceError(null);
    try {
      const records = await workspaceService.list();
      if (loadVersion !== workspaceLoadVersion.current) return;
      const next = records.map(toWorkspaceDetail);
      setWorkspaces(next);
      setWorkspaceOwnerId(userId);
      try {
        localStorage.setItem(workspaceListStorageKey(userId), JSON.stringify(next));
      } catch {
        // ignore
      }
      let storedId: string | null = null;
      try {
        storedId = localStorage.getItem(workspaceStorageKey(userId)) || user?.workspaceId || null;
      } catch {
        setWorkspaceError('Unable to read the saved workspace selection.');
      }
      const activeId = currentWorkspaceIdRef.current;
      const selected =
        next.find((workspace) => workspace.id === activeId) ||
        next.find((workspace) => workspace.id === storedId) ||
        next[0];
      setCurrentWorkspaceId(selected?.id || '');
      if (selected) {
        try {
          localStorage.setItem(workspaceStorageKey(userId), selected.id);
        } catch {
          setWorkspaceError('Unable to persist the active workspace selection.');
        }
      }
    } catch (error) {
      if (loadVersion !== workspaceLoadVersion.current) return;
      if (!isSameUser) {
        setWorkspaces([]);
        setWorkspaceOwnerId(null);
        setCurrentWorkspaceId('');
      }
      setWorkspaceError(error instanceof Error ? error.message : 'Unable to load workspaces.');
    } finally {
      if (loadVersion === workspaceLoadVersion.current) setIsLoadingWorkspaces(false);
    }
  }, [user?.workspaceId, userId]);

  useEffect(() => {
    if (!isAuthLoading) void reloadWorkspaces();
  }, [isAuthLoading, reloadWorkspaces]);

  useEffect(() => {
    try {
      localStorage.setItem(PROJECTS_STORAGE_KEY, JSON.stringify(projects));
    } catch {
      // ignore
    }
  }, [projects]);

  const currentUserWorkspaces = workspaceOwnerId === userId ? workspaces : [];
  const currentWorkspace =
    currentUserWorkspaces.find((w) => w.id === currentWorkspaceId) || currentUserWorkspaces[0] || EMPTY_WORKSPACE;

  const handleSetCurrentWorkspace = (workspaceOrId: WorkspaceDetail | string) => {
    const id = typeof workspaceOrId === 'string' ? workspaceOrId : workspaceOrId.id;
    const exists = currentUserWorkspaces.some((w) => w.id === id);
    if (exists) {
      setCurrentWorkspaceId(id);
      if (userId) {
        try {
          localStorage.setItem(workspaceStorageKey(userId), id);
        } catch {
          setWorkspaceError('Unable to persist the active workspace selection.');
        }
      }
    }
  };

  const addWorkspace = async (data: WorkspaceInput): Promise<WorkspaceDetail> => {
    const created = toWorkspaceDetail(await workspaceService.create(data));
    setWorkspaces((prev) => [...prev, created]);
    setCurrentWorkspaceId(created.id);
    if (userId) localStorage.setItem(workspaceStorageKey(userId), created.id);
    return created;
  };

  const updateWorkspace = async (id: string, updates: Partial<WorkspaceInput>): Promise<void> => {
    const updated = toWorkspaceDetail(await workspaceService.update(id, updates));
    setWorkspaces((prev) => prev.map((workspace) => workspace.id === id ? updated : workspace));
  };

  const deleteWorkspace = async (id: string): Promise<void> => {
    await workspaceService.remove(id);
    setWorkspaces((prev) => prev.filter((w) => w.id !== id));
    if (currentWorkspaceId === id) {
      const nextWs = currentUserWorkspaces.find((w) => w.id !== id);
      setCurrentWorkspaceId(nextWs?.id || '');
      if (userId) {
        if (nextWs) localStorage.setItem(workspaceStorageKey(userId), nextWs.id);
        else localStorage.removeItem(workspaceStorageKey(userId));
      }
    }
  };

  const addProject = (data: Omit<MarketingProjectItem, 'id' | 'createdAt'>): MarketingProjectItem => {
    const id = `proj-${Date.now().toString(36)}`;
    const newProj: MarketingProjectItem = {
      ...data,
      id,
      createdAt: new Date().toISOString().split('T')[0],
    };
    setProjects((prev) => [newProj, ...prev]);

    return newProj;
  };

  const updateProject = (id: string, updates: Partial<MarketingProjectItem>) => {
    setProjects((prev) =>
      prev.map((p) => (p.id === id ? { ...p, ...updates } : p))
    );
  };

  const deleteProject = (id: string) => {
    setProjects((prev) => prev.filter((p) => p.id !== id));
  };

  const archiveProject = (id: string) => {
    updateProject(id, { status: 'Archived' });
  };

  return (
    <WorkspaceContext.Provider
      value={{
        workspaces: currentUserWorkspaces,
        currentWorkspace,
        hasWorkspace: !isLoadingWorkspaces && workspaceOwnerId === userId && currentUserWorkspaces.some((workspace) => workspace.id === currentWorkspaceId),
        isLoadingWorkspaces,
        workspaceError,
        reloadWorkspaces,
        setCurrentWorkspace: handleSetCurrentWorkspace,
        addWorkspace,
        updateWorkspace,
        deleteWorkspace,
        projects,
        addProject,
        updateProject,
        deleteProject,
        archiveProject,
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
};

export const useWorkspace = (): WorkspaceContextType => {
  const context = useContext(WorkspaceContext);
  if (!context) {
    throw new Error('useWorkspace must be used within a WorkspaceProvider');
  }
  return context;
};
