import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, Calendar, Shield, Cpu, Tag, Wrench, ChevronRight, X, AlertOctagon, Search, FileText,
  Download
} from 'lucide-react';
import { exportToExcel, exportToPDF } from '../utils/exportUtils';
import { Tanker, Part } from '../types';
import Tanker3D from './Tanker3D';

interface TankersProps {
  tankers: Tanker[];
  onAddPart: (tankerId: string, part: Part) => void;
  onUpdateExpDate: (tankerId: string, docKey: string, date: string) => void;
  onDeleteTanker?: (id: string) => void;
}

export default function Tankers({ tankers, onAddPart, onUpdateExpDate, onDeleteTanker }: TankersProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTankerId, setSelectedTankerId] = useState<string | null>(tankers[0]?.id || null);
  const [showPartModal, setShowPartModal] = useState(false);
  const [selectedPreviewDoc, setSelectedPreviewDoc] = useState<{ key: string, label: string } | null>(null);

  // New Part Form
  const [partName, setPartName] = useState('');
  const [serialNo, setSerialNo] = useState('');
  const [partDetail, setPartDetail] = useState('');

  // Search filter
  const filteredTankers = tankers.filter(t => 
    t.tankerNumber.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const activeTanker = tankers.find(t => t.id === selectedTankerId) || tankers[0];

  const currentDate = new Date('2026-05-23');

  const checkDocStatus = (dateStr?: string) => {
    if (!dateStr) return { status: 'none', label: 'Missing', color: 'text-[#8b949e] border-[#30363d]' };
    const expDate = new Date(dateStr);
    const diffTime = expDate.getTime() - currentDate.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return { status: 'expired', label: 'Expired', color: 'text-red-400 bg-red-900/10 border-red-500/30' };
    } else if (diffDays <= 7) {
      return { status: 'expiring', label: `Expires in ${diffDays}d`, color: 'text-yellow-400 bg-yellow-900/10 border-yellow-500/30 font-bold' };
    } else {
      return { status: 'valid', label: 'Valid', color: 'text-emerald-400 bg-emerald-950/20 border-emerald-500/20' };
    }
  };

  const submitPart = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTanker || !partName || !serialNo) return;

    const newPart: Part = {
      id: `PRT-${Math.floor(1000 + Math.random() * 9000)}`,
      name: partName,
      serialNo,
      date: currentDate.toISOString().split('T')[0],
      detail: partDetail
    };

    onAddPart(activeTanker.id, newPart);
    setShowPartModal(false);

    // reset forms
    setPartName('');
    setSerialNo('');
    setPartDetail('');
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 py-6 selection:bg-[#ff5a5f] selection:text-white">
      {/* Upper header */}
      <div className="border-b border-[#30363d] pb-6">
        <h2 className="text-2xl font-bold text-white tracking-tight">Tanker Registry & Spare Parts Logs</h2>
        <p className="text-xs text-[#8b949e] font-mono mt-1">PESO COMPLIANCE AUDITING, MECHANICAL PARTS SERIAL RECORDS & CALIBRATIONS</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Side: Tanker Picker */}
        <div className="lg:col-span-4 space-y-4">
          <div className="relative">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-[#8b949e]">
              <Search className="w-4 h-4" />
            </span>
            <input 
              type="text" 
              placeholder="Search by tanker number..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#161b22] pl-10 pr-4 py-2 bg-transparent border border-[#30363d] rounded-xl text-xs text-white outline-none focus:border-[#ff5a5f] text-sans"
            />
          </div>

          {/* Export Controls */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => {
                const tankersData = tankers.map(t => ({
                  id: t.id,
                  tankerNumber: t.tankerNumber,
                  status: t.status.toUpperCase(),
                  addedDate: t.addedDate,
                  partsCount: t.parts?.length || 0,
                  rcExp: t.expirations?.rc || 'N/A',
                  fitnessExp: t.expirations?.fitness || 'N/A',
                  calibrationExp: t.expirations?.calibration || 'N/A',
                  permitExp: t.expirations?.permit || 'N/A'
                }));
                const headers = ['Tanker ID', 'Plate Number', 'Current Status', 'Registry Date', 'Spare Parts Installed', 'RC Expiration', 'Fitness Expiration', 'Calibration Expiration', 'National Permit'];
                const keys = ['id', 'tankerNumber', 'status', 'addedDate', 'partsCount', 'rcExp', 'fitnessExp', 'calibrationExp', 'permitExp'];
                exportToExcel('Tankers Asset Registry', headers, keys, tankersData, 'Tankers_Registry_Report.csv');
              }}
              className="px-3 py-2 bg-[#21262d] hover:bg-[#30363d] border border-[#30363d] hover:border-emerald-500/30 text-emerald-400 rounded-lg text-xs font-semibold inline-flex items-center justify-center gap-1.5 transition-all cursor-pointer font-sans"
            >
              <Download className="w-3.5 h-3.5" />
              Excel Export
            </button>
            <button
              onClick={() => {
                const tankersData = tankers.map(t => ({
                  id: t.id,
                  tankerNumber: t.tankerNumber,
                  status: t.status.toUpperCase(),
                  addedDate: t.addedDate,
                  partsCount: t.parts?.length || 0,
                  rcExp: t.expirations?.rc || 'N/A',
                  fitnessExp: t.expirations?.fitness || 'N/A',
                  calibrationExp: t.expirations?.calibration || 'N/A',
                  permitExp: t.expirations?.permit || 'N/A'
                }));
                const headers = ['Tanker ID', 'Plate Number', 'Status', 'Reg Date', 'Parts', 'RC Exp', 'Fitness Exp', 'Calib Exp', 'Permit Exp'];
                const keys = ['id', 'tankerNumber', 'status', 'addedDate', 'partsCount', 'rcExp', 'fitnessExp', 'calibrationExp', 'permitExp'];
                exportToPDF('Tankers Asset Registry', headers, keys, tankersData, 'Tankers_Registry_Report.pdf', 'F02 Petrochem Logistical Asset Compliance Ledger');
              }}
              className="px-3 py-2 bg-[#21262d] hover:bg-[#30363d] border border-[#30363d] hover:border-red-500/30 text-red-400 rounded-lg text-xs font-semibold inline-flex items-center justify-center gap-1.5 transition-all cursor-pointer font-sans"
            >
              <Download className="w-3.5 h-3.5" />
              PDF Export
            </button>
          </div>

          <div className="space-y-2 max-h-[600px] overflow-y-auto">
            {filteredTankers.map((tanker) => {
              const isActive = activeTanker?.id === tanker.id;
              
              // Count warning documents
              const warningsCount = Object.values(tanker.expirations || {}).filter(dateStr => {
                if (!dateStr) return false;
                const expDate = new Date(dateStr);
                const diffTime = expDate.getTime() - currentDate.getTime();
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                return diffDays >= 0 && diffDays <= 7;
              }).length;

              return (
                <div 
                  key={tanker.id}
                  onClick={() => setSelectedTankerId(tanker.id)}
                  className={`p-4 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                    isActive 
                      ? 'bg-gradient-to-r from-[#1b1f27] to-[#161b22] border-[#ff5a5f] shadow' 
                      : 'bg-[#161b22] border-[#30363d] hover:bg-[#21262d]'
                  }`}
                >
                  <div className="space-y-1">
                    <span className="block text-[10px] text-[#8b949e] font-mono uppercase tracking-wide">ID: {tanker.id}</span>
                    <span className="font-bold text-white tracking-tight text-sm block">{tanker.tankerNumber}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {warningsCount > 0 && (
                      <span className="px-2 py-0.5 bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 font-bold font-mono text-[9px] rounded-full">
                        {warningsCount} Warning(s)
                      </span>
                    )}
                    <ChevronRight className="w-4 h-4 text-[#8b949e]" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Side: Detailed Profile */}
        <div className="lg:col-span-8">
          {activeTanker ? (
            <div className="bg-[#161b22] border border-[#30363d] rounded-2xl overflow-hidden p-6 space-y-6">
              
              {/* Profile Header */}
              <div className="flex flex-wrap justify-between items-center gap-4 border-b border-[#30363d] pb-5">
                <div>
                  <h3 className="text-xl font-bold text-white tracking-tight">{activeTanker.tankerNumber}</h3>
                  <p className="text-xs text-[#8b949e] mt-1 font-mono uppercase">SAFETY AUDIT STATUS: 
                    <span className="text-emerald-400 ml-1.5 font-bold">CERTIFIED CONFORMANT</span>
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="inline-flex px-3 py-1 bg-[#ff5a5f]/10 text-[#ff5a5f] text-xs font-bold rounded-full font-mono uppercase tracking-wider border border-[#ff5a5f]/20 font-sans">
                    {activeTanker.status || 'idle'}
                  </span>
                  {onDeleteTanker && (
                    <button
                      onClick={() => onDeleteTanker(activeTanker.id)}
                      className="px-3 py-1.5 bg-rose-500/10 border border-rose-500/20 hover:bg-rose-500 text-rose-400 hover:text-white rounded-xl text-xs font-bold transition-all cursor-pointer inline-flex items-center gap-1 font-mono"
                      title="Move Tanker to System Trash"
                    >
                      Delete
                    </button>
                  )}
                </div>
              </div>

              {/* Interactive 3D Tanker Asset Telemetry card */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-stretch bg-[#120e0d] border border-[#2e2321] rounded-2xl p-4">
                <div className="md:col-span-8 flex flex-col justify-between space-y-3">
                  <div>
                    <span className="text-[10px] bg-[#ff5a1f]/10 text-[#ff7a4e] px-2.5 py-1 rounded-md font-mono uppercase tracking-widest font-bold">
                      Interactive 3D Asset Desk
                    </span>
                    <h4 className="text-sm font-bold text-white mt-2">Vessel Plate Registration: {activeTanker.tankerNumber}</h4>
                    <p className="text-[11px] text-[#b8a49c] leading-relaxed mt-1">
                      Drag left/right to rotate the scale chassis and examine cargo stability ratings. The simulation dynamically parses tanker capacity and active payloads.
                    </p>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center text-xs text-white pt-1">
                    <div className="bg-white/[0.03] p-2 rounded-xl border border-white/[0.04]">
                      <div className="text-[#8c7870] text-[9px] uppercase font-mono">Payload Capacity</div>
                      <div className="font-bold text-emerald-400 mt-0.5">{activeTanker.capacity || '38'} MT</div>
                    </div>
                    <div className="bg-white/[0.03] p-2 rounded-xl border border-white/[0.04]">
                      <div className="text-[#8c7870] text-[9px] uppercase font-mono">Product Group</div>
                      <div className="font-bold text-[#ff7a4e] mt-0.5 truncate">{activeTanker.productGroup || 'Specialty'}</div>
                    </div>
                    <div className="bg-white/[0.03] p-2 rounded-xl border border-white/[0.04]">
                      <div className="text-[#8c7870] text-[9px] uppercase font-mono">Transit State</div>
                      <div className="font-bold text-cyan-400 mt-0.5">{(activeTanker.status || 'idle').toUpperCase()}</div>
                    </div>
                  </div>
                </div>
                <div className="md:col-span-4 min-h-[160px] flex items-center justify-center bg-black/45 rounded-xl border border-white/[0.03] p-2 overflow-hidden relative">
                  <Tanker3D 
                    size="sm"
                    cargoFilling={activeTanker.status === 'running' ? 0.8 : 0.0}
                    colorAccent={activeTanker.status === 'running' ? '#ff5a1f' : '#8b949e'}
                    statusLabel={`3D-${activeTanker.id}`}
                  />
                  <span className="absolute bottom-2 right-2 text-[8px] font-mono text-[#8c7870] tracking-widest uppercase">360° ENGINE AR</span>
                </div>
              </div>

              {/* Regulatory Document Compliance List */}
              <div className="space-y-3">
                <h4 className="text-xs font-mono uppercase tracking-widest text-white flex items-center gap-2">
                  <Shield className="w-4 h-4 text-[#ff5a5f]" />
                  Hazardous Safety & Tank Permits Expiration Monitoring
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  {[
                    { key: 'rc', label: 'RC (Registration Certificate)' },
                    { key: 'fitness', label: 'Fitness Certificate (RTO)' },
                    { key: 'calibration', label: 'Tank Calibration (Volume Record)' },
                    { key: 'permit', label: 'State Transport Permit' },
                    { key: 'nationalPermit', label: 'All India National Permit' },
                    { key: 'suraksha', label: 'Hazardous Cargo Suraksha' },
                    { key: 'explosiveLicense', label: 'PESO Explosive License' },
                    { key: 'gTax', label: 'Goods Tax Receipts' },
                    { key: 'insurance', label: 'Third-Party Cargo Insurance' }
                  ].map((doc) => {
                    const expiry = (activeTanker?.expirations as any)?.[doc.key];
                    const statusVal = checkDocStatus(expiry);

                    return (
                      <div 
                        key={doc.key} 
                        onClick={() => setSelectedPreviewDoc({ key: doc.key, label: doc.label })}
                        className="p-3 bg-[#0d1117] border border-[#30363d] hover:border-[#ff5a1f]/50 hover:bg-white/[0.01] rounded-xl flex items-center justify-between gap-2.5 cursor-pointer transition-all"
                        title={`Click to preview certificate: ${doc.label}`}
                      >
                        <div className="space-y-0.5 max-w-[70%]">
                          <span className="font-semibold text-white block truncate hover:text-[#ff7a4e] transition-colors">{doc.label}</span>
                          <span className="text-[10px] text-[#8b949e] block font-mono">
                            {expiry ? `Expires: ${expiry}` : 'No date registered'}
                          </span>
                        </div>
                        <div>
                          <span className={`px-2.5 py-1 rounded text-[10px] border font-mono ${statusVal.color}`}>
                            {statusVal.label}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Spare Parts Tracking */}
              <div className="space-y-4 pt-4 border-t border-[#30363d]">
                <div className="flex justify-between items-center">
                  <h4 className="text-xs font-mono uppercase tracking-widest text-white flex items-center gap-2">
                    <Cpu className="w-4 h-4 text-emerald-400" />
                    Special Spare Parts Serial Logs & Audits
                  </h4>
                  <button 
                    onClick={() => setShowPartModal(true)}
                    className="text-xs text-[#58a6ff] hover:underline font-semibold font-mono uppercase inline-flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Record New Part
                  </button>
                </div>

                {(!activeTanker.parts || activeTanker.parts.length === 0) ? (
                  <p className="text-xs text-[#8b949e] italic bg-[#0d1117] p-4 text-center border border-[#30363d] rounded-xl">
                    No critical parts logs registered for this tanker yet. (Valves, caps, brake drums, seals etc.)
                  </p>
                ) : (
                  <div className="space-y-2.5">
                    {activeTanker.parts.map((p) => (
                      <div key={p.id} className="p-4 bg-[#0d1117] border border-[#30363d] rounded-xl text-xs flex flex-wrap justify-between gap-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2.5">
                            <span className="font-bold text-white text-sm">{p.name}</span>
                            <span className="px-2 py-0.5 bg-[#21262d] text-emerald-400 border border-[#30363d] font-mono rounded text-[10px]">
                              S/N: {p.serialNo}
                            </span>
                          </div>
                          <p className="text-[#8b949e] text-xs leading-relaxed max-w-xl">{p.detail}</p>
                        </div>
                        <div className="text-right text-[#8b949e] font-mono text-[10px]">
                          <div>Log Dated</div>
                          <div className="text-white mt-1 font-semibold">{p.date}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>
          ) : (
            <div className="text-center py-20 text-[#8b949e]">
              <AlertOctagon className="w-12 h-12 mx-auto mb-3" />
              <p className="text-sm font-semibold text-white">No active tankers configured</p>
              <p className="text-xs mt-1">Configure tankers on the main controls dashboard to start tracking records.</p>
            </div>
          )}
        </div>

      </div>

      {/* New Part Modal Drawer */}
      {showPartModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-full max-w-4xl bg-[#171312] border border-[#2e2321] rounded-[32px] shadow-[0_24px_64px_rgba(0,0,0,0.9)] p-6"
          >
            <div className="flex justify-between items-center pb-4 border-b border-[#2e2321] mb-5">
              <div>
                <h3 className="text-lg font-bold text-white uppercase tracking-wider">Record Spare Part Hardware</h3>
                <p className="text-[10px] text-[#b8a49c] font-mono mt-0.5">LOGGING DEPLOYED MAINTENANCE TO VESSEL: {activeTanker?.tankerNumber}</p>
              </div>
              <button 
                onClick={() => setShowPartModal(false)} 
                className="text-gray-400 hover:text-white p-2 hover:bg-white/[0.04] border border-transparent hover:border-white/[0.06] rounded-xl cursor-pointer transition-all"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
              
              {/* Left Column: Form */}
              <div className="md:col-span-7">
                <form onSubmit={submitPart} className="space-y-4 text-xs font-sans">
                  <div>
                    <label className="block text-xs font-mono text-[#b8a49c] uppercase mb-1.5 font-bold">Hardware Part Name *</label>
                    <input 
                      type="text" 
                      required
                      placeholder="e.g. Teflon Dome Seal, Gasket High-Pressure"
                      value={partName}
                      onChange={(e) => setPartName(e.target.value)}
                      className="w-full px-4 py-3 bg-[#120e0d] border border-[#2e2321] rounded-xl text-white outline-none focus:border-[#ff5a1f]/60"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-mono text-[#b8a49c] uppercase mb-1.5 font-bold">Mfr. Serial Number (S/N) *</label>
                    <input 
                      type="text" 
                      required
                      placeholder="Mfr. engraving ID or code"
                      value={serialNo}
                      onChange={(e) => setSerialNo(e.target.value)}
                      className="w-full px-4 py-3 bg-[#120e0d] border border-[#2e2321] rounded-xl text-white outline-none focus:border-[#ff5a1f]/50 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-mono text-[#b8a49c] uppercase mb-1.5 font-bold">Replacement Reason / Technical Details *</label>
                    <textarea 
                      required
                      rows={3}
                      placeholder="Explain why part replaced, testing parameters, or calibration readings..."
                      value={partDetail}
                      onChange={(e) => setPartDetail(e.target.value)}
                      className="w-full px-4 py-3 bg-[#120e0d] border border-[#2e2321] rounded-xl text-white outline-none focus:border-[#ff5a1f]/50"
                    />
                  </div>

                  <div className="flex justify-end gap-3 pt-4 border-t border-[#2e2321]">
                    <button 
                      type="button" 
                      onClick={() => setShowPartModal(false)}
                      className="px-4 py-2 bg-[#21262d] text-[#8b949e] hover:text-white rounded-lg font-semibold"
                    >
                      Cancel
                    </button>
                    <button 
                      type="submit" 
                      className="px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-bold rounded-lg shadow cursor-pointer transition-all hover:brightness-110"
                    >
                      Register Spare Log
                    </button>
                  </div>
                </form>
              </div>

              {/* Right Column: 3D Visualizer */}
              <div className="md:col-span-5 flex flex-col justify-between h-full bg-[#120e0d] border border-[#2e2321] p-4 rounded-2xl">
                <div className="space-y-3">
                  <span className="text-[9px] font-mono text-[#ff7a4e] uppercase tracking-widest font-bold block">
                    🛡️ Interactive Vessel Calibration Map
                  </span>
                  
                  <div className="bg-black/45 rounded-xl border border-white/[0.03] p-1 overflow-hidden h-[180px] flex items-center justify-center">
                    <Tanker3D 
                      size="sm"
                      cargoFilling={0.1}
                      colorAccent="#10b981"
                      statusLabel="SPARES CALIBRATION"
                    />
                  </div>

                  <div className="space-y-1 text-[10px] font-mono text-[#b8a49c] leading-relaxed">
                    <p>
                      <strong>Vessel Identification:</strong> {activeTanker?.tankerNumber}
                    </p>
                    <p>
                      <strong>Class Group:</strong> {activeTanker?.productGroup || 'Liquefied Chemicals'}
                    </p>
                    <p className="mt-2 text-[9px] text-[#8c7870] uppercase">
                      * Fitting spare parts requires certifying seal pressure and issuing chemical leak checks dynamically on the 3D model scale chassis.
                    </p>
                  </div>
                </div>

                <div className="p-3 bg-[#e05612]/10 border border-[#e05612]/20 rounded-xl text-[9px] text-[#ff7a4e] uppercase font-mono tracking-wide leading-normal">
                  All spare parts logged here are saved in physical audit logs for inspection by PESO authorities.
                </div>
              </div>

            </div>
          </motion.div>
        </div>
      )}

      {/* REQ FEATURE: GOVERNMENT COOP STYLE SIMULATED CERTIFICATE PREVIEW MODAL */}
      <AnimatePresence>
        {selectedPreviewDoc && activeTanker && (
          <div className="fixed inset-0 z-50 bg-black/92 backdrop-blur-md flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-2xl bg-[#161b22] border border-[#30363d] rounded-[24px] overflow-hidden shadow-2xl flex flex-col"
            >
              <div className="px-6 py-4.5 bg-[#1b1f29] border-b border-[#30363d] flex items-center justify-between">
                <div>
                  <span className="text-[9px] font-mono text-[#ff5a1f] bg-[#ff5a1f]/10 border border-[#ff5a1f]/20 px-2 py-0.5 rounded uppercase font-bold block w-fit mb-1">
                    Regulatory Credential Viewer
                  </span>
                  <h3 className="text-sm font-black text-white uppercase tracking-tight">
                    {selectedPreviewDoc.label} - {activeTanker.tankerNumber}
                  </h3>
                </div>
                <button
                  onClick={() => setSelectedPreviewDoc(null)}
                  className="p-1 px-2 bg-[#21262d] hover:bg-red-500/10 hover:text-red-400 text-[#8b949e] border border-[#30363d] rounded-lg text-xs font-mono cursor-pointer"
                >
                  Close Document preview
                </button>
              </div>

              {/* Physical Document Simulation */}
              <div className="p-8 bg-zinc-900 flex justify-center items-center">
                <div className="w-full max-w-lg bg-emerald-50/95 shadow-2xl rounded-2xl p-6 text-neutral-800 font-serif border-4 border-double border-emerald-800 relative overflow-hidden flex flex-col justify-between min-h-[380px]">
                  
                  {/* Decorative Watermark background */}
                  <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex items-center justify-center opacity-[0.04] pointer-events-none select-none">
                    <Shield className="w-64 h-64 text-emerald-900" />
                  </div>

                  {/* Top Certificate Header spacing */}
                  <div className="text-center space-y-1 z-10 select-none pb-4 border-b border-emerald-800/20">
                    <span className="text-[9px] uppercase tracking-widest text-[#5d4037] block font-sans font-black">
                      GOVERNMENT OF BHARAT • REVENUE DEPARTMENT
                    </span>
                    <h4 className="text-base font-bold text-emerald-900 tracking-tight uppercase leading-none">
                      REGULATORY PHYSICAL SHIPMENT AND TRANSPORT COMPLIANCE
                    </h4>
                    <span className="text-[8px] italic font-sans block text-neutral-500">
                      PESO Explosives, Hazardous Chemical & Tank Safety Certification
                    </span>
                  </div>

                  {/* Real-looking content details list */}
                  <div className="py-6 space-y-3.5 text-xs font-sans z-10">
                    <div className="flex justify-between border-b border-neutral-300 pb-1.5 font-mono text-[10px]">
                      <span className="text-neutral-500 uppercase">Document Class Reference:</span>
                      <strong className="text-emerald-950">PESO-{selectedPreviewDoc.key.toUpperCase()}-GJ39-OK</strong>
                    </div>

                    <div className="grid grid-cols-2 gap-x-6 gap-y-3 pt-1">
                      <div>
                        <span className="text-[10px] text-neutral-500 block uppercase font-mono">Chassis Plate No:</span>
                        <strong className="text-neutral-900 font-bold block">{activeTanker.tankerNumber}</strong>
                      </div>
                      
                      <div>
                        <span className="text-[10px] text-neutral-500 block uppercase font-mono">Cargo Product Class:</span>
                        <strong className="text-neutral-900 font-bold block">{activeTanker.productGroup || 'Liquefied Petrol Chemicals'}</strong>
                      </div>
                      
                      <div>
                        <span className="text-[10px] text-neutral-500 block uppercase font-mono">Certificate Expiration:</span>
                        <strong className="text-rose-700 font-black block">
                          {(activeTanker.expirations as any)?.[selectedPreviewDoc.key] || '2026-11-20'}
                        </strong>
                      </div>

                      <div>
                        <span className="text-[10px] text-neutral-500 block uppercase font-mono">Authorization Level:</span>
                        <strong className="text-emerald-800 font-black block">PESO STAMP APPROVED</strong>
                      </div>
                    </div>

                    <div className="pt-4 border-t border-neutral-300/40 text-[9.5px] text-neutral-600 leading-normal italic font-sans">
                      This certificate validates chemical carrier compliance under rule 18(2) of hazardous transportations. Safe load weight is rated on PESO weighbridge calibration index. Keep this digital docket attached in the cab terminal.
                    </div>
                  </div>

                  {/* Stamp, Hologram, and Barcode footer */}
                  <div className="flex justify-between items-end border-t border-emerald-800/20 pt-4 z-10">
                    {/* Simulated barcode using typography lines */}
                    <div className="font-mono text-[7px] text-neutral-400 bg-white p-1 rounded border border-neutral-200">
                      <div className="h-6 w-24 bg-[repeating-linear-gradient(90deg,transparent,transparent_2px,#000_2px,#000_4px)]" />
                      <div className="text-center text-[6px] tracking-widest text-neutral-600 mt-1 select-all">
                        *GJ2951-{activeTanker.id.toUpperCase()}*
                      </div>
                    </div>

                    {/* Government Holographic emblem sticker representation */}
                    <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-yellow-300 via-emerald-400 to-[#ff5a1f] p-0.5 border-2 border-emerald-800/20 flex items-center justify-center shadow-lg transform rotate-6 border-dashed">
                      <div className="w-full h-full rounded-full bg-white/70 backdrop-blur-xs flex items-center justify-center font-bold text-[6px] text-emerald-950 font-sans text-center uppercase tracking-tighter">
                        PESO SEALS<br />VALIDAT.
                      </div>
                    </div>
                  </div>

                </div>
              </div>

              {/* Modal footer file details */}
              <div className="px-6 py-4 bg-[#1b1f29] border-t border-[#30363d] flex justify-between items-center text-xs font-mono">
                <div className="space-y-0.5">
                  <span className="text-gray-500 block text-[9px]">ACTIVE FILENAME PATH:</span>
                  <span className="text-cyan-400 font-bold select-all">
                    COMPLIANCE_GJ39_{selectedPreviewDoc.key.toUpperCase()}_{activeTanker.tankerNumber.replace(/[^A-Za-z0-9]/g, '')}_SECURED.pdf
                  </span>
                </div>
                <button
                  onClick={() => setSelectedPreviewDoc(null)}
                  className="px-5 py-2.5 bg-[#ff5a1f] hover:bg-[#e0450d] text-white font-bold rounded-xl cursor-pointer"
                >
                  Done Previewing
                </button>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
