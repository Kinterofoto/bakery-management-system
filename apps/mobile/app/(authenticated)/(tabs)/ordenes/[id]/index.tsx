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
import { useLocalSearchParams, Stack, useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import {
  OrdersService,
  OrderDetail,
  OrderEvent,
} from '../../../../../services/orders.service';
import { getStatusLabel, getStatusColor } from '../../../../../components/ordenes/StatusProgress';
import { colors } from '../../../../../theme/colors';
import { typography } from '../../../../../theme/typography';
import { formatDate, formatDateLong, formatFullCurrency, formatCurrency } from '../../../../../utils/formatters';

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

// --- Main Screen ---

export default function OrderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [events, setEvents] = useState<OrderEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
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
    }

    if (eventsResult.data) {
      setEvents(eventsResult.data.events);
    }
  }, [id]);

  useEffect(() => {
    setIsLoading(true);
    loadData().finally(() => setIsLoading(false));
  }, [loadData]);

  // Reload when coming back from sub-pages
  useFocusEffect(
    useCallback(() => {
      if (order) loadData();
    }, [order?.status])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  // Check if all items reviewed (for review_area1 transition)
  const allItemsReviewed =
    order?.status === 'review_area1'
      ? order.items.every(
          (item) => item.availability_status && item.availability_status !== 'pending'
        )
      : true;

  const handleTransition = async () => {
    if (!order || !id) return;
    const next = NEXT_STATUS[order.status];
    if (!next) return;

    setTransitioning(true);
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

  // --- Render ---

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
        {/* Status Header */}
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

        {/* Client Row — Compact */}
        <TouchableOpacity
          style={styles.navRow}
          onPress={() => router.push(`/ordenes/${id}/cliente`)}
        >
          <View style={styles.navRowIcon}>
            <Ionicons name="person" size={20} color="#000" />
          </View>
          <View style={styles.navRowContent}>
            <Text style={styles.navRowTitle}>{order.client_name}</Text>
            {order.branch_name && (
              <Text style={styles.navRowSubtitle}>{order.branch_name}</Text>
            )}
          </View>
          <Ionicons name="chevron-forward" size={20} color="#AFAFAF" />
        </TouchableOpacity>

        <View style={styles.divider} />

        {/* Items Row — Compact */}
        <TouchableOpacity
          style={styles.navRow}
          onPress={() => router.push(`/ordenes/${id}/articulos`)}
        >
          <View style={styles.navRowIcon}>
            <Ionicons name="cube" size={20} color="#000" />
          </View>
          <View style={styles.navRowContent}>
            <Text style={styles.navRowTitle}>Artículos ({order.items.length})</Text>
            <Text style={styles.navRowSubtitle}>{formatFullCurrency(total)}</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#AFAFAF" />
        </TouchableOpacity>

        {/* Review hint */}
        {order.status === 'review_area1' && !allItemsReviewed && (
          <View style={styles.hintRow}>
            <Ionicons name="information-circle" size={16} color={colors.warning} />
            <Text style={styles.hintText}>Revisa los artículos antes de avanzar</Text>
          </View>
        )}

        <View style={styles.divider} />

        {/* Timeline */}
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

        {/* Contact Actions */}
        <View style={styles.contactRow}>
          {order.client_phone && (
            <TouchableOpacity
              style={styles.contactBtn}
              onPress={() => Linking.openURL(`tel:${order.client_phone}`)}
            >
              <Ionicons name="call" size={18} color="#000" />
              <Text style={styles.contactBtnText}>Llamar</Text>
            </TouchableOpacity>
          )}
          {order.client_email && (
            <TouchableOpacity
              style={styles.contactBtn}
              onPress={() => Linking.openURL(`mailto:${order.client_email}`)}
            >
              <Ionicons name="mail" size={18} color="#000" />
              <Text style={styles.contactBtnText}>Correo</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Sticky Bottom Action Bar */}
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

// --- Timeline Sub-component ---

function TimelineItem({ event, isLast }: { event: OrderEvent; isLast: boolean }) {
  const iconMap: Record<string, string> = {
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

  let time = '';
  if (event.created_at) {
    try {
      time = formatDate(event.created_at, 'HH:mm');
    } catch {
      try {
        time = new Date(event.created_at).toLocaleTimeString('es-CO', {
          hour: '2-digit',
          minute: '2-digit',
        });
      } catch {
        time = '';
      }
    }
  }

  return (
    <View style={styles.timelineRow}>
      <View style={styles.timelineDotCol}>
        <Ionicons name={iconName as any} size={16} color="#545454" />
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
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  scroll: { flex: 1 },
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
  errorText: { ...typography.body, color: '#545454', textAlign: 'center', marginTop: 16 },
  retryButton: {
    marginTop: 24,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#000',
  },
  retryText: { ...typography.subhead, fontWeight: '700', color: '#000' },
  divider: { height: 1, backgroundColor: '#EEEEEE', marginVertical: 16 },

  // Status Header
  statusHeader: { gap: 10 },
  statusHeaderTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  statusLabelText: { ...typography.headline, fontWeight: '700', textTransform: 'uppercase' },
  totalBig: { ...typography.title2, fontWeight: '800', color: '#000' },
  progressRow: { flexDirection: 'row', gap: 4 },
  progressSegmentWrapper: { flex: 1 },
  progressSegment: { height: 4, borderRadius: 2 },
  progressActive: { backgroundColor: '#000000' },
  progressInactive: { backgroundColor: '#EEEEEE' },
  orderNumberSubtitle: { ...typography.subhead, color: '#545454' },

  // Nav Rows (Client & Items)
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    gap: 14,
  },
  navRowIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F6F6F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  navRowContent: { flex: 1 },
  navRowTitle: { ...typography.headline, fontWeight: '700', color: '#000' },
  navRowSubtitle: { ...typography.footnote, color: '#545454', marginTop: 2 },

  // Hint
  hintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
    paddingHorizontal: 4,
  },
  hintText: { ...typography.caption1, color: colors.warning, fontWeight: '600' },

  // Timeline
  timelineSection: { marginTop: 4 },
  sectionTitle: { ...typography.headline, fontWeight: '800', color: '#000', marginBottom: 12 },
  timelineRow: { flexDirection: 'row', gap: 10, minHeight: 36 },
  timelineDotCol: { alignItems: 'center', width: 18 },
  timelineLine: {
    width: 2,
    flex: 1,
    backgroundColor: '#EEEEEE',
    marginTop: 3,
    marginBottom: 3,
  },
  timelineContent: { flex: 1, paddingBottom: 12 },
  timelineDesc: { ...typography.footnote, color: '#000', fontWeight: '500' },
  timelineTime: { ...typography.caption2, color: '#AFAFAF', marginTop: 1 },

  // Contact
  contactRow: { flexDirection: 'row', gap: 12 },
  contactBtn: {
    flex: 1,
    flexDirection: 'row',
    height: 48,
    backgroundColor: '#F6F6F6',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  contactBtnText: { ...typography.subhead, fontWeight: '700', color: '#000' },

  // Bottom Bar
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
  cancelBtnText: { ...typography.headline, fontWeight: '700', color: colors.error },
  primaryBtn: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnDisabled: { opacity: 0.4 },
  primaryBtnText: { ...typography.headline, fontWeight: '700', color: '#FFF' },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  modalContent: { backgroundColor: '#FFF', borderRadius: 16, padding: 24 },
  modalTitle: { ...typography.title3, fontWeight: '800', color: '#000' },
  modalSubtitle: { ...typography.footnote, color: '#545454', marginTop: 4, marginBottom: 16 },
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
  modalButtons: { flexDirection: 'row', gap: 12, marginTop: 20 },
  modalBackBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#EEEEEE',
    alignItems: 'center',
  },
  modalBackBtnText: { ...typography.headline, fontWeight: '700', color: '#000' },
  modalConfirmBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: colors.error,
    alignItems: 'center',
  },
  modalConfirmBtnText: { ...typography.headline, fontWeight: '700', color: '#FFF' },
});
