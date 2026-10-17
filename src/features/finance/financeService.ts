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
  listBudgets: (workspaceId: string) =>
    allPages<FinanceBudget>('/api/finance/budgets', workspaceId),
  listTransactions: (workspaceId: string) =>
    allPages<FinanceTransaction>('/api/finance/transactions', workspaceId),
  async summary(workspaceId: string): Promise<FinanceSummary> {
    const response = await apiRequest<{ data: FinanceSummary }>('/api/finance/summary', { workspaceId });
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
