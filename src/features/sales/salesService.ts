import { apiRequest } from '../api/apiClient.ts';

export type OrderStatus = 'Pending' | 'Confirmed' | 'Shipping' | 'Delivered' | 'Returned' | 'Rejected' | 'Cancelled';
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
  orders_count?: number;
}

export interface SalesShipment {
  id: string;
  status: ShipmentStatus;
  delivery_company_id: string | null;
  tracking_number: string | null;
  shipping_cost: string | null;
  customer_shipping_charge: string | null;
  cod_amount: string | null;
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
    shipping_cost?: number;
    customer_shipping_charge: number;
    cod_amount?: number;
    payment_collection_status: CollectionStatus;
  };
}

export interface OzonPreviewData {
  can_send: boolean;
  reasons: string[];
  is_dry_run: boolean;
  preview: {
    order_id: string;
    order_number: string;
    recipient_name: string;
    phone: string;
    address: string;
    city: string;
    cod_amount: number;
    currency: string;
    items_summary: string;
  };
}

export interface OzonImportRow {
  row_index: number;
  tracking_number: string;
  recipient_name: string;
  phone: string;
  address: string;
  city: string;
  cod_amount: number;
  raw_status: string;
  normalized_status: string;
  order_reference: string;
  match_type: string;
  proposed_action: string;
  matched_order_number?: string | null;
  matched_order_id?: string | null;
  matched_customer_name?: string | null;
  is_duplicate_in_file: boolean;
  explanation: string;
}

export interface OzonImportPreviewResponse {
  success: boolean;
  message: string;
  total_rows: number;
  matched_tracking_count: number;
  matched_order_count: number;
  matched_customer_count: number;
  review_queue_count: number;
  duplicate_in_file_count: number;
  rows: OzonImportRow[];
}

export interface OzonImportExecuteResponse {
  success: boolean;
  message: string;
  updated_existing: number;
  linked_orders: number;
  created_in_review_queue: number;
  preserved_terminal: number;
}

export interface OzonSyncResult {
  message: string;
  synced_count: number;
  updated_count: number;
  preserved_terminal_count?: number;
  is_dry_run?: boolean;
}

export interface OzonDashboardSummary {
  total_ozon_shipments: number;
  pending_pickup: number;
  in_transit: number;
  delivered: number;
  returned_refused: number;
  collected_pending_remittance: number;
  remitted_verified: number;
  total_expected_cod: number;
  total_delivery_fees: number;
  unmatched_review_queue: number;
  private_courier_count: number;
}

export interface OzonSyncStatusData {
  is_dry_run: boolean;
  last_successful_sync: string | null;
  last_sync_message: string;
  parcels_checked_count: number;
  updated_count: number;
  preserved_terminal_count: number;
  unmatched_parcels_count: number;
  failed_requests_count: number;
  next_planned_sync_at: string;
  summary: OzonDashboardSummary;
}

export interface OzonReviewQueueItem {
  id: string;
  tracking_number: string;
  order_reference: string | null;
  status: string;
  raw_status: string | null;
  delivery_fee: string;
  cod_amount: string;
  cod_collected: boolean;
  status_updated_at: string | null;
  last_error: string | null;
  created_at: string;
  status_history?: Array<{
    status: string;
    raw_status: string | null;
    occurred_at: string;
    source: string;
  }>;
}

const base = '/api/sales';

