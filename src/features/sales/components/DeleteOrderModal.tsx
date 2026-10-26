import React, { useEffect } from 'react';
import { AlertTriangle, Ban, Trash2, X } from 'lucide-react';
import type { SalesOrder } from '../salesService';

interface DeleteOrderModalProps {
  isOpen: boolean;
  order: SalesOrder | null;
  deleting?: boolean;
  cancelling?: boolean;
  onClose: () => void;
  onConfirmDelete: (order: SalesOrder) => void;
  onConfirmCancel: (order: SalesOrder) => void;
}

export const DeleteOrderModal: React.FC<DeleteOrderModalProps> = ({
  isOpen,
  order,
  deleting = false,
  cancelling = false,
  onClose,
  onConfirmDelete,
  onConfirmCancel,
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !deleting && !cancelling) {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, deleting, cancelling, onClose]);

  if (!isOpen || !order) return null;

  const isPaid = order.payment_status === 'Paid' || order.payment_status === 'Partially Paid';
  const hasDispatchedShipment = order.shipments.some(
    (s) => s.status === 'In transit' || s.status === 'Delivered' || s.payment_collection_status === 'Collected'
  );
  const isBlockedFromDeletion = isPaid || hasDispatchedShipment;

  const customerName = `${order.customer.first_name} ${order.customer.last_name || ''}`.trim();

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={() => {
        if (!deleting && !cancelling) onClose();
      }}
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="delete-order-dialog-title"
      aria-describedby="delete-order-dialog-desc"
    >
      <div
        className="relative w-full max-w-[500px] rounded-2xl bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          disabled={deleting || cancelling}
          className="absolute right-5 top-5 rounded-lg p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 disabled:opacity-50"
          aria-label="Close dialog"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Icon & Title */}
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-rose-50 text-rose-600">
          <Trash2 className="h-6 w-6 stroke-[2.2]" />
        </div>

        <h3 id="delete-order-dialog-title" className="text-lg font-bold text-slate-900">
          Delete order {order.order_number}?
        </h3>

        {/* Order Summary Pill */}
        <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600 space-y-1">
          <div className="flex justify-between">
            <span className="font-semibold text-slate-700">Customer:</span>
            <span>{customerName}</span>
          </div>
          <div className="flex justify-between">
            <span className="font-semibold text-slate-700">Status:</span>
            <span className="font-medium">{order.status} · Payment: {order.payment_status}</span>
          </div>
          <div className="flex justify-between">
            <span className="font-semibold text-slate-700">Total:</span>
            <span className="font-semibold text-slate-900">
              {new Intl.NumberFormat(undefined, { style: 'currency', currency: order.currency }).format(Number(order.total || 0))}
            </span>
          </div>
        </div>

        {/* Safety & Referential Integrity Guidance */}
        {isBlockedFromDeletion ? (
          <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 flex items-start gap-2.5">
            <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
            <div>
              <p className="font-semibold">Permanent deletion is restricted</p>
              <p className="mt-1 leading-relaxed">
                This order has recorded payments or dispatched shipments. Permanent deletion would break financial accounting or delivery tracking. Please cancel the order instead.
              </p>
            </div>
          </div>
        ) : (
          <div className="mt-4 space-y-2 text-xs leading-relaxed text-slate-600">
            <p id="delete-order-dialog-desc">
              Are you sure you want to permanently delete order <strong className="text-slate-800">{order.order_number}</strong>?
            </p>
            <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-3 space-y-1.5">
              <p className="font-semibold text-slate-700">What happens on deletion:</p>
              <ul className="list-disc list-inside space-y-1 text-slate-500">
                <li><strong className="text-slate-700">Customer record is kept:</strong> {customerName} will not be deleted.</li>
                <li><strong className="text-slate-700">Order removed:</strong> The order, draft shipments, and status history are permanently removed.</li>
                <li><strong className="text-slate-700">Reversible alternative:</strong> Cancelling marks the order as Cancelled and excludes it from fulfillment while keeping audit history.</li>
              </ul>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="mt-6 flex flex-wrap items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            disabled={deleting || cancelling}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            Keep order
          </button>

          {order.status !== 'Cancelled' && (
            <button
              type="button"
              onClick={() => onConfirmCancel(order)}
              disabled={deleting || cancelling}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              <Ban size={14} />
              {cancelling ? 'Cancelling…' : 'Cancel order instead'}
            </button>
          )}

          {!isBlockedFromDeletion && (
            <button
              type="button"
              onClick={() => onConfirmDelete(order)}
              disabled={deleting || cancelling}
              className="inline-flex items-center gap-1.5 rounded-lg bg-rose-600 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-700 shadow-xs transition-colors disabled:opacity-50"
            >
              <Trash2 size={14} />
              {deleting ? 'Deleting…' : 'Delete permanently'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
