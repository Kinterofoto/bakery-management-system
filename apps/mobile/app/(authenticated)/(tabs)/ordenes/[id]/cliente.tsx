import { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { OrdersService, OrderDetail } from '../../../../../services/orders.service';
import { typography } from '../../../../../theme/typography';
import { colors } from '../../../../../theme/colors';
import { formatDateLong } from '../../../../../utils/formatters';

export default function ClienteScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    OrdersService.getOrder(id).then((result) => {
      if (result.data) setOrder(result.data);
      setIsLoading(false);
    });
  }, [id]);

  if (isLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#000" />
      </View>
    );
  }

  if (!order) return null;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Stack.Screen options={{ title: 'Datos del Cliente' }} />

      <Text style={styles.clientName}>{order.client_name}</Text>

      <View style={styles.card}>
        {order.branch_name && (
          <InfoRow icon="business" label="Sucursal" value={order.branch_name} />
        )}
        {order.branch_address && (
          <InfoRow icon="location" label="Dirección" value={order.branch_address} />
        )}
        <InfoRow
          icon="calendar"
          label="Fecha de entrega"
          value={order.expected_delivery_date ? formatDateLong(order.expected_delivery_date) : '—'}
        />
        {order.purchase_order_number && (
          <InfoRow icon="document-text" label="Orden de compra" value={order.purchase_order_number} />
        )}
        {order.observations && (
          <InfoRow icon="chatbubble" label="Observaciones" value={order.observations} />
        )}
        {order.created_by_name && (
          <InfoRow icon="person" label="Creado por" value={order.created_by_name} />
        )}
        {order.client_phone && (
          <InfoRow icon="call" label="Teléfono" value={order.client_phone} />
        )}
        {order.client_email && (
          <InfoRow icon="mail" label="Email" value={order.client_email} />
        )}
      </View>
    </ScrollView>
  );
}

function InfoRow({ icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <View style={styles.row}>
      <View style={styles.rowIcon}>
        <Ionicons name={icon} size={18} color="#545454" />
      </View>
      <View style={styles.rowContent}>
        <Text style={styles.rowLabel}>{label}</Text>
        <Text style={styles.rowValue}>{value}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF' },
  content: { padding: 24 },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFF' },
  clientName: {
    ...typography.title1,
    fontWeight: '800',
    color: '#000',
    marginBottom: 24,
  },
  card: {
    backgroundColor: '#FAFAFA',
    borderRadius: 16,
    padding: 20,
    gap: 20,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
  },
  rowIcon: { width: 22, alignItems: 'center', marginTop: 2 },
  rowContent: { flex: 1 },
  rowLabel: {
    ...typography.caption1,
    fontWeight: '700',
    color: '#AFAFAF',
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  rowValue: {
    ...typography.body,
    fontSize: 16,
    color: '#000',
    lineHeight: 22,
  },
});
