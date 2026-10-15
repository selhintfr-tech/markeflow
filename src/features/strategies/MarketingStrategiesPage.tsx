import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Target,
  Plus,
  Building2,
  Calendar,
  Users,
  ShoppingCart,
  UserPlus,
  ArrowRight,
  Share2,
  Mail,
  Search,
  FileText,
  Compass,
  Briefcase,
  Megaphone,
  ChevronRight,
  X,
} from 'lucide-react';
import { defaultStrategyData } from '../../data/mock';
import { StatusBadge } from '../../components/ui/StatusBadge';
import type {
  StrategyDetail,
  StrategicInitiative,
} from '../../types';

export const MarketingStrategiesPage: React.FC = () => {
  const [strategy, setStrategy] = useState<StrategyDetail>(defaultStrategyData);
  const [activeTab, setActiveTab] = useState('Overview');

  // Modals
  const [isCreateStrategyModalOpen, setIsCreateStrategyModalOpen] = useState(false);
  const [isAddInitiativeModalOpen, setIsAddInitiativeModalOpen] = useState(false);

  // Form states
  const [newInitName, setNewInitName] = useState('');
  const [newInitArea, setNewInitArea] = useState('Positioning');
  const [newInitOwner, setNewInitOwner] = useState('Sara El Amrani');
  const [newInitNextStep, setNewInitNextStep] = useState('');

  const [createTitle, setCreateTitle] = useState('');
  const [createDesc, setCreateDesc] = useState('');

  const tabs = ['Overview', 'Objectives', 'Positioning', 'Channels', 'Initiatives'];

  // SVG circular completion indicator (Teal, 68%)
  const completionRadius = 40;
  const completionCircumference = 2 * Math.PI * completionRadius;
  const completionOffset =
    completionCircumference -
    (strategy.completionPercentage / 100) * completionCircumference;

  // Escape key handler for active modals
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isCreateStrategyModalOpen) setIsCreateStrategyModalOpen(false);
        else if (isAddInitiativeModalOpen) setIsAddInitiativeModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isCreateStrategyModalOpen, isAddInitiativeModalOpen]);

  const handleAddInitiative = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newInitName.trim()) return;

    const newInit: StrategicInitiative = {
      id: `init-${Date.now()}`,
      name: newInitName,
      relatedArea: newInitArea,
      status: 'In progress',
      owner: {
        name: newInitOwner,
        initials: newInitOwner
          .split(' ')
          .map((n) => n[0])
          .join('')
          .toUpperCase(),
      },
      nextStep: newInitNextStep || 'Initial assessment',
    };

    setStrategy((prev) => ({
      ...prev,
      initiatives: [...prev.initiatives, newInit],
      initiativesInProgressCount: prev.initiativesInProgressCount + 1,
    }));

    setNewInitName('');
    setNewInitNextStep('');
    setIsAddInitiativeModalOpen(false);
  };

  const handleCreateStrategy = (e: React.FormEvent) => {
    e.preventDefault();
    if (!createTitle.trim()) return;

    setStrategy((prev) => ({
      ...prev,
      title: createTitle,
      overviewDescription: createDesc || prev.overviewDescription,
    }));

    setCreateTitle('');
    setCreateDesc('');
    setIsCreateStrategyModalOpen(false);
  };

  // Helper for audience icon
  const renderAudienceIcon = (type: string) => {
    switch (type) {
      case 'users':
        return (
          <div className="p-2.5 rounded-xl bg-[#EDE9FE] text-[#6D28D9] shrink-0">
            <Users className="w-5 h-5" />
          </div>
        );
      case 'cart':
        return (
          <div className="p-2.5 rounded-xl bg-[#CCFBF1] text-[#0D9488] shrink-0">
            <ShoppingCart className="w-5 h-5" />
          </div>
        );
      case 'lookalike':
      default:
        return (
          <div className="p-2.5 rounded-xl bg-[#EDE9FE] text-[#6D28D9] shrink-0">
            <UserPlus className="w-5 h-5" />
          </div>
        );
    }
  };

  // Helper for channel icon
  const renderChannelIcon = (type: string) => {
    switch (type) {
      case 'social':
        return <Share2 className="w-4 h-4 text-[#6D28D9]" />;
      case 'email':
        return <Mail className="w-4 h-4 text-[#6D28D9]" />;
      case 'search':
        return <Search className="w-4 h-4 text-[#6D28D9]" />;
      case 'content':
      default:
        return <FileText className="w-4 h-4 text-[#6D28D9]" />;
    }
  };

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto pb-12">
      {/* 1. Breadcrumbs */}
      <div className="flex items-center gap-1.5 text-xs text-[#64748B]">
        <span>Management</span>
        <span>/</span>
        <span className="text-[#1E1B4B] font-medium">Strategies</span>
      </div>

      {/* 2. Page Heading & Primary Action */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-extrabold tracking-tight text-[#1E1B4B]">
            Marketing Strategies
          </h1>
          <p className="text-sm text-[#64748B] mt-1">
            Turn business objectives into structured marketing plans
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsCreateStrategyModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#6D28D9] hover:bg-[#5B21B6] text-white text-xs font-semibold shadow-xs hover:shadow-md transition-all self-start md:self-auto"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>Create strategy</span>
        </button>
      </div>

      {/* 3. Strategy Header Card with Target Icon & Metadata */}
      <div className="bg-white rounded-xl border border-[#E2E8F0] p-6 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            {/* Pale-purple circular container with target icon */}
            <div className="w-12 h-12 rounded-full bg-[#EDE9FE] flex items-center justify-center shrink-0">
              <Target className="w-6 h-6 text-[#6D28D9]" />
            </div>

            <div>
              <h2 className="text-lg lg:text-xl font-extrabold text-[#1E1B4B]">
                {strategy.title}
              </h2>
              <div className="text-xs text-[#64748B] mt-1">
                Linked to project:{' '}
                <Link
                  to={`/projects/${strategy.projectId}`}
                  className="font-semibold text-[#6D28D9] hover:underline"
                >
                  {strategy.projectName}
                </Link>
              </div>
            </div>
          </div>

          {/* Metadata badges / strip */}
          <div className="flex flex-wrap items-center gap-5 text-xs text-[#64748B]">
            <div>
              <StatusBadge status={strategy.status} />
              <span className="text-[10px] text-[#94A3B8] block text-center mt-0.5">
                Status
              </span>
            </div>

            <div className="h-6 w-[1px] bg-[#E2E8F0]" />

            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-[#EDE9FE] text-[#6D28D9] flex items-center justify-center font-bold text-[10px]">
                {strategy.owner.initials}
              </div>
              <div className="leading-tight">
                <span className="font-semibold text-[#1E1B4B] block">
                  {strategy.owner.name}
                </span>
                <span className="text-[10px] text-[#94A3B8]">Owner</span>
              </div>
            </div>

            <div className="h-6 w-[1px] bg-[#E2E8F0]" />

            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-[#94A3B8]" />
              <div className="leading-tight">
                <span className="font-semibold text-[#1E1B4B] block">
                  {strategy.workspace}
                </span>
                <span className="text-[10px] text-[#94A3B8]">Workspace</span>
              </div>
            </div>

            <div className="h-6 w-[1px] bg-[#E2E8F0]" />

            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-[#94A3B8]" />
              <div className="leading-tight">
                <span className="font-semibold text-[#1E1B4B] block">
                  {strategy.period}
                </span>
                <span className="text-[10px] text-[#94A3B8]">Period</span>
              </div>
            </div>
          </div>
        </div>

        {/* Strategy Tabs */}
        <div className="border-t border-[#F1F5F9] mt-6 pt-1">
          <nav className="flex space-x-8">
            {tabs.map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`py-3 text-sm font-semibold border-b-2 transition-all relative ${
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
      </div>

      {/* 4. FIRST ROW — THREE CARDS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Card 1: Strategy overview */}
        <div className="bg-white rounded-xl border border-[#E2E8F0] p-6 shadow-xs flex flex-col justify-between">
          <div>
            <h2 className="text-base font-bold text-[#1E1B4B]">Strategy overview</h2>
            <p className="text-xs text-[#64748B] mt-3 leading-relaxed">
              {strategy.overviewDescription}
            </p>
          </div>

          <div className="flex items-center gap-4 pt-4 mt-6 border-t border-[#F1F5F9] text-xs font-semibold text-[#6D28D9]">
            <Link
              to="/market-research"
              className="flex items-center gap-1.5 hover:text-[#5B21B6] transition-colors"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Market Research</span>
            </Link>
            <Link
              to={`/strategies/${strategy.id}/swot`}
              className="flex items-center gap-1.5 hover:text-[#5B21B6] transition-colors"
            >
              <Compass className="w-3.5 h-3.5" />
              <span>SWOT Analysis</span>
            </Link>
            <Link
              to="/audiences"
              className="flex items-center gap-1.5 hover:text-[#5B21B6] transition-colors"
            >
              <Users className="w-3.5 h-3.5" />
              <span>Audiences</span>
            </Link>
          </div>
        </div>

        {/* Card 2: Target audience */}
        <div className="bg-white rounded-xl border border-[#E2E8F0] p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-[#1E1B4B]">Target audience</h2>
              <Link
                to="/audiences"
                className="inline-flex items-center gap-1 text-xs font-semibold text-[#6D28D9] hover:text-[#5B21B6] transition-colors"
              >
                <span>Open Audiences</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="space-y-3.5">
              {strategy.audiences.map((aud) => (
                <div key={aud.id} className="flex items-start gap-3">
                  {renderAudienceIcon(aud.iconType)}
                  <div>
                    <h3 className="text-xs font-bold text-[#1E1B4B]">
                      {aud.title}
                    </h3>
                    <p className="text-[11px] text-[#64748B] mt-0.5 leading-relaxed">
                      {aud.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Card 3: Strategy status */}
        <div className="bg-white rounded-xl border border-[#E2E8F0] p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-base font-bold text-[#1E1B4B]">Strategy status</h2>
              <StatusBadge status={strategy.status} />
            </div>

            <div className="flex items-center justify-around my-3">
              {/* Teal circular ring 68% */}
              <div className="relative w-28 h-28 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                  <circle
                    cx="50"
                    cy="50"
                    r={completionRadius}
                    stroke="#F1F5F9"
                    strokeWidth="10"
                    fill="transparent"
                  />
                  <circle
                    cx="50"
                    cy="50"
                    r={completionRadius}
                    stroke="#0D9488"
                    strokeWidth="10"
                    fill="transparent"
                    strokeDasharray={completionCircumference}
                    strokeDashoffset={completionOffset}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                  <span className="text-2xl font-extrabold text-[#1E1B4B]">
                    {strategy.completionPercentage}%
                  </span>
                  <span className="text-[10px] text-[#64748B] font-medium">
                    Completion
                  </span>
                </div>
              </div>

              {/* Metrics breakdown */}
              <div className="space-y-2.5 pl-2">
                <div>
                  <span className="text-[11px] text-[#64748B] block">Objectives on track</span>
                  <span className="text-base font-bold text-[#1E1B4B]">
                    {strategy.objectivesOnTrack} / {strategy.objectivesTotal}
                  </span>
                </div>
                <div>
                  <span className="text-[11px] text-[#64748B] block">Channels active</span>
                  <span className="text-base font-bold text-[#1E1B4B]">
                    {strategy.channelsActive} / {strategy.channelsTotal}
                  </span>
                </div>
                <div>
                  <span className="text-[11px] text-[#64748B] block">Initiatives in progress</span>
                  <span className="text-base font-bold text-[#1E1B4B]">
                    {strategy.initiativesInProgressCount}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 5. SECOND ROW — TWO CARDS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Card: Measurable objectives (2/3 width) */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-[#E2E8F0] p-6 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-[#1E1B4B]">Measurable objectives</h2>
            <Link
              to="/projects"
              className="inline-flex items-center gap-1 text-xs font-semibold text-[#6D28D9] hover:text-[#5B21B6] transition-colors"
            >
              <span>Open Projects</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="text-[#64748B] font-medium border-b border-[#F1F5F9]">
                  <th className="pb-2.5 font-medium">KPI</th>
                  <th className="pb-2.5 font-medium">Target</th>
                  <th className="pb-2.5 font-medium w-48">Current Progress</th>
                  <th className="pb-2.5 font-medium">Owner</th>
                  <th className="pb-2.5 font-medium">Deadline</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F8FAFC]">
                {strategy.objectives.map((obj) => {
                  // Determine progress bar color based on screenshot
                  let barColor = 'bg-[#6D28D9]';
                  if (obj.statusType === 'teal') barColor = 'bg-[#0D9488]';
                  if (obj.statusType === 'warning') barColor = 'bg-[#CBD5E1]'; // 0% placeholder

                  return (
                    <tr key={obj.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3.5 pr-3 font-semibold text-[#1E1B4B]">
                        {obj.kpi}
                      </td>
                      <td className="py-3.5 pr-3 text-[#64748B]">{obj.target}</td>
                      <td className="py-3.5 pr-3">
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="text-[#1E1B4B] font-medium">
                              {obj.currentProgressText}
                            </span>
                            <span className="font-semibold text-[#64748B]">
                              {obj.progressPercentage}%
                            </span>
                          </div>
                          <div className="w-full bg-[#F1F5F9] rounded-full h-1.5 overflow-hidden">
                            <div
                              className={`${barColor} h-1.5 rounded-full`}
                              style={{ width: `${obj.progressPercentage}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 pr-3">
                        <div className="flex items-center gap-1.5">
                          <div className="w-5 h-5 rounded-full bg-[#EDE9FE] text-[#6D28D9] flex items-center justify-center font-bold text-[9px]">
                            {obj.owner.initials}
                          </div>
                          <span className="text-[#1E1B4B]">{obj.owner.name}</span>
                        </div>
                      </td>
                      <td className="py-3.5 text-[#64748B]">{obj.deadline}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Card: Channel allocation (1/3 width) */}
        <div className="lg:col-span-1 bg-white rounded-xl border border-[#E2E8F0] p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-[#1E1B4B]">Channel allocation</h2>
              <Link
                to="/campaigns"
                className="inline-flex items-center gap-1 text-xs font-semibold text-[#6D28D9] hover:text-[#5B21B6] transition-colors"
              >
                <span>Open Campaigns</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="space-y-4">
              {strategy.channelAllocations.map((ch) => (
                <div key={ch.id} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      {renderChannelIcon(ch.iconType)}
                      <span className="font-semibold text-[#1E1B4B]">{ch.channel}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-[#1E1B4B]">{ch.percentage}%</span>
                      <span className="px-2 py-0.5 rounded-full bg-[#F1F5F9] text-[10px] font-medium text-[#64748B]">
                        {ch.badge}
                      </span>
                    </div>
                  </div>
                  {/* Purple progress bar */}
                  <div className="w-full bg-[#F1F5F9] rounded-full h-1.5 overflow-hidden">
                    <div
                      className="bg-[#6D28D9] h-1.5 rounded-full"
                      style={{ width: `${ch.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 6. THIRD ROW — TWO CARDS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Card: Strategic initiatives (2/3 width) */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-[#E2E8F0] p-6 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-[#1E1B4B]">Strategic initiatives</h2>
            <button
              type="button"
              onClick={() => setIsAddInitiativeModalOpen(true)}
              className="inline-flex items-center gap-1 text-xs font-semibold text-[#6D28D9] hover:text-[#5B21B6] transition-colors"
            >
              <span>Add initiative</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="text-[#64748B] font-medium border-b border-[#F1F5F9]">
                  <th className="pb-2.5 font-medium">Initiative</th>
                  <th className="pb-2.5 font-medium">Related Area</th>
                  <th className="pb-2.5 font-medium">Status</th>
                  <th className="pb-2.5 font-medium">Owner</th>
                  <th className="pb-2.5 font-medium">Next Step</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F8FAFC]">
                {strategy.initiatives.map((init) => (
                  <tr key={init.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3.5 pr-3 font-semibold text-[#1E1B4B]">
                      {init.name}
                    </td>
                    <td className="py-3.5 pr-3 text-[#64748B]">{init.relatedArea}</td>
                    <td className="py-3.5 pr-3">
                      <StatusBadge status={init.status} />
                    </td>
                    <td className="py-3.5 pr-3">
                      <div className="flex items-center gap-1.5">
                        <div className="w-5 h-5 rounded-full bg-[#EDE9FE] text-[#6D28D9] flex items-center justify-center font-bold text-[9px]">
                          {init.owner.initials}
                        </div>
                        <span className="text-[#1E1B4B]">{init.owner.name}</span>
                      </div>
                    </td>
                    <td className="py-3.5 text-[#64748B]">{init.nextStep}</td>
                  </tr>
                ))}
                {strategy.initiatives.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-xs text-[#94A3B8]">
                      No strategic initiatives added yet. Click "Add initiative" above to record one.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Card: Connected areas (1/3 width) */}
        <div className="lg:col-span-1 bg-white rounded-xl border border-[#E2E8F0] p-6 shadow-xs flex flex-col justify-between">
          <div>
            <h2 className="text-base font-bold text-[#1E1B4B]">Connected areas</h2>
            <p className="text-xs text-[#64748B] mt-1 leading-relaxed">
              This strategy connects market research, audience planning, execution, and campaign measurement.
            </p>

            <div className="space-y-2 mt-4">
              <Link
                to="/market-research"
                className="flex items-center justify-between p-2.5 rounded-lg border border-[#F1F5F9] hover:border-[#E2E8F0] hover:bg-slate-50/70 transition-colors group"
              >
                <div className="flex items-center gap-2.5">
                  <FileText className="w-4 h-4 text-[#6D28D9]" />
                  <span className="text-xs font-semibold text-[#1E1B4B] group-hover:text-[#6D28D9]">
                    Market Research
                  </span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-[#94A3B8] group-hover:text-[#6D28D9]" />
              </Link>

              <Link
                to={`/strategies/${strategy.id}/swot`}
                className="flex items-center justify-between p-2.5 rounded-lg border border-[#F1F5F9] hover:border-[#E2E8F0] hover:bg-slate-50/70 transition-colors group"
              >
                <div className="flex items-center gap-2.5">
                  <Compass className="w-4 h-4 text-[#6D28D9]" />
                  <span className="text-xs font-semibold text-[#1E1B4B] group-hover:text-[#6D28D9]">
                    SWOT Analysis
                  </span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-[#94A3B8] group-hover:text-[#6D28D9]" />
              </Link>

              <Link
                to="/audiences"
                className="flex items-center justify-between p-2.5 rounded-lg border border-[#F1F5F9] hover:border-[#E2E8F0] hover:bg-slate-50/70 transition-colors group"
              >
                <div className="flex items-center gap-2.5">
                  <Users className="w-4 h-4 text-[#6D28D9]" />
                  <span className="text-xs font-semibold text-[#1E1B4B] group-hover:text-[#6D28D9]">
                    Audiences
                  </span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-[#94A3B8] group-hover:text-[#6D28D9]" />
              </Link>

              <Link
                to="/projects"
                className="flex items-center justify-between p-2.5 rounded-lg border border-[#F1F5F9] hover:border-[#E2E8F0] hover:bg-slate-50/70 transition-colors group"
              >
                <div className="flex items-center gap-2.5">
                  <Briefcase className="w-4 h-4 text-[#6D28D9]" />
                  <span className="text-xs font-semibold text-[#1E1B4B] group-hover:text-[#6D28D9]">
                    Projects
                  </span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-[#94A3B8] group-hover:text-[#6D28D9]" />
              </Link>

              <Link
                to="/campaigns"
                className="flex items-center justify-between p-2.5 rounded-lg border border-[#F1F5F9] hover:border-[#E2E8F0] hover:bg-slate-50/70 transition-colors group"
              >
                <div className="flex items-center gap-2.5">
                  <Megaphone className="w-4 h-4 text-[#6D28D9]" />
                  <span className="text-xs font-semibold text-[#1E1B4B] group-hover:text-[#6D28D9]">
                    Campaigns
                  </span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-[#94A3B8] group-hover:text-[#6D28D9]" />
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* --- CREATE STRATEGY MODAL --- */}
      {isCreateStrategyModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4" role="dialog" aria-modal="true" aria-labelledby="create-strategy-modal-title">
          <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-xl w-full max-w-lg p-6 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-4 border-b border-[#E2E8F0]">
              <h3 id="create-strategy-modal-title" className="text-lg font-bold text-[#1E1B4B]">Create Strategy</h3>
              <button
                type="button"
                onClick={() => setIsCreateStrategyModalOpen(false)}
                className="text-[#94A3B8] hover:text-[#1E1B4B] p-1 rounded"
                aria-label="Close dialog"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateStrategy} className="space-y-4 pt-4">
              <div>
                <label htmlFor="create-strat-title" className="block text-xs font-semibold text-[#1E1B4B] mb-1">
                  Strategy Title *
                </label>
                <input
                  id="create-strat-title"
                  type="text"
                  placeholder="e.g. Winter Customer Acquisition Strategy"
                  value={createTitle}
                  onChange={(e) => setCreateTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-[#E2E8F0] text-sm text-[#1E1B4B] focus:ring-2 focus:ring-[#6D28D9]/20 focus:border-[#6D28D9] outline-none"
                  required
                />
              </div>
              <div>
                <label htmlFor="create-strat-desc" className="block text-xs font-semibold text-[#1E1B4B] mb-1">
                  Overview Description
                </label>
                <textarea
                  id="create-strat-desc"
                  rows={4}
                  placeholder="Describe your strategy objectives and execution plan..."
                  value={createDesc}
                  onChange={(e) => setCreateDesc(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-[#E2E8F0] text-sm text-[#1E1B4B] focus:ring-2 focus:ring-[#6D28D9]/20 focus:border-[#6D28D9] outline-none"
                />
              </div>
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#F1F5F9]">
                <button
                  type="button"
                  onClick={() => setIsCreateStrategyModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-[#E2E8F0] text-xs font-semibold text-[#64748B] hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-[#6D28D9] hover:bg-[#5B21B6] text-white text-xs font-semibold shadow-xs transition-colors"
                >
                  Save Strategy
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- ADD INITIATIVE MODAL --- */}
      {isAddInitiativeModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4" role="dialog" aria-modal="true" aria-labelledby="add-initiative-modal-title">
          <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-xl w-full max-w-lg p-6 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-4 border-b border-[#E2E8F0]">
              <h3 id="add-initiative-modal-title" className="text-lg font-bold text-[#1E1B4B]">Add Strategic Initiative</h3>
              <button
                type="button"
                onClick={() => setIsAddInitiativeModalOpen(false)}
                className="text-[#94A3B8] hover:text-[#1E1B4B] p-1 rounded"
                aria-label="Close dialog"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAddInitiative} className="space-y-4 pt-4">
              <div>
                <label htmlFor="init-name" className="block text-xs font-semibold text-[#1E1B4B] mb-1">
                  Initiative Name *
                </label>
                <input
                  id="init-name"
                  type="text"
                  placeholder="e.g. Email sequence A/B testing"
                  value={newInitName}
                  onChange={(e) => setNewInitName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-[#E2E8F0] text-sm text-[#1E1B4B] focus:ring-2 focus:ring-[#6D28D9]/20 focus:border-[#6D28D9] outline-none"
                  required
                />
              </div>
              <div>
                <label htmlFor="init-area" className="block text-xs font-semibold text-[#1E1B4B] mb-1">
                  Related Area
                </label>
                <select
                  id="init-area"
                  value={newInitArea}
                  onChange={(e) => setNewInitArea(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-[#E2E8F0] text-sm text-[#1E1B4B] focus:ring-2 focus:ring-[#6D28D9]/20 focus:border-[#6D28D9] outline-none bg-white"
                >
                  <option value="Positioning">Positioning</option>
                  <option value="Audiences">Audiences</option>
                  <option value="Campaigns">Campaigns</option>
                  <option value="Projects">Projects</option>
                </select>
              </div>
              <div>
                <label htmlFor="init-owner" className="block text-xs font-semibold text-[#1E1B4B] mb-1">
                  Owner
                </label>
                <select
                  id="init-owner"
                  value={newInitOwner}
                  onChange={(e) => setNewInitOwner(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-[#E2E8F0] text-sm text-[#1E1B4B] focus:ring-2 focus:ring-[#6D28D9]/20 focus:border-[#6D28D9] outline-none bg-white"
                >
                  <option value="Sara El Amrani">Sara El Amrani</option>
                  <option value="Yassine Bouchra">Yassine Bouchra</option>
                  <option value="Imane Benkirane">Imane Benkirane</option>
                  <option value="Mehdi Zahraoui">Mehdi Zahraoui</option>
                </select>
              </div>
              <div>
                <label htmlFor="init-nextstep" className="block text-xs font-semibold text-[#1E1B4B] mb-1">
                  Next Step
                </label>
                <input
                  id="init-nextstep"
                  type="text"
                  placeholder="e.g. Prepare variation copy"
                  value={newInitNextStep}
                  onChange={(e) => setNewInitNextStep(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-[#E2E8F0] text-sm text-[#1E1B4B] focus:ring-2 focus:ring-[#6D28D9]/20 focus:border-[#6D28D9] outline-none"
                />
              </div>
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#F1F5F9]">
                <button
                  type="button"
                  onClick={() => setIsAddInitiativeModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-[#E2E8F0] text-xs font-semibold text-[#64748B] hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-[#6D28D9] hover:bg-[#5B21B6] text-white text-xs font-semibold shadow-xs transition-colors"
                >
                  Add Initiative
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
