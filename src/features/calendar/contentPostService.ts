import { apiRequest, type ApiCollection } from '../api/apiClient';

export const CONTENT_PLATFORMS = [
  'Instagram',
  'Facebook',
  'TikTok',
  'Email',
  'Meta Ads',
  'X',
  'LinkedIn',
  'YouTube',
  'Video',
  'Media',
  'Blog',
  'Website',
] as const;

export const CONTENT_TYPES = [
  'Post',
  'Carousel',
  'Reel',
  'Story',
  'Video',
  'Article',
  'Email',
] as const;

export type ContentPlatform = typeof CONTENT_PLATFORMS[number];
export type ContentType = typeof CONTENT_TYPES[number];
export type EditorialStatus = 'Draft' | 'In Review' | 'Approved' | 'Scheduled';

export interface ContentPost {
  id: string;
  workspace_id: string;
  created_by: number;
  assigned_to: number | null;
  campaign_id: string | null;
  approved_by: number | null;
  title: string;
  platform: ContentPlatform;
  content_type: ContentType;
  status: EditorialStatus;
  caption: string | null;
  internal_notes: string | null;
  scheduled_at: string | null;
  timezone: string;
  approved_at: string | null;
  campaign?: { id: string; name: string } | null;
  assignee?: { id: number; name: string } | null;
  attachments: ContentAttachment[];
  created_at: string;
  updated_at: string;
}

export interface ContentAttachment {
  id: string;
  content_post_id: string;
  original_name: string;
  mime_type: string;
  size: number;
  download_url: string;
  created_at: string;
}

export interface WorkspaceContentMember {
  id: number;
  name: string;
  job_title: string | null;
  role: string;
}

export interface ContentPostInput {
  title: string;
  platform: ContentPlatform;
  content_type: ContentType;
  caption: string;
  internal_notes: string;
  campaign_id: string | null;
  assigned_to: number | null;
  scheduled_at: string | null;
  timezone: string;
}

interface ContentFilters {
  from: string;
  to: string;
  search?: string;
  platform?: ContentPlatform | '';
  campaign_id?: string;
  status?: EditorialStatus | '';
}

export const contentPostService = {
  async list(workspaceId: string, filters: ContentFilters): Promise<ContentPost[]> {
    const query = new URLSearchParams({
      from: filters.from,
      to: filters.to,
      per_page: '100',
      page: '1',
    });
    if (filters.search) query.set('search', filters.search);
    if (filters.platform) query.set('platform', filters.platform);
    if (filters.campaign_id) query.set('campaign_id', filters.campaign_id);
    if (filters.status) query.set('status', filters.status);

    const posts: ContentPost[] = [];
    while (true) {
      const response = await apiRequest<ApiCollection<ContentPost>>(`/api/content/posts?${query}`, { workspaceId });
      posts.push(...response.data);
      if (!response.meta || Number(query.get('page')) >= response.meta.last_page) return posts;
      query.set('page', String(Number(query.get('page')) + 1));
    }
  },
  async members(workspaceId: string): Promise<WorkspaceContentMember[]> {
    const response = await apiRequest<{ data: WorkspaceContentMember[] }>('/api/content/members', { workspaceId });
    return response.data;
  },
  async create(workspaceId: string, input: ContentPostInput): Promise<ContentPost> {
    const response = await apiRequest<{ data: ContentPost }>('/api/content/posts', {
      method: 'POST',
      workspaceId,
      body: input,
    });
    return response.data;
  },
  async update(workspaceId: string, id: string, input: Partial<ContentPostInput> & { status?: EditorialStatus }): Promise<ContentPost> {
    const response = await apiRequest<{ data: ContentPost }>(`/api/content/posts/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      workspaceId,
      body: input,
    });
    return response.data;
  },
  async remove(workspaceId: string, id: string): Promise<void> {
    await apiRequest(`/api/content/posts/${encodeURIComponent(id)}`, { method: 'DELETE', workspaceId });
  },
  async uploadAttachment(workspaceId: string, postId: string, file: File): Promise<ContentAttachment> {
    const body = new FormData();
    body.append('attachment', file);
    const response = await apiRequest<{ data: ContentAttachment }>(`/api/content/posts/${encodeURIComponent(postId)}/attachments`, {
      method: 'POST',
      workspaceId,
      body,
    });
    return response.data;
  },
  async removeAttachment(workspaceId: string, postId: string, attachmentId: string): Promise<void> {
    await apiRequest(`/api/content/posts/${encodeURIComponent(postId)}/attachments/${encodeURIComponent(attachmentId)}`, {
      method: 'DELETE',
      workspaceId,
    });
  },
};
