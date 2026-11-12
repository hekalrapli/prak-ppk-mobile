// src/components/leave/leave-request-modal.tsx
import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Radius, Spacing } from '../../constants/theme';
import { useTheme } from '../../hooks/use-theme';
import { validateLeaveReason } from '../../services/errorHandler';

interface LeaveRequestModalProps {
  visible: boolean;
  sessionTitle: string;
  initialReason?: string;
  isEditing?: boolean;
  onClose: () => void;
  onSubmit: (reason: string) => Promise<void>;
}

export function LeaveRequestModal({
  visible,
  sessionTitle,
  initialReason = '',
  isEditing = false,
  onClose,
  onSubmit,
}: LeaveRequestModalProps) {
  const theme = useTheme();
  const [reason, setReason] = useState(initialReason);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const characterCount = reason.trim().length;
  const isValid = characterCount >= 10 && characterCount <= 500;

  const handleSubmit = async () => {
    const validationError = validateLeaveReason(reason);
    if (validationError) {
      setErrorMsg(validationError);
      return;
    }

    try {
      setLoading(true);
      setErrorMsg(null);
      await onSubmit(reason);
      setReason('');
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal mengajukan izin.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.overlay}>
        <View style={[styles.modalCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[styles.title, { color: theme.textPrimary }]}>
            {isEditing ? 'Ubah Alasan Izin' : 'Pengajuan Izin Praktikum'}
          </Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
            {sessionTitle}
          </Text>

          <View style={styles.inputContainer}>
            <TextInput
              style={[
                styles.textArea,
                {
                  backgroundColor: theme.surfaceSubtle,
                  color: theme.textPrimary,
                  borderColor: errorMsg ? '#ef4444' : theme.border,
                },
              ]}
              placeholder="Tuliskan alasan izin Anda (10–500 karakter)..."
              placeholderTextColor={theme.textTertiary}
              multiline
              numberOfLines={4}
              maxLength={500}
              value={reason}
              onChangeText={(text) => {
                setReason(text);
                if (errorMsg) setErrorMsg(null);
              }}
              editable={!loading}
            />

            <View style={styles.charCountRow}>
              {errorMsg ? (
                <Text style={styles.errorText}>{errorMsg}</Text>
              ) : (
                <Text style={[styles.counter, { color: isValid ? theme.textSecondary : '#f59e0b' }]}>
                  {characterCount < 10
                    ? `Kurang ${10 - characterCount} karakter lagi`
                    : `${characterCount} / 500 karakter`}
                </Text>
              )}
            </View>
          </View>

          <Text style={[styles.infoText, { color: theme.textTertiary }]}>
            Alasan Anda akan dianalisis secara otomatis oleh AI sebagai informasi pendukung untuk asisten.
          </Text>

          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton, { borderColor: theme.border }]}
              onPress={onClose}
              disabled={loading}>
              <Text style={[styles.buttonText, { color: theme.textPrimary }]}>Batal</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.button,
                styles.submitButton,
                { opacity: isValid && !loading ? 1 : 0.5 },
              ]}
              onPress={handleSubmit}
              disabled={!isValid || loading}>
              {loading ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Text style={[styles.buttonText, { color: '#ffffff' }]}>
                  {isEditing ? 'Simpan Perubahan' : 'Kirim Izin'}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.four,
  },
  modalCard: {
    width: '100%',
    maxWidth: 480,
    borderRadius: Radius.lg,
    padding: Spacing.four,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    marginBottom: Spacing.three,
  },
  inputContainer: {
    marginBottom: Spacing.two,
  },
  textArea: {
    borderWidth: 1,
    borderRadius: Radius.md,
    padding: Spacing.three,
    height: 110,
    textAlignVertical: 'top',
    fontSize: 14,
  },
  charCountRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 4,
  },
  counter: {
    fontSize: 12,
  },
  errorText: {
    fontSize: 12,
    color: '#ef4444',
    fontWeight: '500',
  },
  infoText: {
    fontSize: 12,
    marginBottom: Spacing.four,
    lineHeight: 16,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: Spacing.two,
  },
  button: {
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.four,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 90,
  },
  cancelButton: {
    borderWidth: 1,
  },
  submitButton: {
    backgroundColor: '#2563eb',
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
