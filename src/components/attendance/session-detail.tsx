import { useRouter } from 'expo-router';
import { useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppButton } from '@/components/ui/app-button';
import { ConfirmModal } from '@/components/ui/confirm-modal';
import { EmptyState } from '@/components/ui/empty-state';
import { LoadingState } from '@/components/ui/screen-state';
import { SegmentedControl, SegmentOption } from '@/components/ui/segmented-control';
import { StatusBadge } from '@/components/ui/status-badge';
import { useToast } from '@/components/ui/toast-provider';
import { Radius, Shadow, Spacing, Typography } from '@/constants/theme';
import { useSessionAttendance } from '@/hooks/use-session-attendance';
import { useSessionLeave } from '@/hooks/use-session-leave';
import { useTheme } from '@/hooks/use-theme';
import { buildRecapEntries } from '@/lib/recap';
import { formatTimestampToTime } from '@/services/attendanceService';
import {
  closeSession,
  deleteSessionCascade,
  getSessionAttendanceCount,
  openSession,
} from '@/services/scheduleService';
import { useAuth } from '@/store/auth-context';
import type { Practicum, Session, SessionStatus, UserRole } from '@/types/attendance';
import { AsistenLeaveReviewPanel } from '@/components/leave/asisten-leave-review-panel';
import { LeaveRequestModal } from '@/components/leave/leave-request-modal';
import { LeaveStatusCard } from '@/components/leave/leave-status-card';
import { AttendanceSuccessPanel } from './attendance-success-panel';
import { SessionRecapList } from './session-recap-list';

interface SessionDetailProps {
  role: UserRole;
  practicum: Practicum;
  session: Session;
}

type SessionAction = 'open' | 'close';
type SessionTab = 'ringkasan' | 'kehadiran' | 'izin';

