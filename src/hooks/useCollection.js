// src/hooks/useCollection.js (Optimized for Real-time & Dynamic Filters)

import { useState, useEffect, useRef } from 'react';
import { db } from '../Firebase'; 
import { collection, onSnapshot, query, where, orderBy } from 'firebase/firestore';

export const useCollection = (collectionName, _query, _orderBy) => {
  const [documents, setDocuments] = useState(null);
  const [error, setError] = useState(null);
  const [isPending, setIsPending] = useState(true);

  // 💡 INFINITE LOOP & STALE DATA FIX:
  // React mein Arrays (props) har render pe naya reference banate hain.
  // Hum useRef use karenge, par value tabhi update karenge jab *actual data* change ho.
  
  const queryRef = useRef(_query);
  const orderByRef = useRef(_orderBy);

  // Check: Agar naya query purane se alag hai, tabhi ref update karo
  if (JSON.stringify(queryRef.current) !== JSON.stringify(_query)) {
      queryRef.current = _query;
  }
  
  // Check: Agar sorting order change hua hai
  if (JSON.stringify(orderByRef.current) !== JSON.stringify(_orderBy)) {
      orderByRef.current = _orderBy;
  }

  useEffect(() => {
    setIsPending(true);
    let ref = collection(db, collectionName);

    // 🛡️ Query Construction (Safety Try-Catch)
    try {
        if (queryRef.current) {
          ref = query(ref, where(...queryRef.current));
        }
        if (orderByRef.current) {
          ref = query(ref, orderBy(...orderByRef.current));
        }
    } catch (err) {
        console.error("Query Construction Error:", err);
        setError("Invalid Query Configuration");
        setIsPending(false);
        return;
    }

    // 🔥 Real-time Listener
    const unsubscribe = onSnapshot(ref, (snapshot) => {
      let results = [];
      snapshot.docs.forEach(doc => {
        results.push({ ...doc.data(), id: doc.id });
      });

      // Update State
      setDocuments(results);
      setError(null);
      setIsPending(false);
    }, (error) => {
      console.error("Firestore Error in useCollection:", error);
      setError('Could not fetch data. Permission denied or Network issue.');
      setIsPending(false);
    });

    // Cleanup subscription on unmount or query change
    return () => unsubscribe();

  }, [collectionName, queryRef.current, orderByRef.current]); // ✅ Dependencies updated correctly

  return { documents, error, isPending };
};