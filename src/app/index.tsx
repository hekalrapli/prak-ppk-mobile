import Constants from 'expo-constants';
import { SymbolView } from 'expo-symbols';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Radius, Shadow, Spacing, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/store/auth-context';

/**
 * Branded loading screen saat aplikasi dibuka.
 * Tampil selama autentikasi dan profil diperiksa sebelum AuthGate
 * mengarahkan ke /login atau beranda sesuai peran.
 */
export default function EntryScreen() {
  const theme = useTheme();
  const { profileLoading } = useAuth();
  const [opacity] = useState(() => new Animated.Value(0));
  const [translateY] = useState(() => new Animated.Value(12));

  useEffect(() => {
    const animation = Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 320,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 320,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]);

    animation.start();
    return () => {
      animation.stop();
    };
  }, [opacity, translateY]);

  const version = Constants.expoConfig?.version ?? '1.0.0';
  const statusText = profileLoading ? 'Memuat profil…' : 'Menyiapkan aplikasi…';

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.surfaceWarm }]}>
      <Animated.View
        style={[
          styles.brandBlock,
          { opacity, transform: [{ translateY }] },
        ]}>
        <View style={[styles.emblemHalo, { backgroundColor: theme.primarySoft }]}>
          <View
            style={[
              styles.emblem,
              Shadow.floating,
              { backgroundColor: theme.primary },
            ]}>
            <SymbolView
              name={{
                ios: 'checkmark.seal.fill',
                android: 'verified',
                web: 'verified',
              }}
              size={38}
              tintColor={theme.onPrimary}
            />
          </View>
        </View>

        <View style={styles.titleGroup}>
          <Text style={[styles.wordmark, { color: theme.textPrimary }]}>
            Prakitiw
          </Text>
          <Text style={[styles.tagline, { color: theme.textSecondary }]}>
            Presensi praktikum berbasis lokasi & QR
          </Text>
        </View>
      </Animated.View>

      <View style={styles.footer}>
        <View
          accessibilityLiveRegion="polite"
          style={[
            styles.statusPill,
            { backgroundColor: theme.surface, borderColor: theme.border },
          ]}>
          <ActivityIndicator color={theme.primary} size="small" />
          <Text style={[styles.statusLabel, { color: theme.textSecondary }]}>
            {statusText}
          </Text>
        </View>
        <Text style={[styles.version, { color: theme.textTertiary }]}>
          Prakitiw · v{version}
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.five,
  },
  brandBlock: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.four,
    maxWidth: 320,
  },
  emblemHalo: {
    width: 100,
    height: 100,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emblem: {
    width: 78,
    height: 78,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleGroup: {
    alignItems: 'center',
    gap: Spacing.one,
  },
  wordmark: {
    ...Typography.display,
    fontSize: 32,
    lineHeight: 40,
    letterSpacing: -0.5,
  },
  tagline: {
    ...Typography.body,
    textAlign: 'center',
  },
  footer: {
    alignItems: 'center',
    gap: Spacing.three,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Radius.pill,
    borderWidth: 1,
  },
  statusLabel: {
    ...Typography.caption,
  },
  version: {
    ...Typography.caption,
  },
});
