import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Switch,
  ScrollView, FlatList, Alert, ActivityIndicator,
} from 'react-native';
import { useAuth } from '../frontend/context/AuthContext';
import { auth } from '../backend/config/firebase';
import { User, Briefcase, Star, Clock, LogOut, CheckCircle, XCircle, Package } from 'lucide-react-native';
import {
  subscribeToData, subscribeProviderRequests,
  updateProviderAvailability, acceptServiceRequest,
  completeServiceRequest, COLLECTIONS,
} from '../backend/db/firestore';

export default function ServiceProviderScreen() {
  const { profile, user } = useAuth();
  const [isAvailable, setIsAvailable] = useState(true);
  const [requests, setRequests] = useState<any[]>([]);
  const [completedCount, setCompletedCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = subscribeToData(COLLECTIONS.REQUESTS, (data) => {
      const mine     = data.filter(r => r.providerId === user?.uid || r.status === 'Open');
      const accepted = data.filter(r => r.providerId === user?.uid && r.status !== 'Completed');
      const done     = data.filter(r => r.providerId === user?.uid && r.status === 'Completed');
      setRequests(mine);
      setCompletedCount(done.length);
      setLoading(false);
    });
    return () => unsub();
  }, [user?.uid]);

  const toggleAvailability = async (val: boolean) => {
    setIsAvailable(val);
    if (user?.uid) {
      await updateProviderAvailability(user.uid, val);
    }
  };

  const handleAccept = async (id: string) => {
    if (!user?.uid) return;
    try {
      await acceptServiceRequest(id, user.uid);
      Alert.alert('Accepted!', 'You have accepted this service request.');
    } catch {
      Alert.alert('Error', 'Could not accept request.');
    }
  };

  const handleComplete = async (id: string) => {
    try {
      await completeServiceRequest(id);
      Alert.alert('Done!', 'Request marked as completed.');
    } catch {
      Alert.alert('Error', 'Could not mark as completed.');
    }
  };

  const renderRequest = ({ item }: any) => {
    const isAcceptedByMe = item.providerId === user?.uid && item.status === 'Accepted';
    const isOpen        = item.status === 'Open';

    return (
      <View style={styles.reqCard}>
        <View style={styles.reqTop}>
          <Package color="#0d9488" size={20} />
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.reqTitle}>{item.title}</Text>
            <Text style={styles.reqMeta}>Flat {item.flatNo || 'N/A'} • {item.category || 'General'}</Text>
          </View>
          <View style={[styles.badge, item.status === 'Completed' ? styles.badgeDone : item.status === 'Accepted' ? styles.badgeAccepted : styles.badgeOpen]}>
            <Text style={styles.badgeText}>{item.status}</Text>
          </View>
        </View>
        {item.desc ? <Text style={styles.reqDesc}>{item.desc}</Text> : null}
        <View style={styles.reqActions}>
          {isOpen && (
            <TouchableOpacity style={styles.acceptBtn} onPress={() => handleAccept(item.id)}>
              <CheckCircle color="#fff" size={16} />
              <Text style={styles.acceptText}> Accept</Text>
            </TouchableOpacity>
          )}
          {isAcceptedByMe && (
            <TouchableOpacity style={styles.completeBtn} onPress={() => handleComplete(item.id)}>
              <CheckCircle color="#fff" size={16} />
              <Text style={styles.acceptText}> Mark Complete</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Provider Dashboard</Text>
        <TouchableOpacity onPress={() => auth.signOut()}>
          <LogOut color="#ef4444" size={24} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.avatarBox}>
            <User color="#10b981" size={40} />
          </View>
          <Text style={styles.name}>{profile?.name || 'Service Provider'}</Text>
          <Text style={styles.category}>{profile?.category || 'General Service'}</Text>

          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <Briefcase color="#6b7280" size={20} />
              <Text style={styles.statVal}>{completedCount}</Text>
              <Text style={styles.statLabel}>Completed</Text>
            </View>
            <View style={styles.statBox}>
              <Star color="#f59e0b" size={20} />
              <Text style={styles.statVal}>4.8</Text>
              <Text style={styles.statLabel}>Rating</Text>
            </View>
            <View style={styles.statBox}>
              <Clock color="#3b82f6" size={20} />
              <Text style={styles.statVal}>{requests.filter(r => r.status === 'Open').length}</Text>
              <Text style={styles.statLabel}>Open</Text>
            </View>
          </View>

          <View style={styles.statusRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Clock color={isAvailable ? '#10b981' : '#ef4444'} size={20} />
              <Text style={styles.statusText}>{isAvailable ? 'Available Now' : 'Currently Busy'}</Text>
            </View>
            <Switch
              value={isAvailable}
              onValueChange={toggleAvailability}
              trackColor={{ true: '#10b981', false: '#d1d5db' }}
            />
          </View>
        </View>

        {/* Requests */}
        <Text style={styles.sectionTitle}>
          Service Requests ({requests.filter(r => r.status !== 'Completed').length} active)
        </Text>
        {loading ? (
          <ActivityIndicator color="#0d9488" style={{ marginTop: 20 }} />
        ) : requests.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyText}>No service requests right now.</Text>
          </View>
        ) : (
          requests.map(item => <View key={item.id}>{renderRequest({ item })}</View>)
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container:      { flex: 1, backgroundColor: '#f9fafb' },
  header:         { padding: 24, paddingTop: 60, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  title:          { fontSize: 24, fontWeight: 'bold', color: '#1f2937' },
  profileCard:    { backgroundColor: '#fff', margin: 24, padding: 24, borderRadius: 24, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 12, elevation: 3 },
  avatarBox:      { width: 80, height: 80, borderRadius: 40, backgroundColor: '#ecfdf5', justifyContent: 'center', alignItems: 'center', marginBottom: 15 },
  name:           { fontSize: 22, fontWeight: 'bold', color: '#1f2937' },
  category:       { fontSize: 16, color: '#6b7280', marginTop: 4, marginBottom: 20 },
  statsRow:       { flexDirection: 'row', justifyContent: 'space-around', width: '100%', borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#f3f4f6', paddingVertical: 15, marginBottom: 20 },
  statBox:        { alignItems: 'center' },
  statVal:        { fontSize: 18, fontWeight: 'bold', color: '#1f2937', marginTop: 5 },
  statLabel:      { fontSize: 12, color: '#9ca3af' },
  statusRow:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%', backgroundColor: '#f9fafb', padding: 15, borderRadius: 16 },
  statusText:     { fontSize: 16, fontWeight: '600', color: '#374151', marginLeft: 10 },
  sectionTitle:   { fontSize: 18, fontWeight: 'bold', color: '#1f2937', marginHorizontal: 24, marginBottom: 12 },
  reqCard:        { backgroundColor: '#fff', marginHorizontal: 24, marginBottom: 14, padding: 20, borderRadius: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 },
  reqTop:         { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  reqTitle:       { fontSize: 16, fontWeight: '700', color: '#1f2937' },
  reqMeta:        { fontSize: 13, color: '#6b7280', marginTop: 2 },
  reqDesc:        { fontSize: 14, color: '#4b5563', marginBottom: 12, lineHeight: 20 },
  reqActions:     { flexDirection: 'row' },
  badge:          { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  badgeOpen:      { backgroundColor: '#fef3c7' },
  badgeAccepted:  { backgroundColor: '#dbeafe' },
  badgeDone:      { backgroundColor: '#d1fae5' },
  badgeText:      { fontSize: 12, fontWeight: '700', color: '#374151' },
  acceptBtn:      { flexDirection: 'row', backgroundColor: '#10b981', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, alignItems: 'center', marginRight: 10 },
  completeBtn:    { flexDirection: 'row', backgroundColor: '#3b82f6', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, alignItems: 'center' },
  acceptText:     { color: '#fff', fontWeight: '700', fontSize: 14 },
  emptyBox:       { alignItems: 'center', padding: 40 },
  emptyText:      { color: '#9ca3af', fontSize: 16 },
});
