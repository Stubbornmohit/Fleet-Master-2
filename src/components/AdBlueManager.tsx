import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  Droplet, Plus, Calendar, ShieldCheck, 
  TrendingUp, AlertTriangle, Search, Printer, CheckCircle, BarChart2,
  Download
} from 'lucide-react';
import { exportToExcel, exportToPDF } from '../utils/exportUtils';
import { Tanker, Trip, TankerExpense } from '../types';

interface AdBlueManagerProps {
  tankers: Tanker[];
  trips: Trip[];
  expenses: TankerExpense[];
  onAddGeneralExpense: (expense: TankerExpense) => void;
}

export default function AdBlueManager({ tankers, trips, expenses, onAddGeneralExpense }: AdBlueManagerProps) {
  const [showRefillModal, setShowRefillModal] = useState(false);
  const [selectedTankerId, setSelectedTankerId] = useState('');
  const [refillLiters, setRefillLiters] = useState<number>(20);
  const [ratePerLiter, setRatePerLiter] = useState<number>(90); // default average adblue price is 90 Rs/L in India
  const [stationName, setStationName] = useState('');
  const [refillDate, setRefillDate] = useState(new Date().toISOString().substring(0, 10));

  // Ledger related states for tracking AdBlue Dealer Accounts
  const [adblueVendorSelect, setAdblueVendorSelect] = useState('');
  const [adblueCustomVendorName, setAdblueCustomVendorName] = useState('');
  const [adblueBillNo, setAdblueBillNo] = useState('');
  const [adbluePlaceSelect, setAdbluePlaceSelect] = useState('Ranoli');
  const [adblueCustomPlace, setAdblueCustomPlace] = useState('');
  const [adbluePaymentStatus, setAdbluePaymentStatus] = useState<'pending' | 'collected'>('collected');

  // Search input to filter tankers
  const [searchTanker, setSearchTanker] = useState('');

  // Extract AdBlue entries from expenses and trips
  const adblueExpenses = expenses.filter(e => e.category === 'adblue');

  // Multi-tier calculations for tanker analytics
  const tankerAnalytics = tankers.map(tanker => {
    // 1. Get all completed trips for this tanker
    const tankerTrips = trips.filter(t => t.tankerId === tanker.id && t.status === 'completed');
    
    // 2. Sum up kilometers and fuel consumed in trips
    const totalKm = tankerTrips.reduce((sum, t) => sum + (t.approxDistanceKm || 0), 0);
    const totalTripFuel = tankerTrips.reduce((sum, t) => {
      const avg = t.qtyUnit === 'KL' ? 5 : 3; // expected averages
      return sum + (t.approxDistanceKm / avg);
    }, 0);

    // 3. Sum up AdBlue from trips
    const tripAdBlueCost = tankerTrips.reduce((sum, t) => sum + (t.adblueExpense || 0), 0);
    const tripAdBlueLiters = tankerTrips.reduce((sum, t) => sum + (t.adblueAddedLiters || 0), 0);

    // 4. Sum up adblue from general/unlinked expenses
    const fallbackAdblueExpenses = adblueExpenses.filter(e => e.tankerId === tanker.id);
    const standaloneAdBlueCost = fallbackAdblueExpenses.reduce((sum, e) => sum + e.amount, 0);
    
    // Convert standalone amount to liters (either parsed from detail or calculated at standard 90 Rs/L)
    const standaloneAdblueLiters = fallbackAdblueExpenses.reduce((sum, e) => {
      // Look for custom liters pattern in details (e.g., "Refilled 25L")
      const matches = e.detail.match(/(\d+(\.\d+)?)\s*(L|Liters|Ltr)/i);
      if (matches && matches[1]) {
        return sum + parseFloat(matches[1]);
      }
      return sum + (e.amount / 90);
    }, 0);

    const aggregateCost = tripAdBlueCost + standaloneAdBlueCost;
    const aggregateLiters = tripAdBlueLiters + standaloneAdblueLiters;

    // Diesel to AdBlue Ratio analysis: BS6 diesel vehicles consume 4% to 6% AdBlue relative to Diesel
    const adblueRatio = totalTripFuel > 0 ? (aggregateLiters / totalTripFuel) * 100 : 0;

    return {
      tankerId: tanker.id,
      tankerNumber: tanker.tankerNumber,
      totalTripsCount: tankerTrips.length + trips.filter(t => t.tankerId === tanker.id && t.status === 'running').length,
      totalKm,
      predictedDieselLiters: Math.round(totalTripFuel),
      adblueLitersUsed: parseFloat(aggregateLiters.toFixed(1)),
      adblueExpenseOny: aggregateCost,
      adblueRatio: parseFloat(adblueRatio.toFixed(1)),
      costPerKm: totalKm > 0 ? parseFloat((aggregateCost / totalKm).toFixed(2)) : 0
    };
  });

  const filteredAnalytics = tankerAnalytics.filter(analytics => 
    analytics.tankerNumber.toLowerCase().includes(searchTanker.toLowerCase())
  );

  const grandTotalLiters = tankerAnalytics.reduce((sum, a) => sum + a.adblueLitersUsed, 0);
  const grandTotalSpent = tankerAnalytics.reduce((sum, a) => sum + a.adblueExpenseOny, 0);

  const handleRefillSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTankerId || refillLiters <= 0 || ratePerLiter <= 0) {
      alert("Invalid refill inputs");
      return;
    }

    const tnk = tankers.find(t => t.id === selectedTankerId);
    if (!tnk) return;

    const totalAmount = refillLiters * ratePerLiter;

    const finalVendor = adblueVendorSelect === 'custom' ? adblueCustomVendorName : (adblueVendorSelect || stationName || 'Default AdBlue Depot');
    const finalPlace = adbluePlaceSelect === 'custom' ? adblueCustomPlace : adbluePlaceSelect;
    const finalBillNo = adblueBillNo || `ADB-CASH-${Math.floor(1000 + Math.random() * 9000)}`;

    // Log a general expense of type 'adblue'
    const newExp: TankerExpense = {
      id: `EXP-ADB-${Math.floor(1000 + Math.random() * 9000)}`,
      tankerId: tnk.id,
      tankerNumber: tnk.tankerNumber,
      date: refillDate,
      category: 'adblue',
      amount: totalAmount,
      detail: `Refilled ${refillLiters} L @ ₹${ratePerLiter}/L. Vendor: ${finalVendor}, Bill: ${finalBillNo}`,
      vendorName: finalVendor || undefined,
      billNo: finalBillNo || undefined,
      place: finalPlace || undefined,
      workType: 'AdBlue Refill',
      paymentStatus: adbluePaymentStatus
    };

    onAddGeneralExpense(newExp);
    setShowRefillModal(false);

    // reset
    setSelectedTankerId('');
    setRefillLiters(20);
    setRatePerLiter(90);
    setStationName('');
    setAdblueVendorSelect('');
    setAdblueCustomVendorName('');
    setAdblueBillNo('');
    setAdbluePlaceSelect('Ranoli');
    setAdblueCustomPlace('');
    setAdbluePaymentStatus('collected');
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 py-6 selection:bg-[#ff5a5f] selection:text-white">
      {/* Upper header */}
      <div className="border-b border-[#30363d] pb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2 text-sans">
            <Droplet className="w-6 h-6 text-cyan-400 fill-cyan-400" />
            AdBlue Fuel Compliance & Liters Tracking
          </h2>
          <p className="text-xs text-[#8b949e] font-mono mt-1">BS-VI COMPLIANT ECO-CATALYTIC EMISSION SHEETS & REFILL AUDITING</p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => {
              const adblueData = tankerAnalytics.map(a => ({
                tankerNumber: a.tankerNumber,
                totalTripsCount: a.totalTripsCount,
                totalKm: a.totalKm,
                predictedDieselLiters: a.predictedDieselLiters,
                adblueLitersUsed: a.adblueLitersUsed,
                adblueExpenseOny: a.adblueExpenseOny,
                adblueRatio: `${a.adblueRatio}%`,
                costPerKm: `Rs. ${a.costPerKm}`
              }));
              const headers = ['Tanker Reg No.', 'Trips Logged', 'Total Kms', 'Est. Diesel Consumed (L)', 'AdBlue Refilled (L)', 'AdBlue Expense (INR)', 'AdBlue/Fuel Ratio (%)', 'AdBlue Cost Per Km'];
              const keys = ['tankerNumber', 'totalTripsCount', 'totalKm', 'predictedDieselLiters', 'adblueLitersUsed', 'adblueExpenseOny', 'adblueRatio', 'costPerKm'];
              exportToExcel('AdBlue Catalyst Compliance Log', headers, keys, adblueData, 'AdBlue_Compliance_Report.csv');
            }}
            className="px-3 py-2.5 bg-[#21262d] hover:bg-[#30363d] border border-[#30363d] text-emerald-400 hover:text-emerald-300 rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 transition-all cursor-pointer font-sans"
            title="Download AdBlue ledger in Excel spreadsheet CSV"
          >
            <Download className="w-3.5 h-3.5" />
            Excel
          </button>
          <button
            onClick={() => {
              const adblueData = tankerAnalytics.map(a => ({
                tankerNumber: a.tankerNumber,
                totalTripsCount: a.totalTripsCount,
                totalKm: a.totalKm,
                predictedDieselLiters: a.predictedDieselLiters,
                adblueLitersUsed: a.adblueLitersUsed,
                adblueExpenseOny: a.adblueExpenseOny,
                adblueRatio: `${a.adblueRatio}%`,
                costPerKm: `Rs. ${a.costPerKm}`
              }));
              const headers = ['Tanker No.', 'Trips', 'Total Kms', 'Diesel (L)', 'AdBlue (L)', 'Cost (INR)', 'Ratio (%)', 'Cost/Km'];
              const keys = ['tankerNumber', 'totalTripsCount', 'totalKm', 'predictedDieselLiters', 'adblueLitersUsed', 'adblueExpenseOny', 'adblueRatio', 'costPerKm'];
              exportToPDF('AdBlue Catalyst Compliance Audit', headers, keys, adblueData, 'AdBlue_Compliance_Report.pdf', 'F04 National BS-VI Eco-Catalytic AdBlue Accounts');
            }}
            className="px-3 py-2.5 bg-[#21262d] hover:bg-[#30363d] border border-[#30363d] text-red-400 hover:text-red-300 rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 transition-all cursor-pointer font-sans"
            title="Download PDF report of AdBlue emission logs"
          >
            <Download className="w-3.5 h-3.5" />
            PDF
          </button>
          <button 
            onClick={() => setShowRefillModal(true)}
            className="px-4 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:opacity-95 text-white font-semibold rounded-xl text-xs inline-flex items-center gap-1.5 shadow-md shadow-cyan-500/10 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Log AdBlue Refill
          </button>
        </div>
      </div>

      {/* Aggregate Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-[#161b22] border border-[#30363d] p-5 rounded-2xl flex items-center gap-4">
          <div className="p-3 bg-cyan-500/10 rounded-xl text-cyan-400">
            <Droplet className="w-6 h-6 fill-cyan-400" />
          </div>
          <div>
            <span className="text-xs text-[#8b949e] font-mono uppercase block">Total AdBlue Procured</span>
            <span className="text-2xl font-black text-white font-mono">{grandTotalLiters.toLocaleString()} L</span>
          </div>
        </div>

        <div className="bg-[#161b22] border border-[#30363d] p-5 rounded-2xl flex items-center gap-4">
          <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-400">
            <span className="text-xl font-bold">₹</span>
          </div>
          <div>
            <span className="text-xs text-[#8b949e] font-mono uppercase block">Total AdBlue Cost Incurred</span>
            <span className="text-2xl font-black text-emerald-400 font-mono">₹{grandTotalSpent.toLocaleString()}</span>
          </div>
        </div>

        <div className="bg-[#161b22] border border-[#30363d] p-5 rounded-2xl flex items-center gap-4">
          <div className="p-3 bg-yellow-500/10 rounded-xl text-yellow-500">
            <BarChart2 className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-[#8b949e] font-mono uppercase block">Average AdBlue/Fuel Ratio</span>
            <span className="text-2xl font-black text-white font-mono">
              {parseFloat((tankerAnalytics.reduce((sum, a) => sum + a.adblueRatio, 0) / (tankerAnalytics.filter(a => a.adblueRatio > 0).length || 1)).toFixed(2))}%
            </span>
          </div>
        </div>
      </div>

      {/* Tanker-Wise Consumption Dashboard */}
      <div className="bg-[#161b22] border border-[#30363d] rounded-2xl p-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
          <div>
            <h3 className="text-base font-bold text-white">Tanker-Wise AdBlue Utilization Logs</h3>
            <p className="text-xs text-[#8b949e] font-mono mt-0.5">Calculates exact liters used per tanker to evaluate engine compliance</p>
          </div>

          <div className="relative w-full sm:w-64">
            <input 
              type="text" 
              placeholder="Search Tanker plate..."
              value={searchTanker}
              onChange={(e) => setSearchTanker(e.target.value)}
              className="w-full bg-[#0d1117] border border-[#30363d] text-xs text-white px-3 py-2 pl-9 rounded-lg outline-none focus:border-cyan-500"
            />
            <Search className="w-4 h-4 text-[#8b949e] absolute left-3 top-2.5" />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-[#8b949e]">
            <thead>
              <tr className="border-b border-[#30363d] font-mono text-white text-[10px] uppercase pb-2">
                <th className="py-3">Tanker plate</th>
                <th className="py-3 text-center">Trips Tracked</th>
                <th className="py-3 text-right">Total Kilometers Run</th>
                <th className="py-3 text-right">Predicted Diesel Consumption</th>
                <th className="py-3 text-right text-cyan-400">AdBlue Liters Consumed</th>
                <th className="py-3 text-right">AdBlue Cost Spent</th>
                <th className="py-3 text-center">AdBlue / Fuel Ratio</th>
                <th className="py-3 text-right">Cost Per KM</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#21262d] font-sans text-[#c9d1d9]">
              {filteredAnalytics.map((item) => (
                <tr key={item.tankerId} className="hover:bg-[#1b2028]/40 text-xs transition-all">
                  <td className="py-4 font-bold text-white uppercase pr-2">{item.tankerNumber}</td>
                  <td className="py-4 text-center font-mono">{item.totalTripsCount} Trips</td>
                  <td className="py-4 text-right font-mono">{item.totalKm.toLocaleString()} KM</td>
                  <td className="py-4 text-right font-mono">{item.predictedDieselLiters.toLocaleString()} Ltrs</td>
                  <td className="py-4 text-right font-mono font-black text-cyan-400 text-sm">
                    {item.adblueLitersUsed.toLocaleString()} Liters
                  </td>
                  <td className="py-4 text-right font-mono text-emerald-400">₹{item.adblueExpenseOny.toLocaleString()}</td>
                  <td className="py-4 text-center">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                      item.adblueRatio === 0 
                        ? 'bg-[#30363d] text-[#8b949e]'
                        : item.adblueRatio < 3 || item.adblueRatio > 8
                          ? 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/20'
                          : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    }`}>
                      {item.adblueRatio > 0 ? `${item.adblueRatio}%` : 'No Trips'}
                    </span>
                  </td>
                  <td className="py-4 text-right font-mono text-xs">₹{item.costPerKm} / KM</td>
                </tr>
              ))}

              {filteredAnalytics.length === 0 && (
                <tr>
                  <td colSpan={8} className="text-center py-10 italic">
                    No matching tankers found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* AdBlue Refilling History Logs */}
      <div className="bg-[#161b22] border border-[#30363d] rounded-2xl p-6">
        <h3 className="text-base font-bold text-white mb-4">Chronological AdBlue Refuel Register</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-[#8b949e]">
            <thead>
              <tr className="border-b border-[#30363d] font-mono text-white text-[10px] uppercase pb-2">
                <th className="py-2">Date</th>
                <th className="py-2">Tanker Plate No</th>
                <th className="py-2">Refill Specifications / Supplier Locations</th>
                <th className="py-2 text-right">Financial Outflow (INR)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#21262d] font-sans text-white">
              {adblueExpenses.map((exp) => (
                <tr key={exp.id} className="hover:bg-[#1b2028]/20 text-xs py-3.5">
                  <td className="py-3.5 text-[#8b949e] font-mono text-[11px]">{exp.date}</td>
                  <td className="py-3.5 font-bold uppercase">{exp.tankerNumber}</td>
                  <td className="py-3.5 text-[#8b949e] font-mono text-[11.5px]" title={exp.detail}>{exp.detail}</td>
                  <td className="py-3.5 text-right font-mono font-bold text-emerald-400 text-sm">₹{exp.amount.toLocaleString()}</td>
                </tr>
              ))}

              {adblueExpenses.length === 0 && (
                <tr>
                  <td colSpan={4} className="text-center py-8 text-[#8b949e] italic">
                    No AdBlue refilling logs on record yet. Log an AdBlue Refill above to start tracking.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* LOG REFILL MODAL */}
      {showRefillModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-full max-w-md bg-[#161b22] border border-[#30363d] rounded-2xl shadow-2xl p-6"
          >
            <div className="flex justify-between items-center pb-4 border-b border-[#30363d] mb-4">
              <div>
                <h3 className="text-base font-bold text-white">Refill AdBlue Catalyst</h3>
                <p className="text-[11px] text-[#8b949e] font-mono">BS-VI PETROCHEMICAL EMISSIONS CONTROL</p>
              </div>
              <button onClick={() => setShowRefillModal(false)} className="text-[#8b949e] hover:text-white cursor-pointer text-lg font-bold">×</button>
            </div>

            <form onSubmit={handleRefillSubmit} className="space-y-4 text-xs text-white">
              <div>
                <label className="block text-[#8b949e] font-mono uppercase mb-1">Select Tanker *</label>
                <select 
                  required
                  value={selectedTankerId}
                  onChange={(e) => setSelectedTankerId(e.target.value)}
                  className="w-full px-3 py-2 bg-[#0d1117] border border-[#30363d] rounded text-white"
                >
                  <option value="">-- Choose Tanker --</option>
                  {tankers.map(t => (
                    <option key={t.id} value={t.id}>{t.tankerNumber}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[#8b949e] font-mono uppercase mb-1">Refill Liters *</label>
                  <input 
                    type="number" 
                    required 
                    min="1"
                    className="w-full px-3 py-2 bg-[#0d1117] border border-[#30363d] rounded text-white font-mono"
                    value={refillLiters}
                    onChange={(e) => setRefillLiters(parseInt(e.target.value) || 0)}
                  />
                </div>
                <div>
                  <label className="block text-[#8b949e] font-mono uppercase mb-1">Rate / Liter (₹) *</label>
                  <input 
                    type="number" 
                    required 
                    min="10"
                    className="w-full px-3 py-2 bg-[#0d1117] border border-[#30363d] rounded text-white font-mono"
                    value={ratePerLiter}
                    onChange={(e) => setRatePerLiter(parseInt(e.target.value) || 0)}
                  />
                </div>
              </div>

              <div>
                <label className="block text-[#8b949e] font-mono uppercase mb-1">Total Bill Cost</label>
                <div className="w-full px-3 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded font-mono font-bold text-emerald-400 text-center text-sm">
                  ₹{(refillLiters * ratePerLiter).toLocaleString()}
                </div>
              </div>

              <div>
                <label className="block text-[#8b949e] font-mono uppercase mb-1">Date *</label>
                <input 
                  type="date" 
                  required
                  className="w-full px-3 py-2 bg-[#0d1117] border border-[#30363d] rounded text-white font-mono"
                  value={refillDate}
                  onChange={(e) => setRefillDate(e.target.value)}
                />
              </div>

              {/* Advanced Ledger Integration for AdBlue Dealers */}
              <div className="bg-[#1b2028]/40 border border-[#30363d] p-3.5 rounded-xl space-y-3">
                <div className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>
                  AdBlue Dealer & Accounts Ledger Setup
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] text-[#8b949e] font-mono uppercase mb-1">AdBlue Supplier/Dealer *</label>
                    <select
                      required
                      value={adblueVendorSelect}
                      onChange={(e) => setAdblueVendorSelect(e.target.value)}
                      className="w-full px-2 py-1.5 bg-[#0d1117] border border-[#30363d] rounded text-white text-xs outline-none"
                    >
                      <option value="">-- Select Dealer --</option>
                      <option value="IOCL Ranoli Pump, Vadodara">IOCL Ranoli Pump, Vadodara</option>
                      <option value="BRC Depot Yard Store, Ranoli">BRC Depot Yard Store, Ranoli</option>
                      <option value="GSFC Fertilizer Depot">GSFC Fertilizer Depot</option>
                      <option value="Aditya Fuel Point">Aditya Fuel Point</option>
                      <option value="custom">-- Custom Dealer --</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] text-[#8b949e] font-mono uppercase mb-1">Dealer Bill / Invoice No. *</label>
                    <input 
                      type="text"
                      required
                      placeholder="e.g. ADB-9402"
                      className="w-full px-2 py-1.5 bg-[#0d1117] border border-[#30363d] rounded text-white text-xs"
                      value={adblueBillNo}
                      onChange={(e) => setAdblueBillNo(e.target.value)}
                    />
                  </div>
                </div>

                {/* Custom Supplier Entry */}
                {adblueVendorSelect === 'custom' && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <label className="block text-[10px] text-[#8b949e] font-mono uppercase mb-1">Enter Custom Supplier Name *</label>
                    <input 
                      type="text"
                      required
                      placeholder="e.g. Royal Petroleum, Vadodara"
                      className="w-full px-2 py-1.5 bg-[#0d1117] border border-[#30363d] rounded text-white text-xs"
                      value={adblueCustomVendorName}
                      onChange={(e) => setAdblueCustomVendorName(e.target.value)}
                    />
                  </motion.div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] text-[#8b949e] font-mono uppercase mb-1">Purchase Location *</label>
                    <select
                      value={adbluePlaceSelect}
                      onChange={(e) => setAdbluePlaceSelect(e.target.value)}
                      className="w-full px-2 py-1.5 bg-[#0d1117] border border-[#30363d] rounded text-white text-xs outline-none"
                    >
                      <option value="Ranoli">Ranoli</option>
                      <option value="Vadodara">Vadodara</option>
                      <option value="Surat">Surat</option>
                      <option value="Ahmedabad">Ahmedabad</option>
                      <option value="custom">-- Custom Place --</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] text-[#8b949e] font-mono uppercase mb-1">Payment Settlement *</label>
                    <select
                      value={adbluePaymentStatus}
                      onChange={(e) => setAdbluePaymentStatus(e.target.value as any)}
                      className="w-full px-2 py-1.5 bg-[#0d1117] border border-[#30363d] rounded text-white text-xs layout-dense outline-none"
                    >
                      <option value="collected">✅ Cleared (Instant Cash/UPI)</option>
                      <option value="pending">⏳ Pending (Add to Credit)</option>
                    </select>
                  </div>
                </div>

                {/* Custom Place Entry */}
                {adbluePlaceSelect === 'custom' && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <label className="block text-[10px] text-[#8b949e] font-mono uppercase mb-1">Enter Custom Purchase Location *</label>
                    <input 
                      type="text"
                      required
                      placeholder="e.g. Halol GIDC Depot"
                      className="w-full px-2 py-1.5 bg-[#0d1117] border border-[#30363d] rounded text-white text-xs"
                      value={adblueCustomPlace}
                      onChange={(e) => setAdblueCustomPlace(e.target.value)}
                    />
                  </motion.div>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-[#30363d]">
                <button 
                  type="button" 
                  onClick={() => setShowRefillModal(false)}
                  className="px-3.5 py-1.5 bg-[#21262d] text-[#8b949e] hover:text-white rounded"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="px-4 py-1.5 bg-cyan-500 hover:bg-cyan-600 font-bold text-white rounded text-xs select-none"
                >
                  Register Refill
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
