import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  BarChart3,
  BriefcaseBusiness,
  CalendarDays,
  ChartNoAxesCombined,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  Download,
  Ellipsis,
  Folder,
  HandCoins,
  Megaphone,
  Percent,
  Plus,
  Receipt,
  RefreshCw,
  Search,
  Wallet,
  X,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useWorkspace } from '../../context/WorkspaceContext';
import { ActionDropdown } from '../../components/ui/ActionDropdown';
import { campaignService, type CampaignRecord } from '../campaigns/campaignService';
import { projectService, type ProjectRecord } from '../projects/projectService';
import {
  financeService,
  type BudgetInput,
  type FinanceBudget,
  type FinanceFilter,
  type FinanceTransaction,
  type TransactionInput,
} from './financeService';

const dateInput = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
const monthInput = () => dateInput(new Date()).slice(0, 7);
const monthRange = (month: string) => {
  const [year, monthNumber] = month.split('-').map(Number);
  const lastDay = new Date(year, monthNumber, 0).getDate();
  return { from: `${month}-01`, to: `${month}-${String(lastDay).padStart(2, '0')}` };
};
const emptyBudget = (): BudgetInput => {
  const range = monthRange(monthInput());
  return { name: '', category: '', amount: '', starts_on: range.from, ends_on: range.to, notes: '' };
};
const emptyTransaction = (type: TransactionInput['type'] = 'expense', occurredOn = dateInput(new Date())): TransactionInput => ({
  type,
  category: '',
  description: '',
  amount: '',
  occurred_on: occurredOn,
  campaign_id: null,
  order_id: null,
});
const inputClass = 'w-full rounded-lg border border-[#DCE3F0] bg-white px-3 py-2 text-xs text-[#1E1B4B] outline-none placeholder:text-[#96A1B5] focus:border-violet-500 focus:ring-2 focus:ring-violet-100';
const buttonClass = 'inline-flex items-center justify-center gap-1.5 rounded-lg border border-[#DCE3F0] bg-white px-3 py-2 text-xs font-semibold text-[#33415C] hover:bg-[#F8F7FC] disabled:cursor-not-allowed disabled:opacity-50';
const primaryClass = 'inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#5B19F5] px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-[#4D12D6] disabled:cursor-not-allowed disabled:opacity-50';
const isAdvertisingCategory = (category: string) => /advertis|paid media|^ads?$/i.test(category.trim());
const escapeCsv = (value: string | number | null | undefined) => `"${String(value ?? '').replace(/"/g, '""')}"`;
const money = (value: string | number, currency: string) => new Intl.NumberFormat(undefined, {
  style: 'currency',
  currency,
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
}).format(Number(value) || 0);

