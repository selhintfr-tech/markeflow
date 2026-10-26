import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AppLayout } from '../../components/layout/AppLayout';
import { ProtectedRoute } from '../../components/auth/ProtectedRoute';

// Lazy-loaded route components
const DashboardPage = lazy(() =>
  import('../../features/dashboard/DashboardPage').then((m) => ({ default: m.DashboardPage }))
);
const ProjectsListPage = lazy(() =>
  import('../../features/projects/ProjectsListPage').then((m) => ({ default: m.ProjectsListPage }))
);
const ProjectDetailsPage = lazy(() =>
  import('../../features/projects/ProjectDetailsPage').then((m) => ({ default: m.ProjectDetailsPage }))
);
const MarketingStrategiesPage = lazy(() =>
  import('../../features/strategies/MarketingStrategiesPage').then((m) => ({ default: m.MarketingStrategiesPage }))
);
const SwotAnalysisPage = lazy(() =>
  import('../../features/strategies/SwotAnalysisPage').then((m) => ({ default: m.SwotAnalysisPage }))
);
const MarketResearchPage = lazy(() =>
  import('../../features/research/MarketResearchPage').then((m) => ({ default: m.MarketResearchPage }))
);
const AudiencesPage = lazy(() =>
  import('../../features/audiences/AudiencesPage').then((m) => ({ default: m.AudiencesPage }))
);
const ContentCalendarPage = lazy(() =>
  import('../../features/calendar/ContentCalendarPage').then((m) => ({ default: m.ContentCalendarPage }))
);
const BudgetExpensesPage = lazy(() =>
  import('../../features/finance/BudgetExpensesPage').then((m) => ({ default: m.BudgetExpensesPage }))
);
const ProfitabilityPage = lazy(() =>
  import('../../features/finance/ProfitabilityPage').then((m) => ({ default: m.ProfitabilityPage }))
);
const CrmLeadsPage = lazy(() =>
  import('../../features/crm/CrmLeadsPage').then((m) => ({ default: m.CrmLeadsPage }))
);
const SalesOrdersPage = lazy(() =>
  import('../../features/sales/SalesOrdersPage').then((m) => ({ default: m.SalesOrdersPage }))
);
const WorkspacesPage = lazy(() =>
  import('../../features/workspaces/WorkspacesPage').then((m) => ({ default: m.WorkspacesPage }))
);
const ArchivePage = lazy(() =>
  import('../../features/archive/ArchivePage').then((m) => ({ default: m.ArchivePage }))
);
const MyProfilePage = lazy(() =>
  import('../../features/profile/MyProfilePage').then((m) => ({ default: m.MyProfilePage }))
);
const MetaAdsIntegrationPage = lazy(() =>
  import('../../features/integrations/meta/MetaAdsIntegrationPage').then((m) => ({ default: m.MetaAdsIntegrationPage }))
);
const DeliveryIntegrationsPage = lazy(() =>
  import('../../features/delivery/DeliveryIntegrationsPage').then((m) => ({ default: m.DeliveryIntegrationsPage }))
);
const ComparisonsPage = lazy(() =>
  import('../../features/comparisons/ComparisonsPage').then((m) => ({ default: m.ComparisonsPage }))
);
const ReportsPage = lazy(() =>
  import('../../features/reports/ReportsPage').then((m) => ({ default: m.ReportsPage }))
);
const AnalyticsPage = lazy(() =>
  import('../../features/analytics/AnalyticsPage').then((m) => ({ default: m.AnalyticsPage }))
);
const TasksPage = lazy(() =>
  import('../../features/tasks/TasksPage').then((m) => ({ default: m.TasksPage }))
);
const CampaignsListPage = lazy(() =>
  import('../../features/campaigns/CampaignsListPage').then((m) => ({ default: m.CampaignsListPage }))
);
const CampaignDetailsPage = lazy(() =>
  import('../../features/campaigns/CampaignDetailsPage').then((m) => ({ default: m.CampaignDetailsPage }))
);
const SettingsPage = lazy(() =>
  import('../../features/settings/SettingsPage').then((m) => ({ default: m.SettingsPage }))
);
const LoginPage = lazy(() =>
  import('../../features/auth/pages/LoginPage').then((m) => ({ default: m.LoginPage }))
);
const RegisterPage = lazy(() =>
  import('../../features/auth/pages/RegisterPage').then((m) => ({ default: m.RegisterPage }))
);
const ForgotPasswordPage = lazy(() =>
  import('../../features/auth/pages/ForgotPasswordPage').then((m) => ({ default: m.ForgotPasswordPage }))
);
const ResetPasswordPage = lazy(() =>
  import('../../features/auth/pages/ResetPasswordPage').then((m) => ({ default: m.ResetPasswordPage }))
);

