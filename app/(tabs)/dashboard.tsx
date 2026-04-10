import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  TextInput, ActivityIndicator, Alert,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Calendar, FileText, Wrench, Shield, Phone, MessageCircle, Bell, Clock, QrCode } from 'lucide-react-native';
import { subscribeToData, COLLECTIONS, createServiceRequest } from '../../lib/firestore';

export default function HomeScreen() {
  const { profile, user } = useAuth();
  const router = useRouter();
  const [latestNotice, setLatestNotice] = useState<any>(null);
  const [pendingBills, setPendingBills] = useState(0);
  const [openComplaintCount, setOpenComplaintCount] = useState(0);
  const [greeting, setGreeting] = useState('Good Morning');

  useEffect(() => {
    const h = new Date().getHours();
    if (h >= 12 && h < 17) setGreeting('Good Afternoon');
    else if (h >= 17) setGreeting('Good Evening');

    const unsubNotices = subscribeToData(COLLECTIONS.NOTICES, (data) => {
      if (data.length > 0) setLatestNotice(data[0]);
    });

    const unsubBills = subscribeToData(COLLECTIONS.BILLS, (data) => {
      setPendingBills(data.filter(b => b.status !== 'Paid').length);
    });

    const unsubComplaints = subscribeToData(COLLECTIONS.COMPLAINTS, (data) => {
      setOpenComplaintCount(data.filter(c => c.status !== 'Resolved').length);
    });

    return () => { unsubNotices(); unsubBills(); unsubComplaints(); };
  }, []);

  const ActionButton = ({ icon: Icon, title, route, color, badge }: any) => (
    <TouchableOpacity style={styles.actionBtn} onPress={() => router.push(route)}>
      <View style={[styles.iconBox, { backgroundColor: color + '20' }]}>
        <Icon color={color} size={28} />
      </View>
      {badge > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{badge}</Text>
        </View>
      )}
      <Text style={styles.actionText}>{title}</Text>
    </TouchableOpacity>
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 100 }}>
      <LinearGradient colors={['#0d9488', '#0f766e']} style={styles.header}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.greeting}>{greeting},</Text>
            <Text style={styles.name}>{profile?.name || 'Resident'}</Text>
            {profile?.flatNo && <Text style={styles.flatNo}>Flat {profile.flatNo}</Text>}
          </View>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            {profile?.role === 'Admin' && (
              <TouchableOpacity style={styles.adminBadge} onPress={() => router.push('/admin')}>
                <Text style={styles.adminText}>Admin Panel</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Quick Stats */}
        <View style={styles.quickStats}>
          <View style={styles.statItem}>
            <Text style={styles.statNum}>{pendingBills}</Text>
            <Text style={styles.statLabel}>Pending Bills</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statNum}>{openComplaintCount}</Text>
            <Text style={styles.statLabel}>Open Complaints</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.searchBar} onPress={() => router.push('/ai-assistant')}>
          <MessageCircle color="#6b7280" size={20} />
          <Text style={styles.searchText}>Ask Panchayat AI…</Text>
        </TouchableOpacity>
      </LinearGradient>

      {/* Quick Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionGrid}>
          {profile?.role === 'Provider' ? (
            <>
              <ActionButton icon={Wrench}         title="My Requests"    route="/provider"      color="#f59e0b" />
              <ActionButton icon={Shield}          title="Gate Pass"      route="/visitors"      color="#10b981" />
              <ActionButton icon={MessageCircle}   title="AI Assistant"   route="/ai-assistant"  color="#3b82f6" />
            </>
          ) : (
            <>
              <ActionButton icon={Shield}          title="🚪 Gate Pass"    route="/visitors"       color="#10b981" />
              <ActionButton icon={FileText}        title="Pay Bills"      route="/billing"        color="#8b5cf6" badge={pendingBills} />
              <ActionButton icon={Calendar}        title="Book Facility"  route="/bookings"       color="#3b82f6" />
              <ActionButton icon={Wrench}          title="Complaint"      route="/complaints"     color="#f59e0b" badge={openComplaintCount} />
              <ActionButton icon={Phone}           title="Emergency"      route="/emergency"      color="#ef4444" />
              <ActionButton icon={MessageCircle}   title="AI Assistant"   route="/ai-assistant"   color="#0d9488" />
            </>
          )}
        </View>
      </View>

      {/* Latest Notice */}
      <View style={styles.section}>
        <View style={styles.cardHeader}>
          <Text style={styles.sectionTitle}>Latest Notice</Text>
          <TouchableOpacity onPress={() => router.push('/(tabs)/community')}>
            <Text style={styles.seeAll}>See All →</Text>
          </TouchableOpacity>
        </View>
        {latestNotice ? (
          <View style={styles.noticeCard}>
            <View style={styles.noticeDateBox}>
              <Bell color="#f59e0b" size={18} />
              <Text style={styles.noticeDate}>{latestNotice.date}</Text>
            </View>
            <Text style={styles.noticeTitle}>{latestNotice.title}</Text>
            <Text style={styles.noticeDesc}>{latestNotice.desc}</Text>
          </View>
        ) : (
          <View style={styles.noticeCard}>
            <Text style={styles.noticeDesc}>No new notices from society.</Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container:       { flex: 1, backgroundColor: '#f9fafb' },
  header:          { padding: 24, paddingTop: 60, paddingBottom: 30, borderBottomLeftRadius: 32, borderBottomRightRadius: 32 },
  headerRow:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  greeting:        { color: '#ccfbf1', fontSize: 16 },
  name:            { color: '#fff', fontSize: 26, fontWeight: '800', marginTop: 4 },
  flatNo:          { color: '#99f6e4', fontSize: 13, marginTop: 2 },
  adminBadge:      { backgroundColor: '#f59e0b', paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20 },
  adminText:       { color: '#fff', fontSize: 12, fontWeight: '700' },
  quickStats:      { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 20, marginTop: 20, padding: 16 },
  statItem:        { flex: 1, alignItems: 'center' },
  statNum:         { color: '#fff', fontSize: 22, fontWeight: '800' },
  statLabel:       { color: '#ccfbf1', fontSize: 12, marginTop: 4 },
  statDivider:     { width: 1, backgroundColor: 'rgba(255,255,255,0.3)' },
  searchBar:       { backgroundColor: '#fff', flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 20, marginTop: 20 },
  searchText:      { marginLeft: 10, color: '#9ca3af', fontSize: 16 },
  section:         { padding: 24, paddingBottom: 0 },
  sectionTitle:    { fontSize: 18, fontWeight: '700', color: '#1f2937', marginBottom: 16 },
  cardHeader:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  seeAll:          { color: '#10b981', fontWeight: '700', fontSize: 14 },
  actionGrid:      { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  actionBtn:       { width: '31%', backgroundColor: '#fff', padding: 16, borderRadius: 24, alignItems: 'center', marginBottom: 14, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2, position: 'relative' },
  iconBox:         { width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  actionText:      { fontWeight: '600', color: '#4b5563', fontSize: 12, textAlign: 'center' },
  badge:           { position: 'absolute', top: 10, right: 10, backgroundColor: '#ef4444', width: 20, height: 20, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  badgeText:       { color: '#fff', fontSize: 11, fontWeight: '800' },
  noticeCard:      { backgroundColor: '#fff', padding: 20, borderRadius: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2, borderLeftWidth: 4, borderLeftColor: '#f59e0b' },
  noticeDateBox:   { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  noticeDate:      { color: '#f59e0b', fontWeight: '700', marginLeft: 6, fontSize: 13 },
  noticeTitle:     { fontSize: 16, fontWeight: '700', color: '#1f2937', marginBottom: 6 },
  noticeDesc:      { color: '#6b7280', lineHeight: 22 },
});
