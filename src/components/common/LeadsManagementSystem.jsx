// src/pages/admin/LeadsManagementSystem.jsx

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
    Users, Search, Download, ShieldCheck, Lock, Check, X, 
    Phone, MapPin, Plus, Trash2, Edit2, Save, Upload,
    Activity, FileText, Calendar, Truck, Package, ArrowLeft, Clock, DollarSign, 
    Cake, Send, Crown, AlertCircle, Grid, List, Image as ImageIcon, Tag, UserPlus, Layers,
    Filter, MoreHorizontal, ChevronRight, ArrowUpDown, Menu, Globe
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom'; 

import { useAuth } from '../../context/AuthContext'; 
import { useCollection } from '../../hooks/useCollection';
import { doc, getDoc, setDoc, addDoc, updateDoc, deleteDoc, collection, serverTimestamp, arrayUnion, onSnapshot, query, where, getDocs } from 'firebase/firestore'; 
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../../Firebase'; 

// --- UPDATED: COMPREHENSIVE COUNTRY CODES LIST ---
const COUNTRY_CODES = [
    { code: "+91", label: "🇮🇳 India (+91)", limit: 10 },
    { code: "+1", label: "🇺🇸 USA (+1)", limit: 10 },
    { code: "+1", label: "🇨🇦 Canada (+1)", limit: 10 },
    { code: "+44", label: "🇬🇧 UK (+44)", limit: 11 },
    { code: "+971", label: "🇦🇪 UAE (+971)", limit: 9 },
    { code: "+61", label: "🇦🇺 Australia (+61)", limit: 9 },
    { code: "+49", label: "🇩🇪 Germany (+49)", limit: 11 },
    { code: "+33", label: "🇫🇷 France (+33)", limit: 9 },
    { code: "+81", label: "🇯🇵 Japan (+81)", limit: 10 },
    { code: "+86", label: "🇨🇳 China (+86)", limit: 11 },
    { code: "+7", label: "🇷🇺 Russia (+7)", limit: 10 },
    { code: "+55", label: "🇧🇷 Brazil (+55)", limit: 11 },
    { code: "+27", label: "🇿🇦 South Africa (+27)", limit: 9 },
    { code: "+966", label: "🇸🇦 Saudi Arabia (+966)", limit: 9 },
    { code: "+92", label: "🇵🇰 Pakistan (+92)", limit: 10 },
    { code: "+880", label: "🇧🇩 Bangladesh (+880)", limit: 10 },
    { code: "+977", label: "🇳🇵 Nepal (+977)", limit: 10 },
    { code: "+94", label: "🇱🇰 Sri Lanka (+94)", limit: 9 },
    { code: "+65", label: "🇸🇬 Singapore (+65)", limit: 8 },
    { code: "+60", label: "🇲🇾 Malaysia (+60)", limit: 10 },
    { code: "+64", label: "🇳🇿 New Zealand (+64)", limit: 9 },
    { code: "+39", label: "🇮🇹 Italy (+39)", limit: 10 },
    { code: "+34", label: "🇪🇸 Spain (+34)", limit: 9 },
    { code: "+31", label: "🇳🇱 Netherlands (+31)", limit: 9 },
    { code: "+41", label: "🇨🇭 Switzerland (+41)", limit: 9 },
    { code: "+46", label: "🇸🇪 Sweden (+46)", limit: 9 },
    { code: "+353", label: "🇮🇪 Ireland (+353)", limit: 9 },
    { code: "+20", label: "🇪🇬 Egypt (+20)", limit: 10 },
    { code: "+234", label: "🇳🇬 Nigeria (+234)", limit: 10 },
    { code: "+254", label: "🇰🇪 Kenya (+254)", limit: 9 },
    { code: "+62", label: "🇮🇩 Indonesia (+62)", limit: 11 },
    { code: "+63", label: "🇵🇭 Philippines (+63)", limit: 10 },
    { code: "+66", label: "🇹🇭 Thailand (+66)", limit: 9 },
    { code: "+84", label: "🇻🇳 Vietnam (+84)", limit: 9 },
    { code: "+90", label: "🇹🇷 Turkey (+90)", limit: 10 },
    { code: "+98", label: "🇮🇷 Iran (+98)", limit: 10 },
    { code: "+972", label: "🇮🇱 Israel (+972)", limit: 9 },
    { code: "+30", label: "🇬🇷 Greece (+30)", limit: 10 },
    { code: "+351", label: "🇵🇹 Portugal (+351)", limit: 9 },
    { code: "+48", label: "🇵🇱 Poland (+48)", limit: 9 },
    { code: "+420", label: "🇨🇿 Czech Republic (+420)", limit: 9 },
    { code: "+36", label: "🇭🇺 Hungary (+36)", limit: 9 },
    { code: "+43", label: "🇦🇹 Austria (+43)", limit: 10 },
    { code: "+32", label: "🇧🇪 Belgium (+32)", limit: 9 },
    { code: "+45", label: "🇩🇰 Denmark (+45)", limit: 8 },
    { code: "+358", label: "🇫🇮 Finland (+358)", limit: 10 },
    { code: "+47", label: "🇳🇴 Norway (+47)", limit: 8 },
    { code: "+52", label: "🇲🇽 Mexico (+52)", limit: 10 },
    { code: "+54", label: "🇦🇷 Argentina (+54)", limit: 10 },
    { code: "+56", label: "🇨🇱 Chile (+56)", limit: 9 },
    { code: "+57", label: "🇨🇴 Colombia (+57)", limit: 10 },
    { code: "+51", label: "🇵🇪 Peru (+51)", limit: 9 },
    { code: "+58", label: "🇻🇪 Venezuela (+58)", limit: 10 },
    // Generic Fallback
    { code: "", label: "🌍 Other", limit: 15 } 
].sort((a, b) => a.label.localeCompare(b.label)); // Sort alphabetically for better UX

// --- UTILS ---
const formatCurrency = (amount) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount || 0);

const parseDate = (dateVal) => {
    if (!dateVal) return null;
    if (typeof dateVal === 'string') return new Date(dateVal);
    if (dateVal.toDate) return dateVal.toDate(); 
    return new Date(dateVal);
};

const formatDate = (dateVal) => {
    const date = parseDate(dateVal);
    return date ? date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '-';
};

// 🔥 UPDATED CHANGE LOG LOGIC (Deep Compare)
const generateChangeLog = (oldData, newData) => {
  const changes = [];
  const ignoredKeys = ['history', 'appointments', 'createdAt', 'createdBy', 'id', 'receivedAmount', 'paymentHistory', 'updatedAt', 'followUps', 'photos', 'products', 'phoneNumbers'];

  // 1. Basic Fields Compare
  Object.keys(newData).forEach(key => {
    if (ignoredKeys.includes(key)) return;
    const oldVal = (oldData[key] || '').toString().trim();
    const newVal = (newData[key] || '').toString().trim();

    if (oldVal !== newVal) {
       const label = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
       changes.push(`${label}: ${oldVal || 'Empty'} ➝ ${newVal || 'Empty'}`);
    }
  });

  // 2. Phone Numbers Compare
  const oldPhones = oldData.phoneNumbers || [];
  const newPhones = newData.phoneNumbers || [];
  if (JSON.stringify(oldPhones) !== JSON.stringify(newPhones)) {
      changes.push(`Phone Numbers Updated`);
  }

  // 3. Product Specific Compare
  const oldProds = oldData.products || [];
  const newProds = newData.products || [];

  if (oldProds.length !== newProds.length) {
      changes.push(`Products Count: ${oldProds.length} ➝ ${newProds.length}`);
  } else {
      newProds.forEach((newP, i) => {
          const oldP = oldProds[i] || {};
          Object.keys(newP).forEach(k => {
              if (k === 'id') return;
              if(k === 'ornamentReady') {
                  if(oldP[k] !== newP[k]) {
                      changes.push(`Item ${i+1} Status: ${oldP[k]?'Ready':'Process'} ➝ ${newP[k]?'Ready':'Process'}`);
                  }
                  return;
              }
              const vOld = (oldP[k] || '').toString().trim();
              const vNew = (newP[k] || '').toString().trim();
              if (vOld !== vNew) {
                  const label = k.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
                  changes.push(`Item ${i+1} ${label}: ${vOld || 'Empty'} ➝ ${vNew}`);
              }
          });
      });
  }

  return changes.length > 0 ? changes.join('\n') : "Details updated";
};

const slideInRight = { hidden: { x: '100%', opacity: 0 }, visible: { x: 0, opacity: 1, transition: { type: 'spring', damping: 30, stiffness: 300 } }, exit: { x: '100%', opacity: 0 } };
const fadeIn = { hidden: { opacity: 0, scale: 0.95 }, visible: { opacity: 1, scale: 1, transition: { duration: 0.2 } }, exit: { opacity: 0, scale: 0.95 } };

