// src/pages/hr/MonthlyAttendanceReport.jsx

import React, { useState, useMemo } from 'react';
import { useFirestore } from '../../hooks/useFirestore';
import { useAuth } from '../../context/AuthContext'; // 🔥 Import Auth
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { 
    Download, Calendar, User, FileText, CheckCircle, XCircle, 
    Clock, AlertTriangle, Briefcase, Crown, Shield 
} from 'lucide-react';

// 🔥 HIERARCHY LEVELS
const ROLE_LEVELS = {
    'super_admin': 4,
    'admin': 3,
    'hr': 2,
    'employee': 1
};

function MonthlyAttendanceReport() {
    const { userProfile } = useAuth();
    const currentLevel = ROLE_LEVELS[userProfile?.role] || 0;

    const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
    const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM

    // 1. Fetch All Users (We filter in JS)
    const { data: allUsers } = useFirestore('users');

    // 💡 Filter Users Based on Hierarchy
    const employees = useMemo(() => {
        if (!allUsers) return [];
        return allUsers.filter(u => {
            const uLevel = ROLE_LEVELS[u.role] || 0;
            // Show only users BELOW current rank (or allow viewing equals if policy allows)
            // Typically reporting is for subordinates.
            return uLevel < currentLevel;
        }).sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    }, [allUsers, currentLevel]);

    // 2. Fetch Attendance (Filtered by Employee)
    const attendanceFilters = useMemo(() => 
        selectedEmployeeId ? [['employeeUid', '==', selectedEmployeeId]] : null, 
    [selectedEmployeeId]);
    
    const { data: allRecords, loading } = useFirestore('attendance', attendanceFilters);

    // 3. Filter & Calculate Stats
    const reportData = useMemo(() => {
        if (!allRecords || !selectedMonth) return { days: [], stats: {} };

        // Filter for month
        const monthRecords = allRecords.filter(record => record.date.startsWith(selectedMonth));

        // Stats
        const stats = {
            present: monthRecords.filter(r => r.status === 'Present').length,
            absent: monthRecords.filter(r => r.status === 'Absent').length,
            leave: monthRecords.filter(r => r.status === 'Leave').length,
            late: monthRecords.filter(r => r.status === 'Late').length,
            halfDay: monthRecords.filter(r => r.status === 'Half Day').length,
            total: monthRecords.length
        };

        // Sort by Date
        const sortedDays = monthRecords.sort((a, b) => new Date(a.date) - new Date(b.date));

        return { days: sortedDays, stats };
    }, [allRecords, selectedMonth]);

    // 🌟 4. CSV Export Logic
    const exportToCSV = () => {
        if (!reportData.days.length) {
            alert("No data to export!");
            return;
        }

        const empName = employees?.find(e => e.uid === selectedEmployeeId)?.name || 'Employee';
        const headers = ["Date", "Day", "In Time", "Out Time", "Status"];

        const rows = reportData.days.map(record => {
            const dayName = new Date(record.date).toLocaleDateString('en-US', { weekday: 'short' });
            return [
                record.date,
                dayName,
                record.timeIn || '-',
                record.timeOut || '-',
                record.status
            ];
        });

        const csvContent = [
            headers.join(','), 
            ...rows.map(row => row.join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        
        link.setAttribute('href', url);
        link.setAttribute('download', `Attendance_${empName}_${selectedMonth}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="min-h-screen bg-gray-50/50 dark:bg-gray-900 p-6 md:p-8 transition-colors duration-300">
            
            {/* --- HEADER --- */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">Monthly Reports</h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-2 flex items-center gap-2">
                        <FileText size={16} /> Generate detailed logs for your team.
                    </p>
                </div>
                
                {reportData.days.length > 0 && (
                    <button 
                        onClick={exportToCSV}
                        className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-xl shadow-md hover:shadow-lg transition-all font-semibold active:scale-95"
                    >
                        <Download size={18} /> Export CSV
                    </button>
                )}
            </div>

            {/* --- FILTERS TOOLBAR --- */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 mb-8 grid grid-cols-1 md:grid-cols-2 gap-6 items-end transition-colors duration-300">
                
                {/* Employee Selector */}
                <div>
                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-2">Select Team Member</label>
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                            <User size={18} />
                        </div>
                        <select 
                            value={selectedEmployeeId}
                            onChange={(e) => setSelectedEmployeeId(e.target.value)}
                            className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:bg-white dark:focus:bg-gray-800 focus:ring-2 focus:ring-indigo-500 outline-none appearance-none cursor-pointer transition-all hover:border-indigo-300 font-medium text-gray-700 dark:text-gray-200"
                        >
                            <option value="" disabled>-- Choose Employee --</option>
                            {employees?.map(emp => (
                                <option key={emp.id} value={emp.id}>
                                    {emp.name} ({emp.role.toUpperCase()})
                                </option>
                            ))}
                        </select>
                        <div className="absolute inset-y-0 right-0 flex items-center px-4 pointer-events-none text-gray-400 text-xs">▼</div>
                    </div>
                </div>

                {/* Month Selector */}
                <div>
                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-2">Select Month</label>
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                            <Calendar size={18} />
                        </div>
                        <input 
                            type="month" 
                            value={selectedMonth}
                            onChange={(e) => setSelectedMonth(e.target.value)}
                            className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:bg-white dark:focus:bg-gray-800 focus:ring-2 focus:ring-indigo-500 outline-none transition-all hover:border-indigo-300 font-medium text-gray-700 dark:text-gray-200 dark:[color-scheme:dark]"
                        />
                    </div>
                </div>
            </div>

            {/* --- REPORT CONTENT --- */}
            {selectedEmployeeId ? (
                loading ? (
                    <div className="h-64 flex justify-center items-center bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm">
                        <LoadingSpinner message="Generating Report..." size="40px" />
                    </div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        
                        {/* LEFT: SUMMARY STATS (Sticky) */}
                        <div className="lg:col-span-1 space-y-6">
                            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 sticky top-6 transition-colors duration-300">
                                <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-6 flex items-center gap-2 border-b border-gray-100 dark:border-gray-700 pb-4">
                                    📊 Monthly Overview
                                </h3>
                                
                                <div className="space-y-4">
                                    <StatCard label="Present" value={reportData.stats.present} icon={<CheckCircle size={20} />} color="text-emerald-600 dark:text-emerald-400" bg="bg-emerald-50 dark:bg-emerald-900/20" border="border-emerald-100 dark:border-emerald-800" />
                                    <StatCard label="Absent" value={reportData.stats.absent} icon={<XCircle size={20} />} color="text-rose-600 dark:text-rose-400" bg="bg-rose-50 dark:bg-rose-900/20" border="border-rose-100 dark:border-rose-800" />
                                    <StatCard label="Late" value={reportData.stats.late} icon={<Clock size={20} />} color="text-amber-600 dark:text-amber-400" bg="bg-amber-50 dark:bg-amber-900/20" border="border-amber-100 dark:border-amber-800" />
                                    <StatCard label="Leaves" value={reportData.stats.leave} icon={<Briefcase size={20} />} color="text-blue-600 dark:text-blue-400" bg="bg-blue-50 dark:bg-blue-900/20" border="border-blue-100 dark:border-blue-800" />
                                    <StatCard label="Half Days" value={reportData.stats.halfDay} icon={<AlertTriangle size={20} />} color="text-purple-600 dark:text-purple-400" bg="bg-purple-50 dark:bg-purple-900/20" border="border-purple-100 dark:border-purple-800" />
                                    
                                    <div className="pt-4 mt-2 border-t border-gray-100 dark:border-gray-700 flex justify-between items-center">
                                        <span className="font-bold text-gray-600 dark:text-gray-400 text-sm uppercase tracking-wider">Total Logs</span>
                                        <span className="font-mono font-bold text-2xl text-gray-900 dark:text-white">{reportData.stats.total}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* RIGHT: DETAILED TABLE */}
                        <div className="lg:col-span-2">
                            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden transition-colors duration-300">
                                <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-700 bg-gray-50/30 dark:bg-gray-700/30">
                                    <h3 className="font-bold text-gray-800 dark:text-white text-lg">Detailed Logs</h3>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full whitespace-nowrap text-left">
                                        <thead className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-100 dark:border-gray-700">
                                            <tr>
                                                <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Date</th>
                                                <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Day</th>
                                                <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Check In</th>
                                                <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Check Out</th>
                                                <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase text-right">Status</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
                                            {reportData.days.length > 0 ? (
                                                reportData.days.map((record) => (
                                                    <tr key={record.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-700/30 transition-colors">
                                                        <td className="px-6 py-4 font-medium text-gray-900 dark:text-gray-200">{record.date}</td>
                                                        <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                                                            {new Date(record.date).toLocaleDateString('en-US', { weekday: 'long' })}
                                                        </td>
                                                        <td className="px-6 py-4 font-mono text-sm text-gray-600 dark:text-gray-300">{record.timeIn || '-'}</td>
                                                        <td className="px-6 py-4 font-mono text-sm text-gray-600 dark:text-gray-300">{record.timeOut || '-'}</td>
                                                        <td className="px-6 py-4 text-right">
                                                            <StatusBadge status={record.status} />
                                                        </td>
                                                    </tr>
                                                ))
                                            ) : (
                                                <tr>
                                                    <td colSpan="5" className="p-12 text-center">
                                                        <div className="flex flex-col items-center justify-center text-gray-400 dark:text-gray-500">
                                                            <FileText size={48} className="mb-4 opacity-20" />
                                                            <p className="text-lg font-medium text-gray-500 dark:text-gray-400">No records found.</p>
                                                            <p className="text-sm">Try selecting a different month.</p>
                                                        </div>
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
                <div className="flex flex-col items-center justify-center py-24 bg-white dark:bg-gray-800 rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-700 transition-colors duration-300">
                    <div className="p-4 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-500 dark:text-indigo-400 rounded-full mb-4 animate-bounce">
                        <User size={32} />
                    </div>
                    <h3 className="text-xl font-bold text-gray-800 dark:text-white">Select a Team Member</h3>
                    <p className="text-gray-500 dark:text-gray-400 mt-2 max-w-sm text-center">Choose an employee from the dropdown to view their report.</p>
                </div>
            )}
        </div>
    );
}

// 🧱 UI Components
const StatCard = ({ label, value, icon, color, bg, border }) => (
    <div className={`flex justify-between items-center p-4 rounded-xl border ${bg} ${border} transition-transform hover:scale-[1.02]`}>
        <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg bg-white dark:bg-gray-800 ${color} shadow-sm`}>{icon}</div>
            <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">{label}</span>
        </div>
        <span className={`font-bold text-xl ${color}`}>{value}</span>
    </div>
);

const StatusBadge = ({ status }) => {
    const styles = {
        'Present': 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800',
        'Absent': 'bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-800',
        'Late': 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800',
        'Leave': 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800',
        'Half Day': 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 border-purple-200 dark:border-purple-800'
    };
    return (
        <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold border ${styles[status] || 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-600'}`}>
            {status}
        </span>
    );
};

export default MonthlyAttendanceReport;