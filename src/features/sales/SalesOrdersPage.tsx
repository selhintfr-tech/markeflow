import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowDownUp, ChevronDown, CircleDollarSign, Clock3, PackageCheck, Plus, Search, ShoppingBag, Truck, UserRound, X } from 'lucide-react';
import { useWorkspace } from '../../context/WorkspaceContext';
import {
  salesService,
  type CollectionStatus,
  type OrderStatus,
  type PaymentStatus,
  type SalesOrder,
  type SalesOrderInput,
  type SalesCustomer,
  type ShipmentStatus,
} from './salesService';

const ORDER_STATUSES: OrderStatus[] = ['Pending', 'Confirmed', 'Shipping', 'Delivered', 'Returned', 'Rejected'];
const PAYMENT_STATUSES: PaymentStatus[] = ['Pending', 'Paid', 'Partially Paid', 'Failed', 'Refunded'];
const SHIPMENT_STATUSES: ShipmentStatus[] = ['Pending', 'Ready', 'In transit', 'Delivered', 'Returned', 'Failed'];
const COLLECTION_STATUSES: CollectionStatus[] = ['Pending', 'Collected', 'Failed', 'Not applicable'];
const tabs = ['All Orders', ...ORDER_STATUSES] as const;
type Tab = typeof tabs[number];

const inputClass = 'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-100';
const labelClass = 'mb-1 block text-xs font-semibold text-slate-600';
const buttonClass = 'inline-flex items-center justify-center gap-2 rounded-lg bg-violet-700 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-800 disabled:cursor-not-allowed disabled:opacity-60';

function money(value: string | number, currency: string) {
  return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(Number(value || 0));
}

function statusClass(status: string) {
  const styles: Record<string, string> = {
    Pending: 'bg-amber-50 text-amber-700',
    Confirmed: 'bg-blue-50 text-blue-700',
    Shipping: 'bg-violet-50 text-violet-700',
    'In transit': 'bg-violet-50 text-violet-700',
    Delivered: 'bg-emerald-50 text-emerald-700',
    Paid: 'bg-emerald-50 text-emerald-700',
    Collected: 'bg-emerald-50 text-emerald-700',
    Returned: 'bg-orange-50 text-orange-700',
    Rejected: 'bg-rose-50 text-rose-700',
    Failed: 'bg-rose-50 text-rose-700',
    'Partially Paid': 'bg-blue-50 text-blue-700',
    Refunded: 'bg-slate-100 text-slate-700',
    Ready: 'bg-cyan-50 text-cyan-700',
    'Not applicable': 'bg-slate-100 text-slate-600',
  };
  return styles[status] || 'bg-slate-100 text-slate-600';
}

function customerName(customer: SalesCustomer) {
  return `${customer.first_name} ${customer.last_name || ''}`.trim();
}

