import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, FlatList, Alert, ActivityIndicator, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, Wrench, UserPlus, Star, MapPin } from 'lucide-react-native';
import { subscribeToData, addDocument, deleteDocument, COLLECTIONS } from '../backend/db/firestore';
import { useAuth } from '../frontend/context/AuthContext';

const CATEGORIES = ['Plumber', 'Electrician', 'Cleaner', 'Carpenter', 'Doctor', 'Grocery', 'Security', 'Other'];

export default function AdminAddProviderScreen() {
  const router = useRouter();
  const [providers, setProviders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [location, setLocation] = useState('');
  const [category, setCategory] = useState('Plumber');

  const { profile } = useAuth();
  const societyId = profile?.societyId || '';

  useEffect(() => {
    if (!societyId) { setLoading(false); return; }
    const unsub = subscribeToData(COLLECTIONS.SERVICES, (data) => {
      setProviders(data);
      setLoading(false);
    }, [{ field: 'societyId', op: '==', value: societyId }]);
    return () => unsub();
  }, [societyId]);

  const handleAdd = async () => {
    if (!name || !phone || !location) return Alert.alert('Required', 'All fields are required');
    if (!societyId) return Alert.alert('Error', 'No society linked');
    setSaving(true);
    try {
      await addDocument(COLLECTIONS.SERVICES, { name, phone, location, category, rating: 5.0, available: true, societyId });
      setName(''); setPhone(''); setLocation(''); setCategory('Plumber');
      Alert.alert('✅ Added', `${name} has been added to the services directory.`);
    } catch (e: any) { Alert.alert('Error', e.message); }
    setSaving(false);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft color="#1f2937" size={24} />
        </TouchableOpacity>
        <Text style={styles.title}>Service Providers</Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Add Form */}
        <View style={styles.card}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 14 }}>
            <UserPlus color="#0d9488" size={22} />
            <Text style={styles.cardTitle}> Add New Provider</Text>
          </View>

          <Text style={styles.label}>Category</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }}>
            {CATEGORIES.map(cat => (
              <TouchableOpacity key={cat} style={[styles.catBadge, category === cat && styles.catBadgeActive]} onPress={() => setCategory(cat)}>
                <Text style={[styles.catText, category === cat && styles.catTextActive]}>{cat}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <TextInput style={styles.input} placeholder="Provider Name / Company" value={name} onChangeText={setName} />
          <TextInput style={styles.input} placeholder="Phone Number" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
          <TextInput style={styles.input} placeholder="Location (e.g. Block A, Shop 3)" value={location} onChangeText={setLocation} />

          <TouchableOpacity style={styles.saveBtn} onPress={handleAdd} disabled={saving}>
            {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Add to Directory</Text>}
          </TouchableOpacity>
        </View>

        {/* Providers List */}
        <Text style={styles.sectionTitle}>Current Providers ({providers.length})</Text>
        {loading ? <ActivityIndicator color="#0d9488" /> : providers.map(p => (
          <View key={p.id} style={styles.provCard}>
            <View style={[styles.catDot, { backgroundColor: '#0d9488' }]}>
              <Wrench color="#fff" size={14} />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.provName}>{p.name}</Text>
              <Text style={styles.provCat}>{p.category}</Text>
              <View style={{ flexDirection: 'row', marginTop: 4 }}>
                <MapPin color="#9ca3af" size={12} />
                <Text style={styles.provMeta}> {p.location}</Text>
                <Star color="#f59e0b" size={12} style={{ marginLeft: 8 }} />
                <Text style={styles.provMeta}> {p.rating}</Text>
              </View>
            </View>
            <TouchableOpacity onPress={() => Alert.alert('Remove', `Remove ${p.name}?`, [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Remove', style: 'destructive', onPress: () => deleteDocument(COLLECTIONS.SERVICES, p.id) },
            ])}>
              <Text style={{ color: '#ef4444', fontWeight: '600', fontSize: 13 }}>Remove</Text>
            </TouchableOpacity>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 20, paddingTop: 60, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  backBtn: { marginRight: 15 },
  title: { fontSize: 22, fontWeight: '700', color: '#1f2937' },
  card: { backgroundColor: '#fff', margin: 16, padding: 18, borderRadius: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  cardTitle: { fontSize: 17, fontWeight: '700', color: '#1f2937' },
  label: { fontSize: 13, fontWeight: '600', color: '#6b7280', marginBottom: 8 },
  catBadge: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#f3f4f6', marginRight: 8 },
  catBadgeActive: { backgroundColor: '#0d9488' },
  catText: { color: '#6b7280', fontWeight: '600', fontSize: 13 },
  catTextActive: { color: '#fff' },
  input: { backgroundColor: '#f3f4f6', padding: 14, borderRadius: 12, marginBottom: 12, fontSize: 15 },
  saveBtn: { backgroundColor: '#0d9488', padding: 16, borderRadius: 14, alignItems: 'center' },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: '#1f2937', paddingHorizontal: 16, marginBottom: 8 },
  provCard: { backgroundColor: '#fff', margin: 8, marginHorizontal: 16, padding: 14, borderRadius: 16, flexDirection: 'row', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.03, shadowRadius: 4, elevation: 1 },
  catDot: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  provName: { fontSize: 15, fontWeight: '700', color: '#1f2937' },
  provCat: { color: '#0d9488', fontSize: 12, fontWeight: '600', marginTop: 2 },
  provMeta: { fontSize: 12, color: '#9ca3af' },
});
