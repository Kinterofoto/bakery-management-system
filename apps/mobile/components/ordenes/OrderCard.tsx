import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { OrderListItem } from '../../services/orders.service';
import { getStatusLabel, getStatusColor } from './StatusProgress';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { formatCurrency, formatDate } from '../../utils/formatters';

const STATUS_TO_STEP: Record<string, number> = {
  received: 1,
  review_area1: 1,
  review_area2: 1,
  ready_dispatch: 2,
  dispatched: 3,
  in_delivery: 3,
  delivered: 4,
  partially_delivered: 4,
};

interface OrderCardProps {
  order: OrderListItem;
}

export function OrderCard({ order }: OrderCardProps) {
  const statusColor = getStatusColor(order.status);
  const isCancelled = order.status === 'cancelled';
  const currentStep = STATUS_TO_STEP[order.status] ?? 1;

  return (
    <TouchableOpacity
      style={styles.container}
      activeOpacity={0.7}
      onPress={() => router.push(`/(authenticated)/(tabs)/ordenes/${order.id}`)}
    >
      <View style={styles.topRow}>
        <View style={styles.topLeft}>
          <Text style={styles.clientName} numberOfLines={1}>
            {order.client_name}
          </Text>
          <Text style={styles.meta} numberOfLines={1}>
            #{order.order_number || order.id?.slice(0, 6)} • {order.branch_name || 'Sucursal principal'} • {formatDate(order.expected_delivery_date || '')}
          </Text>
        </View>
        <View style={styles.topRight}>
          <Text style={styles.totalValue}>{formatCurrency(order.total ?? 0)}</Text>
          <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
        </View>
      </View>

      {!isCancelled && (
        <View style={styles.bars}>
          {[1, 2, 3, 4].map((step) => (
            <View
              key={step}
              style={[styles.bar, currentStep >= step ? styles.barActive : styles.barInactive]}
            />
          ))}
        </View>
      )}

      <View style={[styles.badge, { backgroundColor: statusColor + '14' }]}>
        <Text style={[styles.badgeText, { color: statusColor }]}>
          {getStatusLabel(order.status)}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.card,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: 10,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  topLeft: {
    flex: 1,
    gap: 2,
  },
  topRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexShrink: 0,
  },
  clientName: {
    ...typography.headline,
    color: colors.text,
    fontWeight: '700',
  },
  meta: {
    ...typography.caption1,
    color: colors.textTertiary,
  },
  totalValue: {
    ...typography.subhead,
    color: colors.text,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  bars: {
    flexDirection: 'row',
    gap: 3,
  },
  bar: {
    flex: 1,
    height: 4,
    borderRadius: 2,
  },
  barActive: {
    backgroundColor: '#000000',
  },
  barInactive: {
    backgroundColor: '#EEEEEE',
  },
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
});
