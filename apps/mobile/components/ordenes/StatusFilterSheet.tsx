import { View, Text, TouchableOpacity, StyleSheet, Modal, Pressable } from 'react-native';
import { getStatusLabel, getStatusColor } from './StatusProgress';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';

const ALL_STATUSES = [
  'all',
  'received',
  'review_area1',
  'review_area2',
  'ready_dispatch',
  'dispatched',
  'in_delivery',
  'delivered',
  'partially_delivered',
  'cancelled',
];

interface StatusFilterSheetProps {
  visible: boolean;
  onClose: () => void;
  selected: string;
  onSelect: (status: string) => void;
}

export function StatusFilterSheet({
  visible,
  onClose,
  selected,
  onSelect,
}: StatusFilterSheetProps) {
  return (
    <Modal visible={visible} transparent animationType="slide">
      <Pressable style={styles.overlay} onPress={onClose}>
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <Text style={styles.title}>Filtrar por estado</Text>

          {ALL_STATUSES.map((status) => {
            const isActive = status === selected;
            const label = status === 'all' ? 'Todos los estados' : getStatusLabel(status);
            const statusColor = status === 'all' ? colors.textSecondary : getStatusColor(status);

            return (
              <TouchableOpacity
                key={status}
                style={[styles.option, isActive && styles.optionActive]}
                onPress={() => {
                  onSelect(status);
                  onClose();
                }}
                activeOpacity={0.7}
              >
                {status !== 'all' && (
                  <View style={[styles.dot, { backgroundColor: statusColor }]} />
                )}
                <Text style={[styles.optionText, isActive && styles.optionTextActive]}>
                  {label}
                </Text>
                {isActive && <Text style={styles.check}>✓</Text>}
              </TouchableOpacity>
            );
          })}
        </View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingBottom: 40,
    paddingTop: 12,
  },
  handle: {
    width: 36,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.separator,
    alignSelf: 'center',
    marginBottom: 16,
  },
  title: {
    ...typography.headline,
    color: colors.text,
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    gap: 12,
  },
  optionActive: {
    backgroundColor: colors.primaryLight,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  optionText: {
    ...typography.body,
    color: colors.text,
    flex: 1,
  },
  optionTextActive: {
    fontWeight: '600',
    color: colors.primary,
  },
  check: {
    ...typography.body,
    color: colors.primary,
    fontWeight: '700',
  },
});
