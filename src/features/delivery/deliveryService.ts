import { apiRequest, type ApiCollection } from '../api/apiClient';

export interface DeliveryConnection {
  id: string;
  provider_key: string;
  status: string;
  has_credentials: boolean;
  supports_connection_test: boolean;
  supports_shipment_creation: boolean;
  supports_tracking: boolean;
  last_tested_at: string | null;
  last_error: string | null;
  created_at: string | null;
}

export interface DeliveryStatusHistory {
  status: string;
  raw_status: string | null;
  occurred_at: string | null;
  source: string;
}

export interface DeliveryShipment {
  id: string;
  provider_connection_id: string | null;
  provider_key: string;
  sales_order_id: string | null;
  order_reference: string | null;
  tracking_number: string | null;
  status: string;
  raw_status: string | null;
  delivery_fee: string;
  cod_amount: string;
  cod_collected: boolean;
  status_updated_at: string | null;
  last_error: string | null;
  source_type?: string;
  is_live_confirmed?: boolean;
  status_history: DeliveryStatusHistory[];
}

export interface OzonConnectionStatus {
  success: boolean;
  connection_status: 'connected' | 'simulation' | 'not_connected';
  verified_data_source: string;
  test_timestamp: string;
  tracking_number: string | null;
  ozon_status_returned: string | null;
  error_message: string | null;
}

export interface OzonDashboardSummary {
  total_ozon_parcels: number;
  new_parcels: number;
  pickup_ramassage: number;
  in_transit: number;
  out_for_delivery: number;
  delivered: number;
  returned_refused: number;
  delivered_and_invoiced: string;
  delivered_and_not_invoiced: string;
  total_cod: number;
  actual_delivery_fees: number;
  additional_fees: number | string;
  expected_net_remittances: number;
  confirmed_remittances: string;
  last_sync_at: string | null;
  is_dry_run: boolean;
  connection_status: string;
  private_couriers_excluded: string[];
}

export interface OzonParcelItem {
  id: string;
  tracking_number: string | null;
  order_reference: string | null;
  status: string;
  raw_status: string;
  recipient_name: string;
  recipient_phone: string;
  destination_city: string;
  destination_address?: string;
  creation_date: string | null;
  cod_amount: number;
  delivery_fee: number;
  additional_fees: string | number;
  return_or_refusal_fee: string | number;
  invoice_status: string;
  collected_amount: string | number;
  remittance_status: string;
  source_label: string;
  is_return?: boolean;
  last_updated_at: string | null;
  history: DeliveryStatusHistory[];
}

export interface OzonDashboardData {
  summary: OzonDashboardSummary;
  parcels: OzonParcelItem[];
}

export interface OzonProbeResult {
  success: boolean;
  probe_type: string;
  tracking_number: string | null;
  raw_response: unknown;
  normalized_status?: string;
  is_dry_run: boolean;
  verified_at: string;
  note: string;
  error?: string;
}

const base = '/api/delivery';

export const deliveryService = {
  async connections(workspaceId: string): Promise<DeliveryConnection[]> {
    const response = await apiRequest<{ data: DeliveryConnection[] }>(`${base}/connections`, { workspaceId });
    return response.data;
  },
  async shipments(workspaceId: string): Promise<ApiCollection<DeliveryShipment>> {
    return apiRequest<ApiCollection<DeliveryShipment>>(`${base}/shipments`, { workspaceId });
  },
  async saveConnection(workspaceId: string, providerKey: string, credentials: Record<string, string>): Promise<DeliveryConnection> {
    const response = await apiRequest<{ data: DeliveryConnection }>(`${base}/connections`, {
      workspaceId,
      method: 'POST',
      body: { provider_key: providerKey, credentials },
    });
    return response.data;
  },
  async testConnection(workspaceId: string, id: string): Promise<{ data: DeliveryConnection; verification?: OzonConnectionStatus }> {
    return apiRequest<{ data: DeliveryConnection; verification?: OzonConnectionStatus }>(`${base}/connections/${encodeURIComponent(id)}/test`, {
      workspaceId,
      method: 'POST',
    });
  },
  async ozonStatus(workspaceId: string): Promise<OzonConnectionStatus> {
    const response = await apiRequest<{ data: OzonConnectionStatus }>('/api/sales/ozon/connection-status', { workspaceId });
    return response.data;
  },
  async disconnect(workspaceId: string, id: string): Promise<void> {
    await apiRequest<void>(`${base}/connections/${encodeURIComponent(id)}`, {
      workspaceId,
      method: 'DELETE',
    });
  },
  async refreshShipment(workspaceId: string, id: string): Promise<DeliveryShipment> {
    const response = await apiRequest<{ data: DeliveryShipment }>(`${base}/shipments/${encodeURIComponent(id)}/refresh`, {
      workspaceId,
      method: 'POST',
    });
    return response.data;
  },
  async getOzonDashboard(workspaceId: string): Promise<OzonDashboardData> {
    return apiRequest<OzonDashboardData>(`${base}/ozon/dashboard`, { workspaceId });
  },
  async probeOzon(workspaceId: string, trackingNumber?: string): Promise<OzonProbeResult> {
    return apiRequest<OzonProbeResult>(`${base}/ozon/probe`, {
      workspaceId,
      method: 'POST',
      body: { tracking_number: trackingNumber },
    });
  },
  async importOzonCsv(workspaceId: string, csvContent: string): Promise<{ success: boolean; message: string; imported_count: number; updated_count: number }> {
    return apiRequest<{ success: boolean; message: string; imported_count: number; updated_count: number }>(`${base}/ozon/import`, {
      workspaceId,
      method: 'POST',
      body: { csv_content: csvContent },
    });
  },
};

