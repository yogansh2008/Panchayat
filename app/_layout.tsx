import { Stack, useRouter, useSegments } from 'expo-router';
import { AuthProvider, useAuth } from '../frontend/context/AuthContext';
import { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { StatusBar } from 'expo-status-bar';

function ProtectedLayout() {
  const { user, profile, isLoading } = useAuth();
  const segments = useSegments();
  const router   = useRouter();

  useEffect(() => {
    if (isLoading) return;

    const inAuth    = segments[0] === '(auth)';
    const inPending = segments[0] === 'pending-approval';

    if (!user && !inAuth) {
      router.replace('/(auth)');
      return;
    }

    if (user && !profile) return; // wait for profile load

    if (user && profile && inAuth) {
      // Admin and Resident both go to (tabs) — home screen detects role
      switch (profile.role) {
        case 'Provider': router.replace('/provider');         break;
        case 'Security': router.replace('/security');         break;
        case 'Pending':  router.replace('/pending-approval'); break;
        default:         router.replace('/(tabs)');           break; // Admin + Resident
      }
    }

    if (user && profile?.role === 'Pending' && !inPending) {
      router.replace('/pending-approval');
    }
  }, [user, profile, isLoading]);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f9fafb' }}>
        <ActivityIndicator size="large" color="#10b981" />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false, animation: 'fade' }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="admin" />
      <Stack.Screen name="admin-society" />
      <Stack.Screen name="admin-requests" />
      <Stack.Screen name="admin-guidelines" />
      <Stack.Screen name="admin-add-provider" />
      <Stack.Screen name="add-society" />
      <Stack.Screen name="pending-approval" />
      <Stack.Screen name="provider" />
      <Stack.Screen name="security" />
      <Stack.Screen name="admin-security" />
      <Stack.Screen name="admin-residents" />
      <Stack.Screen name="admin-complaints" />
      <Stack.Screen name="admin-funds" />
      <Stack.Screen name="admin-events" />
      <Stack.Screen name="admin-bills" />
      <Stack.Screen name="admin-notices" />
      <Stack.Screen name="ai-assistant" />
      <Stack.Screen name="rules" />
      <Stack.Screen name="admin-gatepasses" />
      <Stack.Screen name="visitors" />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <StatusBar style="dark" />
      <ProtectedLayout />
    </AuthProvider>
  );
}
