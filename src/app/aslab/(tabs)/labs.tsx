// PLACEHOLDER: diganti oleh FR-S4-P1-02
import { StyleSheet, View } from 'react-native';

import { EmptyState } from '@/components/ui/empty-state';
import { TabScreen } from '@/components/ui/tab-screen';
import { Spacing } from '@/constants/theme';

export default function AslabLabsTab() {
  return (
    <TabScreen title="Lab">
      <View style={styles.container}>
        <EmptyState
          title="Manajemen Laboratorium"
          description="Daftar dan pengelolaan laboratorium akan tersedia di sini."
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
