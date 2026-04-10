import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Clock, LogOut } from 'lucide-react-native';
import { auth } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';

export default function PendingApprovalScreen() {
  const { profile } = useAuth();

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#f0fdfa', '#ccfbf1']} style={StyleSheet.absoluteFillObject} />

      <View style={styles.card}>
        <View style={styles.iconContainer}>
          <Clock color="#f59e0b" size={56} />
        </View>

        <Text style={styles.title}>Waiting for Approval</Text>
        <Text style={styles.desc}>
          Your request to join{' '}
          <Text style={styles.bold}>{profile?.societyName || 'the society'}</Text>
          {' '}has been submitted successfully.
        </Text>

        <Text style={styles.desc}>
          Your society admin is reviewing your request. You will get full access as soon as they approve it.
        </Text>

        <View style={styles.infoCard}>
          <Text style={styles.infoLabel}>Your Details</Text>
          <Text style={styles.infoRow}>🏠 Flat No: <Text style={styles.infoVal}>{profile?.flatNo || '—'}</Text></Text>
          <Text style={styles.infoRow}>🏘️ Society Code: <Text style={styles.infoVal}>{profile?.societyCode || '—'}</Text></Text>
          <Text style={styles.infoRow}>👤 Name: <Text style={styles.infoVal}>{profile?.name || '—'}</Text></Text>
        </View>

        <Text style={styles.hint}>💡 Contact your admin to speed up approval.</Text>

        <TouchableOpacity style={styles.logoutBtn} onPress={() => auth.signOut()}>
          <LogOut color="#ef4444" size={18} />
          <Text style={styles.logoutText}> Sign Out</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  card: { backgroundColor: 'rgba(255,255,255,0.96)', borderRadius: 28, padding: 32, alignItems: 'center', width: '100%', shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.08, shadowRadius: 20, elevation: 10 },
  iconContainer: { backgroundColor: '#fffbeb', width: 100, height: 100, borderRadius: 50, justifyContent: 'center', alignItems: 'center', marginBottom: 24 },
  title: { fontSize: 24, fontWeight: '800', color: '#1f2937', marginBottom: 12, textAlign: 'center' },
  desc: { color: '#6b7280', fontSize: 15, textAlign: 'center', lineHeight: 23, marginBottom: 10 },
  bold: { fontWeight: '700', color: '#0d9488' },
  infoCard: { backgroundColor: '#f9fafb', borderRadius: 16, padding: 16, width: '100%', marginTop: 16, marginBottom: 16 },
  infoLabel: { fontSize: 13, fontWeight: '700', color: '#9ca3af', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 1 },
  infoRow: { fontSize: 15, color: '#6b7280', marginBottom: 6 },
  infoVal: { color: '#1f2937', fontWeight: '600' },
  hint: { color: '#0d9488', fontSize: 14, textAlign: 'center', marginBottom: 20 },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 12, backgroundColor: '#fef2f2' },
  logoutText: { color: '#ef4444', fontWeight: '700', fontSize: 15 },
});
