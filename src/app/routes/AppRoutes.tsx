import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AppLayout } from '../../components/layout/AppLayout';
import { ProtectedRoute } from '../../components/auth/ProtectedRoute';

// Accessible loading fallback for lazy-loaded route components
const RouteLoadingFallback: React.FC = () => (
  <div
    role="status"
    aria-live="polite"
    aria-label="Loading page content"
    className="flex flex-col items-center justify-center min-h-[400px] w-full p-8"
  >
    <div className="w-10 h-10 border-4 border-[#EDE9FE] border-t-[#6D28D9] rounded-full animate-spin" />
    <span className="sr-only">Loading page content, please wait...</span>
    <p className="mt-3 text-xs font-medium text-[#64748B]">Loading...</p>
  </div>
);

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
const WorkspacesPage = lazy(() =>
  import('../../features/workspaces/WorkspacesPage').then((m) => ({ default: m.WorkspacesPage }))
);
const ArchivePage = lazy(() =>
  import('../../features/archive/ArchivePage').then((m) => ({ default: m.ArchivePage }))
);
const MyProfilePage = lazy(() =>
  import('../../features/profile/MyProfilePage').then((m) => ({ default: m.MyProfilePage }))
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

export const AppRoutes: React.FC = () => {
  return (
    <Suspense fallback={<RouteLoadingFallback />}>
      <Routes>
        {/* Public Authentication Routes (Outside AppLayout) */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />

        {/* Main Application Routes (Protected by Server-Validated Session) */}
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
          <Route path="/settings/profile" element={<MyProfilePage />} />
          <Route path="/profile" element={<MyProfilePage />} />

          {/* Catch-all redirect to Dashboard */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </Suspense>
  );
};
