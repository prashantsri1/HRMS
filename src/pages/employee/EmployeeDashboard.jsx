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
        <div className="min-h-screen bg-gray-50/50 dark:bg-gray-900 p-6 md:p-8 transition-colors duration-300">
            
            {/* --- HEADER SECTION --- */}
            <div className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight flex items-center gap-3">
                        Dashboard
                        {userProfile?.role === 'super_admin' && <Crown size={24} className="text-amber-500 animate-pulse" />}
                    </h1>
                    <div className="flex items-center text-sm mt-3 gap-3">
                        <span className="glass px-4 py-1.5 rounded-full shadow-sm flex items-center gap-2">
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">ID</span>
                            <span className="font-black text-gray-700 dark:text-gray-300">{employeeProfile?.empId || 'N/A'}</span>
                        </span>
                        <span className="px-4 py-1.5 rounded-full bg-violet-100 text-violet-700 border border-violet-200 dark:bg-violet-900/30 dark:text-violet-400 dark:border-violet-800 text-[10px] font-bold uppercase tracking-widest shadow-sm">
                            {displayRole}
                        </span>
                    </div>
                </div>
                <div className="text-right hidden md:block">
                    <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1">Current Date</p>
                    <p className="text-lg font-black text-gray-700 dark:text-gray-200 tracking-tight">
                        {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                    </p>
                </div>
            </div>

            {/* --- LOADING STATE --- */}
            {(profileLoading || tasksLoading) ? (
                <div className="flex justify-center items-center h-64 glass rounded-[2rem]">
                    <LoadingSpinner message="Syncing your dashboard..." size="40px" />
                </div>
            ) : (
                <div className="space-y-10">
                    
                    {/* --- STATS CARDS GRID --- */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        
                        {/* 1. Leave Balance */}
                        <div className="glass rounded-[2rem] p-6 transition-all hover:-translate-y-1 border-t border-white/40 dark:border-white/10 group">
                            <div className="flex justify-between items-start mb-6">
                                <div className="p-3 bg-gradient-to-br from-emerald-400 to-emerald-600 text-white rounded-2xl shadow-lg shadow-emerald-500/30 group-hover:scale-110 transition-transform">
                                    <Plane size={24} />
                                </div>
                                <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800/50 px-2 py-0.5 rounded-full uppercase tracking-wider">Paid Leave</span>
                            </div>
                            <div>
                                <h3 className="text-5xl font-black text-gray-900 dark:text-white tracking-tighter">{employeeStats.leaves}</h3>
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-2">Days Remaining</p>
                            </div>
                        </div>

                        {/* 2. Pending Tasks */}
                        <div className="glass rounded-[2rem] p-6 transition-all hover:-translate-y-1 border-t border-white/40 dark:border-white/10 group">
                            <div className="flex justify-between items-start mb-6">
                                <div className="p-3 bg-gradient-to-br from-orange-400 to-orange-600 text-white rounded-2xl shadow-lg shadow-orange-500/30 group-hover:scale-110 transition-transform">
                                    <CheckSquare size={24} />
                                </div>
                                <span className="text-[9px] font-bold text-orange-600 dark:text-orange-400 bg-orange-100 dark:bg-orange-900/30 border border-orange-200 dark:border-orange-800/50 px-2 py-0.5 rounded-full uppercase tracking-wider">Action Needed</span>
                            </div>
                            <div>
                                <h3 className="text-5xl font-black text-gray-900 dark:text-white tracking-tighter">{employeeStats.pendingTasks}</h3>
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-2">Pending Tasks</p>
                            </div>
                        </div>

                        {/* 3. Active Projects */}
                        <div className="glass rounded-[2rem] p-6 transition-all hover:-translate-y-1 border-t border-white/40 dark:border-white/10 group">
                            <div className="flex justify-between items-start mb-6">
                                <div className="p-3 bg-gradient-to-br from-purple-400 to-purple-600 text-white rounded-2xl shadow-lg shadow-purple-500/30 group-hover:scale-110 transition-transform">
                                    <Briefcase size={24} />
                                </div>
                                <span className="text-[9px] font-bold text-purple-600 dark:text-purple-400 bg-purple-100 dark:bg-purple-900/30 border border-purple-200 dark:border-purple-800/50 px-2 py-0.5 rounded-full uppercase tracking-wider">Ongoing</span>
                            </div>
                            <div>
                                <h3 className="text-5xl font-black text-gray-900 dark:text-white tracking-tighter">{employeeStats.totalProjects}</h3>
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-2">Active Projects</p>
                            </div>
                        </div>

                        {/* 4. Last Activity */}
                        <div className="glass rounded-[2rem] p-6 transition-all hover:-translate-y-1 border-t border-white/40 dark:border-white/10 group">
                            <div className="flex justify-between items-start mb-6">
                                <div className="p-3 bg-gradient-to-br from-gray-600 to-gray-800 text-white rounded-2xl shadow-lg shadow-gray-500/30 group-hover:scale-110 transition-transform">
                                    <Activity size={24} />
                                </div>
                                <span className="text-[9px] font-bold text-gray-600 dark:text-gray-400 bg-gray-200 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 px-2 py-0.5 rounded-full uppercase tracking-wider">System</span>
                            </div>
                            <div>
                                <h3 className="text-xl font-black text-gray-900 dark:text-white truncate tracking-tight" title={employeeStats.lastActivity}>{employeeStats.lastActivity}</h3>
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-2">Last Interaction</p>
                            </div>
                        </div>
                    </div>

                    {/* --- MAIN CONTENT SECTION --- */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        
                        {/* LEFT: UPCOMING TASKS LIST */}
                        <div className="lg:col-span-2 glass rounded-[2rem] overflow-hidden border border-gray-200 dark:border-gray-800/50 shadow-xl">
                            <div className="px-8 py-6 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-white/40 dark:bg-gray-900/40">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400 rounded-xl">
                                        <Calendar size={20} />
                                    </div>
                                    <h3 className="font-black text-gray-900 dark:text-white text-xl tracking-tight">Upcoming Deadlines</h3>
                                </div>
                                <button 
                                    onClick={() => navigate('/employee/my-tasks')}
                                    className="text-xs font-bold text-violet-600 dark:text-violet-400 hover:text-violet-800 dark:hover:text-violet-300 flex items-center gap-1.5 transition-colors uppercase tracking-widest bg-violet-50 dark:bg-violet-900/20 px-3 py-1.5 rounded-full"
                                >
                                    View All <ArrowRight size={14} />
                                </button>
                            </div>

                            <div className="p-8">
                                {employeeStats.upcomingTasks.length === 0 ? (
                                    <div className="text-center py-12 flex flex-col items-center">
                                        <div className="w-20 h-20 bg-gradient-to-br from-emerald-100 to-emerald-200 dark:from-emerald-900/40 dark:to-emerald-800/40 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mb-6 shadow-inner border border-emerald-50 dark:border-emerald-800/50">
                                            <span className="text-3xl animate-bounce">🎉</span>
                                        </div>
                                        <h4 className="text-gray-900 dark:text-white font-black text-2xl tracking-tight mb-2">All Caught Up!</h4>
                                        <p className="text-gray-500 dark:text-gray-400 font-medium">You have no upcoming deadlines for now.</p>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {employeeStats.upcomingTasks.map((task, index) => (
                                            <div key={index} className="flex items-center p-4 rounded-2xl border border-gray-100 dark:border-gray-800 bg-white/50 dark:bg-gray-800/50 hover:border-violet-300 dark:hover:border-violet-700 hover:bg-white dark:hover:bg-gray-800 hover:shadow-lg transition-all group">
                                                {/* Date Box */}
                                                <div className="hidden sm:flex flex-col items-center justify-center w-16 h-16 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 rounded-2xl mr-5 group-hover:border-violet-200 dark:group-hover:border-violet-500/50 group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors shadow-sm">
                                                    <span className="text-[10px] font-bold uppercase tracking-widest">{new Date(task.dueDate).toLocaleString('default', { month: 'short' })}</span>
                                                    <span className="text-2xl font-black leading-none mt-0.5">{new Date(task.dueDate).getDate()}</span>
                                                </div>
                                                
                                                {/* Content */}
                                                <div className="flex-1 min-w-0">
                                                    <h4 className="text-lg font-black text-gray-900 dark:text-white truncate group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors">{task.title}</h4>
                                                    <div className="flex items-center gap-4 mt-1.5">
                                                        <span className="text-xs font-bold text-gray-500 dark:text-gray-400 flex items-center gap-1.5 uppercase tracking-wider">
                                                            <Clock size={12} /> Due: {task.dueDate}
                                                        </span>
                                                        <span className="sm:hidden text-[9px] font-bold text-violet-600 dark:text-violet-400 bg-violet-100 dark:bg-violet-900/50 px-2 py-0.5 rounded-full uppercase tracking-wider">
                                                            {new Date(task.dueDate).toLocaleDateString()}
                                                        </span>
                                                    </div>
                                                </div>
                                                
                                                {/* Action Arrow */}
                                                <div className="w-10 h-10 rounded-full bg-gray-50 dark:bg-gray-800 flex items-center justify-center text-gray-400 group-hover:bg-violet-100 dark:group-hover:bg-violet-900/50 group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-all group-hover:translate-x-1">
                                                    <ArrowRight size={18} />
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
                            <div className="bg-gradient-to-br from-violet-600 to-purple-800 rounded-[2rem] shadow-xl shadow-purple-500/20 text-white p-8 relative overflow-hidden group border border-violet-500/30">
                                <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 group-hover:scale-110 transition-all">
                                    <Plane size={140} />
                                </div>
                                <div className="relative z-10">
                                    <h3 className="text-2xl font-black mb-3 tracking-tight">Need a Break? 🌴</h3>
                                    <p className="text-violet-200 text-sm mb-8 leading-relaxed font-medium">
                                        You have <span className="font-bold text-white bg-white/20 px-2 py-1 rounded-lg shadow-inner">{employeeStats.leaves} days</span> of leave remaining. Recharge yourself!
                                    </p>
                                    <button 
                                        onClick={() => navigate('/employee/leave-apply')}
                                        className="w-full py-4 bg-white text-violet-900 font-black rounded-2xl shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                                    >
                                        Apply for Leave <ArrowRight size={18} />
                                    </button>
                                </div>
                            </div>

                            {/* Secondary Quick Link */}
                            <div className="glass rounded-[2rem] p-8 flex flex-col justify-center items-center text-center hover:shadow-lg transition-all group border border-gray-200 dark:border-gray-800/50">
                                <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-2xl flex items-center justify-center text-gray-500 dark:text-gray-400 mb-4 group-hover:scale-110 transition-transform shadow-inner">
                                    <Briefcase size={28} />
                                </div>
                                <h4 className="font-black text-xl text-gray-900 dark:text-white mb-2 tracking-tight">Project Workspace</h4>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 font-medium">View detailed progress of all your active projects.</p>
                                <button 
                                    onClick={() => navigate('/employee/my-tasks')} 
                                    className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-widest flex items-center gap-2 group-hover:gap-3 transition-all bg-gray-100 dark:bg-gray-800 px-5 py-2.5 rounded-full shadow-sm hover:bg-gray-200 dark:hover:bg-gray-700"
                                >
                                    Go to Projects <ArrowRight size={14} />
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