import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, Navigation, FileText, CheckCircle2, DollarSign, Activity, Wrench, 
  MapPin, Clock, Calendar, Truck, User, ArrowRight, Printer, AlertCircle, Info, ChevronRight
} from 'lucide-react';

export interface DetailField {
  label: string;
  value: string;
  color?: string;
}

export interface ProgressStep {
  label: string;
  active: boolean;
  completed: boolean;
}

interface ShipmateDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;          // e.g., "Shipment Detail"
  subtitle?: string;      // e.g., "Truck logistics audit view"
  trackingId: string;     // e.g., "TRIP-2026-A451" or "LR-7892-A"
  status: string;         // e.g., "In Transit", "Delivered", "Paid", etc.
  statusType?: 'pending' | 'success' | 'alert' | 'info' | 'running';
  source: string;         // "Miami" or "Jamnagar"
  destination: string;    // "Los Angeles" or "Vadodara"
  date?: string;          // Pickup date
  time?: string;          // Pickup time
  estDeliveryDate?: string;
  amount?: string;        // Price, billing, or transaction value
  driverName?: string;
  tankerNumber?: string;
  productName?: string;
  fields?: DetailField[];
  steps?: ProgressStep[];
  onPrint?: () => void;
}

export default function ShipmateDetailModal({
  isOpen,
  onClose,
  title,
  subtitle,
  trackingId,
  status,
  statusType = 'info',
  source,
  destination,
  date = 'May 25, 2026',
  time = '10:30 AM',
  estDeliveryDate,
  amount,
  driverName,
  tankerNumber,
  productName,
  fields = [],
  steps = [],
  onPrint
}: ShipmateDetailModalProps) {
  if (!isOpen) return null;

  // Derive status badge styling
  const getBadgeStyles = () => {
    const s = status.toLowerCase();
    if (s.includes('transit') || s.includes('running') || s.includes('progress')) {
      return {
        bg: 'bg-blue-500/10 border-blue-500/20 text-blue-400',
        dot: 'bg-blue-400 animate-pulse'
      };
    }
    if (s.includes('deliver') || s.includes('complete') || s.includes('paid') || s.includes('collected') || s.includes('receipt') || s.includes('success')) {
      return {
        bg: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400',
        dot: 'bg-emerald-400'
      };
    }
    if (s.includes('pending') || s.includes('awaiting') || s.includes('due') || s.includes('unpaid')) {
      return {
        bg: 'bg-amber-500/10 border-amber-500/20 text-amber-400',
        dot: 'bg-amber-400 animate-pulse'
      };
    }
    if (s.includes('contra') || s.includes('journal')) {
      return {
        bg: 'bg-purple-500/10 border-purple-500/20 text-purple-400',
        dot: 'bg-purple-400'
      };
    }
    return {
      bg: 'bg-slate-500/10 border-slate-500/20 text-slate-400',
      dot: 'bg-slate-400'
    };
  };

  const badge = getBadgeStyles();

  // Pick default progress timeline if none supplied
  const defaultSteps: ProgressStep[] = [
    { label: 'Booking Request', active: false, completed: true },
    { label: 'Loaded/Dispatched', active: false, completed: true },
    { label: 'In Route Transit', active: status.toLowerCase().includes('transit') || status.toLowerCase().includes('running'), completed: status.toLowerCase().includes('deliver') || status.toLowerCase().includes('complete') },
    { label: 'Discharged & Signed', active: false, completed: status.toLowerCase().includes('deliver') || status.toLowerCase().includes('complete') }
  ];

  const renderSteps = steps.length > 0 ? steps : defaultSteps;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto bg-black/80 backdrop-blur-md">
        
        {/* Backdrop close */}
        <div className="absolute inset-0 cursor-default" onClick={onClose} />

        {/* Modal Container */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="relative w-full max-w-lg bg-[#0e0c0c] border border-white/[0.08] shadow-2xl rounded-[32px] overflow-hidden group font-sans text-left flex flex-col max-h-[92vh]"
        >
          {/* Neon gradient highlights inspired by Shipmate/Movbot reference graphics */}
          <div className="absolute top-0 left-1/4 right-1/4 h-[1px] bg-gradient-to-r from-transparent via-[#ff5a1f]/35 to-transparent pointer-events-none" />
          <div className="absolute top-0 right-0 w-36 h-36 bg-[#ff5a1f]/[0.02] rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-44 h-44 bg-blue-500/[0.02] rounded-full blur-3xl pointer-events-none" />

          {/* PHONE-LIKE PREMIUM DESIGN CONTAINER HEADER */}
          <div className="px-6 pt-6 pb-4 flex justify-between items-center bg-[#131111]/70 border-b border-white/[0.03] backdrop-blur-lg sticky top-0 z-10">
            <div className="flex items-center gap-3">
              <button 
                onClick={onClose}
                className="w-10 h-10 rounded-full flex items-center justify-center bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.06] text-gray-300 hover:text-white transition-all cursor-pointer"
              >
                <ChevronRight className="w-5 h-5 rotate-180" />
              </button>
              <div className="text-left">
                <span className="text-[10px] font-mono uppercase tracking-widest text-amber-500 block font-bold">SHIPMATE INTEL</span>
                <h3 className="text-base font-bold text-white tracking-tight">{title}</h3>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {onPrint && (
                <button
                  onClick={onPrint}
                  className="w-9 h-9 rounded-full flex items-center justify-center bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.06] text-emerald-400 hover:text-emerald-300 transition-all cursor-pointer"
                  title="Print Copy"
                >
                  <Printer className="w-4 h-4" />
                </button>
              )}
              <button 
                onClick={onClose}
                className="w-9 h-9 rounded-full flex items-center justify-center bg-white/[0.03] hover:bg-rose-500/25 border border-white/[0.06] text-gray-400 hover:text-rose-400 transition-all cursor-pointer"
              >
                <X className="w-4.5 h-4.5" />
              </button>
            </div>
          </div>

          {/* SCROLLABLE INTERMEDIATE CARD LAYOUT BODY */}
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5 scrollbar-thin">
            
            {/* 1. TOP HEADER TRACKING ID & STATUS ROW */}
            <div className="flex justify-between items-center bg-[#131111] p-4 border border-white/[0.04] rounded-2.5xl">
              <div>
                <span className="text-gray-500 text-[10px] uppercase font-mono tracking-wider">Docket / Log Voucher ID</span>
                <strong className="text-sm text-gray-100 font-mono block tracking-tight mt-0.5">{trackingId}</strong>
              </div>

              <div className={`px-3 py-1.5 border rounded-xl font-mono text-center flex items-center gap-1.8 text-xs font-bold uppercase shrink-0 ${badge.bg}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />
                <span>{status}</span>
              </div>
            </div>

            {/* 2. DYNAMIC GEOGRAPHIC ROUTING MAP PREVIEW (PRECISED ILLUSTRATIVE VECTOR MAP) */}
            <div className="h-40 rounded-[24px] bg-[#141212] border border-white/[0.04] relative overflow-hidden p-4 flex flex-col justify-between">
              
              {/* Futuristic Map Grid lines */}
              <div className="absolute inset-0 opacity-15 pointer-events-none bg-[radial-gradient(#ff5a1f_1px,transparent_1px)] [background-size:16px_16px]" />
              
              {/* Dynamic Path lines with glowing effects */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <svg className="w-[85%] h-full" viewBox="0 0 340 160">
                  {/* Outer line curve */}
                  <path 
                    d="M 40 100 Q 170 20, 300 100" 
                    fill="none" 
                    stroke="rgba(255, 90, 31, 0.12)" 
                    strokeWidth="4" 
                    strokeLinecap="round"
                  />
                  <path 
                    d="M 40 100 Q 170 20, 300 100" 
                    fill="none" 
                    stroke="rgba(59, 130, 246, 0.4)" 
                    strokeWidth="2.5" 
                    strokeDasharray="5,5" 
                    strokeLinecap="round"
                  />
                  
                  {/* Running animation dot if route is active */}
                  {status.toLowerCase().includes('transit') || status.toLowerCase().includes('running') ? (
                    <circle r="4" fill="#3b82f6" className="animate-pulse">
                      <animateMotion dur="5s" repeatCount="indefinite" path="M 40 100 Q 170 20, 300 100" />
                    </circle>
                  ) : null}

                  {/* Marker Nodes */}
                  <circle cx="40" cy="100" r="6" fill="#131111" stroke="#3b82f6" strokeWidth="2.5" />
                  <circle cx="300" cy="100" r="6" fill="#131111" stroke="#22c55e" strokeWidth="2.5" />
                </svg>
              </div>

              {/* Source label */}
              <div className="absolute left-6 bottom-4 text-left">
                <div className="flex items-center gap-1.5">
                  <MapPin className="w-3 h-3 text-blue-400" />
                  <span className="text-[10px] text-gray-500 font-mono uppercase tracking-wider block">Origin Hub</span>
                </div>
                <strong className="text-xs font-extrabold text-white font-sans mt-0.5 truncate block max-w-[120px]">{source}</strong>
                <span className="text-[8.5px] text-gray-500 font-mono tracking-tight block mt-0.5">{date}</span>
              </div>

              <div className="text-center absolute left-1/2 -translate-x-1/2 top-4">
                <span className="inline-flex items-center gap-1 bg-[#ff5a1f]/10 text-[#ff7a4e] border border-[#ff5a1f]/15 text-[8.5px] font-mono px-2 py-0.5 rounded-full uppercase tracking-widest font-black">
                  <Activity className="w-2.5 h-2.5 animate-pulse" />
                  Real-time Tracking
                </span>
              </div>

              {/* Destination Label */}
              <div className="absolute right-6 bottom-4 text-right">
                <div className="flex items-center gap-1.5 justify-end">
                  <span className="text-[10px] text-gray-500 font-mono uppercase tracking-wider block">Receipt Hub</span>
                  <MapPin className="w-3 h-3 text-emerald-400" />
                </div>
                <strong className="text-xs font-extrabold text-white font-sans mt-0.5 truncate block max-w-[120px]">{destination}</strong>
                <span className="text-[8.5px] text-gray-500 font-mono tracking-tight block mt-0.5">{estDeliveryDate || 'Completed Delivery'}</span>
              </div>
            </div>

            {/* 3. PERIWINKLE BLUE SHIPMATE OVERLAY CARD GRID ROW (FROM-TO SUMMARY STYLED CARD) */}
            <div className="bg-[#1f3fd5]/10 border border-[#1f3fd5]/20 p-4 rounded-3xl space-y-3 relative overflow-hidden">
              <div className="absolute -right-6 -bottom-6 w-24 h-24 bg-blue-600/10 rounded-full blur-xl pointer-events-none" />
              
              <div className="flex items-center justify-between gap-4">
                <div className="flex-1 text-left min-w-0">
                  <span className="text-[8.5px] text-[#8699fe] uppercase font-mono tracking-widest block font-bold">FROM DISPATCH</span>
                  <strong className="text-sm text-white font-extrabold tracking-tight truncate block mt-0.5">{source}</strong>
                  <span className="text-[9px] text-[#a0aefe] font-mono block mt-0.5">EST. DEPARTURE {time}</span>
                </div>

                <div className="w-7 h-7 rounded-full bg-blue-500/25 border border-blue-500/20 flex items-center justify-center shrink-0">
                  <ArrowRight className="w-3.5 h-3.5 text-white" />
                </div>

                <div className="flex-1 text-right min-w-0">
                  <span className="text-[8.5px] text-[#8699fe] uppercase font-mono tracking-widest block font-bold">TO DESTINATION</span>
                  <strong className="text-sm text-white font-extrabold tracking-tight truncate block mt-0.5">{destination}</strong>
                  <span className="text-[9px] text-[#a0aefe] font-mono block mt-0.5">RECEIPT AND UNLOAD ACTIVE</span>
                </div>
              </div>

              <div className="h-px bg-white/[0.05] my-2" />

              <div className="grid grid-cols-2 gap-4 text-xs">
                <div className="text-left font-mono">
                  <span className="text-[9px] text-[#8699fe] block uppercase tracking-wider font-extrabold">Freight Charge</span>
                  <strong className="text-sm text-yellow-400 font-black tracking-tight mt-0.5 block">{amount || '₹0.00'}</strong>
                </div>
                <div className="text-right font-mono">
                  <span className="text-[9px] text-[#8699fe] block uppercase tracking-wider font-extrabold">Delivery Category</span>
                  <strong className="text-sm text-gray-100 font-extrabold tracking-tight mt-0.5 block truncate uppercase">{productName || 'Chemical Fluid load'}</strong>
                </div>
              </div>
            </div>

            {/* 4. REAL-TIME TRANSIT MILESTONE TIMELINE */}
            <div className="bg-[#131111] border border-white/[0.04] p-4.5 rounded-[22px] space-y-3.5 text-xs text-left">
              <span className="text-[9.5px] font-mono text-gray-500 uppercase tracking-widest block font-bold">Logistics Milestone Status Timeline</span>
              
              <div className="relative flex justify-between items-center pt-2 px-1">
                {/* Horizontal progress background connector */}
                <div className="absolute top-[17px] left-4 right-4 h-0.5 bg-white/[0.04] z-0" />
                
                {/* Highlight active path */}
                <div 
                  className="absolute top-[17px] left-4 h-0.5 bg-blue-500 transition-all duration-500 z-0" 
                  style={{
                    width: renderSteps.find(s => s.active)
                      ? `${(renderSteps.findIndex(s => s.active) / (renderSteps.length - 1)) * 100}%`
                      : renderSteps.every(s => s.completed) ? '100%' : '50%'
                  }}
                />

                {renderSteps.map((step, sIdx) => {
                  const isDone = step.completed;
                  const isCur = step.active;
                  
                  return (
                    <div key={sIdx} className="flex flex-col items-center z-10 relative">
                      <div className={`w-6.5 h-6.5 rounded-full border flex items-center justify-center text-[10px] font-bold transition-all ${
                        isDone 
                          ? 'bg-blue-500 text-white border-blue-500 shadow-md shadow-blue-900/30' 
                          : isCur 
                          ? 'bg-[#0f131a] text-yellow-400 border-yellow-500 animate-pulse scale-110 shadow-lg shadow-yellow-950/20' 
                          : 'bg-[#131111] text-gray-500 border-white/[0.06]'
                      }`}>
                        {isDone ? (
                          <CheckCircle2 className="w-3.5 h-3.5 stroke-[2.5]" />
                        ) : (
                          <span>{sIdx + 1}</span>
                        )}
                      </div>
                      <span className={`text-[8.5px] font-mono tracking-tight mt-1.5 block max-w-[80px] text-center ${
                        isDone ? 'text-gray-100 font-bold' : isCur ? 'text-yellow-400 font-bold' : 'text-gray-500'
                      }`}>
                        {step.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 5. SPLIT INFORMATION DATA FIELDS GRID */}
            {fields.length > 0 && (
              <div className="space-y-3.5">
                <span className="text-[9.5px] font-mono text-gray-500 uppercase tracking-widest block font-bold">Ledger Docket Attributes Detail Grid</span>
                
                <div className="grid grid-cols-2 gap-3">
                  {fields.map((f, fIdx) => (
                    <div key={fIdx} className="bg-[#121010] p-3 border border-white/[0.04] rounded-2xl flex flex-col justify-between text-left h-16">
                      <span className="text-[8.5px] text-gray-500 font-mono uppercase tracking-wider block">{f.label}</span>
                      <strong className={`text-[12px] truncate font-mono tracking-tight ${f.color || 'text-white'}`}>{f.value}</strong>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 6. CORRESPONDENT RIG / OPERATOR ASSIGNED ACCENT INFO */}
            {(driverName || tankerNumber) && (
              <div className="bg-[#121010] p-4.5 border border-white/[0.04] rounded-2.5xl flex items-center justify-between text-xs">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-amber-500/20 to-blue-500/25 border border-white/[0.08] flex items-center justify-center text-white font-mono font-bold font-sans uppercase">
                    {driverName ? driverName.split(' ')[0][0] : <User className="w-4 h-4 text-[#8b949e]" />}
                  </div>
                  <div className="text-left font-sans">
                    <span className="text-[9px] text-gray-500 font-mono uppercase tracking-widest block">OPERATOR SIGNED IN</span>
                    <strong className="text-xs text-white block mt-0.5">{driverName || 'Verified Corporate Operator'}</strong>
                    <span className="text-[9px] text-[#ff5a1f]/80 mt-0.5 block font-mono uppercase font-semibold">Duty Plate: {tankerNumber || 'None Associated'}</span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="inline-flex items-center gap-1.5 bg-[#ff5a1f]/10 border border-[#ff5a1f]/20 text-[#ff7a4e] font-mono px-2 py-1 roundedtext-[8.5px] rounded-lg tracking-wider font-bold">
                    <Truck className="w-3 h-3 text-amber-500" />
                    CHEMICAL TANKER CLASS-I
                  </span>
                </div>
              </div>
            )}

          </div>

          {/* CARD FOOTER WITH ACTION BUTTONS */}
          <div className="p-6 bg-[#131111]/90 border-t border-white/[0.03] flex gap-3 text-xs justify-end sticky bottom-0 z-10 backdrop-blur-lg">
            <button 
              onClick={onClose}
              className="px-4 py-2.5 border border-white/[0.08] text-gray-400 hover:text-white hover:bg-white/[0.03] transition-all rounded-xl font-bold font-mono uppercase cursor-pointer"
            >
              Back to ledger
            </button>
            {onPrint && (
              <button 
                onClick={onPrint}
                className="px-5 py-2.5 bg-gradient-to-r from-[#ff5a1f] to-[#ff2a1a] hover:opacity-95 text-white shadow-xl shadow-red-950/20 font-bold font-sans rounded-xl tracking-tight cursor-pointer flex items-center gap-1.5 transition-all duration-200"
              >
                <Printer className="w-4 h-4" />
                <span>Print Official copy</span>
              </button>
            )}
          </div>

        </motion.div>
      </div>
    </AnimatePresence>
  );
}
