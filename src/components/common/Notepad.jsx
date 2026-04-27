import React, { useState, useEffect, useMemo } from 'react';
import { 
  Plus, Calendar as CalIcon, ChevronLeft, ChevronRight, Pin, 
  Trash2, X, Palette, Save, Edit3, Check 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { collection, addDoc, updateDoc, deleteDoc, doc, query, where, onSnapshot, serverTimestamp, orderBy } from 'firebase/firestore';
import { db } from '../../Firebase';
import { useAuth } from '../../context/AuthContext';

// --- GOOGLE KEEP STYLE COLORS ---
const COLORS = [
  { id: 'white', bg: 'bg-white dark:bg-gray-800', border: 'border-gray-200 dark:border-gray-700' },
  { id: 'red', bg: 'bg-red-100 dark:bg-red-900/30', border: 'border-red-200 dark:border-red-800' },
  { id: 'orange', bg: 'bg-orange-100 dark:bg-orange-900/30', border: 'border-orange-200 dark:border-orange-800' },
  { id: 'yellow', bg: 'bg-yellow-100 dark:bg-yellow-900/30', border: 'border-yellow-200 dark:border-yellow-800' },
  { id: 'green', bg: 'bg-green-100 dark:bg-green-900/30', border: 'border-green-200 dark:border-green-800' },
  { id: 'teal', bg: 'bg-teal-100 dark:bg-teal-900/30', border: 'border-teal-200 dark:border-teal-800' },
  { id: 'blue', bg: 'bg-blue-100 dark:bg-blue-900/30', border: 'border-blue-200 dark:border-blue-800' },
  { id: 'purple', bg: 'bg-purple-100 dark:bg-purple-900/30', border: 'border-purple-200 dark:border-purple-800' },
  { id: 'pink', bg: 'bg-pink-100 dark:bg-pink-900/30', border: 'border-pink-200 dark:border-pink-800' },
];

const Notepad = () => {
  const { currentUser } = useAuth();
  
  // State
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]); // YYYY-MM-DD
  const [notes, setNotes] = useState([]);
  const [isInputExpanded, setIsInputExpanded] = useState(false);
  const [loading, setLoading] = useState(true);
  
  // Edit Modal State
  const [editingNote, setEditingNote] = useState(null);

  // Form State
  const initialForm = { title: '', content: '', color: 'white', isPinned: false };
  const [formData, setFormData] = useState(initialForm);

  // --- FETCH NOTES REALTIME ---
  useEffect(() => {
    if (!currentUser) return;

    setLoading(true);
    const q = query(
      collection(db, 'notes'),
      where('userId', '==', currentUser.uid),
      where('date', '==', selectedDate),
      orderBy('createdAt', 'desc') // Latest first
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedNotes = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setNotes(fetchedNotes);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [currentUser, selectedDate]);

  // --- HANDLERS ---
  
  const handleDateChange = (days) => {
    const date = new Date(selectedDate);
    date.setDate(date.getDate() + days);
    setSelectedDate(date.toISOString().split('T')[0]);
  };

  const handleSave = async () => {
    if (!formData.title.trim() && !formData.content.trim()) {
      setIsInputExpanded(false);
      return;
    }

    try {
      await addDoc(collection(db, 'notes'), {
        ...formData,
        date: selectedDate,
        userId: currentUser.uid,
        createdAt: serverTimestamp()
      });
      setFormData(initialForm);
      setIsInputExpanded(false);
    } catch (error) {
      console.error("Error saving note:", error);
    }
  };

  const handleUpdate = async () => {
    if (!editingNote) return;
    try {
      await updateDoc(doc(db, 'notes', editingNote.id), {
        title: editingNote.title,
        content: editingNote.content,
        color: editingNote.color,
        isPinned: editingNote.isPinned
      });
      setEditingNote(null);
    } catch (error) {
      console.error("Error updating note:", error);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Delete this note?")) {
      await deleteDoc(doc(db, 'notes', id));
      if (editingNote?.id === id) setEditingNote(null);
    }
  };

  const togglePin = async (e, note) => {
    e.stopPropagation();
    await updateDoc(doc(db, 'notes', note.id), { isPinned: !note.isPinned });
  };

  // --- CATEGORIZED NOTES ---
  const pinnedNotes = notes.filter(n => n.isPinned);
  const otherNotes = notes.filter(n => !n.isPinned);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 sm:p-8 font-sans flex flex-col items-center">
      
      {/* --- HEADER & DATE NAVIGATOR --- */}
      <div className="w-full max-w-5xl flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
        <h1 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-500 to-orange-600 dark:from-amber-400 dark:to-orange-400 flex items-center gap-3">
          <span className="bg-orange-100 dark:bg-orange-900/30 p-2 rounded-xl text-orange-600 dark:text-orange-400"><Edit3 size={28}/></span>
          Daily Notes
        </h1>

        <div className="flex items-center gap-4 bg-white dark:bg-gray-800 p-2 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700">
           <button onClick={() => handleDateChange(-1)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors"><ChevronLeft/></button>
           <div className="flex items-center gap-2 px-2 font-bold text-gray-700 dark:text-gray-200 min-w-[140px] justify-center">
              <CalIcon size={18} className="text-orange-500"/>
              {new Date(selectedDate).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}
           </div>
           <button onClick={() => handleDateChange(1)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors"><ChevronRight/></button>
        </div>
      </div>

      {/* --- CREATE NOTE INPUT (Google Keep Style) --- */}
      <div className="w-full max-w-2xl relative z-20 mb-10">
        <motion.div 
          layout
          className={`bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden transition-all ${isInputExpanded ? 'p-4' : 'p-0'}`}
        >
          {isInputExpanded && (
            <input 
              type="text" 
              placeholder="Title" 
              className="w-full text-lg font-bold bg-transparent outline-none text-gray-800 dark:text-white mb-3 placeholder-gray-400"
              value={formData.title}
              onChange={(e) => setFormData({...formData, title: e.target.value})}
            />
          )}
          
          <textarea 
            placeholder="Take a note..." 
            className={`w-full bg-transparent outline-none text-gray-700 dark:text-gray-200 resize-none placeholder-gray-500 ${isInputExpanded ? 'min-h-[100px]' : 'p-4 h-14'}`}
            value={formData.content}
            onClick={() => setIsInputExpanded(true)}
            onChange={(e) => setFormData({...formData, content: e.target.value})}
          />

          {isInputExpanded && (
            <div className="flex justify-between items-center mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
              <div className="flex gap-1">
                {COLORS.slice(0, 5).map(c => (
                  <button 
                    key={c.id} 
                    onClick={() => setFormData({...formData, color: c.id})}
                    className={`w-6 h-6 rounded-full border ${c.bg} ${c.border} ${formData.color === c.id ? 'ring-2 ring-offset-2 ring-gray-400' : ''}`}
                  />
                ))}
                <button 
                   onClick={() => setFormData({...formData, isPinned: !formData.isPinned})}
                   className={`p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ml-2 ${formData.isPinned ? 'text-gray-900 dark:text-white bg-gray-200 dark:bg-gray-600' : 'text-gray-400'}`}
                >
                   <Pin size={18} fill={formData.isPinned ? "currentColor" : "none"}/>
                </button>
              </div>
              <div className="flex gap-2">
                 <button onClick={() => setIsInputExpanded(false)} className="px-4 py-1.5 text-sm font-bold text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">Close</button>
                 <button onClick={handleSave} className="px-6 py-1.5 text-sm font-bold bg-orange-500 hover:bg-orange-600 text-white rounded-lg shadow-md transition-transform active:scale-95">Save</button>
              </div>
            </div>
          )}
        </motion.div>
      </div>

      {/* --- NOTES GRID --- */}
      <div className="w-full max-w-6xl space-y-8 pb-20">
         {loading && <div className="text-center text-gray-400 animate-pulse">Loading your thoughts...</div>}

         {/* Pinned Section */}
         {pinnedNotes.length > 0 && (
           <div>
             <h6 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4 ml-2">Pinned</h6>
             <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
               {pinnedNotes.map(note => <NoteCard key={note.id} note={note} onPin={togglePin} onClick={() => setEditingNote(note)} />)}
             </div>
           </div>
         )}

         {/* Others Section */}
         {otherNotes.length > 0 && (
           <div>
             {pinnedNotes.length > 0 && <h6 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4 ml-2 mt-4">Others</h6>}
             <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
               {otherNotes.map(note => <NoteCard key={note.id} note={note} onPin={togglePin} onClick={() => setEditingNote(note)} />)}
             </div>
           </div>
         )}
         
         {!loading && notes.length === 0 && (
            <div className="text-center py-20 opacity-50">
               <div className="w-24 h-24 bg-gray-200 dark:bg-gray-800 rounded-full mx-auto mb-4 flex items-center justify-center">
                  <Edit3 size={40} className="text-gray-400"/>
               </div>
               <p className="text-gray-500 font-bold">No notes for this day.</p>
            </div>
         )}
      </div>

      {/* --- EDIT MODAL --- */}
      <AnimatePresence>
        {editingNote && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
             <motion.div 
               initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
               className={`w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden p-6 relative ${COLORS.find(c => c.id === editingNote.color)?.bg || 'bg-white'} dark:bg-gray-800 transition-colors duration-300`}
             >
                <input 
                  className="w-full text-xl font-bold bg-transparent outline-none text-gray-900 dark:text-white mb-4 placeholder-gray-500"
                  value={editingNote.title}
                  onChange={(e) => setEditingNote({...editingNote, title: e.target.value})}
                  placeholder="Title"
                />
                <textarea 
                  className="w-full bg-transparent outline-none text-gray-800 dark:text-gray-200 resize-none min-h-[150px] placeholder-gray-500 custom-scrollbar"
                  value={editingNote.content}
                  onChange={(e) => setEditingNote({...editingNote, content: e.target.value})}
                  placeholder="Note content..."
                />
                
                <div className="flex justify-between items-center mt-6 pt-4 border-t border-black/5 dark:border-white/10">
                   <div className="flex gap-1.5 flex-wrap">
                      {COLORS.map(c => (
                        <button 
                          key={c.id} 
                          onClick={() => setEditingNote({...editingNote, color: c.id})}
                          className={`w-6 h-6 rounded-full border ${c.bg} ${c.border} ${editingNote.color === c.id ? 'ring-2 ring-gray-400 ring-offset-1' : ''}`}
                        />
                      ))}
                   </div>
                   <div className="flex gap-3">
                      <button onClick={() => handleDelete(editingNote.id)} className="p-2 text-gray-500 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"><Trash2 size={20}/></button>
                      <button onClick={handleUpdate} className="px-6 py-2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-bold rounded-xl shadow-lg active:scale-95 transition-transform">Done</button>
                   </div>
                </div>
                
                {/* Pin Button Absolute */}
                <button 
                   onClick={() => setEditingNote({...editingNote, isPinned: !editingNote.isPinned})}
                   className={`absolute top-4 right-4 p-2 rounded-full hover:bg-black/5 transition-colors ${editingNote.isPinned ? 'text-gray-900 dark:text-white' : 'text-gray-400'}`}
                >
                   <Pin size={20} fill={editingNote.isPinned ? "currentColor" : "none"}/>
                </button>
             </motion.div>
          </div>
        )}
      </AnimatePresence>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }
      `}</style>
    </div>
  );
};

// --- SUB COMPONENT: NOTE CARD ---
const NoteCard = ({ note, onPin, onClick }) => {
  const style = COLORS.find(c => c.id === note.color) || COLORS[0];

  return (
    <motion.div 
      layout
      initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}
      onClick={onClick}
      className={`group relative p-5 rounded-2xl border ${style.bg} ${style.border} shadow-sm hover:shadow-md cursor-pointer transition-all duration-200 hover:-translate-y-1 flex flex-col gap-2 min-h-[120px]`}
    >
      <div className="flex justify-between items-start">
         {note.title && <h3 className="font-bold text-gray-900 dark:text-white line-clamp-2 text-base leading-tight">{note.title}</h3>}
         <button 
           onClick={(e) => onPin(e, note)}
           className={`opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-full hover:bg-black/5 ${note.isPinned ? 'opacity-100 text-gray-800 dark:text-white' : 'text-gray-400'}`}
         >
           <Pin size={16} fill={note.isPinned ? "currentColor" : "none"} />
         </button>
      </div>
      <p className="text-sm text-gray-700 dark:text-gray-200 whitespace-pre-wrap break-words line-clamp-[8]">{note.content}</p>
    </motion.div>
  );
};

export default Notepad;