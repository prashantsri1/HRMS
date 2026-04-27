// src/pages/authen/LoginPage.jsx

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { doc, getDoc } from 'firebase/firestore';
import { sendPasswordResetEmail } from 'firebase/auth';
import { db, auth } from '../../Firebase';

// 🎨 Premium Assets
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Lock, ArrowRight, CheckCircle, AlertTriangle, Shield, Users, User, Crown } from 'lucide-react';

function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(false);
    const [isResetMode, setIsResetMode] = useState(false);

    const navigate = useNavigate();
    const { login, logout } = useAuth();

    // 🔒 LOGIN LOGIC
    const handleLogin = async (e, intendedRole) => {
        e.preventDefault();
        setError(''); setMessage(''); setLoading(true);

        try {
            // 1. Authenticate with Firebase Auth
            const userCredential = await login(email, password);
            const user = userCredential.user;

            // 2. Fetch User Profile
            const userDocRef = doc(db, 'users', user.uid);
            const userDoc = await getDoc(userDocRef);

            if (!userDoc.exists()) {
                await logout();
                throw new Error("User data not found in database.");
            }

            const userData = userDoc.data();
            const actualRole = userData.role; // e.g., 'super_admin', 'admin', 'hr'

            // 🛑 3. FORCE STOP CHECK (Redundant but safe)
            if (userData.isBlocked) {
                await logout();
                throw new Error("Access Revoked: Your account has been suspended.");
            }

            // 🛑 4. MAINTENANCE MODE CHECK
            // Super Admin can ALWAYS bypass maintenance
            if (actualRole !== 'super_admin') {
                const settingsRef = doc(db, 'settings', 'global');
                const settingsSnap = await getDoc(settingsRef);

                if (settingsSnap.exists() && settingsSnap.data().maintenanceMode) {
                    // Admins can also bypass, but others get kicked
                    if (actualRole !== 'admin') {
                        await logout();
                        setLoading(false);
                        navigate('/maintenance');
                        return;
                    }
                }
            }

            // 5. Verify Role Match (Smart Logic)
            // If user clicks "Super Admin" but is actually just "Admin" -> Block
            // If user clicks "Admin" but is "Super Admin" -> Allow (Higher power)

            let allowed = false;
            if (actualRole === intendedRole) allowed = true;
            if (actualRole === 'super_admin') allowed = true; // Super Admin can login via any button essentially

            if (!allowed) {
                await logout();
                throw new Error(`Access Denied! You hold a '${actualRole.toUpperCase()}' position, please use the correct login.`);
            }

            // 6. Success - Navigate to Dashboard
            setLoading(false);
            let path = '/';

            // 🔥 Super Admin shares the Admin Dashboard (with extra features unlocked)
            if (actualRole === 'super_admin' || actualRole === 'admin') path = '/admin/dashboard';
            else if (actualRole === 'hr') path = '/hr/dashboard';
            else if (actualRole === 'employee') path = '/employee/dashboard';

            navigate(path);

        } catch (err) {
            console.error("Login Failed:", err);
            let msg = "Failed to login.";
            if (err.code === 'auth/invalid-credential') msg = "Invalid Email or Password.";
            if (err.code === 'auth/too-many-requests') msg = "Too many attempts. Try later.";
            if (err.message) msg = err.message;
            setError(msg);
            setLoading(false);
        }
    };

    // 🔑 RESET LOGIC
    const handlePasswordReset = async (e) => {
        e.preventDefault();
        if (!email) { setError("Please enter your email address first."); return; }

        setError(''); setMessage(''); setLoading(true);
        try {
            await sendPasswordResetEmail(auth, email);
            setMessage("Check your email! Password reset link sent.");
            setLoading(false);
        } catch (err) {
            let msg = "Failed to send reset email.";
            if (err.code === 'auth/user-not-found') msg = "No user found with this email.";
            setError(msg); setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-950 p-4 relative overflow-hidden transition-colors duration-300">

            {/* Cinematic Mesh Gradient Background */}
            <div className="absolute inset-0 w-full h-full">
                <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-violet-600/30 rounded-full blur-[120px] mix-blend-screen animate-pulse"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-purple-600/30 rounded-full blur-[120px] mix-blend-screen animate-pulse delay-700"></div>
                <div className="absolute top-[20%] right-[20%] w-[30%] h-[30%] bg-emerald-500/20 rounded-full blur-[100px] mix-blend-screen animate-pulse delay-1000"></div>
            </div>

            {/* Floating Glass Container */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, ease: "easeOut" }}
                className="w-full max-w-md backdrop-blur-2xl bg-white/10 dark:bg-gray-900/40 rounded-[2rem] shadow-[0_8px_32px_0_rgba(0,0,0,0.3)] border border-white/20 p-8 md:p-10 z-10"
            >
                {/* Header Area */}
                <div className="text-center mb-8">
                    <div className="mx-auto w-16 h-16 bg-gradient-to-br from-violet-500 to-purple-600 rounded-2xl flex items-center justify-center text-white font-black text-3xl mb-6 shadow-[0_0_30px_rgba(124,58,237,0.5)] border border-white/20">
                        M
                    </div>
                    <h2 className="text-3xl font-black text-white tracking-tight mb-2">
                        {isResetMode ? "Reset Password" : "Welcome Back"}
                    </h2>
                    <p className="text-gray-300 text-sm font-medium">
                        {isResetMode ? "Enter your email for recovery." : "Sign in to your HRMS workspace."}
                    </p>
                </div>

                {/* Messages Area */}
                <AnimatePresence>
                    {error && (
                        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mb-6 p-3.5 rounded-xl bg-red-500/20 text-red-200 text-sm font-bold flex items-center gap-2 border border-red-500/30 backdrop-blur-sm">
                            <AlertTriangle size={16} /> {error}
                        </motion.div>
                    )}
                    {message && (
                        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mb-6 p-3.5 rounded-xl bg-emerald-500/20 text-emerald-200 text-sm font-bold flex items-center gap-2 border border-emerald-500/30 backdrop-blur-sm">
                            <CheckCircle size={16} /> {message}
                        </motion.div>
                    )}
                </AnimatePresence>

                <form className="space-y-5">
                    {/* Email Input */}
                    <div>
                        <div className="relative group">
                            <Mail className="absolute left-4 top-4 text-gray-400 group-focus-within:text-violet-400 transition-colors" size={20} />
                            <input
                                type="email"
                                placeholder="Email Address"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full pl-12 pr-4 py-3.5 bg-white/5 border border-white/10 rounded-2xl focus:bg-white/10 focus:border-violet-400/50 outline-none transition-all font-medium text-white placeholder-gray-400 shadow-inner"
                            />
                        </div>
                    </div>

                    {/* Password Input (Only for Login) */}
                    {!isResetMode && (
                        <div>
                            <div className="relative group">
                                <Lock className="absolute left-4 top-4 text-gray-400 group-focus-within:text-violet-400 transition-colors" size={20} />
                                <input
                                    type="password"
                                    placeholder="Password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full pl-12 pr-4 py-3.5 bg-white/5 border border-white/10 rounded-2xl focus:bg-white/10 focus:border-violet-400/50 outline-none transition-all font-medium text-white placeholder-gray-400 shadow-inner"
                                />
                            </div>
                            <div className="flex justify-end mt-2">
                                <button type="button" onClick={() => { setIsResetMode(true); setError(''); }} className="text-xs font-bold text-violet-300 hover:text-white transition-colors">
                                    Forgot Password?
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Actions */}
                    {!isResetMode ? (
                        <div className="pt-2">
                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest text-center mb-4">Select Role to Login</p>

                            <div className="grid grid-cols-2 gap-3 mb-3">
                                {/* Super Admin */}
                                <button onClick={(e) => handleLogin(e, 'super_admin')} disabled={loading}
                                    className="group relative flex flex-col items-center justify-center gap-2 p-4 rounded-2xl border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 transition-all backdrop-blur-sm">
                                    <Crown size={24} className="text-amber-400 group-hover:scale-110 transition-transform" />
                                    <span className="font-bold text-xs text-amber-100 uppercase tracking-wide">Owner</span>
                                </button>

                                {/* Admin */}
                                <button onClick={(e) => handleLogin(e, 'admin')} disabled={loading}
                                    className="group relative flex flex-col items-center justify-center gap-2 p-4 rounded-2xl border border-purple-500/30 bg-purple-500/10 hover:bg-purple-500/20 transition-all backdrop-blur-sm">
                                    <Shield size={24} className="text-purple-400 group-hover:scale-110 transition-transform" />
                                    <span className="font-bold text-xs text-purple-100 uppercase tracking-wide">Admin</span>
                                </button>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                {/* HR */}
                                <button onClick={(e) => handleLogin(e, 'hr')} disabled={loading}
                                    className="group relative flex flex-col items-center justify-center gap-2 p-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 transition-all backdrop-blur-sm">
                                    <Users size={24} className="text-emerald-400 group-hover:scale-110 transition-transform" />
                                    <span className="font-bold text-xs text-emerald-100 uppercase tracking-wide">HR</span>
                                </button>

                                {/* Employee */}
                                <button onClick={(e) => handleLogin(e, 'employee')} disabled={loading}
                                    className="group relative flex flex-col items-center justify-center gap-2 p-4 rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 transition-all backdrop-blur-sm">
                                    <User size={24} className="text-gray-300 group-hover:scale-110 transition-transform" />
                                    <span className="font-bold text-xs text-gray-100 uppercase tracking-wide">Staff</span>
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4 pt-2">
                            <button onClick={handlePasswordReset} disabled={loading}
                                className="w-full py-4 rounded-2xl bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white font-bold shadow-[0_0_20px_rgba(124,58,237,0.4)] hover:shadow-[0_0_30px_rgba(124,58,237,0.6)] transition-all">
                                {loading ? 'Sending...' : 'Send Recovery Link'}
                            </button>
                            <button type="button" onClick={() => setIsResetMode(false)} className="w-full py-3 rounded-2xl text-gray-400 font-bold hover:bg-white/5 transition-colors text-sm">
                                Back to Login
                            </button>
                        </div>
                    )}
                </form>
            </motion.div>

            {/* Footer */}
            <div className="absolute bottom-6 text-center w-full text-[10px] text-gray-500 font-bold uppercase tracking-widest">
                © 2025 HRMS Workspace
            </div>
        </div>
    );
}

export default LoginPage;