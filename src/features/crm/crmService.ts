import { apiRequest, type ApiCollection } from '../api/apiClient';

export interface CrmOwner {
  id: number;
  name: string;
  email: string;
}

export interface CrmContact {
  id: string;
  first_name: string;
  last_name: string | null;
  name: string;
  company_name: string | null;
  email: string | null;
  phone: string | null;
  job_title: string | null;
  preferred_contact: string | null;
  location: string | null;
  lifecycle_stage: string;
  status: string;
  owner_id: number | null;
  owner?: CrmOwner | null;
  notes: string | null;
}

export interface CrmLead {
  id: string;
  name: string;
  company: string;
  email: string;
  phone: string;
  source: string | null;
  sourceCampaign: string | null;
  source_campaign_id: string | null;
  relatedProject: string | null;
  related_project_id: string | null;
  status: string;
  leadStatus: string;
  pipeline_id: string | null;
  stage_id: string | null;
  pipeline?: { id: string; name: string } | null;
  stage?: { id: string; name: string; code: string | null; color: string | null } | null;
  estimated_value: number | null;
  currency: string;
  preferredContact: string | null;
  location: string | null;
  next_follow_up_at: string | null;
  converted_at: string | null;
  converted_to_customer_id: string | null;
  internalNotes: string | null;
  assignedTo?: CrmOwner & { initials: string } | null;
  activities?: CrmActivity[];
  created_at: string;
}

export interface CrmCustomer {
  id: string;
  contact_id: string | null;
  lead_id: string | null;
  company_name: string;
  contact_name: string;
  email: string | null;
  phone: string | null;
  status: string;
  customer_tier: string;
  total_revenue: number;
  currency: string;
  owner_id: number | null;
  owner?: CrmOwner | null;
  converted_at: string | null;
  notes: string | null;
}

export interface CrmSalesCustomer {
  id: string;
  first_name: string;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  orders_count?: number;
}

export interface CrmSalesOrder {
  id: string;
  order_number: string;
  status: string;
  payment_status: string;
  total: string;
  currency: string;
  customer: CrmSalesCustomer;
  created_at: string;
}

export interface CrmStage {
  id: string;
  pipeline_id: string;
  name: string;
  code: string | null;
  color: string | null;
  probability: number;
  display_order: number;
  is_won: boolean;
  is_lost: boolean;
}

export interface CrmPipeline {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  is_default: boolean;
  display_order: number;
  stages: CrmStage[];
}

export interface CrmActivity {
  id: string;
  lead_id: string | null;
  contact_id: string | null;
  customer_id: string | null;
  type: string;
  title: string;
  description: string | null;
  activity_date: string;
  user?: CrmOwner | null;
}

export interface CrmNote {
  id: string;
  lead_id: string | null;
  contact_id: string | null;
  customer_id: string | null;
  content: string;
  is_pinned: boolean;
  user?: CrmOwner | null;
  created_at: string;
}

export interface FunnelStage {
  status: string;
  label: string;
  count: number;
  color: string;
}

type ListParams = Record<string, string | number | undefined>;

async function list<T>(workspaceId: string, path: string, params: ListParams = {}): Promise<ApiCollection<T>> {
  const query = new URLSearchParams({ per_page: '100', page: '1' });
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '') query.set(key, String(value));
  }
  const records: T[] = [];
  let meta: ApiCollection<T>['meta'];
  do {
    const result = await apiRequest<ApiCollection<T>>(`${path}?${query}`, { workspaceId });
    records.push(...result.data);
    meta = result.meta;
    if (!meta || Number(query.get('page')) >= meta.last_page) break;
    query.set('page', String(Number(query.get('page')) + 1));
  } while (true);
  return { data: records, meta };
}

async function item<T>(path: string, workspaceId: string, method: 'GET' | 'POST' | 'PATCH' | 'DELETE' = 'GET', body?: unknown): Promise<T> {
  const response = await apiRequest<{ data: T } | T>(path, { workspaceId, method, body });
  return (typeof response === 'object' && response !== null && 'data' in response
    ? response.data
    : response) as T;
}

const base = '/api/crm';

