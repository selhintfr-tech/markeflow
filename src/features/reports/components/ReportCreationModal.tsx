import React, { useState } from 'react';
import { X } from 'lucide-react';
import type { ReportFormData, ReportType } from '../types';
import { reportTypeCards } from '../data';

interface ReportCreationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateReport: (data: ReportFormData) => void;
  workspaceId: string;
  workspaceName: string;
  preselectedType?: ReportType;
}

export const ReportCreationModal: React.FC<ReportCreationModalProps> = ({
  isOpen,
  onClose,
  onCreateReport,
  workspaceId,
  workspaceName,
  preselectedType,
}) => {
  const [formData, setFormData] = useState<ReportFormData>(() => ({
    name: '',
    type: preselectedType || 'Campaign Performance',
    workspaceId,
    reportingPeriod: '',
    campaign: '',
    project: '',
  }));

  const [errors, setErrors] = useState<Partial<Record<keyof ReportFormData, string>>>({});

  const [prevIsOpen, setPrevIsOpen] = useState(isOpen);

  if (isOpen !== prevIsOpen) {
    setPrevIsOpen(isOpen);
    if (isOpen) {
      setFormData({
        name: '',
        type: preselectedType || 'Campaign Performance',
        workspaceId,
        reportingPeriod: '',
        campaign: '',
        project: '',
      });
      setErrors({});
    }
  }

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof ReportFormData, string>> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Report name is required';
    }

    if (!formData.reportingPeriod.trim()) {
      newErrors.reportingPeriod = 'Reporting period is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (validateForm()) {
      onCreateReport(formData);
      onClose();
    }
  };

  const handleTypeSelect = (type: ReportType) => {
    setFormData((prev) => ({ ...prev, type }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-2xl shadow-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-[#E2E8F0]">
          <h2 className="text-lg font-semibold text-[#1E1B4B]">Create New Report</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded hover:bg-[#F1F5F9] transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5 text-[#64748B]" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-[#1E1B4B] mb-2">
              Report Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Enter report name"
              className={`w-full px-4 py-2 rounded-lg border text-sm text-[#1E1B4B] placeholder:text-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#6D28D9] focus:border-transparent ${
                errors.name ? 'border-red-500' : 'border-[#E2E8F0]'
              }`}
            />
            {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-[#1E1B4B] mb-3">Report Type</label>
            <div className="flex gap-3 overflow-x-auto pb-2">
              {reportTypeCards.map((card) => (
                <button
                  key={card.id}
                  type="button"
                  onClick={() => handleTypeSelect(card.id as ReportType)}
                  className={`flex-1 min-w-[160px] bg-white rounded-lg border p-3 text-left transition-all hover:shadow-md ${
                    formData.type === card.id ? 'border-[#6D28D9] shadow-sm' : 'border-[#E2E8F0]'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <div className={`p-1.5 rounded ${
                      card.color === 'purple' ? 'bg-[#EDE9FE] text-[#6D28D9]' :
                      card.color === 'teal' ? 'bg-[#CCFBF1] text-[#0D9488]' :
                      card.color === 'blue' ? 'bg-[#DBEAFE] text-[#3B82F6]' :
                      'bg-[#EDE9FE] text-[#6D28D9]'
                    }`}>
                      <span className="text-xs font-bold">{card.title.charAt(0)}</span>
                    </div>
                    <span className="text-xs font-semibold text-[#1E1B4B]">{card.title}</span>
                  </div>
                  <p className="text-xs text-[#64748B] line-clamp-2">{card.description}</p>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-[#1E1B4B] mb-2">Workspace / Company</label>
            <input
              type="text"
              value={workspaceName}
              disabled
              className="w-full px-4 py-2 rounded-lg border border-[#E2E8F0] bg-[#F8F7FC] text-sm text-[#64748B] cursor-not-allowed"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#1E1B4B] mb-2">
              Reporting Period <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.reportingPeriod}
              onChange={(e) => setFormData({ ...formData, reportingPeriod: e.target.value })}
              placeholder="e.g., 01 Oct 2026 - 31 Oct 2026"
              className={`w-full px-4 py-2 rounded-lg border text-sm text-[#1E1B4B] placeholder:text-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#6D28D9] focus:border-transparent ${
                errors.reportingPeriod ? 'border-red-500' : 'border-[#E2E8F0]'
              }`}
            />
            {errors.reportingPeriod && <p className="mt-1 text-xs text-red-500">{errors.reportingPeriod}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[#1E1B4B] mb-2">Related Campaign (Optional)</label>
              <input
                type="text"
                value={formData.campaign}
                onChange={(e) => setFormData({ ...formData, campaign: e.target.value })}
                placeholder="Enter campaign name"
                className="w-full px-4 py-2 rounded-lg border border-[#E2E8F0] text-sm text-[#1E1B4B] placeholder:text-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#6D28D9] focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#1E1B4B] mb-2">Related Project (Optional)</label>
              <input
                type="text"
                value={formData.project}
                onChange={(e) => setFormData({ ...formData, project: e.target.value })}
                placeholder="Enter project name"
                className="w-full px-4 py-2 rounded-lg border border-[#E2E8F0] text-sm text-[#1E1B4B] placeholder:text-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#6D28D9] focus:border-transparent"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-[#E2E8F0]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-[#E2E8F0] bg-white text-xs font-medium text-[#1E1B4B] hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-[#6D28D9] hover:bg-[#5B21B6] text-white text-xs font-semibold shadow-xs hover:shadow-md transition-all"
            >
              Create Report
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
