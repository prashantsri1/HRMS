// src/components/common/SharedDocs.jsx

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useFirestore } from '../../hooks/useFirestore';
import { useAuth } from '../../context/AuthContext'; 
import LoadingSpinner from '../../components/common/LoadingSpinner';
import * as XLSX from 'xlsx';
import { collection, query, where, getDocs, updateDoc, doc, writeBatch, addDoc, deleteDoc } from 'firebase/firestore'; 
import { db } from '../../Firebase'; 
import ExcelEditor from './ExcelEditor'; 

// ----------------------------------------------------------------------
// 🛠️ HELPER: DATE SORTER
// ----------------------------------------------------------------------
const getTimestamp = (t) => {
    if (!t) return 0;
    if (typeof t.toDate === 'function') return t.toDate().getTime(); 
    if (t instanceof Date) return t.getTime(); 
    return new Date(t).getTime() || 0; 
};

// ----------------------------------------------------------------------
// 👥 USER SELECTION MODAL (Unchanged)
// ----------------------------------------------------------------------
const UserSelector = ({ selectedUsers, setSelectedUsers, currentUserRole }) => {
    // ... (Same logic as before, just kept concise for this view)
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [admins, setAdmins] = useState([]); 

    useEffect(() => {
        const fetchUsers = async () => {
            try {
                const q = query(collection(db, "users"));
                const querySnapshot = await getDocs(q);
                const userList = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                userList.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
                
                const adminList = userList.filter(u => ['admin', 'super_admin'].includes(u.role)).map(u => u.id);
                setAdmins(adminList);
                
                const mandatorySelection = [...new Set([...selectedUsers, ...adminList])];
                if (mandatorySelection.length !== selectedUsers.length) {
                     setSelectedUsers(mandatorySelection);
                }
                
                setUsers(userList);
            } catch (err) { console.error(err); } 
            finally { setLoading(false); }
        };
        fetchUsers();
    }, []); 

    const toggleUser = (userId) => {
        if (admins.includes(userId)) return;
        if (selectedUsers.includes(userId)) {
            setSelectedUsers(selectedUsers.filter(id => id !== userId));
        } else {
            setSelectedUsers([...selectedUsers, userId]);
        }
    };

    if (loading) return <p className="text-xs text-gray-500 animate-pulse">Loading users...</p>;

    return (
        <div className="mb-4 border border-gray-200 dark:border-gray-700 p-3 rounded-lg bg-gray-50 dark:bg-gray-900/50 max-h-60 overflow-y-auto custom-scrollbar shadow-inner">
            <label className="block text-sm font-bold mb-3 text-gray-700 dark:text-gray-300 flex justify-between items-center sticky top-0 bg-gray-50 dark:bg-gray-900/90 backdrop-blur-sm pb-2 border-b border-gray-200 dark:border-gray-700 z-10">
                <span>Select People to Share With:</span>
                <span className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 px-2 py-0.5 rounded-full font-medium">{selectedUsers.length} selected</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {users.map(user => {
                    const isAdminUser = ['admin', 'super_admin'].includes(user.role);
                    const isLocked = isAdminUser; 
                    return (
                        <div key={user.id} onClick={() => !isLocked && toggleUser(user.id)} className={`cursor-pointer p-2.5 text-xs rounded-lg border flex items-center gap-3 transition-all duration-200 ${selectedUsers.includes(user.id) ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-500 dark:border-blue-500 shadow-sm ring-1 ring-blue-500' : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 hover:border-gray-300 dark:hover:border-gray-600'} ${isLocked ? 'opacity-60 cursor-not-allowed bg-gray-100 dark:bg-gray-800/50' : ''}`}>
                            <input type="checkbox" checked={selectedUsers.includes(user.id)} readOnly className="accent-blue-600 w-4 h-4 cursor-pointer rounded" disabled={isLocked} />
                            <div className="flex flex-col truncate w-full">
                                <span className="font-semibold text-gray-800 dark:text-gray-200 truncate flex items-center gap-1">{user.name || user.email} {isLocked && <span className="text-[9px] bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 px-1 rounded border border-red-200 dark:border-red-800">ADMIN</span>}</span>
                                <div className="flex items-center gap-2 mt-1"><span className="text-[10px] text-gray-500 dark:text-gray-400">{user.empId}</span></div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

// ----------------------------------------------------------------------
// 📂 COMPONENT: FOLDER BROWSER
// ----------------------------------------------------------------------
const FolderBrowser = ({ parentId, parentName, onSelect, onBack, isRoot, parentFolder }) => {
    const { userProfile, currentUser } = useAuth();
    
    if (!currentUser) return <LoadingSpinner message="Authenticating..." />;

    const role = userProfile?.role || 'employee';
    const isSuperAdmin = role === 'super_admin';
    const isAdmin = role === 'admin';
    const canCreate = true; 

    const [isCreating, setIsCreating] = useState(false);
    const [newFolderName, setNewFolderName] = useState('');
    const [newFields, setNewFields] = useState(['Name', 'Contact Number', 'Address']); 
    const [sharedWith, setSharedWith] = useState([currentUser.uid]); 
    
    const [manageAccessItem, setManageAccessItem] = useState(null);
    const [tempSharedWith, setTempSharedWith] = useState([]);
    const [importFile, setImportFile] = useState(null); 
    const [showImportModal, setShowImportModal] = useState(false); 
    const [isProcessingImport, setIsProcessingImport] = useState(false); 
    const [userMap, setUserMap] = useState({});

    useEffect(() => {
        const fetchUserMap = async () => {
            try {
                const q = query(collection(db, "users"));
                const snap = await getDocs(q);
                const map = {};
                snap.docs.forEach(doc => { const d = doc.data(); map[doc.id] = d.name || d.email; });
                setUserMap(map);
            } catch (err) { console.error("Failed to load user map", err); }
        };
        fetchUserMap();
    }, []);

    // 🔥 FIX: QUERY LOGIC
    const folderFilters = useMemo(() => {
        // If Root: 
        if (isRoot) {
            if (isSuperAdmin || isAdmin) return [['parentId', '==', 'ROOT']];
            return [['parentId', '==', 'ROOT'], ['sharedWith', 'array-contains', currentUser.uid]];
        }
        
        // If Inside a Folder:
        // We fundamentally trust that if you could click the parent, you can see the children.
        // BUT Firestore Rules might demand you are in 'sharedWith' of the CHILD too.
        // So we request: parentId == ID AND (if not admin) sharedWith contains ME.
        // NOTE: This assumes 'sharedWith' is correctly propagated to children (which we fixed in handleCreate).
        
        if (isSuperAdmin || isAdmin) return [['parentId', '==', parentId]];
        
        // For Employees inside a folder:
        // We explicitly look for items that have been shared with them.
        return [['parentId', '==', parentId], ['sharedWith', 'array-contains', currentUser.uid]];
        
    }, [parentId, isRoot, isSuperAdmin, isAdmin, currentUser.uid]);

    const { data: rawItems, loading, addDocument, deleteDocument } = useFirestore('shared_folders', folderFilters);
    
    const items = useMemo(() => {
        if(!rawItems) return [];
        return [...rawItems].sort((a, b) => getTimestamp(a.createdAt) - getTimestamp(b.createdAt));
    }, [rawItems]);

    const fileInputRef = useRef(null);
    const { addDocument: addDataEntry } = useFirestore('shared_data');

    const handleFileSelect = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setImportFile(file);
        
        // 🔥 INHERITANCE FIX FOR IMPORT
        if (isRoot) {
            setSharedWith([currentUser.uid]); 
        } else {
            // Use parent's sharing list + creator
            const inherited = parentFolder?.sharedWith || [];
            setSharedWith([...new Set([...inherited, currentUser.uid])]);
        }
        setShowImportModal(true);
        e.target.value = "";
    };

    const handleExecuteImport = async () => {
        if (!importFile) return;
        setIsProcessingImport(true);
        const fileName = importFile.name.replace(/\.[^/.]+$/, ""); 
        
        // Ensure final list is unique
        const finalSharedWith = [...new Set([...sharedWith, currentUser.uid])]; 
        
        const reader = new FileReader();
        reader.readAsArrayBuffer(importFile);
        
        reader.onload = async (event) => {
            try {
                const data = new Uint8Array(event.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                
                const parentFolderId = await addDocument({ 
                    name: fileName, 
                    type: 'workbook', 
                    parentId: isRoot ? 'ROOT' : parentId, 
                    sharedWith: finalSharedWith, 
                    createdBy: currentUser.uid, 
                    createdAt: new Date() 
                });

                for (const sheetName of workbook.SheetNames) {
                    const sheet = workbook.Sheets[sheetName];
                    const jsonDataWithHeader = XLSX.utils.sheet_to_json(sheet, { header: 1 });
                    if (!jsonDataWithHeader || !jsonDataWithHeader.length) continue;
                    const headers = jsonDataWithHeader[0];
                    const rowData = XLSX.utils.sheet_to_json(sheet);
                    if (headers && headers.length > 0) {
                        // Sheets essentially inherit permissions from their workbook container usually,
                        // but if we query them as 'shared_folders' type, they need 'sharedWith' too.
                        const sheetId = await addDocument({ 
                            name: sheetName, 
                            type: 'sheet', 
                            parentId: parentFolderId, 
                            sharedWith: finalSharedWith, // 🔥 Propagate to Sheets too
                            fields: headers, 
                            createdBy: currentUser.uid,
                            createdAt: new Date() 
                        });
                        const uploadPromises = rowData.map((row, index) => addDataEntry({ ...row, folderId: sheetId, createdAt: new Date(), _sortIndex: index }));
                        await Promise.all(uploadPromises);
                    }
                }
                alert("Success! Imported & Shared.");
                closeImportModal();
            } catch (error) { console.error(error); alert("Import Failed: " + error.message); setIsProcessingImport(false); }
        };
    };

    const closeImportModal = () => { setShowImportModal(false); setImportFile(null); setSharedWith([]); setIsProcessingImport(false); };

    const openManageAccess = (e, item) => { 
        if (isSuperAdmin || isAdmin || item.createdBy === currentUser.uid) {
            e.stopPropagation(); setManageAccessItem(item); setTempSharedWith(item.sharedWith || []); 
        } else { alert("Permission Denied: Only the owner or Admin can manage access."); }
    };

    const handleSaveAccess = async () => {
        if (!manageAccessItem) return;
        try { 
            const batch = writeBatch(db);
            const folderRef = doc(db, 'shared_folders', manageAccessItem.id);
            
            // 1. Update the Folder itself
            batch.update(folderRef, { sharedWith: tempSharedWith });

            // 2. 🔥 RECURSIVE UPDATE: Update ALL children (Sheets/Subfolders)
            // This ensures if you add a user to the main folder, they see the sheets inside.
            const childrenQ = query(collection(db, 'shared_folders'), where('parentId', '==', manageAccessItem.id));
            const childrenSnap = await getDocs(childrenQ);
            childrenSnap.forEach(child => {
                batch.update(child.ref, { sharedWith: tempSharedWith });
            });

            await batch.commit();
            alert("Access Updated for Folder & All Contents!"); 
            setManageAccessItem(null); 
        } 
        catch (error) { console.error(error); alert("Failed to update access."); }
    };

    const handleCreate = async (e) => {
        e.preventDefault();
        if (!newFolderName.trim()) return alert("Name required!");
        
        let finalSharedWith = [];
        
        if (isRoot) {
            finalSharedWith = [...new Set([...sharedWith, currentUser.uid])];
        } else {
            // 🔥 INHERITANCE FIX: 
            // If parentFolder is null (which shouldn't happen if logic is right), fallback to self.
            // But crucially, if creating inside, we MUST grab the parent's list.
            const inherited = parentFolder?.sharedWith || [];
            finalSharedWith = [...new Set([...inherited, currentUser.uid])];
        }

        const folderData = {
             name: newFolderName,
             parentId: isRoot ? 'ROOT' : parentId, 
             createdBy: currentUser.uid, 
             createdAt: new Date(),
             sharedWith: finalSharedWith 
        };

        if (isRoot || !parentId.includes('sheet')) { 
             if (isRoot) {
                 folderData.type = 'workbook';
                 await addDocument(folderData);
             } else {
                const cleaned = newFields.filter(f => f.trim() !== '');
                if (!cleaned.length) return alert("Columns required for a Sheet!");
                folderData.type = 'sheet';
                folderData.fields = cleaned;
                await addDocument(folderData);
             }
        }
        
        setIsCreating(false); setNewFolderName(''); setNewFields(['Name', 'Contact Number', 'Address']); setSharedWith([]);
    };

    const handleDelete = async (e, id, createdBy) => { 
        e.stopPropagation(); 
        if (isSuperAdmin || isAdmin || createdBy === currentUser.uid) { 
            if(window.confirm("Delete this item and ALL its contents?")) await deleteDocument(id); 
        } else { alert("Permission Denied: You can only delete items you created."); }
    };

    const handleAddField = () => setNewFields([...newFields, '']);
    const handleFieldChange = (i, v) => { const u = [...newFields]; u[i] = v; setNewFields(u); };

    const handleDownloadWorkbook = async (e, workbookItem) => {
        e.stopPropagation();
        try {
            const wb = XLSX.utils.book_new();
            const sheetsQuery = query(collection(db, 'shared_folders'), where('parentId', '==', workbookItem.id));
            const snap = await getDocs(sheetsQuery);
            if (snap.empty) {
                 if(workbookItem.type === 'sheet' && workbookItem.fields) {
                     // Single sheet logic could go here, for now alert
                     alert("Single sheet download not fully implemented in this view.");
                 } else {
                    return alert("No sheets found inside.");
                 }
            }
            
            for (const d of snap.docs) {
                const info = d.data();
                const dQuery = query(collection(db, 'shared_data'), where('folderId', '==', d.id));
                const dSnap = await getDocs(dQuery);
                const raw = dSnap.docs.map(doc => doc.data()).sort((a,b)=> (a._sortIndex||0)-(b._sortIndex||0));
                
                const clean = raw.map(r => { 
                    const obj={}; 
                    (info.fields||[]).forEach(f=> {
                        const val = r[f];
                        obj[f] = (val !== undefined && val !== null) ? val : '';
                    }); 
                    return obj; 
                });
                XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(clean), info.name||'Sheet');
            }
            XLSX.writeFile(wb, `${workbookItem.name}.xlsx`);
        } catch (e) { alert("Download Error"); }
    };

    if (isProcessingImport) return <LoadingSpinner message="Importing..." />;

    return (
        <div className="p-6 min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 transition-colors duration-300 relative">
            
            {/* Import & Share Modal */}
            {showImportModal && importFile && (
                <div className="fixed inset-0 bg-black/60 dark:bg-black/80 flex items-center justify-center z-[60] p-4 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-2xl w-full max-w-lg border border-gray-100 dark:border-gray-700">
                        <h3 className="text-xl font-bold mb-6 text-gray-800 dark:text-white flex items-center gap-2">📊 Import & Share</h3>
                        <div className="mb-6 bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl border border-blue-100 dark:border-blue-800 flex items-center gap-3">
                            <span className="text-3xl">📄</span>
                            <div>
                                <p className="text-xs text-blue-600 dark:text-blue-400 font-bold uppercase tracking-wide">Selected File</p>
                                <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">{importFile.name}</p>
                            </div>
                        </div>
                        {isRoot && <UserSelector selectedUsers={sharedWith} setSelectedUsers={setSharedWith} currentUserRole={role} />}
                        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-100 dark:border-gray-700">
                            <button onClick={closeImportModal} className="px-5 py-2.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition font-semibold text-sm">Cancel</button>
                            <button onClick={handleExecuteImport} className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-md transition font-bold text-sm flex items-center gap-2"><span>🚀</span> Upload & Share</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Manage Access Modal */}
            {manageAccessItem && (
                <div className="fixed inset-0 bg-black/60 dark:bg-black/80 flex items-center justify-center z-[60] p-4 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-2xl w-full max-w-lg border border-gray-100 dark:border-gray-700">
                        <h3 className="text-xl font-bold mb-2 text-gray-800 dark:text-white">Manage Access</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">Who can view & edit <span className="font-bold text-gray-800 dark:text-gray-200">"{manageAccessItem.name}"</span>?</p>
                        <UserSelector selectedUsers={tempSharedWith} setSelectedUsers={setTempSharedWith} currentUserRole={role} />
                        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-100 dark:border-gray-700">
                            <button onClick={() => setManageAccessItem(null)} className="px-5 py-2.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition font-semibold text-sm">Cancel</button>
                            <button onClick={handleSaveAccess} className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-md transition font-bold text-sm">Save Changes</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Header Section */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8 border-b border-gray-200 dark:border-gray-700 pb-6">
                <div className="flex items-center gap-4">
                    {!isRoot && (
                        <button onClick={onBack} className="p-2.5 rounded-full bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700 shadow-sm transition-all active:scale-95">
                            ⬅
                        </button>
                    )}
                    <div>
                        <h2 className="text-2xl md:text-3xl font-extrabold text-gray-800 dark:text-white flex items-center gap-3 tracking-tight">
                            {isRoot ? <span className="text-3xl">🗄️</span> : <span className="text-3xl">📂</span>}
                            {isRoot ? "Shared Documents" : parentName}
                        </h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 font-medium">{isRoot ? "Collaborate securely with your team" : "Manage sheets and data inside"}</p>
                    </div>
                </div>
                
                {canCreate && (
                    <div className="flex flex-wrap gap-3 w-full md:w-auto">
                        {isRoot && (
                            <>
                                <input type="file" accept=".xlsx, .xls" ref={fileInputRef} style={{ display: 'none' }} onChange={handleFileSelect} />
                                <button onClick={() => fileInputRef.current.click()} className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl shadow-lg shadow-emerald-500/20 transition-all font-semibold text-sm flex items-center gap-2 active:scale-95 flex-1 md:flex-none justify-center">
                                    📊 Import
                                </button>
                            </>
                        )}
                        <button onClick={() => setIsCreating(true)} className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl shadow-lg shadow-indigo-500/20 transition-all font-semibold text-sm flex items-center gap-2 active:scale-95 flex-1 md:flex-none justify-center">
                            <span className="text-lg">+</span> Create New
                        </button>
                    </div>
                )}
            </div>

            {/* Create New Item Section */}
            {isCreating && (
                <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-xl border border-indigo-100 dark:border-gray-700 mb-8 animate-fade-in-down relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-1.5 h-full bg-indigo-500"></div>
                    <h3 className="font-bold text-xl mb-6 text-gray-800 dark:text-white">Create New {isRoot ? 'Folder' : 'Sheet'}</h3>
                    
                    <div className="mb-6">
                        <label className="block text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Name</label>
                        <input 
                            type="text" 
                            value={newFolderName} 
                            onChange={(e) => setNewFolderName(e.target.value)} 
                            className="w-full p-3 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-transparent outline-none transition-all text-gray-900 dark:text-white" 
                            placeholder="Enter name..." 
                        />
                    </div>

                    {isRoot && <UserSelector selectedUsers={sharedWith} setSelectedUsers={setSharedWith} currentUserRole={role} />}
                    
                    {!isRoot && (
                        <div className="mb-6 bg-gray-50 dark:bg-gray-900/50 p-5 rounded-xl border border-gray-200 dark:border-gray-700">
                            <label className="block text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">Define Columns</label>
                            <div className="space-y-3 max-h-48 overflow-y-auto custom-scrollbar pr-2">
                                {newFields.map((f, i) => (
                                    <div key={i} className="flex gap-2">
                                        <input 
                                            value={f} 
                                            onChange={(e) => handleFieldChange(i, e.target.value)} 
                                            className="flex-1 p-2.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:border-indigo-500 dark:focus:border-indigo-400 outline-none text-gray-900 dark:text-white" 
                                            placeholder={`Column ${i+1}`} 
                                        />
                                        <button onClick={() => {const u=[...newFields]; u.splice(i,1); setNewFields(u)}} className="text-gray-400 hover:text-red-500 px-2 transition text-lg">✕</button>
                                    </div>
                                ))}
                            </div>
                            <button onClick={handleAddField} className="mt-4 text-xs text-indigo-600 dark:text-indigo-400 font-bold hover:underline uppercase tracking-wider flex items-center gap-1">+ Add Another Column</button>
                        </div>
                    )}

                    <div className="flex gap-3 justify-end pt-4 border-t border-gray-100 dark:border-gray-700">
                        <button onClick={() => setIsCreating(false)} className="bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-6 py-2.5 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition font-semibold text-sm">Cancel</button>
                        <button onClick={handleCreate} className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-xl shadow-md transition font-bold text-sm">Create</button>
                    </div>
                </div>
            )}

            {/* Grid View */}
            {loading ? <LoadingSpinner /> : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                    {items?.map(item => (
                        <div 
                            key={item.id} 
                            onClick={() => onSelect(item)} 
                            className={`
                                group relative p-6 rounded-2xl border transition-all duration-300 cursor-pointer flex flex-col justify-between h-48
                                ${item.type === 'workbook' 
                                    ? 'bg-gradient-to-br from-indigo-50 to-white dark:from-gray-800 dark:to-gray-800 border-indigo-100 dark:border-gray-700 hover:border-indigo-300 dark:hover:border-indigo-500 hover:shadow-xl hover:-translate-y-1' 
                                    : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-emerald-400 dark:hover:border-emerald-500 hover:shadow-xl hover:-translate-y-1'}
                            `}
                        >
                            <div>
                                <div className="flex justify-between items-start mb-4">
                                    <span className="text-4xl filter drop-shadow-sm">{item.type === 'workbook' ? '📁' : '📄'}</span>
                                    <div className="flex gap-1 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity duration-200 bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm rounded-lg p-1 shadow-sm border border-gray-100 dark:border-gray-600">
                                        
                                        {/* Manage Access: Owner or Admin */}
                                        {item.type === 'workbook' && (isSuperAdmin || isAdmin || item.createdBy === currentUser.uid) && (
                                            <button onClick={(e) => openManageAccess(e, item)} className="text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 p-1.5 rounded transition" title="Manage Access">👥</button>
                                        )}
                                        
                                        {/* Download: Everyone */}
                                        {item.type === 'workbook' && (
                                            <button onClick={(e) => handleDownloadWorkbook(e, item)} className="text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 p-1.5 rounded transition" title="Download">📥</button>
                                        )}
                                        
                                        {/* Delete: Only Owner or Admin */}
                                        {(isSuperAdmin || isAdmin || item.createdBy === currentUser.uid) && (
                                            <button onClick={(e) => handleDelete(e, item.id, item.createdBy)} className="text-rose-500 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/30 p-1.5 rounded transition" title="Delete">🗑️</button>
                                        )}
                                    </div>
                                </div>
                                <h3 className="font-bold text-gray-800 dark:text-gray-100 truncate text-lg leading-tight mb-1" title={item.name}>{item.name}</h3>
                                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 truncate tracking-wide">
                                    {item.type === 'workbook' ? 'Folder / Group' : `${item.fields?.length || 0} Columns`}
                                </p>
                            </div>
                            
                            <div className="pt-3 border-t border-gray-100/50 dark:border-gray-700/50 flex justify-between items-end">
                                <div>
                                    <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">{item.type === 'workbook' ? 'Shared Folder' : 'Data Sheet'}</p>
                                    <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1 truncate max-w-[100px]">By: {item.createdBy === currentUser.uid ? 'You' : (userMap[item.createdBy] || 'Unknown')}</p>
                                </div>
                                {item.type === 'workbook' && (
                                    <span className="text-[10px] bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 px-2.5 py-1 rounded-full font-bold shadow-sm">
                                        {item.sharedWith?.length || 0} Users
                                    </span>
                                )}
                            </div>
                        </div>
                    ))}
                    {items?.length === 0 && (
                        <div className="col-span-full py-24 flex flex-col items-center justify-center text-gray-400 dark:text-gray-500 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-3xl bg-gray-50/50 dark:bg-gray-800/50">
                            <span className="text-6xl mb-4 opacity-50">📭</span>
                            <p className="text-lg font-medium">{isRoot ? "No folders yet. Start by creating one!" : "No sheets inside this folder."}</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

// ----------------------------------------------------------------------
// 📄 COMPONENT: DATA TABLE VIEW
// ----------------------------------------------------------------------
const FolderDataView = ({ folder, onBack }) => {
    const { userProfile } = useAuth();
    
    // Everyone who has access to the folder can edit data
    const canEditData = true; 

    const [isAdding, setIsAdding] = useState(false);
    const [isAddingColumn, setIsAddingColumn] = useState(false);
    const [newColumnName, setNewColumnName] = useState('');
    const [formData, setFormData] = useState({});
    const [editingId, setEditingId] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [showExcelEditor, setShowExcelEditor] = useState(false); 

    const dataFilters = useMemo(() => [['folderId', '==', folder.id]], [folder.id]);
    const { data: rawFolderData, loading, addDocument, updateDocument, deleteDocument } = useFirestore('shared_data', dataFilters);

    // 🟢 1. Prepare Data for ExcelEditor (Handling Formulas via Metadata)
    const excelInitialData = useMemo(() => {
        if (!rawFolderData || !folder.fields) return [];
        const celldata = [];
        
        folder.fields.forEach((field, colIndex) => {
            celldata.push({
                r: 0, c: colIndex, v: { v: field, m: field, ct: { fa: "General", t: "g" }, bg: "#f3f4f6", bl: 1 }
            });
        });

        const sortedForExcel = [...rawFolderData].sort((a, b) => {
            if (a._sortIndex !== undefined && b._sortIndex !== undefined) return a._sortIndex - b._sortIndex;
            return getTimestamp(a.createdAt) - getTimestamp(b.createdAt);
        });

        sortedForExcel.forEach((row, rowIndex) => {
            folder.fields.forEach((field, colIndex) => {
                let value = row[field];
                let formula = null;

                // Check for metadata formula stored in _formulas
                if (row._formulas && row._formulas[field]) {
                    formula = row._formulas[field];
                }
                
                // Fallback: Check if value string starts with '=' (Legacy data support)
                if (!formula && typeof value === 'string' && value.startsWith('=')) {
                     formula = value; 
                     value = null; // Don't show raw formula as value in Excel editor
                }

                celldata.push({
                    r: rowIndex + 1, c: colIndex,
                    v: { 
                        v: value, 
                        m: String(value !== null && value !== undefined ? value : ''), 
                        f: formula, 
                        ct: { fa: "General", t: typeof value === 'number' ? "n" : "g" } 
                    }
                });
            });
        });
        return [{ name: "Sheet1", celldata: celldata }];
    }, [rawFolderData, folder.fields]);

    // 🟢 2. Save Data from ExcelEditor (Preserving Formulas in Metadata)
    const handleExcelSave = async (allSheets) => {
        if (!allSheets || !allSheets[0].data) return;
        const sheetData = allSheets[0].data; 
        try {
            const newFields = [];
            const headerRow = sheetData[0];
            if(headerRow) {
                for(let c = 0; c < headerRow.length; c++) {
                    if(headerRow[c]?.v) newFields.push(String(headerRow[c].v));
                    else break; 
                }
            }
            if (newFields.length === 0) return alert("Headers required.");

            const newRows = [];
            for(let r = 1; r < sheetData.length; r++) {
                const row = sheetData[r];
                if(!row) continue;
                const rowObject = { folderId: folder.id, createdAt: new Date(), _sortIndex: r };
                let hasData = false;
                const formulas = {}; // Metadata container for this row

                newFields.forEach((field, cIndex) => {
                    const cell = row[cIndex];
                    if(cell) {
                        // Priority 1: Formula Exists
                        if (cell.f) {
                            // If calculated value (v) exists, save it for Simple View. 
                            rowObject[field] = (cell.v !== null && cell.v !== undefined) ? cell.v : ""; 
                            formulas[field] = "=" + cell.f.replace(/^=/, ''); // Normalize formula
                            hasData = true;
                        } 
                        // Priority 2: Simple Value
                        else if (cell.v !== null && cell.v !== undefined) {
                            rowObject[field] = cell.v;
                            hasData = true;
                        }
                    }
                });

                if (Object.keys(formulas).length > 0) {
                    rowObject._formulas = formulas; // Attach metadata to Firestore doc
                }

                if(hasData) newRows.push(rowObject);
            }

            const batch = writeBatch(db);
            // Delete old rows - Be careful with large datasets (batch limit 500)
            rawFolderData.forEach(d => batch.delete(doc(db, 'shared_data', d.id)));
            
            newRows.forEach(r => {
                const docRef = doc(collection(db, "shared_data"));
                batch.set(docRef, r);
            });
            
            batch.update(doc(db, 'shared_folders', folder.id), { fields: newFields });
            await batch.commit();
            
            setShowExcelEditor(false);
            alert("✅ Synced!");
        } catch (error) { 
            console.error(error);
            alert("Sync Failed: " + error.message); 
        }
    };

    // 🛠️ SORT DATA
    const folderData = useMemo(() => {
        if (!rawFolderData) return [];
        const sorted = [...rawFolderData].sort((a, b) => {
            if (a._sortIndex !== undefined && b._sortIndex !== undefined) return a._sortIndex - b._sortIndex;
            return getTimestamp(a.createdAt) - getTimestamp(b.createdAt);
        });
        if (!searchQuery.trim()) return sorted;
        return sorted.filter(row => folder.fields.some(field => String(row[field] || '').toLowerCase().includes(searchQuery.toLowerCase())));
    }, [rawFolderData, searchQuery, folder.fields]);

    const handleInputChange = (field, value) => setFormData(prev => ({ ...prev, [field]: value }));
    
    const handleSave = async (e) => {
        e.preventDefault();
        try {
            if (editingId) {
                await updateDocument(editingId, { ...formData, updatedAt: new Date() });
            } else {
                const maxIndex = rawFolderData.reduce((max, item) => Math.max(max, item._sortIndex || 0), 0);
                await addDocument({ 
                    ...formData, 
                    folderId: folder.id, 
                    createdAt: new Date(), 
                    _sortIndex: maxIndex + 1 
                });
            }
            setIsAdding(false); setEditingId(null); setFormData({});
        } catch (err) { alert("Error: " + err.message); }
    };

    const handleEdit = (record) => {
        setFormData(record); setEditingId(record.id); setIsAdding(true); 
    };

    const handleAddColumn = async () => { 
        if (!newColumnName.trim()) return alert("Name required"); 
        try { 
            await updateDoc(doc(db, 'shared_folders', folder.id), { fields: [...folder.fields, newColumnName] }); 
            setIsAddingColumn(false); setNewColumnName(''); 
        } catch (err) { alert("Failed"); }
    };

    const handleDeleteColumn = async (columnName) => { 
        if (!window.confirm("Delete column?")) return; 
        try { await updateDoc(doc(db, 'shared_folders', folder.id), { fields: folder.fields.filter(f => f !== columnName) }); } 
        catch (err) { alert("Failed"); }
    };

    const handleDownloadExcel = () => {
        if (!folderData.length) return alert("No data!");
        const exportData = folderData.map(row => { 
            const r = {}; 
            folder.fields.forEach(f => r[f] = (row[f] !== undefined && row[f] !== null) ? row[f] : ''); 
            return r; 
        });
        const ws = XLSX.utils.json_to_sheet(exportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Data");
        XLSX.writeFile(wb, `${folder.name}.xlsx`);
    };

    return (
        <div className="p-6 h-full flex flex-col bg-gray-50 dark:bg-gray-900 min-h-screen text-gray-900 dark:text-gray-100 transition-colors duration-300">
            {/* Toolbar */}
            <div className="flex flex-col gap-6 mb-6 bg-white dark:bg-gray-800 p-5 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700">
                <div className="flex flex-wrap justify-between items-center gap-4">
                    <div className="flex items-center gap-4">
                        <button onClick={onBack} className="bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 p-2.5 rounded-full transition text-gray-600 dark:text-gray-300 border border-transparent dark:border-gray-600">⬅</button>
                        <div>
                            <h2 className="text-2xl font-extrabold text-gray-800 dark:text-white flex items-center gap-2">📄 {folder.name}</h2>
                            <span className="text-[10px] uppercase bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-800 px-2 py-0.5 rounded font-bold tracking-wider">Sheet Data</span>
                        </div>
                    </div>
                    <div className="flex gap-3 w-full md:w-auto overflow-x-auto pb-2 md:pb-0 no-scrollbar">
                        <button onClick={() => setShowExcelEditor(true)} className="bg-gray-800 dark:bg-gray-700 text-white px-4 py-2 rounded-xl shadow hover:bg-gray-900 dark:hover:bg-gray-600 text-sm whitespace-nowrap font-medium flex items-center gap-2 transition active:scale-95"><span>⚡</span> Advanced</button>
                        <button onClick={handleDownloadExcel} className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl shadow text-sm whitespace-nowrap font-medium flex items-center gap-2 transition active:scale-95"><span>📊</span> Export</button>
                        
                        <button onClick={() => setIsAddingColumn(true)} className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-xl shadow text-sm whitespace-nowrap font-medium transition active:scale-95">+ Column</button>
                        <button onClick={() => { setIsAdding(true); setEditingId(null); setFormData({}); }} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl shadow text-sm whitespace-nowrap font-medium transition active:scale-95">+ Row</button>
                    </div>
                </div>
                <div className="relative w-full">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-gray-400">🔍</span>
                    <input 
                        type="text" 
                        value={searchQuery} 
                        onChange={(e) => setSearchQuery(e.target.value)} 
                        placeholder="Search data..." 
                        className="w-full pl-11 pr-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-600 rounded-xl focus:bg-white dark:focus:bg-gray-800 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 outline-none transition text-sm shadow-inner text-gray-900 dark:text-white" 
                    />
                </div>
            </div>

            {showExcelEditor && <ExcelEditor initialData={excelInitialData} onSave={handleExcelSave} onClose={() => setShowExcelEditor(false)} />}

            {/* Add Column Modal */}
            {isAddingColumn && (
                <div className="fixed inset-0 bg-black/60 dark:bg-black/80 flex items-center justify-center z-[60] p-4 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-2xl w-full max-w-sm border border-gray-100 dark:border-gray-700">
                        <h3 className="font-bold text-xl mb-6 text-purple-800 dark:text-purple-400">Add New Column</h3>
                        <input 
                            type="text" 
                            value={newColumnName} 
                            onChange={(e) => setNewColumnName(e.target.value)} 
                            className="w-full p-3 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl mb-6 focus:ring-2 focus:ring-purple-500 dark:focus:ring-purple-400 outline-none text-gray-900 dark:text-white" 
                            placeholder="Column Name" 
                        />
                        <div className="flex justify-end gap-3">
                            <button onClick={() => setIsAddingColumn(false)} className="px-5 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl text-sm hover:bg-gray-200 dark:hover:bg-gray-600 font-medium transition">Cancel</button>
                            <button onClick={handleAddColumn} className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl shadow text-sm font-medium transition">Add</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Add/Edit Entry Modal */}
            {isAdding && (
                <div className="fixed inset-0 bg-black/60 dark:bg-black/80 flex items-center justify-center z-[60] p-4 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto custom-scrollbar border border-gray-100 dark:border-gray-700">
                        <div className="flex justify-between items-center mb-6 border-b border-gray-200 dark:border-gray-700 pb-4">
                            <h3 className="font-bold text-2xl text-gray-800 dark:text-white">{editingId ? '✏️ Edit Entry' : '➕ Add Entry'}</h3>
                            <button onClick={() => setIsAdding(false)} className="bg-gray-100 dark:bg-gray-700 hover:bg-red-100 dark:hover:bg-red-900/30 hover:text-red-500 dark:hover:text-red-400 p-2 rounded-full transition text-gray-500 dark:text-gray-400">✕</button>
                        </div>
                        <form onSubmit={handleSave}>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                                {folder.fields.map((field) => (
                                    <div key={field}>
                                        <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wide">{field}</label>
                                        <input 
                                            type="text" 
                                            value={formData[field] !== undefined ? formData[field] : ''} 
                                            onChange={(e) => handleInputChange(field, e.target.value)} 
                                            className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 outline-none transition text-sm bg-gray-50 dark:bg-gray-700 focus:bg-white dark:focus:bg-gray-800 text-gray-900 dark:text-white" 
                                            placeholder={`Enter ${field}`} 
                                        />
                                    </div>
                                ))}
                            </div>
                            <div className="flex gap-3 justify-end sticky bottom-0 bg-white dark:bg-gray-800 pt-4 border-t border-gray-100 dark:border-gray-700">
                                <button type="button" onClick={() => setIsAdding(false)} className="bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-6 py-2.5 rounded-xl font-medium text-sm hover:bg-gray-200 dark:hover:bg-gray-600 transition">Cancel</button>
                                <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl shadow-md font-bold text-sm transition">{editingId ? 'Update Entry' : 'Save Entry'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Data Table */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 flex-1 overflow-hidden flex flex-col">
                <div className="overflow-x-auto flex-1 custom-scrollbar">
                    {loading ? <LoadingSpinner /> : (
                        <table className="w-full text-left border-collapse min-w-[800px]">
                            <thead className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10 backdrop-blur-sm">
                                <tr>
                                    {folder.fields.map(f => (
                                        <th key={f} className="p-4 whitespace-nowrap font-bold text-gray-600 dark:text-gray-300 text-xs uppercase tracking-wider border-r border-gray-200 dark:border-gray-700 group min-w-[150px]">
                                            <div className="flex justify-between items-center gap-2">
                                                <span>{f}</span>
                                                {canEditData && (
                                                    <button onClick={() => handleDeleteColumn(f)} className="text-gray-300 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 opacity-0 group-hover:opacity-100 transition p-1 rounded-full hover:bg-red-50 dark:hover:bg-red-900/20" title="Delete Column">✕</button>
                                                )}
                                            </div>
                                        </th>
                                    ))}
                                    <th className="p-4 bg-gray-50 dark:bg-gray-700/50 w-24 text-center font-bold text-gray-600 dark:text-gray-300 text-xs uppercase sticky right-0 shadow-[-5px_0_10px_-5px_rgba(0,0,0,0.05)] z-20 border-l border-gray-200 dark:border-gray-700">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                {folderData.length > 0 ? folderData.map(row => (
                                    <tr key={row.id} className="hover:bg-blue-50/50 dark:hover:bg-gray-700/50 transition duration-150 group">
                                        {folder.fields.map(f => (
                                            <td key={f} className="p-4 text-sm text-gray-700 dark:text-gray-300 border-r border-gray-100 dark:border-gray-700 max-w-[200px] truncate" title={row[f]}>
                                                {/* Display VALUE in table */}
                                                {row[f] !== undefined && row[f] !== null && row[f] !== "" ? row[f] : <span className="text-gray-300 dark:text-gray-600 text-xs italic">Empty</span>}
                                            </td>
                                        ))}
                                        <td className="p-3 flex justify-center gap-2 sticky right-0 bg-white dark:bg-gray-800 group-hover:bg-blue-50/50 dark:group-hover:bg-gray-700/50 shadow-[-5px_0_10px_-5px_rgba(0,0,0,0.05)] border-l border-gray-100 dark:border-gray-700">
                                            {canEditData ? (
                                                <>
                                                    <button onClick={() => handleEdit(row)} className="text-blue-500 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/30 p-2 rounded-lg transition" title="Edit"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg></button>
                                                    <button onClick={() => window.confirm("Delete this row?") && deleteDocument(row.id)} className="text-red-400 hover:text-red-600 dark:hover:text-red-300 hover:bg-red-100 dark:hover:bg-red-900/30 p-2 rounded-lg transition" title="Delete"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                                                </>
                                            ) : (
                                                <span className="text-gray-400 text-xs italic">Read Only</span>
                                            )}
                                        </td>
                                    </tr>
                                )) : (
                                    <tr>
                                        <td colSpan={folder.fields.length + 1} className="p-16 text-center text-gray-400 dark:text-gray-500 italic bg-gray-50/20 dark:bg-gray-800/20">
                                            {canEditData ? <>No data found. Click <span className="font-bold text-blue-500">+ Row</span> to add entries.</> : "No data available."}
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </div>
    );
};

// ----------------------------------------------------------------------
// 🚀 MAIN CONTROLLER
// ----------------------------------------------------------------------
function SharedDocs() {
    const [selectedFile, setSelectedFile] = useState(null); 
    const [selectedSheet, setSelectedSheet] = useState(null); 

    // 🔥 FIX: Pass 'selectedFile' as parentFolder to inner browser so it knows about parent's sharedWith list
    if (selectedSheet) return <FolderDataView folder={selectedSheet} onBack={() => setSelectedSheet(null)} />;
    if (selectedFile) return <FolderBrowser isRoot={false} parentFolder={selectedFile} parentId={selectedFile.id} parentName={selectedFile.name} onSelect={(item) => setSelectedSheet(item)} onBack={() => setSelectedFile(null)} />;
    return <div className="min-h-screen bg-gray-100 dark:bg-gray-900 transition-colors duration-300"><FolderBrowser isRoot={true} parentId="ROOT" parentName="Shared Docs" onSelect={(item) => { if (item.type === 'workbook') setSelectedFile(item); else setSelectedSheet(item); }} onBack={null} /></div>;
}

export default SharedDocs;