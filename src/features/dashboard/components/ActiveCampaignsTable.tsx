import React from 'react';
import { ChevronRight, MoreHorizontal, Megaphone, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { CampaignRecord } from '../../campaigns/campaignService';
import { StatusBadge } from '../../../components/ui/StatusBadge';

interface ActiveCampaignsTableProps {
  campaigns: CampaignRecord[];
  loading: boolean;
}

export const ActiveCampaignsTable: React.FC<ActiveCampaignsTableProps> = ({
  campaigns,
  loading,
}) => {
  const displayCampaigns = campaigns.slice(0, 5);

  return (
    <div className="bg-white rounded-xl border border-[#E2E8F0] p-6 shadow-xs flex flex-col justify-between min-h-[300px] relative">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-base font-bold text-[#1E1B4B]">
            Active Campaigns
          </h2>
          <p className="text-xs text-[#64748B] mt-0.5">
            Real campaign progress and financial metrics from this workspace.
          </p>
        </div>

        <Link
          to="/campaigns"
          className="flex items-center gap-1 text-xs font-semibold text-[#6D28D9] hover:text-[#5B21B6] transition-colors focus:outline-none focus:underline"
        >
          <span>View all</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* Loading state */}
      {loading && (
        <div className="py-12 flex flex-col items-center justify-center text-center">
          <Loader2 className="w-6 h-6 text-[#6D28D9] animate-spin mb-2" />
          <span className="text-xs text-[#64748B]">Loading workspace campaigns...</span>
        </div>
      )}

      {/* Empty state */}
      {!loading && displayCampaigns.length === 0 && (
        <div className="py-10 text-center flex flex-col items-center justify-center">
          <div className="w-10 h-10 rounded-full bg-[#F5F3FF] flex items-center justify-center text-[#6D28D9] mb-2">
            <Megaphone className="w-5 h-5" />
          </div>
          <p className="text-sm font-semibold text-[#1E1B4B]">No campaigns recorded yet</p>
          <p className="text-xs text-[#64748B] max-w-sm mt-0.5 mb-3">
            Create your first marketing campaign to track budgets, channels and leads.
          </p>
          <Link
            to="/campaigns"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#6D28D9] text-white text-xs font-semibold hover:bg-[#5B21B6] transition-colors"
          >
            Go to Campaigns
          </Link>
        </div>
      )}

      {/* Table */}
      {!loading && displayCampaigns.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="text-[#64748B] font-medium border-b border-[#F1F5F9]">
                <th className="pb-3 font-medium">Campaign</th>
                <th className="pb-3 font-medium">Status</th>
                <th className="pb-3 font-medium">Budget</th>
                <th className="pb-3 font-medium">Leads</th>
                <th className="pb-3 font-medium">ROI</th>
                <th className="pb-3 w-8"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F8FAFC]">
              {displayCampaigns.map((campaign) => {
                const budgetNum = Number(campaign.budget) || 0;
                const spendNum = Number(campaign.spend) || 0;
                const revNum = Number(campaign.revenue) || 0;
                const roi = spendNum > 0 ? Math.round(((revNum - spendNum) / spendNum) * 100) : null;

                return (
                  <tr key={campaign.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 pr-3">
                      <div className="flex items-start gap-2.5">
                        <span className="w-2 h-2 rounded-full mt-1.5 shrink-0 bg-[#6D28D9]" />
                        <div>
                          <Link
                            to={`/campaigns/${campaign.id}`}
                            className="font-semibold text-sm text-[#1E1B4B] hover:text-[#6D28D9] transition-colors focus:outline-none focus:underline block"
                          >
                            {campaign.name}
                          </Link>
                          <div className="text-[11px] text-[#94A3B8] mt-0.5">
                            {campaign.start_date || '—'} &ndash; {campaign.end_date || '—'}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 pr-3">
                      <StatusBadge status={campaign.status} />
                    </td>
                    <td className="py-3.5 pr-3 font-medium text-[#1E1B4B]">
                      {budgetNum.toLocaleString()} MAD
                    </td>
                    <td className="py-3.5 pr-3 font-medium text-[#1E1B4B]">
                      {campaign.leads ?? 0}
                    </td>
                    <td className="py-3.5 pr-3 font-semibold text-[#0D9488]">
                      {roi !== null ? (roi >= 0 ? `+${roi}%` : `${roi}%`) : '—'}
                    </td>
                    <td className="py-3.5 text-right">
                      <Link
                        to={`/campaigns/${campaign.id}`}
                        className="p-1 rounded text-[#94A3B8] hover:text-[#1E1B4B] hover:bg-slate-100 transition-colors inline-flex"
                        aria-label={`View details for ${campaign.name}`}
                      >
                        <MoreHorizontal className="w-4 h-4" />
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
