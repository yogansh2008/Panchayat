import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, Alert, TextInput,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { ArrowLeft, Shield, Search } from 'lucide-react-native';
import { useAuth } from '../frontend/context/AuthContext';
import {
  subscribeGatePasses, approveGatePass, rejectGatePass,
  markEntered, markExited, GatePass,
} from '../backend/db/gatepass';

const STATUS_COLOR: Record<string, string> = {
  Pending:  '#f59e0b',
  Approved: '#3b82f6',
  Rejected: '#ef4444',
  Entered:  '#10b981',
  Exited:   '#6b7280',
};

const FILTERS = ['All', 'Pending', 'Approved', 'Entered', 'Exited', 'Rejected'];

export default function AdminGatePassScreen() {
  const router = useRouter();
  const { profile } = useAuth();
  const societyId = profile?.societyId || '';

  const [passes, setPasses]   = useState<GatePass[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter]   = useState('All');
  const [search, setSearch]   = useState('');

  useEffect(() => {
    if (!societyId) { setLoading(false); return; }
    const unsub = subscribeGatePasses(societyId, (data) => {
      setPasses(data);
      setLoading(false);
    });
    return () => unsub();
  }, [societyId]);

  const filtered = passes
    .filter(p => filter === 'All' || p.status === filter)
    .filter(p => {
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        p.visitorName.toLowerCase().includes(q) ||
        p.flatNumber.toLowerCase().includes(q) ||
        p.residentName.toLowerCase().includes(q) ||
        p.phone.includes(q)
      );
    });

  // Summary counts
  const counts = FILTERS.slice(1).reduce((acc, s) => {
    acc[s] = passes.filter(p => p.status === s).length;
    return acc;
  }, {} as Record<string, number>);

  // Group by Date 
  const groupPassesByDate = (passes: GatePass[]) => {
    const groups: Record<string, GatePass[]> = {};
    passes.forEach(p => {
      const g = p.date || 'Unknown Date';
      if (!groups[g]) groups[g] = [];
      groups[g].push(p);
    });
    const sortedDates = Object.keys(groups).sort((a, b) => {
      const pA = a.split('/');
      const pB = b.split('/');
      if (pA.length === 3 && pB.length === 3) {
        return new Date(`${pB[2]}-${pB[1]}-${pB[0]}`).getTime() - new Date(`${pA[2]}-${pA[1]}-${pA[0]}`).getTime();
      }
      return b.localeCompare(a);
    });
    return sortedDates.map(date => ({ date, data: groups[date] }));
  };
  const groupedData = groupPassesByDate(filtered);

  const confirm = (action: string, fn: () => Promise<void>) => {
    Alert.alert('Confirm', `Mark as "${action}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Yes', onPress: fn },
    ]);
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient colors={['#1e40af', '#3b82f6']} style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft color="#fff" size={22} />
        </TouchableOpacity>
        <View>
          <Text style={styles.headerTitle}>Gate Pass Management</Text>
          <Text style={styles.headerSub}>{passes.length} total passes</Text>
        </View>
      </LinearGradient>

      {/* Summary row */}
      <View style={styles.summaryRow}>
        {Object.entries(counts).map(([s, count]) => (
          <View key={s} style={styles.summaryBox}>
            <Text style={[styles.summaryNum, { color: STATUS_COLOR[s] }]}>{count}</Text>
            <Text style={styles.summaryLabel}>{s}</Text>
          </View>
        ))}
      </View>

      {/* Filter chips */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow} contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 10 }}>
        {FILTERS.map(f => (
          <TouchableOpacity
            key={f}
            style={[styles.chip, filter === f && styles.chipActive]}
            onPress={() => setFilter(f)}
          >
            <Text style={[styles.chipText, filter === f && styles.chipTextActive]}>{f}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Search */}
      <View style={styles.searchBox}>
        <Search color="#9ca3af" size={16} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search name, flat, phone…"
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {/* List */}
      <ScrollView contentContainerStyle={styles.list}>
        {loading ? (
          <ActivityIndicator size="large" color="#3b82f6" style={{ marginTop: 60 }} />
        ) : filtered.length === 0 ? (
          <View style={styles.empty}>
            <Shield color="#d1d5db" size={60} />
            <Text style={styles.emptyText}>No passes found</Text>
          </View>
        ) : (
          groupedData.map(group => (
            <View key={group.date}>
              <Text style={styles.dateHeader}>{group.date}</Text>
              {group.data.map(pass => {
                const color = STATUS_COLOR[pass.status] || '#9ca3af';
                return (
                  <View key={pass.id} style={[styles.card, { borderLeftColor: color }]}>
                    <View style={styles.cardTop}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.visitorName}>{pass.visitorName}</Text>
                        <Text style={styles.detail}>📱 {pass.phone}  •  {pass.purpose}</Text>
                        <Text style={styles.detail}>🏠 Flat {pass.flatNumber}  •  👤 {pass.residentName}</Text>
                        <Text style={styles.detail}>🕐 {pass.entryTime}</Text>
                        {pass.enteredAt && <Text style={styles.detail}>🟢 Entered: {pass.enteredAt}</Text>}
                        {pass.exitedAt  && <Text style={styles.detail}>🚶 Exited: {pass.exitedAt}</Text>}
                      </View>
                      <View style={[styles.statusBadge, { backgroundColor: color + '20' }]}>
                        <Text style={[styles.statusText, { color }]}>{pass.status}</Text>
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container:    { flex: 1, backgroundColor: '#f1f5f9' },
  header:       { flexDirection: 'row', alignItems: 'center', paddingTop: 56, paddingBottom: 20, paddingHorizontal: 20, gap: 14 },
  backBtn:      { padding: 4 },
  headerTitle:  { color: '#fff', fontSize: 18, fontWeight: '800' },
  headerSub:    { color: '#bfdbfe', fontSize: 13, marginTop: 2 },

  summaryRow:   { flexDirection: 'row', backgroundColor: '#fff', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  summaryBox:   { flex: 1, alignItems: 'center' },
  summaryNum:   { fontSize: 20, fontWeight: '900' },
  summaryLabel: { fontSize: 10, color: '#6b7280', fontWeight: '600', marginTop: 2 },

  filterRow:    { backgroundColor: '#fff' },
  chip:         { paddingHorizontal: 14, paddingVertical: 8, backgroundColor: '#f1f5f9', borderRadius: 20, marginRight: 8 },
  chipActive:   { backgroundColor: '#3b82f6' },
  chipText:     { color: '#6b7280', fontWeight: '600', fontSize: 13 },
  chipTextActive: { color: '#fff' },

  searchBox:    { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', marginHorizontal: 16, marginVertical: 10, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 4, gap: 8, borderWidth: 1, borderColor: '#e2e8f0' },
  searchInput:  { flex: 1, fontSize: 14, paddingVertical: 10, color: '#1e293b' },

  list:         { padding: 16, paddingBottom: 60 },
  empty:        { alignItems: 'center', paddingTop: 80 },
  emptyText:    { color: '#9ca3af', marginTop: 16, fontSize: 15 },

  card:         { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 14, borderLeftWidth: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  cardTop:      { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12 },
  visitorName:  { fontSize: 16, fontWeight: '800', color: '#1e293b' },
  detail:       { fontSize: 13, color: '#64748b', marginTop: 3 },
  statusBadge:  { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
  statusText:   { fontSize: 12, fontWeight: '800' },
  dateHeader:   { fontSize: 16, fontWeight: '800', color: '#64748b', marginTop: 10, marginBottom: 12, marginLeft: 6 },
});
