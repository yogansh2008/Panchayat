import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, Alert, ActivityIndicator, Animated,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { ArrowLeft, Plus, QrCode, Clock, Phone, User, CheckCircle, XCircle, ChevronDown, ChevronUp } from 'lucide-react-native';
import { useAuth } from '../frontend/context/AuthContext';
import { createGatePass, subscribeMyGatePasses, GatePass, residentApprovePass, residentRejectPass } from '../backend/db/gatepass';

// ─── Status config ─────────────────────────────────────────────────────────────
const STATUS_CFG: Record<string, { color: string; bg: string; emoji: string; desc: string }> = {
  Pending:  { color: '#d97706', bg: '#fef3c7', emoji: '⏳', desc: 'Waiting for security approval' },
  'Pending Resident': { color: '#8b5cf6', bg: '#ede9fe', emoji: '🔔', desc: 'Requested by security. Waiting for their final verification.' },
  Approved: { color: '#2563eb', bg: '#dbeafe', emoji: '✅', desc: 'Approved — visitor may enter' },
  Rejected: { color: '#dc2626', bg: '#fee2e2', emoji: '❌', desc: 'Rejected by security' },
  Entered:  { color: '#059669', bg: '#d1fae5', emoji: '🟢', desc: 'Visitor is currently inside' },
  Exited:   { color: '#6b7280', bg: '#f3f4f6', emoji: '🚶', desc: 'Visitor has left' },
};

const PURPOSES = [
  { label: '👨‍👩‍👧 Guest',    value: 'Guest' },
  { label: '📦 Delivery', value: 'Delivery' },
  { label: '🚖 Cab',      value: 'Cab / Taxi' },
  { label: '🔧 Worker',   value: 'Worker' },
  { label: '🏥 Doctor',   value: 'Doctor' },
  { label: '📌 Other',    value: 'Other' },
];

