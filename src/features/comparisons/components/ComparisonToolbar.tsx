import React, { useState, useRef, useEffect } from 'react';
import {
  Building2,
  Megaphone,
  ArrowLeftRight,
  Calendar,
  Scale,
  ChevronDown,
} from 'lucide-react';
import { useWorkspace } from '../../../context/WorkspaceContext';
import type { CampaignComparisonMetrics } from '../../../types';

interface ComparisonToolbarProps {
  availableCampaigns: CampaignComparisonMetrics[];
  selectedCampaignAId: string;
  selectedCampaignBId: string;
  selectedDateRange: string;
  onCampaignAChange: (id: string) => void;
  onCampaignBChange: (id: string) => void;
  onDateRangeChange: (dateRange: string) => void;
  onCompare: () => void;
}

const DATE_RANGE_OPTIONS = [
  '01 Oct 2026 - 31 Oct 2026',
  'Q3 2026 (Jul - Sep)',
  'Q2 2026 (Apr - Jun)',
  'Full Year 2026',
];

export const ComparisonToolbar: React.FC<ComparisonToolbarProps> = ({
  availableCampaigns,
  selectedCampaignAId,
  selectedCampaignBId,
  selectedDateRange,
  onCampaignAChange,
  onCampaignBChange,
  onDateRangeChange,
  onCompare,
}) => {
  const { workspaces, currentWorkspace, setCurrentWorkspace } = useWorkspace();

  const [isWorkspaceOpen, setIsWorkspaceOpen] = useState(false);
  const [isCampaignAOpen, setIsCampaignAOpen] = useState(false);
  const [isCampaignBOpen, setIsCampaignBOpen] = useState(false);
  const [isDateRangeOpen, setIsDateRangeOpen] = useState(false);

  const wsRef = useRef<HTMLDivElement>(null);
  const campARef = useRef<HTMLDivElement>(null);
  const campBRef = useRef<HTMLDivElement>(null);
  const dateRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (wsRef.current && !wsRef.current.contains(target)) setIsWorkspaceOpen(false);
      if (campARef.current && !campARef.current.contains(target)) setIsCampaignAOpen(false);
      if (campBRef.current && !campBRef.current.contains(target)) setIsCampaignBOpen(false);
      if (dateRef.current && !dateRef.current.contains(target)) setIsDateRangeOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const campaignA = availableCampaigns.find((c) => c.id === selectedCampaignAId);
  const campaignB = availableCampaigns.find((c) => c.id === selectedCampaignBId);

  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* 1. Workspace Selector Dropdown */}
      <div className="relative" ref={wsRef}>
        <button
          type="button"
          onClick={() => {
            setIsWorkspaceOpen(!isWorkspaceOpen);
            setIsCampaignAOpen(false);
            setIsCampaignBOpen(false);
            setIsDateRangeOpen(false);
          }}
          className="flex items-center gap-2.5 px-3.5 py-2 rounded-lg border border-[#E2E8F0] bg-white hover:bg-slate-50 text-xs font-medium text-[#1E1B4B] shadow-2xs transition-colors cursor-pointer"
        >
          <Building2 className="w-4 h-4 text-[#64748B] shrink-0" />
          <span className="truncate max-w-[140px] font-medium">{currentWorkspace.name}</span>
          <ChevronDown className="w-3.5 h-3.5 text-[#94A3B8] stroke-[2.2] shrink-0" />
        </button>

        {isWorkspaceOpen && (
          <div className="absolute left-0 mt-1.5 w-56 rounded-lg bg-white border border-[#E2E8F0] shadow-lg py-1 z-30 animate-in fade-in zoom-in-95 duration-100">
            <div className="px-3 py-1.5 text-[10px] font-semibold text-[#94A3B8] uppercase tracking-wider">
              Workspaces
            </div>
            {workspaces.map((ws) => (
              <button
                key={ws.id}
                type="button"
                onClick={() => {
                  setCurrentWorkspace(ws);
                  setIsWorkspaceOpen(false);
                }}
                className={`w-full flex items-center gap-2 px-3.5 py-2 text-xs text-left transition-colors ${
                  ws.id === currentWorkspace.id
                    ? 'bg-[#F5F3FF] text-[#6D28D9] font-semibold'
                    : 'text-[#1E1B4B] hover:bg-slate-50'
                }`}
              >
                <Building2 className="w-3.5 h-3.5 text-[#6D28D9] shrink-0" />
                <span className="truncate">{ws.name}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 2. Campaign A Selector Dropdown */}
      <div className="relative" ref={campARef}>
        <button
          type="button"
          onClick={() => {
            setIsCampaignAOpen(!isCampaignAOpen);
            setIsWorkspaceOpen(false);
            setIsCampaignBOpen(false);
            setIsDateRangeOpen(false);
          }}
          className="flex items-center gap-2.5 px-3.5 py-2 rounded-lg border border-[#E2E8F0] bg-white hover:bg-slate-50 text-xs font-medium text-[#1E1B4B] shadow-2xs transition-colors cursor-pointer"
        >
          <Megaphone className="w-4 h-4 text-[#6D28D9] shrink-0" />
          <span className="truncate max-w-[150px] font-medium">
            {campaignA?.name || 'Select Campaign A'}
          </span>
          <ChevronDown className="w-3.5 h-3.5 text-[#94A3B8] stroke-[2.2] shrink-0" />
        </button>

        {isCampaignAOpen && (
          <div className="absolute left-0 mt-1.5 w-60 rounded-lg bg-white border border-[#E2E8F0] shadow-lg py-1 z-30 animate-in fade-in zoom-in-95 duration-100">
            <div className="px-3 py-1.5 text-[10px] font-semibold text-[#94A3B8] uppercase tracking-wider">
              Campaign A
            </div>
            {availableCampaigns.map((c) => {
              const isSelectedB = c.id === selectedCampaignBId;
              const isSelectedA = c.id === selectedCampaignAId;
              return (
                <button
                  key={c.id}
                  type="button"
                  disabled={isSelectedB}
                  onClick={() => {
                    onCampaignAChange(c.id);
                    setIsCampaignAOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3.5 py-2 text-xs text-left transition-colors ${
                    isSelectedB
                      ? 'text-[#CBD5E1] cursor-not-allowed bg-slate-50/50'
                      : isSelectedA
                      ? 'bg-[#F5F3FF] text-[#6D28D9] font-semibold'
                      : 'text-[#1E1B4B] hover:bg-slate-50'
                  }`}
                >
                  <span className="truncate">{c.name}</span>
                  {isSelectedB && <span className="text-[10px] text-[#94A3B8] ml-2">(Campaign B)</span>}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* 3. Comparison Direction Icon */}
      <div className="text-[#94A3B8] flex items-center justify-center px-0.5">
        <ArrowLeftRight className="w-4 h-4" />
      </div>

      {/* 4. Campaign B Selector Dropdown */}
      <div className="relative" ref={campBRef}>
        <button
          type="button"
          onClick={() => {
            setIsCampaignBOpen(!isCampaignBOpen);
            setIsWorkspaceOpen(false);
            setIsCampaignAOpen(false);
            setIsDateRangeOpen(false);
          }}
          className="flex items-center gap-2.5 px-3.5 py-2 rounded-lg border border-[#E2E8F0] bg-white hover:bg-slate-50 text-xs font-medium text-[#1E1B4B] shadow-2xs transition-colors cursor-pointer"
        >
          <Megaphone className="w-4 h-4 text-[#6D28D9] shrink-0" />
          <span className="truncate max-w-[150px] font-medium">
            {campaignB?.name || 'Select Campaign B'}
          </span>
          <ChevronDown className="w-3.5 h-3.5 text-[#94A3B8] stroke-[2.2] shrink-0" />
        </button>

        {isCampaignBOpen && (
          <div className="absolute left-0 mt-1.5 w-60 rounded-lg bg-white border border-[#E2E8F0] shadow-lg py-1 z-30 animate-in fade-in zoom-in-95 duration-100">
            <div className="px-3 py-1.5 text-[10px] font-semibold text-[#94A3B8] uppercase tracking-wider">
              Campaign B
            </div>
            {availableCampaigns.map((c) => {
              const isSelectedA = c.id === selectedCampaignAId;
              const isSelectedB = c.id === selectedCampaignBId;
              return (
                <button
                  key={c.id}
                  type="button"
                  disabled={isSelectedA}
                  onClick={() => {
                    onCampaignBChange(c.id);
                    setIsCampaignBOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3.5 py-2 text-xs text-left transition-colors ${
                    isSelectedA
                      ? 'text-[#CBD5E1] cursor-not-allowed bg-slate-50/50'
                      : isSelectedB
                      ? 'bg-[#F5F3FF] text-[#6D28D9] font-semibold'
                      : 'text-[#1E1B4B] hover:bg-slate-50'
                  }`}
                >
                  <span className="truncate">{c.name}</span>
                  {isSelectedA && <span className="text-[10px] text-[#94A3B8] ml-2">(Campaign A)</span>}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* 5. Date Range Selector Dropdown */}
      <div className="relative" ref={dateRef}>
        <button
          type="button"
          onClick={() => {
            setIsDateRangeOpen(!isDateRangeOpen);
            setIsWorkspaceOpen(false);
            setIsCampaignAOpen(false);
            setIsCampaignBOpen(false);
          }}
          className="flex items-center gap-2.5 px-3.5 py-2 rounded-lg border border-[#E2E8F0] bg-white hover:bg-slate-50 text-xs font-medium text-[#1E1B4B] shadow-2xs transition-colors cursor-pointer"
        >
          <Calendar className="w-4 h-4 text-[#64748B] shrink-0" />
          <span className="truncate max-w-[170px] font-medium">{selectedDateRange}</span>
          <ChevronDown className="w-3.5 h-3.5 text-[#94A3B8] stroke-[2.2] shrink-0" />
        </button>

        {isDateRangeOpen && (
          <div className="absolute right-0 sm:left-0 mt-1.5 w-56 rounded-lg bg-white border border-[#E2E8F0] shadow-lg py-1 z-30 animate-in fade-in zoom-in-95 duration-100">
            <div className="px-3 py-1.5 text-[10px] font-semibold text-[#94A3B8] uppercase tracking-wider">
              Date Period
            </div>
            {DATE_RANGE_OPTIONS.map((range) => (
              <button
                key={range}
                type="button"
                onClick={() => {
                  onDateRangeChange(range);
                  setIsDateRangeOpen(false);
                }}
                className={`w-full px-3.5 py-2 text-xs text-left transition-colors ${
                  range === selectedDateRange
                    ? 'bg-[#F5F3FF] text-[#6D28D9] font-semibold'
                    : 'text-[#1E1B4B] hover:bg-slate-50'
                }`}
              >
                {range}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 6. Compare Button */}
      <button
        type="button"
        onClick={onCompare}
        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#6D28D9] hover:bg-[#5B21B6] text-white text-xs font-semibold shadow-xs hover:shadow-md transition-all cursor-pointer"
      >
        <Scale className="w-4 h-4 stroke-[2.2]" />
        <span>Compare</span>
      </button>
    </div>
  );
};
