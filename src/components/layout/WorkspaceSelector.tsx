import React, { useState, useRef, useEffect } from 'react';
import { Building2, ChevronDown, Check, Users } from 'lucide-react';
import { useWorkspace } from '../../context/WorkspaceContext';

export const WorkspaceSelector: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { currentWorkspace, setCurrentWorkspace, workspaces } = useWorkspace();
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2.5 px-3.5 py-1.5 rounded-lg border border-[#E2E8F0] bg-white hover:bg-slate-50 transition-colors shadow-xs text-sm font-medium text-[#1E1B4B]"
      >
        <Building2 className="w-4 h-4 text-[#64748B]" />
        <span className="truncate max-w-[150px]">{currentWorkspace.name}</span>
        <ChevronDown className="w-3.5 h-3.5 text-[#94A3B8] stroke-[2.2]" />
      </button>

      {isOpen && (
        <div className="absolute left-0 mt-1.5 w-60 rounded-lg bg-white border border-[#E2E8F0] shadow-lg py-1 z-50 animate-in fade-in zoom-in-95 duration-100">
          <div className="px-3.5 py-1.5 text-[11px] font-semibold text-[#94A3B8] uppercase tracking-wider">
            Workspaces
          </div>
          {workspaces.map((workspace) => (
            <button
              key={workspace.id}
              onClick={() => {
                setCurrentWorkspace(workspace);
                setIsOpen(false);
              }}
              className="w-full flex items-center justify-between px-3.5 py-2 text-sm text-left hover:bg-[#F5F3FF] text-[#1E1B4B] transition-colors"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                {workspace.iconType === 'users' ? (
                  <Users className="w-4 h-4 text-[#9333EA] shrink-0" />
                ) : (
                  <Building2 className="w-4 h-4 text-[#6D28D9] shrink-0" />
                )}
                <span className="truncate font-medium">{workspace.name}</span>
              </div>
              {currentWorkspace.id === workspace.id && (
                <Check className="w-4 h-4 text-[#6D28D9] shrink-0 ml-2" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
