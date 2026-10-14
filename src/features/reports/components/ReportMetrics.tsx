import React from 'react';
import { Megaphone, Users, Database, TrendingUp } from 'lucide-react';
import type { ReportMetrics as ReportMetricsType } from '../types';
import { formatCurrency } from '../utils';

interface ReportMetricsProps {
  metrics: ReportMetricsType;
}

export const ReportMetrics: React.FC<ReportMetricsProps> = ({ metrics }) => {
  const metricCards = [
    {
      label: 'Ad Spend',
      value: formatCurrency(metrics.adSpend),
      icon: Megaphone,
      color: 'text-[#6D28D9]',
      cardBg: 'bg-white border-[#E2E8F0]',
      valColor: 'text-[#1E1B4B]',
    },
    {
      label: 'Leads',
      value: metrics.leads.toString(),
      icon: Users,
      color: 'text-[#3B82F6]',
      cardBg: 'bg-white border-[#E2E8F0]',
      valColor: 'text-[#1E1B4B]',
    },
    {
      label: 'Revenue',
      value: formatCurrency(metrics.revenue),
      icon: Database,
      color: 'text-[#0D9488]',
      cardBg: 'bg-white border-[#E2E8F0]',
      valColor: 'text-[#1E1B4B]',
    },
    {
      label: 'Estimated Campaign Profit',
      value: `+${formatCurrency(metrics.estimatedProfit)}`,
      icon: TrendingUp,
      color: 'text-[#10B981]',
      cardBg: 'bg-[#F0FDF4] border-[#BBF7D0]',
      valColor: 'text-[#10B981]',
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 my-4">
      {metricCards.map((metric) => {
        const Icon = metric.icon;
        return (
          <div
            key={metric.label}
            className={`rounded-lg border p-3 flex flex-col justify-between ${metric.cardBg}`}
          >
            <div className="flex items-center gap-1.5 mb-2">
              <Icon className={`w-3.5 h-3.5 ${metric.color}`} />
              <span className={`text-[11px] font-semibold ${metric.color} truncate`}>
                {metric.label}
              </span>
            </div>
            <p className={`text-sm lg:text-base font-bold ${metric.valColor}`}>
              {metric.value}
            </p>
          </div>
        );
      })}
    </div>
  );
};
