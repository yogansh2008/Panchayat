import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, ImageBackground, Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Megaphone, Calendar, AlertOctagon, ChevronRight } from 'lucide-react-native';
import { subscribeToNotices, subscribeToEvents, subscribeToComplaints } from '../../backend/db/firestore';
import { useAuth } from '../../frontend/context/AuthContext';

const TABS = [
  { key: 'notices',    label: 'Notices',    icon: Megaphone,    color: '#3b82f6' },
  { key: 'events',     label: 'Events',     icon: Calendar,     color: '#10b981' },
  { key: 'complaints', label: 'Complaints', icon: AlertOctagon, color: '#f59e0b' },
];

const STATUS_COLOR: Record<string, string> = {
  Open:        '#f59e0b',
  'In Progress': '#3b82f6',
  Resolved:    '#10b981',
};

export default function CommunityScreen() {
  const [tab, setTab] = useState('notices');
  const [notices, setNotices] = useState<any[]>([]);
  const [events, setEvents]   = useState<any[]>([]);
  const [complaints, setComplaints] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const { profile } = useAuth();
  const societyId = profile?.societyId || '';

  const fadeAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
  }, []);

  useEffect(() => {
    if (!societyId) { setLoading(false); return; }
    let done = 0;
    const check = () => { done++; if (done === 3) setLoading(false); };
    const u1 = subscribeToNotices(societyId,    d => { setNotices(d);    check(); });
    const u2 = subscribeToEvents(societyId,     d => { setEvents(d);     check(); });
    const u3 = subscribeToComplaints(societyId, d => { setComplaints(d); check(); });
    return () => { u1(); u2(); u3(); };
  }, [societyId]);

  const activeTab = TABS.find(t => t.key === tab)!;
  const data = tab === 'notices' ? notices : tab === 'events' ? events : complaints;

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient colors={['#1e293b', '#334155']} style={styles.header}>
        <Text style={styles.title}>Community</Text>
        <Text style={styles.subtitle}>{profile?.societyName || 'Your Society'}</Text>

        {/* Tab pills */}
        <View style={styles.tabRow}>
          {TABS.map(t => {
            const Icon = t.icon;
            const active = tab === t.key;
            return (
              <TouchableOpacity
                key={t.key}
                style={[styles.tabPill, active && { backgroundColor: t.color }]}
                onPress={() => setTab(t.key)}
              >
                <Icon color={active ? '#fff' : '#94a3b8'} size={15} />
                <Text style={[styles.tabTxt, active && styles.tabTxtActive]}>{t.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </LinearGradient>

      {/* Content */}
      {loading ? (
        <ActivityIndicator size="large" color="#10b981" style={{ marginTop: 60 }} />
      ) : data.length === 0 ? (
        <View style={styles.empty}>
          {React.createElement(activeTab.icon, { color: '#d1d5db', size: 60 })}
          <Text style={styles.emptyTitle}>No {activeTab.label} Yet</Text>
          <Text style={styles.emptyTxt}>Check back later for updates from your society admin.</Text>
        </View>
      ) : (
        <Animated.ScrollView style={{ opacity: fadeAnim }} contentContainerStyle={[styles.list, { paddingBottom: 120 }]}>
          {tab === 'notices' && notices.map(item => (
            <View key={item.id} style={styles.card}>
              <View style={[styles.cardAccent, { backgroundColor: '#3b82f6' }]} />
              <View style={styles.cardBody}>
                <View style={styles.cardRow}>
                  <View style={[styles.iconCircle, { backgroundColor: '#eff6ff' }]}>
                    <Megaphone color="#3b82f6" size={18} />
                  </View>
                  <Text style={styles.cardDate}>{item.date}</Text>
                </View>
                <Text style={styles.cardTitle}>{item.title}</Text>
                <Text style={styles.cardDesc}>{item.desc}</Text>
              </View>
            </View>
          ))}

          {tab === 'events' && events.map(item => (
            <TouchableOpacity key={item.id} activeOpacity={0.88}>
              <ImageBackground
                source={require('../../frontend/assets/events.png')}
                style={styles.eventCard}
                imageStyle={{ borderRadius: 20 }}
                resizeMode="cover"
              >
                <LinearGradient colors={['transparent', 'rgba(0,0,0,0.78)']} style={styles.eventGrad}>
                  <View style={styles.eventMeta}>
                    <View style={styles.dateBadge}>
                      <Text style={styles.dateBadgeTxt}>{item.date}</Text>
                    </View>
                    {item.status && (
                      <View style={[styles.statusBadge, { backgroundColor: '#10b981' + '30' }]}>
                        <Text style={[styles.statusTxt, { color: '#10b981' }]}>{item.status}</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.eventTitle}>{item.title}</Text>
                  {item.desc && <Text style={styles.eventDesc} numberOfLines={2}>{item.desc}</Text>}
                  <View style={styles.eventBottom}>
                    {item.time     && <Text style={styles.eventDetail}>🕐 {item.time}</Text>}
                    {item.location && <Text style={styles.eventDetail}>📍 {item.location}</Text>}
                    <TouchableOpacity style={styles.joinBtn}>
                      <Text style={styles.joinTxt}>Join Event</Text>
                    </TouchableOpacity>
                  </View>
                </LinearGradient>
              </ImageBackground>
            </TouchableOpacity>
          ))}

          {tab === 'complaints' && complaints.map(item => {
            const color = STATUS_COLOR[item.status] || '#9ca3af';
            return (
              <View key={item.id} style={styles.card}>
                <View style={[styles.cardAccent, { backgroundColor: color }]} />
                <View style={styles.cardBody}>
                  <View style={styles.cardRow}>
                    <View style={[styles.iconCircle, { backgroundColor: color + '20' }]}>
                      <AlertOctagon color={color} size={18} />
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: color + '15' }]}>
                      <Text style={[styles.statusTxt, { color }]}>{item.status}</Text>
                    </View>
                  </View>
                  <Text style={styles.cardTitle}>{item.title}</Text>
                  {item.desc && <Text style={styles.cardDesc} numberOfLines={2}>{item.desc}</Text>}
                  <Text style={styles.anonTxt}>
                    {item.anonymous ? '🕶️ Reported anonymously' : '👤 Reported by resident'}
                  </Text>
                </View>
              </View>
            );
          })}
        </Animated.ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container:     { flex: 1, backgroundColor: '#f8fafc' },

  // Header
  header:        { paddingTop: 56, paddingBottom: 20, paddingHorizontal: 20 },
  title:         { color: '#fff', fontSize: 28, fontWeight: '900' },
  subtitle:      { color: '#94a3b8', fontSize: 14, marginTop: 2, marginBottom: 18 },
  tabRow:        { flexDirection: 'row', gap: 8 },
  tabPill:       { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 10, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 30 },
  tabTxt:        { color: '#94a3b8', fontWeight: '700', fontSize: 13 },
  tabTxtActive:  { color: '#fff' },

  // Empty
  empty:         { alignItems: 'center', paddingTop: 80, paddingHorizontal: 40 },
  emptyTitle:    { fontSize: 18, fontWeight: '700', color: '#64748b', marginTop: 16 },
  emptyTxt:      { color: '#94a3b8', textAlign: 'center', marginTop: 8, lineHeight: 22 },

  // List
  list:          { padding: 16, paddingBottom: 80 },

  // Notice / complaint card
  card:          { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 20, marginBottom: 14, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 3 },
  cardAccent:    { width: 5 },
  cardBody:      { flex: 1, padding: 18 },
  cardRow:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  iconCircle:    { width: 38, height: 38, borderRadius: 19, justifyContent: 'center', alignItems: 'center' },
  cardDate:      { color: '#94a3b8', fontSize: 12, fontWeight: '600' },
  cardTitle:     { fontSize: 16, fontWeight: '800', color: '#1e293b', marginBottom: 6 },
  cardDesc:      { color: '#64748b', lineHeight: 22, fontSize: 14 },
  anonTxt:       { color: '#94a3b8', fontSize: 12, marginTop: 8 },

  // Event card
  eventCard:     { height: 220, marginBottom: 14 },
  eventGrad:     { flex: 1, borderRadius: 20, justifyContent: 'flex-end', padding: 18 },
  eventMeta:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  dateBadge:     { backgroundColor: 'rgba(255,255,255,0.25)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
  dateBadgeTxt:  { color: '#fff', fontWeight: '700', fontSize: 12 },
  statusBadge:   { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  statusTxt:     { fontSize: 12, fontWeight: '700' },
  eventTitle:    { color: '#fff', fontSize: 18, fontWeight: '900', marginBottom: 4 },
  eventDesc:     { color: 'rgba(255,255,255,0.75)', fontSize: 13, lineHeight: 20, marginBottom: 12 },
  eventBottom:   { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 },
  eventDetail:   { color: 'rgba(255,255,255,0.75)', fontSize: 12 },
  joinBtn:       { marginLeft: 'auto', backgroundColor: '#10b981', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  joinTxt:       { color: '#fff', fontWeight: '700', fontSize: 13 },
});
