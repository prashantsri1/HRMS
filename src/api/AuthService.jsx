// src/api/authService.js

import { 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword, 
    signOut 
} from "firebase/auth";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { auth, db } from '../Firebase'; 

// 1. User Signup Function (Account Creation)
// NOTE: Is function ko 'UserManagement' me use karte waqt dhyan rakhna, 
// kyunki firebase create karte hi naye user ko login kar deta hai. 
// Best practice: Secondary App instance use karna (jo EmployeeService me handled hota hai usually).
export const signupUser = async (email, password, role, extraData = {}) => {
    try {
        // Firebase Auth creation
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // Firestore DB Record
        // 🔥 Updated: Added default fields 'isBlocked' and 'createdAt'
        await setDoc(doc(db, "users", user.uid), {
            uid: user.uid,
            email: email,
            role: role || 'employee', // Default to employee
            isBlocked: false, // Default active
            createdAt: new Date().toISOString(),
            ...extraData // Any additional profile data (name, empId etc)
        });
        
        return user;

    } catch (error) {
        console.error("Signup Error:", error);
        throw new Error(error.message);
    }
};

// 2. User Login Function (With Security Check)
export const loginUser = async (email, password) => {
    try {
        // Step 1: Firebase Auth se login
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // Step 2: 🔥 SECURITY CHECK (Force Stop Logic)
        // Check karo ki Admin/Super Admin ne is user ko block toh nahi kiya?
        const userDocRef = doc(db, "users", user.uid);
        const userDoc = await getDoc(userDocRef);

        if (userDoc.exists()) {
            const userData = userDoc.data();
            
            if (userData.isBlocked) {
                // Agar blocked hai, toh turant logout karo aur error feko
                await signOut(auth);
                throw new Error("Access Revoked: Your account has been suspended by Administration.");
            }
        } else {
            // Agar Firestore me data nahi hai (Rare case)
             throw new Error("User profile not found in database.");
        }

        return user;

    } catch (error) {
        console.error("Login Error:", error);
        // User friendly errors
        if (error.code === 'auth/user-not-found') throw new Error("User not found.");
        if (error.code === 'auth/wrong-password') throw new Error("Invalid password.");
        if (error.code === 'auth/too-many-requests') throw new Error("Account temporarily locked due to failed attempts.");
        throw error; // Throw custom blocked error as is
    }
};

// 3. User Logout Function
export const logoutUser = async () => {
    try {
        await signOut(auth);
        // Optional: LocalStorage clear kar sakte ho agar kuch store kiya hai
        localStorage.clear(); 
    } catch (error) {
        throw new Error(error.message);
    }
};