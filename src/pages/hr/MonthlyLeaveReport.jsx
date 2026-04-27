// src/pages/hr/MonthlyLeaveReport.jsx

import React, { useState, useMemo } from 'react';
import { useFirestore } from '../../hooks/useFirestore';
import { useAuth } from '../../context/AuthContext'; // 🔥 Import Auth
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { Crown, Shield, User, Briefcase, FileText } from 'lucide-react';

// 🔥 HIERARCHY LEVELS
const ROLE_LEVELS = {
    'super_admin': 4,
    'admin': 3,
    'hr': 2,
    'employee': 1
};

function MonthlyLeaveReport() {
    const { userProfile } = useAuth(); // Get current user info
    const currentLevel = ROLE_LEVELS[userProfile?.role] || 0;

    const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
    const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM

    // 1. Fetch ALL Users (We filter in JS)
    const { data: allUsers } = useFirestore('users');

    // 💡 Filter Users Based on Hierarchy
    const employees = useMemo(() => {
        if (!allUsers) return [];
        return allUsers.filter(u => {
            const uLevel = ROLE_LEVELS[u.role] || 0;
            // Show only users BELOW current rank (Standard reporting)
            return uLevel < currentLevel;
        }).sort((a, b) => {
            const getNum = (id) => {
                if (!id) return 9999;
                const match = id.match(/\d+$/);
                return match ? parseInt(match[0], 10) : 9999;
            };
            return getNum(a.empId) - getNum(b.empId);
        });
    }, [allUsers, currentLevel]);

    // 2. Fetch Leaves for Selected Employee
    const leavesFilters = useMemo(() => 
        selectedEmployeeId ? [['userId', '==', selectedEmployeeId]] : null, 
    [selectedEmployeeId]);

    const { data: allRequests, loading } = useFirestore('leaves', leavesFilters);

    // 3. 🧠 SMART LOGIC: Process Data & Expand Date Ranges
    const reportData = useMemo(() => {
        if (!allRequests || !selectedMonth) return { days: [], stats: {} };

        const targetMonth = selectedMonth; 
        let processedDays = [];
        
        // Stats Counters
        let stats = { Sick: 0, Casual: 0, Earned: 0, Unpaid: 0, Travel: 0, TotalOff: 0 };

        // Filter APPROVED items only (Leaves and Travel)
        const approvedItems = allRequests.filter(req => 
            req.status === 'Approved' && 
            (req.type === 'leave' || req.type === 'travel')
        );

        approvedItems.forEach(req => {
            let current = new Date(req.startDate);
            const end = new Date(req.endDate);

            // Determine Label & Category
            let displayType = 'Unknown';
            let categoryKey = 'Other';

            if (req.type === 'travel') {
                displayType = req.travelType || 'Travel'; 
                categoryKey = 'Travel';
            } else {
                displayType = req.leaveType || 'Leave'; 
                categoryKey = displayType.split(' ')[0]; 
            }

            // Date Range Loop
            while (current <= end) {
                const dateStr = current.toISOString().split('T')[0];
                
                // If date matches selected month
                if (dateStr.startsWith(targetMonth)) {
                    
                    processedDays.push({
                        date: dateStr,
                        type: displayType, 
                        category: req.type, 
                        reason: req.reason,
                        status: req.status
                    });

                    // Update Counters
                    if (categoryKey === 'Travel') {
                        stats.Travel++;
                    } else {
                        if (stats[categoryKey] !== undefined) stats[categoryKey]++;
                        else stats[categoryKey] = (stats[categoryKey] || 0) + 1;
                        stats.TotalOff++; 
                    }
                }
                current.setDate(current.getDate() + 1);
            }
        });

        // Sort by Date
        processedDays.sort((a, b) => new Date(a.date) - new Date(b.date));

        return { days: processedDays, stats };

    }, [allRequests, selectedMonth]);

    // 4. CSV Export Function
    const exportToCSV = () => {
        if (!reportData.days.length) {
            alert("No data to export!");
            return;
        }

        const empName = employees?.find(e => e.uid === selectedEmployeeId)?.name || 'Employee';
        const headers = ["Date", "Day", "Category", "Type", "Reason", "Status"];

        const rows = reportData.days.map(record => {
            const dayName = new Date(record.date).toLocaleDateString('en-US', { weekday: 'short' });
            return [
                record.date, 
                dayName, 
                record.category === 'travel' ? 'Travel/OD' : 'Leave',
                record.type, 
                `"${record.reason.replace(/"/g, '""')}"`, 
                record.status
            ];
        });

        const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        
        link.setAttribute('href', url);
        link.setAttribute('download', `Report_${empName}_${selectedMonth}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="min-h-screen bg-gray-50/50 dark:bg-gray-900 p-6 transition-colors duration-300">
            
            {/* --- HEADER --- */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
                        Monthly Leave Report
                        {userProfile?.role === 'super_admin' && <span className="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded-full border border-amber-200"><Crown size={12} className="inline mr-1"/>Owner</span>}
                    </h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Attendance analysis for Leaves & Travel.</p>
                </div>
                
                {reportData.days.length > 0 && (
                    <button 
                        onClick={exportToCSV}
                        className="bg-green-600 hover:bg-green-700 text-white px-5 py-2.5 rounded-lg shadow-sm hover:shadow-md transition-all flex items-center gap-2 font-medium active:scale-95"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                        Export CSV
                    </button>
                )}
            </div>

            {/* --- FILTERS TOOLBAR --- */}
            <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 mb-8 flex flex-col md:flex-row gap-4 items-end transition-colors duration-300">
                
                {/* Employee Selector */}
                <div className="w-full md:w-1/3">
                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">Select Employee</label>
                    <div className="relative">
                        <select 
                            value={selectedEmployeeId}
                            onChange={(e) => setSelectedEmployeeId(e.target.value)}
                            className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:bg-white dark:focus:bg-gray-800 focus:ring-2 focus:ring-blue-500 outline-none appearance-none cursor-pointer text-gray-900 dark:text-white"
                        >
                            <option value="" disabled>-- Choose Employee --</option>
                            {employees?.map(emp => (
                                <option key={emp.uid} value={emp.uid}>
                                    {emp.name} ({emp.role.toUpperCase()})
                                </option>
                            ))}
                        </select>
                        <div className="absolute inset-y-0 right-0 flex items-center px-3 pointer-events-none text-gray-500 dark:text-gray-400">▼</div>
                    </div>
                </div>

                {/* Month Selector */}
                <div className="w-full md:w-1/4">
                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">Select Month</label>
                    <input 
                        type="month" 
                        value={selectedMonth}
                        onChange={(e) => setSelectedMonth(e.target.value)}
                        className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:bg-white dark:focus:bg-gray-800 focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white dark:[color-scheme:dark]"
                    />
                </div>
            </div>

            {/* --- REPORT CONTENT --- */}
            {selectedEmployeeId ? (
                loading ? (
                    <div className="py-20"><LoadingSpinner message="Analysing Data..." size="40px" /></div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        
                        {/* LEFT: SUMMARY CARD (Sticky) */}
                        <div className="lg:col-span-1">
                            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 sticky top-6 transition-colors duration-300">
                                <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-6 flex items-center gap-2">
                                    📊 Monthly Stats
                                </h3>
                                
                                <div className="space-y-4">
                                    <StatRow label="Sick Leave" value={reportData.stats.Sick} icon="🤒" color="text-red-600 dark:text-red-400" bg="bg-red-50 dark:bg-red-900/20" />
                                    <StatRow label="Casual Leave" value={reportData.stats.Casual} icon="🏠" color="text-yellow-600 dark:text-yellow-400" bg="bg-yellow-50 dark:bg-yellow-900/20" />
                                    <StatRow label="Earned Leave" value={reportData.stats.Earned} icon="🌴" color="text-green-600 dark:text-green-400" bg="bg-green-50 dark:bg-green-900/20" />
                                    <StatRow label="Unpaid Leave" value={reportData.stats.Unpaid} icon="💸" color="text-gray-600 dark:text-gray-400" bg="bg-gray-50 dark:bg-gray-700/50" />
                                    
                                    <div className="my-4 border-b border-gray-100 dark:border-gray-700"></div>
                                    
                                    {/* Travel Stat */}
                                    <StatRow label="Travel / OD" value={reportData.stats.Travel} icon="✈️" color="text-purple-600 dark:text-purple-400" bg="bg-purple-50 dark:bg-purple-900/20" />

                                    <div className="pt-4 mt-2 border-t border-gray-100 dark:border-gray-700 flex justify-between items-center">
                                        <span className="font-bold text-gray-700 dark:text-gray-300">Total Leaves Taken</span>
                                        <span className="font-mono font-bold text-lg text-gray-900 dark:text-white">{reportData.stats.TotalOff}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* RIGHT: DETAILED TABLE */}
                        <div className="lg:col-span-2">
                            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden transition-colors duration-300">
                                <div className="overflow-x-auto">
                                    <table className="w-full whitespace-nowrap text-left">
                                        <thead className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-100 dark:border-gray-700">
                                            <tr>
                                                <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Date</th>
                                                <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Day</th>
                                                <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Type</th>
                                                <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Reason</th>
                                                <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Status</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                            {reportData.days.length > 0 ? (
                                                reportData.days.map((record, index) => (
                                                    <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                                        <td className="px-6 py-4 font-medium text-gray-800 dark:text-gray-200">{record.date}</td>
                                                        <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                                                            {new Date(record.date).toLocaleDateString('en-US', { weekday: 'long' })}
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <TypeBadge type={record.type} category={record.category} />
                                                        </td>
                                                        <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400 truncate max-w-[150px]" title={record.reason}>
                                                            {record.reason}
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <span className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800 text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wide">Approved</span>
                                                        </td>
                                                    </tr>
                                                ))
                                            ) : (
                                                <tr>
                                                    <td colSpan="5" className="p-12 text-center text-gray-400 dark:text-gray-500 italic">
                                                        No approved leaves or travel in this month.
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            ) : (
                <div className="flex flex-col items-center justify-center py-20 bg-white dark:bg-gray-800 rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-700 transition-colors duration-300">
                    <span className="text-4xl mb-4">👆</span>
                    <h3 className="text-lg font-bold text-gray-700 dark:text-gray-200">Select an Employee</h3>
                    <p className="text-gray-500 dark:text-gray-400">Choose an employee to view their detailed activity.</p>
                </div>
            )}
        </div>
    );
}

// 🧱 UI Components
const StatRow = ({ label, value, icon, color, bg }) => (
    <div className={`flex justify-between items-center p-3 rounded-lg ${bg}`}>
        <div className="flex items-center gap-3">
            <span>{icon}</span>
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{label}</span>
        </div>
        <span className={`font-bold text-lg ${color}`}>{value || 0}</span>
    </div>
);

const TypeBadge = ({ type, category }) => {
    // Determine Style based on Category (Leave vs Travel)
    if (category === 'travel') {
        return (
            <span className="px-2 py-0.5 rounded-full text-xs font-bold border bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 border-purple-200 dark:border-purple-800">
                ✈️ {type}
            </span>
        );
    }

    // Default Leave Styles
    const baseType = type ? type.split(' ')[0] : 'Unknown';
    const colors = {
        'Sick': 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800',
        'Casual': 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800',
        'Annual': 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800',
        'Earned': 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800',
        'Unpaid': 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-600'
    };
    
    return (
        <span className={`px-2 py-0.5 rounded-full text-xs font-bold border ${colors[baseType] || 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-600'}`}>
            {type}
        </span>
    );
};

export default MonthlyLeaveReport;