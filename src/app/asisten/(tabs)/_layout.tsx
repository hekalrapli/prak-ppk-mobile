import { Tabs } from 'expo-router';

import { AppTabBar } from '@/components/ui/app-tab-bar';
import { useTheme } from '@/hooks/use-theme';

export default function AsistenTabsLayout() {
  const theme = useTheme();

  return (
    <Tabs
      tabBar={(props) => <AppTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: theme.background },
        tabBarHideOnKeyboard: true,
      }}>
      <Tabs.Screen name="index" options={{ title: 'Jadwal' }} />
      <Tabs.Screen name="maps" options={{ title: 'Peta' }} />
      <Tabs.Screen name="history" options={{ title: 'Riwayat' }} />
      <Tabs.Screen name="profile" options={{ title: 'Profil' }} />
    </Tabs>
  );
}
