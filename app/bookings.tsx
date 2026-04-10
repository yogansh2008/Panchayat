import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, FlatList, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, Clock } from 'lucide-react-native';
import { fetchData, subscribeToData, COLLECTIONS } from '../lib/firestore';
import { db } from '../lib/firebase';
import { doc, updateDoc } from 'firebase/firestore';

export default function BookingsScreen() {
  const router = useRouter();
  const [facilities, setFacilities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = subscribeToData(COLLECTIONS.FACILITIES, (data) => {
      setFacilities(data);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const handleBook = async (id: string, currentStatus: string) => {
    if (currentStatus !== 'Available') return;
    try {
      await updateDoc(doc(db, COLLECTIONS.FACILITIES, id), { status: 'Booked' });
      alert("Facility successfully booked!");
    } catch {
      alert("Error booking facility.");
    }
  };

  const renderFacility = ({ item }: any) => (
    <View style={styles.card}>
      <View>
        <Text style={styles.name}>{item.name}</Text>
        <Text style={styles.type}>{item.type}</Text>
      </View>
      <TouchableOpacity 
        style={[styles.statusBtn, item.status === 'Available' ? styles.btnAvailable : styles.btnBooked]}
        onPress={() => handleBook(item.id, item.status)}
      >
        <Text style={[styles.statusText, item.status === 'Available' ? styles.textAvailable : styles.textBooked]}>
          {item.status === 'Available' ? 'Book Now' : 'Check Times'}
        </Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft color="#1f2937" size={24} />
        </TouchableOpacity>
        <Text style={styles.title}>Book Facility</Text>
      </View>

      <FlatList
        data={facilities}
        keyExtractor={item => item.id}
        renderItem={renderFacility}
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
  list: { padding: 24 },
  card: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff', padding: 20, borderRadius: 20, marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  name: { fontSize: 18, fontWeight: '700', color: '#1f2937' },
  type: { color: '#6b7280', marginTop: 4 },
  statusBtn: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12 },
  btnAvailable: { backgroundColor: '#ecfdf5' },
  btnBooked: { backgroundColor: '#f3f4f6' },
  textAvailable: { color: '#10b981', fontWeight: 'bold' },
  textBooked: { color: '#6b7280', fontWeight: 'bold' },
  statusText: {}
});
