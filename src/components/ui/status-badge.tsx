import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SessionStatus } from '../../types/attendance';
import { Radius, Spacing } from '../../constants/theme';
import { useTheme } from '../../hooks/use-theme';

interface StatusBadgeProps {
  status: SessionStatus;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const theme = useTheme();

  let label = '';
  let dotColor = '';
  let bgColor = '';
  let borderColor = '';
  let textColor = '';

  switch (status) {
    case 'upcoming':
      label = 'Belum dibuka';
      dotColor = theme.textSecondary;
      bgColor = theme.surfaceSubtle;
      borderColor = theme.border;
      textColor = theme.textSecondary;
      break;
    case 'open':
      label = 'Dibuka';
      dotColor = theme.success;
      bgColor = theme.successSoft;
      borderColor = 'transparent';
      textColor = theme.success;
      break;
    case 'closed':
      label = 'Ditutup';
      dotColor = theme.textSecondary;
      bgColor = theme.surface;
      borderColor = theme.borderStrong;
      textColor = theme.textSecondary;
      break;
  }

  return (
    <View
      accessibilityLabel={`Status sesi: ${label}`}
      style={[
        styles.container,
        { backgroundColor: bgColor, borderColor, borderWidth: borderColor !== 'transparent' ? 1 : 0 },
      ]}>
      <View style={[styles.dot, { backgroundColor: dotColor }]} />
      <Text style={[styles.label, { color: textColor }]}>{label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 0,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: Radius.xs,
  },
  dot: { width: 6, height: 6, borderRadius: Radius.full, marginRight: Spacing.two },
  label: { fontSize: 12, fontWeight: '600' },
});
