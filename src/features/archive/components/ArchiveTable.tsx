import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  ChevronsUpDown,
  ChevronUp,
  ChevronDown,
  FileText,
  RotateCcw,
  MoreHorizontal,
  Megaphone,
  FolderKanban,
  ChevronLeft,
  ChevronRight,
  Copy,
  Download,
  Info,
} from 'lucide-react';
import type { ArchiveRecord } from '../archiveService';
import { ArchiveStatusBadge } from './ArchiveStatusBadge';
import { ActionDropdown } from '../../../components/ui/ActionDropdown';

interface ArchiveTableProps {
  records: ArchiveRecord[];
  onViewDetails: (record: ArchiveRecord) => void;
  onRestore: (record: ArchiveRecord) => void;
  onClearFilters?: () => void;
}

type SortField = 'name' | 'type' | 'workspace' | 'archivedDate' | 'archivedBy' | 'previousStatus';

const parseArchivedDate = (dateStr: string): number => {
  if (!dateStr) return 0;
  const parsed = Date.parse(dateStr);
  if (!isNaN(parsed)) return parsed;
  const parts = dateStr.trim().split(/\s+/);
  if (parts.length === 3) {
    const monthMap: Record<string, number> = {
      jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
      jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
    };
    const day = parseInt(parts[0], 10);
    const month = monthMap[parts[1].toLowerCase().slice(0, 3)] ?? 0;
    const year = parseInt(parts[2], 10);
    if (!isNaN(day) && !isNaN(year)) {
      return new Date(year, month, day).getTime();
    }
  }
  return 0;
};

