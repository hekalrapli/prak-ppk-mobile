import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Radius, Shadow, Spacing, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { SchedulePracticumOption } from '@/lib/schedule-organizer';

interface PracticumPickerModalProps {
  visible: boolean;
  options: SchedulePracticumOption[];
  selectedPracticumId: string | null;
  totalCount: number;
  onSelect: (practicumId: string | null) => void;
  onClose: () => void;
}

/**
 * Bottom sheet dropdown untuk memilih mata kuliah / praktikum tanpa scroll horizontal.
 */
export function PracticumPickerModal({
  visible,
  options,
  selectedPracticumId,
  totalCount,
  onSelect,
  onClose,
}: PracticumPickerModalProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  const handleChoose = (practicumId: string | null) => {
    onSelect(practicumId);
    onClose();
  };

  return (
    <Modal
      animationType="fade"
      onRequestClose={onClose}
      transparent
      visible={visible}>
      <View style={[styles.overlay, { backgroundColor: theme.overlay }]}>
        <Pressable
          accessibilityLabel="Tutup pilihan praktikum"
          onPress={onClose}
          style={StyleSheet.absoluteFill}
        />

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
              Pilih Praktikum
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

          <ScrollView
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            style={styles.list}>
            <OptionRow
              count={totalCount}
              onPress={() => handleChoose(null)}
              selected={selectedPracticumId === null}
              subtitle="Tampilkan jadwal dari semua mata kuliah"
              title="Semua praktikum"
            />

            {options.map((option) => (
              <OptionRow
                key={option.id}
                count={option.count}
                onPress={() => handleChoose(option.id)}
                selected={selectedPracticumId === option.id}
                subtitle={option.className || undefined}
                title={option.fullName}
              />
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

interface OptionRowProps {
  title: string;
  subtitle?: string;
  count: number;
  selected: boolean;
  onPress: () => void;
}

function OptionRow({ title, subtitle, count, selected, onPress }: OptionRowProps) {
  const theme = useTheme();

  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        {
          backgroundColor: selected ? theme.primarySoft : theme.surfaceSubtle,
          borderColor: selected ? theme.link : theme.border,
          opacity: pressed ? 0.86 : 1,
        },
      ]}>
      <View style={styles.rowTextWrap}>
        <Text
          numberOfLines={2}
          style={[
            styles.rowTitle,
            { color: selected ? theme.link : theme.textPrimary },
          ]}>
          {title}
        </Text>
        {subtitle ? (
          <Text
            numberOfLines={1}
            style={[styles.rowSub, { color: theme.textSecondary }]}>
            {subtitle}
          </Text>
        ) : null}
      </View>

      <View style={styles.rowRight}>
        <Text
          style={[
            styles.countText,
            { color: selected ? theme.link : theme.textSecondary },
          ]}>
          {count} sesi
        </Text>
        {selected ? (
          <View style={[styles.checkCircle, { backgroundColor: theme.primary }]}>
            <Text style={[styles.checkMark, { color: theme.onPrimary }]}>✓</Text>
          </View>
        ) : null}
      </View>
    </Pressable>
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
    maxHeight: '78%',
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
  title: { ...Typography.sectionTitle, flexShrink: 1 },
  closeBtn: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: Spacing.one,
  },
  closeLabel: { ...Typography.label },
  list: { flexGrow: 0 },
  listContent: { gap: Spacing.two, paddingBottom: Spacing.two },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
    minHeight: 56,
    borderRadius: Radius.lg,
    borderWidth: 1,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  rowTextWrap: { flex: 1, minWidth: 0, gap: 2 },
  rowTitle: { ...Typography.bodyStrong },
  rowSub: { ...Typography.caption },
  rowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    flexShrink: 0,
  },
  countText: {
    ...Typography.caption,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  checkCircle: {
    width: 22,
    height: 22,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkMark: { fontSize: 12, fontWeight: '700' },
});
