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
import { Radius, Shadow, Spacing, Typography } from '../../constants/theme';
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
        style={[styles.overlay, { backgroundColor: theme.overlay }]}>
        <View style={[styles.modalCard, Shadow.soft, { backgroundColor: theme.surface }]}>
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
                  borderColor: errorMsg ? theme.error : theme.border,
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
                <Text style={[styles.errorText, { color: theme.error }]}>{errorMsg}</Text>
              ) : (
                <Text style={[styles.counter, { color: isValid ? theme.textSecondary : theme.warning }]}>
                  {characterCount < 10
                    ? `Kurang ${10 - characterCount} karakter lagi`
                    : `${characterCount} / 500 karakter`}
                </Text>
              )}
            </View>
          </View>

          <Text style={[styles.infoText, { color: theme.textSecondary }]}>
            Alasan dianalisis otomatis. Hasil hanya terlihat oleh asisten.
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
                { backgroundColor: theme.primary, opacity: isValid && !loading ? 1 : 0.5 },
              ]}
              onPress={handleSubmit}
              disabled={!isValid || loading}>
              {loading ? (
                <ActivityIndicator size="small" color={theme.onPrimary} />
              ) : (
                <Text style={[styles.buttonText, { color: theme.onPrimary }]}>
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
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.four,
  },
  modalCard: {
    width: '100%',
    maxWidth: 480,
    borderRadius: Radius.sheet,
    padding: Spacing.four,
  },
  title: {
    ...Typography.sectionTitle,
    marginBottom: 4,
  },
  subtitle: {
    ...Typography.caption,
    marginBottom: Spacing.three,
  },
  inputContainer: {
    marginBottom: Spacing.two,
  },
  textArea: {
    borderRadius: Radius.lg,
    padding: Spacing.three,
    height: 120,
    textAlignVertical: 'top',
    ...Typography.body,
    borderWidth: 1,
  },
  charCountRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 4,
  },
  counter: {
    ...Typography.caption,
  },
  errorText: {
    ...Typography.caption,
    fontWeight: '500',
  },
  infoText: {
    ...Typography.caption,
    marginBottom: Spacing.four,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: Spacing.two,
  },
  button: {
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.four,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    minWidth: 90,
  },
  cancelButton: {
    borderWidth: 1,
  },
  buttonText: {
    ...Typography.label,
  },
});
