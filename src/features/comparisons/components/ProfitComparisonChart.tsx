import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LabelList,
  Cell,
} from 'recharts';
import type { CampaignComparisonMetrics } from '../../../types';

interface ProfitComparisonChartProps {
  campaignA: CampaignComparisonMetrics;
  campaignB: CampaignComparisonMetrics;
}

export const ProfitComparisonChart: React.FC<ProfitComparisonChartProps> = ({
  campaignA,
  campaignB,
}) => {
  const data = [
    {
      name: campaignA.name,
      profit: campaignA.profit,
      color: '#0D9488', // Deep teal
    },
    {
      name: campaignB.name,
      profit: campaignB.profit,
      color: '#5EEAD4', // Light teal matching screenshot
    },
  ];

  const maxVal = Math.max(campaignA.profit, campaignB.profit, 3000);
  const yUpper = Math.ceil(maxVal / 500) * 500;

  return (
    <div className="bg-white rounded-xl border border-[#E2E8F0] p-5 shadow-2xs flex flex-col justify-between h-full">
      {/* Title & Subtitle */}
      <div>
        <h3 className="text-sm font-bold text-[#1E1B4B]">Estimated Profit Comparison</h3>
        <p className="text-xs text-[#64748B] mt-0.5">
          Estimated profit (revenue minus recorded costs).
        </p>
      </div>

      {/* Chart container */}
      <div className="h-56 w-full mt-4">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            margin={{ top: 20, right: 10, left: -15, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
            <XAxis
              dataKey="name"
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#64748B', fontSize: 11 }}
            />
            <YAxis
              domain={[0, yUpper]}
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#94A3B8', fontSize: 10 }}
              tickFormatter={(v: number) => v.toLocaleString()}
            />
            <Tooltip
              formatter={(value: any) => [`${Number(value).toLocaleString()} MAD`, 'Estimated Profit']}
              contentStyle={{
                backgroundColor: '#1E1B4B',
                borderRadius: '8px',
                border: 'none',
                color: '#FFFFFF',
                fontSize: '12px',
              }}
            />
            <Bar dataKey="profit" radius={[4, 4, 0, 0]} barSize={50}>
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
              <LabelList
                dataKey="profit"
                position="top"
                fill="#1E1B4B"
                fontSize={10}
                fontWeight={600}
                formatter={(val: any) => Number(val).toLocaleString()}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-5 mt-3 text-xs pt-2 border-t border-[#F8FAFC]">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-[#0D9488]" />
          <span className="text-[#64748B] text-[11px] font-medium">Estimated Profit (MAD)</span>
        </div>
      </div>
    </div>
  );
};
