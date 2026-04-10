import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, FlatList, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, UserCheck, UserX, Clock } from 'lucide-react-native';
import { useAuth } from '../context/AuthContext';
import { subscribePendingResidents, approveResident, rejectResident, subscribeToData, COLLECTIONS } from '../lib/firestore';

export default function AdminRequestsScreen() {
  const router = useRouter();
  const { user, profile } = useAuth();
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile?.societyCode) { setLoading(false); return; }
    const unsub = subscribePendingResidents(profile.societyCode, (data) => {
      setRequests(data);
      setLoading(false);
    });
    return () => unsub();
  }, [profile?.societyCode]);

  const handleApprove = async (req: any) => {
    try {
      await approveResident(req);
      Alert.alert('✅ Approved', `${req.name} now has full access to the society.`);
    } catch (e: any) { Alert.alert('Error', e.message); }
  };

  const handleReject = (req: any) => {
    Alert.alert('Reject Request', `Are you sure you want to reject ${req.name}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Reject', style: 'destructive', onPress: async () => {
        await rejectResident(req.uid);
      }},
    ]);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft color="#1f2937" size={24} />
        </TouchableOpacity>
        <Text style={styles.title}>Pending Requests</Text>
        <View style={styles.badge}><Text style={styles.badgeText}>{requests.length}</Text></View>
      </View>

      {loading ? (
        <ActivityIndicator color="#0d9488" style={{ marginTop: 40 }} />
      ) : requests.length === 0 ? (
        <View style={styles.emptyState}>
          <UserCheck color="#d1d5db" size={64} />
          <Text style={styles.emptyTitle}>No Pending Requests</Text>
          <Text style={styles.emptyDesc}>All join requests have been handled. New requests will appear here in real-time.</Text>
        </View>
      ) : (
        <FlatList
          data={requests}
          keyExtractor={item => item.uid}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.cardTop}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{item.name?.[0]?.toUpperCase()}</Text>
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.name}>{item.name}</Text>
                  <Text style={styles.email}>{item.email}</Text>
                  <View style={styles.meta}>
                    <Text style={styles.metaText}>🏠 Flat {item.flatNo}</Text>
                    <Text style={styles.metaText}>🏘️ Code: {item.societyCode}</Text>
                  </View>
                </View>
                <View style={styles.pendingBadge}>
                  <Clock color="#f59e0b" size={12} />
                  <Text style={styles.pendingText}> Pending</Text>
                </View>
              </View>
              <View style={styles.actions}>
                <TouchableOpacity style={styles.approveBtn} onPress={() => handleApprove(item)}>
                  <UserCheck color="#fff" size={18} />
                  <Text style={styles.approveBtnText}>Approve</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.rejectBtn} onPress={() => handleReject(item)}>
                  <UserX color="#ef4444" size={18} />
                  <Text style={styles.rejectBtnText}>Reject</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 24, paddingTop: 60, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  backBtn: { marginRight: 15 },
  title: { fontSize: 22, fontWeight: '700', color: '#1f2937', flex: 1 },
  badge: { backgroundColor: '#ef4444', width: 26, height: 26, borderRadius: 13, justifyContent: 'center', alignItems: 'center' },
  badgeText: { color: '#fff', fontWeight: '800', fontSize: 13 },
  list: { padding: 16 },
  card: { backgroundColor: '#fff', borderRadius: 20, padding: 16, marginBottom: 14, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  cardTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#0d9488', justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: '#fff', fontSize: 20, fontWeight: '800' },
  name: { fontSize: 17, fontWeight: '700', color: '#1f2937' },
  email: { fontSize: 13, color: '#6b7280', marginTop: 2 },
  meta: { flexDirection: 'row', marginTop: 6, gap: 8 },
  metaText: { fontSize: 12, color: '#6b7280', backgroundColor: '#f3f4f6', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  pendingBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fffbeb', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10 },
  pendingText: { color: '#f59e0b', fontSize: 11, fontWeight: '700' },
  actions: { flexDirection: 'row', gap: 12 },
  approveBtn: { flex: 1, backgroundColor: '#0d9488', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', padding: 13, borderRadius: 14 },
  approveBtnText: { color: '#fff', fontWeight: '700', marginLeft: 6 },
  rejectBtn: { flex: 1, backgroundColor: '#fef2f2', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', padding: 13, borderRadius: 14 },
  rejectBtnText: { color: '#ef4444', fontWeight: '700', marginLeft: 6 },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: '#374151', marginTop: 20, marginBottom: 10 },
  emptyDesc: { color: '#9ca3af', textAlign: 'center', lineHeight: 22 },
});
