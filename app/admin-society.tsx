import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, Alert, ActivityIndicator, Clipboard
} from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, Building, Copy, Plus, Trash2 } from 'lucide-react-native';
import { useAuth } from '../context/AuthContext';
import { createSociety, subscribeToData, subscribeToFloors, addSocietyFloor, deleteDocument, COLLECTIONS, updateDocument } from '../lib/firestore';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

export default function AdminSocietyScreen() {
  const router = useRouter();
  const { user, profile } = useAuth();

  const [society, setSociety] = useState<any>(null);
  const [floors, setFloors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Create form
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [totalFlats, setTotalFlats] = useState('');
  const [creating, setCreating] = useState(false);

  // Floor form
  const [floorNum, setFloorNum] = useState('');
  const [units, setUnits] = useState('');
  const [rent, setRent] = useState('');
  const [addingFloor, setAddingFloor] = useState(false);

  useEffect(() => {
    if (!user) return;
    const unsub = subscribeToData(COLLECTIONS.SOCIETIES, (data) => {
      const mine = data.find(s => s.adminId === user.uid);
      setSociety(mine || null);
      setLoading(false);
    });
    return () => unsub();
  }, [user]);

  useEffect(() => {
    if (!society?.id) return;
    const unsub = subscribeToFloors(society.id, setFloors);
    return () => unsub();
  }, [society?.id]);

  const handleCreate = async () => {
    if (!name || !address || !totalFlats) return Alert.alert('Required', 'Fill all fields');
    setCreating(true);
    try {
      const result = await createSociety({
        name, address,
        adminId: user!.uid,
        totalFlats: parseInt(totalFlats),
      });
      // Store society code in admin's profile
      await setDoc(doc(db, COLLECTIONS.USERS, user!.uid), { societyCode: result.code, societyId: result.id }, { merge: true });
      Alert.alert('🎉 Society Created!', `Your society code is: ${result.code}\n\nShare this with residents.`);
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
    setCreating(false);
  };

  const handleAddFloor = async () => {
    if (!floorNum || !units || !rent) return Alert.alert('Required', 'Fill all floor fields');
    setAddingFloor(true);
    try {
      await addSocietyFloor(society.id, {
        floor: parseInt(floorNum),
        units: parseInt(units),
        rent: parseInt(rent),
      });
      setFloorNum(''); setUnits(''); setRent('');
    } catch (e: any) { Alert.alert('Error', e.message); }
    setAddingFloor(false);
  };

  if (loading) return <View style={styles.center}><ActivityIndicator color="#0d9488" size="large" /></View>;

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 60 }}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft color="#1f2937" size={24} />
        </TouchableOpacity>
        <Text style={styles.title}>Society Setup</Text>
      </View>

      {!society ? (
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Building color="#0d9488" size={24} />
            <Text style={styles.cardTitle}>Create Your Society</Text>
          </View>
          <TextInput style={styles.input} placeholder="Society Name" value={name} onChangeText={setName} />
          <TextInput style={styles.input} placeholder="Full Address" value={address} onChangeText={setAddress} />
          <TextInput style={styles.input} placeholder="Total Flats/Units" value={totalFlats} onChangeText={setTotalFlats} keyboardType="numeric" />
          <TouchableOpacity style={styles.primaryBtn} onPress={handleCreate} disabled={creating}>
            {creating ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>Create Society & Generate Code</Text>}
          </TouchableOpacity>
        </View>
      ) : (
        <>
          {/* Society Info */}
          <View style={styles.codeCard}>
            <Text style={styles.codeLabel}>Society Code — Share with Residents</Text>
            <Text style={styles.code}>{society.code}</Text>
            <Text style={styles.societyName}>{society.name}</Text>
            <Text style={styles.societyAddress}>{society.address}</Text>
            <TouchableOpacity style={styles.copyBtn} onPress={() => {
              Clipboard.setString(society.code);
              Alert.alert('Copied!', `Code "${society.code}" copied to clipboard`);
            }}>
              <Copy color="#0d9488" size={18} />
              <Text style={styles.copyText}>Copy Code</Text>
            </TouchableOpacity>
          </View>

          {/* Add Floor */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Add Floor Details</Text>
            <View style={styles.row}>
              <TextInput style={[styles.input, styles.flex1]} placeholder="Floor No." value={floorNum} onChangeText={setFloorNum} keyboardType="numeric" />
              <TextInput style={[styles.input, styles.flex1, { marginHorizontal: 8 }]} placeholder="Units" value={units} onChangeText={setUnits} keyboardType="numeric" />
              <TextInput style={[styles.input, styles.flex1]} placeholder="Rent ₹" value={rent} onChangeText={setRent} keyboardType="numeric" />
            </View>
            <TouchableOpacity style={styles.primaryBtn} onPress={handleAddFloor} disabled={addingFloor}>
              {addingFloor ? <ActivityIndicator color="#fff" /> : (
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Plus color="#fff" size={18} />
                  <Text style={styles.primaryBtnText}> Add Floor</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>

          {/* Floors List */}
          {floors.length > 0 && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Floor Directory</Text>
              {floors.sort((a, b) => a.floor - b.floor).map(f => (
                <View key={f.id} style={styles.floorRow}>
                  <View style={styles.floorBadge}><Text style={styles.floorBadgeText}>F{f.floor}</Text></View>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={styles.floorTitle}>Floor {f.floor} — {f.units} Units</Text>
                    <Text style={styles.floorRent}>Rent: ₹{f.rent?.toLocaleString()} / month</Text>
                  </View>
                  <TouchableOpacity onPress={() => deleteDocument(COLLECTIONS.SOCIETY_FLOORS, f.id)}>
                    <Trash2 color="#ef4444" size={20} />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 24, paddingTop: 60, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  backBtn: { marginRight: 15 },
  title: { fontSize: 22, fontWeight: '700', color: '#1f2937' },
  card: { backgroundColor: '#fff', margin: 16, padding: 20, borderRadius: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  cardTitle: { fontSize: 17, fontWeight: '700', color: '#1f2937', marginLeft: 8, marginBottom: 12 },
  input: { backgroundColor: '#f3f4f6', padding: 14, borderRadius: 12, marginBottom: 12, fontSize: 15 },
  primaryBtn: { backgroundColor: '#0d9488', padding: 16, borderRadius: 14, alignItems: 'center', marginTop: 4 },
  primaryBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  codeCard: { backgroundColor: '#0d9488', margin: 16, padding: 24, borderRadius: 24, alignItems: 'center' },
  codeLabel: { color: '#ccfbf1', fontSize: 13, fontWeight: '600', marginBottom: 8 },
  code: { color: '#fff', fontSize: 42, fontWeight: '900', letterSpacing: 8, marginBottom: 4 },
  societyName: { color: '#fff', fontSize: 18, fontWeight: '700', marginTop: 8 },
  societyAddress: { color: '#ccfbf1', fontSize: 13, marginTop: 4, textAlign: 'center' },
  copyBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20, marginTop: 16 },
  copyText: { color: '#0d9488', fontWeight: '700', marginLeft: 6 },
  row: { flexDirection: 'row' },
  flex1: { flex: 1 },
  floorRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  floorBadge: { backgroundColor: '#e0f2fe', width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  floorBadgeText: { color: '#0369a1', fontWeight: '800', fontSize: 13 },
  floorTitle: { fontSize: 15, fontWeight: '600', color: '#1f2937' },
  floorRent: { color: '#10b981', fontWeight: '600', marginTop: 2, fontSize: 13 },
});
