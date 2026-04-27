import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Save, Building2, UserCheck, Calendar, Download, List,
    DollarSign, Briefcase, CreditCard, MapPin, User, Shield, Crown
} from 'lucide-react';
import { useFirestore } from '../../hooks/useFirestore';
import { useAuth } from '../../context/AuthContext';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// Tax Slabs (Standard Professional Tax)
const PT_SLABS = [{ limit: 7500, tax: 0 }, { limit: 10000, tax: 175 }, { limit: Infinity, tax: 200 }];

// 🔥 Hierarchy Levels
const ROLE_LEVELS = {
    'super_admin': 4,
    'admin': 3,
    'hr': 2,
    'employee': 1
};

const EnterprisePayroll = () => {
    const navigate = useNavigate();
    const { userProfile } = useAuth();
    const currentLevel = ROLE_LEVELS[userProfile?.role] || 0;

    // Database Hooks
    const { addDocument } = useFirestore('payroll');
    const { data: allUsers } = useFirestore('users'); // Fetch all, filter in JS

    // --- 1. Filter Users for Payroll Dropdown ---
    const employees = useMemo(() => {
        if (!allUsers) return [];
        return allUsers.filter(u => {
            const uLevel = ROLE_LEVELS[u.role] || 0;
            // You can only pay people BELOW your rank
            return uLevel < currentLevel;
        }).sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    }, [allUsers, currentLevel]);

    // State
    const [targetMonth, setTargetMonth] = useState(new Date().toISOString().slice(0, 7));
    const [selectedEmpUid, setSelectedEmpUid] = useState('');

    // Form Data
    const [empDetails, setEmpDetails] = useState({
        name: '', id: '', designation: '', department: '',
        pan: '', uan: '', bank: '', bankName: '', doj: '',
        pfNo: '', epsNo: '', location: 'London', role: ''
    });

    const [salaryMode, setSalaryMode] = useState('yearly');
    const [salaryInput, setSalaryInput] = useState(600000);
    const [settings, setSettings] = useState({
        monthDays: 30, paidDays: 30, basicPercent: 50,
        pfEnabled: true, esicEnabled: true, ptEnabled: true,
    });

    const [financials, setFinancials] = useState({
        basic: 0, hra: 0, special: 0, incentive: 0, arrears: 0,
        pf: 0, esic: 0, pt: 0, tds: 0, advance: 0
    });

    // --- AUTO FILL EMPLOYEE DATA ---
    useEffect(() => {
        if (selectedEmpUid && employees) {
            const emp = employees.find(e => e.id === selectedEmpUid);
            if (emp) {
                setEmpDetails(prev => ({
                    ...prev,
                    name: emp.name || '', id: emp.empId || '',
                    designation: emp.designation || '', department: emp.department || '',
                    pan: emp.pan || '', uan: emp.uan || '',
                    bank: emp.bankAccount || '', bankName: emp.bankName || 'HDFC Bank',
                    doj: emp.joiningDate || '', pfNo: emp.pfNo || '', epsNo: emp.epsNo || '',
                    location: emp.location || 'London', role: emp.role || 'employee'
                }));
                // If employee has a saved CTC, populate it (Assuming 'ctc' field exists)
                if (emp.ctc) { setSalaryMode('yearly'); setSalaryInput(Number(emp.ctc)); }
            }
        }
    }, [selectedEmpUid, employees]);

    // --- SALARY CALCULATOR ENGINE ---
    useEffect(() => {
        let monthlyCTC = salaryMode === 'yearly' ? Number(salaryInput) / 12 : Number(salaryInput);
        const proration = settings.monthDays > 0 ? settings.paidDays / settings.monthDays : 0;

        // 1. Earnings
        const masterBasic = Math.round(monthlyCTC * (settings.basicPercent / 100));
        const basic = Math.round(masterBasic * proration);

        const masterHra = Math.round(masterBasic * 0.50);
        const hra = Math.round(masterHra * proration);

        const masterSpecial = Math.round(monthlyCTC) - (masterBasic + masterHra);
        const special = Math.round(masterSpecial * proration); // Remainder goes to Special

        // 2. Deductions
        let pf = 0;
        if (settings.pfEnabled) {
            // PF usually capped at 15000 Basic for employer share, but often calculated on full basic for employee
            const pfBasis = basic > 15000 ? 15000 : basic;
            pf = Math.round(pfBasis * 0.12);
        }

        let esic = 0;
        const gross = basic + hra + special;
        if (settings.esicEnabled && gross <= 21000) { esic = Math.ceil(gross * 0.0075); }

        let pt = 0;
        if (settings.ptEnabled) { const slab = PT_SLABS.find(s => gross <= s.limit); pt = slab ? slab.tax : 200; }

        setFinancials(prev => ({ ...prev, basic, hra, special, pf, esic, pt }));
    }, [salaryInput, salaryMode, settings]);

    // --- TOTALS ---
    const totals = useMemo(() => {
        const grossEarnings = Number(financials.basic) + Number(financials.hra) + Number(financials.special) + Number(financials.incentive) + Number(financials.arrears);
        const totalDeductions = Number(financials.pf) + Number(financials.esic) + Number(financials.pt) + Number(financials.tds) + Number(financials.advance);
        return { grossEarnings, totalDeductions, netPay: grossEarnings - totalDeductions };
    }, [financials]);

    const handleDetailsChange = (e) => setEmpDetails({ ...empDetails, [e.target.name]: e.target.value });
    const handleFinancialChange = (e) => setFinancials({ ...financials, [e.target.name]: Number(e.target.value) });

    // --- SAVE TO FIRESTORE ---
    const handleSaveRecord = async () => {
        if (!empDetails.name) return alert("Please select an employee first.");

        const record = {
            employeeId: empDetails.id, // Links to user profile
            employeeName: empDetails.name,
            empCode: empDetails.id,
            designation: empDetails.designation,
            department: empDetails.department,
            month: targetMonth,

            // Financials
            basicSalary: financials.basic,
            hra: financials.hra,
            specialAllowance: financials.special,
            incentive: financials.incentive,
            arrears: financials.arrears,
            pf: financials.pf,
            esic: financials.esic,
            pt: financials.pt,
            tds: financials.tds,
            advanceSalary: financials.advance,

            // Totals
            grossEarnings: totals.grossEarnings,
            totalDeductions: totals.totalDeductions,
            netSalary: totals.netPay,
            paidDays: settings.paidDays,

            // Meta
            bankAccount: empDetails.bank,
            panNo: empDetails.pan,
            uanNo: empDetails.uan,

            createdAt: new Date().toISOString(),
            generatedBy: userProfile.uid
        };

        await addDocument(record);
        alert("Payroll Record Saved Successfully!");
        navigate('/hr/payroll-management');
    };

    // --- PDF GENERATOR (Embedded) ---
    const handleGeneratePDF = () => {
        try {
            const doc = new jsPDF();

            // Header
            doc.setFillColor(30, 41, 59);
            doc.rect(0, 0, 210, 40, 'F');

            doc.setTextColor(255, 255, 255);
            doc.setFontSize(22);
            doc.setFont("helvetica", "bold");
            doc.text("ONLINE HRMS & PAYROLL", 15, 20);

            doc.setFontSize(10);
            doc.setFont("helvetica", "normal");
            doc.text("Tech Park, London, UK", 15, 28);

            doc.setFontSize(16);
            doc.text("PAYSLIP", 180, 20, { align: "right" });
            doc.setFontSize(10);
            doc.text(targetMonth, 180, 28, { align: "right" });

            // Employee Data
            doc.setTextColor(0, 0, 0);
            autoTable(doc, {
                startY: 45,
                theme: 'plain',
                styles: { fontSize: 9, cellPadding: 2 },
                body: [
                    ['Emp Name', empDetails.name, 'Designation', empDetails.designation],
                    ['Emp ID', empDetails.id, 'Department', empDetails.department],
                    ['Bank A/c', empDetails.bank, 'PAN No', empDetails.pan],
                    ['Days Payable', settings.paidDays, 'UAN', empDetails.uan],
                ],
                columnStyles: { 0: { fontStyle: 'bold', width: 30 }, 2: { fontStyle: 'bold', width: 30 } }
            });

            // Financial Table
            autoTable(doc, {
                startY: doc.lastAutoTable.finalY + 5,
                head: [['EARNINGS', 'AMOUNT (Rs)', 'DEDUCTIONS', 'AMOUNT (Rs)']],
                body: [
                    ['Basic Salary', financials.basic.toLocaleString(), 'Provident Fund', financials.pf.toLocaleString()],
                    ['HRA', financials.hra.toLocaleString(), 'Professional Tax', financials.pt.toLocaleString()],
                    ['Special Allow.', financials.special.toLocaleString(), 'ESIC', financials.esic.toLocaleString()],
                    ['Incentive', financials.incentive.toLocaleString(), 'TDS (Income Tax)', financials.tds.toLocaleString()],
                    ['Arrears', financials.arrears.toLocaleString(), 'Salary Advance', financials.advance.toLocaleString()],
                    ['', '', '', ''],
                    [
                        { content: 'Gross Earnings', styles: { fontStyle: 'bold' } },
                        { content: totals.grossEarnings.toLocaleString(), styles: { fontStyle: 'bold' } },
                        { content: 'Total Deductions', styles: { fontStyle: 'bold' } },
                        { content: totals.totalDeductions.toLocaleString(), styles: { fontStyle: 'bold' } }
                    ]
                ],
                theme: 'grid',
                headStyles: { fillColor: [41, 128, 185], textColor: 255 },
            });

            // Net Pay
            const finalY = doc.lastAutoTable.finalY + 10;
            doc.setFontSize(14);
            doc.setFont("helvetica", "bold");
            doc.text(`NET PAYABLE: Rs. ${totals.netPay.toLocaleString()}/-`, 180, finalY + 10, { align: "right" });

            const pdfBlob = doc.output('blob');
            const pdfUrl = URL.createObjectURL(pdfBlob);
            window.open(pdfUrl, '_blank');
        } catch (err) {
            console.error(err);
            alert("Error generating PDF preview.");
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6 transition-colors font-sans text-gray-800 dark:text-gray-100">
            <div className="max-w-7xl mx-auto space-y-6">

                {/* --- HEADER --- */}
                <div className="flex flex-col md:flex-row justify-between items-center bg-white dark:bg-gray-800 p-5 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
                    <div>
                        <h1 className="text-2xl font-bold flex items-center gap-3 text-violet-600 dark:text-violet-400">
                            <Building2 size={28} /> Enterprise Payroll
                            {userProfile?.role === 'super_admin' && <span className="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded-full border border-amber-200"><Crown size={12} className="inline mr-1" />Owner</span>}
                        </h1>
                        <p className="text-xs text-gray-500 font-medium ml-10">Professional Salary Processing</p>
                    </div>
                    <div className="flex gap-3">
                        <button onClick={() => navigate('/hr/payroll-management')} className="px-4 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-gray-200 dark:hover:bg-gray-600"><List size={16} /> History</button>
                        <input type="month" value={targetMonth} onChange={(e) => setTargetMonth(e.target.value)} className="px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg font-bold text-sm outline-none dark:[color-scheme:dark]" />
                        <button onClick={handleGeneratePDF} className="px-5 py-2 bg-violet-600 text-white rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-violet-700 shadow-md"><Download size={16} /> Preview PDF</button>
                    </div>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

                    {/* --- LEFT COLUMN: DETAILS & CONFIG (1/3 Width) --- */}
                    <div className="xl:col-span-1 space-y-6">

                        {/* 1. EMPLOYEE DETAILS CARD */}
                        <div className="bg-white dark:bg-gray-800 p-5 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
                            <h3 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase mb-4 flex items-center gap-2"><UserCheck size={16} className="text-purple-500" /> Employee Details</h3>

                            <div className="space-y-3">
                                <select value={selectedEmpUid} onChange={(e) => setSelectedEmpUid(e.target.value)} className="w-full p-2.5 bg-violet-50 dark:bg-violet-900/20 border border-violet-200 dark:border-violet-800 rounded-lg font-bold text-sm outline-none dark:text-white cursor-pointer">
                                    <option value="">-- Select Employee --</option>
                                    {employees && employees.map(emp => <option key={emp.id} value={emp.id}>{emp.name} ({emp.role})</option>)}
                                </select>
                                <InputField label="Full Name" name="name" value={empDetails.name} onChange={handleDetailsChange} icon={<User size={14} />} />
                                <div className="grid grid-cols-2 gap-3">
                                    <InputField label="Emp ID" name="id" value={empDetails.id} onChange={handleDetailsChange} />
                                    <InputField label="Designation" name="designation" value={empDetails.designation} onChange={handleDetailsChange} />
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <InputField label="Department" name="department" value={empDetails.department} onChange={handleDetailsChange} />
                                    <InputField label="Location" name="location" value={empDetails.location} onChange={handleDetailsChange} icon={<MapPin size={14} />} />
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <InputField label="DOJ" name="doj" type="date" value={empDetails.doj} onChange={handleDetailsChange} />
                                    <InputField label="Role" name="role" value={empDetails.role} onChange={handleDetailsChange} readOnly={true} />
                                </div>
                            </div>
                        </div>

                        {/* 2. BANK & STATUTORY CARD */}
                        <div className="bg-white dark:bg-gray-800 p-5 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
                            <h3 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase mb-4 flex items-center gap-2"><Briefcase size={16} className="text-purple-500" /> Bank & Statutory</h3>
                            <div className="space-y-3">
                                <div className="grid grid-cols-2 gap-3">
                                    <InputField label="PAN No" name="pan" value={empDetails.pan} onChange={handleDetailsChange} />
                                    <InputField label="UAN No" name="uan" value={empDetails.uan} onChange={handleDetailsChange} />
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <InputField label="PF No" name="pfNo" value={empDetails.pfNo} onChange={handleDetailsChange} />
                                    <InputField label="EPS No" name="epsNo" value={empDetails.epsNo} onChange={handleDetailsChange} />
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <InputField label="Bank Name" name="bankName" value={empDetails.bankName} onChange={handleDetailsChange} icon={<Building2 size={14} />} />
                                    <InputField label="Account No" name="bank" value={empDetails.bank} onChange={handleDetailsChange} icon={<CreditCard size={14} />} />
                                </div>
                            </div>
                        </div>

                    </div>

                    {/* --- RIGHT COLUMN: SALARY & CALCULATOR (2/3 Width) --- */}
                    <div className="xl:col-span-2 space-y-6">

                        {/* 3. SALARY CONFIGURATION */}
                        <div className="bg-white dark:bg-gray-800 p-5 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 flex flex-col md:flex-row gap-6">
                            <div className="flex-1">
                                <h3 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase mb-3 flex items-center gap-2"><DollarSign size={16} className="text-green-500" /> CTC Structure</h3>
                                <div className="flex gap-2 mb-3">
                                    <button onClick={() => setSalaryMode('yearly')} className={`flex-1 py-2 text-xs font-bold rounded-lg border transition-all ${salaryMode === 'yearly' ? 'bg-green-50 dark:bg-green-900/20 border-green-500 text-green-700 dark:text-green-400' : 'border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400'}`}>Annual</button>
                                    <button onClick={() => setSalaryMode('monthly')} className={`flex-1 py-2 text-xs font-bold rounded-lg border transition-all ${salaryMode === 'monthly' ? 'bg-green-50 dark:bg-green-900/20 border-green-500 text-green-700 dark:text-green-400' : 'border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400'}`}>Monthly</button>
                                </div>
                                <div className="relative">
                                    <span className="absolute left-3 top-2.5 text-gray-400 font-bold">₹</span>
                                    <input type="number" value={salaryInput} onChange={(e) => setSalaryInput(e.target.value)} className="w-full pl-8 pr-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg outline-none font-bold text-lg dark:text-white" />
                                </div>
                            </div>

                            <div className="flex-1 border-l border-gray-200 dark:border-gray-700 pl-6">
                                <h3 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase mb-3 flex items-center gap-2"><Calendar size={16} className="text-orange-500" /> Attendance & Rules</h3>
                                <div className="grid grid-cols-2 gap-4 mb-4">
                                    <div><label className="text-[10px] font-bold text-gray-400 uppercase">Paid Days</label><input type="number" name="paidDays" value={settings.paidDays} onChange={(e) => setSettings({ ...settings, paidDays: e.target.value })} className="w-full p-2 bg-gray-50 dark:bg-gray-700 border dark:border-gray-600 rounded-lg outline-none text-sm font-bold dark:text-white" /></div>
                                    <div><label className="text-[10px] font-bold text-gray-400 uppercase">Total Days</label><input type="number" name="monthDays" value={settings.monthDays} onChange={(e) => setSettings({ ...settings, monthDays: e.target.value })} className="w-full p-2 bg-gray-50 dark:bg-gray-700 border dark:border-gray-600 rounded-lg outline-none text-sm font-bold dark:text-white" /></div>
                                </div>
                                <div className="flex gap-4 text-sm dark:text-gray-300">
                                    <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={settings.pfEnabled} onChange={(e) => setSettings({ ...settings, pfEnabled: e.target.checked })} className="accent-indigo-600" /> PF (12%)</label>
                                    <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={settings.esicEnabled} onChange={(e) => setSettings({ ...settings, esicEnabled: e.target.checked })} className="accent-indigo-600" /> ESIC</label>
                                </div>
                            </div>
                        </div>

                        {/* 4. MAIN CALCULATOR TABLE */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                            {/* EARNINGS */}
                            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm">
                                <div className="bg-emerald-50 dark:bg-emerald-900/20 p-3 border-b border-emerald-100 dark:border-emerald-800">
                                    <h3 className="font-bold text-emerald-700 dark:text-emerald-400 text-sm uppercase tracking-wide">Earnings</h3>
                                </div>
                                <div className="p-4 space-y-3">
                                    <MoneyRow label="Basic Salary" name="basic" value={financials.basic} onChange={handleFinancialChange} />
                                    <MoneyRow label="HRA" name="hra" value={financials.hra} onChange={handleFinancialChange} />
                                    <MoneyRow label="Special Allow." name="special" value={financials.special} onChange={handleFinancialChange} />
                                    <div className="h-px bg-gray-100 dark:bg-gray-700 my-1"></div>
                                    <MoneyRow label="Incentive" name="incentive" value={financials.incentive} onChange={handleFinancialChange} highlight />
                                    <MoneyRow label="Arrears" name="arrears" value={financials.arrears} onChange={handleFinancialChange} highlight />

                                    <div className="pt-3 border-t border-gray-200 dark:border-gray-700 flex justify-between items-center mt-2">
                                        <span className="text-sm font-bold text-gray-600 dark:text-gray-300">Gross Earnings</span>
                                        <span className="text-lg font-bold text-gray-800 dark:text-white">₹{totals.grossEarnings.toLocaleString()}</span>
                                    </div>
                                </div>
                            </div>

                            {/* DEDUCTIONS */}
                            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm">
                                <div className="bg-rose-50 dark:bg-rose-900/20 p-3 border-b border-rose-100 dark:border-rose-800">
                                    <h3 className="font-bold text-rose-700 dark:text-rose-400 text-sm uppercase tracking-wide">Deductions</h3>
                                </div>
                                <div className="p-4 space-y-3">
                                    <MoneyRow label="Provident Fund" name="pf" value={financials.pf} onChange={handleFinancialChange} />
                                    <MoneyRow label="ESIC" name="esic" value={financials.esic} onChange={handleFinancialChange} />
                                    <MoneyRow label="Professional Tax" name="pt" value={financials.pt} onChange={handleFinancialChange} />
                                    <div className="h-px bg-gray-100 dark:bg-gray-700 my-1"></div>
                                    <MoneyRow label="TDS (Income Tax)" name="tds" value={financials.tds} onChange={handleFinancialChange} highlight />
                                    <MoneyRow label="Salary Advance" name="advance" value={financials.advance} onChange={handleFinancialChange} highlight />

                                    <div className="pt-3 border-t border-gray-200 dark:border-gray-700 flex justify-between items-center mt-2">
                                        <span className="text-sm font-bold text-gray-600 dark:text-gray-300">Total Deductions</span>
                                        <span className="text-lg font-bold text-rose-600">₹{totals.totalDeductions.toLocaleString()}</span>
                                    </div>
                                </div>
                            </div>

                        </div>

                        {/* 5. NET PAY BAR */}
                        <div className="bg-gray-900 dark:bg-black text-white p-6 rounded-2xl shadow-xl flex justify-between items-center">
                            <div>
                                <p className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-1">Net Salary Payable</p>
                                <h1 className="text-4xl font-extrabold tracking-tight">₹{totals.netPay.toLocaleString()}</h1>
                            </div>
                            <button onClick={handleSaveRecord} className="bg-emerald-500 hover:bg-emerald-400 text-gray-900 px-8 py-3 rounded-xl font-bold shadow-lg shadow-emerald-500/20 active:scale-95 transition-all flex items-center gap-2">
                                <Save size={20} /> Save Record
                            </button>
                        </div>

                    </div>
                </div>
            </div>
        </div>
    );
};

// --- REUSABLE COMPONENTS ---

const InputField = ({ label, name, value, onChange, type = "text", icon, readOnly = false }) => (
    <div className="relative group">
        <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block group-focus-within:text-violet-500 transition-colors">{label}</label>
        <div className="relative">
            <input
                type={type}
                name={name}
                value={value}
                onChange={onChange}
                readOnly={readOnly}
                className={`w-full p-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg outline-none text-sm font-medium focus:border-violet-500 transition-all dark:text-white ${icon ? 'pl-8' : ''} ${readOnly ? 'opacity-60 cursor-not-allowed' : ''}`}
            />
            {icon && <span className="absolute left-2.5 top-2.5 text-gray-400">{icon}</span>}
        </div>
    </div>
);

const MoneyRow = ({ label, value, name, onChange, highlight }) => (
    <div className="flex justify-between items-center group">
        <span className={`text-sm font-medium ${highlight ? 'text-violet-600 dark:text-violet-400' : 'text-gray-600 dark:text-gray-400'}`}>{label}</span>
        <input
            type="number"
            name={name}
            value={value}
            onChange={onChange}
            className={`w-28 p-1.5 text-right bg-transparent border-b border-gray-300 dark:border-gray-600 text-sm font-bold outline-none focus:border-violet-500 focus:bg-gray-50 dark:focus:bg-gray-800 transition-colors ${highlight ? 'text-violet-600 dark:text-violet-300' : 'text-gray-800 dark:text-white'}`}
        />
    </div>
);

export default EnterprisePayroll;