import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  ImageBackground, Animated, Alert, ActivityIndicator,
  TextInput, Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useAuth } from '../../frontend/context/AuthContext';
import {
  subscribeToNotices, subscribeResidentBills, subscribeToComplaints,
  subscribeToEvents, subscribeAdminStats, subscribeToData,
  subscribePendingResidents, COLLECTIONS,
  createEvent, postNotice, addDocument,
} from '../../backend/db/firestore';
import { subscribeGatePasses, subscribeMyGatePasses, GatePass } from '../../backend/db/gatepass';
import {
  Bell, FileText, Wrench, Shield, Phone, MessageCircle,
  ChevronRight, Calendar, TrendingUp, TrendingDown, DollarSign,
  Users, AlertOctagon, Building, BookOpen, Megaphone,
  UserPlus, Clock, QrCode, Star, LogOut, Settings,
  Plus, X, Check,
} from 'lucide-react-native';

// ─────────────────────────────────────────────────────────────────────────────
//  Shared atoms
// ─────────────────────────────────────────────────────────────────────────────
function SectionHeader({ title, onSeeAll }: { title: string; onSeeAll?: () => void }) {
  return (
    <View style={s.sectionHdr}>
      <Text style={s.sectionTitle}>{title}</Text>
      {onSeeAll && (
        <TouchableOpacity onPress={onSeeAll}>
          <Text style={s.seeAll}>See all →</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

function Tile({ icon: Icon, label, color, bg, route, badge = 0 }: any) {
  const router = useRouter();
  const scale  = useRef(new Animated.Value(1)).current;
  const press  = () => {
    Animated.sequence([
      Animated.timing(scale, { toValue: 0.92, duration: 75,  useNativeDriver: true }),
      Animated.timing(scale, { toValue: 1,    duration: 120, useNativeDriver: true }),
    ]).start(() => router.push(route));
  };
  return (
    <Animated.View style={{ transform: [{ scale }], width: '30%', marginBottom: 14 }}>
      <TouchableOpacity style={[s.tile, { backgroundColor: bg }]} onPress={press} activeOpacity={1}>
        <View style={[s.tileIcon, { backgroundColor: color + '22' }]}>
          <Icon color={color} size={22} />
        </View>
        {badge > 0 && <View style={s.tileBadge}><Text style={s.tileBadgeTxt}>{badge}</Text></View>}
        <Text style={s.tileLbl}>{label}</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

// Collapsible inline add-form panel
function QuickAddPanel({
  title, color, buttonLabel, fields, onSubmit,
}: {
  title: string; color: string; buttonLabel: string;
  fields: { key: string; placeholder: string; multiline?: boolean }[];
  onSubmit: (values: Record<string, string>) => Promise<void>;
}) {
  const [open, setOpen]   = useState(false);
  const [vals, setVals]   = useState<Record<string, string>>({});
  const [busy, setBusy]   = useState(false);
  const anim = useRef(new Animated.Value(0)).current;

  const toggle = () => {
    Animated.timing(anim, {
      toValue:  open ? 0 : 1,
      duration: 250,
      useNativeDriver: false,
    }).start();
    setOpen(o => !o);
  };

  const submit = async () => {
    setBusy(true);
    try {
      await onSubmit(vals);
      setVals({});
      setOpen(false);
      Animated.timing(anim, { toValue: 0, duration: 200, useNativeDriver: false }).start();
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
    setBusy(false);
  };

  const maxH = anim.interpolate({ inputRange: [0, 1], outputRange: [0, fields.length * 80 + 80] });

  return (
    <View style={[qa.wrap, { borderColor: color + '30' }]}>
      <TouchableOpacity style={qa.header} onPress={toggle} activeOpacity={0.75}>
        <View style={[qa.dot, { backgroundColor: color }]} />
        <Text style={qa.title}>{title}</Text>
        <View style={[qa.toggleBtn, { backgroundColor: color + '18' }]}>
          {open
            ? <X color={color} size={16} />
            : <Plus color={color} size={16} />
          }
        </View>
      </TouchableOpacity>

      <Animated.View style={{ maxHeight: maxH, overflow: 'hidden' }}>
        <View style={qa.body}>
          {fields.map(f => (
            <TextInput
              key={f.key}
              style={[qa.input, f.multiline && { height: 72, textAlignVertical: 'top' }]}
              placeholder={f.placeholder}
              value={vals[f.key] || ''}
              onChangeText={v => setVals(prev => ({ ...prev, [f.key]: v }))}
              multiline={f.multiline}
              placeholderTextColor="#9ca3af"
            />
          ))}
          <TouchableOpacity
            style={[qa.submitBtn, { backgroundColor: color }]}
            onPress={submit}
            disabled={busy}
          >
            {busy
              ? <ActivityIndicator color="#fff" size="small" />
              : <><Check color="#fff" size={16} /><Text style={qa.submitTxt}> {buttonLabel}</Text></>
            }
          </TouchableOpacity>
        </View>
      </Animated.View>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  ADMIN DASHBOARD
// ─────────────────────────────────────────────────────────────────────────────
function AdminDashboard() {
  const router = useRouter();
  const { profile, signOut } = useAuth();
  const sid = profile?.societyId || '';

  const [stats,    setStats]   = useState({ residents: 0, pendingBills: 0, openComplaints: 0 });
  const [income,   setIncome]  = useState(0);
  const [expense,  setExpense] = useState(0);
  const [pending,  setPending] = useState(0);
  const [passes,   setPasses]  = useState<GatePass[]>([]);
  const [notices,  setNotices] = useState<any[]>([]);
  const [events,   setEvents]  = useState<any[]>([]);

  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
  }, []);

  useEffect(() => {
    if (!sid) return;
    const u1 = subscribeAdminStats(sid, setStats);
    const u2 = subscribeToData(COLLECTIONS.FUNDS, (d: any[]) => {
      setIncome( d.filter((f: any) => f.type === 'income' ).reduce((a: number, c: any) => a + (c.amount || 0), 0));
      setExpense(d.filter((f: any) => f.type === 'expense').reduce((a: number, c: any) => a + (c.amount || 0), 0));
    }, [{ field: 'societyId', op: '==', value: sid }]);
    const u3 = subscribeGatePasses(sid, p => setPasses(p.filter(x => x.status === 'Pending')));
    const u4 = subscribeToNotices(sid,  n => setNotices(n.slice(0, 3)));
    const u5 = subscribeToEvents(sid,   e => setEvents(e.slice(0, 3)));
    return () => { u1(); u2(); u3(); u4(); u5(); };
  }, [sid]);

  useEffect(() => {
    if (!profile?.societyCode) return;
    const u = subscribePendingResidents(profile.societyCode, d => setPending(d.length));
    return () => u();
  }, [profile?.societyCode]);

  const balance = income - expense;

  const MGMT = [
    { icon: Building,     label: 'Society',    color: '#10b981', bg: '#f0fdf4', route: '/admin-society',       badge: 0 },
    { icon: Clock,        label: 'Requests',   color: '#f59e0b', bg: '#fffbeb', route: '/admin-requests',      badge: pending },
    { icon: Users,        label: 'Residents',  color: '#3b82f6', bg: '#eff6ff', route: '/admin-residents',     badge: 0 },
    { icon: QrCode,       label: 'Gate Pass',  color: '#6366f1', bg: '#eef2ff', route: '/admin-gatepasses',    badge: passes.length },
    { icon: AlertOctagon, label: 'Complaints', color: '#ef4444', bg: '#fef2f2', route: '/admin-complaints',    badge: stats.openComplaints },
    { icon: FileText,     label: 'Bills',      color: '#8b5cf6', bg: '#f5f3ff', route: '/admin-bills',         badge: stats.pendingBills },
    { icon: DollarSign,   label: 'Funds',      color: '#10b981', bg: '#f0fdf4', route: '/admin-funds',         badge: 0 },
    { icon: BookOpen,     label: 'Guidelines', color: '#7c3aed', bg: '#f5f3ff', route: '/admin-guidelines',    badge: 0 },
    { icon: MessageCircle,label: 'AI Help',    color: '#0d9488', bg: '#f0fdfa', route: '/ai-assistant',        badge: 0 },
  ];

  // ── Quick-add handlers ──────────────────────────────────────────────────────
  const addEvent = async (v: Record<string, string>) => {
    if (!v.title || !v.date) throw new Error('Title and date are required.');
    await createEvent(sid, { title: v.title.trim(), desc: v.desc?.trim() || '', date: v.date.trim() });
    Alert.alert('✅ Event Published', 'All residents can now see this event.');
  };

  const addNotice = async (v: Record<string, string>) => {
    if (!v.title) throw new Error('Title is required.');
    await postNotice(sid, { title: v.title.trim(), desc: v.desc?.trim() || '' });
    Alert.alert('✅ Notice Posted', 'All residents have been notified.');
  };

  const addProvider = async (v: Record<string, string>) => {
    if (!v.name || !v.phone || !v.category) throw new Error('Name, phone and category are required.');
    await addDocument(COLLECTIONS.SERVICES, {
      name: v.name.trim(), phone: v.phone.trim(),
      category: v.category.trim(), location: v.location?.trim() || '',
      rating: 5.0, available: true, societyId: sid,
    });
    Alert.alert('✅ Provider Added', `${v.name} added to the services directory.`);
  };

  return (
    <Animated.ScrollView
      style={{ flex: 1, opacity: fadeAnim, backgroundColor: '#f1f5f9' }}
      contentContainerStyle={{ paddingBottom: 130 }}
      showsVerticalScrollIndicator={false}
    >
      {/* ── Hero Header ── */}
      <ImageBackground
        source={require('../../frontend/assets/society_banner.png')}
        style={{ width: '100%', borderBottomLeftRadius: 28, borderBottomRightRadius: 28, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.15, shadowRadius: 10, elevation: 8, marginBottom: 10 }}
        resizeMode="cover"
      >
        <LinearGradient colors={['rgba(15,23,42,0.8)', 'rgba(30,41,59,0.95)']} style={{ paddingTop: 60, paddingBottom: 25, paddingHorizontal: 20 }}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
            <View style={{ flex: 1 }}>
              <Text style={{ color: '#94a3b8', fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8 }}>Admin Dashboard 🏘️</Text>
              <Text style={{ color: '#fff', fontSize: 26, fontWeight: '900', marginTop: 4 }}>{profile?.name || 'Admin'}</Text>
              {profile?.societyCode && (
                <View style={{ backgroundColor: 'rgba(16, 185, 129, 0.2)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, alignSelf: 'flex-start', marginTop: 10 }}>
                  <Text style={{ color: '#34d399', fontWeight: '800', fontSize: 13, letterSpacing: 1 }}>CODE: {profile.societyCode}</Text>
                </View>
              )}
            </View>
            <TouchableOpacity onPress={() => Alert.alert('Sign Out', 'Are you sure?', [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Sign Out', style: 'destructive', onPress: signOut },
            ])} style={{ backgroundColor: 'rgba(239, 68, 68, 0.15)', padding: 10, borderRadius: 12 }}>
              <LogOut color="#f87171" size={20} />
            </TouchableOpacity>
          </View>

          {/* ── Finance Band ── */}
          <View style={{ flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 20, paddingVertical: 18, paddingHorizontal: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', marginTop: 8 }}>
            <FinStat icon={TrendingUp}   label="Income"  value={`₹${income.toLocaleString()}`}                    color="#34d399" />
            <View style={{ width: 1, backgroundColor: 'rgba(255,255,255,0.15)', marginVertical: 4 }} />
            <FinStat icon={TrendingDown} label="Expense" value={`₹${expense.toLocaleString()}`}                   color="#f87171" />
            <View style={{ width: 1, backgroundColor: 'rgba(255,255,255,0.15)', marginVertical: 4 }} />
            <FinStat icon={DollarSign}   label="Balance" value={`₹${Math.abs(balance).toLocaleString()}`}         color={balance >= 0 ? '#34d399' : '#f87171'} />
          </View>
        </LinearGradient>
      </ImageBackground>

      {/* ── Stats Row ── */}
      <View style={s.statsRow}>
        <StatBox num={stats.residents}      lbl="Residents"   color="#3b82f6" onPress={() => router.push('/admin-residents')} />
        <StatBox num={stats.pendingBills}   lbl="Unpaid"      color="#8b5cf6" onPress={() => router.push('/admin-bills')} />
        <StatBox num={stats.openComplaints} lbl="Complaints"  color="#ef4444" onPress={() => router.push('/admin-complaints')} />
        <StatBox num={passes.length}        lbl="Passes"      color="#6366f1" onPress={() => router.push('/admin-gatepasses')} />
      </View>

      {/* ── Pending Gate Passes alert ── */}
      {passes.length > 0 && (
        <View style={s.section}>
          <SectionHeader title={`🚪 Pending Gate Passes (${passes.length})`} onSeeAll={() => router.push('/admin-gatepasses')} />
          {passes.slice(0, 2).map(p => (
            <TouchableOpacity key={p.id} style={s.passCard} onPress={() => router.push('/admin-gatepasses')} activeOpacity={0.75}>
              <View style={[s.passAccent, { backgroundColor: '#6366f1' }]} />
              <View style={{ flex: 1, paddingLeft: 14 }}>
                <Text style={s.passName}>{p.visitorName}</Text>
                <Text style={s.passSub}>📱 {p.phone}  •  🏠 Flat {p.flatNumber}</Text>
                <Text style={s.passSub}>📅 {p.date}  •  {p.purpose}</Text>
              </View>
              <View style={s.pendingPill}><Text style={s.pendingPillTxt}>Pending</Text></View>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* ── Quick Add — Events, Notices, Providers ── */}
      <View style={s.section}>
        <SectionHeader title="Quick Add" />

        <QuickAddPanel
          title="📅 Add Event"
          color="#0ea5e9"
          buttonLabel="Publish Event"
          fields={[
            { key: 'title', placeholder: 'Event title (e.g. Diwali Celebration)' },
            { key: 'date',  placeholder: 'Date & Time (e.g. 24th Oct, 7 PM)' },
            { key: 'desc',  placeholder: 'Description (optional)', multiline: true },
          ]}
          onSubmit={addEvent}
        />

        <QuickAddPanel
          title="📢 Post Notice"
          color="#f59e0b"
          buttonLabel="Post Notice"
          fields={[
            { key: 'title', placeholder: 'Notice title (e.g. Water Cut Tomorrow)' },
            { key: 'desc',  placeholder: 'Details (optional)', multiline: true },
          ]}
          onSubmit={addNotice}
        />

        <QuickAddPanel
          title="🔧 Add Service Provider"
          color="#10b981"
          buttonLabel="Add Provider"
          fields={[
            { key: 'name',     placeholder: 'Provider name / company' },
            { key: 'phone',    placeholder: 'Phone number' },
            { key: 'category', placeholder: 'Category (e.g. Plumber, Electrician)' },
            { key: 'location', placeholder: 'Location / address (optional)' },
          ]}
          onSubmit={addProvider}
        />
      </View>

      {/* ── Management Grid ── */}
      <View style={s.section}>
        <SectionHeader title="Management" />
        <View style={s.tileGrid}>
          {MGMT.map(t => <Tile key={t.label} {...t} />)}
        </View>
      </View>

      {/* ── Recent Events ── */}
      {events.length > 0 && (
        <View style={s.section}>
          <SectionHeader title="Recent Events" onSeeAll={() => router.push('/admin-events')} />
          {events.map((e: any) => (
            <View key={e.id} style={s.listRow}>
              <View style={[s.listDot, { backgroundColor: '#0ea5e9' }]}><Calendar color="#fff" size={14} /></View>
              <View style={{ flex: 1 }}>
                <Text style={s.listTitle}>{e.title}</Text>
                <Text style={s.listSub}>{e.date}</Text>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* ── Recent Notices ── */}
      {notices.length > 0 && (
        <View style={s.section}>
          <SectionHeader title="Recent Notices" onSeeAll={() => router.push('/admin-notices')} />
          {notices.map((n: any) => (
            <View key={n.id} style={s.listRow}>
              <View style={[s.listDot, { backgroundColor: '#f59e0b' }]}><Bell color="#fff" size={14} /></View>
              <View style={{ flex: 1 }}>
                <Text style={s.listTitle}>{n.title}</Text>
                <Text style={s.listSub}>{n.date}</Text>
              </View>
            </View>
          ))}
        </View>
      )}

    </Animated.ScrollView>
  );
}

function FinStat({ icon: Icon, label, value, color }: any) {
  return (
    <View style={s.finStat}>
      <Icon color={color} size={18} />
      <Text style={[s.finVal, { color }]}>{value}</Text>
      <Text style={s.finLbl}>{label}</Text>
    </View>
  );
}

function StatBox({ num, lbl, color, onPress }: any) {
  return (
    <TouchableOpacity style={s.statBox} onPress={onPress} activeOpacity={0.75}>
      <Text style={[s.statNum, { color }]}>{num}</Text>
      <Text style={s.statLbl}>{lbl}</Text>
    </TouchableOpacity>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  RESIDENT DASHBOARD
// ─────────────────────────────────────────────────────────────────────────────
function ResidentDashboard() {
  const router    = useRouter();
  const { profile, user } = useAuth();
  const sid       = profile?.societyId || '';
  const flatNo    = profile?.flatNo    || '';

  const [notices,      setNotices]      = useState<any[]>([]);
  const [events,       setEvents]       = useState<any[]>([]);
  const [pendingBills, setPendingBills] = useState(0);
  const [openComps,    setOpenComps]    = useState(0);
  const [myPasses,     setMyPasses]     = useState<GatePass[]>([]);
  const [greeting,     setGreeting]     = useState('Good Morning');

  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    const h = new Date().getHours();
    if (h >= 12 && h < 17) setGreeting('Good Afternoon');
    else if (h >= 17)       setGreeting('Good Evening');
    Animated.parallel([
      Animated.timing(fadeAnim,  { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
    ]).start();
  }, []);

  useEffect(() => {
    if (!sid) return;
    const u1 = subscribeToNotices(sid,    n => setNotices(n.slice(0, 3)));
    const u2 = subscribeToComplaints(sid, c => setOpenComps(c.filter((x: any) => x.status !== 'Resolved').length));
    const u3 = subscribeToEvents(sid,     e => setEvents(e.slice(0, 4)));
    return () => { u1(); u2(); u3(); };
  }, [sid]);

  useEffect(() => {
    if (!sid || !flatNo) return;
    const u = subscribeResidentBills(sid, flatNo, b => setPendingBills(b.filter((x: any) => x.status !== 'Paid').length));
    return () => u();
  }, [sid, flatNo]);

  useEffect(() => {
    if (!sid || !user?.uid) return;
    const u = subscribeMyGatePasses(sid, user.uid, (p: GatePass[]) => setMyPasses(p.slice(0, 2)));
    return () => u();
  }, [sid, user?.uid]);

  const ACTIONS = [
    { icon: Shield,        label: 'Gate Pass',  color: '#3b82f6', bg: '#eff6ff', route: '/visitors',       badge: 0 },
    { icon: FileText,      label: 'Pay Bills',  color: '#8b5cf6', bg: '#f5f3ff', route: '/billing',        badge: pendingBills },
    { icon: Calendar,      label: 'Bookings',   color: '#10b981', bg: '#f0fdf4', route: '/bookings',       badge: 0 },
    { icon: Wrench,        label: 'Complain',   color: '#f59e0b', bg: '#fffbeb', route: '/complaints',     badge: openComps },
    { icon: Phone,         label: 'Emergency',  color: '#ef4444', bg: '#fef2f2', route: '/emergency',      badge: 0 },
    { icon: MessageCircle, label: 'AI Help',    color: '#0d9488', bg: '#f0fdfa', route: '/ai-assistant',   badge: 0 },
  ];

  const STATUS_CLR: Record<string, string> = {
    Pending: '#f59e0b', Approved: '#3b82f6', Rejected: '#ef4444',
    Entered: '#10b981', Exited: '#6b7280',
  };

  return (
    <Animated.ScrollView
      style={{ flex: 1, opacity: fadeAnim, backgroundColor: '#f8fafc' }}
      contentContainerStyle={{ paddingBottom: 130 }}
      showsVerticalScrollIndicator={false}
    >
      {/* ── Hero ── */}
      <ImageBackground
        source={require('../../frontend/assets/society_banner.png')}
        style={s.hero}
        resizeMode="cover"
      >
        <LinearGradient colors={['rgba(0,0,0,0.35)', 'rgba(13,148,136,0.88)']} style={s.heroGrad}>
          <Animated.View style={{ transform: [{ translateY: slideAnim }] }}>
            <Text style={s.heroGreet}>{greeting} 👋</Text>
            <Text style={s.heroName}>{profile?.name || 'Resident'}</Text>
            {profile?.flatNo && (
              <Text style={s.heroFlat}>🏠 Flat {profile.flatNo}  ·  {profile?.societyName || 'Your Society'}</Text>
            )}
          </Animated.View>
          <View style={s.heroStats}>
            <HeroStat label="Pending Bills" value={pendingBills}  color="#fbbf24" />
            <View style={s.heroStatDiv} />
            <HeroStat label="Open Issues"   value={openComps}     color="#f87171" />
            <View style={s.heroStatDiv} />
            <HeroStat label="Events"        value={events.length} color="#86efac" />
          </View>
        </LinearGradient>
      </ImageBackground>

      {/* ── AI bar ── */}
      <TouchableOpacity style={s.aiBar} onPress={() => router.push('/ai-assistant')} activeOpacity={0.8}>
        <LinearGradient colors={['#10b981', '#059669']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.aiIcon}>
          <MessageCircle color="#fff" size={17} />
        </LinearGradient>
        <Text style={s.aiTxt}>Ask Panchayat AI — bills, rules, events…</Text>
        <ChevronRight color="#cbd5e1" size={18} />
      </TouchableOpacity>

      {/* ── Quick Actions ── */}
      <View style={s.section}>
        <SectionHeader title="Quick Actions" />
        <View style={s.tileGrid}>
          {ACTIONS.map(a => <Tile key={a.label} {...a} />)}
        </View>
      </View>

      {/* ── My Gate Passes ── */}
      <View style={s.section}>
        <SectionHeader title="🚪 My Gate Passes" onSeeAll={() => router.push('/visitors')} />
        {myPasses.length === 0 ? (
          <TouchableOpacity style={s.emptyCard} onPress={() => router.push('/visitors')} activeOpacity={0.8}>
            <QrCode color="#94a3b8" size={26} />
            <Text style={s.emptyCardTxt}>No gate passes yet — tap to create one</Text>
            <ChevronRight color="#94a3b8" size={16} />
          </TouchableOpacity>
        ) : (
          myPasses.map(p => {
            const c = STATUS_CLR[p.status] || '#9ca3af';
            return (
              <TouchableOpacity key={p.id} style={s.passCard} onPress={() => router.push('/visitors')} activeOpacity={0.75}>
                <View style={[s.passAccent, { backgroundColor: c }]} />
                <View style={{ flex: 1, paddingLeft: 14 }}>
                  <Text style={s.passName}>{p.visitorName}</Text>
                  <Text style={s.passSub}>📱 {p.phone}  •  {p.purpose}</Text>
                  <Text style={s.passSub}>📅 {p.date}</Text>
                  {p.enteredAt && <Text style={[s.passSub, { color: '#10b981', fontWeight: '700' }]}>🟢 Entered: {p.enteredAt}</Text>}
                  {p.exitedAt  && <Text style={s.passSub}>🚶 Exited: {p.exitedAt}</Text>}
                </View>
                <View style={[s.statusPill, { backgroundColor: c + '20' }]}>
                  <Text style={[s.statusPillTxt, { color: c }]}>{p.status}</Text>
                </View>
              </TouchableOpacity>
            );
          })
        )}
        <TouchableOpacity style={s.newPassBtn} onPress={() => router.push('/visitors')} activeOpacity={0.8}>
          <QrCode color="#3b82f6" size={17} />
          <Text style={s.newPassTxt}>+ Create New Gate Pass</Text>
        </TouchableOpacity>
      </View>

      {/* ── Events ── */}
      {events.length > 0 && (
        <View style={s.section}>
          <SectionHeader title="Upcoming Events" onSeeAll={() => router.push('/(tabs)/community')} />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12 }}>
            {events.map((ev: any) => (
              <ImageBackground
                key={ev.id}
                source={require('../../frontend/assets/events.png')}
                style={s.eventCard}
                imageStyle={{ borderRadius: 18 }}
                resizeMode="cover"
              >
                <LinearGradient colors={['transparent', 'rgba(0,0,0,0.72)']} style={s.eventGrad}>
                  <Text style={s.eventDate}>{ev.date}</Text>
                  <Text style={s.eventTitle} numberOfLines={2}>{ev.title}</Text>
                </LinearGradient>
              </ImageBackground>
            ))}
          </ScrollView>
        </View>
      )}

      {/* ── Notices ── */}
      <View style={s.section}>
        <SectionHeader title="Latest Notices" onSeeAll={() => router.push('/(tabs)/community')} />
        {notices.length === 0 ? (
          <View style={s.emptyCard}>
            <Bell color="#94a3b8" size={22} />
            <Text style={s.emptyCardTxt}>No notices from your society yet</Text>
          </View>
        ) : (
          notices.map((n: any) => (
            <View key={n.id} style={s.listRow}>
              <View style={[s.listDot, { backgroundColor: '#fffbeb', borderWidth: 1, borderColor: '#fde68a' }]}>
                <Bell color="#f59e0b" size={14} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.listTitle}>{n.title}</Text>
                <Text style={s.listSub}>{n.date}</Text>
              </View>
              <ChevronRight color="#e2e8f0" size={15} />
            </View>
          ))
        )}
      </View>

    </Animated.ScrollView>
  );
}

function HeroStat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <View style={{ alignItems: 'center', flex: 1 }}>
      <Text style={[s.heroStatNum, { color }]}>{value}</Text>
      <Text style={s.heroStatLbl}>{label}</Text>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  ROOT — smart role router
// ─────────────────────────────────────────────────────────────────────────────
export default function HomeScreen() {
  const { profile, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8fafc' }}>
        <ActivityIndicator size="large" color="#10b981" />
      </View>
    );
  }

  if (profile?.role === 'Admin') return <AdminDashboard />;
  return <ResidentDashboard />;
}

// ─────────────────────────────────────────────────────────────────────────────
//  Styles
// ─────────────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  // Admin header
  adminHeader:  { paddingTop: 56, paddingBottom: 24, paddingHorizontal: 24, flexDirection: 'row', alignItems: 'center' },
  adminGreet:   { color: '#64748b', fontSize: 13, fontWeight: '600' },
  adminName:    { color: '#fff', fontSize: 24, fontWeight: '900', marginTop: 2 },
  codePill:     { backgroundColor: 'rgba(16,185,129,0.18)', alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20, marginTop: 8 },
  codePillTxt:  { color: '#10b981', fontWeight: '700', fontSize: 13, letterSpacing: 0.5 },

  // Finance
  financeBand:  { flexDirection: 'row', backgroundColor: '#1e293b', marginHorizontal: 16, borderRadius: 20, paddingVertical: 18, paddingHorizontal: 8 },
  finStat:      { flex: 1, alignItems: 'center', gap: 4 },
  finVal:       { fontSize: 15, fontWeight: '900' },
  finLbl:       { color: '#64748b', fontSize: 11, fontWeight: '600' },
  finDivider:   { width: 1, backgroundColor: '#334155', marginVertical: 4 },

  // Stats row
  statsRow:     { flexDirection: 'row', marginHorizontal: 16, marginTop: 12, gap: 10 },
  statBox:      { flex: 1, backgroundColor: '#fff', borderRadius: 16, paddingVertical: 14, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  statNum:      { fontSize: 20, fontWeight: '900' },
  statLbl:      { fontSize: 10, color: '#94a3b8', fontWeight: '600', marginTop: 3, textAlign: 'center' },

  // Resident hero
  hero:         { height: 270 },
  heroGrad:     { flex: 1, paddingTop: 56, paddingBottom: 20, paddingHorizontal: 20, justifyContent: 'space-between' },
  heroGreet:    { color: 'rgba(255,255,255,0.8)', fontSize: 14, fontWeight: '600' },
  heroName:     { color: '#fff', fontSize: 28, fontWeight: '900', marginTop: 4 },
  heroFlat:     { color: 'rgba(255,255,255,0.7)', fontSize: 13, marginTop: 4 },
  heroStats:    { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 18, paddingVertical: 14, paddingHorizontal: 8, alignItems: 'center' },
  heroStatDiv:  { width: 1, backgroundColor: 'rgba(255,255,255,0.25)', height: 28 },
  heroStatNum:  { fontSize: 22, fontWeight: '900' },
  heroStatLbl:  { color: 'rgba(255,255,255,0.7)', fontSize: 10, fontWeight: '600', marginTop: 3, textAlign: 'center' },

  // AI bar
  aiBar:        { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', marginHorizontal: 16, marginTop: -20, borderRadius: 18, padding: 14, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.10, shadowRadius: 20, elevation: 8, gap: 12 },
  aiIcon:       { width: 34, height: 34, borderRadius: 17, justifyContent: 'center', alignItems: 'center' },
  aiTxt:        { flex: 1, color: '#94a3b8', fontSize: 14 },

  // Shared
  section:      { paddingHorizontal: 16, marginTop: 22 },
  sectionHdr:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  sectionTitle: { fontSize: 17, fontWeight: '800', color: '#1e293b' },
  seeAll:       { color: '#10b981', fontWeight: '700', fontSize: 14 },

  // Tile
  tileGrid:     { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  tile:         { paddingVertical: 18, paddingHorizontal: 8, borderRadius: 20, alignItems: 'center', position: 'relative' },
  tileIcon:     { width: 50, height: 50, borderRadius: 25, justifyContent: 'center', alignItems: 'center', marginBottom: 9 },
  tileLbl:      { fontSize: 11, fontWeight: '700', color: '#334155', textAlign: 'center' },
  tileBadge:    { position: 'absolute', top: 8, right: 8, backgroundColor: '#ef4444', width: 18, height: 18, borderRadius: 9, justifyContent: 'center', alignItems: 'center' },
  tileBadgeTxt: { color: '#fff', fontSize: 10, fontWeight: '900' },

  // Pass cards
  passCard:       { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 18, marginBottom: 10, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 10, elevation: 3, paddingVertical: 14, paddingRight: 14 },
  passAccent:     { width: 5, alignSelf: 'stretch', borderRadius: 3 },
  passName:       { fontSize: 15, fontWeight: '800', color: '#1e293b' },
  passSub:        { fontSize: 12, color: '#64748b', marginTop: 3 },
  statusPill:     { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
  statusPillTxt:  { fontSize: 11, fontWeight: '800' },
  pendingPill:    { backgroundColor: '#fef3c7', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
  pendingPillTxt: { color: '#92400e', fontSize: 11, fontWeight: '800' },

  newPassBtn:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#eff6ff', borderRadius: 14, paddingVertical: 14, borderWidth: 1.5, borderColor: '#bfdbfe', borderStyle: 'dashed', marginTop: 4 },
  newPassTxt:   { color: '#3b82f6', fontWeight: '700', fontSize: 14 },

  emptyCard:    { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#fff', borderRadius: 16, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 1 },
  emptyCardTxt: { flex: 1, color: '#94a3b8', fontSize: 14 },

  // Events
  eventCard:    { width: 190, height: 130 },
  eventGrad:    { flex: 1, borderRadius: 18, justifyContent: 'flex-end', padding: 14 },
  eventDate:    { color: '#86efac', fontSize: 11, fontWeight: '700' },
  eventTitle:   { color: '#fff', fontSize: 14, fontWeight: '800', marginTop: 2 },

  // List rows (notices / events in admin)
  listRow:      { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 16, padding: 14, marginBottom: 10, gap: 14, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 1 },
  listDot:      { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  listTitle:    { fontSize: 14, fontWeight: '700', color: '#1e293b' },
  listSub:      { fontSize: 12, color: '#94a3b8', marginTop: 2 },
});

// Quick-add panel styles
const qa = StyleSheet.create({
  wrap:      { backgroundColor: '#fff', borderRadius: 18, marginBottom: 12, borderWidth: 1.5, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 },
  header:    { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 10 },
  dot:       { width: 10, height: 10, borderRadius: 5 },
  title:     { flex: 1, fontSize: 15, fontWeight: '700', color: '#1e293b' },
  toggleBtn: { width: 30, height: 30, borderRadius: 15, justifyContent: 'center', alignItems: 'center' },
  body:      { paddingHorizontal: 16, paddingBottom: 16 },
  input:     { backgroundColor: '#f8fafc', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: '#1e293b', marginBottom: 10, borderWidth: 1, borderColor: '#e2e8f0' },
  submitBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 14, borderRadius: 14 },
  submitTxt: { color: '#fff', fontWeight: '800', fontSize: 14 },
});
