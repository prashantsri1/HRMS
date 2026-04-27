// src/context/AuthContext.jsx

import React, { useState, useEffect, createContext, useContext } from 'react'; 
import { 
    onAuthStateChanged, 
    signInWithEmailAndPassword, 
    signOut, 
    setPersistence, 
    browserSessionPersistence 
} from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore'; 
import { auth, db } from '../Firebase'; 
import LoadingSpinner from '../components/common/LoadingSpinner'; 

// 1. Context Creation
const AuthContext = createContext(undefined);

// 2. Custom Hook to use the AuthContext
export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

// 3. Auth Provider Component
export const AuthProvider = ({ children }) => {
    const [currentUser, setCurrentUser] = useState(null);
    const [userProfile, setUserProfile] = useState(null); 
    const [loading, setLoading] = useState(true); 

    // --- 1. Helper Functions ---
    const login = (email, password) => {
        return setPersistence(auth, browserSessionPersistence)
            .then(() => signInWithEmailAndPassword(auth, email, password));
    };

    const logout = () => signOut(auth);
    
    // --- 2. Master Effect ---
    useEffect(() => {
        let unsubscribeSnapshot = null;

        const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
            if (user) {
                setCurrentUser(user);
                
                // Firestore Listener
                if (db) {
                    const userRef = doc(db, "users", user.uid);
                    
                    unsubscribeSnapshot = onSnapshot(userRef, (docSnap) => {
                        if (docSnap.exists()) {
                            const userData = docSnap.data();

                            // 🚨 FORCE STOP LOGIC (UPDATED)
                            if (userData.isBlocked) {
                                console.warn("Access Revoked: User Blocked.");
                                
                                // Check if user is ALREADY on the force-stop page to prevent loop
                                if (window.location.pathname !== '/force-stop') {
                                    // Logout silently first
                                    signOut(auth).then(() => {
                                        // Hard Redirect using replace (History clear ho jayega)
                                        window.location.replace('/force-stop');
                                    });
                                }
                                // Stop further execution for this user
                                setLoading(false); 
                                return;
                            }

                            // Profile Data Setup
                            const profileData = { 
                                ...userData, 
                                uid: user.uid, 
                                email: user.email 
                            };

                            // Default Avatar
                            if (!profileData.photoURL) {
                                profileData.photoURL = `https://ui-avatars.com/api/?name=${userData.name || 'User'}&background=random`;
                            }
                            
                            setUserProfile(profileData);
                        } else {
                            // Missing Profile Case
                            setUserProfile({ 
                                uid: user.uid, 
                                email: user.email, 
                                role: 'guest', 
                                photoURL: 'https://ui-avatars.com/api/?name=Guest&background=random' 
                            });
                        }
                        setLoading(false);
                    }, (error) => {
                        console.error("Profile Sync Error:", error);
                        setLoading(false);
                    });
                }
            } else {
                // Logout State
                setCurrentUser(null);
                setUserProfile(null);
                setLoading(false);
                if (unsubscribeSnapshot) unsubscribeSnapshot();
            }
        });

        return () => {
            unsubscribeAuth();
            if (unsubscribeSnapshot) unsubscribeSnapshot();
        };
    }, []); 

    const value = { 
        currentUser, 
        userProfile, 
        currentRole: userProfile?.role || 'guest', 
        loading, 
        login, 
        logout,
        auth 
    };

    if (loading) {
        return (
            <div className="h-screen w-full flex items-center justify-center bg-gray-50 dark:bg-gray-900">
                <LoadingSpinner message="Verifying Identity..." size="50px" />
            </div>
        );
    }

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};