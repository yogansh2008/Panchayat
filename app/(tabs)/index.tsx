import React, { useState } from 'react';
import { View, StyleSheet, Dimensions, TextInput } from 'react-native';
import { Search } from 'lucide-react-native';
import MapComponent from '../../components/MapComponent';

export default function MapScreen() {
  const [search, setSearch] = useState('');

  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <Search color="#9ca3af" size={20} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search locations..."
          value={search}
          onChangeText={setSearch}
        />
      </View>

      <MapComponent />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  searchContainer: {
    position: 'absolute',
    top: 60,
    left: 24,
    right: 24,
    zIndex: 1,
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  searchInput: { flex: 1, marginLeft: 10, fontSize: 16 },
});
