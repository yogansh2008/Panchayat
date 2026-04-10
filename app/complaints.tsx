import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Switch, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, UploadCloud } from 'lucide-react-native';
import { addDocument, COLLECTIONS } from '../lib/firestore';

export default function NewComplaintScreen() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!title || !desc) {
      Alert.alert('Error', 'Please fill in title and description');
      return;
    }
    setLoading(true);
    try {
      await addDocument(COLLECTIONS.COMPLAINTS, {
        title,
        desc,
        anonymous: isAnonymous,
        status: 'Open',
        date: new Date().toLocaleDateString()
      });
      Alert.alert('Success', 'Complaint registered successfully!');
      router.back();
    } catch (e) {
      Alert.alert('Error', 'Failed to register complaint');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft color="#1f2937" size={24} />
        </TouchableOpacity>
        <Text style={styles.title}>Raise Complaint</Text>
      </View>

      <ScrollView style={styles.content}>
        <Text style={styles.label}>Title</Text>
        <TextInput style={styles.input} placeholder="e.g. Broken streetlight" value={title} onChangeText={setTitle} />

        <Text style={styles.label}>Description</Text>
        <TextInput style={[styles.input, styles.textArea]} placeholder="Describe the issue..." value={desc} onChangeText={setDesc} multiline numberOfLines={4} />

        <Text style={styles.label}>Upload Photo</Text>
        <TouchableOpacity style={styles.uploadBox}>
          <UploadCloud color="#9ca3af" size={32} />
          <Text style={styles.uploadText}>Tap to upload</Text>
        </TouchableOpacity>

        <View style={styles.switchRow}>
          <Text style={styles.label}>Report Anonymously</Text>
          <Switch value={isAnonymous} onValueChange={setIsAnonymous} trackColor={{ true: '#10b981', false: '#d1d5db' }} />
        </View>

        <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>Submit Complaint</Text>}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 24, paddingTop: 60, backgroundColor: '#fff' },
  backBtn: { marginRight: 15 },
  title: { fontSize: 24, fontWeight: '800', color: '#1f2937' },
  content: { padding: 24 },
  label: { fontSize: 16, fontWeight: '600', color: '#374151', marginBottom: 8, marginTop: 15 },
  input: { backgroundColor: '#fff', padding: 15, borderRadius: 12, fontSize: 16, borderWidth: 1, borderColor: '#e5e7eb' },
  textArea: { height: 120, textAlignVertical: 'top' },
  uploadBox: { backgroundColor: '#f3f4f6', height: 120, borderRadius: 16, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#e5e7eb', borderStyle: 'dashed' },
  uploadText: { color: '#6b7280', marginTop: 10, fontWeight: '500' },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 25 },
  submitBtn: { backgroundColor: '#10b981', padding: 18, borderRadius: 16, alignItems: 'center', marginTop: 30 },
  submitText: { color: '#fff', fontSize: 18, fontWeight: '700' }
});
