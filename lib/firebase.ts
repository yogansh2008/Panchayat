import { initializeApp, getApps, getApp } from 'firebase/app';
// @ts-expect-error Firebase RN persistence typing is often missing in standard auth module
import { initializeAuth, getReactNativePersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
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

const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(ReactNativeAsyncStorage)
});
const db = getFirestore(app);

export { auth, db };
