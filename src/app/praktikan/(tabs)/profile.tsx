import { TabScreen } from '@/components/ui/tab-screen';
import { ProfileScreen } from '@/components/profile/profile-screen';

export default function PraktikanProfileTab() {
  return (
    <TabScreen title="Profil">
      <ProfileScreen role="praktikan" />
    </TabScreen>
  );
}
