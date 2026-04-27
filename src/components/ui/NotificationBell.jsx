// src/components/ui/NotificationBell.jsx

import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom'; 
import { useAuth } from '../../context/AuthContext'; 
import { useFirestore } from '../../hooks/useFirestore'; 
import { Bell, CheckCircle, XCircle, Clock, Briefcase, Calendar } from 'lucide-react'; 

const NotificationBell = () => {
    const { userProfile, currentUser } = useAuth();
    // 🔥 FIX: Use currentUser.uid directly as fallback if userProfile is loading
    const userId = currentUser?.uid; 
    const userRole = userProfile?.role; 
    
    const [isOpen, setIsOpen] = useState(false); 
    const navigate = useNavigate(); 

    // Fetch Notifications ONLY if userId is present
    const notificationFilters = useMemo(() => {
        return userId ? [['recipientId', '==', userId]] : null; // 🔥 Return null to skip query if no ID
    }, [userId]);

    const notificationOptions = useMemo(() => {
        return { field: 'createdAt', direction: 'desc' };
    }, []);
    
    const { 
        data: notifications, 
        loading, 
        updateDocument 
    } = useFirestore(
        userId ? 'notifications' : null, // 🔥 Conditional Fetching
        notificationFilters, 
        notificationOptions
    );

    // Only count/show 'unread' notifications
    const unreadNotifications = useMemo(() => {
        if (!notifications) return [];
        return notifications.filter(n => n.status === 'unread');
    }, [notifications]);

    // 🟢 HANDLE CLICK
    const handleNotificationClick = async (notification) => {
        setIsOpen(false); 

        const type = (notification.type || '').toLowerCase(); 

        if (type.includes('task')) {
            navigate('/employee/my-tasks');
        } 
        else if (type.includes('leave')) {
            if (userRole === 'admin' || userRole === 'hr' || userRole === 'super_admin') {
                navigate('/hr/leave-requests');
            } 
            else {
                navigate('/my-leaves'); 
            }
        } 
        else {
            navigate('/employee/dashboard');
        }

        try {
            await updateDocument(notification.id, { status: 'read', readAt: new Date() });
        } catch (error) {
            console.error("Failed to mark read:", error);
        }
    };
    
    const formatTime = (timestamp) => {
        if (!timestamp) return '';
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    const getNotificationIcon = (notif) => {
        const msg = notif.message?.toLowerCase() || '';
        const type = notif.type?.toLowerCase() || '';

        if (msg.includes('rejected')) return <XCircle size={18} className="text-red-500" />;
        if (msg.includes('approved')) return <CheckCircle size={18} className="text-green-500" />;
        if (type.includes('task')) return <Briefcase size={18} className="text-indigo-500 dark:text-indigo-400" />;
        if (type.includes('leave')) return <Calendar size={18} className="text-orange-500" />;
        
        return <Bell size={18} className="text-gray-500 dark:text-gray-400" />;
    };

    if (loading && !notifications) return <div className="p-2 animate-spin text-gray-400 dark:text-gray-500"><Clock size={20}/></div>;

    return (
        <div className="relative inline-block">
            {/* 🔔 BELL BUTTON */}
            <button 
                onClick={() => setIsOpen(!isOpen)} 
                className={`
                    relative p-2 rounded-xl transition-all duration-200 focus:outline-none 
                    ${isOpen 
                        ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400' 
                        : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200'}
                `}
            >
                <Bell size={22} />

                {unreadNotifications.length > 0 && (
                    <span className="absolute top-1.5 right-1.5 flex h-3 w-3 items-center justify-center rounded-full bg-red-500 ring-2 ring-white dark:ring-gray-900">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75"></span>
                    </span>
                )}
            </button>

            {/* 🔽 DROPDOWN MENU */}
            {isOpen && (
                <>
                    <div className="fixed inset-0 z-40 cursor-default" onClick={() => setIsOpen(false)}></div>

                    <div className="absolute right-0 mt-3 w-80 max-w-[90vw] bg-white dark:bg-gray-800 rounded-2xl shadow-xl ring-1 ring-black ring-opacity-5 dark:ring-white dark:ring-opacity-10 dark:border dark:border-gray-700 z-50 overflow-hidden transform origin-top-right transition-all">
                        
                        {/* Header */}
                        <div className="px-5 py-4 bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
                            <h4 className="text-sm font-bold text-gray-800 dark:text-gray-100">Notifications</h4>
                            {unreadNotifications.length > 0 && (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 uppercase tracking-wide">
                                    {unreadNotifications.length} New
                                </span>
                            )}
                        </div>
                        
                        {/* List */}
                        <div className="max-h-[24rem] overflow-y-auto custom-scrollbar bg-gray-50/50 dark:bg-gray-900/50">
                            {unreadNotifications.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-10 text-gray-400 dark:text-gray-500">
                                    <Bell size={32} className="opacity-20 mb-2" />
                                    <p className="text-xs font-medium">No new notifications</p>
                                </div>
                            ) : (
                                unreadNotifications.map(notif => (
                                    <div 
                                        key={notif.id} 
                                        onClick={() => handleNotificationClick(notif)}
                                        className="px-5 py-4 cursor-pointer border-b border-gray-100 dark:border-gray-700 last:border-0 hover:bg-white dark:hover:bg-gray-700/50 transition-colors duration-150 group relative"
                                    >
                                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-500 dark:bg-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                        <div className="flex gap-4">
                                            {/* Icon */}
                                            <div className="mt-0.5 shrink-0 bg-white dark:bg-gray-700 p-1.5 rounded-full shadow-sm border border-gray-100 dark:border-gray-600 h-fit">
                                                {getNotificationIcon(notif)}
                                            </div>
                                            
                                            {/* Text */}
                                            <div className="flex-1">
                                                <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 leading-snug">{notif.message}</p>
                                                <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1.5 flex items-center gap-1">
                                                    <Clock size={10} /> {formatTime(notif.createdAt)}
                                                </p>
                                            </div>
                                            {/* Dot */}
                                            <div className="mt-2 h-2 w-2 shrink-0 rounded-full bg-indigo-500 dark:bg-indigo-400 shadow-sm shadow-indigo-200 dark:shadow-none"></div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                        
                        {/* Footer */}
                        {unreadNotifications.length > 0 && (
                            <div className="bg-gray-50 dark:bg-gray-900 p-2 text-center border-t border-gray-100 dark:border-gray-700">
                                <span className="text-[10px] text-gray-400 dark:text-gray-500">Click to mark as read</span>
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
};

export default NotificationBell;