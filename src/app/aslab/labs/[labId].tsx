import { useLocalSearchParams, useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppButton } from '@/components/ui/app-button';
import { ConfirmModal } from '@/components/ui/confirm-modal';
import { DetailScreen } from '@/components/ui/detail-screen';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState, LoadingState } from '@/components/ui/screen-state';
import { useToast } from '@/components/ui/toast-provider';
import { Radius, Shadow, Spacing, Typography } from '@/constants/theme';
import { useLaboratory } from '@/hooks/use-laboratories';
import { useTheme } from '@/hooks/use-theme';
import { deleteLaboratory, formatRupiah } from '@/services/labService';

export default function AslabLabDetailScreen() {
  const router = useRouter();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { showToast } = useToast();
  const { labId } = useLocalSearchParams<{ labId?: string }>();

  const { lab, loading, error, retry } = useLaboratory(labId);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const busyRef = useRef(false);

  const renderNotFound = () => (
    <DetailScreen title="Detail Laboratorium">
      <View style={styles.fallback}>
        <EmptyState
          title="Laboratorium tidak ditemukan"
          description="Data laboratorium tidak tersedia atau sudah dihapus."
          actionLabel="Kembali ke daftar lab"
          onAction={() => router.replace('/aslab/labs')}
        />
      </View>
    </DetailScreen>
  );

  if (!labId) {
    return renderNotFound();
  }

  if (loading) {
    return (
      <DetailScreen title="Detail Laboratorium">
        <View style={styles.fallback}>
          <LoadingState label="Memuat detail laboratorium…" />
        </View>
      </DetailScreen>
    );
  }

  if (error) {
    return (
      <DetailScreen title="Detail Laboratorium">
        <View style={styles.fallback}>
          <ErrorState message={error} onRetry={retry} />
        </View>
      </DetailScreen>
    );
  }

  if (!lab) {
    return renderNotFound();
  }

  const handleConfirmDelete = async () => {
    if (busyRef.current) {
      return;
    }

    busyRef.current = true;
    setDeleting(true);
    try {
      await deleteLaboratory(lab.id);
      setConfirmDelete(false);
      showToast('Laboratorium berhasil dihapus', 'success');
      router.replace('/aslab/labs');
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : 'Gagal menghapus laboratorium.',
        'error'
      );
    } finally {
      busyRef.current = false;
      setDeleting(false);
    }
  };

  return (
    <DetailScreen title="Detail Laboratorium">
      <View
        style={[
          styles.sheet,
          {
            backgroundColor: theme.background,
            paddingBottom: Math.max(insets.bottom, Spacing.two),
          },
        ]}>
        <View style={[styles.handle, { backgroundColor: theme.borderStrong }]} />

        <ScrollView style={styles.flex} contentContainerStyle={styles.content}>
          <View style={[styles.card, Shadow.soft, { backgroundColor: theme.surface }]}>
            <Text style={[styles.title, { color: theme.textPrimary }]}>
              {lab.nama}
            </Text>
            <InfoRow
              label="Mata kuliah"
              value={lab.courseName.trim() || 'Belum diatur'}
            />
            <InfoRow label="Gedung / lokasi" value={lab.gedung.trim() || '—'} />
          </View>

          <View style={[styles.card, Shadow.soft, { backgroundColor: theme.surface }]}>
            <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>
              Lokasi & Cakupan Presensi
            </Text>
            <InfoRow label="Latitude" value={String(lab.latitude)} />
            <InfoRow label="Longitude" value={String(lab.longitude)} />
            <InfoRow label="Radius presensi" value={`${lab.radius_meter} meter`} />
          </View>

          <View style={[styles.card, Shadow.soft, { backgroundColor: theme.surface }]}>
            <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>
              Kebijakan Keterlambatan & Denda
            </Text>
            <InfoRow
              label="Batas keterlambatan"
              value={`${lab.grace_period_minutes} menit`}
            />
            <InfoRow
              label="Nominal denda tetap"
              value={
                lab.late_fine_amount > 0
                  ? formatRupiah(lab.late_fine_amount)
                  : 'Rp 0 (tanpa denda)'
              }
            />
          </View>

          <View style={[styles.card, Shadow.soft, { backgroundColor: theme.surface }]}>
            <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>
              Keanggotaan Laboratorium
            </Text>
            <InfoRow label="Asprak bertugas" value={`${lab.assistantIds.length} orang`} />
            <InfoRow
              label="Praktikan terdaftar"
              value={`${lab.studentIds.length} orang`}
            />
          </View>
        </ScrollView>

        <View style={[styles.footer, { borderTopColor: theme.border }]}>
          <View style={styles.footerContent}>
            <AppButton
              label="Ubah laboratorium"
              onPress={() =>
                router.push({
                  pathname: '/aslab/labs/form',
                  params: { labId: lab.id },
                })
              }
              disabled={deleting}
            />
            <AppButton
              label="Hapus laboratorium"
              variant="destructive"
              onPress={() => setConfirmDelete(true)}
              loading={deleting}
            />
          </View>
        </View>
      </View>

      <ConfirmModal
        visible={confirmDelete}
        destructive
        title="Hapus laboratorium?"
        message={`Hapus "${lab.nama}" secara permanen? Sesi yang tertaut ke laboratorium ini tidak akan memiliki referensi lokasi sampai ditautkan ulang.`}
        confirmLabel={deleting ? 'Menghapus…' : 'Hapus'}
        onCancel={() => {
          if (!deleting) {
            setConfirmDelete(false);
          }
        }}
        onConfirm={handleConfirmDelete}
      />
    </DetailScreen>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  const theme = useTheme();

  return (
    <View style={styles.infoRow}>
      <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>{label}</Text>
      <Text style={[styles.infoValue, { color: theme.textPrimary }]}>{value}</Text>
    </View>
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
  title: { ...Typography.screenTitle },
  sectionTitle: { ...Typography.sectionTitle },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: Spacing.two,
  },
  infoLabel: { ...Typography.body, flexShrink: 0 },
  infoValue: {
    ...Typography.bodyStrong,
    flex: 1,
    textAlign: 'right',
    fontVariant: ['tabular-nums'],
  },
  footer: {
    borderTopWidth: 1,
    padding: Spacing.three,
    alignItems: 'center',
  },
  footerContent: {
    width: '100%',
    maxWidth: 560,
    gap: Spacing.two,
  },
});
