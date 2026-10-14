import React from 'react';
import { ChevronDown } from 'lucide-react';
import { budgetUtilizationData } from '../../../data/mock';

export const BudgetUtilizationCard: React.FC = () => {
  const { spent, allocated, percentage, currency } = budgetUtilizationData;

  // SVG circular progress calculation
  // Radius = 62, Circumference = 2 * PI * 62 = ~389.56
  const radius = 62;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className="bg-white rounded-xl border border-[#E2E8F0] p-6 shadow-xs flex flex-col justify-between">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-[#1E1B4B]">
            Budget utilization
          </h2>
          <p className="text-xs text-[#64748B] mt-0.5">
            Overall spend across all campaigns.
          </p>
        </div>

        <button
          type="button"
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[#E2E8F0] bg-white text-xs font-medium text-[#1E1B4B] hover:bg-slate-50 shadow-2xs"
        >
          <span>This month</span>
          <ChevronDown className="w-3.5 h-3.5 text-[#94A3B8]" />
        </button>
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
              stroke="#6D28D9"
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
              {percentage}%
            </span>
            <span className="text-xs text-[#64748B] font-medium mt-0.5">
              of budget used
            </span>
          </div>
        </div>
      </div>

      {/* Bottom Spend vs Allocated details */}
      <div className="flex items-center justify-between pt-3 border-t border-[#F1F5F9]">
        <div>
          <span className="text-xs text-[#64748B] block">Spent</span>
          <span className="text-base font-bold text-[#1E1B4B]">
            {spent.toLocaleString()} {currency}
          </span>
        </div>
        <div className="text-right">
          <span className="text-xs text-[#64748B] block">Allocated Budget</span>
          <span className="text-base font-bold text-[#1E1B4B]">
            {allocated.toLocaleString()} {currency}
          </span>
        </div>
      </div>
    </div>
  );
};
