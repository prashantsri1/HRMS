// src/pages/hr/AttendanceRecords.jsx

import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom'; 
import { useFirestore } from '../../hooks/useFirestore';
import { useAuth } from '../../context/AuthContext'; // 🔥 Import Auth Context
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { 
    Calendar, FileText, User, ChevronDown, CheckCircle, 
    XCircle, Clock, Coffee, Plane, Sun, AlertCircle, Shield, Briefcase, Crown 
} from 'lucide-react';

// 🔥 HIERARCHY LEVELS (Standardized)
const ROLE_LEVELS = {
    'super_admin': 4,
    'admin': 3,
    'hr': 2,
    'employee': 1
};

function AttendanceRecords() {
    const navigate = useNavigate();
    const { userProfile } = useAuth(); // Get current user info
    const currentRole = userProfile?.role || 'employee';
    const currentLevel = ROLE_LEVELS[currentRole] || 0;

    // 📅 1. Date Selection State
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]); 
    const [loadingUpdate, setLoadingUpdate] = useState(null); 

    // 👥 2. Fetch ALL Users (Filtering will happen in JS based on Role)
    // Hum DB se sab layenge, fir JS me filter karenge security ke liye
    // 🔥 FIX: Ensure we handle loading properly
    const { data: allUsers, loading: loadingUsers } = useFirestore('users');

    // 📝 3. Fetch Attendance for Selected Date
    const attendanceFilters = useMemo(() => [['date', '==', selectedDate]], [selectedDate]);
    const { data: attendanceRecords, loading: loadingAttendance, addDocument, updateDocument } = useFirestore('attendance', attendanceFilters);

    // 🔄 4. Data Merging & Hierarchy Filtering Logic
    const attendanceSheet = useMemo(() => {
        if (!allUsers) return [];
        
        // 🔥 Filter: Show only users LOWER than current user rank
        // Example: HR (Level 2) can only see Employees (Level 1)
        // Super Admin (Level 4) can see Admin(3), HR(2), Employee(1)
        const filteredUsers = allUsers.filter(u => {
            const userLevel = ROLE_LEVELS[u.role] || 0;
            // Filter out self and anyone with equal/higher rank
            return userLevel < currentLevel && u.id !== userProfile?.uid;
        });

        const mergedData = filteredUsers.map(emp => {
            const record = attendanceRecords?.find(r => r.employeeUid === emp.uid); // Ensure 'uid' matches field in attendance record
            return {
                ...emp, 
                // Ensure unique ID for key prop later. If emp.id exists use it, otherwise fallback
                uniqueKey: emp.uid || emp.id || Math.random().toString(),
                attendanceId: record?.id || null, 
                currentStatus: record?.status || 'Not Marked', 
                reason: record?.reason || '' 
            };
        });

        // Sorting: High Rank first, then EmpID
        return mergedData.sort((a, b) => {
            const rankDiff = (ROLE_LEVELS[b.role] || 0) - (ROLE_LEVELS[a.role] || 0);
            if (rankDiff !== 0) return rankDiff;

            const getNum = (id) => {
                if (!id) return 9999;
                const match = id.match(/\d+$/);
                return match ? parseInt(match[0], 10) : 9999;
            };
            return getNum(a.empId) - getNum(b.empId);
        });

    }, [allUsers, attendanceRecords, currentLevel, userProfile]);


    // ⚡ 5. Handle Status Change
    const handleStatusChange = async (employee, newStatus) => {
        // Double Check Security
        const targetLevel = ROLE_LEVELS[employee.role] || 0;
        if (targetLevel >= currentLevel) {
            return alert("Access Denied: You cannot mark attendance for this user.");
        }

        let reason = '';
        if (newStatus === 'Others') {
            const userReason = prompt("Please enter the reason for 'Others':");
            if (!userReason || userReason.trim() === '') return;
            reason = userReason;
        }

        setLoadingUpdate(employee.uid); // Use UID for tracking loading state

        try {
            const dataToSave = {
                status: newStatus,
                date: selectedDate,
                timestamp: new Date().toISOString(),
                markedBy: userProfile.uid, // Audit Trail
                markedByRole: currentRole,
                reason: newStatus === 'Others' ? reason : ''
            };

            if (employee.attendanceId) {
                await updateDocument(employee.attendanceId, dataToSave);
            } else {
                await addDocument({
                    employeeUid: employee.uid, // Ensure this matches what you query by
                    employeeId: employee.empId || 'N/A', 
                    name: employee.name,
                    role: employee.role, // Save role for reporting
                    department: employee.department || 'N/A',
                    timeIn: '09:00', // Default
                    timeOut: '18:00',
                    ...dataToSave
                });
            }
        } catch (error) {
            console.error("Error marking attendance:", error);
            alert("Failed to update status. Check console.");
        } finally {
            setLoadingUpdate(null);
        }
    };

    // 🎨 UI Helper
    const getStatusConfig = (status) => {
        switch (status) {
            case 'Present': return { color: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800', icon: <CheckCircle size={14} /> };
            case 'Absent': return { color: 'bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-800', icon: <XCircle size={14} /> };
            case 'Late': return { color: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800', icon: <Clock size={14} /> };
            case 'Half Day': return { color: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 border-purple-200 dark:border-purple-800', icon: <Coffee size={14} /> };
            case 'Leave': return { color: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800', icon: <Plane size={14} /> };
            case 'Holiday': return { color: 'bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400 border-teal-200 dark:border-teal-800', icon: <Sun size={14} /> };
            case 'Others': return { color: 'bg-gray-100 dark:bg-gray-700/50 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-600', icon: <AlertCircle size={14} /> };
            default: return { color: 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700', icon: <ChevronDown size={14} /> };
        }
    };

    const getRoleIcon = (role) => {
        if (role === 'admin') return <Shield size={12} className="text-purple-500"/>;
        if (role === 'hr') return <User size={12} className="text-teal-500"/>;
        return <Briefcase size={12} className="text-blue-500"/>;
    };

    return (
        <div className="min-h-screen bg-gray-50/50 dark:bg-gray-900 p-6 md:p-8 transition-colors duration-300">
            
            {/* --- HEADER SECTION --- */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight flex items-center gap-2">
                        Daily Attendance
                        {currentRole === 'super_admin' && <span className="text-xs bg-amber-100 text-amber-700 border border-amber-200 px-2 py-1 rounded-full"><Crown size={12} className="inline mr-1"/>Owner View</span>}
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-2 flex items-center gap-2">
                        <Calendar size={16} /> Mark records for your team.
                    </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
                    {/* Date Picker */}
                    <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                            <Calendar size={16} />
                        </div>
                        <input 
                            type="date" 
                            value={selectedDate} 
                            onChange={(e) => setSelectedDate(e.target.value)} 
                            className="pl-10 pr-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl shadow-sm focus:ring-2 focus:ring-indigo-500 text-sm font-medium text-gray-700 dark:text-white outline-none w-full sm:w-auto cursor-pointer"
                        />
                    </div>

                    {/* Report Button */}
                    <button 
                        onClick={() => navigate('/hr/monthly-report')}
                        className="flex items-center justify-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-md transition-all active:scale-95 font-medium text-sm"
                    >
                        <FileText size={16} /> Monthly Report
                    </button>
                </div>
            </div>

            {/* --- LOADING STATE --- */}
            {(loadingUsers || loadingAttendance) && !attendanceRecords ? (
                <div className="h-64 flex flex-col justify-center items-center bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                    <LoadingSpinner message="Syncing roster..." size="40px" />
                </div>
            ) : (
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden transition-colors duration-300">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-gray-50/80 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
                                    <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Employee / Role</th>
                                    <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Emp ID</th>
                                    <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Current Status</th>
                                    <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-right">Update Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                {attendanceSheet.length === 0 ? (
                                    <tr>
                                        <td colSpan="4" className="p-12 text-center">
                                            <div className="flex flex-col items-center justify-center text-gray-400 dark:text-gray-500">
                                                <User size={48} className="mb-4 opacity-50" />
                                                <p className="text-lg font-medium text-gray-600 dark:text-gray-300">No staff found.</p>
                                                <p className="text-sm">You can only mark attendance for subordinates.</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    attendanceSheet.map((emp) => {
                                        const statusConfig = getStatusConfig(emp.currentStatus);
                                        return (
                                            // 🔥 FIX: Ensure 'key' is unique using emp.uniqueKey (which falls back to uid/id)
                                            <tr key={emp.uniqueKey} className="hover:bg-gray-50/50 dark:hover:bg-gray-700/30 transition-colors group">
                                                
                                                {/* Name & Role */}
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center text-sm font-bold shadow-md">
                                                            {(emp.name || emp.email).charAt(0).toUpperCase()}
                                                        </div>
                                                        <div>
                                                            <div className="font-bold text-gray-800 dark:text-gray-100 text-sm">{emp.name || emp.email}</div>
                                                            <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 font-medium tracking-wide mt-0.5">
                                                                {getRoleIcon(emp.role)} {emp.role?.toUpperCase()}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    {/* Reason Note */}
                                                    {emp.currentStatus === 'Others' && emp.reason && (
                                                        <div className="mt-2 ml-14 text-xs text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 px-3 py-1.5 rounded-lg w-fit border border-gray-200 dark:border-gray-600 flex items-center gap-1.5">
                                                            <AlertCircle size={12} className="text-gray-500 dark:text-gray-400"/> {emp.reason}
                                                        </div>
                                                    )}
                                                </td>

                                                {/* Emp ID */}
                                                <td className="px-6 py-4">
                                                    <span className="font-mono text-xs font-semibold text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 px-2.5 py-1 rounded-md">
                                                        {emp.empId || 'N/A'}
                                                    </span>
                                                </td>

                                                {/* Current Status Badge */}
                                                <td className="px-6 py-4">
                                                    <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border shadow-sm ${statusConfig.color}`}>
                                                        {statusConfig.icon}
                                                        {emp.currentStatus === 'Not Marked' ? 'Pending' : emp.currentStatus}
                                                    </div>
                                                </td>

                                                {/* Action Dropdown */}
                                                <td className="px-6 py-4 text-right">
                                                    {loadingUpdate === emp.uid ? (
                                                        <div className="inline-flex items-center gap-2 px-4 py-2 bg-gray-50 dark:bg-gray-700 rounded-lg text-indigo-600 dark:text-indigo-400 text-xs font-bold">
                                                            <LoadingSpinner size="16px" /> Saving...
                                                        </div>
                                                    ) : (
                                                        <div className="relative inline-block">
                                                            <select 
                                                                value={emp.currentStatus}
                                                                onChange={(e) => handleStatusChange(emp, e.target.value)}
                                                                className="appearance-none w-40 px-4 py-2 pr-8 text-sm font-medium bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer hover:border-indigo-400 transition-all"
                                                            >
                                                                <option value="Not Marked" disabled>Mark Status</option>
                                                                <option value="Present">✅ Present</option>
                                                                <option value="Absent">❌ Absent</option>
                                                                <option value="Late">⏰ Late</option>
                                                                <option value="Half Day">🌗 Half Day</option>
                                                                <option value="Leave">✈️ On Leave</option>
                                                                <option value="Holiday">🌴 Holiday</option>
                                                                <option value="Others">📝 Others...</option>
                                                            </select>
                                                            <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none text-gray-500">
                                                                <ChevronDown size={14} />
                                                            </div>
                                                        </div>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}

export default AttendanceRecords;