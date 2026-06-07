import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  FileText, Plus, CheckCircle, Printer, Download, CreditCard, Play, Eye, 
  Trash2, Filter, Calculator, HelpCircle, ArrowLeft, ChevronRight, RefreshCw, X
} from 'lucide-react';
import { Trip, LorryReceipt } from '../types';

interface FreightBillsProps {
  trips: Trip[];
  lrs: LorryReceipt[];
}

interface ActiveFreightBill {
  id: string;
  invoiceNo: string;
  invoiceDate: string;
  partyName: string;
  selectedTripIds: string[];
  grandTotal: number;
  qtySum: number;
  product: string;
  narration: string;
  hasAnnexure: boolean;
}

export default function FreightBills({ trips, lrs }: FreightBillsProps) {
  // Local list of generated freights in localStorage to persist user's work
  const [freightBills, setFreightBills] = useState<ActiveFreightBill[]>(() => {
    const saved = localStorage.getItem('company_freight_bills');
    return saved ? JSON.parse(saved) : [];
  });

  const saveFreightBills = (newBills: ActiveFreightBill[]) => {
    setFreightBills(newBills);
    localStorage.setItem('company_freight_bills', JSON.stringify(newBills));
  };

  // Form states to create a brand new bill
  const [selectedParty, setSelectedParty] = useState('');
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
  const [invoiceNo, setInvoiceNo] = useState(() => `FRT-2026-${Math.floor(1000 + Math.random() * 9000)}`);
  const [selectedTripIds, setSelectedTripIds] = useState<string[]>([]);
  const [customNarration, setCustomNarration] = useState('');

  // Mode state: 'list' | 'create' | 'preview'
  const [viewMode, setViewMode] = useState<'list' | 'create'>('list');
  const [selectedPreviewBill, setSelectedPreviewBill] = useState<ActiveFreightBill | null>(null);

  // Custom non-blocking confirm state
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

  // Completed trips
  const completedTrips = trips.filter(t => t.status === 'completed');

  // Parties set for selection
  const partiesSet = new Set<string>();
  lrs.forEach(l => {
    if (l.consignerName) partiesSet.add(l.consignerName);
    if (l.consigneeName) partiesSet.add(l.consigneeName);
  });
  const partiesList = Array.from(partiesSet);

  // Trips available for the selected party
  const availableTripsForParty = completedTrips.filter(t => {
    const lr = lrs.find(l => l.id === t.lrId);
    return lr && (lr.consignerName === selectedParty || lr.consigneeName === selectedParty);
  });

  const handleTripSelectionToggle = (tripId: string) => {
    setSelectedTripIds(prev => 
      prev.includes(tripId) ? prev.filter(id => id !== tripId) : [...prev, tripId]
    );
  };

  const handleSelectAllTrips = () => {
    if (selectedTripIds.length === availableTripsForParty.length) {
      setSelectedTripIds([]);
    } else {
      setSelectedTripIds(availableTripsForParty.map(t => t.id));
    }
  };

  const generateFreightBill = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedParty || selectedTripIds.length === 0) {
      alert("Please choose a party and verify at least one trip voyage registry!");
      return;
    }

    const linkedTrips = completedTrips.filter(t => selectedTripIds.includes(t.id));
    const qtySum = linkedTrips.reduce((sum, t) => sum + (t.unloadingWeight || t.loadingWeight || 0), 0);
    const firstTrip = linkedTrips[0];
    const product = lrs.find(l => l.id === firstTrip?.lrId)?.product || 'Chemical / High Speed Diesel';

    // Calculate total freight revenue sum
    const grandTotal = linkedTrips.reduce((sum, t) => sum + (t.revenue || 0), 0);

    const hasAnnexure = linkedTrips.length > 1;

    let narratedInfo = customNarration;
    if (!hasAnnexure) {
      const singleTrip = linkedTrips[0];
      const associatedLr = lrs.find(l => l.id === singleTrip.lrId);
      narratedInfo += ` [Voyage Details: LR: ${singleTrip.lrNo} | Route: ${singleTrip.placeFrom} to ${singleTrip.placeTo} | Product: ${associatedLr?.product} | Qty: ${singleTrip.unloadingWeight || singleTrip.loadingWeight} ${singleTrip.qtyUnit} | Rate: ₹${singleTrip.freightRateAtEnd || 'N/A'}]`;
    }

    const newBill: ActiveFreightBill = {
      id: `FB-${Date.now()}`,
      invoiceNo,
      invoiceDate,
      partyName: selectedParty,
      selectedTripIds,
      grandTotal,
      qtySum,
      product,
      narration: narratedInfo,
      hasAnnexure
    };

    const updated = [newBill, ...freightBills];
    saveFreightBills(updated);

    // Reset Form and go back to list
    setSelectedParty('');
    setSelectedTripIds([]);
    setInvoiceNo(`FRT-2026-${Math.floor(1000 + Math.random() * 9000)}`);
    setCustomNarration('');
    setViewMode('list');
    setSelectedPreviewBill(newBill); // Open print preview automatically!
  };

  const deleteFreightBill = (id: string, invoiceNo: string) => {
    triggerConfirm(
      "Confirm Delete Invoice",
      `Are you sure you want to delete Freight Invoice ${invoiceNo}?`,
      () => {
        const updated = freightBills.filter(f => f.id !== id);
        saveFreightBills(updated);
      }
    );
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 py-6 text-white font-sans selection:bg-[#ff5a1f] selection:text-white print:bg-white print:text-black">
      
      {/* Hide controls on Print */}
      <div className="print:hidden">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#30363d] pb-6 mb-6">
          <div>
            <h2 className="text-2xl font-black uppercase tracking-tight flex items-center gap-2">
              <FileText className="w-7 h-7 text-[#ff5a1f]" />
              Freight Invoice Billing Desk
            </h2>
            <p className="text-xs text-[#8b949e] font-mono mt-1">
              GENERATE PROFESSIONAL PARTY BILLS & ANNEXURES FOR SINGLE OR MULTIPLE MONTHLY VOYAGES
            </p>
          </div>
          <div>
            {viewMode === 'list' ? (
              <button
                onClick={() => setViewMode('create')}
                className="px-4 py-2 bg-[#ff5a1f] hover:bg-[#e0450d] text-white text-xs font-bold rounded-xl cursor-pointer transition-all flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                Draft New Freight Bill
              </button>
            ) : (
              <button
                onClick={() => setViewMode('list')}
                className="px-4 py-2 bg-[#21262d] border border-[#30363d] text-gray-400 hover:text-white text-xs font-bold rounded-xl cursor-pointer transition-all flex items-center gap-1"
              >
                <ArrowLeft className="w-4 h-4" />
                Cancel and View Bills
              </button>
            )}
          </div>
        </div>
      </div>

      <AnimatePresence mode="wait">
        
        {/* VIEW MODE: LISTS DIRECT INVOICES */}
        {viewMode === 'list' && !selectedPreviewBill && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-6 print:hidden"
          >
            <div className="bg-[#161b22] border border-[#30363d] p-6 rounded-2xl">
              <h3 className="text-xs font-mono font-extrabold text-[#ff7a4e] uppercase mb-4 tracking-wider">
                📄 Historical Freight Billings Registry
              </h3>

              {freightBills.length === 0 ? (
                <div className="p-16 text-center bg-[#0d1117] border border-[#30363d] rounded-xl space-y-3">
                  <FileText className="w-12 h-12 text-gray-600 mx-auto" />
                  <p className="text-sm font-bold text-white text-center">No Freight Invoices Generated Yet</p>
                  <p className="text-xs text-gray-400">Select voyages and draft custom party bills with single tap click.</p>
                  <button
                    onClick={() => setViewMode('create')}
                    className="mt-4 px-4 py-2 bg-[#ff5a1f] text-white text-xs font-bold rounded-lg uppercase"
                  >
                    Draft First Invoice
                  </button>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-[#30363d]">
                  <table className="w-full text-left text-xs text-gray-400">
                    <thead className="bg-[#1c222b] text-[#8b949e] font-mono text-[10px] uppercase">
                      <tr>
                        <th className="py-3 px-4">Invoice No</th>
                        <th className="py-3">Created Date</th>
                        <th className="py-3">Consigner Party Billed</th>
                        <th className="py-3 text-center">trips count</th>
                        <th className="py-3 text-right">Invoiced Qty</th>
                        <th className="py-3 text-right text-emerald-450">total Freight value</th>
                        <th className="py-3 text-center font-bold px-4">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#21262d] font-sans text-white">
                      {freightBills.map((bill) => (
                        <tr key={bill.id} className="hover:bg-[#1b2028]/40">
                          <td className="py-4 px-4 font-bold font-mono text-cyan-400">{bill.invoiceNo}</td>
                          <td className="py-3 font-mono text-[#8b949e]">{bill.invoiceDate}</td>
                          <td className="py-3 font-semibold text-white">{bill.partyName}</td>
                          <td className="py-3 text-center font-mono">
                            <span className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                              bill.hasAnnexure ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' : 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                            }`}>
                              {bill.selectedTripIds.length} Trips {bill.hasAnnexure ? '(Annexure)' : '(Direct)'}
                            </span>
                          </td>
                          <td className="py-3 text-right font-mono font-bold text-slate-300">
                            {bill.qtySum.toLocaleString()} MT/KL
                          </td>
                          <td className="py-3 text-right font-mono font-black text-emerald-400 text-sm">
                            ₹{bill.grandTotal.toLocaleString('en-IN')}
                          </td>
                          <td className="py-3 px-4 flex justify-center gap-2">
                            <button
                              onClick={() => setSelectedPreviewBill(bill)}
                              className="px-2.5 py-1 bg-cyan-500/10 hover:bg-cyan-500 text-cyan-400 hover:text-white rounded text-[10px] font-bold font-mono cursor-pointer transition-all flex items-center gap-1"
                              title="Preview Freight Invoice Voucher"
                            >
                              <Eye className="w-3.5 h-3.5" /> View
                            </button>
                            <button
                              onClick={() => deleteFreightBill(bill.id, bill.invoiceNo)}
                              className="px-2.5 py-1 bg-rose-500/10 hover:bg-rose-500 text-rose-400 hover:text-white rounded text-[10px] font-bold font-mono cursor-pointer transition-all flex items-center gap-1"
                              title="Delete Invoice"
                            >
                              <Trash2 className="w-3.5 h-3.5" /> Trash
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* CREATE MODE: WORKSTATION TO GENERATE INVOICES */}
        {viewMode === 'create' && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="space-y-6 print:hidden"
          >
            <form onSubmit={generateFreightBill} className="grid grid-cols-1 lg:grid-cols-12 gap-8 text-xs">
              
              {/* Form Input parameters */}
              <div className="lg:col-span-4 bg-[#161b22] border border-[#30363d] p-6 rounded-2xl space-y-4 h-fit text-left">
                <h3 className="text-xs font-mono font-extrabold text-[#ff7a4e] uppercase border-b border-white/[0.04] pb-2 text-left">
                  🛠️ Billing Parameters Configuration Table
                </h3>

                <div className="space-y-1.5">
                  <label className="block text-gray-400 font-mono text-[10px] uppercase">Invoice number plate *</label>
                  <input
                    type="text"
                    required
                    value={invoiceNo}
                    onChange={(e) => setInvoiceNo(e.target.value)}
                    className="w-full px-4 py-2.5 bg-[#0d1117] border border-[#30363d] rounded-xl text-white outline-none focus:border-[#ff5a1f] font-mono font-black"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-gray-400 font-mono text-[10px] uppercase">Invoice processing Date *</label>
                  <input
                    type="date"
                    required
                    value={invoiceDate}
                    onChange={(e) => setInvoiceDate(e.target.value)}
                    className="w-full px-4 py-2.5 bg-[#0d1117] border border-[#30363d] rounded-xl text-white outline-none focus:border-[#ff5a1f]"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-gray-400 font-mono text-[10px] uppercase">Choose party to Bill *</label>
                  <select
                    required
                    value={selectedParty}
                    onChange={(e) => {
                      setSelectedParty(e.target.value);
                      setSelectedTripIds([]); // reset trip selections on party swap
                    }}
                    className="w-full px-4 py-2.5 bg-[#0d1117] border border-[#30363d] rounded-xl text-white outline-none focus:border-[#ff5a1f] font-bold"
                  >
                    <option value="">-- Click to select party --</option>
                    {partiesList.map((p, idx) => (
                      <option key={idx} value={p}>{p}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-gray-400 font-mono text-[10px] uppercase">Invoice Narration (Notes)</label>
                  <textarea
                    rows={2}
                    value={customNarration}
                    onChange={(e) => setCustomNarration(e.target.value)}
                    placeholder="Enter bill remarks or special instruction ledger narrations..."
                    className="w-full px-4 py-2.5 bg-[#0d1117] border border-[#30363d] rounded-xl text-white outline-none focus:border-[#ff5a1f]"
                  />
                </div>

                <div className="pt-3">
                  <button
                    type="submit"
                    disabled={selectedTripIds.length === 0}
                    className={`w-full py-3 rounded-xl font-bold uppercase transition-all shadow-md  ${
                      selectedTripIds.length > 0
                        ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white cursor-pointer hover:brightness-110'
                        : 'bg-neutral-800 border border-neutral-700 text-gray-500 cursor-not-allowed'
                    }`}
                  >
                    Generate Freight Invoice
                  </button>
                </div>
              </div>

              {/* Voyage Selector list */}
              <div className="lg:col-span-8 bg-[#161b22] border border-[#30363d] p-6 rounded-2xl text-left space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#30363d] pb-3">
                  <div>
                    <h4 className="text-sm font-black text-white uppercase tracking-wider">Voyage log selection Grid</h4>
                    <p className="text-xs text-[#8b949e]">Select the completed fleet trips below to bundle into this freight invoice.</p>
                  </div>
                  {availableTripsForParty.length > 0 && (
                    <button
                      type="button"
                      onClick={handleSelectAllTrips}
                      className="text-xs text-[#ff7c4f] hover:text-white font-mono font-bold"
                    >
                      {selectedTripIds.length === availableTripsForParty.length ? 'DESELECT ALL' : 'SELECT ALL VOYAGES'}
                    </button>
                  )}
                </div>

                {!selectedParty ? (
                  <p className="text-xs italic text-gray-500 text-center py-20">Select a party from the dropdown on left panel to load completed voyages.</p>
                ) : availableTripsForParty.length === 0 ? (
                  <p className="text-xs italic text-[#ff5a5f] bg-[#ff5a5f]/5 border border-[#ff5a5f]/10 p-5 rounded-xl text-center">
                    No unbilled completed trips recorded for ({selectedParty}) under the active logistics database registers.
                  </p>
                ) : (
                  <div className="space-y-3.5 max-h-[500px] overflow-y-auto pr-1">
                    {availableTripsForParty.map((trip) => {
                      const lr = lrs.find(l => l.id === trip.lrId);
                      const isChecked = selectedTripIds.includes(trip.id);
                      return (
                        <div
                          key={trip.id}
                          onClick={() => handleTripSelectionToggle(trip.id)}
                          className={`p-4 rounded-xl border transition-all flex items-center justify-between gap-4 cursor-pointer select-none ${
                            isChecked
                              ? 'bg-[#1b251f] border-emerald-500/35 text-white'
                              : 'bg-[#0d1117] border-[#30363d] text-gray-300 hover:border-[#ff5a1f]/30'
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => {}} // handled by click parent
                              className="mt-1 accent-[#ff5a1f]"
                            />
                            <div>
                              <div className="flex items-center gap-2 text-[10.5px]">
                                <span className="font-mono font-bold text-orange-400">LR No: {trip.lrNo}</span>
                                <span className="text-[#8b949e] font-mono">Date: {trip.endDate || trip.startDate}</span>
                              </div>
                              <h5 className="font-medium text-white text-[11.5px] mt-1 uppercase">Route: {trip.placeFrom} to {trip.placeTo}</h5>
                              <p className="text-xs text-gray-400 font-mono">Product: {lr?.product} | Quantity: {trip.unloadingWeight || trip.loadingWeight} {trip.qtyUnit}</p>
                            </div>
                          </div>
                          
                          <div className="text-right">
                            <strong className="block text-emerald-400 font-mono text-sm">₹{(trip.revenue || 0).toLocaleString()}</strong>
                            <span className="text-[9px] text-gray-500 font-mono">Rate: ₹{trip.freightRateAtEnd || lr?.freightRate}/UNIT</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </form>
          </motion.div>
        )}

      </AnimatePresence>

      {/* PREVIEW COMPONENT: LIVE DIGITAL FREIGHT BILL & ANNEXURE */}
      {selectedPreviewBill && (
        <div className="space-y-6 pt-4 text-left animate-fade-in">
          
          {/* Back toolbar - hidden during print */}
          <div className="flex items-center justify-between bg-[#161b22] border border-[#30363d] p-4 rounded-xl print:hidden text-xs">
            <button
              onClick={() => setSelectedPreviewBill(null)}
              className="px-3.5 py-1.5 bg-[#0d1117] hover:bg-[#21262d] border border-[#30363d] text-white rounded-lg font-bold flex items-center gap-1 cursor-pointer transition-all"
            >
              ← Back to Invoices
            </button>
            <div className="flex gap-2">
              <button
                onClick={handlePrint}
                className="px-4 py-1.5 bg-[#ff5a1f] hover:bg-[#e0450d] text-white rounded-lg font-bold flex items-center gap-1.5 cursor-pointer transition-all"
              >
                <Printer className="w-4 h-4" /> Print / Save PDF
              </button>
            </div>
          </div>

          {/* PRINTABLE BILL SHEET PANEL */}
          <div className="bg-[#12161a] border border-[#30363d] p-8 rounded-3xl shadow-2xl space-y-8 max-w-4xl mx-auto print:bg-white print:text-black print:border-none print:shadow-none print:p-0">
            
            {/* INVOICE BANNER */}
            <div className="flex justify-between items-start border-b border-[#30363d] pb-6 print:border-black">
              <div>
                <h1 className="text-xl font-black uppercase text-white print:text-black">BARODA PETRO-LOGISTICS PVT. LTD.</h1>
                <p className="text-[10px] font-mono text-[#8b949e] print:text-slate-600 mt-1 uppercase">GIDC bypass gate, Ranoli industrial complex, Gujarat, National Carrier lic. #PESO-39501</p>
                <p className="text-[10.5px] text-[#8b949e] print:text-slate-600 font-mono uppercase">GSTIN: 24AAAPC1994V1Z2 | PAN: AAAPC1994V</p>
              </div>
              <div className="text-right">
                <span className="text-xs bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 print:text-black font-mono font-black px-3 py-1 rounded-md uppercase tracking-wider text-[11px]">Freight invoice</span>
                <p className="font-mono text-xs font-bold text-white print:text-black mt-2.5">Invoice No: {selectedPreviewBill.invoiceNo}</p>
                <p className="font-mono text-[11px] text-gray-400 print:text-slate-600">Dated: {selectedPreviewBill.invoiceDate}</p>
              </div>
            </div>

            {/* Billed Party Address and Narrative Section */}
            <div className="grid grid-cols-2 gap-6 bg-[#0d1117] print:bg-slate-100 p-5 rounded-2xl border border-white/[0.02] print:border-black text-xs">
              <div>
                <h5 className="font-mono font-extrabold text-orange-400 print:text-black uppercase text-[10px] tracking-wider mb-2">Billed To (Consignee Party)</h5>
                <strong className="text-sm font-black text-white print:text-black uppercase">{selectedPreviewBill.partyName}</strong>
                <p className="text-gray-400 print:text-slate-600 mt-1">GIDC Chemical Manufacturing Yard Terminal, Gujarat, India</p>
              </div>
              <div>
                <h5 className="font-mono font-extrabold text-[#8b949e] print:text-black uppercase text-[10px] tracking-wider mb-2">Invoice Narrative & Remarks</h5>
                <p className="text-gray-300 print:text-slate-700 leading-relaxed font-sans mt-1">{selectedPreviewBill.narration || "No supplementary invoice narration listed."}</p>
              </div>
            </div>

            {/* Ledger Line summary */}
            <div className="space-y-3">
              <h4 className="text-[10.5px] font-mono font-black uppercase tracking-wider text-[#ff7a4e]">Bill Voucher Account Summary</h4>
              <div className="overflow-x-auto rounded-xl border border-[#30363d] print:border-black">
                <table className="w-full text-left text-xs bg-black/20 print:bg-white text-gray-300 print:text-black">
                  <thead className="bg-[#1c222b] print:bg-slate-200 text-slate-400 print:text-black font-mono text-[9px] uppercase">
                    <tr>
                      <th className="py-2.5 px-3">Cargo product specification</th>
                      <th className="py-2.5 text-center">trips bundled</th>
                      <th className="py-2.5 text-right">Invoiced quantity</th>
                      <th className="py-2.5 text-right px-3">Grand Total Freight Ledger</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#21262d] print:divide-black text-white print:text-black">
                    <tr>
                      <td className="py-3.5 px-3 font-semibold">{selectedPreviewBill.product}</td>
                      <td className="py-3.5 text-center font-bold font-mono">{selectedPreviewBill.selectedTripIds.length} voyages</td>
                      <td className="py-3.5 text-right font-mono text-zinc-300 print:text-black">{selectedPreviewBill.qtySum.toLocaleString()} MT/KL</td>
                      <td className="py-3.5 text-right font-mono font-black text-emerald-400 print:text-black text-sm px-3">
                        ₹{selectedPreviewBill.grandTotal.toLocaleString('en-IN')}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* ANNEXURE TO VOUCH DETAILS IF > 1 TRIP */}
            {selectedPreviewBill.hasAnnexure && (
              <div className="space-y-3 pt-6 border-t border-dashed border-[#30363d] print:border-black print:pt-6">
                <div className="flex justify-between items-center bg-zinc-900 print:bg-slate-100 p-3 rounded-lg border border-[#30363d] print:border-black mb-1.5">
                  <h3 className="text-[11px] font-mono font-black text-indigo-400 print:text-black uppercase">ANNEXURE - DETAILED OPERATIONAL FREIGHT LOG</h3>
                  <span className="text-[8px] font-mono px-2 py-0.5 bg-indigo-500/10 text-indigo-400 print:text-black rounded border border-indigo-500/20 uppercase tracking-widest font-bold">ANNEXURE ACTIVE</span>
                </div>
                
                <div className="overflow-x-auto rounded-xl border border-[#30363d] print:border-black">
                  <table className="w-full text-left text-[11px] bg-black/15 print:bg-white text-gray-300 print:text-black">
                    <thead className="bg-[#11141a] print:bg-slate-200 text-[#8b949e] print:text-black font-mono text-[8px] uppercase">
                      <tr>
                        <th className="py-2 px-3">LR docket</th>
                        <th className="py-2">Vehicle</th>
                        <th className="py-2">Product</th>
                        <th className="py-2 text-right">Qty</th>
                        <th className="py-2">Route From</th>
                        <th className="py-2">Route To</th>
                        <th className="py-2 text-right">Freight Rate</th>
                        <th className="py-2 text-right px-3">Sub Freight (INR)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#21262d] print:divide-black font-sans">
                      {completedTrips
                        .filter(t => selectedPreviewBill.selectedTripIds.includes(t.id))
                        .map((t, idx) => {
                          const lr = lrs.find(l => l.id === t.lrId);
                          return (
                            <tr key={idx} className="hover:bg-white/[0.01]">
                              <td className="py-2.5 px-3 font-mono text-orange-400 font-bold">{t.lrNo}</td>
                              <td className="py-2.5 font-mono text-white print:text-black font-semibold">{t.tankerNumber}</td>
                              <td className="py-2.5 max-w-[100px] truncate" title={lr?.product}>{lr?.product}</td>
                              <td className="py-2.5 text-right font-mono">{t.unloadingWeight || t.loadingWeight} {t.qtyUnit}</td>
                              <td className="py-2.5 max-w-[90px] truncate" title={t.placeFrom}>{t.placeFrom}</td>
                              <td className="py-2.5 max-w-[90px] truncate" title={t.placeTo}>{t.placeTo}</td>
                              <td className="py-2.5 text-right font-mono">₹{t.freightRateAtEnd || lr?.freightRate}</td>
                              <td className="py-2.5 text-right font-mono font-bold text-white print:text-black px-3">₹{(t.revenue || 0).toLocaleString()}</td>
                            </tr>
                          );
                        })}
                      {/* Grand sum row for annexure */}
                      <tr className="bg-zinc-900/50 print:bg-slate-100 font-bold border-t border-[#30363d] print:border-black">
                        <td colSpan={7} className="py-3 px-3 text-right text-gray-400 print:text-black font-semibold font-mono text-[9.5px]">CUMULATIVE COMBINED GRAND TOTAL:</td>
                        <td className="py-3 text-right font-mono text-emerald-400 print:text-black font-black text-sm px-3">
                          ₹{selectedPreviewBill.grandTotal.toLocaleString('en-IN')}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Signatures & Bottom instructions panel */}
            <div className="grid grid-cols-2 gap-8 pt-8 border-t border-dashed border-[#30363d] print:border-black text-[10.5px]/relaxed text-gray-400 print:text-slate-700 leading-relaxed font-mono">
              <div>
                <p className="uppercase font-bold text-slate-300 print:text-black">Standard Payment Directions:</p>
                <p className="mt-1 text-[9.5px]">Please issue all draft checks or RTGS fund transfers payable to: "BARODA PETRO-LOGISTICS PRIVATE LIMITED". Payable within 15 bank business working days.</p>
              </div>
              <div className="text-right flex flex-col justify-end items-end space-y-6">
                <div className="border-b border-gray-600 print:border-black pb-2 px-10">
                  {/* Visual blank spot for Seal stamp */}
                  <span className="text-[8px] text-gray-500 print:text-slate-600 block uppercase italic tracking-wider">Authorized Officer Stamp Signature</span>
                </div>
                <strong className="text-xs font-black text-white print:text-black font-sans uppercase">Account Officer Audit Desk</strong>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Custom non-blocking confirmation dialog */}
      {confirmDialog && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 print:hidden">
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
                className="px-4 py-2 bg-red-650 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                Confirm Delete
              </button>
            </div>
          </motion.div>
        </div>
      )}

    </div>
  );
}
