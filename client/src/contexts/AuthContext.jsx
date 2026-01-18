import React, { createContext, useContext, useState, useEffect } from 'react';
import {
    onAuthStateChanged,
    sendSignInLinkToEmail,
    isSignInWithEmailLink,
    signInWithEmailLink,
    signOut
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { encryptionService } from '../services/encryptionService';

const AuthContext = createContext();

export function useAuth() {
    return useContext(AuthContext);
}

export function AuthProvider({ children }) {
    const [currentUser, setCurrentUser] = useState(null);
    const [userProfile, setUserProfile] = useState(null);
    const [loading, setLoading] = useState(true);

    async function sendLoginLink(email) {
        const actionCodeSettings = {
            url: window.location.origin,
            handleCodeInApp: true,
        };
        await sendSignInLinkToEmail(auth, email, actionCodeSettings);
        window.localStorage.setItem('emailForSignIn', email);
    }

    async function finishLoginWithLink(emailFromLink) {
        if (isSignInWithEmailLink(auth, window.location.href)) {
            let email = window.localStorage.getItem('emailForSignIn');
            if (!email) {
                email = window.prompt('אנא אמת את האימייל שלך לכניסה:');
            }
            if (email) {
                const result = await signInWithEmailLink(auth, email, window.location.href);
                window.localStorage.removeItem('emailForSignIn');

                // Initialize profile if needed
                if (result.user) {
                    // We can't really "encrypt" a name here since we don't have a password registration flow
                    // So we just use the email prefix as a default display name or ask user later.
                    // For now, let's ensure the user doc exists.
                    const user = result.user;
                    const docRef = doc(db, 'users', user.uid);
                    const docSnap = await getDoc(docRef);
                    if (!docSnap.exists()) {
                        // New user via magic link
                        await setDoc(docRef, {
                            createdAt: new Date().toISOString(),
                            email: user.email
                        });
                    }
                }
                return result.user;
            }
        }
        return null;
    }

    function logout() {
        return signOut(auth);
    }

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            setCurrentUser(user);
            if (user) {
                // Fetch encrypted profile
                try {
                    const docRef = doc(db, 'users', user.uid);
                    const docSnap = await getDoc(docRef);

                    if (docSnap.exists()) {
                        const data = docSnap.data();
                        if (data.encryptedName) {
                            try {
                                const decryptedName = encryptionService.decrypt(data.encryptedName, user.uid);
                                setUserProfile({ displayName: decryptedName });
                            } catch (e) {
                                console.error("Decryption err", e);
                                setUserProfile({ displayName: user.email });
                            }
                        } else {
                            setUserProfile({ displayName: user.email.split('@')[0] });
                        }
                    } else {
                        setUserProfile({ displayName: user.email.split('@')[0] });
                    }
                } catch (error) {
                    console.error("Failed to load profile", error);
                }
            } else {
                setUserProfile(null);
            }
            setLoading(false);
        });

        return unsubscribe;
    }, []);

    const value = {
        currentUser,
        userProfile,
        sendLoginLink,
        finishLoginWithLink,
        logout
    };

    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
        </AuthContext.Provider>
    );
}
