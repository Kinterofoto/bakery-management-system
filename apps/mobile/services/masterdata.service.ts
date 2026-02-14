import { apiFetch } from '../lib/api';

export interface Client {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  nit: string | null;
  is_active: boolean;
}

export interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number | null;
  weight: number | null;
  category: string | null;
  presentation?: string | null;
  is_active: boolean;
}

export interface Branch {
  id: string;
  name: string;
  address: string | null;
  client_id: string;
}

export interface ClientFrequency {
  id: string;
  client_id: string;
  branch_id: string;
  day_of_week: number;
  is_active: boolean;
}

export interface ProductConfig {
  id: string;
  product_id: string;
  config_type: string;
  config_value: string | null;
  units_per_package?: number;
}

export const MasterDataService = {
  async getClients() {
    const result = await apiFetch<{ clients: Client[] }>('/api/masterdata/clients');
    return { data: result.data?.clients ?? null, error: result.error };
  },

  async getProducts(params?: { activeOnly?: boolean; category?: string }) {
    const searchParams = new URLSearchParams();
    if (params?.activeOnly !== undefined) searchParams.set('active_only', params.activeOnly.toString());
    if (params?.category) searchParams.set('category', params.category);
    const query = searchParams.toString();
    const result = await apiFetch<{ products: Product[] }>(`/api/masterdata/products${query ? `?${query}` : ''}`);
    return { data: result.data?.products ?? null, error: result.error };
  },

  async getFinishedProducts() {
    return this.getProducts({ activeOnly: true, category: 'PT,PP' });
  },

  async getBranches() {
    const result = await apiFetch<{ branches: Branch[] }>('/api/masterdata/branches');
    return { data: result.data?.branches ?? null, error: result.error };
  },

  async getClientFrequencies() {
    const result = await apiFetch<{ frequencies: ClientFrequency[] }>('/api/masterdata/client-frequencies');
    return { data: result.data?.frequencies ?? null, error: result.error };
  },

  async getProductConfigs() {
    const result = await apiFetch<{ configs: ProductConfig[] }>('/api/masterdata/product-configs');
    return { data: result.data?.configs ?? null, error: result.error };
  },
};
