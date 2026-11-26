import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppButton } from '@/components/ui/app-button';
import { AppTextField } from '@/components/ui/app-text-field';
import { DetailScreen } from '@/components/ui/detail-screen';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState, LoadingState } from '@/components/ui/screen-state';
import { useToast } from '@/components/ui/toast-provider';
import { Radius, Spacing, Typography } from '@/constants/theme';
import { useLaboratory } from '@/hooks/use-laboratories';
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
  updateLaboratory,
  validateLaboratoryInput,
  type LaboratoryFieldKey,
} from '@/services/labService';
import {
  getCurrentCoordinates,
  LocationServiceError,
  requestLocationPermission,
} from '@/services/locationService';
import { useAuth } from '@/store/auth-context';

export default function AslabLabFormScreen() {
  const router = useRouter();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { profile } = useAuth();
  const { showToast } = useToast();
  const { labId } = useLocalSearchParams<{ labId?: string }>();

  const isEditing = Boolean(labId);
  const { lab, loading, error, retry } = useLaboratory(labId);

  const [courseName, setCourseName] = useState('');
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
  const initializedRef = useRef(false);
  const savingRef = useRef(false);

  useEffect(() => {
    if (isEditing && lab && !initializedRef.current) {
      setCourseName(lab.courseName);
      setNama(lab.nama);
      setGedung(lab.gedung);
      setLatitude(String(lab.latitude));
      setLongitude(String(lab.longitude));
      setRadiusMeter(String(lab.radius_meter));
      setGracePeriodMinutes(String(lab.grace_period_minutes));
      setLateFineAmount(String(lab.late_fine_amount));
      initializedRef.current = true;
    }
  }, [isEditing, lab]);

  const screenTitle = isEditing ? 'Ubah Laboratorium' : 'Tambah Laboratorium';

  if (isEditing && loading) {
    return (
      <DetailScreen title={screenTitle}>
        <View style={styles.fallback}>
          <LoadingState label="Memuat data laboratorium…" />
        </View>
      </DetailScreen>
    );
  }

  if (isEditing && error) {
    return (
      <DetailScreen title={screenTitle}>
        <View style={styles.fallback}>
          <ErrorState message={error} onRetry={retry} />
        </View>
      </DetailScreen>
    );
  }

  if (isEditing && !lab) {
    return (
      <DetailScreen title={screenTitle}>
        <View style={styles.fallback}>
          <EmptyState
            title="Laboratorium tidak ditemukan"
            description="Data laboratorium yang ingin Anda ubah tidak tersedia atau sudah dihapus."
            actionLabel="Kembali ke daftar lab"
            onAction={() => router.replace('/aslab/labs')}
          />
        </View>
      </DetailScreen>
    );
  }

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
  const isValid = Object.keys(errors).length === 0;

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

  const handleSubmit = async () => {
    if (savingRef.current) {
      return;
    }

    if (!isValid) {
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
      const payload = {
        courseName,
        nama,
        gedung,
        latitude,
        longitude,
        radius_meter: radiusMeter,
        grace_period_minutes: gracePeriodMinutes,
        late_fine_amount: lateFineAmount,
      };
      if (isEditing && labId) {
        await updateLaboratory(labId, payload, {
          existing: lab ?? undefined,
          managedByAslabId: profile?.uid,
        });
        showToast('Laboratorium berhasil diperbarui', 'success');
      } else {
        await createLaboratory(payload, { managedByAslabId: profile?.uid });
        showToast('Laboratorium berhasil ditambahkan', 'success');
      }
      router.back();
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
    <DetailScreen title={screenTitle}>
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
            <View style={styles.headerBlock}>
              <Text style={[styles.heading, { color: theme.textPrimary }]}>
                {isEditing
                  ? 'Perbarui Informasi & Kebijakan Lab'
                  : 'Data & Kebijakan Laboratorium'}
              </Text>
              <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
                Atur identitas mata kuliah, titik geofence, cakupan presensi, batas
                keterlambatan, dan nominal denda.
              </Text>
            </View>

            <View style={styles.fields}>
              <AppTextField
                label="Mata kuliah"
                placeholder="Contoh: Pemrograman Perangkat Keras"
                value={courseName}
                onChangeText={setCourseName}
                onBlur={() => markTouched('courseName')}
                error={touched.courseName ? errors.courseName : undefined}
                helper="Wajib diisi, maksimal 100 karakter."
                maxLength={100}
                required
                editable={!submitting}
              />

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
                helper={`Bilangan bulat ${LABORATORY_GRACE_PERIOD_MIN}–${LABORATORY_GRACE_PERIOD_MAX} menit (default 15).`}
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
            </View>

            {formError ? (
              <View
                style={[styles.errorPanel, { backgroundColor: theme.errorSoft }]}>
                <Text style={[styles.errorText, { color: theme.error }]}>
                  {formError}
                </Text>
              </View>
            ) : null}
          </ScrollView>

          <View style={[styles.footer, { borderTopColor: theme.border }]}>
            <View style={styles.footerContent}>
              <AppButton
                label={isEditing ? 'Simpan perubahan' : 'Simpan laboratorium'}
                onPress={handleSubmit}
                disabled={!isValid || submitting}
                loading={submitting}
              />
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </DetailScreen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  fallback: { flex: 1, justifyContent: 'center', padding: Spacing.three },
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
    paddingBottom: Spacing.four,
    gap: Spacing.four,
    maxWidth: 560,
    alignSelf: 'center',
    width: '100%',
  },
  headerBlock: { gap: Spacing.half },
  heading: { ...Typography.sectionTitle },
  subtitle: { ...Typography.caption },
  fields: { gap: Spacing.three },
  errorPanel: {
    borderRadius: Radius.lg,
    padding: Spacing.three,
  },
  errorText: { ...Typography.body },
  footer: {
    borderTopWidth: 1,
    padding: Spacing.three,
    alignItems: 'center',
  },
  footerContent: { width: '100%', maxWidth: 560 },
});
