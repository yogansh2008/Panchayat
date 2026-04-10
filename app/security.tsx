import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  ScrollView, FlatList, Alert, ActivityIndicator,
} from 'react-native';
import { auth } from '../lib/firebase';
import { Shield, LogOut, CheckCircle, Clock, X, UserCheck, UserX, AlertCircle } from 'lucide-react-native';
import {
  subscribeTodaysVisitors, logVisitorEntry,
  approveVisitor, denyVisitor, logVisitorExit, COLLECTIONS,
} from '../lib/firestore';

export default function SecurityScreen() {
  const [visitorName, setVisitorName] = useState('');
  const [flatNo, setFlatNo] = useState('');
  const [visitorType, setVisitorType] = useState('Guest');
  const [visitors, setVisitors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = subscribeTodaysVisitors((data) => {
      // Sort: Pending first, then In, then Out / Denied
      const sorted = [...data].sort((a, b) => {
        const priority: Record<string, number> = { Pending: 0, In: 1, Approved: 2, Out: 3, Denied: 4 };
        return (priority[a.status] ?? 5) - (priority[b.status] ?? 5);
      });
      setVisitors(sorted);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const handleEntry = async () => {
    if (!visitorName || !flatNo) {
      Alert.alert('Error', 'Please fill visitor details');
      return;
    }
    try {
      await logVisitorEntry({ name: visitorName, flatNo, type: visitorType });
      Alert.alert('Logged ✓', `${visitorName} entry logged for Flat ${flatNo}`);
      setVisitorName('');
      setFlatNo('');
    } catch {
      Alert.alert('Error', 'Could not log visitor.');
    }
  };

  const statusColor: Record<string, string> = {
    Pending: '#f59e0b', In: '#3b82f6', Approved: '#10b981',
    Out: '#6b7280', Denied: '#ef4444',
  };

  const statusIcon = (status: string) => {
    if (status === 'In' || status === 'Approved') return <CheckCircle color={statusColor[status]} size={18} />;
    if (status === 'Denied') return <UserX color={statusColor[status]} size={18} />;
    if (status === 'Out') return <Clock color={statusColor[status]} size={18} />;
    return <AlertCircle color={statusColor[status]} size={18} />;
  };

  const renderVisitor = ({ item }: any) => (
    <View style={styles.logCard}>
      <View style={styles.logIcon}>{statusIcon(item.status)}</View>
      <View style={styles.logInfo}>
        <Text style={styles.logName}>{item.name}</Text>
        <Text style={styles.logFlat}>Flat {item.flatNo} • {item.type || 'Visitor'}</Text>
        {item.time ? <Text style={styles.logTime}>In: {item.time}{item.exitTime ? `  Out: ${item.exitTime}` : ''}</Text> : null}
      </View>
      <View style={styles.logActions}>
        {(item.status === 'Pending') && (
          <>
            <TouchableOpacity style={styles.approveBtn} onPress={() => approveVisitor(item.id)}>
              <UserCheck color="#fff" size={16} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.denyBtn} onPress={() => denyVisitor(item.id)}>
              <UserX color="#fff" size={16} />
            </TouchableOpacity>
          </>
        )}
        {(item.status === 'In' || item.status === 'Approved') && (
          <TouchableOpacity style={styles.exitBtn} onPress={() => logVisitorExit(item.id)}>
            <Text style={styles.exitText}>Log Exit</Text>
          </TouchableOpacity>
        )}
        <View style={[styles.statusDot, { backgroundColor: statusColor[item.status] || '#aaa' }]} />
      </View>
    </View>
  );

  const inCount = visitors.filter(v => v.status === 'In' || v.status === 'Approved').length;
  const pendingCount = visitors.filter(v => v.status === 'Pending').length;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Shield color="#1f2937" size={28} />
          <Text style={styles.title}> Security Gate</Text>
        </View>
        <TouchableOpacity onPress={() => auth.signOut()}>
          <LogOut color="#ef4444" size={24} />
        </TouchableOpacity>
      </View>

      {/* Live counters */}
      <View style={styles.statsRow}>
        <View style={styles.statBox}>
          <Text style={[styles.statNum, { color: '#3b82f6' }]}>{inCount}</Text>
          <Text style={styles.statLabel}>Inside</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={[styles.statNum, { color: '#f59e0b' }]}>{pendingCount}</Text>
          <Text style={styles.statLabel}>Pending</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={[styles.statNum, { color: '#10b981' }]}>{visitors.length}</Text>
          <Text style={styles.statLabel}>Total Today</Text>
        </View>
      </View>

      <ScrollView>
        {/* Entry Form */}
        <View style={styles.entryBox}>
          <Text style={styles.sectionTitle}>Log Visitor Entry</Text>

          {/* Visitor Type Tabs */}
          <View style={styles.typeRow}>
            {['Guest', 'Delivery', 'Worker', 'Cab'].map(t => (
              <TouchableOpacity
                key={t}
                style={[styles.typeBtn, visitorType === t && styles.typeBtnActive]}
                onPress={() => setVisitorType(t)}>
                <Text style={[styles.typeText, visitorType === t && styles.typeTextActive]}>{t}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <TextInput
            style={styles.input}
            placeholder="Visitor Name / Company"
            value={visitorName}
            onChangeText={setVisitorName}
          />
          <TextInput
            style={styles.input}
            placeholder="Destination Flat No. (e.g. A-101)"
            value={flatNo}
            onChangeText={setFlatNo}
          />
          <TouchableOpacity style={styles.entryBtn} onPress={handleEntry}>
            <Text style={styles.entryBtnText}>✓ Log Entry</Text>
          </TouchableOpacity>
        </View>

        {/* Live Visitor Log */}
        <Text style={[styles.sectionTitle, { marginHorizontal: 24, marginBottom: 8 }]}>
          Today's Visitor Log ({visitors.length})
        </Text>
        {loading
          ? <ActivityIndicator color="#3b82f6" style={{ marginTop: 20 }} />
          : visitors.length === 0
            ? <Text style={styles.emptyText}>No visitors logged today.</Text>
            : visitors.map(item => <View key={item.id}>{renderVisitor({ item })}</View>)
        }
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container:       { flex: 1, backgroundColor: '#f9fafb' },
  header:          { padding: 24, paddingTop: 60, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  title:           { fontSize: 24, fontWeight: 'bold', color: '#1f2937', marginLeft: 8 },
  statsRow:        { flexDirection: 'row', backgroundColor: '#fff', marginBottom: 4 },
  statBox:         { flex: 1, alignItems: 'center', paddingVertical: 16, borderRightWidth: 1, borderColor: '#f3f4f6' },
  statNum:         { fontSize: 24, fontWeight: '800' },
  statLabel:       { fontSize: 12, color: '#6b7280', marginTop: 4, fontWeight: '600' },
  entryBox:        { margin: 20, backgroundColor: '#fff', padding: 20, borderRadius: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.04, shadowRadius: 10, elevation: 2 },
  sectionTitle:    { fontSize: 18, fontWeight: 'bold', color: '#1f2937', marginBottom: 15 },
  typeRow:         { flexDirection: 'row', marginBottom: 16 },
  typeBtn:         { flex: 1, padding: 10, backgroundColor: '#f3f4f6', borderRadius: 10, alignItems: 'center', marginRight: 6 },
  typeBtnActive:   { backgroundColor: '#3b82f6' },
  typeText:        { fontWeight: '600', color: '#6b7280', fontSize: 13 },
  typeTextActive:  { color: '#fff' },
  input:           { backgroundColor: '#f3f4f6', padding: 15, borderRadius: 14, marginBottom: 12, fontSize: 16 },
  entryBtn:        { backgroundColor: '#3b82f6', padding: 16, borderRadius: 14, alignItems: 'center' },
  entryBtnText:    { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  logCard:         { backgroundColor: '#fff', marginHorizontal: 20, marginBottom: 10, padding: 16, borderRadius: 18, flexDirection: 'row', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.03, shadowRadius: 6, elevation: 1 },
  logIcon:         { marginRight: 12 },
  logInfo:         { flex: 1 },
  logName:         { fontSize: 16, fontWeight: 'bold', color: '#1f2937' },
  logFlat:         { fontSize: 13, color: '#6b7280', marginTop: 2 },
  logTime:         { fontSize: 12, color: '#9ca3af', marginTop: 2 },
  logActions:      { flexDirection: 'row', alignItems: 'center' },
  approveBtn:      { backgroundColor: '#10b981', width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center', marginRight: 6 },
  denyBtn:         { backgroundColor: '#ef4444', width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center', marginRight: 6 },
  exitBtn:         { backgroundColor: '#6b7280', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, marginRight: 8 },
  exitText:        { color: '#fff', fontSize: 12, fontWeight: '600' },
  statusDot:       { width: 10, height: 10, borderRadius: 5 },
  emptyText:       { textAlign: 'center', color: '#9ca3af', fontSize: 15, marginTop: 20, fontStyle: 'italic' },
});