export const SalesOrdersPage: React.FC = () => {
  const { currentWorkspace, hasWorkspace, isLoadingWorkspaces } = useWorkspace();
  const workspaceId = currentWorkspace.id;
  const [orders, setOrders] = useState<SalesOrder[]>([]);
  const [customers, setCustomers] = useState<SalesCustomer[]>([]);
  const [loadedWorkspaceId, setLoadedWorkspaceId] = useState('');
  const [tab, setTab] = useState<Tab>('All Orders');
  const [search, setSearch] = useState('');
  const [showOrderForm, setShowOrderForm] = useState(false);
  const [showCustomerForm, setShowCustomerForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [expandedOrder, setExpandedOrder] = useState('');
  const [customerForm, setCustomerForm] = useState({ first_name: '', last_name: '', email: '', phone: '', address: '' });
  const requestId = useRef(0);
  const [orderForm, setOrderForm] = useState({
    customer_id: '',
    item_name: '',
    quantity: 1,
    unit_price: 0,
    payment_status: 'Pending' as PaymentStatus,
    source: '',
    notes: '',
    delivery_company_id: '',
    tracking_number: '',
    shipping_cost: 0,
    cod_amount: 0,
  });

  const refresh = useCallback(async () => {
    if (!workspaceId) return;
    const currentRequest = ++requestId.current;
    setLoading(true);
    setError('');
    try {
      const [nextOrders, nextCustomers] = await Promise.all([
        salesService.orders(workspaceId),
        salesService.customers(workspaceId),
      ]);
      if (currentRequest !== requestId.current) return;
      setOrders(nextOrders);
      setCustomers(nextCustomers);
      setLoadedWorkspaceId(workspaceId);
      setOrderForm((form) => ({
        ...form,
        customer_id: nextCustomers.some((customer) => customer.id === form.customer_id)
          ? form.customer_id
          : nextCustomers[0]?.id || '',
      }));
    } catch (cause) {
      if (currentRequest === requestId.current) setError(cause instanceof Error ? cause.message : 'Unable to load sales records.');
    } finally {
      if (currentRequest === requestId.current) setLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    const timeout = window.setTimeout(() => void refresh(), 0);
    return () => window.clearTimeout(timeout);
  }, [refresh]);

  const workspaceOrders = loadedWorkspaceId === workspaceId ? orders : [];
  const workspaceCustomers = loadedWorkspaceId === workspaceId ? customers : [];
  const counts: Record<Tab, number> = {
    'All Orders': workspaceOrders.length,
    Pending: 0,
    Confirmed: 0,
    Shipping: 0,
    Delivered: 0,
    Returned: 0,
    Rejected: 0,
  };
  for (const status of ORDER_STATUSES) counts[status] = workspaceOrders.filter((order) => order.status === status).length;

  const visibleOrders = workspaceOrders.filter((order) => {
    const matchesTab = tab === 'All Orders' || order.status === tab;
    const customer = customerName(order.customer).toLowerCase();
    const query = search.trim().toLowerCase();
    return matchesTab && (!query || order.order_number.toLowerCase().includes(query) || customer.includes(query) ||
      (order.customer.email || '').toLowerCase().includes(query) ||
      order.shipments.some((shipment) => (shipment.tracking_number || '').toLowerCase().includes(query)));
  });

  const perform = async (operation: () => Promise<unknown>) => {
    setSaving(true);
    setError('');
    try {
      await operation();
      await refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'The sales record could not be saved.');
    } finally {
      setSaving(false);
    }
  };

  const createCustomer = async () => {
    if (!workspaceId) return;
    await perform(async () => {
      const created = await salesService.createCustomer(workspaceId, {
        first_name: customerForm.first_name.trim(),
        last_name: customerForm.last_name.trim() || null,
        email: customerForm.email.trim() || null,
        phone: customerForm.phone.trim() || null,
        address: customerForm.address.trim() || null,
      });
      setOrderForm((form) => ({ ...form, customer_id: created.id }));
      setCustomerForm({ first_name: '', last_name: '', email: '', phone: '', address: '' });
      setShowCustomerForm(false);
    });
  };

  const createOrder = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!workspaceId) return;
    const items = orderForm.item_name.trim()
      ? [{ name: orderForm.item_name.trim(), quantity: Number(orderForm.quantity), unit_price: Number(orderForm.unit_price) }]
      : [];
    const subtotal = items.reduce((sum, item) => sum + item.quantity * item.unit_price, 0);
    const total = subtotal + (Number(orderForm.shipping_cost) || 0);
    const input: SalesOrderInput = {
      customer_id: orderForm.customer_id,
      payment_status: orderForm.payment_status,
      subtotal,
      total,
      currency: currentWorkspace.currency || 'USD',
      items,
      source: orderForm.source.trim() || undefined,
      notes: orderForm.notes.trim() || undefined,
      shipment: {
        delivery_company_id: orderForm.delivery_company_id.trim() || undefined,
        tracking_number: orderForm.tracking_number.trim() || undefined,
        shipping_cost: Number(orderForm.shipping_cost) || 0,
        cod_amount: Number(orderForm.cod_amount) || 0,
        payment_collection_status: 'Pending',
      },
    };
    await perform(async () => {
      await salesService.createOrder(workspaceId, input);
      setOrderForm((form) => ({
        ...form, item_name: '', quantity: 1, unit_price: 0, source: '', notes: '',
        delivery_company_id: '', tracking_number: '', shipping_cost: 0, cod_amount: 0,
      }));
      setShowOrderForm(false);
    });
  };

  const changeShipment = async (shipmentId: string, field: string, value: string | number) => {
    if (!workspaceId) return;
    await perform(() => salesService.updateShipment(workspaceId, shipmentId, { [field]: value }));
  };

  if (isLoadingWorkspaces) return <div className="p-8 text-sm text-slate-500">Loading workspace…</div>;
  if (!hasWorkspace) return <div className="m-6 rounded-xl border border-slate-200 bg-white p-8 text-sm text-slate-600">Select or create a workspace to manage sales and orders.</div>;

  return (
    <div className="mx-auto w-full max-w-[1500px] space-y-6 p-4 md:p-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-violet-700">Commerce</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">Sales &amp; Orders</h1>
          <p className="mt-1 text-sm text-slate-500">Manage customer orders, payment and delivery progress in one place.</p>
        </div>
        <button type="button" className={buttonClass} disabled={loading} onClick={() => setShowOrderForm((value) => !value)}>
          {showOrderForm ? <X size={16} /> : <Plus size={16} />}
          {showOrderForm ? 'Close form' : 'Create order'}
        </button>
      </header>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4"><p className="text-xs font-medium text-slate-500">Orders</p><p className="mt-2 text-2xl font-bold text-slate-900">{workspaceOrders.length}</p><div className="mt-2 flex items-center gap-1 text-xs text-slate-500"><ShoppingBag size={14} /> All statuses</div></div>
        <div className="rounded-xl border border-slate-200 bg-white p-4"><p className="text-xs font-medium text-slate-500">Pending</p><p className="mt-2 text-2xl font-bold text-amber-700">{counts.Pending}</p><div className="mt-2 flex items-center gap-1 text-xs text-slate-500"><Clock3 size={14} /> Awaiting confirmation</div></div>
        <div className="rounded-xl border border-slate-200 bg-white p-4"><p className="text-xs font-medium text-slate-500">In delivery</p><p className="mt-2 text-2xl font-bold text-violet-700">{counts.Shipping}</p><div className="mt-2 flex items-center gap-1 text-xs text-slate-500"><Truck size={14} /> With carrier</div></div>
        <div className="rounded-xl border border-slate-200 bg-white p-4"><p className="text-xs font-medium text-slate-500">Delivered</p><p className="mt-2 text-2xl font-bold text-emerald-700">{counts.Delivered}</p><div className="mt-2 flex items-center gap-1 text-xs text-slate-500"><PackageCheck size={14} /> Completed orders</div></div>
      </div>

      {error && <div role="alert" className="flex items-center justify-between rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800"><span>{error}</span><button type="button" onClick={() => setError('')} aria-label="Dismiss error"><X size={16} /></button></div>}

      {showOrderForm && <form onSubmit={createOrder} className="rounded-xl border border-violet-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between"><h2 className="font-semibold text-slate-900">New order</h2><button type="button" className="text-sm font-medium text-violet-700 hover:text-violet-900" onClick={() => setShowCustomerForm((value) => !value)}>+ Add customer</button></div>
        {showCustomerForm && <div className="mb-5 rounded-lg bg-slate-50 p-4">
          <h3 className="mb-3 text-sm font-semibold text-slate-800">New customer record</h3>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <label><span className={labelClass}>First name *</span><input required className={inputClass} value={customerForm.first_name} onChange={(event) => setCustomerForm({ ...customerForm, first_name: event.target.value })} /></label>
            <label><span className={labelClass}>Last name</span><input className={inputClass} value={customerForm.last_name} onChange={(event) => setCustomerForm({ ...customerForm, last_name: event.target.value })} /></label>
            <label><span className={labelClass}>Email</span><input type="email" className={inputClass} value={customerForm.email} onChange={(event) => setCustomerForm({ ...customerForm, email: event.target.value })} /></label>
            <label><span className={labelClass}>Phone</span><input className={inputClass} value={customerForm.phone} onChange={(event) => setCustomerForm({ ...customerForm, phone: event.target.value })} /></label>
            <label className="sm:col-span-2"><span className={labelClass}>Delivery address</span><input className={inputClass} value={customerForm.address} onChange={(event) => setCustomerForm({ ...customerForm, address: event.target.value })} /></label>
          </div>
          <button disabled={saving} className={`${buttonClass} mt-3`} type="button" onClick={() => void createCustomer()}>Save customer</button>
        </div>}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <label><span className={labelClass}>Customer *</span><select required className={inputClass} value={orderForm.customer_id} onChange={(event) => setOrderForm({ ...orderForm, customer_id: event.target.value })}><option value="">Choose a customer</option>{workspaceCustomers.map((customer) => <option key={customer.id} value={customer.id}>{customerName(customer)}{customer.email ? ` · ${customer.email}` : ''}</option>)}</select></label>
          <label><span className={labelClass}>Product / item *</span><input required className={inputClass} value={orderForm.item_name} onChange={(event) => setOrderForm({ ...orderForm, item_name: event.target.value })} placeholder="e.g. Linen shirt" /></label>
          <label><span className={labelClass}>Quantity</span><input required type="number" min="1" className={inputClass} value={orderForm.quantity} onChange={(event) => setOrderForm({ ...orderForm, quantity: Number(event.target.value) })} /></label>
          <label><span className={labelClass}>Unit price ({currentWorkspace.currency || 'USD'})</span><input required type="number" min="0" step="0.01" className={inputClass} value={orderForm.unit_price} onChange={(event) => setOrderForm({ ...orderForm, unit_price: Number(event.target.value) })} /></label>
          <label><span className={labelClass}>Payment status</span><select className={inputClass} value={orderForm.payment_status} onChange={(event) => setOrderForm({ ...orderForm, payment_status: event.target.value as PaymentStatus })}>{PAYMENT_STATUSES.map((status) => <option key={status}>{status}</option>)}</select></label>
          <label><span className={labelClass}>Delivery company ID</span><input className={inputClass} value={orderForm.delivery_company_id} onChange={(event) => setOrderForm({ ...orderForm, delivery_company_id: event.target.value })} placeholder="For future carrier integration" /></label>
          <label><span className={labelClass}>Tracking number</span><input className={inputClass} value={orderForm.tracking_number} onChange={(event) => setOrderForm({ ...orderForm, tracking_number: event.target.value })} /></label>
          <label><span className={labelClass}>Shipping cost</span><input type="number" min="0" step="0.01" className={inputClass} value={orderForm.shipping_cost} onChange={(event) => setOrderForm({ ...orderForm, shipping_cost: Number(event.target.value) })} /></label>
          <label><span className={labelClass}>COD amount</span><input type="number" min="0" step="0.01" className={inputClass} value={orderForm.cod_amount} onChange={(event) => setOrderForm({ ...orderForm, cod_amount: Number(event.target.value) })} /></label>
          <label><span className={labelClass}>Order source</span><input className={inputClass} value={orderForm.source} onChange={(event) => setOrderForm({ ...orderForm, source: event.target.value })} placeholder="Website, social, store…" /></label>
          <label className="sm:col-span-2 lg:col-span-3"><span className={labelClass}>Notes</span><input className={inputClass} value={orderForm.notes} onChange={(event) => setOrderForm({ ...orderForm, notes: event.target.value })} /></label>
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
          <p className="text-sm text-slate-500">New orders start in <strong className="text-amber-700">Pending</strong>. Total with shipping: <strong className="text-slate-900">{money(orderForm.quantity * orderForm.unit_price + (Number(orderForm.shipping_cost) || 0), currentWorkspace.currency || 'USD')}</strong></p>
          <button type="submit" className={buttonClass} disabled={saving || loading || !workspaceCustomers.length}>{saving ? 'Saving…' : 'Save order'}</button>
        </div>
      </form>}

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto border-b border-slate-200 px-4 pt-3">
          <div className="flex min-w-max gap-1" role="tablist" aria-label="Filter orders by status">
            {tabs.map((name) => <button key={name} role="tab" aria-selected={tab === name} type="button" onClick={() => setTab(name)} className={`rounded-t-lg border-b-2 px-3 py-3 text-sm font-medium transition-colors ${tab === name ? 'border-violet-700 text-violet-800' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>
              {name}<span className={`ml-2 rounded-full px-2 py-0.5 text-[11px] ${tab === name ? 'bg-violet-100 text-violet-800' : 'bg-slate-100 text-slate-600'}`}>{counts[name]}</span>
            </button>)}
          </div>
        </div>
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div><h2 className="font-semibold text-slate-900">{tab}</h2><p className="mt-0.5 text-xs text-slate-500">{visibleOrders.length} {visibleOrders.length === 1 ? 'order' : 'orders'}</p></div>
          <label className="relative block w-full sm:max-w-xs"><Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input className={`${inputClass} pl-9`} aria-label="Search orders" placeholder="Search order, customer or tracking…" value={search} onChange={(event) => setSearch(event.target.value)} /></label>
        </div>
        {loading ? <div className="p-10 text-center text-sm text-slate-500">Loading orders…</div> : visibleOrders.length === 0 ? <div className="p-12 text-center"><div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-violet-50 text-violet-700"><ShoppingBag size={22} /></div><h3 className="mt-3 font-semibold text-slate-900">No orders here yet</h3><p className="mt-1 text-sm text-slate-500">{search ? 'Try another search.' : 'Create an order to start tracking your sales.'}</p></div> : <div className="divide-y divide-slate-100">
          {visibleOrders.map((order) => {
            const shipment = order.shipments[0];
            const expanded = expandedOrder === order.id;
            return <article key={order.id} className="px-4 py-4 md:px-5">
              <div className="grid gap-4 lg:grid-cols-[1.35fr_1fr_0.9fr_1fr_auto] lg:items-center">
                <div className="flex min-w-0 items-start gap-3"><div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-violet-50 text-violet-700"><ShoppingBag size={17} /></div><div className="min-w-0"><p className="truncate font-semibold text-slate-900">{order.order_number}</p><p className="mt-1 text-xs text-slate-500">{new Date(order.created_at).toLocaleDateString()} · {order.items?.length || 0} items</p></div></div>
                <div className="min-w-0"><p className="flex items-center gap-1.5 text-sm font-medium text-slate-800"><UserRound size={14} className="shrink-0 text-slate-400" />{customerName(order.customer)}</p><p className="mt-1 truncate pl-5 text-xs text-slate-500">{order.customer.email || order.customer.phone || 'No contact details'}</p></div>
                <div><p className="font-semibold text-slate-900">{money(order.total, order.currency)}</p><span className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ${statusClass(order.payment_status)}`}>{order.payment_status}</span></div>
                <div className="flex flex-col items-start gap-2"><select aria-label={`Order ${order.order_number} status`} disabled={saving} className={`max-w-full rounded-full border-0 px-2.5 py-1 text-xs font-semibold outline-none ring-1 ring-inset ring-slate-200 ${statusClass(order.status)}`} value={order.status} onChange={(event) => void perform(() => salesService.updateOrderStatus(workspaceId, order.id, event.target.value as OrderStatus))}>{ORDER_STATUSES.map((status) => <option key={status}>{status}</option>)}</select><select aria-label={`Order ${order.order_number} payment status`} disabled={saving} className="max-w-full border-0 bg-transparent p-0 text-xs text-slate-500 outline-none" value={order.payment_status} onChange={(event) => void perform(() => salesService.updatePaymentStatus(workspaceId, order.id, event.target.value as PaymentStatus))}>{PAYMENT_STATUSES.map((status) => <option key={status}>{status}</option>)}</select></div>
                <button type="button" className="inline-flex items-center justify-center gap-1 rounded-lg px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100" aria-expanded={expanded} onClick={() => setExpandedOrder(expanded ? '' : order.id)}>{expanded ? 'Close' : 'Details'}<ChevronDown size={14} className={expanded ? 'rotate-180' : ''} /></button>
              </div>
              {expanded && <div className="mt-4 grid gap-5 rounded-lg bg-slate-50 p-4 lg:grid-cols-2">
                <div><h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-800"><Truck size={15} /> Shipment &amp; collection</h3>{shipment ? <div className="grid gap-3 sm:grid-cols-2">
                  <label><span className={labelClass}>Shipment status</span><select className={inputClass} disabled={saving} value={shipment.status} onChange={(event) => void changeShipment(shipment.id, 'status', event.target.value)}>{SHIPMENT_STATUSES.map((status) => <option key={status}>{status}</option>)}</select></label>
                  <label><span className={labelClass}>Delivery company ID</span><input className={inputClass} defaultValue={shipment.delivery_company_id || ''} onBlur={(event) => { if (event.target.value !== (shipment.delivery_company_id || '')) void changeShipment(shipment.id, 'delivery_company_id', event.target.value); }} /></label>
                  <label><span className={labelClass}>Tracking number</span><input className={inputClass} defaultValue={shipment.tracking_number || ''} onBlur={(event) => { if (event.target.value !== (shipment.tracking_number || '')) void changeShipment(shipment.id, 'tracking_number', event.target.value); }} /></label>
                  <label><span className={labelClass}>Shipping cost</span><input type="number" min="0" step="0.01" className={inputClass} defaultValue={shipment.shipping_cost} onBlur={(event) => { if (event.target.value !== shipment.shipping_cost) void changeShipment(shipment.id, 'shipping_cost', Number(event.target.value)); }} /></label>
                  <label><span className={labelClass}>COD amount</span><input type="number" min="0" step="0.01" className={inputClass} defaultValue={shipment.cod_amount} onBlur={(event) => { if (event.target.value !== shipment.cod_amount) void changeShipment(shipment.id, 'cod_amount', Number(event.target.value)); }} /></label>
                  <label><span className={labelClass}>Payment collected</span><select className={inputClass} value={shipment.payment_collection_status} onChange={(event) => void changeShipment(shipment.id, 'payment_collection_status', event.target.value)}>{COLLECTION_STATUSES.map((status) => <option key={status}>{status}</option>)}</select></label>
                </div> : <p className="text-sm text-slate-500">No shipment record.</p>}
                  {order.items && order.items.length > 0 && <div className="mt-4 space-y-1 border-t border-slate-200 pt-3 text-xs text-slate-600">{order.items.map((item, index) => <p key={`${item.name}-${index}`} className="flex justify-between gap-3"><span>{item.quantity} × {item.name}</span><span>{money(item.quantity * item.unit_price, order.currency)}</span></p>)}</div>}
                </div>
                <div><h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-800"><ArrowDownUp size={15} /> Order status history</h3><ol className="space-y-3">{[...order.status_history].reverse().map((event) => <li key={event.id} className="relative border-l border-slate-200 pl-4 text-xs last:border-l-0"><span className="absolute -left-[5px] top-0.5 h-2 w-2 rounded-full bg-violet-500" /><p className="font-medium text-slate-800">{event.from_status ? `${event.from_status} → ` : ''}{event.to_status}</p><p className="mt-0.5 text-slate-500">{new Date(event.created_at).toLocaleString()} · {event.source === 'shipment' ? 'Shipment update' : event.source === 'created' ? 'Order created' : 'Manual update'}</p></li>)}</ol>
                  <div className="mt-4 flex items-center gap-2 text-xs text-slate-500"><CircleDollarSign size={14} />{order.source || 'Source not specified'}{order.notes ? ` · ${order.notes}` : ''}</div>
                </div>
              </div>}
            </article>;
          })}
        </div>}
      </section>
    </div>
  );
};
