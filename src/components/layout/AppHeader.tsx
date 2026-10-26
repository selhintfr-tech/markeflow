import React, { useState, useRef, useEffect } from 'react';
import { Search, ChevronDown, User, Settings, LogOut, Menu } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { WorkspaceSelector } from './WorkspaceSelector';
import { NotificationBell } from '../notifications/NotificationBell';
import { currentUser } from '../../data/mock';
import { useAuth } from '../../context/AuthContext';

interface AppHeaderProps {
  onToggleMobileSidebar?: () => void;
  isMobileSidebarOpen?: boolean;
  mobileMenuButtonRef?: React.RefObject<HTMLButtonElement | null>;
}

export const AppHeader: React.FC<AppHeaderProps> = ({
  onToggleMobileSidebar,
  isMobileSidebarOpen = false,
  mobileMenuButtonRef,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const userName = user?.name || currentUser.name;
  const userEmail = user?.email || currentUser.email;
  const userInitials =
    userName
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0])
      .join('')
      .toUpperCase() || currentUser.initials;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="app-header relative z-30 flex h-16 shrink-0 items-center justify-between border-b px-4 sm:px-6 lg:px-8">
      {/* Left: Mobile hamburger + Workspace dropdown */}
      <div className="flex items-center gap-3">
        <button
          ref={mobileMenuButtonRef}
          type="button"
          onClick={onToggleMobileSidebar}
          className="app-header-menu-button -ml-1 rounded-lg p-2 transition-colors focus-visible:outline-none focus-visible:ring-2 lg:hidden"
          aria-label={isMobileSidebarOpen ? 'Close navigation menu' : 'Open navigation menu'}
          aria-expanded={isMobileSidebarOpen}
          aria-controls="app-sidebar"
        >
          <Menu className="w-5 h-5" />
        </button>
        <WorkspaceSelector />
      </div>

      {/* Middle: Global Search Input (responsive hidden on small screens) */}
      <div className="hidden md:block flex-1 max-w-lg mx-4 lg:mx-8">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-[#94A3B8]" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search campaigns, projects, leads..."
            className="app-header-search w-full rounded-lg border py-1.5 pl-9 pr-4 text-sm transition-all focus:border-[#6D28D9] focus:outline-none focus:ring-2 focus:ring-[#6D28D9]/20"
          />
        </div>
      </div>

      {/* Right: Integrated Notifications Bell & User profile */}
      <div className="flex items-center gap-3 sm:gap-4">
        <NotificationBell />

        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => setIsUserMenuOpen((prev) => !prev)}
            className="flex items-center gap-2.5 cursor-pointer select-none hover:opacity-90 transition-opacity focus:outline-none focus:ring-2 focus:ring-[#6D28D9]/20 rounded-full"
            aria-expanded={isUserMenuOpen}
            aria-haspopup="menu"
            aria-label="User account menu"
          >
            {/* User Avatar badge */}
            <div className="relative w-9 h-9 rounded-full bg-[#EDE9FE] text-[#6D28D9] flex items-center justify-center font-semibold text-xs tracking-wide border border-[#DDD6FE] overflow-hidden">
              {userInitials}
              {user?.avatar_url && (
                <img
                  key={user.avatar_url}
                  src={user.avatar_url}
                  alt=""
                  aria-hidden="true"
                  onError={(event) => {
                    event.currentTarget.style.display = 'none';
                  }}
                  className="absolute inset-0 w-full h-full object-cover"
                />
              )}
            </div>
            <span className="hidden sm:inline text-sm font-medium text-[#1E1B4B]">
              {userName}
            </span>
            <ChevronDown className={`w-3.5 h-3.5 text-[#94A3B8] stroke-[2.2] transition-transform ${isUserMenuOpen ? 'rotate-180' : ''}`} />
          </button>

          {/* User dropdown menu */}
          {isUserMenuOpen && (
            <div
              role="menu"
              className="app-header-menu absolute right-0 z-50 mt-2 w-56 rounded-xl border py-1.5 shadow-lg animate-in fade-in zoom-in-95 duration-100"
            >
              <div className="px-4 py-2 border-b border-[#F1F5F9]">
                <p className="text-xs font-semibold text-[#1E1B4B]">{userName}</p>
                <p className="text-[11px] text-[#64748B] truncate">{userEmail}</p>
              </div>

              <Link
                to="/profile"
                role="menuitem"
                onClick={() => setIsUserMenuOpen(false)}
                className="flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-[#1E1B4B] hover:bg-[#F5F3FF] hover:text-[#6D28D9] transition-colors"
              >
                <User className="w-4 h-4 text-[#6D28D9]" />
                <span>My Profile</span>
              </Link>

              <Link
                to="/settings"
                role="menuitem"
                onClick={() => setIsUserMenuOpen(false)}
                className="flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-[#64748B] hover:bg-slate-50 hover:text-[#1E1B4B] transition-colors"
              >
                <Settings className="w-4 h-4 text-[#94A3B8]" />
                <span>Settings</span>
              </Link>

              <div className="my-1 border-t border-[#F1F5F9]" />

              <button
                type="button"
                role="menuitem"
                onClick={async () => {
                  setIsUserMenuOpen(false);
                  await logout();
                  navigate('/login', { replace: true });
                }}
                className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-[#EF4444] hover:bg-red-50 transition-colors text-left"
              >
                <LogOut className="w-4 h-4" />
                <span>Sign Out</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
