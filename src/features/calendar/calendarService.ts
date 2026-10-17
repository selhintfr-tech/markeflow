import { apiRequest } from '../api/apiClient';
import type { ApiCollection } from '../api/apiClient';

export interface CalendarEvent {
  id: string;
  title: string;
  description: string | null;
  starts_at: string;
  ends_at: string;
  timezone: string;
  project_id: string | null;
  task_id: string | null;
  project?: { id: string; name: string } | null;
  task?: { id: string; title: string } | null;
}

export interface CalendarEventInput {
  title: string;
  description: string;
  starts_at: string;
  ends_at: string;
  timezone: string;
  project_id?: string | null;
  task_id?: string | null;
}

export interface CalendarRange {
  from: string;
  to: string;
}

export const calendarService = {
  async list(workspaceId: string, range: CalendarRange): Promise<CalendarEvent[]> {
    const values: CalendarEvent[] = [];
    let page = 1;
    let lastPage = 1;

    do {
      const query = new URLSearchParams({
        from: range.from,
        to: range.to,
        per_page: '100',
        page: String(page),
      });
      const response = await apiRequest<ApiCollection<CalendarEvent>>(
        `/api/calendar/events?${query.toString()}`,
        { workspaceId },
      );
      values.push(...response.data);
      lastPage = response.meta?.last_page ?? page;
      page += 1;
    } while (page <= lastPage);

    return values;
  },
  async create(workspaceId: string, body: CalendarEventInput): Promise<CalendarEvent> {
    const response = await apiRequest<{ data: CalendarEvent }>('/api/calendar/events', { method: 'POST', workspaceId, body });
    return response.data;
  },
  async update(workspaceId: string, id: string, body: CalendarEventInput): Promise<CalendarEvent> {
    const response = await apiRequest<{ data: CalendarEvent }>(`/api/calendar/events/${id}`, { method: 'PATCH', workspaceId, body });
    return response.data;
  },
  delete: (workspaceId: string, id: string) =>
    apiRequest<void>(`/api/calendar/events/${id}`, { method: 'DELETE', workspaceId }),
};
