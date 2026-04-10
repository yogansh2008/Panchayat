import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, FlatList, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, CheckCircle, Clock } from 'lucide-react-native';
import { fetchData, subscribeToData, COLLECTIONS } from '../lib/firestore';
import { db } from '../lib/firebase';
import { doc, updateDoc } from 'firebase/firestore';

export default function BillingScreen() {
  const router = useRouter();
  const [bills, setBills] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = subscribeToData(COLLECTIONS.BILLS, (data) => {
      setBills(data);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const handlePay = async (id: string) => {
    try {
      await updateDoc(doc(db, COLLECTIONS.BILLS, id), { 
        status: 'Paid', 
        date: new Date().toLocaleDateString() 
      });
      alert('Payment processed successfully!');
    } catch {
      alert('Error processing payment.');
    }
  };

  const renderBill = ({ item }: any) => (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <View>
          <Text style={styles.billTitle}>{item.title}</Text>
          <Text style={styles.billMonth}>{item.month}</Text>
        </View>
        <Text style={styles.amount}>{item.amount}</Text>
      </View>
      <View style={styles.cardBottom}>
        <View style={styles.statusRow}>
          {item.status === 'Paid' ? <CheckCircle color="#10b981" size={16} /> : <Clock color="#f59e0b" size={16} />}
          <Text style={[styles.statusMatch, item.status === 'Paid' ? styles.greenStr : styles.orangeStr]}>
            {item.status} {item.status === 'Paid' ? `on ${item.date}` : `due by ${item.duedate}`}
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
        <Text style={styles.title}>Billing & Payments</Text>
      </View>
      
      <View style={styles.summaryBox}>
        <Text style={styles.summaryTitle}>Total Due</Text>
        <Text style={styles.summaryAmount}>₹2,500</Text>
      </View>

      <FlatList
        data={bills}
        keyExtractor={item => item.id}
        renderItem={renderBill}
        contentContainerStyle={styles.list}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 24, paddingTop: 60, backgroundColor: '#fff' },
  backBtn: { marginRight: 15 },
  title: { fontSize: 24, fontWeight: '800', color: '#1f2937' },
  summaryBox: { backgroundColor: '#10b981', margin: 24, padding: 24, borderRadius: 20, alignItems: 'center', shadowColor: '#10b981', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 5 },
  summaryTitle: { color: '#ecfdf5', fontSize: 16, fontWeight: '600' },
  summaryAmount: { color: '#fff', fontSize: 36, fontWeight: '800', marginTop: 10 },
  list: { padding: 24, paddingTop: 0 },
  card: { backgroundColor: '#fff', padding: 20, borderRadius: 20, marginBottom: 16, borderLeftWidth: 4, borderLeftColor: '#3b82f6', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 15 },
  billTitle: { fontSize: 16, fontWeight: '700', color: '#1f2937' },
  billMonth: { color: '#6b7280', marginTop: 4 },
  amount: { fontSize: 20, fontWeight: '800', color: '#1f2937' },
  cardBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#f3f4f6', paddingTop: 15 },
  statusRow: { flexDirection: 'row', alignItems: 'center' },
  statusMatch: { marginLeft: 6, fontWeight: '600' },
  greenStr: { color: '#10b981' },
  orangeStr: { color: '#f59e0b' },
  payBtn: { backgroundColor: '#10b981', paddingHorizontal: 20, paddingVertical: 8, borderRadius: 12 },
  payText: { color: '#fff', fontWeight: 'bold' }
});
