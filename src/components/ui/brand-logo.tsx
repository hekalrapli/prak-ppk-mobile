import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';

import { Radius, Shadow } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

const BRAND_LOGO = require('@/assets/images/under-computer.webp');

interface BrandLogoProps {
  /** `lg` untuk layar pembuka, `md` untuk header form masuk. */
  size?: 'md' | 'lg';
  /** `rounded` untuk kartu emblem kotak membulat, `circle` untuk emblem lingkaran penuh. */
  shape?: 'rounded' | 'circle';
  /** Tampilkan halo koral lembut di luar tile logo. */
  showHalo?: boolean;
}

const METRICS = {
  md: {
    haloSize: 92,
    haloRadius: 28,
    tileSize: 74,
    tileRadius: 22,
    padding: 10,
  },
  lg: {
    haloSize: 126,
    haloRadius: 36,
    tileSize: 108,
    tileRadius: 28,
    padding: 16,
  },
} as const;

/**
 * Logo resmi PrakYuks (`under-computer.webp`) di dalam tile putih
 * agar tetap tajam di mode terang maupun gelap.
 */
export function BrandLogo({
  size = 'md',
  shape = 'rounded',
  showHalo = true,
}: BrandLogoProps) {
  const theme = useTheme();
  const metric = METRICS[size];
  const isCircle = shape === 'circle';
  const tileRadius = isCircle ? Radius.full : metric.tileRadius;
  const haloRadius = isCircle ? Radius.full : metric.haloRadius;

  const tile = (
    <View
      accessible={!showHalo}
      accessibilityLabel={!showHalo ? 'Logo PrakYuks' : undefined}
      accessibilityRole={!showHalo ? 'image' : undefined}
      style={[
        styles.tile,
        size === 'lg' ? Shadow.floating : Shadow.soft,
        {
          width: metric.tileSize,
          height: metric.tileSize,
          borderRadius: tileRadius,
          padding: metric.padding,
          backgroundColor: theme.onPrimary,
          borderColor: theme.border,
        },
      ]}>
      <Image
        contentFit="contain"
        source={BRAND_LOGO}
        style={styles.image}
        transition={120}
      />
    </View>
  );

  if (!showHalo) {
    return tile;
  }

  return (
    <View
      accessible
      accessibilityLabel="Logo PrakYuks"
      accessibilityRole="image"
      style={[
        styles.halo,
        {
          width: metric.haloSize,
          height: metric.haloSize,
          borderRadius: haloRadius,
          backgroundColor: theme.primarySoft,
        },
      ]}>
      {tile}
    </View>
  );
}

const styles = StyleSheet.create({
  halo: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  tile: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
});
