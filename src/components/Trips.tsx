import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, Calendar, MapPin, Truck, HelpCircle, 
  User, CheckCircle, Calculator, Info, IndianRupee, FileSpreadsheet, X, Tag,
  Download, ChevronDown, ChevronUp, TrendingUp, Search, Filter, Printer, FileText, Check, Edit
} from 'lucide-react';
import { exportToExcel, exportToPDF } from '../utils/exportUtils';
import { Trip, LorryReceipt, Tanker, Driver, TankerExpense } from '../types';
import TallyInvoice from './TallyInvoice';
import Tanker3D from './Tanker3D';
import * as XLSX from 'xlsx';
import ShipmateDetailModal from './ShipmateDetailModal';

interface TripsProps {
  trips: Trip[];
  lrs: LorryReceipt[];
  tankers: Tanker[];
  drivers: Driver[];
  expenses?: TankerExpense[];
  onStartTrip: (trip: Trip) => void;
  onEndTrip: (tripId: string, unloadingWeight: number, endRate: number, emptyRunTo?: string, emptyRunDistanceKm?: number) => void;
  onAddGeneralExpense: (expense: TankerExpense) => void;
  onAddLr?: (lr: LorryReceipt) => void;
  autoOpenRegister?: boolean;
  onCloseAutoOpen?: () => void;
  onDeleteTrip?: (id: string) => void;
  onImportBulkData?: (data: { tankers?: Tanker[], drivers?: Driver[], lrs?: LorryReceipt[], trips?: Trip[], expenses?: TankerExpense[] }) => void;
  onUpdateTrip?: (trip: Trip) => void;
  onUpdateLr?: (lr: LorryReceipt) => void;
}

