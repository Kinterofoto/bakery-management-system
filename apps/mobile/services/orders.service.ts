import { apiFetch } from '../lib/api';

// Types matching the FastAPI backend responses

export interface OrderListItem {
  id: string;
  order_number: string | null;
  expected_delivery_date: string | null;
  requested_delivery_date: string | null;
  status: string;
  total: number | null;
  client_id: string | null;
  client_name: string | null;
  branch_id: string | null;
  branch_name: string | null;
  items_count: number;
  created_at: string | null;
  has_pending_missing: boolean;
  source: string | null;
  delivery_percentage: number | null;
}

export interface OrderListResponse {
  orders: OrderListItem[];
  total_count: number;
  page: number;
  limit: number;
  has_more: boolean;
}

export interface OrderItemDetail {
  id: string;
  product_id: string;
  product_name: string | null;
  product_code: string | null;
  quantity_requested: number | null;
  quantity_available: number | null;
  quantity_delivered: number | null;
  unit_price: number | null;
  subtotal: number | null;
}

export interface OrderDetail {
  id: string;
  order_number: string | null;
  expected_delivery_date: string | null;
  requested_delivery_date: string | null;
  status: string;
  total: number | null;
  observations: string | null;
  purchase_order_number: string | null;
  created_at: string | null;
  client_id: string | null;
  client_name: string | null;
  client_phone: string | null;
  client_email: string | null;
  branch_id: string | null;
  branch_name: string | null;
  branch_address: string | null;
  created_by_name: string | null;
  items: OrderItemDetail[];
}

export interface CreateOrderInput {
  client_id: string;
  branch_id?: string;
  expected_delivery_date: string;
  purchase_order_number?: string;
  observations?: string;
  items: {
    product_id: string;
    quantity_requested: number;
    unit_price: number;
  }[];
}

export interface OrderStats {
  today: number;
  tomorrow: number;
  this_week: number;
  by_status: Record<string, number>;
  total: number;
}

export const OrdersService = {
  async getOrders(params: {
    page?: number;
    limit?: number;
    status?: string;
    search?: string;
  } = {}) {
    const searchParams = new URLSearchParams();
    if (params.page) searchParams.set('page', params.page.toString());
    if (params.limit) searchParams.set('limit', params.limit.toString());
    if (params.status) searchParams.set('status', params.status);
    if (params.search) searchParams.set('search', params.search);

    const query = searchParams.toString();
    return apiFetch<OrderListResponse>(`/api/orders/${query ? `?${query}` : ''}`);
  },

  async getOrder(orderId: string) {
    return apiFetch<OrderDetail>(`/api/orders/${orderId}`);
  },

  async getStats() {
    return apiFetch<OrderStats>('/api/orders/stats');
  },

  async createOrder(input: CreateOrderInput) {
    return apiFetch<{ id: string; order_number: string; status: string }>('/api/orders/', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  },

  async transitionOrder(orderId: string, newStatus: string, notes?: string) {
    return apiFetch<{ success: boolean; new_status: string }>(`/api/orders/${orderId}/transition`, {
      method: 'PATCH',
      body: JSON.stringify({ new_status: newStatus, notes }),
    });
  },
};
