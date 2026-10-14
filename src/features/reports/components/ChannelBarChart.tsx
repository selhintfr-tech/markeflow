import React from 'react';
import type { ChannelPerformance } from '../types';

interface ChannelBarChartProps {
  data: ChannelPerformance[];
}

export const ChannelBarChart: React.FC<ChannelBarChartProps> = ({ data }) => {
  const maxValue = Math.max(...data.map((d) => d.value), 2400);

  return (
    <div className="space-y-3 py-1">
      {data.map((item) => {
        const percentage = Math.round((item.value / maxValue) * 100);
        return (
          <div key={item.channel} className="flex items-center gap-2.5">
            <span className="text-xs text-[#64748B] w-16 shrink-0 truncate">
              {item.channel}
            </span>
            <div className="flex-1 bg-[#F1F5F9] h-3.5 rounded-full overflow-hidden flex items-center p-0.5">
              <div
                className="bg-gradient-to-r from-[#8B5CF6] to-[#6D28D9] h-full rounded-full transition-all duration-500"
                style={{ width: `${percentage}%` }}
              />
            </div>
            <span className="text-xs font-bold text-[#1E1B4B] w-12 text-right shrink-0">
              {item.value.toLocaleString()}
            </span>
          </div>
        );
      })}
    </div>
  );
};
