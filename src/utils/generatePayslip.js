import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';


const COMPANY_DETAILS = {
    name: "HRMS",
    address: "london brigdes",
    email: "superadmin@gmail.com",
    contact: "1234567890",
    website: "www.HRMS.com"
};

// Valid JPEG Logo
const LOGO_URL = logoImage;

export const generatePayslipBlob = (data) => {
    // 1. SETUP PAGE
    const doc = new jsPDF('p', 'mm', 'a4');
    const width = doc.internal.pageSize.width; // 210mm
    const height = doc.internal.pageSize.height; // 297mm
    const margin = 10;
    const contentWidth = width - (margin * 2);

    // --- HELPER FUNCTIONS ---
    const drawBorder = (y, h) => {
        doc.setDrawColor(0);
        doc.setLineWidth(0.3);
        doc.rect(margin, y, contentWidth, h);
    };

    const addText = (text, x, y, size = 9, weight = "normal", align = "left", color = [0, 0, 0]) => {
        doc.setFont("helvetica", weight);
        doc.setFontSize(size);
        doc.setTextColor(...color);
        doc.text(String(text || "-"), x, y, { align: align });
        doc.setTextColor(0, 0, 0); // Reset
    };

    const formatCurrency = (amount) => {
        return Number(amount || 0).toLocaleString('en-IN', {
            maximumFractionDigits: 0,
            minimumFractionDigits: 0
        });
    };

    const numToWords = (n) => {
        // Basic implementation. For production, consider using 'number-to-words' library
        return n ? n.toString() + " Only" : "Zero Only";
    };

    let currentY = margin;

    // --- 2. HEADER SECTION ---

    // Header Box
    const headerHeight = 45;
    drawBorder(currentY, headerHeight);

    // Logo
    try {
        doc.addImage(LOGO_URL, 'JPEG', margin + 5, currentY + 5, 25, 25);
    } catch (e) { }

    // Company Info (Centered)
    const centerX = width / 2;
    addText(COMPANY_DETAILS.name, centerX, currentY + 8, 16, "bold", "center");
    addText(COMPANY_DETAILS.address, centerX, currentY + 14, 9, "normal", "center");
    addText(`Email: ${COMPANY_DETAILS.email} | Phone: ${COMPANY_DETAILS.contact} | Web: ${COMPANY_DETAILS.website}`, centerX, currentY + 19, 9, "normal", "center");

    // Title Strip
    doc.setFillColor(230, 230, 230);
    doc.rect(margin, currentY + 30, contentWidth, 10, 'F');
    doc.line(margin, currentY + 30, width - margin, currentY + 30); // Top Line of strip

    const monthStr = data.month ? new Date(data.month).toLocaleString('default', { month: 'long', year: 'numeric' }) : 'Current Month';
    addText(`PAY SLIP FOR THE MONTH OF ${monthStr.toUpperCase()}`, centerX, currentY + 35, 10, "bold", "center");

    currentY += headerHeight; // Move Y down

    // --- 3. EMPLOYEE DETAILS (GRID LAYOUT) ---

    const detailsHeight = 42;
    drawBorder(currentY, detailsHeight);

    // Columns coordinates
    const col1_Label = margin + 4;
    const col1_Value = margin + 35;
    const col2_Label = width / 2 + 4;
    const col2_Value = width / 2 + 40;

    // Vertical Separator Line
    doc.line(width / 2, currentY, width / 2, currentY + detailsHeight);

    let rowY = currentY + 6;
    const rowGap = 6;

    // Helper to print row
    const printRow = (l1, v1, l2, v2) => {
        addText(l1, col1_Label, rowY, 9, "bold");
        addText(": " + (v1 || '-'), col1_Value, rowY, 9, "normal");

        if (l2) {
            addText(l2, col2_Label, rowY, 9, "bold");
            addText(": " + (v2 || '-'), col2_Value, rowY, 9, "normal");
        }
        rowY += rowGap;
    };

    // Mapping Data
    printRow("Emp Code", data.empCode || data.id, "Employee Name", data.employeeName || data.name);
    printRow("Designation", data.designation, "Department", data.department);
    printRow("PAN No.", data.panNo || data.pan, "Bank A/c No.", data.bankAccount || data.bank);
    printRow("UAN No.", data.uanNo || data.uan, "Bank Name", data.bankName);
    printRow("PF No.", data.pfNo, "Location", data.location || "london");

    // Settings / Attendance
    const paidDays = data.settings?.paidDays ?? data.paidDays ?? 30;
    const totalDays = data.settings?.monthDays ?? data.totalWorkingDays ?? 30;
    printRow("Date of Joining", data.doj, "Paid Days", `${paidDays} / ${totalDays}`);

    currentY += detailsHeight;

    // --- 4. SALARY TABLE (MASTER vs PAID) ---

    // Extract Financials
    const fin = data.financials || {};
    const getVal = (k1, k2) => Number(fin[k1] ?? data[k2] ?? 0);

    const earnings = [
        ['Basic Salary', getVal('basic', 'basicSalary')],
        ['House Rent Allowance', getVal('hra', 'hra')],
        ['Special Allowance', getVal('special', 'specialAllowance')],
        ['Incentive / Bonus', getVal('incentive', 'incentive')],
        ['Arrears', getVal('arrears', 'arrears')],
    ];

    const deductions = [
        ['Provident Fund', getVal('pf', 'pf')],
        ['ESIC', getVal('esic', 'esic')],
        ['Professional Tax', getVal('pt', 'pt')],
        ['TDS (Income Tax)', getVal('tds', 'tds')],
        ['Salary Advance', getVal('advance', 'advanceSalary')],
    ];

    // Build Table Body
    const body = [];
    const maxRows = Math.max(earnings.length, deductions.length);

    for (let i = 0; i < maxRows; i++) {
        const earn = earnings[i] || ['', 0];
        const ded = deductions[i] || ['', 0];

        body.push([
            earn[0],                // Desc
            formatCurrency(earn[1]), // Master (Standard)
            formatCurrency(earn[1]), // Paid (Actual) - Assuming same for simplicity unless LOP logic applied
            ded[0],                 // Ded Desc
            formatCurrency(ded[1])  // Ded Amount
        ]);
    }

    // Totals Calculation
    const totalEarn = data.totals?.grossEarnings ?? data.grossEarnings ?? 0;
    const totalDed = data.totals?.totalDeductions ?? data.totalDeductions ?? 0;
    const netPay = data.totals?.netPay ?? data.netSalary ?? 0;

    // Totals Row
    body.push([
        { content: 'Gross Earnings', styles: { fontStyle: 'bold' } },
        { content: formatCurrency(totalEarn), styles: { fontStyle: 'bold' } },
        { content: formatCurrency(totalEarn), styles: { fontStyle: 'bold' } }, // Paid
        { content: 'Total Deductions', styles: { fontStyle: 'bold' } },
        { content: formatCurrency(totalDed), styles: { fontStyle: 'bold' } },
    ]);

    autoTable(doc, {
        startY: currentY, // Starts exactly where details ended
        head: [[
            { content: 'EARNINGS', styles: { halign: 'left' } },
            { content: 'MASTER', styles: { halign: 'right' } },
            { content: 'PAID', styles: { halign: 'right' } },
            { content: 'DEDUCTIONS', styles: { halign: 'left' } },
            { content: 'AMOUNT', styles: { halign: 'right' } }
        ]],
        body: body,
        theme: 'grid',
        styles: {
            fontSize: 8,
            cellPadding: 3,
            lineColor: [0, 0, 0],
            lineWidth: 0.1,
            textColor: [0, 0, 0],
            valign: 'middle'
        },
        headStyles: {
            fillColor: [240, 240, 240],
            textColor: [0, 0, 0],
            fontStyle: 'bold',
            lineWidth: 0.1,
            lineColor: [0, 0, 0]
        },
        columnStyles: {
            0: { cellWidth: 50 },
            1: { cellWidth: 20, halign: 'right' },
            2: { cellWidth: 20, halign: 'right' },
            3: { cellWidth: 70 },
            4: { cellWidth: 30, halign: 'right' }
        },
        margin: { left: margin, right: margin }
    });

    // --- 5. NET PAY & FOOTER ---
    let finalY = doc.lastAutoTable.finalY;

    // Net Pay Box
    doc.setDrawColor(0);
    doc.setLineWidth(0.3);
    doc.setFillColor(230, 230, 230);

    // Draw Box for Net Pay
    doc.rect(margin, finalY, contentWidth, 12, 'F'); // Background
    doc.rect(margin, finalY, contentWidth, 12);      // Border

    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("NET SALARY PAYABLE:", margin + 5, finalY + 8);

    doc.setFontSize(12);
    doc.text(`Rs. ${formatCurrency(netPay)}`, width - 15, finalY + 8, { align: "right" });

    // Amount in Words
    finalY += 12;
    doc.rect(margin, finalY, contentWidth, 10);
    addText(`Amount in Words:  ${numToWords(Number(netPay).toFixed(0))}`, margin + 5, finalY + 6.5, 9, "italic");

    // Signatures
    finalY += 10;
    // Box for signatures
    doc.rect(margin, finalY, contentWidth, 35);

    const sigY = finalY + 25;

    addText("Employee Signature", margin + 15, sigY, 9, "bold");
    addText("Authorised Signatory", width - 50, sigY, 9, "bold");
    addText("For HRMS", width - 50, sigY - 10, 8, "normal");

    // Footer Note
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.text("This is a computer-generated document.", width / 2, finalY + 40, { align: "center" });

    // Return Blob
    return doc.output('blob');
};