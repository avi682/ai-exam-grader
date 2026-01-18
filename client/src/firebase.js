import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// We use environment variables primarily, but include fallbacks so it works
// out-of-the-box for the user without complex Vercel setup.
// These keys are safe to be public as security is handled by Firestore Rules.
const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyD6ER6oPFwSSectPMNwfCusxzqYl2hTfcg",
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "mygrader-7bc03.firebaseapp.com",
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "mygrader-7bc03",
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "mygrader-7bc03.firebasestorage.app",
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "386653185976",
    appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:386653185976:web:d6ac76e98dd819b438514d"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