// ─── Main Screen ───────────────────────────────────────────────────────────────
export default function VisitorGatePassScreen() {
  const router = useRouter();
  const { user, profile } = useAuth();

  const societyId    = profile?.societyId || '';
  const flatNumber   = profile?.flatNo    || 'N/A';
  const residentName = profile?.name      || 'Resident';
  const residentId   = user?.uid          || '';

  // List state
  const [passes,  setPasses]  = useState<GatePass[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');

  // Form state
  const [showForm,     setShowForm]     = useState(false);
  const [visitorName,  setVisitorName]  = useState('');
  const [phone,        setPhone]        = useState('');
  const [purpose,      setPurpose]      = useState('Guest');
  const [visitDate,    setVisitDate]    = useState(new Date().toLocaleDateString('en-IN'));
  const [entryTime,    setEntryTime]    = useState('');
  const [saving,       setSaving]       = useState(false);

  // Animate form height
  const formAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
  }, []);

  const toggleForm = (show: boolean) => {
    setShowForm(show);
    Animated.timing(formAnim, {
      toValue: show ? 1 : 0,
      duration: 300,
      useNativeDriver: false,
    }).start();
    if (!show) {
      setVisitorName(''); setPhone(''); setPurpose('Guest');
      setVisitDate(new Date().toLocaleDateString('en-IN')); setEntryTime('');
    }
  };

  // ── Subscribe to own passes ──────────────────────────────────────────────────
  useEffect(() => {
    if (!societyId || !residentId) {
      setLoading(false);
      setError('Your account is not linked to a society. Please contact your admin.');
      return;
    }
    let unsubscribed = false;
    const unsub = subscribeMyGatePasses(societyId, residentId, (data) => {
      if (!unsubscribed) {
        setPasses(data);
        setLoading(false);
        setError('');
      }
    });
    return () => { unsubscribed = true; unsub(); };
  }, [societyId, residentId]);

  // ── Create pass ──────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!visitorName.trim()) return Alert.alert('Required', 'Please enter the visitor\'s name.');
    if (!phone.trim() || phone.trim().length < 10) return Alert.alert('Required', 'Enter a valid 10-digit phone number.');
    if (!visitDate.trim()) return Alert.alert('Required', 'Please enter the visit date.');
    if (!societyId) return Alert.alert('Error', 'Your account is not linked to a society.');
    if (!residentId) return Alert.alert('Error', 'You must be logged in to create a gate pass.');

    setSaving(true);
    try {
      await createGatePass({
        visitorName:  visitorName.trim(),
        phone:        phone.trim(),
        purpose,
        date:         visitDate.trim(),
        entryTime:    entryTime.trim() || 'Not specified',
        residentId,
        residentName,
        flatNumber,
        societyId,
      });
      toggleForm(false);
      Alert.alert(
        '✅ Gate Pass Created!',
        `Your gate pass for ${visitorName.trim()} has been sent to security for approval.`
      );
    } catch (e: any) {
      const msg = e.message || '';
      if (msg.includes('index')) {
        Alert.alert(
          'Setup Required',
          'This is the first time generating a gate pass. A database index needs to be created. Please contact your admin and check the Firestore console.',
        );
      } else {
        Alert.alert('Error', msg || 'Could not create gate pass. Please try again.');
      }
    }
    setSaving(false);
  };

  const formMaxH = formAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 700] });

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      {/* ── Header ── */}
      <LinearGradient colors={['#1e40af', '#3b82f6']} style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft color="#fff" size={22} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>🚪 My Gate Passes</Text>
          <Text style={styles.headerSub}>
            Flat {flatNumber}  •  {passes.length} pass{passes.length !== 1 ? 'es' : ''}
          </Text>
        </View>
      </LinearGradient>

      <Animated.ScrollView
        style={{ flex: 1, opacity: fadeAnim }}
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >

        {/* ── Generate Pass Button / Form Toggle ── */}
        <TouchableOpacity
          style={[styles.generateBtn, showForm && styles.generateBtnActive]}
          onPress={() => toggleForm(!showForm)}
          activeOpacity={0.85}
        >
          <LinearGradient
            colors={showForm ? ['#ef4444', '#dc2626'] : ['#3b82f6', '#1d4ed8']}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            style={styles.generateGrad}
          >
            {showForm
              ? <><XCircle color="#fff" size={20} /><Text style={styles.generateTxt}>Cancel</Text></>
              : <><QrCode   color="#fff" size={20} /><Text style={styles.generateTxt}>+ Generate Gate Pass</Text></>
            }
          </LinearGradient>
        </TouchableOpacity>

        {/* ── Inline Create Form ── */}
        <Animated.View style={[styles.formWrapper, { maxHeight: formMaxH, overflow: 'hidden' }]}>
          <View style={styles.formCard}>
            {/* Auto-fill notice */}
            <View style={styles.autoFill}>
              <Text style={styles.autoFillLabel}>Auto-filled from your profile</Text>
              <Text style={styles.autoFillVal}>👤 {residentName}   🏠 Flat {flatNumber}</Text>
            </View>

            {/* Visitor name */}
            <FieldLabel label="Visitor Name *" />
            <InputRow icon={<User color="#94a3b8" size={18} />}>
              <TextInput
                style={styles.input}
                placeholder="e.g. Rohan Sharma"
                value={visitorName}
                onChangeText={setVisitorName}
                placeholderTextColor="#9ca3af"
              />
            </InputRow>

            {/* Phone */}
            <FieldLabel label="Visitor Phone *" />
            <InputRow icon={<Phone color="#94a3b8" size={18} />}>
              <TextInput
                style={styles.input}
                placeholder="10-digit mobile number"
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
                maxLength={10}
                placeholderTextColor="#9ca3af"
              />
            </InputRow>

            {/* Purpose chips */}
            <FieldLabel label="Purpose of Visit" />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsRow}>
              {PURPOSES.map(p => (
                <TouchableOpacity
                  key={p.value}
                  style={[styles.chip, purpose === p.value && styles.chipActive]}
                  onPress={() => setPurpose(p.value)}
                >
                  <Text style={[styles.chipTxt, purpose === p.value && styles.chipTxtActive]}>
                    {p.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Date */}
            <FieldLabel label="Visit Date *" />
            <InputRow icon={<Text style={{ fontSize: 16 }}>📅</Text>}>
              <TextInput
                style={styles.input}
                placeholder="e.g. 22/04/2026"
                value={visitDate}
                onChangeText={setVisitDate}
                placeholderTextColor="#9ca3af"
              />
            </InputRow>

            {/* Entry time */}
            <FieldLabel label="Expected Entry Time (optional)" />
            <InputRow icon={<Clock color="#94a3b8" size={18} />}>
              <TextInput
                style={styles.input}
                placeholder="e.g. 3:00 PM"
                value={entryTime}
                onChangeText={setEntryTime}
                placeholderTextColor="#9ca3af"
              />
            </InputRow>

            {/* Info */}
            <View style={styles.infoBox}>
              <Text style={styles.infoTxt}>
                🔒 Your gate pass will be sent to security. They will <Text style={{ fontWeight: '700' }}>Approve or Reject</Text> it before your visitor enters.
              </Text>
            </View>

            {/* Submit */}
            <TouchableOpacity
              style={styles.submitBtn}
              onPress={handleSubmit}
              disabled={saving}
              activeOpacity={0.85}
            >
              {saving
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.submitTxt}>Generate Gate Pass 🚀</Text>
              }
            </TouchableOpacity>
          </View>
        </Animated.View>

        {/* ── Error State ── */}
        {!!error && (
          <View style={styles.errorBox}>
            <Text style={styles.errorTxt}>⚠️ {error}</Text>
          </View>
        )}

        {/* ── My Passes List ── */}
        <View style={styles.listHeader}>
          <Text style={styles.listTitle}>My Passes</Text>
          {passes.length > 0 && (
            <Text style={styles.listCount}>{passes.length} total</Text>
          )}
        </View>

        {loading ? (
          <ActivityIndicator size="large" color="#3b82f6" style={{ marginTop: 40 }} />
        ) : passes.length === 0 ? (
          <View style={styles.empty}>
            <QrCode color="#d1d5db" size={60} />
            <Text style={styles.emptyTitle}>No gate passes yet</Text>
            <Text style={styles.emptyDesc}>Tap "Generate Gate Pass" above to create your first one.</Text>
          </View>
        ) : (
          passes.map(pass => {
            const cfg = STATUS_CFG[pass.status] || STATUS_CFG.Pending;
            return (
              <View key={pass.id} style={[styles.card, { borderLeftColor: cfg.color }]}>
                {/* Status badge */}
                <View style={[styles.statusBadge, { backgroundColor: cfg.bg }]}>
                  <Text style={[styles.statusTxt, { color: cfg.color }]}>
                    {cfg.emoji}  {pass.status}
                  </Text>
                </View>

                {/* Visitor info */}
                <Text style={styles.visitorName}>{pass.visitorName}</Text>
                <Text style={styles.visitorDetail}>📱 {pass.phone}</Text>
                <Text style={styles.visitorDetail}>🎯 {pass.purpose}</Text>
                <Text style={styles.visitorDetail}>📅 {pass.date}  {pass.entryTime !== 'Not specified' ? `•  🕐 ${pass.entryTime}` : ''}</Text>

                {/* Status description */}
                <Text style={[styles.statusDesc, { color: cfg.color }]}>{cfg.desc}</Text>

                {/* Accept / Reject for Walk-ins */}
                {pass.status === 'Pending Resident' && (
                  <View style={styles.residentActions}>
                    <TouchableOpacity
                      style={[styles.actionBtn, { backgroundColor: '#10b981' }]}
                      onPress={() => Alert.alert('Approve Visitor', 'Allow this visitor to enter?', [
                        { text: 'Cancel', style: 'cancel' },
                        { text: 'Approve', onPress: () => residentApprovePass(pass.id) }
                      ])}
                    >
                      <CheckCircle color="#fff" size={16} />
                      <Text style={styles.actionBtnTxt}>Approve</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity
                      style={[styles.actionBtn, { backgroundColor: '#ef4444' }]}
                      onPress={() => Alert.alert('Reject Visitor', 'Deny entry to this visitor?', [
                        { text: 'Cancel', style: 'cancel' },
                        { text: 'Reject', style: 'destructive', onPress: () => residentRejectPass(pass.id) }
                      ])}
                    >
                      <XCircle color="#fff" size={16} />
                      <Text style={styles.actionBtnTxt}>Reject</Text>
                    </TouchableOpacity>
                  </View>
                )}

                {/* Time stamps */}
                {pass.enteredAt && (
                  <View style={styles.timeRow}>
                    <Text style={styles.timeTxt}>🟢 Entered: {pass.enteredAt}</Text>
                  </View>
                )}
                {pass.exitedAt && (
                  <View style={styles.timeRow}>
                    <Text style={styles.timeTxt}>🚶 Exited: {pass.exitedAt}</Text>
                  </View>
                )}
              </View>
            );
          })
        )}

        <View style={{ height: 30 }} />
      </Animated.ScrollView>
    </KeyboardAvoidingView>
  );
}

