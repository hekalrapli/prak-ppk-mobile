// src/types/location.ts
/** Titik koordinat WGS-84 dalam derajat desimal. */
export interface GeoCoordinates {
  latitude: number;
  longitude: number;
}

/** Posisi perangkat hasil pembacaan GPS. */
export interface DevicePosition extends GeoCoordinates {
  /** Radius ketidakpastian dalam meter; null bila platform tidak menyediakannya. */
  accuracy: number | null;
  /** Waktu pembacaan (epoch ms). */
  timestamp: number;
  /** true bila sistem mendeteksi lokasi palsu (mock provider / simulator). */
  mocked: boolean;
}

/** Status izin lokasi yang sudah disederhanakan untuk UI. */
export type LocationPermissionState = 'granted' | 'denied' | 'undetermined';

/**
 * Kondisi yang membuat pembacaan lokasi gagal. Dipakai UI untuk memilih pesan
 * dan aksi yang tepat (mis. membuka Pengaturan perangkat).
 */
export type LocationIssue =
  | 'permission-denied'
  | 'services-disabled'
  | 'unavailable'
  | 'timeout'
  | 'mocked';

/** Titik laboratorium beserta radius presensi yang diizinkan. */
export interface Laboratory extends GeoCoordinates {
  id: string;
  /** Nama laboratorium, mis. "Laboratorium Basis Data". */
  name: string;
  /** Deskripsi gedung/lantai, mis. "Gedung E Lantai 2". */
  building: string;
  /** Radius presensi dalam meter; 0 berarti laboratorium belum siap dipakai. */
  radiusMeter: number;
}
