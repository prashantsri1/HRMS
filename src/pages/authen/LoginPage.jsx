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
        <div className="min-h-screen flex items-center justify-center bg-[#f8fafc] dark:bg-gray-900 p-4 relative overflow-hidden transition-colors duration-300">

            {/* Background Blobs */}
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-300 dark:bg-purple-900/40 rounded-full blur-[120px] opacity-30 animate-pulse"></div>
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-300 dark:bg-blue-900/40 rounded-full blur-[120px] opacity-30 animate-pulse delay-700"></div>

            {/* Main Container */}
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5 }}
                className="w-full max-w-5xl bg-white dark:bg-gray-800 rounded-3xl shadow-2xl dark:shadow-black/50 overflow-hidden grid md:grid-cols-2 z-10 border border-transparent dark:border-gray-700"
            >

                {/* --- LEFT SIDE: BRANDING --- */}
                <div className="relative bg-gray-900 p-10 flex flex-col justify-between overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-indigo-600 to-purple-800 opacity-90"></div>
                    <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>

                    <div className="relative z-10">
                        <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-xl flex items-center justify-center text-white font-bold text-xl mb-6 shadow-inner">
                            M
                        </div>
                        <h1 className="text-4xl font-extrabold text-white tracking-tight leading-tight">
                            Manage Your <br /> Workspace <span className="text-indigo-300">Efficiently.</span>
                        </h1>
                        <p className="text-indigo-100 mt-4 text-sm leading-relaxed max-w-xs">
                            HRMS handles your payroll, leaves, and tasks in one seamless platform.
                        </p>
                    </div>

                    <div className="relative z-10 mt-10">
                        <div className="flex items-center gap-3">
                            <div className="flex -space-x-3">
                                {[1, 2, 3].map(i => (
                                    <div key={i} className="w-10 h-10 rounded-full border-2 border-indigo-500 bg-gray-200"></div>
                                ))}
                            </div>
                            <p className="text-white text-xs font-medium">Trusted by teams everywhere</p>
                        </div>
                    </div>
                </div>

                {/* --- RIGHT SIDE: FORM --- */}
                <div className="p-8 md:p-12 flex flex-col justify-center bg-white dark:bg-gray-800 transition-colors duration-300">

                    <div className="mb-8">
                        <h2 className="text-2xl font-bold text-gray-800 dark:text-white">
                            {isResetMode ? "Reset Password" : "Welcome Back! 👋"}
                        </h2>
                        <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
                            {isResetMode ? "Enter your email to receive a recovery link." : "Please enter your details to sign in."}
                        </p>
                    </div>

                    {/* Messages Area */}
                    <AnimatePresence>
                        {error && (
                            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm font-medium flex items-center gap-2 border border-red-100 dark:border-red-800">
                                <AlertTriangle size={16} /> {error}
                            </motion.div>
                        )}
                        {message && (
                            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mb-4 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 text-sm font-medium flex items-center gap-2 border border-emerald-100 dark:border-emerald-800">
                                <CheckCircle size={16} /> {message}
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <form className="space-y-5">

                        {/* Email Input */}
                        <div>
                            <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 uppercase mb-1">Email Address</label>
                            <div className="relative group">
                                <Mail className="absolute left-3 top-3.5 text-gray-400 dark:text-gray-500 group-focus-within:text-indigo-600 dark:group-focus-within:text-indigo-400 transition-colors" size={18} />
                                <input
                                    type="email"
                                    placeholder="you@[EMAIL_ADDRESS]"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:bg-white dark:focus:bg-gray-800 focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-transparent outline-none transition-all font-medium text-gray-700 dark:text-white"
                                />
                            </div>
                        </div>

                        {/* Password Input (Only for Login) */}
                        {!isResetMode && (
                            <div>
                                <div className="flex justify-between items-center mb-1">
                                    <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 uppercase">Password</label>
                                    <button type="button" onClick={() => { setIsResetMode(true); setError(''); }} className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300">
                                        Forgot Password?
                                    </button>
                                </div>
                                <div className="relative group">
                                    <Lock className="absolute left-3 top-3.5 text-gray-400 dark:text-gray-500 group-focus-within:text-indigo-600 dark:group-focus-within:text-indigo-400 transition-colors" size={18} />
                                    <input
                                        type="password"
                                        placeholder="••••••••"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:bg-white dark:focus:bg-gray-800 focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-transparent outline-none transition-all font-medium text-gray-700 dark:text-white"
                                    />
                                </div>
                            </div>
                        )}

                        {/* Actions */}
                        {!isResetMode ? (
                            <div className="mt-6">
                                <p className="text-xs text-gray-400 dark:text-gray-500 font-bold uppercase mb-3 text-center tracking-wider">Select Role to Login</p>

                                {/* 👑 Super Admin / Admin Button (Combined Visual) */}
                                <button onClick={(e) => handleLogin(e, 'super_admin')} disabled={loading}
                                    className="group w-full mb-3 relative flex items-center justify-between p-3 rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 hover:bg-amber-500 dark:hover:bg-amber-600 transition-all duration-300">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-white dark:bg-gray-800 rounded-lg text-amber-600 dark:text-amber-400 shadow-sm"><Crown size={18} /></div>
                                        <span className="font-bold text-amber-900 dark:text-amber-300 group-hover:text-white">Super Admin / Owner</span>
                                    </div>
                                    <ArrowRight size={18} className="text-amber-400 group-hover:text-white transform group-hover:translate-x-1 transition-transform" />
                                </button>

                                {/* Admin (Manager) Button */}
                                <button onClick={(e) => handleLogin(e, 'admin')} disabled={loading}
                                    className="group w-full mb-3 relative flex items-center justify-between p-3 rounded-xl border border-purple-100 dark:border-purple-800 bg-purple-50 dark:bg-purple-900/20 hover:bg-purple-600 dark:hover:bg-purple-700 transition-all duration-300">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-white dark:bg-gray-800 rounded-lg text-purple-600 dark:text-purple-400 shadow-sm"><Shield size={18} /></div>
                                        <span className="font-bold text-purple-900 dark:text-purple-300 group-hover:text-white">Admin (Operations)</span>
                                    </div>
                                    <ArrowRight size={18} className="text-purple-400 group-hover:text-white transform group-hover:translate-x-1 transition-transform" />
                                </button>

                                <div className="grid grid-cols-2 gap-3">
                                    {/* HR Button */}
                                    <button onClick={(e) => handleLogin(e, 'hr')} disabled={loading}
                                        className="group flex items-center justify-center gap-2 p-3 rounded-xl border border-teal-100 dark:border-teal-800 bg-teal-50 dark:bg-teal-900/20 hover:bg-teal-500 dark:hover:bg-teal-700 hover:border-teal-500 dark:hover:border-teal-700 transition-all duration-300">
                                        <Users size={16} className="text-teal-600 dark:text-teal-400 group-hover:text-white" />
                                        <span className="font-bold text-sm text-teal-900 dark:text-teal-300 group-hover:text-white">HR Login</span>
                                    </button>

                                    {/* Employee Button */}
                                    <button onClick={(e) => handleLogin(e, 'employee')} disabled={loading}
                                        className="group flex items-center justify-center gap-2 p-3 rounded-xl border border-blue-100 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-600 dark:hover:bg-blue-700 hover:border-blue-600 dark:hover:border-blue-700 transition-all duration-300">
                                        <User size={16} className="text-blue-600 dark:text-blue-400 group-hover:text-white" />
                                        <span className="font-bold text-sm text-blue-900 dark:text-blue-300 group-hover:text-white">Employee</span>
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-3 pt-2">
                                <button onClick={handlePasswordReset} disabled={loading}
                                    className="w-full py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 dark:hover:bg-indigo-500 text-white font-bold shadow-lg shadow-indigo-200 dark:shadow-indigo-900/30 transition-all flex justify-center items-center gap-2">
                                    {loading ? 'Sending...' : 'Send Recovery Link'} <ArrowRight size={18} />
                                </button>
                                <button type="button" onClick={() => setIsResetMode(false)} className="w-full py-3 rounded-xl text-gray-500 dark:text-gray-400 font-bold hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-sm">
                                    Back to Login
                                </button>
                            </div>
                        )}
                    </form>
                </div>
            </motion.div>

            {/* Footer */}
            <div className="absolute bottom-4 text-center w-full text-xs text-gray-400 dark:text-gray-500 font-medium">
                © 2025 HRMS Systems. Secure & Encrypted.
            </div>
        </div>
    );
}

export default LoginPage;