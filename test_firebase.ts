import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyBRbymmmusPZPXgFvsMU0FAI3vLsTeSQ4w",
  authDomain: "otz-dummy-system.firebaseapp.com",
  projectId: "otz-dummy-system",
  storageBucket: "otz-dummy-system.firebasestorage.app",
  messagingSenderId: "968979776916",
  appId: "1:968979776916:web:cd7a569ef66f726dbd7b81"
};

async function test() {
  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app);
  try {
    const q = await getDocs(collection(db, 'patients'));
    console.log("TEST SUCCESS! Found:", q.docs.length, "patients.");
  } catch (e) {
    console.error("TEST FAILED:", e);
  }
}
test();