export const crmService = {
  contacts: (workspaceId: string, params: ListParams = {}) => list<CrmContact>(workspaceId, `${base}/contacts`, params),
  contact: (workspaceId: string, id: string) => item<CrmContact>(`${base}/contacts/${id}`, workspaceId),
  createContact: (workspaceId: string, body: Record<string, unknown>) => item<CrmContact>(`${base}/contacts`, workspaceId, 'POST', body),
  updateContact: (workspaceId: string, id: string, body: Record<string, unknown>) => item<CrmContact>(`${base}/contacts/${id}`, workspaceId, 'PATCH', body),
  deleteContact: (workspaceId: string, id: string) => item<void>(`${base}/contacts/${id}`, workspaceId, 'DELETE'),

  leads: (workspaceId: string, params: ListParams = {}) => list<CrmLead>(workspaceId, `${base}/leads`, params),
  lead: (workspaceId: string, id: string) => item<CrmLead>(`${base}/leads/${id}`, workspaceId),
  createLead: (workspaceId: string, body: Record<string, unknown>) => item<CrmLead>(`${base}/leads`, workspaceId, 'POST', body),
  updateLead: (workspaceId: string, id: string, body: Record<string, unknown>) => item<CrmLead>(`${base}/leads/${id}`, workspaceId, 'PATCH', body),
  deleteLead: (workspaceId: string, id: string) => item<void>(`${base}/leads/${id}`, workspaceId, 'DELETE'),
  convertLead: (workspaceId: string, id: string, body: Record<string, unknown> = {}) => item<CrmCustomer>(`${base}/leads/${id}/convert`, workspaceId, 'POST', body),
  async funnel(workspaceId: string): Promise<FunnelStage[]> {
    const response = await apiRequest<{ data: FunnelStage[] }>(`${base}/leads/funnel`, { workspaceId });
    return response.data;
  },

  customers: (workspaceId: string, params: ListParams = {}) => list<CrmCustomer>(workspaceId, `${base}/customers`, params),
  customer: (workspaceId: string, id: string) => item<CrmCustomer>(`${base}/customers/${id}`, workspaceId),
  createCustomer: (workspaceId: string, body: Record<string, unknown>) => item<CrmCustomer>(`${base}/customers`, workspaceId, 'POST', body),
  updateCustomer: (workspaceId: string, id: string, body: Record<string, unknown>) => item<CrmCustomer>(`${base}/customers/${id}`, workspaceId, 'PATCH', body),
  deleteCustomer: (workspaceId: string, id: string) => item<void>(`${base}/customers/${id}`, workspaceId, 'DELETE'),
  async salesCustomers(workspaceId: string): Promise<CrmSalesCustomer[]> {
    const response = await apiRequest<{ data: CrmSalesCustomer[] }>('/api/sales/customers', { workspaceId });
    return response.data;
  },
  async updateSalesCustomer(workspaceId: string, id: string, body: Partial<Omit<CrmSalesCustomer, 'id' | 'orders_count'>>): Promise<CrmSalesCustomer> {
    const response = await apiRequest<{ data: CrmSalesCustomer }>(`/api/sales/customers/${id}`, {
      workspaceId,
      method: 'PATCH',
      body,
    });
    return response.data;
  },
  async deleteSalesCustomer(workspaceId: string, id: string): Promise<{ message: string; data: { id: string; first_name: string; last_name: string | null } }> {
    return apiRequest<{ message: string; data: { id: string; first_name: string; last_name: string | null } }>(`/api/sales/customers/${id}`, {
      workspaceId,
      method: 'DELETE',
    });
  },
  async salesOrdersForCustomer(workspaceId: string, customer: CrmSalesCustomer): Promise<CrmSalesOrder[]> {
    const query = new URLSearchParams({
      search: customer.email || customer.first_name,
    });
    const response = await apiRequest<{ data: CrmSalesOrder[] }>(`/api/sales/orders?${query}`, { workspaceId });
    return response.data.filter((order) => String(order.customer.id) === String(customer.id));
  },

  async pipelines(workspaceId: string): Promise<CrmPipeline[]> {
    const response = await apiRequest<ApiCollection<CrmPipeline>>(`${base}/pipelines`, { workspaceId });
    return response.data;
  },
  pipeline: (workspaceId: string, id: string) => item<CrmPipeline>(`${base}/pipelines/${id}`, workspaceId),
  createPipeline: (workspaceId: string, body: Record<string, unknown>) => item<CrmPipeline>(`${base}/pipelines`, workspaceId, 'POST', body),
  updatePipeline: (workspaceId: string, id: string, body: Record<string, unknown>) => item<CrmPipeline>(`${base}/pipelines/${id}`, workspaceId, 'PATCH', body),
  deletePipeline: (workspaceId: string, id: string) => item<void>(`${base}/pipelines/${id}`, workspaceId, 'DELETE'),
  createStage: (workspaceId: string, pipelineId: string, body: Record<string, unknown>) => item<CrmStage>(`${base}/pipelines/${pipelineId}/stages`, workspaceId, 'POST', { ...body, pipeline_id: pipelineId }),
  updateStage: (workspaceId: string, id: string, body: Record<string, unknown>) => item<CrmStage>(`${base}/stages/${id}`, workspaceId, 'PATCH', body),
  deleteStage: (workspaceId: string, id: string) => item<void>(`${base}/stages/${id}`, workspaceId, 'DELETE'),
  async reorderStages(workspaceId: string, stages: Array<Pick<CrmStage, 'id' | 'display_order'>>): Promise<void> {
    await apiRequest(`${base}/stages/reorder`, { workspaceId, method: 'POST', body: { stages } });
  },

  async notes(workspaceId: string, params: ListParams): Promise<CrmNote[]> {
    return (await list<CrmNote>(workspaceId, `${base}/notes`, params)).data;
  },
  createNote: (workspaceId: string, body: Record<string, unknown>) => item<CrmNote>(`${base}/notes`, workspaceId, 'POST', body),
  updateNote: (workspaceId: string, id: string, body: Record<string, unknown>) => item<CrmNote>(`${base}/notes/${id}`, workspaceId, 'PATCH', body),
  deleteNote: (workspaceId: string, id: string) => item<void>(`${base}/notes/${id}`, workspaceId, 'DELETE'),
  async activities(workspaceId: string, params: ListParams): Promise<CrmActivity[]> {
    return (await list<CrmActivity>(workspaceId, `${base}/activities`, params)).data;
  },
  createActivity: (workspaceId: string, body: Record<string, unknown>) => item<CrmActivity>(`${base}/activities`, workspaceId, 'POST', body),
  deleteActivity: (workspaceId: string, id: string) => item<void>(`${base}/activities/${id}`, workspaceId, 'DELETE'),
};
