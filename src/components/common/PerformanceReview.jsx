// src/components/common/PerformanceReview.jsx

import React, { useState, useEffect } from 'react';
import { 
    Star, Award, TrendingUp, MessageSquare, Save, CheckCircle, AlertCircle 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../Firebase';
import { useAuth } from '../../context/AuthContext';

// 🔥 HIERARCHY LEVELS
const ROLE_LEVELS = {
    'super_admin': 4,
    'admin': 3,
    'hr': 2,
    'employee': 1
};

// --- CONFIGURATION ---
const BADGES = [
    { id: 'top_performer', label: '🔥 Top Performer', color: 'bg-orange-100 text-orange-600 border-orange-200' },
    { id: 'fast_learner', label: '🚀 Fast Learner', color: 'bg-blue-100 text-blue-600 border-blue-200' },
    { id: 'team_player', label: '🤝 Team Player', color: 'bg-green-100 text-green-600 border-green-200' },
    { id: 'punctual', label: '⏰ Punctual', color: 'bg-purple-100 text-purple-600 border-purple-200' },
    { id: 'problem_solver', label: '🧠 Problem Solver', color: 'bg-pink-100 text-pink-600 border-pink-200' },
];

const PerformanceReview = ({ employeeData }) => {
    const { userProfile } = useAuth();
    const currentUserRole = userProfile?.role || 'employee';
    const currentUserLevel = ROLE_LEVELS[currentUserRole] || 0;
    
    // Permissions: Level 2+ (HR, Admin, Super Admin) can edit
    // Employees can only view
    const canEdit = currentUserLevel >= 2;

    // State
    const [rating, setRating] = useState(0);
    const [hoverRating, setHoverRating] = useState(0);
    const [selectedBadges, setSelectedBadges] = useState([]);
    const [feedback, setFeedback] = useState('');
    const [hikePercent, setHikePercent] = useState('');
    const [isEditing, setIsEditing] = useState(false);
    const [loading, setLoading] = useState(false);

    // Initialize Data
    useEffect(() => {
        if (employeeData) {
            setRating(employeeData.performance?.rating || 0);
            setSelectedBadges(employeeData.performance?.badges || []);
            setFeedback(employeeData.performance?.feedback || '');
            setHikePercent(employeeData.performance?.hikePercent || '');
        }
    }, [employeeData]);

    // --- LOGIC: Appraisal Suggestion ---
    const getAppraisalStatus = (stars) => {
        if (stars >= 4.5) return { text: 'Promotion & High Hike Eligible', color: 'text-green-600 bg-green-50 border-green-200' };
        if (stars >= 4) return { text: 'Eligible for Hike', color: 'text-blue-600 bg-blue-50 border-blue-200' };
        if (stars >= 3) return { text: 'Good Performance', color: 'text-orange-600 bg-orange-50 border-orange-200' };
        return { text: 'Needs Improvement', color: 'text-red-600 bg-red-50 border-red-200' };
    };

    const status = getAppraisalStatus(rating);

    // --- HANDLERS ---
    const toggleBadge = (id) => {
        if (!isEditing) return;
        if (selectedBadges.includes(id)) {
            setSelectedBadges(prev => prev.filter(b => b !== id));
        } else {
            setSelectedBadges(prev => [...prev, id]);
        }
    };

    const handleSave = async () => {
        if (!employeeData?.id) return alert("Employee ID missing!");
        
        setLoading(true);
        try {
            const userRef = doc(db, 'users', employeeData.id);
            await updateDoc(userRef, {
                performance: {
                    rating,
                    badges: selectedBadges,
                    feedback,
                    hikePercent,
                    lastReviewDate: serverTimestamp(),
                    reviewedBy: userProfile.name
                }
            });
            setIsEditing(false);
            alert('Performance Review Updated! 🌟');
        } catch (error) {
            console.error("Error updating rating:", error);
            alert("Failed to save review.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="w-full bg-white dark:bg-gray-800 rounded-3xl shadow-xl border border-gray-100 dark:border-gray-700 overflow-hidden relative transition-colors duration-300">
            
            {/* --- HEADER --- */}
            <div className="p-6 bg-gradient-to-r from-indigo-600 to-violet-600 flex justify-between items-center text-white">
                <div className="flex items-center gap-3">
                    <Award className="text-yellow-300" size={28} />
                    <div>
                        <h2 className="text-xl font-bold">Performance Card</h2>
                        <p className="text-xs text-indigo-200 uppercase tracking-widest font-semibold">
                            {canEdit ? 'Manage Employee Rating' : 'My Performance Report'}
                        </p>
                    </div>
                </div>
                
                {/* Toggle Edit Mode (Only for Managers) */}
                {canEdit && !isEditing && (
                    <button 
                        onClick={() => setIsEditing(true)}
                        className="bg-white/20 hover:bg-white/30 p-2 rounded-xl transition-all"
                        title="Edit Review"
                    >
                        <MessageSquare size={20} />
                    </button>
                )}
            </div>

            {/* --- CONTENT --- */}
            <div className="p-6 space-y-8">
                
                {/* 1. STAR RATING AREA */}
                <div className="flex flex-col items-center justify-center space-y-2">
                    <div className="flex gap-2">
                        {[1, 2, 3, 4, 5].map((star) => (
                            <motion.button
                                key={star}
                                whileHover={isEditing ? { scale: 1.2, rotate: 10 } : {}}
                                whileTap={isEditing ? { scale: 0.8 } : {}}
                                onClick={() => isEditing && setRating(star)}
                                onMouseEnter={() => isEditing && setHoverRating(star)}
                                onMouseLeave={() => isEditing && setHoverRating(0)}
                                className={`transition-colors duration-200 ${isEditing ? 'cursor-pointer' : 'cursor-default'}`}
                                disabled={!isEditing}
                            >
                                <Star 
                                    size={40} 
                                    fill={(hoverRating || rating) >= star ? "#fbbf24" : "none"} 
                                    className={(hoverRating || rating) >= star ? "text-amber-400 drop-shadow-md" : "text-gray-300 dark:text-gray-600"}
                                    strokeWidth={2}
                                />
                            </motion.button>
                        ))}
                    </div>
                    <p className="text-sm font-bold text-gray-400 dark:text-gray-500">{rating}/5 Stars</p>
                </div>

                {/* 2. APPRAISAL STATUS (Dynamic Badge) */}
                <motion.div 
                    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                    className={`p-4 rounded-2xl border flex items-center justify-between ${status.color}`}
                >
                    <div className="flex items-center gap-3">
                        <TrendingUp size={24} />
                        <div>
                            <p className="text-xs font-bold uppercase opacity-70">Appraisal Status</p>
                            <p className="font-bold text-lg leading-none">{status.text}</p>
                        </div>
                    </div>
                    {employeeData?.performance?.hikePercent && (
                        <div className="text-right">
                            <p className="text-xs font-bold uppercase opacity-70">Proposed Hike</p>
                            <p className="font-bold text-2xl">{employeeData.performance.hikePercent}%</p>
                        </div>
                    )}
                </motion.div>

                {/* 3. ACHIEVEMENT BADGES */}
                <div>
                    <label className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase mb-3 block">Achievements & Badges</label>
                    <div className="flex flex-wrap gap-2">
                        {BADGES.map((badge) => {
                            const isSelected = selectedBadges.includes(badge.id);
                            return (
                                <motion.button
                                    key={badge.id}
                                    whileTap={isEditing ? { scale: 0.9 } : {}}
                                    onClick={() => toggleBadge(badge.id)}
                                    disabled={!isEditing}
                                    className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-all 
                                        ${isSelected ? badge.color + ' shadow-sm scale-105' : 'bg-gray-50 dark:bg-gray-700/50 text-gray-400 dark:text-gray-500 border-gray-200 dark:border-gray-700 opacity-60 grayscale'}
                                        ${isEditing ? 'cursor-pointer hover:opacity-100' : 'cursor-default'}
                                    `}
                                >
                                    {badge.label}
                                </motion.button>
                            );
                        })}
                    </div>
                </div>

                {/* 4. FEEDBACK & HIKE INPUTS (Only Visible in Edit Mode or if Data Exists) */}
                {(isEditing || feedback) && (
                    <div className="space-y-4">
                        {/* Feedback Text */}
                        <div>
                            <label className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase mb-1 block">Manager's Feedback</label>
                            {isEditing ? (
                                <textarea 
                                    className="w-full p-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-sm text-gray-700 dark:text-gray-200 resize-none"
                                    rows="3"
                                    placeholder="Write constructive feedback..."
                                    value={feedback}
                                    onChange={(e) => setFeedback(e.target.value)}
                                />
                            ) : (
                                <div className="p-3 bg-gray-50 dark:bg-gray-700/30 rounded-xl border border-gray-100 dark:border-gray-700 text-sm text-gray-600 dark:text-gray-300 italic">
                                    "{feedback}"
                                </div>
                            )}
                        </div>

                        {/* Hike Percentage Input (Visible only to Managers in Edit Mode, or if value exists) */}
                        {(canEdit || hikePercent) && (
                            <div>
                                <label className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase mb-1 block">Proposed Hike %</label>
                                {isEditing ? (
                                    <div className="relative">
                                        <input 
                                            type="number" 
                                            className="w-full pl-3 pr-8 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl outline-none font-bold text-gray-800 dark:text-white"
                                            value={hikePercent}
                                            onChange={(e) => setHikePercent(e.target.value)}
                                            placeholder="0"
                                        />
                                        <span className="absolute right-4 top-2 text-gray-400 font-bold">%</span>
                                    </div>
                                ) : (
                                    hikePercent && <div className="font-bold text-indigo-600 dark:text-indigo-400">{hikePercent}% Hike Proposed</div>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {/* 5. ACTION BUTTONS (Edit Mode) */}
                <AnimatePresence>
                    {isEditing && (
                        <motion.div 
                            initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                            className="flex gap-3 pt-4 border-t border-gray-100 dark:border-gray-700"
                        >
                            <button 
                                onClick={() => setIsEditing(false)}
                                className="flex-1 py-3 rounded-xl font-bold text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={handleSave}
                                disabled={loading}
                                className="flex-1 py-3 rounded-xl font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-500/30 flex items-center justify-center gap-2 transition-transform active:scale-95"
                            >
                                {loading ? 'Saving...' : <><Save size={18}/> Update Rating</>}
                            </button>
                        </motion.div>
                    )}
                </AnimatePresence>

            </div>
        </div>
    );
};

export default PerformanceReview;