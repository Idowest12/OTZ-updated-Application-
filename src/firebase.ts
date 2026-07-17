/// <reference types="vite/client" />

import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyAmh0Yl39hQglgnvqO58raPQcY4xt4mN5M",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "ai-studio-applet-webapp-32cdc.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "ai-studio-applet-webapp-32cdc",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "ai-studio-applet-webapp-32cdc.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "630876785645",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:630876785645:web:b60af7dd5c35b663e175e4",
};

const databaseId = import.meta.env.VITE_FIREBASE_DATABASE_ID || "ai-studio-281f10b3-4390-447c-abb6-0c7eac385ddd";

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const db = getFirestore(app, databaseId);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

googleProvider.setCustomParameters({ prompt: 'select_account' });
