import React from 'react';
import { Check } from 'lucide-react';
import type { CampaignComparisonMetrics } from '../../../types';

interface ComparisonConclusionProps {
  campaignA: CampaignComparisonMetrics;
  campaignB: CampaignComparisonMetrics;
}

export const ComparisonConclusion: React.FC<ComparisonConclusionProps> = ({
  campaignA,
  campaignB,
}) => {
  const profitDiff = campaignA.profit - campaignB.profit;

  let conclusionText = '';
  if (profitDiff > 0) {
    conclusionText = `Campaign A has higher recorded profit by ${profitDiff.toLocaleString()} MAD.`;
  } else if (profitDiff < 0) {
    conclusionText = `Campaign B has higher recorded profit by ${Math.abs(profitDiff).toLocaleString()} MAD.`;
  } else {
    conclusionText = `Both campaigns have identical recorded profit of ${campaignA.profit.toLocaleString()} MAD.`;
  }

  return (
    <div className="bg-[#ECFDF5] border border-[#A7F3D0] rounded-xl p-5 shadow-2xs flex items-center gap-4 h-full">
      <div className="w-10 h-10 rounded-full bg-[#0D9488] text-white flex items-center justify-center shrink-0 shadow-2xs">
        <Check className="w-5 h-5 stroke-[2.8]" />
      </div>
      <div>
        <div className="text-xs font-bold text-[#0D9488] uppercase tracking-wider">
          Conclusion
        </div>
        <div className="text-base font-bold text-[#1E1B4B] mt-0.5">
          {conclusionText}
        </div>
      </div>
    </div>
  );
};
