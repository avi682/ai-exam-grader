import React, { createContext, useContext, useState, useEffect } from 'react';
import { auth, db } from '../firebase';
import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { encryptionService } from '../services/encryptionService';

const AuthContext = createContext();

export function useAuth() {
    return useContext(AuthContext);
}

export function AuthProvider({ children }) {
    const [currentUser, setCurrentUser] = useState(null);
    const [userProfile, setUserProfile] = useState(null);
    const [loading, setLoading] = useState(true);

    async function signup(email, password, name) {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // Encrypt name and save to Firestore
        try {
            const encryptedName = encryptionService.encrypt(name, user.uid);
            await setDoc(doc(db, 'users', user.uid), {
                encryptedName: encryptedName
            });
            setUserProfile({ displayName: name });
        } catch (error) {
            console.error("Failed to save encrypted profile", error);
        }

        return userCredential;
    }

    function login(email, password) {
        return signInWithEmailAndPassword(auth, email, password);
    }

    function logout() {
        setUserProfile(null);
        return signOut(auth);
    }

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (user) {
                // Fetch encrypted profile
                try {
                    const docRef = doc(db, 'users', user.uid);
                    const docSnap = await getDoc(docRef);

                    if (docSnap.exists()) {
                        const data = docSnap.data();
                        if (data.encryptedName) {
                            const decryptedName = encryptionService.decrypt(data.encryptedName, user.uid);
                            setUserProfile({ displayName: decryptedName });
                        }
                    } else {
                        // Profile doesn't exist yet (or legacy user)
                        setUserProfile({ displayName: user.email.split('@')[0] });
                    }
                } catch (error) {
                    console.error("Failed to load profile", error);
                }
            } else {
                setUserProfile(null);
            }
            setCurrentUser(user);
            setLoading(false);
        });

        return unsubscribe;
    }, []);

    const value = {
        currentUser,
        userProfile,
        signup,
        login,
        logout
    };

    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
        </AuthContext.Provider>
    );
}
