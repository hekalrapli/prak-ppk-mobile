import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Radius, Spacing } from '../../constants/theme';
import { useTheme } from '../../hooks/use-theme';
import { useDemoData } from '../../store/demo-data-context';
import { UserRole } from '../../types/attendance';
import { AppButton } from '../ui/app-button';
import { ConfirmModal } from '../ui/confirm-modal';
import { StatusBadge } from '../ui/status-badge';
import { Toast } from '../ui/toast';
import { AttendanceSuccessPanel } from './attendance-success-panel';

interface SessionDetailProps {
  role: UserRole;
  sessionId: string;
}

type SessionAction = 'open' | 'close';

function currentClockTime() {
  const now = new Date();
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

interface ToastMessage {
  message: string;
  detail?: string;
  tone: 'success' | 'error';
}

export function SessionDetail({ role, sessionId }: SessionDetailProps) {
  const router = useRouter();
  const theme = useTheme();
  const { state, dispatch } = useDemoData();
  const [pendingAction, setPendingAction] = useState<SessionAction | null>(null);
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const savingRef = useRef(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const session = state.sessions.find((candidate) => candidate.id === sessionId);
  const practicum = session
    ? state.practicums.find((candidate) => candidate.id === session.practicumId)
    : undefined;
  const assistant = practicum
    ? state.users.find((candidate) => candidate.id === practicum.assistantId)
    : undefined;
  const activeUser = state.users.find((candidate) => candidate.id === state.activeUserId);
  const attendanceRecord =
    role === 'praktikan' && activeUser
      ? state.attendanceRecords.find(
          (record) =>
            record.sessionId === sessionId && record.praktikanId === activeUser.id
        )
      : undefined;

  const dismissToast = useCallback(() => setToast(null), []);

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
    };
  }, []);

  if (!session || !practicum) {
    return (
      <SafeAreaView
        edges={['bottom']}
        style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={styles.notFound}>
          <Text style={[styles.title, { color: theme.textPrimary }]}>Sesi tidak ditemukan</Text>
          <Text style={[styles.body, { color: theme.textSecondary }]}>
            Sesi yang Anda cari tidak tersedia. Kembali ke jadwal untuk memilih sesi lain.
          </Text>
          <AppButton
            label="Kembali ke jadwal"
            onPress={() => router.replace(role === 'asisten' ? '/asisten' : '/praktikan')}
          />
        </View>
      </SafeAreaView>
    );
  }

  const isAsisten = role === 'asisten';

  const handleConfirm = () => {
    if (!pendingAction) {
      return;
    }

    const at = currentClockTime();
    const action = pendingAction;

    if (
      (action === 'open' && session.status !== 'upcoming') ||
      (action === 'close' && session.status !== 'open')
    ) {
      setPendingAction(null);
      setToast({
        tone: 'error',
        message: 'Status sesi sudah berubah',
        detail: 'Periksa kembali status sesi sebelum melanjutkan.',
      });
      return;
    }

    dispatch({
      type: action === 'open' ? 'OPEN_SESSION' : 'CLOSE_SESSION',
      payload: { sessionId, at },
    });

    setToast({
      tone: 'success',
      message: action === 'open' ? 'Sesi dibuka' : 'Sesi ditutup',
      detail:
        action === 'open'
          ? `Praktikan dapat mencatat kehadiran mulai pukul ${at}.`
          : `Presensi tidak lagi tersedia sejak pukul ${at}.`,
    });
    setPendingAction(null);
  };

  const handleRecordAttendance = () => {
    if (!activeUser || savingRef.current) {
      return;
    }

    if (session.status !== 'open') {
      setToast({
        tone: 'error',
        message: 'Presensi tidak tersedia',
        detail: 'Sesi sudah ditutup. Kehadiran tidak dapat dicatat.',
      });
      return;
    }

    if (attendanceRecord) {
      setToast({
        tone: 'error',
        message: 'Kehadiran sudah dicatat',
        detail: `Tercatat pukul ${attendanceRecord.recordedAt}.`,
      });
      return;
    }

    const at = currentClockTime();
    savingRef.current = true;
    setIsSaving(true);

    saveTimerRef.current = setTimeout(() => {
      dispatch({
        type: 'RECORD_ATTENDANCE',
        payload: { sessionId, praktikanId: activeUser.id, at },
      });

      savingRef.current = false;
      setIsSaving(false);
      setToast({
        tone: 'success',
        message: 'Kehadiran berhasil dicatat',
        detail: `Pukul ${at}.`,
      });
    }, 250);
  };

  const confirmationCopy = pendingAction === 'open'
    ? {
        title: 'Buka sesi?',
        message: `Status ${practicum.name} pada ${session.date} akan berubah menjadi Dibuka.`,
        confirmLabel: 'Buka sesi',
      }
    : {
        title: 'Tutup sesi?',
        message: `Status ${practicum.name} pada ${session.date} akan berubah menjadi Ditutup dan tidak dapat dibuka kembali pada prototipe ini.`,
        confirmLabel: 'Tutup sesi',
      };

  return (
    <SafeAreaView
      edges={['bottom']}
      style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <View
          style={[
            styles.card,
            { backgroundColor: theme.surface, borderColor: theme.border },
          ]}>
          <View style={styles.rowBetween}>
            <Text style={[styles.date, { color: theme.textSecondary }]}>{session.date}</Text>
            <StatusBadge status={session.status} />
          </View>
          <Text style={[styles.title, { color: theme.textPrimary }]}>{practicum.name}</Text>
          <Text style={[styles.meta, { color: theme.textSecondary }]}>
            {practicum.className} · {session.room}
          </Text>
          <Text style={[styles.time, { color: theme.textPrimary }]}>
            {session.startTime}–{session.endTime}
          </Text>

          <View style={[styles.divider, { backgroundColor: theme.border }]} />

          <DetailRow label="Asisten" value={assistant?.name ?? '—'} />
          <DetailRow label="Kelas" value={practicum.className} />
          <DetailRow label="Ruang" value={session.room} />
          {session.openedAt ? <DetailRow label="Dibuka pukul" value={session.openedAt} /> : null}
          {session.closedAt ? <DetailRow label="Ditutup pukul" value={session.closedAt} /> : null}
        </View>

        <StatusGuidance
          role={role}
          status={session.status}
          sessionName={practicum.name}
          openedAt={session.openedAt}
          closedAt={session.closedAt}
          hasAttended={Boolean(attendanceRecord)}
        />
      </ScrollView>

      <Toast
        visible={toast !== null}
        message={toast?.message ?? ''}
        detail={toast?.detail}
        tone={toast?.tone}
        onDismiss={dismissToast}
      />

      <View
        style={[
          styles.footer,
          { backgroundColor: theme.background, borderTopColor: theme.border },
        ]}>
        <View style={styles.footerContent}>
          {isAsisten && session.status === 'upcoming' ? (
            <AppButton label="Buka sesi" onPress={() => setPendingAction('open')} />
          ) : null}
          {isAsisten && session.status === 'open' ? (
            <AppButton
              label="Tutup sesi"
              onPress={() => setPendingAction('close')}
              variant="secondary"
            />
          ) : null}
          {isAsisten && session.status === 'closed' ? (
            <AvailabilityPanel
              title="Sesi telah ditutup"
              body="Presensi tidak lagi tersedia untuk sesi ini."
              tone="neutral"
            />
          ) : null}
          {!isAsisten && attendanceRecord ? (
            <AttendanceSuccessPanel recordedAt={attendanceRecord.recordedAt} />
          ) : null}
          {!isAsisten && !attendanceRecord && session.status === 'open' ? (
            <AppButton
              label="Catat kehadiran"
              onPress={handleRecordAttendance}
              loading={isSaving}
            />
          ) : null}
          {!isAsisten && !attendanceRecord && session.status === 'upcoming' ? (
            <AppButton
              label="Presensi belum tersedia"
              onPress={() => undefined}
              disabled
            />
          ) : null}
          {!isAsisten && !attendanceRecord && session.status === 'closed' ? (
            <AppButton label="Sesi telah ditutup" onPress={() => undefined} disabled />
          ) : null}
        </View>
      </View>

      <ConfirmModal
        destructive={pendingAction === 'close'}
        message={confirmationCopy.message}
        onCancel={() => setPendingAction(null)}
        onConfirm={handleConfirm}
        confirmLabel={confirmationCopy.confirmLabel}
        title={confirmationCopy.title}
        visible={pendingAction !== null}
      />
    </SafeAreaView>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  const theme = useTheme();

  return (
    <View style={styles.detailRow}>
      <Text style={[styles.detailLabel, { color: theme.textSecondary }]}>{label}</Text>
      <Text style={[styles.detailValue, { color: theme.textPrimary }]}>{value}</Text>
    </View>
  );
}

