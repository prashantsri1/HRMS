// src/pages/hr/HRDashboard.jsx

import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useFirestore } from '../../hooks/useFirestore';
import LoadingSpinner from '../../components/common/LoadingSpinner';

// 🎨 Premium Assets
import { motion } from 'framer-motion';
import { 
    Users, Clock, CheckCircle, Wallet, ArrowRight, 
    Calendar, FileText, UserCheck, Banknote 
} from 'lucide-react';

function HRDashboard() {
    const { currentUser } = useAuth();
    const navigate = useNavigate();
    
    // 1. Data Fetching (UNCHANGED)
    const { data: users, loading: usersLoading } = useFirestore('users');
    const { data: leaves, loading: leavesLoading } = useFirestore('leaves');
    const { data: attendance, loading: attendanceLoading } = useFirestore('attendance');

    // 💡 Real-time calculation (UNCHANGED LOGIC)
    const hrStats = useMemo(() => {
        if (usersLoading || leavesLoading || attendanceLoading || !users || !leaves || !attendance) {
            return {
                pendingLeaves: '...', activeEmployees: '...', 
                attendancePercent: 0, attendanceLabel: '...', nextPayroll: '7 Jan'
            };
        }

        const activeEmployees = users.filter(u => u.role !== 'admin').length;
        const pendingLeaves = leaves.filter(l => l.status === 'Pending').length;
        
        // Attendance Logic
        const today = new Date().toISOString().split('T')[0];
        const todayRecords = attendance.filter(a => a.date === today);
        let attendancePercent = 0;
        
        if (activeEmployees > 0 && todayRecords.length > 0) {
            const presentCount = todayRecords.filter(a => a.status === 'Present').length;
            attendancePercent = Math.round((presentCount / activeEmployees) * 100);
        }

        return {
            pendingLeaves,
            activeEmployees,
            attendancePercent,
            attendanceLabel: `${attendancePercent}%`,
            nextPayroll: '7 Jan'
        };

    }, [users, leaves, attendance, usersLoading, leavesLoading, attendanceLoading]);

    const overallLoading = usersLoading || leavesLoading || attendanceLoading;

    // Animation Variants
    const containerVariants = {
        hidden: { opacity: 0 },
        visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
    };
    const itemVariants = {
        hidden: { y: 20, opacity: 0 },
        visible: { y: 0, opacity: 1 }
    };

    return (
        <div className="min-h-screen bg-gray-50/50 dark:bg-gray-900 p-6 md:p-8 transition-colors duration-300">
            
            {/* --- HEADER --- */}
            <div className="mb-10 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">HR Command Center</h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-2 font-medium flex items-center gap-2">
                        Welcome back, <span className="text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 px-2 py-0.5 rounded-lg border border-indigo-100 dark:border-indigo-800">{currentUser?.email?.split('@')[0]}</span>
                    </p>
                </div>
                <div className="hidden md:flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm text-sm font-semibold text-gray-600 dark:text-gray-300">
                    <Calendar size={16} className="text-indigo-500 dark:text-indigo-400" />
                    {new Date().toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long' })}
                </div>
            </div>

            {/* --- LOADING STATE --- */}
            {overallLoading ? (
                <div className="flex justify-center items-center h-64 bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700">
                    <LoadingSpinner message="Analysing workforce data..." size="40px" />
                </div>
            ) : (
                <motion.div 
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                    className="space-y-8"
                >
                    {/* --- STATS GRID --- */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        
                        {/* 1. Pending Leaves */}
                        <motion.div variants={itemVariants} className="relative group bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-lg transition-all hover:-translate-y-1">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Leave Requests</p>
                                    <h3 className="text-3xl font-extrabold text-gray-800 dark:text-white mt-2">{hrStats.pendingLeaves}</h3>
                                    <p className="text-xs text-orange-500 dark:text-orange-400 font-bold mt-1 bg-orange-50 dark:bg-orange-900/30 px-2 py-0.5 rounded-md inline-block">Action Required</p>
                                </div>
                                <div className="p-3 bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 rounded-xl shadow-inner group-hover:scale-110 transition-transform">
                                    <Clock size={24} />
                                </div>
                            </div>
                        </motion.div>

                        {/* 2. Active Employees */}
                        <motion.div variants={itemVariants} className="relative group bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-lg transition-all hover:-translate-y-1">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Total Workforce</p>
                                    <h3 className="text-3xl font-extrabold text-gray-800 dark:text-white mt-2">{hrStats.activeEmployees}</h3>
                                    <p className="text-xs text-blue-500 dark:text-blue-400 font-bold mt-1 bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 rounded-md inline-block">Active Status</p>
                                </div>
                                <div className="p-3 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-xl shadow-inner group-hover:scale-110 transition-transform">
                                    <Users size={24} />
                                </div>
                            </div>
                        </motion.div>

                        {/* 3. Attendance Gauge */}
                        <motion.div variants={itemVariants} className="relative group bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-lg transition-all hover:-translate-y-1">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Today's Presence</p>
                                    <h3 className="text-3xl font-extrabold text-gray-800 dark:text-white mt-2">{hrStats.attendanceLabel}</h3>
                                    <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-1.5 mt-3 overflow-hidden">
                                        <div className="bg-emerald-500 h-1.5 rounded-full transition-all duration-1000" style={{ width: hrStats.attendanceLabel }}></div>
                                    </div>
                                </div>
                                <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-xl shadow-inner group-hover:scale-110 transition-transform">
                                    <CheckCircle size={24} />
                                </div>
                            </div>
                        </motion.div>

                        {/* 4. Payroll */}
                        <motion.div variants={itemVariants} className="relative group bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-lg transition-all hover:-translate-y-1">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Next Payroll</p>
                                    <h3 className="text-3xl font-extrabold text-gray-800 dark:text-white mt-2">{hrStats.nextPayroll}</h3>
                                    <p className="text-xs text-pink-500 dark:text-pink-400 font-bold mt-1 bg-pink-50 dark:bg-pink-900/30 px-2 py-0.5 rounded-md inline-block">Upcoming</p>
                                </div>
                                <div className="p-3 bg-pink-50 dark:bg-pink-900/20 text-pink-600 dark:text-pink-400 rounded-xl shadow-inner group-hover:scale-110 transition-transform">
                                    <Wallet size={24} />
                                </div>
                            </div>
                        </motion.div>
                    </div>

                    {/* --- QUICK ACTIONS SECTION --- */}
                    <motion.div variants={itemVariants}>
                        <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-6 flex items-center gap-2">
                            ⚡ Quick Actions
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            
                            {/* Action 1: Leave Requests */}
                            <button 
                                onClick={() => navigate('/hr/leave-requests')}
                                className="group relative overflow-hidden p-6 bg-gradient-to-br from-indigo-500 to-purple-600 dark:from-indigo-600 dark:to-purple-700 rounded-2xl shadow-lg text-white text-left transition-transform hover:scale-[1.02]"
                            >
                                <div className="absolute top-0 right-0 p-4 opacity-20 group-hover:opacity-40 transition-opacity">
                                    <FileText size={100} />
                                </div>
                                <div className="relative z-10">
                                    <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center mb-4">
                                        <FileText size={24} className="text-white" />
                                    </div>
                                    <h4 className="text-xl font-bold mb-1">Review Leaves</h4>
                                    <p className="text-indigo-100 text-sm mb-6">Manage pending applications</p>
                                    <div className="flex items-center gap-2 text-sm font-bold bg-white/10 w-fit px-3 py-1.5 rounded-lg group-hover:bg-white/20 transition-colors">
                                        Proceed <ArrowRight size={16} />
                                    </div>
                                </div>
                            </button>

                            {/* Action 2: Attendance */}
                            <button 
                                onClick={() => navigate('/hr/attendance-records')}
                                className="group relative bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 hover:border-indigo-500 dark:hover:border-indigo-500 hover:shadow-md transition-all text-left"
                            >
                                <div className="w-12 h-12 bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                    <UserCheck size={24} />
                                </div>
                                <h4 className="text-lg font-bold text-gray-800 dark:text-white mb-1">Attendance Tracker</h4>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Update daily records & checks</p>
                                <span className="text-sm font-semibold text-purple-600 dark:text-purple-400 flex items-center gap-1 group-hover:gap-2 transition-all">
                                    Open Tracker <ArrowRight size={16} />
                                </span>
                            </button>

                            {/* Action 3: Payroll */}
                            <button 
                                onClick={() => navigate('/hr/payroll-management')}
                                className="group relative bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 hover:border-emerald-500 dark:hover:border-emerald-500 hover:shadow-md transition-all text-left"
                            >
                                <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                    <Banknote size={24} />
                                </div>
                                <h4 className="text-lg font-bold text-gray-800 dark:text-white mb-1">Payroll System</h4>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Generate slips & salary sheets</p>
                                <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 group-hover:gap-2 transition-all">
                                    Manage Payroll <ArrowRight size={16} />
                                </span>
                            </button>

                        </div>
                    </motion.div>
                </motion.div>
            )}
        </div>
    );
}

export default HRDashboard;