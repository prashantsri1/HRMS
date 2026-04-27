// src/pages/admin/Accounting.jsx

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
    Calculator, ShoppingCart, Package, ArrowRight, Wallet, 
    ShieldCheck, X, Check, Lock, Crown 
} from 'lucide-react';

import { useAuth } from '../../context/AuthContext'; 
import { useCollection } from '../../hooks/useCollection';
import { doc, setDoc, onSnapshot } from 'firebase/firestore'; 
import { db } from '../../Firebase'; 

const Accounting = () => {
    const navigate = useNavigate();
    const { userProfile, currentUser } = useAuth(); 
    const { documents: allUsers } = useCollection('users'); 
    
    const [allowedUserIds, setAllowedUserIds] = useState([]); 
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isLoadingPerms, setIsLoadingPerms] = useState(true);

    const role = userProfile?.role;
    const isSuperAdmin = role === 'super_admin';
    const isAdmin = role === 'admin';
    const isHR = role === 'hr';

    // Manage Access: Only Super Admin & Admin
    const canManageAccess = isSuperAdmin || isAdmin;

    // --- 1. FETCH PERMISSIONS (Real-time) ---
    useEffect(() => {
        // If no user logged in, don't fetch
        if (!currentUser) return;

        const docRef = doc(db, 'settings', 'accounting_access');
        
        const unsubscribe = onSnapshot(docRef, (docSnap) => {
            if (docSnap.exists()) {
                setAllowedUserIds(docSnap.data().uids || []);
            } else {
                // Self-heal: Create if missing (Only if Admin to avoid permission error for normal users)
                if (canManageAccess) {
                    setDoc(docRef, { uids: [] }, { merge: true }).catch(err => console.log("Init doc error:", err));
                }
                setAllowedUserIds([]);
            }
            setIsLoadingPerms(false);
        }, (error) => {
            console.error("Accounting Perms Error:", error);
            setIsLoadingPerms(false);
        });

        return () => unsubscribe();
    }, [currentUser, canManageAccess]);

    // --- 2. UPDATE PERMISSIONS ---
    const handleToggleUser = async (targetUid) => {
        if (!canManageAccess) return;

        let newIds;
        if (allowedUserIds.includes(targetUid)) {
            newIds = allowedUserIds.filter(id => id !== targetUid);
        } else {
            newIds = [...allowedUserIds, targetUid];
        }
        
        // Optimistic UI Update is handled by snapshot, but we trigger the write
        try {
            await setDoc(doc(db, 'settings', 'accounting_access'), { uids: newIds }, { merge: true });
        } catch (error) {
            alert("Failed to update access. Check console.");
            console.error(error);
        }
    };

    // --- 3. PERMISSION LOGIC ---
    // Payroll: Only Super Admin, Admin, HR
    const canSeePayroll = isSuperAdmin || isAdmin || isHR;
    
    // Tools (Invoice/Inventory): Super Admin, Admin, OR whitelisted employees
    // ⚠️ Using currentUser.uid is reliable. 
    const canSeeTools = isSuperAdmin || isAdmin || (currentUser && allowedUserIds.includes(currentUser.uid));
    
    const tools = [
        {
            id: 1,
            title: "Advanced Payroll",
            desc: "Calculate salaries, PF/PT/TDS, and generate Payslips.",
            path: "/hr/advanced-payroll",
            icon: <Calculator size={40} />,
            color: "text-blue-600 dark:text-blue-400",
            bg: "bg-blue-50 dark:bg-blue-900/20",
            border: "border-blue-200 dark:border-blue-800",
            hover: "hover:border-blue-400 dark:hover:border-blue-600",
            isVisible: canSeePayroll
        },
        {
            id: 2,
            title: "GST Invoice Generator",
            desc: "Create GST invoices with auto-tax calculations.",
            path: "/admin/invoice-generator",
            icon: <ShoppingCart size={40} />,
            color: "text-purple-600 dark:text-purple-400",
            bg: "bg-purple-50 dark:bg-purple-900/20",
            border: "border-purple-200 dark:border-purple-800",
            hover: "hover:border-purple-400 dark:hover:border-purple-600",
            isVisible: canSeeTools
        },
        {
            id: 3,
            title: "Inventory Manager",
            desc: "Track assets, stock levels, and alerts.",
            path: "/admin/inventory-manager",
            icon: <Package size={40} />,
            color: "text-emerald-600 dark:text-emerald-400",
            bg: "bg-emerald-50 dark:bg-emerald-900/20",
            border: "border-emerald-200 dark:border-emerald-800",
            hover: "hover:border-emerald-400 dark:hover:border-emerald-600",
            isVisible: canSeeTools
        }
    ];

    if (isLoadingPerms) return <div className="min-h-screen flex items-center justify-center dark:bg-gray-900 dark:text-white">Verifying Access...</div>;

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6 md:p-10 transition-colors duration-300">
            
            {/* Header */}
            <div className="max-w-6xl mx-auto mb-10 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                <div>
                    <h1 className="text-4xl font-extrabold text-gray-900 dark:text-white tracking-tight flex items-center gap-3">
                        <Wallet className="text-gray-700 dark:text-gray-300" size={36} /> Accounting & Finance
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-2 text-lg">
                        Manage payroll, billing, and inventory centrally.
                    </p>
                </div>
                
                {canManageAccess && (
                    <button 
                        onClick={() => setIsModalOpen(true)}
                        className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold shadow-lg transition-all text-white
                        ${isSuperAdmin ? 'bg-amber-600 hover:bg-amber-700' : 'bg-gray-900 dark:bg-gray-700 hover:bg-black'}`}
                    >
                        {isSuperAdmin ? <Crown size={18} /> : <ShieldCheck size={18} />} Manage Access
                    </button>
                )}
            </div>

            {/* Cards Grid */}
            <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {tools.map((tool) => (
                    tool.isVisible && (
                        <div 
                            key={tool.id}
                            onClick={() => navigate(tool.path)}
                            className={`cursor-pointer group relative bg-white dark:bg-gray-800 rounded-3xl p-8 border-2 ${tool.border} ${tool.hover} shadow-sm hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2`}
                        >
                            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-6 ${tool.bg} ${tool.color} shadow-inner transition-colors duration-300`}>
                                {tool.icon}
                            </div>
                            <h3 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-3 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                                {tool.title}
                            </h3>
                            <p className="text-gray-500 dark:text-gray-400 leading-relaxed mb-8">
                                {tool.desc}
                            </p>
                            <div className="absolute bottom-8 right-8 w-10 h-10 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-all duration-300">
                                <ArrowRight size={20} />
                            </div>
                        </div>
                    )
                ))}
            </div>

            {/* --- 🛡️ ACCESS CONTROL MODAL --- */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg border border-gray-200 dark:border-gray-700 flex flex-col max-h-[80vh] animate-in fade-in zoom-in duration-200">
                        
                        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-700/30 rounded-t-2xl">
                            <h2 className="text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2">
                                <ShieldCheck className="text-indigo-500" /> Tool Access Control
                            </h2>
                            <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-red-500"><X size={20} /></button>
                        </div>

                        <div className="p-6 overflow-y-auto custom-scrollbar">
                            <p className="text-sm text-gray-500 mb-4 bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded-lg border border-yellow-200 dark:border-yellow-800">
                                <Lock size={12} className="inline mr-1" />
                                <strong>Note:</strong> Super Admin & Admin have access by default. Use this list to grant access to specific <b>Employees</b> for Invoices & Inventory.
                            </p>

                            <div className="space-y-2">
                                {allUsers && allUsers.filter(u => u.role !== 'super_admin' && u.role !== 'admin').map(emp => {
                                    const userName = emp.displayName || emp.name || emp.email?.split('@')[0] || "User";
                                    const initial = userName.charAt(0).toUpperCase();
                                    const isAllowed = allowedUserIds.includes(emp.id);

                                    return (
                                        <label key={emp.id} className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-colors ${isAllowed ? 'bg-indigo-50 border-indigo-200 dark:bg-indigo-900/20 dark:border-indigo-800' : 'border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50'}`}>
                                            <div className="flex items-center gap-3">
                                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${isAllowed ? 'bg-indigo-100 text-indigo-600' : 'bg-gray-200 text-gray-500'}`}>
                                                    {initial}
                                                </div>
                                                <div>
                                                    <p className="font-bold text-sm text-gray-800 dark:text-gray-200">{userName}</p>
                                                    <p className="text-xs text-gray-400">{emp.role.toUpperCase()}</p>
                                                </div>
                                            </div>
                                            
                                            <div className={`w-6 h-6 rounded border flex items-center justify-center transition-all ${isAllowed ? 'bg-indigo-600 border-indigo-600' : 'border-gray-300 dark:border-gray-500'}`}>
                                                {isAllowed && <Check size={14} className="text-white" />}
                                            </div>
                                            
                                            <input 
                                                type="checkbox" 
                                                className="hidden" 
                                                checked={isAllowed} 
                                                onChange={() => handleToggleUser(emp.id)}
                                            />
                                        </label>
                                    );
                                })}
                            </div>
                        </div>
                        
                        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/30 rounded-b-2xl text-right">
                            <button onClick={() => setIsModalOpen(false)} className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-bold shadow-md hover:bg-indigo-700 active:scale-95 transition-all">Done</button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
};

export default Accounting;