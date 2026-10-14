import React from 'react';
import { Megaphone, FileText, BarChart3, FileSpreadsheet } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { CampaignComparisonMetrics } from '../../../types';

interface ComparisonRelatedLinksProps {
  campaignA: CampaignComparisonMetrics;
  campaignB: CampaignComparisonMetrics;
}

export const ComparisonRelatedLinks: React.FC<ComparisonRelatedLinksProps> = ({
  campaignA,
  campaignB,
}) => {
  const navigate = useNavigate();

  const renderCampaignRow = (campaign: CampaignComparisonMetrics) => {
    return (
      <div
        key={campaign.id}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-2.5 border-b border-[#F8FAFC] last:border-b-0"
      >
        {/* Campaign Info */}
        <div className="flex items-center gap-2.5 min-w-[180px]">
          <Megaphone className="w-4 h-4 text-[#6D28D9] shrink-0" />
          <span className="text-xs font-bold text-[#1E1B4B] truncate">
            {campaign.name}
          </span>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => {
              if (campaign.projectId) {
                navigate(`/projects/${campaign.projectId}`);
              } else {
                navigate('/projects');
              }
            }}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-[#E2E8F0] hover:border-[#CBD5E1] bg-white hover:bg-slate-50 text-[11px] font-semibold text-[#1E1B4B] shadow-2xs transition-colors cursor-pointer"
          >
            <FileText className="w-3.5 h-3.5 text-[#6D28D9]" />
            <span>View Details</span>
          </button>

          <button
            type="button"
            onClick={() => navigate('/analytics')}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-[#E2E8F0] hover:border-[#CBD5E1] bg-white hover:bg-slate-50 text-[11px] font-semibold text-[#1E1B4B] shadow-2xs transition-colors cursor-pointer"
          >
            <BarChart3 className="w-3.5 h-3.5 text-[#6D28D9]" />
            <span>View Analytics</span>
          </button>

          <button
            type="button"
            onClick={() => navigate('/reports')}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-[#E2E8F0] hover:border-[#CBD5E1] bg-white hover:bg-slate-50 text-[11px] font-semibold text-[#1E1B4B] shadow-2xs transition-colors cursor-pointer"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-[#6D28D9]" />
            <span>View Reports</span>
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-white rounded-xl border border-[#E2E8F0] p-5 shadow-2xs h-full flex flex-col justify-between">
      <div>
        <h3 className="text-sm font-bold text-[#1E1B4B]">Related Links</h3>
        <p className="text-xs text-[#64748B] mt-0.5">
          Quick access to campaign details, analytics and reports.
        </p>

        <div className="mt-3.5 divide-y divide-[#F8FAFC]">
          {renderCampaignRow(campaignA)}
          {renderCampaignRow(campaignB)}
        </div>
      </div>
    </div>
  );
};
