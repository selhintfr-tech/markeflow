import React, { useEffect } from 'react';
import { RotateCcw, X } from 'lucide-react';
import type { ArchivedRecord } from '../../../types';

interface RestoreConfirmationModalProps {
  isOpen: boolean;
  record: ArchivedRecord | null;
  onClose: () => void;
  onConfirm: (record: ArchivedRecord) => void;
}

export const RestoreConfirmationModal: React.FC<RestoreConfirmationModalProps> = ({
  isOpen,
  record,
  onClose,
  onConfirm,
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !record) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-[2px] flex items-center justify-center p-4 transition-opacity animate-in fade-in duration-150"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="restore-modal-title"
    >
      <div
        className="bg-white rounded-2xl max-w-[450px] w-full p-6 shadow-2xl relative animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-5 right-5 text-[#94A3B8] hover:text-[#475569] p-1 rounded-lg hover:bg-slate-100 transition-colors"
          aria-label="Close dialog"
        >
          <X className="w-4 h-4 stroke-[2.2]" />
        </button>

        {/* Circular Purple Restore Icon */}
        <div className="w-12 h-12 rounded-full bg-[#EDE9FE] text-[#6D28D9] flex items-center justify-center mb-4">
          <RotateCcw className="w-6 h-6 stroke-[2.2]" />
        </div>

        {/* Title */}
        <h3 id="restore-modal-title" className="text-xl font-bold text-[#1E1B4B]">
          Restore record?
        </h3>

        {/* Description */}
        <p className="text-sm text-[#64748B] mt-2 leading-relaxed">
          This will return the record to its appropriate management section and make it available again in active workflows.
        </p>

        {/* Dynamic destination highlight */}
        <p className="text-sm text-[#64748B] mt-2 font-medium">
          <span className="font-semibold text-[#1E1B4B]">{record.name}</span> will be restored to <span className="text-[#6D28D9] font-semibold">{record.destination}</span>.
        </p>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 mt-8">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-[#E2E8F0] text-sm font-medium text-[#475569] hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onConfirm(record)}
            className="px-5 py-2 rounded-lg bg-[#6D28D9] hover:bg-[#5B21B6] text-white text-sm font-medium shadow-xs hover:shadow-md transition-all"
          >
            Restore record
          </button>
        </div>
      </div>
    </div>
  );
};
