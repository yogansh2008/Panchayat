import React from 'react';
import { Dimensions, StyleSheet } from 'react-native';
import MapView, { Marker } from 'react-native-maps';

const INITIAL_REGION = {
  latitude: 28.5355,
  longitude: 77.3910,
  latitudeDelta: 0.005,
  longitudeDelta: 0.005,
};

const MARKERS = [
  { id: '1', title: 'Block A', coordinate: { latitude: 28.5358, longitude: 77.3915 } },
  { id: '2', title: 'Community Hall', coordinate: { latitude: 28.5352, longitude: 77.3905 } },
  { id: '3', title: 'Main Gate', coordinate: { latitude: 28.5345, longitude: 77.3910 } },
];

export default function MapComponent() {
  return (
    <MapView
      style={styles.map}
      initialRegion={INITIAL_REGION}
      showsUserLocation
    >
      {MARKERS.map((marker) => (
        <Marker
          key={marker.id}
          coordinate={marker.coordinate}
          title={marker.title}
        />
      ))}
    </MapView>
  );
}

const styles = StyleSheet.create({
  map: { width: Dimensions.get('window').width, height: Dimensions.get('window').height },
});
