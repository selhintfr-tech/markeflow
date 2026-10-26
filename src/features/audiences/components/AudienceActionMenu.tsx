import React from 'react';
import { Edit2, Megaphone, MoreHorizontal, Trash2 } from 'lucide-react';
import type { AudienceSegment } from '../../../types';
import { ActionDropdown } from '../../../components/ui/ActionDropdown';

export interface AudienceActionMenuProps {
  segment: AudienceSegment;
  isOpen: boolean;
  onToggle: () => void;
  onClose: () => void;
  onEdit: (segment: AudienceSegment) => void;
  onUseInCampaign: (segment: AudienceSegment) => void;
  onDelete: (segment: AudienceSegment) => void;
}

export const AudienceActionMenu: React.FC<AudienceActionMenuProps> = ({
  segment,
  isOpen,
  onToggle,
  onClose,
  onEdit,
  onUseInCampaign,
  onDelete,
}) => {
  return (
    <ActionDropdown
      isOpen={isOpen}
      onClose={onClose}
      ariaLabel={`Actions for segment ${segment.name}`}
      menuWidth={144}
      menuHeight={114}
      className="w-36 bg-white border border-[#E2E8F0] rounded-lg shadow-lg py-1 z-50 text-left animate-in fade-in zoom-in-95 duration-100"
      trigger={
        <button
          type="button"
          aria-haspopup="menu"
          aria-expanded={isOpen}
          aria-label={`Actions for segment ${segment.name}`}
          onClick={(e) => {
            e.stopPropagation();
            onToggle();
          }}
          className={`p-1 rounded transition-colors cursor-pointer ${
            isOpen
              ? 'bg-slate-200 text-[#1E1B4B]'
              : 'text-[#94A3B8] hover:bg-slate-200/60 hover:text-[#1E1B4B]'
          }`}
        >
          <MoreHorizontal className="w-4 h-4" />
        </button>
      }
    >
      <button
        role="menuitem"
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onClose();
          onEdit(segment);
        }}
        className="w-full px-3 py-1.5 text-xs text-[#1E1B4B] hover:bg-slate-50 flex items-center gap-2 transition-colors focus:bg-slate-50 focus:outline-none cursor-pointer"
      >
        <Edit2 className="w-3.5 h-3.5 text-[#64748B]" />
        <span>Edit Segment</span>
      </button>
      <button
        role="menuitem"
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onClose();
          onUseInCampaign(segment);
        }}
        className="w-full px-3 py-1.5 text-xs text-[#1E1B4B] hover:bg-slate-50 flex items-center gap-2 transition-colors focus:bg-slate-50 focus:outline-none cursor-pointer"
      >
        <Megaphone className="w-3.5 h-3.5 text-[#64748B]" />
        <span>Use in Campaign</span>
      </button>
      <button
        role="menuitem"
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onClose();
          onDelete(segment);
        }}
        className="w-full px-3 py-1.5 text-xs text-rose-600 hover:bg-rose-50 flex items-center gap-2 transition-colors focus:bg-rose-50 focus:outline-none cursor-pointer"
      >
        <Trash2 className="w-3.5 h-3.5 text-rose-500" />
        <span>Delete Segment</span>
      </button>
    </ActionDropdown>
  );
};