// ─── Sub-components ────────────────────────────────────────────────────────────
function FieldLabel({ label }: { label: string }) {
  return <Text style={styles.fieldLabel}>{label}</Text>;
}
function InputRow({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <View style={styles.inputRow}>
      {icon}
      {children}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root:           { flex: 1, backgroundColor: '#f1f5f9' },

  // Header
  header:         { flexDirection: 'row', alignItems: 'center', paddingTop: 56, paddingBottom: 20, paddingHorizontal: 20, gap: 14 },
  backBtn:        { padding: 6 },
  headerTitle:    { color: '#fff', fontSize: 20, fontWeight: '800' },
  headerSub:      { color: '#bfdbfe', fontSize: 13, marginTop: 3 },

  // Scroll
  scroll:         { padding: 16, paddingBottom: 80 },

  // Generate button
  generateBtn:    { borderRadius: 18, overflow: 'hidden', marginBottom: 16, shadowColor: '#3b82f6', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 10, elevation: 5 },
  generateBtnActive: {},
  generateGrad:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 18 },
  generateTxt:    { color: '#fff', fontSize: 16, fontWeight: '800' },

  // Form card
  formWrapper:    {},
  formCard:       { backgroundColor: '#fff', borderRadius: 20, padding: 20, marginBottom: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.07, shadowRadius: 16, elevation: 4 },
  autoFill:       { backgroundColor: '#eff6ff', borderRadius: 12, padding: 14, marginBottom: 20, borderLeftWidth: 3, borderLeftColor: '#3b82f6' },
  autoFillLabel:  { color: '#3b82f6', fontSize: 12, fontWeight: '700', marginBottom: 4 },
  autoFillVal:    { color: '#1e3a8a', fontWeight: '700', fontSize: 14 },

  fieldLabel:     { fontSize: 13, fontWeight: '700', color: '#374151', marginBottom: 8 },
  inputRow:       { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8fafc', borderWidth: 1.5, borderColor: '#e2e8f0', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 2, marginBottom: 16, gap: 10 },
  input:          { flex: 1, fontSize: 15, color: '#1e293b', paddingVertical: 13 },

  // Chips
  chipsRow:       { marginBottom: 16 },
  chip:           { paddingHorizontal: 14, paddingVertical: 9, backgroundColor: '#f1f5f9', borderRadius: 20, marginRight: 8, borderWidth: 2, borderColor: 'transparent' },
  chipActive:     { backgroundColor: '#eff6ff', borderColor: '#3b82f6' },
  chipTxt:        { fontSize: 13, color: '#6b7280', fontWeight: '600' },
  chipTxtActive:  { color: '#3b82f6', fontWeight: '700' },

  // Info + Submit
  infoBox:        { backgroundColor: '#f0fdf4', borderRadius: 12, padding: 14, marginBottom: 16, borderLeftWidth: 3, borderLeftColor: '#10b981' },
  infoTxt:        { color: '#065f46', fontSize: 13, lineHeight: 20 },
  submitBtn:      { backgroundColor: '#3b82f6', paddingVertical: 16, borderRadius: 14, alignItems: 'center', shadowColor: '#3b82f6', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 5 },
  submitTxt:      { color: '#fff', fontSize: 15, fontWeight: '800' },

  // Error
  errorBox:       { backgroundColor: '#fef2f2', borderRadius: 14, padding: 14, marginBottom: 16, borderLeftWidth: 3, borderLeftColor: '#ef4444' },
  errorTxt:       { color: '#dc2626', fontSize: 13, lineHeight: 20 },

  // List header
  listHeader:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  listTitle:      { fontSize: 17, fontWeight: '800', color: '#1e293b' },
  listCount:      { fontSize: 13, color: '#94a3b8', fontWeight: '600' },

  // Empty
  empty:          { alignItems: 'center', paddingVertical: 60 },
  emptyTitle:     { fontSize: 17, fontWeight: '700', color: '#64748b', marginTop: 16 },
  emptyDesc:      { color: '#94a3b8', textAlign: 'center', marginTop: 8, lineHeight: 22, fontSize: 14 },

  // Pass card
  card:           { backgroundColor: '#fff', borderRadius: 18, padding: 18, marginBottom: 14, borderLeftWidth: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 10, elevation: 3 },
  statusBadge:    { alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, marginBottom: 12 },
  statusTxt:      { fontSize: 13, fontWeight: '800' },
  visitorName:    { fontSize: 18, fontWeight: '900', color: '#1e293b', marginBottom: 8 },
  visitorDetail:  { fontSize: 13, color: '#64748b', marginBottom: 4 },
  statusDesc:     { fontSize: 12, fontWeight: '600', marginTop: 8 },
  timeRow:        { marginTop: 6 },
  timeTxt:        { fontSize: 12, color: '#64748b', fontWeight: '600' },
  residentActions:{ flexDirection: 'row', gap: 10, marginTop: 12 },
  actionBtn:      { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10, flex: 1, justifyContent: 'center' },
  actionBtnTxt:   { color: '#fff', fontSize: 13, fontWeight: '700' }
});
