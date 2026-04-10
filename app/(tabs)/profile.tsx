import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image, ScrollView } from 'react-native';
import { signOut } from 'firebase/auth';
import { auth } from '../../lib/firebase';
import { useAuth } from '../../context/AuthContext';
import { Settings, LogOut, Heart, Bell } from 'lucide-react-native';

export default function ProfileScreen() {
  const { profile } = useAuth();

  const handleLogout = async () => {
    await signOut(auth);
  };

  const OptionRow = ({ icon: Icon, title, isDanger = false }: any) => (
    <TouchableOpacity style={styles.optionRow} onPress={isDanger ? handleLogout : undefined}>
      <View style={[styles.iconBox, isDanger && { backgroundColor: '#fee2e2' }]}>
        <Icon color={isDanger ? '#ef4444' : '#6b7280'} size={24} />
      </View>
      <Text style={[styles.optionText, isDanger && { color: '#ef4444' }]}>{title}</Text>
    </TouchableOpacity>
  );

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.avatarPlaceholder}>
          <Text style={styles.avatarInitials}>{profile?.name?.charAt(0) || 'U'}</Text>
        </View>
        <Text style={styles.name}>{profile?.name || 'Resident'}</Text>
        <Text style={styles.role}>{profile?.role || 'Resident'}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account</Text>
        <View style={styles.card}>
          <OptionRow icon={Bell} title="Notifications" />
          <View style={styles.divider} />
          <OptionRow icon={Heart} title="Saved Services" />
          <View style={styles.divider} />
          <OptionRow icon={Settings} title="Settings" />
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.card}>
          <OptionRow icon={LogOut} title="Logout" isDanger />
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  header: { alignItems: 'center', padding: 40, paddingTop: 80, backgroundColor: '#fff', borderBottomLeftRadius: 30, borderBottomRightRadius: 30 },
  avatarPlaceholder: { width: 100, height: 100, borderRadius: 50, backgroundColor: '#10b981', justifyContent: 'center', alignItems: 'center', marginBottom: 16, shadowColor: '#10b981', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 5 },
  avatarInitials: { fontSize: 40, color: '#fff', fontWeight: 'bold' },
  name: { fontSize: 24, fontWeight: '800', color: '#1f2937' },
  role: { fontSize: 16, color: '#6b7280', marginTop: 4 },
  section: { padding: 24, paddingBottom: 0 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#1f2937', marginBottom: 16 },
  card: { backgroundColor: '#fff', borderRadius: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2, padding: 10 },
  optionRow: { flexDirection: 'row', alignItems: 'center', padding: 15 },
  iconBox: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#f3f4f6', justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  optionText: { fontSize: 16, fontWeight: '600', color: '#374151' },
  divider: { height: 1, backgroundColor: '#f3f4f6', marginLeft: 70 }
});
