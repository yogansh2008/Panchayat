import React, { useState } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, ArrowRight, Save, CheckCircle, ShieldAlert } from 'lucide-react-native';
import { useAuth } from '../frontend/context/AuthContext';
import { overwriteGuidelines } from '../backend/db/firestore';

const CATEGORIES = [
  "General Rules", "Noise & Discipline", "Parking Rules", "Cleanliness",
  "Pet Rules", "Facility Usage", "Security & Safety", "Events & Social", "Special Rules"
];

const QUESTIONS = [
  // General Rules
  { id: 'q1', category: 'General Rules', title: 'Society Entry & Exit', label: 'What are the society entry and exit timings?' },
  { id: 'q2', category: 'General Rules', title: 'Night Visitors', label: 'Are visitors allowed at night? If yes, till what time?' },
  { id: 'q3', category: 'General Rules', title: 'Security Rules', label: 'What are the security rules for residents and guests?' },
  { id: 'q4', category: 'General Rules', title: 'ID Proofs', label: 'Are ID proofs required for visitors?' },
  
  // Noise & Discipline
  { id: 'q5', category: 'Noise & Discipline', title: 'Noise Timing', label: 'What is the allowed noise timing?' },
  { id: 'q6', category: 'Noise & Discipline', title: 'Parties & Music', label: 'Are loudspeakers or parties allowed?' },
  { id: 'q7', category: 'Noise & Discipline', title: 'Late Night Rules', label: 'Rules for late-night gatherings?' },
  
  // Parking Rules
  { id: 'q8', category: 'Parking Rules', title: 'Vehicle Limits', label: 'How many vehicles are allowed per flat?' },
  { id: 'q9', category: 'Parking Rules', title: 'Guest Parking', label: 'Are guest parking areas available?' },
  { id: 'q10', category: 'Parking Rules', title: 'Unauthorized Parking', label: 'Rules for unauthorized parking?' },

  // Cleanliness
  { id: 'q11', category: 'Cleanliness', title: 'Garbage Disposal', label: 'Garbage disposal timing?' },
  { id: 'q12', category: 'Cleanliness', title: 'Waste Segregation', label: 'Is waste segregation mandatory?' },
  { id: 'q13', category: 'Cleanliness', title: 'Littering Fines', label: 'Fine for littering?' },

  // Pet Rules
  { id: 'q14', category: 'Pet Rules', title: 'Pet Allowed Status', label: 'Are pets allowed?' },
  { id: 'q15', category: 'Pet Rules', title: 'Pet Movement', label: 'Rules for pet movement in society?' },
  { id: 'q16', category: 'Pet Rules', title: 'Pet Hygiene', label: 'Pet hygiene and safety rules?' },

  // Facility Usage
  { id: 'q17', category: 'Facility Usage', title: 'Facility Rules', label: 'Rules for using park, gym, hall?' },
  { id: 'q18', category: 'Facility Usage', title: 'Booking Process', label: 'Booking process for facilities?' },
  { id: 'q19', category: 'Facility Usage', title: 'Time Restrictions', label: 'Time restrictions?' },

  // Security & Safety
  { id: 'q20', category: 'Security & Safety', title: 'Emergency Contacts', label: 'Emergency contact rules?' },
  { id: 'q21', category: 'Security & Safety', title: 'Fire Safety', label: 'Fire safety guidelines?' },
  { id: 'q22', category: 'Security & Safety', title: 'CCTV Rules', label: 'CCTV monitoring rules?' },

  // Events & Social
  { id: 'q23', category: 'Events & Social', title: 'Events Allowed', label: 'Are events allowed in society?' },
  { id: 'q24', category: 'Events & Social', title: 'Organizing Functions', label: 'Rules for organizing functions?' },
  { id: 'q25', category: 'Events & Social', title: 'Permissions', label: 'Permission requirements?' },

  // Special Rules
  { id: 'q26', category: 'Special Rules', title: 'Fines & Penalties', label: 'Any fines or penalties?' },
  { id: 'q27', category: 'Special Rules', title: 'Renovation Work', label: 'Rules for renovation work?' },
  { id: 'q28', category: 'Special Rules', title: 'Delivery Rules', label: 'Delivery rules (Zomato, Amazon etc.)' },
  { id: 'q29', category: 'Special Rules', title: 'Outsiders & Vendors', label: 'Restrictions for outsiders/vendors?' },
  { id: 'q30', category: 'Special Rules', title: 'Custom Rule', label: 'Any additional custom rule?' },
];

