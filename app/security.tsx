import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, Alert, TextInput,
  ImageBackground
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Shield, LogOut, CheckCircle, XCircle, UserCheck, UserX, ArrowDown, ArrowUp, CheckCircle2 } from 'lucide-react-native';
import { useAuth } from '../frontend/context/AuthContext';
import {
  subscribeGatePasses, approveGatePass, rejectGatePass,
  markEntered, markExited, GatePass, createWalkInPass
} from '../backend/db/gatepass';
import { fetchData, COLLECTIONS } from '../backend/db/firestore';

// ─── Status config ────────────────────────────────────────────────────────────
const STATUS_COLOR: Record<string, string> = {
  Pending:  '#f59e0b',
  'Pending Resident': '#8b5cf6',
  Approved: '#3b82f6',
  Rejected: '#ef4444',
  Entered:  '#10b981',
  Exited:   '#6b7280',
};

export default function SecurityScreen() {
  const { profile, signOut } = useAuth();
  const societyId = profile?.societyId || '';

  const [allPasses, setAllPasses]   = useState<GatePass[]>([]);
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState('');
  const [tab, setTab]               = useState<'active' | 'all'>('active');

  // Walk-in form state
  const [showForm, setShowForm] = useState(false);
  const [visitorName, setVisitorName] = useState('');
  const [phone, setPhone] = useState('');
  const [flatNo, setFlatNo] = useState('');
  const [saving, setSaving] = useState(false);

  const handleCreateWalkIn = async () => {
    if (!flatNo.trim() || !visitorName.trim() || phone.length < 10) {
      return Alert.alert('Error', 'Please enter valid details (10-digit phone).');
    }
    setSaving(true);
    try {
      const users = await fetchData(COLLECTIONS.USERS, [
        { field: 'societyId', op: '==', value: societyId },
        { field: 'flatNo', op: '==', value: flatNo.trim() }
      ]);
      const activeResidents = users.filter((u: any) => u.role === 'Resident' && u.approved === true);
      
      if (activeResidents.length === 0) {
        setSaving(false);
        return Alert.alert('Not Found', `No approved resident found in Flat ${flatNo.trim()}.`);
      }
      
      const resident = activeResidents[0] as any;
      await createWalkInPass({
        visitorName: visitorName.trim(),
        phone: phone.trim(),
        purpose: 'Guest',
        date: new Date().toLocaleDateString('en-IN'),
        entryTime: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
        residentId: resident.id,
        residentName: resident.name,
        flatNumber: resident.flatNo,
        societyId,
      });
      Alert.alert('Success', 'Approval request sent to resident!');
      setShowForm(false);
      setVisitorName(''); setPhone(''); setFlatNo('');
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
    setSaving(false);
  };

  // ── Subscribe to all gate passes for this society ─────────────────────────
  useEffect(() => {
    if (!societyId) { setLoading(false); return; }
    const unsub = subscribeGatePasses(societyId, (data) => {
      setAllPasses(data);
      setLoading(false);
    });
    return () => unsub();
  }, [societyId]);

  // ── Filter logic ──────────────────────────────────────────────────────────
  const today = new Date().toLocaleDateString('en-IN');

  const activePasses = allPasses.filter(p =>
    (p.status === 'Pending' || p.status === 'Pending Resident' || p.status === 'Approved' || p.status === 'Entered') &&
    p.date === today
  );

  const displayPasses = (tab === 'active' ? activePasses : allPasses).filter(p => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      p.visitorName.toLowerCase().includes(q) ||
      p.flatNumber.toLowerCase().includes(q)  ||
      p.phone.includes(q)
    );
  });

  // ── Sort: Pending first, then Approved, then Entered ──────────────────────
  const sorted = [...displayPasses].sort((a, b) => {
    const order: Record<string, number> = { Pending: 0, 'Pending Resident': 1, Approved: 2, Entered: 3, Exited: 4, Rejected: 5 };
    return (order[a.status] ?? 6) - (order[b.status] ?? 6);
  });

  // ── Group by Date ─────────────────────────────────────────────────────────
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
  const groupedData = groupPassesByDate(sorted);

  // ── Stats ─────────────────────────────────────────────────────────────────
  const pendingCount  = allPasses.filter(p => p.status === 'Pending'  && p.date === today).length;
  const insideCount   = allPasses.filter(p => p.status === 'Entered'  && p.date === today).length;
  const approvedCount = allPasses.filter(p => p.status === 'Approved' && p.date === today).length;

  const confirmAction = (label: string, action: () => Promise<void>) => {
    Alert.alert('Confirm', `Mark this pass as "${label}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { 
        text: 'Yes', 
        onPress: async () => {
          try {
            await action();
          } catch (e: any) {
            Alert.alert('Error', e.message || 'Operation failed');
          }
        } 
      },
    ]);
  };

  const handleApproveAll = (date: string, passes: GatePass[]) => {
    const pending = passes.filter(p => p.status === 'Pending' || p.status === 'Pending Resident');
    if (pending.length === 0) return;
    
    Alert.alert('Approve All', `Approve ${pending.length} pending passes for ${date}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Approve All',
        onPress: async () => {
          try {
            await Promise.all(pending.map(p => approveGatePass(p.id)));
          } catch(e: any) {
            Alert.alert('Error', e.message);
          }
        }
      }
    ]);
  };

  return (
    <View style={styles.container}>
      {/* Hero Header */}
      <ImageBackground
        source={require('../frontend/assets/society_banner.png')}
        style={styles.hero}
        resizeMode="cover"
      >
        <LinearGradient colors={['rgba(30,58,138,0.85)', 'rgba(59,130,246,0.95)']} style={styles.heroGrad}>
          <View style={styles.headerTop}>
            <View style={styles.headerRow}>
              <View style={styles.iconBg}><Shield color="#3b82f6" size={24} /></View>
              <View>
                <Text style={styles.headerTitle}>Security Gate</Text>
                <Text style={styles.headerSub}>{profile?.name || 'Guard'} • {today}</Text>
              </View>
            </View>
            <TouchableOpacity onPress={() => Alert.alert('Sign Out', 'Are you sure?', [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Sign Out', style: 'destructive', onPress: signOut },
            ])} style={styles.logoutBtn}>
              <LogOut color="#fff" size={20} />
            </TouchableOpacity>
          </View>
          
          {/* Stats integrated in header */}
          <View style={styles.heroStats}>
             <View style={styles.heroStatBox}>
                <Text style={[styles.heroStatNum, { color: '#fde68a' }]}>{pendingCount}</Text>
                <Text style={styles.heroStatLbl}>Pending</Text>
             </View>
             <View style={styles.heroStatDiv} />
             <View style={styles.heroStatBox}>
                <Text style={[styles.heroStatNum, { color: '#bfdbfe' }]}>{approvedCount}</Text>
                <Text style={styles.heroStatLbl}>Approved</Text>
             </View>
             <View style={styles.heroStatDiv} />
             <View style={styles.heroStatBox}>
                <Text style={[styles.heroStatNum, { color: '#a7f3d0' }]}>{insideCount}</Text>
                <Text style={styles.heroStatLbl}>Inside</Text>
             </View>
          </View>
        </LinearGradient>
      </ImageBackground>



      {/* Tabs */}
      <View style={styles.tabRow}>
        <TouchableOpacity style={[styles.tabBtn, tab === 'active' && styles.tabBtnActive]} onPress={() => setTab('active')}>
          <Text style={[styles.tabText, tab === 'active' && styles.tabTextActive]}>Today's Active</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tabBtn, tab === 'all' && styles.tabBtnActive]} onPress={() => setTab('all')}>
          <Text style={[styles.tabText, tab === 'all' && styles.tabTextActive]}>All Passes</Text>
        </TouchableOpacity>
      </View>

      {/* Search & Action */}
      <View style={styles.searchRow}>
        <TextInput
          style={[styles.searchInput, { flex: 1 }]}
          placeholder="Search by name, flat, or phone…"
          value={search}
          onChangeText={setSearch}
        />
        <TouchableOpacity style={styles.walkInBtn} onPress={() => setShowForm(!showForm)}>
          <Text style={styles.walkInBtnTxt}>{showForm ? 'Cancel' : '+ Walk-in'}</Text>
        </TouchableOpacity>
      </View>

      {/* Walk In Form */}
      {showForm && (
        <View style={styles.formBox}>
           <Text style={styles.formTitle}>Create Walk-in Pass</Text>
           <TextInput style={styles.input} placeholder="Flat Number (e.g. 101)" value={flatNo} onChangeText={setFlatNo} />
           <TextInput style={styles.input} placeholder="Visitor Name" value={visitorName} onChangeText={setVisitorName} />
           <TextInput style={styles.input} placeholder="Phone Number" value={phone} onChangeText={setPhone} keyboardType="phone-pad" maxLength={10} />
           <TouchableOpacity style={styles.submitBtn} onPress={handleCreateWalkIn} disabled={saving}>
             {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitTxt}>Send to Resident</Text>}
           </TouchableOpacity>
        </View>
      )}

      {/* Pass List */}
      <ScrollView contentContainerStyle={styles.list}>
        {loading ? (
          <ActivityIndicator size="large" color="#3b82f6" style={{ marginTop: 60 }} />
        ) : sorted.length === 0 ? (
          <View style={styles.empty}>
            <Shield color="#d1d5db" size={60} />
            <Text style={styles.emptyTitle}>
              {tab === 'active' ? 'No active passes today' : 'No gate passes found'}
            </Text>
          </View>
        ) : (
          groupedData.map(group => {
            const grpPending = group.data.filter(p => p.status === 'Pending' || p.status === 'Pending Resident').length;
            return (
            <View key={group.date}>
              <View style={styles.dateHeaderRow}>
                <Text style={styles.dateHeader}>{group.date === today ? 'Today' : group.date}</Text>
                {grpPending > 0 && (
                  <TouchableOpacity style={styles.approveAllBtn} onPress={() => handleApproveAll(group.date, group.data)}>
                    <CheckCircle2 color="#fff" size={14} style={{ marginRight: 4 }} />
                    <Text style={styles.approveAllTxt}>Approve All ({grpPending})</Text>
                  </TouchableOpacity>
                )}
              </View>
              {group.data.map(pass => {
                const color = STATUS_COLOR[pass.status] || '#9ca3af';
                return (
                  <View key={pass.id} style={[styles.card, { borderLeftColor: color }]}>
                {/* Top */}
                <View style={styles.cardTop}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.visitorName}>{pass.visitorName}</Text>
                    <Text style={styles.visitorSub}>📱 {pass.phone}</Text>
                    <Text style={styles.visitorSub}>🏠 Flat {pass.flatNumber}  •  {pass.purpose}</Text>
                    <Text style={styles.visitorSub}>👤 {pass.residentName}</Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: color + '20' }]}>
                    <Text style={[styles.statusTxt, { color }]}>{pass.status}</Text>
                  </View>
                </View>

                {/* Time info */}
                <View style={styles.timeRow}>
                  <Text style={styles.timeTxt}>📅 {pass.date}</Text>
                  {pass.entryTime !== 'Not specified' && <Text style={styles.timeTxt}>🕐 {pass.entryTime}</Text>}
                  {pass.enteredAt && <Text style={styles.timeTxt}>🟢 In: {pass.enteredAt}</Text>}
                  {pass.exitedAt  && <Text style={styles.timeTxt}>🚶 Out: {pass.exitedAt}</Text>}
                </View>

                {/* Action Buttons */}
                <View style={styles.actions}>
                  {/* Pending → Approve / Reject */}
                  {(pass.status === 'Pending' || pass.status === 'Pending Resident') && (
                    <>
                      <TouchableOpacity
                        style={[styles.actionBtn, { backgroundColor: '#10b981' }]}
                        onPress={() => confirmAction('Approved', () => approveGatePass(pass.id))}
                      >
                        <UserCheck color="#fff" size={16} />
                        <Text style={styles.actionTxt}>Approve</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.actionBtn, { backgroundColor: '#ef4444' }]}
                        onPress={() => confirmAction('Rejected', () => rejectGatePass(pass.id))}
                      >
                        <UserX color="#fff" size={16} />
                        <Text style={styles.actionTxt}>Reject</Text>
                      </TouchableOpacity>
                    </>
                  )}

                  {/* Approved → Mark Entered */}
                  {pass.status === 'Approved' && (
                    <TouchableOpacity
                      style={[styles.actionBtn, { backgroundColor: '#3b82f6' }]}
                      onPress={() => confirmAction('Entered', () => markEntered(pass.id))}
                    >
                      <ArrowDown color="#fff" size={16} />
                      <Text style={styles.actionTxt}>Mark Entered</Text>
                    </TouchableOpacity>
                  )}

                  {/* Entered → Mark Exited */}
                  {pass.status === 'Entered' && (
                    <TouchableOpacity
                      style={[styles.actionBtn, { backgroundColor: '#6b7280' }]}
                      onPress={() => confirmAction('Exited', () => markExited(pass.id))}
                    >
                      <ArrowUp color="#fff" size={16} />
                      <Text style={styles.actionTxt}>Mark Exited</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            );
          })}
            </View>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container:       { flex: 1, backgroundColor: '#f8fafc' },

  hero:            { width: '100%' },
  heroGrad:        { paddingTop: 56, paddingBottom: 24, paddingHorizontal: 20 },
  headerTop:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 },
  headerRow:       { flexDirection: 'row', alignItems: 'center' },
  iconBg:          { backgroundColor: '#fff', width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginRight: 12, shadowColor: '#000', shadowOffset: { width:0, height:4 }, shadowOpacity: 0.1, shadowRadius: 6, elevation: 3 },
  headerTitle:     { color: '#fff', fontSize: 22, fontWeight: '900', letterSpacing: 0.5 },
  headerSub:       { color: 'rgba(255,255,255,0.8)', fontSize: 13, marginTop: 2, fontWeight: '500' },
  logoutBtn:       { backgroundColor: 'rgba(255,255,255,0.2)', padding: 10, borderRadius: 12 },
  
  heroStats:       { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 18, paddingVertical: 16, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  heroStatBox:     { flex: 1, alignItems: 'center' },
  heroStatDiv:     { width: 1, backgroundColor: 'rgba(255,255,255,0.2)', height: 30 },
  heroStatNum:     { fontSize: 24, fontWeight: '900' },
  heroStatLbl:     { color: 'rgba(255,255,255,0.85)', fontSize: 11, fontWeight: '600', marginTop: 4, textTransform: 'uppercase', letterSpacing: 0.5 },

  tabRow:          { flexDirection: 'row', backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f1f5f9', shadowColor: '#000', shadowOffset: { width:0, height:2 }, shadowOpacity: 0.02, shadowRadius: 3, elevation: 1 },
  tabBtn:          { flex: 1, paddingVertical: 12, alignItems: 'center', borderBottomWidth: 3, borderBottomColor: 'transparent' },
  tabBtnActive:    { borderBottomColor: '#3b82f6' },
  tabText:         { color: '#9ca3af', fontWeight: '700' },
  tabTextActive:   { color: '#3b82f6' },

  searchRow:       { backgroundColor: '#fff', paddingHorizontal: 16, paddingVertical: 10, flexDirection: 'row', alignItems: 'center' },
  searchInput:     { backgroundColor: '#f1f5f9', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 10, fontSize: 14 },
  walkInBtn:       { backgroundColor: '#3b82f6', marginLeft: 10, paddingHorizontal: 14, paddingVertical: 12, borderRadius: 10, justifyContent: 'center' },
  walkInBtnTxt:    { color: '#fff', fontWeight: '700', fontSize: 13 },

  formBox:         { backgroundColor: '#fff', marginHorizontal: 16, marginTop: 10, padding: 16, borderRadius: 16, shadowColor: '#000', shadowOpacity: 0.05, shadowOffset: { width:0, height:2}, shadowRadius:8, elevation: 2 },
  formTitle:       { fontSize: 16, fontWeight: '800', marginBottom: 12, color: '#1e293b' },
  input:           { backgroundColor: '#f1f5f9', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, marginBottom: 10, fontSize: 14 },
  submitBtn:       { backgroundColor: '#10b981', paddingVertical: 12, borderRadius: 10, alignItems: 'center', marginTop: 4 },
  submitTxt:       { color: '#fff', fontWeight: '800', fontSize: 14 },

  dateHeaderRow:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, marginBottom: 16, paddingHorizontal: 6 },
  dateHeader:      { fontSize: 16, fontWeight: '800', color: '#64748b' },
  approveAllBtn:   { flexDirection: 'row', backgroundColor: '#10b981', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, alignItems: 'center', shadowColor: '#10b981', shadowOpacity: 0.3, shadowOffset: { width:0, height:2 }, shadowRadius: 4, elevation: 2 },
  approveAllTxt:   { color: '#fff', fontWeight: '700', fontSize: 12 },

  list:            { padding: 16, paddingBottom: 60 },
  empty:           { alignItems: 'center', paddingTop: 80 },
  emptyTitle:      { fontSize: 16, color: '#9ca3af', marginTop: 16, textAlign: 'center' },

  card:            { backgroundColor: '#fff', borderRadius: 18, padding: 16, marginBottom: 14, borderLeftWidth: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3 },
  cardTop:         { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10 },
  visitorName:     { fontSize: 16, fontWeight: '800', color: '#1e293b' },
  visitorSub:      { fontSize: 13, color: '#64748b', marginTop: 3 },
  statusBadge:     { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
  statusTxt:       { fontSize: 12, fontWeight: '800' },
  timeRow:         { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 12 },
  timeTxt:         { fontSize: 12, color: '#94a3b8' },

  actions:         { flexDirection: 'row', gap: 10 },
  actionBtn:       { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12 },
  actionTxt:       { color: '#fff', fontWeight: '700', fontSize: 13 },
});
