import React, { useState, useMemo } from 'react';
import {
  Download,
  Plus,
  Building2,
  Folder,
  Megaphone,
  Calendar,
  BarChart3,
  PieChart,
  TrendingUp,
  ChevronRight,
  ChevronDown,
  Package,
  Wallet,
  Percent,
  ArrowRight,
  Search,
  MoreHorizontal,
  Printer,
  Box,
  Truck,
  Monitor,
  User,
  Globe,
  Share2,
  X,
  Check,
  AlertCircle,
  Trash2,
  Edit,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import {
  initialBudgetSnapshot,
  cumulativeSpendData,
  periodSpendData,
  initialExpenseCategories,
  initialExpenseLedger,
} from '../../data/mock';
import type {
  ExpenseItem,
  ExpenseCategory,
  ExpenseCategorySummary,
  BudgetFinancialSnapshot,
} from '../../types';

export const BudgetExpensesPage: React.FC = () => {
  const navigate = useNavigate();

  // Snapshot State
  const [snapshot] = useState<BudgetFinancialSnapshot>(initialBudgetSnapshot);
  const [expenses, setExpenses] = useState<ExpenseItem[]>(initialExpenseLedger);

  // Global Filter Selectors
  const [selectedWorkspace, setSelectedWorkspace] = useState('Atlas Retail SARL');
  const [selectedProject, setSelectedProject] = useState('Autumn Sales Growth');
  const [selectedCampaign, setSelectedCampaign] = useState('Autumn Launch 2026');
  const [selectedPeriod, setSelectedPeriod] = useState('October 2026');

  // Chart view mode: Cumulative vs Periodic
  const [chartMode, setChartMode] = useState<'Cumulative' | 'Periodic'>('Cumulative');
  const [isChartDropdownOpen, setIsChartDropdownOpen] = useState(false);

  // Table filters & sorting
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('All categories');
  const [selectedTeamMemberFilter, setSelectedTeamMemberFilter] = useState('All team members');
  const [sortOption, setSortOption] = useState<'newest' | 'oldest' | 'highest' | 'lowest'>('newest');

  // Modals & Feedback
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [activeExpense, setActiveExpense] = useState<ExpenseItem | null>(null);
  const [menuOpenExpenseId, setMenuOpenExpenseId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Form State for Add / Edit
  const [formData, setFormData] = useState({
    date: '15 Oct 2026',
    category: 'Advertising' as ExpenseCategory,
    expenseType: 'Meta Ads',
    description: '',
    linkedCampaign: 'Autumn Launch 2026',
    linkedProject: 'Autumn Sales Growth',
    amount: '',
    recordedByName: 'Sara El Amrani',
    recordedByInitials: 'SE',
  });
  const [formError, setFormError] = useState('');

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Derived financial values
  const plannedBudget = snapshot.plannedBudget; // 7,500
  const actualSpend = snapshot.actualSpend;     // 5,400
  const remainingBudget = plannedBudget - actualSpend; // 2,100
  const budgetUtilization = Math.round((actualSpend / plannedBudget) * 100); // 72%

  // Filtered & Sorted Expenses
  const filteredExpenses = useMemo(() => {
    return expenses
      .filter((exp) => {
        const matchesSearch =
          exp.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
          exp.expenseType.toLowerCase().includes(searchQuery.toLowerCase()) ||
          exp.recordedBy.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (exp.linkedCampaign && exp.linkedCampaign.toLowerCase().includes(searchQuery.toLowerCase()));

        const matchesCategory =
          selectedCategoryFilter === 'All categories' || exp.category === selectedCategoryFilter;

        const matchesTeam =
          selectedTeamMemberFilter === 'All team members' ||
          exp.recordedBy.name === selectedTeamMemberFilter;

        return matchesSearch && matchesCategory && matchesTeam;
      })
      .sort((a, b) => {
        if (sortOption === 'newest') {
          return new Date(b.date).getTime() - new Date(a.date).getTime();
        }
        if (sortOption === 'oldest') {
          return new Date(a.date).getTime() - new Date(b.date).getTime();
        }
        if (sortOption === 'highest') {
          return b.amount - a.amount;
        }
        if (sortOption === 'lowest') {
          return a.amount - b.amount;
        }
        return 0;
      });
  }, [expenses, searchQuery, selectedCategoryFilter, selectedTeamMemberFilter, sortOption]);

  // Grouped expenses for categorized table presentation
  const groupedExpenses = useMemo(() => {
    const categories: ExpenseCategory[] = [
      'Advertising',
      'Cost of Goods',
      'Other Operating Expenses',
    ];

    if (selectedCategoryFilter !== 'All categories') {
      return [{
        category: selectedCategoryFilter as ExpenseCategory,
        items: filteredExpenses,
      }];
    }

    return categories
      .map((cat) => ({
        category: cat,
        items: filteredExpenses.filter((e) => e.category === cat),
      }))
      .filter((group) => group.items.length > 0);
  }, [filteredExpenses, selectedCategoryFilter]);

  // Reset form
  const handleOpenAdd = () => {
    setFormData({
      date: '28 Oct 2026',
      category: 'Advertising',
      expenseType: 'Meta Ads',
      description: '',
      linkedCampaign: 'Autumn Launch 2026',
      linkedProject: 'Autumn Sales Growth',
      amount: '',
      recordedByName: 'Sara El Amrani',
      recordedByInitials: 'SE',
    });
    setFormError('');
    setIsAddModalOpen(true);
  };

  const handleOpenEdit = (exp: ExpenseItem) => {
    setActiveExpense(exp);
    setFormData({
      date: exp.date,
      category: exp.category,
      expenseType: exp.expenseType,
      description: exp.description,
      linkedCampaign: exp.linkedCampaign || 'None',
      linkedProject: exp.linkedProject || 'Autumn Sales Growth',
      amount: exp.amount.toString(),
      recordedByName: exp.recordedBy.name,
      recordedByInitials: exp.recordedBy.initials,
    });
    setFormError('');
    setMenuOpenExpenseId(null);
    setIsEditModalOpen(true);
  };

  const handleOpenDetail = (exp: ExpenseItem) => {
    setActiveExpense(exp);
    setMenuOpenExpenseId(null);
    setIsDetailModalOpen(true);
  };

  const handleSaveAdd = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseFloat(formData.amount);
    if (!formData.description.trim()) {
      setFormError('Please enter a description for the expense.');
      return;
    }
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setFormError('Please enter a valid positive amount.');
      return;
    }

    const newExpense: ExpenseItem = {
      id: `exp-${Date.now()}`,
      date: formData.date,
      category: formData.category,
      expenseType: formData.expenseType,
      description: formData.description.trim(),
      linkedCampaign: formData.linkedCampaign === 'None' ? undefined : formData.linkedCampaign,
      linkedProject: formData.linkedProject,
      amount: parsedAmount,
      recordedBy: {
        name: formData.recordedByName,
        initials: formData.recordedByInitials,
        avatarBg: 'bg-[#EDE9FE]',
        avatarColor: 'text-[#6D28D9]',
      },
    };

    setExpenses([newExpense, ...expenses]);
    setIsAddModalOpen(false);
    showToast('New expense recorded successfully.');
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeExpense) return;
    const parsedAmount = parseFloat(formData.amount);
    if (!formData.description.trim()) {
      setFormError('Please enter a description for the expense.');
      return;
    }
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setFormError('Please enter a valid positive amount.');
      return;
    }

    setExpenses((prev) =>
      prev.map((item) =>
        item.id === activeExpense.id
          ? {
              ...item,
              date: formData.date,
              category: formData.category,
              expenseType: formData.expenseType,
              description: formData.description.trim(),
              linkedCampaign: formData.linkedCampaign === 'None' ? undefined : formData.linkedCampaign,
              linkedProject: formData.linkedProject,
              amount: parsedAmount,
              recordedBy: {
                name: formData.recordedByName,
                initials: formData.recordedByInitials,
                avatarBg: 'bg-[#EDE9FE]',
                avatarColor: 'text-[#6D28D9]',
              },
            }
          : item
      )
    );
    setIsEditModalOpen(false);
    showToast('Expense updated successfully.');
  };

  const handleDeleteExpense = (id: string) => {
    setExpenses((prev) => prev.filter((item) => item.id !== id));
    setDeleteConfirmId(null);
    setMenuOpenExpenseId(null);
    showToast('Expense removed from ledger.');
  };

  // CSV Export
  const handleExportCSV = () => {
    const headers = ['Date', 'Expense Type', 'Description', 'Category', 'Linked Campaign', 'Amount (MAD)', 'Recorded By'];
    const rows = filteredExpenses.map((exp) => [
      `"${exp.date}"`,
      `"${exp.expenseType}"`,
      `"${exp.description.replace(/"/g, '""')}"`,
      `"${exp.category}"`,
      `"${exp.linkedCampaign || 'None'}"`,
      exp.amount,
      `"${exp.recordedBy.name}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `marketflow-expenses-${selectedPeriod.replace(/\s+/g, '-').toLowerCase()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Expenses exported to CSV.');
  };

  // Type Icon helper
  const getExpenseTypeIcon = (type: string) => {
    const lower = type.toLowerCase();
    if (lower.includes('meta')) return <Share2 className="w-3.5 h-3.5 text-[#0081FB]" />;
    if (lower.includes('google')) return <Globe className="w-3.5 h-3.5 text-[#EA4335]" />;
    if (lower.includes('printing')) return <Printer className="w-3.5 h-3.5 text-[#6D28D9]" />;
    if (lower.includes('samples') || lower.includes('product')) return <Box className="w-3.5 h-3.5 text-[#6D28D9]" />;
    if (lower.includes('delivery') || lower.includes('logistics')) return <Truck className="w-3.5 h-3.5 text-[#6D28D9]" />;
    if (lower.includes('software') || lower.includes('tools')) return <Monitor className="w-3.5 h-3.5 text-[#6D28D9]" />;
    if (lower.includes('freelancer')) return <User className="w-3.5 h-3.5 text-[#6D28D9]" />;
    return <Package className="w-3.5 h-3.5 text-[#6D28D9]" />;
  };

  const chartData = chartMode === 'Cumulative' ? cumulativeSpendData : periodSpendData;

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto pb-12 font-sans text-[#1E1B4B]">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#1E1B4B] text-white px-4 py-2.5 rounded-lg shadow-xl text-sm flex items-center gap-2 border border-slate-700 animate-fade-in">
          <Check className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-xs text-[#64748B]">
        <span className="hover:text-[#1E1B4B] cursor-pointer" onClick={() => navigate('/')}>
          Finance
        </span>
        <span>/</span>
        <span className="text-[#1E1B4B] font-medium">Budget & Expenses</span>
      </div>

      {/* Page Title & Primary Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-extrabold tracking-tight text-[#1E1B4B]">
            Budget & Expenses
          </h1>
          <p className="text-sm text-[#64748B] mt-1">
            Track planned budgets, advertising spend and operating expenses.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={handleExportCSV}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-white border border-[#E2E8F0] text-[#6D28D9] hover:bg-[#F5F3FF] hover:border-[#DDD6FE] text-sm font-semibold shadow-2xs transition-colors"
          >
            <Download className="w-4 h-4 stroke-[2.2]" />
            <span>Export CSV</span>
          </button>

          <button
            type="button"
            onClick={handleOpenAdd}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-[#6D28D9] hover:bg-[#5B21B6] text-white text-sm font-semibold shadow-2xs transition-colors"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Add Expense</span>
          </button>
        </div>
      </div>

      {/* Global Filter Row (4 Selectors) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Selector 1 — Workspace */}
        <div className="relative">
          <div className="bg-white rounded-xl border border-[#E2E8F0] px-3.5 py-2.5 flex items-center justify-between shadow-2xs hover:border-[#CBD5E1] transition-colors">
            <div className="flex items-center gap-2.5 min-w-0">
              <Building2 className="w-4 h-4 text-[#64748B] shrink-0" />
              <select
                value={selectedWorkspace}
                onChange={(e) => setSelectedWorkspace(e.target.value)}
                className="w-full bg-transparent text-sm font-medium text-[#1E1B4B] focus:outline-none appearance-none cursor-pointer truncate pr-4"
              >
                <option value="Atlas Retail SARL">Atlas Retail SARL</option>
                <option value="Maroc E-Commerce Group">Maroc E-Commerce Group</option>
                <option value="Growth Marketing Agency">Growth Marketing Agency</option>
              </select>
            </div>
            <ChevronDown className="w-4 h-4 text-[#94A3B8] shrink-0 pointer-events-none" />
          </div>
        </div>

        {/* Selector 2 — Project */}
        <div className="relative">
          <div className="bg-white rounded-xl border border-[#E2E8F0] px-3.5 py-2.5 flex items-center justify-between shadow-2xs hover:border-[#CBD5E1] transition-colors">
            <div className="flex items-center gap-2.5 min-w-0">
              <Folder className="w-4 h-4 text-[#64748B] shrink-0" />
              <select
                value={selectedProject}
                onChange={(e) => setSelectedProject(e.target.value)}
                className="w-full bg-transparent text-sm font-medium text-[#1E1B4B] focus:outline-none appearance-none cursor-pointer truncate pr-4"
              >
                <option value="Autumn Sales Growth">Autumn Sales Growth</option>
                <option value="Brand Identity Refresh">Brand Identity Refresh</option>
                <option value="Digital Acquisition Push">Digital Acquisition Push</option>
              </select>
            </div>
            <ChevronDown className="w-4 h-4 text-[#94A3B8] shrink-0 pointer-events-none" />
          </div>
        </div>

        {/* Selector 3 — Campaign */}
        <div className="relative">
          <div className="bg-white rounded-xl border border-[#E2E8F0] px-3.5 py-2.5 flex items-center justify-between shadow-2xs hover:border-[#CBD5E1] transition-colors">
            <div className="flex items-center gap-2.5 min-w-0">
              <Megaphone className="w-4 h-4 text-[#64748B] shrink-0" />
              <select
                value={selectedCampaign}
                onChange={(e) => setSelectedCampaign(e.target.value)}
                className="w-full bg-transparent text-sm font-medium text-[#1E1B4B] focus:outline-none appearance-none cursor-pointer truncate pr-4"
              >
                <option value="Autumn Launch 2026">Autumn Launch 2026</option>
                <option value="Holiday Season Push">Holiday Season Push</option>
                <option value="Brand Awareness Q4">Brand Awareness Q4</option>
                <option value="October Retargeting">October Retargeting</option>
              </select>
            </div>
            <ChevronDown className="w-4 h-4 text-[#94A3B8] shrink-0 pointer-events-none" />
          </div>
        </div>

        {/* Selector 4 — Reporting Period */}
        <div className="relative">
          <div className="bg-white rounded-xl border border-[#E2E8F0] px-3.5 py-2.5 flex items-center justify-between shadow-2xs hover:border-[#CBD5E1] transition-colors">
            <div className="flex items-center gap-2.5 min-w-0">
              <Calendar className="w-4 h-4 text-[#64748B] shrink-0" />
              <select
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
                className="w-full bg-transparent text-sm font-medium text-[#1E1B4B] focus:outline-none appearance-none cursor-pointer truncate pr-4"
              >
                <option value="October 2026">October 2026</option>
                <option value="September 2026">September 2026</option>
                <option value="August 2026">August 2026</option>
              </select>
            </div>
            <ChevronDown className="w-4 h-4 text-[#94A3B8] shrink-0 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Financial KPI Cards (4 equal-width cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Planned Advertising Budget */}
        <div className="bg-white rounded-xl border border-[#E2E8F0] p-4.5 shadow-2xs flex flex-col justify-between hover:shadow-xs transition-shadow">
          <div className="flex items-start justify-between">
            <div className="w-10 h-10 rounded-xl bg-[#EDE9FE] text-[#6D28D9] flex items-center justify-center shrink-0">
              <Megaphone className="w-5 h-5 stroke-[2]" />
            </div>
            <ChevronRight className="w-4 h-4 text-[#94A3B8]" />
          </div>
          <div className="mt-3">
            <div className="text-xs font-medium text-[#64748B]">Planned Advertising Budget</div>
            <div className="text-2xl font-extrabold text-[#1E1B4B] tracking-tight mt-0.5">
              {plannedBudget.toLocaleString()} MAD
            </div>
            <div className="text-xs text-[#64748B] mt-1.5 font-normal">
              For selected campaign period
            </div>
          </div>
        </div>

        {/* KPI 2: Actual Advertising Spend */}
        <div className="bg-white rounded-xl border border-[#E2E8F0] p-4.5 shadow-2xs flex flex-col justify-between hover:shadow-xs transition-shadow">
          <div className="flex items-start justify-between">
            <div className="w-10 h-10 rounded-xl bg-[#CCFBF1] text-[#0D9488] flex items-center justify-center shrink-0">
              <BarChart3 className="w-5 h-5 stroke-[2]" />
            </div>
            <ChevronRight className="w-4 h-4 text-[#94A3B8]" />
          </div>
          <div className="mt-3">
            <div className="text-xs font-medium text-[#64748B]">Actual Advertising Spend</div>
            <div className="text-2xl font-extrabold text-[#1E1B4B] tracking-tight mt-0.5">
              {actualSpend.toLocaleString()} MAD
            </div>
            <div className="flex items-center gap-1 mt-1.5 text-xs text-[#0D9488] font-semibold">
              <span>↓ 28% from planned budget</span>
            </div>
          </div>
        </div>

        {/* KPI 3: Remaining Advertising Budget */}
        <div className="bg-white rounded-xl border border-[#E2E8F0] p-4.5 shadow-2xs flex flex-col justify-between hover:shadow-xs transition-shadow">
          <div className="flex items-start justify-between">
            <div className="w-10 h-10 rounded-xl bg-[#CCFBF1] text-[#0D9488] flex items-center justify-center shrink-0">
              <PieChart className="w-5 h-5 stroke-[2]" />
            </div>
            <ChevronRight className="w-4 h-4 text-[#94A3B8]" />
          </div>
          <div className="mt-3">
            <div className="text-xs font-medium text-[#64748B]">Remaining Advertising Budget</div>
            <div className="text-2xl font-extrabold text-[#1E1B4B] tracking-tight mt-0.5">
              {remainingBudget.toLocaleString()} MAD
            </div>
            <div className="flex items-center gap-1 mt-1.5 text-xs text-[#0D9488] font-semibold">
              <span>⤹ 28% remaining</span>
            </div>
          </div>
        </div>

        {/* KPI 4: Budget Utilization */}
        <div className="bg-white rounded-xl border border-[#E2E8F0] p-4.5 shadow-2xs flex flex-col justify-between hover:shadow-xs transition-shadow">
          <div className="flex items-start justify-between">
            <div className="w-10 h-10 rounded-xl bg-[#CCFBF1] text-[#0D9488] flex items-center justify-center shrink-0">
              <TrendingUp className="w-5 h-5 stroke-[2]" />
            </div>
            <ChevronRight className="w-4 h-4 text-[#94A3B8]" />
          </div>
          <div className="mt-3">
            <div className="text-xs font-medium text-[#64748B]">Budget Utilization</div>
            <div className="text-2xl font-extrabold text-[#1E1B4B] tracking-tight mt-0.5">
              {budgetUtilization}%
            </div>
            <div className="text-xs text-[#64748B] mt-1.5 font-normal">
              of planned advertising budget
            </div>
          </div>
        </div>
      </div>

      {/* Middle Section: Chart (~60%) & Right Cards (~40%) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left Column: Planned vs Actual Spend Chart */}
        <div className="lg:col-span-7 bg-white rounded-xl border border-[#E2E8F0] p-5 shadow-2xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 gap-2 border-b border-[#F1F5F9]">
            <div>
              <h2 className="text-base font-bold text-[#1E1B4B]">Planned vs Actual Spend</h2>
              <p className="text-xs text-[#64748B] mt-0.5">
                Advertising budget only • {selectedPeriod}
              </p>
            </div>

            <div className="flex items-center gap-4">
              {/* Chart Legend */}
              <div className="flex items-center gap-3 text-xs text-[#64748B]">
                <div className="flex items-center gap-1.5">
                  <span className="w-3.5 h-0 border-t-2 border-dashed border-[#8B5CF6]" />
                  <span>Planned budget</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#6D28D9]" />
                  <span>Actual spend</span>
                </div>
              </div>

              {/* Mode Dropdown */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsChartDropdownOpen(!isChartDropdownOpen)}
                  className="px-2.5 py-1 text-xs font-medium text-[#1E1B4B] bg-[#F8F7FC] border border-[#E2E8F0] rounded-lg flex items-center gap-1.5 hover:bg-slate-100"
                >
                  <span>{chartMode}</span>
                  <ChevronDown className="w-3 h-3 text-[#64748B]" />
                </button>
                {isChartDropdownOpen && (
                  <div className="absolute right-0 mt-1 w-32 bg-white rounded-lg shadow-lg border border-[#E2E8F0] py-1 z-20 text-xs">
                    <button
                      type="button"
                      onClick={() => {
                        setChartMode('Cumulative');
                        setIsChartDropdownOpen(false);
                      }}
                      className="w-full text-left px-3 py-1.5 hover:bg-[#F5F3FF] text-[#1E1B4B]"
                    >
                      Cumulative
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setChartMode('Periodic');
                        setIsChartDropdownOpen(false);
                      }}
                      className="w-full text-left px-3 py-1.5 hover:bg-[#F5F3FF] text-[#1E1B4B]"
                    >
                      Periodic
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Recharts Area / Line Chart */}
          <div className="h-[260px] w-full pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 15, left: 0, bottom: 5 }}>
                <defs>
                  <linearGradient id="spendGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                <XAxis
                  dataKey="date"
                  tickLine={false}
                  axisLine={{ stroke: '#E2E8F0' }}
                  tick={{ fill: '#64748B', fontSize: 11 }}
                />
                <YAxis
                  domain={[0, 8000]}
                  ticks={[0, 2000, 4000, 6000, 8000]}
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: '#64748B', fontSize: 11 }}
                  tickFormatter={(val) => (val === 0 ? '0' : val.toLocaleString())}
                />
                <Tooltip
                  formatter={(value: any, name: any) => [
                    `${Number(value).toLocaleString()} MAD`,
                    name === 'planned' ? 'Planned budget' : 'Actual spend',
                  ]}
                  contentStyle={{
                    backgroundColor: '#FFFFFF',
                    borderColor: '#E2E8F0',
                    borderRadius: '8px',
                    fontSize: '12px',
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                  }}
                />
                {/* Dashed Planned Budget Line */}
                <Line
                  type="monotone"
                  dataKey="planned"
                  stroke="#A78BFA"
                  strokeWidth={2}
                  strokeDasharray="4 4"
                  dot={false}
                />
                {/* Solid Actual Spend Area with Gradient */}
                <Area
                  type="monotone"
                  dataKey="actual"
                  stroke="#6D28D9"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#spendGradient)"
                  dot={{ r: 3.5, fill: '#6D28D9', stroke: '#FFFFFF', strokeWidth: 1.5 }}
                  activeDot={{ r: 5 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Right Column: Expense Categories + Profitability Shortcut */}
        <div className="lg:col-span-5 space-y-4">
          {/* Card 1: Expense Categories */}
          <div className="bg-white rounded-xl border border-[#E2E8F0] p-5 shadow-2xs">
            <h2 className="text-base font-bold text-[#1E1B4B]">Expense categories</h2>
            <p className="text-xs text-[#64748B] mt-0.5 mb-4">
              All recorded expenses • {selectedPeriod}
            </p>

            <div className="space-y-4">
              {initialExpenseCategories.map((cat: ExpenseCategorySummary) => (
                <div key={cat.name} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-lg bg-[#EDE9FE] text-[#6D28D9] flex items-center justify-center shrink-0">
                        {cat.iconName === 'Megaphone' && <Megaphone className="w-3.5 h-3.5" />}
                        {cat.iconName === 'Package' && <Package className="w-3.5 h-3.5" />}
                        {cat.iconName === 'Wallet' && <Wallet className="w-3.5 h-3.5" />}
                      </div>
                      <span className="font-medium text-[#1E1B4B]">{cat.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-[#1E1B4B]">{cat.amount.toLocaleString()} MAD</span>
                      <span
                        className={`font-semibold ${
                          cat.percentage === 52 ? 'text-[#0D9488]' : 'text-[#64748B]'
                        }`}
                      >
                        {cat.percentage}%
                      </span>
                    </div>
                  </div>
                  {/* Progress Bar */}
                  <div className="w-full bg-[#F1F5F9] rounded-full h-2 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${cat.percentage}%`,
                        backgroundColor: cat.barColor,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Card 2: Profitability Shortcut Card */}
          <div className="bg-white rounded-xl border border-[#E2E8F0] p-4.5 shadow-2xs flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-[#EDE9FE] text-[#6D28D9] flex items-center justify-center shrink-0">
                <Percent className="w-5 h-5 stroke-[2.2]" />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm font-bold text-[#1E1B4B]">Profitability</h3>
                <p className="text-xs text-[#64748B] mt-0.5 truncate">
                  View margins and ROI for your campaigns and projects.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => navigate('/finance/profitability')}
              className="px-3.5 py-1.5 rounded-lg border border-[#DDD6FE] text-[#6D28D9] hover:bg-[#F5F3FF] text-xs font-semibold inline-flex items-center gap-1.5 shrink-0 transition-colors"
            >
              <span>Go to Profitability</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Expense Ledger Table Card */}
      <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-2xs overflow-hidden">
        {/* Card Header & Controls */}
        <div className="p-5 border-b border-[#E2E8F0] flex flex-col xl:flex-row xl:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-[#1E1B4B]">Expense ledger</h2>
            <p className="text-xs text-[#64748B] mt-0.5">
              Manually recorded expenses from your finance team. These are actual costs, not AI recommendations.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Search Input */}
            <div className="relative min-w-[200px]">
              <Search className="w-3.5 h-3.5 text-[#94A3B8] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search expenses..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-[#E2E8F0] bg-[#F8F7FC] text-xs text-[#1E1B4B] placeholder-[#94A3B8] focus:outline-none focus:ring-1 focus:ring-[#6D28D9] focus:bg-white"
              />
            </div>

            {/* Category Filter */}
            <div className="relative">
              <select
                value={selectedCategoryFilter}
                onChange={(e) => setSelectedCategoryFilter(e.target.value)}
                className="pl-3 pr-7 py-1.5 rounded-lg border border-[#E2E8F0] bg-white text-xs font-medium text-[#1E1B4B] focus:outline-none appearance-none cursor-pointer"
              >
                <option value="All categories">All categories</option>
                <option value="Advertising">Advertising</option>
                <option value="Cost of Goods">Cost of Goods</option>
                <option value="Other Operating Expenses">Other Operating Expenses</option>
              </select>
              <ChevronDown className="w-3 h-3 text-[#94A3B8] absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            {/* Team Member Filter */}
            <div className="relative">
              <select
                value={selectedTeamMemberFilter}
                onChange={(e) => setSelectedTeamMemberFilter(e.target.value)}
                className="pl-3 pr-7 py-1.5 rounded-lg border border-[#E2E8F0] bg-white text-xs font-medium text-[#1E1B4B] focus:outline-none appearance-none cursor-pointer"
              >
                <option value="All team members">All team members</option>
                <option value="Sara El Amrani">Sara El Amrani</option>
                <option value="Mehdi Zahraoui">Mehdi Zahraoui</option>
                <option value="Yassine Bouchra">Yassine Bouchra</option>
                <option value="Imane Benkirane">Imane Benkirane</option>
              </select>
              <ChevronDown className="w-3 h-3 text-[#94A3B8] absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            {/* Sort Dropdown */}
            <div className="relative">
              <select
                value={sortOption}
                onChange={(e) => setSortOption(e.target.value as any)}
                className="pl-3 pr-7 py-1.5 rounded-lg border border-[#E2E8F0] bg-white text-xs font-medium text-[#1E1B4B] focus:outline-none appearance-none cursor-pointer"
              >
                <option value="newest">Sort by: Date (newest)</option>
                <option value="oldest">Sort by: Date (oldest)</option>
                <option value="highest">Sort by: Amount (highest)</option>
                <option value="lowest">Sort by: Amount (lowest)</option>
              </select>
              <ChevronDown className="w-3 h-3 text-[#94A3B8] absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#E2E8F0] bg-[#FAF9FD] text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">
                <th className="py-2.5 px-4">Date</th>
                <th className="py-2.5 px-4">Expense Type</th>
                <th className="py-2.5 px-4">Description</th>
                <th className="py-2.5 px-4">Linked Campaign</th>
                <th className="py-2.5 px-4">Amount</th>
                <th className="py-2.5 px-4">Recorded By</th>
                <th className="py-2.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F1F5F9] text-xs">
              {groupedExpenses.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-[#64748B]">
                    No expenses found matching the current search and filters.
                  </td>
                </tr>
              ) : (
                groupedExpenses.map((group) => (
                  <React.Fragment key={group.category}>
                    {/* Category Tinted Section Separator */}
                    <tr className="bg-[#F8F7FD]">
                      <td colSpan={7} className="py-1.5 px-4 text-xs font-bold text-[#6D28D9]">
                        {group.category}
                      </td>
                    </tr>

                    {/* Category Items */}
                    {group.items.map((exp) => (
                      <tr
                        key={exp.id}
                        className="hover:bg-[#FAF9FD] transition-colors group"
                      >
                        <td className="py-3 px-4 text-[#64748B] whitespace-nowrap">{exp.date}</td>

                        <td className="py-3 px-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            {getExpenseTypeIcon(exp.expenseType)}
                            <span className="font-medium text-[#1E1B4B]">{exp.expenseType}</span>
                          </div>
                        </td>

                        <td className="py-3 px-4 text-[#1E1B4B] max-w-[280px] truncate">
                          {exp.description}
                        </td>

                        <td className="py-3 px-4 whitespace-nowrap">
                          {exp.linkedCampaign ? (
                            <span
                              onClick={() => navigate('/campaigns')}
                              className="text-[#6D28D9] font-medium hover:underline cursor-pointer"
                            >
                              {exp.linkedCampaign}
                            </span>
                          ) : (
                            <span className="text-[#94A3B8]">
                              {exp.linkedProject ? (
                                <span
                                  onClick={() => navigate('/projects')}
                                  className="text-[#6D28D9] font-medium hover:underline cursor-pointer"
                                >
                                  {exp.linkedProject}
                                </span>
                              ) : (
                                '—'
                              )}
                            </span>
                          )}
                        </td>

                        <td className="py-3 px-4 font-bold text-[#1E1B4B] whitespace-nowrap">
                          {exp.amount.toLocaleString()} MAD
                        </td>

                        <td className="py-3 px-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <span className="w-6 h-6 rounded-full bg-[#EDE9FE] text-[#6D28D9] flex items-center justify-center font-bold text-[10px]">
                              {exp.recordedBy.initials}
                            </span>
                            <span className="text-[#1E1B4B]">{exp.recordedBy.name}</span>
                          </div>
                        </td>

                        <td className="py-3 px-4 text-right whitespace-nowrap relative">
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleOpenDetail(exp)}
                              className="px-2.5 py-1 text-[11px] font-medium rounded-md border border-[#E2E8F0] text-[#1E1B4B] hover:bg-slate-50 transition-colors"
                            >
                              Open
                            </button>

                            <div className="relative">
                              <button
                                type="button"
                                onClick={() =>
                                  setMenuOpenExpenseId(menuOpenExpenseId === exp.id ? null : exp.id)
                                }
                                className="p-1 rounded-md text-[#94A3B8] hover:text-[#1E1B4B] hover:bg-slate-100"
                              >
                                <MoreHorizontal className="w-4 h-4" />
                              </button>

                              {menuOpenExpenseId === exp.id && (
                                <div className="absolute right-0 mt-1 w-32 bg-white rounded-lg shadow-lg border border-[#E2E8F0] py-1 z-30 text-xs">
                                  <button
                                    type="button"
                                    onClick={() => handleOpenEdit(exp)}
                                    className="w-full text-left px-3 py-1.5 hover:bg-[#F5F3FF] text-[#1E1B4B] flex items-center gap-2"
                                  >
                                    <Edit className="w-3.5 h-3.5 text-[#6D28D9]" />
                                    <span>Edit</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setDeleteConfirmId(exp.id)}
                                    className="w-full text-left px-3 py-1.5 hover:bg-rose-50 text-rose-600 flex items-center gap-2"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                    <span>Delete</span>
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </React.Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer with Pagination */}
        <div className="p-4 border-t border-[#E2E8F0] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[#64748B]">
          <div>
            Showing 1–{filteredExpenses.length} of {filteredExpenses.length} expenses
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled
              className="px-2.5 py-1 rounded-md border border-[#E2E8F0] text-[#94A3B8] bg-slate-50 cursor-not-allowed"
            >
              &lt; Previous
            </button>
            <button
              type="button"
              className="px-3 py-1 rounded-md border border-[#6D28D9] bg-[#6D28D9] text-white font-medium"
            >
              1
            </button>
            <button
              type="button"
              disabled
              className="px-2.5 py-1 rounded-md border border-[#E2E8F0] text-[#94A3B8] bg-slate-50 cursor-not-allowed"
            >
              Next &gt;
            </button>
          </div>
        </div>
      </div>

      {/* Add Expense Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-[#1E1B4B]/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-[#E2E8F0] w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95">
            <div className="px-6 py-4 border-b border-[#E2E8F0] flex items-center justify-between">
              <h3 className="text-base font-bold text-[#1E1B4B]">Add New Expense</h3>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="text-[#94A3B8] hover:text-[#1E1B4B]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveAdd} className="p-6 space-y-4">
              {formError && (
                <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#64748B] mb-1">Date</label>
                  <input
                    type="text"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    placeholder="e.g. 28 Oct 2026"
                    className="w-full px-3 py-2 text-xs border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#6D28D9]"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#64748B] mb-1">Amount (MAD)</label>
                  <input
                    type="number"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    placeholder="e.g. 1500"
                    className="w-full px-3 py-2 text-xs border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#6D28D9]"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#64748B] mb-1">Category</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value as ExpenseCategory })}
                    className="w-full px-3 py-2 text-xs border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#6D28D9]"
                  >
                    <option value="Advertising">Advertising</option>
                    <option value="Cost of Goods">Cost of Goods</option>
                    <option value="Other Operating Expenses">Other Operating Expenses</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#64748B] mb-1">Expense Type</label>
                  <input
                    type="text"
                    value={formData.expenseType}
                    onChange={(e) => setFormData({ ...formData, expenseType: e.target.value })}
                    placeholder="e.g. Meta Ads, Printing"
                    className="w-full px-3 py-2 text-xs border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#6D28D9]"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#64748B] mb-1">Description</label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="e.g. Promotional leaflets distribution"
                  className="w-full px-3 py-2 text-xs border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#6D28D9]"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#64748B] mb-1">Linked Campaign</label>
                  <select
                    value={formData.linkedCampaign}
                    onChange={(e) => setFormData({ ...formData, linkedCampaign: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#6D28D9]"
                  >
                    <option value="Autumn Launch 2026">Autumn Launch 2026</option>
                    <option value="Holiday Season Push">Holiday Season Push</option>
                    <option value="Brand Awareness Q4">Brand Awareness Q4</option>
                    <option value="None">None</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#64748B] mb-1">Recorded By</label>
                  <select
                    value={formData.recordedByName}
                    onChange={(e) => {
                      const name = e.target.value;
                      const initials =
                        name === 'Sara El Amrani'
                          ? 'SE'
                          : name === 'Mehdi Zahraoui'
                          ? 'MZ'
                          : name === 'Yassine Bouchra'
                          ? 'YB'
                          : 'IB';
                      setFormData({ ...formData, recordedByName: name, recordedByInitials: initials });
                    }}
                    className="w-full px-3 py-2 text-xs border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#6D28D9]"
                  >
                    <option value="Sara El Amrani">Sara El Amrani (SE)</option>
                    <option value="Mehdi Zahraoui">Mehdi Zahraoui (MZ)</option>
                    <option value="Yassine Bouchra">Yassine Bouchra (YB)</option>
                    <option value="Imane Benkirane">Imane Benkirane (IB)</option>
                  </select>
                </div>
              </div>

              <div className="pt-3 flex items-center justify-end gap-3 border-t border-[#E2E8F0]">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-[#64748B] hover:text-[#1E1B4B]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#6D28D9] hover:bg-[#5B21B6] text-white text-xs font-semibold rounded-lg shadow-2xs"
                >
                  Record Expense
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Expense Modal */}
      {isEditModalOpen && activeExpense && (
        <div className="fixed inset-0 z-50 bg-[#1E1B4B]/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-[#E2E8F0] w-full max-w-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-[#E2E8F0] flex items-center justify-between">
              <h3 className="text-base font-bold text-[#1E1B4B]">Edit Expense</h3>
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="text-[#94A3B8] hover:text-[#1E1B4B]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="p-6 space-y-4">
              {formError && (
                <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#64748B] mb-1">Date</label>
                  <input
                    type="text"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#6D28D9]"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#64748B] mb-1">Amount (MAD)</label>
                  <input
                    type="number"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#6D28D9]"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#64748B] mb-1">Category</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value as ExpenseCategory })}
                    className="w-full px-3 py-2 text-xs border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#6D28D9]"
                  >
                    <option value="Advertising">Advertising</option>
                    <option value="Cost of Goods">Cost of Goods</option>
                    <option value="Other Operating Expenses">Other Operating Expenses</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#64748B] mb-1">Expense Type</label>
                  <input
                    type="text"
                    value={formData.expenseType}
                    onChange={(e) => setFormData({ ...formData, expenseType: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#6D28D9]"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#64748B] mb-1">Description</label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#6D28D9]"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#64748B] mb-1">Linked Campaign</label>
                  <select
                    value={formData.linkedCampaign}
                    onChange={(e) => setFormData({ ...formData, linkedCampaign: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#6D28D9]"
                  >
                    <option value="Autumn Launch 2026">Autumn Launch 2026</option>
                    <option value="Holiday Season Push">Holiday Season Push</option>
                    <option value="Brand Awareness Q4">Brand Awareness Q4</option>
                    <option value="None">None</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#64748B] mb-1">Recorded By</label>
                  <select
                    value={formData.recordedByName}
                    onChange={(e) => {
                      const name = e.target.value;
                      const initials =
                        name === 'Sara El Amrani'
                          ? 'SE'
                          : name === 'Mehdi Zahraoui'
                          ? 'MZ'
                          : name === 'Yassine Bouchra'
                          ? 'YB'
                          : 'IB';
                      setFormData({ ...formData, recordedByName: name, recordedByInitials: initials });
                    }}
                    className="w-full px-3 py-2 text-xs border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#6D28D9]"
                  >
                    <option value="Sara El Amrani">Sara El Amrani (SE)</option>
                    <option value="Mehdi Zahraoui">Mehdi Zahraoui (MZ)</option>
                    <option value="Yassine Bouchra">Yassine Bouchra (YB)</option>
                    <option value="Imane Benkirane">Imane Benkirane (IB)</option>
                  </select>
                </div>
              </div>

              <div className="pt-3 flex items-center justify-end gap-3 border-t border-[#E2E8F0]">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-[#64748B] hover:text-[#1E1B4B]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#6D28D9] hover:bg-[#5B21B6] text-white text-xs font-semibold rounded-lg shadow-2xs"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Expense Detail View Modal */}
      {isDetailModalOpen && activeExpense && (
        <div className="fixed inset-0 z-50 bg-[#1E1B4B]/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-[#E2E8F0] w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-[#E2E8F0] flex items-center justify-between">
              <h3 className="text-base font-bold text-[#1E1B4B]">Expense Details</h3>
              <button
                type="button"
                onClick={() => setIsDetailModalOpen(false)}
                className="text-[#94A3B8] hover:text-[#1E1B4B]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="flex items-center justify-between pb-3 border-b border-[#F1F5F9]">
                <span className="text-[#64748B]">Amount</span>
                <span className="text-lg font-extrabold text-[#6D28D9]">
                  {activeExpense.amount.toLocaleString()} MAD
                </span>
              </div>

              <div className="space-y-2.5">
                <div className="flex justify-between">
                  <span className="text-[#64748B]">Date</span>
                  <span className="font-semibold text-[#1E1B4B]">{activeExpense.date}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#64748B]">Expense Type</span>
                  <span className="font-semibold text-[#1E1B4B]">{activeExpense.expenseType}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#64748B]">Category</span>
                  <span className="font-semibold text-[#1E1B4B]">{activeExpense.category}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#64748B]">Linked Campaign</span>
                  <span className="font-semibold text-[#6D28D9]">
                    {activeExpense.linkedCampaign || 'None'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#64748B]">Recorded By</span>
                  <span className="font-semibold text-[#1E1B4B]">{activeExpense.recordedBy.name}</span>
                </div>
              </div>

              <div className="pt-2">
                <span className="block text-[#64748B] mb-1 font-medium">Description</span>
                <p className="bg-[#F8F7FC] p-3 rounded-lg border border-[#E2E8F0] text-[#1E1B4B]">
                  {activeExpense.description}
                </p>
              </div>

              <div className="pt-3 flex items-center justify-between border-t border-[#E2E8F0]">
                <button
                  type="button"
                  onClick={() => {
                    setIsDetailModalOpen(false);
                    handleOpenEdit(activeExpense);
                  }}
                  className="px-3.5 py-1.5 rounded-lg border border-[#DDD6FE] text-[#6D28D9] hover:bg-[#F5F3FF] text-xs font-semibold inline-flex items-center gap-1.5"
                >
                  <Edit className="w-3.5 h-3.5" />
                  <span>Edit Expense</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsDetailModalOpen(false)}
                  className="px-4 py-1.5 bg-[#1E1B4B] text-white rounded-lg text-xs font-semibold hover:bg-slate-800"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 bg-[#1E1B4B]/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-[#E2E8F0] w-full max-w-sm p-6 text-center">
            <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-3">
              <Trash2 className="w-6 h-6" />
            </div>
            <h4 className="text-base font-bold text-[#1E1B4B]">Remove Expense?</h4>
            <p className="text-xs text-[#64748B] mt-1.5">
              This will remove the selected expense from your demo ledger.
            </p>
            <div className="mt-5 flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => setDeleteConfirmId(null)}
                className="px-4 py-2 text-xs font-medium text-[#64748B] hover:text-[#1E1B4B]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleDeleteExpense(deleteConfirmId)}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-lg shadow-2xs"
              >
                Delete Expense
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
