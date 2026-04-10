import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Image, ScrollView, Linking, ActivityIndicator } from 'react-native';
import { PhoneCall, MapPin, Star } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { fetchData, subscribeToData, COLLECTIONS } from '../../lib/firestore';

const CATEGORIES = ['All', 'Plumber', 'Electrician', 'Cleaner', 'Grocery', 'Doctor'];

export default function ServicesScreen() {
  const router = useRouter();
  const [activeCategory, setActiveCategory] = useState('All');
  const [services, setServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = subscribeToData(COLLECTIONS.SERVICES, (data) => {
      setServices(data);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const filteredServices = activeCategory === 'All' 
    ? services 
    : services.filter(s => s.category === activeCategory);

  const renderServiceCard = ({ item }: any) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View>
          <Text style={styles.name}>{item.name}</Text>
          <Text style={styles.category}>{item.category}</Text>
        </View>
        <View style={styles.ratingBadge}>
          <Star color="#f59e0b" size={16} fill="#f59e0b" />
          <Text style={styles.ratingText}>{item.rating}</Text>
        </View>
      </View>
      
      <View style={styles.cardInfo}>
        <MapPin color="#6b7280" size={16} />
        <Text style={styles.infoText}>{item.location}</Text>
      </View>

      <View style={styles.cardActions}>
        <TouchableOpacity style={styles.actionBtnCall} onPress={() => Linking.openURL(`tel:${item.phone}`)}>
          <PhoneCall color="#fff" size={18} />
          <Text style={styles.actionTextCall}>Call Now</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtnMap} onPress={() => router.push('/(tabs)/map' as any)}>
          <MapPin color="#10b981" size={18} />
          <Text style={styles.actionTextMap}>Map</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Services Directory</Text>
      </View>

      <View style={styles.catContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {CATEGORIES.map(cat => (
            <TouchableOpacity 
              key={cat} 
              style={[styles.catBadge, activeCategory === cat && styles.catBadgeActive]}
              onPress={() => setActiveCategory(cat)}
            >
              <Text style={[styles.catText, activeCategory === cat && styles.catTextActive]}>{cat}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <FlatList
        data={filteredServices}
        keyExtractor={item => item.id}
        renderItem={renderServiceCard}
        contentContainerStyle={styles.listContainer}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  header: { padding: 24, paddingTop: 60, backgroundColor: '#fff' },
  title: { fontSize: 28, fontWeight: '800', color: '#1f2937' },
  catContainer: { backgroundColor: '#fff', paddingBottom: 15, paddingHorizontal: 24 },
  catBadge: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20, backgroundColor: '#f3f4f6', marginRight: 10 },
  catBadgeActive: { backgroundColor: '#10b981' },
  catText: { color: '#6b7280', fontWeight: '600' },
  catTextActive: { color: '#fff' },
  listContainer: { padding: 24 },
  card: { backgroundColor: '#fff', padding: 20, borderRadius: 20, marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  name: { fontSize: 18, fontWeight: '700', color: '#1f2937' },
  category: { color: '#10b981', fontSize: 14, fontWeight: '600', marginTop: 4 },
  ratingBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fffbeb', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12 },
  ratingText: { color: '#b45309', fontWeight: 'bold', marginLeft: 4 },
  cardInfo: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  infoText: { color: '#6b7280', marginLeft: 8 },
  cardActions: { flexDirection: 'row', justifyContent: 'space-between' },
  actionBtnCall: { flex: 1, backgroundColor: '#10b981', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', padding: 12, borderRadius: 12, marginRight: 10 },
  actionTextCall: { color: '#fff', fontWeight: '700', marginLeft: 8 },
  actionBtnMap: { flex: 1, backgroundColor: '#ecfdf5', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', padding: 12, borderRadius: 12 },
  actionTextMap: { color: '#10b981', fontWeight: '700', marginLeft: 8 },
});
