import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, FlatList, ActivityIndicator, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, Plus } from 'lucide-react-native';
import { fetchData, subscribeToData, addDocument, COLLECTIONS } from '../lib/firestore';

export default function RulesScreen() {
  const router = useRouter();
  const [rules, setRules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');

  useEffect(() => {
    const unsub = subscribeToData(COLLECTIONS.RULES, (data) => {
      setRules(data);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const handleAddRule = async () => {
    if (!title || !desc) {
      Alert.alert("Error", "Please fill completely.");
      return;
    }
    setAdding(true);
    try {
      await addDocument(COLLECTIONS.RULES, { title, desc });
      setTitle('');
      setDesc('');
      Alert.alert("Success", "Guideline added to society rulebook.");
    } catch (e) {
      Alert.alert("Error", "Failed to add guideline.");
    } finally {
      setAdding(false);
    }
  };

  const renderRule = ({ item }: any) => (
    <View style={styles.card}>
      <Text style={styles.ruleTitle}>{item.title}</Text>
      <Text style={styles.ruleDesc}>{item.desc}</Text>
    </View>
  );

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft color="#1f2937" size={24} />
        </TouchableOpacity>
        <Text style={styles.title}>Society Guidelines</Text>
      </View>

      <View style={styles.addBox}>
        <Text style={styles.addHeading}>Add New Rule</Text>
        <TextInput style={styles.input} placeholder="Guideline Title" value={title} onChangeText={setTitle} />
        <TextInput style={styles.inputArea} placeholder="Describe the rule..." value={desc} onChangeText={setDesc} multiline />
        <TouchableOpacity style={styles.addBtn} onPress={handleAddRule} disabled={adding}>
          {adding ? <ActivityIndicator color="#fff" /> : (
            <>
              <Plus color="#fff" size={20} />
              <Text style={styles.addBtnText}>Add to Rulebook</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#10b981" style={{ marginTop: 20 }} />
      ) : (
        <FlatList
          data={rules}
          keyExtractor={item => item.id}
          renderItem={renderRule}
          contentContainerStyle={styles.list}
        />
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 24, paddingTop: 60, backgroundColor: '#fff' },
  backBtn: { marginRight: 15 },
  title: { fontSize: 24, fontWeight: '800', color: '#1f2937' },
  addBox: { backgroundColor: '#fff', margin: 24, padding: 20, borderRadius: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  addHeading: { fontSize: 18, fontWeight: '700', color: '#1f2937', marginBottom: 15 },
  input: { backgroundColor: '#f3f4f6', padding: 15, borderRadius: 12, marginBottom: 10, fontSize: 16 },
  inputArea: { backgroundColor: '#f3f4f6', padding: 15, borderRadius: 12, marginBottom: 15, fontSize: 16, height: 80, textAlignVertical: 'top' },
  addBtn: { backgroundColor: '#10b981', padding: 15, borderRadius: 12, flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  addBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16, marginLeft: 8 },
  list: { paddingHorizontal: 24, paddingBottom: 24 },
  card: { backgroundColor: '#fff', padding: 20, borderRadius: 20, marginBottom: 16, borderLeftWidth: 4, borderLeftColor: '#8b5cf6', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  ruleTitle: { fontSize: 18, fontWeight: '700', color: '#1f2937', marginBottom: 8 },
  ruleDesc: { color: '#6b7280', lineHeight: 22 }
});
