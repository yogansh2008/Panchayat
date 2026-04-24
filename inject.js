import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc } from "firebase/firestore";

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

async function inject() {
  await setDoc(doc(db, "societies", "mock-id-guubhf"), {
    code: "GUUBHF",
    name: "Auto Injected Society",
    address: "Auto Admin",
    adminId: "12345",
    totalFlats: 100
  });
  console.log("Injected GUUBHF");
}

inject().catch(e => {
  console.log("FULL ERROR", e.code, e.message, e.stack);
});
