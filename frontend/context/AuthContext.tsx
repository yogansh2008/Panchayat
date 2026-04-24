import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, signOut as firebaseSignOut, User } from 'firebase/auth';
import { auth, db } from '../../backend/config/firebase';
import { doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { UserProfile } from '../../backend/types';

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  isLoading: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  isLoading: true,
  signOut: async () => {},
  refreshProfile: () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser]       = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  const refreshProfile = () => setRefreshKey(k => k + 1);

  const signOut = async () => {
    await firebaseSignOut(auth);
    setProfile(null);
    setUser(null);
  };

  useEffect(() => {
    let unsubscribeProfile: (() => void) | undefined;

    const unsubscribeAuth = onAuthStateChanged(auth, (u) => {
      setUser(u);

      // Clean up previous profile listener
      if (unsubscribeProfile) {
        unsubscribeProfile();
        unsubscribeProfile = undefined;
      }

      if (u) {
        const docRef = doc(db, 'users', u.uid);
        unsubscribeProfile = onSnapshot(
          docRef,
          (snap) => {
            if (snap.exists()) {
              const data = snap.data() as UserProfile;
              // ✅ CRITICAL: Ensure societyId is always present on profile
              setProfile({ ...data, id: snap.id });
            } else {
              // New user — no profile yet (being created during signup)
              setProfile(null);
            }
            setIsLoading(false);
          },
          (err) => {
            console.error('[AuthContext] Profile snapshot error:', err);
            setIsLoading(false);
          }
        );
      } else {
        setProfile(null);
        setIsLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeProfile) unsubscribeProfile();
    };
  }, [refreshKey]);

  return (
    <AuthContext.Provider value={{ user, profile, isLoading, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
};
