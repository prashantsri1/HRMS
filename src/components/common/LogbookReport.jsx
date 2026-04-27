// src/components/common/LogbookReport.jsx

import React, { useState, useMemo, useEffect } from 'react';
import { useFirestore } from '../../hooks/useFirestore';
import { useAuth } from '../../context/AuthContext';
import LoadingSpinner from './LoadingSpinner';
import * as XLSX from 'xlsx';
import { Calendar, Download, Search, User, Clock, Filter, List, History } from 'lucide-react';
import { motion } from 'framer-motion';
import { collection, getDocs, query } from 'firebase/firestore';
import { db } from '../../Firebase';

const LogbookReport = () => {
    const { userProfile } = useAuth();
    
    // UI State
    const [viewMode, setViewMode] = useState('daily'); // 'daily' or 'history'
    
    // Data States
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [dateRange, setDateRange] = useState({ start: '', end: '' });
    const [selectedEmployee, setSelectedEmployee] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [employees, setEmployees] = useState([]);

    // Permission Check
    const isPrivileged = ['admin', 'super_admin'].includes(userProfile?.role);

    // 1. Fetch Employee List for Dropdown
    useEffect(() => {
        const fetchEmps = async () => {
            const q = query(collection(db, 'users'));
            const snap = await getDocs(q);
            setEmployees(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        };
        fetchEmps();
    }, []);

    // 2. Fetch Logs based on Mode
    // We need logic to switch queries based on mode. useFirestore hook is static, so we'll control filters.
    
    const dailyFilters = useMemo(() => [['date', '==', selectedDate]], [selectedDate]);
    
    // For history, fetching range in Firestore needs index or multiple queries. 
    // Simplified: Fetch by userId, then filter by date client-side (efficient enough for <1000 logs).
    const historyFilters = useMemo(() => 
        selectedEmployee ? [['userId', '==', selectedEmployee]] : null
    , [selectedEmployee]);

    // We use two separate hooks or conditionally use one. Conditional hooks are bad.
    // Let's use one hook but ignore data if mode mismatches, or use manual query for history.
    // Better: Always fetch based on active mode variables.
    
    // Strategy: 
    // If Daily Mode: Fetch by Date.
    // If History Mode: Fetch by UserID (and filter date locally).
    
    const activeFilters = viewMode === 'daily' ? dailyFilters : historyFilters;
    
    // Only fetch if filters are valid
    const shouldFetch = (viewMode === 'daily') || (viewMode === 'history' && selectedEmployee);
    
    const { data: rawLogs, loading } = useFirestore(
        'daily_logs', 
        shouldFetch ? activeFilters : null
    );

    // 3. Process Data (Sorting & Filtering)
    const processedLogs = useMemo(() => {
        if (!rawLogs) return [];
        let data = [...rawLogs];

        if (viewMode === 'history') {
            // Client-side date range filter
            if (dateRange.start) data = data.filter(l => l.date >= dateRange.start);
            if (dateRange.end) data = data.filter(l => l.date <= dateRange.end);
            // Sort by Date Descending
            data.sort((a, b) => b.date.localeCompare(a.date));
        } else {
            // Daily Mode: Filter by Search Term
            if (searchTerm) {
                data = data.filter(log => 
                    log.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    log.userId.includes(searchTerm)
                );
            }
            // Sort by Duration Descending
            data.sort((a, b) => (b.totalDuration || 0) - (a.totalDuration || 0));
        }
        return data;
    }, [rawLogs, viewMode, dateRange, searchTerm]);

    // Helpers
    const formatDuration = (ms) => {
        if (!ms) return "0m";
        const minutes = Math.floor(ms / 60000);
        const hours = Math.floor(minutes / 60);
        return hours > 0 ? `${hours}h ${minutes % 60}m` : `${minutes}m`;
    };

    const getTopModule = (modules) => {
        if (!modules) return "N/A";
        const sorted = Object.entries(modules).sort((a,b) => b[1] - a[1]);
        return sorted.length > 0 ? sorted[0][0].replace('-', ' ') : "N/A";
    };

    // Excel Export
    const handleExport = () => {
        if (processedLogs.length === 0) return alert("No data to export!");
        
        const exportData = processedLogs.map(log => ({
            "Date": log.date,
            "Employee Name": log.userName,
            "Role": log.role,
            "Login Time": log.loginTime ? new Date(log.loginTime.seconds * 1000).toLocaleTimeString() : 'N/A',
            "Last Active": log.lastActive ? new Date(log.lastActive.seconds * 1000).toLocaleTimeString() : 'N/A',
            "Total Active Time": formatDuration(log.totalDuration),
            "Most Used App": getTopModule(log.modules)
        }));

        const ws = XLSX.utils.json_to_sheet(exportData);
        const wb = XLSX.utils.book_new();
        
        const fileName = viewMode === 'daily' 
            ? `Daily_Report_${selectedDate}.xlsx` 
            : `History_${selectedEmployee}_${dateRange.start}_to_${dateRange.end}.xlsx`;

        XLSX.utils.book_append_sheet(wb, ws, "Logs");
        XLSX.writeFile(wb, fileName);
    };

    if (!isPrivileged) return <div className="p-10 text-center text-red-500 font-bold">Access Denied</div>;

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6 md:p-8 font-sans transition-colors duration-300">
            
            {/* HEADER */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight flex items-center gap-2">
                        <span className="bg-indigo-600 w-2 h-8 rounded-full"></span>
                        Logbook Report
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1 ml-4">
                        Audit employee activity and system usage.
                    </p>
                </div>

                {/* MODE TOGGLE */}
                <div className="bg-white dark:bg-gray-800 p-1 rounded-xl border border-gray-200 dark:border-gray-700 flex shadow-sm">
                    <button 
                        onClick={() => setViewMode('daily')}
                        className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all ${viewMode === 'daily' ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300' : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
                    >
                        <List size={16}/> Daily Summary
                    </button>
                    <button 
                        onClick={() => setViewMode('history')}
                        className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all ${viewMode === 'history' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300' : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
                    >
                        <History size={16}/> Employee History
                    </button>
                </div>
            </div>

            {/* CONTROLS BAR */}
            <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 mb-6 flex flex-col md:flex-row gap-4 items-center">
                
                {/* DAILY MODE CONTROLS */}
                {viewMode === 'daily' && (
                    <>
                        <div className="relative flex-1 w-full">
                            <Search size={18} className="absolute left-3 top-3 text-gray-400" />
                            <input 
                                type="text" 
                                placeholder="Search Employee..." 
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                            />
                        </div>
                        <div className="relative">
                            <input 
                                type="date" 
                                value={selectedDate}
                                onChange={(e) => setSelectedDate(e.target.value)}
                                className="pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-medium"
                            />
                            <Calendar size={16} className="absolute left-3 top-3.5 text-gray-400"/>
                        </div>
                    </>
                )}

                {/* HISTORY MODE CONTROLS */}
                {viewMode === 'history' && (
                    <>
                        <select 
                            value={selectedEmployee}
                            onChange={(e) => setSelectedEmployee(e.target.value)}
                            className="flex-1 w-full p-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none font-medium"
                        >
                            <option value="">Select Employee</option>
                            {employees.map(emp => (
                                <option key={emp.id} value={emp.id}>{emp.name || emp.email}</option>
                            ))}
                        </select>
                        <div className="flex items-center gap-2">
                            <input 
                                type="date" 
                                value={dateRange.start}
                                onChange={(e) => setDateRange({...dateRange, start: e.target.value})}
                                className="p-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-600 rounded-xl text-sm"
                            />
                            <span className="text-gray-400">to</span>
                            <input 
                                type="date" 
                                value={dateRange.end}
                                onChange={(e) => setDateRange({...dateRange, end: e.target.value})}
                                className="p-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-600 rounded-xl text-sm"
                            />
                        </div>
                    </>
                )}

                {/* EXPORT BUTTON */}
                <button 
                    onClick={handleExport}
                    disabled={processedLogs.length === 0}
                    className="w-full md:w-auto bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-400 text-white px-6 py-2.5 rounded-xl shadow-lg flex items-center justify-center gap-2 font-bold transition-transform active:scale-95"
                >
                    <Download size={18} /> 
                    {viewMode === 'daily' ? 'Export Daily' : 'Export History'}
                </button>
            </div>

            {/* DATA TABLE */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden min-h-[400px]">
                {loading ? <LoadingSpinner /> : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead className="bg-gray-50 dark:bg-gray-900/50 text-gray-500 dark:text-gray-400 uppercase text-xs font-bold tracking-wider">
                                <tr>
                                    {viewMode === 'history' && <th className="p-5">Date</th>}
                                    <th className="p-5">Employee</th>
                                    <th className="p-5">Login</th>
                                    <th className="p-5">Last Active</th>
                                    <th className="p-5">Total Duration</th>
                                    <th className="p-5">Focus Area</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                {processedLogs.length > 0 ? processedLogs.map((log) => (
                                    <motion.tr 
                                        key={log.id} 
                                        initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                                        className="hover:bg-indigo-50/30 dark:hover:bg-gray-700/30 transition-colors"
                                    >
                                        {viewMode === 'history' && (
                                            <td className="p-5 font-bold text-gray-700 dark:text-gray-300 whitespace-nowrap">
                                                {log.date}
                                            </td>
                                        )}
                                        <td className="p-5">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-500 to-purple-500 flex items-center justify-center text-white text-xs font-bold shadow-md">
                                                    {log.userName.charAt(0)}
                                                </div>
                                                <div>
                                                    <p className="font-bold text-gray-900 dark:text-white text-sm">{log.userName}</p>
                                                    <span className="text-[10px] bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-300 px-1.5 py-0.5 rounded capitalize">
                                                        {log.role.replace('_', ' ')}
                                                    </span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-5 text-gray-600 dark:text-gray-300 font-mono text-xs">
                                            {log.loginTime ? new Date(log.loginTime.seconds * 1000).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '-'}
                                        </td>
                                        <td className="p-5 text-gray-600 dark:text-gray-300 font-mono text-xs">
                                            {log.lastActive ? new Date(log.lastActive.seconds * 1000).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '-'}
                                        </td>
                                        <td className="p-5">
                                            <span className="bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 px-2 py-1 rounded font-bold text-xs whitespace-nowrap">
                                                {formatDuration(log.totalDuration)}
                                            </span>
                                        </td>
                                        <td className="p-5">
                                            <div className="flex flex-col gap-1 w-32">
                                                <span className="text-xs font-semibold text-gray-800 dark:text-gray-200 truncate">
                                                    {getTopModule(log.modules)}
                                                </span>
                                                <div className="w-full h-1 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                                    <div className="h-full bg-purple-500 w-3/4"></div>
                                                </div>
                                            </div>
                                        </td>
                                    </motion.tr>
                                )) : (
                                    <tr>
                                        <td colSpan="6" className="p-10 text-center text-gray-400">
                                            {viewMode === 'history' && !selectedEmployee 
                                                ? "Please select an employee to view history." 
                                                : "No logs found."}
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

export default LogbookReport;