// src/components/maps/lab-map-view.tsx
import { SymbolView } from 'expo-symbols';
import { useRef, useState } from 'react';import { Platform, Pressable, StyleSheet, View } from 'react-native';
import MapView, {
  Circle,
  Marker,
  PROVIDER_GOOGLE,
  type Region,
} from 'react-native-maps';

import { Radius, Shadow, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { withAlpha } from '@/lib/color';
import type { Laboratory } from '@/types/location';
import type { LabMapViewProps } from './lab-map-view.types';

/** Titik tengah area kampus bila belum ada data laboratorium/posisi. */
const FALLBACK_REGION: Region = {
  latitude: -7.0498,
  longitude: 110.4391,
  latitudeDelta: 0.02,
  longitudeDelta: 0.02,
};

const FOCUS_DELTA = 0.004;

function regionAround(coordinates: { latitude: number; longitude: number }): Region {
  return {
    latitude: coordinates.latitude,
    longitude: coordinates.longitude,
    latitudeDelta: FOCUS_DELTA,
    longitudeDelta: FOCUS_DELTA,
  };
}

/**
 * FR-P1-03: peta interaktif laboratorium (native).
 *
 * - `<Marker>` untuk setiap laboratorium, `<Circle>` untuk radius presensi.
 * - Marker mahasiswa mengikuti posisi live dari `useDevicePosition`.
 * - Mengetuk marker laboratorium memilih lab sekaligus menggeser kamera.
 * - Tombol "lokasi saya" mengembalikan kamera ke posisi perangkat.
 *
 * Catatan: implementasi web ada di `lab-map-view.web.tsx`; react-native-maps
 * tidak memiliki dukungan web sehingga tidak boleh diimpor di sana.
 */
export function LabMapView({
  laboratories,
  selectedLabId,
  userPosition,
  onSelectLaboratory,
}: LabMapViewProps) {
  const theme = useTheme();
  const mapRef = useRef<MapView | null>(null);

  // useState dengan initializer: nilainya dihitung sekali dan aman dibaca saat
  // render (membaca ref.current saat render dilarang oleh React Compiler).
  const [initialRegion] = useState<Region>(() =>
    userPosition
      ? regionAround(userPosition)
      : laboratories[0]
        ? regionAround(laboratories[0])
        : FALLBACK_REGION
  );

  const focusLaboratory = (laboratory: Laboratory) => {
    onSelectLaboratory(laboratory);
    mapRef.current?.animateToRegion(regionAround(laboratory), 450);
  };

  const recenterToUser = () => {
    if (!userPosition) return;
    mapRef.current?.animateToRegion(regionAround(userPosition), 450);
  };

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        initialRegion={initialRegion}
        loadingEnabled
        onPress={() => onSelectLaboratory(null)}
        provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
        showsCompass
        showsMyLocationButton={false}
        style={StyleSheet.absoluteFill}
        toolbarEnabled={false}>
        {laboratories.map((laboratory) => {
          const selected = laboratory.id === selectedLabId;

          // Array (bukan Fragment) agar setiap elemen tetap menjadi child
          // langsung MapView, sesuai kontrak react-native-maps.
          return [
            <Circle
              key={`${laboratory.id}-radius`}
              center={{
                latitude: laboratory.latitude,
                longitude: laboratory.longitude,
              }}
              fillColor={withAlpha(theme.primary, selected ? 0.24 : 0.12)}
              radius={Math.max(laboratory.radiusMeter, 1)}
              strokeColor={withAlpha(theme.primary, selected ? 0.9 : 0.6)}
              strokeWidth={selected ? 3 : 2}
            />,
            <Marker
              key={`${laboratory.id}-marker`}
              accessibilityLabel={`${laboratory.name}, radius ${laboratory.radiusMeter} meter`}
              coordinate={{
                latitude: laboratory.latitude,
                longitude: laboratory.longitude,
              }}
              description={`${laboratory.building || 'Lokasi laboratorium'} · radius ${
                laboratory.radiusMeter
              } m`}
              onPress={() => focusLaboratory(laboratory)}
              pinColor={selected ? theme.primary : theme.secondary}
              title={laboratory.name}
            />,
          ];
        })}

        {userPosition ? (
          <>
            {userPosition.accuracy && userPosition.accuracy > 0 ? (
              <Circle
                center={{
                  latitude: userPosition.latitude,
                  longitude: userPosition.longitude,
                }}
                fillColor={withAlpha(theme.link, 0.08)}
                radius={userPosition.accuracy}
                strokeColor={withAlpha(theme.link, 0.35)}
                strokeWidth={1}
              />
            ) : null}
            <Marker
              anchor={{ x: 0.5, y: 0.5 }}
              coordinate={{
                latitude: userPosition.latitude,
                longitude: userPosition.longitude,
              }}
              flat
              tracksViewChanges={false}
              zIndex={10}>
              <View
                accessibilityLabel="Posisi Anda saat ini"
                style={[
                  styles.userHalo,
                  { backgroundColor: withAlpha(theme.link, 0.28) },
                ]}>
                <View
                  style={[
                    styles.userDot,
                    { backgroundColor: theme.link, borderColor: theme.background },
                  ]}
                />
              </View>
            </Marker>
          </>
        ) : null}
      </MapView>

      {userPosition ? (
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
  userHalo: {
    width: 26,
    height: 26,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userDot: {
    width: 14,
    height: 14,
    borderRadius: Radius.full,
    borderWidth: 2,
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
