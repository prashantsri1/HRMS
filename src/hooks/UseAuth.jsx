// src/hooks/UseAuth.jsx (OPTIMIZED & STABLE)

import React, { useState, useEffect, createContext, useContext } from 'react';
import { auth, db } from '../Firebase'; // ✅ Path correct rakha hai
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore'; 
import LoadingSpinner from '../components/common/LoadingSpinner'; 

// 1. Context Creation
const AuthContext = createContext(undefined); 

// 2. Custom Hook
export const useAuth = () => {
    const context = useContext(AuthContext); 
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider. Check main.jsx!');
    }
    return context;
};

// 3. Auth Provider Component
export const AuthProvider = ({ children }) => {
    const [currentUser, setCurrentUser] = useState(null);
    const [userProfile, setUserProfile] = useState(null); 
    const [loading, setLoading] = useState(true); 

    // --- EFFECT 1: Listen to Auth Changes ---
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (user) {
                // User logged in via Auth
                setCurrentUser(user);
                
                // Fetch Profile from Firestore immediately
                try {
                    if (db) {
                        const docRef = doc(db, "users", user.uid);
                        const docSnap = await getDoc(docRef);
                        
                        if (docSnap.exists()) {
                            const profileData = { 
                                ...docSnap.data(), 
                                uid: user.uid,
                                email: user.email 
                            };

                            // Default photo logic
                            if (!profileData.photoURL) {
                                profileData.photoURL = '/default-avatar.png';
                            }
                            setUserProfile(profileData);
                        } else {
                            // User exists in Auth but no Profile in DB (Rare)
                            setUserProfile({ 
                                uid: user.uid, 
                                email: user.email, 
                                photoURL: '/default-avatar.png', 
                                role: 'guest' 
                            });
                        }
                    }
                } catch (error) {
                    console.error("Profile Fetch Error:", error);
                    setUserProfile(null);
                }
            } else {
                // User logged out
                setCurrentUser(null);
                setUserProfile(null);
            }
            
            // Stop loading after everything is done
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const value = {
        currentUser,
        userProfile, 
        loading, 
    };

    return (
        <AuthContext.Provider value={value}>
            {loading ? (
                <div className="h-screen w-full flex items-center justify-center bg-gray-50">
                    <LoadingSpinner message="Authenticating..." size="50px" />
                </div>
            ) : (
                children
            )}
        </AuthContext.Provider>
    );
};