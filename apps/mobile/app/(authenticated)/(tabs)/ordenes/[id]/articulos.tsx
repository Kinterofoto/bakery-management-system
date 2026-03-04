import { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  TextInput,
  Alert,
  Platform,
} from 'react-native';
import { useLocalSearchParams, Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  OrdersService,
  OrderDetail,
  OrderItemDetail,
} from '../../../../../services/orders.service';
import { colors } from '../../../../../theme/colors';
import { typography } from '../../../../../theme/typography';
import { formatFullCurrency } from '../../../../../utils/formatters';

type EditedItemData = {
  availability_status: string;
  quantity_available: number | null;
  lote: string;
};

export default function ArticulosScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [editedItems, setEditedItems] = useState<Record<string, EditedItemData>>({});
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (!id) return;
    OrdersService.getOrder(id).then((result) => {
      if (result.data) {
        setOrder(result.data);
        // Initialize editedItems for review_area1
        if (result.data.status === 'review_area1') {
          const initial: Record<string, EditedItemData> = {};
          result.data.items.forEach((item) => {
            initial[item.id] = {
              availability_status: item.availability_status || 'pending',
              quantity_available: item.quantity_available ?? item.quantity_requested ?? 0,
              lote: item.lote || '',
            };
          });
          setEditedItems(initial);
        }
      }
      setIsLoading(false);
    });
  }, [id]);

  const handleAvailabilityChange = (itemId: string, status: string) => {
    setHasChanges(true);
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
    setHasChanges(true);
    setEditedItems((prev) => ({
      ...prev,
      [itemId]: { ...prev[itemId], quantity_available: qty },
    }));
  };

  const handleLoteChange = (itemId: string, lote: string) => {
    setHasChanges(true);
    setEditedItems((prev) => ({
      ...prev,
      [itemId]: { ...prev[itemId], lote },
    }));
  };

  const handleSave = async () => {
    if (!id || !hasChanges) return;
    setSaving(true);

    const updates = Object.entries(editedItems).map(([item_id, data]) => ({
      item_id,
      availability_status: data.availability_status,
      quantity_available: data.quantity_available,
      lote: data.lote || undefined,
    }));

    const result = await OrdersService.batchUpdateItems(id, updates);
    if (result.error) {
      Alert.alert('Error', result.error);
    } else {
      setHasChanges(false);
      Alert.alert('Guardado', 'Los artículos se actualizaron correctamente');
    }
    setSaving(false);
  };

  if (isLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#000" />
      </View>
    );
  }

  if (!order) return null;

  const isReview1 = order.status === 'review_area1';
  const showBadges = [
    'review_area2',
    'ready_dispatch',
    'dispatched',
    'in_delivery',
    'delivered',
    'partially_delivered',
  ].includes(order.status);
  const total = order.total ?? 0;

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: `Artículos (${order.items.length})` }} />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, isReview1 && hasChanges && { paddingBottom: 90 }]}
      >
        {order.items.map((item) => {
          const edited = editedItems[item.id];
          const availStatus = edited?.availability_status || item.availability_status || 'pending';

          return (
            <View key={item.id} style={styles.itemCard}>
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

              {/* Review controls */}
              {isReview1 && (
                <View style={styles.reviewControls}>
                  <View style={styles.availBtnRow}>
                    {(['available', 'partial', 'unavailable'] as const).map((s) => {
                      const isActive = availStatus === s;
                      const label =
                        s === 'available' ? 'Disponible' : s === 'partial' ? 'Parcial' : 'No disp.';
                      const activeColor =
                        s === 'available'
                          ? colors.success
                          : s === 'partial'
                            ? colors.warning
                            : colors.error;
                      return (
                        <TouchableOpacity
                          key={s}
                          style={[
                            styles.availBtn,
                            isActive ? { backgroundColor: activeColor } : { backgroundColor: '#F6F6F6' },
                          ]}
                          onPress={() => handleAvailabilityChange(item.id, s)}
                        >
                          <Text style={[styles.availBtnText, { color: isActive ? '#FFF' : '#545454' }]}>
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
                        value={String(edited?.quantity_available ?? '')}
                        onChangeText={(t) => {
                          const n = parseInt(t, 10);
                          handleQuantityChange(item.id, isNaN(n) ? 0 : n);
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
                      value={edited?.lote ?? ''}
                      onChangeText={(l) => handleLoteChange(item.id, l)}
                      placeholder="Número de lote"
                      placeholderTextColor="#AFAFAF"
                    />
                  </View>
                </View>
              )}

              {/* Badges */}
              {showBadges && item.availability_status && item.availability_status !== 'pending' && (
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
        })}

        {/* Total */}
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Total</Text>
          <Text style={styles.totalValue}>{formatFullCurrency(total)}</Text>
        </View>
      </ScrollView>

      {/* Save button */}
      {isReview1 && hasChanges && (
        <View style={styles.bottomBar}>
          <TouchableOpacity
            style={[styles.saveBtn, saving && { opacity: 0.5 }]}
            onPress={handleSave}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <Text style={styles.saveBtnText}>Guardar cambios</Text>
            )}
          </TouchableOpacity>
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF' },
  scroll: { flex: 1 },
  content: { padding: 20 },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFF' },

  // Items
  itemCard: {
    backgroundColor: '#FAFAFA',
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
  },
  itemTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 16,
  },
  itemName: { ...typography.body, fontWeight: '600', color: '#000', flex: 1 },
  itemSubtotal: { ...typography.body, fontWeight: '700', color: '#000', flexShrink: 0 },
  itemMeta: { ...typography.footnote, color: '#AFAFAF', marginTop: 3 },
  itemQty: { fontWeight: '800', color: '#000' },

  // Review controls
  reviewControls: { marginTop: 12, gap: 10 },
  availBtnRow: { flexDirection: 'row', gap: 8 },
  availBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  availBtnText: { ...typography.caption1, fontWeight: '700' },
  fieldRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  fieldLabel: { ...typography.footnote, color: '#545454', fontWeight: '600' },
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
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  badgeText: { ...typography.caption2, fontWeight: '700' },
  badgeDetail: { ...typography.caption1, color: '#545454' },

  // Total
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#EEEEEE',
  },
  totalLabel: { ...typography.title3, fontWeight: '800', color: '#000' },
  totalValue: { ...typography.title3, fontWeight: '800', color: '#000' },

  // Bottom bar
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 34 : 16,
    backgroundColor: '#FFF',
    borderTopWidth: 1,
    borderTopColor: '#EEEEEE',
  },
  saveBtn: {
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: '#000',
    alignItems: 'center',
  },
  saveBtnText: { ...typography.headline, fontWeight: '700', color: '#FFF' },
});