export const BudgetExpensesPage: React.FC = () => {
  const { currentWorkspace, hasWorkspace, isLoadingWorkspaces } = useWorkspace();
  const workspaceId = currentWorkspace.id;
  const currency = currentWorkspace.currency || 'USD';
  const [budgets, setBudgets] = useState<FinanceBudget[]>([]);
  const [transactions, setTransactions] = useState<FinanceTransaction[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [campaigns, setCampaigns] = useState<CampaignRecord[]>([]);
  const [projects, setProjects] = useState<ProjectRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [referenceError, setReferenceError] = useState('');
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [teamFilter, setTeamFilter] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [campaignFilter, setCampaignFilter] = useState('');
  const [projectFilter, setProjectFilter] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(monthInput);
  const [page, setPage] = useState(1);
  const [budgetForm, setBudgetForm] = useState<BudgetInput | null>(null);
  const [editingBudget, setEditingBudget] = useState<string | null>(null);
  const [transactionForm, setTransactionForm] = useState<TransactionInput | null>(null);
  const [editingTransaction, setEditingTransaction] = useState<string | null>(null);
  const [budgetsOpen, setBudgetsOpen] = useState(false);
  const [actionsOpen, setActionsOpen] = useState(false);
  const requestId = useRef(0);
  const loadedWorkspaceId = useRef(workspaceId);

  const range = useMemo(() => monthRange(selectedMonth), [selectedMonth]);

  const refresh = useCallback(async () => {
    const currentRequest = ++requestId.current;
    if (loadedWorkspaceId.current !== workspaceId) {
      loadedWorkspaceId.current = workspaceId;
      setBudgets([]);
      setTransactions([]);
      setCategories([]);
      setCampaigns([]);
      setProjects([]);
      setCampaignFilter('');
      setProjectFilter('');
    }
    if (!workspaceId) return;

    setLoading(true);
    setError('');
    setReferenceError('');
    const filters: FinanceFilter = {
      from: range.from,
      to: range.to,
      campaign_id: campaignFilter || undefined,
    };
    try {
      const [nextBudgets, nextTransactions, nextCategories, nextCampaigns, nextProjects] = await Promise.all([
        financeService.listBudgets(workspaceId, { starts_on: range.from, ends_on: range.to }),
        financeService.listTransactions(workspaceId, filters),
        financeService.categories(workspaceId),
        campaignService.list(workspaceId).catch((cause) => {
          setReferenceError(cause instanceof Error ? `Campaigns failed to load: ${cause.message}` : 'Campaigns failed to load.');
          return [] as CampaignRecord[];
        }),
        projectService.list(workspaceId).catch((cause) => {
          setReferenceError(cause instanceof Error ? `Projects failed to load: ${cause.message}` : 'Projects failed to load.');
          return [] as ProjectRecord[];
        }),
      ]);
      if (currentRequest !== requestId.current) return;
      setBudgets(nextBudgets);
      setTransactions(nextTransactions);
      setCategories(nextCategories);
      setCampaigns(nextCampaigns);
      setProjects(nextProjects);
    } catch (cause) {
      if (currentRequest === requestId.current) {
        setError(cause instanceof Error ? cause.message : 'Unable to load finance data.');
      }
    } finally {
      if (currentRequest === requestId.current) setLoading(false);
    }
  }, [workspaceId, range.from, range.to, campaignFilter]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const campaignsById = useMemo(() => new Map(campaigns.map((campaign) => [campaign.id, campaign])), [campaigns]);
  const projectsById = useMemo(() => new Map(projects.map((project) => [project.id, project])), [projects]);
  const projectOptions = useMemo(() => {
    const projectIds = new Set(campaigns.map((campaign) => campaign.project_id).filter(Boolean));
    return projects.filter((project) => projectIds.has(project.id));
  }, [campaigns, projects]);

  const filteredTransactions = useMemo(() => {
    const needle = search.trim().toLowerCase();
    const filtered = transactions.filter((transaction) => {
      const campaign = transaction.campaign_id ? campaignsById.get(transaction.campaign_id) : undefined;
      const matchesProject = !projectFilter || campaign?.project_id === projectFilter;
      const matchesCategory = !categoryFilter || transaction.category === categoryFilter;
      const matchesTeam = !teamFilter || String(transaction.created_by) === teamFilter;
      const matchesSearch = !needle
        || transaction.description?.toLowerCase().includes(needle)
        || transaction.category.toLowerCase().includes(needle)
        || transaction.type.includes(needle)
        || campaign?.name.toLowerCase().includes(needle)
        || transaction.order_id?.toLowerCase().includes(needle);
      return matchesProject && matchesCategory && matchesTeam && matchesSearch;
    });
    return filtered.sort((a, b) => {
      if (sortBy === 'oldest') return a.occurred_on.localeCompare(b.occurred_on);
      if (sortBy === 'largest') return Number(b.amount) - Number(a.amount);
      if (sortBy === 'smallest') return Number(a.amount) - Number(b.amount);
      if (sortBy === 'category') return a.category.localeCompare(b.category) || b.occurred_on.localeCompare(a.occurred_on);
      return b.occurred_on.localeCompare(a.occurred_on);
    });
  }, [transactions, campaignsById, search, categoryFilter, teamFilter, projectFilter, sortBy]);

  const expenses = useMemo(
    () => filteredTransactions.filter((transaction) => transaction.type === 'expense'),
    [filteredTransactions],
  );
  const advertisingBudgets = useMemo(
    () => budgets.filter((budget) => isAdvertisingCategory(budget.category)),
    [budgets],
  );
  const advertisingExpenses = useMemo(
    () => expenses.filter((transaction) => isAdvertisingCategory(transaction.category)),
    [expenses],
  );
  const plannedAdvertisingBudget = advertisingBudgets.reduce((sum, budget) => sum + Number(budget.amount), 0);
  const actualAdvertisingSpend = advertisingExpenses.reduce((sum, transaction) => sum + Number(transaction.amount), 0);
  const remainingAdvertisingBudget = plannedAdvertisingBudget - actualAdvertisingSpend;
  const utilization = plannedAdvertisingBudget > 0
    ? `${((actualAdvertisingSpend / plannedAdvertisingBudget) * 100).toFixed(1)}%`
    : '—';
  const totalExpenses = expenses.reduce((sum, transaction) => sum + Number(transaction.amount), 0);
  const categoryTotals = useMemo(() => {
    const totals = new Map<string, number>();
    expenses.forEach((transaction) => totals.set(
      transaction.category,
      (totals.get(transaction.category) || 0) + Number(transaction.amount),
    ));
    return [...totals.entries()].sort((a, b) => b[1] - a[1]);
  }, [expenses]);
  const teamOptions = useMemo(() => {
    const names = new Map<string, string>();
    transactions.forEach((transaction) => {
      names.set(String(transaction.created_by), transaction.creator_name || `User ${transaction.created_by}`);
    });
    return [...names.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  }, [transactions]);

  const pageSize = 7;
  const totalPages = Math.max(1, Math.ceil(filteredTransactions.length / pageSize));
  const visibleTransactions = filteredTransactions.slice((page - 1) * pageSize, page * pageSize);

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
    const input = {
      ...transactionForm,
      amount: String(Number(transactionForm.amount).toFixed(2)),
      campaign_id: transactionForm.campaign_id || null,
      order_id: transactionForm.order_id || null,
    };
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

  const exportCsv = () => {
    const rows = [
      ['Date', 'Type', 'Category', 'Description', 'Campaign', 'Order ID', 'Amount', 'Currency', 'Recorded By'],
      ...filteredTransactions.map((transaction) => [
        transaction.occurred_on,
        transaction.type,
        transaction.category,
        transaction.description || '',
        transaction.campaign_id ? campaignsById.get(transaction.campaign_id)?.name || transaction.campaign_id : '',
        transaction.order_id || '',
        transaction.amount,
        currency,
        transaction.creator_name || `User ${transaction.created_by}`,
      ]),
    ];
    const csv = rows.map((row) => row.map(escapeCsv).join(',')).join('\r\n');
    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `marketflow-expenses-${selectedMonth}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const beginTransaction = (type: TransactionInput['type']) => {
    setEditingTransaction(null);
    const defaultDate = selectedMonth === monthInput() ? dateInput(new Date()) : range.from;
    setTransactionForm(emptyTransaction(type, defaultDate));
    setActionsOpen(false);
  };

  if (isLoadingWorkspaces) return <p className="p-6 text-sm text-slate-500">Loading workspaces…</p>;
  if (!hasWorkspace) return <p className="p-6 text-sm text-slate-600">Select or create a workspace to view its finance records.</p>;

  return (
    <main className="mx-auto min-h-full max-w-[1500px] space-y-3 bg-[#F7F8FC] p-4 text-[#172554] sm:p-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[10px] font-medium text-[#64748B]">Finance <span className="px-1 text-[#C7D0E0]">/</span> Budget &amp; Expenses</p>
          <h1 className="mt-1 text-[26px] font-extrabold leading-tight tracking-tight text-[#111B44]">Budget &amp; Expenses</h1>
          <p className="text-xs text-[#77839A]">Track finance budget allocations and recorded operating expenses. · {currentWorkspace.name}</p>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" className={buttonClass} onClick={exportCsv}><Download className="h-3.5 w-3.5" />Export CSV</button>
          <button type="button" className={primaryClass} onClick={() => beginTransaction('expense')}><Plus className="h-3.5 w-3.5" />Add Expense</button>
          <ActionDropdown
            isOpen={actionsOpen}
            onClose={() => setActionsOpen(false)}
            ariaLabel="More finance actions"
            menuWidth={176}
            className="min-w-44 p-1 text-xs"
            trigger={
              <button
                type="button"
                aria-label="More finance actions"
                aria-expanded={actionsOpen}
                className={`${buttonClass} px-2 cursor-pointer`}
                onClick={() => setActionsOpen((open) => !open)}
              >
                <Ellipsis className="h-4 w-4" />
              </button>
            }
          >
            <button
              type="button"
              className="block w-full rounded px-3 py-2 text-left text-xs text-[#1E1B4B] hover:bg-[#F5F3FF] cursor-pointer"
              onClick={() => {
                setEditingBudget(null);
                setBudgetForm(emptyBudget());
                setActionsOpen(false);
              }}
            >
              Create budget
            </button>
            <button
              type="button"
              className="block w-full rounded px-3 py-2 text-left text-xs text-[#1E1B4B] hover:bg-[#F5F3FF] cursor-pointer"
              onClick={() => {
                setBudgetsOpen(true);
                setActionsOpen(false);
              }}
            >
              Manage budgets
            </button>
            <button
              type="button"
              className="block w-full rounded px-3 py-2 text-left text-xs text-[#1E1B4B] hover:bg-[#F5F3FF] cursor-pointer"
              onClick={() => {
                setActionsOpen(false);
                beginTransaction('income');
              }}
            >
              Record income
            </button>
            <button
              type="button"
              className="flex w-full items-center gap-2 rounded px-3 py-2 text-left text-xs text-[#1E1B4B] hover:bg-[#F5F3FF] cursor-pointer"
              onClick={() => {
                setActionsOpen(false);
                void refresh();
              }}
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Refresh finance data
            </button>
          </ActionDropdown>
        </div>
      </header>

      {(error || referenceError) && <div role="alert" className="space-y-1 rounded-lg border border-red-200 bg-red-50 p-2.5 text-xs text-red-800">
        {error && <p>{error}</p>}{referenceError && <p>{referenceError}</p>}
      </div>}

      <section aria-label="Finance filters" className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        <label className="flex h-9 items-center gap-2 rounded-lg border border-[#DCE3F0] bg-white px-2.5 text-[10px] text-[#53617C]">
          <BriefcaseBusiness className="h-3.5 w-3.5 shrink-0 text-[#6D28D9]" /><span className="sr-only">Workspace</span>
          <span className="truncate font-medium">{currentWorkspace.name}</span>
        </label>
        <FilterSelect label="Project (campaign-linked)" icon={<Folder className="h-3.5 w-3.5" />} value={projectFilter} onChange={(value) => { setProjectFilter(value); setPage(1); }}>
          <option value="">All projects</option>
          {projectOptions.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
        </FilterSelect>
        <FilterSelect label="Campaign" icon={<Megaphone className="h-3.5 w-3.5" />} value={campaignFilter} onChange={(value) => { setCampaignFilter(value); setPage(1); }}>
          <option value="">All campaigns</option>
          {campaigns.map((campaign) => <option key={campaign.id} value={campaign.id}>{campaign.name}</option>)}
        </FilterSelect>
        <label className="flex h-9 items-center gap-2 rounded-lg border border-[#DCE3F0] bg-white px-2.5 text-[10px] text-[#53617C]">
          <CalendarDays className="h-3.5 w-3.5 shrink-0 text-[#6D28D9]" /><span className="sr-only">Month</span>
          <input aria-label="Filter by month" type="month" value={selectedMonth} onChange={(event) => { setSelectedMonth(event.target.value || monthInput()); setPage(1); }} className="min-w-0 flex-1 bg-transparent text-[10px] outline-none" />
        </label>
      </section>

      {projectFilter && <p className="text-[9px] text-[#7A86A0]">The project filter applies to transactions linked through their campaign. Budget allocations have no project association and remain workspace-scoped.</p>}
      {campaignFilter && <p className="text-[9px] text-[#7A86A0]">Campaign filtering applies to linked transactions. Planned finance budget allocations are workspace-level because budgets have no campaign link.</p>}
      <p className="text-[9px] text-[#7A86A0]">Advertising KPIs use finance budget allocations and recorded finance expenses in {currency}. Campaign budget fields and Meta Ads spend are separate and excluded; no currency conversion is applied.</p>

      <section className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard label="Planned Advertising Budget" value={money(plannedAdvertisingBudget, currency)} detail="Finance allocations overlapping month · not prorated" icon={<Wallet className="h-5 w-5" />} tone="violet" />
        <SummaryCard label="Actual Advertising Spend" value={money(actualAdvertisingSpend, currency)} detail="Recorded finance expenses in advertising categories" icon={<ChartNoAxesCombined className="h-5 w-5" />} tone="teal" />
        <SummaryCard label="Remaining Advertising Budget" value={money(remainingAdvertisingBudget, currency)} detail="Planned allocation minus recorded actual expenses" icon={<CircleDollarSign className="h-5 w-5" />} tone={remainingAdvertisingBudget < 0 ? 'rose' : 'blue'} />
        <SummaryCard label="Budget Utilization" value={utilization} detail="Actual advertising expense ÷ planned allocation" icon={<Percent className="h-5 w-5" />} tone="amber" />
      </section>

      <section className="grid gap-2 lg:grid-cols-[minmax(0,1.55fr)_minmax(290px,1fr)]">
        <SpendChart
          month={selectedMonth}
          currency={currency}
          planned={plannedAdvertisingBudget}
          expenses={advertisingExpenses}
        />
        <div className="space-y-2">
          <CategoryBreakdown
            categories={categoryTotals}
            total={totalExpenses}
            currency={currency}
            month={selectedMonth}
            loading={loading}
          />
          <section className="flex items-center justify-between gap-2 rounded-xl border border-[#E1E6F0] bg-white px-3 py-2 shadow-[0_2px_8px_rgba(35,52,95,0.03)]">
            <div className="flex items-center gap-2">
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-[#F0EAFE] text-[#7C3AED]"><HandCoins className="h-4 w-4" /></span>
              <div><h2 className="text-[11px] font-bold text-[#172554]">Profitability</h2><p className="text-[9px] text-[#8792A8]">View order and campaign profitability</p></div>
            </div>
            <Link to="/profitability" className="inline-flex items-center gap-1 rounded-md border border-[#CDBBFF] px-2.5 py-1.5 text-[9px] font-semibold text-[#6D28D9] hover:bg-[#F5F2FF]">Go to Profitability <ChevronRight className="h-3 w-3" /></Link>
          </section>
        </div>
      </section>

      <section className="rounded-xl border border-[#E1E6F0] bg-white p-3 shadow-[0_2px_8px_rgba(35,52,95,0.03)]">
        <header className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <div><h2 className="text-sm font-bold text-[#172554]">Expense Ledger</h2><p className="text-[9px] text-[#8792A8]">Recorded finance transactions for the selected workspace and period.</p></div>
          <div className="grid w-full gap-1.5 sm:w-auto sm:grid-cols-2 xl:grid-cols-4">
            <label className="relative">
              <Search className="absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-[#74819C]" />
              <input aria-label="Search expenses" value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Search expenses…" className={`${inputClass} h-8 py-1 pl-7`} />
            </label>
            <select aria-label="Filter by category" value={categoryFilter} onChange={(event) => { setCategoryFilter(event.target.value); setPage(1); }} className={`${inputClass} h-8 px-2 py-1`}>
              <option value="">All categories</option>{categories.map((category) => <option key={category}>{category}</option>)}
            </select>
            <select aria-label="Filter by team member" value={teamFilter} onChange={(event) => { setTeamFilter(event.target.value); setPage(1); }} className={`${inputClass} h-8 px-2 py-1`}>
              <option value="">All team members</option>{teamOptions.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
            </select>
            <select aria-label="Sort transactions" value={sortBy} onChange={(event) => { setSortBy(event.target.value); setPage(1); }} className={`${inputClass} h-8 px-2 py-1`}>
              <option value="newest">Date (newest)</option><option value="oldest">Date (oldest)</option><option value="largest">Amount (high-low)</option><option value="smallest">Amount (low-high)</option><option value="category">Category</option>
            </select>
          </div>
        </header>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[850px] table-fixed text-left text-[10px] text-[#293653]">
            <thead className="border-y border-[#E9EDF4] bg-[#F9FAFD] text-[9px] font-semibold text-[#707C96]">
              <tr><th className="w-[11%] px-1.5 py-2">Date</th><th className="w-[14%] px-1.5 py-2">Expense Type</th><th className="w-[19%] px-1.5 py-2">Description</th><th className="w-[19%] px-1.5 py-2">Linked Campaign</th><th className="w-[12%] px-1.5 py-2">Amount</th><th className="w-[14%] px-1.5 py-2">Recorded By</th><th className="w-[11%] px-1.5 py-2 text-right">Actions</th></tr>
            </thead>
            <tbody className="divide-y divide-[#EEF1F6]">
              {loading && transactions.length === 0 && Array.from({ length: 4 }, (_, index) => <tr key={`loading-${index}`} aria-hidden="true">{Array.from({ length: 7 }, (_, column) => <td key={column} className="px-1.5 py-3"><div className="h-3 animate-pulse rounded bg-slate-100" /></td>)}</tr>)}
              {!loading && visibleTransactions.map((transaction) => {
                const campaign = transaction.campaign_id ? campaignsById.get(transaction.campaign_id) : undefined;
                const project = campaign ? projectsById.get(campaign.project_id) : undefined;
                return <tr key={transaction.id} className="hover:bg-[#F7F5FF]">
                  <td className="whitespace-nowrap px-1.5 py-2">{new Date(`${transaction.occurred_on}T00:00:00`).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                  <td className="px-1.5 py-2"><span className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[9px] font-semibold ${transaction.type === 'expense' ? 'bg-[#F0EAFE] text-[#7041C8]' : 'bg-[#E5F8F3] text-[#07866F]'}`}>
                    {transaction.type === 'expense' ? <Receipt className="h-3 w-3" /> : <CircleDollarSign className="h-3 w-3" />}{transaction.category}
                  </span></td>
                  <td className="truncate px-1.5 py-2" title={transaction.description || ''}>{transaction.description || '—'}</td>
                  <td className="truncate px-1.5 py-2 text-[#6D28D9]" title={campaign?.name || (transaction.campaign_id ? 'Campaign record unavailable' : '')}>
                    {campaign ? <><span>{campaign.name}</span>{project && <span className="block text-[8px] text-[#8792A8]">{project.name}</span>}</> : transaction.campaign_id ? 'Campaign unavailable' : transaction.order_id ? `Order ${transaction.order_id.slice(0, 8)}` : '—'}
                  </td>
                  <td className={`whitespace-nowrap px-1.5 py-2 font-semibold ${transaction.type === 'income' ? 'text-[#07866F]' : 'text-[#263553]'}`}>{money(transaction.amount, currency)}</td>
                  <td className="truncate px-1.5 py-2" title={transaction.creator_name || ''}>{transaction.creator_name || `User ${transaction.created_by}`}</td>
                  <td className="whitespace-nowrap px-1.5 py-2 text-right">
                    <button type="button" className="mr-2 text-[#6D28D9] hover:underline" onClick={() => { setEditingTransaction(transaction.id); setTransactionForm({
                      type: transaction.type,
                      category: transaction.category,
                      description: transaction.description || '',
                      amount: transaction.amount,
                      occurred_on: transaction.occurred_on,
                      campaign_id: transaction.campaign_id,
                      order_id: transaction.order_id,
                    }); }}>Edit</button>
                    <button type="button" className="text-red-700 hover:underline" onClick={() => deleteTransaction(transaction)}>Delete</button>
                  </td>
                </tr>;
              })}
              {!loading && visibleTransactions.length === 0 && <tr><td colSpan={7} className="p-1.5"><div className="rounded-lg border border-dashed border-[#CCD6E5] bg-[#FBFCFE] px-3 py-6 text-center">
                <Receipt className="mx-auto mb-1 h-5 w-5 text-[#A6B2C7]" />
                <p className="text-xs font-semibold text-[#42516E]">{transactions.length ? 'No transactions match these filters.' : 'No transactions recorded for this period.'}</p>
                <p className="mt-0.5 text-[10px] text-[#8994A9]">This ledger shows saved finance records only. No sample transactions are added.</p>
              </div></td></tr>}
            </tbody>
          </table>
        </div>
        <footer className="mt-2 flex items-center justify-between border-t border-[#EDF0F5] pt-2 text-[9px] text-[#74819C]">
          <span>{filteredTransactions.length ? `Showing ${(page - 1) * pageSize + 1}-${Math.min(page * pageSize, filteredTransactions.length)} of ${filteredTransactions.length} transactions` : 'Showing 0 transactions'}</span>
          <div className="flex items-center gap-1">
            <button type="button" aria-label="Previous ledger page" className="rounded border border-[#DCE3F0] p-1 disabled:opacity-40" onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={page <= 1}><ChevronLeft className="h-3 w-3" /></button>
            <span className="min-w-5 rounded border border-[#7C3AED] px-1.5 py-1 text-center font-semibold text-[#6D28D9]">{page}</span>
            <button type="button" aria-label="Next ledger page" className="rounded border border-[#DCE3F0] p-1 disabled:opacity-40" onClick={() => setPage((current) => Math.min(totalPages, current + 1))} disabled={page >= totalPages}><ChevronRight className="h-3 w-3" /></button>
          </div>
        </footer>
      </section>

      {budgetsOpen && <Modal title="Finance budgets" onClose={() => setBudgetsOpen(false)} wide>
        <div className="mb-3 flex items-center justify-between gap-3">
          <p className="text-[10px] text-[#74819C]">Workspace-level finance allocations overlapping {selectedMonth}. Campaign budgets are not included.</p>
          <button type="button" className={primaryClass} onClick={() => { setEditingBudget(null); setBudgetForm(emptyBudget()); setBudgetsOpen(false); }}><Plus className="h-3.5 w-3.5" />Create budget</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-xs">
            <thead className="border-y border-[#E9EDF4] bg-[#F9FAFD] text-[10px] text-[#707C96]"><tr><th className="py-2">Budget</th><th>Category</th><th>Period</th><th>Planned</th><th>Actual</th><th>Remaining</th><th /></tr></thead>
            <tbody className="divide-y divide-[#EEF1F6]">
              {budgets.map((budget) => {
                const actual = transactions.filter((transaction) => transaction.type === 'expense' && transaction.category === budget.category)
                  .reduce((sum, transaction) => sum + Number(transaction.amount), 0);
                const remaining = Number(budget.amount) - actual;
                return <tr key={budget.id}>
                  <td className="py-2 font-medium">{budget.name}</td><td>{budget.category}</td><td>{budget.starts_on} – {budget.ends_on}</td>
                  <td>{money(budget.amount, currency)}</td><td>{money(actual, currency)}</td><td className={remaining < 0 ? 'font-semibold text-red-700' : ''}>{money(remaining, currency)}</td>
                  <td className="whitespace-nowrap text-right">
                    <button type="button" className="mr-2 text-[#6D28D9] hover:underline" onClick={() => { setEditingBudget(budget.id); setBudgetForm({ name: budget.name, category: budget.category, amount: budget.amount, starts_on: budget.starts_on, ends_on: budget.ends_on, notes: budget.notes || '' }); setBudgetsOpen(false); }}>Edit</button>
                    <button type="button" className="text-red-700 hover:underline" onClick={() => deleteBudget(budget)}>Delete</button>
                  </td>
                </tr>;
              })}
              {!budgets.length && <tr><td colSpan={7} className="py-6 text-center text-xs text-[#8994A9]">{loading ? 'Loading finance budgets…' : 'No finance budget allocations overlap this month.'}</td></tr>}
            </tbody>
          </table>
        </div>
      </Modal>}

      {budgetForm && <Modal title={editingBudget ? 'Edit budget' : 'Create budget'} onClose={() => setBudgetForm(null)}>
        <form onSubmit={saveBudget} className="space-y-3">
          <Field label="Budget name"><input required maxLength={255} value={budgetForm.name} onChange={(event) => setBudgetForm({ ...budgetForm, name: event.target.value })} className={inputClass} /></Field>
          <Field label="Category"><input required maxLength={100} value={budgetForm.category} onChange={(event) => setBudgetForm({ ...budgetForm, category: event.target.value })} className={inputClass} /></Field>
          <Field label="Amount"><input required type="number" min="0.01" step="0.01" value={budgetForm.amount} onChange={(event) => setBudgetForm({ ...budgetForm, amount: event.target.value })} className={inputClass} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Starts"><input required type="date" value={budgetForm.starts_on} onChange={(event) => setBudgetForm({ ...budgetForm, starts_on: event.target.value })} className={inputClass} /></Field>
            <Field label="Ends"><input required type="date" min={budgetForm.starts_on} value={budgetForm.ends_on} onChange={(event) => setBudgetForm({ ...budgetForm, ends_on: event.target.value })} className={inputClass} /></Field>
          </div>
          <Field label="Notes"><textarea maxLength={10000} value={budgetForm.notes} onChange={(event) => setBudgetForm({ ...budgetForm, notes: event.target.value })} className={inputClass} /></Field>
          <FormActions saving={saving} onCancel={() => setBudgetForm(null)} />
        </form>
      </Modal>}

      {transactionForm && <Modal title={editingTransaction ? 'Edit transaction' : transactionForm.type === 'income' ? 'Record income' : 'Add expense'} onClose={() => setTransactionForm(null)}>
        <form onSubmit={saveTransaction} className="space-y-3">
          <Field label="Type"><select value={transactionForm.type} onChange={(event) => setTransactionForm({ ...transactionForm, type: event.target.value as TransactionInput['type'] })} className={inputClass}><option value="expense">Expense</option><option value="income">Income</option></select></Field>
          <Field label="Category"><input required maxLength={100} list="finance-categories" value={transactionForm.category} onChange={(event) => setTransactionForm({ ...transactionForm, category: event.target.value })} className={inputClass} /><datalist id="finance-categories">{categories.map((category) => <option key={category} value={category} />)}</datalist></Field>
          <Field label={`Amount (${currency})`}><input required type="number" min="0.01" step="0.01" value={transactionForm.amount} onChange={(event) => setTransactionForm({ ...transactionForm, amount: event.target.value })} className={inputClass} /></Field>
          <Field label="Date"><input required type="date" value={transactionForm.occurred_on} onChange={(event) => setTransactionForm({ ...transactionForm, occurred_on: event.target.value })} className={inputClass} /></Field>
          <Field label="Linked campaign"><select value={transactionForm.campaign_id || ''} onChange={(event) => setTransactionForm({ ...transactionForm, campaign_id: event.target.value || null })} className={inputClass}><option value="">No campaign</option>{campaigns.map((campaign) => <option key={campaign.id} value={campaign.id}>{campaign.name}</option>)}</select></Field>
          <Field label="Linked sales order ID (optional)"><input type="text" inputMode="text" pattern="[0-9a-fA-F-]{36}" title="Enter the sales order UUID." value={transactionForm.order_id || ''} onChange={(event) => setTransactionForm({ ...transactionForm, order_id: event.target.value || null })} className={inputClass} placeholder="Sales order UUID" /></Field>
          <Field label="Description"><input maxLength={255} value={transactionForm.description} onChange={(event) => setTransactionForm({ ...transactionForm, description: event.target.value })} className={inputClass} /></Field>
          <p className="text-[10px] text-[#74819C]">Transactions use the workspace currency. Campaign linkage is stored directly; order linkage is validated by the API. Projects are linked through a selected campaign when available.</p>
          <FormActions saving={saving} onCancel={() => setTransactionForm(null)} />
        </form>
      </Modal>}
    </main>
  );
};

