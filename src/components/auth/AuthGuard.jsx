// src/components/auth/AuthGuard.jsx

import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { Navigate } from 'react-router-dom';

/**
 * Ye component security guard hai. Check karta hai ki user allowed hai ya nahi.
 * @param {Array<string>} allowedRoles - Roles jinko access ki permission hai.
 */
const AuthGuard = ({ children, allowedRoles }) => {
    // 💡 useAuth se data nikalo
    const { currentUser, userProfile, loading } = useAuth();
    
    // Role safe tarike se nikalo (agar context me direct currentRole nahi hai toh profile se le lo)
    const role = userProfile?.role; 

    // 1. Loading State (Thoda acha dikhna chahiye)
    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen bg-gray-50 dark:bg-gray-900">
                <div className="text-indigo-600 font-bold animate-pulse">Checking Permissions...</div>
            </div>
        );
    }

    // 2. Not Logged In -> Login Page
    if (!currentUser) {
        return <Navigate to="/login" replace />;
    }

    // 3. 👑 SUPER ADMIN BYPASS (God Mode)
    // Agar Super Admin hai, toh usse 'allowedRoles' check karne ki zarurat nahi. 
    // Woh sab kuch dekh sakta hai.
    if (role === 'super_admin') {
        return <>{children}</>;
    }

    // 4. Role Validation
    if (allowedRoles && !allowedRoles.includes(role)) {
        console.warn(`Access Denied! User Role: ${role}, Required: ${allowedRoles}`);
        
        // Unauthorized user ko sahi dashboard par fenk do
        let redirectPath = '/';
        
        if (role === 'super_admin') redirectPath = '/admin/dashboard'; // Super Admin -> Admin Dash
        else if (role === 'admin') redirectPath = '/admin/dashboard';
        else if (role === 'hr') redirectPath = '/hr/dashboard';
        else if (role === 'employee') redirectPath = '/employee/dashboard';
        
        return <Navigate to={redirectPath} replace />;
    }

    // 5. Access Granted
    return <>{children}</>;
};

export default AuthGuard;