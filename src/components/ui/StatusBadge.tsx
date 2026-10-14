import React from 'react';

interface StatusBadgeProps {
  status: 'Active' | 'Scheduled' | 'Completed' | 'Draft' | 'Paused' | string;
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, className = '' }) => {
  const getBadgeStyle = () => {
    switch (status.toLowerCase()) {
      case 'active':
        return {
          wrapper: 'bg-[#CCFBF1] text-[#0D9488]',
          dot: 'bg-[#0D9488]',
        };
      case 'completed':
      case 'scheduled':
      case 'in progress':
        return {
          wrapper: 'bg-[#EDE9FE] text-[#6D28D9]',
          dot: 'bg-[#6D28D9]',
        };
      case 'archived':
      case 'upcoming':
      case 'planned':
      case 'in review':
      case 'draft':
        return {
          wrapper: 'bg-[#F1F5F9] text-[#64748B]',
          dot: 'bg-[#94A3B8]',
        };
      case 'paused':
      case 'on hold':
        return {
          wrapper: 'bg-[#FEF3C7] text-[#D97706]',
          dot: 'bg-[#D97706]',
        };
      default:
        return {
          wrapper: 'bg-[#F1F5F9] text-[#475569]',
          dot: 'bg-[#94A3B8]',
        };
    }
  };

  const style = getBadgeStyle();

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium tracking-tight ${style.wrapper} ${className}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${style.dot} shrink-0`} />
      {status}
    </span>
  );
};

