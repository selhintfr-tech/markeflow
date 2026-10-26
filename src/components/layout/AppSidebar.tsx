import React, { useEffect, useRef, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  Home,
  Briefcase,
  FolderKanban,
  GitFork,
  Compass,
  Users,
  Megaphone,
  Calendar,
  CheckSquare,
  UserCheck,
  ShoppingBag,
  CreditCard,
  Percent,
  BarChart3,
  FileText,
  ArrowLeftRight,
  Archive,
  Plug,
  Settings,
  Truck,
  X,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { Logo } from '../ui/Logo';
import { useWorkspace } from '../../context/WorkspaceContext';
import { prefetchRoute } from '../../app/routes/routePrefetch';

interface NavItem {
  label: string;
  to: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

interface AppSidebarProps {
  isMobileOpen: boolean;
  onCloseMobile: () => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  mobileMenuButtonRef: React.RefObject<HTMLButtonElement | null>;
}

const navSections: NavSection[] = [
  { title: 'Overview', items: [{ label: 'Dashboard', to: '/', icon: Home }] },
  {
    title: 'Management',
    items: [
      { label: 'Workspaces', to: '/workspaces', icon: Briefcase },
      { label: 'Projects', to: '/projects', icon: FolderKanban },
      { label: 'Strategies', to: '/strategies', icon: GitFork },
      { label: 'Market Research', to: '/market-research', icon: Compass },
      { label: 'Audiences', to: '/audiences', icon: Users },
      { label: 'Campaigns', to: '/campaigns', icon: Megaphone },
      { label: 'Content Calendar', to: '/calendar', icon: Calendar },
      { label: 'Tasks', to: '/tasks', icon: CheckSquare },
    ],
  },
  {
    title: 'Customers',
    items: [
      { label: 'CRM & Leads', to: '/crm', icon: UserCheck },
      { label: 'Sales & Orders', to: '/sales/orders', icon: ShoppingBag },
    ],
  },
  {
    title: 'Finance & Insights',
    items: [
      { label: 'Budget & Expenses', to: '/finance/budget', icon: CreditCard },
      { label: 'Profitability', to: '/finance/profitability', icon: Percent },
      { label: 'Analytics', to: '/analytics', icon: BarChart3 },
      { label: 'Reports', to: '/reports', icon: FileText },
      { label: 'Comparisons', to: '/comparisons', icon: ArrowLeftRight },
    ],
  },
  { title: 'System', items: [{ label: 'Archive', to: '/archive', icon: Archive }] },
  {
    title: 'Settings / Integrations',
    items: [
      { label: 'Settings', to: '/settings', icon: Settings },
      { label: 'Meta Ads', to: '/integrations/meta', icon: Plug },
      { label: 'Delivery Integrations', to: '/integrations/delivery', icon: Truck },
    ],
  },
];

export const AppSidebar: React.FC<AppSidebarProps> = ({
  isMobileOpen,
  onCloseMobile,
  isCollapsed,
  onToggleCollapse,
  mobileMenuButtonRef,
}) => {
  const location = useLocation();
  const { currentWorkspace } = useWorkspace();
  const sidebarRef = useRef<HTMLElement>(null);
  const mobileCloseButtonRef = useRef<HTMLButtonElement>(null);
  const wasMobileOpen = useRef(false);
  const [isMobileViewport, setIsMobileViewport] = useState(
    () => window.matchMedia('(max-width: 1023px)').matches,
  );
  const desktopCollapsed = isCollapsed && !isMobileViewport;

  useEffect(() => {
    const media = window.matchMedia('(max-width: 1023px)');
    const updateViewport = () => {
      setIsMobileViewport(media.matches);
      if (!media.matches) onCloseMobile();
    };
    media.addEventListener('change', updateViewport);
    return () => media.removeEventListener('change', updateViewport);
  }, [onCloseMobile]);

  useEffect(() => {
    if (!isMobileOpen || !isMobileViewport) {
      if (wasMobileOpen.current && isMobileViewport) mobileMenuButtonRef.current?.focus();
      wasMobileOpen.current = false;
      return;
    }

    wasMobileOpen.current = true;
    mobileCloseButtonRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onCloseMobile();
        return;
      }

      if (event.key !== 'Tab' || !sidebarRef.current) return;
      const focusable = Array.from(
        sidebarRef.current.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled])',
        ),
      ).filter((element) => element.tabIndex !== -1 && element.getClientRects().length > 0);
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (!first || !last) return;

      if (event.shiftKey && (document.activeElement === first || !sidebarRef.current.contains(document.activeElement))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (document.activeElement === last || !sidebarRef.current.contains(document.activeElement))) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isMobileOpen, isMobileViewport, mobileMenuButtonRef, onCloseMobile]);

  return (
    <>
      {isMobileOpen && isMobileViewport && (
        <button
          type="button"
          className="app-sidebar-backdrop fixed inset-0 z-40 bg-slate-950/50 backdrop-blur-[1px] lg:hidden"
          onClick={onCloseMobile}
          aria-label="Close navigation menu"
          tabIndex={-1}
        />
      )}

      <aside
        ref={sidebarRef}
        id="app-sidebar"
        className={`app-sidebar fixed inset-y-0 left-0 z-50 flex h-dvh shrink-0 flex-col border-r transition-[width,transform] duration-300 ease-in-out lg:sticky lg:top-0 lg:translate-x-0 ${
          desktopCollapsed ? 'app-sidebar-is-collapsed' : 'app-sidebar-is-expanded'
        } ${isMobileOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full shadow-none'}`}
        aria-label="Main navigation"
        aria-hidden={!isMobileOpen && isMobileViewport}
        aria-modal={isMobileOpen && isMobileViewport ? true : undefined}
        role={isMobileOpen && isMobileViewport ? 'dialog' : undefined}
        data-collapsed={desktopCollapsed}
      >
        <div className={`app-sidebar-brand flex h-16 shrink-0 items-center border-b ${desktopCollapsed ? 'justify-center px-2' : 'justify-between px-5'}`}>
          {desktopCollapsed && <span className="sr-only">MarketFlow</span>}
          <Logo className={`sidebar-logo h-8 w-auto ${desktopCollapsed ? 'sidebar-logo-collapsed' : ''}`} />
          <button
            ref={mobileCloseButtonRef}
            type="button"
            onClick={onCloseMobile}
            className="app-sidebar-mobile-close rounded-lg p-1.5 transition-colors focus-visible:outline-none focus-visible:ring-2 lg:hidden"
            aria-label="Close navigation menu"
            tabIndex={isMobileViewport && !isMobileOpen ? -1 : 0}
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={onToggleCollapse}
            className="app-sidebar-collapse hidden h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 lg:flex"
            aria-label={desktopCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-expanded={!desktopCollapsed}
            aria-controls="app-sidebar-navigation"
            title={desktopCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {desktopCollapsed
              ? <ChevronRight className="h-4 w-4" aria-hidden="true" />
              : <ChevronLeft className="h-4 w-4" aria-hidden="true" />}
          </button>
        </div>

        <div
          id="app-sidebar-navigation"
          className="app-sidebar-navigation min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-4"
          tabIndex={-1}
        >
          <div className="space-y-5">
            {navSections.map((section) => (
              <div key={section.title}>
                <h2 className={`app-sidebar-section-heading mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.12em] ${
                  desktopCollapsed ? 'sr-only' : ''
                }`}>
                  {section.title}
                </h2>
                <nav aria-label={section.title} className="space-y-1">
                  {section.items.map((item) => {
                    const Icon = item.icon;
                    const isProjectsActive = item.to === '/projects' && location.pathname.startsWith('/projects');
                    const isStrategiesActive = item.to === '/strategies' && location.pathname.startsWith('/strategies');
                    const isSettingsActive = item.to === '/settings'
                      && (location.pathname.startsWith('/settings') || location.pathname.startsWith('/profile'));
                    const isCrmActive = item.to === '/crm' && location.pathname.startsWith('/crm');

                    return (
                      <NavLink
                        key={item.label}
                        to={item.to}
                        end={item.to === '/'}
                        onClick={onCloseMobile}
                        onMouseEnter={() => prefetchRoute(item.to, currentWorkspace?.id)}
                        onFocus={() => prefetchRoute(item.to, currentWorkspace?.id)}
                        title={desktopCollapsed ? item.label : undefined}
                        aria-label={item.label}
                        tabIndex={!isMobileOpen && isMobileViewport ? -1 : undefined}
                        className={({ isActive }) => {
                          const active = isActive || isProjectsActive || isStrategiesActive || isSettingsActive || isCrmActive;
                          return `app-sidebar-link group relative flex min-h-10 items-center rounded-lg text-sm font-medium transition-colors ${
                            desktopCollapsed ? 'justify-center px-0' : 'gap-3 px-3'
                          }`
                            + (active ? ' app-sidebar-link-active' : '');
                        }}
                      >
                        {({ isActive }) => {
                          const active = isActive || isProjectsActive || isStrategiesActive || isSettingsActive || isCrmActive;
                          return (
                            <>
                              {active && <span className="app-sidebar-active-mark absolute inset-y-2 left-0 w-1 rounded-r-md" aria-hidden="true" />}
                              <Icon className="app-sidebar-icon h-[18px] w-[18px] shrink-0" aria-hidden="true" />
                              <span className={desktopCollapsed ? 'sr-only' : 'truncate'}>{item.label}</span>
                            </>
                          );
                        }}
                      </NavLink>
                    );
                  })}
                </nav>
              </div>
            ))}
          </div>
        </div>
      </aside>
    </>
  );
};
