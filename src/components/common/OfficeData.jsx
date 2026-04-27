// src/components/common/OfficeData.jsx

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useFirestore } from '../../hooks/useFirestore';
import { useCollection } from '../../hooks/useCollection';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import * as XLSX from 'xlsx';
import { collection, query, where, getDocs, updateDoc, doc, writeBatch, setDoc, deleteDoc, onSnapshot } from 'firebase/firestore'; 
import { db } from '../../Firebase'; 
import ExcelEditor from './ExcelEditor'; 
import { useAuth } from '../../context/AuthContext'; 
import { ShieldAlert, Ban, Eye, Lock, CheckCircle, Trash2, Shield } from 'lucide-react';

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
// 📂 COMPONENT: FOLDER BROWSER
// ----------------------------------------------------------------------
const FolderBrowser = ({ parentId, parentName, onSelect, onBack, isRoot, canWrite, openAccessModal, isAdmin }) => {
    const [isCreating, setIsCreating] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);
    const [newFolderName, setNewFolderName] = useState('');
    const [newFields, setNewFields] = useState(['Name', 'Contact Number', 'Address']); 
    
    const folderFilters = useMemo(() => [['parentId', '==', parentId]], [parentId]);
    const { data: rawItems, loading, addDocument, deleteDocument } = useFirestore('office_folders', folderFilters);
    
    const items = useMemo(() => {
        if(!rawItems) return [];
        return [...rawItems].sort((a, b) => getTimestamp(a.createdAt) - getTimestamp(b.createdAt));
    }, [rawItems]);

    const fileInputRef = useRef(null);
    const [isImporting, setIsImporting] = useState(false);

    const handleFileChange = async (e) => {
        if (!canWrite) return alert("Read Only Mode: You cannot import data.");
        const file = e.target.files[0];
        if (!file) return;
        setIsImporting(true);
        const fileName = file.name.replace(/\.[^/.]+$/, ""); 
        const reader = new FileReader();
        reader.readAsArrayBuffer(file);
        reader.onload = async (event) => {
            try {
                const data = new Uint8Array(event.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                const parentFolderId = await addDocument({ name: fileName, type: 'workbook', parentId: 'ROOT', createdAt: new Date() });

                for (const sheetName of workbook.SheetNames) {
                    const sheet = workbook.Sheets[sheetName];
                    const jsonDataWithHeader = XLSX.utils.sheet_to_json(sheet, { header: 1 });
                    if (!jsonDataWithHeader || jsonDataWithHeader.length === 0) continue;
                    const headers = jsonDataWithHeader[0];
                    const rowData = XLSX.utils.sheet_to_json(sheet);
                    if (headers && headers.length > 0) {
                        const sheetId = await addDocument({ name: sheetName, type: 'sheet', parentId: parentFolderId, fields: headers, createdAt: new Date() });
                        const batch = writeBatch(db);
                        rowData.forEach((row, index) => {
                            const docRef = doc(collection(db, 'office_data'));
                            batch.set(docRef, { ...row, folderId: sheetId, createdAt: new Date(), _sortIndex: index });
                        });
                        await batch.commit();
                    }
                }
                alert(`Success! File "${fileName}" imported.`);
            } catch (error) { console.error(error); alert("Error importing: " + error.message); } 
            finally { setIsImporting(false); if(fileInputRef.current) fileInputRef.current.value = ""; }
        };
    };

    const handleDelete = async (e, id) => {
        e.stopPropagation();
        if (!canWrite) return alert("Read Only Mode: Access Denied");
        if(window.confirm("Delete this item and all contents?")) await deleteDocument(id);
    };

    const handleDownloadWorkbook = async (e, workbookItem) => {
        e.stopPropagation();
        if (isDownloading) return;
        setIsDownloading(true);
        try {
            const wb = XLSX.utils.book_new();
            const sheetsQuery = query(collection(db, 'office_folders'), where('parentId', '==', workbookItem.id));
            const sheetsSnapshot = await getDocs(sheetsQuery);
            if (sheetsSnapshot.empty) { alert("No sheets found."); setIsDownloading(false); return; }
            for (const sheetDoc of sheetsSnapshot.docs) {
                const sheetInfo = sheetDoc.data();
                const sheetName = sheetInfo.name || 'Sheet';
                const sheetId = sheetDoc.id;
                const fields = sheetInfo.fields || [];
                const dataQuery = query(collection(db, 'office_data'), where('folderId', '==', sheetId));
                const dataSnapshot = await getDocs(dataQuery);
                const rawData = dataSnapshot.docs.map(doc => doc.data());
                rawData.sort((a, b) => (a._sortIndex || 0) - (b._sortIndex || 0));
                
                const cleanData = rawData.map(row => { 
                    const r = {}; 
                    fields.forEach(f => {
                        const val = row[f];
                        r[f] = (val !== undefined && val !== null) ? val : '';
                    }); 
                    return r; 
                });
                
                const ws = XLSX.utils.json_to_sheet(cleanData);
                XLSX.utils.book_append_sheet(wb, ws, sheetName);
            }
            XLSX.writeFile(wb, `${workbookItem.name}.xlsx`);
        } catch (error) { console.error(error); alert("Download Failed."); } 
        finally { setIsDownloading(false); }
    };

    const handleCreate = async (e) => {
        e.preventDefault();
        if (!canWrite) return alert("Read Only Mode: Access Denied");
        if (!newFolderName.trim()) { alert("Name is required!"); return; }
        if (isRoot) {
            await addDocument({ name: newFolderName, type: 'workbook', parentId: 'ROOT', createdAt: new Date() });
        } else {
            const cleanedFields = newFields.filter(f => f.trim() !== '');
            if (cleanedFields.length === 0) { alert("Sheet needs at least one column!"); return; }
            await addDocument({ name: newFolderName, type: 'sheet', parentId: parentId, fields: cleanedFields, createdAt: new Date() });
        }
        setIsCreating(false); setNewFolderName(''); setNewFields(['Name', 'Contact Number', 'Address']);
    };

    const handleAddField = () => setNewFields([...newFields, '']);
    const handleFieldChange = (i, v) => { const u = [...newFields]; u[i] = v; setNewFields(u); };

    if (isImporting || isDownloading) return <LoadingSpinner message={isDownloading ? "Generating Excel File..." : "Processing Import..."} />;

    return (
        <div className="p-6 min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 transition-colors duration-300">
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
                            {isRoot ? "Office Data" : parentName}
                        </h2>
                        <div className="flex gap-2 items-center mt-1">
                            {!canWrite && <span className="text-xs font-bold bg-orange-100 text-orange-600 px-2 py-0.5 rounded border border-orange-200">READ ONLY MODE</span>}
                            {canWrite && <span className="text-xs font-bold bg-green-100 text-green-600 px-2 py-0.5 rounded border border-green-200">FULL CONTROL</span>}
                        </div>
                    </div>
                </div>
                
                <div className="flex flex-wrap gap-3 w-full md:w-auto">
                    {/* Admin Control Button */}
                    {isAdmin && (
                        <button onClick={openAccessModal} className="bg-gray-800 hover:bg-gray-900 text-white px-5 py-2.5 rounded-xl shadow-lg transition-all font-semibold text-sm flex items-center gap-2">
                             <Shield size={16}/> User Access
                        </button>
                    )}

                    {canWrite && (
                        <>
                            {isRoot && (
                                <>
                                    <input type="file" accept=".xlsx, .xls" ref={fileInputRef} style={{ display: 'none' }} onChange={handleFileChange} />
                                    <button onClick={() => fileInputRef.current.click()} className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl shadow-lg shadow-emerald-500/20 transition-all font-semibold text-sm flex items-center gap-2 active:scale-95">
                                        📊 Import Excel
                                    </button>
                                </>
                            )}
                            <button onClick={() => setIsCreating(true)} className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl shadow-lg shadow-indigo-500/20 transition-all font-semibold text-sm flex items-center gap-2 active:scale-95">
                                <span className="text-lg">+</span> New {isRoot ? 'Folder' : 'Sheet'}
                            </button>
                        </>
                    )}
                </div>
            </div>

            {/* Create Modal */}
            {isCreating && (
                <div className="fixed inset-0 bg-black/60 dark:bg-black/80 flex items-center justify-center z-[60] p-4 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-2xl w-full max-w-lg border border-gray-100 dark:border-gray-700 transform transition-all scale-100">
                        <h3 className="font-bold text-xl mb-6 text-gray-800 dark:text-white">Create New {isRoot ? 'Folder' : 'Sheet'}</h3>
                        
                        <div className="mb-6">
                            <label className="block text-sm font-bold mb-2 text-gray-700 dark:text-gray-300 uppercase tracking-wide">{isRoot ? "Folder Name" : "Sheet Name"}</label>
                            <input 
                                type="text" 
                                value={newFolderName} 
                                onChange={(e) => setNewFolderName(e.target.value)} 
                                className="w-full p-3 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-transparent outline-none transition-all text-gray-900 dark:text-white" 
                                placeholder={isRoot ? "e.g. Vendor Data" : "e.g. Sheet 1"} 
                            />
                        </div>

                        {!isRoot && (
                            <div className="mb-6">
                                <div className="flex justify-between items-center mb-3">
                                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide">Columns</label>
                                    <button onClick={handleAddField} className="text-xs text-indigo-600 dark:text-indigo-400 font-bold hover:underline uppercase tracking-wider">+ Add Column</button>
                                </div>
                                <div className="max-h-48 overflow-y-auto custom-scrollbar border border-gray-200 dark:border-gray-700 rounded-xl p-3 bg-gray-50 dark:bg-gray-900/50 space-y-2">
                                    {newFields.map((f, i) => (
                                        <div key={i} className="flex gap-2">
                                            <input 
                                                type="text" 
                                                value={f} 
                                                onChange={(e) => handleFieldChange(i, e.target.value)} 
                                                className="flex-1 p-2.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:border-indigo-500 dark:focus:border-indigo-400 outline-none text-gray-900 dark:text-white" 
                                                placeholder={`Column ${i+1}`} 
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="flex gap-3 justify-end pt-4 border-t border-gray-100 dark:border-gray-700">
                            <button onClick={() => setIsCreating(false)} className="px-5 py-2.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition font-semibold text-sm">Cancel</button>
                            <button onClick={handleCreate} className="px-5 py-2.5 bg-indigo-600 dark:bg-indigo-500 text-white rounded-xl hover:bg-indigo-700 dark:hover:bg-indigo-600 transition shadow-md font-semibold text-sm">Create</button>
                        </div>
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
                                    ? 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-blue-400 dark:hover:border-blue-500 hover:shadow-xl hover:-translate-y-1' 
                                    : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-emerald-400 dark:hover:border-emerald-500 hover:shadow-xl hover:-translate-y-1'}
                            `}
                        >
                            <div>
                                <div className={`text-4xl mb-4 w-14 h-14 flex items-center justify-center rounded-2xl shadow-sm ${item.type === 'workbook' ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-500 dark:text-blue-400' : 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-500 dark:text-emerald-400'}`}>
                                    {item.type === 'workbook' ? '📁' : '📄'}
                                </div>
                                <h3 className="font-bold text-gray-800 dark:text-gray-100 truncate text-lg mb-1" title={item.name}>{item.name}</h3>
                                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 truncate tracking-wide">
                                    {item.type === 'workbook' ? 'Folder / Group' : `${item.fields?.length || 0} Columns`}
                                </p>
                            </div>
                            
                            <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                {item.type === 'workbook' && (
                                    <button 
                                        onClick={(e) => handleDownloadWorkbook(e, item)} 
                                        title="Download Excel" 
                                        className="bg-white dark:bg-gray-700 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 p-2 rounded-lg shadow-sm border border-gray-200 dark:border-gray-600 transition"
                                    >
                                        📥
                                    </button>
                                )}
                                {canWrite && (
                                    <button 
                                        onClick={(e) => handleDelete(e, item.id)} 
                                        title="Delete" 
                                        className="bg-white dark:bg-gray-700 text-rose-500 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/30 p-2 rounded-lg shadow-sm border border-gray-200 dark:border-gray-600 transition"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                    {items?.length === 0 && (
                        <div className="col-span-full flex flex-col items-center justify-center py-24 text-gray-400 dark:text-gray-500 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-3xl bg-gray-50/50 dark:bg-gray-800/50">
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
const FolderDataView = ({ folder, onBack, canWrite }) => {
    const [isAdding, setIsAdding] = useState(false);
    const [isAddingColumn, setIsAddingColumn] = useState(false);
    const [newColumnName, setNewColumnName] = useState('');
    const [formData, setFormData] = useState({});
    const [editingId, setEditingId] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [showExcelEditor, setShowExcelEditor] = useState(false); 

    const dataFilters = useMemo(() => [['folderId', '==', folder.id]], [folder.id]);
    const { data: rawFolderData, loading, addDocument, updateDocument, deleteDocument } = useFirestore('office_data', dataFilters);

    // ... [Excel Logic: Keeping exact same functionality] ...
    const excelInitialData = useMemo(() => {
        if (!rawFolderData || !folder.fields) return [];
        const celldata = [];
        folder.fields.forEach((field, colIndex) => {
            celldata.push({ r: 0, c: colIndex, v: { v: field, m: field, ct: { fa: "General", t: "g" }, bg: "#f3f4f6", bl: 1 } });
        });
        const sortedForExcel = [...rawFolderData].sort((a, b) => {
            if (a._sortIndex !== undefined && b._sortIndex !== undefined) return a._sortIndex - b._sortIndex;
            return getTimestamp(a.createdAt) - getTimestamp(b.createdAt);
        });
        sortedForExcel.forEach((row, rowIndex) => {
            folder.fields.forEach((field, colIndex) => {
                let value = row[field];
                let formula = null;
                if (row._formulas && row._formulas[field]) { formula = row._formulas[field]; }
                else if (!formula && typeof value === 'string' && value.startsWith('=')) { formula = value; value = null; }
                celldata.push({ r: rowIndex + 1, c: colIndex, v: { v: value, m: String(value !== null && value !== undefined ? value : ''), f: formula, ct: { fa: "General", t: typeof value === 'number' ? "n" : "g" } } });
            });
        });
        return [{ name: "Sheet1", celldata: celldata }];
    }, [rawFolderData, folder.fields]);

    const handleExcelSave = async (allSheets) => {
        if (!canWrite) return alert("Permission Denied");
        if (!allSheets || !allSheets[0].data) return;
        const sheetData = allSheets[0].data; 
        try {
            const newFields = [];
            const headerRow = sheetData[0];
            if(headerRow) { for(let c = 0; c < headerRow.length; c++) { if(headerRow[c]?.v) newFields.push(String(headerRow[c].v)); else break; } }
            if (newFields.length === 0) return alert("Headers required.");
            const newRows = [];
            for(let r = 1; r < sheetData.length; r++) {
                const row = sheetData[r];
                if(!row) continue;
                const rowObject = { folderId: folder.id, createdAt: new Date(), _sortIndex: r };
                let hasData = false;
                const formulas = {}; 
                newFields.forEach((field, cIndex) => {
                    const cell = row[cIndex];
                    if(cell) {
                        if (cell.f) { rowObject[field] = (cell.v !== null && cell.v !== undefined) ? cell.v : ""; formulas[field] = "=" + cell.f.replace(/^=/, ''); hasData = true; } 
                        else if (cell.v !== null && cell.v !== undefined) { rowObject[field] = cell.v; hasData = true; }
                    }
                });
                if (Object.keys(formulas).length > 0) { rowObject._formulas = formulas; }
                if(hasData) newRows.push(rowObject);
            }
            const batch = writeBatch(db);
            rawFolderData.forEach(d => batch.delete(doc(db, 'office_data', d.id)));
            newRows.forEach(r => { const docRef = doc(collection(db, "office_data")); batch.set(docRef, r); });
            batch.update(doc(db, 'office_folders', folder.id), { fields: newFields });
            await batch.commit();
            setShowExcelEditor(false);
            alert("✅ Synced!");
        } catch (error) { console.error(error); alert("Sync Failed: " + error.message); }
    };

    // Sort Data
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
        if (!canWrite) return alert("Read Only Mode.");
        try {
            if (editingId) {
                await updateDocument(editingId, { ...formData, updatedAt: new Date() });
            } else {
                const maxIndex = rawFolderData.reduce((max, item) => Math.max(max, item._sortIndex || 0), 0);
                await addDocument({ ...formData, folderId: folder.id, createdAt: new Date(), _sortIndex: maxIndex + 1 });
            }
            setIsAdding(false); setEditingId(null); setFormData({});
        } catch (err) { alert("Error: " + err.message); }
    };

    const handleEdit = (record) => {
        if (!canWrite) return;
        setFormData(record); setEditingId(record.id); setIsAdding(true); 
    };

    const handleAddColumn = async () => { 
        if (!canWrite) return alert("Read Only Mode.");
        if (!newColumnName.trim()) return alert("Name required"); 
        try { await updateDoc(doc(db, 'office_folders', folder.id), { fields: [...folder.fields, newColumnName] }); setIsAddingColumn(false); setNewColumnName(''); } catch (err) { alert("Failed"); }
    };

    const handleDeleteColumn = async (columnName) => { 
        if (!canWrite) return alert("Read Only Mode.");
        if (!window.confirm("Delete?")) return; 
        try { await updateDoc(doc(db, 'office_folders', folder.id), { fields: folder.fields.filter(f => f !== columnName) }); } catch (err) { alert("Failed"); }
    };

    const handleDownloadExcel = () => {
        if (!folderData.length) return alert("No data!");
        const exportData = folderData.map(row => { const r = {}; folder.fields.forEach(f => r[f] = (row[f] !== undefined && row[f] !== null) ? row[f] : ''); return r; });
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
                            <div className="flex gap-2 items-center mt-1">
                                {!canWrite && <span className="text-xs font-bold bg-orange-100 text-orange-600 px-2 py-0.5 rounded border border-orange-200">READ ONLY MODE</span>}
                            </div>
                        </div>
                    </div>
                    <div className="flex gap-3 w-full md:w-auto overflow-x-auto pb-2 md:pb-0 no-scrollbar">
                        {canWrite && <button onClick={() => setShowExcelEditor(true)} className="bg-gray-800 dark:bg-gray-700 text-white px-4 py-2 rounded-xl shadow hover:bg-gray-900 dark:hover:bg-gray-600 text-sm whitespace-nowrap font-medium flex items-center gap-2 transition active:scale-95"><span>⚡</span> Advanced</button>}
                        <button onClick={handleDownloadExcel} className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl shadow text-sm whitespace-nowrap font-medium flex items-center gap-2 transition active:scale-95"><span>📊</span> Export</button>
                        {canWrite && (
                            <>
                                <button onClick={() => setIsAddingColumn(true)} className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-xl shadow text-sm whitespace-nowrap font-medium transition active:scale-95">+ Column</button>
                                <button onClick={() => { setIsAdding(true); setEditingId(null); setFormData({}); }} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl shadow text-sm whitespace-nowrap font-medium transition active:scale-95">+ Row</button>
                            </>
                        )}
                    </div>
                </div>
                {/* Search Bar */}
                <div className="relative w-full">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-gray-400">🔍</span>
                    <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search data..." className="w-full pl-11 pr-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-600 rounded-xl focus:bg-white dark:focus:bg-gray-800 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 outline-none transition text-sm shadow-inner text-gray-900 dark:text-white" />
                </div>
            </div>

            {/* Modals for Add/Edit Row, Add Column - Wrapped in canWrite */}
             {isAddingColumn && canWrite && (
                <div className="fixed inset-0 bg-black/60 dark:bg-black/80 flex items-center justify-center z-[60] p-4 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-2xl w-full max-w-sm border border-gray-100 dark:border-gray-700">
                        <h3 className="font-bold text-xl mb-6 text-purple-800 dark:text-purple-400">Add New Column</h3>
                        <input type="text" value={newColumnName} onChange={(e) => setNewColumnName(e.target.value)} className="w-full p-3 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl mb-6 focus:ring-2 focus:ring-purple-500 dark:focus:ring-purple-400 outline-none text-gray-900 dark:text-white" placeholder="Column Name" />
                        <div className="flex justify-end gap-3">
                            <button onClick={() => setIsAddingColumn(false)} className="px-5 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl text-sm hover:bg-gray-200 dark:hover:bg-gray-600 font-medium transition">Cancel</button>
                            <button onClick={handleAddColumn} className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl shadow text-sm font-medium transition">Add</button>
                        </div>
                    </div>
                </div>
            )}
             {isAdding && canWrite && (
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
                                        <input type="text" value={formData[field] !== undefined ? formData[field] : ''} onChange={(e) => handleInputChange(field, e.target.value)} className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 outline-none transition text-sm bg-gray-50 dark:bg-gray-700 focus:bg-white dark:focus:bg-gray-800 text-gray-900 dark:text-white" placeholder={`Enter ${field}`} />
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
                                                {canWrite && <button onClick={() => handleDeleteColumn(f)} className="text-gray-300 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 opacity-0 group-hover:opacity-100 transition p-1 rounded-full hover:bg-red-50 dark:hover:bg-red-900/20" title="Delete Column">✕</button>}
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
                                                {row[f] !== undefined && row[f] !== null && row[f] !== "" ? row[f] : <span className="text-gray-300 dark:text-gray-600 text-xs italic">Empty</span>}
                                            </td>
                                        ))}
                                        <td className="p-3 flex justify-center gap-2 sticky right-0 bg-white dark:bg-gray-800 group-hover:bg-blue-50/50 dark:group-hover:bg-gray-700/50 shadow-[-5px_0_10px_-5px_rgba(0,0,0,0.05)] border-l border-gray-100 dark:border-gray-700">
                                            {canWrite ? (
                                                <>
                                                    <button onClick={() => handleEdit(row)} className="text-blue-500 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/30 p-2 rounded-lg transition" title="Edit"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg></button>
                                                    <button onClick={() => window.confirm("Delete this row?") && deleteDocument(row.id)} className="text-red-400 hover:text-red-600 dark:hover:text-red-300 hover:bg-red-100 dark:hover:bg-red-900/30 p-2 rounded-lg transition" title="Delete"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                                                </>
                                            ) : <span className="text-gray-400 text-xs italic">Read Only</span>}
                                        </td>
                                    </tr>
                                )) : (
                                    <tr>
                                        <td colSpan={folder.fields.length + 1} className="p-16 text-center text-gray-400 dark:text-gray-500 italic bg-gray-50/20 dark:bg-gray-800/20">
                                            {canWrite ? <>No data found. Click <span className="font-bold text-blue-500">+ Row</span> to add entries.</> : "No data available."}
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
            
            {showExcelEditor && canWrite && <ExcelEditor initialData={excelInitialData} onSave={handleExcelSave} onClose={() => setShowExcelEditor(false)} />}
        </div>
    );
};

// ----------------------------------------------------------------------
// 🚀 MAIN CONTROLLER
// ----------------------------------------------------------------------
function OfficeData() {
    const { userProfile, currentUser } = useAuth();
    const { documents: allUsers } = useCollection('users');
    const [selectedFile, setSelectedFile] = useState(null); 
    const [selectedSheet, setSelectedSheet] = useState(null); 
    const [accessData, setAccessData] = useState({ blocked_uids: [], readonly_uids: [] });
    const [isAccessModalOpen, setIsAccessModalOpen] = useState(false);

    const isAdmin = ['super_admin', 'admin'].includes(userProfile?.role);
    const myUid = currentUser?.uid;

    // 🛡️ 1. Fetch Access Rules Real-time
    useEffect(() => {
        const docRef = doc(db, 'settings', 'office_data_access');
        const unsub = onSnapshot(docRef, (docSnap) => {
            if (docSnap.exists()) {
                setAccessData(docSnap.data());
            } else {
                if (isAdmin) setDoc(docRef, { blocked_uids: [], readonly_uids: [] }, { merge: true }); // Self-heal
            }
        });
        return () => unsub();
    }, [isAdmin]);

    // 🔐 2. Determine Access Level
    const isBlocked = accessData.blocked_uids?.includes(myUid);
    const isReadOnly = accessData.readonly_uids?.includes(myUid);
    
    // Admin overrides all restrictions
    const effectiveReadOnly = isAdmin ? false : isReadOnly;
    const effectiveBlocked = isAdmin ? false : isBlocked;
    
    // ✋ 3. Blocked View
    if (effectiveBlocked) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white">
                <div className="text-center p-10 bg-gray-800 rounded-3xl border border-red-900 shadow-2xl max-w-md">
                    <Ban size={64} className="mx-auto text-red-500 mb-6" />
                    <h1 className="text-3xl font-bold mb-2 text-red-500">Access Restricted</h1>
                    <p className="text-gray-400">Your access to Office Data has been temporarily suspended by the administrator.</p>
                </div>
            </div>
        );
    }

    // 🎛️ 4. Access Control Handlers (Admin Only)
    // 🔥 FIXED LOGIC: Toggle switches correctly
    const handleToggleAccess = async (targetUid, type) => {
        // type: 'block' or 'readonly'
        let newBlocked = [...(accessData.blocked_uids || [])];
        let newReadOnly = [...(accessData.readonly_uids || [])];

        if (type === 'block') {
            if (newBlocked.includes(targetUid)) {
                // If blocked, UNBLOCK (Full Access)
                newBlocked = newBlocked.filter(id => id !== targetUid); 
            } else {
                // If not blocked, BLOCK (and remove from read-only to avoid confusion)
                newBlocked.push(targetUid);
                newReadOnly = newReadOnly.filter(id => id !== targetUid); 
            }
        } else if (type === 'readonly') {
            if (newReadOnly.includes(targetUid)) {
                // If readonly, MAKE FULL ACCESS
                newReadOnly = newReadOnly.filter(id => id !== targetUid); 
            } else {
                // If not readonly, MAKE READONLY (and ensure not blocked)
                newReadOnly.push(targetUid);
                newBlocked = newBlocked.filter(id => id !== targetUid); 
            }
        }
        
        await updateDoc(doc(db, 'settings', 'office_data_access'), { blocked_uids: newBlocked, readonly_uids: newReadOnly });
    };

    // 🖥️ 5. Render
    if (selectedSheet) return <FolderDataView folder={selectedSheet} onBack={() => setSelectedSheet(null)} canWrite={!effectiveReadOnly} />;
    if (selectedFile) return <FolderBrowser isRoot={false} parentId={selectedFile.id} parentName={selectedFile.name} onSelect={(item) => setSelectedSheet(item)} onBack={() => setSelectedFile(null)} canWrite={!effectiveReadOnly} isAdmin={isAdmin} openAccessModal={() => setIsAccessModalOpen(true)} />;
    
    return (
        <div className="min-h-screen bg-gray-100 dark:bg-gray-900 transition-colors duration-300">
            <FolderBrowser 
                isRoot={true} 
                parentId="ROOT" 
                parentName="Office Data" 
                onSelect={(item) => { if (item.type === 'workbook') setSelectedFile(item); else setSelectedSheet(item); }} 
                onBack={null} 
                canWrite={!effectiveReadOnly}
                isAdmin={isAdmin}
                openAccessModal={() => setIsAccessModalOpen(true)}
            />

            {/* Admin Access Modal */}
            {isAccessModalOpen && isAdmin && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[70] p-4 backdrop-blur-sm">
                    <div className="bg-white dark:bg-gray-800 w-full max-w-2xl rounded-2xl shadow-2xl border border-gray-700 flex flex-col max-h-[85vh]">
                        <div className="p-6 border-b border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-700/30 rounded-t-2xl">
                            <h2 className="text-xl font-bold text-gray-800 dark:text-white flex items-center gap-2"><ShieldAlert className="text-indigo-500"/> User Access Control</h2>
                            <button onClick={() => setIsAccessModalOpen(false)} className="text-gray-400 hover:text-red-500 transition"><ShieldAlert size={20}/></button>
                        </div>
                        <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
                            <div className="space-y-3">
                                {allUsers?.filter(u => u.role !== 'super_admin').map(user => {
                                    const isUserBlocked = accessData.blocked_uids?.includes(user.id);
                                    const isUserReadOnly = accessData.readonly_uids?.includes(user.id);
                                    const isFullAccess = !isUserBlocked && !isUserReadOnly;

                                    return (
                                        <div key={user.id} className="flex items-center justify-between p-4 bg-white dark:bg-gray-700/50 rounded-xl border border-gray-200 dark:border-gray-600 hover:shadow-md transition">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold text-sm">
                                                    {user.name?.charAt(0) || user.email?.charAt(0)}
                                                </div>
                                                <div>
                                                    <p className="font-bold text-gray-800 dark:text-white text-sm">{user.name || user.email}</p>
                                                    <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">{user.role}</p>
                                                </div>
                                            </div>
                                            <div className="flex gap-2">
                                                {/* Read Only Toggle */}
                                                <button 
                                                    onClick={() => handleToggleAccess(user.id, 'readonly')}
                                                    className={`px-3 py-1.5 rounded-lg border text-xs font-bold transition flex items-center gap-1 ${isUserReadOnly ? 'bg-orange-500 text-white border-orange-600 shadow-md' : 'bg-transparent text-gray-500 dark:text-gray-400 border-gray-300 dark:border-gray-600 hover:border-orange-500 hover:text-orange-500'}`}
                                                >
                                                    <Eye size={14}/> {isUserReadOnly ? 'Read Only' : 'Make Read-Only'}
                                                </button>

                                                {/* Block Toggle */}
                                                <button 
                                                    onClick={() => handleToggleAccess(user.id, 'block')}
                                                    className={`px-3 py-1.5 rounded-lg border text-xs font-bold transition flex items-center gap-1 ${isUserBlocked ? 'bg-red-600 text-white border-red-700 shadow-md' : 'bg-transparent text-gray-500 dark:text-gray-400 border-gray-300 dark:border-gray-600 hover:border-red-500 hover:text-red-500'}`}
                                                >
                                                    <Ban size={14}/> {isUserBlocked ? 'Blocked' : 'Block User'}
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                        <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/30 rounded-b-2xl flex justify-end">
                            <button onClick={() => setIsAccessModalOpen(false)} className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-lg transition active:scale-95">Close</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default OfficeData;