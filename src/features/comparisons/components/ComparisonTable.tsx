import React from 'react';
import { Database, FileText, TrendingUp, Users } from 'lucide-react';
import type { CampaignComparisonMetrics } from '../../../types';

interface ComparisonTableProps {
  campaignA: CampaignComparisonMetrics;
  campaignB: CampaignComparisonMetrics;
}

export const ComparisonTable: React.FC<ComparisonTableProps> = ({
  campaignA,
  campaignB,
}) => {
  // Calculations
  const revDiff = campaignA.revenue - campaignB.revenue;
  const costDiff = campaignA.totalCosts - campaignB.totalCosts;
  const profitDiff = campaignA.profit - campaignB.profit;
  const leadsDiff = campaignA.leads - campaignB.leads;

  // Observations
  const revObs =
    revDiff > 0
      ? `Campaign A generated ${revDiff.toLocaleString()} MAD more revenue.`
      : revDiff < 0
      ? `Campaign B generated ${Math.abs(revDiff).toLocaleString()} MAD more revenue.`
      : 'Both campaigns generated equal revenue.';

  const costObs =
    costDiff > 0
      ? `Campaign A had ${costDiff.toLocaleString()} MAD higher recorded costs.`
      : costDiff < 0
      ? `Campaign A had ${Math.abs(costDiff).toLocaleString()} MAD lower recorded costs.`
      : 'Both campaigns recorded identical costs.';

  const profitObs =
    profitDiff > 0
      ? `Campaign A has ${profitDiff.toLocaleString()} MAD higher estimated profit.`
      : profitDiff < 0
      ? `Campaign B has ${Math.abs(profitDiff).toLocaleString()} MAD higher estimated profit.`
      : 'Both campaigns generated equal estimated profit.';

  const leadsObs =
    leadsDiff > 0
      ? `Campaign A generated ${leadsDiff} more leads.`
      : leadsDiff < 0
      ? `Campaign B generated ${Math.abs(leadsDiff)} more leads.`
      : 'Both campaigns generated the same number of leads.';

  return (
    <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-2xs overflow-hidden">
      {/* Table Header / Title */}
      <div className="p-5 border-b border-[#F1F5F9]">
        <h3 className="text-base font-bold text-[#1E1B4B]">Campaign Performance Comparison</h3>
        <p className="text-xs text-[#64748B] mt-0.5">
          Side-by-side comparison of key metrics for the selected campaigns.
        </p>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-[#F1F5F9] text-[11px] font-semibold text-[#64748B] bg-[#FAFBFD]/50">
              <th className="py-3 px-6 font-semibold min-w-[200px]">Metric</th>
              <th className="py-3 px-6 font-semibold min-w-[150px]">{campaignA.name}</th>
              <th className="py-3 px-6 font-semibold min-w-[150px]">{campaignB.name}</th>
              <th className="py-3 px-6 font-semibold min-w-[130px]">Difference</th>
              <th className="py-3 px-6 font-semibold">Observation</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#F8FAFC]">
            {/* 1. Revenue */}
            <tr className="hover:bg-[#FDFCFE] transition-colors">
              <td className="py-3.5 px-6">
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-lg bg-[#EDE9FE] text-[#6D28D9] flex items-center justify-center shrink-0">
                    <Database className="w-3.5 h-3.5" />
                  </div>
                  <span className="font-semibold text-[#1E1B4B]">Revenue</span>
                </div>
              </td>
              <td className="py-3.5 px-6 font-semibold text-[#1E1B4B]">
                {campaignA.revenue.toLocaleString()} MAD
              </td>
              <td className="py-3.5 px-6 font-semibold text-[#1E1B4B]">
                {campaignB.revenue.toLocaleString()} MAD
              </td>
              <td className="py-3.5 px-6 font-bold text-[#0D9488]">
                {revDiff > 0 ? `+${revDiff.toLocaleString()} MAD` : revDiff < 0 ? `-${Math.abs(revDiff).toLocaleString()} MAD` : '0 MAD'}
              </td>
              <td className="py-3.5 px-6 text-[#64748B]">{revObs}</td>
            </tr>

            {/* 2. Total Recorded Costs */}
            <tr className="hover:bg-[#FDFCFE] transition-colors">
              <td className="py-3.5 px-6">
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-lg bg-[#EDE9FE] text-[#6D28D9] flex items-center justify-center shrink-0">
                    <FileText className="w-3.5 h-3.5" />
                  </div>
                  <span className="font-semibold text-[#1E1B4B]">Total Recorded Costs</span>
                </div>
              </td>
              <td className="py-3.5 px-6 font-semibold text-[#1E1B4B]">
                {campaignA.totalCosts.toLocaleString()} MAD
              </td>
              <td className="py-3.5 px-6 font-semibold text-[#1E1B4B]">
                {campaignB.totalCosts.toLocaleString()} MAD
              </td>
              <td className={`py-3.5 px-6 font-bold ${costDiff > 0 ? 'text-[#EF4444]' : costDiff < 0 ? 'text-[#0D9488]' : 'text-[#64748B]'}`}>
                {costDiff > 0 ? `+${costDiff.toLocaleString()} MAD` : costDiff < 0 ? `-${Math.abs(costDiff).toLocaleString()} MAD` : '0 MAD'}
              </td>
              <td className="py-3.5 px-6 text-[#64748B]">{costObs}</td>
            </tr>

            {/* 3. Estimated Profit */}
            <tr className="hover:bg-[#FDFCFE] transition-colors">
              <td className="py-3.5 px-6">
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-lg bg-[#CCFBF1] text-[#0D9488] flex items-center justify-center shrink-0">
                    <TrendingUp className="w-3.5 h-3.5" />
                  </div>
                  <span className="font-semibold text-[#1E1B4B]">Estimated Profit</span>
                </div>
              </td>
              <td className="py-3.5 px-6 font-semibold text-[#0D9488]">
                {campaignA.profit >= 0 ? `+${campaignA.profit.toLocaleString()} MAD` : `${campaignA.profit.toLocaleString()} MAD`}
              </td>
              <td className="py-3.5 px-6 font-semibold text-[#0D9488]">
                {campaignB.profit >= 0 ? `+${campaignB.profit.toLocaleString()} MAD` : `${campaignB.profit.toLocaleString()} MAD`}
              </td>
              <td className={`py-3.5 px-6 font-bold ${profitDiff >= 0 ? 'text-[#0D9488]' : 'text-[#EF4444]'}`}>
                {profitDiff > 0 ? `+${profitDiff.toLocaleString()} MAD` : profitDiff < 0 ? `-${Math.abs(profitDiff).toLocaleString()} MAD` : '0 MAD'}
              </td>
              <td className="py-3.5 px-6 text-[#64748B]">{profitObs}</td>
            </tr>

            {/* 4. Leads */}
            <tr className="hover:bg-[#FDFCFE] transition-colors">
              <td className="py-3.5 px-6">
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-lg bg-[#EDE9FE] text-[#6D28D9] flex items-center justify-center shrink-0">
                    <Users className="w-3.5 h-3.5" />
                  </div>
                  <span className="font-semibold text-[#1E1B4B]">Leads</span>
                </div>
              </td>
              <td className="py-3.5 px-6 font-semibold text-[#1E1B4B]">
                {campaignA.leads.toLocaleString()}
              </td>
              <td className="py-3.5 px-6 font-semibold text-[#1E1B4B]">
                {campaignB.leads.toLocaleString()}
              </td>
              <td className={`py-3.5 px-6 font-bold ${leadsDiff >= 0 ? 'text-[#0D9488]' : 'text-[#EF4444]'}`}>
                {leadsDiff > 0 ? `+${leadsDiff}` : leadsDiff < 0 ? `-${Math.abs(leadsDiff)}` : '0'}
              </td>
              <td className="py-3.5 px-6 text-[#64748B]">{leadsObs}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};
