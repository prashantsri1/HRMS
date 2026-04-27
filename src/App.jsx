// src/App.jsx

import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { db } from './Firebase'; 
import { doc, onSnapshot } from 'firebase/firestore'; 

// 🔥 NEW: Activity Tracker Hook
import { useActivityTracker } from './hooks/useActivityTracker'; 

// Pages & Components Imports
import KPIManager from './components/common/KPIManager'; 
import KRAManager from './components/common/KRAManager'; 
import QuickContact from './components/common/QuickContact'; 
import LeadsManagementSystem from './components/common/LeadsManagementSystem'; 
// 🔥 NEW: Notice Board Import
import NoticeBoardSystem from './pages/admin/NoticeBoard'; 
import TravelRequisition from './pages/hr/TravelRequisition';
import InvoiceRecords from './pages/admin/InvoiceRecords';
import Accounting from './pages/admin/Accounting';
import LoginPage from './pages/authen/LoginPage';
import AdminDashboard from './pages/admin/AdminDashboard';
import HRDashboard from './pages/hr/HRDashboard';
import EmployeeDashboard from './pages/employee/EmployeeDashboard';
import UserManagement from './pages/admin/UserManagement';
import PayrollManagement from './pages/hr/PayrollManagement';
import LeaveRequest from './pages/hr/LeaveRequest'; 
import MyTasks from './pages/employee/MyTasks';
import LeaveApply from './pages/employee/LeaveApply';
import AttendanceRecord from './pages/hr/AttendanceRecord'; 
import Profile from './pages/employee/Profile';
import Notfound from './pages/shared/Notfound';
import MonthlyAttendanceReport from './pages/hr/MonthlyAttendanceReport';
import MonthlyLeaveReport from './pages/hr/MonthlyLeaveReport';
import YearlyPayoffReport from './pages/hr/YearlyPayoffReport';
import SharedDocs from './components/common/SharedDocs';
import MyLeaveStatus from './pages/employee/MyLeaveStatus';
import Settings from './pages/admin/Settings';
import ForceStopPage from './pages/shared/ForceStopPage'; 
import MaintenancePage from './pages/shared/MaintenancePage'; 
import PayrollRecords from './pages/hr/PayrollRecords';

// 🚀 NEW HARDCORE COMPONENTS IMPORTS
import EnterprisePayroll from './pages/hr/EnterprisePayroll'; 
import InvoiceGenerator from './pages/admin/InvoiceGenerator'; 
import InventoryManager from './pages/admin/InventoryManager'; 
import Notepad from './components/common/Notepad';
// 🔥 APPOINTMENT COMPONENTS
import Appointment from './components/common/Appointment'; 
import AppointmentReport from './components/common/AppointmentReport'; 

// 🔥 NEW: LOGS COMPONENTS
import Logs from './components/common/Logs';
import LogbookReport from './components/common/LogbookReport';

import AuthGuard from './components/auth/AuthGuard'; 
import Sidebar from './components/common/Sidebar';
import Header from './components/common/Header';
import OfficeData from './components/common/OfficeData';
import LoadingSpinner from './components/common/LoadingSpinner';

