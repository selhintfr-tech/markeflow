import React, { useEffect } from 'react';
import { X, FileText, Download, TrendingUp, DollarSign, Users, Wallet } from 'lucide-react';
import { StatusBadge } from '../../../components/ui/StatusBadge';
import type { Report } from '../types';
import { formatCurrency, downloadCSV, printReport } from '../utils';

interface ReportDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  report: Report | null;
}

export const ReportDetailsModal: React.FC<ReportDetailsModalProps> = ({ isOpen, onClose, report }) => {
  // Handle Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !report) return null;

  const handleExportPDF = () => {
    printReport();
  };

  const handleDownloadCSV = () => {
    downloadCSV(report);
  };

  const hasMetrics = report.metrics && Object.keys(report.metrics).length > 0;
  const hasChannelData = report.channelPerformance && report.channelPerformance.length > 0;
  const hasTakeaways = report.keyTakeaways && report.keyTakeaways.length > 0;

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="report-details-modal-title" className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-4xl shadow-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-[#E2E8F0] sticky top-0 bg-white z-10">
          <div>
            <h2 className="text-lg font-semibold text-[#1E1B4B]">{report.name}</h2>
            <p className="text-xs text-[#64748B] mt-1">{report.type}</p>
          </div>
          <div className="flex items-center gap-3">
            <StatusBadge status={report.status} />
            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded hover:bg-[#F1F5F9] transition-colors"
              aria-label="Close"
            >
              <X className="w-5 h-5 text-[#64748B]" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-xs text-[#64748B] mb-1">Company</p>
              <p className="font-medium text-[#1E1B4B]">{report.company}</p>
            </div>
            <div>
              <p className="text-xs text-[#64748B] mb-1">Reporting Period</p>
              <p className="font-medium text-[#1E1B4B]">{report.reportingPeriod}</p>
            </div>
            <div>
              <p className="text-xs text-[#64748B] mb-1">Created By</p>
              <p className="font-medium text-[#1E1B4B]">{report.createdBy}</p>
            </div>
            <div>
              <p className="text-xs text-[#64748B] mb-1">Created Date</p>
              <p className="font-medium text-[#1E1B4B]">{report.createdDate}</p>
            </div>
            {report.campaign && (
              <div>
                <p className="text-xs text-[#64748B] mb-1">Campaign</p>
                <p className="font-medium text-[#1E1B4B]">{report.campaign}</p>
              </div>
            )}
            {report.project && (
              <div>
                <p className="text-xs text-[#64748B] mb-1">Project</p>
                <p className="font-medium text-[#1E1B4B]">{report.project}</p>
              </div>
            )}
          </div>

          {hasMetrics && (
            <div>
              <h3 className="text-sm font-semibold text-[#1E1B4B] mb-4">Key Metrics</h3>
              <div className="grid grid-cols-4 gap-4">
                <div className="bg-[#F8F7FC] rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="w-4 h-4 text-[#6D28D9]" />
                    <p className="text-xs text-[#64748B]">Ad Spend</p>
                  </div>
                  <p className="text-sm font-bold text-[#1E1B4B]">{formatCurrency(report.metrics!.adSpend)}</p>
                </div>
                <div className="bg-[#F8F7FC] rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Users className="w-4 h-4 text-[#6D28D9]" />
                    <p className="text-xs text-[#64748B]">Leads</p>
                  </div>
                  <p className="text-sm font-bold text-[#1E1B4B]">{report.metrics!.leads}</p>
                </div>
                <div className="bg-[#F8F7FC] rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <DollarSign className="w-4 h-4 text-[#0D9488]" />
                    <p className="text-xs text-[#64748B]">Revenue</p>
                  </div>
                  <p className="text-sm font-bold text-[#1E1B4B]">{formatCurrency(report.metrics!.revenue)}</p>
                </div>
                <div className="bg-[#F8F7FC] rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Wallet className="w-4 h-4 text-[#10B981]" />
                    <p className="text-xs text-[#64748B]">Est. Profit</p>
                  </div>
                  <p className="text-sm font-bold text-[#1E1B4B]">+{formatCurrency(report.metrics!.estimatedProfit)}</p>
                </div>
              </div>
            </div>
          )}

          {hasTakeaways && (
            <div>
              <h3 className="text-sm font-semibold text-[#1E1B4B] mb-4">Key Takeaways</h3>
              <ul className="space-y-2">
                {report.keyTakeaways!.map((takeaway, index) => (
                  <li key={index} className="text-sm text-[#475569] leading-relaxed flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#6D28D9] mt-2 shrink-0" />
                    {takeaway}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {hasChannelData && (
            <div>
              <h3 className="text-sm font-semibold text-[#1E1B4B] mb-4">Channel Performance</h3>
              <div className="space-y-3">
                {report.channelPerformance!.map((channel) => (
                  <div key={channel.channel} className="flex items-center justify-between">
                    <span className="text-sm text-[#475569]">{channel.channel}</span>
                    <span className="text-sm font-semibold text-[#1E1B4B]">{channel.value.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center gap-3 pt-4 border-t border-[#E2E8F0]">
            <button
              type="button"
              onClick={handleExportPDF}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border border-[#E2E8F0] bg-white text-xs font-medium text-[#1E1B4B] hover:bg-slate-50 transition-colors"
            >
              <FileText className="w-4 h-4" />
              Export PDF
            </button>
            <button
              type="button"
              onClick={handleDownloadCSV}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border border-[#E2E8F0] bg-white text-xs font-medium text-[#1E1B4B] hover:bg-slate-50 transition-colors"
            >
              <Download className="w-4 h-4" />
              Download CSV
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
