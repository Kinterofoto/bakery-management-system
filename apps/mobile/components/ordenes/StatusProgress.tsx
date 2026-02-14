import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../../theme/colors';

const STATUS_TO_STEP: Record<string, number> = {
  received: 1,
  ready_dispatch: 2,
  dispatched: 3,
  delivered: 4,
  partially_delivered: 4,
};

interface StatusProgressProps {
  status: string;
}

export function StatusProgress({ status }: StatusProgressProps) {
  const currentStep = STATUS_TO_STEP[status] ?? 1;
  const isCancelled = status === 'cancelled';

  if (isCancelled) {
    return (
      <View style={styles.cancelledBadge}>
        <Text style={styles.cancelledText}>Cancelado</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.stepsRow}>
        {[1, 2, 3, 4].map((step) => (
          <View key={step} style={styles.stepWrapper}>
            <View style={[
              styles.bar,
              currentStep >= step ? styles.barActive : styles.barInactive
            ]} />
          </View>
        ))}
      </View>
      <Text style={styles.statusLabel}>{getStatusLabel(status)}</Text>
    </View>
  );
}

export function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    received: 'Enviado',
    review_area1: 'En revisión',
    review_area2: 'Procesando',
    ready_dispatch: 'Listo para despacho',
    dispatched: 'En camino',
    in_delivery: 'Cerca de ti',
    delivered: 'Entregado',
    partially_delivered: 'Entrega parcial',
    returned: 'Devuelto',
    cancelled: 'Cancelado',
  };
  return labels[status] || 'Procesando';
}

export function getStatusColor(status: string): string {
  const map: Record<string, string> = {
    received: '#000000',
    review_area1: '#FFC043',
    review_area2: '#FFC043',
    ready_dispatch: '#276EF1',
    dispatched: '#05A357',
    in_delivery: '#276EF1',
    delivered: '#05A357',
    partially_delivered: '#FFC043',
    returned: '#E11900',
    cancelled: '#E11900',
  };
  return map[status] || '#545454';
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    gap: 8,
  },
  stepsRow: {
    flexDirection: 'row',
    gap: 4,
  },
  stepWrapper: {
    flex: 1,
  },
  bar: {
    height: 4,
    borderRadius: 2,
  },
  barActive: {
    backgroundColor: '#000000',
  },
  barInactive: {
    backgroundColor: '#EEEEEE',
  },
  statusLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#000000',
  },
  cancelledBadge: {
    backgroundColor: '#F6F6F6',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#E11900',
  },
  cancelledText: {
    color: '#E11900',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
});
