import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth, db } from '../lib/firebase';
import { doc, onSnapshot } from 'firebase/firestore';

interface UserProfile {
  role: 'Resident' | 'Admin' | 'Security' | 'Provider' | 'Pending';
  name: string;
  category?: string;
  societyCode?: string;
  societyName?: string;
  flatNo?: string;
}

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  isLoading: true,
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let unsubscribeProfile: (() => void) | undefined;

    const unsubscribeAuth = onAuthStateChanged(auth, (u) => {
      setUser(u);
      
      if (unsubscribeProfile) {
        unsubscribeProfile();
        unsubscribeProfile = undefined;
      }

      if (u) {
        // Listen to user profile updates
        const docRef = doc(db, 'users', u.uid);
        unsubscribeProfile = onSnapshot(docRef, (docSnap: any) => {
          if (docSnap.exists()) {
            setProfile(docSnap.data() as UserProfile);
            setIsLoading(false);
          } else {
             // Delay setting fallback and finishing loading to avoid race conditions with setDoc during signup
             setTimeout(() => {
                setProfile(prev => {
                  if (!prev) {
                    return { role: 'Resident', name: u.displayName || 'User' };
                  }
                  return prev;
                });
                setIsLoading(false);
             }, 1500);
          }
        }, (error: any) => {
          console.error(error);
          setProfile({ role: 'Resident', name: u.displayName || 'User' });
          setIsLoading(false);
        });
      } else {
        setProfile(null);
        setIsLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeProfile) {
        unsubscribeProfile();
      }
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, profile, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};
