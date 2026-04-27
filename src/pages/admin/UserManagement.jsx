// src/pages/admin/UserManagement.jsx

import React, { useState, useMemo, useEffect } from 'react';
import { createUserWithProfile, updateEmployeeProfile } from '../../api/EmployeeService'; 
import { useFirestore } from '../../hooks/useFirestore'; 
import { auth, db } from '../../Firebase'; 
import { doc, updateDoc, getDocs, collection, query, where } from 'firebase/firestore'; 
import LoadingSpinner from '../../components/common/LoadingSpinner'; 
import PerformanceReview from '../../components/common/PerformanceReview'; 
import { useAuth } from '../../context/AuthContext';
import * as XLSX from 'xlsx'; 

import { motion, AnimatePresence } from 'framer-motion';
import { 
    UserPlus, Trash2, Edit, CheckCircle, AlertCircle, 
    Search, Shield, Briefcase, User, Phone, MapPin, X, Download,
    Ban, Power, Building2, BadgeCheck, Crown, Users 
} from 'lucide-react';

const initialEditState = { 
    id: null, name: '', empId: '', role: '', 
    designation: '', department: '', 
    phoneNumber: '', address: '' 
};

// 🔥 HIERARCHY LEVELS (Higher = More Power)
const ROLE_LEVELS = {
    'super_admin': 4,
    'admin': 3,
    'hr': 2,
    'employee': 1
};

