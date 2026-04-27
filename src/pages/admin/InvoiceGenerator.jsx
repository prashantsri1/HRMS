import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
// import logoImage from '../../assets/logo manuastro.jpg';
import {
  Save, Printer, RefreshCw, List, Truck, CreditCard,
  MapPin, Calendar, FileText, User, Layout, Image as ImageIcon,
  Trash2, Plus
} from 'lucide-react';
import useTallyShortcuts from '../../hooks/useTallyShortcuts';
import { useFirestore } from '../../hooks/useFirestore';
import { useCollection } from '../../hooks/useCollection';

// --- 🏦 COMPANY CONSTANTS ---
const COMPANY_STATE_CODE = '05';
const COMPANY_DETAILS = {
  name: "HRMS",
  address: "london",
  mobile: "1234567890",
  email: "[EMAIL_ADDRESS]",
  gstin: "abcd",
  state: "london",
  stateCode: "11",
  website: "www.HRMS.com"
};

const BANKS = [
  { name: "HDFC Bank", ac: "50200012345", ifsc: "HDFC0001234", branch: "Haridwar Industrial Area" }
];

// ✅ FINAL FIX: Valid JPEG Base64 (No PNG Chunk Errors)
const LOGO_URL = "";

const InvoiceGenerator = () => {
  const navigate = useNavigate();

  const { addDocument } = useFirestore('invoices');
  const { updateDocument: updateStock } = useFirestore('inventory');
  const { documents: oldInvoices } = useCollection('invoices');
  const { documents: inventoryItems } = useCollection('inventory');

  // --- STATE ---
  const [invoiceMeta, setInvoiceMeta] = useState({
    invoiceNo: `INV-${Date.now().toString().slice(-6)}`,
    date: new Date().toISOString().slice(0, 10),
    dueDate: '',
    transportMode: 'Road',
    vehicleNo: '',
    destination: '',
    termsOfDelivery: '',
    paymentStatus: 'Due',
    paymentMode: '',
    amountPaid: 0
  });

  const [partyDetails, setPartyDetails] = useState({
    name: '', gstin: '', mobile: '',
    billingAddress: '', billingState: 'Uttarakhand', billingCode: '05',
    shippingAddress: '', shippingState: 'Uttarakhand', shippingCode: '05',
    sameAsBilling: true
  });

  const [items, setItems] = useState([
    { id: 1, inventoryId: null, desc: '', hsn: '', qty: 1, unit: 'Nos', rate: 0, disc: 0, gst: 18 }
  ]);

  // --- 🧮 CALCULATION ENGINE ---
  const totals = useMemo(() => {
    let totalTaxable = 0, totalTax = 0, grandTotal = 0;
    let totalCGST = 0, totalSGST = 0, totalIGST = 0;

    const isInterState = partyDetails.billingCode !== COMPANY_STATE_CODE;

    const processedItems = items.map(item => {
      const baseAmount = item.qty * item.rate;
      const discountAmount = baseAmount * (item.disc / 100);
      const taxableValue = baseAmount - discountAmount;
      const taxAmount = taxableValue * (item.gst / 100);

      let cgstAmt = 0, sgstAmt = 0, igstAmt = 0;
      if (isInterState) {
        igstAmt = taxAmount;
      } else {
        cgstAmt = taxAmount / 2;
        sgstAmt = taxAmount / 2;
      }

      totalTaxable += taxableValue;
      totalTax += taxAmount;
      totalCGST += cgstAmt;
      totalSGST += sgstAmt;
      totalIGST += igstAmt;

      return { ...item, taxableValue, taxAmount, cgstAmt, sgstAmt, igstAmt, total: taxableValue + taxAmount };
    });

    grandTotal = Math.round(totalTaxable + totalTax);

    // Balance Calculation
    let balanceDue = 0;
    if (invoiceMeta.paymentStatus === 'Paid') balanceDue = 0;
    else if (invoiceMeta.paymentStatus === 'Due') balanceDue = grandTotal;
    else if (invoiceMeta.paymentStatus === 'Partial') balanceDue = grandTotal - Number(invoiceMeta.amountPaid);

    return {
      items: processedItems,
      totalTaxable, totalTax, totalCGST, totalSGST, totalIGST,
      grandTotal,
      balanceDue,
      isInterState,
      roundOff: (grandTotal - (totalTaxable + totalTax)).toFixed(2)
    };
  }, [items, partyDetails.billingCode, invoiceMeta.paymentStatus, invoiceMeta.amountPaid]);

  // --- HANDLERS ---
  const handleProductSelect = (id, productName) => {
    const product = inventoryItems?.find(p => p.name === productName);
    if (product) {
      setItems(items.map(item => item.id === id ? {
        ...item, desc: product.name, inventoryId: product.id, hsn: product.hsnCode || '', rate: product.sellingPrice || 0, gst: product.taxRate || 18, unit: 'Nos'
      } : item));
    } else {
      handleItemChange(id, 'desc', productName);
    }
  };

  const handlePartyNameChange = (e) => {
    const newName = e.target.value;
    setPartyDetails({ ...partyDetails, name: newName });
    if (oldInvoices) {
      const existingParty = oldInvoices.find(inv => inv.party?.name.toLowerCase() === newName.toLowerCase());
      if (existingParty) {
        setPartyDetails(prev => ({ ...prev, ...existingParty.party, name: newName }));
      }
    }
  };

  const handleItemChange = (id, field, value) => {
    setItems(items.map(i => i.id === id ? { ...i, [field]: value } : i));
  };

  const addItem = () => setItems([...items, { id: Date.now(), inventoryId: null, desc: '', hsn: '', qty: 1, unit: 'Nos', rate: 0, disc: 0, gst: 18 }]);
  const removeItem = (id) => items.length > 1 && setItems(items.filter(i => i.id !== id));

  // --- SAVE LOGIC ---
  const handleSave = async () => {
    if (!partyDetails.name) return alert("Party Name is required!");

    for (const item of items) {
      if (item.inventoryId) {
        const stockItem = inventoryItems.find(i => i.id === item.inventoryId);
        if (stockItem && stockItem.qty < item.qty) return alert(`Insufficient Stock for ${item.desc}`);
      }
    }

    const invoiceData = {
      meta: { ...invoiceMeta, balanceDue: totals.balanceDue },
      party: partyDetails,
      items: totals.items,
      financials: { taxable: totals.totalTaxable, tax: totals.totalTax, grandTotal: totals.grandTotal, roundOff: totals.roundOff },
      createdAt: new Date(),
      type: 'Sales'
    };

    try {
      await addDocument(invoiceData);
      for (const item of items) {
        if (item.inventoryId) {
          const stockItem = inventoryItems.find(i => i.id === item.inventoryId);
          if (stockItem) await updateStock(item.inventoryId, { qty: Number(stockItem.qty) - Number(item.qty), lastUpdated: new Date().toISOString() });
        }
      }
      alert("Invoice Saved Successfully!");
    } catch (error) {
      console.error(error);
      alert("Failed to save invoice");
    }
  };

  // --- PDF GENERATOR ---
  const generatePDF = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;
    const margin = 10;
    const contentWidth = pageWidth - (margin * 2);

    // Utils
    const drawBox = (y, h) => doc.rect(margin, y, contentWidth, h);
    const drawLine = (y) => doc.line(margin, y, pageWidth - margin, y);
    const drawVLine = (x, y1, y2) => doc.line(x, y1, x, y2);
    const numToWords = (n) => n.toString();

    // 1. Header
    doc.setFillColor(240, 240, 240);
    doc.rect(margin, margin, 40, 30, 'F');

    // 🛡️ SAFETY CHECK for Image
    try {
      // Changed to JPEG to avoid CRC Errors
      doc.addImage(LOGO_URL, 'JPEG', margin + 5, margin + 5, 30, 20);
    } catch (err) {
      console.warn("Logo Error:", err);
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.text(COMPANY_DETAILS.name, pageWidth / 2, 20, { align: "center" });
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text(COMPANY_DETAILS.address, pageWidth / 2, 26, { align: "center", maxWidth: 120 });
    doc.text(`GSTIN: ${COMPANY_DETAILS.gstin} | Mob: ${COMPANY_DETAILS.mobile}`, pageWidth / 2, 36, { align: "center" });

    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("TAX INVOICE", pageWidth - margin, 18, { align: "right" });
    doc.setFontSize(8);
    doc.text("(Original for Recipient)", pageWidth - margin, 23, { align: "right" });

    drawBox(margin, 30);

    // 2. Details Grid
    const gridY = 40;
    const gridH = 35;
    drawBox(gridY, gridH);
    const midX = pageWidth / 2;
    drawVLine(midX, gridY, gridY + gridH);

    // Left: Bill To
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text("Bill To:", margin + 2, gridY + 5);
    doc.setFont("helvetica", "normal");
    doc.text(partyDetails.name, margin + 2, gridY + 10);
    doc.text(partyDetails.billingAddress, margin + 2, gridY + 15, { maxWidth: 80 });
    doc.text(`GSTIN: ${partyDetails.gstin}`, margin + 2, gridY + 28);
    doc.text(`State: ${partyDetails.billingState} (${partyDetails.billingCode})`, margin + 2, gridY + 33);

    // Right: Meta
    const labelX = midX + 2;
    const valX = midX + 45;
    let metaY = gridY + 5;
    const addMeta = (label, val) => {
      doc.setFont("helvetica", "normal");
      doc.text(label, labelX, metaY);
      doc.setFont("helvetica", "bold");
      doc.text(val || "-", valX, metaY);
      metaY += 5;
    };

    addMeta("Invoice No:", invoiceMeta.invoiceNo);
    addMeta("Date:", invoiceMeta.date);
    addMeta("Transport Mode:", invoiceMeta.transportMode);
    addMeta("Vehicle No:", invoiceMeta.vehicleNo);
    addMeta("Destination:", invoiceMeta.destination);
    addMeta("Terms of Delivery:", invoiceMeta.termsOfDelivery);

    // 3. Table
    const tableY = gridY + gridH;
    autoTable(doc, {
      startY: tableY,
      head: [[
        { content: 'S.No', styles: { halign: 'center' } },
        { content: 'Product Description', styles: { halign: 'left' } },
        { content: 'HSN', styles: { halign: 'center' } },
        { content: 'Qty', styles: { halign: 'center' } },
        { content: 'Rate', styles: { halign: 'right' } },
        { content: 'Disc', styles: { halign: 'center' } },
        { content: 'Taxable', styles: { halign: 'right' } },
        ...(totals.isInterState ?
          [{ content: 'IGST', styles: { halign: 'right' } }] :
          [{ content: 'CGST', styles: { halign: 'right' } }, { content: 'SGST', styles: { halign: 'right' } }]
        ),
        { content: 'Amount', styles: { halign: 'right' } }
      ]],
      body: totals.items.map((item, index) => {
        const row = [
          index + 1, item.desc, item.hsn, `${item.qty} ${item.unit}`, item.rate.toFixed(2),
          item.disc > 0 ? `${item.disc}%` : '-', item.taxableValue.toFixed(2)
        ];
        if (totals.isInterState) row.push(item.igstAmt.toFixed(2));
        else { row.push(item.cgstAmt.toFixed(2)); row.push(item.sgstAmt.toFixed(2)); }
        row.push(item.total.toFixed(2));
        return row;
      }),
      theme: 'plain',
      styles: { fontSize: 8, cellPadding: 2, lineColor: [0, 0, 0], lineWidth: 0.1, textColor: [0, 0, 0] },
      headStyles: { fillColor: [245, 245, 245], fontStyle: 'bold', lineColor: [0, 0, 0], lineWidth: 0.1 },
      margin: { left: margin, right: margin }
    });

    // 4. Footer
    let finalY = doc.lastAutoTable.finalY;
    if (finalY > pageHeight - 65) { doc.addPage(); finalY = margin; }

    const footerH = 60;
    drawBox(finalY, footerH);
    drawVLine(130, finalY, finalY + footerH);

    // Bank & Terms
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.text("Bank Details:", margin + 2, finalY + 5);
    doc.setFont("helvetica", "normal");
    doc.text(`Bank: ${BANKS[0].name}`, margin + 2, finalY + 10);
    doc.text(`A/c: ${BANKS[0].ac}`, margin + 2, finalY + 14);
    doc.text(`IFSC: ${BANKS[0].ifsc}`, margin + 2, finalY + 18);

    doc.setFont("helvetica", "bold");
    doc.text("Terms & Conditions:", margin + 2, finalY + 28);
    doc.setFont("helvetica", "normal");
    doc.text("1. Goods once sold will not be taken back.", margin + 2, finalY + 33);
    doc.text("2. Interest @18% pa will be charged if payment delayed.", margin + 2, finalY + 37);
    doc.text("3. Subject to Haridwar Jurisdiction.", margin + 2, finalY + 41);

    // Totals
    let totalY = finalY + 6;
    const tLabelX = 132;
    const tValX = pageWidth - 12;

    const addTotal = (lbl, val, bold = false) => {
      doc.setFont("helvetica", bold ? "bold" : "normal");
      doc.text(lbl, tLabelX, totalY);
      doc.text(val, tValX, totalY, { align: "right" });
      totalY += 5;
    };

    addTotal("Taxable Amount:", totals.totalTaxable.toFixed(2));
    if (totals.isInterState) addTotal("Add: IGST:", totals.totalIGST.toFixed(2));
    else {
      addTotal("Add: CGST:", totals.totalCGST.toFixed(2));
      addTotal("Add: SGST:", totals.totalSGST.toFixed(2));
    }
    addTotal("Round Off:", totals.roundOff);

    doc.line(130, totalY - 2, pageWidth - margin, totalY - 2);
    totalY += 3;
    doc.setFontSize(10);
    addTotal("Grand Total:", `Rs. ${totals.grandTotal.toFixed(2)}`, true);

    doc.setFontSize(8);
    if (invoiceMeta.paymentStatus === 'Partial' || invoiceMeta.paymentStatus === 'Paid') {
      totalY += 3;
      addTotal("Less: Amount Paid:", `Rs. ${invoiceMeta.amountPaid}`, false);
      totalY += 2;
      doc.setFontSize(10);
      addTotal("Balance Due:", `Rs. ${totals.balanceDue.toFixed(2)}`, true);
    }

    const sigY = finalY + footerH - 12;
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text("For HRMS LLP", pageWidth - 15, sigY - 8, { align: "right" });
    doc.text("Auth. Signatory", pageWidth - 15, sigY + 8, { align: "right" });

    doc.text(`Amount (in words): ${numToWords(totals.grandTotal)}`, margin + 2, finalY + footerH + 5);

    doc.save(`INV_${invoiceMeta.invoiceNo}.pdf`);
  };

  useTallyShortcuts({ onCreate: addItem, onSave: handleSave, onPrint: generatePDF });

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 md:p-8 text-gray-800 dark:text-gray-100 transition-colors duration-300">
      <div className="max-w-7xl mx-auto">

        {/* Header Actions */}
        <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-indigo-700 dark:text-indigo-400 flex items-center gap-2">
              <Truck size={32} /> GST Sales Invoice
            </h1>
            <p className="text-sm text-gray-500">Create invoices & Sync Inventory</p>
          </div>
          <div className="flex gap-3 flex-wrap justify-center">
            <button onClick={() => navigate('/admin/invoice-records')} className="btn-secondary flex gap-2"><List size={18} /> Records</button>
            <button onClick={() => window.location.reload()} className="p-2 bg-gray-200 dark:bg-gray-700 rounded-lg"><RefreshCw size={20} /></button>
            <button onClick={handleSave} className="flex items-center gap-2 bg-emerald-600 text-white px-5 py-2.5 rounded-xl font-bold shadow-lg hover:bg-emerald-700"><Save size={18} /> Save</button>
            <button onClick={generatePDF} className="flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-xl font-bold shadow-lg hover:bg-indigo-700"><Printer size={18} /> Print</button>
          </div>
        </div>

        {/* --- MAIN FORM GRID --- */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">

          {/* 1. Invoice Meta & Transport */}
          <div className="bg-white dark:bg-gray-800 p-5 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 space-y-4">

            <div className="flex items-center gap-2 border-b pb-2 mb-2 dark:border-gray-700">
              <Layout className="text-indigo-500" size={18} />
              <h3 className="font-bold text-gray-700 dark:text-gray-300 uppercase text-xs">Invoice Details</h3>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-gray-500">Invoice No</label>
                <input type="text" value={invoiceMeta.invoiceNo} onChange={e => setInvoiceMeta({ ...invoiceMeta, invoiceNo: e.target.value })} className="input-field font-mono" />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500">Date</label>
                <input type="date" value={invoiceMeta.date} onChange={e => setInvoiceMeta({ ...invoiceMeta, date: e.target.value })} className="input-field dark:[color-scheme:dark]" />
              </div>
            </div>

            {/* Transport Section */}
            <div className="pt-2">
              <div className="flex items-center gap-2 mb-2">
                <Truck className="text-indigo-500" size={16} />
                <h3 className="font-bold text-gray-700 dark:text-gray-300 uppercase text-xs">Logistics</h3>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <select value={invoiceMeta.transportMode} onChange={e => setInvoiceMeta({ ...invoiceMeta, transportMode: e.target.value })} className="input-field">
                  <option>Road</option><option>Rail</option><option>Air</option><option>Ship</option>
                </select>
                <input type="text" placeholder="Vehicle No" value={invoiceMeta.vehicleNo} onChange={e => setInvoiceMeta({ ...invoiceMeta, vehicleNo: e.target.value })} className="input-field uppercase" />
                <input type="text" placeholder="Destination" value={invoiceMeta.destination} onChange={e => setInvoiceMeta({ ...invoiceMeta, destination: e.target.value })} className="input-field col-span-2" />
                <input type="text" placeholder="Terms of Delivery" value={invoiceMeta.termsOfDelivery} onChange={e => setInvoiceMeta({ ...invoiceMeta, termsOfDelivery: e.target.value })} className="input-field col-span-2" />
              </div>
            </div>

            {/* Payment Section (Partial Logic) */}
            <div className="pt-2">
              <div className="flex items-center gap-2 mb-2">
                <CreditCard className="text-indigo-500" size={16} />
                <h3 className="font-bold text-gray-700 dark:text-gray-300 uppercase text-xs">Payment</h3>
              </div>
              <div className="flex gap-2 mb-3">
                {['Paid', 'Partial', 'Due'].map(status => (
                  <button
                    key={status}
                    onClick={() => setInvoiceMeta({ ...invoiceMeta, paymentStatus: status, amountPaid: status === 'Paid' ? totals.grandTotal : (status === 'Due' ? 0 : invoiceMeta.amountPaid) })}
                    className={`flex-1 py-1.5 text-xs font-bold rounded border transition-all ${invoiceMeta.paymentStatus === status ? 'bg-indigo-100 border-indigo-500 text-indigo-700' : 'bg-gray-50 border-gray-200 text-gray-500 dark:bg-gray-700 dark:border-gray-600'}`}
                  >
                    {status}
                  </button>
                ))}
              </div>

              {invoiceMeta.paymentStatus !== 'Due' && (
                <div className="grid grid-cols-2 gap-3 mb-2">
                  <select value={invoiceMeta.paymentMode} onChange={e => setInvoiceMeta({ ...invoiceMeta, paymentMode: e.target.value })} className="input-field">
                    <option value="">Mode</option><option>Cash</option><option>UPI</option><option>Bank</option>
                  </select>
                  {invoiceMeta.paymentStatus === 'Partial' && (
                    <input
                      type="number"
                      placeholder="Amount Paid"
                      value={invoiceMeta.amountPaid}
                      onChange={e => setInvoiceMeta({ ...invoiceMeta, amountPaid: e.target.value })}
                      className="input-field font-bold text-green-600"
                    />
                  )}
                </div>
              )}
              {invoiceMeta.paymentStatus === 'Partial' && (
                <div className="text-right text-xs font-bold text-red-500">
                  Balance Due: ₹{(totals.grandTotal - invoiceMeta.amountPaid).toFixed(2)}
                </div>
              )}
            </div>
          </div>

          {/* 2. Party Details */}
          <div className="lg:col-span-2 bg-white dark:bg-gray-800 p-5 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 relative">
            <div className="absolute top-5 right-5">
              <ImageIcon className="text-gray-200" size={60} />
            </div>

            <div className="flex items-center gap-2 border-b pb-2 mb-4 dark:border-gray-700">
              <User className="text-indigo-500" size={18} />
              <h3 className="font-bold text-gray-700 dark:text-gray-300 uppercase text-xs">Customer Details</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-semibold text-gray-500">Party Name</label>
                  <input type="text" list="party-names" placeholder="Search or Enter Name" value={partyDetails.name} onChange={handlePartyNameChange} className="input-field font-bold text-lg" />
                  <datalist id="party-names">{oldInvoices && [...new Set(oldInvoices.map(inv => inv.party?.name))].map((name, idx) => <option key={idx} value={name} />)}</datalist>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500">Billing Address</label>
                  <textarea rows="3" placeholder="Full Address" value={partyDetails.billingAddress} onChange={e => setPartyDetails({ ...partyDetails, billingAddress: e.target.value })} className="input-field resize-none"></textarea>
                </div>
              </div>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-gray-500">GSTIN</label>
                    <input type="text" placeholder="Ex: 05ABC..." value={partyDetails.gstin} onChange={e => setPartyDetails({ ...partyDetails, gstin: e.target.value })} className="input-field uppercase" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-500">Mobile</label>
                    <input type="text" placeholder="98765..." value={partyDetails.mobile} onChange={e => setPartyDetails({ ...partyDetails, mobile: e.target.value })} className="input-field" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-gray-500">State</label>
                    <input type="text" value={partyDetails.billingState} onChange={e => setPartyDetails({ ...partyDetails, billingState: e.target.value })} className="input-field" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-500">State Code</label>
                    <input type="text" value={partyDetails.billingCode} onChange={e => setPartyDetails({ ...partyDetails, billingCode: e.target.value })} className="input-field text-center" />
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-4">
                  <input type="checkbox" id="sameAddr" checked={partyDetails.sameAsBilling} onChange={e => setPartyDetails({ ...partyDetails, sameAsBilling: e.target.checked })} className="w-4 h-4 text-indigo-600 rounded" />
                  <label htmlFor="sameAddr" className="text-sm text-gray-600 dark:text-gray-400">Shipping Address same as Billing</label>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 3. Items Grid */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden mb-6">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm min-w-[900px]">
              <thead className="bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 border-b border-gray-200 dark:border-gray-600">
                <tr>
                  <th className="p-3 w-10">#</th>
                  <th className="p-3 w-64">Item Description</th>
                  <th className="p-3 w-24">HSN</th>
                  <th className="p-3 w-20">Qty</th>
                  <th className="p-3 w-20">Unit</th>
                  <th className="p-3 w-24">Rate (₹)</th>
                  <th className="p-3 w-20">Disc %</th>
                  <th className="p-3 w-24">Taxable</th>
                  <th className="p-3 w-20">GST %</th>
                  <th className="p-3 w-28 text-right">Amount</th>
                  <th className="p-3 w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {items.map((item, index) => (
                  <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="p-3 text-center text-gray-400">{index + 1}</td>
                    <td className="p-3 relative">
                      <input type="text" list={`products-${item.id}`} value={item.desc} onChange={(e) => handleProductSelect(item.id, e.target.value)} placeholder="Search Item" className={`w-full bg-transparent outline-none font-medium ${item.inventoryId ? 'text-blue-600 dark:text-blue-400' : ''}`} />
                      <datalist id={`products-${item.id}`}>{inventoryItems && inventoryItems.map(prod => (<option key={prod.id} value={prod.name}>Stock: {prod.qty} | ₹{prod.sellingPrice}</option>))}</datalist>
                    </td>
                    <td className="p-3"><input type="text" value={item.hsn} onChange={(e) => handleItemChange(item.id, 'hsn', e.target.value)} className="w-full bg-transparent outline-none" /></td>
                    <td className="p-3"><input type="number" value={item.qty} onChange={(e) => handleItemChange(item.id, 'qty', parseFloat(e.target.value))} className="w-full bg-transparent outline-none text-center bg-gray-50 dark:bg-gray-900 rounded" /></td>
                    <td className="p-3"><select value={item.unit} onChange={(e) => handleItemChange(item.id, 'unit', e.target.value)} className="w-full bg-transparent outline-none text-xs"><option>Nos</option><option>Kg</option><option>Set</option></select></td>
                    <td className="p-3"><input type="number" value={item.rate} onChange={(e) => handleItemChange(item.id, 'rate', parseFloat(e.target.value))} className="w-full bg-transparent outline-none text-right" /></td>
                    <td className="p-3"><input type="number" value={item.disc} onChange={(e) => handleItemChange(item.id, 'disc', parseFloat(e.target.value))} className="w-full bg-transparent outline-none text-center text-red-500" /></td>
                    <td className="p-3 text-right text-gray-500">{((item.qty * item.rate) * (1 - item.disc / 100)).toFixed(2)}</td>
                    <td className="p-3"><select value={item.gst} onChange={(e) => handleItemChange(item.id, 'gst', parseFloat(e.target.value))} className="w-full bg-transparent outline-none text-right"><option value="0">0%</option><option value="5">5%</option><option value="12">12%</option><option value="18">18%</option><option value="28">28%</option></select></td>
                    <td className="p-3 text-right font-bold font-mono">{((item.qty * item.rate * (1 - item.disc / 100)) * (1 + item.gst / 100)).toFixed(2)}</td>
                    <td className="p-3 text-center"><button onClick={() => removeItem(item.id)} className="text-gray-400 hover:text-red-500"><Trash2 size={16} /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button onClick={addItem} className="w-full py-2 bg-gray-50 dark:bg-gray-700/50 text-indigo-500 font-bold text-sm hover:bg-gray-100 dark:hover:bg-gray-700 border-t border-gray-200 dark:border-gray-700 transition-colors">
            + Add Line Item (Alt + C)
          </button>
        </div>

        {/* 4. Totals & Summary */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="bg-white dark:bg-gray-800 p-5 rounded-xl border border-gray-200 dark:border-gray-700 h-fit">
            <h3 className="font-bold text-gray-500 uppercase text-xs mb-4">Bank & Terms</h3>
            <div className="text-sm space-y-1 text-gray-600 dark:text-gray-300">
              <p><span className="font-bold">Bank:</span> {BANKS[0].name}</p>
              <p><span className="font-bold">A/c:</span> {BANKS[0].ac}</p>
              <p><span className="font-bold">IFSC:</span> {BANKS[0].ifsc}</p>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg border border-indigo-100 dark:border-indigo-900">
            <div className="space-y-3 text-sm">
              <div className="flex justify-between text-gray-500"><span>Total Taxable</span><span className="font-mono">₹{totals.totalTaxable.toFixed(2)}</span></div>
              {totals.isInterState ? (
                <div className="flex justify-between text-gray-500"><span>IGST</span><span className="font-mono">₹{totals.totalIGST.toFixed(2)}</span></div>
              ) : (
                <>
                  <div className="flex justify-between text-gray-500"><span>CGST</span><span className="font-mono">₹{totals.totalCGST.toFixed(2)}</span></div>
                  <div className="flex justify-between text-gray-500"><span>SGST</span><span className="font-mono">₹{totals.totalSGST.toFixed(2)}</span></div>
                </>
              )}
              <div className="flex justify-between text-gray-400 text-xs"><span>Round Off</span><span className="font-mono">{totals.roundOff}</span></div>
              <div className="h-px bg-gray-200 dark:bg-gray-700 my-2"></div>
              <div className="flex justify-between items-end"><span className="font-bold text-lg">Grand Total</span><span className="font-extrabold text-3xl text-indigo-600 font-mono">₹{totals.grandTotal.toLocaleString()}</span></div>
            </div>
          </div>
        </div>

      </div>

      {/* GLOBAL STYLES FOR INPUTS */}
      <style>{`
        .input-field {
            width: 100%;
            padding: 8px 12px;
            background-color: #f9fafb;
            border: 1px solid #e5e7eb;
            border-radius: 8px;
            outline: none;
            transition: all 0.2s;
            font-size: 0.875rem;
        }
        .dark .input-field {
            background-color: #374151;
            border-color: #4b5563;
            color: #fff;
        }
        .input-field:focus {
            ring: 2px;
            border-color: #6366f1;
        }
        .btn-secondary {
            background-color: #4b5563;
            color: white;
            padding: 8px 16px;
            border-radius: 10px;
            font-weight: bold;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
            transition: all 0.2s;
        }
        .btn-secondary:hover { background-color: #1f2937; }
      `}</style>
    </div>
  );
};

export default InvoiceGenerator;