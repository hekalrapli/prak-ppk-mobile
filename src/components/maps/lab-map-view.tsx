// src/components/maps/lab-map-view.tsx
import { SymbolView } from 'expo-symbols';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Linking, Pressable, StyleSheet, View } from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';

import { ErrorState, LoadingState } from '@/components/ui/screen-state';
import { Radius, Shadow, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { withAlpha } from '@/lib/color';
import { useThemeMode } from '@/store/theme-context';
import type { LabMapViewProps } from './lab-map-view.types';
import {
  buildOsmMapHtml,
  OSM_MAP_BASE_URL,
  serializeForWebView,
  type OsmMapInitialView,
  type OsmMapMessage,
  type OsmMapStatePayload,
  type OsmMapThemeColors,
} from './osm-map-html';

/** Titik tengah area kampus bila belum ada data laboratorium/posisi. */
const FALLBACK_COORDINATES = {
  latitude: -7.0498,
  longitude: 110.4391,
};

const FALLBACK_ZOOM = 14;
const INITIAL_FOCUS_ZOOM = 16;
const RECENTER_ZOOM = 17;

function parseOsmMessage(raw: string): OsmMapMessage | null {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || !('type' in parsed)) {
      return null;
    }

    const type = (parsed as { type: unknown }).type;
    if (type === 'ready') {
      return { type: 'ready' };
    }
    if (type === 'selectLab') {
      const labId = (parsed as { labId?: unknown }).labId;
      return {
        type: 'selectLab',
        labId: typeof labId === 'string' ? labId : null,
      };
    }
    if (type === 'scriptError') {
      const message = (parsed as { message?: unknown }).message;
      return {
        type: 'scriptError',
        message:
          typeof message === 'string' && message.trim()
            ? message
            : 'Gagal memuat peta OpenStreetMap.',
      };
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * FR-P1-03: peta interaktif laboratorium berbasis OpenStreetMap (Leaflet + WebView).
 *
 * - Berjalan seragam di Expo Go, EAS Development Build, dan APK Android/iOS
 *   tanpa memerlukan Google Maps SDK maupun Google Maps API Key.
 * - Menampilkan marker tiap laboratorium, lingkaran radius geofence, posisi GPS
 *   live pengguna + lingkaran akurasi, kontrol zoom, dan tombol pusatkan lokasi.
 * - Mengetuk marker laboratorium membuka `LabActivitySheet` melalui `onSelectLaboratory`.
 *
 * Catatan: implementasi web ada di `lab-map-view.web.tsx`.
 */
export function LabMapView({
  laboratories,
  selectedLabId,
  userPosition,
  onSelectLaboratory,
}: LabMapViewProps) {
  const theme = useTheme();
  const { scheme } = useThemeMode();
  const webViewRef = useRef<WebView<object> | null>(null);

  const [webViewKey, setWebViewKey] = useState(0);
  const [mapStatus, setMapStatus] = useState<{
    key: number;
    status: 'loading' | 'ready' | 'error';
    errorMessage?: string;
  }>({ key: 0, status: 'loading' });

  const mapColors = useMemo<OsmMapThemeColors>(
    () => ({
      scheme,
      background: theme.background,
      surface: theme.surface,
      textPrimary: theme.textPrimary,
      textSecondary: theme.textSecondary,
      border: theme.border,
      primary: theme.primary,
      secondary: theme.secondary,
      onPrimary: theme.onPrimary,
      link: theme.link,
      userHalo: withAlpha(theme.link, 0.28),
    }),
    [scheme, theme]
  );

  // HTML statis dibuat sekali saat mount (dan saat user menekan Muat ulang),
  // sedangkan seluruh pembaruan data & tema dikirim via `injectJavaScript`.
  const [initialHtml] = useState<string>(() => {
    const initialView: OsmMapInitialView = userPosition
      ? {
          latitude: userPosition.latitude,
          longitude: userPosition.longitude,
          zoom: INITIAL_FOCUS_ZOOM,
          hasInitialFocus: true,
        }
      : laboratories[0]
        ? {
            latitude: laboratories[0].latitude,
            longitude: laboratories[0].longitude,
            zoom: INITIAL_FOCUS_ZOOM,
            hasInitialFocus: true,
          }
        : {
            latitude: FALLBACK_COORDINATES.latitude,
            longitude: FALLBACK_COORDINATES.longitude,
            zoom: FALLBACK_ZOOM,
            hasInitialFocus: false,
          };

    return buildOsmMapHtml(initialView, mapColors);
  });

  const isReady = mapStatus.key === webViewKey && mapStatus.status === 'ready';
  const isLoading = mapStatus.key !== webViewKey || mapStatus.status === 'loading';
  const loadError =
    mapStatus.key === webViewKey && mapStatus.status === 'error'
      ? mapStatus.errorMessage ?? 'Gagal memuat peta OpenStreetMap.'
      : null;

  const statePayload = useMemo<OsmMapStatePayload>(
    () => ({
      laboratories: laboratories.map((lab) => ({
        id: lab.id,
        name: lab.name,
        building: lab.building,
        latitude: lab.latitude,
        longitude: lab.longitude,
        radiusMeter: lab.radiusMeter,
      })),
      selectedLabId,
      userPosition: userPosition
        ? {
            latitude: userPosition.latitude,
            longitude: userPosition.longitude,
            accuracy: userPosition.accuracy ?? null,
          }
        : null,
      colors: mapColors,
    }),
    [laboratories, selectedLabId, userPosition, mapColors]
  );

  useEffect(() => {
    if (!isReady) {
      return;
    }

    const serialized = serializeForWebView(statePayload);
    webViewRef.current?.injectJavaScript(
      `window.__PRAKYUKS_MAP__ && window.__PRAKYUKS_MAP__.setState(${serialized}); true;`
    );
  }, [isReady, statePayload]);

  const handleMessage = (event: WebViewMessageEvent) => {
    const message = parseOsmMessage(event.nativeEvent.data);
    if (!message) {
      return;
    }

    if (message.type === 'ready') {
      setMapStatus({ key: webViewKey, status: 'ready' });
      return;
    }

    if (message.type === 'scriptError') {
      setMapStatus({
        key: webViewKey,
        status: 'error',
        errorMessage: message.message,
      });
      return;
    }

    if (message.type === 'selectLab') {
      if (!message.labId) {
        onSelectLaboratory(null);
        return;
      }
      const matched = laboratories.find((item) => item.id === message.labId) ?? null;
      onSelectLaboratory(matched);
    }
  };

  const handleRetry = () => {
    setWebViewKey((current) => current + 1);
  };

  const recenterToUser = () => {
    if (!userPosition || !isReady) {
      return;
    }
    webViewRef.current?.injectJavaScript(
      `window.__PRAKYUKS_MAP__ && window.__PRAKYUKS_MAP__.focusPoint(${userPosition.latitude}, ${userPosition.longitude}, ${RECENTER_ZOOM}); true;`
    );
  };

  const webViewSource = useMemo(
    () => ({ html: initialHtml, baseUrl: OSM_MAP_BASE_URL }),
    [initialHtml]
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <WebView<object>
        key={webViewKey}
        ref={webViewRef}
        applicationNameForUserAgent="PrakYuks/1.0.0"
        bounces={false}
        domStorageEnabled
        javaScriptEnabled
        onContentProcessDidTerminate={handleRetry}
        onError={() =>
          setMapStatus({
            key: webViewKey,
            status: 'error',
            errorMessage:
              'Gagal memuat peta OpenStreetMap. Periksa koneksi internet Anda lalu coba lagi.',
          })
        }
        onMessage={handleMessage}
        onRenderProcessGone={handleRetry}
        onShouldStartLoadWithRequest={(request) => {
          const url = request.url;
          if (!url || url === 'about:blank' || url.startsWith(OSM_MAP_BASE_URL)) {
            return true;
          }
          if (url.startsWith('https://') || url.startsWith('http://')) {
            void Linking.openURL(url).catch(() => undefined);
          }
          return false;
        }}
        originWhitelist={['https://*', 'about:*']}
        overScrollMode="never"
        scrollEnabled={false}
        setSupportMultipleWindows={false}
        showsHorizontalScrollIndicator={false}
        showsVerticalScrollIndicator={false}
        source={webViewSource}
        style={[styles.webView, { backgroundColor: theme.background }]}
      />

      {isLoading ? (
        <View
          pointerEvents="none"
          style={[styles.overlay, { backgroundColor: theme.background }]}>
          <LoadingState label="Memuat peta OpenStreetMap…" />
        </View>
      ) : null}

      {loadError ? (
        <View style={[styles.overlay, { backgroundColor: theme.background }]}>
          <ErrorState message={loadError} onRetry={handleRetry} />
        </View>
      ) : null}

      {userPosition && isReady ? (
        <Pressable
          accessibilityLabel="Pusatkan peta ke lokasi saya"
          accessibilityRole="button"
          onPress={recenterToUser}
          style={({ pressed }) => [
            styles.recenter,
            Shadow.floating,
            {
              backgroundColor: theme.surface,
              opacity: pressed ? 0.85 : 1,
            },
          ]}>
          <SymbolView
            name={{ ios: 'location.fill', android: 'my_location', web: 'my_location' }}
            size={22}
            tintColor={theme.primary}
          />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, overflow: 'hidden' },
  webView: { flex: 1 },
  overlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.three,
  },
  recenter: {
    position: 'absolute',
    right: Spacing.three,
    bottom: Spacing.three,
    width: 48,
    height: 48,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
