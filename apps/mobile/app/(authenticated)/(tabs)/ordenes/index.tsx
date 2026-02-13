import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useOrdersStore } from '../../../../stores/orders.store';
import { OrderCard } from '../../../../components/ordenes/OrderCard';
import { FilterChips } from '../../../../components/ordenes/FilterChips';
import { StatusFilterSheet } from '../../../../components/ordenes/StatusFilterSheet';
import { getStatusLabel } from '../../../../components/ordenes/StatusProgress';
import { colors } from '../../../../theme/colors';
import { typography } from '../../../../theme/typography';
import { toLocalISODate, getTomorrowLocalDate } from '../../../../utils/formatters';
import { OrderListItem } from '../../../../services/orders.service';

export default function OrdenesScreen() {
  const {
    orders,
    totalCount,
    isLoading,
    isRefreshing,
    isLoadingMore,
    error,
    fetchOrders,
    refreshOrders,
    loadMoreOrders,
    fetchStats,
    stats,
  } = useOrdersStore();

  const [searchText, setSearchText] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [dateFilter, setDateFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showStatusSheet, setShowStatusSheet] = useState(false);
  const searchTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    fetchOrders();
    fetchStats();
  }, []);

  // Debounce search
  useEffect(() => {
    searchTimer.current = setTimeout(() => {
      setDebouncedSearch(searchText);
    }, 300);
    return () => clearTimeout(searchTimer.current);
  }, [searchText]);

  // Date filter chips
  const dateChips = useMemo(() => {
    const today = toLocalISODate();
    const tomorrow = getTomorrowLocalDate();

    const todayCount = orders.filter((o) => o.expected_delivery_date === today).length;
    const tomorrowCount = orders.filter((o) => o.expected_delivery_date === tomorrow).length;

    return [
      { key: 'all', label: 'Todos', count: totalCount },
      { key: 'today', label: 'Hoy', count: todayCount },
      { key: 'tomorrow', label: 'Mañana', count: tomorrowCount },
    ];
  }, [orders, totalCount]);

  // Filtered orders
  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      // Search
      if (debouncedSearch) {
        const q = debouncedSearch.toLowerCase();
        const matchesSearch =
          order.order_number?.toLowerCase().includes(q) ||
          order.client_name?.toLowerCase().includes(q) ||
          order.branch_name?.toLowerCase().includes(q) ||
          order.id.toLowerCase().includes(q);
        if (!matchesSearch) return false;
      }

      // Status
      if (statusFilter !== 'all' && order.status !== statusFilter) return false;

      // Date
      if (dateFilter === 'today') {
        return order.expected_delivery_date === toLocalISODate();
      }
      if (dateFilter === 'tomorrow') {
        return order.expected_delivery_date === getTomorrowLocalDate();
      }

      return true;
    });
  }, [orders, debouncedSearch, statusFilter, dateFilter]);

  const renderItem = useCallback(
    ({ item }: { item: OrderListItem }) => <OrderCard order={item} />,
    []
  );

  const renderFooter = () => {
    if (!isLoadingMore) return <View style={{ height: 20 }} />;
    return (
      <View style={styles.footer}>
        <ActivityIndicator size="small" color={colors.primary} />
      </View>
    );
  };

  const renderEmpty = () => {
    if (isLoading) return null;
    return (
      <View style={styles.emptyState}>
        <Text style={styles.emptyIcon}>📦</Text>
        <Text style={styles.emptyTitle}>No hay pedidos</Text>
        <Text style={styles.emptySubtitle}>
          {debouncedSearch || statusFilter !== 'all' || dateFilter !== 'all'
            ? 'Intenta cambiar los filtros'
            : 'Los pedidos aparecerán aquí'}
        </Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Pedidos</Text>
        <TouchableOpacity
          style={styles.newButton}
          onPress={() => router.push('/(authenticated)/(tabs)/ordenes/nueva')}
          activeOpacity={0.8}
        >
          <Text style={styles.newButtonText}>+ Nuevo</Text>
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            value={searchText}
            onChangeText={setSearchText}
            placeholder="Buscar pedido, cliente..."
            placeholderTextColor={colors.textTertiary}
            clearButtonMode="while-editing"
          />
        </View>
        <TouchableOpacity
          style={[
            styles.filterButton,
            statusFilter !== 'all' && styles.filterButtonActive,
          ]}
          onPress={() => setShowStatusSheet(true)}
          activeOpacity={0.7}
        >
          <Text
            style={[
              styles.filterButtonText,
              statusFilter !== 'all' && styles.filterButtonTextActive,
            ]}
          >
            {statusFilter === 'all' ? 'Estado' : getStatusLabel(statusFilter)}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Date filter chips */}
      <FilterChips chips={dateChips} selected={dateFilter} onSelect={setDateFilter} />

      {/* Orders list */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : error ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>⚠️</Text>
          <Text style={styles.emptyTitle}>Error</Text>
          <Text style={styles.emptySubtitle}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchOrders}>
            <Text style={styles.retryText}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={filteredOrders}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={refreshOrders}
              tintColor={colors.primary}
            />
          }
          onEndReached={loadMoreOrders}
          onEndReachedThreshold={0.5}
          ListFooterComponent={renderFooter}
          ListEmptyComponent={renderEmpty}
          showsVerticalScrollIndicator={false}
          initialNumToRender={15}
          maxToRenderPerBatch={10}
          windowSize={5}
        />
      )}

      {/* Status filter bottom sheet */}
      <StatusFilterSheet
        visible={showStatusSheet}
        onClose={() => setShowStatusSheet(false)}
        selected={statusFilter}
        onSelect={setStatusFilter}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.groupedBackground,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 4,
  },
  headerTitle: {
    ...typography.largeTitle,
    color: colors.text,
  },
  newButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  newButtonText: {
    ...typography.subhead,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  searchContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 8,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 10,
    paddingHorizontal: 10,
    height: 40,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchIcon: {
    fontSize: 14,
    marginRight: 6,
  },
  searchInput: {
    flex: 1,
    ...typography.body,
    color: colors.text,
    paddingVertical: 0,
  },
  filterButton: {
    justifyContent: 'center',
    paddingHorizontal: 14,
    height: 40,
    borderRadius: 10,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterButtonActive: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
  },
  filterButtonText: {
    ...typography.subhead,
    color: colors.textSecondary,
  },
  filterButtonTextActive: {
    color: colors.primary,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    paddingTop: 4,
    paddingBottom: 20,
  },
  footer: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyTitle: {
    ...typography.title3,
    color: colors.text,
    marginBottom: 4,
  },
  emptySubtitle: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 16,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: colors.primary,
  },
  retryText: {
    ...typography.subhead,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