function StatusGuidance({
  role,
  status,
  sessionName,
  openedAt,
  closedAt,
  hasAttended,
}: {
  role: UserRole;
  status: 'upcoming' | 'open' | 'closed';
  sessionName: string;
  openedAt?: string;
  closedAt?: string;
  hasAttended: boolean;
}) {
  const theme = useTheme();

  if (status === 'open') {
    return (
      <View
        style={[
          styles.guidance,
          { backgroundColor: theme.successSoft, borderColor: theme.success },
        ]}>
        <Text style={[styles.guidanceTitle, { color: theme.success }]}>Sesi sedang dibuka</Text>
        <Text style={[styles.body, { color: theme.textSecondary }]}>
          {role === 'praktikan' && hasAttended
            ? `Kehadiran Anda pada ${sessionName} sudah tercatat.`
            : `Presensi ${sessionName} tersedia sampai asisten menutup sesi.`}
          {openedAt ? ` Dibuka pukul ${openedAt}.` : ''}
        </Text>
        {role === 'asisten' ? (
          <Text style={[styles.body, { color: theme.textSecondary }]}>
            Tutup sesi setelah periode presensi selesai.
          </Text>
        ) : null}
      </View>
    );
  }

  if (status === 'closed') {
    return (
      <View
        style={[
          styles.guidance,
          { backgroundColor: theme.surface, borderColor: theme.borderStrong },
        ]}>
        <Text style={[styles.guidanceTitle, { color: theme.textPrimary }]}>
          Sesi telah ditutup
        </Text>
        <Text style={[styles.body, { color: theme.textSecondary }]}>
          {role === 'praktikan' && hasAttended
            ? `Kehadiran Anda pada ${sessionName} tetap tercatat meskipun sesi telah ditutup.`
            : `Presensi ${sessionName} tidak lagi diterima.`}
          {closedAt ? ` Ditutup pukul ${closedAt}.` : ''}
        </Text>
        {role === 'asisten' ? (
          <Text style={[styles.body, { color: theme.textSecondary }]}>
            Sesi yang sudah ditutup tidak dapat dibuka kembali pada prototipe ini.
          </Text>
        ) : null}
      </View>
    );
  }

  return (
    <View
      style={[
        styles.guidance,
        { backgroundColor: theme.surfaceSubtle, borderColor: theme.border },
      ]}>
      <Text style={[styles.guidanceTitle, { color: theme.textPrimary }]}>
        Sesi belum dibuka
      </Text>
      <Text style={[styles.body, { color: theme.textSecondary }]}>
        Asisten belum membuka presensi untuk {sessionName}.
      </Text>
      {role === 'asisten' ? (
        <Text style={[styles.body, { color: theme.textSecondary }]}>
          Buka sesi agar status berubah menjadi Dibuka.
        </Text>
      ) : (
        <Text style={[styles.body, { color: theme.textSecondary }]}>
          Presensi akan tersedia setelah asisten membuka sesi.
        </Text>
      )}
    </View>
  );
}

