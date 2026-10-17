import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
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
  const [workspaces, setWorkspaces] = useState<WorkspaceDetail[]>([]);
  const [isLoadingWorkspaces, setIsLoadingWorkspaces] = useState(true);
  const [workspaceError, setWorkspaceError] = useState<string | null>(null);

  // Current selected workspace
  const [currentWorkspaceId, setCurrentWorkspaceId] = useState<string>(() => {
    try {
      const savedId = localStorage.getItem(CURRENT_WS_STORAGE_KEY);
      if (savedId) return savedId;
    } catch {
      // ignore
    }
    return '';
  });

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
    if (!user) {
      setWorkspaces([]);
      setIsLoadingWorkspaces(false);
      setWorkspaceError(null);
      return;
    }

    setIsLoadingWorkspaces(true);
    setWorkspaceError(null);
    try {
      const records = await workspaceService.list();
      const next = records.map(toWorkspaceDetail);
      setWorkspaces(next);
      const storedId = localStorage.getItem(CURRENT_WS_STORAGE_KEY);
      const selected = next.find((workspace) => workspace.id === storedId) || next[0];
      setCurrentWorkspaceId(selected?.id || '');
    } catch (error) {
      setWorkspaces([]);
      setWorkspaceError(error instanceof Error ? error.message : 'Unable to load workspaces.');
    } finally {
      setIsLoadingWorkspaces(false);
    }
  }, [user]);

  useEffect(() => {
    if (!isAuthLoading) void reloadWorkspaces();
  }, [isAuthLoading, reloadWorkspaces]);

  useEffect(() => {
    try {
      if (currentWorkspaceId) localStorage.setItem(CURRENT_WS_STORAGE_KEY, currentWorkspaceId);
      else localStorage.removeItem(CURRENT_WS_STORAGE_KEY);
    } catch {
      setWorkspaceError('Unable to persist the active workspace selection.');
    }
  }, [currentWorkspaceId]);

  useEffect(() => {
    try {
      localStorage.setItem(PROJECTS_STORAGE_KEY, JSON.stringify(projects));
    } catch {
      // ignore
    }
  }, [projects]);

  const currentWorkspace =
    workspaces.find((w) => w.id === currentWorkspaceId) || workspaces[0] || EMPTY_WORKSPACE;

  const handleSetCurrentWorkspace = (workspaceOrId: WorkspaceDetail | string) => {
    const id = typeof workspaceOrId === 'string' ? workspaceOrId : workspaceOrId.id;
    const exists = workspaces.some((w) => w.id === id);
    if (exists) {
      setCurrentWorkspaceId(id);
    }
  };

  const addWorkspace = async (data: WorkspaceInput): Promise<WorkspaceDetail> => {
    const created = toWorkspaceDetail(await workspaceService.create(data));
    setWorkspaces((prev) => [...prev, created]);
    setCurrentWorkspaceId(created.id);
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
      const nextWs = workspaces.find((w) => w.id !== id);
      setCurrentWorkspaceId(nextWs?.id || '');
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
        workspaces,
        currentWorkspace,
        hasWorkspace: workspaces.some((workspace) => workspace.id === currentWorkspaceId),
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
