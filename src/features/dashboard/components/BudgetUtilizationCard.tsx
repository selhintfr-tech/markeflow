import React from 'react';
import { Loader2 } from 'lucide-react';
import type { AnalyticsOverview } from '../dashboardService';

interface BudgetUtilizationCardProps {
  overview: AnalyticsOverview | null;
  loading: boolean;
  selectedPeriod: string;
}

export const BudgetUtilizationCard: React.FC<BudgetUtilizationCardProps> = ({
  overview,
  loading,
  selectedPeriod,
}) => {
  const spent = Number(
    overview?.advertising?.workspace_total_spend ??
    overview?.advertising?.spend ??
    overview?.campaign_financials?.spend ??
    overview?.finance?.expenses ??
    0
  );
  const allocated = Number(
    overview?.advertising?.budget ??
    overview?.campaign_financials?.budget ??
    overview?.finance?.budgeted_expenses ??
    0
  );

  const percentage = allocated > 0 ? Math.round((spent / allocated) * 100) : 0;
  const currency = 'MAD';

  // SVG circular progress calculation
  // Radius = 62, Circumference = 2 * PI * 62 = ~389.56
  const radius = 62;
  const circumference = 2 * Math.PI * radius;
  const cappedPercentage = Math.min(percentage, 100);
  const strokeDashoffset = circumference - (cappedPercentage / 100) * circumference;

  const hasData = Boolean(overview?.advertising || overview?.campaign_financials || overview?.finance);

  return (
    <div className="bg-white rounded-xl border border-[#E2E8F0] p-6 shadow-xs flex flex-col justify-between min-h-[360px] relative">
      {loading && (
        <div className="absolute inset-0 bg-white/70 backdrop-blur-2xs flex items-center justify-center z-10 rounded-xl">
          <Loader2 className="w-6 h-6 text-[#6D28D9] animate-spin" />
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-[#1E1B4B]">
            Budget utilization
          </h2>
          <p className="text-xs text-[#64748B] mt-0.5">
            Recorded advertising spend vs allocated budget.
          </p>
        </div>

        <div className="px-2.5 py-1 rounded-md bg-[#F5F3FF] text-[#6D28D9] text-[11px] font-semibold">
          <span>{selectedPeriod}</span>
        </div>
      </div>

      {/* Circular Gauge / Donut */}
      <div className="flex items-center justify-center my-4 relative">
        <div className="relative w-44 h-44 flex items-center justify-center">
          <svg className="w-full h-full transform -rotate-90" viewBox="0 0 160 160">
            {/* Background ring */}
            <circle
              cx="80"
              cy="80"
              r={radius}
              stroke="#F1F5F9"
              strokeWidth="14"
              fill="transparent"
            />
            {/* Progress ring in purple */}
            <circle
              cx="80"
              cy="80"
              r={radius}
              stroke={percentage > 100 ? '#EF4444' : '#6D28D9'}
              strokeWidth="14"
              fill="transparent"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              className="transition-all duration-1000 ease-out"
            />
          </svg>

          {/* Centered Percentage Label */}
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
            <span className="text-3xl font-extrabold tracking-tight text-[#1E1B4B]">
              {hasData ? `${percentage}%` : '—'}
            </span>
            <span className="text-xs text-[#64748B] font-medium mt-0.5">
              {hasData ? 'of budget used' : 'No budget set'}
            </span>
          </div>
        </div>
      </div>

      {/* Bottom Spend vs Allocated details */}
      <div className="flex items-center justify-between pt-3 border-t border-[#F1F5F9]">
        <div>
          <span className="text-xs text-[#64748B] block">Spent</span>
          <span className="text-base font-bold text-[#1E1B4B]">
            {hasData ? `${spent.toLocaleString(undefined, { minimumFractionDigits: spent % 1 !== 0 ? 2 : 0, maximumFractionDigits: 2 })} ${currency}` : '—'}
          </span>
        </div>
        <div className="text-right">
          <span className="text-xs text-[#64748B] block">Allocated Budget</span>
          <span className="text-base font-bold text-[#1E1B4B]">
            {hasData && allocated > 0 ? `${allocated.toLocaleString()} ${currency}` : '—'}
          </span>
        </div>
      </div>
    </div>
  );
};
