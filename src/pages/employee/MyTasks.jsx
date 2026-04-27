// src/pages/employee/MyTasks.jsx

import React, { useState, useMemo, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useFirestore } from '../../hooks/useFirestore';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { collection, query, where, getDocs, addDoc } from 'firebase/firestore'; 
import { db } from '../../Firebase'; 
import * as XLSX from 'xlsx'; 
import DPRWPRManager from '../../pages/admin/DPRWPRManager'; // 🔥 IMPORTED

// 🎨 Animation & Icons
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Plus, Kanban, FileSpreadsheet, Filter, X, Save, Trash2, 
    Edit3, Calendar, CheckCircle, Clock, AlertCircle, User, Layout, ArrowRight,
    List, ArrowUp, ArrowDown, TrendingUp, Crown, Shield 
} from 'lucide-react';

// 🔥 HIERARCHY LEVELS
const ROLE_LEVELS = {
    'super_admin': 4,
    'admin': 3,
    'hr': 2,
    'employee': 1
};

// --- 🎨 HELPER: Modern Priority Badge ---
const PriorityBadge = ({ priority }) => {
    const config = {
        High: { color: 'text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-900/30 border-rose-100 dark:border-rose-800', icon: <AlertCircle size={10} /> },
        Medium: { color: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/30 border-amber-100 dark:border-amber-800', icon: <Clock size={10} /> },
        Low: { color: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 border-emerald-100 dark:border-emerald-800', icon: <CheckCircle size={10} /> }
    };
    const style = config[priority] || config.Medium;

    return (
        <span className={`px-2 py-1 rounded-lg text-[10px] font-extrabold border flex items-center gap-1.5 uppercase tracking-wider ${style.color}`}>
            {style.icon} {priority}
        </span>
    );
};

function MyTasks() {
    const { currentUser, userProfile } = useAuth();
    const userId = currentUser?.uid;
    const userRole = userProfile?.role || 'employee'; 
    const currentLevel = ROLE_LEVELS[userRole] || 0;

    // Permissions
    const canManageTasks = currentLevel >= 3; // Admin & Super Admin
    const canViewAll = currentLevel >= 2; // HR, Admin, Super Admin

    // UI State
    const [viewMode, setViewMode] = useState('board'); // board, list, report, progress
    const [showMyTasksOnly, setShowMyTasksOnly] = useState(false); 
    const [selectedEmployeeForReport, setSelectedEmployeeForReport] = useState('');
    const [showForm, setShowForm] = useState(false); 
    const [sortConfig, setSortConfig] = useState({ key: 'dueDate', direction: 'asc' }); 

    // Form State
    const [isEditing, setIsEditing] = useState(false);
    const [currentTask, setCurrentTask] = useState({ 
        title: '', description: '', priority: 'Medium', dueDate: '', status: 'Pending',
        assignedToId: userId, assignedToName: userProfile?.name || 'Me' 
    });
    const [editingId, setEditingId] = useState(null);
    const [employees, setEmployees] = useState([]);

    // 🔄 Fetch Employees (Only for Managers)
    useEffect(() => {
        if (canViewAll) {
            const fetchEmployees = async () => {
                try {
                    const q = query(collection(db, "users")); // Fetch all users to assign tasks
                    const snap = await getDocs(q);
                    const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                    // Filter based on hierarchy: Can assign to anyone below or equal? Usually below.
                    // Simplified: Admins can assign to anyone.
                    setEmployees(list);
                } catch (err) { console.error(err); }
            };
            fetchEmployees();
        }
    }, [canViewAll]);

    // 🔍 FETCH TASKS
    const taskFilters = useMemo(() => {
        if (canViewAll) return []; // Managers fetch all
        return userId ? [['assignedToId', '==', userId]] : []; // Employees fetch assigned to them
    }, [userId, canViewAll]);

    const { data: tasks, loading, error, addDocument, updateDocument, deleteDocument } = useFirestore('tasks', taskFilters);

    // 🔄 FILTER & SORT LOGIC
    const processedTasks = useMemo(() => {
        if (!tasks) return [];
        let filtered = tasks;

        // "My Tasks Only" toggle for managers
        if (canViewAll && showMyTasksOnly) {
            filtered = tasks.filter(t => t.assignedToId === userId);
        }

        return filtered.sort((a, b) => {
            let valA = a[sortConfig.key];
            let valB = b[sortConfig.key];

            if (sortConfig.key === 'dueDate') {
                valA = valA ? new Date(valA).getTime() : 0;
                valB = valB ? new Date(valB).getTime() : 0;
            }

            if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
            if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });
    }, [tasks, canViewAll, showMyTasksOnly, userId, sortConfig]);

    const boardTasks = processedTasks;

    const handleSort = (key) => {
        let direction = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    // --- REPORT DATA LOGIC ---
    const reportData = useMemo(() => {
        if (!tasks) return [];
        let filtered = tasks;
        if (selectedEmployeeForReport) {
            filtered = tasks.filter(t => t.assignedToId === selectedEmployeeForReport);
        }
        return filtered.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
    }, [tasks, selectedEmployeeForReport]);

    const handleDownloadReport = () => {
        if (reportData.length === 0) return alert("No data available!");
        const exportData = reportData.map(t => ({
            "Title": t.title, "Assigned To": t.assignedToName, "Priority": t.priority,
            "Status": t.status, "Due Date": t.dueDate || 'N/A',
            "Created Date": t.createdAt?.toDate ? t.createdAt.toDate().toLocaleDateString() : '-'
        }));
        const ws = XLSX.utils.json_to_sheet(exportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Task Report");
        XLSX.writeFile(wb, `Tasks_${new Date().toISOString().split('T')[0]}.xlsx`);
    };

    // --- CRUD OPERATIONS ---
    const handleSave = async (e) => {
        e.preventDefault();
        if (!currentTask.title) return;

        let finalAssignedId = currentTask.assignedToId;
        let finalAssignedName = currentTask.assignedToName;

        if (canViewAll && finalAssignedId !== userId) {
            const selectedEmp = employees.find(e => e.id === finalAssignedId);
            finalAssignedName = selectedEmp ? (selectedEmp.name || selectedEmp.email) : 'Unknown';
        } else if (!canViewAll) {
            // Employees can only create tasks for themselves (Personal tasks)
            finalAssignedId = userId;
            finalAssignedName = userProfile?.name || 'Me';
        }

        const taskData = { ...currentTask, assignedToId: finalAssignedId, assignedToName: finalAssignedName, updatedAt: new Date() };

        try {
            if (editingId) {
                await updateDocument(editingId, taskData);
            } else {
                const docRef = await addDocument({ ...taskData, createdBy: userId, createdAt: new Date() });
                
                // Notify if assigned to someone else
                if (finalAssignedId !== userId) {
                    await addDoc(collection(db, "notifications"), {
                        recipientId: finalAssignedId,
                        message: `New Task Assigned: ${taskData.title}`,
                        type: 'task_assigned',
                        link: '/employee/my-tasks',
                        status: 'unread',
                        createdAt: new Date(),
                        relatedId: docRef?.id || null
                    });
                }
            }
            closeForm();
        } catch (err) { alert("Error: " + err.message); }
    };

    const handleDelete = async (id) => { 
        if (window.confirm("Delete this task?")) {
            try { await deleteDocument(id); } 
            catch (err) { alert("Permission Denied."); }
        }
    };

    const handleEdit = (task) => { setCurrentTask(task); setEditingId(task.id); setShowForm(true); setIsEditing(true); };
    
    const handleStatusChange = async (task, newStatus) => { 
        await updateDocument(task.id, { status: newStatus });
        
        // Notify creator if task completed by assignee
        if (newStatus === 'Completed' && task.createdBy !== userId) {
             await addDoc(collection(db, "notifications"), {
                recipientId: task.createdBy,
                message: `Task Completed: ${task.title} by ${userProfile?.name}`,
                type: 'task_completed',
                link: '/employee/my-tasks',
                status: 'unread',
                createdAt: new Date(),
                relatedId: task.id
            });
        }
    };
    
    const closeForm = () => {
        setShowForm(false); setIsEditing(false); setEditingId(null);
        setCurrentTask({ title: '', description: '', priority: 'Medium', dueDate: '', status: 'Pending', assignedToId: userId, assignedToName: userProfile?.name || 'Me' });
    };

    const pendingTasks = boardTasks.filter(t => t.status === 'Pending');
    const inProgressTasks = boardTasks.filter(t => t.status === 'In Progress');
    const completedTasks = boardTasks.filter(t => t.status === 'Completed');

    const tasksByDate = useMemo(() => {
        if (viewMode !== 'list') return {};
        const grouped = {};
        boardTasks.forEach(task => {
            const dateKey = task.dueDate ? task.dueDate : 'No Due Date';
            if (!grouped[dateKey]) grouped[dateKey] = [];
            grouped[dateKey].push(task);
        });
        const sortedKeys = Object.keys(grouped).sort();
        return sortedKeys.reduce((acc, key) => { acc[key] = grouped[key]; return acc; }, {});
    }, [boardTasks, viewMode]);


    return (
        <div className="min-h-screen bg-gray-50/50 dark:bg-gray-900 p-4 md:p-8 transition-colors duration-300">
            
            {/* --- HEADER --- */}
            <div className="max-w-7xl mx-auto mb-8">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h2 className="text-3xl font-extrabold text-gray-800 dark:text-white tracking-tight flex items-center gap-3">
                            <span className="bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400 text-transparent bg-clip-text flex items-center gap-2">
                                {userRole === 'super_admin' && <Crown size={24} className="text-amber-500" />}
                                {canViewAll ? "Task Management" : "My Tasks"}
                            </span>
                        </h2>
                        <p className="text-gray-500 dark:text-gray-400 font-medium mt-1">Manage tasks & track progress.</p>
                    </div>

                    <div className="flex flex-wrap gap-3 w-full md:w-auto">
                         {/* Toggle View */}
                        <div className="bg-white dark:bg-gray-800 p-1 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 flex overflow-x-auto">
                            <button onClick={() => setViewMode('board')} className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all whitespace-nowrap ${viewMode === 'board' ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400' : 'text-gray-400 dark:text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700'}`}>
                                <Kanban size={16} /> Board
                            </button>
                            <button onClick={() => setViewMode('list')} className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all whitespace-nowrap ${viewMode === 'list' ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400' : 'text-gray-400 dark:text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700'}`}>
                                <List size={16} /> List
                            </button>
                            <button onClick={() => setViewMode('progress')} className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all whitespace-nowrap ${viewMode === 'progress' ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400' : 'text-gray-400 dark:text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700'}`}>
                                <TrendingUp size={16} /> Reports
                            </button>

                            {canViewAll && (
                                <button onClick={() => setViewMode('report')} className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all whitespace-nowrap ${viewMode === 'report' ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400' : 'text-gray-400 dark:text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700'}`}>
                                    <FileSpreadsheet size={16} /> Export
                                </button>
                            )}
                        </div>

                        {/* Add Button */}
                        {(viewMode === 'board' || viewMode === 'list') && (
                            <button 
                                onClick={() => setShowForm(true)} 
                                className="flex-1 md:flex-none bg-gray-900 dark:bg-indigo-600 hover:bg-black dark:hover:bg-indigo-700 text-white px-6 py-2.5 rounded-xl font-bold shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2 active:scale-95"
                            >
                                <Plus size={18} /> New Task
                            </button>
                        )}
                    </div>
                </div>

                {/* Filters & Sorting Row */}
                {(viewMode === 'board' || viewMode === 'list') && (
                    <div className="mt-6 flex flex-wrap items-center gap-3">
                        <button 
                            onClick={() => handleSort('dueDate')}
                            className="flex items-center gap-2 bg-white dark:bg-gray-800 px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm hover:border-indigo-300 dark:hover:border-indigo-500 transition-all text-sm font-bold text-gray-600 dark:text-gray-300"
                        >
                            <Calendar size={16} /> 
                            Sort by Date
                            {sortConfig.key === 'dueDate' && (sortConfig.direction === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />)}
                        </button>

                        <button 
                            onClick={() => handleSort('priority')}
                            className="flex items-center gap-2 bg-white dark:bg-gray-800 px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm hover:border-indigo-300 dark:hover:border-indigo-500 transition-all text-sm font-bold text-gray-600 dark:text-gray-300"
                        >
                            <AlertCircle size={16} /> 
                            Sort by Priority
                            {sortConfig.key === 'priority' && (sortConfig.direction === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />)}
                        </button>

                        {canViewAll && (
                             <label className="cursor-pointer flex items-center gap-3 bg-white dark:bg-gray-800 px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm hover:border-indigo-300 dark:hover:border-indigo-500 transition-all select-none">
                                <div className="relative">
                                    <input type="checkbox" className="sr-only" checked={showMyTasksOnly} onChange={() => setShowMyTasksOnly(!showMyTasksOnly)} />
                                    <div className={`w-10 h-6 rounded-full shadow-inner transition-colors ${showMyTasksOnly ? 'bg-indigo-600' : 'bg-gray-200 dark:bg-gray-600'}`}></div>
                                    <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${showMyTasksOnly ? 'translate-x-4' : ''}`}></div>
                                </div>
                                <span className="text-sm font-bold text-gray-600 dark:text-gray-300">My Tasks Only</span>
                            </label>
                        )}
                    </div>
                )}
            </div>

            {loading && viewMode !== 'progress' && <div className="py-20"><LoadingSpinner message="Syncing Data..." /></div>}
            {error && viewMode !== 'progress' && <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-4 rounded-xl mb-6 border border-red-200 dark:border-red-800">{error}</div>}

            {/* --- KANBAN VIEW --- */}
            {viewMode === 'board' && (
                <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
                    <TaskColumn 
                        title="To Do" tasks={pendingTasks} headerColor="bg-rose-50 dark:bg-rose-900/20 border-rose-100 dark:border-rose-800 text-rose-700 dark:text-rose-400"
                        onStatusChange={handleStatusChange} onEdit={handleEdit} onDelete={handleDelete} userRole={userRole} userId={userId} 
                    />
                    <TaskColumn 
                        title="In Progress" tasks={inProgressTasks} headerColor="bg-amber-50 dark:bg-amber-900/20 border-amber-100 dark:border-amber-800 text-amber-700 dark:text-amber-400"
                        onStatusChange={handleStatusChange} onEdit={handleEdit} onDelete={handleDelete} userRole={userRole} userId={userId} 
                    />
                    <TaskColumn 
                        title="Completed" tasks={completedTasks} headerColor="bg-emerald-50 dark:bg-emerald-900/20 border-emerald-100 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400"
                        onStatusChange={handleStatusChange} onEdit={handleEdit} onDelete={handleDelete} userRole={userRole} userId={userId} 
                    />
                </div>
            )}

            {/* --- LIST VIEW --- */}
            {viewMode === 'list' && (
                <div className="max-w-4xl mx-auto space-y-8">
                    {Object.keys(tasksByDate).length === 0 ? (
                        <div className="text-center py-10 opacity-40 select-none">
                            <div className="bg-gray-100 dark:bg-gray-800 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-2 text-xl">🥥</div>
                            <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wide">Empty</p>
                        </div>
                    ) : (
                        Object.keys(tasksByDate).map(date => {
                            const dateObj = new Date(date);
                            const isToday = date === new Date().toISOString().split('T')[0];
                            const isPast = date !== 'No Due Date' && dateObj < new Date().setHours(0,0,0,0);

                            return (
                                <div key={date}>
                                    <div className={`flex items-center gap-3 mb-4 ${isToday ? 'text-indigo-600 dark:text-indigo-400' : isPast ? 'text-red-500 dark:text-red-400' : 'text-gray-500 dark:text-gray-400'}`}>
                                        <Calendar size={20} />
                                        <h3 className="text-lg font-bold">
                                            {date === 'No Due Date' ? 'No Due Date' : new Date(date).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
                                            {isToday && <span className="ml-2 text-xs bg-indigo-100 dark:bg-indigo-900/30 px-2 py-0.5 rounded-full text-indigo-700 dark:text-indigo-300 uppercase tracking-wide">Today</span>}
                                            {isPast && <span className="ml-2 text-xs bg-red-100 dark:bg-red-900/30 px-2 py-0.5 rounded-full text-red-700 dark:text-red-400 uppercase tracking-wide">Overdue</span>}
                                        </h3>
                                    </div>
                                    <div className="space-y-3">
                                        {tasksByDate[date].map(task => (
                                            <div key={task.id} className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm flex items-center justify-between group hover:shadow-md transition-all">
                                                <div className="flex items-center gap-4">
                                                    <button 
                                                        onClick={() => {
                                                            const nextStatus = task.status === 'Completed' ? 'Pending' : 'Completed';
                                                            handleStatusChange(task, nextStatus);
                                                        }}
                                                        className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors 
                                                            ${task.status === 'Completed' ? 'bg-green-500 border-green-500 text-white' : 'border-gray-300 dark:border-gray-600 hover:border-indigo-500 text-transparent'}`}
                                                    >
                                                        <CheckCircle size={14} />
                                                    </button>
                                                    <div>
                                                        <h4 className={`font-bold text-gray-800 dark:text-gray-200 ${task.status === 'Completed' ? 'line-through text-gray-400 dark:text-gray-600' : ''}`}>{task.title}</h4>
                                                        <div className="flex items-center gap-2 mt-1">
                                                            <PriorityBadge priority={task.priority} />
                                                            <span className="text-xs text-gray-400 dark:text-gray-500 flex items-center gap-1"><User size={10} /> {task.assignedToName}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button onClick={() => handleEdit(task)} className="p-2 bg-gray-50 dark:bg-gray-700 hover:bg-blue-50 dark:hover:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg"><Edit3 size={16} /></button>
                                                    <button onClick={() => handleDelete(task.id)} className="p-2 bg-gray-50 dark:bg-gray-700 hover:bg-red-50 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg"><Trash2 size={16} /></button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            )}
            
            {/* 🔥 PROGRESS MANAGER VIEW */}
            {viewMode === 'progress' && (
                <div className="max-w-7xl mx-auto">
                    <DPRWPRManager />
                </div>
            )}

            {/* --- REPORT VIEW --- */}
            {viewMode === 'report' && canViewAll && (
                <div className="max-w-7xl mx-auto bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                    <div className="p-6 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/30 flex flex-col sm:flex-row justify-between items-end gap-4">
                        <div className="w-full sm:w-auto">
                            <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-2 block">Filter by Employee</label>
                            <div className="relative">
                                <User className="absolute left-3 top-2.5 text-gray-400 dark:text-gray-500" size={16} />
                                <select 
                                    className="w-full sm:w-64 pl-9 pr-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-medium text-sm"
                                    value={selectedEmployeeForReport} 
                                    onChange={(e) => setSelectedEmployeeForReport(e.target.value)}
                                >
                                    <option value="">All Employees</option>
                                    {employees.map(emp => (<option key={emp.id} value={emp.id}>{emp.name || emp.email}</option>))}
                                </select>
                            </div>
                        </div>
                        <button onClick={handleDownloadReport} className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl font-bold shadow-md transition-all flex items-center gap-2 active:scale-95">
                            <FileSpreadsheet size={18} /> Export Excel
                        </button>
                    </div>
                    
                    <div className="overflow-x-auto">
                        <table className="w-full text-left whitespace-nowrap">
                            <thead className="bg-gray-50 dark:bg-gray-700/50 text-gray-500 dark:text-gray-400 font-bold text-xs uppercase tracking-wider">
                                <tr>
                                    <th className="px-6 py-4">Title</th>
                                    <th className="px-6 py-4">Assignee</th>
                                    <th className="px-6 py-4">Priority</th>
                                    <th className="px-6 py-4">Due Date</th>
                                    <th className="px-6 py-4">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-700 text-sm">
                                {reportData.map(task => (
                                    <tr key={task.id} className="hover:bg-gray-50/80 dark:hover:bg-gray-700/30 transition-colors">
                                        <td className="px-6 py-4 font-semibold text-gray-800 dark:text-gray-200">{task.title}</td>
                                        <td className="px-6 py-4 text-gray-600 dark:text-gray-400">{task.assignedToName}</td>
                                        <td className="px-6 py-4"><PriorityBadge priority={task.priority} /></td>
                                        <td className="px-6 py-4 text-gray-500 dark:text-gray-400">{task.dueDate}</td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-1 rounded text-xs font-bold ${task.status === 'Completed' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'}`}>
                                                {task.status}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* --- MODAL FORM --- */}
            <AnimatePresence>
                {showForm && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 dark:bg-black/60 backdrop-blur-sm">
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.95, y: 20 }} 
                            animate={{ opacity: 1, scale: 1, y: 0 }} 
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden border border-gray-100 dark:border-gray-700"
                        >
                            <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50/50 dark:bg-gray-900/30">
                                <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100">{isEditing ? 'Edit Task' : 'New Task'}</h3>
                                <button onClick={closeForm} className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full text-gray-500 dark:text-gray-400 transition-colors"><X size={20} /></button>
                            </div>

                            <form onSubmit={handleSave} className="p-6 grid grid-cols-1 md:grid-cols-2 gap-5">
                                <div className="md:col-span-2">
                                    <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1 block">Title</label>
                                    <input type="text" required className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white" placeholder="Task Name" value={currentTask.title} onChange={(e) => setCurrentTask({ ...currentTask, title: e.target.value })} />
                                </div>

                                {canViewAll && (
                                    <div>
                                        <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1 block">Assign To</label>
                                        <select className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white" value={currentTask.assignedToId} onChange={(e) => setCurrentTask({ ...currentTask, assignedToId: e.target.value })}>
                                            <option value={userId}>Myself</option>
                                            {employees.map(e => (<option key={e.id} value={e.id}>{e.name || e.email}</option>))}
                                        </select>
                                    </div>
                                )}

                                <div>
                                    <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1 block">Priority</label>
                                    <select className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white" value={currentTask.priority} onChange={(e) => setCurrentTask({ ...currentTask, priority: e.target.value })}>
                                        <option>Low</option>
                                        <option>Medium</option>
                                        <option>High</option>
                                    </select>
                                </div>

                                <div className="md:col-span-2">
                                    <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1 block">Description</label>
                                    <textarea rows="3" className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none resize-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white" placeholder="Details..." value={currentTask.description} onChange={(e) => setCurrentTask({ ...currentTask, description: e.target.value })}></textarea>
                                </div>

                                <div>
                                    <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1 block">Due Date</label>
                                    <input type="date" className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white dark:[color-scheme:dark]" value={currentTask.dueDate} onChange={(e) => setCurrentTask({ ...currentTask, dueDate: e.target.value })} />
                                </div>

                                <div className="md:col-span-2 pt-4 flex justify-end gap-3">
                                    <button type="button" onClick={closeForm} className="px-5 py-2.5 text-gray-600 dark:text-gray-300 font-bold hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors">Cancel</button>
                                    <button type="submit" className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 text-white font-bold rounded-xl shadow-lg hover:shadow-indigo-500/30 transition-all active:scale-95 flex items-center gap-2">
                                        <Save size={18} /> {isEditing ? 'Save Changes' : 'Create Task'}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

        </div>
    );
}

// 🧱 MODERN TASK COLUMN
const TaskColumn = ({ title, tasks, headerColor, onStatusChange, onEdit, onDelete, userRole, userId }) => {
    // Permission check for actions
    const canEdit = (task) => {
        // Super Admin & Admin can edit anything
        if (ROLE_LEVELS[userRole] >= 3) return true;
        // Creator can edit their own tasks
        if (task.createdBy === userId) return true;
        return false;
    };

    return (
        <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-gray-200/60 dark:border-gray-700 overflow-hidden">
            <div className={`p-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center ${headerColor}`}>
                <h4 className="font-extrabold text-sm uppercase tracking-wide flex items-center gap-2">
                    {title}
                </h4>
                <span className="bg-white/50 dark:bg-black/20 px-2 py-0.5 rounded text-xs font-bold">{tasks.length}</span>
            </div>
            
            <div className="flex-1 p-3 space-y-3 overflow-y-auto max-h-[70vh] custom-scrollbar">
                <AnimatePresence>
                    {tasks.map(task => {
                        const isOverdue = task.status !== 'Completed' && task.dueDate && new Date(task.dueDate) < new Date();
                        const showActions = canEdit(task);

                        return (
                            <motion.div 
                                key={task.id}
                                layout
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.9 }}
                                className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow group"
                            >
                                <div className="flex justify-between items-start mb-2">
                                    <PriorityBadge priority={task.priority} />
                                    {showActions && (
                                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button onClick={() => onEdit(task)} className="p-1 hover:bg-blue-50 dark:hover:bg-blue-900/30 text-blue-500 dark:text-blue-400 rounded"><Edit3 size={14} /></button>
                                            <button onClick={() => onDelete(task.id)} className="p-1 hover:bg-red-50 dark:hover:bg-red-900/30 text-red-500 dark:text-red-400 rounded"><Trash2 size={14} /></button>
                                        </div>
                                    )}
                                </div>
                                
                                <h5 className="font-bold text-gray-800 dark:text-gray-100 text-sm mb-1 leading-snug">{task.title}</h5>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mb-3 line-clamp-2">{task.description}</p>
                                
                                <div className="flex items-center justify-between pt-3 border-t border-gray-50 dark:border-gray-700">
                                    <div className="flex items-center gap-2 text-xs font-medium text-gray-500 dark:text-gray-400">
                                        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center text-[10px] font-bold">
                                            {task.assignedToName?.charAt(0).toUpperCase()}
                                        </div>
                                        {isOverdue && <span className="text-red-500 dark:text-red-400 flex items-center gap-1 bg-red-50 dark:bg-red-900/20 px-1.5 py-0.5 rounded font-bold">Overdue</span>}
                                    </div>

                                    <div className="flex items-center gap-1">
                                        {task.status === 'Pending' && (
                                            <button onClick={() => onStatusChange(task, 'In Progress')} className="text-[10px] font-bold bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300 px-2 py-1 rounded flex items-center gap-1 transition-colors">
                                                Start <ArrowRight size={10} />
                                            </button>
                                        )}
                                        {task.status === 'In Progress' && (
                                            <button onClick={() => onStatusChange(task, 'Completed')} className="text-[10px] font-bold bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/40 text-green-600 dark:text-green-400 px-2 py-1 rounded flex items-center gap-1 transition-colors">
                                                Done <CheckCircle size={10} />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </motion.div>
                        );
                    })}
                </AnimatePresence>
            </div>
        </div>
    );
};

export default MyTasks;