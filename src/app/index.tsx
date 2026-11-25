import Constants from 'expo-constants';
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
import Svg, { Circle } from 'react-native-svg';

import { BRAND_SPLASH_MIN_MS } from '@/components/auth/auth-gate';
import { BrandLogo } from '@/components/ui/brand-logo';
import { Radius, Spacing, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/store/auth-context';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const RING_SIZE = 152;
const RING_STROKE = 5;
const RING_RADIUS = (RING_SIZE - RING_STROKE) / 2;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;
const RING_ANIMATION_MS = Math.max(1200, BRAND_SPLASH_MIN_MS - 150);

/**
 * Branded circular loading screen saat aplikasi dibuka.
 * Menampilkan lingkaran progres koral mengelilingi logo PrakYuks selama ~2,5 detik
 * sambil autentikasi dan profil diperiksa sebelum AuthGate berpindah layar.
 */
export default function EntryScreen() {
  const theme = useTheme();
  const { profileLoading } = useAuth();
  const [opacity] = useState(() => new Animated.Value(0));
  const [scale] = useState(() => new Animated.Value(0.94));
  const [progress] = useState(() => new Animated.Value(0));

  useEffect(() => {
    const enterAnimation = Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 360,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(scale, {
        toValue: 1,
        duration: 360,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]);

    const ringAnimation = Animated.timing(progress, {
      toValue: 1,
      duration: RING_ANIMATION_MS,
      easing: Easing.inOut(Easing.cubic),
      useNativeDriver: false,
    });

    enterAnimation.start();
    ringAnimation.start();

    return () => {
      enterAnimation.stop();
      ringAnimation.stop();
    };
  }, [opacity, scale, progress]);

  const strokeDashoffset = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [RING_CIRCUMFERENCE, 0],
  });

  const version = Constants.expoConfig?.version ?? '1.0.0';
  const statusText = profileLoading ? 'Memuat profil…' : 'Menyiapkan aplikasi…';

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.surfaceWarm }]}>
      <Animated.View
        style={[
          styles.brandBlock,
          { opacity, transform: [{ scale }] },
        ]}>
        <View style={styles.circleStage}>
          <View style={styles.ringWrap}>
            <Svg height={RING_SIZE} width={RING_SIZE}>
              <Circle
                cx={RING_SIZE / 2}
                cy={RING_SIZE / 2}
                fill="none"
                r={RING_RADIUS}
                stroke={theme.primarySoft}
                strokeWidth={RING_STROKE}
              />
              <AnimatedCircle
                cx={RING_SIZE / 2}
                cy={RING_SIZE / 2}
                fill="none"
                r={RING_RADIUS}
                stroke={theme.primary}
                strokeDasharray={RING_CIRCUMFERENCE}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                strokeWidth={RING_STROKE}
              />
            </Svg>
          </View>

          <BrandLogo shape="circle" showHalo={false} size="lg" />
        </View>

        <View style={styles.titleGroup}>
          <Text style={[styles.wordmark, { color: theme.textPrimary }]}>
            PrakYuks
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
          PrakYuks · v{version}
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
  circleStage: {
    width: RING_SIZE,
    height: RING_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringWrap: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ rotate: '-90deg' }],
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
