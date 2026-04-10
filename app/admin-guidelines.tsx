import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, FlatList, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, BookOpen, Plus, Trash2, Save } from 'lucide-react-native';
import { useAuth } from '../context/AuthContext';
import { subscribeToGuidelines, addGuideline, deleteGuideline } from '../lib/firestore';

export default function AdminGuidelinesScreen() {
  const router = useRouter();
  const { profile } = useAuth();
  const [guidelines, setGuidelines] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    if (!profile?.societyCode) { setLoading(false); return; }
    const unsub = subscribeToGuidelines(profile.societyCode, (data) => {
      setGuidelines(data);
      setLoading(false);
    });
    return () => unsub();
  }, [profile?.societyCode]);

  const handleAdd = async () => {
    if (!title.trim() || !content.trim()) return Alert.alert('Required', 'Both title and content are needed');
    setSaving(true);
    try {
      await addGuideline(profile!.societyCode!, { title: title.trim(), content: content.trim() });
      setTitle(''); setContent(''); setShowForm(false);
    } catch (e: any) { Alert.alert('Error', e.message); }
    setSaving(false);
  };

  const handleDelete = (item: any) => {
    Alert.alert('Delete Guideline', `Delete "${item.title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteGuideline(item.id) },
    ]);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft color="#1f2937" size={24} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>AI Guidelines</Text>
          <Text style={styles.subtitle}>Chatbot answers residents based on these</Text>
        </View>
        <TouchableOpacity style={styles.addBtn} onPress={() => setShowForm(!showForm)}>
          <Plus color="#fff" size={20} />
        </TouchableOpacity>
      </View>

      {showForm && (
        <View style={styles.form}>
          <TextInput style={styles.input} placeholder="Guideline Title (e.g. Pool Rules)" value={title} onChangeText={setTitle} />
          <TextInput
            style={[styles.input, { height: 100, textAlignVertical: 'top' }]}
            placeholder="Full guideline content... This becomes the chatbot's knowledge."
            value={content}
            onChangeText={setContent}
            multiline
          />
          <TouchableOpacity style={styles.saveBtn} onPress={handleAdd} disabled={saving}>
            {saving ? <ActivityIndicator color="#fff" /> : (
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Save color="#fff" size={18} />
                <Text style={styles.saveBtnText}> Save Guideline</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      )}

      {loading ? (
        <ActivityIndicator color="#0d9488" style={{ marginTop: 40 }} />
      ) : guidelines.length === 0 ? (
        <View style={styles.empty}>
          <BookOpen color="#d1d5db" size={64} />
          <Text style={styles.emptyTitle}>No Guidelines Yet</Text>
          <Text style={styles.emptyDesc}>Tap the ✚ button to add guidelines. Residents' chatbot will answer based on these.</Text>
        </View>
      ) : (
        <FlatList
          data={guidelines}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={{ flex: 1 }}>
                <Text style={styles.guideTitle}>{item.title}</Text>
                <Text style={styles.guideContent} numberOfLines={3}>{item.content}</Text>
              </View>
              <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDelete(item)}>
                <Trash2 color="#ef4444" size={20} />
              </TouchableOpacity>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 20, paddingTop: 60, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  backBtn: { marginRight: 15 },
  title: { fontSize: 20, fontWeight: '700', color: '#1f2937' },
  subtitle: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  addBtn: { backgroundColor: '#0d9488', width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  form: { backgroundColor: '#fff', margin: 16, padding: 16, borderRadius: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  input: { backgroundColor: '#f3f4f6', padding: 14, borderRadius: 12, marginBottom: 12, fontSize: 15 },
  saveBtn: { backgroundColor: '#0d9488', padding: 14, borderRadius: 12, alignItems: 'center' },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  list: { padding: 16 },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 12, flexDirection: 'row', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 1, borderLeftWidth: 4, borderLeftColor: '#0d9488' },
  guideTitle: { fontSize: 16, fontWeight: '700', color: '#1f2937', marginBottom: 4 },
  guideContent: { color: '#6b7280', fontSize: 13, lineHeight: 20 },
  deleteBtn: { padding: 8 },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: '#374151', marginTop: 20, marginBottom: 10 },
  emptyDesc: { color: '#9ca3af', textAlign: 'center', lineHeight: 22 },
});
