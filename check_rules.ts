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

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function testRules() {
  console.log("Checking Firestore rules...");
  try {
    await getDocs(collection(db, 'patients'));
    console.log("SUCCESS! Rules are open. You have read/write access.");
    process.exit(0);
  } catch (error: any) {
    if (error.code === 'permission-denied') {
      console.error("FAILED! The database is still locked (permission-denied).");
    } else {
      console.error("FAILED with another error:", error.message);
    }
    process.exit(1);
  }
}

testRules();
