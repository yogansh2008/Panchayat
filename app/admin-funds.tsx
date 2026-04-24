import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, DollarSign, TrendingUp, TrendingDown } from 'lucide-react-native';
import { subscribeFundEntries, addFundEntry } from '../backend/db/firestore';
import { useAuth } from '../frontend/context/AuthContext';

export default function AdminFundsScreen() {
  const router = useRouter();
  const { profile } = useAuth();
  const societyId = profile?.societyId || '';
  const [funds, setFunds] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [desc, setDesc] = useState('');
  const [amount, setAmount] = useState('');
  const [type, setType] = useState<'income' | 'expense'>('income');

  useEffect(() => {
    if (!societyId) return;
    const unsub = subscribeFundEntries(societyId, (data) => {
      setFunds(data);
      setLoading(false);
    });
    return () => unsub();
  }, [societyId]);

  const handleAdd = async () => {
    if (!desc || !amount) return Alert.alert('Required', 'Please fill description and amount');
    if (!societyId) return Alert.alert('Error', 'No society linked.');
    try {
      await addFundEntry(societyId, { description: desc, amount: parseFloat(amount), type });
      setDesc(''); setAmount('');
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Could not submit ledger entry');
    }
  };

  const totalIncome = funds.filter(f => f.type === 'income').reduce((acc, curr) => acc + (curr.amount || 0), 0);
  const totalExpense = funds.filter(f => f.type === 'expense').reduce((acc, curr) => acc + (curr.amount || 0), 0);
  const balance = totalIncome - totalExpense;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft color="#1f2937" size={24} />
        </TouchableOpacity>
        <Text style={styles.title}>Funds Ledgers</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>Current Balance</Text>
          <Text style={styles.balanceVal}>₹{balance.toLocaleString()}</Text>
          <View style={styles.bRow}>
            <View style={styles.bCol}>
              <TrendingUp color="#10b981" size={16} /><Text style={styles.bText}> In: ₹{totalIncome.toLocaleString()}</Text>
            </View>
            <View style={styles.bCol}>
              <TrendingDown color="#ef4444" size={16} /><Text style={styles.bText}> Out: ₹{totalExpense.toLocaleString()}</Text>
            </View>
          </View>
        </View>

        <View style={styles.addCard}>
          <Text style={styles.cardTitle}>New Ledger Entry</Text>
          <View style={styles.toggleRow}>
            <TouchableOpacity style={[styles.toggleBtn, type === 'income' && { backgroundColor: '#10b981' }]} onPress={() => setType('income')}>
              <Text style={[styles.toggleText, type === 'income' && { color: '#fff' }]}>Income</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.toggleBtn, type === 'expense' && { backgroundColor: '#ef4444' }]} onPress={() => setType('expense')}>
              <Text style={[styles.toggleText, type === 'expense' && { color: '#fff' }]}>Expense</Text>
            </TouchableOpacity>
          </View>
          <TextInput style={styles.input} placeholder="Amount (e.g. 5000)" value={amount} onChangeText={setAmount} keyboardType="numeric" />
          <TextInput style={styles.input} placeholder="Description (e.g. Pump Repair)" value={desc} onChangeText={setDesc} />
          <TouchableOpacity style={styles.submitBtn} onPress={handleAdd}>
            <Text style={styles.submitText}>Add to Ledger</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionTitle}>Transaction History</Text>
        {loading ? <ActivityIndicator color="#0d9488" /> : funds.map(f => (
          <View key={f.id} style={styles.transCard}>
            <View style={[styles.iconBox, f.type === 'expense' ? { backgroundColor: '#fee2e2' } : { backgroundColor: '#d1fae5' }]}>
              {f.type === 'expense' ? <TrendingDown color="#ef4444" /> : <TrendingUp color="#10b981" />}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.transDesc}>{f.description}</Text>
              <Text style={styles.transDate}>{f.date ? new Date(f.date).toLocaleDateString() : 'Recent'}</Text>
            </View>
            <Text style={[styles.transAmount, f.type === 'expense' ? { color: '#ef4444' } : { color: '#10b981' }]}>
              {f.type === 'expense' ? '-' : '+'}₹{f.amount?.toLocaleString()}
            </Text>
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
  balanceCard: { backgroundColor: '#111827', padding: 24, borderRadius: 32, alignItems: 'center', marginBottom: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.1, shadowRadius: 20, elevation: 10 },
  balanceLabel: { color: '#9ca3af', fontSize: 15, fontWeight: '600' },
  balanceVal: { color: '#fff', fontSize: 36, fontWeight: 'bold', marginVertical: 10 },
  bRow: { flexDirection: 'row', justifyContent: 'space-around', width: '100%', marginTop: 10 },
  bCol: { flexDirection: 'row', alignItems: 'center' },
  bText: { color: '#e5e7eb', fontSize: 14, fontWeight: '600' },
  addCard: { backgroundColor: '#fff', padding: 24, borderRadius: 24, marginBottom: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.03, shadowRadius: 10, elevation: 2 },
  cardTitle: { fontSize: 18, fontWeight: '600', color: '#1f2937', marginBottom: 15 },
  toggleRow: { flexDirection: 'row', marginBottom: 15 },
  toggleBtn: { flex: 1, padding: 12, alignItems: 'center', backgroundColor: '#f3f4f6', borderRadius: 12, marginHorizontal: 5 },
  toggleText: { fontWeight: '700', color: '#6b7280' },
  input: { backgroundColor: '#f3f4f6', padding: 15, borderRadius: 16, marginBottom: 12, fontSize: 16 },
  submitBtn: { backgroundColor: '#0d9488', padding: 16, borderRadius: 16, alignItems: 'center', marginTop: 5 },
  submitText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#1f2937', marginBottom: 15, marginLeft: 5 },
  transCard: { backgroundColor: '#fff', flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 20, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.02, shadowRadius: 8, elevation: 1 },
  iconBox: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  transDesc: { fontSize: 16, fontWeight: '600', color: '#1f2937' },
  transDate: { fontSize: 13, color: '#6b7280', marginTop: 2 },
  transAmount: { fontSize: 16, fontWeight: 'bold' }
});
