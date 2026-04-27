// src/components/common/Sidebar.jsx

import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

import {
    LayoutDashboard, Users, BarChart3, CalendarCheck, Clock, Banknote,
    FileBarChart, Coins, Database, FolderOpen, Home, ClipboardList,
    Send, History, UserCircle, X, Wallet, BookUser, Edit3, Target,
    BarChart2, Crown, Activity, FileText, Megaphone, Plane
} from 'lucide-react';

const navLinks = [
    // --- 1. DASHBOARDS (Top Priority) ---
    { path: '/admin/dashboard', name: 'Admin Dashboard', roles: ['admin', 'super_admin'], icon: <LayoutDashboard size={20} /> },
    { path: '/hr/dashboard', name: 'HR Dashboard', roles: ['hr', 'admin', 'super_admin'], icon: <BarChart3 size={20} /> },
    { path: '/employee/dashboard', name: 'My Dashboard', roles: ['employee', 'hr', 'admin', 'super_admin'], icon: <Home size={20} /> },

    // --- 2. MANAGEMENT MODULES ---
    { path: '/admin/user-management', name: 'User Control', roles: ['admin', 'super_admin'], icon: <Users size={20} /> },
    { path: '/admin/leads-management', name: 'Leads Management', roles: ['admin', 'hr', 'employee', 'super_admin'], icon: <Users size={20} /> },
    { path: '/admin/accounting', name: 'Accounting & Finance', roles: ['admin', 'hr', 'employee', 'super_admin'], icon: <Wallet size={20} /> },

    // 🔥 NEW: LOGS REPORT (Admin Only)
    { path: '/admin/log-reports', name: 'System Log Reports', roles: ['admin', 'super_admin'], icon: <FileText size={20} /> },

    // --- 3. HR OPERATIONS ---
    { path: '/hr/payroll-management', name: 'Payroll Management', roles: ['hr', 'admin', 'super_admin'], icon: <Banknote size={20} /> },
    { path: '/hr/attendance-records', name: 'Attendance Records', roles: ['hr', 'admin', 'super_admin'], icon: <Clock size={20} /> },
    { path: '/hr/leave-requests', name: 'Leave Approval', roles: ['hr', 'admin', 'super_admin'], icon: <CalendarCheck size={20} /> },
    { path: '/hr/leave-report', name: 'Leave Reports', roles: ['hr', 'admin', 'super_admin'], icon: <FileBarChart size={20} /> },
    { path: '/hr/yearly-payoff', name: 'Yearly Payoff', roles: ['hr', 'admin', 'super_admin'], icon: <Coins size={20} /> },
    { path: '/employee/travel', name: 'Travel & Expense', roles: ['employee', 'hr', 'admin', 'super_admin'], icon: <Plane size={20} /> },
    // --- 4. EMPLOYEE SELF-SERVICE ---
    { path: '/employee/my-tasks', name: 'My Tasks', roles: ['employee', 'admin', 'hr', 'super_admin'], icon: <ClipboardList size={20} /> },
    { path: '/employee/leave-apply', name: 'Apply Leave/Query', roles: ['employee', 'admin', 'super_admin'], icon: <Send size={20} /> },
    { path: '/my-leaves', name: 'My Leave Status', roles: ['employee', 'admin', 'super_admin'], icon: <History size={20} /> },

    // 🔥 NEW: MY ACTIVITY (For Everyone)
    { path: '/logs', name: 'My Activity Logs', roles: ['employee', 'hr', 'admin', 'super_admin'], icon: <Activity size={20} /> },

    { path: '/employee/profile', name: 'My Profile', roles: ['employee', 'hr', 'admin', 'super_admin'], icon: <UserCircle size={20} /> },

    // --- 5. COMMON UTILITIES ---
    // 🔥 NEW: NOTICE BOARD (Accessible to Everyone)
    { path: '/admin/notices', name: 'Notice Board', roles: ['admin', 'hr', 'employee', 'super_admin'], icon: <Megaphone size={20} /> },

    { path: '/contacts', name: 'Directory', roles: ['admin', 'hr', 'employee', 'super_admin'], icon: <BookUser size={20} /> },
    { path: '/office-data', name: 'Office Data / CMS', roles: ['admin', 'hr', 'employee', 'super_admin'], icon: <Database size={20} /> },
    { path: '/shared-docs', name: 'Shared Documents', roles: ['admin', 'employee', 'hr', 'super_admin'], icon: <FolderOpen size={20} /> },
    { path: '/kra', name: 'KRA Management', roles: ['admin', 'hr', 'employee', 'super_admin'], icon: <Target size={20} /> },
    { path: '/notepad', name: 'Daily Notes', roles: ['admin', 'hr', 'employee', 'super_admin'], icon: <Edit3 size={20} /> },
    { path: '/kpi', name: 'KPI Scorecard', roles: ['admin', 'hr', 'employee', 'super_admin'], icon: <BarChart2 size={20} /> },
];

