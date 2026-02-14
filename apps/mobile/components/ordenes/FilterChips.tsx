import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';

interface FilterChip {
  key: string;
  label: string;
  count?: number;
}

interface FilterChipsProps {
  chips: FilterChip[];
  selected: string;
  onSelect: (key: string) => void;
}

export function FilterChips({ chips, selected, onSelect }: FilterChipsProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
    >
      {chips.map((chip) => {
        const isActive = chip.key === selected;
        return (
          <TouchableOpacity
            key={chip.key}
            style={[styles.chip, isActive && styles.chipActive]}
            onPress={() => onSelect(chip.key)}
            activeOpacity={0.8}
          >
            <Text style={[styles.chipText, isActive && styles.chipTextActive]}>
              {chip.label}
            </Text>
            {chip.count !== undefined && (
              <View style={[styles.badge, isActive && styles.badgeActive]}>
                <Text style={[styles.badgeText, isActive && styles.badgeTextActive]}>
                  {chip.count}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#EEEEEE',
  },
  chipActive: {
    backgroundColor: colors.primary,
  },
  chipText: {
    ...typography.subhead,
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  chipTextActive: {
    color: '#FFFFFF',
  },
  badge: {
    backgroundColor: 'rgba(0,0,0,0.05)',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 10,
    marginLeft: 6,
    minWidth: 20,
    alignItems: 'center',
  },
  badgeActive: {
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  badgeText: {
    ...typography.caption2,
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  badgeTextActive: {
    color: '#FFFFFF',
  },
});
