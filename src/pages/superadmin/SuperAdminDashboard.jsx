// src/pages/admin/SuperAdminDashboard.jsx

import React, { useMemo, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useFirestore } from '../../hooks/useFirestore';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { motion, AnimatePresence } from 'framer-motion'; 
import { 
    Users, Shield, Lock, Activity, Server, Globe, 
    ArrowRight, Crown, AlertTriangle, CheckCircle 
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../Firebase';

function SuperAdminDashboard() {
    const { currentUser } = useAuth();
    const navigate = useNavigate();
    
    // Fetch Global Data
    const { data: users, loading: usersLoading } = useFirestore('users');
    const { data: settings, loading: settingsLoading } = useFirestore('settings'); // Assuming a 'settings' collection exists

    // State for Maintenance Mode Toggle
    const [togglingMaintenance, setTogglingMaintenance] = useState(false);

    // 💡 Real-time Stats Calculation
    const stats = useMemo(() => {
        if (!users) return null;

        const totalAdmins = users.filter(u => u.role === 'admin').length;
        const totalHRs = users.filter(u => u.role === 'hr').length;
        const totalEmployees = users.filter(u => u.role === 'employee').length;
        const blockedUsers = users.filter(u => u.isBlocked).length;

        return [
            { title: 'Operations Admins', value: totalAdmins, icon: <Shield size={24} />, color: 'from-purple-500 to-indigo-600', bg: 'bg-purple-100 dark:bg-purple-900/30', text: 'text-purple-600 dark:text-purple-400' },
            { title: 'HR Managers', value: totalHRs, icon: <Users size={24} />, color: 'from-teal-400 to-teal-600', bg: 'bg-teal-100 dark:bg-teal-900/30', text: 'text-teal-600 dark:text-teal-400' },
            { title: 'Active Employees', value: totalEmployees, icon: <Activity size={24} />, color: 'from-blue-400 to-blue-600', bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-600 dark:text-blue-400' },
            { title: 'Blocked Accounts', value: blockedUsers, icon: <Lock size={24} />, color: 'from-red-400 to-red-600', bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-600 dark:text-red-400' },
        ];
    }, [users]);

    // 🛠 Toggle Maintenance Mode (Global Lockdown)
    const toggleMaintenance = async () => {
        const currentStatus = settings?.[0]?.maintenanceMode || false; // Assuming 'settings' collection has 1 doc
        const docId = settings?.[0]?.id || 'global'; // Use existing ID or 'global'

        if (!window.confirm(`Are you sure you want to turn ${currentStatus ? 'OFF' : 'ON'} Maintenance Mode? \n\n${!currentStatus ? 'This will kick out all non-admin users!' : 'Users will be able to login again.'}`)) return;

        setTogglingMaintenance(true);
        try {
            await updateDoc(doc(db, 'settings', docId), { maintenanceMode: !currentStatus });
        } catch (err) {
            alert("Failed to update system status. Ensure 'settings' collection exists.");
            console.error(err);
        } finally {
            setTogglingMaintenance(false);
        }
    };

    const isMaintenanceOn = settings?.[0]?.maintenanceMode || false;

    // Animation Variants
    const containerVariants = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.1 } } };
    const itemVariants = { hidden: { y: 20, opacity: 0 }, visible: { y: 0, opacity: 1 } };

    if (usersLoading || settingsLoading) {
        return <div className="flex justify-center items-center h-screen bg-gray-50 dark:bg-gray-900"><LoadingSpinner message="Loading Command Center..." size="50px" /></div>;
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6 md:p-10 transition-colors duration-300 font-sans">
            
            {/* --- HEADER --- */}
            <div className="mb-10 flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-xl text-amber-600 dark:text-amber-400">
                            <Crown size={28} />
                        </div>
                        <span className="px-3 py-1 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-xs font-bold uppercase tracking-widest border border-amber-200 dark:border-amber-800">
                            Super Admin Console
                        </span>
                    </div>
                    <h1 className="text-4xl font-black text-gray-900 dark:text-white tracking-tight">System Overview</h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-2 font-medium">
                        Welcome back, Sir. You have full control over the organization.
                    </p>
                </div>

                {/* System Status Indicator */}
                <div className={`px-5 py-3 rounded-2xl border flex items-center gap-3 shadow-sm ${isMaintenanceOn ? 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800' : 'bg-emerald-50 border-emerald-200 dark:bg-emerald-900/20 dark:border-emerald-800'}`}>
                    <div className={`w-3 h-3 rounded-full animate-pulse ${isMaintenanceOn ? 'bg-red-500' : 'bg-emerald-500'}`}></div>
                    <div>
                        <p className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">System Status</p>
                        <p className={`font-bold ${isMaintenanceOn ? 'text-red-700 dark:text-red-400' : 'text-emerald-700 dark:text-emerald-400'}`}>
                            {isMaintenanceOn ? 'MAINTENANCE MODE' : 'OPERATIONAL'}
                        </p>
                    </div>
                </div>
            </div>

            <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-8">
                
                {/* --- STATS GRID --- */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    {stats && stats.map((stat, index) => (
                        <motion.div key={index} variants={itemVariants} whileHover={{ y: -5 }} className="bg-white dark:bg-gray-800 p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 relative overflow-hidden group">
                            <div className={`absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity ${stat.text}`}>
                                {stat.icon}
                            </div>
                            <div className="flex justify-between items-start mb-4">
                                <div className={`p-3 rounded-2xl ${stat.bg} ${stat.text}`}>
                                    {stat.icon}
                                </div>
                            </div>
                            <h3 className="text-3xl font-black text-gray-900 dark:text-white">{stat.value}</h3>
                            <p className="text-sm font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wide mt-1">{stat.title}</p>
                        </motion.div>
                    ))}
                </div>

                {/* --- CONTROL CENTER --- */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    
                    {/* Left: Quick Actions */}
                    <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-3xl shadow-lg border border-gray-100 dark:border-gray-700 p-8">
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                            <Server size={20} className="text-indigo-500"/> Command Center
                        </h3>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <button onClick={() => navigate('/admin/user-management')} className="group p-5 rounded-2xl border border-gray-200 dark:border-gray-600 hover:border-indigo-500 dark:hover:border-indigo-500 bg-gray-50 dark:bg-gray-700/50 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-all text-left">
                                <div className="flex justify-between items-start mb-2">
                                    <div className="p-2 bg-white dark:bg-gray-800 rounded-lg shadow-sm text-indigo-600"><Users size={20}/></div>
                                    <ArrowRight size={18} className="text-gray-300 group-hover:text-indigo-500 transition-colors"/>
                                </div>
                                <h4 className="font-bold text-gray-800 dark:text-white">Manage Organization</h4>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Create Admins, HRs & Employees</p>
                            </button>

                            <button onClick={() => navigate('/kpi')} className="group p-5 rounded-2xl border border-gray-200 dark:border-gray-600 hover:border-purple-500 dark:hover:border-purple-500 bg-gray-50 dark:bg-gray-700/50 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-all text-left">
                                <div className="flex justify-between items-start mb-2">
                                    <div className="p-2 bg-white dark:bg-gray-800 rounded-lg shadow-sm text-purple-600"><Activity size={20}/></div>
                                    <ArrowRight size={18} className="text-gray-300 group-hover:text-purple-500 transition-colors"/>
                                </div>
                                <h4 className="font-bold text-gray-800 dark:text-white">Global KPI/KRA</h4>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Set company-wide goals</p>
                            </button>

                            <button onClick={toggleMaintenance} disabled={togglingMaintenance} className={`group p-5 rounded-2xl border transition-all text-left ${isMaintenanceOn ? 'border-red-500 bg-red-50 dark:bg-red-900/20' : 'border-gray-200 dark:border-gray-600 hover:border-amber-500 bg-gray-50 dark:bg-gray-700/50 hover:bg-amber-50'}`}>
                                <div className="flex justify-between items-start mb-2">
                                    <div className={`p-2 bg-white dark:bg-gray-800 rounded-lg shadow-sm ${isMaintenanceOn ? 'text-red-600' : 'text-amber-600'}`}>
                                        <AlertTriangle size={20}/>
                                    </div>
                                    {togglingMaintenance && <LoadingSpinner size="16px"/>}
                                </div>
                                <h4 className={`font-bold ${isMaintenanceOn ? 'text-red-700 dark:text-red-400' : 'text-gray-800 dark:text-white'}`}>
                                    {isMaintenanceOn ? 'Disable Maintenance' : 'Enable Maintenance'}
                                </h4>
                                <p className={`text-xs mt-1 ${isMaintenanceOn ? 'text-red-600 dark:text-red-300' : 'text-gray-500 dark:text-gray-400'}`}>
                                    {isMaintenanceOn ? 'Restore system access for all' : 'Lock system for updates'}
                                </p>
                            </button>
                        </div>
                    </div>

                    {/* Right: Server Status (Visual Only for now) */}
                    <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-3xl shadow-xl p-8 text-white relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-32 bg-indigo-500 rounded-full filter blur-[80px] opacity-20"></div>
                        
                        <h3 className="text-lg font-bold flex items-center gap-2 mb-6 relative z-10"><Globe size={18}/> Live Metrics</h3>
                        
                        <div className="space-y-6 relative z-10">
                            <div>
                                <div className="flex justify-between text-xs font-bold text-gray-400 mb-1"><span>Database Health</span> <span className="text-emerald-400">Optimal</span></div>
                                <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden">
                                    <div className="h-full bg-emerald-500 w-[98%]"></div>
                                </div>
                            </div>
                            <div>
                                <div className="flex justify-between text-xs font-bold text-gray-400 mb-1"><span>Storage Used</span> <span className="text-blue-400">45%</span></div>
                                <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden">
                                    <div className="h-full bg-blue-500 w-[45%]"></div>
                                </div>
                            </div>
                            <div>
                                <div className="flex justify-between text-xs font-bold text-gray-400 mb-1"><span>Active Sessions</span> <span className="text-purple-400">{users.filter(u => !u.isBlocked).length}</span></div>
                                <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden">
                                    <div className="h-full bg-purple-500 w-[70%] animate-pulse"></div>
                                </div>
                            </div>
                        </div>

                        <div className="mt-8 pt-6 border-t border-gray-700">
                            <p className="text-xs text-gray-400">Last backup: <span className="text-white font-mono">Today, 04:00 AM</span></p>
                        </div>
                    </div>

                </div>
            </motion.div>
        </div>
    );
}

export default SuperAdminDashboard;