import React, { useEffect, useMemo, useRef, useState } from 'react';
import { CheckCircle2, Info, X } from 'lucide-react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { archiveService, type ArchiveRecord } from './archiveService';
import type { ArchiveCategory } from '../../types';
import { ArchiveCategoryTabs } from './components/ArchiveCategoryTabs';
import { ArchiveFilters } from './components/ArchiveFilters';
import { ArchiveTable } from './components/ArchiveTable';
import { RestoreConfirmationModal } from './components/RestoreConfirmationModal';
import { ArchiveDetailsModal } from './components/ArchiveDetailsModal';

function dateFilters(range: string): { from?: string; to?: string } {
  const year = /^Year (\d{4})$/.exec(range)?.[1];
  return year ? { from: `${year}-01-01`, to: `${year}-12-31` } : {};
}

export const ArchivePage: React.FC = () => {
  const { currentWorkspace, hasWorkspace } = useWorkspace();
  const workspaceId = currentWorkspace.id;
  const [records, setRecords] = useState<ArchiveRecord[]>([]);
  const [recordsWorkspaceId, setRecordsWorkspaceId] = useState('');
  const [activeTab, setActiveTab] = useState<ArchiveCategory>('Campaigns');
  const [isTabFilterApplied, setIsTabFilterApplied] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRecordType, setSelectedRecordType] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedDateRange, setSelectedDateRange] = useState('All Time');
  const [selectedRecordForRestore, setSelectedRecordForRestore] = useState<ArchiveRecord | null>(null);
  const [selectedRecordForDetails, setSelectedRecordForDetails] = useState<ArchiveRecord | null>(null);
  const [isRestoreModalOpen, setIsRestoreModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [error, setError] = useState('');
  const [toastMessage, setToastMessage] = useState('');
  const workspaceVersion = useRef(0);

  useEffect(() => {
    const version = ++workspaceVersion.current;
    let active = true;
    setRestoring(false);
    setIsRestoreModalOpen(false);
    setIsDetailsModalOpen(false);
    setSelectedRecordForRestore(null);
    setSelectedRecordForDetails(null);
    if (!workspaceId || !hasWorkspace) {
      setRecords([]);
      setRecordsWorkspaceId('');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    const type = selectedRecordType === 'Project' || selectedRecordType === 'Campaign'
      ? selectedRecordType
      : isTabFilterApplied && (activeTab === 'Projects' || activeTab === 'Campaigns')
        ? activeTab === 'Projects' ? 'Project' : 'Campaign'
        : undefined;
    archiveService.list(workspaceId, {
      search: searchQuery.trim() || undefined,
      type,
      status: selectedStatus === 'all' ? undefined : selectedStatus,
      ...dateFilters(selectedDateRange),
    }).then((result) => {
      if (active && version === workspaceVersion.current) {
        setRecords(result);
        setRecordsWorkspaceId(workspaceId);
      }
    }).catch((cause: unknown) => {
      if (!active || version !== workspaceVersion.current) return;
      setError(cause instanceof Error ? cause.message : 'Unable to load archived records.');
      setRecords([]);
    }).finally(() => {
      if (active && version === workspaceVersion.current) setLoading(false);
    });
    return () => { active = false; };
  }, [workspaceId, hasWorkspace, selectedRecordType, activeTab, isTabFilterApplied, searchQuery, selectedStatus, selectedDateRange]);

  useEffect(() => {
    if (!toastMessage) return;
    const timeout = window.setTimeout(() => setToastMessage(''), 4500);
    return () => window.clearTimeout(timeout);
  }, [toastMessage]);

  const filteredRecords = useMemo(() => (hasWorkspace && recordsWorkspaceId === workspaceId ? records : []).filter((record) => {
    if (isTabFilterApplied && selectedRecordType === 'all' && record.category !== activeTab) return false;
    return true;
  }), [records, recordsWorkspaceId, workspaceId, hasWorkspace, isTabFilterApplied, selectedRecordType, activeTab]);

  const handleTabChange = (tab: ArchiveCategory) => {
    setActiveTab(tab);
    setIsTabFilterApplied(true);
    setSelectedRecordType(tab === 'Projects' ? 'Project' : tab === 'Campaigns' ? 'Campaign' : 'all');
  };

  const handleRecordTypeChange = (type: string) => {
    setSelectedRecordType(type);
    setIsTabFilterApplied(type !== 'all');
    if (type === 'Project') setActiveTab('Projects');
    if (type === 'Campaign') setActiveTab('Campaigns');
  };

  const handleClearFilters = () => {
    setSearchQuery('');
    setSelectedRecordType('all');
    setSelectedStatus('all');
    setSelectedDateRange('All Time');
    setIsTabFilterApplied(false);
  };

  const handleConfirmRestore = async (record: ArchiveRecord) => {
    if (!workspaceId) return;
    const version = workspaceVersion.current;
    setRestoring(true);
    setError('');
    try {
      await archiveService.restore(workspaceId, record);
      if (version !== workspaceVersion.current) return;
      setIsRestoreModalOpen(false);
      setSelectedRecordForRestore(null);
      setIsDetailsModalOpen(false);
      setSelectedRecordForDetails(null);
      setToastMessage(`"${record.name}" was restored to ${record.destination}.`);
      setRecords((previous) => previous.filter((item) => item.id !== record.id));
    } catch (cause) {
      if (version === workspaceVersion.current) setError(cause instanceof Error ? cause.message : 'Unable to restore this record.');
    } finally {
      if (version === workspaceVersion.current) setRestoring(false);
    }
  };

  return <div className="mx-auto max-w-[1400px] space-y-6 pb-12">
    {toastMessage && <div role="status" className="fixed right-8 top-20 z-50 flex items-center gap-3 rounded-xl bg-[#065F46] px-4 py-3 text-sm text-white shadow-xl"><CheckCircle2 className="h-4 w-4 text-[#A7F3D0]" /><span>{toastMessage}</span><button type="button" onClick={() => setToastMessage('')} aria-label="Dismiss notification"><X className="h-4 w-4" /></button></div>}
    <div className="flex items-center gap-2 text-xs text-[#64748B]"><span>System</span><span>/</span><span className="font-medium text-[#6D28D9]">Archive</span></div>
    <header><h1 className="text-2xl font-extrabold tracking-tight text-[#1E1B4B] lg:text-3xl">Archive</h1><p className="mt-1 text-sm text-[#64748B]">Access archived projects and campaigns from the active workspace.</p></header>
    <div className="flex items-center gap-3 rounded-xl border border-[#BFDBFE] bg-[#EFF6FF] px-4 py-3 text-sm font-medium text-[#1E40AF]"><Info className="h-4 w-4 shrink-0 text-[#2563EB]" />Archived projects and campaigns remain in your workspace database and can be restored.</div>
    {!hasWorkspace && <p className="rounded-lg border bg-white p-4 text-sm text-[#64748B]">Select an active workspace to view its archive.</p>}
    {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>}
    {loading && <p role="status" className="text-sm text-[#64748B]">Loading archived records…</p>}
    <ArchiveCategoryTabs activeTab={activeTab} onTabChange={handleTabChange} />
    <ArchiveFilters
      searchQuery={searchQuery}
      onSearchChange={setSearchQuery}
      selectedWorkspace={workspaceId}
      workspaceName={currentWorkspace.name || 'Active workspace'}
      onWorkspaceChange={() => undefined}
      selectedRecordType={selectedRecordType}
      onRecordTypeChange={handleRecordTypeChange}
      selectedStatus={selectedStatus}
      onStatusChange={setSelectedStatus}
      selectedDateRange={selectedDateRange}
      onDateRangeChange={setSelectedDateRange}
    />
    {!loading && activeTab !== 'Reports' && activeTab !== 'Files' && <ArchiveTable
      records={filteredRecords}
      onViewDetails={(record) => { setSelectedRecordForDetails(record); setIsDetailsModalOpen(true); }}
      onRestore={(record) => { setSelectedRecordForRestore(record); setIsRestoreModalOpen(true); }}
      onClearFilters={handleClearFilters}
    />}
    {!loading && (activeTab === 'Reports' || activeTab === 'Files') && <p className="rounded-xl border border-[#E2E8F0] bg-white p-8 text-center text-sm text-[#64748B]">{activeTab === 'Reports' ? 'Saved reports do not currently support archiving.' : 'File archive records are not available from the backend yet.'}</p>}
    <RestoreConfirmationModal
      isOpen={isRestoreModalOpen}
      record={selectedRecordForRestore}
      restoring={restoring}
      onClose={() => { setIsRestoreModalOpen(false); setSelectedRecordForRestore(null); }}
      onConfirm={(record) => void handleConfirmRestore(record)}
    />
    <ArchiveDetailsModal
      isOpen={isDetailsModalOpen}
      record={selectedRecordForDetails}
      onClose={() => { setIsDetailsModalOpen(false); setSelectedRecordForDetails(null); }}
      onRestoreClick={(record) => { setIsDetailsModalOpen(false); setSelectedRecordForRestore(record); setIsRestoreModalOpen(true); }}
    />
  </div>;
};
