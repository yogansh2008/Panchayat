import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyCcIM94QWsOO1u-2_8YSxv9FZ4hAsr6a88",
  authDomain: "panchayat-38159.firebaseapp.com",
  projectId: "panchayat-38159",
  storageBucket: "panchayat-38159.firebasestorage.app",
  messagingSenderId: "421162491255",
  appId: "1:421162491255:web:96475f128ac765ee9f9572"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function check() {
  const socSnap = await getDocs(collection(db, 'societies'));
  console.log('Total societies:', socSnap.size);
  socSnap.forEach(d => {
    console.log('Society:', d.id, '=>', d.data());
  });

  const usersSnap = await getDocs(collection(db, 'users'));
  console.log('Total users:', usersSnap.size);
  usersSnap.forEach(d => {
    console.log('User:', d.id, '=>', d.data());
  });
}

check().catch(console.error);
