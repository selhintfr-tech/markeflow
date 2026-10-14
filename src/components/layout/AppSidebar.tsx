import React from 'react';
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
  CreditCard,
  Percent,
  BarChart3,
  FileText,
  ArrowLeftRight,
  Archive,
  Settings,
} from 'lucide-react';
import { Logo } from '../ui/Logo';

interface NavItem {
  label: string;
  to: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

const navSections: NavSection[] = [
  {
    title: 'Overview',
    items: [
      { label: 'Dashboard', to: '/', icon: Home },
    ],
  },
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
  {
    title: 'System',
    items: [
      { label: 'Archive', to: '/archive', icon: Archive },
      { label: 'Settings', to: '/settings', icon: Settings },
    ],
  },
];

export const AppSidebar: React.FC = () => {
  const location = useLocation();
  return (
    <aside className="w-64 min-w-[16rem] bg-white border-r border-[#E2E8F0] flex flex-col h-screen sticky top-0 shrink-0">
      {/* Brand Header */}
      <div className="h-16 px-6 flex items-center border-b border-[#E2E8F0]">
        <Logo />
      </div>

      {/* Navigation Sections */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-6">
        {navSections.map((section) => (
          <div key={section.title}>
            <div className="px-3 pb-2 text-[11px] font-semibold text-[#94A3B8] uppercase tracking-wider">
              {section.title}
            </div>
            <nav className="space-y-1">
              {section.items.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.label}
                    to={item.to}
                    end={item.to === '/'}
                    className={({ isActive }) => {
                      // Keep Projects, Strategies and Settings sidebar item highlighted when viewing nested routes
                      const isProjectsActive = item.to === '/projects' && location.pathname.startsWith('/projects');
                      const isStrategiesActive = item.to === '/strategies' && location.pathname.startsWith('/strategies');
                      const isSettingsActive = item.to === '/settings' && (location.pathname.startsWith('/settings') || location.pathname.startsWith('/profile'));
                      const active = isActive || isProjectsActive || isStrategiesActive || isSettingsActive;
                      return `relative flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors group ${
                        active
                          ? 'bg-[#F5F3FF] text-[#6D28D9] font-semibold'
                          : 'text-[#64748B] hover:text-[#1E1B4B] hover:bg-slate-50'
                      }`;
                    }}
                  >
                    {({ isActive }) => {
                      const isProjectsActive = item.to === '/projects' && location.pathname.startsWith('/projects');
                      const isStrategiesActive = item.to === '/strategies' && location.pathname.startsWith('/strategies');
                      const isSettingsActive = item.to === '/settings' && (location.pathname.startsWith('/settings') || location.pathname.startsWith('/profile'));
                      const active = isActive || isProjectsActive || isStrategiesActive || isSettingsActive;
                      return (
                        <>
                          {/* Active vertical purple bar marker indicator on the left */}
                          {active && (
                            <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-[#6D28D9] rounded-r-md" />
                          )}
                          <Icon
                            className={`w-4 h-4 shrink-0 transition-colors ${
                              active
                                ? 'text-[#6D28D9]'
                                : 'text-[#94A3B8] group-hover:text-[#64748B]'
                            }`}
                          />
                          <span className="truncate">{item.label}</span>
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
    </aside>
  );
};
