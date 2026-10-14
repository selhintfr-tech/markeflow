import React from 'react';
import { ChevronRight, MoreHorizontal } from 'lucide-react';
import { activeCampaignsList } from '../../../data/mock';
import { StatusBadge } from '../../../components/ui/StatusBadge';

export const ActiveCampaignsTable: React.FC = () => {
  return (
    <div className="bg-white rounded-xl border border-[#E2E8F0] p-6 shadow-xs flex flex-col justify-between">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-base font-bold text-[#1E1B4B]">
            Active Campaigns
          </h2>
          <p className="text-xs text-[#64748B] mt-0.5">
            Your current marketing campaigns and their performance.
          </p>
        </div>

        <button
          type="button"
          className="flex items-center gap-1 text-xs font-semibold text-[#6D28D9] hover:text-[#5B21B6] transition-colors"
        >
          <span>View all</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Table */}
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
            {activeCampaignsList.map((campaign) => (
              <tr key={campaign.id} className="hover:bg-slate-50/70 transition-colors">
                <td className="py-3.5 pr-3">
                  <div className="flex items-start gap-2.5">
                    <span
                      className="w-2 h-2 rounded-full mt-1.5 shrink-0"
                      style={{ backgroundColor: campaign.color || '#0D9488' }}
                    />
                    <div>
                      <div className="font-semibold text-sm text-[#1E1B4B]">
                        {campaign.name}
                      </div>
                      <div className="text-[11px] text-[#94A3B8] mt-0.5">
                        {campaign.startDate} &ndash; {campaign.endDate}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="py-3.5 pr-3">
                  <StatusBadge status={campaign.status} />
                </td>
                <td className="py-3.5 pr-3 font-medium text-[#1E1B4B]">
                  {campaign.budget.toLocaleString()} MAD
                </td>
                <td className="py-3.5 pr-3 font-medium text-[#1E1B4B]">
                  {campaign.leads}
                </td>
                <td className="py-3.5 pr-3 font-semibold text-[#0D9488]">
                  +{campaign.roi}%
                </td>
                <td className="py-3.5 text-right">
                  <button
                    type="button"
                    className="p-1 rounded text-[#94A3B8] hover:text-[#1E1B4B] hover:bg-slate-100 transition-colors"
                    aria-label="More options"
                  >
                    <MoreHorizontal className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
