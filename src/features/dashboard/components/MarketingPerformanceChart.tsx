import React, { useState } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { ChevronDown, Loader2 } from 'lucide-react';
import type { AnalyticsTimeSeries } from '../dashboardService';

interface MarketingPerformanceChartProps {
  timeSeries: AnalyticsTimeSeries | null;
  loading: boolean;
}

type MetricView = 'Financials' | 'Activity' | 'Execution';

export const MarketingPerformanceChart: React.FC<MarketingPerformanceChartProps> = ({
  timeSeries,
  loading,
}) => {
  const [metricView, setMetricView] = useState<MetricView>('Financials');
  const [showDropdown, setShowDropdown] = useState(false);

  // Build combined chart data points ordered by date
  const chartData = React.useMemo(() => {
    if (!timeSeries?.series) return [];

    const dateMap = new Map<string, { date: string; series1: number; series2: number }>();

    let list1: Array<{ date: string; value: number | string }> = [];
    let list2: Array<{ date: string; value: number | string }> = [];

    if (metricView === 'Financials') {
      list1 = timeSeries.series.income ?? [];
      list2 = timeSeries.series.expenses ?? [];
    } else if (metricView === 'Activity') {
      list1 = timeSeries.series.campaigns ?? [];
      list2 = timeSeries.series.leads ?? [];
    } else {
      list1 = timeSeries.series.projects ?? [];
      list2 = timeSeries.series.tasks ?? [];
    }

    list1.forEach((item) => {
      const val = Number(item.value) || 0;
      dateMap.set(item.date, { date: item.date, series1: val, series2: 0 });
    });

    list2.forEach((item) => {
      const val = Number(item.value) || 0;
      const existing = dateMap.get(item.date);
      if (existing) {
        existing.series2 = val;
      } else {
        dateMap.set(item.date, { date: item.date, series1: 0, series2: val });
      }
    });

    return Array.from(dateMap.values()).sort((a, b) => a.date.localeCompare(b.date));
  }, [timeSeries, metricView]);

  const viewLabels = {
    Financials: { title: 'Income & Expenses', label1: 'Income', label2: 'Expenses' },
    Activity: { title: 'Campaigns & Leads', label1: 'Campaigns', label2: 'Leads' },
    Execution: { title: 'Projects & Tasks', label1: 'Projects', label2: 'Tasks' },
  };

  const currentLabels = viewLabels[metricView];

  return (
    <div className="bg-white rounded-xl border border-[#E2E8F0] p-6 shadow-xs flex flex-col justify-between min-h-[360px]">
      {/* Header with Title and Dropdown */}
      <div className="flex items-center justify-between mb-2">
        <div>
          <h2 className="text-base font-bold text-[#1E1B4B]">
            Marketing Performance
          </h2>
          <p className="text-xs text-[#64748B] mt-0.5">
            Real workspace trends and operational metrics over time.
          </p>
        </div>

        <div className="relative">
          <button
            type="button"
            onClick={() => setShowDropdown(!showDropdown)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[#E2E8F0] bg-white text-xs font-medium text-[#1E1B4B] hover:bg-slate-50 shadow-2xs cursor-pointer transition-colors"
          >
            <span>{currentLabels.title}</span>
            <ChevronDown className="w-3.5 h-3.5 text-[#94A3B8]" />
          </button>

          {showDropdown && (
            <div className="absolute right-0 mt-1.5 w-48 rounded-lg bg-white border border-[#E2E8F0] shadow-lg py-1 z-30">
              {(Object.keys(viewLabels) as MetricView[]).map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => {
                    setMetricView(key);
                    setShowDropdown(false);
                  }}
                  className={`w-full text-left px-3.5 py-2 text-xs hover:bg-[#F5F3FF] transition-colors cursor-pointer ${
                    metricView === key ? 'text-[#6D28D9] font-semibold bg-[#F5F3FF]' : 'text-[#1E1B4B]'
                  }`}
                >
                  {viewLabels[key].title}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-end gap-5 mb-3 text-xs">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-[#6D28D9]" />
          <span className="text-[#64748B] font-medium">{currentLabels.label1}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-[#C4B5FD]" />
          <span className="text-[#64748B] font-medium">{currentLabels.label2}</span>
        </div>
      </div>

      {/* Chart Area */}
      <div className="h-64 w-full relative">
        {loading && (
          <div className="absolute inset-0 bg-white/70 backdrop-blur-2xs flex items-center justify-center z-10">
            <Loader2 className="w-6 h-6 text-[#6D28D9] animate-spin" />
          </div>
        )}

        {!loading && chartData.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center text-xs text-[#94A3B8] p-4">
            <p className="font-semibold text-[#64748B] mb-1">No time-series activity recorded</p>
            <p>Activity logs will appear automatically as campaigns, leads and transactions occur.</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={chartData}
              margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
            >
              <defs>
                <linearGradient id="primaryGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6D28D9" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#6D28D9" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="secondaryGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#C4B5FD" stopOpacity={0.25} />
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
                tickFormatter={(str) => {
                  try {
                    const d = new Date(str);
                    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
                  } catch {
                    return str;
                  }
                }}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#94A3B8', fontSize: 11 }}
                tickFormatter={(val) => {
                  if (val === 0) return '0';
                  if (val >= 1000) return `${(val / 1000).toFixed(0)}K`;
                  return String(val);
                }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: '8px',
                  border: '1px solid #E2E8F0',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                  fontSize: '12px',
                }}
                formatter={(val, name) => [
                  Number(val).toLocaleString(),
                  name === 'series1' ? currentLabels.label1 : currentLabels.label2,
                ]}
                labelFormatter={(lbl) => {
                  if (typeof lbl === 'string' || typeof lbl === 'number') {
                    try {
                      return new Date(lbl).toLocaleDateString(undefined, {
                        month: 'long',
                        day: 'numeric',
                        year: 'numeric',
                      });
                    } catch {
                      return String(lbl);
                    }
                  }
                  return String(lbl ?? '');
                }}
              />
              <Area
                type="monotone"
                dataKey="series1"
                stroke="#6D28D9"
                strokeWidth={2.2}
                fill="url(#primaryGradient)"
                dot={{ r: 3, fill: '#6D28D9', strokeWidth: 1, stroke: '#FFFFFF' }}
                activeDot={{ r: 5 }}
              />
              <Area
                type="monotone"
                dataKey="series2"
                stroke="#C4B5FD"
                strokeWidth={2}
                fill="url(#secondaryGradient)"
                dot={{ r: 2.5, fill: '#C4B5FD', strokeWidth: 1, stroke: '#FFFFFF' }}
                activeDot={{ r: 4 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
};