export const salesService = {
  customers: async (workspaceId: string) =>
    (await apiRequest<{ data: SalesCustomer[] }>(`${base}/customers`, { workspaceId })).data,
  createCustomer: async (workspaceId: string, input: Omit<SalesCustomer, 'id' | 'orders_count'>) =>
    (await apiRequest<{ data: SalesCustomer }>(`${base}/customers`, { workspaceId, method: 'POST', body: input })).data,
  updateCustomer: async (workspaceId: string, id: string, input: Partial<Omit<SalesCustomer, 'id' | 'orders_count'>>) =>
    (await apiRequest<{ data: SalesCustomer }>(`${base}/customers/${id}`, { workspaceId, method: 'PATCH', body: input })).data,
  deleteCustomer: async (workspaceId: string, id: string) =>
    (await apiRequest<{ message: string; data: { id: string; first_name: string; last_name: string | null } }>(`${base}/customers/${id}`, {
      workspaceId,
      method: 'DELETE',
    })),
  orders: async (workspaceId: string) =>
    (await apiRequest<{ data: SalesOrder[] }>(`${base}/orders`, { workspaceId })).data,
  createOrder: async (workspaceId: string, input: SalesOrderInput) =>
    (await apiRequest<{ data: SalesOrder }>(`${base}/orders`, { workspaceId, method: 'POST', body: input })).data,
  updateOrderStatus: async (workspaceId: string, id: string, status: OrderStatus, sync_shipment?: boolean) =>
    (await apiRequest<{ data: SalesOrder }>(`${base}/orders/${id}/status`, {
      workspaceId,
      method: 'PATCH',
      body: sync_shipment !== undefined ? { status, sync_shipment } : { status },
    })).data,
  updatePaymentStatus: async (workspaceId: string, id: string, payment_status: PaymentStatus) =>
    (await apiRequest<{ data: SalesOrder }>(`${base}/orders/${id}/payment-status`, { workspaceId, method: 'PATCH', body: { payment_status } })).data,
  deleteOrder: async (workspaceId: string, id: string) =>
    (await apiRequest<{ message: string; data: { id: string; order_number: string } }>(`${base}/orders/${id}`, {
      workspaceId,
      method: 'DELETE',
    })),
  updateShipment: async (workspaceId: string, id: string, changes: Record<string, string | number | null>) =>
    (await apiRequest<{ data: SalesShipment }>(`${base}/shipments/${id}`, { workspaceId, method: 'PATCH', body: changes })).data,
  getOzonPreview: async (workspaceId: string, orderId: string) =>
    await apiRequest<OzonPreviewData>(`${base}/orders/${orderId}/ozon-preview`, { workspaceId }),
  sendToOzon: async (workspaceId: string, orderId: string) =>
    await apiRequest<{ message: string; data: SalesOrder }>(`${base}/orders/${orderId}/send-to-ozon`, {
      workspaceId,
      method: 'POST',
    }),
  syncOzonTracking: async (workspaceId: string, orderId?: string) =>
    await apiRequest<OzonSyncResult>(`${base}/orders/sync-ozon-tracking`, {
      workspaceId,
      method: 'POST',
      body: orderId ? { order_id: orderId } : {},
    }),
  getOzonSyncStatus: async (workspaceId: string) =>
    (await apiRequest<{ data: OzonSyncStatusData }>(`${base}/ozon/sync-status`, { workspaceId })).data,
  getOzonReviewQueue: async (workspaceId: string) =>
    (await apiRequest<{ data: OzonReviewQueueItem[] }>(`${base}/ozon/review-queue`, { workspaceId })).data,
  linkOzonReviewQueue: async (workspaceId: string, id: string, orderId: string) =>
    await apiRequest<{ message: string; data: SalesOrder }>(`${base}/ozon/review-queue/${id}/link`, {
      workspaceId,
      method: 'POST',
      body: { order_id: orderId },
    }),
  createOrderFromOzonReviewQueue: async (
    workspaceId: string,
    id: string,
    payload: { customer_name: string; phone: string; city?: string; address?: string; total?: number; items?: Array<{ name: string; quantity: number; unit_price: number }> }
  ) =>
    await apiRequest<{ message: string; data: SalesOrder }>(`${base}/ozon/review-queue/${id}/create-order`, {
      workspaceId,
      method: 'POST',
      body: payload,
    }),
  getOzonPdfStatus: async (workspaceId: string) =>
    await apiRequest<{ data: { ready: boolean; requires_live_session: boolean; message: string } }>(`${base}/ozon/pdf-status`, {
      workspaceId,
    }),
  importOzonPreview: async (workspaceId: string, csvContent: string) =>
    await apiRequest<OzonImportPreviewResponse>(`${base}/ozon/import-preview`, {
      workspaceId,
      method: 'POST',
      body: { csv_content: csvContent },
    }),
  importOzonExecute: async (workspaceId: string, rows: OzonImportRow[]) =>
    await apiRequest<OzonImportExecuteResponse>(`${base}/ozon/import-execute`, {
      workspaceId,
      method: 'POST',
      body: { rows },
    }),
};
