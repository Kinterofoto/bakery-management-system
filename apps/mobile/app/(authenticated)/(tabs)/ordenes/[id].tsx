import { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Linking,
  Platform,
} from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { OrdersService, OrderDetail } from '../../../../services/orders.service';
import { getStatusLabel, getStatusColor } from '../../../../components/ordenes/StatusProgress';
import { colors } from '../../../../theme/colors';
import { typography } from '../../../../theme/typography';
import { formatDate, formatDateLong, formatFullCurrency, formatCurrency } from '../../../../utils/formatters';

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
        <Stack.Screen options={{ title: '' }} />
        <ActivityIndicator size="large" color="#000" />
      </View>
    );
  }

  if (error || !order) {
    return (
      <View style={styles.errorContainer}>
        <Stack.Screen options={{ title: 'Error' }} />
        <Ionicons name="alert-circle-outline" size={64} color={colors.error} />
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
    <View style={styles.container}>
      <Stack.Screen
        options={{
          headerTitle: '',
          headerTransparent: true,
          headerTintColor: '#000',
          headerBackTitle: 'Atrás',
        }}
      />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <Text style={styles.mainTitle}>Detalles del recibo</Text>

        {/* Top Summary */}
        <View style={styles.summarySection}>
          <View style={styles.summaryContent}>
            <Text style={styles.clientName}>{order.client_name}</Text>
            <Text style={styles.orderNumber}>Pedido #{order.order_number || order.id.slice(0, 8)}</Text>
            <View style={styles.statusRow}>
              <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
              <Text style={[styles.statusText, { color: statusColor }]}>
                {getStatusLabel(order.status)}
              </Text>
            </View>
          </View>
          <View style={styles.iconBox}>
            <Ionicons name="receipt" size={32} color="#000" />
          </View>
        </View>

        <View style={styles.divider} />

        {/* Info Rows */}
        <View style={styles.infoSection}>
          <InfoItem
            icon="location"
            label="Dirección de entrega"
            value={order.branch_address || order.branch_name || 'Sucursal principal'}
          />
          <InfoItem
            icon="calendar"
            label="Fecha programada"
            value={order.expected_delivery_date ? formatDateLong(order.expected_delivery_date) : '—'}
          />
          {order.purchase_order_number && (
            <InfoItem
              icon="document-text"
              label="Orden de compra"
              value={order.purchase_order_number}
            />
          )}
        </View>

        <View style={styles.divider} />

        {/* Items List */}
        <View style={styles.itemsSection}>
          <Text style={styles.sectionTitle}>Artículos</Text>
          {order.items?.map((item) => (
            <View key={item.id} style={styles.itemRow}>
              <Text style={styles.itemQty}>{item.quantity_requested}</Text>
              <View style={styles.itemCenter}>
                <Text style={styles.itemName} numberOfLines={2}>{item.product_name}</Text>
                <Text style={styles.itemMeta}>{formatFullCurrency(item.unit_price ?? 0)} c/u</Text>
              </View>
              <Text style={styles.itemSubtotal}>{formatCurrency(item.subtotal ?? 0)}</Text>
            </View>
          ))}
        </View>

        <View style={styles.divider} />

        {/* Total Section */}
        <View style={styles.totalSection}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>{formatFullCurrency(total)}</Text>
          </View>
          <Text style={styles.paymentNote}>Todos los precios incluyen impuestos cuando corresponde.</Text>
        </View>

        <View style={styles.divider} />

        {/* Actions */}
        <View style={styles.actionsSection}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => order.client_phone && Linking.openURL(`tel:${order.client_phone}`)}
          >
            <Ionicons name="call" size={20} color="#000" />
            <Text style={styles.actionButtonText}>Contactar cliente</Text>
          </TouchableOpacity>

          {order.client_email && (
            <TouchableOpacity
              style={[styles.actionButton, { marginTop: 12 }]}
              onPress={() => Linking.openURL(`mailto:${order.client_email}`)}
            >
              <Ionicons name="mail" size={20} color="#000" />
              <Text style={styles.actionButtonText}>Enviar correo</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={{ height: 60 }} />
      </ScrollView>
    </View>
  );
}

function InfoItem({ icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <View style={styles.infoItem}>
      <View style={styles.infoIcon}>
        <Ionicons name={icon} size={20} color="#000" />
      </View>
      <View style={styles.infoContent}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingTop: Platform.OS === 'ios' ? 100 : 80,
    paddingHorizontal: 24,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 40,
  },
  errorText: {
    ...typography.body,
    color: '#545454',
    textAlign: 'center',
    marginTop: 16,
  },
  retryButton: {
    marginTop: 24,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#000',
  },
  retryText: {
    ...typography.subhead,
    fontWeight: '700',
    color: '#000',
  },
  mainTitle: {
    ...typography.largeTitle,
    fontSize: 28,
    fontWeight: '800',
    color: '#000',
    marginBottom: 32,
  },
  summarySection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  summaryContent: {
    flex: 1,
    paddingRight: 16,
  },
  clientName: {
    ...typography.title2,
    fontWeight: '800',
    color: '#000',
  },
  orderNumber: {
    ...typography.subhead,
    color: '#545454',
    marginTop: 4,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusText: {
    ...typography.caption1,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  iconBox: {
    width: 64,
    height: 64,
    backgroundColor: '#F6F6F6',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  divider: {
    height: 1,
    backgroundColor: '#EEEEEE',
    marginVertical: 20,
  },
  infoSection: {
    gap: 20,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 16,
  },
  infoIcon: {
    width: 24,
    alignItems: 'center',
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    ...typography.caption1,
    fontWeight: '700',
    color: '#AFAFAF',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  infoValue: {
    ...typography.body,
    fontSize: 16,
    color: '#000',
    lineHeight: 22,
  },
  itemsSection: {
    marginTop: 8,
  },
  sectionTitle: {
    ...typography.title3,
    fontWeight: '800',
    color: '#000',
    marginBottom: 20,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 20,
    gap: 12,
  },
  itemQty: {
    ...typography.title3,
    fontWeight: '800',
    color: '#000',
    minWidth: 36,
  },
  itemCenter: {
    flex: 1,
  },
  itemName: {
    ...typography.subhead,
    fontWeight: '500',
    color: '#000',
  },
  itemMeta: {
    ...typography.caption1,
    color: '#AFAFAF',
    marginTop: 2,
  },
  itemSubtotal: {
    ...typography.subhead,
    fontWeight: '700',
    color: '#000',
    flexShrink: 0,
  },
  totalSection: {
    marginTop: 8,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalLabel: {
    ...typography.title2,
    fontWeight: '800',
    color: '#000',
  },
  totalValue: {
    ...typography.title2,
    fontWeight: '800',
    color: '#000',
  },
  paymentNote: {
    ...typography.caption1,
    color: '#AFAFAF',
    marginTop: 12,
  },
  actionsSection: {
    marginTop: 12,
  },
  actionButton: {
    flexDirection: 'row',
    height: 54,
    backgroundColor: '#F6F6F6',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  actionButtonText: {
    ...typography.headline,
    fontSize: 16,
    fontWeight: '700',
    color: '#000',
  },
});
