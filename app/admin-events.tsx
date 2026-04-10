import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, Calendar, Save } from 'lucide-react-native';
import { subscribeToData, addDocument, COLLECTIONS } from '../lib/firestore';

export default function AdminEventsScreen() {
  const router = useRouter();
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [date, setDate] = useState('');

  useEffect(() => {
    const unsub = subscribeToData(COLLECTIONS.EVENTS, (data) => {
      setEvents(data);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const handleCreate = async () => {
    if (!title || !desc || !date) return Alert.alert("Required", "All fields are required");
    try {
      await addDocument(COLLECTIONS.EVENTS, { title, desc, date });
      setTitle(''); setDesc(''); setDate('');
      Alert.alert("Success", "Event broadcasted to all residents");
    } catch {
      Alert.alert("Error", "Could not create event");
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft color="#1f2937" size={24} />
        </TouchableOpacity>
        <Text style={styles.title}>Manage Events</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Create New Event</Text>
          <TextInput style={styles.input} placeholder="Event Title" value={title} onChangeText={setTitle} />
          <TextInput style={styles.input} placeholder="Date & Time (e.g. 24th Oct, 7 PM)" value={date} onChangeText={setDate} />
          <TextInput style={[styles.input, { height: 80 }]} placeholder="Event Description" value={desc} onChangeText={setDesc} multiline />
          <TouchableOpacity style={styles.submitBtn} onPress={handleCreate}>
            <Save color="#fff" size={20} />
            <Text style={styles.submitText}> Publish Event</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionTitle}>Active Events</Text>
        {loading ? <ActivityIndicator color="#0d9488" /> : events.map(e => (
          <View key={e.id} style={styles.eventCard}>
            <View style={styles.eDateBox}>
              <Text style={styles.eDateText}>{e.date?.split(' ')[0]}</Text>
            </View>
            <View style={{ flex: 1, marginLeft: 15 }}>
              <Text style={styles.eTitle}>{e.title}</Text>
              <Text style={styles.eDesc}>{e.desc}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8 }}>
                <Calendar color="#10b981" size={14} />
                <Text style={styles.eMeta}> {e.date}</Text>
              </View>
            </View>
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
  card: { backgroundColor: '#fff', padding: 24, borderRadius: 24, marginBottom: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.03, shadowRadius: 10, elevation: 2 },
  cardTitle: { fontSize: 18, fontWeight: '600', color: '#1f2937', marginBottom: 15 },
  input: { backgroundColor: '#f3f4f6', padding: 15, borderRadius: 16, marginBottom: 12, fontSize: 16 },
  submitBtn: { backgroundColor: '#0d9488', flexDirection: 'row', padding: 16, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginTop: 5 },
  submitText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#1f2937', marginBottom: 15, marginLeft: 5 },
  eventCard: { backgroundColor: '#fff', flexDirection: 'row', padding: 16, borderRadius: 20, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.02, shadowRadius: 8, elevation: 1 },
  eDateBox: { backgroundColor: '#e0e7ff', width: 60, height: 60, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  eDateText: { color: '#4f46e5', fontWeight: 'bold', fontSize: 16, textAlign: 'center' },
  eTitle: { fontSize: 17, fontWeight: '700', color: '#1f2937' },
  eDesc: { fontSize: 14, color: '#6b7280', marginTop: 4, lineHeight: 20 },
  eMeta: { fontSize: 13, color: '#10b981', fontWeight: '600' }
});
