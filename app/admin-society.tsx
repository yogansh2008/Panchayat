import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, Alert, ActivityIndicator, Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, ArrowRight, Check, Building, Layers, DoorOpen, Eye } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../frontend/context/AuthContext';
import { createSociety, subscribeToData, COLLECTIONS } from '../backend/db/firestore';
import { doc, setDoc, serverTimestamp, collection, writeBatch } from 'firebase/firestore';
import { db } from '../backend/config/firebase';

// ─── Types ────────────────────────────────────────────────────────────────────

interface RoomInfo {
  roomNumber: string;
  bhkType: '1BHK' | '2BHK' | '3BHK' | 'Studio';
}

interface FloorData {
  floorNumber: number;
  rooms: RoomInfo[];
}

// ─── Step Indicator ───────────────────────────────────────────────────────────

const STEPS = ['Basic Info', 'Structure', 'Floors & Rooms', 'Review'];

function StepBar({ current }: { current: number }) {
  return (
    <View style={styles.stepBar}>
      {STEPS.map((label, i) => (
        <React.Fragment key={i}>
          <View style={styles.stepItem}>
            <View style={[styles.stepCircle, i <= current && styles.stepCircleActive]}>
              {i < current
                ? <Check color="#fff" size={14} />
                : <Text style={[styles.stepNum, i <= current && styles.stepNumActive]}>{i + 1}</Text>
              }
            </View>
            <Text style={[styles.stepLabel, i <= current && styles.stepLabelActive]}>{label}</Text>
          </View>
          {i < STEPS.length - 1 && (
            <View style={[styles.stepLine, i < current && styles.stepLineActive]} />
          )}
        </React.Fragment>
      ))}
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function AdminSocietyScreen() {
  const router = useRouter();
  const { user, profile } = useAuth();

  const [existingSociety, setExistingSociety] = useState<any>(null);
  const [loadingExisting, setLoadingExisting] = useState(true);
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);

  // Step 1 — Basic Info
  const [societyName, setSocietyName]     = useState('');
  const [address, setAddress]             = useState('');

  // Step 2 — Structure
  const [numFloors, setNumFloors]         = useState('');
  const [numWings, setNumWings]           = useState('');
  const [totalFlats, setTotalFlats]       = useState('');

  // Step 3 — Floor+Room builder
  const [floors, setFloors]               = useState<FloorData[]>([]);
  const [activeFloor, setActiveFloor]     = useState(0);
  const [newRoom, setNewRoom]             = useState<RoomInfo>({ roomNumber: '', bhkType: '2BHK' });

  // ── Load existing society ─────────────────────────────────────────────────
  useEffect(() => {
    if (!user) return;
    const unsub = subscribeToData(COLLECTIONS.SOCIETIES, (data) => {
      const mine = data.find((s: any) => s.adminId === user.uid);
      setExistingSociety(mine || null);
      setLoadingExisting(false);
    });
    return () => unsub();
  }, [user]);

  // ── Initialise floor array when numFloors changes in Step 2 ──────────────
  const initFloors = () => {
    const count = parseInt(numFloors);
    if (!count || count <= 0) return;
    const arr: FloorData[] = Array.from({ length: count }, (_, i) => ({
      floorNumber: i + 1,
      rooms: [],
    }));
    setFloors(arr);
    setActiveFloor(0);
  };

  // ── Add room to current floor ─────────────────────────────────────────────
  const addRoom = () => {
    if (!newRoom.roomNumber.trim()) {
      Alert.alert('Required', 'Enter a room / flat number.');
      return;
    }
    const updated = [...floors];
    updated[activeFloor].rooms.push({ ...newRoom });
    setFloors(updated);
    setNewRoom({ roomNumber: '', bhkType: '2BHK' });
  };

  // ── Remove room ───────────────────────────────────────────────────────────
  const removeRoom = (floorIdx: number, roomIdx: number) => {
    const updated = [...floors];
    updated[floorIdx].rooms.splice(roomIdx, 1);
    setFloors(updated);
  };

  // ── Validate steps ────────────────────────────────────────────────────────
  const validateStep = (): boolean => {
    if (step === 0) {
      if (!societyName.trim()) { Alert.alert('Required', 'Enter society name.'); return false; }
      if (!address.trim())     { Alert.alert('Required', 'Enter address.'); return false; }
    }
    if (step === 1) {
      if (!numFloors || parseInt(numFloors) < 1) { Alert.alert('Required', 'Enter number of floors (min 1).'); return false; }
      if (!totalFlats || parseInt(totalFlats) < 1) { Alert.alert('Required', 'Enter total flats.'); return false; }
    }
    return true;
  };

  const nextStep = () => {
    if (!validateStep()) return;
    if (step === 1) initFloors();
    if (step < STEPS.length - 1) setStep(s => s + 1);
  };

  const prevStep = () => { if (step > 0) setStep(s => s - 1); };

  // ── Final Create ──────────────────────────────────────────────────────────
  const handleCreate = async () => {
    setSaving(true);
    try {
      // 1. Write role=Admin to user doc (needed for Firestore rules)
      await setDoc(doc(db, COLLECTIONS.USERS, user!.uid), {
        name:  profile?.name || '',
        email: user!.email   || '',
        role:  'Admin',
      }, { merge: true });

      // 2. Create society document
      const result = await createSociety({
        name:       societyName.trim(),
        address:    address.trim(),
        adminId:    user!.uid,
        totalFlats: parseInt(totalFlats),
      });

      // 3. Update admin user with societyId + code
      await setDoc(doc(db, COLLECTIONS.USERS, user!.uid), {
        societyId:   result.id,
        societyCode: result.code,
        societyName: societyName.trim(),
      }, { merge: true });

      // 4. Batch-write all rooms to 'rooms' collection
      if (floors.length > 0) {
        const batch = writeBatch(db);
        floors.forEach(floor => {
          floor.rooms.forEach(room => {
            const ref = doc(collection(db, 'rooms'));
            batch.set(ref, {
              societyId:   result.id,
              floor:       floor.floorNumber,
              roomNumber:  room.roomNumber,
              bhkType:     room.bhkType,
              occupied:    false,
              residentId:  null,
              createdAt:   serverTimestamp(),
            });
          });
        });
        await batch.commit();
      }

      Alert.alert(
        '🎉 Society Created!',
        `Your society code is:\n\n${result.code}\n\nShare this with residents to let them join.`,
        [{ text: 'Done', onPress: () => router.replace('/admin') }]
      );
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
    setSaving(false);
  };

  // ── Render existing society card ──────────────────────────────────────────
  if (loadingExisting) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#0d9488" />
      </View>
    );
  }

  if (existingSociety) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 60 }}>
        <LinearGradient colors={['#0d9488', '#0f766e']} style={styles.headerGrad}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <ArrowLeft color="#fff" size={22} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Society Setup</Text>
        </LinearGradient>

        <View style={styles.codeCard}>
          <Text style={styles.codeLabel}>Your Society Code</Text>
          <Text style={styles.code}>{existingSociety.code}</Text>
          <Text style={styles.codeSub}>{existingSociety.name}</Text>
          <Text style={styles.codeAddress}>{existingSociety.address}</Text>
          <View style={styles.codeRow}>
            <View style={styles.codePill}>
              <Text style={styles.codePillText}>Total Flats: {existingSociety.totalFlats}</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Share with residents</Text>
          <Text style={styles.sectionSub}>
            Give the code <Text style={{ fontWeight: '900', color: '#0d9488' }}>{existingSociety.code}</Text> to
            your residents so they can join during signup.
          </Text>
        </View>
      </ScrollView>
    );
  }

  // ─── Multi-step creation form ─────────────────────────────────────────────
  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient colors={['#0d9488', '#0f766e']} style={styles.headerGrad}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft color="#fff" size={22} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Create Society</Text>
      </LinearGradient>

      {/* Step Bar */}
      <StepBar current={step} />

      <ScrollView contentContainerStyle={styles.formScroll} keyboardShouldPersistTaps="handled">

        {/* ─── STEP 0: Basic Info ─────────────────────────── */}
        {step === 0 && (
          <View style={styles.card}>
            <View style={styles.cardHeaderRow}>
              <Building color="#0d9488" size={22} />
              <Text style={styles.cardTitle}>Basic Information</Text>
            </View>
            <Text style={styles.fieldLabel}>Society Name *</Text>
            <TextInput style={styles.input} placeholder="e.g. Green Valley Apartments" value={societyName} onChangeText={setSocietyName} />
            <Text style={styles.fieldLabel}>Full Address *</Text>
            <TextInput style={[styles.input, { minHeight: 80 }]} placeholder="Enter complete address" value={address} onChangeText={setAddress} multiline />
          </View>
        )}

        {/* ─── STEP 1: Structure ──────────────────────────── */}
        {step === 1 && (
          <View style={styles.card}>
            <View style={styles.cardHeaderRow}>
              <Layers color="#0d9488" size={22} />
              <Text style={styles.cardTitle}>Building Structure</Text>
            </View>
            <Text style={styles.fieldLabel}>Number of Floors *</Text>
            <TextInput style={styles.input} placeholder="e.g. 5" value={numFloors} onChangeText={setNumFloors} keyboardType="numeric" />
            <Text style={styles.fieldLabel}>Number of Wings (optional)</Text>
            <TextInput style={styles.input} placeholder="e.g. 2 (A-Wing, B-Wing)" value={numWings} onChangeText={setNumWings} keyboardType="numeric" />
            <Text style={styles.fieldLabel}>Total Flats / Units *</Text>
            <TextInput style={styles.input} placeholder="e.g. 48" value={totalFlats} onChangeText={setTotalFlats} keyboardType="numeric" />
          </View>
        )}

        {/* ─── STEP 2: Floors & Rooms ─────────────────────── */}
        {step === 2 && (
          <View style={styles.card}>
            <View style={styles.cardHeaderRow}>
              <DoorOpen color="#0d9488" size={22} />
              <Text style={styles.cardTitle}>Floor & Room Setup</Text>
            </View>
            <Text style={styles.helperText}>
              Add rooms for each floor. You can skip floors and manage rooms later from the Admin panel.
            </Text>

            {/* Floor Selector */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
              {floors.map((f, i) => (
                <TouchableOpacity
                  key={i}
                  style={[styles.floorTab, i === activeFloor && styles.floorTabActive]}
                  onPress={() => setActiveFloor(i)}
                >
                  <Text style={[styles.floorTabText, i === activeFloor && styles.floorTabTextActive]}>
                    Floor {f.floorNumber}
                  </Text>
                  <Text style={[styles.floorTabCount, i === activeFloor && { color: '#fff' }]}>
                    {f.rooms.length} rooms
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Add Room */}
            <Text style={styles.fieldLabel}>Room / Flat No.</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. A-101"
              value={newRoom.roomNumber}
              onChangeText={v => setNewRoom(r => ({ ...r, roomNumber: v }))}
            />
            <Text style={styles.fieldLabel}>BHK Type</Text>
            <View style={styles.bhkRow}>
              {(['Studio', '1BHK', '2BHK', '3BHK'] as const).map(type => (
                <TouchableOpacity
                  key={type}
                  style={[styles.bhkBtn, newRoom.bhkType === type && styles.bhkBtnActive]}
                  onPress={() => setNewRoom(r => ({ ...r, bhkType: type }))}
                >
                  <Text style={[styles.bhkText, newRoom.bhkType === type && styles.bhkTextActive]}>
                    {type}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity style={styles.addRoomBtn} onPress={addRoom}>
              <Text style={styles.addRoomText}>+ Add Room</Text>
            </TouchableOpacity>

            {/* Room List for active floor */}
            {floors[activeFloor]?.rooms.length > 0 && (
              <View style={styles.roomList}>
                <Text style={styles.fieldLabel}>Rooms on Floor {floors[activeFloor].floorNumber}:</Text>
                {floors[activeFloor].rooms.map((r, ri) => (
                  <View key={ri} style={styles.roomRow}>
                    <Text style={styles.roomText}>🚪 {r.roomNumber}</Text>
                    <Text style={styles.roomBhk}>{r.bhkType}</Text>
                    <TouchableOpacity onPress={() => removeRoom(activeFloor, ri)}>
                      <Text style={styles.removeText}>✕</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        {/* ─── STEP 3: Review ─────────────────────────────── */}
        {step === 3 && (
          <View style={styles.card}>
            <View style={styles.cardHeaderRow}>
              <Eye color="#0d9488" size={22} />
              <Text style={styles.cardTitle}>Review & Create</Text>
            </View>

            <View style={styles.reviewRow}><Text style={styles.reviewKey}>Society Name</Text><Text style={styles.reviewVal}>{societyName}</Text></View>
            <View style={styles.reviewRow}><Text style={styles.reviewKey}>Address</Text><Text style={styles.reviewVal}>{address}</Text></View>
            <View style={styles.reviewRow}><Text style={styles.reviewKey}>Floors</Text><Text style={styles.reviewVal}>{numFloors}</Text></View>
            {numWings ? <View style={styles.reviewRow}><Text style={styles.reviewKey}>Wings</Text><Text style={styles.reviewVal}>{numWings}</Text></View> : null}
            <View style={styles.reviewRow}><Text style={styles.reviewKey}>Total Flats</Text><Text style={styles.reviewVal}>{totalFlats}</Text></View>
            <View style={styles.reviewRow}>
              <Text style={styles.reviewKey}>Rooms Configured</Text>
              <Text style={styles.reviewVal}>{floors.reduce((a, f) => a + f.rooms.length, 0)}</Text>
            </View>

            <View style={styles.reviewNote}>
              <Text style={styles.reviewNoteText}>
                ℹ️ A unique 6-character society code will be generated. Share it with residents to let them join.
              </Text>
            </View>

            <TouchableOpacity style={styles.createBtn} onPress={handleCreate} disabled={saving}>
              {saving
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.createBtnText}>🎉 Create Society</Text>
              }
            </TouchableOpacity>
          </View>
        )}

      </ScrollView>

      {/* Navigation Buttons */}
      <View style={styles.navRow}>
        <TouchableOpacity style={[styles.navBtn, styles.navBtnBack]} onPress={prevStep} disabled={step === 0}>
          <ArrowLeft color={step === 0 ? '#d1d5db' : '#0d9488'} size={20} />
          <Text style={[styles.navBtnText, step === 0 && { color: '#d1d5db' }]}>Back</Text>
        </TouchableOpacity>

        {step < STEPS.length - 1 && (
          <TouchableOpacity style={[styles.navBtn, styles.navBtnNext]} onPress={nextStep}>
            <Text style={styles.navBtnNextText}>Next</Text>
            <ArrowRight color="#fff" size={20} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container:        { flex: 1, backgroundColor: '#f9fafb' },
  center:           { flex: 1, justifyContent: 'center', alignItems: 'center' },
  headerGrad:       { flexDirection: 'row', alignItems: 'center', paddingTop: 56, paddingBottom: 20, paddingHorizontal: 20, gap: 12 },
  backBtn:          { padding: 4 },
  headerTitle:      { color: '#fff', fontSize: 20, fontWeight: '800' },

  // Stepper
  stepBar:          { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  stepItem:         { alignItems: 'center' },
  stepCircle:       { width: 28, height: 28, borderRadius: 14, backgroundColor: '#e5e7eb', justifyContent: 'center', alignItems: 'center' },
  stepCircleActive: { backgroundColor: '#0d9488' },
  stepNum:          { fontSize: 13, fontWeight: '700', color: '#9ca3af' },
  stepNumActive:    { color: '#fff' },
  stepLabel:        { fontSize: 10, color: '#9ca3af', marginTop: 4, textAlign: 'center' },
  stepLabelActive:  { color: '#0d9488', fontWeight: '700' },
  stepLine:         { flex: 1, height: 2, backgroundColor: '#e5e7eb', marginBottom: 14 },
  stepLineActive:   { backgroundColor: '#0d9488' },

  // Form
  formScroll:       { padding: 16, paddingBottom: 100 },
  card:             { backgroundColor: '#fff', borderRadius: 20, padding: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  cardHeaderRow:    { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 20 },
  cardTitle:        { fontSize: 17, fontWeight: '800', color: '#1f2937' },
  fieldLabel:       { fontSize: 13, fontWeight: '700', color: '#374151', marginBottom: 6, marginTop: 8 },
  input:            { backgroundColor: '#f3f4f6', borderRadius: 12, padding: 14, fontSize: 15, color: '#1f2937', marginBottom: 4 },
  helperText:       { color: '#6b7280', fontSize: 13, lineHeight: 20, marginBottom: 12 },

  // BHK
  bhkRow:           { flexDirection: 'row', gap: 8, marginBottom: 12 },
  bhkBtn:           { flex: 1, paddingVertical: 10, backgroundColor: '#f3f4f6', borderRadius: 10, alignItems: 'center', borderWidth: 2, borderColor: 'transparent' },
  bhkBtnActive:     { backgroundColor: '#f0fdfa', borderColor: '#0d9488' },
  bhkText:          { fontWeight: '700', color: '#9ca3af', fontSize: 13 },
  bhkTextActive:    { color: '#0d9488' },

  // Floor tabs
  floorTab:         { paddingHorizontal: 16, paddingVertical: 10, backgroundColor: '#f3f4f6', borderRadius: 12, marginRight: 8, alignItems: 'center' },
  floorTabActive:   { backgroundColor: '#0d9488' },
  floorTabText:     { fontWeight: '700', color: '#6b7280', fontSize: 13 },
  floorTabTextActive: { color: '#fff' },
  floorTabCount:    { fontSize: 11, color: '#9ca3af', marginTop: 2 },

  // Add room
  addRoomBtn:       { backgroundColor: '#0d9488', padding: 14, borderRadius: 12, alignItems: 'center', marginVertical: 8 },
  addRoomText:      { color: '#fff', fontWeight: '700' },
  roomList:         { marginTop: 12 },
  roomRow:          { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f9fafb', borderRadius: 10, padding: 12, marginBottom: 8 },
  roomText:         { flex: 1, fontWeight: '700', color: '#1f2937' },
  roomBhk:          { color: '#10b981', fontWeight: '700', marginRight: 12 },
  removeText:       { color: '#ef4444', fontWeight: '900', fontSize: 16 },

  // Review
  reviewRow:        { flexDirection: 'row', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  reviewKey:        { flex: 1, color: '#6b7280', fontWeight: '600' },
  reviewVal:        { flex: 2, color: '#1f2937', fontWeight: '700', textAlign: 'right' },
  reviewNote:       { backgroundColor: '#fffbeb', borderRadius: 12, padding: 14, marginTop: 16, borderLeftWidth: 3, borderLeftColor: '#f59e0b' },
  reviewNoteText:   { color: '#92400e', fontSize: 13, lineHeight: 20 },
  createBtn:        { backgroundColor: '#0d9488', padding: 18, borderRadius: 16, alignItems: 'center', marginTop: 20 },
  createBtnText:    { color: '#fff', fontSize: 16, fontWeight: '800' },

  // Nav
  navRow:           { flexDirection: 'row', justifyContent: 'space-between', padding: 16, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#f3f4f6' },
  navBtn:           { flexDirection: 'row', alignItems: 'center', gap: 6, padding: 14, borderRadius: 14 },
  navBtnBack:       { backgroundColor: '#f9fafb', borderWidth: 1, borderColor: '#e5e7eb' },
  navBtnNext:       { backgroundColor: '#0d9488', flex: 1, marginLeft: 12, justifyContent: 'center' },
  navBtnText:       { color: '#0d9488', fontWeight: '700' },
  navBtnNextText:   { color: '#fff', fontWeight: '700', fontSize: 15 },

  // Existing society
  codeCard:         { backgroundColor: '#0d9488', margin: 16, padding: 28, borderRadius: 24, alignItems: 'center' },
  codeLabel:        { color: '#ccfbf1', fontSize: 13, fontWeight: '600', marginBottom: 8 },
  code:             { color: '#fff', fontSize: 44, fontWeight: '900', letterSpacing: 10 },
  codeSub:          { color: '#fff', fontSize: 18, fontWeight: '700', marginTop: 8 },
  codeAddress:      { color: '#ccfbf1', fontSize: 13, marginTop: 4, textAlign: 'center' },
  codeRow:          { flexDirection: 'row', marginTop: 16 },
  codePill:         { backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  codePillText:     { color: '#fff', fontWeight: '700' },
  section:          { padding: 24 },
  sectionTitle:     { fontSize: 18, fontWeight: '800', color: '#1f2937', marginBottom: 8 },
  sectionSub:       { color: '#6b7280', lineHeight: 22 },
});
