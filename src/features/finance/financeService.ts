import { apiRequest } from '../api/apiClient';
import type { ApiCollection } from '../api/apiClient';

export interface FinanceBudget {
  id: string;
  name: string;
  category: string;
  amount: string;
  starts_on: string;
  ends_on: string;
  notes: string | null;
}

export interface FinanceTransaction {
  id: string;
  campaign_id: string | null;
  order_id: string | null;
  created_by: number;
  creator_name: string | null;
  type: 'expense' | 'income';
  category: string;
  description: string | null;
  amount: string;
  occurred_on: string;
}

export interface FinanceSummary {
  income: string;
  expenses: string;
  budgets: Array<{
    budget_id: string;
    category: string;
    budget: string;
    actual: string;
    variance: string;
  }>;
}

export interface FinanceFilter {
  from?: string;
  to?: string;
  campaign_id?: string;
  status?: string;
  search?: string;
}

export interface FinanceBudgetFilter {
  starts_on?: string;
  ends_on?: string;
}

export interface OrderFinancialRecord {
  id: string;
  order_number: string;
  status: string;
  payment_status: string;
  subtotal: string;
  total: string;
  currency: string;
  items: Array<{ name: string; quantity: number; unit_price: number }>;
  shipment: {
    status: string;
    shipping_cost: string;
    customer_shipping_charge: string | null;
    cod_amount: string | null;
    payment_collection_status: string;
    delivery_company_id?: string | null;
    tracking_number?: string | null;
  } | null;
  ozon_flow?: {
    carrier: string;
    tracking_number: string | null;
    product_subtotal: number;
    customer_shipping_charge: number | null;
    expected_cod: number | null;
    courier_cost: number | null;
    expected_net_remittance: number | null;
    verified_collected: number | null;
    verified_net_remittance: number | null;
  };
  financials: {
    has_record: boolean;
    campaign_id: string | null;
    product_cost_total: string | null;
    customer_shipping_charge: string | null;
    sales_collected: string | null;
    shipping_collected: string | null;
    courier_cost: string | null;
    other_expenses: string | null;
    refund_return_cost: string | null;
    profit_share_percent: string | null;
    partner_profit_share: number | null;
    net_order_profit: number | null;
    is_complete: boolean;
  } | null;
  ledger?: {
    is_posted: boolean;
    transaction_count: number;
    posted_revenue: number;
    posted_expenses: number;
    transactions: Array<{
      id: string;
      type: string;
      category: string;
      amount: string;
      occurred_on: string;
      description: string | null;
    }>;
  };
  realized_collected: number | null;
  created_at: string;
}

export interface OrderFinancialInput {
  campaign_id: string | null;
  product_cost_total: string | null;
  customer_shipping_charge?: string | null;
  sales_collected: string | null;
  shipping_collected: string | null;
  courier_cost?: string | null;
  other_expenses: string | null;
  refund_return_cost: string | null;
  profit_share_percent: string | null;
  post_to_ledger?: boolean;
}

export interface BudgetInput {
  name: string;
  category: string;
  amount: string;
  starts_on: string;
  ends_on: string;
  notes: string;
}

export interface TransactionInput {
  type: FinanceTransaction['type'];
  category: string;
  description: string;
  amount: string;
  occurred_on: string;
  campaign_id?: string | null;
  order_id?: string | null;
}

async function allPages<T>(path: string, workspaceId: string): Promise<T[]> {
  const values: T[] = [];
  let page = 1;
  let lastPage = 1;

  do {
    const separator = path.includes('?') ? '&' : '?';
    const response = await apiRequest<ApiCollection<T>>(
      `${path}${separator}per_page=100&page=${page}`,
      { workspaceId },
    );
    values.push(...response.data);
    lastPage = response.meta?.last_page ?? page;
    page += 1;
  } while (page <= lastPage);

  return values;
}

