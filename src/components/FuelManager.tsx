import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Droplet, Calendar, MapPin, Clock, FileSpreadsheet, Plus, Download, 
  Search, ArrowLeft, Fuel, Sparkles, TrendingUp, Filter, AlertCircle, Loader2
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { Tanker, TankerExpense } from '../types';
import { exportToExcel } from '../utils/exportUtils';
import { 
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, 
  CartesianGrid, Tooltip, Legend 
} from 'recharts';

interface FuelManagerProps {
  tankers: Tanker[];
  expenses: TankerExpense[];
  trips: any[];
  onAddGeneralExpense: (expense: TankerExpense) => void;
}

export default function FuelManager({ tankers, expenses, trips, onAddGeneralExpense }: FuelManagerProps) {
  const [selectedTankerId, setSelectedTankerId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  // BPCL statement integration states
  const [showBpclModal, setShowBpclModal] = useState(false);
  const [bpclFileLoading, setBpclFileLoading] = useState(false);
  const [bpclFeedback, setBpclFeedback] = useState<string | null>(null);
  const [bpclParsedRecordList, setBpclParsedRecordList] = useState<any[]>([]);
  const [bpclMatchedTrips, setBpclMatchedTrips] = useState<Record<number, any>>({});
  const [bpclCheckedEntries, setBpclCheckedEntries] = useState<Record<number, boolean>>({});

  // Fuel logging form modal state
  const [showLogModal, setShowLogModal] = useState(false);
  const [logTankerNumber, setLogTankerNumber] = useState(tankers[0]?.tankerNumber || '');
  const [logAmount, setLogAmount] = useState('');
  const [logDate, setLogDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [logTime, setLogTime] = useState('12:00');
  const [logQty, setLogQty] = useState('');
  const [logPlace, setLogPlace] = useState('Ranoli');
  const [logVendor, setLogVendor] = useState('IOCL Petrol Pump');
  const [logBill, setLogBill] = useState('');
  const [logDetail, setLogDetail] = useState('');

  // Fuel Slips Import states
  const [importFeedback, setImportFeedback] = useState<string | null>(null);

  // Filter fuel-specific expenses
  const fuelExpenses = expenses.filter(e => e.category === 'fuel');

  // Calculate metrics per tanker
  const tankerFuelSummaries = tankers.map(tanker => {
    const tankerExpenses = fuelExpenses.filter(e => e.tankerNumber === tanker.tankerNumber);
    const totalSpent = tankerExpenses.reduce((sum, e) => sum + e.amount, 0);
    const totalLiters = tankerExpenses.reduce((sum, e) => sum + (e.qtyLiters || 0), 0);
    const avgPricePerLiter = totalLiters > 0 ? (totalSpent / totalLiters).toFixed(2) : '0';
    
    return {
      tanker,
      expensesCount: tankerExpenses.length,
      totalSpent,
      totalLiters,
      avgPricePerLiter,
    };
  }).filter(sum => sum.tanker.tankerNumber.toLowerCase().includes(searchQuery.toLowerCase()));

  const activeSummary = selectedTankerId 
    ? tankerFuelSummaries.find(s => s.tanker.id === selectedTankerId) 
    : null;

  const activeTankerExpenses = activeSummary
    ? fuelExpenses.filter(e => e.tankerNumber === activeSummary.tanker.tankerNumber)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    : [];

  // Generate dynamic 6-month trends relative to the modern timestamp (e.g. May 2026)
  const get6MonthsTrendData = () => {
    const dataPoints = [];
    const baseDate = new Date("2026-05-28");
    baseDate.setDate(1); // avoid end of month skipping bugs
    
    for (let i = 5; i >= 0; i--) {
      const d = new Date(baseDate);
      d.setMonth(baseDate.getMonth() - i);
      const year = d.getFullYear();
      const month = d.getMonth();
      const label = d.toLocaleString('en-US', { month: 'short', year: '2-digit' });
      
      dataPoints.push({
        year,
        month,
        label,
        amount: 0,
        liters: 0
      });
    }
    return dataPoints;
  };

  const chartData = get6MonthsTrendData();
  
  // Decide if we filter by selected tanker or show aggregate fleet
  const activeChartExpenses = selectedTankerId && activeSummary
    ? fuelExpenses.filter(e => e.tankerNumber === activeSummary.tanker.tankerNumber)
    : fuelExpenses;

  // Aggregate fuel bills into the correct month
  activeChartExpenses.forEach(exp => {
    const expDate = new Date(exp.date);
    if (isNaN(expDate.getTime())) return;
    const year = expDate.getFullYear();
    const month = expDate.getMonth();
    
    const match = chartData.find(m => m.year === year && m.month === month);
    if (match) {
      match.amount += Number(exp.amount) || 0;
      match.liters += Number(exp.qtyLiters) || 0;
    }
  });

  const handleBpclStatementSelection = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    setBpclFileLoading(true);
    setBpclFeedback("Reading and parsing spreadsheet contents...");
    setBpclParsedRecordList([]);

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const rawJson: any[] = XLSX.utils.sheet_to_json(ws);

        if (rawJson.length === 0) {
          setBpclFeedback("Excel file is empty. Please provide a valid BPCL statement.");
          setBpclFileLoading(false);
          return;
        }

        setBpclFeedback("Structuring layout and executing server-side Gemini AI statement extractor...");

        // Construct raw data lines
        const rowStrings = rawJson.slice(0, 150).map((row, idx) => {
          return `Row ${idx + 1}: ` + Object.entries(row).map(([k, v]) => `${k}=${v}`).join(', ');
        }).join('\n');

        const response = await fetch('/api/statements/analyse-bpcl', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            statementText: rowStrings,
            textData: rowStrings,
            sheetRows: rawJson
          })
        });

        const resJson = await response.json();
        const list = resJson.data?.refuels || resJson.data?.slips || [];
        if (resJson.success && Array.isArray(list)) {
          setBpclParsedRecordList(list);

          const matches: Record<number, any> = {};
          const checks: Record<number, boolean> = {};

          list.forEach((entry: any, index: number) => {
            checks[index] = true;
            const entryDate = entry.date || new Date().toISOString().split('T')[0];
            const cleanEntryTanker = entry.tankerNumber ? entry.tankerNumber.replace(/[^a-zA-Z0-9]/g, '').toUpperCase() : '';

            // Map to a running or recently starting trip for this tanker
            const matchingTrip = trips.find(t => {
              const cleanTripTanker = t.tankerNumber ? t.tankerNumber.replace(/[^a-zA-Z0-9]/g, '').toUpperCase() : '';
              const tankerMatch = cleanTripTanker.endsWith(cleanEntryTanker) || cleanEntryTanker.endsWith(cleanTripTanker);
              const dateMatch = t.startDate <= entryDate && (!t.endDate || t.endDate >= entryDate);
              return tankerMatch && dateMatch;
            }) || trips.find(t => {
              const cleanTripTanker = t.tankerNumber ? t.tankerNumber.replace(/[^a-zA-Z0-9]/g, '').toUpperCase() : '';
              return cleanTripTanker.endsWith(cleanEntryTanker) || cleanEntryTanker.endsWith(cleanTripTanker);
            });

            if (matchingTrip) {
              matches[index] = matchingTrip;
            }
          });

          setBpclMatchedTrips(matches);
          setBpclCheckedEntries(checks);
          setBpclFeedback(`Successfully scanned: Identified ${list.length} transactions from Bharat Petroleum Corporation.`);
        } else {
          setBpclFeedback("Warning: Analysis failed to extract tabular records. Provide columns manually.");
        }
      } catch (err: any) {
        setBpclFeedback(`Error scanning statement file: ${err.message || 'Check network'}`);
      } finally {
        setBpclFileLoading(false);
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleExecuteBpclSync = () => {
    let syncedCount = 0;
    bpclParsedRecordList.forEach((entry: any, index: number) => {
      if (!bpclCheckedEntries[index]) return;

      const cleanPlate = entry.tankerNumber ? entry.tankerNumber.toUpperCase().replace(/\s+/g, '') : '';
      const matchedTanker = tankers.find(t => t.tankerNumber.toUpperCase().replace(/\s+/g, '') === cleanPlate) || tankers[0];

      if (!matchedTanker) return;

      const matchedTrip = bpclMatchedTrips[index];

      const refuelExpense: TankerExpense = {
        id: `EXP-BPCL-${Date.now()}-${index}`,
        tankerId: matchedTanker.id,
        tankerNumber: matchedTanker.tankerNumber,
        date: entry.date || new Date().toISOString().split('T')[0],
        category: 'fuel',
        amount: Number(entry.amount || 0),
        detail: `Synced BPCL Fuel Statement Invoice ${entry.billNo || 'N/A'}`,
        vendorName: entry.vendorName || 'BPCL Filling Station',
        billNo: entry.billNo || `BPCL-${index}`,
        place: entry.place || 'Ranoli',
        qtyLiters: Number(entry.qtyLiters || 0),
        time: entry.time || '12:00',
        excludeFromTrip: !matchedTrip,
        tripId: matchedTrip ? matchedTrip.id : undefined
      };

      onAddGeneralExpense(refuelExpense);
      syncedCount++;
    });

    alert(`Successfully compiled and synchronized ${syncedCount} BPCL statement fuel transactions to centralized ledger and trips!`);
    setShowBpclModal(false);
    setBpclParsedRecordList([]);
    setBpclFeedback(null);
  };

  const handleManualLogSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!logTankerNumber || !logAmount || !logQty) {
      alert("Please fill in plate registration, amount paid, and volume in liters!");
      return;
    }

    const matchedTanker = tankers.find(t => t.tankerNumber === logTankerNumber);
    if (!matchedTanker) {
      alert("Invalid tanker selection!");
      return;
    }

    const fuelExpenseEntry: TankerExpense = {
      id: `EXP-FUEL-${Date.now()}`,
      tankerId: matchedTanker.id,
      tankerNumber: matchedTanker.tankerNumber,
      date: logDate,
      category: 'fuel',
      amount: parseFloat(logAmount),
      detail: logDetail || `Highway Refueling at ${logPlace}`,
      vendorName: logVendor,
      billNo: logBill,
      place: logPlace,
      qtyLiters: parseFloat(logQty),
      time: logTime
    };

    onAddGeneralExpense(fuelExpenseEntry);
    setShowLogModal(false);
    
    // reset form fields
    setLogAmount('');
    setLogQty('');
    setLogBill('');
    setLogDetail('');
    alert(`Success: Logged ${logQty} Liters of Diesel for Tanker ${logTankerNumber}!`);
  };

  // Flexible helper function to extract values from row based on multiple case-insensitive key pattern matches
  const getValueByFlexibleKey = (row: any, keyPatterns: string[], defaultValue: any = '') => {
    const rowKeys = Object.keys(row);
    for (const pattern of keyPatterns) {
      const cleanPattern = pattern.toLowerCase().replace(/[^a-z0-9]/g, '');
      for (const rKey of rowKeys) {
        const cleanRKey = rKey.toLowerCase().replace(/[^a-z0-9]/g, '');
        if (cleanRKey === cleanPattern) {
          return row[rKey];
        }
      }
    }
    return defaultValue;
  };

  // Automated Excel / CSV Refueling slip importer
  const handleExcelImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws);

        if (data.length === 0) {
          setImportFeedback("Error: The spreadsheet file contains no valid record entries.");
          return;
        }

        let importCount = 0;
        data.forEach((row: any) => {
          // Robust columns matchers
          const tankerNoVal = getValueByFlexibleKey(row, ['tankerNumber', 'tankerNo', 'lorryNo', 'vehicleNo', 'vehicleNumber', 'lorry', 'truck', 'truckNo', 'vehNo', 'regNo']);
          const tankerNo = (tankerNoVal || (activeSummary ? activeSummary.tanker.tankerNumber : tankers[0]?.tankerNumber))?.toString().trim().toUpperCase();
          
          const amountVal = getValueByFlexibleKey(row, ['amount', 'cost', 'spent', 'value', 'price', 'netAmount', 'totalAmount', 'amt']);
          const amount = parseFloat(amountVal || '0');
          
          const litersVal = getValueByFlexibleKey(row, ['liters', 'litres', 'qty', 'quantity', 'vol', 'volume', 'qtyLiters', 'ltrs', 'ltr']);
          const liters = parseFloat(litersVal || '0');
          
          const dateVal = getValueByFlexibleKey(row, ['date', 'postingDate', 'txnDate', 'refillDate', 'transactionDate', 'dateStr']);
          const dateStr = (dateVal || new Date().toISOString().split('T')[0]).toString();
          
          const placeVal = getValueByFlexibleKey(row, ['place', 'station', 'location', 'city', 'pumpLocation', 'roLocation', 'outletLocation']);
          const place = (placeVal || 'Highway Pump').toString();
          
          const vendorVal = getValueByFlexibleKey(row, ['vendor', 'vendorName', 'pumpName', 'merchant', 'outlet', 'dealerName', 'retailOutlet']);
          const vendorObj = (vendorVal || 'IOCL Outlet').toString();
          
          const billVal = getValueByFlexibleKey(row, ['bill', 'billNo', 'slipNo', 'slip', 'invoiceNo', 'invoice', 'refNo', 'voucherNo', 'slipRef']);
          const billRef = (billVal || '').toString();
          
          const timeVal = getValueByFlexibleKey(row, ['time', 'slipTime', 'refillTime', 'txnTime', 'hour']);
          const slipTime = (timeVal || '12:00').toString();

          if (tankerNo && amount > 0) {
            const vehicle = tankers.find(t => t.tankerNumber.replace(/\s+/g, '').toUpperCase() === tankerNo.replace(/\s+/g, '').toUpperCase());
            const targetVehicle = vehicle || (activeSummary?.tanker);
            
            if (targetVehicle) {
              const parsedSlip: TankerExpense = {
                id: `EXP-FUEL-IMP-${Date.now()}-${importCount}`,
                tankerId: targetVehicle.id,
                tankerNumber: targetVehicle.tankerNumber,
                date: dateStr,
                category: 'fuel',
                amount: amount,
                detail: `Automated spreadsheet import of fuel slip ${billRef}`,
                vendorName: vendorObj,
                billNo: billRef,
                place: place,
                qtyLiters: liters || amount / 92, // assume Rs. 92/ltr average if volume is null
                time: slipTime
              };
              onAddGeneralExpense(parsedSlip);
              importCount++;
            }
          }
        });

        if (importCount > 0) {
          setImportFeedback(`Processed: Synthesized and appended ${importCount} fuel transaction entries into active registers!`);
          setTimeout(() => setImportFeedback(null), 6000);
        } else {
          setImportFeedback("Format Warning: Ensure your columns contain labels such as 'LorryNo', 'Amount', 'Liters' to let AI compile correctly!");
        }
      } catch (err: any) {
        setImportFeedback(`Parsing Failure: ${err.message || 'Check spreadsheet headers'}`);
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleExportStatement = () => {
    if (!activeSummary) return;

    const exportRows = activeTankerExpenses.map(e => ({
      'Transaction ID': e.id,
      'Tanker Plate': e.tankerNumber,
      'Refill Date': e.date,
      'Refill Time': e.time || 'N/A',
      'Filling Station': e.place || 'N/A',
      'Vendor Outlet': e.vendorName || 'N/A',
      'Quantity (Liters)': e.qtyLiters || 0,
      'Total Amount (Rs)': e.amount,
      'Slip Ref No': e.billNo || 'N/A',
      'Notes': e.detail
    }));

    const headers = [
      'Transaction ID', 'Tanker Plate', 'Refill Date', 'Refill Time', 
      'Filling Station', 'Vendor Outlet', 'Quantity (Liters)', 
      'Total Amount (Rs)', 'Slip Ref No', 'Notes'
    ];

    const keys = [
      'Transaction ID', 'Tanker Plate', 'Refill Date', 'Refill Time', 
      'Filling Station', 'Vendor Outlet', 'Quantity (Liters)', 
      'Total Amount (Rs)', 'Slip Ref No', 'Notes'
    ];

    exportToExcel(
      `Diesel Consumption Ledger - ${activeSummary.tanker.tankerNumber}`, 
      headers, 
      keys, 
      exportRows, 
      `Diesel_Consumption_${activeSummary.tanker.tankerNumber}.csv`
    );
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 py-6 text-white selection:bg-[#ff5a5f] selection:text-white">
      
      {/* Immersive Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#30363d] pb-6">
        <div>
          <div className="flex items-center gap-2">
            <Fuel className="w-6 h-6 text-[#ff5a1f]" />
            <h2 className="text-2xl font-black tracking-tight text-white uppercase">Diesel & Fuel Operations</h2>
          </div>
          <p className="text-xs text-[#8b949e] font-mono mt-1">
            TANKER-WISE CONSUMPTION ANALYTICS, REFUELING slips & IMPORTATION/EXPORT UTILITIES
          </p>
        </div>
        
        <div className="flex gap-2 flex-wrap font-sans">
          <button
            onClick={() => setShowBpclModal(true)}
            className="px-4 py-2 bg-[#21262d] border border-[#30363d] hover:bg-[#30363d] text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-yellow-400" />
            AI Sync BPCL Statement
          </button>

          <button
            onClick={() => setShowLogModal(true)}
            className="px-4 py-2.5 bg-gradient-to-r from-[#ff7a4e] to-[#ff5a1f] text-white hover:brightness-110 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer shadow-lg shadow-[#ff5a1f]/15"
          >
            <Plus className="w-4 h-4" />
            Log Fuel Purchase
          </button>
        </div>
      </div>

      {importFeedback && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl text-xs font-mono flex items-center gap-2">
          <Sparkles className="w-4 h-4 animate-bounce text-emerald-400" />
          {importFeedback}
        </div>
      )}

      {/* Fuel Expenditure Trends over Last 6 Months (Recharts Line Chart) */}
      <div className="p-6 bg-[#161b22] border border-[#30363d] rounded-2xl relative overflow-hidden space-y-4 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="text-[10px] text-orange-500 font-mono tracking-widest uppercase font-extrabold flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-orange-400" /> 
              Fleet Intelligent Analytics
            </span>
            <h3 className="text-base font-bold text-white uppercase tracking-tight">
              {selectedTankerId && activeSummary 
                ? `Fuel Expenditure Trend: Tanker ${activeSummary.tanker.tankerNumber}`
                : "Active Fleet Fuel Expenditure Trends"
              }
            </h3>
            <p className="text-xs text-gray-400">
              {selectedTankerId && activeSummary
                ? `Monthly budget spend and volume (Ltr) overview specifically logged for tanker plate ${activeSummary.tanker.tankerNumber}.`
                : "Consolidated monthly fuel acquisition spending and aggregated volume consumption profiles across active vessels."
              }
            </p>
          </div>
          
          <div className="flex items-center gap-3 text-xs font-mono">
            <div className="px-3.5 py-2 bg-[#0d1117] border border-[#30363d] rounded-xl text-right">
              <span className="text-[9px] text-[#8b949e] block uppercase">6M Aggregate Spend</span>
              <strong className="text-emerald-400 font-bold text-xs sm:text-sm">
                Rs. {chartData.reduce((sum, d) => sum + d.amount, 0).toLocaleString()}
              </strong>
            </div>
            <div className="px-3.5 py-2 bg-[#0d1117] border border-[#30363d] rounded-xl text-right">
              <span className="text-[9px] text-[#8b949e] block uppercase">6M Total Refilled</span>
              <strong className="text-blue-400 font-bold text-xs sm:text-sm">
                {chartData.reduce((sum, d) => sum + d.liters, 0).toLocaleString()} Ltr
              </strong>
            </div>
          </div>
        </div>

        {/* Recharts responsive viewports */}
        <div className="h-64 sm:h-72 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={chartData}
              margin={{ top: 10, right: 10, left: -20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#21262d" vertical={false} />
              <XAxis 
                dataKey="label" 
                stroke="#8b949e" 
                fontSize={10} 
                fontFamily="JetBrains Mono, monospace"
                tickLine={false}
              />
              <YAxis 
                stroke="#8b949e" 
                fontSize={10} 
                fontFamily="JetBrains Mono, monospace"
                tickLine={false}
                axisLine={false}
                tickFormatter={(val) => `₹${val >= 1000 ? (val / 1000).toFixed(0) + 'k' : val}`}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#0d1117', 
                  borderColor: '#30363d',
                  borderRadius: '12px',
                  fontSize: '11px',
                  fontFamily: 'JetBrains Mono, monospace'
                }}
                labelStyle={{ color: '#fff', fontWeight: 'bold' }}
                itemStyle={{ paddingBlock: '2px' }}
                formatter={(value: any, name: any) => {
                  if (name === 'amount') return [`₹${Number(value).toLocaleString()}`, 'Total Amount Spent'];
                  if (name === 'liters') return [`${Number(value).toLocaleString()} Liters`, 'Gross Refuel Volume'];
                  return [value, name];
                }}
              />
              <Legend 
                wrapperStyle={{ 
                  fontSize: '10px', 
                  fontFamily: 'JetBrains Mono, monospace',
                  paddingTop: '12px'
                }}
                verticalAlign="bottom"
              />
              <Line 
                name="amount"
                type="monotone" 
                dataKey="amount" 
                stroke="#ff5a1f" 
                strokeWidth={3}
                activeDot={{ r: 6, stroke: '#161b22', strokeWidth: 2 }} 
                dot={{ r: 4, strokeWidth: 1 }}
              />
              <Line 
                name="liters"
                type="monotone" 
                dataKey="liters" 
                stroke="#3b82f6" 
                strokeWidth={2}
                strokeDasharray="4 4"
                activeDot={{ r: 5, stroke: '#161b22', strokeWidth: 2 }}
                dot={{ r: 3, strokeWidth: 1 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Main split dashboard view */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Side: Summary table of all Tankers */}
        <div className={`space-y-4 ${selectedTankerId ? 'lg:col-span-4 hidden lg:block' : 'lg:col-span-12'}`}>
          <div className="flex items-center justify-between gap-4">
            <span className="text-xs font-bold font-mono text-gray-400 uppercase tracking-widest">
              Tanker Fleet Diesels ({tankerFuelSummaries.length})
            </span>
            <div className="relative max-w-xs w-full">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
              <input
                type="text"
                placeholder="Search Tanker..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full text-xs bg-[#0d1117] border border-[#30363d] focus:border-[#ff5a1f] pl-9 pr-3 py-2 rounded-xl text-white outline-none focus:ring-1 focus:ring-[#ff5a1f]/20 font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-1 gap-3">
            {tankerFuelSummaries.map((summary) => {
              const isSelected = selectedTankerId === summary.tanker.id;
              return (
                <div
                  key={summary.tanker.id}
                  onClick={() => setSelectedTankerId(summary.tanker.id)}
                  className={`p-4 rounded-xl border cursor-pointer transition-all flex flex-col justify-between gap-3 ${
                    isSelected 
                      ? 'bg-gradient-to-br from-[#1b1f27] to-[#161b22] border-[#ff5a1f] shadow-lg' 
                      : 'bg-[#161b22] border-[#30363d] hover:bg-[#21262d]'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div className="space-y-0.5">
                      <span className="text-[10px] text-[#8b949e] font-mono tracking-wide uppercase">VESSEL PLATFORM</span>
                      <h4 className="font-bold text-white text-base font-sans flex items-center gap-1.5">
                        <Droplet className={`w-4 h-4 ${summary.totalSpent > 0 ? 'text-[#ff5a1f]' : 'text-gray-500'}`} />
                        {summary.tanker.tankerNumber}
                      </h4>
                    </div>
                    <span className="text-[9px] bg-white/[0.04] text-gray-400 font-mono px-2 py-0.5 rounded-full uppercase border border-white/[0.02]">
                      {summary.expensesCount} Refills
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs font-mono border-t border-white/[0.02] pt-2">
                    <div>
                      <span className="text-[9px] text-[#8b949e] block uppercase">Diesel Liters</span>
                      <strong className="text-white text-xs">{summary.totalLiters.toLocaleString()} Ltr</strong>
                    </div>
                    <div>
                      <span className="text-[9px] text-[#8b949e] block uppercase">Spent (Paid)</span>
                      <strong className="text-emerald-400 text-xs">Rs. {summary.totalSpent.toLocaleString()}</strong>
                    </div>
                  </div>
                </div>
              );
            })}
            
            {tankerFuelSummaries.length === 0 && (
              <div className="p-8 text-center bg-[#161b22] border border-dashed border-[#30363d] rounded-xl text-gray-500 col-span-full">
                <AlertCircle className="w-8 h-8 text-gray-600 mx-auto mb-2" />
                <p className="text-xs">No active tankers discovered with fuel metrics.</p>
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Detail Page for individual tankers */}
        <AnimatePresence mode="wait">
          {selectedTankerId && activeSummary && (
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="lg:col-span-8 space-y-6"
            >
              {/* Back to summarizing button (mainly for responsive grids) */}
              <div className="flex items-center justify-between">
                <button
                  onClick={() => setSelectedTankerId(null)}
                  className="px-3 py-1.5 bg-[#161b22] hover:bg-[#21262d] border border-[#30363d] text-xs font-bold rounded-xl inline-flex items-center gap-1 cursor-pointer transition-all text-white font-mono"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  Back to Summaries
                </button>
                
                <div className="flex gap-2">
                  <button
                    onClick={handleExportStatement}
                    className="px-3 py-1.5 bg-[#1c2128] hover:bg-[#2d333b] border border-[#30363d] text-emerald-400 hover:text-emerald-300 text-xs font-mono font-bold rounded-xl inline-flex items-center gap-1 cursor-pointer"
                    title="Export the Diesel ledger of this Tanker to Excel file"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Export Excel
                  </button>
                  
                  <label className="px-3 py-1.5 bg-[#21262d] hover:bg-[#30363d] border border-[#30363d] text-[#ff7a4e] hover:text-[#ff5a1f] text-xs font-mono font-bold rounded-xl inline-flex items-center gap-1 cursor-pointer">
                    <FileSpreadsheet className="w-3.5 h-3.5" />
                    <span>Import Excel Slips</span>
                    <input
                      type="file"
                      accept=".xlsx, .xls, .csv"
                      onChange={handleExcelImport}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              {/* Tanker Profile Stats Block */}
              <div className="p-6 bg-[#161b22] border border-[#30363d] rounded-2xl relative overflow-hidden space-y-6">
                
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#30363d] pb-5">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-[#ff5a1f]/10 border border-[#ff5a1f]/20 text-[#ff7a4e] rounded-xl">
                      <Fuel className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold font-sans tracking-tight text-white mb-0.5">
                        {activeSummary.tanker.tankerNumber}
                      </h3>
                      <span className="text-[10px] text-gray-500 font-mono tracking-widest uppercase">
                        DIESEL AND COMBUSTION LEDGER HISTORY
                      </span>
                    </div>
                  </div>

                  <div className="text-right font-mono">
                    <span className="text-[10px] text-[#8b949e] block uppercase">Est. Avg. Rate</span>
                    <strong className="text-white text-lg font-bold">Rs. {activeSummary.avgPricePerLiter}/Ltr</strong>
                  </div>
                </div>

                {/* Grid analytics dials */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  <div className="p-3.5 bg-[#0d1117] border border-[#30363d] rounded-xl space-y-1">
                    <span className="text-[9px] text-[#8b949e] font-mono uppercase block">Total Volume Refueled</span>
                    <strong className="text-2xl text-white font-extrabold tracking-tight">
                      {activeSummary.totalLiters.toLocaleString()}
                    </strong>
                    <span className="text-[9px] text-gray-500 font-mono block">Liters (Fuel Oil)</span>
                  </div>

                  <div className="p-3.5 bg-[#0d1117] border border-[#30363d] rounded-xl space-y-1">
                    <span className="text-[9px] text-[#8b949e] font-mono uppercase block">Total Cash Invested</span>
                    <strong className="text-2xl text-emerald-400 font-extrabold tracking-tight">
                      Rs. {activeSummary.totalSpent.toLocaleString()}
                    </strong>
                    <span className="text-[9px] text-gray-500 font-mono block">Paid to Petrol Outlets</span>
                  </div>

                  <div className="p-3.5 bg-[#0d1117] border border-[#30363d] rounded-xl space-y-1 col-span-2 sm:col-span-1">
                    <span className="text-[9px] text-[#8b949e] font-mono uppercase block">Registered Refills</span>
                    <strong className="text-2xl text-blue-400 font-extrabold tracking-tight">
                      {activeSummary.expensesCount}
                    </strong>
                    <span className="text-[9px] text-gray-500 font-mono block">Transaction Slips</span>
                  </div>
                </div>
              </div>

              {/* Transaction Logs Table */}
              <div className="space-y-3">
                <span className="text-xs font-bold font-mono text-gray-400 uppercase tracking-widest block">
                  Chronological Refueling Slip Transaction Reports
                </span>

                <div className="border border-[#30363d] rounded-2xl overflow-hidden bg-[#161b22]">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs font-mono text-white border-collapse">
                      <thead>
                        <tr className="bg-[#1c2128] text-gray-400 uppercase text-[9px] border-b border-[#30363d] tracking-wider">
                          <th className="p-3">Refill Date/Time</th>
                          <th className="p-3">Slip Ref No.</th>
                          <th className="p-3">Place Outlet</th>
                          <th className="p-3">Vendor / Service</th>
                          <th className="p-3 text-right">Qty (Ltr)</th>
                          <th className="p-3 text-right">Amount (Paid)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#30363d]/50 bg-[#161b22]">
                        {activeTankerExpenses.map((slip) => (
                          <tr key={slip.id} className="hover:bg-[#21262d] transition-all">
                            <td className="p-3 whitespace-nowrap">
                              <div className="flex flex-col">
                                <span className="font-bold flex items-center gap-1">
                                  <Calendar className="w-3 h-3 text-[#ff5a1f]" />
                                  {slip.date}
                                </span>
                                <span className="text-[10px] text-gray-500 flex items-center gap-1 mt-0.5">
                                  <Clock className="w-2.5 h-2.5" />
                                  {slip.time || '12:00'}
                                </span>
                              </div>
                            </td>
                            <td className="p-3 text-[#ff7a4e] font-bold">
                              {slip.billNo || <span className="text-gray-600 font-normal">N/A</span>}
                            </td>
                            <td className="p-3">
                              <span className="inline-flex items-center gap-1 bg-[#ff5a1f]/5 border border-[#ff5a1f]/10 text-white px-2 py-0.5 rounded-full text-[10px]">
                                <MapPin className="w-2.5 h-2.5 text-[#ff7a4e]" />
                                {slip.place || 'Highway Pump'}
                              </span>
                            </td>
                            <td className="p-3 text-gray-300 truncate max-w-[150px]">
                              {slip.vendorName || 'General Pump Outlet'}
                            </td>
                            <td className="p-3 text-right font-black text-white">
                              {(slip.qtyLiters || 0).toLocaleString()} L
                            </td>
                            <td className="p-3 text-right font-bold text-emerald-400 whitespace-nowrap">
                              Rs. {slip.amount.toLocaleString()}
                            </td>
                          </tr>
                        ))}

                        {activeTankerExpenses.length === 0 && (
                          <tr>
                            <td colSpan={6} className="p-8 text-center text-gray-500">
                              No refueling records found for this tanker. Use "Log Fuel Purchase" or Excel uploads!
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Trigger Dialog Sheet for Fuel Logging */}
      <AnimatePresence>
        {showLogModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowLogModal(false)}
              className="absolute inset-0 bg-black/85 backdrop-blur-sm"
            />
            
            <motion.div
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              className="relative w-full max-w-lg bg-[#161b22] border border-[#30363d] rounded-2xl overflow-hidden p-6 shadow-2xl space-y-5"
            >
              <div className="flex items-center justify-between border-b border-[#30363d] pb-3">
                <div className="flex items-center gap-2">
                  <Fuel className="w-5 h-5 text-[#ff5a1f]" />
                  <h3 className="text-lg font-bold">Refuel Slip Logging</h3>
                </div>
                <button
                  onClick={() => setShowLogModal(false)}
                  className="p-1 hover:bg-[#21262d] rounded-lg text-gray-400 hover:text-white"
                >
                  &times;
                </button>
              </div>

              <form onSubmit={handleManualLogSubmit} className="space-y-4 text-xs font-mono">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[#8b949e] mb-1.5 uppercase">Select Vessel Tanker</label>
                    <select
                      value={logTankerNumber}
                      onChange={e => setLogTankerNumber(e.target.value)}
                      className="w-full bg-[#0d1117] border border-[#30363d] p-2.5 rounded-lg text-white"
                    >
                      {tankers.map(t => (
                        <option key={t.id} value={t.tankerNumber}>{t.tankerNumber}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[#8b949e] mb-1.5 uppercase">Amount Paid (Rs.)</label>
                    <input
                      type="number"
                      required
                      placeholder="e.g. 15400"
                      value={logAmount}
                      onChange={e => setLogAmount(e.target.value)}
                      className="w-full bg-[#0d1117] border border-[#30363d] p-2.5 rounded-lg text-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[#8b949e] mb-1.5 uppercase">Volume Refueled (Liters)</label>
                    <input
                      type="number"
                      required
                      step="0.01"
                      placeholder="e.g. 165"
                      value={logQty}
                      onChange={e => setLogQty(e.target.value)}
                      className="w-full bg-[#0d1117] border border-[#30363d] p-2.5 rounded-lg text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[#8b949e] mb-1.5 uppercase">Outlet Slip Ref No.</label>
                    <input
                      type="text"
                      placeholder="e.g. SLIP-705"
                      value={logBill}
                      onChange={e => setLogBill(e.target.value)}
                      className="w-full bg-[#0d1117] border border-[#30363d] p-2.5 rounded-lg text-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[#8b949e] mb-1.5 uppercase">Slip Slip Date</label>
                    <input
                      type="date"
                      required
                      value={logDate}
                      onChange={e => setLogDate(e.target.value)}
                      className="w-full bg-[#0d1117] border border-[#30363d] p-2.5 rounded-lg text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[#8b949e] mb-1.5 uppercase">Slip Time</label>
                    <input
                      type="time"
                      required
                      value={logTime}
                      onChange={e => setLogTime(e.target.value)}
                      className="w-full bg-[#0d1117] border border-[#30363d] p-2.5 rounded-lg text-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[#8b949e] mb-1.5 uppercase">Refilling Place / Town</label>
                    <input
                      type="text"
                      placeholder="e.g. Bharuch"
                      value={logPlace}
                      onChange={e => setLogPlace(e.target.value)}
                      className="w-full bg-[#0d1117] border border-[#30363d] p-2.5 rounded-lg text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[#8b949e] mb-1.5 uppercase">Pump Vendor Outlet Name</label>
                    <input
                      type="text"
                      placeholder="e.g. IOCL Highway Town Pump"
                      value={logVendor}
                      onChange={e => setLogVendor(e.target.value)}
                      className="w-full bg-[#0d1117] border border-[#30363d] p-2.5 rounded-lg text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[#8b949e] mb-1.5 uppercase">Refueling Summary remarks (Optional)</label>
                  <textarea
                    placeholder="Provide fuel voucher remarks..."
                    value={logDetail}
                    onChange={e => setLogDetail(e.target.value)}
                    className="w-full bg-[#0d1117] border border-[#30363d] p-2.5 rounded-lg text-white h-20 outline-none"
                  />
                </div>

                <div className="pt-4 flex gap-2">
                  <button
                    type="submit"
                    className="flex-1 py-3 bg-[#ff5a1f] hover:brightness-110 text-white text-xs font-bold rounded-xl cursor-pointer"
                  >
                    Commit Fuel Log
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowLogModal(false)}
                    className="px-5 py-3 bg-[#21262d] hover:bg-[#30363d] text-white text-xs font-bold rounded-xl cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {/* BPCL Statement Sync Modal Overlay */}
        {showBpclModal && (
          <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              className="relative w-full max-w-4xl bg-[#161b22] border border-[#30363d] rounded-2xl overflow-hidden p-6 shadow-2xl space-y-5 text-white"
            >
              <div className="flex items-center justify-between border-b border-[#30363d] pb-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-yellow-400" />
                  <h3 className="text-base font-black uppercase tracking-tight">BPCL Fuel Statement AI Syncer</h3>
                </div>
                <button
                  onClick={() => {
                    setShowBpclModal(false);
                    setBpclParsedRecordList([]);
                    setBpclFeedback(null);
                  }}
                  className="p-1 hover:bg-[#21262d] rounded-lg text-gray-400 hover:text-white text-lg font-bold"
                >
                  &times;
                </button>
              </div>

              <div className="space-y-4">
                <p className="text-xs text-gray-400 leading-normal font-sans uppercase">
                  Excel Statement Syncer parses BPCL official spreadsheets, identifies tanker-wise refueling logs automatically, and associates them with active en-route trips on that date.
                </p>

                {/* File Uploader */}
                <div className="p-6 bg-[#0d1117] border border-[#30363d] rounded-xl text-center space-y-3">
                  <div className="w-12 h-12 rounded-full bg-blue-500/10 text-blue-400 flex items-center justify-center mx-auto">
                    <FileSpreadsheet className="w-6 h-6 text-blue-400" />
                  </div>
                  <div className="space-y-1">
                    <span className="text-xs font-bold text-white block uppercase">Select BPCL Statement spreadsheet (.xlsx / .xls / .csv / .txt)</span>
                    <span className="text-[10px] text-gray-400 block">AI parses and matches logs automatically.</span>
                  </div>

                  <div className="pt-2">
                    <label className="px-4 py-2 bg-[#21262d] hover:bg-[#30363d] border border-[#30363d] rounded-lg text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer text-white">
                      <Download className="w-4 h-4 text-[#ff5a1f]" />
                      Browse Statement File
                      <input 
                        type="file" 
                        accept=".xlsx,.xls,.csv,.txt"
                        className="hidden" 
                        onChange={handleBpclStatementSelection}
                      />
                    </label>
                  </div>
                </div>

                {bpclFeedback && (
                  <div className="p-3.5 bg-blue-500/10 border border-blue-500/20 rounded-xl text-[11.5px] font-mono text-blue-400">
                    {bpclFileLoading && <Loader2 className="w-4 h-4 animate-spin text-blue-400 inline mr-2" />}
                    <span>{bpclFeedback}</span>
                  </div>
                )}

                {/* Parsed results list with mapping checks */}
                {bpclParsedRecordList.length > 0 && (
                  <div className="space-y-3">
                    <span className="text-[10px] font-mono font-black text-gray-400 tracking-wider uppercase block">Extracted Transactions & Trip Mappings:</span>
                    
                    <div className="max-h-[35vh] overflow-y-auto border border-[#30363d] rounded-xl divide-y divide-[#30363d]">
                      {bpclParsedRecordList.map((entry, idx) => {
                        const isChecked = bpclCheckedEntries[idx];
                        const matchedTrip = bpclMatchedTrips[idx];
                        return (
                          <div key={idx} className="p-3 bg-[#0d1117] flex items-center justify-between gap-4 text-xs font-sans">
                            <div className="flex items-center gap-3">
                              <input 
                                type="checkbox"
                                checked={isChecked}
                                onChange={(e) => setBpclCheckedEntries(prev => ({ ...prev, [idx]: e.target.checked }))}
                                className="w-4 h-4 rounded text-orange-500 cursor-pointer"
                              />
                              <div className="space-y-0.5">
                                <div className="flex items-center gap-2">
                                  <strong className="text-white uppercase font-mono text-[11px] bg-white/[0.05] px-1.5 py-0.5 rounded border border-white/[0.03]">{entry.tankerNumber}</strong>
                                  <span className="text-gray-400 text-[10.5px]">{entry.date} at {entry.place || 'Baroda Outlet'}</span>
                                </div>
                                <span className="text-[10px] text-gray-400 block font-mono">Invoice Ref: {entry.billNo || 'N/A'} • Volume: {entry.qtyLiters} Ltr</span>
                              </div>
                            </div>

                            <div className="flex items-center gap-4">
                              {/* Trip match indicator or selector */}
                              <div className="text-right">
                                {matchedTrip ? (
                                  <div className="space-y-0.5">
                                    <span className="text-[9px] bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full uppercase tracking-wider font-mono font-black">
                                      Tripped Assigned: {matchedTrip.lrNo}
                                    </span>
                                    <span className="text-[9.5px] text-gray-500 block">{matchedTrip.placeFrom} to {matchedTrip.placeTo}</span>
                                  </div>
                                ) : (
                                  <span className="text-[9px] bg-amber-500/10 border border-amber-500/20 text-amber-400 px-2 py-0.5 rounded-full uppercase tracking-wider font-mono block">
                                    Regular Ledger (standalone)
                                  </span>
                                )}
                              </div>

                              <strong className="text-emerald-400 font-mono text-xs w-20 text-right shrink-0">Rs. {Number(entry.amount).toLocaleString('en-IN')}</strong>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <p className="text-[10px] text-gray-400 italic">
                      * Standalone entries will be catalogued as regular expenses excluded from voyages, while green entries automatically load directly onto the designated trip balances.
                    </p>

                    <button
                      type="button"
                      onClick={handleExecuteBpclSync}
                      className="w-full py-3 bg-gradient-to-r from-orange-600 to-red-600 hover:brightness-110 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl shadow-lg cursor-pointer transition-all"
                    >
                      ✓ Approve Sync of checked {Object.values(bpclCheckedEntries).filter(Boolean).length} entries with central ledger
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
