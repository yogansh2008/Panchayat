import { Tabs } from 'expo-router';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { Home, Wrench, Users, User } from 'lucide-react-native';
import { useAuth } from '../../frontend/context/AuthContext';

// Custom icon with green pill indicator when active
function TabIcon({ icon: Icon, label, color, focused }: { icon: any; label: string; color: string; focused: boolean }) {
  const { profile } = useAuth();
  const isAdmin = profile?.role === 'Admin';

  return (
    <View style={tab.wrap}>
      <View style={[tab.iconBox, focused && tab.iconBoxActive]}>
        <Icon size={20} color={focused ? '#fff' : '#94a3b8'} strokeWidth={focused ? 2.5 : 1.8} />
      </View>
      <Text style={[tab.label, focused && tab.labelActive]} numberOfLines={1}>{label}</Text>
    </View>
  );
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarStyle: {
          position:        'absolute',
          bottom:          Platform.OS === 'ios' ? 28 : 16,
          left:            20,
          right:           20,
          backgroundColor: 'rgba(255,255,255,0.98)',
          borderRadius:    28,
          height:          64,
          borderTopWidth:  0,
          elevation:       0,
          shadowColor:     '#0f172a',
          shadowOffset:    { width: 0, height: 10 },
          shadowOpacity:   0.12,
          shadowRadius:    24,
          paddingTop:      10,
          paddingBottom:   10,
        },
        tabBarActiveTintColor:   '#10b981',
        tabBarInactiveTintColor: '#94a3b8',
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          tabBarIcon: ({ color, focused }) =>
            <TabIcon icon={Home}  label="Home"      color={color} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="services"
        options={{
          tabBarIcon: ({ color, focused }) =>
            <TabIcon icon={Wrench} label="Services"  color={color} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="community"
        options={{
          tabBarIcon: ({ color, focused }) =>
            <TabIcon icon={Users}  label="Community" color={color} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          tabBarIcon: ({ color, focused }) =>
            <TabIcon icon={User}   label="Profile"   color={color} focused={focused} />,
        }}
      />

      {/* Hidden tabs */}
      <Tabs.Screen name="map" options={{ href: null }} />
      <Tabs.Screen name="two" options={{ href: null }} />
    </Tabs>
  );
}

const tab = StyleSheet.create({
  wrap:          { alignItems: 'center', gap: 3, width: 80 },
  iconBox:       { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  iconBoxActive: {
    backgroundColor: '#10b981',
    shadowColor:     '#10b981',
    shadowOffset:    { width: 0, height: 3 },
    shadowOpacity:   0.40,
    shadowRadius:    8,
    elevation:       6,
  },
  label:         { fontSize: 9, color: '#94a3b8', fontWeight: '600', textAlign: 'center', width: 70 },
  labelActive:   { color: '#10b981', fontWeight: '700' },
});
