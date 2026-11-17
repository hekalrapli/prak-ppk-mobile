import React from 'react';
import { StyleSheet, Text, TouchableOpacity } from 'react-native';

import { Radius, Spacing, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

// --- ROLE CARD ---
interface RoleCardProps {
  role: 'praktikan' | 'asisten';
  selected: boolean;
  onSelect: () => void;
}

export const RoleCard: React.FC<RoleCardProps> = ({ role, selected, onSelect }) => {
  const theme = useTheme();
  const title = role === 'praktikan' ? 'Praktikan' : 'Asisten';
  const desc = role === 'praktikan' ? 'Catat kehadiran Anda' : 'Kelola sesi praktikum';

  return (
    <TouchableOpacity
      style={[
        styles.roleCard,
        {
          backgroundColor: selected ? theme.primarySoft : theme.surface,
          borderColor: selected ? theme.primary : theme.border,
        },
      ]}
      onPress={onSelect}
      activeOpacity={0.75}
      accessibilityRole="radio"
      accessibilityState={{ selected }}>
      <Text
        style={[
          styles.roleTitle,
          { color: theme.textPrimary },
        ]}>
        {title}
      </Text>
      <Text style={[styles.roleDesc, { color: theme.textSecondary }]}>{desc}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  roleCard: {
    flex: 1,
    minHeight: 96,
    borderWidth: 1,
    borderRadius: Radius.card,
    padding: Spacing.three,
    justifyContent: 'center',
    gap: Spacing.one,
  },
  roleTitle: { ...Typography.cardTitle },
  roleDesc: { ...Typography.caption },
});
