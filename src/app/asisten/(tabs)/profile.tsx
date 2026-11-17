import { TabScreen } from '@/components/ui/tab-screen';
import { ProfileScreen } from '@/components/profile/profile-screen';

export default function AsistenProfileTab() {
  return (
    <TabScreen title="Profil">
      <ProfileScreen role="asisten" />
    </TabScreen>
  );
}
