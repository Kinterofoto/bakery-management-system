import { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Linking,
  Platform,
  RefreshControl,
  Alert,
  TextInput,
  Modal,
} from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  OrdersService,
  OrderDetail,
  OrderEvent,
  OrderItemDetail,
} from '../../../../services/orders.service';
import { getStatusLabel, getStatusColor } from '../../../../components/ordenes/StatusProgress';
import { colors } from '../../../../theme/colors';
import { typography } from '../../../../theme/typography';
import { formatDate, formatDateLong, formatFullCurrency } from '../../../../utils/formatters';

// --- Constants ---

const STATUS_TO_STEP: Record<string, number> = {
  received: 1,
  review_area1: 1,
  review_area2: 2,
  ready_dispatch: 2,
  dispatched: 3,
  in_delivery: 3,
  delivered: 4,
  partially_delivered: 4,
};

const NEXT_STATUS: Record<string, { status: string; label: string }> = {
  received: { status: 'review_area1', label: 'Avanzar a Revisión' },
  review_area1: { status: 'review_area2', label: 'Completar Revisión' },
  review_area2: { status: 'ready_dispatch', label: 'Listo para Despacho' },
  ready_dispatch: { status: 'dispatched', label: 'Despachar Pedido' },
  dispatched: { status: 'in_delivery', label: 'En Camino' },
  in_delivery: { status: 'delivered', label: 'Marcar como Entregado' },
};

const TERMINAL_STATUSES = ['delivered', 'cancelled', 'returned', 'partially_delivered'];
const CANCELLABLE_STATUSES = ['received', 'review_area1', 'review_area2', 'ready_dispatch'];

// --- Types ---

type EditedItemData = {
  availability_status: string;
  quantity_available: number | null;
  lote: string;
};

// --- Main Screen ---

