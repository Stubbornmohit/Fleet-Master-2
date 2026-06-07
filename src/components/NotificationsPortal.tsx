import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Bell, Check, X, AlertTriangle, Wrench, ShieldAlert, CheckCircle, 
  Clock, ArrowUpRight, ShieldCheck, Mail, Database, Terminal
} from 'lucide-react';
import { MaintenanceBill, TankerExpense, Trip, SystemEvent, Tanker } from '../types';

interface NotificationsPortalProps {
  bills: MaintenanceBill[];
  expenses: TankerExpense[];
  trips: Trip[];
  tankers?: Tanker[];
  currentUser?: any;
  onAddGeneralExpense?: (expense: TankerExpense) => void;
  onVerifyBill: (billId: string) => void;
  onVerifyExpense: (expenseId: string) => void;
  onRejectBill: (billId: string) => void;
  onRejectExpense: (expenseId: string) => void;
}

export default function NotificationsPortal({
  bills,
  expenses,
  trips,
  tankers = [],
  currentUser,
  onAddGeneralExpense,
  onVerifyBill,
  onVerifyExpense,
  onRejectBill,
  onRejectExpense
}: NotificationsPortalProps) {
  const [notifiedDocs, setNotifiedDocs] = React.useState<string[]>([]);
  const [whatsappText, setWhatsappText] = React.useState<string>('Expense fuel 24500 "Refueled 250L at Highway Pump"');
  const [selectedTripId, setSelectedTripId] = React.useState<string>('');
  const [smsDispatchedLogs, setSmsDispatchedLogs] = React.useState<string[]>([]);
  
  // Clean, high-impact filters
  const pendingRepairsFromBills = bills.filter(
    b => b.category === 'repair' && b.isVerifiedByAdmin !== true
  );

  const pendingRepairsFromExpenses = expenses.filter(
    e => e.category === 'repair' && e.isVerifiedByAdmin !== true
  );

  // Total pending verifications count
  const pendingCount = pendingRepairsFromBills.length + pendingRepairsFromExpenses.length;

  // Let's also look for Excess Fuel occurrences in finished/running trips
  // If actual fuel expense implies more than expected fuel estimate, trigger a warning!
  interface FuelAlert {
    tripId: string;
    lrNo: string;
    tankerNumber: string;
    driverName: string;
    expected: number;
    actual: number;
    excess: number;
    excessPercent: number;
  }

  const fuelAlerts: FuelAlert[] = trips
    .map(t => {
      // Estimate liters roughly at Rs. 95 per liter
      const actualLiters = Math.round(t.fuelExpense / 95);
      const expected = Math.round(t.expectedFuelLiters);
      const excess = actualLiters - expected;
      
      return {
        tripId: t.id,
        lrNo: t.lrNo,
        tankerNumber: t.tankerNumber,
        driverName: t.driverName,
        expected,
        actual: actualLiters,
        excess,
        excessPercent: expected > 0 ? Math.round((excess / expected) * 100) : 0
      };
    })
    .filter(alert => alert.excess > 20); // Show alert if excess fuel is greater than 20 Liters!

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 py-6 text-white font-sans selection:bg-[#ff5a1f] selection:text-white">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#30363d] pb-6">
        <div>
          <h2 className="text-2xl font-black uppercase tracking-tight flex items-center gap-2.5">
            <Bell className="w-7 h-7 text-[#ff5a1f] animate-swing" />
            Admin Notifications & Operations Center
          </h2>
          <p className="text-xs text-[#8b949e] font-mono mt-1">
            VERIFY HARDWARE REPAIRS GENUINENESS AND MONITOR REAL-TIME FLEET FUEL ANOMALIES
          </p>
        </div>
        <div className="flex gap-2">
          <span className="text-xs font-bold font-mono px-3 py-1.5 bg-[#ff5a1f]/10 text-[#ff7a4e] border border-[#ff5a1f]/20 rounded-xl flex items-center gap-1.5 uppercase">
            <ShieldAlert className="w-4 h-4" />
            {pendingCount} Pending Reviews
          </span>
          {fuelAlerts.length > 0 && (
            <span className="text-xs font-bold font-mono px-3 py-1.5 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-xl flex items-center gap-1.5 uppercase animate-pulse">
              <AlertTriangle className="w-4 h-4" />
              {fuelAlerts.length} Fuel Alerts
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left column: Repair Audit Panel */}
        <div className="lg:col-span-8 space-y-6">
          <div className="bg-[#161b22] border border-[#30363d] p-6 rounded-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#30363d] pb-3">
              <div>
                <h3 className="text-sm font-bold uppercase text-white tracking-widest flex items-center gap-2">
                  <Wrench className="w-5 h-5 text-rose-450 text-rose-400" />
                  Repair Ledger Validation Queue
                </h3>
                <p className="text-[11px] text-[#8b949e] font-mono mt-0.5">
                  Entries registered are held here. Click 'Verify Genuine' to insert into ledger.
                </p>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 bg-white/[0.04] text-gray-400 rounded-md border border-white/[0.04]">
                QUEUE SIZE: {pendingCount}
              </span>
            </div>

            {pendingCount === 0 ? (
              <div className="p-12 text-center rounded-2xl bg-neutral-900/40 border border-[#30363d] space-y-3">
                <CheckCircle className="w-10 h-10 mx-auto text-emerald-500" />
                <p className="text-sm font-bold text-white">All Repair Entries Verified Genuine</p>
                <p className="text-xs text-[#8b949e]">No unverified garage bills or direct cash tickets require auditing currently.</p>
              </div>
            ) : (
              <div className="space-y-4 max-h-[600px] overflow-y-auto pr-1">
                <AnimatePresence mode="popLayout">
                  {/* Render unverified maintenance bills first */}
                  {pendingRepairsFromBills.map(bill => (
                    <motion.div
                      key={bill.id}
                      initial={{ opacity: 0, scale: 0.98 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="p-4 bg-[#0d1117] border border-[#30363d] rounded-xl relative hover:border-[#ff5a1f]/30 transition-all space-y-3"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="text-[9px] font-mono bg-rose-500/10 border border-rose-500/20 text-rose-400 px-2 py-0.5 rounded font-black uppercase">
                            Supplier Bill Invoice
                          </span>
                          <h4 className="text-sm font-black text-white mt-1.5">{bill.vendorName}</h4>
                          <p className="text-xs text-gray-400 font-mono mt-0.5">Bill No: {bill.billNo} | Dated: {bill.date}</p>
                        </div>
                        <div className="text-right">
                          <span className="block text-base font-black font-mono text-cyan-400">₹{bill.amount.toLocaleString('en-IN')}</span>
                          <span className="text-[9px] text-gray-500 font-mono block uppercase">PENDING AUDIT</span>
                        </div>
                      </div>

                      <div className="p-3 bg-white/[0.02] border border-white/[0.04] rounded-lg">
                        <p className="text-xs text-slate-350 leading-relaxed"><strong className="text-white text-[11px] block font-mono mb-1">REMARKS & DESCRIPTION:</strong>{bill.detail || 'General mechanical parts overhauling'}</p>
                        <div className="flex flex-wrap gap-2 text-[10px] font-mono mt-2.5 text-gray-400">
                          <span>Tanker Plate: <strong className="text-white">{bill.tankerNumber}</strong></span>
                          <span>•</span>
                          <span>Type: <strong className="text-slate-300">{bill.workType || 'Garage repairs'}</strong></span>
                        </div>
                      </div>

                      <div className="flex justify-end gap-2.5 pt-1.5">
                        <button
                          onClick={() => onRejectBill(bill.id)}
                          className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white border border-red-500/20 text-xs font-bold rounded-lg cursor-pointer transition-all flex items-center gap-1"
                        >
                          <X className="w-3.5 h-3.5" /> Reject
                        </button>
                        <button
                          onClick={() => onVerifyBill(bill.id)}
                          className="px-4 py-1.5 bg-emerald-500/15 hover:bg-emerald-500 text-emerald-400 hover:text-white border border-emerald-500/20 text-xs font-black rounded-lg cursor-pointer transition-all flex items-center gap-1 uppercase tracking-wide"
                        >
                          <Check className="w-3.5 h-3.5" /> Verify Genuine
                        </button>
                      </div>
                    </motion.div>
                  ))}

                  {/* Render unverified tanker cash expenses */}
                  {pendingRepairsFromExpenses.map(exp => (
                    <motion.div
                      key={exp.id}
                      initial={{ opacity: 0, scale: 0.98 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="p-4 bg-[#0d1117] border border-[#30363d] rounded-xl relative hover:border-[#ff5a1f]/30 transition-all space-y-3"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="text-[9px] font-mono bg-amber-500/10 border border-amber-500/20 text-amber-500 px-2 py-0.5 rounded font-black uppercase">
                            Direct Cash Expense Ticket
                          </span>
                          <h4 className="text-sm font-black text-white mt-1.5">{exp.vendorName || 'Highway Garage / Driver Cash'}</h4>
                          <p className="text-xs text-gray-400 font-mono mt-0.5">Ticket ID: {exp.id} | Dated: {exp.date}</p>
                        </div>
                        <div className="text-right">
                          <span className="block text-base font-black font-mono text-cyan-400">₹{exp.amount.toLocaleString('en-IN')}</span>
                          <span className="text-[9px] text-gray-500 font-mono block uppercase text-amber-400">CASH REIMBURSEMENT</span>
                        </div>
                      </div>

                      <div className="p-3 bg-white/[0.02] border border-white/[0.04] rounded-lg">
                        <p className="text-xs text-slate-350 leading-relaxed"><strong className="text-white text-[11px] block font-mono mb-1">REMARKS & DESCRIPTION:</strong>{exp.detail}</p>
                        <div className="flex flex-wrap gap-2 text-[10px] font-mono mt-2.5 text-gray-400">
                          <span>Tanker Plate: <strong className="text-white">{exp.tankerNumber}</strong></span>
                          <span>•</span>
                          <span>Category: <strong className="text-slate-300">{exp.workType || 'Mechanical fixes'}</strong></span>
                        </div>
                        {exp.billPhoto && (
                          <div className="mt-2 text-[10px] text-cyan-400 font-mono flex items-center gap-1">
                            📷 Ticket Bill Document Photo Attached
                          </div>
                        )}
                      </div>

                      <div className="flex justify-end gap-2.5 pt-1.5">
                        <button
                          onClick={() => onRejectExpense(exp.id)}
                          className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white border border-red-500/20 text-xs font-bold rounded-lg cursor-pointer transition-all flex items-center gap-1"
                        >
                          <X className="w-3.5 h-3.5" /> Reject
                        </button>
                        <button
                          onClick={() => onVerifyExpense(exp.id)}
                          className="px-4 py-1.5 bg-emerald-500/15 hover:bg-emerald-500 text-emerald-400 hover:text-white border border-emerald-500/20 text-xs font-black rounded-lg cursor-pointer transition-all flex items-center gap-1 uppercase tracking-wide"
                        >
                          <Check className="w-3.5 h-3.5" /> Verify Genuine
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </div>
        </div>

        {/* Right column: Excess Trip Fuel Alert Feed and Interactive Communications Portal */}
        <div className="lg:col-span-4 space-y-6 text-xs text-slate-300 font-sans">
          
          {/* 1. REGULATORY PERMITS EXPIRY MONITOR & SMS SENDER */}
          <div className="bg-[#161b22] border border-[#30363d] p-5 rounded-2xl space-y-4">
            <div>
              <span className="text-[9px] bg-red-500/10 text-red-400 border border-red-500/20 font-bold px-2 py-0.5 rounded-full font-mono uppercase">
                🛡️ CERTIFICATES MONITOR
              </span>
              <h4 className="text-sm font-black text-white mt-2">Tanker Documents Expiry Radar</h4>
              <p className="text-[11.5px] text-gray-400 leading-relaxed mt-1">
                Monitors RC, Fitness, Calibration, and Safety permits. Transmit SMS direct to Admin Mohit (+919723781353).
              </p>
            </div>

            <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
              {(() => {
                const expiringCertificates = (tankers || []).flatMap(tanker => {
                  return Object.entries(tanker.expirations || {}).map(([docType, dateStr]) => {
                    if (!dateStr || dateStr === 'N/A') return null;
                    const expiryDate = new Date(dateStr);
                    const today = new Date();
                    const diffTime = expiryDate.getTime() - today.getTime();
                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                    
                    if (diffDays <= 45) {
                      return {
                        tankerId: tanker.id,
                        tankerNumber: tanker.tankerNumber,
                        docType: docType.toUpperCase(),
                        dateStr,
                        daysLeft: diffDays,
                        status: diffDays < 0 ? 'Expired' : 'Expiring Soon'
                      };
                    }
                    return null;
                  }).filter((x): x is NonNullable<typeof x> => x !== null);
                });

                if (expiringCertificates.length === 0) {
                  return (
                    <div className="py-6 bg-black/25 text-center text-[11px] text-slate-400 italic rounded-xl border border-white/[0.02]">
                      No vehicle document permits are expiring within 45 days. Fully compliant.
                    </div>
                  );
                }

                return expiringCertificates.map((cert, idx) => {
                  const label = `${cert.tankerNumber} - ${cert.docType}`;
                  const hasDispatched = notifiedDocs.includes(label);

                  return (
                    <div key={idx} className="p-3 bg-[#0d1117] border border-[#30363d] rounded-xl space-y-2">
                      <div className="flex justify-between items-center text-[10.5px]">
                        <span className="font-mono font-bold text-white uppercase">{cert.tankerNumber}</span>
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold ${cert.daysLeft < 0 ? 'bg-red-500/10 text-red-500 border border-red-500/20' : 'bg-amber-500/10 text-amber-500 border border-amber-500/20'}`}>
                          {cert.daysLeft < 0 ? 'EXPIRED' : `${cert.daysLeft} DAYS LEFT`}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400">
                        Document Type: <span className="font-bold text-cyan-400 font-mono">{cert.docType}</span> <br/>
                        Expiry Date: <span className="text-slate-200">{cert.dateStr}</span>
                      </p>
                      
                      <button
                        onClick={() => {
                          setNotifiedDocs([...notifiedDocs, label]);
                          const confirmMsg = `📱 SMS Warning Alert Dispatched to Transporter Admin Mohit (+919723781353) for ${cert.tankerNumber}'s ${cert.docType} certificate expiring on ${cert.dateStr}!`;
                          setSmsDispatchedLogs([confirmMsg, ...smsDispatchedLogs]);
                          alert(`Success! SMS Warning transmitted to Mohit.`);
                        }}
                        className={`w-full py-1 text-center font-mono font-bold text-[10px] rounded uppercase flex items-center justify-center gap-1 cursor-pointer transition-all ${
                          hasDispatched 
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                            : 'bg-[#ff5a1f]/10 text-[#ff7a4e] hover:bg-[#ff5a1f] hover:text-white border border-[#ff5a1f]/20'
                        }`}
                      >
                        {hasDispatched ? '✓ SMS Warning Transmitted' : '📞 Notify Admin Mohit (SMS)'}
                      </button>
                    </div>
                  );
                });
              })()}
            </div>
          </div>

          {/* 2. WHATSAPP TRIP STARTER & REMOTE EXPENSE REPLIER SIMULATOR */}
          <div className="bg-[#161b22] border border-[#30363d] p-5 rounded-2xl space-y-4">
            <div>
              <span className="text-[9px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold px-2 py-0.5 rounded-full font-mono uppercase">
                💬 WHATSAPP COMPANION API
              </span>
              <h4 className="text-sm font-black text-white mt-2">WhatsApp Trip & Expense replier</h4>
              <p className="text-[11.5px] text-gray-400 leading-relaxed mt-1">
                Dispatches live L.R. details to drivers and registers instant expenses received via reply messages automatically.
              </p>
            </div>

            {/* Select Trip and simulate notification */}
            <div className="space-y-2 col-span-1">
              <label className="text-[10px] font-mono uppercase text-slate-400">Choose Active Voyager Trip:</label>
              <select
                value={selectedTripId}
                onChange={(e) => setSelectedTripId(e.target.value)}
                className="w-full bg-[#0d1117] border border-[#30363d] text-white p-2 text-xs rounded-lg outline-none font-sans"
              >
                <option value="">-- Click to choose running trip --</option>
                {trips.filter(t => t.status === 'running').map(t => (
                  <option key={t.id} value={t.id}>{t.tankerNumber} [LR: {t.lrNo}] - {t.driverName}</option>
                ))}
              </select>

              <button
                onClick={() => {
                  if (!selectedTripId) {
                    alert('Please select an active voyager trip to simulate the startup dispatch.');
                    return;
                  }
                  const trip = trips.find(t => t.id === selectedTripId);
                  if (!trip) return;

                  const alertString = `💬 WhatsApp Dispatch to User contact number for Trip [${trip.id}]: "New trip starts for Tanker ${trip.tankerNumber} under registered Transporter name! Destination: ${trip.placeTo}. Expected AdBlue load: 120L. Text menu reply 'Expense <workType> <amount> <detail>' to log expenses instantly from anywhere!"`;
                  setSmsDispatchedLogs([alertString, ...smsDispatchedLogs]);
                  alert(`WhatsApp startup particulars successfully dispatched via API! User can reply back to log expenses.`);
                }}
                className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-sans font-black text-xs rounded-xl cursor-pointer shadow-md uppercase tracking-wider transition-all"
              >
                🚀 Simulate WhatsApp Startup Alert
              </button>
            </div>

            {/* Interactive driver replies simulator */}
            <div className="border-t border-[#30363d] pt-3.5 space-y-2.5">
              <h5 className="text-[10.5px] font-mono text-cyan-400 uppercase font-black">Interactive Quick Response presets</h5>
              
              <div className="grid grid-cols-1 gap-1.5 text-[10px]">
                <button 
                  onClick={() => setWhatsappText('Expense fuel 24500 "Loaded 255L Diesel at BPCL Highway Petrol station"')}
                  className="px-2 py-1.5 bg-slate-900/40 hover:bg-slate-900 text-slate-300 text-left rounded border border-[#30363d] truncate"
                >
                  ⛽ Fuel preset: ₹24,500
                </button>
                <button 
                  onClick={() => setWhatsappText('Expense repair 3500 "Tubeless Tyre puncture replacement on highway"')}
                  className="px-2 py-1.5 bg-slate-900/40 hover:bg-slate-900 text-slate-300 text-left rounded border border-[#30363d] truncate"
                >
                  🔧 Tyre Repair preset: ₹3,500
                </button>
                <button 
                  onClick={() => setWhatsappText('Expense maintenance 1500 "Mobil engine coolant fluid replacement"')}
                  className="px-2 py-1.5 bg-slate-900/40 hover:bg-slate-900 text-slate-300 text-left rounded border border-[#30363d] truncate"
                >
                  🛠 Mobil Coolant preset: ₹1,500
                </button>
              </div>

              <div>
                <label className="text-[9.5px] font-mono uppercase text-slate-400 block mb-1">Simulate incoming WhatsApp text payload:</label>
                <input
                  type="text"
                  value={whatsappText}
                  onChange={(e) => setWhatsappText(e.target.value)}
                  placeholder="Expense <category> <amount> <detail>"
                  className="w-full bg-[#0d1117] border border-[#30363d] text-white p-2 rounded-lg outline-none font-mono"
                />
              </div>

              <button
                onClick={() => {
                  if (!selectedTripId) {
                    alert('Please select an active voyager trip to map this remote WhatsApp expense entry.');
                    return;
                  }
                  if (!whatsappText.trim()) {
                    alert('Please input a valid text format response.');
                    return;
                  }

                  // Parse message formats: Expense <category> <amount> <detail>
                  const parts = whatsappText.match(/expense\s+(fuel|repair|adblue|maintenance)\s+(\d+)\s+["']?([^"']+)["']?/i);
                  if (!parts) {
                    alert('Invalid WhatsApp reply format. Must match standard format:\nExpense <category> <amount> "<detail>"');
                    return;
                  }

                  const activeTrip = trips.find(t => t.id === selectedTripId);
                  if (!activeTrip) return;

                  const category = parts[1].toLowerCase() as any;
                  const amtValue = parseFloat(parts[2]);
                  const descValue = parts[3];

                  const whatsappExpense: TankerExpense = {
                    id: `EXP-WA-REPLY-${Date.now()}`,
                    tankerId: activeTrip.tankerNumber, // fallbacks
                    tankerNumber: activeTrip.tankerNumber,
                    vendorName: 'WhatsApp Remote Client Ref',
                    date: new Date().toISOString().substring(0, 10),
                    amount: amtValue,
                    qtyLiters: category === 'fuel' ? Math.round(amtValue / 95) : undefined,
                    billNo: `WA-SMS-${Math.floor(Math.random() * 899) + 100}`,
                    category,
                    workType: category === 'fuel' ? 'Fuel Refill Slip' : category === 'repair' ? 'Workshop Repair' : 'Vendor Accounts',
                    detail: `${descValue} (Approved via interactive WhatsApp SMS response system)`,
                    isVerifiedByAdmin: true,
                    tripId: activeTrip.id
                  };

                  onAddGeneralExpense!(whatsappExpense);
                  
                  const successLog = `✅ Processed WhatsApp remote response for Trip [${activeTrip.id}]: Registered ${category.toUpperCase()} expense of ₹${amtValue.toLocaleString()} successfully inside Central Ledger!`;
                  setSmsDispatchedLogs([successLog, ...smsDispatchedLogs]);
                  alert(`Direct entry complete! Integrated expense added to ${category.toUpperCase()} ledger under trip LR ${activeTrip.lrNo}.`);
                }}
                className="w-full py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-sans font-black text-xs rounded-xl shadow cursor-pointer uppercase tracking-wider transition-all"
              >
                📲 Simulate Send WhatsApp Reply
              </button>
            </div>
          </div>

          {/* 3. SIMULATED SMS & WHATSAPP LOGS TRACKER */}
          {smsDispatchedLogs.length > 0 && (
            <div className="bg-[#161b22] border border-[#30363d] p-4 rounded-2xl space-y-3 font-mono text-[10px]">
              <h5 className="font-extrabold uppercase text-[#ff5a1f] text-[9.5px] border-b border-[#30363d] pb-1.5 flex justify-between items-center">
                <span>📟 SMS & WhatsApp Transmission Logs</span>
                <button 
                  onClick={() => setSmsDispatchedLogs([])}
                  className="px-1 bg-red-400/10 text-red-400 hover:bg-red-400 hover:text-white rounded text-[8px] uppercase tracking-tighter"
                >
                  Clear logs
                </button>
              </h5>
              <div className="space-y-2.5 max-h-[160px] overflow-y-auto pr-1">
                {smsDispatchedLogs.map((log, i) => (
                  <div key={i} className="p-2 bg-black/40 rounded border border-[#30363d] text-cyan-300 leading-relaxed break-words">
                    {log}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 4. ORIGINAL DIESEL ALERT FEED */}
          <div className="bg-[#161b22] border border-[#30363d] p-5 rounded-2xl space-y-4">
            <div>
              <span className="text-[9px] bg-amber-500/10 text-amber-400 border border-amber-500/20 font-bold px-2 py-0.5 rounded-full font-mono uppercase">
                ⚠️ Fuel Anomalies Monitor
              </span>
              <h4 className="text-sm font-black text-white mt-2">Trip Diesel Overconsumption Alerts</h4>
              <p className="text-[11.5px] text-gray-400 leading-relaxed mt-1">
                Real-time tracking triggers when actual logged diesel exceeds estimated routing targets by more than 20 Liters.
              </p>
            </div>

            <div className="space-y-3.5 max-h-[300px] overflow-y-auto pr-1">
              {fuelAlerts.map((alert, i) => (
                <div 
                  key={i}
                  className="p-3.5 bg-amber-500/5 hover:bg-amber-500/10 border border-amber-500/15 rounded-xl space-y-2 text-xs transition-colors"
                >
                  <div className="flex justify-between items-center text-[10.5px]">
                    <span className="font-mono font-bold text-amber-400 uppercase">Trip LR: {alert.lrNo}</span>
                    <span className="px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/20 text-[9px] text-amber-500 font-mono font-bold">
                      +{alert.excess} LITERS OVER
                    </span>
                  </div>
                  
                  <div className="border-t border-amber-500/10 pt-2 text-[11px] space-y-1 text-slate-300">
                    <p>Tanker Number: <strong className="text-white font-mono">{alert.tankerNumber}</strong></p>
                    <p>Driver Name: <strong className="text-white">{alert.driverName}</strong></p>
                    <p>Expected Liters: <span className="text-slate-400">{alert.expected} L</span> | Actual Liters: <span className="text-amber-400 font-black">{alert.actual} L</span></p>
                  </div>

                  <div className="p-2 bg-amber-500/10 rounded-lg text-[9.5px]/relaxed text-amber-500 font-mono italic font-sans dark:text-amber-400">
                    * WARNING: Tanker matches overconsumption threshold by {alert.excessPercent}%. Recommended engine calibration and driver verification check.
                  </div>
                </div>
              ))}

              {fuelAlerts.length === 0 && (
                <div className="py-12 bg-black/25 border border-white/[0.02] rounded-xl text-center text-[11px] text-[#8b949e] italic leading-relaxed">
                  Excellent! All active fleet voyager diesel logs match standard operational parameters perfectly.
                </div>
              )}
            </div>
          </div>

          <div className="p-4 bg-blue-500/5 border border-blue-500/15 rounded-xl text-[10.5px] italic font-mono text-cyan-400 space-y-1.5">
            <h5 className="font-extrabold uppercase text-[10px] text-cyan-400 tracking-wider">🔒 Audit Integrity Rule</h5>
            <p className="leading-relaxed">
              Repair entries validated on this interface are locked automatically. This enforces dual-control accountability over garage spends.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
