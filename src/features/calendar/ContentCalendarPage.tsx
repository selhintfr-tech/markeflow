import React, { useState } from 'react';
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
} from 'lucide-react';
import { initialContentCalendarItems, currentUser } from '../../data/mock';
import type { ContentCalendarItem, ContentPlatform, ContentStatus } from '../../types';

export const ContentCalendarPage: React.FC = () => {
  // State
  const [contentItems, setContentItems] = useState<ContentCalendarItem[]>(initialContentCalendarItems);
  const [selectedItemId, setSelectedItemId] = useState<string>('content-6'); // Default selected: Autumn Collection Carousel (12 Oct)
  const [selectedDate, setSelectedDate] = useState<string>('2026-10-12');
  const [currentYear, setCurrentYear] = useState<number>(2026);
  const [currentMonth, setCurrentMonth] = useState<number>(9); // 0-indexed: 9 = October
  const [viewMode, setViewMode] = useState<'Month' | 'Week' | 'List'>('Month');
  const [selectedPlatformFilter, setSelectedPlatformFilter] = useState<string>('All platforms');
  const [selectedCampaignFilter, setSelectedCampaignFilter] = useState<string>('All campaigns');

  // Modals & UI feedback
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isMonthDropdownOpen, setIsMonthDropdownOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

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

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const selectedItem =
    contentItems.find((i) => i.id === selectedItemId) ||
    contentItems[0] ||
    initialContentCalendarItems[5];

  // Month navigation
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

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

  // Helper to get platform icon
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
            ∞
          </span>
        );
      case 'X':
        return <span className={`inline-flex items-center justify-center font-bold text-[11px] text-black ${className}`}>𝕏</span>;
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

  // Filter content
  const filteredItems = contentItems.filter((item) => {
    const matchesPlatform =
      selectedPlatformFilter === 'All platforms' || item.platform === selectedPlatformFilter;
    const matchesCampaign =
      selectedCampaignFilter === 'All campaigns' || item.campaign === selectedCampaignFilter;
    return matchesPlatform && matchesCampaign;
  });

  // Calendar Day Generation for Monday-first 5-week month grid
  // In October 2026:
  // Week 1: 28 Sep (Mon), 29 Sep, 30 Sep, 1 Oct (Thu), 2 Oct, 3 Oct, 4 Oct
  // Week 2: 5 Oct - 11 Oct
  // Week 3: 12 Oct - 18 Oct
  // Week 4: 19 Oct - 25 Oct
  // Week 5: 26 Oct - 1 Nov
  const generateMonthDays = () => {
    const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
    const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0);

    // Weekday index where Monday is 0 and Sunday is 6
    // getDay() gives Sunday=0, Monday=1, ... Saturday=6
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

    // Next month padding to fill complete weeks (up to 35 days for 5 weeks)
    const remainingDays = 35 - days.length;
    for (let d = 1; d <= (remainingDays > 0 ? remainingDays : 0); d++) {
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
  };

  const calendarDays = generateMonthDays();

  // Handlers
  const handleOpenEdit = (item: ContentCalendarItem) => {
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

  const handleOpenCreate = () => {
    setFormData({
      title: '',
      platform: 'Instagram',
      status: 'Scheduled',
      campaign: 'Autumn Launch 2026',
      workspace: 'Atlas Retail SARL',
      date: selectedDate || '2026-10-15',
      time: '10:00 AM',
      caption: '',
      assigneeName: currentUser.name,
      assigneeRole: 'Marketing Manager',
    });
    setIsCreateOpen(true);
  };

  const handleSaveCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) return;

    const newItem: ContentCalendarItem = {
      id: `content-${Date.now()}`,
      title: formData.title.trim(),
      date: formData.date,
      time: formData.time,
      platform: formData.platform,
      status: formData.status,
      campaign: formData.campaign,
      workspace: formData.workspace,
      caption: formData.caption,
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
    setIsCreateOpen(false);
    showToast(`Added "${newItem.title}" on ${newItem.date}`);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem) return;

    const updated: ContentCalendarItem = {
      ...selectedItem,
      title: formData.title.trim() || selectedItem.title,
      platform: formData.platform,
      status: formData.status,
      campaign: formData.campaign,
      workspace: formData.workspace,
      date: formData.date,
      time: formData.time,
      caption: formData.caption,
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
    setIsEditOpen(false);
    showToast(`Saved changes to "${updated.title}"`);
  };

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto pb-12 font-sans">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#1E1B4B] text-white px-4 py-2.5 rounded-lg shadow-xl text-sm flex items-center gap-2 border border-slate-700 animate-fade-in">
          <Check className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-xs text-[#64748B]">
        <span className="hover:text-[#1E1B4B] cursor-pointer">Management</span>
        <span>/</span>
        <span className="text-[#1E1B4B] font-medium">Content Calendar</span>
      </div>

      {/* Page Title & Subtitle */}
      <div>
        <h1 className="text-2xl lg:text-3xl font-extrabold tracking-tight text-[#1E1B4B]">
          Content Calendar
        </h1>
        <p className="text-sm text-[#64748B] mt-1">
          Plan and coordinate your marketing content across channels.
        </p>
      </div>

      {/* Toolbar */}
      <div className="bg-white rounded-xl border border-[#E2E8F0] p-4 shadow-xs flex flex-wrap items-center justify-between gap-4">
        {/* Left Toolbar Controls */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Month selector with Prev/Next buttons */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="p-1.5 rounded-lg border border-[#E2E8F0] text-[#64748B] hover:text-[#1E1B4B] hover:bg-slate-50 transition-colors"
              title="Previous Month"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <div className="relative">
              <button
                type="button"
                onClick={() => setIsMonthDropdownOpen(!isMonthDropdownOpen)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[#E2E8F0] bg-white text-xs font-semibold text-[#1E1B4B] hover:bg-slate-50 transition-colors"
              >
                <CalendarIcon className="w-3.5 h-3.5 text-[#6D28D9]" />
                <span>
                  {monthNames[currentMonth]} {currentYear}
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-[#94A3B8]" />
              </button>

              {isMonthDropdownOpen && (
                <div className="absolute left-0 mt-1.5 w-44 rounded-lg bg-white border border-[#E2E8F0] shadow-xl py-1 z-40 max-h-56 overflow-y-auto">
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
              onClick={handleNextMonth}
              className="p-1.5 rounded-lg border border-[#E2E8F0] text-[#64748B] hover:text-[#1E1B4B] hover:bg-slate-50 transition-colors"
              title="Next Month"
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
          <div className="relative">
            <select
              value={selectedPlatformFilter}
              onChange={(e) => setSelectedPlatformFilter(e.target.value)}
              className="appearance-none pl-3 pr-8 py-1.5 text-xs rounded-lg border border-[#E2E8F0] bg-white text-[#1E1B4B] focus:outline-none focus:ring-2 focus:ring-[#6D28D9]/20 focus:border-[#6D28D9] cursor-pointer"
            >
              <option value="All platforms">All platforms</option>
              <option value="Instagram">Instagram</option>
              <option value="Facebook">Facebook</option>
              <option value="Email">Email</option>
              <option value="Meta Ads">Meta Ads</option>
              <option value="X">X</option>
              <option value="LinkedIn">LinkedIn</option>
              <option value="YouTube">YouTube</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-[#94A3B8] absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Campaign Filter */}
          <div className="relative">
            <select
              value={selectedCampaignFilter}
              onChange={(e) => setSelectedCampaignFilter(e.target.value)}
              className="appearance-none pl-3 pr-8 py-1.5 text-xs rounded-lg border border-[#E2E8F0] bg-white text-[#1E1B4B] focus:outline-none focus:ring-2 focus:ring-[#6D28D9]/20 focus:border-[#6D28D9] cursor-pointer"
            >
              <option value="All campaigns">All campaigns</option>
              <option value="Autumn Launch 2026">Autumn Launch 2026</option>
              <option value="Retargeting Boost">Retargeting Boost</option>
              <option value="Holiday Season Push">Holiday Season Push</option>
              <option value="Brand Awareness Q4">Brand Awareness Q4</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-[#94A3B8] absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>

        {/* Right: + Create Content primary CTA */}
        <button
          type="button"
          onClick={handleOpenCreate}
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

              {/* Month Day Cells Grid (5 rows of 7 days) */}
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
                      </div>

                      {/* Day Events */}
                      <div className="mt-1 space-y-1.5 flex-1">
                        {dayEvents.map((ev) => {
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
                                  ? 'bg-white border-[#6D28D9] shadow-xs'
                                  : 'bg-white/80 border-[#E2E8F0] hover:border-[#CBD5E1]'
                              }`}
                            >
                              {/* Platform Icon & Title */}
                              <div className="flex items-center gap-1.5 mb-1">
                                {getPlatformIcon(ev.platform, 'w-3 h-3')}
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
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {viewMode === 'Week' && (
            <div className="space-y-4">
              <div className="text-xs font-semibold text-[#64748B]">
                Weekly Overview: 12 Oct 2026 – 18 Oct 2026
              </div>
              <div className="space-y-3">
                {filteredItems
                  .filter((item) => item.date >= '2026-10-12' && item.date <= '2026-10-18')
                  .map((item) => (
                    <div
                      key={item.id}
                      onClick={() => {
                        setSelectedItemId(item.id);
                        setSelectedDate(item.date);
                      }}
                      className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                        item.id === selectedItemId
                          ? 'bg-[#F5F3FF] border-[#6D28D9]'
                          : 'border-[#E2E8F0] hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-white rounded-lg border border-[#E2E8F0]">
                          {getPlatformIcon(item.platform, 'w-4 h-4')}
                        </div>
                        <div>
                          <div className="text-xs font-bold text-[#1E1B4B]">{item.title}</div>
                          <div className="text-[11px] text-[#64748B] mt-0.5">
                            {item.date} • {item.campaign}
                          </div>
                        </div>
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded text-xs font-medium ${
                          getStatusBadgeStyle(item.status).wrapper
                        }`}
                      >
                        {item.status}
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {viewMode === 'List' && (
            <div className="space-y-2">
              <div className="text-xs font-semibold text-[#64748B] mb-2">
                All Scheduled & Planned Content ({filteredItems.length})
              </div>
              <div className="divide-y divide-[#F1F5F9]">
                {filteredItems.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => {
                      setSelectedItemId(item.id);
                      setSelectedDate(item.date);
                    }}
                    className={`py-3 px-3 flex items-center justify-between cursor-pointer rounded-lg transition-colors ${
                      item.id === selectedItemId
                        ? 'bg-[#F5F3FF] text-[#6D28D9]'
                        : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {getPlatformIcon(item.platform, 'w-4 h-4')}
                      <div>
                        <div className="text-xs font-bold text-[#1E1B4B]">{item.title}</div>
                        <div className="text-[11px] text-[#64748B]">
                          {item.date} • {item.platform} • {item.campaign}
                        </div>
                      </div>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded text-xs font-medium ${
                        getStatusBadgeStyle(item.status).wrapper
                      }`}
                    >
                      {item.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* RIGHT PANEL: Selected Content Details (1/3 width) */}
        {selectedItem && (
          <div className="bg-white rounded-xl border border-[#E2E8F0] p-6 shadow-xs flex flex-col justify-between">
            <div>
              {/* Header: Platform Icon + Status Selector + Three dots */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-1 rounded bg-slate-50 border border-[#E2E8F0]">
                    {getPlatformIcon(selectedItem.platform, 'w-5 h-5')}
                  </div>
                  <div className="relative">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                        getStatusBadgeStyle(selectedItem.status).wrapper
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          getStatusBadgeStyle(selectedItem.status).dot
                        }`}
                      />
                      {selectedItem.status}
                      <ChevronDown className="w-3 h-3 ml-0.5 opacity-60" />
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleOpenEdit(selectedItem)}
                  className="p-1 text-[#94A3B8] hover:text-[#1E1B4B] rounded hover:bg-slate-50 transition-colors"
                >
                  <MoreHorizontal className="w-4 h-4" />
                </button>
              </div>

              {/* Title & Date */}
              <div className="mt-4">
                <h2 className="text-base font-bold text-[#1E1B4B]">{selectedItem.title}</h2>
                <div className="flex items-center gap-1.5 text-xs text-[#64748B] mt-1.5">
                  <CalendarIcon className="w-3.5 h-3.5 text-[#6D28D9]" />
                  <span>
                    Mon, 12 Oct 2026 — {selectedItem.time || '10:00 AM'}
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
                    <span className="text-xs">🏢</span>
                    <span>{selectedItem.workspace}</span>
                  </div>
                </div>
              </div>

              {/* Caption preview */}
              <div className="mt-5">
                <h3 className="text-xs font-bold text-[#1E1B4B] mb-2">Caption preview</h3>
                <div className="p-3.5 rounded-lg bg-[#F8F7FC] border border-[#F1F5F9] text-xs text-[#475569] leading-relaxed whitespace-pre-line font-normal">
                  {selectedItem.caption}
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
                  Attachments ({selectedItem.attachments.length})
                </h3>
                <div className="space-y-2">
                  {selectedItem.attachments.map((att) => (
                    <div
                      key={att.id}
                      className="p-2.5 rounded-lg border border-[#F1F5F9] bg-[#F8F7FC]/40 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2.5">
                        {att.type === 'Image' ? (
                          <div className="w-8 h-8 rounded bg-[#EDE9FE] flex items-center justify-center text-xs overflow-hidden border border-[#DDD6FE]">
                            🖼️
                          </div>
                        ) : (
                          <div className="w-8 h-8 rounded bg-[#EDE9FE] flex items-center justify-center text-[#6D28D9]">
                            <FileText className="w-4 h-4" />
                          </div>
                        )}
                        <div>
                          <div className="text-xs font-medium text-[#1E1B4B]">{att.name}</div>
                          <div className="text-[10px] text-[#94A3B8]">
                            {att.size} • {att.type}
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => showToast(`Opening ${att.name}`)}
                        className="p-1 text-[#94A3B8] hover:text-[#1E1B4B]"
                      >
                        <MoreHorizontal className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Bottom action: Full-width Edit Content purple button */}
            <div className="mt-8 pt-4 border-t border-[#F1F5F9]">
              <button
                type="button"
                onClick={() => handleOpenEdit(selectedItem)}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-[#6D28D9] hover:bg-[#5B21B6] text-white text-xs font-semibold shadow-xs transition-colors"
              >
                <Edit2 className="w-3.5 h-3.5" />
                <span>Edit Content</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* CREATE CONTENT MODAL */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-2xs p-4">
          <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-[#E2E8F0] flex items-center justify-between">
              <h3 className="text-base font-bold text-[#1E1B4B]">Create New Content</h3>
              <button
                type="button"
                onClick={() => setIsCreateOpen(false)}
                className="text-[#94A3B8] hover:text-[#1E1B4B] p-1 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCreate} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-medium text-[#1E1B4B] mb-1">Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Mid-Season Promo Video"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-[#E2E8F0] text-xs text-[#1E1B4B] focus:outline-none focus:ring-2 focus:ring-[#6D28D9]/20 focus:border-[#6D28D9]"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-medium text-[#1E1B4B] mb-1">Platform</label>
                  <select
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
                  <label className="block font-medium text-[#1E1B4B] mb-1">Status</label>
                  <select
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
                  <label className="block font-medium text-[#1E1B4B] mb-1">Date (YYYY-MM-DD)</label>
                  <input
                    type="date"
                    required
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-[#E2E8F0] text-xs text-[#1E1B4B] focus:outline-none focus:ring-2 focus:ring-[#6D28D9]/20 focus:border-[#6D28D9]"
                  />
                </div>

                <div>
                  <label className="block font-medium text-[#1E1B4B] mb-1">Time</label>
                  <input
                    type="text"
                    value={formData.time}
                    onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-[#E2E8F0] text-xs text-[#1E1B4B] focus:outline-none focus:ring-2 focus:ring-[#6D28D9]/20 focus:border-[#6D28D9]"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-[#1E1B4B] mb-1">Campaign</label>
                <select
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
                <label className="block font-medium text-[#1E1B4B] mb-1">Caption / Copy</label>
                <textarea
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
                  className="px-4 py-2 rounded-lg border border-[#E2E8F0] text-[#64748B] hover:bg-slate-50 text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-[#6D28D9] text-white hover:bg-[#5B21B6] text-xs font-semibold"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-2xs p-4">
          <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-[#E2E8F0] flex items-center justify-between">
              <h3 className="text-base font-bold text-[#1E1B4B]">Edit Content</h3>
              <button
                type="button"
                onClick={() => setIsEditOpen(false)}
                className="text-[#94A3B8] hover:text-[#1E1B4B] p-1 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-medium text-[#1E1B4B] mb-1">Title</label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-[#E2E8F0] text-xs text-[#1E1B4B] focus:outline-none focus:ring-2 focus:ring-[#6D28D9]/20 focus:border-[#6D28D9]"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-medium text-[#1E1B4B] mb-1">Platform</label>
                  <select
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
                  <label className="block font-medium text-[#1E1B4B] mb-1">Status</label>
                  <select
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
                  <label className="block font-medium text-[#1E1B4B] mb-1">Date (YYYY-MM-DD)</label>
                  <input
                    type="date"
                    required
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-[#E2E8F0] text-xs text-[#1E1B4B] focus:outline-none focus:ring-2 focus:ring-[#6D28D9]/20 focus:border-[#6D28D9]"
                  />
                </div>

                <div>
                  <label className="block font-medium text-[#1E1B4B] mb-1">Time</label>
                  <input
                    type="text"
                    value={formData.time}
                    onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-[#E2E8F0] text-xs text-[#1E1B4B] focus:outline-none focus:ring-2 focus:ring-[#6D28D9]/20 focus:border-[#6D28D9]"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-[#1E1B4B] mb-1">Campaign</label>
                <select
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
                <label className="block font-medium text-[#1E1B4B] mb-1">Caption</label>
                <textarea
                  rows={4}
                  value={formData.caption}
                  onChange={(e) => setFormData({ ...formData, caption: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-[#E2E8F0] text-xs text-[#1E1B4B] focus:outline-none focus:ring-2 focus:ring-[#6D28D9]/20 focus:border-[#6D28D9]"
                />
              </div>

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-[#F1F5F9]">
                <button
                  type="button"
                  onClick={() => setIsEditOpen(false)}
                  className="px-4 py-2 rounded-lg border border-[#E2E8F0] text-[#64748B] hover:bg-slate-50 text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-[#6D28D9] text-white hover:bg-[#5B21B6] text-xs font-semibold"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
