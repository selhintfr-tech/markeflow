import React, { useState } from 'react';
import { MoreHorizontal, Eye, Trash2, FileText, BarChart2, Database, Users, Folder } from 'lucide-react';
import type { Report } from '../types';

interface SavedReportsTableProps {
  reports: Report[];
  selectedReportId: string | null;
  onSelectReport: (reportId: string) => void;
  onDeleteReport: (reportId: string) => void;
  onViewReport: (report: Report) => void;
}

const getReportIconConfig = (type: string) => {
  switch (type) {
    case 'Campaign Performance':
      return { Icon: BarChart2, color: 'text-[#6D28D9]', bg: 'bg-[#EDE9FE]' };
    case 'Financial Summary':
      return { Icon: Database, color: 'text-[#0D9488]', bg: 'bg-[#CCFBF1]' };
    case 'Lead Conversion':
      return { Icon: Users, color: 'text-[#6D28D9]', bg: 'bg-[#EDE9FE]' };
    case 'Project Overview':
      return { Icon: Folder, color: 'text-[#3B82F6]', bg: 'bg-[#DBEAFE]' };
    case 'Custom Report':
    default:
      return { Icon: FileText, color: 'text-[#6D28D9]', bg: 'bg-[#EDE9FE]' };
  }
};

const ReportStatusBadge: React.FC<{ status: string }> = ({ status }) => {
  switch (status) {
    case 'Ready':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#DCFCE7] text-[#15803D]">
          <span className="w-1.5 h-1.5 rounded-full bg-[#16A34A] shrink-0" />
          Ready
        </span>
      );
    case 'In Review':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#EDE9FE] text-[#6D28D9]">
          <span className="w-1.5 h-1.5 rounded-full bg-[#6D28D9] shrink-0" />
          In Review
        </span>
      );
    case 'Draft':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#FEF3C7] text-[#D97706]">
          <span className="w-1.5 h-1.5 rounded-full bg-[#D97706] shrink-0" />
          Draft
        </span>
      );
    case 'Archived':
    default:
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#F1F5F9] text-[#64748B]">
          <span className="w-1.5 h-1.5 rounded-full bg-[#94A3B8] shrink-0" />
          Archived
        </span>
      );
  }
};

export const SavedReportsTable: React.FC<SavedReportsTableProps> = ({
  reports,
  selectedReportId,
  onSelectReport,
  onDeleteReport,
  onViewReport,
}) => {
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const handleDelete = (reportId: string) => {
    setDeleteConfirmId(reportId);
    setMenuOpenId(null);
  };

  const confirmDelete = () => {
    if (deleteConfirmId) {
      onDeleteReport(deleteConfirmId);
      setDeleteConfirmId(null);
    }
  };

  const cancelDelete = () => {
    setDeleteConfirmId(null);
  };

  if (reports.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="w-16 h-16 rounded-full bg-[#F1F5F9] flex items-center justify-center mb-4">
          <FileText className="w-8 h-8 text-[#94A3B8]" />
        </div>
        <h3 className="text-sm font-semibold text-[#1E1B4B] mb-1">No reports found</h3>
        <p className="text-xs text-[#64748B]">Try adjusting your filters or create a new report.</p>
      </div>
    );
  }

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[#E2E8F0]">
              <th className="text-left py-3 px-3 text-xs font-semibold text-[#64748B]">Report Name</th>
              <th className="text-left py-3 px-3 text-xs font-semibold text-[#64748B]">Company</th>
              <th className="text-left py-3 px-3 text-xs font-semibold text-[#64748B]">Reporting Period</th>
              <th className="text-left py-3 px-3 text-xs font-semibold text-[#64748B]">Created By</th>
              <th className="text-left py-3 px-3 text-xs font-semibold text-[#64748B]">Created Date</th>
              <th className="text-left py-3 px-3 text-xs font-semibold text-[#64748B]">Status</th>
              <th className="text-right py-3 px-3 text-xs font-semibold text-[#64748B]">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#F1F5F9]">
            {reports.map((report) => {
              const { Icon, color, bg } = getReportIconConfig(report.type);
              const isSelected = selectedReportId === report.id;

              return (
                <tr
                  key={report.id}
                  onClick={() => onSelectReport(report.id)}
                  className={`cursor-pointer transition-colors ${
                    isSelected ? 'bg-[#F5F3FF]' : 'hover:bg-[#F8F7FC]'
                  }`}
                >
                  <td className="py-3 px-3">
                    <div className="flex items-center gap-2.5">
                      <div className={`w-8 h-8 rounded-lg ${bg} flex items-center justify-center shrink-0`}>
                        <Icon className={`w-4 h-4 ${color}`} />
                      </div>
                      <span className="text-xs font-medium text-[#1E1B4B] line-clamp-1">{report.name}</span>
                    </div>
                  </td>
                  <td className="py-3 px-3">
                    <span className="text-xs text-[#64748B] whitespace-nowrap">{report.company}</span>
                  </td>
                  <td className="py-3 px-3">
                    <span className="text-xs text-[#64748B] whitespace-nowrap">{report.reportingPeriod}</span>
                  </td>
                  <td className="py-3 px-3">
                    <span className="text-xs text-[#64748B] whitespace-nowrap">{report.createdBy}</span>
                  </td>
                  <td className="py-3 px-3">
                    <span className="text-xs text-[#64748B] whitespace-nowrap">{report.createdDate}</span>
                  </td>
                  <td className="py-3 px-3">
                    <ReportStatusBadge status={report.status} />
                  </td>
                  <td className="py-3 px-3 text-right">
                    <div className="relative inline-block text-left">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setMenuOpenId(menuOpenId === report.id ? null : report.id);
                        }}
                        className="p-1 rounded hover:bg-[#E2E8F0] transition-colors"
                        aria-label="Actions"
                      >
                        <MoreHorizontal className="w-4 h-4 text-[#64748B]" />
                      </button>

                      {menuOpenId === report.id && (
                        <div className="absolute right-0 top-full mt-1 w-36 rounded-lg bg-white border border-[#E2E8F0] shadow-lg py-1 z-50 text-left">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onViewReport(report);
                              setMenuOpenId(null);
                            }}
                            className="w-full flex items-center gap-2 px-3 py-2 text-xs text-[#1E1B4B] hover:bg-[#F5F3FF] transition-colors"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            View
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(report.id);
                            }}
                            className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-600 hover:bg-red-50 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            Delete
                          </button>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {deleteConfirmId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-lg">
            <h3 className="text-lg font-semibold text-[#1E1B4B] mb-2">Delete Report</h3>
            <p className="text-sm text-[#64748B] mb-6">
              Are you sure you want to delete this report? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={cancelDelete}
                className="px-4 py-2 rounded-lg border border-[#E2E8F0] bg-white text-xs font-medium text-[#1E1B4B] hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-medium transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
