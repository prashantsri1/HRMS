// src/pages/hr/TravelRequisition.jsx

import React, { useState, useMemo, useEffect } from 'react';
import {
    Plane, Calendar, MapPin, IndianRupee, FileText, CheckCircle,
    XCircle, Clock, Plus, X, Download, User, Briefcase, FileCheck,
    Search, ArrowUpDown, Filter
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { jsPDF } from 'jspdf';
import { useAuth } from '../../context/AuthContext';
// Note: useCollection is removed to handle Firebase Rule Filtering properly on the frontend
import { collection, addDoc, updateDoc, doc, serverTimestamp, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../../Firebase';

// --- UTILS ---
const formatCurrency = (amount) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount || 0);

// 🔥 IMPROVED DATE PARSER TO FIX "INVALID DATE" ISSUES
const parseDate = (dateVal) => {
    if (!dateVal) return null;
    // Handle Firestore Timestamps
    if (dateVal.toDate) return dateVal.toDate();
    // Handle strings
    if (typeof dateVal === 'string') return new Date(dateVal);
    // Handle JS Dates
    return new Date(dateVal);
};

const formatDate = (dateVal) => {
    const date = parseDate(dateVal);
    return date && !isNaN(date) ? date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '-';
};

// --- ANIMATIONS ---
const fadeIn = { hidden: { opacity: 0, scale: 0.95 }, visible: { opacity: 1, scale: 1 }, exit: { opacity: 0, scale: 0.95 } };

// ==========================================
// 1. MODAL: EMPLOYEE REQUISITION FORM
// ==========================================
const RequisitionFormModal = ({ isOpen, onClose, userProfile }) => {
    const [formData, setFormData] = useState({
        purpose: 'Meeting', destination: '', startDate: '', endDate: '',
        transportMode: 'Flight', transportCost: '',
        stayDays: '', stayCostPerNight: '', dailyAllowance: ''
    });
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Auto-calculate Total Amount
    const totalAmount = useMemo(() => {
        const transport = parseFloat(formData.transportCost) || 0;
        const stay = (parseFloat(formData.stayDays) || 0) * (parseFloat(formData.stayCostPerNight) || 0);
        const daily = parseFloat(formData.dailyAllowance) || 0;
        return transport + stay + daily;
    }, [formData]);

    if (!isOpen) return null;

    const handleSubmit = async () => {
        if (!formData.destination || !formData.startDate || !formData.endDate) {
            return alert("Please fill the basic trip details!");
        }
        setIsSubmitting(true);
        try {
            const requisitionData = {
                ...formData,
                totalAmount,
                userId: userProfile.uid,
                userName: userProfile.name,
                department: userProfile.department || 'General',
                status: 'Pending Approval',
                createdAt: serverTimestamp()
            };
            await addDoc(collection(db, 'travel_requisitions'), requisitionData);
            onClose();
        } catch (error) {
            console.error("Error submitting:", error);
            alert("Submission failed!");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[70] p-4">
            <motion.div variants={fadeIn} initial="hidden" animate="visible" exit="exit" className="bg-white dark:bg-gray-800 w-full max-w-3xl rounded-3xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden flex flex-col max-h-[90vh]">
                <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-violet-50 dark:bg-gray-700/50">
                    <h2 className="text-xl font-black text-violet-700 dark:text-violet-400 flex items-center gap-2"><Plane size={24} /> New Travel Requisition</h2>
                    <button onClick={onClose} className="p-2 hover:bg-violet-100 dark:bg-gray-800 hover:dark:bg-gray-600 rounded-full"><X size={20} /></button>
                </div>

                <div className="p-6 overflow-y-auto custom-scrollbar space-y-6">
                    {/* Trip Info */}
                    <div>
                        <h3 className="text-sm font-bold text-gray-800 dark:text-gray-200 mb-4 flex items-center gap-2"><MapPin size={16} className="text-violet-500" /> Trip Information</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Purpose</label>
                                <select className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-violet-500" value={formData.purpose} onChange={e => setFormData({ ...formData, purpose: e.target.value })}>
                                    <option>Meeting</option><option>Site Visit</option><option>Event</option><option>Training</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Destination</label>
                                <input type="text" className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-violet-500" placeholder="City, State" value={formData.destination} onChange={e => setFormData({ ...formData, destination: e.target.value })} />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Start Date</label>
                                <input type="date" className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-violet-500" value={formData.startDate} onChange={e => setFormData({ ...formData, startDate: e.target.value })} />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">End Date</label>
                                <input type="date" className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-violet-500" value={formData.endDate} onChange={e => setFormData({ ...formData, endDate: e.target.value })} />
                            </div>
                        </div>
                    </div>

                    {/* Expense Estimate */}
                    <div className="bg-amber-50/50 dark:bg-amber-900/10 p-5 rounded-2xl border border-amber-100 dark:border-amber-900/30">
                        <h3 className="text-sm font-bold text-amber-800 dark:text-amber-500 mb-4 flex items-center gap-2"><IndianRupee size={16} /> Estimated Budget Breakdown</h3>

                        <div className="space-y-4">
                            <div className="flex gap-4">
                                <div className="flex-1">
                                    <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Transport Mode</label>
                                    <select className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 outline-none" value={formData.transportMode} onChange={e => setFormData({ ...formData, transportMode: e.target.value })}>
                                        <option>Flight</option><option>Train</option><option>Cab</option><option>Bus</option>
                                    </select>
                                </div>
                                <div className="flex-1">
                                    <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Transport Est. Cost</label>
                                    <input type="number" className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 outline-none" placeholder="₹ 0" value={formData.transportCost} onChange={e => setFormData({ ...formData, transportCost: e.target.value })} />
                                </div>
                            </div>

                            <div className="flex gap-4">
                                <div className="flex-1">
                                    <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Stay (No. of Days)</label>
                                    <input type="number" className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 outline-none" placeholder="Days" value={formData.stayDays} onChange={e => setFormData({ ...formData, stayDays: e.target.value })} />
                                </div>
                                <div className="flex-1">
                                    <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Cost Per Night</label>
                                    <input type="number" className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 outline-none" placeholder="₹ 0" value={formData.stayCostPerNight} onChange={e => setFormData({ ...formData, stayCostPerNight: e.target.value })} />
                                </div>
                            </div>

                            <div>
                                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Daily Allowance (Food/Local Commute)</label>
                                <input type="number" className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 outline-none" placeholder="Total Allowance ₹" value={formData.dailyAllowance} onChange={e => setFormData({ ...formData, dailyAllowance: e.target.value })} />
                            </div>
                        </div>

                        <div className="mt-5 pt-4 border-t border-amber-200 dark:border-amber-800/50 flex justify-between items-center">
                            <span className="text-sm font-black text-gray-600 dark:text-gray-400 uppercase tracking-widest">Total Request Amount</span>
                            <span className="text-2xl font-black text-violet-600 dark:text-violet-400">{formatCurrency(totalAmount)}</span>
                        </div>
                    </div>
                </div>

                <div className="p-5 border-t border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800 flex justify-end gap-3 shrink-0">
                    <button onClick={onClose} className="px-6 py-2.5 rounded-xl text-gray-500 hover:bg-gray-200 font-bold transition-colors">Cancel</button>
                    <button onClick={handleSubmit} disabled={isSubmitting} className="bg-violet-600 hover:bg-violet-700 text-white px-8 py-2.5 rounded-xl font-bold shadow-lg shadow-violet-200 transition-transform active:scale-95 disabled:opacity-70 flex items-center gap-2">
                        {isSubmitting ? "Submitting..." : <><CheckCircle size={18} /> Submit for Approval</>}
                    </button>
                </div>
            </motion.div>
        </div>
    );
};


// ==========================================
// 1.5 MODAL: APPROVAL WITH VOUCHER INPUT
// ==========================================
const ApprovalModal = ({ isOpen, onClose, onConfirm, reqId }) => {
    const [customVoucherId, setCustomVoucherId] = useState('');

    if (!isOpen) return null;

    const handleApprove = () => {
        const finalId = customVoucherId.trim() !== '' ? customVoucherId.trim() : `TRV-${reqId.substring(0, 6).toUpperCase()}`;
        onConfirm(reqId, 'Approved', finalId);
        setCustomVoucherId('');
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[70] p-4">
            <motion.div variants={fadeIn} initial="hidden" animate="visible" exit="exit" className="bg-white dark:bg-gray-800 w-full max-w-sm rounded-3xl shadow-2xl border border-gray-200 dark:border-gray-700 p-6">
                <h3 className="text-lg font-black text-gray-900 dark:text-white mb-2 flex items-center gap-2"><CheckCircle className="text-emerald-500" /> Approve Request</h3>
                <p className="text-sm text-gray-500 mb-6">You are about to approve this travel request. You can specify a custom Voucher ID or leave it blank to auto-generate.</p>

                <div className="mb-6">
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Voucher ID (Optional)</label>
                    <input
                        type="text"
                        className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-violet-500 font-mono text-sm"
                        placeholder={`Auto: TRV-${reqId.substring(0, 6).toUpperCase()}`}
                        value={customVoucherId}
                        onChange={e => setCustomVoucherId(e.target.value)}
                    />
                </div>

                <div className="flex justify-end gap-3">
                    <button onClick={onClose} className="px-5 py-2.5 rounded-xl text-gray-500 hover:bg-gray-100 font-bold transition-colors">Cancel</button>
                    <button onClick={handleApprove} className="bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-2.5 rounded-xl font-bold shadow-md transition-transform active:scale-95">Confirm Approval</button>
                </div>
            </motion.div>
        </div>
    );
};

// ==========================================
// 2. MAIN COMPONENT: TRAVEL MANAGEMENT
// ==========================================
const TravelRequisition = () => {
    const { userProfile } = useAuth();

    // --- 🔥 FIX: REPLACED useCollection WITH DIRECT QUERY FOR SECURITY RULES ---
    const [requisitions, setRequisitions] = useState([]);
    const [loading, setLoading] = useState(true);

    const role = userProfile?.role || 'employee';
    const isManager = ['admin', 'super_admin', 'hr'].includes(role);

    useEffect(() => {
        if (!userProfile?.uid) return;

        let q;
        if (isManager) {
            // Managers can see everything
            q = collection(db, 'travel_requisitions');
        } else {
            // Employees only query their own data to satisfy Firestore rules
            q = query(collection(db, 'travel_requisitions'), where('userId', '==', userProfile.uid));
        }

        const unsubscribe = onSnapshot(q, (snapshot) => {
            let results = [];
            snapshot.forEach(doc => {
                results.push({ id: doc.id, ...doc.data() });
            });
            setRequisitions(results);
            setLoading(false);
        }, (error) => {
            console.error("Firestore Fetch Error:", error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [userProfile?.uid, isManager]);
    // --------------------------------------------------------------------------

    // UI State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [approvalTarget, setApprovalTarget] = useState(null); // stores req ID for approval modal
    const [activeTab, setActiveTab] = useState('my_requests'); // 'my_requests' or 'team_requests'

    // Filtering & Sorting State
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('All');
    const [sortBy, setSortBy] = useState('newest'); // newest, oldest, amount_high, amount_low

    // --- ENHANCED FILTERING & SORTING ---
    const displayedData = useMemo(() => {
        if (!requisitions) return [];
        let data = [...requisitions];

        // 1. Tab Filter
        if (activeTab === 'my_requests') {
            data = data.filter(req => req.userId === userProfile.uid);
        } // 'team_requests' shows all for managers

        // 2. Status Filter
        if (statusFilter !== 'All') {
            data = data.filter(req => req.status === statusFilter);
        }

        // 3. Search Filter (Deep Search)
        if (searchTerm.trim()) {
            const lower = searchTerm.toLowerCase();
            data = data.filter(req =>
                (req.userName && req.userName.toLowerCase().includes(lower)) ||
                (req.destination && req.destination.toLowerCase().includes(lower)) ||
                (req.purpose && req.purpose.toLowerCase().includes(lower)) ||
                (req.voucherId && req.voucherId.toLowerCase().includes(lower))
            );
        }

        // 4. Sorting
        return data.sort((a, b) => {
            switch (sortBy) {
                case 'newest': return (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0);
                case 'oldest': return (a.createdAt?.seconds || 0) - (b.createdAt?.seconds || 0);
                case 'amount_high': return (b.totalAmount || 0) - (a.totalAmount || 0);
                case 'amount_low': return (a.totalAmount || 0) - (b.totalAmount || 0);
                default: return 0;
            }
        });

    }, [requisitions, activeTab, userProfile, searchTerm, statusFilter, sortBy]);

    // Handle Status Update (Reject is direct, Approve opens modal)
    const processStatusUpdate = async (id, newStatus, voucherId = null) => {
        try {
            const updatePayload = {
                status: newStatus,
                approvedBy: userProfile.name,
                approvedAt: serverTimestamp()
            };
            if (voucherId) updatePayload.voucherId = voucherId;

            await updateDoc(doc(db, 'travel_requisitions', id), updatePayload);
        } catch (error) {
            console.error("Error updating status", error);
            alert("Failed to update status");
        }
    };

    const handleRejectClick = (id) => {
        if (window.confirm("Are you sure you want to reject this request?")) {
            processStatusUpdate(id, 'Rejected');
        }
    };

    // 🔥 PDF GENERATOR FOR APPROVED VOUCHER
    const generateVoucherPDF = (req) => {
        const doc = new jsPDF('p', 'mm', 'a4');
        const pageWidth = doc.internal.pageSize.getWidth();
        const displayVoucherId = req.voucherId || `TRV-${req.id.substring(0, 6).toUpperCase()}`;

        // 1. Header (Company Identity)
        doc.setFillColor(79, 70, 229); // Indigo-600 background
        doc.rect(0, 0, pageWidth, 40, 'F');

        doc.setTextColor(255, 255, 255);
        doc.setFontSize(24);
        doc.setFont("helvetica", "bold");
        doc.text("HRMS SYSTEMS", 14, 20);

        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.text("Travel Authorization Voucher", 14, 28);

        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.text(`VOUCHER NO: #${displayVoucherId}`, pageWidth - 14, 24, { align: "right" });

        // 2. Employee Details Block
        doc.setTextColor(50, 50, 50);
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.text("Employee Details", 14, 55);

        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        doc.text(`Name: ${req.userName}`, 14, 63);
        doc.text(`Department: ${req.department}`, 14, 69);
        doc.text(`Request Date: ${formatDate(req.createdAt)}`, 14, 75);

        // 3. Trip Details Block
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.text("Trip Summary", 110, 55);

        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        doc.text(`Purpose: ${req.purpose}`, 110, 63);
        doc.text(`Destination: ${req.destination}`, 110, 69);
        doc.text(`Duration: ${formatDate(req.startDate)} to ${formatDate(req.endDate)}`, 110, 75);

        // Divider
        doc.setDrawColor(200, 200, 200);
        doc.line(14, 85, pageWidth - 14, 85);

        // 4. Expense Breakdown Table (Manual Drawing)
        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        doc.text("Approved Budget Breakdown", 14, 98);

        const startY = 105;
        const rowHeight = 10;

        // Table Header
        doc.setFillColor(240, 240, 240);
        doc.rect(14, startY, pageWidth - 28, rowHeight, 'F');
        doc.setFontSize(10);
        doc.text("Expense Category", 20, startY + 7);
        doc.text("Details", 80, startY + 7);
        doc.text("Amount (INR)", pageWidth - 20, startY + 7, { align: "right" });

        doc.setFont("helvetica", "normal");

        // Row 1: Transport
        doc.text("Transportation", 20, startY + rowHeight + 7);
        doc.text(`Mode: ${req.transportMode}`, 80, startY + rowHeight + 7);
        doc.text(`Rs. ${req.transportCost || 0}`, pageWidth - 20, startY + rowHeight + 7, { align: "right" });

        // Row 2: Stay
        doc.text("Accommodation", 20, startY + (rowHeight * 2) + 7);
        doc.text(`${req.stayDays || 0} Nights @ Rs.${req.stayCostPerNight || 0}/night`, 80, startY + (rowHeight * 2) + 7);
        doc.text(`Rs. ${(req.stayDays * req.stayCostPerNight) || 0}`, pageWidth - 20, startY + (rowHeight * 2) + 7, { align: "right" });

        // Row 3: Allowance
        doc.text("Daily Allowance", 20, startY + (rowHeight * 3) + 7);
        doc.text("Food & Local Commute", 80, startY + (rowHeight * 3) + 7);
        doc.text(`Rs. ${req.dailyAllowance || 0}`, pageWidth - 20, startY + (rowHeight * 3) + 7, { align: "right" });

        // Total Row
        doc.setFont("helvetica", "bold");
        doc.setFillColor(238, 242, 255); // Indigo-50
        doc.rect(14, startY + (rowHeight * 4), pageWidth - 28, rowHeight + 2, 'F');
        doc.text("Total Approved Amount", 80, startY + (rowHeight * 4) + 8);
        doc.text(`Rs. ${req.totalAmount}`, pageWidth - 20, startY + (rowHeight * 4) + 8, { align: "right" });

        // 5. Manager Approval Stamp
        doc.setDrawColor(34, 197, 94); // Emerald border
        doc.setLineWidth(1);
        doc.rect(pageWidth - 80, 170, 65, 30);
        doc.setTextColor(34, 197, 94);
        doc.setFontSize(14);
        doc.text("APPROVED", pageWidth - 47, 180, { align: "center" });
        doc.setFontSize(9);
        doc.setFont("helvetica", "normal");
        doc.text(`By: ${req.approvedBy}`, pageWidth - 47, 188, { align: "center" });
        doc.text(`Date: ${formatDate(req.approvedAt)}`, pageWidth - 47, 194, { align: "center" });

        // Footer
        doc.setTextColor(150, 150, 150);
        doc.setFontSize(8);
        doc.text("This is a system generated authorization voucher and does not require a physical signature.", pageWidth / 2, 280, { align: "center" });

        // Download
        doc.save(`Travel_Voucher_${displayVoucherId}.pdf`);
    };

    // Helpers for UI
    const getStatusUI = (status) => {
        switch (status) {
            case 'Approved': return { icon: <CheckCircle size={14} />, color: 'bg-emerald-100 text-emerald-700 border-emerald-200' };
            case 'Rejected': return { icon: <XCircle size={14} />, color: 'bg-rose-100 text-rose-700 border-rose-200' };
            default: return { icon: <Clock size={14} />, color: 'bg-amber-100 text-amber-700 border-amber-200' };
        }
    };

    return (
        <div className="h-dvh bg-gray-50/50 dark:bg-gray-900 flex flex-col font-sans text-gray-800 dark:text-gray-100">
            <AnimatePresence>
                {isModalOpen && <RequisitionFormModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} userProfile={userProfile} />}
                {approvalTarget && <ApprovalModal isOpen={!!approvalTarget} onClose={() => setApprovalTarget(null)} onConfirm={processStatusUpdate} reqId={approvalTarget} />}
            </AnimatePresence>

            {/* Header & Controls */}
            <div className="bg-white dark:bg-gray-800 px-6 py-5 border-b border-gray-200 dark:border-gray-700 flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 shrink-0 shadow-sm z-10">
                <div className="flex items-center gap-3">
                    <div className="bg-violet-100 dark:bg-violet-900/50 p-2.5 rounded-xl text-violet-600 dark:text-violet-400">
                        <Plane size={24} />
                    </div>
                    <div>
                        <h1 className="text-xl font-black">Travel & Expense</h1>
                        <p className="text-xs text-gray-500">Manage trip approvals and vouchers</p>
                    </div>
                </div>

                <div className="flex flex-col md:flex-row items-center gap-3 w-full xl:w-auto">
                    {/* Tabs for Managers */}
                    {isManager && (
                        <div className="flex bg-gray-100 dark:bg-gray-900 p-1 rounded-xl w-full md:w-auto">
                            <button onClick={() => setActiveTab('my_requests')} className={`flex-1 md:flex-none px-4 py-2.5 rounded-lg text-sm font-bold transition-all ${activeTab === 'my_requests' ? 'bg-white shadow text-violet-600' : 'text-gray-500'}`}>My Requests</button>
                            <button onClick={() => setActiveTab('team_requests')} className={`flex-1 md:flex-none px-4 py-2.5 rounded-lg text-sm font-bold transition-all ${activeTab === 'team_requests' ? 'bg-white shadow text-violet-600' : 'text-gray-500'}`}>Team Approvals</button>
                        </div>
                    )}

                    <button onClick={() => setIsModalOpen(true)} className="w-full md:w-auto flex items-center justify-center gap-2 bg-violet-600 hover:bg-violet-700 text-white px-5 py-2.5 rounded-xl font-bold shadow-lg shadow-violet-200 transition-all active:scale-95 shrink-0">
                        <Plus size={18} /> New Request
                    </button>
                </div>
            </div>

            {/* Search & Filters Bar */}
            <div className="bg-white/50 dark:bg-gray-800/50 backdrop-blur px-6 py-3 border-b border-gray-200 dark:border-gray-700 flex flex-col md:flex-row gap-3 shrink-0">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-2.5 text-gray-400" size={16} />
                    <input
                        placeholder="Search destination, name, voucher ID..."
                        className="w-full bg-white dark:bg-gray-900 pl-9 pr-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 outline-none focus:ring-2 focus:ring-violet-500 text-sm"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="flex gap-2 overflow-x-auto hide-scrollbar">
                    <select className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-sm font-bold outline-none cursor-pointer" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
                        <option value="All">All Status</option>
                        <option value="Pending Approval">Pending</option>
                        <option value="Approved">Approved</option>
                        <option value="Rejected">Rejected</option>
                    </select>
                    <select className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-sm font-bold outline-none cursor-pointer" value={sortBy} onChange={e => setSortBy(e.target.value)}>
                        <option value="newest">Newest First</option>
                        <option value="oldest">Oldest First</option>
                        <option value="amount_high">Highest Amount</option>
                        <option value="amount_low">Lowest Amount</option>
                    </select>
                </div>
            </div>

            {/* Content List */}
            <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                {loading ? (
                    <div className="h-full flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-600"></div></div>
                ) : displayedData.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-gray-400">
                        <FileCheck size={48} className="mb-4 opacity-20" />
                        <p>No travel requests found.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 max-w-7xl mx-auto pb-10">
                        {displayedData.map((req) => {
                            const statusUI = getStatusUI(req.status);
                            return (
                                <motion.div key={req.id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-white dark:bg-gray-800 rounded-3xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow flex flex-col">

                                    {/* --- ALWAYS VISIBLE STATUS BADGE --- */}
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="flex items-center gap-3">
                                            <div className="h-10 w-10 bg-violet-50 dark:bg-violet-900/30 rounded-full flex items-center justify-center text-violet-600 font-bold text-lg shrink-0">
                                                {req.userName.charAt(0)}
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-gray-900 dark:text-white">{req.userName}</h4>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[10px] text-gray-500 uppercase tracking-widest">{req.department}</span>
                                                    {req.voucherId && <span className="text-[10px] bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded font-mono text-gray-600 dark:text-gray-300">#{req.voucherId}</span>}
                                                </div>
                                            </div>
                                        </div>
                                        <span className={`flex items-center justify-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border shrink-0 min-w-max ${statusUI.color}`}>
                                            {statusUI.icon} <span>{req.status}</span>
                                        </span>
                                    </div>

                                    <div className="bg-gray-50 dark:bg-gray-900/50 rounded-2xl p-4 mb-4 grid grid-cols-2 gap-4 border border-gray-100 dark:border-gray-700 flex-1">
                                        <div>
                                            <p className="text-[10px] text-gray-400 uppercase font-bold mb-1 flex items-center gap-1"><Briefcase size={12} /> Purpose</p>
                                            <p className="text-sm font-bold text-gray-800 dark:text-gray-200">{req.purpose}</p>
                                        </div>
                                        <div>
                                            <p className="text-[10px] text-gray-400 uppercase font-bold mb-1 flex items-center gap-1"><MapPin size={12} /> Destination</p>
                                            <p className="text-sm font-bold text-gray-800 dark:text-gray-200 truncate">{req.destination}</p>
                                        </div>
                                        <div className="col-span-2 flex items-center gap-2 text-xs font-medium text-gray-600 dark:text-gray-400 bg-white dark:bg-gray-800 p-2 rounded-xl border border-gray-100 dark:border-gray-700">
                                            <Calendar size={14} className="text-violet-500 shrink-0" />
                                            {formatDate(req.startDate)} <ArrowRightIcon /> {formatDate(req.endDate)}
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between pt-4 border-t border-gray-100 dark:border-gray-700">
                                        <div>
                                            <p className="text-[10px] text-gray-400 uppercase font-bold mb-0.5">Total Est. Cost</p>
                                            <p className="text-lg font-black text-violet-600 dark:text-violet-400">{formatCurrency(req.totalAmount)}</p>
                                        </div>

                                        {/* Actions based on Tab and Role */}
                                        <div className="flex gap-2">
                                            {activeTab === 'team_requests' && req.status === 'Pending Approval' && (
                                                <>
                                                    <button onClick={() => handleRejectClick(req.id)} className="px-4 py-2 bg-rose-50 text-rose-600 hover:bg-rose-100 rounded-xl text-xs font-bold transition-colors">Reject</button>
                                                    <button onClick={() => setApprovalTarget(req.id)} className="px-4 py-2 bg-emerald-500 text-white hover:bg-emerald-600 rounded-xl text-xs font-bold shadow-md transition-colors flex items-center gap-1"><CheckCircle size={14} /> Approve</button>
                                                </>
                                            )}

                                            {req.status === 'Approved' && (
                                                <button onClick={() => generateVoucherPDF(req)} className="px-4 py-2 bg-violet-50 text-violet-700 hover:bg-violet-100 border border-violet-200 rounded-xl text-xs font-black transition-colors flex items-center gap-2">
                                                    <Download size={14} /> Voucher
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};

// Small helper icon
const ArrowRightIcon = () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400"><path d="M5 12h14" /><path d="m12 5 7 7-7 7" /></svg>;

export default TravelRequisition;