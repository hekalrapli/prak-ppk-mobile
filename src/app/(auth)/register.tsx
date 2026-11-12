import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppButton } from '@/components/ui/app-button';
import { AppTextField } from '@/components/ui/app-text-field';
import { RoleCard } from '@/components/ui/selection-cards';
import { useToast } from '@/components/ui/toast-provider';
import { Spacing, Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/store/auth-context';
import { useDemoData } from '@/store/demo-data-context';
import { UserRole } from '@/types/attendance';

type FieldKey =
  | 'name'
  | 'identifier'
  | 'email'
  | 'password'
  | 'confirmPassword'
  | 'inviteCode';

type FieldErrors = Partial<Record<FieldKey, string>>;

interface FormValues {
  name: string;
  identifier: string;
  email: string;
  password: string;
  confirmPassword: string;
  inviteCode: string;
}

function validate(values: FormValues, role: UserRole): FieldErrors {
  const errors: FieldErrors = {};

  const name = values.name.trim();
  if (!name) {
    errors.name = 'Nama lengkap wajib diisi.';
  } else if (name.length > 60) {
    errors.name = 'Nama maksimal 60 karakter.';
  }

  const identifier = values.identifier.trim();
  if (!identifier) {
    errors.identifier = 'NIM/NIP wajib diisi.';
  } else if (!/^\d{8,20}$/.test(identifier)) {
    errors.identifier = 'NIM/NIP harus 8–20 digit angka.';
  }

  const email = values.email.trim();
  if (!email) {
    errors.email = 'Email wajib diisi.';
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.email = 'Format email tidak valid.';
  }

  if (!values.password) {
    errors.password = 'Kata sandi wajib diisi.';
  } else if (values.password.length < 8) {
    errors.password = 'Kata sandi minimal 8 karakter.';
  }

  if (!values.confirmPassword) {
    errors.confirmPassword = 'Konfirmasi kata sandi wajib diisi.';
  } else if (values.confirmPassword !== values.password) {
    errors.confirmPassword = 'Konfirmasi kata sandi tidak sama.';
  }

  if (role === 'asisten' && !values.inviteCode.trim()) {
    errors.inviteCode = 'Kode undangan asisten wajib diisi.';
  }

  return errors;
}

export default function RegisterScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { register } = useAuth();
  const { dispatch } = useDemoData();
  const { showToast } = useToast();

  const [role, setRole] = useState<UserRole>('praktikan');
  const [name, setName] = useState('');
  const [identifier, setIdentifier] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [touched, setTouched] = useState<Partial<Record<FieldKey, boolean>>>({});
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const values: FormValues = {
    name,
    identifier,
    email,
    password,
    confirmPassword,
    inviteCode,
  };
  const errors = validate(values, role);
  const isValid = Object.keys(errors).length === 0;

  const markTouched = (field: FieldKey) => {
    setTouched((current) => ({ ...current, [field]: true }));
  };

  const visibleError = (field: FieldKey) => (touched[field] ? errors[field] : undefined);

  const handleSubmit = async () => {
    if (submitting) {
      return;
    }

    if (!isValid) {
      setTouched({
        name: true,
        identifier: true,
        email: true,
        password: true,
        confirmPassword: true,
        ...(role === 'asisten' ? { inviteCode: true } : {}),
      });
      return;
    }

    setSubmitting(true);
    setFormError(null);

    try {
      const profile = await register({
        name,
        identifier,
        email,
        password,
        role,
        inviteCode: role === 'asisten' ? inviteCode : undefined,
      });

      // Jembatan sementara agar layar demo Sprint 1 mengenali pengguna baru.
      dispatch({
        type: 'REGISTER_IDENTITY',
        payload: {
          user: {
            id: profile.uid,
            name: profile.name,
            identifier: profile.identifier,
            role: profile.role,
          },
        },
      });

      showToast('Akun berhasil dibuat. Selamat datang!', 'success');
      router.replace(profile.role === 'praktikan' ? '/praktikan' : '/asisten');
    } catch (error) {
      setFormError(
        error instanceof Error ? error.message : 'Pendaftaran gagal. Coba lagi.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView
      edges={['bottom']}
      style={[styles.container, { backgroundColor: theme.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}>
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <Text style={[styles.title, { color: theme.textPrimary }]}>
              Buat akun PrakPresensi
            </Text>
            <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
              Isi data berikut untuk mendaftar sebagai praktikan atau asisten.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>
              Peran
            </Text>
            <View style={styles.roleContainer}>
              <RoleCard
                role="praktikan"
                selected={role === 'praktikan'}
                onSelect={() => setRole('praktikan')}
              />
              <RoleCard
                role="asisten"
                selected={role === 'asisten'}
                onSelect={() => setRole('asisten')}
              />
            </View>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>
              Data diri
            </Text>
            <View style={styles.fields}>
              <AppTextField
                autoCapitalize="words"
                autoCorrect={false}
                error={visibleError('name')}
                label="Nama lengkap"
                maxLength={60}
                onBlur={() => markTouched('name')}
                onChangeText={setName}
                placeholder="Contoh: Nabila Putri"
                required
                value={name}
              />
              <AppTextField
                error={visibleError('identifier')}
                keyboardType="number-pad"
                label={role === 'asisten' ? 'NIP' : 'NIM'}
                maxLength={20}
                onBlur={() => markTouched('identifier')}
                onChangeText={setIdentifier}
                placeholder={role === 'asisten' ? 'Contoh: 2211101008' : 'Contoh: 2211102034'}
                required
                value={identifier}
              />
              <AppTextField
                autoCapitalize="none"
                autoComplete="email"
                autoCorrect={false}
                error={visibleError('email')}
                keyboardType="email-address"
                label="Email"
                onBlur={() => markTouched('email')}
                onChangeText={setEmail}
                placeholder="nama@contoh.com"
                required
                value={email}
              />
              <AppTextField
                autoCapitalize="none"
                autoComplete="new-password"
                autoCorrect={false}
                error={visibleError('password')}
                helper="Minimal 8 karakter."
                label="Kata sandi"
                onBlur={() => markTouched('password')}
                onChangeText={setPassword}
                required
                secureTextEntry
                value={password}
              />
              <AppTextField
                autoCapitalize="none"
                autoComplete="new-password"
                autoCorrect={false}
                error={visibleError('confirmPassword')}
                label="Konfirmasi kata sandi"
                onBlur={() => markTouched('confirmPassword')}
                onChangeText={setConfirmPassword}
                required
                secureTextEntry
                value={confirmPassword}
              />
            </View>
          </View>

          {role === 'asisten' ? (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>
                Kode undangan
              </Text>
              <AppTextField
                autoCapitalize="characters"
                autoCorrect={false}
                error={visibleError('inviteCode')}
                helper="Dapatkan kode ini dari asisten pengampu atau dosen."
                label="Kode undangan asisten"
                onBlur={() => markTouched('inviteCode')}
                onChangeText={setInviteCode}
                placeholder="Contoh: ASISTEN-PPK-2026"
                required
                value={inviteCode}
              />
            </View>
          ) : null}

          {formError ? (
            <View
              style={[
                styles.errorPanel,
                { backgroundColor: theme.errorSoft, borderColor: theme.error },
              ]}>
              <Text style={[styles.errorText, { color: theme.error }]}>{formError}</Text>
            </View>
          ) : null}

          <View style={styles.loginRow}>
            <Text style={[styles.loginPrompt, { color: theme.textSecondary }]}>
              Sudah punya akun?
            </Text>
            <Pressable
              accessibilityRole="button"
              hitSlop={8}
              onPress={() => router.replace('/login')}>
              <Text style={[styles.loginLink, { color: theme.primary }]}>Masuk</Text>
            </Pressable>
          </View>
        </ScrollView>

        <View
          style={[
            styles.footer,
            { backgroundColor: theme.background, borderTopColor: theme.border },
          ]}>
          <View style={styles.footerContent}>
            <AppButton
              disabled={!isValid}
              label="Daftar"
              loading={submitting}
              onPress={handleSubmit}
            />
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  flex: { flex: 1 },
  content: {
    padding: Spacing.three,
    paddingBottom: Spacing.five,
    gap: Spacing.four,
    maxWidth: 560,
    alignSelf: 'center',
    width: '100%',
  },
  header: { gap: Spacing.two, marginTop: Spacing.two },
  title: { fontSize: 24, fontWeight: '700', lineHeight: 32 },
  subtitle: { fontSize: 16, lineHeight: 24 },
  section: { gap: Spacing.three },
  sectionTitle: { fontSize: 18, fontWeight: '600', lineHeight: 26 },
  roleContainer: { flexDirection: 'row', gap: Spacing.three },
  fields: { gap: Spacing.three },
  errorPanel: {
    borderWidth: 1,
    borderRadius: Radius.md,
    padding: Spacing.three,
  },
  errorText: { fontSize: 14, lineHeight: 20 },
  loginRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.two,
  },
  loginPrompt: { fontSize: 14, lineHeight: 20 },
  loginLink: { fontSize: 14, fontWeight: '600', lineHeight: 20 },
  footer: {
    borderTopWidth: 1,
    padding: Spacing.three,
    paddingBottom: Spacing.four,
    alignItems: 'center',
  },
  footerContent: { width: '100%', maxWidth: 560 },
});
