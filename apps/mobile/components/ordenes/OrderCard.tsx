import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { OrderListItem } from '../../services/orders.service';
import { StatusProgress } from './StatusProgress';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { formatCurrency, formatDate } from '../../utils/formatters';

interface OrderCardProps {
  order: OrderListItem;
}

export function OrderCard({ order }: OrderCardProps) {
  const deliveryPercentage = order.delivery_percentage ?? 0;
  const isDelivered = ['delivered', 'partially_delivered'].includes(order.status);
  const hasDateMismatch =
    order.requested_delivery_date &&
    order.requested_delivery_date !== order.expected_delivery_date;

  return (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.7}
      onPress={() => router.push(`/(authenticated)/(tabs)/ordenes/${order.id}`)}
    >
      {/* Top row: order number + client + total */}
      <View style={styles.topRow}>
        <View style={styles.topLeft}>
          <View style={styles.orderNumberBadge}>
            <Text style={styles.orderNumberText}>
              #{order.order_number || order.id?.slice(0, 8)}
            </Text>
          </View>
          <View style={styles.clientInfo}>
            <Text style={styles.clientName} numberOfLines={1}>
              {order.client_name}
            </Text>
            {order.branch_name && (
              <Text style={styles.branchName} numberOfLines={1}>
                {order.branch_name}
              </Text>
            )}
          </View>
        </View>

        <View style={styles.topRight}>
          <Text style={styles.totalValue}>
            {formatCurrency(order.total ?? 0)}
          </Text>
          <View style={styles.dateRow}>
            {hasDateMismatch && <Text style={styles.warningIcon}>⚠️</Text>}
            <Text style={styles.dateText}>
              {order.expected_delivery_date
                ? formatDate(order.expected_delivery_date)
                : '—'}
            </Text>
          </View>
        </View>
      </View>

      {/* Bottom row: progress + delivery circle */}
      <View style={styles.bottomRow}>
        <StatusProgress status={order.status} compact />

        {isDelivered && (
          <View style={styles.deliveryCircle}>
            <Text
              style={[
                styles.deliveryText,
                {
                  color:
                    deliveryPercentage === 100
                      ? colors.success
                      : deliveryPercentage === 0
                      ? colors.error
                      : colors.warning,
                },
              ]}
            >
              {deliveryPercentage}%
            </Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 14,
    marginHorizontal: 16,
    marginVertical: 4,
    gap: 10,
    // iOS shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    // Android shadow
    elevation: 2,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  topLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 8,
    marginRight: 12,
  },
  orderNumberBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  orderNumberText: {
    ...typography.caption1,
    fontWeight: '600',
    color: '#15803D',
  },
  clientInfo: {
    flex: 1,
  },
  clientName: {
    ...typography.subhead,
    fontWeight: '600',
    color: colors.text,
  },
  branchName: {
    ...typography.caption1,
    color: colors.textSecondary,
    marginTop: 1,
  },
  topRight: {
    alignItems: 'flex-end',
  },
  totalValue: {
    ...typography.subhead,
    fontWeight: '600',
    color: colors.success,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 2,
  },
  warningIcon: {
    fontSize: 10,
  },
  dateText: {
    ...typography.caption1,
    color: colors.textSecondary,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  deliveryCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2.5,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deliveryText: {
    fontSize: 10,
    fontWeight: '700',
  },
});
