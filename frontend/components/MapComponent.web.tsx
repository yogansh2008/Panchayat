import React from 'react';
import { View, StyleSheet } from 'react-native';

export default function MapComponent() {
  return (
    <View style={styles.mapWrapper}>
      <iframe
        title="Society Map"
        src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3506.3!2d77.391!3d28.5355!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zMjjCsDMyJzA3LjgiTiA3N8KwMjMnMjcuNiJF!5e0!3m2!1sen!2sin!4v1698765432100!5m2!1sen!2sin"
        width="100%"
        height="100%"
        style={{ border: 0, height: '100vh' }}
        allowFullScreen
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  mapWrapper: { flex: 1, minHeight: 400 },
});
