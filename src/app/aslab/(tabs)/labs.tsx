import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import {
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppButton } from '@/components/ui/app-button';
import { ConfirmModal } from '@/components/ui/confirm-modal';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/screen-state';
import { SkeletonCardList } from '@/components/ui/skeleton';
import { TabScreen } from '@/components/ui/tab-screen';
import { useToast } from '@/components/ui/toast-provider';
import { Radius, Shadow, Spacing, Typography } from '@/constants/theme';
import { useLaboratories } from '@/hooks/use-laboratories';
import { useTheme } from '@/hooks/use-theme';
import { deleteLaboratory, formatRupiah } from '@/services/labService';
import type { Laboratory } from '@/types/attendance';

export default function AslabLabsScreen() {
  const router = useRouter();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { showToast } = useToast();

  const { labs, loading, refreshing, error, retry, refresh } = useLaboratories();
  const [pendingDelete, setPendingDelete] = useState<Laboratory | null>(null);
  const [deleting, setDeleting] = useState(false);
  const busyRef = useRef(false);

  const handleConfirmDelete = async () => {
    if (!pendingDelete || busyRef.current) {
      return;
    }

    busyRef.current = true;
    setDeleting(true);
    try {
      await deleteLaboratory(pendingDelete.id);
      setPendingDelete(null);
      showToast('Laboratorium berhasil dihapus', 'success');
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

  const renderCard = ({ item }: { item: Laboratory }) => {
    const courseLabel = item.courseName.trim() || 'Mata kuliah belum diatur';
    const fineLabel =
      item.late_fine_amount > 0 ? formatRupiah(item.late_fine_amount) : 'Tanpa denda';

    return (
      <View
        style={[
          styles.card,
          Shadow.soft,
          { backgroundColor: theme.surface },
        ]}>
        <View style={styles.cardTopRow}>
          <View style={styles.cardTitleWrap}>
            <Text
              numberOfLines={2}
              style={[styles.cardTitle, { color: theme.textPrimary }]}>
              {item.nama}
            </Text>
            <Text
              numberOfLines={2}
              style={[styles.courseText, { color: theme.primary }]}>
              {courseLabel}
            </Text>
            {item.gedung ? (
              <Text
                numberOfLines={2}
                style={[styles.cardSub, { color: theme.textSecondary }]}>
                {item.gedung}
              </Text>
            ) : null}
          </View>
          <View
            style={[styles.radiusBadge, { backgroundColor: theme.primarySoft }]}>
            <Text style={[styles.radiusText, { color: theme.primary }]}>
              Radius {item.radius_meter} m
            </Text>
          </View>
        </View>

        <View style={styles.policyRow}>
          <View style={[styles.policyChip, { backgroundColor: theme.surfaceSubtle }]}>
            <Text style={[styles.policyLabel, { color: theme.textSecondary }]}>
              Toleransi
            </Text>
            <Text style={[styles.policyValue, { color: theme.textPrimary }]}>
              {item.grace_period_minutes} mnt
            </Text>
          </View>
          <View style={[styles.policyChip, { backgroundColor: theme.surfaceSubtle }]}>
            <Text style={[styles.policyLabel, { color: theme.textSecondary }]}>
              Denda telat
            </Text>
            <Text style={[styles.policyValue, { color: theme.textPrimary }]}>
              {fineLabel}
            </Text>
          </View>
        </View>

        <View style={[styles.metaBox, { backgroundColor: theme.surfaceSubtle }]}>
          <Text style={[styles.metaText, { color: theme.textSecondary }]}>
            {item.assistantIds.length} asprak · {item.studentIds.length} praktikan
          </Text>
          <Text
            numberOfLines={1}
            style={[styles.coordValue, { color: theme.textTertiary }]}>
            {item.latitude}, {item.longitude}
          </Text>
        </View>

        <View style={styles.cardActions}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Detail ${item.nama}`}
            disabled={deleting}
            onPress={() =>
              router.push({
                pathname: '/aslab/labs/[labId]',
                params: { labId: item.id },
              })
            }
            style={({ pressed }) => [
              styles.actionPill,
              {
                backgroundColor: theme.surface,
                borderColor: theme.border,
                opacity: pressed ? 0.78 : 1,
              },
            ]}>
            <Text style={[styles.actionLabel, { color: theme.textPrimary }]}>
              Detail
            </Text>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Ubah ${item.nama}`}
            disabled={deleting}
            onPress={() =>
              router.push({
                pathname: '/aslab/labs/form',
                params: { labId: item.id },
              })
            }
            style={({ pressed }) => [
              styles.actionPill,
              {
                backgroundColor: theme.surface,
                borderColor: theme.border,
                opacity: pressed ? 0.78 : 1,
              },
            ]}>
            <Text style={[styles.actionLabel, { color: theme.textPrimary }]}>
              Ubah
            </Text>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Hapus ${item.nama}`}
            disabled={deleting}
            onPress={() => setPendingDelete(item)}
            style={({ pressed }) => [
              styles.actionPill,
              {
                backgroundColor: theme.surface,
                borderColor: theme.border,
                opacity: pressed ? 0.78 : 1,
              },
            ]}>
            <Text style={[styles.actionLabel, { color: theme.error }]}>
              Hapus
            </Text>
          </Pressable>
        </View>
      </View>
    );
  };

  return (
    <TabScreen title="Lab">
      {loading ? (
        <View style={styles.loadingWrap}>
          <SkeletonCardList count={3} />
        </View>
      ) : error ? (
        <ErrorState message={error} onRetry={retry} />
      ) : (
        <FlatList
          data={labs}
          keyExtractor={(item) => item.id}
          style={styles.flex}
          contentContainerStyle={[
            styles.content,
            { paddingBottom: Math.max(insets.bottom, Spacing.two) + Spacing.five },
          ]}
          refreshControl={
            <RefreshControl
              colors={[theme.primary]}
              onRefresh={refresh}
              refreshing={refreshing}
              tintColor={theme.textSecondary}
            />
          }
          ListHeaderComponent={
            <View style={styles.headerBlock}>
              <View style={[styles.bulkCard, Shadow.soft, { backgroundColor: theme.surface }]}>
                <Text style={[styles.bulkTitle, { color: theme.textPrimary }]}>
                  Insert Satuan & Bulk (Terpisah)
                </Text>
                <Text style={[styles.bulkSubtitle, { color: theme.textSecondary }]}>
                  Unduh template CSV atau tambah satuan per jenis data.
                </Text>
                <View style={styles.bulkActions}>
                  <AppButton
                    label="Insert Lab per Mata Kuliah"
                    variant="secondary"
                    onPress={() => router.push('/aslab/bulk/labs')}
                  />
                  <AppButton
                    label="Insert Praktikan ke Lab"
                    variant="secondary"
                    onPress={() => router.push('/aslab/bulk/praktikan')}
                  />
                  <AppButton
                    label="Insert Asprak ke Lab"
                    variant="secondary"
                    onPress={() => router.push('/aslab/bulk/asprak')}
                  />
                </View>
              </View>

              {labs.length > 0 ? (
                <>
                  <Text style={[styles.headerHint, { color: theme.textSecondary }]}>
                    Kelola daftar laboratorium, cakupan lokasi presensi, batasan
                    keterlambatan, dan nominal denda per mata kuliah.
                  </Text>
                  <AppButton
                    label="Tambah laboratorium"
                    onPress={() => router.push('/aslab/labs/form')}
                  />
                </>
              ) : null}
            </View>
          }
          ListEmptyComponent={
            <EmptyState
              title="Belum ada laboratorium"
              description="Tambahkan laboratorium beserta mata kuliah, titik geofence, batas keterlambatan, dan nominal denda."
              actionLabel="Tambah laboratorium"
              onAction={() => router.push('/aslab/labs/form')}
            />
          }
          renderItem={renderCard}
        />
      )}

      <ConfirmModal
        visible={pendingDelete !== null}
        destructive
        title="Hapus laboratorium?"
        message={
          pendingDelete
            ? `Hapus "${pendingDelete.nama}" dari daftar laboratorium? Sesi yang tertaut ke laboratorium ini tidak akan memiliki referensi lokasi sampai ditautkan ulang.`
            : ''
        }
        confirmLabel={deleting ? 'Menghapus…' : 'Hapus'}
        onCancel={() => {
          if (!deleting) {
            setPendingDelete(null);
          }
        }}
        onConfirm={handleConfirmDelete}
      />
    </TabScreen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  loadingWrap: {
    flex: 1,
    padding: Spacing.three,
  },
  content: {
    padding: Spacing.three,
    gap: Spacing.three,
    maxWidth: 560,
    alignSelf: 'center',
    width: '100%',
  },
  headerBlock: { gap: Spacing.three },
  bulkCard: {
    borderRadius: Radius.card,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  bulkTitle: { ...Typography.cardTitle },
  bulkSubtitle: { ...Typography.caption },
  bulkActions: { gap: Spacing.two, marginTop: Spacing.one },
  headerHint: { ...Typography.body },
  card: {
    borderRadius: Radius.card,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  cardTitleWrap: { flex: 1, minWidth: 0, gap: Spacing.half },
  cardTitle: { ...Typography.cardTitle },
  courseText: { ...Typography.caption, fontWeight: '600' },
  cardSub: { ...Typography.caption },
  radiusBadge: {
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
  },
  radiusText: { ...Typography.caption, fontWeight: '700' },
  policyRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  policyChip: {
    flex: 1,
    minWidth: 130,
    borderRadius: Radius.md,
    padding: Spacing.two,
    gap: 2,
  },
  policyLabel: { ...Typography.caption },
  policyValue: {
    ...Typography.bodyStrong,
    fontVariant: ['tabular-nums'],
  },
  metaBox: {
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
    gap: 2,
  },
  metaText: { ...Typography.caption },
  coordValue: {
    ...Typography.caption,
    fontVariant: ['tabular-nums'],
  },
  cardActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
    marginTop: Spacing.one,
  },
  actionPill: {
    flex: 1,
    minWidth: 84,
    minHeight: 44,
    borderRadius: Radius.pill,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.two,
  },
  actionLabel: { ...Typography.label },
});
