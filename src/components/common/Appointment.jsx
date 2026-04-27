// src/pages/admin/Appointment.jsx

import React, { useState, useEffect, useMemo } from 'react';
import { 
    Calendar, Clock, User, MapPin, Video, Plus, X, 
    CheckCircle, Mail, BarChart, MoreVertical, Edit2, Trash2, AlertCircle, Crown, Shield 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { collection, addDoc, updateDoc, deleteDoc, doc, arrayUnion, serverTimestamp } from 'firebase/firestore';
import { db } from '../../Firebase'; 
import { useCollection } from '../../hooks/useCollection';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom'; 

// --- UTILS ---
const formatDate = (d) => new Date(d).toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' });

const Appointment = () => {
  const { userProfile } = useAuth();
  const { documents: leads } = useCollection('leads');
  const { documents: appointments } = useCollection('appointments');
  const navigate = useNavigate(); 
  
  const role = userProfile?.role || 'employee';
  const isSuperAdmin = role === 'super_admin';
  const canDelete = ['super_admin', 'admin'].includes(role); // Only Admins can delete

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState('All');
  
  // --- FORM STATE ---
  const [bookingType, setBookingType] = useState('lead'); 
  const [selectedLeadId, setSelectedLeadId] = useState('');
  const [loading, setLoading] = useState(false);
  const [editingAppt, setEditingAppt] = useState(null); 
  
  const initialFormState = {
    title: '',
    date: '',
    time: '10:00',
    duration: '60',
    type: 'In-Person',
    location: '',
    clientName: '',
    clientEmail: '',
    clientPhone: '',
    notes: '',
    status: 'Scheduled'
  };
  const [formData, setFormData] = useState(initialFormState);

  // --- SLOT AVAILABILITY CHECKER ---
  const slotStatus = useMemo(() => {
    if (!formData.date || !formData.time || !appointments) return null;
    
    const conflict = appointments.find(a => 
      a.id !== editingAppt?.id && 
      a.date === formData.date && 
      a.time === formData.time && 
      a.status !== 'Cancelled'
    );
    return conflict ? 'busy' : 'available';
  }, [formData.date, formData.time, appointments, editingAppt]);

  // --- HANDLERS ---
  const openCreateModal = () => {
    setEditingAppt(null);
    setFormData(initialFormState);
    setBookingType('lead');
    setIsModalOpen(true);
  };

  const openEditModal = (appt) => {
    setEditingAppt(appt);
    setFormData({
        title: appt.title || '',
        date: appt.date || '',
        time: appt.time || '',
        duration: appt.duration || '60',
        type: appt.type || 'In-Person',
        location: appt.location || '',
        clientName: appt.clientName || '',
        clientEmail: appt.clientEmail || '',
        clientPhone: appt.clientPhone || '',
        notes: appt.notes || '',
        status: appt.status || 'Scheduled'
    });
    setBookingType(appt.leadId ? 'lead' : 'walk-in');
    if(appt.leadId) setSelectedLeadId(appt.leadId);
    setIsModalOpen(true);
  };

  const handleStatusChange = async (id, newStatus) => {
    try {
        await updateDoc(doc(db, 'appointments', id), { status: newStatus });
    } catch (error) {
        console.error("Status Update Failed", error);
        alert("Failed to update status");
    }
  };

  const handleDelete = async (id) => {
    if (!canDelete) return alert("Access Denied: Only Admins can delete appointments.");
    if(!window.confirm("Are you sure you want to delete this appointment?")) return;
    try {
        await deleteDoc(doc(db, 'appointments', id));
    } catch (error) {
        console.error("Delete Failed", error);
        alert("Failed to delete");
    }
  };

  const handleLeadSelect = (e) => {
    const leadId = e.target.value;
    setSelectedLeadId(leadId);
    if (!leadId) return;

    const lead = leads.find(l => l.id === leadId);
    if (lead) {
      setFormData(prev => ({
        ...prev,
        clientName: lead.name,
        clientEmail: lead.email,
        clientPhone: lead.phone,
        location: lead.location || ''
      }));
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.clientName || !formData.date || !formData.clientEmail) {
      return alert("Name, Date, and Email are strictly required.");
    }

    if (slotStatus === 'busy') {
      if (!isSuperAdmin) {
          return alert("Slot Busy! Please choose another time. (Only Super Admin can override)");
      }
      if (!window.confirm("⚠️ Warning: This slot is already booked! Force Book (Override)?")) return;
    }

    setLoading(true);
    try {
      const appointmentPayload = {
        ...formData,
        leadId: bookingType === 'lead' ? selectedLeadId : null,
        ...(editingAppt ? { updatedAt: serverTimestamp() } : { createdAt: serverTimestamp(), createdBy: userProfile.uid, ticketId: `APT-${Date.now().toString().slice(-6)}` })
      };

      if (editingAppt) {
        await updateDoc(doc(db, 'appointments', editingAppt.id), appointmentPayload);
        alert("Appointment Updated Successfully!");
      } else {
        const docRef = await addDoc(collection(db, 'appointments'), appointmentPayload);
        
        if (bookingType === 'lead' && selectedLeadId) {
            const leadRef = doc(db, 'leads', selectedLeadId);
            await updateDoc(leadRef, {
              appointments: arrayUnion({ 
                id: docRef.id, 
                title: formData.title, 
                date: formData.date, 
                time: formData.time, 
                status: 'Scheduled' 
              })
            });
        }

        // Email logic (Optional)
        await addDoc(collection(db, 'mail'), {
            to: formData.clientEmail,
            message: {
              subject: `Appointment Confirmed: ${formData.title}`,
              html: `<div>Appointment Booked for ${formData.date} at ${formData.time}</div>`,
            },
        });
        alert(`Appointment Booked!`);
      }

      setIsModalOpen(false);
      setFormData(initialFormState);
      setSelectedLeadId('');
      setEditingAppt(null);
    } catch (error) {
      console.error("Operation Error:", error);
      alert("Failed to save appointment.");
    } finally {
      setLoading(false);
    }
  };

  const sortedAppointments = useMemo(() => {
    if (!appointments) return [];
    let data = appointments;
    if (filterStatus !== 'All') {
      data = data.filter(a => a.status === filterStatus);
    }
    return data.sort((a, b) => new Date(`${a.date}T${a.time}`) - new Date(`${b.date}T${b.time}`));
  }, [appointments, filterStatus]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 sm:p-6 font-sans">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white flex items-center gap-3">
            <Calendar className="text-indigo-600" size={28}/> Appointment Hub
            {isSuperAdmin && <span className="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded-full border border-amber-200"><Crown size={12} className="inline mr-1"/>Owner</span>}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Manage, Track & Control Schedules</p>
        </div>
        
        <div className="flex flex-wrap gap-3 w-full md:w-auto">
          <button 
            onClick={() => navigate('/admin/appointment-report')} 
            className="flex-1 md:flex-none justify-center bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border border-gray-300 dark:border-gray-600 px-4 py-2.5 rounded-xl font-bold hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2 transition-transform active:scale-95 shadow-sm text-sm"
          >
            <BarChart size={18} className="text-indigo-500"/> View Reports
          </button>

          <button 
            onClick={openCreateModal}
            className="flex-1 md:flex-none justify-center bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl font-bold shadow-lg shadow-indigo-500/30 flex items-center gap-2 transition-transform active:scale-95 text-sm"
          >
            <Plus size={18}/> New Booking
          </button>
        </div>
      </div>

      {/* FILTER TABS */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2 scrollbar-hide">
        {['All', 'Scheduled', 'Completed', 'Cancelled'].map(status => (
          <button 
            key={status}
            onClick={() => setFilterStatus(status)}
            className={`px-4 py-2 rounded-full text-xs sm:text-sm font-bold border transition-all whitespace-nowrap
              ${filterStatus === status 
                ? 'bg-indigo-600 text-white border-indigo-600' 
                : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:bg-gray-100'}`}
          >
            {status}
          </button>
        ))}
      </div>

      {/* APPOINTMENT GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
        <AnimatePresence>
          {sortedAppointments.map((appt, idx) => (
            <motion.div 
              key={appt.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-xl transition-shadow relative overflow-hidden flex flex-col justify-between"
            >
              {/* Top Row */}
              <div className="flex justify-between items-start mb-4">
                 <div className="flex items-start gap-3 min-w-0">
                    <div className="bg-indigo-50 dark:bg-indigo-900/30 p-3 rounded-2xl text-indigo-600 shrink-0">
                      <User size={20} />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-bold text-gray-800 dark:text-white text-lg truncate">{appt.clientName}</h3>
                      <div className="flex items-center gap-1 text-xs text-gray-500 mt-1 truncate">
                        <Mail size={10}/> {appt.clientEmail}
                      </div>
                    </div>
                 </div>
                 
                 <div className="relative">
                    <select 
                      value={appt.status} 
                      onChange={(e) => handleStatusChange(appt.id, e.target.value)}
                      className={`text-[10px] uppercase font-bold py-1 px-2 rounded-lg border-none outline-none cursor-pointer appearance-none text-center
                        ${appt.status === 'Scheduled' ? 'bg-indigo-100 text-indigo-700' : 
                          appt.status === 'Completed' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}
                    >
                      <option value="Scheduled">Scheduled</option>
                      <option value="Completed">Completed</option>
                      <option value="Cancelled">Cancelled</option>
                    </select>
                 </div>
              </div>

              {/* Details */}
              <div className="space-y-3 border-t border-b border-gray-100 dark:border-gray-700 py-4 mb-4">
                <div className="flex justify-between items-center text-sm">
                  <span className="flex items-center gap-2 text-gray-500"><Calendar size={14}/> Date</span>
                  <span className="font-bold text-gray-800 dark:text-gray-200">{formatDate(appt.date)}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="flex items-center gap-2 text-gray-500"><Clock size={14}/> Time</span>
                  <span className="font-bold text-gray-800 dark:text-gray-200">{appt.time} <span className="text-xs font-normal text-gray-400">({appt.duration}m)</span></span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="flex items-center gap-2 text-gray-500">
                    {appt.type === 'Online' ? <Video size={14}/> : <MapPin size={14}/>} Type
                  </span>
                  <span className="font-bold text-gray-800 dark:text-gray-200">{appt.type}</span>
                </div>
                {appt.notes && (
                   <div className="text-xs text-gray-500 italic bg-gray-50 dark:bg-gray-700/50 p-2 rounded">"{appt.notes}"</div>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                 <button 
                    onClick={() => openEditModal(appt)}
                    className="flex-1 py-2 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs font-bold hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors flex items-center justify-center gap-2"
                 >
                    <Edit2 size={14}/> Edit / Reschedule
                 </button>
                 {canDelete && (
                     <button 
                        onClick={() => handleDelete(appt.id)}
                        className="py-2 px-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-xs font-bold hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors"
                        title="Delete"
                     >
                        <Trash2 size={16}/>
                     </button>
                 )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        
        {sortedAppointments.length === 0 && (
          <div className="col-span-full py-20 text-center text-gray-400">
            <Calendar size={48} className="mx-auto mb-4 opacity-30"/>
            <p>No appointments found for this filter.</p>
          </div>
        )}
      </div>

      {/* MODAL */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-gray-800 w-full md:w-[95%] max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="p-5 bg-indigo-600 flex justify-between items-center text-white">
                <h2 className="text-lg font-bold flex items-center gap-2">
                    {editingAppt ? <Edit2 size={24}/> : <Plus size={24}/>} 
                    {editingAppt ? 'Edit Appointment' : 'New Appointment'}
                </h2>
                <button onClick={() => setIsModalOpen(false)} className="hover:bg-indigo-700 p-1 rounded-full"><X size={24}/></button>
              </div>

              <div className="p-5 overflow-y-auto custom-scrollbar space-y-5">
                {/* 1. Client Selection */}
                <div className="bg-gray-50 dark:bg-gray-700/30 p-4 rounded-xl border border-gray-200 dark:border-gray-600">
                  <div className="flex flex-col sm:flex-row gap-3 mb-4">
                    <button onClick={() => setBookingType('lead')} disabled={!!editingAppt} className={`flex-1 py-2 rounded-lg text-sm font-bold border transition-colors ${bookingType === 'lead' ? 'bg-indigo-100 text-indigo-700 border-indigo-300' : 'bg-white border-gray-300 text-gray-500'} ${editingAppt && 'opacity-50 cursor-not-allowed'}`}>Existing Lead</button>
                    <button onClick={() => { setBookingType('walk-in'); setSelectedLeadId(''); if(!editingAppt) setFormData(prev => ({...prev, clientName: '', clientEmail: ''})); }} disabled={!!editingAppt} className={`flex-1 py-2 rounded-lg text-sm font-bold border transition-colors ${bookingType === 'walk-in' ? 'bg-indigo-100 text-indigo-700 border-indigo-300' : 'bg-white border-gray-300 text-gray-500'} ${editingAppt && 'opacity-50 cursor-not-allowed'}`}>New Walk-in</button>
                  </div>
                  {bookingType === 'lead' && (
                    <div className="relative">
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Search Lead</label>
                      <select className="input-std w-full" onChange={handleLeadSelect} value={selectedLeadId} disabled={!!editingAppt}>
                        <option value="">-- Select a Lead --</option>
                        {leads?.map(l => ( <option key={l.id} value={l.id}>{l.name} ({l.phone})</option> ))}
                      </select>
                    </div>
                  )}
                </div>

                {/* 2. Basic Info */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Client Name *</label><input className="input-std w-full" value={formData.clientName} onChange={e => setFormData({...formData, clientName: e.target.value})} disabled={bookingType === 'lead'} /></div>
                  <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Client Email (Notify) *</label><input type="email" className="input-std w-full" value={formData.clientEmail} onChange={e => setFormData({...formData, clientEmail: e.target.value})} disabled={bookingType === 'lead' && formData.clientEmail !== ''} /></div>
                </div>

                {/* 3. Schedule */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                   <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Date *</label><input type="date" className="input-std w-full" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} /></div>
                   <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Time *</label>
                    <input type="time" className={`input-std w-full ${slotStatus === 'busy' ? 'border-red-500 text-red-600' : ''}`} value={formData.time} onChange={e => setFormData({...formData, time: e.target.value})} />
                    <div className="h-5 mt-1">
                        {slotStatus === 'available' && <span className="text-[10px] font-bold text-green-600 flex items-center gap-1"><CheckCircle size={10}/> Available</span>}
                        {slotStatus === 'busy' && <span className="text-[10px] font-bold text-red-500 flex items-center gap-1">⚠️ Busy</span>}
                    </div>
                   </div>
                   <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Duration</label><select className="input-std w-full" value={formData.duration} onChange={e => setFormData({...formData, duration: e.target.value})}><option value="15">15 Mins</option><option value="30">30 Mins</option><option value="60">1 Hour</option><option value="90">1.5 Hours</option></select></div>
                </div>
                
                {/* 4. Type & Notes */}
                <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Purpose / Title</label><input className="input-std w-full" placeholder="e.g. Consultation" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} /></div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                   <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Type</label><select className="input-std w-full" value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})}><option>In-Person</option><option>Online (Video)</option><option>Phone Call</option></select></div>
                   <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Location / Link</label><input className="input-std w-full" placeholder="e.g. Office / Zoom" value={formData.location} onChange={e => setFormData({...formData, location: e.target.value})} /></div>
                </div>
                <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Notes (Optional)</label><textarea className="input-std w-full" placeholder="Any special requests..." rows={2} value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} /></div>
                
                {/* Status (Only in Edit Mode) */}
                {editingAppt && (
                    <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Status</label><select className="input-std w-full bg-gray-50" value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})}><option>Scheduled</option><option>Completed</option><option>Cancelled</option></select></div>
                )}
              </div>

              <div className="p-5 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/30 flex justify-end gap-3 rounded-b-2xl">
                <button onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 text-gray-500 font-bold hover:text-gray-700 text-sm">Cancel</button>
                <button onClick={handleSave} disabled={loading} className="px-6 py-2.5 bg-indigo-600 text-white rounded-lg font-bold shadow-md hover:bg-indigo-700 flex items-center gap-2 text-sm">{loading ? 'Processing...' : <><CheckCircle size={16}/> {editingAppt ? 'Update Changes' : 'Confirm Booking'}</>}</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <style>{`
        .input-std { width: 100%; padding: 0.75rem; border-radius: 0.5rem; border: 1px solid #e5e7eb; background-color: white; outline: none; transition: all 0.2s; }
        .dark .input-std { background-color: #1f2937; border-color: #374151; color: white; }
        .input-std:focus { border-color: #6366f1; box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1); }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
};

export default Appointment;