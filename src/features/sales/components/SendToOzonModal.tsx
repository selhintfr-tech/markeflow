import React, { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle, ShieldCheck, Truck, X } from 'lucide-react';
import { salesService, type OzonPreviewData, type SalesOrder } from '../salesService';

interface SendToOzonModalProps {
  order: SalesOrder;
  workspaceId: string;
  onClose: () => void;
  onSuccess: (updatedOrder: SalesOrder, message: string) => void;
}

export const SendToOzonModal: React.FC<SendToOzonModalProps> = ({
  order,
  workspaceId,
  onClose,
  onSuccess,
}) => {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<OzonPreviewData | null>(null);

  useEffect(() => {
    let active = true;
    const fetchPreview = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await salesService.getOzonPreview(workspaceId, order.id);
        if (active) {
          setPreview(data);
        }
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : 'Unable to load Ozon preview.');
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void fetchPreview();
    return () => {
      active = false;
    };
  }, [workspaceId, order.id]);

  const handleConfirm = async () => {
    if (!preview?.can_send || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const result = await salesService.sendToOzon(workspaceId, order.id);
      onSuccess(result.data, result.message || `Order ${order.order_number} successfully registered with Ozon Express.`);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to dispatch order to Ozon Express.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
      <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-violet-100 text-violet-700">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Send to Ozon Express</h3>
              <p className="text-xs text-slate-500">Order {order.order_number} • Morocco Logistics</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 overflow-y-auto">
          {loading ? (
            <div className="py-12 text-center text-sm text-slate-500 space-y-2">
              <div className="w-6 h-6 border-2 border-violet-600 border-t-transparent rounded-full animate-spin mx-auto" />
              <p>Validating order details for Ozon Express…</p>
            </div>
          ) : error ? (
            <div className="p-4 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-sm flex items-start gap-2.5">
              <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5 text-rose-600" />
              <div>
                <p className="font-semibold">Unable to dispatch</p>
                <p className="text-xs mt-0.5">{error}</p>
              </div>
            </div>
          ) : preview ? (
            <>
              {/* Mode indicator */}
              <div
                className={`p-3 rounded-lg text-xs flex items-center gap-2 ${
                  preview.is_dry_run
                    ? 'bg-amber-50 text-amber-800 border border-amber-200'
                    : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                }`}
              >
                <ShieldCheck className="w-4 h-4 shrink-0" />
                <span>
                  {preview.is_dry_run
                    ? 'Safe First Phase: Operating in Dry-Run simulation mode. No live courier requests will be dispatched.'
                    : 'Live Courier Integration: Order will be submitted directly to Ozon Express.'}
                </span>
              </div>

              {/* Blocking Reasons if cannot send */}
              {!preview.can_send && preview.reasons.length > 0 && (
                <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900 space-y-1">
                  <p className="font-semibold flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-amber-700" /> Dispatch Blocked
                  </p>
                  <ul className="list-disc list-inside space-y-0.5 pl-1 text-amber-800">
                    {preview.reasons.map((r, i) => (
                      <li key={i}>{r}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Order and Recipient summary card */}
              <div className="rounded-lg border border-slate-200 bg-slate-50/60 p-4 space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-3 pb-3 border-b border-slate-200/60">
                  <div>
                    <span className="text-slate-500 block">Recipient</span>
                    <span className="font-semibold text-slate-800 text-sm">
                      {preview.preview.recipient_name || 'N/A'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Phone</span>
                    <span className="font-semibold text-slate-800">
                      {preview.preview.phone || 'Missing phone'}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pb-3 border-b border-slate-200/60">
                  <div>
                    <span className="text-slate-500 block">City</span>
                    <span className="font-semibold text-slate-800">{preview.preview.city}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Address</span>
                    <span className="font-semibold text-slate-800 line-clamp-2">
                      {preview.preview.address || 'Missing address'}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <span className="text-slate-500 block">Items</span>
                    <span className="font-medium text-slate-700 line-clamp-2">
                      {preview.preview.items_summary}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Amount to Collect (COD)</span>
                    <span className="font-bold text-violet-700 text-sm">
                      {Number(preview.preview.cod_amount).toFixed(2)} {preview.preview.currency}
                    </span>
                  </div>
                </div>
              </div>

              {preview.can_send && (
                <div className="p-3 bg-violet-50/60 border border-violet-100 rounded-lg text-[11px] text-violet-900 flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-violet-600 shrink-0 mt-0.5" />
                  <span>
                    Confirming will assign an official Ozon tracking number and transition order status to
                    Shipping. Duplicate dispatches are blocked by idempotency guards.
                  </span>
                </div>
              )}
            </>
          ) : null}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-100 bg-slate-50/50 flex items-center justify-end gap-2.5">
          <button
            type="button"
            disabled={submitting}
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 border border-slate-300 rounded-lg hover:bg-white transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!preview?.can_send || submitting || loading}
            onClick={handleConfirm}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-violet-700 rounded-lg hover:bg-violet-800 transition-colors shadow-2xs disabled:opacity-50 disabled:pointer-events-none"
          >
            {submitting ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Registering Parcel…
              </>
            ) : (
              <>
                <Truck className="w-3.5 h-3.5" />
                Confirm & Send to Ozon
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
export default SendToOzonModal;
