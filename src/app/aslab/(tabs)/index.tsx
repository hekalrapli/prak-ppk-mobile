// PLACEHOLDER: diganti oleh FR-S4-P2-02
import { StyleSheet, View } from 'react-native';

import { EmptyState } from '@/components/ui/empty-state';
import { TabScreen } from '@/components/ui/tab-screen';
import { Spacing } from '@/constants/theme';

export default function AslabDashboardTab() {
  return (
    <TabScreen title="Dashboard">
      <View style={styles.container}>
        <EmptyState
          title="Dashboard Aslab"
          description="Ringkasan keberlangsungan laboratorium akan tampil di sini."
        />
      </View>
    </TabScreen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: Spacing.three,
  },
});
