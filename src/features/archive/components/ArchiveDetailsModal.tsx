import React, { useEffect } from 'react';
import { X, Calendar, User, Building2, Layers, RotateCcw, FileText } from 'lucide-react';
import type { ArchivedRecord } from '../../../types';
import { ArchiveStatusBadge } from './ArchiveStatusBadge';

interface ArchiveDetailsModalProps {
  isOpen: boolean;
  record: ArchivedRecord | null;
  onClose: () => void;
  onRestoreClick: (record: ArchivedRecord) => void;
}

export const ArchiveDetailsModal: React.FC<ArchiveDetailsModalProps> = ({
  isOpen,
  record,
  onClose,
  onRestoreClick,
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !record) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-[2px] flex items-center justify-center p-4 transition-opacity animate-in fade-in duration-150"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl relative animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-5 right-5 text-[#94A3B8] hover:text-[#475569] p-1 rounded-lg hover:bg-slate-100 transition-colors"
          aria-label="Close"
        >
          <X className="w-4 h-4 stroke-[2.2]" />
        </button>

        {/* Header */}
        <div className="flex items-start gap-3.5 mb-6">
          <div className="w-11 h-11 rounded-xl bg-[#EDE9FE] text-[#6D28D9] flex items-center justify-center shrink-0">
            <FileText className="w-5 h-5 stroke-[2.2]" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-lg font-bold text-[#1E1B4B]">{record.name}</h3>
              <ArchiveStatusBadge status={record.previousStatus} />
            </div>
            <p className="text-xs text-[#64748B] mt-0.5">{record.subtitle}</p>
          </div>
        </div>

        {/* Content Details Grid */}
        <div className="grid grid-cols-2 gap-4 bg-[#F8F7FC] p-4 rounded-xl border border-[#E2E8F0] text-xs">
          <div>
            <span className="text-[#64748B] block mb-1 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-[#94A3B8]" /> Record Type
            </span>
            <span className="font-semibold text-[#1E1B4B]">{record.type}</span>
          </div>

          <div>
            <span className="text-[#64748B] block mb-1 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-[#94A3B8]" /> Workspace
            </span>
            <span className="font-semibold text-[#1E1B4B]">{record.workspace}</span>
          </div>

          <div>
            <span className="text-[#64748B] block mb-1 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-[#94A3B8]" /> Archived Date
            </span>
            <span className="font-semibold text-[#1E1B4B]">
              {record.archivedDate} {record.archivedTime ? `at ${record.archivedTime}` : ''}
            </span>
          </div>

          <div>
            <span className="text-[#64748B] block mb-1 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-[#94A3B8]" /> Archived By
            </span>
            <span className="font-semibold text-[#1E1B4B]">{record.archivedBy}</span>
          </div>
        </div>

        {/* Description */}
        <div className="mt-4 text-xs">
          <span className="text-[#64748B] font-medium block mb-1">Archive Summary & Context</span>
          <p className="text-[#1E1B4B] leading-relaxed bg-white border border-[#E2E8F0] p-3 rounded-lg">
            {record.description || 'Historical record retained for analytical comparison and organizational compliance.'}
          </p>
        </div>

        {/* Restoration Target */}
        <div className="mt-4 p-3 rounded-lg bg-[#EFF6FF] border border-[#BFDBFE] text-xs text-[#1E40AF]">
          Restoring this item will return it to <span className="font-semibold">{record.destination}</span> in active workspaces.
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-[#F1F5F9]">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-[#E2E8F0] text-xs font-medium text-[#475569] hover:bg-slate-50 transition-colors"
          >
            Close
          </button>
          <button
            type="button"
            onClick={() => {
              onClose();
              onRestoreClick(record);
            }}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#6D28D9] hover:bg-[#5B21B6] text-white text-xs font-semibold shadow-xs transition-all"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Restore Record</span>
          </button>
        </div>
      </div>
    </div>
  );
};
