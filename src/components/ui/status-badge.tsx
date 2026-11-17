import React from 'react';
import { StyleSheet, View } from 'react-native';

import { SessionStatus } from '../../types/attendance';
import { StatusDot, StatusTone } from './status-dot';

interface StatusBadgeProps {
  status: SessionStatus;
}

const META: Record<SessionStatus, { label: string; tone: StatusTone }> = {
  upcoming: { label: 'Belum dibuka', tone: 'muted' },
  open: { label: 'Dibuka', tone: 'success' },
  closed: { label: 'Ditutup', tone: 'neutral' },
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const meta = META[status];

  return (
    <View accessibilityLabel={`Status sesi: ${meta.label}`} style={styles.container}>
      <StatusDot label={meta.label} tone={meta.tone} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flexShrink: 0, paddingVertical: 2 },
});
