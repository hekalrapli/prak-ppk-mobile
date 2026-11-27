import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
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

import { AppButton } from '@/components/ui/app-button';
import { AppTextField } from '@/components/ui/app-text-field';
import { DetailScreen } from '@/components/ui/detail-screen';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState, LoadingState } from '@/components/ui/screen-state';
import { useToast } from '@/components/ui/toast-provider';
import { Radius, Spacing, Typography } from '@/constants/theme';
import { useLaboratories } from '@/hooks/use-laboratories';
import { usePracticumFeed } from '@/hooks/use-practicum-feed';
import { useSessionDetail } from '@/hooks/use-session-detail';
import { useTheme } from '@/hooks/use-theme';
import {
  createSession,
  updateSession,
  validateSessionInput,
  type SessionInput,
} from '@/services/scheduleService';
import { useAuth } from '@/store/auth-context';

type FieldKey = keyof SessionInput;

export default function SessionFormScreen() {
  const router = useRouter();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { profile } = useAuth();
  const { showToast } = useToast();
  const { practicumId: initialPracticumId, sessionId } = useLocalSearchParams<{
    practicumId?: string;
    sessionId?: string;
  }>();

  const isEditing = Boolean(sessionId);
  const feed = usePracticumFeed('asisten', profile?.uid);
  const labsFeed = useLaboratories();
  const [selectedPracticumId, setSelectedPracticumId] = useState(
    initialPracticumId ?? ''
  );

  const activePracticumId = isEditing
    ? initialPracticumId
    : selectedPracticumId || initialPracticumId || feed.practicums[0]?.id;

  const detail = useSessionDetail(
    isEditing ? activePracticumId : undefined,
    isEditing ? sessionId : undefined
  );

  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [room, setRoom] = useState('');
  const [labId, setLabId] = useState('');
  const [touched, setTouched] = useState<Partial<Record<FieldKey, boolean>>>({});
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const initializedRef = useRef(false);
  const savingRef = useRef(false);

  useEffect(() => {
    if (isEditing && detail.session && !initializedRef.current) {
      setDate(detail.session.date);
      setStartTime(detail.session.startTime);
      setEndTime(detail.session.endTime);
      setRoom(detail.session.room);
      setLabId(detail.session.lab_id ?? '');
      initializedRef.current = true;
    }
  }, [isEditing, detail.session]);

  const screenTitle = isEditing ? 'Ubah Sesi' : 'Tambah Sesi';

  if ((isEditing && detail.loading) || (!isEditing && feed.loading)) {
    return (
      <DetailScreen title={screenTitle}>
        <View style={styles.fallback}>
          <LoadingState label="Memuat data sesi…" />
        </View>
      </DetailScreen>
    );
  }

  const loadError = isEditing ? detail.error : feed.error;
  if (loadError) {
    return (
      <DetailScreen title={screenTitle}>
        <View style={styles.fallback}>
          <ErrorState
            message={loadError}
            onRetry={isEditing ? detail.retry : feed.retry}
          />
        </View>
      </DetailScreen>
    );
  }

  if (isEditing && (!detail.practicum || !detail.session)) {
    return (
      <DetailScreen title={screenTitle}>
        <View style={styles.fallback}>
          <EmptyState
            title="Sesi tidak ditemukan"
            description="Sesi yang ingin Anda ubah tidak tersedia."
            actionLabel="Kembali ke jadwal"
            onAction={() => router.replace('/asisten')}
          />
        </View>
      </DetailScreen>
    );
  }

  if (isEditing && detail.practicum && detail.practicum.assistantId !== profile?.uid) {
    return <Redirect href="/asisten" />;
  }

  if (isEditing && detail.session?.status === 'closed') {
    return (
      <DetailScreen title={screenTitle}>
        <View style={styles.fallback}>
          <EmptyState
            title="Sesi telah ditutup"
            description="Sesi yang sudah berstatus Ditutup tidak dapat diubah."
            actionLabel="Kembali"
            onAction={() => router.back()}
          />
        </View>
      </DetailScreen>
    );
  }

  if (!isEditing && feed.practicums.length === 0) {
    return (
      <DetailScreen title={screenTitle}>
        <View style={styles.fallback}>
          <EmptyState
            title="Belum ada praktikum"
            description="Tambahkan praktikum terlebih dahulu sebelum membuat jadwal sesi."
            actionLabel="Tambah praktikum"
            onAction={() => router.replace('/asisten/practicum/form')}
          />
        </View>
      </DetailScreen>
    );
  }

  const selectedPracticum = isEditing
    ? detail.practicum
    : feed.practicums.find((item) => item.id === activePracticumId);

  if (selectedPracticum && selectedPracticum.assistantId !== profile?.uid) {
    return <Redirect href="/asisten" />;
  }

  const errors = validateSessionInput({
    date,
    startTime,
    endTime,
    room,
    lab_id: labId || undefined,
  });
  const isValid = Boolean(activePracticumId) && Object.keys(errors).length === 0;

  const markTouched = (field: FieldKey) => {
    setTouched((curr) => ({ ...curr, [field]: true }));
  };

  const handleSubmit = async () => {
    if (savingRef.current || !activePracticumId) {
      return;
    }

    if (!isValid) {
      setTouched({ date: true, startTime: true, endTime: true, room: true });
      return;
    }

    savingRef.current = true;
    setSubmitting(true);
    setFormError(null);

    try {
      if (isEditing && sessionId) {
        await updateSession(activePracticumId, sessionId, {
          date,
          startTime,
          endTime,
          room,
          lab_id: labId || undefined,
        });
        showToast('Jadwal sesi berhasil diperbarui', 'success');
        router.back();
      } else {
        const createdId = await createSession(activePracticumId, {
          date,
          startTime,
          endTime,
          room,
          lab_id: labId || undefined,
        });
        showToast('Sesi baru berhasil ditambahkan', 'success');
        router.replace({
          pathname: '/asisten/session/[sessionId]',
          params: { sessionId: createdId, practicumId: activePracticumId },
        });
      }
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : 'Gagal menyimpan jadwal sesi.'
      );
    } finally {
      savingRef.current = false;
      setSubmitting(false);
    }
  };

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
            {!isEditing && !initialPracticumId ? (
              <View style={styles.practicumPicker}>
                <Text style={[styles.pickerLabel, { color: theme.textPrimary }]}>
                  Pilih praktikum *
                </Text>
                <View style={styles.pickerList}>
                  {feed.practicums.map((item) => {
                    const selected = item.id === activePracticumId;
                    return (
                      <Pressable
                        key={item.id}
                        accessibilityRole="radio"
                        accessibilityState={{ selected }}
                        onPress={() => setSelectedPracticumId(item.id)}
                        style={[
                          styles.pickerItem,
                          {
                            backgroundColor: selected
                              ? theme.primarySoft
                              : theme.surface,
                            borderColor: selected ? theme.primary : theme.border,
                          },
                        ]}>
                        <Text
                          style={[
                            styles.pickerTitle,
                            { color: theme.textPrimary },
                          ]}>
                          {item.name}
                        </Text>
                        <Text
                          style={[
                            styles.pickerSub,
                            { color: theme.textSecondary },
                          ]}>
                          Kelas {item.className}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            ) : selectedPracticum ? (
              <View style={styles.headerBlock}>
                <Text style={[styles.heading, { color: theme.textPrimary }]}>
                  {selectedPracticum.name}
                </Text>
                <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
                  Kelas {selectedPracticum.className}
                </Text>
              </View>
            ) : null}

            <View style={styles.fields}>
              <AppTextField
                label="Tanggal sesi"
                placeholder="Contoh: Senin, 26 Okt 2026"
                value={date}
                onChangeText={setDate}
                onBlur={() => markTouched('date')}
                error={touched.date ? errors.date : undefined}
                helper="8–30 karakter (mis. Senin, 26 Okt 2026)."
                maxLength={30}
                required
                editable={!submitting}
              />

              <View style={styles.timeRow}>
                <View style={styles.flex}>
                  <AppTextField
                    label="Jam mulai"
                    placeholder="08:00"
                    value={startTime}
                    onChangeText={setStartTime}
                    onBlur={() => markTouched('startTime')}
                    error={touched.startTime ? errors.startTime : undefined}
                    helper="Format HH:mm"
                    maxLength={5}
                    required
                    editable={!submitting}
                  />
                </View>
                <View style={styles.flex}>
                  <AppTextField
                    label="Jam selesai"
                    placeholder="09:40"
                    value={endTime}
                    onChangeText={setEndTime}
                    onBlur={() => markTouched('endTime')}
                    error={touched.endTime ? errors.endTime : undefined}
                    helper="Harus > jam mulai"
                    maxLength={5}
                    required
                    editable={!submitting}
                  />
                </View>
              </View>

              <AppTextField
                label="Ruang"
                placeholder="Contoh: Lab Mobile 2"
                value={room}
                onChangeText={setRoom}
                onBlur={() => markTouched('room')}
                error={touched.room ? errors.room : undefined}
                helper="Maksimal 60 karakter."
                maxLength={60}
                required
                editable={!submitting}
              />

              <View style={styles.practicumPicker}>
                <View style={styles.labPickerHeader}>
                  <Text style={[styles.pickerLabel, { color: theme.textPrimary }]}>
                    Lokasi lab geofence (opsional)
                  </Text>
                </View>

                {labsFeed.loading ? (
                  <Text style={[styles.pickerSub, { color: theme.textSecondary }]}>
                    Memuat daftar lokasi lab…
                  </Text>
                ) : labsFeed.error ? (
                  <View style={styles.labErrorRow}>
                    <Text style={[styles.pickerSub, { color: theme.error }]}>
                      {labsFeed.error}
                    </Text>
                    <Pressable
                      accessibilityRole="button"
                      hitSlop={8}
                      onPress={labsFeed.retry}>
                      <Text style={[styles.labManageLink, { color: theme.link }]}>
                        Coba lagi
                      </Text>
                    </Pressable>
                  </View>
                ) : (
                  <View style={styles.pickerList}>
                    {labId && !labsFeed.labs.some((item) => item.id === labId) ? (
                      <View
                        style={[
                          styles.danglingNote,
                          { backgroundColor: theme.warningSoft },
                        ]}>
                        <Text
                          style={[styles.pickerSub, { color: theme.warning }]}>
                          Lab sebelumnya tidak ditemukan (mungkin sudah dihapus).
                          Pilih lab lain atau lepaskan tautan di bawah.
                        </Text>
                      </View>
                    ) : null}

                    <Pressable
                      accessibilityRole="radio"
                      accessibilityState={{ selected: labId === '' }}
                      disabled={submitting}
                      onPress={() => setLabId('')}
                      style={[
                        styles.pickerItem,
                        {
                          backgroundColor:
                            labId === '' ? theme.primarySoft : theme.surface,
                          borderColor:
                            labId === '' ? theme.primary : theme.border,
                        },
                      ]}>
                      <Text
                        style={[
                          styles.pickerTitle,
                          { color: theme.textPrimary },
                        ]}>
                        Tanpa lokasi lab
                      </Text>
                      <Text
                        style={[
                          styles.pickerSub,
                          { color: theme.textSecondary },
                        ]}>
                        Sesi tidak ditautkan ke titik geofence lab
                      </Text>
                    </Pressable>

                    {labsFeed.labs.map((lab) => {
                      const selected = lab.id === labId;
                      return (
                        <Pressable
                          key={lab.id}
                          accessibilityRole="radio"
                          accessibilityState={{ selected }}
                          disabled={submitting}
                          onPress={() => {
                            setLabId(lab.id);
                            if (!room.trim()) {
                              setRoom(lab.nama.slice(0, 60));
                            }
                          }}
                          style={[
                            styles.pickerItem,
                            {
                              backgroundColor: selected
                                ? theme.primarySoft
                                : theme.surface,
                              borderColor: selected
                                ? theme.primary
                                : theme.border,
                            },
                          ]}>
                          <Text
                            style={[
                              styles.pickerTitle,
                              { color: theme.textPrimary },
                            ]}>
                            {lab.nama}
                          </Text>
                          <Text
                            style={[
                              styles.pickerSub,
                              { color: theme.textSecondary },
                            ]}>
                            {lab.gedung ? `${lab.gedung} · ` : ''}Radius{' '}
                            {lab.radius_meter} m
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                )}
              </View>
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
                label={isEditing ? 'Simpan perubahan' : 'Tambah sesi'}
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
  practicumPicker: { gap: Spacing.two },
  pickerLabel: { ...Typography.label },
  pickerList: { gap: Spacing.two },
  pickerItem: {
    padding: Spacing.three,
    borderRadius: Radius.lg,
    borderWidth: 1,
    gap: 2,
  },
  pickerTitle: { ...Typography.bodyStrong },
  pickerSub: { ...Typography.caption },
  labPickerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  labManageLink: { ...Typography.label },
  labErrorRow: { gap: Spacing.one },
  danglingNote: {
    borderRadius: Radius.md,
    padding: Spacing.two,
  },
  fields: { gap: Spacing.three },
  timeRow: { flexDirection: 'row', gap: Spacing.two },
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
