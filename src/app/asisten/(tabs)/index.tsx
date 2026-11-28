import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { RefreshControl, SectionList, StyleSheet, View } from 'react-native';

import { isSessionHappeningNow } from '@/components/attendance/now-marker';
import { ScheduleFilterBar } from '@/components/attendance/schedule-filter-bar';
import { ScheduleTimelineItem } from '@/components/attendance/schedule-timeline-item';
import { SessionDateHeader } from '@/components/attendance/session-date-header';
import { SessionHighlightCard } from '@/components/attendance/session-highlight-card';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/screen-state';
import { SkeletonCardList } from '@/components/ui/skeleton';
import { StatusDot } from '@/components/ui/status-dot';
import { TabScreen } from '@/components/ui/tab-screen';
import { Radius, Spacing } from '@/constants/theme';
import { usePracticumFeed } from '@/hooks/use-practicum-feed';
import { useTheme } from '@/hooks/use-theme';
import {
  organizeSchedule,
  type ScheduleRow,
  type ScheduleStatusFilter,
} from '@/lib/schedule-organizer';
import { formatTimestampDisplay, parseSessionDate } from '@/lib/session-date';
import { useAuth } from '@/store/auth-context';
import type { Practicum, Session } from '@/types/attendance';

export default function AsistenScheduleScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { profile } = useAuth();
  const { practicums, sessions, loading, refreshing, error, retry, refresh } =
    usePracticumFeed('asisten', profile?.uid);

  const [statusFilter, setStatusFilter] = useState<ScheduleStatusFilter>('active');
  const [selectedPracticumId, setSelectedPracticumId] = useState<string | null>(null);
  const [selectedDateMs, setSelectedDateMs] = useState<number | null>(null);

  const practicumById = useMemo(
    () => new Map(practicums.map((practicum) => [practicum.id, practicum])),
    [practicums]
  );

  const rows = useMemo<ScheduleRow[]>(
    () =>
      sessions.flatMap((session) => {
        const practicum = practicumById.get(session.practicumId);
        return practicum ? [{ session, practicum }] : [];
      }),
    [sessions, practicumById]
  );

  const activePracticumId =
    selectedPracticumId && practicumById.has(selectedPracticumId)
      ? selectedPracticumId
      : null;

  const organized = useMemo(
    () =>
      organizeSchedule({
        practicums,
        rows,
        statusFilter,
        selectedPracticumId: activePracticumId,
        selectedDateMs,
      }),
    [practicums, rows, statusFilter, activePracticumId, selectedDateMs]
  );

  const scopedCounts = useMemo(() => {
    const scoped = rows.filter((row) => {
      if (activePracticumId && row.practicum.id !== activePracticumId) {
        return false;
      }
      if (selectedDateMs !== null && parseSessionDate(row.session.date) !== selectedDateMs) {
        return false;
      }
      return true;
    });
    return {
      open: scoped.filter((row) => row.session.status === 'open').length,
      upcoming: scoped.filter((row) => row.session.status === 'upcoming').length,
      closed: scoped.filter((row) => row.session.status === 'closed').length,
    };
  }, [rows, activePracticumId, selectedDateMs]);

  const selectedPracticum = activePracticumId
    ? practicumById.get(activePracticumId) ?? null
    : null;

  const isAsisten = profile?.role === 'asisten';
  const ownedPracticums =
    isAsisten && profile?.uid
      ? practicums.filter((item) => item.assistantId === profile.uid)
      : [];

  if (loading) {
    return (
      <TabScreen title="Jadwal">
        <SkeletonCardList count={4} />
      </TabScreen>
    );
  }

  if (error) {
    return (
      <TabScreen title="Jadwal">
        <ErrorState message={error} onRetry={retry} />
      </TabScreen>
    );
  }

  const openSession = (practicum: Practicum, session: Session) => {
    router.push({
      pathname: '/asisten/session/[sessionId]',
      params: { sessionId: session.id, practicumId: practicum.id },
    });
  };

  const highlight = organized.highlight;
  const now = new Date();

  const renderHeader = () => {
    if (rows.length === 0 || organized.filteredTotalCount === 0) {
      return null;
    }

    return (
      <View style={styles.header}>
        {highlight ? (
          <SessionHighlightCard
            onPress={() => openSession(highlight.practicum, highlight.session)}
            practicum={highlight.practicum}
            session={highlight.session}
          />
        ) : null}

        <View style={[styles.summary, { backgroundColor: theme.surfaceSubtle }]}>
          <StatusDot label={`${scopedCounts.open} dibuka`} tone="success" />
          <StatusDot label={`${scopedCounts.upcoming} belum dibuka`} tone="muted" />
          <StatusDot label={`${scopedCounts.closed} ditutup`} tone="neutral" />
        </View>
      </View>
    );
  };

  const renderEmpty = () => {
    if (rows.length === 0) {
      return (
        <EmptyState
          title="Belum ada jadwal"
          description={
            ownedPracticums.length === 0
              ? 'Tambahkan praktikum baru di tab Kelola untuk mulai mengatur peserta dan sesi jadwal.'
              : 'Belum ada sesi terjadwal. Tambahkan sesi baru untuk praktikum yang Anda ampu.'
          }
          actionLabel={
            isAsisten
              ? ownedPracticums.length === 0
                ? 'Tambah praktikum'
                : 'Tambah sesi'
              : undefined
          }
          onAction={
            isAsisten
              ? () =>
                  router.push(
                    ownedPracticums.length === 0
                      ? '/asisten/practicum/form'
                      : '/asisten/session/form'
                  )
              : undefined
          }
        />
      );
    }

    if (organized.filteredTotalCount > 0) {
      return null;
    }

    const dateDisplay =
      selectedDateMs !== null ? formatTimestampDisplay(selectedDateMs) : null;
    const scopeSuffix = selectedPracticum ? ` untuk ${selectedPracticum.name}` : '';

    if (dateDisplay && organized.statusCounts.all === 0) {
      return (
        <EmptyState
          title={`Tidak ada praktikum pada ${dateDisplay}`}
          description={
            selectedPracticum
              ? `Tidak ada jadwal ${selectedPracticum.name} pada tanggal ini.`
              : 'Tidak ada jadwal praktikum pada tanggal yang dipilih.'
          }
          actionLabel="Tampilkan semua tanggal"
          onAction={() => setSelectedDateMs(null)}
        />
      );
    }

    if (statusFilter === 'active' && organized.statusCounts.closed > 0) {
      return (
        <EmptyState
          title={
            dateDisplay
              ? `Tidak ada sesi aktif pada ${dateDisplay}`
              : `Tidak ada sesi aktif${scopeSuffix}`
          }
          description={`Terdapat ${organized.statusCounts.closed} sesi yang sudah ditutup. Anda dapat melihatnya pada tab Selesai.`}
          actionLabel={`Lihat sesi selesai (${organized.statusCounts.closed})`}
          onAction={() => setStatusFilter('closed')}
        />
      );
    }

    if (statusFilter === 'closed' && organized.statusCounts.active > 0) {
      return (
        <EmptyState
          title={
            dateDisplay
              ? `Belum ada sesi selesai pada ${dateDisplay}`
              : `Belum ada sesi selesai${scopeSuffix}`
          }
          description={`Terdapat ${organized.statusCounts.active} sesi aktif pada filter ini. Cek pada tab Aktif.`}
          actionLabel={`Lihat sesi aktif (${organized.statusCounts.active})`}
          onAction={() => setStatusFilter('active')}
        />
      );
    }

    if (activePracticumId !== null) {
      return (
        <EmptyState
          title="Belum ada sesi terjadwal"
          description={`Belum ada sesi${scopeSuffix}.`}
          actionLabel="Tampilkan semua praktikum"
          onAction={() => setSelectedPracticumId(null)}
        />
      );
    }

    return (
      <EmptyState
        title="Tidak ada sesi"
        description="Tidak ada sesi yang sesuai dengan filter yang dipilih."
      />
    );
  };

  return (
    <TabScreen title="Jadwal">
      {rows.length > 0 ? (
        <ScheduleFilterBar
          dateIndicators={organized.dateIndicators}
          onChangeStatus={setStatusFilter}
          onSelectDate={setSelectedDateMs}
          onSelectPracticum={setSelectedPracticumId}
          practicumOptions={organized.practicumOptions}
          selectedDateMs={selectedDateMs}
          selectedPracticumId={activePracticumId}
          statusCounts={organized.statusCounts}
          statusFilter={statusFilter}
        />
      ) : null}

      <SectionList
        sections={organized.sections}
        keyExtractor={(slot) => slot.key}
        style={styles.list}
        contentContainerStyle={styles.content}
        stickySectionHeadersEnabled
        refreshControl={
          <RefreshControl
            colors={[theme.primary]}
            onRefresh={refresh}
            refreshing={refreshing}
            tintColor={theme.textSecondary}
          />
        }
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmpty}
        renderSectionHeader={({ section }) => (
          <SessionDateHeader
            count={section.sessionCount}
            date={section.title}
            highlightTone={section.highlightTone}
            relativeLabel={section.relativeLabel}
          />
        )}
        renderItem={({ item, section }) => (
          <ScheduleTimelineItem
            getAssistantName={(row) => row.practicum.assistantName ?? profile?.name}
            isNow={item.rows.some((row) => isSessionHappeningNow(row.session, now))}
            onPressSession={openSession}
            showDate={section.highlightTone === 'open'}
            slot={item}
          />
        )}
      />
    </TabScreen>
  );
}

const styles = StyleSheet.create({
  list: { flex: 1 },
  content: {
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.two,
    paddingBottom: Spacing.five,
    maxWidth: 560,
    alignSelf: 'center',
    width: '100%',
  },
  header: { gap: Spacing.three, marginTop: Spacing.one, marginBottom: Spacing.one },
  summary: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: Spacing.three,
    borderRadius: Radius.lg,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
  },
});
