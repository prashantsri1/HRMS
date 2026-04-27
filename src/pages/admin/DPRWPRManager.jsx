// src/pages/admin/DPRWPRManager.jsx

import React, { useState, useEffect, useMemo } from 'react';
import { 
    TrendingUp, Calendar, AlertTriangle, CheckCircle, FileText, Download, 
    Plus, X, Save, User, BarChart2, Target, ArrowRight, Crown 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { collection, addDoc, query, where, onSnapshot, orderBy, serverTimestamp } from 'firebase/firestore';
import { db } from '../../Firebase'; 
import { useAuth } from '../../context/AuthContext';
import * as XLSX from 'xlsx';

// 🔥 HIERARCHY LEVELS
const ROLE_LEVELS = {
    'super_admin': 4,
    'admin': 3,
    'hr': 2,
    'employee': 1
};

// --- UTILS ---
const formatDate = (date) => {
    if (!date) return 'N/A';
    // Handle Firestore Timestamp
    const d = date.toDate ? date.toDate() : new Date(date);
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

const calculateStatus = (percentage) => {
    if (percentage >= 100) return { label: 'Excellent', color: 'text-emerald-600 bg-emerald-50 border-emerald-200' };
    if (percentage >= 70) return { label: 'On Track', color: 'text-blue-600 bg-blue-50 border-blue-200' };
    if (percentage >= 40) return { label: 'Lagging', color: 'text-orange-600 bg-orange-50 border-orange-200' };
    return { label: 'Critical', color: 'text-red-600 bg-red-50 border-red-200' };
};

const DPRWPRManager = () => {
    const { userProfile } = useAuth();
    const role = userProfile?.role || 'employee';
    const currentLevel = ROLE_LEVELS[role] || 0;

    // Permissions
    // Level 2+ (HR, Admin, Super Admin) can view others' reports
    const canViewOthers = currentLevel >= 2; 
    const isSuperAdmin = role === 'super_admin';
    
    // State
    const [reportType, setReportType] = useState('DPR'); // 'DPR' or 'WPR'
    const [reports, setReports] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [loading, setLoading] = useState(true);
    
    // Filters (Admin)
    const [selectedEmployee, setSelectedEmployee] = useState('All');
    const [employeesList, setEmployeesList] = useState([]);

    // Form State
    const initialForm = {
        targetTitle: '', 
        metric: 'Count', // Count, Amount, Percentage
        targetValue: '', 
        achievedValue: '', 
        blockers: '', 
        nextPlan: '',
        date: new Date().toISOString().split('T')[0]
    };
    const [formData, setFormData] = useState(initialForm);

    // --- FETCH REPORTS ---
    useEffect(() => {
        setLoading(true);
        let q;
        
        // If Manager, fetch all of that type
        // If Employee, fetch only own of that type
        if (canViewOthers) {
            q = query(collection(db, 'progress_reports'), where('type', '==', reportType), orderBy('createdAt', 'desc'));
        } else {
            q = query(
                collection(db, 'progress_reports'), 
                where('type', '==', reportType), 
                where('userId', '==', userProfile.uid),
                orderBy('createdAt', 'desc')
            );
        }

        const unsub = onSnapshot(q, (snap) => {
            const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            
            // 🔥 Additional JS Filtering for Hierarchy Security
            // Example: HR shouldn't see Admin reports ideally, but for now we trust the DB fetch.
            // If needed, filter `data` based on `ROLE_LEVELS[item.userRole] < currentLevel` here.
            
            setReports(data);
            
            // Extract unique employees for filter
            if(canViewOthers) {
                const uniqueEmps = [...new Set(data.map(item => item.userName))];
                setEmployeesList(uniqueEmps);
            }
            setLoading(false);
        });

        return () => unsub();
    }, [reportType, userProfile, canViewOthers]);

    // --- HANDLERS ---
    const handleSave = async (e) => {
        e.preventDefault();
        const percentage = Math.min(100, Math.round((parseFloat(formData.achievedValue) / parseFloat(formData.targetValue)) * 100)) || 0;
        
        try {
            await addDoc(collection(db, 'progress_reports'), {
                ...formData,
                type: reportType,
                percentage,
                userId: userProfile.uid,
                userName: userProfile.name || 'Employee',
                userRole: userProfile.role,
                createdAt: serverTimestamp() // Use server timestamp for sorting
            });
            setIsModalOpen(false);
            setFormData(initialForm);
        } catch (err) {
            alert('Failed to save report');
            console.error(err);
        }
    };

    const handleExport = () => {
        if (filteredReports.length === 0) return alert("No data to export");

        const dataToExport = filteredReports.map(r => ({
            "Date": r.date,
            "Employee": r.userName,
            "Role": r.userRole,
            "Type": r.type,
            "Goal/Target": r.targetTitle,
            "Target Value": r.targetValue,
            "Achieved": r.achievedValue,
            "Progress %": r.percentage + '%',
            "Gap/Pending": r.targetValue - r.achievedValue,
            "Blockers": r.blockers || '-',
            "Next Plan": r.nextPlan || '-'
        }));

        const ws = XLSX.utils.json_to_sheet(dataToExport);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, `${reportType}_Reports`);
        XLSX.writeFile(wb, `${reportType}_Report_${new Date().toISOString().split('T')[0]}.xlsx`);
    };

    // --- FILTER LOGIC ---
    const filteredReports = useMemo(() => {
        if (selectedEmployee === 'All') return reports;
        return reports.filter(r => r.userName === selectedEmployee);
    }, [reports, selectedEmployee]);

    return (
        <div className="w-full space-y-6">
            
            {/* --- CONTROLS HEADER --- */}
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700">
                
                {/* Switcher */}
                <div className="flex items-center gap-4">
                    {isSuperAdmin && (
                        <div className="hidden md:flex items-center gap-2 px-3 py-1 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded-full text-xs font-bold border border-amber-200 dark:border-amber-800">
                            <Crown size={14} /> Owner View
                        </div>
                    )}
                    <div className="flex bg-gray-100 dark:bg-gray-700 p-1 rounded-xl">
                        <button 
                            onClick={() => setReportType('DPR')} 
                            className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${reportType === 'DPR' ? 'bg-white dark:bg-gray-600 text-indigo-600 dark:text-indigo-300 shadow-sm' : 'text-gray-500'}`}
                        >
                            Daily Report
                        </button>
                        <button 
                            onClick={() => setReportType('WPR')} 
                            className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${reportType === 'WPR' ? 'bg-white dark:bg-gray-600 text-indigo-600 dark:text-indigo-300 shadow-sm' : 'text-gray-500'}`}
                        >
                            Weekly Report
                        </button>
                    </div>
                </div>

                {/* Filters & Actions */}
                <div className="flex gap-3 w-full md:w-auto">
                    {canViewOthers && (
                        <select 
                            className="px-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-600 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                            value={selectedEmployee}
                            onChange={(e) => setSelectedEmployee(e.target.value)}
                        >
                            <option value="All">All Employees</option>
                            {employeesList.map(e => <option key={e} value={e}>{e}</option>)}
                        </select>
                    )}

                    <button onClick={handleExport} className="p-2.5 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-xl border border-gray-200 transition-colors" title="Export Excel">
                        <Download size={20}/>
                    </button>
                    
                    {/* Anyone can submit a report */}
                    <button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl font-bold shadow-lg transition-transform active:scale-95">
                        <Plus size={18}/> Submit {reportType}
                    </button>
                </div>
            </div>

            {/* --- REPORTS GRID --- */}
            {loading ? (
                <div className="py-20 text-center text-gray-500">Loading reports...</div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    <AnimatePresence>
                        {filteredReports.map((report, index) => (
                            <ReportCard key={report.id} report={report} index={index} />
                        ))}
                    </AnimatePresence>
                    {filteredReports.length === 0 && (
                        <div className="col-span-full py-20 text-center text-gray-400">
                            <BarChart2 size={48} className="mx-auto mb-2 opacity-20"/>
                            <p>No reports found.</p>
                        </div>
                    )}
                </div>
            )}

            {/* --- SUBMISSION MODAL --- */}
            <AnimatePresence>
                {isModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                        <motion.div 
                            initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-white dark:bg-gray-800 w-full max-w-lg rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 flex flex-col max-h-[90vh]"
                        >
                            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-900/50 rounded-t-2xl">
                                <h2 className="text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2">
                                    <TrendingUp className="text-indigo-500" /> Submit {reportType}
                                </h2>
                                <button onClick={() => setIsModalOpen(false)}><X className="text-gray-400 hover:text-red-500"/></button>
                            </div>

                            <form onSubmit={handleSave} className="p-6 space-y-4 overflow-y-auto custom-scrollbar">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="col-span-2">
                                        <label className="label">Date / Week Start</label>
                                        <input type="date" required className="input-std" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} />
                                    </div>
                                    <div className="col-span-2">
                                        <label className="label">Primary Goal / Target</label>
                                        <input type="text" placeholder="e.g. Sales Target, Module Completion" required className="input-std" value={formData.targetTitle} onChange={e => setFormData({...formData, targetTitle: e.target.value})} />
                                    </div>
                                    <div>
                                        <label className="label">Target Value</label>
                                        <input type="number" placeholder="100" required className="input-std" value={formData.targetValue} onChange={e => setFormData({...formData, targetValue: e.target.value})} />
                                    </div>
                                    <div>
                                        <label className="label">Achieved Value</label>
                                        <input type="number" placeholder="70" required className="input-std" value={formData.achievedValue} onChange={e => setFormData({...formData, achievedValue: e.target.value})} />
                                    </div>
                                    <div className="col-span-2">
                                        <label className="label">Blockers / Issues (if any)</label>
                                        <textarea rows={2} placeholder="What stopped you from 100%?" className="input-std" value={formData.blockers} onChange={e => setFormData({...formData, blockers: e.target.value})}></textarea>
                                    </div>
                                    <div className="col-span-2">
                                        <label className="label">Plan for Next {reportType === 'DPR' ? 'Day' : 'Week'}</label>
                                        <textarea rows={2} placeholder="Action plan..." required className="input-std" value={formData.nextPlan} onChange={e => setFormData({...formData, nextPlan: e.target.value})}></textarea>
                                    </div>
                                </div>
                            </form>

                            <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 rounded-b-2xl flex justify-end gap-3">
                                <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg font-bold">Cancel</button>
                                <button onClick={handleSave} className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold shadow-md flex items-center gap-2"><Save size={16}/> Submit Report</button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            <style>{`
                .label { display: block; font-size: 0.75rem; font-weight: 700; color: #6b7280; text-transform: uppercase; margin-bottom: 0.25rem; letter-spacing: 0.05em; }
                .input-std { width: 100%; padding: 0.6rem; border-radius: 0.5rem; border: 1px solid #e5e7eb; background: #f9fafb; outline: none; transition: all 0.2s; font-size: 0.875rem; }
                .dark .input-std { background: #1f2937; border-color: #374151; color: white; }
                .input-std:focus { border-color: #6366f1; background: white; box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1); }
                .dark .input-std:focus { background: #111827; }
            `}</style>
        </div>
    );
};

// --- SUB COMPONENT: REPORT CARD ---
const ReportCard = ({ report, index }) => {
    const status = calculateStatus(report.percentage);
    const gap = report.targetValue - report.achievedValue;

    return (
        <motion.div 
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }}
            className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-md transition-all relative overflow-hidden"
        >
            <div className="flex justify-between items-start mb-4">
                <div>
                    <h4 className="font-bold text-gray-800 dark:text-white text-lg leading-tight">{report.targetTitle}</h4>
                    <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                        <User size={12}/> {report.userName} • {formatDate(report.createdAt || report.date)}
                    </p>
                </div>
                <span className={`text-[10px] px-2 py-1 rounded-full font-bold uppercase tracking-wide border ${status.color}`}>
                    {status.label}
                </span>
            </div>

            {/* Progress Bar Section */}
            <div className="mb-4">
                <div className="flex justify-between text-xs font-bold text-gray-600 dark:text-gray-300 mb-1">
                    <span>Progress</span>
                    <span>{report.percentage}%</span>
                </div>
                <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
                    <motion.div 
                        initial={{ width: 0 }} animate={{ width: `${Math.min(report.percentage, 100)}%` }} 
                        className={`h-full rounded-full ${
                            report.percentage >= 100 ? 'bg-gradient-to-r from-emerald-400 to-emerald-600' :
                            report.percentage >= 70 ? 'bg-gradient-to-r from-blue-400 to-indigo-600' :
                            report.percentage >= 40 ? 'bg-gradient-to-r from-orange-400 to-orange-600' :
                            'bg-gradient-to-r from-red-400 to-red-600'
                        }`}
                    />
                </div>
                <div className="flex justify-between text-[10px] text-gray-400 mt-1">
                    <span>Achieved: {report.achievedValue}</span>
                    <span>Target: {report.targetValue}</span>
                </div>
            </div>

            {/* Gap Analysis */}
            {gap > 0 && (
                <div className="flex items-center gap-2 p-2 bg-red-50 dark:bg-red-900/10 rounded-lg mb-4 border border-red-100 dark:border-red-900/30">
                    <AlertTriangle size={14} className="text-red-500" />
                    <span className="text-xs font-bold text-red-600 dark:text-red-400">Gap Pending: {gap} units</span>
                </div>
            )}

            {/* Footer */}
            <div className="pt-3 border-t border-gray-100 dark:border-gray-700">
                <div className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2">
                    <strong className="text-gray-900 dark:text-gray-200">Next Plan:</strong> {report.nextPlan}
                </div>
                {report.blockers && (
                    <div className="text-xs text-red-500 mt-1 line-clamp-1">
                        <strong>Blocker:</strong> {report.blockers}
                    </div>
                )}
            </div>
        </motion.div>
    );
};

export default DPRWPRManager;