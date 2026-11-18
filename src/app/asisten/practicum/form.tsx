import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppButton } from '@/components/ui/app-button';
import { AppTextField } from '@/components/ui/app-text-field';
import { DetailScreen } from '@/components/ui/detail-screen';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState, LoadingState } from '@/components/ui/screen-state';
import { useToast } from '@/components/ui/toast-provider';
import { Radius, Spacing, Typography } from '@/constants/theme';
import { usePracticumDetail } from '@/hooks/use-practicum-detail';
import { useTheme } from '@/hooks/use-theme';
import {
  createPracticum,
  updatePracticum,
  validatePracticumInput,
} from '@/services/scheduleService';
import { useAuth } from '@/store/auth-context';

export default function PracticumFormScreen() {
  const router = useRouter();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { profile } = useAuth();
  const { showToast } = useToast();
  const { practicumId } = useLocalSearchParams<{ practicumId?: string }>();

  const isEditing = Boolean(practicumId);
  const { practicum, loading, error, retry } = usePracticumDetail(practicumId);

  const [name, setName] = useState('');
  const [className, setClassName] = useState('');
  const [touched, setTouched] = useState<{ name?: boolean; className?: boolean }>({});
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const initializedRef = useRef(false);
  const savingRef = useRef(false);

  useEffect(() => {
    if (isEditing && practicum && !initializedRef.current) {
      setName(practicum.name);
      setClassName(practicum.className);
      initializedRef.current = true;
    }
  }, [isEditing, practicum]);

  const screenTitle = isEditing ? 'Ubah Praktikum' : 'Tambah Praktikum';

  if (isEditing && loading) {
    return (
      <DetailScreen title={screenTitle}>
        <View style={styles.fallback}>
          <LoadingState label="Memuat data praktikum…" />
        </View>
      </DetailScreen>
    );
  }

  if (isEditing && error) {
    return (
      <DetailScreen title={screenTitle}>
        <View style={styles.fallback}>
          <ErrorState message={error} onRetry={retry} />
        </View>
      </DetailScreen>
    );
  }

  if (isEditing && !practicum) {
    return (
      <DetailScreen title={screenTitle}>
        <View style={styles.fallback}>
          <EmptyState
            title="Praktikum tidak ditemukan"
            description="Praktikum yang ingin Anda ubah tidak tersedia."
            actionLabel="Kembali ke jadwal"
            onAction={() => router.replace('/asisten')}
          />
        </View>
      </DetailScreen>
    );
  }

  if (isEditing && practicum && practicum.assistantId !== profile?.uid) {
    return <Redirect href="/asisten" />;
  }

  const errors = validatePracticumInput({ name, className });
  const isValid = Object.keys(errors).length === 0;

  const handleSubmit = async () => {
    if (savingRef.current || !profile) {
      return;
    }

    if (!isValid) {
      setTouched({ name: true, className: true });
      return;
    }

    savingRef.current = true;
    setSubmitting(true);
    setFormError(null);

    try {
      if (isEditing && practicumId) {
        await updatePracticum(practicumId, { name, className });
        showToast('Praktikum berhasil diperbarui', 'success');
        router.back();
      } else {
        const newId = await createPracticum({
          name,
          className,
          assistantId: profile.uid,
          assistantName: profile.name,
        });
        showToast('Praktikum berhasil ditambahkan', 'success');
        router.replace({
          pathname: '/asisten/practicum/[practicumId]',
          params: { practicumId: newId },
        });
      }
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : 'Gagal menyimpan praktikum.'
      );
    } finally {
      savingRef.current = false;
      setSubmitting(false);
    }
  };

  return (
    <DetailScreen title={screenTitle}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}>
        <View
          style={[
            styles.sheet,
            {
              backgroundColor: theme.background,
              paddingBottom: Math.max(insets.bottom, Spacing.two),
            },
          ]}>
          <View style={[styles.handle, { backgroundColor: theme.borderStrong }]} />

          <ScrollView
            style={styles.flex}
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled">
            <View style={styles.headerBlock}>
              <Text style={[styles.heading, { color: theme.textPrimary }]}>
                {isEditing ? 'Perbarui Informasi Praktikum' : 'Data Praktikum Baru'}
              </Text>
              <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
                Pengampu: {profile?.name ?? '—'}
              </Text>
            </View>

            <View style={styles.fields}>
              <AppTextField
                label="Nama praktikum"
                placeholder="Contoh: Praktikum Pemrograman Mobile"
                value={name}
                onChangeText={setName}
                onBlur={() => setTouched((curr) => ({ ...curr, name: true }))}
                error={touched.name ? errors.name : undefined}
                helper="Maksimal 100 karakter."
                maxLength={100}
                required
                editable={!submitting}
              />

              <AppTextField
                label="Kelas"
                placeholder="Contoh: IF-3A"
                value={className}
                onChangeText={setClassName}
                onBlur={() => setTouched((curr) => ({ ...curr, className: true }))}
                error={touched.className ? errors.className : undefined}
                helper="Maksimal 30 karakter."
                maxLength={30}
                autoCapitalize="characters"
                required
                editable={!submitting}
              />
            </View>

            {formError ? (
              <View
                style={[styles.errorPanel, { backgroundColor: theme.errorSoft }]}>
                <Text style={[styles.errorText, { color: theme.error }]}>
                  {formError}
                </Text>
              </View>
            ) : null}
          </ScrollView>

          <View style={[styles.footer, { borderTopColor: theme.border }]}>
            <View style={styles.footerContent}>
              <AppButton
                label={isEditing ? 'Simpan perubahan' : 'Simpan praktikum'}
                onPress={handleSubmit}
                disabled={!isValid || submitting}
                loading={submitting}
              />
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </DetailScreen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  fallback: { flex: 1, justifyContent: 'center', padding: Spacing.three },
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
  content: {
    padding: Spacing.three,
    paddingBottom: Spacing.four,
    gap: Spacing.four,
    maxWidth: 560,
    alignSelf: 'center',
    width: '100%',
  },
  headerBlock: { gap: Spacing.half },
  heading: { ...Typography.sectionTitle },
  subtitle: { ...Typography.caption },
  fields: { gap: Spacing.three },
  errorPanel: {
    borderRadius: Radius.lg,
    padding: Spacing.three,
  },
  errorText: { ...Typography.body },
  footer: {
    borderTopWidth: 1,
    padding: Spacing.three,
    alignItems: 'center',
  },
  footerContent: { width: '100%', maxWidth: 560 },
});
