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
import { BrandLogo } from '@/components/ui/brand-logo';
import { Radius, Spacing, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/store/auth-context';

export default function LoginScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { user, profileLoading, login } = useAuth();

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
  const isSigningIn = submitting || (Boolean(user) && profileLoading);

  const handleSubmit = async () => {
    if (isSigningIn) {
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
      style={[styles.container, { backgroundColor: theme.surfaceWarm }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}>
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <BrandLogo size="md" />
            <View style={styles.titleBlock}>
              <Text style={[styles.title, { color: theme.textPrimary }]}>
                PrakYuks
              </Text>
              <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
                Masuk untuk mengakses jadwal dan presensi praktikum.
              </Text>
            </View>
          </View>

          <View style={styles.fields}>
            <AppTextField
              autoCapitalize="none"
              autoComplete="email"
              autoCorrect={false}
              editable={!isSigningIn}
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
              editable={!isSigningIn}
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

          <View style={styles.actionBlock}>
            <AppButton
              disabled={!isValid}
              label="Masuk"
              loading={isSigningIn}
              onPress={handleSubmit}
            />

            <View style={styles.registerRow}>
              <Text style={[styles.registerPrompt, { color: theme.textSecondary }]}>
                Belum punya akun?
              </Text>
              <Pressable
                accessibilityRole="button"
                disabled={isSigningIn}
                hitSlop={8}
                onPress={() => router.push('/register')}
                style={({ pressed }) => [
                  styles.registerTrigger,
                  pressed && { opacity: 0.75 },
                ]}>
                <Text style={[styles.registerLink, { color: theme.link }]}>Daftar</Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>
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
  header: {
    alignItems: 'center',
    gap: Spacing.three,
    marginTop: Spacing.three,
  },
  titleBlock: {
    alignItems: 'center',
    gap: Spacing.one,
  },
  title: {
    ...Typography.display,
    textAlign: 'center',
  },
  subtitle: {
    ...Typography.body,
    textAlign: 'center',
  },
  fields: { gap: Spacing.three },
  errorPanel: {
    borderRadius: Radius.lg,
    padding: Spacing.three,
  },
  errorText: { ...Typography.body },
  actionBlock: {
    gap: Spacing.three,
  },
  registerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.two,
  },
  registerTrigger: {
    minHeight: 44,
    justifyContent: 'center',
  },
  registerPrompt: { ...Typography.body },
  registerLink: { ...Typography.bodyStrong },
});
