import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Radius, Spacing } from '../../constants/theme';
import { useTheme } from '../../hooks/use-theme';

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
        { backgroundColor: selected ? theme.primarySoft : theme.surface, borderColor: selected ? theme.primary : theme.border }
      ]}
      onPress={onSelect}
      activeOpacity={0.7}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
    >
      <Text style={[styles.roleTitle, { color: selected ? theme.primary : theme.textPrimary }]}>{title}</Text>
      <Text style={[styles.roleDesc, { color: theme.textSecondary }]}>{desc}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  roleCard: {
    flex: 1,
    minHeight: 88,
    borderWidth: 1,
    borderRadius: Radius.md,
    padding: Spacing.three,
    justifyContent: 'center',
  },
  roleTitle: { fontSize: 16, fontWeight: '600', marginBottom: 4 },
  roleDesc: { fontSize: 14 },
});