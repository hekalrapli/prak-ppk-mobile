// src/components/ui/offline-banner.tsx
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { Spacing } from '../../constants/theme';

export function OfflineBanner() {
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const handleOnline = () => setIsOffline(false);
      const handleOffline = () => setIsOffline(true);

      setIsOffline(!window.navigator.onLine);

      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);

      return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
      };
    }
  }, []);

  if (!isOffline) return null;

  return (
    <View style={styles.banner}>
      <Text style={styles.text}>Anda sedang offline. Data cache tetap ditampilkan.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: '#b91c1c',
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
  },
  text: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
});

