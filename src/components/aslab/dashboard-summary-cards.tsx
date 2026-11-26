import { StyleSheet, Text, View } from 'react-native';

import { Radius, Shadow, Spacing, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

interface DashboardSummaryCardsProps {
  totalLabs: number;
  totalStudents: number;
  openSessionsCount: number;
  upcomingSessionsCount: number;
}

export function DashboardSummaryCards({
  totalLabs,
  totalStudents,
  openSessionsCount,
  upcomingSessionsCount,
}: DashboardSummaryCardsProps) {
  const theme = useTheme();

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <View
          style={[
            styles.card,
            Shadow.soft,
            { backgroundColor: theme.surface, borderColor: theme.border },
          ]}>
          <Text style={[styles.label, { color: theme.textSecondary }]}>
            Total Laboratorium
          </Text>
          <Text style={[styles.value, { color: theme.primary }]}>
            {totalLabs}
          </Text>
          <Text style={[styles.subLabel, { color: theme.textTertiary }]}>
            Dikelola sistem
          </Text>
        </View>

        <View
          style={[
            styles.card,
            Shadow.soft,
            { backgroundColor: theme.surface, borderColor: theme.border },
          ]}>
          <Text style={[styles.label, { color: theme.textSecondary }]}>
            Total Praktikan
          </Text>
          <Text style={[styles.value, { color: theme.textPrimary }]}>
            {totalStudents}
          </Text>
          <Text style={[styles.subLabel, { color: theme.textTertiary }]}>
            Peserta terdaftar
          </Text>
        </View>
      </View>

      <View style={styles.row}>
        <View
          style={[
            styles.card,
            Shadow.soft,
            { backgroundColor: theme.surface, borderColor: theme.border },
          ]}>
          <View style={styles.titleRow}>
            <View style={[styles.dot, { backgroundColor: theme.success }]} />
            <Text style={[styles.label, { color: theme.textSecondary }]}>
              Sesi Berlangsung
            </Text>
          </View>
          <Text style={[styles.value, { color: theme.success }]}>
            {openSessionsCount}
          </Text>
          <Text style={[styles.subLabel, { color: theme.textTertiary }]}>
            Sedang dibuka
          </Text>
        </View>

        <View
          style={[
            styles.card,
            Shadow.soft,
            { backgroundColor: theme.surface, borderColor: theme.border },
          ]}>
          <View style={styles.titleRow}>
            <View style={[styles.dot, { backgroundColor: theme.textSecondary }]} />
            <Text style={[styles.label, { color: theme.textSecondary }]}>
              Akan Datang
            </Text>
          </View>
          <Text style={[styles.value, { color: theme.textPrimary }]}>
            {upcomingSessionsCount}
          </Text>
          <Text style={[styles.subLabel, { color: theme.textTertiary }]}>
            Sesi terjadwal
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.two,
  },
  row: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  card: {
    flex: 1,
    borderRadius: Radius.card,
    borderWidth: 1,
    padding: Spacing.two,
    gap: Spacing.half,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  label: {
    ...Typography.caption,
    fontWeight: '600',
  },
  value: {
    ...Typography.sectionTitle,
    fontSize: 24,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  subLabel: {
    ...Typography.caption,
    fontSize: 11,
  },
});
