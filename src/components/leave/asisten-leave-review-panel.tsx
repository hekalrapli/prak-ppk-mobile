// src/components/leave/asisten-leave-review-panel.tsx
import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, TextInput } from 'react-native';
import { LeaveRequest } from '../../types/attendance';
import { Radius, Spacing } from '../../constants/theme';
import { useTheme } from '../../hooks/use-theme';
import { AICategoryBadge } from './ai-category-badge';

interface AsistenLeaveReviewPanelProps {
  leaveRequests: LeaveRequest[];
  canManage: boolean;
  asistenId: string;
  onDecide: (
    praktikanId: string,
    decision: 'approved' | 'rejected',
    reviewNote?: string
  ) => Promise<void>;
  onRetryAI?: (praktikanId: string, reason: string) => Promise<void>;
}

export function AsistenLeaveReviewPanel({
  leaveRequests,
  canManage,
  onDecide,
  onRetryAI,
}: AsistenLeaveReviewPanelProps) {
  const theme = useTheme();

  const [selectedRequest, setSelectedRequest] = useState<LeaveRequest | null>(null);
  const [decisionType, setDecisionType] = useState<'approved' | 'rejected' | null>(null);
  const [reviewNote, setReviewNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [noteError, setNoteError] = useState<string | null>(null);

  if (leaveRequests.length === 0) {
    return null; // Tidak perlu tampil jika tidak ada permohonan izin
  }

  const handleOpenDecision = (req: LeaveRequest, type: 'approved' | 'rejected') => {
    setSelectedRequest(req);
    setDecisionType(type);
    setReviewNote('');
    setNoteError(null);
  };

  const handleConfirmDecision = async () => {
    if (!selectedRequest || !decisionType) return;

    if (decisionType === 'rejected' && reviewNote.trim().length === 0) {
      setNoteError('Catatan wajib diisi saat menolak izin.');
      return;
    }

    try {
      setSubmitting(true);
      await onDecide(selectedRequest.praktikanId, decisionType, reviewNote.trim());
      setSelectedRequest(null);
      setDecisionType(null);
    } catch (err: any) {
      setNoteError(err.message || 'Gagal menyimpan keputusan.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <Text style={[styles.title, { color: theme.textPrimary }]}>
        Pengajuan Izin Masuk ({leaveRequests.length})
      </Text>
      <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
        Daftar praktikan yang mengajukan izin untuk sesi ini.
      </Text>

      {leaveRequests.map((req) => {
        const isPending = req.status === 'pending';
        const isApproved = req.status === 'approved';

        return (
          <View
            key={req.praktikanId}
            style={[
              styles.requestItem,
              {
                backgroundColor: theme.surfaceSubtle,
                borderColor: isPending ? '#fbbf24' : isApproved ? '#86efac' : '#fca5a5',
              },
            ]}>
            <View style={styles.reqHeader}>
              <View>
                <Text style={[styles.studentName, { color: theme.textPrimary }]}>
                  {req.praktikanName}
                </Text>
                <Text style={[styles.studentNim, { color: theme.textSecondary }]}>
                  {req.praktikanNim}
                </Text>
              </View>

              <View
                style={[
                  styles.statusTag,
                  {
                    backgroundColor: isPending
                      ? '#fef3c7'
                      : isApproved
                      ? '#dcfce7'
                      : '#fee2e2',
                  },
                ]}>
                <Text
                  style={[
                    styles.statusTagText,
                    {
                      color: isPending
                        ? '#92400e'
                        : isApproved
                        ? '#166534'
                        : '#991b1b',
                    },
                  ]}>
                  {isPending ? 'Menunggu' : isApproved ? 'Diterima' : 'Ditolak'}
                </Text>
              </View>
            </View>

            <Text style={[styles.reasonText, { color: theme.textPrimary }]}>
              "{req.reason}"
            </Text>

            {/* AI Classification Chip (FR-18) */}
            <AICategoryBadge
              ai={req.ai}
              onRetry={
                onRetryAI ? () => onRetryAI(req.praktikanId, req.reason) : undefined
              }
            />

            {req.reviewNote ? (
              <Text style={[styles.noteText, { color: theme.textSecondary }]}>
                Catatan: {req.reviewNote}
              </Text>
            ) : null}

            {/* Aksi Terima / Tolak untuk Asisten Pengampu jika status pending */}
            {canManage && isPending ? (
              <View style={styles.actionRow}>
                <TouchableOpacity
                  style={[styles.btn, styles.rejectBtn]}
                  onPress={() => handleOpenDecision(req, 'rejected')}>
                  <Text style={styles.rejectBtnText}>Tolak Izin</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.btn, styles.approveBtn]}
                  onPress={() => handleOpenDecision(req, 'approved')}>
                  <Text style={styles.approveBtnText}>Terima Izin</Text>
                </TouchableOpacity>
              </View>
            ) : null}
          </View>
        );
      })}

      {/* Modal Keputusan Izin */}
      <Modal
        visible={selectedRequest !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedRequest(null)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>
              {decisionType === 'approved' ? 'Terima Pengajuan Izin?' : 'Tolak Pengajuan Izin?'}
            </Text>
            <Text style={[styles.modalDesc, { color: theme.textSecondary }]}>
              {selectedRequest?.praktikanName} ({selectedRequest?.praktikanNim})
            </Text>

            <View style={styles.noteInputContainer}>
              <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>
                Catatan review {decisionType === 'rejected' ? '(Wajib diisi):' : '(Opsional):'}
              </Text>
              <TextInput
                style={[
                  styles.noteInput,
                  {
                    backgroundColor: theme.surfaceSubtle,
                    color: theme.textPrimary,
                    borderColor: noteError ? '#ef4444' : theme.border,
                  },
                ]}
                placeholder={
                  decisionType === 'rejected'
                    ? 'Alasan penolakan izin...'
                    : 'Catatan untuk praktikan...'
                }
                placeholderTextColor={theme.textTertiary}
                multiline
                maxLength={200}
                value={reviewNote}
                onChangeText={(text) => {
                  setReviewNote(text);
                  if (noteError) setNoteError(null);
                }}
              />
              {noteError ? <Text style={styles.errorText}>{noteError}</Text> : null}
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.btn, styles.cancelBtn, { borderColor: theme.border }]}
                onPress={() => setSelectedRequest(null)}
                disabled={submitting}>
                <Text style={{ color: theme.textPrimary, fontWeight: '600' }}>Batal</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.btn,
                  decisionType === 'approved' ? styles.approveBtn : styles.rejectBtn,
                ]}
                onPress={handleConfirmDecision}
                disabled={submitting}>
                <Text style={{ color: '#ffffff', fontWeight: '600' }}>
                  {submitting ? 'Menyimpan...' : 'Konfirmasi'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: Radius.lg,
    padding: Spacing.four,
    marginTop: Spacing.four,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 13,
    marginBottom: Spacing.three,
  },
  requestItem: {
    borderWidth: 1,
    borderRadius: Radius.md,
    padding: Spacing.three,
    marginBottom: Spacing.three,
  },
  reqHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.one,
  },
  studentName: {
    fontSize: 14,
    fontWeight: '700',
  },
  studentNim: {
    fontSize: 12,
  },
  statusTag: {
    paddingHorizontal: Spacing.two,
    paddingVertical: 2,
    borderRadius: Radius.sm,
  },
  statusTagText: {
    fontSize: 11,
    fontWeight: '700',
  },
  reasonText: {
    fontSize: 13,
    fontStyle: 'italic',
    marginTop: 2,
    marginBottom: 4,
  },
  noteText: {
    fontSize: 12,
    marginTop: 4,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: Spacing.two,
    marginTop: Spacing.two,
  },
  btn: {
    paddingVertical: 6,
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  approveBtn: {
    backgroundColor: '#16a34a',
  },
  approveBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  rejectBtn: {
    backgroundColor: '#dc2626',
  },
  rejectBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.four,
  },
  modalBox: {
    width: '100%',
    maxWidth: 420,
    borderRadius: Radius.lg,
    padding: Spacing.four,
    borderWidth: 1,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 4,
  },
  modalDesc: {
    fontSize: 13,
    marginBottom: Spacing.three,
  },
  noteInputContainer: {
    marginBottom: Spacing.three,
  },
  inputLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  noteInput: {
    borderWidth: 1,
    borderRadius: Radius.md,
    padding: Spacing.two,
    height: 70,
    textAlignVertical: 'top',
    fontSize: 13,
  },
  errorText: {
    fontSize: 12,
    color: '#ef4444',
    marginTop: 4,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: Spacing.two,
  },
  cancelBtn: {
    borderWidth: 1,
  },
});
