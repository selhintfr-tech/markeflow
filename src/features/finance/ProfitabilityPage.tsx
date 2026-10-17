import React, { useCallback, useEffect, useState } from 'react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { financeService, type FinanceSummary } from './financeService';

const formatMoney = (value: string | number, currency: string) =>
  new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(Number(value) || 0);

export const ProfitabilityPage: React.FC = () => {
  const { currentWorkspace, hasWorkspace, isLoadingWorkspaces } = useWorkspace();
  const workspaceId = currentWorkspace.id;
  const currency = currentWorkspace.currency || 'USD';
  const [summary, setSummary] = useState<FinanceSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    if (!workspaceId) {
      setSummary(null);
      return;
    }
    setLoading(true);
    setError('');
    try {
      setSummary(await financeService.summary(workspaceId));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to load profitability data.');
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  if (isLoadingWorkspaces) return <p className="p-6 text-sm text-slate-500">Loading workspaces…</p>;
  if (!hasWorkspace) return <p className="p-6 text-sm text-slate-600">Select or create a workspace to view profitability.</p>;

  const income = Number(summary?.income || 0);
  const expenses = Number(summary?.expenses || 0);
  const net = income - expenses;
  const margin = income > 0 ? (net / income) * 100 : 0;

  return (
    <main className="mx-auto max-w-7xl space-y-6 p-4 text-slate-900 sm:p-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-slate-500">Finance / Profitability</p>
          <h1 className="mt-1 text-2xl font-bold">Profitability</h1>
          <p className="mt-1 text-sm text-slate-600">{currentWorkspace.name} · totals from recorded workspace transactions</p>
        </div>
        <button onClick={() => void refresh()} disabled={loading} className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-slate-50 disabled:opacity-50">{loading ? 'Refreshing…' : 'Refresh'}</button>
      </header>

      {error && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</div>}
      {loading && !summary ? <p className="rounded-xl border bg-white p-8 text-center text-sm text-slate-500">Loading profitability data…</p> : (
        <>
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Metric label="Recorded income" value={formatMoney(income, currency)} />
            <Metric label="Recorded expenses" value={formatMoney(expenses, currency)} />
            <Metric label="Net" value={formatMoney(net, currency)} tone={net < 0 ? 'negative' : 'positive'} />
            <Metric label="Net margin" value={`${margin.toFixed(1)}%`} tone={margin < 0 ? 'negative' : 'positive'} />
          </section>

          <section className="rounded-xl border bg-white p-4 sm:p-5">
            <div className="mb-4">
              <h2 className="text-lg font-semibold">Budget vs actual</h2>
              <p className="text-sm text-slate-500">Category actuals reflect recorded expenses within each budget period.</p>
            </div>
            {!summary?.budgets.length ? (
              <p className="rounded-lg bg-slate-50 p-6 text-center text-sm text-slate-500">No active budget comparisons are available.</p>
            ) : <div className="space-y-5">
              {summary.budgets.map((item) => {
                const planned = Number(item.budget);
                const actual = Number(item.actual);
                const fill = planned > 0 ? Math.min(actual / planned * 100, 100) : 0;
                return <article key={item.budget_id}>
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-sm">
                    <h3 className="font-medium">{item.category}</h3>
                    <span className="text-slate-600">{formatMoney(actual, currency)} actual / {formatMoney(planned, currency)} budget</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-slate-100" aria-label={`${item.category} budget use ${fill.toFixed(0)}%`}>
                    <div className={`h-full rounded-full ${actual > planned ? 'bg-red-500' : 'bg-violet-600'}`} style={{ width: `${fill}%` }} />
                  </div>
                  <p className={`mt-1 text-xs ${Number(item.variance) < 0 ? 'text-red-700' : 'text-slate-500'}`}>
                    {Number(item.variance) < 0 ? 'Over budget' : 'Remaining'}: {formatMoney(Math.abs(Number(item.variance)), currency)}
                  </p>
                </article>;
              })}
            </div>}
          </section>
          {!loading && income === 0 && expenses === 0 && (
            <p className="rounded-lg border border-dashed p-5 text-center text-sm text-slate-500">No income or expenses have been recorded for this workspace yet.</p>
          )}
        </>
      )}
    </main>
  );
};

function Metric({ label, value, tone }: { label: string; value: string; tone?: 'positive' | 'negative' }) {
  return <article className="rounded-xl border bg-white p-5">
    <p className="text-sm text-slate-500">{label}</p>
    <p className={`mt-2 text-2xl font-bold ${tone === 'positive' ? 'text-emerald-700' : tone === 'negative' ? 'text-red-700' : ''}`}>{value}</p>
  </article>;
}
