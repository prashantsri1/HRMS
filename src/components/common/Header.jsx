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
        <header className="sticky top-0 z-30 w-full bg-white/90 dark:bg-gray-900/90 backdrop-blur-md border-b border-gray-200/60 dark:border-gray-700 shadow-sm transition-all duration-300">
            <div className="px-4 sm:px-6 py-3 h-16 flex items-center justify-between">
                
                {/* --- LEFT: Toggle & Info --- */}
                <div className="flex items-center gap-4">
                    <button 
                        onClick={toggleSidebar}
                        className="p-2 rounded-xl text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all active:scale-95 focus:outline-none"
                    >
                        <Menu size={24} />
                    </button>

                    <div className="flex flex-col">
                        <h1 className="text-sm sm:text-lg font-bold text-gray-800 dark:text-gray-100 flex items-center">
                            <span className="text-gray-400 dark:text-gray-500 font-normal hidden sm:inline mr-1">Hello,</span>
                            <span className="bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-400 dark:to-purple-400 bg-clip-text text-transparent truncate max-w-[120px] sm:max-w-none capitalize flex items-center gap-1">
                                {fullName.split(' ')[0]}
                                {isSuperAdmin && <Crown size={16} className="text-amber-500 fill-amber-500 ml-1 animate-pulse" />}
                            </span>
                            <span className="text-xl animate-pulse ml-1">👋</span>
                        </h1>
                        <div className="hidden sm:flex items-center gap-1.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                            <Calendar size={10} /> {today}
                        </div>
                    </div>
                </div>

                {/* --- RIGHT: Actions --- */}
                <div className="flex items-center gap-3 sm:gap-5">
                    
                    <div className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer text-gray-500 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400">
                        <NotificationBell /> 
                    </div>

                    <div className="relative" ref={dropdownRef}>
                        <button 
                            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                            className="flex items-center gap-3 pl-2 sm:pl-4 sm:border-l border-gray-200 dark:border-gray-700 focus:outline-none group"
                        >
                            <div className="hidden md:flex flex-col items-end">
                                <span className="text-sm font-bold text-gray-700 dark:text-gray-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                                    {fullName}
                                </span>
                                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider 
                                    ${isSuperAdmin ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' : 
                                      rawRole === 'admin' ? 'bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400' : 
                                      'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'}`}>
                                    {userRole}
                                </span>
                            </div>

                            <div className="relative">
                                <img 
                                    src={userPhoto} 
                                    alt="User" 
                                    className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full object-cover border-2 shadow-sm group-hover:ring-2 transition-all
                                    ${isSuperAdmin ? 'border-amber-400 ring-amber-200' : 'border-white dark:border-gray-800 ring-indigo-100 dark:ring-indigo-900'}`}
                                />
                                <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-white dark:border-gray-800 rounded-full"></div>
                            </div>
                            <ChevronDown size={16} className={`text-gray-400 hidden sm:block transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
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
                                            className="w-full flex items-center gap-3 px-3 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-indigo-50 dark:hover:bg-gray-700 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-xl transition-all"
                                        >
                                            <User size={16} /> My Profile
                                        </button>
                                        
                                        <button 
                                            onClick={() => { navigate('/settings'); setIsDropdownOpen(false); }} 
                                            className="w-full flex items-center gap-3 px-3 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-indigo-50 dark:hover:bg-gray-700 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-xl transition-all"
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