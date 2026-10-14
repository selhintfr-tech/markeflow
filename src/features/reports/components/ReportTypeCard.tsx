import React from 'react';
import { BarChart2, Database, Users, Folder, FileText } from 'lucide-react';
import type { ReportTypeCard as ReportTypeCardType, ReportType } from '../types';

interface ReportTypeCardProps {
  card: ReportTypeCardType;
  isSelected: boolean;
  onSelect: (type: string | ReportType) => void;
}

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  BarChart2,
  Database,
  Users,
  Folder,
  FileText,
};

export const ReportTypeCard: React.FC<ReportTypeCardProps> = ({ card, isSelected, onSelect }) => {
  const Icon = iconMap[card.icon] || FileText;
  
  const getIconColor = () => {
    switch (card.color) {
      case 'purple':
        return 'text-[#6D28D9]';
      case 'teal':
        return 'text-[#0D9488]';
      case 'blue':
        return 'text-[#3B82F6]';
      default:
        return 'text-[#6D28D9]';
    }
  };

  const getIconBgColor = () => {
    switch (card.color) {
      case 'purple':
        return 'bg-[#EDE9FE]';
      case 'teal':
        return 'bg-[#CCFBF1]';
      case 'blue':
        return 'bg-[#DBEAFE]';
      default:
        return 'bg-[#EDE9FE]';
    }
  };

  return (
    <button
      type="button"
      onClick={() => onSelect(card.id)}
      className={`flex-1 min-w-[180px] bg-white rounded-xl border p-4 text-left transition-all hover:shadow-md ${
        isSelected ? 'border-[#6D28D9] shadow-sm' : 'border-[#E2E8F0] hover:border-[#CBD5E1]'
      }`}
      aria-pressed={isSelected}
    >
      <div className={`p-2.5 rounded-lg ${getIconBgColor()} w-fit mb-3`}>
        <Icon className={`w-5 h-5 ${getIconColor()}`} />
      </div>
      <h3 className="text-sm font-semibold text-[#1E1B4B] mb-1">{card.title}</h3>
      <p className="text-xs text-[#64748B] leading-relaxed">{card.description}</p>
    </button>
  );
};
