import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  FileText,
  Link2,
  Mail,
  Plus,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import { ApiError } from '../api/apiClient';
import { campaignService, type CampaignRecord } from '../campaigns/campaignService';
import { useAuth } from '../../context/AuthContext';
import { useWorkspace } from '../../context/WorkspaceContext';
import './ContentPlanner.css';
import {
  CONTENT_TYPES,
  CONTENT_PLATFORMS,
  contentPostService,
  type ContentPlatform,
  type ContentPost,
  type ContentPostInput,
  type ContentType,
  type EditorialStatus,
  type WorkspaceContentMember,
} from './contentPostService';

type ViewMode = 'Month' | 'Week' | 'List';
type PostForm = {
  title: string;
  platform: ContentPlatform;
  contentType: ContentType;
  status: EditorialStatus;
  caption: string;
  internalNotes: string;
  campaignId: string;
  assignedTo: string;
  scheduled: boolean;
  date: string;
  time: string;
  timezone: string;
};

const statuses: EditorialStatus[] = ['Draft', 'In Review', 'Approved', 'Scheduled'];
const localDate = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
const DAY_MS = 24 * 60 * 60 * 1000;
const startOfWeek = (date: Date) => {
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
  return start;
};
const timezoneNow = () => Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

function zonedIso(date: string, time: string, timezone: string): string {
  const [year, month, day] = date.split('-').map(Number);
  const [hour, minute] = time.split(':').map(Number);
  const wallClockUtc = Date.UTC(year, month - 1, day, hour, minute);
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date(wallClockUtc))
    .filter((part) => part.type !== 'literal')
    .map((part) => [part.type, Number(part.value)]));
  const timezoneWallUtc = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
  return new Date(wallClockUtc - (timezoneWallUtc - wallClockUtc)).toISOString();
}

function dateAndTimeInZone(timestamp: string, timezone: string): { date: string; time: string } {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date(timestamp))
    .filter((part) => part.type !== 'literal')
    .map((part) => [part.type, part.value]));
  return { date: `${parts.year}-${parts.month}-${parts.day}`, time: `${parts.hour}:${parts.minute}` };
}

function createForm(date: string): PostForm {
  return {
    title: '',
    platform: 'Instagram',
    contentType: 'Post',
    status: 'Draft',
    caption: '',
    internalNotes: '',
    campaignId: '',
    assignedTo: '',
    scheduled: false,
    date,
    time: '10:00',
    timezone: 'Africa/Casablanca',
  };
}

function formFromPost(post: ContentPost): PostForm {
  const dateTime = post.scheduled_at ? dateAndTimeInZone(post.scheduled_at, post.timezone) : null;
  return {
    title: post.title,
    platform: post.platform,
    contentType: post.content_type || 'Post',
    status: post.status,
    caption: post.caption || '',
    internalNotes: post.internal_notes || '',
    campaignId: post.campaign_id || '',
    assignedTo: post.assigned_to ? String(post.assigned_to) : '',
    scheduled: Boolean(post.scheduled_at),
    date: dateTime?.date || localDate(new Date()),
    time: dateTime?.time || '10:00',
    timezone: post.timezone || timezoneNow(),
  };
}

function postDate(post: ContentPost): string | null {
  return post.scheduled_at ? dateAndTimeInZone(post.scheduled_at, post.timezone).date : null;
}

function statusClass(status: EditorialStatus): string {
  switch (status) {
    case 'Draft': return 'border-slate-200 bg-slate-50 text-slate-700';
    case 'In Review': return 'border-amber-200 bg-amber-50 text-amber-800';
    case 'Approved': return 'border-teal-200 bg-teal-50 text-teal-800';
    case 'Scheduled': return 'border-violet-200 bg-violet-50 text-violet-800';
  }
}

function nextStatuses(status: EditorialStatus): EditorialStatus[] {
  switch (status) {
    case 'Draft': return ['In Review'];
    case 'In Review': return ['Draft', 'Approved'];
    case 'Approved': return ['In Review', 'Scheduled'];
    case 'Scheduled': return ['Approved'];
  }
}

