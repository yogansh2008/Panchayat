import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, FlatList, ScrollView, ActivityIndicator } from 'react-native';
import { Megaphone, Calendar, AlertOctagon } from 'lucide-react-native';
import { fetchData, subscribeToData, COLLECTIONS } from '../../lib/firestore';

export default function CommunityScreen() {
  const [tab, setTab] = useState<'notices' | 'events' | 'complaints'>('notices');
  const [notices, setNotices] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [complaints, setComplaints] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = 3;
    const checkLoading = () => { active -= 1; if (active === 0) setLoading(false); };
    
    const unsubNotices = subscribeToData(COLLECTIONS.NOTICES, (d) => { setNotices(d); checkLoading(); });
    const unsubEvents = subscribeToData(COLLECTIONS.EVENTS, (d) => { setEvents(d); checkLoading(); });
    const unsubComplaints = subscribeToData(COLLECTIONS.COMPLAINTS, (d) => { setComplaints(d); checkLoading(); });
    
    return () => { unsubNotices(); unsubEvents(); unsubComplaints(); };
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Community</Text>
      </View>

      <View style={styles.tabRow}>
        <TouchableOpacity style={[styles.tabBtn, tab === 'notices' && styles.activeTab]} onPress={() => setTab('notices')}>
          <Text style={[styles.tabText, tab === 'notices' && styles.activeTabText]}>Notices</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tabBtn, tab === 'events' && styles.activeTab]} onPress={() => setTab('events')}>
          <Text style={[styles.tabText, tab === 'events' && styles.activeTabText]}>Events</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tabBtn, tab === 'complaints' && styles.activeTab]} onPress={() => setTab('complaints')}>
          <Text style={[styles.tabText, tab === 'complaints' && styles.activeTabText]}>Complaints</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {tab === 'notices' && notices.map(item => (
          <View key={item.id} style={styles.card}>
            <View style={styles.cardHeader}>
              <Megaphone color="#3b82f6" size={24} />
              <Text style={styles.dateText}>{item.date}</Text>
            </View>
            <Text style={styles.cardTitle}>{item.title}</Text>
            <Text style={styles.cardDesc}>{item.desc}</Text>
          </View>
        ))}

        {tab === 'events' && events.map(item => (
          <View key={item.id} style={styles.card}>
             <View style={styles.cardHeader}>
              <Calendar color="#10b981" size={24} />
              <Text style={styles.dateText}>{item.date}</Text>
            </View>
            <Text style={styles.cardTitle}>{item.title}</Text>
            <Text style={styles.cardDesc}>{item.desc}</Text>
            <TouchableOpacity style={styles.joinBtn} onPress={() => alert('Successfully joined the event!')}>
               <Text style={styles.joinText}>Join Event</Text>
            </TouchableOpacity>
          </View>
        ))}

        {tab === 'complaints' && complaints.map(item => (
          <View key={item.id} style={styles.card}>
            <View style={styles.cardHeader}>
              <AlertOctagon color="#f59e0b" size={24} />
              <View style={styles.statusBadge}><Text style={styles.statusText}>{item.status}</Text></View>
            </View>
            <Text style={styles.cardTitle}>{item.title}</Text>
            <Text style={styles.cardDesc}>{item.anonymous ? 'Reported Anonymously' : 'Reported by Resident'}</Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  header: { padding: 24, paddingTop: 60, backgroundColor: '#fff' },
  title: { fontSize: 28, fontWeight: '800', color: '#1f2937' },
  tabRow: { flexDirection: 'row', backgroundColor: '#fff', paddingHorizontal: 24, paddingBottom: 15 },
  tabBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  activeTab: { borderBottomColor: '#10b981' },
  tabText: { fontWeight: '600', color: '#9ca3af' },
  activeTabText: { color: '#10b981' },
  content: { padding: 24 },
  card: { backgroundColor: '#fff', padding: 20, borderRadius: 20, marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  dateText: { color: '#6b7280', fontWeight: 'bold' },
  cardTitle: { fontSize: 18, fontWeight: '700', color: '#1f2937', marginBottom: 8 },
  cardDesc: { color: '#6b7280', lineHeight: 22 },
  joinBtn: { marginTop: 16, backgroundColor: '#ecfdf5', padding: 12, borderRadius: 12, alignItems: 'center' },
  joinText: { color: '#10b981', fontWeight: 'bold' },
  statusBadge: { backgroundColor: '#fef3c7', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  statusText: { color: '#b45309', fontWeight: 'bold', fontSize: 12 }
});
