import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, FlatList, Linking } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, PhoneCall, ShieldAlert, HeartPulse, Flame, Wrench } from 'lucide-react-native';

const CONTACTS = [
  { id: '1', title: 'Main Gate Security', phone: '1234567890', icon: ShieldAlert, color: '#3b82f6' },
  { id: '2', title: 'Ambulance', phone: '102', icon: HeartPulse, color: '#ef4444' },
  { id: '3', title: 'Fire Department', phone: '101', icon: Flame, color: '#f97316' },
  { id: '4', title: 'Emergency Maintenance', phone: '9876543213', icon: Wrench, color: '#f59e0b' },
];

export default function EmergencyScreen() {
  const router = useRouter();

  const renderContact = ({ item }: any) => (
    <View style={styles.card}>
      <View style={styles.cardLeft}>
        <View style={[styles.iconBox, { backgroundColor: item.color + '20' }]}>
          <item.icon color={item.color} size={28} />
        </View>
        <View>
          <Text style={styles.titleText}>{item.title}</Text>
          <Text style={styles.phoneText}>{item.phone}</Text>
        </View>
      </View>
      <TouchableOpacity style={[styles.callBtn, { backgroundColor: item.color }]} onPress={() => Linking.openURL(`tel:${item.phone}`)}>
        <PhoneCall color="#fff" size={20} />
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft color="#1f2937" size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Emergency Contacts</Text>
      </View>

      <FlatList
        data={CONTACTS}
        keyExtractor={item => item.id}
        renderItem={renderContact}
        contentContainerStyle={styles.list}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 24, paddingTop: 60, backgroundColor: '#fff' },
  backBtn: { marginRight: 15 },
  headerTitle: { fontSize: 24, fontWeight: '800', color: '#1f2937' },
  list: { padding: 24 },
  card: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff', padding: 20, borderRadius: 20, marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  cardLeft: { flexDirection: 'row', alignItems: 'center' },
  iconBox: { width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  titleText: { fontSize: 16, fontWeight: '700', color: '#1f2937' },
  phoneText: { color: '#6b7280', marginTop: 4, fontWeight: '600' },
  callBtn: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' }
});
