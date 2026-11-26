import { ProfileScreen } from '@/components/profile/profile-screen';
import { TabScreen } from '@/components/ui/tab-screen';

export default function AslabProfileTab() {
  return (
    <TabScreen title="Profil">
      <ProfileScreen role="aslab" />
    </TabScreen>
  );
}