function platformIcon(platform: ContentPlatform) {
  if (platform === 'Instagram') {
    return <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4">
      <defs><linearGradient id="instagram-gradient" x1="0%" y1="100%" x2="100%" y2="0%"><stop offset="0%" stopColor="#FEDA75" /><stop offset="48%" stopColor="#D62976" /><stop offset="100%" stopColor="#4F5BD5" /></linearGradient></defs>
      <rect x="3" y="3" width="18" height="18" rx="5" fill="none" stroke="url(#instagram-gradient)" strokeWidth="2" />
      <circle cx="12" cy="12" r="4" fill="none" stroke="#D62976" strokeWidth="2" />
      <circle cx="17.5" cy="6.8" r="1.2" fill="#4F5BD5" />
    </svg>;
  }
  if (platform === 'Facebook') {
    return <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4"><path fill="#1877F2" d="M12 2a10 10 0 1 0 1.8 19.84v-7.02h2.36l.45-2.82H13.8v-1.83c0-.77.38-1.52 1.6-1.52h1.34V6.25s-1.22-.21-2.39-.21c-2.44 0-4.04 1.48-4.04 4.16V12H7.6v2.82h2.71v7.02A10 10 0 0 0 12 2Z" /></svg>;
  }
  if (platform === 'TikTok') {
    return <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4">
      <path fill="#25F4EE" d="M14.2 3h3.1c.2 1.8 1.2 3.3 3.2 4v3.2a9 9 0 0 1-3.2-1.1v6.2a5.8 5.8 0 1 1-5.8-5.8c.4 0 .8 0 1.2.1v3.3a2.6 2.6 0 1 0 1.6 2.4V3Z" transform="translate(-1 1)" />
      <path fill="#FE2C55" d="M14.2 3h3.1c.2 1.8 1.2 3.3 3.2 4v3.2a9 9 0 0 1-3.2-1.1v6.2a5.8 5.8 0 1 1-5.8-5.8c.4 0 .8 0 1.2.1v3.3a2.6 2.6 0 1 0 1.6 2.4V3Z" transform="translate(1 -0.5)" />
      <path fill="#111827" d="M14.2 3h3.1c.2 1.8 1.2 3.3 3.2 4v3.2a9 9 0 0 1-3.2-1.1v6.2a5.8 5.8 0 1 1-5.8-5.8c.4 0 .8 0 1.2.1v3.3a2.6 2.6 0 1 0 1.6 2.4V3Z" />
    </svg>;
  }
  if (platform === 'LinkedIn') {
    return <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4"><path fill="#0A66C2" d="M20.45 2H3.55C2.69 2 2 2.68 2 3.53v16.94c0 .85.69 1.53 1.55 1.53h16.9c.86 0 1.55-.68 1.55-1.53V3.53c0-.85-.69-1.53-1.55-1.53ZM7.93 18.34H4.99V9.5h2.94v8.84ZM6.46 8.3a1.7 1.7 0 1 1 .02-3.4 1.7 1.7 0 0 1-.02 3.4Zm11.88 10.04H15.4v-4.3c0-1.03-.02-2.35-1.43-2.35-1.43 0-1.65 1.12-1.65 2.28v4.37H9.38V9.5h2.82v1.21h.04c.39-.7 1.35-1.44 2.78-1.44 2.98 0 3.53 1.96 3.53 4.5v4.57Z" /></svg>;
  }
  if (platform === 'YouTube') {
    return <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4"><path fill="#FF0033" d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.6 12 3.6 12 3.6s-7.5 0-9.4.5A3 3 0 0 0 .5 6.2 31 31 0 0 0 0 12a31 31 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.1c1.9.5 9.4.5 9.4.5s7.5 0 9.4-.5a3 3 0 0 0 2.1-2.1A31 31 0 0 0 24 12a31 31 0 0 0-.5-5.8ZM9.6 15.6V8.4l6.3 3.6-6.3 3.6Z" /></svg>;
  }
  if (platform === 'Email') return <Mail className="h-4 w-4 text-[#6D28D9]" />;
  if (platform === 'Meta Ads') return <span className="text-base font-bold text-[#0866FF]" aria-hidden="true">∞</span>;
  if (platform === 'Blog' || platform === 'Media' || platform === 'Website') return <FileText className="h-4 w-4 text-[#0D9488]" />;
  return <Link2 className="h-4 w-4" />;
}

