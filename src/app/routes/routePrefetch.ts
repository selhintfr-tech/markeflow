import { dashboardService } from '../../features/dashboard/dashboardService';
import { projectService } from '../../features/projects/projectService';
import { campaignService } from '../../features/campaigns/campaignService';
import { taskService } from '../../features/tasks/taskService';
import { salesService } from '../../features/sales/salesService';

// Dynamic chunk prefetchers
const chunkPreloaders: Record<string, () => Promise<unknown>> = {
  '/': () => import('../../features/dashboard/DashboardPage'),
  '/workspaces': () => import('../../features/workspaces/WorkspacesPage'),
  '/projects': () => import('../../features/projects/ProjectsListPage'),
  '/strategies': () => import('../../features/strategies/MarketingStrategiesPage'),
  '/market-research': () => import('../../features/research/MarketResearchPage'),
  '/audiences': () => import('../../features/audiences/AudiencesPage'),
  '/campaigns': () => import('../../features/campaigns/CampaignsListPage'),
  '/calendar': () => import('../../features/calendar/ContentCalendarPage'),
  '/tasks': () => import('../../features/tasks/TasksPage'),
  '/crm': () => import('../../features/crm/CrmLeadsPage'),
  '/sales/orders': () => import('../../features/sales/SalesOrdersPage'),
  '/finance/budget': () => import('../../features/finance/BudgetExpensesPage'),
  '/finance/profitability': () => import('../../features/finance/ProfitabilityPage'),
  '/analytics': () => import('../../features/analytics/AnalyticsPage'),
  '/reports': () => import('../../features/reports/ReportsPage'),
  '/comparisons': () => import('../../features/comparisons/ComparisonsPage'),
  '/archive': () => import('../../features/archive/ArchivePage'),
  '/settings': () => import('../../features/settings/SettingsPage'),
  '/integrations/meta': () => import('../../features/integrations/meta/MetaAdsIntegrationPage'),
  '/integrations/delivery': () => import('../../features/delivery/DeliveryIntegrationsPage'),
};

// Route data prefetchers
const dataPreloaders: Record<string, (workspaceId: string) => void> = {
  '/': (wsId) => {
    void dashboardService.getOverview(wsId).catch(() => {});
    void campaignService.list(wsId).catch(() => {});
    void taskService.list(wsId).catch(() => {});
  },
  '/projects': (wsId) => {
    void projectService.list(wsId).catch(() => {});
  },
  '/campaigns': (wsId) => {
    void campaignService.list(wsId).catch(() => {});
  },
  '/tasks': (wsId) => {
    void taskService.list(wsId).catch(() => {});
  },
  '/sales/orders': (wsId) => {
    void salesService.orders(wsId).catch(() => {});
    void salesService.customers(wsId).catch(() => {});
  },
};

const prefetchedPaths = new Set<string>();

/**
 * Preload both the JavaScript chunk and initial data for a route
 * on user intent (e.g. mouse hover or keyboard focus).
 */
export function prefetchRoute(to: string, workspaceId?: string): void {
  // 1. Preload JS bundle chunk
  const chunkLoader = chunkPreloaders[to];
  if (chunkLoader) {
    chunkLoader().catch(() => {});
  }

  // 2. Preload data if workspace is known and not already prefetched this session
  if (!workspaceId) return;
  const cacheKey = `${workspaceId}:${to}`;
  if (prefetchedPaths.has(cacheKey)) return;

  const dataLoader = dataPreloaders[to];
  if (dataLoader) {
    prefetchedPaths.add(cacheKey);
    dataLoader(workspaceId);
  }
}
