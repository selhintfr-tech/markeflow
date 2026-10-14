import React from 'react';
import { Search, ChevronDown } from 'lucide-react';
import type { ReportFilterState, ReportStatus } from '../types';

interface ReportsToolbarProps {
  filters: ReportFilterState;
  onFiltersChange: (filters: ReportFilterState) => void;
  companies: string[];
}

export const ReportsToolbar: React.FC<ReportsToolbarProps> = ({
  filters,
  onFiltersChange,
  companies,
}) => {
  const [showCompanyDropdown, setShowCompanyDropdown] = React.useState(false);
  const [showStatusDropdown, setShowStatusDropdown] = React.useState(false);

  const statuses: (ReportStatus | 'All')[] = ['All', 'Ready', 'In Review', 'Draft', 'Archived'];

  return (
    <div className="flex items-center gap-3">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94A3B8]" />
        <input
          type="text"
          placeholder="Search reports..."
          value={filters.search}
          onChange={(e) => onFiltersChange({ ...filters, search: e.target.value })}
          className="w-full pl-10 pr-4 py-2 rounded-lg border border-[#E2E8F0] bg-white text-xs text-[#1E1B4B] placeholder:text-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#6D28D9] focus:border-transparent"
        />
      </div>

      <div className="relative">
        <button
          type="button"
          onClick={() => setShowCompanyDropdown(!showCompanyDropdown)}
          className="flex items-center gap-2 px-3.5 py-2 rounded-lg border border-[#E2E8F0] bg-white text-xs font-medium text-[#1E1B4B] hover:bg-slate-50 shadow-2xs transition-colors"
        >
          <span>{filters.company}</span>
          <ChevronDown className="w-3.5 h-3.5 text-[#94A3B8]" />
        </button>

        {showCompanyDropdown && (
          <div className="absolute right-0 mt-1.5 w-48 rounded-lg bg-white border border-[#E2E8F0] shadow-lg py-1 z-40">
            {companies.map((company) => (
              <button
                key={company}
                onClick={() => {
                  onFiltersChange({ ...filters, company });
                  setShowCompanyDropdown(false);
                }}
                className={`w-full text-left px-3.5 py-2 text-xs hover:bg-[#F5F3FF] transition-colors ${
                  filters.company === company
                    ? 'text-[#6D28D9] font-semibold bg-[#F5F3FF]'
                    : 'text-[#1E1B4B]'
                }`}
              >
                {company}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="relative">
        <button
          type="button"
          onClick={() => setShowStatusDropdown(!showStatusDropdown)}
          className="flex items-center gap-2 px-3.5 py-2 rounded-lg border border-[#E2E8F0] bg-white text-xs font-medium text-[#1E1B4B] hover:bg-slate-50 shadow-2xs transition-colors"
        >
          <span>{filters.status === 'All' ? 'All status' : filters.status}</span>
          <ChevronDown className="w-3.5 h-3.5 text-[#94A3B8]" />
        </button>

        {showStatusDropdown && (
          <div className="absolute right-0 mt-1.5 w-40 rounded-lg bg-white border border-[#E2E8F0] shadow-lg py-1 z-40">
            {statuses.map((status) => (
              <button
                key={status}
                onClick={() => {
                  onFiltersChange({ ...filters, status });
                  setShowStatusDropdown(false);
                }}
                className={`w-full text-left px-3.5 py-2 text-xs hover:bg-[#F5F3FF] transition-colors ${
                  filters.status === status
                    ? 'text-[#6D28D9] font-semibold bg-[#F5F3FF]'
                    : 'text-[#1E1B4B]'
                }`}
              >
                {status === 'All' ? 'All status' : status}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
