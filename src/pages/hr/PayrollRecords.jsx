import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFirestore } from '../../hooks/useFirestore'; // Standardized Hook
import { useAuth } from '../../context/AuthContext';
import { Search, Eye, Download, FileText, ArrowLeft, X, Filter } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// 🔥 Hierarchy Levels
const ROLE_LEVELS = {
    'super_admin': 4,
    'admin': 3,
    'hr': 2,
    'employee': 1
};

const PayrollRecords = () => {
    const navigate = useNavigate();
    const { userProfile } = useAuth();
    const currentLevel = ROLE_LEVELS[userProfile?.role] || 0;

    // Fetch Data
    const { data: records, loading } = useFirestore('payroll');

    const [selectedMonth, setSelectedMonth] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [viewData, setViewData] = useState({ open: false, url: null, name: '' });

    // 🔍 Filter Logic (Hierarchy + Search)
    const filteredRecords = useMemo(() => {
        if (!records) return [];

        return records.filter(doc => {
            // 1. Role-Based Security
            // If Employee, only show own records
            if (userProfile?.role === 'employee' && doc.employeeId !== userProfile.uid) {
                return false;
            }

            // For Admins/HR, usually they can see all, OR you can restrict:
            // HR sees only Employees, Admin sees HR+Employees.
            // (Simplified logic: if you are Admin/HR, you can view the list, 
            // but ideally you filter out 'higher rank' payrolls if they exist)

            // 2. Search & Month Filter
            const matchMonth = selectedMonth ? doc.month === selectedMonth : true;
            const matchName = doc.employeeName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                doc.empCode?.toLowerCase().includes(searchTerm.toLowerCase());

            return matchMonth && matchName;
        }).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }, [records, selectedMonth, searchTerm, userProfile]);

    // 📄 Generate & View PDF (Inline Logic)
    const handleViewReceipt = (record) => {
        try {
            const doc = new jsPDF();

            // Header
            doc.setFillColor(30, 41, 59);
            doc.rect(0, 0, 210, 40, 'F');

            doc.setTextColor(255, 255, 255);
            doc.setFontSize(22);
            doc.setFont("helvetica", "bold");
            doc.text("hrms", 15, 20);

            doc.setFontSize(10);
            doc.setFont("helvetica", "normal");
            doc.text("Tech Park, Haridwar, Uttarakhand - 249403", 15, 28);

            doc.setFontSize(16);
            doc.text("PAYSLIP", 180, 20, { align: "right" });
            doc.setFontSize(10);
            doc.text(record.month || 'N/A', 180, 28, { align: "right" });

            // Employee Data
            doc.setTextColor(0, 0, 0);
            autoTable(doc, {
                startY: 45,
                theme: 'plain',
                styles: { fontSize: 9, cellPadding: 2 },
                body: [
                    ['Emp Name', record.employeeName, 'Designation', record.designation],
                    ['Emp ID', record.empCode || record.employeeId, 'Department', record.department || '-'],
                    ['Bank A/c', record.bankAccount || '-', 'PAN No', record.panNo || '-'],
                    ['Days Payable', record.paidDays || '-', 'UAN', record.uanNo || '-'],
                ],
                columnStyles: { 0: { fontStyle: 'bold', width: 30 }, 2: { fontStyle: 'bold', width: 30 } }
            });

            // Financials
            autoTable(doc, {
                startY: doc.lastAutoTable.finalY + 5,
                head: [['EARNINGS', 'AMOUNT (Rs)', 'DEDUCTIONS', 'AMOUNT (Rs)']],
                body: [
                    ['Basic Salary', (record.basicSalary || 0).toLocaleString(), 'Provident Fund', (record.pf || 0).toLocaleString()],
                    ['HRA', (record.hra || 0).toLocaleString(), 'Professional Tax', (record.pt || 0).toLocaleString()],
                    ['Special Allow.', (record.specialAllowance || 0).toLocaleString(), 'ESIC', (record.esic || 0).toLocaleString()],
                    ['Incentive', (record.incentive || 0).toLocaleString(), 'TDS', (record.tds || 0).toLocaleString()],
                    ['Arrears', (record.arrears || 0).toLocaleString(), 'Advance', (record.advanceSalary || 0).toLocaleString()],
                    ['', '', '', ''],
                    [
                        { content: 'Gross Earnings', styles: { fontStyle: 'bold' } },
                        { content: (record.grossEarnings || 0).toLocaleString(), styles: { fontStyle: 'bold' } },
                        { content: 'Total Deductions', styles: { fontStyle: 'bold' } },
                        { content: (record.totalDeductions || 0).toLocaleString(), styles: { fontStyle: 'bold' } }
                    ]
                ],
                theme: 'grid',
                headStyles: { fillColor: [41, 128, 185], textColor: 255 },
            });

            // Net Pay
            const finalY = doc.lastAutoTable.finalY + 10;
            doc.setFontSize(14);
            doc.setFont("helvetica", "bold");
            doc.text(`NET PAYABLE: Rs. ${(record.netSalary || 0).toLocaleString()}/-`, 180, finalY + 10, { align: "right" });

            // Create Blob URL
            const pdfBlob = doc.output('blob');
            const pdfUrl = URL.createObjectURL(pdfBlob);

            setViewData({
                open: true,
                url: pdfUrl,
                name: `Payslip_${record.employeeName}_${record.month}.pdf`
            });

        } catch (e) {
            console.error("PDF Error:", e);
            alert("Could not generate preview");
        }
    };

    const closeViewer = () => {
        if (viewData.url) URL.revokeObjectURL(viewData.url); // Cleanup memory
        setViewData({ open: false, url: null, name: '' });
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6 md:p-10 transition-colors">
            <div className="max-w-7xl mx-auto">

                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
                    <div className="flex items-center gap-4">
                        <button onClick={() => navigate(-1)} className="p-2 bg-white dark:bg-gray-800 rounded-full shadow hover:bg-gray-50 transition"><ArrowLeft size={20} className="text-gray-600 dark:text-gray-300" /></button>
                        <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white flex items-center gap-2">
                            <FileText className="text-violet-600" /> Payroll Records
                        </h1>
                    </div>
                </div>

                {/* Filters */}
                <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 mb-6 flex flex-col md:flex-row gap-4">
                    <input
                        type="month"
                        value={selectedMonth}
                        onChange={(e) => setSelectedMonth(e.target.value)}
                        className="input-field w-full md:w-auto font-bold dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:[color-scheme:dark]"
                    />
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
                        <input
                            type="text"
                            placeholder="Search by name or ID..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="input-field pl-10 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        />
                    </div>
                </div>

                {/* Table */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left whitespace-nowrap">
                            <thead className="bg-gray-100 dark:bg-gray-700/50 text-xs font-bold uppercase text-gray-600 dark:text-gray-300">
                                <tr>
                                    <th className="p-4">Employee</th>
                                    <th className="p-4">Period</th>
                                    <th className="p-4 text-right">Net Pay</th>
                                    <th className="p-4 text-center">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-700 text-sm">
                                {loading && <tr><td colSpan="4" className="p-8 text-center text-gray-500">Loading records...</td></tr>}

                                {!loading && filteredRecords.length === 0 && (
                                    <tr><td colSpan="4" className="p-8 text-center text-gray-500">No payroll records found.</td></tr>
                                )}

                                {!loading && filteredRecords.map((doc) => (
                                    <tr key={doc.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                                        <td className="p-4 font-bold text-gray-900 dark:text-white">
                                            {doc.employeeName}
                                            <span className="block text-xs text-gray-500 font-normal">{doc.designation}</span>
                                        </td>
                                        <td className="p-4">
                                            <span className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded text-xs font-bold">{doc.month}</span>
                                        </td>
                                        <td className="p-4 text-right font-bold text-emerald-600 dark:text-emerald-400">
                                            ₹{Number(doc.netSalary || 0).toLocaleString()}
                                        </td>
                                        <td className="p-4 text-center">
                                            <button onClick={() => handleViewReceipt(doc)} className="inline-flex items-center gap-1 px-3 py-1.5 bg-violet-50 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400 rounded-lg text-xs font-bold hover:bg-violet-100 dark:hover:bg-violet-900/50 transition-colors">
                                                <Eye size={14} /> View Slip
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* PDF Modal */}
            {viewData.open && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                    <div className="bg-white dark:bg-gray-900 w-full max-w-4xl h-[85vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-gray-200 dark:border-gray-700 animate-in fade-in zoom-in duration-200">
                        <div className="flex justify-between items-center px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                            <h3 className="font-bold text-lg text-gray-800 dark:text-white flex items-center gap-2"><FileText size={20} /> Payslip Preview</h3>
                            <div className="flex gap-3">
                                <a href={viewData.url} download={viewData.name} className="flex items-center gap-2 px-4 py-2 bg-violet-600 text-white text-sm font-bold rounded-lg hover:bg-violet-700 transition shadow-md">
                                    <Download size={16} /> Download
                                </a>
                                <button onClick={closeViewer} className="p-2 text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition"><X size={20} /></button>
                            </div>
                        </div>
                        <div className="flex-1 bg-gray-200 dark:bg-gray-950 p-4 overflow-hidden">
                            <iframe src={`${viewData.url}#toolbar=0&navpanes=0&scrollbar=0`} className="w-full h-full rounded-lg shadow-inner bg-white" title="PDF Preview" />
                        </div>
                    </div>
                </div>
            )}

            <style>{`
        .input-field { width: 100%; padding: 10px 12px; border: 1px solid #e5e7eb; border-radius: 12px; outline: none; transition: all 0.2s; }
        .input-field:focus { border-color: #7C3AED; box-shadow: 0 0 0 3px rgba(124, 58, 237, 0.1); }
      `}</style>
        </div>
    );
};

export default PayrollRecords;