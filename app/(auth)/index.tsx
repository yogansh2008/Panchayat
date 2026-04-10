import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, Alert, ActivityIndicator
} from 'react-native';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { auth, db } from '../../lib/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { LinearGradient } from 'expo-linear-gradient';
import { validateSocietyCode, requestJoinSociety } from '../../lib/firestore';

export default function AuthScreen() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<'Resident' | 'Admin' | 'Provider' | 'Security'>('Resident');
  const [societyCode, setSocietyCode] = useState('');
  const [flatNo, setFlatNo] = useState('');
  const [category, setCategory] = useState('Plumber');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleAuth = async () => {
    setIsLoading(true);
    setError('');
    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        // --- Signup Flow ---
        if (!name.trim()) throw new Error('Please enter your full name');
        if (!email.trim()) throw new Error('Please enter your email');

        // Resident: validate society code first
        let society: any = null;
        if (role === 'Resident') {
          if (!societyCode.trim()) throw new Error('Please enter your society code');
          if (!flatNo.trim()) throw new Error('Please enter your flat number');
          society = await validateSocietyCode(societyCode.trim());
          if (!society) throw new Error('❌ Invalid society code. Please check with your admin.');
        }

        const cred = await createUserWithEmailAndPassword(auth, email, password);
        const uid = cred.user.uid;

        if (role === 'Resident') {
          // Don't create user doc yet — create a PENDING request instead
          await requestJoinSociety({
            uid,
            name: name.trim(),
            email: email.trim(),
            flatNo: flatNo.trim(),
            societyCode: society.code,
            societyId: society.id,
            societyName: society.name,
          });
          // Create a minimal user doc with 'Pending' status so layout can redirect correctly
          await setDoc(doc(db, 'users', uid), {
            name: name.trim(),
            email: email.trim(),
            role: 'Pending',
            flatNo: flatNo.trim(),
            societyCode: society.code,
            societyName: society.name,
          });
        } else if (role === 'Admin') {
          await setDoc(doc(db, 'users', uid), {
            name: name.trim(),
            email: email.trim(),
            role: 'Admin',
          });
        } else if (role === 'Provider') {
          await setDoc(doc(db, 'users', uid), {
            name: name.trim(),
            email: email.trim(),
            role: 'Provider',
            category: category.trim(),
          });
        } else if (role === 'Security') {
          await setDoc(doc(db, 'users', uid), {
            name: name.trim(),
            email: email.trim(),
            role: 'Security',
          });
        }
      }
    } catch (e: any) {
      setError(e.message?.replace('Firebase: ', '') || 'An error occurred');
      setIsLoading(false);
    }
  };

  const roles: { key: 'Resident' | 'Admin' | 'Provider' | 'Security'; emoji: string }[] = [
    { key: 'Resident', emoji: '🏠' },
    { key: 'Admin', emoji: '⚙️' },
    { key: 'Provider', emoji: '🔧' },
    { key: 'Security', emoji: '🛡️' },
  ];

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
      <LinearGradient colors={['#f0fdfa', '#ccfbf1', '#99f6e4']} style={StyleSheet.absoluteFillObject} />

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.card}>
          <Text style={styles.appName}>🏘️ Panchayat</Text>
          <Text style={styles.tagline}>Community Management</Text>
          <Text style={styles.subtitle}>{isLogin ? 'Welcome back!' : 'Create your account'}</Text>

          {error ? <View style={styles.errorBox}><Text style={styles.error}>{error}</Text></View> : null}

          {!isLogin && (
            <>
              <TextInput style={styles.input} placeholder="Full Name" value={name} onChangeText={setName} />

              <Text style={styles.label}>I am a:</Text>
              <View style={styles.roleGrid}>
                {roles.map(({ key, emoji }) => (
                  <TouchableOpacity
                    key={key}
                    style={[styles.roleBtn, role === key && styles.roleBtnActive]}
                    onPress={() => setRole(key)}
                  >
                    <Text style={styles.roleEmoji}>{emoji}</Text>
                    <Text style={[styles.roleBtnText, role === key && styles.roleBtnTextActive]}>{key}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {role === 'Resident' && (
                <>
                  <View style={styles.infoBox}>
                    <Text style={styles.infoText}>📋 Ask your society admin for the society code before signing up.</Text>
                  </View>
                  <TextInput style={styles.input} placeholder="Society Code (e.g. AB1C2D)" value={societyCode} onChangeText={v => setSocietyCode(v.toUpperCase())} autoCapitalize="characters" />
                  <TextInput style={styles.input} placeholder="Your Flat / Unit No. (e.g. A-101)" value={flatNo} onChangeText={setFlatNo} />
                </>
              )}
              {role === 'Admin' && (
                <View style={styles.infoBox}>
                  <Text style={styles.infoText}>⚙️ After signup, create your society from the Admin Dashboard to get your society code.</Text>
                </View>
              )}
              {role === 'Provider' && (
                <TextInput style={styles.input} placeholder="Service Category (e.g. Plumber)" value={category} onChangeText={setCategory} />
              )}
            </>
          )}

          <TextInput style={styles.input} placeholder="Email Address" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
          <TextInput style={styles.input} placeholder="Password" value={password} onChangeText={setPassword} secureTextEntry />

          <TouchableOpacity style={styles.button} onPress={handleAuth} disabled={isLoading}>
            {isLoading
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.buttonText}>{isLogin ? 'Sign In' : 'Sign Up'}</Text>
            }
          </TouchableOpacity>

          <TouchableOpacity onPress={() => { setIsLogin(!isLogin); setError(''); }} style={styles.switchBtn}>
            <Text style={styles.switchText}>
              {isLogin ? "Don't have an account? " : 'Already have an account? '}
              <Text style={styles.switchLink}>{isLogin ? 'Sign Up' : 'Sign In'}</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: 20, paddingTop: 60 },
  card: { backgroundColor: 'rgba(255,255,255,0.97)', padding: 28, borderRadius: 32, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.08, shadowRadius: 24, elevation: 12 },
  appName: { fontSize: 34, fontWeight: '900', color: '#0f766e', textAlign: 'center' },
  tagline: { fontSize: 14, color: '#0d9488', textAlign: 'center', marginBottom: 4, fontWeight: '600' },
  subtitle: { fontSize: 16, color: '#6b7280', textAlign: 'center', marginBottom: 24 },
  label: { color: '#374151', fontSize: 14, fontWeight: '600', marginBottom: 10 },
  roleGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  roleBtn: { flex: 1, minWidth: '45%', paddingVertical: 12, backgroundColor: '#f3f4f6', borderRadius: 14, alignItems: 'center', borderWidth: 2, borderColor: 'transparent' },
  roleBtnActive: { backgroundColor: '#f0fdfa', borderColor: '#0d9488' },
  roleEmoji: { fontSize: 22, marginBottom: 4 },
  roleBtnText: { color: '#9ca3af', fontSize: 13, fontWeight: '600' },
  roleBtnTextActive: { color: '#0d9488' },
  input: { backgroundColor: '#f3f4f6', borderRadius: 14, padding: 16, marginBottom: 12, fontSize: 16, color: '#1f2937' },
  infoBox: { backgroundColor: '#f0fdf4', borderRadius: 12, padding: 12, marginBottom: 12, borderLeftWidth: 3, borderLeftColor: '#10b981' },
  infoText: { color: '#065f46', fontSize: 13, lineHeight: 20 },
  errorBox: { backgroundColor: '#fef2f2', borderRadius: 12, padding: 12, marginBottom: 12, borderLeftWidth: 3, borderLeftColor: '#ef4444' },
  error: { color: '#dc2626', fontSize: 14, lineHeight: 20 },
  button: { backgroundColor: '#0d9488', padding: 18, borderRadius: 16, alignItems: 'center', marginTop: 8, shadowColor: '#0d9488', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 8, elevation: 5 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  switchBtn: { marginTop: 20, alignItems: 'center' },
  switchText: { color: '#6b7280', fontSize: 15 },
  switchLink: { color: '#0d9488', fontWeight: '700' },
});
