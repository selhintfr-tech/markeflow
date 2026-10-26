import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { calendarService, type CalendarEvent, type CalendarEventInput } from './calendarService';
import { ContentPlanner } from './ContentPlanner';
import { projectService, type ProjectRecord } from '../projects/projectService';
import { taskService, type TaskRecord } from '../tasks/taskService';

type ViewMode = 'Month' | 'Week' | 'List';

interface EventForm {
  title: string;
  description: string;
  date: string;
  starts: string;
  ends: string;
  timezone: string;
  projectId: string;
  taskId: string;
}

const timezoneNow = () => Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
const dateInput = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
const startOfWeek = (date: Date) => {
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
  return start;
};

function zonedIso(date: string, time: string, timezone: string): string {
  const [year, month, day] = date.split('-').map(Number);
  const [hour, minute] = time.split(':').map(Number);
  const wallClockUtc = Date.UTC(year, month - 1, day, hour, minute);
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  });
  const parts = Object.fromEntries(formatter.formatToParts(new Date(wallClockUtc))
    .filter((part) => part.type !== 'literal')
    .map((part) => [part.type, Number(part.value)]));
  const timezoneWallUtc = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
  return new Date(wallClockUtc - (timezoneWallUtc - wallClockUtc)).toISOString();
}

function dateAndTimeInZone(timestamp: string, timezone: string) {
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
  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    time: `${parts.hour}:${parts.minute}`,
  };
}

const emptyForm = (date: string): EventForm => ({
  title: '',
  description: '',
  date,
  starts: '10:00',
  ends: '11:00',
  timezone: timezoneNow(),
  projectId: '',
  taskId: '',
});

