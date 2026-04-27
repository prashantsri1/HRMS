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
                { title: 'Active Workforce', value: '...', icon: <Users size={24} />, color: 'from-blue-500 to-blue-600', shadow: 'shadow-blue-200 dark:shadow-blue-900/20' },
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
                color: 'from-blue-500 to-blue-600', 
                shadow: 'shadow-blue-200 dark:shadow-blue-900/20' 
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
                    <h1 className="text-3xl font-extrabold text-gray-800 dark:text-white tracking-tight flex items-center gap-2">
                        Operations Dashboard
                        {currentRole === 'super_admin' && <span className="text-xs bg-amber-100 text-amber-700 border border-amber-200 px-2 py-1 rounded-full">Viewing as Owner</span>}
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-2 font-medium">
                        Overview of HR and Employee Operations.
                    </p>
                </div>
                <div className="text-sm font-semibold text-gray-400 dark:text-gray-500 bg-white dark:bg-gray-800 px-4 py-2 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm">
                    Live Data Synced
                </div>
            </div>

            {/* --- LOADING STATE --- */}
            {(usersLoading || leavesLoading) ? (
                <div className="flex justify-center items-center h-64">
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
                                className={`relative overflow-hidden bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-xl ${stat.shadow} border border-gray-100 dark:border-gray-700 transition-colors group`}
                            >
                                <div className="flex justify-between items-start z-10 relative">
                                    <div>
                                        <p className="text-sm font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">{stat.title}</p>
                                        <h3 className="text-4xl font-extrabold text-gray-800 dark:text-white mt-2">{stat.value}</h3>
                                    </div>
                                    <div className={`p-3 rounded-xl bg-gradient-to-br ${stat.color} text-white shadow-lg`}>
                                        {stat.icon}
                                    </div>
                                </div>
                                {/* Decorative Circle */}
                                <div className={`absolute -bottom-4 -right-4 w-24 h-24 rounded-full opacity-10 bg-gradient-to-br ${stat.color} group-hover:scale-110 transition-transform duration-500`}></div>
                            </motion.div>
                        ))}
                    </div>

                    {/* --- QUICK ACTIONS --- */}
                    <div>
                        <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-6 flex items-center gap-2">
                            ⚡ Operational Controls
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
                            
                            <button 
                                onClick={() => navigate('/admin/user-management')}
                                className="group relative p-6 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 hover:border-blue-500 dark:hover:border-blue-500 shadow-sm hover:shadow-md transition-all text-left"
                            >
                                <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity text-blue-500 dark:text-blue-400">
                                    <ArrowRight size={20} />
                                </div>
                                <div className="w-12 h-12 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                    <UserPlus size={24} />
                                </div>
                                <h4 className="font-bold text-gray-800 dark:text-gray-100">Team Management</h4>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Onboard HRs & Employees</p>
                            </button>

                            <button 
                                onClick={() => navigate('/hr/leave-requests')}
                                className="group relative p-6 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 hover:border-amber-500 dark:hover:border-amber-500 shadow-sm hover:shadow-md transition-all text-left"
                            >
                                <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity text-amber-500 dark:text-amber-400">
                                    <ArrowRight size={20} />
                                </div>
                                <div className="w-12 h-12 rounded-full bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                    <FileText size={24} />
                                </div>
                                <h4 className="font-bold text-gray-800 dark:text-gray-100">Leave Requests</h4>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Approve or Reject Leaves</p>
                            </button>

                            <button 
                                onClick={() => navigate('/hr/payroll-management')}
                                className="group relative p-6 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 hover:border-purple-500 dark:hover:border-purple-500 shadow-sm hover:shadow-md transition-all text-left"
                            >
                                <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity text-purple-500 dark:text-purple-400">
                                    <ArrowRight size={20} />
                                </div>
                                <div className="w-12 h-12 rounded-full bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                    <PieChart size={24} />
                                </div>
                                <h4 className="font-bold text-gray-800 dark:text-gray-100">Payroll Ops</h4>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Process Salaries & Slips</p>
                            </button>

                        </div>
                    </div>
                </motion.div>
            )}
        </div>
    );
}

export default AdminDashboard;