// src/components/common/Logs.jsx

import React, { useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useFirestore } from '../../hooks/useFirestore';
import LoadingSpinner from './LoadingSpinner';
import { motion } from 'framer-motion';
import { Clock, Activity, PieChart, Monitor, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Logs = () => {
    const { currentUser, userProfile } = useAuth();
    const navigate = useNavigate();
    
    // Get Today's ID
    const getTodayId = () => {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    };

    // Fetch ONLY current user's log for today
    const { data: logs, loading } = useFirestore('daily_logs', [
        ['userId', '==', currentUser?.uid],
        ['date', '==', getTodayId()]
    ]);

    const todayLog = logs && logs.length > 0 ? logs[0] : null;

    // Helper to format ms to Hours/Mins
    const formatDuration = (ms) => {
        if (!ms) return "0m";
        const minutes = Math.floor(ms / 60000);
        const hours = Math.floor(minutes / 60);
        if (hours > 0) return `${hours}h ${minutes % 60}m`;
        return `${minutes}m`;
    };

    // Calculate Percentages for Bar Chart
    const moduleStats = useMemo(() => {
        if (!todayLog?.modules) return [];
        const total = todayLog.totalDuration || 1;
        return Object.entries(todayLog.modules)
            .map(([name, duration]) => ({
                name: name.replace('-', ' '),
                duration,
                percent: Math.round((duration / total) * 100),
                formatted: formatDuration(duration)
            }))
            .sort((a, b) => b.duration - a.duration); // Sort highest usage first
    }, [todayLog]);

    const isAdmin = ['admin', 'super_admin'].includes(userProfile?.role);

    if (loading) return <LoadingSpinner />;

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6 md:p-8 transition-colors duration-300 font-sans">
            
            {/* --- HEADER --- */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold text-gray-800 dark:text-white tracking-tight flex items-center gap-3">
                        <Activity className="text-indigo-500" size={32} />
                        Your Activity
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">
                        Track your daily productivity and app usage.
                    </p>
                </div>
                {isAdmin && (
                    <button 
                        onClick={() => navigate('/admin/log-reports')}
                        className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white px-6 py-3 rounded-xl shadow-lg shadow-indigo-500/30 flex items-center gap-2 transition-all transform hover:scale-105 active:scale-95 font-bold"
                    >
                        View All Employees <ArrowRight size={18} />
                    </button>
                )}
            </div>

            {/* --- MAIN GRID --- */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                
                {/* 1. KEY STATS CARD */}
                <motion.div 
                    initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                    className="bg-white dark:bg-gray-800 rounded-3xl p-8 shadow-xl border border-gray-100 dark:border-gray-700 relative overflow-hidden"
                >
                    <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl -mr-10 -mt-10"></div>
                    
                    <div className="flex items-center gap-4 mb-8">
                        <div className="p-4 bg-indigo-50 dark:bg-indigo-900/30 rounded-2xl text-indigo-600 dark:text-indigo-400">
                            <Clock size={32} />
                        </div>
                        <div>
                            <p className="text-sm text-gray-500 dark:text-gray-400 uppercase font-bold tracking-wider">Total Active Time</p>
                            <h2 className="text-4xl font-black text-gray-900 dark:text-white mt-1">
                                {todayLog ? formatDuration(todayLog.totalDuration) : "0m"}
                            </h2>
                        </div>
                    </div>

                    <div className="space-y-6">
                        <div className="flex justify-between items-center p-4 bg-gray-50 dark:bg-gray-700/50 rounded-2xl">
                            <div className="flex items-center gap-3">
                                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                                <span className="text-gray-600 dark:text-gray-300 font-medium">Login Time</span>
                            </div>
                            <span className="font-bold text-gray-900 dark:text-white">
                                {todayLog?.loginTime?.toDate().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) || '--:--'}
                            </span>
                        </div>
                        <div className="flex justify-between items-center p-4 bg-gray-50 dark:bg-gray-700/50 rounded-2xl">
                            <div className="flex items-center gap-3">
                                <div className="w-2 h-2 rounded-full bg-orange-500"></div>
                                <span className="text-gray-600 dark:text-gray-300 font-medium">Last Active</span>
                            </div>
                            <span className="font-bold text-gray-900 dark:text-white">
                                {todayLog?.lastActive?.toDate().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) || '--:--'}
                            </span>
                        </div>
                    </div>
                </motion.div>

                {/* 2. MODULE USAGE CHART (Digital Wellbeing Style) */}
                <motion.div 
                    initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
                    className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-3xl p-8 shadow-xl border border-gray-100 dark:border-gray-700"
                >
                    <div className="flex items-center justify-between mb-8">
                        <h3 className="text-xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
                            <Monitor size={20} className="text-purple-500"/> App Usage
                        </h3>
                        <span className="text-xs font-semibold bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 px-3 py-1 rounded-full">
                            Today
                        </span>
                    </div>

                    {moduleStats.length > 0 ? (
                        <div className="space-y-6">
                            {moduleStats.map((item, index) => (
                                <div key={index} className="group">
                                    <div className="flex justify-between mb-2">
                                        <span className="font-bold text-gray-700 dark:text-gray-200">{item.name}</span>
                                        <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                                            {item.formatted} <span className="text-xs opacity-60">({item.percent}%)</span>
                                        </span>
                                    </div>
                                    <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
                                        <motion.div 
                                            initial={{ width: 0 }}
                                            animate={{ width: `${item.percent}%` }}
                                            transition={{ duration: 1, ease: "easeOut" }}
                                            className={`h-full rounded-full ${
                                                index === 0 ? 'bg-gradient-to-r from-blue-500 to-indigo-600' :
                                                index === 1 ? 'bg-gradient-to-r from-purple-500 to-pink-600' :
                                                'bg-gradient-to-r from-emerald-400 to-teal-500'
                                            }`}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="h-48 flex items-center justify-center text-gray-400 flex-col">
                            <PieChart size={48} className="opacity-20 mb-2"/>
                            <p>No activity recorded yet.</p>
                        </div>
                    )}
                </motion.div>

            </div>
        </div>
    );
};

export default Logs;