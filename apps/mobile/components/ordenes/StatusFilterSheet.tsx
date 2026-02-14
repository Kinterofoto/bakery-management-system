import { View, Text, TouchableOpacity, StyleSheet, Modal, Pressable, Platform } from 'react-native';
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
  'delivered',
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
        <View style={styles.sheet} onStartShouldSetResponder={() => true}>
          <View style={styles.handle} />
          <Text style={styles.title}>Estado del pedido</Text>

          <View style={styles.optionsContainer}>
            {ALL_STATUSES.map((status) => {
              const isActive = status === selected;
              const label = status === 'all' ? 'Ver todo' : getStatusLabel(status);
              const statusColor = status === 'all' ? colors.textSecondary : getStatusColor(status);

              return (
                <TouchableOpacity
                  key={status}
                  style={styles.option}
                  onPress={() => {
                    onSelect(status);
                    onClose();
                  }}
                  activeOpacity={0.6}
                >
                  <View style={styles.optionLeft}>
                    {status !== 'all' ? (
                      <View style={[styles.dot, { backgroundColor: statusColor }]} />
                    ) : (
                      <View style={[styles.dot, { backgroundColor: '#000' }]} />
                    )}
                    <Text style={[styles.optionText, isActive && styles.optionTextActive]}>
                      {label}
                    </Text>
                  </View>
                  <View style={[styles.radio, isActive && styles.radioActive]}>
                    {isActive && <View style={styles.radioInner} />}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>

          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <Text style={styles.closeBtnText}>Cerrar</Text>
          </TouchableOpacity>
        </View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
    paddingTop: 12,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#EEEEEE',
    alignSelf: 'center',
    marginBottom: 20,
  },
  title: {
    ...typography.title2,
    fontSize: 22,
    fontWeight: '800',
    color: '#000000',
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  optionsContainer: {
    paddingHorizontal: 8,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  optionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  optionText: {
    ...typography.body,
    fontSize: 18,
    color: '#000000',
    fontWeight: '500',
  },
  optionTextActive: {
    fontWeight: '700',
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#EEEEEE',
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioActive: {
    borderColor: '#000000',
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#000000',
  },
  closeBtn: {
    marginTop: 20,
    marginHorizontal: 24,
    height: 54,
    backgroundColor: '#EEEEEE',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeBtnText: {
    ...typography.headline,
    fontSize: 16,
    fontWeight: '700',
    color: '#000000',
  },
});
