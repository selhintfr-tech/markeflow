import React from 'react';
import {
  CheckCircle2,
  DollarSign,
  Phone,
  ShieldCheck,
  Truck,
  X,
} from 'lucide-react';
import type { SalesOrder, SalesShipment } from '../salesService';

interface OzonParcelDetailsModalProps {
  order: SalesOrder;
  onClose: () => void;
}

export const OzonParcelDetailsModal: React.FC<OzonParcelDetailsModalProps> = ({ order, onClose }) => {
  const shipment: SalesShipment | undefined = order.shipments?.[0];
  const isPrivateCourier =
    shipment?.delivery_company_id?.toLowerCase().includes('khalid') ||
    order.notes?.toLowerCase().includes('khalid');

  const customerName = order.customer
    ? `${order.customer.first_name} ${order.customer.last_name || ''}`.trim()
    : 'Unknown Customer';

  const codAmount = shipment?.cod_amount ? Number(shipment.cod_amount) : Number(order.total);
  const deliveryFee = shipment?.shipping_cost !== null && shipment?.shipping_cost !== undefined ? Number(shipment.shipping_cost) : 0;
  const netRemittance = Math.max(0, codAmount - deliveryFee);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/70 px-6 py-4">
          <div className="flex items-center gap-3">
            <div
              className={`rounded-lg p-2.5 ${
                isPrivateCourier ? 'bg-amber-100 text-amber-800' : 'bg-violet-100 text-violet-800'
              }`}
            >
              <Truck size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900">
                  {isPrivateCourier ? 'Private Courier Delivery' : 'Ozon Express Parcel Details'}
                </h3>
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${
                    isPrivateCourier
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-violet-100 text-violet-800'
                  }`}
                >
                  {isPrivateCourier ? 'Khalid Nait Lmouden' : 'Ozon Express Morocco'}
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Order #{order.order_number} • Tracking:{' '}
                <span className="font-mono font-medium text-slate-700">
                  {shipment?.tracking_number || 'Not assigned'}
                </span>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Body */}
        <div className="space-y-5 overflow-y-auto p-6 text-sm">
          {/* Status Banner */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-3.5">
              <span className="text-xs font-medium text-slate-500">Delivery Status</span>
              <div className="mt-1 flex items-center gap-2">
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${
                    order.status === 'Delivered'
                      ? 'bg-emerald-100 text-emerald-800'
                      : order.status === 'Shipping'
                        ? 'bg-blue-100 text-blue-800'
                        : order.status === 'Returned'
                          ? 'bg-rose-100 text-rose-800'
                          : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  {order.status === 'Delivered' && <CheckCircle2 size={12} />}
                  {order.status}
                </span>
                <span className="text-xs text-slate-500">
                  (Courier raw status: {shipment?.status || 'Active'})
                </span>
              </div>
            </div>

            <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-3.5">
              <span className="text-xs font-medium text-slate-500">Cash-on-Delivery Status</span>
              <div className="mt-1 flex items-center gap-2">
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${
                    shipment?.payment_collection_status === 'Collected'
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  <DollarSign size={12} />
                  {shipment?.payment_collection_status === 'Collected'
                    ? 'Courier Remitted'
                    : 'Collection Pending'}
                </span>
                <span className="text-xs text-slate-500">
                  Order Payment: {order.payment_status}
                </span>
              </div>
            </div>
          </div>

          {/* Financial Breakdown Table */}
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <h4 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-600">
              <DollarSign size={14} className="text-slate-500" />
              Financial & Remittance Breakdown
            </h4>
            <div className="mt-3 divide-y divide-slate-100 text-xs">
              <div className="flex justify-between py-2 text-slate-600">
                <span>Product Sale Value</span>
                <span className="font-semibold text-slate-800">{Number(order.subtotal).toFixed(2)} MAD</span>
              </div>
              <div className="flex justify-between py-2 text-slate-600">
                <span>Expected Cash On Delivery (COD)</span>
                <span className="font-semibold text-slate-900">{codAmount.toFixed(2)} MAD</span>
              </div>
              <div className="flex justify-between py-2 text-slate-600">
                <span>
                  {isPrivateCourier ? 'Private Courier Fee' : 'Ozon Carrier Delivery Fee'}
                </span>
                <span className="font-semibold text-rose-600">
                  {deliveryFee > 0 ? `-${deliveryFee.toFixed(2)} MAD` : '0.00 MAD (Free)'}
                </span>
              </div>
              <div className="flex justify-between bg-violet-50/50 px-2.5 py-2 font-medium text-violet-950 rounded">
                <span>Expected Net Remittance from Courier</span>
                <span className="font-bold text-violet-900">{netRemittance.toFixed(2)} MAD</span>
              </div>
            </div>

            <div className="mt-3 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50/70 p-2.5 text-[11px] text-amber-900 leading-relaxed">
              <ShieldCheck size={14} className="mt-0.5 shrink-0 text-amber-700" />
              <span>
                <strong>Financial Safety Rule:</strong> Courier delivery status <em>Delivered</em>{' '}
                does not constitute verified bank deposit. Cash is only recognized in MarketFlow
                Finance Ledger after verified bank remittance from the carrier.
              </span>
            </div>
          </div>

          {/* Recipient & Destination Info */}
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600">
              Recipient & Destination Details
            </h4>
            <div className="mt-3 grid grid-cols-1 gap-2.5 text-xs sm:grid-cols-2">
              <div>
                <span className="text-slate-500">Customer Name:</span>
                <p className="font-medium text-slate-900">{customerName}</p>
              </div>
              <div>
                <span className="text-slate-500">Contact Telephone:</span>
                <p className="flex items-center gap-1 font-mono font-medium text-slate-900">
                  <Phone size={11} className="text-slate-400" />
                  {order.customer?.phone || 'No phone recorded'}
                </p>
              </div>
              <div className="sm:col-span-2">
                <span className="text-slate-500">Delivery Address:</span>
                <p className="font-medium text-slate-900">
                  {order.customer?.address || 'Morocco'}
                </p>
              </div>
              {order.notes && (
                <div className="sm:col-span-2 rounded bg-slate-50 p-2.5 text-slate-700">
                  <span className="font-semibold text-slate-800">Operational Notes: </span>
                  {order.notes}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end border-t border-slate-100 bg-slate-50 px-6 py-3.5">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-slate-200 px-4 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-300 transition-colors"
          >
            Close Details
          </button>
        </div>
      </div>
    </div>
  );
};
