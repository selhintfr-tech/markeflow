import React from 'react';
import {
  CheckSquare,
  Loader2,
  CheckCircle2,
  AlertCircle,
  ChevronRight,
} from 'lucide-react';

interface TaskKpiCardsProps {
  totalCount: number;
  inProgressCount: number;
  completedCount: number;
  overdueCount: number;
  activeFilter: string | null;
  onFilterChange: (filter: string | null) => void;
}

export const TaskKpiCards: React.FC<TaskKpiCardsProps> = ({
  totalCount,
  inProgressCount,
  completedCount,
  overdueCount,
  activeFilter,
  onFilterChange,
}) => {
  const cards = [
    {
      id: 'total',
      label: 'Total Tasks',
      value: totalCount,
      icon: CheckSquare,
      iconBg: 'bg-[#F5F3FF]',
      iconColor: 'text-[#6D28D9]',
      filterKey: null,
    },
    {
      id: 'in-progress',
      label: 'In Progress',
      value: inProgressCount,
      icon: Loader2,
      iconBg: 'bg-[#EFF6FF]',
      iconColor: 'text-[#2563EB]',
      filterKey: 'In Progress',
    },
    {
      id: 'completed',
      label: 'Completed',
      value: completedCount,
      icon: CheckCircle2,
      iconBg: 'bg-[#ECFDF5]',
      iconColor: 'text-[#0D9488]',
      filterKey: 'Completed',
    },
    {
      id: 'overdue',
      label: 'Overdue',
      value: overdueCount,
      icon: AlertCircle,
      iconBg: 'bg-[#FEF2F2]',
      iconColor: 'text-[#EF4444]',
      filterKey: 'Overdue',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => {
        const Icon = card.icon;
        const isSelected =
          (card.filterKey === null && activeFilter === null) ||
          (card.filterKey !== null && activeFilter === card.filterKey);

        return (
          <div
            key={card.id}
            onClick={() => onFilterChange(activeFilter === card.filterKey ? null : card.filterKey)}
            className={`bg-white rounded-xl border p-4 shadow-xs transition-all cursor-pointer hover:border-[#CBD5E1] ${
              isSelected && activeFilter !== null
                ? 'border-[#6D28D9] ring-1 ring-[#6D28D9]/20'
                : 'border-[#E2E8F0]'
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${card.iconBg} ${card.iconColor}`}
                >
                  <Icon className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs text-[#64748B] font-medium">{card.label}</div>
                  <div className="text-2xl font-bold text-[#1E1B4B] tracking-tight">
                    {card.value}
                  </div>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-[#94A3B8] mt-1 shrink-0" />
            </div>

            <div className="mt-3 text-xs text-[#94A3B8]">Current workspace</div>
          </div>
        );
      })}
    </div>
  );
};
