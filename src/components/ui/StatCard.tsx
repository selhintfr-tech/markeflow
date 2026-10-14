import React from 'react';
import { ChevronRight, TrendingUp } from 'lucide-react';

interface StatCardProps {
  icon: React.ReactNode;
  iconBgColor?: string;
  title: string;
  value: string | number;
  changePercentage: number;
  changeLabel?: string;
  onClick?: () => void;
}

export const StatCard: React.FC<StatCardProps> = ({
  icon,
  iconBgColor = 'bg-[#EDE9FE] text-[#6D28D9]',
  title,
  value,
  changePercentage,
  changeLabel = 'from last month',
  onClick,
}) => {
  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-xl border border-[#E2E8F0] p-5 shadow-xs hover:shadow-md transition-all ${
        onClick ? 'cursor-pointer hover:border-[#CBD5E1]' : ''
      }`}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3.5">
          <div className={`p-2.5 rounded-xl ${iconBgColor} shrink-0`}>
            {icon}
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-medium text-[#64748B]">{title}</span>
              <ChevronRight className="w-3.5 h-3.5 text-[#94A3B8]" />
            </div>
          </div>
        </div>
      </div>

      <div className="mt-3">
        <div className="text-2xl font-bold tracking-tight text-[#1E1B4B]">
          {value}
        </div>

        <div className="flex items-center gap-1.5 mt-2 text-xs">
          <span className="inline-flex items-center text-[#0D9488] font-semibold">
            <TrendingUp className="w-3.5 h-3.5 mr-1 stroke-[2.5]" />
            {changePercentage > 0 ? `+${changePercentage}%` : `${changePercentage}%`}
          </span>
          <span className="text-[#94A3B8]">{changeLabel}</span>
        </div>
      </div>
    </div>
  );
};