export const ArchiveTable: React.FC<ArchiveTableProps> = ({
  records,
  onViewDetails,
  onRestore,
  onClearFilters,
}) => {
  const [sortField, setSortField] = useState<SortField | null>('archivedDate');
  const [sortAsc, setSortAsc] = useState(false); // Default latest archives first
  const [activeMenuRecordId, setActiveMenuRecordId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const PAGE_SIZE = 10;

  // Close three-dot menu on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setActiveMenuRecordId(null);
      }
    };
    if (activeMenuRecordId) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [activeMenuRecordId]);


  // Sorting
  const sortedRecords = useMemo(() => {
    return [...records].sort((a, b) => {
      if (!sortField) return 0;
      if (sortField === 'archivedDate') {
        const timeA = parseArchivedDate(a.archivedDate);
        const timeB = parseArchivedDate(b.archivedDate);
        return sortAsc ? timeA - timeB : timeB - timeA;
      }
      const valA = (a[sortField] || '').toString();
      const valB = (b[sortField] || '').toString();
      const cmp = valA.localeCompare(valB, undefined, { numeric: true, sensitivity: 'base' });
      return sortAsc ? cmp : -cmp;
    });
  }, [records, sortField, sortAsc]);

  // Pagination calculation
  const totalPages = Math.max(1, Math.ceil(sortedRecords.length / PAGE_SIZE));
  const safePage = Math.min(Math.max(1, currentPage), totalPages);
  const startIndex = (safePage - 1) * PAGE_SIZE;
  const endIndex = Math.min(startIndex + PAGE_SIZE, sortedRecords.length);
  const paginatedRecords = useMemo(() => {
    return sortedRecords.slice(startIndex, endIndex);
  }, [sortedRecords, startIndex, endIndex]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(field === 'archivedDate' ? false : true);
    }
    setCurrentPage(1);
  };

  const getRecordIcon = (type: ArchiveRecord['type']) => {
    switch (type) {
      case 'Campaign':
        return <Megaphone className="w-4 h-4 stroke-[2.2]" />;
      case 'Project':
        return <FolderKanban className="w-4 h-4 stroke-[2.2]" />;
      default:
        return <FileText className="w-4 h-4 stroke-[2.2]" />;
    }
  };

  const handleCopyId = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(id);
    }
    setCopiedId(id);
    setTimeout(() => {
      setCopiedId(null);
      setActiveMenuRecordId(null);
    }, 1500);
  };

  const handleExportMetadata = (record: ArchiveRecord, e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveMenuRecordId(null);
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(record, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `archived-${record.id}-${record.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const renderSortIndicator = (field: SortField) => {
    if (sortField !== field) {
      return <ChevronsUpDown className="w-3.5 h-3.5 text-[#94A3B8]" />;
    }
    return sortAsc ? (
      <ChevronUp className="w-3.5 h-3.5 text-[#6D28D9] stroke-[2.5]" />
    ) : (
      <ChevronDown className="w-3.5 h-3.5 text-[#6D28D9] stroke-[2.5]" />
    );
  };

  return (
    <div className="space-y-4">
      {/* Archive Table Container */}
      <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-xs overflow-hidden">
        <div className="overflow-x-auto min-w-full">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#E2E8F0] bg-[#F8F7FC] text-xs font-semibold text-[#64748B]">
                <th
                  onClick={() => handleSort('name')}
                  className="px-5 py-3.5 cursor-pointer hover:text-[#1E1B4B] transition-colors whitespace-nowrap select-none"
                  aria-sort={sortField === 'name' ? (sortAsc ? 'ascending' : 'descending') : undefined}
                >
                  <div className="flex items-center gap-1.5">
                    <span>Name</span>
                    {renderSortIndicator('name')}
                  </div>
                </th>

                <th
                  onClick={() => handleSort('type')}
                  className="px-4 py-3.5 cursor-pointer hover:text-[#1E1B4B] transition-colors whitespace-nowrap select-none"
                  aria-sort={sortField === 'type' ? (sortAsc ? 'ascending' : 'descending') : undefined}
                >
                  <div className="flex items-center gap-1.5">
                    <span>Record Type</span>
                    {renderSortIndicator('type')}
                  </div>
                </th>

                <th
                  onClick={() => handleSort('workspace')}
                  className="px-4 py-3.5 cursor-pointer hover:text-[#1E1B4B] transition-colors whitespace-nowrap select-none"
                  aria-sort={sortField === 'workspace' ? (sortAsc ? 'ascending' : 'descending') : undefined}
                >
                  <div className="flex items-center gap-1.5">
                    <span>Workspace</span>
                    {renderSortIndicator('workspace')}
                  </div>
                </th>

                <th
                  onClick={() => handleSort('archivedDate')}
                  className="px-4 py-3.5 cursor-pointer hover:text-[#1E1B4B] transition-colors whitespace-nowrap select-none"
                  aria-sort={sortField === 'archivedDate' ? (sortAsc ? 'ascending' : 'descending') : undefined}
                >
                  <div className="flex items-center gap-1.5">
                    <span>Archived Date</span>
                    {renderSortIndicator('archivedDate')}
                  </div>
                </th>

                <th
                  onClick={() => handleSort('archivedBy')}
                  className="px-4 py-3.5 cursor-pointer hover:text-[#1E1B4B] transition-colors whitespace-nowrap select-none"
                  aria-sort={sortField === 'archivedBy' ? (sortAsc ? 'ascending' : 'descending') : undefined}
                >
                  <div className="flex items-center gap-1.5">
                    <span>Archived By</span>
                    {renderSortIndicator('archivedBy')}
                  </div>
                </th>

                <th
                  onClick={() => handleSort('previousStatus')}
                  className="px-4 py-3.5 cursor-pointer hover:text-[#1E1B4B] transition-colors whitespace-nowrap select-none"
                  aria-sort={sortField === 'previousStatus' ? (sortAsc ? 'ascending' : 'descending') : undefined}
                >
                  <div className="flex items-center gap-1.5">
                    <span>Previous Status</span>
                    {renderSortIndicator('previousStatus')}
                  </div>
                </th>

                <th className="px-5 py-3.5 text-right whitespace-nowrap font-semibold">
                  Actions
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-[#F1F5F9] text-xs">
              {paginatedRecords.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-[#64748B]">
                    <div className="max-w-xs mx-auto space-y-3">
                      <div className="w-10 h-10 rounded-full bg-[#F1F5F9] text-[#94A3B8] flex items-center justify-center mx-auto">
                        <Info className="w-5 h-5" />
                      </div>
                      <p className="font-semibold text-sm text-[#1E1B4B]">No archived records found</p>
                      <p className="text-xs text-[#64748B]">
                        Try adjusting your filters, category tab, or search criteria.
                      </p>
                      {onClearFilters && (
                        <button
                          type="button"
                          onClick={onClearFilters}
                          className="px-3 py-1.5 rounded-lg border border-[#E2E8F0] text-xs font-medium text-[#6D28D9] hover:bg-[#F5F3FF] transition-colors"
                        >
                          Reset Filters
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedRecords.map((record) => (
                  <tr
                    key={record.id}
                    className="hover:bg-slate-50/70 transition-colors group"
                  >
                    {/* Name Column */}
                    <td className="px-5 py-3.5 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-[#EDE9FE] text-[#6D28D9] flex items-center justify-center shrink-0">
                          {getRecordIcon(record.type)}
                        </div>
                        <div>
                          <div className="font-bold text-sm text-[#1E1B4B] group-hover:text-[#6D28D9] transition-colors">
                            {record.name}
                          </div>
                          <div className="text-[11px] text-[#64748B] mt-0.5">
                            {record.subtitle}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Record Type Column */}
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <div className="flex items-center gap-1.5 text-xs text-[#1E1B4B] font-medium">
                        <span className="text-[#6D28D9]">
                          {getRecordIcon(record.type)}
                        </span>
                        <span>{record.type}</span>
                      </div>
                    </td>

                    {/* Workspace Column */}
                    <td className="px-4 py-3.5 whitespace-nowrap text-xs text-[#475569]">
                      {record.workspace}
                    </td>

                    {/* Archived Date Column */}
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <div className="text-xs font-medium text-[#1E1B4B]">
                        {record.archivedDate}
                      </div>
                      {record.archivedTime && (
                        <div className="text-[11px] text-[#64748B] mt-0.5">
                          {record.archivedTime}
                        </div>
                      )}
                    </td>

                    {/* Archived By Column */}
                    <td className="px-4 py-3.5 whitespace-nowrap text-xs text-[#1E1B4B]">
                      {record.archivedBy}
                    </td>

                    {/* Previous Status Column */}
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <ArchiveStatusBadge status={record.previousStatus} />
                    </td>

                    {/* Actions Column */}
                    <td className="px-5 py-3.5 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-2 relative">
                        {/* View Details Button */}
                        <button
                          type="button"
                          onClick={() => onViewDetails(record)}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-[#CBD5E1] text-[#475569] hover:text-[#1E1B4B] hover:border-[#94A3B8] hover:bg-slate-50 transition-colors text-xs font-medium"
                          title="View Details"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          <span>View Details</span>
                        </button>

                        {/* Restore Button */}
                        <button
                          type="button"
                          onClick={() => onRestore(record)}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-[#CBD5E1] text-[#475569] hover:text-[#6D28D9] hover:border-[#6D28D9] hover:bg-[#F5F3FF] transition-colors text-xs font-medium"
                          title="Restore Record"
                        >
                          <RotateCcw className="w-3.5 h-3.5 stroke-[2.2]" />
                          <span>Restore</span>
                        </button>

                        {/* Three-dot menu button */}
                        <ActionDropdown
                          isOpen={activeMenuRecordId === record.id}
                          onClose={() => setActiveMenuRecordId(null)}
                          ariaLabel={`Actions for record ${record.name}`}
                          menuWidth={176}
                          className="w-44 py-1.5 text-left text-xs"
                          trigger={
                            <button
                              type="button"
                              onClick={() =>
                                setActiveMenuRecordId(
                                  activeMenuRecordId === record.id ? null : record.id
                                )
                              }
                              className="p-1.5 text-[#94A3B8] hover:text-[#475569] rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                              aria-label="More actions"
                              aria-expanded={activeMenuRecordId === record.id}
                            >
                              <MoreHorizontal className="w-4 h-4" />
                            </button>
                          }
                        >
                          <button
                            type="button"
                            onClick={() => {
                              setActiveMenuRecordId(null);
                              onViewDetails(record);
                            }}
                            className="w-full flex items-center gap-2 px-3.5 py-1.5 text-xs text-[#1E1B4B] hover:bg-[#F5F3FF] hover:text-[#6D28D9] transition-colors cursor-pointer"
                          >
                            <FileText className="w-3.5 h-3.5 text-[#94A3B8]" />
                            <span>View Details</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setActiveMenuRecordId(null);
                              onRestore(record);
                            }}
                            className="w-full flex items-center gap-2 px-3.5 py-1.5 text-xs text-[#6D28D9] font-medium hover:bg-[#F5F3FF] transition-colors cursor-pointer"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span>Restore Record</span>
                          </button>

                          <button
                            type="button"
                            onClick={(e) => handleCopyId(record.id, e)}
                            className="w-full flex items-center gap-2 px-3.5 py-1.5 text-xs text-[#64748B] hover:bg-slate-50 hover:text-[#1E1B4B] transition-colors cursor-pointer"
                          >
                            <Copy className="w-3.5 h-3.5 text-[#94A3B8]" />
                            <span>{copiedId === record.id ? 'Copied ID!' : 'Copy Record ID'}</span>
                          </button>

                          <div className="my-1 border-t border-[#F1F5F9]" />

                          <button
                            type="button"
                            onClick={(e) => handleExportMetadata(record, e)}
                            className="w-full flex items-center gap-2 px-3.5 py-1.5 text-xs text-[#64748B] hover:bg-slate-50 hover:text-[#1E1B4B] transition-colors cursor-pointer"
                          >
                            <Download className="w-3.5 h-3.5 text-[#94A3B8]" />
                            <span>Export Metadata</span>
                          </button>
                        </ActionDropdown>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Footer / Pagination Controls */}
      <div className="flex flex-wrap items-center justify-between text-xs text-[#64748B] pt-1 px-1 gap-2">
        <div>
          Showing {sortedRecords.length > 0 ? `${startIndex + 1}–${endIndex}` : '0'} of{' '}
          {sortedRecords.length} archived records
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            disabled={safePage <= 1}
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            className={`w-7 h-7 rounded-lg border border-[#E2E8F0] flex items-center justify-center text-[#475569] bg-white transition-colors ${
              safePage <= 1 ? 'cursor-not-allowed opacity-50 text-[#94A3B8]' : 'hover:bg-slate-50 hover:text-[#1E1B4B]'
            }`}
            aria-label="Previous page"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>

          {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
            <button
              key={pageNum}
              type="button"
              onClick={() => setCurrentPage(pageNum)}
              className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs transition-colors ${
                safePage === pageNum
                  ? 'bg-[#6D28D9] text-white shadow-xs'
                  : 'border border-[#E2E8F0] bg-white text-[#475569] hover:bg-slate-50'
              }`}
            >
              {pageNum}
            </button>
          ))}

          <button
            type="button"
            disabled={safePage >= totalPages}
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            className={`w-7 h-7 rounded-lg border border-[#E2E8F0] flex items-center justify-center text-[#475569] bg-white transition-colors ${
              safePage >= totalPages ? 'cursor-not-allowed opacity-50 text-[#94A3B8]' : 'hover:bg-slate-50 hover:text-[#1E1B4B]'
            }`}
            aria-label="Next page"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
