import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { OrderListItem } from '../../services/orders.service';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { formatCurrency, formatDate } from '../../utils/formatters';

interface OrderCardProps {
  order: OrderListItem;
}

export function OrderCard({ order }: OrderCardProps) {
  const deliveryPercentage = order.delivery_percentage ?? 0;
  const isDelivered = ['delivered', 'partially_delivered'].includes(order.status);

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'delivered': return { label: 'Entregado', color: colors.success };
      case 'dispatched': return { label: 'En camino', color: colors.statusDispatched };
      case 'ready': return { label: 'Listo', color: colors.statusReady };
      case 'review': return { label: 'En revisión', color: colors.statusReview };
      case 'cancelled': return { label: 'Cancelado', color: colors.error };
      default: return { label: 'Recibido', color: colors.textTertiary };
    }
  };

  const statusCfg = getStatusConfig(order.status);

  return (
    <TouchableOpacity
      style={styles.container}
      activeOpacity={0.7}
      onPress={() => router.push(`/(authenticated)/(tabs)/ordenes/${order.id}`)}
    >
      <View style={styles.leftCol}>
        <View style={styles.iconContainer}>
          <Ionicons name="receipt" size={24} color={colors.text} />
        </View>
      </View>

      <View style={styles.midCol}>
        <Text style={styles.clientName} numberOfLines={1}>
          {order.client_name}
        </Text>
        <Text style={styles.branchName} numberOfLines={1}>
          {order.branch_name || 'Sucursal principal'} • {order.order_number || order.id?.slice(0, 6)}
        </Text>
        <View style={styles.statusRow}>
          <View style={[styles.statusDot, { backgroundColor: statusCfg.color }]} />
          <Text style={[styles.statusText, { color: statusCfg.color }]}>
            {statusCfg.label}
          </Text>
          <Text style={styles.dateText}> • {formatDate(order.expected_delivery_date || '')}</Text>
        </View>
      </View>

      <View style={styles.rightCol}>
        <Text style={styles.totalValue}>
          {formatCurrency(order.total ?? 0)}
        </Text>
        <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} style={{ marginTop: 4 }} />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    alignItems: 'center',
  },
  leftCol: {
    marginRight: 16,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  midCol: {
    flex: 1,
    gap: 2,
  },
  clientName: {
    ...typography.headline,
    color: colors.text,
    fontSize: 18,
    fontWeight: '700',
  },
  branchName: {
    ...typography.subhead,
    color: colors.textSecondary,
    fontSize: 14,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusText: {
    ...typography.caption1,
    fontWeight: '600',
    fontSize: 12,
  },
  dateText: {
    ...typography.caption1,
    color: colors.textTertiary,
    fontSize: 12,
  },
  rightCol: {
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  totalValue: {
    ...typography.headline,
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
});
