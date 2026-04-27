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
                    <h1 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">HR Command Center</h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-2 font-medium flex items-center gap-2">
                        Welcome back, <span className="text-[10px] font-bold bg-violet-100 text-violet-700 border border-violet-200 dark:bg-violet-900/30 dark:text-violet-400 dark:border-violet-800 px-3 py-1 rounded-full uppercase tracking-widest shadow-sm">{currentUser?.email?.split('@')[0]}</span>
                    </p>
                </div>
                <div className="hidden md:flex items-center gap-2 px-5 py-2.5 glass rounded-full shadow-sm text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-widest">
                    <Calendar size={16} className="text-violet-500" />
                    {new Date().toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long' })}
                </div>
            </div>

            {/* --- LOADING STATE --- */}
            {overallLoading ? (
                <div className="flex justify-center items-center h-64 glass rounded-[2rem]">
                    <LoadingSpinner message="Analysing workforce data..." size="40px" />
                </div>
            ) : (
                <motion.div 
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                    className="space-y-10"
                >
                    {/* --- STATS GRID --- */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        
                        {/* 1. Pending Leaves */}
                        <motion.div variants={itemVariants} className="relative group glass rounded-[2rem] p-6 transition-all border-t border-white/40 dark:border-white/10 hover:-translate-y-1">
                            <div className="flex justify-between items-start z-10 relative">
                                <div>
                                    <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">Leave Requests</p>
                                    <h3 className="text-4xl font-black text-gray-900 dark:text-white mt-2 tracking-tighter">{hrStats.pendingLeaves}</h3>
                                    <p className="text-[9px] text-orange-600 dark:text-orange-400 font-bold mt-2 bg-orange-100 dark:bg-orange-900/30 border border-orange-200 dark:border-orange-800/50 px-2 py-0.5 rounded-full uppercase tracking-wider inline-block">Action Required</p>
                                </div>
                                <div className="p-3 bg-gradient-to-br from-orange-400 to-orange-600 text-white rounded-2xl shadow-lg shadow-orange-500/30 group-hover:scale-110 transition-transform">
                                    <Clock size={24} />
                                </div>
                            </div>
                        </motion.div>

                        {/* 2. Active Employees */}
                        <motion.div variants={itemVariants} className="relative group glass rounded-[2rem] p-6 transition-all border-t border-white/40 dark:border-white/10 hover:-translate-y-1">
                            <div className="flex justify-between items-start z-10 relative">
                                <div>
                                    <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">Total Workforce</p>
                                    <h3 className="text-4xl font-black text-gray-900 dark:text-white mt-2 tracking-tighter">{hrStats.activeEmployees}</h3>
                                    <p className="text-[9px] text-purple-600 dark:text-purple-400 font-bold mt-2 bg-purple-100 dark:bg-purple-900/30 border border-purple-200 dark:border-purple-800/50 px-2 py-0.5 rounded-full uppercase tracking-wider inline-block">Active Status</p>
                                </div>
                                <div className="p-3 bg-gradient-to-br from-purple-400 to-purple-600 text-white rounded-2xl shadow-lg shadow-purple-500/30 group-hover:scale-110 transition-transform">
                                    <Users size={24} />
                                </div>
                            </div>
                        </motion.div>

                        {/* 3. Attendance Gauge */}
                        <motion.div variants={itemVariants} className="relative group glass rounded-[2rem] p-6 transition-all border-t border-white/40 dark:border-white/10 hover:-translate-y-1">
                            <div className="flex justify-between items-start z-10 relative w-full">
                                <div className="w-full">
                                    <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">Today's Presence</p>
                                    <h3 className="text-4xl font-black text-gray-900 dark:text-white mt-2 tracking-tighter">{hrStats.attendanceLabel}</h3>
                                    <div className="w-full bg-gray-200/50 dark:bg-gray-700/50 rounded-full h-2 mt-4 overflow-hidden border border-gray-300/50 dark:border-gray-600/50">
                                        <div className="bg-gradient-to-r from-emerald-400 to-emerald-600 h-full rounded-full transition-all duration-1000 shadow-[0_0_10px_rgba(16,185,129,0.5)]" style={{ width: hrStats.attendanceLabel }}></div>
                                    </div>
                                </div>
                                <div className="p-3 bg-gradient-to-br from-emerald-400 to-emerald-600 text-white rounded-2xl shadow-lg shadow-emerald-500/30 group-hover:scale-110 transition-transform ml-4 shrink-0">
                                    <CheckCircle size={24} />
                                </div>
                            </div>
                        </motion.div>

                        {/* 4. Payroll */}
                        <motion.div variants={itemVariants} className="relative group glass rounded-[2rem] p-6 transition-all border-t border-white/40 dark:border-white/10 hover:-translate-y-1">
                            <div className="flex justify-between items-start z-10 relative">
                                <div>
                                    <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">Next Payroll</p>
                                    <h3 className="text-4xl font-black text-gray-900 dark:text-white mt-2 tracking-tighter">{hrStats.nextPayroll}</h3>
                                    <p className="text-[9px] text-pink-600 dark:text-pink-400 font-bold mt-2 bg-pink-100 dark:bg-pink-900/30 border border-pink-200 dark:border-pink-800/50 px-2 py-0.5 rounded-full uppercase tracking-wider inline-block">Upcoming</p>
                                </div>
                                <div className="p-3 bg-gradient-to-br from-pink-400 to-pink-600 text-white rounded-2xl shadow-lg shadow-pink-500/30 group-hover:scale-110 transition-transform">
                                    <Wallet size={24} />
                                </div>
                            </div>
                        </motion.div>
                    </div>

                    {/* --- QUICK ACTIONS SECTION --- */}
                    <motion.div variants={itemVariants}>
                        <h3 className="text-xl font-black text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                            ⚡ Quick Actions
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            
                            {/* Action 1: Leave Requests */}
                            <button 
                                onClick={() => navigate('/hr/leave-requests')}
                                className="group relative overflow-hidden p-8 bg-gradient-to-br from-violet-600 to-purple-800 rounded-[2rem] shadow-xl shadow-purple-500/20 text-white text-left transition-transform hover:-translate-y-1"
                            >
                                <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 group-hover:scale-110 transition-all">
                                    <FileText size={120} />
                                </div>
                                <div className="relative z-10">
                                    <div className="w-14 h-14 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center mb-6 shadow-inner border border-white/20">
                                        <FileText size={28} className="text-white" />
                                    </div>
                                    <h4 className="text-2xl font-black mb-2 tracking-tight">Review Leaves</h4>
                                    <p className="text-violet-200 text-sm mb-8 font-medium">Manage pending applications</p>
                                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest bg-white/10 border border-white/20 w-fit px-4 py-2 rounded-full group-hover:bg-white/20 transition-colors backdrop-blur-md">
                                        Proceed <ArrowRight size={14} />
                                    </div>
                                </div>
                            </button>

                            {/* Action 2: Attendance */}
                            <button 
                                onClick={() => navigate('/hr/attendance-records')}
                                className="group relative glass rounded-[2rem] p-8 hover:border-purple-500/50 hover:shadow-[0_8px_30px_rgba(124,58,237,0.1)] transition-all text-left overflow-hidden"
                            >
                                <div className="w-14 h-14 bg-purple-50 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 group-hover:-rotate-3 transition-transform shadow-inner">
                                    <UserCheck size={28} />
                                </div>
                                <h4 className="text-xl font-black text-gray-900 dark:text-white mb-2 tracking-tight">Attendance Tracker</h4>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 font-medium">Update daily records & checks</p>
                                <span className="text-xs font-bold text-purple-600 dark:text-purple-400 uppercase tracking-widest flex items-center gap-2 group-hover:gap-3 transition-all">
                                    Open Tracker <ArrowRight size={14} />
                                </span>
                            </button>

                            {/* Action 3: Payroll */}
                            <button 
                                onClick={() => navigate('/hr/payroll-management')}
                                className="group relative glass rounded-[2rem] p-8 hover:border-emerald-500/50 hover:shadow-[0_8px_30px_rgba(16,185,129,0.1)] transition-all text-left overflow-hidden"
                            >
                                <div className="w-14 h-14 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 group-hover:rotate-3 transition-transform shadow-inner">
                                    <Banknote size={28} />
                                </div>
                                <h4 className="text-xl font-black text-gray-900 dark:text-white mb-2 tracking-tight">Payroll System</h4>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 font-medium">Generate slips & salary sheets</p>
                                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest flex items-center gap-2 group-hover:gap-3 transition-all">
                                    Manage Payroll <ArrowRight size={14} />
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