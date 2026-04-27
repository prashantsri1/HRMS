import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useFirestore } from '../../hooks/useFirestore';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import {
  FileText, Search, Download, Trash2, ArrowLeft,
  Calendar, CreditCard, User, Printer
} from 'lucide-react';

// --- CONSTANTS (Should match Generator) ---
const BANKS = [
  { name: "HDFC Bank", ac: "50200012345678", ifsc: "HDFC0001234", branch: "london" }
];

const InvoiceRecords = () => {
  const navigate = useNavigate();
  const { data: invoices, loading, deleteDocument } = useFirestore('invoices');
  const [searchTerm, setSearchTerm] = useState('');

  // --- 🔍 FILTER LOGIC ---
  const filteredInvoices = useMemo(() => {
    if (!invoices) return [];
    return invoices.filter(inv => {
      const searchLower = searchTerm.toLowerCase();
      return (
        inv.party?.name?.toLowerCase().includes(searchLower) ||
        inv.meta?.invoiceNo?.toLowerCase().includes(searchLower)
      );
    }).sort((a, b) => new Date(b.meta?.date) - new Date(a.meta?.date)); // Latest first
  }, [invoices, searchTerm]);

  // --- 🗑️ DELETE INVOICE ---
  const handleDelete = async (id) => {
    if (window.confirm("Are you sure? Deleting an invoice creates a gap in audit trail.")) {
      await deleteDocument(id);
    }
  };

  // --- 🖨️ RE-PRINT LOGIC (Using Saved Data) ---
  const printInvoice = (data) => {
    const doc = new jsPDF();

    // Header
    doc.setFontSize(20);
    doc.setTextColor(41, 128, 185);
    doc.text("TAX INVOICE (DUPLICATE)", 195, 20, { align: "right" }); // Marked as Duplicate

    doc.setTextColor(0);
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text("HRMS", 15, 20);
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text("HRMS , LONDON |LONDON", 15, 26);
    doc.text("GSTIN: 12346gyb| E: email insert", 15, 31);

    // Meta Grid
    autoTable(doc, {
      startY: 40,
      theme: 'grid',
      styles: { fontSize: 9, cellPadding: 2 },
      headStyles: { fillColor: [240, 240, 240], textColor: 0, fontStyle: 'bold' },
      body: [
        [
          { content: `Invoice No: ${data.meta.invoiceNo}\nDate: ${data.meta.date}`, styles: { fontStyle: 'bold' } },
          { content: `Transport Mode: Road\nPO Ref: ${data.meta.poReference || 'N/A'}` }
        ],
        [
          { content: `BILL TO:\n${data.party.name}\n${data.party.billingAddress}\nGSTIN: ${data.party.gstin}`, styles: { cellWidth: 95 } },
          { content: `SHIP TO:\n${data.party.sameAsBilling ? data.party.name : 'Consignee'}\n${data.party.sameAsBilling ? data.party.billingAddress : data.party.shippingAddress}`, styles: { cellWidth: 95 } }
        ]
      ]
    });

    // Items
    autoTable(doc, {
      startY: doc.lastAutoTable.finalY - 1,
      head: [['#', 'Item Description', 'HSN', 'Qty', 'Rate', 'Disc', 'Taxable', 'GST', 'Amount']],
      body: data.items.map((item, index) => [
        index + 1,
        item.desc,
        item.hsn,
        `${item.qty} ${item.unit}`,
        item.rate.toFixed(2),
        item.disc + '%',
        item.taxableValue.toFixed(2),
        `${item.gst}%`,
        item.total.toFixed(2)
      ]),
      theme: 'grid',
      headStyles: { fillColor: [44, 62, 80], textColor: 255 },
      columnStyles: { 8: { halign: 'right', fontStyle: 'bold' } }
    });

    // Totals
    const finalY = doc.lastAutoTable.finalY;
    autoTable(doc, {
      startY: finalY,
      theme: 'plain',
      styles: { fontSize: 10, cellPadding: 2 },
      columnStyles: { 0: { halign: 'right', width: 140 }, 1: { halign: 'right', width: 50, fontStyle: 'bold' } },
      body: [
        ['Total Taxable Value:', data.financials.taxable.toFixed(2)],
        ['Total Tax:', data.financials.tax.toFixed(2)],
        ['Round Off:', data.financials.roundOff],
        [{ content: 'GRAND TOTAL:', styles: { fontSize: 14, textColor: [41, 128, 185] } }, { content: `Rs. ${data.financials.grandTotal.toFixed(2)}`, styles: { fontSize: 14, textColor: [41, 128, 185] } }]
      ]
    });

    // Bank
    doc.setFontSize(9);
    doc.text(`Amount in Words: INR ${data.financials.grandTotal} Only`, 15, doc.lastAutoTable.finalY + 10);

    const bankY = doc.lastAutoTable.finalY + 20;
    doc.rect(15, bankY, 90, 35);
    doc.setFont("helvetica", "bold");
    doc.text("Bank Details:", 18, bankY + 6);
    doc.setFont("helvetica", "normal");
    doc.text(`Bank: ${BANKS[0].name}`, 18, bankY + 12);
    doc.text(`A/c No: ${BANKS[0].ac}`, 18, bankY + 18);
    doc.text(`IFSC: ${BANKS[0].ifsc}`, 18, bankY + 24);

    doc.text("For HRMS .", 195, bankY + 6, { align: "right" });
    doc.text("(Authorized Signatory)", 195, bankY + 30, { align: "right" });

    doc.save(`Invoice_${data.meta.invoiceNo}.pdf`);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6 md:p-8 text-gray-800 dark:text-gray-100 transition-colors duration-300">
      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-extrabold flex items-center gap-3 text-gray-900 dark:text-white">
              <FileText className="text-violet-600" size={32} /> Invoice Book
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Complete history of sales invoices.
            </p>
          </div>
          <div className="flex gap-3">
            <button onClick={() => navigate('/admin/invoice-generator')} className="bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 text-gray-800 dark:text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2">
              <ArrowLeft size={18} /> Back to Generator
            </button>
          </div>
        </div>

        {/* Table Container */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">

          {/* Filter Bar */}
          <div className="p-5 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-700/20">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
              <input
                type="text"
                placeholder="Search Invoice No or Party Name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl outline-none focus:ring-2 focus:ring-violet-500 text-sm"
              />
            </div>
          </div>

          {/* Table */}
          {loading ? (
            <div className="p-12 flex justify-center"><LoadingSpinner /></div>
          ) : filteredInvoices.length === 0 ? (
            <div className="p-12 text-center text-gray-400">No invoices found.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">
                  <tr>
                    <th className="px-6 py-4">Invoice Info</th>
                    <th className="px-6 py-4">Party Details</th>
                    <th className="px-6 py-4 text-right">Amount</th>
                    <th className="px-6 py-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {filteredInvoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/40 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                          <FileText size={16} className="text-violet-500" /> {inv.meta?.invoiceNo}
                        </div>
                        <div className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                          <Calendar size={12} /> {inv.meta?.date}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-medium text-gray-800 dark:text-gray-200">{inv.party?.name}</div>
                        <div className="text-xs text-gray-500">{inv.party?.gstin || 'Unregistered'}</div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className="font-bold font-mono text-emerald-600 dark:text-emerald-400">
                          ₹{inv.financials?.grandTotal?.toLocaleString()}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex justify-center gap-2">
                          <button
                            onClick={() => printInvoice(inv)}
                            className="p-2 text-purple-600 hover:bg-purple-50 dark:text-purple-400 dark:hover:bg-purple-900/30 rounded-lg transition-colors"
                            title="Download PDF"
                          >
                            <Download size={18} />
                          </button>
                          <button
                            onClick={() => handleDelete(inv.id)}
                            className="p-2 text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                            title="Delete Record"
                          >
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
};

export default InvoiceRecords;