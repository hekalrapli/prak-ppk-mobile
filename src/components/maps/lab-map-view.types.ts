// src/components/maps/lab-map-view.types.ts
import type { DevicePosition, Laboratory } from '@/types/location';

/**
 * Kontrak bersama untuk peta laboratorium.
 *
 * Implementasi native (`lab-map-view.tsx`) memakai react-native-maps, sedangkan
 * `lab-map-view.web.tsx` menampilkan daftar setara karena react-native-maps
 * tidak mendukung web. Metro memilih file yang tepat per platform.
 */
export interface LabMapViewProps {
  laboratories: Laboratory[];
  selectedLabId: string | null;
  userPosition: DevicePosition | null;
  onSelectLaboratory: (laboratory: Laboratory | null) => void;
}
