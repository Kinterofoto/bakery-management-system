import { useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, Pressable, Platform, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';

const DAYS = ['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sa', 'Do'];
const MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

function toKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function sameDay(a: Date | null, b: Date | null) {
  if (!a || !b) return false;
  return toKey(a) === toKey(b);
}

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
  const [startDate, setStartDate] = useState<Date | null>(initialFrom ?? null);
  const [endDate, setEndDate] = useState<Date | null>(initialTo ?? null);
  const [viewMonth, setViewMonth] = useState(() => {
    const d = initialFrom ?? new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });

  const days = useMemo(() => {
    const year = viewMonth.getFullYear();
    const month = viewMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    // Monday = 0 in our grid
    let startWeekday = firstDay.getDay() - 1;
    if (startWeekday < 0) startWeekday = 6;
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const cells: (Date | null)[] = [];
    for (let i = 0; i < startWeekday; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }, [viewMonth]);

  const handleDayPress = (date: Date) => {
    if (!startDate || (startDate && endDate)) {
      // First tap or reset
      setStartDate(date);
      setEndDate(null);
    } else {
      // Second tap
      if (date < startDate) {
        setEndDate(startDate);
        setStartDate(date);
      } else {
        setEndDate(date);
      }
    }
  };

  const handleApply = () => {
    if (startDate && endDate) {
      onApply(startDate, endDate);
      onClose();
    } else if (startDate) {
      onApply(startDate, startDate);
      onClose();
    }
  };

  const prevMonth = () => setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() - 1, 1));
  const nextMonth = () => setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 1));

  const isInRange = (date: Date) => {
    if (!startDate || !endDate) return false;
    return date > startDate && date < endDate;
  };

  const isStart = (date: Date) => sameDay(date, startDate);
  const isEnd = (date: Date) => sameDay(date, endDate);
  const isToday = (date: Date) => toKey(date) === toKey(new Date());

  const hasSelection = startDate !== null;
  const label = !startDate
    ? 'Selecciona fecha inicial'
    : !endDate
    ? 'Selecciona fecha final'
    : '';

  return (
    <Modal visible={visible} transparent animationType="slide">
      <Pressable style={styles.overlay} onPress={onClose}>
        <View style={styles.sheet} onStartShouldSetResponder={() => true}>
          <View style={styles.handle} />
          <Text style={styles.title}>Rango de fechas</Text>

          {label ? <Text style={styles.hint}>{label}</Text> : null}

          {/* Month nav */}
          <View style={styles.monthRow}>
            <TouchableOpacity onPress={prevMonth} hitSlop={12}>
              <Ionicons name="chevron-back" size={22} color="#000" />
            </TouchableOpacity>
            <Text style={styles.monthLabel}>
              {MONTHS[viewMonth.getMonth()]} {viewMonth.getFullYear()}
            </Text>
            <TouchableOpacity onPress={nextMonth} hitSlop={12}>
              <Ionicons name="chevron-forward" size={22} color="#000" />
            </TouchableOpacity>
          </View>

          {/* Weekday headers */}
          <View style={styles.weekRow}>
            {DAYS.map((d) => (
              <View key={d} style={styles.dayCell}>
                <Text style={styles.weekDayText}>{d}</Text>
              </View>
            ))}
          </View>

          {/* Days grid */}
          <View style={styles.grid}>
            {days.map((date, i) => {
              if (!date) {
                return <View key={`empty-${i}`} style={styles.dayCell} />;
              }

              const start = isStart(date);
              const end = isEnd(date);
              const inRange = isInRange(date);
              const today = isToday(date);
              const selected = start || end;

              return (
                <TouchableOpacity
                  key={toKey(date)}
                  style={[
                    styles.dayCell,
                    inRange && styles.dayCellRange,
                    start && styles.dayCellRangeStart,
                    end && styles.dayCellRangeEnd,
                  ]}
                  onPress={() => handleDayPress(date)}
                  activeOpacity={0.6}
                >
                  <View style={[
                    styles.dayCircle,
                    selected && styles.dayCircleSelected,
                  ]}>
                    <Text style={[
                      styles.dayText,
                      today && !selected && styles.dayTextToday,
                      selected && styles.dayTextSelected,
                      inRange && styles.dayTextRange,
                    ]}>
                      {date.getDate()}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>

          <TouchableOpacity
            style={[styles.applyBtn, !hasSelection && styles.applyBtnDisabled]}
            onPress={handleApply}
            disabled={!hasSelection}
          >
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
    marginBottom: 16,
  },
  title: {
    ...typography.title3,
    fontWeight: '800',
    color: '#000',
    paddingHorizontal: 24,
  },
  hint: {
    ...typography.caption1,
    color: colors.textTertiary,
    paddingHorizontal: 24,
    marginTop: 4,
  },
  monthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    marginTop: 20,
    marginBottom: 12,
  },
  monthLabel: {
    ...typography.headline,
    fontWeight: '700',
    color: '#000',
  },
  weekRow: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    marginBottom: 4,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 12,
  },
  dayCell: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dayCellRange: {
    backgroundColor: '#F0F0F0',
  },
  dayCellRangeStart: {
    backgroundColor: '#F0F0F0',
    borderTopLeftRadius: 100,
    borderBottomLeftRadius: 100,
  },
  dayCellRangeEnd: {
    backgroundColor: '#F0F0F0',
    borderTopRightRadius: 100,
    borderBottomRightRadius: 100,
  },
  dayCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dayCircleSelected: {
    backgroundColor: '#000',
  },
  dayText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#000',
  },
  dayTextToday: {
    fontWeight: '800',
  },
  dayTextSelected: {
    color: '#FFF',
    fontWeight: '700',
  },
  dayTextRange: {
    color: '#000',
  },
  weekDayText: {
    ...typography.caption2,
    fontWeight: '600',
    color: colors.textTertiary,
    textTransform: 'uppercase',
  },
  applyBtn: {
    marginTop: 16,
    marginHorizontal: 24,
    height: 50,
    backgroundColor: '#000',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  applyBtnDisabled: {
    backgroundColor: '#EEEEEE',
  },
  applyBtnText: {
    ...typography.headline,
    fontSize: 16,
    fontWeight: '700',
    color: '#FFF',
  },
});
