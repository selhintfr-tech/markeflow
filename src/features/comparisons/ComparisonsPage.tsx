import React, { useState, useMemo } from 'react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { comparisonCampaignsList } from '../../data/mock';
import type { CampaignComparisonMetrics } from '../../types';
import { ComparisonToolbar } from './components/ComparisonToolbar';
import { CampaignSummaryCard } from './components/CampaignSummaryCard';
import { RevenueCostsChart } from './components/RevenueCostsChart';
import { ProfitComparisonChart } from './components/ProfitComparisonChart';
import { LeadsComparisonChart } from './components/LeadsComparisonChart';
import { ComparisonTable } from './components/ComparisonTable';
import { ComparisonConclusion } from './components/ComparisonConclusion';
import { ComparisonRelatedLinks } from './components/ComparisonRelatedLinks';

export const ComparisonsPage: React.FC = () => {
  const { currentWorkspace } = useWorkspace();

  // Filter campaigns belonging to current workspace
  const workspaceCampaigns = useMemo(() => {
    const matched = comparisonCampaignsList.filter(
      (c) => c.workspaceId === currentWorkspace.id
    );
    return matched.length >= 2 ? matched : comparisonCampaignsList;
  }, [currentWorkspace]);

  // User manual selections
  const [userSelectedA, setUserSelectedA] = useState<string | null>(null);
  const [userSelectedB, setUserSelectedB] = useState<string | null>(null);
  const [selectedDateRange, setSelectedDateRange] = useState<string>(
    '01 Oct 2026 - 31 Oct 2026'
  );

  // Derived effective Campaign A ID
  const selectedCampaignAId = useMemo(() => {
    if (userSelectedA && workspaceCampaigns.some((c) => c.id === userSelectedA)) {
      return userSelectedA;
    }
    return workspaceCampaigns[0]?.id || 'camp-autumn-launch';
  }, [userSelectedA, workspaceCampaigns]);

  // Derived effective Campaign B ID (ensures distinct from Campaign A)
  const selectedCampaignBId = useMemo(() => {
    if (
      userSelectedB &&
      userSelectedB !== selectedCampaignAId &&
      workspaceCampaigns.some((c) => c.id === userSelectedB)
    ) {
      return userSelectedB;
    }
    const fallback = workspaceCampaigns.find((c) => c.id !== selectedCampaignAId);
    return fallback?.id || workspaceCampaigns[1]?.id || 'camp-spring-promo';
  }, [userSelectedB, selectedCampaignAId, workspaceCampaigns]);

  // Active compared campaigns
  const campaignA: CampaignComparisonMetrics = useMemo(() => {
    return (
      workspaceCampaigns.find((c) => c.id === selectedCampaignAId) ||
      workspaceCampaigns[0] ||
      comparisonCampaignsList[0]
    );
  }, [workspaceCampaigns, selectedCampaignAId]);

  const campaignB: CampaignComparisonMetrics = useMemo(() => {
    return (
      workspaceCampaigns.find((c) => c.id === selectedCampaignBId) ||
      workspaceCampaigns[1] ||
      comparisonCampaignsList[1]
    );
  }, [workspaceCampaigns, selectedCampaignBId]);

  const handleCampaignAChange = (newId: string) => {
    setUserSelectedA(newId);
    if (newId === selectedCampaignBId) {
      const alt = workspaceCampaigns.find((c) => c.id !== newId);
      if (alt) setUserSelectedB(alt.id);
    }
  };

  const handleCampaignBChange = (newId: string) => {
    setUserSelectedB(newId);
    if (newId === selectedCampaignAId) {
      const alt = workspaceCampaigns.find((c) => c.id !== newId);
      if (alt) setUserSelectedA(alt.id);
    }
  };

  const handleCompareClick = () => {
    // Triggers comparison recalculation
  };

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto pb-16 animate-in fade-in duration-200">
      {/* 1. Breadcrumb matching screenshot */}
      <div className="flex items-center gap-1.5 text-xs text-[#64748B]">
        <span>Insights</span>
        <span>/</span>
        <span className="text-[#6D28D9] font-medium">Comparisons</span>
      </div>

      {/* 2. Page Header */}
      <div>
        <h1 className="text-2xl lg:text-3xl font-extrabold tracking-tight text-[#1E1B4B]">
          Performance Comparison
        </h1>
        <p className="text-sm text-[#64748B] mt-1">
          Compare campaigns, projects and reporting periods.
        </p>
      </div>

      {/* 3. Comparison Toolbar */}
      <ComparisonToolbar
        availableCampaigns={workspaceCampaigns}
        selectedCampaignAId={selectedCampaignAId}
        selectedCampaignBId={selectedCampaignBId}
        selectedDateRange={selectedDateRange}
        onCampaignAChange={handleCampaignAChange}
        onCampaignBChange={handleCampaignBChange}
        onDateRangeChange={setSelectedDateRange}
        onCompare={handleCompareClick}
      />

      {/* 4. Campaign Summary Cards (Side by side) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <CampaignSummaryCard campaign={campaignA} label="Campaign A" />
        <CampaignSummaryCard campaign={campaignB} label="Campaign B" />
      </div>

      {/* 5. Charts Row (3 charts side-by-side) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-stretch">
        <RevenueCostsChart campaignA={campaignA} campaignB={campaignB} />
        <ProfitComparisonChart campaignA={campaignA} campaignB={campaignB} />
        <LeadsComparisonChart campaignA={campaignA} campaignB={campaignB} />
      </div>

      {/* 6. Campaign Performance Comparison Table */}
      <ComparisonTable campaignA={campaignA} campaignB={campaignB} />

      {/* 7. Bottom Section: Conclusion & Related Links */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        <div className="lg:col-span-6">
          <ComparisonConclusion campaignA={campaignA} campaignB={campaignB} />
        </div>
        <div className="lg:col-span-6">
          <ComparisonRelatedLinks campaignA={campaignA} campaignB={campaignB} />
        </div>
      </div>
    </div>
  );
};
