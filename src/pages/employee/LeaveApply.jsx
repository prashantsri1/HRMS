// src/pages/employee/LeaveApply.jsx

import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useFirestore } from '../../hooks/useFirestore'; // Hook
import { collection, query, where, getDocs, addDoc } from 'firebase/firestore'; 
import { db } from '../../Firebase'; 

// [ ... Imports Same as Before ... ]
// 🎨 UI & Animation Libraries
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Plane, Calendar, MessageSquare, Send, CheckCircle, 
    AlertCircle, Briefcase, MapPin, Clock, FileText 
} from 'lucide-react';

const initialFormState = {
    leaveType: 'Sick Leave',
    travelType: 'Client Visit',
    startDate: '',
    endDate: '',
    reason: '',
    type: 'leave' // default
};

// ... [Variants Same as Before] ...
const containerVariants = { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { duration: 0.4 } } };
const formSectionVariants = { hidden: { opacity: 0, x: -20 }, visible: { opacity: 1, x: 0, transition: { duration: 0.3 } }, exit: { opacity: 0, x: 20, transition: { duration: 0.2 } } };

function LeaveApply() {
    const [formData, setFormData] = useState(initialFormState);
    const [message, setMessage] = useState({ type: '', text: '' });
    const [loading, setLoading] = useState(false);
    
    // 🔥 FIX: Pass null as filter to prevent fetching all leaves (which causes Permission Error)
    // We only need 'addDocument' function from the hook
    const { addDocument } = useFirestore(null); 
    const { currentUser, userProfile } = useAuth(); 

    const userId = currentUser?.uid;
    const userName = userProfile?.name || currentUser?.email;

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    // [ ... Rest of the component logic remains EXACTLY SAME ... ]
    // Just replace the hook line above and keep everything else.

    const handleTypeSelect = (selectedType) => { setFormData({ ...formData, type: selectedType }); setMessage({ type: '', text: '' }); };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setMessage({ type: '', text: '' });
        setLoading(true);

        if ((formData.type === 'leave' || formData.type === 'travel') && (!formData.startDate || !formData.endDate)) {
            setMessage({ type: 'error', text: "Start and End dates are required!" });
            setLoading(false);
            return;
        }

        if (!formData.reason) {
            setMessage({ type: 'error', text: "Please provide a reason." });
            setLoading(false);
            return;
        }

        let days = 0;
        if (formData.startDate && formData.endDate) {
            const start = new Date(formData.startDate);
            const end = new Date(formData.endDate);
            const diffTime = Math.abs(end - start);
            days = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; 
        }

        const newRequest = {
            userId, 
            name: userName, 
            empId: userProfile?.empId || 'N/A', 
            type: formData.type, 
            ...(formData.type === 'leave' && { leaveType: formData.leaveType }),
            ...(formData.type === 'travel' && { travelType: formData.travelType }),
            startDate: formData.startDate,
            endDate: formData.endDate,
            days: days || 0,
            reason: formData.reason,
            appliedAt: new Date().toISOString(), 
            status: 'Pending', 
            hrActionBy: null, 
            adminActionBy: null,
            reportsTo: userProfile?.reportsTo || null,
            department: userProfile?.department || 'IT'
        };

        try {
            // NOTE: Manually using 'leaves' collection here via the hook helper
            // But since we passed null to useFirestore, it might not know the collection.
            // BETTER FIX: Use direct firebase addDoc or fix hook usage.
            // Let's revert to using useFirestore('leaves') but with a dummy filter to avoid fetching ALL.
            
            // Actually, let's just use direct Firebase for safety here since we just want to ADD.
            const docRef = await addDoc(collection(db, 'leaves'), newRequest); 

            // Notification Logic
            let recipients = [];
            if (userProfile?.reportsTo) {
                recipients.push(userProfile.reportsTo);
            } else {
                const q = query(collection(db, "users"), where("role", "in", ["hr", "admin", "super_admin"]));
                const querySnapshot = await getDocs(q);
                recipients = querySnapshot.docs.map(doc => doc.id);
            }
            recipients = [...new Set(recipients)].filter(id => id !== userId);

            const notifPromises = recipients.map(recipientId => {
                return addDoc(collection(db, "notifications"), {
                    recipientId: recipientId, 
                    message: `New ${formData.type} request from ${userName}`,
                    type: `${formData.type}_request`,
                    link: '/hr/leave-requests',
                    status: 'unread',
                    createdAt: new Date().toISOString(),
                    relatedId: docRef.id 
                });
            });

            if (notifPromises.length > 0) await Promise.all(notifPromises);

            setMessage({ type: 'success', text: "Request Sent Successfully!" });
            setFormData(initialFormState); 

        } catch (error) {
            console.error("Leave Apply Error:", error);
            setMessage({ type: 'error', text: "Failed to submit request. Try again." });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-4 md:p-8 flex items-center justify-center transition-colors duration-300">
            
            <motion.div 
                initial="hidden" animate="visible" variants={containerVariants}
                className="w-full max-w-4xl bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-3xl shadow-2xl overflow-hidden border border-white/50 dark:border-gray-700"
            >
                <div className="flex flex-col md:flex-row h-full">
                    
                    {/* 🎨 LEFT SIDE: Visual Selector */}
                    <div className="md:w-1/3 bg-gradient-to-br from-indigo-600 to-purple-700 dark:from-indigo-900 dark:to-purple-900 p-8 flex flex-col justify-between text-white relative overflow-hidden">
                        {/* Abstract Shapes */}
                        <div className="absolute top-[-50px] left-[-50px] w-32 h-32 bg-white/10 rounded-full blur-3xl"></div>
                        <div className="absolute bottom-[-20px] right-[-20px] w-40 h-40 bg-pink-500/20 rounded-full blur-3xl"></div>

                        <div className="relative z-10">
                            <h2 className="text-3xl font-extrabold mb-2 text-white">Apply Now</h2>
                            <p className="text-indigo-100 text-sm opacity-90">What's on your mind today?</p>
                        </div>

                        <div className="flex flex-col gap-4 mt-8 relative z-10">
                            {/* Option 1: Leave */}
                            <button 
                                onClick={() => handleTypeSelect('leave')}
                                className={`flex items-center gap-4 p-4 rounded-xl transition-all duration-300 border ${formData.type === 'leave' ? 'bg-white/20 border-white shadow-lg scale-105' : 'bg-white/5 border-transparent hover:bg-white/10'}`}
                            >
                                <div className="p-2 bg-white rounded-lg text-indigo-600"><Calendar size={20} /></div>
                                <div className="text-left">
                                    <h3 className="font-bold text-sm text-white">Leave Request</h3>
                                    <p className="text-[10px] text-indigo-200">Sick, Casual, Annual</p>
                                </div>
                            </button>

                            {/* Option 2: Travel */}
                            <button 
                                onClick={() => handleTypeSelect('travel')}
                                className={`flex items-center gap-4 p-4 rounded-xl transition-all duration-300 border ${formData.type === 'travel' ? 'bg-white/20 border-white shadow-lg scale-105' : 'bg-white/5 border-transparent hover:bg-white/10'}`}
                            >
                                <div className="p-2 bg-white rounded-lg text-purple-600"><Plane size={20} /></div>
                                <div className="text-left">
                                    <h3 className="font-bold text-sm text-white">Business Travel</h3>
                                    <p className="text-[10px] text-indigo-200">Visits, Sites, Events</p>
                                </div>
                            </button>

                            {/* Option 3: Query */}
                            <button 
                                onClick={() => handleTypeSelect('query')}
                                className={`flex items-center gap-4 p-4 rounded-xl transition-all duration-300 border ${formData.type === 'query' ? 'bg-white/20 border-white shadow-lg scale-105' : 'bg-white/5 border-transparent hover:bg-white/10'}`}
                            >
                                <div className="p-2 bg-white rounded-lg text-pink-600"><MessageSquare size={20} /></div>
                                <div className="text-left">
                                    <h3 className="font-bold text-sm text-white">Raise Query</h3>
                                    <p className="text-[10px] text-indigo-200">Issues, Complaints</p>
                                </div>
                            </button>
                        </div>
                        
                        <div className="mt-8 text-xs text-indigo-200 opacity-60 relative z-10">
                            *Approvals are routed to your Reporting Manager.
                        </div>
                    </div>

                    {/* 📝 RIGHT SIDE: Dynamic Form */}
                    <div className="md:w-2/3 p-8 bg-white/50 dark:bg-gray-900/50 relative">
                        <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-6 flex items-center gap-2">
                            {formData.type === 'leave' && '🏖️ Plan your off days'}
                            {formData.type === 'travel' && '✈️ Where are we going?'}
                            {formData.type === 'query' && '📢 What can we help with?'}
                        </h3>

                        {/* Status Message */}
                        <AnimatePresence>
                            {message.text && (
                                <motion.div 
                                    initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                                    className={`mb-6 p-4 rounded-xl text-sm font-semibold flex items-center gap-3 shadow-sm
                                    ${message.type === 'error' ? 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border border-red-100 dark:border-red-800' : 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-800'}`}
                                >
                                    {message.type === 'error' ? <AlertCircle size={20} /> : <CheckCircle size={20} />}
                                    {message.text}
                                </motion.div>
                            )}
                        </AnimatePresence>

                        <form onSubmit={handleSubmit} className="space-y-6">
                            
                            <AnimatePresence mode='wait'>
                                <motion.div key={formData.type} variants={formSectionVariants} initial="hidden" animate="visible" exit="exit">
                                    
                                    {/* --- LEAVE FIELDS --- */}
                                    {formData.type === 'leave' && (
                                        <div className="space-y-4">
                                            <div>
                                                <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1 block">Leave Type</label>
                                                <div className="relative">
                                                    <Briefcase className="absolute left-3 top-3 text-gray-400 dark:text-gray-500" size={18} />
                                                    <select name="leaveType" value={formData.leaveType} onChange={handleChange}
                                                        className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all appearance-none cursor-pointer hover:bg-white dark:hover:bg-gray-700"
                                                    >
                                                        <option>Sick Leave</option>
                                                        <option>Casual Leave</option>
                                                        <option>Annual Leave</option>
                                                        <option>Emergency Leave</option>
                                                    </select>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* --- TRAVEL FIELDS --- */}
                                    {formData.type === 'travel' && (
                                        <div className="space-y-4">
                                            <div>
                                                <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1 block">Purpose</label>
                                                <div className="relative">
                                                    <MapPin className="absolute left-3 top-3 text-gray-400 dark:text-gray-500" size={18} />
                                                    <select name="travelType" value={formData.travelType} onChange={handleChange}
                                                        className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all appearance-none cursor-pointer hover:bg-white dark:hover:bg-gray-700"
                                                    >
                                                        <option>Client Visit</option>
                                                        <option>Site Inspection</option>
                                                        <option>Training / Workshop</option>
                                                        <option>Conference</option>
                                                    </select>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* --- DATE PICKERS --- */}
                                    {(formData.type === 'leave' || formData.type === 'travel') && (
                                        <div className="grid grid-cols-2 gap-4 mt-4">
                                            <div>
                                                <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1 block">From</label>
                                                <div className="relative">
                                                    <input type="date" name="startDate" value={formData.startDate} onChange={handleChange} required
                                                        className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm dark:[color-scheme:dark]" />
                                                </div>
                                            </div>
                                            <div>
                                                <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1 block">To</label>
                                                <div className="relative">
                                                    <input type="date" name="endDate" value={formData.endDate} onChange={handleChange} required
                                                        className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm dark:[color-scheme:dark]" />
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* --- REASON FIELD --- */}
                                    <div className="mt-4">
                                        <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1 block">
                                            {formData.type === 'query' ? 'Describe Issue' : 'Details / Reason'}
                                        </label>
                                        <div className="relative">
                                            <FileText className="absolute left-3 top-3 text-gray-400 dark:text-gray-500" size={18} />
                                            <textarea 
                                                name="reason" value={formData.reason} onChange={handleChange} rows="3" required
                                                placeholder={formData.type === 'query' ? "Tell us exactly what happened..." : "Keep it brief and clear..."}
                                                className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none resize-none transition-all hover:bg-white dark:hover:bg-gray-700 placeholder-gray-400"
                                            />
                                        </div>
                                    </div>
                                </motion.div>
                            </AnimatePresence>

                            {/* SUBMIT BUTTON */}
                            <div className="pt-2">
                                <button 
                                    type="submit" disabled={loading}
                                    className={`w-full py-4 rounded-xl text-white font-bold shadow-lg flex justify-center items-center gap-2 transform transition-all duration-200
                                    ${loading ? 'bg-gray-400 cursor-not-allowed' : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:scale-[1.02] hover:shadow-indigo-500/30 active:scale-95'}`}
                                >
                                    {loading ? (
                                        <>
                                            <Clock className="animate-spin" size={20} /> Processing...
                                        </>
                                    ) : (
                                        <>
                                            Submit Request <Send size={18} />
                                        </>
                                    )}
                                </button>
                            </div>

                        </form>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}

export default LeaveApply;