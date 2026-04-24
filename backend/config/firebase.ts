import { Platform } from 'react-native';
import { initializeApp, getApps, getApp } from 'firebase/app';
// @ts-expect-error Firebase RN persistence typing
import { initializeAuth, getReactNativePersistence, browserLocalPersistence, getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';

const firebaseConfig = {
  apiKey: "AIzaSyCcIM94QWsOO1u-2_8YSxv9FZ4hAsr6a88",
  authDomain: "panchayat-38159.firebaseapp.com",
  projectId: "panchayat-38159",
  storageBucket: "panchayat-38159.firebasestorage.app",
  messagingSenderId: "421162491255",
  appId: "1:421162491255:web:96475f128ac765ee9f9572"
};

// Prevent re-initialization on hot reload
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

const auth = Platform.OS === 'web' 
  ? getAuth(app) 
  : initializeAuth(app, {
      persistence: getReactNativePersistence(ReactNativeAsyncStorage)
    });
const db = getFirestore(app);
const storage = getStorage(app);

export { auth, db, storage };
