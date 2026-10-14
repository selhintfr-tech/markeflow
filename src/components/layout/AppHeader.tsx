import React, { useState, useRef, useEffect } from 'react';
import { Search, ChevronDown, User, Settings, LogOut, Menu } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { WorkspaceSelector } from './WorkspaceSelector';
import { NotificationBell } from '../notifications/NotificationBell';
import { currentUser } from '../../data/mock';

interface AppHeaderProps {
  onToggleMobileSidebar?: () => void;
  isMobileSidebarOpen?: boolean;
}

export const AppHeader: React.FC<AppHeaderProps> = ({
  onToggleMobileSidebar,
  isMobileSidebarOpen = false,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

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
    <header className="h-16 px-4 sm:px-6 lg:px-8 flex items-center justify-between border-b border-[#E2E8F0] bg-white sticky top-0 z-30">
      {/* Left: Mobile hamburger + Workspace dropdown */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onToggleMobileSidebar}
          className="lg:hidden p-2 -ml-1 rounded-lg text-[#64748B] hover:text-[#1E1B4B] hover:bg-slate-100 transition-colors focus:outline-none focus:ring-2 focus:ring-[#6D28D9]/20"
          aria-label="Toggle navigation menu"
          aria-expanded={isMobileSidebarOpen}
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
            className="w-full pl-9 pr-4 py-1.5 rounded-lg border border-[#E2E8F0] bg-[#F8F7FC] text-sm text-[#1E1B4B] placeholder-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#6D28D9]/20 focus:border-[#6D28D9] transition-all"
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
            {/* User Initials Avatar badge */}
            <div className="w-9 h-9 rounded-full bg-[#EDE9FE] text-[#6D28D9] flex items-center justify-center font-semibold text-xs tracking-wide border border-[#DDD6FE]">
              {currentUser.initials}
            </div>
            <span className="hidden sm:inline text-sm font-medium text-[#1E1B4B]">
              {currentUser.name}
            </span>
            <ChevronDown className={`w-3.5 h-3.5 text-[#94A3B8] stroke-[2.2] transition-transform ${isUserMenuOpen ? 'rotate-180' : ''}`} />
          </button>

          {/* User dropdown menu */}
          {isUserMenuOpen && (
            <div
              role="menu"
              className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-[#E2E8F0] py-1.5 z-50 animate-in fade-in zoom-in-95 duration-100"
            >
              <div className="px-4 py-2 border-b border-[#F1F5F9]">
                <p className="text-xs font-semibold text-[#1E1B4B]">{currentUser.name}</p>
                <p className="text-[11px] text-[#64748B] truncate">{currentUser.email}</p>
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
                onClick={() => {
                  setIsUserMenuOpen(false);
                  navigate('/profile');
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
