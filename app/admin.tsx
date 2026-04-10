import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, Users, FileText, AlertOctagon, TrendingUp, TrendingDown, Settings, DollarSign, Wrench, Building, Calendar, Megaphone, LogOut, BookOpen, UserPlus, Clock, MessageSquare } from 'lucide-react-native';
import { auth } from '../lib/firebase';
import { subscribeAdminStats, subscribeToData, subscribePendingResidents, COLLECTIONS } from '../lib/firestore';
import { useAuth } from '../context/AuthContext';

export default function AdminDashboardScreen() {
  const router = useRouter();
  const { profile } = useAuth();
  const [stats, setStats] = useState({ residents: 0, pendingBills: 0, openComplaints: 0 });
  const [income, setIncome] = useState(0);
  const [expenses, setExpenses] = useState(0);
  const [loading, setLoading] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    const unsubStats = subscribeAdminStats((s) => { setStats(s); setLoading(false); });
    const unsubFunds = subscribeToData(COLLECTIONS.FUNDS, (data) => {
      setIncome(data.filter(f => f.type === 'income').reduce((a, c) => a + (c.amount || 0), 0));
      setExpenses(data.filter(f => f.type === 'expense').reduce((a, c) => a + (c.amount || 0), 0));
    });
    return () => { unsubStats(); unsubFunds(); };
  }, []);

  useEffect(() => {
    if (!profile?.societyCode) return;
    const unsub = subscribePendingResidents(profile.societyCode, (data) => setPendingCount(data.length));
    return () => unsub();
  }, [profile?.societyCode]);

  const AdminCard = ({ title, value, icon: Icon, color }: any) => (
    <View style={styles.card}>
      <View style={[styles.iconBox, { backgroundColor: color + '20' }]}>
        <Icon color={color} size={24} />
      </View>
      <Text style={styles.cardValue}>{loading ? '...' : value}</Text>
      <Text style={styles.cardTitle}>{title}</Text>
    </View>
  );

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Admin Dashboard</Text>
          {profile?.societyCode && (
            <Text style={styles.societyCode}>Society Code: <Text style={styles.codeVal}>{profile.societyCode}</Text></Text>
          )}
        </View>
        <TouchableOpacity onPress={() => auth.signOut()}>
          <LogOut color="#ef4444" size={24} />
        </TouchableOpacity>
      </View>

      {/* Live Finance Card */}
      <View style={styles.accountingBox}>
        <Text style={styles.accountingTitle}>Society Funds — Live</Text>
        <View style={styles.accountingRow}>
          <View style={styles.accountingCol}>
            <TrendingUp color="#10b981" size={20} />
            <Text style={styles.accountingLabel}>Income</Text>
            <Text style={styles.accountingVal}>₹{income.toLocaleString()}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.accountingCol}>
            <TrendingDown color="#ef4444" size={20} />
            <Text style={styles.accountingLabel}>Expenses</Text>
            <Text style={styles.accountingVal}>₹{expenses.toLocaleString()}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.accountingCol}>
            <DollarSign color="#f59e0b" size={20} />
            <Text style={styles.accountingLabel}>Balance</Text>
            <Text style={[styles.accountingVal, { color: income - expenses >= 0 ? '#10b981' : '#ef4444' }]}>
              ₹{(income - expenses).toLocaleString()}
            </Text>
          </View>
        </View>
      </View>

      {/* Live Stat Grid */}
      <Text style={styles.sectionTitle}>Live Overview</Text>
      <View style={styles.grid}>
        <AdminCard title="Total Residents"  value={stats.residents}       icon={Users}         color="#3b82f6" />
        <AdminCard title="Unpaid Bills"     value={stats.pendingBills}    icon={FileText}      color="#f59e0b" />
        <AdminCard title="Open Complaints"  value={stats.openComplaints}  icon={AlertOctagon}  color="#ef4444" />
        <AdminCard title="Society Rules"    value="—"                     icon={Settings}      color="#8b5cf6" />
      </View>

      <Text style={styles.sectionTitle}>Management</Text>
      <View style={styles.actionGrid}>
        {[
          { icon: Building,      label: 'Society Setup',       route: '/admin-society',       badge: 0 },
          { icon: Clock,         label: 'Pending Requests',    route: '/admin-requests',      badge: pendingCount },
          { icon: Users,         label: 'Residents',           route: '/admin-residents',     badge: 0 },
          { icon: UserPlus,      label: 'Add Provider',        route: '/admin-add-provider',  badge: 0 },
          { icon: Calendar,      label: 'Events',              route: '/admin-events',        badge: 0 },
          { icon: AlertOctagon,  label: 'Complaints',          route: '/admin-complaints',    badge: stats.openComplaints },
          { icon: FileText,      label: 'Generate Bills',      route: '/admin-bills',         badge: stats.pendingBills },
          { icon: DollarSign,    label: 'Funds Ledger',        route: '/admin-funds',         badge: 0 },
          { icon: BookOpen,      label: 'AI Guidelines',       route: '/admin-guidelines',    badge: 0 },
          { icon: Megaphone,     label: 'Post Notice',         route: '/admin-notices',       badge: 0 },
        ].map(({ icon: Icon, label, route, badge }) => (
          <TouchableOpacity key={label} style={styles.actionBlock} onPress={() => router.push(route as any)}>
            <Icon color="#0d9488" size={26} />
            {badge > 0 && (
              <View style={styles.actionBadge}><Text style={styles.actionBadgeText}>{badge}</Text></View>
            )}
            <Text style={styles.actionBlockText}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container:       { flex: 1, backgroundColor: '#f9fafb' },
  header:          { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 24, paddingTop: 60, backgroundColor: '#fff' },
  title:           { fontSize: 22, fontWeight: '700', color: '#1f2937' },
  societyCode:     { fontSize: 12, color: '#6b7280', marginTop: 2 },
  codeVal:         { fontWeight: '800', color: '#0d9488', letterSpacing: 1 },
  accountingBox:   { backgroundColor: '#111827', margin: 24, padding: 24, borderRadius: 28, shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.12, shadowRadius: 16, elevation: 6 },
  accountingTitle: { color: '#9ca3af', fontSize: 13, fontWeight: '600', marginBottom: 18 },
  accountingRow:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  accountingCol:   { flex: 1, alignItems: 'center' },
  accountingLabel: { color: '#d1d5db', marginTop: 5, fontSize: 12 },
  accountingVal:   { color: '#fff', fontSize: 20, fontWeight: '700', marginTop: 5 },
  divider:         { width: 1, height: 50, backgroundColor: '#374151' },
  sectionTitle:    { paddingHorizontal: 24, fontSize: 18, fontWeight: '700', color: '#1f2937', marginBottom: 12, marginTop: 4 },
  grid:            { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 20 },
  card:            { width: '45%', backgroundColor: '#fff', margin: '2.5%', padding: 20, borderRadius: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 10, elevation: 2 },
  iconBox:         { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center', marginBottom: 15 },
  cardValue:       { fontSize: 24, fontWeight: '800', color: '#1f2937' },
  cardTitle:       { color: '#6b7280', fontSize: 13, fontWeight: '500', marginTop: 5 },
  actionGrid:      { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 20, marginTop: 4, paddingBottom: 30 },
  actionBlock:     { width: '45%', backgroundColor: '#fff', margin: '2.5%', padding: 20, borderRadius: 24, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 10, elevation: 2, position: 'relative' },
  actionBlockText: { color: '#4b5563', fontWeight: '600', marginTop: 10, textAlign: 'center', fontSize: 13 },
  actionBadge:     { position: 'absolute', top: 10, right: 10, backgroundColor: '#ef4444', width: 22, height: 22, borderRadius: 11, justifyContent: 'center', alignItems: 'center' },
  actionBadgeText: { color: '#fff', fontSize: 11, fontWeight: '800' },
});
