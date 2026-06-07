import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  FileText, Download, TrendingUp, HelpCircle, Search, 
  Calendar, CreditCard, ChevronDown, CheckCircle, Clock, Database, Wrench,
  Plus, X, Printer, Receipt, Hammer, Sparkles, Upload, AlertTriangle
} from 'lucide-react';
import { exportToPDF, exportToExcel } from '../utils/exportUtils';
import { Trip, LorryReceipt, MaintenanceBill, Tanker, TankerExpense, Driver } from '../types';
import * as XLSX from 'xlsx';
import ShipmateDetailModal from './ShipmateDetailModal';
import { 
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, 
  CartesianGrid, Tooltip, Legend 
} from 'recharts';

interface LedgerProps {
  trips: Trip[];
  lrs: LorryReceipt[];
  bills: MaintenanceBill[];
  tankers: Tanker[];
  drivers?: Driver[];
  expenses?: TankerExpense[];
  currentUser?: any;
  onAddGeneralExpense?: (expense: TankerExpense) => void;
  onMarkBillCollected: (billId: string) => void;
  onRegisterMaintenanceBill?: (bill: MaintenanceBill) => void;
  onDeleteBill?: (id: string) => void;
  onDeleteExpense?: (id: string) => void;
  onImportBulkBills?: (bills: MaintenanceBill[]) => void;
  onDeleteTrip?: (id: string) => void;
  defaultLedgerType?: 'transport' | 'repair' | 'maintenance' | 'adblue' | 'fuel';
}

