import React, { useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Eye,
  Filter,
  RefreshCw,
  Search,
  ShieldCheck,
  Truck,
  Upload,
  X,
} from 'lucide-react';
import type { OzonDashboardData, OzonParcelItem, OzonProbeResult } from '../deliveryService';
import { deliveryService } from '../deliveryService';

interface Props {
  workspaceId: string;
  data: OzonDashboardData;
  loading: boolean;
  onRefresh: () => Promise<void>;
}

export const OzonIndependentDashboard: React.FC<Props> = ({
  workspaceId,
  data,
  loading,
  onRefresh,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedParcel, setSelectedParcel] = useState<OzonParcelItem | null>(null);

  // Probe Modal State
  const [showProbeModal, setShowProbeModal] = useState(false);
  const [probeTracking, setProbeTracking] = useState('TMRA102633371118PL');
  const [probing, setProbing] = useState(false);
  const [probeResult, setProbeResult] = useState<OzonProbeResult | null>(null);
  const [probeError, setProbeError] = useState<string | null>(null);

  // CSV Import Modal State
  const [showImportModal, setShowImportModal] = useState(false);
  const [csvContent, setCsvContent] = useState('');
  const [importingCsv, setImportingCsv] = useState(false);
  const [importNotice, setImportNotice] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);

  const { summary, parcels } = data;

  const handleImportCsv = async () => {
    if (!csvContent.trim()) {
      setImportError('Please upload an Ozon export file or paste CSV content.');
      return;
    }
    setImportingCsv(true);
    setImportError(null);
    setImportNotice(null);
    try {
      const res = await deliveryService.importOzonCsv(workspaceId, csvContent);
      setImportNotice(res.message);
      setCsvContent('');
      await onRefresh();
    } catch (err) {
      setImportError(err instanceof Error ? err.message : 'Failed to import Ozon CSV.');
    } finally {
      setImportingCsv(false);
    }
  };

  const handleRunProbe = async (trackingToTest?: string) => {
    setProbing(true);
    setProbeResult(null);
    setProbeError(null);
    try {
      const res = await deliveryService.probeOzon(workspaceId, trackingToTest || probeTracking);
      setProbeResult(res);
    } catch (err) {
      setProbeError(err instanceof Error ? err.message : 'Read-only probe failed');
    } finally {
      setProbing(false);
    }
  };

  const filteredParcels = parcels.filter((p) => {
    const matchesSearch =
      !searchTerm ||
      (p.tracking_number && p.tracking_number.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (p.recipient_name && p.recipient_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (p.destination_city && p.destination_city.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (p.recipient_phone && p.recipient_phone.includes(searchTerm));

    if (!matchesSearch) return false;

    if (statusFilter === 'all') return true;
    if (statusFilter === 'new') return p.status === 'pending' || p.status === 'label_created';
    if (statusFilter === 'transit') return p.status === 'in_transit' || p.status === 'picked_up' || p.status === 'out_for_delivery';
    if (statusFilter === 'delivered') return p.status === 'delivered';
    if (statusFilter === 'returned') return p.status === 'returned' || p.status === 'failed';

    return true;
  });

  return (
    <div className="space-y-6">
      {/* Top Header & Credentials Context */}
      <div className="rounded-2xl border border-violet-100 bg-linear-to-r from-violet-900 via-indigo-950 to-slate-900 p-6 text-white shadow-xl">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-600/60 ring-1 ring-white/20">
                <Truck className="h-5 w-5 text-white" />
              </span>
              <h2 className="text-xl font-bold tracking-tight text-white">
                Ozon Express Official Account Dashboard
              </h2>
              <span
                className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${
                  summary.is_dry_run
                    ? 'bg-amber-500/20 text-amber-200 ring-amber-400/30'
                    : 'bg-emerald-500/20 text-emerald-200 ring-emerald-400/30'
                }`}
              >
                {summary.is_dry_run ? 'Simulation Mode (Dry-Run)' : 'Live Connected'}
              </span>
            </div>
            <p className="text-xs text-violet-200/80">
              Direct carrier intelligence from Ozon Express Morocco. Independent from internal Sales &amp; Orders.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() => {
                setShowImportModal(true);
                setImportNotice(null);
                setImportError(null);
              }}
              className="inline-flex items-center gap-1.5 rounded-xl border border-violet-400/30 bg-white/10 px-3.5 py-2 text-xs font-semibold text-white shadow-xs backdrop-blur-xs transition hover:bg-white/20 active:scale-95"
              title="Import official Ozon CSV export into staging without modifying Sales & Orders"
            >
              <Upload className="h-4 w-4 text-violet-300" />
              Import Ozon Export
            </button>
            <button
              type="button"
              onClick={() => {
                setShowProbeModal(true);
                if (!probeResult) void handleRunProbe('TMRA102633371118PL');
              }}
              className="inline-flex items-center gap-1.5 rounded-xl border border-violet-400/30 bg-white/10 px-3.5 py-2 text-xs font-semibold text-white shadow-xs backdrop-blur-xs transition hover:bg-white/20 active:scale-95"
              title="Test a real tracking number directly with zero database changes"
            >
              <ShieldCheck className="h-4 w-4 text-emerald-400" />
              Live Read-Only Probe
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={() => void onRefresh()}
              className="inline-flex items-center gap-1.5 rounded-xl bg-violet-600 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-violet-500 active:scale-95 disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
              {loading ? 'Refreshing…' : 'Sync Ozon'}
            </button>
          </div>
        </div>

        {/* Status / Exclusion Notification Strip */}
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-4 text-xs text-violet-200/70">
          <div className="flex items-center gap-2">
            <Clock className="h-3.5 w-3.5 text-violet-400" />
            <span>
              Last sync:{' '}
              <strong className="text-white">
                {summary.last_sync_at ? new Date(summary.last_sync_at).toLocaleString() : 'Never'}
              </strong>
            </span>
          </div>
          <div className="flex items-center gap-1.5 rounded-lg bg-white/5 px-2.5 py-1 text-xs text-amber-200/90 ring-1 ring-white/10">
            <span className="font-semibold text-white">Private Couriers Excluded:</span>
            <span>{summary.private_couriers_excluded.join(', ')} (0 orders mixed)</span>
          </div>
        </div>
      </div>

      {/* KPI Grid (Section 6 requirements) */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs">
          <span className="text-[11px] font-medium uppercase tracking-wider text-slate-500">Verified Live Ozon Parcels</span>
          <p className="mt-1 text-2xl font-bold text-slate-900">{summary.total_ozon_parcels}</p>
          <span className="mt-1 block text-[10px] font-medium text-amber-600">Full account parcel count unavailable</span>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs">
          <span className="text-[11px] font-medium uppercase tracking-wider text-slate-500">New / Pickup</span>
          <p className="mt-1 text-2xl font-bold text-amber-600">
            {summary.new_parcels + summary.pickup_ramassage}
          </p>
          <span className="mt-1 block text-[10px] text-slate-400">{summary.pickup_ramassage} in pickup</span>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs">
          <span className="text-[11px] font-medium uppercase tracking-wider text-slate-500">In Transit</span>
          <p className="mt-1 text-2xl font-bold text-blue-600">{summary.in_transit}</p>
          <span className="mt-1 block text-[10px] text-slate-400">{summary.out_for_delivery} out for delivery</span>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs">
          <span className="text-[11px] font-medium uppercase tracking-wider text-slate-500">Delivered</span>
          <p className="mt-1 text-2xl font-bold text-emerald-600">{summary.delivered}</p>
          <span className="mt-1 block text-[10px] text-slate-400">Successfully completed</span>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs">
          <span className="text-[11px] font-medium uppercase tracking-wider text-slate-500">Returned / Refused</span>
          <p className="mt-1 text-2xl font-bold text-rose-600">{summary.returned_refused}</p>
          <span className="mt-1 block text-[10px] text-slate-400">Failed delivery attempts</span>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs">
          <span className="text-[11px] font-medium uppercase tracking-wider text-slate-500">Invoiced Status</span>
          <p className="mt-1 text-sm font-semibold text-slate-600">{summary.delivered_and_invoiced}</p>
          <span className="mt-1 block text-[10px] text-slate-400">Requires Ozon Invoice API</span>
        </div>
      </div>

      {/* Financial Metrics Strip */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-linear-to-b from-white to-slate-50 p-4">
          <span className="text-xs font-semibold text-slate-600">Total COD Collected / Expected</span>
          <p className="mt-2 text-2xl font-extrabold text-slate-900">
            {summary.total_cod.toLocaleString(undefined, { minimumFractionDigits: 2 })} MAD
          </p>
          <p className="mt-1 text-[11px] text-slate-500">Gross cash amount charged to recipients</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-linear-to-b from-white to-slate-50 p-4">
          <span className="text-xs font-semibold text-slate-600">Actual Ozon Delivery Fees</span>
          <p className="mt-2 text-2xl font-extrabold text-violet-700">
            {summary.actual_delivery_fees.toLocaleString(undefined, { minimumFractionDigits: 2 })} MAD
          </p>
          <p className="mt-1 text-[11px] text-slate-500">Delivery and return charges billed by Ozon</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-linear-to-b from-white to-slate-50 p-4">
          <span className="text-xs font-semibold text-slate-600">Expected Net Remittance</span>
          <p className="mt-2 text-2xl font-extrabold text-emerald-700">
            {summary.expected_net_remittances.toLocaleString(undefined, { minimumFractionDigits: 2 })} MAD
          </p>
          <p className="mt-1 text-[11px] text-slate-500">Expected payout: COD minus carrier fees</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-linear-to-b from-white to-slate-50 p-4">
          <span className="text-xs font-semibold text-slate-600">Confirmed Bank Remittance</span>
          <p className="mt-2 text-sm font-bold text-amber-700">Unavailable</p>
          <p className="mt-1 text-[11px] text-slate-500">
            Requires bank verification. Delivery does not imply bank deposit.
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search tracking, recipient, city, or phone…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-xs outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-100"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          <Filter className="h-3.5 w-3.5 text-slate-400" />
          {[
            { id: 'all', label: `All (${parcels.length})` },
            { id: 'new', label: `New (${summary.new_parcels})` },
            { id: 'transit', label: `In Transit (${summary.in_transit})` },
            { id: 'delivered', label: `Delivered (${summary.delivered})` },
            { id: 'returned', label: `Returned (${summary.returned_refused})` },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setStatusFilter(tab.id)}
              className={`rounded-lg px-2.5 py-1.5 text-xs font-medium transition ${
                statusFilter === tab.id
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Real Ozon Parcels Table */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-100 bg-slate-50/75 text-[11px] font-semibold text-slate-500">
              <tr>
                <th className="px-4 py-3">Tracking / Reference</th>
                <th className="px-4 py-3">Recipient &amp; Destination</th>
                <th className="px-4 py-3">Carrier Status</th>
                <th className="px-4 py-3">COD Amount</th>
                <th className="px-4 py-3">Delivery Fee</th>
                <th className="px-4 py-3">Net Expected</th>
                <th className="px-4 py-3">Data Source</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredParcels.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-slate-500">
                    No Ozon parcels match your search or filter.
                  </td>
                </tr>
              ) : (
                filteredParcels.map((parcel) => (
                  <tr key={parcel.id} className="hover:bg-slate-50/70 transition">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <code className="font-mono font-bold text-slate-900 bg-slate-100 px-1.5 py-0.5 rounded">
                          {parcel.tracking_number || 'N/A'}
                        </code>
                        {parcel.is_return && (
                          <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[9px] font-bold text-amber-800 ring-1 ring-amber-300/60">
                            Return
                          </span>
                        )}
                      </div>
                      {parcel.order_reference && (
                        <p className="mt-0.5 text-[10px] text-slate-400">Ref: {parcel.order_reference}</p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-semibold text-slate-900">{parcel.recipient_name}</p>
                      <p className="text-[10px] text-slate-500">
                        {parcel.destination_city} · {parcel.recipient_phone}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                          parcel.status === 'delivered'
                            ? 'bg-emerald-100 text-emerald-800'
                            : parcel.status === 'in_transit' || parcel.status === 'picked_up'
                            ? 'bg-blue-100 text-blue-800'
                            : parcel.status === 'returned' || parcel.status === 'failed'
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {parcel.raw_status}
                      </span>
                      <p className="mt-0.5 text-[10px] text-slate-400 capitalize">{parcel.status}</p>
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-900">
                      {parcel.cod_amount > 0 ? `${parcel.cod_amount.toFixed(2)} MAD` : '0.00 MAD'}
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-700">
                      {parcel.delivery_fee > 0 ? `${parcel.delivery_fee.toFixed(2)} MAD` : '0.00 MAD'}
                    </td>
                    <td className="px-4 py-3 font-semibold text-emerald-700">
                      {Math.max(0, parcel.cod_amount - parcel.delivery_fee).toFixed(2)} MAD
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${
                          parcel.source_label.includes('Live')
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : parcel.source_label.includes('Export')
                            ? 'bg-blue-50 text-blue-700 border border-blue-200'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {parcel.source_label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => setSelectedParcel(parcel)}
                        className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-50 transition"
                      >
                        <Eye className="h-3 w-3 text-slate-500" />
                        Details
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Parcel Details Modal */}
      {selectedParcel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">
                Ozon Parcel Details: {selectedParcel.tracking_number}
              </h3>
              <button
                type="button"
                onClick={() => setSelectedParcel(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4 space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3 rounded-xl bg-slate-50 p-3">
                <div>
                  <span className="text-slate-500 block">Recipient</span>
                  <strong className="text-slate-900">{selectedParcel.recipient_name}</strong>
                  {selectedParcel.recipient_phone && (
                    <a
                      href={`tel:${selectedParcel.recipient_phone}`}
                      className="text-violet-600 block hover:underline"
                    >
                      {selectedParcel.recipient_phone}
                    </a>
                  )}
                  {selectedParcel.destination_address && (
                    <p className="mt-1 text-[11px] text-slate-600">
                      {selectedParcel.destination_address}
                    </p>
                  )}
                </div>
                <div>
                  <span className="text-slate-500 block">Destination City</span>
                  <strong className="text-slate-900">{selectedParcel.destination_city}</strong>
                  {selectedParcel.is_return && (
                    <span className="mt-1 inline-block rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-800">
                      Return Shipment (Merchant Returned)
                    </span>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="rounded-lg border border-slate-200 p-2.5">
                  <span className="text-slate-500 block text-[10px]">COD Amount</span>
                  <strong className="text-slate-900 text-sm">{selectedParcel.cod_amount} MAD</strong>
                </div>
                <div className="rounded-lg border border-slate-200 p-2.5">
                  <span className="text-slate-500 block text-[10px]">Delivery Fee</span>
                  <strong className="text-violet-700 text-sm">{selectedParcel.delivery_fee} MAD</strong>
                </div>
                <div className="rounded-lg border border-slate-200 p-2.5">
                  <span className="text-slate-500 block text-[10px]">Net Payout</span>
                  <strong className="text-emerald-700 text-sm">
                    {Math.max(0, selectedParcel.cod_amount - selectedParcel.delivery_fee)} MAD
                  </strong>
                </div>
              </div>

              <div className="rounded-lg border border-slate-200 p-3 space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-500">Invoice Status:</span>
                  <strong className="text-slate-700">{selectedParcel.invoice_status}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Collected Amount:</span>
                  <strong className="text-slate-700">{selectedParcel.collected_amount}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Data Source:</span>
                  <span className="font-semibold text-violet-700">{selectedParcel.source_label}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Last Synced:</span>
                  <span className="text-slate-600">{new Date(selectedParcel.last_updated_at || '').toLocaleString()}</span>
                </div>
              </div>

              {selectedParcel.history && selectedParcel.history.length > 0 && (
                <div>
                  <p className="font-semibold text-slate-800 mb-2">Tracking History</p>
                  <ol className="space-y-1.5 border-l-2 border-violet-100 pl-3">
                    {selectedParcel.history.map((h, i) => (
                      <li key={i} className="text-[11px] text-slate-600">
                        <span className="font-medium text-slate-900">{h.raw_status || h.status}</span>
                        {h.occurred_at && ` · ${new Date(h.occurred_at).toLocaleString()}`}
                      </li>
                    ))}
                  </ol>
                </div>
              )}
            </div>

            <div className="mt-5 border-t border-slate-100 pt-3 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedParcel(null)}
                className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Live Read-Only Probe Modal */}
      {showProbeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-emerald-600" />
                <h3 className="text-base font-bold text-slate-900">
                  Live Read-Only Ozon API Probe
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowProbeModal(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4 space-y-4">
              <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-3 text-xs text-emerald-900 flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 mt-0.5" />
                <div>
                  <p className="font-semibold">Zero Database Mutation Guarantee</p>
                  <p className="mt-0.5 text-emerald-800">
                    This probe makes an authentic read-only call to Ozon Express and displays the raw response in memory. No database tables, orders, or records are modified.
                  </p>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">Enter Ozon Tracking Number to Probe:</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={probeTracking}
                    onChange={(e) => setProbeTracking(e.target.value)}
                    placeholder="e.g. TMRA102633371118PL, bng102633371289VV"
                    className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-xs font-mono outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500"
                  />
                  <button
                    type="button"
                    disabled={probing}
                    onClick={() => void handleRunProbe()}
                    className="rounded-lg bg-violet-700 px-4 py-2 text-xs font-semibold text-white hover:bg-violet-800 disabled:opacity-50 transition"
                  >
                    {probing ? 'Probing…' : 'Run Live Check'}
                  </button>
                </div>
                <div className="flex gap-2 mt-1">
                  <span className="text-[10px] text-slate-400">Quick tests:</span>
                  {['TMRA102633371118PL', 'bng102633371289VV', 'FES102633371229DW', 'CRN-003-R'].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => {
                        setProbeTracking(num);
                        void handleRunProbe(num);
                      }}
                      className="text-[10px] text-violet-600 underline hover:text-violet-800"
                    >
                      {num}
                    </button>
                  ))}
                </div>
              </div>

              {probeError && (
                <div className="rounded-lg bg-rose-50 border border-rose-200 p-3 text-xs text-rose-800 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
                  <span>{probeError}</span>
                </div>
              )}

              {probeResult && (
                <div className="space-y-2 rounded-xl bg-slate-900 p-4 text-xs text-slate-100 font-mono">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2 text-[11px] text-slate-400">
                    <span>Probe Type: {probeResult.probe_type}</span>
                    <span className={probeResult.is_dry_run ? 'text-amber-400' : 'text-emerald-400'}>
                      {probeResult.is_dry_run ? 'Dry-Run Simulation' : 'Live Carrier API'}
                    </span>
                  </div>
                  <pre className="max-h-56 overflow-auto text-[11px] leading-relaxed text-slate-200">
                    {JSON.stringify(probeResult.raw_response, null, 2)}
                  </pre>
                  <p className="border-t border-slate-800 pt-2 text-[10px] text-slate-400">
                    Verified at: {new Date(probeResult.verified_at).toLocaleString()}
                  </p>
                </div>
              )}
            </div>

            <div className="mt-5 border-t border-slate-100 pt-3 flex justify-end">
              <button
                type="button"
                onClick={() => setShowProbeModal(false)}
                className="rounded-lg bg-slate-200 px-4 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-300"
              >
                Close Probe
              </button>
            </div>
          </div>
        </div>
      )}
      {/* CSV Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Upload className="h-5 w-5 text-violet-600" />
                <h3 className="text-base font-bold text-slate-900">
                  Import Official Ozon Express Export
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowImportModal(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4 space-y-4">
              <div className="rounded-lg bg-violet-50 border border-violet-200 p-3 text-xs text-violet-900">
                <p className="font-semibold">Isolated Ozon Staging &amp; Duplicate Protection</p>
                <p className="mt-0.5 text-violet-800">
                  Parcels are imported into an isolated carrier pool. Duplicates are detected by Ozon tracking number. <strong>No records in Sales &amp; Orders or Finance will be modified.</strong>
                </p>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Upload CSV File:
                </label>
                <input
                  type="file"
                  accept=".csv,.txt,.tsv"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onload = (event) => {
                      setCsvContent((event.target?.result as string) || '');
                    };
                    reader.readAsText(file);
                  }}
                  className="block w-full text-xs text-slate-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-violet-50 file:text-violet-700 hover:file:bg-violet-100"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Or Paste CSV/TSV Content:
                </label>
                <textarea
                  rows={6}
                  value={csvContent}
                  onChange={(e) => setCsvContent(e.target.value)}
                  placeholder="Paste Ozon export columns (Tracking, Destinataire, Téléphone, Ville, Prix, Statut)..."
                  className="w-full rounded-lg border border-slate-300 p-2.5 text-xs font-mono outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500"
                />
              </div>

              {importNotice && (
                <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-3 text-xs text-emerald-800 flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                  <span>{importNotice}</span>
                </div>
              )}

              {importError && (
                <div className="rounded-lg bg-rose-50 border border-rose-200 p-3 text-xs text-rose-800 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
                  <span>{importError}</span>
                </div>
              )}
            </div>

            <div className="mt-5 border-t border-slate-100 pt-3 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowImportModal(false)}
                className="rounded-lg bg-slate-100 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={importingCsv || !csvContent.trim()}
                onClick={() => void handleImportCsv()}
                className="inline-flex items-center gap-1.5 rounded-lg bg-violet-600 px-4 py-2 text-xs font-semibold text-white hover:bg-violet-500 disabled:opacity-50 transition"
              >
                <Upload className="h-3.5 w-3.5" />
                {importingCsv ? 'Processing…' : 'Import & Discover'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
