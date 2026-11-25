// src/components/leave/leave-status-card.tsx
import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { LeaveRequest } from '../../types/attendance';
import { Radius, Shadow, Spacing, Typography } from '../../constants/theme';
import { useTheme } from '../../hooks/use-theme';
import { formatTimestampToTime } from '../../services/attendanceService';
import { StatusDot, StatusTone } from '../ui/status-dot';
import { LeaveRequestModal } from './leave-request-modal';

interface LeaveStatusCardProps {
  leaveRequest: LeaveRequest;
  sessionTitle: string;
  onUpdateReason: (newReason: string) => Promise<void>;
  onCancelLeave: () => Promise<void>;
}

export function LeaveStatusCard({
  leaveRequest,
  sessionTitle,
  onUpdateReason,
  onCancelLeave,
}: LeaveStatusCardProps) {
  const theme = useTheme();
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);

  const STATUS_META: Record<string, { label: string; tone: StatusTone }> = {
    pending: { label: 'Menunggu', tone: 'warning' },
    approved: { label: 'Diterima', tone: 'success' },
    rejected: { label: 'Ditolak', tone: 'error' },
  };

  const currentStatus = STATUS_META[leaveRequest.status] ?? STATUS_META.pending;

  const handleConfirmCancel = () => {
    Alert.alert(
      'Batalkan Izin?',
      'Pengajuan izin Anda untuk sesi ini akan dihapus.',
      [
        { text: 'Tidak', style: 'cancel' },
        {
          text: 'Ya, Batalkan',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsCancelling(true);
              await onCancelLeave();
            } finally {
              setIsCancelling(false);
            }
          },
        },
      ]
    );
  };

  return (
    <View style={[styles.card, Shadow.soft, { backgroundColor: theme.surface }]}>
      <View style={styles.headerRow}>
        <Text style={[styles.cardTitle, { color: theme.textPrimary }]}>Pengajuan Izin</Text>
        <StatusDot label={currentStatus.label} tone={currentStatus.tone} />
      </View>

      <Text style={[styles.reasonText, { color: theme.textPrimary }]}>“{leaveRequest.reason}”</Text>

      {/* Umpan balik keputusan asisten (FR-P2-05) */}
      {leaveRequest.status !== 'pending' ? (
        <View
          style={[
            styles.decisionBanner,
            {
              backgroundColor:
                leaveRequest.status === 'approved'
                  ? theme.successSoft
                  : theme.errorSoft,
            },
          ]}>
          <Text
            style={[
              styles.decisionTitle,
              {
                color:
                  leaveRequest.status === 'approved'
                    ? theme.success
                    : theme.error,
              },
            ]}>
            {leaveRequest.status === 'approved'
              ? 'Pengajuan izin Anda disetujui asisten.'
              : 'Pengajuan izin Anda ditolak asisten.'}
          </Text>
          {leaveRequest.decidedAt ? (
            <Text style={[styles.decisionMeta, { color: theme.textSecondary }]}>
              Diputuskan pukul {formatTimestampToTime(leaveRequest.decidedAt)} WIB
            </Text>
          ) : null}
        </View>
      ) : null}

      {/* Catatan Asisten jika ada */}
      {leaveRequest.reviewNote ? (
        <View style={[styles.reviewNoteBox, { backgroundColor: theme.surfaceSubtle }]}>
          <Text style={[styles.reviewNoteTitle, { color: theme.textSecondary }]}>Catatan Asisten:</Text>
          <Text style={[styles.reviewNoteText, { color: theme.textPrimary }]}>
            {leaveRequest.reviewNote}
          </Text>
        </View>
      ) : null}

      {/* Aksi Ubah / Batalkan hanya jika masih pending */}
      {leaveRequest.status === 'pending' ? (
        <View style={[styles.actionRow, { borderTopColor: theme.border }]}>
          <TouchableOpacity
            style={[styles.smallBtn, { borderColor: theme.border }]}
            onPress={() => setIsEditModalOpen(true)}>
            <Text style={[styles.smallBtnText, { color: theme.textPrimary }]}>Ubah Alasan</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.smallBtn, { borderColor: theme.border }]}
            onPress={handleConfirmCancel}
            disabled={isCancelling}>
            <Text style={[styles.smallBtnText, { color: theme.error }]}>
              {isCancelling ? 'Membatalkan...' : 'Batalkan Izin'}
            </Text>
          </TouchableOpacity>
        </View>
      ) : null}

      <LeaveRequestModal
        // Remount saat modal dibuka agar isian selalu memakai alasan terbaru.
        key={isEditModalOpen ? 'edit-open' : 'edit-closed'}
        visible={isEditModalOpen}
        sessionTitle={sessionTitle}
        initialReason={leaveRequest.reason}
        isEditing
        onClose={() => setIsEditModalOpen(false)}
        onSubmit={onUpdateReason}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.card,
    padding: Spacing.four,
    marginTop: Spacing.three,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.two,
  },
  cardTitle: {
    ...Typography.cardTitle,
  },
  reasonText: {
    ...Typography.body,
    fontStyle: 'italic',
    marginTop: 2,
    marginBottom: Spacing.two,
  },
  decisionBanner: {
    padding: Spacing.two,
    borderRadius: Radius.sm,
    marginTop: Spacing.one,
    gap: 2,
  },
  decisionTitle: {
    ...Typography.label,
  },
  decisionMeta: {
    ...Typography.caption,
  },
  reviewNoteBox: {
    padding: Spacing.two,
    borderRadius: Radius.sm,
    marginTop: Spacing.two,
  },
  reviewNoteTitle: {
    ...Typography.caption,
    fontWeight: '700',
  },
  reviewNoteText: {
    ...Typography.body,
    marginTop: 2,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: Spacing.two,
    marginTop: Spacing.three,
    paddingTop: Spacing.two,
    borderTopWidth: 1,
  },
  smallBtn: {
    borderWidth: 1,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Radius.pill,
    minHeight: 44,
    justifyContent: 'center',
  },
  smallBtnText: {
    ...Typography.label,
  },
});
