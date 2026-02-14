import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { router, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
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
    ({ item, index }: { item: OrderListItem; index: number }) => (
      <OrderCard
        order={item}
        isFirst={index === 0}
        isLast={index === filteredOrders.length - 1}
      />
    ),
    [filteredOrders.length]
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
        <Ionicons name="cube-outline" size={48} color={colors.textTertiary} />
        <Text style={styles.emptyTitle}>No hay pedidos</Text>
        <Text style={styles.emptySubtitle}>
          {debouncedSearch || statusFilter !== 'all' || dateFilter !== 'all'
            ? 'Intenta cambiar los filtros'
            : 'Los pedidos aparecerán aquí'}
        </Text>
      </View>
    );
  };

  const renderListHeader = () => (
    <View>
      {/* Status filter button */}
      <View style={styles.filterRow}>
        <FilterChips chips={dateChips} selected={dateFilter} onSelect={setDateFilter} />
      </View>
      <View style={styles.statusFilterRow}>
        <TouchableOpacity
          style={[
            styles.filterButton,
            statusFilter !== 'all' && styles.filterButtonActive,
          ]}
          onPress={() => setShowStatusSheet(true)}
          activeOpacity={0.7}
        >
          <Ionicons
            name="funnel-outline"
            size={16}
            color={statusFilter !== 'all' ? colors.primary : colors.textSecondary}
          />
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
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Native header configuration */}
      <Stack.Screen
        options={{
          headerRight: () => (
            <TouchableOpacity
              onPress={() => router.push('/(authenticated)/(tabs)/ordenes/nueva')}
              hitSlop={8}
            >
              <Ionicons name="add" size={28} color={colors.primary} />
            </TouchableOpacity>
          ),
          headerSearchBarOptions: {
            placeholder: 'Buscar pedido, cliente...',
            hideWhenScrolling: false,
            onChangeText: (event) => setSearchText(event.nativeEvent.text),
            onCancelButtonPress: () => setSearchText(''),
          },
        }}
      />

      {/* Orders list */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : error ? (
        <View style={styles.emptyState}>
          <Ionicons name="alert-circle" size={48} color={colors.error} />
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
          contentInsetAdjustmentBehavior="automatic"
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={refreshOrders}
              tintColor={colors.primary}
            />
          }
          onEndReached={loadMoreOrders}
          onEndReachedThreshold={0.5}
          ListHeaderComponent={renderListHeader}
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.groupedBackground,
  },
  filterRow: {
    // FilterChips handles its own padding
  },
  statusFilterRow: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 18,
    backgroundColor: colors.primaryLight,
    gap: 6,
  },
  filterButtonActive: {
    backgroundColor: colors.primary,
  },
  filterButtonText: {
    ...typography.subhead,
    color: colors.primary,
    fontWeight: '500',
  },
  filterButtonTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 100,
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
    gap: 8,
  },
  emptyTitle: {
    ...typography.title3,
    color: colors.text,
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
