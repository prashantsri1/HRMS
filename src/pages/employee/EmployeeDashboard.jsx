// src/pages/employee/EmployeeDashboard.jsx

import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext'; 
import { useFirestore } from '../../hooks/useFirestore'; 
import { formatDistanceToNow } from 'date-fns'; 
import LoadingSpinner from '../../components/common/LoadingSpinner'; 

// Icons
import { Calendar, CheckSquare, Briefcase, Activity, Clock, ArrowRight, Plane, Crown } from 'lucide-react';

function EmployeeDashboard() {
    const { currentUser, userProfile, loading: authLoading } = useAuth();
    const navigate = useNavigate();
    const userId = currentUser ? currentUser.uid : null;

    const employeeProfile = userProfile;
    const profileLoading = authLoading || !employeeProfile; 
    
    // If Super Admin logs in here (Testing), they have no assigned tasks usually
    // So we fetch tasks where assignedToId matches OR createdBy matches (for testing)
    const { data: userTasks, loading: tasksLoading } = useFirestore(
        'tasks', 
        userId ? [['assignedToId', '==', userId]] : null
    );

    const employeeStats = useMemo(() => {
        if (profileLoading || tasksLoading || !userTasks || !employeeProfile) { 
            return {
                leaves: '...',
                pendingTasks: '...',
                totalProjects: '...',
                lastActivity: '...',
                upcomingTasks: [],
            };
        }

        const remainingLeaves = employeeProfile.remainingLeaves || 0; 
        const pendingTasksCount = userTasks.filter(t => t.status === 'Pending').length;
        const projectIds = userTasks.map(t => t.projectId).filter(Boolean);
        const totalProjectsCount = new Set(projectIds).size;
        
        const now = new Date();
        const upcomingTasksList = userTasks
            .filter(t => t.dueDate && new Date(t.dueDate) > now && t.status === 'Pending')
            .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
            .slice(0, 5); 
            
        const lastActivityTime = new Date(now.getTime() - 60 * 60 * 1000); 
        const lastActivityFormatted = formatDistanceToNow(lastActivityTime, { addSuffix: true });

        return {
            leaves: remainingLeaves,
            pendingTasks: pendingTasksCount,
            totalProjects: totalProjectsCount,
            lastActivity: lastActivityFormatted,
            upcomingTasks: upcomingTasksList.map(t => ({
                title: t.title,
                dueDate: t.dueDate,
            })),
        };

    }, [employeeProfile, userTasks, tasksLoading, profileLoading]);

    // Safety check for role display
    const displayRole = userProfile?.role ? userProfile.role.replace('_', ' ') : 'Employee';

    return (
        <div className="min-h-screen bg-gray-50/30 dark:bg-gray-900 p-6 md:p-8 transition-colors duration-300">
            
            {/* --- HEADER SECTION --- */}
            <div className="mb-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight flex items-center gap-2">
                        Dashboard
                        {userProfile?.role === 'super_admin' && <Crown size={24} className="text-amber-500" />}
                    </h1>
                    <div className="flex items-center text-sm text-gray-500 dark:text-gray-400 mt-2 gap-3">
                        <span className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-3 py-1 rounded-full shadow-sm">
                            ID: <span className="font-mono font-medium text-gray-700 dark:text-gray-300">{employeeProfile?.empId || 'N/A'}</span>
                        </span>
                        <span className="px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-800 text-xs font-bold uppercase tracking-wider">
                            {displayRole}
                        </span>
                    </div>
                </div>
                <div className="text-right hidden md:block">
                    <p className="text-sm text-gray-400 dark:text-gray-500">Current Date</p>
                    <p className="text-lg font-semibold text-gray-700 dark:text-gray-200">
                        {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                    </p>
                </div>
            </div>

            {/* --- LOADING STATE --- */}
            {(profileLoading || tasksLoading) ? (
                <div className="flex justify-center items-center h-64 bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                    <LoadingSpinner message="Syncing your dashboard..." size="40px" />
                </div>
            ) : (
                <div className="space-y-8">
                    
                    {/* --- STATS CARDS GRID --- */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        
                        {/* 1. Leave Balance */}
                        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-md transition-all hover:-translate-y-1 group">
                            <div className="flex justify-between items-start mb-4">
                                <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-xl group-hover:bg-emerald-100 dark:group-hover:bg-emerald-900/30 transition-colors">
                                    <Plane size={24} />
                                </div>
                                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-1 rounded-lg">Paid Leave</span>
                            </div>
                            <div>
                                <h3 className="text-3xl font-bold text-gray-800 dark:text-white">{employeeStats.leaves}</h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400 font-medium mt-1">Days Remaining</p>
                            </div>
                        </div>

                        {/* 2. Pending Tasks */}
                        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-md transition-all hover:-translate-y-1 group">
                            <div className="flex justify-between items-start mb-4">
                                <div className="p-3 bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 rounded-xl group-hover:bg-orange-100 dark:group-hover:bg-orange-900/30 transition-colors">
                                    <CheckSquare size={24} />
                                </div>
                                <span className="text-xs font-bold text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20 px-2 py-1 rounded-lg">Action Needed</span>
                            </div>
                            <div>
                                <h3 className="text-3xl font-bold text-gray-800 dark:text-white">{employeeStats.pendingTasks}</h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400 font-medium mt-1">Pending Tasks</p>
                            </div>
                        </div>

                        {/* 3. Active Projects */}
                        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-md transition-all hover:-translate-y-1 group">
                            <div className="flex justify-between items-start mb-4">
                                <div className="p-3 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-xl group-hover:bg-blue-100 dark:group-hover:bg-blue-900/30 transition-colors">
                                    <Briefcase size={24} />
                                </div>
                                <span className="text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded-lg">Ongoing</span>
                            </div>
                            <div>
                                <h3 className="text-3xl font-bold text-gray-800 dark:text-white">{employeeStats.totalProjects}</h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400 font-medium mt-1">Active Projects</p>
                            </div>
                        </div>

                        {/* 4. Last Activity */}
                        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-md transition-all hover:-translate-y-1 group">
                            <div className="flex justify-between items-start mb-4">
                                <div className="p-3 bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 rounded-xl group-hover:bg-purple-100 dark:group-hover:bg-purple-900/30 transition-colors">
                                    <Activity size={24} />
                                </div>
                                <span className="text-xs font-bold text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/20 px-2 py-1 rounded-lg">System</span>
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-gray-800 dark:text-white truncate" title={employeeStats.lastActivity}>{employeeStats.lastActivity}</h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400 font-medium mt-1">Last Interaction</p>
                            </div>
                        </div>
                    </div>

                    {/* --- MAIN CONTENT SECTION --- */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        
                        {/* LEFT: UPCOMING TASKS LIST */}
                        <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                            <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50/30 dark:bg-gray-700/20">
                                <div className="flex items-center gap-2">
                                    <Calendar className="text-indigo-500 dark:text-indigo-400" size={20} />
                                    <h3 className="font-bold text-gray-800 dark:text-white text-lg">Upcoming Deadlines</h3>
                                </div>
                                <button 
                                    onClick={() => navigate('/employee/my-tasks')}
                                    className="text-sm font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 flex items-center gap-1 transition-colors"
                                >
                                    View All <ArrowRight size={16} />
                                </button>
                            </div>

                            <div className="p-6">
                                {employeeStats.upcomingTasks.length === 0 ? (
                                    <div className="text-center py-10 flex flex-col items-center">
                                        <div className="w-16 h-16 bg-green-50 dark:bg-green-900/20 text-green-500 dark:text-green-400 rounded-full flex items-center justify-center mb-4 text-2xl">🎉</div>
                                        <h4 className="text-gray-900 dark:text-white font-bold text-lg">All Caught Up!</h4>
                                        <p className="text-gray-500 dark:text-gray-400">You have no upcoming deadlines for now.</p>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {employeeStats.upcomingTasks.map((task, index) => (
                                            <div key={index} className="flex items-center p-4 rounded-xl border border-gray-100 dark:border-gray-700 hover:border-indigo-100 dark:hover:border-indigo-900 hover:bg-indigo-50/30 dark:hover:bg-indigo-900/20 transition-all group">
                                                {/* Date Box */}
                                                <div className="hidden sm:flex flex-col items-center justify-center w-14 h-14 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 rounded-xl mr-4 group-hover:border-indigo-200 dark:group-hover:border-indigo-500 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors shadow-sm">
                                                    <span className="text-[10px] font-bold uppercase tracking-wider">{new Date(task.dueDate).toLocaleString('default', { month: 'short' })}</span>
                                                    <span className="text-xl font-bold leading-none">{new Date(task.dueDate).getDate()}</span>
                                                </div>
                                                
                                                {/* Content */}
                                                <div className="flex-1 min-w-0">
                                                    <h4 className="text-base font-semibold text-gray-800 dark:text-gray-200 truncate group-hover:text-indigo-700 dark:group-hover:text-indigo-400 transition-colors">{task.title}</h4>
                                                    <div className="flex items-center gap-4 mt-1">
                                                        <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                                                            <Clock size={12} /> Due: {task.dueDate}
                                                        </span>
                                                        <span className="sm:hidden text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 px-2 py-0.5 rounded">
                                                            {new Date(task.dueDate).toLocaleDateString()}
                                                        </span>
                                                    </div>
                                                </div>
                                                
                                                {/* Action Arrow */}
                                                <div className="text-gray-300 dark:text-gray-600 group-hover:text-indigo-400 dark:group-hover:text-indigo-400 transition-colors">
                                                    <ArrowRight size={20} />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* RIGHT: QUICK ACTIONS WIDGET */}
                        <div className="flex flex-col gap-6">
                            {/* Leave Request Card */}
                            <div className="bg-gradient-to-br from-indigo-600 to-violet-700 dark:from-indigo-900 dark:to-violet-900 rounded-2xl shadow-xl text-white p-6 relative overflow-hidden group border border-indigo-500 dark:border-indigo-800">
                                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                                    <Plane size={120} />
                                </div>
                                <div className="relative z-10">
                                    <h3 className="text-xl font-bold mb-2">Need a Break? 🌴</h3>
                                    <p className="text-indigo-100 dark:text-indigo-200 text-sm mb-6 leading-relaxed">
                                        You have <span className="font-bold text-white bg-white/20 px-1.5 py-0.5 rounded">{employeeStats.leaves} days</span> of leave remaining. Recharge yourself!
                                    </p>
                                    <button 
                                        onClick={() => navigate('/employee/leave-apply')}
                                        className="w-full py-3 bg-white text-indigo-700 dark:text-indigo-900 font-bold rounded-xl shadow-lg hover:bg-indigo-50 hover:scale-[1.02] transition-all flex items-center justify-center gap-2"
                                    >
                                        Apply for Leave <ArrowRight size={18} />
                                    </button>
                                </div>
                            </div>

                            {/* Secondary Quick Link */}
                            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 flex flex-col justify-center items-center text-center hover:border-gray-300 dark:hover:border-gray-600 transition-colors">
                                <div className="w-12 h-12 bg-gray-50 dark:bg-gray-700 rounded-full flex items-center justify-center text-gray-400 dark:text-gray-300 mb-3">
                                    <Briefcase size={24} />
                                </div>
                                <h4 className="font-bold text-gray-800 dark:text-white">Project Workspace</h4>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">View detailed progress of all your active projects.</p>
                                <button onClick={() => navigate('/employee/my-tasks')} className="text-sm font-semibold text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white border-b border-gray-300 dark:border-gray-500 hover:border-gray-900 dark:hover:border-white transition-colors pb-0.5">
                                    Go to Projects
                                </button>
                            </div>
                        </div>

                    </div>
                </div>
            )}
        </div>
    );
}

export default EmployeeDashboard;