export default function Trips({
  trips,
  lrs,
  tankers,
  drivers,
  expenses,
  onStartTrip,
  onEndTrip,
  onAddGeneralExpense,
  onAddLr,
  autoOpenRegister,
  onCloseAutoOpen,
  onDeleteTrip,
  onImportBulkData,
  onUpdateTrip,
  onUpdateLr
}: TripsProps) {
  const [showStartModal, setShowStartModal] = useState(false);
  const [showExpenseModal, setShowExpenseModal] = useState(false);

  // AI Excel Import States
  const [showAiImportModal, setShowAiImportModal] = useState(false);
  const [importingFile, setImportingFile] = useState<File | null>(null);
  const [isAnalysing, setIsAnalysing] = useState(false);
  const [analysingProgress, setAnalysingProgress] = useState('');
  const [aiError, setAiError] = useState<string | null>(null);

  const handleExcelImportSubmit = async () => {
    if (!importingFile) return;
    setIsAnalysing(true);
    setAiError(null);
    setAnalysingProgress('Reading spreadsheet structure...');

    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          const rawRows = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

          setAnalysingProgress('Connecting to Gemini AI for deep logistics pattern mapping and entity translation...');
          
          const response = await fetch('/api/trips/analyse-spreadsheet', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sheetRows: rawRows })
          });

          if (!response.ok) {
            const errData = await response.json();
            throw new Error(errData.error || 'Server spreadsheet analyst reported a processing failure.');
          }

          const parsedResult = await response.json();
          
          if (onImportBulkData && parsedResult && parsedResult.success && parsedResult.data) {
            onImportBulkData(parsedResult.data);
            setShowAiImportModal(false);
            setImportingFile(null);
          } else {
            throw new Error(parsedResult?.error || "No data analyzer return structure or import receiver matched.");
          }
        } catch (err: any) {
          setAiError(err.message || 'Error occurred during spreadsheet reading/analysis.');
        } finally {
          setIsAnalysing(false);
        }
      };

      reader.onerror = () => {
        setAiError('FileReader failed to load the uploaded binary sheet.');
        setIsAnalysing(false);
      };

      reader.readAsArrayBuffer(importingFile);
    } catch (err: any) {
      setAiError(err.message || 'An unexpected error occurred.');
      setIsAnalysing(false);
    }
  };

  useEffect(() => {
    if (autoOpenRegister) {
      setShowStartModal(true);
      if (onCloseAutoOpen) {
        onCloseAutoOpen();
      }
    }
  }, [autoOpenRegister]);

  // Selector for dispatch mode
  const [startLrMode, setStartLrMode] = useState<'create' | 'existing'>('create');

  // Existing L.R. Dispatch Form States
  const [selectedLrId, setSelectedLrId] = useState('');
  const [selectedDriverId, setSelectedDriverId] = useState('');
  const [loadingWeight, setLoadingWeight] = useState<number>(0);
  const [weightUnit, setWeightUnit] = useState<'KL' | 'MT'>('MT');
  const [approxDistance, setApproxDistance] = useState<number>(250); // Chemical shuttle routes average ~250km
  const [isReturnTrip, setIsReturnTrip] = useState(false); // Used to determine loaded vs empty average

  // In-dispatch L.R. Composition Form States
  const [newLrNo, setNewLrNo] = useState('');
  const [newConsignerName, setNewConsignerName] = useState('');
  const [newConsigneeName, setNewConsigneeName] = useState('');
  const [selectedLrTankerId, setSelectedLrTankerId] = useState('');
  const [newProduct, setNewProduct] = useState('');
  const [newLrQty, setNewLrQty] = useState<number>(0);
  const [newLrQtyUnit, setNewLrQtyUnit] = useState<'KL' | 'MT'>('MT');
  const [newPlaceFrom, setNewPlaceFrom] = useState('');
  const [newPlaceTo, setNewPlaceTo] = useState('');
  const [newFreightRate, setNewFreightRate] = useState<number>(0);

  // Expense form (trip or standalone)
  const [expTankerId, setExpTankerId] = useState('');
  const [expCategory, setExpCategory] = useState<'fuel' | 'driver' | 'toll' | 'repair' | 'adblue' | 'other'>('fuel');
  const [expAmount, setExpAmount] = useState<number>(0);
  const [expDetail, setExpDetail] = useState('');

  // Extended fields for richer repair & adblue bills + ledgers tracking
  const [expVendorSelect, setExpVendorSelect] = useState('');
  const [expCustomVendorName, setExpCustomVendorName] = useState('');
  const [expBillNo, setExpBillNo] = useState('');
  const [expPlaceSelect, setExpPlaceSelect] = useState('Ranoli');
  const [expCustomPlace, setExpCustomPlace] = useState('');
  const [expDate, setExpDate] = useState(new Date().toISOString().substring(0, 10));
  const [expWorkTypeSelect, setExpWorkTypeSelect] = useState('Spare Part Changed');
  const [expCustomWorkType, setExpCustomWorkType] = useState('');
  const [expPaymentStatus, setExpPaymentStatus] = useState<'pending' | 'collected'>('collected');

  // Fuel Estimate Calculation
  // loaded: 3km/ltr, empty: 5km/ltr
  const currentAvg = isReturnTrip ? 5 : 3;
  const expectedFuel = parseFloat((approxDistance / currentAvg).toFixed(1));
  // Adblue standard is estimated as 5% of fuel consumption (e.g. 5 ltrs of AdBlue per 100 ltrs of diesel)
  const expectedAdblue = parseFloat((expectedFuel * 0.05).toFixed(1));

  // Filter pending tankers & drivers
  const idleTankers = tankers.filter(t => t.status !== 'running');
  const idleDrivers = drivers.filter(d => d.status !== 'active');
  const pendingLrs = lrs.filter(lr => !trips.some(t => t.lrId === lr.id));

  // End Trip Form Helper (we can expand inline for running trip list)
  const [endingTripId, setEndingTripId] = useState<string | null>(null);
  const [unloadingWeight, setUnloadingWeight] = useState<number>(0);
  const [endingFreightRate, setEndingFreightRate] = useState<number>(0);
  const [emptyRunTo, setEmptyRunTo] = useState<string>('');
  const [emptyRunDistanceKm, setEmptyRunDistanceKm] = useState<number>(0);

  // Local active tab for the trips manager
  const [tripsTab, setTripsTab] = useState<'running' | 'all'>('running');

  // Local state for Trips list filter/search
  const [filterType, setFilterType] = useState<'all' | 'date' | 'month' | 'year'>('all');
  const [filterExactDate, setFilterExactDate] = useState('');
  const [filterMonth, setFilterMonth] = useState<number>(new Date().getMonth() + 1); // 1-12
  const [filterYear, setFilterYear] = useState<number>(2026); // standard default
  const [filterSearch, setFilterSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'running' | 'completed'>('all');
  const [expandedTripId, setExpandedTripId] = useState<string | null>(null);
  const [selectedPreviewInvoice, setSelectedPreviewInvoice] = useState<any | null>(null);
  const [selectedSpecsTrip, setSelectedSpecsTrip] = useState<Trip | null>(null);
  const [selectedDetailTrip, setSelectedDetailTrip] = useState<Trip | null>(null);

  // User custom edit modes
  const [selectedEditTrip, setSelectedEditTrip] = useState<Trip | null>(null);

  // Edit fields
  const [editStartDate, setEditStartDate] = useState('');
  const [editEndDate, setEditEndDate] = useState('');
  const [editPlaceFrom, setEditPlaceFrom] = useState('');
  const [editPlaceTo, setEditPlaceTo] = useState('');
  const [editLoadingWeight, setEditLoadingWeight] = useState(0);
  const [editUnloadingWeight, setEditUnloadingWeight] = useState(0);
  const [editFreightRate, setEditFreightRate] = useState(0);

  // Edit Expenses
  const [editFuelExpense, setEditFuelExpense] = useState(0);
  const [editDriverCharge, setEditDriverCharge] = useState(0);
  const [editTollExpense, setEditTollExpense] = useState(0);
  const [editRepairExpense, setEditRepairExpense] = useState(0);
  const [editMaintenanceExpense, setEditMaintenanceExpense] = useState(0);
  const [editAdblueExpense, setEditAdblueExpense] = useState(0);
  const [editOtherExpense, setEditOtherExpense] = useState(0);

  // Filter shortages and drivers and Billed To
  const [filterShortageOnly, setFilterShortageOnly] = useState(false);
  const [filterDriverId, setFilterDriverId] = useState('all');
  const [filterBilledTo, setFilterBilledTo] = useState('all');

  // "Billed To" override when starting a new trip with pre-saved L.R.
  const [existingLrBilledToOverride, setExistingLrBilledToOverride] = useState('');

  // Synchronize pre-saved L.R override consigner/billed to when selection changes
  useEffect(() => {
    if (selectedLrId) {
      const selectedLrObj = lrs.find(l => l.id === selectedLrId);
      if (selectedLrObj) {
        setExistingLrBilledToOverride(selectedLrObj.consignerName || '');
      }
    } else {
      setExistingLrBilledToOverride('');
    }
  }, [selectedLrId, lrs]);

  // Auto-fill edit states when selectedEditTrip changes
  useEffect(() => {
    if (selectedEditTrip) {
      setEditStartDate(selectedEditTrip.startDate || '');
      setEditEndDate(selectedEditTrip.endDate || '');
      setEditPlaceFrom(selectedEditTrip.placeFrom || '');
      setEditPlaceTo(selectedEditTrip.placeTo || '');
      setEditLoadingWeight(selectedEditTrip.loadingWeight || 0);
      setEditUnloadingWeight(selectedEditTrip.unloadingWeight ?? (selectedEditTrip.loadingWeight || 0));
      setEditFreightRate(selectedEditTrip.freightRateAtEnd || 0);

      setEditFuelExpense(selectedEditTrip.fuelExpense || 0);
      setEditDriverCharge(selectedEditTrip.driverCharge || 0);
      setEditTollExpense(selectedEditTrip.tollExpense || 0);
      setEditRepairExpense(selectedEditTrip.repairExpense || 0);
      setEditMaintenanceExpense(selectedEditTrip.maintenanceExpense || 0);
      setEditAdblueExpense(selectedEditTrip.adblueExpense || 0);
      setEditOtherExpense(selectedEditTrip.otherExpense || 0);
    }
  }, [selectedEditTrip]);

  // Kept scroll placement intact per user instructions to avoid jumping the page when popups are opened
  useEffect(() => {
    // No-op to respect scroll focus where clicked
  }, []);

  const prepareTripExportRecord = (t: Trip) => {
    const associatedLr = lrs.find(l => l.lrNo === t.lrNo);
    const totalExp = t.fuelExpense + t.driverCharge + t.tollExpense + t.repairExpense + (t.maintenanceExpense || 0) + t.adblueExpense + t.otherExpense;
    const freightRateValue = associatedLr?.freightRate || t.freightRateAtEnd || 0;
    const totalFreightValue = t.revenue || (t.loadingWeight * freightRateValue) || 0;
    const calculatedProfitValue = t.profit ?? (totalFreightValue - totalExp);
    const isBilled = t.status === 'completed' ? 'BILLED' : 'DRAFT/UNBILLED';
    const billNumber = t.status === 'completed' ? `INV-${t.id.replace('TRP-', '')}` : 'N/A';
    
    return {
      lrNo: t.lrNo,
      voucherNo: t.id,
      partyName: associatedLr?.consignerName || "Industrial Chemie (Self)",
      from: t.placeFrom,
      to: t.placeTo,
      product: associatedLr?.product || "Chem Specialty Compounds",
      qty: t.loadingWeight,
      qtyUnit: t.qtyUnit,
      freightRate: freightRateValue ? `${freightRateValue}` : 'N/A',
      totalFreight: totalFreightValue ? `${totalFreightValue}` : 'N/A',
      tankerNumber: t.tankerNumber,
      transportName: "Baroda Road Carriers",
      fuelExpense: `${t.fuelExpense}`,
      driverCharge: `${t.driverCharge}`,
      tollExpense: `${t.tollExpense}`,
      repairExpense: `${t.repairExpense}`,
      maintenanceExpense: `${t.maintenanceExpense || 0}`,
      adblueExpense: `${t.adblueExpense}`,
      otherExpense: `${t.otherExpense}`,
      profit: `${calculatedProfitValue}`,
      billedStatus: isBilled,
      billNumber: billNumber
    };
  };

  const handlePrintPreview = (trip: Trip) => {
    const associatedLr = lrs.find(l => l.lrNo === trip.lrNo);
    const freightRateValue = associatedLr?.freightRate || trip.freightRateAtEnd || 0;
    const totalFreightValue = trip.revenue || (trip.loadingWeight * freightRateValue) || 0;
    
    const invoiceData = {
      invoiceNo: trip.status === 'completed' ? `INV-${trip.id.replace('TRP-', '')}` : `DRAFT-${trip.id}`,
      date: trip.endDate || trip.startDate,
      consignerName: associatedLr?.consignerName || "Industrial Chemie Consigner (Self-Load)",
      consignerAddress: "Primary Chemical Zone Bypass, Ranoli GIDC, Vadodara GJ",
      consignerGstin: "24AAAPC1994D1Z9",
      consigneeName: associatedLr?.consigneeName || "Other Terminal Depot",
      consigneeAddress: `${trip.placeTo} Terminal Area Gate, Transit Warehouse Zone`,
      consigneeGstin: "24AAACD2004B1ZE",
      tankerNumber: trip.tankerNumber,
      product: associatedLr?.product || "Chem Specialty Compounds",
      quantity: trip.loadingWeight,
      qtyUnit: trip.qtyUnit,
      rate: freightRateValue,
      amount: totalFreightValue,
      hsnCode: "996511",
      termsOfDelivery: "Direct bulk chemical discharge with hazardous logistics safety clearance."
    };
    setSelectedPreviewInvoice(invoiceData);
  };

  // Local filtered trips calculation:
  const getFilteredTrips = () => {
    return trips.filter(trip => {
      // 1. Search term match
      if (filterSearch) {
        const q = filterSearch.toLowerCase();
        const matchId = trip.id.toLowerCase().includes(q);
        const matchLr = trip.lrNo.toLowerCase().includes(q);
        const matchTanker = trip.tankerNumber.toLowerCase().includes(q);
        const matchDriver = trip.driverName.toLowerCase().includes(q);
        const matchRoute = `${trip.placeFrom} ${trip.placeTo}`.toLowerCase().includes(q);
        if (!matchId && !matchLr && !matchTanker && !matchDriver && !matchRoute) {
          return false;
        }
      }

      // 2. Status match
      if (filterStatus !== 'all' && trip.status !== filterStatus) {
        return false;
      }

      // 3. Shortage only filter
      if (filterShortageOnly) {
        if (trip.status !== 'completed') return false;
        const shortageAmount = (trip.loadingWeight || 0) - (trip.unloadingWeight || 0);
        if (shortageAmount <= 0.005) return false; // negligible shortage threshhold
      }

      // 4. Driver filter
      if (filterDriverId !== 'all' && trip.driverId !== filterDriverId) {
        return false;
      }

      // 5. Billed To filter
      if (filterBilledTo !== 'all') {
        const associatedLr = lrs.find(l => l.id === trip.lrId);
        const billedParty = associatedLr?.consignerName || "Industrial Chemie (Self)";
        if (billedParty !== filterBilledTo) {
          return false;
        }
      }

      // 6. Date / Month / Year match
      const tripDateStr = trip.startDate; // YYYY-MM-DD
      if (!tripDateStr) return true;
      const [tYear, tMonth] = tripDateStr.split('-').map(Number);

      if (filterType === 'date') {
        if (!filterExactDate) return true;
        return tripDateStr === filterExactDate;
      } else if (filterType === 'month') {
        return tYear === filterYear && tMonth === filterMonth;
      } else if (filterType === 'year') {
        return tYear === filterYear;
      }

      return true;
    });
  };

  const archiveTrips = getFilteredTrips();

  const archiveStats = (() => {
    let matchesCount = archiveTrips.length;
    let totalRevenue = 0;
    let totalExpenses = 0;
    
    archiveTrips.forEach(t => {
      totalRevenue += t.revenue || 0;
      totalExpenses += t.fuelExpense + t.driverCharge + t.tollExpense + t.repairExpense + (t.maintenanceExpense || 0) + t.adblueExpense + t.otherExpense;
    });

    return {
      matchesCount,
      totalRevenue,
      totalExpenses,
      totalProfit: totalRevenue - totalExpenses
    };
  })();

  const exportArchiveToCSV = () => {
    const headers = [
      'L.R No.', 
      'Voucher No.', 
      'Party Name (Billed to)', 
      'From', 
      'To', 
      'Product', 
      'Qty.', 
      'Qty In', 
      'Freight Rate', 
      'Total Freight', 
      'Tanker Number', 
      'Transport Name', 
      'Diesel Expense', 
      'Driver Pay', 
      'Toll Taxes', 
      'Workshop Repairs', 
      'Preventive Maintenance', 
      'AdBlue Fluids', 
      'Other Expenses', 
      'Calculated Profit', 
      'Billed or Not', 
      'Bill Number if Billed'
    ];
    
    let rows = [headers];

    archiveTrips.forEach(t => {
      const rec = prepareTripExportRecord(t);
      rows.push([
        rec.lrNo,
        rec.voucherNo,
        rec.partyName,
        rec.from,
        rec.to,
        rec.product,
        String(rec.qty),
        rec.qtyUnit,
        rec.freightRate,
        rec.totalFreight,
        rec.tankerNumber,
        rec.transportName,
        rec.fuelExpense,
        rec.driverCharge,
        rec.tollExpense,
        rec.repairExpense,
        rec.maintenanceExpense,
        rec.adblueExpense,
        rec.otherExpense,
        rec.profit,
        rec.billedStatus,
        rec.billNumber
      ]);
    });

    const csvContent = "data:text/csv;charset=utf-8," 
      + rows.map(e => e.map(val => `"${String(val).replace(/"/g, '""')}"`).join(",")).join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Filtered_Archive_Trips_Export_${new Date().toISOString().substring(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportArchiveToPDF = () => {
    const dataToExport = archiveTrips.map(t => prepareTripExportRecord(t));
    const headers = [
      'L.R No.', 
      'Voucher No.', 
      'Party Name (Billed to)', 
      'From', 
      'To', 
      'Product', 
      'Qty.', 
      'Qty In', 
      'Freight Rate', 
      'Total Freight', 
      'Tanker Number', 
      'Transport Name', 
      'Diesel Exp', 
      'Driver Pay', 
      'Toll Taxes', 
      'Repairs', 
      'AdBlue', 
      'Other Exp', 
      'Profit', 
      'Billed', 
      'Bill No'
    ];
    const keys = [
      'lrNo',
      'voucherNo',
      'partyName',
      'from',
      'to',
      'product',
      'qty',
      'qtyUnit',
      'freightRate',
      'totalFreight',
      'tankerNumber',
      'transportName',
      'fuelExpense',
      'driverCharge',
      'tollExpense',
      'repairExpense',
      'adblueExpense',
      'otherExpense',
      'profit',
      'billedStatus',
      'billNumber'
    ];
    exportToPDF('Filtered Trips Registry Report', headers, keys, dataToExport, `Filtered_Trips_Logistics_Report.pdf`, 'Official Filtered Chemical Logistics Archives Booklet');
  };

  const startTripHandler = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDriverId) {
      alert("Please select a valid active driver.");
      return;
    }

    const drvObj = drivers.find(d => d.id === selectedDriverId);
    if (!drvObj) return;

    let lrObj: LorryReceipt | undefined;

    if (startLrMode === 'create') {
      if (!selectedLrTankerId) {
        alert("Please select a compliant empty tanker.");
        return;
      }
      const tankerObj = tankers.find(t => t.id === selectedLrTankerId);
      if (!tankerObj) return;

      if (!newConsignerName || !newConsigneeName || !newProduct || newLrQty <= 0 || newFreightRate <= 0 || !newPlaceFrom || !newPlaceTo) {
        alert("Please fill in all Lorry Receipt fields with valid inputs.");
        return;
      }

      const randomSuffix = Math.floor(100 + Math.random() * 900);
      const generatedLrNo = newLrNo.trim() || `LR-BRC-${new Date().toISOString().substring(2, 10).replace(/-/g, '')}-${randomSuffix}`;
      
      lrObj = {
        id: `LR-${Math.floor(1000 + Math.random() * 9000)}`,
        lrNo: generatedLrNo.toUpperCase(),
        dated: new Date().toISOString().substring(0, 10),
        consignerName: newConsignerName.trim(),
        consigneeName: newConsigneeName.trim(),
        tankerId: tankerObj.id,
        tankerNumber: tankerObj.tankerNumber,
        product: newProduct.trim(),
        qty: newLrQty,
        qtyUnit: newLrQtyUnit,
        placeFrom: newPlaceFrom.trim(),
        placeTo: newPlaceTo.trim(),
        freightRate: newFreightRate,
        freightTotal: newLrQty * newFreightRate,
        status: 'pending'
      };

      if (onAddLr) {
        onAddLr(lrObj);
      }
    } else {
      if (!selectedLrId) {
        alert("Please choose an existing pending Lorry Receipt.");
        return;
      }
      const existingLr = lrs.find(l => l.id === selectedLrId);
      if (existingLr) {
        lrObj = { ...existingLr };
        if (existingLrBilledToOverride) {
          lrObj.consignerName = existingLrBilledToOverride.trim();
          if (onUpdateLr) {
            onUpdateLr(lrObj);
          }
        }
      }
    }

    if (!lrObj) return;

    const newTrip: Trip = {
      id: `TRP-${Math.floor(100 + Math.random() * 900)}`,
      lrId: lrObj.id,
      lrNo: lrObj.lrNo,
      tankerId: lrObj.tankerId,
      tankerNumber: lrObj.tankerNumber,
      driverId: drvObj.id,
      driverName: drvObj.name,
      placeFrom: lrObj.placeFrom,
      placeTo: lrObj.placeTo,
      qty: lrObj.qty,
      qtyUnit: startLrMode === 'create' ? newLrQtyUnit : weightUnit,
      startDate: new Date().toISOString().split('T')[0],
      status: 'running',
      loadingWeight: startLrMode === 'create' ? newLrQty : (loadingWeight || lrObj.qty),
      approxDistanceKm: approxDistance,
      expectedFuelLiters: expectedFuel,
      expectedAdblueLiters: expectedAdblue,
      
      fuelExpense: 0,
      driverCharge: 0,
      tollExpense: 0,
      repairExpense: 0,
      maintenanceExpense: 0,
      adblueExpense: 0,
      adblueAddedLiters: 0,
      otherExpense: 0
    };

    onStartTrip(newTrip);
    setShowStartModal(false);

    // Reset Forms
    setSelectedLrId('');
    setSelectedDriverId('');
    setLoadingWeight(0);
    setApproxDistance(250);
    setIsReturnTrip(false);

    // Reset Inner LR Form
    setNewLrNo('');
    setNewConsignerName('');
    setNewConsigneeName('');
    setNewProduct('');
    setNewLrQty(0);
    setNewPlaceFrom('');
    setNewPlaceTo('');
    setNewFreightRate(0);
  };

  const handleSaveEditTrip = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEditTrip) return;

    const totalExp = editFuelExpense + editDriverCharge + editTollExpense + editRepairExpense + editMaintenanceExpense + editAdblueExpense + editOtherExpense;
    
    // Recalculate revenue based on loadingWeight for completed trips in sync with our core change
    const updatedRevenue = selectedEditTrip.status === 'completed' 
      ? (editLoadingWeight * editFreightRate) 
      : 0;

    const updatedProfit = selectedEditTrip.status === 'completed'
      ? (updatedRevenue - totalExp)
      : -totalExp;

    const updatedTrip: Trip = {
      ...selectedEditTrip,
      startDate: editStartDate,
      endDate: editEndDate || selectedEditTrip.endDate,
      placeFrom: editPlaceFrom,
      placeTo: editPlaceTo,
      loadingWeight: editLoadingWeight,
      unloadingWeight: editUnloadingWeight,
      freightRateAtEnd: editFreightRate,
      
      fuelExpense: editFuelExpense,
      driverCharge: editDriverCharge,
      tollExpense: editTollExpense,
      repairExpense: editRepairExpense,
      maintenanceExpense: editMaintenanceExpense,
      adblueExpense: editAdblueExpense,
      otherExpense: editOtherExpense,
      
      revenue: updatedRevenue,
      profit: updatedProfit
    };

    if (onUpdateTrip) {
      onUpdateTrip(updatedTrip);
    }

    // Also update associated Lorry Receipt if needed (e.g. source, destination, product, weight)
    const associatedLr = lrs.find(l => l.lrNo === selectedEditTrip.lrNo);
    if (associatedLr && onUpdateLr) {
      const updatedLr: LorryReceipt = {
        ...associatedLr,
        placeFrom: editPlaceFrom,
        placeTo: editPlaceTo,
        qty: editLoadingWeight,
        freightRate: editFreightRate,
        freightTotal: editLoadingWeight * editFreightRate
      };
      onUpdateLr(updatedLr);
    }

    setSelectedEditTrip(null);
  };

  const expenseHandler = (e: React.FormEvent) => {
    e.preventDefault();
    if (!expTankerId || expAmount <= 0) return;

    const tnk = tankers.find(t => t.id === expTankerId);
    if (!tnk) return;

    // Resolve final values depending on custom vs prefilled dropdown selections
    const isSpecialCategory = expCategory === 'repair' || expCategory === 'adblue';
    const finalVendor = isSpecialCategory ? (expVendorSelect === 'custom' || !expVendorSelect ? expCustomVendorName : expVendorSelect) : undefined;
    const finalPlace = isSpecialCategory ? (expPlaceSelect === 'custom' || !expPlaceSelect ? expCustomPlace : expPlaceSelect) : undefined;
    const finalWorkType = expCategory === 'repair' ? (expWorkTypeSelect === 'custom' || !expWorkTypeSelect ? expCustomWorkType : expWorkTypeSelect) : (expCategory === 'adblue' ? 'AdBlue Refill' : undefined);

    const generatedDetail = expDetail || (finalWorkType ? `${finalWorkType} done at ${finalPlace || 'Ranoli'}` : '');

    const newExp: TankerExpense = {
      id: `EXP-${Math.floor(1000 + Math.random() * 9000)}`,
      tankerId: tnk.id,
      tankerNumber: tnk.tankerNumber,
      date: isSpecialCategory ? (expDate || new Date().toISOString().split('T')[0]) : new Date().toISOString().split('T')[0],
      category: expCategory,
      amount: expAmount,
      detail: generatedDetail,
      vendorName: finalVendor || undefined,
      billNo: isSpecialCategory ? (expBillNo || `MNT-CASH-${Math.floor(1000 + Math.random() * 9000)}`) : undefined,
      place: finalPlace || undefined,
      workType: finalWorkType || undefined,
      paymentStatus: isSpecialCategory ? expPaymentStatus : 'collected'
    };

    onAddGeneralExpense(newExp);
    setShowExpenseModal(false);

    // reset
    setExpTankerId('');
    setExpCategory('fuel');
    setExpAmount(0);
    setExpDetail('');
    setExpVendorSelect('');
    setExpCustomVendorName('');
    setExpBillNo('');
    setExpPlaceSelect('Ranoli');
    setExpCustomPlace('');
    setExpDate(new Date().toISOString().substring(0, 10));
    setExpWorkTypeSelect('Spare Part Changed');
    setExpCustomWorkType('');
    setExpPaymentStatus('collected');
  };

  const endTripSubmit = (tripId: string) => {
    if (unloadingWeight <= 0 || endingFreightRate <= 0) {
      alert("Please specify valid unloading weight and freight rate.");
      return;
    }
    onEndTrip(tripId, unloadingWeight, endingFreightRate, emptyRunTo, emptyRunDistanceKm);
    setEndingTripId(null);
    setUnloadingWeight(0);
    setEndingFreightRate(0);
    setEmptyRunTo('');
    setEmptyRunDistanceKm(0);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 py-6 selection:bg-[#ff5a5f] selection:text-white">
      {/* Upper header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#30363d] pb-6">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Active Trip Controls</h2>
          <p className="text-xs text-[#8b949e] font-mono mt-1">START LOGISTICS ROUTES, MANAGE EXPENSES, AUDIT PROFIT CHANNELS</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={() => {
              const tripDataToExport = trips.map(t => prepareTripExportRecord(t));
              const headers = [
                'L.R No.', 
                'Voucher No.', 
                'Party Name (Billed to)', 
                'From', 
                'To', 
                'Product', 
                'Qty.', 
                'Qty In', 
                'Freight Rate', 
                'Total Freight', 
                'Tanker Number', 
                'Transport Name', 
                'Diesel Expense', 
                'Driver Pay', 
                'Toll Taxes', 
                'Workshop Repairs', 
                'AdBlue Fluids', 
                'Other Expenses', 
                'Calculated Profit', 
                'Billed or Not', 
                'Bill Number if Billed'
              ];
              const keys = [
                'lrNo',
                'voucherNo',
                'partyName',
                'from',
                'to',
                'product',
                'qty',
                'qtyUnit',
                'freightRate',
                'totalFreight',
                'tankerNumber',
                'transportName',
                'fuelExpense',
                'driverCharge',
                'tollExpense',
                'repairExpense',
                'adblueExpense',
                'otherExpense',
                'profit',
                'billedStatus',
                'billNumber'
              ];
              exportToExcel('Trips Logistics Audit Report', headers, keys, tripDataToExport, 'Trips_Logistics_Report.csv');
            }}
            className="px-3 py-2.5 bg-[#21262d] hover:bg-[#30363d] border border-[#30363d] text-emerald-400 hover:text-emerald-300 rounded-xl text-xs font-semibold inline-flex items-center gap-1 cursor-pointer font-sans"
            title="Export all trips list to Excel spreadsheet compatible CSV"
          >
            <Download className="w-3.5 h-3.5" />
            Excel
          </button>
          
          <button 
            onClick={() => {
              const activeTrips = getFilteredTrips();
              const tripDataToExport = activeTrips.map(t => prepareTripExportRecord(t));

              // Calculate financial totals
              let totalQty = 0;
              let totalFreight = 0;
              let totalFuel = 0;
              let totalDriver = 0;
              let totalToll = 0;
              let totalRepair = 0;
              let totalAdBlue = 0;
              let totalOther = 0;
              let totalProfit = 0;

              tripDataToExport.forEach(rec => {
                totalQty += parseFloat(String(rec.qty)) || 0;
                totalFreight += parseFloat(String(rec.totalFreight)) || 0;
                totalFuel += parseFloat(String(rec.fuelExpense)) || 0;
                totalDriver += parseFloat(String(rec.driverCharge)) || 0;
                totalToll += parseFloat(String(rec.tollExpense)) || 0;
                totalRepair += parseFloat(String(rec.repairExpense)) || 0;
                totalAdBlue += parseFloat(String(rec.adblueExpense)) || 0;
                totalOther += parseFloat(String(rec.otherExpense)) || 0;
                totalProfit += parseFloat(String(rec.profit)) || 0;
              });

              const headers = [
                'L.R No.', 
                'Voucher No.', 
                'Party Name (Billed to)', 
                'From', 
                'To', 
                'Product', 
                'Qty.', 
                'Qty In', 
                'Freight Rate', 
                'Total Freight', 
                'Tanker Number', 
                'Transport Name', 
                'Diesel Expense', 
                'Driver Pay', 
                'Toll Taxes', 
                'Workshop Repairs', 
                'AdBlue Fluids', 
                'Other Expenses', 
                'Calculated Profit', 
                'Billed or Not', 
                'Bill Number if Billed'
              ];

              const keys = [
                'lrNo',
                'voucherNo',
                'partyName',
                'from',
                'to',
                'product',
                'qty',
                'qtyUnit',
                'freightRate',
                'totalFreight',
                'tankerNumber',
                'transportName',
                'fuelExpense',
                'driverCharge',
                'tollExpense',
                'repairExpense',
                'adblueExpense',
                'otherExpense',
                'profit',
                'billedStatus',
                'billNumber'
              ];

              const rows = [headers];

              // Add trips rows
              tripDataToExport.forEach((item: any) => {
                const row = keys.map((key) => {
                  const val = item[key];
                  if (val === undefined || val === null) return '';
                  return String(val).replace(/"/g, '""');
                });
                rows.push(row);
              });

              // Add financial totals row
              const totalsRow = keys.map((key) => {
                if (key === 'lrNo') return 'TOTALS (CURRENTLY FILTERED)';
                if (key === 'qty') return totalQty.toFixed(2);
                if (key === 'totalFreight') return totalFreight.toFixed(2);
                if (key === 'fuelExpense') return totalFuel.toFixed(0);
                if (key === 'driverCharge') return totalDriver.toFixed(0);
                if (key === 'tollExpense') return totalToll.toFixed(0);
                if (key === 'repairExpense') return totalRepair.toFixed(0);
                if (key === 'adblueExpense') return totalAdBlue.toFixed(0);
                if (key === 'otherExpense') return totalOther.toFixed(0);
                if (key === 'profit') return totalProfit.toFixed(0);
                return '';
              });
              rows.push(totalsRow);

              const csvContent = "\ufeff" + rows.map(r => r.map(cell => `"${cell}"`).join(",")).join("\n");
              const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
              const url = URL.createObjectURL(blob);
              
              const link = document.createElement("a");
              link.setAttribute("href", url);
              link.setAttribute("download", `Trips_Currently_Filtered_Logistics_Export_${new Date().toISOString().substring(0, 10)}.csv`);
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
              URL.revokeObjectURL(url);
            }}
            className="px-3 py-2.5 bg-[#21262d] hover:bg-[#30363d] border border-[#30363d] text-orange-400 hover:text-orange-300 rounded-xl text-xs font-semibold inline-flex items-center gap-1 cursor-pointer font-sans"
            title="Download CSV containing currently filtered trips and comprehensive financial totals row"
          >
            <Download className="w-3.5 h-3.5" />
            Download CSV
          </button>
          <button 
            onClick={() => {
              const tripDataToExport = trips.map(t => prepareTripExportRecord(t));
              const headers = [
                'L.R No.', 
                'Voucher No.', 
                'Party Name (Billed to)', 
                'From', 
                'To', 
                'Product', 
                'Qty.', 
                'Qty In', 
                'Freight Rate', 
                'Total Freight', 
                'Tanker Number', 
                'Transport Name', 
                'Diesel Exp', 
                'Driver Pay', 
                'Toll Taxes', 
                'Repairs', 
                'AdBlue', 
                'Other Exp', 
                'Profit', 
                'Billed', 
                'Bill No'
              ];
              const keys = [
                'lrNo',
                'voucherNo',
                'partyName',
                'from',
                'to',
                'product',
                'qty',
                'qtyUnit',
                'freightRate',
                'totalFreight',
                'tankerNumber',
                'transportName',
                'fuelExpense',
                'driverCharge',
                'tollExpense',
                'repairExpense',
                'adblueExpense',
                'otherExpense',
                'profit',
                'billedStatus',
                'billNumber'
              ];
              exportToPDF('Trips Logistics Report', headers, keys, tripDataToExport, 'Trips_Logistics_Report.pdf', 'F01 Petrochem Distribution Logistics Channel Ledger');
            }}
            className="px-3 py-2.5 bg-[#21262d] hover:bg-[#30363d] border border-[#30363d] text-red-400 hover:text-red-300 rounded-xl text-xs font-semibold inline-flex items-center gap-1 cursor-pointer font-sans"
            title="Download PDF booklet of official trip sheets"
          >
            <Download className="w-3.5 h-3.5" />
            PDF
          </button>
          <button 
            onClick={() => setShowAiImportModal(true)}
            className="px-3 py-2.5 bg-[#21262d] text-cyan-400 hover:text-cyan-300 hover:bg-[#30363d] border border-[#30363d] rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
            title="Upload and parse historical Excel sheet via Gemini AI"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            AI Import
          </button>
          <button 
            onClick={() => setShowExpenseModal(true)}
            className="px-4 py-2.5 bg-[#21262d] text-[#8b949e] hover:text-white border border-[#30363d] rounded-xl text-xs font-semibold cursor-pointer"
          >
            Add Tanker Expense
          </button>
          <button 
            onClick={() => setShowStartModal(true)}
            className="px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-semibold rounded-xl text-xs inline-flex items-center gap-1.5 shadow-md shadow-emerald-500/10 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Dispatch New Trip
          </button>
        </div>
      </div>

      {/* Sub tabs: Active Fleet vs Comprehensive History Archive */}
      <div className="flex bg-[#161b22] border border-[#30363d] p-1 rounded-xl max-w-full text-xs font-mono mb-6">
        <button 
          onClick={() => setTripsTab('running')}
          className={`flex-1 sm:flex-initial py-2.5 px-6 rounded-lg text-center font-bold cursor-pointer transition-all ${
            tripsTab === 'running' 
              ? 'bg-[#1f6feb] text-white shadow' 
              : 'text-[#8b949e] hover:text-white'
          }`}
        >
          🚚 Active Fleet Deployments (Running)
        </button>
        <button 
          onClick={() => setTripsTab('all')}
          className={`flex-1 sm:flex-initial py-2.5 px-6 rounded-lg text-center font-bold cursor-pointer transition-all ${
            tripsTab === 'all' 
              ? 'bg-[#1f6feb] text-white shadow' 
              : 'text-[#8b949e] hover:text-white'
          }`}
        >
          📊 Comprehensive Trip Registry (Archive & Expenses Guide)
        </button>
      </div>

      {tripsTab === 'running' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* En-Route Trips Drawer/List */}
          <div className="lg:col-span-8 space-y-6">
            <div className="bg-[#161b22] border border-[#30363d] rounded-2xl p-6">
              <h3 className="text-base font-bold text-white mb-5 flex items-center gap-2">
                <span className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" />
                Running Tanker Fleets En-Route
              </h3>

              {trips.filter(t => t.status === 'running').length === 0 ? (
                <div className="text-center py-12 bg-[#0d1117] border border-dashed border-[#30363d] rounded-2xl text-[#8b949e]">
                  <Info className="w-10 h-10 mx-auto mb-3 text-blue-500/40" />
                  <p className="text-sm font-semibold text-white">No active runs logged</p>
                  <p className="text-xs mt-1">Dispatched tankers running petrochemical loads will display here.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {trips.filter(t => t.status === 'running').map((trip) => {
                    const isEndingThisOne = endingTripId === trip.id;
                    const totalTripExp = trip.fuelExpense + trip.driverCharge + trip.tollExpense + trip.repairExpense + (trip.maintenanceExpense || 0) + trip.adblueExpense + trip.otherExpense;
                    
                    // Route duration & dispatch timing metrics
                    const estDays = Math.max(1, Math.ceil((trip.approxDistanceKm || 250) / 200));
                    const estDurationMs = estDays * 24 * 60 * 60 * 1000;
                    const startMs = new Date(trip.startDate).getTime();
                    const referenceTime = new Date('2026-05-24T12:20:43Z').getTime();
                    const elapsedMs = Math.max(2 * 60 * 60 * 1000, referenceTime - startMs); // minimum 2 hours elapsed 
                    
                    let progressPercent = Math.min(Math.round((elapsedMs / estDurationMs) * 100), 98);
                    if (progressPercent < 15) progressPercent = 15;
                    if (progressPercent > 95) progressPercent = 95;

                    // Compute dynamic route transit state & status badges
                    let statusLabel = 'In Progress';
                    let statusDetails = 'Dispatched from Hub';
                    let badgeStyles = 'bg-blue-500/10 text-blue-400 border-blue-500/20';

                    if (progressPercent >= 35 && progressPercent < 75) {
                      statusLabel = 'In Progress';
                      statusDetails = 'Midway Transit';
                      badgeStyles = 'bg-sky-500/10 text-sky-400 border-sky-500/20';
                    } else if (progressPercent >= 75 && progressPercent < 90) {
                      statusLabel = 'In Progress';
                      statusDetails = 'Nearing Target';
                      badgeStyles = 'bg-amber-500/10 text-amber-400 border-amber-500/30';
                    } else if (progressPercent >= 90) {
                      statusLabel = 'Awaiting Receipt';
                      statusDetails = 'Arrived at Site';
                      badgeStyles = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 animate-pulse';
                    }
                                   return (
                      <div key={trip.id} className="p-5 bg-[#0d1117] border border-[#30363d] rounded-2xl relative overflow-hidden">
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                          
                          {/* Column 1: Logistics and interactive controls */}
                          <div className="lg:col-span-8 flex flex-col justify-between space-y-4">
                            {/* Top bar info */}
                            <div className="flex flex-wrap justify-between items-center gap-3">
                              <div className="space-y-0.5">
                                <span className="text-xs text-[#8b949e] font-mono tracking-wide">ID: {trip.id} | LR: {trip.lrNo}</span>
                                <h4 className="text-base font-black text-white flex items-center gap-2">
                                  <Truck className="w-4 h-4 text-emerald-400" />
                                  {trip.tankerNumber}
                                </h4>
                              </div>

                              {/* Compact horizontal SVG geographic path sensor */}
                              <CompactTripPathVisualizer 
                                from={trip.placeFrom} 
                                to={trip.placeTo} 
                                isRunning={trip.status === 'running'} 
                              />

                              <div className="text-right">
                                <span className={`inline-flex flex-col items-end px-3 py-1 border rounded-xl font-mono ${badgeStyles}`}>
                                  <span className="text-[10px] font-bold uppercase tracking-wider">{statusLabel}</span>
                                  <span className="text-[8.5px] opacity-80">{statusDetails}</span>
                                </span>
                                <span className="block text-[11px] text-[#8b949e] mt-1.5 font-mono">Started: {trip.startDate}</span>
                              </div>
                            </div>

                            {/* Route specs */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 py-3 border-t border-b border-[#21262d] text-xs text-left">
                              <div>
                                <span className="block text-[#8b949e] uppercase font-mono text-[10px]">Source</span>
                                <span className="font-semibold text-white block truncate">{trip.placeFrom}</span>
                              </div>
                              <div>
                                <span className="block text-[#8b949e] uppercase font-mono text-[10px]">Destination</span>
                                <span className="font-semibold text-white block truncate">{trip.placeTo}</span>
                              </div>
                              <div>
                                <span className="block text-[#8b949e] uppercase font-mono text-[10px]">Load weight</span>
                                <span className="font-bold text-white block">{trip.loadingWeight} {trip.qtyUnit}</span>
                              </div>
                              <div>
                                <span className="block text-[#8b949e] uppercase font-mono text-[10px]">Estimated Fuel / AdBlue</span>
                                <span className="font-bold text-yellow-400 block font-mono">
                                  {trip.expectedFuelLiters}L / {trip.expectedAdblueLiters}L
                                </span>
                              </div>
                            </div>

                            {/* Visual Linear Transit Progress Bar based on precalculated duration */}
                            <div className="bg-[#161b22]/70 border border-[#21262d] p-3 rounded-xl space-y-1.5 text-left">
                              <div className="flex justify-between items-center text-[10.5px]">
                                <span className="font-mono text-[#8b949e] flex items-center gap-1.5">
                                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse"></span>
                                  Route Dispatch Transit Progress ({progressPercent}%)
                                </span>
                                <span className="font-mono text-emerald-400 font-bold">Est. Duration: {estDays} Days</span>
                              </div>
                              <div className="w-full bg-[#1b2028] h-2 rounded-full overflow-hidden relative">
                                <div 
                                  className="bg-gradient-to-r from-blue-500 via-indigo-500 to-emerald-400 h-full rounded-full transition-all duration-700"
                                  style={{ width: `${progressPercent}%` }}
                                />
                              </div>
                              <div className="flex justify-between text-[10px] text-[#8b949e] font-mono select-none">
                                  <span>Dispatched: {trip.startDate}</span>
                                  <span>Elapsed hours: {((elapsedMs) / (1000 * 60 * 60)).toFixed(1)} hrs</span>
                              </div>
                            </div>

                            {/* Expenses logged so far */}
                            <div className="text-xs text-left">
                              <span className="font-mono text-[#8b949e] uppercase text-[10px] block mb-2">Logged Expenses on Route</span>
                              <div className="flex flex-wrap gap-2 text-[11px] text-white">
                                <span className="px-2.5 py-1 bg-[#21262d] rounded-lg">Diesel: ₹{trip.fuelExpense}</span>
                                <span className="px-2.5 py-1 bg-[#21262d] rounded-lg">Driver: ₹{trip.driverCharge}</span>
                                <span className="px-2.5 py-1 bg-[#21262d] rounded-lg">Tolls: ₹{trip.tollExpense}</span>
                                <span className="px-2.5 py-1 bg-[#21262d] rounded-lg">Repair: ₹{trip.repairExpense}</span>
                                <span className="px-2.5 py-1 bg-[#21262d] rounded-lg">AdBlue: ₹{trip.adblueExpense} ({trip.adblueAddedLiters}L)</span>
                                <span className="px-2.5 py-1 bg-[#ff5a5f]/10 text-[#ff7b7f] rounded-lg font-bold font-mono">Total: ₹{totalTripExp}</span>
                              </div>
                            </div>

                            {/* Action trigger */}
                            {!isEndingThisOne ? (
                              <div className="pt-2 flex justify-between items-center gap-2">
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => handlePrintPreview(trip)}
                                    className="px-3 py-1.5 bg-[#21262d] hover:bg-[#30363d] border border-[#30363d] text-amber-500 hover:text-amber-400 rounded-lg text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer font-sans transition-all"
                                    title="Preview or print chemical shipment transit invoice draft"
                                  >
                                    <Printer className="w-3.5 h-3.5" />
                                    Print Invoice
                                  </button>
                                  {onDeleteTrip && (
                                    <button
                                      onClick={() => onDeleteTrip(trip.id)}
                                      className="px-3 py-1.5 bg-rose-500/10 border border-rose-500/20 hover:bg-rose-500 text-rose-400 hover:text-white rounded-lg text-xs font-bold inline-flex items-center gap-1 transition-all cursor-pointer font-mono"
                                      title="Move active trip to Trash Bin"
                                    >
                                      Send to Trash
                                    </button>
                                  )}
                                </div>
                                <button 
                                  onClick={() => {
                                    setEndingTripId(trip.id);
                                    setUnloadingWeight(trip.loadingWeight);
                                    // Seed default invoice rate from LR
                                    const associatedLr = lrs.find(l => l.id === trip.lrId);
                                    setEndingFreightRate(associatedLr ? associatedLr.freightRate : 0);
                                  }}
                                  className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:opacity-95 text-white text-xs font-semibold rounded-lg shadow cursor-pointer"
                                >
                                  Mark Completed & End Route
                                </button>
                              </div>
                            ) : (
                              <motion.div 
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                className="bg-[#161b22] border border-[#30363d] p-4 rounded-xl space-y-4 text-xs"
                              >
                                <div className="flex justify-between items-center pb-2 border-b border-[#30363d]">
                                  <span className="font-bold text-white uppercase tracking-wider font-mono text-[11px] text-left block">End Route Parameters</span>
                                  <button onClick={() => setEndingTripId(null)} className="text-[#8b949e] hover:text-white pb-1 font-bold">Cancel</button>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <div className="text-left">
                                    <label className="block text-[#8b949e] font-mono text-[10px] uppercase mb-1">Unloading Weight ({trip.qtyUnit}) *</label>
                                    <input 
                                      type="number" 
                                      step="any"
                                      value={unloadingWeight}
                                      onChange={(e) => setUnloadingWeight(parseFloat(e.target.value) || 0)}
                                      className="w-full px-3 py-2 bg-[#0d1117] border border-[#30363d] rounded text-white font-mono"
                                    />
                                    <p className="text-[10px] text-[#8b949e] mt-1">
                                      Loaded: {trip.loadingWeight} {trip.qtyUnit} 
                                      {unloadingWeight > 0 && unloadingWeight < trip.loadingWeight && (
                                        <span className="text-[#ff723b] font-bold ml-1">
                                          | Shortage: {(trip.loadingWeight - unloadingWeight).toFixed(3)} {trip.qtyUnit} Deficit ⚠️
                                        </span>
                                      )}
                                      {unloadingWeight > 0 && unloadingWeight === trip.loadingWeight && (
                                        <span className="text-emerald-400 font-bold ml-1">
                                          | No Shortage (Perfect Unload)
                                        </span>
                                      )}
                                    </p>
                                  </div>
                                  <div className="text-left">
                                    <label className="block text-[#8b949e] font-mono text-[10px] uppercase mb-1">Final Freight Rate per {trip.qtyUnit} *</label>
                                    <input 
                                      type="number" 
                                      step="any"
                                      value={endingFreightRate}
                                      onChange={(e) => setEndingFreightRate(parseFloat(e.target.value) || 0)}
                                      className="w-full px-3 py-2 bg-[#0d1117] border border-[#30363d] rounded text-white font-mono"
                                    />
                                  </div>
                                </div>

                                {/* Empty Tanker Run details */}
                                <div className="p-3 bg-white/[0.02] border border-[#30363d] rounded-lg text-left space-y-3">
                                  <span className="block text-[10px] font-mono font-extrabold text-indigo-400 uppercase">
                                    🚚 Empty Tanker Routing details (Next loading place)
                                  </span>
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                      <label className="block text-[#8b949e] font-mono text-[9.5px] uppercase mb-1">Next loading terminal / Destination Place</label>
                                      <input 
                                        type="text" 
                                        value={emptyRunTo}
                                        onChange={(e) => setEmptyRunTo(e.target.value)}
                                        placeholder="e.g. Dahej, Jamnagar or Hazira"
                                        className="w-full px-3 py-2 bg-[#0d1117] border border-[#30363d] rounded text-white font-mono text-xs"
                                      />
                                    </div>
                                    <div>
                                      <label className="block text-[#8b949e] font-mono text-[9.5px] uppercase mb-1">Estimated Distance for Empty Run (in Km)</label>
                                      <input 
                                        type="number" 
                                        min="0"
                                        value={emptyRunDistanceKm || ''}
                                        onChange={(e) => setEmptyRunDistanceKm(parseFloat(e.target.value) || 0)}
                                        placeholder="e.g. 150"
                                        className="w-full px-3 py-2 bg-[#0d1117] border border-[#30363d] rounded text-white font-mono text-xs"
                                      />
                                    </div>
                                  </div>
                                  {emptyRunDistanceKm > 0 && (
                                    <div className="text-[10px] font-mono text-indigo-400 flex items-center gap-1.5 bg-indigo-500/10 border border-indigo-500/10 p-2 rounded">
                                      <span>⚡ SYSTEM LOG Calc: Empty Run ({(emptyRunDistanceKm).toLocaleString()} km) will consume approx. <strong>{(emptyRunDistanceKm / 5).toFixed(1)} Liters</strong> of diesel (Average: 5 km per Liter).</span>
                                    </div>
                                  )}
                                </div>

                                <div className="flex justify-end pt-2">
                                  <button 
                                    onClick={() => endTripSubmit(trip.id)}
                                    className="px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-bold rounded-lg cursor-pointer"
                                  >
                                    Finalize Ledger & Calculate Profit
                                  </button>
                                </div>
                              </motion.div>
                            )}
                          </div>

                          {/* Column 2: Step Timeline visualizer */}
                          <div className="lg:col-span-4 shrink-0">
                            <ActiveTripTimeline trip={trip} />
                          </div>

                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Dynamic Financial Overview Panel */}
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-[#161b22] border border-[#30363d] rounded-2xl p-6">
              <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2">
                <Calculator className="w-4.5 h-4.5 text-yellow-400" />
                Realized Profit & Loss (FY)
              </h3>

              {trips.filter(t => t.status === 'completed').length === 0 ? (
                <p className="text-xs text-[#8b949e] italic py-3 text-center">No completed routes generated in current fiscal timeframe.</p>
              ) : (
                <div className="space-y-4">
                  {(() => {
                    const completed = trips.filter(t => t.status === 'completed');
                    const totalRev = completed.reduce((acc, t) => acc + (t.revenue || 0), 0);
                    const totalExp = completed.reduce((acc, t) => {
                      return acc + t.fuelExpense + t.driverCharge + t.tollExpense + t.repairExpense + (t.maintenanceExpense || 0) + t.adblueExpense + t.otherExpense;
                    }, 0);
                    const totalProfit = totalRev - totalExp;

                    return (
                      <div className="space-y-4.5 text-xs text-white">
                        <div className="bg-[#0d1117] p-4.5 rounded-xl border border-[#30363d] text-center space-y-1">
                          <span className="text-[10px] uppercase font-mono text-[#8b949e]">Aggregate Fiscal Profit</span>
                          <div className={`text-3xl font-black ${totalProfit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                            ₹{totalProfit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </div>
                          <span className="text-[10px] text-emerald-400/80 font-mono block">Across {completed.length} completed tankers</span>
                        </div>

                        <div className="space-y-2 font-mono">
                          <div className="flex justify-between items-center text-[#8b949e]">
                            <span>Revenue Generated (Billed Weight)</span>
                            <span className="text-white font-semibold">₹{totalRev.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between items-center text-[#8b949e]">
                            <span>Running Expenses Registered</span>
                            <span className="text-[#ff5a5f] font-semibold">- ₹{totalExp.toLocaleString()}</span>
                          </div>
                          <div className="h-px bg-[#21262d] my-1" />
                          <div className="flex justify-between items-center text-[#8b949e]">
                            <span>Net System Efficiency</span>
                            <span className="text-emerald-400 font-bold">
                              {totalRev > 0 ? ((totalProfit / totalRev) * 100).toFixed(1) : 0}% Margin
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>

            <div className="bg-gradient-to-br from-[#161b22] to-[#0d1117] border border-[#30363d] rounded-2xl p-6 text-xs space-y-3">
              <h4 className="font-bold text-white flex items-center gap-1.5 font-sans">
                <Info className="w-4 h-4 text-blue-400" />
                Special Tanker Expense Rules
              </h4>
              <p className="text-[#8b949e] leading-relaxed">
                Petrochemical logistics mandates that any expense logged when a tanker is idle or not on any running trip will be <strong className="text-white">automatically added to its last completed trip</strong>.
              </p>
              <p className="text-[#8b949e] leading-relaxed">
                This ensures precise maintenance and ad-hoc fuel bookkeeping is attached to relevant fiscal operational headers continuously until a new trip is initiated.
              </p>
            </div>
          </div>

        </div>
      ) : (
        <div className="space-y-6">
          {/* Comprehensive Historical Filter Panel */}
          <div className="bg-[#161b22] border border-[#30363d] rounded-2xl p-6 space-y-5">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-[#21262d] pb-4">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Filter className="w-4 h-4 text-blue-400" />
                  Trips Registry & Logs Filter Dashboard
                </h3>
                <p className="text-xs text-[#8b949e] mt-1">Audit travel sheets, search tanker plates, and evaluate dynamic expenses.</p>
              </div>

              {/* Central Exports Controls */}
              <div className="flex gap-2">
                <button 
                  onClick={exportArchiveToCSV}
                  className="px-3 py-2 bg-[#21262d] hover:bg-[#30363d] border border-[#30363d] text-emerald-400 rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                  title="Export currently filtered list to spreadsheet"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  Export CSV
                </button>
                <button 
                  onClick={exportArchiveToPDF}
                  className="px-3 py-2 bg-[#21262d] hover:bg-[#30363d] border border-[#30363d] text-red-400 rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                  title="Download printable PDF booklet of matching sheets"
                >
                  <Download className="w-3.5 h-3.5" />
                  Export PDF
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs font-mono text-[#8b949e]">
              {/* Type Category */}
              <div className="space-y-1.5 text-left">
                <label className="uppercase text-[9px] tracking-wider block">Timeframe Filter Mode</label>
                <select 
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value as any)}
                  className="w-full px-3 py-2 bg-[#0d1117] border border-[#30363d] rounded text-white"
                >
                  <option value="all">All Time Records</option>
                  <option value="date">Selected Specific Day</option>
                  <option value="month">Selected Month</option>
                  <option value="year">Selected Year</option>
                </select>
              </div>

              {/* Conditional pickers */}
              {filterType === 'date' && (
                <div className="space-y-1.5 text-left animate-pulse">
                  <label className="uppercase text-[9px] tracking-wider block">Pick Specific Day</label>
                  <input 
                    type="date"
                    value={filterExactDate}
                    onChange={(e) => setFilterExactDate(e.target.value)}
                    className="w-full px-3 py-1.5 bg-[#0d1117] border border-[#30363d] rounded text-white"
                  />
                </div>
              )}

              {filterType === 'month' && (
                <div className="space-y-1.5 text-left">
                  <label className="uppercase text-[9px] tracking-wider block">Select Month</label>
                  <select 
                    value={filterMonth}
                    onChange={(e) => setFilterMonth(parseInt(e.target.value) || 1)}
                    className="w-full px-3 py-2 bg-[#0d1117] border border-[#30363d] rounded text-white"
                  >
                    {['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].map((mName, mIdx) => (
                      <option key={mIdx} value={mIdx + 1}>{mName}</option>
                    ))}
                  </select>
                </div>
              )}

              {(filterType === 'month' || filterType === 'year') && (
                <div className="space-y-1.5 text-left">
                  <label className="uppercase text-[9px] tracking-wider block">Select Year</label>
                  <select 
                    value={filterYear}
                    onChange={(e) => setFilterYear(parseInt(e.target.value) || 2026)}
                    className="w-full px-3 py-2 bg-[#0d1117] border border-[#30363d] rounded text-white"
                  >
                    <option value={2024}>FY 2024</option>
                    <option value={2025}>FY 2025</option>
                    <option value={2026}>FY 2026</option>
                    <option value={2027}>FY 2027</option>
                  </select>
                </div>
              )}

              <div className="space-y-1.5 text-left">
                <label className="uppercase text-[9px] tracking-wider block">Route Status Flag</label>
                <select 
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value as any)}
                  className="w-full px-3 py-2 bg-[#0d1117] border border-[#30363d] rounded text-white font-bold"
                >
                  <option value="all">All Statuses</option>
                  <option value="running">Running Only</option>
                  <option value="completed">Completed Only</option>
                </select>
              </div>

              {/* Driver filter */}
              <div className="space-y-1.5 text-left">
                <label className="uppercase text-[9px] tracking-wider block">Driver Wise Filter</label>
                <select 
                  value={filterDriverId}
                  onChange={(e) => setFilterDriverId(e.target.value)}
                  className="w-full px-3 py-2 bg-[#0d1117] border border-[#30363d] rounded text-white font-bold"
                >
                  <option value="all">All Active Drivers</option>
                  {drivers.map(drv => (
                    <option key={drv.id} value={drv.id}>{drv.name}</option>
                  ))}
                </select>
              </div>

              {/* Billed To filter */}
              <div className="space-y-1.5 text-left">
                <label className="uppercase text-[9px] tracking-wider block">Billed To Party</label>
                <select 
                  value={filterBilledTo}
                  onChange={(e) => setFilterBilledTo(e.target.value)}
                  className="w-full px-3 py-2 bg-[#0d1117] border border-[#30363d] rounded text-white w-full max-w-[170px] truncate"
                >
                  <option value="all">All Billed Parties</option>
                  {Array.from(new Set(lrs.map(l => l.consignerName).filter(Boolean))).map((party, idx) => (
                    <option key={idx} value={party}>{party}</option>
                  ))}
                </select>
              </div>

              {/* Shortage Toggle */}
              <div className="space-y-1.5 text-left flex flex-col justify-center">
                <label className="flex items-center gap-1.5 cursor-pointer text-white mt-4 select-none">
                  <input 
                    type="checkbox"
                    checked={filterShortageOnly}
                    onChange={(e) => setFilterShortageOnly(e.target.checked)}
                    className="w-4 h-4 rounded bg-[#0d1117] border-[#30363d] accent-orange-500"
                  />
                  <span className="uppercase text-[9px] font-bold text-orange-400">Shortage Deficits Only</span>
                </label>
              </div>

              <div className="space-y-1.5 text-left sm:col-span-2 md:col-span-1">
                <label className="uppercase text-[9px] tracking-wider block">Keyword Lookup Search</label>
                <div className="relative">
                  <input 
                    type="text"
                    placeholder="Search Plate, Driver, L.R, Source..."
                    value={filterSearch}
                    onChange={(e) => setFilterSearch(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 bg-[#0d1117] border border-[#30363d] rounded text-white font-sans text-xs focus:ring-0 focus:border-blue-500"
                  />
                  <Search className="w-3.5 h-3.5 text-[#8b949e] absolute left-2.5 top-2.5" />
                </div>
              </div>
            </div>
          </div>

          {/* Quick Filter Summaries */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs font-mono text-white">
            <div className="p-4 bg-[#161b22] border border-[#30363d] rounded-2xl">
              <span className="text-[#8b949e] text-[10px] block uppercase">Filtered Trips Matches</span>
              <strong className="text-xl text-blue-400 block mt-1">{archiveStats.matchesCount} Sheets</strong>
            </div>
            <div className="p-4 bg-[#161b22] border border-[#30363d] rounded-2xl">
              <span className="text-[#8b949e] text-[10px] block uppercase">Aggregate Book Revenue</span>
              <strong className="text-xl text-white block mt-1">₹{archiveStats.totalRevenue.toLocaleString()}</strong>
            </div>
            <div className="p-4 bg-[#161b22] border border-[#30363d] rounded-2xl">
              <span className="text-[#8b949e] text-[10px] block uppercase">Dynamic Operating Expenses</span>
              <strong className="text-xl text-[#ff5a5f] block mt-1">- ₹{archiveStats.totalExpenses.toLocaleString()}</strong>
            </div>
            <div className={`p-4 bg-[#1e291b] border border-[#2b4c1e]/40 rounded-2xl`}>
              <span className="text-emerald-400 text-[10px] block font-extrabold uppercase">Calculated net margins</span>
              <strong className="text-xl text-emerald-400 block mt-1">₹{archiveStats.totalProfit.toLocaleString()}</strong>
            </div>
          </div>

          {/* Table list of Trips */}
          <motion.div layout className="space-y-4">
            {archiveTrips.length === 0 ? (
              <div className="text-center py-16 bg-[#161b22] border border-[#30363d] rounded-2xl text-[#8b949e]">
                <Info className="w-12 h-12 mx-auto mb-3 text-[#ff5a5f]/40" />
                <h4 className="text-white text-sm font-bold">No trips match current filtering parameters</h4>
                <p className="text-xs mt-1">Refine your date, status, or textual search terms above to inspect other logs.</p>
              </div>
            ) : (
              archiveTrips.map((trip) => {
                const totalCost = trip.fuelExpense + trip.driverCharge + trip.tollExpense + trip.repairExpense + (trip.maintenanceExpense || 0) + trip.adblueExpense + trip.otherExpense;
                const isExpanded = expandedTripId === trip.id;
                // Capture granular transactions mapped to this trip
                const tripLedgers = (expenses || []).filter(e => e.tripId === trip.id);
                const associatedLr = lrs.find(l => l.lrNo === trip.lrNo);
                const consignerName = associatedLr?.consignerName || "Industrial Chemie Consigner (Self-Load)";

                // Fuel estimation alert checks
                const litersAddedValue = trip.fuelExpense / 95;
                const fuelLimitHit = litersAddedValue >= trip.expectedFuelLiters;
                const completedExtraFuel = trip.status === 'completed' && litersAddedValue > trip.expectedFuelLiters;
                const extraLiters = litersAddedValue - trip.expectedFuelLiters;

                return (
                  <motion.div 
                    layout 
                    key={trip.id} 
                    className="bg-[#161b22] border border-[#30363d] rounded-2xl overflow-hidden transition-all duration-200"
                    transition={{ duration: 0.3, ease: "easeInOut" }}
                  >
                    {/* Clickable Header Row */}
                    <div 
                      onClick={() => setExpandedTripId(isExpanded ? null : trip.id)}
                      className="p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 cursor-pointer hover:bg-[#1c212b]/40 select-none"
                    >
                      <div className="space-y-2 text-left">
                        {/* Enlarged trip date shown directly in front of Party Name (Billed to) */}
                        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
                          <div className="text-base font-black text-emerald-300 bg-slate-800/80 border border-slate-700/60 px-3.5 py-1.5 rounded-xl shadow-inner font-mono inline-flex items-center gap-1.5 shrink-0">
                            <Calendar className="w-4.5 h-4.5 text-emerald-400" />
                            {trip.startDate}
                          </div>
                          <div className="text-sm font-extrabold text-amber-400 uppercase tracking-wide flex flex-wrap items-center gap-1.5">
                            <span className="text-gray-400 font-mono text-xs">BILLED TO:</span>
                            <strong className="text-orange-400 text-lg underline decoration-orange-500/30 whitespace-nowrap">{consignerName}</strong>
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 pt-0.5">
                          <span className="text-xs text-[#8b949e] font-mono">ID: {trip.id}</span>
                          <span className={`px-2 py-0.5 text-[9px] rounded-full font-bold font-mono uppercase ${
                            trip.status === 'completed' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-blue-500/10 text-blue-400 border border-blue-500/20 animate-pulse'
                          }`}>
                            {trip.status}
                          </span>
                          <span className="text-xs text-yellow-500 font-mono font-bold">LR: {trip.lrNo}</span>
                          {associatedLr?.consigneeName && (
                            <span className="text-[10px] text-[#8b949e] font-mono">➔ Deliver: <strong className="text-white">{associatedLr.consigneeName}</strong></span>
                          )}
                        </div>
                        <h4 className="text-sm font-black text-white font-sans flex items-center gap-1.5 pt-0.5">
                          <Truck className="w-4 h-4 text-emerald-500" />
                          {trip.tankerNumber} | <User className="w-3.5 h-3.5 text-[#8b949e]" /> {trip.driverName}
                        </h4>
                        <div className="text-xs text-[#8b949e] font-mono">
                          📍 {trip.placeFrom} ➔ {trip.placeTo} ({trip.loadingWeight} {trip.qtyUnit})
                        </div>

                        {/* Diesel limit notification indicators */}
                        {trip.status === 'running' && fuelLimitHit && (
                          <div className="mt-2 inline-flex items-center gap-1.5 bg-orange-500/10 text-orange-400 border border-orange-500/30 px-2 py-1 rounded text-[9px] font-mono font-bold animate-[pulse_2s_infinite]">
                            <span className="w-1.5 h-1.5 rounded-full bg-orange-500" />
                            📢 Expected Fuel Limit Exceeded ({litersAddedValue.toFixed(0)}L added / {trip.expectedFuelLiters}L est.)
                          </div>
                        )}
                        {trip.status === 'completed' && extraLiters > 0 && (
                          <div className="mt-2 inline-flex items-center gap-1.5 bg-red-500/10 text-red-400 border border-red-500/30 px-2 py-1 rounded text-[9.5px] font-mono font-bold">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                            ⚠️ Unload excess: {extraLiters.toFixed(1)}L extra diesel used (₹{Math.round(extraLiters * 95)} extra cost)
                          </div>
                        )}
                      </div>

                      {/* Compact horizontal SVG geographic path sensor */}
                      <CompactTripPathVisualizer 
                        from={trip.placeFrom} 
                        to={trip.placeTo} 
                        isRunning={trip.status === 'running'} 
                      />

                      {/* Brief financial totals preview */}
                      <div className="flex flex-col md:items-end text-left md:text-right font-mono gap-1 shrink-0">
                        <div className="text-xs text-white">
                          Gross Revenue: <strong className="text-white">₹{trip.revenue ? trip.revenue.toLocaleString() : 'N/A'}</strong>
                        </div>
                        <div className="text-[11px] text-[#8b949e]">
                          Operational Cost: <strong className="text-[#ff5a5f]">₹{totalCost.toLocaleString()}</strong>
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-[10px] text-[#8b949e]">Profit:</span>
                          <span className={`text-xs font-bold ${trip.profit && trip.profit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                            ₹{trip.profit ? trip.profit.toLocaleString() : 'N/A'}
                          </span>
                          {isExpanded ? <ChevronUp className="w-4 h-4 text-amber-500 ml-1" /> : <ChevronDown className="w-4 h-4 text-[#8b949e] ml-1" />}
                        </div>
                      </div>
                    </div>

                    {/* Detailed Collapsible Dynamic Expense Logs block with CSS Grid split */}
                    <AnimatePresence initial={false}>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.3, ease: "easeInOut" }}
                          className="overflow-hidden bg-[#0f131a] border-t border-[#30363d]"
                        >
                          <motion.div
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            exit={{ y: 20, opacity: 0 }}
                            transition={{ delay: 0.05, duration: 0.25 }}
                            className="p-5 space-y-5 text-left"
                          >
                            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                              
                              {/* Left logistics list column */}
                              <div className="lg:col-span-8 space-y-5">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[#21262d] pb-2 gap-2 text-xs font-mono">
                                  <div className="flex items-center gap-2">
                                    <span className="font-bold text-amber-400 uppercase tracking-wider">
                                      📋 Historical Route Expense Ledger Sheet
                                    </span>
                                    {onDeleteTrip && (
                                      <button
                                        onClick={() => onDeleteTrip(trip.id)}
                                        className="px-2 py-0.5 bg-rose-500/15 border border-rose-500/30 hover:bg-rose-500 hover:text-white text-rose-400 text-[10px] rounded transition-all cursor-pointer font-bold uppercase transition"
                                        title="Send this completed trip record to system trash"
                                      >
                                        [ Trash Record ]
                                      </button>
                                    )}
                                  </div>
                                  <span className="text-[#8b949e]">
                                    Dispatched Date: <strong className="text-white bg-[#21262d] px-1.5 py-0.5 rounded text-[10px]">{trip.startDate}</strong>
                                    {trip.endDate && <> | Finalized: <strong className="text-white bg-[#21262d] px-1.5 py-0.5 rounded text-[10px]">{trip.endDate}</strong></>}
                                  </span>
                                </div>

                                {/* Billing and Consignment details panel - explicitly show both consignor and consignee */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-[#080a0f] border border-orange-500/25 rounded-xl p-3.5 text-xs font-mono">
                                  <div className="space-y-0.5">
                                    <span className="text-gray-500 block text-[9px] uppercase">🏢 Consignor (Billed to)</span>
                                    <strong className="text-orange-400 text-xs font-bold block">{consignerName}</strong>
                                  </div>
                                  <div className="space-y-0.5">
                                    <span className="text-gray-500 block text-[9px] uppercase">📦 Consignee (Deliver to)</span>
                                    <strong className="text-emerald-400 text-xs font-bold block">{associatedLr?.consigneeName || "N/A"}</strong>
                                  </div>
                                </div>

                                {/* NATIVE SYSTEM DIRECTORY SPECIFICATION TABLE DISPLAY */}
                                <div className="border border-[#30363d] rounded-xl overflow-hidden bg-[#0a0d13] space-y-2 p-4">
                                  <div className="text-xs font-mono font-bold text-sky-400 uppercase tracking-widest flex items-center gap-1.5">
                                    <FileText className="w-4 h-4 text-sky-400" />
                                    Active System Directory Row Record Format
                                  </div>
                                  <div className="overflow-x-auto">
                                    <table className="w-full text-left text-[10px] border-collapse font-mono whitespace-nowrap">
                                      <thead>
                                        <tr className="bg-[#161b22] text-[#8b949e] border-b border-[#30363d] uppercase text-[8.5px]">
                                          <th className="p-2 border-r border-[#30363d]">L.R No.</th>
                                          <th className="p-2 border-r border-[#30363d]">Voucher No.</th>
                                          <th className="p-2 border-r border-[#30363d]">Party Name</th>
                                          <th className="p-2 border-r border-[#30363d]">From</th>
                                          <th className="p-2 border-r border-[#30363d]">To</th>
                                          <th className="p-2 border-r border-[#30363d]">Product</th>
                                          <th className="p-2 border-r border-[#30363d]">Loaded Weight</th>
                                          <th className="p-2 border-r border-[#30363d]">Unloaded Weight</th>
                                          <th className="p-2 border-r border-[#30363d]">Shortage (Deficit)</th>
                                          <th className="p-2 border-r border-[#30363d]">Qty Unit</th>
                                          <th className="p-2 border-r border-[#30363d]">Rate</th>
                                          <th className="p-2 border-r border-[#30363d]">Total Freight</th>
                                          <th className="p-2 border-r border-[#30363d]">Tanker No.</th>
                                          <th className="p-2 border-r border-[#30363d]">Transport</th>
                                          <th className="p-2 border-r border-[#30363d]">Diesel</th>
                                          <th className="p-2 border-r border-[#30363d]">Driver</th>
                                          <th className="p-2 border-r border-[#30363d]">Toll</th>
                                          <th className="p-2 border-r border-[#30363d]">Repairs</th>
                                          <th className="p-2 border-r border-[#30363d]">Maint</th>
                                          <th className="p-2 border-r border-[#30363d]">AdBlue</th>
                                          <th className="p-2 border-r border-[#30363d]">Other</th>
                                          <th className="p-2 border-r border-[#30363d]">Profit</th>
                                          <th className="p-2 border-r border-[#30363d]">Billed Status</th>
                                          <th className="p-2">Bill Ref No.</th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-[#21262d] text-white">
                                        <tr className="bg-[#1c2128]/50">
                                          <td className="p-2 border-r border-[#30363d] font-bold text-yellow-500">{trip.lrNo}</td>
                                          <td className="p-2 border-r border-[#30363d] text-blue-400">{trip.id}</td>
                                          <td className="p-2 border-r border-[#30363d] text-orange-400 font-semibold">{associatedLr?.consignerName || "Industrial Chemie (Self)"}</td>
                                          <td className="p-2 border-r border-[#30363d]">{trip.placeFrom}</td>
                                          <td className="p-2 border-r border-[#30363d]">{trip.placeTo}</td>
                                          <td className="p-2 border-r border-[#30363d] text-emerald-400">{associatedLr?.product || "Chemical Compounds"}</td>
                                          <td className="p-2 border-r border-[#30363d] font-bold text-sky-400">{trip.loadingWeight}</td>
                                          <td className="p-2 border-r border-[#30363d] font-bold text-teal-400">
                                            {trip.status === 'completed' ? (trip.unloadingWeight ?? trip.loadingWeight) : 'In-Transit'}
                                          </td>
                                          <td className="p-2 border-r border-[#30363d] font-bold text-[#ff723b]">
                                            {trip.status === 'completed' && trip.unloadingWeight !== undefined && (trip.loadingWeight - trip.unloadingWeight) > 0 
                                              ? `${(trip.loadingWeight - trip.unloadingWeight).toFixed(3)} ${trip.qtyUnit}` 
                                              : '0.000 (No Deficit)'}
                                          </td>
                                          <td className="p-2 border-r border-[#30363d] text-gray-400">{trip.qtyUnit}</td>
                                          <td className="p-2 border-r border-[#30363d]">Rs. {associatedLr?.freightRate || trip.freightRateAtEnd || 0}</td>
                                          <td className="p-2 border-r border-[#30363d] text-emerald-400 font-bold">Rs. {trip.revenue || (trip.loadingWeight * (associatedLr?.freightRate || 0))}</td>
                                          <td className="p-2 border-r border-[#30363d] text-red-400 uppercase font-semibold">{trip.tankerNumber}</td>
                                          <td className="p-2 border-r border-[#30363d] text-gray-300">Baroda Road Carriers</td>
                                          <td className="p-2 border-r border-[#30363d] text-[#ff8f93]">Rs. {trip.fuelExpense}</td>
                                          <td className="p-2 border-r border-[#30363d] text-[#ff8f93]">Rs. {trip.driverCharge}</td>
                                          <td className="p-2 border-r border-[#30363d] text-[#ff8f93]">Rs. {trip.tollExpense}</td>
                                          <td className="p-2 border-r border-[#30363d] text-[#ff8f93]">Rs. {trip.repairExpense}</td>
                                          <td className="p-2 border-r border-[#30363d] text-[#ff8f93]">Rs. {trip.maintenanceExpense || 0}</td>
                                          <td className="p-2 border-r border-[#30363d] text-[#ff8f93]">Rs. {trip.adblueExpense}</td>
                                          <td className="p-2 border-r border-[#30363d] text-[#ff8f93]">Rs. {trip.otherExpense}</td>
                                          <td className={`p-2 border-r border-[#30363d] font-bold ${trip.profit && trip.profit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                            Rs. {trip.profit || ((trip.loadingWeight * (associatedLr?.freightRate || 0)) - totalCost)}
                                          </td>
                                          <td className="p-2 border-r border-[#30363d]">
                                            <span className={`px-1.5 py-0.5 rounded text-[8.5px] font-bold ${trip.status === 'completed' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'}`}>
                                              {trip.status === 'completed' ? 'BILLED' : 'DRAFT/UNBILLED'}
                                            </span>
                                          </td>
                                          <td className="p-2 font-semibold">
                                            {trip.status === 'completed' ? `INV-${trip.id.replace('TRP-', '')}` : 'N/A'}
                                          </td>
                                        </tr>
                                      </tbody>
                                    </table>
                                  </div>
                                </div>

                                {/* Aggregated categories row */}
                                <div className="space-y-2">
                                  <span className="text-[10px] font-mono text-[#8b949e] block uppercase tracking-wide">Financial categories summaries:</span>
                                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-7 gap-3 text-center text-xs font-mono">
                                    <div className="p-3 bg-[#161b22] border border-[#21262d] rounded-xl">
                                      <span className="text-[#8b949e] text-[9.5px] uppercase block">⛽ Diesel Bills</span>
                                      <strong className="text-white text-xs block mt-1">₹{trip.fuelExpense}</strong>
                                    </div>
                                    <div className="p-3 bg-[#161b22] border border-[#21262d] rounded-xl">
                                      <span className="text-[#8b949e] text-[9.5px] uppercase block">👤 Driver Pay</span>
                                      <strong className="text-white text-xs block mt-1">₹{trip.driverCharge}</strong>
                                    </div>
                                    <div className="p-3 bg-[#161b22] border border-[#21262d] rounded-xl">
                                      <span className="text-[#8b949e] text-[9.5px] uppercase block">🎫 Toll Taxes</span>
                                      <strong className="text-white text-xs block mt-1">₹{trip.tollExpense}</strong>
                                    </div>
                                    <div className="p-3 bg-[#161b22] border border-[#21262d] rounded-xl">
                                      <span className="text-[#8b949e] text-[9.5px] uppercase block">🔧 workshop spares</span>
                                      <strong className="text-white text-xs block mt-1">₹{trip.repairExpense}</strong>
                                    </div>
                                    <div className="p-3 bg-[#161b22] border border-[#21262d] rounded-xl">
                                      <span className="text-[#8b949e] text-[9.5px] uppercase block">🛠 Maintenance</span>
                                      <strong className="text-white text-xs block mt-1">₹{trip.maintenanceExpense || 0}</strong>
                                    </div>
                                    <div className="p-3 bg-[#161b22] border border-[#21262d] rounded-xl">
                                      <span className="text-[#8b949e] text-[9.5px] uppercase block">🧪 AdBlue Fluid</span>
                                      <strong className="text-white text-xs block mt-1">₹{trip.adblueExpense}</strong>
                                      <span className="font-mono text-[9px] text-[#ff8f93] block mt-0.5">{trip.adblueAddedLiters || 0}L Added</span>
                                    </div>
                                    <div className="p-3 bg-[#161b22] border border-[#21262d] rounded-xl">
                                      <span className="text-[#8b949e] text-[9.5px] uppercase block">💥 Miscellaneous</span>
                                      <strong className="text-white text-xs block mt-1">₹{trip.otherExpense}</strong>
                                    </div>
                                  </div>
                                </div>

                                {/* Narrative logs "What expense is for what" */}
                                <div className="space-y-2">
                                  <span className="text-[10px] font-mono text-[#8b949e] uppercase block tracking-wider font-bold">
                                    Granular Transaction Book Log Statements ({tripLedgers.length})
                                  </span>

                                  {tripLedgers.length === 0 ? (
                                    <p className="text-xs text-[#8b949e] italic py-3 bg-[#161b22] px-4 rounded-xl border border-[#21262d]">
                                      No dynamic transaction units logged in central base. Showing categoric values only.
                                    </p>
                                  ) : (
                                    <div className="border border-[#21262d] rounded-xl overflow-hidden bg-[#0d1117] overflow-x-auto">
                                      <table className="w-full text-left text-xs border-collapse font-mono">
                                        <thead>
                                          <tr className="bg-[#161b22] text-[#8b949e] uppercase text-[9.5px] border-b border-[#21262d]">
                                            <th className="p-2.5">Date</th>
                                            <th className="p-2.5">Type</th>
                                            <th className="p-2.5">Transaction Detail Description ("For What")</th>
                                            <th className="p-2.5">Dealer Vendor / Place</th>
                                            <th className="p-2.5">Voucher Reference</th>
                                            <th className="p-2.5 text-right">Debit Charge</th>
                                          </tr>
                                        </thead>
                                        <tbody className="divide-y divide-[#21262d] text-[#c9d1d9] text-[11px] whitespace-nowrap">
                                          {tripLedgers.map((exp, idx) => (
                                            <tr key={exp.id || idx} className="hover:bg-[#161b22]/40">
                                              <td className="p-2.5">{exp.date}</td>
                                              <td className="p-2.5">
                                                <span className="px-1.5 py-0.5 rounded text-[9.5px] bg-[#21262d] text-amber-400 font-bold uppercase">
                                                  {exp.category}
                                                </span>
                                              </td>
                                              <td className="p-2.5 truncate max-w-[220px]" title={exp.detail}>
                                                {exp.detail}
                                              </td>
                                              <td className="p-2.5 truncate max-w-[150px]" title={`${exp.vendorName || ''} at ${exp.place || ''}`}>
                                                {exp.vendorName ? `${exp.vendorName} (${exp.place || 'Ranoli'})` : (exp.place || 'Field-logged')}
                                              </td>
                                              <td className="p-2.5 text-[10px]">
                                                {exp.billNo ? `#${exp.billNo}` : 'System Cash Voucher'}
                                                <span className="text-[8px] bg-sky-950 text-sky-400 px-1 py-0.5 rounded uppercase font-bold ml-1.5">Debited</span>
                                              </td>
                                              <td className="p-2.5 text-right font-bold text-white">₹{exp.amount}</td>
                                            </tr>
                                          ))}
                                        </tbody>
                                      </table>
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* Right: GPS tracking map */}
                              <div className="lg:col-span-4">
                                <GeographicRouteMap trip={trip} associatedLr={associatedLr} />
                              </div>

                            </div>
                          </motion.div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Consistent Directory Summary & Quick Corner Actions Bar */}
                    <div className="bg-[#12161f] border-t border-[#30363d]/60 px-5 py-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 font-mono text-xs text-[#8b949e]">
                      {/* Left: Quick key Directory data highlights in sequence requested */}
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[10px] text-gray-400">
                        <div>L.R No: <strong className="text-yellow-500 font-bold">{trip.lrNo}</strong></div>
                        <div className="text-gray-500">•</div>
                        <div>Voucher: <strong className="text-blue-400">{trip.id}</strong></div>
                        <div className="text-gray-500">•</div>
                        <div>Party (Billed to): <strong className="text-orange-400 font-semibold">{associatedLr?.consignerName || "Industrial Chemie (Self)"}</strong></div>
                        <div className="text-gray-500">•</div>
                        <div>From/To: <strong className="text-white">{trip.placeFrom} ➔ {trip.placeTo}</strong></div>
                        <div className="text-gray-500">•</div>
                        <div>Product: <strong className="text-emerald-400">{associatedLr?.product || "Chemical Compounds"}</strong></div>
                        <div className="text-gray-500">•</div>
                        <div>Qty: <strong className="text-white">{trip.loadingWeight} {trip.qtyUnit}</strong></div>
                        <div className="text-gray-500">•</div>
                        <div>Freight (Total): <strong className="text-emerald-400">₹{(trip.revenue || (trip.loadingWeight * (associatedLr?.freightRate || 0))).toLocaleString()}</strong></div>
                        <div className="text-gray-500">•</div>
                        <div>Tanker: <strong className="text-amber-500">{trip.tankerNumber}</strong></div>
                        <div className="text-gray-500">•</div>
                        <div>Profit: <span className={`font-bold ${trip.profit && trip.profit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>₹{(trip.profit || ((trip.loadingWeight * (associatedLr?.freightRate || 0)) - totalCost)).toLocaleString()}</span></div>
                        <div className="text-gray-500">•</div>
                        <div>Status: <span className="text-sky-400 font-bold">{trip.status === 'completed' ? 'BILLED' : 'DRAFT/UNBILLED'}</span></div>
                      </div>

                      {/* Right: Bottom Corner Action Shortcuts */}
                      <div className="flex items-center gap-2 self-stretch sm:self-auto justify-end shrink-0">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedEditTrip(trip);
                          }}
                          className="px-3 py-1.5 bg-[#21262d] hover:bg-[#30363d] border border-blue-500/20 text-blue-400 hover:text-blue-300 rounded-lg text-[10px] font-bold inline-flex items-center gap-1.5 cursor-pointer font-sans transition-all"
                          title="Edit operational route coordinates and logged parameters"
                        >
                          <Edit className="w-3.5 h-3.5" />
                          Edit Trip
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handlePrintPreview(trip);
                          }}
                          className="px-3 py-1.5 bg-[#21262d] hover:bg-[#30363d] border border-[#30363d] text-amber-500 hover:text-amber-400 rounded-lg text-[10px] font-bold inline-flex items-center gap-1.5 cursor-pointer font-sans transition-all"
                          title="Generate and print physical Tally format chemical transport invoice"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          Print Invoice
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedSpecsTrip(trip);
                          }}
                          className="px-3 py-1.5 bg-[#21262d] hover:bg-[#30363d] border border-[#30363d] text-sky-400 hover:text-sky-300 rounded-lg text-[10px] font-bold inline-flex items-center gap-1.5 cursor-pointer font-sans transition-all"
                          title="Show direct detailed tabular directory specification breakdown"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          Specs Sheet
                        </button>
                      </div>
                    </div>

                  </motion.div>
                );
              })
            )}
          </motion.div>
        </div>
      )}

      {/* Start Trip Modal Drawer */}
      {showStartModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-full max-w-5xl bg-[#171312] border border-[#2e2321] rounded-[32px] shadow-[0_24px_64px_rgba(0,0,0,0.9)] p-6 max-h-[92vh] overflow-y-auto"
          >
            <div className="flex justify-between items-center pb-4 border-b border-[#2e2321] mb-5">
              <div>
                <h3 className="text-lg font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#ff5a1f] animate-ping" />
                  Dispatch Petro-Chemical Tanker
                </h3>
                <p className="text-xs text-[#b8a49c] mt-0.5 font-mono uppercase tracking-widest">ESTIMATE CONSUMPTION & DISPATCH ACTIVE TARIFF</p>
              </div>
              <button 
                onClick={() => setShowStartModal(false)} 
                className="text-gray-400 hover:text-white p-2 hover:bg-white/[0.04] border border-transparent hover:border-white/[0.06] rounded-xl cursor-pointer transition-all"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Split layout wrapper */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              {/* Left Column: Form starts here */}
              <div className="lg:col-span-7">
                
                {/* Tabs Selector for L.R Source */}
                <div className="flex bg-[#120e0d] p-1 rounded-2xl border border-[#2e2321] mb-4 text-xs font-mono">
                  <button
                    type="button"
                    className={`flex-1 py-2.5 rounded-xl text-center cursor-pointer transition-all ${
                      startLrMode === 'create' 
                        ? 'bg-gradient-to-r from-[#ff7c4f] to-[#ff5314] text-white shadow font-bold' 
                        : 'text-[#b8a49c] hover:text-white'
                    }`}
                    onClick={() => setStartLrMode('create')}
                  >
                    📝 Compose New L.R. & Start
                  </button>
                  <button
                    type="button"
                    className={`flex-1 py-2.5 rounded-xl text-center cursor-pointer transition-all ${
                      startLrMode === 'existing' 
                        ? 'bg-gradient-to-r from-[#ff7c4f] to-[#ff5314] text-white shadow font-bold' 
                        : 'text-[#b8a49c] hover:text-white'
                    }`}
                    onClick={() => setStartLrMode('existing')}
                  >
                    🗄️ Use Saved Pending L.R.
                  </button>
                </div>

                <form onSubmit={startTripHandler} className="space-y-4">
              
              {/* Dynamic L.R Selector / Composer Subform */}
              {startLrMode === 'create' ? (
                <div className="space-y-4 border border-[#30363d] bg-[#0d1117] p-4 rounded-xl">
                  <div className="flex justify-between items-center border-b border-[#21262d] pb-2">
                    <span className="block text-xs font-mono text-[#ff7b7f] uppercase tracking-wider font-bold">
                      New Lorry Receipt (L.R.) Parameters
                    </span>
                    <button 
                      type="button"
                      onClick={() => {
                        // Prefill helper for instant testing
                        setNewLrNo(`LR-BRC-${Math.floor(100000 + Math.random() * 900000)}`);
                        setNewConsignerName("IOCL KOYALI REFINERY, VADODARA");
                        setNewConsigneeName("RELIANCE CHEMICAL DEPOT, HAZIRA");
                        setNewProduct("BENZENE SOLVENT FLUID");
                        setNewLrQty(24.5);
                        setNewLrQtyUnit("MT");
                        setNewPlaceFrom("RANOLI, VADODARA");
                        setNewPlaceTo("HAZIRA, SURAT");
                        setNewFreightRate(1850);
                      }}
                      className="text-[10px] bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 font-mono px-2 py-1 rounded"
                    >
                      ⚡ Prefill IOCL-Reliance Standard Load
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-white">
                    <div>
                      <label className="block text-[#8b949e] font-mono text-[10px] uppercase mb-1 text-left">L.R. Number (Empty for Auto)</label>
                      <input 
                        type="text" 
                        placeholder="e.g. LR-BRC-2026105"
                        className="w-full px-3 py-2 bg-[#161b22] border border-[#30363d] rounded text-white font-mono"
                        value={newLrNo}
                        onChange={(e) => setNewLrNo(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="block text-[#8b949e] font-mono text-[10px] uppercase mb-1 text-left">Assign Empty Tanker *</label>
                      <select 
                        required={startLrMode === 'create'}
                        className="w-full px-3 py-2 bg-[#161b22] border border-[#30363d] rounded text-white"
                        value={selectedLrTankerId}
                        onChange={(e) => setSelectedLrTankerId(e.target.value)}
                      >
                        <option value="">-- Choose Tanker --</option>
                        {idleTankers.map(t => (
                          <option key={t.id} value={t.id}>
                            {t.tankerNumber} (Idle)
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-white">
                    <div>
                      <label className="block text-[#8b949e] font-mono text-[10px] uppercase mb-1 text-left">Consignor Name & Address *</label>
                      <input 
                        type="text" 
                        required={startLrMode === 'create'}
                        placeholder="e.g. IOCL Koyali, Ranoli"
                        className="w-full px-3 py-2 bg-[#161b22] border border-[#30363d] rounded text-white"
                        value={newConsignerName}
                        onChange={(e) => setNewConsignerName(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="block text-[#8b949e] font-mono text-[10px] uppercase mb-1 text-left">Consignee Name & Address *</label>
                      <input 
                        type="text" 
                        required={startLrMode === 'create'}
                        placeholder="e.g. Reliance Depot, Surat"
                        className="w-full px-3 py-2 bg-[#161b22] border border-[#30363d] rounded text-white"
                        value={newConsigneeName}
                        onChange={(e) => setNewConsigneeName(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-white">
                    <div>
                      <label className="block text-[#8b949e] font-mono text-[10px] uppercase mb-1 text-left">Place of Loading (Origin) *</label>
                      <input 
                        type="text" 
                        required={startLrMode === 'create'}
                        placeholder="e.g. Ranoli, Vadodara"
                        className="w-full px-3 py-2 bg-[#161b22] border border-[#30363d] rounded text-white"
                        value={newPlaceFrom}
                        onChange={(e) => setNewPlaceFrom(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="block text-[#8b949e] font-mono text-[10px] uppercase mb-1 text-left">Place of Unloading (Destination) *</label>
                      <input 
                        type="text" 
                        required={startLrMode === 'create'}
                        placeholder="e.g. Surat, Gujarat"
                        className="w-full px-3 py-2 bg-[#161b22] border border-[#30363d] rounded text-white"
                        value={newPlaceTo}
                        onChange={(e) => setNewPlaceTo(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-white">
                    <div>
                      <label className="block text-[#8b949e] font-mono text-[10px] uppercase mb-1 text-left">Product *</label>
                      <input 
                        type="text" 
                        required={startLrMode === 'create'}
                        placeholder="e.g. Benzene Solvent"
                        className="w-full px-3 py-2 bg-[#161b22] border border-[#30363d] rounded text-white"
                        value={newProduct}
                        onChange={(e) => setNewProduct(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="block text-[#8b949e] font-mono text-[10px] uppercase mb-1 text-left">Load Weight *</label>
                      <input 
                        type="number" 
                        step="any"
                        required={startLrMode === 'create'}
                        placeholder="e.g. 24.5"
                        className="w-full px-3 py-2 bg-[#161b22] border border-[#30363d] rounded text-white font-mono"
                        value={newLrQty || ''}
                        onChange={(e) => setNewLrQty(parseFloat(e.target.value) || 0)}
                      />
                    </div>
                    <div>
                      <label className="block text-[#8b949e] font-mono text-[10px] uppercase mb-1 text-left">Weight Unit *</label>
                      <select 
                        className="w-full px-3 py-2 bg-[#161b22] border border-[#30363d] rounded text-white"
                        value={newLrQtyUnit}
                        onChange={(e) => setNewLrQtyUnit(e.target.value as 'KL' | 'MT')}
                      >
                        <option value="MT">MT (Tons)</option>
                        <option value="KL">KL (Kiloliters)</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-white">
                    <div>
                      <label className="block text-[#8b949e] font-mono text-[10px] uppercase mb-1 text-left">Freight Base Rate (₹) *</label>
                      <input 
                        type="number" 
                        step="any"
                        required={startLrMode === 'create'}
                        placeholder="e.g. 1850"
                        className="w-full px-3 py-2 bg-[#161b22] border border-[#30363d] rounded text-white font-mono"
                        value={newFreightRate || ''}
                        onChange={(e) => setNewFreightRate(parseFloat(e.target.value) || 0)}
                      />
                    </div>
                    <div className="flex flex-col justify-end">
                      <div className="p-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-mono font-bold rounded text-center">
                        Total Freight: ₹{(newLrQty * newFreightRate).toLocaleString()}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4 border border-[#30363d] bg-[#0d1117] p-4 rounded-xl">
                  <span className="block text-xs font-mono text-cyan-400 uppercase tracking-wider border-b border-[#21262d] pb-2 font-bold">
                    Select Pre-Saved L.R. Track
                  </span>

                  <div className="text-xs text-white">
                    <label className="block text-xs font-mono text-[#8b949e] uppercase mb-1.5 text-left">Select Lorry Receipt *</label>
                    <select 
                      required={startLrMode === 'existing'}
                      value={selectedLrId}
                      onChange={(e) => setSelectedLrId(e.target.value)}
                      className="w-full px-4 py-2.5 bg-[#161b22] border border-[#30363d] rounded-xl text-white outline-none focus:border-emerald-500"
                    >
                      <option value="">-- Choose Pending L.R --</option>
                      {pendingLrs.map(lr => (
                        <option key={lr.id} value={lr.id}>
                          {lr.lrNo} - Tanker {lr.tankerNumber} ({lr.product}, {lr.qty} {lr.qtyUnit})
                        </option>
                      ))}
                    </select>
                    {pendingLrs.length === 0 && (
                      <p className="text-[10px] text-red-400 mt-2 font-mono leading-relaxed text-left">
                        No pending L.R records detected. Please use the "Compose New L.R. & Start" tab above to create one in-place!
                      </p>
                    )}
                  </div>

                    {selectedLrId && (() => {
                    const currentSelectedLr = lrs.find(l => l.id === selectedLrId);
                    if (!currentSelectedLr) return null;
                    return (
                      <div className="space-y-2 mt-2">
                        <div className="text-xs text-[#8b949e] grid grid-cols-2 gap-2 p-3 bg-[#161b22] border border-[#30363d] rounded-lg">
                          <div className="text-left"><span className="font-mono">Route:</span> <strong className="text-white">{currentSelectedLr.placeFrom} → {currentSelectedLr.placeTo}</strong></div>
                          <div className="text-left"><span className="font-mono">Cargo:</span> <strong className="text-white">{currentSelectedLr.product}</strong></div>
                          <div className="text-left"><span className="font-mono">Tanker:</span> <strong className="text-white">{currentSelectedLr.tankerNumber}</strong></div>
                          <div className="text-left"><span className="font-mono">Weight / Freight Total:</span> <strong className="text-white">{currentSelectedLr.qty} {currentSelectedLr.qtyUnit} (₹{currentSelectedLr.freightTotal.toLocaleString()})</strong></div>
                        </div>
                        <div className="text-left">
                          <label className="block text-[10px] font-mono text-orange-400 font-bold uppercase mb-1">
                            Verify / Override Billed To Party (Defaults to Consignor) *
                          </label>
                          <input 
                            type="text"
                            required
                            value={existingLrBilledToOverride}
                            onChange={(e) => setExistingLrBilledToOverride(e.target.value)}
                            placeholder="Enter Billed To name"
                            className="w-full px-3 py-1.5 bg-[#161b22] border border-orange-500/20 rounded text-xs text-white outline-none focus:border-amber-500 font-bold"
                          />
                        </div>
                      </div>
                    );
                  })()}

                  <div className="grid grid-cols-2 gap-4 text-xs text-white">
                    <div>
                      <label className="block font-mono text-[#8b949e] uppercase mb-1 text-left">Weight Unit *</label>
                      <select 
                        value={weightUnit}
                        onChange={(e) => setWeightUnit(e.target.value as 'KL' | 'MT')}
                        className="w-full px-3 py-2 bg-[#161b22] border border-[#30363d] rounded text-white"
                      >
                        <option value="MT">MT (Tons)</option>
                        <option value="KL">KL (Kiloliters)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block font-mono text-[#8b949e] uppercase mb-1 text-left">Loading Weight *</label>
                      <input 
                        type="number" 
                        step="any"
                        required={startLrMode === 'existing'}
                        placeholder="Enter loaded weight"
                        value={loadingWeight || ''}
                        onChange={(e) => setLoadingWeight(parseFloat(e.target.value) || 0)}
                        className="w-full px-3 py-2 bg-[#161b22] border border-[#30363d] rounded text-white"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Driver Assignment */}
              <div>
                <label className="block text-xs font-mono text-[#8b949e] uppercase mb-1.5 text-left">Select Active Driver *</label>
                <select 
                  required
                  value={selectedDriverId}
                  onChange={(e) => setSelectedDriverId(e.target.value)}
                  className="w-full px-4 py-2.5 bg-[#0d1117] border border-[#30363d] rounded-xl text-white text-xs outline-none focus:border-emerald-500"
                >
                  <option value="">-- Choose Driver --</option>
                  {idleDrivers.map(drv => (
                    <option key={drv.id} value={drv.id}>
                      {drv.name} ({drv.contactNumber})
                    </option>
                  ))}
                </select>
                {idleDrivers.length === 0 && (
                  <p className="text-[10px] text-red-400 mt-1 leading-relaxed text-left">
                    ⚠️ All registered drivers are currently on route active. Register or import driver details first.
                  </p>
                )}
              </div>

              {/* Estimator block */}
              <div className="bg-[#0d1117] p-4 border border-[#30363d] rounded-xl space-y-4">
                <span className="block text-xs font-mono text-white uppercase tracking-wider border-b border-[#21262d] pb-2 font-bold text-left">
                  Route Estimation & Predictor Controls
                </span>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] text-[#8b949e] uppercase mb-1 font-mono text-left">Approx Route Distance (KM)</label>
                    <input 
                      type="number" 
                      value={approxDistance}
                      onChange={(e) => setApproxDistance(parseInt(e.target.value) || 0)}
                      className="w-full px-3 py-2 bg-[#161b22] border border-[#30363d] rounded text-white text-xs font-mono"
                    />
                  </div>
                  <div className="flex items-center gap-2 pt-4">
                    <input 
                      type="checkbox" 
                      id="loaded-status" 
                      checked={isReturnTrip}
                      onChange={(e) => setIsReturnTrip(e.target.checked)}
                      className="w-4 h-4 rounded text-[#ff5a5f] focus:ring-0 cursor-pointer"
                    />
                    <label htmlFor="loaded-status" className="text-xs text-[#8b949e] cursor-pointer">
                      Empty Returning Tanker (5km/L)
                    </label>
                  </div>
                </div>

                <div className="p-3 bg-blue-900/10 border border-blue-500/20 rounded-lg text-xs space-y-2 text-white font-mono text-left">
                  <div className="flex justify-between">
                    <span>Selected Load Profile:</span>
                    <span className="text-blue-400 font-bold">{isReturnTrip ? 'EMPTY (Fuel: 5 KM/L)' : 'LOADED (Fuel: 3 KM/L)'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Approx. Fuel Consumed:</span>
                    <span className="text-yellow-400 font-bold">{expectedFuel} Liters</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Predicted AdBlue Required:</span>
                    <span className="text-emerald-400 font-bold">{expectedAdblue} Liters</span>
                  </div>
                </div>
              </div>

              {/* Actions Footer */}
              <div className="flex justify-end gap-3 pt-4 border-t border-[#2e2321]">
                <button 
                  type="button" 
                  onClick={() => setShowStartModal(false)}
                  className="px-5 py-2.5 bg-white/[0.04] border border-white/[0.06] text-[#b8a49c] hover:text-white text-xs rounded-xl cursor-pointer font-bold"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-bold text-xs rounded-xl cursor-pointer transition-all shadow border border-emerald-500/30"
                >
                  Confirm Dispatch & Start Trip
                </button>
              </div>
            </form>
          </div>

          {/* Right Column: Interactive 3D Model with Live Telemetry */}
          <div className="lg:col-span-5 flex flex-col justify-start gap-4 h-full">
            <span className="text-[10px] font-mono text-[#b8a49c] uppercase font-bold tracking-widest block">
              🌐 Interactive 3D Asset Telemetry
            </span>

            <Tanker3D 
              size="md" 
              cargoFilling={Math.min(1.0, (startLrMode === 'create' ? newLrQty : loadingWeight) / 40)} 
              colorAccent="#ff5a1f" 
              statusLabel={selectedLrTankerId ? `TELEMETRY DISPATCH DECK` : "RIG SYSTEM IDLE"} 
              className="w-full"
            />

            <div className="p-4 bg-[#201a18] border border-[#3e322f] rounded-[24px] text-xs space-y-2 text-left">
              <span className="text-[10px] font-mono text-[#ff7a4e] uppercase tracking-widest font-bold block font-sans">
                ⚡ Live Simulator Sync
              </span>
              <p className="text-[10px] text-[#b8a49c] font-mono leading-relaxed">
                Adjusting the <strong>Load Weight or Quantity</strong> above dynamically updates the 3D model chamber tank cylinder to verify load height and center of gravity stability!
              </p>
              <div className="text-[10px] font-mono text-zinc-300 space-y-1">
                <div className="flex justify-between">
                  <span className="text-[#8c7870]">Tank volume level:</span>
                  <span className="text-emerald-400 font-bold">
                    {((Math.min(1.0, (startLrMode === 'create' ? newLrQty : loadingWeight) / 40)) * 100).toFixed(0)}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#8c7870]">Stability Rating:</span>
                  <span className="text-emerald-400 font-bold">OPTIMAL ✓</span>
                </div>
              </div>
            </div>

            <div className="p-3.5 bg-[#ff5214]/10 border border-[#ff5a1f]/20 rounded-2xl text-[9px] font-mono text-[#ff7a4e] leading-relaxed uppercase">
              Notice: Double-check that chemical group requirements comply with localized safety class regulations before printing out the Lorry Receipt voucher.
            </div>
          </div>

        </div>

          </motion.div>
        </div>
      )}

      {/* Edit Trip Details Modal */}
      {selectedEditTrip && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 text-left">
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-full max-w-2xl bg-[#161b22] border border-blue-500/20 rounded-2xl shadow-2xl p-6 relative overflow-hidden"
          >
            <div className="flex justify-between items-center pb-4 border-b border-[#30363d] mb-5">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Edit className="w-5 h-5 text-blue-400" />
                  Edit Operational Trip & Financial Ledger Logs
                </h3>
                <p className="text-[10px] text-gray-400 mt-0.5">Voucher ID: {selectedEditTrip.id} | L.R. No: {selectedEditTrip.lrNo} | Tanker: {selectedEditTrip.tankerNumber}</p>
              </div>
              <button 
                onClick={() => setSelectedEditTrip(null)} 
                className="text-[#8b949e] hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditTrip} className="space-y-4 max-h-[70vh] overflow-y-auto pr-2 custom-scrollbar">
              {/* Route & Date Configuration */}
              <div className="bg-[#0e1117] border border-[#21262d] p-4 rounded-xl space-y-3">
                <h4 className="text-xs font-bold text-blue-400 uppercase tracking-widest">1. Route & Dates</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-white">
                  <div>
                    <label className="block text-[#8b949e] font-mono text-[10px] uppercase mb-1">Place From *</label>
                    <input 
                      type="text" 
                      required
                      className="w-full px-3 py-2 bg-[#161b22] border border-[#30363d] rounded text-white"
                      value={editPlaceFrom}
                      onChange={(e) => setEditPlaceFrom(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-[#8b949e] font-mono text-[10px] uppercase mb-1">Place To *</label>
                    <input 
                      type="text" 
                      required
                      className="w-full px-3 py-2 bg-[#161b22] border border-[#30363d] rounded text-white"
                      value={editPlaceTo}
                      onChange={(e) => setEditPlaceTo(e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-white">
                  <div>
                    <label className="block text-[#8b949e] font-mono text-[10px] uppercase mb-1">Start Date *</label>
                    <input 
                      type="date" 
                      required
                      className="w-full px-3 py-2 bg-[#161b22] border border-[#30363d] rounded text-white"
                      value={editStartDate}
                      onChange={(e) => setEditStartDate(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-[#8b949e] font-mono text-[10px] uppercase mb-1">End Arrival Date (Optional)</label>
                    <input 
                      type="date" 
                      className="w-full px-3 py-2 bg-[#161b22] border border-[#30363d] rounded text-white"
                      value={editEndDate}
                      onChange={(e) => setEditEndDate(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Tonnage / Weight Details */}
              <div className="bg-[#0e1117] border border-[#21262d] p-4 rounded-xl space-y-3">
                <h4 className="text-xs font-bold text-amber-500 uppercase tracking-widest">2. Tonnage & Rates</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-white">
                  <div>
                    <label className="block text-[#8b949e] font-mono text-[10px] uppercase mb-1">Loading Weight ({selectedEditTrip.qtyUnit}) *</label>
                    <input 
                      type="number" 
                      step="any"
                      required
                      className="w-full px-3 py-2 bg-[#161b22] border border-[#30363d] rounded text-white"
                      value={editLoadingWeight || ''}
                      onChange={(e) => setEditLoadingWeight(parseFloat(e.target.value) || 0)}
                    />
                  </div>
                  <div>
                    <label className="block text-[#8b949e] font-mono text-[10px] uppercase mb-1">Unloading Weight ({selectedEditTrip.qtyUnit}) *</label>
                    <input 
                      type="number" 
                      step="any"
                      required
                      className="w-full px-3 py-2 bg-[#161b22] border border-[#30363d] rounded text-white"
                      value={editUnloadingWeight || ''}
                      onChange={(e) => setEditUnloadingWeight(parseFloat(e.target.value) || 0)}
                    />
                  </div>
                  <div>
                    <label className="block text-[#8b949e] font-mono text-[10px] uppercase mb-1">Freight Rate (₹ per {selectedEditTrip.qtyUnit}) *</label>
                    <input 
                      type="number" 
                      step="any"
                      required
                      className="w-full px-3 py-2 bg-[#161b22] border border-[#30363d] rounded text-white"
                      value={editFreightRate || ''}
                      onChange={(e) => setEditFreightRate(parseFloat(e.target.value) || 0)}
                    />
                  </div>
                </div>
              </div>

              {/* Trip Operational Expenses Logs */}
              <div className="bg-[#0e1117] border border-[#21262d] p-4 rounded-xl space-y-3">
                <h4 className="text-xs font-bold text-rose-500 uppercase tracking-widest">3. Trip Ledger Expenses</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-white">
                  <div>
                    <label className="block text-[#8b949e] font-mono text-[10px] uppercase mb-1">Fuel Expense (₹)</label>
                    <input 
                      type="number" 
                      className="w-full px-3 py-2 bg-[#161b22] border border-[#30363d] rounded text-white"
                      value={editFuelExpense || ''}
                      onChange={(e) => setEditFuelExpense(parseFloat(e.target.value) || 0)}
                    />
                  </div>
                  <div>
                    <label className="block text-[#8b949e] font-mono text-[10px] uppercase mb-1">Driver Charge (₹)</label>
                    <input 
                      type="number" 
                      className="w-full px-3 py-2 bg-[#161b22] border border-[#30363d] rounded text-white"
                      value={editDriverCharge || ''}
                      onChange={(e) => setEditDriverCharge(parseFloat(e.target.value) || 0)}
                    />
                  </div>
                  <div>
                    <label className="block text-[#8b949e] font-mono text-[10px] uppercase mb-1">Toll / Fastag Expense (₹)</label>
                    <input 
                      type="number" 
                      className="w-full px-3 py-2 bg-[#161b22] border border-[#30363d] rounded text-white"
                      value={editTollExpense || ''}
                      onChange={(e) => setEditTollExpense(parseFloat(e.target.value) || 0)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs text-white">
                  <div>
                    <label className="block text-[#8b949e] font-mono text-[10px] uppercase mb-1">Repair Ledger (₹)</label>
                    <input 
                      type="number" 
                      className="w-full px-3 py-2 bg-[#161b22] border border-[#30363d] rounded text-white"
                      value={editRepairExpense || ''}
                      onChange={(e) => setEditRepairExpense(parseFloat(e.target.value) || 0)}
                    />
                  </div>
                  <div>
                    <label className="block text-[#8b949e] font-mono text-[10px] uppercase mb-1">Maintenance Ledger (₹)</label>
                    <input 
                      type="number" 
                      className="w-full px-3 py-2 bg-[#161b22] border border-[#30363d] rounded text-white"
                      value={editMaintenanceExpense || ''}
                      onChange={(e) => setEditMaintenanceExpense(parseFloat(e.target.value) || 0)}
                    />
                  </div>
                  <div>
                    <label className="block text-[#8b949e] font-mono text-[10px] uppercase mb-1">AdBlue Fluid Expense (₹)</label>
                    <input 
                      type="number" 
                      className="w-full px-3 py-2 bg-[#161b22] border border-[#30363d] rounded text-white"
                      value={editAdblueExpense || ''}
                      onChange={(e) => setEditAdblueExpense(parseFloat(e.target.value) || 0)}
                    />
                  </div>
                  <div>
                    <label className="block text-[#8b949e] font-mono text-[10px] uppercase mb-1">Miscellaneous / Other (₹)</label>
                    <input 
                      type="number" 
                      className="w-full px-3 py-2 bg-[#161b22] border border-[#30363d] rounded text-white"
                      value={editOtherExpense || ''}
                      onChange={(e) => setEditOtherExpense(parseFloat(e.target.value) || 0)}
                    />
                  </div>
                </div>
              </div>

              {/* Action row */}
              <div className="flex justify-end gap-3 pt-4 border-t border-[#30363d]">
                <button 
                  type="button"
                  onClick={() => setSelectedEditTrip(null)}
                  className="px-4 py-2 bg-[#21262d] hover:bg-[#30363d] border border-[#30363d] text-[#c9d1d9] rounded-xl text-xs font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-blue-900/30 cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  Save Changes
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* AI Excel Import Modal */}
      {showAiImportModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 text-left">
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-full max-w-lg bg-[#161b22] border border-[#30363d] rounded-2xl shadow-2xl p-6 relative overflow-hidden"
          >
            <div className="flex justify-between items-center pb-4 border-b border-[#30363d] mb-5">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <FileSpreadsheet className="w-5 h-5 text-cyan-400" />
                  AI Historical Trip Excel Import
                </h3>
                <p className="text-[10px] text-gray-400 mt-0.5">Automated spreadsheet audit mapped directly via Gemini 2.5 AI</p>
              </div>
              <button 
                onClick={() => {
                  if (!isAnalysing) {
                    setShowAiImportModal(false);
                    setImportingFile(null);
                    setAiError(null);
                  }
                }} 
                className="text-[#8b949e] hover:text-white cursor-pointer disabled:opacity-40"
                disabled={isAnalysing}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {isAnalysing ? (
              <div className="py-12 flex flex-col items-center justify-center space-y-6 text-center">
                <div className="relative w-16 h-16">
                  <div className="absolute inset-0 border-4 border-cyan-500/10 rounded-full" />
                  <div className="absolute inset-0 border-4 border-t-cyan-400 rounded-full animate-spin" />
                </div>
                <div className="space-y-4 max-w-sm">
                  <p className="text-xs font-bold text-white uppercase tracking-wider animate-pulse">Analyzing Spreadsheet Logs...</p>
                  <p className="text-[11px] text-cyan-400 font-mono italic leading-relaxed">{analysingProgress}</p>
                  <p className="text-[9px] text-[#8b949e] uppercase tracking-widest leading-normal pt-2">
                    Do not close or refresh this view. Gemini is processing cell patterns...
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-5">
                {aiError && (
                  <div className="bg-rose-500/15 border border-rose-500/35 p-3.5 rounded-xl text-rose-300 text-xs text-left leading-relaxed">
                    <strong className="block font-bold mb-1 uppercase text-[10px] font-mono tracking-wider">Analysis Breakdown Error:</strong>
                    {aiError}
                  </div>
                )}

                <div className="space-y-1">
                  <label className="block text-[10px] uppercase font-mono text-[#8b949e] tracking-wider">Select Excel Spreadsheet Folder (.xlsx, .xls, .csv)</label>
                  <div className="border-2 border-dashed border-[#30363d] rounded-2xl p-8 bg-[#0d1117] hover:border-cyan-500/50 transition-all cursor-pointer relative flex flex-col items-center justify-center text-center space-y-3.5">
                    <FileSpreadsheet className="w-10 h-10 text-cyan-400" />
                    <div className="space-y-1">
                      {importingFile ? (
                        <p className="text-xs font-bold text-[#fafafa] font-mono truncate max-w-[340px] bg-cyan-500/10 px-3 py-1.5 rounded-lg border border-cyan-500/25">
                          📎 {importingFile.name}
                        </p>
                      ) : (
                        <>
                          <span className="block text-xs font-bold text-white">Click or drag trip journal file to analyze</span>
                          <span className="text-[10px] text-gray-500">Supports Standard Excel files with row entries</span>
                        </>
                      )}
                    </div>
                    <input 
                      type="file" 
                      accept=".xlsx,.xls,.csv"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) setImportingFile(file);
                      }}
                      className="absolute inset-0 opacity-0 cursor-pointer"
                    />
                  </div>
                </div>

                <div className="bg-[#121c2c] border border-cyan-500/10 p-4 rounded-xl text-left leading-relaxed space-y-1">
                  <p className="text-xs font-bold text-cyan-400 font-mono uppercase tracking-widest">How AI Parse Works:</p>
                  <p className="text-[11px] text-[#8b949e]">
                    You click upload. Gemini AI reads any layout of columns (lr plate, tanker count, dates, diesel charges) automatically, registers missing drivers/tankers, and loads historical trip registers instantly.
                  </p>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-[#30363d]">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAiImportModal(false);
                      setImportingFile(null);
                      setAiError(null);
                    }}
                    className="px-4 py-2.5 bg-[#21262d] hover:bg-[#30363d] text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleExcelImportSubmit}
                    disabled={!importingFile}
                    className="px-5 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-500 disabled:from-cyan-500/25 disabled:to-blue-500/25 hover:from-cyan-400 hover:to-blue-400 text-white font-bold rounded-xl text-xs shadow-md shadow-cyan-500/15 transition-all cursor-pointer disabled:cursor-not-allowed"
                  >
                    Trigger AI Analysis
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        </div>
      )}

      {/* Expense Modal */}
      {showExpenseModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-full max-w-lg bg-[#161b22] border border-[#30363d] rounded-2xl shadow-2xl p-6"
          >
            <div className="flex justify-between items-center pb-4 border-b border-[#30363d] mb-5">
              <h3 className="text-lg font-bold text-white">Log Tanker Expense Record</h3>
              <button onClick={() => setShowExpenseModal(false)} className="text-[#8b949e] hover:text-white cursor-pointer">
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={expenseHandler} className="space-y-4">
              <div>
                <label className="block text-xs font-mono text-[#8b949e] uppercase mb-1.5">Target Tanker Vehicle *</label>
                <select 
                  required
                  value={expTankerId}
                  onChange={(e) => setExpTankerId(e.target.value)}
                  className="w-full px-4 py-2.5 bg-[#0d1117] border border-[#30363d] rounded-xl text-white text-xs outline-none"
                >
                  <option value="">-- Choose Tanker --</option>
                  {tankers.map(t => (
                    <option key={t.id} value={t.id}>
                      {t.tankerNumber} ({t.status.toUpperCase()})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-mono text-[#8b949e] uppercase mb-1.5">Expense Model Category *</label>
                  <select 
                    value={expCategory}
                    onChange={(e) => setExpCategory(e.target.value as any)}
                    className="w-full px-4 py-2.5 bg-[#0d1117] border border-[#30363d] rounded-xl text-white text-xs outline-none"
                  >
                    <option value="fuel">Fuel (Diesel Expense)</option>
                    <option value="adblue">AdBlue Refill</option>
                    <option value="driver">Driver Charge</option>
                    <option value="toll">Toll Tax</option>
                    <option value="repair">Repair & Maintenance Expenses</option>
                    <option value="other">Other Incidentals</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-mono text-[#8b949e] uppercase mb-1.5">Expense Amount (INR) *</label>
                  <input 
                    type="number" 
                    required
                    placeholder="INR Value"
                    value={expAmount || ''}
                    onChange={(e) => setExpAmount(parseFloat(e.target.value) || 0)}
                    className="w-full px-4 py-2.5 bg-[#0d1117] border border-[#30363d] rounded-xl text-white text-xs outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono text-[#8b949e] uppercase mb-1.5">{expCategory === 'repair' || expCategory === 'adblue' ? "Specific Detail / Notes (Optional)" : "Specific Detail / Description *"}</label>
                <textarea 
                  required={!(expCategory === 'repair' || expCategory === 'adblue')}
                  placeholder={expCategory === 'repair' || expCategory === 'adblue' ? "Additional manual comments about parts, discount, or mechanics etc." : "Describe parts, fuel outlet, or service vendor names logged"}
                  value={expDetail}
                  onChange={(e) => setExpDetail(e.target.value)}
                  rows={2}
                  className="w-full px-4 py-2.5 bg-[#0d1117] border border-[#30363d] rounded-xl text-white text-xs outline-none focus:border-emerald-500"
                />
              </div>

              {/* Conditional Fields for Repair OR AdBlue to Maintain Accurate Dealer Ledgers */}
              {(expCategory === 'repair' || expCategory === 'adblue') && (
                <div className="bg-[#0f141c] border border-[#30363d] p-4.5 rounded-xl space-y-4 shadow-inner">
                  <div className="text-xs font-bold text-[#ff5a5f] uppercase tracking-wider flex items-center gap-1.5 border-b border-[#30363d] pb-2">
                    <span className="w-2 h-2 rounded-full bg-[#ff5a5f] animate-pulse"></span>
                    <span>{expCategory === 'repair' ? 'Repair & Maintenance Details (Ledger Account Info)' : 'AdBlue Dealer Settlement Ledger'}</span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-mono text-[#8b949e] uppercase mb-1.5">Dealer / Vendor Party *</label>
                      <select
                        required
                        value={expVendorSelect}
                        onChange={(e) => setExpVendorSelect(e.target.value)}
                        className="w-full px-4 py-2 bg-[#0d1117] border border-[#30363d] rounded-xl text-white text-xs outline-none"
                      >
                        <option value="">-- Choose Dealer --</option>
                        {expCategory === 'repair' ? (
                          <>
                            <option value="Ranoli Workshop Dealers">Ranoli Workshop Dealers</option>
                            <option value="Shree Ram Auto Parts">Shree Ram Auto Parts</option>
                            <option value="Mahavir Tyres & Wheels">Mahavir Tyres & Wheels</option>
                            <option value="Apex Electronics & Battery">Apex Electronics & Battery</option>
                            <option value="Gujarat Garage Workshop">Gujarat Garage Workshop</option>
                          </>
                        ) : (
                          <>
                            <option value="IOCL Ranoli Pump, Vadodara">IOCL Ranoli Pump, Vadodara</option>
                            <option value="BRC Depot Yard Store, Ranoli">BRC Depot Yard Store, Ranoli</option>
                            <option value="GSFC Fertilizer Depot">GSFC Fertilizer Depot</option>
                            <option value="Aditya Fuel Point">Aditya Fuel Point</option>
                          </>
                        )}
                        <option value="custom">-- Custom Supplier name --</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-mono text-[#8b949e] uppercase mb-1.5">Bill / Invoice No. *</label>
                      <input 
                        type="text"
                        required
                        placeholder="e.g. BLL-5012"
                        value={expBillNo}
                        onChange={(e) => setExpBillNo(e.target.value)}
                        className="w-full px-4 py-2 bg-[#0d1117] border border-[#30363d] rounded-xl text-white text-xs outline-none focus:border-red-500"
                      />
                    </div>
                  </div>

                  {/* Custom Dealer input if chosen */}
                  {expVendorSelect === 'custom' && (
                    <motion.div
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                    >
                      <label className="block text-[10px] font-mono text-[#8b949e] uppercase mb-1.5">Enter Custom Dealer Name *</label>
                      <input 
                        type="text"
                        required
                        placeholder="e.g. Royal Auto Electric, Surat"
                        value={expCustomVendorName}
                        onChange={(e) => setExpCustomVendorName(e.target.value)}
                        className="w-full px-4 py-2 bg-[#0d1117] border border-[#30363d] rounded-xl text-white text-xs outline-none focus:border-red-500"
                      />
                    </motion.div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-mono text-[#8b949e] uppercase mb-1.5">Place of Purchase / Service *</label>
                      <select
                        value={expPlaceSelect}
                        onChange={(e) => setExpPlaceSelect(e.target.value)}
                        className="w-full px-4 py-2 bg-[#0d1117] border border-[#30363d] rounded-xl text-white text-xs outline-none"
                      >
                        <option value="Ranoli">Ranoli</option>
                        <option value="Vadodara">Vadodara</option>
                        <option value="Surat">Surat</option>
                        <option value="Ahmedabad">Ahmedabad</option>
                        <option value="Highway NH-8">Highway NH-8</option>
                        <option value="custom">-- Custom Place --</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-mono text-[#8b949e] uppercase mb-1.5">Date of Bill *</label>
                      <input 
                        type="date"
                        required
                        value={expDate}
                        onChange={(e) => setExpDate(e.target.value)}
                        className="w-full px-4 py-2 bg-[#0d1117] border border-[#30363d] rounded-xl text-white text-xs outline-none"
                      />
                    </div>
                  </div>

                  {/* Enter Custom Place */}
                  {expPlaceSelect === 'custom' && (
                    <motion.div
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                    >
                      <label className="block text-[10px] font-mono text-[#8b949e] uppercase mb-1.5">Enter Custom Place Name *</label>
                      <input 
                        type="text"
                        required
                        placeholder="e.g. Bharuch Bypass Yard"
                        value={expCustomPlace}
                        onChange={(e) => setExpCustomPlace(e.target.value)}
                        className="w-full px-4 py-2 bg-[#0d1117] border border-[#30363d] rounded-xl text-white text-xs outline-none focus:border-red-500"
                      />
                    </motion.div>
                  )}

                  {/* Work Type (only for repairs) */}
                  {expCategory === 'repair' && (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-mono text-[#8b949e] uppercase mb-1.5">Type of Work Done *</label>
                        <select
                          value={expWorkTypeSelect}
                          onChange={(e) => setExpWorkTypeSelect(e.target.value)}
                          className="w-full px-4 py-2 bg-[#0d1117] border border-[#30363d] rounded-xl text-white text-xs outline-none"
                        >
                          <option value="Spare Part Changed">Spare Part Changed</option>
                          <option value="Engine Service">Routine Service</option>
                          <option value="Tyre Work & Alignment">Tyre Work & Alignment</option>
                          <option value="Electrical & Battery Work">Electrical & Battery Work</option>
                          <option value="Welding & Body Fabrication">Welding & Body Fabrication</option>
                          <option value="custom">-- Custom Work Type --</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] font-mono text-[#8b949e] uppercase mb-1.5">Dealer Account Settlement *</label>
                        <select
                          value={expPaymentStatus}
                          onChange={(e) => setExpPaymentStatus(e.target.value as any)}
                          className="w-full px-4 py-2 bg-[#0d1117] border border-[#30363d] rounded-xl text-xs outline-none text-white font-bold"
                        >
                          <option value="collected">✅ Cleared (Paid Instantly)</option>
                          <option value="pending">⏳ Pending (Add to Outstanding Credit)</option>
                        </select>
                      </div>
                    </div>
                  )}

                  {/* Work Type custom input */}
                  {expCategory === 'repair' && expWorkTypeSelect === 'custom' && (
                    <motion.div
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                    >
                      <label className="block text-[10px] font-mono text-[#8b949e] uppercase mb-1.5">Enter Specific Repair Done *</label>
                      <input 
                        type="text"
                        required
                        placeholder="e.g. Cabin AC repair or gear oil changed"
                        value={expCustomWorkType}
                        onChange={(e) => setExpCustomWorkType(e.target.value)}
                        className="w-full px-4 py-2 bg-[#0d1117] border border-[#30363d] rounded-xl text-white text-xs outline-none focus:border-red-500"
                      />
                    </motion.div>
                  )}

                  {/* Payment status for Adblue category if not repair */}
                  {expCategory === 'adblue' && (
                    <div>
                      <label className="block text-[10px] font-mono text-[#8b949e] uppercase mb-1.5">Dealer Account Settlement *</label>
                      <select
                        value={expPaymentStatus}
                        onChange={(e) => setExpPaymentStatus(e.target.value as any)}
                        className="w-full px-4 py-2 bg-[#0d1117] border border-[#30363d] rounded-xl text-xs outline-none text-white font-bold"
                      >
                        <option value="collected">✅ Cleared (Paid Instantly)</option>
                        <option value="pending">⏳ Pending (Add to Outstanding Credit)</option>
                      </select>
                    </div>
                  )}
                </div>
              )}

              <div className="bg-[#0d1117] p-4.5 rounded-xl border border-blue-500/10 text-xs text-blue-300">
                ⚠️ If this tanker does not have any currently running trips, this record is dynamically attached to the <strong className="text-white">most recently ended trip</strong> to retain chronological consistency.
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-[#30363d]">
                <button 
                  type="button" 
                  onClick={() => setShowExpenseModal(false)}
                  className="px-4 py-2 bg-[#21262d] text-[#8b949e] hover:text-white text-xs rounded-lg"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="px-5 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold text-xs rounded-lg"
                >
                  Record Expense
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Dynamic 21-Column Detailed Tabular Specs Popover Modal with Split interactive 3D telemetry */}
      {selectedSpecsTrip && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-full max-w-4xl bg-[#171312] border border-[#2b211f] rounded-[32px] shadow-[0_24px_64px_rgba(0,0,0,0.85)] p-6 overflow-hidden flex flex-col max-h-[92vh]"
          >
            <div className="flex justify-between items-center pb-4 border-b border-[#2b211f]">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gradient-to-tr from-[#ff7c4f] to-[#ff5314] rounded-xl text-white shadow-md">
                  <Truck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">Historical Audit Record Specifications</h3>
                  <p className="text-[10px] text-[#b8a49c] font-mono uppercase tracking-widest">CENTRAL COMPLIANCE AUDIT DEPOT</p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedSpecsTrip(null)}
                className="text-gray-400 hover:text-white p-2 hover:bg-white/[0.04] border border-transparent hover:border-white/[0.06] rounded-xl cursor-pointer transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Split Grid */}
            <div className="flex-1 overflow-y-auto py-6 grid grid-cols-1 md:grid-cols-12 gap-6 min-h-0">
              
              {/* Left specifications table */}
              <div className="md:col-span-7 overflow-x-auto pr-0 md:pr-2">
                <span className="text-[10px] font-mono text-[#b8a49c] uppercase font-bold tracking-widest mb-3.5 block">
                  🛡️ Ledger Entries Logs
                </span>
                <table className="w-full text-left text-xs border-collapse font-mono whitespace-nowrap border border-[#2e2321] rounded-2xl overflow-hidden">
                  <thead>
                    <tr className="bg-[#241d1b] text-[#b8a49c] border-b border-[#2e2321] uppercase text-[9px] tracking-wider">
                      <th className="p-3.5 border-r border-[#2e2321]">Log Column Name</th>
                      <th className="p-3.5">Verified Balance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#211918] text-white text-xs bg-[#120e0d]">
                    {(() => {
                      const rec = prepareTripExportRecord(selectedSpecsTrip);
                      const listPairs = [
                        { label: "1. L.R No.", val: rec.lrNo, color: "text-amber-400 font-bold" },
                        { label: "2. Voucher ID", val: rec.voucherNo, color: "text-blue-400 font-bold font-mono" },
                        { label: "3. Party Account", val: rec.partyName, color: "text-[#ff7a4e] font-bold" },
                        { label: "4. Cargo Origin", val: rec.from, color: "text-zinc-200" },
                        { label: "5. Cargo Destination", val: rec.to, color: "text-zinc-200" },
                        { label: "6. Product Spec", val: rec.product, color: "text-emerald-400 font-semibold" },
                        { label: "7. Qty Dispatched", val: `${rec.qty} ${rec.qtyUnit}`, color: "text-white font-bold" },
                        { label: "7a. Qty Received (Unloaded)", val: selectedSpecsTrip.status === 'completed' ? `${selectedSpecsTrip.unloadingWeight ?? selectedSpecsTrip.loadingWeight} ${selectedSpecsTrip.qtyUnit}` : 'N/A (In-Route)', color: "text-teal-400 font-bold" },
                        { label: "7b. Transit Cargo Shortage", val: selectedSpecsTrip.status === 'completed' && selectedSpecsTrip.unloadingWeight !== undefined && (selectedSpecsTrip.loadingWeight - selectedSpecsTrip.unloadingWeight) > 0 ? `${(selectedSpecsTrip.loadingWeight - selectedSpecsTrip.unloadingWeight).toFixed(3)} ${selectedSpecsTrip.qtyUnit} Deficit ⚠️` : '0.000 (No Deficit)', color: selectedSpecsTrip.status === 'completed' && selectedSpecsTrip.unloadingWeight !== undefined && (selectedSpecsTrip.loadingWeight - selectedSpecsTrip.unloadingWeight) > 0 ? "text-[#ff723b] font-bold" : "text-gray-400" },
                        { label: "8. Freight Pricing Term", val: `₹${rec.freightRate}`, color: "text-yellow-400 font-bold" },
                        { label: "9. Total Cargo Freight", val: `₹${rec.totalFreight}`, color: "text-emerald-400 font-black text-xs" },
                        { label: "10. Assigned Rig Number", val: rec.tankerNumber, color: "text-[#ff7a4e] font-bold" },
                        { label: "11. Transit Fuel Exp", val: `₹${rec.fuelExpense}`, color: "text-rose-450" },
                        { label: "12. Driver Wage Exp", val: `₹${rec.driverCharge}`, color: "text-rose-450" },
                        { label: "13. Road Tolls Exp", val: `₹${rec.tollExpense}`, color: "text-rose-450" },
                        { label: "14. Workshop Repairs", val: `₹${rec.repairExpense}`, color: "text-rose-450" },
                        { label: "14b. Preventive Maintenance", val: `₹${rec.maintenanceExpense || '0'}`, color: "text-rose-450" },
                        { label: "15. AdBlue Additive", val: `₹${rec.adblueExpense}`, color: "text-rose-450" },
                        { label: "16. Transporter Profit", val: `₹${rec.profit}`, color: "text-emerald-400 font-black text-sm" },
                        { label: "17. Compliance Invoice No", val: rec.billNumber, color: "text-cyan-400 font-bold" }
                      ];

                      return listPairs.map((p, pIdx) => (
                        <tr key={pIdx} className="hover:bg-white/[0.02] font-mono">
                          <td className="p-3 border-r border-[#2e2321] text-[#b8a49c] font-bold">{p.label}</td>
                          <td className={`p-3 ${p.color}`}>{p.val}</td>
                        </tr>
                      ));
                    })()}
                  </tbody>
                </table>
              </div>

              {/* Right rotating interactive 3D tanker */}
              <div className="md:col-span-5 flex flex-col justify-between gap-4 h-full">
                <div className="space-y-4">
                  <span className="text-[10px] font-mono text-[#b8a49c] uppercase font-bold tracking-widest block">
                    🌐 Real-Time 360° Visual Sensor
                  </span>
                  
                  {/* Mount the pristine Tanker3D projection engine */}
                  <Tanker3D 
                    size="md" 
                    cargoFilling={0.82} 
                    colorAccent="#ff5a1f" 
                    statusLabel={`RADAR: RG-${selectedSpecsTrip.tankerNumber}`} 
                    className="w-full"
                  />
                  
                  <div className="p-4 bg-[#201a18] border border-[#3e322f] rounded-2xl space-y-3">
                    <span className="text-[10px] font-mono text-[#ff7a4e] uppercase tracking-widest block font-bold">
                      🛡️ Stability & Structural Safety
                    </span>
                    <div className="grid grid-cols-2 gap-3.5 text-[10px] font-mono text-zinc-300">
                      <div className="p-2 bg-[#171312] border border-[#2b211f] rounded-xl">
                        <span className="text-[#8c7870] block">Vessel Volume:</span>
                        <span className="text-white font-bold">{selectedSpecsTrip.loadingWeight} MT/KL</span>
                      </div>
                      <div className="p-2 bg-[#171312] border border-[#2b211f] rounded-xl">
                        <span className="text-[#8c7870] block">Pressure Stat:</span>
                        <span className="text-emerald-400 font-black">1.03 BAR ✓</span>
                      </div>
                      <div className="p-2 bg-[#171312] border border-[#2b211f] rounded-xl">
                        <span className="text-[#8c7870] block">Roll Rate:</span>
                        <span className="text-emerald-400 font-bold">0.02° Deg / S</span>
                      </div>
                      <div className="p-2 bg-[#171312] border border-[#2b211f] rounded-xl">
                        <span className="text-[#8c7870] block">Seal Registry:</span>
                        <span className="text-cyan-400 font-bold">C-SEAL-80413</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-3.5 bg-sky-500/10 border border-sky-500/20 text-[#a3d4ff] text-xs rounded-2xl flex items-start gap-2.5">
                  <span className="text-base">ℹ️</span>
                  <p className="font-mono text-[9px] leading-relaxed uppercase">
                    You can drag inside the radar window to orbit and inspect the vessel casing integrity in real-time.
                  </p>
                </div>
              </div>

            </div>

            <div className="border-t border-[#2e2321] pt-4 flex justify-between items-center text-[10px] font-mono">
              <span className="text-[#8c7870]">System Verification Logged @ {new Date().toLocaleDateString()}</span>
              <button 
                onClick={() => setSelectedSpecsTrip(null)}
                className="px-5 py-2.5 bg-gradient-to-r from-[#ff7a4e]/20 to-[#ff5a1f]/20 hover:from-[#ff7a4e] hover:to-[#ff5a1f] text-white hover:text-white border border-[#ff5a1f]/30 rounded-xl cursor-pointer text-xs font-bold font-sans transition-all shadow-md"
              >
                Close Visual Diagnostic
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Dynamic Printing Invoice Tally style Popup Overlay */}
      {selectedPreviewInvoice && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="w-full max-w-5xl bg-[#161b22] border border-[#30363d] rounded-2xl shadow-2xl p-6 relative">
            <div className="flex justify-between items-center pb-4 border-b border-[#30363d] mb-4">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-1.5">
                  <Printer className="w-4.5 h-4.5 text-amber-400" />
                  Official Trip Tax Invoice Print Preview
                </h3>
                <p className="text-[10px] text-gray-400 font-mono mt-0.5">STRICT TALLY INVOICE PROTOCOL GRAPHICS</p>
              </div>
              <button 
                onClick={() => setSelectedPreviewInvoice(null)}
                className="text-gray-400 hover:text-white hover:bg-red-500/20 px-3 py-1.5 rounded-xl text-xs font-bold font-sans cursor-pointer transition-all"
              >
                Close
              </button>
            </div>

            <div className="bg-white text-black p-10 rounded-xl overflow-x-auto max-h-[70vh] overflow-y-auto shadow-inner">
              <TallyInvoice invoice={selectedPreviewInvoice} onClose={() => setSelectedPreviewInvoice(null)} />
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-[#30363d] mt-4">
              <button 
                onClick={() => setSelectedPreviewInvoice(null)}
                className="px-4 py-2 bg-[#21262d] text-[#8b949e] hover:text-white rounded-xl text-xs font-sans font-semibold"
              >
                Cancel
              </button>
              <button 
                onClick={() => window.print()} 
                className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-black font-black font-sans text-xs rounded-xl inline-flex items-center gap-2 shadow-lg"
              >
                <Printer className="w-4 h-4" />
                Trigger Print Job (Ctrl+P)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Shipmate detailed modal for voyages */}
      {selectedDetailTrip && (
        <ShipmateDetailModal
          isOpen={!!selectedDetailTrip}
          onClose={() => setSelectedDetailTrip(null)}
          title="Voyage Logistics Statement Audit"
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
    </div>
  );
}

// Beautiful Geographic Route Map component
function GeographicRouteMap({ trip, associatedLr }: { trip: Trip; associatedLr?: LorryReceipt }) {
  const [satelliteView, setSatelliteView] = useState(false);
  const [isScanning, setIsScanning] = useState(false);

  const startName = trip.placeFrom || "Ranoli Cluster";
  const endName = trip.placeTo || "Dahej Terminal";

  const triggerRadarScan = () => {
    setIsScanning(true);
    setTimeout(() => setIsScanning(false), 2000);
  };

  return (
    <div className="bg-[#11141b] border border-[#21262d] rounded-xl p-4 flex flex-col justify-between min-h-[400px] h-full relative overflow-hidden group">
      <div 
        className="absolute inset-0 opacity-[0.04] pointer-events-none transition-opacity duration-500" 
        style={{ 
          backgroundImage: satelliteView ? 'radial-gradient(circle, #38bdf8 1.5px, transparent 1.5px)' : 'radial-gradient(circle, #8b949e 1px, transparent 1px)', 
          backgroundSize: satelliteView ? '12px 12px' : '18px 18px' 
        }} 
      />

      {satelliteView && (
        <div className="absolute inset-0 bg-blue-950/10 pointer-events-none backdrop-brightness-[0.85] transition-all duration-500" />
      )}

      <div className="flex justify-between items-center z-10">
        <div className="space-y-0.5">
          <span className="text-[9px] font-mono text-cyan-400 font-bold uppercase tracking-wider block">🛰️ GIS Live Tracking Sensor</span>
          <h5 className="text-xs font-bold text-white uppercase">{satelliteView ? 'Satellite Overlay Mode' : 'Vector Routing Mode'}</h5>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setSatelliteView(prev => !prev)}
            className="px-2 py-1 bg-[#21262d] hover:bg-[#30363d] text-white border border-[#30363d] rounded text-[9px] font-mono cursor-pointer transition-all uppercase"
          >
            {satelliteView ? 'Vector Grid' : 'Satellite'}
          </button>
        </div>
      </div>

      <div className="relative w-full h-[220px] bg-[#0c0f16] border border-[#21262d] rounded-xl my-3 flex items-center justify-center overflow-hidden">
        
        {isScanning && (
          <div className="absolute inset-0 bg-[#06b6d4]/5 pointer-events-none flex items-center justify-center">
            <div className="w-[180px] h-[180px] rounded-full border border-cyan-500/30 animate-[ping_1.5s_ease-out_infinite]" />
            <div className="w-[80px] h-[80px] rounded-full border border-cyan-500/20 animate-pulse absolute" />
          </div>
        )}

        <svg viewBox="0 0 200 150" className="w-full h-full p-2">
          <g transform="translate(25, 125)" className="opacity-30">
            <circle r="12" fill="none" stroke="#8b949e" strokeWidth="0.5" />
            <path d="M0 -10 L2 -2 L8 -8 L2 -2 L10 0 L2 2 L8 8 L2 2 L0 10 L-2 2" fill="none" stroke="#8b949e" strokeWidth="0.5" />
            <text y="-14" textAnchor="middle" fill="#8b949e" fontSize="6">N</text>
          </g>

          <path
            id="routePath"
            d="M 30,50 Q 100,20 170,110"
            fill="none"
            stroke={satelliteView ? '#0284c7' : '#30363d'}
            strokeWidth="2.5"
            strokeDasharray={satelliteView ? '1 1' : '5 4'}
            className="transition-colors duration-500"
          />

          <path
            d="M 30,50 Q 100,20 170,110"
            fill="none"
            stroke="url(#route-glow-grad)"
            strokeWidth="3"
            strokeDasharray="15 35"
            className="animate-[dash_6s_linear_infinite]"
          />

          <g transform="translate(30, 50)">
            <circle r="6" fill="#1e1b4b" stroke="#3b82f6" strokeWidth="1.5" />
            <circle r="2.5" fill="#3b82f6" className="animate-ping" style={{ animationDuration: '4s' }} />
            <circle r="1.5" fill="#60a5fa" />
            <text x="0" y="-10" textAnchor="middle" fill="#8b949e" fontSize="7" fontFamily="JetBrains Mono" className="font-bold select-none whitespace-nowrap">
              {startName.split(' ')[0]}
            </text>
          </g>

          <g transform="translate(170, 110)">
            <circle r="6" fill="#064e3b" stroke="#10b981" strokeWidth="1.5" />
            <circle r="2.5" fill="#10b981" className="animate-ping" style={{ animationDuration: '3s' }} />
            <circle r="1.5" fill="#34d399" />
            <text x="0" y="15" textAnchor="middle" fill="#8b949e" fontSize="7" fontFamily="JetBrains Mono" className="font-bold select-none whitespace-nowrap">
              {endName.split(' ')[0]}
            </text>
          </g>

          {trip.status === 'running' ? (
            <motion.g
              animate={{
                offsetDistance: ["0%", "100%"]
              }}
              transition={{
                duration: 15,
                repeat: Infinity,
                ease: "linear"
              }}
              style={{
                offsetPath: `path('M 30,50 Q 100,20 170,110')`,
                offsetRotate: "auto"
              }}
            >
              <g transform="rotate(90)">
                <rect x="-6" y="-3.5" width="12" height="7" rx="1.5" fill="#ef4444" className="shadow-md" />
                <rect x="1" y="-2" width="4" height="4" rx="0.5" fill="#ffffff" />
                <circle cx="-3" cy="-3.5" r="1.5" fill="#000000" />
                <circle cx="3" cy="-3.5" r="1.5" fill="#000000" />
                <circle cx="-3" cy="3.5" r="1.5" fill="#000000" />
                <circle cx="3" cy="3.5" r="1.5" fill="#000000" />
              </g>
              <circle r="12" fill="none" stroke="#ef4444" strokeWidth="0.8" className="animate-ping" />
            </motion.g>
          ) : (
            <g transform="translate(170, 110)">
              <g transform="translate(-8, -8)" className="text-emerald-400">
                <svg viewBox="0 0 24 24" className="w-4 h-4 text-emerald-400">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" stroke="currentColor" strokeWidth="2.5" fill="none"/>
                  <path d="M22 4L12 14.01l-3-3" stroke="currentColor" strokeWidth="2.5" fill="none"/>
                </svg>
              </g>
            </g>
          )}

          <defs>
            <linearGradient id="route-glow-grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ef4444" stopOpacity="0.2" />
              <stop offset="50%" stopColor="#fb7185" stopOpacity="1" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0.2" />
            </linearGradient>
          </defs>
        </svg>

        <div className="absolute top-2.5 left-2.5 bg-[#161b22]/90 border border-[#30363d] px-2 py-1 rounded text-[8.5px] font-mono text-[#8b949e] flex items-center gap-1.5 backdrop-blur-sm shadow-md">
          <span className={`w-1.5 h-1.5 rounded-full ${trip.status === 'running' ? 'bg-amber-400 animate-pulse' : 'bg-emerald-500'}`} />
          {trip.status === 'running' ? 'In Transit' : 'Route Clear'}
        </div>

        <button 
          onClick={triggerRadarScan}
          className="absolute bottom-2.5 right-2.5 bg-cyan-600 hover:bg-cyan-700 text-white border border-cyan-500 shadow-md font-mono text-[9px] px-2 py-1 rounded cursor-pointer transition-all transition-duration-200"
        >
          {isScanning ? 'Pinging GPS...' : 'GPS Radar Check'}
        </button>
      </div>

      <div className="bg-[#0c0f16] border border-[#21262d] rounded-xl p-3 space-y-2 text-[10.5px] font-mono">
        <div className="flex justify-between items-center text-[#8b949e]">
          <span>Consignor (Billed to):</span>
          <strong className="text-orange-400 truncate max-w-[170px]" title={associatedLr?.consignerName || "Industrial Chemie (Self)"}>
            {associatedLr?.consignerName || "Industrial Chemie (Self)"}
          </strong>
        </div>
        {associatedLr?.consigneeName && (
          <div className="flex justify-between items-center text-[#8b949e]">
            <span>Consignee (Deliver to):</span>
            <strong className="text-emerald-400 truncate max-w-[170px]" title={associatedLr.consigneeName}>
              {associatedLr.consigneeName}
            </strong>
          </div>
        )}
        <div className="flex justify-between items-center text-[#8b949e]">
          <span>Chemical Product:</span>
          <strong className="text-white">
            {associatedLr?.product || "Chem Specialty Compounds"}
          </strong>
        </div>
        <div className="flex justify-between items-center text-[#8b949e]">
          <span>Payload Weight/Qty:</span>
          <strong className="text-white">{trip.loadingWeight} {trip.qtyUnit}</strong>
        </div>
        <div className="flex justify-between items-center text-[#8b949e]">
          <span>Routing Sector:</span>
          <strong className="text-white truncate max-w-[160px]">
            {trip.placeFrom} ➔ {trip.placeTo}
          </strong>
        </div>
        <div className="flex justify-between items-center text-[#8b949e] pt-1.5 border-t border-[#21262d]/50">
          <span>GPRS GPS Connection:</span>
          <span className="flex items-center gap-1 text-emerald-400 font-bold">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Live / Active
          </span>
        </div>
      </div>
    </div>
  );
}

// Compact, highly animated horizontal SVG micro-path visualizer
function CompactTripPathVisualizer({ from, to, isRunning }: { from: string; to: string; isRunning: boolean }) {
  const formatShortCity = (str: string) => {
    if (!str) return '???';
    const clean = str.split(',')[0].trim().toUpperCase();
    return clean.length > 10 ? clean.substring(0, 9) + '..' : clean;
  };

  return (
    <div className="hidden sm:flex flex-col items-center justify-center px-4 py-1.5 bg-[#0d1017]/80 rounded-xl border border-white/[0.03] select-none hover:border-orange-500/20 transition-all font-mono">
      <div className="flex justify-between w-[150px] text-[8.5px] font-bold text-gray-400 px-1 mb-0.5 leading-tight">
        <span className="truncate max-w-[65px] text-orange-400 font-extrabold">{formatShortCity(from)}</span>
        <span className="truncate max-w-[65px] text-emerald-400 font-extrabold text-right">{formatShortCity(to)}</span>
      </div>
      <div className="relative w-[155px] h-[22px] flex items-center justify-center">
        <svg viewBox="0 0 140 22" className="w-full h-full overflow-visible">
          <path
            d="M 10,12 Q 70,3 130,12"
            fill="none"
            stroke="#21262d"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          <path
            d="M 10,12 Q 70,3 130,12"
            fill="none"
            stroke={isRunning ? "url(#compact-glow)" : "#444c56"}
            strokeWidth="1.8"
            strokeDasharray={isRunning ? "4 4" : "none"}
            className={isRunning ? "animate-[dash_6s_linear_infinite]" : ""}
          />
          <circle cx="10" cy="12" r="3.5" fill="#1e1b4b" stroke="#f97316" strokeWidth="1.2" />
          <circle cx="10" cy="12" r="1" fill="#f97316" />
          
          <circle cx="130" cy="12" r="3.5" fill="#064e3b" stroke="#10b981" strokeWidth="1.2" />
          <circle cx="130" cy="12" r="1" fill="#10b981" />

          {isRunning ? (
            <g>
              <circle r="3.5" fill="#ff5a5f" className="animate-ping" style={{ transformOrigin: 'center' }}>
                <animateMotion
                  dur="4s"
                  repeatCount="indefinite"
                  path="M 10,12 Q 70,3 130,12"
                />
              </circle>
              <circle r="2" fill="#ff7a7f">
                <animateMotion
                  dur="4s"
                  repeatCount="indefinite"
                  path="M 10,12 Q 70,3 130,12"
                />
              </circle>
            </g>
          ) : (
            <circle cx="70" cy="8.5" r="1.5" fill="#10b981" />
          )}

          <defs>
            <linearGradient id="compact-glow" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#f97316" />
              <stop offset="50%" stopColor="#fb7185" />
              <stop offset="100%" stopColor="#10b981" />
            </linearGradient>
          </defs>
        </svg>
      </div>
    </div>
  );
}

// Vertical Event Step Timeline indicator inside expanded/Active panels
function ActiveTripTimeline({ trip }: { trip: Trip }) {
  const steps = [
    {
      id: "dispatch",
      label: "Dispatch",
      description: "HMV vessel departed from chemical terminal load-hub",
      subtext: `Disp: ${trip.startDate} • Weight: ${trip.loadingWeight} ${trip.qtyUnit}`,
      isCompleted: true,
      isActive: trip.status === 'running' && trip.fuelExpense === 0 && trip.tollExpense === 0,
    },
    {
      id: "transit",
      label: "Transit & Fueling",
      description: "Toll checkpost clearances & diesel filling logs",
      subtext: trip.fuelExpense > 0 
        ? `Fuel logged: ₹${trip.fuelExpense.toLocaleString()}` 
        : "Pending transit fueling reports",
      isCompleted: trip.status === 'completed' || trip.fuelExpense > 0 || trip.tollExpense > 0,
      isActive: trip.status === 'running' && (trip.fuelExpense > 0 || trip.tollExpense > 0) && trip.adblueExpense === 0,
    },
    {
      id: "in-route",
      label: "In-Route Telematics",
      description: "Middle transit GPRS connection",
      subtext: trip.adblueExpense > 0 
        ? `Adblue: ₹${trip.adblueExpense.toLocaleString()} logged` 
        : `Est: ${trip.expectedFuelLiters}L Fuel • Active Link`,
      isCompleted: trip.status === 'completed' || trip.adblueExpense > 0 || trip.repairExpense > 0,
      isActive: trip.status === 'running' && !(trip.fuelExpense === 0 && trip.tollExpense === 0),
    },
    {
      id: "arrival",
      label: "Destination Arrival",
      description: "Loaded vessel received & terminal weight out closed",
      subtext: trip.status === 'completed' 
        ? `Unloaded: ${trip.unloadingWeight || trip.loadingWeight} ${trip.qtyUnit}` 
        : "Awaiting terminal arrival certificate",
      isCompleted: trip.status === 'completed',
      isActive: false,
    }
  ];

  return (
    <div className="bg-[#11141b] border border-[#21262d] rounded-xl p-4 space-y-3 h-full flex flex-col justify-between">
      <div className="flex items-center gap-1.5 border-b border-[#21262d]/50 pb-2.5">
        <span className="text-[9px] font-mono text-cyan-400 font-extrabold uppercase bg-cyan-400/10 px-1.5 py-0.5 rounded border border-cyan-400/20">
          📍 MILITARY COMPLIANCE
        </span>
        <h5 className="text-[10px] font-bold text-white uppercase font-sans tracking-wider">
          Auditor Dispatch Timeline
        </h5>
      </div>

      <div className="relative pl-5 space-y-4 text-left">
        <div className="absolute top-2 bottom-2 left-1.5 w-[1.5px] bg-[#21262d]" />

        {steps.map((step, idx) => {
          const isDone = step.isCompleted;
          const isCurrent = step.isActive;
          
          return (
            <div key={idx} className="relative text-left flex flex-col items-start">
              {isDone && (
                <div 
                  className="absolute -left-[14.5px] top-2.5 w-[1.5px] bg-gradient-to-b from-emerald-500 to-green-500 transition-all duration-300"
                  style={{ height: idx === steps.length - 1 ? '0' : '40px' }}
                />
              )}

              <div className="absolute -left-[18.2px] top-1 flex items-center justify-center">
                {isDone ? (
                  <div className="w-3.5 h-3.5 rounded-full bg-emerald-500/15 border border-emerald-500 flex items-center justify-center text-emerald-400 z-10 font-bold">
                    <Check className="w-2.5 h-2.5" />
                  </div>
                ) : isCurrent ? (
                  <div className="w-3.5 h-3.5 rounded-full bg-amber-500/15 border border-amber-500 flex items-center justify-center z-10 animate-pulse">
                    <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                  </div>
                ) : (
                  <div className="w-3.5 h-3.5 rounded-full bg-[#0c0f16] border border-[#21262d] flex items-center justify-center z-10 text-[7.5px] font-mono font-bold text-gray-500">
                    {idx + 1}
                  </div>
                )}
              </div>

              <div className="space-y-0.5 text-left">
                <span className={`text-[10.5px] font-mono font-bold uppercase block tracking-wider ${
                  isDone ? 'text-emerald-400' : isCurrent ? 'text-amber-500 animate-pulse' : 'text-gray-500'
                }`}>
                  {step.label}
                </span>
                <p className="text-[9.5px] text-gray-400 leading-snug font-sans">
                  {step.description}
                </p>
                <div className="text-[9px] text-[#8b949e] font-mono tracking-tighter">
                  {step.subtext}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
