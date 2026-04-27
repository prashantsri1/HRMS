// src/hooks/useActivityTracker.js
import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { doc, setDoc, updateDoc, increment, serverTimestamp, getDoc } from 'firebase/firestore'; // Added getDoc, updateDoc
import { db } from '../Firebase';
import { useAuth } from '../context/AuthContext';

export const useActivityTracker = () => {
    const location = useLocation();
    const { currentUser, userProfile } = useAuth();
    const startTimeRef = useRef(Date.now());
    const isFirstLoad = useRef(true);

    const getTodayId = () => {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    };

    const updateActivity = async (path, duration) => {
        if (!currentUser || duration < 1000) return; 

        const today = getTodayId();
        const docId = `${currentUser.uid}_${today}`;
        const docRef = doc(db, 'daily_logs', docId);

        let moduleName = path.split('/')[2] || 'Dashboard'; 
        moduleName = moduleName.charAt(0).toUpperCase() + moduleName.slice(1);
        if (path === '/' || path.includes('dashboard')) moduleName = 'Dashboard';

        try {
            // 1. Try to get the document to see if it exists
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                // 2. If Exists: Update ONLY duration and lastActive (Preserve loginTime)
                await updateDoc(docRef, {
                    lastActive: serverTimestamp(),
                    totalDuration: increment(duration),
                    [`modules.${moduleName}`]: increment(duration)
                });
            } else {
                // 3. If NOT Exists (First time today): Set Everything including loginTime
                await setDoc(docRef, {
                    userId: currentUser.uid,
                    userName: userProfile?.name || currentUser.email || 'User',
                    role: userProfile?.role || 'employee',
                    date: today,
                    loginTime: serverTimestamp(), // 🔥 SET LOGIN TIME HERE
                    lastActive: serverTimestamp(),
                    totalDuration: duration, // Initial duration
                    modules: {
                        [moduleName]: duration
                    }
                });
            }
        } catch (error) {
            console.error("Tracker Error:", error);
            // Fallback: If read fails (e.g. strict rules), try merge set without loginTime overwrite logic risk
            // preventing data loss, though loginTime might be lost in this specific fallback case.
        }
    };

    useEffect(() => {
        if (isFirstLoad.current) {
            isFirstLoad.current = false;
            startTimeRef.current = Date.now();
            return;
        }

        const endTime = Date.now();
        const duration = endTime - startTimeRef.current;
        const prevPath = window.location.pathname; 

        updateActivity(prevPath, duration);
        startTimeRef.current = Date.now();

    }, [location, currentUser]); 
};