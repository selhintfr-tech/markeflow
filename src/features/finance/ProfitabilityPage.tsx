import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity,
  AlertCircle,
  ArrowDownRight,
  ArrowUpRight,
  Building2,
  CalendarDays,
  Check,
  ChevronDown,
  CircleDollarSign,
  Download,
  FileText,
  Info,
  Megaphone,
  Package,
  Percent,
  Plus,
  RefreshCw,
  Search,
  Truck,
  Wallet,
  X,
} from 'lucide-react';
import {
  Bar,
  BarChart as RechartsBarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { campaignService, type CampaignRecord } from '../campaigns/campaignService';
import { useWorkspace } from '../../context/WorkspaceContext';
import {
  financeService,
  type FinanceFilter,
  type FinanceSummary,
  type FinanceTransaction,
  type OrderFinancialInput,
  type OrderFinancialRecord,
  type TransactionInput,
} from './financeService';

const COLORS = ['#6D28D9', '#8B5CF6', '#A78BFA', '#C4B5FD', '#0D9488', '#14B8A6'];
const inputClass = 'w-full rounded-lg border border-[#E2E8F0] bg-white px-3 py-2 text-xs text-[#1E1B4B] focus:outline-none focus:ring-1 focus:ring-[#6D28D9]';

function dateValue(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function monthStart(): string {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-01`;
}

function formatMoney(value: number, currency: string): string {
  return new Intl.NumberFormat(undefined, { style: 'currency', currency: currency || 'USD' }).format(value);
}

function formatDate(value: string): string {
  if (!value) return 'Unavailable';
  const date = new Date(`${value.slice(0, 10)}T00:00:00`);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString();
}

function exportCsv(transactions: FinanceTransaction[], currency: string, from: string, to: string): void {
  const csvCell = (value: string | number) => {
    const text = String(value);
    const safe = /^[=+\-@]/.test(text) ? `'${text}` : text;
    return `"${safe.replaceAll('"', '""')}"`;
  };
  const rows = [
    ['Occurred on', 'Type', 'Category', 'Description', 'Amount', 'Currency', 'Campaign ID', 'Order ID'],
    ...transactions.map((transaction) => [
      transaction.occurred_on,
      transaction.type,
      transaction.category,
      transaction.description || '',
      transaction.amount,
      currency,
      transaction.campaign_id || '',
      transaction.order_id || '',
    ]),
  ];
  const content = rows.map((row) => row.map(csvCell).join(',')).join('\r\n');
  const url = URL.createObjectURL(new Blob([`\uFEFF${content}`], { type: 'text/csv;charset=utf-8' }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `profitability-${from}-${to}.csv`;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

interface TransactionFormState {
  type: TransactionInput['type'];
  category: string;
  description: string;
  amount: string;
  occurred_on: string;
  campaign_id: string;
  order_id: string;
}

const emptyTransaction = (type: TransactionInput['type'], date: string): TransactionFormState => ({
  type,
  category: type === 'income' ? 'Sales Revenue' : 'Other Expenses',
  description: '',
  amount: '',
  occurred_on: date,
  campaign_id: '',
  order_id: '',
});

interface OrderAccountingForm {
  campaign_id: string;
  product_cost_total: string;
  customer_shipping_charge: string;
  sales_collected: string;
  shipping_collected: string;
  courier_cost: string;
  other_expenses: string;
  refund_return_cost: string;
  profit_share_percent: string;
  is_reconciled: boolean;
  post_to_ledger: boolean;
  show_custom_overrides: boolean;
}

function initialOrderForm(order: OrderFinancialRecord): OrderAccountingForm {
  const isPaidEligible = (order.payment_status === 'Paid' || order.payment_status === 'Partially Paid')
    && !['Returned', 'Rejected', 'Cancelled'].includes(order.status);
  const hasExistingVerified = order.financials?.sales_collected !== null && order.financials?.sales_collected !== undefined;
  const isReconciled = hasExistingVerified ? true : isPaidEligible;

  const defaultCustomerShipping = order.financials?.customer_shipping_charge
    ?? order.shipment?.customer_shipping_charge
    ?? '';
  const defaultCourierCost = order.financials?.courier_cost
    ?? order.shipment?.shipping_cost
    ?? '';

  const salesCollected = order.financials?.sales_collected
    ?? (isReconciled ? String(order.subtotal) : '');
  const shippingCollected = order.financials?.shipping_collected
    ?? (isReconciled ? (defaultCustomerShipping || '0.00') : '');

  const hasCustomOverrides = hasExistingVerified && (
    (order.financials?.sales_collected !== null && order.financials?.sales_collected !== String(order.subtotal)) ||
    (order.financials?.courier_cost !== null && order.financials?.courier_cost !== order.shipment?.shipping_cost) ||
    (order.financials?.customer_shipping_charge !== null && order.financials?.customer_shipping_charge !== order.shipment?.customer_shipping_charge)
  );

  return {
    campaign_id: order.financials?.campaign_id || '',
    product_cost_total: order.financials?.product_cost_total || '',
    customer_shipping_charge: defaultCustomerShipping,
    sales_collected: salesCollected,
    shipping_collected: shippingCollected,
    courier_cost: defaultCourierCost,
    other_expenses: order.financials?.other_expenses || '0.00',
    refund_return_cost: order.financials?.refund_return_cost || '0.00',
    profit_share_percent: order.financials?.profit_share_percent || '',
    is_reconciled: isReconciled,
    post_to_ledger: order.ledger?.is_posted ?? true,
    show_custom_overrides: Boolean(hasCustomOverrides),
  };
}

function toOptionalDecimal(value: string): string | null {
  return value.trim() === '' ? null : String(Number(value).toFixed(2));
}

export const ProfitabilityPage: React.FC = () => {
  const {
    workspaces,
    currentWorkspace,
    hasWorkspace,
    isLoadingWorkspaces,
    setCurrentWorkspace,
  } = useWorkspace();
  const workspaceId = currentWorkspace.id;
  const currency = currentWorkspace.currency || 'USD';
  const [campaigns, setCampaigns] = useState<CampaignRecord[]>([]);
  const [selectedCampaign, setSelectedCampaign] = useState('');
  const [from, setFrom] = useState(monthStart);
  const [to, setTo] = useState(() => dateValue(new Date()));
  const [summary, setSummary] = useState<FinanceSummary | null>(null);
  const [transactions, setTransactions] = useState<FinanceTransaction[]>([]);
  const [orders, setOrders] = useState<OrderFinancialRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [orderLoadError, setOrderLoadError] = useState('');
  const [actionError, setActionError] = useState('');
  const [transactionForm, setTransactionForm] = useState<TransactionFormState | null>(null);
  const [editingOrder, setEditingOrder] = useState<OrderFinancialRecord | null>(null);
  const [orderForm, setOrderForm] = useState<OrderAccountingForm | null>(null);
  const [orderStatusFilter, setOrderStatusFilter] = useState<string>('All');
  const [orderSearchQuery, setOrderSearchQuery] = useState<string>('');
  const requestId = useRef(0);
  const loadedWorkspaceId = useRef(workspaceId);

  const refresh = useCallback(async () => {
    const request = ++requestId.current;
    const workspaceChanged = loadedWorkspaceId.current !== workspaceId;
    if (workspaceChanged) {
      loadedWorkspaceId.current = workspaceId;
      setSummary(null);
      setTransactions([]);
      setOrders([]);
      setCampaigns([]);
      setSelectedCampaign('');
      setTransactionForm(null);
      setEditingOrder(null);
      setOrderForm(null);
    }
    if (!workspaceId) {
      setSummary(null);
      setTransactions([]);
      setOrders([]);
      setCampaigns([]);
      return;
    }
    setLoading(true);
    setLoadError('');
    setOrderLoadError('');
    const campaignId = workspaceChanged ? '' : selectedCampaign;
    const filters: FinanceFilter = {
      ...(from ? { from } : {}),
      ...(to ? { to } : {}),
      ...(campaignId ? { campaign_id: campaignId } : {}),
    };
    const [nextSummary, nextTransactions, nextCampaigns, nextOrders] = await Promise.allSettled([
      financeService.summary(workspaceId, filters),
      financeService.listTransactions(workspaceId, filters),
      campaignService.list(workspaceId),
      financeService.listOrderFinancials(workspaceId, filters),
    ]);
    if (request !== requestId.current) return;
    const failures: string[] = [];
    if (nextSummary.status === 'fulfilled') setSummary(nextSummary.value);
    else failures.push(nextSummary.reason instanceof Error ? nextSummary.reason.message : 'Unable to load the finance summary.');
    if (nextTransactions.status === 'fulfilled') setTransactions(nextTransactions.value);
    else failures.push(nextTransactions.reason instanceof Error ? nextTransactions.reason.message : 'Unable to load recorded transactions.');
    if (nextCampaigns.status === 'fulfilled') {
      setCampaigns(nextCampaigns.value);
      if (selectedCampaign && !nextCampaigns.value.some((campaign) => campaign.id === selectedCampaign)) {
        setSelectedCampaign('');
      }
    } else failures.push(nextCampaigns.reason instanceof Error ? nextCampaigns.reason.message : 'Unable to load campaigns.');
    if (nextOrders.status === 'fulfilled') setOrders(nextOrders.value);
    else {
      setOrders([]);
      setOrderLoadError(nextOrders.reason instanceof Error
        ? nextOrders.reason.message
        : 'Unable to load structured order-accounting records.');
    }
    setLoadError(failures.length ? failures.join(' ') : '');
    setLoading(false);
  }, [workspaceId, from, to, selectedCampaign]);

  useEffect(() => {
    void refresh();
    return () => { requestId.current += 1; };
  }, [refresh]);

  const income = Number(summary?.income || 0);
  const expenses = Number(summary?.expenses || 0);
  const net = income - expenses;
  const margin = income > 0 ? (net / income) * 100 : null;
  const advertisingSpend = transactions
    .filter((transaction) => transaction.type === 'expense' && /advertising|ad spend|meta ads|google ads/i.test(transaction.category))
    .reduce((total, transaction) => total + Number(transaction.amount), 0);
  const costOfGoods = transactions
    .filter((transaction) => transaction.type === 'expense' && /cost of goods|product cost|production|purchase cost/i.test(transaction.category))
    .reduce((total, transaction) => total + Number(transaction.amount), 0);
  const otherExpenses = Math.max(0, expenses - advertisingSpend - costOfGoods);
  const roas = advertisingSpend > 0 ? income / advertisingSpend : null;
  const budgetAmount = summary?.budgets.reduce((total, item) => total + Number(item.budget), 0) || 0;
  const expenseCategories = useMemo(() => {
    const totals = new Map<string, number>();
    transactions.filter((transaction) => transaction.type === 'expense').forEach((transaction) => {
      totals.set(transaction.category, (totals.get(transaction.category) || 0) + Number(transaction.amount));
    });
    return [...totals.entries()].map(([category, amount]) => ({ category, amount }));
  }, [transactions]);
  const visibleOrders = useMemo(() => {
    return orders.filter((order) => {
      const matchesStatus = orderStatusFilter === 'All' || order.status === orderStatusFilter;
      const query = orderSearchQuery.trim().toLowerCase();
      const matchesSearch = !query ||
        order.order_number.toLowerCase().includes(query) ||
        (order.shipment?.tracking_number || '').toLowerCase().includes(query) ||
        (order.ozon_flow?.tracking_number || '').toLowerCase().includes(query);
      return matchesStatus && matchesSearch;
    });
  }, [orders, orderStatusFilter, orderSearchQuery]);
  const pnlItems = [
    { label: 'Recorded Revenue', amount: income, kind: 'income' },
    { label: 'Advertising Spend', amount: advertisingSpend, kind: 'expense' },
    { label: 'Cost of Goods Sold', amount: costOfGoods, kind: 'expense' },
    { label: 'Other Allocated Expenses', amount: otherExpenses, kind: 'expense' },
    { label: 'Total Recorded Costs', amount: expenses, kind: 'total' },
    { label: 'Estimated Net Profit', amount: net, kind: 'profit' },
  ];

  const openTransactionForm = (type: TransactionInput['type']) => {
    setActionError('');
    setTransactionForm(emptyTransaction(type, dateValue(new Date())));
  };

  const saveTransaction = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!workspaceId || !transactionForm) return;
    const amount = Number(transactionForm.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      setActionError('Enter an amount greater than zero.');
      return;
    }
    setSaving(true);
    setActionError('');
    try {
      await financeService.createTransaction(workspaceId, {
        type: transactionForm.type,
        category: transactionForm.category.trim(),
        description: transactionForm.description.trim(),
        amount: amount.toFixed(2),
        occurred_on: transactionForm.occurred_on,
        campaign_id: transactionForm.campaign_id || null,
        order_id: transactionForm.order_id || null,
      });
      setTransactionForm(null);
      await refresh();
    } catch (cause) {
      setActionError(cause instanceof Error ? cause.message : 'Unable to record the transaction.');
    } finally {
      setSaving(false);
    }
  };

  const saveOrderAccounting = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!workspaceId || !editingOrder || !orderForm) return;
    setSaving(true);
    setActionError('');
    const input: OrderFinancialInput = {
      campaign_id: orderForm.campaign_id || null,
      product_cost_total: toOptionalDecimal(orderForm.product_cost_total),
      customer_shipping_charge: toOptionalDecimal(orderForm.customer_shipping_charge),
      sales_collected: orderForm.is_reconciled ? toOptionalDecimal(orderForm.sales_collected) : null,
      shipping_collected: orderForm.is_reconciled ? toOptionalDecimal(orderForm.shipping_collected) : null,
      courier_cost: toOptionalDecimal(orderForm.courier_cost),
      other_expenses: toOptionalDecimal(orderForm.other_expenses),
      refund_return_cost: toOptionalDecimal(orderForm.refund_return_cost),
      profit_share_percent: toOptionalDecimal(orderForm.profit_share_percent),
      post_to_ledger: orderForm.is_reconciled ? orderForm.post_to_ledger : false,
    };
    try {
      await financeService.saveOrderFinancials(workspaceId, editingOrder.id, input);
      setEditingOrder(null);
      setOrderForm(null);
      await refresh();
    } catch (cause) {
      setActionError(cause instanceof Error ? cause.message : 'Unable to save order accounting details.');
    } finally {
      setSaving(false);
    }
  };

  const toggleLedgerPosting = async (order: OrderFinancialRecord) => {
    if (!workspaceId) return;
    setActionError('');
    setSaving(true);
    try {
      if (order.ledger?.is_posted) {
        await financeService.removeOrderFromLedger(workspaceId, order.id);
      } else {
        await financeService.postOrderToLedger(workspaceId, order.id);
      }
      await refresh();
    } catch (cause) {
      setActionError(cause instanceof Error ? cause.message : 'Unable to update ledger posting.');
    } finally {
      setSaving(false);
    }
  };

  const selectedCampaignName = campaigns.find((campaign) => campaign.id === selectedCampaign)?.name || '';

  if (isLoadingWorkspaces) return <p className="p-6 text-sm text-slate-500">Loading workspaces…</p>;
  if (!hasWorkspace) return <p className="p-6 text-sm text-slate-600">Select or create a workspace to view profitability.</p>;

  return (
    <main className="min-h-screen space-y-4 bg-[#F8F7FC] p-4 text-[#1E1B4B] sm:p-6 lg:p-8">
      <header className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <div className="mb-1 flex items-center gap-1.5 text-xs text-[#64748B]">
            <span>Finance</span><span>/</span><span className="font-medium text-[#6D28D9]">Profitability</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-[#1E1B4B]">Revenue &amp; Profitability</h1>
          <p className="mt-0.5 text-xs text-[#64748B]">Understand your marketing return using recorded revenue and costs.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => exportCsv(transactions, currency, from, to)} disabled={transactions.length === 0} className="inline-flex items-center gap-1.5 rounded-lg border border-[#6D28D9] bg-white px-3 py-2 text-xs font-semibold text-[#6D28D9] hover:bg-[#F5F3FF] disabled:opacity-50">
            <Download className="h-3.5 w-3.5" />Export Report
          </button>
          <button type="button" onClick={() => openTransactionForm('expense')} className="inline-flex items-center gap-1.5 rounded-lg border border-[#6D28D9] bg-white px-3 py-2 text-xs font-semibold text-[#6D28D9] hover:bg-[#F5F3FF]">
            <Plus className="h-3.5 w-3.5" />Add Expense
          </button>
          <button type="button" onClick={() => openTransactionForm('income')} className="inline-flex items-center gap-1.5 rounded-lg bg-[#6D28D9] px-3 py-2 text-xs font-semibold text-white hover:bg-[#5B21B6]">
            <Plus className="h-3.5 w-3.5" />Record Revenue
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_auto_auto]">
        <label className="flex items-center gap-2 rounded-lg border border-[#E2E8F0] bg-white px-3 py-2 text-xs">
          <Building2 className="h-4 w-4 shrink-0 text-[#6D28D9]" />
          <span className="sr-only">Workspace</span>
          <select value={workspaceId} onChange={(event) => setCurrentWorkspace(event.target.value)} className="min-w-0 flex-1 bg-transparent font-medium text-[#1E1B4B] focus:outline-none">
            {workspaces.map((workspace) => <option key={workspace.id} value={workspace.id}>{workspace.name}</option>)}
          </select>
          <ChevronDown className="h-3.5 w-3.5 text-[#94A3B8]" />
        </label>
        <label className="flex items-center gap-2 rounded-lg border border-[#E2E8F0] bg-white px-3 py-2 text-xs">
          <Megaphone className="h-4 w-4 shrink-0 text-[#6D28D9]" />
          <span className="sr-only">Campaign</span>
          <select value={selectedCampaign} onChange={(event) => setSelectedCampaign(event.target.value)} className="min-w-0 flex-1 bg-transparent font-medium text-[#1E1B4B] focus:outline-none">
            <option value="">All campaigns / workspace</option>
            {campaigns.map((campaign) => <option key={campaign.id} value={campaign.id}>{campaign.name}</option>)}
          </select>
          <ChevronDown className="h-3.5 w-3.5 text-[#94A3B8]" />
        </label>
        <label className="flex items-center gap-2 rounded-lg border border-[#E2E8F0] bg-white px-3 py-2 text-xs text-[#64748B]">
          <CalendarDays className="h-4 w-4 shrink-0" />
          <span>From</span>
          <input aria-label="Profitability start date" type="date" value={from} max={to} onChange={(event) => setFrom(event.target.value)} className="min-w-0 bg-transparent text-[#1E1B4B]" />
        </label>
        <div className="flex gap-2">
          <label className="flex min-w-0 flex-1 items-center gap-2 rounded-lg border border-[#E2E8F0] bg-white px-3 py-2 text-xs text-[#64748B]">
            <span>To</span>
            <input aria-label="Profitability end date" type="date" value={to} min={from} onChange={(event) => setTo(event.target.value)} className="min-w-0 flex-1 bg-transparent text-[#1E1B4B]" />
          </label>
          <button type="button" onClick={() => void refresh()} disabled={loading} aria-label="Refresh profitability report" className="rounded-lg border border-[#E2E8F0] bg-white px-3 text-[#6D28D9] hover:bg-[#F5F3FF] disabled:opacity-50">
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {(loadError || orderLoadError || actionError) && (
        <div role="alert" className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs text-amber-900">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <div className="space-y-1">{loadError && <p>{loadError}</p>}{orderLoadError && <p>Order accounting: {orderLoadError}</p>}{actionError && <p>{actionError}</p>}</div>
        </div>
      )}

      {loading && !summary ? (
        <div role="status" className="rounded-xl border border-[#E2E8F0] bg-white p-8 text-center text-sm text-[#64748B]">Loading recorded financial data…</div>
      ) : !summary ? (
        <div role="alert" className="rounded-xl border border-red-200 bg-white p-5 text-sm text-red-800">
          <p>Profitability data could not be loaded. No financial totals are shown until the finance summary is available.</p>
          {loadError && <p className="mt-1 text-xs">{loadError}</p>}
          <button type="button" onClick={() => void refresh()} className="mt-3 rounded-md border border-red-300 px-3 py-1.5 text-xs font-semibold hover:bg-red-50">Try again</button>
        </div>
      ) : (
        <>
          <section aria-label="Profitability key metrics" className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-4">
            <Metric icon={CircleDollarSign} label="Recorded Revenue" value={formatMoney(income, currency)} color="bg-[#F0FDFA] text-[#0D9488]" />
            <Metric icon={Megaphone} label="Advertising Spend" value={formatMoney(advertisingSpend, currency)} color="bg-[#F5F3FF] text-[#6D28D9]" />
            <Metric icon={Package} label="Cost of Goods Sold" value={formatMoney(costOfGoods, currency)} color="bg-[#F5F3FF] text-[#7C3AED]" />
            <Metric icon={FileText} label="Other Allocated Expenses" value={formatMoney(otherExpenses, currency)} color="bg-[#F5F3FF] text-[#6D28D9]" />
            <Metric icon={Wallet} label="Total Recorded Costs" value={formatMoney(expenses, currency)} color="bg-[#F5F3FF] text-[#7C3AED]" />
            <Metric icon={Activity} label="Estimated Net Profit" value={formatMoney(net, currency)} color="bg-[#F0FDFA] text-[#0D9488]" tone={net < 0 ? 'negative' : 'positive'} />
            <Metric icon={Percent} label="Profit Margin" value={margin === null ? 'Unavailable' : `${margin.toFixed(1)}%`} color="bg-[#F0FDFA] text-[#0D9488]" tone={margin !== null && margin < 0 ? 'negative' : 'positive'} />
            <Metric icon={ArrowUpRight} label="ROAS" value={roas === null ? 'Unavailable' : `${roas.toFixed(2)}×`} color="bg-[#F0FDFA] text-[#0D9488]" tone={roas === null ? undefined : 'positive'} />
          </section>

          <div className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold ${net > 0 ? 'border-teal-200 bg-teal-50 text-teal-800' : net < 0 ? 'border-red-200 bg-red-50 text-red-800' : 'border-[#E2E8F0] bg-white text-[#64748B]'}`}>
            {net > 0 ? <Check className="h-4 w-4" /> : net < 0 ? <ArrowDownRight className="h-4 w-4" /> : <Info className="h-4 w-4" />}
            {net > 0 ? 'Profitable based on recorded data' : net < 0 ? 'Costs exceed recorded revenue' : 'Profitability is not established by recorded transactions'}
            {selectedCampaignName && <span className="ml-auto font-normal">{selectedCampaignName}</span>}
          </div>

          <div className="grid grid-cols-1 gap-3 xl:grid-cols-[1fr_1.05fr]">
            <section className="rounded-xl border border-[#E2E8F0] bg-white p-3 shadow-2xs sm:p-4">
              <div className="mb-3">
                <h2 className="text-sm font-bold text-[#1E1B4B]">Profit and Loss Statement</h2>
                <p className="text-[10px] text-[#64748B]">Based on recorded revenue and expenses{selectedCampaignName ? ` for ${selectedCampaignName}` : ' for this workspace'}.</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[300px] text-left text-xs">
                  <thead><tr className="border-b border-[#E2E8F0] text-[10px] font-semibold text-[#64748B]"><th className="px-2 py-2">Item</th><th className="px-2 py-2 text-right">Amount</th></tr></thead>
                  <tbody>
                    <tr className="bg-[#F5F3FF] font-semibold"><td colSpan={2} className="px-2 py-1.5">Revenue</td></tr>
                    {pnlItems.slice(0, 1).map((item) => <StatementRow key={item.label} item={item} currency={currency} />)}
                    <tr className="bg-[#F5F3FF] font-semibold"><td colSpan={2} className="px-2 py-1.5">Costs</td></tr>
                    {pnlItems.slice(1, 5).map((item) => <StatementRow key={item.label} item={item} currency={currency} />)}
                    <tr className="border-t border-[#E2E8F0] font-bold text-[#0D9488]"><td className="px-2 py-2">Estimated Net Profit</td><td className="px-2 py-2 text-right">{formatMoney(net, currency)}</td></tr>
                    <tr><td className="px-2 py-1.5 text-[#64748B]">Profit Margin</td><td className="px-2 py-1.5 text-right font-semibold text-[#0D9488]">{margin === null ? 'Unavailable' : `${margin.toFixed(1)}%`}</td></tr>
                    <tr><td className="px-2 py-1.5 text-[#64748B]">ROAS</td><td className="px-2 py-1.5 text-right font-semibold text-[#0D9488]">{roas === null ? 'Unavailable' : `${roas.toFixed(2)}×`}</td></tr>
                  </tbody>
                </table>
              </div>
              {budgetAmount > 0 && <p className="mt-3 border-t border-[#F1F5F9] pt-2 text-[10px] text-[#64748B]">Workspace budgets in selected dates: {formatMoney(budgetAmount, currency)}. Budgets are not campaign-attributed and are not counted as realized expenses.</p>}
            </section>

            <div className="space-y-3">
              <section className="rounded-xl border border-[#E2E8F0] bg-white p-3 shadow-2xs sm:p-4">
                <div className="mb-2">
                  <h2 className="text-sm font-bold text-[#1E1B4B]">Revenue vs. Costs</h2>
                  <p className="text-[10px] text-[#64748B]">Comparison for {selectedCampaignName || 'the selected workspace'}.</p>
                </div>
                {income === 0 && expenses === 0 ? <ChartEmpty loading={loading} /> : (
                  <div className="h-40 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsBarChart data={[
                        { name: 'Sales Revenue', amount: income },
                        { name: 'Total Recorded Costs', amount: expenses },
                        { name: 'Net Profit', amount: net },
                      ]} margin={{ top: 12, right: 8, left: 6, bottom: 2 }}>
                        <CartesianGrid stroke="#EEF2F7" vertical={false} />
                        <XAxis dataKey="name" tick={{ fontSize: 9, fill: '#64748B' }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 9, fill: '#94A3B8' }} axisLine={false} tickLine={false} tickFormatter={(value) => Number(value).toLocaleString()} />
                        <Tooltip formatter={(value) => formatMoney(Number(value), currency)} />
                        <Bar dataKey="amount" radius={[4, 4, 0, 0]}>
                          {[0, 1, 2].map((index) => <Cell key={index} fill={index === 0 ? '#6D28D9' : index === 1 ? '#A78BFA' : net < 0 ? '#DC2626' : '#14B8A6'} />)}
                        </Bar>
                      </RechartsBarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </section>

              <section className="rounded-xl border border-[#E2E8F0] bg-white p-3 shadow-2xs sm:p-4">
                <div className="mb-2">
                  <h2 className="text-sm font-bold text-[#1E1B4B]">Expense Breakdown</h2>
                  <p className="text-[10px] text-[#64748B]">Share of recorded costs ({formatMoney(expenses, currency)}).</p>
                </div>
                {expenseCategories.length === 0 ? <ChartEmpty loading={loading} /> : (
                  <div className="grid grid-cols-1 items-center gap-2 sm:grid-cols-[125px_1fr]">
                    <div className="h-28">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={expenseCategories} dataKey="amount" nameKey="category" innerRadius={26} outerRadius={48} paddingAngle={2}>
                            {expenseCategories.map((item, index) => <Cell key={item.category} fill={COLORS[index % COLORS.length]} />)}
                          </Pie>
                          <Tooltip formatter={(value) => formatMoney(Number(value), currency)} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="space-y-2">
                      {expenseCategories.slice(0, 5).map((item, index) => (
                        <div key={item.category} className="flex items-center gap-2 text-[10px]">
                          <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                          <span className="min-w-0 flex-1 truncate text-[#475569]">{item.category}</span>
                          <span className="whitespace-nowrap font-semibold text-[#1E1B4B]">{formatMoney(item.amount, currency)}</span>
                          <span className="w-10 text-right text-[#64748B]">{expenses ? `${(item.amount / expenses * 100).toFixed(1)}%` : '0%'}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </section>
            </div>
          </div>

          <section className="rounded-lg border border-blue-100 bg-blue-50/70 px-3 py-2.5 text-[11px] leading-relaxed text-[#475569]">
            <div className="flex items-start gap-2"><Info className="mt-0.5 h-4 w-4 shrink-0 text-[#6D28D9]" />
              <div><strong className="text-[#1E1B4B]">Financial notes.</strong> Revenue and expenses above come only from finance-ledger transactions in the selected workspace, campaign and dates. Budgets are not expenses. Pending COD orders are excluded from realized income. Order product costs, customer shipping charges, and refunds are not inferred from order notes; record them as structured accounting values and post recognized cash/cost transactions to the ledger when verified.</div>
            </div>
          </section>

          <details className="rounded-xl border border-[#E2E8F0] bg-white shadow-2xs">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3">
              <span><span className="block text-sm font-bold text-[#1E1B4B]">Order profitability details</span><span className="mt-0.5 block text-[10px] text-[#64748B]">Per-order accounting uses persisted Sales &amp; Orders data. Actual ledger transactions post exactly once without double-counting.</span></span>
              <ChevronDown className="h-4 w-4 shrink-0 text-[#64748B]" />
            </summary>
            <div className="border-t border-[#E2E8F0] p-3 sm:p-4">
              {orderLoadError ? <p role="status" className="text-xs text-amber-800">Could not load structured order-accounting records: {orderLoadError}</p>
                : orders.length === 0 ? <p className="py-5 text-center text-xs text-[#64748B]">No sales orders are available for this workspace and campaign selection.</p>
                  : (
                    <>
                      <div className="mb-3 flex flex-wrap items-center justify-between gap-2.5">
                        <div className="flex flex-wrap items-center gap-1.5 text-xs">
                          <span className="text-[11px] font-semibold text-[#64748B]">Order Status:</span>
                          {(['All', 'Delivered', 'Pending', 'Shipping', 'Cancelled'] as const).map((status) => {
                            const count = status === 'All' ? orders.length : orders.filter((o) => o.status === status).length;
                            return (
                              <button
                                key={status}
                                type="button"
                                onClick={() => setOrderStatusFilter(status)}
                                className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors ${
                                  orderStatusFilter === status
                                    ? 'bg-[#6D28D9] text-white shadow-2xs'
                                    : 'bg-slate-100 text-[#475569] hover:bg-slate-200'
                                }`}
                              >
                                {status}
                                <span className={`ml-1.5 rounded-full px-1.5 py-0.2 text-[9px] ${
                                  orderStatusFilter === status ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
                                }`}>
                                  {count}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                        <div className="relative">
                          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                          <input
                            type="text"
                            value={orderSearchQuery}
                            onChange={(e) => setOrderSearchQuery(e.target.value)}
                            placeholder="Search order or tracking…"
                            className="rounded-lg border border-slate-200 bg-white py-1 pl-8 pr-2.5 text-xs text-slate-800 placeholder-slate-400 focus:border-[#6D28D9] focus:outline-none"
                          />
                        </div>
                      </div>
                      {visibleOrders.length === 0 ? (
                        <p className="py-5 text-center text-xs text-[#64748B]">No orders matching the selected filter ({orderStatusFilter}) or search query.</p>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full min-w-[880px] text-left text-xs">
                            <thead>
                              <tr className="border-b text-[10px] font-semibold uppercase tracking-wide text-[#64748B]">
                                <th className="px-2 py-2">Order &amp; Logistics</th>
                                <th className="px-2 py-2">Items &amp; Subtotal</th>
                                <th className="px-2 py-2">Ozon Flow (COD &amp; Fee)</th>
                                <th className="px-2 py-2">Statement Reconciliation</th>
                                <th className="px-2 py-2">COGS &amp; Costs</th>
                                <th className="px-2 py-2">Net Profit</th>
                                <th className="px-2 py-2 text-right">Ledger &amp; Action</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-[#F1F5F9]">
                              {visibleOrders.map((order) => {
                                const carrierName = order.ozon_flow?.carrier || order.shipment?.delivery_company_id || 'Ozon Express';
                                const trackingNumber = order.ozon_flow?.tracking_number || order.shipment?.tracking_number;
                                const courierCost = order.ozon_flow?.courier_cost ?? (order.financials?.courier_cost ? Number(order.financials.courier_cost) : (order.shipment?.shipping_cost ? Number(order.shipment.shipping_cost) : 0));
                                const customerShipping = order.ozon_flow?.customer_shipping_charge ?? (order.financials?.customer_shipping_charge ? Number(order.financials.customer_shipping_charge) : (order.shipment?.customer_shipping_charge ? Number(order.shipment.customer_shipping_charge) : 0));
                                const expectedCod = order.ozon_flow?.expected_cod ?? (order.shipment?.cod_amount ? Number(order.shipment.cod_amount) : Number(order.total));
                                const expectedRemittance = order.ozon_flow?.expected_net_remittance ?? (expectedCod - courierCost);
                                const isVerified = order.realized_collected !== null && order.realized_collected !== undefined;
                                const verifiedRemittance = isVerified ? (Number(order.realized_collected) - courierCost) : null;
                                const isPosted = Boolean(order.ledger?.is_posted);

                                return (
                                  <tr key={order.id} className="hover:bg-slate-50/50">
                                    <td className="px-2 py-3">
                                      <span className="font-semibold text-[#1E1B4B]">{order.order_number}</span>
                                      <span className="mt-0.5 flex items-center gap-1 text-[10px] font-medium text-[#6D28D9]">
                                        <Truck className="h-3 w-3 shrink-0" />
                                        <span>{carrierName}</span>
                                        {trackingNumber && <span className="text-[#64748B]">· {trackingNumber}</span>}
                                      </span>
                                      <div className="mt-1 flex items-center gap-1.5">
                                        <span className={`inline-flex items-center rounded-sm px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider ${
                                          order.status === 'Delivered'
                                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                            : order.status === 'Pending'
                                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                            : order.status === 'Cancelled'
                                            ? 'bg-slate-100 text-slate-600 border border-slate-200'
                                            : 'bg-blue-50 text-blue-700 border border-blue-200'
                                        }`}>
                                          {order.status}
                                        </span>
                                        <span className="text-[10px] text-[#64748B]">{formatDate(order.created_at)}</span>
                                      </div>
                                    </td>
                                    <td className="px-2 py-3">
                                      {order.items.map((item, index) => (
                                        <div key={`${item.name}-${index}`} className="truncate max-w-[200px]">
                                          {item.quantity} × {item.name} <span className="text-[#64748B]">({formatMoney(item.unit_price, order.currency)})</span>
                                        </div>
                                      ))}
                                      <span className="mt-1 block text-[10px] text-[#64748B]">Product subtotal {formatMoney(Number(order.subtotal), order.currency)}</span>
                                      <span className="block text-[10px] text-[#64748B]">Customer shipping {formatMoney(customerShipping, order.currency)}</span>
                                    </td>
                              <td className="px-2 py-3">
                                <span className="font-medium text-[#1E1B4B]">COD: {formatMoney(expectedCod, order.currency)}</span>
                                <span className="mt-0.5 block text-[10px] text-red-700">Ozon fee: -{formatMoney(courierCost, order.currency)}</span>
                                <span className="mt-0.5 block rounded bg-teal-50 px-1.5 py-0.5 text-[10px] font-semibold text-teal-800">
                                  Net payout: {formatMoney(expectedRemittance, order.currency)}
                                </span>
                              </td>
                              <td className="px-2 py-3">
                                {isVerified ? (
                                  <div>
                                    <span className="inline-flex items-center gap-1 rounded bg-teal-50 px-2 py-0.5 text-[10px] font-semibold text-teal-800 border border-teal-200">
                                      <Check className="h-3 w-3" /> Reconciled
                                    </span>
                                    <span className="mt-1 block text-[10px] font-medium text-[#1E1B4B]">
                                      Net cash: {formatMoney(Number(verifiedRemittance), order.currency)}
                                    </span>
                                    <span className="block text-[9px] text-[#64748B]">Gross: {formatMoney(Number(order.realized_collected), order.currency)}</span>
                                  </div>
                                ) : (
                                  <div>
                                    <span className="inline-flex items-center gap-1 rounded bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-800 border border-amber-200">
                                      Unverified
                                    </span>
                                    <span className="mt-1 block text-[9px] text-[#64748B]">Awaiting Ozon statement verification</span>
                                  </div>
                                )}
                              </td>
                              <td className="px-2 py-3">
                                <div>COGS: {order.financials?.product_cost_total ? formatMoney(Number(order.financials.product_cost_total), order.currency) : <span className="italic text-[#94A3B8]">Required</span>}</div>
                                <span className="mt-0.5 block text-[10px] text-[#64748B]">Courier fee: {formatMoney(courierCost, order.currency)}</span>
                                <span className="block text-[10px] text-[#64748B]">Other/returns: {formatMoney(Number(order.financials?.other_expenses || 0) + Number(order.financials?.refund_return_cost || 0), order.currency)}</span>
                              </td>
                              <td className="px-2 py-3 font-semibold">
                                {order.financials?.net_order_profit == null ? (
                                  <span className="text-[10px] text-[#94A3B8] font-normal">
                                    {order.payment_status === 'Pending' ? 'Pending COD' : 'Requires COGS & reconciliation'}
                                  </span>
                                ) : (
                                  <span className={order.financials.net_order_profit >= 0 ? 'text-[#0D9488]' : 'text-red-700'}>
                                    {formatMoney(order.financials.net_order_profit, order.currency)}
                                  </span>
                                )}
                              </td>
                              <td className="px-2 py-3 text-right space-y-1">
                                <div>
                                  {isPosted ? (
                                    <span className="inline-block rounded bg-teal-50 px-1.5 py-0.5 text-[9px] font-bold text-teal-800 border border-teal-200">
                                      ✓ In Ledger
                                    </span>
                                  ) : (
                                    <span className="inline-block rounded bg-slate-50 px-1.5 py-0.5 text-[9px] font-medium text-slate-500 border border-slate-200">
                                      Not in Ledger
                                    </span>
                                  )}
                                </div>
                                <div className="flex justify-end gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => { setActionError(''); setEditingOrder(order); setOrderForm(initialOrderForm(order)); }}
                                    className="rounded-md border border-[#E2E8F0] bg-white px-2 py-1 text-[10px] font-semibold text-[#6D28D9] hover:bg-[#F5F3FF]"
                                  >
                                    {order.financials?.has_record ? 'Edit record' : 'Reconcile & costs'}
                                  </button>
                                  {isVerified && (
                                    <button
                                      type="button"
                                      disabled={saving}
                                      onClick={() => void toggleLedgerPosting(order)}
                                      title={isPosted ? 'Remove posted transactions from Finance Ledger' : 'Post verified transactions to Finance Ledger'}
                                      className="rounded-md border border-[#E2E8F0] bg-white px-2 py-1 text-[10px] font-medium text-[#475569] hover:bg-slate-50"
                                    >
                                      {isPosted ? 'Unpost' : 'Post'}
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}
              <p className="mt-3 text-[10px] leading-relaxed text-[#64748B]">Orders reuse persisted Sales &amp; Orders values automatically (items, subtotal, shipping charge, and courier fee). Ozon flow: Customer pays COD (product + shipping) → Ozon retains courier delivery fee → Merchant receives net remittance. Net profit = verified remittance − production cost − other expenses − refunds. Expected COD is not assumed collected until reconciled with Ozon statements. Ledger posting guarantees single transaction recording without double-counting.</p>
            </div>
          </details>

          <details className="rounded-xl border border-[#E2E8F0] bg-white">
            <summary className="cursor-pointer px-4 py-3 text-xs font-semibold text-[#1E1B4B]">Recorded ledger transactions ({transactions.length})</summary>
            <div className="overflow-x-auto border-t border-[#E2E8F0]">
              <table className="w-full min-w-[560px] text-left text-xs">
                <thead><tr className="border-b text-[10px] uppercase text-[#64748B]"><th className="px-3 py-2">Date</th><th className="px-3 py-2">Category</th><th className="px-3 py-2">Description</th><th className="px-3 py-2">Type</th><th className="px-3 py-2 text-right">Amount</th></tr></thead>
                <tbody className="divide-y divide-[#F1F5F9]">
                  {transactions.map((transaction) => <tr key={transaction.id}><td className="px-3 py-2">{formatDate(transaction.occurred_on)}</td><td className="px-3 py-2">{transaction.category}</td><td className="px-3 py-2">{transaction.description || '—'}</td><td className="px-3 py-2 capitalize">{transaction.type}</td><td className="px-3 py-2 text-right font-medium">{formatMoney(Number(transaction.amount), currency)}</td></tr>)}
                  {transactions.length === 0 && <tr><td colSpan={5} className="px-3 py-6 text-center text-[#64748B]">{loading ? 'Loading transactions…' : 'No transactions recorded in this selection.'}</td></tr>}
                </tbody>
              </table>
            </div>
          </details>
        </>
      )}

      {transactionForm && (
        <Modal title={transactionForm.type === 'expense' ? 'Add Expense' : 'Record Revenue'} onClose={() => setTransactionForm(null)}>
          <form onSubmit={(event) => void saveTransaction(event)} className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Category"><input autoFocus required maxLength={100} value={transactionForm.category} onChange={(event) => setTransactionForm({ ...transactionForm, category: event.target.value })} className={inputClass} /></Field>
              <Field label={`Amount (${currency})`}><input required type="number" min="0.01" step="0.01" value={transactionForm.amount} onChange={(event) => setTransactionForm({ ...transactionForm, amount: event.target.value })} className={inputClass} /></Field>
              <Field label="Date"><input required type="date" value={transactionForm.occurred_on} onChange={(event) => setTransactionForm({ ...transactionForm, occurred_on: event.target.value })} className={inputClass} /></Field>
              <Field label="Campaign"><select value={transactionForm.campaign_id} onChange={(event) => setTransactionForm({ ...transactionForm, campaign_id: event.target.value })} className={inputClass}><option value="">Not attributed</option>{campaigns.map((campaign) => <option key={campaign.id} value={campaign.id}>{campaign.name}</option>)}</select></Field>
              <Field label="Sales order (optional)"><select value={transactionForm.order_id} onChange={(event) => setTransactionForm({ ...transactionForm, order_id: event.target.value })} className={inputClass}><option value="">Not linked</option>{orders.map((order) => <option key={order.id} value={order.id}>{order.order_number}</option>)}</select></Field>
              <Field label="Description"><input maxLength={255} value={transactionForm.description} onChange={(event) => setTransactionForm({ ...transactionForm, description: event.target.value })} className={inputClass} /></Field>
            </div>
            {transactionForm.type === 'income' && <p className="rounded-md bg-blue-50 p-2 text-[10px] text-blue-900">Only record revenue that has been collected/recognized under your accounting policy. Pending COD order value is not realized income.</p>}
            <ModalActions busy={saving} onCancel={() => setTransactionForm(null)} submitLabel={transactionForm.type === 'expense' ? 'Save Expense' : 'Record Revenue'} />
          </form>
        </Modal>
      )}

      {editingOrder && orderForm && (() => {
        const persistedSubtotal = Number(editingOrder.subtotal);
        const persistedCustomerShipping = Number(
          orderForm.customer_shipping_charge !== ''
            ? orderForm.customer_shipping_charge
            : (editingOrder.ozon_flow?.customer_shipping_charge ?? editingOrder.shipment?.customer_shipping_charge ?? 0)
        );
        const persistedCourierCost = Number(
          orderForm.courier_cost !== ''
            ? orderForm.courier_cost
            : (editingOrder.ozon_flow?.courier_cost ?? editingOrder.shipment?.shipping_cost ?? 0)
        );
        const expectedCod = Number(editingOrder.ozon_flow?.expected_cod ?? editingOrder.shipment?.cod_amount ?? editingOrder.total);
        const expectedRemittance = expectedCod - persistedCourierCost;

        const verifiedSales = orderForm.is_reconciled ? Number(orderForm.sales_collected || persistedSubtotal) : 0;
        const verifiedShipping = orderForm.is_reconciled ? Number(orderForm.shipping_collected || persistedCustomerShipping) : 0;
        const verifiedGross = verifiedSales + verifiedShipping;
        const verifiedRemittance = verifiedGross - persistedCourierCost;

        const cogs = Number(orderForm.product_cost_total || 0);
        const otherExp = Number(orderForm.other_expenses || 0) + Number(orderForm.refund_return_cost || 0);
        const liveNetProfit = orderForm.is_reconciled && orderForm.product_cost_total.trim() !== ''
          ? (verifiedRemittance - cogs - otherExp)
          : null;
        const liveMargin = liveNetProfit !== null && verifiedGross > 0
          ? (liveNetProfit / verifiedGross) * 100
          : null;

        return (
          <Modal title={`Order accounting · ${editingOrder.order_number}`} onClose={() => { setEditingOrder(null); setOrderForm(null); }}>
            <form onSubmit={(event) => void saveOrderAccounting(event)} className="space-y-4">
              {/* Single Source of Truth Card (Sales & Orders + Ozon flow) */}
              <div className="rounded-lg border border-[#E2E8F0] bg-slate-50/70 p-3 text-xs">
                <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-2 font-semibold text-[#1E1B4B]">
                  <span className="flex items-center gap-1.5">
                    <Package className="h-4 w-4 text-[#6D28D9]" />
                    Single source of truth (Sales &amp; Orders)
                  </span>
                  <span className="rounded bg-[#F5F3FF] px-2 py-0.5 text-[10px] font-bold text-[#6D28D9]">
                    {editingOrder.ozon_flow?.carrier || editingOrder.shipment?.delivery_company_id || 'Ozon'} {editingOrder.shipment?.tracking_number ? `· ${editingOrder.shipment.tracking_number}` : ''}
                  </span>
                </div>
                <div className="mt-2.5 grid grid-cols-2 gap-2 text-[11px] sm:grid-cols-4">
                  <div>
                    <span className="block text-[#64748B]">Product subtotal</span>
                    <span className="font-semibold text-[#1E1B4B]">{formatMoney(persistedSubtotal, editingOrder.currency)}</span>
                  </div>
                  <div>
                    <span className="block text-[#64748B]">Customer shipping</span>
                    <span className="font-semibold text-[#1E1B4B]">{formatMoney(persistedCustomerShipping, editingOrder.currency)}</span>
                  </div>
                  <div>
                    <span className="block text-[#64748B]">Expected COD (customer total)</span>
                    <span className="font-semibold text-[#1E1B4B]">{formatMoney(expectedCod, editingOrder.currency)}</span>
                  </div>
                  <div>
                    <span className="block text-[#64748B]">Ozon courier fee</span>
                    <span className="font-semibold text-red-700">-{formatMoney(persistedCourierCost, editingOrder.currency)}</span>
                  </div>
                </div>
                <div className="mt-2.5 flex items-center justify-between rounded bg-teal-50 px-2.5 py-1.5 text-[11px] font-medium text-teal-900 border border-teal-200/60">
                  <span>Ozon net remittance flow (COD − Courier fee):</span>
                  <strong className="text-teal-800 font-bold">{formatMoney(expectedRemittance, editingOrder.currency)}</strong>
                </div>
              </div>

              {/* Financial Reconciliation & Ozon Statement Section */}
              <div className="rounded-lg border border-purple-100 bg-[#FAF9FF] p-3 text-xs space-y-2.5">
                <label className="flex items-start gap-2.5 cursor-pointer font-medium text-[#1E1B4B]">
                  <input
                    type="checkbox"
                    checked={orderForm.is_reconciled}
                    onChange={(event) => {
                      const checked = event.target.checked;
                      setOrderForm({
                        ...orderForm,
                        is_reconciled: checked,
                        sales_collected: checked ? (orderForm.sales_collected || String(editingOrder.subtotal)) : '',
                        shipping_collected: checked ? (orderForm.shipping_collected || String(persistedCustomerShipping || '0.00')) : '',
                      });
                    }}
                    className="mt-0.5 rounded text-[#6D28D9] focus:ring-[#6D28D9]"
                  />
                  <div>
                    <span className="font-semibold text-[#1E1B4B]">Reconciled with Ozon statement / Cash verified</span>
                    <span className="block text-[10px] font-normal text-[#64748B]">
                      Confirms customer cash was collected and net remittance was verified against Ozon statement.
                    </span>
                  </div>
                </label>

                {orderForm.is_reconciled ? (
                  <div className="border-t border-purple-100 pt-2 text-[11px] text-[#475569]">
                    <div className="flex items-center justify-between">
                      <span>Verified net payout received from Ozon:</span>
                      <strong className="text-teal-700 font-bold text-xs">{formatMoney(verifiedRemittance, editingOrder.currency)}</strong>
                    </div>
                    <p className="mt-0.5 text-[10px] text-[#64748B]">
                      Gross: {formatMoney(verifiedGross, editingOrder.currency)} (Sales: {formatMoney(verifiedSales, editingOrder.currency)}, Shipping: {formatMoney(verifiedShipping, editingOrder.currency)}) − Courier fee: {formatMoney(persistedCourierCost, editingOrder.currency)}.
                    </p>
                    <button
                      type="button"
                      onClick={() => setOrderForm({ ...orderForm, show_custom_overrides: !orderForm.show_custom_overrides })}
                      className="mt-1.5 text-[10px] font-medium text-[#6D28D9] underline hover:text-[#5B21B6]"
                    >
                      {orderForm.show_custom_overrides ? 'Hide amount adjustments' : 'Adjust verified amounts (if Ozon statement differed)'}
                    </button>
                    {orderForm.show_custom_overrides && (
                      <div className="mt-2 grid gap-2 sm:grid-cols-3 rounded border border-purple-200 bg-white p-2">
                        <Field label="Verified sales collected">
                          <AmountInput value={orderForm.sales_collected} onChange={(value) => setOrderForm({ ...orderForm, sales_collected: value })} currency={editingOrder.currency} />
                        </Field>
                        <Field label="Verified shipping collected">
                          <AmountInput value={orderForm.shipping_collected} onChange={(value) => setOrderForm({ ...orderForm, shipping_collected: value })} currency={editingOrder.currency} />
                        </Field>
                        <Field label="Actual courier cost">
                          <AmountInput value={orderForm.courier_cost} onChange={(value) => setOrderForm({ ...orderForm, courier_cost: value })} currency={editingOrder.currency} />
                        </Field>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-[10px] text-amber-800">
                    Pending verification. Expected COD {formatMoney(expectedCod, editingOrder.currency)} will not be counted as realized revenue until verified against Ozon payout statements.
                  </p>
                )}
              </div>

              {/* Genuinely Missing Information Form Fields */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wide text-[#64748B]">Supply missing cost information</h3>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Production / product cost total (COGS) *">
                    <AmountInput
                      value={orderForm.product_cost_total}
                      onChange={(value) => setOrderForm({ ...orderForm, product_cost_total: value })}
                      currency={editingOrder.currency}
                    />
                  </Field>
                  <Field label="Campaign attribution">
                    <select
                      value={orderForm.campaign_id}
                      onChange={(event) => setOrderForm({ ...orderForm, campaign_id: event.target.value })}
                      className={inputClass}
                    >
                      <option value="">Unattributed</option>
                      {campaigns.map((campaign) => <option key={campaign.id} value={campaign.id}>{campaign.name}</option>)}
                    </select>
                  </Field>
                  <Field label="Other order expenses">
                    <AmountInput
                      value={orderForm.other_expenses}
                      onChange={(value) => setOrderForm({ ...orderForm, other_expenses: value })}
                      currency={editingOrder.currency}
                    />
                  </Field>
                  <Field label="Refund / return costs">
                    <AmountInput
                      value={orderForm.refund_return_cost}
                      onChange={(value) => setOrderForm({ ...orderForm, refund_return_cost: value })}
                      currency={editingOrder.currency}
                    />
                  </Field>
                  <Field label="Partner profit share (%)">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.01"
                      placeholder="e.g. 50"
                      value={orderForm.profit_share_percent}
                      onChange={(event) => setOrderForm({ ...orderForm, profit_share_percent: event.target.value })}
                      className={inputClass}
                    />
                  </Field>
                </div>
              </div>

              {/* Finance Ledger Synchronization */}
              <label className="flex items-start gap-2.5 rounded-lg border border-[#E2E8F0] bg-white p-3 text-xs cursor-pointer">
                <input
                  type="checkbox"
                  disabled={!orderForm.is_reconciled}
                  checked={orderForm.post_to_ledger && orderForm.is_reconciled}
                  onChange={(event) => setOrderForm({ ...orderForm, post_to_ledger: event.target.checked })}
                  className="mt-0.5 rounded text-[#6D28D9] focus:ring-[#6D28D9]"
                />
                <div>
                  <span className="font-semibold text-[#1E1B4B]">Post verified transactions to Finance Ledger</span>
                  <span className="block text-[10px] text-[#64748B]">
                    Posts revenue and recognized expenses to the ledger exactly once. Prevents duplicates and updates P&amp;L.
                    {editingOrder.ledger?.is_posted && ' (Currently posted in ledger)'}
                  </span>
                </div>
              </label>

              {/* Live Net Profit Preview */}
              <div className="rounded-lg border border-[#E2E8F0] bg-[#F8F7FC] p-3 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-[#475569]">Estimated Net Order Profit:</span>
                  <strong className={`text-sm font-bold ${liveNetProfit !== null ? (liveNetProfit >= 0 ? 'text-[#0D9488]' : 'text-red-700') : 'text-[#64748B]'}`}>
                    {liveNetProfit !== null ? formatMoney(liveNetProfit, editingOrder.currency) : 'Incomplete (Enter COGS & verify)'}
                  </strong>
                </div>
                {liveNetProfit !== null && (
                  <div className="mt-1 flex items-center justify-between text-[10px] text-[#64748B]">
                    <span>Net remittance {formatMoney(verifiedRemittance, editingOrder.currency)} − Production cost {formatMoney(cogs, editingOrder.currency)}</span>
                    <span className="font-semibold text-teal-700">Margin: {liveMargin?.toFixed(1)}%</span>
                  </div>
                )}
              </div>

              <ModalActions
                busy={saving}
                onCancel={() => { setEditingOrder(null); setOrderForm(null); }}
                submitLabel="Save Order Accounting"
              />
            </form>
          </Modal>
        );
      })()}
    </main>
  );
};

function Metric({
  icon: Icon,
  label,
  value,
  color,
  tone,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  color: string;
  tone?: 'positive' | 'negative';
}) {
  return (
    <article className="flex min-h-[62px] items-center gap-2.5 rounded-lg border border-[#E2E8F0] bg-white p-2.5 shadow-2xs sm:p-3">
      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${color}`}><Icon className="h-4 w-4" /></span>
      <div className="min-w-0">
        <p className="truncate text-[10px] text-[#64748B]">{label}</p>
        <p className={`mt-0.5 truncate text-sm font-bold ${tone === 'negative' ? 'text-red-700' : tone === 'positive' ? 'text-[#0D9488]' : 'text-[#1E1B4B]'}`}>{value}</p>
      </div>
    </article>
  );
}

function StatementRow({ item, currency }: { item: { label: string; amount: number; kind: string }; currency: string }) {
  return <tr className="border-b border-[#F1F5F9] last:border-0">
    <td className="px-2 py-1.5 text-[#475569]">{item.label}</td>
    <td className={`px-2 py-1.5 text-right font-medium ${item.kind === 'income' ? 'text-[#1E1B4B]' : 'text-[#475569]'}`}>{formatMoney(item.amount, currency)}</td>
  </tr>;
}

function ChartEmpty({ loading }: { loading: boolean }) {
  return <div role="status" className="flex h-28 items-center justify-center rounded-lg bg-slate-50 text-center text-xs text-[#64748B]">{loading ? 'Loading chart data…' : 'No recorded financial data is available for this selection.'}</div>;
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <section role="dialog" aria-modal="true" aria-label={title} className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-xl bg-white p-4 shadow-xl sm:p-5">
      <header className="mb-4 flex items-center justify-between gap-3"><h2 className="text-base font-bold text-[#1E1B4B]">{title}</h2><button type="button" onClick={onClose} aria-label="Close dialog" className="rounded p-1 text-[#64748B] hover:bg-slate-100"><X className="h-4 w-4" /></button></header>
      {children}
    </section>
  </div>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block text-xs font-medium text-[#475569]">{label}<span className="mt-1 block">{children}</span></label>;
}

function AmountInput({ value, onChange, currency }: { value: string; onChange: (value: string) => void; currency: string }) {
  return <span className="relative block"><input type="number" min="0" step="0.01" value={value} onChange={(event) => onChange(event.target.value)} className={`${inputClass} pr-14`} /><span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-[#94A3B8]">{currency}</span></span>;
}

function ModalActions({ busy, onCancel, submitLabel }: { busy: boolean; onCancel: () => void; submitLabel: string }) {
  return <div className="flex justify-end gap-2 border-t border-[#E2E8F0] pt-3">
    <button type="button" onClick={onCancel} disabled={busy} className="rounded-lg border border-[#E2E8F0] px-3 py-2 text-xs font-semibold text-[#475569] disabled:opacity-50">Cancel</button>
    <button type="submit" disabled={busy} className="rounded-lg bg-[#6D28D9] px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">{busy ? 'Saving…' : submitLabel}</button>
  </div>;
}
