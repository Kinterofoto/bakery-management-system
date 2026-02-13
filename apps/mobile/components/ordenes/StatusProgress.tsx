import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../../theme/colors';

const STAGES = [
  { id: 1, label: 'Recibido', icon: '📦' },
  { id: 2, label: 'Listado', icon: '📋' },
  { id: 3, label: 'Proyección', icon: '🔍' },
  { id: 4, label: 'Facturado', icon: '📄' },
  { id: 5, label: 'Despachado', icon: '🚛' },
  { id: 6, label: 'En Ruta', icon: '🗺️' },
  { id: 7, label: 'Entregado', icon: '✅' },
];

const STATUS_TO_STAGE: Record<string, number> = {
  received: 1,
  review_area1: 2,
  review_area2: 3,
  ready_dispatch: 4,
  dispatched: 5,
  in_delivery: 6,
  delivered: 7,
  partially_delivered: 7,
  returned: 7,
  cancelled: 0,
};

interface StatusProgressProps {
  status: string;
  compact?: boolean;
}

export function StatusProgress({ status, compact = false }: StatusProgressProps) {
  const currentStage = STATUS_TO_STAGE[status] ?? 0;

  if (status === 'cancelled') {
    return (
      <View style={styles.cancelledBadge}>
        <Text style={styles.cancelledText}>Cancelado</Text>
      </View>
    );
  }

  if (compact) {
    return (
      <View style={styles.compactContainer}>
        {STAGES.map((stage, index) => (
          <View key={stage.id} style={styles.compactStepRow}>
            <View
              style={[
                styles.compactDot,
                currentStage >= stage.id && styles.compactDotActive,
                currentStage === stage.id && styles.compactDotCurrent,
              ]}
            />
            {index < STAGES.length - 1 && (
              <View
                style={[
                  styles.compactLine,
                  currentStage > stage.id && styles.compactLineActive,
                ]}
              />
            )}
          </View>
        ))}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {STAGES.map((stage, index) => (
        <View key={stage.id} style={styles.stepRow}>
          <View
            style={[
              styles.dot,
              currentStage >= stage.id && styles.dotActive,
              currentStage === stage.id && styles.dotCurrent,
            ]}
          >
            <Text style={styles.dotIcon}>
              {currentStage >= stage.id ? stage.icon : ''}
            </Text>
          </View>
          {index < STAGES.length - 1 && (
            <View
              style={[
                styles.line,
                currentStage > stage.id && styles.lineActive,
              ]}
            />
          )}
        </View>
      ))}
    </View>
  );
}

export function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    received: 'Recibido',
    review_area1: 'Revisión Área 1',
    review_area2: 'Revisión Área 2',
    ready_dispatch: 'Listo Despacho',
    dispatched: 'Despachado',
    in_delivery: 'En Entrega',
    delivered: 'Entregado',
    partially_delivered: 'Entrega Parcial',
    returned: 'Devuelto',
    cancelled: 'Cancelado',
  };
  return labels[status] || status;
}

export function getStatusColor(status: string): string {
  const map: Record<string, string> = {
    received: colors.statusReceived,
    review_area1: colors.statusReview,
    review_area2: colors.statusReview,
    ready_dispatch: colors.statusReady,
    dispatched: colors.statusDispatched,
    in_delivery: colors.statusDelivery,
    delivered: colors.statusDelivered,
    partially_delivered: colors.warning,
    returned: colors.error,
    cancelled: colors.error,
  };
  return map[status] || colors.textSecondary;
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dot: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dotActive: {
    backgroundColor: colors.primary,
  },
  dotCurrent: {
    borderWidth: 2,
    borderColor: colors.primaryLight,
  },
  dotIcon: {
    fontSize: 12,
  },
  line: {
    width: 8,
    height: 2,
    backgroundColor: '#E5E7EB',
  },
  lineActive: {
    backgroundColor: colors.primary,
  },

  // Compact
  compactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  compactStepRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  compactDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#E5E7EB',
  },
  compactDotActive: {
    backgroundColor: colors.primary,
  },
  compactDotCurrent: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: colors.primaryLight,
  },
  compactLine: {
    width: 6,
    height: 1.5,
    backgroundColor: '#E5E7EB',
  },
  compactLineActive: {
    backgroundColor: colors.primary,
  },

  // Cancelled
  cancelledBadge: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  cancelledText: {
    color: colors.error,
    fontSize: 12,
    fontWeight: '600',
  },
});
