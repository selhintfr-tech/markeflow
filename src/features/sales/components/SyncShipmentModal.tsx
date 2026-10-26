import React, { useEffect } from 'react';
import { PackageCheck, Truck, X } from 'lucide-react';
import type { SalesOrder } from '../salesService';

interface SyncShipmentModalProps {
  isOpen: boolean;
  order: SalesOrder | null;
  saving?: boolean;
  onClose: () => void;
  onConfirmSync: (order: SalesOrder, syncShipment: boolean) => void;
}

export const SyncShipmentModal: React.FC<SyncShipmentModalProps> = ({
  isOpen,
  order,
  saving = false,
  onClose,
  onConfirmSync,
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !saving) {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, saving, onClose]);

  if (!isOpen || !order) return null;

  const shipment = order.shipments[0];
  const shipmentStatus = shipment?.status || 'Pending';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={() => {
        if (!saving) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="sync-shipment-dialog-title"
      aria-describedby="sync-shipment-dialog-desc"
    >
      <div
        className="relative w-full max-w-[480px] rounded-2xl bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          disabled={saving}
          className="absolute right-5 top-5 rounded-lg p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 disabled:opacity-50"
          aria-label="Close dialog"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Icon & Title */}
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
          <PackageCheck className="h-6 w-6 stroke-[2.2]" />
        </div>

        <h3 id="sync-shipment-dialog-title" className="text-lg font-bold text-slate-900">
          Mark order {order.order_number} as Delivered?
        </h3>

        {/* Current State Comparison */}
        <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-slate-600">New order status:</span>
            <span className="rounded-full bg-emerald-100 px-2 py-0.5 font-bold text-emerald-800">Delivered</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="font-semibold text-slate-600">Current carrier shipment:</span>
            <span className="rounded-full bg-amber-100 px-2 py-0.5 font-semibold text-amber-800">
              {shipmentStatus} {shipment?.tracking_number ? `(${shipment.tracking_number})` : ''}
            </span>
          </div>
        </div>

        {/* Guidance Note */}
        <div className="mt-4 text-xs leading-relaxed text-slate-600 space-y-2" id="sync-shipment-dialog-desc">
          <p>
            Order fulfillment reflects your commercial order completion. Physical carrier delivery reflects verified courier tracking.
          </p>
          <p className="rounded-lg bg-amber-50 p-2.5 text-amber-900 border border-amber-200">
            <strong>Carrier Evidence:</strong> If the package was physically handed to the customer by the carrier, synchronize the shipment status to Delivered. If you are marking order completion prior to courier confirmation, you can keep the shipment status unchanged.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="mt-6 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onConfirmSync(order, false)}
            disabled={saving}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            Update Order only
          </button>
          <button
            type="button"
            onClick={() => onConfirmSync(order, true)}
            disabled={saving}
            className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700 shadow-xs transition-colors disabled:opacity-50"
          >
            <Truck size={14} />
            Update Order &amp; Shipment
          </button>
        </div>
      </div>
    </div>
  );
};
