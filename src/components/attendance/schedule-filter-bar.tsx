import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { SegmentedControl, type SegmentOption } from '@/components/ui/segmented-control';
import { Radius, Spacing, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type {
  ScheduleDateIndicator,
  SchedulePracticumOption,
  ScheduleStatusFilter,
} from '@/lib/schedule-organizer';
import { formatShortDateLabel } from '@/lib/session-date';
import { CalendarDateModal } from './calendar-date-modal';
import { PracticumPickerModal } from './practicum-picker-modal';

interface ScheduleFilterBarProps {
  statusFilter: ScheduleStatusFilter;
  onChangeStatus: (next: ScheduleStatusFilter) => void;
  statusCounts: {
    active: number;
    closed: number;
    all: number;
  };
  practicumOptions: SchedulePracticumOption[];
  selectedPracticumId: string | null;
  onSelectPracticum: (practicumId: string | null) => void;
  selectedDateMs: number | null;
  onSelectDate: (midnightMs: number | null) => void;
  dateIndicators: Record<number, ScheduleDateIndicator>;
}

/**
 * Panel filter terpadu untuk tab Jadwal Praktikan & Asisten:
 * - Baris 1: SegmentedControl status (`Aktif`, `Selesai`, `Semua`).
 * - Baris 2: Dua tombol dropdown sejajar — Praktikum & Kalender Tanggal (dengan reset cepat).
 */
export function ScheduleFilterBar({
  statusFilter,
  onChangeStatus,
  statusCounts,
  practicumOptions,
  selectedPracticumId,
  onSelectPracticum,
  selectedDateMs,
  onSelectDate,
  dateIndicators,
}: ScheduleFilterBarProps) {
  const theme = useTheme();
  const [practicumModalOpen, setPracticumModalOpen] = useState(false);
  const [calendarModalOpen, setCalendarModalOpen] = useState(false);

  const statusOptions = useMemo<SegmentOption<ScheduleStatusFilter>[]>(
    () => [
      { value: 'active', label: 'Aktif', count: statusCounts.active },
      { value: 'closed', label: 'Selesai', count: statusCounts.closed },
      { value: 'all', label: 'Semua', count: statusCounts.all },
    ],
    [statusCounts.active, statusCounts.closed, statusCounts.all]
  );

  const totalAcrossPracticums = useMemo(
    () => practicumOptions.reduce((sum, item) => sum + item.count, 0),
    [practicumOptions]
  );

  const selectedPracticumOption = useMemo(
    () => practicumOptions.find((item) => item.id === selectedPracticumId) ?? null,
    [practicumOptions, selectedPracticumId]
  );

  const showPracticumDropdown = practicumOptions.length > 1;
  const dateLabel =
    selectedDateMs !== null ? formatShortDateLabel(selectedDateMs) : 'Semua tanggal';

  return (
    <View
      style={[
        styles.wrapper,
        { backgroundColor: theme.background, borderBottomColor: theme.border },
      ]}>
      <View style={styles.inner}>
        <SegmentedControl
          onChange={onChangeStatus}
          options={statusOptions}
          value={statusFilter}
        />

        <View style={styles.dropdownRow}>
          {showPracticumDropdown ? (
            <DropdownTrigger
              accessibilityLabel={`Filter praktikum: ${selectedPracticumOption?.fullName ?? 'Semua praktikum'}`}
              active={selectedPracticumOption !== null}
              icon={{ ios: 'book.closed', android: 'menu_book', web: 'menu_book' }}
              label={selectedPracticumOption?.label ?? 'Semua praktikum'}
              onClear={
                selectedPracticumOption !== null
                  ? () => onSelectPracticum(null)
                  : undefined
              }
              onPress={() => setPracticumModalOpen(true)}
            />
          ) : null}

          <DropdownTrigger
            accessibilityLabel={`Filter tanggal: ${dateLabel}`}
            active={selectedDateMs !== null}
            icon={{ ios: 'calendar', android: 'calendar_today', web: 'calendar_today' }}
            label={dateLabel}
            onClear={selectedDateMs !== null ? () => onSelectDate(null) : undefined}
            onPress={() => setCalendarModalOpen(true)}
          />
        </View>
      </View>

      <PracticumPickerModal
        onClose={() => setPracticumModalOpen(false)}
        onSelect={onSelectPracticum}
        options={practicumOptions}
        selectedPracticumId={selectedPracticumId}
        totalCount={totalAcrossPracticums}
        visible={practicumModalOpen}
      />

      <CalendarDateModal
        dateIndicators={dateIndicators}
        onClose={() => setCalendarModalOpen(false)}
        onSelectDate={onSelectDate}
        selectedDateMs={selectedDateMs}
        visible={calendarModalOpen}
      />
    </View>
  );
}

interface DropdownTriggerProps {
  icon: SymbolViewProps['name'];
  label: string;
  active: boolean;
  accessibilityLabel: string;
  onPress: () => void;
  onClear?: () => void;
}

function DropdownTrigger({
  icon,
  label,
  active,
  accessibilityLabel,
  onPress,
  onClear,
}: DropdownTriggerProps) {
  const theme = useTheme();
  const fgColor = active ? theme.link : theme.textPrimary;
  const iconColor = active ? theme.link : theme.textSecondary;

  return (
    <View
      style={[
        styles.triggerContainer,
        {
          backgroundColor: active ? theme.primarySoft : theme.surface,
          borderColor: active ? theme.link : theme.borderStrong,
        },
      ]}>
      <Pressable
        accessibilityLabel={accessibilityLabel}
        accessibilityRole="button"
        onPress={onPress}
        style={({ pressed }) => [
          styles.triggerMain,
          { opacity: pressed ? 0.78 : 1 },
        ]}>
        <SymbolView name={icon} size={16} tintColor={iconColor} />
        <Text numberOfLines={1} style={[styles.triggerLabel, { color: fgColor }]}>
          {label}
        </Text>
        {!onClear ? (
          <SymbolView
            name={{
              ios: 'chevron.down',
              android: 'keyboard_arrow_down',
              web: 'keyboard_arrow_down',
            }}
            size={16}
            tintColor={iconColor}
          />
        ) : null}
      </Pressable>

      {onClear ? (
        <Pressable
          accessibilityLabel={`Hapus ${accessibilityLabel}`}
          accessibilityRole="button"
          hitSlop={4}
          onPress={onClear}
          style={({ pressed }) => [
            styles.clearBtn,
            { opacity: pressed ? 0.65 : 1 },
          ]}>
          <SymbolView
            name={{ ios: 'xmark', android: 'close', web: 'close' }}
            size={15}
            tintColor={theme.link}
          />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingTop: Spacing.two,
    paddingBottom: Spacing.two,
  },
  inner: {
    paddingHorizontal: Spacing.three,
    maxWidth: 560,
    width: '100%',
    alignSelf: 'center',
    gap: Spacing.two,
  },
  dropdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  triggerContainer: {
    flex: 1,
    minWidth: 0,
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Radius.lg,
    borderWidth: 1,
    overflow: 'hidden',
  },
  triggerMain: {
    flex: 1,
    minWidth: 0,
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingLeft: Spacing.two + 2,
    paddingRight: Spacing.two,
  },
  triggerLabel: {
    ...Typography.caption,
    fontWeight: '600',
    flex: 1,
    minWidth: 0,
  },
  clearBtn: {
    width: 36,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
