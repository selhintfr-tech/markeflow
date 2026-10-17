import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useWorkspace } from '../../context/WorkspaceContext';
import {
  financeService,
  type BudgetInput,
  type FinanceBudget,
  type FinanceSummary,
  type FinanceTransaction,
  type TransactionInput,
} from './financeService';

const dateInput = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
const today = () => dateInput(new Date());
const thisMonthStart = () => `${today().slice(0, 7)}-01`;
const thisMonthEnd = () => {
  const date = new Date();
  return dateInput(new Date(date.getFullYear(), date.getMonth() + 1, 0));
};

const emptyBudget = (): BudgetInput => ({
  name: '',
  category: '',
  amount: '',
  starts_on: thisMonthStart(),
  ends_on: thisMonthEnd(),
  notes: '',
});

const emptyTransaction = (type: TransactionInput['type'] = 'expense'): TransactionInput => ({
  type,
  category: '',
  description: '',
  amount: '',
  occurred_on: today(),
});

const money = (value: string | number, currency: string) =>
  new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(Number(value) || 0);

export const BudgetExpensesPage: React.FC = () => {
  const { currentWorkspace, hasWorkspace, isLoadingWorkspaces } = useWorkspace();
  const workspaceId = currentWorkspace.id;
  const currency = currentWorkspace.currency || 'USD';
  const [budgets, setBudgets] = useState<FinanceBudget[]>([]);
  const [transactions, setTransactions] = useState<FinanceTransaction[]>([]);
  const [summary, setSummary] = useState<FinanceSummary | null>(null);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [budgetForm, setBudgetForm] = useState<BudgetInput | null>(null);
  const [editingBudget, setEditingBudget] = useState<string | null>(null);
  const [transactionForm, setTransactionForm] = useState<TransactionInput | null>(null);
  const [editingTransaction, setEditingTransaction] = useState<string | null>(null);
  const requestId = useRef(0);
  const loadedWorkspaceId = useRef(workspaceId);

  const refresh = useCallback(async () => {
    const currentRequest = ++requestId.current;
    if (loadedWorkspaceId.current !== workspaceId) {
      loadedWorkspaceId.current = workspaceId;
      setBudgets([]);
      setTransactions([]);
      setSummary(null);
      setCategories([]);
    }
    if (!workspaceId) {
      setBudgets([]);
      setTransactions([]);
      setSummary(null);
      setCategories([]);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const [nextBudgets, nextTransactions, nextSummary, nextCategories] = await Promise.all([
        financeService.listBudgets(workspaceId),
        financeService.listTransactions(workspaceId),
        financeService.summary(workspaceId),
        financeService.categories(workspaceId),
      ]);
      if (currentRequest !== requestId.current) return;
      setBudgets(nextBudgets);
      setTransactions(nextTransactions);
      setSummary(nextSummary);
      setCategories(nextCategories);
    } catch (cause) {
      if (currentRequest === requestId.current) {
        setError(cause instanceof Error ? cause.message : 'Unable to load finance data.');
      }
    } finally {
      if (currentRequest === requestId.current) setLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const visibleTransactions = useMemo(() => transactions.filter((transaction) => {
    const needle = search.trim().toLowerCase();
    const matchesSearch = !needle
      || transaction.description?.toLowerCase().includes(needle)
      || transaction.category.toLowerCase().includes(needle)
      || transaction.type.includes(needle);
    return matchesSearch && (!categoryFilter || transaction.category === categoryFilter);
  }), [transactions, search, categoryFilter]);

  const runSave = async (operation: () => Promise<unknown>) => {
    setSaving(true);
    setError('');
    try {
      await operation();
      setBudgetForm(null);
      setTransactionForm(null);
      setEditingBudget(null);
      setEditingTransaction(null);
      await refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'The finance change could not be saved.');
    } finally {
      setSaving(false);
    }
  };

  const saveBudget = (event: React.FormEvent) => {
    event.preventDefault();
    if (!workspaceId || !budgetForm) return;
    const input = { ...budgetForm, amount: String(Number(budgetForm.amount).toFixed(2)) };
    void runSave(() => editingBudget
      ? financeService.updateBudget(workspaceId, editingBudget, input)
      : financeService.createBudget(workspaceId, input));
  };

  const saveTransaction = (event: React.FormEvent) => {
    event.preventDefault();
    if (!workspaceId || !transactionForm) return;
    const input = { ...transactionForm, amount: String(Number(transactionForm.amount).toFixed(2)) };
    void runSave(() => editingTransaction
      ? financeService.updateTransaction(workspaceId, editingTransaction, input)
      : financeService.createTransaction(workspaceId, input));
  };

  const deleteBudget = (budget: FinanceBudget) => {
    if (!workspaceId || !window.confirm(`Delete budget "${budget.name}"?`)) return;
    void runSave(() => financeService.deleteBudget(workspaceId, budget.id));
  };

  const deleteTransaction = (transaction: FinanceTransaction) => {
    if (!workspaceId || !window.confirm('Delete this transaction?')) return;
    void runSave(() => financeService.deleteTransaction(workspaceId, transaction.id));
  };

  const totalBudget = budgets.reduce((total, budget) => total + Number(budget.amount), 0);
  const totalExpenses = Number(summary?.expenses || 0);
  const totalIncome = Number(summary?.income || 0);

  if (isLoadingWorkspaces) return <p className="p-6 text-sm text-slate-500">Loading workspaces…</p>;
  if (!hasWorkspace) return <p className="p-6 text-sm text-slate-600">Select or create a workspace to view its finance records.</p>;

  return (
    <main className="mx-auto max-w-7xl space-y-6 p-4 text-slate-900 sm:p-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-slate-500">Finance / Budget &amp; Expenses</p>
          <h1 className="mt-1 text-2xl font-bold">Budget &amp; Expenses</h1>
          <p className="mt-1 text-sm text-slate-600">{currentWorkspace.name} · live workspace data</p>
        </div>
        <div className="flex gap-2">
          <button className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-slate-50" onClick={() => { setEditingBudget(null); setBudgetForm(emptyBudget()); }}>Create budget</button>
          <button className="rounded-lg bg-violet-700 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-800" onClick={() => { setEditingTransaction(null); setTransactionForm(emptyTransaction()); }}>Add transaction</button>
        </div>
      </header>

      {error && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</div>}

      <section className="grid gap-4 sm:grid-cols-3">
        <SummaryCard label="Planned budgets" value={money(totalBudget, currency)} />
        <SummaryCard label="Actual expenses" value={money(totalExpenses, currency)} />
        <SummaryCard label="Income" value={money(totalIncome, currency)} />
      </section>

      <section className="rounded-xl border bg-white p-4 sm:p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Budgets</h2>
            <p className="text-sm text-slate-500">Actuals are returned by the finance summary for each budget period and category.</p>
          </div>
          <button className="text-sm font-medium text-violet-700 hover:underline" onClick={() => void refresh()} disabled={loading}>Refresh</button>
        </div>
        {loading ? <p className="py-8 text-center text-sm text-slate-500">Loading finance data…</p> : budgets.length === 0 ? (
          <p className="rounded-lg bg-slate-50 p-6 text-center text-sm text-slate-500">No budgets for this workspace yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] text-left text-sm">
              <thead className="border-b text-xs uppercase text-slate-500"><tr><th className="py-3">Budget</th><th>Category</th><th>Period</th><th>Planned</th><th>Actual</th><th>Remaining</th><th /></tr></thead>
              <tbody className="divide-y">
                {budgets.map((budget) => {
                  const actual = Number(summary?.budgets.find((item) => item.budget_id === budget.id)?.actual || 0);
                  const remaining = Number(budget.amount) - actual;
                  return <tr key={budget.id}>
                    <td className="py-3 font-medium">{budget.name}</td>
                    <td>{budget.category}</td>
                    <td>{budget.starts_on} – {budget.ends_on}</td>
                    <td>{money(budget.amount, currency)}</td>
                    <td>{money(actual, currency)}</td>
                    <td className={remaining < 0 ? 'font-semibold text-red-700' : ''}>{money(remaining, currency)}</td>
                    <td className="whitespace-nowrap text-right">
                      <button className="mr-3 text-violet-700 hover:underline" onClick={() => { setEditingBudget(budget.id); setBudgetForm({ name: budget.name, category: budget.category, amount: budget.amount, starts_on: budget.starts_on, ends_on: budget.ends_on, notes: budget.notes || '' }); }}>Edit</button>
                      <button className="text-red-700 hover:underline" onClick={() => deleteBudget(budget)}>Delete</button>
                    </td>
                  </tr>;
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="rounded-xl border bg-white p-4 sm:p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div><h2 className="text-lg font-semibold">Transactions</h2><p className="text-sm text-slate-500">Persisted income and expenses for this workspace.</p></div>
          <div className="flex flex-wrap gap-2">
            <input aria-label="Search transactions" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search transactions" className="rounded-lg border px-3 py-2 text-sm" />
            <select aria-label="Filter by category" value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)} className="rounded-lg border px-3 py-2 text-sm">
              <option value="">All categories</option>
              {categories.map((category) => <option key={category}>{category}</option>)}
            </select>
          </div>
        </div>
        {loading ? <p className="py-8 text-center text-sm text-slate-500">Loading transactions…</p> : visibleTransactions.length === 0 ? (
          <p className="rounded-lg bg-slate-50 p-6 text-center text-sm text-slate-500">{transactions.length ? 'No transactions match your filters.' : 'No transactions recorded yet.'}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[620px] text-left text-sm">
              <thead className="border-b text-xs uppercase text-slate-500"><tr><th className="py-3">Date</th><th>Type</th><th>Category</th><th>Description</th><th>Amount</th><th /></tr></thead>
              <tbody className="divide-y">
                {visibleTransactions.map((transaction) => <tr key={transaction.id}>
                  <td className="py-3">{transaction.occurred_on}</td>
                  <td className="capitalize">{transaction.type}</td>
                  <td>{transaction.category}</td>
                  <td>{transaction.description || '—'}</td>
                  <td className={transaction.type === 'income' ? 'font-medium text-emerald-700' : ''}>{money(transaction.amount, currency)}</td>
                  <td className="whitespace-nowrap text-right">
                    <button className="mr-3 text-violet-700 hover:underline" onClick={() => { setEditingTransaction(transaction.id); setTransactionForm({ type: transaction.type, category: transaction.category, description: transaction.description || '', amount: transaction.amount, occurred_on: transaction.occurred_on }); }}>Edit</button>
                    <button className="text-red-700 hover:underline" onClick={() => deleteTransaction(transaction)}>Delete</button>
                  </td>
                </tr>)}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {budgetForm && <Modal title={editingBudget ? 'Edit budget' : 'Create budget'} onClose={() => setBudgetForm(null)}>
        <form onSubmit={saveBudget} className="space-y-3">
          <Field label="Budget name"><input required maxLength={255} value={budgetForm.name} onChange={(event) => setBudgetForm({ ...budgetForm, name: event.target.value })} className="field" /></Field>
          <Field label="Category"><input required maxLength={100} value={budgetForm.category} onChange={(event) => setBudgetForm({ ...budgetForm, category: event.target.value })} className="field" /></Field>
          <Field label="Amount"><input required type="number" min="0.01" step="0.01" value={budgetForm.amount} onChange={(event) => setBudgetForm({ ...budgetForm, amount: event.target.value })} className="field" /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Starts"><input required type="date" value={budgetForm.starts_on} onChange={(event) => setBudgetForm({ ...budgetForm, starts_on: event.target.value })} className="field" /></Field>
            <Field label="Ends"><input required type="date" min={budgetForm.starts_on} value={budgetForm.ends_on} onChange={(event) => setBudgetForm({ ...budgetForm, ends_on: event.target.value })} className="field" /></Field>
          </div>
          <Field label="Notes"><textarea maxLength={10000} value={budgetForm.notes} onChange={(event) => setBudgetForm({ ...budgetForm, notes: event.target.value })} className="field" /></Field>
          <FormActions saving={saving} onCancel={() => setBudgetForm(null)} />
        </form>
      </Modal>}

      {transactionForm && <Modal title={editingTransaction ? 'Edit transaction' : 'Add transaction'} onClose={() => setTransactionForm(null)}>
        <form onSubmit={saveTransaction} className="space-y-3">
          <Field label="Type"><select value={transactionForm.type} onChange={(event) => setTransactionForm({ ...transactionForm, type: event.target.value as TransactionInput['type'] })} className="field"><option value="expense">Expense</option><option value="income">Income</option></select></Field>
          <Field label="Category"><input required maxLength={100} list="finance-categories" value={transactionForm.category} onChange={(event) => setTransactionForm({ ...transactionForm, category: event.target.value })} className="field" /><datalist id="finance-categories">{categories.map((category) => <option key={category} value={category} />)}</datalist></Field>
          <Field label="Amount"><input required type="number" min="0.01" step="0.01" value={transactionForm.amount} onChange={(event) => setTransactionForm({ ...transactionForm, amount: event.target.value })} className="field" /></Field>
          <Field label="Date"><input required type="date" value={transactionForm.occurred_on} onChange={(event) => setTransactionForm({ ...transactionForm, occurred_on: event.target.value })} className="field" /></Field>
          <Field label="Description"><input maxLength={255} value={transactionForm.description} onChange={(event) => setTransactionForm({ ...transactionForm, description: event.target.value })} className="field" /></Field>
          <FormActions saving={saving} onCancel={() => setTransactionForm(null)} />
        </form>
      </Modal>}
    </main>
  );
};

function SummaryCard({ label, value }: { label: string; value: string }) {
  return <article className="rounded-xl border bg-white p-5"><p className="text-sm text-slate-500">{label}</p><p className="mt-2 text-2xl font-bold">{value}</p></article>;
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/40 p-4" role="presentation">
    <section role="dialog" aria-modal="true" aria-label={title} className="max-h-[90vh] w-full max-w-lg overflow-auto rounded-xl bg-white p-5 shadow-xl">
      <div className="mb-4 flex items-center justify-between"><h2 className="text-lg font-semibold">{title}</h2><button aria-label="Close" onClick={onClose} className="rounded px-2 py-1 hover:bg-slate-100">×</button></div>
      {children}
    </section>
  </div>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block space-y-1 text-sm font-medium text-slate-700">{label}{children}</label>;
}

function FormActions({ saving, onCancel }: { saving: boolean; onCancel: () => void }) {
  return <div className="flex justify-end gap-2 pt-2"><button type="button" onClick={onCancel} className="rounded-lg border px-4 py-2 text-sm">Cancel</button><button disabled={saving} className="rounded-lg bg-violet-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{saving ? 'Saving…' : 'Save'}</button></div>;
}
