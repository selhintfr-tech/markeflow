import React, { useState, useMemo, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Edit3,
  Plus,
  Building2,
  Calendar,
  Check,
  ArrowRight,
  FileText,
  CheckSquare,
  BarChart3,
  MoreHorizontal,
  X,
  File,
  Download,
} from 'lucide-react';
import { projectsList, initialMarketingProjectsList } from '../../data/mock';
import { StatusBadge } from '../../components/ui/StatusBadge';
import type { ProjectDetail, ProjectLinkedCampaign, ProjectTaskItem } from '../../types';

export const ProjectDetailsPage: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();

  // Load project dynamically:
  // 1. First check centralized projectsList
  // 2. Check localStorage/initialMarketingProjectsList
  // 3. Fallback to Autumn Sales Growth
  const resolvedProject = useMemo<ProjectDetail>(() => {
    // Exact match in projectsList
    const directMatch = projectsList.find((p) => p.id === projectId);
    if (directMatch) return directMatch;

    // Search in marketing projects
    let allMarketingProjects = initialMarketingProjectsList;
    try {
      const saved = localStorage.getItem('marketflow_projects_v2');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          allMarketingProjects = parsed;
        }
      }
    } catch {
      // ignore
    }

    const marketingMatch = allMarketingProjects.find((p) => p.id === projectId);
    if (marketingMatch) {
      return {
        id: marketingMatch.id,
        name: marketingMatch.name,
        status: marketingMatch.status as any,
        owner: {
          name: marketingMatch.owner.name,
          initials: marketingMatch.owner.initials,
          email: `${marketingMatch.owner.name.toLowerCase().replace(/\s+/g, '.')}@example.com`,
          role: 'Project Lead',
          workspaceName: marketingMatch.workspaceName,
          phone: '',
          language: 'English',
          timezone: 'UTC+01:00',
          memberSince: '2024',
        },
        workspace: marketingMatch.workspaceName,
        dateRange: `${marketingMatch.startDate} — ${marketingMatch.endDate}`,
        executiveSummary: marketingMatch.description,
        objectives: [
          'Deliver core marketing objectives on schedule and within scope',
          'Coordinate cross-channel acquisition and retention initiatives',
          'Track ROI and campaign performance against KPI benchmarks',
        ],
        progressPercentage: marketingMatch.progress,
        completedTasksCount: Math.round((marketingMatch.progress / 100) * 12),
        totalTasksCount: 12,
        achievedMilestonesCount: marketingMatch.progress > 50 ? 2 : 1,
        totalMilestonesCount: 3,
        milestones: [
          {
            id: 'm-1',
            number: 1,
            title: 'Initial kickoff & asset approval',
            status: marketingMatch.progress >= 30 ? 'Completed' : 'In progress',
            dueDate: marketingMatch.startDate,
          },
          {
            id: 'm-2',
            number: 2,
            title: 'Campaign launch and distribution',
            status: marketingMatch.progress >= 70 ? 'Completed' : 'Upcoming',
            dueDate: '15 Oct 2026',
          },
          {
            id: 'm-3',
            number: 3,
            title: 'Post-campaign review & reconciliation',
            status: marketingMatch.progress >= 100 ? 'Completed' : 'Upcoming',
            dueDate: marketingMatch.endDate,
          },
        ],
        linkedCampaigns: [
          {
            id: `camp-${marketingMatch.id}-1`,
            name: `${marketingMatch.name} Campaign`,
            channel: 'Multi-channel',
            status: 'Active',
            leads: 85,
            budget: 2500,
          },
        ],
        tasks: [
          {
            id: `t-${marketingMatch.id}-1`,
            title: 'Review creative assets and copy tone',
            assignee: { name: marketingMatch.owner.name, initials: marketingMatch.owner.initials },
            dueDate: '15 Oct 2026',
            status: 'Completed',
            checked: true,
          },
          {
            id: `t-${marketingMatch.id}-2`,
            title: 'Update audience segments in ad manager',
            assignee: { name: 'Imane Benkirane', initials: 'IB' },
            dueDate: '20 Oct 2026',
            status: 'In progress',
            checked: false,
          },
        ],
        taskCompletionCount: Math.round((marketingMatch.progress / 100) * 12),
        taskCompletionTotal: 12,
        taskCompletionPercentage: marketingMatch.progress,
        budget: {
          allocated: 5000,
          spent: Math.round(5000 * (marketingMatch.progress / 100)),
          remaining: 5000 - Math.round(5000 * (marketingMatch.progress / 100)),
          utilizationPercentage: marketingMatch.progress,
          currency: 'MAD',
        },
      };
    }

    // Default to Autumn Sales Growth (projectsList[0])
    return projectsList[0];
  }, [projectId]);

  const [project, setProject] = useState<ProjectDetail>(resolvedProject);
  const [activeTab, setActiveTab] = useState('Overview');

  // Sync state if resolved project changes
  useEffect(() => {
    setProject(resolvedProject);
  }, [resolvedProject]);

  // Interactive Task item checks
  const [taskItems, setTaskItems] = useState<ProjectTaskItem[]>(resolvedProject.tasks);
  useEffect(() => {
    setTaskItems(resolvedProject.tasks);
  }, [resolvedProject]);

  // Dialog modals
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isAddCampaignModalOpen, setIsAddCampaignModalOpen] = useState(false);

  // Edit project state
  const [editName, setEditName] = useState(resolvedProject.name);
  const [editSummary, setEditSummary] = useState(resolvedProject.executiveSummary);

  // Add campaign state
  const [newCampaignName, setNewCampaignName] = useState('');
  const [newCampaignChannel, setNewCampaignChannel] = useState('Paid Social');
  const [newCampaignBudget, setNewCampaignBudget] = useState('2000');

  const tabs = [
    'Overview',
    'Strategy',
    'Campaigns',
    'Tasks',
    'Budget',
    'Files',
    'Activity',
  ];

  const handleToggleTask = (taskId: string) => {
    setTaskItems((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, checked: !t.checked } : t))
    );
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    setProject((prev) => ({
      ...prev,
      name: editName,
      executiveSummary: editSummary,
    }));
    setIsEditModalOpen(false);
  };

  const handleAddCampaign = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCampaignName.trim()) return;

    const newCamp: ProjectLinkedCampaign = {
      id: `camp-${Date.now()}`,
      name: newCampaignName,
      channel: newCampaignChannel,
      status: 'Active',
      leads: 0,
      budget: parseInt(newCampaignBudget, 10) || 0,
    };

    setProject((prev) => ({
      ...prev,
      linkedCampaigns: [...prev.linkedCampaigns, newCamp],
    }));
    setNewCampaignName('');
    setIsAddCampaignModalOpen(false);
  };

  // SVG Gauge calculations for Project Progress (Teal, 72%)
  const progressRadius = 40;
  const progressCircumference = 2 * Math.PI * progressRadius;
  const progressOffset =
    progressCircumference -
    (project.progressPercentage / 100) * progressCircumference;

  // SVG Gauge calculations for Budget Overview (Teal, 72%)
  const budgetRadius = 46;
  const budgetCircumference = 2 * Math.PI * budgetRadius;
  const budgetOffset =
    budgetCircumference -
    (project.budget.utilizationPercentage / 100) * budgetCircumference;

  return (
    <div className="space-y-5">
      {/* 1. Breadcrumbs */}
      <div className="flex items-center gap-1.5 text-xs text-[#64748B]">
        <Link to="/projects" className="hover:text-[#1E1B4B] transition-colors">
          Projects
        </Link>
        <span className="text-[#94A3B8]">/</span>
        <span className="text-[#1E1B4B] font-medium">{project.name}</span>
      </div>

      {/* 2. Header: Title, Actions, and Metadata Strip */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#1E1B4B]">
            {project.name}
          </h1>

          {/* Metadata Strip */}
          <div className="flex flex-wrap items-center gap-4 mt-2.5 text-xs text-[#64748B]">
            <StatusBadge status={project.status} />

            <div className="h-3 w-[1px] bg-[#E2E8F0]" />

            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-full bg-[#EDE9FE] text-[#6D28D9] flex items-center justify-center font-bold text-[10px]">
                {project.owner.initials}
              </div>
              <div className="leading-tight">
                <span className="font-semibold text-[#1E1B4B] block">
                  {project.owner.name}
                </span>
                <span className="text-[10px] text-[#94A3B8]">Owner</span>
              </div>
            </div>

            <div className="h-3 w-[1px] bg-[#E2E8F0]" />

            <div className="flex items-center gap-1.5">
              <Building2 className="w-4 h-4 text-[#94A3B8]" />
              <div className="leading-tight">
                <span className="font-semibold text-[#1E1B4B] block">
                  {project.workspace}
                </span>
                <span className="text-[10px] text-[#94A3B8]">Workspace</span>
              </div>
            </div>

            <div className="h-3 w-[1px] bg-[#E2E8F0]" />

            <div className="flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-[#94A3B8]" />
              <div className="leading-tight">
                <span className="font-semibold text-[#1E1B4B] block">
                  {project.dateRange}
                </span>
                <span className="text-[10px] text-[#94A3B8]">Date range</span>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => {
              setEditName(project.name);
              setEditSummary(project.executiveSummary);
              setIsEditModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-[#E2E8F0] bg-white text-xs font-semibold text-[#6D28D9] hover:bg-slate-50 transition-colors shadow-2xs"
          >
            <Edit3 className="w-3.5 h-3.5 text-[#6D28D9]" />
            <span>Edit Project</span>
          </button>
          <button
            type="button"
            onClick={() => setIsAddCampaignModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#6D28D9] hover:bg-[#5B21B6] text-white text-xs font-semibold shadow-2xs transition-all"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Add Campaign</span>
          </button>
        </div>
      </div>

      {/* 3. Project Horizontal Tabs */}
      <div className="border-b border-[#E2E8F0]">
        <nav className="flex space-x-7">
          {tabs.map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`py-3 text-xs font-semibold border-b-2 transition-all relative ${
                activeTab === tab
                  ? 'border-[#6D28D9] text-[#6D28D9]'
                  : 'border-transparent text-[#64748B] hover:text-[#1E1B4B]'
              }`}
            >
              {tab}
            </button>
          ))}
        </nav>
      </div>

      {/* 4. Tab Content */}
      {activeTab === 'Overview' && (
        <div className="space-y-6">
          {/* FIRST ROW — THREE CARDS */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Card 1: Executive Summary */}
            <div className="bg-white rounded-xl border border-[#E2E8F0] p-5 shadow-xs flex flex-col justify-between">
              <div>
                <h2 className="text-sm font-bold text-[#1E1B4B]">Executive summary</h2>
                <p className="text-xs text-[#475569] mt-2.5 leading-relaxed">
                  {project.executiveSummary}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-4 pt-3.5 mt-5 border-t border-[#F1F5F9] text-xs font-semibold text-[#6D28D9]">
                <Link
                  to="/strategies"
                  className="flex items-center gap-1.5 hover:text-[#5B21B6] transition-colors"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>View Strategy</span>
                </Link>
                <Link
                  to="/tasks"
                  className="flex items-center gap-1.5 hover:text-[#5B21B6] transition-colors"
                >
                  <CheckSquare className="w-3.5 h-3.5" />
                  <span>Open Tasks</span>
                </Link>
                <Link
                  to="/finance/budget"
                  className="flex items-center gap-1.5 hover:text-[#5B21B6] transition-colors"
                >
                  <BarChart3 className="w-3.5 h-3.5" />
                  <span>Budget &amp; Expenses</span>
                </Link>
              </div>
            </div>

            {/* Card 2: Objectives */}
            <div className="bg-white rounded-xl border border-[#E2E8F0] p-5 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2.5">
                  <h2 className="text-sm font-bold text-[#1E1B4B]">Objectives</h2>
                  <Link
                    to="/strategies"
                    className="inline-flex items-center gap-1 text-xs font-semibold text-[#6D28D9] hover:text-[#5B21B6] transition-colors"
                  >
                    <span>Open Strategy</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>

                <div className="space-y-2.5 mt-3">
                  {project.objectives.map((obj, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <div className="p-0.5 rounded-full bg-[#CCFBF1] text-[#0D9488] shrink-0 mt-0.5">
                        <Check className="w-3 h-3 stroke-[3]" />
                      </div>
                      <span className="text-xs text-[#1E1B4B] font-medium leading-relaxed">
                        {obj}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Card 3: Project Progress */}
            <div className="bg-white rounded-xl border border-[#E2E8F0] p-5 shadow-xs flex flex-col justify-between">
              <h2 className="text-sm font-bold text-[#1E1B4B] mb-1">Project progress</h2>

              <div className="flex items-center justify-around my-2">
                {/* Circular Gauge 72% */}
                <div className="relative w-24 h-24 flex items-center justify-center shrink-0">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                    <circle
                      cx="50"
                      cy="50"
                      r={progressRadius}
                      stroke="#F1F5F9"
                      strokeWidth="10"
                      fill="transparent"
                    />
                    <circle
                      cx="50"
                      cy="50"
                      r={progressRadius}
                      stroke="#0D9488"
                      strokeWidth="10"
                      fill="transparent"
                      strokeDasharray={progressCircumference}
                      strokeDashoffset={progressOffset}
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-xl font-bold text-[#1E1B4B]">
                      {project.progressPercentage}%
                    </span>
                  </div>
                </div>

                {/* Metrics on the right */}
                <div className="space-y-3 pl-3">
                  <div>
                    <span className="text-[11px] text-[#64748B] block">Completed tasks</span>
                    <span className="text-base font-bold text-[#1E1B4B]">
                      {project.completedTasksCount} / {project.totalTasksCount}
                    </span>
                  </div>
                  <div>
                    <span className="text-[11px] text-[#64748B] block">Milestones achieved</span>
                    <span className="text-base font-bold text-[#1E1B4B]">
                      {project.achievedMilestonesCount} / {project.totalMilestonesCount}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* SECOND ROW — TWO CARDS */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Card: Milestones */}
            <div className="bg-white rounded-xl border border-[#E2E8F0] p-5 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-bold text-[#1E1B4B]">Milestones</h2>
                <Link
                  to="/tasks"
                  className="inline-flex items-center gap-1 text-xs font-semibold text-[#6D28D9] hover:text-[#5B21B6] transition-colors"
                >
                  <span>View all tasks</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="text-[#64748B] font-semibold border-b border-[#F1F5F9] text-[11px]">
                      <th className="pb-2 font-semibold">Milestone</th>
                      <th className="pb-2 font-semibold">Status</th>
                      <th className="pb-2 font-semibold">Due date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F8FAFC]">
                    {project.milestones.map((m) => (
                      <tr key={m.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-2.5 pr-3 font-semibold text-[#1E1B4B]">
                          <div className="flex items-center gap-2.5">
                            <span className="w-5 h-5 rounded-full bg-[#F1F5F9] text-[#64748B] font-bold text-[10px] flex items-center justify-center shrink-0">
                              {m.number}
                            </span>
                            <span>{m.title}</span>
                          </div>
                        </td>
                        <td className="py-2.5 pr-3">
                          <StatusBadge status={m.status} />
                        </td>
                        <td className="py-2.5 text-[#64748B]">{m.dueDate}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Card: Linked campaigns */}
            <div className="bg-white rounded-xl border border-[#E2E8F0] p-5 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-bold text-[#1E1B4B]">Linked campaigns</h2>
                <button
                  type="button"
                  onClick={() => setIsAddCampaignModalOpen(true)}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-[#6D28D9] hover:text-[#5B21B6] transition-colors"
                >
                  <span>Add campaign</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="text-[#64748B] font-semibold border-b border-[#F1F5F9] text-[11px]">
                      <th className="pb-2 font-semibold">Campaign</th>
                      <th className="pb-2 font-semibold">Channel</th>
                      <th className="pb-2 font-semibold">Status</th>
                      <th className="pb-2 font-semibold">Leads</th>
                      <th className="pb-2 font-semibold">Budget</th>
                      <th className="pb-2 w-6"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F8FAFC]">
                    {project.linkedCampaigns.map((camp) => (
                      <tr key={camp.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-2.5 pr-3 font-semibold text-[#6D28D9] hover:underline cursor-pointer">
                          {camp.name}
                        </td>
                        <td className="py-2.5 pr-3 text-[#64748B]">{camp.channel}</td>
                        <td className="py-2.5 pr-3">
                          <StatusBadge status={camp.status} />
                        </td>
                        <td className="py-2.5 pr-3 text-[#1E1B4B]">
                          {camp.leads !== null ? camp.leads : '—'}
                        </td>
                        <td className="py-2.5 pr-3 font-medium text-[#1E1B4B]">
                          {camp.budget.toLocaleString()} MAD
                        </td>
                        <td className="py-2.5 text-right">
                          <button
                            type="button"
                            className="p-1 rounded text-[#94A3B8] hover:text-[#1E1B4B] hover:bg-slate-100 transition-colors"
                            aria-label="Options"
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
          </div>

          {/* THIRD ROW — TWO CARDS */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Card: Task completion */}
            <div className="bg-white rounded-xl border border-[#E2E8F0] p-5 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-sm font-bold text-[#1E1B4B]">Task completion</h2>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-[#64748B]">
                      {project.taskCompletionCount} of {project.taskCompletionTotal} tasks completed
                    </span>
                    <div className="w-24 bg-[#F1F5F9] rounded-full h-1.5 overflow-hidden">
                      <div
                        className="bg-[#6D28D9] h-1.5 rounded-full transition-all duration-500"
                        style={{ width: `${project.taskCompletionPercentage}%` }}
                      />
                    </div>
                    <span className="text-xs font-bold text-[#1E1B4B]">
                      {project.taskCompletionPercentage}%
                    </span>
                    <Link
                      to="/tasks"
                      className="inline-flex items-center gap-1 text-xs font-semibold text-[#6D28D9] hover:text-[#5B21B6] transition-colors"
                    >
                      <span>Open Tasks</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>

                {/* Task Table */}
                <div className="overflow-x-auto mt-3">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="text-[#64748B] font-semibold border-b border-[#F1F5F9] text-[11px]">
                        <th className="pb-2 font-semibold">Task</th>
                        <th className="pb-2 font-semibold">Assignee</th>
                        <th className="pb-2 font-semibold">Due date</th>
                        <th className="pb-2 font-semibold">Status</th>
                        <th className="pb-2 w-6"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#F8FAFC]">
                      {taskItems.map((task) => (
                        <tr key={task.id} className="hover:bg-slate-50/60 transition-colors">
                          <td className="py-2.5 pr-3 font-semibold text-[#1E1B4B]">
                            <div className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={task.checked}
                                onChange={() => handleToggleTask(task.id)}
                                className="w-3.5 h-3.5 rounded border-[#CBD5E1] text-[#6D28D9] focus:ring-[#6D28D9] cursor-pointer"
                              />
                              <span
                                className={
                                  task.checked && task.status === 'Completed'
                                    ? 'line-through text-[#94A3B8]'
                                    : ''
                                }
                              >
                                {task.title}
                              </span>
                            </div>
                          </td>
                          <td className="py-2.5 pr-3">
                            <div className="flex items-center gap-1.5">
                              <div className="w-5 h-5 rounded-full bg-[#EDE9FE] text-[#6D28D9] flex items-center justify-center font-bold text-[9px]">
                                {task.assignee.initials}
                              </div>
                              <span className="text-[#1E1B4B]">{task.assignee.name}</span>
                            </div>
                          </td>
                          <td className="py-2.5 pr-3 text-[#64748B]">{task.dueDate}</td>
                          <td className="py-2.5 pr-3">
                            <StatusBadge status={task.status} />
                          </td>
                          <td className="py-2.5 text-right">
                            <button
                              type="button"
                              className="p-1 rounded text-[#94A3B8] hover:text-[#1E1B4B] hover:bg-slate-100 transition-colors"
                              aria-label="Options"
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
            </div>

            {/* Card: Budget overview */}
            <div className="bg-white rounded-xl border border-[#E2E8F0] p-5 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-sm font-bold text-[#1E1B4B]">Budget overview</h2>
                  <Link
                    to="/finance/budget"
                    className="inline-flex items-center gap-1 text-xs font-semibold text-[#6D28D9] hover:text-[#5B21B6] transition-colors"
                  >
                    <span>Budget &amp; Expenses</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>

                <div className="flex items-center justify-around my-3">
                  {/* Teal circular ring 72% */}
                  <div className="relative w-28 h-28 flex items-center justify-center shrink-0">
                    <svg className="w-full h-full transform -rotate-90" viewBox="0 0 120 120">
                      <circle
                        cx="60"
                        cy="60"
                        r={budgetRadius}
                        stroke="#F1F5F9"
                        strokeWidth="12"
                        fill="transparent"
                      />
                      <circle
                        cx="60"
                        cy="60"
                        r={budgetRadius}
                        stroke="#0D9488"
                        strokeWidth="12"
                        fill="transparent"
                        strokeDasharray={budgetCircumference}
                        strokeDashoffset={budgetOffset}
                        strokeLinecap="round"
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                      <span className="text-xl font-bold text-[#1E1B4B]">
                        {project.budget.utilizationPercentage}%
                      </span>
                      <span className="text-[10px] text-[#64748B] font-medium">
                        Utilization
                      </span>
                    </div>
                  </div>

                  {/* Numerical breakdown */}
                  <div className="space-y-2.5 pl-3">
                    <div>
                      <span className="text-[11px] text-[#64748B] block">Allocated budget</span>
                      <span className="text-base font-bold text-[#1E1B4B]">
                        {project.budget.allocated.toLocaleString()} {project.budget.currency}
                      </span>
                    </div>
                    <div>
                      <span className="text-[11px] text-[#64748B] block">Spent</span>
                      <span className="text-base font-bold text-[#1E1B4B]">
                        {project.budget.spent.toLocaleString()} {project.budget.currency}
                      </span>
                    </div>
                    <div>
                      <span className="text-[11px] text-[#64748B] block">Remaining</span>
                      <span className="text-base font-bold text-[#0D9488]">
                        {project.budget.remaining.toLocaleString()} {project.budget.currency}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Strategy Tab */}
      {activeTab === 'Strategy' && (
        <div className="bg-white rounded-xl border border-[#E2E8F0] p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-[#F1F5F9] pb-4">
            <div>
              <h3 className="text-base font-bold text-[#1E1B4B]">Project Strategic Alignment</h3>
              <p className="text-xs text-[#64748B] mt-0.5">
                Core objectives and strategy maps supporting {project.name}.
              </p>
            </div>
            <Link
              to="/strategies"
              className="px-3 py-1.5 bg-[#6D28D9] text-white text-xs font-semibold rounded-lg hover:bg-[#5B21B6] transition-colors"
            >
              Open Full Strategy
            </Link>
          </div>
          <div className="space-y-3">
            {project.objectives.map((obj, i) => (
              <div key={i} className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg">
                <div className="p-1 rounded-full bg-[#CCFBF1] text-[#0D9488] shrink-0 mt-0.5">
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-[#1E1B4B]">Strategic Objective {i + 1}</h4>
                  <p className="text-xs text-[#475569] mt-0.5">{obj}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Campaigns Tab */}
      {activeTab === 'Campaigns' && (
        <div className="bg-white rounded-xl border border-[#E2E8F0] p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-[#F1F5F9] pb-4">
            <div>
              <h3 className="text-base font-bold text-[#1E1B4B]">Linked Campaigns</h3>
              <p className="text-xs text-[#64748B] mt-0.5">
                Campaigns associated with {project.name} execution.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsAddCampaignModalOpen(true)}
              className="px-3 py-1.5 bg-[#6D28D9] text-white text-xs font-semibold rounded-lg hover:bg-[#5B21B6] transition-colors flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Campaign</span>
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="text-[#64748B] font-semibold border-b border-[#F1F5F9]">
                  <th className="pb-2.5">Campaign</th>
                  <th className="pb-2.5">Channel</th>
                  <th className="pb-2.5">Status</th>
                  <th className="pb-2.5">Leads</th>
                  <th className="pb-2.5">Budget</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F8FAFC]">
                {project.linkedCampaigns.map((camp) => (
                  <tr key={camp.id} className="hover:bg-slate-50/60">
                    <td className="py-3 font-semibold text-[#6D28D9]">{camp.name}</td>
                    <td className="py-3 text-[#64748B]">{camp.channel}</td>
                    <td className="py-3">
                      <StatusBadge status={camp.status} />
                    </td>
                    <td className="py-3">{camp.leads !== null ? camp.leads : '—'}</td>
                    <td className="py-3 font-medium">{camp.budget.toLocaleString()} MAD</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tasks Tab */}
      {activeTab === 'Tasks' && (
        <div className="bg-white rounded-xl border border-[#E2E8F0] p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-[#F1F5F9] pb-4">
            <div>
              <h3 className="text-base font-bold text-[#1E1B4B]">Project Tasks</h3>
              <p className="text-xs text-[#64748B] mt-0.5">
                Action items required to deliver {project.name}.
              </p>
            </div>
            <Link
              to="/tasks"
              className="px-3 py-1.5 bg-[#6D28D9] text-white text-xs font-semibold rounded-lg hover:bg-[#5B21B6] transition-colors"
            >
              Open Tasks &amp; Workflow
            </Link>
          </div>
          <div className="space-y-2">
            {taskItems.map((task) => (
              <div
                key={task.id}
                onClick={() => handleToggleTask(task.id)}
                className="flex items-center justify-between p-3 rounded-lg border border-[#E2E8F0] hover:border-[#6D28D9]/40 cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={task.checked}
                    onChange={() => handleToggleTask(task.id)}
                    className="w-4 h-4 rounded border-[#CBD5E1] text-[#6D28D9] focus:ring-[#6D28D9]"
                  />
                  <span
                    className={`text-xs font-medium ${
                      task.checked && task.status === 'Completed'
                        ? 'line-through text-[#94A3B8]'
                        : 'text-[#1E1B4B]'
                    }`}
                  >
                    {task.title}
                  </span>
                </div>
                <div className="flex items-center gap-4 text-xs text-[#64748B]">
                  <span>{task.assignee.name}</span>
                  <span>{task.dueDate}</span>
                  <StatusBadge status={task.status} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Budget Tab */}
      {activeTab === 'Budget' && (
        <div className="bg-white rounded-xl border border-[#E2E8F0] p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-[#F1F5F9] pb-4">
            <div>
              <h3 className="text-base font-bold text-[#1E1B4B]">Financial Summary</h3>
              <p className="text-xs text-[#64748B] mt-0.5">
                Budget allocation and spend reconciliation for {project.name}.
              </p>
            </div>
            <Link
              to="/finance/budget"
              className="px-3 py-1.5 bg-[#6D28D9] text-white text-xs font-semibold rounded-lg hover:bg-[#5B21B6] transition-colors"
            >
              Full Budget Breakdown
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 bg-slate-50 rounded-xl border border-[#E2E8F0]">
              <span className="text-xs text-[#64748B] font-medium block">Allocated Budget</span>
              <span className="text-xl font-bold text-[#1E1B4B] mt-1 block">
                {project.budget.allocated.toLocaleString()} {project.budget.currency}
              </span>
            </div>
            <div className="p-4 bg-slate-50 rounded-xl border border-[#E2E8F0]">
              <span className="text-xs text-[#64748B] font-medium block">Actual Spend</span>
              <span className="text-xl font-bold text-[#1E1B4B] mt-1 block">
                {project.budget.spent.toLocaleString()} {project.budget.currency}
              </span>
            </div>
            <div className="p-4 bg-slate-50 rounded-xl border border-[#E2E8F0]">
              <span className="text-xs text-[#64748B] font-medium block">Remaining</span>
              <span className="text-xl font-bold text-[#0D9488] mt-1 block">
                {project.budget.remaining.toLocaleString()} {project.budget.currency}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Files Tab */}
      {activeTab === 'Files' && (
        <div className="bg-white rounded-xl border border-[#E2E8F0] p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-[#F1F5F9] pb-4">
            <div>
              <h3 className="text-base font-bold text-[#1E1B4B]">Project Files &amp; Assets</h3>
              <p className="text-xs text-[#64748B] mt-0.5">
                Creative assets, briefs, and documentation.
              </p>
            </div>
          </div>
          <div className="space-y-2.5">
            {[
              { name: `${project.name} Creative Brief.pdf`, size: '2.4 MB', date: '02 Oct 2026' },
              { name: 'Campaign-Budget-Plan.xlsx', size: '850 KB', date: '04 Oct 2026' },
              { name: 'Social-Ad-Templates.zip', size: '14.2 MB', date: '08 Oct 2026' },
            ].map((f) => (
              <div
                key={f.name}
                className="flex items-center justify-between p-3 rounded-lg border border-[#E2E8F0] hover:bg-slate-50"
              >
                <div className="flex items-center gap-2.5">
                  <File className="w-4 h-4 text-[#6D28D9]" />
                  <div>
                    <span className="text-xs font-semibold text-[#1E1B4B] block">{f.name}</span>
                    <span className="text-[10px] text-[#94A3B8]">
                      {f.size} • Uploaded {f.date}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  className="p-1.5 text-[#64748B] hover:text-[#6D28D9] rounded-lg transition-colors"
                >
                  <Download className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Activity Tab */}
      {activeTab === 'Activity' && (
        <div className="bg-white rounded-xl border border-[#E2E8F0] p-6 shadow-xs space-y-4">
          <div className="border-b border-[#F1F5F9] pb-4">
            <h3 className="text-base font-bold text-[#1E1B4B]">Project Activity Log</h3>
            <p className="text-xs text-[#64748B] mt-0.5">
              Chronological log of changes and milestone updates.
            </p>
          </div>
          <div className="space-y-4">
            {[
              {
                user: project.owner.name,
                action: 'marked milestone "Campaign launch" as completed',
                time: '12 Oct 2026, 14:30',
              },
              {
                user: 'Yassine Bouchra',
                action: 'updated linked campaign "Retargeting Boost" budget',
                time: '10 Oct 2026, 11:15',
              },
              {
                user: project.owner.name,
                action: 'created the project and established timeline',
                time: '01 Oct 2026, 09:00',
              },
            ].map((act, i) => (
              <div key={i} className="flex items-start gap-3 text-xs">
                <div className="w-2 h-2 rounded-full bg-[#6D28D9] mt-1.5 shrink-0" />
                <div>
                  <span className="font-bold text-[#1E1B4B]">{act.user}</span>{' '}
                  <span className="text-[#475569]">{act.action}</span>
                  <span className="text-[10px] text-[#94A3B8] block mt-0.5">{act.time}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* --- EDIT PROJECT MODAL --- */}
      {isEditModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-xl w-full max-w-lg p-6 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-4 border-b border-[#E2E8F0]">
              <h3 className="text-base font-bold text-[#1E1B4B]">Edit Project</h3>
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="text-[#94A3B8] hover:text-[#1E1B4B]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveEdit} className="space-y-4 pt-4">
              <div>
                <label className="block text-xs font-semibold text-[#1E1B4B] mb-1">
                  Project Name
                </label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-[#E2E8F0] text-xs text-[#1E1B4B] focus:ring-1 focus:ring-[#6D28D9] outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#1E1B4B] mb-1">
                  Executive Summary
                </label>
                <textarea
                  rows={4}
                  value={editSummary}
                  onChange={(e) => setEditSummary(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-[#E2E8F0] text-xs text-[#1E1B4B] focus:ring-1 focus:ring-[#6D28D9] outline-none"
                  required
                />
              </div>
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#F1F5F9]">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-3.5 py-2 rounded-lg border border-[#E2E8F0] text-xs font-semibold text-[#64748B] hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-[#6D28D9] hover:bg-[#5B21B6] text-white text-xs font-semibold shadow-2xs"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- ADD CAMPAIGN MODAL --- */}
      {isAddCampaignModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-xl w-full max-w-lg p-6 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-4 border-b border-[#E2E8F0]">
              <h3 className="text-base font-bold text-[#1E1B4B]">Add Campaign</h3>
              <button
                type="button"
                onClick={() => setIsAddCampaignModalOpen(false)}
                className="text-[#94A3B8] hover:text-[#1E1B4B]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAddCampaign} className="space-y-4 pt-4">
              <div>
                <label className="block text-xs font-semibold text-[#1E1B4B] mb-1">
                  Campaign Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Winter Flash Sale"
                  value={newCampaignName}
                  onChange={(e) => setNewCampaignName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-[#E2E8F0] text-xs text-[#1E1B4B] focus:ring-1 focus:ring-[#6D28D9] outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#1E1B4B] mb-1">
                  Channel
                </label>
                <select
                  value={newCampaignChannel}
                  onChange={(e) => setNewCampaignChannel(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-[#E2E8F0] text-xs text-[#1E1B4B] focus:ring-1 focus:ring-[#6D28D9] outline-none"
                >
                  <option value="Paid Social">Paid Social</option>
                  <option value="Multi-channel">Multi-channel</option>
                  <option value="Email">Email</option>
                  <option value="Search">Search</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#1E1B4B] mb-1">
                  Budget (MAD)
                </label>
                <input
                  type="number"
                  value={newCampaignBudget}
                  onChange={(e) => setNewCampaignBudget(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-[#E2E8F0] text-xs text-[#1E1B4B] focus:ring-1 focus:ring-[#6D28D9] outline-none"
                  required
                />
              </div>
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#F1F5F9]">
                <button
                  type="button"
                  onClick={() => setIsAddCampaignModalOpen(false)}
                  className="px-3.5 py-2 rounded-lg border border-[#E2E8F0] text-xs font-semibold text-[#64748B] hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-[#6D28D9] hover:bg-[#5B21B6] text-white text-xs font-semibold shadow-2xs"
                >
                  Create Campaign
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
export default ProjectDetailsPage;
