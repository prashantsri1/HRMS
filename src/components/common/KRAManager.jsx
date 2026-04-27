// src/pages/admin/KRAManager.jsx

import React, { useState, useEffect, useMemo } from 'react';
import { 
    Target, ShieldAlert, CheckCircle2, Plus, Trash2, 
    Briefcase, Lock, Filter, FileText, User, X, Search, BarChart2, ArrowRight,
    Hexagon, Layers, Zap, ChevronRight, Save, Clock, Check, Ban, Edit2, AlertCircle, Crown, Shield
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { collection, addDoc, deleteDoc, doc, updateDoc, onSnapshot, query, where, serverTimestamp, getDocs } from 'firebase/firestore';
import { db } from '../../Firebase';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import * as XLSX from 'xlsx';

// 🔥 HIERARCHY LEVELS
const ROLE_LEVELS = {
    'super_admin': 4,
    'admin': 3,
    'hr': 2,
    'employee': 1
};

const KRAManager = () => {
    const { userProfile } = useAuth();
    const navigate = useNavigate();
    const role = userProfile?.role || 'employee';
    const currentLevel = ROLE_LEVELS[role] || 0;

    // Permissions
    const canManage = currentLevel >= 2; // HR, Admin, Super Admin
    const isSuperAdmin = role === 'super_admin';
  
    // State
    const [allKras, setAllKras] = useState([]);
    const [myKras, setMyKras] = useState([]); 
    const [loading, setLoading] = useState(true);
  
    // Filter State
    const [selectedDept, setSelectedDept] = useState(userProfile?.department || 'IT');
    const [isFormOpen, setIsFormOpen] = useState(false);

    // Reporting State
    const [isReportModalOpen, setIsReportModalOpen] = useState(false);
    const [allEmployees, setAllEmployees] = useState([]);
    const [selectedEmployeeForReport, setSelectedEmployeeForReport] = useState(null);
    const [employeeSearch, setEmployeeSearch] = useState('');
    const [showMobileSidebar, setShowMobileSidebar] = useState(true);

    // Form State
    const initialFormState = { title: '', description: '', department: 'IT', isMandatory: false, weightage: 0 };
    const [kraFormData, setKraFormData] = useState(initialFormState);
    const [editingKraId, setEditingKraId] = useState(null);

    // --- FETCH MASTER KRA TEMPLATES ---
    useEffect(() => {
        // Managers fetch all, Employees fetch only their dept
        const q = canManage 
            ? query(collection(db, 'kra_templates'))
            : query(collection(db, 'kra_templates'), where('department', '==', userProfile?.department || 'IT'));

        const unsub = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
            setAllKras(data);
            setLoading(false);
        });
        return () => unsub();
    }, [userProfile, canManage]);

    // --- FETCH USER SELECTION ---
    useEffect(() => {
        if (userProfile?.kras) {
            const normalized = userProfile.kras.map(k => 
                typeof k === 'string' ? { id: k, status: 'approved' } : k
            );
            setMyKras(normalized);
        } else {
            setMyKras([]);
        }
    }, [userProfile]);

    // --- CALCULATE WEIGHTAGE USAGE ---
    const deptWeightage = useMemo(() => {
        return allKras
            .filter(k => k.department === (canManage ? selectedDept : userProfile?.department) && k.isMandatory)
            .reduce((sum, k) => sum + parseInt(k.weightage || 0), 0);
    }, [allKras, selectedDept, userProfile, canManage]);

    const myTotalWeightage = useMemo(() => {
        const mandatory = allKras.filter(k => k.department === userProfile?.department && k.isMandatory);
        const mySelections = allKras.filter(k => myKras.some(mk => mk.id === k.id)); 
        const combined = [...new Map([...mandatory, ...mySelections].map(k => [k.id, k])).values()];
        return combined.reduce((sum, k) => sum + parseInt(k.weightage || 0), 0);
    }, [allKras, myKras, userProfile]);

    // --- HANDLERS ---
    const fetchAllEmployees = async () => {
        if (!canManage) return;
        const q = query(collection(db, 'users')); // Fetch all to filter in JS
        const snap = await getDocs(q);
        const allUsers = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        
        // 🔥 Hierarchy Filter: Show only subordinates
        const subordinates = allUsers.filter(u => {
            const uLevel = ROLE_LEVELS[u.role] || 0;
            return uLevel < currentLevel;
        });

        setAllEmployees(subordinates);
        setIsReportModalOpen(true);
        setShowMobileSidebar(true); 
    };

    const openAddModal = () => {
        setKraFormData({...initialFormState, department: selectedDept});
        setEditingKraId(null);
        setIsFormOpen(true);
    };

    const openEditModal = (kra) => {
        setKraFormData({
            title: kra.title,
            description: kra.description,
            department: kra.department,
            isMandatory: kra.isMandatory,
            weightage: kra.weightage
        });
        setEditingKraId(kra.id);
        setIsFormOpen(true);
    };

    const handleSaveKra = async (e) => {
        e.preventDefault();
        if (!kraFormData.title) return;

        if (kraFormData.isMandatory) {
            const currentDeptWeight = allKras
                .filter(k => k.department === kraFormData.department && k.isMandatory && k.id !== editingKraId)
                .reduce((sum, k) => sum + parseInt(k.weightage || 0), 0);
            
            if (currentDeptWeight + parseInt(kraFormData.weightage) > 100) {
                return alert(`Error: Adding this mandatory KRA will exceed the 100% weight limit for ${kraFormData.department}. Current: ${currentDeptWeight}%`);
            }
        }
        
        try {
            if (editingKraId) {
                await updateDoc(doc(db, 'kra_templates', editingKraId), {
                    ...kraFormData,
                    updatedAt: serverTimestamp(),
                    updatedBy: userProfile.uid
                });
            } else {
                await addDoc(collection(db, 'kra_templates'), { 
                    ...kraFormData, 
                    createdAt: serverTimestamp(), 
                    createdBy: userProfile.uid 
                });
            }
            setKraFormData(initialFormState);
            setIsFormOpen(false);
        } catch (err) { alert("Error saving KRA"); }
    };

    const handleDeleteKra = async (id) => {
        if (window.confirm("Delete this KRA template?")) {
            await deleteDoc(doc(db, 'kra_templates', id));
        }
    };

    const toggleSelection = async (kra, isMandatory) => {
        if (isMandatory) return; 

        const existing = myKras.find(k => k.id === kra.id);
        let updatedList = [...myKras];

        if (existing) {
            if (existing.status === 'approved') {
                alert("This Goal is locked/approved. Contact Admin to remove.");
                return;
            }
            updatedList = myKras.filter(k => k.id !== kra.id);
        } else {
            if (myTotalWeightage + parseInt(kra.weightage) > 100) {
                return alert(`Cannot select this goal. It would exceed your 100% limit. Current: ${myTotalWeightage}%`);
            }
            updatedList.push({ id: kra.id, status: 'pending', requestedAt: new Date().toISOString() });
        }

        setMyKras(updatedList);
        try { 
            await updateDoc(doc(db, 'users', userProfile.uid), { kras: updatedList }); 
        } catch (err) { console.error(err); }
    };

    const handleAdminAction = async (emp, kraId, action) => {
        if(!emp || !emp.kras) return;
        let updatedKras = [...emp.kras].map(k => typeof k === 'string' ? { id: k, status: 'approved' } : k);

        if (action === 'remove') updatedKras = updatedKras.filter(k => k.id !== kraId);
        else {
            const idx = updatedKras.findIndex(k => k.id === kraId);
            if (idx > -1) {
                if (action === 'approve') updatedKras[idx].status = 'approved';
                if (action === 'reject') updatedKras = updatedKras.filter(k => k.id !== kraId);
            }
        }

        if (selectedEmployeeForReport && selectedEmployeeForReport.id === emp.id) {
            setSelectedEmployeeForReport({ ...selectedEmployeeForReport, kras: updatedKras });
        }

        try { await updateDoc(doc(db, 'users', emp.id), { kras: updatedKras }); } 
        catch(err) { alert("Action failed"); }
    };

    // --- EXPORT LOGIC ---
    const getEmployeeKras = (employee) => {
        const mandatory = allKras.filter(k => k.department === employee.department && k.isMandatory)
                              .map(k => ({ ...k, assignmentStatus: 'mandatory' }));
        
        const userSelections = (employee.kras || []).map(k => typeof k === 'string' ? { id: k, status: 'approved' } : k);
        
        const optional = userSelections.map(sel => {
            const template = allKras.find(k => k.id === sel.id);
            return template ? { ...template, assignmentStatus: sel.status } : null;
        }).filter(k => k !== null);

        return [...mandatory, ...optional];
    };

    const handleExportReport = () => {
        if(!selectedEmployeeForReport) return;
        const kras = getEmployeeKras(selectedEmployeeForReport);
        const data = kras.map((k, i) => ({ 
            "S.No": i+1, 
            "Title": k.title, 
            "Description": k.description, 
            "Type": k.isMandatory ? "Mandatory" : "Optional", 
            "Status": k.assignmentStatus.toUpperCase(),
            "Weightage": k.weightage + "%" 
        }));
        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Goals");
        XLSX.writeFile(wb, `${selectedEmployeeForReport.name}_Goals.xlsx`);
    };

    const filteredKras = allKras.filter(k => canManage ? k.department === selectedDept : true);
    const filteredEmployees = allEmployees.filter(emp => emp.name?.toLowerCase().includes(employeeSearch.toLowerCase()));

    // UI Helper for Weight Bar
    const WeightBar = ({ current }) => (
        <div className="flex items-center gap-2 text-xs font-bold w-full max-w-xs">
            <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div className={`h-full transition-all duration-500 ${current > 100 ? 'bg-red-500' : current === 100 ? 'bg-emerald-500' : 'bg-blue-500'}`} style={{ width: `${Math.min(current, 100)}%` }}></div>
            </div>
            <span className={`${current > 100 ? 'text-red-500' : current === 100 ? 'text-emerald-500' : 'text-gray-500'}`}>{current}%</span>
        </div>
    );

    return (
        <div className="min-h-screen bg-gray-50/50 dark:bg-gray-900 p-4 sm:p-6 md:p-10 font-sans text-gray-800 dark:text-gray-100 overflow-x-hidden relative">
            <div className="absolute top-0 left-0 w-full h-96 bg-gradient-to-b from-indigo-50/50 to-transparent dark:from-indigo-950/20 pointer-events-none -z-10" />

            {/* HEADER SECTION */}
            <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center mb-8 sm:mb-12 gap-6 relative z-10">
                <div>
                    <h1 className="text-3xl sm:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 dark:from-indigo-400 dark:via-purple-400 dark:to-pink-400 flex items-center gap-3 drop-shadow-sm flex-wrap">
                        <Target size={32} className="sm:w-10 sm:h-10 text-indigo-600 dark:text-indigo-400" strokeWidth={2.5} />
                        KRA Management
                        {isSuperAdmin && <span className="text-xs bg-amber-100 text-amber-700 border border-amber-200 px-2 py-1 rounded-full"><Crown size={12} className="inline mr-1"/>Owner</span>}
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-2 font-medium text-sm sm:text-lg ml-1">
                        {canManage ? "Orchestrate Goals & Approve Requests" : "Select & Request Optional Goals"}
                    </p>
                    
                    <div className="mt-3 bg-white/50 dark:bg-black/20 p-2 rounded-lg backdrop-blur-sm inline-flex items-center gap-3 border border-white/20">
                        <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                            {canManage ? `${selectedDept} Mandatory Load` : 'My Goal Load'}
                        </span>
                        <WeightBar current={canManage ? deptWeightage : myTotalWeightage} />
                    </div>
                </div>

                {/* ACTION BAR */}
                {canManage && (
                    <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-3 w-full xl:w-auto bg-white/60 dark:bg-gray-800/60 backdrop-blur-xl p-2 rounded-2xl shadow-lg border border-white/20 dark:border-gray-700">
                        <button onClick={() => navigate('/kpi')} className="col-span-2 sm:col-span-1 bg-gradient-to-r from-emerald-500 to-teal-600 text-white px-4 py-2.5 rounded-xl font-bold shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 hover:scale-105 transition-transform active:scale-95 text-xs sm:text-sm">
                            <BarChart2 size={18}/> KPI Scorecard
                        </button>

                        <button onClick={fetchAllEmployees} className="bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 px-4 py-2.5 rounded-xl font-bold shadow-sm border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 flex items-center justify-center gap-2 transition-all active:scale-95 text-xs sm:text-sm">
                            <FileText size={18} className="text-purple-500"/> Manage Approvals
                        </button>

                        <div className="relative group col-span-2 sm:col-span-1">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Filter className="h-4 w-4 text-indigo-500 group-focus-within:text-indigo-600" />
                            </div>
                            <select 
                                className="w-full pl-9 pr-8 py-2.5 bg-indigo-50 dark:bg-gray-800 border-none rounded-xl text-xs sm:text-sm font-bold text-indigo-700 dark:text-indigo-300 focus:ring-2 focus:ring-indigo-500 outline-none cursor-pointer appearance-none hover:bg-indigo-100 dark:hover:bg-gray-700 transition-colors"
                                value={selectedDept}
                                onChange={(e) => setSelectedDept(e.target.value)}
                            >
                                <option>IT</option><option>HR</option><option>Sales</option><option>Marketing</option><option>Management</option>
                            </select>
                        </div>

                        <button 
                            onClick={openAddModal}
                            className="col-span-2 sm:col-span-1 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl font-bold shadow-lg shadow-indigo-500/30 flex items-center justify-center gap-2 transition-all hover:scale-105 active:scale-95 text-xs sm:text-sm"
                        >
                            <Plus size={18}/> New Template
                        </button>
                    </div>
                )}
            </div>

            {/* --- ADD/EDIT KRA FORM (Admin) --- */}
            <AnimatePresence>
                {isFormOpen && canManage && (
                    <motion.div 
                        initial={{ height: 0, opacity: 0, y: -20 }} animate={{ height: 'auto', opacity: 1, y: 0 }} exit={{ height: 0, opacity: 0, y: -20 }}
                        className="mb-10 overflow-hidden relative z-20"
                    >
                        <div className="bg-white dark:bg-gray-800 p-6 sm:p-8 rounded-3xl shadow-2xl border-2 border-indigo-100 dark:border-gray-700 relative">
                            <h3 className="text-lg font-black text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600 uppercase mb-6 tracking-widest flex items-center gap-2">
                                <Zap size={20} className="text-yellow-500 fill-yellow-500" /> {editingKraId ? 'Edit Performance Metric' : 'Create Performance Metric'}
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6 relative z-10">
                                <div className="col-span-2 group">
                                    <label className="text-xs font-bold text-gray-400 uppercase ml-1 mb-1 block">Title</label>
                                    <input className="w-full p-4 bg-gray-50 dark:bg-gray-900 border-2 border-transparent focus:border-indigo-500 rounded-2xl outline-none font-bold text-gray-800 dark:text-white transition-all shadow-inner" 
                                        value={kraFormData.title} onChange={e=>setKraFormData({...kraFormData, title: e.target.value})} placeholder="e.g. Lead Generation" />
                                </div>
                                <div className="col-span-2 group">
                                    <label className="text-xs font-bold text-gray-400 uppercase ml-1 mb-1 block">Description</label>
                                    <textarea className="w-full p-4 bg-gray-50 dark:bg-gray-900 border-2 border-transparent focus:border-indigo-500 rounded-2xl outline-none font-medium text-gray-700 dark:text-gray-300 transition-all shadow-inner resize-none h-24" 
                                        value={kraFormData.description} onChange={e=>setKraFormData({...kraFormData, description: e.target.value})} placeholder="Success criteria..." />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-gray-400 uppercase ml-1 mb-1 block">Department</label>
                                    <select className="w-full p-4 bg-gray-50 dark:bg-gray-900 border-2 border-transparent focus:border-indigo-500 rounded-2xl outline-none font-bold text-gray-800 dark:text-white cursor-pointer" 
                                        value={kraFormData.department} onChange={e=>setKraFormData({...kraFormData, department: e.target.value})}>
                                        <option>IT</option><option>HR</option><option>Sales</option><option>Marketing</option><option>Management</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-gray-400 uppercase ml-1 mb-1 block">Weightage (%)</label>
                                    <input type="number" className="w-full p-4 bg-gray-50 dark:bg-gray-900 border-2 border-transparent focus:border-indigo-500 rounded-2xl outline-none font-bold text-gray-800 dark:text-white" 
                                        placeholder="20" value={kraFormData.weightage} onChange={e=>setKraFormData({...kraFormData, weightage: e.target.value})}/>
                                </div>
                            </div>
                            <div className="flex flex-col sm:flex-row items-center justify-between pt-4 border-t border-gray-100 dark:border-gray-700 relative z-10 gap-4">
                                <label className="flex items-center gap-3 cursor-pointer group bg-red-50 dark:bg-red-900/10 px-5 py-3 rounded-xl border-2 border-transparent hover:border-red-200 dark:hover:border-red-800 transition-all w-full sm:w-auto justify-center sm:justify-start">
                                    <div className="relative">
                                        <input type="checkbox" checked={kraFormData.isMandatory} onChange={e=>setKraFormData({...kraFormData, isMandatory: e.target.checked})} className="peer sr-only" />
                                        <div className="w-6 h-6 bg-white dark:bg-gray-800 border-2 border-red-300 rounded-lg peer-checked:bg-red-500 peer-checked:border-red-500 transition-all"></div>
                                        <CheckCircle2 size={14} className="absolute top-1 left-1 text-white opacity-0 peer-checked:opacity-100 transition-opacity" />
                                    </div>
                                    <span className="font-bold text-red-600 dark:text-red-400 group-hover:text-red-700 uppercase text-xs tracking-wider">Mandatory Goal</span>
                                </label>
                                <div className="flex gap-2 w-full sm:w-auto">
                                    <button onClick={() => setIsFormOpen(false)} className="flex-1 sm:flex-none px-6 py-3 rounded-xl font-bold text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800">Cancel</button>
                                    <button onClick={handleSaveKra} className="flex-1 sm:flex-none bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3 rounded-xl font-bold shadow-lg transition-all flex items-center justify-center gap-2">
                                        {editingKraId ? 'Update KRA' : 'Add to Library'} <ArrowRight size={18}/>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* --- KRA CARDS GRID --- */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 relative z-10 pb-20">
                {!loading && filteredKras.length === 0 && (
                    <div className="col-span-full py-20 text-center text-gray-400 border-4 border-dashed border-gray-200 dark:border-gray-700 rounded-3xl bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm">
                        <Briefcase size={64} className="mx-auto mb-4 opacity-20"/>
                        <p className="text-xl font-bold">No KRAs found for {selectedDept}</p>
                        <p className="text-sm opacity-60">Create a new template to get started.</p>
                    </div>
                )}

                <AnimatePresence>
                    {filteredKras.map((kra, i) => {
                        const userSelection = myKras.find(k => k.id === kra.id);
                        const isSelected = kra.isMandatory || !!userSelection;
                        const status = kra.isMandatory ? 'mandatory' : (userSelection?.status || 'none');

                        return (
                            <motion.div 
                                key={kra.id}
                                layout
                                initial={{ opacity: 0, scale: 0.8, y: 50 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9 }}
                                transition={{ duration: 0.3, delay: i * 0.05 }}
                                className={`relative p-6 rounded-3xl border-2 transition-all duration-300 group overflow-hidden hover:-translate-y-2
                                    ${isSelected 
                                    ? 'bg-white dark:bg-gray-800 border-indigo-500 dark:border-indigo-500 shadow-2xl shadow-indigo-500/10' 
                                    : 'bg-white/80 dark:bg-gray-800/80 border-transparent hover:border-gray-300 dark:hover:border-gray-600 opacity-80 hover:opacity-100 shadow-sm'
                                    }`}
                            >
                                {isSelected && <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-indigo-500 to-transparent opacity-10 rounded-bl-full pointer-events-none"/>}
                                
                                <div className="flex justify-between items-start mb-4 relative z-10">
                                    <button 
                                        onClick={() => !canManage && toggleSelection(kra, kra.isMandatory)}
                                        disabled={canManage || kra.isMandatory || status === 'approved'}
                                        className={`w-12 h-12 rounded-2xl flex items-center justify-center border-2 transition-all shadow-sm
                                            ${kra.isMandatory 
                                            ? 'bg-red-50 border-red-100 text-red-500 cursor-not-allowed' 
                                            : status === 'approved' 
                                                ? 'bg-emerald-100 border-emerald-500 text-emerald-600 cursor-not-allowed'
                                                : status === 'pending'
                                                    ? 'bg-amber-100 border-amber-500 text-amber-600 animate-pulse'
                                                    : 'bg-gray-50 border-gray-200 text-gray-300 hover:border-indigo-300 hover:text-indigo-300'
                                            }`}
                                    >
                                        {kra.isMandatory ? <Lock size={20}/> : 
                                        status === 'approved' ? <CheckCircle2 size={24}/> : 
                                        status === 'pending' ? <Clock size={20}/> : 
                                        <Plus size={20}/>}
                                    </button>

                                    {canManage && (
                                        <div className="flex gap-2">
                                            <button onClick={() => openEditModal(kra)} className="p-2 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xl transition-all" title="Edit KRA">
                                                <Edit2 size={20}/>
                                            </button>
                                            <button onClick={() => handleDeleteKra(kra.id)} className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all" title="Delete KRA">
                                                <Trash2 size={20}/>
                                            </button>
                                        </div>
                                    )}
                                </div>

                                <div className="relative z-10">
                                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                                        <h3 className={`text-lg sm:text-xl font-black leading-tight ${isSelected ? 'text-gray-900 dark:text-white' : 'text-gray-500'}`}>{kra.title}</h3>
                                        {kra.isMandatory && <span className="px-2 py-0.5 bg-red-100 text-red-600 text-[10px] rounded-md font-extrabold uppercase tracking-wider border border-red-200">Mandatory</span>}
                                        {status === 'pending' && <span className="px-2 py-0.5 bg-amber-100 text-amber-600 text-[10px] rounded-md font-extrabold uppercase tracking-wider border border-amber-200">Pending Approval</span>}
                                        {status === 'approved' && !kra.isMandatory && <span className="px-2 py-0.5 bg-emerald-100 text-emerald-600 text-[10px] rounded-md font-extrabold uppercase tracking-wider border border-emerald-200">Approved</span>}
                                    </div>
                                    <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed line-clamp-3 min-h-[3rem]">{kra.description}</p>
                                </div>

                                <div className="mt-6 pt-4 border-t border-gray-100 dark:border-gray-700 flex gap-3 relative z-10">
                                    <span className="flex-1 py-2 bg-gray-50 dark:bg-gray-900/50 text-gray-600 dark:text-gray-300 text-xs font-bold uppercase rounded-xl border border-gray-200 dark:border-gray-600 text-center flex items-center justify-center gap-1">
                                        <Hexagon size={12} className="text-indigo-500"/> {kra.weightage}% Weight
                                    </span>
                                    <span className="flex-1 py-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 text-xs font-bold uppercase rounded-xl border border-blue-100 dark:border-blue-800 text-center">
                                        {kra.department}
                                    </span>
                                </div>
                            </motion.div>
                        );
                    })}
                </AnimatePresence>
            </div>

            {/* --- APPROVAL & VIEW MODAL --- */}
            <AnimatePresence>
                {isReportModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-md">
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.9, y: 50 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 50 }}
                            className="bg-white dark:bg-gray-800 w-full sm:w-[95%] max-w-5xl sm:rounded-[2rem] shadow-2xl border-0 sm:border-4 border-white/20 flex flex-col h-full sm:max-h-[85vh] overflow-hidden"
                        >
                            <div className="px-4 sm:px-8 py-5 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50/50 dark:bg-gray-900/50">
                                <div>
                                    <h2 className="text-lg sm:text-2xl font-black text-gray-900 dark:text-white flex items-center gap-2 sm:gap-3">
                                        <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-xl text-purple-600 hidden sm:block"><FileText size={24}/></div>
                                        Goal Approvals
                                    </h2>
                                    <p className="text-[10px] sm:text-xs text-gray-500 font-bold uppercase tracking-widest sm:ml-1 mt-1">Review & Approve</p>
                                </div>
                                <div className="flex gap-2">
                                    {selectedEmployeeForReport && <button onClick={() => { setSelectedEmployeeForReport(null); setShowMobileSidebar(true); }} className="sm:hidden px-3 py-1.5 bg-gray-200 dark:bg-gray-700 rounded-lg text-xs font-bold">Back</button>}
                                    <button onClick={() => { setIsReportModalOpen(false); setSelectedEmployeeForReport(null); }} className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-gray-500 hover:bg-red-500 hover:text-white transition-all"><X size={20}/></button>
                                </div>
                            </div>

                            <div className="flex flex-1 overflow-hidden relative">
                                {/* Sidebar List */}
                                <div className={`absolute inset-0 z-10 sm:relative sm:z-0 w-full sm:w-80 border-r border-gray-200 dark:border-gray-700 flex flex-col bg-gray-50 dark:bg-gray-900/30 transition-transform duration-300 ${!showMobileSidebar && selectedEmployeeForReport ? '-translate-x-full sm:translate-x-0' : 'translate-x-0'}`}>
                                    <div className="p-4">
                                        <div className="relative group">
                                            <Search className="absolute left-4 top-3.5 text-gray-400 group-focus-within:text-indigo-500 transition-colors" size={18}/>
                                            <input placeholder="Search..." className="w-full pl-12 pr-4 py-3 rounded-2xl border-2 border-transparent bg-white dark:bg-gray-800 text-sm font-bold outline-none focus:border-indigo-500 shadow-sm transition-all" value={employeeSearch} onChange={e=>setEmployeeSearch(e.target.value)} />
                                        </div>
                                    </div>
                                    <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar">
                                        {filteredEmployees.map(emp => {
                                            const hasPending = emp.kras?.some(k => k.status === 'pending');
                                            return (
                                                <div 
                                                    key={emp.id} 
                                                    onClick={() => { setSelectedEmployeeForReport(emp); setShowMobileSidebar(false); }}
                                                    className={`p-4 rounded-2xl cursor-pointer flex items-center gap-4 transition-all group ${selectedEmployeeForReport?.id === emp.id ? 'bg-indigo-600 text-white shadow-lg' : 'bg-white dark:bg-gray-800 hover:bg-indigo-50 dark:hover:bg-gray-700'}`}
                                                >
                                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-black shadow-inner relative ${selectedEmployeeForReport?.id === emp.id ? 'bg-white/20 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'}`}>
                                                        {emp.name?.charAt(0)}
                                                        {hasPending && <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-white dark:border-gray-800"></div>}
                                                    </div>
                                                    <div>
                                                        <h4 className="text-sm font-bold">{emp.name}</h4>
                                                        <p className={`text-[10px] font-bold uppercase tracking-wide ${selectedEmployeeForReport?.id === emp.id ? 'text-indigo-200' : 'text-gray-400'}`}>{emp.department || 'N/A'}</p>
                                                    </div>
                                                    <ChevronRight size={16} className={`ml-auto ${selectedEmployeeForReport?.id === emp.id ? 'text-white' : 'opacity-30'}`}/>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Detail View */}
                                <div className={`flex-1 p-4 sm:p-8 overflow-y-auto custom-scrollbar bg-white dark:bg-gray-800 w-full transition-transform duration-300 absolute sm:relative inset-0 ${showMobileSidebar && !selectedEmployeeForReport ? 'translate-x-full sm:translate-x-0' : 'translate-x-0'}`}>
                                    {selectedEmployeeForReport ? (
                                        <div className="space-y-8 max-w-3xl mx-auto pb-20">
                                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end border-b-2 border-gray-100 dark:border-gray-700 pb-6 gap-4">
                                                <div>
                                                    <h3 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white mb-2">{selectedEmployeeForReport.name}</h3>
                                                    <div className="flex flex-wrap gap-3">
                                                        <span className="px-3 py-1 bg-gray-100 dark:bg-gray-700 rounded-lg text-xs font-bold text-gray-600 dark:text-gray-300 flex items-center gap-2"><Briefcase size={12}/> {selectedEmployeeForReport.designation || 'N/A'}</span>
                                                    </div>
                                                </div>
                                                <button onClick={handleExportReport} className="flex-1 sm:flex-none px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-lg shadow-emerald-500/30 hover:shadow-emerald-500/50 transition-all active:scale-95 flex items-center justify-center gap-2">
                                                    <Save size={16}/> Excel Export
                                                </button>
                                            </div>
                                            
                                            <div className="grid grid-cols-1 gap-4">
                                                {getEmployeeKras(selectedEmployeeForReport).map((k, i) => (
                                                    <motion.div initial={{opacity:0, y:20}} animate={{opacity:1, y:0}} transition={{delay: i*0.05}} key={i} className={`p-6 rounded-3xl border-2 transition-all hover:shadow-md ${k.assignmentStatus === 'pending' ? 'bg-amber-50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-800' : 'bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700'}`}>
                                                        <div className="flex justify-between items-start mb-2">
                                                            <div className="flex gap-3 items-center">
                                                                {k.isMandatory ? <Lock size={18} className="text-red-500"/> : k.assignmentStatus === 'pending' ? <Clock size={18} className="text-amber-500 animate-pulse"/> : <CheckCircle2 size={18} className="text-emerald-500"/>}
                                                                <h4 className="font-bold text-lg text-gray-800 dark:text-gray-100">{k.title}</h4>
                                                            </div>
                                                            
                                                            {/* ACTION BUTTONS FOR PENDING */}
                                                            {k.assignmentStatus === 'pending' && (
                                                                <div className="flex gap-2">
                                                                    <button onClick={() => handleAdminAction(selectedEmployeeForReport, k.id, 'approve')} className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-lg text-xs font-bold hover:bg-emerald-200 flex items-center gap-1"><Check size={12}/> Approve</button>
                                                                    <button onClick={() => handleAdminAction(selectedEmployeeForReport, k.id, 'reject')} className="px-3 py-1 bg-red-100 text-red-700 rounded-lg text-xs font-bold hover:bg-red-200 flex items-center gap-1"><X size={12}/> Reject</button>
                                                                </div>
                                                            )}
                                                            {k.assignmentStatus === 'approved' && !k.isMandatory && (
                                                                <button onClick={() => handleAdminAction(selectedEmployeeForReport, k.id, 'remove')} className="text-red-400 hover:text-red-600 p-1"><Ban size={16}/></button>
                                                            )}
                                                        </div>
                                                        <p className="text-sm text-gray-500 dark:text-gray-400 pl-8 leading-relaxed">{k.description}</p>
                                                    </motion.div>
                                                ))}
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="h-full flex flex-col items-center justify-center text-gray-400">
                                            <User size={64} className="mb-4 opacity-20"/>
                                            <p className="text-lg font-medium text-center px-4">Select an employee from the list to manage approvals.</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            <style>{`
                .input-std { width: 100%; padding: 1rem; border-radius: 1rem; background-color: #f8fafc; outline: none; transition: all 0.2s; font-size: 0.95rem; font-weight: 600; color: #334155; }
                .dark .input-std { background-color: #1e293b; color: white; }
                .input-std:focus { background-color: white; box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.1); }
                .dark .input-std:focus { background-color: #0f172a; }
            `}</style>
        </div>
    );
};

export default KRAManager;