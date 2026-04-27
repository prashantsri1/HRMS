// src/components/common/Header.jsx

import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext'; 
import { logoutUser } from '../../api/AuthService'; 
import NotificationBell from '../ui/NotificationBell'; 
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, LogOut, User, Settings, ChevronDown, Calendar, Crown } from 'lucide-react';

const DEFAULT_AVATAR = 'https://cdn-icons-png.flaticon.com/512/3135/3135715.png';

function Header({ toggleSidebar }) { 
    const { currentUser, userProfile, loading } = useAuth();
    const navigate = useNavigate();
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const dropdownRef = useRef(null);

    const fullName = userProfile?.name || currentUser?.email.split('@')[0] || 'Guest';
    const rawRole = userProfile?.role || 'guest';
    // Format Role: super_admin -> Super Admin
    const userRole = rawRole.replace('_', ' '); 
    const isSuperAdmin = rawRole === 'super_admin';
    const userPhoto = userProfile?.photoURL || DEFAULT_AVATAR;

    const today = new Date().toLocaleDateString('en-US', { 
        weekday: 'short', day: 'numeric', month: 'short' 
    });

    const handleLogout = async () => {
        try {
            await logoutUser(); 
            navigate('/login'); 
        } catch (error) { console.error("Logout Error:", error); }
    };

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsDropdownOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    if (loading) return null; 

    return (
        <header className="sticky top-0 z-30 w-full glass border-b-0 shadow-sm transition-all duration-300">
            <div className="px-4 sm:px-8 py-3 h-[72px] flex items-center justify-between">
                
                {/* --- LEFT: Toggle & Info --- */}
                <div className="flex items-center gap-5">
                    <button 
                        onClick={toggleSidebar}
                        className="p-2.5 rounded-full bg-gray-100/50 dark:bg-gray-800/50 text-gray-500 dark:text-gray-400 hover:bg-purple-100 dark:hover:bg-purple-900/50 hover:text-purple-600 dark:hover:text-purple-400 transition-all active:scale-95 focus:outline-none border border-transparent hover:border-purple-200 dark:hover:border-purple-800"
                    >
                        <Menu size={20} />
                    </button>

                    <div className="flex flex-col">
                        <h1 className="text-sm sm:text-lg font-black text-gray-900 dark:text-white flex items-center tracking-tight">
                            <span className="text-gray-400 font-bold hidden sm:inline mr-1.5">Welcome,</span>
                            <span className="bg-gradient-to-r from-violet-600 to-purple-600 dark:from-violet-400 dark:to-purple-400 bg-clip-text text-transparent truncate max-w-[120px] sm:max-w-none capitalize flex items-center gap-1 drop-shadow-sm">
                                {fullName.split(' ')[0]}
                                {isSuperAdmin && <Crown size={16} className="text-amber-500 fill-amber-500 ml-1 animate-pulse" />}
                            </span>
                            <span className="text-xl animate-pulse ml-1.5 hover:rotate-12 transition-transform cursor-default">👋</span>
                        </h1>
                        <div className="hidden sm:flex items-center gap-1.5 text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mt-0.5">
                            <Calendar size={10} /> {today}
                        </div>
                    </div>
                </div>

                {/* --- RIGHT: Actions --- */}
                <div className="flex items-center gap-3 sm:gap-6">
                    
                    <div className="p-2.5 rounded-full bg-gray-100/50 dark:bg-gray-800/50 hover:bg-purple-100 dark:hover:bg-purple-900/50 transition-colors cursor-pointer text-gray-500 dark:text-gray-400 hover:text-purple-600 dark:hover:text-purple-400 border border-transparent hover:border-purple-200 dark:hover:border-purple-800 relative">
                        <NotificationBell /> 
                    </div>

                    <div className="relative" ref={dropdownRef}>
                        <button 
                            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                            className="flex items-center gap-3 pl-3 sm:pl-5 sm:border-l border-gray-200 dark:border-gray-700/50 focus:outline-none group"
                        >
                            <div className="hidden md:flex flex-col items-end">
                                <span className="text-sm font-black text-gray-800 dark:text-gray-100 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors tracking-tight">
                                    {fullName}
                                </span>
                                <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-widest mt-0.5 shadow-sm border
                                    ${isSuperAdmin ? 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800/50' : 
                                      rawRole === 'admin' ? 'bg-rose-100 text-rose-600 border-rose-200 dark:bg-rose-900/30 dark:text-rose-400 dark:border-rose-800/50' : 
                                      'bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-400 dark:border-purple-800/50'}`}>
                                    {userRole}
                                </span>
                            </div>

                            <div className="relative">
                                <img 
                                    src={userPhoto} 
                                    alt="User" 
                                    className={`w-10 h-10 sm:w-11 sm:h-11 rounded-full object-cover border-2 shadow-md group-hover:shadow-lg group-hover:scale-105 transition-all
                                    ${isSuperAdmin ? 'border-amber-400 shadow-amber-500/20' : 'border-white dark:border-gray-800 shadow-purple-500/10'}`}
                                />
                                <div className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-400 border-2 border-white dark:border-gray-800 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
                            </div>
                            <ChevronDown size={16} className={`text-gray-400 group-hover:text-purple-500 hidden sm:block transition-transform duration-300 ${isDropdownOpen ? 'rotate-180' : ''}`} />
                        </button>

                        <AnimatePresence>
                            {isDropdownOpen && (
                                <motion.div 
                                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                    transition={{ duration: 0.2 }}
                                    className="absolute right-0 mt-3 w-56 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-700 overflow-hidden origin-top-right z-50"
                                >
                                    <div className="md:hidden px-4 py-3 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-700/50">
                                        <p className="text-sm font-bold text-gray-800 dark:text-gray-100 truncate">{fullName}</p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">{userRole}</p>
                                    </div>

                                    <div className="p-2 space-y-1">
                                        <button 
                                            onClick={() => { navigate('/employee/profile'); setIsDropdownOpen(false); }} 
                                            className="w-full flex items-center gap-3 px-3 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-violet-50 dark:hover:bg-gray-700 hover:text-violet-600 dark:hover:text-violet-400 rounded-xl transition-all"
                                        >
                                            <User size={16} /> My Profile
                                        </button>
                                        
                                        <button 
                                            onClick={() => { navigate('/settings'); setIsDropdownOpen(false); }} 
                                            className="w-full flex items-center gap-3 px-3 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-violet-50 dark:hover:bg-gray-700 hover:text-violet-600 dark:hover:text-violet-400 rounded-xl transition-all"
                                        >
                                            <Settings size={16} /> Settings
                                        </button>
                                    </div>

                                    <div className="p-2 border-t border-gray-100 dark:border-gray-700">
                                        <button 
                                            onClick={handleLogout} 
                                            className="w-full flex items-center gap-3 px-3 py-2 text-sm font-bold text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all"
                                        >
                                            <LogOut size={16} /> Sign Out
                                        </button>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            </div>
        </header>
    );
}

export default Header;