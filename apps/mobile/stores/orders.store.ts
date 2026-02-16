import { create } from 'zustand';
import { OrdersService, OrderListItem, OrderStats } from '../services/orders.service';

interface OrdersState {
  orders: OrderListItem[];
  totalCount: number;
  currentPage: number;
  stats: OrderStats | null;
  isLoading: boolean;
  isRefreshing: boolean;
  isLoadingMore: boolean;
  error: string | null;

  fetchOrders: () => Promise<void>;
  refreshOrders: () => Promise<void>;
  loadMoreOrders: () => Promise<void>;
  fetchStats: () => Promise<void>;
}

const ORDERS_PER_PAGE = 50;

export const useOrdersStore = create<OrdersState>((set, get) => ({
  orders: [],
  totalCount: 0,
  currentPage: 1,
  stats: null,
  isLoading: true,
  isRefreshing: false,
  isLoadingMore: false,
  error: null,

  fetchOrders: async () => {
    set({ isLoading: true, error: null, currentPage: 1 });
    const result = await OrdersService.getOrders({ limit: ORDERS_PER_PAGE, page: 1 });
    if (result.error) {
      set({ error: result.error, isLoading: false });
    } else if (result.data) {
      set({
        orders: result.data.orders,
        totalCount: result.data.total_count,
        isLoading: false,
      });
    }
  },

  refreshOrders: async () => {
    set({ isRefreshing: true, currentPage: 1 });
    const [ordersResult, statsResult] = await Promise.all([
      OrdersService.getOrders({ limit: ORDERS_PER_PAGE, page: 1 }),
      OrdersService.getStats(),
    ]);
    if (ordersResult.data) {
      set({
        orders: ordersResult.data.orders,
        totalCount: ordersResult.data.total_count,
      });
    }
    if (statsResult.data) {
      set({ stats: statsResult.data });
    }
    set({ isRefreshing: false });
  },

  loadMoreOrders: async () => {
    const { isLoadingMore, currentPage, orders, totalCount } = get();
    if (isLoadingMore || orders.length >= totalCount) return;

    const nextPage = currentPage + 1;
    set({ isLoadingMore: true });

    const result = await OrdersService.getOrders({ limit: ORDERS_PER_PAGE, page: nextPage });
    if (result.data && result.data.orders.length > 0) {
      set((state) => ({
        orders: [...state.orders, ...result.data!.orders],
        currentPage: nextPage,
      }));
    }
    set({ isLoadingMore: false });
  },

  fetchStats: async () => {
    const result = await OrdersService.getStats();
    if (result.data) {
      set({ stats: result.data });
    }
  },
}));
