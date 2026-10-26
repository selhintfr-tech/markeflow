import React, { useEffect } from 'react';
import { AlertTriangle, Trash2, X } from 'lucide-react';
import type { CrmSalesCustomer } from '../crmService';

interface DeleteSalesCustomerModalProps {
  isOpen: boolean;
  customer: CrmSalesCustomer | null;
  deleting?: boolean;
  onClose: () => void;
  onConfirmDelete: (customer: CrmSalesCustomer) => void;
}

export const DeleteSalesCustomerModal: React.FC<DeleteSalesCustomerModalProps> = ({
  isOpen,
  customer,
  deleting = false,
  onClose,
  onConfirmDelete,
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !deleting) {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, deleting, onClose]);

  if (!isOpen || !customer) return null;

  const ordersCount = customer.orders_count ?? 0;
  const isBlocked = ordersCount > 0;
  const fullName = `${customer.first_name} ${customer.last_name || ''}`.trim();

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={() => {
        if (!deleting) onClose();
      }}
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="delete-customer-dialog-title"
      aria-describedby="delete-customer-dialog-desc"
    >
      <div
        className="relative w-full max-w-[480px] rounded-2xl bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          disabled={deleting}
          className="absolute right-5 top-5 rounded-lg p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 disabled:opacity-50"
          aria-label="Close dialog"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Icon & Title */}
        <div className={`mb-4 flex h-12 w-12 items-center justify-center rounded-full ${isBlocked ? 'bg-amber-50 text-amber-600' : 'bg-rose-50 text-rose-600'}`}>
          {isBlocked ? (
            <AlertTriangle className="h-6 w-6 stroke-[2.2]" />
          ) : (
            <Trash2 className="h-6 w-6 stroke-[2.2]" />
          )}
        </div>

        <h3 id="delete-customer-dialog-title" className="text-lg font-bold text-slate-900">
          {isBlocked ? `Cannot delete ${fullName}` : `Delete customer ${fullName}?`}
        </h3>

        {/* Customer Summary Card */}
        <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600 space-y-1.5">
          <div className="flex justify-between">
            <span className="font-semibold text-slate-700">Customer:</span>
            <span className="font-medium text-slate-900">{fullName}</span>
          </div>
          {customer.phone && (
            <div className="flex justify-between">
              <span className="font-semibold text-slate-700">Phone:</span>
              <span>{customer.phone}</span>
            </div>
          )}
          {customer.email && (
            <div className="flex justify-between">
              <span className="font-semibold text-slate-700">Email:</span>
              <span>{customer.email}</span>
            </div>
          )}
          {customer.address && (
            <div className="flex justify-between">
              <span className="font-semibold text-slate-700">Address:</span>
              <span className="max-w-[240px] truncate text-right">{customer.address}</span>
            </div>
          )}
          <div className="flex justify-between border-t border-slate-200/80 pt-1.5">
            <span className="font-semibold text-slate-700">Linked Sales Orders:</span>
            <span className={`font-semibold ${isBlocked ? 'text-amber-700' : 'text-emerald-700'}`}>
              {ordersCount} order{ordersCount === 1 ? '' : 's'}
            </span>
          </div>
        </div>

        {/* Safety & Referential Integrity Guidance */}
        {isBlocked ? (
          <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 flex items-start gap-2.5">
            <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
            <div>
              <p className="font-semibold">Permanent deletion is restricted</p>
              <p className="mt-1 leading-relaxed">
                This customer has <strong>{ordersCount}</strong> linked sales order(s). Customer records with sales, fulfillment or financial history must be preserved for audit and accounting integrity.
              </p>
            </div>
          </div>
        ) : (
          <div className="mt-4 space-y-2 text-xs leading-relaxed text-slate-600" id="delete-customer-dialog-desc">
            <p>
              Are you sure you want to permanently delete <strong className="text-slate-800">{fullName}</strong>?
            </p>
            <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-3 space-y-1">
              <p className="font-semibold text-slate-700">Deletion safety check:</p>
              <ul className="list-disc list-inside space-y-0.5 text-slate-500">
                <li>This customer has <strong>0 linked orders</strong> and no shipments.</li>
                <li>The customer will be permanently removed from this workspace.</li>
                <li>This action is irreversible.</li>
              </ul>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="mt-6 flex flex-wrap items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            disabled={deleting}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            {isBlocked ? 'Close' : 'Keep customer'}
          </button>

          {!isBlocked && (
            <button
              type="button"
              onClick={() => onConfirmDelete(customer)}
              disabled={deleting}
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