function FilterSelect({ label, icon, value, onChange, children }: {
  label: string;
  icon: React.ReactNode;
  value: string;
  onChange: (value: string) => void;
  children: React.ReactNode;
}) {
  return <label className="relative flex h-9 items-center gap-2 rounded-lg border border-[#DCE3F0] bg-white px-2.5 text-[10px] text-[#53617C]">
    <span className="shrink-0 text-[#6D28D9]">{icon}</span><span className="sr-only">{label}</span>
    <select value={value} onChange={(event) => onChange(event.target.value)} className="min-w-0 flex-1 appearance-none bg-transparent pr-4 text-[10px] outline-none">
      {children}
    </select>
    <ChevronRight className="absolute right-2 h-3 w-3 rotate-90 text-[#8792A8]" />
  </label>;
}

function SummaryCard({ label, value, detail, icon, tone }: {
  label: string;
  value: string;
  detail: string;
  icon: React.ReactNode;
  tone: 'violet' | 'teal' | 'blue' | 'amber' | 'rose';
}) {
  const tones = {
    violet: 'bg-[#F0EAFE] text-[#7C3AED]',
    teal: 'bg-[#E5F8F3] text-[#0F9A82]',
    blue: 'bg-[#E9F1FF] text-[#3278D8]',
    amber: 'bg-[#FFF4D9] text-[#D99A00]',
    rose: 'bg-[#FDECEC] text-[#C64A5A]',
  };
  return <article className="flex min-h-[76px] items-center justify-between gap-2 rounded-xl border border-[#E1E6F0] bg-white px-3 py-2.5 shadow-[0_2px_8px_rgba(35,52,95,0.03)]">
    <div className="min-w-0"><p className="text-[9px] font-medium text-[#77839A]">{label}</p><p className="mt-1 truncate text-[19px] font-extrabold leading-none tracking-tight text-[#172554]">{value}</p><p className="mt-1.5 truncate text-[8px] text-[#909BB0]" title={detail}>{detail}</p></div>
    <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${tones[tone]}`}>{icon}</span>
  </article>;
}

function SpendChart({ month, currency, planned, expenses }: {
  month: string;
  currency: string;
  planned: number;
  expenses: FinanceTransaction[];
}) {
  const daysInMonth = new Date(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0).getDate();
  const daily = new Map<string, number>();
  expenses.forEach((expense) => daily.set(expense.occurred_on, (daily.get(expense.occurred_on) || 0) + Number(expense.amount)));
  const dailyValues = Array.from({ length: daysInMonth }, (_, index) => {
    const day = String(index + 1).padStart(2, '0');
    return daily.get(`${month}-${day}`) || 0;
  });
  const values = dailyValues.map((_, index) => dailyValues.slice(0, index + 1).reduce((sum, value) => sum + value, 0));
  const actual = values[values.length - 1] || 0;
  const maxValue = Math.max(planned, actual, 1) * 1.15;
  const xFor = (index: number) => 42 + (index / Math.max(daysInMonth - 1, 1)) * 560;
  const yFor = (value: number) => 122 - (value / maxValue) * 100;
  const actualPath = values.map((value, index) => `${index ? 'L' : 'M'} ${xFor(index).toFixed(1)} ${yFor(value).toFixed(1)}`).join(' ');
  const areaPath = `${actualPath} L ${xFor(daysInMonth - 1)} 122 L ${xFor(0)} 122 Z`;

  return <section className="rounded-xl border border-[#E1E6F0] bg-white p-3 shadow-[0_2px_8px_rgba(35,52,95,0.03)]">
    <header className="mb-1 flex flex-wrap items-center justify-between gap-2">
      <div><h2 className="text-xs font-bold text-[#172554]">Planned vs Actual Spend</h2><p className="text-[9px] text-[#8792A8]">Cumulative finance expenses · {month}</p></div>
      <div className="flex items-center gap-2 text-[8px] text-[#74819C]"><span className="inline-flex items-center gap-1"><i className="h-0.5 w-4 border-t border-dashed border-[#8B5CF6]" />Budget ceiling</span><span className="inline-flex items-center gap-1"><i className="h-1.5 w-1.5 rounded-full bg-[#6D28D9]" />Recorded spend</span></div>
    </header>
    {expenses.length === 0
      ? <div className="grid h-[142px] place-items-center rounded-lg bg-[#FBFCFE] text-center">
        <div><BarChart3 className="mx-auto mb-1 h-5 w-5 text-[#B1BCD0]" /><p className="text-[10px] font-semibold text-[#53617C]">No recorded advertising expenses for this month.</p><p className="mt-0.5 text-[9px] text-[#8A96AA]">The chart uses saved finance expense dates. No planned daily curve is fabricated.</p></div>
      </div>
      : <div className="relative">
        <div className="absolute left-0 top-1 flex h-[122px] flex-col justify-between text-[8px] text-[#8792A8]">
          {[maxValue, maxValue * 0.66, maxValue * 0.33, 0].map((tick, index) => <span key={index}>{money(tick, currency)}</span>)}
        </div>
        <svg viewBox="0 0 620 144" role="img" aria-label={`Cumulative recorded advertising expenses in ${month}, with planned budget ceiling`} className="ml-12 h-[142px] w-[calc(100%-3rem)]">
          {[22, 55, 88, 122].map((y) => <line key={y} x1="42" x2="602" y1={y} y2={y} stroke="#EEF1F6" strokeWidth="1" />)}
          {planned > 0 && <line x1="42" x2="602" y1={yFor(planned)} y2={yFor(planned)} stroke="#8B5CF6" strokeWidth="1.5" strokeDasharray="4 4"><title>{`Finance budget ceiling: ${money(planned, currency)}`}</title></line>}
          <path d={areaPath} fill="url(#spend-fill)" />
          <path d={actualPath} fill="none" stroke="#6D28D9" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
          <defs><linearGradient id="spend-fill" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#8B5CF6" stopOpacity=".18" /><stop offset="100%" stopColor="#8B5CF6" stopOpacity=".01" /></linearGradient></defs>
          {[1, 5, 10, 15, 20, 25, daysInMonth].filter((day, index, list) => list.indexOf(day) === index && day <= daysInMonth).map((day) => <text key={day} x={xFor(day - 1)} y="139" fill="#8792A8" fontSize="8" textAnchor="middle">{day} {new Date(Number(month.slice(0, 4)), Number(month.slice(5, 7)) - 1, 1).toLocaleDateString(undefined, { month: 'short' })}</text>)}
          <title>{`Recorded spend ${money(actual, currency)}; finance budget allocation ${money(planned, currency)}. Campaign budgets and Meta Ads imports are excluded.`}</title>
        </svg>
      </div>}
    <p className="mt-1 text-[8px] text-[#8792A8]">Budget is shown as a ceiling only; no daily planned allocation is available.</p>
  </section>;
}

function CategoryBreakdown({ categories, total, currency, month, loading }: {
  categories: Array<[string, number]>;
  total: number;
  currency: string;
  month: string;
  loading: boolean;
}) {
  const colors = ['bg-[#0FA68C]', 'bg-[#8B5CF6]', 'bg-[#FDBA42]', 'bg-[#4B91EE]', 'bg-[#EC6B85]'];
  return <section className="rounded-xl border border-[#E1E6F0] bg-white p-3 shadow-[0_2px_8px_rgba(35,52,95,0.03)]">
    <header className="mb-2 flex items-center justify-between"><div><h2 className="text-xs font-bold text-[#172554]">Expense Categories</h2><p className="text-[9px] text-[#8792A8]">Recorded finance expenses · {month}</p></div><Receipt className="h-4 w-4 text-[#8B6AD9]" /></header>
    {categories.length === 0
      ? <p className="grid min-h-[89px] place-items-center rounded-lg bg-[#FBFCFE] text-center text-[10px] text-[#8792A8]">{loading ? 'Loading expense categories…' : 'No recorded expenses in this period.'}</p>
      : <div className="space-y-2">{categories.slice(0, 5).map(([category, amount], index) => {
        const percent = total > 0 ? amount / total * 100 : 0;
        return <div key={category} className="grid grid-cols-[minmax(70px,1fr)_minmax(50px,1.2fr)_auto_auto] items-center gap-2 text-[9px]">
          <span className="truncate text-[#53617C]" title={category}>{category}</span>
          <span className="h-2 overflow-hidden rounded-full bg-[#E9EDF4]"><span className={`block h-full rounded-full ${colors[index % colors.length]}`} style={{ width: `${percent}%` }} /></span>
          <span className="whitespace-nowrap font-semibold text-[#344260]">{money(amount, currency)}</span>
          <span className="w-8 text-right text-[#0F9A82]">{percent.toFixed(0)}%</span>
        </div>;
      })}</div>}
  </section>;
}

function Modal({ title, onClose, children, wide = false }: { title: string; onClose: () => void; children: React.ReactNode; wide?: boolean }) {
  return <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/40 p-4" role="presentation">
    <section role="dialog" aria-modal="true" aria-label={title} className={`max-h-[90vh] w-full overflow-auto rounded-xl bg-white p-5 shadow-xl ${wide ? 'max-w-5xl' : 'max-w-lg'}`}>
      <div className="mb-4 flex items-center justify-between"><h2 className="text-base font-bold text-[#172554]">{title}</h2><button type="button" aria-label="Close" onClick={onClose} className="rounded p-1.5 text-[#74819C] hover:bg-slate-100"><X className="h-4 w-4" /></button></div>
      {children}
    </section>
  </div>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block space-y-1 text-xs font-medium text-[#33415C]">{label}{children}</label>;
}

function FormActions({ saving, onCancel }: { saving: boolean; onCancel: () => void }) {
  return <div className="flex justify-end gap-2 border-t border-[#EEF1F6] pt-3">
    <button type="button" onClick={onCancel} className={buttonClass}>Cancel</button>
    <button disabled={saving} className={primaryClass}>{saving ? 'Saving…' : 'Save'}</button>
  </div>;
}
