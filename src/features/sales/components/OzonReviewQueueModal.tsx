import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle,
  Link as LinkIcon,
  Package,
  PlusCircle,
  RefreshCw,
  X,
} from 'lucide-react';
import {
  salesService,
  type OzonReviewQueueItem,
  type SalesOrder,
} from '../salesService';

interface OzonReviewQueueModalProps {
  workspaceId: string;
  isOpen: boolean;
  onClose: () => void;
  openOrders: SalesOrder[];
  onOrderUpdated: () => void;
}

export const OzonReviewQueueModal: React.FC<OzonReviewQueueModalProps> = ({
  workspaceId,
  isOpen,
  onClose,
  openOrders,
  onOrderUpdated,
}) => {
  const [queue, setQueue] = useState<OzonReviewQueueItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Link sub-modal state
  const [linkingItem, setLinkingItem] = useState<OzonReviewQueueItem | null>(null);
  const [selectedOrderId, setSelectedOrderId] = useState<string>('');

  // Create order sub-modal state
  const [creatingItem, setCreatingItem] = useState<OzonReviewQueueItem | null>(null);
  const [createForm, setCreateForm] = useState({
    customer_name: '',
    phone: '',
    city: '',
    address: '',
    total: 0,
  });

  const loadQueue = async () => {
    setLoading(true);
    setError(null);
    try {
      const items = await salesService.getOzonReviewQueue(workspaceId);
      setQueue(items);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load review queue.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      void loadQueue();
    }
  }, [isOpen, workspaceId]);

  if (!isOpen) return null;

  const handleLink = async () => {
    if (!linkingItem || !selectedOrderId) return;
    setBusyId(linkingItem.id);
    setError(null);
    try {
      const res = await salesService.linkOzonReviewQueue(workspaceId, linkingItem.id, selectedOrderId);
      setSuccess(res.message);
      setLinkingItem(null);
      setSelectedOrderId('');
      await loadQueue();
      onOrderUpdated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to link parcel.');
    } finally {
      setBusyId(null);
    }
  };

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!creatingItem) return;
    setBusyId(creatingItem.id);
    setError(null);
    try {
      const res = await salesService.createOrderFromOzonReviewQueue(workspaceId, creatingItem.id, {
        customer_name: createForm.customer_name,
        phone: createForm.phone,
        city: createForm.city,
        address: createForm.address,
        total: Number(createForm.total),
      });
      setSuccess(res.message);
      setCreatingItem(null);
      await loadQueue();
      onOrderUpdated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create order from parcel.');
    } finally {
      setBusyId(null);
    }
  };

  const startCreate = (item: OzonReviewQueueItem) => {
    setCreatingItem(item);
    setCreateForm({
      customer_name: '',
      phone: '',
      city: '',
      address: '',
      total: Number(item.cod_amount || 0),
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
      <div className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/70 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-violet-100 p-2.5 text-violet-800">
              <Package size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900">
                  Ozon Inbound Review Queue
                </h3>
                <span className="rounded-full bg-violet-100 px-2 py-0.5 text-xs font-semibold text-violet-800">
                  {queue.length} Unmatched
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Parcels imported from Ozon that require manual matching or conversion into orders.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void loadQueue()}
              disabled={loading}
              className="rounded-lg border border-slate-300 p-2 text-slate-600 hover:bg-slate-50 transition-colors"
              title="Refresh Queue"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin text-violet-600' : ''} />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Alerts */}
        {error && (
          <div className="mx-6 mt-4 flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs font-medium text-rose-800">
            <AlertTriangle size={15} className="shrink-0 text-rose-600" />
            {error}
          </div>
        )}
        {success && (
          <div className="mx-6 mt-4 flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs font-medium text-emerald-800">
            <CheckCircle size={15} className="shrink-0 text-emerald-600" />
            {success}
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading && queue.length === 0 ? (
            <div className="py-12 text-center text-sm text-slate-500">
              <div className="mx-auto mb-2 h-6 w-6 animate-spin rounded-full border-2 border-violet-600 border-t-transparent" />
              Loading review queue…
            </div>
          ) : queue.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 py-12 text-center">
              <CheckCircle size={32} className="mx-auto text-emerald-500" />
              <h4 className="mt-2 text-sm font-semibold text-slate-900">Review Queue Empty</h4>
              <p className="mt-1 text-xs text-slate-500">
                All Ozon Express parcels are currently synchronized and linked to valid orders!
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white">
              {queue.map((item) => (
                <div
                  key={item.id}
                  className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between hover:bg-slate-50/50 transition-colors"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-bold text-slate-900">
                        {item.tracking_number}
                      </span>
                      <span className="rounded bg-violet-50 px-2 py-0.5 text-[10px] font-semibold text-violet-700">
                        Ozon Express
                      </span>
                      <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-700">
                        Status: {item.status} ({item.raw_status || 'Unknown'})
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-slate-500">
                      <span>
                        COD: <strong className="text-slate-800">{Number(item.cod_amount || 0).toFixed(2)} MAD</strong>
                      </span>
                      <span>
                        Delivery Fee: <strong className="text-slate-800">{Number(item.delivery_fee || 0).toFixed(2)} MAD</strong>
                      </span>
                      {item.order_reference && (
                        <span>
                          Reference: <strong>{item.order_reference}</strong>
                        </span>
                      )}
                    </div>
                    {item.last_error && (
                      <p className="text-[11px] text-slate-400 italic">
                        {item.last_error}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={busyId === item.id}
                      onClick={() => {
                        setLinkingItem(item);
                        setSelectedOrderId(openOrders[0]?.id || '');
                      }}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors disabled:opacity-50"
                    >
                      <LinkIcon size={13} />
                      Link to Order
                    </button>
                    <button
                      type="button"
                      disabled={busyId === item.id}
                      onClick={() => startCreate(item)}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-violet-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-violet-800 transition-colors disabled:opacity-50"
                    >
                      <PlusCircle size={13} />
                      Create Order
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Modal Sub-action: Link to Order */}
        {linkingItem && (
          <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/40 p-4">
            <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-xl">
              <h4 className="text-sm font-bold text-slate-900">
                Link Parcel {linkingItem.tracking_number} to Order
              </h4>
              <p className="mt-1 text-xs text-slate-500">
                Select an open commercial order to associate with this Ozon Express tracking number.
              </p>
              <div className="mt-4 space-y-3">
                <label className="block text-xs font-medium text-slate-700">
                  Select Order:
                  <select
                    value={selectedOrderId}
                    onChange={(e) => setSelectedOrderId(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-xs outline-none focus:border-violet-500"
                  >
                    {openOrders.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.order_number} — {o.customer?.first_name} {o.customer?.last_name} ({Number(o.total).toFixed(2)} MAD)
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <div className="mt-5 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setLinkingItem(null)}
                  className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={!selectedOrderId || busyId === linkingItem.id}
                  onClick={() => void handleLink()}
                  className="rounded-lg bg-violet-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-violet-800 disabled:opacity-50"
                >
                  Confirm Link
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal Sub-action: Create Order */}
        {creatingItem && (
          <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/40 p-4">
            <form
              onSubmit={(e) => void handleCreateOrder(e)}
              className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-xl space-y-4"
            >
              <div>
                <h4 className="text-sm font-bold text-slate-900">
                  Create Order from Parcel {creatingItem.tracking_number}
                </h4>
                <p className="mt-0.5 text-xs text-slate-500">
                  Convert this discovered Ozon parcel into a full commercial sales order.
                </p>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="font-medium text-slate-700">Customer Name *</label>
                  <input
                    type="text"
                    required
                    value={createForm.customer_name}
                    onChange={(e) => setCreateForm({ ...createForm, customer_name: e.target.value })}
                    placeholder="e.g. Karim Bennani"
                    className="mt-1 w-full rounded-lg border border-slate-300 p-2 outline-none focus:border-violet-500"
                  />
                </div>
                <div>
                  <label className="font-medium text-slate-700">Phone Number *</label>
                  <input
                    type="text"
                    required
                    value={createForm.phone}
                    onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })}
                    placeholder="e.g. 0612345678"
                    className="mt-1 w-full rounded-lg border border-slate-300 p-2 outline-none focus:border-violet-500"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="font-medium text-slate-700">City</label>
                    <input
                      type="text"
                      value={createForm.city}
                      onChange={(e) => setCreateForm({ ...createForm, city: e.target.value })}
                      placeholder="e.g. Casablanca"
                      className="mt-1 w-full rounded-lg border border-slate-300 p-2 outline-none focus:border-violet-500"
                    />
                  </div>
                  <div>
                    <label className="font-medium text-slate-700">COD Total (MAD) *</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={createForm.total}
                      onChange={(e) => setCreateForm({ ...createForm, total: Number(e.target.value) })}
                      className="mt-1 w-full rounded-lg border border-slate-300 p-2 outline-none focus:border-violet-500 font-semibold"
                    />
                  </div>
                </div>
                <div>
                  <label className="font-medium text-slate-700">Delivery Address</label>
                  <input
                    type="text"
                    value={createForm.address}
                    onChange={(e) => setCreateForm({ ...createForm, address: e.target.value })}
                    placeholder="Street, Quarter, Building..."
                    className="mt-1 w-full rounded-lg border border-slate-300 p-2 outline-none focus:border-violet-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setCreatingItem(null)}
                  className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={busyId === creatingItem.id}
                  className="rounded-lg bg-violet-700 px-4 py-1.5 text-xs font-semibold text-white hover:bg-violet-800 disabled:opacity-50"
                >
                  Create Sales Order
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};