function Sidebar({ isOpen, toggleSidebar }) {
    const { userProfile } = useAuth();
    const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
    const currentRole = userProfile?.role ? userProfile.role.toLowerCase() : 'guest';
    const isSuperAdmin = currentRole === 'super_admin';

    // Filter logic: Show link if user's role is in the allowed roles list
    const filteredLinks = navLinks.filter(link => link.roles.includes(currentRole));

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth <= 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    return (
        <>
            {/* ⚫ MOBILE BACKDROP */}
            {isMobile && isOpen && (
                <div onClick={toggleSidebar} className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-[49] transition-opacity duration-300 md:hidden"></div>
            )}

            {/* 🔵 SIDEBAR CONTAINER */}
            <div className={`
                fixed left-0 top-0 h-screen bg-[#0f172a] dark:bg-gray-900 text-white shadow-2xl z-[50] flex flex-col 
                w-72 border-r border-gray-800/50 dark:border-gray-800
                transition-transform duration-300 ease-in-out
                ${isOpen ? 'translate-x-0' : '-translate-x-full'} 
            `}>
                {/* --- HEADER --- */}
                <div className="flex justify-between items-center px-6 h-20 border-b border-gray-800/50 dark:border-gray-800 shrink-0 bg-[#0f172a] dark:bg-gray-900">
                    <div className="flex items-center gap-3">
                        <div className="relative w-9 h-9 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-white font-bold text-lg shadow-xl">M</div>
                        <div>
                            <h2 className="text-lg font-bold tracking-wide text-white dark:text-gray-100">HRMS</h2>
                            <p className="text-[10px] text-gray-400 uppercase tracking-widest font-semibold">Workspace</p>
                        </div>
                    </div>
                    <button onClick={toggleSidebar} className="md:hidden p-2 text-gray-400 hover:text-white rounded-lg"><X size={22} /></button>
                </div>

                {/* --- ROLE BADGE --- */}
                <div className="px-5 py-6 shrink-0">
                    <div className={`rounded-xl p-4 border backdrop-blur-md ${isSuperAdmin ? 'bg-amber-900/20 border-amber-700/50' : 'bg-gray-800/40 border-gray-700/30'}`}>
                        <p className="text-[10px] text-gray-500 dark:text-gray-400 uppercase font-bold tracking-widest mb-2">Logged in as</p>
                        <div className="flex items-center gap-3">
                            {isSuperAdmin ? (
                                <Crown size={18} className="text-amber-500" />
                            ) : (
                                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                            )}
                            <span className={`text-sm font-bold capitalize tracking-wide ${isSuperAdmin ? 'text-amber-400' : 'text-gray-100'}`}>
                                {currentRole.replace('_', ' ')}
                            </span>
                        </div>
                    </div>
                </div>

                {/* --- LINKS LIST --- */}
                <div className="flex-1 overflow-y-auto px-3 pb-4 space-y-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:'none'] [scrollbar-width:'none']">
                    {filteredLinks.map((link) => (
                        <NavLink
                            key={link.path}
                            to={link.path}
                            onClick={() => isMobile && toggleSidebar()}
                            className={({ isActive }) => `
                                flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-medium transition-all duration-300 group relative overflow-hidden
                                ${isActive
                                    ? 'text-white bg-gradient-to-r from-blue-600/90 to-indigo-600/90 shadow-lg shadow-blue-500/20 translate-x-1'
                                    : 'text-slate-400 hover:bg-gray-800/50 dark:hover:bg-gray-800 hover:text-white hover:translate-x-1'}
                            `}
                        >
                            <span className={`transition-colors duration-200 shrink-0 ${window.location.pathname.includes(link.path) ? 'text-white' : 'text-slate-400 group-hover:text-blue-400'}`}>{link.icon}</span>
                            <span className="relative z-10 tracking-wide">{link.name}</span>
                        </NavLink>
                    ))}
                </div>

                {/* --- FOOTER --- */}
                <div className="p-4 border-t border-gray-800/50 dark:border-gray-800 bg-[#0f172a] dark:bg-gray-900 shrink-0">
                    <p className="text-[10px] text-center text-slate-500 dark:text-gray-500 font-medium tracking-wide">© 2025 HRMS System</p>
                </div>
            </div>
        </>
    );
}

export default Sidebar;