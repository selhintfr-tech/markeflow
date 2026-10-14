import React, { useState } from 'react';
import {
  ChevronsUpDown,
  FileText,
  RotateCcw,
  MoreHorizontal,
  Megaphone,
  FolderKanban,
  Files,
  ChevronLeft,
  ChevronRight,
  Copy,
  Download,
  Info,
} from 'lucide-react';
import type { ArchivedRecord } from '../../../types';
import { ArchiveStatusBadge } from './ArchiveStatusBadge';

interface ArchiveTableProps {
  records: ArchivedRecord[];
  onViewDetails: (record: ArchivedRecord) => void;
  onRestore: (record: ArchivedRecord) => void;
  onClearFilters?: () => void;
}

type SortField = 'name' | 'type' | 'workspace' | 'archivedDate' | 'archivedBy' | 'previousStatus';

export const ArchiveTable: React.FC<ArchiveTableProps> = ({
  records,
  onViewDetails,
  onRestore,
  onClearFilters,
}) => {
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortAsc, setSortAsc] = useState(true);
  const [activeMenuRecordId, setActiveMenuRecordId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Sorting
  const sortedRecords = [...records].sort((a, b) => {
    if (!sortField) return 0;
    const valA = (a[sortField] || '').toString().toLowerCase();
    const valB = (b[sortField] || '').toString().toLowerCase();
    if (valA < valB) return sortAsc ? -1 : 1;
    if (valA > valB) return sortAsc ? 1 : -1;
    return 0;
  });

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  const getRecordIcon = (type: ArchivedRecord['type']) => {
    switch (type) {
      case 'Campaign':
        return <Megaphone className="w-4 h-4 stroke-[2]" />;
      case 'Project':
        return <FolderKanban className="w-4 h-4 stroke-[2]" />;
      case 'Report':
        return <FileText className="w-4 h-4 stroke-[2]" />;
      case 'File Bundle':
        return <Files className="w-4 h-4 stroke-[2]" />;
      default:
        return <FileText className="w-4 h-4 stroke-[2]" />;
    }
  };

  const handleCopyId = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard?.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
    setActiveMenuRecordId(null);
  };

  return (
    <div className="space-y-4">
      {/* Table Container */}
      <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[11px] font-semibold text-[#64748B] select-none">
                <th
                  onClick={() => handleSort('name')}
                  className="px-5 py-3.5 cursor-pointer hover:text-[#1E1B4B] transition-colors whitespace-nowrap"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Name</span>
                    <ChevronsUpDown className="w-3.5 h-3.5 text-[#94A3B8]" />
                  </div>
                </th>

                <th
                  onClick={() => handleSort('type')}
                  className="px-4 py-3.5 cursor-pointer hover:text-[#1E1B4B] transition-colors whitespace-nowrap"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Record Type</span>
                    <ChevronsUpDown className="w-3.5 h-3.5 text-[#94A3B8]" />
                  </div>
                </th>

                <th
                  onClick={() => handleSort('workspace')}
                  className="px-4 py-3.5 cursor-pointer hover:text-[#1E1B4B] transition-colors whitespace-nowrap"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Workspace</span>
                    <ChevronsUpDown className="w-3.5 h-3.5 text-[#94A3B8]" />
                  </div>
                </th>

                <th
                  onClick={() => handleSort('archivedDate')}
                  className="px-4 py-3.5 cursor-pointer hover:text-[#1E1B4B] transition-colors whitespace-nowrap"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Archived Date</span>
                    <ChevronsUpDown className="w-3.5 h-3.5 text-[#94A3B8]" />
                  </div>
                </th>

                <th
                  onClick={() => handleSort('archivedBy')}
                  className="px-4 py-3.5 cursor-pointer hover:text-[#1E1B4B] transition-colors whitespace-nowrap"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Archived By</span>
                    <ChevronsUpDown className="w-3.5 h-3.5 text-[#94A3B8]" />
                  </div>
                </th>

                <th
                  onClick={() => handleSort('previousStatus')}
                  className="px-4 py-3.5 cursor-pointer hover:text-[#1E1B4B] transition-colors whitespace-nowrap"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Previous Status</span>
                    <ChevronsUpDown className="w-3.5 h-3.5 text-[#94A3B8]" />
                  </div>
                </th>

                <th className="px-5 py-3.5 text-right whitespace-nowrap font-semibold">
                  Actions
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-[#F1F5F9] text-xs">
              {sortedRecords.length === 0 ? (
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
                sortedRecords.map((record) => (
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
                        <div className="relative">
                          <button
                            type="button"
                            onClick={() =>
                              setActiveMenuRecordId(
                                activeMenuRecordId === record.id ? null : record.id
                              )
                            }
                            className="p-1.5 text-[#94A3B8] hover:text-[#475569] rounded-lg hover:bg-slate-100 transition-colors"
                            aria-label="More actions"
                          >
                            <MoreHorizontal className="w-4 h-4" />
                          </button>

                          {/* Popover Menu */}
                          {activeMenuRecordId === record.id && (
                            <div className="absolute right-0 mt-1 w-44 bg-white rounded-xl shadow-lg border border-[#E2E8F0] py-1.5 z-40 animate-in fade-in zoom-in-95 duration-100 text-left">
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveMenuRecordId(null);
                                  onViewDetails(record);
                                }}
                                className="w-full flex items-center gap-2 px-3.5 py-1.5 text-xs text-[#1E1B4B] hover:bg-[#F5F3FF] hover:text-[#6D28D9] transition-colors"
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
                                className="w-full flex items-center gap-2 px-3.5 py-1.5 text-xs text-[#6D28D9] font-medium hover:bg-[#F5F3FF] transition-colors"
                              >
                                <RotateCcw className="w-3.5 h-3.5" />
                                <span>Restore Record</span>
                              </button>

                              <button
                                type="button"
                                onClick={(e) => handleCopyId(record.id, e)}
                                className="w-full flex items-center gap-2 px-3.5 py-1.5 text-xs text-[#64748B] hover:bg-slate-50 hover:text-[#1E1B4B] transition-colors"
                              >
                                <Copy className="w-3.5 h-3.5 text-[#94A3B8]" />
                                <span>{copiedId === record.id ? 'Copied!' : 'Copy Record ID'}</span>
                              </button>

                              <div className="my-1 border-t border-[#F1F5F9]" />

                              <button
                                type="button"
                                onClick={() => {
                                  setActiveMenuRecordId(null);
                                  alert(`Downloading metadata for "${record.name}"...`);
                                }}
                                className="w-full flex items-center gap-2 px-3.5 py-1.5 text-xs text-[#64748B] hover:bg-slate-50 hover:text-[#1E1B4B] transition-colors"
                              >
                                <Download className="w-3.5 h-3.5 text-[#94A3B8]" />
                                <span>Export Metadata</span>
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Footer / Pagination Controls matching Screenshot 1 */}
      <div className="flex items-center justify-between text-xs text-[#64748B] pt-1 px-1">
        <div>
          Showing {sortedRecords.length > 0 ? `1–${sortedRecords.length}` : '0'} of{' '}
          {sortedRecords.length} archived records
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            disabled
            className="w-7 h-7 rounded-lg border border-[#E2E8F0] flex items-center justify-center text-[#94A3B8] bg-white cursor-not-allowed opacity-60"
            aria-label="Previous page"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            className="w-7 h-7 rounded-lg bg-[#6D28D9] text-white flex items-center justify-center font-bold text-xs shadow-xs"
          >
            1
          </button>

          <button
            type="button"
            disabled
            className="w-7 h-7 rounded-lg border border-[#E2E8F0] flex items-center justify-center text-[#94A3B8] bg-white cursor-not-allowed opacity-60"
            aria-label="Next page"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
