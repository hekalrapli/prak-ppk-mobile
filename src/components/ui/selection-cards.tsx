import React from 'react';
import { StyleSheet, Text, TouchableOpacity } from 'react-native';

import { Radius, Spacing, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { UserRole } from '@/types/attendance';

// --- ROLE CARD ---
interface RoleCardProps {
  role: UserRole;
  selected: boolean;
  onSelect: () => void;
}

const ROLE_COPY: Record<UserRole, { title: string; desc: string }> = {
  praktikan: { title: 'Praktikan', desc: 'Catat kehadiran Anda' },
  asisten: { title: 'Asisten', desc: 'Kelola sesi praktikum' },
  aslab: { title: 'Aslab', desc: 'Kelola laboratorium' },
};

export const RoleCard: React.FC<RoleCardProps> = ({ role, selected, onSelect }) => {
  const theme = useTheme();
  const { title, desc } = ROLE_COPY[role];

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
    minWidth: 136,
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
