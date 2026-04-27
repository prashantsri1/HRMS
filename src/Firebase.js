// src/Firebase.js

import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage"; // Agar future me images store karni ho
import { getAnalytics, isSupported } from "firebase/analytics";

// 🔥 IMPORTANT: Values ab '.env' files se aayengi dynamically
export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  // Dev me ye undefined hoga, Prod me value hogi
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

// Console log taaki tujhe browser console me dikhe ki tu abhi kahan connect hai
console.log(`🔥 Firebase Connecting to: ${firebaseConfig.projectId} (${import.meta.env.MODE} Mode)`);

// 1. Firebase App Initialize
const app = initializeApp(firebaseConfig);

// 2. Services Export
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

// 3. Analytics (Sirf tab chalega jab measurementId exist karega - Yani Prod me)
let analytics;
if (firebaseConfig.measurementId) {
  isSupported().then((yes) => {
    if (yes) {
      analytics = getAnalytics(app);
      console.log("📊 Analytics Initialized");
    }
  });
} else {
  console.log("⚠️ Analytics Skipped (Dev Environment)");
}

export { analytics };
export default app;