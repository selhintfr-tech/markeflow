import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import type { PerformanceDataPoint } from '../types';

interface PerformanceLineChartProps {
  data: PerformanceDataPoint[];
}

export const PerformanceLineChart: React.FC<PerformanceLineChartProps> = ({ data }) => {
  return (
    <div className="h-44 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 10, right: 15, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 10, fill: '#64748B' }}
            axisLine={{ stroke: '#E2E8F0' }}
            tickLine={false}
            tickFormatter={(val: string) => {
              const parts = val.split(' ');
              if (parts.length >= 2) {
                const day = parseInt(parts[0], 10);
                return `${day} ${parts[1]}`;
              }
              return val;
            }}
          />
          <YAxis
            domain={[0, 40]}
            ticks={[0, 10, 20, 30, 40]}
            tick={{ fontSize: 10, fill: '#64748B' }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            content={({ active, payload, label }) => {
              if (active && payload && payload.length) {
                return (
                  <div className="bg-white border border-[#E2E8F0] rounded-lg p-2 shadow-md text-xs">
                    <p className="text-[11px] font-semibold text-[#1E1B4B] mb-1">{label}</p>
                    <div className="flex items-center gap-1.5 text-xs text-[#64748B]">
                      <span className="w-2 h-2 rounded-full bg-[#6D28D9]" />
                      <span>Leads:</span>
                      <span className="font-bold text-[#1E1B4B]">{payload[0].value}</span>
                    </div>
                  </div>
                );
              }
              return null;
            }}
          />
          <Line
            type="monotone"
            dataKey="leads"
            stroke="#6D28D9"
            strokeWidth={2}
            dot={{ fill: '#6D28D9', r: 3, stroke: '#FFFFFF', strokeWidth: 1 }}
            activeDot={{ r: 5, fill: '#6D28D9' }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};