export default function AdminGuidelinesScreen() {
  const router = useRouter();
  const { profile } = useAuth();
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [currentCatIndex, setCurrentCatIndex] = useState(0);
  const [saving, setSaving] = useState(false);

  const currentCategory = CATEGORIES[currentCatIndex];
  const questionsInCat = QUESTIONS.filter(q => q.category === currentCategory);

  const handleNext = () => {
    if (currentCatIndex < CATEGORIES.length - 1) {
      setCurrentCatIndex(prev => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentCatIndex > 0) {
      setCurrentCatIndex(prev => prev - 1);
    }
  };

  const handleChange = (id: string, text: string) => {
    setAnswers(prev => ({ ...prev, [id]: text }));
  };

  const handleSave = async () => {
    Alert.alert(
      "Generate Rulebook",
      "This will overwrite any existing guidelines with your new answers. Continue?",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Generate & Save", 
          style: "default",
          onPress: async () => {
            if (!profile?.societyId) return;
            setSaving(true);
            try {
              const ruleDocs = QUESTIONS.map(q => {
                const ans = answers[q.id]?.trim();
                if (!ans) return null;
                return {
                  category: q.category,
                  title: q.title,
                  description: ans,
                  societyCode: profile.societyCode || ''
                };
              }).filter(Boolean);

              if (ruleDocs.length === 0) {
                Alert.alert("No Data", "Please answer at least one question to generate guidelines.");
                setSaving(false);
                return;
              }

              await overwriteGuidelines(profile.societyId, ruleDocs);
              Alert.alert("Success", "Clean Guideline Book successfully generated!", [
                { text: "OK", onPress: () => router.back() }
              ]);
            } catch (e: any) {
              Alert.alert("Error", e.message || "Failed to generate guidelines.");
            }
            setSaving(false);
          }
        }
      ]
    );
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft color="#1f2937" size={24} />
        </TouchableOpacity>
        <View style={styles.headerTextContainer}>
          <Text style={styles.title}>Rulebook Generator</Text>
          <Text style={styles.subtitle}>Step {currentCatIndex + 1} of {CATEGORIES.length} • {currentCategory}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.infoCard}>
          <ShieldAlert color="#0ea5e9" size={24} />
          <Text style={styles.infoText}>
            Fill out these questions to automatically generate a structured guideline book for your residents and train your AI assistant. Leave any question blank to skip it.
          </Text>
        </View>

        <View style={styles.formContainer}>
          <Text style={styles.categoryTitle}>{currentCategory}</Text>
          {questionsInCat.map((q, index) => (
            <View key={q.id} style={styles.inputGroup}>
              <Text style={styles.label}>{index + 1}. {q.label}</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Visitors allowed till 11 PM..."
                placeholderTextColor="#9ca3af"
                value={answers[q.id] || ''}
                onChangeText={(text) => handleChange(q.id, text)}
                multiline
              />
            </View>
          ))}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity 
          style={[styles.footerBtn, currentCatIndex === 0 && styles.disabledBtn]} 
          onPress={handlePrev}
          disabled={currentCatIndex === 0}
        >
          <Text style={[styles.footerBtnText, currentCatIndex === 0 && styles.disabledBtnText]}>Previous</Text>
        </TouchableOpacity>

        {currentCatIndex < CATEGORIES.length - 1 ? (
          <TouchableOpacity style={[styles.footerBtn, styles.primaryBtn]} onPress={handleNext}>
            <Text style={styles.primaryBtnText}>Next</Text>
            <ArrowRight color="#fff" size={18} style={{ marginLeft: 6 }} />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={[styles.footerBtn, styles.saveBtn]} onPress={handleSave} disabled={saving}>
            {saving ? <ActivityIndicator color="#fff" /> : (
              <>
                <CheckCircle color="#fff" size={18} style={{ marginRight: 6 }} />
                <Text style={styles.saveBtnText}>Generate Book</Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 20, paddingTop: 60, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  backBtn: { marginRight: 15 },
  headerTextContainer: { flex: 1 },
  title: { fontSize: 20, fontWeight: '700', color: '#1f2937' },
  subtitle: { fontSize: 13, color: '#6b7280', marginTop: 2 },
  
  scrollContent: { padding: 20, paddingBottom: 40 },
  infoCard: { flexDirection: 'row', backgroundColor: '#e0f2fe', padding: 16, borderRadius: 12, marginBottom: 20, alignItems: 'center' },
  infoText: { flex: 1, marginLeft: 12, color: '#0369a1', fontSize: 14, lineHeight: 20 },
  
  formContainer: { backgroundColor: '#fff', padding: 20, borderRadius: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 },
  categoryTitle: { fontSize: 18, fontWeight: '700', color: '#111827', marginBottom: 20, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  
  inputGroup: { marginBottom: 20 },
  label: { fontSize: 15, fontWeight: '600', color: '#374151', marginBottom: 8 },
  input: { backgroundColor: '#f9fafb', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 12, padding: 14, fontSize: 15, color: '#1f2937', minHeight: 80, textAlignVertical: 'top' },
  
  footer: { flexDirection: 'row', padding: 16, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#e5e7eb', justifyContent: 'space-between' },
  footerBtn: { paddingVertical: 14, paddingHorizontal: 20, borderRadius: 12, minWidth: 100, alignItems: 'center', justifyContent: 'center' },
  disabledBtn: { backgroundColor: '#f3f4f6' },
  footerBtnText: { color: '#374151', fontWeight: '600', fontSize: 15 },
  disabledBtnText: { color: '#9ca3af' },
  
  primaryBtn: { backgroundColor: '#0ea5e9', flexDirection: 'row', alignItems: 'center' },
  primaryBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  
  saveBtn: { backgroundColor: '#10b981', flexDirection: 'row', alignItems: 'center', flex: 1, marginLeft: 16 },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
