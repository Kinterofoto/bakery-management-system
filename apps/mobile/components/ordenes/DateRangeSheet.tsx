import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, Pressable, Platform } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { formatDateLong } from '../../utils/formatters';

interface DateRangeSheetProps {
  visible: boolean;
  onClose: () => void;
  onApply: (from: Date, to: Date) => void;
  initialFrom?: Date;
  initialTo?: Date;
}

export function DateRangeSheet({
  visible,
  onClose,
  onApply,
  initialFrom,
  initialTo,
}: DateRangeSheetProps) {
  const [fromDate, setFromDate] = useState(initialFrom ?? new Date());
  const [toDate, setToDate] = useState(initialTo ?? new Date());
  const [picking, setPicking] = useState<'from' | 'to'>('from');

  const handleApply = () => {
    const from = fromDate < toDate ? fromDate : toDate;
    const to = fromDate < toDate ? toDate : fromDate;
    onApply(from, to);
    onClose();
  };

  const toISODate = (d: Date) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <Pressable style={styles.overlay} onPress={onClose}>
        <View style={styles.sheet} onStartShouldSetResponder={() => true}>
          <View style={styles.handle} />
          <Text style={styles.title}>Rango de fechas</Text>

          <View style={styles.tabs}>
            <TouchableOpacity
              style={[styles.tab, picking === 'from' && styles.tabActive]}
              onPress={() => setPicking('from')}
            >
              <Text style={styles.tabLabel}>Desde</Text>
              <Text style={[styles.tabValue, picking === 'from' && styles.tabValueActive]}>
                {formatDateLong(toISODate(fromDate))}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, picking === 'to' && styles.tabActive]}
              onPress={() => setPicking('to')}
            >
              <Text style={styles.tabLabel}>Hasta</Text>
              <Text style={[styles.tabValue, picking === 'to' && styles.tabValueActive]}>
                {formatDateLong(toISODate(toDate))}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.pickerContainer}>
            <DateTimePicker
              key={picking}
              value={picking === 'from' ? fromDate : toDate}
              mode="date"
              display="inline"
              locale="es"
              onChange={(_, date) => {
                if (date) {
                  picking === 'from' ? setFromDate(date) : setToDate(date);
                }
              }}
              style={styles.picker}
            />
          </View>

          <TouchableOpacity style={styles.applyBtn} onPress={handleApply}>
            <Text style={styles.applyBtnText}>Aplicar</Text>
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
  tabs: {
    flexDirection: 'row',
    marginHorizontal: 24,
    gap: 12,
    marginBottom: 8,
  },
  tab: {
    flex: 1,
    backgroundColor: '#F6F6F6',
    borderRadius: 10,
    padding: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  tabActive: {
    borderColor: '#000000',
  },
  tabLabel: {
    ...typography.caption1,
    fontWeight: '600',
    color: colors.textTertiary,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  tabValue: {
    ...typography.subhead,
    fontWeight: '600',
    color: colors.text,
  },
  tabValueActive: {
    fontWeight: '700',
  },
  pickerContainer: {
    alignItems: 'center',
    marginVertical: 8,
  },
  picker: {
    height: 320,
    width: '100%',
  },
  applyBtn: {
    marginTop: 8,
    marginHorizontal: 24,
    height: 54,
    backgroundColor: '#000000',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  applyBtnText: {
    ...typography.headline,
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
