import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, SafeAreaView, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { Colors, Spacing } from '../constants/theme';
import { UserRole } from '../types/attendance';
import { useDemoData } from '../store/demo-data-context';
import { AppButton } from '../components/ui/app-button';
import { RoleCard, IdentityRow } from '../components/ui/selection-cards';

export default function RoleSelectionScreen() {
  const router = useRouter();
  const { state, dispatch } = useDemoData();
  const theme = Colors.light;

  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  const availableUsers = state.users.filter(u => u.role === selectedRole);

  const handleRoleSelect = (role: UserRole) => {
    setSelectedRole(role);
    setSelectedUserId(null); // Reset identitas jika peran diubah
  };

  const handleEntry = () => {
    if (selectedRole && selectedUserId) {
      dispatch({ type: 'SELECT_IDENTITY', payload: { role: selectedRole, userId: selectedUserId } });
      // Navigasi sesuai peran
      if (selectedRole === 'praktikan') {
        router.replace('/praktikan');
      } else {
        router.replace('/asisten');
      }
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.flex1}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          
          <View style={styles.header}>
            <Text style={[styles.title, { color: theme.textPrimary }]}>PrakPresensi</Text>
            <Text style={[styles.subtitle, { color: theme.textSecondary }]}>Presensi praktikum dalam satu aplikasi.</Text>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Pilih peran</Text>
            <View style={styles.roleContainer}>
              <RoleCard role="praktikan" selected={selectedRole === 'praktikan'} onSelect={() => handleRoleSelect('praktikan')} />
              <View style={{ width: Spacing.three }} />
              <RoleCard role="asisten" selected={selectedRole === 'asisten'} onSelect={() => handleRoleSelect('asisten')} />
            </View>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Pilih identitas</Text>
            {!selectedRole ? (
              <Text style={{ color: theme.textTertiary, fontSize: 14 }}>Silakan pilih peran terlebih dahulu.</Text>
            ) : (
              availableUsers.map(user => (
                <IdentityRow
                  key={user.id}
                  user={user}
                  selected={selectedUserId === user.id}
                  onSelect={() => setSelectedUserId(user.id)}
                />
              ))
            )}
            <Text style={[styles.helperText, { color: theme.textTertiary }]}>Data ini hanya untuk demonstrasi.</Text>
          </View>

        </ScrollView>

        <View style={[styles.footer, { borderTopColor: theme.border, backgroundColor: theme.background }]}>
          <AppButton 
            label="Masuk" 
            onPress={handleEntry} 
            disabled={!selectedRole || !selectedUserId} 
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  flex1: { flex: 1 },
  scrollContent: { padding: Spacing.three, maxWidth: 560, alignSelf: 'center', width: '100%', paddingBottom: Spacing.five },
  header: { marginBottom: Spacing.five, marginTop: Spacing.four },
  title: { fontSize: 30, fontWeight: '700', marginBottom: Spacing.two },
  subtitle: { fontSize: 16 },
  section: { marginBottom: Spacing.four },
  sectionTitle: { fontSize: 18, fontWeight: '600', marginBottom: Spacing.three },
  roleContainer: { flexDirection: 'row', justifyContent: 'space-between' },
  helperText: { fontSize: 12, marginTop: Spacing.two },
  footer: { padding: Spacing.three, borderTopWidth: 1, paddingBottom: Spacing.five },
});