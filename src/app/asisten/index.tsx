import { Redirect } from 'expo-router';

import { RoleHomeScreen } from '@/components/ui/role-home-screen';
import { useDemoData } from '@/store/demo-data-context';

export default function AsistenHomeScreen() {
  const { state } = useDemoData();
  const user = state.users.find((candidate) => candidate.id === state.activeUserId);

  if (!user) {
    return <Redirect href="/" />;
  }

  if (state.activeRole !== 'asisten' || user.role !== 'asisten') {
    return <Redirect href={state.activeRole === 'praktikan' ? '/praktikan' : '/'} />;
  }

  return <RoleHomeScreen user={user} role="asisten" />;
}