export default function Ledger({ 
  trips, lrs, bills, tankers, drivers = [], expenses, currentUser, onAddGeneralExpense, onMarkBillCollected, onRegisterMaintenanceBill, onDeleteBill, onDeleteExpense, onImportBulkBills, onDeleteTrip, defaultLedgerType
}: LedgerProps) {
  const [selectedParty, setSelectedParty] = useState<string>('All Parties');
  const [activeLedgerType, setActiveLedgerType] = useState<'transport' | 'repair' | 'maintenance' | 'adblue' | 'fuel'>(defaultLedgerType || 'transport');

  // Custom non-blocking confirm dialog state
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  } | null>(null);

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

  // Extract all unique consigner & consignee names as parties
  const partiesSet = new Set<string>();
  lrs.forEach(l => {
    partiesSet.add(l.consignerName);
    partiesSet.add(l.consigneeName);
  });
  const partiesList = ['All Parties', ...Array.from(partiesSet)];

  // Separate bills into repair bills, maintenance bills vs adblue bills
  const repairBills = bills.filter(b => b.category === 'repair' || b.category === 'maintenance' || !b.category);
  const adblueBills = bills.filter(b => b.category === 'adblue');

  // Extract all unique repair vendors
  const repairVendorsSet = new Set<string>();
  repairBills.forEach(b => repairVendorsSet.add(b.vendorName));
  const repairVendorsList = ['All Vendors', ...Array.from(repairVendorsSet)];

  // Extract all unique adblue suppliers/dealers
  const adblueVendorsSet = new Set<string>();
  adblueBills.forEach(b => adblueVendorsSet.add(b.vendorName));
  const adblueVendorsList = ['All Suppliers', ...Array.from(adblueVendorsSet)];

  // Synchronized rates from local storage or defaults for transit shortages
  const deductionRateKL = (() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem('shortage_rate_kl') : null;
    return saved ? parseFloat(saved) : 1200; // Default ₹1200 per KL
  })();
  const deductionRateMT = (() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem('shortage_rate_mt') : null;
    return saved ? parseFloat(saved) : 1500; // Default ₹1500 per MT
  })();

  // Calculate pending versus collected bills summary totals
  const collectedRepairsSum = bills.filter(b => (b.category === 'repair' || !b.category) && b.status === 'collected').reduce((sum, b) => sum + b.amount, 0);
  const pendingRepairsSum = bills.filter(b => (b.category === 'repair' || !b.category) && b.status === 'pending').reduce((sum, b) => sum + b.amount, 0);

  const collectedMaintSum = bills.filter(b => b.category === 'maintenance' && b.status === 'collected').reduce((sum, b) => sum + b.amount, 0);
  const pendingMaintSum = bills.filter(b => b.category === 'maintenance' && b.status === 'pending').reduce((sum, b) => sum + b.amount, 0);

  const collectedAdblueSum = adblueBills.filter(b => b.status === 'collected').reduce((sum, b) => sum + b.amount, 0);
  const pendingAdblueSum = adblueBills.filter(b => b.status === 'pending').reduce((sum, b) => sum + b.amount, 0);

  const totalBillCollected = collectedRepairsSum + collectedMaintSum + collectedAdblueSum;
  const totalBillPending = pendingRepairsSum + pendingMaintSum + pendingAdblueSum;

  const financialHealthData = [
    {
      name: 'Workshop Repairs',
      'Collected (Settled)': collectedRepairsSum,
      'Pending (Outstanding)': pendingRepairsSum,
    },
    {
      name: 'Scheduled Maintenance',
      'Collected (Settled)': collectedMaintSum,
      'Pending (Outstanding)': pendingMaintSum,
    },
    {
      name: 'AdBlue Supplies',
      'Collected (Settled)': collectedAdblueSum,
      'Pending (Outstanding)': pendingAdblueSum,
    },
    {
      name: 'Overall Portfolio',
      'Collected (Settled)': totalBillCollected,
      'Pending (Outstanding)': totalBillPending,
    }
  ];

  // Calculate volumetric shortages on the face of completed voyages
  const completedTrips = trips.filter(t => t.status === 'completed');
  const tripsShortageInfo = completedTrips.map(t => {
    const loading = t.loadingWeight || 0;
    const unloading = t.unloadingWeight ?? loading;
    const shortageQty = Math.max(0, parseFloat((loading - unloading).toFixed(3)));
    const rate = t.qtyUnit === 'KL' ? deductionRateKL : deductionRateMT;
    const penalty = shortageQty * rate;
    return {
      ...t,
      shortageQty,
      penalty
    };
  });

  const totalShortageQty = tripsShortageInfo.reduce((sum, t) => sum + t.shortageQty, 0);
  const totalShortagePenalty = tripsShortageInfo.reduce((sum, t) => sum + t.penalty, 0);
  const tripsWithShortageCount = tripsShortageInfo.filter(t => t.shortageQty > 0).length;

  const [selectedVendor, setSelectedVendor] = useState<string>('All Vendors');
  const [selectedAdblueVendor, setSelectedAdblueVendor] = useState<string>('All Suppliers');
  
  const [transportSubTab, setTransportSubTab] = useState<'parties' | 'bills'>('parties');
  const [repairSubTab, setRepairSubTab] = useState<'creditors' | 'bills'>('creditors');
  const [adblueSubTab, setAdblueSubTab] = useState<'creditors' | 'analytical' | 'bills'>('creditors');
  const [expandedLedgerTripId, setExpandedLedgerTripId] = useState<string | null>(null);

  // User timeframe and helper filters
  const [selectedLedgerMonth, setSelectedLedgerMonth] = useState<number | 'all'>('all');
  const [selectedLedgerYear, setSelectedLedgerYear] = useState<number | 'all'>('all');
  const [selectedLedgerDriver, setSelectedLedgerDriver] = useState<string>('all');
  const [selectedLedgerShortageOnly, setSelectedLedgerShortageOnly] = useState<boolean>(false);

  // Fuel Ledger Specific States
  const [selectedFuelTanker, setSelectedFuelTanker] = useState<string>('all');
  const [fuelSearchQuery, setFuelSearchQuery] = useState<string>('');
  const [showAddFuelDirect, setShowAddFuelDirect] = useState<boolean>(false);
  const [showEditFuelModal, setShowEditFuelModal] = useState<boolean>(false);
  const [editingFuelSlip, setEditingFuelSlip] = useState<any>(null);

  // New fuel form fields
  const [newFuelDate, setNewFuelDate] = useState<string>(new Date().toISOString().substring(0, 10));
  const [newFuelTankerId, setNewFuelTankerId] = useState<string>('');
  const [newFuelVendor, setNewFuelVendor] = useState<string>('');
  const [newFuelBillNo, setNewFuelBillNo] = useState<string>('');
  const [newFuelAmount, setNewFuelAmount] = useState<string>('');
  const [newFuelLiters, setNewFuelLiters] = useState<string>('');

  // Modal and custom list states
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedDetailInvoice, setSelectedDetailInvoice] = useState<MaintenanceBill | null>(null);
  const [selectedDetailShipmateInvoice, setSelectedDetailShipmateInvoice] = useState<MaintenanceBill | null>(null);
  const [selectedDetailTrip, setSelectedDetailTrip] = useState<Trip | null>(null);

  // AI Statement Excel Import States
  const [showStatementImportModal, setShowStatementImportModal] = useState(false);
  const [statementFile, setStatementFile] = useState<File | null>(null);
  const [statementAnalysing, setStatementAnalysing] = useState(false);
  const [statementProgress, setStatementProgress] = useState('');
  const [statementError, setStatementError] = useState<string | null>(null);

  const handleStatementImportSubmit = async () => {
    if (!statementFile) return;
    setStatementAnalysing(true);
    setStatementError(null);
    setStatementProgress('Reading statement cell layout...');

    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          const rawRows = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

          setStatementProgress('Analyzing columns and mapping bills data using Gemini AI...');

          const response = await fetch('/api/statements/analyse', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sheetRows: rawRows })
          });

          if (!response.ok) {
            const errData = await response.json();
            throw new Error(errData.error || 'Server statement parser returned an unexpected failure.');
          }

          const parsedResult = await response.json();

          if (onImportBulkBills && parsedResult && parsedResult.success && parsedResult.data && parsedResult.data.bills) {
            onImportBulkBills(parsedResult.data.bills);
            setShowStatementImportModal(false);
            setStatementFile(null);
          } else {
            throw new Error(parsedResult?.error || 'Invalid or missing bills dataset in AI response structure.');
          }
        } catch (err: any) {
          setStatementError(err.message || 'Error occurred during statement analysis.');
        } finally {
          setStatementAnalysing(false);
        }
      };

      reader.onerror = () => {
        setStatementError('FileReader failed to load statement binary format.');
        setStatementAnalysing(false);
      };

      reader.readAsArrayBuffer(statementFile);
    } catch (err: any) {
      setStatementError(err.message || 'An unexpected error occurred during import.');
      setStatementAnalysing(false);
    }
  };

  // AI manual bill scanner / parser states
  const [showGeminiModal, setShowGeminiModal] = useState(false);
  const [geminiLoading, setGeminiLoading] = useState(false);
  const [geminiError, setGeminiError] = useState<string | null>(null);
  const [aiVendorName, setAiVendorName] = useState('');
  const [aiBillNo, setAiBillNo] = useState('');
  const [aiDate, setAiDate] = useState(new Date().toISOString().split('T')[0]);
  const [aiAmount, setAiAmount] = useState('');
  const [aiCategory, setAiCategory] = useState<'repair' | 'maintenance' | 'adblue'>('repair');
  const [aiWorkType, setAiWorkType] = useState('Spare Part Changed');
  const [aiDetail, setAiDetail] = useState('');
  const [aiTankerId, setAiTankerId] = useState('');
  const [aiStatus, setAiStatus] = useState<'pending' | 'collected'>('pending');
  const [hasScanned, setHasScanned] = useState(false);
  const [showScanTip, setShowScanTip] = useState(false);

  // Form input states for registering a supplier invoice
  const [addCategory, setAddCategory] = useState<'repair' | 'maintenance' | 'adblue'>('repair');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<'all' | 'repair' | 'maintenance'>('all');
  const [addTankerId, setAddTankerId] = useState('');
  const [addBillNo, setAddBillNo] = useState('');
  const [addDate, setAddDate] = useState(new Date().toISOString().split('T')[0]);
  const [addVendorName, setAddVendorName] = useState('');
  const [addAmount, setAddAmount] = useState('');
  const [addDetail, setAddDetail] = useState('');
  const [addWorkType, setAddWorkType] = useState('');
  const [addStatus, setAddStatus] = useState<'pending' | 'collected'>('pending');

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!addTankerId || !onRegisterMaintenanceBill) return;

    const matchedTanker = tankers.find(t => t.id === addTankerId);
    const tankerNumber = matchedTanker ? matchedTanker.tankerNumber : 'Unknown';

    const newBill: MaintenanceBill = {
      id: 'bill-' + Date.now(),
      tankerId: addTankerId,
      tankerNumber,
      vendorName: addVendorName,
      billNo: addBillNo,
      date: addDate,
      amount: parseFloat(addAmount) || 0,
      detail: addDetail,
      status: addStatus,
      category: addCategory,
      workType: addWorkType || (addCategory === 'adblue' ? 'AdBlue Refill' : 'General Maintenance')
    };

    onRegisterMaintenanceBill(newBill);
    setShowAddModal(false);

    // Reset fields
    setAddTankerId('');
    setAddBillNo('');
    setAddVendorName('');
    setAddAmount('');
    setAddDetail('');
    setAddWorkType('');
    setAddStatus('pending');
  };

  const populateAiFields = (analysis: any) => {
    setAiVendorName(analysis.vendorName || '');
    setAiBillNo(analysis.billNo || `MNT-AI-${Math.floor(1000 + Math.random() * 9000)}`);
    setAiDate(analysis.date || new Date().toISOString().split('T')[0]);
    setAiAmount(analysis.amount ? String(analysis.amount) : '');
    setAiCategory(analysis.category === 'adblue' ? 'adblue' : 'repair');
    setAiWorkType(analysis.workType || (analysis.category === 'adblue' ? 'AdBlue Refill' : 'Spare Part Changed'));
    setAiDetail(analysis.detail || '');

    // Match best tanker vehicle by registration matching
    if (analysis.tankerNumber) {
      const matchPlate = String(analysis.tankerNumber).toUpperCase().replace(/[^A-Z0-9]/g, '');
      const bestMatch = tankers.find(t => {
        const p = t.tankerNumber.toUpperCase().replace(/[^A-Z0-9]/g, '');
        return p.includes(matchPlate) || matchPlate.includes(p);
      });
      if (bestMatch) {
        setAiTankerId(bestMatch.id);
      } else {
        setAiTankerId(tankers[0]?.id || '');
      }
    } else {
      setAiTankerId(tankers[0]?.id || '');
    }

    setHasScanned(true);
  };

  const handleGeminiFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setGeminiLoading(true);
    setGeminiError(null);
    setHasScanned(false);

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const base64Str = event.target?.result as string;
        if (!base64Str) throw new Error("Could not read uploaded document data stream.");

        const commaIdx = base64Str.indexOf(",");
        const rawBase64 = commaIdx !== -1 ? base64Str.substring(commaIdx + 1) : base64Str;
        const mimeType = file.type || "image/png";

        const res = await fetch("/api/maintenance/analyse-bill", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            fileData: rawBase64,
            mimeType: mimeType
          })
        });

        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.error || "Failed upstream AI analysis scan.");
        }

        const data = await res.json();
        if (data.success && data.analysis) {
          populateAiFields(data.analysis);
        } else {
          throw new Error("Invalid response format received from AI auditor.");
        }
      } catch (err: any) {
        console.error("Manual AI Audit Error:", err);
        setGeminiError(err.message || "Failed to analyze document.");
      } finally {
        setGeminiLoading(false);
      }
    };

    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleSelectPresetSample = (type: 'iocl' | 'shirdi') => {
    setGeminiLoading(true);
    setGeminiError(null);
    setHasScanned(false);

    setTimeout(() => {
      try {
        if (type === 'iocl') {
          populateAiFields({
            tankerNumber: tankers[0]?.tankerNumber || 'GJ06ZZ4221',
            vendorName: "IOCL Shrinath Adblue Fuel Point, Ranoli GIDC",
            billNo: "IOCL-COY-4929",
            date: "2026-05-18",
            amount: 2450,
            category: "adblue",
            workType: "AdBlue Refill",
            detail: "Refilled 50 Liters of Eco-Chem Adblue Solution into HMV container."
          });
        } else {
          populateAiFields({
            tankerNumber: tankers[1]?.tankerNumber || tankers[0]?.tankerNumber || 'GJ06ZZ8812',
            vendorName: "Shree Shirdi Heavy Motor Workshop, Vadodara",
            billNo: "MNT-2026-105",
            date: "2026-05-20",
            amount: 14800,
            category: "repair",
            workType: "Spare Part Changed",
            detail: "Replaced 2 rear axle leaf spring suspensions & grease oiling package."
          });
        }
      } catch (err: any) {
        setGeminiError("Error resolving preset schema.");
      } finally {
        setGeminiLoading(false);
      }
    }, 1200);
  };

  const handleAiRecordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiTankerId || !onRegisterMaintenanceBill) return;

    const matchedTanker = tankers.find(t => t.id === aiTankerId);
    const tankerNumber = matchedTanker ? matchedTanker.tankerNumber : 'Unknown';

    const newBill: MaintenanceBill = {
      id: 'bill-ai-' + Date.now(),
      tankerId: aiTankerId,
      tankerNumber,
      vendorName: aiVendorName,
      billNo: aiBillNo,
      date: aiDate,
      amount: parseFloat(aiAmount) || 0,
      detail: aiDetail,
      status: aiStatus,
      category: aiCategory,
      workType: aiWorkType
    };

    onRegisterMaintenanceBill(newBill);
    setShowGeminiModal(false);

    // Reset states
    setAiVendorName('');
    setAiBillNo('');
    setAiAmount('');
    setAiDetail('');
    setAiWorkType('Spare Part Changed');
    setAiTankerId('');
    setHasScanned(false);
  };

  const handleCSVImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !onRegisterMaintenanceBill) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (!text) return;

      const lines = text.split('\n');
      if (lines.length <= 1) return;

      const parseCSVLine = (line: string) => {
        const result: string[] = [];
        let cur = '';
        let insideQuote = false;
        for (let i = 0; i < line.length; i++) {
          const char = line[i];
          if (char === '"') {
            insideQuote = !insideQuote;
          } else if (char === ',' && !insideQuote) {
            result.push(cur.trim());
            cur = '';
          } else {
            cur += char;
          }
        }
        result.push(cur.trim());
        return result;
      };

      const headers = parseCSVLine(lines[0]).map(h => h.toLowerCase().replace(/[^a-z0-9]/g, ''));
      let importedCount = 0;

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        const values = parseCSVLine(line);
        if (values.length < 3) continue;

        const row: Record<string, string> = {};
        headers.forEach((h, index) => {
          if (values[index] !== undefined) {
             row[h] = values[index];
          }
        });

        const billNo = row['billno'] || row['billnumber'] || `CSV-${Math.floor(1000 + Math.random() * 9000)}`;
        const date = row['date'] || new Date().toISOString().split('T')[0];
        const tankerNo = row['tankernumber'] || row['tanker'] || 'Unknown';
        const vendorName = row['vendorname'] || row['vendor'] || 'Unknown Vendor';
        const amount = parseFloat(row['amount'] || row['price'] || '0');
        const detail = row['detail'] || row['description'] || 'Bulk CSV imported maintenance activity';
        const category = (row['category']?.toLowerCase() === 'adblue' ? 'adblue' : 'repair') as 'repair' | 'adblue';
        const workType = row['worktype'] || row['service'] || (category === 'adblue' ? 'AdBlue Refill' : 'Mechanical Maintenance');
        const status = (row['status']?.toLowerCase() === 'collected' || row['status']?.toLowerCase() === 'paid' ? 'collected' : 'pending') as 'pending' | 'collected';

        const matchedTanker = tankers.find(t => t.tankerNumber.toLowerCase().replace(/\s+/g, '') === tankerNo.toLowerCase().replace(/\s+/g, ''));
        const tankerId = matchedTanker ? matchedTanker.id : (tankers[0]?.id || 'tnk-unknown');
        const finalTankerNumber = matchedTanker ? matchedTanker.tankerNumber : tankerNo;

        const newBill: MaintenanceBill = {
          id: 'bill-csv-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
          tankerId,
          tankerNumber: finalTankerNumber,
          vendorName,
          billNo,
          date,
          amount,
          detail,
          status,
          category,
          workType
        };

        onRegisterMaintenanceBill(newBill);
        importedCount++;
      }

      triggerConfirm(
        "Import Completed",
        `Successfully imported ${importedCount} maintenance bill records from the selected CSV file.`,
        () => {}
      );
    };

    reader.readAsText(file);
    e.target.value = '';
  };

  // CSV Export Utility for Transport Parties
  const exportTransportLedger = () => {
    const completedTrips = trips.filter(t => t.status === 'completed');
    const filtered = completedTrips.filter(t => {
      const associatedLr = lrs.find(l => l.id === t.lrId);
      if (!associatedLr) return false;
      if (selectedParty === 'All Parties') return true;
      return associatedLr.consignerName === selectedParty || associatedLr.consigneeName === selectedParty;
    });

    const dataToExport = filtered.map(t => {
      const associatedLr = lrs.find(l => l.id === t.lrId);
      return {
        date: t.endDate || t.startDate,
        partyName: associatedLr?.consignerName || "Industrial Chemie (Self)",
        lrNo: t.lrNo,
        tankerNumber: t.tankerNumber,
        driverName: t.driverName,
        route: `${t.placeFrom} to ${t.placeTo}`,
        product: associatedLr?.product || '',
        unloadedQty: `${t.unloadingWeight || t.loadingWeight} ${t.qtyUnit}`,
        rate: `Rs. ${t.freightRateAtEnd || 0}`,
        revenue: `Rs. ${t.revenue || 0}`,
        status: 'BILLED'
      };
    });

    const headers = ['Date', 'Party Name (Billed)', 'LR Number', 'Tanker Plate', 'Driver', 'Route', 'Product', 'Unloaded Qty', 'Rate (INR)', 'Bill Total (INR)', 'Status'];
    const keys = ['date', 'partyName', 'lrNo', 'tankerNumber', 'driverName', 'route', 'product', 'unloadedQty', 'rate', 'revenue', 'status'];

    exportToExcel(
      `Transport Ledger: ${selectedParty}`,
      headers,
      keys,
      dataToExport,
      `Transport_Ledger_${selectedParty.replace(/\s+/g, '_')}_FY26-27.csv`
    );
  };

  // CSV Export Utility for Repair Ledger
  const exportRepairLedger = () => {
    const filtered = repairBills.filter(b => {
      if (selectedVendor === 'All Vendors') return true;
      return b.vendorName === selectedVendor;
    });

    const dataToExport = filtered.map(b => ({
      date: b.date,
      billNo: b.billNo,
      tankerNumber: b.tankerNumber,
      vendorName: b.vendorName,
      detail: b.detail,
      amount: `Rs. ${b.amount}`,
      status: b.status.toUpperCase()
    }));

    const headers = ['Date', 'Bill Number', 'Tanker Plate', 'Repair Vendor', 'Service Detail Description', 'Amount (INR)', 'Status'];
    const keys = ['date', 'billNo', 'tankerNumber', 'vendorName', 'detail', 'amount', 'status'];

    exportToExcel(
      `Repair Ledger: ${selectedVendor}`,
      headers,
      keys,
      dataToExport,
      `Repair_Ledger_${selectedVendor.replace(/\s+/g, '_')}_FY26-27.csv`
    );
  };

  // CSV Export Utility for AdBlue Ledger
  const exportAdblueLedger = () => {
    const filtered = adblueBills.filter(b => {
      if (selectedAdblueVendor === 'All Suppliers') return true;
      return b.vendorName === selectedAdblueVendor;
    });

    const dataToExport = filtered.map(b => ({
      date: b.date,
      billNo: b.billNo,
      tankerNumber: b.tankerNumber,
      vendorName: b.vendorName,
      detail: b.detail,
      amount: `Rs. ${b.amount}`,
      status: b.status.toUpperCase()
    }));

    const headers = ['Date', 'Bill Number', 'Tanker Plate', 'AdBlue Supplier', 'Transaction Details', 'Amount (INR)', 'Status'];
    const keys = ['date', 'billNo', 'tankerNumber', 'vendorName', 'detail', 'amount', 'status'];

    exportToExcel(
      `AdBlue Ledger: ${selectedAdblueVendor}`,
      headers,
      keys,
      dataToExport,
      `AdBlue_Ledger_${selectedAdblueVendor.replace(/\s+/g, '_')}_FY26-27.csv`
    );
  };

  // PDF Export Utility for Transport Parties
  const exportTransportLedgerPDF = () => {
    const completedTrips = trips.filter(t => t.status === 'completed');
    const filtered = completedTrips.filter(t => {
      const associatedLr = lrs.find(l => l.id === t.lrId);
      if (!associatedLr) return false;
      if (selectedParty === 'All Parties') return true;
      return associatedLr.consignerName === selectedParty || associatedLr.consigneeName === selectedParty;
    });

    const dataToPDF = filtered.map(t => {
      const associatedLr = lrs.find(l => l.id === t.lrId);
      return {
        date: t.endDate || t.startDate,
        partyName: associatedLr?.consignerName || "Industrial Chemie (Self)",
        lrNo: t.lrNo,
        tankerNumber: t.tankerNumber,
        driverName: t.driverName,
        route: `${t.placeFrom} to ${t.placeTo}`,
        product: associatedLr?.product || 'Petrochemicals',
        unloadedQty: `${t.unloadingWeight || t.loadingWeight} ${t.qtyUnit}`,
        rate: `Rs. ${t.freightRateAtEnd || 0}`,
        revenue: `Rs. ${t.revenue || 0}`,
        status: 'BILLED'
      };
    });

    const headers = ['Date', 'Party Name', 'LR Number', 'Tanker', 'Driver', 'Route', 'Product', 'Qty', 'Rate', 'Amount', 'Status'];
    const keys = ['date', 'partyName', 'lrNo', 'tankerNumber', 'driverName', 'route', 'product', 'unloadedQty', 'rate', 'revenue', 'status'];
    exportToPDF(`Transport Ledger: ${selectedParty}`, headers, keys, dataToPDF, `Transport_Ledger_${selectedParty.replace(/\s+/g, '_')}_FY26-27.pdf`, 'Official Transporter Billing & Party Ledger Clearances');
  };

  // PDF Export Utility for Repair Ledger
  const exportRepairLedgerPDF = () => {
    const filtered = repairBills.filter(b => {
      if (selectedVendor === 'All Vendors') return true;
      return b.vendorName === selectedVendor;
    });

    const dataToPDF = filtered.map(b => ({
      date: b.date,
      billNo: b.billNo,
      tankerNumber: b.tankerNumber,
      vendorName: b.vendorName,
      detail: b.detail,
      amount: `Rs. ${b.amount}`,
      status: b.status.toUpperCase()
    }));

    const headers = ['Date', 'Bill No.', 'Tanker', 'Repair Vendor', 'Service Description', 'Amount', 'Status'];
    const keys = ['date', 'billNo', 'tankerNumber', 'vendorName', 'detail', 'amount', 'status'];
    exportToPDF(`Automotive Repair Ledger: ${selectedVendor}`, headers, keys, dataToPDF, `Repair_Ledger_${selectedVendor.replace(/\s+/g, '_')}_FY26-27.pdf`, 'Fleet Maintenance & Creditor Clearances Audit');
  };

  // PDF Export Utility for AdBlue Ledger
  const exportAdblueLedgerPDF = () => {
    const filtered = adblueBills.filter(b => {
      if (selectedAdblueVendor === 'All Suppliers') return true;
      return b.vendorName === selectedAdblueVendor;
    });

    const dataToPDF = filtered.map(b => ({
      date: b.date,
      billNo: b.billNo,
      tankerNumber: b.tankerNumber,
      vendorName: b.vendorName,
      detail: b.detail,
      amount: `Rs. ${b.amount}`,
      status: b.status.toUpperCase()
    }));

    const headers = ['Date', 'Bill No.', 'Tanker', 'AdBlue Supplier', 'Transaction Details', 'Amount', 'Status'];
    const keys = ['date', 'billNo', 'tankerNumber', 'vendorName', 'detail', 'amount', 'status'];
    exportToPDF(`AdBlue Compliance Ledger: ${selectedAdblueVendor}`, headers, keys, dataToPDF, `AdBlue_Ledger_${selectedAdblueVendor.replace(/\s+/g, '_')}_FY26-27.pdf`, 'BS-VI Compliant Eco-Emissions Supply Ledger');
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 py-6 selection:bg-[#ff5a5f] selection:text-white">
      {/* Upper header */}
      <div className="border-b border-[#30363d] pb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight text-sans">Ledger Accounts</h2>
          <p className="text-xs text-[#8b949e] font-mono mt-1">FY 2026 - 27 FISCAL PERIOD AUDITING & VENDOR CLEARANCES</p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto text-xs">
          {onRegisterMaintenanceBill && (
            <>
              <button 
                onClick={() => {
                  setAddCategory(activeLedgerType === 'adblue' ? 'adblue' : activeLedgerType === 'maintenance' ? 'maintenance' : 'repair');
                  setShowAddModal(true);
                }}
                className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white rounded-xl text-xs font-bold inline-flex items-center justify-center gap-1.5 cursor-pointer shadow-md shadow-emerald-500/10 transition-all font-sans"
              >
                <Plus className="w-4 h-4" />
                ＋ Log Supplier Invoice
              </button>

              <button 
                onClick={() => {
                  setShowGeminiModal(true);
                }}
                className="px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white rounded-xl text-xs font-bold inline-flex items-center justify-center gap-1.5 cursor-pointer shadow-md shadow-amber-500/10 transition-all font-sans"
              >
                <Sparkles className="w-4 h-4 text-white" />
                ✨ AI Bill Scan & Log
              </button>

              <label className="px-4 py-2 bg-gradient-to-r from-indigo-650 to-indigo-600 bg-indigo-600 hover:bg-indigo-505 text-white rounded-xl text-xs font-bold inline-flex items-center justify-center gap-1.5 cursor-pointer shadow-md transition-all font-sans relative">
                <Plus className="w-4 h-4" />
                📁 CSV Bulk Import
                <input 
                  type="file" 
                  accept=".csv" 
                  onChange={handleCSVImport} 
                  className="hidden absolute inset-0 opacity-0 cursor-pointer" 
                />
              </label>
            </>
          )}

          {/* Ledger Category Toggle */}
          <div className="flex bg-[#161b22] border border-[#30363d] p-1 rounded-xl scrollbar-none overflow-x-auto max-w-full">
          <button 
            onClick={() => setActiveLedgerType('transport')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold cursor-pointer transition-all whitespace-nowrap ${
              activeLedgerType === 'transport' 
                ? 'bg-blue-600 text-white shadow font-bold' 
                : 'text-[#8b949e] hover:text-white'
            }`}
          >
            Party Transport Ledger
          </button>
          <button 
            onClick={() => setActiveLedgerType('repair')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold cursor-pointer transition-all whitespace-nowrap ${
              activeLedgerType === 'repair' 
                ? 'bg-[#ff5a5f] text-white shadow font-bold' 
                : 'text-[#8b949e] hover:text-white'
            }`}
          >
            🔧 Workshop Repairs
          </button>
          <button 
            onClick={() => setActiveLedgerType('maintenance')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold cursor-pointer transition-all whitespace-nowrap ${
              activeLedgerType === 'maintenance' 
                ? 'bg-amber-500 text-white shadow font-bold' 
                : 'text-[#8b949e] hover:text-white'
            }`}
          >
            🛠 Preventive Maintenance
          </button>
          <button 
            onClick={() => {
              setActiveLedgerType('adblue');
              setAdblueSubTab('creditors');
            }}
            className={`px-4 py-2 rounded-lg text-xs font-semibold cursor-pointer transition-all whitespace-nowrap ${
              activeLedgerType === 'adblue' 
                ? 'bg-cyan-600 text-white shadow font-bold' 
                : 'text-[#8b949e] hover:text-white'
            }`}
          >
            🧴 AdBlue Dealer Accounts
          </button>
          <button 
            onClick={() => {
              setActiveLedgerType('fuel');
            }}
            className={`px-4 py-2 rounded-lg text-xs font-semibold cursor-pointer transition-all whitespace-nowrap ${
              activeLedgerType === 'fuel' 
                ? 'bg-[#ff5a1f] text-white shadow font-bold' 
                : 'text-[#8b949e] hover:text-white'
            }`}
          >
            ⛽ Fuel (Diesel) Register
          </button>
        </div>
      </div>
    </div>

    {/* Financial Health (collected vs pending bills chart) and Transit Cargo Shortage Panels */}
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pb-6 border-b border-[#30363d]">
      {/* Executive Bills ratio stacked bar chart */}
      <div className="lg:col-span-7 bg-[#161b22] border border-[#30363d] p-5 rounded-2xl flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-400" strokeWidth={2.5} />
              <h3 className="text-sm font-bold text-white uppercase tracking-tight font-sans">
                Dealer Bills Financial Health Audit
              </h3>
            </div>
            <span className="text-[10px] font-mono font-bold bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded uppercase">
              Bill Status Ratios
            </span>
          </div>
          <p className="text-[11px] text-[#8b949e] leading-relaxed mb-4">
            Monitors outstanding vs settled liabilities from maintenance repair workshops and AdBlue supply networks.
          </p>
        </div>

        <div className="h-44 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              layout="vertical"
              data={financialHealthData}
              margin={{ top: 5, right: 10, left: 15, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#21262d" horizontal={false} vertical={true} />
              <XAxis 
                type="number" 
                stroke="#8b949e" 
                fontSize={10} 
                tickFormatter={(val) => `₹${val >= 1000 ? (val / 1000).toFixed(0) + 'k' : val}`}
              />
              <YAxis 
                dataKey="name" 
                type="category" 
                stroke="#8b949e" 
                fontSize={10} 
                width={110}
                tickLine={false}
              />
              <Tooltip 
                formatter={(value: any) => [`₹${Number(value).toLocaleString('en-IN')}`]}
                contentStyle={{ backgroundColor: '#0d1117', borderColor: '#30363d', borderRadius: '8px' }}
                labelStyle={{ color: '#fff', fontWeight: 'bold', fontSize: '11px' }}
                itemStyle={{ fontSize: '11px' }}
              />
              <Legend verticalAlign="bottom" height={24} iconSize={10} iconType="circle" wrapperStyle={{ fontSize: '10px', paddingTop: '10px' }} />
              <Bar name="Collected (Settled)" dataKey="Collected (Settled)" stackId="a" fill="#10b981" radius={[0, 0, 0, 0]} />
              <Bar name="Pending (Outstanding)" dataKey="Pending (Outstanding)" stackId="a" fill="#f97316" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="grid grid-cols-3 gap-2 border-t border-[#21262d] pt-4 mt-3 text-center">
          <div className="bg-[#0d1117]/50 p-2 rounded-xl border border-[#21262d]">
            <span className="text-[9px] text-[#8b949e] uppercase block font-mono">Total Collected</span>
            <span className="text-xs font-mono font-bold text-emerald-400">₹{totalBillCollected.toLocaleString()}</span>
          </div>
          <div className="bg-[#0d1117]/50 p-2 rounded-xl border border-[#21262d]">
            <span className="text-[9px] text-[#8b949e] uppercase block font-mono">Total Outstanding</span>
            <span className="text-xs font-mono font-bold text-orange-400">₹{totalBillPending.toLocaleString()}</span>
          </div>
          <div className="bg-[#0d1117]/50 p-2 rounded-xl border border-[#21262d]">
            <span className="text-[9px] text-[#8b949e] uppercase block font-mono">Settlement Rate</span>
            <span className="text-xs font-mono font-bold text-slate-200">
              {totalBillCollected + totalBillPending > 0
                ? `${Math.round((totalBillCollected / (totalBillCollected + totalBillPending)) * 100)}%`
                : '0%'}
            </span>
          </div>
        </div>
      </div>

      {/* Cargo Discrepancies Shortage reconciliation audit */}
      <div className="lg:col-span-5 bg-[#161b22] border border-[#30363d] p-5 rounded-2xl flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4.5 h-4.5 text-orange-400" />
              <h3 className="text-sm font-bold text-white uppercase tracking-tight font-sans">
                Transit Cargo Shortage Alerts (Audit)
              </h3>
            </div>
            <span className="text-[10px] font-mono font-bold bg-orange-500/10 border border-orange-500/20 text-orange-400 px-2 py-0.5 rounded uppercase">
              Physical Shortages
            </span>
          </div>
          <p className="text-[11px] text-[#8b949e] leading-relaxed mb-4">
            Reconciliation audit of weight discrepancies verified at unloading terminal weighments versus loading indexes.
          </p>
        </div>

        <div className="bg-[#0d1117]/50 border border-[#30363d] p-4 rounded-xl space-y-3.5 my-1.5 flex-1 flex flex-col justify-center">
          <div className="flex justify-between items-center pb-2.5 border-b border-[#21262d]">
            <span className="text-[11px] text-gray-400 font-mono">Discrepant Completed Voyages:</span>
            <span className={`text-xs font-black font-mono px-2 py-0.5 rounded ${tripsWithShortageCount > 0 ? 'bg-orange-500/15 text-orange-400 border border-orange-500/10' : 'bg-emerald-500/15 text-emerald-400'}`}>
              {tripsWithShortageCount} Trips
            </span>
          </div>

          <div className="flex justify-between items-center pb-2.5 border-b border-[#21262d]">
            <span className="text-[11px] text-gray-400 font-mono">Cumulative Shortage Quantity:</span>
            <span className={`text-xs font-black font-mono ${totalShortageQty > 0 ? 'text-[#ff5a1f]' : 'text-gray-400'}`}>
              {totalShortageQty.toFixed(3)} MT/KL
            </span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-[11px] text-gray-400 font-mono">Total Shortage Penalty:</span>
            <span className={`text-xs font-black font-mono ${totalShortagePenalty > 0 ? 'text-rose-400 text-sm' : 'text-gray-400'}`}>
              ₹{Math.round(totalShortagePenalty).toLocaleString('en-IN')}
            </span>
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-[#21262d]">
          <div className="flex items-center gap-1.5 bg-[#ff5a1f]/5 border border-[#ff5a1f]/10 p-2.5 rounded-xl text-[10px] text-[#ff8f3d] font-mono leading-relaxed">
            <span className="text-sm">📌</span>
            <span>
              Adjust loading/unloading weights in <strong>Trips Manager</strong>. Standard transit discrepancies automatically factor into this general auditor.
            </span>
          </div>
        </div>
      </div>
    </div>

      {activeLedgerType === 'transport' ? (
        <div className="space-y-6">
          {/* Sub Navigation Tabs */}
          <div className="flex bg-[#161b22] border border-[#30363d] p-1 rounded-xl max-w-xs text-xs font-mono ml-0 pb-1 mb-2">
            <button 
              onClick={() => setTransportSubTab('parties')}
              className={`flex-1 py-1.5 px-3 rounded-lg text-center font-bold cursor-pointer transition-all ${
                transportSubTab === 'parties' 
                  ? 'bg-blue-500 text-white shadow shadow-blue-500/20' 
                  : 'text-[#8b949e] hover:text-white'
              }`}
            >
              👥 Parties Overview
            </button>
            <button 
              onClick={() => setTransportSubTab('bills')}
              className={`flex-1 py-1.5 px-3 rounded-lg text-center font-bold cursor-pointer transition-all ${
                transportSubTab === 'bills' 
                  ? 'bg-blue-500 text-white shadow shadow-blue-500/20' 
                  : 'text-[#8b949e] hover:text-white'
              }`}
            >
              📄 Itemized Ledgers
            </button>
          </div>

          {transportSubTab === 'parties' ? (
            <div className="bg-[#161b22] border border-[#30363d] p-6 rounded-2xl">
              <div className="mb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#21262d] pb-4">
                <div>
                  <h3 className="text-base font-bold text-white">Customer & Supplier Ledger Accounts Summary</h3>
                  <p className="text-xs text-[#8b949e] font-mono mt-0.5">
                    Click any customer/supplier party row below to instant-load their complete itemized operational ledger journals and transaction logs.
                  </p>
                </div>
                <span className="text-xs bg-blue-500/10 border border-blue-500/20 text-blue-400 font-mono px-2 py-0.5 rounded font-bold uppercase w-fit">
                  Accounts Registry
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-[#8b949e]">
                  <thead>
                    <tr className="border-b border-[#30363d] font-mono text-white text-[10px] uppercase pb-2">
                      <th className="py-3">Customers / Suppliers Name</th>
                      <th className="py-3">Party Classification</th>
                      <th className="py-3 text-center">Voyages Completed</th>
                      <th className="py-3 text-right">Cumulative Delivered Volume</th>
                      <th className="py-3 text-right text-orange-400">Transit Shortage Deficit</th>
                      <th className="py-3 text-right">Pending Receipts (LRs)</th>
                      <th className="py-3 text-right text-emerald-400 font-bold">Aggregated Outstanding Book Value</th>
                      <th className="py-3 text-center text-blue-400 font-bold">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#21262d] font-sans text-white">
                    {(() => {
                      const completedTrips = trips.filter(t => t.status === 'completed');
                      
                      const summary = Array.from(partiesSet).map(party => {
                        const partyTrips = completedTrips.filter(t => {
                          const associatedLr = lrs.find(l => l.id === t.lrId);
                          return associatedLr && (associatedLr.consignerName === party || associatedLr.consigneeName === party);
                        });

                        const totalVoyages = partyTrips.length;
                        const totalRevenue = partyTrips.reduce((sum, t) => sum + (t.revenue || 0), 0);
                        const totalVolume = partyTrips.reduce((sum, t) => sum + (t.unloadingWeight || t.loadingWeight || 0), 0);
                        const qtyUnit = partyTrips[0]?.qtyUnit || 'MT/KL';

                        const pendingLrs = lrs.filter(l => (l.consignerName === party || l.consigneeName === party) && l.status === 'pending');
                        const pendingLrsCount = pendingLrs.length;

                        const isConsigner = lrs.some(l => l.consignerName === party);
                        const isConsignee = lrs.some(l => l.consigneeName === party);
                        let relationship = 'Bilateral Trade';
                        if (isConsigner && !isConsignee) relationship = 'Supplier (Consigner)';
                        if (!isConsigner && isConsignee) relationship = 'Customer (Consignee)';

                        // Calculate shortage and deduction for this party
                        const partyShortageQty = partyTrips.reduce((sum, t) => {
                          const loading = t.loadingWeight || 0;
                          const unloading = t.unloadingWeight ?? loading;
                          return sum + Math.max(0, parseFloat((loading - unloading).toFixed(3)));
                        }, 0);

                        const partyShortagePenalty = partyTrips.reduce((sum, t) => {
                          const loading = t.loadingWeight || 0;
                          const unloading = t.unloadingWeight ?? loading;
                          const shortage = Math.max(0, parseFloat((loading - unloading).toFixed(3)));
                          const rate = t.qtyUnit === 'KL' ? deductionRateKL : deductionRateMT;
                          return sum + (shortage * rate);
                        }, 0);

                        return {
                          name: party,
                          relationship,
                          totalVoyages,
                          totalRevenue,
                          totalVolume,
                          qtyUnit,
                          pendingLrsCount,
                          partyShortageQty,
                          partyShortagePenalty
                        };
                      });

                      const grandTotalRevenue = summary.reduce((sum, s) => sum + s.totalRevenue, 0);

                      return (
                        <>
                          {summary.map((partyObj, i) => (
                            <tr 
                              key={i} 
                              onClick={() => {
                                setSelectedParty(partyObj.name);
                                setTransportSubTab('bills');
                              }}
                              className="hover:bg-[#1b2028]/60 transition-all text-xs cursor-pointer group"
                            >
                              <td className="py-4 font-bold text-white group-hover:text-blue-400 transition-colors">
                                <span className="flex items-center gap-1.5">
                                  <span className="text-blue-500 text-sm">🏢</span> {partyObj.name}
                                </span>
                              </td>
                              <td className="py-4">
                                <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] bg-blue-500/10 text-blue-400 border border-blue-500/20 font-mono">
                                  {partyObj.relationship}
                                </span>
                              </td>
                              <td className="py-4 text-center font-mono text-zinc-300">
                                {partyObj.totalVoyages} Voyages
                              </td>
                              <td className="py-4 text-right font-mono text-zinc-300">
                                {partyObj.totalVolume.toLocaleString()} {partyObj.qtyUnit}
                              </td>
                              <td className="py-4 text-right font-mono">
                                {partyObj.partyShortageQty > 0 ? (
                                  <div className="text-right inline-block">
                                    <span className="text-amber-400 font-bold block">{partyObj.partyShortageQty.toFixed(3)} {partyObj.qtyUnit}</span>
                                    <span className="text-rose-400 text-[10px] block font-semibold">- ₹{Math.round(partyObj.partyShortagePenalty).toLocaleString()}</span>
                                  </div>
                                ) : (
                                  <span className="text-[#8b949e] font-mono text-[11px]">- 0.000 Deficit</span>
                                )}
                              </td>
                              <td className="py-4 text-right font-mono">
                                {partyObj.pendingLrsCount > 0 ? (
                                  <span className="text-amber-400 font-bold bg-amber-400/10 px-2 py-0.5 rounded text-[10px] border border-amber-400/20">
                                    ⚠️ {partyObj.pendingLrsCount} Outstanding
                                  </span>
                                ) : (
                                  <span className="text-emerald-400 font-semibold bg-emerald-500/10 px-2 py-0.5 rounded text-[10px] border border-emerald-500/20 font-mono font-bold">✓ Clear</span>
                                )}
                              </td>
                              <td className="py-4 text-right font-mono font-black text-emerald-400 text-sm">
                                ₹{partyObj.totalRevenue.toLocaleString()}
                              </td>
                              <td className="py-4 text-center">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedParty(partyObj.name);
                                    setTransportSubTab('bills');
                                  }}
                                  className="px-2.5 py-1 bg-blue-500/10 hover:bg-blue-500/25 text-blue-400 border border-blue-500/20 rounded font-mono text-[10px] cursor-pointer transition-all"
                                >
                                  🔍 View Ledger
                                </button>
                              </td>
                            </tr>
                          ))}

                          {summary.length === 0 ? (
                            <tr>
                              <td colSpan={8} className="text-center py-10 italic text-[#8b949e]">
                                No customer or supplier parties registered in actual database.
                              </td>
                            </tr>
                          ) : (
                            <tr className="bg-[#1b2028]/20 font-bold border-t border-[#30363d] text-xs">
                              <td colSpan={6} className="py-4 text-right text-white font-semibold">Aggregated Parties Ledger Balance:</td>
                              <td className="py-4 text-right text-emerald-400 font-mono text-sm font-black">
                                ₹{grandTotalRevenue.toLocaleString()}
                              </td>
                              <td className="py-4"></td>
                            </tr>
                          )}
                        </>
                      );
                    })()}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Party Filter and Export Bar */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-[#161b22] border border-[#30363d] p-4 rounded-xl">
                <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
                  <button
                    onClick={() => {
                      setSelectedParty('All Parties');
                      setTransportSubTab('parties');
                    }}
                    className="px-3 py-1.5 bg-[#0d1117] hover:bg-[#21262d] border border-[#30363d] text-white hover:text-blue-400 rounded-lg text-xs font-bold font-mono transition-all flex items-center gap-1 cursor-pointer"
                  >
                    ← Back to Summary
                  </button>
                  <div className="h-4 w-px bg-[#30363d]" />
                  <span className="text-xs text-[#8b949e] font-mono whitespace-nowrap">Filter Party:</span>
                  <select 
                    value={selectedParty}
                    onChange={(e) => setSelectedParty(e.target.value)}
                    className="bg-[#0d1117] border border-[#30363d] text-white text-xs px-3 py-2 rounded-lg outline-none w-full sm:w-48 cursor-pointer"
                  >
                {partiesList.map((p, idx) => (
                  <option key={idx} value={p}>{p}</option>
                ))}
              </select>

              <div className="h-4 w-px bg-[#30363d] hidden md:block" />
              
              {/* Select Month */}
              <span className="text-[#8b949e] font-mono text-xs whitespace-nowrap">Month:</span>
              <select 
                value={selectedLedgerMonth}
                onChange={(e) => setSelectedLedgerMonth(e.target.value === 'all' ? 'all' : parseInt(e.target.value))}
                className="bg-[#0d1117] border border-[#30363d] text-white text-xs px-2.5 py-1.5 rounded-lg outline-none cursor-pointer"
              >
                <option value="all">All Months</option>
                {['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].map((m, idx) => (
                  <option key={idx} value={idx + 1}>{m}</option>
                ))}
              </select>

              {/* Select Year */}
              <span className="text-[#8b949e] font-mono text-xs whitespace-nowrap">Year:</span>
              <select 
                value={selectedLedgerYear}
                onChange={(e) => setSelectedLedgerYear(e.target.value === 'all' ? 'all' : parseInt(e.target.value))}
                className="bg-[#0d1117] border border-[#30363d] text-white text-xs px-2.5 py-1.5 rounded-lg outline-none cursor-pointer"
              >
                <option value="all">All Years</option>
                <option value={2024}>2024</option>
                <option value={2025}>2025</option>
                <option value={2026}>2026</option>
                <option value={2027}>2027</option>
              </select>

              {/* Select Driver */}
              <span className="text-[#8b949e] font-mono text-xs whitespace-nowrap">Driver:</span>
              <select 
                value={selectedLedgerDriver}
                onChange={(e) => setSelectedLedgerDriver(e.target.value)}
                className="bg-[#0d1117] border border-[#30363d] text-white text-xs px-2.5 py-1.5 rounded-lg outline-none cursor-pointer w-full sm:w-36"
              >
                <option value="all">All Drivers</option>
                {drivers.map(d => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>

              {/* Shortage Toggle */}
              <label className="flex items-center gap-1.5 text-[#ff7a4e] font-mono text-[10px] cursor-pointer ml-1 select-none">
                <input 
                  type="checkbox"
                  checked={selectedLedgerShortageOnly}
                  onChange={(e) => setSelectedLedgerShortageOnly(e.target.checked)}
                  className="w-3.5 h-3.5 rounded bg-[#0d1117] border-[#30363d] accent-orange-500"
                />
                SHORTAGE ONLY
              </label>
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <button 
                onClick={exportTransportLedger}
                className="w-full sm:w-auto px-4 py-2 bg-emerald-600/10 hover:bg-emerald-600/25 border border-emerald-500/20 text-emerald-400 font-semibold rounded-lg text-xs inline-flex items-center justify-center gap-1.5 cursor-pointer transition-all"
              >
                <Download className="w-4 h-4" />
                Excel Export
              </button>
              <button 
                onClick={exportTransportLedgerPDF}
                className="w-full sm:w-auto px-4 py-2 bg-red-600/10 hover:bg-red-600/25 border border-red-500/20 text-red-400 font-semibold rounded-lg text-xs inline-flex items-center justify-center gap-1.5 cursor-pointer transition-all"
              >
                <Download className="w-4 h-4" />
                PDF Export
              </button>
            </div>
          </div>

          {/* Ledger Grid Info */}
          <div className="bg-[#161b22] border border-[#30363d] p-6 rounded-2xl">
            <h3 className="text-base font-bold text-white mb-5 flex items-center justify-between">
              <span>Transport Ledger Sheet (FY 2026-27)</span>
              <span className="text-xs bg-blue-500/10 border border-blue-500/20 text-blue-400 font-mono px-2 py-0.5 rounded">
                Active Financial Books
              </span>
            </h3>

            {/* List of Bills/Transactions */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-[#8b949e]">
                <thead>
                  <tr className="border-b border-[#30363d] font-mono text-white text-[10px] uppercase pb-2">
                    <th className="py-3 pl-2">Dated</th>
                    <th className="py-3">Party Name (Billed)</th>
                    <th className="py-3">LR Number</th>
                    <th className="py-3">Tanker Plate No.</th>
                    <th className="py-3">Product Spec</th>
                    <th className="py-3 text-center">Invoiced Weight</th>
                    <th className="py-3 text-center text-orange-400">Shortage (Deficit)</th>
                    <th className="py-3 text-right text-rose-400 font-bold">Penalty Deduction</th>
                    <th className="py-3 text-right">Freight Rate</th>
                    <th className="py-3 text-right">Aggregate Invoiced (INR)</th>
                    <th className="py-3 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#21262d] font-sans">
                  {(() => {
                    const completedTrips = trips.filter(t => t.status === 'completed');
                    const filtered = completedTrips.filter(t => {
                      const associatedLr = lrs.find(l => l.id === t.lrId);
                      if (!associatedLr) return false;
                      
                      // Party filter
                      if (selectedParty !== 'All Parties') {
                        if (associatedLr.consignerName !== selectedParty && associatedLr.consigneeName !== selectedParty) {
                          return false;
                        }
                      }

                      // Date / Month / Year selectors
                      const tripDateStr = t.endDate || t.startDate;
                      if (tripDateStr) {
                        const [tYear, tMonth] = tripDateStr.split('-').map(Number);
                        if (selectedLedgerMonth !== 'all' && tMonth !== selectedLedgerMonth) {
                          return false;
                        }
                        if (selectedLedgerYear !== 'all' && tYear !== selectedLedgerYear) {
                          return false;
                        }
                      }

                      // Driver filter
                      if (selectedLedgerDriver !== 'all' && t.driverId !== selectedLedgerDriver) {
                        return false;
                      }

                      // Shortage filter check
                      if (selectedLedgerShortageOnly) {
                        const loadingVal = t.loadingWeight || 0;
                        const unloadingVal = t.unloadingWeight ?? loadingVal;
                        const shortageQtyVal = Math.max(0, parseFloat((loadingVal - unloadingVal).toFixed(3)));
                        if (shortageQtyVal <= 0.005) {
                          return false;
                        }
                      }

                      return true;
                    });

                    let totalSum = 0;

                    return (
                      <>
                        {filtered.map((t) => {
                          const associatedLr = lrs.find(l => l.id === t.lrId);
                          const totalRevenue = t.revenue || 0;
                          totalSum += totalRevenue;
                          
                          const isExpanded = expandedLedgerTripId === t.id;
                          const tExpenses = (expenses || []).filter(e => e.tripId === t.id);

                          return (
                            <tr 
                              key={t.id}
                              onClick={() => setSelectedDetailTrip(t)}
                              className="hover:bg-[#1b2028]/40 text-xs py-3 text-[#c9d1d9] transition-all cursor-pointer border-b border-[#21262d]"
                            >
                              <td className="py-3 pl-2">
                                <span>{t.endDate || t.startDate}</span>
                              </td>
                              <td className="py-3 font-semibold text-orange-400 font-sans max-w-[130px] truncate" title={associatedLr?.consignerName || "Industrial Chemie (Self)"}>
                                {associatedLr?.consignerName || "Industrial Chemie (Self)"}
                              </td>
                              <td className="py-3 font-mono font-bold text-[#ff5a5f]">{t.lrNo}</td>
                              <td className="py-3 font-semibold text-white">{t.tankerNumber}</td>
                              <td className="py-3 font-mono text-[11px]">{associatedLr?.product || 'Petroleum'}</td>
                              <td className="py-3 text-center font-bold text-white">
                                {t.unloadingWeight || t.loadingWeight} {t.qtyUnit}
                              </td>
                              <td className="py-3 text-center font-mono">
                                {(() => {
                                  const loadingVal = t.loadingWeight || 0;
                                  const unloadingVal = t.unloadingWeight ?? loadingVal;
                                  const shortageQtyVal = Math.max(0, parseFloat((loadingVal - unloadingVal).toFixed(3)));
                                  return shortageQtyVal > 0 ? (
                                    <span className="text-orange-400 font-bold bg-orange-400/5 border border-orange-500/10 px-1.5 py-0.5 rounded text-[10.5px]">
                                      {shortageQtyVal.toFixed(3)} {t.qtyUnit}
                                    </span>
                                  ) : (
                                    <span className="text-gray-600 font-mono text-[10.5px]">- 0.000</span>
                                  );
                                })()}
                              </td>
                              <td className="py-3 text-right font-mono">
                                {(() => {
                                  const loadingVal = t.loadingWeight || 0;
                                  const unloadingVal = t.unloadingWeight ?? loadingVal;
                                  const shortageQtyVal = Math.max(0, parseFloat((loadingVal - unloadingVal).toFixed(3)));
                                  const rateUsedVal = t.qtyUnit === 'KL' ? deductionRateKL : deductionRateMT;
                                  const penaltyDeductionVal = shortageQtyVal * rateUsedVal;
                                  return penaltyDeductionVal > 0 ? (
                                    <span className="text-rose-450 text-rose-400 font-bold">
                                      - ₹{Math.round(penaltyDeductionVal).toLocaleString()}
                                    </span>
                                  ) : (
                                    <span className="text-gray-600">-</span>
                                  );
                                })()}
                              </td>
                              <td className="py-3 text-right font-mono text-[11px]">₹{t.freightRateAtEnd || 'N/A'}</td>
                              <td className="py-3 text-right font-bold text-white font-mono text-[13px]">
                                <span>₹{totalRevenue.toLocaleString()}</span>
                              </td>
                              <td className="py-3 text-center" onClick={(e) => e.stopPropagation()}>
                                <div className="flex items-center justify-center gap-1.5">
                                  <span className="text-[9px] text-[#ff5a1f]/80 uppercase font-mono font-bold hover:underline cursor-pointer" onClick={() => setSelectedDetailTrip(t)}>🔍 View</span>
                                  {onDeleteTrip && (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        onDeleteTrip(t.id);
                                      }}
                                      className="px-1.5 py-0.5 bg-rose-500/15 hover:bg-rose-500 text-rose-400 hover:text-white rounded border border-rose-500/20 text-[9.5px]/none font-black font-mono cursor-pointer transition-colors"
                                      title="Trash Completed Voyage Record"
                                    >
                                      TRASH
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}

                        {filtered.length === 0 ? (
                          <tr>
                            <td colSpan={11} className="text-center py-10 italic text-[#8b949e]">
                              No matching logged and finished transport records found for financial year books.
                            </td>
                          </tr>
                        ) : (
                          <tr className="bg-[#1b2028]/20 font-bold border-t border-[#30363d]">
                            <td colSpan={8} className="py-4 text-right text-white font-semibold">Aggregate Book Balance:</td>
                            <td className="py-4 text-right text-emerald-400 font-mono text-base font-black">
                              ₹{totalSum.toLocaleString()}
                            </td>
                            <td colSpan={2}></td>
                          </tr>
                        )}
                      </>
                    );
                  })()}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
      ) : (activeLedgerType === 'repair' || activeLedgerType === 'maintenance') ? (
        <div className="space-y-6">
          {/* Sub tab Selector */}
          <div className="flex bg-[#161b22] border border-[#30363d] p-1 rounded-xl max-w-xs text-xs font-mono font-sans select-none">
            <button 
              onClick={() => setRepairSubTab('creditors')}
              className={`flex-1 py-1.5 px-3 rounded-lg text-center font-bold cursor-pointer transition-all ${
                repairSubTab === 'creditors' 
                  ? (activeLedgerType === 'maintenance' ? 'bg-amber-500 text-white shadow' : 'bg-[#ff5a5f] text-white shadow') 
                  : 'text-[#8b949e] hover:text-white'
              }`}
            >
              👥 Creditors Summary
            </button>
            <button 
              onClick={() => setRepairSubTab('bills')}
              className={`flex-1 py-1.5 px-3 rounded-lg text-center font-bold cursor-pointer transition-all ${
                repairSubTab === 'bills' 
                  ? (activeLedgerType === 'maintenance' ? 'bg-amber-500 text-white shadow' : 'bg-[#ff5a5f] text-white shadow') 
                  : 'text-[#8b949e] hover:text-white'
              }`}
            >
              🧾 Detailed Invoices
            </button>
          </div>

          {repairSubTab === 'creditors' ? (
            <div className="space-y-6">
              {/* Creditors grid info */}
              <div className="bg-[#161b22] border border-[#30363d] p-6 rounded-2xl">
                <div className="mb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#21262d] pb-4">
                  <div>
                    <h3 className="text-base font-bold text-white">
                      {activeLedgerType === 'maintenance' ? 'Preventive Maintenance' : 'Repair & Spares'} Dealers (Creditors) Accounts
                    </h3>
                    <p className="text-xs text-[#8b949e] font-mono mt-0.5">
                      {activeLedgerType === 'maintenance' ? 'Aggregate preventive service credit, clearances, and fleet up-keep balances' : 'Aggregate supplier credit, cleared balances, and direct settlements'}
                    </p>
                  </div>
                  <span className={`text-xs ${activeLedgerType === 'maintenance' ? 'bg-amber-500/10 border-amber-500/20 text-amber-500' : 'bg-red-500/10 border-red-500/20 text-red-400'} border px-2 py-0.5 rounded font-mono font-bold uppercase shrink-0`}>
                    {activeLedgerType === 'maintenance' ? 'Preventive maintenance' : 'Workshop repairs'} View
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-[#8b949e]">
                    <thead>
                      <tr className="border-b border-[#30363d] font-mono text-white text-[10px] uppercase pb-2">
                        <th className="py-3">Dealer / Vendor Name</th>
                        <th className="py-3 text-center">Invoiced Bills Count</th>
                        <th className="py-3 text-right">Total Business Outflow</th>
                        <th className="py-3 text-right">Cleared Balance</th>
                        <th className="py-3 text-right text-orange-400">Outstanding Creditor Balance</th>
                        <th className="py-3 text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#21262d] font-sans text-white">
                      {(() => {
                        // Derive summary for each unique vendor
                        const summary = Array.from(repairVendorsSet).map(vendor => {
                          const vendorBills = repairBills.filter(b => b.vendorName === vendor);
                          const totalBills = vendorBills.length;
                          const outstanding = vendorBills.filter(b => b.status === 'pending').reduce((sum, b) => sum + b.amount, 0);
                          const cleared = vendorBills.filter(b => b.status === 'collected').reduce((sum, b) => sum + b.amount, 0);
                          const totalExpense = vendorBills.reduce((sum, b) => sum + b.amount, 0);
                          const pendingList = vendorBills.filter(b => b.status === 'pending');

                          return {
                            name: vendor,
                            totalBills,
                            outstanding,
                            cleared,
                            totalExpense,
                            pendingList
                          };
                        });

                        const grandOutstanding = summary.reduce((sum, s) => sum + s.outstanding, 0);
                        const grandCleared = summary.reduce((sum, s) => sum + s.cleared, 0);

                        return (
                          <>
                            {summary.map((creditor, i) => (
                              <tr key={i} className="hover:bg-[#1b2028]/40 transition-all text-xs">
                                <td className="py-4 font-bold text-white">{creditor.name}</td>
                                <td className="py-4 text-center font-mono">{creditor.totalBills} Bills</td>
                                <td className="py-4 text-right font-mono">₹{creditor.totalExpense.toLocaleString()}</td>
                                <td className="py-4 text-right font-mono text-emerald-400 font-semibold">₹{creditor.cleared.toLocaleString()}</td>
                                <td className="py-4 text-right font-mono font-black text-orange-400 text-sm">
                                  ₹{creditor.outstanding.toLocaleString()}
                                </td>
                                <td className="py-4 text-center space-x-2">
                                  <button
                                    onClick={() => {
                                      setSelectedVendor(creditor.name);
                                      setRepairSubTab('bills');
                                    }}
                                    className="px-2.5 py-1 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/20 rounded font-mono text-[10px] cursor-pointer"
                                  >
                                    🔍 Invoices
                                  </button>
                                  {creditor.outstanding > 0 && (
                                    <button
                                      onClick={() => {
                                        triggerConfirm(
                                          "Confirm Settle Invoice Balance",
                                          `Confirm settling all ${creditor.pendingList.length} outstanding bills worth ₹${creditor.outstanding.toLocaleString()} with ${creditor.name}?`,
                                          () => creditor.pendingList.forEach(b => onMarkBillCollected(b.id))
                                        );
                                      }}
                                      className="px-2.5 py-1 bg-[#ff5a5f] text-white hover:opacity-95 rounded font-mono font-bold text-[10px] cursor-pointer"
                                    >
                                      ⚡ Settle All Due
                                    </button>
                                  )}
                                </td>
                              </tr>
                            ))}

                            {summary.length === 0 ? (
                              <tr>
                                <td colSpan={6} className="text-center py-10 italic text-[#8b949e]">
                                  No repair dealers registered in the database.
                                </td>
                              </tr>
                            ) : (
                              <tr className="bg-[#1b2028]/20 font-bold border-t border-[#30363d] text-xs">
                                <td colSpan={3} className="py-4 text-right text-white">Aggregated Creditor Ledger Summary:</td>
                                <td className="py-4 text-right text-emerald-400 font-mono font-bold">₹{grandCleared.toLocaleString()}</td>
                                <td className="py-4 text-right text-orange-400 font-mono text-sm font-black">
                                  ₹{grandOutstanding.toLocaleString()}
                                </td>
                                <td className="py-4"></td>
                              </tr>
                            )}
                          </>
                        );
                      })()}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Repair Filter and Export Bar */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-[#161b22] border border-[#30363d] p-4 rounded-xl">
                <div className="flex items-center gap-3 w-full sm:w-auto">
                  <span className="text-xs text-[#8b949e] font-mono whitespace-nowrap">Filter Vendor:</span>
                  <select 
                    value={selectedVendor}
                    onChange={(e) => setSelectedVendor(e.target.value)}
                    className="bg-[#0d1117] border border-[#30363d] text-white text-xs px-3 py-2 rounded-lg outline-none w-full sm:w-48"
                  >
                    <option value="All Vendors">All Vendors</option>
                    {repairVendorsList.filter(v => v !== 'All Vendors').map((v, idx) => (
                      <option key={idx} value={v}>{v}</option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col sm:flex-row gap-2">
                  <button 
                    onClick={() => setShowStatementImportModal(true)}
                    className="w-full sm:w-auto px-4 py-2 bg-cyan-600/10 hover:bg-cyan-600/25 border border-cyan-500/20 text-cyan-400 font-semibold rounded-lg text-xs inline-flex items-center justify-center gap-1.5 cursor-pointer transition-all"
                    title="Upload and parse statement of accounts via Gemini AI"
                  >
                    <Upload className="w-4 h-4" />
                    AI Statement Import
                  </button>
                  <button 
                    onClick={exportRepairLedger}
                    className="w-full sm:w-auto px-4 py-2 bg-emerald-600/10 hover:bg-emerald-600/25 border border-emerald-500/20 text-emerald-400 font-semibold rounded-lg text-xs inline-flex items-center justify-center gap-1.5 cursor-pointer transition-all"
                  >
                    <Download className="w-4 h-4" />
                    Excel Export
                  </button>
                  <button 
                    onClick={exportRepairLedgerPDF}
                    className="w-full sm:w-auto px-4 py-2 bg-red-600/10 hover:bg-red-600/25 border border-red-500/20 text-red-400 font-semibold rounded-lg text-xs inline-flex items-center justify-center gap-1.5 cursor-pointer transition-all"
                  >
                    <Download className="w-4 h-4" />
                    PDF Export
                  </button>
                </div>
              </div>

              {/* Repair Bills ledger list */}
              <div className="bg-[#161b22] border border-[#30363d] p-6 rounded-2xl">
                <h3 className="text-base font-bold text-white mb-5 flex items-center justify-between">
                  <span>Detailed Repair Invoices List {selectedVendor !== 'All Vendors' ? `- ${selectedVendor}` : ''}</span>
                  <span className="text-xs bg-orange-400/10 border border-orange-400/20 text-orange-400 font-mono px-2 py-0.5 rounded">
                    Invoiced Register
                  </span>
                </h3>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-[#8b949e]">
                    <thead>
                      <tr className="border-b border-[#30363d] font-mono text-white text-[10px] uppercase pb-2">
                        <th className="py-3">Bill Date</th>
                        <th className="py-3">Bill Number</th>
                        <th className="py-3">Tanker Plate</th>
                        <th className="py-3">Repair Vendor</th>
                        <th className="py-3">Service & Repair Details</th>
                        <th className="py-3 text-right">Amount (INR)</th>
                        <th className="py-3 text-center">Payment Status</th>
                        {onDeleteBill && <th className="py-3 text-center">Action</th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#21262d] font-sans">
                      {(() => {
                        const filtered = repairBills.filter(b => {
                          if (selectedVendor === 'All Vendors') return true;
                          return b.vendorName === selectedVendor;
                        });

                        let totalPending = 0;
                        let totalCleared = 0;

                        return (
                          <>
                            {filtered.map((b) => {
                              if (b.status === 'pending') totalPending += b.amount;
                              else totalCleared += b.amount;

                              return (
                                <tr 
                                  key={b.id} 
                                  onClick={() => setSelectedDetailShipmateInvoice(b)}
                                  className="hover:bg-[#1b2028]/40 text-xs py-3.5 text-[#c9d1d9] transition-all cursor-pointer"
                                  title="Click to view interactive detailed auditing certificate"
                                >
                                  <td className="py-3.5 pl-2">{b.date}</td>
                                  <td className="py-3.5 font-mono font-bold">
                                    <span className="text-emerald-400 hover:text-emerald-300 underline underline-offset-2">
                                      {b.billNo}
                                    </span>
                                  </td>
                                  <td className="py-3.5 font-semibold text-white uppercase">{b.tankerNumber}</td>
                                  <td className="py-3.5 text-white font-medium">{b.vendorName}</td>
                                  <td className="py-3.5 max-w-[200px] truncate" title={b.detail}>
                                    {b.workType ? <span className="text-[#8b949e] font-bold mr-1">[{b.workType}]</span> : null}
                                    {b.detail}
                                  </td>
                                  <td className="py-3.5 text-right font-bold text-white font-mono text-[13px]">
                                    ₹{b.amount.toLocaleString()}
                                  </td>
                                  <td className="py-3.5 text-center" onClick={(e) => e.stopPropagation()}>
                                    {b.status === 'pending' ? (
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          onMarkBillCollected(b.id);
                                        }}
                                        className="px-2.5 py-1 bg-[#ff5a5f]/10 hover:bg-[#ff5a5f]/20 border border-[#ff5a5f]/30 text-[#ff5a5f] rounded font-mono font-bold text-[10px] cursor-pointer"
                                      >
                                        Mark Settled
                                      </button>
                                    ) : (
                                      <span className="inline-flex items-center gap-1 text-emerald-400 text-[10px] font-bold font-mono">
                                        <CheckCircle className="w-3.5 h-3.5" /> CLEARED
                                      </span>
                                    )}
                                  </td>
                                  {onDeleteBill && (
                                    <td className="py-3.5 text-center" onClick={(e) => e.stopPropagation()}>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          onDeleteBill(b.id);
                                        }}
                                        className="px-2 py-1 bg-rose-500/10 border border-rose-500/20 hover:bg-rose-500 text-rose-400 hover:text-white rounded text-[10px] font-bold font-mono cursor-pointer transition-all"
                                        title="Move Invoice to System Trash"
                                      >
                                        Trash
                                      </button>
                                    </td>
                                  )}
                                </tr>
                              );
                            })}

                            {filtered.length === 0 ? (
                              <tr>
                                <td colSpan={onDeleteBill ? 8 : 7} className="text-center py-10 italic text-[#8b949e]">
                                  No registered repair maintenance bills logs found in books.
                                </td>
                              </tr>
                            ) : (
                              <tr className="bg-[#1b2028]/20 font-bold border-t border-[#30363d]">
                                <td colSpan={5} className="py-4 text-right text-white font-semibold">
                                  Outstanding Pending Settled:
                                </td>
                                <td className="py-4 text-right text-orange-400 font-mono text-sm font-black">
                                  ₹{totalPending.toLocaleString()}
                                </td>
                                <td className="py-4 text-center text-xs text-[#8b949e]">
                                  (Cleared value: ₹{totalCleared.toLocaleString()})
                                </td>
                                {onDeleteBill && <td className="py-4"></td>}
                              </tr>
                            )}
                          </>
                        );
                      })()}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : activeLedgerType === 'adblue' ? (
        /* AdBlue Department Branch */
        <div className="space-y-6">
          {/* AdBlue Sub tab Selector */}
          <div className="flex bg-[#161b22] border border-[#30363d] p-1 rounded-xl max-w-md text-xs font-mono">
            <button 
              onClick={() => setAdblueSubTab('creditors')}
              className={`flex-1 py-1.5 px-3 rounded-lg text-center font-bold cursor-pointer transition-all ${
                adblueSubTab === 'creditors' 
                  ? 'bg-cyan-600 text-white shadow' 
                  : 'text-[#8b949e] hover:text-white'
              }`}
            >
              👥 Dealer Creditors
            </button>
            <button 
              onClick={() => setAdblueSubTab('analytical')}
              className={`flex-1 py-1.5 px-3 rounded-lg text-center font-bold cursor-pointer transition-all ${
                adblueSubTab === 'analytical' 
                  ? 'bg-cyan-600 text-white shadow' 
                  : 'text-[#8b949e] hover:text-white'
              }`}
            >
              📊 Tanker break-ups
            </button>
            <button 
              onClick={() => setAdblueSubTab('bills')}
              className={`flex-1 py-1.5 px-3 rounded-lg text-center font-bold cursor-pointer transition-all ${
                adblueSubTab === 'bills' 
                  ? 'bg-cyan-600 text-white shadow' 
                  : 'text-[#8b949e] hover:text-white'
              }`}
            >
              🧾 Detailed Bills
            </button>
          </div>

          {adblueSubTab === 'creditors' ? (
            <div className="space-y-6">
              {/* Adblue Creditors accounts */}
              <div className="bg-[#161b22] border border-[#30363d] p-6 rounded-2xl">
                <div className="mb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#21262d] pb-4">
                  <div>
                    <h3 className="text-base font-bold text-white">AdBlue Suppliers (Creditors) Account Ledgers</h3>
                    <p className="text-xs text-[#8b949e] font-mono mt-0.5">Dealer balance levels, outstanding credits payable, and settlements</p>
                  </div>
                  <span className="text-xs bg-cyan-400/10 border border-cyan-400/20 text-cyan-400 font-mono px-2 py-0.5 rounded font-bold uppercase shrink-0">
                    AdBlue Creditors
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-[#8b949e]">
                    <thead>
                      <tr className="border-b border-[#30363d] font-mono text-white text-[10px] uppercase pb-2">
                        <th className="py-3">Dealers / Supplier Name</th>
                        <th className="py-3 text-center">Invoiced Bills Count</th>
                        <th className="py-3 text-right">Total Business Outflow</th>
                        <th className="py-3 text-right">Cleared Balance</th>
                        <th className="py-3 text-right text-orange-400">Outstanding AdBlue Credit Due</th>
                        <th className="py-3 text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#21262d] font-sans text-white">
                      {(() => {
                        const summary = Array.from(adblueVendorsSet).map(vendor => {
                          const vendorBills = adblueBills.filter(b => b.vendorName === vendor);
                          const totalBills = vendorBills.length;
                          const outstanding = vendorBills.filter(b => b.status === 'pending').reduce((sum, b) => sum + b.amount, 0);
                          const cleared = vendorBills.filter(b => b.status === 'collected').reduce((sum, b) => sum + b.amount, 0);
                          const totalExpense = vendorBills.reduce((sum, b) => sum + b.amount, 0);
                          const pendingList = vendorBills.filter(b => b.status === 'pending');

                          return {
                            name: vendor,
                            totalBills,
                            outstanding,
                            cleared,
                            totalExpense,
                            pendingList
                          };
                        });

                        const grandOutstanding = summary.reduce((sum, s) => sum + s.outstanding, 0);
                        const grandCleared = summary.reduce((sum, s) => sum + s.cleared, 0);

                        return (
                          <>
                            {summary.map((creditor, i) => (
                              <tr key={i} className="hover:bg-[#1b2028]/40 transition-all text-xs">
                                <td className="py-4 font-bold text-white">{creditor.name}</td>
                                <td className="py-4 text-center font-mono">{creditor.totalBills} Bills</td>
                                <td className="py-4 text-right font-mono font-bold">₹{creditor.totalExpense.toLocaleString()}</td>
                                <td className="py-4 text-right font-mono text-emerald-400 font-bold">₹{creditor.cleared.toLocaleString()}</td>
                                <td className="py-4 text-right font-mono font-black text-orange-400 text-sm">
                                  ₹{creditor.outstanding.toLocaleString()}
                                </td>
                                <td className="py-4 text-center space-x-2">
                                  <button
                                    onClick={() => {
                                      setSelectedAdblueVendor(creditor.name);
                                      setAdblueSubTab('bills');
                                    }}
                                    className="px-2.5 py-1 bg-cyan-400/15 hover:bg-cyan-400/20 text-cyan-400 border border-cyan-400/20 rounded font-mono text-[10px] cursor-pointer"
                                  >
                                    🔍 Bills list
                                  </button>
                                  {creditor.outstanding > 0 && (
                                    <button
                                      onClick={() => {
                                        triggerConfirm(
                                          "Settle AdBlue Fuel Bills",
                                          `Confirm settling all ${creditor.pendingList.length} outstanding AdBlue fuel bills worth ₹${creditor.outstanding.toLocaleString()} with ${creditor.name}?`,
                                          () => creditor.pendingList.forEach(b => onMarkBillCollected(b.id))
                                        );
                                      }}
                                      className="px-2.5 py-1 bg-cyan-500 text-[#0d1117] hover:bg-cyan-400 rounded font-mono font-bold text-[10px] cursor-pointer"
                                    >
                                      ⚡ Pay Cleared
                                    </button>
                                  )}
                                </td>
                              </tr>
                            ))}

                            {summary.length === 0 ? (
                              <tr>
                                <td colSpan={6} className="text-center py-10 italic text-[#8b949e]">
                                  No registered AdBlue dealers logs found yet. Register an AdBlue refill inside Expenses or the AdBlue compliance sheet.
                                </td>
                              </tr>
                            ) : (
                              <tr className="bg-[#1b2028]/20 font-bold border-t border-[#30363d] text-xs">
                                <td colSpan={3} className="py-4 text-right text-white font-semibold">Aggregated AdBlue Credit Balance:</td>
                                <td className="py-4 text-right text-emerald-400 font-mono font-bold">₹{grandCleared.toLocaleString()}</td>
                                <td className="py-4 text-right text-orange-400 font-mono text-sm font-black">
                                  ₹{grandOutstanding.toLocaleString()}
                                </td>
                                <td className="py-4"></td>
                              </tr>
                            )}
                          </>
                        );
                      })()}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : adblueSubTab === 'analytical' ? (
            <div className="space-y-6">
              {/* Separate Analytical breakout to calculate how much adblue per tanker was used */}
              <div className="bg-[#161b22] border border-[#30363d] p-6 rounded-2xl">
                <div className="mb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#21262d] pb-4">
                  <div>
                    <h3 className="text-base font-bold text-white">AdBlue Consumption Audit per Tanker Vehicle</h3>
                    <p className="text-xs text-[#8b949e] font-mono mt-0.5">Calculates precise cumulative and unlinked AdBlue volumes used per tanker registry</p>
                  </div>
                  <span className="text-xs bg-cyan-400/10 border border-cyan-400/20 text-cyan-400 font-mono px-2 py-0.5 rounded font-bold uppercase shrink-0">
                    Vehicle Wise Audit Breakups
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {tankers.map((tanker) => {
                    // Extract tanker specific adblue bills
                    const tankerBills = adblueBills.filter(b => b.tankerId === tanker.id);
                    const totalCost = tankerBills.reduce((sum, b) => sum + b.amount, 0);
                    
                    // Parse liters from descriptions
                    const totalLiters = tankerBills.reduce((sum, b) => {
                      const matches = b.detail.match(/(\d+(\.\d+)?)\s*(L|Liters|Ltr)/i);
                      return sum + (matches ? parseFloat(matches[1]) : b.amount / 90);
                    }, 0);

                    // Outstanding credit to vendors
                    const outstanding = tankerBills.filter(b => b.status === 'pending').reduce((sum, b) => sum + b.amount, 0);

                    return (
                      <motion.div 
                        initial={{ opacity: 0, scale: 0.98 }}
                        animate={{ opacity: 1, scale: 1 }}
                        key={tanker.id} 
                        className="bg-[#0f141c] border border-[#30363d] p-5 rounded-2xl shadow hover:border-cyan-500/20 transition-all space-y-3"
                      >
                        <div className="flex justify-between items-center pb-2 border-b border-[#21262d]">
                          <span className="text-xs text-white font-black font-mono tracking-wider uppercase bg-[#161b22] px-3 py-1 border border-[#30363d] rounded-lg">
                            🚚 {tanker.tankerNumber}
                          </span>
                          <span className="text-[10px] font-mono text-cyan-400 font-bold uppercase bg-cyan-500/10 border border-cyan-500/20 px-2 py-0.5 rounded">
                            BS-VI Active Audit
                          </span>
                        </div>

                        <div className="space-y-4">
                          <div className="flex justify-between items-end">
                            <span className="text-[10.5px] font-mono text-[#8b949e] uppercase">AdBlue Liters Consumed</span>
                            <span className="text-xl font-black font-mono text-cyan-400">{totalLiters.toFixed(1)} L</span>
                          </div>

                          <div className="flex justify-between items-end">
                            <span className="text-[10.5px] font-mono text-[#8b949e] uppercase">Total Cost Incurred</span>
                            <span className="text-sm font-bold font-mono text-white">₹{totalCost.toLocaleString()}</span>
                          </div>

                          <div className="pt-2 border-t border-[#21262d] flex justify-between items-end text-[11px] font-mono">
                            <span className="text-[#8b949e]">Pending outstanding:</span>
                            <span className={`font-bold ${outstanding > 0 ? 'text-orange-400' : 'text-emerald-400'}`}>
                              ₹{outstanding.toLocaleString()}
                            </span>
                          </div>

                          <div className="text-[10px] text-[#8b949e] italic leading-relaxed pt-1.5 font-mono">
                            📊 Average efficiency ratio parsed: {(totalLiters / (tankerBills.length || 1)).toFixed(1)} Liters refilled per logged invoice.
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Adblue Filter and Export Bar */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-[#161b22] border border-[#30363d] p-4 rounded-xl">
                <div className="flex items-center gap-3 w-full sm:w-auto">
                  <span className="text-xs text-[#8b949e] font-mono whitespace-nowrap">Filter Supplier:</span>
                  <select 
                    value={selectedAdblueVendor}
                    onChange={(e) => setSelectedAdblueVendor(e.target.value)}
                    className="bg-[#0d1117] border border-[#30363d] text-white text-xs px-3 py-2 rounded-lg outline-none w-full sm:w-48"
                  >
                    <option value="All Suppliers">All Suppliers</option>
                    {adblueVendorsList.filter(v => v !== 'All Suppliers').map((v, idx) => (
                      <option key={idx} value={v}>{v}</option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col sm:flex-row gap-2">
                  <button 
                    onClick={() => setShowStatementImportModal(true)}
                    className="w-full sm:w-auto px-4 py-2 bg-cyan-600/10 hover:bg-cyan-600/25 border border-cyan-500/20 text-cyan-400 font-semibold rounded-lg text-xs inline-flex items-center justify-center gap-1.5 cursor-pointer transition-all"
                    title="Upload and parse statement of accounts via Gemini AI"
                  >
                    <Upload className="w-4 h-4" />
                    AI Statement Import
                  </button>
                  <button 
                    onClick={exportAdblueLedger}
                    className="w-full sm:w-auto px-4 py-2 bg-emerald-600/10 hover:bg-emerald-600/25 border border-emerald-500/20 text-emerald-400 font-semibold rounded-lg text-xs inline-flex items-center justify-center gap-1.5 cursor-pointer transition-all"
                  >
                    <Download className="w-4 h-4" />
                    Excel Export
                  </button>
                  <button 
                    onClick={exportAdblueLedgerPDF}
                    className="w-full sm:w-auto px-4 py-2 bg-red-600/10 hover:bg-red-600/25 border border-red-500/20 text-red-400 font-semibold rounded-lg text-xs inline-flex items-center justify-center gap-1.5 cursor-pointer transition-all"
                  >
                    <Download className="w-4 h-4" />
                    PDF Export
                  </button>
                </div>
              </div>

              {/* Adblue Bills ledger list */}
              <div className="bg-[#161b22] border border-[#30363d] p-6 rounded-2xl">
                <h3 className="text-base font-bold text-white mb-5 flex items-center justify-between">
                  <span>Detailed AdBlue Invoices {selectedAdblueVendor !== 'All Suppliers' ? `- ${selectedAdblueVendor}` : ''}</span>
                  <span className="text-xs bg-cyan-400/10 border border-[#30363d] text-cyan-400 font-mono px-2 py-0.5 rounded">
                    Invoiced Register
                  </span>
                </h3>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-[#8b949e]">
                    <thead>
                      <tr className="border-b border-[#30363d] font-mono text-white text-[10px] uppercase pb-2">
                        <th className="py-3">Bill Date</th>
                        <th className="py-3">Bill Number</th>
                        <th className="py-3">Tanker Plate No</th>
                        <th className="py-3">Dealer Supplier</th>
                        <th className="py-3">Refill Specifications Details</th>
                        <th className="py-3 text-right">Amount (INR)</th>
                        <th className="py-3 text-center">Settlement Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#21262d] font-sans">
                      {(() => {
                        const filtered = adblueBills.filter(b => {
                          if (selectedAdblueVendor === 'All Suppliers') return true;
                          return b.vendorName === selectedAdblueVendor;
                        });

                        let totalPending = 0;
                        let totalCleared = 0;

                        return (
                          <>
                            {filtered.map((b) => {
                              if (b.status === 'pending') totalPending += b.amount;
                              else totalCleared += b.amount;

                              return (
                                <tr 
                                  key={b.id} 
                                  onClick={() => setSelectedDetailShipmateInvoice(b)}
                                  className="hover:bg-[#1b2028]/40 text-xs py-3.5 text-[#c9d1d9] transition-all cursor-pointer"
                                  title="Click to view interactive detailed auditing certificate"
                                >
                                  <td className="py-3.5 pl-2">{b.date}</td>
                                  <td className="py-3.5 font-mono font-bold">
                                    <span className="text-cyan-400 hover:text-cyan-300 underline underline-offset-2">
                                      {b.billNo}
                                    </span>
                                  </td>
                                  <td className="py-3.5 font-semibold text-white uppercase">{b.tankerNumber}</td>
                                  <td className="py-3.5 text-white font-medium">{b.vendorName}</td>
                                  <td className="py-3.5" title={b.detail}>
                                    {b.workType ? <span className="text-[#8b949e] font-bold mr-1">[{b.workType}]</span> : null}
                                    {b.detail}
                                  </td>
                                  <td className="py-3.5 text-right font-bold text-white font-mono text-[13px]">
                                    ₹{b.amount.toLocaleString()}
                                  </td>
                                  <td className="py-3.5 text-center" onClick={(e) => e.stopPropagation()}>
                                    {b.status === 'pending' ? (
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          onMarkBillCollected(b.id);
                                        }}
                                        className="px-2.5 py-1 bg-cyan-400/10 hover:bg-cyan-400/20 border border-cyan-400/30 text-cyan-400 rounded font-mono font-bold text-[10px] cursor-pointer"
                                      >
                                        Mark Cleared
                                      </button>
                                    ) : (
                                      <span className="inline-flex items-center gap-1 text-emerald-400 text-[10px] font-bold font-mono">
                                        <CheckCircle className="w-3.5 h-3.5" /> CLEARED
                                      </span>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}

                            {filtered.length === 0 ? (
                              <tr>
                                <td colSpan={7} className="text-center py-10 italic text-[#8b949e]">
                                  No registered AdBlue bills logged in books.
                                </td>
                              </tr>
                            ) : (
                              <tr className="bg-[#1b2028]/20 font-bold border-t border-[#30363d]">
                                <td colSpan={5} className="py-4 text-right text-white font-semibold">
                                  Outstanding AdBlue Credit:
                                </td>
                                <td className="py-4 text-right text-orange-400 font-mono text-sm font-black">
                                  ₹{totalPending.toLocaleString()}
                                </td>
                                <td className="py-4 text-center text-xs text-[#8b949e]">
                                  (Cleared value: ₹{totalCleared.toLocaleString()})
                                </td>
                              </tr>
                            )}
                          </>
                        );
                      })()}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* ⛽ Fuel (Diesel) Register & Ledger Branch */
        <div className="space-y-6">
          {/* Executive KPIs Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="bg-[#161b22] border border-[#30363d] p-5 rounded-2xl text-white flex flex-col justify-between">
              <span className="text-[10px] font-bold text-slate-400 font-mono tracking-wider uppercase block">Carrier Logistics Org</span>
              <h4 className="text-md font-black text-white line-clamp-1 mt-1">{(currentUser?.company && currentUser.company !== "Fleet Master Petrochem Transport" ? currentUser.company : currentUser?.username) || 'DELIVR. LOGISTICS'}</h4>
              <p className="text-[10.5px] text-[#ff5a1f] font-mono font-bold mt-2">Active Transport Integrated</p>
            </div>
            
            <div className="bg-[#161b22] border border-[#30363d] p-5 rounded-2xl text-white flex flex-col justify-between">
              <span className="text-[10px] font-bold text-slate-400 font-mono tracking-wider uppercase block">Total Refueled (Books)</span>
              <h4 className="text-2xl font-black text-white font-mono mt-1">
                {((expenses || []).filter(e => e.category === 'fuel').reduce((sum, e) => sum + (e.qtyLiters || Math.round(e.amount / 95)), 0)).toLocaleString()} L
              </h4>
              <p className="text-[10.5px] text-slate-400 font-mono mt-2">Aggregate Refuel Intake Volume</p>
            </div>

            <div className="bg-[#161b22] border border-[#30363d] p-5 rounded-2xl text-white flex flex-col justify-between">
              <span className="text-[10px] font-bold text-slate-400 font-mono tracking-wider uppercase block">Financial diesel Spends</span>
              <h4 className="text-2xl font-black text-[#ff5a1f] font-mono mt-1">
                ₹{((expenses || []).filter(e => e.category === 'fuel').reduce((sum, e) => sum + e.amount, 0)).toLocaleString('en-IN')}
              </h4>
              <p className="text-[10.5px] text-slate-400 font-mono mt-2">Cleared from Transport Books</p>
            </div>

            <div className="bg-[#161b22] border border-[#30363d] p-5 rounded-2xl text-white flex flex-col justify-between">
              <span className="text-[10px] font-bold text-slate-400 font-mono tracking-wider uppercase block">Avg Rate / Liter</span>
              <h4 className="text-2xl font-black text-cyan-400 font-mono mt-1">
                ₹{(() => {
                  const fuelList = (expenses || []).filter(e => e.category === 'fuel');
                  const amt = fuelList.reduce((sum, e) => sum + e.amount, 0);
                  const lits = fuelList.reduce((sum, e) => sum + (e.qtyLiters || Math.round(e.amount / 95)), 0);
                  return lits > 0 ? (amt / lits).toFixed(2) : '94.50';
                })()}
              </h4>
              <p className="text-[10.5px] text-slate-400 font-mono mt-2">Calculated purchase average</p>
            </div>
          </div>

          <div className="flex justify-between items-center bg-[#161b22] border border-[#30363d] p-4 rounded-xl text-white">
            <h3 className="text-xs font-mono font-black text-slate-200 uppercase tracking-widest flex items-center gap-1.5">
              <span>⛽ Fuel Log Register & Manual Slips</span>
            </h3>
            <button 
              onClick={() => setShowAddFuelDirect(!showAddFuelDirect)}
              className="px-3.5 py-1.5 bg-[#ff5a1f] hover:bg-[#e04c15] text-white text-xs font-bold font-sans rounded-xl cursor-pointer shadow-md transition-all inline-flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5 text-white" />
              {showAddFuelDirect ? 'Close Form' : 'Log manual receipts'}
            </button>
          </div>

          {/* Form to log manual fuel slips directly inside ledger */}
          {showAddFuelDirect && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              className="bg-[#161b22] border border-[#30363d] p-5 rounded-2xl space-y-4"
            >
              <h4 className="text-white text-xs font-mono font-black border-b border-[#30363d] pb-2 uppercase tracking-wide">
                📝 Log refuel slip under registered transport name
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-6 gap-3.5 text-xs text-white">
                <div>
                  <label className="block text-slate-400 font-mono mb-1 uppercase tracking-wider text-[10px]">Date</label>
                  <input 
                    type="date"
                    value={newFuelDate}
                    onChange={(e) => setNewFuelDate(e.target.value)}
                    className="w-full bg-[#0d1117] border border-[#30363d] text-white p-2 rounded-lg outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-mono mb-1 uppercase tracking-wider text-[10px]">Tanker</label>
                  <select 
                    value={newFuelTankerId}
                    onChange={(e) => setNewFuelTankerId(e.target.value)}
                    className="w-full bg-[#0d1117] border border-[#30363d] text-white p-2 rounded-lg outline-none"
                  >
                    <option value="">-- Choose --</option>
                    {tankers.map(t => (
                      <option key={t.id} value={t.id}>{t.tankerNumber}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-slate-400 font-mono mb-1 uppercase tracking-wider text-[10px]">Petrol Pump</label>
                  <input 
                    type="text"
                    value={newFuelVendor}
                    placeholder="BPCL RO Pump Station"
                    onChange={(e) => setNewFuelVendor(e.target.value)}
                    className="w-full bg-[#0d1117] border border-[#30363d] text-white p-2 rounded-lg outline-none font-sans"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-mono mb-1 uppercase tracking-wider text-[10px]">Slip Bill No</label>
                  <input 
                    type="text"
                    value={newFuelBillNo}
                    placeholder="FUEL-REF-390"
                    onChange={(e) => setNewFuelBillNo(e.target.value)}
                    className="w-full bg-[#0d1117] border border-[#30363d] text-white p-2 rounded-lg outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-mono mb-1 uppercase tracking-wider text-[10px]">Volume (Liters)</label>
                  <input 
                    type="number"
                    value={newFuelLiters}
                    placeholder="300"
                    onChange={(e) => setNewFuelLiters(e.target.value)}
                    className="w-full bg-[#0d1117] border border-[#30363d] text-white p-2 rounded-lg outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-mono mb-1 uppercase tracking-wider text-[10px]">Amount Paid</label>
                  <input 
                    type="number"
                    value={newFuelAmount}
                    placeholder="28000"
                    onChange={(e) => setNewFuelAmount(e.target.value)}
                    className="w-full bg-[#0d1117] border border-[#30363d] text-white p-2 rounded-lg outline-none font-mono"
                  />
                </div>
              </div>
              <div className="flex justify-end pt-1">
                <button 
                  onClick={() => {
                    if (!newFuelTankerId || !newFuelAmount || !newFuelVendor) {
                      alert('Please fill tanker plate, refuel cost and petrol pump name.');
                      return;
                    }
                    const matchedTanker = tankers.find(t => t.id === newFuelTankerId);
                    if (!matchedTanker) return;

                    const amt = parseFloat(newFuelAmount);
                    const lits = parseFloat(newFuelLiters) || Math.round(amt / 95);

                    const manualRefuelEntry: TankerExpense = {
                      id: `EXP-FUEL-DIRECT-${Date.now()}`,
                      tankerId: matchedTanker.id,
                      tankerNumber: matchedTanker.tankerNumber,
                      vendorName: newFuelVendor.trim(),
                      date: newFuelDate,
                      amount: amt,
                      qtyLiters: lits,
                      billNo: newFuelBillNo.trim() || `GEN-${Math.floor(Math.random() * 8999) + 1000}`,
                      category: 'fuel',
                      workType: 'Fuel Refill Slip',
                      detail: `Manual entry by dispatcher. Recorded under registered carrier transport books.`,
                      isVerifiedByAdmin: true
                    };

                    onAddGeneralExpense!(manualRefuelEntry);
                    setShowAddFuelDirect(false);
                    // Reset
                    setNewFuelVendor('');
                    setNewFuelBillNo('');
                    setNewFuelAmount('');
                    setNewFuelLiters('');
                    alert(`Slip registered successfully under registered transport and mapped to Tanker ${matchedTanker.tankerNumber}!`);
                  }}
                  className="px-5 py-2 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white rounded-xl text-xs font-black shadow uppercase tracking-wide cursor-pointer"
                >
                  Verify & Log in Ledger
                </button>
              </div>
            </motion.div>
          )}

          {/* Filters & searching options */}
          <div className="bg-[#161b22] border border-[#30363d] p-5 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm text-white">
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input 
                  type="text"
                  placeholder="Search Slip/Bill No or Pump station..."
                  value={fuelSearchQuery}
                  onChange={(e) => setFuelSearchQuery(e.target.value)}
                  className="bg-[#0d1117] border border-[#30363d] px-9 py-2 rounded-xl text-xs outline-none w-64 text-white font-sans"
                />
              </div>

              <div className="flex items-center gap-2 text-xs font-mono">
                <span className="text-[#8b949e]">TANKER PLATE L.R:</span>
                <select 
                  value={selectedFuelTanker}
                  onChange={(e) => setSelectedFuelTanker(e.target.value)}
                  className="bg-[#0d1117] border border-[#30363d] px-3 py-2 rounded-xl text-white outline-none font-sans font-bold cursor-pointer"
                >
                  <option value="all">All Carrier Vehicles</option>
                  {tankers.map(t => (
                    <option key={t.id} value={t.tankerNumber}>{t.tankerNumber}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex gap-2 text-xs">
              <button
                onClick={() => {
                  const fuelRecords = (expenses || []).filter(e => e.category === 'fuel');
                  const headers = ['Invoice/Date', 'Tanker Vehicle', 'Retail Pump Vendor', 'Liters', 'Rate index', 'Spent Amount'];
                  exportToPDF(
                    'FUEL LOGS LEDGER BOOK - CARRIER RECORDS',
                    headers,
                    headers,
                    fuelRecords.map(r => ({
                      'Invoice/Date': `${r.billNo}\n${r.date}`,
                      'Tanker Vehicle': r.tankerNumber,
                      'Retail Pump Vendor': r.vendorName,
                      'Liters': `${r.qtyLiters || Math.round(r.amount / 95)} L`,
                      'Rate index': `₹${(r.amount / (r.qtyLiters || Math.round(r.amount / 95))).toFixed(2)}/L`,
                      'Spent Amount': `₹${r.amount.toLocaleString()}`
                    })),
                    'Petroleum_Fuel_Register_Audit_Report.pdf',
                    'Official Fuel Ledger & Clearances'
                  );
                }}
                className="px-3 py-2 bg-[#21262d] hover:bg-[#30363d] border border-[#30363d] text-white rounded-xl inline-flex items-center gap-1 cursor-pointer transition-all font-sans"
              >
                <Printer className="w-3.5 h-3.5 text-[#ff5a1f]" />
                Print Registry
              </button>
            </div>
          </div>

          {/* Table list matches */}
          <div className="bg-[#161b22] border border-[#30363d] rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-[#8b949e]">
                <thead className="bg-[#0d1117] border-b border-[#30363d] text-[#8b949e] font-mono text-[10.5px]">
                  <tr>
                    <th className="py-3 px-4 font-black">SLIP REF / REF DATE</th>
                    <th className="py-3 px-4 font-black">CONNECTED TANKER</th>
                    <th className="py-3 px-4 font-black">RETAIL PUMP VENTURE</th>
                    <th className="py-3 px-4 font-black text-right">VOLUME FILLED (LTR)</th>
                    <th className="py-3 px-4 font-black text-right">COST PER LITER (EST)</th>
                    <th className="py-3 px-4 font-black text-right">BOOK VALUE (₹)</th>
                    <th className="py-3 px-4 font-black text-center">TRIP ALLOCATION</th>
                    <th className="py-3 px-4 font-black text-center font-mono">ACTIONS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#30363d] text-slate-300 font-sans">
                  {(() => {
                    const matchedRefuels = (expenses || [])
                      .filter(e => e.category === 'fuel')
                      .filter(e => {
                        const pm = selectedFuelTanker === 'all' || e.tankerNumber === selectedFuelTanker;
                        const sm = fuelSearchQuery.trim() === '' || 
                          e.billNo.toUpperCase().includes(fuelSearchQuery.toUpperCase()) || 
                          e.vendorName.toUpperCase().includes(fuelSearchQuery.toUpperCase());
                        return pm && sm;
                      });

                    if (matchedRefuels.length === 0) {
                      return (
                        <tr>
                          <td colSpan={8} className="text-center py-12 text-[#8b949e] italic text-xs">No matching fuel statement rows or synced scanner slips inside master ledger. Ready to sync Excel or log manually!</td>
                        </tr>
                      );
                    }

                    return matchedRefuels.map(rSlip => {
                      const liters = rSlip.qtyLiters || Math.round(rSlip.amount / 95);
                      const unitPrice = liters > 0 ? (rSlip.amount / liters).toFixed(2) : '94.50';
                      const associatedTrip = rSlip.tripId ? trips.find(t => t.id === rSlip.tripId) : trips.find(t => t.tankerNumber === rSlip.tankerNumber && t.status === 'running');

                      return (
                        <tr key={rSlip.id} className="hover:bg-[#1f242c]/25 transition-all">
                          <td className="py-3.5 px-4 font-sans text-xs">
                            <span className="text-white block font-black uppercase text-[12px] font-mono">{rSlip.billNo}</span>
                            <span className="text-[#8b949e] font-mono block text-[10px] uppercase mt-0.5">{rSlip.date}</span>
                          </td>
                          <td className="py-3.5 px-4 font-black text-white font-mono text-[12px]">{rSlip.tankerNumber}</td>
                          <td className="py-3.5 px-4 text-xs font-semibold text-slate-250 text-white">{rSlip.vendorName}</td>
                          <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-200">{liters} L</td>
                          <td className="py-3.5 px-4 text-right font-mono text-slate-400">₹{unitPrice}/L</td>
                          <td className="py-3.5 px-4 text-right font-mono text-[#ff5a1f] font-extrabold text-[13px]">₹{rSlip.amount.toLocaleString()}</td>
                          <td className="py-3.5 px-4 text-center">
                            {associatedTrip ? (
                              <span className={`px-2 py-0.5 ${associatedTrip.status === 'running' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 animate-pulse' : 'bg-[#21262d] text-slate-300 border border-[#30363d]'} font-mono text-[9.5px] rounded font-bold uppercase`}>
                                {associatedTrip.status === 'running' ? '🚨 IN_TRANSIT' : '✅ COMPLETE'}
                              </span>
                            ) : (
                              <span className="px-1.5 py-0.5 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-[9.5px] rounded font-mono font-bold">UNALLOCATED</span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <div className="inline-flex gap-1">
                              <button 
                                onClick={() => {
                                  setEditingFuelSlip(rSlip);
                                  // Populate edit states
                                  setNewFuelDate(rSlip.date);
                                  setNewFuelVendor(rSlip.vendorName);
                                  setNewFuelBillNo(rSlip.billNo);
                                  setNewFuelAmount(String(rSlip.amount));
                                  setNewFuelLiters(String(liters));
                                  const tObj = tankers.find(tx => tx.tankerNumber === rSlip.tankerNumber);
                                  setNewFuelTankerId(tObj?.id || '');
                                  setShowEditFuelModal(true);
                                }}
                                className="px-2 py-1 bg-cyan-400/10 hover:bg-cyan-400/20 border border-cyan-400/20 text-cyan-400 font-mono rounded text-[10px] font-bold cursor-pointer"
                              >
                                Recheck Manually
                              </button>
                              <button 
                                onClick={() => {
                                  if (confirm('Delete this fuel transaction slip and subtract its price parameter from trip financials?')) {
                                    onDeleteExpense!(rSlip.id);
                                    alert('Refuel slip deleted successfully.');
                                  }
                                }}
                                className="px-2 py-1 bg-red-400/10 hover:bg-red-400 hover:text-white border border-red-400/25 text-red-400 font-mono rounded text-[10px] font-bold cursor-pointer"
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    });
                  })()}
                </tbody>
              </table>
            </div>
          </div>

          {/* Manual Recheck / Edit Modal inside Fuel Registry */}
          {showEditFuelModal && editingFuelSlip && (
            <div className="fixed inset-0 z-50 bg-[#0d1117]/80 backdrop-blur-sm flex items-center justify-center p-4">
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-[#161b22] border border-[#30363d] p-6 rounded-2xl w-full max-w-lg shadow-2xl relative space-y-4 text-white"
              >
                <div className="flex justify-between items-center border-b border-[#30363d] pb-3">
                  <h3 className="text-sm font-sans font-black text-white uppercase tracking-widest flex items-center gap-2">
                    <span>⛽ Recheck / Modify Fuel transaction details</span>
                  </h3>
                  <button 
                    onClick={() => setShowEditFuelModal(false)}
                    className="p-1 hover:bg-[#21262d] rounded-lg text-slate-400 hover:text-red-500 transition-all cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-3.5 text-xs">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-400 font-mono mb-1 uppercase text-[9.5px]">Date Refueled</label>
                      <input 
                        type="date"
                        value={newFuelDate}
                        onChange={(e) => setNewFuelDate(e.target.value)}
                        className="w-full bg-[#0d1117] border border-[#30363d] text-white p-2 rounded-lg outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-400 font-mono mb-1 uppercase text-[9.5px]">Tanker vehicle</label>
                      <select 
                        value={newFuelTankerId}
                        onChange={(e) => setNewFuelTankerId(e.target.value)}
                        className="w-full bg-[#0d1117] border border-[#30363d] text-white p-2 rounded-lg outline-none"
                      >
                        <option value="">-- Choose --</option>
                        {tankers.map(t => (
                          <option key={t.id} value={t.id}>{t.tankerNumber}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-400 font-mono mb-1 uppercase text-[9.5px]">Outlet supplier station</label>
                      <input 
                        type="text"
                        value={newFuelVendor}
                        onChange={(e) => setNewFuelVendor(e.target.value)}
                        className="w-full bg-[#0d1117] border border-[#30363d] text-white p-2 rounded-lg outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-400 font-mono mb-1 uppercase text-[9.5px]">Invoice slip index</label>
                      <input 
                        type="text"
                        value={newFuelBillNo}
                        onChange={(e) => setNewFuelBillNo(e.target.value)}
                        className="w-full bg-[#0d1117] border border-[#30363d] text-white p-2 rounded-lg outline-none font-mono"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-400 font-mono mb-1 uppercase text-[9.5px]">Total Liters purchased</label>
                      <input 
                        type="number"
                        value={newFuelLiters}
                        onChange={(e) => setNewFuelLiters(e.target.value)}
                        className="w-full bg-[#0d1117] border border-[#30363d] text-white p-2 rounded-lg outline-none font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-400 font-mono mb-1 uppercase text-[9.5px]">Debit amount paid</label>
                      <input 
                        type="number"
                        value={newFuelAmount}
                        onChange={(e) => setNewFuelAmount(e.target.value)}
                        className="w-full bg-[#0d1117] border border-[#30363d] text-white p-2 rounded-lg outline-none font-mono"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-[#30363d]">
                  <button 
                    onClick={() => setShowEditFuelModal(false)}
                    className="px-4 py-2 border border-[#30363d] hover:bg-[#21262d] text-slate-350 text-xs font-bold rounded-xl cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={() => {
                      if (!newFuelTankerId || !newFuelAmount || !newFuelVendor) {
                        alert('All fields are critical values.');
                        return;
                      }
                      const matchedTanker = tankers.find(t => t.id === newFuelTankerId);
                      if (!matchedTanker) return;

                      // Replace composite operation
                      onDeleteExpense!(editingFuelSlip.id);

                      const updatedSlip: TankerExpense = {
                        ...editingFuelSlip,
                        tankerId: matchedTanker.id,
                        tankerNumber: matchedTanker.tankerNumber,
                        vendorName: newFuelVendor.trim(),
                        date: newFuelDate,
                        amount: parseFloat(newFuelAmount),
                        qtyLiters: parseFloat(newFuelLiters) || Math.round(parseFloat(newFuelAmount) / 95),
                        billNo: newFuelBillNo.trim(),
                        detail: `Rechecked entry by admin manually. Stored under registered transport name: ${matchedTanker.tankerNumber}`,
                      };

                      onAddGeneralExpense!(updatedSlip);
                      setShowEditFuelModal(false);
                      setEditingFuelSlip(null);
                      alert('Manual fuel slip entry corrected and approved inside central Ledger registry.');
                    }}
                    className="px-5 py-2 bg-[#ff5a1f] hover:bg-[#e04c15] text-white text-xs font-black rounded-xl cursor-pointer uppercase tracking-wider"
                  >
                    Commit & Sync Entry
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </div>
      )}

      {/* -------------------------------------------------- */}
      {/* 1. MODAL: LOG NEW SUPPLIER EXPENSE INVOICE        */}
      {/* -------------------------------------------------- */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-[#0d1117]/80 backdrop-blur-sm flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-[#161b22] border border-[#30363d] p-6 rounded-2xl w-full max-w-lg shadow-2xl relative space-y-4 text-white"
          >
            <div className="flex justify-between items-center border-b border-[#30363d] pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span>🧾 Log Supplier Expense Invoice</span>
              </h3>
              <button 
                onClick={() => setShowAddModal(false)}
                className="p-1.5 hover:bg-[#21262d] rounded-lg text-[#8b949e] hover:text-[#ff5a5f] transition-all cursor-pointer"
              >
                <X className="w-4.5 h-4.5" />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[#8b949e] font-mono mb-1 uppercase tracking-wider">Dept Category</label>
                  <select
                    value={addCategory}
                    onChange={(e) => setAddCategory(e.target.value as 'repair' | 'adblue')}
                    className="w-full bg-[#0d1117] border border-[#30363d] text-white p-2.5 rounded-lg outline-none"
                  >
                    <option value="repair">🔧 Repair & Maintenance</option>
                    <option value="adblue">🧴 AdBlue Refills</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[#8b949e] font-mono mb-1 uppercase tracking-wider">Associated Tanker Vehicle</label>
                  <select
                    value={addTankerId}
                    onChange={(e) => setAddTankerId(e.target.value)}
                    className="w-full bg-[#0d1117] border border-[#30363d] text-white p-2.5 rounded-lg outline-none"
                    required
                  >
                    <option value="">-- Choose Tanker --</option>
                    {tankers.map(t => (
                      <option key={t.id} value={t.id}>{t.tankerNumber}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[#8b949e] font-mono mb-1 uppercase tracking-wider">Invoice / Bill Number</label>
                  <input 
                    type="text"
                    placeholder="e.g. GST-REC-101"
                    value={addBillNo}
                    onChange={(e) => setAddBillNo(e.target.value)}
                    className="w-full bg-[#0d1117] border border-[#30363d] text-white p-2.5 rounded-lg outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[#8b949e] font-mono mb-1 uppercase tracking-wider">Bill Date</label>
                  <input 
                    type="date"
                    value={addDate}
                    onChange={(e) => setAddDate(e.target.value)}
                    className="w-full bg-[#0d1117] border border-[#30363d] text-white p-2.5 rounded-lg outline-none font-mono"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[#8b949e] font-mono mb-1 uppercase tracking-wider">Supplier Dealer Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Shell Auto Care Ranoli"
                    value={addVendorName}
                    onChange={(e) => setAddVendorName(e.target.value)}
                    className="w-full bg-[#0d1117] border border-[#30363d] text-white p-2.5 rounded-lg outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[#8b949e] font-mono mb-1 uppercase tracking-wider">Aggregate Gross Amount (₹)</label>
                  <input 
                    type="number"
                    placeholder="Gross Total in INR"
                    value={addAmount}
                    onChange={(e) => setAddAmount(e.target.value)}
                    className="w-full bg-[#0d1117] border border-[#30363d] text-white p-2.5 rounded-lg outline-none font-mono font-bold"
                    required
                    min="1"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[#8b949e] font-mono mb-1 uppercase tracking-wider">Service Sub-Type</label>
                  <input
                    type="text"
                    placeholder={addCategory === 'adblue' ? "e.g. AdBlue Refill 60 Liters" : "e.g. Tyre replacement, Brake overhaul"}
                    value={addWorkType}
                    onChange={(e) => setAddWorkType(e.target.value)}
                    className="w-full bg-[#0d1117] border border-[#30363d] text-white p-2.5 rounded-lg outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[#8b949e] font-mono mb-1 uppercase tracking-wider">Upfront Cleared Status</label>
                  <select
                    value={addStatus}
                    onChange={(e) => setAddStatus(e.target.value as 'pending' | 'collected')}
                    className="w-full bg-[#0d1117] border border-[#30363d] text-white p-2.5 rounded-lg outline-none"
                  >
                    <option value="pending">❌ Settle outstanding credit later</option>
                    <option value="collected">✅ Fully paid in cash/bank upfront</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[#8b949e] font-mono mb-1 uppercase tracking-wider">Activity Specification Details</label>
                <textarea
                  placeholder="Describe parts replaced or detailed actions completed..."
                  value={addDetail}
                  onChange={(e) => setAddDetail(e.target.value)}
                  className="w-full bg-[#0d1117] border border-[#30363d] text-white p-2.5 rounded-lg outline-none h-20 resize-none"
                  required
                />
              </div>

              <div className="flex gap-3 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 bg-[#21262d] text-[#8b949e] hover:text-white rounded-lg cursor-pointer font-bold transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 font-bold text-white rounded-lg cursor-pointer shadow-md transition-all"
                >
                  📁 Lock Invoice Record
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* -------------------------------------------------- */}
      {/* AI MODAL: EXCEL STATEMENT & LEDGER BILL PARSER       */}
      {/* -------------------------------------------------- */}
      {showStatementImportModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 text-left">
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-full max-w-lg bg-[#161b22] border border-[#30363d] rounded-2xl shadow-2xl p-6 relative overflow-hidden text-white"
          >
            <div className="flex justify-between items-center pb-4 border-b border-[#30363d] mb-5">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Database className="w-5 h-5 text-cyan-400" />
                  AI Statement Excel Import
                </h3>
                <p className="text-[10px] text-gray-400 mt-0.5">Automated statement mapping powered by Gemini AI</p>
              </div>
              <button 
                onClick={() => {
                  if (!statementAnalysing) {
                    setShowStatementImportModal(false);
                    setStatementFile(null);
                    setStatementError(null);
                  }
                }} 
                className="text-[#8b949e] hover:text-white cursor-pointer disabled:opacity-40"
                disabled={statementAnalysing}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {statementAnalysing ? (
              <div className="py-12 flex flex-col items-center justify-center space-y-6 text-center">
                <div className="relative w-16 h-16">
                  <div className="absolute inset-0 border-4 border-cyan-500/10 rounded-full" />
                  <div className="absolute inset-0 border-4 border-t-cyan-400 rounded-full animate-spin" />
                </div>
                <div className="space-y-4 max-w-sm">
                  <p className="text-xs font-bold text-white uppercase tracking-wider animate-pulse">Running Ledger Audit...</p>
                  <p className="text-[11px] text-cyan-400 font-mono italic leading-relaxed">{statementProgress}</p>
                  <p className="text-[9px] text-[#8b949e] uppercase tracking-widest leading-normal pt-2">
                    Syncing data registers. Please do not close this modal...
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-5">
                {statementError && (
                  <div className="bg-rose-500/15 border border-rose-500/35 p-3.5 rounded-xl text-rose-300 text-xs text-left leading-relaxed">
                    <strong className="block font-bold mb-1 uppercase text-[10px] font-mono tracking-wider">Analysis Breakdown Error:</strong>
                    {statementError}
                  </div>
                )}

                <div className="space-y-1">
                  <label className="block text-[10px] uppercase font-mono text-[#8b949e] tracking-wider">Select Statement Spreadsheet (.xlsx, .xls, .csv)</label>
                  <div className="border-2 border-dashed border-[#30363d] rounded-2xl p-8 bg-[#0d1117] hover:border-cyan-500/50 transition-all cursor-pointer relative flex flex-col items-center justify-center text-center space-y-3.5">
                    <Database className="w-10 h-10 text-cyan-400" />
                    <div className="space-y-1">
                      {statementFile ? (
                        <p className="text-xs font-bold text-[#fafafa] font-mono truncate max-w-[340px] bg-cyan-500/10 px-3 py-1.5 rounded-lg border border-cyan-500/25">
                          📎 {statementFile.name}
                        </p>
                      ) : (
                        <>
                          <span className="block text-xs font-bold text-white">Click or drag ledger spreadsheet file</span>
                          <span className="text-[10px] text-gray-500">Supports Statement folders with transaction entries</span>
                        </>
                      )}
                    </div>
                    <input 
                      type="file" 
                      accept=".xlsx,.xls,.csv"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) setStatementFile(file);
                      }}
                      className="absolute inset-0 opacity-0 cursor-pointer"
                    />
                  </div>
                </div>

                <div className="bg-[#121c2c] border border-cyan-500/10 p-4 rounded-xl text-left leading-relaxed space-y-1">
                  <p className="text-xs font-mono uppercase tracking-widest font-bold text-cyan-400">Statement Reconciliation Logic:</p>
                  <p className="text-[11px] text-[#8b949e]">
                    Gemini maps any billing columns structure (dealer invoice numbers, repairs work, spares, AdBlue totals, and payment balances) and loads them directly into the corresponding maintenance ledgers.
                  </p>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-[#30363d]">
                  <button
                    type="button"
                    onClick={() => {
                      setShowStatementImportModal(false);
                      setStatementFile(null);
                      setStatementError(null);
                    }}
                    className="px-4 py-2.5 bg-[#21262d] hover:bg-[#30363d] text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleStatementImportSubmit}
                    disabled={!statementFile}
                    className="px-5 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-500 disabled:from-cyan-500/25 disabled:to-blue-500/25 hover:from-cyan-400 hover:to-blue-400 text-white font-bold rounded-xl text-xs shadow-md shadow-cyan-500/15 transition-all cursor-pointer"
                  >
                    Start AI Statement Import
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        </div>
      )}

      {/* -------------------------------------------------- */}
      {/* AI MODAL: SMART OCR MAINTENANCE BILL ANALYSER       */}
      {/* -------------------------------------------------- */}
      {showGeminiModal && (
        <div className="fixed inset-0 z-50 bg-[#0d1117]/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-[#161b22] border border-[#30363d] p-6 rounded-2xl w-full max-w-2xl shadow-2xl relative space-y-5 text-white my-8"
          >
            <div className="flex justify-between items-center border-b border-[#30363d] pb-3">
              <div className="space-y-0.5 relative">
                <span className="text-[10px] font-mono text-amber-400 font-extrabold uppercase tracking-wider block">✨ Google Gemini-Speed Audit Core</span>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <span>🤖 Automated Maintenance Bill OCR Scanner</span>
                  <div className="relative inline-block">
                    <button
                      type="button"
                      onClick={() => setShowScanTip(!showScanTip)}
                      onMouseEnter={() => setShowScanTip(true)}
                      onMouseLeave={() => setShowScanTip(false)}
                      className="p-1 hover:bg-[#21262d] rounded-lg text-amber-400 hover:text-amber-300 transition-all cursor-pointer inline-flex items-center justify-center focus:outline-none"
                      title="View AI Scan Optimization Tips"
                    >
                      <HelpCircle className="w-4 h-4" />
                    </button>
                    
                    {/* Tooltip Popup */}
                    <AnimatePresence>
                      {showScanTip && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.95, y: 10 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.95, y: 10 }}
                          className="absolute left-0 mt-2 z-50 w-72 p-3 bg-slate-900 border border-amber-500/30 text-white rounded-xl shadow-xl space-y-2 pointer-events-none text-left"
                        >
                          <div className="flex items-center gap-1.5 border-b border-amber-500/20 pb-1.5">
                            <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                            <strong className="text-xs uppercase font-mono tracking-wider font-extrabold text-amber-400">Gemini OCR Priority Fields</strong>
                          </div>
                          <ul className="space-y-1.5 text-[10.5px] leading-relaxed text-gray-300 list-disc list-inside">
                            <li><strong className="text-white">Invoice No. & Bill No.</strong> — Extracted directly to expedite party credit lookup.</li>
                            <li><strong className="text-white">Issue Date</strong> — Automatically aligned to historical accounts.</li>
                            <li><strong className="text-white">Vendor Details</strong> — Smart vendor name mapping to direct creditors.</li>
                            <li><strong className="text-white">Line Items & Total</strong> — Breaks down spares vs. labor accurately.</li>
                          </ul>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </h3>
              </div>
              <button 
                onClick={() => {
                  setShowGeminiModal(false);
                  setHasScanned(false);
                  setGeminiError(null);
                }}
                className="p-1.5 hover:bg-[#21262d] rounded-lg text-[#8b949e] hover:text-[#ff5a5f] transition-all cursor-pointer"
              >
                <X className="w-4.5 h-4.5" />
              </button>
            </div>

            {/* Diagnostic Alert Box */}
            {geminiError && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-red-500 font-mono leading-relaxed text-left">
                ⚠️ [System Diagnostics Error]: {geminiError}
              </div>
            )}

            {!hasScanned && !geminiLoading && (
              <div className="space-y-4">
                <p className="text-xs text-[#8b949e] leading-relaxed text-left">
                  Provide a photograph, scan or PDF copy of a mechanical spare-parts invoice, vendor service receipt or Adblue fuel cash memo. The system will leverage raw visual semantic models to process values, matching tankers and logging ledgers instantly.
                </p>

                {/* Gemini Scanning Optimization Tip Box */}
                <div className="p-3.5 bg-amber-500/10 border border-amber-500/20 rounded-xl relative overflow-hidden text-left">
                  <div className="absolute top-0 right-0 p-2">
                    <Sparkles className="w-4 h-4 text-amber-400 opacity-20 animate-pulse pointer-events-none" />
                  </div>
                  <div className="flex items-start gap-2.5 text-left text-[11px] leading-relaxed">
                    <HelpCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-amber-400 font-mono text-[10px] uppercase tracking-wider block mb-0.5">💡 Gemini Scanning Optimization Tip</strong>
                      <p className="text-gray-300">
                        For maximum precision and faster auditing, Gemini analyzes <strong className="text-white">Invoice Numbers & Dates</strong> best, linking historical transactions seamlessly. Please make sure these fields are clean, legible, and well-lit.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Drag and Drop visual layout */}
                <div className="border-2 border-dashed border-[#30363d] hover:border-amber-500/50 rounded-xl p-8 text-center bg-[#0d1117]/50 relative group transition-all cursor-pointer">
                  <input 
                    type="file" 
                    accept="image/*,application/pdf"
                    onChange={handleGeminiFileUpload}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                  <div className="space-y-3 pointer-events-none flex flex-col items-center">
                    <div className="w-12 h-12 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 group-hover:scale-110 transition-transform">
                      <Upload className="w-6 h-6" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-white font-bold text-xs">Drag & drop or click to upload maintenance bill</p>
                      <p className="text-[10px] text-[#8b949e] font-mono">SUPPORTS RAW IMAGES / DOCUMENTS UP TO 15MB</p>
                    </div>
                  </div>
                </div>

                {/* Preset Fast Selection Sandbox */}
                <div className="space-y-2 pt-1 text-left">
                  <span className="text-[10px] text-[#8b949e] font-mono block uppercase tracking-wider font-extrabold">
                    💡 FAST DEMO RUNNER (1-CLICK HIGH-FIDELITY SAMPLES):
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => handleSelectPresetSample('iocl')}
                      className="p-3 border border-cyan-500/20 bg-cyan-950/10 hover:bg-cyan-950/20 rounded-xl text-xs hover:border-cyan-500/40 text-left transition-all group cursor-pointer"
                    >
                      <span className="font-extrabold text-cyan-400 block font-mono text-cyber">🧴 Sample Memo [AdBlue]</span>
                      <span className="text-[10px] text-gray-300 block mt-1">IOCL AdBlue Smart Cash Receipt</span>
                      <span className="text-[9.5px] text-[#8b949e] block font-mono mt-0.5">Ranoli Sector • Volume 50L • GL-105</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSelectPresetSample('shirdi')}
                      className="p-3 border border-orange-500/20 bg-orange-950/10 hover:bg-orange-950/20 rounded-xl text-xs hover:border-orange-500/40 text-left transition-all group cursor-pointer"
                    >
                      <span className="font-extrabold text-orange-400 block font-mono text-cyber">🔧 Sample Invoice [Repair]</span>
                      <span className="text-[10px] text-gray-300 block mt-1">Shree Shirdi Motors Spare Bill</span>
                      <span className="text-[9.5px] text-[#8b949e] block font-mono mt-0.5">Vadodara Sector • Axle Suspension Parts</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* AI Core scan active ticking indicator */}
            {geminiLoading && (
              <div className="py-12 flex flex-col items-center justify-center space-y-4">
                <div className="relative w-16 h-16">
                  {/* Outer spinning radar */}
                  <div className="absolute inset-0 rounded-full border-2 border-t-amber-500 border-r-transparent border-b-orange-500 border-l-transparent animate-spin" />
                  {/* Inner pulsing computer core */}
                  <div className="absolute inset-2.5 rounded-full bg-amber-500/20 border border-amber-500/40 animate-pulse flex items-center justify-center">
                    <Sparkles className="w-5 h-5 text-amber-400" />
                  </div>
                </div>
                <div className="space-y-1 text-center font-mono">
                  <p className="text-xs font-bold text-white uppercase animate-pulse">Running Neural Auditing Engine...</p>
                  <p className="text-[10px] text-[#8b949e]">Performing OCR, plate matching & ledger compliance checks</p>
                </div>
              </div>
            )}

            {/* AI extracted result edit form */}
            {hasScanned && !geminiLoading && (
              <form onSubmit={handleAiRecordSubmit} className="space-y-4 text-xs text-left">
                <div className="bg-amber-400/5 border border-amber-400/10 p-3.5 rounded-xl space-y-1">
                  <span className="inline-flex items-center gap-1 text-[10px] font-mono text-yellow-500 font-extrabold uppercase">
                    ✨ Neural Extraction Complete
                  </span>
                  <p className="text-[10.5px] text-gray-300 leading-normal">
                    The details from the manual document have been automatically structured below. Please verify and confirm before registering to the party ledger accounts.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4 text-left">
                  <div>
                    <label className="block text-[#8b949e] font-mono mb-1 uppercase tracking-wider">Matched Tanker vehicle</label>
                    <select
                      value={aiTankerId}
                      onChange={(e) => setAiTankerId(e.target.value)}
                      className="w-full bg-[#0d1117] border border-[#30363d] text-white p-2.5 rounded-lg outline-none"
                      required
                    >
                      <option value="">-- Choose Tanker --</option>
                      {tankers.map(t => (
                        <option key={t.id} value={t.id}>{t.tankerNumber}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[#8b949e] font-mono mb-1 uppercase tracking-wider">Accounting Category</label>
                    <select
                      value={aiCategory}
                      onChange={(e) => setAiCategory(e.target.value as 'repair' | 'adblue')}
                      className="w-full bg-[#0d1117] border border-[#30363d] text-white p-2.5 rounded-lg outline-none font-semibold text-amber-400"
                    >
                      <option value="repair">🔧 105: Operational Repair Ledger</option>
                      <option value="adblue">🧴 112: AdBlue Compliance Ledger</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-left font-sans">
                  <div>
                    <label className="block text-[#8b949e] font-mono mb-1 uppercase tracking-wider">Supplier/Dealer Name</label>
                    <input 
                      type="text"
                      value={aiVendorName}
                      onChange={(e) => setAiVendorName(e.target.value)}
                      className="w-full bg-[#0d1117] border border-[#30363d] text-white p-2.5 rounded-lg outline-none font-bold"
                      placeholder="e.g. Workshop Store"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[#8b949e] font-mono mb-1 uppercase tracking-wider">Bill/Invoice Serial Reference</label>
                    <input 
                      type="text"
                      value={aiBillNo}
                      onChange={(e) => setAiBillNo(e.target.value)}
                      className="w-full bg-[#0d1117] border border-[#30363d] text-white p-2.5 rounded-lg outline-none font-mono font-bold"
                      placeholder="e.g. GST-991"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 text-left">
                  <div className="col-span-1">
                    <label className="block text-[#8b949e] font-mono mb-1 uppercase tracking-wider">Invoice Date</label>
                    <input 
                      type="date"
                      value={aiDate}
                      onChange={(e) => setAiDate(e.target.value)}
                      className="w-full bg-[#0d1117] border border-[#30363d] text-white p-2.5 rounded-lg outline-none font-mono font-bold text-center"
                      required
                    />
                  </div>

                  <div className="col-span-1">
                    <label className="block text-[#8b949e] font-mono mb-1 uppercase tracking-wider">Amount Paid (₹)</label>
                    <input 
                      type="number"
                      value={aiAmount}
                      onChange={(e) => setAiAmount(e.target.value)}
                      className="w-full bg-[#0d1117] border border-[#30363d] text-emerald-400 p-2.5 rounded-lg outline-none font-mono font-bold text-[13px] text-center"
                      placeholder="Gross Cost in INR"
                      min="1"
                      required
                    />
                  </div>

                  <div className="col-span-1">
                    <label className="block text-[#8b949e] font-mono mb-1 uppercase tracking-wider">Payment Status</label>
                    <select
                      value={aiStatus}
                      onChange={(e) => setAiStatus(e.target.value as 'pending' | 'collected')}
                      className="w-full bg-[#0d1117] border border-[#30363d] text-white p-2.5 rounded-lg outline-none"
                    >
                      <option value="pending">❌ Credit Pending</option>
                      <option value="collected">✅ Paid Cash/Upfront</option>
                    </select>
                  </div>
                </div>

                <div className="text-left font-sans">
                  <label className="block text-[#8b949e] font-mono mb-1 uppercase tracking-wider">Classification Sub-Type</label>
                  <input 
                    type="text"
                    value={aiWorkType}
                    onChange={(e) => setAiWorkType(e.target.value)}
                    className="w-full bg-[#0d1117] border border-[#30363d] text-white p-2.5 rounded-lg outline-none font-semibold"
                    placeholder="e.g. Tyre replacement, AdBlue refill"
                    required
                  />
                </div>

                <div className="text-left font-sans">
                  <label className="block text-[#8b949e] font-mono mb-1 uppercase tracking-wider">Analysis Logs / Parts Description</label>
                  <textarea 
                    value={aiDetail}
                    onChange={(e) => setAiDetail(e.target.value)}
                    className="w-full bg-[#0d1117] border border-[#30363d] text-white p-2.5 rounded-lg outline-none h-20 resize-none font-sans leading-relaxed"
                    placeholder="Describe specific items billed..."
                    required
                  />
                </div>

                <div className="flex gap-3 justify-end pt-2 border-t border-[#30363d]/50 font-sans">
                  <button
                    type="button"
                    onClick={() => {
                      setHasScanned(false);
                      setGeminiError(null);
                    }}
                    className="px-4 py-2 bg-[#21262d] text-[#8b949e] hover:text-white rounded-lg cursor-pointer font-bold transition-all"
                  >
                    Reset Upload
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 font-bold text-white rounded-lg cursor-pointer shadow-md transition-all flex items-center gap-1.5"
                  >
                    <CheckCircle className="w-4 h-4" /> Sign & Lock to Party Ledger
                  </button>
                </div>
              </form>
            )}
          </motion.div>
        </div>
      )}

      {/* -------------------------------------------------- */}
      {/* 2. MODAL: FULL TAX INVOICE INSPECTOR VIEW         */}
      {/* -------------------------------------------------- */}
      {selectedDetailInvoice && (
        <div className="fixed inset-0 z-50 bg-[#0d1117]/85 backdrop-blur-sm flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white text-slate-900 border-2 border-slate-900 rounded-2xl w-full max-w-2xl shadow-2xl relative overflow-hidden"
            id="printable-bill-invoice"
          >
            {/* Context Navigation Controls - Hidden during printer process */}
            <div className="bg-slate-900 text-white px-6 py-3.5 flex justify-between items-center print:hidden border-b border-slate-800">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-emerald-400">
                ⚡ Supplier Invoice inspector
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-3.5 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-900 font-bold rounded-lg text-xs flex items-center gap-1.5 cursor-pointer transition-all"
                >
                  <Printer className="w-3.5 h-3.5" /> Print Tax Copy
                </button>
                <button 
                  onClick={() => setSelectedDetailInvoice(null)}
                  className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-all cursor-pointer"
                >
                  <X className="w-4.5 h-4.5" />
                </button>
              </div>
            </div>

            {/* Structured Printable Bill Wrapper */}
            <div className="p-8 space-y-6 select-text max-h-[85vh] overflow-y-auto print:max-h-none print:overflow-visible bg-white">
              {/* Document Header */}
              <div className="flex justify-between items-start gap-4 border-b-2 border-slate-900 pb-5">
                <div>
                  <span className="text-[10px] font-mono text-slate-500 tracking-wider uppercase bg-slate-100 border border-slate-200 px-2.5 py-1 rounded font-bold">
                    TAX INVOICE / SERVICE RECORD SHEET
                  </span>
                  <h4 className="text-xl font-black text-slate-950 tracking-tight uppercase mt-2.5">
                    {selectedDetailInvoice.vendorName}
                  </h4>
                  <p className="text-[11px] text-slate-600 font-medium leading-relaxed mt-1">
                    • Gujarat Fuel Bypass Line Terminal & Maintenance Corridor <br />
                    • Specialized Heavy Vehicle BS6 Engineering Depot <br />
                    • GSTIN: <span className="font-mono font-bold">24AAAPV{Math.floor(1111 + Math.random()*8888)}D1Z9</span>
                  </p>
                </div>
                
                <div className="text-right flex flex-col items-end shrink-0">
                  <div className="bg-slate-100 p-2 border border-slate-200 rounded-lg mb-2">
                    <span className="text-[10px] text-slate-500 font-mono block uppercase">Co-operator Account:</span>
                    <strong className="text-xs text-slate-950 uppercase block mt-0.5">BARODA ROAD CARRIERS</strong>
                    <p className="text-[9px] text-slate-500">Ranoli GIDC Bypass, Vadodara, GJ</p>
                  </div>
                </div>
              </div>

              {/* Identification details */}
              <div className="grid grid-cols-3 gap-4 bg-slate-50 border border-slate-200 p-4 rounded-xl text-xs font-sans">
                <div>
                  <span className="text-[10px] text-slate-500 font-mono block uppercase">Invoice Serial:</span>
                  <strong className="text-slate-900 font-mono text-sm break-all">{selectedDetailInvoice.billNo}</strong>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 font-mono block uppercase">Logged Date:</span>
                  <strong className="text-slate-900 font-mono text-sm">{selectedDetailInvoice.date}</strong>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 font-mono block uppercase">Assigned tanker:</span>
                  <strong className="text-rose-600 font-mono font-black uppercase text-sm">🚚 {selectedDetailInvoice.tankerNumber}</strong>
                </div>
              </div>

              {/* Invoice Table Grid */}
              <div className="border border-slate-900 rounded-xl overflow-hidden text-xs">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-slate-900 text-white font-mono text-[9px] uppercase">
                      <th className="p-3">Item</th>
                      <th className="p-3">Maintenance & Refill Item Specifications</th>
                      <th className="p-3 text-center">Division Group</th>
                      <th className="p-3 text-right">Price Base (INR)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 text-slate-800">
                    <tr>
                      <td className="p-4 font-mono font-bold text-center">01</td>
                      <td className="p-4">
                        <strong className="text-slate-900 text-xs block uppercase">{selectedDetailInvoice.workType || 'Scheduled Vehicle Maintenance'}</strong>
                        <p className="text-[11px] text-slate-600 font-medium leading-relaxed mt-1 whitespace-pre-line">{selectedDetailInvoice.detail}</p>
                      </td>
                      <td className="p-4 text-center">
                        <span className="text-[10px] font-mono font-bold uppercase bg-slate-100 border border-slate-205 px-2 py-0.5 rounded text-slate-700">
                          {selectedDetailInvoice.category === 'adblue' ? '🧴 Adblue Fluid' : '🔧 Mechanical'}
                        </span>
                      </td>
                      <td className="p-4 text-right font-mono font-bold text-xs text-slate-900">
                        ₹{(selectedDetailInvoice.amount * 0.8475).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                      </td>
                    </tr>
                    
                    <tr className="bg-slate-50/60 font-medium">
                      <td colSpan={2} className="p-2.5 text-right text-[10px] text-slate-500 font-mono uppercase">Subtotal Price:</td>
                      <td></td>
                      <td className="p-2.5 text-right font-mono text-slate-800">
                        ₹{(selectedDetailInvoice.amount * 0.8475).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                      </td>
                    </tr>
                    <tr className="bg-slate-50/60 font-medium">
                      <td colSpan={2} className="p-2.5 text-right text-[10px] text-slate-500 font-mono uppercase">Central GST @ 9%:</td>
                      <td></td>
                      <td className="p-2.5 text-right font-mono text-slate-800">
                        ₹{(selectedDetailInvoice.amount * 0.07625).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                      </td>
                    </tr>
                    <tr className="bg-slate-50/60 font-medium">
                      <td colSpan={2} className="p-2.5 text-right text-[10px] text-slate-500 font-mono uppercase">State GST @ 9%:</td>
                      <td></td>
                      <td className="p-2.5 text-right font-mono text-slate-800">
                        ₹{(selectedDetailInvoice.amount * 0.07625).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                      </td>
                    </tr>
                    <tr className="bg-slate-100 border-t-2 border-slate-950 font-bold text-slate-950">
                      <td colSpan={2} className="p-3.5 text-right text-[10px] font-black uppercase tracking-wider">Gross Total payable:</td>
                      <td></td>
                      <td className="p-3.5 text-right font-mono text-base font-black text-slate-950">
                        ₹{selectedDetailInvoice.amount.toLocaleString()}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Lower legalities */}
              <div className="flex justify-between items-center gap-6 pt-5 border-t border-dashed border-slate-300">
                <div className="text-[10px] text-slate-500 max-w-sm leading-normal font-sans">
                  <strong>Verification Statement:</strong> <br />
                  This is a validated computer-generated tax ledger report mapped sequentially to Baroda Road Carriers fleet compliance logs. No manual signatures are paper-bound.
                </div>
                
                {/* Stamp Seal Indicator */}
                <div className="shrink-0 relative">
                  {selectedDetailInvoice.status === 'collected' ? (
                    <div className="border-4 border-emerald-500 text-emerald-500 font-mono text-[11px] font-black tracking-widest uppercase rounded-lg px-3 py-1.5 rotate-[-5deg] text-center bg-white">
                      ● PAID & CLEARED <br />
                      <span className="text-[8px] font-normal block font-sans mt-0.5">FULLY RESOLVED</span>
                    </div>
                  ) : (
                    <div className="border-4 border-amber-500 text-amber-500 font-mono text-[11px] font-black tracking-widest uppercase rounded-lg px-3 py-1.5 rotate-[4deg] text-center bg-white">
                      ▲ OUTSTANDING <br />
                      <span className="text-[8px] font-normal block font-sans mt-0.5">SETTLE VIA VENDOR BOOK</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Shipmate detailed ledger transaction auditing certificate */}
      {selectedDetailShipmateInvoice && (
        <ShipmateDetailModal
          isOpen={!!selectedDetailShipmateInvoice}
          onClose={() => setSelectedDetailShipmateInvoice(null)}
          title={selectedDetailShipmateInvoice.category === 'adblue' ? 'Adblue Supplier Ledger Audit' : 'Repair Operations Ledger Audit'}
          subtitle="Approved Vendor Commercial Invoice Verification Certificate"
          trackingId={selectedDetailShipmateInvoice.billNo}
          status={selectedDetailShipmateInvoice.status === 'collected' ? 'CLEARED' : 'PENDING'}
          statusType={selectedDetailShipmateInvoice.status === 'collected' ? 'success' : 'pending'}
          source={selectedDetailShipmateInvoice.vendorName}
          destination={selectedDetailShipmateInvoice.tankerNumber || "Fleet Hub Dispatch"}
          amount={`₹${selectedDetailShipmateInvoice.amount.toLocaleString()}`}
          date={selectedDetailShipmateInvoice.date}
          productName={selectedDetailShipmateInvoice.category === 'adblue' ? '🧴 ADBLUE SUPPLY LOAD' : '🔧 RIG MECHANICAL PARTS'}
          fields={[
            { label: "Tax Invoice Number", value: selectedDetailShipmateInvoice.billNo },
            { label: "Vendor Profile", value: selectedDetailShipmateInvoice.vendorName },
            { label: "Tanker Plate No", value: selectedDetailShipmateInvoice.tankerNumber },
            { label: "Logged Narrative / Description", value: selectedDetailShipmateInvoice.detail || "Scheduled mechanical maintenance and lubrication" },
            { label: "Work Type Category", value: selectedDetailShipmateInvoice.workType || "Regular Fleet Care" }
          ]}
          steps={[
            { label: "Invoice Issued", active: false, completed: true },
            { label: "Work Done & Logged", active: false, completed: true },
            { label: "Audit Checked", active: false, completed: true },
            { label: "Cleared / Settled", active: selectedDetailShipmateInvoice.status !== 'collected', completed: selectedDetailShipmateInvoice.status === 'collected' }
          ]}
          onPrint={() => {
            setSelectedDetailInvoice(selectedDetailShipmateInvoice);
            setSelectedDetailShipmateInvoice(null);
          }}
        />
      )}

      {/* Shipmate detailed modal for voyages */}
      {selectedDetailTrip && (
        <ShipmateDetailModal
          isOpen={!!selectedDetailTrip}
          onClose={() => setSelectedDetailTrip(null)}
          title="Voyage Balance Statement Audit"
          subtitle="Real-time terminal dispatcher audit sheet"
          trackingId={selectedDetailTrip.lrNo}
          status={selectedDetailTrip.status === 'completed' ? 'DELIVERED' : 'IN TRANSIT'}
          statusType={selectedDetailTrip.status === 'completed' ? 'success' : 'running'}
          source={selectedDetailTrip.placeFrom || "Ranoli Cluster"}
          destination={selectedDetailTrip.placeTo || "Dahej Terminal"}
          amount={`₹${selectedDetailTrip.revenue?.toLocaleString()}`}
          date={selectedDetailTrip.endDate || selectedDetailTrip.startDate}
          productName={`${selectedDetailTrip.productName || "Industrial Fluid"}`}
          driverName={selectedDetailTrip.driverName}
          tankerNumber={selectedDetailTrip.tankerNumber}
          fields={[
            { label: "LR Docket ID", value: selectedDetailTrip.lrNo },
            { label: "Driver/Operator Name", value: selectedDetailTrip.driverName || "Industrial Chemie (Self)" },
            { label: "Vehicle Plate No", value: selectedDetailTrip.tankerNumber },
            { label: "Consignor Terminal Hub", value: selectedDetailTrip.placeFrom || "Vadodara dispatch" },
            { label: "Consignee Unloading Hub", value: selectedDetailTrip.placeTo || "Dahej Unload" },
            { label: "Expected Fuel Liters", value: `${selectedDetailTrip.expectedFuelLiters} Liters` },
            { label: "Actual Liters Offset", value: `${(selectedDetailTrip.fuelExpense/95).toFixed(1)} Liters` }
          ]}
          steps={[
            { label: "Voyage Logged", active: false, completed: true },
            { label: "Assigned Dispatch", active: false, completed: true },
            { label: "In Route Transit", active: selectedDetailTrip.status !== 'completed', completed: selectedDetailTrip.status === 'completed' },
            { label: "Unbound Clearance", active: false, completed: selectedDetailTrip.status === 'completed' }
          ]}
          onPrint={() => window.print()}
        />
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
