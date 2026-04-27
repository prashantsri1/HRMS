// src/pages/hr/YearlyPayoffReport.jsx

import React, { useState, useMemo } from 'react';
import { useFirestore } from '../../hooks/useFirestore';
import { useAuth } from '../../context/AuthContext'; // 🔥 Auth Import
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { 
    Download, Calendar, User, FileText, Wallet, 
    TrendingDown, TrendingUp, DollarSign, Crown 
} from 'lucide-react';

// 🔥 Hierarchy Levels
const ROLE_LEVELS = {
    'super_admin': 4,
    'admin': 3,
    'hr': 2,
    'employee': 1
};

function YearlyPayoffReport() {
    const { userProfile } = useAuth();
    const currentLevel = ROLE_LEVELS[userProfile?.role] || 0;

    const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());

    // 1. Fetch All Users (We filter in JS)
    const { data: allUsers } = useFirestore('users');

    // 💡 Filter Users Based on Hierarchy
    const employees = useMemo(() => {
        if (!allUsers) return [];
        return allUsers.filter(u => {
            const uLevel = ROLE_LEVELS[u.role] || 0;
            // Standard rule: Show only subordinates
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

    // 2. Payroll Records Fetch
    const payrollFilters = useMemo(() => 
        selectedEmployeeId ? [['employeeId', '==', selectedEmployeeId]] : null, 
    [selectedEmployeeId]);
    
    const { data: allRecords, loading } = useFirestore('payroll', payrollFilters);

    // 3. Process Logic
    const yearlyData = useMemo(() => {
        if (!allRecords || !selectedYear) return [];
        const filtered = allRecords.filter(rec => rec.month.startsWith(selectedYear));
        return filtered.sort((a, b) => a.month.localeCompare(b.month));
    }, [allRecords, selectedYear]);

    // 4. Calculate Total Yearly Stats
    const totalStats = useMemo(() => {
        return yearlyData.reduce((acc, curr) => ({
            totalNet: acc.totalNet + parseFloat(curr.netSalary || 0),
            totalAdvance: acc.totalAdvance + parseFloat(curr.advanceSalary || 0),
            totalImprest: acc.totalImprest + parseFloat(curr.imprest || 0),
            totalBasic: acc.totalBasic + parseFloat(curr.basicSalary || 0)
        }), { totalNet: 0, totalAdvance: 0, totalImprest: 0, totalBasic: 0 });
    }, [yearlyData]);

    // 5. Export to CSV
    const exportToCSV = () => {
        if (!yearlyData.length) return alert("No data!");
        
        const empName = employees?.find(e => e.uid === selectedEmployeeId)?.name || 'Employee';
        const headers = ["Month", "Basic Salary", "Working Days", "Paid Leaves", "Unpaid Leaves", "Imprest", "Advance", "Net Salary"];
        
        const rows = yearlyData.map(rec => [
            rec.month, rec.basicSalary, rec.totalWorkingDays, rec.paidLeaves, rec.unpaidLeaves, rec.imprest, rec.advanceSalary, rec.netSalary
        ]);

        const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.href = url;
        link.download = `Payoff_${empName}_${selectedYear}.csv`;
        link.click();
    };

    return (
        <div className="min-h-screen bg-gray-50/50 dark:bg-gray-900 p-6 md:p-8 transition-colors duration-300">
            
            {/* --- HEADER --- */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight flex items-center gap-2">
                        Annual Payoff Report
                        {userProfile?.role === 'super_admin' && <span className="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded-full border border-amber-200"><Crown size={12} className="inline mr-1"/>Owner</span>}
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-2 flex items-center gap-2">
                        <Wallet size={16} /> Consolidated salary reports for the financial year.
                    </p>
                </div>
                
                {yearlyData.length > 0 && (
                    <button 
                        onClick={exportToCSV}
                        className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-xl shadow-md hover:shadow-lg transition-all font-semibold active:scale-95"
                    >
                        <Download size={18} /> Export Report
                    </button>
                )}
            </div>

            {/* --- FILTERS TOOLBAR --- */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 mb-8 grid grid-cols-1 md:grid-cols-2 gap-6 items-end transition-colors duration-300">
                
                {/* Employee Selector */}
                <div>
                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-2">Select Employee</label>
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                            <User size={18} />
                        </div>
                        <select 
                            value={selectedEmployeeId} 
                            onChange={(e) => setSelectedEmployeeId(e.target.value)} 
                            className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:bg-white dark:focus:bg-gray-800 focus:ring-2 focus:ring-indigo-500 outline-none appearance-none cursor-pointer transition-all hover:border-indigo-300 font-medium text-gray-700 dark:text-white"
                        >
                            <option value="">-- Choose Employee --</option>
                            {employees?.map(emp => (
                                <option key={emp.uid} value={emp.uid}>
                                    {emp.name} ({emp.empId || 'N/A'})
                                </option>
                            ))}
                        </select>
                        <div className="absolute inset-y-0 right-0 flex items-center px-4 pointer-events-none text-gray-400 text-xs">▼</div>
                    </div>
                </div>

                {/* Year Input */}
                <div>
                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-2">Financial Year</label>
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                            <Calendar size={18} />
                        </div>
                        <input 
                            type="number" 
                            value={selectedYear} 
                            onChange={(e) => setSelectedYear(e.target.value)} 
                            className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:bg-white dark:focus:bg-gray-800 focus:ring-2 focus:ring-indigo-500 outline-none transition-all hover:border-indigo-300 font-medium text-gray-700 dark:text-white placeholder-gray-400 dark:[color-scheme:dark]"
                            placeholder="YYYY"
                        />
                    </div>
                </div>
            </div>

            {/* --- REPORT CONTENT --- */}
            {selectedEmployeeId ? (
                loading ? (
                    <div className="h-64 flex justify-center items-center bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm">
                        <LoadingSpinner message="Calculating financials..." size="40px" />
                    </div>
                ) : (
                    <div className="space-y-8">
                        
                        {/* Summary Stats Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {/* Total Net Pay */}
                            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex items-center justify-between group hover:shadow-md transition-all">
                                <div>
                                    <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1">Total Net Pay</p>
                                    <h3 className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">₹{totalStats.totalNet.toLocaleString()}</h3>
                                </div>
                                <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-xl group-hover:bg-emerald-100 dark:group-hover:bg-emerald-900/30 transition-colors">
                                    <DollarSign size={28} />
                                </div>
                            </div>

                            {/* Total Advances */}
                            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex items-center justify-between group hover:shadow-md transition-all">
                                <div>
                                    <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1">Total Advances</p>
                                    <h3 className="text-3xl font-bold text-rose-600 dark:text-rose-400">₹{totalStats.totalAdvance.toLocaleString()}</h3>
                                </div>
                                <div className="p-3 bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 rounded-xl group-hover:bg-rose-100 dark:group-hover:bg-rose-900/30 transition-colors">
                                    <TrendingDown size={28} />
                                </div>
                            </div>

                            {/* Total Imprest */}
                            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex items-center justify-between group hover:shadow-md transition-all">
                                <div>
                                    <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1">Total Imprest</p>
                                    <h3 className="text-3xl font-bold text-amber-600 dark:text-amber-400">₹{totalStats.totalImprest.toLocaleString()}</h3>
                                </div>
                                <div className="p-3 bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 rounded-xl group-hover:bg-amber-100 dark:group-hover:bg-amber-900/30 transition-colors">
                                    <TrendingUp size={28} />
                                </div>
                            </div>
                        </div>

                        {/* Detailed Table */}
                        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden transition-colors duration-300">
                            <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-700 bg-gray-50/30 dark:bg-gray-700/30">
                                <h3 className="font-bold text-gray-800 dark:text-white text-lg flex items-center gap-2">
                                    <FileText size={18} className="text-gray-500 dark:text-gray-400" /> Detailed Breakdown
                                </h3>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left whitespace-nowrap">
                                    <thead className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-100 dark:border-gray-700">
                                        <tr>
                                            <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Month</th>
                                            <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Basic Pay</th>
                                            <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Work Days</th>
                                            <th className="px-6 py-4 text-xs font-bold text-red-500 dark:text-red-400 uppercase">Unpaid Leaves</th>
                                            <th className="px-6 py-4 text-xs font-bold text-amber-500 dark:text-amber-400 uppercase">Imprest</th>
                                            <th className="px-6 py-4 text-xs font-bold text-amber-500 dark:text-amber-400 uppercase">Advance</th>
                                            <th className="px-6 py-4 text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase text-right">Net Salary</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
                                        {yearlyData.length === 0 ? (
                                            <tr>
                                                <td colSpan="7" className="p-12 text-center text-gray-400 dark:text-gray-500 italic">
                                                    No payroll records found for {selectedYear}
                                                </td>
                                            </tr>
                                        ) : (
                                            yearlyData.map((rec) => (
                                                <tr key={rec.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-700/30 transition-colors">
                                                    <td className="px-6 py-4 font-medium text-gray-900 dark:text-gray-100">{rec.month}</td>
                                                    <td className="px-6 py-4 text-gray-600 dark:text-gray-400">₹{parseFloat(rec.basicSalary).toLocaleString()}</td>
                                                    <td className="px-6 py-4 text-gray-600 dark:text-gray-400">{rec.totalWorkingDays}</td>
                                                    <td className="px-6 py-4 text-red-500 dark:text-red-400 font-medium bg-red-50/30 dark:bg-red-900/10">{rec.unpaidLeaves}</td>
                                                    <td className="px-6 py-4 text-amber-600 dark:text-amber-400">₹{rec.imprest}</td>
                                                    <td className="px-6 py-4 text-amber-600 dark:text-amber-400">₹{rec.advanceSalary}</td>
                                                    <td className="px-6 py-4 text-right">
                                                        <span className="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 px-3 py-1 rounded-full text-sm font-bold shadow-sm font-mono border border-emerald-200 dark:border-emerald-800">
                                                            ₹{parseFloat(rec.netSalary).toLocaleString()}
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )
            ) : (
                <div className="flex flex-col items-center justify-center py-24 bg-white dark:bg-gray-800 rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-700 transition-colors duration-300">
                    <div className="p-4 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-500 dark:text-indigo-400 rounded-full mb-4 animate-bounce">
                        <User size={32} />
                    </div>
                    <h3 className="text-xl font-bold text-gray-800 dark:text-white">Select an Employee</h3>
                    <p className="text-gray-500 dark:text-gray-400 mt-2 max-w-sm text-center">Choose an employee from the list above to generate their annual financial report.</p>
                </div>
            )}
        </div>
    );
}

export default YearlyPayoffReport;