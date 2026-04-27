// src/pages/admin/AdminDashboard.jsx

import React, { useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useFirestore } from '../../hooks/useFirestore';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { motion } from 'framer-motion'; 
import { Users, Clock, Shield, UserPlus, FileText, PieChart, ArrowRight, Briefcase } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

function AdminDashboard() {
    const { currentUser, userProfile } = useAuth(); // userProfile se role milega
    const navigate = useNavigate();
    const currentRole = userProfile?.role;
    
    // 1. Data Fetching
    const { data: users, loading: usersLoading } = useFirestore('users');
    const { data: leaves, loading: leavesLoading } = useFirestore('leaves');

    // 💡 SMART STATS CALCULATION (Role Aware)
    const adminStats = useMemo(() => {
        if (usersLoading || leavesLoading || !users || !leaves) {
            return [
                { title: 'Active Workforce', value: '...', icon: <Users size={24} />, color: 'from-purple-500 to-purple-600', shadow: 'shadow-purple-200 dark:shadow-purple-900/20' },
                { title: 'Pending Actions', value: '...', icon: <Clock size={24} />, color: 'from-amber-500 to-amber-600', shadow: 'shadow-amber-200 dark:shadow-amber-900/20' },
                { title: 'HR Managers', value: '...', icon: <Shield size={24} />, color: 'from-purple-500 to-purple-600', shadow: 'shadow-purple-200 dark:shadow-purple-900/20' },
            ];
        }

        // 🔥 Logic: Admin should not see Super Admin in counts
        // Admin manages -> HR & Employees.
        
        const totalEmployees = users.filter(u => u.role === 'employee').length;
        const totalHRs = users.filter(u => u.role === 'hr').length;
        
        // Active Workforce = Employees + HRs (Excluding Admins/Super Admins)
        const activeWorkforce = totalEmployees + totalHRs;

        // Pending Leaves (Status checks)
        const pendingLeaves = leaves.filter(l => l.status === 'Pending' || l.status === 'Pending HR').length; 
        
        return [
            { 
                title: 'Active Workforce', 
                value: activeWorkforce, 
                icon: <Briefcase size={24} />, 
                color: 'from-purple-500 to-purple-600', 
                shadow: 'shadow-purple-200 dark:shadow-purple-900/20' 
            },
            { 
                title: 'Pending Requests', 
                value: pendingLeaves, 
                icon: <Clock size={24} />, 
                color: 'from-amber-500 to-amber-600', 
                shadow: 'shadow-amber-200 dark:shadow-amber-900/20' 
            },
            { 
                title: 'HR Managers', // Renamed from "System Admins" to be more specific for Ops Admin
                value: totalHRs, 
                icon: <Users size={24} />, 
                color: 'from-purple-500 to-purple-600', 
                shadow: 'shadow-purple-200 dark:shadow-purple-900/20' 
            },
        ];

    }, [users, leaves, usersLoading, leavesLoading]);

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
            <div className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight flex items-center gap-3">
                        Operations Dashboard
                        {currentRole === 'super_admin' && <span className="text-[10px] font-bold bg-amber-100 text-amber-700 border border-amber-200 px-3 py-1 rounded-full uppercase tracking-widest shadow-sm">Viewing as Owner</span>}
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-2 font-medium">
                        Overview of HR and Employee Operations.
                    </p>
                </div>
                <div className="text-xs font-bold text-gray-500 dark:text-gray-400 glass px-4 py-2 rounded-full shadow-sm flex items-center gap-2 uppercase tracking-widest">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span> Live Data
                </div>
            </div>

            {/* --- LOADING STATE --- */}
            {(usersLoading || leavesLoading) ? (
                <div className="flex justify-center items-center h-64 glass rounded-[2rem]">
                    <LoadingSpinner message="Syncing operational data..." />
                </div>
            ) : (
                <motion.div 
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                    className="space-y-10"
                >
                    {/* --- STATS GRID --- */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {adminStats.map((stat, index) => (
                            <motion.div 
                                key={index} 
                                variants={itemVariants}
                                whileHover={{ y: -5 }}
                                className="relative overflow-hidden glass rounded-[2rem] p-8 transition-all group border-t border-white/40 dark:border-white/10"
                            >
                                <div className="flex justify-between items-start z-10 relative">
                                    <div>
                                        <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-2">{stat.title}</p>
                                        <h3 className="text-5xl font-black text-gray-900 dark:text-white tracking-tighter">{stat.value}</h3>
                                    </div>
                                    <div className={`p-4 rounded-2xl bg-gradient-to-br ${stat.color} text-white shadow-xl shadow-${stat.color.split('-')[1]}-500/30 group-hover:scale-110 transition-transform duration-300`}>
                                        {stat.icon}
                                    </div>
                                </div>
                                {/* Decorative Circle */}
                                <div className={`absolute -bottom-10 -right-10 w-40 h-40 rounded-full opacity-[0.03] dark:opacity-10 bg-gradient-to-br ${stat.color} group-hover:scale-150 transition-transform duration-700`}></div>
                            </motion.div>
                        ))}
                    </div>

                    {/* --- QUICK ACTIONS --- */}
                    <div>
                        <h3 className="text-xl font-black text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                            ⚡ Operational Controls
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                            
                            <button 
                                onClick={() => navigate('/admin/user-management')}
                                className="group relative p-6 glass rounded-[2rem] hover:border-violet-500/50 hover:shadow-[0_8px_30px_rgba(124,58,237,0.1)] transition-all text-left overflow-hidden"
                            >
                                <div className="absolute top-0 right-0 p-6 opacity-0 group-hover:opacity-100 transition-opacity text-violet-500">
                                    <ArrowRight size={24} />
                                </div>
                                <div className="w-14 h-14 rounded-2xl bg-violet-50 dark:bg-violet-500/10 text-violet-600 dark:text-violet-400 flex items-center justify-center mb-6 group-hover:scale-110 group-hover:rotate-3 transition-transform shadow-inner">
                                    <UserPlus size={28} />
                                </div>
                                <h4 className="font-bold text-lg text-gray-900 dark:text-white mb-1">Team Management</h4>
                                <p className="text-sm text-gray-500 dark:text-gray-400">Onboard HRs & Employees</p>
                            </button>

                            <button 
                                onClick={() => navigate('/hr/leave-requests')}
                                className="group relative p-6 glass rounded-[2rem] hover:border-amber-500/50 hover:shadow-[0_8px_30px_rgba(245,158,11,0.1)] transition-all text-left overflow-hidden"
                            >
                                <div className="absolute top-0 right-0 p-6 opacity-0 group-hover:opacity-100 transition-opacity text-amber-500">
                                    <ArrowRight size={24} />
                                </div>
                                <div className="w-14 h-14 rounded-2xl bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-6 group-hover:scale-110 group-hover:-rotate-3 transition-transform shadow-inner">
                                    <FileText size={28} />
                                </div>
                                <h4 className="font-bold text-lg text-gray-900 dark:text-white mb-1">Leave Requests</h4>
                                <p className="text-sm text-gray-500 dark:text-gray-400">Approve or Reject Leaves</p>
                            </button>

                            <button 
                                onClick={() => navigate('/hr/payroll-management')}
                                className="group relative p-6 glass rounded-[2rem] hover:border-emerald-500/50 hover:shadow-[0_8px_30px_rgba(16,185,129,0.1)] transition-all text-left overflow-hidden"
                            >
                                <div className="absolute top-0 right-0 p-6 opacity-0 group-hover:opacity-100 transition-opacity text-emerald-500">
                                    <ArrowRight size={24} />
                                </div>
                                <div className="w-14 h-14 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-6 group-hover:scale-110 group-hover:rotate-3 transition-transform shadow-inner">
                                    <PieChart size={28} />
                                </div>
                                <h4 className="font-bold text-lg text-gray-900 dark:text-white mb-1">Payroll Ops</h4>
                                <p className="text-sm text-gray-500 dark:text-gray-400">Process Salaries & Slips</p>
                            </button>

                        </div>
                    </div>
                </motion.div>
            )}
        </div>
    );
}

export default AdminDashboard;