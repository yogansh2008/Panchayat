import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, Building, MapPin, Hash, Shield } from 'lucide-react-native';
import { addDocument, COLLECTIONS } from '../lib/firestore';
import { useAuth } from '../context/AuthContext';

export default function AddSocietyScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [code, setCode] = useState('');
  const [totalFlats, setTotalFlats] = useState('');

  const handleAddSociety = async () => {
    if (!name || !address || !code) {
      Alert.alert("Required", "Please fill Name, Address, and Code.");
      return;
    }
    
    setLoading(true);
    try {
      await addDocument(COLLECTIONS.SOCIETIES, {
        name,
        address,
        code: code.toUpperCase(),
        totalFlats: parseInt(totalFlats) || 0,
        adminId: user?.uid || 'unknown'
      });
      Alert.alert("Success", "New society successfully added to your management portfolio.");
      router.back();
    } catch (e) {
      Alert.alert("Error", "Could not add society. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft color="#1f2937" size={24} />
        </TouchableOpacity>
        <Text style={styles.title}>Register Society</Text>
      </View>

      <View style={styles.formCard}>
        <View style={styles.inputGroup}>
          <Building color="#9ca3af" size={20} style={styles.icon} />
          <TextInput style={styles.input} placeholder="Society Name (e.g. Green Valley)" value={name} onChangeText={setName} />
        </View>

        <View style={styles.inputGroup}>
          <MapPin color="#9ca3af" size={20} style={styles.icon} />
          <TextInput style={styles.input} placeholder="Full Address" value={address} onChangeText={setAddress} />
        </View>

        <View style={styles.inputGroup}>
          <Shield color="#9ca3af" size={20} style={styles.icon} />
          <TextInput style={styles.input} placeholder="Unique Access Code (e.g. GV123)" value={code} onChangeText={setCode} autoCapitalize="characters" />
        </View>

        <View style={styles.inputGroup}>
          <Hash color="#9ca3af" size={20} style={styles.icon} />
          <TextInput style={styles.input} placeholder="Total Flats / Units" value={totalFlats} onChangeText={setTotalFlats} keyboardType="numeric" />
        </View>

        <TouchableOpacity style={styles.submitBtn} onPress={handleAddSociety} disabled={loading}>
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitBtnText}>Add Society Platform</Text>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 24, paddingTop: 60, backgroundColor: '#fff' },
  backBtn: { marginRight: 15 },
  title: { fontSize: 24, fontWeight: '800', color: '#1f2937' },
  formCard: { margin: 24, padding: 24, backgroundColor: '#fff', borderRadius: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  inputGroup: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f3f4f6', borderRadius: 12, marginBottom: 16, paddingHorizontal: 15 },
  icon: { marginRight: 10 },
  input: { flex: 1, paddingVertical: 15, fontSize: 16, color: '#1f2937' },
  submitBtn: { backgroundColor: '#3b82f6', padding: 18, borderRadius: 12, alignItems: 'center', marginTop: 10 },
  submitBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' }
});
