import React, { useState, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator,
  Dimensions, FlatList, Image,
} from 'react-native';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { auth, db } from '../../backend/config/firebase';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { LinearGradient } from 'expo-linear-gradient';
import { validateSocietyCode } from '../../backend/db/firestore';
import { Eye, EyeOff, ChevronRight } from 'lucide-react-native';

const { width, height } = Dimensions.get('window');

type Role = 'Resident' | 'Admin' | 'Provider' | 'Security';

// ─── Onboarding slides ────────────────────────────────────────────────────────
const SLIDES = [
  {
    key: '1',
    title: 'Welcome to Panchayat',
    subtitle: 'Your complete society management solution — bills, events, complaints and more.',
    image: require('../../frontend/assets/onboarding.png'),
    accent: '#10b981',
  },
  {
    key: '2',
    title: 'Smart Gate Pass',
    subtitle: 'Generate visitor passes instantly. Security gets notified in real-time.',
    image: require('../../frontend/assets/gatepass.png'),
    accent: '#3b82f6',
  },
  {
    key: '3',
    title: 'Stay Connected',
    subtitle: 'Notices, events, complaints — everything about your society in one place.',
    image: require('../../frontend/assets/events.png'),
    accent: '#8b5cf6',
  },
];

// ─── Onboarding Flow ──────────────────────────────────────────────────────────
function OnboardingScreen({ onDone }: { onDone: () => void }) {
  const [idx, setIdx] = useState(0);
  const flatRef = useRef<FlatList>(null);

  const next = () => {
    if (idx < SLIDES.length - 1) {
      flatRef.current?.scrollToIndex({ index: idx + 1 });
      setIdx(i => i + 1);
    } else {
      onDone();
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#fff' }}>
      <FlatList
        ref={flatRef}
        data={SLIDES}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        scrollEnabled={false}
        keyExtractor={i => i.key}
        renderItem={({ item }) => (
          <View style={{ width, flex: 1 }}>
            {/* Image area */}
            <View style={[ob.imageContainer, { backgroundColor: item.accent + '15' }]}>
              <Image source={item.image} style={ob.image} resizeMode="cover" />
              <LinearGradient
                colors={['transparent', '#fff']}
                style={ob.imageGrad}
              />
            </View>

            {/* Content */}
            <View style={ob.content}>
              <Text style={ob.title}>{item.title}</Text>
              <Text style={ob.subtitle}>{item.subtitle}</Text>
            </View>
          </View>
        )}
      />

      {/* Bottom controls */}
      <View style={ob.controls}>
        {/* Dots */}
        <View style={ob.dotsRow}>
          {SLIDES.map((s, i) => (
            <View key={s.key} style={[ob.dot, i === idx && ob.dotActive]} />
          ))}
        </View>

        {/* Skip + Next */}
        <View style={ob.btnRow}>
          <TouchableOpacity onPress={onDone} style={ob.skipBtn}>
            <Text style={ob.skipTxt}>Skip</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[ob.nextBtn, { backgroundColor: SLIDES[idx].accent }]} onPress={next}>
            <Text style={ob.nextTxt}>{idx === SLIDES.length - 1 ? 'Get Started' : 'Next'}</Text>
            <ChevronRight color="#fff" size={20} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

// ─── Auth Screen ──────────────────────────────────────────────────────────────
export default function AuthScreen() {
  const [showOnboarding, setShowOnboarding] = useState(true);
  const [isLogin, setIsLogin]       = useState(true);
  const [email, setEmail]           = useState('');
  const [password, setPassword]     = useState('');
  const [name, setName]             = useState('');
  const [role, setRole]             = useState<Role>('Resident');
  const [societyCode, setSocietyCode] = useState('');
  const [flatNo, setFlatNo]         = useState('');
  const [category, setCategory]     = useState('Plumber');
  const [showPass, setShowPass]     = useState(false);
  const [isLoading, setIsLoading]   = useState(false);
  const [error, setError]           = useState('');

  if (showOnboarding) {
    return <OnboardingScreen onDone={() => setShowOnboarding(false)} />;
  }

  const handleAuth = async () => {
    setIsLoading(true); setError('');
    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email.trim(), password);
        return;
      }
      if (!name.trim())       throw new Error('Please enter your full name.');
      if (!email.trim())      throw new Error('Please enter your email.');
      if (password.length < 6) throw new Error('Password must be at least 6 characters.');

      let society: any = null;
      if (role === 'Resident' || role === 'Security') {
        const code = societyCode.trim().toUpperCase();
        if (!code)             throw new Error('Please enter your society code.');
        if (role === 'Resident' && !flatNo.trim())    throw new Error('Please enter your flat number.');
        
        society = await validateSocietyCode(code);
        if (!society)          throw new Error(`Invalid society code "${code}". Ask your admin.`);
      }

      const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
      const uid  = cred.user.uid;
      const base = { uid, name: name.trim(), email: email.trim().toLowerCase(), createdAt: serverTimestamp() };

      if (role === 'Resident') {
        await setDoc(doc(db, 'users', uid), { ...base, role: 'Resident', flatNo: flatNo.trim(), societyId: society.id, societyCode: society.code, societyName: society.name, approved: false });
      } else if (role === 'Admin') {
        await setDoc(doc(db, 'users', uid), { ...base, role: 'Admin', societyId: null });
      } else if (role === 'Provider') {
        await setDoc(doc(db, 'users', uid), { ...base, role: 'Provider', category: category.trim(), available: true, societyId: null });
      } else if (role === 'Security') {
        await setDoc(doc(db, 'users', uid), { ...base, role: 'Security', societyId: society.id, societyCode: society.code, societyName: society.name, approved: false });
      }
    } catch (e: any) {
      setError(e.message?.replace('Firebase: ', '') || 'An error occurred.');
    } finally { setIsLoading(false); }
  };

  const roles: { key: Role; emoji: string }[] = [
    { key: 'Resident', emoji: '🏠' },
    { key: 'Admin',    emoji: '⚙️' },
    { key: 'Provider', emoji: '🔧' },
    { key: 'Security', emoji: '🛡️' },
  ];

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1, backgroundColor: '#fff' }}>
      {/* Top image banner */}
      <View style={s.topBanner}>
        <Image source={require('../../frontend/assets/society_banner.png')} style={s.bannerImg} resizeMode="cover" />
        <LinearGradient colors={['transparent', '#fff']} style={s.bannerGrad} />
        <View style={s.bannerText}>
          <Text style={s.appName}>🏘️ Panchayat</Text>
          <Text style={s.appTagline}>Community Management</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        {/* Toggle tabs */}
        <View style={s.tabRow}>
          <TouchableOpacity style={[s.tabBtn, isLogin && s.tabBtnActive]} onPress={() => { setIsLogin(true); setError(''); }}>
            <Text style={[s.tabTxt, isLogin && s.tabTxtActive]}>Sign In</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.tabBtn, !isLogin && s.tabBtnActive]} onPress={() => { setIsLogin(false); setError(''); }}>
            <Text style={[s.tabTxt, !isLogin && s.tabTxtActive]}>Sign Up</Text>
          </TouchableOpacity>
        </View>

        {/* Error */}
        {!!error && (
          <View style={s.errorBox}>
            <Text style={s.errorTxt}>{error}</Text>
          </View>
        )}

        {/* Sign Up extra fields */}
        {!isLogin && (
          <>
            <Field label="Full Name" placeholder="Your full name" value={name} onChange={setName} />

            <Text style={s.label}>I am a:</Text>
            <View style={s.roleGrid}>
              {roles.map(({ key, emoji }) => (
                <TouchableOpacity key={key} style={[s.roleBtn, role === key && s.roleBtnActive]} onPress={() => setRole(key)}>
                  <Text style={s.roleEmoji}>{emoji}</Text>
                  <Text style={[s.roleTxt, role === key && s.roleTxtActive]}>{key}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {role === 'Resident' && (
              <>
                <View style={s.infoBox}>
                  <Text style={s.infoTxt}>📋 Get the 6-character society code from your admin.</Text>
                </View>
                <Field label="Society Code" placeholder="e.g. AB3KZ9" value={societyCode} onChange={(v: string) => setSocietyCode(v.toUpperCase())} caps="characters" max={6} />
                <Field label="Flat / Unit No." placeholder="e.g. A-101" value={flatNo} onChange={setFlatNo} />
              </>
            )}
            {role === 'Security' && (
              <>
                <View style={s.infoBox}>
                  <Text style={s.infoTxt}>🛡️ Get the 6-character society code from your admin. Your account will need admin approval.</Text>
                </View>
                <Field label="Society Code" placeholder="e.g. AB3KZ9" value={societyCode} onChange={(v: string) => setSocietyCode(v.toUpperCase())} caps="characters" max={6} />
              </>
            )}
            {role === 'Admin' && (
              <View style={s.infoBox}><Text style={s.infoTxt}>⚙️ After signup, create your society from Admin Dashboard.</Text></View>
            )}
            {role === 'Provider' && (
              <Field label="Service Category" placeholder="e.g. Plumber" value={category} onChange={setCategory} />
            )}
          </>
        )}

        <Field label="Email Address" placeholder="you@email.com" value={email} onChange={setEmail} keyboard="email-address" caps="none" />

        {/* Password with show/hide */}
        <Text style={s.label}>Password</Text>
        <View style={s.pwRow}>
          <TextInput
            style={s.pwInput}
            placeholder="Min 6 characters"
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPass}
            placeholderTextColor="#9ca3af"
          />
          <TouchableOpacity onPress={() => setShowPass(v => !v)} style={s.eyeBtn}>
            {showPass ? <EyeOff color="#9ca3af" size={20} /> : <Eye color="#9ca3af" size={20} />}
          </TouchableOpacity>
        </View>

        {isLogin && (
          <TouchableOpacity style={{ alignSelf: 'flex-end', marginBottom: 16 }}>
            <Text style={{ color: '#10b981', fontWeight: '600', fontSize: 13 }}>Forgot Password?</Text>
          </TouchableOpacity>
        )}

        {/* Submit */}
        <TouchableOpacity onPress={handleAuth} disabled={isLoading} style={s.submitBtn}>
          <LinearGradient colors={['#10b981', '#059669']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.submitGrad}>
            {isLoading ? <ActivityIndicator color="#fff" /> : <Text style={s.submitTxt}>{isLogin ? 'Sign In' : 'Create Account'}</Text>}
          </LinearGradient>
        </TouchableOpacity>

        {/* Switch mode */}
        <TouchableOpacity style={{ alignItems: 'center', marginTop: 20, paddingBottom: 40 }} onPress={() => { setIsLogin(!isLogin); setError(''); }}>
          <Text style={{ color: '#6b7280', fontSize: 14 }}>
            {isLogin ? "Don't have an account? " : 'Already have an account? '}
            <Text style={{ color: '#10b981', fontWeight: '800' }}>{isLogin ? 'Sign Up' : 'Sign In'}</Text>
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ─── Reusable field ───────────────────────────────────────────────────────────
function Field({ label, placeholder, value, onChange, keyboard, caps, max }: any) {
  return (
    <>
      <Text style={s.label}>{label}</Text>
      <TextInput
        style={s.input}
        placeholder={placeholder}
        value={value}
        onChangeText={onChange}
        keyboardType={keyboard || 'default'}
        autoCapitalize={caps || 'sentences'}
        maxLength={max}
        placeholderTextColor="#9ca3af"
      />
    </>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  // Top banner
  topBanner:     { height: 220, position: 'relative' },
  bannerImg:     { width: '100%', height: '100%' },
  bannerGrad:    { position: 'absolute', bottom: 0, left: 0, right: 0, height: 100 },
  bannerText:    { position: 'absolute', bottom: 16, left: 24 },
  appName:       { fontSize: 28, fontWeight: '900', color: '#fff', textShadowColor: 'rgba(0,0,0,0.4)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4 },
  appTagline:    { fontSize: 14, color: '#d1fae5', fontWeight: '600', marginTop: 2 },

  // Scroll
  scroll:        { paddingHorizontal: 24, paddingTop: 8 },

  // Tabs
  tabRow:        { flexDirection: 'row', backgroundColor: '#f3f4f6', borderRadius: 16, padding: 4, marginBottom: 24 },
  tabBtn:        { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 12 },
  tabBtnActive:  { backgroundColor: '#fff', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 3 },
  tabTxt:        { color: '#9ca3af', fontWeight: '700', fontSize: 15 },
  tabTxtActive:  { color: '#10b981' },

  // Error
  errorBox:      { backgroundColor: '#fef2f2', borderRadius: 14, padding: 14, marginBottom: 16, borderLeftWidth: 3, borderLeftColor: '#ef4444' },
  errorTxt:      { color: '#dc2626', fontSize: 13, lineHeight: 20 },

  // Fields
  label:         { fontSize: 13, fontWeight: '700', color: '#374151', marginBottom: 8 },
  input:         { backgroundColor: '#f9fafb', borderRadius: 16, paddingHorizontal: 18, paddingVertical: 16, fontSize: 15, color: '#1f2937', marginBottom: 16, borderWidth: 1.5, borderColor: '#e5e7eb' },

  // Password
  pwRow:         { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f9fafb', borderRadius: 16, borderWidth: 1.5, borderColor: '#e5e7eb', marginBottom: 8, paddingHorizontal: 18 },
  pwInput:       { flex: 1, paddingVertical: 16, fontSize: 15, color: '#1f2937' },
  eyeBtn:        { padding: 8 },

  // Roles
  roleGrid:      { flexDirection: 'row', gap: 8, marginBottom: 16 },
  roleBtn:       { flex: 1, alignItems: 'center', paddingVertical: 14, backgroundColor: '#f9fafb', borderRadius: 16, borderWidth: 2, borderColor: '#e5e7eb' },
  roleBtnActive: { backgroundColor: '#f0fdf4', borderColor: '#10b981' },
  roleEmoji:     { fontSize: 24, marginBottom: 4 },
  roleTxt:       { fontSize: 11, fontWeight: '700', color: '#9ca3af' },
  roleTxtActive: { color: '#10b981' },

  // Info
  infoBox:       { backgroundColor: '#f0fdf4', borderRadius: 14, padding: 14, marginBottom: 16, borderLeftWidth: 3, borderLeftColor: '#10b981' },
  infoTxt:       { color: '#065f46', fontSize: 13, lineHeight: 20 },

  // Submit
  submitBtn:     { borderRadius: 18, overflow: 'hidden', marginTop: 8 },
  submitGrad:    { paddingVertical: 18, alignItems: 'center', borderRadius: 18 },
  submitTxt:     { color: '#fff', fontSize: 17, fontWeight: '800' },
});

// ─── Onboarding styles ────────────────────────────────────────────────────────
const ob = StyleSheet.create({
  imageContainer: { height: height * 0.55, overflow: 'hidden' },
  image:          { width: '100%', height: '100%' },
  imageGrad:      { position: 'absolute', bottom: 0, left: 0, right: 0, height: 120 },
  content:        { paddingHorizontal: 32, paddingTop: 16 },
  title:          { fontSize: 26, fontWeight: '900', color: '#1f2937', marginBottom: 12 },
  subtitle:       { fontSize: 16, color: '#6b7280', lineHeight: 26 },
  controls:       { padding: 24, paddingBottom: 40 },
  dotsRow:        { flexDirection: 'row', justifyContent: 'center', marginBottom: 24, gap: 8 },
  dot:            { width: 8, height: 8, borderRadius: 4, backgroundColor: '#d1d5db' },
  dotActive:      { width: 24, backgroundColor: '#10b981' },
  btnRow:         { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  skipBtn:        { paddingVertical: 14, paddingHorizontal: 24 },
  skipTxt:        { color: '#9ca3af', fontWeight: '700', fontSize: 15 },
  nextBtn:        { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 28, borderRadius: 50, gap: 6 },
  nextTxt:        { color: '#fff', fontWeight: '800', fontSize: 15 },
});