export default function OrderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [events, setEvents] = useState<OrderEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [editedItems, setEditedItems] = useState<Record<string, EditedItemData>>({});
  const [transitioning, setTransitioning] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelling, setCancelling] = useState(false);

  const loadData = useCallback(async () => {
    if (!id) return;

    const [orderResult, eventsResult] = await Promise.all([
      OrdersService.getOrder(id),
      OrdersService.getOrderEvents(id),
    ]);

    if (orderResult.error) {
      setError(orderResult.error);
    } else if (orderResult.data) {
      setOrder(orderResult.data);
      // Initialize editedItems for review_area1
      if (orderResult.data.status === 'review_area1') {
        const initial: Record<string, EditedItemData> = {};
        orderResult.data.items.forEach((item) => {
          initial[item.id] = {
            availability_status: item.availability_status || 'pending',
            quantity_available: item.quantity_available ?? item.quantity_requested ?? 0,
            lote: item.lote || '',
          };
        });
        setEditedItems(initial);
      }
    }

    if (eventsResult.data) {
      setEvents(eventsResult.data.events);
    }
  }, [id]);

  useEffect(() => {
    setIsLoading(true);
    loadData().finally(() => setIsLoading(false));
  }, [loadData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  // --- Item editing handlers ---

  const handleAvailabilityChange = (itemId: string, status: string) => {
    setEditedItems((prev) => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        availability_status: status,
        quantity_available:
          status === 'available'
            ? (order?.items.find((i) => i.id === itemId)?.quantity_requested ?? 0)
            : status === 'unavailable'
              ? 0
              : prev[itemId]?.quantity_available ?? 0,
      },
    }));
  };

  const handleQuantityChange = (itemId: string, qty: number) => {
    setEditedItems((prev) => ({
      ...prev,
      [itemId]: { ...prev[itemId], quantity_available: qty },
    }));
  };

  const handleLoteChange = (itemId: string, lote: string) => {
    setEditedItems((prev) => ({
      ...prev,
      [itemId]: { ...prev[itemId], lote },
    }));
  };

  // --- Action handlers ---

  const allItemsReviewed =
    order?.status === 'review_area1'
      ? order.items.every((item) => {
          const edited = editedItems[item.id];
          return edited && edited.availability_status !== 'pending';
        })
      : true;

  const handleTransition = async () => {
    if (!order || !id) return;
    const next = NEXT_STATUS[order.status];
    if (!next) return;

    setTransitioning(true);

    // If in review_area1, save item changes first
    if (order.status === 'review_area1' && Object.keys(editedItems).length > 0) {
      const updates = Object.entries(editedItems).map(([item_id, data]) => ({
        item_id,
        availability_status: data.availability_status,
        quantity_available: data.quantity_available,
        lote: data.lote || undefined,
      }));

      const batchResult = await OrdersService.batchUpdateItems(id, updates);
      if (batchResult.error) {
        Alert.alert('Error', batchResult.error);
        setTransitioning(false);
        return;
      }
    }

    const result = await OrdersService.transitionOrder(id, next.status);
    if (result.error) {
      Alert.alert('Error', result.error);
    } else {
      await loadData();
    }
    setTransitioning(false);
  };

  const handleCancel = async () => {
    if (!id || !cancelReason.trim()) return;
    setCancelling(true);

    const result = await OrdersService.cancelOrder(id, cancelReason.trim());
    if (result.error) {
      Alert.alert('Error', result.error);
    } else {
      setShowCancelModal(false);
      setCancelReason('');
      await loadData();
    }
    setCancelling(false);
  };

  // --- Render states ---

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
        <TouchableOpacity
          style={styles.retryButton}
          onPress={() => {
            setIsLoading(true);
            setError(null);
            loadData().finally(() => setIsLoading(false));
          }}
        >
          <Text style={styles.retryText}>Reintentar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const statusColor = getStatusColor(order.status);
  const total = order.total ?? 0;
  const currentStep = STATUS_TO_STEP[order.status] ?? 1;
  const isTerminal = TERMINAL_STATUSES.includes(order.status);
  const canCancel = CANCELLABLE_STATUSES.includes(order.status);
  const nextAction = NEXT_STATUS[order.status];

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
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, !isTerminal && nextAction && { paddingBottom: 100 }]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#000" />
        }
      >
        {/* A. Status Header */}
        <View style={styles.statusHeader}>
          <View style={styles.statusHeaderTop}>
            <View style={styles.statusLabelRow}>
              <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
              <Text style={[styles.statusLabelText, { color: statusColor }]}>
                {getStatusLabel(order.status)}
              </Text>
            </View>
            <Text style={styles.totalBig}>{formatFullCurrency(total)}</Text>
          </View>

          {order.status !== 'cancelled' && (
            <View style={styles.progressRow}>
              {[1, 2, 3, 4].map((step) => (
                <View key={step} style={styles.progressSegmentWrapper}>
                  <View
                    style={[
                      styles.progressSegment,
                      currentStep >= step ? styles.progressActive : styles.progressInactive,
                    ]}
                  />
                </View>
              ))}
            </View>
          )}

          <Text style={styles.orderNumberSubtitle}>
            Pedido #{order.order_number || order.id.slice(0, 8)}
          </Text>
        </View>

        <View style={styles.divider} />

        {/* B. Info del Pedido */}
        <View style={styles.infoSection}>
          <Text style={styles.clientNameBig}>{order.client_name}</Text>
          {order.branch_name && (
            <InfoItem icon="business" label="Sucursal" value={order.branch_name} />
          )}
          {order.branch_address && (
            <InfoItem icon="location" label="Dirección" value={order.branch_address} />
          )}
          <InfoItem
            icon="calendar"
            label="Fecha de entrega"
            value={order.expected_delivery_date ? formatDateLong(order.expected_delivery_date) : '—'}
          />
          {order.purchase_order_number && (
            <InfoItem icon="document-text" label="Orden de compra" value={order.purchase_order_number} />
          )}
          {order.observations && (
            <InfoItem icon="chatbubble" label="Observaciones" value={order.observations} />
          )}
          {order.created_by_name && (
            <InfoItem icon="person" label="Creado por" value={order.created_by_name} />
          )}
        </View>

        <View style={styles.divider} />

        {/* C. Artículos */}
        <View style={styles.itemsSection}>
          <Text style={styles.sectionTitle}>Artículos ({order.items.length})</Text>
          {order.items.map((item) => (
            <ItemRow
              key={item.id}
              item={item}
              status={order.status}
              editedData={editedItems[item.id]}
              onAvailabilityChange={(s) => handleAvailabilityChange(item.id, s)}
              onQuantityChange={(q) => handleQuantityChange(item.id, q)}
              onLoteChange={(l) => handleLoteChange(item.id, l)}
            />
          ))}
        </View>

        <View style={styles.divider} />

        {/* D. Total */}
        <View style={styles.totalSection}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>{formatFullCurrency(total)}</Text>
          </View>
        </View>

        <View style={styles.divider} />

        {/* E. Historial */}
        {events.length > 0 && (
          <>
            <View style={styles.timelineSection}>
              <Text style={styles.sectionTitle}>Historial</Text>
              {events.map((event, index) => (
                <TimelineItem key={event.id} event={event} isLast={index === events.length - 1} />
              ))}
            </View>
            <View style={styles.divider} />
          </>
        )}

        {/* F. Acciones de Contacto */}
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

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* G. Sticky Bottom Action Bar */}
      {!isTerminal && nextAction && (
        <View style={styles.bottomBar}>
          {canCancel && (
            <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowCancelModal(true)}>
              <Text style={styles.cancelBtnText}>Cancelar</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[
              styles.primaryBtn,
              !canCancel && { flex: 1 },
              (!allItemsReviewed || transitioning) && styles.primaryBtnDisabled,
            ]}
            onPress={handleTransition}
            disabled={!allItemsReviewed || transitioning}
          >
            {transitioning ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <Text style={styles.primaryBtnText}>{nextAction.label}</Text>
            )}
          </TouchableOpacity>
        </View>
      )}

      {/* Cancel Modal */}
      <Modal
        visible={showCancelModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowCancelModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Cancelar Pedido</Text>
            <Text style={styles.modalSubtitle}>Ingresa el motivo de la cancelación</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Motivo de cancelación..."
              placeholderTextColor="#AFAFAF"
              value={cancelReason}
              onChangeText={setCancelReason}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalBackBtn}
                onPress={() => {
                  setShowCancelModal(false);
                  setCancelReason('');
                }}
              >
                <Text style={styles.modalBackBtnText}>Volver</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalConfirmBtn,
                  (!cancelReason.trim() || cancelling) && { opacity: 0.5 },
                ]}
                onPress={handleCancel}
                disabled={!cancelReason.trim() || cancelling}
              >
                {cancelling ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <Text style={styles.modalConfirmBtnText}>Confirmar</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// --- Sub-components ---

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

function ItemRow({
  item,
  status,
  editedData,
  onAvailabilityChange,
  onQuantityChange,
  onLoteChange,
}: {
  item: OrderItemDetail;
  status: string;
  editedData?: EditedItemData;
  onAvailabilityChange: (status: string) => void;
  onQuantityChange: (qty: number) => void;
  onLoteChange: (lote: string) => void;
}) {
  const isReview1 = status === 'review_area1';
  const showBadge = [
    'review_area2',
    'ready_dispatch',
    'dispatched',
    'in_delivery',
    'delivered',
    'partially_delivered',
  ].includes(status);
  const availStatus = editedData?.availability_status || item.availability_status || 'pending';

  return (
    <View style={styles.itemCard}>
      <View style={styles.itemTop}>
        <Text style={styles.itemName} numberOfLines={2}>
          {item.product_name}
        </Text>
        <Text style={styles.itemSubtotal}>{formatFullCurrency(item.subtotal ?? 0)}</Text>
      </View>
      <Text style={styles.itemMeta}>
        <Text style={styles.itemQty}>{item.quantity_requested}</Text> ×{' '}
        {formatFullCurrency(item.unit_price ?? 0)}
      </Text>

      {/* Availability controls in review_area1 */}
      {isReview1 && (
        <View style={styles.reviewControls}>
          <View style={styles.availBtnRow}>
            {(['available', 'partial', 'unavailable'] as const).map((s) => {
              const isActive = availStatus === s;
              const label =
                s === 'available' ? 'Disponible' : s === 'partial' ? 'Parcial' : 'No disp.';
              const activeColor =
                s === 'available' ? colors.success : s === 'partial' ? colors.warning : colors.error;
              return (
                <TouchableOpacity
                  key={s}
                  style={[
                    styles.availBtn,
                    isActive
                      ? { backgroundColor: activeColor }
                      : { backgroundColor: '#F6F6F6' },
                  ]}
                  onPress={() => onAvailabilityChange(s)}
                >
                  <Text
                    style={[styles.availBtnText, { color: isActive ? '#FFF' : '#545454' }]}
                  >
                    {label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {availStatus === 'partial' && (
            <View style={styles.fieldRow}>
              <Text style={styles.fieldLabel}>Cant. disponible:</Text>
              <TextInput
                style={styles.fieldInput}
                value={String(editedData?.quantity_available ?? '')}
                onChangeText={(t) => {
                  const n = parseInt(t, 10);
                  onQuantityChange(isNaN(n) ? 0 : n);
                }}
                keyboardType="numeric"
                placeholder="0"
                placeholderTextColor="#AFAFAF"
              />
            </View>
          )}

          <View style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>Lote:</Text>
            <TextInput
              style={[styles.fieldInput, { flex: 1 }]}
              value={editedData?.lote ?? ''}
              onChangeText={onLoteChange}
              placeholder="Número de lote"
              placeholderTextColor="#AFAFAF"
            />
          </View>
        </View>
      )}

      {/* Badges in post-review statuses */}
      {showBadge && item.availability_status && item.availability_status !== 'pending' && (
        <View style={styles.badgeRow}>
          <AvailabilityBadge status={item.availability_status} />
          {item.availability_status === 'partial' && item.quantity_available != null && (
            <Text style={styles.badgeDetail}>
              Disp: {item.quantity_available}/{item.quantity_requested}
            </Text>
          )}
          {item.lote && <Text style={styles.badgeDetail}>Lote: {item.lote}</Text>}
        </View>
      )}
    </View>
  );
}

function AvailabilityBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; bg: string; fg: string }> = {
    available: { label: 'Disponible', bg: '#E6F4EA', fg: colors.success },
    partial: { label: 'Parcial', bg: '#FFF8E1', fg: '#B8860B' },
    unavailable: { label: 'No disponible', bg: '#FDECEA', fg: colors.error },
  };
  const c = config[status] || { label: status, bg: '#F6F6F6', fg: '#545454' };

  return (
    <View style={[styles.badge, { backgroundColor: c.bg }]}>
      <Text style={[styles.badgeText, { color: c.fg }]}>{c.label}</Text>
    </View>
  );
}

function TimelineItem({ event, isLast }: { event: OrderEvent; isLast: boolean }) {
  const iconMap: Record<string, keyof typeof Ionicons.glyphMap> = {
    created: 'add-circle',
    status_change: 'swap-horizontal',
    cancelled: 'close-circle',
    item_updated: 'create',
  };
  const iconName = iconMap[event.event_type] || 'ellipse';

  const getDescription = () => {
    const name = event.created_by_name || 'Sistema';
    switch (event.event_type) {
      case 'created':
        return `${name} creó el pedido`;
      case 'status_change': {
        const payload = event.payload as Record<string, any> | null;
        const newLabel = payload?.new_status ? getStatusLabel(payload.new_status) : '';
        return `${name} avanzó a ${newLabel}`;
      }
      case 'cancelled':
        return `${name} canceló el pedido`;
      case 'item_updated':
        return `${name} actualizó artículos`;
      default:
        return `${name} — ${event.event_type}`;
    }
  };

  const time = event.created_at ? formatDate(event.created_at, 'HH:mm') : '';

  return (
    <View style={styles.timelineRow}>
      <View style={styles.timelineDotCol}>
        <Ionicons name={iconName as any} size={18} color="#545454" />
        {!isLast && <View style={styles.timelineLine} />}
      </View>
      <View style={styles.timelineContent}>
        <Text style={styles.timelineDesc}>{getDescription()}</Text>
        <Text style={styles.timelineTime}>{time}</Text>
      </View>
    </View>
  );
}

// --- Styles ---

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
  divider: {
    height: 1,
    backgroundColor: '#EEEEEE',
    marginVertical: 20,
  },

  // A. Status Header
  statusHeader: {
    gap: 12,
  },
  statusHeaderTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  statusLabelText: {
    ...typography.headline,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  totalBig: {
    ...typography.title2,
    fontWeight: '800',
    color: '#000',
  },
  progressRow: {
    flexDirection: 'row',
    gap: 4,
  },
  progressSegmentWrapper: {
    flex: 1,
  },
  progressSegment: {
    height: 4,
    borderRadius: 2,
  },
  progressActive: {
    backgroundColor: '#000000',
  },
  progressInactive: {
    backgroundColor: '#EEEEEE',
  },
  orderNumberSubtitle: {
    ...typography.subhead,
    color: '#545454',
  },

  // B. Info
  infoSection: {
    gap: 16,
  },
  clientNameBig: {
    ...typography.title2,
    fontWeight: '800',
    color: '#000',
    marginBottom: 4,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 16,
  },
  infoIcon: {
    width: 24,
    alignItems: 'center',
    marginTop: 2,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    ...typography.caption1,
    fontWeight: '700',
    color: '#AFAFAF',
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  infoValue: {
    ...typography.body,
    fontSize: 16,
    color: '#000',
    lineHeight: 22,
  },

  // C. Items
  itemsSection: {
    marginTop: 4,
  },
  sectionTitle: {
    ...typography.title3,
    fontWeight: '800',
    color: '#000',
    marginBottom: 16,
  },
  itemCard: {
    backgroundColor: '#FAFAFA',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  itemTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 16,
  },
  itemName: {
    ...typography.body,
    fontWeight: '600',
    color: '#000',
    flex: 1,
  },
  itemSubtotal: {
    ...typography.body,
    fontWeight: '700',
    color: '#000',
    flexShrink: 0,
  },
  itemMeta: {
    ...typography.footnote,
    color: '#AFAFAF',
    marginTop: 3,
  },
  itemQty: {
    fontWeight: '800',
    color: '#000',
  },

  // Review controls
  reviewControls: {
    marginTop: 12,
    gap: 10,
  },
  availBtnRow: {
    flexDirection: 'row',
    gap: 8,
  },
  availBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  availBtnText: {
    ...typography.caption1,
    fontWeight: '700',
  },
  fieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  fieldLabel: {
    ...typography.footnote,
    color: '#545454',
    fontWeight: '600',
  },
  fieldInput: {
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#EEEEEE',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    ...typography.footnote,
    color: '#000',
    minWidth: 60,
  },

  // Badges
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
    flexWrap: 'wrap',
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeText: {
    ...typography.caption2,
    fontWeight: '700',
  },
  badgeDetail: {
    ...typography.caption1,
    color: '#545454',
  },

  // D. Total
  totalSection: {
    marginTop: 4,
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

  // E. Timeline
  timelineSection: {
    marginTop: 4,
  },
  timelineRow: {
    flexDirection: 'row',
    gap: 12,
    minHeight: 40,
  },
  timelineDotCol: {
    alignItems: 'center',
    width: 20,
  },
  timelineLine: {
    width: 2,
    flex: 1,
    backgroundColor: '#EEEEEE',
    marginTop: 4,
    marginBottom: 4,
  },
  timelineContent: {
    flex: 1,
    paddingBottom: 16,
  },
  timelineDesc: {
    ...typography.footnote,
    color: '#000',
    fontWeight: '500',
  },
  timelineTime: {
    ...typography.caption2,
    color: '#AFAFAF',
    marginTop: 2,
  },

  // F. Contact Actions
  actionsSection: {
    marginTop: 4,
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

  // G. Bottom Bar
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 34 : 16,
    backgroundColor: '#FFF',
    borderTopWidth: 1,
    borderTopColor: '#EEEEEE',
  },
  cancelBtn: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.error,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    ...typography.headline,
    fontWeight: '700',
    color: colors.error,
  },
  primaryBtn: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnDisabled: {
    opacity: 0.4,
  },
  primaryBtnText: {
    ...typography.headline,
    fontWeight: '700',
    color: '#FFF',
  },

  // Cancel Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  modalContent: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 24,
  },
  modalTitle: {
    ...typography.title3,
    fontWeight: '800',
    color: '#000',
  },
  modalSubtitle: {
    ...typography.footnote,
    color: '#545454',
    marginTop: 4,
    marginBottom: 16,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#EEEEEE',
    borderRadius: 12,
    padding: 14,
    ...typography.body,
    fontSize: 15,
    color: '#000',
    minHeight: 80,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  modalBackBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#EEEEEE',
    alignItems: 'center',
  },
  modalBackBtnText: {
    ...typography.headline,
    fontWeight: '700',
    color: '#000',
  },
  modalConfirmBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: colors.error,
    alignItems: 'center',
  },
  modalConfirmBtnText: {
    ...typography.headline,
    fontWeight: '700',
    color: '#FFF',
  },
});
