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
import { DetailScreen } from '@/components/ui/detail-screen';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/screen-state';
import { SkeletonCardList } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/toast-provider';
import { Radius, Shadow, Spacing, Typography } from '@/constants/theme';
import { useLaboratories } from '@/hooks/use-laboratories';
import { useTheme } from '@/hooks/use-theme';
import {
  deleteLaboratory,
  getLaboratoryOwnedSessionUsageCount,
} from '@/services/labService';
import { useAuth } from '@/store/auth-context';
import type { Laboratory } from '@/types/attendance';

interface PendingDeleteState {
  lab: Laboratory;
  ownedSessionCount: number;
}

export default function AsistenLabsScreen() {
  const router = useRouter();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { profile } = useAuth();
  const { showToast } = useToast();

  const { labs, loading, refreshing, error, retry, refresh } = useLaboratories();
  const [checkingLabId, setCheckingLabId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<PendingDeleteState | null>(null);
  const [deleting, setDeleting] = useState(false);
  const busyRef = useRef(false);

  const handleRequestDelete = async (lab: Laboratory) => {
    if (busyRef.current || checkingLabId || !profile?.uid) {
      return;
    }

    setCheckingLabId(lab.id);
    try {
      const ownedSessionCount = await getLaboratoryOwnedSessionUsageCount(
        lab.id,
        profile.uid
      );
      setPendingDelete({ lab, ownedSessionCount });
    } catch (err) {
      showToast(
        err instanceof Error
          ? err.message
          : 'Gagal memeriksa pemakaian laboratorium pada sesi.',
        'error'
      );
    } finally {
      setCheckingLabId(null);
    }
  };

  const handleConfirmDelete = async () => {
    if (!pendingDelete || busyRef.current) {
      return;
    }

    busyRef.current = true;
    setDeleting(true);
    try {
      await deleteLaboratory(pendingDelete.lab.id);
      setPendingDelete(null);
      showToast('Lokasi lab berhasil dihapus', 'success');
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : 'Gagal menghapus lokasi lab.',
        'error'
      );
    } finally {
      busyRef.current = false;
      setDeleting(false);
    }
  };

  const deleteMessage = pendingDelete
    ? pendingDelete.ownedSessionCount > 0
      ? `PERINGATAN: "${pendingDelete.lab.nama}" sedang digunakan oleh ${pendingDelete.ownedSessionCount} sesi pada praktikum yang Anda ampu. Menghapus lokasi ini akan memutus tautan lab pada sesi tersebut (sesi milik asisten lain tidak dapat diperiksa dari layar ini). Lanjutkan hapus?`
      : `Hapus "${pendingDelete.lab.nama}" dari daftar lokasi laboratorium? Catatan: sesi milik asisten lain (jika ada) tidak dapat diperiksa dari layar ini.`
    : '';

  const renderCard = ({ item }: { item: Laboratory }) => {
    const isChecking = checkingLabId === item.id;

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

        <View
          style={[styles.coordBox, { backgroundColor: theme.surfaceSubtle }]}>
          <Text style={[styles.coordLabel, { color: theme.textSecondary }]}>
            Koordinat (Lat, Lng)
          </Text>
          <Text style={[styles.coordValue, { color: theme.textPrimary }]}>
            {item.latitude}, {item.longitude}
          </Text>
        </View>

        <View style={styles.cardActions}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Ubah ${item.nama}`}
            disabled={isChecking || deleting}
            onPress={() =>
              router.push({
                pathname: '/asisten/labs/form',
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
            disabled={isChecking || deleting}
            onPress={() => handleRequestDelete(item)}
            style={({ pressed }) => [
              styles.actionPill,
              {
                backgroundColor: theme.surface,
                borderColor: theme.border,
                opacity: isChecking ? 0.6 : pressed ? 0.78 : 1,
              },
            ]}>
            <Text style={[styles.actionLabel, { color: theme.error }]}>
              {isChecking ? 'Memeriksa…' : 'Hapus'}
            </Text>
          </Pressable>
        </View>
      </View>
    );
  };

  return (
    <DetailScreen title="Lokasi Lab">
      <View
        style={[
          styles.sheet,
          {
            backgroundColor: theme.background,
            paddingBottom: Math.max(insets.bottom, Spacing.two),
          },
        ]}>
        <View style={[styles.handle, { backgroundColor: theme.borderStrong }]} />

        {loading ? (
          <SkeletonCardList count={3} />
        ) : error ? (
          <ErrorState message={error} onRetry={retry} />
        ) : (
          <FlatList
            data={labs}
            keyExtractor={(item) => item.id}
            style={styles.flex}
            contentContainerStyle={styles.content}
            refreshControl={
              <RefreshControl
                colors={[theme.primary]}
                onRefresh={refresh}
                refreshing={refreshing}
                tintColor={theme.textSecondary}
              />
            }
            ListHeaderComponent={
              labs.length > 0 ? (
                <View style={styles.headerBlock}>
                  <Text style={[styles.headerHint, { color: theme.textSecondary }]}>
                    Titik koordinat dan radius geofence laboratorium dipakai untuk
                    peta dan validasi presensi praktikan.
                  </Text>
                  <AppButton
                    label="Tambah lokasi lab"
                    onPress={() => router.push('/asisten/labs/form')}
                  />
                </View>
              ) : undefined
            }
            ListEmptyComponent={
              <EmptyState
                title="Belum ada lokasi lab"
                description="Tambahkan titik koordinat dan radius geofence laboratorium untuk validasi presensi."
                actionLabel="Tambah lokasi lab"
                onAction={() => router.push('/asisten/labs/form')}
              />
            }
            renderItem={renderCard}
          />
        )}
      </View>

      <ConfirmModal
        visible={pendingDelete !== null}
        destructive
        title="Hapus lokasi lab?"
        message={deleteMessage}
        confirmLabel={deleting ? 'Menghapus…' : 'Hapus'}
        onCancel={() => {
          if (!deleting) {
            setPendingDelete(null);
          }
        }}
        onConfirm={handleConfirmDelete}
      />
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
  headerBlock: { gap: Spacing.three },
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
  cardSub: { ...Typography.caption },
  radiusBadge: {
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
  },
  radiusText: { ...Typography.caption, fontWeight: '700' },
  coordBox: {
    borderRadius: Radius.md,
    padding: Spacing.two,
    gap: 2,
  },
  coordLabel: { ...Typography.caption },
  coordValue: {
    ...Typography.bodyStrong,
    fontVariant: ['tabular-nums'],
  },
  cardActions: {
    flexDirection: 'row',
    gap: Spacing.two,
    marginTop: Spacing.one,
  },
  actionPill: {
    flex: 1,
    minHeight: 44,
    borderRadius: Radius.pill,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.three,
  },
  actionLabel: { ...Typography.label },
});
