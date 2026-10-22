import { Redirect } from 'expo-router';

import { RoleHomeScreen } from '@/components/ui/role-home-screen';
import { useDemoData } from '@/store/demo-data-context';

export default function PraktikanHomeScreen() {
  const { state } = useDemoData();
  const user = state.users.find((candidate) => candidate.id === state.activeUserId);

  if (!user) {
    return <Redirect href="/" />;
  }

  if (state.activeRole !== 'praktikan' || user.role !== 'praktikan') {
    return <Redirect href={state.activeRole === 'asisten' ? '/asisten' : '/'} />;
  }

  return <RoleHomeScreen user={user} role="praktikan" />;
}