function AvailabilityPanel({
  title,
  body,
  tone,
}: {
  title: string;
  body: string;
  tone: 'success' | 'neutral';
}) {
  const theme = useTheme();
  const backgroundColor = tone === 'success' ? theme.successSoft : theme.surfaceSubtle;
  const borderColor = tone === 'success' ? theme.success : theme.border;
  const titleColor = tone === 'success' ? theme.success : theme.textPrimary;

  return (
    <View style={[styles.availability, { backgroundColor, borderColor }]}>
      <Text style={[styles.availabilityTitle, { color: titleColor }]}>{title}</Text>
      <Text style={[styles.availabilityBody, { color: theme.textSecondary }]}>{body}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { flex: 1 },
  content: {
    padding: Spacing.three,
    paddingBottom: Spacing.four,
    gap: Spacing.three,
    maxWidth: 560,
    alignSelf: 'center',
    width: '100%',
  },
  card: { borderWidth: 1, borderRadius: Radius.lg, padding: Spacing.three, gap: Spacing.two },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: Spacing.two,
  },
  date: { flexShrink: 1, fontSize: 12, fontWeight: '500' },
  title: { fontSize: 20, fontWeight: '700', lineHeight: 28 },
  meta: { fontSize: 14, lineHeight: 20 },
  time: { fontSize: 16, fontWeight: '600', fontVariant: ['tabular-nums'] },
  divider: { height: 1, marginVertical: Spacing.one },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', gap: Spacing.three },
  detailLabel: { fontSize: 14 },
  detailValue: { flexShrink: 1, fontSize: 14, fontWeight: '600', textAlign: 'right' },
  guidance: { borderWidth: 1, borderRadius: Radius.lg, padding: Spacing.three, gap: Spacing.two },
  guidanceTitle: { fontSize: 18, fontWeight: '600', lineHeight: 26 },
  body: { fontSize: 16, lineHeight: 24 },
  footer: {
    borderTopWidth: 1,
    padding: Spacing.three,
    paddingBottom: Spacing.four,
    alignItems: 'center',
  },
  footerContent: { width: '100%', maxWidth: 560 },
  availability: {
    borderWidth: 1,
    borderRadius: Radius.md,
    padding: Spacing.three,
    gap: Spacing.one,
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
  },
  availabilityTitle: { fontSize: 16, fontWeight: '600' },
  availabilityBody: { fontSize: 14, lineHeight: 20 },
  notFound: { flex: 1, justifyContent: 'center', padding: Spacing.four, gap: Spacing.two },
});
