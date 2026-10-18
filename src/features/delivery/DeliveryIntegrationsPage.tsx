import React, { useCallback, useEffect, useState } from 'react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { deliveryService, type DeliveryConnection, type DeliveryShipment } from './deliveryService';

const inputClass = 'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-100';
const buttonClass = 'rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50';
const primaryClass = 'rounded-lg bg-violet-700 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-800 disabled:cursor-not-allowed disabled:opacity-50';

export const DeliveryIntegrationsPage: React.FC = () => {
  const { currentWorkspace, hasWorkspace, isLoadingWorkspaces } = useWorkspace();
  const [connections, setConnections] = useState<DeliveryConnection[]>([]);
  const [shipments, setShipments] = useState<DeliveryShipment[]>([]);
  const [providerKey, setProviderKey] = useState('');
  const [credentialFields, setCredentialFields] = useState([{ name: '', value: '' }]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const load = useCallback(async () => {
    if (!currentWorkspace.id) return;
    setLoading(true);
    setError('');
    try {
      const [nextConnections, shipmentResult] = await Promise.all([
        deliveryService.connections(currentWorkspace.id),
        deliveryService.shipments(currentWorkspace.id),
      ]);
      setConnections(nextConnections);
      setShipments(shipmentResult.data);
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
      setNotice('Credentials were saved encrypted. The connection remains unverified until an adapter can test it.');
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
        await deliveryService.testConnection(currentWorkspace.id, connection.id);
        setNotice(`${connection.provider_key} connection test succeeded.`);
      } else {
        await deliveryService.disconnect(currentWorkspace.id, connection.id);
        setNotice(`${connection.provider_key} was disconnected.`);
      }
      await load();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : `Unable to ${action} this provider.`);
    } finally {
      setBusyId('');
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

  if (isLoadingWorkspaces) return <main className="p-6 text-sm text-slate-500">Loading workspace…</main>;
  if (!hasWorkspace) return <main className="p-6 text-sm text-slate-500">Select a workspace to manage delivery integrations.</main>;

  return (
    <main className="mx-auto max-w-6xl space-y-6 p-6">
      <header>
        <h1 className="text-2xl font-semibold text-slate-900">Delivery integrations</h1>
        <p className="mt-1 text-sm text-slate-600">Manage carrier credentials and monitor workspace shipments.</p>
      </header>

      {error && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</div>}
      {notice && <div role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</div>}

      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="text-lg font-semibold text-slate-900">Connect a provider</h2>
        <p className="mt-1 text-sm text-slate-600">
          Credentials are encrypted at rest and never returned by the API. Provider keys identify an installed adapter;
          unverified carriers can be saved but cannot send or refresh shipments.
        </p>
        <form className="mt-4 grid gap-3 sm:grid-cols-2" onSubmit={(event) => void saveConnection(event)}>
          <label className="space-y-1 text-sm font-medium text-slate-700">
            Provider key
            <input className={inputClass} autoComplete="off" value={providerKey} onChange={(event) => setProviderKey(event.target.value)} placeholder="Carrier identifier" required />
          </label>
          {credentialFields.map((field, index) => (
            <React.Fragment key={index}>
              <label className="space-y-1 text-sm font-medium text-slate-700">
                Credential name
                <input
                  className={inputClass}
                  autoComplete="off"
                  value={field.name}
                  onChange={(event) => setCredentialFields((fields) => fields.map((item, itemIndex) => itemIndex === index ? { ...item, name: event.target.value } : item))}
                  placeholder="Use the carrier's documented field name"
                  required
                />
              </label>
              <label className="space-y-1 text-sm font-medium text-slate-700">
                Credential value
                <input
                  className={inputClass}
                  type="password"
                  autoComplete="new-password"
                  value={field.value}
                  onChange={(event) => setCredentialFields((fields) => fields.map((item, itemIndex) => itemIndex === index ? { ...item, value: event.target.value } : item))}
                  required
                />
              </label>
            </React.Fragment>
          ))}
          <div className="sm:col-span-2">
            <button className={buttonClass} type="button" onClick={() => setCredentialFields((fields) => [...fields, { name: '', value: '' }])}>Add credential</button>
            {credentialFields.length > 1 && (
              <button className={`${buttonClass} ml-2`} type="button" onClick={() => setCredentialFields((fields) => fields.slice(0, -1))}>Remove last field</button>
            )}
          </div>
          <div className="sm:col-span-2">
            <button className={primaryClass} type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save credentials'}</button>
          </div>
        </form>
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Workspace providers</h2>
          <button className={buttonClass} type="button" onClick={() => void load()} disabled={loading}>{loading ? 'Refreshing…' : 'Refresh list'}</button>
        </div>
        {connections.length === 0 && <p className="rounded-lg border border-dashed border-slate-300 p-5 text-sm text-slate-500">No delivery providers are connected.</p>}
        {connections.map((connection) => (
          <article key={connection.id} className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="font-semibold text-slate-900">{connection.provider_key}</h3>
              <p className="mt-1 text-sm text-slate-600">
                Status: <span className="font-medium">{connection.status}</span>
                {connection.has_credentials ? ' · Credentials saved' : ''}
                {connection.last_tested_at ? ` · Last test ${new Date(connection.last_tested_at).toLocaleString()}` : ''}
              </p>
              {connection.last_error && <p className="mt-1 text-sm text-red-700">{connection.last_error}</p>}
              {!connection.supports_connection_test && <p className="mt-1 text-xs text-amber-700">No verified provider adapter is installed.</p>}
            </div>
            <div className="flex gap-2">
              {connection.supports_connection_test && <button className={buttonClass} type="button" disabled={busyId === connection.id} onClick={() => void perform(connection, 'test')}>Test connection</button>}
              <button className={buttonClass} type="button" disabled={busyId === connection.id} onClick={() => void perform(connection, 'disconnect')}>Disconnect</button>
            </div>
          </article>
        ))}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-slate-900">Shipment status</h2>
        {shipments.length === 0 && <p className="rounded-lg border border-dashed border-slate-300 p-5 text-sm text-slate-500">No shipments have been recorded for this workspace.</p>}
        {shipments.map((shipment) => (
          <article key={shipment.id} className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h3 className="font-semibold text-slate-900">{shipment.order_reference || shipment.sales_order_id || 'Shipment'} · {shipment.provider_key}</h3>
                <p className="mt-1 text-sm text-slate-600">
                  Tracking: {shipment.tracking_number || 'Not assigned'} · Status: {shipment.status}
                  {shipment.cod_collected ? ' · COD collected' : ''}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Delivery fee {shipment.delivery_fee} · COD {shipment.cod_amount}
                  {shipment.status_updated_at ? ` · Updated ${new Date(shipment.status_updated_at).toLocaleString()}` : ''}
                </p>
                {shipment.last_error && <p className="mt-1 text-sm text-red-700">{shipment.last_error}</p>}
              </div>
              {shipment.provider_connection_id && shipment.tracking_number && (
                <button className={buttonClass} type="button" disabled={busyId === shipment.id} onClick={() => void refreshShipment(shipment)}>
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
    </main>
  );
};
