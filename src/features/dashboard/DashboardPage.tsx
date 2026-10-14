import React, { useState } from 'react';
import {
  Calendar,
  Plus,
  Megaphone,
  CreditCard,
  BarChart2,
  FileText,
  ChevronDown,
} from 'lucide-react';
import { StatCard } from '../../components/ui/StatCard';
import { MarketingPerformanceChart } from './components/MarketingPerformanceChart';
import { BudgetUtilizationCard } from './components/BudgetUtilizationCard';
import { ActiveCampaignsTable } from './components/ActiveCampaignsTable';
import { UpcomingTasksCard } from './components/UpcomingTasksCard';
import { dashboardStats } from '../../data/mock';

export const DashboardPage: React.FC = () => {
  const [selectedPeriod, setSelectedPeriod] = useState('October 2026');
  const [showPeriodDropdown, setShowPeriodDropdown] = useState(false);

  const periods = ['October 2026', 'September 2026', 'August 2026', 'Year to date (2026)'];

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto pb-12">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-xs text-[#64748B]">
        <span className="hover:text-[#1E1B4B] cursor-pointer">Overview</span>
        <span>/</span>
        <span className="text-[#1E1B4B] font-medium">Dashboard</span>
      </div>

      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-extrabold tracking-tight text-[#1E1B4B]">
            Marketing Overview
          </h1>
          <p className="text-sm text-[#64748B] mt-1">
            Track your performance, manage campaigns, and grow your business.
          </p>
        </div>

        {/* Right Header Controls: Period dropdown + New Campaign CTA */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowPeriodDropdown(!showPeriodDropdown)}
              className="flex items-center gap-2 px-3.5 py-2 rounded-lg border border-[#E2E8F0] bg-white text-xs font-medium text-[#1E1B4B] hover:bg-slate-50 shadow-2xs transition-colors"
            >
              <Calendar className="w-3.5 h-3.5 text-[#64748B]" />
              <span>{selectedPeriod}</span>
              <ChevronDown className="w-3.5 h-3.5 text-[#94A3B8]" />
            </button>

            {showPeriodDropdown && (
              <div className="absolute right-0 mt-1.5 w-48 rounded-lg bg-white border border-[#E2E8F0] shadow-lg py-1 z-40">
                {periods.map((period) => (
                  <button
                    key={period}
                    onClick={() => {
                      setSelectedPeriod(period);
                      setShowPeriodDropdown(false);
                    }}
                    className={`w-full text-left px-3.5 py-2 text-xs hover:bg-[#F5F3FF] transition-colors ${
                      selectedPeriod === period
                        ? 'text-[#6D28D9] font-semibold bg-[#F5F3FF]'
                        : 'text-[#1E1B4B]'
                    }`}
                  >
                    {period}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            type="button"
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#6D28D9] hover:bg-[#5B21B6] text-white text-xs font-semibold shadow-xs hover:shadow-md transition-all"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>New Campaign</span>
          </button>
        </div>
      </div>

      {/* Quick Action Navigation links */}
      <div className="flex items-center justify-end gap-6 text-xs font-semibold text-[#6D28D9]">
        <button
          type="button"
          className="flex items-center gap-1.5 hover:text-[#5B21B6] transition-colors"
        >
          <Megaphone className="w-4 h-4" />
          <span>Campaigns</span>
        </button>
        <button
          type="button"
          className="flex items-center gap-1.5 hover:text-[#5B21B6] transition-colors"
        >
          <CreditCard className="w-4 h-4" />
          <span>Budget</span>
        </button>
        <button
          type="button"
          className="flex items-center gap-1.5 hover:text-[#5B21B6] transition-colors"
        >
          <BarChart2 className="w-4 h-4" />
          <span>Analytics</span>
        </button>
        <button
          type="button"
          className="flex items-center gap-1.5 hover:text-[#5B21B6] transition-colors"
        >
          <FileText className="w-4 h-4" />
          <span>Reports</span>
        </button>
      </div>

      {/* Top 4 KPI Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard
          icon={<Megaphone className="w-5 h-5 text-[#6D28D9]" />}
          iconBgColor="bg-[#F5F3FF]"
          title="Active Campaigns"
          value={dashboardStats.activeCampaigns.value}
          changePercentage={dashboardStats.activeCampaigns.changePercentage}
          changeLabel={dashboardStats.activeCampaigns.changeLabel}
        />
        <StatCard
          icon={<CreditCard className="w-5 h-5 text-[#6D28D9]" />}
          iconBgColor="bg-[#F5F3FF]"
          title="Advertising Spend"
          value={`${dashboardStats.advertisingSpend.value.toLocaleString()} ${dashboardStats.advertisingSpend.currency}`}
          changePercentage={dashboardStats.advertisingSpend.changePercentage}
          changeLabel={dashboardStats.advertisingSpend.changeLabel}
        />
        <StatCard
          icon={
            <svg className="w-5 h-5 text-[#0D9488]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          }
          iconBgColor="bg-[#CCFBF1]/40"
          title="Leads Generated"
          value={dashboardStats.leadsGenerated.value}
          changePercentage={dashboardStats.leadsGenerated.changePercentage}
          changeLabel={dashboardStats.leadsGenerated.changeLabel}
        />
        <StatCard
          icon={
            <svg className="w-5 h-5 text-[#0D9488]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="20" x2="12" y2="10" />
              <line x1="18" y1="20" x2="18" y2="4" />
              <line x1="6" y1="20" x2="6" y2="16" />
            </svg>
          }
          iconBgColor="bg-[#CCFBF1]/40"
          title="Estimated Campaign Profit"
          value={`+${dashboardStats.estimatedProfit.value.toLocaleString()} ${dashboardStats.estimatedProfit.currency}`}
          changePercentage={dashboardStats.estimatedProfit.changePercentage}
          changeLabel={dashboardStats.estimatedProfit.changeLabel}
        />
      </div>

      {/* Middle Row: Marketing Performance (2/3 width) + Budget Utilization (1/3 width) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <MarketingPerformanceChart />
        </div>
        <div className="lg:col-span-1">
          <BudgetUtilizationCard />
        </div>
      </div>

      {/* Bottom Row: Active Campaigns Table (2/3 width) + Upcoming Tasks (1/3 width) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <ActiveCampaignsTable />
        </div>
        <div className="lg:col-span-1">
          <UpcomingTasksCard />
        </div>
      </div>
    </div>
  );
};