const AuthRouteFallback: React.FC = () => (
  <div role="status" aria-label="Loading authentication" className="min-h-screen bg-[#F8F7FC] p-8">
    <div className="mx-auto mt-24 h-8 w-48 animate-pulse rounded bg-slate-200" />
    <span className="sr-only">Loading authentication.</span>
  </div>
);

export const AppRoutes: React.FC = () => {
  return (
    <Routes>
      {/* Public Authentication Routes (Outside AppLayout) */}
      <Route
        path="/login"
        element={
          <Suspense fallback={<AuthRouteFallback />}>
            <LoginPage />
          </Suspense>
        }
      />
      <Route
        path="/register"
        element={
          <Suspense fallback={<AuthRouteFallback />}>
            <RegisterPage />
          </Suspense>
        }
      />
      <Route
        path="/forgot-password"
        element={
          <Suspense fallback={<AuthRouteFallback />}>
            <ForgotPasswordPage />
          </Suspense>
        }
      />
      <Route
        path="/reset-password"
        element={
          <Suspense fallback={<AuthRouteFallback />}>
            <ResetPasswordPage />
          </Suspense>
        }
      />

      {/* Main Application Routes (Protected by Server-Validated Session, Shell Never Unmounts) */}
      <Route
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        {/* Primary Dashboard Route */}
        <Route path="/" element={<DashboardPage />} />

        {/* Management Routes */}
        <Route path="/workspaces" element={<WorkspacesPage />} />
        <Route path="/projects" element={<ProjectsListPage />} />
        <Route path="/projects/:projectId" element={<ProjectDetailsPage />} />
        <Route path="/strategies" element={<MarketingStrategiesPage />} />
        <Route path="/strategies/:strategyId/swot" element={<SwotAnalysisPage />} />
        <Route path="/strategies/swot" element={<SwotAnalysisPage />} />
        <Route path="/market-research" element={<MarketResearchPage />} />
        <Route path="/audiences" element={<AudiencesPage />} />
        <Route path="/campaigns" element={<CampaignsListPage />} />
        <Route path="/campaigns/:campaignId" element={<CampaignDetailsPage />} />
        <Route path="/calendar" element={<ContentCalendarPage />} />
        <Route path="/tasks" element={<TasksPage />} />

        {/* Customer Routes */}
        <Route path="/crm" element={<CrmLeadsPage />} />
        <Route path="/crm-leads" element={<CrmLeadsPage />} />
        <Route path="/sales/orders" element={<SalesOrdersPage />} />

        {/* Finance & Insights Routes */}
        <Route path="/finance/budget" element={<BudgetExpensesPage />} />
        <Route path="/budget-expenses" element={<BudgetExpensesPage />} />
        <Route path="/finance/profitability" element={<ProfitabilityPage />} />
        <Route path="/profitability" element={<ProfitabilityPage />} />
        <Route path="/analytics" element={<AnalyticsPage />} />
        <Route path="/reports" element={<ReportsPage />} />
        <Route path="/comparisons" element={<ComparisonsPage />} />

        {/* System Routes */}
        <Route path="/archive" element={<ArchivePage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/integrations/meta" element={<MetaAdsIntegrationPage />} />
        <Route path="/integrations/delivery" element={<DeliveryIntegrationsPage />} />
        <Route path="/settings/profile" element={<MyProfilePage />} />
        <Route path="/profile" element={<MyProfilePage />} />

        {/* Catch-all redirect to Dashboard */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
};
