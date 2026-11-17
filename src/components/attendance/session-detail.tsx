import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppButton } from '@/components/ui/app-button';
import { ConfirmModal } from '@/components/ui/confirm-modal';
import { StatusBadge } from '@/components/ui/status-badge';
import { useToast } from '@/components/ui/toast-provider';
import { Radius, Spacing } from '@/constants/theme';
import { useSessionAttendance } from '@/hooks/use-session-attendance';
import { useSessionLeave } from '@/hooks/use-session-leave';
import { useTheme } from '@/hooks/use-theme';
import { closeSession, openSession } from '@/services/scheduleService';
import { useAuth } from '@/store/auth-context';
import type { Practicum, Session, SessionStatus, UserRole } from '@/types/attendance';
import { AttendanceSuccessPanel } from './attendance-success-panel';
import { AsistenLeaveReviewPanel } from '@/components/leave/asisten-leave-review-panel';
import { LeaveRequestModal } from '@/components/leave/leave-request-modal';
import { LeaveStatusCard } from '@/components/leave/leave-status-card';

interface SessionDetailProps {
  role: UserRole;
  practicum: Practicum;
  session: Session;
}

type SessionAction = 'open' | 'close';

export function SessionDetail({ role, practicum, session }: SessionDetailProps) {
  const router = useRouter();
  const theme = useTheme();
  const { profile } = useAuth();
  const { showToast } = useToast();

  const isAsisten = role === 'asisten';
  const canManage = isAsisten && profile?.uid === practicum.assistantId;
  const assistantName = practicum.assistantName ?? (isAsisten ? profile?.name : undefined);

  const [pendingAction, setPendingAction] = useState<SessionAction | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isLeaveModalVisible, setIsLeaveModalVisible] = useState(false);
  const savingRef = useRef(false);

  const {
    myRecord: attendanceRecord,
    loading: attendanceLoading,
    error: attendanceError,
    retry: retryAttendance,
    handleRecordAttendance: recordAttendanceRemote,
  } = useSessionAttendance(practicum.id, session.id, { role, userId: profile?.uid });

  const {
    leaveRequests,
    myLeaveRequest,
    loading: leaveLoading,
    error: leaveError,
    retry: retryLeave,
    handleSubmitLeave,
    handleUpdateLeave,
    handleCancelLeave,
    handleClassifyLeave,
    handleDecideLeave,
  } = useSessionLeave({
    practicumId: practicum.id,
    sessionId: session.id,
    currentUserId: profile?.uid,
    isAsisten,
  });

  const handleConfirm = async () => {
    if (!pendingAction || savingRef.current) {
      return;
    }

    if (!canManage) {
      setPendingAction(null);
      showToast(
        'Tidak dapat mengelola sesi. Hanya asisten pengampu yang diizinkan.',
        'error'
      );
      return;
    }

    if (
      (pendingAction === 'open' && session.status !== 'upcoming') ||
      (pendingAction === 'close' && session.status !== 'open')
    ) {
      setPendingAction(null);
      showToast('Status sesi sudah berubah, periksa kembali.', 'error');
      return;
    }

    const action = pendingAction;
    savingRef.current = true;
    setIsSaving(true);

    try {
      if (action === 'open') {
        await openSession(practicum.id, session.id);
      } else {
        await closeSession(practicum.id, session.id);
      }
      showToast(
        action === 'open' ? 'Sesi berhasil dibuka' : 'Sesi berhasil ditutup',
        'success'
      );
      setPendingAction(null);
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : 'Gagal mengubah status sesi.',
        'error'
      );
    } finally {
      savingRef.current = false;
      setIsSaving(false);
    }
  };

  const handleRecordAttendance = async () => {
    if (!profile || savingRef.current) {
      return;
    }

    if (session.status !== 'open') {
      showToast('Sesi sudah ditutup. Kehadiran tidak dapat dicatat.', 'error');
      return;
    }

    if (attendanceRecord) {
      showToast('Kehadiran sudah dicatat sebelumnya.', 'error');
      return;
    }

    if (myLeaveRequest?.status === 'approved') {
      showToast(
        'Anda tidak dapat presensi karena pengajuan izin Anda telah diterima.',
        'error'
      );
      return;
    }

    savingRef.current = true;
    setIsSaving(true);

    try {
      const result = await recordAttendanceRemote({
        praktikanId: profile.uid,
        praktikanName: profile.name,
        praktikanNim: profile.identifier,
      });
      showToast(
        `Kehadiran berhasil dicatat pada pukul ${result.recordedAtDisplay}`,
        'success'
      );
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : 'Gagal mencatat kehadiran.',
        'error'
      );
    } finally {
      savingRef.current = false;
      setIsSaving(false);
    }
  };

  const confirmationCopy =
    pendingAction === 'open'
      ? {
          title: 'Buka sesi?',
          message: `Status ${practicum.name} pada ${session.date} akan berubah menjadi Dibuka.`,
          confirmLabel: 'Buka sesi',
        }
      : {
          title: 'Tutup sesi?',
          message: `Status ${practicum.name} pada ${session.date} akan berubah menjadi Ditutup dan tidak dapat dibuka kembali.`,
          confirmLabel: 'Tutup sesi',
        };

  const showLeaveActions = !isAsisten && !attendanceRecord && !attendanceLoading;

  return (
    <SafeAreaView
      edges={['bottom']}
      style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <View
          style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
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

          <DetailRow label="Asisten" value={assistantName ?? '—'} />
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

        {attendanceError ? (
          <InlineError message={attendanceError} onRetry={retryAttendance} />
        ) : null}
        {leaveError ? <InlineError message={leaveError} onRetry={retryLeave} /> : null}

        {!isAsisten && myLeaveRequest ? (
          <LeaveStatusCard
            leaveRequest={myLeaveRequest}
            sessionTitle={practicum.name}
            onUpdateReason={async (newReason) => {
              if (!profile) return;
              await handleUpdateLeave(profile.uid, newReason);
              showToast('Alasan izin berhasil diperbarui', 'success');
            }}
            onCancelLeave={async () => {
              if (!profile) return;
              try {
                await handleCancelLeave(profile.uid);
                showToast('Pengajuan izin berhasil dibatalkan', 'success');
              } catch (error) {
                showToast(
                  error instanceof Error ? error.message : 'Gagal membatalkan izin.',
                  'error'
                );
              }
            }}
          />
        ) : null}

        {isAsisten ? (
          <AsistenLeaveReviewPanel
            leaveRequests={leaveRequests}
            canManage={canManage}
            onDecide={async (praktikanId, decision, reviewNote) => {
              if (!profile) return;
              await handleDecideLeave(
                praktikanId,
                profile.uid,
                decision,
                reviewNote
              );
              showToast(
                `Izin praktikan berhasil ${
                  decision === 'approved' ? 'diterima' : 'ditolak'
                }`,
                'success'
              );
            }}
            onClassify={handleClassifyLeave}
          />
        ) : null}
      </ScrollView>

      <View
        style={[
          styles.footer,
          { backgroundColor: theme.background, borderTopColor: theme.border },
        ]}>
        <View style={styles.footerContent}>
          {isAsisten ? (
            <View style={styles.actionStack}>
              {canManage && session.status === 'upcoming' ? (
                <AppButton
                  label="Buka sesi"
                  onPress={() => setPendingAction('open')}
                  loading={isSaving && pendingAction === 'open'}
                />
              ) : null}
              {canManage && session.status === 'open' ? (
                <AppButton
                  label="Tutup sesi"
                  onPress={() => setPendingAction('close')}
                  variant="secondary"
                  loading={isSaving && pendingAction === 'close'}
                />
              ) : null}
              <AppButton
                label="Lihat rekap kehadiran"
                onPress={() =>
                  router.push({
                    pathname: '/asisten/session/[sessionId]/recap',
                    params: { sessionId: session.id, practicumId: practicum.id },
                  })
                }
                variant={session.status === 'closed' ? 'primary' : 'secondary'}
              />
            </View>
          ) : null}

          {!isAsisten && attendanceLoading ? (
            <AppButton label="Memuat status presensi…" onPress={() => undefined} disabled />
          ) : null}

          {!isAsisten && !attendanceLoading && attendanceRecord ? (
            <AttendanceSuccessPanel recordedAt={attendanceRecord.recordedAt} />
          ) : null}

          {showLeaveActions && myLeaveRequest?.status === 'approved' ? (
            <AppButton
              label="Izin Anda sudah diterima"
              onPress={() => undefined}
              disabled
              variant="secondary"
            />
          ) : null}

          {showLeaveActions &&
          myLeaveRequest?.status !== 'approved' &&
          session.status === 'open' ? (
            <View style={styles.actionStack}>
              <AppButton
                label="Catat kehadiran"
                onPress={handleRecordAttendance}
                loading={isSaving}
              />
              {!myLeaveRequest && !leaveLoading ? (
                <AppButton
                  label="Ajukan izin"
                  onPress={() => setIsLeaveModalVisible(true)}
                  variant="secondary"
                />
              ) : !myLeaveRequest && leaveLoading ? (
                <AppButton
                  label="Memuat status izin…"
                  onPress={() => undefined}
                  disabled
                  variant="secondary"
                />
              ) : null}
            </View>
          ) : null}

          {showLeaveActions &&
          myLeaveRequest?.status !== 'approved' &&
          session.status === 'upcoming' ? (
            <View style={styles.actionStack}>
              <AppButton label="Presensi belum tersedia" onPress={() => undefined} disabled />
              {!myLeaveRequest && !leaveLoading ? (
                <AppButton
                  label="Ajukan izin"
                  onPress={() => setIsLeaveModalVisible(true)}
                  variant="secondary"
                />
              ) : !myLeaveRequest && leaveLoading ? (
                <AppButton
                  label="Memuat status izin…"
                  onPress={() => undefined}
                  disabled
                  variant="secondary"
                />
              ) : null}
            </View>
          ) : null}

          {showLeaveActions &&
          myLeaveRequest?.status !== 'approved' &&
          session.status === 'closed' ? (
            <AppButton label="Sesi telah ditutup" onPress={() => undefined} disabled />
          ) : null}
        </View>
      </View>

      {!isAsisten && profile ? (
        <LeaveRequestModal
          visible={isLeaveModalVisible}
          sessionTitle={practicum.name}
          onClose={() => setIsLeaveModalVisible(false)}
          onSubmit={async (reason) => {
            await handleSubmitLeave({
              praktikanId: profile.uid,
              praktikanName: profile.name,
              praktikanNim: profile.identifier,
              reason,
            });
            showToast('Pengajuan izin berhasil dikirim', 'success');
          }}
        />
      ) : null}

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

function InlineError({ message, onRetry }: { message: string; onRetry: () => void }) {
  const theme = useTheme();

  return (
    <View
      style={[styles.inlineError, { backgroundColor: theme.errorSoft, borderColor: theme.error }]}>
      <Text style={[styles.inlineErrorText, { color: theme.error }]}>{message}</Text>
      <Pressable accessibilityRole="button" hitSlop={8} onPress={onRetry}>
        <Text style={[styles.inlineErrorAction, { color: theme.error }]}>Coba lagi</Text>
      </Pressable>
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
  status: SessionStatus;
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
        <Text style={[styles.guidanceTitle, { color: theme.success }]}>
          Sesi sedang dibuka
        </Text>
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
            Sesi yang sudah ditutup tidak dapat dibuka kembali.
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
        {role === 'asisten'
          ? 'Buka sesi agar status berubah menjadi Dibuka.'
          : `Asisten belum membuka presensi untuk ${sessionName}.`}
      </Text>
      {role === 'praktikan' ? (
        <Text style={[styles.body, { color: theme.textSecondary }]}>
          Presensi akan tersedia setelah asisten membuka sesi.
        </Text>
      ) : null}
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
  inlineError: {
    borderWidth: 1,
    borderRadius: Radius.md,
    padding: Spacing.three,
    gap: Spacing.one,
  },
  inlineErrorText: { fontSize: 14, lineHeight: 20 },
  inlineErrorAction: { fontSize: 14, fontWeight: '600' },
  footer: {
    borderTopWidth: 1,
    padding: Spacing.three,
    paddingBottom: Spacing.four,
    alignItems: 'center',
  },
  footerContent: { width: '100%', maxWidth: 560, gap: Spacing.two },
  actionStack: { gap: Spacing.two },
});
