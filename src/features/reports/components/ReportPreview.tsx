import React from 'react';
import { Eye, FileText, Download } from 'lucide-react';
import { Logo } from '../../../components/ui/Logo';
import { ReportMetrics } from './ReportMetrics';
import { PerformanceLineChart } from './PerformanceLineChart';
import { ChannelBarChart } from './ChannelBarChart';
import type { Report } from '../types';
import { downloadCSV, printReport } from '../utils';

interface ReportPreviewProps {
  report: Report | null;
  onViewDetails: () => void;
}

export const ReportPreview: React.FC<ReportPreviewProps> = ({ report, onViewDetails }) => {
  if (!report) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-12 text-center">
        <div className="w-16 h-16 rounded-full bg-[#F1F5F9] flex items-center justify-center mb-4">
          <FileText className="w-8 h-8 text-[#94A3B8]" />
        </div>
        <h3 className="text-sm font-semibold text-[#1E1B4B] mb-1">No report selected</h3>
        <p className="text-xs text-[#64748B]">Select a report from the table to preview its content.</p>
      </div>
    );
  }

  const handleExportPDF = () => {
    printReport();
  };

  const handleDownloadCSV = () => {
    downloadCSV(report);
  };

  const hasMetrics = report.metrics && Object.keys(report.metrics).length > 0;
  const hasPerformanceData = report.performanceData && report.performanceData.length > 0;
  const hasChannelData = report.channelPerformance && report.channelPerformance.length > 0;
  const hasTakeaways = report.keyTakeaways && report.keyTakeaways.length > 0;

  return (
    <div className="space-y-4">
      {/* Printable / Preview Card */}
      <div className="border border-[#E2E8F0] rounded-xl p-5 bg-white shadow-2xs">
        {/* Header: Logo and Generation Date */}
        <div className="flex items-center justify-between pb-3 border-b border-[#F1F5F9]">
          <Logo className="scale-90 origin-left" />
          <div className="text-right">
            <p className="text-[11px] font-medium text-[#64748B]">Marketing Performance Report</p>
            <p className="text-[10px] text-[#94A3B8]">Generated on {report.createdDate}</p>
          </div>
        </div>

        {/* Title and Metadata */}
        <div className="pt-3 pb-2">
          <h2 className="text-base font-bold text-[#1E1B4B] mb-2">{report.name}</h2>
          
          <div className="flex items-center justify-between text-xs">
            <div>
              <span className="text-[11px] text-[#64748B] block">Campaign</span>
              <span className="text-xs font-semibold text-[#1E1B4B]">{report.campaign || report.project || 'General'}</span>
            </div>
            <div className="text-right">
              <span className="text-[11px] text-[#64748B] block">Reporting Period</span>
              <span className="text-xs font-semibold text-[#1E1B4B]">{report.reportingPeriod}</span>
            </div>
          </div>
        </div>

        {/* Metrics Cards */}
        {hasMetrics && report.metrics && (
          <ReportMetrics metrics={report.metrics} />
        )}

        {/* Performance Graph */}
        {hasPerformanceData && (
          <div className="my-4">
            <h3 className="text-xs font-bold text-[#1E1B4B] mb-2">Performance over time</h3>
            <PerformanceLineChart data={report.performanceData!} />
          </div>
        )}

        {/* Bottom Two Columns: Channels + Takeaways */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          {hasChannelData && (
            <div>
              <h3 className="text-xs font-bold text-[#1E1B4B] mb-2">Channel performance</h3>
              <ChannelBarChart data={report.channelPerformance!} />
            </div>
          )}

          {hasTakeaways && (
            <div className="border border-[#E2E8F0] rounded-xl p-3.5 bg-white">
              <div className="flex items-center gap-1.5 mb-2.5">
                <FileText className="w-3.5 h-3.5 text-[#6D28D9]" />
                <h3 className="text-xs font-bold text-[#1E1B4B]">Key Takeaways</h3>
              </div>
              <ul className="space-y-2">
                {report.keyTakeaways!.map((takeaway, index) => (
                  <li key={index} className="text-[11px] text-[#475569] leading-relaxed flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#6D28D9] mt-1.5 shrink-0" />
                    <span>{takeaway}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-3 pt-1">
        <button
          type="button"
          onClick={onViewDetails}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#6D28D9] hover:bg-[#5B21B6] text-white text-xs font-semibold shadow-xs hover:shadow-md transition-all cursor-pointer"
        >
          <Eye className="w-4 h-4" />
          <span>View Report</span>
        </button>
        <button
          type="button"
          onClick={handleExportPDF}
          className="flex items-center gap-2 px-4 py-2 rounded-lg border border-[#E2E8F0] bg-white text-xs font-semibold text-[#1E1B4B] hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer"
        >
          <FileText className="w-4 h-4 text-[#64748B]" />
          <span>Export PDF</span>
        </button>
        <button
          type="button"
          onClick={handleDownloadCSV}
          className="flex items-center gap-2 px-4 py-2 rounded-lg border border-[#E2E8F0] bg-white text-xs font-semibold text-[#1E1B4B] hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer"
        >
          <Download className="w-4 h-4 text-[#64748B]" />
          <span>Download CSV</span>
        </button>
      </div>
    </div>
  );
};
