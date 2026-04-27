// src/hooks/useFirestore.js (FINAL STABLE VERSION)

import { useState, useEffect, useCallback, useMemo } from 'react';
import { db } from '../Firebase'; 
import { 
    collection, 
    query as firestoreQuery, 
    onSnapshot, 
    doc, 
    deleteDoc, 
    addDoc, 
    updateDoc,
    where, 
    orderBy 
} from 'firebase/firestore'; 

/**
 * Custom Hook for real-time Firestore data.
 * @param {string} collectionName - Collection to fetch (e.g., 'users')
 * @param {Array} queryFilters - Array of filters [['role', '==', 'employee']] OR null/[] for ALL data.
 * @param {Object} orderByOptions - { field: 'createdAt', direction: 'desc' }
 */
export const useFirestore = (collectionName, queryFilters = null, orderByOptions = null) => {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // 💡 Memoize dependencies to prevent infinite re-renders
    const filterKey = useMemo(() => JSON.stringify(queryFilters), [queryFilters]);
    const orderKey = useMemo(() => JSON.stringify(orderByOptions), [orderByOptions]);

    useEffect(() => {
        // 1. Basic Safety Check
        if (!collectionName) {
            setLoading(false);
            return;
        }

        setLoading(true);
        setError(null);

        // 2. 🛡️ QUERY SAFETY CHECK
        // Agar filters hain, toh check karo ki value 'undefined' toh nahi hai?
        // (Firestore crashes if value is undefined)
        if (Array.isArray(queryFilters) && queryFilters.length > 0) {
            const hasInvalidFilter = queryFilters.some(f => 
                Array.isArray(f) && f.length === 3 && (f[2] === undefined)
            );

            if (hasInvalidFilter) {
                console.warn(`[useFirestore] Skipped query due to undefined filter values in ${collectionName}`);
                // Don't set error, just wait. Data might be coming from async source.
                // setLoading(false); 
                return; 
            }
        }

        try {
            // 3. Construct Query
            const collectionRef = collection(db, collectionName);
            let finalQuery = collectionRef;
            let queryConstraints = [];

            // A. Apply Filters (If any)
            if (Array.isArray(queryFilters) && queryFilters.length > 0) {
                queryFilters.forEach(filter => {
                    if (Array.isArray(filter) && filter.length === 3) {
                        // Ensure value is not null/undefined before applying
                        if(filter[2] !== undefined && filter[2] !== '') {
                            queryConstraints.push(where(filter[0], filter[1], filter[2]));
                        }
                    }
                });
            }

            // B. Apply Sorting
            if (orderByOptions && orderByOptions.field) {
                const direction = orderByOptions.direction === 'desc' ? 'desc' : 'asc';
                queryConstraints.push(orderBy(orderByOptions.field, direction));
            }

            // C. Build Final Query
            if (queryConstraints.length > 0) {
                finalQuery = firestoreQuery(collectionRef, ...queryConstraints);
            }

            // 4. 🔥 Real-time Listener (Snapshot)
            const unsubscribe = onSnapshot(finalQuery, 
                (snapshot) => {
                    const results = snapshot.docs.map(doc => ({ 
                        id: doc.id, 
                        ...doc.data() 
                    }));
                    setData(results);
                    setLoading(false);
                }, 
                (err) => {
                    console.error(`[useFirestore] Error in ${collectionName}:`, err);
                    setError(err.message);
                    setLoading(false);
                }
            );

            // Cleanup listener on unmount or dependency change
            return () => unsubscribe();

        } catch (err) {
            console.error("[useFirestore] Setup Error:", err);
            setError(err.message);
            setLoading(false);
        }
        
    }, [collectionName, filterKey, orderKey]); 

    // --- CRUD Operations (Stable references via useCallback) ---

    const deleteDocument = useCallback(async (id) => {
        if (!id) return;
        try {
            await deleteDoc(doc(db, collectionName, id));
            return true;
        } catch (err) {
            console.error("Delete Error:", err);
            throw err;
        }
    }, [collectionName]);

    const addDocument = useCallback(async (documentData) => {
        try {
            // Add 'createdAt' if missing
            const payload = {
                ...documentData,
                createdAt: documentData.createdAt || new Date().toISOString()
            };
            const docRef = await addDoc(collection(db, collectionName), payload);
            return docRef.id;
        } catch (err) {
            console.error("Add Error:", err);
            throw err;
        }
    }, [collectionName]);

    const updateDocument = useCallback(async (id, updates) => {
        if (!id) return;
        try {
            // Add 'updatedAt'
            const payload = {
                ...updates,
                updatedAt: new Date().toISOString()
            };
            await updateDoc(doc(db, collectionName, id), payload);
            return true;
        } catch (err) {
            console.error("Update Error:", err);
            throw err;
        }
    }, [collectionName]);

    return { data, loading, error, deleteDocument, addDocument, updateDocument };
};