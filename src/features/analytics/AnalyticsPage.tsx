import React, { useState, useCallback } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from 'recharts';
import {
  Megaphone,
  Users,
  Coins,
  User,
  Percent,
  TrendingUp,
  ChevronDown,
  Calendar,
  Building2,
  Share2,
  BarChart3,
  Download,
  Info,
  ChevronRight,
} from 'lucide-react';
import {
  analyticsKpis,
  performanceOverTimeData,
  channelPerformanceData,
  detailedKpiRows,
  campaignOptions,
  channelOptions,
  dateRangeOptions,
  type PerformancePoint,
  type ChannelDataPoint,
} from './analyticsData';

// ─── KPI Icon Helper ────────────────────────────────────────────────────────
const KpiIcon: React.FC<{ name: string; className?: string }> = ({
  name,
  className = 'w-4 h-4',
}) => {
  switch (name) {
    case 'megaphone':
      return <Megaphone className={className} />;
    case 'users':
      return <Users className={className} />;
    case 'coins':
      return <Coins className={className} />;
    case 'user-check':
    case 'user':
      return <User className={className} />;
    case 'percent':
      return <Percent className={className} />;
    case 'trending-up':
      return <TrendingUp className={className} />;
    default:
      return <BarChart3 className={className} />;
  }
};

