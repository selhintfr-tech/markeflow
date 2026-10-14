import type { Report, ReportFilterState } from './types';
import { REPORTS_STORAGE_KEY } from './data';

export const loadReportsFromStorage = (): Report[] => {
  try {
    const saved = localStorage.getItem(REPORTS_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (error) {
    console.error('Failed to load reports from storage:', error);
  }
  return [];
};

export const saveReportsToStorage = (reports: Report[]): void => {
  try {
    localStorage.setItem(REPORTS_STORAGE_KEY, JSON.stringify(reports));
  } catch (error) {
    console.error('Failed to save reports to storage:', error);
  }
};

export const filterReports = (reports: Report[], filters: ReportFilterState, workspaceId: string): Report[] => {
  return reports.filter((report) => {
    const matchesSearch = filters.search === '' || 
      report.name.toLowerCase().includes(filters.search.toLowerCase());
    
    const matchesCompany = filters.company === 'All companies' || 
      report.company === filters.company;
    
    const matchesStatus = filters.status === 'All' || 
      report.status === filters.status;
    
    const matchesWorkspace = report.workspaceId === workspaceId;
    
    return matchesSearch && matchesCompany && matchesStatus && matchesWorkspace;
  });
};

export const getUniqueCompanies = (reports: Report[]): string[] => {
  const companies = new Set(reports.map((r) => r.company));
  return ['All companies', ...Array.from(companies)];
};

export const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

export const formatCurrency = (amount: number): string => {
  return `${amount.toLocaleString()} MAD`;
};

export const generateCSV = (report: Report): string => {
  const headers = ['Metric', 'Value'];
  const rows: string[][] = [];
  
  rows.push(['Report Name', report.name]);
  rows.push(['Report Type', report.type]);
  rows.push(['Company', report.company]);
  rows.push(['Reporting Period', report.reportingPeriod]);
  rows.push(['Status', report.status]);
  rows.push(['Created By', report.createdBy]);
  rows.push(['Created Date', report.createdDate]);
  
  if (report.metrics) {
    rows.push([]);
    rows.push(['Metrics', '']);
    rows.push(['Ad Spend', `${report.metrics.adSpend} MAD`]);
    rows.push(['Leads', report.metrics.leads.toString()]);
    rows.push(['Revenue', `${report.metrics.revenue} MAD`]);
    rows.push(['Estimated Profit', `${report.metrics.estimatedProfit} MAD`]);
  }
  
  if (report.channelPerformance && report.channelPerformance.length > 0) {
    rows.push([]);
    rows.push(['Channel Performance', '']);
    report.channelPerformance.forEach((channel) => {
      rows.push([channel.channel, channel.value.toString()]);
    });
  }
  
  if (report.keyTakeaways && report.keyTakeaways.length > 0) {
    rows.push([]);
    rows.push(['Key Takeaways', '']);
    report.keyTakeaways.forEach((takeaway, index) => {
      rows.push([`${index + 1}`, takeaway]);
    });
  }
  
  const csvContent = [
    headers.join(','),
    ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
  ].join('\n');
  
  return csvContent;
};

export const downloadCSV = (report: Report): void => {
  const csv = generateCSV(report);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', `${report.name.replace(/[^a-z0-9]/gi, '_')}.csv`);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export const printReport = (): void => {
  window.print();
};
