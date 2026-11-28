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
import { TabScreen } from '@/components/ui/tab-screen';
import { Spacing } from '@/constants/theme';
import { usePracticumFeed } from '@/hooks/use-practicum-feed';
import { useTheme } from '@/hooks/use-theme';
import {
  organizeSchedule,
  type ScheduleRow,
  type ScheduleStatusFilter,
} from '@/lib/schedule-organizer';
import { formatTimestampDisplay } from '@/lib/session-date';
import { useAuth } from '@/store/auth-context';
import type { Practicum, Session } from '@/types/attendance';

export default function PraktikanScheduleScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { profile } = useAuth();
  const { practicums, sessions, loading, refreshing, error, retry, refresh } =
    usePracticumFeed('praktikan', profile?.uid);

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

  const selectedPracticum = activePracticumId
    ? practicumById.get(activePracticumId) ?? null
    : null;

  const now = new Date();

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
      pathname: '/praktikan/session/[sessionId]',
      params: { sessionId: session.id, practicumId: practicum.id },
    });
  };

  const renderEmpty = () => {
    if (rows.length === 0) {
      return (
        <EmptyState
          title="Belum ada jadwal"
          description="Belum ada sesi untuk praktikum yang Anda ikuti."
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

  const highlight = organized.highlight;

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
        ListHeaderComponent={
          highlight ? (
            <View style={styles.highlight}>
              <SessionHighlightCard
                onPress={() => openSession(highlight.practicum, highlight.session)}
                practicum={highlight.practicum}
                session={highlight.session}
              />
            </View>
          ) : undefined
        }
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
  highlight: {
    marginTop: Spacing.one,
    marginBottom: Spacing.two,
  },
});
