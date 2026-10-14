import React, { createContext, useContext, useState, useEffect } from 'react';
import type { WorkspaceDetail, MarketingProjectItem } from '../types';
import { initialWorkspacesDetailList, initialMarketingProjectsList } from '../data/mock';

interface WorkspaceContextType {
  workspaces: WorkspaceDetail[];
  currentWorkspace: WorkspaceDetail;
  setCurrentWorkspace: (workspaceOrId: WorkspaceDetail | string) => void;
  addWorkspace: (workspace: {
    name: string;
    description: string;
    location: string;
    status?: string;
  }) => WorkspaceDetail;
  updateWorkspace: (id: string, updates: Partial<WorkspaceDetail>) => void;
  deleteWorkspace: (id: string) => boolean;
  projects: MarketingProjectItem[];
  addProject: (project: Omit<MarketingProjectItem, 'id' | 'createdAt'>) => MarketingProjectItem;
  updateProject: (id: string, updates: Partial<MarketingProjectItem>) => void;
  deleteProject: (id: string) => void;
  archiveProject: (id: string) => void;
}

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined);

const WORKSPACES_STORAGE_KEY = 'marketflow_workspaces';
const PROJECTS_STORAGE_KEY = 'marketflow_projects';
const CURRENT_WS_STORAGE_KEY = 'marketflow_current_workspace_id';

export const WorkspaceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Load initial workspaces from localStorage or fallback to mock
  const [workspaces, setWorkspaces] = useState<WorkspaceDetail[]>(() => {
    try {
      const saved = localStorage.getItem(WORKSPACES_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // ignore
    }
    return initialWorkspacesDetailList;
  });

  // Current selected workspace
  const [currentWorkspaceId, setCurrentWorkspaceId] = useState<string>(() => {
    try {
      const savedId = localStorage.getItem(CURRENT_WS_STORAGE_KEY);
      if (savedId) return savedId;
    } catch {
      // ignore
    }
    return initialWorkspacesDetailList[0]?.id || 'ws-atlas-retail';
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

  // Sync to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(WORKSPACES_STORAGE_KEY, JSON.stringify(workspaces));
    } catch {
      // ignore
    }
  }, [workspaces]);

  useEffect(() => {
    try {
      localStorage.setItem(CURRENT_WS_STORAGE_KEY, currentWorkspaceId);
    } catch {
      // ignore
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
    workspaces.find((w) => w.id === currentWorkspaceId) || workspaces[0] || initialWorkspacesDetailList[0];

  const handleSetCurrentWorkspace = (workspaceOrId: WorkspaceDetail | string) => {
    const id = typeof workspaceOrId === 'string' ? workspaceOrId : workspaceOrId.id;
    const exists = workspaces.some((w) => w.id === id);
    if (exists) {
      setCurrentWorkspaceId(id);
    }
  };

  const addWorkspace = (data: {
    name: string;
    description: string;
    location: string;
    status?: string;
  }): WorkspaceDetail => {
    const id = `ws-${Date.now().toString(36)}`;
    const newWs: WorkspaceDetail = {
      id,
      name: data.name.trim(),
      description: data.description.trim(),
      location: data.location.trim(),
      membersCount: 1,
      membersAvatars: [
        {
          id: 'user-se',
          name: 'Sara El Amrani',
          initials: 'SE',
          avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
          bgColor: '#EDE9FE',
          textColor: '#6D28D9',
        },
      ],
      extraMembersCount: 0,
      projectsCount: 0,
      status: (data.status as any) || 'Active',
      iconType: 'building',
    };

    setWorkspaces((prev) => [...prev, newWs]);
    return newWs;
  };

  const updateWorkspace = (id: string, updates: Partial<WorkspaceDetail>) => {
    setWorkspaces((prev) =>
      prev.map((w) => (w.id === id ? { ...w, ...updates } : w))
    );
  };

  const deleteWorkspace = (id: string): boolean => {
    if (workspaces.length <= 1) {
      return false; // Prevent deleting the last workspace
    }
    setWorkspaces((prev) => prev.filter((w) => w.id !== id));
    if (currentWorkspaceId === id) {
      const nextWs = workspaces.find((w) => w.id !== id);
      if (nextWs) setCurrentWorkspaceId(nextWs.id);
    }
    return true;
  };

  const addProject = (data: Omit<MarketingProjectItem, 'id' | 'createdAt'>): MarketingProjectItem => {
    const id = `proj-${Date.now().toString(36)}`;
    const newProj: MarketingProjectItem = {
      ...data,
      id,
      createdAt: new Date().toISOString().split('T')[0],
    };
    setProjects((prev) => [newProj, ...prev]);

    // Also update project count in workspace
    setWorkspaces((prev) =>
      prev.map((w) =>
        w.id === data.workspaceId ? { ...w, projectsCount: (w.projectsCount || 0) + 1 } : w
      )
    );

    return newProj;
  };

  const updateProject = (id: string, updates: Partial<MarketingProjectItem>) => {
    setProjects((prev) =>
      prev.map((p) => (p.id === id ? { ...p, ...updates } : p))
    );
  };

  const deleteProject = (id: string) => {
    const projToDelete = projects.find((p) => p.id === id);
    setProjects((prev) => prev.filter((p) => p.id !== id));

    if (projToDelete) {
      setWorkspaces((prev) =>
        prev.map((w) =>
          w.id === projToDelete.workspaceId
            ? { ...w, projectsCount: Math.max(0, (w.projectsCount || 0) - 1) }
            : w
        )
      );
    }
  };

  const archiveProject = (id: string) => {
    updateProject(id, { status: 'Archived' });
  };

  return (
    <WorkspaceContext.Provider
      value={{
        workspaces,
        currentWorkspace,
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
