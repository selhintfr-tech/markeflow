import React from 'react';

const routeTitles: Record<string, string> = {
  '/': 'Dashboard',
  '/workspaces': 'Workspaces',
  '/projects': 'Projects',
  '/strategies': 'Marketing Strategies',
  '/market-research': 'Market Research',
  '/audiences': 'Audiences',
  '/campaigns': 'Marketing Campaigns',
  '/calendar': 'Content Calendar',
  '/tasks': 'Tasks',
  '/crm': 'CRM & Leads',
  '/crm-leads': 'CRM & Leads',
  '/sales/orders': 'Sales & Orders',
  '/finance/budget': 'Budget & Expenses',
  '/budget-expenses': 'Budget & Expenses',
  '/finance/profitability': 'Profitability',
  '/profitability': 'Profitability',
  '/analytics': 'Analytics',
  '/reports': 'Reports',
  '/comparisons': 'Comparisons',
  '/archive': 'Archive',
  '/settings': 'Settings',
  '/integrations/meta': 'Meta Ads',
  '/integrations/delivery': 'Delivery Integrations',
  '/profile': 'My Profile',
  '/settings/profile': 'My Profile',
};

export const RouteLoadingSkeleton: React.FC<{ pathname: string }> = ({ pathname }) => {
  const title = routeTitles[pathname]
    || (pathname.startsWith('/projects/') ? 'Project Details'
      : pathname.startsWith('/campaigns/') ? 'Campaign Details'
        : pathname.startsWith('/strategies/') ? 'Strategy Analysis'
          : 'MarketFlow');

  return (
    <section role="status" aria-label={`Loading ${title}`} className="space-y-6">
      <div className="space-y-2">
        <div className="h-3 w-28 animate-pulse rounded bg-slate-200" />
        <h1 className="text-2xl font-bold text-[#1E1B4B]">{title}</h1>
        <div className="h-3 w-64 max-w-full animate-pulse rounded bg-slate-200" />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <div key={index} className="rounded-xl border border-[#E2E8F0] bg-white p-4">
            <div className="h-3 w-24 animate-pulse rounded bg-slate-200" />
            <div className="mt-4 h-7 w-20 animate-pulse rounded bg-slate-100" />
          </div>
        ))}
      </div>
      <div className="overflow-hidden rounded-xl border border-[#E2E8F0] bg-white p-4">
        <div className="mb-4 h-8 w-full animate-pulse rounded bg-slate-100" />
        {Array.from({ length: 5 }, (_, index) => (
          <div key={index} className="flex gap-4 border-t border-[#F1F5F9] py-4">
            <div className="h-3 w-1/3 animate-pulse rounded bg-slate-100" />
            <div className="h-3 w-1/5 animate-pulse rounded bg-slate-100" />
            <div className="h-3 w-1/4 animate-pulse rounded bg-slate-100" />
          </div>
        ))}
      </div>
      <span className="sr-only">Page content is loading.</span>
    </section>
  );
};
