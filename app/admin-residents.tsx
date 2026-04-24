import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, UserPlus, Shield, User } from 'lucide-react-native';
import { subscribeToData, addDocument, COLLECTIONS } from '../backend/db/firestore';
import { useAuth } from '../frontend/context/AuthContext';

export default function AdminResidentsScreen() {
  const router = useRouter();
  const [residents, setResidents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const { profile } = useAuth();
  const societyId = profile?.societyId || '';
  const societyCode = profile?.societyCode || '';

  // Form
  const [name, setName] = useState('');
  const [flat, setFlat] = useState('');
  const [email, setEmail] = useState('');

  useEffect(() => {
    if (!societyId) { setLoading(false); return; }
    const unsub = subscribeToData(COLLECTIONS.USERS, (data) => {
      setResidents(data.filter(u => u.role === 'Resident'));
      setLoading(false);
    }, [{ field: 'societyId', op: '==', value: societyId }]);
    return () => unsub();
  }, [societyId]);

  const handleCreate = async () => {
    if (!name || !flat) {
      Alert.alert('Required', 'Name and Flat are required');
      return;
    }
    if (!societyId) return;
    try {
      await addDocument(COLLECTIONS.USERS, {
        name, flatNo: flat, email, role: 'Resident', status: 'Approved',
        societyId, societyCode
      });
      setName(''); setFlat(''); setEmail('');
      Alert.alert('Success', 'Resident added manually.');
    } catch (e) {
      Alert.alert('Error', 'Failed to add resident');
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft color="#1f2937" size={24} />
        </TouchableOpacity>
        <Text style={styles.title}>Manage Residents</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Add Resident</Text>
          <TextInput style={styles.input} placeholder="Full Name" value={name} onChangeText={setName} />
          <TextInput style={styles.input} placeholder="Flat / Block" value={flat} onChangeText={setFlat} />
          <TextInput style={styles.input} placeholder="Email Address (Optional)" value={email} onChangeText={setEmail} autoCapitalize="none" />
          <TouchableOpacity style={styles.submitBtn} onPress={handleCreate}>
            <UserPlus color="#fff" size={20} />
            <Text style={styles.submitText}> Register Resident</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionTitle}>Directory ({residents.length})</Text>
        {loading ? <ActivityIndicator color="#0d9488" style={{ marginTop: 20 }} /> : residents.map(r => (
          <View key={r.id} style={styles.residentCard}>
            <View style={styles.avatar}>
              <User color="#0d9488" size={24} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.rName}>{r.name}</Text>
              <Text style={styles.rFlat}>{r.flatNo || 'No Flat Assigned'}</Text>
            </View>
            <Shield color="#10b981" size={20} />
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 24, paddingTop: 60, backgroundColor: '#fff', borderBottomColor: '#f3f4f6', borderBottomWidth: 1 },
  backBtn: { marginRight: 15 },
  title: { fontSize: 24, fontWeight: '700', color: '#1f2937' },
  scroll: { padding: 20 },
  card: { backgroundColor: '#fff', padding: 24, borderRadius: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.03, shadowRadius: 10, elevation: 2, marginBottom: 20 },
  cardTitle: { fontSize: 18, fontWeight: '600', color: '#1f2937', marginBottom: 15 },
  input: { backgroundColor: '#f3f4f6', padding: 15, borderRadius: 16, marginBottom: 12, fontSize: 16 },
  submitBtn: { backgroundColor: '#0d9488', flexDirection: 'row', padding: 16, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginTop: 5 },
  submitText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#1f2937', marginBottom: 15, marginLeft: 5 },
  residentCard: { backgroundColor: '#fff', flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 20, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.02, shadowRadius: 8, elevation: 1 },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#ccfbf1', justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  rName: { fontSize: 16, fontWeight: '600', color: '#1f2937' },
  rFlat: { fontSize: 13, color: '#6b7280', marginTop: 2 }
});
