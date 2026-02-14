import { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Linking,
} from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { OrdersService, OrderDetail } from '../../../../services/orders.service';
import { StatusProgress, getStatusLabel, getStatusColor } from '../../../../components/ordenes/StatusProgress';
import { colors } from '../../../../theme/colors';
import { typography } from '../../../../theme/typography';
import { formatDate, formatDateLong, formatFullCurrency } from '../../../../utils/formatters';

export default function OrderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadOrder();
  }, [id]);

  const loadOrder = async () => {
    if (!id) return;
    setIsLoading(true);
    setError(null);

    const result = await OrdersService.getOrder(id);
    if (result.error) {
      setError(result.error);
    } else if (result.data) {
      setOrder(result.data);
    }
    setIsLoading(false);
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Stack.Screen options={{ title: 'Cargando...' }} />
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (error || !order) {
    return (
      <View style={styles.errorContainer}>
        <Stack.Screen options={{ title: 'Error' }} />
        <Ionicons name="alert-circle" size={48} color={colors.error} />
        <Text style={styles.errorText}>{error || 'No se encontró el pedido'}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={loadOrder}>
          <Text style={styles.retryText}>Reintentar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const statusColor = getStatusColor(order.status);
  const total = order.total ?? 0;

  return (
    <>
      <Stack.Screen
        options={{
          title: `Pedido #${order.order_number || order.id.slice(0, 8)}`,
          headerBackTitle: 'Pedidos',
        }}
      />
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {/* Status Card */}
        <View style={styles.section}>
          <View style={styles.statusHeader}>
            <View style={[styles.statusBadge, { backgroundColor: statusColor + '20' }]}>
              <Text style={[styles.statusBadgeText, { color: statusColor }]}>
                {getStatusLabel(order.status)}
              </Text>
            </View>
            {order.created_at && (
              <Text style={styles.createdDate}>
                Creado {formatDate(order.created_at, "dd MMM yyyy 'a las' HH:mm")}
              </Text>
            )}
          </View>
          <View style={styles.progressContainer}>
            <StatusProgress status={order.status} />
          </View>
        </View>

        {/* Client & Delivery Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Información</Text>

          <InfoRow label="Cliente" value={order.client_name || '—'} />
          {order.branch_name && <InfoRow label="Sucursal" value={order.branch_name} />}
          {order.branch_address && <InfoRow label="Dirección" value={order.branch_address} />}
          <InfoRow
            label="Entrega"
            value={
              order.expected_delivery_date
                ? formatDateLong(order.expected_delivery_date)
                : '—'
            }
          />
          {order.purchase_order_number && (
            <InfoRow label="OC" value={order.purchase_order_number} />
          )}
          {order.created_by_name && (
            <InfoRow label="Creado por" value={order.created_by_name} />
          )}
          {order.observations && (
            <InfoRow label="Observaciones" value={order.observations} />
          )}

          {/* Contact actions */}
          <View style={styles.contactRow}>
            {order.client_phone && (
              <TouchableOpacity
                style={styles.contactButton}
                onPress={() => Linking.openURL(`tel:${order.client_phone}`)}
              >
                <Ionicons name="call-outline" size={18} color={colors.primary} />
                <Text style={styles.contactButtonText}>Llamar</Text>
              </TouchableOpacity>
            )}
            {order.client_email && (
              <TouchableOpacity
                style={styles.contactButton}
                onPress={() => Linking.openURL(`mailto:${order.client_email}`)}
              >
                <Ionicons name="mail-outline" size={18} color={colors.primary} />
                <Text style={styles.contactButtonText}>Email</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Order Items */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Productos ({order.items?.length ?? 0})
          </Text>

          {order.items?.map((item) => (
            <View key={item.id} style={styles.itemRow}>
              <View style={styles.itemInfo}>
                <Text style={styles.itemName} numberOfLines={2}>
                  {item.product_name || item.product_id.slice(0, 8)}
                </Text>
                {item.product_code && (
                  <Text style={styles.itemCode}>{item.product_code}</Text>
                )}
              </View>
              <View style={styles.itemNumbers}>
                <Text style={styles.itemQuantity}>
                  {item.quantity_requested ?? 0} und
                </Text>
                <Text style={styles.itemPrice}>
                  ${(item.unit_price ?? 0).toLocaleString()}
                </Text>
                <Text style={styles.itemSubtotal}>
                  {formatFullCurrency(item.subtotal ?? 0)}
                </Text>
              </View>
            </View>
          ))}

          {/* Total */}
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>{formatFullCurrency(total)}</Text>
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.groupedBackground,
  },
  content: {
    paddingTop: 12,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.groupedBackground,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.groupedBackground,
    paddingHorizontal: 40,
    gap: 8,
  },
  errorText: {
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

  // Sections — iOS grouped inset style
  section: {
    backgroundColor: colors.secondarySystemGroupedBackground,
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 10,
    padding: 16,
  },
  sectionTitle: {
    ...typography.headline,
    color: colors.text,
    marginBottom: 12,
  },

  // Status
  statusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 8,
  },
  statusBadgeText: {
    ...typography.subhead,
    fontWeight: '600',
  },
  createdDate: {
    ...typography.caption1,
    color: colors.textSecondary,
  },
  progressContainer: {
    alignItems: 'center',
  },

  // Info
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.separator,
  },
  infoLabel: {
    ...typography.subhead,
    color: colors.textSecondary,
    flex: 1,
  },
  infoValue: {
    ...typography.subhead,
    color: colors.text,
    fontWeight: '500',
    flex: 2,
    textAlign: 'right',
  },
  contactRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  contactButton: {
    flex: 1,
    flexDirection: 'row',
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: colors.tertiarySystemGroupedBackground,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  contactButtonText: {
    ...typography.subhead,
    color: colors.primary,
    fontWeight: '600',
  },

  // Items
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.separator,
    gap: 12,
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    ...typography.subhead,
    color: colors.text,
    fontWeight: '500',
  },
  itemCode: {
    ...typography.caption1,
    color: colors.textTertiary,
    marginTop: 2,
  },
  itemNumbers: {
    alignItems: 'flex-end',
  },
  itemQuantity: {
    ...typography.subhead,
    color: colors.text,
    fontWeight: '600',
  },
  itemPrice: {
    ...typography.caption1,
    color: colors.textSecondary,
    marginTop: 1,
  },
  itemSubtotal: {
    ...typography.subhead,
    color: colors.success,
    fontWeight: '600',
    marginTop: 2,
  },

  // Total
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 16,
    marginTop: 4,
  },
  totalLabel: {
    ...typography.title3,
    color: colors.text,
  },
  totalValue: {
    ...typography.title2,
    color: colors.success,
  },
});
