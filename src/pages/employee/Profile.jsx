// src/pages/employee/Profile.jsx

import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext'; 
import { updateEmployeeProfile } from '../../api/EmployeeService'; 
import LoadingSpinner from '../../components/common/LoadingSpinner';
import PerformanceReview from '../../components/common/PerformanceReview'; 

// 🎨 Icons & Animation
import { motion } from 'framer-motion';
import { 
    Camera, Mail, Phone, MapPin, Briefcase, User, 
    Save, X, Edit2, Shield, Hash, CheckCircle, AlertCircle, Crown 
} from 'lucide-react';

const DEFAULT_AVATAR = 'https://cdn-icons-png.flaticon.com/512/3135/3135715.png';

function Profile() {
    const { userProfile, loading } = useAuth();
    const fileInputRef = useRef(null); 

    // 🔥 FIX: Initialize state with empty strings to prevent "uncontrolled to controlled" warning
    const [formData, setFormData] = useState({
        name: '',
        empId: '',
        email: '',
        phoneNumber: '',
        address: '',
        role: 'employee',
        department: '',
        designation: '',
        id: ''
    });
    
    const [previewImage, setPreviewImage] = useState(null); 
    const [message, setMessage] = useState({ type: '', text: '' });
    const [isUpdating, setIsUpdating] = useState(false);
    const [editMode, setEditMode] = useState(false); 

    const currentRole = userProfile?.role;
    const canEditSensitive = ['super_admin', 'admin'].includes(currentRole); 

    useEffect(() => {
        if (userProfile) {
            setFormData({
                name: userProfile.name || '',
                empId: userProfile.empId || '',
                email: userProfile.email || '',
                phoneNumber: userProfile.phoneNumber || '',
                address: userProfile.address || '',
                role: userProfile.role || 'employee',
                department: userProfile.department || '',
                designation: userProfile.designation || '',
                id: userProfile.uid || ''
            });
            setPreviewImage(userProfile.photoURL || DEFAULT_AVATAR);
        }
    }, [userProfile]);

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            if (file.size > 1024 * 1024) {
                setMessage({ type: 'error', text: 'Image size too large! Keep it under 1MB.' });
                return;
            }
            const reader = new FileReader();
            reader.onloadend = () => setPreviewImage(reader.result);
            reader.readAsDataURL(file);
        }
    };

    const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

    const handleUpdateProfile = async (e) => {
        e.preventDefault();
        setMessage({ type: '', text: '' });
        setIsUpdating(true);

        try {
            const updates = {
                phoneNumber: formData.phoneNumber,
                address: formData.address,
                photoURL: previewImage,
                ...(canEditSensitive && {
                    name: formData.name,
                    empId: formData.empId,
                    role: formData.role, 
                    designation: formData.designation,
                    department: formData.department
                })
            };

            await updateEmployeeProfile(userProfile.uid, updates);
            setMessage({ type: 'success', text: 'Profile updated successfully!' });
            setEditMode(false);
            
            setTimeout(() => setMessage({ type: '', text: '' }), 3000);

        } catch (error) {
            setMessage({ type: 'error', text: 'Update Failed: ' + error.message });
        } finally {
            setIsUpdating(false);
        }
    };

    const getRoleBadgeStyle = (role) => {
        switch(role) {
            case 'super_admin': return 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800';
            case 'admin': return 'bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-900/30 dark:text-rose-400 dark:border-rose-800';
            case 'hr': return 'bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-400 dark:border-purple-800';
            default: return 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800';
        }
    };

    const getRoleIcon = (role) => {
        if (role === 'super_admin') return <Crown size={14} className="text-amber-600 dark:text-amber-400" />;
        return <Shield size={14} />;
    };

    if (loading || !userProfile) return <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 transition-colors duration-300"><LoadingSpinner /></div>;

    return (
        <div className="min-h-screen bg-gray-50/50 dark:bg-gray-900 pb-10 transition-colors duration-300">
            
            {/* --- 1. COVER BANNER --- */}
            <div className={`h-48 md:h-64 relative overflow-hidden ${currentRole === 'super_admin' ? 'bg-gradient-to-r from-amber-900 via-orange-900 to-amber-900' : 'bg-gradient-to-r from-indigo-900 via-purple-900 to-indigo-900'}`}>
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent"></div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 relative -mt-20 sm:-mt-24 z-10">
                
                {/* --- 2. PROFILE HEADER CARD --- */}
                <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 overflow-hidden transition-colors duration-300 mb-8"
                >
                    <div className="p-6 sm:p-8 flex flex-col md:flex-row items-center md:items-end gap-6">
                        
                        {/* Avatar */}
                        <div className="relative group shrink-0">
                            <div className={`w-32 h-32 sm:w-40 sm:h-40 rounded-full border-4 shadow-lg overflow-hidden bg-gray-100 dark:bg-gray-700 transition-colors duration-300 ${currentRole === 'super_admin' ? 'border-amber-400 dark:border-amber-600' : 'border-white dark:border-gray-800'}`}>
                                <img src={previewImage} alt="Profile" className="w-full h-full object-cover" />
                            </div>
                            
                            {editMode && (
                                <button 
                                    onClick={() => fileInputRef.current.click()}
                                    className="absolute bottom-2 right-2 p-2.5 bg-indigo-600 dark:bg-indigo-500 text-white rounded-full shadow-lg hover:bg-indigo-700 dark:hover:bg-indigo-600 transition-all hover:scale-110"
                                    title="Upload Photo"
                                >
                                    <Camera size={18} />
                                </button>
                            )}
                            <input type="file" ref={fileInputRef} onChange={handleImageChange} accept="image/*" className="hidden" />
                        </div>
                        
                        {/* Name & Role */}
                        <div className="flex-1 text-center md:text-left mb-2">
                            <h1 className="text-2xl sm:text-4xl font-extrabold text-gray-900 dark:text-white tracking-tight">{formData.name || 'User'}</h1>
                            <p className="text-gray-500 dark:text-gray-400 font-medium text-lg">{formData.designation || 'Team Member'}</p>
                            
                            <div className="flex items-center justify-center md:justify-start gap-3 mt-3">
                                <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border flex items-center gap-1.5 ${getRoleBadgeStyle(currentRole)}`}>
                                    {getRoleIcon(currentRole)} {currentRole?.replace('_', ' ')}
                                </span>
                                <span className="text-gray-400 dark:text-gray-500 text-sm font-medium flex items-center gap-1">
                                    <Hash size={12} /> {formData.empId || 'N/A'}
                                </span>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-3 self-center md:self-end md:mb-4">
                            {!editMode ? (
                                <button 
                                    onClick={() => setEditMode(true)}
                                    className="bg-gray-900 hover:bg-black dark:bg-indigo-600 dark:hover:bg-indigo-700 text-white px-6 py-2.5 rounded-xl font-bold shadow-lg hover:shadow-xl transition-all flex items-center gap-2 active:scale-95"
                                >
                                    <Edit2 size={16} /> Edit Profile
                                </button>
                            ) : (
                                <>
                                    <button 
                                        onClick={() => { setEditMode(false); setPreviewImage(userProfile.photoURL || DEFAULT_AVATAR); }}
                                        className="bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 px-5 py-2.5 rounded-xl font-bold hover:bg-gray-50 dark:hover:bg-gray-600 transition-all active:scale-95 flex items-center gap-2"
                                    >
                                        <X size={18} /> Cancel
                                    </button>
                                    <button 
                                        onClick={handleUpdateProfile}
                                        disabled={isUpdating}
                                        className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-xl font-bold shadow-lg hover:shadow-indigo-500/30 transition-all active:scale-95 flex items-center gap-2"
                                    >
                                        {isUpdating ? <span className="animate-spin">⏳</span> : <Save size={18} />} Save
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                    
                    {/* Status Message Bar */}
                    {message.text && (
                        <motion.div 
                            initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                            className={`px-8 py-3 flex items-center gap-2 text-sm font-bold justify-center
                            ${message.type === 'success' ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400' : 'bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400'}`}
                        >
                            {message.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
                            {message.text}
                        </motion.div>
                    )}
                </motion.div>

                {/* --- 3. SPLIT LAYOUT: INFO + PERFORMANCE --- */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    
                    {/* LEFT COLUMN: Personal & Work Details (Takes 2 columns space) */}
                    <div className="lg:col-span-2 space-y-8">
                         {/* WORK DETAILS */}
                        <motion.div 
                            initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }}
                            className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 sm:p-8 transition-colors duration-300"
                        >
                            <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-6 flex items-center gap-2 pb-2 border-b border-gray-100 dark:border-gray-700">
                                <Briefcase className="text-indigo-500 dark:text-indigo-400" size={20} /> Professional Details
                            </h3>

                            <div className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <InputField 
                                        label="Full Name" icon={<User size={18} />} 
                                        name="name" value={formData.name} onChange={handleChange} 
                                        disabled={!canEditSensitive || !editMode} editMode={editMode}
                                    />
                                    <InputField 
                                        label="Employee ID" icon={<Hash size={18} />} 
                                        name="empId" value={formData.empId} onChange={handleChange} 
                                        disabled={!canEditSensitive || !editMode} editMode={editMode}
                                    />
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <InputField 
                                        label="Designation" icon={<Briefcase size={18} />} 
                                        name="designation" value={formData.designation} onChange={handleChange} 
                                        disabled={!canEditSensitive || !editMode} editMode={editMode}
                                    />
                                    <InputField 
                                        label="Department" icon={<Briefcase size={18} />} 
                                        name="department" value={formData.department} onChange={handleChange} 
                                        disabled={!canEditSensitive || !editMode} editMode={editMode}
                                    />
                                </div>
                                <InputField 
                                    label="Official Email" icon={<Mail size={18} />} 
                                    name="email" value={formData.email} 
                                    disabled={true} editMode={editMode} 
                                />
                            </div>
                        </motion.div>

                         {/* PERSONAL DETAILS */}
                        <motion.div 
                            initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}
                            className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 sm:p-8 transition-colors duration-300"
                        >
                            <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-6 flex items-center gap-2 pb-2 border-b border-gray-100 dark:border-gray-700">
                                <User className="text-purple-500 dark:text-purple-400" size={20} /> Personal Information
                            </h3>

                            <div className="grid grid-cols-1 gap-6">
                                <InputField 
                                    label="Phone Number" icon={<Phone size={18} />} 
                                    name="phoneNumber" value={formData.phoneNumber} onChange={handleChange} 
                                    disabled={!editMode} editMode={editMode} placeholder="+91 00000 00000"
                                />
                                <div>
                                    <label className="block text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2 ml-1">Current Address</label>
                                    <div className={`relative group transition-all duration-200 rounded-xl overflow-hidden
                                        ${editMode ? 'ring-2 ring-gray-100 dark:ring-gray-700 focus-within:ring-indigo-500 bg-gray-50 dark:bg-gray-900' : 'bg-transparent border-b border-gray-100 dark:border-gray-700'}`}
                                    >
                                        <div className="absolute top-3 left-3 text-gray-400 dark:text-gray-500">
                                            <MapPin size={18} />
                                        </div>
                                        <textarea 
                                            name="address" rows="3" 
                                            value={formData.address} onChange={handleChange} disabled={!editMode}
                                            className={`w-full pl-10 pr-4 py-3 bg-transparent border-none outline-none resize-none text-gray-700 dark:text-gray-200 font-medium
                                            ${!editMode ? 'cursor-default' : ''}`}
                                            placeholder={editMode ? "Enter full address..." : "No address provided."}
                                        />
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </div>

                    {/* RIGHT COLUMN: Performance Review (Takes 1 column space) */}
                    <div className="lg:col-span-1">
                        <motion.div 
                           initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }}
                           className="sticky top-6"
                        >
                            {/* Pass combined user data including UID */}
                            <PerformanceReview employeeData={{...userProfile, id: userProfile.uid}} />
                        </motion.div>
                    </div>

                </div>
            </div>
        </div>
    );
}

