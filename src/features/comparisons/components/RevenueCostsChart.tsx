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
} from 'recharts';
import type { CampaignComparisonMetrics } from '../../../types';

interface RevenueCostsChartProps {
  campaignA: CampaignComparisonMetrics;
  campaignB: CampaignComparisonMetrics;
}

export const RevenueCostsChart: React.FC<RevenueCostsChartProps> = ({
  campaignA,
  campaignB,
}) => {
  const data = [
    {
      name: campaignA.name,
      revenue: campaignA.revenue,
      costs: campaignA.totalCosts,
    },
    {
      name: campaignB.name,
      revenue: campaignB.revenue,
      costs: campaignB.totalCosts,
    },
  ];

  // Calculate maximum for dynamic domain with clean ceiling
  const maxVal = Math.max(campaignA.revenue, campaignB.revenue, 16000);
  const yUpper = Math.ceil(maxVal / 2000) * 2000;

  return (
    <div className="bg-white rounded-xl border border-[#E2E8F0] p-5 shadow-2xs flex flex-col justify-between h-full">
      {/* Title & Subtitle */}
      <div>
        <h3 className="text-sm font-bold text-[#1E1B4B]">Revenue vs. Costs Comparison</h3>
        <p className="text-xs text-[#64748B] mt-0.5">
          Recorded revenue and total recorded costs for both campaigns.
        </p>
      </div>

      {/* Chart container */}
      <div className="h-56 w-full mt-4">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            margin={{ top: 20, right: 10, left: -15, bottom: 0 }}
            barGap={8}
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
              formatter={(value: any, name: any) => [
                `${Number(value).toLocaleString()} MAD`,
                name === 'revenue' ? 'Revenue' : 'Total Recorded Costs',
              ]}
              contentStyle={{
                backgroundColor: '#1E1B4B',
                borderRadius: '8px',
                border: 'none',
                color: '#FFFFFF',
                fontSize: '12px',
              }}
            />
            <Bar dataKey="revenue" fill="#6D28D9" radius={[4, 4, 0, 0]} barSize={42}>
              <LabelList
                dataKey="revenue"
                position="top"
                fill="#1E1B4B"
                fontSize={10}
                fontWeight={600}
                formatter={(val: any) => Number(val).toLocaleString()}
              />
            </Bar>
            <Bar dataKey="costs" fill="#C4B5FD" radius={[4, 4, 0, 0]} barSize={42}>
              <LabelList
                dataKey="costs"
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
          <span className="w-2.5 h-2.5 rounded-full bg-[#6D28D9]" />
          <span className="text-[#64748B] text-[11px] font-medium">Revenue (MAD)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-[#C4B5FD]" />
          <span className="text-[#64748B] text-[11px] font-medium">Total Recorded Costs (MAD)</span>
        </div>
      </div>
    </div>
  );
};
