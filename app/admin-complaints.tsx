import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, AlertOctagon, CheckCircle } from 'lucide-react-native';
import { subscribeToData, COLLECTIONS } from '../lib/firestore';
import { db } from '../lib/firebase';
import { doc, updateDoc } from 'firebase/firestore';

export default function AdminComplaintsScreen() {
  const router = useRouter();
  const [complaints, setComplaints] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = subscribeToData(COLLECTIONS.COMPLAINTS, (data) => {
      setComplaints(data.sort((a, b) => (a.status === 'Resolved' ? 1 : -1)));
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const markResolved = async (id: string) => {
    await updateDoc(doc(db, COLLECTIONS.COMPLAINTS, id), { status: 'Resolved' });
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft color="#1f2937" size={24} />
        </TouchableOpacity>
        <Text style={styles.title}>All Complaints</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {loading ? <ActivityIndicator color="#ef4444" size="large" /> : complaints.map(c => (
          <View key={c.id} style={[styles.card, c.status === 'Resolved' && styles.resolvedCard]}>
            <View style={styles.cardHeader}>
              <View style={styles.titleRow}>
                <AlertOctagon color={c.status === 'Resolved' ? '#10b981' : '#ef4444'} size={20} />
                <Text style={[styles.cTitle, c.status === 'Resolved' && { color: '#6b7280' }]}> {c.title}</Text>
              </View>
              <Text style={[styles.statusBox, c.status === 'Resolved' && { backgroundColor: '#d1fae5', color: '#10b981' }]}>
                {c.status}
              </Text>
            </View>
            <Text style={styles.cDesc}>{c.desc || c.description}</Text>
            <Text style={styles.cMeta}>{c.anonymous ? 'Reported Anonymously' : (c.reporter || 'Resident')} • Flat {c.flatNo || 'N/A'}</Text>
            
            {c.status !== 'Resolved' && (
              <TouchableOpacity style={styles.resolveBtn} onPress={() => markResolved(c.id)}>
                <CheckCircle color="#fff" size={18} />
                <Text style={styles.resolveBtnText}> Mark as Resolved</Text>
              </TouchableOpacity>
            )}
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
  card: { backgroundColor: '#fff', padding: 24, borderRadius: 24, marginBottom: 15, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.03, shadowRadius: 10, elevation: 2, borderLeftWidth: 4, borderLeftColor: '#ef4444' },
  resolvedCard: { opacity: 0.7, borderLeftColor: '#10b981' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  titleRow: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  cTitle: { fontSize: 17, fontWeight: '700', color: '#1f2937', marginLeft: 4, flexShrink: 1 },
  statusBox: { backgroundColor: '#fee2e2', color: '#ef4444', fontSize: 12, fontWeight: 'bold', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, overflow: 'hidden' },
  cDesc: { fontSize: 15, color: '#4b5563', lineHeight: 22 },
  cMeta: { fontSize: 13, color: '#9ca3af', marginTop: 12, fontStyle: 'italic' },
  resolveBtn: { backgroundColor: '#10b981', flexDirection: 'row', padding: 12, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginTop: 15 },
  resolveBtnText: { color: '#fff', fontWeight: '600', fontSize: 15 }
});