export const financeService = {
  listBudgets: (workspaceId: string, filters: FinanceBudgetFilter = {}) => {
    const query = new URLSearchParams();
    if (filters.starts_on) query.set('starts_on', filters.starts_on);
    if (filters.ends_on) query.set('ends_on', filters.ends_on);
    return allPages<FinanceBudget>(`/api/finance/budgets${query.size ? `?${query}` : ''}`, workspaceId);
  },
  listTransactions: (workspaceId: string, filters: FinanceFilter = {}) => {
    const query = new URLSearchParams();
    if (filters.from) query.set('from', filters.from);
    if (filters.to) query.set('to', filters.to);
    if (filters.campaign_id) query.set('campaign_id', filters.campaign_id);
    return allPages<FinanceTransaction>(`/api/finance/transactions${query.size ? `?${query}` : ''}`, workspaceId);
  },
  async summary(workspaceId: string, filters: FinanceFilter = {}): Promise<FinanceSummary> {
    const query = new URLSearchParams();
    if (filters.from) query.set('from', filters.from);
    if (filters.to) query.set('to', filters.to);
    if (filters.campaign_id) query.set('campaign_id', filters.campaign_id);
    const response = await apiRequest<{ data: FinanceSummary }>(`/api/finance/summary${query.size ? `?${query}` : ''}`, { workspaceId });
    return response.data;
  },
  listOrderFinancials: (workspaceId: string, filters: FinanceFilter = {}) => {
    const query = new URLSearchParams();
    if (filters.from) query.set('from', filters.from);
    if (filters.to) query.set('to', filters.to);
    if (filters.campaign_id) query.set('campaign_id', filters.campaign_id);
    if (filters.status) query.set('status', filters.status);
    if (filters.search) query.set('search', filters.search);
    return allPages<OrderFinancialRecord>(`/api/finance/order-profitability${query.size ? `?${query}` : ''}`, workspaceId);
  },
  async saveOrderFinancials(workspaceId: string, orderId: string, body: OrderFinancialInput): Promise<OrderFinancialRecord> {
    const response = await apiRequest<{ data: OrderFinancialRecord }>(`/api/finance/orders/${encodeURIComponent(orderId)}/profitability`, {
      method: 'PUT',
      workspaceId,
      body,
    });
    return response.data;
  },
  async postOrderToLedger(workspaceId: string, orderId: string): Promise<OrderFinancialRecord> {
    const response = await apiRequest<{ data: OrderFinancialRecord }>(`/api/finance/orders/${encodeURIComponent(orderId)}/post-to-ledger`, {
      method: 'POST',
      workspaceId,
    });
    return response.data;
  },
  async removeOrderFromLedger(workspaceId: string, orderId: string): Promise<OrderFinancialRecord> {
    const response = await apiRequest<{ data: OrderFinancialRecord }>(`/api/finance/orders/${encodeURIComponent(orderId)}/post-to-ledger`, {
      method: 'DELETE',
      workspaceId,
    });
    return response.data;
  },
  async categories(workspaceId: string): Promise<string[]> {
    const response = await apiRequest<{ data: string[] }>('/api/finance/categories', { workspaceId });
    return response.data;
  },
  async createBudget(workspaceId: string, body: BudgetInput): Promise<FinanceBudget> {
    const response = await apiRequest<{ data: FinanceBudget }>('/api/finance/budgets', { method: 'POST', workspaceId, body });
    return response.data;
  },
  async updateBudget(workspaceId: string, id: string, body: BudgetInput): Promise<FinanceBudget> {
    const response = await apiRequest<{ data: FinanceBudget }>(`/api/finance/budgets/${id}`, { method: 'PATCH', workspaceId, body });
    return response.data;
  },
  deleteBudget: (workspaceId: string, id: string) =>
    apiRequest<void>(`/api/finance/budgets/${id}`, { method: 'DELETE', workspaceId }),
  async createTransaction(workspaceId: string, body: TransactionInput): Promise<FinanceTransaction> {
    const response = await apiRequest<{ data: FinanceTransaction }>('/api/finance/transactions', { method: 'POST', workspaceId, body });
    return response.data;
  },
  async updateTransaction(workspaceId: string, id: string, body: TransactionInput): Promise<FinanceTransaction> {
    const response = await apiRequest<{ data: FinanceTransaction }>(`/api/finance/transactions/${id}`, { method: 'PATCH', workspaceId, body });
    return response.data;
  },
  deleteTransaction: (workspaceId: string, id: string) =>
    apiRequest<void>(`/api/finance/transactions/${id}`, { method: 'DELETE', workspaceId }),
};
