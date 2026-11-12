import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Radius, Spacing } from '../../constants/theme';
import { useTheme } from '../../hooks/use-theme';
import {
  canManageSession,
  findAttendanceRecord,
  useDemoData,
} from '../../store/demo-data-context';
import { UserRole } from '../../types/attendance';
import { AppButton } from '../ui/app-button';
import { ConfirmModal } from '../ui/confirm-modal';
import { StatusBadge } from '../ui/status-badge';
import { useToast } from '../ui/toast-provider';
import { AttendanceSuccessPanel } from './attendance-success-panel';
import { useSessionAttendance } from '../../hooks/use-session-attendance';
import { useSessionLeave } from '../../hooks/use-session-leave';
import { LeaveStatusCard } from '../leave/leave-status-card';
import { LeaveRequestModal } from '../leave/leave-request-modal';
import { AsistenLeaveReviewPanel } from '../leave/asisten-leave-review-panel';

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

export function SessionDetail({ role, sessionId }: SessionDetailProps) {
  const router = useRouter();
  const theme = useTheme();
  const { state, dispatch } = useDemoData();
  const { showToast } = useToast(); 

  const [pendingAction, setPendingAction] = useState<SessionAction | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isLeaveModalVisible, setIsLeaveModalVisible] = useState(false);
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
      ? findAttendanceRecord(state.attendanceRecords, sessionId, activeUser.id)
      : undefined;

  const { handleRecordAttendance: recordAttendanceRemote } = useSessionAttendance(
    practicum?.id || '',
    sessionId
  );

  const {
    leaveRequests,
    myLeaveRequest,
    handleSubmitLeave,
    handleUpdateLeave,
    handleCancelLeave,
    handleRetryClassification,
    handleDecideLeave,
  } = useSessionLeave(practicum?.id || '', sessionId, activeUser?.id);

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
  const canManage = isAsisten && canManageSession(state, sessionId);

  const handleConfirm = () => {
    if (!pendingAction) {
      return;
    }

    const at = currentClockTime();
    const action = pendingAction;

    if (!canManage) {
      setPendingAction(null);
      showToast('Tidak dapat mengelola sesi. Hanya asisten pengampu yang diizinkan.', 'error');
      return;
    }

    if (
      (action === 'open' && session.status !== 'upcoming') ||
      (action === 'close' && session.status !== 'open')
    ) {
      setPendingAction(null);
      showToast('Status sesi sudah berubah, periksa kembali.', 'error');
      return;
    }

    dispatch({
      type: action === 'open' ? 'OPEN_SESSION' : 'CLOSE_SESSION',
      payload: { sessionId, at },
    });

    showToast(action === 'open' ? 'Sesi berhasil dibuka' : 'Sesi berhasil ditutup', 'success');
    setPendingAction(null);
  };

  const handleRecordAttendance = async () => {
    if (!activeUser || savingRef.current) {
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
      showToast('Anda tidak dapat presensi karena pengajuan izin Anda telah diterima.', 'error');
      return;
    }

    savingRef.current = true;
    setIsSaving(true);

    try {
      const res = await recordAttendanceRemote({
        praktikanId: activeUser.id,
        praktikanName: activeUser.name,
        praktikanNim: activeUser.identifier,
      });

      showToast(`Kehadiran berhasil dicatat pada pukul ${res.recordedAtDisplay}`, 'success');
    } catch (err: any) {
      showToast(err.message || 'Gagal mencatat kehadiran.', 'error');
    } finally {
      savingRef.current = false;
      setIsSaving(false);
    }
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
          canManage={canManage}
          assistantName={assistant?.name}
        />

        {/* FR-17 & FR-18: Status Izin Praktikan */}
        {!isAsisten && myLeaveRequest ? (
          <LeaveStatusCard
            leaveRequest={myLeaveRequest}
            sessionTitle={practicum.name}
            onUpdateReason={async (newReason) => {
              if (!activeUser) return;
              await handleUpdateLeave(activeUser.id, newReason);
              showToast('Alasan izin berhasil diperbarui', 'success');
            }}
            onCancelLeave={async () => {
              if (!activeUser) return;
              await handleCancelLeave(activeUser.id);
              showToast('Pengajuan izin berhasil dibatalkan', 'success');
            }}
            onRetryAI={async () => {
              if (!activeUser) return;
              await handleRetryClassification(activeUser.id, myLeaveRequest.reason);
              showToast('Klasifikasi AI berhasil diulang', 'success');
            }}
          />
        ) : null}

        {/* FR-18 & FR-19: Panel Review Izin Asisten */}
        {isAsisten ? (
          <AsistenLeaveReviewPanel
            leaveRequests={leaveRequests}
            canManage={canManage}
            asistenId={activeUser?.id || ''}
            onDecide={async (praktikanId, decision, reviewNote) => {
              if (!activeUser) return;
              await handleDecideLeave(praktikanId, activeUser.id, decision, reviewNote);
              showToast(
                `Izin praktikan berhasil ${decision === 'approved' ? 'diterima' : 'ditolak'}`,
                'success'
              );
            }}
            onRetryAI={async (praktikanId, reason) => {
              await handleRetryClassification(praktikanId, reason);
              showToast('Klasifikasi AI berhasil diulang', 'success');
            }}
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
              {!canManage ? (
                <UnassignedSessionPanel assistantName={assistant?.name} />
              ) : null}
              {canManage && session.status === 'upcoming' ? (
                <AppButton label="Buka sesi" onPress={() => setPendingAction('open')} />
              ) : null}
              {canManage && session.status === 'open' ? (
                <AppButton
                  label="Tutup sesi"
                  onPress={() => setPendingAction('close')}
                  variant="secondary"
                />
              ) : null}
              <AppButton
                label="Lihat rekap kehadiran"
                onPress={() =>
                  router.push({
                    pathname: '/asisten/session/[sessionId]/recap',
                    params: { sessionId },
                  })
                }
                variant={session.status === 'closed' ? 'primary' : 'secondary'}
              />
            </View>
          ) : null}

          {!isAsisten && attendanceRecord ? (
            <AttendanceSuccessPanel recordedAt={attendanceRecord.recordedAt} />
          ) : null}

          {/* FR-14: Praktikan yang punya izin approved tidak dapat presensi */}
          {!isAsisten && !attendanceRecord && myLeaveRequest?.status === 'approved' ? (
            <AppButton
              label="Izin Anda sudah diterima"
              onPress={() => undefined}
              disabled
              variant="secondary"
            />
          ) : null}

          {!isAsisten && !attendanceRecord && myLeaveRequest?.status !== 'approved' && session.status === 'open' ? (
            <View style={styles.actionStack}>
              <AppButton
                label="Catat kehadiran"
                onPress={handleRecordAttendance}
                loading={isSaving}
              />
              {!myLeaveRequest ? (
                <AppButton
                  label="Ajukan izin"
                  onPress={() => setIsLeaveModalVisible(true)}
                  variant="secondary"
                />
              ) : null}
            </View>
          ) : null}

          {!isAsisten && !attendanceRecord && myLeaveRequest?.status !== 'approved' && session.status === 'upcoming' ? (
            <View style={styles.actionStack}>
              <AppButton
                label="Presensi belum tersedia"
                onPress={() => undefined}
                disabled
              />
              {!myLeaveRequest ? (
                <AppButton
                  label="Ajukan izin"
                  onPress={() => setIsLeaveModalVisible(true)}
                  variant="secondary"
                />
              ) : null}
            </View>
          ) : null}

          {!isAsisten && !attendanceRecord && myLeaveRequest?.status !== 'approved' && session.status === 'closed' ? (
            <AppButton label="Sesi telah ditutup" onPress={() => undefined} disabled />
          ) : null}
        </View>
      </View>

      {/* FR-17 & FR-18: Modal Pengajuan Izin */}
      {!isAsisten && activeUser ? (
        <LeaveRequestModal
          visible={isLeaveModalVisible}
          sessionTitle={practicum.name}
          onClose={() => setIsLeaveModalVisible(false)}
          onSubmit={async (reason) => {
            await handleSubmitLeave({
              praktikanId: activeUser.id,
              praktikanName: activeUser.name,
              praktikanNim: activeUser.identifier,
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

function StatusGuidance({
  role,
  status,
  sessionName,
  openedAt,
  closedAt,
  hasAttended,
  canManage,
  assistantName,
}: {
  role: UserRole;
  status: 'upcoming' | 'open' | 'closed';
  sessionName: string;
  openedAt?: string;
  closedAt?: string;
  hasAttended: boolean;
  canManage: boolean;
  assistantName?: string;
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
            {canManage
              ? 'Tutup sesi setelah periode presensi selesai.'
              : `Sesi ini diampu oleh ${assistantName ?? 'asisten lain'}. Hanya asisten pengampu yang dapat menutup sesi.`}
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
          {canManage
            ? 'Buka sesi agar status berubah menjadi Dibuka.'
            : `Sesi ini diampu oleh ${assistantName ?? 'asisten lain'}. Hanya asisten pengampu yang dapat membuka sesi.`}
        </Text>
      ) : (
        <Text style={[styles.body, { color: theme.textSecondary }]}>
          Presensi akan tersedia setelah asisten membuka sesi.
        </Text>
      )}
    </View>
  );
}

function UnassignedSessionPanel({ assistantName }: { assistantName?: string }) {
  const theme = useTheme();

  return (
    <View
      style={[
        styles.unassigned,
        { backgroundColor: theme.surfaceSubtle, borderColor: theme.border },
      ]}>
      <Text style={[styles.unassignedTitle, { color: theme.textPrimary }]}>
        Anda bukan asisten pengampu
      </Text>
      <Text style={[styles.unassignedBody, { color: theme.textSecondary }]}>
        Sesi ini diampu oleh {assistantName ?? 'asisten lain'}. Anda tetap dapat melihat
        rekap kehadiran.
      </Text>
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
  actionStack: { gap: Spacing.two },
  unassigned: {
    borderWidth: 1,
    borderRadius: Radius.md,
    padding: Spacing.three,
    gap: Spacing.one,
  },
  unassignedTitle: { fontSize: 16, fontWeight: '600', lineHeight: 22 },
  unassignedBody: { fontSize: 14, lineHeight: 20 },
  notFound: { flex: 1, justifyContent: 'center', padding: Spacing.four, gap: Spacing.two },
});
