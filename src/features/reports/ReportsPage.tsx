import React, { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { ReportTypeCard } from './components/ReportTypeCard';
import { ReportsToolbar } from './components/ReportsToolbar';
import { SavedReportsTable } from './components/SavedReportsTable';
import { ReportPreview } from './components/ReportPreview';
import { ReportCreationModal } from './components/ReportCreationModal';
import { ReportDetailsModal } from './components/ReportDetailsModal';
import type { Report, ReportFilterState, ReportFormData, ReportType } from './types';
import { reportTypeCards, initialReports } from './data';
import { loadReportsFromStorage, saveReportsToStorage, getUniqueCompanies, filterReports } from './utils';

export const ReportsPage: React.FC = () => {
  const { currentWorkspace } = useWorkspace();
  
  const [reports, setReports] = useState<Report[]>(() => {
    const savedReports = loadReportsFromStorage();
    return savedReports.length > 0 ? savedReports : initialReports;
  });
  
  const [selectedReportId, setSelectedReportId] = useState<string | null>(() => {
    const savedReports = loadReportsFromStorage();
    if (savedReports.length > 0) {
      return savedReports[0].id;
    }
    return initialReports.length > 0 ? initialReports[0].id : null;
  });
  
  const [selectedReportType, setSelectedReportType] = useState<ReportType | null>(null);
  const [filters, setFilters] = useState<ReportFilterState>({
    search: '',
    company: 'All companies',
    status: 'All',
  });
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [detailsReport, setDetailsReport] = useState<Report | null>(null);

  useEffect(() => {
    if (reports.length > 0 && reports !== initialReports) {
      saveReportsToStorage(reports);
    }
  }, [reports]);

  const filteredReports = filterReports(reports, filters, currentWorkspace.id);
  const companies = getUniqueCompanies(reports);
  const selectedReport = reports.find((r) => r.id === selectedReportId) || null;

  const handleCreateReport = (data: ReportFormData) => {
    const newReport: Report = {
      id: `report-${Date.now()}`,
      name: data.name,
      type: data.type,
      company: currentWorkspace.name,
      workspaceId: data.workspaceId,
      reportingPeriod: data.reportingPeriod,
      createdBy: 'Sara El Amrani',
      createdDate: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
      status: 'Draft',
      campaign: data.campaign || undefined,
      project: data.project || undefined,
    };

    setReports((prev) => [newReport, ...prev]);
    setSelectedReportId(newReport.id);
    setSelectedReportType(null);
  };

  const handleDeleteReport = (reportId: string) => {
    setReports((prev) => prev.filter((r) => r.id !== reportId));
    if (selectedReportId === reportId) {
      const remaining = reports.filter((r) => r.id !== reportId);
      setSelectedReportId(remaining.length > 0 ? remaining[0].id : null);
    }
  };

  const handleSelectReportType = (type: string | ReportType) => {
    setSelectedReportType(type as ReportType);
    setShowCreateModal(true);
  };

  const handleViewReport = (report: Report) => {
    setDetailsReport(report);
    setShowDetailsModal(true);
  };

  const handleCreateButtonClick = () => {
    setShowCreateModal(true);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-xs text-[#64748B]">
        <span>Insights</span>
        <span>/</span>
        <span className="text-[#64748B]">Reports</span>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-extrabold tracking-tight text-[#1E1B4B]">
            Reports
          </h1>
          <p className="text-sm text-[#64748B] mt-1">
            Create, review and export marketing performance reports.
          </p>
        </div>

        <button
          type="button"
          onClick={handleCreateButtonClick}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#6D28D9] hover:bg-[#5B21B6] text-white text-xs font-semibold shadow-xs hover:shadow-md transition-all self-start sm:self-auto cursor-pointer"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>Create Report</span>
        </button>
      </div>

      {/* 5 Report Type Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {reportTypeCards.map((card) => (
          <ReportTypeCard
            key={card.id}
            card={card}
            isSelected={selectedReportType === card.id}
            onSelect={handleSelectReportType}
          />
        ))}
      </div>

      {/* Main Two-Column Layout */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* Left Column: Saved Reports */}
        <div className="xl:col-span-7 bg-white rounded-xl border border-[#E2E8F0] p-6 shadow-2xs">
          <div className="mb-5">
            <h2 className="text-lg font-bold text-[#1E1B4B] mb-0.5">Saved reports</h2>
            <p className="text-xs text-[#64748B]">View and manage all your marketing reports.</p>
          </div>

          <ReportsToolbar
            filters={filters}
            onFiltersChange={setFilters}
            companies={companies}
          />

          <div className="mt-4">
            <SavedReportsTable
              reports={filteredReports}
              selectedReportId={selectedReportId}
              onSelectReport={setSelectedReportId}
              onDeleteReport={handleDeleteReport}
              onViewReport={handleViewReport}
            />
          </div>
        </div>

        {/* Right Column: Report Preview */}
        <div className="xl:col-span-5 bg-white rounded-xl border border-[#E2E8F0] p-6 shadow-2xs">
          <div className="mb-5">
            <h2 className="text-lg font-bold text-[#1E1B4B] mb-0.5">Report preview</h2>
            <p className="text-xs text-[#64748B]">Preview the selected report content.</p>
          </div>

          <ReportPreview
            report={selectedReport}
            onViewDetails={() => {
              if (selectedReport) {
                handleViewReport(selectedReport);
              }
            }}
          />
        </div>
      </div>

      <ReportCreationModal
        isOpen={showCreateModal}
        onClose={() => {
          setShowCreateModal(false);
          setSelectedReportType(null);
        }}
        onCreateReport={handleCreateReport}
        workspaceId={currentWorkspace.id}
        workspaceName={currentWorkspace.name}
        preselectedType={selectedReportType || undefined}
      />

      <ReportDetailsModal
        isOpen={showDetailsModal}
        onClose={() => {
          setShowDetailsModal(false);
          setDetailsReport(null);
        }}
        report={detailsReport}
      />
    </div>
  );
};
