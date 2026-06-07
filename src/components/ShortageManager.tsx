import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  TrendingDown, Users, Truck, Calendar, Search, ArrowRight, Eye, AlertCircle, X, Download, FileText, CheckCircle2
} from 'lucide-react';
import { Trip, Driver, Tanker } from '../types';
import { exportToExcel } from '../utils/exportUtils';

interface ShortageManagerProps {
  trips: Trip[];
  drivers: Driver[];
  tankers: Tanker[];
}

export default function ShortageManager({ trips, drivers, tankers }: ShortageManagerProps) {
  const [viewType, setViewType] = useState<'driver' | 'tanker' | 'monthly' | 'all'>('driver');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEntityId, setSelectedEntityId] = useState<string | null>(null);
  const [selectedEntityName, setSelectedEntityName] = useState<string>('');
  const [selectedEntityType, setSelectedEntityType] = useState<'driver' | 'tanker' | 'monthly' | 'all' | null>(null);

  const completedTrips = trips.filter(t => t.status === 'completed');

  // Helper to calculate shortage for a single trip
  const getTripShortage = (trip: Trip) => {
    const loading = trip.loadingWeight || trip.qty || 0;
    const unloading = trip.unloadingWeight || 0;
    const diff = loading - unloading;
    return diff > 0 ? parseFloat(diff.toFixed(3)) : 0;
  };

  // 1. Group by Driver
  const driverShortages = drivers.map(driver => {
    const driverTrips = completedTrips.filter(t => t.driverId === driver.id);
    const tripsWithShortage = driverTrips.filter(t => getTripShortage(t) > 0);
    const totalShortage = driverTrips.reduce((sum, t) => sum + getTripShortage(t), 0);
    
    // Calculate total shortage value (assuming standard chemical penalty of e.g. ₹5000 per MT or based on freight rate)
    const estimatedPenalty = driverTrips.reduce((sum, t) => {
      const shortage = getTripShortage(t);
      const rate = t.freightRateAtEnd || 0;
      return sum + (shortage * rate * 1.5); // Penalty of 1.5x freight rate for shortages
    }, 0);

    return {
      id: driver.id,
      name: driver.name,
      contact: driver.contactNumber,
      totalTrips: driverTrips.length,
      shortageTripsCount: tripsWithShortage.length,
      totalShortage: parseFloat(totalShortage.toFixed(3)),
      estimatedPenalty: Math.round(estimatedPenalty)
    };
  }).filter(d => searchQuery === '' || d.name.toLowerCase().includes(searchQuery.toLowerCase()));

  // Sort by highest leakage/shortage
  const sortedDriverShortages = [...driverShortages].sort((a, b) => b.totalShortage - a.totalShortage);

  // 2. Group by Tanker
  const tankerShortages = tankers.map(tanker => {
    const tankerTrips = completedTrips.filter(t => t.tankerId === tanker.id);
    const tripsWithShortage = tankerTrips.filter(t => getTripShortage(t) > 0);
    const totalShortage = tankerTrips.reduce((sum, t) => sum + getTripShortage(t), 0);
    
    const estimatedPenalty = tankerTrips.reduce((sum, t) => {
      const shortage = getTripShortage(t);
      const rate = t.freightRateAtEnd || 0;
      return sum + (shortage * rate * 1.5);
    }, 0);

    return {
      id: tanker.id,
      number: tanker.tankerNumber,
      capacity: tanker.capacity,
      totalTrips: tankerTrips.length,
      shortageTripsCount: tripsWithShortage.length,
      totalShortage: parseFloat(totalShortage.toFixed(3)),
      estimatedPenalty: Math.round(estimatedPenalty)
    };
  }).filter(t => searchQuery === '' || t.number.toLowerCase().includes(searchQuery.toLowerCase()));

  const sortedTankerShortages = [...tankerShortages].sort((a, b) => b.totalShortage - a.totalShortage);

  // 3. Group by Month
  const monthlyShortageMap: { [key: string]: { trips: Trip[], total: number, claim: number } } = {};
  
  completedTrips.forEach(trip => {
    const dateStr = trip.endDate || trip.startDate || '2026-05-25';
    const dateObj = new Date(dateStr);
    const monthKey = dateObj.toLocaleString('default', { month: 'long', year: 'numeric' });
    
    if (!monthlyShortageMap[monthKey]) {
      monthlyShortageMap[monthKey] = { trips: [], total: 0, claim: 0 };
    }
    
    const shortage = getTripShortage(trip);
    monthlyShortageMap[monthKey].trips.push(trip);
    monthlyShortageMap[monthKey].total += shortage;
    monthlyShortageMap[monthKey].claim += shortage * (trip.freightRateAtEnd || 1000) * 1.5;
  });

  const monthlyShortages = Object.keys(monthlyShortageMap).map(month => {
    const data = monthlyShortageMap[month];
    return {
      id: month,
      name: month,
      totalTrips: data.trips.length,
      shortageTripsCount: data.trips.filter(t => getTripShortage(t) > 0).length,
      totalShortage: parseFloat(data.total.toFixed(3)),
      estimatedPenalty: Math.round(data.claim)
    };
  }).filter(m => searchQuery === '' || m.name.toLowerCase().includes(searchQuery.toLowerCase()));

  // Total Summary stats
  const totalCompletedCount = completedTrips.length;
  const totalShortageQtyCount = completedTrips.reduce((sum, t) => sum + getTripShortage(t), 0);
  const totalShortagePenaltySum = completedTrips.reduce((sum, t) => {
    const shortage = getTripShortage(t);
    const rate = t.freightRateAtEnd || 0;
    return sum + (shortage * rate * 1.5);
  }, 0);

  // Handle drill down click
  const openDetailModal = (id: string, name: string, type: 'driver' | 'tanker' | 'monthly') => {
    setSelectedEntityId(id);
    setSelectedEntityName(name);
    setSelectedEntityType(type);
  };

  // Filter trips for drill-down modal
  const getModalTrips = () => {
    if (!selectedEntityType || !selectedEntityId) return [];
    if (selectedEntityType === 'driver') {
      return completedTrips.filter(t => t.driverId === selectedEntityId);
    }
    if (selectedEntityType === 'tanker') {
      return completedTrips.filter(t => t.tankerId === selectedEntityId);
    }
    if (selectedEntityType === 'monthly') {
      return completedTrips.filter(t => {
        const dateStr = t.endDate || t.startDate || '2026-05-25';
        const m = new Date(dateStr).toLocaleString('default', { month: 'long', year: 'numeric' });
        return m === selectedEntityId;
      });
    }
    return [];
  };

  const modalTripsList = getModalTrips();

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 py-6 text-white font-sans selection:bg-[#ff5a1f] selection:text-white">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#30363d] pb-6">
        <div>
          <h2 className="text-2xl font-black uppercase tracking-tight flex items-center gap-2">
            <TrendingDown className="w-7 h-7 text-[#ff5a1f]" />
            Liquid cargo shortage audits
          </h2>
          <p className="text-xs text-[#8b949e] font-mono mt-1">
            DRIVER-ACCOUNT PENALTIES, UNLOADING QUANTITY DELTAS & DISCREPANCY RECONCILIATIONS
          </p>
        </div>

        <button
          onClick={() => {
            const expData = completedTrips.map(t => ({
              tripId: t.id,
              lrNo: t.lrNo,
              driver: t.driverName,
              tanker: t.tankerNumber,
              loading: t.loadingWeight,
              unloading: t.unloadingWeight || 0,
              shortage: getTripShortage(t),
              freight: t.freightRateAtEnd || 0,
              penalty: Math.round(getTripShortage(t) * (t.freightRateAtEnd || 0) * 1.5)
            }));
            const headers = ['Trip ID', 'LR No', 'Driver Name', 'Vehicle Plate', 'Loading Weight', 'Unloading Weight', 'Shortage Qty', 'Freight Rate', 'Calculated Penalty'];
            const keys = ['tripId', 'lrNo', 'driver', 'tanker', 'loading', 'unloading', 'shortage', 'freight', 'penalty'];
            exportToExcel('Shortage_Audit_Ledger', headers, keys, expData, 'Chemical_Shortage_Audit.csv');
          }}
          className="px-4 py-2.5 bg-[#21262d] hover:bg-[#30363d] border border-[#30363d] text-[#ff7a4e] hover:border-[#ff5a1f]/30 rounded-xl text-xs font-semibold inline-flex items-center gap-2 transition-all cursor-pointer"
        >
          <Download className="w-4 h-4" />
          Export Shortage Sheet
        </button>
      </div>

      {/* Aggregate Overview Widgets */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-[#161b22] border border-[#30363d] p-5 rounded-2xl flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] text-[#8b949e] uppercase font-mono tracking-wider block">Audited Dispatches</span>
            <span className="text-2xl font-black text-white block">{totalCompletedCount} Trips</span>
          </div>
          <div className="w-11 h-11 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-400 font-mono font-bold text-xs">
            TRP
          </div>
        </div>

        <div className="bg-[#161b22] border border-[#30363d] p-5 rounded-2xl flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] text-[#8b949e] uppercase font-mono tracking-wider block">Total Volumetric Shortage</span>
            <span className="text-2xl font-black text-[#ff5a1f] block">{totalShortageQtyCount.toFixed(3)} MT/KL</span>
          </div>
          <div className="w-11 h-11 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 font-bold text-xs font-mono">
            ΔKG
          </div>
        </div>

        <div className="bg-[#161b22] border border-[#30363d] p-5 rounded-2xl flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] text-[#8b949e] uppercase font-mono tracking-wider block">Driver Ledger Penalty Claims</span>
            <span className="text-2xl font-black text-rose-400 block">₹{Math.round(totalShortagePenaltySum).toLocaleString('en-IN')}</span>
          </div>
          <div className="w-11 h-11 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 font-extrabold text-xs">
            INR
          </div>
        </div>
      </div>

      {/* Warning Box */}
      <div className="p-4 bg-amber-500/5 border border-amber-500/20 rounded-2xl text-xs font-mono leading-relaxed text-[#bba195] flex gap-3">
        <AlertCircle className="w-5 h-5 text-amber-500 shrink-0" />
        <div>
          <strong>Auto Deduct Shortage Ledger Mandate:</strong> This screen monitors physical cargo discrepancies. If unloading quantity at chemical terminal falls below weighment loading index, the discrepancy weight is logged as shortage in the respective driver's shortage account.
        </div>
      </div>

      {/* Control View Toggles & Search */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mt-8 pt-4 border-t border-white/[0.04]">
        <div className="flex gap-1.5 p-1 bg-[#0d1117] border border-[#30363d] rounded-2xl w-fit">
          {[
            { id: 'driver', label: 'Driver Ledger Accounts', icon: Users },
            { id: 'tanker', label: 'Vehicle Shortage Records', icon: Truck },
            { id: 'monthly', label: 'Monthly Delta Trends', icon: Calendar },
            { id: 'all', label: 'Detailed Discrepancy Registry', icon: FileText }
          ].map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setViewType(tab.id as any);
                  setSearchQuery('');
                }}
                className={`py-2 px-3 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
                  viewType === tab.id
                    ? 'bg-[#ff5a1f] text-white shadow-md'
                    : 'text-gray-400 hover:text-white hover:bg-white/[0.02]'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {viewType !== 'all' && (
          <div className="relative w-full max-w-sm">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-500">
              <Search className="w-4 h-4" />
            </span>
            <input
              type="text"
              placeholder={`Search ${viewType} accounts...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#161b22] pl-9 pr-4 py-2 border border-[#30363d] rounded-xl text-xs text-white outline-none focus:border-[#ff5a1f]"
            />
          </div>
        )}
      </div>

      {/* Main List Rendering */}
      <div className="mt-4">
        {/* DRIVER WISE VIEW */}
        {viewType === 'driver' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {sortedDriverShortages.map(drv => (
              <div 
                key={drv.id} 
                className="bg-[#161b22] border border-[#30363d] hover:border-[#ff5a1f]/30 p-5 rounded-2xl flex flex-col justify-between gap-4 transition-all"
              >
                <div className="space-y-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-extrabold text-sm text-white tracking-tight">{drv.name}</h4>
                      <p className="text-[10px] text-gray-500 font-mono">Contact: {drv.contact}</p>
                    </div>
                    {drv.totalShortage > 0 && (
                      <span className="px-2 py-0.5 bg-rose-500/10 border border-rose-500/20 text-rose-400 font-bold font-mono text-[9px] rounded-full">
                        Delta Alert
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-3 text-xs border-t border-white/[0.03]">
                    <div>
                      <span className="text-gray-500 block text-[9px] uppercase font-mono">Total Shortage</span>
                      <strong className={`font-black tracking-tight text-sm ${drv.totalShortage > 0 ? 'text-[#ff5a1f]' : 'text-gray-400'}`}>
                        {drv.totalShortage} MT
                      </strong>
                    </div>
                    <div>
                      <span className="text-gray-500 block text-[9px] uppercase font-mono">Shortage Traps</span>
                      <strong className="font-extrabold text-sm text-white">
                        {drv.shortageTripsCount} / {drv.totalTrips}
                      </strong>
                    </div>
                  </div>
                </div>

                <div className="flex justify-between items-center bg-black/20 p-3 rounded-xl border border-white/[0.02]">
                  <div>
                    <span className="text-gray-500 block text-[8px] uppercase font-mono">Estimated Debit Claim</span>
                    <strong className="font-black text-rose-400">₹{drv.estimatedPenalty.toLocaleString('en-IN')}</strong>
                  </div>
                  <button
                    onClick={() => openDetailModal(drv.id, drv.name, 'driver')}
                    className="p-1 px-3 bg-[#21262d] hover:bg-[#30363d] text-xs font-semibold rounded-lg text-gray-300 hover:text-[#ff5a1f] border border-white/[0.04] flex items-center gap-1 transition-all"
                  >
                    View Ledger
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* TANKER WISE VIEW */}
        {viewType === 'tanker' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {sortedTankerShortages.map(tnk => (
              <div 
                key={tnk.id} 
                className="bg-[#161b22] border border-[#30363d] hover:border-cyan-500/30 p-5 rounded-2xl flex flex-col justify-between gap-4 transition-all"
              >
                <div className="space-y-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-extrabold text-sm text-white tracking-tight">{tnk.number}</h4>
                      <p className="text-[10px] text-gray-400 font-mono">Gross Capacity: {tnk.capacity || 38} MT/KL</p>
                    </div>
                    {tnk.totalShortage > 0 && (
                      <span className="px-2 py-0.5 bg-red-500/10 border border-red-500/20 text-red-400 font-bold font-mono text-[9px] rounded-full">
                        Delta Detected
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-3 text-xs border-t border-white/[0.03]">
                    <div>
                      <span className="text-gray-500 block text-[9px] uppercase font-mono">Total Delta</span>
                      <strong className={`font-black tracking-tight text-sm ${tnk.totalShortage > 0 ? 'text-[#ff5a1f]' : 'text-gray-400'}`}>
                        {tnk.totalShortage} MT
                      </strong>
                    </div>
                    <div>
                      <span className="text-gray-500 block text-[9px] uppercase font-mono">Damaged Trips</span>
                      <strong className="font-extrabold text-sm text-white">
                        {tnk.shortageTripsCount} / {tnk.totalTrips}
                      </strong>
                    </div>
                  </div>
                </div>

                <div className="flex justify-between items-center bg-black/20 p-3 rounded-xl border border-white/[0.02]">
                  <div>
                    <span className="text-gray-500 block text-[8px] uppercase font-mono">Total Penalty Draft</span>
                    <strong className="font-black text-rose-400 font-mono">₹{tnk.estimatedPenalty.toLocaleString('en-IN')}</strong>
                  </div>
                  <button
                    onClick={() => openDetailModal(tnk.id, tnk.number, 'tanker')}
                    className="p-1 px-3 bg-[#21262d] hover:bg-[#30363d] text-xs font-semibold rounded-lg text-gray-300 hover:text-[#ff5a1f] border border-white/[0.04] flex items-center gap-1 transition-all"
                  >
                    View Logs
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* MONTHLY WISE VIEW */}
        {viewType === 'monthly' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {monthlyShortages.map(m => (
              <div 
                key={m.id} 
                className="bg-[#161b22] border border-[#30363d] p-5 rounded-2xl flex flex-col justify-between gap-4 transition-all"
              >
                <div className="space-y-2">
                  <div className="flex justify-between items-start">
                    <h4 className="font-extrabold text-sm text-white tracking-tight uppercase flex items-center gap-1.5">
                      <Calendar className="w-4 h-4 text-[#ff5a1f]" />
                      {m.name}
                    </h4>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-3 text-xs border-t border-white/[0.03]">
                    <div>
                      <span className="text-gray-500 block text-[9px] uppercase font-mono">Volumetric Delta</span>
                      <strong className="font-black tracking-tight text-sm text-[#ff5a1f]">
                        {m.totalShortage} MT
                      </strong>
                    </div>
                    <div>
                      <span className="text-gray-500 block text-[9px] uppercase font-mono">Shortage Trips</span>
                      <strong className="font-extrabold text-sm text-white">
                        {m.shortageTripsCount} / {m.totalTrips}
                      </strong>
                    </div>
                  </div>
                </div>

                <div className="flex justify-between items-center bg-black/20 p-3 rounded-xl border border-white/[0.02]">
                  <div>
                    <span className="text-gray-500 block text-[8px] uppercase font-mono">Monthly Claims Claim</span>
                    <strong className="font-black text-rose-400">₹{m.estimatedPenalty.toLocaleString('en-IN')}</strong>
                  </div>
                  <button
                    onClick={() => openDetailModal(m.id, m.name, 'monthly')}
                    className="p-1 px-3 bg-[#21262d] hover:bg-[#30363d] text-xs font-semibold rounded-lg text-gray-300 hover:text-[#ff5a1f] border border-white/[0.04] flex items-center gap-1 transition-all"
                  >
                    View Delta
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}

            {monthlyShortages.length === 0 && (
              <div className="col-span-full py-16 text-center border border-dashed border-[#30363d] rounded-2xl bg-black/10 text-gray-500">
                <Calendar className="w-10 h-10 text-gray-600 mx-auto mb-2" />
                <p className="text-xs font-mono font-bold uppercase">No finalized monthly shortage trends available.</p>
              </div>
            )}
          </div>
        )}

        {/* DETAILED REGISTRY / ALL VIEW */}
        {viewType === 'all' && (
          <div className="bg-[#161b22] border border-[#30363d] rounded-2xl overflow-hidden shadow-lg">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-[#0f1218] border-b border-[#30363d] text-gray-400 font-mono text-[9px] uppercase tracking-wider">
                    <th className="py-3 px-4">Trip Code</th>
                    <th className="py-3 px-4">LR Number</th>
                    <th className="py-3 px-4">Driver Profile</th>
                    <th className="py-3 px-4">Tanker Plate</th>
                    <th className="py-3 px-4 text-right">Loading Weight</th>
                    <th className="py-3 px-4 text-right">Unloading Weight</th>
                    <th className="py-3 px-4 text-right text-orange-400">Shortage Qty</th>
                    <th className="py-3 px-4 text-right text-rose-400">Shortage Penalty</th>
                    <th className="py-3 px-4 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.03] text-[11px] font-sans">
                  {completedTrips.map(trip => {
                    const shortage = getTripShortage(trip);
                    const isDeficit = shortage > 0;
                    const penalty = shortage * (trip.freightRateAtEnd || 1000) * 1.5;

                    return (
                      <tr key={trip.id} className="hover:bg-white/[0.01]">
                        <td className="py-3 px-4 font-mono font-bold text-[#8b949e]">#{trip.id}</td>
                        <td className="py-3 px-4 font-mono text-cyan-400">{trip.lrNo}</td>
                        <td className="py-3 px-4 font-bold text-white">{trip.driverName}</td>
                        <td className="py-3 px-4 text-[#8b949e] font-mono">{trip.tankerNumber}</td>
                        <td className="py-3 px-4 text-right font-mono">{trip.loadingWeight || trip.qty} MT</td>
                        <td className="py-3 px-4 text-right font-mono text-gray-300">{trip.unloadingWeight || 0} MT</td>
                        <td className="py-3 px-4 text-right font-mono font-bold">
                          {isDeficit ? (
                            <span className="text-[#ff5a1f]">{shortage} MT</span>
                          ) : (
                            <span className="text-emerald-400">0.000</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-extrabold">
                          {isDeficit ? (
                            <span className="text-rose-400">₹{Math.round(penalty).toLocaleString('en-IN')}</span>
                          ) : (
                            <span className="text-gray-500">N/A</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center">
                          {isDeficit ? (
                            <span className="px-2 py-0.5 bg-red-950/20 text-red-400 border border-red-500/10 text-[9px] font-mono rounded">Deficit Auto-Deducted</span>
                          ) : (
                            <span className="px-2 py-0.5 bg-emerald-950/20 text-emerald-400 border border-emerald-500/10 text-[9px] font-mono rounded">Clean Weighment</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}

                  {completedTrips.length === 0 && (
                    <tr>
                      <td colSpan={9} className="text-center py-16 text-gray-500 font-mono uppercase">
                        No finalized trip weighments registered inside primary audit ledger.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* POPUP SEPARATE MODAL DRILL-DOWN LEDGER WINDOW */}
      <AnimatePresence>
        {selectedEntityType && selectedEntityId && (
          <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-4xl bg-[#161b22] border border-[#30363d] rounded-[24px] overflow-hidden shadow-2xl shadow-black/80 flex flex-col max-h-[85vh]"
            >
              <div className="px-6 py-5 bg-[#1a1f29] border-b border-[#30363d] flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-mono text-[#ff7a4e] uppercase bg-[#ff7a4e]/10 border border-[#ff7a4e]/20 px-2.5 py-0.5 rounded-full inline-block mb-1">
                    System Audit Window
                  </span>
                  <h3 className="text-base font-black text-white uppercase tracking-tight">
                    {selectedEntityType} shortage reconciliation - {selectedEntityName}
                  </h3>
                </div>
                <button
                  onClick={() => {
                    setSelectedEntityId(null);
                    setSelectedEntityType(null);
                  }}
                  className="p-1 px-2.5 bg-[#21262d] hover:bg-red-500/10 hover:text-red-400 border border-[#30363d] rounded-lg text-xs font-mono text-gray-400 cursor-pointer transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal stats header */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 p-6 bg-black/15 border-b border-white/[0.03]">
                <div className="bg-[#0f1218] p-4 rounded-xl border border-white/[0.02]">
                  <span className="text-[10px] text-gray-500 uppercase font-mono block">Entity ID</span>
                  <strong className="text-sm font-mono text-cyan-400 select-all font-bold block">{selectedEntityId}</strong>
                </div>
                <div className="bg-[#0f1218] p-4 rounded-xl border border-white/[0.02]">
                  <span className="text-[10px] text-gray-500 uppercase font-mono block">Finished Trips</span>
                  <strong className="text-sm text-white font-black block">{modalTripsList.length} Voyages</strong>
                </div>
                <div className="bg-[#0f1218] p-4 rounded-xl border border-white/[0.02]">
                  <span className="text-[10px] text-gray-500 uppercase font-mono block">Total Deficit Qty</span>
                  <strong className="text-sm text-[#ff5a1f] font-black font-mono block">
                    {modalTripsList.reduce((sum, t) => sum + getTripShortage(t), 0).toFixed(3)} MT
                  </strong>
                </div>
                <div className="bg-[#0f1218] p-4 rounded-xl border border-white/[0.02]">
                  <span className="text-[10px] text-gray-500 uppercase font-mono block">Discrepancy Penalty Debit</span>
                  <strong className="text-sm text-rose-400 font-extrabold font-mono block">
                    ₹{Math.round(modalTripsList.reduce((sum, t) => {
                      const s = getTripShortage(t);
                      return sum + s * (t.freightRateAtEnd || 1000) * 1.5;
                    }, 0)).toLocaleString('en-IN')}
                  </strong>
                </div>
              </div>

              {/* Table list scrollable of these trips */}
              <div className="flex-grow p-6 overflow-y-auto max-h-[45vh]">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-[#0f1218] text-[#8b949e] font-mono text-[9px] uppercase tracking-wider border-b border-[#30363d]">
                      <th className="py-2.5 px-3">Trip Code</th>
                      <th className="py-2.5 px-3">Lorry Rec</th>
                      <th className="py-2.5 px-3">Weighing Dates</th>
                      <th className="py-2.5 px-3 uppercase">{selectedEntityType === 'driver' ? 'Plate Number' : 'Driver Operative'}</th>
                      <th className="py-2.5 px-3 text-right">Qty Dispatched</th>
                      <th className="py-2.5 px-3 text-right">Qty Unloaded</th>
                      <th className="py-2.5 px-3 text-right text-rose-400">Shortage Delta</th>
                      <th className="py-2.5 px-3 text-right">Penalty</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.02] text-[11px] font-mono text-gray-300">
                    {modalTripsList.map(trip => {
                      const s = getTripShortage(trip);
                      return (
                        <tr key={trip.id} className="hover:bg-white/[0.01]">
                          <td className="py-3 px-3 font-bold text-gray-400">#{trip.id}</td>
                          <td className="py-3 px-3 text-cyan-400 font-bold">{trip.lrNo}</td>
                          <td className="py-3 px-3 text-[#8b949e]">{trip.startDate} to {trip.endDate || 'Present'}</td>
                          <td className="py-3 px-3 font-sans text-white">
                            {selectedEntityType === 'driver' ? trip.tankerNumber : trip.driverName}
                          </td>
                          <td className="py-3 px-3 text-right">{trip.loadingWeight || trip.qty} MT</td>
                          <td className="py-3 px-3 text-right text-gray-400">{trip.unloadingWeight || 0} MT</td>
                          <td className="py-3 px-3 text-right font-bold text-[#ff5a1f]">
                            {s > 0 ? `${s} MT` : '0.000'}
                          </td>
                          <td className="py-3 px-3 text-right font-sans font-bold text-rose-400">
                            {s > 0 ? `₹${Math.round(s * (trip.freightRateAtEnd || 1000) * 1.5).toLocaleString('en-IN')}` : '—'}
                          </td>
                        </tr>
                      );
                    })}

                    {modalTripsList.length === 0 && (
                      <tr>
                        <td colSpan={8} className="text-center py-10 font-sans italic text-gray-500">
                          No related trip entries found in secondary indices.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Modal footer controls */}
              <div className="px-6 py-4 bg-[#1a1f29] border-t border-[#30363d] flex justify-between items-center text-xs font-mono">
                <span className="text-[#8c7870] uppercase">
                  * Dynamic weighbridge verification complete
                </span>
                <button
                  onClick={() => {
                    setSelectedEntityId(null);
                    setSelectedEntityType(null);
                  }}
                  className="px-5 py-2.5 bg-[#ff5a1f] hover:bg-[#e0450d] text-white font-bold rounded-xl cursor-pointer transition-all active:scale-95"
                >
                  Close Audit Ledger Window
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
