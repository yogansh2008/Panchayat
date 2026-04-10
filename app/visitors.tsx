import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, FlatList, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, UserPlus, Check, X } from 'lucide-react-native';
import { fetchData, subscribeToData, COLLECTIONS, addDocument } from '../lib/firestore';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';

export default function VisitorsScreen() {
  const router = useRouter();
  const [visitors, setVisitors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [visitorName, setVisitorName] = useState('');
  const [visitorTime, setVisitorTime] = useState('');

  const { profile } = useAuth();
  const [visitorType, setVisitorType] = useState('Delivery');

  useEffect(() => {
    // Show only the resident's visitors unless they are an admin
    const filters = profile?.role === 'Resident' ? [{ field: 'flatNo', op: '==', value: profile.flatNo }] : undefined;
    
    const unsub = subscribeToData(COLLECTIONS.VISITORS, (data) => {
      setVisitors(data);
      setLoading(false);
    }, filters);
    return () => unsub();
  }, [profile]);

  const handleGeneratePass = async () => {
    if (!visitorName || !visitorTime) return;
    try {
      await addDocument(COLLECTIONS.VISITORS, {
        name: visitorName,
        time: visitorTime,
        type: visitorType,
        flatNo: profile?.flatNo || 'Unknown',
        status: 'Expected'
      });
      setVisitorName('');
      setVisitorTime('');
      alert("Visitor pass generated!");
    } catch {
      alert("Failed to generate pass");
    }
  };

  const handleStatusUpdate = async (id: string, status: string) => {
    try {
      await updateDoc(doc(db, COLLECTIONS.VISITORS, id), { status });
    } catch {
      alert("Failed to update status");
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft color="#1f2937" size={24} />
        </TouchableOpacity>
        <Text style={styles.title}>Visitor Tracking</Text>
      </View>

      <View style={styles.addCard}>
        <View style={styles.addHeader}>
          <UserPlus color="#10b981" size={24} />
          <Text style={styles.addTitle}>Pre-approve Visitor</Text>
        </View>
        <View style={styles.typeRow}>
          {['Guest', 'Delivery', 'Worker'].map(t => (
            <TouchableOpacity key={t} style={[styles.typeBtn, visitorType === t && styles.typeBtnActive]} onPress={() => setVisitorType(t)}>
              <Text style={[styles.typeText, visitorType === t && styles.typeTextActive]}>{t}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <TextInput style={styles.input} placeholder="Visitor Name / Company" value={visitorName} onChangeText={setVisitorName} />
        <TextInput style={styles.input} placeholder="Expected Time" value={visitorTime} onChangeText={setVisitorTime} />
        <TouchableOpacity style={styles.addBtn} onPress={handleGeneratePass}>
          <Text style={styles.addText}>Generate Pass</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.sectionTitle}>At The Gate</Text>
      <FlatList
        data={visitors}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View>
              <Text style={styles.name}>{item.name}</Text>
              <Text style={styles.time}>{item.time} • {item.status}</Text>
            </View>
            <View style={styles.actions}>
              {item.status !== 'Approved' && (
                <TouchableOpacity style={styles.approveBtn} onPress={() => handleStatusUpdate(item.id, 'Approved')}>
                  <Check color="#fff" size={20} />
                </TouchableOpacity>
              )}
              {item.status !== 'Denied' && (
                <TouchableOpacity style={styles.denyBtn} onPress={() => handleStatusUpdate(item.id, 'Denied')}>
                  <X color="#fff" size={20} />
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}
        contentContainerStyle={styles.list}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 24, paddingTop: 60, backgroundColor: '#fff' },
  backBtn: { marginRight: 15 },
  title: { fontSize: 24, fontWeight: '800', color: '#1f2937' },
  addCard: { backgroundColor: '#fff', margin: 24, padding: 20, borderRadius: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  addHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
  addTitle: { fontSize: 18, fontWeight: '700', color: '#1f2937', marginLeft: 10 },
  input: { backgroundColor: '#f3f4f6', padding: 15, borderRadius: 12, marginBottom: 10 },
  addBtn: { backgroundColor: '#10b981', padding: 15, borderRadius: 12, alignItems: 'center', marginTop: 10 },
  addText: { color: '#fff', fontWeight: 'bold' },
  typeRow: { flexDirection: 'row', marginBottom: 15 },
  typeBtn: { flex: 1, padding: 10, backgroundColor: '#f3f4f6', borderRadius: 10, alignItems: 'center', marginRight: 6 },
  typeBtnActive: { backgroundColor: '#10b981' },
  typeText: { fontWeight: '600', color: '#6b7280', fontSize: 13 },
  typeTextActive: { color: '#fff' },
  sectionTitle: { paddingHorizontal: 24, fontSize: 18, fontWeight: '700', color: '#1f2937', marginBottom: 10 },
  list: { paddingHorizontal: 24 },
  card: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff', padding: 20, borderRadius: 20, marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  name: { fontSize: 16, fontWeight: '700', color: '#1f2937' },
  time: { color: '#6b7280', marginTop: 4 },
  actions: { flexDirection: 'row' },
  approveBtn: { backgroundColor: '#10b981', width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  denyBtn: { backgroundColor: '#ef4444', width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' }
});
