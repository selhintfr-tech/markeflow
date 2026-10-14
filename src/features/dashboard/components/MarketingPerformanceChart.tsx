import React from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { ChevronDown } from 'lucide-react';
import { marketingPerformanceData } from '../../../data/mock';

export const MarketingPerformanceChart: React.FC = () => {
  return (
    <div className="bg-white rounded-xl border border-[#E2E8F0] p-6 shadow-xs flex flex-col justify-between">
      {/* Header with Title and Dropdown */}
      <div className="flex items-center justify-between mb-2">
        <div>
          <h2 className="text-base font-bold text-[#1E1B4B]">
            Marketing Performance
          </h2>
          <p className="text-xs text-[#64748B] mt-0.5">
            Reach and clicks from your campaigns over time.
          </p>
        </div>

        <button
          type="button"
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[#E2E8F0] bg-white text-xs font-medium text-[#1E1B4B] hover:bg-slate-50 shadow-2xs"
        >
          <span>Reach &amp; Clicks</span>
          <ChevronDown className="w-3.5 h-3.5 text-[#94A3B8]" />
        </button>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-end gap-5 mb-3 text-xs">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-[#6D28D9]" />
          <span className="text-[#64748B] font-medium">Reach</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-[#C4B5FD]" />
          <span className="text-[#64748B] font-medium">Clicks</span>
        </div>
      </div>

      {/* Chart Area */}
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={marketingPerformanceData}
            margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
          >
            <defs>
              <linearGradient id="reachGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#6D28D9" stopOpacity={0.08} />
                <stop offset="95%" stopColor="#6D28D9" stopOpacity={0.0} />
              </linearGradient>
              <linearGradient id="clicksGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#C4B5FD" stopOpacity={0.12} />
                <stop offset="95%" stopColor="#C4B5FD" stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              vertical={false}
              stroke="#F1F5F9"
            />
            <XAxis
              dataKey="date"
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#94A3B8', fontSize: 11 }}
              dy={8}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#94A3B8', fontSize: 11 }}
              tickFormatter={(val) => (val === 0 ? '0' : `${val / 1000}K`)}
              domain={[0, 40000]}
              ticks={[0, 10000, 20000, 30000, 40000]}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#FFFFFF',
                borderRadius: '8px',
                border: '1px solid #E2E8F0',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                fontSize: '12px',
              }}
            />
            <Area
              type="monotone"
              dataKey="reach"
              stroke="#6D28D9"
              strokeWidth={2.2}
              fill="url(#reachGradient)"
              dot={{ r: 3.5, fill: '#6D28D9', strokeWidth: 1, stroke: '#FFFFFF' }}
              activeDot={{ r: 5 }}
            />
            <Area
              type="monotone"
              dataKey="clicks"
              stroke="#C4B5FD"
              strokeWidth={2}
              fill="url(#clicksGradient)"
              dot={{ r: 3, fill: '#C4B5FD', strokeWidth: 1, stroke: '#FFFFFF' }}
              activeDot={{ r: 4 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
