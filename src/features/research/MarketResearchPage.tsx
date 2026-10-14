import React, { useState, useRef } from 'react';
import {
  Plus,
  Edit2,
  Upload,
  Download,
  Folder,
  ArrowRight,
  X,
  FileText,
  Users,
  Megaphone,
} from 'lucide-react';
import { initialMarketStudies } from '../../data/mock';
import type {
  MarketStudy,
  ConfidenceLevel,
  NeedPriority,
  FindingStatus,
  StudyStatus,
} from '../../types';

export const MarketResearchPage: React.FC = () => {
  const [studies, setStudies] = useState<MarketStudy[]>(initialMarketStudies);
  const [selectedStudyId, setSelectedStudyId] = useState<string>('study-1');
  const [activeTab, setActiveTab] = useState<string>('Overview');

  // Modals
  const [isNewStudyModalOpen, setIsNewStudyModalOpen] = useState(false);
  const [isEditStudyModalOpen, setIsEditStudyModalOpen] = useState(false);
  const [isAddFindingModalOpen, setIsAddFindingModalOpen] = useState(false);
  const [isUploadDocModalOpen, setIsUploadDocModalOpen] = useState(false);
  const [selectedUploadFile, setSelectedUploadFile] = useState<File | null>(null);

  // New study form state
  const [newStudyTitle, setNewStudyTitle] = useState('');
  const [newStudyPeriod, setNewStudyPeriod] = useState('October 2026');
  const [newStudyStatus, setNewStudyStatus] = useState<StudyStatus>('Draft');
  const [newStudyDesc, setNewStudyDesc] = useState('');

  // Edit study form state
  const [editTitle, setEditTitle] = useState('');
  const [editPeriod, setEditPeriod] = useState('');
  const [editStatus, setEditStatus] = useState<StudyStatus>('Active');
  const [editDesc, setEditDesc] = useState('');

  // Add finding form state
  const [newFindingText, setNewFindingText] = useState('');
  const [newFindingStatus, setNewFindingStatus] = useState<FindingStatus>('New');

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Get active study
  const currentStudy =
    studies.find((s) => s.id === selectedStudyId) || studies[0] || initialMarketStudies[0];

  const tabs = [
    'Overview',
    'Competitors',
    'Customer Needs',
    'Pricing',
    'Sources',
    'Findings',
  ];

  // Helper for confidence badge styling
  const renderConfidenceBadge = (confidence: ConfidenceLevel) => {
    switch (confidence) {
      case 'High':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-[#CCFBF1] text-[#0D9488]">
            High
          </span>
        );
      case 'Medium':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-[#FEF3C7] text-[#D97706]">
            Medium
          </span>
        );
      case 'Low':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-[#F1F5F9] text-[#64748B]">
            Low
          </span>
        );
    }
  };

  // Helper for priority badge styling
  const renderPriorityBadge = (priority: NeedPriority) => {
    switch (priority) {
      case 'High':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#CCFBF1] text-[#0D9488]">
            High
          </span>
        );
      case 'Medium':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#FEF3C7] text-[#D97706]">
            Medium
          </span>
        );
      case 'Low':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#EDE9FE] text-[#6D28D9]">
            Low
          </span>
        );
    }
  };

  // Helper for study status badge
  const renderStudyStatusBadge = (status: StudyStatus) => {
    switch (status) {
      case 'Active':
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[#CCFBF1] text-[#0D9488]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#0D9488]" />
            Active
          </span>
        );
      case 'Completed':
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[#EDE9FE] text-[#6D28D9]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#6D28D9]" />
            Completed
          </span>
        );
      case 'Draft':
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[#FEF3C7] text-[#D97706]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#D97706]" />
            Draft
          </span>
        );
      case 'Archived':
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[#F1F5F9] text-[#64748B]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#64748B]" />
            Archived
          </span>
        );
    }
  };

  // Helper for finding status badge
  const renderFindingStatusBadge = (status: FindingStatus) => {
    switch (status) {
      case 'New':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-[11px] font-semibold bg-[#EDE9FE] text-[#6D28D9]">
            New
          </span>
        );
      case 'Reviewed':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-[11px] font-semibold bg-[#E0F2FE] text-[#0284C7]">
            Reviewed
          </span>
        );
      case 'Ready':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-[11px] font-semibold bg-[#CCFBF1] text-[#0D9488]">
            Ready
          </span>
        );
      case 'Archived':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-[11px] font-semibold bg-[#F1F5F9] text-[#64748B]">
            Archived
          </span>
        );
    }
  };

  // Export functional CSV
  const handleExportCSV = () => {
    const csvRows: string[] = [];
    csvRows.push(`"Market Study","${currentStudy.title}"`);
    csvRows.push(`"Workspace","${currentStudy.workspace}"`);
    csvRows.push(`"Period","${currentStudy.period}"`);
    csvRows.push(`"Last Updated","${currentStudy.lastUpdated}"`);
    csvRows.push('');
    csvRows.push('"SECTION 1: Market Observations"');
    csvRows.push('"Observation","Evidence","Region","Confidence","Date Recorded"');
    currentStudy.observations.forEach((obs) => {
      csvRows.push(
        `"${obs.observation.replace(/"/g, '""')}","${obs.evidence}","${obs.region}","${obs.confidence}","${obs.dateRecorded}"`
      );
    });

    csvRows.push('');
    csvRows.push('"SECTION 2: Customer Needs"');
    csvRows.push('"Need","Segment","Evidence Source","Priority","Owner"');
    currentStudy.customerNeeds.forEach((cn) => {
      csvRows.push(
        `"${cn.need.replace(/"/g, '""')}","${cn.segment}","${cn.evidenceSource}","${cn.priority}","${cn.owner}"`
      );
    });

    csvRows.push('');
    csvRows.push('"SECTION 3: Competitor Comparison"');
    csvRows.push('"Competitor","Positioning","Price Level","Main Offer","Strengths","Weaknesses","Last Reviewed"');
    currentStudy.competitors.forEach((comp) => {
      csvRows.push(
        `"${comp.competitor}","${comp.positioning}","${comp.priceLevel}","${comp.mainOffer.replace(/"/g, '""')}","${comp.strengths.replace(/"/g, '""')}","${comp.weaknesses.replace(/"/g, '""')}","${comp.lastReviewed}"`
      );
    });

    csvRows.push('');
    csvRows.push('"SECTION 4: Pricing Observations"');
    csvRows.push('"Category","Observation","Evidence","Impact"');
    currentStudy.pricingObservations.forEach((pr) => {
      csvRows.push(
        `"${pr.category}","${pr.observation.replace(/"/g, '""')}","${pr.evidence}","${pr.impact}"`
      );
    });

    csvRows.push('');
    csvRows.push('"SECTION 5: Source References"');
    csvRows.push('"Source","Type","Date","Notes","Reliability"');
    currentStudy.sourceReferences.forEach((src) => {
      csvRows.push(
        `"${src.source}","${src.type}","${src.date}","${src.notes}","${src.reliability}"`
      );
    });

    csvRows.push('');
    csvRows.push('"SECTION 6: Recorded Findings"');
    csvRows.push('"Finding","Status","Date"');
    currentStudy.recordedFindings.forEach((rf) => {
      csvRows.push(
        `"${rf.finding.replace(/"/g, '""')}","${rf.status}","${rf.date}"`
      );
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csvRows.join('\n'));
    const link = document.createElement('a');
    link.setAttribute('href', csvContent);
    link.setAttribute('download', `${currentStudy.title.toLowerCase().replace(/[^a-z0-9]/g, '_')}_export.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Handle open edit modal
  const handleOpenEdit = () => {
    setEditTitle(currentStudy.title);
    setEditPeriod(currentStudy.period);
    setEditStatus(currentStudy.status);
    setEditDesc(currentStudy.overviewDescription);
    setIsEditStudyModalOpen(true);
  };

  // Handle save edit study
  const handleSaveEditStudy = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTitle.trim()) return;

    setStudies((prev) =>
      prev.map((s) =>
        s.id === currentStudy.id
          ? {
              ...s,
              title: editTitle.trim(),
              period: editPeriod.trim() || s.period,
              status: editStatus,
              overviewDescription: editDesc.trim() || s.overviewDescription,
              lastUpdated: '12 Oct 2026',
            }
          : s
      )
    );
    setIsEditStudyModalOpen(false);
  };

  // Handle create new study
  const handleCreateNewStudy = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStudyTitle.trim()) return;

    const newStudy: MarketStudy = {
      id: `study-${Date.now()}`,
      title: newStudyTitle.trim(),
      workspace: 'Atlas Retail SARL',
      status: newStudyStatus,
      owner: currentStudy.owner,
      period: newStudyPeriod.trim() || 'October 2026',
      evidenceCount: 0,
      lastUpdated: '12 Oct 2026',
      overviewDescription:
        newStudyDesc.trim() ||
        'Newly initiated structured research study for market analysis, customer insights and competitor dynamics.',
      linkedLinks: {
        projectsUrl: '/projects',
        audiencesUrl: '/audiences',
        campaignsUrl: '/campaigns',
      },
      observations: [],
      customerNeeds: [],
      competitors: [],
      pricingObservations: [],
      sourceReferences: [],
      recordedFindings: [],
    };

    setStudies((prev) => [newStudy, ...prev]);
    setSelectedStudyId(newStudy.id);
    setIsNewStudyModalOpen(false);
    setNewStudyTitle('');
    setNewStudyDesc('');
  };

  // Handle add finding
  const handleAddFinding = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFindingText.trim()) return;

    const newFinding = {
      id: `rf-${Date.now()}`,
      finding: newFindingText.trim(),
      status: newFindingStatus,
      date: '12 Oct 2026',
    };

    setStudies((prev) =>
      prev.map((s) =>
        s.id === currentStudy.id
          ? {
              ...s,
              recordedFindings: [newFinding, ...s.recordedFindings],
              evidenceCount: s.evidenceCount + 1,
            }
          : s
      )
    );

    setNewFindingText('');
    setIsAddFindingModalOpen(false);
  };

  // Handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedUploadFile(e.target.files[0]);
    }
  };

  const handleUploadSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUploadFile) return;

    const newSource = {
      id: `src-${Date.now()}`,
      source: selectedUploadFile.name,
      type: 'Document',
      date: '12 Oct 2026',
      notes: `Uploaded file (${(selectedUploadFile.size / 1024).toFixed(1)} KB)`,
      reliability: 'High' as const,
    };

    setStudies((prev) =>
      prev.map((s) =>
        s.id === currentStudy.id
          ? {
              ...s,
              sourceReferences: [newSource, ...s.sourceReferences],
              evidenceCount: s.evidenceCount + 1,
            }
          : s
      )
    );

    setSelectedUploadFile(null);
    setIsUploadDocModalOpen(false);
  };

  return (
    <div className="space-y-6 max-w-[1440px] mx-auto pb-12">
      {/* Top Breadcrumb & Page Header */}
      <div className="flex items-center gap-1.5 text-xs text-[#64748B]">
        <span className="hover:text-[#1E1B4B] cursor-pointer">Management</span>
        <span>/</span>
        <span className="text-[#1E1B4B] font-medium">Market Research</span>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-[28px] font-bold text-[#1E1B4B] tracking-tight">
            Market Research
          </h1>
          <p className="text-sm text-[#64748B] mt-0.5">
            Track structured market studies, competitor evidence and customer insights.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsNewStudyModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#6D28D9] hover:bg-[#5B21B6] text-white text-xs font-semibold shadow-xs transition-colors self-start sm:self-auto"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>New study</span>
        </button>
      </div>

      {/* Main Container: Left Saved Studies Panel + Right Content */}
      <div className="flex flex-col lg:flex-row items-start gap-6">
        {/* LEFT PANEL: Saved studies */}
        <aside className="w-full lg:w-[260px] shrink-0 bg-white rounded-xl border border-[#E2E8F0] shadow-xs overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3.5 border-b border-[#F1F5F9]">
            <h2 className="text-xs font-bold text-[#1E1B4B] uppercase tracking-wider">
              Saved studies
            </h2>
            <button
              type="button"
              onClick={() => setIsNewStudyModalOpen(true)}
              className="p-1 text-[#64748B] hover:text-[#6D28D9] hover:bg-[#F5F3FF] rounded transition-colors"
              title="Add study"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="divide-y divide-[#F1F5F9]">
            {studies.map((study) => {
              const isSelected = study.id === currentStudy.id;
              return (
                <div
                  key={study.id}
                  onClick={() => setSelectedStudyId(study.id)}
                  className={`p-3.5 cursor-pointer transition-all border-l-[3px] ${
                    isSelected
                      ? 'bg-[#F5F3FF] border-[#6D28D9]'
                      : 'border-transparent hover:bg-slate-50/70'
                  }`}
                >
                  <h3
                    className={`text-xs font-semibold leading-snug line-clamp-2 ${
                      isSelected ? 'text-[#6D28D9]' : 'text-[#1E1B4B]'
                    }`}
                  >
                    {study.title}
                  </h3>
                  <div className="flex items-center justify-between mt-2.5">
                    {renderStudyStatusBadge(study.status)}
                    <span className="text-[11px] text-[#94A3B8] font-medium">
                      {study.lastUpdated}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </aside>

        {/* RIGHT AREA: Selected study details */}
        <div className="flex-1 min-w-0 space-y-6 w-full">
          {/* Header Card for Selected Study */}
          <div className="bg-white rounded-xl border border-[#E2E8F0] p-6 shadow-xs">
            <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-5 pb-5 border-b border-[#F1F5F9]">
              {/* Study Title & Subtitle */}
              <div className="flex items-start gap-3.5">
                <div className="w-10 h-10 rounded-lg bg-[#EDE9FE] text-[#6D28D9] flex items-center justify-center shrink-0 mt-0.5">
                  <Folder className="w-5 h-5 fill-[#6D28D9]/20" />
                </div>
                <div>
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <h2 className="text-lg lg:text-xl font-bold text-[#1E1B4B]">
                      {currentStudy.title}
                    </h2>
                    {renderStudyStatusBadge(currentStudy.status)}
                  </div>
                  <p className="text-xs text-[#64748B] mt-0.5">
                    In {currentStudy.workspace}
                  </p>
                </div>
              </div>

              {/* Study Metadata Row */}
              <div className="flex items-center gap-6 text-xs text-[#64748B] flex-wrap">
                {/* Owner */}
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-[#EDE9FE] text-[#6D28D9] flex items-center justify-center text-[10px] font-bold">
                    {currentStudy.owner.initials}
                  </div>
                  <div>
                    <span className="block text-[11px] text-[#94A3B8] leading-none">
                      Owner
                    </span>
                    <span className="text-xs font-semibold text-[#1E1B4B]">
                      {currentStudy.owner.name}
                    </span>
                  </div>
                </div>

                <div className="h-7 w-px bg-[#E2E8F0]" />

                {/* Period */}
                <div>
                  <span className="block text-[11px] text-[#94A3B8] leading-none">
                    Period
                  </span>
                  <span className="text-xs font-semibold text-[#1E1B4B]">
                    {currentStudy.period}
                  </span>
                </div>

                <div className="h-7 w-px bg-[#E2E8F0]" />

                {/* Evidence */}
                <div>
                  <span className="block text-[11px] text-[#94A3B8] leading-none">
                    Evidence
                  </span>
                  <span className="text-xs font-semibold text-[#1E1B4B]">
                    {currentStudy.evidenceCount} Evidence items
                  </span>
                </div>

                <div className="h-7 w-px bg-[#E2E8F0]" />

                {/* Last updated */}
                <div>
                  <span className="block text-[11px] text-[#94A3B8] leading-none">
                    Last updated
                  </span>
                  <span className="text-xs font-semibold text-[#1E1B4B]">
                    {currentStudy.lastUpdated}
                  </span>
                </div>
              </div>
            </div>

            {/* Sub-bar: Tabs & Action Buttons */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-4">
              {/* Navigation Tabs */}
              <div className="flex items-center gap-1 overflow-x-auto border-b md:border-b-0 border-[#F1F5F9] pb-2 md:pb-0">
                {tabs.map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setActiveTab(tab)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${
                      activeTab === tab
                        ? 'bg-[#F5F3FF] text-[#6D28D9] font-bold'
                        : 'text-[#64748B] hover:text-[#1E1B4B] hover:bg-slate-50'
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={handleOpenEdit}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#E2E8F0] bg-white text-xs font-medium text-[#1E1B4B] hover:bg-slate-50 shadow-2xs transition-colors"
                >
                  <Edit2 className="w-3.5 h-3.5 text-[#64748B]" />
                  <span>Edit</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsAddFindingModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#E2E8F0] bg-white text-xs font-medium text-[#1E1B4B] hover:bg-slate-50 shadow-2xs transition-colors"
                >
                  <Plus className="w-3.5 h-3.5 text-[#6D28D9]" />
                  <span>Add Finding</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsUploadDocModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#E2E8F0] bg-white text-xs font-medium text-[#1E1B4B] hover:bg-slate-50 shadow-2xs transition-colors"
                >
                  <Upload className="w-3.5 h-3.5 text-[#64748B]" />
                  <span>Upload Document</span>
                </button>
                <button
                  type="button"
                  onClick={handleExportCSV}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#E2E8F0] bg-white text-xs font-medium text-[#1E1B4B] hover:bg-slate-50 shadow-2xs transition-colors"
                >
                  <Download className="w-3.5 h-3.5 text-[#64748B]" />
                  <span>Export</span>
                </button>
              </div>
            </div>
          </div>

          {/* TAB CONTENT: When Overview is selected (Default reference screenshot view) */}
          {(activeTab === 'Overview' || activeTab === 'Competitors' || activeTab === 'Customer Needs' || activeTab === 'Pricing' || activeTab === 'Sources' || activeTab === 'Findings') && (
            <div className="space-y-6">
              {/* ROW 1: Study Overview (1/3) + Market Observations (2/3) */}
              {(activeTab === 'Overview') && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Card: Study overview */}
                  <div className="bg-white rounded-xl border border-[#E2E8F0] p-6 shadow-xs flex flex-col justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-[#1E1B4B] tracking-tight mb-3">
                        Study overview
                      </h3>
                      <p className="text-xs text-[#64748B] leading-relaxed">
                        {currentStudy.overviewDescription}
                      </p>
                    </div>

                    <div className="flex items-center gap-4 pt-4 mt-6 border-t border-[#F1F5F9] text-xs font-semibold text-[#6D28D9]">
                      <a
                        href="/projects"
                        className="flex items-center gap-1.5 hover:text-[#5B21B6] transition-colors"
                      >
                        <Folder className="w-3.5 h-3.5" />
                        <span>Projects</span>
                      </a>
                      <a
                        href="/audiences"
                        className="flex items-center gap-1.5 hover:text-[#5B21B6] transition-colors"
                      >
                        <Users className="w-3.5 h-3.5" />
                        <span>Audiences</span>
                      </a>
                      <a
                        href="/campaigns"
                        className="flex items-center gap-1.5 hover:text-[#5B21B6] transition-colors"
                      >
                        <Megaphone className="w-3.5 h-3.5" />
                        <span>Campaigns</span>
                      </a>
                    </div>
                  </div>

                  {/* Card: Market observations */}
                  <div className="lg:col-span-2 bg-white rounded-xl border border-[#E2E8F0] p-6 shadow-xs">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-sm font-bold text-[#1E1B4B] tracking-tight">
                        Market observations
                      </h3>
                      <button
                        type="button"
                        onClick={() => setActiveTab('Overview')}
                        className="text-xs font-medium text-[#6D28D9] hover:text-[#5B21B6] inline-flex items-center gap-1 transition-colors"
                      >
                        <span>View all</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="border-b border-[#F1F5F9] text-[11px] font-semibold text-[#94A3B8]">
                            <th className="pb-2.5 font-medium">Observation</th>
                            <th className="pb-2.5 font-medium">Evidence</th>
                            <th className="pb-2.5 font-medium">Region</th>
                            <th className="pb-2.5 font-medium">Confidence</th>
                            <th className="pb-2.5 font-medium text-right">Date recorded</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#F1F5F9]">
                          {currentStudy.observations.map((obs) => (
                            <tr key={obs.id} className="hover:bg-slate-50/50 transition-colors">
                              <td className="py-3 text-[#1E1B4B] font-medium max-w-xs pr-4">
                                {obs.observation}
                              </td>
                              <td className="py-3 text-[#64748B] whitespace-nowrap">
                                {obs.evidence}
                              </td>
                              <td className="py-3 text-[#64748B] whitespace-nowrap">
                                {obs.region}
                              </td>
                              <td className="py-3 whitespace-nowrap">
                                {renderConfidenceBadge(obs.confidence)}
                              </td>
                              <td className="py-3 text-[#94A3B8] text-right whitespace-nowrap">
                                {obs.dateRecorded}
                              </td>
                            </tr>
                          ))}
                          {currentStudy.observations.length === 0 && (
                            <tr>
                              <td colSpan={5} className="py-6 text-center text-xs text-[#94A3B8]">
                                No market observations recorded for this study.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* ROW 2: Customer Needs (1/2) + Competitor comparison (1/2) */}
              {(activeTab === 'Overview' || activeTab === 'Customer Needs' || activeTab === 'Competitors') && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Customer needs */}
                  <div className="bg-white rounded-xl border border-[#E2E8F0] p-6 shadow-xs">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="text-sm font-bold text-[#1E1B4B] tracking-tight">
                        Customer needs
                      </h3>
                      <button
                        type="button"
                        onClick={() => setActiveTab('Customer Needs')}
                        className="text-xs font-medium text-[#6D28D9] hover:text-[#5B21B6] inline-flex items-center gap-1 transition-colors"
                      >
                        <span>View all</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>
                    <p className="text-[11px] text-[#94A3B8] mb-4">
                      Manually recorded customer needs from research findings.
                    </p>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="border-b border-[#F1F5F9] text-[11px] font-semibold text-[#94A3B8]">
                            <th className="pb-2.5 font-medium">Need</th>
                            <th className="pb-2.5 font-medium">Segment</th>
                            <th className="pb-2.5 font-medium">Evidence Source</th>
                            <th className="pb-2.5 font-medium">Priority</th>
                            <th className="pb-2.5 font-medium text-right">Owner</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#F1F5F9]">
                          {currentStudy.customerNeeds.map((need) => (
                            <tr key={need.id} className="hover:bg-slate-50/50 transition-colors">
                              <td className="py-2.5 text-[#1E1B4B] font-medium pr-3">
                                {need.need}
                              </td>
                              <td className="py-2.5 text-[#64748B] whitespace-nowrap">
                                {need.segment}
                              </td>
                              <td className="py-2.5 text-[#64748B] whitespace-nowrap">
                                {need.evidenceSource}
                              </td>
                              <td className="py-2.5 whitespace-nowrap">
                                {renderPriorityBadge(need.priority)}
                              </td>
                              <td className="py-2.5 text-right whitespace-nowrap">
                                <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-[#EDE9FE] text-[#6D28D9] text-[10px] font-bold">
                                  {need.owner}
                                </span>
                              </td>
                            </tr>
                          ))}
                          {currentStudy.customerNeeds.length === 0 && (
                            <tr>
                              <td colSpan={5} className="py-6 text-center text-xs text-[#94A3B8]">
                                No customer needs recorded.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Competitor comparison */}
                  <div className="bg-white rounded-xl border border-[#E2E8F0] p-6 shadow-xs">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-sm font-bold text-[#1E1B4B] tracking-tight">
                        Competitor comparison
                      </h3>
                      <button
                        type="button"
                        onClick={() => setActiveTab('Competitors')}
                        className="text-xs font-medium text-[#6D28D9] hover:text-[#5B21B6] inline-flex items-center gap-1 transition-colors"
                      >
                        <span>View all</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="border-b border-[#F1F5F9] text-[11px] font-semibold text-[#94A3B8]">
                            <th className="pb-2.5 font-medium">Competitor</th>
                            <th className="pb-2.5 font-medium">Positioning</th>
                            <th className="pb-2.5 font-medium">Price Level</th>
                            <th className="pb-2.5 font-medium">Main Offer</th>
                            <th className="pb-2.5 font-medium">Strengths</th>
                            <th className="pb-2.5 font-medium">Weaknesses</th>
                            <th className="pb-2.5 font-medium text-right">Last Reviewed</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#F1F5F9]">
                          {currentStudy.competitors.map((comp) => (
                            <tr key={comp.id} className="hover:bg-slate-50/50 transition-colors">
                              <td className="py-2.5 font-semibold text-[#1E1B4B] whitespace-nowrap">
                                {comp.competitor}
                              </td>
                              <td className="py-2.5 text-[#64748B] whitespace-nowrap">
                                {comp.positioning}
                              </td>
                              <td className="py-2.5 text-[#64748B] whitespace-nowrap">
                                {comp.priceLevel}
                              </td>
                              <td className="py-2.5 text-[#64748B] whitespace-nowrap">
                                {comp.mainOffer}
                              </td>
                              <td className="py-2.5 text-[#64748B] whitespace-nowrap">
                                {comp.strengths}
                              </td>
                              <td className="py-2.5 text-[#64748B] whitespace-nowrap">
                                {comp.weaknesses}
                              </td>
                              <td className="py-2.5 text-[#94A3B8] text-right whitespace-nowrap">
                                {comp.lastReviewed}
                              </td>
                            </tr>
                          ))}
                          {currentStudy.competitors.length === 0 && (
                            <tr>
                              <td colSpan={7} className="py-6 text-center text-xs text-[#94A3B8]">
                                No competitor comparisons recorded.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* ROW 3: Three cards side by side: Pricing observations + Source references + Recorded findings */}
              {(activeTab === 'Overview' || activeTab === 'Pricing' || activeTab === 'Sources' || activeTab === 'Findings') && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {/* Card 1: Pricing observations */}
                  <div className="bg-white rounded-xl border border-[#E2E8F0] p-6 shadow-xs">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-sm font-bold text-[#1E1B4B] tracking-tight">
                        Pricing observations
                      </h3>
                      <button
                        type="button"
                        onClick={() => setActiveTab('Pricing')}
                        className="text-xs font-medium text-[#6D28D9] hover:text-[#5B21B6] inline-flex items-center gap-1 transition-colors"
                      >
                        <span>View all</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="border-b border-[#F1F5F9] text-[11px] font-semibold text-[#94A3B8]">
                            <th className="pb-2.5 font-medium">Category</th>
                            <th className="pb-2.5 font-medium">Observation</th>
                            <th className="pb-2.5 font-medium">Evidence</th>
                            <th className="pb-2.5 font-medium text-right">Impact</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#F1F5F9]">
                          {currentStudy.pricingObservations.map((pr) => (
                            <tr key={pr.id} className="hover:bg-slate-50/50 transition-colors">
                              <td className="py-2.5 font-medium text-[#1E1B4B] whitespace-nowrap pr-2">
                                {pr.category}
                              </td>
                              <td className="py-2.5 text-[#64748B] text-[11px] pr-2">
                                {pr.observation}
                              </td>
                              <td className="py-2.5 text-[#64748B] whitespace-nowrap pr-2">
                                {pr.evidence}
                              </td>
                              <td className="py-2.5 text-right whitespace-nowrap">
                                {pr.impact === 'High' ? (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-[#CCFBF1] text-[#0D9488]">
                                    High
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-[#FEF3C7] text-[#D97706]">
                                    Medium
                                  </span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Card 2: Source references */}
                  <div className="bg-white rounded-xl border border-[#E2E8F0] p-6 shadow-xs">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-sm font-bold text-[#1E1B4B] tracking-tight">
                        Source references
                      </h3>
                      <button
                        type="button"
                        onClick={() => setActiveTab('Sources')}
                        className="text-xs font-medium text-[#6D28D9] hover:text-[#5B21B6] inline-flex items-center gap-1 transition-colors"
                      >
                        <span>View all</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="border-b border-[#F1F5F9] text-[11px] font-semibold text-[#94A3B8]">
                            <th className="pb-2.5 font-medium">Source</th>
                            <th className="pb-2.5 font-medium">Type</th>
                            <th className="pb-2.5 font-medium">Date</th>
                            <th className="pb-2.5 font-medium">Notes</th>
                            <th className="pb-2.5 font-medium text-right">Reliability</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#F1F5F9]">
                          {currentStudy.sourceReferences.map((src) => (
                            <tr key={src.id} className="hover:bg-slate-50/50 transition-colors">
                              <td className="py-2.5 font-medium text-[#1E1B4B] flex items-center gap-1.5 whitespace-nowrap pr-2">
                                <FileText className="w-3.5 h-3.5 text-[#6D28D9] shrink-0" />
                                <span className="truncate max-w-[110px]">{src.source}</span>
                              </td>
                              <td className="py-2.5 text-[#64748B] whitespace-nowrap pr-2">
                                {src.type}
                              </td>
                              <td className="py-2.5 text-[#94A3B8] whitespace-nowrap pr-2">
                                {src.date}
                              </td>
                              <td className="py-2.5 text-[#64748B] text-[11px] whitespace-nowrap pr-2">
                                {src.notes}
                              </td>
                              <td className="py-2.5 text-right whitespace-nowrap">
                                {src.reliability === 'High' ? (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-[#CCFBF1] text-[#0D9488]">
                                    High
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-[#FEF3C7] text-[#D97706]">
                                    Medium
                                  </span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Card 3: Recorded findings */}
                  <div className="bg-white rounded-xl border border-[#E2E8F0] p-6 shadow-xs">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-sm font-bold text-[#1E1B4B] tracking-tight">
                        Recorded findings
                      </h3>
                      <button
                        type="button"
                        onClick={() => setActiveTab('Findings')}
                        className="text-xs font-medium text-[#6D28D9] hover:text-[#5B21B6] inline-flex items-center gap-1 transition-colors"
                      >
                        <span>View all</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="border-b border-[#F1F5F9] text-[11px] font-semibold text-[#94A3B8]">
                            <th className="pb-2.5 font-medium">Finding</th>
                            <th className="pb-2.5 font-medium">Status</th>
                            <th className="pb-2.5 font-medium text-right">Date</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#F1F5F9]">
                          {currentStudy.recordedFindings.map((rf) => (
                            <tr key={rf.id} className="hover:bg-slate-50/50 transition-colors">
                              <td className="py-2.5 text-[#1E1B4B] font-medium pr-2 text-[11px] leading-snug">
                                {rf.finding}
                              </td>
                              <td className="py-2.5 whitespace-nowrap pr-2">
                                {renderFindingStatusBadge(rf.status)}
                              </td>
                              <td className="py-2.5 text-[#94A3B8] text-right whitespace-nowrap">
                                {rf.date}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* MODAL 1: New study */}
      {isNewStudyModalOpen && (
        <div className="fixed inset-0 z-50 bg-[#1E1B4B]/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xl w-full max-w-lg p-6 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-4 border-b border-[#F1F5F9]">
              <h3 className="text-base font-bold text-[#1E1B4B]">Create New Market Study</h3>
              <button
                type="button"
                onClick={() => setIsNewStudyModalOpen(false)}
                className="p-1 rounded-lg hover:bg-slate-100 text-[#94A3B8] hover:text-[#1E1B4B]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateNewStudy} className="space-y-4 pt-4">
              <div>
                <label className="block text-xs font-semibold text-[#1E1B4B] mb-1">
                  Study Title *
                </label>
                <input
                  type="text"
                  required
                  value={newStudyTitle}
                  onChange={(e) => setNewStudyTitle(e.target.value)}
                  placeholder="e.g. Morocco Retail Market — Autumn 2026"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-[#E2E8F0] focus:outline-none focus:ring-2 focus:ring-[#6D28D9]/20 focus:border-[#6D28D9]"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#1E1B4B] mb-1">
                    Period
                  </label>
                  <input
                    type="text"
                    value={newStudyPeriod}
                    onChange={(e) => setNewStudyPeriod(e.target.value)}
                    placeholder="e.g. October 2026"
                    className="w-full px-3 py-2 text-xs rounded-lg border border-[#E2E8F0] focus:outline-none focus:ring-2 focus:ring-[#6D28D9]/20 focus:border-[#6D28D9]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#1E1B4B] mb-1">
                    Status
                  </label>
                  <select
                    value={newStudyStatus}
                    onChange={(e) => setNewStudyStatus(e.target.value as StudyStatus)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-[#E2E8F0] bg-white focus:outline-none focus:ring-2 focus:ring-[#6D28D9]/20 focus:border-[#6D28D9]"
                  >
                    <option value="Active">Active</option>
                    <option value="Draft">Draft</option>
                    <option value="Completed">Completed</option>
                    <option value="Archived">Archived</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#1E1B4B] mb-1">
                  Study Overview & Objective
                </label>
                <textarea
                  rows={3}
                  value={newStudyDesc}
                  onChange={(e) => setNewStudyDesc(e.target.value)}
                  placeholder="Detail the research scope, questions and goals..."
                  className="w-full px-3 py-2 text-xs rounded-lg border border-[#E2E8F0] focus:outline-none focus:ring-2 focus:ring-[#6D28D9]/20 focus:border-[#6D28D9]"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#F1F5F9]">
                <button
                  type="button"
                  onClick={() => setIsNewStudyModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-[#E2E8F0] text-xs font-semibold text-[#64748B] hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-[#6D28D9] hover:bg-[#5B21B6] text-white text-xs font-semibold shadow-xs transition-colors"
                >
                  Create Study
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Edit study */}
      {isEditStudyModalOpen && (
        <div className="fixed inset-0 z-50 bg-[#1E1B4B]/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xl w-full max-w-lg p-6 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-4 border-b border-[#F1F5F9]">
              <h3 className="text-base font-bold text-[#1E1B4B]">Edit Study Details</h3>
              <button
                type="button"
                onClick={() => setIsEditStudyModalOpen(false)}
                className="p-1 rounded-lg hover:bg-slate-100 text-[#94A3B8] hover:text-[#1E1B4B]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEditStudy} className="space-y-4 pt-4">
              <div>
                <label className="block text-xs font-semibold text-[#1E1B4B] mb-1">
                  Study Title *
                </label>
                <input
                  type="text"
                  required
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-[#E2E8F0] focus:outline-none focus:ring-2 focus:ring-[#6D28D9]/20 focus:border-[#6D28D9]"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#1E1B4B] mb-1">
                    Period
                  </label>
                  <input
                    type="text"
                    value={editPeriod}
                    onChange={(e) => setEditPeriod(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-[#E2E8F0] focus:outline-none focus:ring-2 focus:ring-[#6D28D9]/20 focus:border-[#6D28D9]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#1E1B4B] mb-1">
                    Status
                  </label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value as StudyStatus)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-[#E2E8F0] bg-white focus:outline-none focus:ring-2 focus:ring-[#6D28D9]/20 focus:border-[#6D28D9]"
                  >
                    <option value="Active">Active</option>
                    <option value="Draft">Draft</option>
                    <option value="Completed">Completed</option>
                    <option value="Archived">Archived</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#1E1B4B] mb-1">
                  Study Overview
                </label>
                <textarea
                  rows={4}
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-[#E2E8F0] focus:outline-none focus:ring-2 focus:ring-[#6D28D9]/20 focus:border-[#6D28D9]"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#F1F5F9]">
                <button
                  type="button"
                  onClick={() => setIsEditStudyModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-[#E2E8F0] text-xs font-semibold text-[#64748B] hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-[#6D28D9] hover:bg-[#5B21B6] text-white text-xs font-semibold shadow-xs transition-colors"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: Add Finding */}
      {isAddFindingModalOpen && (
        <div className="fixed inset-0 z-50 bg-[#1E1B4B]/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xl w-full max-w-md p-6 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-4 border-b border-[#F1F5F9]">
              <h3 className="text-base font-bold text-[#1E1B4B]">Add Market Finding</h3>
              <button
                type="button"
                onClick={() => setIsAddFindingModalOpen(false)}
                className="p-1 rounded-lg hover:bg-slate-100 text-[#94A3B8] hover:text-[#1E1B4B]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddFinding} className="space-y-4 pt-4">
              <div>
                <label className="block text-xs font-semibold text-[#1E1B4B] mb-1">
                  Finding Summary *
                </label>
                <textarea
                  rows={3}
                  required
                  value={newFindingText}
                  onChange={(e) => setNewFindingText(e.target.value)}
                  placeholder="e.g. In-store digital payments increased by 40% in tier-1 supermarkets..."
                  className="w-full px-3 py-2 text-xs rounded-lg border border-[#E2E8F0] focus:outline-none focus:ring-2 focus:ring-[#6D28D9]/20 focus:border-[#6D28D9]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#1E1B4B] mb-1">
                  Status
                </label>
                <select
                  value={newFindingStatus}
                  onChange={(e) => setNewFindingStatus(e.target.value as FindingStatus)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-[#E2E8F0] bg-white focus:outline-none focus:ring-2 focus:ring-[#6D28D9]/20 focus:border-[#6D28D9]"
                >
                  <option value="New">New</option>
                  <option value="Reviewed">Reviewed</option>
                  <option value="Ready">Ready</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#F1F5F9]">
                <button
                  type="button"
                  onClick={() => setIsAddFindingModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-[#E2E8F0] text-xs font-semibold text-[#64748B] hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-[#6D28D9] hover:bg-[#5B21B6] text-white text-xs font-semibold shadow-xs transition-colors"
                >
                  Add Finding
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: Upload Document */}
      {isUploadDocModalOpen && (
        <div className="fixed inset-0 z-50 bg-[#1E1B4B]/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xl w-full max-w-md p-6 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-4 border-b border-[#F1F5F9]">
              <h3 className="text-base font-bold text-[#1E1B4B]">Upload Research Document</h3>
              <button
                type="button"
                onClick={() => setIsUploadDocModalOpen(false)}
                className="p-1 rounded-lg hover:bg-slate-100 text-[#94A3B8] hover:text-[#1E1B4B]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUploadSubmit} className="space-y-4 pt-4">
              <div>
                <label className="block text-xs font-semibold text-[#1E1B4B] mb-2">
                  Select Document / Evidence File
                </label>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  className="hidden"
                  accept=".pdf,.docx,.xlsx,.csv,.txt,.png,.jpg"
                />
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-[#DDD6FE] hover:border-[#6D28D9] bg-[#F8F7FC] rounded-xl p-6 text-center cursor-pointer transition-colors"
                >
                  <Upload className="w-8 h-8 text-[#6D28D9] mx-auto mb-2" />
                  <p className="text-xs font-semibold text-[#1E1B4B]">
                    {selectedUploadFile
                      ? selectedUploadFile.name
                      : 'Click to select a local research file'}
                  </p>
                  <p className="text-[11px] text-[#94A3B8] mt-1">
                    {selectedUploadFile
                      ? `${(selectedUploadFile.size / 1024).toFixed(1)} KB`
                      : 'PDF, DOCX, XLSX, CSV or Image files'}
                  </p>
                </div>
              </div>

              <div className="bg-[#EDE9FE]/50 rounded-lg p-3 text-[11px] text-[#6D28D9]">
                Document will be cataloged in this study's Source references.
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#F1F5F9]">
                <button
                  type="button"
                  onClick={() => setIsUploadDocModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-[#E2E8F0] text-xs font-semibold text-[#64748B] hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!selectedUploadFile}
                  className="px-4 py-2 rounded-lg bg-[#6D28D9] disabled:bg-slate-300 hover:bg-[#5B21B6] text-white text-xs font-semibold shadow-xs transition-colors"
                >
                  Upload & Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
