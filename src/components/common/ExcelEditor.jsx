// src/components/common/ExcelEditor.jsx

import React, { useRef } from 'react';
import { Workbook } from "@fortune-sheet/react"; 
import "@fortune-sheet/react/dist/index.css"; 

function ExcelEditor({ initialData, onSave, onClose }) {
    const ref = useRef(null);

    // ⚙️ Advanced Configuration for Excel-like feel
    const settings = {
        data: initialData && initialData.length > 0 ? initialData : [{
            name: "Sheet1",
            celldata: [], 
            order: 0,
            row: 50,
            column: 20,
            config: {},
            status: 1
        }],
        onChange: (data) => {
            // Optional: Auto-save or debug logging
            // console.log("Data changed:", data);
        },
        lang: 'en', // Language
        
        // --- UI TOGGLES ---
        showinfobar: true,      // Show info bar (top title area)
        toolbar: true,          // Show toolbar (bold, italic, etc.)
        sheetFormulaBar: true,  // Show formula bar (fx) - Crucial for editing formulas!
        showsheetbar: true,     // Show sheet tabs at bottom
        showstatisticBar: true, // Show count/sum statistics at bottom right
        
        // --- FUNCTIONALITY ---
        formula: true,          // Enable formula calculation
        enableAddRow: true,     // Allow adding rows
        enableAddBackTop: true, // Allow adding rows at top
        
        // --- CONTEXT MENU (Right Click) ---
        enableContextMenu: true, 
        enablePivotTable: false, // Disable complex pivot tables for now (simplifies UX)
        
        // --- DEFAULT DIMENSIONS ---
        row: 50,                // Default rows
        column: 26,             // Default cols (A-Z)
        
        // --- HOOKS ---
        // You can hook into cell render or other events here if needed
        hooks: {
             beforeCreateDom: (luckysheet) => {
                 // Clean up or setup if needed
             }
        }
    };

    const handleSaveBtn = () => {
        // 💾 Save Logic
        if(ref.current) {
            // Get all data from the sheet instance
            // This returns the full data structure including formulas (f), values (v), styles, etc.
            const allSheets = ref.current.getAllSheets();
            onSave(allSheets);
        } else {
            alert("Editor loading... try again.");
        }
    };

    return (
        <div className="fixed inset-0 z-[100] bg-white flex flex-col h-screen w-screen overflow-hidden font-sans">
            
            {/* --- CUSTOM TOP BAR --- */}
            {/* This sits above the FortuneSheet toolbar to provide app-level controls (Save/Cancel) */}
            <div className="h-14 bg-gray-900 text-white flex justify-between items-center px-6 shadow-md shrink-0 z-50">
                <div className="flex items-center gap-3">
                    <div className="p-1.5 bg-green-600 rounded-lg shadow-sm">
                        <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                    </div>
                    <div>
                        <h2 className="text-sm font-bold tracking-wide uppercase text-gray-200">Advanced Editor</h2>
                    </div>
                </div>

                <div className="flex gap-3">
                    <button 
                        onClick={onClose}
                        className="px-4 py-1.5 bg-gray-700 hover:bg-gray-600 rounded-lg text-xs font-bold transition uppercase tracking-wider border border-gray-600"
                    >
                        Cancel
                    </button>
                    <button 
                        onClick={handleSaveBtn}
                        className="px-5 py-1.5 bg-green-600 hover:bg-green-700 rounded-lg text-xs font-bold shadow-lg flex items-center gap-2 transition transform active:scale-95 uppercase tracking-wider"
                    >
                        <span>💾</span> Save Changes
                    </button>
                </div>
            </div>

            {/* --- SHEET AREA --- */}
            <div className="flex-1 w-full h-full relative">
                {/* Workbook is the core component.
                    We use a container div with explicit dimensions to ensure it fills the space.
                 */}
                 <div style={{ width: '100%', height: '100%' }}>
                    <Workbook ref={ref} {...settings} />
                 </div>
            </div>
        </div>
    );
}

export default ExcelEditor;