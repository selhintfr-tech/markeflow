import React, { useState, useEffect, useMemo } from 'react';
import {
  Building2,
  Megaphone,
  BarChart2,
  Package,
  FileText,
  Calculator,
  Database,
  Percent,
  TrendingUp,
  CheckCircle2,
  AlertCircle,
  Info,
  Plus,
  Download,
  X,
  ChevronDown,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  LabelList,
} from 'recharts';
import { useWorkspace } from '../../context/WorkspaceContext';
import {
  initialCampaignFinancials,
  PROFITABILITY_STORAGE_KEY,
  type CampaignFinancials,
} from './profitabilityData';

export const ProfitabilityPage: React.FC = () => {
  const { currentWorkspace, workspaces, setCurrentWorkspace } = useWorkspace();

  // Load financials from storage or fallback to mock
  const [financialsMap, setFinancialsMap] = useState<Record<string, CampaignFinancials[]>>(() => {
    try {
      const saved = localStorage.getItem(PROFITABILITY_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object') return parsed;
      }
    } catch {
      // ignore
    }
    return initialCampaignFinancials;
  });

  // Save to storage when updated
  useEffect(() => {
    try {
      localStorage.setItem(PROFITABILITY_STORAGE_KEY, JSON.stringify(financialsMap));
    } catch {
      // ignore
    }
  }, [financialsMap]);

  // Current workspace campaigns
  const currentWorkspaceFinancials = useMemo(() => {
    const list = financialsMap[currentWorkspace.id];
    if (list && list.length > 0) return list;
    return initialCampaignFinancials['ws-atlas-retail'] || [];
  }, [financialsMap, currentWorkspace.id]);

  // Selected Campaign ID
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>('camp-1');

  // Derive active campaign ID cleanly
  const activeCampaignId = useMemo(() => {
    if (currentWorkspaceFinancials.length === 0) return 'camp-1';
    const match = currentWorkspaceFinancials.find((c) => c.campaignId === selectedCampaignId);
    return match ? match.campaignId : currentWorkspaceFinancials[0].campaignId;
  }, [currentWorkspaceFinancials, selectedCampaignId]);

  // Current selected campaign
  const currentCampaign = useMemo(() => {
    return (
      currentWorkspaceFinancials.find((c) => c.campaignId === activeCampaignId) ||
      currentWorkspaceFinancials[0] || {
        id: 'fallback',
        campaignId: 'camp-1',
        campaignName: 'Autumn Launch 2026',
        workspaceId: currentWorkspace.id,
        workspaceName: currentWorkspace.name,
        salesRevenue: 13400,
        advertisingSpend: 5400,
        costOfGoodsSold: 4600,
        otherAllocatedExpenses: 1200,
      }
    );
  }, [currentWorkspaceFinancials, activeCampaignId, currentWorkspace]);

  // Dropdown states
  const [workspaceDropdownOpen, setWorkspaceDropdownOpen] = useState(false);
  const [campaignDropdownOpen, setCampaignDropdownOpen] = useState(false);

  // Modals
  const [showAddExpenseModal, setShowAddExpenseModal] = useState(false);
  const [showRecordRevenueModal, setShowRecordRevenueModal] = useState(false);

  // Form states with constant initial date
  const [expenseForm, setExpenseForm] = useState({
    category: 'Advertising Spend' as 'Advertising Spend' | 'Cost of Goods Sold' | 'Other Allocated Expenses',
    amount: '',
    date: '2026-10-15',
    description: '',
  });

  const [revenueForm, setRevenueForm] = useState({
    source: '',
    amount: '',
    date: '2026-10-15',
  });

  const [formError, setFormError] = useState('');

  // Calculations
  const salesRevenue = currentCampaign.salesRevenue || 0;
  const advertisingSpend = currentCampaign.advertisingSpend || 0;
  const costOfGoodsSold = currentCampaign.costOfGoodsSold || 0;
  const otherAllocatedExpenses = currentCampaign.otherAllocatedExpenses || 0;

  const totalRecordedCosts = advertisingSpend + costOfGoodsSold + otherAllocatedExpenses;
  const netProfit = salesRevenue - totalRecordedCosts;
  const profitMargin = salesRevenue > 0 ? (netProfit / salesRevenue) * 100 : 0;
  const roas = advertisingSpend > 0 ? salesRevenue / advertisingSpend : 0;

  // Expense shares
  const adSpendShare = totalRecordedCosts > 0 ? (advertisingSpend / totalRecordedCosts) * 100 : 0;
  const cogsShare = totalRecordedCosts > 0 ? (costOfGoodsSold / totalRecordedCosts) * 100 : 0;
  const otherShare = totalRecordedCosts > 0 ? (otherAllocatedExpenses / totalRecordedCosts) * 100 : 0;

  // Formatting helpers
  const fmt = (num: number) => num.toLocaleString('en-US');
  const fmtSign = (num: number) => (num >= 0 ? `+${fmt(num)}` : `-${fmt(Math.abs(num))}`);

  // Chart data
  const chartData = [
    {
      name: 'Sales Revenue',
      amount: salesRevenue,
      displayAmount: fmt(salesRevenue),
      color: '#6D28D9', // Deep Purple
    },
    {
      name: 'Total Recorded Costs',
      amount: totalRecordedCosts,
      displayAmount: fmt(totalRecordedCosts),
      color: '#A78BFA', // Soft Lavender
    },
    {
      name: 'Net Profit',
      amount: Math.max(0, netProfit),
      displayAmount: fmt(netProfit),
      color: '#0D9488', // Teal
    },
  ];

  // Max value for chart Y-axis domain
  const maxChartVal = Math.max(salesRevenue, totalRecordedCosts, 16000);
  const roundedMaxAxis = Math.ceil(maxChartVal / 2000) * 2000;

  // Handlers
  const handleAddExpenseSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(expenseForm.amount);
    if (isNaN(val) || val <= 0) {
      setFormError('Please enter a valid positive amount in MAD.');
      return;
    }

    setFinancialsMap((prev) => {
      const wsId = currentWorkspace.id;
      const list = prev[wsId] ? [...prev[wsId]] : [...initialCampaignFinancials['ws-atlas-retail']];
      const targetIdx = list.findIndex((c) => c.campaignId === currentCampaign.campaignId);

      if (targetIdx >= 0) {
        const item = { ...list[targetIdx] };
        if (expenseForm.category === 'Advertising Spend') {
          item.advertisingSpend = (item.advertisingSpend || 0) + val;
        } else if (expenseForm.category === 'Cost of Goods Sold') {
          item.costOfGoodsSold = (item.costOfGoodsSold || 0) + val;
        } else {
          item.otherAllocatedExpenses = (item.otherAllocatedExpenses || 0) + val;
        }
        list[targetIdx] = item;
      }
      return { ...prev, [wsId]: list };
    });

    setShowAddExpenseModal(false);
    setExpenseForm({
      category: 'Advertising Spend',
      amount: '',
      date: new Date().toISOString().split('T')[0],
      description: '',
    });
    setFormError('');
  };

  const handleRecordRevenueSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(revenueForm.amount);
    if (isNaN(val) || val <= 0) {
      setFormError('Please enter a valid positive amount in MAD.');
      return;
    }

    setFinancialsMap((prev) => {
      const wsId = currentWorkspace.id;
      const list = prev[wsId] ? [...prev[wsId]] : [...initialCampaignFinancials['ws-atlas-retail']];
      const targetIdx = list.findIndex((c) => c.campaignId === currentCampaign.campaignId);

      if (targetIdx >= 0) {
        const item = { ...list[targetIdx] };
        item.salesRevenue = (item.salesRevenue || 0) + val;
        list[targetIdx] = item;
      }
      return { ...prev, [wsId]: list };
    });

    setShowRecordRevenueModal(false);
    setRevenueForm({
      source: '',
      amount: '',
      date: new Date().toISOString().split('T')[0],
    });
    setFormError('');
  };

  const handleExportReport = () => {
    window.print();
  };

  return (
    <div className="space-y-6 pb-12 max-w-[1400px]">
      {/* 1. Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          {/* Breadcrumb */}
          <div className="flex items-center gap-1.5 text-xs text-[#64748B] mb-1">
            <span>Finance</span>
            <span>/</span>
            <span className="text-[#64748B]">Profitability</span>
          </div>

          <h1 className="text-2xl lg:text-3xl font-extrabold tracking-tight text-[#1E1B4B]">
            Revenue &amp; Profitability
          </h1>
          <p className="text-sm text-[#64748B] mt-1">
            Understand your marketing return using recorded revenue and costs.
          </p>
        </div>

        {/* Top-Right Action Buttons */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            type="button"
            onClick={handleExportReport}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border border-[#E2E8F0] bg-white text-xs font-semibold text-[#1E1B4B] hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-[#6D28D9]" />
            <span>Export Report</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setFormError('');
              setShowAddExpenseModal(true);
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-[#DDD6FE] bg-white text-xs font-semibold text-[#6D28D9] hover:bg-[#F5F3FF] transition-colors shadow-2xs cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Expense</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setFormError('');
              setShowRecordRevenueModal(true);
            }}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#6D28D9] hover:bg-[#5B21B6] text-white text-xs font-semibold shadow-xs hover:shadow-md transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Record Revenue</span>
          </button>
        </div>
      </div>

      {/* 2. Workspace & Campaign Selectors */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* Workspace Selector */}
        <div className="relative">
          <button
            type="button"
            onClick={() => {
              setWorkspaceDropdownOpen(!workspaceDropdownOpen);
              setCampaignDropdownOpen(false);
            }}
            className="inline-flex items-center gap-2.5 px-3.5 py-2 rounded-lg border border-[#E2E8F0] bg-white text-xs font-medium text-[#1E1B4B] hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer"
          >
            <Building2 className="w-4 h-4 text-[#6D28D9]" />
            <span className="font-semibold">{currentWorkspace.name}</span>
            <ChevronDown className="w-3.5 h-3.5 text-[#94A3B8]" />
          </button>

          {workspaceDropdownOpen && (
            <div className="absolute left-0 top-full mt-1.5 w-56 rounded-lg bg-white border border-[#E2E8F0] shadow-lg py-1 z-40">
              {workspaces.map((ws) => (
                <button
                  key={ws.id}
                  type="button"
                  onClick={() => {
                    setCurrentWorkspace(ws);
                    setWorkspaceDropdownOpen(false);
                  }}
                  className={`w-full text-left px-3.5 py-2 text-xs flex items-center gap-2 hover:bg-[#F5F3FF] transition-colors ${
                    currentWorkspace.id === ws.id ? 'text-[#6D28D9] font-bold bg-[#F5F3FF]' : 'text-[#1E1B4B]'
                  }`}
                >
                  <Building2 className="w-3.5 h-3.5 text-[#6D28D9]" />
                  <span>{ws.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Campaign Selector */}
        <div className="relative">
          <button
            type="button"
            onClick={() => {
              setCampaignDropdownOpen(!campaignDropdownOpen);
              setWorkspaceDropdownOpen(false);
            }}
            className="inline-flex items-center gap-2.5 px-3.5 py-2 rounded-lg border border-[#E2E8F0] bg-white text-xs font-medium text-[#1E1B4B] hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer"
          >
            <Megaphone className="w-4 h-4 text-[#6D28D9]" />
            <span className="font-semibold">{currentCampaign.campaignName}</span>
            <ChevronDown className="w-3.5 h-3.5 text-[#94A3B8]" />
          </button>

          {campaignDropdownOpen && (
            <div className="absolute left-0 top-full mt-1.5 w-60 rounded-lg bg-white border border-[#E2E8F0] shadow-lg py-1 z-40">
              {currentWorkspaceFinancials.map((camp) => (
                <button
                  key={camp.campaignId}
                  type="button"
                  onClick={() => {
                    setSelectedCampaignId(camp.campaignId);
                    setCampaignDropdownOpen(false);
                  }}
                  className={`w-full text-left px-3.5 py-2 text-xs flex items-center gap-2 hover:bg-[#F5F3FF] transition-colors ${
                    selectedCampaignId === camp.campaignId
                      ? 'text-[#6D28D9] font-bold bg-[#F5F3FF]'
                      : 'text-[#1E1B4B]'
                  }`}
                >
                  <Megaphone className="w-3.5 h-3.5 text-[#6D28D9]" />
                  <span>{camp.campaignName}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 3. Eight Financial KPI Cards (2 Rows of 4) */}
      <div className="space-y-3">
        {/* Row One */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Sales Revenue */}
          <div className="bg-white rounded-xl border border-[#E2E8F0] p-4 flex items-center gap-3.5 shadow-2xs">
            <div className="w-10 h-10 rounded-lg bg-[#CCFBF1] flex items-center justify-center shrink-0">
              <BarChart2 className="w-5 h-5 text-[#0D9488]" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-[#64748B] font-medium">Sales Revenue</p>
              <p className="text-lg font-bold text-[#1E1B4B] mt-0.5">{fmt(salesRevenue)} MAD</p>
            </div>
          </div>

          {/* Card 2: Advertising Spend */}
          <div className="bg-white rounded-xl border border-[#E2E8F0] p-4 flex items-center gap-3.5 shadow-2xs">
            <div className="w-10 h-10 rounded-lg bg-[#EDE9FE] flex items-center justify-center shrink-0">
              <Megaphone className="w-5 h-5 text-[#6D28D9]" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-[#64748B] font-medium">Advertising Spend</p>
              <p className="text-lg font-bold text-[#1E1B4B] mt-0.5">{fmt(advertisingSpend)} MAD</p>
            </div>
          </div>

          {/* Card 3: Cost of Goods Sold */}
          <div className="bg-white rounded-xl border border-[#E2E8F0] p-4 flex items-center gap-3.5 shadow-2xs">
            <div className="w-10 h-10 rounded-lg bg-[#EDE9FE] flex items-center justify-center shrink-0">
              <Package className="w-5 h-5 text-[#6D28D9]" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-[#64748B] font-medium">Cost of Goods Sold</p>
              <p className="text-lg font-bold text-[#1E1B4B] mt-0.5">{fmt(costOfGoodsSold)} MAD</p>
            </div>
          </div>

          {/* Card 4: Other Allocated Expenses */}
          <div className="bg-white rounded-xl border border-[#E2E8F0] p-4 flex items-center gap-3.5 shadow-2xs">
            <div className="w-10 h-10 rounded-lg bg-[#EDE9FE] flex items-center justify-center shrink-0">
              <FileText className="w-5 h-5 text-[#6D28D9]" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-[#64748B] font-medium">Other Allocated Expenses</p>
              <p className="text-lg font-bold text-[#1E1B4B] mt-0.5">{fmt(otherAllocatedExpenses)} MAD</p>
            </div>
          </div>
        </div>

        {/* Row Two */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 5: Total Recorded Costs */}
          <div className="bg-white rounded-xl border border-[#E2E8F0] p-4 flex items-center gap-3.5 shadow-2xs">
            <div className="w-10 h-10 rounded-lg bg-[#EDE9FE] flex items-center justify-center shrink-0">
              <Calculator className="w-5 h-5 text-[#6D28D9]" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-[#64748B] font-medium">Total Recorded Costs</p>
              <p className="text-lg font-bold text-[#1E1B4B] mt-0.5">{fmt(totalRecordedCosts)} MAD</p>
            </div>
          </div>

          {/* Card 6: Estimated Net Campaign Profit */}
          <div className="bg-white rounded-xl border border-[#E2E8F0] p-4 flex items-center gap-3.5 shadow-2xs">
            <div className="w-10 h-10 rounded-lg bg-[#CCFBF1] flex items-center justify-center shrink-0">
              <Database className="w-5 h-5 text-[#0D9488]" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-[#64748B] font-medium">Estimated Net Campaign Profit</p>
              <p
                className={`text-lg font-bold mt-0.5 ${
                  netProfit >= 0 ? 'text-[#059669]' : 'text-red-600'
                }`}
              >
                {fmtSign(netProfit)} MAD
              </p>
            </div>
          </div>

          {/* Card 7: Profit Margin */}
          <div className="bg-white rounded-xl border border-[#E2E8F0] p-4 flex items-center gap-3.5 shadow-2xs">
            <div className="w-10 h-10 rounded-lg bg-[#CCFBF1] flex items-center justify-center shrink-0">
              <Percent className="w-5 h-5 text-[#0D9488]" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-[#64748B] font-medium">Profit Margin</p>
              <p
                className={`text-lg font-bold mt-0.5 ${
                  profitMargin >= 0 ? 'text-[#059669]' : 'text-red-600'
                }`}
              >
                {profitMargin.toFixed(1)}%
              </p>
            </div>
          </div>

          {/* Card 8: ROAS */}
          <div className="bg-white rounded-xl border border-[#E2E8F0] p-4 flex items-center gap-3.5 shadow-2xs">
            <div className="w-10 h-10 rounded-lg bg-[#CCFBF1] flex items-center justify-center shrink-0">
              <TrendingUp className="w-5 h-5 text-[#0D9488]" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-[#64748B] font-medium">ROAS</p>
              <p className="text-lg font-bold text-[#059669] mt-0.5">{roas.toFixed(2)}×</p>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Profitability Status Banner */}
      <div
        className={`w-full rounded-xl border px-4 py-3 flex items-center gap-2.5 transition-all ${
          netProfit > 0
            ? 'bg-[#E6F4EA] border-[#A7F3D0] text-[#065F46]'
            : netProfit === 0
            ? 'bg-[#F1F5F9] border-[#CBD5E1] text-[#334155]'
            : 'bg-[#FEF2F2] border-[#FECACA] text-[#991B1B]'
        }`}
      >
        {netProfit > 0 ? (
          <CheckCircle2 className="w-5 h-5 text-[#059669] shrink-0" />
        ) : (
          <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
        )}
        <span className="text-xs sm:text-sm font-semibold">
          {netProfit > 0
            ? 'Profitable based on recorded data'
            : netProfit === 0
            ? 'Break-even based on recorded data'
            : 'Operating at a loss based on recorded data'}
        </span>
      </div>

      {/* 5. Main Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column (5 Cols / 6 Cols): Profit and Loss Statement */}
        <div className="lg:col-span-6 bg-white rounded-xl border border-[#E2E8F0] p-6 shadow-2xs">
          <div className="mb-4">
            <h2 className="text-base font-bold text-[#1E1B4B]">Profit and Loss Statement</h2>
            <p className="text-xs text-[#64748B] mt-0.5">
              Based on recorded revenue and expenses for {currentCampaign.campaignName}.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-[#E2E8F0] text-[#64748B]">
                  <th className="py-2.5 text-left font-semibold">Item</th>
                  <th className="py-2.5 text-right font-semibold">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F8FAFC]">
                {/* Section: Revenue */}
                <tr className="bg-[#F5F3FF]">
                  <td colSpan={2} className="py-2 px-2.5 font-bold text-[#6D28D9]">
                    Revenue
                  </td>
                </tr>
                <tr>
                  <td className="py-2.5 px-2.5 text-[#1E1B4B]">Sales Revenue</td>
                  <td className="py-2.5 px-2.5 text-right font-bold text-[#1E1B4B]">
                    {fmt(salesRevenue)} MAD
                  </td>
                </tr>

                {/* Section: Costs */}
                <tr className="bg-[#F5F3FF]">
                  <td colSpan={2} className="py-2 px-2.5 font-bold text-[#6D28D9]">
                    Costs
                  </td>
                </tr>
                <tr>
                  <td className="py-2.5 px-2.5 text-[#1E1B4B]">Advertising Spend</td>
                  <td className="py-2.5 px-2.5 text-right font-medium text-[#1E1B4B]">
                    {fmt(advertisingSpend)} MAD
                  </td>
                </tr>
                <tr>
                  <td className="py-2.5 px-2.5 text-[#1E1B4B]">Cost of Goods Sold</td>
                  <td className="py-2.5 px-2.5 text-right font-medium text-[#1E1B4B]">
                    {fmt(costOfGoodsSold)} MAD
                  </td>
                </tr>
                <tr>
                  <td className="py-2.5 px-2.5 text-[#1E1B4B]">Other Allocated Expenses</td>
                  <td className="py-2.5 px-2.5 text-right font-medium text-[#1E1B4B]">
                    {fmt(otherAllocatedExpenses)} MAD
                  </td>
                </tr>
                <tr className="border-t border-[#E2E8F0]">
                  <td className="py-2.5 px-2.5 font-bold text-[#6D28D9]">Total Recorded Costs</td>
                  <td className="py-2.5 px-2.5 text-right font-bold text-[#6D28D9]">
                    {fmt(totalRecordedCosts)} MAD
                  </td>
                </tr>

                {/* Section: Profitability */}
                <tr className="bg-[#F5F3FF]">
                  <td colSpan={2} className="py-2 px-2.5 font-bold text-[#6D28D9]">
                    Profitability
                  </td>
                </tr>
                <tr>
                  <td className="py-2.5 px-2.5 text-[#1E1B4B]">Estimated Net Campaign Profit</td>
                  <td
                    className={`py-2.5 px-2.5 text-right font-bold ${
                      netProfit >= 0 ? 'text-[#059669]' : 'text-red-600'
                    }`}
                  >
                    {fmtSign(netProfit)} MAD
                  </td>
                </tr>
                <tr>
                  <td className="py-2.5 px-2.5 text-[#1E1B4B]">Profit Margin</td>
                  <td
                    className={`py-2.5 px-2.5 text-right font-bold ${
                      profitMargin >= 0 ? 'text-[#059669]' : 'text-red-600'
                    }`}
                  >
                    {profitMargin.toFixed(1)}%
                  </td>
                </tr>
                <tr>
                  <td className="py-2.5 px-2.5 text-[#1E1B4B]">ROAS</td>
                  <td className="py-2.5 px-2.5 text-right font-bold text-[#059669]">
                    {roas.toFixed(2)}×
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Column (6 Cols): Stack of Chart + Breakdown */}
        <div className="lg:col-span-6 space-y-6">
          {/* Card 1: Revenue vs. Costs Chart */}
          <div className="bg-white rounded-xl border border-[#E2E8F0] p-6 shadow-2xs">
            <div className="mb-4">
              <h2 className="text-base font-bold text-[#1E1B4B]">Revenue vs. Costs</h2>
              <p className="text-xs text-[#64748B] mt-0.5">
                Comparison for {currentCampaign.campaignName}.
              </p>
            </div>

            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={chartData}
                  margin={{ top: 25, right: 20, left: 20, bottom: 5 }}
                  barSize={60}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 11, fill: '#64748B', fontWeight: 500 }}
                    axisLine={{ stroke: '#E2E8F0' }}
                    tickLine={false}
                  />
                  <YAxis
                    domain={[0, roundedMaxAxis]}
                    tick={{ fontSize: 10, fill: '#64748B' }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => v.toLocaleString()}
                    label={{
                      value: 'Amount (MAD)',
                      angle: -90,
                      position: 'insideLeft',
                      offset: -10,
                      style: { fontSize: 10, fill: '#94A3B8' },
                    }}
                  />
                  <Tooltip
                    cursor={{ fill: 'transparent' }}
                    contentStyle={{
                      backgroundColor: '#FFFFFF',
                      border: '1px solid #E2E8F0',
                      borderRadius: '8px',
                      fontSize: '12px',
                      color: '#1E1B4B',
                    }}
                    formatter={(val: any) => [`${fmt(Number(val))} MAD`, 'Amount']}
                  />
                  <Bar dataKey="amount" radius={[4, 4, 0, 0]}>
                    <LabelList
                      dataKey="displayAmount"
                      position="top"
                      style={{ fontSize: 11, fontWeight: 700, fill: '#1E1B4B' }}
                    />
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Card 2: Expense Breakdown */}
          <div className="bg-white rounded-xl border border-[#E2E8F0] p-6 shadow-2xs">
            <div className="mb-4">
              <h2 className="text-base font-bold text-[#1E1B4B]">Expense Breakdown</h2>
              <p className="text-xs text-[#64748B] mt-0.5">
                Share of total recorded costs ({fmt(totalRecordedCosts)} MAD).
              </p>
            </div>

            <div className="space-y-4">
              {/* Row 1: Advertising Spend */}
              <div className="flex items-center gap-3 text-xs">
                <div className="w-7 h-7 rounded-lg bg-[#EDE9FE] flex items-center justify-center shrink-0">
                  <Megaphone className="w-3.5 h-3.5 text-[#6D28D9]" />
                </div>
                <span className="text-[#1E1B4B] font-medium w-36 truncate">
                  Advertising Spend
                </span>
                <span className="font-bold text-[#1E1B4B] w-20 text-right shrink-0">
                  {fmt(advertisingSpend)} MAD
                </span>
                <div className="flex-1 bg-[#F1F5F9] h-2.5 rounded-full overflow-hidden mx-1">
                  <div
                    className="bg-[#6D28D9] h-full rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, Math.max(0, adSpendShare))}%` }}
                  />
                </div>
                <span className="text-[#64748B] font-semibold w-12 text-right shrink-0">
                  {adSpendShare.toFixed(1)}%
                </span>
              </div>

              {/* Row 2: Cost of Goods Sold */}
              <div className="flex items-center gap-3 text-xs">
                <div className="w-7 h-7 rounded-lg bg-[#EDE9FE] flex items-center justify-center shrink-0">
                  <Package className="w-3.5 h-3.5 text-[#6D28D9]" />
                </div>
                <span className="text-[#1E1B4B] font-medium w-36 truncate">
                  Cost of Goods Sold
                </span>
                <span className="font-bold text-[#1E1B4B] w-20 text-right shrink-0">
                  {fmt(costOfGoodsSold)} MAD
                </span>
                <div className="flex-1 bg-[#F1F5F9] h-2.5 rounded-full overflow-hidden mx-1">
                  <div
                    className="bg-[#A78BFA] h-full rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, Math.max(0, cogsShare))}%` }}
                  />
                </div>
                <span className="text-[#64748B] font-semibold w-12 text-right shrink-0">
                  {cogsShare.toFixed(1)}%
                </span>
              </div>

              {/* Row 3: Other Allocated Expenses */}
              <div className="flex items-center gap-3 text-xs">
                <div className="w-7 h-7 rounded-lg bg-[#EDE9FE] flex items-center justify-center shrink-0">
                  <FileText className="w-3.5 h-3.5 text-[#6D28D9]" />
                </div>
                <span className="text-[#1E1B4B] font-medium w-36 truncate">
                  Other Allocated Expenses
                </span>
                <span className="font-bold text-[#1E1B4B] w-20 text-right shrink-0">
                  {fmt(otherAllocatedExpenses)} MAD
                </span>
                <div className="flex-1 bg-[#F1F5F9] h-2.5 rounded-full overflow-hidden mx-1">
                  <div
                    className="bg-[#C4B5FD] h-full rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, Math.max(0, otherShare))}%` }}
                  />
                </div>
                <span className="text-[#64748B] font-semibold w-12 text-right shrink-0">
                  {otherShare.toFixed(1)}%
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 6. Footer Note Card */}
      <div className="bg-white rounded-xl border border-[#E2E8F0] p-4 shadow-2xs flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-[#EDE9FE] flex items-center justify-center shrink-0">
          <Info className="w-4 h-4 text-[#6D28D9]" />
        </div>
        <div className="text-xs">
          <span className="font-bold text-[#1E1B4B] mr-1.5">Note</span>
          <span className="text-[#64748B]">
            {netProfit >= 0
              ? `Revenue exceeds recorded costs by ${fmt(netProfit)} MAD. Final accuracy depends on complete cost and revenue entries.`
              : `Recorded costs exceed revenue by ${fmt(Math.abs(netProfit))} MAD. Final accuracy depends on complete cost and revenue entries.`}
          </span>
        </div>
      </div>

      {/* MODAL 1: Add Expense Modal */}
      {showAddExpenseModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md shadow-xl overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-[#E2E8F0]">
              <div className="flex items-center gap-2">
                <Plus className="w-4 h-4 text-[#6D28D9]" />
                <h3 className="text-sm font-bold text-[#1E1B4B]">Add Expense</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAddExpenseModal(false)}
                className="p-1 rounded hover:bg-[#F1F5F9] transition-colors cursor-pointer"
              >
                <X className="w-4 h-4 text-[#64748B]" />
              </button>
            </div>

            <form onSubmit={handleAddExpenseSubmit} className="p-5 space-y-4 text-xs">
              {formError && (
                <div className="p-2.5 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs">
                  {formError}
                </div>
              )}

              <div>
                <label className="block font-semibold text-[#1E1B4B] mb-1">Campaign</label>
                <input
                  type="text"
                  disabled
                  value={currentCampaign.campaignName}
                  className="w-full px-3 py-2 rounded-lg border border-[#E2E8F0] bg-slate-50 text-[#64748B]"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#1E1B4B] mb-1">Expense Category *</label>
                <select
                  value={expenseForm.category}
                  onChange={(e) =>
                    setExpenseForm({
                      ...expenseForm,
                      category: e.target.value as any,
                    })
                  }
                  className="w-full px-3 py-2 rounded-lg border border-[#E2E8F0] bg-white text-[#1E1B4B] focus:ring-2 focus:ring-[#6D28D9] focus:outline-none"
                >
                  <option value="Advertising Spend">Advertising Spend</option>
                  <option value="Cost of Goods Sold">Cost of Goods Sold</option>
                  <option value="Other Allocated Expenses">Other Allocated Expenses</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-[#1E1B4B] mb-1">Amount (MAD) *</label>
                <input
                  type="number"
                  step="any"
                  min="0.01"
                  required
                  placeholder="e.g. 1500"
                  value={expenseForm.amount}
                  onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-[#E2E8F0] bg-white text-[#1E1B4B] focus:ring-2 focus:ring-[#6D28D9] focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#1E1B4B] mb-1">Date</label>
                <input
                  type="date"
                  value={expenseForm.date}
                  onChange={(e) => setExpenseForm({ ...expenseForm, date: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-[#E2E8F0] bg-white text-[#1E1B4B] focus:ring-2 focus:ring-[#6D28D9] focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#1E1B4B] mb-1">Description</label>
                <input
                  type="text"
                  placeholder="e.g. Influencer creative licensing"
                  value={expenseForm.description}
                  onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-[#E2E8F0] bg-white text-[#1E1B4B] focus:ring-2 focus:ring-[#6D28D9] focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#F1F5F9]">
                <button
                  type="button"
                  onClick={() => setShowAddExpenseModal(false)}
                  className="px-3.5 py-2 rounded-lg border border-[#E2E8F0] bg-white text-xs font-semibold text-[#64748B] hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-[#6D28D9] hover:bg-[#5B21B6] text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                >
                  Save Expense
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Record Revenue Modal */}
      {showRecordRevenueModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md shadow-xl overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-[#E2E8F0]">
              <div className="flex items-center gap-2">
                <Plus className="w-4 h-4 text-[#6D28D9]" />
                <h3 className="text-sm font-bold text-[#1E1B4B]">Record Revenue</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowRecordRevenueModal(false)}
                className="p-1 rounded hover:bg-[#F1F5F9] transition-colors cursor-pointer"
              >
                <X className="w-4 h-4 text-[#64748B]" />
              </button>
            </div>

            <form onSubmit={handleRecordRevenueSubmit} className="p-5 space-y-4 text-xs">
              {formError && (
                <div className="p-2.5 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs">
                  {formError}
                </div>
              )}

              <div>
                <label className="block font-semibold text-[#1E1B4B] mb-1">Campaign</label>
                <input
                  type="text"
                  disabled
                  value={currentCampaign.campaignName}
                  className="w-full px-3 py-2 rounded-lg border border-[#E2E8F0] bg-slate-50 text-[#64748B]"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#1E1B4B] mb-1">
                  Revenue Source / Description *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. E-Commerce Sales Batch 2"
                  value={revenueForm.source}
                  onChange={(e) => setRevenueForm({ ...revenueForm, source: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-[#E2E8F0] bg-white text-[#1E1B4B] focus:ring-2 focus:ring-[#6D28D9] focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#1E1B4B] mb-1">Amount (MAD) *</label>
                <input
                  type="number"
                  step="any"
                  min="0.01"
                  required
                  placeholder="e.g. 5000"
                  value={revenueForm.amount}
                  onChange={(e) => setRevenueForm({ ...revenueForm, amount: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-[#E2E8F0] bg-white text-[#1E1B4B] focus:ring-2 focus:ring-[#6D28D9] focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#1E1B4B] mb-1">Date</label>
                <input
                  type="date"
                  value={revenueForm.date}
                  onChange={(e) => setRevenueForm({ ...revenueForm, date: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-[#E2E8F0] bg-white text-[#1E1B4B] focus:ring-2 focus:ring-[#6D28D9] focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#F1F5F9]">
                <button
                  type="button"
                  onClick={() => setShowRecordRevenueModal(false)}
                  className="px-3.5 py-2 rounded-lg border border-[#E2E8F0] bg-white text-xs font-semibold text-[#64748B] hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-[#6D28D9] hover:bg-[#5B21B6] text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                >
                  Save Revenue
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
