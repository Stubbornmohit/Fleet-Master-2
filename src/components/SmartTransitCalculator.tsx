import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Calculator, Navigation, Compass, TrendingUp, DollarSign, 
  MapPin, AlertTriangle, Truck, Sparkles, Clock, Check, HelpCircle
} from 'lucide-react';

interface RouteAiResult {
  distanceKm: number;
  routeDescription: string;
  durationHours: number;
  estimatedTollsInr: number;
  bypassPoints: string[];
  safeRestStopovers: string[];
  hazardsAndRestrictions: string[];
  recommendedAdblueLiters: number;
  fuelEfficiencyAdvice: string;
}

export default function SmartTransitCalculator() {
  const [activeTab, setActiveTab] = useState<'routing' | 'fuel' | 'loading'>('routing');
  
  // Tab 1: AI Routing State
  const [placeFrom, setPlaceFrom] = useState('Dahej Chemical Port');
  const [placeTo, setPlaceTo] = useState('Hazira Port Complex');
  const [axleCount, setAxleCount] = useState<number>(5);
  const [loadingAi, setLoadingAi] = useState(false);
  const [routeResult, setRouteResult] = useState<RouteAiResult | null>({
    distanceKm: 185,
    routeDescription: "State Highway 6 & NH-48 via Bharuch bypass",
    durationHours: 4.5,
    estimatedTollsInr: 950,
    bypassPoints: ["Bharuch Golden Chokdi Bypass", "Ankleshwar GIDC Outer Ring"],
    safeRestStopovers: ["Bharuch BPCL Transit Plaza", "Kim Highway Food Terminal"],
    hazardsAndRestrictions: [
      "Heavy congestion at Narmada bridge corridor - peak-hours restriction",
      "Overhead height check-gantry at Hazira GIDC approach"
    ],
    recommendedAdblueLiters: 11,
    fuelEfficiencyAdvice: "Maintain stable 45 km/h on state highways to overcome stop-and-go torque overheads."
  });
  const [customError, setCustomError] = useState('');

  // Tab 2: Fuel Economy State
  const [calcDistance, setCalcDistance] = useState<number>(185);
  const [isReturnTrip, setIsReturnTrip] = useState<boolean>(true);
  const [customAverage, setCustomAverage] = useState<number>(2.4); // km per Liter
  const [dieselPrice, setDieselPrice] = useState<number>(92.50);
  const [adbluePrice, setAdbluePrice] = useState<number>(45.00);
  const [adblueRatio, setAdblueRatio] = useState<number>(5.5); // Adblue as % of diesel consumption

  // Tab 3: Axle Load State
  const [tareWeight, setTareWeight] = useState<number>(14.5); // tonnes
  const [cargoWeight, setCargoWeight] = useState<number>(25.0); // tonnes

  // Pre-fills for Quick Origin/Destination selectors
  const quickHubs = [
    "Jamnagar Refinery",
    "Dahej Chemical Port",
    "Ranoli GIDC",
    "Mundra Petro Terminal",
    "Hazira Port Complex",
    "Ankleshwar Solvent Hub",
    "Mumbai Nhava Sheva",
    "Indore Transit Depot"
  ];

  // Request the backend AI route solver
  const handleQueryAiRoute = async () => {
    if (!placeFrom || !placeTo) {
      setCustomError("Please select both a Start Hub and a Destination.");
      return;
    }
    setLoadingAi(true);
    setCustomError('');
    try {
      const response = await fetch('/api/ai/route-calculator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ placeFrom, placeTo, axleCount })
      });
      const resData = await response.json();
      if (resData.success && resData.data) {
        setRouteResult(resData.data);
        // Sync distance directly to Fuel Calculator for high usability!
        setCalcDistance(resData.data.distanceKm);
      } else {
        setCustomError(resData.error || "Failed to solve route. Using high-probability estimations.");
      }
    } catch (err: any) {
      setCustomError("Network error contacting AI Cabin routing module.");
    } finally {
      setLoadingAi(false);
    }
  };

  // Instant React Active Calculation Core for Fuel Economy Tab
  const totalTravelKm = calcDistance * (isReturnTrip ? 2 : 1);
  const dieselNeededLiters = customAverage > 0 ? parseFloat((totalTravelKm / customAverage).toFixed(1)) : 0;
  const dieselCostInr = Math.round(dieselNeededLiters * dieselPrice);
  const adblueNeededLiters = parseFloat(((dieselNeededLiters * adblueRatio) / 100).toFixed(1));
  const adblueCostInr = Math.round(adblueNeededLiters * adbluePrice);
  const grossTripExpense = dieselCostInr + adblueCostInr;
  const inrPerKm = totalTravelKm > 0 ? parseFloat((grossTripExpense / totalTravelKm).toFixed(2)) : 0;

  // Axle weights / GVW details
  const grossVehicleWeight = parseFloat((tareWeight + cargoWeight).toFixed(1));
  const safePayloadAdvisory = axleCount === 5 ? 48.0 : axleCount === 4 ? 37.0 : 49.0; // Tonnes limit under MoRTH guidelines
  const isOverloaded = grossVehicleWeight > safePayloadAdvisory;

  return (
    <div className="bg-[#161b22] border border-[#30363d] rounded-2xl overflow-hidden p-6 shadow-xl relative leading-snug space-y-6">
      
      {/* Title block with sparkles */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#21262d] pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono bg-orange-500/10 border border-orange-500/20 text-orange-400 font-extrabold uppercase px-2 py-0.5 rounded tracking-wider">
              ✨ Command Suite
            </span>
            <span className="text-[10px] font-mono bg-blue-500/10 border border-blue-500/20 text-blue-400 font-bold px-2 py-0.5 rounded uppercase">
              5-Axle Specialist
            </span>
          </div>
          <h3 className="text-base font-bold text-white tracking-tight mt-1.5 flex items-center gap-2">
            <Calculator className="w-5 h-5 text-orange-500 animate-pulse" />
            <span>AI Transit Route & Fuel Planning Deck</span>
          </h3>
          <p className="text-xs text-[#8b949e] font-mono mt-0.5">
            Heavy-haul route hazards, precision diesel projections, and structural axle load audits.
          </p>
        </div>

        {/* Tab switcher */}
        <div className="flex bg-[#0d1117] border border-[#30363d] p-0.5 rounded-lg text-[11px] font-mono select-none">
          <button 
            type="button"
            onClick={() => setActiveTab('routing')}
            className={`py-1 px-2.5 rounded-md cursor-pointer font-bold transition-all ${activeTab === 'routing' ? 'bg-[#ff5a1f] text-white' : 'text-[#8b949e] hover:text-white'}`}
          >
            🗺️ AI Route
          </button>
          <button 
            type="button"
            onClick={() => setActiveTab('fuel')}
            className={`py-1 px-2.5 rounded-md cursor-pointer font-bold transition-all ${activeTab === 'fuel' ? 'bg-[#ff5a1f] text-white' : 'text-[#8b949e] hover:text-white'}`}
          >
            ⛽ Fuel Calculator
          </button>
          <button 
            type="button"
            onClick={() => setActiveTab('loading')}
            className={`py-1 px-2.5 rounded-md cursor-pointer font-bold transition-all ${activeTab === 'loading' ? 'bg-[#ff5a1f] text-white' : 'text-[#8b949e] hover:text-white'}`}
          >
            ⚖️ Axle Loads
          </button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {/* TAB 1: AI ROUTING SYSTEM */}
        {activeTab === 'routing' && (
          <motion.div
            key="routingTab"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-5"
          >
            {/* Quick selectors & custom fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10.5px] font-mono text-[#8b949e] uppercase tracking-wide block">Origination cargo pickup</label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-2.5 w-4 h-4 text-orange-500" />
                  <input
                    type="text"
                    value={placeFrom}
                    onChange={(e) => setPlaceFrom(e.target.value)}
                    placeholder="Enter dispatch origin city / refinery"
                    className="w-full pl-9 pr-4 py-2 bg-[#0d1117] border border-[#30363d] rounded-xl text-xs text-white outline-none focus:border-orange-500 font-sans"
                  />
                </div>
                {/* Quick select tags */}
                <div className="flex flex-wrap gap-1 mt-1">
                  {quickHubs.slice(0, 4).map((hub) => (
                    <button
                      key={hub}
                      type="button"
                      onClick={() => setPlaceFrom(hub)}
                      className={`text-[9px] font-mono px-1.5 py-0.5 rounded border transition-all cursor-pointer ${placeFrom === hub ? 'bg-orange-500/25 border-orange-500/50 text-white' : 'bg-[#0d1117] border-[#30363d] text-[#8b949e] hover:text-white'}`}
                    >
                      {hub.split(' ')[0]}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10.5px] font-mono text-[#8b949e] uppercase tracking-wide block">Cargo Destination delivery</label>
                <div className="relative">
                  <Navigation className="absolute left-3 top-2.5 w-4 h-4 text-orange-500" />
                  <input
                    type="text"
                    value={placeTo}
                    onChange={(e) => setPlaceTo(e.target.value)}
                    placeholder="Enter delivery port / complex"
                    className="w-full pl-9 pr-4 py-2 bg-[#0d1117] border border-[#30363d] rounded-xl text-xs text-white outline-none focus:border-orange-500 font-sans"
                  />
                </div>
                {/* Quick select tags */}
                <div className="flex flex-wrap gap-1 mt-1">
                  {quickHubs.slice(4, 8).map((hub) => (
                    <button
                      key={hub}
                      type="button"
                      onClick={() => setPlaceTo(hub)}
                      className={`text-[9px] font-mono px-1.5 py-0.5 rounded border transition-all cursor-pointer ${placeTo === hub ? 'bg-orange-500/25 border-orange-500/50 text-white' : 'bg-[#0d1117] border-[#30363d] text-[#8b949e] hover:text-white'}`}
                    >
                      {hub.split(' ')[0]}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Axles selector */}
            <div className="flex flex-wrap items-center justify-between gap-4 p-3 bg-[#0d1117] border border-[#30363d] rounded-xl">
              <div className="space-y-0.5">
                <span className="text-[11px] font-mono font-bold text-white block">Multi-Axle Heavy Configuration</span>
                <span className="text-[10px] text-[#8b949e]">Select vehicle axles (MoRTH regulations applied automatically).</span>
              </div>
              <div className="flex gap-1.5 select-none font-mono text-[10.5px]">
                {[
                  { value: 4, label: "4-Axle (12W / 37T)" },
                  { value: 5, label: "5-Axle (14W / 48T)" },
                  { value: 6, label: "6-Axle (18W / 49T)" }
                ].map((cfg) => (
                  <button
                    key={cfg.value}
                    type="button"
                    onClick={() => setAxleCount(cfg.value)}
                    className={`py-1 px-3 rounded-md font-bold transition-all cursor-pointer border ${axleCount === cfg.value ? 'bg-[#ff5a1f] border-[#ff5a1f] text-white shadow' : 'bg-[#161b22] border-[#30363d] text-[#8b949e] hover:text-white'}`}
                  >
                    {cfg.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Solver button */}
            <button
              type="button"
              disabled={loadingAi}
              onClick={handleQueryAiRoute}
              className="w-full py-2.5 bg-gradient-to-r from-orange-600 to-red-500 hover:from-orange-500 hover:to-red-400 disabled:opacity-50 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-all shadow-md focus:outline-none focus:ring-1 focus:ring-orange-500"
            >
              {loadingAi ? (
                <>
                  <Compass className="w-4 h-4 animate-spin text-white" />
                  <span>Consulting Logistics Counselor...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-white" />
                  <span>Analyse Heavy Cargo Route with Gemini AI</span>
                </>
              )}
            </button>

            {/* Error state */}
            {customError && (
              <div className="text-xs text-red-400 font-mono bg-red-400/5 border border-red-400/10 p-2.5 rounded-xl flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{customError}</span>
              </div>
            )}

            {/* Route Output Results Container */}
            {routeResult && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="bg-[#0d1117] border border-[#30363d] rounded-xl p-4 space-y-4"
              >
                {/* Distance summary */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pb-3.5 border-b border-[#21262d]">
                  <div>
                    <span className="block text-[9px] text-[#8b949e] uppercase font-mono mb-1">Heavy Route Distance</span>
                    <strong className="text-white text-lg font-black block font-sans tracking-tight">
                      {routeResult.distanceKm} <span className="text-xs font-normal text-orange-400">KM</span>
                    </strong>
                  </div>
                  <div>
                    <span className="block text-[9px] text-[#8b949e] uppercase font-mono mb-1">Transit Duration</span>
                    <strong className="text-white text-lg font-black block font-sans tracking-tight">
                      {routeResult.durationHours} <span className="text-xs font-normal text-orange-400">HRS</span>
                    </strong>
                  </div>
                  <div>
                    <span className="block text-[9px] text-[#8b949e] uppercase font-mono mb-1">Estimated Toll Charges</span>
                    <strong className="text-white text-lg font-black block font-sans tracking-tight">
                      ₹{routeResult.estimatedTollsInr}
                    </strong>
                  </div>
                  <div>
                    <span className="block text-[9px] text-[#8b949e] uppercase font-mono mb-1">NH Corridor Route</span>
                    <span className="text-xs text-[#8b949e] block font-mono truncate" title={routeResult.routeDescription}>
                      {routeResult.routeDescription}
                    </span>
                  </div>
                </div>

                {/* Left/Right Grid for stops & hazards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-sans">
                  <div className="space-y-2">
                    <div className="flex items-center gap-1.5 font-bold text-white text-[11px] uppercase tracking-wider font-mono">
                      <Check className="w-3.5 h-3.5 text-emerald-500" />
                      <span>Heavy bypass checkposts</span>
                    </div>
                    <ul className="space-y-1 pl-1 font-mono text-[10.5px] text-[#8b949e]">
                      {routeResult.bypassPoints.map((bp, i) => (
                        <li key={i} className="flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-orange-500 shrink-0" />
                          <span className="text-gray-300">{bp}</span>
                        </li>
                      ))}
                    </ul>

                    <div className="pt-2">
                      <div className="flex items-center gap-1.5 font-bold text-white text-[11px] uppercase tracking-wider font-mono">
                        <Clock className="w-3.5 h-3.5 text-[#ff5a1f]" />
                        <span>Recommended parking stops</span>
                      </div>
                      <ul className="space-y-1 pl-1 font-mono text-[10.5px] text-[#8b949e] mt-1.5">
                        {routeResult.safeRestStopovers.map((stop, i) => (
                          <li key={i} className="flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#ff5a1f] shrink-0" />
                            <span className="text-gray-300">{stop}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <div className="space-y-2.5 p-3 bg-red-500/5 border border-red-500/10 rounded-xl text-[11px]">
                    <div className="flex items-center gap-1.5 font-bold text-red-400 font-mono uppercase tracking-wider block">
                      <AlertTriangle className="w-3.5 h-3.5 text-red-400 shrink-0" />
                      <span>Route Hazard & height alerts</span>
                    </div>
                    <ul className="space-y-1.5 text-gray-300 list-disc list-inside leading-relaxed font-mono text-[10px]">
                      {routeResult.hazardsAndRestrictions.map((hz, i) => (
                        <li key={i}>{hz}</li>
                      ))}
                    </ul>
                    <div className="border-t border-red-500/10 pt-2 text-[10px] text-orange-400 leading-normal italic font-sans flex items-start gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-orange-400 shrink-0 mt-0.5" />
                      <span>{routeResult.fuelEfficiencyAdvice}</span>
                    </div>
                  </div>
                </div>

                {/* Usability Sync Banner */}
                <div className="bg-orange-500/10 border border-orange-500/20 p-2.5 rounded-xl flex items-center justify-between text-[11px] font-mono">
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-orange-400 shrink-0" />
                    <span className="text-gray-300">
                      Distance mapped directly to the active Fuel calculator (<strong className="text-white">{routeResult.distanceKm} KM</strong>)!
                    </span>
                  </div>
                  <button 
                    onClick={() => setActiveTab('fuel')} 
                    className="text-orange-400 hover:text-orange-300 hover:underline font-bold"
                  >
                    Configure Fuel Budget ➔
                  </button>
                </div>
              </motion.div>
            )}
          </motion.div>
        )}

        {/* TAB 2: FUEL BUDGET CALCULATOR */}
        {activeTab === 'fuel' && (
          <motion.div
            key="fuelTab"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-5"
          >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Distance Slider / Input */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center text-[10.5px] font-mono uppercase text-[#8b949e]">
                  <span>Trip One-way Distance</span>
                  <strong className="text-white font-black">{calcDistance} km</strong>
                </div>
                <input
                  type="number"
                  value={calcDistance}
                  onChange={(e) => setCalcDistance(Math.max(1, parseInt(e.target.value) || 0))}
                  className="w-full px-3 py-1.5 bg-[#0d1117] border border-[#30363d] rounded-xl text-xs text-white underline-none outline-none font-mono"
                />
                <input
                  type="range"
                  min="10"
                  max="1500"
                  value={calcDistance}
                  onChange={(e) => setCalcDistance(parseInt(e.target.value))}
                  className="w-full accent-orange-500 cursor-pointer h-1 rounded-lg"
                />
              </div>

              {/* Custom Efficiency Input with Quick Presets */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center text-[10.5px] font-mono uppercase text-[#8b949e]">
                  <span>Average fuel Efficiency</span>
                  <strong className="text-white font-black">{customAverage} km/L</strong>
                </div>
                <input
                  type="number"
                  step="0.1"
                  value={customAverage}
                  onChange={(e) => setCustomAverage(Math.max(0.1, parseFloat(e.target.value) || 0.1))}
                  className="w-full px-3 py-1.5 bg-[#0d1117] border border-[#30363d] rounded-xl text-xs text-white underline-none outline-none font-mono"
                />
                <div className="flex gap-1">
                  {[
                    { label: "Laden (2.2)", val: 2.2 },
                    { label: "Medium (2.7)", val: 2.7 },
                    { label: "Empty (3.5)", val: 3.5 }
                  ].map((preset) => (
                    <button
                      key={preset.val}
                      type="button"
                      onClick={() => setCustomAverage(preset.val)}
                      className={`flex-1 text-[9px] font-mono font-bold py-0.5 rounded border transition-all cursor-pointer ${customAverage === preset.val ? 'bg-orange-500/20 border-orange-500/40 text-orange-400' : 'bg-[#0d1117] border-[#30363d] text-[#8b949e] hover:text-white'}`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Return trip checklist details */}
              <div className="space-y-1.5 flex flex-col justify-between">
                <span className="text-[10.5px] font-mono uppercase text-[#8b949e] block">Return dispatch option</span>
                <div 
                  onClick={() => setIsReturnTrip(!isReturnTrip)}
                  className={`flex items-center gap-3 p-2.5 bg-[#0d1117] border rounded-xl cursor-pointer select-none transition-all ${isReturnTrip ? 'border-orange-500/40 bg-orange-500/5' : 'border-[#30363d]'}`}
                >
                  <div className={`w-4 h-4 rounded-md border flex items-center justify-center shrink-0 ${isReturnTrip ? 'bg-orange-500 border-orange-500 text-white' : 'border-[#30363d]'}`}>
                    {isReturnTrip && <Check className="w-3 h-3" />}
                  </div>
                  <div>
                    <span className="text-xs font-bold text-white block">Include Return Drive</span>
                    <span className="text-[10px] text-[#8b949e] block font-mono">
                      Total: {totalTravelKm} km transit loop
                    </span>
                  </div>
                </div>
                <div className="hidden md:block h-1" />
              </div>
            </div>

            {/* Price configs parameters list */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-3 bg-[#0d1117]/50 border border-[#30363d] rounded-xl text-xs font-mono">
              <div className="space-y-1">
                <span className="text-[9.5px] text-[#8b949e] uppercase block">Diesel Oil Price (Rs./L)</span>
                <input
                  type="number"
                  step="0.05"
                  value={dieselPrice}
                  onChange={(e) => setDieselPrice(parseFloat(e.target.value) || 0)}
                  className="w-full bg-[#0d1117] border border-[#30363d] p-1 px-2 rounded-lg text-white text-xs outline-none"
                />
              </div>
              <div className="space-y-1">
                <span className="text-[9.5px] text-[#8b949e] uppercase block">Adblue urea cost (Rs./L)</span>
                <input
                  type="number"
                  step="0.5"
                  value={adbluePrice}
                  onChange={(e) => setAdbluePrice(parseFloat(e.target.value) || 0)}
                  className="w-full bg-[#0d1117] border border-[#30363d] p-1 px-2 rounded-lg text-white text-xs outline-none"
                />
              </div>
              <div className="space-y-1 flex flex-col justify-end">
                <div className="flex justify-between text-[9.5px]">
                  <span className="text-[#8b949e] uppercase">Adblue dosage ratio</span>
                  <span className="text-orange-400 font-bold">{adblueRatio}% of Diesel</span>
                </div>
                <input
                  type="range"
                  min="3.0"
                  max="10.0"
                  step="0.5"
                  value={adblueRatio}
                  onChange={(e) => setAdblueRatio(parseFloat(e.target.value))}
                  className="w-full accent-orange-500 cursor-pointer h-1 rounded-lg"
                />
              </div>
            </div>

            {/* Calculations Summary display board */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-[#0d1117] border border-[#30363d] p-3.5 rounded-xl space-y-1">
                <span className="text-[9px] font-mono text-[#8b949e] uppercase block">Total fuel consumption</span>
                <strong className="text-white text-lg block font-mono">{dieselNeededLiters} <span className="text-xs text-gray-400">Ltrs</span></strong>
                <span className="text-[10px] text-gray-400 block font-mono">Est: <strong className="text-white">₹{dieselCostInr.toLocaleString()}</strong></span>
              </div>

              <div className="bg-[#0d1117] border border-[#30363d] p-3.5 rounded-xl space-y-1">
                <span className="text-[9px] font-mono text-[#8b949e] uppercase block">Adblue fluid needed</span>
                <strong className="text-white text-lg block font-mono">{adblueNeededLiters} <span className="text-xs text-gray-400">Ltrs</span></strong>
                <span className="text-[10px] text-gray-400 block font-mono">Est: <strong className="text-white font-mono">₹{adblueCostInr.toLocaleString()}</strong></span>
              </div>

              <div className="bg-gradient-to-br from-orange-600/10 to-red-500/10 border border-orange-500/30 p-3.5 rounded-xl space-y-1">
                <span className="text-[9px] font-mono text-orange-400 uppercase block font-bold">Estimated dispatch fuel cost</span>
                <strong className="text-white text-lg block font-mono">₹{grossTripExpense.toLocaleString()}</strong>
                <span className="text-[10px] text-gray-300 block font-mono">Metric: <strong className="text-orange-400">₹{inrPerKm}/KM</strong> direct cost</span>
              </div>
            </div>
          </motion.div>
        )}

        {/* TAB 3: AXLE LOAD MANAGER */}
        {activeTab === 'loading' && (
          <motion.div
            key="loadsTab"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-5"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-[#0d1117] border border-[#30363d] p-4 rounded-xl space-y-4">
                <span className="text-[10px] font-mono font-bold text-white uppercase block tracking-wider">
                  🚚 5-Axle Structural Specification Advisor
                </span>
                
                <div className="space-y-3 font-sans text-xs text-gray-300">
                  <p>
                    A standard <strong className="text-white">5-Axle Rigid Tanker / Semi-Trailer</strong> combines the pilot tractor (2 steering axles) and the trailer carriage (3 tandem heavy pusher-axles) with 14 physical tyres for cargo stability.
                  </p>
                  
                  <div className="bg-slate-900 border border-slate-800 p-3 rounded-lg text-[11px] leading-relaxed space-y-2 font-mono">
                    <strong className="text-white">Legal MoRTH Axle Capacity Caps:</strong>
                    <ul className="list-disc list-inside space-y-1 pl-1 text-[#8b949e]">
                      <li>Front steering tandem axle limit: <strong className="text-white">12.0 Tonnes</strong></li>
                      <li>Rear trailer triple tandem axle limit: <strong className="text-white">28.5 Tonnes</strong></li>
                      <li>Absolute Maximum Gross Vehicle Weight (GVW): <strong className="text-white">48.0 Tonnes</strong></li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="space-y-4 bg-[#0d1117] border border-[#30363d] p-4 rounded-xl">
                <span className="text-[10px] font-mono font-bold text-white uppercase block">
                  ⚖️ Real-Time Payload & Tare Weight Test
                </span>

                <div className="grid grid-cols-2 gap-3.5">
                  <div className="space-y-1.5">
                    <label className="text-[9.5px] font-mono text-[#8b949e] uppercase block">Unladen Tare Weight (MT)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={tareWeight}
                      onChange={(e) => setTareWeight(parseFloat(e.target.value) || 0)}
                      className="w-full bg-[#161b22] border border-[#30363d] p-2 rounded-xl text-white text-xs font-mono outline-none"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[9.5px] font-mono text-[#8b949e] uppercase block">Chemical Cargo Weight (MT)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={cargoWeight}
                      onChange={(e) => setCargoWeight(parseFloat(e.target.value) || 0)}
                      className="w-full bg-[#161b22] border border-[#30363d] p-2 rounded-xl text-white text-xs font-mono outline-none"
                    />
                  </div>
                </div>

                {/* Audit assessment board */}
                <div className="border-t border-[#21262d] pt-3.5 space-y-3">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-[#8b949e] font-mono">Calculated Gross Weight:</span>
                    <strong className="text-sm text-white font-mono">{grossVehicleWeight} Tonnes</strong>
                  </div>

                  {isOverloaded ? (
                    <div className="p-3 bg-red-400/5 border border-red-400/15 rounded-xl flex items-start gap-2.5">
                      <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                      <div className="text-[10.5px] leading-relaxed">
                        <strong className="text-red-400 font-mono block uppercase">⚠️ HEAVY AXLE OVERLOAD ALERT</strong>
                        <p className="text-gray-300 mt-0.5">
                          Calculated Gross weight surpasses standard MoRTH bounds for 5-axle tanker setups ({safePayloadAdvisory} tonnes). This poses bridge structural hazards and compliance liabilities.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="p-3 bg-emerald-500/5 border border-emerald-500/15 rounded-xl flex items-start gap-2.5">
                      <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      <div className="text-[10.5px] leading-relaxed">
                        <strong className="text-emerald-400 font-mono block uppercase">🟢 Axle-Load Compliant</strong>
                        <p className="text-gray-300 mt-0.5">
                          Total gross weight holds safe within lawful bounds (<strong className="text-white">{safePayloadAdvisory} MT limit</strong>). Safe for express toll roads and heavy highway bridges.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