const WorkspaceEventCalendar: React.FC<{ onShowContent: () => void }> = ({ onShowContent }) => {
  const { currentWorkspace, hasWorkspace, isLoadingWorkspaces } = useWorkspace();
  const workspaceId = currentWorkspace.id;
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [projects, setProjects] = useState<ProjectRecord[]>([]);
  const [tasks, setTasks] = useState<TaskRecord[]>([]);
  const [linkError, setLinkError] = useState('');
  const [selectedDate, setSelectedDate] = useState(() => dateInput(new Date()));
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [viewMode, setViewMode] = useState<ViewMode>('Month');
  const [search, setSearch] = useState('');
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [form, setForm] = useState<EventForm | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const requestId = useRef(0);
  const loadedWorkspaceId = useRef(workspaceId);

  const visibleRange = useMemo(() => {
    if (viewMode === 'Week') {
      const start = startOfWeek(new Date(`${selectedDate}T12:00:00`));
      const end = new Date(start);
      end.setDate(end.getDate() + 6);
      return { start, end };
    }
    if (viewMode === 'Month') {
      const first = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
      const start = startOfWeek(first);
      const last = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
      const end = new Date(startOfWeek(last));
      end.setDate(end.getDate() + 6);
      return { start, end };
    }
    return {
      start: new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1),
      end: new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0),
    };

  }, [viewMode, selectedDate, currentMonth]);

  const from = useMemo(() => zonedIso(dateInput(visibleRange.start), '00:00', timezoneNow()), [visibleRange.start]);
  const to = useMemo(() => zonedIso(dateInput(visibleRange.end), '23:59', timezoneNow()), [visibleRange.end]);

  const refresh = useCallback(async () => {
    const currentRequest = ++requestId.current;
    if (loadedWorkspaceId.current !== workspaceId) {
      loadedWorkspaceId.current = workspaceId;
      setEvents([]);
      setSelectedEventId(null);
    }
    if (!workspaceId) {
      setEvents([]);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const nextEvents = await calendarService.list(workspaceId, { from, to });
      if (currentRequest === requestId.current) setEvents(nextEvents);
    } catch (cause) {
      if (currentRequest === requestId.current) {
        setError(cause instanceof Error ? cause.message : 'Unable to load calendar events.');
      }
    } finally {
      if (currentRequest === requestId.current) setLoading(false);
    }
  }, [workspaceId, from, to]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    let active = true;
    if (!workspaceId) {
      setProjects([]);
      setTasks([]);
      return () => { active = false; };
    }
    void Promise.allSettled([
      projectService.list(workspaceId),
      taskService.list(workspaceId),
    ]).then(([projectResult, taskResult]) => {
      if (!active) return;
      const failures: string[] = [];
      if (projectResult.status === 'fulfilled') setProjects(projectResult.value);
      else failures.push(`Projects: ${projectResult.reason instanceof Error ? projectResult.reason.message : 'unable to load.'}`);
      if (taskResult.status === 'fulfilled') setTasks(taskResult.value);
      else failures.push(`Tasks: ${taskResult.reason instanceof Error ? taskResult.reason.message : 'unable to load.'}`);
      setLinkError(failures.length ? `Project/task links are unavailable. ${failures.join(' ')}` : '');
    });
    return () => { active = false; };
  }, [workspaceId]);

  const filteredEvents = useMemo(() => events.filter((event) =>
    !search.trim() || `${event.title} ${event.description || ''}`.toLowerCase().includes(search.trim().toLowerCase())
  ), [events, search]);
  const selectedEvent = events.find((event) => event.id === selectedEventId) || null;
  const days = useMemo(() => {
    if (viewMode === 'Week') {
      return Array.from({ length: 7 }, (_, index) => {
        const date = new Date(visibleRange.start);
        date.setDate(date.getDate() + index);
        return date;
      });
    }
    if (viewMode === 'Month') {
      return Array.from({ length: Math.round((visibleRange.end.getTime() - visibleRange.start.getTime()) / 86400000) + 1 }, (_, index) => {
        const date = new Date(visibleRange.start);
        date.setDate(date.getDate() + index);
        return date;
      });
    }
    return [];
  }, [viewMode, visibleRange]);

  const openCreate = (date = selectedDate) => {
    setEditingId(null);
    setForm(emptyForm(date));
    setError('');
  };

  const openEdit = (event: CalendarEvent) => {
    const localDate = dateAndTimeInZone(event.starts_at, event.timezone);
    const localEnd = dateAndTimeInZone(event.ends_at, event.timezone);
    setEditingId(event.id);
    setForm({
      title: event.title,
      description: event.description || '',
      date: localDate.date,
      starts: localDate.time,
      ends: localEnd.time,
      timezone: event.timezone,
      projectId: event.project_id || '',
      taskId: event.task_id || '',
    });
    setError('');
  };

  const saveEvent = async (submitEvent: React.FormEvent) => {
    submitEvent.preventDefault();
    if (!workspaceId || !form) return;
    setSaving(true);
    setError('');
    try {
      const input: CalendarEventInput = {
        title: form.title.trim(),
        description: form.description.trim(),
        starts_at: zonedIso(form.date, form.starts, form.timezone),
        ends_at: zonedIso(form.date, form.ends, form.timezone),
        timezone: form.timezone,
        project_id: form.projectId || null,
        task_id: form.taskId || null,
      };
      const saved = editingId
        ? await calendarService.update(workspaceId, editingId, input)
        : await calendarService.create(workspaceId, input);
      setForm(null);
      setSelectedDate(form.date);
      setSelectedEventId(saved.id);
      await refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'The calendar event could not be saved.');
    } finally {
      setSaving(false);
    }
  };

  const deleteEvent = async (event: CalendarEvent) => {
    if (!workspaceId || !window.confirm(`Delete "${event.title}"?`)) return;
    setSaving(true);
    setError('');
    try {
      await calendarService.delete(workspaceId, event.id);
      setSelectedEventId(null);
      await refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'The calendar event could not be deleted.');
    } finally {
      setSaving(false);
    }
  };

  const navigate = (direction: -1 | 1) => {
    if (viewMode === 'Week') {
      const date = new Date(`${selectedDate}T12:00:00`);
      date.setDate(date.getDate() + direction * 7);
      setSelectedDate(dateInput(date));
      setCurrentMonth(new Date(date.getFullYear(), date.getMonth(), 1));
    } else {
      setCurrentMonth((month) => new Date(month.getFullYear(), month.getMonth() + direction, 1));
    }
  };

  const eventsOn = (date: Date) => filteredEvents.filter((event) =>
    dateAndTimeInZone(event.starts_at, event.timezone).date === dateInput(date)
  );

  if (isLoadingWorkspaces) return <p className="p-6 text-sm text-slate-500">Loading workspaces…</p>;
  if (!hasWorkspace) return <p className="p-6 text-sm text-slate-600">Select or create a workspace to view its calendar.</p>;

  return (
    <main className="mx-auto max-w-7xl space-y-5 p-4 text-slate-900 sm:p-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-slate-500">Marketing / Content Calendar</p>
          <h1 className="mt-1 text-2xl font-bold">Calendar</h1>
          <p className="mt-1 text-sm text-slate-600">{currentWorkspace.name} · persisted workspace events</p>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={onShowContent} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50">Social content</button>
          <button onClick={() => openCreate()} className="rounded-lg bg-violet-700 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-800">Create event</button>
        </div>
      </header>

      {error && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</div>}
      {linkError && <div role="status" className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">{linkError}</div>}

      <section className="rounded-xl border bg-white p-4 sm:p-5">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button aria-label="Previous period" onClick={() => navigate(-1)} className="rounded-lg border p-2 hover:bg-slate-50">‹</button>
            <button aria-label="Next period" onClick={() => navigate(1)} className="rounded-lg border p-2 hover:bg-slate-50">›</button>
            <h2 className="min-w-40 text-lg font-semibold">{currentMonth.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</h2>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <input aria-label="Search events" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search events" className="rounded-lg border px-3 py-2 text-sm" />
            <div className="flex rounded-lg border p-1">
              {(['Month', 'Week', 'List'] as const).map((mode) => <button key={mode} onClick={() => setViewMode(mode)} className={`rounded px-3 py-1.5 text-sm ${viewMode === mode ? 'bg-violet-100 font-semibold text-violet-800' : 'text-slate-600'}`}>{mode}</button>)}
            </div>
            <button onClick={() => void refresh()} disabled={loading} className="rounded-lg border px-3 py-2 text-sm disabled:opacity-50">{loading ? 'Loading…' : 'Refresh'}</button>
          </div>
        </div>

        {viewMode !== 'List' ? <>
          <div className="grid grid-cols-7 border-b pb-2 text-center text-xs font-semibold uppercase text-slate-500">{['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => <span key={day}>{day}</span>)}</div>
          <div className="mt-2 grid grid-cols-7 gap-px overflow-hidden rounded-lg border bg-slate-200">
            {days.map((date) => {
              const dayEvents = eventsOn(date);
              const iso = dateInput(date);
              const isInMonth = date.getMonth() === currentMonth.getMonth() || viewMode === 'Week';
              return <button key={iso} onClick={() => { setSelectedDate(iso); if (viewMode === 'Month' && !isInMonth) setCurrentMonth(new Date(date.getFullYear(), date.getMonth(), 1)); }} className={`min-h-24 bg-white p-2 text-left hover:bg-violet-50 sm:min-h-32 ${selectedDate === iso ? 'ring-2 ring-inset ring-violet-500' : ''} ${isInMonth ? '' : 'text-slate-400'}`}>
                <span className="text-xs font-medium">{date.getDate()}</span>
                <span className="mt-1 block space-y-1">
                  {dayEvents.slice(0, 3).map((event) => <span key={event.id} onClick={(click) => { click.stopPropagation(); setSelectedEventId(event.id); }} className="block truncate rounded bg-violet-100 px-1.5 py-1 text-xs text-violet-900">{event.title}</span>)}
                  {dayEvents.length > 3 && <span className="block text-xs text-slate-500">+{dayEvents.length - 3} more</span>}
                </span>
              </button>;
            })}
          </div>
        </> : (
          <div className="divide-y">
            {filteredEvents.length === 0 ? <p className="py-10 text-center text-sm text-slate-500">{loading ? 'Loading events…' : 'No events in this date range.'}</p> : filteredEvents.map((event) => <EventRow key={event.id} event={event} selected={event.id === selectedEventId} onSelect={() => setSelectedEventId(event.id)} />)}
          </div>
        )}

        <div className="mt-5 flex flex-wrap items-center justify-between gap-2 border-t pt-4">
          <h3 className="font-semibold">{new Date(`${selectedDate}T12:00:00`).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</h3>
          <button onClick={() => openCreate(selectedDate)} className="text-sm font-medium text-violet-700 hover:underline">Add event on this date</button>
        </div>
        {eventsOn(new Date(`${selectedDate}T12:00:00`)).length === 0 ? (
          <p className="py-5 text-sm text-slate-500">{loading ? 'Loading events…' : 'No events scheduled for this date.'}</p>
        ) : eventsOn(new Date(`${selectedDate}T12:00:00`)).map((event) => <EventRow key={event.id} event={event} selected={event.id === selectedEventId} onSelect={() => setSelectedEventId(event.id)} />)}
      </section>

      {selectedEvent && <section className="rounded-xl border bg-white p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">{selectedEvent.title}</h2>
            <p className="mt-1 text-sm text-slate-600">{formatEventTime(selectedEvent)}</p>
            {selectedEvent.description && <p className="mt-3 whitespace-pre-wrap text-sm text-slate-700">{selectedEvent.description}</p>}
            {selectedEvent.project && <p className="mt-2 text-xs text-slate-500">Project: {selectedEvent.project.name}</p>}
            {selectedEvent.task && <p className="text-xs text-slate-500">Task: {selectedEvent.task.title}</p>}
          </div>
          <div className="flex gap-2">
            <button onClick={() => openEdit(selectedEvent)} className="rounded-lg border px-3 py-2 text-sm hover:bg-slate-50">Edit</button>
            <button disabled={saving} onClick={() => void deleteEvent(selectedEvent)} className="rounded-lg border border-red-200 px-3 py-2 text-sm text-red-700 hover:bg-red-50 disabled:opacity-50">Delete</button>
          </div>
        </div>
      </section>}

      {form && <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/40 p-4">
        <section role="dialog" aria-modal="true" aria-label={editingId ? 'Edit calendar event' : 'Create calendar event'} className="max-h-[90vh] w-full max-w-lg overflow-auto rounded-xl bg-white p-5 shadow-xl">
          <div className="mb-4 flex items-center justify-between"><h2 className="text-lg font-semibold">{editingId ? 'Edit event' : 'Create event'}</h2><button aria-label="Close" onClick={() => setForm(null)} className="rounded px-2 py-1 hover:bg-slate-100">×</button></div>
          <form onSubmit={(event) => void saveEvent(event)} className="space-y-3">
            <Field label="Title"><input required maxLength={255} value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} className="field" /></Field>
            <Field label="Description"><textarea maxLength={10000} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} className="field min-h-24" /></Field>
            <Field label="Date"><input required type="date" value={form.date} onChange={(event) => setForm({ ...form, date: event.target.value })} className="field" /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Starts"><input required type="time" value={form.starts} onChange={(event) => setForm({ ...form, starts: event.target.value })} className="field" /></Field>
              <Field label="Ends"><input required type="time" value={form.ends} onChange={(event) => setForm({ ...form, ends: event.target.value })} className="field" /></Field>
            </div>
            <Field label="Timezone (IANA)"><input required value={form.timezone} onChange={(event) => setForm({ ...form, timezone: event.target.value })} className="field" placeholder="America/New_York" /></Field>
            <Field label="Project (optional)"><select value={form.projectId} onChange={(event) => setForm({ ...form, projectId: event.target.value, taskId: '' })} className="field"><option value="">No project</option>{projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}</select></Field>
            <Field label="Task (optional)"><select value={form.taskId} onChange={(event) => setForm({ ...form, taskId: event.target.value })} className="field"><option value="">No task</option>{tasks.filter((task) => !form.projectId || task.project_id === form.projectId).map((task) => <option key={task.id} value={task.id}>{task.title}</option>)}</select></Field>
            <p className="text-xs text-slate-500">Times are converted to UTC with an explicit offset; project and task links can be attached when supported records are available.</p>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setForm(null)} className="rounded-lg border px-4 py-2 text-sm">Cancel</button>
              <button disabled={saving} className="rounded-lg bg-violet-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{saving ? 'Saving…' : 'Save event'}</button>
            </div>
          </form>
        </section>
      </div>}
    </main>
  );
};

export const ContentCalendarPage: React.FC = () => {
  const [section, setSection] = useState<'content' | 'events'>('content');

  return (
    <div className="mx-auto max-w-[1500px] px-4 pt-3 sm:px-6">
      {section === 'content'
        ? <ContentPlanner onShowEvents={() => setSection('events')} />
        : <WorkspaceEventCalendar onShowContent={() => setSection('content')} />}
    </div>
  );
};

function formatEventTime(event: CalendarEvent) {
  const start = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short', timeZone: event.timezone }).format(new Date(event.starts_at));
  const end = new Intl.DateTimeFormat(undefined, { timeStyle: 'short', timeZone: event.timezone }).format(new Date(event.ends_at));
  return `${start} – ${end} (${event.timezone})`;
}

function EventRow({ event, selected, onSelect }: { event: CalendarEvent; selected: boolean; onSelect: () => void }) {
  return <button onClick={onSelect} className={`flex w-full items-center justify-between gap-3 border-b px-1 py-3 text-left hover:bg-slate-50 ${selected ? 'bg-violet-50' : ''}`}>
    <span className="min-w-0"><span className="block truncate font-medium">{event.title}</span><span className="mt-1 block truncate text-xs text-slate-500">{formatEventTime(event)}</span></span>
    <span className="shrink-0 text-xs text-slate-500">{event.project?.name || event.task?.title || ''}</span>
  </button>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block space-y-1 text-sm font-medium text-slate-700">{label}{children}</label>;
}
