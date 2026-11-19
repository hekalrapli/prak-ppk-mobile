// src/components/maps/lab-activity-sheet.tsx
import { SymbolView } from 'expo-symbols';
import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppButton } from '@/components/ui/app-button';
import { EmptyState } from '@/components/ui/empty-state';
import { LoadingState } from '@/components/ui/screen-state';
import { Radius, Shadow, Spacing, Typography } from '@/constants/theme';
import { usePracticumFeed } from '@/hooks/use-practicum-feed';
import { useTheme } from '@/hooks/use-theme';
import { buildLabSchedule, type LabScheduleEntry } from '@/lib/lab-schedule';
import { useAuth } from '@/store/auth-context';
import type { UserRole } from '@/types/attendance';
import type { Laboratory } from '@/types/location';

interface LabActivitySheetProps {
  laboratory: Laboratory;
  /** Semua laboratorium, untuk mencocokkan sesi lama yang belum punya labId. */
  laboratories: Laboratory[];
  onClose: () => void;
}

type ActivityState = 'open' | 'ongoing' | 'upcoming' | 'closed';

const ACTIVITY_LABEL: Record<ActivityState, string> = {
  open: 'Dibuka',
  ongoing: 'Berlangsung',
  upcoming: 'Akan datang',
  closed: 'Ditutup',
};

/**
 * FR-P1-04: bottom sheet aktivitas laboratorium.
 *
 * Dipakai dari peta (native) dan daftar laboratorium (web). Sumber data adalah
 * `usePracticumFeed`, yang berlangganan `onSnapshot` ke sesi-sesi praktikum
 * pengguna, sehingga badge status berubah seketika ketika asisten membuka atau
 * menutup sesi tanpa reload.
 */
export function LabActivitySheet({
  laboratory,
  laboratories,
  onClose,
}: LabActivitySheetProps) {
  const { profile } = useAuth();

  if (!profile) {
    return null;
  }

  return (
    <LabActivitySheetContent
      key={laboratory.id}
      laboratories={laboratories}
      laboratory={laboratory}
      onClose={onClose}
      role={profile.role}
      userId={profile.uid}
    />
  );
}

function LabActivitySheetContent({
  laboratory,
  laboratories,
  onClose,
  role,
  userId,
}: LabActivitySheetProps & { role: UserRole; userId: string }) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { practicums, sessions, loading, error, retry } = usePracticumFeed(
    role,
    userId
  );

  // Jam berjalan agar sesi yang selesai/bermulanya berubah tanpa reload.
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setTick((value) => value + 1), 30_000);
    return () => clearInterval(timer);
  }, []);

  const schedule = useMemo(
    () =>
      buildLabSchedule({
        laboratory,
        laboratories,
        practicums,
        sessions,
      }),
    // `tick` sengaja menjadi dependency agar status "Berlangsung" dihitung ulang.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [laboratory, laboratories, practicums, sessions, tick]
  );

  const nextEntry = schedule.next;

  const openSession = (entry: LabScheduleEntry) => {    onClose();
    if (role === 'asisten') {
      router.push({
        pathname: '/asisten/session/[sessionId]',
        params: { sessionId: entry.session.id, practicumId: entry.practicum.id },
      });
      return;
    }
    router.push({
      pathname: '/praktikan/session/[sessionId]',
      params: { sessionId: entry.session.id, practicumId: entry.practicum.id },
    });
  };

  return (
    <Modal
      animationType="slide"
      onRequestClose={onClose}
      transparent
      visible>
      <View style={styles.overlay}>
        <Pressable
          accessibilityLabel="Tutup aktivitas laboratorium"
          onPress={onClose}
          style={[styles.backdrop, { backgroundColor: theme.overlay }]}
        />

        <View
          accessibilityViewIsModal
          style={[
            styles.sheet,
            Shadow.sheet,
            {
              backgroundColor: theme.background,
              paddingBottom: Math.max(insets.bottom, Spacing.three),
            },
          ]}>
          <View style={[styles.handle, { backgroundColor: theme.borderStrong }]} />

          <View style={styles.header}>
            <View style={styles.headerText}>
              <Text style={[styles.title, { color: theme.textPrimary }]}>
                Aktivitas Laboratorium
              </Text>
              <Text
                numberOfLines={2}
                style={[styles.subtitle, { color: theme.textSecondary }]}>
                {laboratory.name}
                {laboratory.building ? ` · ${laboratory.building}` : ''}
              </Text>
            </View>
            <Pressable
              accessibilityLabel="Tutup"
              accessibilityRole="button"
              hitSlop={10}
              onPress={onClose}>
              <SymbolView
                name={{ ios: 'xmark', android: 'close', web: 'close' }}
                size={20}
                tintColor={theme.textSecondary}
              />
            </Pressable>
          </View>

          <ScrollView
            contentContainerStyle={styles.content}
            style={styles.scroll}>
            {error ? (
              <View style={[styles.errorBox, { backgroundColor: theme.errorSoft }]}>
                <Text style={[styles.errorText, { color: theme.error }]}>{error}</Text>
                <Pressable
                  accessibilityRole="button"
                  hitSlop={8}
                  onPress={retry}>
                  <Text style={[styles.errorAction, { color: theme.error }]}>
                    Coba lagi
                  </Text>
                </Pressable>
              </View>
            ) : null}

            {loading ? <LoadingState label="Memuat jadwal laboratorium…" /> : null}

            {!loading && schedule.isEmpty ? (
              <EmptyState
                title="Kosong"
                description="Belum ada praktikum di laboratorium ini. Jadwal muncul otomatis setelah asisten menambahkan sesi."
              />
            ) : null}

            {!loading && !schedule.isEmpty ? (
              <>
                <Section
                  emptyLabel="Tidak ada praktikum yang sedang berlangsung."
                  entries={schedule.ongoing}
                  onOpen={openSession}
                  title="Sedang berlangsung"
                />

                {nextEntry ? (
                  <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>
                      Berikutnya
                    </Text>
                    <ScheduleCard
                      entry={nextEntry}
                      onOpen={() => openSession(nextEntry)}
                      state="upcoming"
                    />
                  </View>
                ) : (
                  <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>
                      Berikutnya
                    </Text>
                    <Text style={[styles.emptyLine, { color: theme.textTertiary }]}>
                      Tidak ada jadwal berikutnya untuk laboratorium ini.
                    </Text>
                  </View>
                )}

                {schedule.others.length > 0 ? (
                  <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>
                      Jadwal lain
                    </Text>
                    {schedule.others.slice(0, 5).map((entry) => (
                      <ScheduleCard
                        key={`${entry.practicum.id}-${entry.session.id}`}
                        entry={entry}
                        onOpen={() => openSession(entry)}
                        state={entry.session.status === 'closed' ? 'closed' : 'upcoming'}
                      />
                    ))}
                  </View>
                ) : null}
              </>
            ) : null}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function Section({
  title,
  entries,
  emptyLabel,
  onOpen,
}: {
  title: string;
  entries: LabScheduleEntry[];
  emptyLabel: string;
  onOpen: (entry: LabScheduleEntry) => void;
}) {
  const theme = useTheme();

  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>{title}</Text>
      {entries.length === 0 ? (
        <Text style={[styles.emptyLine, { color: theme.textTertiary }]}>{emptyLabel}</Text>
      ) : (
        entries.map((entry) => (
          <ScheduleCard
            key={`${entry.practicum.id}-${entry.session.id}`}
            entry={entry}
            onOpen={() => onOpen(entry)}
            state={entry.session.status === 'open' ? 'open' : 'ongoing'}
          />
        ))
      )}
    </View>
  );
}

