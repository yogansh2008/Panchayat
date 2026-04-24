import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, LayoutAnimation, Platform, UIManager } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, ChevronDown, ChevronUp, BookOpen, Car, Shield, Calendar, Info, Volume2, Dog, Wind, Wrench } from 'lucide-react-native';
import { subscribeToGuidelines } from '../backend/db/firestore';
import { useAuth } from '../frontend/context/AuthContext';
import { LinearGradient } from 'expo-linear-gradient';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const mapCategoryToIcon = (cat: string) => {
  switch (cat) {
    case 'General Rules': return BookOpen;
    case 'Noise & Discipline': return Volume2;
    case 'Parking Rules': return Car;
    case 'Cleanliness': return Wind;
    case 'Pet Rules': return Dog;
    case 'Facility Usage': return BookOpen;
    case 'Security & Safety': return Shield;
    case 'Events & Social': return Calendar;
    case 'Special Rules': return Wrench;
    default: return Info;
  }
};

const mapCategoryToColor = (cat: string) => {
  switch (cat) {
    case 'General Rules': return '#3b82f6';
    case 'Noise & Discipline': return '#f59e0b';
    case 'Parking Rules': return '#6366f1';
    case 'Cleanliness': return '#10b981';
    case 'Pet Rules': return '#ec4899';
    case 'Facility Usage': return '#0ea5e9';
    case 'Security & Safety': return '#ef4444';
    case 'Events & Social': return '#8b5cf6';
    case 'Special Rules': return '#14b8a6';
    default: return '#6b7280';
  }
};

type CategoryGroup = {
  category: string;
  items: any[];
};

export default function RulesScreen() {
  const router = useRouter();
  const [guidelines, setGuidelines] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedCats, setExpandedCats] = useState<Record<string, boolean>>({});

  const { profile } = useAuth();
  const societyId = profile?.societyId || '';

  useEffect(() => {
    if (!societyId) { setLoading(false); return; }
    const unsub = subscribeToGuidelines(societyId, (data) => {
      setGuidelines(data);
      setLoading(false);
    });
    return () => unsub();
  }, [societyId]);

  const grouped = guidelines.reduce((res: Record<string, any[]>, curr) => {
    const cat = curr.category || 'General Rules';
    if (!res[cat]) res[cat] = [];
    res[cat].push(curr);
    return res;
  }, {});

  const groups: CategoryGroup[] = Object.keys(grouped).map(cat => ({
    category: cat,
    items: grouped[cat]
  }));

  const toggleCat = (cat: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedCats(prev => ({ ...prev, [cat]: !prev[cat] }));
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#4f46e5', '#3b82f6']} style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft color="#fff" size={24} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Society Rulebook</Text>
          <Text style={styles.subtitle}>Official guidelines & rules</Text>
        </View>
      </LinearGradient>

      {loading ? (
        <ActivityIndicator size="large" color="#3b82f6" style={{ marginTop: 40 }} />
      ) : guidelines.length === 0 ? (
        <View style={styles.empty}>
          <BookOpen color="#cbd5e1" size={60} />
          <Text style={styles.emptyTitle}>No Guidelines Yet</Text>
          <Text style={styles.emptySub}>Your society admin hasn't generated the rulebook yet.</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scroll}>
          {groups.map((g, i) => {
            const isExp = !!expandedCats[g.category];
            const IconGroup = mapCategoryToIcon(g.category);
            const colorGroup = mapCategoryToColor(g.category);
            
            return (
              <View key={i} style={styles.card}>
                <TouchableOpacity 
                  style={[styles.cardHeader, isExp && styles.cardHeaderExp]} 
                  onPress={() => toggleCat(g.category)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.iconBox, { backgroundColor: colorGroup + '1A' }]}>
                    <IconGroup color={colorGroup} size={22} />
                  </View>
                  <Text style={styles.catTitle}>{g.category}</Text>
                  {isExp ? <ChevronUp color="#9ca3af" size={20} /> : <ChevronDown color="#9ca3af" size={20} />}
                </TouchableOpacity>

                {isExp && (
                  <View style={styles.rulesList}>
                    {g.items.map((item, idx) => (
                      <View key={item.id} style={[styles.ruleItem, idx === g.items.length - 1 && { borderBottomWidth: 0 }]}>
                        <Text style={styles.ruleTitle}>{item.title}</Text>
                        <Text style={styles.ruleDesc}>{item.description}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f1f5f9' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 20, paddingTop: 60, paddingBottom: 25 },
  backBtn: { marginRight: 16 },
  title: { fontSize: 22, fontWeight: '800', color: '#fff' },
  subtitle: { fontSize: 13, color: '#bfdbfe', marginTop: 2, fontWeight: '500' },
  
  scroll: { padding: 16, paddingBottom: 40 },
  card: { backgroundColor: '#fff', borderRadius: 16, marginBottom: 14, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 2 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', padding: 16 },
  cardHeaderExp: { borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  iconBox: { width: 42, height: 42, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 14 },
  catTitle: { flex: 1, fontSize: 17, fontWeight: '700', color: '#1e293b' },
  
  rulesList: { backgroundColor: '#f8fafc' },
  ruleItem: { padding: 16, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  ruleTitle: { fontSize: 15, fontWeight: '700', color: '#334155', marginBottom: 4 },
  ruleDesc: { fontSize: 14, color: '#64748b', lineHeight: 22 },

  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: '#475569', marginTop: 16, marginBottom: 8 },
  emptySub: { fontSize: 14, color: '#94a3b8', textAlign: 'center', lineHeight: 20 }
});
