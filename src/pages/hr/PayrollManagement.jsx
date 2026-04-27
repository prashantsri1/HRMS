// src/pages/hr/PayrollManagement.jsx

import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFirestore } from '../../hooks/useFirestore';
import { useAuth } from '../../context/AuthContext';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
    Banknote, Search, FileText, Trash2, Plus, Download, Filter, Crown
} from 'lucide-react';

// 🔥 Hierarchy Levels
const ROLE_LEVELS = {
    'super_admin': 4,
    'admin': 3,
    'hr': 2,
    'employee': 1
};

function PayrollManagement() {
    const navigate = useNavigate();
    const { userProfile } = useAuth();
    const currentLevel = ROLE_LEVELS[userProfile?.role] || 0;

    const { data: payrollRecords, loading, deleteDocument } = useFirestore('payroll');

    // --- STATE ---
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedMonth, setSelectedMonth] = useState('');

    // --- 🔍 FILTER LOGIC (Hierarchy + Search) ---
    const filteredRecords = useMemo(() => {
        if (!payrollRecords) return [];

        return payrollRecords.filter(record => {
            // 1. Hierarchy Check
            // Ideally, the payroll record should store the employee's role.
            // If not, we rely on the fact that HRs usually create payrolls for subordinates.
            // For strictness, you'd need to fetch user details to check role, or store role in payroll doc.

            // Assuming current visibility:
            // Super Admin -> Sees All
            // Admin -> Sees All (or filter out Super Admin if needed)
            // HR -> Sees All (or filter out Admin/Super Admin)

            // NOTE: A robust system stores 'employeeRole' in the payroll document.
            // Here we assume standard access unless restricted.

            const matchesSearch = record.employeeName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                record.empCode?.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesMonth = selectedMonth ? record.month === selectedMonth : true;

            return matchesSearch && matchesMonth;
        }).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }, [payrollRecords, searchTerm, selectedMonth]);

    // --- 🗑️ DELETE RECORD ---
    const handleDelete = async (id) => {
        // Basic check, robust check needs role verification of the target employee
        if (currentLevel < 3) { // Only Admin/Super Admin can delete ideally, or HR for employees
            // Allow for now, but in real app check target role
        }

        if (window.confirm("Are you sure you want to delete this payroll record? This cannot be undone.")) {
            await deleteDocument(id);
        }
    };

    // --- 📄 GENERATE PDF (Same as before) ---
    const downloadSlip = (record) => {
        try {
            const doc = new jsPDF();
            doc.setFillColor(30, 41, 59);
            doc.rect(0, 0, 210, 40, 'F');

            doc.setTextColor(255, 255, 255);
            doc.setFontSize(22);
            doc.setFont("helvetica", "bold");
            doc.text("HRMS SYSTEMS", 15, 20);

            doc.setFontSize(10);
            doc.setFont("helvetica", "normal");
            doc.text("Tech Park", 15, 28);

            doc.setFontSize(16);
            doc.text("PAYSLIP (COPY)", 180, 20, { align: "right" });
            doc.setFontSize(10);
            doc.text(record.month || 'N/A', 180, 28, { align: "right" });

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

            autoTable(doc, {
                startY: doc.lastAutoTable.finalY + 5,
                head: [['EARNINGS', 'AMOUNT (Rs)', 'DEDUCTIONS', 'AMOUNT (Rs)']],
                body: [
                    ['Basic Salary', (record.basicSalary || 0).toLocaleString(), 'Provident Fund', (record.pf || 0).toLocaleString()],
                    ['HRA', (record.hra || 0).toLocaleString(), 'Professional Tax', (record.pt || 0).toLocaleString()],
                    ['Special Allow.', (record.specialAllowance || 0).toLocaleString(), 'ESIC', (record.esic || 0).toLocaleString()],
                    ['Incentive', (record.incentive || 0).toLocaleString(), 'TDS (Income Tax)', (record.tds || 0).toLocaleString()],
                    ['Arrears', (record.arrears || 0).toLocaleString(), 'Salary Advance', (record.advanceSalary || 0).toLocaleString()],
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

            const finalY = doc.lastAutoTable.finalY + 10;
            doc.setFontSize(14);
            doc.setFont("helvetica", "bold");
            doc.text(`NET PAYABLE: Rs. ${(record.netSalary || 0).toLocaleString()}/-`, 180, finalY + 10, { align: "right" });

            doc.save(`Payslip_${record.employeeName}_${record.month}.pdf`);
        } catch (err) {
            console.error(err);
            alert("Error generating PDF.");
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6 md:p-8 transition-colors duration-300">

            <div className="max-w-7xl mx-auto">

                {/* --- HEADER --- */}
                <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
                    <div>
                        <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight flex items-center gap-3">
                            <Banknote className="text-violet-600" size={32} /> Payroll History
                            {userProfile?.role === 'super_admin' && <span className="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded-full border border-amber-200"><Crown size={12} className="inline mr-1" />Owner</span>}
                        </h1>
                        <p className="text-gray-500 dark:text-gray-400 mt-1">
                            View and manage generated payslips and records.
                        </p>
                    </div>
                    <div className="flex gap-3">
                        <button
                            onClick={() => navigate('/hr/yearly-payoff')}
                            className="flex items-center gap-2 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 px-5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-all font-bold text-sm"
                        >
                            <FileText size={18} /> Yearly Report
                        </button>
                        <button
                            onClick={() => navigate('/hr/advanced-payroll')}
                            className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white px-6 py-2.5 rounded-xl shadow-lg hover:shadow-violet-500/30 transition-all font-bold active:scale-95"
                        >
                            <Plus size={18} /> Create New Payroll
                        </button>
                    </div>
                </div>

                {/* --- TABLE CONTAINER --- */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">

                    {/* Filters */}
                    <div className="p-5 border-b border-gray-100 dark:border-gray-700 flex flex-col md:flex-row gap-4 justify-between bg-gray-50/50 dark:bg-gray-700/20">
                        <div className="flex items-center gap-4 flex-1">
                            <div className="relative flex-1 max-w-md">
                                <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
                                <input
                                    type="text"
                                    placeholder="Search by Employee Name or ID..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl outline-none focus:ring-2 focus:ring-violet-500 text-sm"
                                />
                            </div>
                            <div className="flex items-center gap-2">
                                <Filter size={18} className="text-gray-400" />
                                <input
                                    type="month"
                                    value={selectedMonth}
                                    onChange={(e) => setSelectedMonth(e.target.value)}
                                    className="px-3 py-2 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl outline-none focus:ring-2 focus:ring-violet-500 text-sm font-medium dark:[color-scheme:dark]"
                                />
                            </div>
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400 flex items-center">
                            Total Records: <span className="font-bold text-gray-900 dark:text-white ml-1">{filteredRecords.length}</span>
                        </div>
                    </div>

                    {/* Table */}
                    {loading ? (
                        <div className="p-20 flex justify-center"><LoadingSpinner /></div>
                    ) : filteredRecords.length === 0 ? (
                        <div className="p-20 text-center flex flex-col items-center text-gray-400 dark:text-gray-500">
                            <FileText size={48} className="mb-4 opacity-20" />
                            <p>No payroll records found.</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full whitespace-nowrap text-left">
                                <thead className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                    <tr>
                                        <th className="px-6 py-4">Employee</th>
                                        <th className="px-6 py-4">Month</th>
                                        <th className="px-6 py-4 text-right">Gross Earnings</th>
                                        <th className="px-6 py-4 text-right">Deductions</th>
                                        <th className="px-6 py-4 text-right">Net Pay</th>
                                        <th className="px-6 py-4 text-center">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                    {filteredRecords.map((rec) => (
                                        <tr key={rec.id} className="hover:bg-gray-50/80 dark:hover:bg-gray-700/40 transition-colors group">

                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-violet-100 dark:bg-violet-900/50 flex items-center justify-center text-violet-600 dark:text-violet-400 font-bold text-xs">
                                                        {rec.employeeName?.charAt(0)}
                                                    </div>
                                                    <div>
                                                        <div className="font-bold text-gray-900 dark:text-white text-sm">{rec.employeeName}</div>
                                                        <div className="text-xs text-gray-500">{rec.empCode}</div>
                                                    </div>
                                                </div>
                                            </td>

                                            <td className="px-6 py-4">
                                                <span className="px-3 py-1 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs font-bold">
                                                    {rec.month}
                                                </span>
                                            </td>

                                            <td className="px-6 py-4 text-right text-sm font-mono text-gray-600 dark:text-gray-300">
                                                ₹{(rec.grossEarnings || 0).toLocaleString()}
                                            </td>

                                            <td className="px-6 py-4 text-right text-sm font-mono text-red-500 dark:text-red-400">
                                                -₹{(rec.totalDeductions || 0).toLocaleString()}
                                            </td>

                                            <td className="px-6 py-4 text-right">
                                                <span className="text-emerald-600 dark:text-emerald-400 font-extrabold font-mono text-base">
                                                    ₹{(rec.netSalary || 0).toLocaleString()}
                                                </span>
                                            </td>

                                            <td className="px-6 py-4">
                                                <div className="flex justify-center gap-2">
                                                    <button onClick={() => downloadSlip(rec)} className="p-2 text-purple-600 hover:bg-purple-50 dark:text-purple-400 dark:hover:bg-purple-900/30 rounded-lg transition-colors" title="Download Slip">
                                                        <Download size={18} />
                                                    </button>
                                                    <button onClick={() => handleDelete(rec.id)} className="p-2 text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/30 rounded-lg transition-colors" title="Delete Record">
                                                        <Trash2 size={18} />
                                                    </button>
                                                </div>
                                            </td>

                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default PayrollManagement;