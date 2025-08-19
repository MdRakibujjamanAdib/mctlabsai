// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth, connectAuthEmulator } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyD8eHiAArLJjzw-1FcLZuI73VDwhVPFlD0",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "mct-labs-ai.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "mct-labs-ai",
  storageBucket: "mct-labs-ai.firebasestorage.app",
  messagingSenderId: "553541113515",
  appId: "1:553541113515:web:b8346322ae1877252849ee",
  measurementId: "G-B6X26RVPXN"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Analytics only in production
let analytics;
if (import.meta.env.PROD) {
  analytics = getAnalytics(app);
}
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

// Connect to emulators in development
if (import.meta.env.DEV && !import.meta.env.VITE_USE_FIREBASE_PROD) {
  try {
    connectAuthEmulator(auth, 'http://localhost:9099');
  } catch (error) {
    console.log('Firebase emulators not available, using production');
  }
}

// Security: Disable Firebase debug logging in production
if (import.meta.env.PROD) {
  // Disable Firebase debug logging
  (window as any).FIREBASE_APPCHECK_DEBUG_TOKEN = false;
}
export default app;