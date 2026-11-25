import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';

import { Shadow } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

const BRAND_LOGO = require('@/assets/images/under-computer.webp');

interface BrandLogoProps {
  /** `lg` untuk layar pembuka, `md` untuk header form masuk. */
  size?: 'md' | 'lg';
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
    haloSize: 116,
    haloRadius: 34,
    tileSize: 94,
    tileRadius: 26,
    padding: 12,
  },
} as const;

/**
 * Logo resmi PrakYuks (`under-computer.webp`) di dalam tile putih membulat
 * dan halo koral lembut agar tetap tajam di mode terang maupun gelap.
 */
export function BrandLogo({ size = 'md' }: BrandLogoProps) {
  const theme = useTheme();
  const metric = METRICS[size];

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
          borderRadius: metric.haloRadius,
          backgroundColor: theme.primarySoft,
        },
      ]}>
      <View
        style={[
          styles.tile,
          size === 'lg' ? Shadow.floating : Shadow.soft,
          {
            width: metric.tileSize,
            height: metric.tileSize,
            borderRadius: metric.tileRadius,
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
