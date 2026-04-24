import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, Alert, TextInput
} from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, Shield, Plus, Trash2 } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../frontend/context/AuthContext';
import { createSecurityId, subscribeToSecurityIds, deleteSecurityId } from '../backend/db/firestore';

export default function AdminSecurityScreen() {
  const router = useRouter();
  const { profile } = useAuth();
  
  const [ids, setIds] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [customCode, setCustomCode] = useState('');

  useEffect(() => {
    if (!profile?.societyId) return;
    const unsub = subscribeToSecurityIds(profile.societyId, (data) => {
      setIds(data);
      setLoading(false);
    });
    return () => unsub();
  }, [profile?.societyId]);

  const handleGenerate = async () => {
    if (!profile?.societyId || !profile?.societyCode) return;
    setSaving(true);
    try {
      const code = customCode.trim() ? customCode.trim().toUpperCase() : `SEC-${Math.floor(1000 + Math.random() * 9000)}`;
      await createSecurityId(profile.societyId, profile.societyCode, code);
      Alert.alert('Success', `Security ID created: ${code}`);
      setCustomCode('');
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
    setSaving(false);
  };

  const handleRevoke = (id: string, code: string) => {
    Alert.alert('Revoke ID', `Are you sure you want to revoke access for ID: ${code}?`, [
      { text: 'Cancel', style: 'cancel' },
      { 
        text: 'Revoke', 
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteSecurityId(id);
          } catch (e: any) {
            Alert.alert('Error', e.message);
          }
        }
      }
    ]);
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#1e3a8a', '#3b82f6']} style={styles.headerGrad}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft color="#fff" size={22} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Security Setup</Text>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.infoBox}>
          <Shield color="#3b82f6" size={28} />
          <View style={{ flex: 1, marginLeft: 16 }}>
            <Text style={styles.infoTitle}>Security Guards Authorization</Text>
            <Text style={styles.infoDesc}>
              Create a unique Security ID Code below. Security personnel must enter this code along with your Society Code ({profile?.societyCode}) when signing up.
            </Text>
          </View>
        </View>

        <View style={styles.inputBox}>
          <TextInput 
            style={styles.customInput} 
            placeholder="Enter Custom ID (e.g. GUARD-1)" 
            value={customCode} 
            onChangeText={setCustomCode} 
            autoCapitalize="characters"
          />
          <TouchableOpacity style={styles.generateBtn} onPress={handleGenerate} disabled={saving}>
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Plus color="#fff" size={20} />
                <Text style={styles.generateTxt}>Add ID</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionTitle}>Active Security IDs ({ids.length})</Text>
        
        {loading ? (
          <ActivityIndicator size="large" color="#3b82f6" style={{ marginTop: 40 }} />
        ) : ids.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyText}>No Security IDs generated yet.</Text>
          </View>
        ) : (
          ids.map((item) => (
            <View key={item.id} style={styles.idCard}>
              <View style={{ flex: 1 }}>
                <Text style={styles.idCode}>{item.code}</Text>
                <Text style={styles.idDate}>Generated On: {item.createdAt?.toDate ? item.createdAt.toDate().toLocaleDateString() : 'Just now'}</Text>
              </View>
              <TouchableOpacity style={styles.revokeBtn} onPress={() => handleRevoke(item.id, item.code)}>
                <Trash2 color="#ef4444" size={20} />
              </TouchableOpacity>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f1f5f9' },
  headerGrad: { flexDirection: 'row', alignItems: 'center', paddingTop: 56, paddingBottom: 20, paddingHorizontal: 20, gap: 12 },
  backBtn: { padding: 4 },
  headerTitle: { color: '#fff', fontSize: 20, fontWeight: '800' },
  
  scroll: { padding: 20, paddingBottom: 80 },
  infoBox: { backgroundColor: '#fff', borderRadius: 16, padding: 20, flexDirection: 'row', alignItems: 'flex-start', shadowColor: '#000', shadowOffset: { width:0, height:2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2, marginBottom: 20 },
  infoTitle: { fontSize: 16, fontWeight: '800', color: '#1e293b', marginBottom: 4 },
  infoDesc: { fontSize: 13, color: '#64748b', lineHeight: 20 },
  
  inputBox: { flexDirection: 'row', gap: 10, marginBottom: 30 },
  customInput: { flex: 1, backgroundColor: '#fff', borderRadius: 14, paddingHorizontal: 16, fontSize: 15, fontWeight: '600', color: '#1e293b', borderWidth: 1, borderColor: '#e2e8f0' },
  
  generateBtn: { backgroundColor: '#3b82f6', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20, paddingVertical: 14, borderRadius: 14, gap: 8, shadowColor: '#3b82f6', shadowOffset: { width:0, height:4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
  generateTxt: { color: '#fff', fontSize: 15, fontWeight: '800' },
  
  sectionTitle: { fontSize: 18, fontWeight: '800', color: '#1e293b', marginBottom: 12 },
  
  emptyBox: { padding: 40, alignItems: 'center' },
  emptyText: { color: '#94a3b8', fontSize: 14, fontWeight: '600' },
  
  idCard: { backgroundColor: '#fff', borderRadius: 16, padding: 16, flexDirection: 'row', alignItems: 'center', marginBottom: 12, borderLeftWidth: 4, borderLeftColor: '#10b981', shadowColor: '#000', shadowOffset: { width:0, height:2 }, shadowOpacity: 0.03, shadowRadius: 6, elevation: 2 },
  idCode: { fontSize: 18, fontWeight: '900', color: '#1e293b', letterSpacing: 1 },
  idDate: { fontSize: 12, color: '#94a3b8', marginTop: 4, fontWeight: '600' },
  revokeBtn: { padding: 10, backgroundColor: '#fef2f2', borderRadius: 10 },
});
