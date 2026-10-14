import React from 'react';
import { Building2, Layers, Tag, Calendar, Search } from 'lucide-react';
import { workspacesList } from '../../../data/mock';

interface ArchiveFiltersProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  selectedWorkspace: string;
  onWorkspaceChange: (ws: string) => void;
  selectedRecordType: string;
  onRecordTypeChange: (type: string) => void;
  selectedStatus: string;
  onStatusChange: (status: string) => void;
  selectedDateRange: string;
  onDateRangeChange: (range: string) => void;
}

export const ArchiveFilters: React.FC<ArchiveFiltersProps> = ({
  searchQuery,
  onSearchChange,
  selectedWorkspace,
  onWorkspaceChange,
  selectedRecordType,
  onRecordTypeChange,
  selectedStatus,
  onStatusChange,
  selectedDateRange,
  onDateRangeChange,
}) => {
  return (
    <div className="flex flex-wrap items-center gap-3 w-full">
      {/* 1. Workspace Dropdown */}
      <div className="relative min-w-[170px]">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#94A3B8]">
          <Building2 className="w-3.5 h-3.5" />
        </div>
        <select
          value={selectedWorkspace}
          onChange={(e) => onWorkspaceChange(e.target.value)}
          className="w-full appearance-none pl-8 pr-8 py-2 bg-white border border-[#E2E8F0] rounded-lg text-xs font-medium text-[#1E1B4B] hover:border-[#CBD5E1] focus:outline-none focus:ring-1 focus:ring-[#6D28D9] focus:border-[#6D28D9] cursor-pointer shadow-2xs"
        >
          <option value="all">All Workspaces</option>
          {workspacesList.map((ws) => (
            <option key={ws.id} value={ws.name}>
              {ws.name}
            </option>
          ))}
        </select>
        <div className="absolute inset-y-0 right-0 pr-2.5 flex items-center pointer-events-none text-[#94A3B8]">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>

      {/* 2. Record Type Dropdown */}
      <div className="relative min-w-[160px]">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#94A3B8]">
          <Layers className="w-3.5 h-3.5" />
        </div>
        <select
          value={selectedRecordType}
          onChange={(e) => onRecordTypeChange(e.target.value)}
          className="w-full appearance-none pl-8 pr-8 py-2 bg-white border border-[#E2E8F0] rounded-lg text-xs font-medium text-[#1E1B4B] hover:border-[#CBD5E1] focus:outline-none focus:ring-1 focus:ring-[#6D28D9] focus:border-[#6D28D9] cursor-pointer shadow-2xs"
        >
          <option value="all">All Record Types</option>
          <option value="Campaign">Campaign</option>
          <option value="Project">Project</option>
          <option value="Report">Report</option>
          <option value="File Bundle">File Bundle</option>
        </select>
        <div className="absolute inset-y-0 right-0 pr-2.5 flex items-center pointer-events-none text-[#94A3B8]">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>

      {/* 3. Status Dropdown */}
      <div className="relative min-w-[140px]">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#94A3B8]">
          <Tag className="w-3.5 h-3.5" />
        </div>
        <select
          value={selectedStatus}
          onChange={(e) => onStatusChange(e.target.value)}
          className="w-full appearance-none pl-8 pr-8 py-2 bg-white border border-[#E2E8F0] rounded-lg text-xs font-medium text-[#1E1B4B] hover:border-[#CBD5E1] focus:outline-none focus:ring-1 focus:ring-[#6D28D9] focus:border-[#6D28D9] cursor-pointer shadow-2xs"
        >
          <option value="all">All Statuses</option>
          <option value="Completed">Completed</option>
          <option value="Archived">Archived</option>
          <option value="On Hold">On Hold</option>
          <option value="Final">Final</option>
        </select>
        <div className="absolute inset-y-0 right-0 pr-2.5 flex items-center pointer-events-none text-[#94A3B8]">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>

      {/* 4. Date Range Selector */}
      <div className="relative min-w-[210px]">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#94A3B8]">
          <Calendar className="w-3.5 h-3.5" />
        </div>
        <select
          value={selectedDateRange}
          onChange={(e) => onDateRangeChange(e.target.value)}
          className="w-full appearance-none pl-8 pr-8 py-2 bg-white border border-[#E2E8F0] rounded-lg text-xs font-medium text-[#1E1B4B] hover:border-[#CBD5E1] focus:outline-none focus:ring-1 focus:ring-[#6D28D9] focus:border-[#6D28D9] cursor-pointer shadow-2xs"
        >
          <option value="01 Jan 2024 - 31 Oct 2026">01 Jan 2024 - 31 Oct 2026</option>
          <option value="Year 2026">Year 2026</option>
          <option value="Year 2025">Year 2025</option>
          <option value="Year 2024">Year 2024</option>
          <option value="All Time">All Time</option>
        </select>
        <div className="absolute inset-y-0 right-0 pr-2.5 flex items-center pointer-events-none text-[#94A3B8]">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>

      {/* 5. Search Field */}
      <div className="relative flex-1 min-w-[200px]">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#94A3B8]">
          <Search className="w-3.5 h-3.5" />
        </div>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search archived records..."
          className="w-full pl-8 pr-4 py-2 bg-white border border-[#E2E8F0] rounded-lg text-xs text-[#1E1B4B] placeholder-[#94A3B8] hover:border-[#CBD5E1] focus:outline-none focus:ring-1 focus:ring-[#6D28D9] focus:border-[#6D28D9] shadow-2xs"
        />
      </div>
    </div>
  );
};
