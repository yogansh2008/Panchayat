import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";

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
  try {
    const s = await getDocs(collection(db, "societies"));
    console.log("=== SOCIETIES ===");
    s.forEach(d => console.log(d.id, "=>", d.data()));
    
    const u = await getDocs(collection(db, "users"));
    console.log("=== USERS ===");
    u.forEach(d => console.log(d.id, "=>", d.data()));
  } catch (e) {
    console.error("ERROR:", e);
  }
}

check();
