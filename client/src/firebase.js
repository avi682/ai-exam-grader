import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// DEBUG: Log the config to console to verify it is loaded
// Hardcoded keys to ensure no loading errors occur.
const firebaseConfig = {
    apiKey: "AIzaSyDT1z4chj1gmc0RaQlOt7EJQgJbU89I4y8",
    authDomain: "exam-grader-new.firebaseapp.com",
    projectId: "exam-grader-new",
    storageBucket: "exam-grader-new.firebasestorage.app",
    messagingSenderId: "225954040833",
    appId: "1:225954040833:web:3adaa369f7b90fb3e84400"
};

console.log("🔥 Firebase Config Loaded:", firebaseConfig);

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
