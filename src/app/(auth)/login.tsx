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
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/store/auth-context';

export default function LoginScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [touched, setTouched] = useState<{ email?: boolean; password?: boolean }>({});
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const emailError = !email.trim()
    ? 'Email wajib diisi.'
    : !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
      ? 'Format email tidak valid.'
      : undefined;
  const passwordError = !password ? 'Kata sandi wajib diisi.' : undefined;
  const isValid = !emailError && !passwordError;

  const handleSubmit = async () => {
    if (submitting) {
      return;
    }

    if (!isValid) {
      setTouched({ email: true, password: true });
      return;
    }

    setSubmitting(true);
    setFormError(null);

    try {
      await login(email, password);
      // Pengalihan ke beranda sesuai peran dilakukan oleh AuthGate
      // setelah profil users/{uid} selesai dimuat.
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Login gagal. Coba lagi.');
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
            <Text style={[styles.title, { color: theme.textPrimary }]}>PrakPresensi</Text>
            <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
              Masuk dengan akun praktikum Anda. Peran praktikan atau asisten dikenali
              otomatis.
            </Text>
          </View>

          <View style={styles.fields}>
            <AppTextField
              autoCapitalize="none"
              autoComplete="email"
              autoCorrect={false}
              error={touched.email ? emailError : undefined}
              keyboardType="email-address"
              label="Email"
              onBlur={() => setTouched((current) => ({ ...current, email: true }))}
              onChangeText={setEmail}
              placeholder="nama@contoh.com"
              required
              value={email}
            />
            <AppTextField
              autoCapitalize="none"
              autoComplete="current-password"
              autoCorrect={false}
              error={touched.password ? passwordError : undefined}
              label="Kata sandi"
              onBlur={() => setTouched((current) => ({ ...current, password: true }))}
              onChangeText={setPassword}
              onSubmitEditing={handleSubmit}
              placeholder="Masukkan kata sandi"
              required
              returnKeyType="go"
              secureTextEntry
              value={password}
            />
          </View>

          {formError ? (
            <View
              style={[
                styles.errorPanel,
                { backgroundColor: theme.errorSoft, borderColor: theme.error },
              ]}>
              <Text style={[styles.errorText, { color: theme.error }]}>{formError}</Text>
            </View>
          ) : null}

          <View style={styles.registerRow}>
            <Text style={[styles.registerPrompt, { color: theme.textSecondary }]}>
              Belum punya akun?
            </Text>
            <Pressable
              accessibilityRole="button"
              hitSlop={8}
              onPress={() => router.push('/register')}>
              <Text style={[styles.registerLink, { color: theme.primary }]}>Daftar</Text>
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
              label="Masuk"
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
  header: { gap: Spacing.two, marginTop: Spacing.four },
  title: { fontSize: 30, fontWeight: '700', lineHeight: 38 },
  subtitle: { fontSize: 16, lineHeight: 24 },
  fields: { gap: Spacing.three },
  errorPanel: {
    borderWidth: 1,
    borderRadius: Radius.md,
    padding: Spacing.three,
  },
  errorText: { fontSize: 14, lineHeight: 20 },
  registerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.two,
  },
  registerPrompt: { fontSize: 14, lineHeight: 20 },
  registerLink: { fontSize: 14, fontWeight: '600', lineHeight: 20 },
  footer: {
    borderTopWidth: 1,
    padding: Spacing.three,
    paddingBottom: Spacing.four,
    alignItems: 'center',
  },
  footerContent: { width: '100%', maxWidth: 560 },
});
