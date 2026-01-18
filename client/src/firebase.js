import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// DEBUG: Log the config to console to verify it is loaded
// Hardcoded keys to ensure no loading errors occur.
const firebaseConfig = {
    apiKey: "AIzaSyD6ER6oPFwSSectPMNwfCusxzqYl2hTfcg",
    authDomain: "mygrader-7bc03.firebaseapp.com",
    projectId: "mygrader-7bc03",
    storageBucket: "mygrader-7bc03.firebasestorage.app",
    messagingSenderId: "386653185976",
    appId: "1:386653185976:web:d6ac76e98dd819b438514d",
    measurementId: "G-HRPTFE2T5C"
};

console.log("🔥 Firebase Config Loaded:", firebaseConfig);

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