export const ContentPlanner: React.FC<{ onShowEvents: () => void }> = ({ onShowEvents }) => {
  const { currentWorkspace, hasWorkspace } = useWorkspace();
  const { user } = useAuth();
  const workspaceId = currentWorkspace.id;
  const [posts, setPosts] = useState<ContentPost[]>([]);
  const [campaigns, setCampaigns] = useState<CampaignRecord[]>([]);
  const [members, setMembers] = useState<WorkspaceContentMember[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('Month');
  const [selectedDate, setSelectedDate] = useState(() => localDate(new Date()));
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [search, setSearch] = useState('');
  const [platformFilter, setPlatformFilter] = useState<ContentPlatform | ''>('');
  const [campaignFilter, setCampaignFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<EditorialStatus | ''>('');
  const [loading, setLoading] = useState(true);
  const [choicesLoading, setChoicesLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [choicesError, setChoicesError] = useState('');
  const [form, setForm] = useState<PostForm | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formAttachment, setFormAttachment] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const requestId = useRef(0);

  const visibleRange = useMemo(() => {
    if (viewMode === 'Week') {
      const start = startOfWeek(new Date(`${selectedDate}T12:00:00`));
      const end = new Date(start);
      end.setDate(end.getDate() + 6);
      return { start, end };
    }
    const first = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
    const last = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
    return { start: startOfWeek(first), end: new Date(startOfWeek(last).setDate(startOfWeek(last).getDate() + 6)) };
  }, [viewMode, selectedDate, currentMonth]);

  const rangeStart = useMemo(() => new Date(new Date(`${localDate(visibleRange.start)}T00:00:00`).getTime() - DAY_MS).toISOString(), [visibleRange.start]);
  const rangeEnd = useMemo(() => new Date(new Date(`${localDate(visibleRange.end)}T23:59:59.999`).getTime() + DAY_MS).toISOString(), [visibleRange.end]);

  const refresh = useCallback(async () => {
    const currentRequest = ++requestId.current;
    setLoading(true);
    setError('');
    try {
      const records = await contentPostService.list(workspaceId, {
        from: rangeStart,
        to: rangeEnd,
        search: search.trim() || undefined,
        platform: platformFilter,
        campaign_id: campaignFilter,
        status: statusFilter,
      });
      if (currentRequest !== requestId.current) return;
      setPosts(records);
      setSelectedId((current) => current && records.some((post) => post.id === current) ? current : records[0]?.id || null);
    } catch (cause) {
      if (currentRequest === requestId.current) {
        setPosts([]);
        setSelectedId(null);
        setError(cause instanceof Error ? cause.message : 'Unable to load content posts.');
      }
    } finally {
      if (currentRequest === requestId.current) setLoading(false);
    }
  }, [workspaceId, rangeStart, rangeEnd, search, platformFilter, campaignFilter, statusFilter]);

  useEffect(() => {
    setPosts([]);
    setSelectedId(null);
    void refresh();
    return () => { requestId.current += 1; };
  }, [refresh]);

  useEffect(() => {
    let active = true;
    setChoicesLoading(true);
    setChoicesError('');
    setCampaigns([]);
    setMembers([]);
    Promise.allSettled([
      campaignService.list(workspaceId),
      contentPostService.members(workspaceId),
    ]).then(([campaignResult, memberResult]) => {
      if (!active) return;
      const failures: string[] = [];
      if (campaignResult.status === 'fulfilled') setCampaigns(campaignResult.value);
      else failures.push('Campaigns could not be loaded.');
      if (memberResult.status === 'fulfilled') setMembers(memberResult.value);
      else failures.push('Workspace members could not be loaded.');
      setChoicesError(failures.join(' '));
      setChoicesLoading(false);
    });
    return () => { active = false; };
  }, [workspaceId]);

  const selectedPost = posts.find((post) => post.id === selectedId) || null;
  const currentMember = members.find((member) => member.id === Number(user?.id));
  const days = useMemo(() => {
    if (viewMode === 'List') return [];
    const start = viewMode === 'Week' ? startOfWeek(new Date(`${selectedDate}T12:00:00`)) : visibleRange.start;
    const count = viewMode === 'Week' ? 7 : 42;
    return Array.from({ length: count }, (_, index) => {
      const day = new Date(start);
      day.setDate(start.getDate() + index);
      return day;
    });
  }, [viewMode, selectedDate, visibleRange.start]);

  const scheduledPosts = posts.filter((post) => postDate(post) !== null);
  const unscheduledPosts = posts.filter((post) => postDate(post) === null);
  const postsOn = (date: Date) => scheduledPosts.filter((post) => postDate(post) === localDate(date));

  const movePeriod = (direction: number) => {
    if (viewMode === 'Week') {
      const next = new Date(`${selectedDate}T12:00:00`);
      next.setDate(next.getDate() + direction * 7);
      setSelectedDate(localDate(next));
      setCurrentMonth(new Date(next.getFullYear(), next.getMonth(), 1));
      return;
    }
    setCurrentMonth((current) => new Date(current.getFullYear(), current.getMonth() + direction, 1));
  };

  const openCreate = (date = selectedDate) => {
    setEditingId(null);
    setForm(createForm(date));
    setFormAttachment(null);
    setError('');
  };

  const openEdit = (post: ContentPost) => {
    setEditingId(post.id);
    setForm(formFromPost(post));
    setFormAttachment(null);
    setError('');
  };

  const inputFromForm = (value: PostForm): ContentPostInput => ({
    title: value.title.trim(),
    platform: value.platform,
    content_type: value.contentType,
    caption: value.caption.trim(),
    internal_notes: value.internalNotes.trim(),
    campaign_id: value.campaignId || null,
    assigned_to: value.assignedTo ? Number(value.assignedTo) : null,
    scheduled_at: value.scheduled ? zonedIso(value.date, value.time, value.timezone) : null,
    timezone: value.timezone,
  });

  const savePost = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!form || !hasWorkspace || !form.title.trim()) return;
    const submitter = (event.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
    const requestedStatus = (submitter?.value || form.status) as EditorialStatus;
    setSaving(true);
    setError('');
    let newlyCreated: ContentPost | null = null;
    try {
      const input = inputFromForm(form);
      let saved = editingId
        ? await contentPostService.update(workspaceId, editingId, { ...input, status: requestedStatus })
        : await contentPostService.create(workspaceId, input);
      if (!editingId) newlyCreated = saved;
      if (!editingId && requestedStatus !== 'Draft') {
        saved = await contentPostService.update(workspaceId, saved.id, { status: requestedStatus });
      }
      if (formAttachment) {
        try {
          await contentPostService.uploadAttachment(workspaceId, saved.id, formAttachment);
        } catch (cause) {
          const savedDate = postDate(saved);
          if (savedDate) {
            setSelectedDate(savedDate);
            setCurrentMonth(new Date(`${savedDate}T12:00:00`));
            setViewMode('Month');
          }
          setForm(null);
          setSelectedId(saved.id);
          await refresh();
          setError(`The content item was saved, but its attachment was not uploaded: ${cause instanceof Error ? cause.message : 'upload failed.'}`);
          return;
        }
      }
      setForm(null);
      setSelectedId(saved.id);
      await refresh();
    } catch (cause) {
      const message = cause instanceof ApiError && cause.errors
        ? Object.values(cause.errors).flat().join(' ')
        : cause instanceof Error ? cause.message : 'Unable to save content.';
      if (newlyCreated) {
        setForm(null);
        setSelectedId(newlyCreated.id);
        await refresh();
        setError(`The draft was saved, but the requested status change failed: ${message} Select the saved draft and retry the workflow action.`);
      } else {
        setError(message);
      }
    } finally {
      setSaving(false);
    }
  };

  const changeStatus = async (post: ContentPost, status: EditorialStatus) => {
    if (status === 'Scheduled' && !post.scheduled_at) {
      openEdit(post);
      setError('Add a schedule date and time before scheduling this post.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const updated = await contentPostService.update(workspaceId, post.id, { status });
      setPosts((current) => current.map((item) => item.id === updated.id ? updated : item));
      setSelectedId(updated.id);
      await refresh();
    } catch (cause) {
      setError(cause instanceof ApiError && cause.errors
        ? Object.values(cause.errors).flat().join(' ')
        : cause instanceof Error ? cause.message : 'Unable to change editorial status.');
    } finally {
      setSaving(false);
    }
  };

  const deletePost = async (post: ContentPost) => {
    if (!window.confirm(`Delete “${post.title}” and its attachments?`)) return;
    setSaving(true);
    setError('');
    try {
      await contentPostService.remove(workspaceId, post.id);
      setSelectedId(null);
      await refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to delete this content post.');
    } finally {
      setSaving(false);
    }
  };

  const uploadAttachment = async (post: ContentPost, file: File) => {
    setUploading(true);
    setError('');
    try {
      await contentPostService.uploadAttachment(workspaceId, post.id, file);
      await refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to upload attachment.');
    } finally {
      setUploading(false);
    }
  };

  const removeAttachment = async (post: ContentPost, attachmentId: string) => {
    setUploading(true);
    setError('');
    try {
      await contentPostService.removeAttachment(workspaceId, post.id, attachmentId);
      await refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to remove attachment.');
    } finally {
      setUploading(false);
    }
  };

  if (!hasWorkspace) return <div className="p-6 text-sm text-slate-600">Select or create a workspace to view its content calendar.</div>;

  return (
    <main className="mx-auto max-w-[1500px] space-y-3 pb-6 text-slate-900">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-medium text-slate-500">Management <span className="px-1 text-slate-300">/</span> Content Calendar</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-[#171342]">Content Calendar</h1>
          <p className="text-xs text-slate-500">Plan and coordinate your marketing content across channels.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-lg border border-slate-200 bg-white p-1" aria-label="Calendar section">
            <span aria-current="page" className="rounded-md bg-violet-100 px-2.5 py-1.5 text-[10px] font-semibold text-violet-800">Social content</span>
            <button type="button" onClick={onShowEvents} className="rounded-md px-2.5 py-1.5 text-[10px] font-medium text-slate-600 hover:bg-slate-50">Workspace events</button>
          </div>
          <button type="button" onClick={() => openCreate()} className="inline-flex items-center gap-1.5 rounded-lg bg-violet-700 px-3.5 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-violet-800">
            <Plus className="h-4 w-4" /> Create Content
          </button>
        </div>
      </header>

      {error && <div role="alert" className="flex items-center justify-between gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800"><span>{error}</span><button type="button" aria-label="Dismiss error" onClick={() => setError('')}><X className="h-3.5 w-3.5" /></button></div>}
      {choicesError && <div role="status" className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">{choicesError}</div>}

      <section className="grid items-center gap-2 rounded-xl border border-slate-200 bg-white p-2.5 shadow-xs sm:grid-cols-2 xl:grid-cols-[minmax(150px,1fr)_auto_auto_minmax(130px,0.8fr)_minmax(150px,0.9fr)_minmax(150px,0.9fr)]">
        <div className="flex min-w-0 items-center gap-1.5">
          <button type="button" aria-label="Previous period" onClick={() => movePeriod(-1)} className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-violet-50 hover:text-violet-700"><ChevronLeft className="h-4 w-4" /></button>
          <label className="min-w-0 flex-1">
            <span className="sr-only">Calendar month</span>
            <input aria-label="Calendar month" type="month" value={`${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}`} onChange={(event) => {
              if (!event.target.value) return;
              const [year, month] = event.target.value.split('-').map(Number);
              setCurrentMonth(new Date(year, month - 1, 1));
            }} className="w-full min-w-0 rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs font-semibold text-[#171342]" />
          </label>
          <button type="button" aria-label="Next period" onClick={() => movePeriod(1)} className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-violet-50 hover:text-violet-700"><ChevronRight className="h-4 w-4" /></button>
        </div>
        <div className="inline-flex h-9 items-center rounded-lg border border-slate-200 bg-slate-50 p-0.5" role="group" aria-label="Calendar view">
          {(['Month', 'Week', 'List'] as const).map((view) => <button key={view} type="button" aria-pressed={viewMode === view} onClick={() => setViewMode(view)} className={`h-full rounded-md px-3 text-[10px] font-semibold transition ${viewMode === view ? 'bg-violet-100 text-violet-800 shadow-xs' : 'text-slate-600 hover:text-violet-700'}`}>{view}</button>)}
        </div>
        <label className="relative">
          <span className="sr-only">Filter by platform</span>
          <select aria-label="Filter by platform" value={platformFilter} onChange={(event) => setPlatformFilter(event.target.value as ContentPlatform | '')} className="h-9 w-full appearance-none rounded-lg border border-slate-200 bg-white px-3 pr-8 text-[10px] font-medium text-slate-700"><option value="">All platforms</option>{CONTENT_PLATFORMS.map((platform) => <option key={platform}>{platform}</option>)}</select>
          <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
        </label>
        <label className="relative">
          <span className="sr-only">Filter by campaign</span>
          <select aria-label="Filter by campaign" value={campaignFilter} onChange={(event) => setCampaignFilter(event.target.value)} disabled={choicesLoading} className="h-9 w-full appearance-none rounded-lg border border-slate-200 bg-white px-3 pr-8 text-[10px] font-medium text-slate-700 disabled:opacity-50"><option value="">All campaigns</option>{campaigns.map((campaign) => <option key={campaign.id} value={campaign.id}>{campaign.name}</option>)}</select>
          <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
        </label>
        <label className="relative">
          <span className="sr-only">Filter by status</span>
          <select aria-label="Filter by status" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as EditorialStatus | '')} className="h-9 w-full appearance-none rounded-lg border border-slate-200 bg-white px-3 pr-8 text-[10px] font-medium text-slate-700"><option value="">All statuses</option>{statuses.map((status) => <option key={status}>{status}</option>)}</select>
          <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
        </label>
        <label className="relative">
          <span className="sr-only">Search content</span>
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
          <input aria-label="Search content" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search content…" className="h-9 w-full rounded-lg border border-slate-200 bg-white py-2 pl-8 pr-2.5 text-[10px] text-slate-700 placeholder:text-slate-400" />
        </label>
      </section>
      <p className="flex items-center gap-1.5 text-[10px] text-slate-500"><CalendarDays className="h-3 w-3 text-violet-600" />Editorial planning only. Scheduling records an internal date; content is never published externally.</p>
      {loading && <p role="status" className="text-[10px] text-slate-500">Refreshing saved content…</p>}

      <div className="grid min-w-0 gap-3 xl:grid-cols-[minmax(0,1fr)_318px]">
        <section className="min-w-0 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
          {viewMode !== 'List' ? <>
            <div className="grid grid-cols-7 border-b border-slate-200 bg-[#FCFBFE] py-2 text-center text-[9px] font-semibold uppercase tracking-wide text-slate-500 sm:text-[10px]">{['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => <span key={day}>{day}</span>)}</div>
            <div className="grid min-h-[450px] grid-cols-7 grid-rows-6 gap-px bg-slate-200">
              {days.map((day) => {
                const dayPosts = postsOn(day);
                const iso = localDate(day);
                const inMonth = day.getMonth() === currentMonth.getMonth() || viewMode === 'Week';
                return <div key={iso} role="button" tabIndex={0} aria-label={`${day.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}, ${dayPosts.length} posts`} onClick={() => { setSelectedDate(iso); if (viewMode === 'Month' && !inMonth) setCurrentMonth(new Date(day.getFullYear(), day.getMonth(), 1)); }} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); setSelectedDate(iso); } }} className={`min-h-0 overflow-hidden bg-white p-1 text-left transition hover:bg-violet-50/70 sm:p-1.5 ${selectedDate === iso ? 'relative z-10 ring-2 ring-inset ring-violet-500' : ''} ${inMonth ? '' : 'bg-slate-50/70 text-slate-400'}`}>
                  <div className="mb-1 flex items-center justify-between"><span className={`inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[9px] font-medium ${selectedDate === iso ? 'bg-violet-700 text-white' : inMonth ? 'text-slate-600' : 'text-slate-400'}`}>{day.getDate()}</span>{dayPosts.length > 0 && <span className="text-[8px] text-slate-400">{dayPosts.length}</span>}</div>
                  <div className="space-y-0.5">
                    {dayPosts.slice(0, 2).map((post) => <button key={post.id} type="button" title={`${post.title} · ${post.platform} · ${post.status}`} onClick={(event) => { event.stopPropagation(); setSelectedId(post.id); setSelectedDate(iso); }} className={`block w-full min-w-0 rounded-md border px-1 py-1 text-left transition hover:brightness-[0.98] ${statusClass(post.status)} ${post.id === selectedId ? 'ring-1 ring-violet-500' : ''}`}><span className="flex min-w-0 items-center gap-1"><PlatformMark platform={post.platform} compact /><span className="min-w-0 flex-1 truncate text-[8px] font-medium leading-tight sm:text-[9px]">{post.title}</span></span><span className="mt-0.5 hidden items-center gap-1 text-[8px] opacity-80 sm:flex">{post.scheduled_at && <span>{new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit', timeZone: post.timezone }).format(new Date(post.scheduled_at))}</span>}<span className="truncate">{post.status}</span></span></button>)}
                    {dayPosts.length > 2 && <button type="button" onClick={() => { setSelectedDate(iso); setViewMode('List'); }} className="w-full px-1 text-left text-[8px] font-medium text-violet-700 hover:underline">+{dayPosts.length - 2} more</button>}
                  </div>
                </div>;
              })}
            </div>
            <div className="flex items-center justify-between gap-2 border-t border-slate-200 px-3 py-2"><p className="truncate text-[10px] font-semibold text-slate-600">{new Date(`${selectedDate}T12:00:00`).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</p><button type="button" onClick={() => openCreate(selectedDate)} className="shrink-0 text-[10px] font-semibold text-violet-700 hover:underline">+ Add content</button></div>
          </> : <div className="divide-y">
            <div className="flex items-center justify-between px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-slate-500"><span>Scheduled content</span><span>{scheduledPosts.length} posts</span></div>
            {posts.length === 0 && <p className="py-10 text-center text-xs text-slate-500">{loading ? 'Loading content…' : 'No content matches these filters.'}</p>}
            {scheduledPosts.map((post) => <PostRow key={post.id} post={post} selected={post.id === selectedId} onSelect={() => setSelectedId(post.id)} />)}
          </div>}
        </section>

        <aside className="min-w-0 space-y-3">
          {!selectedPost ? <section className="rounded-xl border border-slate-200 bg-white p-5 text-xs text-slate-500 shadow-xs">{loading ? 'Loading saved post details…' : 'Select a post on the calendar to view its details.'}</section> : <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
            <div className="flex items-center justify-between gap-2">
              <PlatformMark platform={selectedPost.platform} />
              <StatusBadge status={selectedPost.status} />
              <button type="button" aria-label="Delete content post" disabled={saving} onClick={() => void deletePost(selectedPost)} className="rounded-md p-1.5 text-slate-400 transition hover:bg-red-50 hover:text-red-600 disabled:opacity-50"><Trash2 className="h-3.5 w-3.5" /></button>
            </div>
            <div className="mt-3 border-b border-slate-100 pb-3">
              <h2 className="text-sm font-bold leading-snug text-[#171342]">{selectedPost.title}</h2>
              <p className="mt-1 text-[10px] font-medium text-slate-500">{selectedPost.content_type || 'Content type unavailable'} · {selectedPost.platform}</p>
              <div className="mt-2 flex items-start gap-1.5 text-[10px] text-slate-600"><CalendarDays className="mt-0.5 h-3.5 w-3.5 shrink-0 text-violet-700" /><span>{selectedPost.scheduled_at ? new Intl.DateTimeFormat(undefined, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: selectedPost.timezone }).format(new Date(selectedPost.scheduled_at)) : 'Unscheduled draft'}<span className="block text-[9px] text-slate-400">{selectedPost.timezone || 'Time zone unavailable'}</span></span></div>
            </div>
            <dl className="grid grid-cols-[78px_minmax(0,1fr)] gap-x-2 gap-y-2 border-b border-slate-100 py-3 text-[10px]">
              <dt className="text-slate-500">Campaign</dt><dd className="truncate font-medium text-slate-800">{selectedPost.campaign?.name || 'Not linked'}</dd>
              <dt className="text-slate-500">Workspace</dt><dd className="truncate font-medium text-slate-800">{currentWorkspace.name}</dd>
              <dt className="text-slate-500">Assigned to</dt><dd className="flex min-w-0 items-center gap-1.5 font-medium text-slate-800">{selectedPost.assignee ? <><span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-violet-100 text-[8px] text-violet-800">{selectedPost.assignee.name.split(/\s+/).map((part) => part[0]).slice(0, 2).join('').toUpperCase()}</span><span className="truncate">{selectedPost.assignee.name}</span></> : 'Unassigned'}</dd>
            </dl>
            <div className="border-b border-slate-100 py-3"><h3 className="text-[10px] font-bold text-slate-800">Caption preview</h3><p className="mt-1.5 max-h-24 overflow-auto whitespace-pre-wrap rounded-lg bg-slate-50 p-2.5 text-[10px] leading-relaxed text-slate-600">{selectedPost.caption || 'No caption has been added.'}</p></div>
            <div className="border-b border-slate-100 py-3">
              <div className="mb-2 flex items-center justify-between"><h3 className="text-[10px] font-bold text-slate-800">Attachments ({selectedPost.attachments.length})</h3><label className={`inline-flex cursor-pointer items-center gap-1 text-[9px] font-semibold text-violet-700 hover:underline ${uploading ? 'pointer-events-none opacity-50' : ''}`}><span className="inline-flex items-center gap-1"><Plus className="h-3 w-3" />{uploading ? 'Uploading…' : 'Add file'}</span><input type="file" accept="image/jpeg,image/png,image/webp,application/pdf,video/mp4" disabled={uploading} className="sr-only" onChange={(event) => { const file = event.target.files?.[0]; if (file) void uploadAttachment(selectedPost, file); event.currentTarget.value = ''; }} /></label></div>
              {selectedPost.attachments.length === 0 ? <p className="text-[9px] text-slate-500">No attachments are available.</p> : <ul className="space-y-1.5">{selectedPost.attachments.map((attachment) => <li key={attachment.id} className="flex items-center gap-2 rounded-lg border border-slate-200 px-2 py-1.5">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-violet-50 text-violet-700">{attachment.mime_type.startsWith('image/') ? <FileText className="h-3.5 w-3.5" /> : <FileText className="h-3.5 w-3.5" />}</span>
                <a href={attachment.download_url} className="min-w-0 flex-1 truncate text-[9px] font-medium text-slate-700 hover:text-violet-700 hover:underline" title={attachment.original_name}>{attachment.original_name}<span className="block text-[8px] font-normal text-slate-400">{attachment.size < 1048576 ? `${Math.max(1, Math.round(attachment.size / 1024))} KB` : `${(attachment.size / 1048576).toFixed(1)} MB`} · {attachment.mime_type.split('/')[1]?.toUpperCase() || 'File'}</span></a>
                <button type="button" disabled={uploading} onClick={() => void removeAttachment(selectedPost, attachment.id)} aria-label={`Remove ${attachment.original_name}`} className="rounded p-1 text-slate-400 hover:text-red-600"><Trash2 className="h-3 w-3" /></button>
              </li>)}</ul>}
            </div>
            <div className="py-3"><h3 className="text-[10px] font-bold text-slate-800">Internal notes</h3><p className="mt-1 whitespace-pre-wrap text-[9px] leading-relaxed text-slate-500">{selectedPost.internal_notes || 'No internal notes.'}</p></div>
            <div className="border-t border-slate-100 pt-3"><h3 className="mb-2 text-[10px] font-bold text-slate-800">Editorial workflow</h3><div className="flex flex-wrap gap-1.5">{nextStatuses(selectedPost.status).map((next) => {
              const approvalBlocked = next === 'Approved' && !['owner', 'admin'].includes(currentMember?.role || '');
              return <button key={next} type="button" disabled={saving || approvalBlocked} title={approvalBlocked ? 'Only workspace owners and admins can approve posts.' : undefined} onClick={() => void changeStatus(selectedPost, next)} className={`rounded-md px-2 py-1.5 text-[9px] font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${next === 'Approved' ? 'bg-teal-600 text-white hover:bg-teal-700' : next === 'Scheduled' ? 'bg-violet-700 text-white hover:bg-violet-800' : 'border border-slate-200 text-slate-700 hover:bg-slate-50'}`}>{next === 'In Review' ? 'Submit for review' : next === 'Approved' ? 'Approve' : next === 'Scheduled' ? 'Schedule internally' : 'Return to draft'}</button>;
            })}</div><p className="mt-2 text-[9px] leading-relaxed text-slate-500">Scheduling records an editorial date only; no external post or ad is published.</p></div>
            <button type="button" onClick={() => openEdit(selectedPost)} className="mt-2 inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-violet-700 px-3 py-2 text-[11px] font-semibold text-white transition hover:bg-violet-800"><FileText className="h-3.5 w-3.5" /> Edit Content</button>
          </section>}

          <section className="rounded-xl border border-slate-200 bg-white p-3 shadow-xs">
            <div className="mb-2 flex items-center justify-between"><h2 className="text-[10px] font-bold uppercase tracking-wide text-slate-600">Unscheduled drafts</h2><span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[9px] text-slate-500">{unscheduledPosts.length}</span></div>
            {unscheduledPosts.length === 0 ? <p className="text-[9px] text-slate-500">{loading ? 'Loading drafts…' : 'No unscheduled drafts.'}</p> : <div className="max-h-36 divide-y divide-slate-100 overflow-auto">{unscheduledPosts.map((post) => <PostRow key={post.id} post={post} selected={post.id === selectedId} onSelect={() => setSelectedId(post.id)} />)}</div>}
          </section>
        </aside>
      </div>

      {form && <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-slate-950/50 p-3 backdrop-blur-[2px] sm:p-5">
        <section role="dialog" aria-modal="true" aria-labelledby="content-form-title" className="content-form-modal my-4 max-h-[94vh] w-full max-w-2xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
          <header className="content-form-header flex items-start justify-between gap-3 border-b border-slate-100 bg-white px-5 py-4 sm:px-6">
            <div><h2 id="content-form-title" className="text-base font-bold text-[#171342]">{editingId ? 'Edit Content' : 'Create Content'}</h2><p className="mt-1 text-[10px] text-slate-500">Plan and review content in {currentWorkspace.name}. Nothing is published externally.</p></div>
            <button type="button" aria-label="Close content form" onClick={() => setForm(null)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"><X className="h-4 w-4" /></button>
          </header>
          <form onSubmit={(event) => void savePost(event)} className="content-form space-y-4 overflow-y-auto px-5 py-4 sm:px-6">
            <Field label="Content title"><input required maxLength={255} value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="Give this content a clear working title" /></Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Platform"><select value={form.platform} onChange={(event) => setForm({ ...form, platform: event.target.value as ContentPlatform })}>{CONTENT_PLATFORMS.map((platform) => <option key={platform}>{platform}</option>)}</select></Field>
              <Field label="Content type"><select value={form.contentType} onChange={(event) => setForm({ ...form, contentType: event.target.value as ContentType })}>{CONTENT_TYPES.map((type) => <option key={type}>{type}</option>)}</select></Field>
              <Field label="Campaign association"><select value={form.campaignId} onChange={(event) => setForm({ ...form, campaignId: event.target.value })} disabled={choicesLoading}><option value="">No campaign</option>{campaigns.map((campaign) => <option key={campaign.id} value={campaign.id}>{campaign.name}</option>)}</select></Field>
              <Field label="Assigned user"><select value={form.assignedTo} onChange={(event) => setForm({ ...form, assignedTo: event.target.value })} disabled={choicesLoading}><option value="">Unassigned</option>{members.map((member) => <option key={member.id} value={member.id}>{member.name}{member.job_title ? ` · ${member.job_title}` : ''}</option>)}</select></Field>
              <Field label="Editorial status"><select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value as EditorialStatus })}>{[editingId ? posts.find((post) => post.id === editingId)?.status || form.status : 'Draft', ...(editingId ? nextStatuses(posts.find((post) => post.id === editingId)?.status || form.status) : ['In Review' as EditorialStatus])].filter((status, index, all) => all.indexOf(status) === index).map((status) => <option key={status}>{status}</option>)}</select></Field>
              <Field label="Time zone"><div className="content-form-timezone flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs font-medium text-slate-700"><CalendarDays className="h-3.5 w-3.5 text-violet-700" />{form.timezone}</div></Field>
            </div>
            <Field label="Caption / copy"><textarea maxLength={10000} rows={4} value={form.caption} onChange={(event) => setForm({ ...form, caption: event.target.value })} className="resize-y" placeholder="Write the channel-specific caption or copy…" /></Field>
            <Field label="Internal notes (workspace only)"><textarea maxLength={10000} rows={2} value={form.internalNotes} onChange={(event) => setForm({ ...form, internalNotes: event.target.value })} className="resize-y" placeholder="Add production notes for your team…" /></Field>

            <section className="rounded-xl border border-violet-100 bg-violet-50/60 p-3">
              <label className="flex cursor-pointer items-start gap-2.5">
                <input type="checkbox" checked={form.scheduled} onChange={(event) => setForm({ ...form, scheduled: event.target.checked })} className="mt-0.5 h-4 w-4 accent-violet-700" />
                <span><span className="block text-xs font-semibold text-slate-800">Add an internal schedule date</span><span className="mt-0.5 block text-[10px] text-slate-500">This date is stored with the editorial item; it does not publish content to a social network.</span></span>
              </label>
              {form.scheduled && <div className="mt-3 grid gap-3 sm:grid-cols-2"><Field label="Scheduled publication date"><input required type="date" value={form.date} onChange={(event) => setForm({ ...form, date: event.target.value })} /></Field><Field label="Scheduled time"><input required type="time" value={form.time} onChange={(event) => setForm({ ...form, time: event.target.value })} /></Field></div>}
            </section>

            <Field label="Attachment (image, PDF or MP4; max 20 MB)"><input type="file" accept="image/jpeg,image/png,image/webp,application/pdf,video/mp4" disabled={uploading} onChange={(event) => setFormAttachment(event.target.files?.[0] || null)} className="block w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-[10px] text-slate-600 file:mr-3 file:rounded-md file:border-0 file:bg-violet-50 file:px-2.5 file:py-1.5 file:text-[10px] file:font-semibold file:text-violet-700" />{formAttachment && <span className="block text-[9px] text-slate-500">Selected: {formAttachment.name}</span>}</Field>
            {choicesError && <p role="alert" className="rounded-lg bg-amber-50 p-2.5 text-[10px] text-amber-800">{choicesError} Campaign/member options may be incomplete.</p>}

            <footer className="flex flex-col-reverse justify-between gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:items-center">
              <button type="button" disabled={saving || uploading} onClick={() => setForm(null)} className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50">Cancel</button>
              <button type="submit" name="status" value={form.status} disabled={saving || uploading || !form.title.trim() || (form.status === 'Scheduled' && !form.scheduled)} className="rounded-lg bg-violet-700 px-4 py-2 text-xs font-semibold text-white hover:bg-violet-800 disabled:cursor-not-allowed disabled:opacity-50">{saving ? 'Saving…' : form.status === 'Scheduled' ? 'Schedule internally' : form.status === 'In Review' ? 'Save & submit for review' : editingId ? 'Save changes' : 'Save Draft'}</button>
            </footer>
            <p className="text-[9px] leading-relaxed text-slate-400">A Draft is saved without publishing. Scheduling is a separate editorial workflow step and requires a date and approval.</p>
          </form>
        </section>
      </div>}
    </main>
  );
};

function PostRow({ post, selected, onSelect }: { post: ContentPost; selected: boolean; onSelect: () => void }) {
  return <button type="button" onClick={onSelect} className={`flex w-full items-center justify-between gap-3 px-1 py-3 text-left hover:bg-slate-50 ${selected ? 'bg-violet-50' : ''}`}>
    <span className="flex min-w-0 items-center gap-2"><PlatformMark platform={post.platform} /><span className="min-w-0"><span className="block truncate text-xs font-semibold text-slate-900">{post.title}</span><span className="mt-1 block truncate text-[10px] text-slate-500">{post.scheduled_at ? `${new Date(post.scheduled_at).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short', timeZone: post.timezone })} · ` : 'Unscheduled · '}{post.campaign?.name || 'No campaign'}</span></span></span>
    <span className={`shrink-0 rounded-full border px-2 py-1 text-[10px] font-medium ${statusClass(post.status)}`}>{post.status}</span>
  </button>;
}

function PlatformMark({ platform, compact = false }: { platform: ContentPlatform; compact?: boolean }) {
  return <span className={`flex shrink-0 items-center justify-center ${compact ? 'h-4 w-4' : 'h-8 w-8 rounded-lg bg-slate-50'}`} title={platform} aria-label={platform}>{platformIcon(platform)}</span>;
}

function StatusBadge({ status }: { status: EditorialStatus }) {
  return <span className={`inline-flex items-center rounded-full border px-2 py-1 text-[9px] font-semibold ${statusClass(status)}`}>{status}</span>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="content-form-field block text-xs font-medium text-slate-700"><span>{label}</span>{children}</label>;
}
