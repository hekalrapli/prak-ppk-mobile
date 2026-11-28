import { SymbolView } from 'expo-symbols';
import { useMemo, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppButton } from '@/components/ui/app-button';
import { Radius, Shadow, Spacing, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { ScheduleDateIndicator } from '@/lib/schedule-organizer';
import {
  formatMonthYearLabel,
  getStartOfDayTimestamp,
} from '@/lib/session-date';

const WEEKDAYS = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'] as const;

interface CalendarDateModalProps {
  visible: boolean;
  selectedDateMs: number | null;
  dateIndicators: Record<number, ScheduleDateIndicator>;
  onSelectDate: (midnightMs: number | null) => void;
  onClose: () => void;
}

/**
 * Bottom sheet kalender bulanan murni React Native (tanpa dependensi native baru).
 * Menandai tanggal yang memiliki jadwal praktikum dengan titik warna sesuai status.
 */
export function CalendarDateModal({
  visible,
  selectedDateMs,
  dateIndicators,
  onSelectDate,
  onClose,
}: CalendarDateModalProps) {
  const theme = useTheme();

  return (
    <Modal
      animationType="fade"
      onRequestClose={onClose}
      transparent
      visible={visible}>
      <View style={[styles.overlay, { backgroundColor: theme.overlay }]}>
        <Pressable
          accessibilityLabel="Tutup kalender tanggal"
          onPress={onClose}
          style={StyleSheet.absoluteFill}
        />

        {visible ? (
          <CalendarSheetContent
            dateIndicators={dateIndicators}
            onClose={onClose}
            onSelectDate={onSelectDate}
            selectedDateMs={selectedDateMs}
          />
        ) : null}
      </View>
    </Modal>
  );
}

interface CalendarCell {
  key: string;
  day: number | null;
  midnightMs: number | null;
}

function buildMonthRows(year: number, monthIndex: number): CalendarCell[][] {
  const firstWeekday = new Date(year, monthIndex, 1).getDay();
  const leadingBlanks = (firstWeekday + 6) % 7; // Senin = 0 .. Minggu = 6
  const totalDays = new Date(year, monthIndex + 1, 0).getDate();
  const trailingBlanks = (7 - ((leadingBlanks + totalDays) % 7)) % 7;

  const cells: CalendarCell[] = [];
  for (let i = 0; i < leadingBlanks; i += 1) {
    cells.push({ key: `lead-${i}`, day: null, midnightMs: null });
  }
  for (let day = 1; day <= totalDays; day += 1) {
    const midnightMs = new Date(year, monthIndex, day).getTime();
    cells.push({ key: `day-${midnightMs}`, day, midnightMs });
  }
  for (let i = 0; i < trailingBlanks; i += 1) {
    cells.push({ key: `trail-${i}`, day: null, midnightMs: null });
  }

  const rows: CalendarCell[][] = [];
  for (let i = 0; i < cells.length; i += 7) {
    rows.push(cells.slice(i, i + 7));
  }
  return rows;
}

function CalendarSheetContent({
  selectedDateMs,
  dateIndicators,
  onSelectDate,
  onClose,
}: Omit<CalendarDateModalProps, 'visible'>) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [todayMs] = useState<number>(() => getStartOfDayTimestamp(new Date()));

  const [viewMonth, setViewMonth] = useState<{ year: number; month: number }>(() => {
    const base = new Date(selectedDateMs ?? todayMs);
    return { year: base.getFullYear(), month: base.getMonth() };
  });

  const rows = useMemo(
    () => buildMonthRows(viewMonth.year, viewMonth.month),
    [viewMonth.year, viewMonth.month]
  );

  const handlePrevMonth = () => {
    setViewMonth((prev) =>
      prev.month === 0
        ? { year: prev.year - 1, month: 11 }
        : { year: prev.year, month: prev.month - 1 }
    );
  };

  const handleNextMonth = () => {
    setViewMonth((prev) =>
      prev.month === 11
        ? { year: prev.year + 1, month: 0 }
        : { year: prev.year, month: prev.month + 1 }
    );
  };

  const handlePick = (midnightMs: number | null) => {
    onSelectDate(midnightMs);
    onClose();
  };

  const getDotColor = (indicator: ScheduleDateIndicator, selected: boolean) => {
    if (selected) {
      return theme.onPrimary;
    }
    if (indicator === 'open') {
      return theme.success;
    }
    if (indicator === 'upcoming') {
      return theme.link;
    }
    return theme.textTertiary;
  };

  return (
    <View
      accessibilityViewIsModal
      style={[
        styles.sheet,
        Shadow.sheet,
        {
          backgroundColor: theme.surface,
          paddingBottom: Math.max(insets.bottom, Spacing.three),
        },
      ]}>
      <View style={[styles.handle, { backgroundColor: theme.borderStrong }]} />

      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.textPrimary }]}>
          Filter Tanggal
        </Text>
        <Pressable
          accessibilityLabel="Tutup"
          accessibilityRole="button"
          hitSlop={8}
          onPress={onClose}
          style={styles.closeBtn}>
          <Text style={[styles.closeLabel, { color: theme.textSecondary }]}>
            Tutup
          </Text>
        </Pressable>
      </View>

      <View style={styles.monthBar}>
        <Pressable
          accessibilityLabel="Bulan sebelumnya"
          accessibilityRole="button"
          onPress={handlePrevMonth}
          style={({ pressed }) => [
            styles.monthNavBtn,
            {
              backgroundColor: theme.surfaceSubtle,
              borderColor: theme.border,
              opacity: pressed ? 0.78 : 1,
            },
          ]}>
          <SymbolView
            name={{ ios: 'chevron.left', android: 'chevron_left', web: 'chevron_left' }}
            size={20}
            tintColor={theme.textPrimary}
          />
        </Pressable>

        <Text style={[styles.monthLabel, { color: theme.textPrimary }]}>
          {formatMonthYearLabel(viewMonth.year, viewMonth.month)}
        </Text>

        <Pressable
          accessibilityLabel="Bulan berikutnya"
          accessibilityRole="button"
          onPress={handleNextMonth}
          style={({ pressed }) => [
            styles.monthNavBtn,
            {
              backgroundColor: theme.surfaceSubtle,
              borderColor: theme.border,
              opacity: pressed ? 0.78 : 1,
            },
          ]}>
          <SymbolView
            name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' }}
            size={20}
            tintColor={theme.textPrimary}
          />
        </Pressable>
      </View>

      <View style={styles.weekdayRow}>
        {WEEKDAYS.map((dayName) => (
          <View key={dayName} style={styles.weekdayCell}>
            <Text style={[styles.weekdayText, { color: theme.textTertiary }]}>
              {dayName}
            </Text>
          </View>
        ))}
      </View>

      <View style={styles.grid}>
        {rows.map((week, weekIndex) => (
          <View key={`week-${weekIndex}`} style={styles.weekRow}>
            {week.map((cell) => {
              if (cell.day === null || cell.midnightMs === null) {
                return <View key={cell.key} style={styles.dayCell} />;
              }

              const ms = cell.midnightMs;
              const selected = selectedDateMs === ms;
              const isToday = todayMs === ms;
              const indicator = dateIndicators[ms];

              return (
                <Pressable
                  key={cell.key}
                  accessibilityLabel={`${cell.day} ${formatMonthYearLabel(viewMonth.year, viewMonth.month)}${indicator ? ', ada jadwal praktikum' : ''}`}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  onPress={() => handlePick(ms)}
                  style={({ pressed }) => [
                    styles.dayCell,
                    { opacity: pressed ? 0.75 : 1 },
                  ]}>
                  <View
                    style={[
                      styles.dayCircle,
                      selected
                        ? { backgroundColor: theme.primary }
                        : isToday
                          ? {
                              backgroundColor: theme.primarySoft,
                              borderColor: theme.link,
                              borderWidth: 1.5,
                            }
                          : undefined,
                    ]}>
                    <Text
                      style={[
                        styles.dayNumber,
                        {
                          color: selected
                            ? theme.onPrimary
                            : isToday
                              ? theme.link
                              : theme.textPrimary,
                          fontWeight: selected || isToday ? '700' : '500',
                        },
                      ]}>
                      {cell.day}
                    </Text>
                    <View style={styles.dotSlot}>
                      {indicator ? (
                        <View
                          style={[
                            styles.dot,
                            { backgroundColor: getDotColor(indicator, selected) },
                          ]}
                        />
                      ) : null}
                    </View>
                  </View>
                </Pressable>
              );
            })}
          </View>
        ))}
      </View>

      <View style={[styles.legend, { backgroundColor: theme.surfaceSubtle }]}>
        <LegendItem color={theme.success} label="Dibuka" />
        <LegendItem color={theme.link} label="Mendatang" />
        <LegendItem color={theme.textTertiary} label="Selesai" />
      </View>

      <View style={styles.footerActions}>
        <View style={styles.footerBtn}>
          <AppButton
            label="Hari ini"
            onPress={() => handlePick(todayMs)}
            variant="secondary"
          />
        </View>
        <View style={styles.footerBtn}>
          <AppButton
            label="Semua tanggal"
            onPress={() => handlePick(null)}
            variant={selectedDateMs !== null ? 'primary' : 'secondary'}
          />
        </View>
      </View>
    </View>
  );
}

