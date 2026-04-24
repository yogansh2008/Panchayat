import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, FlatList, ActivityIndicator, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, CheckCircle, Clock, AlertCircle } from 'lucide-react-native';
import { subscribeResidentBills, payBill } from '../backend/db/firestore';
import { useAuth } from '../frontend/context/AuthContext';

export default function BillingScreen() {
  const router = useRouter();
  const { profile } = useAuth();
  const societyId = profile?.societyId || '';
  const flatNo = profile?.flatNo || '';

  const [bills, setBills] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!societyId || !flatNo) { setLoading(false); return; }
    const unsub = subscribeResidentBills(societyId, flatNo, (data) => {
      setBills(data);
      setLoading(false);
    });
    return () => unsub();
  }, [societyId, flatNo]);

  const totalDue = bills.filter(b => b.status !== 'Paid').reduce((sum, b) => {
    const num = parseFloat(b.amount?.replace(/[^0-9.]/g, '') || '0');
    return sum + num;
  }, 0);

  const handlePay = (id: string) => {
    Alert.alert('Confirm Payment', 'Mark this bill as paid?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Pay Now', onPress: () => payBill(id) },
    ]);
  };

  const statusColor = (s: string) => s === 'Paid' ? '#10b981' : s === 'Overdue' ? '#ef4444' : '#f59e0b';
  const statusIcon = (s: string) => s === 'Paid'
    ? <CheckCircle color="#10b981" size={16} />
    : s === 'Overdue'
    ? <AlertCircle color="#ef4444" size={16} />
    : <Clock color="#f59e0b" size={16} />;

  const renderBill = ({ item }: any) => (
    <View style={[styles.card, { borderLeftColor: statusColor(item.status) }]}>
      <View style={styles.cardTop}>
        <View style={{ flex: 1 }}>
          <Text style={styles.billTitle}>{item.title}</Text>
          <Text style={styles.billMonth}>{item.month}</Text>
        </View>
        <Text style={styles.amount}>{item.amount}</Text>
      </View>
      <View style={styles.cardBottom}>
        <View style={styles.statusRow}>
          {statusIcon(item.status)}
          <Text style={[styles.statusMatch, { color: statusColor(item.status) }]}>
            {' '}{item.status} {item.status === 'Paid' ? `on ${item.paidAt}` : `due ${item.duedate}`}
          </Text>
        </View>
        {item.status !== 'Paid' && (
          <TouchableOpacity style={styles.payBtn} onPress={() => handlePay(item.id)}>
            <Text style={styles.payText}>Pay Now</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft color="#1f2937" size={24} />
        </TouchableOpacity>
        <View>
          <Text style={styles.title}>Billing & Payments</Text>
          <Text style={styles.sub}>Flat {flatNo}</Text>
        </View>
      </View>

      <View style={styles.summaryBox}>
        <Text style={styles.summaryTitle}>Total Pending Amount</Text>
        <Text style={styles.summaryAmount}>₹{totalDue.toLocaleString('en-IN')}</Text>
        <Text style={styles.summaryHint}>{bills.filter(b => b.status !== 'Paid').length} bill(s) unpaid</Text>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#10b981" style={{ marginTop: 40 }} />
      ) : bills.length === 0 ? (
        <View style={styles.emptyBox}>
          <CheckCircle color="#10b981" size={48} />
          <Text style={styles.emptyTitle}>All Clear!</Text>
          <Text style={styles.emptyText}>No bills assigned to your flat yet.</Text>
        </View>
      ) : (
        <FlatList
          data={bills}
          keyExtractor={item => item.id}
          renderItem={renderBill}
          contentContainerStyle={styles.list}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container:     { flex: 1, backgroundColor: '#f9fafb' },
  header:        { flexDirection: 'row', alignItems: 'center', padding: 24, paddingTop: 60, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  backBtn:       { marginRight: 15 },
  title:         { fontSize: 22, fontWeight: '800', color: '#1f2937' },
  sub:           { fontSize: 13, color: '#9ca3af', marginTop: 2 },
  summaryBox:    { backgroundColor: '#10b981', margin: 20, padding: 24, borderRadius: 24, alignItems: 'center', shadowColor: '#10b981', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 5 },
  summaryTitle:  { color: '#ecfdf5', fontSize: 15, fontWeight: '600' },
  summaryAmount: { color: '#fff', fontSize: 38, fontWeight: '800', marginTop: 6 },
  summaryHint:   { color: '#d1fae5', fontSize: 13, marginTop: 4 },
  list:          { padding: 20, paddingTop: 4 },
  card:          { backgroundColor: '#fff', padding: 20, borderRadius: 20, marginBottom: 14, borderLeftWidth: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 },
  cardTop:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 },
  billTitle:     { fontSize: 16, fontWeight: '700', color: '#1f2937' },
  billMonth:     { color: '#6b7280', marginTop: 4, fontSize: 13 },
  amount:        { fontSize: 20, fontWeight: '800', color: '#1f2937' },
  cardBottom:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#f3f4f6', paddingTop: 14 },
  statusRow:     { flexDirection: 'row', alignItems: 'center' },
  statusMatch:   { marginLeft: 6, fontWeight: '600', fontSize: 13 },
  payBtn:        { backgroundColor: '#10b981', paddingHorizontal: 20, paddingVertical: 9, borderRadius: 12 },
  payText:       { color: '#fff', fontWeight: '700', fontSize: 14 },
  emptyBox:      { alignItems: 'center', paddingVertical: 72 },
  emptyTitle:    { fontSize: 20, fontWeight: '700', color: '#1f2937', marginTop: 16 },
  emptyText:     { color: '#9ca3af', fontSize: 14, marginTop: 8 },
});
