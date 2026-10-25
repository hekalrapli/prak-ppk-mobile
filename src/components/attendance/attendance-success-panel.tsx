import { StyleSheet, Text, View } from 'react-native';

import { Radius, Spacing } from '../../constants/theme';
import { useTheme } from '../../hooks/use-theme';

interface AttendanceSuccessPanelProps {
  recordedAt: string;
}

export function AttendanceSuccessPanel({ recordedAt }: AttendanceSuccessPanelProps) {
  const theme = useTheme();

  return (
    <View
      accessibilityLabel={`Kehadiran sudah dicatat pukul ${recordedAt}`}
      style={[
        styles.panel,
        { backgroundColor: theme.successSoft, borderColor: theme.success },
      ]}>
      <View style={[styles.check, { backgroundColor: theme.success }]}>
        <Text style={[styles.checkLabel, { color: theme.onPrimary }]}>✓</Text>
      </View>
      <View style={styles.body}>
        <Text style={[styles.title, { color: theme.success }]}>
          Kehadiran sudah dicatat
        </Text>
        <Text style={[styles.time, { color: theme.textPrimary }]}>Pukul {recordedAt}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    width: '100%',
    borderWidth: 1,
    borderRadius: Radius.md,
    padding: Spacing.three,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  check: {
    width: 32,
    height: 32,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkLabel: { fontSize: 18, fontWeight: '700', lineHeight: 22 },
  body: { flex: 1, gap: Spacing.half },
  title: { fontSize: 16, fontWeight: '600', lineHeight: 22 },
  time: { fontSize: 16, fontWeight: '600', lineHeight: 24, fontVariant: ['tabular-nums'] },
});
