import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

/**
 * Exports data to Microsoft Excel (via CSV format with standard quotation escaping).
 */
export function exportToExcel(
  title: string,
  headers: string[],
  keys: string[],
  data: any[],
  filename: string
) {
  const rows = [headers];

  data.forEach((item) => {
    const row = keys.map((key) => {
      const val = item[key];
      if (val === undefined || val === null) return '';
      // Safe string representation
      return String(val).replace(/"/g, '""');
    });
    rows.push(row);
  });

  const csvContent = "\ufeff" + rows.map(r => r.map(cell => `"${cell}"`).join(",")).join("\n");
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const outName = filename.endsWith('.csv') ? filename : `${filename}.csv`;

  if (localStorage.getItem('fleetmaster_skip_preview') === 'true') {
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", outName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } else {
    const event = new CustomEvent('fleetmaster-preview-doc', {
      detail: {
        type: 'excel',
        title,
        filename: outName,
        blob: blob,
        blobUrl: url,
        csvContent: csvContent,
        download: () => {
          const link = document.createElement("a");
          link.setAttribute("href", url);
          link.setAttribute("download", outName);
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        }
      }
    });
    window.dispatchEvent(event);
  }
}

/**
 * Exports data to a beautifully styled, corporate PDF format with automated table page breaks.
 */
export function exportToPDF(
  title: string,
  headers: string[],
  keys: string[],
  data: any[],
  filename: string,
  subtitle?: string
) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  // Modern Indigo branding theme
  const primaryColor: [number, number, number] = [15, 23, 42]; // slate-900

  // Header Title
  let userLabel = "FLEET MASTER";
  try {
    const sessionToken = localStorage.getItem('fleetmaster_session');
    if (sessionToken) {
      const userObj = JSON.parse(sessionToken);
      if (userObj && userObj.username) {
        userLabel = userObj.company && userObj.company !== "Fleet Master Petrochem Transport"
          ? userObj.company.toUpperCase()
          : userObj.username.toUpperCase();
      }
    }
  } catch (e) {
    // ignore
  }

  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text(userLabel, 14, 15);

  // Subtitle/Document Name
  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(11);
  doc.setTextColor(100, 116, 139); // slate-500
  doc.text(title.toUpperCase(), 14, 21);

  if (subtitle) {
    doc.setFontSize(9);
    doc.setTextColor(148, 163, 184); // slate-400
    doc.text(subtitle, 14, 26);
  }

  // Generation timestamp
  const nowStr = new Date().toLocaleString('en-US', { timeZone: 'UTC' }) + ' UTC';
  doc.setFontSize(8);
  doc.setFont('Helvetica', 'oblique');
  doc.setTextColor(148, 163, 184);
  doc.text(`Generated: ${nowStr} | Confidential operational report`, 14, subtitle ? 31 : 27);

  // Draw dividing line
  doc.setDrawColor(226, 232, 240); // slate-200
  doc.setLineWidth(0.5);
  doc.line(14, subtitle ? 33 : 29, 196, subtitle ? 33 : 29);

  // AutoTable Mapping
  const tableRows = data.map((item) => {
    return keys.map((key) => {
      const val = item[key];
      return val !== undefined && val !== null ? String(val) : '';
    });
  });

  autoTable(doc, {
    startY: subtitle ? 36 : 32,
    head: [headers],
    body: tableRows,
    theme: 'grid',
    styles: {
      fontSize: 8.5,
      cellPadding: 3,
      overflow: 'linebreak',
      textColor: [51, 65, 85] // slate-700
    },
    headStyles: {
      fillColor: primaryColor,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8.5
    },
    columnStyles: {
      0: { fontStyle: 'bold' }
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252] // slate-50
    },
    margin: { left: 14, right: 14 },
    didDrawPage: (dataBlock: any) => {
      // Footer info on every page
      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.text(
        `Page ${dataBlock.pageNumber}`,
        14,
        doc.internal.pageSize.height - 10
      );
      doc.text(
        'System Audited Ledger • Digitally Verified',
        doc.internal.pageSize.width - 70,
        doc.internal.pageSize.height - 10
      );
    }
  });

  const pdfBlob = doc.output('blob');
  const url = URL.createObjectURL(pdfBlob);
  const outName = filename.endsWith('.pdf') ? filename : `${filename}.pdf`;

  if (localStorage.getItem('fleetmaster_skip_preview') === 'true') {
    doc.save(outName);
  } else {
    const event = new CustomEvent('fleetmaster-preview-doc', {
      detail: {
        type: 'pdf',
        title,
        filename: outName,
        blob: pdfBlob,
        blobUrl: url,
        download: () => {
          doc.save(outName);
        }
      }
    });
    window.dispatchEvent(event);
  }
}

/**
 * Standard trigger to bring up print context if required.
 * Generates an elegant print-only style sheet and prints current screen view.
 */
export function triggerPrint() {
  window.print();
}
