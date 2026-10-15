import React, { useState, useMemo, useEffect } from 'react';
import { Info, CheckCircle2, RotateCcw, X } from 'lucide-react';
import { initialArchivedRecords } from '../../data/mock';
import type { ArchivedRecord, ArchiveCategory } from '../../types';
import { ArchiveCategoryTabs } from './components/ArchiveCategoryTabs';
import { ArchiveFilters } from './components/ArchiveFilters';
import { ArchiveTable } from './components/ArchiveTable';
import { RestoreConfirmationModal } from './components/RestoreConfirmationModal';
import { ArchiveDetailsModal } from './components/ArchiveDetailsModal';

const ARCHIVE_STORAGE_KEY = 'marketflow_archived_records_v1';

const getInitialArchivedRecords = (): ArchivedRecord[] => {
  try {
    const stored = localStorage.getItem(ARCHIVE_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn('Unable to retrieve archived records from localStorage:', err);
  }
  return initialArchivedRecords;
};

export const ArchivePage: React.FC = () => {
  // Master archive records in frontend state with persistence
  const [records, setRecords] = useState<ArchivedRecord[]>(getInitialArchivedRecords);

  // Synchronize records with localStorage on modification
  useEffect(() => {
    try {
      localStorage.setItem(ARCHIVE_STORAGE_KEY, JSON.stringify(records));
    } catch (err) {
      console.warn('Unable to persist archived records to localStorage:', err);
    }
  }, [records]);

  // Active Category Tab: starts as 'Campaigns' matching initial view
  const [activeTab, setActiveTab] = useState<ArchiveCategory>('Campaigns');
  // Flag to know if tab was clicked by user to strictly filter by tab category
  const [isTabFilterApplied, setIsTabFilterApplied] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedWorkspace, setSelectedWorkspace] = useState('all');
  const [selectedRecordType, setSelectedRecordType] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedDateRange, setSelectedDateRange] = useState('01 Jan 2024 - 31 Oct 2026');

  // Modals state
  const [selectedRecordForRestore, setSelectedRecordForRestore] = useState<ArchivedRecord | null>(null);
  const [isRestoreModalOpen, setIsRestoreModalOpen] = useState(false);
  const [selectedRecordForDetails, setSelectedRecordForDetails] = useState<ArchivedRecord | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);

  // Feedback Notification Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Handle Tab Click
  const handleTabChange = (tab: ArchiveCategory) => {
    setActiveTab(tab);
    setIsTabFilterApplied(true);
    // If user clicks a tab, also synchronize record type filter
    if (tab === 'Projects') setSelectedRecordType('Project');
    else if (tab === 'Campaigns') setSelectedRecordType('Campaign');
    else if (tab === 'Reports') setSelectedRecordType('Report');
    else if (tab === 'Files') setSelectedRecordType('File Bundle');
  };

  // Handle Record Type dropdown change
  const handleRecordTypeChange = (type: string) => {
    setSelectedRecordType(type);
    if (type === 'all') {
      setIsTabFilterApplied(false);
    } else {
      setIsTabFilterApplied(true);
      if (type === 'Campaign') setActiveTab('Campaigns');
      else if (type === 'Project') setActiveTab('Projects');
      else if (type === 'Report') setActiveTab('Reports');
      else if (type === 'File Bundle') setActiveTab('Files');
    }
  };

  // Filtered records
  const filteredRecords = useMemo(() => {
    return records.filter((record) => {
      // 1. Search Query
      if (searchQuery.trim()) {
        const query = searchQuery.trim().toLowerCase();
        const matchesName = record.name.toLowerCase().includes(query);
        const matchesSubtitle = record.subtitle.toLowerCase().includes(query);
        const matchesWorkspace = record.workspace.toLowerCase().includes(query);
        const matchesBy = record.archivedBy.toLowerCase().includes(query);
        const matchesType = record.type.toLowerCase().includes(query);
        const matchesStatus = record.previousStatus.toLowerCase().includes(query);
        const matchesDestination = record.destination.toLowerCase().includes(query);
        if (
          !matchesName &&
          !matchesSubtitle &&
          !matchesWorkspace &&
          !matchesBy &&
          !matchesType &&
          !matchesStatus &&
          !matchesDestination
        ) {
          return false;
        }
      }

      // 2. Workspace Filter
      if (selectedWorkspace !== 'all' && record.workspace !== selectedWorkspace) {
        return false;
      }

      // 3. Status Filter
      if (selectedStatus !== 'all' && record.previousStatus !== selectedStatus) {
        return false;
      }

      // 4. Record Type Filter (dropdown takes precedence when not 'all')
      if (selectedRecordType !== 'all') {
        if (record.type !== selectedRecordType) return false;
      } else if (isTabFilterApplied) {
        // If tab was clicked explicitly and dropdown is 'all', filter by tab
        if (record.category !== activeTab) return false;
      }

      // 5. Date Filter (support Year filters and range)
      if (selectedDateRange === 'Year 2026' && !record.archivedDate.includes('2026')) {
        return false;
      }
      if (selectedDateRange === 'Year 2025' && !record.archivedDate.includes('2025')) {
        return false;
      }
      if (selectedDateRange === 'Year 2024' && !record.archivedDate.includes('2024')) {
        return false;
      }

      return true;
    });
  }, [
    records,
    searchQuery,
    selectedWorkspace,
    selectedStatus,
    selectedRecordType,
    isTabFilterApplied,
    activeTab,
    selectedDateRange,
  ]);

  // Handle Restore trigger
  const handleTriggerRestore = (record: ArchivedRecord) => {
    setSelectedRecordForRestore(record);
    setIsRestoreModalOpen(true);
  };

  // Handle Restore Confirm
  const handleConfirmRestore = (record: ArchivedRecord) => {
    // Remove from archived records list (persisted via useEffect to localStorage)
    setRecords((prev) => prev.filter((r) => r.id !== record.id));
    setIsRestoreModalOpen(false);
    setSelectedRecordForRestore(null);

    // Show success notification
    setToastMessage(`"${record.name}" has been restored to ${record.destination} successfully.`);
    setTimeout(() => {
      setToastMessage(null);
    }, 4500);
  };

  // Handle Details View
  const handleViewDetails = (record: ArchivedRecord) => {
    setSelectedRecordForDetails(record);
    setIsDetailsModalOpen(true);
  };

  // Handle Clear Filters
  const handleClearFilters = () => {
    setSearchQuery('');
    setSelectedWorkspace('all');
    setSelectedRecordType('all');
    setSelectedStatus('all');
    setSelectedDateRange('01 Jan 2024 - 31 Oct 2026');
    setIsTabFilterApplied(false);
  };

  // Re-seed initial demo records
  const handleResetArchiveData = () => {
    setRecords(initialArchivedRecords);
    handleClearFilters();
    setToastMessage('Archive demo data reset to default records.');
    setTimeout(() => {
      setToastMessage(null);
    }, 3000);
  };

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto pb-12 animate-in fade-in duration-200">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 right-8 z-50 bg-[#065F46] text-white px-4 py-3 rounded-xl shadow-xl flex items-center gap-3 text-xs md:text-sm animate-in slide-in-from-top-4 duration-200">
          <CheckCircle2 className="w-4 h-4 text-[#A7F3D0] shrink-0" />
          <span>{toastMessage}</span>
          <button
            type="button"
            onClick={() => setToastMessage(null)}
            className="ml-2 text-white/80 hover:text-white p-0.5 rounded transition-colors"
            aria-label="Dismiss notification"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-[#64748B]">
        <span>System</span>
        <span className="text-[#94A3B8]">/</span>
        <span className="text-[#6D28D9] font-medium">Archive</span>
      </div>

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-extrabold tracking-tight text-[#1E1B4B]">
            Archive
          </h1>
          <p className="text-sm text-[#64748B] mt-1">
            Access historical marketing records without cluttering active workspaces.
          </p>
        </div>

        {records.length !== initialArchivedRecords.length && (
          <button
            type="button"
            onClick={handleResetArchiveData}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#6D28D9] bg-[#F5F3FF] border border-[#DDD6FE] rounded-lg hover:bg-[#EDE9FE] transition-colors"
            title="Reset restored items back to initial archive for demo testing"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Demo Records</span>
          </button>
        )}
      </div>

      {/* Full-width Light-Blue Information Banner */}
      <div className="bg-[#EFF6FF] border border-[#BFDBFE] rounded-xl px-4 py-3 flex items-center gap-3">
        <Info className="w-4 h-4 text-[#2563EB] shrink-0" />
        <span className="text-xs md:text-sm text-[#1E40AF] font-medium">
          Archived records remain available for reporting and historical comparison. Restoring returns them to active workspace boards.
        </span>
      </div>

      {/* Category Tabs */}
      <ArchiveCategoryTabs activeTab={activeTab} onTabChange={handleTabChange} />

      {/* Filters Bar */}
      <ArchiveFilters
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        selectedWorkspace={selectedWorkspace}
        onWorkspaceChange={setSelectedWorkspace}
        selectedRecordType={selectedRecordType}
        onRecordTypeChange={handleRecordTypeChange}
        selectedStatus={selectedStatus}
        onStatusChange={setSelectedStatus}
        selectedDateRange={selectedDateRange}
        onDateRangeChange={setSelectedDateRange}
      />

      {/* Archive Records Table */}
      <ArchiveTable
        records={filteredRecords}
        onViewDetails={handleViewDetails}
        onRestore={handleTriggerRestore}
        onClearFilters={handleClearFilters}
      />

      {/* Restore Confirmation Modal */}
      <RestoreConfirmationModal
        isOpen={isRestoreModalOpen}
        record={selectedRecordForRestore}
        onClose={() => {
          setIsRestoreModalOpen(false);
          setSelectedRecordForRestore(null);
        }}
        onConfirm={handleConfirmRestore}
      />

      {/* Archive Details Modal */}
      <ArchiveDetailsModal
        isOpen={isDetailsModalOpen}
        record={selectedRecordForDetails}
        onClose={() => {
          setIsDetailsModalOpen(false);
          setSelectedRecordForDetails(null);
        }}
        onRestoreClick={(record) => {
          setIsDetailsModalOpen(false);
          handleTriggerRestore(record);
        }}
      />
    </div>
  );
};
