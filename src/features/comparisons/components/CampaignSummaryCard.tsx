import React from 'react';
import { Megaphone, Database, FileText, TrendingUp, Users } from 'lucide-react';
import type { CampaignComparisonMetrics } from '../../../types';

interface CampaignSummaryCardProps {
  campaign: CampaignComparisonMetrics;
  label: 'Campaign A' | 'Campaign B';
}

export const CampaignSummaryCard: React.FC<CampaignSummaryCardProps> = ({
  campaign,
  label,
}) => {
  return (
    <div className="bg-white rounded-xl border border-[#E2E8F0] p-5 shadow-2xs">
      {/* Top Header */}
      <div className="flex items-center gap-3.5 mb-5">
        <div className="w-10 h-10 rounded-xl bg-[#EDE9FE] text-[#6D28D9] flex items-center justify-center shrink-0">
          <Megaphone className="w-5 h-5 stroke-[2.2]" />
        </div>
        <div>
          <h2 className="text-base font-bold text-[#1E1B4B] tracking-tight">
            {campaign.name}
          </h2>
          <div className="flex items-center gap-1.5 text-xs text-[#64748B] mt-0.5">
            <span className="font-medium text-[#64748B]">{label}</span>
            <span>•</span>
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#0D9488]" />
            <span>Recorded data</span>
          </div>
        </div>
      </div>

      {/* 4 KPI Cards in a row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Revenue */}
        <div className="bg-[#FAFBFD] border border-[#F1F5F9] rounded-lg p-3">
          <div className="flex items-center gap-1.5 text-[#64748B] mb-1">
            <Database className="w-3.5 h-3.5 text-[#6D28D9] shrink-0" />
            <span className="text-[11px] font-medium truncate">Revenue</span>
          </div>
          <div className="text-sm font-bold text-[#1E1B4B]">
            {campaign.revenue.toLocaleString()} MAD
          </div>
        </div>

        {/* Total Recorded Costs */}
        <div className="bg-[#FAFBFD] border border-[#F1F5F9] rounded-lg p-3">
          <div className="flex items-center gap-1.5 text-[#64748B] mb-1">
            <FileText className="w-3.5 h-3.5 text-[#64748B] shrink-0" />
            <span className="text-[11px] font-medium truncate">Total Recorded Costs</span>
          </div>
          <div className="text-sm font-bold text-[#1E1B4B]">
            {campaign.totalCosts.toLocaleString()} MAD
          </div>
        </div>

        {/* Estimated Profit */}
        <div className="bg-[#FAFBFD] border border-[#F1F5F9] rounded-lg p-3">
          <div className="flex items-center gap-1.5 text-[#64748B] mb-1">
            <TrendingUp className="w-3.5 h-3.5 text-[#0D9488] shrink-0" />
            <span className="text-[11px] font-medium truncate">Estimated Profit</span>
          </div>
          <div className="text-sm font-bold text-[#0D9488]">
            {campaign.profit >= 0 ? `+${campaign.profit.toLocaleString()} MAD` : `${campaign.profit.toLocaleString()} MAD`}
          </div>
        </div>

        {/* Leads */}
        <div className="bg-[#FAFBFD] border border-[#F1F5F9] rounded-lg p-3">
          <div className="flex items-center gap-1.5 text-[#64748B] mb-1">
            <Users className="w-3.5 h-3.5 text-[#6D28D9] shrink-0" />
            <span className="text-[11px] font-medium truncate">Leads</span>
          </div>
          <div className="text-sm font-bold text-[#1E1B4B]">
            {campaign.leads.toLocaleString()}
          </div>
        </div>
      </div>
    </div>
  );
};
