import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, ShieldAlert, Award, FileText, CheckCircle2, 
  Calendar, Wrench, ChevronRight, UserPlus, Shield, Clipboard, ArrowRight, X,
  MapPin, Compass, Navigation, TrendingUp, DollarSign, Activity, Users, Truck, AlertTriangle,
  ClipboardList, CreditCard, BookOpen, BarChart2
} from 'lucide-react';
import { Tanker, Driver, LorryReceipt, Trip, MaintenanceBill, SystemEvent } from '../types';
import { FleetMasterStore } from '../utils/storage';
import InteractiveTransport3D from './InteractiveTransport3D';
import SmartTransitCalculator from './SmartTransitCalculator';

// ----------------------------------------------------
// NEXT-GENERATION FUTURISTIC COMMAND CENTER WIDGETS
// ----------------------------------------------------

function ChemicalLogisticsLiveMap({ activeTrips }: { activeTrips: any[] }) {
  const [selectedTripId, setSelectedTripId] = useState<string | null>(null);
  const [hoveredTripId, setHoveredTripId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [cargoFilter, setCargoFilter] = useState<'all' | 'fluids' | 'solids'>('all');

  // Coordinates for Western Indian chemical corridor hubs (Gujarat state) on a 320x240 box
  const locations = [
    { name: 'Jamnagar', x: 50, y: 130, color: '#3b82f6', desc: 'Reliance Petrochemical Refinery' },
    { name: 'Dahej', x: 170, y: 150, color: '#ff5a1f', desc: 'Mega Chemical Port Terminal' },
    { name: 'Ankleshwar', x: 210, y: 140, color: '#10b981', desc: 'Acids & Solvent Industrial Hub' },
    { name: 'Hazira', x: 160, y: 210, color: '#f59e0b', desc: 'Hazira Heavy Manufacturing Port' },
    { name: 'Ranoli', x: 230, y: 80, color: '#ec4899', desc: 'Ranoli Chemical Complex & GIDC' },
    { name: 'Ahmedabad', x: 260, y: 40, color: '#8b5cf6', desc: 'North Gujarat Logistics Hub' },
  ];

  // Map of core physical logistics connecting pipelines/highways
  const paths = [
    { from: 'Jamnagar', to: 'Ranoli', d: 'M 50,130 Q 140,85 230,80' },
    { from: 'Ranoli', to: 'Dahej', d: 'M 230,80 Q 200,115 170,150' },
    { from: 'Dahej', to: 'Ankleshwar', d: 'M 170,150 L 210,140' },
    { from: 'Ankleshwar', to: 'Hazira', d: 'M 210,140 Q 185,175 160,210' },
    { from: 'Ahmedabad', to: 'Ranoli', d: 'M 260,40 L 230,80' },
    { from: 'Jamnagar', to: 'Dahej', d: 'M 50,130 Q 110,180 170,150' },
  ];

  // City lookup helper
  const getCityCoords = (cityName: string) => {
    const name = cityName.toLowerCase();
    if (name.includes('jamnagar')) return { x: 50, y: 130 };
    if (name.includes('dahej')) return { x: 170, y: 150 };
    if (name.includes('ankleshwar')) return { x: 210, y: 140 };
    if (name.includes('hazira')) return { x: 160, y: 210 };
    if (name.includes('ranoli') || name.includes('vadodara')) return { x: 230, y: 80 };
    if (name.includes('ahmedabad')) return { x: 260, y: 40 };
    
    // Hash-based placement to handle custom cities beautifully
    let hash = 0;
    for (let i = 0; i < cityName.length; i++) {
      hash = cityName.charCodeAt(i) + ((hash << 5) - hash);
    }
    const x = 80 + Math.abs(hash % 160);
    const y = 60 + Math.abs((hash >> 2) % 130);
    return { x, y };
  };

  // Safe progress calculation
  const getProgressVal = (trip: any) => {
    if (trip.progress !== undefined) return trip.progress;
    if (!trip.startDate) return 50;
    const pDate = new Date(trip.startDate);
    const refDate = new Date('2026-05-23');
    const elapsed = Math.max(0, (refDate.getTime() - pDate.getTime()) / (1000 * 60 * 60 * 24));
    return Math.min(Math.max(Math.round((elapsed / 4) * 100), 12), 88);
  };

  const matchedTrips = activeTrips.map((trip) => {
    const progress = getProgressVal(trip);
    return {
      id: trip.id,
      tankerNumber: trip.tankerNumber,
      driverName: trip.driverName,
      placeFrom: trip.placeFrom,
      placeTo: trip.placeTo,
      product: trip.qtyUnit === 'KL' ? 'Petrochemical Liquid' : 'Liquified Gas Carrier',
      progress,
      loadingWeight: trip.loadingWeight || 25,
      qtyUnit: trip.qtyUnit || 'MT',
      statusText: progress > 80 ? 'Approaching Port Area' : progress > 45 ? 'Cruising Regional Arterial' : 'Departing Complex Gates',
      lastSweep: 'Active Loop Tracker'
    };
  });

  const consolidatedTrips = matchedTrips;

  const filteredTrips = consolidatedTrips.filter(t => {
    const matchesSearch = t.tankerNumber.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          t.placeFrom.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          t.placeTo.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          t.driverName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCargo = cargoFilter === 'all' || 
                         (cargoFilter === 'fluids' && t.qtyUnit === 'KL') || 
                         (cargoFilter === 'solids' && t.qtyUnit === 'MT');
    return matchesSearch && matchesCargo;
  });

  // Calculate coordinates using quadratic bezier arcs
  const getTripCoords = (trip: any) => {
    const start = getCityCoords(trip.placeFrom);
    const end = getCityCoords(trip.placeTo);
    const t = trip.progress / 100;

    const cx = (start.x + end.x) / 2 + (start.y - end.y) * 0.18;
    const cy = (start.y + end.y) / 2 + (end.x - start.x) * 0.18;

    const x = (1 - t) * (1 - t) * start.x + 2 * (1 - t) * t * cx + t * t * end.x;
    const y = (1 - t) * (1 - t) * start.y + 2 * (1 - t) * t * cy + t * t * end.y;

    return { x, y };
  };

  const selectedTrip = filteredTrips.find(t => t.id === selectedTripId) || filteredTrips[0];

  return (
    <div className="bg-[#141212] border border-white/[0.08] rounded-[28px] p-6 relative overflow-hidden shadow-2xl group transition-all duration-350 hover:border-[#ff5a1f]/20">
      {/* Blueprint Grid */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle, #ff7a4e 1.2px, transparent 1.2px)', backgroundSize: '16px 16px' }} />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 relative z-10 text-left">
        {/* SVG Viewport */}
        <div className="lg:col-span-8 flex flex-col justify-between">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4.5">
            <div className="space-y-0.5">
              <span className="text-[10px] font-mono text-emerald-400 font-extrabold uppercase tracking-widest flex items-center gap-1.5 leading-none">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                ACTIVE TRANSIT VESSELS
              </span>
              <p className="text-sm font-black text-white tracking-tight">Active Chemical Cargo Logistics Monitor</p>
            </div>
            
            <div className="text-[9px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 rounded-full px-2.5 py-1 uppercase tracking-wide font-semibold flex items-center gap-1.5 self-start sm:self-auto select-none">
              <span className="w-1 h-1 rounded-full bg-emerald-500 animate-ping" />
              Live Telemetry Tracking
            </div>
          </div>

          {/* List of active en route tankers with real-time progress bars */}
          <div className="bg-[#0b0a0a]/80 border border-white/[0.03] rounded-2xl overflow-y-auto p-4 shadow-inner space-y-2 max-h-[340px] md:max-h-[385px] scrollbar-thin">
            {filteredTrips.map((trip) => {
              const isSelected = selectedTripId === trip.id || (selectedTripId === null && selectedTrip?.id === trip.id);
              return (
                <div 
                  key={trip.id}
                  onClick={() => setSelectedTripId(trip.id)}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                    isSelected 
                      ? 'bg-[#ff5a1f]/10 border-[#ff5a1f]/40 text-white shadow' 
                      : 'bg-[#121010]/60 border-white/[0.03] text-gray-450 hover:border-white/[0.08] hover:bg-[#121010]/95'
                  }`}
                >
                  <div className="flex items-center gap-3 text-left">
                    <div className={`p-2 rounded-lg font-mono text-xs font-bold leading-none shrink-0 ${
                      isSelected ? 'bg-[#ff5a1f]/15 text-[#ff7a4e]' : 'bg-white/[0.03] text-gray-300'
                    }`}>
                      {trip.tankerNumber}
                    </div>
                    <div className="text-left space-y-0.5">
                      <div className="text-xs font-bold text-white uppercase tracking-tight flex items-center gap-1.5">
                        <span>{trip.placeFrom}</span>
                        <ArrowRight className="w-3 h-3 text-gray-500" />
                        <span className="text-[#ff7a4e]">{trip.placeTo}</span>
                      </div>
                      <div className="text-[10px] text-gray-500 font-sans">
                        Driver: <strong className="text-gray-300 font-medium">{trip.driverName}</strong> | Cargo: <strong className="text-gray-400">{trip.product}</strong>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col sm:items-end gap-1.5 shrink-0 max-w-[150px] w-full text-left sm:text-right">
                    <div className="w-full bg-[#1c1919] h-1.5 rounded-full overflow-hidden">
                      <div 
                        className="bg-gradient-to-r from-blue-500 to-[#ff5a1f] h-full rounded-full" 
                        style={{ width: `${trip.progress}%` }}
                      />
                    </div>
                    <div className="flex justify-between items-center w-full text-[9px] font-mono leading-none">
                      <span className="text-[9.5px] uppercase font-bold text-cyan-400">{trip.loadingWeight} {trip.qtyUnit}</span>
                      <span className="text-gray-400 font-bold">{trip.progress}% route</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex justify-between items-center text-[9px] font-mono text-gray-550 border-t border-white/[0.04] pt-2 mt-2 leading-none">
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
              Active System Sweep Frequency: 1.2s Hz
            </span>
            <span>SYSTEM CONSOLE LOGS: OK</span>
          </div>
        </div>

        {/* Tactical Inspector Panel (4 Cols) */}
        <div className="lg:col-span-4 bg-[#0b0a0a]/90 border border-white/[0.03] rounded-2xl p-4 flex flex-col justify-between h-full space-y-4">
          <div className="space-y-3.5">
            {/* Control search and filters */}
            <div className="space-y-1.5">
              <input 
                type="text" 
                placeholder="Scan license, route..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#121010] border border-[#21262d] rounded-xl px-2.5 py-1.5 text-xs text-white placeholder-gray-600 font-mono focus:outline-none focus:border-[#ff5a1f] transition-all"
              />

              {/* Segment pills */}
              <div className="flex gap-1.5 overflow-x-auto scrollbar-none pb-0.5">
                {(['all', 'fluids', 'solids'] as const).map((filter) => (
                  <button
                    key={filter}
                    onClick={() => setCargoFilter(filter)}
                    className={`px-3 py-1 font-mono text-[8.5px] uppercase tracking-wider border rounded-lg transition-all cursor-pointer select-none shrink-0 ${
                      cargoFilter === filter 
                        ? 'bg-[#ff5a1f]/15 border-[#ff5a1f]/35 text-[#ff7a4e] font-bold' 
                        : 'bg-transparent border-[#21262d] text-gray-500 hover:border-gray-600 hover:text-gray-300'
                    }`}
                  >
                    {filter === 'all' ? 'All Units' : filter === 'fluids' ? 'Fluids (KL)' : 'Solids (MT)'}
                  </button>
                ))}
              </div>
            </div>

            {/* Live dossier inspector logs */}
            <div className="space-y-3 text-left">
              <span className="text-[9px] font-mono text-gray-400 uppercase tracking-widest font-extrabold block">
                📡 SPECIFIC TELEMETRY DOSSIER
              </span>

              {selectedTrip ? (
                <div className="space-y-3.5 font-mono">
                  {/* Selected vehicle profile */}
                  <div className="bg-[#121010] p-3 rounded-xl border border-white/[0.03] space-y-1.5">
                    <div className="flex justify-between items-center text-xs">
                      <strong className="text-white text-[12.5px] font-sans tracking-tight">{selectedTrip.tankerNumber}</strong>
                      <span className="text-[9.5px] text-[#ff7a4e] font-bold bg-[#ff5a1f]/10 border border-[#ff5a1f]/20 px-1.5 py-0.5 rounded leading-none">
                        {selectedTrip.id}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-[9.5px] text-[#8b949e]">
                      <span>Operator: {selectedTrip.driverName}</span>
                      <span className="text-cyan-400 font-bold">{selectedTrip.lastSweep}</span>
                    </div>
                  </div>

                  {/* Route progress Visual ledger */}
                  <div className="bg-[#121010] p-3 rounded-xl border border-white/[0.03] space-y-2">
                    <div className="flex justify-between items-center text-[10px] leading-none">
                      <span className="text-gray-500">Departure Hub:</span>
                      <strong className="text-gray-200 uppercase">{selectedTrip.placeFrom}</strong>
                    </div>
                    <div className="flex justify-between items-center text-[10px] leading-none">
                      <span className="text-gray-500">Destination Port:</span>
                      <strong className="text-[#ff7a4e] uppercase">{selectedTrip.placeTo}</strong>
                    </div>

                    <div className="pt-2 space-y-1">
                      <div className="w-full bg-[#21262d] h-1 rounded-full overflow-hidden">
                        <div 
                          className="bg-gradient-to-r from-blue-500 to-[#ff5a1f] h-full rounded-full" 
                          style={{ width: `${selectedTrip.progress}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-[8px] text-gray-500">
                        <span>Departed</span>
                        <span className="text-white font-bold">{selectedTrip.progress}% en-route</span>
                        <span>Terminal Arrival</span>
                      </div>
                    </div>
                  </div>

                  {/* Cargo weights specs */}
                  <div className="grid grid-cols-2 gap-2 text-[9.5px] leading-none">
                    <div className="bg-[#121010] p-2.5 rounded-xl border border-white/[0.03]">
                      <span className="text-gray-500 block">CARGO LOAD</span>
                      <strong className="text-white font-semibold block mt-1 truncate max-w-[90px]">{selectedTrip.product}</strong>
                    </div>
                    <div className="bg-[#121010] p-2.5 rounded-xl border border-white/[0.03]">
                      <span className="text-gray-500 block">NET PAYLOAD</span>
                      <strong className="text-cyan-400 font-extrabold block mt-1">{selectedTrip.loadingWeight} {selectedTrip.qtyUnit}</strong>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-gray-500 italic py-6">No matching en-route fleet matches. Clear filters to scan again.</p>
              )}
            </div>
          </div>

          <div className="border-t border-white/[0.04] pt-2 mt-2 font-mono text-[8px] text-gray-400 flex justify-between items-center leading-none">
            <span>GRID MAP SWEEP: SECURE</span>
            <span className="text-[#ff5a1f] font-bold">READY</span>
          </div>
        </div>
      </div>
    </div>
  );
}



function FuelCalculatorShortcut() {
  const [origin, setOrigin] = useState('Ranoli');
  const [destination, setDestination] = useState('Dahej');
  const [customDistance, setCustomDistance] = useState<number | null>(null);
  const [loadWeight, setLoadWeight] = useState<number>(25); // Default load weight 25 MT

  const ROUTE_DISTANCES: Record<string, number> = {
    "ranoli-dahej": 110,
    "dahej-ranoli": 110,
    "ranoli-hazira": 175,
    "hazira-ranoli": 175,
    "vadodara-jamnagar": 330,
    "jamnagar-vadodara": 330,
    "jamnagar-dahej": 420,
    "dahej-jamnagar": 420,
    "mumbai-hazira": 280,
    "hazira-mumbai": 280,
    "ankleshwar-dahej": 45,
    "dahej-ankleshwar": 45,
    "ranoli-ankleshwar": 90,
    "ankleshwar-ranoli": 90,
    "ranoli cluster-dahej terminal": 110,
    "ranoli cluster-hazira port": 175,
    "dahej terminal-hazira port": 135
  };

  const getCalculatedDistance = () => {
    if (customDistance !== null) return customDistance;
    const lookupKey = `${origin.trim().toLowerCase()}-${destination.trim().toLowerCase()}`;
    if (ROUTE_DISTANCES[lookupKey]) {
      return ROUTE_DISTANCES[lookupKey];
    }
    let hash = 0;
    const combined = lookupKey;
    for (let i = 0; i < combined.length; i++) {
      hash = combined.charCodeAt(i) + ((hash << 5) - hash);
    }
    const finalDist = Math.abs(100 + (hash % 600));
    return finalDist;
  };

  const distance = getCalculatedDistance();
  
  // Calculate dynamic fuel efficiency kmPerLiter based on load weight:
  // 10 MT (Empty) -> 4.8 Km/L, 45 MT (Full Load) -> 1.8 Km/L
  const kmPerLiter = 4.8 - ((loadWeight - 10) / (45 - 10)) * (4.8 - 1.8);
  const fuelLiters = parseFloat((distance / kmPerLiter).toFixed(1));
  const estDieselPrice = 95.00; // Diesel cost ₹95/L
  const totalCost = parseFloat((fuelLiters * estDieselPrice).toFixed(2));

  // Determine gauge pointer angle: 1.0 Km/L (-90 deg) to 5.0 Km/L (+90 deg)
  const ratio = Math.min(Math.max((kmPerLiter - 1.0) / (5.0 - 1.0), 0), 1);
  const needleAngle = -90 + (ratio * 180);

  const quickRoutes = [
    { from: 'Ranoli', to: 'Dahej', dist: 110 },
    { from: 'Ranoli', to: 'Hazira', dist: 175 },
    { from: 'Ankleshwar', to: 'Dahej', dist: 45 },
    { from: 'Vadodara', to: 'Jamnagar', dist: 330 },
  ];

  return (
    <div className="bg-[#020202] border border-orange-500/30 rounded-2xl p-4 flex flex-col justify-between min-h-[460px] h-full relative overflow-hidden group gaming-hud">
      {/* Scan line effect */}
      <div className="scan-line pointer-events-none" />
      <div className="absolute inset-0 opacity-[0.02] pointer-events-none bg-[radial-gradient(circle_at_center,_#22c55e_1px,_transparent_1px)]" style={{ backgroundSize: '10px 10px' }} />

      <div className="flex justify-between items-center z-10">
        <div className="space-y-0.5 text-left">
          <span className="text-[10px] font-cyber text-orange-500 font-extrabold uppercase tracking-widest block leading-none">
            ⚡ 5-AXLE FUEL COMPUTER HUD
          </span>
          <p className="text-[8.5px] font-mono text-gray-400 uppercase">Interactive Route & Load Estimations</p>
        </div>
        <span className="text-[8.5px] font-cyber bg-green-500/10 text-green-400 border border-green-500/20 px-1.5 py-0.5 rounded leading-none font-bold">
          {kmPerLiter.toFixed(1)} Km/L
        </span>
      </div>

      {/* Origin & Destination Inputs */}
      <div className="grid grid-cols-2 gap-2 my-2 text-left z-10">
        <div>
          <label className="text-[7.5px] text-[#8b949e] uppercase font-mono block">Origin Hub</label>
          <input 
            type="text" 
            value={origin} 
            onChange={(e) => { setOrigin(e.target.value); setCustomDistance(null); }}
            className="w-full px-2 py-1 bg-black border border-[#21262d] focus:border-orange-500 rounded text-xs text-white font-mono uppercase"
          />
        </div>
        <div>
          <label className="text-[7.5px] text-[#8b949e] uppercase font-mono block">Destination Port</label>
          <input 
            type="text" 
            value={destination} 
            onChange={(e) => { setDestination(e.target.value); setCustomDistance(null); }}
            className="w-full px-2 py-1 bg-black border border-[#21262d] focus:border-orange-500 rounded text-xs text-white font-mono uppercase"
          />
        </div>
      </div>

      {/* Quick Select Buttons */}
      <div className="flex gap-1 overflow-x-auto pb-1 z-10 scrollbar-none text-left">
        {quickRoutes.map((qr, i) => (
          <button
            key={i}
            onClick={() => {
              setOrigin(qr.from);
              setDestination(qr.to);
              setCustomDistance(qr.dist);
            }}
            className="shrink-0 bg-[#0d1015] hover:bg-orange-950/20 hover:border-orange-500 text-[8.5px] text-gray-300 font-mono px-2 py-0.5 border border-[#21262d] rounded transition-all cursor-pointer"
          >
            {qr.from}➔{qr.to}
          </button>
        ))}
      </div>

      {/* Dynamically controlled Load Weight slider */}
      <div className="space-y-1 my-2 text-left z-10">
        <div className="flex justify-between items-center font-mono text-[8.5px] leading-none">
          <span className="text-[#8b949e] uppercase">Active Load Weight:</span>
          <strong className="text-orange-400 font-bold">{loadWeight} Metric Tons (MT)</strong>
        </div>
        <input 
          type="range" 
          min="10" 
          max="45" 
          step="1"
          value={loadWeight}
          onChange={(e) => setLoadWeight(parseInt(e.target.value))}
          className="w-full accent-orange-500 bg-[#161b22] h-1 rounded-full outline-none cursor-ew-resize"
        />
      </div>

      {/* FUEL CONSUMPTION RADAR / SVG ANALOG DIAL GAUGE */}
      <div className="flex items-center justify-center my-1.5 z-10 relative overflow-visible h-28 bg-[#090b10] border border-white/[0.04] rounded-xl p-1">
        <svg viewBox="0 0 180 100" className="w-full h-full max-w-[150px] overflow-visible select-none">
          {/* Base outer outline glow ring */}
          <path 
            d="M 20 85 A 70 70 0 0 1 160 85" 
            fill="none" 
            stroke="rgba(255, 90, 31, 0.05)" 
            strokeWidth="11" 
            strokeLinecap="round" 
          />
          {/* Gauge colored reference bands */}
          {/* Poor fuel rating sector - orange-red */}
          <path d="M 20 85 A 70 70 0 0 1 65 27" fill="none" stroke="#ef4444" strokeWidth="8" strokeOpacity="0.8" />
          {/* Medium fuel rating sector - amber */}
          <path d="M 65 27 A 70 70 0 0 1 115 27" fill="none" stroke="#f59e0b" strokeWidth="8" strokeOpacity="0.8" />
          {/* Ecological fuel rating sector - emerald */}
          <path d="M 115 27 A 70 70 0 0 1 160 85" fill="none" stroke="#10b981" strokeWidth="8" strokeOpacity="0.8" />

          {/* Smooth custom hardware accelerated gauge indicators */}
          {/* Dynamic rotating needle */}
          <g 
            style={{ 
              transform: `translate(90px, 85px) rotate(${needleAngle}deg)`,
              transformOrigin: '90px 85px',
              transition: 'transform 0.6s cubic-bezier(0.25, 1.25, 0.5, 1.15)'
            }}
          >
            {/* Center Cap core pin */}
            <circle cx="0" cy="0" r="8" fill="#141111" stroke="#ff5a1f" strokeWidth="2.5" />
            <circle cx="0" cy="0" r="3" fill="#ffffff" />
            {/* Extended needle element */}
            <path d="M -2.5 0 L -1 -65 L 0 -72 L 1 -65 L 2.5 0 Z" fill="#ff5a1f" />
            <circle cx="0" cy="-45" r="1.5" fill="#ffffff" />
          </g>

          {/* Digital overlays */}
          <text x="90" y="78" textAnchor="middle" className="fill-white font-mono font-black text-[13px] tracking-tight">{kmPerLiter.toFixed(1)}</text>
          <text x="90" y="93" textAnchor="middle" className="fill-gray-400 font-mono text-[7px] uppercase tracking-wider font-semibold">KmPerLiter</text>
          
          <text x="18" y="98" textAnchor="middle" className="fill-[#ef4444] font-cyber text-[6px] font-black tracking-wide">HEAVY</text>
          <text x="162" y="98" textAnchor="middle" className="fill-[#10b981] font-cyber text-[6px] font-black tracking-wide font-bold">LIGHT</text>
        </svg>
      </div>

      {/* Fuel Summary panel */}
      <div className="bg-black border border-green-500/20 rounded-xl p-3 space-y-1.5 text-[11px] font-mono text-left relative z-10">
        <div className="flex justify-between items-center border-b border-[#21262d]/50 pb-1">
          <span>Target Fuel Load Coefficient:</span>
          <strong className="text-white font-cyber text-[9px] uppercase">
            {loadWeight > 32 ? 'High Load 5-Axle' : loadWeight > 18 ? 'Medium Standard' : 'Eco Empty Lorry'}
          </strong>
        </div>
        <div className="flex justify-between items-center">
          <span>Calculated Trip Mileage:</span>
          <strong className="text-white font-semibold">{kmPerLiter.toFixed(2)} KM/Ltr</strong>
        </div>
        <div className="flex justify-between items-center">
          <span>Route Net Distance:</span>
          <strong className="text-white font-bold">{distance} KM</strong>
        </div>
        <div className="flex justify-between items-center">
          <span>Heavy Diesel Reqd:</span>
          <strong className="text-orange-400 font-extrabold">{fuelLiters} Liters</strong>
        </div>
        <div className="flex justify-between items-center text-green-400">
          <span>Diesel Cost (₹95/L):</span>
          <strong className="font-bold text-green-300">₹{totalCost.toLocaleString(undefined, {minimumFractionDigits: 1})}</strong>
        </div>
      </div>

      <div className="flex justify-between items-center text-[8px] font-cyber text-gray-500 border-t border-[#21262d]/40 pt-1 leading-none mt-2">
        <span>OPTIMIZED HEAVY FLUID ROUTING</span>
        <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
      </div>
    </div>
  );
}

function LoadMassDistribution({ activeTrips }: { activeTrips: any[] }) {
  const totalWeight = activeTrips.reduce((acc, t) => acc + (t.loadingWeight || 0), 0);
  const klWeight = activeTrips.filter(t => t.qtyUnit === 'KL').reduce((acc, t) => acc + (t.loadingWeight || 0), 0);
  const mtWeight = activeTrips.filter(t => t.qtyUnit === 'MT').reduce((acc, t) => acc + (t.loadingWeight || 0), 0);

  const totalDisplay = totalWeight || 1;
  const ptMt = totalWeight ? Math.round((mtWeight / totalDisplay) * 100) : 0;
  const ptKl = totalWeight ? Math.round((klWeight / totalDisplay) * 100) : 0;

  return (
    <div className="bg-[#0f131a] border border-[#21262d] rounded-2xl p-5 flex flex-col justify-between h-64 relative overflow-hidden group">
      <div className="absolute bottom-0 left-0 w-28 h-28 bg-purple-500/5 rounded-full blur-2xl pointer-events-none" />

      <div className="space-y-1">
        <span className="text-[9px] font-mono text-[#8b949e] uppercase tracking-wider block">IN-TRANSIT CONTAINER PAYLOAD</span>
        <div className="flex items-baseline gap-1.5">
          <strong className="text-2xl font-black text-white tracking-tight">{totalWeight.toLocaleString()}</strong>
          <span className="text-[10px] text-[#8b949e] font-mono font-bold">GROSS METRIC RATIO</span>
        </div>
      </div>

      <div className="space-y-3.5 pb-2">
        <div className="space-y-1">
          <div className="flex justify-between text-[10px] font-mono leading-none">
            <span className="text-[#8b949e]">METRIC TONS (MT) SOLIDS</span>
            <span className="text-orange-400 font-bold">{mtWeight} MT ({ptMt}%)</span>
          </div>
          <div className="w-full bg-[#161b22] h-1.5 rounded-full overflow-hidden">
            <motion.div 
              className="bg-gradient-to-r from-orange-500 to-yellow-400 h-full rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${ptMt}%` }}
              transition={{ duration: 1 }}
            />
          </div>
        </div>

        <div className="space-y-1">
          <div className="flex justify-between text-[10px] font-mono leading-none">
            <span className="text-[#8b949e]">KILOLITERS (KL) CHEMICALS</span>
            <span className="text-blue-400 font-bold">{klWeight} KL ({ptKl}%)</span>
          </div>
          <div className="w-full bg-[#161b22] h-1.5 rounded-full overflow-hidden">
            <motion.div 
              className="bg-gradient-to-r from-blue-500 via-indigo-500 to-indigo-400 h-full rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${ptKl}%` }}
              transition={{ duration: 1 }}
            />
          </div>
        </div>
      </div>

      <div className="pt-2 border-t border-[#21262d] flex justify-between items-center text-[9.5px] font-mono text-[#8b949e] leading-none">
        <span>SECURITY LEVEL: AUTHORIZED</span>
        <span className="flex h-2 w-2 relative">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
        </span>
      </div>
    </div>
  );
}

function OperationalPulse() {
  const [events, setEvents] = useState<SystemEvent[]>([]);

  useEffect(() => {
    setEvents(FleetMasterStore.getEvents().slice(0, 5));

    const handleLiveEvent = (e: Event) => {
      const customEvent = e as CustomEvent<SystemEvent>;
      if (customEvent.detail) {
        setEvents(prev => [customEvent.detail, ...prev].slice(0, 5));
      }
    };

    window.addEventListener('fleetmaster_event_logged', handleLiveEvent);
    return () => {
      window.removeEventListener('fleetmaster_event_logged', handleLiveEvent);
    };
  }, []);

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'trip':
        return <Navigation className="w-3.5 h-3.5 text-emerald-400" />;
      case 'invoice':
        return <FileText className="w-3.5 h-3.5 text-blue-400" />;
      case 'fuel':
        return <Compass className="w-3.5 h-3.5 text-amber-400" />;
      case 'maintenance':
        return <Wrench className="w-3.5 h-3.5 text-rose-450" />;
      case 'accounting':
        return <DollarSign className="w-3.5 h-3.5 text-purple-400" />;
      default:
        return <Activity className="w-3.5 h-3.5 text-[#ff5a1f]" />;
    }
  };

  const getEventBadgeClass = (type: string) => {
    switch (type) {
      case 'trip':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'invoice':
        return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      case 'fuel':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      case 'maintenance':
        return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
      case 'accounting':
        return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
      default:
        return 'bg-orange-500/10 text-orange-400 border-orange-500/20';
    }
  };

  const formatTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      const diffMs = Date.now() - date.getTime();
      const diffMins = Math.round(diffMs / 60000);
      
      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      
      const diffHrs = Math.floor(diffMins / 60);
      if (diffHrs < 24) return `${diffHrs}h ago`;
      
      return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) + ' ' + date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: false });
    } catch {
      return 'Recent';
    }
  };

  return (
    <div className="bg-[#141212] border border-white/[0.08] rounded-[24px] p-5 flex flex-col justify-between h-72 relative overflow-hidden group hover:border-[#ff5a1f]/20 transition-all duration-350 shadow-2xl">
      <div className="absolute top-0 right-0 w-24 h-24 bg-red-500/[0.02] rounded-full blur-2xl pointer-events-none" />
      
      <div className="space-y-3 flex-1 overflow-hidden flex flex-col justify-between">
        <div className="flex justify-between items-center border-b border-white/[0.04] pb-2 text-left">
          <div className="space-y-0.5">
            <span className="text-[9.5px] font-mono text-[#ff7a4e] font-extrabold uppercase tracking-wider block">Real-time Telemetry</span>
            <h4 className="text-xs font-bold text-white tracking-tight flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 bg-[#ff5a1f] rounded-full animate-pulse" />
              Operational Pulse Feed
            </h4>
          </div>
          <span className="text-[8px] font-mono text-gray-400 border border-white/[0.06] rounded px-1.5 py-0.5 uppercase">Latest Live</span>
        </div>

        <div className="space-y-3 flex-1 overflow-y-auto scrollbar-none py-1 flex flex-col justify-center">
          <AnimatePresence initial={false}>
            {events.map((evt) => (
              <motion.div
                key={evt.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.3 }}
                className="flex gap-2.5 items-start text-left text-[11px] leading-snug group/item"
              >
                <div className={`p-1.5 border rounded-lg shrink-0 flex items-center justify-center transition-colors group-hover/item:border-white/10 ${getEventBadgeClass(evt.type)}`}>
                  {getEventIcon(evt.type)}
                </div>

                <div className="flex-1 min-w-0 space-y-0.5">
                  <div className="flex items-baseline justify-between gap-2">
                    <strong className="text-gray-100 font-bold truncate block tracking-tight">{evt.title}</strong>
                    <span className="text-[8px] font-mono text-gray-500 shrink-0">{formatTime(evt.timestamp)}</span>
                  </div>
                  <p className="text-gray-400 text-[10.5px] truncate max-w-[210px] sm:max-w-full font-sans leading-relaxed">{evt.detail}</p>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>

      <div className="flex justify-between items-center text-[8px] font-mono text-gray-500 border-t border-white/[0.04] pt-2 mt-2 shrink-0 leading-none">
        <span>AUTO SWEEP STREAM ACTIVE</span>
        <span>PULSE SECURE</span>
      </div>
    </div>
  );
}

interface DashboardProps {
  tankers: Tanker[];
  drivers: Driver[];
  lrs: LorryReceipt[];
  trips: Trip[];
  bills: MaintenanceBill[];
  onAddTanker: (tanker: Tanker) => void;
  onAddDriver: (driver: Driver) => void;
  onAddBill: (bill: MaintenanceBill) => void;
  onStartTrip: (trip: Trip) => void;
  onAddLr: (lr: LorryReceipt) => void;
  setActiveTab: (tab: string) => void;
  onTriggerAddExpense: () => void;
}

export default function Dashboard({
  tankers,
  drivers,
  lrs,
  trips,
  bills,
  onAddTanker,
  onAddDriver,
  onAddBill,
  onStartTrip,
  onAddLr,
  setActiveTab,
  onTriggerAddExpense
}: DashboardProps) {
  // Modal states
  const [showTankerModal, setShowTankerModal] = useState(false);
  const [showDriverModal, setShowDriverModal] = useState(false);
  const [showTripModal, setShowTripModal] = useState(false);

  // New Tanker Form Status
  const [tankerNo, setTankerNo] = useState('');
  const [rcExp, setRcExp] = useState('');
  const [fitnessExp, setFitnessExp] = useState('');
  const [calibrationExp, setCalibrationExp] = useState('');
  const [permitExp, setPermitExp] = useState('');
  const [natPermitExp, setNatPermitExp] = useState('');
  const [surakshaExp, setSurakshaExp] = useState('');
  const [explosiveExp, setExplosiveExp] = useState('');
  const [gtaxExp, setGtaxExp] = useState('');
  const [insExp, setInsExp] = useState('');
  const [tankerDocNames, setTankerDocNames] = useState<Record<string, string>>({});

  // New Driver Form Status
  const [drvName, setDrvName] = useState('');
  const [drvContact, setDrvContact] = useState('');
  const [drvPassword, setDrvPassword] = useState('');
  const [drvUsername, setDrvUsername] = useState('');
  const [drvLoginPhone, setDrvLoginPhone] = useState('');
  const [drvLicense, setDrvLicense] = useState('');
  const [drvBankAcc, setDrvBankAcc] = useState('');
  const [drvBankName, setDrvBankName] = useState('');
  const [drvIfsc, setDrvIfsc] = useState('');
  const [driverDocName, setDriverDocName] = useState('');

  // Start New Trip Form Status
  const [startLrMode, setStartLrMode] = useState<'create' | 'select'>('create');
  const [selectedLrId, setSelectedLrId] = useState('');
  const [selectedDriverId, setSelectedDriverId] = useState('');
  const [selectedTankerId, setSelectedTankerId] = useState('');
  const [approxDistance, setApproxDistance] = useState<number>(250);
  const [expectedFuel, setExpectedFuel] = useState<number>(83);
  const [expectedAdblue, setExpectedAdblue] = useState<number>(4);

  // Custom LR form states
  const [newLrNo, setNewLrNo] = useState('');
  const [newConsignerName, setNewConsignerName] = useState('');
  const [newConsigneeName, setNewConsigneeName] = useState('');
  const [newProduct, setNewProduct] = useState('');
  const [newLrQty, setNewLrQty] = useState<number>(0);
  const [newLrQtyUnit, setNewLrQtyUnit] = useState<'KL' | 'MT'>('KL');
  const [newPlaceFrom, setNewPlaceFrom] = useState('');
  const [newPlaceTo, setNewPlaceTo] = useState('');
  const [newFreightRate, setNewFreightRate] = useState<number>(0);

  // Notifications calculation reference date
  const currentDate = new Date('2026-05-23');

  const docWarnings = tankers.flatMap(tanker => {
    return Object.entries(tanker.expirations || {}).flatMap(([docType, dateStr]) => {
      if (!dateStr) return [];
      const expDate = new Date(dateStr);
      const diffTime = expDate.getTime() - currentDate.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays >= 0 && diffDays <= 7) {
        return [{
          tankerNo: tanker.tankerNumber,
          docType: docType.toUpperCase(),
          date: dateStr,
          daysLeft: diffDays
        }];
      }
      return [];
    });
  });

  // LR pending notice (>10 days)
  const pendingLRWarnings = lrs.flatMap(lr => {
    if (lr.status === 'received') return [];
    const lrDate = new Date(lr.dated);
    const diffTime = currentDate.getTime() - lrDate.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays > 10) {
      return [{
        lrNo: lr.lrNo,
        tankerNo: lr.tankerNumber,
        consigner: lr.consignerName,
        dating: lr.dated,
        daysOverdue: diffDays
      }];
    }
    return [];
  });

  // Handle distance change and auto-calculate estimates
  const handleDistanceChange = (dist: number) => {
    setApproxDistance(dist);
    const fuel = Math.round(dist / 3);
    setExpectedFuel(fuel);
    setExpectedAdblue(Math.round(fuel * 0.05));
  };

  // Submit operations handlers
  const handleTankerDocChange = (docKey: string, e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setTankerDocNames(prev => ({
        ...prev,
        [docKey]: file.name
      }));
    }
  };

  const submitTanker = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tankerNo) {
      alert("Please enter a Tanker plate registration number.");
      return;
    }

    const newTnk: Tanker = {
      id: `TNK-${Math.floor(100 + Math.random() * 900)}`,
      tankerNumber: tankerNo,
      status: 'idle',
      addedDate: currentDate.toISOString().split('T')[0],
      documents: {
        rc: tankerDocNames.rc || undefined,
        fitness: tankerDocNames.fitness || undefined,
        calibration: tankerDocNames.calibration || undefined,
        permit: tankerDocNames.permit || undefined,
        nationalPermit: tankerDocNames.nationalPermit || undefined,
        suraksha: tankerDocNames.suraksha || undefined,
        explosiveLicense: tankerDocNames.explosive || undefined,
        gTax: tankerDocNames.gtax || undefined,
        insurance: tankerDocNames.insurance || undefined,
      },
      expirations: {
        rc: rcExp || undefined,
        fitness: fitnessExp || undefined,
        calibration: calibrationExp || undefined,
        permit: permitExp || undefined,
        nationalPermit: natPermitExp || undefined,
        suraksha: surakshaExp || undefined,
        explosiveLicense: explosiveExp || undefined,
        gTax: gtaxExp || undefined,
        insurance: insExp || undefined,
      },
      parts: []
    };

    onAddTanker(newTnk);
    setShowTankerModal(false);
    
    // reset form
    setTankerNo('');
    setRcExp('');
    setFitnessExp('');
    setCalibrationExp('');
    setPermitExp('');
    setNatPermitExp('');
    setSurakshaExp('');
    setExplosiveExp('');
    setGtaxExp('');
    setInsExp('');
    setTankerDocNames({});
  };

  const submitDriver = (e: React.FormEvent) => {
    e.preventDefault();
    if (!drvName || !drvContact) {
      alert("Driver name and valid contact number are required.");
      return;
    }

    const newDrv: Driver = {
      id: `DRV-${Math.floor(100 + Math.random() * 900)}`,
      name: drvName,
      contactNumber: drvContact,
      loginPhoneNumber: drvLoginPhone ? drvLoginPhone.trim() : undefined,
      password: drvPassword || '123456', // default passcode if none entered
      username: drvUsername ? drvUsername.trim() : undefined,
      licenseNumber: drvLicense,
      bankAccountNumber: drvBankAcc,
      bankName: drvBankName,
      ifscCode: drvIfsc,
      licenseDoc: driverDocName || undefined,
      status: 'idle'
    };

    onAddDriver(newDrv);
    setShowDriverModal(false);
    
    // reset
    setDrvName('');
    setDrvContact('');
    setDrvPassword('');
    setDrvUsername('');
    setDrvLoginPhone('');
    setDrvLicense('');
    setDrvBankAcc('');
    setDrvBankName('');
    setDrvIfsc('');
    setDriverDocName('');
  };

  const submitTrip = (e: React.FormEvent) => {
    e.preventDefault();
    
    const drvObj = drivers.find(d => d.id === selectedDriverId);
    if (!drvObj) {
      alert("Please select an active Driver.");
      return;
    }
    
    let lrObj: LorryReceipt | undefined;
    
    if (startLrMode === 'create') {
      const tankerObj = tankers.find(t => t.id === selectedTankerId);
      if (!tankerObj) {
        alert("Please select an active Tanker.");
        return;
      }

      if (!newConsignerName || !newConsigneeName || !newProduct || newLrQty <= 0 || newFreightRate <= 0 || !newPlaceFrom || !newPlaceTo) {
        alert("Please complete all Lorry Receipt parameters correctly.");
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
        alert("Choose an existing pending Lorry Receipt to launch.");
        return;
      }
      lrObj = lrs.find(l => l.id === selectedLrId);
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
      qtyUnit: startLrMode === 'create' ? newLrQtyUnit : 'KL',
      startDate: new Date().toISOString().split('T')[0],
      status: 'running',
      loadingWeight: startLrMode === 'create' ? newLrQty : lrObj.qty,
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
    setShowTripModal(false);

    // Reset Forms
    setSelectedLrId('');
    setSelectedDriverId('');
    setSelectedTankerId('');
    setApproxDistance(250);
    setExpectedFuel(83);
    setExpectedAdblue(4);
    
    setNewLrNo('');
    setNewConsignerName('');
    setNewConsigneeName('');
    setNewProduct('');
    setNewLrQty(0);
    setNewPlaceFrom('');
    setNewPlaceTo('');
    setNewFreightRate(0);
  };

  const runningTrips = trips.filter(t => t.status === 'running');
  const runningTripsCount = runningTrips.length;
  const pendingLRCount = lrs.filter(l => l.status === 'pending').length;

  // Render a mock hazardous diamond class for chemical products
  const renderHazardPlacard = (product: string) => {
    const p = product.toLowerCase();
    // Default hazards
    let h = 3; // Health
    let f = 3; // Flammability
    let r = 0; // Reactivity
    let sp = ""; // Special info

    if (p.includes('methanol') || p.includes('alcohol')) {
      h = 3; f = 3; r = 0; sp = "";
    } else if (p.includes('toluene') || p.includes('benzene')) {
      h = 2; f = 3; r = 0;
    } else if (p.includes('acid') || p.includes('nitric') || p.includes('sulfur')) {
      h = 3; f = 0; r = 2; sp = "COR";
    } else if (p.includes('adblue') || p.includes('urea')) {
      h = 1; f = 0; r = 0;
    } else if (p.includes('gas') || p.includes('diesel')) {
      h = 1; f = 3; r = 0;
    }

    return (
      <div className="flex items-center gap-2">
        <div className="relative w-8 h-8 flex-shrink-0 grid grid-cols-2 rotate-45 border border-[#30363d] overflow-hidden text-[9px] font-bold text-center bg-[#161b22]">
          <div className="-rotate-45 flex items-center justify-center bg-blue-600/85 text-white h-4 w-4">
            <span>{h}</span>
          </div>
          <div className="-rotate-45 flex items-center justify-center bg-red-600/85 text-white h-4 w-4">
            <span>{f}</span>
          </div>
          <div className="-rotate-45 flex items-center justify-center bg-yellow-500/85 text-black h-4 w-4">
            <span>{r}</span>
          </div>
          <div className="-rotate-45 flex items-center justify-center bg-white text-black h-4 w-4 leading-none text-[7px]">
            <span>{sp || "W"}</span>
          </div>
        </div>
        <div className="text-xs">
          <span className="font-semibold text-[#c9d1d9] block leading-none">{product}</span>
          <span className="text-[10px] text-[#8b949e] font-mono">Hazchem Class {h}.{f}</span>
        </div>
      </div>
    );
  };

  // Indian vehicle registration plate component helper
  const renderVehiclePlate = (plate: string) => {
    const formatted = plate.toUpperCase().replace(/\s/g, '');
    return (
      <div className="inline-flex items-center bg-[#f1f1f1] border border-[#d1d1d1] text-[#111111] px-2 py-0.5 rounded shadow-sm font-sans font-extrabold tracking-wider text-xs pointer-events-none select-none">
        <div className="flex flex-col items-center justify-center border-r border-[#111111]/20 pr-1.5 mr-1.5 text-[7px] text-blue-700 font-bold">
          <span>IND</span>
          <span className="w-1.5 h-1.5 bg-[#f59e0b] rounded-full mt-0.5 animate-pulse" />
        </div>
        <span className="font-mono text-xs text-[#000]">{formatted}</span>
      </div>
    );
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto px-4 sm:px-6 py-6 selection:bg-[#ff5a5f] selection:text-white">
      
      {/* Dynamic Visual Dashboard Hero with Central Launch Buttons */}
      <div className="relative bg-gradient-to-r from-[#1e2530] via-[#161b22] to-[#0d1117] border border-[#30363d] rounded-3xl p-6 sm:p-8 overflow-hidden shadow-xl">
        <div className="absolute top-0 right-0 w-80 h-full bg-[#ff5a5f]/5 rounded-bl-[160px] blur-3xl pointer-events-none" />
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-gradient-to-r from-blue-500/10 to-indigo-500/10 border border-blue-500/20 text-blue-400 text-xs font-mono rounded-full font-bold uppercase tracking-wider mb-3">
              <span className="w-2 h-2 bg-blue-500 rounded-full animate-ping" />
              Dynamic Operational Dashboard
            </div>
            <h2 className="text-2xl sm:text-3.5xl font-black text-white tracking-tight leading-none">Fleet Terminal dashboard</h2>
            <p className="text-[#8b949e] mt-2 max-w-xl text-xs sm:text-sm leading-relaxed font-sans">
              Real-time chemicals tracking engine, dispatch managers, compliance audit nodes and expense pipelines. Manage everything from a centralized panel.
            </p>
          </div>
          
          {/* USER ACTION TERMINAL */}
          <div className="flex flex-wrap gap-2 sm:gap-3 bg-[#0d1117]/60 p-3 sm:p-4 rounded-2xl border border-[#21262d] backdrop-blur-md">
            <button 
              onClick={() => {
                const availableDrv = drivers.find(d => d.status === 'idle');
                const availableTnk = tankers.find(t => t.status === 'idle');
                if (availableDrv) setSelectedDriverId(availableDrv.id);
                if (availableTnk) setSelectedTankerId(availableTnk.id);
                setShowTripModal(true);
              }}
              className="px-4 py-2.5 bg-gradient-to-r from-[#21c55d] to-[#10b981] hover:brightness-110 text-white text-xs sm:text-sm font-bold rounded-xl inline-flex items-center gap-2 transition-all cursor-pointer shadow-lg shadow-emerald-950/20"
            >
              <Navigation className="w-4 h-4 animate-bounce" />
              Start New Trip
            </button>
            
            <button 
              onClick={onTriggerAddExpense}
              className="px-4 py-2.5 bg-gradient-to-r from-rose-600 to-red-650 hover:brightness-110 text-white text-xs sm:text-sm font-bold rounded-xl inline-flex items-center gap-2 transition-all cursor-pointer shadow-lg shadow-red-950/20"
            >
              <Plus className="w-4 h-4 text-rose-100" />
              Record Expense
            </button>

            <button 
              onClick={() => setShowTankerModal(true)}
              className="px-4 py-2.5 bg-[#21262d] hover:bg-[#30363d] text-white text-xs sm:text-sm font-semibold rounded-xl inline-flex items-center gap-2 transition-all cursor-pointer border border-[#30363d]"
            >
              <Truck className="w-4 h-4 text-blue-400" />
              Add Tanker
            </button>
            <button 
              onClick={() => setShowDriverModal(true)}
              className="px-4 py-2.5 bg-[#21262d] hover:bg-[#30363d] text-white text-xs sm:text-sm font-semibold rounded-xl inline-flex items-center gap-2 transition-all cursor-pointer border border-[#30363d]"
            >
              <UserPlus className="w-4 h-4 text-purple-400" />
              Add Driver
            </button>
          </div>
        </div>
      </div>

      {/* ==================================================== */}
      {/* GLOWING COMMAND CENTER DIGITAL TELEMETRY DASHBOARD    */}
      {/* ==================================================== */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Activity className="w-5 h-5 text-emerald-400 animate-pulse" />
          <div>
            <h3 className="text-lg font-bold text-white tracking-tight">Live Fleet Operations CommandCenter & Telemetry</h3>
            <p className="text-xs text-[#8b949e]">Real-time transit diagnostics, GPS sweeps & shipping loads ratio</p>
          </div>
        </div>
        
        {/* Responsive dual split grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Main Corridor map (8 cols) */}
          <div className="lg:col-span-8">
            <ChemicalLogisticsLiveMap activeTrips={runningTrips} />
          </div>

          {/* Stacking HUD computer and loads charts (4 cols) */}
          <div className="lg:col-span-4 flex flex-col gap-6">
            <FuelCalculatorShortcut />
            <OperationalPulse />
            <LoadMassDistribution activeTrips={runningTrips} />
          </div>
        </div>
      </div>

      {/* Stats Cards Display */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {[
          { title: "Vehicles Managed", value: tankers.length, desc: `${tankers.filter(t => t.status === 'running').length} running, ${tankers.filter(t => t.status === 'maintenance').length} in workshop`, icon: Truck, color: "border-white/[0.04] text-[#ff7a4e] hover:border-[#ff7a4e]/40 bg-white/[0.01]" },
          { title: "Drivers Engaged", value: drivers.length, desc: `${drivers.filter(d => d.status === 'active').length} on-duty en-route`, icon: Users, color: "border-white/[0.04] text-amber-400 hover:border-amber-400/40 bg-white/[0.01]" },
          { title: "Active Deployments", value: runningTripsCount, desc: "Deliveries en-route en-route", icon: Compass, color: "border-white/[0.04] text-emerald-400 hover:border-emerald-400/40 bg-white/[0.01]" },
          { title: "Overdue L.R Records", value: pendingLRCount, desc: `${pendingLRWarnings.length} critical overdue (>10 d)`, icon: FileText, color: "border-white/[0.04] text-rose-400 hover:border-rose-400/40 bg-white/[0.01]" }
        ].map((stat, i) => {
          const Icon = stat.icon;
          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.05 }}
              className={`luxury-card card-tilt-3d p-6 border rounded-[24px] ${stat.color} relative overflow-hidden`}
            >
              <div className="luxury-card-header">
                <h4 className="text-xs font-mono uppercase tracking-widest text-[#8b949e] opacity-80 pr-12">{stat.title}</h4>
                <div className="p-3 bg-white/[0.03] border border-white/[0.06] rounded-2xl text-current flex-shrink-0">
                  <Icon className="w-5 h-5" />
                </div>
              </div>
              <div className="flex-grow flex flex-col justify-end">
                <div className="text-4xl font-extrabold font-sans text-white tracking-tight">{stat.value}</div>
                <p className="text-xs text-[#8b949e] mt-2 font-sans leading-snug">{stat.desc}</p>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* CORE RUNNING ACTIVITIES AND DELIVERIES (HIGH VISUAL PRIORITY) */}
      <div className="bg-[#141212] border border-white/[0.06] rounded-[28px] overflow-hidden shadow-2xl">
        <div className="p-6 border-b border-white/[0.04] flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#181616]">
          <div className="flex items-center gap-3">
            <div className="w-3.5 h-3.5 bg-[#ff5a1f] rounded-full animate-pulse" />
            <div>
              <h3 className="text-lg font-extrabold text-white tracking-tight select-none">
                Live En-Route activities & Deployments
              </h3>
              <p className="text-xs text-[#8b949e] font-mono mt-0.5">Currently monitoring {runningTrips.length} active tanker dispatches</p>
            </div>
          </div>
          <div className="text-xs font-mono text-[#8b949e] bg-[#0b0a0a] px-4 py-2 border border-white/[0.06] rounded-full flex items-center gap-2">
            <span>Terminal Pulse: Connected</span>
            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping" />
          </div>
        </div>

        {runningTrips.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center text-[#8b949e] px-4">
            <Compass className="w-14 h-14 text-[#ff5a1f]/30 mb-4.5 animate-spin duration-1000" />
            <p className="font-bold text-base text-white">No active dispatches found</p>
            <p className="text-xs mt-1 max-w-sm mb-6 opacity-85">There are no chemical tankers en-route at this moment. Dispatch a route using the "Start New Trip" button.</p>
            <button 
              onClick={() => {
                const availableDrv = drivers.find(d => d.status === 'idle');
                const availableTnk = tankers.find(t => t.status === 'idle');
                if (availableDrv) setSelectedDriverId(availableDrv.id);
                if (availableTnk) setSelectedTankerId(availableTnk.id);
                setShowTripModal(true);
              }}
              className="px-5 py-3 bg-gradient-to-r from-[#ff7a4e] to-[#ff5a1f] text-white text-xs font-bold rounded-2xl hover:brightness-110 cursor-pointer shadow-md shadow-[#ff5a1f]/10"
            >
              Launch First Dispatch
            </button>
          </div>
        ) : (
          <div className="p-5 sm:p-7 grid grid-cols-1 lg:grid-cols-2 gap-6">
            {runningTrips.map((trip) => {
              const driver = drivers.find(d => d.id === trip.driverId);
              // Calculate a simulated journey progress bar based on start date
              const parsedDate = new Date(trip.startDate);
              const totalDays = 4; // standard 4-day trip cycle
              const elapsedDays = Math.ceil((currentDate.getTime() - parsedDate.getTime()) / (1000 * 60 * 60 * 24));
              const progressPct = Math.min(Math.max((elapsedDays / totalDays) * 100, 15), 90);

              // Determine active dynamic status badge en-route
              let statusText = "In Progress";
              let statusBadgeStyle = "bg-[#ff5a1f]/10 text-[#ff7a4e] border-[#ff5a1f]/30";
              if (progressPct >= 80) {
                statusText = "Awaiting Receipt";
                statusBadgeStyle = "bg-amber-400/10 text-amber-300 border-amber-400/30 animate-pulse";
              } else if (progressPct >= 45) {
                statusText = "In Transit";
                statusBadgeStyle = "bg-emerald-500/10 text-emerald-400 border-emerald-500/30";
              } else {
                statusText = "Started";
                statusBadgeStyle = "bg-blue-500/10 text-blue-400 border-blue-500/30";
              }

              return (
                <div 
                  key={trip.id}
                  className="bg-[#121010] border border-white/[0.04] rounded-[24px] p-6.5 hover:border-[#ff5a1f]/30 transition-all duration-300 relative overflow-hidden group shadow-md"
                >
                  <div className="absolute top-0 right-0 w-28 h-28 bg-[#ff5a1f]/[0.02] rounded-bl-[100px] pointer-events-none group-hover:bg-[#ff5a1f]/[0.04] transition-all" />

                  {/* Header: Vehicles and Haz Diamond */}
                  <div className="flex items-start justify-between gap-4 border-b border-white/[0.04] pb-4 mb-4.5">
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        {renderVehiclePlate(trip.tankerNumber)}
                        <span className="text-[10px] font-mono bg-[#ff5a1f]/10 text-[#ff7a4e] px-3 py-0.5 rounded-full border border-[#ff5a1f]/20 font-bold tracking-wider">
                          {trip.id}
                        </span>
                        <span className={`text-[10px] font-mono px-2.5 py-0.5 rounded-full border font-bold ${statusBadgeStyle}`}>
                          {statusText}
                        </span>
                      </div>
                      <div className="text-xs text-[#8b949e]">
                        LR Copy Ref: <strong className="text-white hover:text-[#ff7a4e] hover:underline cursor-pointer" onClick={() => setActiveTab('L.R. Record')}>{trip.lrNo}</strong>
                      </div>
                    </div>
                    {renderHazardPlacard(trip.lrNo.includes('LR-BRC') ? 'Chemical Fluid' : trip.lrNo)}
                  </div>

                  {/* Journey routing track */}
                  <div className="space-y-3 font-sans mb-5">
                    <div className="flex items-center justify-between text-xs font-semibold text-white/95">
                      <span className="flex items-center gap-1.5">
                        <MapPin className="w-4 h-4 text-[#ff5a1f]" />
                        {trip.placeFrom}
                      </span>
                      <span className="text-[10px] text-[#8b949e] font-mono py-0.5 px-2 bg-white/[0.02] rounded-full border border-white/[0.04]">
                        ~{trip.approxDistanceKm} Kms
                      </span>
                      <span className="flex items-center gap-1.5">
                        <MapPin className="w-4 h-4 text-emerald-400" />
                        {trip.placeTo}
                      </span>
                    </div>

                    {/* Progress Track */}
                    <div className="py-2.5">
                      <div className="w-full bg-white/[0.04] h-2.5 rounded-full overflow-hidden relative border border-white/[0.02]">
                        <div 
                          className="bg-gradient-to-r from-[#ff7a4e] via-[#ff5a1f] to-emerald-500 h-full rounded-full transition-all duration-500"
                          style={{ width: `${progressPct}%` }}
                        />
                        <span 
                          className="absolute h-3.5 w-3.5 rounded-full bg-white border-2 border-[#ff5a1f] top-1/2 -translate-y-1/2 -translate-x-1/2 shadow-lg animate-pulse"
                          style={{ left: `${progressPct}%` }}
                        />
                      </div>
                      <div className="flex justify-between items-center text-[10px] text-[#8b949e] font-mono mt-2">
                        <span>Dispatched: {trip.startDate}</span>
                        <span className="text-white">progress: ~{Math.round(progressPct)}%</span>
                        <span className="text-[#ff7a4e]">{totalDays - elapsedDays > 0 ? `${totalDays - elapsedDays}d remaining` : 'Arriving'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Driver and Cargo detail */}
                  <div className="grid grid-cols-2 gap-3.5 bg-[#0b0a0a] p-4 rounded-2xl text-xs font-mono border border-white/[0.04]">
                    <div>
                      <span className="block text-[9px] text-[#8b949e] uppercase mb-1 tracking-wider">Pilot In-Command</span>
                      <strong className="text-white block truncate text-[12.5px]">{trip.driverName}</strong>
                      <span className="text-[10px] text-emerald-400 font-sans block mt-0.5">
                        {driver?.contactNumber || 'No contact'}
                      </span>
                    </div>
                    <div>
                      <span className="block text-[9px] text-[#8b949e] uppercase mb-1 tracking-wider">Estimates Loaded</span>
                      <strong className="text-white block text-[12.5px]">{trip.loadingWeight} {trip.qtyUnit}</strong>
                      <span className="text-[10px] text-[#8b949e] block mt-0.5">
                        Est: Fuel {trip.expectedFuelLiters} L / Adblue {trip.expectedAdblueLiters} L
                      </span>
                    </div>
                  </div>

                  {/* Fast Action Footer */}
                  <div className="mt-4 pt-3.5 border-t border-white/[0.04] flex items-center justify-between text-xs">
                    <span className="text-[10.5px] text-[#8b949e] font-mono">
                      Expenses Logged: <strong className="text-[#fbbf24]">₹{trip.fuelExpense + trip.tollExpense + trip.driverCharge + trip.repairExpense + trip.adblueExpense}</strong>
                    </span>
                    <button 
                      onClick={() => setActiveTab('Trips')}
                      className="text-[#ff7a4e] hover:text-[#ff5a1f] font-bold inline-flex items-center gap-1 transition-all"
                    >
                      Log Expenses & Conclude <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* COMPLIANCE AUDITS & WARNINGS AND QUICK ACTIONS ROUTING */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8">
        
        {/* Compliance Warning list (Left 7-Grid) */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-[#161b22] border border-[#30363d] rounded-2xl overflow-hidden p-5 sm:p-6 shadow-sm">
            <h3 className="text-base sm:text-lg font-extrabold text-white tracking-tight flex items-center gap-2.5 mb-5 select-none">
              <ShieldAlert className="w-5 h-5 text-[#ff5a5f] animate-pulse" />
              Regulatory Compliance Expirations & Warnings
            </h3>

            {docWarnings.length === 0 && pendingLRWarnings.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center text-[#8b949e]">
                <CheckCircle2 className="w-12 h-12 text-emerald-500/30 mb-3" />
                <p className="font-semibold text-sm text-white">All systems compliant</p>
                <p className="text-xs mt-1">No upcoming chemical tanker certificate expirations or overdue lorry receipts found.</p>
              </div>
            ) : (
              <div className="space-y-3.5 max-h-[380px] overflow-y-auto pr-1">
                {/* Expiring Docs Warning */}
                {docWarnings.map((warn, index) => (
                  <motion.div 
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    key={`doc-${index}`}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-yellow-500/5 hover:bg-yellow-500/10 border border-yellow-500/15 rounded-xl transition-all"
                  >
                    <div className="flex items-start gap-3">
                      <div className="p-1.5 bg-yellow-500/10 text-yellow-500 rounded-lg text-[9px] font-mono font-bold uppercase mt-0.5 tracking-wider border border-yellow-500/20">
                        EXPIRE
                      </div>
                      <div>
                        {renderVehiclePlate(warn.tankerNo)}
                        <div className="text-[12.5px] text-[#f59e0b] mt-1.5 font-mono">
                          Certificate <span className="underline font-bold">{warn.docType}</span> expires {warn.date}
                        </div>
                      </div>
                    </div>
                    <div>
                      <span className="inline-flex px-3 py-1 bg-yellow-950/40 text-yellow-400 text-xs font-bold rounded-full border border-yellow-500/30 font-mono">
                        {warn.daysLeft === 0 ? 'Expires Today' : `In ${warn.daysLeft} days`}
                      </span>
                    </div>
                  </motion.div>
                ))}

                {/* Overdue LRs Warning */}
                {pendingLRWarnings.map((warn, index) => (
                  <motion.div 
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    key={`lr-${index}`}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-[#ff5a5f]/5 hover:bg-[#ff5a5f]/10 border border-[#ff5a5f]/15 rounded-xl transition-all"
                  >
                    <div className="flex items-start gap-3">
                      <div className="p-1.5 bg-[#ff5a5f]/10 text-[#ff5a5f] rounded-lg text-[9px] font-mono font-bold uppercase mt-0.5 tracking-wider border border-red-500/20">
                        OVERDUE
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-white tracking-tight">LR receipt {warn.lrNo} pending copy</div>
                        <div className="text-xs text-[#ff7b7f] mt-1 font-mono">
                          Dating {warn.dating} | Handed to driver ({warn.tankerNo}) pending submission.
                        </div>
                      </div>
                    </div>
                    <div>
                      <span className="inline-flex px-3 py-1 bg-[#ff5a5f]/15 text-[#ff7b7f] text-xs font-bold rounded-full border border-[#ff5a5f]/30 font-mono">
                        {warn.daysOverdue} Days Pending
                      </span>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Dynamic Navigation Launchpad shortcut cards (Right 5-Grid) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-[#161b22] border border-[#30363d] rounded-2xl p-5 shadow-sm space-y-4">
            <span className="text-[10px] font-mono font-bold text-[#8b949e] uppercase tracking-wider block">
              OPERATIONAL HUB GATEWAY
            </span>

            {[
              { id: 'L.R. Record', title: "Manage L.R Records", desc: "Build & audit print-ready lorry receipt records, manage cargo loads and consignees.", icon: FileText, color: "hover:border-amber-500/30 text-amber-500 hover:bg-amber-500/5" },
              { id: 'Ledgers', title: "Workshop Ledgers Maintenance", desc: "Regulate vendor bills, workshop spare parts exchanges, and outstanding accounts.", icon: Wrench, color: "hover:border-blue-500/30 text-blue-400 hover:bg-blue-500/5" },
              { id: 'Adblue', title: "Emission Control Tracker", desc: "Monitor Adblue diesel exhaust fluids, refill expenses and consumption ratios.", icon: Compass, color: "hover:border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/5" },
              { id: 'MasterAccounting', title: "Accounting Ledgers & Tally", desc: "Complete profit summaries, driver salary vouchers, capital accounting statements.", icon: DollarSign, color: "hover:border-purple-500/30 text-purple-400 hover:bg-purple-500/5" }
            ].map((sh, idx) => {
              const Icon = sh.icon;
              return (
                <div 
                  key={idx}
                  onClick={() => setActiveTab(sh.id)}
                  className={`p-4 bg-gradient-to-br from-[#1c212b] to-[#12161f] border border-[#21262d] rounded-2xl cursor-pointer transition-all flex items-start gap-3.5 group relative overflow-hidden ${sh.color}`}
                >
                  <div className="p-2.5 bg-[#0d1117] rounded-xl text-current border border-transparent">
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="space-y-0.5">
                    <h4 className="text-xs font-bold text-white group-hover:text-current font-sans transition-all">{sh.title}</h4>
                    <p className="text-[11px] text-[#8b949e] leading-snug">{sh.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>

      {/* ==================================================== */}
      {/* AI TRANSIT ROUTE & FUEL CALCULATOR DECK */}
      {/* ==================================================== */}
      <div className="relative z-10 pt-2 pb-4">
        <SmartTransitCalculator />
      </div>

      {/* ==================================================== */}
      {/* INTERACTIVE 3D TRANSPORT SIMULATION (BELOW DASHBOARD) */}
      {/* ==================================================== */}
      <div className="relative z-10">
        <InteractiveTransport3D />
      </div>

      {/* ==================================================== */}
      {/* FLEET TERMINAL DECK SHORTCUTS (BELOW DASHBOARD GRID) */}
      {/* ==================================================== */}
      <div className="space-y-4 pt-6 border-t border-[#30363d]/50">
        <div className="flex items-center gap-3">
          <ChevronRight className="w-5 h-5 text-blue-400 rotate-90 animate-bounce" />
          <div>
            <h3 className="text-lg font-bold text-white tracking-tight">Fleet Terminal Cabin Shortcuts</h3>
            <p className="text-xs text-[#8b949e]">Instant operational gateways to dispatch logs, workshop ledgers, driver folders & central tally accounting charts</p>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { id: 'L.R. Record', label: 'L.R Records', desc: 'Freight cargo & receipts', badge: lrs.filter(l => l.status === 'pending').length || null, badgeBg: 'bg-amber-500/10 text-amber-400 hover:text-white', icon: FileText, bgGlow: 'hover:border-amber-500/30 text-amber-400 hover:bg-amber-500/5' },
            { id: 'Trips', label: 'Trips Data', desc: 'Dispatch routes log', badge: trips.filter(t => t.status === 'running').length || null, badgeBg: 'bg-emerald-500/10 text-emerald-400', icon: ClipboardList, bgGlow: 'hover:border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/5' },
            { id: 'Tankers', label: 'Manage Tankers', desc: 'Vehicles, parts & certs', badge: null, badgeBg: '', icon: Truck, bgGlow: 'hover:border-blue-500/30 text-blue-400 hover:bg-blue-500/5' },
            { id: 'Drivers', label: 'Driver Directory', desc: 'Pilot masters & accounts', badge: null, badgeBg: '', icon: Users, bgGlow: 'hover:border-purple-500/30 text-purple-400 hover:bg-purple-500/5' },
            { id: 'Adblue', label: 'Emission Control', desc: 'Fluid refills & fuel usage', badge: null, badgeBg: '', icon: Compass, bgGlow: 'hover:border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/5' },
            { id: 'Ledgers', label: 'Ledger Books', desc: 'Workshop invoices & parts', badge: bills.filter(b => b.status === 'pending').length || null, badgeBg: 'bg-rose-500/10 text-rose-400', icon: CreditCard, bgGlow: 'hover:border-rose-500/30 text-rose-400 hover:bg-rose-500/5' },
            { id: 'MasterAccounting', label: 'Central Tally Accounts', desc: 'Gross profits & drivers batta', badge: null, badgeBg: '', icon: BookOpen, bgGlow: 'hover:border-indigo-500/30 text-indigo-400 hover:bg-indigo-500/5' },
            { id: 'Reports', label: 'Analytics & Audits', desc: 'Data export hubs & charts', badge: null, badgeBg: '', icon: BarChart2, bgGlow: 'hover:border-yellow-500/30 text-yellow-400 hover:bg-yellow-500/5' }
          ].map((sh, index) => {
            const Icon = sh.icon;
            return (
              <motion.div
                key={sh.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.04 }}
                onClick={() => setActiveTab(sh.id)}
                className={`bg-[#161b22] border border-[#21262d] rounded-2xl p-4 cursor-pointer transition-all duration-300 relative overflow-hidden group flex flex-col justify-between h-32 leading-snug select-none ${sh.bgGlow}`}
              >
                {/* Background ambient lighting */}
                <div className="absolute -right-3 -top-3 w-16 h-16 bg-[#0d1117] rounded-bl-3xl border-l border-b border-[#30363d]/50 flex items-center justify-center text-current opacity-80 group-hover:scale-110 transition-transform">
                  <Icon className="w-5.5 h-5.5" />
                </div>

                <div className="space-y-1 pr-6">
                  <h4 className="text-xs font-extrabold text-white group-hover:text-current tracking-tight transition-all font-sans">
                    {sh.label}
                  </h4>
                  <p className="text-[10px] text-[#8b949e] group-hover:text-[#c9d1d9] leading-snug font-sans truncate">
                    {sh.desc}
                  </p>
                </div>

                <div className="flex items-center justify-between mt-4">
                  <span className="text-[9.5px] font-mono text-[#8b949e] group-hover:text-white inline-flex items-center gap-1">
                    Terminal Access ➔
                  </span>
                  {sh.badge !== null && (
                    <span className={`text-[8.5px] font-bold font-mono px-2 py-0.5 rounded-full border border-current ${sh.badgeBg}`}>
                      {sh.badge} active
                    </span>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* OPERATIONAL MODALS */}
      <AnimatePresence>
        
        {/* START TRIP MODAL */}
        {showTripModal && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#161b22] border border-[#30363d] rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl"
            >
              <div className="p-6 border-b border-[#30363d] flex items-center justify-between bg-[#1c212b]">
                <div className="flex items-center gap-2 text-white font-extrabold text-base">
                  <Navigation className="w-5 h-5 text-[#21c55d] animate-pulse" />
                  <span>Start New Active Dispatch Route</span>
                </div>
                <button 
                  onClick={() => setShowTripModal(false)}
                  className="p-1.5 hover:bg-[#21262d] rounded-xl text-[#8b949e] hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={submitTrip} className="p-6 space-y-5">
                
                {/* Mode toggle */}
                <div className="grid grid-cols-2 gap-2 p-1 bg-[#0d1117] rounded-xl border border-[#30363d]">
                  <button
                    type="button"
                    onClick={() => setStartLrMode('create')}
                    className={`py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${startLrMode === 'create' ? 'bg-[#ff5a5f] text-white shadow' : 'text-[#8b949e] hover:text-white'}`}
                  >
                    Create L.R On-The-Spot
                  </button>
                  <button
                    type="button"
                    onClick={() => setStartLrMode('select')}
                    className={`py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${startLrMode === 'select' ? 'bg-[#ff5a5f] text-white shadow' : 'text-[#8b949e] hover:text-white'}`}
                  >
                    Select Pending L.R
                  </button>
                </div>

                {/* Driver select */}
                <div>
                  <label className="block text-xs font-mono text-[#8b949e] uppercase mb-1.5">Select Route Pilot (Driver)</label>
                  <select 
                    value={selectedDriverId}
                    onChange={(e) => setSelectedDriverId(e.target.value)}
                    required
                    className="w-full px-4 py-2.5 bg-[#0d1117] border border-[#30363d] rounded-xl text-white outline-none focus:border-blue-500 font-mono text-xs"
                  >
                    <option value="">-- Choose active / idle Driver --</option>
                    {drivers.map(drv => (
                      <option key={drv.id} value={drv.id}>
                        {drv.name} (Status: {drv.status === 'idle' ? '🟢 Idle' : '🟡 Engaged'}) - DL: {drv.licenseNumber}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Conditional LR parameters */}
                {startLrMode === 'select' ? (
                  <div>
                    <label className="block text-xs font-mono text-[#8b949e] uppercase mb-1.5">Select Pending L.R. Record</label>
                    <select 
                      value={selectedLrId}
                      onChange={(e) => {
                        setSelectedLrId(e.target.value);
                        const selected = lrs.find(l => l.id === e.target.value);
                        if (selected) {
                          setSelectedTankerId(selected.tankerId);
                        }
                      }}
                      className="w-full px-4 py-2.5 bg-[#0d1117] border border-[#30363d] rounded-xl text-white outline-none focus:border-blue-500 font-mono text-xs"
                    >
                      <option value="">-- Select Lorry Receipt --</option>
                      {lrs.filter(l => l.status === 'pending').map(lr => (
                        <option key={lr.id} value={lr.id}>
                          {lr.lrNo} - ({lr.placeFrom} ➔ {lr.placeTo}) | Qty: {lr.qty} {lr.qtyUnit} | Tanker: {lr.tankerNumber}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div className="space-y-4 bg-[#0d1117]/50 p-4 border border-[#30363d] rounded-2xl">
                    <span className="block text-xs font-mono text-white pb-2 border-b border-[#21262d] uppercase tracking-wide">
                      ⚡ On-the-spot Lorry Receipt Parameters
                    </span>

                    <div>
                      <label className="block text-xs font-mono text-[#8b949e] uppercase mb-1">Vehicle Plate (Tanker)</label>
                      <select 
                        value={selectedTankerId}
                        onChange={(e) => setSelectedTankerId(e.target.value)}
                        className="w-full px-3 py-2 bg-[#161b22] border border-[#30363d] rounded text-xs text-white"
                      >
                        <option value="">-- Choose Tanker --</option>
                        {tankers.map(tk => (
                          <option key={tk.id} value={tk.id}>
                            {tk.tankerNumber} ({tk.status === 'idle' ? '🟢 Idle' : tk.status === 'maintenance' ? '🔧 Workshop' : '🟡 Transit'})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-3.5">
                      <div>
                        <span className="block text-[10px] text-[#8b949e] uppercase mb-1 font-mono">Consigner Name</span>
                        <input 
                          type="text" 
                          placeholder="e.g. Reliance Petro"
                          value={newConsignerName}
                          onChange={(e) => setNewConsignerName(e.target.value)}
                          className="w-full px-3 py-2 bg-[#161b22] border border-[#30363d] rounded text-xs text-white"
                        />
                      </div>
                      <div>
                        <span className="block text-[10px] text-[#8b949e] uppercase mb-1 font-mono">Consignee Name</span>
                        <input 
                          type="text" 
                          placeholder="e.g. Nayara Logistics"
                          value={newConsigneeName}
                          onChange={(e) => setNewConsigneeName(e.target.value)}
                          className="w-full px-3 py-2 bg-[#161b22] border border-[#30363d] rounded text-xs text-white"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      <div className="col-span-2">
                        <span className="block text-[10px] text-[#8b949e] uppercase mb-1 font-mono">Chemical Product Fluid</span>
                        <input 
                          type="text" 
                          placeholder="e.g. Methanol Fluid"
                          value={newProduct}
                          onChange={(e) => setNewProduct(e.target.value)}
                          className="w-full px-3 py-2 bg-[#161b22] border border-[#30363d] rounded text-xs text-white"
                        />
                      </div>
                      <div>
                        <span className="block text-[10px] text-[#8b949e] uppercase mb-1 font-mono">Quantity Load</span>
                        <div className="flex bg-[#161b22] border border-[#30363d] rounded overflow-hidden">
                          <input 
                            type="number" 
                            placeholder="25"
                            value={newLrQty || ''}
                            onChange={(e) => setNewLrQty(parseFloat(e.target.value) || 0)}
                            className="w-full px-2 py-1 bg-transparent text-xs text-white border-none outline-none"
                          />
                          <select 
                            value={newLrQtyUnit}
                            onChange={(e) => setNewLrQtyUnit(e.target.value as 'KL' | 'MT')}
                            className="bg-[#21262d] border-none text-[10.5px] text-white px-1.5 font-mono cursor-pointer"
                          >
                            <option value="KL">KL</option>
                            <option value="MT">MT</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3.5">
                      <div>
                        <span className="block text-[10px] text-[#8b949e] uppercase mb-1 font-mono">Place Dispatch From</span>
                        <input 
                          type="text" 
                          placeholder="e.g. Ranoli"
                          value={newPlaceFrom}
                          onChange={(e) => setNewPlaceFrom(e.target.value)}
                          className="w-full px-3 py-2 bg-[#161b22] border border-[#30363d] rounded text-xs text-white"
                        />
                      </div>
                      <div>
                        <span className="block text-[10px] text-[#8b949e] uppercase mb-1 font-mono">Place Unloading To</span>
                        <input 
                          type="text" 
                          placeholder="e.g. Kandla"
                          value={newPlaceTo}
                          onChange={(e) => setNewPlaceTo(e.target.value)}
                          className="w-full px-3 py-2 bg-[#161b22] border border-[#30363d] rounded text-xs text-white"
                        />
                      </div>
                      <div>
                        <span className="block text-[10px] text-[#8b949e] uppercase mb-1 font-mono">Freight Rate (₹/Unit)</span>
                        <input 
                          type="number" 
                          placeholder="e.g. 1400"
                          value={newFreightRate || ''}
                          onChange={(e) => setNewFreightRate(parseFloat(e.target.value) || 0)}
                          className="w-full px-3 py-2 bg-[#161b22] border border-[#30363d] rounded text-xs text-white"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3.5">
                      <div className="col-span-2">
                        <span className="block text-[10px] text-[#8b949e] uppercase mb-1 font-mono">Lorry Receipt Registration L.R No.</span>
                        <input 
                          type="text" 
                          placeholder="Leave blank for auto-generate"
                          value={newLrNo}
                          onChange={(e) => setNewLrNo(e.target.value)}
                          className="w-full px-3 py-2 bg-[#161b22] border border-[#30363d] rounded text-xs text-white"
                        />
                      </div>
                      <div>
                        <span className="block text-[10px] text-[#8b949e] uppercase mb-1 font-mono">Valued Freight Total</span>
                        <div className="w-full px-3 py-2 bg-[#161b22]/50 border border-[#30363d]/60 rounded text-xs text-[#8b949e] font-bold">
                          ₹ {newLrQty * newFreightRate || 0}
                        </div>
                      </div>
                    </div>

                  </div>
                )}

                {/* Estimator details slider */}
                <div className="space-y-3.5 bg-[#1c212b] p-4.5 border border-[#30363d] rounded-2xl text-xs">
                  <span className="block text-xs font-mono text-white uppercase tracking-wider">
                    Journey Estimators (Engine Presets)
                  </span>
                  
                  <div className="space-y-1">
                    <div className="flex justify-between items-center text-[#8b949e] font-mono">
                      <span>Approximate Route Distance:</span>
                      <strong className="text-white">{approxDistance} Kms</strong>
                    </div>
                    <input 
                      type="range" 
                      min="50" 
                      max="1500" 
                      step="25"
                      value={approxDistance}
                      onChange={(e) => handleDistanceChange(parseInt(e.target.value))}
                      className="w-full accent-[#ff5a5f] bg-[#0d1117] h-1.5 rounded-full outline-none cursor-ew-resize"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4 pt-2.5 border-t border-[#30363d]/50 font-mono text-[11px] text-[#8b949e]">
                    <div className="bg-[#0d1117] p-2.5 border border-[#30363d] rounded-xl">
                      <span>Expected Fuel Load</span>
                      <strong className="block text-sm text-yellow-400 mt-1">{expectedFuel} Liters</strong>
                      <span className="text-[9px] block text-[#8b949e] mt-0.5">Calculated @ Loaded 3 Kms/L</span>
                    </div>
                    <div className="bg-[#0d1117] p-2.5 border border-[#30363d] rounded-xl">
                      <span>Expected AdBlue Load</span>
                      <strong className="block text-sm text-emerald-400 mt-1">{expectedAdblue} Liters</strong>
                      <span className="text-[9px] block text-[#8b949e] mt-0.5">Estimated @ 5% ratio</span>
                    </div>
                  </div>
                </div>

                {/* Submits */}
                <div className="flex justify-end gap-3 pt-4 border-t border-[#30363d]">
                  <button 
                    type="button" 
                    onClick={() => setShowTripModal(false)}
                    className="px-5 py-2.5 bg-[#21262d] text-[#8b949e] hover:text-white text-xs font-bold rounded-xl cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    className="px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-green-600 hover:brightness-110 text-white text-xs font-bold rounded-xl shadow-md cursor-pointer"
                  >
                    Dispatch Route Tracker
                  </button>
                </div>

              </form>
            </motion.div>
          </div>
        )}

        {/* REGISTER TANKER MODAL */}
        {showTankerModal && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#161b22] border border-[#30363d] rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl"
            >
              <div className="p-6 border-b border-[#30363d] flex items-center justify-between bg-[#1c212b]">
                <h3 className="text-white font-extrabold text-base flex items-center gap-2">
                  <Truck className="w-5 h-5 text-[#ff5a5f]" />
                  Register New Chemical Tanker
                </h3>
                <button 
                  onClick={() => setShowTankerModal(false)}
                  className="p-1.5 hover:bg-[#21262d] rounded-xl text-[#8b949e] hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={submitTanker} className="p-6 space-y-5">
                <div>
                  <label className="block text-xs font-mono text-[#8b949e] uppercase mb-1.5">Vehicle Registration Number (Humble Plate ID)</label>
                  <input 
                    type="text" 
                    placeholder="e.g. MH-43-Y-7821"
                    required
                    value={tankerNo}
                    onChange={(e) => setTankerNo(e.target.value)}
                    className="w-full px-4 py-2.5 bg-[#0d1117] border border-[#30363d] rounded-xl text-white outline-none focus:border-blue-500 uppercase font-bold tracking-wider"
                  />
                </div>

                <div className="bg-[#0d1117] p-5 border border-[#30363d] rounded-2xl space-y-4">
                  <span className="block text-xs font-mono text-white border-b border-[#21262d] pb-2 uppercase tracking-wide">
                    Compliancy Expiration Milestones
                  </span>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <span className="block text-[10px] text-[#8b949e] uppercase mb-1 font-mono">RTO RC Exp Date</span>
                      <input 
                        type="date" 
                        value={rcExp} 
                        onChange={(e) => setRcExp(e.target.value)}
                        className="w-full px-3 py-2 bg-[#161b22] border border-[#30363d] rounded-xl text-xs text-white" 
                      />
                    </div>
                    <div>
                      <span className="block text-[10px] text-[#8b949e] uppercase mb-1 font-mono">Fitness Certificate Exp</span>
                      <input 
                        type="date" 
                        value={fitnessExp} 
                        onChange={(e) => setFitnessExp(e.target.value)}
                        className="w-full px-3 py-2 bg-[#161b22] border border-[#30363d] rounded-xl text-xs text-white" 
                      />
                    </div>
                    <div>
                      <span className="block text-[10px] text-[#8b949e] uppercase mb-1 font-mono">Hydro Calibration Exp</span>
                      <input 
                        type="date" 
                        value={calibrationExp} 
                        onChange={(e) => setCalibrationExp(e.target.value)}
                        className="w-full px-3 py-2 bg-[#161b22] border border-[#30363d] rounded-xl text-xs text-white" 
                      />
                    </div>
                    <div>
                      <span className="block text-[10px] text-[#8b949e] uppercase mb-1 font-mono">RTO Permit Exp</span>
                      <input 
                        type="date" 
                        value={permitExp} 
                        onChange={(e) => setPermitExp(e.target.value)}
                        className="w-full px-3 py-2 bg-[#161b22] border border-[#30363d] rounded-xl text-xs text-white" 
                      />
                    </div>
                    <div>
                      <span className="block text-[10px] text-[#8b949e] uppercase mb-1 font-mono">National State Permit Exp</span>
                      <input 
                        type="date" 
                        value={natPermitExp} 
                        onChange={(e) => setNatPermitExp(e.target.value)}
                        className="w-full px-3 py-2 bg-[#161b22] border border-[#30363d] rounded-xl text-xs text-white" 
                      />
                    </div>
                    <div>
                      <span className="block text-[10px] text-[#8b949e] uppercase mb-1 font-mono">Suraksha Hazard Certificate Exp</span>
                      <input 
                        type="date" 
                        value={surakshaExp} 
                        onChange={(e) => setSurakshaExp(e.target.value)}
                        className="w-full px-3 py-2 bg-[#161b22] border border-[#30363d] rounded-xl text-xs text-white" 
                      />
                    </div>
                    <div>
                      <span className="block text-[10px] text-[#8b949e] uppercase mb-1 font-mono">PESO Explosives License Exp</span>
                      <input 
                        type="date" 
                        value={explosiveExp} 
                        onChange={(e) => setExplosiveExp(e.target.value)}
                        className="w-full px-3 py-2 bg-[#161b22] border border-[#30363d] rounded-xl text-xs text-white" 
                      />
                    </div>
                    <div>
                      <span className="block text-[10px] text-[#8b949e] uppercase mb-1 font-mono">Insurance Policy Exp</span>
                      <input 
                        type="date" 
                        value={insExp} 
                        onChange={(e) => setInsExp(e.target.value)}
                        className="w-full px-3 py-2 bg-[#161b22] border border-[#30363d] rounded-xl text-xs text-white" 
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-[#30363d]">
                  <button 
                    type="button" 
                    onClick={() => setShowTankerModal(false)}
                    className="px-5 py-2.5 bg-[#21262d] text-[#8b949e] hover:text-white text-xs font-bold rounded-xl cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:brightness-110 text-white text-xs font-bold rounded-xl shadow-md cursor-pointer"
                  >
                    Commit Tanker Registry
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {/* ADD DRIVER MODAL */}
        {showDriverModal && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#161b22] border border-[#30363d] rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl"
            >
              <div className="p-6 border-b border-[#30363d] flex items-center justify-between bg-[#1c212b]">
                <h3 className="text-white font-extrabold text-base flex items-center gap-2">
                  <UserPlus className="w-5 h-5 text-purple-400" />
                  Add Active Pilot (Driver File)
                </h3>
                <button 
                  onClick={() => setShowDriverModal(false)}
                  className="p-1.5 hover:bg-[#21262d] rounded-xl text-[#8b949e] hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={submitDriver} className="p-6 space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-mono text-[#8b949e] uppercase mb-1.5">Driver Full Name</label>
                    <input 
                      type="text" 
                      placeholder="e.g. Ramesh Kumar"
                      required
                      value={drvName}
                      onChange={(e) => setDrvName(e.target.value)}
                      className="w-full px-4 py-2.5 bg-[#0d1117] border border-[#30363d] rounded-xl text-white outline-none focus:border-blue-500 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-mono text-[#8b949e] uppercase mb-1.5">Emergency Contact Mobile</label>
                    <input 
                      type="text" 
                      placeholder="e.g. +91 94140 XXXXX"
                      required
                      value={drvContact}
                      onChange={(e) => setDrvContact(e.target.value)}
                      className="w-full px-4 py-2.5 bg-[#0d1117] border border-[#30363d] rounded-xl text-white outline-none focus:border-blue-500 text-xs font-mono"
                    />
                  </div>
                </div>

                <div className="p-4 bg-[#1b2230]/30 border border-[#30363d] rounded-xl grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-xs font-mono text-[#8b949e] uppercase">Custom Login Username</label>
                      <span className="text-[10px] text-blue-400 font-mono">Optional</span>
                    </div>
                    <input 
                      type="text" 
                      placeholder="e.g. ramesh_petro"
                      value={drvUsername}
                      onChange={(e) => setDrvUsername(e.target.value)}
                      className="w-full px-4 py-2.5 bg-[#0d1117] border border-[#30363d] rounded-xl text-white outline-none focus:border-blue-500 text-xs font-mono"
                    />
                    <p className="text-[9px] text-[#8b949e] mt-1">For custom login handles.</p>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-xs font-mono text-[#8b949e] uppercase">Login Phone Number</label>
                      <span className="text-[10px] text-blue-400 font-mono">Optional</span>
                    </div>
                    <input 
                      type="text" 
                      placeholder="e.g. 9876543210"
                      value={drvLoginPhone}
                      onChange={(e) => setDrvLoginPhone(e.target.value)}
                      className="w-full px-4 py-2.5 bg-[#0d1117] border border-[#30363d] rounded-xl text-white outline-none focus:border-blue-500 text-xs font-mono"
                    />
                    <p className="text-[9px] text-[#8b949e] mt-1">Specific phone number to login with.</p>
                  </div>
                  <div>
                    <label className="block text-xs font-mono text-[#8b949e] uppercase mb-1.5">Driver Access Passcode *</label>
                    <input 
                      type="password" 
                      placeholder="e.g. 123456"
                      required
                      value={drvPassword}
                      onChange={(e) => setDrvPassword(e.target.value)}
                      className="w-full px-4 py-2.5 bg-[#0d1117] border border-[#30363d] rounded-xl text-white outline-none focus:border-blue-500 text-xs font-mono"
                    />
                    <p className="text-[9px] text-[#8b949e] mt-1">Secure login passcode (Default: 123456).</p>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-mono text-[#8b949e] uppercase mb-1.5">Hazardous Driving License Number</label>
                  <input 
                    type="text" 
                    placeholder="e.g. DL-112020XXXXXXXX"
                    value={drvLicense}
                    onChange={(e) => setDrvLicense(e.target.value)}
                    className="w-full px-4 py-2.5 bg-[#0d1117] border border-[#30363d] rounded-xl text-white outline-none focus:border-blue-500 font-mono text-xs uppercase"
                  />
                </div>

                <div className="bg-[#0d1117] p-5 border border-[#30363d] rounded-2xl space-y-4">
                  <span className="block text-xs font-mono text-white border-b border-[#21262d] pb-2 uppercase tracking-wide">
                    Bank Accounts Remittance Details
                  </span>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div>
                      <span className="block text-[10px] text-[#8b949e] uppercase mb-1 font-mono">Bank Name</span>
                      <input 
                        type="text" 
                        placeholder="e.g. State Bank of India"
                        value={drvBankName}
                        onChange={(e) => setDrvBankName(e.target.value)}
                        className="w-full px-3 py-2 bg-[#161b22] border border-[#30363d] rounded-xl text-xs text-white"
                      />
                    </div>
                    <div>
                      <span className="block text-[10px] text-[#8b949e] uppercase mb-1 font-mono">Account Number</span>
                      <input 
                        type="text" 
                        placeholder="e.g. 302XXXXXXXX"
                        value={drvBankAcc}
                        onChange={(e) => setDrvBankAcc(e.target.value)}
                        className="w-full px-3 py-2 bg-[#161b22] border border-[#30363d] rounded-xl text-xs text-white"
                      />
                    </div>
                  </div>

                  <div>
                    <span className="block text-[10px] text-[#8b949e] uppercase mb-1 font-mono">Bank IFSC Code</span>
                    <input 
                      type="text" 
                      placeholder="e.g. SBIN0004512"
                      value={drvIfsc}
                      onChange={(e) => setDrvIfsc(e.target.value)}
                      className="w-full px-3 py-2 bg-[#161b22] border border-[#30363d] rounded-xl text-xs text-white uppercase font-mono"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-[#30363d]">
                  <button 
                    type="button" 
                    onClick={() => setShowDriverModal(false)}
                    className="px-5 py-2.5 bg-[#21262d] text-[#8b949e] hover:text-white text-xs font-bold rounded-xl cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:brightness-110 text-white text-xs font-bold rounded-xl shadow-md cursor-pointer"
                  >
                    Save Pilot File
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