export function SessionDetail({ role, practicum, session }: SessionDetailProps) {
  const router = useRouter();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { profile } = useAuth();
  const { showToast } = useToast();

  const isAsisten = role === 'asisten';
  const canManage = isAsisten && profile?.uid === practicum.assistantId;
  const assistantName = practicum.assistantName ?? (isAsisten ? profile?.name : undefined);

  const [activeTab, setActiveTab] = useState<SessionTab>('ringkasan');
  const [pendingAction, setPendingAction] = useState<SessionAction | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isLeaveModalVisible, setIsLeaveModalVisible] = useState(false);
  const [deleteAttendanceCount, setDeleteAttendanceCount] = useState<number | null>(
    null
  );
  const [checkingDeleteSession, setCheckingDeleteSession] = useState(false);
  const [deletingSession, setDeletingSession] = useState(false);
  const savingRef = useRef(false);

  const {
    records,
    myRecord: attendanceRecord,
    loading: attendanceLoading,
    error: attendanceError,
    retry: retryAttendance,
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

  const recapEntries = useMemo(
    () => buildRecapEntries(records, leaveRequests),
    [records, leaveRequests]
  );

  const pendingLeaveCount = leaveRequests.filter(
    (request) => request.status === 'pending'
  ).length;

  const tabOptions: SegmentOption<SessionTab>[] = isAsisten
    ? [
        { value: 'ringkasan', label: 'Ringkasan' },
        { value: 'kehadiran', label: 'Kehadiran', count: recapEntries.length },
        { value: 'izin', label: 'Izin', count: pendingLeaveCount },
      ]
    : [
        { value: 'ringkasan', label: 'Ringkasan' },
        { value: 'izin', label: 'Izin', count: myLeaveRequest ? 1 : 0 },
      ];

  // Jaga agar tab kehadiran (khusus asisten) tidak pernah aktif untuk praktikan.
  const visibleTab: SessionTab =
    !isAsisten && activeTab === 'kehadiran' ? 'ringkasan' : activeTab;

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

  const handleRequestDeleteSession = async () => {
    if (!canManage || checkingDeleteSession || savingRef.current) {
      return;
    }

    setCheckingDeleteSession(true);
    try {
      const count = await getSessionAttendanceCount(practicum.id, session.id);
      setDeleteAttendanceCount(count);
    } catch (error) {
      showToast(
        error instanceof Error
          ? error.message
          : 'Gagal memeriksa data kehadiran sesi.',
        'error'
      );
    } finally {
      setCheckingDeleteSession(false);
    }
  };

  const handleConfirmDeleteSession = async () => {
    if (!canManage || savingRef.current) {
      return;
    }

    savingRef.current = true;
    setDeletingSession(true);
    try {
      await deleteSessionCascade(practicum.id, session.id);
      setDeleteAttendanceCount(null);
      showToast('Sesi berhasil dihapus', 'success');
      router.replace('/asisten');
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : 'Gagal menghapus sesi.',
        'error'
      );
    } finally {
      savingRef.current = false;
      setDeletingSession(false);
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

  const showFooter =
    visibleTab === 'ringkasan' &&
    (!isAsisten || (canManage && session.status !== 'closed'));

  return (
    <View style={[styles.container, { backgroundColor: theme.primary }]}>
      <View
        style={[
          styles.sheet,
          {
            backgroundColor: theme.background,
            paddingBottom: Math.max(insets.bottom, Spacing.two),
          },
        ]}>
        <View style={[styles.handle, { backgroundColor: theme.borderStrong }]} />

        <View style={styles.tabsWrap}>
          <SegmentedControl<SessionTab>
            options={tabOptions}
            value={visibleTab}
            onChange={setActiveTab}
          />
        </View>

        {visibleTab === 'ringkasan' ? (
          <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
            <View style={styles.summary}>
              <View style={styles.rowBetween}>
                <Text style={[styles.date, { color: theme.textSecondary }]}>
                  {session.date}
                </Text>
                <StatusBadge status={session.status} />
              </View>
              <Text style={[styles.title, { color: theme.textPrimary }]}>
                {practicum.name}
              </Text>
              <Text style={[styles.time, { color: theme.textPrimary }]}>
                {session.startTime}–{session.endTime} WIB
              </Text>
              <Text style={[styles.meta, { color: theme.textSecondary }]}>
                {practicum.className} · {session.room}
              </Text>
            </View>

            <View
              style={[
                styles.infoCard,
                Shadow.soft,
                { backgroundColor: theme.surface },
              ]}>
              <DetailRow label="Asisten" value={assistantName ?? '—'} />
              <DetailRow label="Kelas" value={practicum.className} />
              <DetailRow label="Ruang" value={session.room} />
              {session.openedAt ? (
                <DetailRow label="Dibuka pukul" value={session.openedAt} />
              ) : null}
              {session.closedAt ? (
                <DetailRow label="Ditutup pukul" value={session.closedAt} />
              ) : null}
            </View>

            <StatusGuidance
              role={role}
              status={session.status}
              openedAt={session.openedAt}
              closedAt={session.closedAt}
              hasAttended={Boolean(attendanceRecord)}
            />

            {canManage ? (
              <View
                style={[
                  styles.infoCard,
                  Shadow.soft,
                  { backgroundColor: theme.surface },
                ]}>
                <Text style={[styles.manageHeading, { color: theme.textPrimary }]}>
                  Pengelolaan Praktikum & Sesi
                </Text>
                <AppButton
                  label="Kelola praktikum & peserta"
                  variant="secondary"
                  onPress={() =>
                    router.push({
                      pathname: '/asisten/practicum/[practicumId]',
                      params: { practicumId: practicum.id },
                    })
                  }
                />
                {session.status !== 'closed' ? (
                  <AppButton
                    label="Ubah jadwal sesi"
                    variant="secondary"
                    onPress={() =>
                      router.push({
                        pathname: '/asisten/session/form',
                        params: {
                          practicumId: practicum.id,
                          sessionId: session.id,
                        },
                      })
                    }
                  />
                ) : null}
                <AppButton
                  label="Hapus sesi"
                  variant="destructive"
                  loading={checkingDeleteSession || deletingSession}
                  onPress={handleRequestDeleteSession}
                />
              </View>
            ) : null}

            {attendanceError ? (
              <InlineError message={attendanceError} onRetry={retryAttendance} />
            ) : null}
            {leaveError ? <InlineError message={leaveError} onRetry={retryLeave} /> : null}
          </ScrollView>
        ) : null}

        {visibleTab === 'kehadiran' && isAsisten ? (
          <SessionRecapList
            practicum={practicum}
            session={session}
            entries={recapEntries}
            loading={attendanceLoading || leaveLoading}
            error={attendanceError ?? leaveError}
            onRetry={() => {
              retryAttendance();
              retryLeave();
            }}
          />
        ) : null}

        {visibleTab === 'izin' ? (
          <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
            {leaveError ? <InlineError message={leaveError} onRetry={retryLeave} /> : null}

            {leaveLoading ? (
              <LoadingState label="Memuat pengajuan izin…" />
            ) : isAsisten ? (
              leaveRequests.length === 0 ? (
                <EmptyState
                  title="Belum ada pengajuan izin"
                  description="Pengajuan izin praktikan akan muncul di sini."
                />
              ) : (
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
              )
            ) : myLeaveRequest ? (
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
            ) : (
              <EmptyState
                title="Belum ada pengajuan izin"
                description={
                  session.status === 'closed'
                    ? 'Sesi sudah ditutup.'
                    : 'Ajukan izin bila berhalangan hadir.'
                }
                actionLabel={session.status === 'closed' ? undefined : 'Ajukan izin'}
                onAction={
                  session.status === 'closed'
                    ? undefined
                    : () => setIsLeaveModalVisible(true)
                }
              />
            )}
          </ScrollView>
        ) : null}

        {showFooter ? (
          <View style={[styles.footer, { borderTopColor: theme.border }]}>
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
                </View>
              ) : (
                <>
                  {attendanceLoading ? (
                    <AppButton
                      label="Memuat status presensi…"
                      onPress={() => undefined}
                      disabled
                    />
                  ) : null}

                  {!attendanceLoading && attendanceRecord ? (
                    <AttendanceSuccessPanel
                      recordedAt={formatTimestampToTime(attendanceRecord.recordedAt)}
                    />
                  ) : null}

                  {!attendanceLoading &&
                  !attendanceRecord &&
                  myLeaveRequest?.status === 'approved' ? (
                    <AppButton
                      label="Izin Anda sudah diterima"
                      onPress={() => undefined}
                      disabled
                      variant="secondary"
                    />
                  ) : null}

                  {!attendanceLoading &&
                  !attendanceRecord &&
                  myLeaveRequest?.status !== 'approved' &&
                  session.status === 'open' ? (
                    <AppButton
                      label="Catat kehadiran"
                      onPress={() =>
                        router.push({
                          pathname: '/praktikan/presence/[sessionId]',
                          params: {
                            sessionId: session.id,
                            practicumId: practicum.id,
                          },
                        })
                      }
                    />
                  ) : null}

                  {!attendanceLoading &&
                  !attendanceRecord &&
                  myLeaveRequest?.status !== 'approved' &&
                  session.status === 'upcoming' ? (
                    <AppButton
                      label="Presensi belum tersedia"
                      onPress={() => undefined}
                      disabled
                    />
                  ) : null}

                  {!attendanceLoading &&
                  !attendanceRecord &&
                  myLeaveRequest?.status !== 'approved' &&
                  session.status === 'closed' ? (
                    <AppButton
                      label="Sesi telah ditutup"
                      onPress={() => undefined}
                      disabled
                    />
                  ) : null}
                </>
              )}
            </View>
          </View>
        ) : null}
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

      <ConfirmModal
        destructive
        title="Hapus sesi?"
        message={
          deleteAttendanceCount && deleteAttendanceCount > 0
            ? `PERINGATAN: Sesi ${practicum.name} (${session.date}) sudah memiliki ${deleteAttendanceCount} data kehadiran tercatat. Menghapus sesi ini akan ikut menghapus data kehadiran terkait secara permanen.`
            : `Sesi ${practicum.name} pada ${session.date} (${session.startTime}–${session.endTime}) akan dihapus secara permanen.`
        }
        confirmLabel={deletingSession ? 'Menghapus…' : 'Hapus sesi'}
        onCancel={() => {
          if (!deletingSession) {
            setDeleteAttendanceCount(null);
          }
        }}
        onConfirm={handleConfirmDeleteSession}
        visible={deleteAttendanceCount !== null}
      />
    </View>
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
    <View style={[styles.inlineError, { backgroundColor: theme.errorSoft }]}>
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
  openedAt,
  closedAt,
  hasAttended,
}: {
  role: UserRole;
  status: SessionStatus;
  openedAt?: string;
  closedAt?: string;
  hasAttended: boolean;
}) {
  const theme = useTheme();

  if (status === 'open') {
    return (
      <View style={[styles.guidance, { backgroundColor: theme.successSoft }]}>
        <Text style={[styles.guidanceTitle, { color: theme.success }]}>
          Sesi sedang dibuka
        </Text>
        <Text style={[styles.body, { color: theme.textSecondary }]}>
          {hasAttended
            ? `Kehadiran Anda sudah tercatat${openedAt ? ` pukul ${openedAt}` : ''}.`
            : 'Presensi tersedia sampai asisten menutup sesi.'}
        </Text>
      </View>
    );
  }

  if (status === 'closed') {
    return (
      <View style={[styles.guidance, { backgroundColor: theme.surfaceSubtle }]}>
        <Text style={[styles.guidanceTitle, { color: theme.textPrimary }]}>
          Sesi telah ditutup
        </Text>
        <Text style={[styles.body, { color: theme.textSecondary }]}>
          {hasAttended ? 'Kehadiran Anda tetap tercatat.' : 'Presensi tidak lagi diterima.'}
          {closedAt ? ` Ditutup pukul ${closedAt}.` : ''}
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.guidance, { backgroundColor: theme.surfaceSubtle }]}>
      <Text style={[styles.guidanceTitle, { color: theme.textPrimary }]}>
        Sesi belum dibuka
      </Text>
      <Text style={[styles.body, { color: theme.textSecondary }]}>
        {role === 'asisten'
          ? 'Buka sesi agar presensi dapat dicatat.'
          : 'Presensi tersedia setelah asisten membuka sesi.'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  sheet: {
    flex: 1,
    marginTop: -Spacing.four,
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
  tabsWrap: {
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.two,
    maxWidth: 560,
    alignSelf: 'center',
    width: '100%',
  },
  scroll: { flex: 1 },
  content: {
    padding: Spacing.three,
    paddingBottom: Spacing.four,
    gap: Spacing.three,
    maxWidth: 560,
    alignSelf: 'center',
    width: '100%',
  },
  summary: { gap: Spacing.one },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: Spacing.two,
  },
  date: { ...Typography.caption, fontWeight: '600', flexShrink: 1 },
  title: { ...Typography.screenTitle },
  time: { ...Typography.bodyStrong, fontVariant: ['tabular-nums'] },
  meta: { ...Typography.caption },
  infoCard: {
    borderRadius: Radius.card,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  manageHeading: { ...Typography.cardTitle, marginBottom: Spacing.half },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', gap: Spacing.three },
  detailLabel: { ...Typography.body },
  detailValue: {
    ...Typography.bodyStrong,
    flexShrink: 1,
    textAlign: 'right',
  },
  guidance: {
    borderRadius: Radius.card,
    padding: Spacing.four,
    gap: Spacing.two,
  },
  guidanceTitle: { ...Typography.sectionTitle },
  body: { ...Typography.body },
  inlineError: {
    borderRadius: Radius.lg,
    padding: Spacing.three,
    gap: Spacing.one,
  },
  inlineErrorText: { ...Typography.label, fontWeight: '400' },
  inlineErrorAction: { ...Typography.label },
  footer: {
    borderTopWidth: 1,
    padding: Spacing.three,
    alignItems: 'center',
  },
  footerContent: { width: '100%', maxWidth: 560, gap: Spacing.two },
  actionStack: { gap: Spacing.two },
});