// ─── Toolbar Dropdown ────────────────────────────────────────────────────────
const ToolbarDropdown: React.FC<{
  icon?: React.ReactNode;
  value: string;
  options: string[];
  onChange: (v: string) => void;
}> = ({ icon, value, options, onChange }) => {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#E2E8F0] bg-white text-xs text-[#1E1B4B] hover:bg-[#F8FAFC] transition-colors font-medium shadow-2xs whitespace-nowrap"
      >
        {icon && <span className="text-[#64748B] shrink-0">{icon}</span>}
        <span>{value}</span>
        <ChevronDown className="w-3.5 h-3.5 text-[#94A3B8] ml-0.5 shrink-0" />
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1 z-30 bg-white border border-[#E2E8F0] rounded-lg shadow-lg py-1 min-w-[180px]">
          {options.map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => {
                onChange(opt);
                setOpen(false);
              }}
              className={`w-full text-left px-3 py-1.5 text-xs transition-colors ${
                opt === value
                  ? 'text-[#6D28D9] font-bold bg-[#F5F3FF]'
                  : 'text-[#334155] hover:bg-[#F8FAFC]'
              }`}
            >
              {opt}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

// ─── KPI Card ────────────────────────────────────────────────────────────────
const KpiCard: React.FC<{
  label: string;
  value: string;
  icon: string;
  isGreenValue?: boolean;
}> = ({ label, value, icon, isGreenValue }) => {
  const getIconStyles = (iconName: string) => {
    switch (iconName) {
      case 'megaphone':
        return { bg: 'bg-[#F5F3FF]', text: 'text-[#6D28D9]' };
      case 'users':
        return { bg: 'bg-[#EFF6FF]', text: 'text-[#2563EB]' };
      case 'coins':
        return { bg: 'bg-[#ECFDF5]', text: 'text-[#0D9488]' };
      case 'user-check':
      case 'user':
        return { bg: 'bg-[#F5F3FF]', text: 'text-[#7C3AED]' };
      case 'percent':
        return { bg: 'bg-[#ECFDF5]', text: 'text-[#0D9488]' };
      case 'trending-up':
        return { bg: 'bg-[#ECFDF5]', text: 'text-[#0D9488]' };
      default:
        return { bg: 'bg-[#F5F3FF]', text: 'text-[#6D28D9]' };
    }
  };

  const { bg, text } = getIconStyles(icon);

  return (
    <div className="bg-white rounded-xl border border-[#E2E8F0] p-3.5 flex items-center gap-3 shadow-xs hover:border-[#CBD5E1] transition-all min-w-0">
      <div
        className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${bg} ${text}`}
      >
        <KpiIcon name={icon} className="w-4 h-4" />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1 text-[11px] text-[#64748B] font-medium leading-tight">
          <span className="truncate">{label}</span>
          <Info className="w-3 h-3 text-[#CBD5E1] shrink-0" />
        </div>
        <div
          className={`text-base lg:text-lg font-bold leading-tight mt-0.5 truncate ${
            isGreenValue ? 'text-[#0D9488]' : 'text-[#1E1B4B]'
          }`}
        >
          {value}
        </div>
      </div>
    </div>
  );
};

// ─── Performance Chart ────────────────────────────────────────────────────────
type PerfTab = 'leads' | 'spend' | 'customers';

const PerformanceTooltip = ({ active, payload, label, activeTab }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white border border-[#E2E8F0] rounded-lg px-2.5 py-1.5 text-xs shadow-md">
        <div className="text-[#64748B] text-[10px] mb-0.5">{label} 2026</div>
        <div className="flex items-center gap-1.5 font-bold text-[#1E1B4B]">
          <span className="w-2 h-2 rounded-full bg-[#6D28D9] inline-block" />
          <span className="capitalize">{activeTab}</span>: {payload[0].value}
        </div>
      </div>
    );
  }
  return null;
};

const PerformanceChart: React.FC<{ data: PerformancePoint[] }> = ({ data }) => {
  const [activeTab, setActiveTab] = useState<PerfTab>('leads');

  const tabs: { key: PerfTab; label: string }[] = [
    { key: 'leads', label: 'Leads' },
    { key: 'spend', label: 'Spend' },
    { key: 'customers', label: 'Customers' },
  ];

  return (
    <div className="bg-white rounded-xl border border-[#E2E8F0] p-4 shadow-xs flex flex-col justify-between h-full">
      {/* Chart Header */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div>
          <h3 className="font-bold text-[#1E1B4B] text-sm">Performance over time</h3>
          <p className="text-[11px] text-[#94A3B8] mt-0.5">
            Daily campaign performance for 01 Oct 2026 – 31 Oct 2026.
          </p>
        </div>

        <div className="flex bg-[#F1F5F9] rounded-lg p-0.5 shrink-0">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${
                activeTab === tab.key
                  ? 'bg-[#6D28D9] text-white shadow-xs'
                  : 'text-[#64748B] hover:text-[#1E1B4B]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Line Chart */}
      <div className="h-[160px] w-full my-1">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: -22 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 10, fill: '#94A3B8' }}
              axisLine={{ stroke: '#F1F5F9' }}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 10, fill: '#94A3B8' }}
              axisLine={false}
              tickLine={false}
              domain={[0, 40]}
              ticks={[0, 10, 20, 30, 40]}
            />
            <Tooltip content={<PerformanceTooltip activeTab={activeTab} />} />
            <Line
              type="monotone"
              dataKey={activeTab}
              stroke="#6D28D9"
              strokeWidth={2}
              dot={{ r: 3, fill: '#6D28D9', stroke: '#FFFFFF', strokeWidth: 1.5 }}
              activeDot={{ r: 5, fill: '#6D28D9' }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Chart Footer */}
      <div className="text-[10px] text-[#94A3B8] mt-1">
        Source: Manual entry / CSV import
      </div>
    </div>
  );
};

// ─── Lead Conversion Funnel ───────────────────────────────────────────────────
const LeadConversionFunnel: React.FC = () => {
  const stages = [
    { label: 'New', count: 180, pct: '100%', bg: 'bg-[#6D28D9]' },
    { label: 'Contacted', count: 120, pct: '66.7%', bg: 'bg-[#8B5CF6]' },
    { label: 'Qualified', count: 90, pct: '50.0%', bg: 'bg-[#A78BFA]' },
    { label: 'Converted', count: 60, pct: '33.3%', bg: 'bg-[#2DD4BF]' },
  ];

  return (
    <div className="bg-white rounded-xl border border-[#E2E8F0] p-4 shadow-xs flex flex-col justify-between h-full">
      <div>
        <h3 className="font-bold text-[#1E1B4B] text-sm">Lead conversion funnel</h3>
        <p className="text-[11px] text-[#94A3B8] mt-0.5">
          From total leads to converted customers.
        </p>

        {/* Funnel sequence */}
        <div className="flex items-center justify-between gap-1 mt-4">
          {stages.map((stage, idx) => (
            <React.Fragment key={stage.label}>
              <div className="flex-1 min-w-0 text-center">
                <div className="text-[11px] text-[#64748B] font-medium">{stage.label}</div>
                <div className="text-base font-bold text-[#1E1B4B] my-0.5">{stage.count}</div>
                <div className={`w-full h-9 rounded-sm ${stage.bg} my-1`} />
                <div className="text-xs font-bold text-[#1E1B4B]">{stage.pct}</div>
                <div className="text-[10px] text-[#94A3B8]">of leads</div>
              </div>

              {idx < stages.length - 1 && (
                <ChevronRight className="w-4 h-4 text-[#CBD5E1] shrink-0 mt-3" />
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      <div className="text-[10px] text-[#94A3B8] mt-3">
        Source: Manual entry / CSV import
      </div>
    </div>
  );
};

// ─── Channel Performance ──────────────────────────────────────────────────────
const ChannelPerformance: React.FC<{ data: ChannelDataPoint[] }> = ({ data }) => {
  const [metric, setMetric] = useState<'spend' | 'leads'>('spend');

  return (
    <div className="bg-white rounded-xl border border-[#E2E8F0] p-4 shadow-xs">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <div>
          <h3 className="font-bold text-[#1E1B4B] text-sm">Channel performance</h3>
          <p className="text-[11px] text-[#94A3B8] mt-0.5">
            Campaign performance by marketing channel.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <div className="flex items-center gap-3 text-xs text-[#64748B] font-medium">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#6D28D9]" />
              Spend (MAD)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#C4B5FD]" />
              Leads
            </span>
          </div>

          <select
            value={metric}
            onChange={(e) => setMetric(e.target.value as 'spend' | 'leads')}
            className="text-xs border border-[#E2E8F0] rounded-lg px-2.5 py-1 text-[#1E1B4B] font-medium bg-white focus:outline-none focus:ring-1 focus:ring-[#6D28D9]"
          >
            <option value="spend">Spend</option>
            <option value="leads">Leads</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
        {/* Bar chart (~62%) */}
        <div className="lg:col-span-7 h-[175px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 18, right: 10, bottom: 0, left: -20 }} barGap={6}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
              <XAxis
                dataKey="channel"
                tick={{ fontSize: 10, fill: '#64748B' }}
                axisLine={{ stroke: '#F1F5F9' }}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 10, fill: '#94A3B8' }}
                axisLine={false}
                tickLine={false}
                domain={[0, 2400]}
                ticks={[0, 600, 1200, 1800, 2400]}
              />
              <Bar
                dataKey="spend"
                fill="#6D28D9"
                radius={[2, 2, 0, 0]}
                maxBarSize={36}
                label={{
                  position: 'top',
                  fill: '#1E1B4B',
                  fontSize: 10,
                  fontWeight: 600,
                  formatter: (v: any) => v.toLocaleString(),
                }}
              />
              <Bar
                dataKey="leads"
                fill="#C4B5FD"
                radius={[2, 2, 0, 0]}
                maxBarSize={36}
                label={{
                  position: 'top',
                  fill: '#1E1B4B',
                  fontSize: 10,
                  fontWeight: 600,
                }}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Channel Table (~38%) */}
        <div className="lg:col-span-5 border-t lg:border-t-0 lg:border-l border-[#F1F5F9] pt-3 lg:pt-0 lg:pl-4">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-[#F1F5F9] text-[11px] font-semibold text-[#64748B]">
                <th className="text-left pb-2">Channel</th>
                <th className="text-right pb-2">Spend (MAD)</th>
                <th className="text-right pb-2">Leads</th>
                <th className="text-right pb-2">CPL (MAD)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F8FAFC]">
              {data.map((row) => (
                <tr key={row.channel} className="hover:bg-[#F8FAFC]">
                  <td className="py-2 text-[#1E1B4B] font-medium">{row.channel}</td>
                  <td className="py-2 text-right text-[#475569]">{row.spend.toLocaleString()}</td>
                  <td className="py-2 text-right text-[#475569]">{row.leads}</td>
                  <td className="py-2 text-right text-[#475569]">{row.cpl}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="text-[10px] text-[#94A3B8] mt-2">
            Source: Manual entry / CSV import
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Detailed KPI Table ───────────────────────────────────────────────────────
const DetailedKpiTable: React.FC = () => {
  return (
    <div className="bg-white rounded-xl border border-[#E2E8F0] p-4 shadow-xs">
      <div className="mb-3">
        <h3 className="font-bold text-[#1E1B4B] text-sm">Detailed KPI breakdown</h3>
        <p className="text-[11px] text-[#94A3B8] mt-0.5">
          Campaign metrics for Autumn Launch 2026.
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-[#F1F5F9] text-[11px] font-semibold text-[#64748B]">
              <th className="text-left pb-2.5">Metric</th>
              <th className="text-left pb-2.5">Value</th>
              <th className="text-left pb-2.5">Change vs Previous Period</th>
              <th className="text-left pb-2.5">Source</th>
              <th className="text-left pb-2.5">Notes</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#F8FAFC]">
            {detailedKpiRows.map((row) => {
              const isRoas = row.metric === 'ROAS';
              const isCpl = row.metric === 'Cost Per Lead';

              return (
                <tr key={row.metric} className="hover:bg-[#F8FAFC] transition-colors">
                  <td className="py-2.5 pr-3">
                    <div className="flex items-center gap-2 font-medium text-[#1E1B4B]">
                      <span className="w-5 h-5 rounded-full bg-[#EDE9FE] flex items-center justify-center shrink-0">
                        <KpiIcon name={row.icon} className="w-3 h-3 text-[#6D28D9]" />
                      </span>
                      <span>{row.metric}</span>
                    </div>
                  </td>
                  <td
                    className={`py-2.5 pr-3 font-semibold ${
                      isRoas ? 'text-[#0D9488]' : 'text-[#1E1B4B]'
                    }`}
                  >
                    {row.value}
                  </td>
                  <td className="py-2.5 pr-3">
                    <span
                      className={`font-semibold ${
                        isCpl ? 'text-[#EF4444]' : 'text-[#0D9488]'
                      }`}
                    >
                      ↑ {row.changeVsPrev}
                    </span>
                  </td>
                  <td className="py-2.5 pr-3 text-[#64748B]">{row.source}</td>
                  <td className="py-2.5 text-[#94A3B8]">{row.notes}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="text-[10px] text-[#94A3B8] mt-2.5">
        Source: Manual entry / CSV import
      </div>
    </div>
  );
};

// ─── Main Page ────────────────────────────────────────────────────────────────
export const AnalyticsPage: React.FC = () => {
  const [workspace, setWorkspace] = useState('Atlas Retail SARL');
  const [dateRange, setDateRange] = useState(dateRangeOptions[0]);
  const [campaign, setCampaign] = useState(campaignOptions[0]);
  const [channel, setChannel] = useState(channelOptions[0]);

  const handleExport = useCallback(() => {
    const rows = [
      ['Metric', 'Value', 'Change vs Previous Period', 'Source', 'Notes'],
      ...detailedKpiRows.map((r) => [
        r.metric,
        r.value,
        r.changeVsPrev,
        r.source,
        r.notes,
      ]),
    ];
    const csv = rows.map((r) => r.map((c) => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'analytics-export.csv';
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  return (
    <div className="space-y-4">
      {/* Breadcrumb & Header */}
      <div>
        <div className="text-xs font-medium text-[#64748B] mb-1">
          <span>Insights</span>
          <span className="mx-1.5 text-[#94A3B8]">/</span>
          <span className="text-[#6D28D9] font-semibold">Analytics</span>
        </div>
        <h1 className="text-2xl font-bold text-[#1E1B4B] tracking-tight">
          Marketing Analytics
        </h1>
        <p className="text-xs text-[#64748B] mt-0.5">
          Track campaign performance using recorded marketing data.
        </p>
      </div>

      {/* Toolbar: 5 Filters + Export Button */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <ToolbarDropdown
            icon={<Building2 className="w-3.5 h-3.5" />}
            value={workspace}
            options={['Atlas Retail SARL', 'Nova Studio SARL']}
            onChange={setWorkspace}
          />
          <ToolbarDropdown
            icon={<Calendar className="w-3.5 h-3.5" />}
            value={dateRange}
            options={dateRangeOptions}
            onChange={setDateRange}
          />
          <ToolbarDropdown
            icon={<Megaphone className="w-3.5 h-3.5" />}
            value={campaign}
            options={campaignOptions}
            onChange={setCampaign}
          />
          <ToolbarDropdown
            icon={<Share2 className="w-3.5 h-3.5" />}
            value={channel}
            options={channelOptions}
            onChange={setChannel}
          />
          <ToolbarDropdown
            icon={<BarChart3 className="w-3.5 h-3.5" />}
            value="Compare: Previous period"
            options={[
              'Compare: Previous period',
              'Compare: Previous year',
              'No comparison',
            ]}
            onChange={() => {}}
          />
        </div>

        <button
          type="button"
          onClick={handleExport}
          className="flex items-center gap-1.5 px-3.5 py-1.5 bg-[#6D28D9] text-white rounded-lg text-xs font-semibold hover:bg-[#5B21B6] transition-colors shadow-2xs"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Export</span>
        </button>
      </div>

      {/* Six KPI Cards in One Row */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {analyticsKpis.map((kpi) => (
          <KpiCard
            key={kpi.id}
            label={kpi.label}
            value={kpi.value}
            icon={kpi.icon}
            isGreenValue={kpi.id === 'roas'}
          />
        ))}
      </div>

      {/* Performance Chart & Lead Funnel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-8">
          <PerformanceChart data={performanceOverTimeData} />
        </div>
        <div className="lg:col-span-4">
          <LeadConversionFunnel />
        </div>
      </div>

      {/* Channel Performance */}
      <ChannelPerformance data={channelPerformanceData} />

      {/* Detailed KPI Breakdown */}
      <DetailedKpiTable />
    </div>
  );
};

export default AnalyticsPage;
