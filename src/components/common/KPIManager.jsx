// src/pages/admin/KPIManager.jsx

import React, { useState, useEffect, useMemo } from 'react';
import { 
    BarChart2, Target, Download, Save, User, FileText, ArrowLeft, Printer, 
    ChevronLeft, ChevronRight, Briefcase, Lock, CheckCircle, Crown, AlertTriangle, CalendarOff
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { collection, doc, query, where, getDocs, getDoc, writeBatch, serverTimestamp } from 'firebase/firestore';
import { db } from '../../Firebase';
import { useAuth } from '../../context/AuthContext';
import * as XLSX from 'xlsx';

// --- CONFIGURATION ---
const PERIODS = ['Monthly', 'Quarterly', 'Half-Yearly', 'Yearly'];
const MONTHS = ['April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December', 'January', 'February', 'March'];
const QUARTERS = ['Q1 (Apr-Jun)', 'Q2 (Jul-Sep)', 'Q3 (Oct-Dec)', 'Q4 (Jan-Mar)'];

// 🔥 ROLE LEVELS
const ROLE_LEVELS = {
    'super_admin': 4,
    'admin': 3,
    'hr': 2,
    'employee': 1
};

// --- HELPERS ---
const getFinancialYearFromDate = (dateObj) => {
    if (!dateObj) return null;
    const month = dateObj.getMonth();
    const year = dateObj.getFullYear();
    const startYear = month >= 3 ? year : year - 1;
    return `FY ${startYear}-${(startYear + 1).toString().slice(-2)}`;
};

const getCurrentFinancialYear = () => getFinancialYearFromDate(new Date());

const getYearFromFYString = (fyString) => {
    return parseInt(fyString.split(' ')[1].split('-')[0]);
};

const getCurrentPeriod = () => {
    const today = new Date();
    const month = today.getMonth(); 
    if (month <= 2) return { p: 'Quarterly', t: 'Q4 (Jan-Mar)' };
    if (month <= 5) return { p: 'Quarterly', t: 'Q1 (Apr-Jun)' };
    if (month <= 8) return { p: 'Quarterly', t: 'Q2 (Jul-Sep)' };
    return { p: 'Quarterly', t: 'Q3 (Oct-Dec)' };
};

const calculateScore = (target, actual) => {
    if (!target || target == 0) return 0;
    const score = Math.round((parseFloat(actual) / parseFloat(target)) * 100);
    return isNaN(score) ? 0 : score;
};

const getScoreColor = (score) => {
    if (score >= 100) return 'text-emerald-600 bg-emerald-50 border-emerald-200';
    if (score >= 80) return 'text-blue-600 bg-blue-50 border-blue-200';
    if (score >= 50) return 'text-orange-600 bg-orange-50 border-orange-200';
    return 'text-red-600 bg-red-50 border-red-200';
};

// --- SUB-COMPONENT: PRINTABLE SCORECARD ---
const ScorecardView = ({ employee, kpiData, period, timeFrame, year, onBack, onExport }) => {
    if (!employee) return null;

    const overallScore = useMemo(() => {
        if (kpiData.length === 0) return 0;
        const totalWeight = kpiData.reduce((acc, curr) => acc + (parseFloat(curr.weightage) || 0), 0);
        const weightedScore = kpiData.reduce((acc, curr) => acc + ((curr.score * (parseFloat(curr.weightage) || 0)) / 100), 0);
        return totalWeight > 0 ? Math.round((weightedScore / totalWeight) * 100) : 0;
    }, [kpiData]);

    const grade = overallScore >= 90 ? 'Outstanding' : overallScore >= 75 ? 'Exceeds Expectations' : overallScore >= 60 ? 'Meets Expectations' : 'Needs Improvement';
    const gradeColor = overallScore >= 90 ? 'text-emerald-600' : overallScore >= 75 ? 'text-blue-600' : overallScore >= 60 ? 'text-orange-600' : 'text-red-600';

    return (
        <div className="bg-gray-50 dark:bg-gray-900 min-h-screen flex flex-col w-full h-full relative">
            {/* Toolbar */}
            <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 sm:px-8 py-4 flex flex-col sm:flex-row justify-between items-center gap-4 print:hidden sticky top-0 z-50 shadow-sm">
                <button onClick={onBack} className="flex items-center gap-2 text-gray-600 dark:text-gray-300 hover:text-indigo-600 font-bold transition-colors">
                    <ArrowLeft size={20} /> Back to Dashboard
                </button>
                <div className="flex gap-3 w-full sm:w-auto">
                    <button onClick={() => window.print()} className="flex-1 sm:flex-none bg-gray-900 hover:bg-black dark:bg-gray-700 dark:hover:bg-gray-600 text-white px-5 py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg transition-transform active:scale-95">
                        <Printer size={18} /> Print Report
                    </button>
                    <button onClick={onExport} className="flex-1 sm:flex-none bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg transition-transform active:scale-95">
                        <Download size={18} /> Export Excel
                    </button>
                </div>
            </div>

            {/* Report Content */}
            <div className="flex-1 p-4 sm:p-8 overflow-y-auto custom-scrollbar print:overflow-visible print:h-auto print:p-0">
                <div id="printable-area" className="max-w-4xl mx-auto bg-white dark:bg-gray-800 rounded-[2rem] shadow-2xl overflow-hidden print:shadow-none print:rounded-none print:w-full print:max-w-none print:bg-white print:text-black">
                    <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-8 sm:p-10 text-white print:bg-none print:text-black print:p-0 print:mb-4 print:border-b-2 print:border-black">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-6 print:flex-row print:items-end">
                            <div>
                                <h1 className="text-3xl sm:text-4xl font-black uppercase tracking-tight mb-2 flex items-center gap-3 print:text-3xl print:mb-1">
                                    Performance Scorecard
                                </h1>
                                <p className="text-lg text-indigo-100 font-medium print:text-black print:text-sm">{period} Review • {timeFrame} • {year}</p>
                            </div>
                            <div className="text-left sm:text-right bg-white/10 p-4 rounded-xl backdrop-blur-sm print:bg-transparent print:p-0 print:text-right">
                                <h2 className="text-2xl font-bold print:text-xl">{employee.name}</h2>
                                <p className="text-sm text-indigo-100 uppercase tracking-widest font-bold print:text-black print:text-xs">{employee.designation || 'Employee'} • {employee.department || 'N/A'}</p>
                                <p className="text-xs text-indigo-200 mt-1 font-mono print:text-black">ID: {employee.empId || employee.id}</p>
                            </div>
                        </div>
                    </div>

                    <div className="p-8 sm:p-10 print:p-0 print:mt-4">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-10 print:grid-cols-3 print:gap-4 print:mb-6">
                            <div className="p-6 bg-gray-50 dark:bg-gray-700/30 rounded-2xl border border-gray-100 dark:border-gray-700 text-center print:border print:border-gray-300 print:bg-transparent print:p-2">
                                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 print:text-black">Overall Score</p>
                                <div className="text-5xl font-black text-gray-900 dark:text-white print:text-black print:text-4xl">{overallScore}%</div>
                            </div>
                            <div className="p-6 bg-gray-50 dark:bg-gray-700/30 rounded-2xl border border-gray-100 dark:border-gray-700 text-center col-span-2 flex flex-col justify-center print:border print:border-gray-300 print:bg-transparent print:p-2">
                                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1 print:text-black">Performance Grade</p>
                                <div className={`text-3xl font-black ${gradeColor} uppercase tracking-wide print:text-black print:text-2xl`}>{grade}</div>
                            </div>
                        </div>

                        <div className="mb-10 print:mb-6">
                            <h3 className="text-lg font-bold border-l-4 border-indigo-500 pl-3 mb-4 uppercase tracking-wider print:border-black print:mb-2 print:text-sm">Detailed Metrics</h3>
                            <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700 print:border-gray-300 print:rounded-none">
                                <table className="w-full text-left text-sm print:text-xs">
                                    <thead className="bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 font-bold uppercase print:bg-gray-200 print:text-black">
                                        <tr>
                                            <th className="px-6 py-4 print:px-2 print:py-1">KRA</th>
                                            <th className="px-4 py-4 text-center print:px-2 print:py-1">Weight</th>
                                            <th className="px-4 py-4 text-center print:px-2 print:py-1">Target</th>
                                            <th className="px-4 py-4 text-center print:px-2 print:py-1">Actual</th>
                                            <th className="px-4 py-4 text-center print:px-2 print:py-1">Score</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700 print:divide-gray-300">
                                        {kpiData.map((kpi, i) => (
                                            <tr key={i} className="print:text-black">
                                                <td className="px-6 py-4 print:px-2 print:py-1">
                                                    <div className="font-bold text-base print:text-sm">{kpi.title}</div>
                                                    <div className="text-xs text-gray-500 mt-1 print:text-gray-600">{kpi.kraTitle}</div>
                                                </td>
                                                <td className="px-4 py-4 text-center font-mono print:px-2 print:py-1">{kpi.weightage}%</td>
                                                <td className="px-4 py-4 text-center font-mono print:px-2 print:py-1">{kpi.target}</td>
                                                <td className="px-4 py-4 text-center font-mono font-bold text-indigo-600 dark:text-indigo-400 print:text-black print:px-2 print:py-1">{kpi.actual}</td>
                                                <td className="px-4 py-4 text-center print:px-2 print:py-1">
                                                    <span className="font-bold">{kpi.score}%</span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <div className="hidden print:grid mt-20 pt-8 border-t border-black grid-cols-2 gap-20">
                            <div>
                                <div className="h-px bg-black mb-2 w-48"></div>
                                <p className="text-xs font-bold uppercase text-black">Employee Signature</p>
                            </div>
                            <div>
                                <div className="h-px bg-black mb-2 w-48"></div>
                                <p className="text-xs font-bold uppercase text-black">Manager Signature</p>
                            </div>
                        </div>
                        <div className="hidden print:block mt-8 text-center text-[10px] text-gray-500">
                            Generated on {new Date().toLocaleDateString()} • Confidential Document • System Generated
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const KPIManager = () => {
  const { userProfile } = useAuth();
  const role = userProfile?.role || 'employee';
  const currentLevel = ROLE_LEVELS[role] || 0;

  // Permissions
  const canManage = currentLevel >= 2; // HR, Admin, Super Admin
  const isSuperAdmin = role === 'super_admin';
  
  const [employees, setEmployees] = useState([]);
  const [masterKras, setMasterKras] = useState([]);
  const [activeKras, setActiveKras] = useState([]); 
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('input'); 
  const [selectedYear, setSelectedYear] = useState(getCurrentFinancialYear());
  const [selectedPeriod, setSelectedPeriod] = useState(getCurrentPeriod().p);
  const [selectedTimeFrame, setSelectedTimeFrame] = useState(getCurrentPeriod().t);
  
  // If Manager, default empty. If Employee, default self.
  const [selectedEmployee, setSelectedEmployee] = useState(canManage ? '' : userProfile.uid);
  
  const [employeeDetails, setEmployeeDetails] = useState(null); 
  const [dateError, setDateError] = useState(null);
  const [inputValues, setInputValues] = useState({});

  useEffect(() => {
    const fetchData = async () => {
        setLoading(true);
        try {
            if (canManage) {
                // Fetch subordinates
                const q = query(collection(db, 'users')); 
                const empSnap = await getDocs(q);
                const allUsers = empSnap.docs.map(d => ({ id: d.id, ...d.data() }));
                const subordinates = allUsers.filter(u => ROLE_LEVELS[u.role || 'employee'] < currentLevel);
                setEmployees(subordinates);
            }
            const kraSnap = await getDocs(collection(db, 'kra_templates'));
            setMasterKras(kraSnap.docs.map(d => ({ id: d.id, ...d.data() })));
        } catch(err) { console.error(err); }
        setLoading(false);
    };
    fetchData();
  }, [canManage, currentLevel]);

  useEffect(() => {
      if(!selectedEmployee) {
          setEmployeeDetails(null);
          return;
      }

      const fetchContextData = async () => {
          setLoading(true);
          setDateError(null); 

          try {
              // If employee trying to view others -> block
              if (!canManage && selectedEmployee !== userProfile.uid) {
                  setLoading(false);
                  return;
              }

              const userRef = doc(db, 'users', selectedEmployee);
              const userSnap = await getDoc(userRef);
              const userData = userSnap.data();

              if (!userData) { setLoading(false); return; }
              setEmployeeDetails({ id: selectedEmployee, ...userData });

              const joiningDate = userData.joiningDate ? new Date(userData.joiningDate) : null;
              
              if (joiningDate) {
                  const fyStartYear = getYearFromFYString(selectedYear);
                  const fyEndYear = fyStartYear + 1;
                  if (joiningDate.getFullYear() > fyEndYear) {
                      setDateError(`Employee joined in ${joiningDate.getFullYear()}. Cannot view/edit records for ${selectedYear}.`);
                      setLoading(false);
                      return; 
                  }
              }

              // 🔥 FIX: Correctly filtering Approved KRAs + Mandatory KRAs
              const mandatory = masterKras.filter(k => k.department === userData.department && k.isMandatory);
              
              // Handle Approved Optional KRAs
              const approvedOptional = masterKras.filter(k => {
                  if (!userData.kras) return false;
                  return userData.kras.some(userKra => {
                      if (typeof userKra === 'string') return userKra === k.id;
                      return userKra.id === k.id && userKra.status === 'approved';
                  });
              });

              // Combine and Deduplicate
              const combined = [...new Map([...mandatory, ...approvedOptional].map(k => [k.id, k])).values()];
              setActiveKras(combined);

              const kpiQ = query(
                  collection(db, 'kpi_records'),
                  where('userId', '==', selectedEmployee),
                  where('financialYear', '==', selectedYear),
                  where('periodType', '==', selectedPeriod),
                  where('timeFrame', '==', selectedTimeFrame)
              );
              const kpiSnap = await getDocs(kpiQ);
              const existingRecords = kpiSnap.docs.map(d => ({ id: d.id, ...d.data() }));

              const initialInputs = {};
              combined.forEach(kra => {
                  const existing = existingRecords.find(r => r.kraId === kra.id);
                  initialInputs[kra.id] = {
                      target: existing?.target || '',
                      actual: existing?.actual || '',
                      weightage: existing?.weightage || kra.weightage || 0,
                      id: existing?.id || null 
                  };
              });
              setInputValues(initialInputs);

          } catch (err) { console.error(err); }
          setLoading(false);
      };
      fetchContextData();
  }, [selectedEmployee, selectedPeriod, selectedTimeFrame, selectedYear, masterKras, canManage, userProfile]);

  const handleInputChange = (kraId, field, value) => {
      setInputValues(prev => ({ ...prev, [kraId]: { ...prev[kraId], [field]: value } }));
  };

  const handleSaveAll = async () => {
      if (!selectedEmployee) return;
      if (!canManage) return alert("Access Denied: Employees cannot edit their own scores.");

      setLoading(true);
      const batch = writeBatch(db);
      const userObj = employeeDetails || { name: 'Current User' };

      try {
          activeKras.forEach(kra => {
              const input = inputValues[kra.id];
              if (!input) return;
              const kpiData = {
                  userId: selectedEmployee,
                  userName: userObj.name || userObj.email,
                  kraId: kra.id,
                  kraTitle: kra.title,
                  kraDescription: kra.description || '',
                  department: kra.department || '',
                  financialYear: selectedYear,
                  periodType: selectedPeriod,
                  timeFrame: selectedTimeFrame,
                  target: input.target,
                  actual: input.actual,
                  weightage: input.weightage,
                  score: calculateScore(input.target, input.actual),
                  updatedAt: serverTimestamp(),
                  updatedBy: userProfile.uid
              };
              if (input.id) {
                  const docRef = doc(db, 'kpi_records', input.id);
                  batch.update(docRef, kpiData);
              } else {
                  const docRef = doc(collection(db, 'kpi_records'));
                  batch.set(docRef, { ...kpiData, createdAt: serverTimestamp() });
              }
          });
          await batch.commit();
          alert("KPI Scorecard Updated Successfully! 🚀");
      } catch (err) { console.error(err); alert("Save Failed."); } 
      finally { setLoading(false); }
  };

  const scorecardData = useMemo(() => {
      return activeKras.map(kra => {
          const input = inputValues[kra.id] || { target: 0, actual: 0, weightage: 0 };
          return {
              title: kra.title,
              kraTitle: kra.description, 
              target: input.target,
              actual: input.actual,
              weightage: input.weightage,
              score: calculateScore(input.target, input.actual)
          };
      });
  }, [activeKras, inputValues]);

  const handleExportExcel = () => {
      if (scorecardData.length === 0) return alert("No data to export");
      const data = scorecardData.map(k => ({
          "KRA": k.title, "Weight %": k.weightage, "Target": k.target, "Actual": k.actual, "Score %": k.score
      }));
      const totalWeight = data.reduce((s, r) => s + Number(r["Weight %"] || 0), 0);
      const overall = Math.round(data.reduce((s, r) => s + (Number(r["Score %"]||0) * (Number(r["Weight %"]||0)/100)), 0));
      data.push({}); data.push({ "KRA": "OVERALL", "Score %": overall + "%", "Status": overall >= 80 ? "EXCELLENT" : "AVERAGE" });

      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Scorecard");
      XLSX.writeFile(wb, `${employeeDetails?.name}_${selectedTimeFrame}.xlsx`);
  };

  const calculatedOverallScore = useMemo(() => {
      if (activeKras.length === 0) return 0;
      let totalWeight = 0;
      let weightedSum = 0;
      activeKras.forEach(kra => {
          const val = inputValues[kra.id];
          if (val) {
              const w = parseFloat(val.weightage) || 0;
              const s = calculateScore(val.target, val.actual);
              totalWeight += w;
              weightedSum += (s * w);
          }
      });
      return totalWeight > 0 ? Math.round(weightedSum / totalWeight) : 0;
  }, [activeKras, inputValues]);

  if (viewMode === 'scorecard') {
      return (
          <ScorecardView 
              employee={employeeDetails} 
              kpiData={scorecardData} 
              period={selectedPeriod} 
              timeFrame={selectedTimeFrame} 
              year={selectedYear}
              onBack={() => setViewMode('input')}
              onExport={handleExportExcel}
          />
      );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 sm:p-6 md:p-10 font-sans text-gray-800 dark:text-gray-200">
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center mb-8 sm:mb-10 gap-6">
        <div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-teal-500 flex items-center gap-3 flex-wrap">
             <BarChart2 size={32} className="text-emerald-500" /> KPI Management
             {isSuperAdmin && <span className="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded-full border border-amber-200"><Crown size={12} className="inline mr-1"/>Owner</span>}
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-2 font-medium">Measure. Analyze. Improve.</p>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto bg-white dark:bg-gray-800 p-3 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700">
             {canManage ? (
                 <div className="relative w-full sm:w-auto">
                    <User className="absolute left-3 top-2.5 text-gray-400" size={16}/>
                    <select className="pl-9 pr-8 py-2.5 bg-gray-50 dark:bg-gray-700 border-none rounded-xl text-sm font-bold outline-none cursor-pointer w-full sm:w-48" value={selectedEmployee} onChange={(e) => setSelectedEmployee(e.target.value)}>
                        <option value="">Select Employee</option>
                        {employees.map(e => <option key={e.id} value={e.id}>{e.name || e.email} ({e.role})</option>)}
                    </select>
                 </div>
             ) : (
                <div className="px-4 py-2.5 bg-gray-100 dark:bg-gray-700 rounded-xl text-sm font-bold flex items-center gap-2 w-full sm:w-auto"><User size={16}/> My Performance</div>
             )}
             <div className="h-8 w-px bg-gray-200 dark:bg-gray-600 mx-1 hidden sm:block"></div>
             <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-700 rounded-xl px-2">
                 <button onClick={()=>setSelectedYear(prev => `FY ${parseInt(prev.split(' ')[1].split('-')[0]) - 1}-${parseInt(prev.split(' ')[1].split('-')[1]) - 1}`)} className="p-1 hover:text-indigo-500"><ChevronLeft size={16}/></button>
                 <span className="text-xs font-bold whitespace-nowrap">{selectedYear}</span>
                 <button onClick={()=>setSelectedYear(prev => `FY ${parseInt(prev.split(' ')[1].split('-')[0]) + 1}-${parseInt(prev.split(' ')[1].split('-')[1]) + 1}`)} className="p-1 hover:text-indigo-500"><ChevronRight size={16}/></button>
             </div>
             <select className="px-3 py-2.5 bg-gray-50 dark:bg-gray-700 border-none rounded-xl text-sm font-bold outline-none cursor-pointer flex-1 sm:flex-none" value={selectedPeriod} onChange={(e) => { setSelectedPeriod(e.target.value); setSelectedTimeFrame(e.target.value === 'Monthly' ? MONTHS[0] : QUARTERS[0]); }}>{PERIODS.map(p => <option key={p} value={p}>{p}</option>)}</select>
             <select className="px-3 py-2.5 bg-gray-50 dark:bg-gray-700 border-none rounded-xl text-sm font-bold outline-none cursor-pointer flex-1 sm:flex-none" value={selectedTimeFrame} onChange={(e) => setSelectedTimeFrame(e.target.value)}>{(selectedPeriod === 'Monthly' ? MONTHS : selectedPeriod === 'Quarterly' ? QUARTERS : selectedPeriod === 'Half-Yearly' ? ['H1 (Apr-Sep)', 'H2 (Oct-Mar)'] : ['Full Year']).map(t => <option key={t} value={t}>{t}</option>)}</select>
             {selectedEmployee && !dateError && (
                 <button onClick={() => setViewMode('scorecard')} className="w-full sm:w-auto flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl font-bold shadow-md transition-all active:scale-95 text-sm"><FileText size={16}/> View Scorecard</button>
             )}
        </div>
      </div>

      {dateError && (
          <div className="flex flex-col items-center justify-center py-20 bg-red-50 dark:bg-red-900/10 rounded-3xl border border-red-200 dark:border-red-800 mb-8">
              <CalendarOff size={48} className="text-red-400 mb-4"/>
              <h2 className="text-xl font-bold text-red-700 dark:text-red-400">Invalid Period Selected</h2>
              <p className="text-red-500 mt-2 text-center max-w-md">{dateError}</p>
              <button onClick={() => setSelectedYear(getCurrentFinancialYear())} className="mt-4 px-4 py-2 bg-white dark:bg-red-900/40 border border-red-200 dark:border-red-700 text-red-600 dark:text-red-300 rounded-lg text-sm font-bold">Jump to Current FY</button>
          </div>
      )}

      {!selectedEmployee && !dateError ? (
          <div className="flex flex-col items-center justify-center py-20 bg-white dark:bg-gray-800 rounded-3xl border-2 border-dashed border-gray-300 dark:border-gray-700">
             <div className="w-20 h-20 bg-gray-50 dark:bg-gray-700 rounded-full flex items-center justify-center mb-4"><Target size={32} className="text-gray-400"/></div>
             <h2 className="text-xl font-bold text-gray-700 dark:text-gray-300">Select an Employee</h2>
          </div>
      ) : selectedEmployee && !dateError ? (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
              <div className="lg:col-span-1 space-y-6">
                 <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-gradient-to-br from-indigo-600 to-violet-700 text-white p-6 rounded-3xl shadow-xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-10"><CheckCircle size={100} /></div>
                    <h3 className="text-sm font-bold uppercase tracking-widest text-indigo-200 mb-1">Overall Score</h3>
                    <div className="flex items-baseline gap-1 mt-2"><span className="text-5xl font-black">{calculatedOverallScore}</span><span className="text-xl font-bold text-indigo-200">%</span></div>
                    <div className="mt-4 pt-4 border-t border-white/20"><p className="text-lg font-bold">{calculatedOverallScore >= 90 ? '🏆 Outstanding' : calculatedOverallScore >= 75 ? '🌟 Good' : '⚠️ Needs Imp.'}</p></div>
                 </motion.div>
                 
                 <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700">
                    <h3 className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-4">Quick Stats</h3>
                    <div className="space-y-4">
                        <div className="flex justify-between text-sm"><span className="text-gray-500">Total KRAs</span> <span className="font-bold">{activeKras.length}</span></div>
                        <div className="flex justify-between text-sm"><span className="text-gray-500">Completed 100%</span> <span className="font-bold text-emerald-600">{activeKras.filter(k => calculateScore((inputValues[k.id]||{}).target, (inputValues[k.id]||{}).actual) >= 100).length}</span></div>
                    </div>
                 </div>
              </div>

              <div className="lg:col-span-3">
                 <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                    <div className="px-6 sm:px-8 py-6 border-b border-gray-100 dark:border-gray-700 flex flex-col sm:flex-row justify-between items-start sm:items-center bg-gray-50/50 dark:bg-gray-900/30 gap-4">
                       <h2 className="text-xl font-bold text-gray-800 dark:text-white">Performance Input</h2>
                       {canManage && <button onClick={handleSaveAll} disabled={loading} className="bg-gray-900 hover:bg-black dark:bg-white dark:hover:bg-gray-100 dark:text-gray-900 text-white px-6 py-2 rounded-xl font-bold shadow-lg transition-all active:scale-95 flex items-center gap-2 w-full sm:w-auto justify-center">{loading?'Saving...':<><Save size={18}/> Save Changes</>}</button>}
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left min-w-[600px]">
                           <thead className="bg-gray-50 dark:bg-gray-700/30 text-xs font-bold text-gray-500 uppercase tracking-wider">
                              <tr>
                                 <th className="px-6 py-4 w-1/3">KRA</th>
                                 <th className="px-4 py-4 text-center w-24">Weight %</th>
                                 <th className="px-4 py-4 text-center w-32">Target</th>
                                 <th className="px-4 py-4 text-center w-32">Actual</th>
                                 <th className="px-4 py-4 text-center w-24">Score</th>
                              </tr>
                           </thead>
                           <tbody className="divide-y divide-gray-100 dark:divide-gray-700 text-sm">
                              {activeKras.length === 0 ? (
                                  <tr><td colSpan="5" className="p-10 text-center text-gray-400">No Approved KRAs found. Check KRA Manager.</td></tr>
                              ) : (
                                  activeKras.map((kra) => {
                                     const input = inputValues[kra.id] || { target: '', actual: '', weightage: kra.weightage };
                                     const score = calculateScore(input.target, input.actual);
                                     return (
                                         <tr key={kra.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/50 transition-colors">
                                             <td className="px-6 py-4">
                                                <div className="font-bold text-gray-800 dark:text-gray-200">{kra.title}</div>
                                                {kra.isMandatory && <span className="text-[10px] text-red-500 font-bold uppercase">Mandatory</span>}
                                             </td>
                                             <td className="px-4 py-4 text-center"><input type="number" className="w-16 p-2 text-center bg-gray-100 dark:bg-gray-900 border border-transparent focus:border-indigo-500 rounded-lg text-sm font-bold outline-none" value={input.weightage} onChange={(e) => handleInputChange(kra.id, 'weightage', e.target.value)} disabled={!canManage}/></td>
                                             <td className="px-4 py-4 text-center"><input type="number" placeholder="0" className="w-24 p-2 text-center bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 focus:border-indigo-500 rounded-lg text-sm font-bold outline-none" value={input.target} onChange={(e) => handleInputChange(kra.id, 'target', e.target.value)} disabled={!canManage}/></td>
                                             <td className="px-4 py-4 text-center"><input type="number" placeholder="0" className="w-24 p-2 text-center bg-white dark:bg-gray-800 border-2 border-indigo-100 dark:border-gray-600 focus:border-indigo-500 rounded-lg text-sm font-bold outline-none text-indigo-600 dark:text-indigo-400" value={input.actual} onChange={(e) => handleInputChange(kra.id, 'actual', e.target.value)} disabled={!canManage}/></td>
                                             <td className="px-4 py-4 text-center"><span className={`px-3 py-1 rounded-lg text-xs font-bold ${getScoreColor(score)}`}>{score}%</span></td>
                                         </tr>
                                      );
                                  })
                              )}
                           </tbody>
                        </table>
                    </div>
                 </div>
              </div>
          </div>
      ) : null}
      
      <style>{`
        @media print {
            html, body { height: auto !important; overflow: visible !important; background-color: white !important; margin: 0 !important; padding: 0 !important; }
            #root { display: none !important; }
            #printable-area { display: block !important; position: absolute !important; top: 0 !important; left: 0 !important; width: 100% !important; margin: 0 !important; padding: 20px !important; visibility: visible !important; background-color: white !important; color: black !important; z-index: 9999 !important; }
            #printable-area * { visibility: visible !important; }
        }
        .input-std { width: 100%; padding: 0.75rem; border-radius: 0.5rem; border: 1px solid #e5e7eb; background-color: #f9fafb; outline: none; transition: all 0.2s; font-size: 0.875rem; }
        .dark .input-std { background-color: #1f2937; border-color: #374151; color: white; }
        .input-std:focus { border-color: #3b82f6; background-color: white; box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1); }
        .dark .input-std:focus { background-color: #0f172a; }
        .custom-scrollbar::-webkit-scrollbar { width: 5px; height: 5px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }
      `}</style>
    </div>
  );
};

export default KPIManager;