import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
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

const TOTAL_STEPS = 4;

interface OrderCardProps {
  order: OrderListItem;
}

export function OrderCard({ order }: OrderCardProps) {
  const statusColor = getStatusColor(order.status);
  const isCancelled = order.status === 'cancelled';
  const currentStep = STATUS_TO_STEP[order.status] ?? 1;

  const sourceIcon = order.source?.toLowerCase().includes('whatsapp')
    ? 'logo-whatsapp'
    : order.source?.toLowerCase().includes('email') || order.source?.toLowerCase().includes('correo')
      ? 'mail-outline'
      : null;

  return (
    <TouchableOpacity
      style={styles.container}
      activeOpacity={0.7}
      onPress={() => router.push(`/(authenticated)/(tabs)/ordenes/${order.id}`)}
    >
      {/* Section 1 — Status header */}
      <View style={styles.headerRow}>
        <View style={styles.statusLeft}>
          <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
          <Text style={[styles.statusLabel, { color: statusColor }]}>
            {getStatusLabel(order.status)}
          </Text>
        </View>
        <View style={styles.headerRight}>
          <Text style={styles.totalValue}>{formatCurrency(order.total ?? 0)}</Text>
          <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
        </View>
      </View>

      {/* Section 2 — Client identity */}
      <View style={styles.identitySection}>
        <Text style={styles.clientName} numberOfLines={1}>
          {order.client_name}
        </Text>
        <Text style={styles.branchName} numberOfLines={1}>
          {order.branch_name || 'Sucursal principal'}
        </Text>
      </View>

      {/* Section 3 — Metadata with icons */}
      <View style={styles.metaRow}>
        <View style={styles.metaItem}>
          <Ionicons name="calendar-outline" size={14} color={colors.textSecondary} />
          <Text style={styles.metaText}>
            {order.expected_delivery_date ? formatDate(order.expected_delivery_date) : '—'}
          </Text>
        </View>
        <View style={styles.metaItem}>
          <Ionicons name="cube-outline" size={14} color={colors.textSecondary} />
          <Text style={styles.metaText}>{order.items_count} items</Text>
        </View>
        {sourceIcon && order.source && (
          <View style={styles.metaItem}>
            <Ionicons name={sourceIcon as any} size={14} color={colors.textSecondary} />
            <Text style={styles.metaText}>{order.source}</Text>
          </View>
        )}
      </View>

      {/* Section 4 — Progress bar or cancelled badge */}
      {isCancelled ? (
        <View style={styles.cancelledBadge}>
          <Text style={styles.cancelledText}>CANCELADO</Text>
        </View>
      ) : (
        <View style={styles.progressRow}>
          <View style={styles.progressBars}>
            {Array.from({ length: TOTAL_STEPS }, (_, i) => (
              <View
                key={i}
                style={[
                  styles.progressSegment,
                  currentStep >= i + 1
                    ? { backgroundColor: statusColor }
                    : styles.progressInactive,
                ]}
              />
            ))}
          </View>
          <Text style={styles.progressFraction}>
            {currentStep}/{TOTAL_STEPS}
          </Text>
        </View>
      )}

      {/* Section 5 — Missing items alert */}
      {order.has_pending_missing && (
        <View style={styles.alertRow}>
          <Ionicons name="alert-circle" size={16} color={colors.warning} />
          <Text style={styles.alertText}>Tiene faltantes pendientes</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.card,
    borderRadius: 14,
    marginHorizontal: 16,
    marginTop: 12,
    padding: 16,
    gap: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },

  // Section 1 — Header
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statusLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusLabel: {
    ...typography.caption1,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  totalValue: {
    ...typography.headline,
    fontWeight: '700',
    color: colors.text,
    fontVariant: ['tabular-nums'],
  },

  // Section 2 — Identity
  identitySection: {
    gap: 2,
  },
  clientName: {
    ...typography.headline,
    fontWeight: '800',
    color: colors.text,
    fontSize: 18,
  },
  branchName: {
    ...typography.caption1,
    color: colors.textSecondary,
  },

  // Section 3 — Metadata
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    ...typography.caption1,
    color: colors.textSecondary,
  },

  // Section 4 — Progress
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  progressBars: {
    flex: 1,
    flexDirection: 'row',
    gap: 3,
  },
  progressSegment: {
    flex: 1,
    height: 6,
    borderRadius: 3,
  },
  progressInactive: {
    backgroundColor: colors.primaryLight,
  },
  progressFraction: {
    ...typography.caption1,
    color: colors.textTertiary,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  cancelledBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#E1190014',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
  },
  cancelledText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.error,
    letterSpacing: 0.5,
  },

  // Section 5 — Alert
  alertRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFC04314',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  alertText: {
    ...typography.caption1,
    color: '#B8860B',
    fontWeight: '600',
  },
});
