import React, { Suspense, useCallback, useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { AppSidebar } from './AppSidebar';
import { AppHeader } from './AppHeader';
import { useAuth } from '../../context/AuthContext';
import { RouteLoadingSkeleton } from './RouteLoadingSkeleton';

const SIDEBAR_STORAGE_PREFIX = 'marketflow_sidebar_collapsed_v1';

function sidebarStorageKey(userId: string): string {
  return `${SIDEBAR_STORAGE_PREFIX}:${encodeURIComponent(userId)}`;
}

function loadSidebarPreference(userId: string | null): boolean {
  if (!userId) return false;

  try {
    return window.localStorage.getItem(sidebarStorageKey(userId)) === 'collapsed';
  } catch (error) {
    console.error('Unable to load sidebar preference:', error);
    return false;
  }
}

const AppShell: React.FC<{ userId: string | null }> = ({ userId }) => {
  const location = useLocation();
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => loadSidebarPreference(userId));
  const mobileMenuButtonRef = React.useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!userId) return;

    try {
      window.localStorage.setItem(
        sidebarStorageKey(userId),
        isSidebarCollapsed ? 'collapsed' : 'expanded',
      );
    } catch (error) {
      console.error('Unable to save sidebar preference:', error);
    }
  }, [isSidebarCollapsed, userId]);

  const toggleSidebar = () => {
    setIsSidebarCollapsed((collapsed) => !collapsed);
  };

  const closeMobileSidebar = useCallback(() => setIsMobileSidebarOpen(false), []);
  const toggleMobileSidebar = useCallback(
    () => setIsMobileSidebarOpen((previous) => !previous),
    [],
  );

  return (
    <div className="app-shell flex overflow-hidden bg-[var(--shell-canvas)] text-[var(--shell-text)]">
      <AppSidebar
        isMobileOpen={isMobileSidebarOpen}
        onCloseMobile={closeMobileSidebar}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={toggleSidebar}
        mobileMenuButtonRef={mobileMenuButtonRef}
      />

      <div className="app-main flex min-w-0 flex-1 flex-col">
        <AppHeader
          isMobileSidebarOpen={isMobileSidebarOpen}
          onToggleMobileSidebar={toggleMobileSidebar}
          mobileMenuButtonRef={mobileMenuButtonRef}
        />
        <main id="main-content" tabIndex={-1} className="app-main-scroll min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain p-4 sm:p-6 lg:p-8">
          <Suspense fallback={<RouteLoadingSkeleton pathname={location.pathname} />}>
            <Outlet />
          </Suspense>
        </main>
      </div>
    </div>
  );
};

export const AppLayout: React.FC = () => {
  const { user } = useAuth();
  const userId = user?.id ?? null;

  return <AppShell key={userId ?? 'anonymous'} userId={userId} />;
};
