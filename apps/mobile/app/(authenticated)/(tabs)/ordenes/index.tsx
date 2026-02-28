import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useOrdersStore } from '../../../../stores/orders.store';
import { OrderCard } from '../../../../components/ordenes/OrderCard';
import { FilterChips } from '../../../../components/ordenes/FilterChips';
import { StatusFilterSheet } from '../../../../components/ordenes/StatusFilterSheet';
import { DateRangeSheet } from '../../../../components/ordenes/DateRangeSheet';
import { getStatusLabel } from '../../../../components/ordenes/StatusProgress';
import { UberSearchBar } from '../../../../components/UberSearchBar';
import { colors } from '../../../../theme/colors';
import { typography } from '../../../../theme/typography';
import { toLocalISODate, getTomorrowLocalDate, formatDate } from '../../../../utils/formatters';
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
  } = useOrdersStore();

  const [searchText, setSearchText] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [dateFilter, setDateFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showStatusSheet, setShowStatusSheet] = useState(false);
  const [showDateRange, setShowDateRange] = useState(false);
  const [dateRangeFrom, setDateRangeFrom] = useState<Date | null>(null);
  const [dateRangeTo, setDateRangeTo] = useState<Date | null>(null);
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
      { key: 'range', label: dateRangeFrom ? `${formatDate(toLocalISODate(dateRangeFrom), 'dd MMM')} - ${formatDate(toLocalISODate(dateRangeTo!), 'dd MMM')}` : 'Rango' },
    ];
  }, [orders, totalCount, dateRangeFrom, dateRangeTo]);

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
      if (dateFilter === 'range' && dateRangeFrom && dateRangeTo) {
        const d = order.expected_delivery_date;
        if (!d) return false;
        return d >= toLocalISODate(dateRangeFrom) && d <= toLocalISODate(dateRangeTo);
      }

      return true;
    });
  }, [orders, debouncedSearch, statusFilter, dateFilter, dateRangeFrom, dateRangeTo]);

  const handleDateChipSelect = useCallback((key: string) => {
    if (key === 'range') {
      setShowDateRange(true);
    } else {
      setDateFilter(key);
      setDateRangeFrom(null);
      setDateRangeTo(null);
    }
  }, []);

  const renderItem = useCallback(
    ({ item }: { item: OrderListItem }) => <OrderCard order={item} />,
    []
  );

  const renderFooter = () => {
    if (!isLoadingMore) return <View style={{ height: 40 }} />;
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
        <Ionicons name="receipt-outline" size={80} color={colors.primaryLight} />
        <Text style={styles.emptyTitle}>Sin pedidos</Text>
        <Text style={styles.emptySubtitle}>
          {debouncedSearch || statusFilter !== 'all' || dateFilter !== 'all'
            ? 'Intenta ajustar tus filtros de búsqueda.'
            : 'Tus pedidos de panadería aparecerán aquí.'}
        </Text>
        <TouchableOpacity
          style={styles.emptyButton}
          onPress={() => router.push('/(authenticated)/(tabs)/ordenes/nueva')}
        >
          <Text style={styles.emptyButtonText}>Crear primer pedido</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        {/* Simple Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Actividad</Text>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => router.push('/(authenticated)/(tabs)/ordenes/nueva')}
            activeOpacity={0.7}
          >
            <Ionicons name="add" size={28} color={colors.text} />
          </TouchableOpacity>
        </View>

        {/* Uber Style Search */}
        <UberSearchBar
          value={searchText}
          onChangeText={setSearchText}
          placeholder="¿Qué pedido buscas?"
        />

        {/* Quick Filters */}
        <View style={styles.filtersSection}>
          <FilterChips chips={dateChips} selected={dateFilter} onSelect={handleDateChipSelect} />
          <TouchableOpacity
            style={styles.statusFilterToggle}
            onPress={() => setShowStatusSheet(true)}
          >
            <Ionicons name="options-outline" size={20} color={colors.text} />
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      {/* Orders list */}
      {isLoading && !isRefreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : error ? (
        <View style={styles.emptyState}>
          <Ionicons name="alert-circle-outline" size={64} color={colors.error} />
          <Text style={styles.emptyTitle}>Ha ocurrido un error</Text>
          <Text style={styles.emptySubtitle}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchOrders}>
            <Text style={styles.retryText}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={filteredOrders}
          renderItem={renderItem}
          keyExtractor={(item, index) => `${item.id}-${index}`}
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
        />
      )}

      {/* Status filter bottom sheet */}
      <StatusFilterSheet
        visible={showStatusSheet}
        onClose={() => setShowStatusSheet(false)}
        selected={statusFilter}
        onSelect={setStatusFilter}
      />

      {/* Date range bottom sheet */}
      <DateRangeSheet
        visible={showDateRange}
        onClose={() => setShowDateRange(false)}
        initialFrom={dateRangeFrom ?? undefined}
        initialTo={dateRangeTo ?? undefined}
        onApply={(from, to) => {
          setDateRangeFrom(from);
          setDateRangeTo(to);
          setDateFilter('range');
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  safeArea: {
    backgroundColor: colors.background,
    zIndex: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 4,
  },
  headerTitle: {
    ...typography.largeTitle,
    fontSize: 28,
    fontWeight: '800',
    color: colors.text,
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filtersSection: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 4,
  },
  statusFilterToggle: {
    paddingRight: 16,
    paddingLeft: 4,
    justifyContent: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    paddingTop: 4,
    paddingBottom: 40,
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
    marginTop: 40,
  },
  emptyTitle: {
    ...typography.title2,
    fontWeight: '800',
    marginTop: 20,
    marginBottom: 8,
  },
  emptySubtitle: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
  },
  emptyButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 30,
  },
  emptyButtonText: {
    ...typography.headline,
    color: '#FFFFFF',
    fontSize: 16,
  },
  retryButton: {
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  retryText: {
    ...typography.subhead,
    fontWeight: '700',
    color: colors.primary,
  },
});