// =================================================================================================
// 🛡️ ACCESS MANAGEMENT MODAL
// =================================================================================================
const AccessManagementModal = ({ isOpen, onClose, allUsers, allowedUserIds, onToggleAccess }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[70] p-4">
            <motion.div variants={fadeIn} initial="hidden" animate="visible" exit="exit" className="bg-white dark:bg-gray-800 w-full max-w-lg rounded-3xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden flex flex-col max-h-[80vh]">
                <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50/50 dark:bg-gray-700/50">
                    <h2 className="text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2">
                        <ShieldCheck className="text-amber-500"/> Manage Access
                    </h2>
                    <button onClick={onClose} className="p-2 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-full"><X size={18}/></button>
                </div>
                <div className="p-6 overflow-y-auto custom-scrollbar">
                    <p className="text-sm text-gray-500 mb-4">Select users who can access the Leads System.</p>
                    <div className="space-y-3">
                        {allUsers?.map(user => {
                            const hasAccess = allowedUserIds.includes(user.id);
                            return (
                                <div key={user.id} className="flex justify-between items-center p-3 rounded-xl border border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                    <div className="flex items-center gap-3">
                                        <div className="h-8 w-8 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center text-indigo-700 dark:text-indigo-300 font-bold text-xs">
                                            {user.name?.charAt(0).toUpperCase()}
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-gray-800 dark:text-gray-200">{user.name}</p>
                                            <p className="text-xs text-gray-400">{user.role}</p>
                                        </div>
                                    </div>
                                    <button 
                                        onClick={() => onToggleAccess(user.id)}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${hasAccess ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                                    >
                                        {hasAccess ? 'Allowed' : 'Denied'}
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

// =================================================================================================
// 🎂 BIRTHDAY REPORT MODAL
// =================================================================================================
const BirthdayReportModal = ({ isOpen, onClose, leads }) => {
    if (!isOpen) return null;

    const { upcoming, recent } = useMemo(() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const upcomingList = [];
        const recentList = [];

        leads?.forEach(lead => {
            const dobDate = parseDate(lead.dob); 
            if (!dobDate || isNaN(dobDate)) return;
            
            const currentYearBday = new Date(today.getFullYear(), dobDate.getMonth(), dobDate.getDate());
            const diffTime = currentYearBday - today;
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            if (diffDays >= 0 && diffDays <= 7) {
                upcomingList.push({ ...lead, daysLeft: diffDays });
            } else if (diffDays >= -7 && diffDays < 0) {
                recentList.push({ ...lead, daysAgo: Math.abs(diffDays) });
            }
        });

        return { upcoming: upcomingList, recent: recentList };
    }, [leads]);

    const handleExportBirthdays = () => {
        const data = [
            ...upcoming.map(l => ({ Type: "Upcoming", Name: l.name, Phone: l.phone, DOB: formatDate(l.dob), Status: `In ${l.daysLeft} days` })),
            ...recent.map(l => ({ Type: "Past", Name: l.name, Phone: l.phone, DOB: formatDate(l.dob), Status: `${l.daysAgo} days ago` }))
        ];
        
        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Birthdays");
        XLSX.writeFile(wb, "Birthday_Report.xlsx");
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[70] p-0 md:p-4">
           <motion.div variants={fadeIn} initial="hidden" animate="visible" exit="exit" className="bg-white dark:bg-gray-900 w-full md:w-[600px] h-full md:h-auto md:rounded-3xl md:shadow-2xl border-0 md:border border-gray-200 dark:border-gray-800 flex flex-col md:max-h-[85vh] overflow-hidden">
              <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-gradient-to-r from-rose-50 to-pink-50 dark:from-rose-900/20 dark:to-pink-900/20 shrink-0">
                  <h2 className="text-xl font-bold text-rose-600 dark:text-rose-400 flex items-center gap-2"><Cake size={24} className="animate-bounce"/> Birthday Reminders</h2>
                  <button onClick={onClose} className="p-2 bg-white dark:bg-gray-800 rounded-full shadow-sm hover:scale-110 transition-transform"><X size={18} className="text-gray-500"/></button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-6 custom-scrollbar space-y-8">
                  {/* Upcoming Section */}
                  <div>
                      <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                          <Calendar size={14}/> Upcoming (Next 7 Days)
                      </h3>
                      {upcoming.length === 0 ? <div className="p-8 text-center bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-dashed border-gray-200 dark:border-gray-700 text-gray-400 text-sm">No upcoming birthdays this week.</div> : (
                        <div className="grid gap-3">
                           {upcoming.map(l => (
                               <div key={l.id} className="flex justify-between items-center p-4 bg-emerald-50/50 dark:bg-emerald-900/10 rounded-2xl border border-emerald-100 dark:border-emerald-800/50 hover:shadow-md transition-all">
                                  <div className="flex items-center gap-3">
                                     <div className="h-10 w-10 rounded-full bg-emerald-100 dark:bg-emerald-800 flex items-center justify-center text-emerald-600 dark:text-emerald-300 font-bold">{l.name.charAt(0)}</div>
                                     <div>
                                        <p className="font-bold text-gray-800 dark:text-gray-200">{l.name}</p>
                                        <p className="text-xs text-gray-500 font-medium">{formatDate(l.dob)} • {l.phone}</p>
                                     </div>
                                  </div>
                                  <span className="text-xs font-bold bg-white dark:bg-gray-800 px-3 py-1.5 rounded-full shadow-sm text-emerald-600 border border-emerald-100">
                                     {l.daysLeft === 0 ? "Today! 🎂" : `In ${l.daysLeft} days`}
                                  </span>
                               </div>
                           ))}
                        </div>
                      )}
                  </div>

                  {/* Past Section */}
                  <div>
                      <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                          <Clock size={14}/> Recent Past
                      </h3>
                      {recent.length === 0 ? <p className="text-sm text-gray-400 italic">No recent birthdays.</p> : (
                        <div className="grid gap-3">
                           {recent.map(l => (
                               <div key={l.id} className="flex justify-between items-center p-4 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-gray-100 dark:border-gray-800 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                                  <div className="flex items-center gap-3 opacity-75">
                                     <div className="h-10 w-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-gray-500 font-bold">{l.name.charAt(0)}</div>
                                     <div>
                                        <p className="font-bold text-gray-800 dark:text-gray-200">{l.name}</p>
                                        <p className="text-xs text-gray-500">{formatDate(l.dob)}</p>
                                     </div>
                                  </div>
                                  <span className="text-xs font-bold text-orange-500 bg-orange-50 dark:bg-orange-900/20 px-3 py-1 rounded-full">
                                     {l.daysAgo} days ago
                                  </span>
                               </div>
                           ))}
                        </div>
                      )}
                  </div>
              </div>

              <div className="p-5 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 flex justify-end shrink-0">
                  <button onClick={handleExportBirthdays} className="flex items-center gap-2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 px-6 py-2.5 rounded-xl font-bold shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all active:scale-95">
                     <Download size={18}/> Export List
                  </button>
              </div>
           </motion.div>
        </div>
    );
};


// =================================================================================================
// 🎨 LEAD DETAIL VIEW
// =================================================================================================
const LeadDetailView = ({ lead, onClose, onEdit, onExportSingle, onDelete, canManage, userProfile, allUsers }) => {
    if (!lead) return null;
    const totalRec = lead.paymentHistory?.reduce((sum, p) => sum + (parseFloat(p.amount)||0), 0) || 0;
    const netAmount = ((parseFloat(lead.productAmount)||0) + (parseFloat(lead.makingCharges)||0)) - (parseFloat(lead.discount)||0);
    const due = netAmount - totalRec;

    const [newNote, setNewNote] = useState('');
    const [isSendingNote, setIsSendingNote] = useState(false);
    
    // Tagging Logic
    const handleAddNote = async () => {
        if (!newNote.trim()) return;
        setIsSendingNote(true);
        try {
            const isTag = newNote.includes('@'); 
            const noteData = {
                message: newNote,
                date: new Date(),
                by: userProfile?.name || 'User',
                isTag: isTag 
            };
            const leadRef = doc(db, 'leads', lead.id);
            await updateDoc(leadRef, { followUps: arrayUnion(noteData) });
            setNewNote('');
        } catch (error) {
            console.error("Error adding note:", error);
            alert("Failed to add note.");
        } finally {
            setIsSendingNote(false);
        }
    };

    const handlePhotoUpload = (e) => {
        const file = e.target.files[0];
        if(!file) return;
        console.warn("⚠️ [System] Image Upload is temporarily disabled. Upgrade Firebase Plan to Blaze to enable Storage bucket.");
        alert("🖼️ Image upload is currently disabled pending storage configuration.\nCheck console for details.");
        e.target.value = null; 
    };

    const assigneeName = allUsers?.find(u => u.id === lead.assignedTo)?.name || 'Unassigned';

    return (
        <motion.div variants={slideInRight} initial="hidden" animate="visible" exit="exit" className="fixed inset-0 z-50 bg-gray-100 dark:bg-gray-900 flex flex-col shadow-2xl overflow-hidden">
           {/* Detail Header */}
           <div className="bg-white dark:bg-gray-800 px-4 md:px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 sticky top-0 z-20 shadow-sm shrink-0">
              <div className="flex items-center gap-4 w-full md:w-auto">
                 <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"><ArrowLeft size={24}/></button>
                 <div className="flex-1">
                    <h1 className="text-xl md:text-2xl font-black text-gray-900 dark:text-white flex items-center gap-3 flex-wrap">
                       {lead.name}
                       <span className={`text-xs px-3 py-1 rounded-full font-bold uppercase tracking-wider ${lead.status === 'Converted' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'}`}>{lead.status}</span>
                    </h1>
                    <div className="text-xs text-gray-500 dark:text-gray-400 flex flex-wrap gap-x-4 gap-y-2 mt-1 font-medium items-center">
                        <span className="flex items-center gap-1 bg-gray-50 dark:bg-gray-700/50 px-2 py-1 rounded-md"><Phone size={12}/> {lead.phoneNumbers ? lead.phoneNumbers.join(', ') : lead.phone}</span>
                        <span className="flex items-center gap-1 bg-gray-50 dark:bg-gray-700/50 px-2 py-1 rounded-md"><MapPin size={12}/> {lead.location}</span>
                        <span className="flex items-center gap-1 text-indigo-600 bg-indigo-50 dark:bg-indigo-900/30 px-2 py-1 rounded-md border border-indigo-100 dark:border-indigo-800"><UserPlus size={12}/> {assigneeName}</span>
                    </div>
                 </div>
              </div>
              <div className="flex gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0 hide-scrollbar">
                 {canManage && (
                    <button onClick={() => onDelete(lead.id)} className="flex-1 md:flex-none justify-center px-4 py-2 bg-white text-rose-600 border border-rose-200 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-rose-50 transition-colors whitespace-nowrap">
                       <Trash2 size={16}/> Delete
                    </button>
                 )}
                 <button onClick={() => onExportSingle(lead)} className="flex-1 md:flex-none justify-center px-4 py-2 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors whitespace-nowrap"><Download size={16}/> Export</button>
                 <button onClick={() => onEdit(lead)} className="flex-1 md:flex-none justify-center px-5 py-2 bg-indigo-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-indigo-200 dark:shadow-none flex items-center gap-2 hover:bg-indigo-700 active:scale-95 transition-all whitespace-nowrap"><Edit2 size={16}/> Edit</button>
              </div>
           </div>

           <div className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar bg-gray-50/50 dark:bg-gray-900">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 max-w-[1600px] mx-auto">
                 {/* LEFT COLUMN */}
                 <div className="lg:col-span-8 space-y-6">
                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                       <StatCard label="Lead Date" value={formatDate(lead.leadGenDate)} icon={Calendar} />
                       <StatCard label="Confirmation" value={formatDate(lead.confirmationDate)} icon={Check} color="text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 border-emerald-100"/>
                       <StatCard label="Delivery" value={formatDate(lead.deliveryDate)} icon={Truck} color="text-blue-600 bg-blue-50 dark:bg-blue-900/20 border-blue-100"/>
                       <StatCard label="Conv. Prob." value={`${lead.conversionProbability}%`} icon={Activity} color="text-purple-600 bg-purple-50 dark:bg-purple-900/20 border-purple-100"/>
                    </div>
                    
                    {/* Products Card */}
                    <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 md:p-8 relative overflow-hidden">
                       <div className="absolute top-0 right-0 p-12 opacity-5 bg-gradient-to-bl from-indigo-600 to-purple-600 rounded-bl-full w-40 h-40 blur-3xl pointer-events-none"></div>
                       <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-6 flex items-center gap-2"><Package size={14}/> Product Specification</h3>
                       
                       {lead.products && lead.products.length > 0 ? (
                           <div className="space-y-4 relative z-10">
                               {lead.products.map((prod, idx) => (
                                   <div key={idx} className="p-5 bg-gray-50 dark:bg-gray-700/30 rounded-2xl border border-gray-100 dark:border-gray-700/50 hover:border-indigo-100 transition-colors">
                                       <div className="flex justify-between items-start mb-4 border-b border-gray-200 dark:border-gray-600 pb-2">
                                            <h4 className="font-bold text-indigo-700 dark:text-indigo-300 text-base">{prod.type}</h4>
                                            <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${prod.ornamentReady ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                                                 {prod.ornamentReady ? 'Ready' : 'In Process'}
                                            </span>
                                       </div>
                                       <div className="grid grid-cols-2 md:grid-cols-4 gap-y-4 gap-x-8 text-xs">
                                            <DetailRow label="Item" value={prod.particulars} />
                                            <DetailRow label="Metal" value={prod.metal} />
                                            <DetailRow label="Weight" value={`${prod.weight} ${prod.unit}`} highlight />
                                            <DetailRow label="Size" value={prod.size} />
                                            <DetailRow label="SKU" value={prod.skuNo} fontMono />
                                            <DetailRow label="Cert No." value={prod.certificateNo} />
                                            <DetailRow label="Lab Name" value={prod.labName} />
                                            <DetailRow label="Jeweller" value={prod.jewellerName} />
                                            <DetailRow label="Phy ID" value={prod.physicalIdentificationNo} fontMono /> 
                                            <DetailRow label="Rate" value={prod.unitRate} />
                                       </div>
                                   </div>
                               ))}
                           </div>
                       ) : (
                           <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-y-6 gap-x-8 text-sm relative z-10">
                              <DetailRow label="Particular" value={lead.particular} />
                              <DetailRow label="Type / Metal" value={`${lead.type} / ${lead.metal}`} />
                              <DetailRow label="Gender" value={lead.gender} />
                              <DetailRow label="Weight" value={`${lead.weight} ${lead.unit}`} highlight />
                              <DetailRow label="Size" value={lead.size} />
                              <DetailRow label="SKU No." value={lead.skuNo} fontMono />
                              <DetailRow label="Certificate" value={lead.certificateNo} />
                              <DetailRow label="Lab Name" value={lead.labName} /> 
                              <DetailRow label="Jeweller" value={lead.jewellerName} />
                              <DetailRow label="Status" value={lead.ornamentReady ? "Ready" : "Process"} color={lead.ornamentReady ? "text-emerald-600" : "text-amber-500"} />
                           </div>
                       )}
                    </div>
                    
                    {/* Photos & Financials Row */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Photos */}
                        <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 flex flex-col">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2"><ImageIcon size={14}/> Photos</h3>
                                <label className="cursor-pointer flex items-center gap-1 text-xs font-bold text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-lg hover:bg-indigo-100 transition-colors">
                                    <Upload size={14}/> Upload
                                    <input type="file" hidden accept="image/*" onChange={handlePhotoUpload} />
                                </label>
                            </div>
                            <div className="grid grid-cols-3 gap-3 flex-1 content-start">
                                {lead.photos?.map((pic, i) => (
                                    <a href={pic.url} target="_blank" rel="noreferrer" key={i} className="aspect-square rounded-xl bg-gray-100 border overflow-hidden relative group shadow-sm hover:shadow-md transition-all">
                                        <img src={pic.url} alt="Delivered" className="w-full h-full object-cover" />
                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-bold">View</div>
                                    </a>
                                ))}
                                {(!lead.photos || lead.photos.length === 0) && (
                                    <div className="col-span-3 flex flex-col items-center justify-center h-32 border-2 border-dashed border-gray-100 rounded-xl text-gray-300 text-xs">
                                        <ImageIcon size={24} className="mb-2 opacity-50"/>
                                        No photos uploaded
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Financials Summary */}
                        <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                           <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-6 flex items-center gap-2"><DollarSign size={14}/> Financials</h3>
                           <div className="space-y-3">
                                 <div className="flex justify-between text-sm p-3 rounded-xl bg-gray-50 dark:bg-gray-700/30"><span>Product Amount</span> <span className="font-bold">{formatCurrency(lead.productAmount)}</span></div>
                                 <div className="flex justify-between text-sm p-3 rounded-xl bg-gray-50 dark:bg-gray-700/30"><span>Making Charges</span> <span className="font-bold">{formatCurrency(lead.makingCharges)}</span></div>
                                 <div className="flex justify-between text-sm p-3 rounded-xl bg-rose-50 text-rose-600 border border-rose-100"><span>Discount</span> <span>- {formatCurrency(lead.discount)}</span></div>
                                 <div className="flex justify-between text-lg font-black border-t-2 border-dashed border-gray-100 pt-4 mt-2"><span>Net Payable</span> <span className="text-indigo-600">{formatCurrency(netAmount)}</span></div>
                           </div>
                        </div>
                    </div>

                    {/* Payment History Full Width */}
                    <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                         <h4 className="text-xs font-bold text-gray-400 uppercase mb-4 tracking-wider flex items-center gap-2"><List size={14}/> Payment History</h4>
                         <div className="space-y-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar mb-4">
                            {lead.paymentHistory?.map((p, i) => (
                               <div key={i} className="flex justify-between text-sm bg-gray-50 dark:bg-gray-700/30 p-3 rounded-xl border border-gray-100 dark:border-gray-700 items-center">
                                  <div className="flex items-center gap-3">
                                      <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600"><Check size={14}/></div>
                                      <span className="font-mono text-gray-500">{formatDate(p.date)} • {p.mode}</span> 
                                  </div>
                                  <span className="font-bold text-emerald-600">{formatCurrency(p.amount)}</span>
                               </div>
                            ))}
                            {!lead.paymentHistory?.length && <div className="text-center text-xs text-gray-400 py-6 italic">No payments recorded yet</div>}
                         </div>
                         <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-2xl flex justify-between font-bold items-center border border-gray-100 dark:border-gray-700">
                             <span className="text-xs uppercase text-gray-500">Balance Due</span>
                             <span className={`text-xl ${due > 0 ? 'text-rose-500' : 'text-emerald-500'}`}>{formatCurrency(due)}</span>
                         </div>
                    </div>
                 </div>
                 
                 {/* RIGHT COLUMN */}
                 <div className="lg:col-span-4 space-y-6">
                    <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm">
                       <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2"><Users size={14}/> Client Info</h3>
                       <div className="space-y-4 text-sm">
                          <DetailRow label="DOB" value={formatDate(lead.dob)} highlight />
                          <DetailRow label="Source" value={lead.source} />
                          {lead.sourceDetails && <DetailRow label="Source Details" value={lead.sourceDetails} />}
                          <DetailRow label="Email" value={lead.email} />
                          {lead.remarks && <div className="p-4 bg-amber-50 text-xs text-amber-800 rounded-xl border border-amber-100 mt-2 leading-relaxed"><strong>Note:</strong> {lead.remarks}</div>}
                       </div>
                    </div>

                    <div className="bg-gradient-to-br from-slate-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 rounded-3xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm">
                       <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4 flex items-center gap-2"><Truck size={14}/> Logistics</h3>
                       <div className="space-y-4 text-sm">
                          <DetailRow label="Courier" value={lead.courierCompany} />
                          <DetailRow label="Docket No" value={lead.courierDocket} fontMono />
                          <DetailRow label="Sent Date" value={formatDate(lead.courierDate)} />
                          <DetailRow label="Invoice No" value={lead.invoiceNo} fontMono />
                          <div className="pt-4">
                              <span className={`block text-center text-xs font-bold py-3 rounded-xl border shadow-sm ${lead.leadClose ? 'bg-rose-50 text-rose-600 border-rose-200' : 'bg-emerald-50 text-emerald-600 border-emerald-200'}`}>
                                  {lead.leadClose ? '🔴 LEAD CLOSED' : '🟢 LEAD OPEN'}
                              </span>
                          </div>
                       </div>
                    </div>

                    {/* Follow Up & Notes */}
                    <div className="bg-amber-50/60 dark:bg-gray-800 rounded-3xl shadow-sm border border-amber-100 dark:border-gray-700 p-5 flex flex-col h-[450px]">
                       <h3 className="text-xs font-bold text-amber-600 dark:text-amber-500 uppercase mb-3 flex items-center gap-2"><FileText size={14}/> Follow Ups</h3>
                       
                       <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3 pr-2 mb-3">
                          {lead.followUps?.length > 0 ? (
                              lead.followUps.slice().reverse().map((note, i) => (
                                 <div key={i} className={`p-3 rounded-xl border shadow-sm ${note.isTag ? 'bg-white border-indigo-200 shadow-indigo-100' : 'bg-white border-amber-100/50'}`}>
                                    <p className="text-sm text-gray-700 dark:text-gray-200 whitespace-pre-wrap break-words leading-relaxed">
                                        {note.message.split(' ').map((word, idx) => 
                                            word.startsWith('@') ? <span key={idx} className="text-indigo-600 font-bold bg-indigo-50 px-1.5 py-0.5 rounded text-xs">{word} </span> : word + ' '
                                        )}
                                    </p>
                                    <div className="flex justify-between items-center mt-3 pt-2 border-t border-gray-50">
                                       <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">{note.by}</span>
                                       <span className="text-[10px] text-gray-400">
                                          {note.date?.toDate ? note.date.toDate().toLocaleString('en-IN', {day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit'}) : 'Just now'}
                                       </span>
                                    </div>
                                 </div>
                              ))
                          ) : (
                              <div className="h-full flex flex-col items-center justify-center text-gray-400 space-y-2">
                                  <FileText size={24} className="opacity-30"/>
                                  <span className="text-xs">No notes added yet</span>
                              </div>
                          )}
                       </div>

                       <div className="relative">
                          <input 
                            type="text" 
                            placeholder="Type a note... (@tag)" 
                            className="w-full pl-4 pr-12 py-3 rounded-2xl border border-amber-200 dark:border-gray-600 bg-white dark:bg-gray-900 text-sm focus:ring-2 focus:ring-amber-400 focus:border-transparent outline-none shadow-sm"
                            value={newNote}
                            onChange={(e) => setNewNote(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleAddNote()}
                          />
                          <button onClick={handleAddNote} disabled={!newNote.trim() || isSendingNote} className="absolute right-2 top-2 p-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl transition-colors disabled:opacity-50 shadow-md">
                             <Send size={16}/>
                          </button>
                       </div>
                    </div>

                    <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-200 dark:border-gray-700 flex flex-col h-[300px]">
                       <div className="p-5 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-700/30 rounded-t-3xl">
                          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2"><Clock size={14}/> Activity Log</h3>
                       </div>
                       <div className="flex-1 overflow-y-auto p-5 custom-scrollbar">
                          {lead.history?.slice().reverse().map((item, i) => (
                             <div key={i} className="flex gap-4 mb-6 last:mb-0 group">
                                <div className="flex flex-col items-center">
                                    <div className="w-2.5 h-2.5 rounded-full bg-indigo-400 ring-4 ring-indigo-50 dark:ring-gray-700"></div>
                                    <div className="w-0.5 flex-1 bg-gray-100 dark:bg-gray-700 my-1"></div>
                                </div>
                                <div className="flex-1 min-w-0 pb-1">
                                   <div className="text-xs text-gray-600 dark:text-gray-300 font-medium whitespace-pre-line break-words bg-gray-50 dark:bg-gray-900 p-3 rounded-xl border border-gray-100 dark:border-gray-800">{item.message}</div>
                                   <div className="flex justify-between items-center mt-1.5 px-1"><span className="text-[10px] font-bold text-indigo-500">{item.by?.split(' ')[0]}</span><span className="text-[10px] text-gray-400">{item.timestamp?.toDate ? new Date(item.timestamp.toDate()).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' }) : 'Just now'}</span></div>
                                </div>
                             </div>
                          ))}
                       </div>
                    </div>
                 </div>
              </div>
           </div>
        </motion.div>
    );
};

// --- COMPONENT: LEAD FORM MODAL ---
const LeadFormModal = ({ isOpen, onClose, onSave, initialData, title, allUsers, userProfile, isSuperAdmin, allowedUserIds }) => {
    const [activeTab, setActiveTab] = useState('basic');
    const [formData, setFormData] = useState({});
    const [phoneList, setPhoneList] = useState([{ code: '+91', number: '' }]); // Changed to object for country code
    const [productList, setProductList] = useState([]);
    
    // Initial State for Product - ensures no undefined inputs
    const [tempProd, setTempProd] = useState({ 
        type: '', particulars: '', metal: 'Gold', weight: '', unit: 'gm', 
        unitRate: '', size: '', skuNo: '', certificateNo: '', 
        physicalIdentificationNo: '', // NEW FIELD ADDED HERE
        labName: '', jewellerName: '', ornamentReady: false 
    });
    const [newPayment, setNewPayment] = useState({ mode: 'UPI', date: '', amount: '' });

    useEffect(() => {
        if (isOpen) {
            const d = initialData || {};
            setFormData({
                name: d.name || '', email: d.email || '', dob: d.dob || '', location: d.location || '', gender: d.gender || 'Male',
                source: d.source || 'Walk-in', sourceDetails: d.sourceDetails || '',
                leadGenDate: d.leadGenDate || new Date().toISOString().split('T')[0], confirmationDate: d.confirmationDate || '', deliveryDate: d.deliveryDate || '',
                status: d.status || 'New', conversionProbability: d.conversionProbability || '50', leadClose: d.leadClose || false, priority: d.priority || 'Medium',
                assignedTo: d.assignedTo || userProfile.uid,
                productAmount: d.productAmount || 0, makingCharges: d.makingCharges || 0, discount: d.discount || 0, paymentHistory: d.paymentHistory || [],
                courierCompany: d.courierCompany || '', courierDate: d.courierDate || '', courierDocket: d.courierDocket || '', invoiceNo: d.invoiceNo || '', exchange: d.exchange || false, remark: d.remark || '', requirements: d.requirements || ''
            });

            // Parse existing phone numbers to separate code and number if possible (simplified logic)
            if (d.phoneNumbers && d.phoneNumbers.length > 0) {
                const parsedPhones = d.phoneNumbers.map(p => {
                    const foundCode = COUNTRY_CODES.find(c => p.startsWith(c.code));
                    if (foundCode) {
                        return { code: foundCode.code, number: p.replace(foundCode.code, '').trim() };
                    }
                    return { code: '+91', number: p.replace('+91', '').trim() }; // Default
                });
                setPhoneList(parsedPhones);
            } else if (d.phone) {
                 const foundCode = COUNTRY_CODES.find(c => d.phone.startsWith(c.code));
                 setPhoneList([{ code: foundCode ? foundCode.code : '+91', number: d.phone.replace(foundCode ? foundCode.code : '+91', '').trim() }]);
            } else {
                setPhoneList([{ code: '+91', number: '' }]);
            }

            if (d.products && d.products.length > 0) {
                setProductList(d.products);
            } else if (d.particular) {
                setProductList([{ 
                    type: d.type, particulars: d.particular, metal: d.metal, weight: d.weight, 
                    unit: d.unit, unitRate: d.unitRate, size: d.size, skuNo: d.skuNo, 
                    certificateNo: d.certificateNo, 
                    physicalIdentificationNo: d.physicalIdentificationNo || '', // Added to existing data load
                    labName: d.labName || '', jewellerName: d.jewellerName, ornamentReady: d.ornamentReady 
                }]);
            } else {
                setProductList([]);
            }
            setActiveTab('basic');
        }
    }, [isOpen, initialData, userProfile]);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    };

    const handlePhoneBlur = async (fullPhone) => {
        if(fullPhone.length < 10) return;
        const q = query(collection(db, "leads"), where("phoneNumbers", "array-contains", fullPhone));
        const snap = await getDocs(q);
        if(!snap.empty && (!initialData || snap.docs[0].id !== initialData.id)) {
            alert(`⚠️ Alert: Duplicate entry! Lead exists for ${snap.docs[0].data().name}`);
        }
    };

    const handlePhoneChange = (idx, field, val) => {
        const newPhones = [...phoneList];
        newPhones[idx][field] = val;
        setPhoneList(newPhones);
    };

    const addProductItem = () => {
        if(!tempProd.type) return alert("Enter product type");
        setProductList([...productList, tempProd]);
        setTempProd({ 
            type: '', particulars: '', metal: 'Gold', weight: '', unit: 'gm', 
            unitRate: '', size: '', skuNo: '', certificateNo: '', 
            physicalIdentificationNo: '', // RESET NEW FIELD
            labName: '', jewellerName: '', ornamentReady: false 
        });
    };

    const editProductItem = (index) => {
        const item = productList[index];
        setTempProd(item); 
        const newList = [...productList];
        newList.splice(index, 1);
        setProductList(newList);
    };

    const handleFormSave = () => {
        if(!formData.name) return alert("Name is required");
        // Construct full numbers
        const finalPhones = phoneList.filter(p => p.number.length >= 5).map(p => `${p.code} ${p.number}`);
        
        if(finalPhones.length === 0) return alert("At least one valid phone number is required");

        const finalData = {
            ...formData,
            phoneNumbers: finalPhones, 
            phone: finalPhones[0],
            products: productList,
            particular: productList.length > 0 ? productList[0].particulars : '', 
        };
        onSave(finalData);
    };

    if (!isOpen) return null;

    const assignableUsers = allUsers?.filter(u => allowedUserIds.includes(u.id) || u.role === 'admin' || u.role === 'super_admin') || [];

    return (
        // FIX: Increased z-index to 60 to sit above DetailView (which is 50)
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-[60] p-0 md:p-4">
           <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-white dark:bg-gray-800 w-full md:w-[95%] max-w-5xl h-full md:h-auto md:max-h-[95vh] md:rounded-3xl rounded-none shadow-2xl border-0 md:border border-gray-200 dark:border-gray-700 flex flex-col overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50/50 dark:bg-gray-800/50 shrink-0">
                 <h2 className="text-xl font-black text-gray-800 dark:text-white flex items-center gap-3"><Edit2 size={24} className="text-indigo-600 bg-indigo-50 p-1 rounded-lg"/> {title}</h2>
                 <button onClick={onClose} className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors"><X className="text-gray-500"/></button>
              </div>
              
              <div className="flex border-b border-gray-100 dark:border-gray-700 bg-white px-6 gap-6 overflow-x-auto hide-scrollbar shrink-0">
                 {['basic', 'products', 'financial', 'logistics'].map(tab => (
                    <button key={tab} onClick={() => setActiveTab(tab)} className={`py-4 text-sm font-bold uppercase tracking-wider transition-all relative whitespace-nowrap ${activeTab === tab ? 'text-indigo-600' : 'text-gray-400 hover:text-gray-600'}`}>
                       {tab}
                       {activeTab === tab && <motion.div layoutId="underline" className="absolute -bottom-[1px] left-0 right-0 h-[2px] bg-indigo-600 rounded-t-full z-10" />}
                    </button>
                 ))}
              </div>

              <div className="flex-1 overflow-y-auto p-6 md:p-8 custom-scrollbar bg-gray-50/30">
                 {activeTab === 'basic' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                       <Input name="name" label="Client Name *" val={formData.name} onChange={handleChange} />
                       
                       <div className="col-span-1">
                           <label className="label-text">Phone Numbers *</label>
                           <div className="space-y-2">
                               {phoneList.map((p, i) => {
                                   const selectedCountry = COUNTRY_CODES.find(c => c.code === p.code) || { limit: 15 };
                                   return (
                                       <div key={i} className="flex gap-2">
                                           <select 
                                                className="h-[46px] px-2 bg-gray-100 dark:bg-gray-700 border border-e-0 border-gray-300 dark:border-gray-600 rounded-l-xl text-xs font-bold text-gray-700 outline-none w-28 truncate"
                                                value={p.code}
                                                onChange={(e) => handlePhoneChange(i, 'code', e.target.value)}
                                           >
                                                {/* FIX: UNIQUE KEY GENERATION & COMPREHENSIVE LIST */}
                                                {COUNTRY_CODES.map((c, idx) => <option key={`${c.code}-${c.label}-${idx}`} value={c.code}>{c.label}</option>)}
                                           </select>
                                           <input 
                                                className="input-std rounded-l-none" 
                                                value={p.number || ''} 
                                                onChange={e=>handlePhoneChange(i, 'number', e.target.value.replace(/\D/g, ''))} // Ensure only numbers
                                                onBlur={()=>handlePhoneBlur(`${p.code} ${p.number}`)} 
                                                placeholder={p.code === '+91' ? '98765 43210' : 'Mobile Number'} 
                                                maxLength={selectedCountry.limit || 15}
                                           />
                                           {i>0 && <button onClick={()=>{const l=[...phoneList]; l.splice(i,1); setPhoneList(l)}} className="text-rose-500 hover:bg-rose-50 p-2 rounded-lg flex items-center justify-center"><X size={16}/></button>}
                                       </div>
                                   );
                               })}
                           </div>
                           <button onClick={()=>setPhoneList([...phoneList, { code: '+91', number: '' }])} className="text-xs text-indigo-600 font-bold hover:underline flex items-center gap-1 mt-2">+ Add Another Number</button>
                       </div>

                       <Select name="gender" label="Gender" val={formData.gender} onChange={handleChange} options={['Male', 'Female', 'Other']} />
                       
                       <div className="col-span-1">
                           <label className="label-text">Source</label>
                           <div className="flex flex-col gap-2">
                               <select name="source" value={formData.source} onChange={handleChange} className="input-std">
                                   <option>Walk-in</option><option>Social Media</option><option>Reference</option><option>BD</option>
                               </select>
                               {['Social Media','Reference','BD'].includes(formData.source) && (
                                   <input name="sourceDetails" placeholder={`Enter ${formData.source} Name`} value={formData.sourceDetails || ''} onChange={handleChange} className="input-std animate-fade-in" />
                               )}
                           </div>
                       </div>

                       <Input name="email" label="Email" val={formData.email} onChange={handleChange} />
                       <Input type="date" name="dob" label="Date of Birth" val={formData.dob} onChange={handleChange} />
                       <Input name="location" label="Location" val={formData.location} onChange={handleChange} />
                       
                       {/* --- ADDED DATE INPUTS HERE --- */}
                       <div className="col-span-full grid grid-cols-1 sm:grid-cols-3 gap-5 bg-gray-50 dark:bg-gray-700/30 p-5 rounded-xl border border-gray-100 dark:border-gray-700">
                           <Input type="date" name="leadGenDate" label="Lead Date" val={formData.leadGenDate} onChange={handleChange} />
                           <Input type="date" name="confirmationDate" label="Confirmation Date" val={formData.confirmationDate} onChange={handleChange} />
                           <Input type="date" name="deliveryDate" label="Delivery Date" val={formData.deliveryDate} onChange={handleChange} />
                       </div>

                       {isSuperAdmin && (
                           <div>
                               <label className="label-text">Assign To</label>
                               <select name="assignedTo" value={formData.assignedTo} onChange={handleChange} className="input-std">
                                   <option value={userProfile.uid}>Self (Me)</option>
                                   {assignableUsers.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                               </select>
                           </div>
                       )}

                       <div>
                           <label className="label-text">Priority</label>
                           <div className="flex gap-2">
                               {['Low', 'Medium', 'High'].map(p => (
                                   <button key={p} onClick={()=>setFormData({...formData, priority: p})} className={`flex-1 py-2.5 rounded-xl text-xs font-bold border transition-all h-[46px] ${formData.priority === p ? 'bg-indigo-600 text-white border-indigo-600 shadow-md' : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'}`}>{p}</button>
                               ))}
                           </div>
                       </div>

                       <div className="col-span-1">
                           <label className="label-text flex justify-between"><span>Probability</span> <span>{formData.conversionProbability}%</span></label>
                           <div className="h-[46px] flex items-center">
                               <input type="range" min="0" max="100" name="conversionProbability" value={formData.conversionProbability} onChange={handleChange} className="w-full accent-indigo-600 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer" />
                           </div>
                       </div>

                       <div className="col-span-full">
                           <label className="label-text">Status</label>
                           <div className="flex gap-2 flex-wrap">
                               {['New', 'Contacted', 'Consultation', 'Lead', 'Confirmed', 'Delivered', 'Refused', 'Lost'].map(s => (
                                   <button key={s} onClick={()=>setFormData({...formData, status: s})} className={`px-4 py-2 rounded-full text-xs font-bold border transition-all ${formData.status === s ? 'bg-emerald-100 text-emerald-800 border-emerald-200 shadow-sm' : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'}`}>{s}</button>
                               ))}
                           </div>
                       </div>
                    </div>
                 )}

                 {activeTab === 'products' && (
                    <div className="space-y-6">
                        <div className="bg-indigo-50/50 dark:bg-gray-900 p-6 rounded-2xl border border-indigo-100 dark:border-gray-700">
                            <h4 className="text-xs font-bold uppercase mb-4 text-indigo-600 flex items-center gap-2"><Layers size={14}/> Add New Item</h4>
                            
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                                <Input label="Type *" className="col-span-2 md:col-span-1" val={tempProd.type} onChange={e=>setTempProd({...tempProd, type:e.target.value})} placeholder="Ring/Consult" />
                                <Input label="Item Name/Particular" className="col-span-2" val={tempProd.particulars} onChange={e=>setTempProd({...tempProd, particulars:e.target.value})} placeholder="Diamond Ring" />
                                <Input label="Metal" val={tempProd.metal} onChange={e=>setTempProd({...tempProd, metal:e.target.value})} placeholder="Gold" />
                                
                                <div className="flex gap-2">
                                    <div className="flex-1">
                                        <Input label="Weight" val={tempProd.weight} onChange={e=>setTempProd({...tempProd, weight:e.target.value})} placeholder="0.00" />
                                    </div>
                                    <div className="w-1/3">
                                        <label className="label-text">Unit</label>
                                        <select className="input-std px-1" value={tempProd.unit} onChange={e=>setTempProd({...tempProd, unit:e.target.value})}><option>gm</option><option>ct</option><option>ratti</option></select>
                                    </div>
                                </div>
                                <Input label="Unit Rate" val={tempProd.unitRate} onChange={e=>setTempProd({...tempProd, unitRate:e.target.value})} placeholder="5000" />
                                <Input label="Size" val={tempProd.size} onChange={e=>setTempProd({...tempProd, size:e.target.value})} placeholder="12" />
                                <Input label="SKU No." val={tempProd.skuNo} onChange={e=>setTempProd({...tempProd, skuNo:e.target.value})} placeholder="SKU-123" />
                                
                                <Input label="Cert. No" val={tempProd.certificateNo} onChange={e=>setTempProd({...tempProd, certificateNo:e.target.value})} placeholder="IGI-123" />
                                {/* NEW LAB NAME FIELD */}
                                <Input label="Lab Name" val={tempProd.labName} onChange={e=>setTempProd({...tempProd, labName:e.target.value})} placeholder="GIA/IGI" />
                                
                                <Input label="Jeweller" val={tempProd.jewellerName} onChange={e=>setTempProd({...tempProd, jewellerName:e.target.value})} placeholder="Name" />
                                
                                {/* NEW FIELD ADDED HERE */}
                                <Input label="Physical ID No." val={tempProd.physicalIdentificationNo} onChange={e=>setTempProd({...tempProd, physicalIdentificationNo:e.target.value})} placeholder="ID-001" />

                                <div className="flex items-end h-full">
                                    <label className="flex items-center justify-center gap-3 cursor-pointer bg-white px-4 h-[46px] rounded-xl border border-gray-200 w-full hover:bg-gray-50 transition-colors">
                                        <input type="checkbox" checked={tempProd.ornamentReady} onChange={e=>setTempProd({...tempProd, ornamentReady:e.target.checked})} className="w-5 h-5 text-indigo-600 rounded focus:ring-indigo-500"/>
                                        <span className="text-sm font-bold text-gray-700">Is Ready?</span>
                                    </label>
                                </div>
                            </div>
                            
                            <button onClick={addProductItem} className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold shadow-lg shadow-indigo-200 hover:bg-indigo-700 hover:shadow-indigo-300 transition-all flex justify-center items-center gap-2 active:scale-95 whitespace-nowrap h-[46px]">
                                <Plus size={18}/> Add Product to List
                            </button>
                        </div>

                        <div className="space-y-3">
                            {productList.map((prod, i) => (
                                <div key={i} className="flex justify-between items-center p-4 bg-white dark:bg-gray-800 border border-gray-100 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
                                    <div className="flex gap-4 items-center">
                                        <div className="h-10 w-10 bg-gray-100 rounded-full flex items-center justify-center text-gray-500 font-bold">{i+1}</div>
                                        <div>
                                            <span className="text-sm font-bold text-gray-800 dark:text-gray-200 block">{prod.type} - {prod.particulars}</span>
                                            <span className="text-xs text-gray-500">{prod.weight} {prod.unit} • {prod.metal} {prod.labName ? `• ${prod.labName}` : ''}</span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button onClick={()=>editProductItem(i)} className="p-2 text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors flex items-center justify-center" title="Edit this item">
                                            <Edit2 size={16}/>
                                        </button>
                                        <button onClick={()=>{const l=[...productList]; l.splice(i,1); setProductList(l)}} className="p-2 text-rose-500 bg-rose-50 rounded-lg hover:bg-rose-100 transition-colors flex items-center justify-center">
                                            <Trash2 size={16}/>
                                        </button>
                                    </div>
                                </div>
                            ))}
                            {productList.length === 0 && (
                                <div className="text-center py-10 border-2 border-dashed border-gray-200 rounded-2xl text-gray-400">
                                    <Package size={32} className="mx-auto mb-2 opacity-30"/>
                                    <p className="text-sm">No products added yet.</p>
                                </div>
                            )}
                        </div>
                    </div>
                 )}

                 {activeTab === 'financial' && (
                    <div className="space-y-6">
                       <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                          <Input type="number" name="productAmount" label="Product Amount" val={formData.productAmount} onChange={handleChange} placeholder="₹ 0" />
                          <Input type="number" name="makingCharges" label="Making Charges" val={formData.makingCharges} onChange={handleChange} placeholder="₹ 0" />
                          <Input type="number" name="discount" label="Discount" val={formData.discount} onChange={handleChange} placeholder="₹ 0" />
                       </div>
                       
                       <div className="bg-emerald-50/50 dark:bg-gray-900 p-6 rounded-2xl border border-emerald-100 dark:border-gray-700">
                          <h4 className="text-xs font-bold text-emerald-700 uppercase mb-4 tracking-wider flex items-center gap-2"><DollarSign size={14}/> Add New Payment</h4>
                          
                          {/* FIXED PAYMENT RESPONSIVENESS HERE */}
                          <div className="flex flex-col md:flex-row gap-3">
                             <select className="input-std w-full md:w-32 h-[46px]" value={newPayment.mode} onChange={e=>setNewPayment({...newPayment, mode:e.target.value})}><option>UPI</option><option>Cash</option><option>Card</option></select>
                             <input type="date" className="input-std w-full md:w-auto h-[46px]" value={newPayment.date} onChange={e=>setNewPayment({...newPayment, date:e.target.value})} />
                             <input type="number" className="input-std flex-1 h-[46px]" placeholder="Amount" value={newPayment.amount} onChange={e=>setNewPayment({...newPayment, amount:e.target.value})} />
                             <button onClick={() => { if(newPayment.amount) { setFormData(p=>({...p, paymentHistory:[...p.paymentHistory, newPayment]})); setNewPayment({mode:'UPI',date:'',amount:''}); } else { alert("Please enter payment amount!"); } }} className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2 rounded-xl font-bold shadow-lg shadow-emerald-200 transition-all active:scale-95 flex items-center justify-center h-[46px] w-full md:w-auto"><Plus/></button>
                          </div>
                          
                          <div className="mt-6 space-y-2">
                             <h5 className="text-xs font-bold text-gray-400 uppercase">Transaction History</h5>
                             {formData.paymentHistory?.map((p, i) => (
                                <div key={i} className="flex justify-between text-sm bg-white dark:bg-gray-800 p-3 rounded-xl border border-gray-100 dark:border-gray-700 items-center shadow-sm">
                                   <div className="flex items-center gap-3">
                                        <div className="h-2 w-2 rounded-full bg-emerald-500"></div>
                                        <span className="font-mono text-gray-500">{p.date} • {p.mode}</span> 
                                   </div>
                                   <div className="flex items-center gap-3">
                                      <span className="font-bold text-emerald-600">{formatCurrency(p.amount)}</span> 
                                      <button onClick={()=>{const ph=[...formData.paymentHistory]; ph.splice(i,1); setFormData({...formData, paymentHistory:ph})}} className="text-gray-300 hover:text-rose-500 transition-colors flex items-center justify-center"><X size={14}/></button>
                                   </div>
                                </div>
                             ))}
                             {!formData.paymentHistory?.length && <p className="text-xs text-gray-400 italic">No payments recorded.</p>}
                          </div>
                       </div>
                    </div>
                 )}

                 {activeTab === 'logistics' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                       <Input name="courierCompany" label="Courier Co." val={formData.courierCompany} onChange={handleChange} />
                       <Input type="date" name="courierDate" label="Sent Date" val={formData.courierDate} onChange={handleChange} />
                       <Input name="courierDocket" label="Docket No" val={formData.courierDocket} onChange={handleChange} />
                       <Input name="invoiceNo" label="Invoice No" val={formData.invoiceNo} onChange={handleChange} />
                       <div className="md:col-span-2">
                          <label className="label-text">Remarks</label>
                          <textarea rows={3} name="remark" value={formData.remark} onChange={handleChange} className="input-std w-full resize-none"></textarea>
                       </div>
                       <div className="flex items-center mt-2 p-4 bg-rose-50 dark:bg-rose-900/10 rounded-xl border border-rose-100 dark:border-rose-900/30 h-[56px]">
                          <input type="checkbox" name="leadClose" checked={formData.leadClose} onChange={handleChange} className="w-5 h-5 rounded text-rose-600 mr-3 focus:ring-rose-500" />
                          <span className="text-sm font-bold text-rose-600">Mark Lead as Closed?</span>
                       </div>
                    </div>
                 )}
              </div>

              <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-700 flex justify-end gap-3 bg-white dark:bg-gray-800 shrink-0 pb-10 md:pb-4">
                 <button onClick={onClose} className="px-6 py-2.5 rounded-xl text-gray-500 hover:bg-gray-50 font-bold transition-colors whitespace-nowrap cursor-pointer">Cancel</button>
                 <button onClick={handleFormSave} className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-2.5 rounded-xl font-bold shadow-lg shadow-indigo-300/50 transition-transform active:scale-95 flex items-center gap-2 whitespace-nowrap cursor-pointer"><Save size={18}/> Save Lead</button>
              </div>
           </motion.div>
        </div>
    );
};

// --- MAIN CONTROLLER ---
const LeadsManagementSystem = () => {
    const { userProfile, currentUser } = useAuth();
    // 1. All hooks unconditionally at the top
    const { documents: leads } = useCollection('leads'); 
    const { documents: allUsers } = useCollection('users');

    const [selectedLead, setSelectedLead] = useState(null);
    const [editingLead, setEditingLead] = useState(null);
    const [isLeadModalOpen, setIsLeadModalOpen] = useState(false);
    const [isAccessModalOpen, setIsAccessModalOpen] = useState(false);
    const [isBirthdayModalOpen, setIsBirthdayModalOpen] = useState(false);

    const [allowedUserIds, setAllowedUserIds] = useState([]);
    const [isLoadingPerms, setIsLoadingPerms] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [viewMode, setViewMode] = useState('list');
    const [sortBy, setSortBy] = useState('newest');

    const navigate = useNavigate(); 
    const fileInputRef = useRef(null);
    
    const role = userProfile?.role || 'employee';
    const isSuperAdmin = role === 'super_admin';
    const isAdmin = role === 'admin';
    const canManageAccess = isSuperAdmin || isAdmin;

    useEffect(() => {
        const docRef = doc(db, 'settings', 'leads_access');
        const unsubscribe = onSnapshot(docRef, (docSnap) => {
            if (docSnap.exists()) {
                setAllowedUserIds(docSnap.data().uids || []);
            } else {
                setDoc(docRef, { uids: [] });
            }
            setIsLoadingPerms(false);
        }, (error) => {
            console.error("Perm Sync Error", error);
            setIsLoadingPerms(false);
        });
        return () => unsubscribe();
    }, []);

    // 2. Moved useMemo here (Before any returns)
    // --- ENHANCED SORTING LOGIC ---
    const filteredLeads = useMemo(() => {
        if (!leads) return [];
        let data = [...leads]; // Create a shallow copy
        
        if (searchTerm) {
            const lower = searchTerm.toLowerCase();
            data = data.filter(l => 
                l.name.toLowerCase().includes(lower) || 
                (l.phoneNumbers && l.phoneNumbers.some(p => p.includes(lower))) ||
                (l.phone && l.phone.includes(lower))
            );
        }

        return data.sort((a, b) => {
            switch (sortBy) {
                case 'newest':
                    return (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0);
                case 'oldest':
                    return (a.createdAt?.seconds || 0) - (b.createdAt?.seconds || 0);
                case 'priority':
                    const pMap = { 'High': 3, 'Medium': 2, 'Low': 1 };
                    return (pMap[b.priority] || 0) - (pMap[a.priority] || 0);
                case 'probability':
                    return (parseFloat(b.conversionProbability) || 0) - (parseFloat(a.conversionProbability) || 0);
                case 'delivery':
                    if (!a.deliveryDate) return 1;
                    if (!b.deliveryDate) return -1;
                    return new Date(a.deliveryDate) - new Date(b.deliveryDate);
                case 'name':
                    return a.name.localeCompare(b.name);
                case 'status':
                    return a.status.localeCompare(b.status);
                default:
                    return 0;
            }
        });
    }, [leads, searchTerm, sortBy]);

    const isNew = (date) => {
        if(!date) return false;
        const d = date.toDate ? date.toDate() : new Date(date);
        return (new Date() - d) < (24 * 60 * 60 * 1000);
    };

    // 3. Permission checks and conditional returns
    // 🔥 FIXED: Removed '|| true' from end. Now it strictly checks permissions.
    const hasAccess = canManageAccess || allowedUserIds.includes(userProfile?.uid); 

    if (isLoadingPerms) return <div className="h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div></div>;
    
    // 🔥 FIXED: Access Denied Screen added here
    if (!hasAccess) {
        return (
            <div className="h-dvh flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-900 text-center p-6">
                <div className="bg-white dark:bg-gray-800 p-8 rounded-3xl shadow-xl border border-gray-100 dark:border-gray-700 max-w-md w-full">
                    <div className="h-20 w-20 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Lock size={40} />
                    </div>
                    <h1 className="text-2xl font-black text-gray-900 dark:text-white mb-2">Access Restricted</h1>
                    <p className="text-gray-500 dark:text-gray-400 mb-8">
                        You do not have permission to view the Leads Management System. Please contact your administrator.
                    </p>
                    <button 
                        onClick={() => navigate('/')} 
                        className="w-full py-3 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-xl font-bold hover:scale-[1.02] transition-transform"
                    >
                        Go Back Home
                    </button>
                </div>
            </div>
        );
    }

    const handleSave = async (data) => {
        try {
           const timestamp = new Date();
           const message = editingLead ? generateChangeLog(editingLead, data) : 'Lead Created';
           const historyItem = { message, timestamp, by: userProfile.name || 'User' };
           
           if (editingLead) {
              await updateDoc(doc(db, 'leads', editingLead.id), { ...data, history: arrayUnion(historyItem) });
              if(selectedLead?.id === editingLead.id) setSelectedLead({ ...selectedLead, ...data });
           } else {
              await addDoc(collection(db, 'leads'), { ...data, createdAt: serverTimestamp(), createdBy: userProfile.uid, history: [historyItem], appointments: [] });
           }
           setIsLeadModalOpen(false);
           setEditingLead(null);
        } catch (e) { console.error(e); alert("Save failed"); }
    };

    const handleDeleteLead = async (leadId) => {
        if (!window.confirm("Are you sure?")) return;
        try {
            await deleteDoc(doc(db, 'leads', leadId));
            setSelectedLead(null);
        } catch (error) { alert("Failed to delete."); }
    };

    const handleToggleUserAccess = async (targetUid) => {
        let newIds = allowedUserIds.includes(targetUid) ? allowedUserIds.filter(id => id !== targetUid) : [...allowedUserIds, targetUid];
        await setDoc(doc(db, 'settings', 'leads_access'), { uids: newIds }, { merge: true });
    };

    const handleExportAll = () => {
        if(!leads?.length) return;
        const flatData = leads.map((l, i) => {
            const p1 = l.products && l.products.length > 0 ? l.products[0] : {};
            return {
                "S_No": i+1, 
                "Client_Name": l.name, 
                "Phones": l.phoneNumbers ? l.phoneNumbers.join(', ') : l.phone,
                "Email": l.email, 
                "Gender": l.gender, 
                "DOB": l.dob,
                "Location": l.location,
                "Source": l.source,
                "Source_Details": l.sourceDetails,
                "Lead_Gen_Date": l.leadGenDate,
                "Confirmation_Date": l.confirmationDate,
                "Delivery_Date": l.deliveryDate,
                "Status": l.status,
                "Conv_Prob": l.conversionProbability,
                "Priority": l.priority,
                "Assigned_To": l.assignedTo,
                "Product_Amount": l.productAmount,
                "Making_Charges": l.makingCharges,
                "Discount": l.discount,
                "Courier_Company": l.courierCompany,
                "Courier_Date": l.courierDate,
                "Docket": l.courierDocket,
                "Invoice": l.invoiceNo,
                "Lead_Close": l.leadClose ? "Yes" : "No",
                "Remarks": l.remark,
                "P1_Type": p1.type || '',
                "P1_Item": p1.particulars || '',
                "P1_Metal": p1.metal || '',
                "P1_Weight": p1.weight || '',
                "P1_Unit": p1.unit || '',
                "P1_Rate": p1.unitRate || '',
                "P1_Size": p1.size || '',
                "P1_SKU": p1.skuNo || '',
                "P1_Cert": p1.certificateNo || '',
                "P1_Lab": p1.labName || '',
                "P1_Jeweller": p1.jewellerName || '',
                "P1_Ready": p1.ornamentReady ? "Yes" : "No",
                "JSON_Products": JSON.stringify(l.products || [])
            };
        });
        const worksheet = XLSX.utils.json_to_sheet(flatData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Leads");
        XLSX.writeFile(workbook, "Leads_Full_Export.xlsx");
    };
    
    const handleExportSingle = (lead) => { /* Same logic as single but for one row */ };

    const handleImportClick = () => fileInputRef.current.click();
    
    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = async (evt) => {
            try {
                const bstr = evt.target.result;
                const wb = XLSX.read(bstr, { type: 'binary' });
                const wsname = wb.SheetNames[0];
                const ws = wb.Sheets[wsname];
                const data = XLSX.utils.sheet_to_json(ws);
                if (data.length === 0) return alert("Empty Excel file!");
                let count = 0;
                for (const row of data) {
                    let products = [];
                    if (row["JSON_Products"]) {
                        try { products = JSON.parse(row["JSON_Products"]); } catch(e){}
                    } else {
                        products.push({
                            type: row["P1_Type"] || "", particulars: row["P1_Item"] || "", metal: row["P1_Metal"] || "",
                            weight: row["P1_Weight"] || "", unit: row["P1_Unit"] || "gm", unitRate: row["P1_Rate"] || "",
                            size: row["P1_Size"] || "", skuNo: row["P1_SKU"] || "", certificateNo: row["P1_Cert"] || "",
                            labName: row["P1_Lab"] || "", jewellerName: row["P1_Jeweller"] || "", ornamentReady: row["P1_Ready"] === "Yes"
                        });
                    }

                    const newLead = {
                        name: row["Client_Name"] || "Unknown", 
                        phoneNumbers: row["Phones"] ? row["Phones"].split(', ').map(p=>p.trim()) : [],
                        phone: row["Phones"] ? row["Phones"].split(', ')[0] : "", // Primary
                        email: row["Email"] || "", 
                        gender: row["Gender"] || "Male", 
                        dob: row["DOB"] || "",
                        location: row["Location"] || "", 
                        source: row["Source"] || "Imported", 
                        sourceDetails: row["Source_Details"] || "",
                        leadGenDate: row["Lead_Gen_Date"] || new Date().toISOString().split('T')[0],
                        confirmationDate: row["Confirmation_Date"] || "", 
                        deliveryDate: row["Delivery_Date"] || "", 
                        status: row["Status"] || "New",
                        conversionProbability: row["Conv_Prob"] || "50", 
                        priority: row["Priority"] || "Medium",
                        assignedTo: row["Assigned_To"] || userProfile.uid,
                        products: products,
                        productAmount: row["Product_Amount"] || 0, 
                        makingCharges: row["Making_Charges"] || 0, 
                        discount: row["Discount"] || 0, 
                        paymentHistory: [],
                        courierCompany: row["Courier_Company"] || "", 
                        courierDate: row["Courier_Date"] || "", 
                        courierDocket: row["Docket"] || "", 
                        invoiceNo: row["Invoice"] || "",
                        leadClose: row["Lead_Close"] === "Yes", 
                        remark: row["Remarks"] || "",
                        createdAt: serverTimestamp(), 
                        createdBy: userProfile.uid, 
                        history: [{ message: "Imported via Excel", timestamp: new Date(), by: userProfile.name }]
                    };
                    await addDoc(collection(db, 'leads'), newLead);
                    count++;
                }
                alert(`Success! Imported ${count} leads.`);
            } catch (err) { console.error(err); alert("Error parsing Excel file."); }
        };
        reader.readAsBinaryString(file);
        e.target.value = null; 
    };

    return (
        <div className="h-dvh bg-gray-50/50 dark:bg-gray-900 flex overflow-hidden font-sans text-gray-800 dark:text-gray-100 relative">
            <AnimatePresence>
              {selectedLead && <LeadDetailView key="detail" lead={selectedLead} onClose={() => setSelectedLead(null)} onEdit={(l) => { setEditingLead(l); setIsLeadModalOpen(true); }} onExportSingle={handleExportSingle} onDelete={handleDeleteLead} canManage={canManageAccess} userProfile={userProfile} allUsers={allUsers} />}
            </AnimatePresence>
            
            <AnimatePresence>
              {isBirthdayModalOpen && <BirthdayReportModal isOpen={isBirthdayModalOpen} onClose={()=>setIsBirthdayModalOpen(false)} leads={leads} />}
            </AnimatePresence>

            <AnimatePresence>
                {isLeadModalOpen && (
                    <LeadFormModal 
                        isOpen={isLeadModalOpen} 
                        onClose={() => setIsLeadModalOpen(false)} 
                        onSave={handleSave} 
                        initialData={editingLead} 
                        title={editingLead ? "Edit Lead" : "Add New Lead"}
                        allUsers={allUsers}
                        userProfile={userProfile}
                        isSuperAdmin={isSuperAdmin}
                        allowedUserIds={allowedUserIds}
                    />
                )}
            </AnimatePresence>

            <AnimatePresence>
                {isAccessModalOpen && (
                    <AccessManagementModal
                        isOpen={isAccessModalOpen}
                        onClose={() => setIsAccessModalOpen(false)}
                        allUsers={allUsers}
                        allowedUserIds={allowedUserIds}
                        onToggleAccess={handleToggleUserAccess}
                    />
                )}
            </AnimatePresence>

            <div className="flex-1 flex flex-col h-full">
               {/* Header Section */}
               <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-b border-gray-200 dark:border-gray-800 px-4 md:px-6 py-4 sticky top-0 z-10 shrink-0">
                  <div className="flex flex-col xl:flex-row justify-between items-center gap-4">
                      {/* Logo Area */}
                      <div className="flex items-center gap-3 w-full xl:w-auto justify-between md:justify-start">
                         <div className="flex items-center gap-3">
                             <div className="bg-gradient-to-tr from-indigo-600 to-violet-600 text-white p-2.5 rounded-xl shadow-lg shadow-indigo-200 dark:shadow-none"><Users size={22}/></div>
                             <div>
                                 <h1 className="text-xl font-black text-gray-900 dark:text-white tracking-tight">Leads Pro</h1>
                                 <p className="text-xs text-gray-500 font-medium hidden md:block">Manage your pipeline efficiently</p>
                             </div>
                         </div>
                      </div>

                      {/* Search & Filter Bar */}
                      <div className="flex flex-col md:flex-row flex-1 w-full max-w-4xl gap-3 items-center">
                          <div className="relative flex-1 group w-full">
                              <Search className="absolute left-4 top-3 text-gray-400 group-focus-within:text-indigo-500 transition-colors" size={18} />
                              <input placeholder="Search clients, phones..." className="w-full bg-gray-100 dark:bg-gray-800 pl-11 pr-4 py-2.5 rounded-2xl border-transparent focus:bg-white focus:ring-2 ring-indigo-500 focus:shadow-lg transition-all outline-none h-[46px]" value={searchTerm} onChange={e=>setSearchTerm(e.target.value)} />
                          </div>
                          
                          {/* Filters (Responsive) */}
                          <div className="flex gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0 hide-scrollbar shrink-0">
                              <div className="relative min-w-[160px]">
                                  <select className="bg-gray-100 dark:bg-gray-800 rounded-xl pl-4 pr-8 py-2.5 text-sm font-bold border-r-8 border-transparent outline-none hover:bg-gray-200 cursor-pointer transition-colors appearance-none w-full h-[46px]" value={sortBy} onChange={e=>setSortBy(e.target.value)}>
                                      <option value="newest">Newest First</option>
                                      <option value="oldest">Oldest First</option>
                                      <option value="priority">High Priority</option>
                                      <option value="probability">Highest Probability</option>
                                      <option value="delivery">Delivery Date</option>
                                      <option value="name">Name (A-Z)</option>
                                      <option value="status">Status</option>
                                  </select>
                                  <ArrowUpDown size={14} className="absolute right-2 top-3.5 pointer-events-none text-gray-500"/>
                              </div>
                              <div className="flex bg-gray-100 dark:bg-gray-800 rounded-xl p-1 gap-1 h-[46px] items-center shrink-0">
                                  <button onClick={()=>setViewMode('list')} className={`p-2 rounded-lg transition-all ${viewMode==='list'?'bg-white shadow text-indigo-600':'text-gray-400 hover:text-gray-600'}`}><List size={18}/></button>
                                  <button onClick={()=>setViewMode('grid')} className={`p-2 rounded-lg transition-all ${viewMode==='grid'?'bg-white shadow text-indigo-600':'text-gray-400 hover:text-gray-600'}`}><Grid size={18}/></button>
                              </div>
                          </div>
                      </div>

                      {/* Actions Bar (Scrollable on Mobile) */}
                      <div className="w-full xl:w-auto overflow-x-auto pb-2 xl:pb-0 hide-scrollbar shrink-0">
                          <div className="flex gap-4 min-w-max">
                             <button onClick={() => setIsBirthdayModalOpen(true)} className="flex items-center gap-2 px-2 py-2 bg-rose-50 text-rose-600 rounded-xl text-sm font-bold hover:bg-rose-100 transition-colors whitespace-nowrap h-[46px]"><Cake size={16}/> Birthdays</button>
                             <button onClick={() => navigate('/admin/appointments')} className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-bold hover:bg-gray-50 transition-colors whitespace-nowrap h-[46px]"><Calendar size={18}/> Schedule</button>
                             
                             <input type="file" accept=".xlsx, .xls" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
                             <button onClick={handleImportClick} className="flex items-center gap-2 px-4 py-2.5 bg-blue-50 text-blue-700 rounded-xl text-sm font-bold hover:bg-blue-100 transition-colors whitespace-nowrap h-[46px]"><Upload size={18}/> Import</button>
                             <button onClick={handleExportAll} className="flex items-center gap-2 px-4 py-2.5 bg-emerald-50 text-emerald-700 rounded-xl text-sm font-bold hover:bg-emerald-100 transition-colors whitespace-nowrap h-[46px]"><FileText size={18}/> Export</button>
                             
                             {canManageAccess && (
                                <button onClick={() => setIsAccessModalOpen(true)} className="flex items-center gap-2 px-4 py-2.5 bg-amber-50 text-amber-700 rounded-xl text-sm font-bold hover:bg-amber-100 transition-colors whitespace-nowrap h-[46px]"><ShieldCheck size={18}/> Access</button>
                             )}
                             <div className="w-px bg-gray-200 mx-1"></div>
                             <button onClick={() => { setEditingLead(null); setIsLeadModalOpen(true); }} className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-all active:scale-95 whitespace-nowrap h-[46px]"><Plus size={20}/> New Lead</button>
                          </div>
                      </div>
                  </div>
               </div>

               <div className="flex-1 overflow-y-auto p-4 md:p-6 custom-scrollbar">
                   {viewMode === 'grid' ? (
                       <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5 pb-20 md:pb-0">
                           {filteredLeads.map(lead => (
                               <motion.div 
                                  layoutId={lead.id} 
                                  key={lead.id} 
                                  onClick={() => setSelectedLead(lead)} 
                                  className={`group bg-white dark:bg-gray-800 p-5 rounded-3xl border cursor-pointer hover:shadow-xl hover:-translate-y-1 transition-all duration-300 relative overflow-hidden ${isNew(lead.createdAt) ? 'border-indigo-200 ring-4 ring-indigo-50/50' : 'border-gray-100 dark:border-gray-700'}`}
                               >
                                   {isNew(lead.createdAt) && <div className="absolute top-0 right-0 bg-indigo-600 text-white text-[10px] px-3 py-1 rounded-bl-xl font-bold z-10">NEW</div>}
                                   
                                   <div className="flex justify-between mb-3 relative z-10">
                                        <div>
                                            <h3 className="font-bold text-lg text-gray-800 dark:text-white truncate pr-2">{lead.name}</h3>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className={`text-[10px] px-2 py-0.5 rounded-md font-bold uppercase ${lead.priority === 'High' ? 'bg-rose-100 text-rose-600' : 'bg-gray-100 text-gray-500'}`}>{lead.priority || 'Medium'}</span>
                                                <span className="text-xs text-gray-400 font-medium">{formatDate(lead.leadGenDate)}</span>
                                            </div>
                                        </div>
                                        <div className="h-10 w-10 rounded-full bg-gray-50 dark:bg-gray-700 flex items-center justify-center text-gray-400 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
                                            <ChevronRight size={20}/>
                                        </div>
                                   </div>
                                   
                                   <div className="space-y-2 relative z-10">
                                        <div className="flex items-center gap-2 text-xs text-gray-500 bg-gray-50 dark:bg-gray-700/50 p-2 rounded-xl">
                                            <Phone size={14}/> {lead.phoneNumbers?.[0] || lead.phone || 'No Phone'}
                                        </div>
                                        <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-100 dark:border-gray-700">
                                            <span className={`text-xs font-bold px-2 py-1 rounded-lg ${lead.status === 'Converted' ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-100 text-gray-600'}`}>{lead.status}</span>
                                            <span className="text-sm font-bold text-gray-900 dark:text-gray-100">{formatCurrency(((parseFloat(lead.productAmount)||0) + (parseFloat(lead.makingCharges)||0)) - (parseFloat(lead.discount)||0))}</span>
                                        </div>
                                   </div>
                               </motion.div>
                           ))}
                       </div>
                   ) : (
                       <div className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm pb-20 md:pb-0">
                           {filteredLeads.map((lead, i) => (
                              <motion.div 
                                key={lead.id} 
                                onClick={() => setSelectedLead(lead)} 
                                className={`p-4 flex flex-col md:flex-row justify-between items-start md:items-center cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors border-b last:border-0 border-gray-100 dark:border-gray-700 ${isNew(lead.createdAt) ? 'bg-indigo-50/10' : ''}`}
                              >
                                 <div className="flex items-center gap-4 w-full md:w-1/3 mb-2 md:mb-0">
                                    <div className={`h-10 w-10 rounded-full flex items-center justify-center font-bold text-white shadow-md shrink-0 ${lead.priority === 'High' ? 'bg-gradient-to-br from-rose-400 to-rose-600' : 'bg-gradient-to-br from-gray-400 to-gray-600'}`}>
                                            {lead.name.charAt(0)}
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <h4 className="font-bold text-sm text-gray-900 dark:text-white">{lead.name}</h4>
                                            {isNew(lead.createdAt) && <span className="bg-indigo-100 text-indigo-700 text-[10px] px-1.5 rounded font-bold">NEW</span>}
                                        </div>
                                        <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-2"><Phone size={10}/> {lead.phoneNumbers?.[0] || lead.phone}</p>
                                    </div>
                                 </div>
                                 
                                 <div className="flex gap-4 w-full md:w-1/3 justify-between md:justify-center mb-2 md:mb-0">
                                     <div className="text-left md:text-center">
                                         <span className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">Date</span>
                                         <p className="text-xs font-bold text-gray-700 dark:text-gray-300">{formatDate(lead.leadGenDate)}</p>
                                     </div>
                                     <div className="text-right md:text-center">
                                         <span className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">Amount</span>
                                         <p className="text-xs font-bold text-gray-700 dark:text-gray-300">{formatCurrency(((parseFloat(lead.productAmount)||0) + (parseFloat(lead.makingCharges)||0)) - (parseFloat(lead.discount)||0))}</p>
                                     </div>
                                 </div>

                                 <div className="flex items-center justify-between w-full md:w-1/3 md:justify-end gap-4 mt-1 md:mt-0">
                                     <span className={`text-xs px-3 py-1 rounded-full font-bold ${lead.status==='Converted' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'}`}>{lead.status}</span>
                                     <div className="flex items-center gap-2 text-gray-400 text-xs">
                                         <span>{allUsers?.find(u=>u.id===lead.assignedTo)?.name?.split(' ')[0] || 'Unassigned'}</span>
                                         <ChevronRight size={16}/>
                                     </div>
                                 </div>
                              </motion.div>
                           ))}
                       </div>
                   )}
               </div>
            </div>

            <style>{`
              .input-std { width: 100%; background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 0.75rem; padding: 0.75rem 1rem; font-size: 0.875rem; outline: none; transition: all 0.2s; color: #1f2937; height: 46px; }
              .input-std:focus { border-color: #6366f1; background: white; box-shadow: 0 4px 12px rgba(99, 102, 241, 0.1); }
              .label-text { display: block; font-size: 0.75rem; font-weight: 700; color: #6b7280; text-transform: uppercase; margin-bottom: 0.4rem; letter-spacing: 0.05em; }
              .custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
              .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
              .hide-scrollbar::-webkit-scrollbar { display: none; }
              .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
              .bg-dots-pattern { background-image: radial-gradient(#e5e7eb 1px, transparent 1px); background-size: 24px 24px; }
              .dark .bg-dots-pattern { background-image: radial-gradient(#374151 1px, transparent 1px); }
            `}</style>
        </div>
    );
};

// UI Helpers (Re-styled inputs for premium feel)
const Input = ({ label, name, val, onChange, type="text", className="", placeholder="" }) => (
   <div className={className}>
       <label className="label-text">{label}</label>
       {/* FIX: Ensure value is never undefined */}
       <input type={type} name={name} value={val || ''} onChange={onChange} className="input-std w-full placeholder-gray-400" placeholder={placeholder} />
   </div>
);
const Select = ({ label, name, val, onChange, options }) => (
   <div>
       <label className="label-text">{label}</label>
       <div className="relative">
           {/* FIX: Ensure value is never undefined */}
           <select name={name} value={val || ''} onChange={onChange} className="input-std w-full appearance-none cursor-pointer">
               {options.map(o=><option key={o}>{o}</option>)}
           </select>
           <div className="absolute right-3 top-3.5 pointer-events-none text-gray-400"><ChevronRight size={14} className="rotate-90"/></div>
       </div>
   </div>
);
const StatCard = ({ label, value, icon: Icon, color }) => (
   <div className={`p-5 rounded-2xl border bg-white dark:bg-gray-800 flex flex-col items-center justify-center text-center shadow-sm hover:shadow-md transition-all ${color || 'border-gray-100 dark:border-gray-700'}`}>
      <div className={`p-3 rounded-full mb-3 ${color ? color.replace('text-', 'bg-').replace('600', '100').split(' ')[0] + ' ' + color.split(' ')[0] : 'bg-gray-100 text-gray-500'}`}>
          <Icon size={20} />
      </div>
      <span className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">{label}</span>
      <span className="font-black text-lg text-gray-800 dark:text-white mt-1">{value}</span>
   </div>
);
const DetailRow = ({ label, value, color, fontMono, highlight }) => (
   <div className={`flex justify-between items-center p-2.5 rounded-lg transition-colors ${highlight ? 'bg-indigo-50/50 dark:bg-indigo-900/10 border border-indigo-100 dark:border-indigo-800' : 'hover:bg-gray-50 dark:hover:bg-gray-700/30'}`}>
      <span className="text-gray-500 text-xs font-medium uppercase tracking-wide">{label}</span>
      <span className={`text-sm font-bold ${color || 'text-gray-800 dark:text-gray-200'} ${fontMono ? 'font-mono tracking-tight' : ''}`}>{value || '-'}</span>
   </div>
);

export default LeadsManagementSystem;