import { Redirect, useLocalSearchParams } from 'expo-router';

import { SessionDetail } from '@/components/attendance/session-detail';
import { useDemoData } from '@/store/demo-data-context';

export default function AsistenSessionScreen() {
  const { sessionId } = useLocalSearchParams<{ sessionId: string }>();
  const { state } = useDemoData();
  const user = state.users.find((candidate) => candidate.id === state.activeUserId);

  if (!user) {
    return <Redirect href="/" />;
  }

  if (state.activeRole !== 'asisten' || user.role !== 'asisten') {
    return <Redirect href={state.activeRole === 'praktikan' ? '/praktikan' : '/'} />;
  }

  return <SessionDetail role="asisten" sessionId={sessionId} />;
}
