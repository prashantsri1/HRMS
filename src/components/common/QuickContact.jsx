// src/pages/admin/QuickContact.jsx

import React, { useState, useMemo } from 'react';
import { 
    Search, Plus, Phone, Mail, Filter, Edit2, Trash2, 
    Briefcase, User, X, Check, ArrowDownAZ, ArrowUpAZ, Crown 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { collection, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../Firebase'; 
import { useCollection } from '../../hooks/useCollection';
import { useAuth } from '../../context/AuthContext';

// --- POP THEME CONFIG ---
const DEPT_STYLES = {
    'IT': 'bg-cyan-100 text-cyan-700 border-cyan-200 dark:bg-cyan-900/30 dark:text-cyan-400 dark:border-cyan-800',
    'HR': 'bg-pink-100 text-pink-700 border-pink-200 dark:bg-pink-900/30 dark:text-pink-400 dark:border-pink-800',
    'Sales': 'bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-800',
    'Marketing': 'bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-400 dark:border-purple-800',
    'Management': 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800',
    'Finance': 'bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-800',
    'Default': 'bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700'
};

// 🔥 HIERARCHY LEVELS
const ROLE_LEVELS = {
    'super_admin': 4,
    'admin': 3,
    'hr': 2,
    'employee': 1
};

const cardVariants = {
    hidden: { opacity: 0, scale: 0.8, y: 20 },
    visible: { opacity: 1, scale: 1, y: 0, transition: { type: 'spring', stiffness: 200, damping: 15 } },
    exit: { opacity: 0, scale: 0.8, transition: { duration: 0.2 } }
};

const QuickContact = () => {
    const { userProfile } = useAuth();
    const { documents: contacts } = useCollection('contacts'); 
    
    const role = userProfile?.role || 'employee';
    const currentLevel = ROLE_LEVELS[role] || 0;
    const isSuperAdmin = role === 'super_admin';
    const canManage = currentLevel >= 2; // HR, Admin, Super Admin

    const [searchTerm, setSearchTerm] = useState('');
    const [filterDept, setFilterDept] = useState('All');
    const [sortBy, setSortBy] = useState('name'); // 'name' | 'role'
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingContact, setEditingContact] = useState(null);

    // --- FORM STATE ---
    const initialForm = { name: '', role: '', department: 'IT', email: '', phone: '', avatarColor: '' };
    const [formData, setFormData] = useState(initialForm);

    // --- HANDLERS ---
    const handleEdit = (contact) => {
        setEditingContact(contact);
        setFormData(contact);
        setIsModalOpen(true);
    };

    const handleDelete = async (id) => {
        if(window.confirm('Are you sure you want to pop this contact out of existence? 🎈')) {
            await deleteDoc(doc(db, 'contacts', id));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editingContact) {
                await updateDoc(doc(db, 'contacts', editingContact.id), formData);
            } else {
                // Random Vibrant Gradient for Avatar
                const gradients = [
                    'from-pink-500 to-rose-400', 'from-indigo-500 to-blue-400', 
                    'from-emerald-400 to-teal-400', 'from-orange-400 to-amber-400',
                    'from-purple-500 to-violet-400', 'from-cyan-400 to-sky-400'
                ];
                const randomColor = gradients[Math.floor(Math.random() * gradients.length)];
                
                await addDoc(collection(db, 'contacts'), { 
                    ...formData, 
                    avatarColor: randomColor,
                    createdAt: serverTimestamp() 
                });
            }
            setIsModalOpen(false);
            setFormData(initialForm);
            setEditingContact(null);
        } catch (err) {
            console.error(err);
            alert('Error saving contact');
        }
    };

    // --- FILTER & SORT LOGIC ---
    const processedContacts = useMemo(() => {
        if (!contacts) return [];
        
        let result = contacts.filter(c => {
            const matchSearch = c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                                c.role.toLowerCase().includes(searchTerm.toLowerCase());
            const matchDept = filterDept === 'All' || c.department === filterDept;
            return matchSearch && matchDept;
        });

        result.sort((a, b) => {
            const valA = (sortBy === 'name' ? a.name : a.role).toLowerCase();
            const valB = (sortBy === 'name' ? b.name : b.role).toLowerCase();
            return valA.localeCompare(valB);
        });

        return result;
    }, [contacts, searchTerm, filterDept, sortBy]);

    const departments = ['All', ...new Set(contacts?.map(c => c.department) || [])].sort();

    return (
        <div className="h-screen flex flex-col bg-gray-50 dark:bg-gray-900 overflow-hidden relative font-sans">
            
            {/* --- POP HEADER --- */}
            <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl border-b border-gray-200 dark:border-gray-700 p-5 sticky top-0 z-20 shadow-sm">
                <div className="flex flex-col md:flex-row justify-between items-center gap-4 max-w-7xl mx-auto w-full">
                    
                    {/* Title Area */}
                    <div className="flex items-center gap-3 w-full md:w-auto">
                        <motion.div 
                            whileHover={{ rotate: 15, scale: 1.1 }}
                            className="bg-gradient-to-tr from-indigo-600 to-purple-500 p-3 rounded-2xl shadow-lg shadow-indigo-500/30 text-white"
                        >
                            <User size={28} strokeWidth={2.5} />
                        </motion.div>
                        <div>
                            <h1 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 dark:from-indigo-400 dark:to-pink-400 flex items-center gap-2">
                                Quick Connect
                                {isSuperAdmin && <span className="text-xs bg-amber-100 text-amber-700 border border-amber-200 px-2 py-1 rounded-full"><Crown size={12} className="inline mr-1"/>Owner</span>}
                            </h1>
                            <p className="text-xs text-gray-500 dark:text-gray-400 font-bold uppercase tracking-widest">Team Directory</p>
                        </div>
                    </div>

                    {/* Controls Area */}
                    <div className="flex flex-wrap gap-3 w-full md:w-auto justify-end items-center">
                        {/* Search Bar */}
                        <div className="relative group flex-1 md:flex-none">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-indigo-500 transition-colors" size={18} />
                            <input 
                                type="text" 
                                placeholder="Find someone..." 
                                className="w-full md:w-64 pl-10 pr-4 py-2.5 bg-gray-100 dark:bg-gray-700/50 border-2 border-transparent focus:border-indigo-500/50 rounded-xl text-sm font-bold focus:ring-0 transition-all outline-none dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>

                        {/* Department Filter */}
                        <div className="relative">
                            <select 
                                className="appearance-none pl-10 pr-8 py-2.5 bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-xl text-sm font-bold text-gray-600 dark:text-gray-300 focus:border-indigo-500 outline-none cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                                value={filterDept}
                                onChange={(e) => setFilterDept(e.target.value)}
                            >
                                {departments.map(d => <option key={d} value={d}>{d}</option>)}
                            </select>
                            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-indigo-500" size={16}/>
                        </div>

                        {/* Sort Button */}
                        <motion.button 
                            whileTap={{ scale: 0.9 }}
                            onClick={() => setSortBy(prev => prev === 'name' ? 'role' : 'name')}
                            className="p-2.5 bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-xl text-gray-500 hover:text-indigo-600 hover:border-indigo-200 transition-all shadow-sm"
                            title={`Sort by ${sortBy === 'name' ? 'Role' : 'Name'}`}
                        >
                            {sortBy === 'name' ? <ArrowDownAZ size={20}/> : <Briefcase size={20}/>}
                        </motion.button>

                        {/* Add Button (RBAC) */}
                        {canManage && (
                            <motion.button 
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => { setEditingContact(null); setFormData(initialForm); setIsModalOpen(true); }}
                                className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl font-bold shadow-lg shadow-indigo-500/30 flex items-center gap-2"
                            >
                                <Plus size={20} strokeWidth={3}/> <span className="hidden sm:inline">Add</span>
                            </motion.button>
                        )}
                    </div>
                </div>
            </div>

            {/* --- GRID CONTENT --- */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-8 custom-scrollbar">
                <motion.div 
                    layout 
                    className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6 max-w-7xl mx-auto"
                >
                    <AnimatePresence>
                        {processedContacts.map((contact) => (
                            <ContactCard 
                                key={contact.id} 
                                contact={contact} 
                                canManage={canManage}
                                onEdit={handleEdit}
                                onDelete={handleDelete}
                            />
                        ))}
                    </AnimatePresence>
                </motion.div>
                
                {processedContacts.length === 0 && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center h-64 text-gray-400">
                        <Search size={64} className="mb-4 opacity-20 text-indigo-500"/>
                        <p className="font-bold text-lg">No contacts found.</p>
                        <p className="text-sm">Try adjusting your filters.</p>
                    </motion.div>
                )}
            </div>

            {/* --- POP MODAL --- */}
            <AnimatePresence>
                {isModalOpen && canManage && (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                        <motion.div 
                            initial={{ scale: 0.8, opacity: 0, rotateX: 10 }} 
                            animate={{ scale: 1, opacity: 1, rotateX: 0 }} 
                            exit={{ scale: 0.8, opacity: 0, rotateX: -10 }}
                            className="bg-white dark:bg-gray-800 w-full max-w-md rounded-[2rem] shadow-2xl overflow-hidden border-4 border-indigo-100 dark:border-gray-700"
                        >
                            <div className="p-6 bg-gradient-to-r from-indigo-600 to-purple-600 relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-4 opacity-10"><User size={120} /></div>
                                <h2 className="text-2xl font-black text-white flex items-center gap-2 relative z-10">
                                    {editingContact ? <Edit2 size={24}/> : <Plus size={24}/>} 
                                    {editingContact ? 'Edit Contact' : 'New Contact'}
                                </h2>
                                <p className="text-indigo-100 text-sm mt-1 font-medium relative z-10">Enter employee details below.</p>
                            </div>

                            <form onSubmit={handleSubmit} className="p-6 space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1 ml-1">Full Name</label>
                                    <input required className="input-pop" value={formData.name} onChange={e=>setFormData({...formData, name: e.target.value})} placeholder="e.g. John Doe" />
                                </div>
                                
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1 ml-1">Department</label>
                                        <select className="input-pop" value={formData.department} onChange={e=>setFormData({...formData, department: e.target.value})}>
                                            <option>IT</option><option>HR</option><option>Sales</option><option>Marketing</option><option>Management</option><option>Finance</option><option>Operations</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1 ml-1">Designation</label>
                                        <input required className="input-pop" value={formData.role} onChange={e=>setFormData({...formData, role: e.target.value})} placeholder="e.g. Manager" />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1 ml-1">Email Address</label>
                                    <input required type="email" className="input-pop" value={formData.email} onChange={e=>setFormData({...formData, email: e.target.value})} placeholder="john@company.com" />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1 ml-1">Phone Number</label>
                                    <input required type="tel" className="input-pop" value={formData.phone} onChange={e=>setFormData({...formData, phone: e.target.value})} placeholder="+91 98765 43210" />
                                </div>

                                <div className="pt-4 flex gap-3">
                                    <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-3 text-gray-500 font-bold hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors">Cancel</button>
                                    <motion.button whileTap={{ scale: 0.95 }} type="submit" className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg shadow-indigo-500/30 flex items-center justify-center gap-2"><Check size={20}/> Save</motion.button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            <style>{`
                .input-pop { width: 100%; padding: 0.75rem 1rem; background-color: #f3f4f6; border: 2px solid transparent; border-radius: 0.75rem; outline: none; font-weight: 600; transition: all 0.2s; }
                .dark .input-pop { background-color: #1f2937; color: white; }
                .input-pop:focus { border-color: #6366f1; background-color: white; box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.1); }
                .dark .input-pop:focus { background-color: #111827; }
                .custom-scrollbar::-webkit-scrollbar { width: 6px; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
            `}</style>
        </div>
    );
};

// --- SUB COMPONENT: CONTACT CARD ---
const ContactCard = ({ contact, canManage, onEdit, onDelete }) => {
    const deptStyle = DEPT_STYLES[contact.department] || DEPT_STYLES['Default'];

    return (
        <motion.div 
            layout
            variants={cardVariants}
            initial="hidden" 
            animate="visible" 
            exit="exit"
            className="group relative bg-white dark:bg-gray-800 rounded-[2rem] p-6 border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-2xl hover:-translate-y-1 transition-all duration-300"
        >
            {/* Decorative Blob */}
            <div className={`absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl ${contact.avatarColor || 'from-gray-100 to-gray-200'} opacity-10 rounded-bl-[2rem] rounded-tr-[2rem] pointer-events-none`}></div>

            {/* Admin Actions */}
            {canManage && (
                <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity translate-y-2 group-hover:translate-y-0 duration-300">
                    <motion.button whileHover={{ scale: 1.1 }} onClick={() => onEdit(contact)} className="p-2 bg-white dark:bg-gray-700 text-indigo-600 rounded-xl shadow-md border border-gray-100 dark:border-gray-600"><Edit2 size={16}/></motion.button>
                    <motion.button whileHover={{ scale: 1.1 }} onClick={() => onDelete(contact.id)} className="p-2 bg-white dark:bg-gray-700 text-red-500 rounded-xl shadow-md border border-gray-100 dark:border-gray-600"><Trash2 size={16}/></motion.button>
                </div>
            )}

            {/* Header Info */}
            <div className="flex items-center gap-4 mb-5 relative z-10">
                <motion.div 
                    whileHover={{ rotate: 10 }}
                    className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${contact.avatarColor || 'from-gray-400 to-gray-600'} flex items-center justify-center text-white text-2xl font-black shadow-lg shadow-gray-200 dark:shadow-none`}
                >
                    {contact.name.charAt(0)}
                </motion.div>
                <div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white leading-tight">{contact.name}</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 font-medium mb-1">{contact.role}</p>
                    <span className={`inline-block text-[10px] px-2.5 py-0.5 rounded-full border font-bold uppercase tracking-wider ${deptStyle}`}>
                        {contact.department}
                    </span>
                </div>
            </div>

            {/* Contact Details */}
            <div className="space-y-3">
                <a href={`mailto:${contact.email}`} className="flex items-center gap-3 p-3 rounded-2xl bg-gray-50 dark:bg-gray-900/50 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 group/link transition-all border border-transparent hover:border-indigo-100 dark:hover:border-indigo-800">
                    <div className="p-2 bg-white dark:bg-gray-800 rounded-xl text-gray-400 group-hover/link:text-indigo-500 shadow-sm transition-colors"><Mail size={18}/></div>
                    <span className="text-xs font-bold text-gray-600 dark:text-gray-300 truncate">{contact.email}</span>
                </a>
                <a href={`tel:${contact.phone}`} className="flex items-center gap-3 p-3 rounded-2xl bg-gray-50 dark:bg-gray-900/50 hover:bg-green-50 dark:hover:bg-green-900/20 group/link transition-all border border-transparent hover:border-green-100 dark:hover:border-green-800">
                    <div className="p-2 bg-white dark:bg-gray-800 rounded-xl text-gray-400 group-hover/link:text-green-500 shadow-sm transition-colors"><Phone size={18}/></div>
                    <span className="text-xs font-bold text-gray-600 dark:text-gray-300">{contact.phone}</span>
                </a>
            </div>
        </motion.div>
    );
};

export default QuickContact;