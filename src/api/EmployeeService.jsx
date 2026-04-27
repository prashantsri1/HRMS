// src/api/EmployeeService.js (MNC Standard - No Auto Logout)

import { db } from '../Firebase'; 
import { doc, setDoc, updateDoc, deleteDoc, getDoc } from 'firebase/firestore'; 
import { getAuth, createUserWithEmailAndPassword, signOut } from 'firebase/auth'; 
import { initializeApp, getApp } from "firebase/app";

// 💡 HACK: Firebase Config ko wapas access kar rahe hain taaki 
// hum ek "Secondary App" bana sakein. 
// Isse Admin user create karte waqt logout nahi hoga.
import { firebaseConfig } from '../Firebase'; // Make sure firebaseConfig is exported from your Firebase.js

// 1. Create User (Without kicking out the Admin)
export const createUserWithProfile = async (email, password, profileData) => {
    let secondaryApp = null;
    
    try {
        // Step A: Initialize a temporary Firebase App
        // Ye zaroori hai taaki 'createUser' call current session ko overwrite na kare.
        secondaryApp = initializeApp(firebaseConfig, "SecondaryApp");
        const secondaryAuth = getAuth(secondaryApp);

        // Step B: Create User on Secondary Auth
        const userCredential = await createUserWithEmailAndPassword(secondaryAuth, email, password);
        const user = userCredential.user;

        // Step C: Save Profile to Firestore (Main DB)
        // Hum profileData spread kar rahe hain (name, role, empId, reportsTo, etc.)
        const userRef = doc(db, "users", user.uid);
        
        const dataToSave = {
            uid: user.uid,
            email: user.email,
            photoURL: profileData.photoURL || `https://ui-avatars.com/api/?name=${profileData.name}&background=random`, // Better default avatar
            createdAt: new Date().toISOString(),
            isBlocked: false, // Default active
            remainingLeaves: 15, // Default annual leaves
            ...profileData 
        };

        await setDoc(userRef, dataToSave);

        // Step D: Logout the *new* user from secondary app immediately
        await signOut(secondaryAuth);
        
        return user;

    } catch (error) {
        console.error("Creation Error:", error);
        throw new Error(error.message);
    } finally {
        // Step E: Cleanup Memory (Remove secondary app)
        if (secondaryApp) {
            // Note: Firebase JS SDK deleteApp is technically async but we can just let it go
            // deleteApp(secondaryApp); // Uncomment if imported
        }
    }
};

// 2. Update Profile (Admin or Self)
export const updateEmployeeProfile = async (uid, updates) => {
    try {
        const userRef = doc(db, "users", uid);
        
        // Add 'updatedAt' timestamp for audit trail
        const cleanUpdates = {
            ...updates,
            updatedAt: new Date().toISOString()
        };

        await updateDoc(userRef, cleanUpdates);
        return true;
    } catch (error) {
        throw new Error("Update Failed: " + error.message);
    }
};

// 3. Toggle Block/Unblock (Force Stop)
// Admin ke paas power hai kisi ko bhi turant rokne ki.
export const toggleUserBlock = async (uid, currentStatus) => {
    try {
        const userRef = doc(db, "users", uid);
        await updateDoc(userRef, { isBlocked: !currentStatus });
        return !currentStatus; // Returns new status
    } catch (error) {
        throw new Error("Block/Unblock Failed: " + error.message);
    }
};

// 4. Delete User (Firestore Only)
// NOTE: Auth user delete karne ke liye Cloud Functions chahiye hote hain.
// Client side se hum sirf DB record uda sakte hain aur user ko 'Block' kar sakte hain.
export const deleteUserCompletely = async (uid) => {
    try {
        // Delete Firestore Record
        await deleteDoc(doc(db, "users", uid));
        
        // Also delete related collections if needed (Optional: attendance, leaves)
        // Note: Better to keep them for history or use 'soft delete' (isDeleted: true)
        
        console.warn("User removed from Database. Access revoked via blocking recommended.");
        return true;
    } catch (error) {
        throw new Error("Deletion Failed: " + error.message);
    }
};

// 5. Get Single User Details
export const getUserDetails = async (uid) => {
    try {
        const docRef = doc(db, "users", uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            return docSnap.data();
        } else {
            throw new Error("No such employee!");
        }
    } catch (error) {
        throw new Error(error.message);
    }
};