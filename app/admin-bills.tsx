import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, FileText, CheckCircle } from 'lucide-react-native';
import { subscribeToData, addDocument, COLLECTIONS } from '../lib/firestore';
import { db } from '../lib/firebase';
import { doc, updateDoc } from 'firebase/firestore';

export default function AdminBillsScreen() {
  const router = useRouter();
  const [bills, setBills] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [month, setMonth] = useState('');
  const [targetFlat, setTargetFlat] = useState('');

  useEffect(() => {
    const unsub = subscribeToData(COLLECTIONS.BILLS, (data) => {
      setBills(data);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const handleGenerate = async () => {
    if (!title || !amount || !month) return Alert.alert("Required", "Please fill Title, Amount and Month");
    try {
      await addDocument(COLLECTIONS.BILLS, { 
        title, 
        amount: `₹${amount}`, 
        month, 
        targetFlat: targetFlat || 'All Residents',
        status: 'Unpaid',
        duedate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toLocaleDateString() // 15 days
      });
      setTitle(''); setAmount(''); setMonth(''); setTargetFlat('');
      Alert.alert("Success", "Bill invoice successfully generated.");
    } catch {
      Alert.alert("Error", "Could not generate invoice");
    }
  };

  const markPaid = async (id: string) => {
    await updateDoc(doc(db, COLLECTIONS.BILLS, id), { status: 'Paid', date: new Date().toLocaleDateString() });
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft color="#1f2937" size={24} />
        </TouchableOpacity>
        <Text style={styles.title}>Generate Bills</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Issue New Invoice</Text>
          <TextInput style={styles.input} placeholder="Bill Title (e.g. Maintenance)" value={title} onChangeText={setTitle} />
          <TextInput style={styles.input} placeholder="Amount" value={amount} onChangeText={setAmount} keyboardType="numeric" />
          <TextInput style={styles.input} placeholder="Billing Month (e.g. November 2026)" value={month} onChangeText={setMonth} />
          <TextInput style={styles.input} placeholder="Target Flat (Leave empty for ALL)" value={targetFlat} onChangeText={setTargetFlat} />
          
          <TouchableOpacity style={styles.submitBtn} onPress={handleGenerate}>
            <FileText color="#fff" size={20} />
            <Text style={styles.submitText}> Generate Invoice</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionTitle}>Issued Invoices</Text>
        {loading ? <ActivityIndicator color="#0d9488" /> : bills.map(b => (
          <View key={b.id} style={styles.billCard}>
            <View style={{ flex: 1 }}>
              <Text style={styles.bTitle}>{b.title} - {b.month}</Text>
              <Text style={styles.bFlat}>To: {b.targetFlat || 'All Residents'}</Text>
              <Text style={[styles.bStatus, b.status === 'Paid' ? { color: '#10b981' } : { color: '#ef4444' }]}>
                {b.status} {b.date && `on ${b.date}`}
              </Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={styles.bAmount}>{b.amount}</Text>
              {b.status === 'Unpaid' && (
                <TouchableOpacity style={styles.markBtn} onPress={() => markPaid(b.id)}>
                  <Text style={styles.markText}>Mark Paid</Text>
                </TouchableOpacity>
              )}
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
  billCard: { backgroundColor: '#fff', flexDirection: 'row', padding: 16, borderRadius: 20, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.02, shadowRadius: 8, elevation: 1 },
  bTitle: { fontSize: 16, fontWeight: '700', color: '#1f2937' },
  bFlat: { fontSize: 13, color: '#6b7280', marginTop: 4 },
  bStatus: { fontSize: 13, fontWeight: 'bold', marginTop: 4 },
  bAmount: { fontSize: 18, fontWeight: 'bold', color: '#1f2937' },
  markBtn: { backgroundColor: '#10b981', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, marginTop: 10 },
  markText: { color: '#fff', fontSize: 12, fontWeight: 'bold' }
});
