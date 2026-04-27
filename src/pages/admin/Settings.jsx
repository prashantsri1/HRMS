// src/pages/admin/Settings.jsx

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../Firebase'; 
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore'; 
import { Save, Shield, Bell, Moon, Lock, AlertTriangle, User, Loader2, Crown } from 'lucide-react';

// 🔥 Hierarchy Levels
const ROLE_LEVELS = {
    'super_admin': 4,
    'admin': 3,
    'hr': 2,
    'employee': 1
};

function Settings() {
    const { userProfile, currentUser } = useAuth();
    const role = userProfile?.role || 'guest';
    const currentLevel = ROLE_LEVELS[role] || 0;

    const isSuperAdmin = role === 'super_admin';
    const isAdmin = role === 'admin';
    const isHR = role === 'hr';

    // Only Super Admin can EDIT global settings
    // Admins and HRs can VIEW global settings
    const canEditGlobal = isSuperAdmin;
    const canViewGlobal = currentLevel >= 2; // HR, Admin, Super Admin

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Settings State
    const [maintenanceMode, setMaintenanceMode] = useState(false);
    const [maxLeaves, setMaxLeaves] = useState(20);
    const [emailNotifs, setEmailNotifs] = useState(true);
    const [darkMode, setDarkMode] = useState(false);

    // 🔄 Fetch Data
    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                // Global Settings (Only for privileged roles)
                if (canViewGlobal) {
                    const snap = await getDoc(doc(db, 'settings', 'global'));
                    if (snap.exists()) {
                        setMaintenanceMode(snap.data().maintenanceMode || false);
                        setMaxLeaves(snap.data().maxLeaves || 20);
                    }
                }
                // Personal Settings (For Everyone)
                if (userProfile) {
                    setEmailNotifs(userProfile.emailNotifs ?? true);
                    setDarkMode(userProfile.darkMode ?? false);
                }
            } catch (error) { console.error("Error fetching settings:", error); } 
            finally { setLoading(false); }
        };
        fetchData();
    }, [canViewGlobal, userProfile]);

    // 💾 Save Handlers
    const handleSaveSystemSettings = async () => {
        if (!canEditGlobal) return alert("Access Denied: Only Super Admin can change system settings.");
        setSaving(true);
        try {
            await setDoc(doc(db, 'settings', 'global'), { maintenanceMode, maxLeaves: Number(maxLeaves) }, { merge: true });
            alert("✅ System Configuration Updated!");
        } catch (error) { alert("❌ Failed to save settings."); } 
        finally { setSaving(false); }
    };

    const handleSavePersonalSettings = async () => {
        setSaving(true);
        try {
            await updateDoc(doc(db, 'users', currentUser.uid), { emailNotifs, darkMode });
            alert("✅ Personal Preferences Saved!");
            // Reload window to apply dark mode instantly if context doesn't catch it
            // window.location.reload(); 
        } catch (error) { alert("❌ Failed to save preferences."); } 
        finally { setSaving(false); }
    };

    if (loading) return <div className="flex justify-center items-center h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-300"><Loader2 className="animate-spin text-indigo-600 dark:text-indigo-400" size={40} /></div>;

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6 md:p-8 transition-colors duration-300">
            
            {/* --- PAGE HEADER --- */}
            <div className="max-w-4xl mx-auto mb-8">
                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                    <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight flex items-center gap-3">
                        Settings 
                        <span className={`w-fit text-xs px-3 py-1 rounded-full uppercase tracking-wider border font-bold flex items-center gap-1
                            ${isSuperAdmin ? 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800' : 
                              isAdmin ? 'bg-rose-100 text-rose-600 border-rose-200 dark:bg-rose-900/20 dark:text-rose-400 dark:border-rose-800' : 
                              isHR ? 'bg-purple-100 text-purple-600 border-purple-200 dark:bg-purple-900/20 dark:text-purple-400 dark:border-purple-800' : 
                              'bg-blue-100 text-blue-600 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800'}`}>
                            {isSuperAdmin && <Crown size={12}/>}
                            {role.replace('_', ' ')} View
                        </span>
                    </h1>
                </div>
                <p className="text-gray-500 dark:text-gray-400 mt-2 text-base">
                    {canEditGlobal ? 'Manage global system configurations and your personal preferences.' : 'Manage your personal account preferences.'}
                </p>
            </div>

            {/* --- GLOBAL CONFIGURATION (Restricted Visibility) --- */}
            {canViewGlobal && (
                <div className="max-w-4xl mx-auto bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden mb-10 transition-colors duration-300">
                    
                    <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-700/30 flex justify-between items-center gap-4">
                        <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                            <Shield size={20} className="text-indigo-600 dark:text-indigo-400" /> Global Configuration
                        </h2>
                        {!canEditGlobal && (
                            <span className="text-xs font-bold text-amber-600 bg-amber-50 dark:bg-amber-900/20 dark:text-amber-400 border border-amber-200 dark:border-amber-800 px-3 py-1 rounded-full flex items-center gap-1">
                                <Lock size={12} /> Read Only
                            </span>
                        )}
                    </div>

                    <div className="p-6 md:p-8 space-y-8">
                        {/* Leave Policy */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
                            <div className="md:col-span-2">
                                <label className="block text-sm font-bold text-gray-900 dark:text-gray-200 mb-1">Annual Leave Quota</label>
                                <p className="text-xs text-gray-500 dark:text-gray-400">Maximum leaves allowed per employee for this financial year.</p>
                            </div>
                            <div className="relative">
                                <input 
                                    type="number" value={maxLeaves} onChange={(e) => setMaxLeaves(e.target.value)} disabled={!canEditGlobal} 
                                    className={`w-full px-4 py-3 border rounded-xl outline-none transition-all font-medium pr-16
                                        ${canEditGlobal 
                                            ? 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400' 
                                            : 'border-gray-200 bg-gray-50 dark:bg-gray-800/50 text-gray-500 dark:text-gray-500 cursor-not-allowed'}`}
                                />
                                <span className="absolute right-4 top-3.5 text-gray-400 text-sm font-bold pointer-events-none">days</span>
                            </div>
                        </div>

                        <hr className="border-gray-100 dark:border-gray-700" />

                        {/* Maintenance Mode */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
                            <div className="md:col-span-2">
                                <h4 className="text-sm font-bold text-gray-900 dark:text-gray-200 mb-1 flex items-center gap-2">
                                    System Maintenance {maintenanceMode && <AlertTriangle size={16} className="text-red-500" />}
                                </h4>
                                <p className="text-xs text-gray-500 dark:text-gray-400">Disable login access for non-admin users during updates.</p>
                                <div className={`mt-3 inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border ${maintenanceMode ? 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800' : 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800'}`}>
                                    <span className={`w-2 h-2 rounded-full mr-2 ${maintenanceMode ? 'bg-red-500 animate-pulse' : 'bg-emerald-500'}`}></span>
                                    Status: {maintenanceMode ? 'Maintenance ON' : 'Operational'}
                                </div>
                            </div>
                            
                            <div className="flex justify-start md:justify-end">
                                <label className={`relative inline-flex items-center ${canEditGlobal ? 'cursor-pointer' : 'cursor-not-allowed opacity-60'}`}>
                                    <input type="checkbox" checked={maintenanceMode} onChange={(e) => canEditGlobal && setMaintenanceMode(e.target.checked)} disabled={!canEditGlobal} className="sr-only peer" />
                                    <div className="w-14 h-7 bg-gray-200 dark:bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-indigo-600 shadow-inner"></div>
                                </label>
                            </div>
                        </div>
                    </div>

                    {canEditGlobal && (
                        <div className="px-6 py-4 bg-gray-50 dark:bg-gray-900/50 border-t border-gray-200 dark:border-gray-700 flex justify-end">
                            <button onClick={handleSaveSystemSettings} disabled={saving} className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg shadow-indigo-500/20 flex items-center gap-2 active:scale-95 disabled:bg-indigo-400 transition-all">
                                {saving ? <Loader2 className="animate-spin" size={18}/> : <Save size={18} />} {saving ? 'Saving...' : 'Save Configuration'}
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* --- PERSONAL PREFERENCES SECTION (VISIBLE TO ALL) --- */}
            <div className="max-w-4xl mx-auto bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden transition-colors duration-300">
                <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-700/30">
                    <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                        <User size={20} className="text-blue-600 dark:text-blue-400" /> Personal Preferences
                    </h2>
                </div>

                <div className="p-6 md:p-8 space-y-8">
                    {/* Notifications */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex gap-4">
                            <div className="p-3 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-xl h-fit border border-blue-100 dark:border-blue-800"><Bell size={24} /></div>
                            <div>
                                <h4 className="text-sm font-bold text-gray-900 dark:text-gray-200">Email Notifications</h4>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Receive updates about leave approvals and tasks.</p>
                            </div>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" checked={emailNotifs} onChange={(e) => setEmailNotifs(e.target.checked)} className="sr-only peer" />
                            <div className="w-11 h-6 bg-gray-200 dark:bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                        </label>
                    </div>

                    <hr className="border-gray-100 dark:border-gray-700" />

                    {/* Dark Mode */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex gap-4">
                            <div className="p-3 bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-xl h-fit border border-purple-100 dark:border-purple-800"><Moon size={24} /></div>
                            <div>
                                <h4 className="text-sm font-bold text-gray-900 dark:text-gray-200">Dark Mode</h4>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Switch between light and dark themes.</p>
                            </div>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" checked={darkMode} onChange={(e) => setDarkMode(e.target.checked)} className="sr-only peer" />
                            <div className="w-11 h-6 bg-gray-200 dark:bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                        </label>
                    </div>
                </div>

                <div className="px-6 py-4 bg-gray-50 dark:bg-gray-900/50 border-t border-gray-200 dark:border-gray-700 flex justify-end">
                    <button onClick={handleSavePersonalSettings} disabled={saving} className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-500/20 flex items-center gap-2 active:scale-95 disabled:bg-blue-400 transition-all">
                        {saving ? <Loader2 className="animate-spin" size={18}/> : <Save size={18} />} {saving ? 'Saving...' : 'Save Preferences'}
                    </button>
                </div>
            </div>

        </div>
    );
}

export default Settings;