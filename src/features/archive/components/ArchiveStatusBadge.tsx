import React from 'react';
import type { ArchivePreviousStatus } from '../../../types';

interface ArchiveStatusBadgeProps {
  status: ArchivePreviousStatus | string;
  className?: string;
}

export const ArchiveStatusBadge: React.FC<ArchiveStatusBadgeProps> = ({ status, className = '' }) => {
  const getBadgeStyle = () => {
    switch (status.toLowerCase()) {
      case 'completed':
        return 'bg-[#D1FAE5] text-[#059669]';
      case 'archived':
        return 'bg-[#F1F5F9] text-[#64748B]';
      case 'on hold':
        return 'bg-[#FEF3C7] text-[#D97706]';
      case 'final':
        return 'bg-[#E0F2FE] text-[#0284C7]';
      default:
        return 'bg-[#F1F5F9] text-[#475569]';
    }
  };

  return (
    <span
      className={`inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-xs font-medium tracking-tight ${getBadgeStyle()} ${className}`}
    >
      {status}
    </span>
  );
};
