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
  const [clients, setClients] = useState<Client[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [frequencies, setFrequencies] = useState<ClientFrequency[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null);
  const [deliveryDate, setDeliveryDate] = useState('');
  const [purchaseOrderNumber, setPurchaseOrderNumber] = useState('');
  const [items, setItems] = useState<OrderItemInput[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [showClientPicker, setShowClientPicker] = useState(false);
  const [showBranchPicker, setShowBranchPicker] = useState(false);
  const [showProductPicker, setShowProductPicker] = useState(false);

  const refreshOrders = useOrdersStore((s) => s.refreshOrders);

  useEffect(() => {
    const load = async () => {
      const [clientsRes, productsRes, branchesRes, freqRes] = await Promise.all([
        MasterDataService.getClients(),
        MasterDataService.getFinishedProducts(),
        MasterDataService.getBranches(),
        MasterDataService.getClientFrequencies(),
      ]);
      if (clientsRes.data) setClients(clientsRes.data);
      if (productsRes.data) setProducts(productsRes.data);
      if (branchesRes.data) setBranches(branchesRes.data);
      if (freqRes.data) setFrequencies(freqRes.data);
      setLoadingData(false);
    };
    load();
  }, []);

  const clientBranches = useMemo(() => {
    if (!selectedClient) return [];
    return branches.filter((b) => b.client_id === selectedClient.id);
  }, [selectedClient, branches]);

  const suggestedDates = useMemo(() => {
    if (!selectedBranch) return [];
    const branchFreqs = frequencies.filter((f) => f.branch_id === selectedBranch.id);
    const dates: Date[] = [];
    const today = new Date();

    if (branchFreqs.length === 0) {
      let daysAdded = 0;
      let offset = 1;
      while (daysAdded < 7 && offset < 30) {
        const d = new Date(today);
        d.setDate(today.getDate() + offset);
        if (d.getDay() !== 0 && d.getDay() !== 6) { dates.push(d); daysAdded++; }
        offset++;
      }
    } else {
      const freqDays = branchFreqs.map((f) => f.day_of_week);
      for (let i = 1; i <= 60 && dates.length < 7; i++) {
        const d = new Date(today);
        d.setDate(today.getDate() + i);
        if (freqDays.includes(d.getDay())) { dates.push(d); }
      }
    }
    return dates;
  }, [selectedBranch, frequencies]);

  const orderTotal = useMemo(() => items.reduce((sum, item) => sum + item.quantity_requested * item.unit_price, 0), [items]);

  const handleAddProduct = (product: Product) => {
    if (items.some((i) => i.product_id === product.id)) return;
    setItems([...items, { product_id: product.id, product_name: product.name, quantity_requested: 1, unit_price: product.price ?? 0 }]);
    setShowProductPicker(false);
  };

  const removeItem = (idx: number) => setItems(items.filter((_, i) => i !== idx));

  const handleSubmit = async () => {
    if (!selectedClient || !selectedBranch || !deliveryDate || items.length === 0) {
      Alert.alert('Incompleto', 'Por favor llena todos los campos obligatorios.');
      return;
    }
    setIsSubmitting(true);
    const result = await OrdersService.createOrder({
      client_id: selectedClient.id,
      branch_id: selectedBranch.id,
      expected_delivery_date: deliveryDate,
      purchase_order_number: purchaseOrderNumber || undefined,
      items: items.map((i) => ({ product_id: i.product_id, quantity_requested: i.quantity_requested, unit_price: i.unit_price })),
    });
    if (!result.error) {
      refreshOrders();
      router.back();
    } else {
      Alert.alert('Error', result.error);
    }
    setIsSubmitting(false);
  };

  if (loadingData) return <View style={styles.center}><ActivityIndicator color={colors.primary} /></View>;

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerTitle: '', headerTransparent: true, headerTintColor: colors.text }} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
          <Text style={styles.mainTitle}>Nueva orden</Text>

          {/* Section: Client */}
          <View style={styles.fieldSection}>
            <Text style={styles.label}>Cliente</Text>
            <TouchableOpacity style={styles.pickerTrigger} onPress={() => setShowClientPicker(true)}>
              <Text style={[styles.pickerValue, !selectedClient && styles.placeholder]}>
                {selectedClient?.name || 'Selecciona un cliente'}
              </Text>
              <Ionicons name="chevron-down" size={20} color={colors.text} />
            </TouchableOpacity>
          </View>

          {selectedClient && (
            <View style={styles.fieldSection}>
              <Text style={styles.label}>Sucursal</Text>
              <TouchableOpacity style={styles.pickerTrigger} onPress={() => setShowBranchPicker(true)}>
                <Text style={[styles.pickerValue, !selectedBranch && styles.placeholder]}>
                  {selectedBranch?.name || 'Selecciona una sucursal'}
                </Text>
                <Ionicons name="chevron-down" size={20} color={colors.text} />
              </TouchableOpacity>
            </View>
          )}

          {/* Date Selector */}
          {selectedBranch && (
            <View style={styles.fieldSection}>
              <Text style={styles.label}>Fecha de despacho</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.dateScroll}>
                {suggestedDates.map((date) => {
                  const dateStr = toLocalISODate(date);
                  const isSel = deliveryDate === dateStr;
                  return (
                    <TouchableOpacity
                      key={dateStr}
                      style={[styles.dateCard, isSel && styles.dateCardSelected]}
                      onPress={() => setDeliveryDate(dateStr)}
                    >
                      <Text style={[styles.dateDay, isSel && styles.dateTextSelected]}>{format(date, 'EEE', { locale: es })}</Text>
                      <Text style={[styles.dateNum, isSel && styles.dateTextSelected]}>{format(date, 'dd')}</Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          )}

          <View style={styles.divider} />

          {/* Products Section */}
          <View style={styles.itemsHeader}>
            <Text style={styles.sectionTitle}>Productos</Text>
            <TouchableOpacity onPress={() => setShowProductPicker(true)} style={styles.addItemBtn}>
              <Text style={styles.addItemBtnText}>+ Agregar</Text>
            </TouchableOpacity>
          </View>

          {items.map((item, i) => (
            <View key={item.product_id} style={styles.itemRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.itemName}>{item.product_name}</Text>
                <Text style={styles.itemPrice}>{formatFullCurrency(item.unit_price)}</Text>
              </View>
              <View style={styles.qtyContainer}>
                <TextInput
                  style={styles.qtyInput}
                  keyboardType="number-pad"
                  value={item.quantity_requested.toString()}
                  onChangeText={(t) => {
                    const newItems = [...items];
                    newItems[i].quantity_requested = parseInt(t) || 0;
                    setItems(newItems);
                  }}
                />
              </View>
              <TouchableOpacity onPress={() => removeItem(i)} style={styles.removeBtn}>
                <Ionicons name="close-circle" size={24} color={colors.error} />
              </TouchableOpacity>
            </View>
          ))}

          <View style={{ height: 100 }} />
        </ScrollView>

        <View style={styles.bottomBar}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total estimado</Text>
            <Text style={styles.totalValue}>{formatFullCurrency(orderTotal)}</Text>
          </View>
          <TouchableOpacity
            style={[styles.confirmBtn, isSubmitting && styles.btnDisabled]}
            onPress={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.confirmBtnText}>Confirmar orden</Text>}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      <SearchableList
        visible={showClientPicker}
        onClose={() => setShowClientPicker(false)}
        data={clients}
        title="Clientes"
        keyExtractor={c => c.id}
        filterFn={(c, q) => c.name.toLowerCase().includes(q.toLowerCase())}
        renderItem={c => (
          <TouchableOpacity style={styles.listItem} onPress={() => { setSelectedClient(c); setShowClientPicker(false); }}>
            <Text style={styles.listItemText}>{c.name}</Text>
          </TouchableOpacity>
        )}
      />

      <SearchableList
        visible={showBranchPicker}
        onClose={() => setShowBranchPicker(false)}
        data={clientBranches}
        title="Sucursales"
        keyExtractor={b => b.id}
        filterFn={(b, q) => b.name.toLowerCase().includes(q.toLowerCase())}
        renderItem={b => (
          <TouchableOpacity style={styles.listItem} onPress={() => { setSelectedBranch(b); setShowBranchPicker(false); }}>
            <Text style={styles.listItemText}>{b.name}</Text>
          </TouchableOpacity>
        )}
      />

      <SearchableList
        visible={showProductPicker}
        onClose={() => setShowProductPicker(false)}
        data={products.filter(p => p.category === 'PT')}
        title="Productos"
        keyExtractor={p => p.id}
        filterFn={(p, q) => p.name.toLowerCase().includes(q.toLowerCase())}
        renderItem={p => (
          <TouchableOpacity style={styles.listItem} onPress={() => handleAddProduct(p)}>
            <Text style={styles.listItemText}>{p.name}</Text>
            <Text style={styles.listItemSubText}>{formatFullCurrency(p.price || 0)}</Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: { flex: 1 },
  content: { padding: 24, paddingTop: Platform.OS === 'ios' ? 100 : 80 },
  mainTitle: { ...typography.largeTitle, fontWeight: '800', marginBottom: 32 },
  fieldSection: { marginBottom: 24 },
  label: { ...typography.caption1, fontWeight: '700', textTransform: 'uppercase', color: colors.textSecondary, marginBottom: 8 },
  pickerTrigger: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#F3F3F3', borderRadius: 8, padding: 16, height: 56 },
  pickerValue: { ...typography.body, fontSize: 16, fontWeight: '600' },
  placeholder: { color: colors.textTertiary },
  dateScroll: { flexDirection: 'row', marginTop: 8 },
  dateCard: { width: 64, height: 80, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F3F3F3', borderRadius: 8, marginRight: 12 },
  dateCardSelected: { backgroundColor: colors.primary },
  dateDay: { ...typography.caption2, fontWeight: '600', textTransform: 'uppercase' },
  dateNum: { ...typography.title2, fontWeight: '700', marginTop: 2 },
  dateTextSelected: { color: '#fff' },
  divider: { height: 1, backgroundColor: '#EEEEEE', marginVertical: 32 },
  itemsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  sectionTitle: { ...typography.title3, fontWeight: '800' },
  addItemBtn: { backgroundColor: '#F3F3F3', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  addItemBtnText: { ...typography.subhead, fontWeight: '700' },
  itemRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#EEEEEE' },
  itemName: { ...typography.headline, fontSize: 16, fontWeight: '700' },
  itemPrice: { ...typography.caption1, color: colors.textSecondary, marginTop: 2 },
  qtyContainer: { width: 60, height: 40, backgroundColor: '#F3F3F3', borderRadius: 4, justifyContent: 'center', alignItems: 'center', marginHorizontal: 12 },
  qtyInput: { ...typography.body, fontWeight: '700', textAlign: 'center', width: '100%' },
  removeBtn: { padding: 4 },
  bottomBar: { padding: 24, paddingBottom: Platform.OS === 'ios' ? 40 : 24, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#EEEEEE' },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  totalLabel: { ...typography.body, color: colors.textSecondary },
  totalValue: { ...typography.title2, fontWeight: '800' },
  confirmBtn: { backgroundColor: colors.primary, height: 56, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  confirmBtnText: { ...typography.headline, color: '#fff', fontSize: 18, fontWeight: '700' },
  btnDisabled: { opacity: 0.6 },
  listItem: { padding: 20, borderBottomWidth: 1, borderBottomColor: '#EEEEEE' },
  listItemText: { ...typography.body, fontWeight: '600' },
  listItemSubText: { ...typography.caption1, color: colors.textSecondary, marginTop: 4 },
});
