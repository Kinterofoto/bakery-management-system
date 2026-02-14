import { useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Stack, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { MasterDataService, Client, Product, Branch, ClientFrequency, ProductConfig } from '../../../../services/masterdata.service';
import { OrdersService } from '../../../../services/orders.service';
import { useOrdersStore } from '../../../../stores/orders.store';
import { SearchableList } from '../../../../components/common/SearchableList';
import { colors } from '../../../../theme/colors';
import { typography } from '../../../../theme/typography';
import { formatFullCurrency, toLocalISODate } from '../../../../utils/formatters';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface OrderItemInput {
  product_id: string;
  product_name: string;
  quantity_requested: number;
  unit_price: number;
}

export default function NuevaOrdenScreen() {
  // Master data
  const [clients, setClients] = useState<Client[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [frequencies, setFrequencies] = useState<ClientFrequency[]>([]);
  const [productConfigs, setProductConfigs] = useState<ProductConfig[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  // Form state
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null);
  const [deliveryDate, setDeliveryDate] = useState('');
  const [purchaseOrderNumber, setPurchaseOrderNumber] = useState('');
  const [observations, setObservations] = useState('');
  const [items, setItems] = useState<OrderItemInput[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Picker state
  const [showClientPicker, setShowClientPicker] = useState(false);
  const [showBranchPicker, setShowBranchPicker] = useState(false);
  const [showProductPicker, setShowProductPicker] = useState(false);

  const refreshOrders = useOrdersStore((s) => s.refreshOrders);

  // Load master data
  useEffect(() => {
    const load = async () => {
      const [clientsRes, productsRes, branchesRes, freqRes, configsRes] = await Promise.all([
        MasterDataService.getClients(),
        MasterDataService.getFinishedProducts(),
        MasterDataService.getBranches(),
        MasterDataService.getClientFrequencies(),
        MasterDataService.getProductConfigs(),
      ]);
      if (clientsRes.data) setClients(clientsRes.data);
      if (productsRes.data) setProducts(productsRes.data);
      if (branchesRes.data) setBranches(branchesRes.data);
      if (freqRes.data) setFrequencies(freqRes.data);
      if (configsRes.data) setProductConfigs(configsRes.data);
      setLoadingData(false);
    };
    load();
  }, []);

  // Filtered branches for selected client
  const clientBranches = useMemo(() => {
    if (!selectedClient) return [];
    return branches.filter((b) => b.client_id === selectedClient.id);
  }, [selectedClient, branches]);

  // Suggested delivery dates
  const suggestedDates = useMemo(() => {
    if (!selectedBranch) return [];

    const branchFreqs = frequencies.filter((f) => f.branch_id === selectedBranch.id);
    const dates: Date[] = [];
    const today = new Date();

    if (branchFreqs.length === 0) {
      // No frequencies - suggest next 7 weekdays
      let daysAdded = 0;
      let offset = 1;
      while (daysAdded < 7 && offset < 30) {
        const d = new Date(today);
        d.setDate(today.getDate() + offset);
        if (d.getDay() !== 0 && d.getDay() !== 6) {
          dates.push(d);
          daysAdded++;
        }
        offset++;
      }
    } else {
      const freqDays = branchFreqs.map((f) => f.day_of_week);
      for (let i = 1; i <= 60 && dates.length < 7; i++) {
        const d = new Date(today);
        d.setDate(today.getDate() + i);
        if (freqDays.includes(d.getDay())) {
          dates.push(d);
        }
      }
    }

    return dates;
  }, [selectedBranch, frequencies]);

  // Calculate total
  const orderTotal = useMemo(() => {
    return items.reduce((sum, item) => sum + item.quantity_requested * item.unit_price, 0);
  }, [items]);

  const getProductDisplayName = (p: Product) => {
    const weight = p.weight ? ` (${p.weight})` : '';
    return `${p.name}${weight}`;
  };

  // Reset branch when client changes
  useEffect(() => {
    setSelectedBranch(null);
    setDeliveryDate('');
  }, [selectedClient]);

  // Reset delivery date when branch changes
  useEffect(() => {
    setDeliveryDate('');
  }, [selectedBranch]);

  const handleAddProduct = (product: Product) => {
    if (items.some((i) => i.product_id === product.id)) {
      Alert.alert('Producto ya agregado', 'Este producto ya está en la lista');
      return;
    }
    setItems([
      ...items,
      {
        product_id: product.id,
        product_name: getProductDisplayName(product),
        quantity_requested: 1,
        unit_price: product.price ?? 0,
      },
    ]);
    setShowProductPicker(false);
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItemQuantity = (index: number, qty: number) => {
    const updated = [...items];
    updated[index].quantity_requested = qty;
    setItems(updated);
  };

  const updateItemPrice = (index: number, price: number) => {
    const updated = [...items];
    updated[index].unit_price = price;
    setItems(updated);
  };

  const handleSubmit = async () => {
    if (!selectedClient) {
      Alert.alert('Error', 'Selecciona un cliente');
      return;
    }
    if (!selectedBranch) {
      Alert.alert('Error', 'Selecciona una sucursal');
      return;
    }
    if (!deliveryDate) {
      Alert.alert('Error', 'Selecciona una fecha de entrega');
      return;
    }
    if (items.length === 0) {
      Alert.alert('Error', 'Agrega al menos un producto');
      return;
    }
    if (items.some((i) => i.quantity_requested <= 0)) {
      Alert.alert('Error', 'Todos los productos deben tener cantidad mayor a 0');
      return;
    }

    setIsSubmitting(true);
    const result = await OrdersService.createOrder({
      client_id: selectedClient.id,
      branch_id: selectedBranch.id,
      expected_delivery_date: deliveryDate,
      purchase_order_number: purchaseOrderNumber || undefined,
      observations: observations || undefined,
      items: items.map((i) => ({
        product_id: i.product_id,
        quantity_requested: i.quantity_requested,
        unit_price: i.unit_price,
      })),
    });

    if (result.error) {
      Alert.alert('Error', result.error);
      setIsSubmitting(false);
      return;
    }

    refreshOrders();
    Alert.alert('Pedido creado', `Pedido #${result.data?.order_number} creado exitosamente`, [
      { text: 'OK', onPress: () => router.back() },
    ]);
    setIsSubmitting(false);
  };

  if (loadingData) {
    return (
      <View style={styles.loadingContainer}>
        <Stack.Screen options={{ title: 'Nuevo Pedido' }} />
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Cargando datos...</Text>
      </View>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Nuevo Pedido',
          headerBackTitle: 'Cancelar',
        }}
      />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={styles.container}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          {/* Client */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Cliente</Text>
            <TouchableOpacity
              style={styles.pickerButton}
              onPress={() => setShowClientPicker(true)}
            >
              <Text
                style={[
                  styles.pickerText,
                  !selectedClient && styles.pickerPlaceholder,
                ]}
              >
                {selectedClient?.name || 'Seleccionar cliente...'}
              </Text>
              <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} />
            </TouchableOpacity>
          </View>

          {/* Branch */}
          {selectedClient && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Sucursal</Text>
              {clientBranches.length === 0 ? (
                <Text style={styles.noDataText}>
                  Este cliente no tiene sucursales configuradas
                </Text>
              ) : (
                <TouchableOpacity
                  style={styles.pickerButton}
                  onPress={() => setShowBranchPicker(true)}
                >
                  <Text
                    style={[
                      styles.pickerText,
                      !selectedBranch && styles.pickerPlaceholder,
                    ]}
                  >
                    {selectedBranch?.name || 'Seleccionar sucursal...'}
                  </Text>
                  <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} />
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* Delivery Date */}
          {selectedBranch && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Fecha de Entrega</Text>
              {suggestedDates.length > 0 ? (
                <View style={styles.datesGrid}>
                  {suggestedDates.slice(0, 6).map((date) => {
                    const dateStr = toLocalISODate(date);
                    const isSelected = deliveryDate === dateStr;
                    return (
                      <TouchableOpacity
                        key={dateStr}
                        style={[styles.dateChip, isSelected && styles.dateChipActive]}
                        onPress={() => setDeliveryDate(dateStr)}
                      >
                        <Text
                          style={[
                            styles.dateChipDay,
                            isSelected && styles.dateChipTextActive,
                          ]}
                        >
                          {format(date, 'EEE', { locale: es })}
                        </Text>
                        <Text
                          style={[
                            styles.dateChipDate,
                            isSelected && styles.dateChipTextActive,
                          ]}
                        >
                          {format(date, 'dd MMM', { locale: es })}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              ) : (
                <Text style={styles.noDataText}>Calculando fechas...</Text>
              )}
            </View>
          )}

          {/* Purchase Order Number */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Orden de Compra (opcional)</Text>
            <TextInput
              style={styles.textInput}
              value={purchaseOrderNumber}
              onChangeText={setPurchaseOrderNumber}
              placeholder="Número de OC..."
              placeholderTextColor={colors.textTertiary}
            />
          </View>

          {/* Products */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Productos</Text>
              <TouchableOpacity
                style={styles.addButton}
                onPress={() => setShowProductPicker(true)}
              >
                <Text style={styles.addButtonText}>+ Agregar</Text>
              </TouchableOpacity>
            </View>

            {items.length === 0 ? (
              <Text style={styles.noDataText}>
                Agrega productos al pedido
              </Text>
            ) : (
              items.map((item, index) => (
                <View key={item.product_id} style={styles.productRow}>
                  <View style={styles.productInfo}>
                    <Text style={styles.productName} numberOfLines={2}>
                      {item.product_name}
                    </Text>
                    <TouchableOpacity onPress={() => handleRemoveItem(index)}>
                      <Text style={styles.removeText}>Eliminar</Text>
                    </TouchableOpacity>
                  </View>
                  <View style={styles.productInputs}>
                    <View style={styles.inputCol}>
                      <Text style={styles.inputLabel}>Cant.</Text>
                      <TextInput
                        style={styles.numberInput}
                        value={item.quantity_requested.toString()}
                        onChangeText={(t) => updateItemQuantity(index, parseInt(t) || 0)}
                        keyboardType="number-pad"
                      />
                    </View>
                    <View style={styles.inputCol}>
                      <Text style={styles.inputLabel}>Precio</Text>
                      <TextInput
                        style={styles.numberInput}
                        value={item.unit_price.toString()}
                        onChangeText={(t) => updateItemPrice(index, parseFloat(t) || 0)}
                        keyboardType="decimal-pad"
                      />
                    </View>
                    <View style={styles.inputCol}>
                      <Text style={styles.inputLabel}>Total</Text>
                      <View style={styles.totalCell}>
                        <Text style={styles.totalCellText}>
                          ${(item.quantity_requested * item.unit_price).toLocaleString()}
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>
              ))
            )}
          </View>

          {/* Observations */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Observaciones (opcional)</Text>
            <TextInput
              style={[styles.textInput, styles.textArea]}
              value={observations}
              onChangeText={setObservations}
              placeholder="Notas adicionales..."
              placeholderTextColor={colors.textTertiary}
              multiline
              numberOfLines={3}
            />
          </View>

          {/* Total & Submit */}
          <View style={styles.section}>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total del Pedido</Text>
              <Text style={styles.totalValue}>{formatFullCurrency(orderTotal)}</Text>
            </View>

            <TouchableOpacity
              style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
              onPress={handleSubmit}
              disabled={isSubmitting}
              activeOpacity={0.8}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.submitButtonText}>Crear Pedido</Text>
              )}
            </TouchableOpacity>
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Client Picker */}
      <SearchableList
        visible={showClientPicker}
        onClose={() => setShowClientPicker(false)}
        title="Seleccionar Cliente"
        data={clients}
        keyExtractor={(c) => c.id}
        searchPlaceholder="Buscar cliente..."
        filterFn={(c, q) =>
          c.name.toLowerCase().includes(q.toLowerCase()) ||
          (c.nit?.toLowerCase().includes(q.toLowerCase()) ?? false)
        }
        renderItem={(c) => (
          <TouchableOpacity
            style={styles.listItem}
            onPress={() => {
              setSelectedClient(c);
              setShowClientPicker(false);
            }}
          >
            <Text style={styles.listItemTitle}>{c.name}</Text>
            {c.nit && <Text style={styles.listItemSub}>{c.nit}</Text>}
          </TouchableOpacity>
        )}
      />

      {/* Branch Picker */}
      <SearchableList
        visible={showBranchPicker}
        onClose={() => setShowBranchPicker(false)}
        title="Seleccionar Sucursal"
        data={clientBranches}
        keyExtractor={(b) => b.id}
        searchPlaceholder="Buscar sucursal..."
        filterFn={(b, q) => b.name.toLowerCase().includes(q.toLowerCase())}
        renderItem={(b) => (
          <TouchableOpacity
            style={styles.listItem}
            onPress={() => {
              setSelectedBranch(b);
              setShowBranchPicker(false);
            }}
          >
            <Text style={styles.listItemTitle}>{b.name}</Text>
            {b.address && <Text style={styles.listItemSub}>{b.address}</Text>}
          </TouchableOpacity>
        )}
      />

      {/* Product Picker */}
      <SearchableList
        visible={showProductPicker}
        onClose={() => setShowProductPicker(false)}
        title="Agregar Producto"
        data={products.filter((p) => p.category === 'PT')}
        keyExtractor={(p) => p.id}
        searchPlaceholder="Buscar producto..."
        filterFn={(p, q) => p.name.toLowerCase().includes(q.toLowerCase())}
        renderItem={(p) => (
          <TouchableOpacity
            style={styles.listItem}
            onPress={() => handleAddProduct(p)}
          >
            <Text style={styles.listItemTitle}>{getProductDisplayName(p)}</Text>
            {p.price !== null && (
              <Text style={styles.listItemSub}>
                ${p.price.toLocaleString()}
              </Text>
            )}
          </TouchableOpacity>
        )}
      />
    </>
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
    gap: 12,
  },
  loadingText: {
    ...typography.body,
    color: colors.textSecondary,
  },
  section: {
    backgroundColor: colors.secondarySystemGroupedBackground,
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 10,
    padding: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    ...typography.headline,
    color: colors.text,
    marginBottom: 10,
  },
  pickerButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.tertiarySystemGroupedBackground,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  pickerText: {
    ...typography.body,
    color: colors.text,
    flex: 1,
  },
  pickerPlaceholder: {
    color: colors.textTertiary,
  },
  noDataText: {
    ...typography.body,
    color: colors.textTertiary,
    textAlign: 'center',
    paddingVertical: 20,
  },

  // Dates
  datesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  dateChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: colors.tertiarySystemGroupedBackground,
    alignItems: 'center',
    minWidth: 80,
  },
  dateChipActive: {
    backgroundColor: colors.primary,
  },
  dateChipDay: {
    ...typography.caption1,
    color: colors.textSecondary,
    textTransform: 'capitalize',
  },
  dateChipDate: {
    ...typography.subhead,
    fontWeight: '600',
    color: colors.text,
    marginTop: 2,
  },
  dateChipTextActive: {
    color: '#FFFFFF',
  },

  // Text input
  textInput: {
    backgroundColor: colors.tertiarySystemGroupedBackground,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    ...typography.body,
    color: colors.text,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },

  // Products
  addButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: colors.primaryLight,
    marginBottom: 10,
  },
  addButtonText: {
    ...typography.subhead,
    fontWeight: '600',
    color: colors.primary,
  },
  productRow: {
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.separator,
    gap: 8,
  },
  productInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  productName: {
    ...typography.subhead,
    fontWeight: '500',
    color: colors.text,
    flex: 1,
    marginRight: 8,
  },
  removeText: {
    ...typography.caption1,
    color: colors.error,
  },
  productInputs: {
    flexDirection: 'row',
    gap: 8,
  },
  inputCol: {
    flex: 1,
    gap: 4,
  },
  inputLabel: {
    ...typography.caption2,
    color: colors.textSecondary,
  },
  numberInput: {
    backgroundColor: colors.tertiarySystemGroupedBackground,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    ...typography.subhead,
    color: colors.text,
    textAlign: 'center',
  },
  totalCell: {
    backgroundColor: '#DCFCE7',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    alignItems: 'center',
  },
  totalCellText: {
    ...typography.subhead,
    fontWeight: '600',
    color: '#15803D',
  },

  // Total & Submit
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  totalLabel: {
    ...typography.title3,
    color: colors.text,
  },
  totalValue: {
    ...typography.title2,
    color: colors.success,
  },
  submitButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    ...typography.headline,
    color: '#FFFFFF',
  },

  // List items (for pickers)
  listItem: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.separator,
  },
  listItemTitle: {
    ...typography.body,
    color: colors.text,
  },
  listItemSub: {
    ...typography.caption1,
    color: colors.textSecondary,
    marginTop: 2,
  },
});