function LegendItem({ color, label }: { color: string; label: string }) {
  const theme = useTheme();
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendDot, { backgroundColor: color }]} />
      <Text style={[styles.legendText, { color: theme.textSecondary }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  sheet: {
    width: '100%',
    maxWidth: 560,
    borderTopLeftRadius: Radius.sheet,
    borderTopRightRadius: Radius.sheet,
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.two,
    gap: Spacing.two,
  },
  handle: {
    alignSelf: 'center',
    width: 44,
    height: 4,
    borderRadius: Radius.full,
    marginBottom: Spacing.one,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  title: { ...Typography.sectionTitle },
  closeBtn: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: Spacing.one,
  },
  closeLabel: { ...Typography.label },
  monthBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  monthNavBtn: {
    width: 44,
    height: 44,
    borderRadius: Radius.full,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthLabel: {
    ...Typography.cardTitle,
    textAlign: 'center',
    flex: 1,
  },
  weekdayRow: {
    flexDirection: 'row',
    marginTop: Spacing.one,
  },
  weekdayCell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.one,
  },
  weekdayText: {
    ...Typography.caption,
    fontWeight: '600',
  },
  grid: { gap: Spacing.one },
  weekRow: { flexDirection: 'row' },
  dayCell: {
    flex: 1,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayCircle: {
    width: 40,
    height: 40,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayNumber: {
    ...Typography.label,
    fontVariant: ['tabular-nums'],
  },
  dotSlot: {
    height: 6,
    marginTop: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: Radius.full,
  },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.three,
    borderRadius: Radius.md,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    marginTop: Spacing.one,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 7,
    height: 7,
    borderRadius: Radius.full,
  },
  legendText: { ...Typography.caption },
  footerActions: {
    flexDirection: 'row',
    gap: Spacing.two,
    marginTop: Spacing.one,
  },
  footerBtn: { flex: 1 },
});
