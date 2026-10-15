import React, { useState, useMemo, useEffect } from 'react';
import {
  Calendar as CalendarIcon,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Plus,
  Mail,
  Video,
  FileText,
  Share2,
  Globe,
  MoreHorizontal,
  Edit2,
  X,
  Check,
  Trash2,
  RotateCcw,
} from 'lucide-react';
import { initialContentCalendarItems, currentUser } from '../../data/mock';
import type { ContentCalendarItem, ContentPlatform, ContentStatus } from '../../types';

const CALENDAR_STORAGE_KEY = 'marketflow_content_calendar_items_v1';

const getInitialCalendarItems = (): ContentCalendarItem[] => {
  try {
    const saved = localStorage.getItem(CALENDAR_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn('Unable to retrieve calendar items from localStorage:', err);
  }
  return initialContentCalendarItems;
};

export const ContentCalendarPage: React.FC = () => {
  // State
  const [contentItems, setContentItems] = useState<ContentCalendarItem[]>(getInitialCalendarItems);
  const [selectedItemId, setSelectedItemId] = useState<string | null>('content-6');
  const [selectedDate, setSelectedDate] = useState<string>('2026-10-12');
  const [currentYear, setCurrentYear] = useState<number>(2026);
  const [currentMonth, setCurrentMonth] = useState<number>(9); // 0-indexed: 9 = October
  const [viewMode, setViewMode] = useState<'Month' | 'Week' | 'List'>('Month');
  const [selectedPlatformFilter, setSelectedPlatformFilter] = useState<string>('All platforms');
  const [selectedCampaignFilter, setSelectedCampaignFilter] = useState<string>('All campaigns');

  // Modals & UI feedback
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<ContentCalendarItem | null>(null);
  const [isMonthDropdownOpen, setIsMonthDropdownOpen] = useState(false);
  const [isStatusDropdownOpen, setIsStatusDropdownOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Form validation errors
  const [formErrors, setFormErrors] = useState<{ title?: string; date?: string; time?: string }>({});

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    platform: 'Instagram' as ContentPlatform,
    status: 'Approved' as ContentStatus,
    campaign: 'Autumn Launch 2026',
    workspace: 'Atlas Retail SARL',
    date: '2026-10-12',
    time: '10:00 AM',
    caption: '',
    assigneeName: 'Sara El Amrani',
    assigneeRole: 'Marketing Manager',
  });

  // Save changes to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(CALENDAR_STORAGE_KEY, JSON.stringify(contentItems));
    } catch (err) {
      console.warn('Unable to persist calendar items to localStorage:', err);
    }
  }, [contentItems]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Month names
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  // Selected item (falls back to null if no valid item selected or list is empty)
  const selectedItem = useMemo(() => {
    if (!selectedItemId) return null;
    return contentItems.find((i) => i.id === selectedItemId) || null;
  }, [contentItems, selectedItemId]);

  // Helper to format ISO date to readable string
  const formatDisplayDate = (isoDate: string): string => {
    if (!isoDate) return '';
    const parts = isoDate.split('-').map(Number);
    if (parts.length === 3 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2])) {
      const dt = new Date(parts[0], parts[1] - 1, parts[2]);
      return dt.toLocaleDateString('en-GB', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
    }
    return isoDate;
  };

  // Filter content
  const filteredItems = useMemo(() => {
    return contentItems.filter((item) => {
      const matchesPlatform =
        selectedPlatformFilter === 'All platforms' || item.platform === selectedPlatformFilter;
      const matchesCampaign =
        selectedCampaignFilter === 'All campaigns' || item.campaign === selectedCampaignFilter;
      return matchesPlatform && matchesCampaign;
    });
  }, [contentItems, selectedPlatformFilter, selectedCampaignFilter]);

  // Helper for status badge styling
  const getStatusBadgeStyle = (status: ContentStatus) => {
    switch (status) {
      case 'Approved':
        return {
          wrapper: 'bg-[#CCFBF1] text-[#0D9488]',
          dot: 'bg-[#0D9488]',
        };
      case 'Scheduled':
        return {
          wrapper: 'bg-[#EDE9FE] text-[#6D28D9]',
          dot: 'bg-[#6D28D9]',
        };
      case 'In Review':
        return {
          wrapper: 'bg-[#FEF3C7] text-[#D97706]',
          dot: 'bg-[#D97706]',
        };
      case 'Draft':
      default:
        return {
          wrapper: 'bg-[#F1F5F9] text-[#64748B]',
          dot: 'bg-[#94A3B8]',
        };
    }
  };

  // Platform icon helper
  const getPlatformIcon = (platform: ContentPlatform, className = 'w-3.5 h-3.5') => {
    switch (platform) {
      case 'Instagram':
        return (
          <svg className={className} viewBox="0 0 24 24" fill="none" stroke="#E1306C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
            <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
            <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
          </svg>
        );
      case 'Facebook':
        return (
          <svg className={className} viewBox="0 0 24 24" fill="none" stroke="#1877F2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
          </svg>
        );
      case 'Email':
        return <Mail className={`${className} text-[#6D28D9]`} />;
      case 'Meta Ads':
        return (
          <span className={`inline-flex items-center justify-center font-bold text-[10px] text-[#0081FB] ${className}`}>
            &infin;
          </span>
        );
      case 'X':
        return <span className={`inline-flex items-center justify-center font-bold text-[11px] text-black ${className}`}>&#120143;</span>;
      case 'LinkedIn':
        return (
          <svg className={className} viewBox="0 0 24 24" fill="none" stroke="#0A66C2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
            <rect width="4" height="12" x="2" y="9" />
            <circle cx="4" cy="4" r="2" />
          </svg>
        );
      case 'YouTube':
        return (
          <svg className={className} viewBox="0 0 24 24" fill="none" stroke="#FF0000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M2.5 17a24.12 24.12 0 0 1 0-10 2 2 0 0 1 1.4-1.4 49.56 49.56 0 0 1 16.2 0A2 2 0 0 1 21.5 7a24.12 24.12 0 0 1 0 10 2 2 0 0 1-1.4 1.4 49.55 49.55 0 0 1-16.2 0A2 2 0 0 1 2.5 17" />
            <path d="m10 15 5-3-5-3z" />
          </svg>
        );
      case 'Video':
        return <Video className={`${className} text-[#6D28D9]`} />;
      case 'Media':
      case 'Blog':
        return <FileText className={`${className} text-[#0D9488]`} />;
      case 'Website':
        return <Globe className={`${className} text-[#0284C7]`} />;
      default:
        return <Share2 className={`${className} text-[#64748B]`} />;
    }
  };

  // Month navigation
  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  };

  // Week range calculation based on selectedDate
  const currentWeekInfo = useMemo(() => {
    const parts = selectedDate.split('-').map(Number);
    const dateObj = parts.length === 3 ? new Date(parts[0], parts[1] - 1, parts[2]) : new Date(currentYear, currentMonth, 1);
    
    // Day of week: Monday=0 ... Sunday=6
    const dayOfWeek = (dateObj.getDay() + 6) % 7;
    const monday = new Date(dateObj);
    monday.setDate(dateObj.getDate() - dayOfWeek);

    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);

    const formatIso = (d: Date) => {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    };

    const days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const isoStr = formatIso(d);
      return {
        dateStr: isoStr,
        dayNum: d.getDate(),
        dayName: d.toLocaleDateString('en-GB', { weekday: 'short' }),
        isCurrentMonth: d.getMonth() === currentMonth,
        isToday: isoStr === selectedDate,
      };
    });

    const startLabel = monday.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    const endLabel = sunday.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

    return {
      startStr: formatIso(monday),
      endStr: formatIso(sunday),
      displayLabel: `${startLabel} – ${endLabel}`,
      days,
    };
  }, [selectedDate, currentMonth, currentYear]);

  // Week navigation (shifts by 7 days)
  const handlePrevWeek = () => {
    const parts = selectedDate.split('-').map(Number);
    const dateObj = new Date(parts[0], parts[1] - 1, parts[2]);
    dateObj.setDate(dateObj.getDate() - 7);
    const y = dateObj.getFullYear();
    const m = dateObj.getMonth();
    const d = String(dateObj.getDate()).padStart(2, '0');
    const newIso = `${y}-${String(m + 1).padStart(2, '0')}-${d}`;
    setSelectedDate(newIso);
    setCurrentYear(y);
    setCurrentMonth(m);
  };

  const handleNextWeek = () => {
    const parts = selectedDate.split('-').map(Number);
    const dateObj = new Date(parts[0], parts[1] - 1, parts[2]);
    dateObj.setDate(dateObj.getDate() + 7);
    const y = dateObj.getFullYear();
    const m = dateObj.getMonth();
    const d = String(dateObj.getDate()).padStart(2, '0');
    const newIso = `${y}-${String(m + 1).padStart(2, '0')}-${d}`;
    setSelectedDate(newIso);
    setCurrentYear(y);
    setCurrentMonth(m);
  };

  // Month grid day generation (5 or 6 weeks depending on days in month)
  const calendarDays = useMemo(() => {
    const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
    const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0);

    // Monday is 0, Sunday is 6
    const startDayIndex = (firstDayOfMonth.getDay() + 6) % 7;

    const days: Array<{
      dateStr: string;
      dayNum: number;
      isCurrentMonth: boolean;
      isSelected: boolean;
    }> = [];

    // Previous month padding
    const prevMonthLastDate = new Date(currentYear, currentMonth, 0).getDate();
    for (let i = startDayIndex - 1; i >= 0; i--) {
      const dayNum = prevMonthLastDate - i;
      const prevM = currentMonth === 0 ? 11 : currentMonth - 1;
      const prevY = currentMonth === 0 ? currentYear - 1 : currentYear;
      const dateStr = `${prevY}-${String(prevM + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
      days.push({
        dateStr,
        dayNum,
        isCurrentMonth: false,
        isSelected: dateStr === selectedDate,
      });
    }

    // Current month days
    for (let d = 1; d <= lastDayOfMonth.getDate(); d++) {
      const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      days.push({
        dateStr,
        dayNum: d,
        isCurrentMonth: true,
        isSelected: dateStr === selectedDate,
      });
    }

    // Next month padding to fill complete weeks (35 or 42 cells)
    const targetCells = days.length > 35 ? 42 : 35;
    const remainingDays = targetCells - days.length;
    for (let d = 1; d <= remainingDays; d++) {
      const nextM = currentMonth === 11 ? 0 : currentMonth + 1;
      const nextY = currentMonth === 11 ? currentYear + 1 : currentYear;
      const dateStr = `${nextY}-${String(nextM + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      days.push({
        dateStr,
        dayNum: d,
        isCurrentMonth: false,
        isSelected: dateStr === selectedDate,
      });
    }

    return days;
  }, [currentYear, currentMonth, selectedDate]);

  // Modal open helpers
  const handleOpenCreate = (prefilledDate?: string) => {
    setFormErrors({});
    const targetDate = prefilledDate || selectedDate || '2026-10-12';
    setFormData({
      title: '',
      platform: 'Instagram',
      status: 'Scheduled',
      campaign: 'Autumn Launch 2026',
      workspace: 'Atlas Retail SARL',
      date: targetDate,
      time: '10:00 AM',
      caption: '',
      assigneeName: currentUser?.name || 'Sara El Amrani',
      assigneeRole: 'Marketing Manager',
    });
    setIsCreateOpen(true);
  };

  const handleOpenEdit = (item: ContentCalendarItem) => {
    setFormErrors({});
    setFormData({
      title: item.title,
      platform: item.platform,
      status: item.status,
      campaign: item.campaign,
      workspace: item.workspace,
      date: item.date,
      time: item.time || '10:00 AM',
      caption: item.caption,
      assigneeName: item.assignedTo.name,
      assigneeRole: item.assignedTo.role,
    });
    setIsEditOpen(true);
  };

  const handleTriggerDelete = (item: ContentCalendarItem) => {
    setItemToDelete(item);
    setIsDeleteOpen(true);
  };

  const handleConfirmDelete = () => {
    if (!itemToDelete) return;
    const deletedTitle = itemToDelete.title;
    setContentItems((prev) => prev.filter((i) => i.id !== itemToDelete.id));
    if (selectedItemId === itemToDelete.id) {
      setSelectedItemId(null);
    }
    setIsDeleteOpen(false);
    setIsEditOpen(false);
    setItemToDelete(null);
    showToast(`Deleted "${deletedTitle}" from calendar.`);
  };

  // Quick status change from detail panel
  const handleQuickStatusChange = (newStatus: ContentStatus) => {
    if (!selectedItem) return;
    const updated: ContentCalendarItem = {
      ...selectedItem,
      status: newStatus,
    };
    setContentItems((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
    setIsStatusDropdownOpen(false);
    showToast(`Status updated to ${newStatus}`);
  };

  // Save new content item
  const handleSaveCreate = (e: React.FormEvent) => {
    e.preventDefault();
    const errors: { title?: string; date?: string; time?: string } = {};

    if (!formData.title.trim()) {
      errors.title = 'Title is required.';
    }
    if (!formData.date || !/^\d{4}-\d{2}-\d{2}$/.test(formData.date)) {
      errors.date = 'Valid date (YYYY-MM-DD) is required.';
    }
    if (!formData.time.trim()) {
      errors.time = 'Time is required.';
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    const newItem: ContentCalendarItem = {
      id: `content-${Date.now()}`,
      title: formData.title.trim(),
      date: formData.date,
      time: formData.time.trim(),
      platform: formData.platform,
      status: formData.status,
      campaign: formData.campaign,
      workspace: formData.workspace,
      caption: formData.caption.trim(),
      assignedTo: {
        name: formData.assigneeName,
        initials: formData.assigneeName
          .split(' ')
          .map((n) => n[0])
          .join('')
          .toUpperCase(),
        role: formData.assigneeRole,
      },
      attachments: [
        {
          id: `att-${Date.now()}-1`,
          name: 'content-asset-draft.png',
          size: '1.4 MB',
          type: 'Image',
        },
      ],
    };

    setContentItems((prev) => [...prev, newItem]);
    setSelectedItemId(newItem.id);
    setSelectedDate(newItem.date);

    // Sync month/year view to the created item
    const [y, m] = newItem.date.split('-').map(Number);
    if (!isNaN(y) && !isNaN(m)) {
      setCurrentYear(y);
      setCurrentMonth(m - 1);
    }

    setIsCreateOpen(false);
    showToast(`Added "${newItem.title}" on ${newItem.date}`);
  };

  // Save edited content item
  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem) return;

    const errors: { title?: string; date?: string; time?: string } = {};

    if (!formData.title.trim()) {
      errors.title = 'Title cannot be blank.';
    }
    if (!formData.date || !/^\d{4}-\d{2}-\d{2}$/.test(formData.date)) {
      errors.date = 'Valid date (YYYY-MM-DD) is required.';
    }
    if (!formData.time.trim()) {
      errors.time = 'Time is required.';
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    const updated: ContentCalendarItem = {
      ...selectedItem,
      title: formData.title.trim(),
      platform: formData.platform,
      status: formData.status,
      campaign: formData.campaign,
      workspace: formData.workspace,
      date: formData.date,
      time: formData.time.trim(),
      caption: formData.caption.trim(),
      assignedTo: {
        name: formData.assigneeName,
        initials: formData.assigneeName
          .split(' ')
          .map((n) => n[0])
          .join('')
          .toUpperCase(),
        role: formData.assigneeRole,
      },
    };

    setContentItems((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
    setSelectedDate(updated.date);

    // Sync month/year if date was changed
    const [y, m] = updated.date.split('-').map(Number);
    if (!isNaN(y) && !isNaN(m)) {
      setCurrentYear(y);
      setCurrentMonth(m - 1);
    }

    setIsEditOpen(false);
    showToast(`Saved changes to "${updated.title}"`);
  };

  // Reset calendar demo data
  const handleResetCalendarData = () => {
    setContentItems(initialContentCalendarItems);
    setSelectedItemId('content-6');
    setSelectedDate('2026-10-12');
    setCurrentYear(2026);
    setCurrentMonth(9);
    setSelectedPlatformFilter('All platforms');
    setSelectedCampaignFilter('All campaigns');
    showToast('Calendar data reset to initial mock schedule.');
  };

  // Clear filters
  const handleClearFilters = () => {
    setSelectedPlatformFilter('All platforms');
    setSelectedCampaignFilter('All campaigns');
  };

  // Escape key handler for open modals
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsCreateOpen(false);
        setIsEditOpen(false);
        setIsDeleteOpen(false);
        setIsMonthDropdownOpen(false);
        setIsStatusDropdownOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto pb-12 font-sans animate-in fade-in duration-200">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#1E1B4B] text-white px-4 py-2.5 rounded-lg shadow-xl text-sm flex items-center gap-2 border border-slate-700 animate-in slide-in-from-bottom-2 duration-200">
          <Check className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
          <button
            type="button"
            onClick={() => setToastMessage(null)}
            className="ml-2 text-slate-400 hover:text-white"
            aria-label="Dismiss toast"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-xs text-[#64748B]">
        <span>Management</span>
        <span>/</span>
        <span className="text-[#6D28D9] font-medium">Content Calendar</span>
      </div>

      {/* Page Title & Subtitle */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-extrabold tracking-tight text-[#1E1B4B]">
            Content Calendar
          </h1>
          <p className="text-sm text-[#64748B] mt-1">
            Plan, coordinate, and review marketing publications across all channels.
          </p>
        </div>

        {contentItems.length !== initialContentCalendarItems.length && (
          <button
            type="button"
            onClick={handleResetCalendarData}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#6D28D9] bg-[#F5F3FF] border border-[#DDD6FE] rounded-lg hover:bg-[#EDE9FE] transition-colors"
            title="Reset calendar events back to initial mock records"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Demo Schedule</span>
          </button>
        )}
      </div>

      {/* Toolbar */}
      <div className="bg-white rounded-xl border border-[#E2E8F0] p-4 shadow-xs flex flex-wrap items-center justify-between gap-4">
        {/* Left Toolbar Controls */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Month / Week Navigation Controls */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={viewMode === 'Week' ? handlePrevWeek : handlePrevMonth}
              className="p-1.5 rounded-lg border border-[#E2E8F0] text-[#64748B] hover:text-[#1E1B4B] hover:bg-slate-50 transition-colors"
              title={viewMode === 'Week' ? 'Previous Week' : 'Previous Month'}
              aria-label={viewMode === 'Week' ? 'Previous Week' : 'Previous Month'}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            {/* Dropdown for Month / Header Display */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsMonthDropdownOpen(!isMonthDropdownOpen)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[#E2E8F0] bg-white text-xs font-semibold text-[#1E1B4B] hover:bg-slate-50 transition-colors"
                aria-expanded={isMonthDropdownOpen}
                aria-label="Select month"
              >
                <CalendarIcon className="w-3.5 h-3.5 text-[#6D28D9]" />
                <span>
                  {monthNames[currentMonth]} {currentYear}
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-[#94A3B8]" />
              </button>

              {isMonthDropdownOpen && (
                <div className="absolute left-0 mt-1.5 w-44 rounded-lg bg-white border border-[#E2E8F0] shadow-xl py-1 z-40 max-h-56 overflow-y-auto animate-in fade-in zoom-in-95 duration-100">
                  {monthNames.map((m, idx) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => {
                        setCurrentMonth(idx);
                        setIsMonthDropdownOpen(false);
                      }}
                      className={`w-full text-left px-3 py-1.5 text-xs hover:bg-slate-50 ${
                        currentMonth === idx ? 'text-[#6D28D9] font-bold bg-[#F5F3FF]' : 'text-[#1E1B4B]'
                      }`}
                    >
                      {m} {currentYear}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={viewMode === 'Week' ? handleNextWeek : handleNextMonth}
              className="p-1.5 rounded-lg border border-[#E2E8F0] text-[#64748B] hover:text-[#1E1B4B] hover:bg-slate-50 transition-colors"
              title={viewMode === 'Week' ? 'Next Week' : 'Next Month'}
              aria-label={viewMode === 'Week' ? 'Next Week' : 'Next Month'}
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* View Switcher: Month / Week / List */}
          <div className="flex items-center bg-[#F8F7FC] p-1 rounded-lg border border-[#E2E8F0]">
            {(['Month', 'Week', 'List'] as const).map((view) => (
              <button
                key={view}
                type="button"
                onClick={() => setViewMode(view)}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                  viewMode === view
                    ? 'bg-[#EDE9FE] text-[#6D28D9] font-semibold shadow-2xs'
                    : 'text-[#64748B] hover:text-[#1E1B4B]'
                }`}
              >
                {view}
              </button>
            ))}
          </div>

          {/* Platform Filter */}
          <div className="relative min-w-[130px]">
            <select
              value={selectedPlatformFilter}
              onChange={(e) => setSelectedPlatformFilter(e.target.value)}
              className="w-full appearance-none pl-3 pr-8 py-1.5 text-xs rounded-lg border border-[#E2E8F0] bg-white text-[#1E1B4B] focus:outline-none focus:ring-1 focus:ring-[#6D28D9] focus:border-[#6D28D9] cursor-pointer"
            >
              <option value="All platforms">All platforms</option>
              <option value="Instagram">Instagram</option>
              <option value="Facebook">Facebook</option>
              <option value="Email">Email</option>
              <option value="Meta Ads">Meta Ads</option>
              <option value="X">X</option>
              <option value="LinkedIn">LinkedIn</option>
              <option value="YouTube">YouTube</option>
              <option value="Blog">Blog</option>
              <option value="Website">Website</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-[#94A3B8] absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Campaign Filter */}
          <div className="relative min-w-[160px]">
            <select
              value={selectedCampaignFilter}
              onChange={(e) => setSelectedCampaignFilter(e.target.value)}
              className="w-full appearance-none pl-3 pr-8 py-1.5 text-xs rounded-lg border border-[#E2E8F0] bg-white text-[#1E1B4B] focus:outline-none focus:ring-1 focus:ring-[#6D28D9] focus:border-[#6D28D9] cursor-pointer"
            >
              <option value="All campaigns">All campaigns</option>
              <option value="Autumn Launch 2026">Autumn Launch 2026</option>
              <option value="Retargeting Boost">Retargeting Boost</option>
              <option value="Holiday Season Push">Holiday Season Push</option>
              <option value="Brand Awareness Q4">Brand Awareness Q4</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-[#94A3B8] absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Active filter count indicator */}
          {(selectedPlatformFilter !== 'All platforms' || selectedCampaignFilter !== 'All campaigns') && (
            <button
              type="button"
              onClick={handleClearFilters}
              className="text-xs text-[#6D28D9] hover:underline flex items-center gap-1 font-medium"
            >
              <span>Reset filters</span>
            </button>
          )}
        </div>

        {/* Right: + Create Content primary CTA */}
        <button
          type="button"
          onClick={() => handleOpenCreate()}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#6D28D9] hover:bg-[#5B21B6] text-white text-xs font-semibold shadow-xs transition-colors shrink-0"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>Create Content</span>
        </button>
      </div>

      {/* Main Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* LEFT PANEL: Calendar (2/3 width) */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-[#E2E8F0] p-6 shadow-xs min-h-[660px]">
          {/* MONTH VIEW */}
          {viewMode === 'Month' && (
            <div>
              {/* Weekday headers: Mon | Tue | Wed | Thu | Fri | Sat | Sun */}
              <div className="grid grid-cols-7 border-b border-[#E2E8F0] pb-3 mb-2 text-center text-xs font-semibold text-[#64748B]">
                <div>Mon</div>
                <div>Tue</div>
                <div>Wed</div>
                <div>Thu</div>
                <div>Fri</div>
                <div>Sat</div>
                <div>Sun</div>
              </div>

              {/* Month Day Cells Grid */}
              <div className="grid grid-cols-7 border-t border-l border-[#F1F5F9]">
                {calendarDays.map((day, idx) => {
                  const dayEvents = filteredItems.filter((item) => item.date === day.dateStr);
                  const isSelectedDay = day.dateStr === selectedDate;

                  return (
                    <div
                      key={idx}
                      onClick={() => {
                        setSelectedDate(day.dateStr);
                        if (dayEvents.length > 0) {
                          setSelectedItemId(dayEvents[0].id);
                        }
                      }}
                      className={`min-h-[110px] p-2 border-r border-b border-[#F1F5F9] transition-all cursor-pointer relative flex flex-col justify-between ${
                        isSelectedDay
                          ? 'bg-[#F5F3FF] ring-2 ring-[#6D28D9] ring-inset z-10 rounded-sm'
                          : day.isCurrentMonth
                          ? 'bg-white hover:bg-slate-50/70'
                          : 'bg-[#F8F7FC]/60 text-[#CBD5E1]'
                      }`}
                    >
                      {/* Day Number Header */}
                      <div className="flex items-center justify-between">
                        <span
                          className={`text-xs font-medium ${
                            isSelectedDay
                              ? 'text-[#6D28D9] font-bold'
                              : day.isCurrentMonth
                              ? 'text-[#475569]'
                              : 'text-[#CBD5E1]'
                          }`}
                        >
                          {day.dayNum}
                        </span>

                        {/* Quick Add button on hover */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedDate(day.dateStr);
                            handleOpenCreate(day.dateStr);
                          }}
                          className="opacity-0 hover:opacity-100 group-hover:opacity-100 p-0.5 text-[#94A3B8] hover:text-[#6D28D9] rounded transition-opacity"
                          title={`Schedule content for ${day.dateStr}`}
                          aria-label={`Schedule content for ${day.dateStr}`}
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>

                      {/* Day Events */}
                      <div className="mt-1 space-y-1.5 flex-1 overflow-hidden">
                        {dayEvents.slice(0, 3).map((ev) => {
                          const isEvSelected = ev.id === selectedItemId;
                          const badgeStyle = getStatusBadgeStyle(ev.status);

                          return (
                            <div
                              key={ev.id}
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedItemId(ev.id);
                                setSelectedDate(ev.date);
                              }}
                              className={`p-1.5 rounded-lg border text-[11px] transition-all ${
                                isEvSelected
                                  ? 'bg-white border-[#6D28D9] shadow-xs ring-1 ring-[#6D28D9]'
                                  : 'bg-white/90 border-[#E2E8F0] hover:border-[#CBD5E1]'
                              }`}
                            >
                              {/* Platform Icon & Title */}
                              <div className="flex items-center gap-1.5 mb-1">
                                {getPlatformIcon(ev.platform, 'w-3 h-3 shrink-0')}
                                <span className="font-semibold text-[#1E1B4B] truncate max-w-[85px] leading-tight">
                                  {ev.title}
                                </span>
                              </div>

                              {/* Status Badge */}
                              <div className="flex items-center">
                                <span
                                  className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium leading-none ${badgeStyle.wrapper}`}
                                >
                                  <span className={`w-1 h-1 rounded-full ${badgeStyle.dot}`} />
                                  {ev.status}
                                </span>
                              </div>
                            </div>
                          );
                        })}

                        {dayEvents.length > 3 && (
                          <div className="text-[10px] font-semibold text-[#6D28D9] text-center pt-0.5">
                            +{dayEvents.length - 3} more
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {filteredItems.length === 0 && (
                <div className="mt-6 p-4 rounded-xl bg-[#F8F7FC] border border-[#E2E8F0] text-center text-xs text-[#64748B]">
                  No content matches your active filters. Click <button type="button" onClick={handleClearFilters} className="text-[#6D28D9] font-semibold underline">Reset filters</button> to view all items.
                </div>
              )}
            </div>
          )}

          {/* WEEK VIEW (Dynamic Monday - Sunday) */}
          {viewMode === 'Week' && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#E2E8F0] pb-3">
                <div className="text-xs font-bold text-[#1E1B4B] flex items-center gap-2">
                  <CalendarIcon className="w-4 h-4 text-[#6D28D9]" />
                  <span>Weekly Overview: {currentWeekInfo.displayLabel}</span>
                </div>
                <div className="text-xs text-[#64748B]">
                  {filteredItems.filter((i) => i.date >= currentWeekInfo.startStr && i.date <= currentWeekInfo.endStr).length} publications scheduled
                </div>
              </div>

              {/* 7 Days Agenda Grid */}
              <div className="space-y-3">
                {currentWeekInfo.days.map((day) => {
                  const dayEvents = filteredItems.filter((item) => item.date === day.dateStr);
                  const isSelected = day.dateStr === selectedDate;

                  return (
                    <div
                      key={day.dateStr}
                      className={`p-3.5 rounded-xl border transition-all ${
                        isSelected
                          ? 'border-[#6D28D9] bg-[#F5F3FF]/40'
                          : 'border-[#E2E8F0] bg-white hover:border-[#CBD5E1]'
                      }`}
                    >
                      {/* Day Header */}
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className={`text-xs font-bold uppercase tracking-wider ${isSelected ? 'text-[#6D28D9]' : 'text-[#64748B]'}`}>
                            {day.dayName}
                          </span>
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-md ${isSelected ? 'bg-[#6D28D9] text-white' : 'bg-slate-100 text-[#1E1B4B]'}`}>
                            {day.dayNum}
                          </span>
                          <span className="text-[11px] text-[#94A3B8]">
                            {day.dateStr}
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            setSelectedDate(day.dateStr);
                            handleOpenCreate(day.dateStr);
                          }}
                          className="inline-flex items-center gap-1 text-[11px] font-medium text-[#6D28D9] hover:underline"
                        >
                          <Plus className="w-3 h-3" />
                          <span>Add for {day.dayName}</span>
                        </button>
                      </div>

                      {/* Day Events list or empty */}
                      {dayEvents.length === 0 ? (
                        <div className="text-[11px] text-[#94A3B8] italic py-1 pl-1">
                          No content scheduled for this day
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                          {dayEvents.map((item) => (
                            <div
                              key={item.id}
                              onClick={() => {
                                setSelectedItemId(item.id);
                                setSelectedDate(item.date);
                              }}
                              className={`p-2.5 rounded-lg border flex items-center justify-between cursor-pointer transition-all ${
                                item.id === selectedItemId
                                  ? 'bg-white border-[#6D28D9] shadow-xs ring-1 ring-[#6D28D9]'
                                  : 'bg-white border-[#E2E8F0] hover:bg-slate-50'
                              }`}
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div className="p-1.5 bg-slate-50 rounded border border-[#E2E8F0] shrink-0">
                                  {getPlatformIcon(item.platform, 'w-3.5 h-3.5')}
                                </div>
                                <div className="min-w-0">
                                  <div className="text-xs font-bold text-[#1E1B4B] truncate">{item.title}</div>
                                  <div className="text-[10px] text-[#64748B]">
                                    {item.time || '10:00 AM'} &bull; {item.campaign}
                                  </div>
                                </div>
                              </div>
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-medium shrink-0 ml-2 ${
                                  getStatusBadgeStyle(item.status).wrapper
                                }`}
                              >
                                {item.status}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* LIST VIEW */}
          {viewMode === 'List' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs font-semibold text-[#64748B] mb-2">
                <span>All Scheduled & Planned Content ({filteredItems.length})</span>
                <span>Sorted chronologically</span>
              </div>

              {filteredItems.length === 0 ? (
                <div className="py-16 text-center space-y-3">
                  <div className="w-12 h-12 rounded-full bg-[#F5F3FF] text-[#6D28D9] flex items-center justify-center mx-auto">
                    <CalendarIcon className="w-6 h-6" />
                  </div>
                  <p className="font-semibold text-sm text-[#1E1B4B]">No content items found</p>
                  <p className="text-xs text-[#64748B]">Try clearing your search or platform filters, or create a new campaign post.</p>
                  <div className="flex items-center justify-center gap-3 pt-2">
                    <button
                      type="button"
                      onClick={handleClearFilters}
                      className="px-3 py-1.5 text-xs rounded-lg border border-[#E2E8F0] text-[#6D28D9] hover:bg-[#F5F3FF]"
                    >
                      Clear Filters
                    </button>
                    <button
                      type="button"
                      onClick={() => handleOpenCreate()}
                      className="px-3 py-1.5 text-xs rounded-lg bg-[#6D28D9] text-white hover:bg-[#5B21B6]"
                    >
                      + Create Content
                    </button>
                  </div>
                </div>
              ) : (
                <div className="divide-y divide-[#F1F5F9] border border-[#E2E8F0] rounded-xl overflow-hidden">
                  {[...filteredItems]
                    .sort((a, b) => a.date.localeCompare(b.date) || (a.time || '').localeCompare(b.time || ''))
                    .map((item) => (
                      <div
                        key={item.id}
                        onClick={() => {
                          setSelectedItemId(item.id);
                          setSelectedDate(item.date);
                        }}
                        className={`py-3.5 px-4 flex items-center justify-between cursor-pointer transition-colors ${
                          item.id === selectedItemId
                            ? 'bg-[#F5F3FF] text-[#6D28D9]'
                            : 'bg-white hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center gap-3.5">
                          <div className="p-2 bg-white rounded-lg border border-[#E2E8F0] shadow-2xs">
                            {getPlatformIcon(item.platform, 'w-4 h-4')}
                          </div>
                          <div>
                            <div className="text-xs font-bold text-[#1E1B4B]">{item.title}</div>
                            <div className="text-[11px] text-[#64748B] mt-0.5">
                              {formatDisplayDate(item.date)} at {item.time || '10:00 AM'} &bull; {item.platform} &bull; {item.campaign}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                              getStatusBadgeStyle(item.status).wrapper
                            }`}
                          >
                            {item.status}
                          </span>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* RIGHT PANEL: Selected Content Details (1/3 width) */}
        {selectedItem ? (
          <div className="bg-white rounded-xl border border-[#E2E8F0] p-6 shadow-xs flex flex-col justify-between min-h-[660px]">
            <div>
              {/* Header: Platform Icon + Status Selector + Delete / Edit */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-slate-50 border border-[#E2E8F0]">
                    {getPlatformIcon(selectedItem.platform, 'w-5 h-5')}
                  </div>

                  {/* Status Dropdown */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setIsStatusDropdownOpen(!isStatusDropdownOpen)}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold transition-all ${
                        getStatusBadgeStyle(selectedItem.status).wrapper
                      }`}
                      title="Click to change status"
                      aria-expanded={isStatusDropdownOpen}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          getStatusBadgeStyle(selectedItem.status).dot
                        }`}
                      />
                      <span>{selectedItem.status}</span>
                      <ChevronDown className="w-3 h-3 ml-0.5 opacity-60" />
                    </button>

                    {isStatusDropdownOpen && (
                      <div className="absolute left-0 mt-1 w-32 bg-white rounded-xl shadow-lg border border-[#E2E8F0] py-1 z-30 animate-in fade-in zoom-in-95 duration-100">
                        {(['Draft', 'In Review', 'Approved', 'Scheduled'] as ContentStatus[]).map((st) => (
                          <button
                            key={st}
                            type="button"
                            onClick={() => handleQuickStatusChange(st)}
                            className={`w-full text-left px-3 py-1.5 text-xs hover:bg-slate-50 flex items-center gap-2 ${
                              selectedItem.status === st ? 'text-[#6D28D9] font-bold bg-[#F5F3FF]' : 'text-[#1E1B4B]'
                            }`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${getStatusBadgeStyle(st).dot}`} />
                            <span>{st}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Right header actions: Edit & Delete buttons */}
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => handleOpenEdit(selectedItem)}
                    className="p-1.5 text-[#64748B] hover:text-[#6D28D9] rounded-lg hover:bg-[#F5F3FF] transition-colors"
                    title="Edit content"
                    aria-label="Edit content"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleTriggerDelete(selectedItem)}
                    className="p-1.5 text-[#64748B] hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
                    title="Delete content"
                    aria-label="Delete content"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Title & Dynamic Date */}
              <div className="mt-4">
                <h2 className="text-base font-bold text-[#1E1B4B]">{selectedItem.title}</h2>
                <div className="flex items-center gap-1.5 text-xs text-[#64748B] mt-1.5">
                  <CalendarIcon className="w-3.5 h-3.5 text-[#6D28D9]" />
                  <span>
                    {formatDisplayDate(selectedItem.date)} &bull; {selectedItem.time || '10:00 AM'}
                  </span>
                </div>
              </div>

              {/* Metadata rows */}
              <div className="mt-5 space-y-2.5 text-xs border-t border-[#F1F5F9] pt-4">
                <div className="flex items-center justify-between">
                  <span className="text-[#64748B]">Campaign</span>
                  <div className="flex items-center gap-1.5 text-[#6D28D9] font-medium">
                    <FileText className="w-3.5 h-3.5 text-[#6D28D9]" />
                    <span>{selectedItem.campaign}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-[#64748B]">Platform</span>
                  <div className="flex items-center gap-1.5 text-[#1E1B4B] font-medium">
                    {getPlatformIcon(selectedItem.platform, 'w-3.5 h-3.5')}
                    <span>{selectedItem.platform}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-[#64748B]">Workspace</span>
                  <div className="flex items-center gap-1.5 text-[#1E1B4B] font-medium">
                    <span className="text-xs">&#127970;</span>
                    <span>{selectedItem.workspace}</span>
                  </div>
                </div>
              </div>

              {/* Caption preview */}
              <div className="mt-5">
                <h3 className="text-xs font-bold text-[#1E1B4B] mb-2">Caption preview</h3>
                <div className="p-3.5 rounded-lg bg-[#F8F7FC] border border-[#F1F5F9] text-xs text-[#475569] leading-relaxed whitespace-pre-line font-normal">
                  {selectedItem.caption || 'No copy preview added yet.'}
                </div>
              </div>

              {/* Assigned to */}
              <div className="mt-5">
                <h3 className="text-xs font-bold text-[#1E1B4B] mb-2">Assigned to</h3>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-[#EDE9FE] text-[#6D28D9] flex items-center justify-center font-bold text-xs">
                    {selectedItem.assignedTo.initials}
                  </div>
                  <div>
                    <div className="text-xs font-bold text-[#1E1B4B]">
                      {selectedItem.assignedTo.name}
                    </div>
                    <div className="text-[11px] text-[#64748B]">
                      {selectedItem.assignedTo.role}
                    </div>
                  </div>
                </div>
              </div>

              {/* Attachments */}
              <div className="mt-5">
                <h3 className="text-xs font-bold text-[#1E1B4B] mb-2">
                  Attachments ({selectedItem.attachments?.length || 0})
                </h3>
                <div className="space-y-2">
                  {selectedItem.attachments?.map((att) => (
                    <div
                      key={att.id}
                      className="p-2.5 rounded-lg border border-[#F1F5F9] bg-[#F8F7FC]/40 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2.5">
                        {att.type === 'Image' ? (
                          <div className="w-8 h-8 rounded bg-[#EDE9FE] flex items-center justify-center text-xs overflow-hidden border border-[#DDD6FE]">
                            &#128444;&#65039;
                          </div>
                        ) : (
                          <div className="w-8 h-8 rounded bg-[#EDE9FE] flex items-center justify-center text-[#6D28D9]">
                            <FileText className="w-4 h-4" />
                          </div>
                        )}
                        <div>
                          <div className="text-xs font-medium text-[#1E1B4B]">{att.name}</div>
                          <div className="text-[10px] text-[#94A3B8]">
                            {att.size} &bull; {att.type}
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => showToast(`Previewing ${att.name}`)}
                        className="p-1 text-[#94A3B8] hover:text-[#1E1B4B]"
                        title="Attachment options"
                        aria-label="Attachment options"
                      >
                        <MoreHorizontal className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Bottom action: Full-width Edit Content purple button */}
            <div className="mt-8 pt-4 border-t border-[#F1F5F9] flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleOpenEdit(selectedItem)}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-[#6D28D9] hover:bg-[#5B21B6] text-white text-xs font-semibold shadow-xs transition-colors"
              >
                <Edit2 className="w-3.5 h-3.5" />
                <span>Edit Content</span>
              </button>
              <button
                type="button"
                onClick={() => handleTriggerDelete(selectedItem)}
                className="p-2.5 rounded-lg border border-[#E2E8F0] text-[#64748B] hover:text-rose-600 hover:border-rose-300 hover:bg-rose-50 transition-colors"
                title="Delete content"
                aria-label="Delete content"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : (
          /* EMPTY STATE FOR RIGHT DETAIL PANEL */
          <div className="bg-white rounded-xl border border-[#E2E8F0] p-8 shadow-xs flex flex-col items-center justify-center text-center min-h-[660px]">
            <div className="w-14 h-14 rounded-2xl bg-[#EDE9FE] text-[#6D28D9] flex items-center justify-center mb-4">
              <CalendarIcon className="w-7 h-7 stroke-[2.2]" />
            </div>
            <h3 className="text-sm font-bold text-[#1E1B4B]">No publication selected</h3>
            <p className="text-xs text-[#64748B] mt-1.5 max-w-[240px] leading-relaxed">
              Click on any scheduled post or day on the calendar to view and edit its metadata.
            </p>
            <button
              type="button"
              onClick={() => handleOpenCreate(selectedDate)}
              className="mt-6 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#6D28D9] hover:bg-[#5B21B6] text-white text-xs font-semibold shadow-xs transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Schedule for {selectedDate}</span>
            </button>
          </div>
        )}
      </div>

      {/* CREATE CONTENT MODAL */}
      {isCreateOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-2xs p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="create-content-title"
          onClick={() => setIsCreateOpen(false)}
        >
          <div
            className="bg-white rounded-xl border border-[#E2E8F0] shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-4 border-b border-[#E2E8F0] flex items-center justify-between">
              <h3 id="create-content-title" className="text-base font-bold text-[#1E1B4B]">
                Create New Content
              </h3>
              <button
                type="button"
                onClick={() => setIsCreateOpen(false)}
                className="text-[#94A3B8] hover:text-[#1E1B4B] p-1 rounded transition-colors"
                aria-label="Close dialog"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCreate} className="p-6 space-y-4 text-xs">
              <div>
                <label htmlFor="create-title" className="block font-medium text-[#1E1B4B] mb-1">
                  Title *
                </label>
                <input
                  id="create-title"
                  type="text"
                  required
                  placeholder="e.g. Mid-Season Promo Video"
                  value={formData.title}
                  onChange={(e) => {
                    setFormData({ ...formData, title: e.target.value });
                    if (formErrors.title) setFormErrors({ ...formErrors, title: undefined });
                  }}
                  className={`w-full px-3 py-2 rounded-lg border text-xs text-[#1E1B4B] focus:outline-none focus:ring-2 focus:ring-[#6D28D9]/20 focus:border-[#6D28D9] ${
                    formErrors.title ? 'border-rose-400 bg-rose-50/20' : 'border-[#E2E8F0]'
                  }`}
                />
                {formErrors.title && (
                  <p className="text-[11px] text-rose-500 mt-1">{formErrors.title}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="create-platform" className="block font-medium text-[#1E1B4B] mb-1">
                    Platform
                  </label>
                  <select
                    id="create-platform"
                    value={formData.platform}
                    onChange={(e) =>
                      setFormData({ ...formData, platform: e.target.value as ContentPlatform })
                    }
                    className="w-full px-3 py-2 rounded-lg border border-[#E2E8F0] text-xs text-[#1E1B4B] focus:outline-none focus:ring-2 focus:ring-[#6D28D9]/20 focus:border-[#6D28D9]"
                  >
                    <option value="Instagram">Instagram</option>
                    <option value="Facebook">Facebook</option>
                    <option value="Email">Email</option>
                    <option value="Meta Ads">Meta Ads</option>
                    <option value="X">X</option>
                    <option value="LinkedIn">LinkedIn</option>
                    <option value="YouTube">YouTube</option>
                    <option value="Blog">Blog</option>
                    <option value="Website">Website</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="create-status" className="block font-medium text-[#1E1B4B] mb-1">
                    Status
                  </label>
                  <select
                    id="create-status"
                    value={formData.status}
                    onChange={(e) =>
                      setFormData({ ...formData, status: e.target.value as ContentStatus })
                    }
                    className="w-full px-3 py-2 rounded-lg border border-[#E2E8F0] text-xs text-[#1E1B4B] focus:outline-none focus:ring-2 focus:ring-[#6D28D9]/20 focus:border-[#6D28D9]"
                  >
                    <option value="Draft">Draft</option>
                    <option value="In Review">In Review</option>
                    <option value="Approved">Approved</option>
                    <option value="Scheduled">Scheduled</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="create-date" className="block font-medium text-[#1E1B4B] mb-1">
                    Date (YYYY-MM-DD) *
                  </label>
                  <input
                    id="create-date"
                    type="date"
                    required
                    value={formData.date}
                    onChange={(e) => {
                      setFormData({ ...formData, date: e.target.value });
                      if (formErrors.date) setFormErrors({ ...formErrors, date: undefined });
                    }}
                    className={`w-full px-3 py-2 rounded-lg border text-xs text-[#1E1B4B] focus:outline-none focus:ring-2 focus:ring-[#6D28D9]/20 focus:border-[#6D28D9] ${
                      formErrors.date ? 'border-rose-400 bg-rose-50/20' : 'border-[#E2E8F0]'
                    }`}
                  />
                  {formErrors.date && (
                    <p className="text-[11px] text-rose-500 mt-1">{formErrors.date}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="create-time" className="block font-medium text-[#1E1B4B] mb-1">
                    Time *
                  </label>
                  <input
                    id="create-time"
                    type="text"
                    required
                    placeholder="e.g. 10:00 AM"
                    value={formData.time}
                    onChange={(e) => {
                      setFormData({ ...formData, time: e.target.value });
                      if (formErrors.time) setFormErrors({ ...formErrors, time: undefined });
                    }}
                    className={`w-full px-3 py-2 rounded-lg border text-xs text-[#1E1B4B] focus:outline-none focus:ring-2 focus:ring-[#6D28D9]/20 focus:border-[#6D28D9] ${
                      formErrors.time ? 'border-rose-400 bg-rose-50/20' : 'border-[#E2E8F0]'
                    }`}
                  />
                  {formErrors.time && (
                    <p className="text-[11px] text-rose-500 mt-1">{formErrors.time}</p>
                  )}
                </div>
              </div>

              <div>
                <label htmlFor="create-campaign" className="block font-medium text-[#1E1B4B] mb-1">
                  Campaign
                </label>
                <select
                  id="create-campaign"
                  value={formData.campaign}
                  onChange={(e) => setFormData({ ...formData, campaign: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-[#E2E8F0] text-xs text-[#1E1B4B] focus:outline-none focus:ring-2 focus:ring-[#6D28D9]/20 focus:border-[#6D28D9]"
                >
                  <option value="Autumn Launch 2026">Autumn Launch 2026</option>
                  <option value="Retargeting Boost">Retargeting Boost</option>
                  <option value="Holiday Season Push">Holiday Season Push</option>
                  <option value="Brand Awareness Q4">Brand Awareness Q4</option>
                </select>
              </div>

              <div>
                <label htmlFor="create-caption" className="block font-medium text-[#1E1B4B] mb-1">
                  Caption / Copy
                </label>
                <textarea
                  id="create-caption"
                  rows={4}
                  value={formData.caption}
                  onChange={(e) => setFormData({ ...formData, caption: e.target.value })}
                  placeholder="Draft caption, hashtags, and copy..."
                  className="w-full px-3 py-2 rounded-lg border border-[#E2E8F0] text-xs text-[#1E1B4B] focus:outline-none focus:ring-2 focus:ring-[#6D28D9]/20 focus:border-[#6D28D9]"
                />
              </div>

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-[#F1F5F9]">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-4 py-2 rounded-lg border border-[#E2E8F0] text-[#64748B] hover:bg-slate-50 text-xs font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-[#6D28D9] text-white hover:bg-[#5B21B6] text-xs font-semibold shadow-xs transition-colors"
                >
                  Create Content
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT CONTENT MODAL */}
      {isEditOpen && selectedItem && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-2xs p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-content-title"
          onClick={() => setIsEditOpen(false)}
        >
          <div
            className="bg-white rounded-xl border border-[#E2E8F0] shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-4 border-b border-[#E2E8F0] flex items-center justify-between">
              <h3 id="edit-content-title" className="text-base font-bold text-[#1E1B4B]">
                Edit Content
              </h3>
              <button
                type="button"
                onClick={() => setIsEditOpen(false)}
                className="text-[#94A3B8] hover:text-[#1E1B4B] p-1 rounded transition-colors"
                aria-label="Close dialog"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="p-6 space-y-4 text-xs">
              <div>
                <label htmlFor="edit-title" className="block font-medium text-[#1E1B4B] mb-1">
                  Title *
                </label>
                <input
                  id="edit-title"
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => {
                    setFormData({ ...formData, title: e.target.value });
                    if (formErrors.title) setFormErrors({ ...formErrors, title: undefined });
                  }}
                  className={`w-full px-3 py-2 rounded-lg border text-xs text-[#1E1B4B] focus:outline-none focus:ring-2 focus:ring-[#6D28D9]/20 focus:border-[#6D28D9] ${
                    formErrors.title ? 'border-rose-400 bg-rose-50/20' : 'border-[#E2E8F0]'
                  }`}
                />
                {formErrors.title && (
                  <p className="text-[11px] text-rose-500 mt-1">{formErrors.title}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="edit-platform" className="block font-medium text-[#1E1B4B] mb-1">
                    Platform
                  </label>
                  <select
                    id="edit-platform"
                    value={formData.platform}
                    onChange={(e) =>
                      setFormData({ ...formData, platform: e.target.value as ContentPlatform })
                    }
                    className="w-full px-3 py-2 rounded-lg border border-[#E2E8F0] text-xs text-[#1E1B4B] focus:outline-none focus:ring-2 focus:ring-[#6D28D9]/20 focus:border-[#6D28D9]"
                  >
                    <option value="Instagram">Instagram</option>
                    <option value="Facebook">Facebook</option>
                    <option value="Email">Email</option>
                    <option value="Meta Ads">Meta Ads</option>
                    <option value="X">X</option>
                    <option value="LinkedIn">LinkedIn</option>
                    <option value="YouTube">YouTube</option>
                    <option value="Blog">Blog</option>
                    <option value="Website">Website</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="edit-status" className="block font-medium text-[#1E1B4B] mb-1">
                    Status
                  </label>
                  <select
                    id="edit-status"
                    value={formData.status}
                    onChange={(e) =>
                      setFormData({ ...formData, status: e.target.value as ContentStatus })
                    }
                    className="w-full px-3 py-2 rounded-lg border border-[#E2E8F0] text-xs text-[#1E1B4B] focus:outline-none focus:ring-2 focus:ring-[#6D28D9]/20 focus:border-[#6D28D9]"
                  >
                    <option value="Draft">Draft</option>
                    <option value="In Review">In Review</option>
                    <option value="Approved">Approved</option>
                    <option value="Scheduled">Scheduled</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="edit-date" className="block font-medium text-[#1E1B4B] mb-1">
                    Date (YYYY-MM-DD) *
                  </label>
                  <input
                    id="edit-date"
                    type="date"
                    required
                    value={formData.date}
                    onChange={(e) => {
                      setFormData({ ...formData, date: e.target.value });
                      if (formErrors.date) setFormErrors({ ...formErrors, date: undefined });
                    }}
                    className={`w-full px-3 py-2 rounded-lg border text-xs text-[#1E1B4B] focus:outline-none focus:ring-2 focus:ring-[#6D28D9]/20 focus:border-[#6D28D9] ${
                      formErrors.date ? 'border-rose-400 bg-rose-50/20' : 'border-[#E2E8F0]'
                    }`}
                  />
                  {formErrors.date && (
                    <p className="text-[11px] text-rose-500 mt-1">{formErrors.date}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="edit-time" className="block font-medium text-[#1E1B4B] mb-1">
                    Time *
                  </label>
                  <input
                    id="edit-time"
                    type="text"
                    required
                    value={formData.time}
                    onChange={(e) => {
                      setFormData({ ...formData, time: e.target.value });
                      if (formErrors.time) setFormErrors({ ...formErrors, time: undefined });
                    }}
                    className={`w-full px-3 py-2 rounded-lg border text-xs text-[#1E1B4B] focus:outline-none focus:ring-2 focus:ring-[#6D28D9]/20 focus:border-[#6D28D9] ${
                      formErrors.time ? 'border-rose-400 bg-rose-50/20' : 'border-[#E2E8F0]'
                    }`}
                  />
                  {formErrors.time && (
                    <p className="text-[11px] text-rose-500 mt-1">{formErrors.time}</p>
                  )}
                </div>
              </div>

              <div>
                <label htmlFor="edit-campaign" className="block font-medium text-[#1E1B4B] mb-1">
                  Campaign
                </label>
                <select
                  id="edit-campaign"
                  value={formData.campaign}
                  onChange={(e) => setFormData({ ...formData, campaign: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-[#E2E8F0] text-xs text-[#1E1B4B] focus:outline-none focus:ring-2 focus:ring-[#6D28D9]/20 focus:border-[#6D28D9]"
                >
                  <option value="Autumn Launch 2026">Autumn Launch 2026</option>
                  <option value="Retargeting Boost">Retargeting Boost</option>
                  <option value="Holiday Season Push">Holiday Season Push</option>
                  <option value="Brand Awareness Q4">Brand Awareness Q4</option>
                </select>
              </div>

              <div>
                <label htmlFor="edit-caption" className="block font-medium text-[#1E1B4B] mb-1">
                  Caption
                </label>
                <textarea
                  id="edit-caption"
                  rows={4}
                  value={formData.caption}
                  onChange={(e) => setFormData({ ...formData, caption: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-[#E2E8F0] text-xs text-[#1E1B4B] focus:outline-none focus:ring-2 focus:ring-[#6D28D9]/20 focus:border-[#6D28D9]"
                />
              </div>

              <div className="pt-4 flex items-center justify-between border-t border-[#F1F5F9]">
                <button
                  type="button"
                  onClick={() => handleTriggerDelete(selectedItem)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-rose-600 hover:bg-rose-50 text-xs font-medium transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete Content</span>
                </button>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setIsEditOpen(false)}
                    className="px-4 py-2 rounded-lg border border-[#E2E8F0] text-[#64748B] hover:bg-slate-50 text-xs font-medium transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-lg bg-[#6D28D9] text-white hover:bg-[#5B21B6] text-xs font-semibold shadow-xs transition-colors"
                  >
                    Save Changes
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {isDeleteOpen && itemToDelete && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-2xs p-4 animate-in fade-in duration-150"
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="delete-dialog-title"
          onClick={() => setIsDeleteOpen(false)}
        >
          <div
            className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl relative animate-in fade-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mb-4">
              <Trash2 className="w-6 h-6 stroke-[2.2]" />
            </div>

            <h3 id="delete-dialog-title" className="text-lg font-bold text-[#1E1B4B]">
              Delete content publication?
            </h3>

            <p className="text-xs text-[#64748B] mt-2 leading-relaxed">
              Are you sure you want to remove <span className="font-semibold text-[#1E1B4B]">&ldquo;{itemToDelete.title}&rdquo;</span> from the marketing calendar? This action cannot be undone.
            </p>

            <div className="flex items-center justify-end gap-3 mt-6">
              <button
                type="button"
                onClick={() => setIsDeleteOpen(false)}
                className="px-4 py-2 rounded-lg border border-[#E2E8F0] text-xs font-medium text-[#475569] hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shadow-xs transition-colors"
              >
                Delete publication
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
