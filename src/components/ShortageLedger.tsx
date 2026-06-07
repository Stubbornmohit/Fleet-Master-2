import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  AlertTriangle, DollarSign, Calculator, ChevronDown, ChevronUp, UserCheck, 
  Download, Calendar, Search, HelpCircle, FileText, Settings, BadgeAlert
} from 'lucide-react';
import { Trip } from '../types';

interface ShortageLedgerProps {
  trips: Trip[];
}

export default function ShortageLedger({ trips }: ShortageLedgerProps) {
  const [deductionRateKLOther, setDeductionRateKLOther] = useState<number>(() => {
    const saved = localStorage.getItem('shortage_rate_kl');
    return saved ? parseFloat(saved) : 1200; // Default ₹1200 per KL
  });

  const [deductionRateMTOther, setDeductionRateMTOther] = useState<number>(() => {
    const saved = localStorage.getItem('shortage_rate_mt');
    return saved ? parseFloat(saved) : 1500; // Default ₹1500 per MT
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDriver, setSelectedDriver] = useState<string>('All Drivers');
  const [expandedDriverRow, setExpandedDriverRow] = useState<string | null>(null);

  // Sync rates to localStorage
  useEffect(() => {
    localStorage.setItem('shortage_rate_kl', String(deductionRateKLOther));
  }, [deductionRateKLOther]);

  useEffect(() => {
    localStorage.setItem('shortage_rate_mt', String(deductionRateMTOther));
  }, [deductionRateMTOther]);

  // Only examine completed voyages
  const completedTrips = trips.filter(t => t.status === 'completed');

  // Calculate shortage per trip
  const tripsWithShortage = completedTrips.map(trip => {
    const loading = trip.loadingWeight || 0;
    const unloading = trip.unloadingWeight || loading;
    const shortageVal = Math.max(0, parseFloat((loading - unloading).toFixed(3)));
    
    // Choose rate based on cargo unit
    const rate = trip.qtyUnit === 'KL' ? deductionRateKLOther : deductionRateMTOther;
    const moneyDeduct = shortageVal * rate;

    return {
      ...trip,
      loading,
      unloading,
      shortageVal,
      moneyDeduct,
    };
  });

  // Unique list of drivers active in completed voyages
  const allDriversSet = new Set<string>();
  tripsWithShortage.forEach(t => {
    if (t.driverName) allDriversSet.add(t.driverName);
  });
  const driversList = ['All Drivers', ...Array.from(allDriversSet)];

  // Filtered dataset
  const filteredTrips = tripsWithShortage.filter(t => {
    const matchesSearch = t.driverName.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          t.tankerNumber.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          t.lrNo.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesDriver = selectedDriver === 'All Drivers' || t.driverName === selectedDriver;
    return matchesSearch && matchesDriver;
  });

  // Grouped summary driver-wise
  const driverShortageSummaries = Array.from(allDriversSet).map(driver => {
    const driverTrips = tripsWithShortage.filter(t => t.driverName === driver);
    const tripsCoveredCount = driverTrips.length;
    const totalShortageKL = driverTrips
      .filter(t => t.qtyUnit === 'KL')
      .reduce((sum, t) => sum + t.shortageVal, 0);

    const totalShortageMT = driverTrips
      .filter(t => t.qtyUnit === 'MT')
      .reduce((sum, t) => sum + t.shortageVal, 0);

    const totalDeductionMoney = driverTrips.reduce((sum, t) => sum + t.moneyDeduct, 0);
    const tripsWithShortageCount = driverTrips.filter(t => t.shortageVal > 0).length;

    return {
      driverName: driver,
      tripsCoveredCount,
      tripsWithShortageCount,
      totalShortageKL,
      totalShortageMT,
      totalDeductionMoney,
      tripsList: driverTrips
    };
  }).filter(d => selectedDriver === 'All Drivers' || d.driverName === selectedDriver);

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 py-6 text-white font-sans selection:bg-[#ff5a1f] selection:text-white">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#30363d] pb-6">
        <div>
          <h2 className="text-2xl font-black uppercase tracking-tight flex items-center gap-2">
            <AlertTriangle className="w-7 h-7 text-[#ff5a1f]" />
            Driver Shortage Ledger & Deductions
          </h2>
          <p className="text-xs text-[#8b949e] font-mono mt-1">
            TRACK CARGO UNLOADING VOLUMETRIC SHORTAGES AND COMPENSATE ACCOUNT DEDUCTIONS
          </p>
        </div>
      </div>

      {/* Rates Configurations Card */}
      <div className="bg-[#161b22] border border-[#30363d] p-5 rounded-2xl">
        <h3 className="text-xs font-mono font-extrabold text-[#ff7a4e] uppercase flex items-center gap-1.5 mb-4">
          <Settings className="w-4 h-4" />
          Configurable Shortage Cost Deduction Rates (Admin)
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="block text-gray-400 font-mono text-[10.5px] uppercase">
              Liquid Cargo Shortage rate (per KL) *
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-gray-500 font-bold text-xs">₹</span>
              <input
                type="number"
                min="0"
                value={deductionRateKLOther}
                onChange={(e) => setDeductionRateKLOther(Math.max(0, parseFloat(e.target.value) || 0))}
                className="w-full pl-8 pr-4 py-2.5 bg-[#0d1117] border border-[#30363d] rounded-xl text-white outline-none focus:border-[#ff5a1f] font-mono text-xs font-bold"
                placeholder="Rate per KL"
              />
            </div>
            <p className="text-[10px] text-gray-500 italic">Adjusts shortage charge applied for diesel, chemicals, and liquid contracts measured in KL.</p>
          </div>

          <div className="space-y-2">
            <label className="block text-gray-400 font-mono text-[10.5px] uppercase">
              Dry/Bulk Cargo Shortage rate (per MT) *
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-gray-500 font-bold text-xs">₹</span>
              <input
                type="number"
                min="0"
                value={deductionRateMTOther}
                onChange={(e) => setDeductionRateMTOther(Math.max(0, parseFloat(e.target.value) || 0))}
                className="w-full pl-8 pr-4 py-2.5 bg-[#0d1117] border border-[#30363d] rounded-xl text-white outline-none focus:border-[#ff5a1f] font-mono text-xs font-bold"
                placeholder="Rate per MT"
              />
            </div>
            <p className="text-[10px] text-gray-500 italic">Adjusts shortage deduction charge applied for solid chemicals or fly ash measured in Metric Ton (MT).</p>
          </div>
        </div>
      </div>

      {/* Grid of details */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Side: Grouped Driver Summaries */}
        <div className="lg:col-span-12 space-y-4">
          <div className="bg-[#161b22] border border-[#30363d] p-4 rounded-xl flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <span className="text-xs text-[#8b949e] font-mono whitespace-nowrap">Filter Driver:</span>
              <select 
                value={selectedDriver}
                onChange={(e) => setSelectedDriver(e.target.value)}
                className="bg-[#0d1117] border border-[#30363d] text-white text-xs px-3 py-2 rounded-lg outline-none w-full sm:w-48 font-bold"
              >
                {driversList.map((d, idx) => (
                  <option key={idx} value={d}>{d}</option>
                ))}
              </select>
              <input
                type="text"
                placeholder="Search trip / vehicle..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-[#0d1117] px-3 py-1.5 border border-[#30363d] rounded-xl text-xs outline-none focus:border-[#ff5a1f] w-full sm:w-48 text-white font-sans"
              />
            </div>
            <span className="text-xs text-slate-400 font-mono">
              Aggregated Driver Penalties Table (Month End Books)
            </span>
          </div>

          <div className="bg-[#161b22] border border-[#30363d] rounded-2xl overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#1c222b] border-b border-[#30363d] font-mono text-white text-[10px] uppercase">
                <tr>
                  <th className="py-3 px-4">Driver Name Address</th>
                  <th className="py-3 text-center">Voyages Covered</th>
                  <th className="py-3 text-center text-amber-400">Voyages with Shortage</th>
                  <th className="py-3 text-right">Total Shortage (KL)</th>
                  <th className="py-3 text-right">Total Shortage (MT)</th>
                  <th className="py-3 text-right text-rose-450 text-rose-400 font-black px-4">Est. Money Deduction</th>
                  <th className="py-3 text-center font-bold">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#21262d] font-sans text-white">
                {driverShortageSummaries.map((ds) => {
                  const isExpanded = expandedDriverRow === ds.driverName;
                  return (
                    <React.Fragment key={ds.driverName}>
                      <tr 
                        onClick={() => setExpandedDriverRow(isExpanded ? null : ds.driverName)}
                        className={`hover:bg-[#1b2028]/65 transition-colors cursor-pointer ${isExpanded ? 'bg-amber-500/5' : ''}`}
                      >
                        <td className="py-4 px-4 font-bold text-white flex items-center gap-2">
                          <UserCheck className="w-4 h-4 text-[#ff5a1f]" />
                          {ds.driverName}
                        </td>
                        <td className="py-4 text-center font-mono">
                          {ds.tripsCoveredCount} trips completed
                        </td>
                        <td className="py-4 text-center font-mono text-amber-400 font-semibold">
                          {ds.tripsWithShortageCount} trips
                        </td>
                        <td className="py-4 text-right font-mono font-semibold text-slate-300">
                          {ds.totalShortageKL.toFixed(3)} KL
                        </td>
                        <td className="py-4 text-right font-mono font-semibold text-slate-300">
                          {ds.totalShortageMT.toFixed(3)} MT
                        </td>
                        <td className="py-4 text-right font-mono font-black text-rose-400 text-sm px-4">
                          ₹{ds.totalDeductionMoney.toLocaleString('en-IN', { maximumFractionDigits: 1 })}
                        </td>
                        <td className="py-4 text-center">
                          <span className="inline-flex items-center text-cyan-400 font-mono text-[10.5px] hover:underline font-bold">
                            {isExpanded ? (
                              <>Collapse <ChevronUp className="w-3.5 h-3.5 ml-1" /></>
                            ) : (
                              <>Inspect Voyages <ChevronDown className="w-3.5 h-3.5 ml-1" /></>
                            )}
                          </span>
                        </td>
                      </tr>

                      {/* Expanded Sub table of individual voyages for this driver */}
                      <AnimatePresence>
                        {isExpanded && (
                          <tr>
                            <td colSpan={7} className="p-4 bg-black/30 border-y border-[#30363d]">
                              <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="space-y-2 overflow-hidden text-xs"
                              >
                                <h4 className="text-[10px] font-mono font-black text-[#ff7a4e] uppercase uppercase tracking-wider mb-2.5">
                                  📋 TRIP-WISE DISPATCH AUDIT LOG ({ds.driverName})
                                </h4>
                                
                                <div className="overflow-x-auto rounded-xl border border-[#30363d]">
                                  <table className="w-full text-left text-[11px] bg-neutral-900/60 divide-y divide-[#21262d]">
                                    <thead className="bg-[#11161d] font-mono text-slate-400 text-[9px] uppercase">
                                      <tr>
                                        <th className="py-2.5 px-3">Date Finished</th>
                                        <th className="py-2.5">LR Number</th>
                                        <th className="py-2.5">Tanker number</th>
                                        <th className="py-2.5 text-right">Loading Weight</th>
                                        <th className="py-2.5 text-right">Unloading Weight</th>
                                        <th className="py-2.5 text-right text-amber-400">Shortage</th>
                                        <th className="py-2.5 text-right text-rose-450 text-rose-400 px-3">Shortage deduction</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-[#21262d] font-sans text-white">
                                      {ds.tripsList.map((trip) => (
                                        <tr key={trip.id} className="hover:bg-white/[0.02]">
                                          <td className="py-3 px-3 font-mono text-gray-400">{trip.endDate || trip.startDate}</td>
                                          <td className="py-3 font-bold font-mono text-orange-400">{trip.lrNo}</td>
                                          <td className="py-3 font-semibold font-mono text-zinc-300">{trip.tankerNumber}</td>
                                          <td className="py-3 text-right font-mono">{trip.loading} {trip.qtyUnit}</td>
                                          <td className="py-3 text-right font-mono">{trip.unloading} {trip.qtyUnit}</td>
                                          <td className="py-3 text-right font-mono text-amber-400 font-bold">
                                            {trip.shortageVal > 0 ? (
                                              <span>{trip.shortageVal.toFixed(3)} {trip.qtyUnit}</span>
                                            ) : (
                                              <span className="text-emerald-500 font-semibold">0.000 (No Loss)</span>
                                            )}
                                          </td>
                                          <td className="py-3 text-right font-mono font-bold text-rose-400 px-3">
                                            ₹{trip.moneyDeduct.toLocaleString('en-IN', { maximumFractionDigits: 1 })}
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              </motion.div>
                            </td>
                          </tr>
                        )}
                      </AnimatePresence>
                    </React.Fragment>
                  );
                })}

                {driverShortageSummaries.length === 0 && (
                  <tr>
                    <td colSpan={7} className="text-center py-12 italic text-gray-500">
                      No finished driver trip shortage records found under active books.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
