import React, { useState, useEffect } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  ScrollView, Linking, ActivityIndicator, ImageBackground,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { PhoneCall, MapPin, Star, Search } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { subscribeToData, COLLECTIONS } from '../../backend/db/firestore';
import { useAuth } from '../../frontend/context/AuthContext';

const CATEGORIES = ['All', 'Plumber', 'Electrician', 'Cleaner', 'Grocery', 'Doctor'];

const CAT_COLOR: Record<string, string> = {
  Plumber:     '#3b82f6',
  Electrician: '#f59e0b',
  Cleaner:     '#10b981',
  Grocery:     '#8b5cf6',
  Doctor:      '#ef4444',
  Other:       '#6b7280',
};

const CAT_EMOJI: Record<string, string> = {
  Plumber:     '🔧',
  Electrician: '⚡',
  Cleaner:     '🧹',
  Grocery:     '🛒',
  Doctor:      '🏥',
  Other:       '⭐',
};

export default function ServicesScreen() {
  const router = useRouter();
  const [activeCategory, setActiveCategory] = useState('All');
  const [services, setServices]             = useState<any[]>([]);
  const [loading, setLoading]               = useState(true);

  const { profile } = useAuth();
  const societyId = profile?.societyId || '';

  useEffect(() => {
    if (!societyId) { setLoading(false); return; }
    const unsub = subscribeToData(COLLECTIONS.SERVICES, (data) => {
      setServices(data);
      setLoading(false);
    }, [{ field: 'societyId', op: '==', value: societyId }]);
    return () => unsub();
  }, [societyId]);

  const filtered = activeCategory === 'All'
    ? services
    : services.filter(s => s.category === activeCategory);

  const renderCard = ({ item }: any) => {
    const color = CAT_COLOR[item.category] || '#6b7280';
    const emoji = CAT_EMOJI[item.category] || '⭐';

    return (
      <View style={styles.card}>
        {/* Image / Color band */}
        <LinearGradient colors={[color, color + 'bb']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.cardBand}>
          <Text style={styles.cardEmoji}>{emoji}</Text>
          <View>
            <Text style={styles.cardCat}>{item.category}</Text>
            {item.available !== false && (
              <View style={styles.availBadge}>
                <Text style={styles.availTxt}>● Available</Text>
              </View>
            )}
          </View>
          <View style={[styles.ratingBox]}>
            <Star color="#fff" size={14} fill="#fff" />
            <Text style={styles.ratingTxt}>{item.rating || '5.0'}</Text>
          </View>
        </LinearGradient>

        {/* Info */}
        <View style={styles.cardInfo}>
          <Text style={styles.serviceName}>{item.name}</Text>
          {item.location && (
            <View style={styles.locationRow}>
              <MapPin color="#94a3b8" size={14} />
              <Text style={styles.locationTxt}>{item.location}</Text>
            </View>
          )}
          {item.desc && <Text style={styles.serviceDesc} numberOfLines={2}>{item.desc}</Text>}
        </View>

        {/* Actions */}
        <View style={styles.cardActions}>
          <TouchableOpacity
            style={[styles.callBtn, { backgroundColor: color }]}
            onPress={() => Linking.openURL(`tel:${item.phone}`)}
          >
            <PhoneCall color="#fff" size={16} />
            <Text style={styles.callTxt}>Call Now</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.mapBtn}
            onPress={() => router.push('/(tabs)/map' as any)}
          >
            <MapPin color={color} size={16} />
            <Text style={[styles.mapTxt, { color }]}>Map</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header with services image */}
      <ImageBackground
        source={require('../../frontend/assets/services.png')}
        style={styles.header}
        resizeMode="cover"
      >
        <LinearGradient colors={['rgba(14,165,233,0.8)', 'rgba(3,105,161,0.9)']} style={styles.headerGrad}>
          <Text style={styles.headerTitle}>Services Directory</Text>
          <Text style={styles.headerSub}>On-demand help for your home</Text>
        </LinearGradient>
      </ImageBackground>

      {/* Category chips */}
      <View style={styles.catBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 12, gap: 8 }}>
          {CATEGORIES.map(cat => {
            const active = activeCategory === cat;
            const color  = CAT_COLOR[cat] || '#10b981';
            return (
              <TouchableOpacity
                key={cat}
                style={[styles.catChip, active && { backgroundColor: color, borderColor: color }]}
                onPress={() => setActiveCategory(cat)}
              >
                {cat !== 'All' && <Text style={{ fontSize: 14 }}>{CAT_EMOJI[cat]}</Text>}
                <Text style={[styles.catTxt, active && styles.catTxtActive]}>{cat}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Results count */}
      <View style={styles.resultsRow}>
        <Text style={styles.resultsTxt}>{filtered.length} service{filtered.length !== 1 ? 's' : ''} found</Text>
      </View>

      {/* List */}
      {loading ? (
        <ActivityIndicator size="large" color="#0ea5e9" style={{ marginTop: 60 }} />
      ) : filtered.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyEmoji}>🔍</Text>
          <Text style={styles.emptyTitle}>No services found</Text>
          <Text style={styles.emptyTxt}>Your admin hasn't added any {activeCategory === 'All' ? '' : activeCategory.toLowerCase()} services yet.</Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={item => item.id}
          renderItem={renderCard}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container:    { flex: 1, backgroundColor: '#f8fafc' },

  // Header
  header:       { height: 160 },
  headerGrad:   { flex: 1, justifyContent: 'flex-end', padding: 20, paddingTop: 56 },
  headerTitle:  { color: '#fff', fontSize: 26, fontWeight: '900' },
  headerSub:    { color: 'rgba(255,255,255,0.8)', fontSize: 14, marginTop: 4 },

  // Categories
  catBar:       { backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  catChip:      { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 9, backgroundColor: '#f1f5f9', borderRadius: 20, borderWidth: 1.5, borderColor: 'transparent' },
  catTxt:       { color: '#64748b', fontWeight: '700', fontSize: 13 },
  catTxtActive: { color: '#fff' },

  // Results
  resultsRow:   { paddingHorizontal: 20, paddingVertical: 10 },
  resultsTxt:   { color: '#94a3b8', fontSize: 13, fontWeight: '600' },

  // Empty
  empty:        { alignItems: 'center', paddingTop: 60, paddingHorizontal: 40 },
  emptyEmoji:   { fontSize: 48 },
  emptyTitle:   { fontSize: 18, fontWeight: '700', color: '#64748b', marginTop: 12 },
  emptyTxt:     { color: '#94a3b8', textAlign: 'center', marginTop: 8, lineHeight: 22 },

  // List
  list:         { padding: 16, paddingBottom: 120 },

  // Card
  card:         { backgroundColor: '#fff', borderRadius: 24, marginBottom: 16, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 16, elevation: 5 },
  cardBand:     { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 18, gap: 14 },
  cardEmoji:    { fontSize: 32 },
  cardCat:      { color: '#fff', fontWeight: '800', fontSize: 15 },
  availBadge:   { backgroundColor: 'rgba(255,255,255,0.25)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, marginTop: 4, alignSelf: 'flex-start' },
  availTxt:     { color: '#fff', fontSize: 11, fontWeight: '600' },
  ratingBox:    { flexDirection: 'row', alignItems: 'center', gap: 4, marginLeft: 'auto', backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12 },
  ratingTxt:    { color: '#fff', fontWeight: '800' },
  cardInfo:     { padding: 18, paddingBottom: 4 },
  serviceName:  { fontSize: 18, fontWeight: '900', color: '#1e293b', marginBottom: 6 },
  locationRow:  { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 6 },
  locationTxt:  { color: '#94a3b8', fontSize: 13 },
  serviceDesc:  { color: '#64748b', fontSize: 13, lineHeight: 20 },
  cardActions:  { flexDirection: 'row', padding: 16, gap: 12 },
  callBtn:      { flex: 2, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, paddingVertical: 14, borderRadius: 16 },
  callTxt:      { color: '#fff', fontWeight: '700', fontSize: 14 },
  mapBtn:       { flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, paddingVertical: 14, borderRadius: 16, backgroundColor: '#f8fafc', borderWidth: 1.5, borderColor: '#e2e8f0' },
  mapTxt:       { fontWeight: '700', fontSize: 14 },
});
