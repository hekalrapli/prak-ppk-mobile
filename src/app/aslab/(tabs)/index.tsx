import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { DashboardSummaryCards } from '@/components/aslab/dashboard-summary-cards';
import { FinanceSummaryCard } from '@/components/aslab/finance-summary-card';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/screen-state';
import { SegmentedControl, type SegmentOption } from '@/components/ui/segmented-control';
import { SkeletonCardList } from '@/components/ui/skeleton';
import { StatusBadge } from '@/components/ui/status-badge';
import { StatusDot, type StatusTone } from '@/components/ui/status-dot';
import { TabScreen } from '@/components/ui/tab-screen';
import { Radius, Shadow, Spacing, Typography } from '@/constants/theme';
import { useAslabDashboard } from '@/hooks/use-aslab-dashboard';
import { useTheme } from '@/hooks/use-theme';
import { formatRupiah } from '@/lib/lateness';
import type { DashboardPeriod, DashboardSessionItem, LabLiveStatusInfo } from '@/services/dashboardService';

const PERIOD_OPTIONS: SegmentOption<DashboardPeriod>[] = [
  { value: 'day', label: 'Hari Ini' },
  { value: 'week', label: 'Minggu Ini' },
  { value: 'month', label: 'Bulan Ini' },
];

const LAB_STATUS_TONE: Record<'open' | 'upcoming' | 'closed', StatusTone> = {
  open: 'success',
  upcoming: 'neutral',
  closed: 'muted',
};

/**
 * FR-S4-P2-02: Dashboard Keberlangsungan Laboratorium & Keuangan Denda (Aslab)
 * Menampilkan ringkasan utama, status real-time per lab, jadwal aktif & riwayat,
 * serta agregasi keuangan denda dengan filter Hari / Minggu / Bulan.
 */
