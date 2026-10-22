import React from 'react';
import { TouchableOpacity, Text, StyleSheet, View } from 'react-native';
import { Radius, Spacing } from '../../constants/theme';
import { useTheme } from '../../hooks/use-theme';
import { DemoUser } from '../../types/attendance';

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

// --- IDENTITY ROW ---
interface IdentityRowProps {
  user: DemoUser;
  selected: boolean;
  onSelect: () => void;
}

export const IdentityRow: React.FC<IdentityRowProps> = ({ user, selected, onSelect }) => {
  const theme = useTheme();

  return (
    <TouchableOpacity
      style={[
        styles.identityRow,
        { backgroundColor: selected ? theme.primarySoft : 'transparent', borderColor: selected ? theme.primary : theme.border }
      ]}
      onPress={onSelect}
      activeOpacity={0.7}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
    >
      <View style={[styles.radio, { borderColor: selected ? theme.primary : theme.border }]}>
        {selected && <View style={[styles.radioInner, { backgroundColor: theme.primary }]} />}
      </View>
      <View style={styles.identityInfo}>
        <Text style={[styles.identityName, { color: theme.textPrimary }]}>{user.name}</Text>
        <Text style={[styles.identityId, { color: theme.textSecondary }]}>
          {user.identifier} {user.className ? `· ${user.className}` : ''}
        </Text>
      </View>
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
  identityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 52,
    borderWidth: 1,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    marginBottom: Spacing.two,
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: Radius.full,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.three,
  },
  radioInner: { width: 10, height: 10, borderRadius: Radius.full },
  identityInfo: { flex: 1 },
  identityName: { fontSize: 16, fontWeight: '600' },
  identityId: { fontSize: 12 },
});