function UserManagement() {
    const { currentUser, userProfile } = useAuth();
    const currentRole = userProfile?.role || 'employee';
    const currentLevel = ROLE_LEVELS[currentRole] || 0;

    // Create Form State
    const [newUserEmail, setNewUserEmail] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [newRole, setNewRole] = useState('employee');
    const [newEmpId, setNewEmpId] = useState(''); 
    const [newName, setNewName] = useState(''); 
    const [newPhone, setNewPhone] = useState('');
    const [newDesignation, setNewDesignation] = useState(''); 
    const [newDepartment, setNewDepartment] = useState('IT'); 
    
    // Edit Form State
    const [editingUser, setEditingUser] = useState(null); 
    const [editFormData, setEditFormData] = useState(initialEditState);
    
    // Common State
    const [message, setMessage] = useState('');
    const [loadingForm, setLoadingForm] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    // Force Stop State
    const [isBlockModalOpen, setIsBlockModalOpen] = useState(false);
    const [selectedUserToBlock, setSelectedUserToBlock] = useState('');
    
    // Fetch Data
    const { data: rawUsers, loading: loadingData, error: dataError, deleteDocument } = useFirestore('users'); 

    // 💡 SORTING & FILTERING LOGIC (Hierarchy Based)
    const users = useMemo(() => {
        if (!rawUsers) return [];
        
        // Filter: Show only users BELOW or EQUAL to current rank (But usually you don't manage equals)
        // Best Practice: You can view equals, but only manage subordinates.
        let filtered = rawUsers.filter(u => {
            const userLevel = ROLE_LEVELS[u.role] || 0;
            // Super Admin sees everyone
            if (currentLevel === 4) return true;
            // Others see only below them
            return userLevel < currentLevel;
        });

        if (searchTerm) {
            const lowerTerm = searchTerm.toLowerCase();
            filtered = filtered.filter(u => 
                u.name?.toLowerCase().includes(lowerTerm) || 
                u.email?.toLowerCase().includes(lowerTerm) ||
                u.empId?.toLowerCase().includes(lowerTerm) ||
                u.department?.toLowerCase().includes(lowerTerm)
            );
        }

        return [...filtered].sort((a, b) => {
            // Sort by Rank High to Low, then EmpID
            const rankDiff = (ROLE_LEVELS[b.role] || 0) - (ROLE_LEVELS[a.role] || 0);
            if (rankDiff !== 0) return rankDiff;
            
            const getNumber = (id) => {
                if (!id) return 0;
                const match = id.match(/\d+$/); 
                return match ? parseInt(match[0], 10) : 0;
            };
            return getNumber(a.empId) - getNumber(b.empId); 
        });
    }, [rawUsers, searchTerm, currentLevel]);

    // --- EXPORT TO EXCEL LOGIC ---
    const handleExportToExcel = () => {
        if (!users || users.length === 0) {
            setMessage("No users to export.");
            return;
        }

        const worksheetData = users.map(user => ({
            "Full Name": user.name || "N/A",
            "Employee ID": user.empId || "N/A",
            "Email": user.email || "N/A",
            "Role": user.role || "N/A",
            "Designation": user.designation || "N/A", 
            "Department": user.department || "N/A",   
            "Status": user.isBlocked ? "BLOCKED" : "Active",
            "Phone Number": user.phoneNumber || "N/A",
            "Address": user.address || "N/A",
            "Remaining Leaves": user.remainingLeaves || 0
        }));

        const worksheet = XLSX.utils.json_to_sheet(worksheetData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Employees");
        XLSX.writeFile(workbook, "Employee_List.xlsx");
        setMessage("Success! Employee list downloaded.");
    };

    // --- CREATE LOGIC ---
    const handleCreateUser = async (e) => {
        e.preventDefault();
        setMessage('');
        setLoadingForm(true);

        if (newPassword.length < 6) {
            setMessage("Password must be at least 6 characters long.");
            setLoadingForm(false); return;
        }
        
        // 🔥 Hierarchy Check: Cannot create a role equal or higher than self
        const newRoleLevel = ROLE_LEVELS[newRole] || 0;
        if (newRoleLevel >= currentLevel) {
            setMessage(`Access Denied: You cannot create a '${newRole.toUpperCase()}'.`);
            setLoadingForm(false); return;
        }

        try {
            const profileData = {
                name: newName, 
                empId: newEmpId, 
                role: newRole, 
                phoneNumber: newPhone, 
                designation: newDesignation, 
                department: newDepartment,   
                remainingLeaves: 15, 
                isBlocked: false 
            };
            await createUserWithProfile(newUserEmail, newPassword, profileData);
            setMessage(`Success! User created successfully.`);
            // Reset Form
            setNewUserEmail(''); setNewPassword(''); setNewName(''); setNewEmpId(''); setNewPhone('');
            setNewDesignation(''); setNewDepartment('IT');
        } catch (error) {
            setMessage(`Error: ${error.message}`);
        } finally {
            setLoadingForm(false);
        }
    };
    
    // --- DELETE LOGIC ---
    const handleDeleteUser = async (targetUser) => {
        // 🔥 Hierarchy Check
        const targetLevel = ROLE_LEVELS[targetUser.role] || 0;
        if (targetLevel >= currentLevel) {
            return alert("Access Denied: You cannot delete a user with equal or higher rank.");
        }

        if (window.confirm(`Delete user: ${targetUser.email}? This is permanent.`)) {
             try {
                await deleteDocument(targetUser.id); 
                setMessage(`User deleted successfully.`);
             } catch (error) {
                 setMessage(`Error deleting: ${error.message}`);
             }
         }
    };

    // --- FORCE STOP LOGIC ---
    const toggleUserBlockStatus = async (targetUser) => {
        // 🔥 Hierarchy Check
        const targetLevel = ROLE_LEVELS[targetUser.role] || 0;
        if (targetLevel >= currentLevel) {
            return alert("Access Denied: You cannot block a user with equal or higher rank.");
        }

        if (targetUser.id === currentUser.uid) return alert("You cannot block yourself.");
        
        const action = targetUser.isBlocked ? "Activate" : "Force Stop";
        if(!window.confirm(`Are you sure you want to ${action} ${targetUser.name}?`)) return;

        try {
            const userRef = doc(db, 'users', targetUser.id);
            await updateDoc(userRef, {
                isBlocked: !targetUser.isBlocked 
            });
            setMessage(`User ${targetUser.name} has been ${targetUser.isBlocked ? 'Activated' : 'Force Stopped'}.`);
            setIsBlockModalOpen(false); 
        } catch (error) {
            console.error(error);
            setMessage("Failed to update user status.");
        }
    };
    
    // --- EDIT LOGIC ---
    const handleEditSetup = (user) => {
        // 🔥 Hierarchy Check
        const targetLevel = ROLE_LEVELS[user.role] || 0;
        if (targetLevel >= currentLevel && currentLevel !== 4) { // Only Super Admin can edit equals (other super admins if multi)
             return alert("Access Denied: You cannot edit this user.");
        }

        setEditFormData({
            id: user.id, 
            name: user.name || '', 
            empId: user.empId || '', 
            role: user.role || 'employee',
            designation: user.designation || '', 
            department: user.department || 'IT', 
            phoneNumber: user.phoneNumber || '', 
            address: user.address || '',
        });
        setEditingUser(user); setMessage(''); 
    };

    const handleEditChange = (e) => setEditFormData({ ...editFormData, [e.target.name]: e.target.value });

    const handleUpdateUser = async (e) => {
        e.preventDefault();
        setLoadingForm(true);
        try {
            await updateEmployeeProfile(editFormData.id, { ...editFormData });
            setMessage(`Profile updated successfully.`);
            setEditingUser(null);
        } catch (error) {
            setMessage(`Error updating: ${error.message}`);
        } finally {
            setLoadingForm(false);
        }
    };

    const getRoleBadge = (role) => {
        switch(role?.toLowerCase()) {
            case 'super_admin': return { color: 'bg-amber-100 text-amber-700 border-amber-200', icon: <Crown size={12}/> };
            case 'admin': return { color: 'bg-rose-100 text-rose-700 border-rose-200', icon: <Shield size={12}/> };
            case 'hr': return { color: 'bg-purple-100 text-purple-700 border-purple-200', icon: <Users size={12}/> };
            default: return { color: 'bg-emerald-100 text-emerald-700 border-emerald-200', icon: <User size={12}/> };
        }
    };

    const departments = ['IT', 'HR', 'Sales', 'Marketing', 'Management', 'Finance', 'Operations', 'Other' , 'Customer Support', 'Research & Development', 'Legal', 'Administration', 'Procurement', 'Logistics', 'Quality Assurance', 'Public Relations', 'Training & Development', 'Security', 'Facilities Management', 'Business Development', 'Strategy', 'Data Analytics', 'Design', 'Content Creation', 'Product Management', 'Engineering', 'Consulting', 'Healthcare', 'Education', 'Government', 'Non-Profit'];

    return (
        <div className="min-h-screen bg-gray-50/50 dark:bg-gray-900 p-6 md:p-8 transition-colors duration-300">
            
            {/* Header */}
            <div className="mb-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight flex items-center gap-3">
                        User Management 
                        {currentRole === 'super_admin' && <span className="text-xs bg-amber-500 text-white px-2 py-1 rounded-full uppercase tracking-widest">God Mode</span>}
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-2">Manage employee access and profiles.</p>
                </div>
                
                <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                    <button onClick={() => setIsBlockModalOpen(true)} className="flex items-center justify-center gap-2 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl shadow-md transition-all font-medium whitespace-nowrap active:scale-95">
                        <Ban size={18} /> Force Stop
                    </button>

                    <div className="relative w-full md:w-64">
                        <Search className="absolute left-3 top-3 text-gray-400 dark:text-gray-500" size={18} />
                        <input type="text" placeholder="Search..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all shadow-sm" />
                    </div>
                    
                    <button onClick={handleExportToExcel} className="flex items-center justify-center gap-2 px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl shadow-md transition-all font-medium whitespace-nowrap active:scale-95">
                        <Download size={18} /> Export
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                
                {/* --- LEFT: CREATE USER FORM --- */}
                <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="xl:col-span-1 bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 overflow-hidden h-fit sticky top-6">
                    <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-4 flex items-center gap-3">
                        <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm text-white"><UserPlus size={20} /></div>
                        <h3 className="text-white font-bold text-lg">Add New User</h3>
                    </div>

                    <div className="p-6">
                        <form onSubmit={handleCreateUser} className="space-y-4">
                            <input type="text" placeholder="Full Name" value={newName} onChange={(e) => setNewName(e.target.value)} required className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl outline-none" />
                            
                            <div className="grid grid-cols-2 gap-4">
                                <input type="text" placeholder="Emp ID" value={newEmpId} onChange={(e) => setNewEmpId(e.target.value)} required className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl outline-none" />
                                <select value={newRole} onChange={(e) => setNewRole(e.target.value)} className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl outline-none cursor-pointer">
                                    <option value="employee">Employee</option>
                                    {(currentLevel > 2) && <option value="hr">HR</option>}
                                    {(currentLevel > 3) && <option value="admin">Admin</option>}
                                </select>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <input type="text" placeholder="Designation" value={newDesignation} onChange={(e) => setNewDesignation(e.target.value)} required className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl outline-none" />
                                <select value={newDepartment} onChange={(e) => setNewDepartment(e.target.value)} className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl outline-none cursor-pointer">
                                    {departments.map(d => <option key={d} value={d}>{d}</option>)}
                                </select>
                            </div>

                            <input type="email" placeholder="Email Address" value={newUserEmail} onChange={(e) => setNewUserEmail(e.target.value)} required className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl outline-none" />
                            <input type="password" placeholder="Password (min 6 chars)" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl outline-none" />
                            <input type="tel" placeholder="Phone Number" value={newPhone} onChange={(e) => setNewPhone(e.target.value)} className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl outline-none" />

                            <button type="submit" disabled={loadingForm} className="w-full py-3.5 rounded-xl font-bold text-white shadow-lg bg-gray-900 hover:bg-black dark:bg-indigo-600 dark:hover:bg-indigo-700 active:scale-95 transition-all">
                                {loadingForm ? 'Creating...' : 'Create Account'}
                            </button>
                        </form>
                        {message && <div className="mt-4 p-3 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-300 rounded-xl text-center text-sm font-bold border border-indigo-100 dark:border-indigo-800">{message}</div>}
                    </div>
                </motion.div>

                {/* --- RIGHT: USER LIST --- */}
                <div className="xl:col-span-2 space-y-6">
                    {loadingData && <div className="p-10 text-center"><LoadingSpinner /></div>} 
                    {dataError && <p className="text-red-500 text-center font-bold">Error: {dataError}</p>}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <AnimatePresence>
                            {!loadingData && users && users.map((user, index) => {
                                const roleStyle = getRoleBadge(user.role);
                                return (
                                <motion.div key={user.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }}
                                    className={`bg-white dark:bg-gray-800 p-5 rounded-2xl shadow-sm border ${user.isBlocked ? 'border-red-500 border-2' : 'border-gray-100 dark:border-gray-700'} hover:shadow-md transition-all group relative overflow-hidden`}
                                >
                                    {user.isBlocked && <div className="absolute top-0 right-0 bg-red-600 text-white text-[10px] font-bold px-2 py-1 rounded-bl-lg z-10">FORCE STOPPED</div>}
                                    <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-indigo-500 to-purple-500 opacity-0 group-hover:opacity-100 transition-opacity"></div>

                                    <div className="flex justify-between items-start mb-4">
                                        <div className="flex items-center gap-3">
                                            {user.profileImage ? <img src={user.profileImage} alt={user.name} className="w-12 h-12 rounded-full object-cover border-2 border-indigo-100" /> : <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-lg font-bold text-gray-600">{user.name?.charAt(0).toUpperCase()}</div>}
                                            <div>
                                                <h4 className="font-bold text-gray-800 dark:text-gray-100 leading-tight">{user.name}</h4>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border uppercase tracking-wider flex items-center gap-1 ${roleStyle.color}`}>
                                                        {roleStyle.icon} {user.role.replace('_', ' ')}
                                                    </span>
                                                    <span className="text-xs text-gray-400 font-mono bg-gray-50 dark:bg-gray-700 px-1.5 py-0.5 rounded">{user.empId}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-2 mb-4">
                                        <div className="flex justify-between items-center">
                                            <span className="text-xs text-gray-500 flex items-center gap-1"><Building2 size={12}/> {user.department || 'N/A'}</span>
                                            <span className="text-xs text-gray-500 flex items-center gap-1"><Briefcase size={12}/> {user.designation || 'N/A'}</span>
                                        </div>
                                    </div>

                                    <div className="flex gap-2 pt-4 border-t border-gray-50 dark:border-gray-700">
                                        <button onClick={() => handleEditSetup(user)} className="flex-1 py-2 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 text-xs font-bold hover:bg-indigo-100 transition-colors flex items-center justify-center gap-1"><Edit size={14} /> Edit</button>
                                        
                                        {/* Force Stop (Only visible if you outrank them) */}
                                        {(ROLE_LEVELS[user.role] < currentLevel) && (
                                            <button onClick={() => toggleUserBlockStatus(user)} className={`p-2 rounded-lg transition-colors ${user.isBlocked ? 'text-green-500 hover:bg-green-50' : 'text-red-500 hover:bg-red-50'}`}><Power size={16}/></button>
                                        )}
                                        
                                        <button onClick={() => handleDeleteUser(user)} className="p-2 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"><Trash2 size={16} /></button>
                                    </div>
                                </motion.div>
                            )})}
                        </AnimatePresence>
                    </div>
                </div>
            </div>

            {/* --- TOP GLOBAL FORCE STOP MODAL --- */}
            <AnimatePresence>
                {isBlockModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-red-500">
                             <div className="bg-red-600 px-6 py-4 flex justify-between items-center text-white">
                                <h3 className="font-bold text-lg flex items-center gap-2"><Ban size={20} /> Force Stop User</h3>
                                <button onClick={() => setIsBlockModalOpen(false)}><X size={20} /></button>
                            </div>
                            <div className="p-6">
                                <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">Select a user to immediately revoke access.</p>
                                <select className="w-full p-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-red-500 mb-4" onChange={(e) => setSelectedUserToBlock(e.target.value)} value={selectedUserToBlock}>
                                    <option value="">-- Select User --</option>
                                    {users.filter(u => u.id !== currentUser.uid && (ROLE_LEVELS[u.role] < currentLevel)).map(u => (
                                        <option key={u.id} value={u.id}>{u.name} ({u.isBlocked ? 'Stopped' : 'Active'})</option>
                                    ))}
                                </select>
                                <button onClick={() => { const user = users.find(u => u.id === selectedUserToBlock); if(user) toggleUserBlockStatus(user); }} disabled={!selectedUserToBlock} className="w-full py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl shadow-lg disabled:opacity-50">Toggle Access</button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* --- EDIT MODAL --- */}
            <AnimatePresence>
                {editingUser && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                        <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden border border-gray-100 dark:border-gray-700 flex flex-col max-h-[90vh]">
                            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-4 flex justify-between items-center shrink-0">
                                <h3 className="text-white font-bold text-lg flex items-center gap-2"><Edit size={20} /> Edit User & Performance</h3>
                                <button onClick={() => setEditingUser(null)} className="text-white/80 hover:text-white"><X size={20} /></button>
                            </div>
                            
                            <div className="p-6 overflow-y-auto custom-scrollbar">
                                <form onSubmit={handleUpdateUser} className="space-y-4 mb-8">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Full Name</label>
                                            <input type="text" name="name" value={editFormData.name} onChange={handleEditChange} required className="w-full px-4 py-2 border border-gray-300 rounded-lg" />
                                        </div>
                                        <div>
                                            <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Role</label>
                                            <select name="role" value={editFormData.role} onChange={handleEditChange} required disabled={ROLE_LEVELS[editingUser.role] >= currentLevel && currentLevel !== 4} className="w-full px-4 py-2 border border-gray-300 rounded-lg">
                                                <option value="employee">Employee</option>
                                                {(currentLevel > 2) && <option value="hr">HR</option>}
                                                {(currentLevel > 3) && <option value="admin">Admin</option>}
                                            </select>
                                        </div>
                                    </div>
                                    
                                    <div className="flex justify-end pt-4">
                                        <button type="submit" disabled={loadingForm} className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg shadow transition">{loadingForm ? 'Saving...' : 'Update Details'}</button>
                                    </div>
                                </form>
                                <div className="pt-6 border-t border-gray-200">
                                    <h4 className="text-sm font-bold text-gray-500 uppercase mb-4 tracking-wider">Performance Management</h4>
                                    <PerformanceReview employeeData={editingUser} />
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

        </div>
    );
}

export default UserManagement;