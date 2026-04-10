import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, Megaphone, Save, Trash2 } from 'lucide-react-native';
import { subscribeToData, addDocument, deleteDocument, COLLECTIONS } from '../lib/firestore';

export default function AdminNoticesScreen() {
  const router = useRouter();
  const [notices, setNotices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const unsub = subscribeToData(COLLECTIONS.NOTICES, (data) => {
      setNotices(data);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const handleCreate = async () => {
    if (!title || !desc) return Alert.alert('Required', 'Please fill title and message.');
    setSaving(true);
    try {
      await addDocument(COLLECTIONS.NOTICES, {
        title,
        desc,
        date: new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
      });
      setTitle(''); setDesc('');
      Alert.alert('Posted ✓', 'Notice broadcast to all residents.');
    } catch {
      Alert.alert('Error', 'Could not post notice.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (id: string) => {
    Alert.alert('Delete Notice', 'Remove this notice?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteDocument(COLLECTIONS.NOTICES, id) },
    ]);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft color="#1f2937" size={24} />
        </TouchableOpacity>
        <Text style={styles.title}>Post Notice</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Broadcast New Notice</Text>
          <TextInput style={styles.input} placeholder="Notice Title" value={title} onChangeText={setTitle} />
          <TextInput
            style={[styles.input, { height: 100, textAlignVertical: 'top' }]}
            placeholder="Announcement message..."
            value={desc}
            onChangeText={setDesc}
            multiline
          />
          <TouchableOpacity style={styles.submitBtn} onPress={handleCreate} disabled={saving}>
            <Megaphone color="#fff" size={20} />
            <Text style={styles.submitText}> {saving ? 'Posting…' : 'Broadcast Notice'}</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionTitle}>All Notices ({notices.length})</Text>
        {loading ? <ActivityIndicator color="#0d9488" /> : notices.map(n => (
          <View key={n.id} style={styles.noticeCard}>
            <View style={{ flex: 1 }}>
              <Text style={styles.nDate}>{n.date}</Text>
              <Text style={styles.nTitle}>{n.title}</Text>
              <Text style={styles.nDesc}>{n.desc}</Text>
            </View>
            <TouchableOpacity onPress={() => handleDelete(n.id)} style={styles.deleteBtn}>
              <Trash2 color="#ef4444" size={18} />
            </TouchableOpacity>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container:   { flex: 1, backgroundColor: '#f9fafb' },
  header:      { flexDirection: 'row', alignItems: 'center', padding: 24, paddingTop: 60, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  backBtn:     { marginRight: 15 },
  title:       { fontSize: 24, fontWeight: '700', color: '#1f2937' },
  scroll:      { padding: 20 },
  card:        { backgroundColor: '#fff', padding: 24, borderRadius: 24, marginBottom: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.03, shadowRadius: 10, elevation: 2 },
  cardTitle:   { fontSize: 18, fontWeight: '600', color: '#1f2937', marginBottom: 15 },
  input:       { backgroundColor: '#f3f4f6', padding: 15, borderRadius: 16, marginBottom: 12, fontSize: 16 },
  submitBtn:   { backgroundColor: '#0d9488', flexDirection: 'row', padding: 16, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  submitText:  { color: '#fff', fontSize: 16, fontWeight: '600' },
  sectionTitle:{ fontSize: 18, fontWeight: '700', color: '#1f2937', marginBottom: 15 },
  noticeCard:  { backgroundColor: '#fff', padding: 20, borderRadius: 20, marginBottom: 12, flexDirection: 'row', alignItems: 'flex-start', borderLeftWidth: 4, borderLeftColor: '#f59e0b' },
  nDate:       { fontSize: 12, color: '#f59e0b', fontWeight: '700', marginBottom: 4 },
  nTitle:      { fontSize: 16, fontWeight: '700', color: '#1f2937' },
  nDesc:       { fontSize: 14, color: '#6b7280', marginTop: 4, lineHeight: 20 },
  deleteBtn:   { padding: 8 },
});
