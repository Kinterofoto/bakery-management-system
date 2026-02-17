import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { OrderListItem } from '../../services/orders.service';
import { getStatusLabel, getStatusColor } from './StatusProgress';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { formatCurrency, formatDate } from '../../utils/formatters';

interface OrderCardProps {
  order: OrderListItem;
}

export function OrderCard({ order }: OrderCardProps) {
  const statusColor = getStatusColor(order.status);

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
            {order.branch_name || 'Sucursal principal'} • {formatDate(order.expected_delivery_date || '')}
          </Text>
        </View>
        <View style={styles.topRight}>
          <Text style={styles.totalValue}>{formatCurrency(order.total ?? 0)}</Text>
          <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
        </View>
      </View>

      <View style={[styles.badge, { backgroundColor: statusColor + '14' }]}>
        <View style={[styles.badgeDot, { backgroundColor: statusColor }]} />
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
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    gap: 6,
  },
  badgeDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
});
