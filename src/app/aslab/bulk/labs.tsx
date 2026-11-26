import { useMemo, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BulkCsvPanel } from '@/components/aslab/bulk-csv-panel';
import { AppButton } from '@/components/ui/app-button';
import { AppTextField } from '@/components/ui/app-text-field';
import { DetailScreen } from '@/components/ui/detail-screen';
import { SegmentedControl, type SegmentOption } from '@/components/ui/segmented-control';
import { useToast } from '@/components/ui/toast-provider';
import { Radius, Shadow, Spacing, Typography } from '@/constants/theme';
import { useLaboratories } from '@/hooks/use-laboratories';
import { useTheme } from '@/hooks/use-theme';
import {
  createLaboratory,
  formatRupiah,
  LABORATORY_FINE_DEFAULT,
  LABORATORY_GRACE_PERIOD_DEFAULT,
  LABORATORY_GRACE_PERIOD_MAX,
  LABORATORY_GRACE_PERIOD_MIN,
  LABORATORY_RADIUS_MAX,
  LABORATORY_RADIUS_MIN,
  parseIntegerInput,
  validateLaboratoryInput,
  type LaboratoryFieldKey,
} from '@/services/labService';
import {
  getCurrentCoordinates,
  LocationServiceError,
  requestLocationPermission,
} from '@/services/locationService';
import { useAuth } from '@/store/auth-context';
import type { BulkLabRowData, BulkParseResult } from '@/types/attendance';

type InsertMode = 'single' | 'bulk';

const MODE_OPTIONS: SegmentOption<InsertMode>[] = [
  { value: 'single', label: 'Tambah Satuan' },
  { value: 'bulk', label: 'Import Bulk' },
];

