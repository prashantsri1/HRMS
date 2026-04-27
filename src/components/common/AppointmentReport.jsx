// src/pages/admin/AppointmentReport.jsx

import React, { useMemo, useState } from 'react';
import { 
    FileText, Download, Users, CheckCircle, XCircle, Search, ArrowLeft, RefreshCw, Crown 
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { useCollection } from '../../hooks/useCollection'; 
import { useNavigate } from 'react-router-dom'; 
import { useAuth } from '../../context/AuthContext';

const AppointmentReport = () => {
  const { userProfile } = useAuth();
  const navigate = useNavigate(); 
  
  // Security Check
  const role = userProfile?.role || 'employee';
  const isSuperAdmin = role === 'super_admin';
  const isAdmin = role === 'admin';
  
  if (!isAdmin && !isSuperAdmin) {
     return <div className="h-screen flex items-center justify-center dark:bg-gray-900 dark:text-white">Access Denied</div>;
  }

  // Hook to fetch data
  const { documents: appointments, error } = useCollection('appointments', null, ['date', 'desc']);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState('');

  // --- STATS CALCULATION ---
  const stats = useMemo(() => {
    if (!appointments) return { total: 0, completed: 0, cancelled: 0 };
    const total = appointments.length;
    const completed = appointments.filter(a => a.status === 'Completed').length;
    const cancelled = appointments.filter(a => a.status === 'Cancelled').length;
    return { total, completed, cancelled };
  }, [appointments]);

  // --- FILTER & SORT ---
  const filteredData = useMemo(() => {
    if (!appointments) return [];
    
    return appointments.filter(appt => {
      const clientName = appt.clientName ? appt.clientName.toLowerCase() : '';
      const ticketId = appt.ticketId ? appt.ticketId.toLowerCase() : '';
      const searchLower = searchTerm.toLowerCase();

      const matchesSearch = clientName.includes(searchLower) || ticketId.includes(searchLower);
      const matchesDate = dateFilter ? appt.date === dateFilter : true;
      
      return matchesSearch && matchesDate;
    });
  }, [appointments, searchTerm, dateFilter]);

  // --- EXPORT TO EXCEL ---
  const handleExport = () => {
    if (filteredData.length === 0) return alert("No data to export!");

    const dataToExport = filteredData.map((a, i) => ({
      "S.No": i + 1,
      "Ticket ID": a.ticketId || '-',
      "Date": a.date || '-',
      "Time": a.time || '-',
      "Client Name": a.clientName || '-',
      "Type": a.type || '-',
      "Status": a.status || '-',
      "Created By": a.createdBy || '-',
      "Location": a.location || '-'
    }));

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Appointments");
    XLSX.writeFile(wb, "Appointment_Report.xlsx");
  };

  // --- ERROR STATE ---
  if (error) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50 flex-col gap-4 p-4 text-center">
        <div className="text-red-500 font-bold text-xl">Error Loading Data</div>
        <p className="text-gray-600">{error}</p>
        <button onClick={() => window.location.reload()} className="px-4 py-2 bg-indigo-600 text-white rounded-lg shadow">Retry</button>
      </div>
    );
  }

  // --- LOADING STATE ---
  if (!appointments) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50 dark:bg-gray-900 flex-col p-4">
        <RefreshCw className="animate-spin text-indigo-600 mb-4" size={40} />
        <div className="text-gray-500 font-bold animate-pulse">Loading Appointments...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 sm:p-6 font-sans">
      
      {/* HEADER - RESPONSIVE STACKING */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => navigate(-1)} 
            className="p-2 bg-white dark:bg-gray-800 rounded-full shadow hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors border border-gray-200 dark:border-gray-700 shrink-0"
          >
            <ArrowLeft size={20} className="text-gray-600 dark:text-gray-300"/>
          </button>
          <h1 className="text-xl sm:text-2xl font-extrabold text-gray-900 dark:text-white flex items-center gap-2">
            <FileText className="text-indigo-600 shrink-0" size={24}/> Appointment Reports
            {isSuperAdmin && <span className="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded-full border border-amber-200 flex items-center gap-1"><Crown size={12}/> Owner</span>}
          </h1>
        </div>
        
        <button onClick={handleExport} className="w-full sm:w-auto bg-green-600 text-white px-5 py-2.5 rounded-xl font-bold flex justify-center items-center gap-2 hover:bg-green-700 transition-colors shadow-md text-sm">
          <Download size={18}/> Export Report
        </button>
      </div>

      {/* STATS CARDS - RESPONSIVE GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <StatCard title="Total Bookings" value={stats.total} icon={Users} color="indigo" />
        <StatCard title="Completed" value={stats.completed} icon={CheckCircle} color="green" />
        <StatCard title="Cancelled" value={stats.cancelled} icon={XCircle} color="red" />
      </div>

      {/* TABLE CONTAINER */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden flex flex-col h-[65vh] sm:h-auto">
        
        {/* Toolbar - Responsive */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row gap-3 bg-gray-50 dark:bg-gray-700/30">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 text-gray-400" size={16}/>
            <input 
              placeholder="Search Client or Ticket ID..." 
              className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 outline-none focus:ring-2 focus:ring-indigo-500 text-gray-800 dark:text-gray-200 text-sm"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
          <input 
            type="date" 
            className="p-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 outline-none text-gray-800 dark:text-gray-200 text-sm w-full sm:w-auto dark:[color-scheme:dark]"
            value={dateFilter}
            onChange={e => setDateFilter(e.target.value)}
          />
        </div>

        {/* Table - Scrollable */}
        <div className="flex-1 overflow-auto custom-scrollbar">
          <table className="w-full text-left border-collapse min-w-[800px] sm:min-w-full">
            <thead className="bg-gray-100 dark:bg-gray-700 sticky top-0 z-10">
              <tr>
                {['Ticket ID', 'Date', 'Client', 'Type', 'Status', 'Location'].map(h => (
                  <th key={h} className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredData.map((appt, i) => (
                <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                  <td className="p-4 font-mono text-xs text-gray-500 whitespace-nowrap">{appt.ticketId || '-'}</td>
                  <td className="p-4 text-sm font-bold text-gray-800 dark:text-gray-200 whitespace-nowrap">
                    {appt.date} <span className="block text-xs font-normal text-gray-500">{appt.time}</span>
                  </td>
                  <td className="p-4 text-sm font-medium text-gray-900 dark:text-white">
                    {appt.clientName}
                    <div className="text-xs text-gray-500">{appt.clientPhone}</div>
                  </td>
                  <td className="p-4 text-sm text-gray-600 dark:text-gray-300">{appt.type}</td>
                  <td className="p-4">
                    <span className={`px-2 py-1 text-[10px] sm:text-xs font-bold rounded-full whitespace-nowrap
                      ${appt.status === 'Completed' ? 'bg-green-100 text-green-700' : 
                        appt.status === 'Cancelled' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>
                      {appt.status}
                    </span>
                  </td>
                  <td className="p-4 text-sm text-gray-500 max-w-[150px] sm:max-w-[200px] truncate" title={appt.location}>{appt.location || 'N/A'}</td>
                </tr>
              ))}
              {filteredData.length === 0 && (
                <tr><td colSpan="6" className="p-10 text-center text-gray-400">No records found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
        .dark .custom-scrollbar::-webkit-scrollbar-thumb { background: #4b5563; }
      `}</style>
    </div>
  );
};

// --- Helper Stats Card (Responsive) ---
const StatCard = ({ title, value, icon: Icon, color }) => (
  <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 flex items-center gap-4 transition-transform hover:scale-[1.02]">
    <div className={`p-3 rounded-full bg-${color}-100 dark:bg-${color}-900/30 text-${color}-600 shrink-0`}>
      <Icon size={24} />
    </div>
    <div>
      <p className="text-xs sm:text-sm text-gray-500 font-bold uppercase">{title}</p>
      <h3 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white">{value}</h3>
    </div>
  </div>
);

export default AppointmentReport;