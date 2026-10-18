import { apiRequest } from '../api/apiClient';

export type OrderStatus = 'Pending' | 'Confirmed' | 'Shipping' | 'Delivered' | 'Returned' | 'Rejected';
export type PaymentStatus = 'Pending' | 'Paid' | 'Partially Paid' | 'Failed' | 'Refunded';
export type ShipmentStatus = 'Pending' | 'Ready' | 'In transit' | 'Delivered' | 'Returned' | 'Failed';
export type CollectionStatus = 'Pending' | 'Collected' | 'Failed' | 'Not applicable';

export interface SalesCustomer {
  id: string;
  first_name: string;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
}

export interface SalesShipment {
  id: string;
  status: ShipmentStatus;
  delivery_company_id: string | null;
  tracking_number: string | null;
  shipping_cost: string;
  cod_amount: string;
  payment_collection_status: CollectionStatus;
}

export interface OrderStatusEvent {
  id: string;
  from_status: OrderStatus | null;
  to_status: OrderStatus;
  source: string;
  changed_by: number | null;
  metadata: Record<string, string> | null;
  created_at: string;
}

export interface SalesOrder {
  id: string;
  order_number: string;
  status: OrderStatus;
  payment_status: PaymentStatus;
  subtotal: string;
  total: string;
  currency: string;
  items: Array<{ name: string; quantity: number; unit_price: number }> | null;
  source: string | null;
  notes: string | null;
  customer: SalesCustomer;
  shipments: SalesShipment[];
  status_history: OrderStatusEvent[];
  created_at: string;
}

export interface SalesOrderInput {
  customer_id: string;
  payment_status: PaymentStatus;
  subtotal: number;
  total: number;
  currency: string;
  items: Array<{ name: string; quantity: number; unit_price: number }>;
  source?: string;
  notes?: string;
  shipment?: {
    delivery_company_id?: string;
    tracking_number?: string;
    shipping_cost: number;
    cod_amount: number;
    payment_collection_status: CollectionStatus;
  };
}

const base = '/api/sales';

export const salesService = {
  customers: async (workspaceId: string) =>
    (await apiRequest<{ data: SalesCustomer[] }>(`${base}/customers`, { workspaceId })).data,
  createCustomer: async (workspaceId: string, input: Omit<SalesCustomer, 'id'>) =>
    (await apiRequest<{ data: SalesCustomer }>(`${base}/customers`, { workspaceId, method: 'POST', body: input })).data,
  orders: async (workspaceId: string) =>
    (await apiRequest<{ data: SalesOrder[] }>(`${base}/orders`, { workspaceId })).data,
  createOrder: async (workspaceId: string, input: SalesOrderInput) =>
    (await apiRequest<{ data: SalesOrder }>(`${base}/orders`, { workspaceId, method: 'POST', body: input })).data,
  updateOrderStatus: async (workspaceId: string, id: string, status: OrderStatus) =>
    (await apiRequest<{ data: SalesOrder }>(`${base}/orders/${id}/status`, { workspaceId, method: 'PATCH', body: { status } })).data,
  updatePaymentStatus: async (workspaceId: string, id: string, payment_status: PaymentStatus) =>
    (await apiRequest<{ data: SalesOrder }>(`${base}/orders/${id}/payment-status`, { workspaceId, method: 'PATCH', body: { payment_status } })).data,
  updateShipment: async (workspaceId: string, id: string, changes: Record<string, string | number>) =>
    (await apiRequest<{ data: SalesShipment }>(`${base}/shipments/${id}`, { workspaceId, method: 'PATCH', body: changes })).data,
};