function App() {
    const { loading, currentUser, userProfile, logout } = useAuth(); 
    const navigate = useNavigate();
    
    // Sidebar State
    const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth > 768);
    const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

    // 🔥 ACTIVATE TRACKER HERE (Starts logging activity automatically)
    useActivityTracker();

    // ✅ 1. DARK MODE LISTENER
    useEffect(() => {
        if (userProfile?.darkMode) {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    }, [userProfile]);

    // 🔥 2. GLOBAL MAINTENANCE LISTENER
    useEffect(() => {
        if (currentUser) {
            const unsub = onSnapshot(doc(db, 'settings', 'global'), async (docSnap) => {
                if (docSnap.exists()) {
                    const isMaintenance = docSnap.data().maintenanceMode;
                    const myRole = userProfile?.role || 'employee';

                    // Super Admin & Admin bypass maintenance
                    if (isMaintenance && !['admin', 'super_admin'].includes(myRole)) {
                        console.warn("Maintenance Mode Activated. Logging out...");
                        await logout(); 
                        navigate('/maintenance'); 
                    }
                }
            });
            return () => unsub(); 
        }
    }, [currentUser, userProfile, logout, navigate]);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
                <LoadingSpinner message="Initializing OMS..." size="50px" />
            </div>
        ); 
    }

    return (
        <div className="flex h-screen bg-gray-50 dark:bg-gray-900 overflow-hidden transition-colors duration-300">
            
            {/* 🌟 SIDEBAR */}
            {currentUser && (
                <Sidebar 
                    isOpen={isSidebarOpen} 
                    toggleSidebar={toggleSidebar} 
                />
            )}

            {/* 🌟 MAIN CONTENT WRAPPER */}
            <div className={`flex-1 flex flex-col min-w-0 h-full transition-all duration-300 ease-in-out
                ${currentUser && isSidebarOpen ? 'md:ml-72' : 'md:ml-0'}`}
            >
                
                {/* 🌟 HEADER */}
                {currentUser && <Header toggleSidebar={toggleSidebar} />}

                {/* 🌟 SCROLLABLE PAGE CONTENT */}
                <main className="flex-1 overflow-y-auto p-4 sm:p-6 bg-gray-50 dark:bg-gray-900 scroll-smooth custom-scrollbar transition-colors duration-300">
                    <Routes>
                        {/* Public Routes */}
                        <Route path="/" element={!currentUser ? <LoginPage /> : <Navigate to="/employee/dashboard" />} />
                        <Route path="/login" element={!currentUser ? <LoginPage /> : <Navigate to="/employee/dashboard" />} />
                        <Route path="/force-stop" element={<ForceStopPage/>} />
                        <Route path="/maintenance" element={<MaintenancePage />} />

                        {/* 🛡️ SUPER ADMIN & ADMIN ROUTES */}
                        <Route path="/admin/dashboard" element={<AuthGuard allowedRoles={['admin', 'super_admin']}><AdminDashboard /></AuthGuard>} />
                        <Route path="/admin/user-management" element={<AuthGuard allowedRoles={['admin', 'super_admin']}><UserManagement /></AuthGuard>} />
                        <Route path="/admin/leads-management" element={<AuthGuard allowedRoles={['admin', 'hr', 'super_admin', 'employee']}><LeadsManagementSystem/></AuthGuard>} />
                        
                        {/* 🔥 NEW: Notice Board Route (Accessible by all) */}
                        <Route path="/admin/notices" element={<AuthGuard allowedRoles={['admin', 'hr', 'super_admin', 'employee']}><NoticeBoardSystem/></AuthGuard>} />
                        
                        {/* Accounting & Finance */}
                        <Route path="/admin/accounting" element={<AuthGuard allowedRoles={['admin', 'hr', 'super_admin', 'employee']}><Accounting /></AuthGuard>} />
                        <Route path="/admin/invoice-records" element={<AuthGuard allowedRoles={['admin', 'hr', 'super_admin', 'employee']}><InvoiceRecords /></AuthGuard>} />
                        <Route path="/admin/invoice-generator" element={<AuthGuard allowedRoles={['admin', 'hr', 'super_admin', 'employee']}><InvoiceGenerator /></AuthGuard>} />
                        <Route path="/admin/inventory-manager" element={<AuthGuard allowedRoles={['admin', 'hr', 'super_admin', 'employee']}><InventoryManager /></AuthGuard>} />

                        {/* Appointments */}
                        <Route path="/admin/appointments" element={<AuthGuard allowedRoles={['admin', 'hr', 'super_admin', 'employee']}><Appointment /></AuthGuard>} />
                        <Route path="/admin/appointment-report" element={<AuthGuard allowedRoles={['admin', 'hr', 'super_admin', 'employee']}><AppointmentReport /></AuthGuard>} />

                        {/* 🛡️ HR ROUTES (Accessible by Admin/SuperAdmin too) */}
                        <Route path="/employee/travel" element={<AuthGuard allowedRoles={['employee', 'hr', 'admin', 'super_admin']}><TravelRequisition /></AuthGuard>} />
                        <Route path="/hr/dashboard" element={<AuthGuard allowedRoles={['hr', 'admin', 'super_admin']}><HRDashboard /></AuthGuard>} />
                        <Route path="/hr/payroll-management" element={<AuthGuard allowedRoles={['hr', 'admin', 'super_admin']}><PayrollManagement /></AuthGuard>} />
                        <Route path="/hr/payroll-records" element={<AuthGuard allowedRoles={['hr', 'admin', 'super_admin']}><PayrollRecords /></AuthGuard>} />
                        <Route path="/hr/advanced-payroll" element={<AuthGuard allowedRoles={['hr', 'admin', 'super_admin']}><EnterprisePayroll /></AuthGuard>} />
                        <Route path="/hr/attendance-records" element={<AuthGuard allowedRoles={['hr', 'admin', 'super_admin']}><AttendanceRecord /></AuthGuard>} />
                        <Route path="/hr/leave-requests" element={<AuthGuard allowedRoles={['hr', 'admin', 'super_admin']}><LeaveRequest /></AuthGuard>} /> 
                        
                        {/* Reports */}
                        <Route path="/hr/leave-report" element={<AuthGuard allowedRoles={['hr', 'admin', 'super_admin']}><MonthlyLeaveReport /></AuthGuard>} />
                        <Route path="/hr/monthly-report" element={<AuthGuard allowedRoles={['hr', 'admin', 'super_admin']}><MonthlyAttendanceReport /></AuthGuard>} />
                        <Route path="/hr/yearly-payoff" element={<AuthGuard allowedRoles={['hr', 'admin', 'super_admin']}><YearlyPayoffReport /></AuthGuard>} />

                        {/* 🛡️ EMPLOYEE & COMMON ROUTES */}
                        <Route path="/employee/dashboard" element={<AuthGuard allowedRoles={['employee', 'hr', 'admin', 'super_admin']}><EmployeeDashboard /></AuthGuard>} />
                        <Route path="/employee/my-tasks" element={<AuthGuard allowedRoles={['employee', 'admin', 'hr', 'super_admin']}><MyTasks /></AuthGuard>} />
                        <Route path="/employee/leave-apply" element={<AuthGuard allowedRoles={['employee', 'admin', 'super_admin']}><LeaveApply /></AuthGuard>} /> 
                        <Route path="/my-leaves" element={<AuthGuard allowedRoles={['employee', 'admin', 'super_admin']}><MyLeaveStatus /></AuthGuard>} />
                        <Route path="/employee/profile" element={<AuthGuard allowedRoles={['employee', 'hr', 'admin', 'super_admin']}><Profile /></AuthGuard>} /> 

                        {/* Shared Tools */}
                        <Route path="/notepad" element={<AuthGuard allowedRoles={['admin', 'hr', 'employee', 'super_admin']}><Notepad /></AuthGuard>} />
                        <Route path="/contacts" element={<AuthGuard allowedRoles={['admin', 'hr', 'employee', 'super_admin']}> <QuickContact/></AuthGuard>}/>
                        <Route path="/office-data" element={<AuthGuard allowedRoles={['admin', 'hr', 'employee', 'super_admin']}> <OfficeData /></AuthGuard>}/>
                        <Route path="/shared-docs" element={<AuthGuard allowedRoles={['admin', 'employee', 'hr', 'super_admin']}><SharedDocs /></AuthGuard>} />
                        
                        {/* KRA & KPI */}
                        <Route path="/kra" element={<AuthGuard allowedRoles={['admin', 'hr', 'employee', 'super_admin']}> <KRAManager /> </AuthGuard> } />
                        <Route path="/kpi" element={<AuthGuard allowedRoles={['admin', 'hr', 'employee', 'super_admin']}> <KPIManager /> </AuthGuard> } />

                        {/* 🔥 LOGS ROUTES (NEW) */}
                        <Route path="/logs" element={<AuthGuard allowedRoles={['admin', 'hr', 'employee', 'super_admin']}><Logs /></AuthGuard>} />
                        <Route path="/admin/log-reports" element={<AuthGuard allowedRoles={['admin', 'super_admin']}><LogbookReport /></AuthGuard>} />

                        {/* Settings */}
                        <Route path="/settings" element={<AuthGuard allowedRoles={['admin', 'hr', 'employee', 'super_admin']}><Settings /></AuthGuard>} />
                        
                        {/* 404 */}
                        <Route path="*" element={<Notfound/>} />
                    </Routes>
                </main>
            </div>
        </div>
    );
}

export default App;