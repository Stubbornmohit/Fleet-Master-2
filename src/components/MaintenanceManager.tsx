import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Wrench, Truck, ShieldAlert, BadgeCheck, HelpCircle, Plus, Sparkles, Filter, Database, Calendar, Eye, Activity, X, Check, PenTool
} from 'lucide-react';
import { Tanker, Part, MaintenanceBill, TankerExpense, Trip, LorryReceipt } from '../types';
import Ledger from './Ledger';

interface MaintenanceManagerProps {
  tankers: Tanker[];
  bills: MaintenanceBill[];
  expenses: TankerExpense[];
  trips: Trip[];
  lrs: LorryReceipt[];
  onAddPart: (tankerId: string, part: Part) => void;
  onAddBill?: (bill: MaintenanceBill) => void;
  onAddGeneralExpense?: (expense: TankerExpense) => void;
  onMarkBillCollected: (billId: string) => void;
  onDeleteBill?: (id: string) => void;
  onDeleteExpense?: (id: string) => void;
  onImportBulkBills?: (bills: MaintenanceBill[]) => void;
  onDeleteTrip?: (id: string) => void;
}

export default function MaintenanceManager({ 
  tankers, 
  bills, 
  expenses, 
  trips,
  lrs,
  onAddPart,
  onAddBill, 
  onAddGeneralExpense,
  onMarkBillCollected,
  onDeleteBill,
  onDeleteExpense,
  onImportBulkBills,
  onDeleteTrip
}: MaintenanceManagerProps) {
  const [selectedTankerId, setSelectedTankerId] = useState<string | null>(tankers[0]?.id || null);
  const [activeMaintTab, setActiveMaintTab] = useState<'inventory' | 'repairs' | 'preventive'>('inventory');
  const [searchPartSerial, setSearchPartSerial] = useState('');
  
  // Spares modal / logger state
  const [showSparesModal, setShowSparesModal] = useState(false);
  const [sparePartName, setSparePartName] = useState('');
  const [spareSerialNum, setSpareSerialNum] = useState('');
  const [sparePartDetails, setSparePartDetails] = useState('');
  const [spareInstallDate, setSpareInstallDate] = useState('');
  const [isTyreType, setIsTyreType] = useState(false);
  const [tyrePosition, setTyrePosition] = useState('Front Left');

  // Interactive tyre selector state
  const [activeTyrePosition, setActiveTyrePosition] = useState<string | null>(null);

  const activeTanker = tankers.find(t => t.id === selectedTankerId) || tankers[0];

  // Group and calculate averages tanker wise
  const tankerAverages = tankers.map(tanker => {
    // Collect all related repair and maintenance bills
    const relatedBills = bills.filter(b => b.tankerId === tanker.id && (b.category === 'repair' || b.category === 'maintenance' || b.workType?.toLowerCase().includes('maintenance') || b.workType?.toLowerCase().includes('repair') || b.detail?.toLowerCase().includes('repair')));
    const relatedExpenses = expenses.filter(e => e.tankerId === tanker.id && (e.category === 'repair' || e.category === 'maintenance' || e.workType?.toLowerCase().includes('maintenance') || e.workType?.toLowerCase().includes('repair') || e.detail?.toLowerCase().includes('repair')));
    
    const billsTotal = relatedBills.reduce((sum, b) => sum + b.amount, 0);
    const expensesTotal = relatedExpenses.reduce((sum, e) => sum + e.amount, 0);
    const totalSpent = billsTotal + expensesTotal;
    const totalRecordsCount = relatedBills.length + relatedExpenses.length;
    
    const average = totalRecordsCount > 0 ? Math.round(totalSpent / totalRecordsCount) : 0;

    return {
      id: tanker.id,
      number: tanker.tankerNumber,
      capacity: tanker.capacity,
      totalSpent,
      totalRecordsCount,
      average
    };
  });

  const activeTankerStats = tankerAverages.find(ta => ta.id === selectedTankerId) || { totalSpent: 0, totalRecordsCount: 0, average: 0 };

  // Collect specific parts for the active tanker
  const tankerParts = activeTanker?.parts || [];

  // Filter parts if searching serial numbers
  const filteredParts = tankerParts.filter(p => 
    searchPartSerial === '' || 
    p.serialNo.toLowerCase().includes(searchPartSerial.toLowerCase()) ||
    p.name.toLowerCase().includes(searchPartSerial.toLowerCase())
  );

  const submitSpareLog = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTanker || !sparePartName || !spareSerialNum) return;

    const finalName = isTyreType ? `Tyre — ${tyrePosition} (${sparePartName})` : sparePartName;

    const newPart: Part = {
      id: `PRT-${Date.now().toString().slice(-4)}`,
      name: finalName,
      serialNo: spareSerialNum.trim().toUpperCase(),
      date: spareInstallDate || new Date().toISOString().split('T')[0],
      detail: `${sparePartDetails}${isTyreType ? ` Assigned Position: ${tyrePosition}` : ''}`
    };

    onAddPart(activeTanker.id, newPart);

    // Also optionally write a general expense of type 'repair' to update accounting
    if (onAddGeneralExpense) {
      onAddGeneralExpense({
        id: `EXP-${Date.now()}`,
        tankerId: activeTanker.id,
        tankerNumber: activeTanker.tankerNumber,
        category: 'repair',
        amount: isTyreType ? 18500 : 5000, // Standard tyre or spares cost estimate
        date: spareInstallDate || new Date().toISOString().split('T')[0],
        detail: `Installed Spare Hardware: ${finalName} S/N: ${spareSerialNum}`,
        workType: 'Spare Part Changed',
        place: 'Baroda Logistics Yard'
      });
    }

    // Reset Form
    setSparePartName('');
    setSpareSerialNum('');
    setSparePartDetails('');
    setSpareInstallDate('');
    setIsTyreType(false);
    setShowSparesModal(false);
  };

  // Pre-configured typical tyre configurations
  const TYRE_POSITIONS = [
    'Front Left', 'Front Right',
    'Chassis L1', 'Chassis R1',
    'Chassis L2', 'Chassis R2',
    'Trailer L1', 'Trailer R1',
    'Trailer L2', 'Trailer R2'
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 py-6 text-white font-sans selection:bg-[#ff5a1f] selection:text-white">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#30363d] pb-6">
        <div>
          <h2 className="text-2xl font-black uppercase tracking-tight flex items-center gap-2">
            <Wrench className="w-7 h-7 text-[#ff5a1f]" />
            Maintenance & repairs center
          </h2>
          <p className="text-xs text-[#8b949e] font-mono mt-1">
            TANKER FLEET MAINTENANCE EXPENDITURE, TYRE SERIAL REGISTRATION & SHIELD EXPENDITURES
          </p>
        </div>
      </div>

      {/* Tabs Selector */}
      <div className="flex flex-wrap border-b border-[#30363d] gap-1 select-none font-sans bg-[#0d1117] p-1 rounded-xl">
        <button
          onClick={() => setActiveMaintTab('inventory')}
          className={`py-2 px-4 text-xs font-bold transition-all rounded-lg cursor-pointer flex items-center gap-2 ${
            activeMaintTab === 'inventory' ? 'bg-[#ff5a1f] text-white shadow font-black' : 'text-gray-400 hover:text-white'
          }`}
        >
          <Database className="w-3.5 h-3.5" />
          <span>Equipment, Tyres & Calibration</span>
        </button>
        <button
          onClick={() => setActiveMaintTab('repairs')}
          className={`py-2 px-4 text-xs font-bold transition-all rounded-lg cursor-pointer flex items-center gap-2 ${
            activeMaintTab === 'repairs' ? 'bg-orange-600 text-white shadow font-black' : 'text-gray-400 hover:text-white'
          }`}
        >
          <Wrench className="w-3.5 h-3.5" />
          <span>Workshop Repairs Ledger (AI Scan)</span>
        </button>
        <button
          onClick={() => setActiveMaintTab('preventive')}
          className={`py-2 px-4 text-xs font-bold transition-all rounded-lg cursor-pointer flex items-center gap-2 ${
            activeMaintTab === 'preventive' ? 'bg-amber-500 text-white shadow font-black' : 'text-gray-400 hover:text-white'
          }`}
        >
          <Wrench className="w-3.5 h-3.5" />
          <span>Preventive Maintenance Ledger (AI Scan)</span>
        </button>
      </div>

      {activeMaintTab === 'inventory' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left column: Tanker Select and average stats */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-[#161b22] border border-[#30363d] p-4 rounded-2xl">
            <h3 className="text-xs font-mono font-extrabold uppercase text-[#ff7a4e] mb-3">
              🚚 LOGISTICAL VESSEL SELECTOR
            </h3>
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {tankers.map((tanker) => {
                const isSelected = selectedTankerId === tanker.id;
                const stats = tankerAverages.find(t => t.id === tanker.id) || { totalSpent: 0, average: 0 };
                return (
                  <div
                    key={tanker.id}
                    onClick={() => setSelectedTankerId(tanker.id)}
                    className={`p-3.5 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                      isSelected
                        ? 'bg-gradient-to-r from-[#1b1f27] to-[#161b22] border-[#ff5a5f]'
                        : 'bg-[#0d1117]/80 border-[#30363d] hover:bg-[#161b22]'
                    }`}
                  >
                    <div>
                      <span className="block text-xs font-black text-white">{tanker.tankerNumber}</span>
                      <span className="text-[10px] text-gray-500 font-mono">Spares Logged: {tanker.parts?.length || 0} items</span>
                    </div>
                    <div className="text-right">
                      <span className="block text-xs font-bold font-mono text-cyan-400">₹{stats.totalSpent.toLocaleString('en-IN')}</span>
                      <span className="text-[8px] text-gray-500 font-mono block">TOT SPENT</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Average expenditure details card */}
          <div className="bg-[#161b22] border border-[#30363d] p-5 rounded-2xl space-y-4">
            <div>
              <span className="text-[9px] bg-[#ff5a1f]/10 text-[#ff7a4e] border border-[#ff5a1f]/20 font-bold px-2 py-0.5 rounded-full font-mono uppercase">
                ⚙️ Mechanical Analytics
              </span>
              <h4 className="text-sm font-black text-white mt-2">Maintenance Average & Running Costs</h4>
              <p className="text-[10.5px] text-gray-400 mt-1 leading-relaxed">
                Aggregated repairs, components, workshop services, and breakdown vouchers for vehicle:
                <strong className="text-white block mt-0.5 font-sans font-black">{activeTanker?.tankerNumber || 'No Tanker Selected'}</strong>
              </p>
            </div>

            <div className="space-y-3 pt-3 border-t border-white/[0.04] text-xs font-mono">
              <div className="flex justify-between">
                <span className="text-gray-400">Total Repair Tickets:</span>
                <span className="font-bold text-white">{activeTankerStats.totalRecordsCount} Items</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Gross Fleet Cost:</span>
                <span className="font-bold text-cyan-400">₹{activeTankerStats.totalSpent.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between p-3.5 bg-black/35 rounded-xl border border-white/[0.02]">
                <span className="text-gray-400 font-semibold uppercase text-[10px]">Average Cost / Issue:</span>
                <span className="font-black text-emerald-400 text-sm">₹{activeTankerStats.average.toLocaleString('en-IN')}</span>
              </div>
            </div>

            <div className="p-3 bg-blue-500/5 border border-blue-500/20 rounded-xl text-[10px] text-blue-400 italic font-mono leading-relaxed">
              * Average reflects total recorded capital divided across work entries. Highly predictive parameter for mechanical replacement schedules.
            </div>
          </div>
        </div>

        {/* Right column: Interactive Tyre mapping and Spare Part logs */}
        <div className="lg:col-span-8 space-y-6">
          {activeTanker ? (
            <div className="bg-[#161b22] border border-[#30363d] rounded-2xl p-6 space-y-6">
              
              {/* Profile Header */}
              <div className="flex justify-between items-center border-b border-[#30363d] pb-4">
                <div>
                  <h3 className="text-lg font-black tracking-tight flex items-center gap-1.5 uppercase text-white">
                    <Truck className="w-5 h-5 text-emerald-400" />
                    Chassis Hardware mapping: {activeTanker.tankerNumber}
                  </h3>
                  <p className="text-xs text-gray-400 font-mono uppercase mt-0.5">PESO certified chemical carrier calibration</p>
                </div>
                <button
                  onClick={() => setShowSparesModal(true)}
                  className="px-3 py-1.5 bg-[#ff5a1f] hover:bg-[#e0450d] text-white text-xs font-bold rounded-xl cursor-pointer transition-all flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  Install Spare Part / Tyre
                </button>
              </div>

              {/* Requirement: confirm tyre changed or not and when was last changed. Interactive layout */}
              <div className="p-5 bg-[#0f0a09] border border-[#2e21if] rounded-2xl space-y-4">
                <div>
                  <h4 className="text-xs font-mono font-extrabold text-[#ff7a4e] uppercase flex items-center gap-1.5">
                    <Activity className="w-4 h-4" />
                    Interactive Tyre Mapping & Serial Verification Grid
                  </h4>
                  <p className="text-[11px] text-[#b8a49c] mt-1 leading-relaxed">
                    Select a tyre position below on the chemical tanker chassis scheme to see the recorded tyre brand, serial number, install date, and verify if it's currently installed or changed recently!
                  </p>
                </div>

                {/* 10-Tyre layout graphic */}
                <div className="flex justify-center items-center py-6 bg-black/40 rounded-xl border border-white/[0.02]">
                  <div className="relative w-64 h-[320px] bg-neutral-900 border border-neutral-800 rounded-3xl p-4 flex flex-col justify-between items-center">
                    {/* Metal chassis spine */}
                    <div className="absolute top-8 bottom-8 left-1/2 -translate-x-1/2 w-4 bg-dashed border-r border-[#ff5a1f]/30 bg-neutral-800 rounded-md z-0" />

                    {/* Front Axle */}
                    <div className="flex justify-between w-full relative z-10">
                      {['Front Left', 'Front Right'].map((pos) => {
                        const tyrePart = tankerParts.find(p => p.name.includes(pos));
                        return (
                          <div
                            key={pos}
                            onClick={() => setActiveTyrePosition(pos)}
                            className={`w-14 h-8 rounded-lg border cursor-pointer transition-all flex flex-col items-center justify-center text-[8px] font-mono font-bold ${
                              tyrePart 
                                ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400 font-bold shadow-md shadow-emerald-500/10' 
                                : 'bg-neutral-800 border-neutral-700 text-neutral-500 hover:border-white/20'
                            }`}
                          >
                            <span>FL</span>
                            <span className="text-[6px] opacity-75">{tyrePart ? 'VERIFIED' : 'EMPTY'}</span>
                          </div>
                        );
                      })}
                    </div>

                    {/* Axle 2 (Chassis middle) */}
                    <div className="flex justify-between w-full relative z-10 my-8">
                      <div className="flex gap-1">
                        {['Chassis L1', 'Chassis L2'].map((pos) => {
                          const tyrePart = tankerParts.find(p => p.name.includes(pos));
                          return (
                            <div
                              key={pos}
                              onClick={() => setActiveTyrePosition(pos)}
                              className={`w-11 h-8 rounded-lg border cursor-pointer transition-all flex flex-col items-center justify-center text-[8px] font-mono leading-none ${
                                tyrePart 
                                  ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400 font-bold shadow-md' 
                                  : 'bg-neutral-800 border-neutral-700 text-neutral-500 hover:border-white/25'
                              }`}
                            >
                              <span>MID</span>
                              <span className="text-[5px] mt-0.5 opacity-60">{tyrePart ? 'ACTIVE' : 'NONE'}</span>
                            </div>
                          );
                        })}
                      </div>
                      <div className="flex gap-1">
                        {['Chassis R1', 'Chassis R2'].map((pos) => {
                          const tyrePart = tankerParts.find(p => p.name.includes(pos));
                          return (
                            <div
                              key={pos}
                              onClick={() => setActiveTyrePosition(pos)}
                              className={`w-11 h-8 rounded-lg border cursor-pointer transition-all flex flex-col items-center justify-center text-[8px] font-mono leading-none ${
                                tyrePart 
                                  ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400 font-bold shadow-md' 
                                  : 'bg-neutral-800 border-neutral-700 text-neutral-500 hover:border-white/25'
                              }`}
                            >
                              <span>MID</span>
                              <span className="text-[5px] mt-0.5 opacity-60">{tyrePart ? 'ACTIVE' : 'NONE'}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Axle 3 (Trailer Back) */}
                    <div className="flex justify-between w-full relative z-10">
                      <div className="flex gap-1">
                        {['Trailer L1', 'Trailer L2'].map((pos) => {
                          const tyrePart = tankerParts.find(p => p.name.includes(pos));
                          return (
                            <div
                              key={pos}
                              onClick={() => setActiveTyrePosition(pos)}
                              className={`w-11 h-8 rounded-lg border cursor-pointer transition-all flex flex-col items-center justify-center text-[8px] font-mono leading-none ${
                                tyrePart 
                                  ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400 font-bold shadow-md' 
                                  : 'bg-neutral-800 border-neutral-700 text-neutral-500 hover:border-white/25'
                              }`}
                            >
                              <span>TRL</span>
                              <span className="text-[5px] mt-0.5 opacity-60">{tyrePart ? 'ACTIVE' : 'NONE'}</span>
                            </div>
                          );
                        })}
                      </div>
                      <div className="flex gap-1">
                        {['Trailer R1', 'Trailer R2'].map((pos) => {
                          const tyrePart = tankerParts.find(p => p.name.includes(pos));
                          return (
                            <div
                              key={pos}
                              onClick={() => setActiveTyrePosition(pos)}
                              className={`w-11 h-8 rounded-lg border cursor-pointer transition-all flex flex-col items-center justify-center text-[8px] font-mono leading-none ${
                                tyrePart 
                                  ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400 font-bold shadow-md' 
                                  : 'bg-neutral-800 border-neutral-700 text-neutral-500 hover:border-white/25'
                              }`}
                            >
                              <span>TRL</span>
                              <span className="text-[5px] mt-0.5 opacity-60">{tyrePart ? 'ACTIVE' : 'NONE'}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Floating Help label */}
                    <div className="text-[7.5px] text-[#b8a49c] font-mono uppercase bg-neutral-950/80 px-2 py-0.5 rounded border border-white/[0.04] z-15">
                      VESSEL REAR TRAILER AXLES (10 TYRES SCHEME)
                    </div>
                  </div>

                  <div className="ml-8 text-xs max-w-sm space-y-3 font-mono">
                    <h5 className="font-extrabold uppercase text-[#ff7a4e] text-[10px] border-b border-white/[0.03] pb-1">Tyre position auditor</h5>
                    
                    {activeTyrePosition ? (
                      <div className="space-y-2 p-4 bg-white/[0.02] border border-white/[0.05] rounded-xl text-[11px] text-gray-300">
                        <div className="flex justify-between items-center bg-black/40 p-2.5 rounded border border-[#30363d] mb-2.5">
                          <span className="font-black text-white">{activeTyrePosition}</span>
                          <span className="text-[8.5px] px-2 py-0.5 bg-emerald-500/10 text-emerald-400 rounded">Axle Selected</span>
                        </div>
                        {(() => {
                          const tyrePart = tankerParts.find(p => p.name.includes(activeTyrePosition));
                          if (tyrePart) {
                            return (
                              <div className="space-y-1 text-[10px]">
                                <p><strong>Serial S/N:</strong> <code className="text-cyan-400 text-xs font-bold">{tyrePart.serialNo}</code></p>
                                <p><strong>Install Date:</strong> <span className="text-white font-bold">{tyrePart.date}</span></p>
                                <p><strong>Brand / Detail:</strong> <span className="text-white text-xs">{tyrePart.detail}</span></p>
                                <div className="mt-4 p-2 bg-emerald-950/20 text-emerald-400 text-[9px] uppercase rounded border border-emerald-500/10 flex items-center gap-1">
                                  <Check className="w-3.5 h-3.5" /> Installed and Active
                                </div>
                              </div>
                            );
                          } else {
                            return (
                              <div className="space-y-2">
                                <p className="text-gray-500 text-[10.5px]">No serialized tyre mapped to this position yet.</p>
                                <button
                                  onClick={() => {
                                    setIsTyreType(true);
                                    setTyrePosition(activeTyrePosition);
                                    setSparePartName('MRF Muscle-Trak Radial');
                                    setSpareInstallDate(new Date().toISOString().split('T')[0]);
                                    setShowSparesModal(true);
                                  }}
                                  className="w-full text-center py-2 bg-[#ff5a1f] hover:bg-[#e0450d] text-white rounded-lg text-[9px] font-bold uppercase transition-all"
                                >
                                  Assign Tyre Serial No.
                                </button>
                              </div>
                            );
                          }
                        })()}
                      </div>
                    ) : (
                      <div className="p-4 bg-white/[0.01] border border-neutral-800 text-gray-500 italic text-[10.5px] rounded-xl">
                        Click on any wheel seat in the chassis diagram to interrogate its tyre serial number, inspect replacement timers, or verify service logs.
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Master Spare Parts table list with verification tracking option */}
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-neutral-900 p-4 rounded-xl border border-[#30363d]">
                  <h4 className="text-xs font-mono font-black uppercase text-white flex items-center gap-1.5">
                    <Database className="w-4 h-4 text-cyan-400" />
                    Serialized Parts & Calibrations Inventory
                  </h4>
                  <input
                    type="text"
                    placeholder="Search serial / part..."
                    value={searchPartSerial}
                    onChange={(e) => setSearchPartSerial(e.target.value)}
                    className="bg-[#0d1117] px-3 py-1.5 border border-[#30363d] rounded-xl text-xs outline-none focus:border-[#ff5a1f] w-48 text-white font-sans"
                  />
                </div>

                {filteredParts.length === 0 ? (
                  <p className="text-xs text-gray-400 italic bg-[#0d1117] p-5 text-center border border-[#30363d] rounded-xl">
                    No matching parts or tyres mapped for this fleet vessel. Try typing a serial above or install a new one!
                  </p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {filteredParts.map(p => {
                      const isTyre = p.name.toLowerCase().includes('tyre');
                      return (
                        <div 
                          key={p.id}
                          className="p-4 bg-[#0d1117] border border-[#30363d] rounded-xl hover:border-white/10 transition-colors space-y-2 relative"
                        >
                          <div className="flex justify-between items-start">
                            <div>
                              <span className="text-[8.5px] font-mono text-gray-500 block">ID: {p.id}</span>
                              <strong className="text-xs font-black text-white">{p.name}</strong>
                            </div>
                            <span className="text-[10px] font-mono bg-cyan-950/40 border border-cyan-500/20 text-cyan-400 px-2 py-0.5 rounded-md font-bold font-mono">
                              S/N: {p.serialNo}
                            </span>
                          </div>

                          <p className="text-[11px] text-gray-400 leading-relaxed font-sans mt-1">{p.detail}</p>

                          <div className="flex justify-between items-center pt-2.5 border-t border-white/[0.04] text-[10px] font-mono text-gray-500">
                            <span>Last Replaced: <span className="text-white font-bold">{p.date}</span></span>
                            
                            <span className="px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-md font-bold text-[8px] uppercase tracking-wide flex items-center gap-1">
                              <BadgeCheck className="w-3 h-3" /> VERIFIED OK
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="text-center py-20 text-gray-500 bg-[#161b22] border border-[#30363d] rounded-2xl">
              <ShieldAlert className="w-12 h-12 mx-auto mb-3 text-gray-600" />
              <p className="text-sm font-semibold text-white">No active tankers configured in registry drawer.</p>
              <p className="text-xs mt-1">Configure vehicle plate registries inside the main control dashboards.</p>
            </div>
          )}
        </div>
      </div>
      ) : (
        <div className="bg-[#0d1117] border border-[#30363d] rounded-2xl overflow-hidden p-1">
          <Ledger
            trips={trips}
            lrs={lrs}
            bills={bills}
            tankers={tankers}
            expenses={expenses}
            onMarkBillCollected={onMarkBillCollected}
            onRegisterMaintenanceBill={onAddBill}
            onDeleteBill={onDeleteBill}
            onDeleteExpense={onDeleteExpense}
            onImportBulkBills={onImportBulkBills}
            onDeleteTrip={onDeleteTrip}
            defaultLedgerType={activeMaintTab === 'repairs' ? 'repair' : 'maintenance'}
          />
        </div>
      )}

      {/* CREATE NEW UNIQUE SPARES Modal */}
      <AnimatePresence>
        {showSparesModal && activeTanker && (
          <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-lg bg-[#161b22] border border-[#30363d] rounded-2xl shadow-2xl p-6"
            >
              <div className="flex justify-between items-center pb-4 border-b border-[#30363d] mb-5">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-1.5 uppercase">
                    <PenTool className="w-5 h-5 text-[#ff5a1f]" />
                    Register Spare Hardware
                  </h3>
                  <p className="text-[10px] text-gray-400 font-mono mt-0.5">INSTALL TO CHASSIS: {activeTanker.tankerNumber}</p>
                </div>
                <button 
                  onClick={() => setShowSparesModal(false)}
                  className="text-gray-400 hover:text-white p-1 hover:bg-white/[0.04] rounded-lg cursor-pointer transition-all"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={submitSpareLog} className="space-y-4 text-xs">
                {/* Is it Tyre selector? */}
                <div>
                  <label className="block text-gray-400 font-mono tracking-wider uppercase mb-1.5">Hardware Item Category</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setIsTyreType(false)}
                      className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                        !isTyreType
                          ? 'bg-[#ff5a1f] border-[#ff5a1f] text-white shadow-md'
                          : 'bg-[#0d1117] border-[#30363d] text-gray-400 hover:text-white'
                      }`}
                    >
                      General Mechanical Part
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsTyreType(true)}
                      className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                        isTyreType
                          ? 'bg-[#ff5a1f] border-[#ff5a1f] text-white shadow-md'
                          : 'bg-[#0d1117] border-[#30363d] text-gray-400 hover:text-white'
                      }`}
                    >
                      Tyre Assembly Replacement
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-gray-400 font-mono tracking-wider uppercase mb-1">Part / Tyre Brand Name *</label>
                    <input 
                      type="text" 
                      required
                      placeholder={isTyreType ? 'e.g. Apollo EnduRace RD' : 'e.g. Teflon Dome Seal Valve'}
                      value={sparePartName}
                      onChange={(e) => setSparePartName(e.target.value)}
                      className="w-full px-4 py-2.5 bg-[#0d1117] border border-[#30363d] rounded-xl text-white outline-none focus:border-[#ff5a1f]"
                    />
                  </div>

                  <div>
                    <label className="block text-gray-400 font-mono tracking-wider uppercase mb-1">Manufacturer Serial Number (S/N) *</label>
                    <input 
                      type="text" 
                      required
                      placeholder="e.g. S-39502-AX9"
                      value={spareSerialNum}
                      onChange={(e) => setSpareSerialNum(e.target.value)}
                      className="w-full px-4 py-2.5 bg-[#0d1117] border border-[#30363d] rounded-xl text-white font-mono outline-none focus:border-[#ff5a1f]"
                    />
                  </div>
                </div>

                {isTyreType && (
                  <div>
                    <label className="block text-gray-400 font-mono tracking-wider uppercase mb-1">Chassis Tyre Seat Position *</label>
                    <select
                      value={tyrePosition}
                      onChange={(e) => setTyrePosition(e.target.value)}
                      className="w-full px-4 py-2.5 bg-[#0d1117] border border-[#30363d] rounded-xl text-white outline-none focus:border-[#ff5a1f]"
                    >
                      {TYRE_POSITIONS.map(p => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <label className="block text-gray-400 font-mono tracking-wider uppercase mb-1">Replacement Date *</label>
                  <input 
                    type="date" 
                    required
                    value={spareInstallDate}
                    onChange={(e) => setSpareInstallDate(e.target.value)}
                    className="w-full px-4 py-2.5 bg-[#0d1117] border border-[#30363d] rounded-xl text-white outline-none focus:border-[#ff5a1f]"
                  />
                </div>

                <div>
                  <label className="block text-gray-400 font-mono tracking-wider uppercase mb-1">Testing Notes & Mechanics Remarks</label>
                  <textarea 
                    rows={2}
                    placeholder="Provide alignment notes, pressure rating checklist, or maintenance invoice attachment comments..."
                    value={sparePartDetails}
                    onChange={(e) => setSparePartDetails(e.target.value)}
                    className="w-full px-4 py-2.5 bg-[#0d1117] border border-[#30363d] rounded-xl text-white outline-none focus:border-[#ff5a1f]"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-3 border-t border-[#30363d]">
                  <button 
                    type="button" 
                    onClick={() => setShowSparesModal(false)}
                    className="px-4 py-2 bg-[#21262d] text-gray-400 hover:text-white rounded-lg cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    className="px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-bold rounded-lg shadow cursor-pointer hover:brightness-110 transition-all font-sans"
                  >
                    Register and Install
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
