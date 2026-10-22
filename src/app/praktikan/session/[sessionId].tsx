import { Redirect, useLocalSearchParams } from 'expo-router';

import { SessionDetail } from '@/components/attendance/session-detail';
import { useDemoData } from '@/store/demo-data-context';

export default function PraktikanSessionScreen() {
  const { sessionId } = useLocalSearchParams<{ sessionId: string }>();
  const { state } = useDemoData();
  const user = state.users.find((candidate) => candidate.id === state.activeUserId);

  if (!user) {
    return <Redirect href="/" />;
  }

  if (state.activeRole !== 'praktikan' || user.role !== 'praktikan') {
    return <Redirect href={state.activeRole === 'asisten' ? '/asisten' : '/'} />;
  }

  return <SessionDetail role="praktikan" sessionId={sessionId} />;
}
