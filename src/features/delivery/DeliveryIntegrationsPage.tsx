import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useWorkspace } from '../../context/WorkspaceContext';
import {
  deliveryService,
  type DeliveryConnection,
  type DeliveryShipment,
  type OzonConnectionStatus,
} from './deliveryService';
import { ImportOzonParcelsModal } from '../sales/components/ImportOzonParcelsModal';
import { OzonReviewQueueModal } from '../sales/components/OzonReviewQueueModal';
import { OzonIndependentDashboard } from './components/OzonIndependentDashboard';
import type { OzonDashboardData } from './deliveryService';

const inputClass = 'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-100';
const buttonClass = 'rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50';
const primaryClass = 'rounded-lg bg-violet-700 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-800 disabled:cursor-not-allowed disabled:opacity-50';

export const DeliveryIntegrationsPage: React.FC = () => {
  const { currentWorkspace, hasWorkspace, isLoadingWorkspaces } = useWorkspace();
  const [connections, setConnections] = useState<DeliveryConnection[]>([]);
  const [shipments, setShipments] = useState<DeliveryShipment[]>([]);
  const [ozonStatus, setOzonStatus] = useState<OzonConnectionStatus | null>(null);
  const [ozonDashboardData, setOzonDashboardData] = useState<OzonDashboardData | null>(null);
  const [providerKey, setProviderKey] = useState('ozon');
  const [credentialFields, setCredentialFields] = useState([
    { name: 'customer_id', value: '' },
    { name: 'api_key', value: '' },
  ]);
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'live' | 'imported' | 'local'>('all');
  const [showImportModal, setShowImportModal] = useState(false);
  const [showReviewQueueModal, setShowReviewQueueModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [syncingAll, setSyncingAll] = useState(false);
  const [testingLive, setTestingLive] = useState(false);
  const [busyId, setBusyId] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const load = useCallback(async () => {
    if (!currentWorkspace.id) return;
    setLoading(true);
    setError('');
    try {
      const [nextConnections, shipmentResult, ozonResult, ozonDash] = await Promise.all([
        deliveryService.connections(currentWorkspace.id),
        deliveryService.shipments(currentWorkspace.id),
        deliveryService.ozonStatus(currentWorkspace.id).catch(() => null),
        deliveryService.getOzonDashboard(currentWorkspace.id).catch(() => null),
      ]);
      setConnections(nextConnections);
      setShipments(shipmentResult.data);
      if (ozonResult) {
        setOzonStatus(ozonResult);
      }
      if (ozonDash) {
        setOzonDashboardData(ozonDash);
      }
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load delivery integrations.');
    } finally {
      setLoading(false);
    }
  }, [currentWorkspace.id]);

  useEffect(() => {
    void load();
  }, [load]);

  const saveConnection = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!currentWorkspace.id || !providerKey.trim()) return;
    const credentials: Record<string, string> = {};
    for (const field of credentialFields) {
      const name = field.name.trim();
      if (!/^[A-Za-z0-9_-]+$/.test(name) || !field.value || credentials[name] !== undefined) {
        setError('Enter a unique credential name using letters, numbers, underscores, or hyphens, and provide its value.');
        return;
      }
      credentials[name] = field.value;
    }
    setSaving(true);
    setError('');
    setNotice('');
    try {
      await deliveryService.saveConnection(currentWorkspace.id, providerKey.trim().toLowerCase(), {
        ...credentials,
      });
      setCredentialFields((fields) => fields.map((field) => ({ ...field, value: '' })));
      setNotice('Credentials were saved encrypted on the server. Test the connection below.');
      await load();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Unable to save provider credentials.');
    } finally {
      setSaving(false);
    }
  };

  const perform = async (connection: DeliveryConnection, action: 'test' | 'disconnect') => {
    setBusyId(connection.id);
    setError('');
    setNotice('');
    try {
      if (action === 'test') {
        setTestingLive(true);
        const result = await deliveryService.testConnection(currentWorkspace.id, connection.id);
        if (result.verification) {
          setOzonStatus(result.verification);
          if (result.verification.connection_status === 'connected') {
            setNotice(`Connected to Ozon Express Official API. Verified at ${new Date(result.verification.test_timestamp).toLocaleTimeString()}`);
          } else if (result.verification.connection_status === 'simulation') {
            setNotice(`Connection verified in Simulation Mode (Dry-Run). Active at ${new Date(result.verification.test_timestamp).toLocaleTimeString()}`);
          } else {
            setError(result.verification.error_message || 'Connection test failed.');
          }
        } else {
          setNotice(`${connection.provider_key} connection test succeeded.`);
        }
      } else {
        await deliveryService.disconnect(currentWorkspace.id, connection.id);
        setNotice(`${connection.provider_key} was disconnected.`);
      }
      await load();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : `Unable to ${action} this provider.`);
    } finally {
      setBusyId('');
      setTestingLive(false);
    }
  };

  const refreshShipment = async (shipment: DeliveryShipment) => {
    setBusyId(shipment.id);
    setError('');
    try {
      await deliveryService.refreshShipment(currentWorkspace.id, shipment.id);
      await load();
    } catch (refreshError) {
      setError(refreshError instanceof Error ? refreshError.message : 'Unable to refresh shipment tracking.');
      await load();
    } finally {
      setBusyId('');
    }
  };

  const handleSyncAllTracking = async () => {
    if (!currentWorkspace.id) return;
    setSyncingAll(true);
    setError('');
    setNotice('');
    try {
      await load();
      setNotice('Refreshed genuine Ozon Express tracking data.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sync failed');
    } finally {
      setSyncingAll(false);
    }
  };

  const counts = useMemo(() => {
    const live = shipments.filter((s) => s.source_type === 'Live').length;
    const imported = shipments.filter((s) => s.source_type === 'Imported').length;
    const local = shipments.filter((s) => s.source_type !== 'Live' && s.source_type !== 'Imported').length;
    return { all: shipments.length, live, imported, local };
  }, [shipments]);

  const filteredShipments = useMemo(() => {
    if (selectedFilter === 'live') {
      return shipments.filter((s) => s.source_type === 'Live');
    }
    if (selectedFilter === 'imported') {
      return shipments.filter((s) => s.source_type === 'Imported');
    }
    if (selectedFilter === 'local') {
      return shipments.filter((s) => s.source_type !== 'Live' && s.source_type !== 'Imported');
    }
    return shipments;
  }, [shipments, selectedFilter]);

  if (isLoadingWorkspaces) return <main className="p-6 text-sm text-slate-500">Loading workspace…</main>;
  if (!hasWorkspace) return <main className="p-6 text-sm text-slate-500">Select a workspace to manage delivery integrations.</main>;

  return (
    <main className="mx-auto max-w-6xl space-y-6 p-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Delivery integrations</h1>
          <p className="mt-1 text-sm text-slate-600">Connect your real Ozon Express account and monitor shipment fulfillment.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            className={buttonClass}
            type="button"
            onClick={() => setShowImportModal(true)}
          >
            Import Ozon CSV
          </button>
          <button
            className="rounded-lg border border-violet-200 bg-violet-50 px-3 py-2 text-sm font-semibold text-violet-800 hover:bg-violet-100 disabled:opacity-50 transition"
            type="button"
            onClick={() => setShowReviewQueueModal(true)}
          >
            Ozon Review Queue
          </button>
          <button
            className={buttonClass}
            type="button"
            onClick={() => void handleSyncAllTracking()}
            disabled={loading || syncingAll}
          >
            {syncingAll ? 'Syncing…' : 'Sync All Tracking'}
          </button>
          <button
            className={buttonClass}
            type="button"
            onClick={() => void load()}
            disabled={loading}
          >
            {loading ? 'Refreshing…' : 'Refresh list'}
          </button>
        </div>
      </header>

      {error && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</div>}
      {notice && <div role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</div>}

      {/* Dedicated Real Ozon Dashboard */}
      {ozonDashboardData && (
        <OzonIndependentDashboard
          workspaceId={currentWorkspace.id}
          data={ozonDashboardData}
          loading={loading}
          onRefresh={load}
        />
      )}

      {/* Official Ozon Express Account Status Card */}
      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-semibold text-slate-900">Ozon Express Account</h2>
              {ozonStatus?.connection_status === 'connected' ? (
                <span className="inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">
                  ● Connected (Live Official API)
                </span>
              ) : ozonStatus?.connection_status === 'simulation' ? (
                <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800">
                  ● Simulation Mode (Dry-Run Active)
                </span>
              ) : (
                <span className="inline-flex items-center rounded-full bg-rose-100 px-2.5 py-0.5 text-xs font-semibold text-rose-800">
                  ● Ozon account not connected
                </span>
              )}
            </div>
            <p className="mt-1 text-sm text-slate-600">
              Verified data source: <span className="font-medium text-slate-800">{ozonStatus?.verified_data_source || 'None'}</span>
              {ozonStatus?.test_timestamp ? ` · Last checked ${new Date(ozonStatus.test_timestamp).toLocaleTimeString()}` : ''}
            </p>
          </div>
          {connections.find((c) => c.provider_key === 'ozon') && (
            <button
              className={buttonClass}
              type="button"
              disabled={testingLive}
              onClick={() => {
                const ozonConn = connections.find((c) => c.provider_key === 'ozon');
                if (ozonConn) void perform(ozonConn, 'test');
              }}
            >
              {testingLive ? 'Validating…' : 'Verify connection (Read-only)'}
            </button>
          )}
        </div>

        <div className="mt-4 rounded-lg border border-blue-100 bg-blue-50/70 p-3.5 text-xs text-blue-900 leading-relaxed">
          <span className="font-semibold text-blue-950">Official Carrier Limitation: </span>
          The official Ozon Express Morocco API (<code className="font-mono bg-blue-100 px-1 py-0.5 rounded">api.ozonexpress.ma</code>) provides read-only tracking and parcel creation, but does not provide an endpoint to list all account parcels.
          To discover parcels dispatched via the Ozon web portal, use the <span className="font-semibold text-blue-950">Import Ozon CSV</span> button above.
        </div>
      </section>

      {/* Connect/Update Provider Form */}
      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="text-lg font-semibold text-slate-900">Configure carrier credentials</h2>
        <p className="mt-1 text-sm text-slate-600">
          Credentials are encrypted at rest on the server and never exposed in browser requests, logs, or exports.
          Provide your official Ozon Customer ID and API Key.
        </p>
        <form className="mt-4 grid gap-3 sm:grid-cols-2" onSubmit={(event) => void saveConnection(event)}>
          <label className="space-y-1 text-sm font-medium text-slate-700">
            Provider key
            <input
              className={inputClass}
              autoComplete="off"
              value={providerKey}
              onChange={(event) => setProviderKey(event.target.value)}
              placeholder="ozon"
              required
            />
          </label>
          {credentialFields.map((field, index) => (
            <React.Fragment key={index}>
              <label className="space-y-1 text-sm font-medium text-slate-700">
                {field.name === 'customer_id' ? 'Customer ID' : field.name === 'api_key' ? 'API Key' : field.name}
                <input
                  className={inputClass}
                  type={field.name === 'api_key' ? 'password' : 'text'}
                  autoComplete="off"
                  value={field.value}
                  onChange={(event) =>
                    setCredentialFields((fields) =>
                      fields.map((item, itemIndex) => (itemIndex === index ? { ...item, value: event.target.value } : item))
                    )
                  }
                  placeholder={`Enter ${field.name}`}
                  required
                />
              </label>
            </React.Fragment>
          ))}
          <div className="sm:col-span-2">
            <button className={primaryClass} type="submit" disabled={saving}>
              {saving ? 'Saving…' : 'Save encrypted credentials'}
            </button>
          </div>
        </form>
      </section>

      {/* Shipment Provenance Tabs and List */}
      <section className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-3">
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => setSelectedFilter('all')}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                selectedFilter === 'all' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              All Shipments ({counts.all})
            </button>
            <button
              type="button"
              onClick={() => setSelectedFilter('live')}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                selectedFilter === 'live' ? 'bg-emerald-700 text-white' : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
              }`}
            >
              Ozon Live ({counts.live})
            </button>
            <button
              type="button"
              onClick={() => setSelectedFilter('imported')}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                selectedFilter === 'imported' ? 'bg-blue-700 text-white' : 'bg-blue-50 text-blue-800 hover:bg-blue-100'
              }`}
            >
              Ozon Imported ({counts.imported})
            </button>
            <button
              type="button"
              onClick={() => setSelectedFilter('local')}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                selectedFilter === 'local' ? 'bg-slate-700 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              MarketFlow Local ({counts.local})
            </button>
          </div>
          <p className="text-xs text-slate-500">
            Showing {filteredShipments.length} of {shipments.length} records
          </p>
        </div>

        {filteredShipments.length === 0 && (
          <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
            {selectedFilter === 'live'
              ? 'No live Ozon shipments confirmed yet. Records appear here once validated via the live Ozon tracking API.'
              : selectedFilter === 'imported'
              ? 'No parcels imported via Ozon CSV yet. Use the "Import Ozon CSV" button to import external shipments.'
              : 'No shipments match the selected filter.'}
          </div>
        )}

        {filteredShipments.map((shipment) => (
          <article key={shipment.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:border-slate-300 transition">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-semibold text-slate-900">
                    {shipment.order_reference || shipment.sales_order_id || 'Shipment'} ·{' '}
                    {shipment.provider_key === 'khalid_nait_lmouden'
                      ? 'Khalid Nait Lmouden'
                      : shipment.provider_key === 'ozon'
                      ? 'Ozon Express'
                      : shipment.provider_key}
                  </h3>
                  {shipment.source_type === 'Live' ? (
                    <span className="rounded bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-800">
                      Live Confirmed
                    </span>
                  ) : shipment.source_type === 'Imported' ? (
                    <span className="rounded bg-blue-100 px-2 py-0.5 text-[11px] font-semibold text-blue-800">
                      Imported from Ozon
                    </span>
                  ) : (
                    <span className="rounded bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700">
                      Local Shipment
                    </span>
                  )}
                </div>
                <p className="mt-1 text-sm text-slate-600">
                  Tracking: <code className="font-mono text-slate-900 bg-slate-100 px-1.5 py-0.5 rounded text-xs">{shipment.tracking_number || 'Not assigned'}</code> · Status:{' '}
                  <span className="font-medium text-slate-900">{shipment.status}</span>
                  {shipment.cod_collected ? ' · COD collected' : ''}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Delivery fee: <span className="font-medium">{shipment.delivery_fee} MAD</span> · COD Amount:{' '}
                  <span className="font-medium">{shipment.cod_amount} MAD</span>
                  {shipment.status_updated_at ? ` · Updated ${new Date(shipment.status_updated_at).toLocaleString()}` : ''}
                </p>
                {shipment.last_error && <p className="mt-1 text-sm text-red-700">{shipment.last_error}</p>}
              </div>
              {shipment.provider_connection_id && shipment.tracking_number && (
                <button
                  className={buttonClass}
                  type="button"
                  disabled={busyId === shipment.id}
                  onClick={() => void refreshShipment(shipment)}
                >
                  {busyId === shipment.id ? 'Refreshing…' : 'Refresh tracking'}
                </button>
              )}
            </div>
            {shipment.status_history.length > 0 && (
              <ol className="mt-3 flex flex-wrap gap-x-5 gap-y-1 border-t border-slate-100 pt-3">
                {shipment.status_history.map((history, index) => (
                  <li key={`${history.occurred_at}-${index}`} className="text-xs text-slate-600">
                    {history.status} · {history.source}
                    {history.occurred_at ? ` · ${new Date(history.occurred_at).toLocaleString()}` : ''}
                  </li>
                ))}
              </ol>
            )}
          </article>
        ))}
      </section>

      {/* CSV Import Modal */}
      {showImportModal && currentWorkspace.id && (
        <ImportOzonParcelsModal
          workspaceId={currentWorkspace.id}
          isOpen={showImportModal}
          onClose={() => setShowImportModal(false)}
          onSuccess={(msg) => {
            setShowImportModal(false);
            setNotice(msg || 'Ozon parcels imported successfully. Shipment records updated.');
            void load();
          }}
        />
      )}

      {/* Inbound Review Queue Modal */}
      {showReviewQueueModal && currentWorkspace.id && (
        <OzonReviewQueueModal
          workspaceId={currentWorkspace.id}
          isOpen={showReviewQueueModal}
          onClose={() => setShowReviewQueueModal(false)}
          openOrders={[]}
          onOrderUpdated={() => {
            setShowReviewQueueModal(false);
            setNotice('Review queue updated.');
            void load();
          }}
        />
      )}
    </main>
  );
};

