export interface CampaignFinancials {
  id: string;
  campaignId: string;
  campaignName: string;
  workspaceId: string;
  workspaceName: string;
  salesRevenue: number;
  advertisingSpend: number;
  costOfGoodsSold: number;
  otherAllocatedExpenses: number;
  expensesHistory?: Array<{
    id: string;
    category: 'Advertising Spend' | 'Cost of Goods Sold' | 'Other Allocated Expenses';
    amount: number;
    date: string;
    description: string;
  }>;
  revenueHistory?: Array<{
    id: string;
    source: string;
    amount: number;
    date: string;
  }>;
}

export const initialCampaignFinancials: Record<string, CampaignFinancials[]> = {
  'ws-atlas-retail': [
    {
      id: 'fin-autumn-2026',
      campaignId: 'camp-1',
      campaignName: 'Autumn Launch 2026',
      workspaceId: 'ws-atlas-retail',
      workspaceName: 'Atlas Retail SARL',
      salesRevenue: 13400,
      advertisingSpend: 5400,
      costOfGoodsSold: 4600,
      otherAllocatedExpenses: 1200,
      expensesHistory: [
        {
          id: 'exp-1',
          category: 'Advertising Spend',
          amount: 5400,
          date: '15 Oct 2026',
          description: 'Meta Ads & Search Paid Campaign',
        },
        {
          id: 'exp-2',
          category: 'Cost of Goods Sold',
          amount: 4600,
          date: '12 Oct 2026',
          description: 'Product manufacturing & packaging',
        },
        {
          id: 'exp-3',
          category: 'Other Allocated Expenses',
          amount: 1200,
          date: '10 Oct 2026',
          description: 'Creative design & content licensing',
        },
      ],
      revenueHistory: [
        {
          id: 'rev-1',
          source: 'E-commerce Store Sales',
          amount: 13400,
          date: '31 Oct 2026',
        },
      ],
    },
    {
      id: 'fin-holiday-2026',
      campaignId: 'camp-2',
      campaignName: 'Holiday Season Push',
      workspaceId: 'ws-atlas-retail',
      workspaceName: 'Atlas Retail SARL',
      salesRevenue: 8500,
      advertisingSpend: 2500,
      costOfGoodsSold: 3200,
      otherAllocatedExpenses: 800,
    },
    {
      id: 'fin-brand-2026',
      campaignId: 'camp-3',
      campaignName: 'Brand Awareness Q4',
      workspaceId: 'ws-atlas-retail',
      workspaceName: 'Atlas Retail SARL',
      salesRevenue: 12000,
      advertisingSpend: 4000,
      costOfGoodsSold: 4200,
      otherAllocatedExpenses: 1000,
    },
  ],
  'ws-solis-energy': [
    {
      id: 'fin-solar-b2b',
      campaignId: 'camp-solis-1',
      campaignName: 'Solar Tech B2B Launch',
      workspaceId: 'ws-solis-energy',
      workspaceName: 'Solis Energy Tech',
      salesRevenue: 45000,
      advertisingSpend: 15000,
      costOfGoodsSold: 18000,
      otherAllocatedExpenses: 3500,
    },
  ],
  'ws-nordic-craft': [
    {
      id: 'fin-nordic-1',
      campaignId: 'camp-nordic-1',
      campaignName: 'Winter Artisan Collection',
      workspaceId: 'ws-nordic-craft',
      workspaceName: 'Nordic Craft Co',
      salesRevenue: 22000,
      advertisingSpend: 7500,
      costOfGoodsSold: 8800,
      otherAllocatedExpenses: 1900,
    },
  ],
  'ws-zenith-media': [
    {
      id: 'fin-zenith-1',
      campaignId: 'camp-zenith-1',
      campaignName: 'Digital Growth Summit',
      workspaceId: 'ws-zenith-media',
      workspaceName: 'Zenith Media Lab',
      salesRevenue: 31000,
      advertisingSpend: 11000,
      costOfGoodsSold: 10500,
      otherAllocatedExpenses: 2800,
    },
  ],
};

export const PROFITABILITY_STORAGE_KEY = 'marketflow_campaign_financials';
