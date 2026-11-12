// src/components/leave/leave-status-card.tsx
import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { LeaveRequest } from '../../types/attendance';
import { Radius, Spacing } from '../../constants/theme';
import { useTheme } from '../../hooks/use-theme';
import { AICategoryBadge } from './ai-category-badge';
import { LeaveRequestModal } from './leave-request-modal';

interface LeaveStatusCardProps {
  leaveRequest: LeaveRequest;
  sessionTitle: string;
  onUpdateReason: (newReason: string) => Promise<void>;
  onCancelLeave: () => Promise<void>;
  onRetryAI: () => Promise<void>;
}

export function LeaveStatusCard({
  leaveRequest,
  sessionTitle,
  onUpdateReason,
  onCancelLeave,
  onRetryAI,
}: LeaveStatusCardProps) {
  const theme = useTheme();
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isRetryingAI, setIsRetryingAI] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);

  const statusColors = {
    pending: { bg: '#fef3c7', text: '#92400e', label: 'Menunggu Keputusan' },
    approved: { bg: '#dcfce7', text: '#166534', label: 'Izin Diterima' },
    rejected: { bg: '#fee2e2', text: '#991b1b', label: 'Izin Ditolak' },
  };

  const currentStatus = statusColors[leaveRequest.status] || statusColors.pending;

  const handleRetryAI = async () => {
    try {
      setIsRetryingAI(true);
      await onRetryAI();
    } finally {
      setIsRetryingAI(false);
    }
  };

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
    <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <View style={styles.headerRow}>
        <Text style={[styles.cardTitle, { color: theme.textPrimary }]}>Pengajuan Izin</Text>
        <View style={[styles.statusBadge, { backgroundColor: currentStatus.bg }]}>
          <Text style={[styles.statusText, { color: currentStatus.text }]}>
            {currentStatus.label}
          </Text>
        </View>
      </View>

      <Text style={[styles.reasonLabel, { color: theme.textSecondary }]}>Alasan yang diajukan:</Text>
      <Text style={[styles.reasonText, { color: theme.textPrimary }]}>"{leaveRequest.reason}"</Text>

      {/* AI Category Chip (FR-18) */}
      <AICategoryBadge
        ai={leaveRequest.ai}
        onRetry={handleRetryAI}
        isRetrying={isRetryingAI}
      />

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
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[styles.smallBtn, { borderColor: theme.border }]}
            onPress={() => setIsEditModalOpen(true)}>
            <Text style={[styles.smallBtnText, { color: theme.textPrimary }]}>Ubah Alasan</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.smallBtn, styles.cancelBtn]}
            onPress={handleConfirmCancel}
            disabled={isCancelling}>
            <Text style={styles.cancelBtnText}>
              {isCancelling ? 'Membatalkan...' : 'Batalkan Izin'}
            </Text>
          </TouchableOpacity>
        </View>
      ) : null}

      <LeaveRequestModal
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
    borderWidth: 1,
    borderRadius: Radius.lg,
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
    fontSize: 15,
    fontWeight: '700',
  },
  statusBadge: {
    paddingHorizontal: Spacing.two,
    paddingVertical: 3,
    borderRadius: Radius.sm,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
  },
  reasonLabel: {
    fontSize: 12,
    marginTop: Spacing.one,
  },
  reasonText: {
    fontSize: 14,
    fontStyle: 'italic',
    marginTop: 2,
    marginBottom: Spacing.two,
  },
  reviewNoteBox: {
    padding: Spacing.two,
    borderRadius: Radius.sm,
    marginTop: Spacing.two,
  },
  reviewNoteTitle: {
    fontSize: 12,
    fontWeight: '600',
  },
  reviewNoteText: {
    fontSize: 13,
    marginTop: 2,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: Spacing.two,
    marginTop: Spacing.three,
    paddingTop: Spacing.two,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  smallBtn: {
    borderWidth: 1,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
    borderRadius: Radius.sm,
  },
  smallBtnText: {
    fontSize: 12,
    fontWeight: '600',
  },
  cancelBtn: {
    borderColor: '#fca5a5',
    backgroundColor: '#fff1f2',
  },
  cancelBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#e11d48',
  },
});
