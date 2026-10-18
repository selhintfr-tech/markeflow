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
  status_history: DeliveryStatusHistory[];
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
  async testConnection(workspaceId: string, id: string): Promise<DeliveryConnection> {
    const response = await apiRequest<{ data: DeliveryConnection }>(`${base}/connections/${encodeURIComponent(id)}/test`, {
      workspaceId,
      method: 'POST',
    });
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
};