// 🧱 REUSABLE INPUT COMPONENT
const InputField = ({ label, icon, name, value, onChange, disabled, editMode, placeholder }) => (
    <div>
        <label className="block text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2 ml-1">{label}</label>
        <div className={`relative flex items-center transition-all duration-200 rounded-xl overflow-hidden
            ${editMode && !disabled ? 'bg-gray-50 dark:bg-gray-900 ring-2 ring-gray-100 dark:ring-gray-700 focus-within:ring-indigo-500' : 'bg-transparent border-b border-gray-100 dark:border-gray-700 pb-1'}`}
        >
            <div className={`pl-3 pr-2 ${disabled ? 'text-gray-300 dark:text-gray-600' : 'text-gray-500 dark:text-gray-400'}`}>
                {icon}
            </div>
            {/* 🔥 FIX: Ensure 'value' is never undefined by defaulting to '' */}
            <input 
                type="text" 
                name={name} 
                value={value || ''} 
                onChange={onChange} 
                disabled={disabled}
                placeholder={placeholder}
                className={`w-full py-2.5 bg-transparent border-none outline-none font-medium
                ${disabled ? 'text-gray-500 dark:text-gray-500 cursor-not-allowed' : 'text-gray-800 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-600'}`}
            />
            {disabled && editMode && (
                <div className="pr-3 text-gray-300 dark:text-gray-600" title="Cannot edit this field">
                    <Shield size={14} />
                </div>
            )}
        </div>
    </div>
);

export default Profile;