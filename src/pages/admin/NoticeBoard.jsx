// src/pages/admin/NoticeBoard.jsx

import React, { useState, useMemo } from 'react';
import { 
    Megaphone, Search, Download, Plus, Trash2, Calendar as CalendarIcon, 
    FileText, AlertCircle, Info, X, FileBadge, CalendarDays, Filter
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { jsPDF } from 'jspdf'; // 🔥 NEW: For generating PDF

import { useAuth } from '../../context/AuthContext'; 
import { useCollection } from '../../hooks/useCollection';
import { doc, addDoc, deleteDoc, collection, serverTimestamp } from 'firebase/firestore'; 
import { db } from '../../Firebase'; // Storage removed

// --- UTILS ---
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

const fadeIn = { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { duration: 0.3 } }, exit: { opacity: 0, y: -20 } };

// --- COMPONENT: NOTICE FORM MODAL ---
const NoticeFormModal = ({ isOpen, onClose, onSave, userProfile }) => {
    const [formData, setFormData] = useState({ title: '', content: '', category: 'General', displayDate: new Date().toISOString().split('T')[0] });
    const [isSaving, setIsSaving] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = async () => {
        if (!formData.title || !formData.content) return alert("Title and Content are required!");
        setIsSaving(true);

        try {
            const finalData = {
                ...formData,
                postedBy: userProfile.name,
                postedById: userProfile.uid,
                createdAt: serverTimestamp(),
            };

            await onSave(finalData);
            setIsSaving(false);
        } catch (error) {
            console.error("Save Error: ", error);
            alert("Failed to publish notice.");
            setIsSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[70] p-4">
            <motion.div variants={fadeIn} initial="hidden" animate="visible" exit="exit" className="bg-white dark:bg-gray-800 w-full max-w-2xl rounded-3xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden flex flex-col">
                <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-violet-50 dark:bg-gray-700/50">
                    <h2 className="text-xl font-black text-violet-700 dark:text-violet-400 flex items-center gap-2">
                        <Megaphone size={24}/> Add New Notice
                    </h2>
                    <button onClick={onClose} className="p-2 hover:bg-violet-100 dark:hover:bg-gray-600 rounded-full transition-colors"><X size={20}/></button>
                </div>
                
                <div className="p-6 space-y-5 overflow-y-auto custom-scrollbar max-h-[70vh]">
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Notice Title *</label>
                        <input type="text" className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-violet-500 font-medium" placeholder="E.g., Holiday on Friday" value={formData.title} onChange={e=>setFormData({...formData, title: e.target.value})} />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Category</label>
                            <select className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-violet-500 cursor-pointer font-medium" value={formData.category} onChange={e=>setFormData({...formData, category: e.target.value})}>
                                <option value="General">General Info</option>
                                <option value="Urgent">Urgent / Alert</option>
                                <option value="Policy">Company Policy</option>
                                <option value="Event">Event / Celebration</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Effective Date</label>
                            <input type="date" className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-violet-500 font-medium" value={formData.displayDate} onChange={e=>setFormData({...formData, displayDate: e.target.value})} />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Detailed Description *</label>
                        <textarea rows={5} className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-violet-500 resize-none font-medium" placeholder="Write the details here..." value={formData.content} onChange={e=>setFormData({...formData, content: e.target.value})}></textarea>
                    </div>
                </div>

                <div className="p-5 border-t border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800 flex justify-end gap-3 shrink-0">
                    <button onClick={onClose} className="px-6 py-2.5 rounded-xl text-gray-500 hover:bg-gray-100 font-bold transition-colors">Cancel</button>
                    <button onClick={handleSubmit} disabled={isSaving} className="bg-violet-600 hover:bg-violet-700 text-white px-8 py-2.5 rounded-xl font-bold shadow-lg shadow-violet-200 dark:shadow-none transition-transform active:scale-95 disabled:opacity-70 flex items-center gap-2">
                        {isSaving ? <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : <><Megaphone size={18}/> Publish Notice</>}
                    </button>
                </div>
            </motion.div>
        </div>
    );
};

// --- MAIN CONTROLLER ---
const NoticeBoardSystem = () => {
    const { userProfile } = useAuth();
    const { documents: notices, loading } = useCollection('notices'); 

    const [isFormOpen, setIsFormOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterCategory, setFilterCategory] = useState('All');
    const [selectedMonth, setSelectedMonth] = useState(''); 

    // Roles Logic (Employees can't manage, only read)
    const role = userProfile?.role || 'employee';
    const canManageNotices = ['admin', 'super_admin', 'hr'].includes(role);

    const handleSaveNotice = async (data) => {
        try {
            await addDoc(collection(db, 'notices'), data);
            setIsFormOpen(false);
        } catch (error) {
            console.error("Error creating notice:", error);
            alert("Failed to publish notice.");
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm("Are you sure you want to delete this notice?")) {
            await deleteDoc(doc(db, 'notices', id));
        }
    };

    // 🔥 PDF GENERATOR LOGIC
    const handleDownloadPDF = (notice) => {
        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.getWidth();

        // Title
        doc.setFontSize(18);
        doc.setFont("helvetica", "bold");
        doc.text(notice.title, 14, 22);
        
        // Metadata
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(100);
        const metaText = `Category: ${notice.category}   |   Date: ${formatDate(notice.displayDate || notice.createdAt)}   |   Posted By: ${notice.postedBy || 'Admin'}`;
        doc.text(metaText, 14, 30);
        
        // Line break
        doc.setLineWidth(0.5);
        doc.setDrawColor(200);
        doc.line(14, 34, pageWidth - 14, 34);

        // Content
        doc.setFontSize(12);
        doc.setTextColor(20);
        const splitContent = doc.splitTextToSize(notice.content, pageWidth - 28);
        doc.text(splitContent, 14, 44);

        // Save
        doc.save(`Notice_${notice.title.substring(0, 15)}.pdf`);
    };

    const filteredNotices = useMemo(() => {
        if (!notices) return [];
        let data = [...notices];
        
        if (searchTerm) {
            const lower = searchTerm.toLowerCase();
            data = data.filter(n => n.title?.toLowerCase().includes(lower) || n.content?.toLowerCase().includes(lower));
        }

        if (filterCategory !== 'All') {
            data = data.filter(n => n.category === filterCategory);
        }

        if (selectedMonth) {
            data = data.filter(n => {
                if(!n.displayDate) return false;
                return n.displayDate.startsWith(selectedMonth); 
            });
        }

        // Always sort Latest First by created date
        return data.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
    }, [notices, searchTerm, filterCategory, selectedMonth]);

    const getCategoryStyles = (cat) => {
        switch(cat) {
            case 'Urgent': return 'bg-rose-100 text-rose-700 border-rose-200';
            case 'Policy': return 'bg-purple-100 text-purple-700 border-purple-200';
            case 'Event': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
            default: return 'bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-700 dark:text-gray-300';
        }
    };

    const getCategoryIcon = (cat) => {
        switch(cat) {
            case 'Urgent': return <AlertCircle size={14}/>;
            case 'Policy': return <FileBadge size={14}/>;
            case 'Event': return <CalendarIcon size={14}/>;
            default: return <Info size={14}/>;
        }
    };

    return (
        <div className="h-dvh bg-gray-50/50 dark:bg-gray-900 flex overflow-hidden font-sans text-gray-800 dark:text-gray-100 relative">
            <AnimatePresence>
                {isFormOpen && <NoticeFormModal isOpen={isFormOpen} onClose={() => setIsFormOpen(false)} onSave={handleSaveNotice} userProfile={userProfile} />}
            </AnimatePresence>

            <div className="flex-1 flex flex-col h-full w-full">
               {/* Header Section */}
               <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-b border-gray-200 dark:border-gray-800 px-4 md:px-8 py-5 sticky top-0 z-10 shrink-0">
                  <div className="flex flex-col xl:flex-row justify-between items-center gap-5">
                      
                      <div className="flex items-center gap-3 w-full xl:w-auto">
                         <div className="bg-gradient-to-tr from-amber-500 to-orange-600 text-white p-3 rounded-2xl shadow-lg shadow-orange-200 dark:shadow-none"><Megaphone size={24}/></div>
                         <div>
                             <h1 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">Notice Board</h1>
                             <p className="text-xs text-gray-500 font-medium">Company announcements & updates</p>
                         </div>
                      </div>

                      {/* Filters */}
                      <div className="flex flex-col md:flex-row flex-1 w-full xl:max-w-3xl gap-3">
                          <div className="relative flex-1">
                              <Search className="absolute left-4 top-3.5 text-gray-400" size={18} />
                              <input placeholder="Search notices..." className="w-full bg-gray-100 dark:bg-gray-800 pl-11 pr-4 py-3 rounded-2xl border-transparent focus:bg-white focus:ring-2 ring-amber-500 outline-none h-[50px] font-medium" value={searchTerm} onChange={e=>setSearchTerm(e.target.value)} />
                          </div>
                          
                          <div className="flex gap-2 shrink-0 overflow-x-auto hide-scrollbar">
                              <div className="relative">
                                  <select className="bg-gray-100 dark:bg-gray-800 rounded-2xl pl-4 pr-10 py-3 text-sm font-bold outline-none cursor-pointer h-[50px] appearance-none" value={filterCategory} onChange={e=>setFilterCategory(e.target.value)}>
                                      <option value="All">All Categories</option>
                                      <option value="General">General Info</option>
                                      <option value="Urgent">Urgent / Alert</option>
                                      <option value="Policy">Company Policy</option>
                                      <option value="Event">Event</option>
                                  </select>
                                  <Filter size={14} className="absolute right-4 top-4 pointer-events-none text-gray-500"/>
                              </div>
                              <div className="relative">
                                  <input type="month" className="bg-gray-100 dark:bg-gray-800 rounded-2xl px-4 py-3 text-sm font-bold outline-none cursor-pointer h-[50px]" value={selectedMonth} onChange={e=>setSelectedMonth(e.target.value)} />
                              </div>
                          </div>
                      </div>

                      {/* Actions */}
                      {canManageNotices && (
                          <div className="shrink-0 w-full xl:w-auto">
                             <button onClick={() => setIsFormOpen(true)} className="w-full md:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-amber-500 text-white rounded-2xl text-sm font-bold hover:bg-amber-600 shadow-lg shadow-amber-200 transition-all active:scale-95 h-[50px]"><Plus size={20}/> Publish Notice</button>
                          </div>
                      )}
                  </div>
               </div>

               {/* Board Content */}
               <div className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar bg-gray-100 dark:bg-gray-900/50">
                    {loading ? (
                        <div className="h-full flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500"></div></div>
                    ) : filteredNotices.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-gray-400 space-y-4">
                            <Megaphone size={48} className="opacity-20"/>
                            <p className="font-medium text-lg text-gray-500">No notices found.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3 gap-6 max-w-[1800px] mx-auto pb-20">
                            <AnimatePresence>
                                {filteredNotices.map((notice) => (
                                    <motion.div 
                                        key={notice.id}
                                        layout
                                        initial={{ opacity: 0, scale: 0.9 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.9 }}
                                        className="bg-white dark:bg-gray-800 rounded-3xl p-6 shadow-sm border border-gray-200 dark:border-gray-700 flex flex-col hover:shadow-xl transition-shadow relative overflow-hidden group"
                                    >
                                        {/* Highlight bar for urgent */}
                                        {notice.category === 'Urgent' && <div className="absolute top-0 left-0 right-0 h-1.5 bg-rose-500"></div>}

                                        <div className="flex justify-between items-start mb-4">
                                            <span className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${getCategoryStyles(notice.category)}`}>
                                                {getCategoryIcon(notice.category)} {notice.category}
                                            </span>
                                            
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs font-bold text-gray-400 flex items-center gap-1.5 bg-gray-50 dark:bg-gray-700/50 px-3 py-1 rounded-lg">
                                                    <CalendarDays size={14}/> {formatDate(notice.displayDate || notice.createdAt)}
                                                </span>
                                                {canManageNotices && (
                                                    <button onClick={()=>handleDelete(notice.id)} className="p-1.5 text-gray-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100">
                                                        <Trash2 size={16}/>
                                                    </button>
                                                )}
                                            </div>
                                        </div>

                                        <h3 className="text-xl font-black text-gray-900 dark:text-white mb-3 leading-tight">{notice.title}</h3>
                                        
                                        <div className="flex-1 bg-gray-50 dark:bg-gray-900/50 p-4 rounded-2xl border border-gray-100 dark:border-gray-700 mb-4">
                                            <p className="text-sm text-gray-600 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">{notice.content}</p>
                                        </div>

                                        <div className="flex items-center justify-between pt-4 border-t border-gray-100 dark:border-gray-700 shrink-0 mt-auto">
                                            <div className="flex items-center gap-2 text-xs font-bold text-gray-500">
                                                <div className="h-6 w-6 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center">{notice.postedBy?.charAt(0) || 'A'}</div>
                                                By {notice.postedBy || 'Admin'}
                                            </div>
                                            
                                            <button 
                                                onClick={() => handleDownloadPDF(notice)} 
                                                className="flex items-center gap-2 px-4 py-2 bg-violet-50 text-violet-600 hover:bg-violet-100 rounded-xl text-xs font-black transition-colors border border-violet-100"
                                            >
                                                <Download size={14}/> Download PDF
                                            </button>
                                        </div>
                                    </motion.div>
                                ))}
                            </AnimatePresence>
                        </div>
                    )}
               </div>
            </div>

            <style>{`
              .custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
              .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
              .hide-scrollbar::-webkit-scrollbar { display: none; }
              .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
            `}</style>
        </div>
    );
};

export default NoticeBoardSystem;