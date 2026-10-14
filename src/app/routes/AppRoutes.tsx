import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AppLayout } from '../../components/layout/AppLayout';
import { DashboardPage } from '../../features/dashboard/DashboardPage';
import { ProjectsListPage } from '../../features/projects/ProjectsListPage';
import { ProjectDetailsPage } from '../../features/projects/ProjectDetailsPage';
import { MarketingStrategiesPage } from '../../features/strategies/MarketingStrategiesPage';
import { SwotAnalysisPage } from '../../features/strategies/SwotAnalysisPage';
import { MarketResearchPage } from '../../features/research/MarketResearchPage';
import { AudiencesPage } from '../../features/audiences/AudiencesPage';
import { ContentCalendarPage } from '../../features/calendar/ContentCalendarPage';
import { BudgetExpensesPage } from '../../features/finance/BudgetExpensesPage';
import { ProfitabilityPage } from '../../features/finance/ProfitabilityPage';
import { CrmLeadsPage } from '../../features/crm/CrmLeadsPage';

import { WorkspacesPage } from '../../features/workspaces/WorkspacesPage';
import { ArchivePage } from '../../features/archive/ArchivePage';
import { MyProfilePage } from '../../features/profile/MyProfilePage';
import { ComparisonsPage } from '../../features/comparisons/ComparisonsPage';
import { ReportsPage } from '../../features/reports/ReportsPage';
import { AnalyticsPage } from '../../features/analytics/AnalyticsPage';
import { TasksPage } from '../../features/tasks/TasksPage';
import { CampaignsListPage } from '../../features/campaigns/CampaignsListPage';
import { CampaignDetailsPage } from '../../features/campaigns/CampaignDetailsPage';
import { SettingsPage } from '../../features/settings/SettingsPage';
import { LoginPage } from '../../features/auth/pages/LoginPage';
import { RegisterPage } from '../../features/auth/pages/RegisterPage';
import { ForgotPasswordPage } from '../../features/auth/pages/ForgotPasswordPage';
import { ResetPasswordPage } from '../../features/auth/pages/ResetPasswordPage';

export const AppRoutes: React.FC = () => {
  return (
    <Routes>
      {/* Public Authentication Routes (Outside AppLayout) */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />

      {/* Main Application Routes (Protected Layout) */}
      <Route element={<AppLayout />}>
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
  );
};
