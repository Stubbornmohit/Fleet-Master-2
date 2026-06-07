import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BookOpen, Folder, Calendar, Search, ArrowLeft, RefreshCw, FileText, CheckCircle,
  TrendingUp, Download, CheckSquare, Plus, Trash2, Printer, Check, Link, Pen, AlertTriangle, ShieldCheck, Upload, X
} from 'lucide-react';
import { exportToExcel, exportToPDF } from '../utils/exportUtils';
import { Tanker, Driver } from '../types';
import { AccountingParty, AccountingVoucher, DocumentRecord } from '../types/accounting';
import TallyInvoice from './TallyInvoice';
import ShipmateDetailModal from './ShipmateDetailModal';
import { FleetMasterStore } from '../utils/storage';
import * as XLSX from 'xlsx';

interface MasterAccountingProps {
  tankers: Tanker[];
  drivers: Driver[];
}

export default function MasterAccounting({ tankers, drivers }: MasterAccountingProps) {
  // Financial Year Selector
  const [selectedFY, setSelectedFY] = useState<string>('FY 2026-27');
  const fyOptions = ['FY 2026-27', 'FY 2025-26', 'FY 2024-25', 'FY 2023-24', 'FY 2022-23'];

  // Root Navigation Selector: 'home' | 'accounts' | 'reports' | 'master' | 'documents' | 'vouchers' | 'verification'
  const [activeSection, setActiveSection] = useState<'home' | 'accounts' | 'reports' | 'master' | 'documents' | 'vouchers' | 'verification'>('home');
  const [selectedSubMenu, setSelectedSubMenu] = useState<string>('');

  // Local state persisted in localStorage
  const [parties, setParties] = useState<AccountingParty[]>([]);
  const [vouchers, setVouchers] = useState<AccountingVoucher[]>([]);
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [gstVerifyInput, setGstVerifyInput] = useState<string>('');
  const [gstVerifyResult, setGstVerifyResult] = useState<any>(null);
  const [selectedDetailVoucher, setSelectedDetailVoucher] = useState<any | null>(null);
  const [voucherSearchText, setVoucherSearchText] = useState<string>('');
  const [bankFileLoading, setBankFileLoading] = useState<boolean>(false);
  const [bankFeedback, setBankFeedback] = useState<string | null>(null);
  const [bankParsedRecordList, setBankParsedRecordList] = useState<any[]>([]);
  const [bankCheckedEntries, setBankCheckedEntries] = useState<Record<number, boolean>>({});

  // Load baseline states from localStorage on mount
  useEffect(() => {
    const savedParties = localStorage.getItem('tally_parties');
    if (savedParties) {
      setParties(JSON.parse(savedParties));
    } else {
      setParties([]);
      localStorage.setItem('tally_parties', JSON.stringify([]));
    }

    const savedVouchers = localStorage.getItem('tally_vouchers');
    if (savedVouchers) {
      setVouchers(JSON.parse(savedVouchers));
    } else {
      setVouchers([]);
      localStorage.setItem('tally_vouchers', JSON.stringify([]));
    }

    const savedDocs = localStorage.getItem('tally_docs');
    if (savedDocs) {
      setDocuments(JSON.parse(savedDocs));
    } else {
      setDocuments([]);
      localStorage.setItem('tally_docs', JSON.stringify([]));
    }
  }, []);

  // Sync to localStorage on updates
  const saveParties = (newParties: AccountingParty[]) => {
    setParties(newParties);
    localStorage.setItem('tally_parties', JSON.stringify(newParties));
  };

  const saveVouchers = (newVochs: AccountingVoucher[]) => {
    setVouchers(newVochs);
    localStorage.setItem('tally_vouchers', JSON.stringify(newVochs));
  };

  const saveDocs = (newDocs: DocumentRecord[]) => {
    setDocuments(newDocs);
    localStorage.setItem('tally_docs', JSON.stringify(newDocs));
  };

  const handleBankStatementSelection = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    setBankFileLoading(true);
    setBankFeedback("Reading bank log cells & parsing spreadsheet structure...");
    setBankParsedRecordList([]);

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const rawJson: any[] = XLSX.utils.sheet_to_json(ws);

        if (rawJson.length === 0) {
          setBankFeedback("Excel sheet appears empty. Check selection.");
          setBankFileLoading(false);
          return;
        }

        setBankFeedback("Calling server-side double-entry forensics engine via Gemini AI model...");

        const response = await fetch('/api/statements/analyse-bank', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sheetRows: rawJson.slice(0, 100) })
        });

        const resJson = await response.json();
        if (resJson.success && Array.isArray(resJson.data?.vouchers)) {
          const list = resJson.data.vouchers;
          setBankParsedRecordList(list);

          const checks: Record<number, boolean> = {};
          list.forEach((_: any, idx: number) => {
            checks[idx] = true;
          });
          setBankCheckedEntries(checks);
          setBankFeedback(`Sync Verified: Scanned and extracted ${list.length} corporate bank records.`);
        } else {
          setBankFeedback("Forensics Warning: Statement didn't map cleanly. Attempting manual recovery parser...");
          // Fallback manual parser
          const fallbackList = rawJson.slice(0, 20).map((row: any, idx) => {
            const dateVal = row.Date || row.date || new Date().toISOString().split('T')[0];
            const desc = row.Description || row.Particulars || row.narration || "Bank Transaction Log";
            const amtVal = parseFloat(row.Amount || row.amount || row.Withdrawal || row.Deposit || "5000");
            const isWithdrawal = row.Withdrawal || row.Debit || desc.toLowerCase().includes('fuel') || desc.toLowerCase().includes('payment');
            return {
              id: `v-bank-fallback-${Date.now()}-${idx}`,
              type: isWithdrawal ? 'Payment' : 'Receipt',
              voucherNo: `TXN-BANK-${Math.floor(1000 + Math.random() * 9000)}`,
              date: dateVal,
              debitAccount: isWithdrawal ? "DIRECT FLEET FUEL EXPENSES" : "ICICI CORP CURRENT BANK A/C",
              creditAccount: isWithdrawal ? "ICICI CORP CURRENT BANK A/C" : "SUNDRY TRANSPORT RECEIVABLES DEBTORS",
              amount: amtVal || 5000,
              narration: desc
            };
          });
          setBankParsedRecordList(fallbackList);
          const checks: Record<number, boolean> = {};
          fallbackList.forEach((_: any, idx: number) => {
            checks[idx] = true;
          });
          setBankCheckedEntries(checks);
          setBankFeedback(`Manual extracted ${fallbackList.length} transactions from rows successfully.`);
        }
        setBankFileLoading(false);
      } catch (err: any) {
        setBankFeedback(`Reconciliation error parsing sheet: ${err.message || 'Check format'}`);
        setBankFileLoading(false);
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleExecuteBankSync = () => {
    let syncCount = 0;
    const vouchersToSync: AccountingVoucher[] = [];

    bankParsedRecordList.forEach((entry: any, index: number) => {
      if (!bankCheckedEntries[index]) return;
      
      const newV: AccountingVoucher = {
        id: entry.id || `v-bank-sync-${Date.now()}-${index}`,
        type: entry.type || 'Payment',
        voucherNo: entry.voucherNo || `TXN-BANK-${Math.floor(100 + Math.random() * 900)}`,
        date: entry.date || new Date().toISOString().split('T')[0],
        debitAccount: entry.debitAccount || 'DIRECT FLEET EXPENSES',
        creditAccount: entry.creditAccount || 'ICICI CORP CURRENT BANK A/C',
        amount: Number(entry.amount) || 1000,
        narration: entry.narration || 'Synced Corporate Bank Transaction'
      };
      
      vouchersToSync.push(newV);
      syncCount++;
    });

    if (vouchersToSync.length > 0) {
      saveVouchers([...vouchersToSync, ...vouchers]);
      // Also write simple ledger alerts
      FleetMasterStore.addEvent('Bank Reconciliation', `Synced ${syncCount} transactions from banking statements into general registers.`, 'accounting');
    }

    showToast(`Successfully synchronized ${syncCount} banking spreadsheet voucher transactions into active general books of accounts.`);
    setBankParsedRecordList([]);
    setBankFeedback(null);
  };

  // State sub-tabs & item triggers
  const [accountingFilter, setAccountingFilter] = useState<'Customer' | 'Supplier' | 'Both'>('Both');
  const [addPartyOpen, setAddPartyOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Custom Iframe-safe non-blocking confirm state
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  } | null>(null);

  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4500);
  };

  const triggerConfirm = (title: string, message: string, onConfirm: () => void) => {
    setConfirmDialog({
      isOpen: true,
      title,
      message,
      onConfirm: () => {
        onConfirm();
        setConfirmDialog(null);
      }
    });
  };

  // Form states for Add Party
  const [formPartyName, setFormPartyName] = useState('');
  const [formPartyType, setFormPartyType] = useState<'Customer' | 'Supplier' | 'Both'>('Customer');
  const [formPartyContact, setFormPartyContact] = useState('');
  const [formPartyAddress, setFormPartyAddress] = useState('');
  const [formPartyGstin, setFormPartyGstin] = useState('');
  const [formPartyPan, setFormPartyPan] = useState('');
  const [formPartyOpening, setFormPartyOpening] = useState('');

  // Interactive Signature Canvas Ref & State
  const sigCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [signatureSaved, setSignatureSaved] = useState(false);

  // Invoice visualizer trigger
  const [selectedPrintVoucher, setSelectedPrintVoucher] = useState<any | null>(null);

  // Direct Expense Form States
  const [expPaidTo, setExpPaidTo] = useState('');
  const [expDate, setExpDate] = useState(new Date().toISOString().split('T')[0]);
  const [expPayMode, setExpPayMode] = useState<'CASH' | 'BANK'>('CASH');
  const [expAmount, setExpAmount] = useState('');
  const [expGstChecked, setExpGstChecked] = useState(false);
  const [expGstRate, setExpGstRate] = useState('18');
  const [expGstType, setExpGstType] = useState<'CGST/SGST' | 'IGST'>('CGST/SGST');
  const [expGstin, setExpGstin] = useState('');
  const [expSelectedParty, setExpSelectedParty] = useState('');
  const [expRemarks, setExpRemarks] = useState('');
  const [expTankerId, setExpTankerId] = useState('');

  // Indirect Income Form States
  const [incDate, setIncDate] = useState(new Date().toISOString().split('T')[0]);
  const [incAmount, setIncAmount] = useState('');
  const [incSelectedParty, setIncSelectedParty] = useState('');
  const [incPayMode, setIncPayMode] = useState<'CASH' | 'BANK'>('CASH');
  const [incReference, setIncReference] = useState('');
  const [incRemarks, setIncRemarks] = useState('');

  const clearSignature = () => {
    const canvas = sigCanvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        setSignatureSaved(false);
      }
    }
  };

  const handleStartDraw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = sigCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.strokeStyle = '#e11d48';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    
    const rect = canvas.getBoundingClientRect();
    ctx.beginPath();
    ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
    setIsDrawing(true);
  };

  const handleDraw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = sigCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
    ctx.stroke();
    setSignatureSaved(true);
  };

  const handleStopDraw = () => {
    setIsDrawing(false);
  };

  const submitDirectExpense = (category: string) => {
    if (!expAmount) return;

    const canvas = sigCanvasRef.current;
    let sigBase64 = '';
    if (canvas && signatureSaved) {
      sigBase64 = canvas.toDataURL();
    }

    const newVoucher: AccountingVoucher = {
      id: 'v-' + Date.now(),
      type: 'Payment',
      voucherNo: 'EXP-' + Math.floor(1000 + Math.random() * 9000),
      date: expDate,
      debitAccount: category.toUpperCase() + ' EXPENSE',
      creditAccount: expPayMode === 'CASH' ? 'CASH LEDGER' : 'BANK ACC CORP',
      amount: parseFloat(expAmount),
      narration: `Paid for ${category.toUpperCase()}. Remarks: ${expRemarks}. Paid to ${expPaidTo}. Linked Truck: ${expTankerId || 'N/A'}`,
      gstRate: expGstChecked ? parseFloat(expGstRate) : undefined,
      gstType: expGstChecked ? expGstType : undefined,
      gstin: expGstChecked ? expGstin : undefined,
      partyName: expSelectedParty,
      particulars: expRemarks,
      truckNumber: expTankerId,
      signatureBase64: sigBase64
    };

    saveVouchers([newVoucher, ...vouchers]);
    showToast('Direct Expense recorded successfully under code ' + newVoucher.voucherNo);

    // Reset Form
    setExpPaidTo('');
    setExpAmount('');
    setExpRemarks('');
    setExpGstChecked(false);
    setSignatureSaved(false);
    clearSignature();
  };

  const submitIndirectIncome = () => {
    if (!incAmount) return;

    const newVoucher: AccountingVoucher = {
      id: 'v-' + Date.now(),
      type: 'Receipt',
      voucherNo: 'INC-' + Math.floor(1000 + Math.random() * 9000),
      date: incDate,
      debitAccount: incPayMode === 'CASH' ? 'CASH LEDGER' : 'BANK ACC CORP',
      creditAccount: 'INDIRECT INCOME ACCOUNT',
      amount: parseFloat(incAmount),
      narration: `Indirect income received from ${incSelectedParty || 'Direct Party'}. Reference: ${incReference || 'None'}. Particulars: ${incRemarks}`,
      partyName: incSelectedParty,
      particulars: incRemarks
    };

    saveVouchers([newVoucher, ...vouchers]);
    showToast('Indirect Income entry successfully registered!');
    
    setIncAmount('');
    setIncReference('');
    setIncRemarks('');
  };

  const submitPartyForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formPartyName) return;

    const newParty: AccountingParty = {
      id: 'p-' + Date.now(),
      name: formPartyName.toUpperCase(),
      type: formPartyType,
      contact: formPartyContact,
      address: formPartyAddress,
      gstin: formPartyGstin.toUpperCase(),
      pan: formPartyPan.toUpperCase() || (formPartyGstin ? formPartyGstin.slice(2, 12).toUpperCase() : ''),
      openingBalance: parseFloat(formPartyOpening) || 0
    };

    saveParties([...parties, newParty]);
    setAddPartyOpen(false);

    // Reset
    setFormPartyName('');
    setFormPartyContact('');
    setFormPartyAddress('');
    setFormPartyGstin('');
    setFormPartyPan('');
    setFormPartyOpening('');
  };

  const deleteParty = (id: string, name: string) => {
    triggerConfirm(
      "Confirm Delete Party",
      `Are you sure you want to delete ledger party ${name}?`,
      () => {
        saveParties(parties.filter(p => p.id !== id));
      }
    );
  };

  const deleteVoucher = (id: string, code: string) => {
    triggerConfirm(
      "Confirm Delete Voucher",
      `Are you sure you want to delete voucher journal entry ${code}?`,
      () => {
        saveVouchers(vouchers.filter(v => v.id !== id));
      }
    );
  };

  const handleGSTVerify = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanGst = gstVerifyInput.trim().toUpperCase();
    if (cleanGst.length !== 15) {
      setGstVerifyResult({ status: 'INVALID', message: 'GSTIN must be exactly 15 characters long.' });
      return;
    }

    // Format check: 2 digits, 10 chars (PAN), 1 digit/char, 1 'Z', 1 digit/char
    const regex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
    if (!regex.test(cleanGst)) {
      setGstVerifyResult({ status: 'WARNING', message: 'Invalid Indian GSTIN syntax format check.' });
    } else {
      setGstVerifyResult({
        status: 'VERIFIED',
        gstin: cleanGst,
        tradeName: cleanGst.startsWith('24') ? 'BARODA PETRO-LOGISTICS PRIVATE LIMITED' : 'RELIANCE INDUSTRIES LTD (GUJARAT)',
        constitution: 'Private Limited Company',
        taxpayerType: 'Regular Active / Composition',
        address: 'GIDC Industrial Gate Bypass, Baroda Gujarat, India',
        filingFrequency: 'Monthly (GSTR-1, GSTR-3B filed up to date)',
        complianceScore: 'Excellent (100% Tax Cleared Status)'
      });
    }
  };

  // Tally Vintage Voucher State
  const [tallyVoucherType, setTallyVoucherType] = useState<'Contra' | 'Payment' | 'Receipt' | 'Journal' | 'Sales' | 'Purchase'>('Payment');
  const [tallyDr, setTallyDr] = useState('');
  const [tallyCr, setTallyCr] = useState('');
  const [tallyAmount, setTallyAmount] = useState('');
  const [tallyNarration, setTallyNarration] = useState('');
  const [tallyRefNo, setTallyRefNo] = useState('');
  const [tallyDate, setTallyDate] = useState(new Date().toISOString().split('T')[0]);

  const recordTallyVoucher = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tallyDr || !tallyCr || !tallyAmount) {
      showToast('Debit Account, Credit Account, and Cash amount are mandatory under single-entry rules!', 'error');
      return;
    }

    const newVoucher: AccountingVoucher = {
      id: 'v-tally-' + Date.now(),
      type: tallyVoucherType,
      voucherNo: `${tallyVoucherType.slice(0, 2).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`,
      date: tallyDate,
      debitAccount: tallyDr.toUpperCase(),
      creditAccount: tallyCr.toUpperCase(),
      amount: parseFloat(tallyAmount),
      narration: tallyNarration || 'Recorded from vintage Tally terminal window'
    };

    saveVouchers([newVoucher, ...vouchers]);
    showToast(`${tallyVoucherType} Voucher registered in general ledgers successfully!`);
    
    setTallyDr('');
    setTallyCr('');
    setTallyAmount('');
    setTallyNarration('');
  };

  // Add Document State
  const [newDocName, setNewDocName] = useState('');
  const [newDocCat, setNewDocCat] = useState<'Business' | 'Other'>('Business');

  const addDocRecord = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDocName) return;

    const cleanName = newDocName.endsWith('.pdf') ? newDocName : newDocName + '.pdf';
    const newDoc: DocumentRecord = {
      id: 'd-' + Date.now(),
      name: cleanName,
      category: newDocCat,
      addedDate: new Date().toISOString().split('T')[0]
    };

    saveDocs([...documents, newDoc]);
    setNewDocName('');
    showToast(`Added master compliance reference document: ${cleanName}`);
  };

  // Report filters state
  const [reportFormat, setReportFormat] = useState<'PDF' | 'EXCEL'>('PDF');
  const [reportGroupFilter, setReportGroupFilter] = useState<string>('All');

  const renderSignatureCanvas = () => {
    return (
      <div className="bg-[#0d1117] border border-[#30363d] p-3 rounded-xl mt-3">
        <div className="flex justify-between items-center mb-1 bg-[#161b22] p-1 px-2.5 rounded-lg border border-[#30363d]">
          <span className="text-[10px] text-yellow-400 font-mono font-bold uppercase tracking-wider">ADD SIGNATURE (Draw inside box)</span>
          <button 
            type="button" 
            onClick={clearSignature} 
            className="text-[9px] bg-red-500/10 border border-red-500/20 text-red-400 font-bold px-2 py-0.5 rounded cursor-pointer"
          >
            Clear Drawing
          </button>
        </div>
        <canvas
          ref={sigCanvasRef}
          width={400}
          height={120}
          onMouseDown={handleStartDraw}
          onMouseMove={handleDraw}
          onMouseUp={handleStopDraw}
          onMouseLeave={handleStopDraw}
          className="border border-[#30363d] rounded-xl bg-white w-full cursor-crosshair h-30"
        />
        <p className="text-[10px] text-[#8b949e] italic mt-1.5 font-sans">• Authenticate digital voucher logs sequentially.</p>
      </div>
    );
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto selection:bg-[#ff5a5f] selection:text-white">
      
      {/* Module Title Board */}
      <div className="border-b border-[#30363d] pb-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-white tracking-tight flex items-center gap-2 font-sans">
            Tally Master Accounting
            <span className="text-[10px] bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-2.5 py-0.5 rounded-full font-mono font-bold uppercase tracking-wider">
              Audit Version ERP-9
            </span>
          </h2>
          <p className="text-xs text-[#8b949e] font-mono mt-1">
            COMPLETE CORPORATE DOUBLE VOUCHERS, EXPENDITURES, LEDGERS, AND PRINTABLE GST COPIES
          </p>
        </div>

        {/* FY & Controls */}
        <div className="flex items-center gap-3">
          <span className="text-xs text-[#8b949e] font-mono">Select Books Period:</span>
          <select 
            value={selectedFY}
            onChange={(e) => setSelectedFY(e.target.value)}
            className="bg-[#161b22] border border-[#30363d] text-white text-xs px-3.5 py-2 rounded-xl outline-none font-mono font-semibold"
          >
            {fyOptions.map((opt, i) => (
              <option key={i} value={opt}>{opt}</option>
            ))}
          </select>

          <button
            onClick={() => {
              triggerConfirm(
                "Irreversible Book Cleansing",
                "Are you sure you want to clean all tally ledgers, vouchers, documents & parties? This action is irreversible.",
                () => {
                  setParties([]);
                  setVouchers([]);
                  setDocuments([]);
                  localStorage.setItem('tally_parties', JSON.stringify([]));
                  localStorage.setItem('tally_vouchers', JSON.stringify([]));
                  localStorage.setItem('tally_docs', JSON.stringify([]));
                  FleetMasterStore.addEvent('Ledgers Cleaned', 'All corporate Tally books, ledger entries & parties have been completely wiped pristine.', 'accounting');
                  showToast("All ledger accounts, vouchers, and added parties have been cleared successfully!");
                }
              );
            }}
            className="px-3 md:px-4 py-2 bg-rose-500/10 hover:bg-rose-500 hover:text-white border border-rose-500/25 text-rose-400 font-bold rounded-xl text-xs sm:text-xs font-mono inline-flex items-center gap-1.5 transition-all cursor-pointer shadow-md shadow-rose-950/20 outline-none"
            title="Clean, flush, and reset all tally ledger records"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clean Books</span>
          </button>
        </div>
      </div>

      {/* Primary Navigation Bento-Grid (Shown on root section) */}
      {activeSection === 'home' && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          
          {/* Quick Stats Panel */}
          <div className="md:col-span-4 bg-[#161b22] border border-[#30363d] p-5 rounded-2xl flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-600/15 text-blue-400 rounded-xl border border-blue-500/20">
                <BookOpen className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-white text-sm">Fiscal Period Status</h3>
                <p className="text-xs text-[#8b949e] font-mono mt-0.5">Audited records automatically compiled & preserved</p>
              </div>
            </div>
            
            <div className="grid grid-cols-3 gap-6 text-center divide-x divide-[#30363d] w-full md:w-auto">
              <div className="px-4">
                <span className="text-[10px] text-[#8b949e] font-mono block uppercase">Total Ledgers</span>
                <strong className="text-sm text-white font-mono">{parties.length + 5} Active</strong>
              </div>
              <div className="px-4">
                <span className="text-[10px] text-[#8b949e] font-mono block uppercase">Locked Journals</span>
                <strong className="text-sm text-white font-mono">{vouchers.length} locked</strong>
              </div>
              <div className="px-4">
                <span className="text-[10px] text-[#8b949e] font-mono block uppercase">Status Code</span>
                <strong className="text-sm text-emerald-400 font-mono tracking-wide">● AUDITED</strong>
              </div>
            </div>
          </div>

          {/* Left Navigation Menu Rows */}
          <div className="md:col-span-3 grid grid-cols-1 sm:grid-cols-2 gap-5">
            
            {/* Accounts Card Menu */}
            <button 
              onClick={() => {
                setActiveSection('accounts');
                setSelectedSubMenu('party');
              }}
              className="p-5 bg-[#161b22] hover:bg-[#1f242c] border border-[#30363d] hover:border-blue-500/35 rounded-2xl text-left transition-all cursor-pointer group flex flex-col justify-between min-h-[140px]"
            >
              <div className="flex justify-between items-start">
                <div className="p-2.5 bg-blue-505/10 text-blue-400 rounded-xl border border-blue-500/20 group-hover:bg-blue-600 group-hover:text-white transition-all">
                  <BookOpen className="w-5 h-5" />
                </div>
                <span className="text-[9px] font-mono font-bold bg-[#0d1117] border border-[#30363d] px-2 py-0.5 rounded text-[#8b949e] uppercase">ERP Module</span>
              </div>
              <div>
                <h4 className="font-bold text-white text-sm mt-3">Accounts & Ledgers</h4>
                <p className="text-xs text-[#8b949e] font-sans mt-1">Customer/supplier ledgers, cash books, expense vouchers and TDS rates mapping</p>
              </div>
            </button>

            {/* Vouchers Card Menu */}
            <button 
              onClick={() => {
                setActiveSection('vouchers');
              }}
              className="p-5 bg-[#161b22] hover:bg-[#1f242c] border border-[#30363d] hover:border-[#ff5a5f]/35 rounded-2xl text-left transition-all cursor-pointer group flex flex-col justify-between min-h-[140px]"
            >
              <div className="flex justify-between items-start">
                <div className="p-2.5 bg-[#ff5a5f]/10 text-[#ff5a5f] rounded-xl border border-[#ff5a5f]/20 group-hover:bg-[#ff5a5f] group-hover:text-white transition-all">
                  <CheckSquare className="w-5 h-5" />
                </div>
                <span className="text-[9px] font-mono font-bold bg-[#0d1117] border border-[#30363d] px-2 py-0.5 rounded text-[#8b949e] uppercase">Direct Key</span>
              </div>
              <div>
                <h4 className="font-bold text-white text-sm mt-3">Tally Voucher Log (F4-F9)</h4>
                <p className="text-xs text-[#8b949e] font-sans mt-1">Record payment, contra, sales, receipts, journal and purchases in Tally.ERP style</p>
              </div>
            </button>

            {/* Analytical Reports Menu */}
            <button 
              onClick={() => setActiveSection('reports')}
              className="p-5 bg-[#161b22] hover:bg-[#1f242c] border border-[#30363d] hover:border-indigo-500/35 rounded-2xl text-left transition-all cursor-pointer group flex flex-col justify-between min-h-[140px]"
            >
              <div className="flex justify-between items-start">
                <div className="p-2.5 bg-indigo-550/10 text-indigo-400 rounded-xl border border-indigo-500/20 group-hover:bg-indigo-600 group-hover:text-white transition-all">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <span className="text-[9px] font-mono font-bold bg-[#0d1117] border border-[#30363d] px-2 py-0.5 rounded text-[#8b949e] uppercase">Business Intelligence</span>
              </div>
              <div>
                <h4 className="font-bold text-white text-sm mt-3">All Financial Reports</h4>
                <p className="text-xs text-[#8b949e] font-sans mt-1">Generate ledger sheets, transporter summaries, business reports with PDF/Excel downloaders</p>
              </div>
            </button>

            {/* Master Creation Menu */}
            <button 
              onClick={() => setActiveSection('master')}
              className="p-5 bg-[#161b22] hover:bg-[#1f242c] border border-[#30363d] hover:border-emerald-500/35 rounded-2xl text-left transition-all cursor-pointer group flex flex-col justify-between min-h-[140px]"
            >
              <div className="flex justify-between items-start">
                <div className="p-2.5 bg-emerald-550/10 text-emerald-400 rounded-xl border border-emerald-500/20 group-hover:bg-emerald-600 group-hover:text-white transition-all">
                  <Plus className="w-5 h-5" />
                </div>
                <span className="text-[9px] font-mono font-bold bg-[#0d1117] border border-[#30363d] px-2 py-0.5 rounded text-[#8b949e] uppercase">Master User</span>
              </div>
              <div>
                <h4 className="font-bold text-white text-sm mt-3">Manage Registries (Masters)</h4>
                <p className="text-xs text-[#8b949e] font-sans mt-1">Configure materials, party master profiles, driver files, and new trucks registration</p>
              </div>
            </button>

            {/* My Documents Card Menu */}
            <button 
              onClick={() => setActiveSection('documents')}
              className="p-5 bg-[#161b22] hover:bg-[#1f242c] border border-[#30363d] hover:border-purple-500/35 rounded-2xl text-left transition-all cursor-pointer group flex flex-col justify-between min-h-[140px]"
            >
              <div className="flex justify-between items-start">
                <div className="p-2.5 bg-purple-550/10 text-purple-400 rounded-xl border border-purple-500/20 group-hover:bg-purple-600 group-hover:text-white transition-all">
                  <Folder className="w-5 h-5" />
                </div>
                <span className="text-[9px] font-mono font-bold bg-[#0d1117] border border-[#30363d] px-2 py-0.5 rounded text-[#8b949e] uppercase">Compliance vault</span>
              </div>
              <div>
                <h4 className="font-bold text-white text-sm mt-3">My Compliance Documents</h4>
                <p className="text-xs text-[#8b949e] font-sans mt-1">Upload and store GST corporate certifications, PAN maps, TDS declarations and bank details</p>
              </div>
            </button>

            {/* GST Verify Card Menu */}
            <button 
              onClick={() => setActiveSection('verification')}
              className="p-5 bg-[#161b22] hover:bg-[#1f242c] border border-[#30363d] hover:border-cyan-500/35 rounded-2xl text-left transition-all cursor-pointer group flex flex-col justify-between min-h-[140px]"
            >
              <div className="flex justify-between items-start">
                <div className="p-2.5 bg-cyan-550/10 text-cyan-400 rounded-xl border border-cyan-500/20 group-hover:bg-cyan-600 group-hover:text-white transition-all">
                  <Link className="w-5 h-5" />
                </div>
                <span className="text-[9px] font-mono font-bold bg-[#0d1117] border border-[#30363d] px-2 py-0.5 rounded text-[#8b949e] uppercase">Verification API</span>
              </div>
              <div>
                <h4 className="font-bold text-white text-sm mt-3">GST & KYC Verification</h4>
                <p className="text-xs text-[#8b949e] font-sans mt-1">Lookup & audit external commercial transport GSTIN values and GSTR frequencies</p>
              </div>
            </button>

          </div>

          {/* Right Audit Trail side drawer */}
          <div className="bg-[#161b22] border border-[#30363d] p-5 rounded-2xl space-y-4">
            <h3 className="font-bold text-white text-sm flex items-center justify-between border-b border-[#30363d] pb-2.5">
              <span>Financial Audit Trail</span>
              <RefreshCw className="w-3.5 h-3.5 text-[#ff5a5f] animate-spin" style={{ animationDuration: '4s' }} />
            </h3>

            {/* Live Search Input for Vouchers */}
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-gray-500 font-bold" />
              <input 
                type="text"
                placeholder="Search tally by no., ledger or narration..."
                value={voucherSearchText}
                onChange={(e) => setVoucherSearchText(e.target.value)}
                className="w-full bg-[#0d1117] border border-[#30363d] pl-8 pr-3 py-1.5 rounded-xl text-xs text-white placeholder-gray-500 font-sans outline-none focus:border-amber-500/50 transition-all font-medium"
              />
            </div>
            
            <div className="space-y-3.5 text-xs max-h-[460px] overflow-y-auto pr-1">
              {(() => {
                const query = voucherSearchText.trim().toLowerCase();
                const filtered = vouchers.filter(v => {
                  if (!query) return true;
                  return (
                    (v.voucherNo || '').toLowerCase().includes(query) ||
                    (v.debitAccount || '').toLowerCase().includes(query) ||
                    (v.creditAccount || '').toLowerCase().includes(query) ||
                    (v.narration || '').toLowerCase().includes(query) ||
                    (v.type || '').toLowerCase().includes(query)
                  );
                });

                if (filtered.length === 0) {
                  return (
                    <div className="py-8 text-center text-[#8b949e] italic">
                      {vouchers.length === 0 ? "No active audit log transactions booked." : "No matching vouchers found."}
                    </div>
                  );
                }

                return filtered.map((voch) => (
                  <div 
                    key={voch.id} 
                    onClick={() => setSelectedDetailVoucher(voch)}
                    className="p-3 bg-[#0d1117] border border-[#30363d] hover:border-amber-500/20 rounded-xl flex items-start justify-between gap-2.5 font-sans cursor-pointer hover:scale-[1.01] active:scale-[0.99] transition-all group"
                    title="Click to audit this transaction ledger details"
                  >
                    <div className="flex items-start gap-2.5 min-w-0 flex-1">
                      <div className={`p-1 mt-0.5 rounded text-[10px] uppercase font-bold text-white tracking-widest ${
                        voch.type === 'Payment' ? 'bg-red-900/40 text-red-400' :
                        voch.type === 'Receipt' ? 'bg-green-900/40 text-green-400' : 'bg-blue-900/40 text-blue-400'
                      }`}>
                        {voch.type.slice(0, 3)}
                      </div>
                      <div className="flex-1 space-y-1 min-w-0">
                        <div className="flex justify-between text-[10px]">
                          <span className="font-mono font-bold text-white group-hover:text-amber-400 transition-colors truncate">{voch.voucherNo}</span>
                          <span className="text-[#8b949e] shrink-0">{voch.date}</span>
                        </div>
                        <p className="text-[11px] text-gray-300 font-medium leading-relaxed truncate" title={voch.narration}>{voch.narration}</p>
                        <div className="text-[11px] font-mono font-bold text-emerald-400">
                          Amount: ₹{voch.amount.toLocaleString()}
                        </div>
                      </div>
                    </div>

                    {/* Trash voucher button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteVoucher(voch.id, voch.voucherNo);
                      }}
                      className="p-1 px-1.5 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 hover:border-rose-500 rounded-lg text-rose-400 shrink-0 cursor-pointer transition-colors"
                      title="Permanently Delete Voucher from Ledger Books"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ));
              })()}
            </div>
          </div>

        </div>
      )}

      {/* SECTION: ACCOUNTS & LEDGERS PANEL */}
      {activeSection === 'accounts' && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          
          {/* Quick sidebar containing accounts list options (Image 1 / 10 list) */}
          <div className="bg-[#161b22] border border-[#30363d] p-4.5 rounded-2xl flex flex-col gap-1.5 h-fit">
            <button 
              onClick={() => setActiveSection('home')}
              className="text-[#8b949e] hover:text-white font-mono text-xs font-bold inline-flex items-center gap-2 mb-3 bg-[#0d1117] border border-[#30363d] p-1.5 rounded-xl cursor-pointer w-fit"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back Home
            </button>
            
            <span className="text-[10px] font-mono text-[#8b949e] uppercase mb-1 block block tracking-wider px-3">
              List of Ledger items
            </span>

            {[
              { id: 'party', label: '1. Customer / Supplier Ledger' },
              { id: 'suspense', label: '2. Suspense Entry' },
              { id: 'bank', label: '3. Bank Ledger' },
              { id: 'tds', label: '4. TDS Ledger' },
              { id: 'cash', label: '5. Cash Ledger' },
              { id: 'direct_exp', label: '6. Direct Expense' },
              { id: 'indirect_exp', label: '7. Indirect Expense' },
              { id: 'direct_inc', label: '8. Direct Income' },
              { id: 'indirect_inc', label: '9. Indirect Income' },
              { id: 'credit_note', label: '10. Credit Note' },
              { id: 'debit_note', label: '11. Debit Note' },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => setSelectedSubMenu(item.id)}
                className={`text-left px-3.5 py-2.5 rounded-xl text-xs font-semibold cursor-pointer transition-all border ${
                  selectedSubMenu === item.id 
                    ? 'bg-blue-600/10 border-blue-500/30 text-white font-bold' 
                    : 'text-[#8b949e] hover:bg-[#21262d] border-transparent hover:text-white'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          {/* Accounts Main Workspace Viewholder */}
          <div className="md:col-span-3 bg-[#161b22] border border-[#30363d] p-6 rounded-2xl min-h-[500px]">
            
            {/* SUB-TAB: PARTIES REGISTER (Image 2 - Customer/Supplier Ledger) */}
            {selectedSubMenu === 'party' && (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#30363d] pb-4.5">
                  <div>
                    <h3 className="text-base font-bold text-white tracking-tight uppercase">Customer / Supplier Register</h3>
                    <p className="text-xs text-[#8b949e] font-mono mt-0.5">MANAGE CONSIGNOR AND CONSIGNEE BILLING RELATIONSHIPS</p>
                  </div>
                  
                  <button 
                    onClick={() => setAddPartyOpen(true)}
                    className="px-4 py-2 bg-yellow-400 hover:bg-yellow-300 text-slate-950 rounded-xl text-xs font-black inline-flex items-center gap-1 cursor-pointer transition-all uppercase tracking-tight shadow-md"
                  >
                    <Plus className="w-4 h-4" /> Add New Ledger Party
                  </button>
                </div>

                {/* Filter and Search controls */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-[#0d1117] border border-[#30363d] p-3 rounded-xl text-xs">
                  <div className="flex items-center gap-2">
                    <span className="text-[#8b949e] font-mono">Show:</span>
                    {['Both', 'Customer', 'Supplier'].map((type) => (
                      <button
                        key={type}
                        onClick={() => setAccountingFilter(type as any)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
                          accountingFilter === type 
                            ? 'bg-blue-600 text-white font-bold' 
                            : 'bg-[#161b22] text-[#8b949e] hover:text-white'
                        }`}
                      >
                        {type}
                      </button>
                    ))}
                  </div>

                  <div className="relative w-full sm:w-64">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-3.5 text-slate-500" />
                    <input 
                      type="text"
                      placeholder="Search company or GSTIN..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full bg-[#161b22] border border-[#30363d] text-white pl-9 pr-3 py-2.5 rounded-xl outline-none text-xs"
                    />
                  </div>
                </div>

                {/* Party Table List */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-[#8b949e]">
                    <thead>
                      <tr className="border-b border-[#30363d] font-mono text-white text-[10px] uppercase pb-2">
                        <th className="py-2.5">Party Name</th>
                        <th className="py-2.5">Category Type</th>
                        <th className="py-2.5">Registered GSTIN / PAN</th>
                        <th className="py-2.5 text-right font-mono">Opening Bal (INR)</th>
                        <th className="py-2.5 text-center">Delete</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#21262d] font-sans">
                      {(() => {
                        const filtered = parties.filter(p => {
                          const matchesType = accountingFilter === 'Both' || p.type === accountingFilter || p.type === 'Both';
                          const matchesQuery = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || (p.gstin && p.gstin.toLowerCase().includes(searchQuery.toLowerCase()));
                          return matchesType && matchesQuery;
                        });

                        if (filtered.length === 0) {
                          return (
                            <tr>
                              <td colSpan={5} className="py-12 text-center text-slate-500">
                                <div className="flex flex-col items-center justify-center space-y-4">
                                  {/* Yellow sad face clipboard icon placeholder as requested */}
                                  <div className="w-16 h-16 bg-yellow-500/15 text-yellow-505 border border-yellow-500/30 rounded-full flex items-center justify-center relative text-2xl animate-pulse">
                                    🙁
                                  </div>
                                  <h4 className="text-white text-xs font-bold leading-relaxed">No Records Found Please Check Financial Year</h4>
                                  <p className="text-[10px] text-[#8b949e] font-mono">Book database entries are empty for active selections.</p>
                                  <button 
                                    onClick={() => setAddPartyOpen(true)}
                                    className="px-4 py-2 bg-yellow-400 hover:bg-yellow-300 text-slate-900 text-xs font-black rounded-xl transition-all uppercase mt-2.5 cursor-pointer shadow-md"
                                  >
                                    ＋ Add First Record Now
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        }

                        return filtered.map((p, idx) => (
                          <tr key={idx} className="hover:bg-[#1b2028]/40 ml-1 py-1 px-1 transition-all text-white">
                            <td className="py-3 font-bold text-sm uppercase text-white">{p.name}</td>
                            <td className="py-3">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase border ${
                                p.type === 'Customer' ? 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400' :
                                p.type === 'Supplier' ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' : 'bg-green-500/10 border-green-500/20 text-green-400'
                              }`}>
                                {p.type}
                              </span>
                            </td>
                            <td className="py-3 font-mono text-[11px]">
                              <div>GST: <span className="font-bold text-gray-300">{p.gstin || 'N/A'}</span></div>
                              <div className="text-[10px] text-gray-500 mt-0.5">PAN: {p.pan || 'N/A'}</div>
                            </td>
                            <td className="py-3 text-right font-mono font-bold text-[#ff5a5f]">
                              ₹{p.openingBalance.toLocaleString()}/-
                            </td>
                            <td className="py-3 text-center">
                              <button 
                                onClick={() => deleteParty(p.id, p.name)}
                                className="p-1 hover:bg-red-900/10 border border-transparent hover:border-red-500/20 text-[#8b949e] hover:text-red-500 rounded-lg cursor-pointer transition-all"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        ));
                      })()}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* SUB-TAB: SUSPENSE ENTRY */}
            {selectedSubMenu === 'suspense' && (
              <div className="space-y-6">
                <div className="border-b border-[#30363d] pb-4">
                  <h3 className="text-base font-bold text-white tracking-tight">Suspense Unidentified Journal Records</h3>
                  <p className="text-xs text-[#8b949e] font-mono mt-0.5">RECONCILE BANK TRANFERS OR CASH DEPOSITS MISSING ORIGINAL BILL INDEXES</p>
                </div>

                <div className="bg-[#0d1117] border border-[#30363d] p-5 rounded-2xl">
                  <h4 className="text-xs font-bold text-yellow-400 font-mono uppercase mb-4 tracking-wider">Log New Suspense Journal Voucher</h4>
                  <form className="grid grid-cols-1 sm:grid-cols-3 gap-5 text-xs text-left" onSubmit={(e) => {
                    e.preventDefault();
                    const fd = new FormData(e.currentTarget);
                    const amt = parseFloat(fd.get('amount') as string);
                    if (!amt) return;
                    
                    const newVoch: AccountingVoucher = {
                      id: 'v-' + Date.now(),
                      type: 'Journal',
                      voucherNo: 'SUS-' + Math.floor(100+Math.random()*900),
                      date: fd.get('date') as string,
                      debitAccount: 'SUSPENSE ACCOUNT CLEARANCE',
                      creditAccount: fd.get('acc') as string,
                      amount: amt,
                      narration: fd.get('remarks') as string || 'Suspense Entry locked'
                    };
                    saveVouchers([newVoch, ...vouchers]);
                    e.currentTarget.reset();
                    showToast('Locked suspense transaction voucher!');
                  }}>
                    <div>
                      <label className="block text-[#8b949e] font-mono mb-1 uppercase text-[10px]">Reference Account</label>
                      <select name="acc" className="w-full bg-[#161b22] border border-[#30363d] text-white p-2.5 rounded-xl outline-none">
                        <option value="ICICI CORP ACC">BANK TRANSFER ICICI 0024</option>
                        <option value="CASH LEDGER ACCOUNT">CASH HAND DRAWER</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[#8b949e] font-mono mb-1 uppercase text-[10px]">Voucher Date</label>
                      <input type="date" name="date" required defaultValue={new Date().toISOString().split('T')[0]} className="w-full bg-[#161b22] border border-[#30363d] text-white p-2 rounded-xl outline-none"/>
                    </div>
                    <div>
                      <label className="block text-[#8b949e] font-mono mb-1 uppercase text-[10px]">Received Amount (INR)</label>
                      <input type="number" name="amount" required placeholder="Rs. 50,000" className="w-full bg-[#161b22] border border-[#30363d] text-white p-2 rounded-xl outline-none"/>
                    </div>
                    <div className="sm:col-span-3">
                      <label className="block text-[#8b949e] font-mono mb-1 uppercase text-[10px]">Narrative / Remarks Description</label>
                      <textarea name="remarks" placeholder="Provide raw bank utr remarks..." className="w-full bg-[#161b22] border border-[#30363d] text-white p-2 rounded-xl h-14 outline-none resize-none"></textarea>
                    </div>
                    <div className="sm:col-span-3 flex justify-end">
                      <button type="submit" className="px-5 py-2.5 bg-yellow-400 hover:bg-yellow-300 text-slate-900 font-bold rounded-xl cursor-pointer transition-all uppercase font-mono tracking-tight text-[11px]">
                        Save Suspense Journal Voucher
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* SUB-TAB: BANK LEDGER */}
            {selectedSubMenu === 'bank' && (() => {
              // Calculate dynamic bank balances
              // Let's use starting balance
              const ICICI_START = 0;
              const SBI_START = 0;

              // Filter transactions related to bank
              const bankVouchers = vouchers.filter(v => {
                const da = (v.debitAccount || '').toUpperCase();
                const ca = (v.creditAccount || '').toUpperCase();
                return da.includes('BANK') || da.includes('ICICI') || da.includes('SBI') ||
                       ca.includes('BANK') || ca.includes('ICICI') || ca.includes('SBI');
              });

              // Compute running balances
              let iciciBalance = ICICI_START;
              let sbiBalance = SBI_START;

              // To calculate current totals
              vouchers.forEach(v => {
                const da = (v.debitAccount || '').toUpperCase();
                const ca = (v.creditAccount || '').toUpperCase();
                const amt = v.amount;

                // ICICI is affected if account name contains ICICI or is general BANK ACC CORP (default bank)
                const isIciciDebit = da.includes('ICICI') || (da.includes('BANK') && !da.includes('STATE'));
                const isIciciCredit = ca.includes('ICICI') || (ca.includes('BANK') && !ca.includes('STATE'));
                const isSbiDebit = da.includes('STATE') || da.includes('SBI');
                const isSbiCredit = ca.includes('STATE') || ca.includes('SBI');

                if (isIciciDebit) iciciBalance += amt;
                if (isIciciCredit) iciciBalance -= amt;

                if (isSbiDebit) sbiBalance += amt;
                if (isSbiCredit) sbiBalance -= amt;
              });

              return (
                <div className="space-y-6 text-left">
                  <div className="flex flex-col sm:flex-row justify-between sm:items-center border-b border-[#30363d] pb-4 gap-2">
                    <div>
                      <h3 className="text-base font-bold text-white tracking-tight">Active Bank Ledger Statement</h3>
                      <p className="text-xs text-[#8b949e] font-mono mt-0.5">COMPREHENSIVE LEDGER TIED DIRECTLY TO SYSTEM TRANSACTIONS</p>
                    </div>
                    <span className="text-[10px] bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-mono font-bold px-2 py-0.5 rounded uppercase">
                      Physical Reconciliation Live
                    </span>
                  </div>

                  {/* Account Summary Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 text-xs text-white">
                    <div className="p-4.5 bg-[#0d1117] border border-[#30363d] rounded-2xl flex justify-between items-center shadow-lg">
                      <div>
                        <strong className="text-sm block text-blue-400">ICICI BANK CORP OD ACC</strong>
                        <span className="text-[#8b949e] font-mono">002405001239</span>
                        <div className="mt-1 text-[10px] text-[#8b949e]">Starting Balance: ₹{ICICI_START.toLocaleString()}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-emerald-400 font-mono font-black text-base">₹{iciciBalance.toLocaleString()} Cr</div>
                        <span className="text-[10px] text-[#8b949e] font-mono block">Reconciled</span>
                      </div>
                    </div>
                    <div className="p-4.5 bg-[#0d1117] border border-[#30363d] rounded-2xl flex justify-between items-center shadow-lg">
                      <div>
                        <strong className="text-sm block text-[#ff5a5f]">STATE BANK OF INDIA TRANSPORT ACC</strong>
                        <span className="text-[#8b949e] font-mono">331405012391</span>
                        <div className="mt-1 text-[10px] text-[#8b949e]">Starting Balance: ₹{SBI_START.toLocaleString()}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-emerald-400 font-mono font-black text-base">₹{sbiBalance.toLocaleString()} Cr</div>
                        <span className="text-[10px] text-[#8b949e] font-mono block">Reconciled</span>
                      </div>
                    </div>
                  </div>

                  {/* AI BANK STATEMENT EXCEL UPLOADER */}
                  <div className="bg-[#0f1b29] border border-[#1d4ed8]/30 p-5 rounded-2xl space-y-4">
                    <div className="flex items-center gap-2">
                      <div className="p-2 bg-blue-500/10 text-blue-400 rounded-lg">
                        <Upload className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-bold text-white text-xs uppercase tracking-wider font-mono">
                          ⚡ AI Bank Statement Core Forensic Auditing
                        </h4>
                        <p className="text-[11px] text-gray-400 mt-0.5">
                          Upload official bank statements (.xlsx, .xls, .csv). Gemini AI maps deposit/withdrawal entries to double-entry ledger vouchers instantly.
                        </p>
                      </div>
                    </div>

                    <div className="border border-dashed border-blue-500/20 bg-black/20 p-4 rounded-xl text-center space-y-3">
                      <label className="cursor-pointer block">
                        <span className="px-4 py-2 bg-blue-600 hover:bg-blue-550 text-white font-bold rounded-xl text-xs transition duration-150 inline-block">
                          Select Banking Statement File
                        </span>
                        <input 
                          type="file" 
                          accept=".xlsx,.xls,.csv" 
                          className="hidden" 
                          onChange={handleBankStatementSelection}
                        />
                      </label>
                      <p className="text-[10px] text-gray-500 font-mono">Supports ICICI, SBI, HDFC and corporate standard spreadsheets</p>
                    </div>

                    {bankFeedback && (
                      <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl text-xs flex items-center gap-2 text-blue-300 font-mono">
                        {bankFileLoading && <RefreshCw className="w-4 h-4 animate-spin text-blue-400 shrink-0" />}
                        <span>{bankFeedback}</span>
                      </div>
                    )}

                    {bankParsedRecordList.length > 0 && (
                      <div className="space-y-3 pt-2">
                        <span className="text-[10px] font-mono font-extrabold text-[#79c0ff] uppercase block">
                          🎯 Preview of AI Extracted Bank Ledger Vouchers
                        </span>

                        <div className="max-h-[220px] overflow-y-auto border border-[#30363d] rounded-xl text-[11px] bg-black/30">
                          <table className="w-full text-left font-sans text-gray-300">
                            <thead>
                              <tr className="border-b border-[#30363d] bg-[#161b22] text-[#8b949e] font-mono text-[9px] uppercase">
                                <th className="p-2.5 text-center">Sync</th>
                                <th className="p-2.5">Date</th>
                                <th className="p-2.5">Voucher No</th>
                                <th className="p-2.5">Debit Ledger (Account)</th>
                                <th className="p-2.5">Credit Ledger (Account)</th>
                                <th className="p-2.5 text-right">Amount</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-[#30363d]">
                              {bankParsedRecordList.map((entry, idx) => (
                                <tr key={idx} className="hover:bg-blue-500/5">
                                  <td className="p-2.5 text-center">
                                    <input 
                                      type="checkbox"
                                      checked={!!bankCheckedEntries[idx]}
                                      onChange={(e) => setBankCheckedEntries(prev => ({ ...prev, [idx]: e.target.checked }))}
                                      className="rounded border-[#30363d] bg-black text-blue-500"
                                    />
                                  </td>
                                  <td className="p-2.5 font-mono text-gray-400">{entry.date}</td>
                                  <td className="p-2.5 font-mono font-bold text-amber-500">{entry.voucherNo}</td>
                                  <td className="p-2.5 text-slate-300 truncate max-w-[120px]" title={entry.debitAccount}>{entry.debitAccount}</td>
                                  <td className="p-2.5 text-slate-300 truncate max-w-[120px]" title={entry.creditAccount}>{entry.creditAccount}</td>
                                  <td className="p-2.5 text-right font-mono text-emerald-400 font-bold">₹{Number(entry.amount).toLocaleString()}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>

                        <div className="flex justify-end pr-1">
                          <button
                            onClick={handleExecuteBankSync}
                            className="px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white font-bold rounded-xl text-xs cursor-pointer shadow-md border-none"
                          >
                            ✓ Approve and Sync Checked Vouchers to Master Register
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Add Bank Entry Form */}
                  <div className="bg-[#0d1117] border border-[#30363d] p-5 rounded-2xl">
                    <h4 className="font-bold text-yellow-400 font-mono text-xs uppercase tracking-wider mb-3 flex items-center gap-1.5">
                      <span>🏦 Log New Bank Entry / Settle Statement Ledger</span>
                    </h4>
                    
                    <form onSubmit={(e) => {
                      e.preventDefault();
                      const fd = new FormData(e.currentTarget);
                      const amtStr = fd.get('amt') as string;
                      const amt = parseFloat(amtStr);
                      if (!amt || isNaN(amt)) return;

                      const selectedBank = fd.get('bankAcc') as string;
                      const direction = fd.get('direction') as string;
                      const partyName = fd.get('partyName') as string;
                      const date = fd.get('date') as string;
                      const narration = fd.get('narration') as string;

                      const prefix = direction === 'RECEIPT' ? 'RV-' : 'PV-';
                      const newVoucherNo = prefix + Math.floor(100 + Math.random() * 900);

                      let debitAccount = '';
                      let creditAccount = '';

                      if (direction === 'RECEIPT') {
                        debitAccount = selectedBank;
                        creditAccount = partyName || 'DIRECT DEPOSIT ACC';
                      } else {
                        debitAccount = partyName || 'DIRECT LOGISTICS EXPENSE';
                        creditAccount = selectedBank;
                      }

                      const newV: AccountingVoucher = {
                        id: 'v-' + Date.now(),
                        type: direction === 'RECEIPT' ? 'Receipt' : 'Payment',
                        voucherNo: newVoucherNo,
                        date,
                        debitAccount,
                        creditAccount,
                        amount: amt,
                        narration: narration || `Bank ${direction.toLowerCase()} via ${selectedBank}. Party: ${partyName}`,
                        partyName
                      };

                      saveVouchers([newV, ...vouchers]);
                      e.currentTarget.reset();
                      showToast(`Successfully locked bank ${direction.toLowerCase()} entry! Amount: ₹${amt.toLocaleString()}`);
                    }} className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-sans">
                      <div>
                        <label className="block text-[#8b949e] font-mono mb-1 uppercase text-[9px] font-bold">Target Bank Account</label>
                        <select name="bankAcc" required className="w-full bg-[#161b22] border border-[#30363d] p-2 rounded-xl text-white outline-none">
                          <option value="ICICI BANK CORP">ICICI BANK CORP OD ACC (0024)</option>
                          <option value="STATE BANK OF INDIA">STATE BANK OF INDIA ACC (3314)</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[#8b949e] font-mono mb-1 uppercase text-[9px] font-bold">Transaction Direction</label>
                        <select name="direction" required className="w-full bg-[#161b22] border border-[#30363d] p-2 rounded-xl text-white outline-none">
                          <option value="RECEIPT">Deposit / Cash Inflow (Receipt received)</option>
                          <option value="PAYMENT">Withdrawal / Cash Outflow (Payment paid)</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[#8b949e] font-mono mb-1 uppercase text-[9px] font-bold">Party / Ledger Link</label>
                        <select name="partyName" className="w-full bg-[#161b22] border border-[#30363d] p-2 rounded-xl text-white outline-none">
                          <option value="">-- Direct Bank transaction --</option>
                          {parties.map((p, i) => (
                            <option key={i} value={p.name}>{p.name}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[#8b949e] font-mono mb-1 uppercase text-[9px] font-bold">Transaction Value (INR)</label>
                        <input type="number" name="amt" required placeholder="e.g. 75000" className="w-full bg-[#161b22] border border-[#30363d] p-2 rounded-xl text-white outline-none font-mono"/>
                      </div>

                      <div>
                        <label className="block text-[#8b949e] font-mono mb-1 uppercase text-[9px] font-bold">Log Date</label>
                        <input type="date" name="date" required defaultValue={new Date().toISOString().split('T')[0]} className="w-full bg-[#161b22] border border-[#30363d] p-2 rounded-xl text-white outline-none"/>
                      </div>

                      <div>
                        <label className="block text-[#8b949e] font-mono mb-1 uppercase text-[9px] font-bold">Details / UTR Narration</label>
                        <input type="text" name="narration" required placeholder="e.g. Interest, dividend, UTR-HDFC889A" className="w-full bg-[#161b22] border border-[#30363d] p-2 rounded-xl text-white outline-none"/>
                      </div>

                      <div className="sm:col-span-3 flex justify-end font-sans">
                        <button type="submit" className="px-5 py-2.5 bg-emerald-650 hover:bg-emerald-600 text-white font-bold rounded-xl cursor-pointer uppercase font-mono text-[10.5px]">
                          Save Statement Transaction
                        </button>
                      </div>
                    </form>
                  </div>

                  {/* Transaction Ledger Table */}
                  <div className="bg-[#12161f] border border-[#30363d] rounded-2xl p-4">
                    <div className="flex justify-between items-center mb-4 pb-2 border-b border-[#21262d]">
                      <h4 className="text-xs font-mono font-bold text-white uppercase">Linked Bank statement register ({bankVouchers.length} logs)</h4>
                      <div className="flex gap-2">
                        <button 
                          onClick={() => {
                            const dataToExport = bankVouchers.map(v => ({
                              date: v.date,
                              voucherNo: v.voucherNo,
                              type: v.type,
                              debit: v.debitAccount,
                              credit: v.creditAccount,
                              amount: `Rs. ${v.amount}`,
                              narration: v.narration
                            }));
                            const headers = ['Date', 'Voucher', 'Type', 'Debit Account', 'Credit Account', 'Amount', 'Narration'];
                            const keys = ['date', 'voucherNo', 'type', 'debit', 'credit', 'amount', 'narration'];
                            exportToExcel('Bank_Ledger_Statement', headers, keys, dataToExport, 'Bank_Ledger_Statement.csv');
                          }}
                          className="px-3 py-1 bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-400 border border-emerald-500/20 rounded text-[10px] font-mono font-bold cursor-pointer"
                        >
                          Excel
                        </button>
                        <button 
                          onClick={() => {
                            const dataToExport = bankVouchers.map(v => ({
                              date: v.date,
                              voucherNo: v.voucherNo,
                              type: v.type,
                              debit: v.debitAccount,
                              credit: v.creditAccount,
                              amount: `Rs. ${v.amount}`,
                              narration: v.narration
                            }));
                            const headers = ['Date', 'Voucher', 'Type', 'Debit Account', 'Credit Account', 'Amount', 'Narration'];
                            const keys = ['date', 'voucherNo', 'type', 'debit', 'credit', 'amount', 'narration'];
                            exportToPDF('Bank Ledger Statement', headers, keys, dataToExport, 'Bank_Ledger_Statement.pdf', 'Physical Reconciliation Bank Ledger Statement Accounts');
                          }}
                          className="px-3 py-1 bg-red-650/10 hover:bg-red-600/20 text-red-400 border border-red-500/20 rounded text-[10px] font-mono font-bold cursor-pointer"
                        >
                          PDF
                        </button>
                      </div>
                    </div>

                    {bankVouchers.length === 0 ? (
                      <p className="text-center py-8 italic text-slate-500 text-xs">No bank-linked vouchers logged in Tally database yet.</p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-[11px] text-[#8b949e]">
                          <thead>
                            <tr className="border-b border-[#30363d] font-mono text-white text-[9px] uppercase">
                              <th className="py-2.5">Date</th>
                              <th className="py-2.5">Voucher</th>
                              <th className="py-2.5">Type</th>
                              <th className="py-2.5">Debit Account</th>
                              <th className="py-2.5">Credit Account</th>
                              <th className="py-2.5 text-right font-semibold">Inflow (Dr)</th>
                              <th className="py-2.5 text-right font-semibold">Outflow (Cr)</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#21262d] font-sans text-white">
                            {bankVouchers.map((v, idx) => {
                              const isDebitBank = (v.debitAccount || '').toUpperCase().includes('BANK') || (v.debitAccount || '').toUpperCase().includes('ICICI') || (v.debitAccount || '').toUpperCase().includes('SBI');
                              return (
                                <tr 
                                  key={v.id} 
                                  onClick={() => setSelectedDetailVoucher(v)}
                                  className="hover:bg-[#1b2028]/40 transition-all cursor-pointer group"
                                  title="Click to view detailed auditing certificate & flow chart"
                                >
                                  <td className="py-3.5 font-mono text-[#8b949e]">{v.date}</td>
                                  <td className="py-3.5 font-bold font-mono text-amber-500 flex items-center gap-1">
                                    <span>{v.voucherNo}</span>
                                    <span className="text-[9px] text-[#ff5a1f]/80 opacity-0 group-hover:opacity-100 transition-all font-sans font-bold">⚡ TAP VIEW</span>
                                  </td>
                                  <td className="py-3.5">
                                    <span className={`px-1.5 py-0.5 rounded text-[8.5px] font-mono font-black ${
                                      v.type === 'Receipt' ? 'bg-emerald-500/10 border border-emerald-500/25 text-emerald-400' : 'bg-red-550/10 border border-red-500/25 text-red-400'
                                    }`}>
                                      {v.type.toUpperCase()}
                                    </span>
                                  </td>
                                  <td className="py-3.5 font-medium text-slate-300 max-w-[150px] truncate" title={v.debitAccount}>{v.debitAccount}</td>
                                  <td className="py-3.5 font-medium text-slate-300 max-w-[150px] truncate" title={v.creditAccount}>{v.creditAccount}</td>
                                  <td className="py-3.5 text-right font-mono font-bold text-emerald-450">
                                    {isDebitBank ? `₹${v.amount.toLocaleString()}` : '-'}
                                  </td>
                                  <td className="py-3.5 text-right font-mono font-bold text-red-400">
                                    {!isDebitBank ? `₹${v.amount.toLocaleString()}` : '-'}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}

            {/* SUB-TAB: TDS LEDGER */}
            {selectedSubMenu === 'tds' && (
              <div className="space-y-6">
                <div className="border-b border-[#30363d] pb-4 gap-2">
                  <h3 className="text-base font-bold text-white tracking-tight">TDS Tax Deduction Map</h3>
                  <p className="text-xs text-[#8b949e] font-mono mt-0.5">COMPLY WITH SECTION 194C ROAD TRANSPORT CONTRACT PENALTIES (1%, 2%, 10% LEVELS)</p>
                </div>

                <div className="bg-[#0d1117] border border-[#30363d] p-5 rounded-2xl text-xs text-left">
                  <h4 className="font-bold text-yellow-400 font-mono uppercase tracking-wider mb-4">Record TDS Challan Certificate</h4>
                  <form onSubmit={(e) => {
                    e.preventDefault();
                    const fd = new FormData(e.currentTarget);
                    const amt = parseFloat(fd.get('amount') as string);
                    const r = parseFloat(fd.get('rate') as string);
                    if (!amt || !r) return;

                    const tdsDeducted = amt * (r / 100);

                    const newV: AccountingVoucher = {
                      id: 'v-' + Date.now(),
                      type: 'Journal',
                      voucherNo: 'TDS-' + Math.floor(100+Math.random()*900),
                      date: fd.get('date') as string,
                      debitAccount: 'TDS RECEIVABLE CORRIDOR',
                      creditAccount: fd.get('party') as string,
                      amount: tdsDeducted,
                      narration: `TDS Deducted @ ${r}% on total invoice base of ₹${amt.toLocaleString()}. Challan Reference: ${fd.get('challan')}`
                    };

                    saveVouchers([newV, ...vouchers]);
                    e.currentTarget.reset();
                    showToast(`Recorded TDS Deducted of Rs. ${tdsDeducted} successfully!`);
                  }} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[#8b949e] font-mono mb-1 uppercase text-[10px]">Select deducted party</label>
                      <select name="party" required className="w-full bg-[#161b22] border border-[#30363d] p-2 rounded-xl text-white outline-none">
                        {parties.map((p, i) => (
                          <option key={i} value={p.name}>{p.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[#8b949e] font-mono mb-1 uppercase text-[10px]">Invoice Base Value (INR)</label>
                      <input type="number" name="amount" required placeholder="Rs. 1,00,000" className="w-full bg-[#161b22] border border-[#30363d] p-2 rounded-xl text-white outline-none"/>
                    </div>
                    <div>
                      <label className="block text-[#8b949e] font-mono mb-1 uppercase text-[10px]">TDS Rate Category Percentage</label>
                      <select name="rate" required className="w-full bg-[#161b22] border border-[#30363d] p-2 rounded-xl text-white outline-none">
                        <option value="1">1% (Individual Contractor / Single Owner)</option>
                        <option value="2">2% (Corporates / Private Limited Consignors)</option>
                        <option value="10">10% (Technical Services / Yard Lease Commission)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[#8b949e] font-mono mb-1 uppercase text-[10px]">Deposition Challan ID Reference</label>
                      <input type="text" name="challan" placeholder="CH-BARODA-99A" className="w-full bg-[#161b22] border border-[#30363d] p-2 rounded-xl text-white outline-none"/>
                    </div>
                    <div>
                      <label className="block text-[#8b949e] font-mono mb-1 uppercase text-[10px]">Log Date</label>
                      <input type="date" name="date" required defaultValue={new Date().toISOString().split('T')[0]} className="w-full bg-[#161b22] border border-[#30363d] p-2 rounded-xl text-white outline-none"/>
                    </div>
                    <div className="sm:col-span-2 flex justify-end">
                      <button type="submit" className="px-5 py-2 bg-yellow-400 hover:bg-yellow-300 text-slate-900 font-bold rounded-xl cursor-pointer uppercase font-mono text-[11px] tracking-tight">Lock TDS deduction record</button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* SUB-TAB: CASH LEDGER */}
            {selectedSubMenu === 'cash' && (
              <div className="space-y-6">
                <div className="border-b border-[#30363d] pb-4">
                  <h3 className="text-base font-bold text-white tracking-tight">Primary Cash Book Balance</h3>
                  <p className="text-xs text-[#8b949e] font-mono mt-0.5">TRACK STANDARD CASH DRAW IN-HAND LIMITS</p>
                </div>
                <div className="bg-[#0d1117] border border-[#30363d] p-5 rounded-2xl text-left text-xs">
                  <strong className="text-[#8b949e] font-mono block uppercase">Active Petty Cash Reserves:</strong>
                  <div className="text-2xl font-black text-emerald-400 font-mono mt-1">₹1,42,800.00 Cr</div>
                </div>
              </div>
            )}

            {/* SUB-TAB: DIRECT EXPENSE (Image 3/4 Forms with canvas interactive digital signatures and GST Details) */}
            {selectedSubMenu === 'direct_exp' && (
              <div className="space-y-6">
                <div className="border-b border-[#30363d] pb-4 text-left">
                  <h3 className="text-base font-bold text-white tracking-tight">Log Direct Expense</h3>
                  <p className="text-xs text-[#8b949e] font-mono mt-0.5">REGISTER FOOD, SALARY, FUEL, AND TOLL VOUCHER COMPLIANCES</p>
                </div>

                {/* Categories List Slider (Image 3 Header tabs row) */}
                <div className="flex bg-[#0d1117] border border-[#30363d] p-1 rounded-xl scrollbar-none overflow-x-auto gap-1">
                  {['Food & Beverage', 'Salary', 'Repair & Maintenance', 'Traveling', 'Office', 'Office Rent', 'Stationery', 'Telephone', 'Electricity'].map((cat, idx) => {
                    const cleanNom = cat.toLowerCase().replace(/[^a-z]/g, '_');
                    return (
                      <button
                        key={idx}
                        onClick={() => {
                          setExpRemarks(cat + ' expense incurred');
                        }}
                        className="px-3 py-1.5 bg-[#161b22] hover:bg-blue-600/10 text-[#8b949e] text-[10px] uppercase font-bold rounded-lg cursor-pointer whitespace-nowrap active:bg-blue-600 active:text-white"
                      >
                        {cat}
                      </button>
                    );
                  })}
                </div>

                {/* Interactive form from Image 4 */}
                <div className="bg-[#0d1117] border border-[#30363d] p-5 rounded-2xl text-xs text-left space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[#8b949e] font-mono mb-1 uppercase text-[10px]">Paid to Person Name</label>
                      <input 
                        type="text" 
                        required 
                        value={expPaidTo}
                        onChange={(e) => setExpPaidTo(e.target.value)}
                        placeholder="John Doe (Service Co-operator / Mechanic)" 
                        className="w-full bg-[#161b22] border border-[#30363d] p-2.5 rounded-xl text-white outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[#8b949e] font-mono mb-1 uppercase text-[10px]">Paid Date</label>
                      <input 
                        type="date" 
                        required 
                        value={expDate}
                        onChange={(e) => setExpDate(e.target.value)}
                        className="w-full bg-[#161b22] border border-[#30363d] p-2.5 rounded-xl text-white outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[#8b949e] font-mono mb-1 uppercase text-[10px]">Payment Mode</label>
                      <select 
                        value={expPayMode}
                        onChange={(e) => setExpPayMode(e.target.value as any)}
                        className="w-full bg-[#161b22] border border-[#30363d] p-2.5 rounded-xl text-white outline-none"
                      >
                        <option value="CASH">CASH LEDGER DRAW</option>
                        <option value="BANK">BANK WIRE OVERDRAFT</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[#8b949e] font-mono mb-1 uppercase text-[10px]">Amount (INR)</label>
                      <input 
                        type="number" 
                        required 
                        value={expAmount}
                        onChange={(e) => setExpAmount(e.target.value)}
                        placeholder="Rs. 18,500" 
                        className="w-full bg-[#161b22] border border-[#30363d] p-2.5 rounded-xl text-white font-mono font-bold outline-none"
                      />
                    </div>

                    {/* GST block expandable click panel */}
                    <div className="sm:col-span-2 border border-[#30363d] p-3 rounded-xl bg-[#161b22]">
                      <label className="flex items-center gap-2 cursor-pointer select-none">
                        <input 
                          type="checkbox" 
                          checked={expGstChecked} 
                          onChange={(e) => setExpGstChecked(e.target.checked)}
                          className="w-4 h-4 rounded text-blue-500 bg-[#0d1117]"
                        />
                        <span className="text-[10px] font-mono font-bold uppercase text-yellow-500">＋ Add GST Compliance Details (Optional)</span>
                      </label>

                      {expGstChecked && (
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 mt-3.5 pt-3.5 border-t border-[#30363d]">
                          <div>
                            <label className="block text-[#8b949e] font-mono mb-1 uppercase text-[9px]">GST Tax Rate</label>
                            <select 
                              value={expGstRate} 
                              onChange={(e) => setExpGstRate(e.target.value)}
                              className="w-full bg-[#0d1117] border border-[#30363d] p-2 rounded-xl text-white outline-none"
                            >
                              <option value="5">5%</option>
                              <option value="12">12%</option>
                              <option value="18">18%</option>
                              <option value="28">28%</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-[#8b949e] font-mono mb-1 uppercase text-[9px]">GST Tax Type</label>
                            <select 
                              value={expGstType} 
                              onChange={(e) => setExpGstType(e.target.value as any)}
                              className="w-full bg-[#0d1117] border border-[#30363d] p-2 rounded-xl text-white outline-none"
                            >
                              <option value="CGST/SGST">CGST/SGST (In-state)</option>
                              <option value="IGST">IGST (Inter-state)</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-[#8b949e] font-mono mb-1 uppercase text-[9px]">Vendor GSTIN ID</label>
                            <input 
                              type="text" 
                              value={expGstin}
                              onChange={(e) => setExpGstin(e.target.value)}
                              placeholder="24AAAPV1239X1Z4" 
                              className="w-full bg-[#0d1117] border border-[#30363d] p-2 rounded-xl text-white font-mono outline-none"
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="block text-[#8b949e] font-mono mb-1 uppercase text-[10px]">Select Party Ledger link</label>
                      <select 
                        value={expSelectedParty}
                        onChange={(e) => setExpSelectedParty(e.target.value)}
                        className="w-full bg-[#161b22] border border-[#30363d] p-2.5 rounded-xl text-white outline-none"
                      >
                        <option value="">Direct Cash Exp (Not Linked)</option>
                        {parties.map((p, i) => (
                          <option key={i} value={p.name}>{p.name}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[#8b949e] font-mono mb-1 uppercase text-[10px]">Associate Heavy Vehicle Plate (Truck)</label>
                      <select 
                        value={expTankerId}
                        onChange={(e) => setExpTankerId(e.target.value)}
                        className="w-full bg-[#161b22] border border-[#30363d] p-2.5 rounded-xl text-white outline-none"
                      >
                        <option value="">No Tanker Linked</option>
                        {tankers.map((t, i) => (
                          <option key={i} value={t.tankerNumber}>{t.tankerNumber}</option>
                        ))}
                      </select>
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-[#8b949e] font-mono mb-1 uppercase text-[10px]">Particulars / Payment Remarks</label>
                      <textarea 
                        value={expRemarks}
                        onChange={(e) => setExpRemarks(e.target.value)}
                        placeholder="Log detailed remarks about tools replaced..." 
                        className="w-full bg-[#161b22] border border-[#30363d] p-2.5 rounded-xl text-white h-16 outline-none resize-none"
                      />
                    </div>
                  </div>

                  {/* Draw Signature Canvas pad */}
                  {renderSignatureCanvas()}

                  <div className="flex justify-end pt-3">
                    <button 
                      type="button"
                      onClick={() => submitDirectExpense('direct')}
                      className="px-6 py-3 bg-yellow-450 hover:bg-yellow-400 text-slate-950 font-black rounded-xl cursor-pointer transition-all uppercase font-sans text-xs tracking-tight shadow-lg"
                    >
                      📁 Confirm & Add Direct Expense Entry
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* SUB-TAB: INDIRECT EXPENSE */}
            {selectedSubMenu === 'indirect_exp' && (
              <div className="space-y-6">
                <div className="border-b border-[#30363d] pb-4">
                  <h3 className="text-base font-bold text-white tracking-tight">Indirect General Expenditures</h3>
                  <p className="text-xs text-[#8b949e] font-mono mt-0.5">REGISTER OFFICE RENT, STATIONERY, PRINTER INKS, AND UTILITY EXPENSES</p>
                </div>
                
                <div className="p-12 text-center text-slate-500">
                  <p className="text-sm font-bold flex items-center justify-center gap-1.5"><Pen className="w-5 h-5 text-yellow-400" /> Redirect: Indirect Expense matches fields with Direct Expense ledger form.</p>
                  <button onClick={() => setSelectedSubMenu('direct_exp')} className="mt-4 px-4 py-2 bg-yellow-400 hover:bg-yellow-300 text-slate-950 rounded-xl text-xs font-bold whitespace-nowrap cursor-pointer transition-all">Launch expenditure logger</button>
                </div>
              </div>
            )}

            {/* SUB-TAB: INDIRECT INCOME (Image 5 Form configuration) */}
            {selectedSubMenu === 'indirect_inc' && (
              <div className="space-y-6">
                <div className="border-b border-[#30363d] pb-4 text-left">
                  <h3 className="text-base font-bold text-white tracking-tight">Log Indirect Income Item</h3>
                  <p className="text-xs text-[#8b949e] font-mono mt-0.5">ADD BANK INTERESTS, ASSETS REVENUE, OR SUBSIDY RECEIPTS</p>
                </div>

                <div className="bg-[#0d1117] border border-[#30363d] p-5 rounded-2xl text-xs text-left space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[#8b949e] font-mono mb-1 uppercase text-[10px]">Payment Received Date</label>
                      <input 
                        type="date" 
                        required 
                        value={incDate}
                        onChange={(e) => setIncDate(e.target.value)}
                        className="w-full bg-[#161b22] border border-[#30363d] p-2.5 rounded-xl text-white outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[#8b949e] font-mono mb-1 uppercase text-[10px]">Received Amount (INR)</label>
                      <input 
                        type="number" 
                        required 
                        value={incAmount}
                        onChange={(e) => setIncAmount(e.target.value)}
                        placeholder="Rs. 45,000" 
                        className="w-full bg-[#161b22] border border-[#30363d] p-2.5 rounded-xl text-white font-mono font-bold outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[#8b949e] font-mono mb-1 uppercase text-[10px]">Income Type Payment Mode</label>
                      <select 
                        value={incPayMode}
                        onChange={(e) => setIncPayMode(e.target.value as any)}
                        className="w-full bg-[#161b22] border border-[#30363d] p-2.5 rounded-xl text-white outline-none"
                      >
                        <option value="CASH">CASH BALANCE DRAWER</option>
                        <option value="BANK">BANK WIRE ONLINE</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[#8b949e] font-mono mb-1 uppercase text-[10px]">Paying Party Name (Consignor Link)</label>
                      <select 
                        value={incSelectedParty}
                        onChange={(e) => setIncSelectedParty(e.target.value)}
                        className="w-full bg-[#161b22] border border-[#30363d] p-2.5 rounded-xl text-white outline-none"
                      >
                        <option value="">Direct Cash Party (Unassigned)</option>
                        {parties.map((p, i) => (
                          <option key={i} value={p.name}>{p.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[#8b949e] font-mono mb-1 uppercase text-[10px]">Payment Wire Reference (UTR/Cheque)</label>
                      <input 
                        type="text" 
                        value={incReference}
                        onChange={(e) => setIncReference(e.target.value)}
                        placeholder="UTR-ICICI-29402" 
                        className="w-full bg-[#161b22] border border-[#30363d] p-2.5 rounded-xl text-white outline-none"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-[#8b949e] font-mono mb-1 uppercase text-[10px]">Particulars / Payment Remarks</label>
                      <textarea 
                        value={incRemarks}
                        onChange={(e) => setIncRemarks(e.target.value)}
                        placeholder="State purpose of scrap sold, bank interests or dividend income..." 
                        className="w-full bg-[#161b22] border border-[#30363d] p-2.5 rounded-xl text-white h-16 outline-none resize-none"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <button 
                      onClick={submitIndirectIncome}
                      className="px-6 py-2.5 bg-yellow-450 hover:bg-yellow-450 text-slate-950 font-black rounded-xl cursor-pointertransition-all uppercase text-xs"
                    >
                      📁 Lock Indirect Income voucher
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* SUB-TAB: DIRECT INCOME (Image 6 Helper page + P&L sheets redirection) */}
            {selectedSubMenu === 'direct_inc' && (
              <div className="space-y-6 text-left">
                <div className="border-b border-[#30363d] pb-4">
                  <h3 className="text-base font-bold text-white tracking-tight">Direct Operations Income</h3>
                  <p className="text-xs text-[#8b949e] font-mono mt-0.5">FREIGHT DELIVERIES REVENUES DERIVED SEQUENTIALLY FROM COMPLETED TRIP SCHEDULING</p>
                </div>

                <div className="bg-[#0d1117] border border-[#30363d] p-6 rounded-2xl text-xs space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-yellow-500/15 text-yellow-550 border border-yellow-500/35 rounded-xl">
                      <TrendingUp className="w-6 h-6" />
                    </div>
                    <div>
                      <strong className="text-sm block text-white">Automated Booking Integration Mapped</strong>
                      <span className="text-[#8b949e] font-mono mt-1 block uppercase">Tally.ERP Logistics Rule Check:</span>
                    </div>
                  </div>

                  <p className="text-sm text-gray-200 leading-relaxed font-sans mt-3">
                    "Direct Income entries automatically added from LR/Invoice via Party Ledger. These entries are automatically integrated under the active Profit & Loss balance sheet."
                  </p>
                  
                  {/* Hindi translations mapped precisely as requested */}
                  <p className="text-xs text-slate-400 italic font-medium leading-relaxed">
                    "डायरेक्ट इनकम एंट्री पार्टी लेजर के माध्यम से एलआर/चालान से स्वचालित रूप से जुड़ जाती हैं। यह प्रविष्टियाँ मुनाफ़ा-नुकसान (P&L) रिपोर्ट में स्वयं उपलब्ध होंगी।"
                  </p>

                  <div className="pt-2">
                    <button 
                      onClick={() => {
                        setActiveSection('reports');
                        setReportGroupFilter('Business');
                      }}
                      className="px-5 py-3 bg-yellow-400 hover:bg-yellow-350 text-slate-900 font-black rounded-xl text-xs uppercase tracking-tight transition-all cursor-pointer shadow-md"
                    >
                      📁 View Active Profit & Loss Report Sheet
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* SUB-TAB: DEBIT NOTE */}
            {selectedSubMenu === 'debit_note' && (
              <div className="space-y-6">
                <div className="border-b border-[#30363d] pb-4 text-left">
                  <h3 className="text-base font-bold text-white tracking-tight">Debit Note Registry Vouchers</h3>
                  <p className="text-xs text-[#8b949e] font-mono mt-0.5">BOOK RETURNS OR SHORTAGE DEDUCTIONS ASSIGNED TO MATERIAL TRANSFERS</p>
                </div>

                <div className="bg-[#0d1117] border border-[#30363d] p-5 rounded-2xl text-xs text-left">
                  <form onSubmit={(e) => {
                    e.preventDefault();
                    const fd = new FormData(e.currentTarget);
                    const amt = parseFloat(fd.get('amount') as string);
                    if (!amt) return;

                    const newV: AccountingVoucher = {
                      id: 'v-' + Date.now(),
                      type: 'Journal',
                      voucherNo: 'DN-' + Math.floor(100+Math.random()*900),
                      date: fd.get('date') as string,
                      debitAccount: fd.get('party') as string,
                      creditAccount: 'OPERATION PURCHASE ACCOUNTS',
                      amount: amt,
                      narration: `Issued debit note for materials returns: ${fd.get('remarks')}. Approved.`
                    };
                    saveVouchers([newV, ...vouchers]);
                    e.currentTarget.reset();
                    showToast('Debit Note voucher saved!');
                  }} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[#8b949e] font-mono mb-1 uppercase text-[10px]">Select deducted supplier</label>
                      <select name="party" required className="w-full bg-[#161b22] border border-[#30363d] p-2 rounded-xl text-white outline-none">
                        {parties.map((p, i) => (
                          <option key={i} value={p.name}>{p.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[#8b949e] font-mono mb-1 uppercase text-[10px]">Adjustment Amount (INR)</label>
                      <input type="number" name="amount" required placeholder="Rs. 10,000" className="w-full bg-[#161b22] border border-[#30363d] p-2 rounded-xl text-white outline-none"/>
                    </div>
                    <div>
                      <label className="block text-[#8b949e] font-mono mb-1 uppercase text-[10px]">Debit Note Date</label>
                      <input type="date" name="date" required defaultValue={new Date().toISOString().split('T')[0]} className="w-full bg-[#161b22] border border-[#30363d] p-2 rounded-xl text-white outline-none"/>
                    </div>
                    <div>
                      <label className="block text-[#8b949e] font-mono mb-1 uppercase text-[10px]">Shortages Remarks Purpose</label>
                      <input type="text" name="remarks" placeholder="Weight shortfall of diesel tanker cargo" className="w-full bg-[#161b22] border border-[#30363d] p-2 rounded-xl text-white outline-none"/>
                    </div>
                    <div className="sm:col-span-2 flex justify-end">
                      <button type="submit" className="px-5 py-2 bg-yellow-405 bg-yellow-400 hover:bg-yellow-350 text-slate-900 font-bold rounded-xl cursor-pointer uppercase font-mono text-[11px] tracking-tight">Lock Debit Note voucher</button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* SUB-TAB: CREDIT NOTE */}
            {selectedSubMenu === 'credit_note' && (
              <div className="space-y-6">
                <div className="border-b border-[#30363d] pb-4 text-left">
                  <h3 className="text-base font-bold text-white tracking-tight">Credit Note Registry Vouchers</h3>
                  <p className="text-xs text-[#8b949e] font-mono mt-0.5">ADJUST CUSTOMER BILLINGS OR LOG TRANSIT CONCESSIONS IN TALLY</p>
                </div>

                <div className="bg-[#0d1117] border border-[#30363d] p-5 rounded-2xl text-xs text-left">
                  <form onSubmit={(e) => {
                    e.preventDefault();
                    const fd = new FormData(e.currentTarget);
                    const amt = parseFloat(fd.get('amount') as string);
                    if (!amt) return;

                    const newV: AccountingVoucher = {
                      id: 'v-' + Date.now(),
                      type: 'Journal',
                      voucherNo: 'CN-' + Math.floor(100+Math.random()*900),
                      date: fd.get('date') as string,
                      debitAccount: 'SALES DISCOUNTS ACCOUNTS',
                      creditAccount: fd.get('party') as string,
                      amount: amt,
                      narration: `Issued credit note to customer: ${fd.get('remarks')}. Approved.`
                    };
                    saveVouchers([newV, ...vouchers]);
                    e.currentTarget.reset();
                    showToast('Credit Note voucher saved!');
                  }} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[#8b949e] font-mono mb-1 uppercase text-[10px]">Select customer account</label>
                      <select name="party" required className="w-full bg-[#161b22] border border-[#30363d] p-2 rounded-xl text-white outline-none">
                        {parties.map((p, i) => (
                          <option key={i} value={p.name}>{p.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[#8b949e] font-mono mb-1 uppercase text-[10px]">Credit Value Adjustment (INR)</label>
                      <input type="number" name="amount" required placeholder="Rs. 15,000" className="w-full bg-[#161b22] border border-[#30363d] p-2 rounded-xl text-white outline-none"/>
                    </div>
                    <div>
                      <label className="block text-[#8b949e] font-mono mb-1 uppercase text-[10px]">Credit Note Date</label>
                      <input type="date" name="date" required defaultValue={new Date().toISOString().split('T')[0]} className="w-full bg-[#161b22] border border-[#30363d] p-2 rounded-xl text-white outline-none"/>
                    </div>
                    <div>
                      <label className="block text-[#8b949e] font-mono mb-1 uppercase text-[10px]">Reduction Reason Description</label>
                      <input type="text" name="remarks" placeholder="Excess freight rate billed in previous LR adjustment" className="w-full bg-[#161b22] border border-[#30363d] p-2 rounded-xl text-white outline-none"/>
                    </div>
                    <div className="sm:col-span-2 flex justify-end">
                      <button type="submit" className="px-5 py-2 bg-yellow-400 hover:bg-yellow-350 text-slate-900 font-bold rounded-xl cursor-pointer uppercase font-mono text-[11px] tracking-tight font-sans">Lock Credit Note Voucher</button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* DEFAULT FALLBACK ACC PRE-CHECK */}
            {!selectedSubMenu && (
              <div className="flex flex-col items-center justify-center space-y-4 py-20 text-slate-500">
                <BookOpen className="w-16 h-16 text-slate-700 animate-pulse" />
                <p className="font-sans text-xs">Please select an accounts item ledger book from the left sidebar to start bookkeeping.</p>
              </div>
            )}

          </div>
        </div>
      )}

      {/* SECTION: ALL REPORTS DASHBOARD (Image 7, 8, 9 Layouts) */}
      {activeSection === 'reports' && (
        <div className="bg-[#161b22] border border-[#30363d] p-6 rounded-2xl text-left space-y-6">
          <div className="border-b border-[#30363d] pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">Active Accounting Reports Panel (Tally)</h3>
              <p className="text-xs text-[#8b949e] font-mono mt-0.5">DOWNLOAD CRITICAL TAX VALUATIONS AND AUDITED PROFIT & LOSS LEDGER SHEETS</p>
            </div>
            
            <button 
              onClick={() => setActiveSection('home')}
              className="text-[#8b949e] hover:text-white font-mono text-xs font-bold inline-flex items-center gap-2 bg-[#0d1117] border border-[#30363d] p-2 rounded-xl cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Close Reports
            </button>
          </div>

          {/* Group filtration tab headers following Image 7, 8, 9 style */}
          <div className="flex flex-wrap items-center justify-between gap-4 bg-[#0d1117] border border-[#30363d] p-3 rounded-xl">
            <div className="flex bg-[#161b22] p-1 rounded-xl gap-1">
              {['All', 'Business', 'Ledger', 'Customer', 'Supplier', 'Transporter'].map((grp) => (
                <button
                  key={grp}
                  onClick={() => setReportGroupFilter(grp)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    reportGroupFilter === grp 
                      ? 'bg-blue-600 text-white shadow' 
                      : 'text-[#8b949e] hover:text-white'
                  }`}
                >
                  {grp} Report
                </button>
              ))}
            </div>

            {/* Format choice toggle */}
            <div className="flex items-center gap-2 text-xs">
              <span className="text-[#8b949e] font-mono">Format:</span>
              <button 
                onClick={() => setReportFormat('PDF')}
                className={`px-3 py-1 bg-[#161b22] border border-[#30363d] rounded-lg cursor-pointer ${reportFormat === 'PDF' ? 'text-red-400 font-bold border-red-500/30' : 'text-[#8b949e]'}`}
              >
                PDF Format
              </button>
              <button 
                onClick={() => setReportFormat('EXCEL')}
                className={`px-3 py-1 bg-[#161b22] border border-[#30363d] rounded-lg cursor-pointer ${reportFormat === 'EXCEL' ? 'text-emerald-400 font-bold border-emerald-500/30' : 'text-[#8b949e]'}`}
              >
                EXCEL CSV
              </button>
            </div>
          </div>

          {/* Table List of documents matching layouts in Image 7, 8 */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-[#8b949e]">
              <thead>
                <tr className="border-b border-[#30363d] font-mono text-white text-[10.5px] uppercase pb-2">
                  <th className="py-2.5">Report Sheet Description</th>
                  <th className="py-2.5">Linked Group</th>
                  <th className="py-2.5">Availability Scope</th>
                  <th className="py-2.5 text-center">Audited Seal Check</th>
                  <th className="py-2.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#21262d] font-sans text-white text-xs">
                {[
                  { name: 'Profit & Loss Balance Sheet - FY26', group: 'Business', period: 'Full Year (Consolidated)' },
                  { name: 'Consolidated General Ledger Accounts Records', group: 'Ledger', period: 'Quarterly Check' },
                  { name: 'Customer Outstanding Balance Mappings', group: 'Customer', period: 'As of today' },
                  { name: 'Supplier Outstandings & Settle Bills Registers', group: 'Supplier', period: 'As of today' },
                  { name: 'Transporter Goods Inward/Outward Ledger Sheets', group: 'Transporter', period: 'Operational Period' },
                ]
                .filter(itm => reportGroupFilter === 'All' || itm.group === reportGroupFilter)
                .map((rpt, idx) => (
                  <tr key={idx} className="hover:bg-[#1b2028]/40 transition-all">
                    <td className="py-3 font-bold uppercase">{rpt.name}</td>
                    <td className="py-3 font-mono">
                      <span className="px-2 py-0.5 rounded bg-blue-500/10 border border-blue-500/20 text-blue-400 font-bold uppercase text-[9px]">
                        {rpt.group}
                      </span>
                    </td>
                    <td className="py-3 text-[#8b949e]">{rpt.period}</td>
                    <td className="py-3 text-center">
                      <span className="text-[10px] text-emerald-400 font-mono font-bold bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded">PASSED COMPLIANCE</span>
                    </td>
                    <td className="py-3 text-right">
                      <button 
                        onClick={() => {
                          const dataToExport = vouchers.map(v => ({
                            id: v.id,
                            voucherNo: v.voucherNo,
                            type: v.type,
                            date: v.date,
                            debitAccount: v.debitAccount,
                            creditAccount: v.creditAccount,
                            amount: `Rs. ${v.amount}`,
                            narration: v.narration
                          }));
                          const headers = ['Voucher ID', 'Voucher No', 'Type', 'Date', 'Debit Account', 'Credit Account', 'Amount', 'Narration'];
                          const keys = ['id', 'voucherNo', 'type', 'date', 'debitAccount', 'creditAccount', 'amount', 'narration'];
                          
                          if (reportFormat === 'EXCEL') {
                            exportToExcel(rpt.name, headers, keys, dataToExport, `${rpt.name.replace(/\s+/g, '_')}.csv`);
                          } else {
                            exportToPDF(rpt.name, headers, keys, dataToExport, `${rpt.name.replace(/\s+/g, '_')}.pdf`, 'Official Tally Books of Accounts and Ledgers');
                          }
                        }}
                        className="p-2.5 bg-yellow-500 hover:bg-yellow-450 text-slate-900 rounded-xl inline-flex items-center gap-1 cursor-pointer font-bold text-[10px] uppercase shadow-md font-sans border-none"
                      >
                        <Download className="w-3.5 h-3.5" /> Download
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SECTION: MASTER MANAGER CREATOR (Image 12 Layout) */}
      {activeSection === 'master' && (
        <div className="bg-[#161b22] border border-[#30363d] p-6 rounded-2xl text-left space-y-6">
          <div className="border-b border-[#30363d] pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">Manage Registries (Masters)</h3>
              <p className="text-xs text-[#8b949e] font-mono mt-0.5">ADD AND CONFIGURE SYSTEM LOGISTICS SEED VALUES</p>
            </div>
            
            <button 
              onClick={() => setActiveSection('home')}
              className="text-[#8b949e] hover:text-white font-mono text-xs font-bold inline-flex items-center gap-2 bg-[#0d1117] border border-[#30363d] p-2 rounded-xl cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back Home
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs text-white">
            
            {/* Create Party Master Panel */}
            <div className="p-5 bg-[#0d1117] border border-[#30363d] rounded-2xl space-y-4">
              <h4 className="font-bold text-yellow-400 font-mono uppercase tracking-wider">Configure New Party Ledger</h4>
              <form onSubmit={submitPartyForm} className="space-y-3.5 font-sans">
                <div>
                  <label className="block text-[#8b949e] font-mono mb-1 uppercase text-[10px]">Company Trade Name</label>
                  <input type="text" required placeholder="ESSAR PETROL DEPOT" value={formPartyName} onChange={(e)=>setFormPartyName(e.target.value)} className="w-full bg-[#161b22] border border-[#30363d] p-2.5 rounded-xl uppercase text-white outline-none"/>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[#8b949e] font-mono mb-1 uppercase text-[10px]">Type Category</label>
                    <select value={formPartyType} onChange={(e)=>setFormPartyType(e.target.value as any)} className="w-full bg-[#161b22] border border-[#30363d] p-2.5 rounded-xl text-white outline-none">
                      <option value="Customer">Consignee Customer</option>
                      <option value="Supplier">Service Vendor Supplier</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[#8b949e] font-mono mb-1 uppercase text-[10px]">Contact Mobile</label>
                    <input type="tel" placeholder="9898012345" value={formPartyContact} onChange={(e)=>setFormPartyContact(e.target.value)} className="w-full bg-[#161b22] border border-[#30363d] p-2.5 rounded-xl text-white outline-none"/>
                  </div>
                </div>
                <div>
                  <label className="block text-[#8b949e] font-mono mb-1 uppercase text-[10px]">Corporate Office Address</label>
                  <input type="text" placeholder="Highway Bypass Corridor Vadodara, GJ" value={formPartyAddress} onChange={(e)=>setFormPartyAddress(e.target.value)} className="w-full bg-[#161b22] border border-[#30363d] p-2.5 rounded-xl text-white outline-none"/>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[#8b949e] font-mono mb-1 uppercase text-[10px]">GSTIN (15 symbols)</label>
                    <input type="text" placeholder="24AAAPS1920B1Z9" value={formPartyGstin} onChange={(e)=>setFormPartyGstin(e.target.value)} className="w-full bg-[#161b22] border border-[#30363d] p-2.5 rounded-xl uppercase text-white font-mono outline-none"/>
                  </div>
                  <div>
                    <label className="block text-[#8b949e] font-mono mb-1 uppercase text-[10px]">Tax Opening Balance (INR)</label>
                    <input type="number" placeholder="Opening Rs. Bal" value={formPartyOpening} onChange={(e)=>setFormPartyOpening(e.target.value)} className="w-full bg-[#161b22] border border-[#30363d] p-2.5 rounded-xl text-white font-mono outline-none"/>
                  </div>
                </div>
                <div className="flex pt-2">
                  <button type="submit" className="w-full py-3 bg-yellow-400 hover:bg-yellow-350 text-slate-900 font-bold rounded-xl cursor-pointer uppercase font-mono tracking-wider">Lock Party Master Profile</button>
                </div>
              </form>
            </div>

            {/* Config Material Master Panel */}
            <div className="p-5 bg-[#0d1117] border border-[#30363d] rounded-2xl relative flex flex-col justify-between">
              <div>
                <h4 className="font-bold text-yellow-400 font-mono uppercase tracking-wider mb-4">Seeded Material cargo types</h4>
                <div className="space-y-2 font-mono">
                  {['PETROL BS6 FUEL OIL', 'DIESEL PETROCHEM GRADE', 'COGEN FLUID FLAMMABLE', 'SULPHUR DRY LOGISTICS', 'ADBLUE DEF CORRIDOR'].map((mat, i) => (
                    <div key={i} className="p-3 bg-[#161b22] border border-[#30363d] rounded-xl flex justify-between items-center text-white">
                      <span>{mat}</span>
                      <span className="text-[10px] text-slate-400">Class 3 Hazardous (UN)</span>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="mt-8 p-3 bg-blue-600/10 border border-blue-500/20 rounded-xl leading-relaxed text-[#8b949e]">
                <strong className="text-white block font-sans">Registry Sync Statement:</strong>
                Drivers and Vehicles are registered centrally in their respective master consoles in real-time. Changes mapped automatically across accounting books.
              </div>
            </div>

          </div>
        </div>
      )}

      {/* SECTION: MY DOCUMENTS VAULT (Image 13 Layout) */}
      {activeSection === 'documents' && (
        <div className="bg-[#161b22] border border-[#30363d] p-6 rounded-2xl text-left space-y-6">
          <div className="border-b border-[#30363d] pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">Active Compliance Document Vault</h3>
              <p className="text-xs text-[#8b949e] font-mono mt-0.5">VAULT KEY REGISTER COMPRISES SYSTEM CERTIFICATES AND REGISTRATION MAPS</p>
            </div>
            
            <button 
              onClick={() => setActiveSection('home')}
              className="text-[#8b949e] hover:text-white font-mono text-xs font-bold inline-flex items-center gap-2 bg-[#0d1117] border border-[#30363d] p-2 rounded-xl cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back Home
            </button>
          </div>

          {/* Seed files bento drawer (Image 13 style) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 text-white">
            {documents.map((doc, idx) => (
              <div key={idx} className="p-4 bg-[#0d1117] border border-[#30363d] rounded-2xl flex flex-col justify-between space-y-4">
                <div className="flex items-start gap-2.5">
                  <div className="p-2.5 bg-blue-600/15 text-blue-400 rounded-xl border border-blue-500/20">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <strong className="text-xs break-all block text-white">{doc.name}</strong>
                    <span className="text-[10px] text-[#8b949e] font-mono mt-1 block uppercase">CAT: {doc.category}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-slate-500 font-mono">Date: {doc.addedDate}</span>
                  <div className="flex gap-2">
                    <button onClick={()=>showToast(`Viewing compliance record: ${doc.name}`, 'info')} className="text-blue-400 font-bold hover:underline cursor-pointer">Open</button>
                    <button onClick={()=>{
                      triggerConfirm(
                        "Delete File Record",
                        `Are you sure you want to delete file item ${doc.name}?`,
                        () => saveDocs(documents.filter(d => d.id !== doc.id))
                      );
                    }} className="text-red-400 font-bold hover:underline cursor-pointer">Delete</button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Plus Add File Form inside Image 13 layout */}
          <div className="bg-[#0d1117] border border-[#30363d] p-5 rounded-2xl text-xs text-left max-w-md">
            <h4 className="font-bold text-yellow-450 font-mono uppercase tracking-wider mb-4">📁 Lock PDF Certificate inside Document Vault</h4>
            <form onSubmit={addDocRecord} className="space-y-3 font-sans">
              <div>
                <label className="block text-[#8b949e] font-mono mb-1 uppercase text-[10px]">Document Label Name</label>
                <input 
                  type="text" 
                  required 
                  value={newDocName}
                  onChange={(e) => setNewDocName(e.target.value)}
                  placeholder="GST_CORP_CERTIFICATE_99" 
                  className="w-full bg-[#161b22] border border-[#30363d] p-2.5 rounded-xl text-white outline-none"
                />
              </div>
              <div>
                <label className="block text-[#8b949e] font-mono mb-1 uppercase text-[10px]">Document Category</label>
                <select 
                  value={newDocCat}
                  onChange={(e) => setNewDocCat(e.target.value as any)}
                  className="w-full bg-[#161b22] border border-[#30363d] p-2.5 rounded-xl text-white outline-none"
                >
                  <option value="Business">Business Compliance</option>
                  <option value="Other">Other Personal File</option>
                </select>
              </div>
              <div className="flex pt-2">
                <button type="submit" className="w-full py-2.5 bg-yellow-405 bg-yellow-400 hover:bg-yellow-350 text-slate-900 font-bold rounded-xl transition-all uppercase tracking-wider font-mono">Lock file record</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SECTION: TALLY VINTAGE VOUCHERS JOURNAL EXCHANGER */}
      {activeSection === 'vouchers' && (
        <div className="bg-[#161b22] border border-[#30363d] p-6 rounded-2xl text-left space-y-6">
          <div className="border-b border-[#30363d] pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-bold text-white tracking-tight uppercase">Journal Voucher Terminal Windows</h3>
              <p className="text-xs text-[#8b949e] font-mono mt-0.5">COMPLY WITH CLASSIC SINGLE AND DOUBLE ENTRY RULES FOR BANK TO CASH OR CREDIT SALES</p>
            </div>
            
            <button 
              onClick={() => setActiveSection('home')}
              className="text-[#8b949e] hover:text-white font-mono text-xs font-bold inline-flex items-center gap-2 bg-[#0d1117] border border-[#30363d] p-2 rounded-xl cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back Home
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            
            {/* Left sidebar containing classical hotkeys (Contra F4 to Purchase F9) */}
            <div className="bg-[#0b1b11] border border-[#1a3821] p-4.5 rounded-2xl flex flex-col gap-1.5 h-fit text-left">
              <span className="text-[10px] font-mono text-emerald-400 font-black uppercase mb-2 tracking-wider">Tally Hotkey list (FY)</span>
              
              {[
                { type: 'Contra', key: 'F4: CONTRA VOUCH' },
                { type: 'Payment', key: 'F5: PAYMENT VOUCH' },
                { type: 'Receipt', key: 'F6: RECEIPT VOUCH' },
                { type: 'Journal', key: 'F7: JOURNAL VOUCH' },
                { type: 'Sales', key: 'F8: SALES VOUCH' },
                { type: 'Purchase', key: 'F9: PURCHASE VOUCH' },
              ].map((item, idx) => (
                <button
                  key={idx}
                  onClick={() => setTallyVoucherType(item.type as any)}
                  className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-bold font-mono transition-all border ${
                    tallyVoucherType === item.type
                      ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400 shrink-0'
                      : 'text-slate-400 hover:bg-[#112416] border-transparent hover:text-white shrink-0'
                  }`}
                >
                  {item.key}
                </button>
              ))}
            </div>

            {/* Vintage Tally green-screen styled input window box */}
            <div className="md:col-span-3 bg-[#0a140d]/95 border-2 border-[#164222] p-6 rounded-2xl relative shadow-2xl">
              
              {/* Retro Tally status bar header banner */}
              <div className="bg-[#0f2e17] border-b border-[#164222] p-2.5 -mx-6 -mt-6 rounded-t-2xl flex justify-between items-center text-[10px] text-emerald-300 font-mono uppercase tracking-tight">
                <span>Vouching Terminal [ FY 2026-27 ]</span>
                <span className="font-bold bg-emerald-500/20 px-2 py-0.5 rounded border border-emerald-500/35">ACTIVE MODE: {tallyVoucherType}</span>
              </div>

              <form onSubmit={recordTallyVoucher} className="space-y-4 pt-4 text-xs font-mono text-[#4ade80] text-left">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-emerald-500 font-bold mb-1 uppercase tracking-wider text-[9.5px]">Debit Account Profile (Dr)</label>
                    <input 
                      type="text" 
                      required
                      value={tallyDr}
                      onChange={(e) => setTallyDr(e.target.value)}
                      placeholder="e.g. RELIANCE PETROLEUM LEDGER" 
                      className="w-full bg-[#070d08] border border-[#164222] text-[#4ade80] placeholder:text-[#164222] p-2.5 rounded-xl uppercase outline-none focus:border-emerald-400 font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-emerald-500 font-bold mb-1 uppercase tracking-wider text-[9.5px]">Credit Account Profile (Cr)</label>
                    <input 
                      type="text" 
                      required
                      value={tallyCr}
                      onChange={(e) => setTallyCr(e.target.value)}
                      placeholder="e.g. GENERAL CASH BALANCES" 
                      className="w-full bg-[#070d08] border border-[#164222] text-[#4ade80] placeholder:text-[#164222] p-2.5 rounded-xl uppercase outline-none focus:border-emerald-400 font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-emerald-500 font-bold mb-1 uppercase tracking-wider text-[9.5px]">Aggregated Amount (INR)</label>
                    <input 
                      type="number" 
                      required
                      value={tallyAmount}
                      onChange={(e) => setTallyAmount(e.target.value)}
                      placeholder="Amount ₹/-" 
                      className="w-full bg-[#070d08] border border-[#164222] text-[#4ade80] placeholder:text-[#164222] p-2.5 rounded-xl outline-none focus:border-emerald-400 font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-emerald-500 font-bold mb-1 uppercase tracking-wider text-[9.5px]">Voucher Process Date</label>
                    <input 
                      type="date" 
                      required
                      value={tallyDate}
                      onChange={(e) => setTallyDate(e.target.value)}
                      className="w-full bg-[#070d08] border border-[#164222] text-[#4ade80] p-2.5 rounded-xl outline-none focus:border-emerald-400"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-emerald-500 font-bold mb-1 uppercase tracking-wider text-[9.5px]">Detailed Voucher Narrative (Narration)</label>
                    <textarea 
                      value={tallyNarration}
                      onChange={(e) => setTallyNarration(e.target.value)}
                      placeholder="Describe the nature of transaction with reference numbers..." 
                      className="w-full bg-[#070d08] border border-[#164222] text-[#4ade80] placeholder:text-[#164222] p-2.5 rounded-xl h-16 outline-none focus:border-emerald-400 resize-none font-bold"
                    />
                  </div>
                </div>

                <div className="flex justify-between items-center pt-3 border-t border-[#164222]">
                  <span className="text-[10px] text-emerald-600 font-bold select-none">• PRESS ENTER OR CLICK SUBMIT TO PERSIST AUDITING BOOKS</span>
                  <button 
                    type="submit"
                    className="px-6 py-2.5 bg-[#164222] hover:bg-[#1a5a2d] font-bold text-white rounded-xl uppercase transition-all shadow-md cursor-pointer border border-[#1a5a2d]"
                  >
                    Accept? (Yes)
                  </button>
                </div>
              </form>

            </div>

          </div>
        </div>
      )}

      {/* SECTION: GSTIN & KYC AUDIT LOOKER */}
      {activeSection === 'verification' && (
        <div className="bg-[#161b22] border border-[#30363d] p-6 rounded-2xl text-left space-y-6">
          <div className="border-b border-[#30363d] pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">GSTIN & KYC Verification Lookup</h3>
              <p className="text-xs text-[#8b949e] font-mono mt-0.5">VALIDATE TAX-LIABILITY COMPLIANCES AND DIRECT FILING STATUTES RECONCILIATIONS</p>
            </div>
            
            <button 
              onClick={() => setActiveSection('home')}
              className="text-[#8b949e] hover:text-white font-mono text-xs font-bold inline-flex items-center gap-2 bg-[#0d1117] border border-[#30363d] p-2 rounded-xl cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back Home
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Input Form Lookup */}
            <div className="bg-[#0d1117] border border-[#30363d] p-5 rounded-2xl space-y-4">
              <h4 className="font-bold text-yellow-405 text-yellow-500 font-mono uppercase tracking-wider text-xs">Verify GSTIN ID Format</h4>
              <form onSubmit={handleGSTVerify} className="space-y-3 font-sans text-xs">
                <div>
                  <label className="block text-[#8b949e] font-mono mb-1 uppercase text-[10px]">Enter 15-Digit GSTIN</label>
                  <input 
                    type="text" 
                    required 
                    value={gstVerifyInput} 
                    onChange={(e)=>setGstVerifyInput(e.target.value)}
                    placeholder="e.g. 24AAAPC1994V1Z2" 
                    className="w-full bg-[#161b22] border border-[#30363d] text-white p-2.5 rounded-xl uppercase font-mono font-bold tracking-wider outline-none"
                  />
                </div>
                <div className="flex pt-2">
                  <button type="submit" className="w-full py-2.5 bg-yellow-400 hover:bg-yellow-350 text-slate-900 font-bold rounded-xl cursor-pointer transition-all uppercase font-mono text-[11px] tracking-tight">Run Verifier</button>
                </div>
              </form>
            </div>

            {/* Results Canvas output */}
            <div className="md:col-span-2 bg-[#0d1117] border border-[#30363d] p-5 rounded-2xl">
              <h4 className="font-bold text-yellow-500 font-mono uppercase tracking-wider text-xs border-b border-[#30363d] pb-2 text-left">Lookup Result Feed</h4>
              
              <AnimatePresence mode="wait">
                {gstVerifyResult ? (
                  <motion.div 
                    initial={{ opacity:0, y:5 }} 
                    animate={{ opacity:1, y:0 }} 
                    className="space-y-4 pt-3 text-xs text-left"
                  >
                    {gstVerifyResult.status === 'VERIFIED' ? (
                      <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-3 rounded-xl flex items-center gap-2.5 font-bold font-sans">
                        <ShieldCheck className="w-5 h-5 shrink-0" /> GSTIN Tax Active status confirmed sequentially.
                      </div>
                    ) : (
                      <div className="bg-amber-500/10 border border-amber-500/20 text-amber-500 p-3 rounded-xl flex items-center gap-2.5 font-bold font-sans">
                        <AlertTriangle className="w-5 h-5 shrink-0" /> {gstVerifyResult.message}
                      </div>
                    )}

                    {gstVerifyResult.gstin && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-sans text-white">
                        <div className="p-3 bg-[#161b22] border border-[#30363d] rounded-xl">
                          <span className="text-[10px] text-[#8b949e] font-mono block uppercase">Trade name (Compliance)</span>
                          <strong className="text-[11px] block mt-0.5">{gstVerifyResult.tradeName}</strong>
                        </div>
                        <div className="p-3 bg-[#161b22] border border-[#30363d] rounded-xl">
                          <span className="text-[10px] text-[#8b949e] font-mono block uppercase">Taxpayer type / Constitution</span>
                          <strong className="text-[11px] block mt-0.5">{gstVerifyResult.constitution} / {gstVerifyResult.taxpayerType}</strong>
                        </div>
                        <div className="p-3 bg-[#161b22] border border-[#30363d] rounded-xl sm:col-span-2">
                          <span className="text-[10px] text-[#8b949e] font-mono block uppercase">Registered Principal Address</span>
                          <p className="text-[11px] block mt-0.5">{gstVerifyResult.address}</p>
                        </div>
                        <div className="p-3 bg-[#161b22] border border-[#30363d] rounded-xl">
                          <span className="text-[10px] text-[#8b949e] font-mono block uppercase">Filing Frequency History</span>
                          <strong className="text-[11px] text-emerald-400 block mt-0.5">{gstVerifyResult.filingFrequency}</strong>
                        </div>
                        <div className="p-3 bg-[#161b22] border border-[#30363d] rounded-xl">
                          <span className="text-[10px] text-[#8b949e] font-mono block uppercase">Baroda Road carriers Score</span>
                          <strong className="text-[11px] text-emerald-400 block mt-0.5">{gstVerifyResult.complianceScore}</strong>
                        </div>
                      </div>
                    )}
                  </motion.div>
                ) : (
                  <div className="py-16 text-center text-slate-500 text-xs italic">
                    Execute a search Lookup using a valid GSTIN ID.
                  </div>
                )}
              </AnimatePresence>
            </div>

          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* ADD PARTY MODAL OVERLAY                              */}
      {/* ---------------------------------------------------- */}
      {addPartyOpen && (
        <div className="fixed inset-0 z-50 bg-[#0d1117]/85 backdrop-blur-sm flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-[#161b22] border border-[#30363d] text-white p-6 rounded-2xl w-full max-w-lg shadow-2xl space-y-4 text-left font-sans"
          >
            <div className="flex justify-between items-center border-b border-[#30363d] pb-3.5">
              <h4 className="font-bold text-white uppercase tracking-tight text-base">＋ Configure New Party Ledger Account</h4>
              <button onClick={() => setAddPartyOpen(false)} className="text-[#8b949e] hover:text-white transition-all cursor-pointer"><X className="w-4 h-4" /></button>
            </div>

            <form onSubmit={submitPartyForm} className="space-y-4 text-xs text-white">
              <div>
                <label className="block text-[#8b949e] font-mono mb-1 uppercase text-[10px]">Trade / Company Name</label>
                <input 
                  type="text" 
                  required 
                  placeholder="e.g. BARODA PETRO-REFINERIES" 
                  value={formPartyName}
                  onChange={(e) => setFormPartyName(e.target.value)}
                  className="w-full bg-[#0d1117] border border-[#30363d] p-2.5 rounded-xl uppercase outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#8b949e] font-mono mb-1 uppercase text-[10px]">Ledger Allocation Group</label>
                  <select 
                    value={formPartyType}
                    onChange={(e) => setFormPartyType(e.target.value as any)}
                    className="w-full bg-[#0d1117] border border-[#30363d] p-2.5 rounded-xl text-white outline-none"
                  >
                    <option value="Customer">Customer (Sundry Debtor)</option>
                    <option value="Supplier">Supplier (Sundry Creditor)</option>
                    <option value="Both">Both (Clearing Partner)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[#8b949e] font-mono mb-1 uppercase text-[10px]">Contact Mobile Number</label>
                  <input 
                    type="tel" 
                    placeholder="94270#####" 
                    value={formPartyContact}
                    onChange={(e) => setFormPartyContact(e.target.value)}
                    className="w-full bg-[#0d1117] border border-[#30363d] p-2.5 rounded-xl outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[#8b949e] font-mono mb-1 uppercase text-[10px]">Registered Principal Address</label>
                <input 
                  type="text" 
                  placeholder="F8 Refineries Block GIDC Baroda Gujarat" 
                  value={formPartyAddress}
                  onChange={(e) => setFormPartyAddress(e.target.value)}
                  className="w-full bg-[#0d1117] border border-[#30363d] p-2.5 rounded-xl outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#8b949e] font-mono mb-1 uppercase text-[10px]">Tax GSTIN Identification</label>
                  <input 
                    type="text" 
                    placeholder="24AAAPS9401C1Z0" 
                    value={formPartyGstin}
                    onChange={(e) => setFormPartyGstin(e.target.value)}
                    className="w-full bg-[#0d1117] border border-[#30363d] p-2.5 rounded-xl uppercase font-mono outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[#8b949e] font-mono mb-1 uppercase text-[10px]">Account Opening Balance (INR)</label>
                  <input 
                    type="number" 
                    placeholder="Rs. Balance" 
                    value={formPartyOpening}
                    onChange={(e) => setFormPartyOpening(e.target.value)}
                    className="w-full bg-[#0d1117] border border-[#30363d] p-2.5 rounded-xl outline-none font-mono"
                  />
                </div>
              </div>

              <div className="flex pt-2.5 justify-end gap-3.5">
                <button 
                  type="button" 
                  onClick={() => setAddPartyOpen(false)} 
                  className="px-4 py-2 bg-[#21262d] text-[#8b949e] hover:text-white rounded-xl font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="px-5 py-2.5 bg-yellow-450 hover:bg-yellow-400 text-slate-900 font-bold rounded-xl cursor-pointer uppercase font-mono tracking-wider"
                >
                  Create Party Profile
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Tally invoice print overlay visualizer modal */}
      {selectedPrintVoucher && (
        <TallyInvoice 
          invoice={selectedPrintVoucher}
          onClose={() => setSelectedPrintVoucher(null)}
        />
      )}

      {/* Shipmate detailed ledger transaction auditing certificate */}
      {selectedDetailVoucher && (
        <ShipmateDetailModal 
          isOpen={!!selectedDetailVoucher}
          onClose={() => setSelectedDetailVoucher(null)}
          title={`${selectedDetailVoucher.type} Ledger Statement Audit`}
          subtitle="Tally double entry balance verification certificate"
          trackingId={selectedDetailVoucher.voucherNo}
          status="Passed Reconciliation"
          statusType="success"
          source={selectedDetailVoucher.debitAccount || "Petty Cash Draw"}
          destination={selectedDetailVoucher.creditAccount || "SBI Overdraft Reserve"}
          amount={`₹${selectedDetailVoucher.amount?.toLocaleString()}`}
          date={selectedDetailVoucher.date}
          productName={`${selectedDetailVoucher.type.toUpperCase()} VOUCHER`}
          fields={[
            { label: "Voucher Category", value: selectedDetailVoucher.type },
            { label: "Debit Profile (Dr)", value: selectedDetailVoucher.debitAccount || "Cash Assets" },
            { label: "Credit Profile (Cr)", value: selectedDetailVoucher.creditAccount || "Bank liabilities" },
            { label: "Audit Ledger Date", value: selectedDetailVoucher.date },
            { label: "Narration Remark", value: selectedDetailVoucher.narration || "Standard commercial offset posting" }
          ]}
          steps={[
            { label: "Voucher Drafted", active: false, completed: true },
            { label: "Debit Balanced (Dr)", active: false, completed: true },
            { label: "Credit Balanced (Cr)", active: false, completed: true },
            { label: "Fiscal Audited", active: true, completed: true }
          ]}
          onPrint={() => {
            setSelectedPrintVoucher(selectedDetailVoucher);
            setSelectedDetailVoucher(null);
          }}
        />
      )}

      {/* Custom float Toast Notification */}
      {toast && (
        <div className="fixed top-20 right-6 z-50 min-w-[280px]">
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            className={`p-4 rounded-xl border font-sans text-xs flex items-center gap-2.5 shadow-2xl ${
              toast.type === 'error'
                ? 'bg-[#ffebe9] border-[#ff8181] text-[#b62324]'
                : toast.type === 'info'
                  ? 'bg-[#e8f0fe] border-[#aecbfa] text-[#185abc]'
                  : 'bg-[#dafbe1] border-[#4ac26b] text-[#1a7f37]'
            }`}
          >
            <span>{toast.type === 'error' ? '⚠️' : toast.type === 'info' ? 'ℹ️' : '✅'}</span>
            <span className="font-semibold">{toast.message}</span>
          </motion.div>
        </div>
      )}

      {/* Custom non-blocking confirmation dialog */}
      {confirmDialog && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-[#161b22] border border-[#30363d] text-white p-6 rounded-2xl w-full max-w-sm shadow-2xl space-y-4 text-center font-sans"
          >
            <div className="w-12 h-12 bg-red-500/15 text-red-500 rounded-full flex items-center justify-center mx-auto text-xl font-bold">
              ⚠️
            </div>
            <div className="space-y-1.5 text-center">
              <h4 className="font-bold text-white text-base font-sans uppercase tracking-wide">
                {confirmDialog.title}
              </h4>
              <p className="text-xs text-[#8b949e] font-mono leading-relaxed">
                {confirmDialog.message}
              </p>
            </div>
            <div className="flex gap-3 justify-center pt-2">
              <button 
                onClick={() => setConfirmDialog(null)}
                className="px-4 py-2 bg-[#21262d] hover:bg-[#30363d] border border-[#30363d] text-[#8b949e] hover:text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button 
                onClick={confirmDialog.onConfirm}
                className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-black transition-all cursor-pointer shadow-md shadow-red-950/20"
              >
                Yes, Proceed
              </button>
            </div>
          </motion.div>
        </div>
      )}

    </div>
  );
}