export default function AslabBulkLabsScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { profile } = useAuth();
  const { showToast } = useToast();
  const { labs } = useLaboratories();

  const [courseName, setCourseName] = useState('');
  const [courseTouched, setCourseTouched] = useState(false);
  const [mode, setMode] = useState<InsertMode>('single');

  const [nama, setNama] = useState('');
  const [gedung, setGedung] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [radiusMeter, setRadiusMeter] = useState('50');
  const [gracePeriodMinutes, setGracePeriodMinutes] = useState(
    String(LABORATORY_GRACE_PERIOD_DEFAULT)
  );
  const [lateFineAmount, setLateFineAmount] = useState(
    String(LABORATORY_FINE_DEFAULT)
  );
  const [touched, setTouched] = useState<Partial<Record<LaboratoryFieldKey, boolean>>>(
    {}
  );
  const [submitting, setSubmitting] = useState(false);
  const [locating, setLocating] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [parseResult, setParseResult] =
    useState<BulkParseResult<BulkLabRowData> | null>(null);
  const savingRef = useRef(false);

  const existingCourses = useMemo(() => {
    const unique = new Set<string>();
    labs.forEach((lab) => {
      const trimmed = lab.courseName.trim();
      if (trimmed) unique.add(trimmed);
    });
    return Array.from(unique).sort((a, b) => a.localeCompare(b, 'id'));
  }, [labs]);

  const trimmedCourse = courseName.trim();
  const courseError = !trimmedCourse
    ? 'Mata kuliah wajib dipilih atau diisi terlebih dahulu.'
    : trimmedCourse.length > 100
      ? 'Mata kuliah maksimal 100 karakter.'
      : undefined;
  const courseReady = !courseError;

  const { errors } = validateLaboratoryInput({
    courseName,
    nama,
    gedung,
    latitude,
    longitude,
    radius_meter: radiusMeter,
    grace_period_minutes: gracePeriodMinutes,
    late_fine_amount: lateFineAmount,
  });
  const isSingleValid = Object.keys(errors).length === 0;

  const markTouched = (field: LaboratoryFieldKey) => {
    setTouched((curr) => ({ ...curr, [field]: true }));
  };

  const handleUseCurrentLocation = async () => {
    if (locating || submitting) {
      return;
    }

    setLocating(true);
    setFormError(null);
    try {
      const granted = await requestLocationPermission();
      if (!granted) {
        setFormError(
          'Izin lokasi belum diberikan. Aktifkan izin lokasi di Pengaturan atau isi koordinat secara manual.'
        );
        return;
      }

      const position = await getCurrentCoordinates();
      setLatitude(position.latitude.toFixed(6));
      setLongitude(position.longitude.toFixed(6));
      setTouched((curr) => ({ ...curr, latitude: true, longitude: true }));
      showToast(
        position.mocked
          ? 'Koordinat terisi (terdeteksi lokasi simulasi/mock)'
          : 'Koordinat lokasi saat ini berhasil diisi',
        'success'
      );
    } catch (err) {
      const message =
        err instanceof LocationServiceError || err instanceof Error
          ? err.message
          : 'Gagal membaca lokasi perangkat saat ini.';
      setFormError(message);
    } finally {
      setLocating(false);
    }
  };

  const handleSingleSubmit = async () => {
    if (savingRef.current) {
      return;
    }

    if (!isSingleValid) {
      setCourseTouched(true);
      setTouched({
        courseName: true,
        nama: true,
        gedung: true,
        latitude: true,
        longitude: true,
        radius_meter: true,
        grace_period_minutes: true,
        late_fine_amount: true,
      });
      return;
    }

    savingRef.current = true;
    setSubmitting(true);
    setFormError(null);

    try {
      await createLaboratory(
        {
          courseName,
          nama,
          gedung,
          latitude,
          longitude,
          radius_meter: radiusMeter,
          grace_period_minutes: gracePeriodMinutes,
          late_fine_amount: lateFineAmount,
        },
        { managedByAslabId: profile?.uid }
      );
      showToast(`Laboratorium untuk ${trimmedCourse} berhasil ditambahkan`, 'success');
      setNama('');
      setGedung('');
      setLatitude('');
      setLongitude('');
      setTouched({});
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : 'Gagal menyimpan data laboratorium.'
      );
    } finally {
      savingRef.current = false;
      setSubmitting(false);
    }
  };

  const coordKeyboardType =
    Platform.OS === 'ios' ? 'numbers-and-punctuation' : 'numeric';
  const parsedFinePreview = parseIntegerInput(lateFineAmount);
  const fineHelper =
    parsedFinePreview !== null
      ? parsedFinePreview === 0
        ? 'Nominal 0 = tidak ada denda keterlambatan.'
        : `Denda tetap per keterlambatan: ${formatRupiah(parsedFinePreview)}.`
      : 'Masukkan bilangan bulat >= 0 (Rupiah).';

  return (
    <DetailScreen title="Insert Laboratorium">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}>
        <View
          style={[
            styles.sheet,
            {
              backgroundColor: theme.background,
              paddingBottom: Math.max(insets.bottom, Spacing.two),
            },
          ]}>
          <View style={[styles.handle, { backgroundColor: theme.borderStrong }]} />

          <ScrollView
            style={styles.flex}
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled">
            <View style={[styles.card, Shadow.soft, { backgroundColor: theme.surface }]}>
              <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>
                Pilih Mata Kuliah
              </Text>
              <Text style={[styles.meta, { color: theme.textSecondary }]}>
                Isi satu mata kuliah yang menjadi induk seluruh laboratorium pada alur
                ini.
              </Text>

              <AppTextField
                label="Mata kuliah"
                placeholder="Contoh: Pemrograman Perangkat Keras"
                value={courseName}
                onChangeText={setCourseName}
                onBlur={() => setCourseTouched(true)}
                error={courseTouched || touched.courseName ? courseError : undefined}
                helper="Wajib diisi sebelum menambah satuan atau import bulk."
                maxLength={100}
                required
                editable={!submitting}
              />

              {existingCourses.length > 0 ? (
                <View style={styles.chipSection}>
                  <Text style={[styles.meta, { color: theme.textSecondary }]}>
                    Atau pilih dari mata kuliah yang sudah ada:
                  </Text>
                  <View style={styles.chipRow}>
                    {existingCourses.map((course) => {
                      const active = trimmedCourse === course;
                      return (
                        <Pressable
                          key={course}
                          accessibilityRole="button"
                          onPress={() => {
                            setCourseName(course);
                            setCourseTouched(true);
                          }}
                          style={[
                            styles.courseChip,
                            {
                              backgroundColor: active
                                ? theme.primarySoft
                                : theme.surfaceSubtle,
                              borderColor: active ? theme.primary : theme.border,
                            },
                          ]}>
                          <Text
                            style={[
                              styles.courseChipText,
                              { color: active ? theme.primary : theme.textPrimary },
                            ]}>
                            {course}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              ) : null}
            </View>

            <SegmentedControl<InsertMode>
              options={MODE_OPTIONS}
              value={mode}
              onChange={setMode}
            />

            {mode === 'single' ? (
              <View style={[styles.card, Shadow.soft, { backgroundColor: theme.surface }]}>
                <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>
                  Tambah Satu Laboratorium
                </Text>

                <AppTextField
                  label="Nama laboratorium"
                  placeholder="Contoh: Laboratorium Basis Data"
                  value={nama}
                  onChangeText={setNama}
                  onBlur={() => markTouched('nama')}
                  error={touched.nama ? errors.nama : undefined}
                  helper="Wajib diisi, maksimal 100 karakter."
                  maxLength={100}
                  required
                  editable={!submitting}
                />

                <AppTextField
                  label="Gedung / lokasi"
                  placeholder="Contoh: Gedung E Lantai 2"
                  value={gedung}
                  onChangeText={setGedung}
                  onBlur={() => markTouched('gedung')}
                  error={touched.gedung ? errors.gedung : undefined}
                  helper="Opsional, maksimal 100 karakter."
                  maxLength={100}
                  editable={!submitting}
                />

                <AppButton
                  label={locating ? 'Mengambil lokasi…' : 'Gunakan Lokasi Saya Saat Ini'}
                  variant="secondary"
                  onPress={handleUseCurrentLocation}
                  disabled={submitting || locating}
                  loading={locating}
                />

                <AppTextField
                  label="Latitude"
                  placeholder="Contoh: -7.049821"
                  value={latitude}
                  onChangeText={setLatitude}
                  onBlur={() => markTouched('latitude')}
                  error={touched.latitude ? errors.latitude : undefined}
                  helper="Derajat desimal antara -90 sampai 90."
                  keyboardType={coordKeyboardType}
                  autoCorrect={false}
                  required
                  editable={!submitting}
                />

                <AppTextField
                  label="Longitude"
                  placeholder="Contoh: 110.439123"
                  value={longitude}
                  onChangeText={setLongitude}
                  onBlur={() => markTouched('longitude')}
                  error={touched.longitude ? errors.longitude : undefined}
                  helper="Derajat desimal antara -180 sampai 180."
                  keyboardType={coordKeyboardType}
                  autoCorrect={false}
                  required
                  editable={!submitting}
                />

                <AppTextField
                  label="Cakupan lokasi presensi (meter)"
                  placeholder="Contoh: 50"
                  value={radiusMeter}
                  onChangeText={setRadiusMeter}
                  onBlur={() => markTouched('radius_meter')}
                  error={touched.radius_meter ? errors.radius_meter : undefined}
                  helper={`Angka ${LABORATORY_RADIUS_MIN} sampai ${LABORATORY_RADIUS_MAX} meter.`}
                  keyboardType={coordKeyboardType}
                  autoCorrect={false}
                  required
                  editable={!submitting}
                />

                <AppTextField
                  label="Batas keterlambatan / grace period (menit)"
                  placeholder="Contoh: 15"
                  value={gracePeriodMinutes}
                  onChangeText={setGracePeriodMinutes}
                  onBlur={() => markTouched('grace_period_minutes')}
                  error={
                    touched.grace_period_minutes
                      ? errors.grace_period_minutes
                      : undefined
                  }
                  helper={`Bilangan bulat ${LABORATORY_GRACE_PERIOD_MIN}–${LABORATORY_GRACE_PERIOD_MAX} menit.`}
                  keyboardType="number-pad"
                  autoCorrect={false}
                  required
                  editable={!submitting}
                />

                <AppTextField
                  label="Nominal denda keterlambatan (Rp)"
                  placeholder="Contoh: 5000"
                  value={lateFineAmount}
                  onChangeText={setLateFineAmount}
                  onBlur={() => markTouched('late_fine_amount')}
                  error={
                    touched.late_fine_amount ? errors.late_fine_amount : undefined
                  }
                  helper={fineHelper}
                  keyboardType="number-pad"
                  autoCorrect={false}
                  required
                  editable={!submitting}
                />

                {formError ? (
                  <View
                    style={[styles.errorPanel, { backgroundColor: theme.errorSoft }]}>
                    <Text style={[styles.errorText, { color: theme.error }]}>
                      {formError}
                    </Text>
                  </View>
                ) : null}

                <AppButton
                  label="Simpan laboratorium"
                  disabled={!isSingleValid || submitting}
                  loading={submitting}
                  onPress={handleSingleSubmit}
                />
              </View>
            ) : (
              <BulkCsvPanel
                kind="labs"
                contextReady={courseReady}
                contextLabel={`Mata kuliah terpilih: ${trimmedCourse}`}
                contextBlockedHint="Isi mata kuliah di atas terlebih dahulu sebelum memilih atau menyimpan file CSV."
                parseResult={parseResult}
                onParsed={setParseResult}
                courseName={trimmedCourse}
                existingLabs={labs}
                managedByAslabId={profile?.uid}
              />
            )}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </DetailScreen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  sheet: {
    flex: 1,
    marginTop: -Spacing.four,
    borderTopLeftRadius: Radius.sheet,
    borderTopRightRadius: Radius.sheet,
    overflow: 'hidden',
  },
  handle: {
    alignSelf: 'center',
    width: 44,
    height: 4,
    borderRadius: Radius.full,
    marginTop: Spacing.two,
  },
  content: {
    padding: Spacing.three,
    paddingBottom: Spacing.five,
    gap: Spacing.three,
    maxWidth: 560,
    alignSelf: 'center',
    width: '100%',
  },
  card: {
    borderRadius: Radius.card,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  sectionTitle: { ...Typography.sectionTitle },
  meta: { ...Typography.caption },
  chipSection: { gap: Spacing.one },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  courseChip: {
    minHeight: 44,
    justifyContent: 'center',
    borderRadius: Radius.pill,
    borderWidth: 1,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
  },
  courseChipText: { ...Typography.caption, fontWeight: '600' },
  errorPanel: {
    borderRadius: Radius.lg,
    padding: Spacing.three,
  },
  errorText: { ...Typography.body },
});
