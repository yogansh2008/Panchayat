import React, { useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, Alert, Animated, Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useAuth } from '../../frontend/context/AuthContext';
import {
  Bell, Settings, Shield, LogOut, ChevronRight,
  Home, Star, FileText, Phone, MessageCircle,
  QrCode, Users, Award, Megaphone, Calendar, DollarSign,
} from 'lucide-react-native';

// Role config
const ROLE_CFG: Record<string, { gradient: [string, string]; badge: string; emoji: string }> = {
  Admin:    { gradient: ['#7c3aed', '#a855f7'], badge: 'Society Admin',    emoji: '⚙️' },
  Resident: { gradient: ['#0d9488', '#10b981'], badge: 'Resident',          emoji: '🏠' },
  Security: { gradient: ['#1d4ed8', '#3b82f6'], badge: 'Security Guard',   emoji: '🛡️' },
  Provider: { gradient: ['#b45309', '#f59e0b'], badge: 'Service Provider', emoji: '🔧' },
};

type MenuSection = {
  title: string;
  items: { icon: any; label: string; sub?: string; route?: string; danger?: boolean; color?: string }[];
};

export default function ProfileScreen() {
  const { profile, signOut } = useAuth();
  const router = useRouter();

  const role    = profile?.role || 'Resident';
  const cfg     = ROLE_CFG[role] || ROLE_CFG.Resident;
  const initial = (profile?.name || 'U').charAt(0).toUpperCase();

  // Animate on mount
  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim,  { toValue: 1, duration: 450, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 450, useNativeDriver: true }),
    ]).start();
  }, []);

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: signOut },
    ]);
  };

  const residentMenu: MenuSection[] = [
    {
      title: 'My Society',
      items: [
        { icon: FileText,      label: 'My Bills',        sub: 'View & pay pending bills',               route: '/billing',       color: '#8b5cf6' },
        { icon: QrCode,        label: 'Gate Passes',     sub: 'My visitor passes',                      route: '/visitors',      color: '#3b82f6' },
        { icon: Shield,        label: 'Rules & Bylaws',  sub: 'Society rules & regulations',            route: '/rules',         color: '#7c3aed' },
      ],
    },
    {
      title: 'Quick Access',
      items: [
        { icon: MessageCircle, label: 'AI Assistant',    sub: 'Ask Panchayat AI',                       route: '/ai-assistant',  color: '#0d9488' },
        { icon: Home,          label: 'Bookings',        sub: 'Book society facilities',                route: '/bookings',      color: '#10b981' },
        { icon: Phone,         label: 'Emergency',       sub: 'Emergency contacts',                     route: '/emergency',     color: '#ef4444' },
      ],
    },
    {
      title: 'Account',
      items: [
        { icon: Bell,          label: 'Notifications',   sub: 'Manage alerts',                          color: '#f59e0b' },
        { icon: Settings,      label: 'Settings',        sub: 'App preferences',                        color: '#6b7280' },
        { icon: LogOut,        label: 'Sign Out',        sub: 'See you soon!',                          danger: true, color: '#ef4444' },
      ],
    },
  ];

  const adminMenu: MenuSection[] = [
    {
      title: 'Management',
      items: [
        { icon: Home,          label: 'Society Setup',   sub: 'View society code & config',             route: '/admin-society', color: '#10b981' },
        { icon: Users,         label: 'Residents',       sub: 'Manage all residents',                   route: '/admin-residents', color: '#3b82f6' },
        { icon: QrCode,        label: 'Gate Passes',     sub: 'Approve & track visitor passes',         route: '/admin-gatepasses', color: '#6366f1' },
        { icon: Shield,        label: 'Rules & Setup',   sub: 'AI guidelines & rules',                  route: '/admin-guidelines', color: '#7c3aed' },
      ],
    },
    {
      title: 'Content & Finance',
      items: [
        { icon: Megaphone,     label: 'Post Notice',     sub: 'Broadcast to all residents',             route: '/admin-notices',    color: '#f59e0b' },
        { icon: Calendar,      label: 'Events',          sub: 'Create & manage events',                 route: '/admin-events',     color: '#0ea5e9' },
        { icon: Star,          label: 'Service Providers', sub: 'Add & manage providers',               route: '/admin-add-provider', color: '#0d9488' },
        { icon: FileText,      label: 'Billing',         sub: 'Generate & manage bills',                route: '/admin-bills',       color: '#8b5cf6' },
        { icon: DollarSign,    label: 'Funds Ledger',    sub: 'Track income & expenses',                route: '/admin-funds',       color: '#10b981' },
      ],
    },
    {
      title: 'Account',
      items: [
        { icon: Bell,          label: 'Notifications',   sub: 'Manage alerts',                          color: '#f59e0b' },
        { icon: Settings,      label: 'Settings',        sub: 'App preferences',                        color: '#6b7280' },
        { icon: LogOut,        label: 'Sign Out',        sub: 'Until next time!',                       danger: true, color: '#ef4444' },
      ],
    },
  ];

  const MENU: MenuSection[] = role === 'Admin' ? adminMenu : residentMenu;

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={{ paddingBottom: 120 }} showsVerticalScrollIndicator={false}>

        {/* ── Profile Header ──────────────────────────────────────────────── */}
        <LinearGradient colors={cfg.gradient as [string, string]} style={styles.header}>
          {/* Avatar */}
          <Animated.View style={[styles.avatarWrap, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initial}</Text>
            </View>
            <View style={styles.rolePill}>
              <Text style={styles.rolePillTxt}>{cfg.emoji} {cfg.badge}</Text>
            </View>
          </Animated.View>

          {/* Name & info */}
          <Animated.View style={[styles.headerInfo, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
            <Text style={styles.nameText}>{profile?.name || 'Resident'}</Text>
            <Text style={styles.emailText}>{profile?.email || ''}</Text>
            {profile?.flatNo && (
              <Text style={styles.flatText}>🏠 Flat {profile.flatNo}</Text>
            )}
          </Animated.View>

          {/* Stats for residents */}
          {role === 'Resident' && (
            <Animated.View style={[styles.statsRow, { opacity: fadeAnim }]}>
              <View style={styles.statItem}>
                <Text style={styles.statNum}>{profile?.societyCode || '—'}</Text>
                <Text style={styles.statLbl}>Society Code</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Award color="rgba(255,255,255,0.9)" size={20} />
                <Text style={styles.statLbl}>Verified Member</Text>
              </View>
            </Animated.View>
          )}
        </LinearGradient>

        {/* ── Menu Sections ────────────────────────────────────────────────── */}
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
          {MENU.map((section, si) => (
            <View key={si} style={styles.section}>
              <Text style={styles.sectionTitle}>{section.title}</Text>
              <View style={styles.card}>
                {section.items.map((item, ii) => (
                  <React.Fragment key={ii}>
                    <TouchableOpacity
                      style={styles.menuRow}
                      onPress={() => {
                        if (item.danger) { handleLogout(); return; }
                        if (item.route) router.push(item.route as any);
                      }}
                      activeOpacity={0.65}
                    >
                      <View style={[styles.menuIcon, { backgroundColor: (item.color || '#10b981') + '18' }]}>
                        <item.icon color={item.color || '#10b981'} size={19} />
                      </View>
                      <View style={styles.menuInfo}>
                        <Text style={[styles.menuLabel, item.danger && { color: '#ef4444' }]}>{item.label}</Text>
                        {item.sub && <Text style={styles.menuSub} numberOfLines={1}>{item.sub}</Text>}
                      </View>
                      <ChevronRight color={item.danger ? '#fca5a5' : '#d1d5db'} size={18} />
                    </TouchableOpacity>
                    {ii < section.items.length - 1 && <View style={styles.divider} />}
                  </React.Fragment>
                ))}
              </View>
            </View>
          ))}
        </Animated.View>

        {/* App version */}
        <Text style={styles.version}>Panchayat v1.0  •  Made with ❤️</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container:    { flex: 1, backgroundColor: '#f1f5f9' },

  // Header
  header:       { paddingTop: 64, paddingBottom: 28, paddingHorizontal: 24, alignItems: 'center', borderBottomLeftRadius: 36, borderBottomRightRadius: 36 },
  avatarWrap:   { alignItems: 'center', marginBottom: 16 },
  avatar:       { width: 90, height: 90, borderRadius: 45, backgroundColor: 'rgba(255,255,255,0.3)', justifyContent: 'center', alignItems: 'center', borderWidth: 3, borderColor: 'rgba(255,255,255,0.5)' },
  avatarText:   { fontSize: 38, color: '#fff', fontWeight: '900' },
  rolePill:     { backgroundColor: 'rgba(255,255,255,0.25)', paddingHorizontal: 14, paddingVertical: 5, borderRadius: 20, marginTop: 10 },
  rolePillTxt:  { color: '#fff', fontWeight: '700', fontSize: 13 },
  headerInfo:   { alignItems: 'center' },
  nameText:     { color: '#fff', fontSize: 26, fontWeight: '900', textAlign: 'center' },
  emailText:    { color: 'rgba(255,255,255,0.75)', fontSize: 14, marginTop: 4 },
  flatText:     { color: 'rgba(255,255,255,0.85)', fontSize: 13, marginTop: 4, fontWeight: '600' },
  statsRow:     { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: 20, marginTop: 20, paddingVertical: 14, paddingHorizontal: 24, alignItems: 'center', gap: 24 },
  statItem:     { alignItems: 'center', gap: 4 },
  statNum:      { color: '#fff', fontSize: 18, fontWeight: '900' },
  statLbl:      { color: 'rgba(255,255,255,0.75)', fontSize: 11, fontWeight: '600' },
  statDivider:  { width: 1, height: 30, backgroundColor: 'rgba(255,255,255,0.3)' },

  // Menu
  section:      { paddingHorizontal: 20, marginTop: 24 },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10 },
  card:         { backgroundColor: '#fff', borderRadius: 20, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 12, elevation: 3 },
  menuRow:      { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 15, gap: 14 },
  menuIcon:     { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  menuInfo:     { flex: 1 },
  menuLabel:    { fontSize: 15, fontWeight: '700', color: '#1e293b' },
  menuSub:      { fontSize: 12, color: '#94a3b8', marginTop: 2 },
  divider:      { height: 1, backgroundColor: '#f8fafc', marginLeft: 70 },

  // Version
  version:      { textAlign: 'center', color: '#cbd5e1', fontSize: 12, marginTop: 32, marginBottom: 8 },
});
