import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, FileText, CheckCircle, Trash2 } from 'lucide-react-native';
import { subscribeSocietyBills, generateBill, payBill, deleteDocument, COLLECTIONS } from '../backend/db/firestore';
import { useAuth } from '../frontend/context/AuthContext';

export default function AdminBillsScreen() {
  const router = useRouter();
  const { profile } = useAuth();
  const societyId = profile?.societyId || '';

  const [bills, setBills] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [month, setMonth] = useState('');
  const [targetFlat, setTargetFlat] = useState('');
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    if (!societyId) return;
    const unsub = subscribeSocietyBills(societyId, (data) => {
      setBills(data);
      setLoading(false);
    });
    return () => unsub();
  }, [societyId]);

  const handleGenerate = async () => {
    if (!title || !amount || !month) return Alert.alert('Required', 'Please fill Title, Amount and Month');
    if (!societyId) return Alert.alert('Error', 'No society linked. Please create a society first.');
    setGenerating(true);
    try {
      await generateBill(societyId, {
        title,
        amount: `₹${amount}`,
        month,
        flatNo: targetFlat.trim() || 'All',
      });
      setTitle(''); setAmount(''); setMonth(''); setTargetFlat('');
      Alert.alert('✅ Success', `Bill generated for ${targetFlat.trim() || 'All Residents'}`);
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Could not generate bill');
    }
    setGenerating(false);
  };

  const statusColor = (s: string) => s === 'Paid' ? '#10b981' : s === 'Overdue' ? '#f59e0b' : '#ef4444';

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft color="#1f2937" size={24} />
        </TouchableOpacity>
        <View>
          <Text style={styles.title}>Generate Bills</Text>
          <Text style={styles.subtitle}>{bills.length} invoices issued</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Issue New Invoice</Text>
          <TextInput style={styles.input} placeholder="Bill Title (e.g. Maintenance)" value={title} onChangeText={setTitle} />
          <TextInput style={styles.input} placeholder="Amount (numbers only)" value={amount} onChangeText={setAmount} keyboardType="numeric" />
          <TextInput style={styles.input} placeholder="Billing Month (e.g. November 2026)" value={month} onChangeText={setMonth} />
          <TextInput style={styles.input} placeholder="Target Flat (leave blank for ALL flats)" value={targetFlat} onChangeText={setTargetFlat} />
          <TouchableOpacity style={styles.submitBtn} onPress={handleGenerate} disabled={generating}>
            {generating ? <ActivityIndicator color="#fff" /> : (
              <>
                <FileText color="#fff" size={18} />
                <Text style={styles.submitText}> Generate Invoice</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionTitle}>Issued Invoices</Text>
        {loading ? (
          <ActivityIndicator color="#0d9488" size="large" style={{ marginTop: 40 }} />
        ) : bills.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyText}>No bills issued yet.</Text>
            <Text style={styles.emptyHint}>Generate the first invoice above ↑</Text>
          </View>
        ) : bills.map(b => (
          <View key={b.id} style={styles.billCard}>
            <View style={{ flex: 1 }}>
              <Text style={styles.bTitle}>{b.title} — {b.month}</Text>
              <Text style={styles.bFlat}>To: {b.flatNo || 'All Residents'}</Text>
              <Text style={styles.bDue}>Due: {b.duedate}</Text>
              <View style={[styles.statusBadge, { backgroundColor: statusColor(b.status) + '20' }]}>
                <Text style={[styles.statusText, { color: statusColor(b.status) }]}>{b.status}</Text>
              </View>
            </View>
            <View style={{ alignItems: 'flex-end', justifyContent: 'space-between' }}>
              <Text style={styles.bAmount}>{b.amount}</Text>
              {b.status !== 'Paid' && (
                <TouchableOpacity style={styles.markBtn} onPress={() => payBill(b.id)}>
                  <CheckCircle color="#fff" size={14} />
                  <Text style={styles.markText}> Mark Paid</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity onPress={() => deleteDocument(COLLECTIONS.BILLS, b.id)} style={{ marginTop: 8 }}>
                <Trash2 color="#ef444480" size={18} />
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container:   { flex: 1, backgroundColor: '#f9fafb' },
  header:      { flexDirection: 'row', alignItems: 'center', padding: 24, paddingTop: 60, backgroundColor: '#fff', borderBottomColor: '#f3f4f6', borderBottomWidth: 1 },
  backBtn:     { marginRight: 15 },
  title:       { fontSize: 22, fontWeight: '700', color: '#1f2937' },
  subtitle:    { fontSize: 12, color: '#9ca3af', marginTop: 2 },
  scroll:      { padding: 20 },
  card:        { backgroundColor: '#fff', padding: 24, borderRadius: 24, marginBottom: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.04, shadowRadius: 12, elevation: 2 },
  cardTitle:   { fontSize: 17, fontWeight: '700', color: '#1f2937', marginBottom: 16 },
  input:       { backgroundColor: '#f9fafb', borderWidth: 1, borderColor: '#e5e7eb', padding: 14, borderRadius: 14, marginBottom: 12, fontSize: 15 },
  submitBtn:   { backgroundColor: '#0d9488', flexDirection: 'row', padding: 16, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginTop: 5 },
  submitText:  { color: '#fff', fontSize: 15, fontWeight: '700' },
  sectionTitle:{ fontSize: 18, fontWeight: '700', color: '#1f2937', marginBottom: 12 },
  billCard:    { backgroundColor: '#fff', flexDirection: 'row', padding: 18, borderRadius: 20, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 8, elevation: 1 },
  bTitle:      { fontSize: 15, fontWeight: '700', color: '#1f2937' },
  bFlat:       { fontSize: 13, color: '#6b7280', marginTop: 4 },
  bDue:        { fontSize: 12, color: '#9ca3af', marginTop: 2 },
  statusBadge: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, marginTop: 8 },
  statusText:  { fontSize: 12, fontWeight: '700' },
  bAmount:     { fontSize: 18, fontWeight: '800', color: '#1f2937' },
  markBtn:     { flexDirection: 'row', backgroundColor: '#10b981', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, marginTop: 10, alignItems: 'center' },
  markText:    { color: '#fff', fontSize: 12, fontWeight: '700' },
  emptyBox:    { alignItems: 'center', paddingVertical: 48 },
  emptyText:   { fontSize: 16, fontWeight: '600', color: '#6b7280' },
  emptyHint:   { fontSize: 13, color: '#9ca3af', marginTop: 6 },
});
