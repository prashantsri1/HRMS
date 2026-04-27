// src/pages/hr/LeaveRequests.jsx

import React, { useState, useMemo } from 'react';
import { useFirestore } from '../../hooks/useFirestore'; 
import { useAuth } from '../../context/AuthContext'; 
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { doc, updateDoc, addDoc, collection } from 'firebase/firestore'; 
import { db } from '../../Firebase'; 
import { Shield, User, Crown, CheckCircle, XCircle } from 'lucide-react';

// 🔥 HIERARCHY LEVELS
const ROLE_LEVELS = {
    'super_admin': 4,
    'admin': 3,
    'hr': 2,
    'employee': 1
};

function LeaveRequests() {
    const [message, setMessage] = useState('');
    
    // Auth & Identity
    const { currentUser, userProfile } = useAuth(); 
    const reviewerName = userProfile?.name || currentUser?.email || 'System User'; 
    const userRole = userProfile?.role || 'employee'; 
    const currentLevel = ROLE_LEVELS[userRole] || 0;

    const isHR = userRole === 'hr';
    const isAdmin = userRole === 'admin';
    const isSuperAdmin = userRole === 'super_admin';

    // Firestore Hook - Get ALL Leaves (Filter in JS for Hierarchy)
    const { 
        data: allRequests, 
        loading: loadingData, 
        error: dataError,
    } = useFirestore('leaves'); 

    // 🔍 Filter & Sort: Show active items based on Hierarchy
    const activeRequests = useMemo(() => {
        if (!allRequests) return [];
        
        let filtered = allRequests.filter(req => {
            // 1. Status Check (Show only active)
            const isPending = ['Pending', 'Pending HR', 'Pending Admin'].includes(req.status);
            if (!isPending) return false;

            // 2. Hierarchy Check (Only show subordinates)
            // Fetch requester's role level (Need to join with users collection ideally, but simplified here)
            // Assuming requester info is incomplete, we rely on 'reportsTo' if available or general role logic
            
            // If user is direct report, show.
            if (req.reportsTo === currentUser.uid) return true;

            // Fallback: Show based on Role Hierarchy (if reportsTo is empty)
            // Since we don't have requester's role in 'leaves' collection easily, 
            // we assume Admin/HR sees all pending items for now, but actionable buttons will be restricted.
            return true; 
        });

        // Sort by Date
        return filtered.sort((a, b) => {
            const dateA = a.appliedAt?.toDate ? a.appliedAt.toDate() : new Date(a.appliedAt || 0);
            const dateB = b.appliedAt?.toDate ? b.appliedAt.toDate() : new Date(b.appliedAt || 0);
            return dateB - dateA;
        });
    }, [allRequests, currentUser.uid]);

    // 🔔 Notification Helper
    const sendNotification = async (recipientId, msg, type) => {
        try {
            await addDoc(collection(db, "notifications"), {
                recipientId: recipientId,
                message: msg,
                type: type, 
                link: '/employee/my-leave-status', // Correct link for employee
                status: 'unread',
                createdAt: new Date().toISOString()
            });
        } catch (e) { console.error("Notif Error", e); }
    };

    // Actions (Approve/Reject)
    const handleHRApprove = async (req) => {
        if (!window.confirm("Approve and forward to Admin?")) return;
        setMessage('');
        try {
            await updateDoc(doc(db, 'leaves', req.id), { 
                status: 'Pending Admin', 
                hrActionBy: reviewerName, 
                hrActionDate: new Date().toISOString()
            });
            await sendNotification(req.userId, `Your ${req.type} request forwarded to Admin.`, `${req.type}_status_update`);
            setMessage(`Success! Request forwarded to Admin.`);
            setTimeout(() => setMessage(''), 3000);
        } catch (error) { setMessage(`Error: ${error.message}`); }
    };

    const handleAdminApprove = async (req) => {
        if (!window.confirm("Grant Final Approval?")) return;
        setMessage('');
        try {
            await updateDoc(doc(db, 'leaves', req.id), { 
                status: 'Approved', 
                adminActionBy: reviewerName, 
                adminActionDate: new Date().toISOString()
            });
            await sendNotification(req.userId, `🎉 Your ${req.type} request is Approved!`, `${req.type}_status_update`);
            setMessage(`Success! Request fully approved.`);
            setTimeout(() => setMessage(''), 3000);
        } catch (error) { setMessage(`Error: ${error.message}`); }
    };

    // 👑 Super Admin Override
    const handleSuperAdminApprove = async (req) => {
        if (!window.confirm("Grant Instant Approval (Override)?")) return;
        setMessage('');
        try {
            await updateDoc(doc(db, 'leaves', req.id), { 
                status: 'Approved', 
                adminActionBy: `Super Admin (${reviewerName})`, 
                adminActionDate: new Date().toISOString()
            });
            await sendNotification(req.userId, `🎉 Your ${req.type} request is Approved by Owner!`, `${req.type}_status_update`);
            setMessage(`Request approved instantly.`);
            setTimeout(() => setMessage(''), 3000);
        } catch (error) { setMessage(`Error: ${error.message}`); }
    };

    const handleReject = async (req) => {
        const reason = prompt("Enter rejection reason (optional):");
        if (reason === null) return;
        setMessage('');
        try {
            await updateDoc(doc(db, 'leaves', req.id), { 
                status: 'Rejected',
                rejectedBy: reviewerName, 
                rejectionReason: reason,
                rejectedAt: new Date().toISOString()
            });
            await sendNotification(req.userId, `❌ Your ${req.type} request was Rejected.`, `${req.type}_status_update`);
            setMessage(`Request rejected.`);
            setTimeout(() => setMessage(''), 3000);
        } catch (error) { setMessage(`Error: ${error.message}`); }
    };

    // Helper: Badge Colors & Labels
    const getRequestBadge = (req) => {
        let label = req.type || 'Leave'; 
        let colorClass = 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-600';

        if (req.type === 'travel') {
            label = req.travelType || 'Travel';
            colorClass = 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 border-purple-200 dark:border-purple-800';
        } else if (req.type === 'query') {
            label = 'Query / Complaint';
            colorClass = 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 border-orange-200 dark:border-orange-800';
        } else {
            label = req.leaveType || 'Leave';
            if (label === 'Sick Leave') colorClass = 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-red-100 dark:border-red-800';
            else if (label === 'Casual Leave') colorClass = 'bg-yellow-50 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 border-yellow-100 dark:border-yellow-800';
            else colorClass = 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border-blue-100 dark:border-blue-800';
        }

        return (
            <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${colorClass} uppercase`}>
                {req.type === 'travel' ? '✈️ ' : req.type === 'query' ? '📢 ' : ''}{label}
            </span>
        );
    };

    // Helper: Status Badge Logic
    const getStatusBadge = (status) => {
        if (status === 'Pending HR' || status === 'Pending') return <span className="bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400 text-xs font-bold px-2 py-1 rounded border border-yellow-200 dark:border-yellow-800">⏳ Pending HR</span>;
        if (status === 'Pending Admin') return <span className="bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-400 text-xs font-bold px-2 py-1 rounded border border-purple-200 dark:border-purple-800">🔒 Pending Admin</span>;
        return <span className="bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300 text-xs px-2 py-1 rounded">{status}</span>;
    };

    return (
        <div className="min-h-screen bg-gray-50/50 dark:bg-gray-900 p-6 transition-colors duration-300">
            
            {/* --- HEADER --- */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
                        Request Workflow
                        {isSuperAdmin && <span className="text-xs bg-amber-100 text-amber-700 border border-amber-200 px-2 py-1 rounded-full"><Crown size={12} className="inline mr-1"/>God Mode</span>}
                    </h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        Current Role: <span className="font-bold uppercase text-blue-600 dark:text-blue-400">{userRole.replace('_', ' ')}</span>
                    </p>
                </div>
                <div className="bg-white dark:bg-gray-800 px-4 py-2 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 flex items-center gap-2">
                    <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Pending Items:</span>
                    <span className="bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 px-2 py-0.5 rounded-full text-sm font-bold">
                        {activeRequests.length}
                    </span>
                </div>
            </div>

            {/* --- MESSAGES --- */}
            {message && (
                <div className={`mb-6 p-4 rounded-lg text-sm font-medium flex items-center gap-2 animate-fade-in-down 
                    ${message.startsWith('Error') ? 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border border-red-100 dark:border-red-800' : 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 border border-green-100 dark:border-green-800'}`}>
                    {message.startsWith('Error') ? '❌' : '✅'} {message}
                </div>
            )}

            {/* --- LOADING & ERROR --- */}
            {loadingData && <div className="p-12"><LoadingSpinner message="Checking workflow..." size="40px" /></div>}
            {dataError && <div className="text-red-500 p-4 border border-red-200 bg-red-50 rounded-lg">Error: {dataError}</div>}

            {/* --- EMPTY STATE --- */}
            {!loadingData && activeRequests.length === 0 && !dataError && (
                <div className="flex flex-col items-center justify-center p-12 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 text-center transition-colors">
                    <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-full mb-4">
                        <CheckCircle className="w-8 h-8 text-green-500 dark:text-green-400" />
                    </div>
                    <h4 className="text-lg font-bold text-gray-800 dark:text-white">All Clear!</h4>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">No pending requests in the workflow.</p>
                </div>
            )}

            {/* --- REQUESTS TABLE --- */}
            {!loadingData && activeRequests.length > 0 && (
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden transition-colors duration-300">
                    <div className="overflow-x-auto">
                        <table className="w-full whitespace-nowrap text-left">
                            <thead className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-100 dark:border-gray-700">
                                <tr>
                                    <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Employee</th>
                                    <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Request Details</th>
                                    <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                                    <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                {activeRequests.map(req => (
                                    <tr key={req.id} className="hover:bg-gray-50/80 dark:hover:bg-gray-700/30 transition-colors">
                                        
                                        {/* Employee Name */}
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-9 h-9 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 flex items-center justify-center text-xs font-bold border border-gray-200 dark:border-gray-600">
                                                    {req.name?.charAt(0).toUpperCase()}
                                                </div>
                                                <div>
                                                    <div className="font-bold text-gray-800 dark:text-gray-100 text-sm">{req.name}</div>
                                                    <div className="text-xs text-gray-400 dark:text-gray-500">{req.empId}</div>
                                                </div>
                                            </div>
                                        </td>
                                        
                                        {/* Details */}
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col gap-1">
                                                {getRequestBadge(req)}
                                                {req.type !== 'query' && (
                                                    <span className="text-xs text-gray-600 dark:text-gray-300 font-medium mt-1">
                                                        {req.startDate} <span className="text-gray-400 dark:text-gray-500">➔</span> {req.endDate} 
                                                        <span className="text-gray-400 dark:text-gray-500 ml-1">({req.days} days)</span>
                                                    </span>
                                                )}
                                                <span className="text-xs text-gray-500 dark:text-gray-400 italic truncate max-w-[200px]" title={req.reason}>
                                                    "{req.reason}"
                                                </span>
                                            </div>
                                        </td>
                                        
                                        {/* Status */}
                                        <td className="px-6 py-4">
                                            {getStatusBadge(req.status)}
                                            {req.status === 'Pending Admin' && (
                                                <div className="text-[10px] text-gray-400 dark:text-gray-500 mt-1">
                                                    Checked by: {req.hrActionBy?.split('@')[0]}
                                                </div>
                                            )}
                                        </td>
                                        
                                        {/* Actions */}
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                
                                                {/* 👑 SUPER ADMIN (Can approve ANYTHING instantly) */}
                                                {isSuperAdmin && (
                                                    <button onClick={() => handleSuperAdminApprove(req)} className="bg-amber-500 hover:bg-amber-600 text-white px-3 py-1.5 rounded text-xs font-bold shadow-sm transition flex items-center gap-1">
                                                        <Crown size={12}/> Force Approve
                                                    </button>
                                                )}

                                                {/* 🟢 HR Actions */}
                                                {isHR && (req.status === 'Pending HR' || req.status === 'Pending') && (
                                                    <>
                                                        <button onClick={() => handleHRApprove(req)} className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded text-xs font-bold shadow-sm transition">
                                                            Forward
                                                        </button>
                                                        <button onClick={() => handleReject(req)} className="bg-white dark:bg-gray-700 hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 px-3 py-1.5 rounded text-xs font-bold transition">
                                                            Reject
                                                        </button>
                                                    </>
                                                )}
                                                {isHR && req.status === 'Pending Admin' && !isSuperAdmin && (
                                                    <span className="text-xs text-gray-400 dark:text-gray-500 italic px-2">Waiting for Admin...</span>
                                                )}

                                                {/* 🟢 ADMIN Actions */}
                                                {isAdmin && req.status === 'Pending Admin' && (
                                                    <>
                                                        <button onClick={() => handleAdminApprove(req)} className="bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded text-xs font-bold shadow-sm transition">
                                                            Approve
                                                        </button>
                                                        <button onClick={() => handleReject(req)} className="bg-white dark:bg-gray-700 hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 px-3 py-1.5 rounded text-xs font-bold transition">
                                                            Reject
                                                        </button>
                                                    </>
                                                )}
                                                {isAdmin && (req.status === 'Pending HR' || req.status === 'Pending') && !isSuperAdmin && (
                                                    <span className="text-xs text-gray-400 dark:text-gray-500 italic px-2">Waiting for HR...</span>
                                                )}

                                                {/* 👑 Super Admin Reject */}
                                                {isSuperAdmin && (
                                                    <button onClick={() => handleReject(req)} className="ml-2 bg-white dark:bg-gray-700 hover:bg-red-50 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 px-3 py-1.5 rounded text-xs font-bold transition">
                                                        Reject
                                                    </button>
                                                )}

                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}

export default LeaveRequests;