function ScheduleCard({
  entry,
  state,
  onOpen,
}: {
  entry: LabScheduleEntry;
  state: ActivityState;
  onOpen: () => void;
}) {
  const theme = useTheme();
  const { practicum, session } = entry;
  const badgeColor =
    state === 'open'
      ? theme.success
      : state === 'ongoing'
        ? theme.warning
        : theme.textSecondary;
  const badgeBackground =
    state === 'open'
      ? theme.successSoft
      : state === 'ongoing'
        ? theme.warningSoft
        : theme.surfaceSubtle;

  return (
    <View
      style={[styles.card, Shadow.soft, { backgroundColor: theme.surface }]}>
      <View style={styles.rowBetween}>
        <Text style={[styles.course, { color: theme.textPrimary }]}>
          {practicum.name}
        </Text>
        <View style={[styles.badge, { backgroundColor: badgeBackground }]}>
          <Text style={[styles.badgeLabel, { color: badgeColor }]}>
            {ACTIVITY_LABEL[state]}
          </Text>
        </View>
      </View>

      <Text style={[styles.meta, { color: theme.textSecondary }]}>
        {practicum.className} · {session.room}
      </Text>
      <Text style={[styles.meta, { color: theme.textSecondary }]}>
        {session.date} · {session.startTime}–{session.endTime} WIB
      </Text>
      <Text style={[styles.meta, { color: theme.textSecondary }]}>
        Asisten: {practicum.assistantName ?? '—'}
      </Text>

      <View style={styles.cardAction}>
        <AppButton label="Lihat detail sesi" onPress={onOpen} variant="secondary" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 },
  sheet: {
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
    maxHeight: '82%',
    borderTopLeftRadius: Radius.sheet,
    borderTopRightRadius: Radius.sheet,
    overflow: 'hidden',
  },
  handle: {
    alignSelf: 'center',
    width: 44,
    height: 4,
    borderRadius: Radius.full,
    marginTop: Spacing.two,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.two,
  },
  headerText: { flex: 1, gap: Spacing.half },
  title: { ...Typography.cardTitle },
  subtitle: { ...Typography.caption },
  scroll: { flexShrink: 1 },
  content: {
    paddingHorizontal: Spacing.three,
    paddingBottom: Spacing.three,
    gap: Spacing.three,
  },
  section: { gap: Spacing.two },
  sectionTitle: { ...Typography.sectionTitle },
  emptyLine: { ...Typography.caption },
  card: {
    borderRadius: Radius.card,
    padding: Spacing.three,
    gap: Spacing.one,
  },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  course: { ...Typography.bodyStrong, flexShrink: 1 },
  meta: { ...Typography.caption },
  badge: {
    borderRadius: Radius.pill,
    paddingVertical: Spacing.half,
    paddingHorizontal: Spacing.two,
  },
  badgeLabel: { ...Typography.caption, fontWeight: '700' },
  cardAction: { marginTop: Spacing.two },
  errorBox: {
    borderRadius: Radius.lg,
    padding: Spacing.three,
    gap: Spacing.one,
  },
  errorText: { ...Typography.caption },
  errorAction: { ...Typography.caption, fontWeight: '700' },
});