export default function AslabDashboardTab() {
  const theme = useTheme();
  const {
    period,
    setPeriod,
    dashboardData,
    loading,
    refreshing,
    error,
    refresh,
  } = useAslabDashboard('day');

  if (loading) {
    return (
      <TabScreen title="Dashboard">
        <View style={styles.loadingContainer}>
          <SkeletonCardList count={4} />
        </View>
      </TabScreen>
    );
  }

  if (error) {
    return (
      <TabScreen title="Dashboard">
        <View style={styles.loadingContainer}>
          <ErrorState message={error} onRetry={refresh} />
        </View>
      </TabScreen>
    );
  }

  return (
    <TabScreen title="Dashboard">
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            colors={[theme.primary]}
            onRefresh={refresh}
            refreshing={refreshing}
            tintColor={theme.textSecondary}
          />
        }>
        {/* Filter Periode */}
        <View style={styles.filterWrap}>
          <SegmentedControl<DashboardPeriod>
            options={PERIOD_OPTIONS}
            value={period}
            onChange={setPeriod}
          />
        </View>

        {/* 1. Ringkasan Utama (Metrik 2x2) */}
        <DashboardSummaryCards
          totalLabs={dashboardData.totalLabs}
          totalStudents={dashboardData.totalStudents}
          openSessionsCount={dashboardData.openSessionsCount}
          upcomingSessionsCount={dashboardData.upcomingSessionsCount}
        />

        {/* 2. Status Kegiatan per Laboratorium */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>
              Status Laboratorium
            </Text>
            <Text style={[styles.sectionSubtitle, { color: theme.textSecondary }]}>
              Kondisi real-time pelaksanaan praktikum
            </Text>
          </View>

          {dashboardData.labStatuses.length === 0 ? (
            <EmptyState
              title="Belum ada laboratorium"
              description="Laboratorium yang ditambahkan akan muncul di sini beserta status kegiatannya."
            />
          ) : (
            <View style={styles.labList}>
              {dashboardData.labStatuses.map((item: LabLiveStatusInfo) => {
                const tone = LAB_STATUS_TONE[item.status];
                const policyText = `Toleransi ${item.lab.gracePeriodMinutes ?? 15} mnt · Denda ${formatRupiah(item.lab.lateFineAmount ?? 0)}`;

                return (
                  <View
                    key={item.lab.id}
                    style={[
                      styles.labCard,
                      Shadow.soft,
                      {
                        backgroundColor: theme.surface,
                        borderColor:
                          item.status === 'open' ? theme.success : theme.border,
                      },
                    ]}>
                    <View style={styles.labCardHeader}>
                      <View style={styles.labCardTitleWrap}>
                        <Text
                          style={[styles.labName, { color: theme.textPrimary }]}>
                          {item.lab.name}
                        </Text>
                        <Text
                          style={[styles.labBuilding, { color: theme.textSecondary }]}>
                          {item.lab.building || 'Gedung belum diatur'}
                        </Text>
                      </View>
                      <StatusDot label={item.statusLabel} tone={tone} />
                    </View>

                    {item.currentSession ? (
                      <View
                        style={[
                          styles.labSessionBanner,
                          {
                            backgroundColor:
                              item.status === 'open'
                                ? theme.successSoft
                                : theme.surfaceSubtle,
                          },
                        ]}>
                        <Text
                          style={[
                            styles.labSessionTitle,
                            {
                              color:
                                item.status === 'open'
                                  ? theme.success
                                  : theme.textPrimary,
                            },
                          ]}>
                          {item.currentPracticumName}
                        </Text>
                        <Text
                          style={[
                            styles.labSessionMeta,
                            { color: theme.textSecondary },
                          ]}>
                          {item.currentSession.date} · {item.currentSession.startTime}–{item.currentSession.endTime} WIB
                        </Text>
                        {item.assignedAsprakNames.length > 0 ? (
                          <Text
                            style={[
                              styles.labSessionAsprak,
                              { color: theme.textTertiary },
                            ]}>
                            Asprak: {item.assignedAsprakNames.join(', ')}
                          </Text>
                        ) : null}
                      </View>
                    ) : (
                      <View
                        style={[
                          styles.labEmptyBanner,
                          { backgroundColor: theme.surfaceSubtle },
                        ]}>
                        <Text
                          style={[styles.labEmptyText, { color: theme.textTertiary }]}>
                          Tidak ada jadwal sesi pada periode ini
                        </Text>
                      </View>
                    )}

                    <View style={styles.labCardFooter}>
                      <Text
                        style={[styles.labPolicyText, { color: theme.textTertiary }]}>
                        {policyText}
                      </Text>
                      <Text
                        style={[styles.labRadiusText, { color: theme.textSecondary }]}>
                        Radius {item.lab.radiusMeter}m
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </View>

        {/* 3. Jadwal Praktikum Berlangsung & Akan Datang */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>
              Jadwal Berlangsung & Mendatang
            </Text>
            <Text style={[styles.sectionSubtitle, { color: theme.textSecondary }]}>
              {dashboardData.activeAndUpcomingSessions.length} sesi terjadwal
            </Text>
          </View>

          {dashboardData.activeAndUpcomingSessions.length === 0 ? (
            <View
              style={[
                styles.emptySectionBox,
                { backgroundColor: theme.surfaceSubtle },
              ]}>
              <Text
                style={[styles.emptySectionText, { color: theme.textSecondary }]}>
                Tidak ada jadwal sesi yang sedang dibuka atau akan datang pada periode ini.
              </Text>
            </View>
          ) : (
            <View style={styles.sessionList}>
              {dashboardData.activeAndUpcomingSessions.map(
                (item: DashboardSessionItem) => (
                  <View
                    key={item.session.id}
                    style={[
                      styles.sessionCard,
                      Shadow.soft,
                      { backgroundColor: theme.surface, borderColor: theme.border },
                    ]}>
                    <View style={styles.sessionCardRow}>
                      <View style={styles.sessionCardInfo}>
                        <View style={styles.sessionBadgeRow}>
                          <StatusBadge status={item.session.status} />
                          <Text
                            style={[
                              styles.sessionTimeBadge,
                              { color: theme.textSecondary },
                            ]}>
                            {item.session.date} · {item.session.startTime}–{item.session.endTime}
                          </Text>
                        </View>
                        <Text
                          style={[
                            styles.sessionCourseName,
                            { color: theme.textPrimary },
                          ]}>
                          {item.practicumName}
                        </Text>
                        <Text
                          style={[
                            styles.sessionLocation,
                            { color: theme.textSecondary },
                          ]}>
                          {item.locationLabel} · Kelas {item.className}
                        </Text>
                        <Text
                          style={[
                            styles.sessionAsprak,
                            { color: theme.textTertiary },
                          ]}>
                          Asprak pengampu: {item.assistantName}
                        </Text>
                      </View>
                    </View>
                  </View>
                )
              )}
            </View>
          )}
        </View>

        {/* 4. Riwayat Kegiatan Selesai */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>
              Riwayat Kegiatan Selesai
            </Text>
            <Text style={[styles.sectionSubtitle, { color: theme.textSecondary }]}>
              {dashboardData.pastSessionsRecap.length} sesi telah ditutup
            </Text>
          </View>

          {dashboardData.pastSessionsRecap.length === 0 ? (
            <View
              style={[
                styles.emptySectionBox,
                { backgroundColor: theme.surfaceSubtle },
              ]}>
              <Text
                style={[styles.emptySectionText, { color: theme.textSecondary }]}>
                Belum ada kegiatan praktikum yang selesai pada periode ini.
              </Text>
            </View>
          ) : (
            <View style={styles.sessionList}>
              {dashboardData.pastSessionsRecap.map(
                (item: DashboardSessionItem) => (
                  <View
                    key={item.session.id}
                    style={[
                      styles.sessionCard,
                      Shadow.soft,
                      { backgroundColor: theme.surface, borderColor: theme.border },
                    ]}>
                    <View style={styles.sessionCardRow}>
                      <View style={styles.sessionCardInfo}>
                        <View style={styles.sessionBadgeRow}>
                          <StatusBadge status={item.session.status} />
                          <Text
                            style={[
                              styles.sessionTimeBadge,
                              { color: theme.textSecondary },
                            ]}>
                            {item.session.date} · {item.session.startTime}–{item.session.endTime}
                          </Text>
                        </View>
                        <Text
                          style={[
                            styles.sessionCourseName,
                            { color: theme.textPrimary },
                          ]}>
                          {item.practicumName}
                        </Text>
                        <Text
                          style={[
                            styles.sessionLocation,
                            { color: theme.textSecondary },
                          ]}>
                          {item.locationLabel} · Kelas {item.className}
                        </Text>
                        <Text
                          style={[
                            styles.sessionAsprak,
                            { color: theme.textTertiary },
                          ]}>
                          Asprak pengampu: {item.assistantName}
                        </Text>
                      </View>
                    </View>
                  </View>
                )
              )}
            </View>
          )}
        </View>

        {/* 5. Riwayat Keuangan Denda Praktikum */}
        <FinanceSummaryCard summary={dashboardData.financeSummary} />
      </ScrollView>
    </TabScreen>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
  },
  content: {
    padding: Spacing.three,
    gap: Spacing.three,
    paddingBottom: Spacing.six,
  },
  loadingContainer: {
    flex: 1,
    padding: Spacing.three,
  },
  filterWrap: {
    marginBottom: Spacing.half,
  },
  section: {
    gap: Spacing.two,
  },
  sectionHeader: {
    gap: 2,
  },
  sectionTitle: {
    ...Typography.bodyStrong,
    fontSize: 16,
  },
  sectionSubtitle: {
    ...Typography.caption,
  },
  labList: {
    gap: Spacing.two,
  },
  labCard: {
    borderRadius: Radius.card,
    borderWidth: 1,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  labCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: Spacing.two,
  },
  labCardTitleWrap: {
    flex: 1,
    gap: 2,
  },
  labName: {
    ...Typography.bodyStrong,
    fontSize: 15,
  },
  labBuilding: {
    ...Typography.caption,
  },
  labSessionBanner: {
    borderRadius: Radius.card,
    padding: Spacing.two,
    gap: 2,
  },
  labSessionTitle: {
    ...Typography.bodyStrong,
    fontSize: 13,
  },
  labSessionMeta: {
    ...Typography.caption,
    fontSize: 12,
  },
  labSessionAsprak: {
    ...Typography.caption,
    fontSize: 11,
  },
  labEmptyBanner: {
    borderRadius: Radius.card,
    padding: Spacing.two,
    alignItems: 'center',
  },
  labEmptyText: {
    ...Typography.caption,
    fontSize: 12,
  },
  labCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: Spacing.one,
  },
  labPolicyText: {
    ...Typography.caption,
    fontSize: 11,
  },
  labRadiusText: {
    ...Typography.caption,
    fontWeight: '600',
    fontSize: 11,
  },
  emptySectionBox: {
    borderRadius: Radius.card,
    padding: Spacing.three,
    alignItems: 'center',
  },
  emptySectionText: {
    ...Typography.caption,
    textAlign: 'center',
  },
  sessionList: {
    gap: Spacing.two,
  },
  sessionCard: {
    borderRadius: Radius.card,
    borderWidth: 1,
    padding: Spacing.two,
  },
  sessionCardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  sessionCardInfo: {
    flex: 1,
    gap: 2,
  },
  sessionBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    marginBottom: 2,
  },
  sessionTimeBadge: {
    ...Typography.caption,
    fontSize: 12,
  },
  sessionCourseName: {
    ...Typography.bodyStrong,
    fontSize: 14,
  },
  sessionLocation: {
    ...Typography.caption,
  },
  sessionAsprak: {
    ...Typography.caption,
    fontSize: 11,
  },
});
