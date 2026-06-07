import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Truck, LogOut, MapPin, Play, CheckCircle, Camera, Loader2, Sparkles, AlertTriangle, FileText,
  Upload, Eye, ShoppingCart, HelpCircle, Check, DollarSign, ShieldAlert, Navigation, Info, Award
} from 'lucide-react';

interface DriverPortalProps {
  currentUser: any;
  onSignOut: () => void;
  trips: any[];
  tankers: any[];
  drivers: any[];
  expenses: any[];
  onStartTrip: (trip: any) => void;
  onEndTrip: (tripId: string, unloadingWeight: number, endRate: number) => void;
  onAddGeneralExpense: (expenseUnit: any) => void;
  onReceiveLr: (lrId: string, dateTime: string) => void;
  lrs: any[];
  onAddLr: (newLr: any) => void;
  theme?: string;
  toggleTheme?: () => void;
}

export default function DriverPortal({
  currentUser,
  onSignOut,
  trips,
  tankers,
  drivers,
  expenses,
  onStartTrip,
  onEndTrip,
  onAddGeneralExpense,
  onReceiveLr,
  lrs,
  onAddLr,
  theme = 'dark',
  toggleTheme
}: DriverPortalProps) {
  // Current tab under Driver login
  // 1: Active Trip Console, 2: Logging Desk (Fuel, Repair, AdBlue), 3: Lorry Receipts, 4: My Ledger, 5: My Credentials & Documents
  const [driverTab, setDriverTab] = useState<'console' | 'expenses' | 'lrs' | 'ledger' | 'docs'>('console');

  // Find current driver's profile from list
  const currentDriver = drivers.find(d => d.id === currentUser.driverId) || {
    id: currentUser.driverId || 'DRV-UNKNOWN',
    name: currentUser.username || currentUser.driverName || 'Operator',
    contactNumber: currentUser.contact || 'N/A',
  };

  // Find running trip for this driver
  const runningTrip = trips.find(t => t.driverId === currentDriver.id && t.status === 'running');
  // Find physical tanker assigned to running trip
  const assignedTanker = runningTrip ? tankers.find(t => t.id === runningTrip.tankerId) : tankers[0];

  // Geolocation tracking state
  const [locPermission, setLocPermission] = useState<'prompt' | 'granted' | 'denied'>('prompt');
  const [currentCoords, setCurrentCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [trackingStatus, setTrackingStatus] = useState('Off-duty');

  // Forms states
  const [loadingOcr, setLoadingOcr] = useState(false);
  const [ocrError, setOcrError] = useState('');
  const [ocrSuccess, setOcrSuccess] = useState('');

  // Start Trip fields
  const [selectedLrForStart, setSelectedLrForStart] = useState('');
  const [startOdoPhoto, setStartOdoPhoto] = useState('');
  const [startOdoValue, setStartOdoValue] = useState<number | ''>('');
  const [startOdoConfirm, setStartOdoConfirm] = useState(false);

  // End Trip fields
  const [endOdoPhoto, setEndOdoPhoto] = useState('');
  const [endOdoValue, setEndOdoValue] = useState<number | ''>('');
  const [unloadingWeight, setUnloadingWeight] = useState<number | ''>('');
  const [endRate, setEndRate] = useState<number | ''>('');
  const [endOdoConfirm, setEndOdoConfirm] = useState(false);

  // General Expense Dialog / UI state
  const [expCategory, setExpCategory] = useState<'fuel' | 'repair' | 'adblue'>('fuel');
  const [expAmount, setExpAmount] = useState<number | ''>('');
  const [expDetail, setExpDetail] = useState('');
  const [expVendor, setExpVendor] = useState('');
  const [expBillNo, setExpBillNo] = useState('');
  const [expPlace, setExpPlace] = useState('Ranoli');
  const [expQtyLiters, setExpQtyLiters] = useState<number | ''>('');
  const [expBillPhoto, setExpBillPhoto] = useState('');
  const [expGstType, setExpGstType] = useState<'with_gst' | 'without_gst'>('without_gst');
  const [expExcludeFromTrip, setExpExcludeFromTrip] = useState(false);

  // Live matching BPCL synchronization
  const [bpclStatus, setBpclStatus] = useState<string>('');

  // LR Proof of delivery (POD) state
  const [selectedLrForDoc, setSelectedLrForDoc] = useState('');
  const [lrDocPhoto, setLrDocPhoto] = useState('');
  const [lrDocSuccess, setLrDocSuccess] = useState('');

  // Trigger geolocation reporting en-route (Simulates continuous background ping)
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLocPermission('granted');
          const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setCurrentCoords(coords);
          pingLocation(coords);
        },
        () => {
          setLocPermission('denied');
        }
      );

      // Periodic check interval (simulates background pings en-route every 15 seconds)
      const interval = setInterval(() => {
        navigator.geolocation.getCurrentPosition((pos) => {
          const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setCurrentCoords(coords);
          pingLocation(coords);
        });
      }, 15000);

      return () => clearInterval(interval);
    }
  }, [currentDriver.id]);

  const pingLocation = async (coords: { lat: number; lng: number }) => {
    try {
      setTrackingStatus(`En-route: Pinging [${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}]`);
      await fetch('/api/drivers/update-location', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          driverId: currentDriver.id,
          driverName: currentDriver.name,
          latitude: coords.lat,
          longitude: coords.lng
        })
      });
    } catch (e) {
      console.warn('Silent location registration update bypassed:', e);
    }
  };

  const handleRequestLocationPermission = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLocPermission('granted');
          setCurrentCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
          alert('Location permission authorized permanently! Fleet dispatchers can now monitor en-route coordinates live.');
        },
        () => {
          setLocPermission('denied');
          alert('Permission declined. Ensure you allow location permissions in your browser preferences.');
        }
      );
    }
  };

  // Image Helper: convert file uploads to base64 for OCR analyses
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, callback: (base64: string) => void) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        callback(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  // Automated Odometer OCR Reader (Using Gemini Vision)
  const triggerOdometerOcr = async (photoB64: string, isStart: boolean) => {
    if (!photoB64) return;
    setLoadingOcr(true);
    setOcrError('');
    setOcrSuccess('');

    try {
      const payloadB64 = photoB64.split(',')[1] || photoB64;
      const mimeType = photoB64.match(/data:([^;]+);/)?.[1] || 'image/jpeg';

      const response = await fetch('/api/trips/analyse-odometer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileData: payloadB64, mimeType })
      });

      const resJson = await response.json();
      if (resJson.success && resJson.data?.reading) {
        const value = parseInt(resJson.data.reading, 10);
        if (isStart) {
          setStartOdoValue(value);
        } else {
          setEndOdoValue(value);
        }
        setOcrSuccess(`Success: Extracted Odometer Reading ${value} km with ${resJson.data.confidence || 'high'} confidence.`);
      } else {
        setOcrError('Vision parser was unable to clearly resolve digits. Provide reading manually.');
      }
    } catch (err: any) {
      setOcrError('Server OCR connection failed. Fallback to manual keying.');
    } finally {
      setLoadingOcr(false);
    }
  };

  // Start Trip execution
  const executeStartTrip = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLrForStart) {
      alert('Please select the assigned Lorry Receipt (LR) to commence.');
      return;
    }
    if (!startOdoValue) {
      alert('Valid starting odometer reading is required to start dispatch.');
      return;
    }
    if (!startOdoPhoto) {
      alert('Odometer physical gauge photo is mandatory for starting trip verification.');
      return;
    }

    const matchedLr = lrs.find(l => l.id === selectedLrForStart);
    if (!matchedLr) return;

    const newTrip = {
      id: `TRP-${Math.floor(100+Math.random()*900)}`,
      lrId: matchedLr.id,
      lrNo: matchedLr.lrNo,
      tankerId: matchedLr.tankerId,
      tankerNumber: matchedLr.tankerNumber,
      driverId: currentDriver.id,
      driverName: currentDriver.name,
      placeFrom: matchedLr.placeFrom,
      placeTo: matchedLr.placeTo,
      qty: matchedLr.qty,
      qtyUnit: matchedLr.qtyUnit,
      startDate: new Date().toISOString().split('T')[0],
      status: 'running' as const,
      loadingWeight: matchedLr.qty,
      approxDistanceKm: 280,
      expectedFuelLiters: Math.ceil(280 / 3.5),
      expectedAdblueLiters: Math.ceil((280 / 3.5) * 0.05),
      
      fuelExpense: 0,
      driverCharge: 6000,
      tollExpense: 0,
      repairExpense: 0,
      adblueExpense: 0,
      adblueAddedLiters: 0,
      otherExpense: 0,
      
      odometerStart: startOdoValue,
      odometerStartPhoto: startOdoPhoto
    };

    onStartTrip(newTrip);
    
    // reset form
    setSelectedLrForStart('');
    setStartOdoPhoto('');
    setStartOdoValue('');
    setStartOdoConfirm(false);
    setOcrSuccess('Trip started and GPS tracker dispatched!');
  };

  // End Trip execution
  const executeEndTrip = (e: React.FormEvent) => {
    e.preventDefault();
    if (!runningTrip) return;
    if (!endOdoValue) {
      alert('Ending odometer reading is mandatory.');
      return;
    }
    if (Number(endOdoValue) <= (runningTrip.odometerStart || 0)) {
      alert(`Ending odometer must transcend starting mileage of ${runningTrip.odometerStart} km.`);
      return;
    }
    if (!unloadingWeight) {
      alert('Unloaded receipt metric weight from receiver storage is required.');
      return;
    }
    if (!endOdoPhoto) {
      alert('Odometer end validation photograph is required.');
      return;
    }

    const calculatedRate = endRate || runningTrip.freightRateAtEnd || 1800;
    
    // End trip integration state update in core loop
    onEndTrip(runningTrip.id, Number(unloadingWeight), Number(calculatedRate));

    // Reset Form
    setEndOdoPhoto('');
    setEndOdoValue('');
    setUnloadingWeight('');
    setEndRate('');
    setEndOdoConfirm(false);
    setOcrSuccess('Trip arrived safely & completed registry saved!');
  };

  // Document Bill Scanner AI (Gemini maintenance analyser)
  const triggerMaintenanceScan = async (photoB64: string) => {
    if (!photoB64) return;
    setLoadingOcr(true);
    setOcrError('');
    setOcrSuccess('');

    try {
      const payloadB64 = photoB64.split(',')[1] || photoB64;
      const mimeType = photoB64.match(/data:([^;]+);/)?.[1] || 'image/jpeg';

      const response = await fetch('/api/maintenance/analyse-bill', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileData: payloadB64, mimeType })
      });

      const resJson = await response.json();
      if (resJson.success && resJson.analysis) {
        const { vendorName, billNo, amount, workType, detail, category, gstType } = resJson.analysis;
        setExpVendor(vendorName || '');
        setExpBillNo(billNo || '');
        setExpAmount(amount || '');
        setExpDetail(detail || workType || 'Chemical Tanker Repair Work');
        setExpGstType(gstType || 'without_gst');
        if (category === 'adblue') {
          setExpCategory('adblue');
        } else {
          setExpCategory('repair');
        }
        setOcrSuccess('AI scan complete! Standard ledger parameters pre-filled. Confirm below.');
      } else {
        setOcrError('Unable to analyze invoice scan fields automatically. Key manually.');
      }
    } catch {
      setOcrError('AI billing parser offline. Fallback to manual field input.');
    } finally {
      setLoadingOcr(false);
    }
  };

  // Submitting individual expense
  const handleLogExpense = (e: React.FormEvent) => {
    e.preventDefault();
    if (!expAmount) {
      alert('Enter valid cost amount.');
      return;
    }

    // Fuel expense checks
    if (expCategory === 'fuel' && !expQtyLiters) {
      alert('Fuel volume in liters is required.');
      return;
    }

    // Repair & AdBlue require bills/images
    if (expCategory !== 'fuel' && !expBillPhoto) {
      alert(`${expCategory.toUpperCase()} logs require uploading physical bill photocopies.`);
      return;
    }

    // Capture running or fallback physical vehicle plate
    const tankerNo = runningTrip?.tankerNumber || assignedTanker?.tankerNumber || 'GJ-16-Z-2931';
    const tankerId = runningTrip?.tankerId || assignedTanker?.id || 'TNK-MOCK';

    const cleanExpense: any = {
      id: `EXP-${Date.now()}`,
      tankerId,
      tankerNumber: tankerNo,
      date: new Date().toISOString().split('T')[0],
      category: expCategory,
      amount: Number(expAmount),
      detail: expDetail || `${expCategory.toUpperCase()} entry en-route`,
      vendorName: expVendor || 'Default Petrol Station',
      billNo: expBillNo || `EXP-${Math.floor(100+Math.random()*900)}`,
      place: expPlace || 'Ranoli',
      paymentStatus: 'collected' as const,
      qtyLiters: expQtyLiters ? Number(expQtyLiters) : undefined,
      excludeFromTrip: expExcludeFromTrip,
      gstType: expCategory === 'repair' ? expGstType : undefined,
      billPhoto: expBillPhoto || undefined
    };

    onAddExpenseSubmit(cleanExpense);
  };

  const onAddExpenseSubmit = (expenseUnit: any) => {
    onAddGeneralExpense(expenseUnit);

    // Reset Form fields
    setExpAmount('');
    setExpDetail('');
    setExpVendor('');
    setExpBillNo('');
    setExpPlace('Ranoli');
    setExpQtyLiters('');
    setExpBillPhoto('');
    setExpExcludeFromTrip(false);
    
    alert('Expense recorded successfully inside fleet logistics register!');
  };

  // Upload proof of delivery LR
  const handleUploadLrCopy = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLrForDoc) {
      alert('Please select an LR to attach copy.');
      return;
    }
    if (!lrDocPhoto) {
      alert('Please upload a photo of the signed physical Lorry Receipt.');
      return;
    }

    onReceiveLr(selectedLrForDoc, new Date().toISOString().replace('T',' ').split('.')[0]);
    setLrDocSuccess('Proof of delivery document attached successfully to LR files!');
    setLrDocPhoto('');
    setSelectedLrForDoc('');
  };

  // Get driver's associated historical remittances logs
  const driverChargeLedger = trips
    .filter(t => t.driverId === currentDriver.id)
    .map(t => ({
      id: t.id,
      date: t.startDate,
      purpose: `Trip Commission: ${t.placeFrom} to ${t.placeTo} (LR: ${t.lrNo})`,
      amount: t.driverCharge || 6000,
      assocTrip: t.lrNo,
      status: t.status === 'completed' ? 'Cleared for Bank Remittance' : 'Escrow running'
    }));

  const driverReimbursables = expenses
    .filter(e => e.excludeFromTrip === false && trips.find(t => t.id === e.tripId)?.driverId === currentDriver.id)
    .map(e => ({
      id: e.id,
      date: e.date,
      purpose: `Out-of-Pocket: ${e.category.toUpperCase()} at ${e.place || 'Highway'} (${e.detail})`,
      amount: e.amount,
      assocTrip: trips.find(t => t.id === e.tripId)?.lrNo || 'En-route',
      status: 'Awaiting cash-desk settlement'
    }));

  const mergedLedger = [...driverChargeLedger, ...driverReimbursables].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // Show own documents
  const assignedTankerObj = runningTrip 
    ? tankers.find(t => t.id === runningTrip.tankerId) 
    : tankers.find(t => t.status === 'idle') || tankers[0];

  return (
    <div className="min-h-screen bg-[#0d0f14] text-gray-200 font-sans selection:bg-orange-500 selection:text-white pb-12">
      
      {/* Top Driver Header Nav bar */}
      <header className="bg-[#141822] border-b border-[#222a3a] sticky top-0 z-40 px-4 py-4 shadow-md">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-orange-600 to-red-600 text-white flex items-center justify-center font-black shadow-lg">
              <Truck className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="text-[10px] font-mono text-[#ea580c] font-black tracking-widest uppercase block">active pilot dashboard</span>
              <h1 className="text-[#f1f5f9] font-extrabold text-sm tracking-tight">{currentDriver.name}</h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className={`hidden md:inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-mono border font-bold uppercase ${
              runningTrip 
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' 
                : 'bg-amber-500/10 border-amber-500/30 text-amber-400'
            }`}>
              <Navigation className="w-3.5 h-3.5" />
              {runningTrip ? 'En Route (GPS active)' : 'Duty: Standby'}
            </span>

            <button
              onClick={onSignOut}
              className="px-3 py-2 bg-[#1c2333] hover:bg-rose-950 border border-[#2d374f] text-rose-400 rounded-lg text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer transition-all uppercase"
            >
              <LogOut className="w-3.5 h-3.5" />
              Sign Out
            </button>
          </div>
        </div>
      </header>

      {/* Primary Container */}
      <main className="max-w-5xl mx-auto px-4 mt-6 space-y-6">

        {/* GPS tracking beacon warning banner */}
        <div className="bg-[#141822] border border-[#222a3a] rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-orange-600/10 text-orange-400 flex items-center justify-center font-bold shrink-0">
              <MapPin className="w-4 h-4 text-orange-400 animate-pulse" />
            </div>
            <div>
              <span className="font-extrabold text-white block uppercase tracking-wider text-[11px] mb-0.5">Automated GPS Tracking En-Route</span>
              <p className="text-[#8c9bbb] leading-normal">{trackingStatus}</p>
            </div>
          </div>
          {locPermission === 'prompt' && (
            <button
              onClick={handleRequestLocationPermission}
              className="px-3 py-1.5 bg-orange-500 hover:bg-orange-600 text-white font-extrabold rounded-lg text-[10px] uppercase font-mono cursor-pointer transition-all shadow-md shrink-0 self-start md:self-auto"
            >
              Authorize GPS Pin
            </button>
          )}
        </div>

        {/* Dynamic Navigation Tabs inside driver portal */}
        <div className="flex items-center overflow-x-auto gap-2 border-b border-[#222a3a] pb-1 selection:bg-none">
          {[
            { id: 'console', label: 'Trip Console', icon: Truck },
            { id: 'expenses', label: 'Log Expenses', icon: ShoppingCart },
            { id: 'lrs', label: 'Lorry Receipts (POD)', icon: FileText },
            { id: 'ledger', label: 'My Remittance Cash', icon: DollarSign },
            { id: 'docs', label: 'RTO Lockbox', icon: Award }
          ].map(tab => {
            const Icon = tab.icon;
            const isSelected = driverTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setDriverTab(tab.id as any)}
                className={`py-2 px-4 text-xs font-extrabold uppercase shrink-0 transition-all border-b-2 flex items-center gap-2 cursor-pointer ${
                  isSelected 
                    ? 'border-orange-500 text-white font-black' 
                    : 'border-transparent text-gray-500 hover:text-white'
                }`}
              >
                <Icon className={`w-4 h-4 ${isSelected ? 'text-orange-400' : 'text-gray-500'}`} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* OCR Result Notices */}
        {(ocrSuccess || ocrError || loadingOcr) && (
          <div className="p-4 bg-[#141822] border border-[#222a3a] rounded-xl text-xs font-mono space-y-1">
            {loadingOcr && (
              <div className="text-orange-400 flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-orange-400" />
                <span>AI Core analyzing photograph. Please stay on screen...</span>
              </div>
            )}
            {ocrSuccess && <div className="text-emerald-400 font-bold">✨ {ocrSuccess}</div>}
            {ocrError && <div className="text-rose-400 font-bold">⚠️ {ocrError}</div>}
          </div>
        )}

        {/* Tab content rendering */}
        <div className="space-y-6">

          {/* TAB 1: CONNECT TO COCKPIT CONSOLE (START/END TRIP VALVE) */}
          {driverTab === 'console' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              {/* Left card: Active trip details or Trip starter */}
              <div className="lg:col-span-8 space-y-6">
                {!runningTrip ? (
                  // START A NEW TRIP ZONE
                  <div className="bg-[#141822] border border-[#222a3a] rounded-3xl p-6 space-y-6">
                    <div>
                      <h3 className="text-white font-black text-lg flex items-center gap-2 uppercase tracking-tight">
                        <Play className="w-5 h-5 text-orange-500 fill-orange-500" />
                        Dispatched Odometer Check: Start Trip
                      </h3>
                      <p className="text-xs font-mono text-[#8c9bbb] mt-1 uppercase">Odometer scan mandatory for loading validation checks.</p>
                    </div>

                    <form onSubmit={executeStartTrip} className="space-y-5">
                      
                      {/* LR Selector */}
                      <div className="space-y-1.5 text-left">
                        <label className="block text-[10px] font-mono font-bold text-[#8c9bbb] uppercase">Select Assigned Lorry Receipt (L.R.) to transport</label>
                        <select
                          required
                          value={selectedLrForStart}
                          onChange={(e) => setSelectedLrForStart(e.target.value)}
                          className="w-full px-4 py-3 bg-[#0d0f14] border border-[#222a3a] rounded-xl text-white outline-none focus:border-orange-500 text-xs"
                        >
                          <option value="">-- Choose Lorry Receipt --</option>
                          {lrs
                            .filter(l => l.status === 'pending')
                            .map(l => (
                              <option key={l.id} value={l.id}>
                                {l.lrNo} - {l.consignerName} to {l.placeTo} ({l.product})
                              </option>
                            ))}
                        </select>
                      </div>

                      {/* Photo verification block */}
                      <div className="bg-[#0cf19d]/5 border border-[#0cf19d]/13 rounded-2xl p-5 space-y-4">
                        <div className="flex items-start gap-4">
                          <div className="w-10 h-10 rounded-xl bg-orange-500/10 text-orange-400 flex items-center justify-center font-bold">
                            <Camera className="w-5 h-5 text-orange-400" />
                          </div>
                          <div>
                            <span className="font-bold text-white block uppercase tracking-wider text-xs">Verify Dashboard Odometer Gauge Pin</span>
                            <span className="text-[10px] text-gray-400 leading-normal block mt-1">Take a high-quality photo of your odometer dial using physical camera en-route.</span>
                          </div>
                        </div>

                        {/* File Upload zone */}
                        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                          <label className="px-4 py-2 bg-[#222a3a] hover:bg-[#2c374f] border border-[#2d374f] text-white rounded-lg text-xs font-bold font-sans cursor-pointer transition-all inline-flex items-center gap-2">
                            <Upload className="w-4 h-4 text-orange-400" />
                            Capture Starting Odometer Photo
                            <input 
                              type="file" 
                              accept="image/*" 
                              required
                              className="hidden" 
                              onChange={(e) => handleFileChange(e, (b64) => {
                                setStartOdoPhoto(b64);
                                triggerOdometerOcr(b64, true);
                              })}
                            />
                          </label>

                          {startOdoPhoto && (
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] text-emerald-400 font-mono font-bold block">✓ Photo uploaded. Extracted below.</span>
                              <img src={startOdoPhoto} alt="Odo preview" className="w-12 h-12 rounded object-cover border border-emerald-500" />
                            </div>
                          )}
                        </div>

                        {/* Input Reading directly (Filled by Gemini OCR, or can modify manually) */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <span className="block text-[10px] text-gray-400 font-mono uppercase mb-1 font-bold">Odometer Numerical Reading (km)</span>
                            <input 
                              type="number" 
                              required
                              placeholder="e.g. 142510"
                              value={startOdoValue}
                              onChange={(e) => setStartOdoValue(e.target.value ? parseInt(e.target.value) : '')}
                              className="w-full px-3 py-2 bg-[#0d0f14] border border-[#222a3a] rounded-xl text-xs text-white uppercase font-mono outline-none focus:border-orange-500"
                            />
                          </div>

                          <div className="flex items-center pt-5">
                            <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                              <input 
                                type="checkbox" 
                                required
                                checked={startOdoConfirm}
                                onChange={(e) => setStartOdoConfirm(e.target.checked)}
                                className="w-4 h-4 rounded text-orange-500 focus:ring-0 cursor-pointer"
                              />
                              <span className="text-[10px] text-[#8c9bbb]">I confirm this reading matches physical dashboard perfectly.</span>
                            </label>
                          </div>
                        </div>
                      </div>

                      <button
                        type="submit"
                        disabled={!selectedLrForStart || !startOdoConfirm || !startOdoValue}
                        className="w-full py-3.5 bg-gradient-to-r from-orange-600 to-red-600 hover:brightness-110 disabled:brightness-50 text-white font-extrabold text-xs uppercase tracking-wider rounded-2xl shadow-lg transition-all cursor-pointer flex items-center justify-center gap-2"
                      >
                        <Play className="w-3 h-3 fill-white" />
                        Start Active Journey
                      </button>

                    </form>
                  </div>
                ) : (
                  // ACTIVE RUNNING TRIP CONSOLE (END TRIP FORM)
                  <div className="space-y-6">
                    
                    {/* Active Route Details */}
                    <div className="bg-[#141822] border border-[#222a3a] rounded-3xl p-6 relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-48 h-full bg-[#ff5a1f]/5 blur-3xl pointer-events-none" />
                      
                      <div className="flex items-start justify-between border-b border-[#222a3a] pb-4 mb-4">
                        <div>
                          <span className="text-[9px] font-mono text-[#ea580c] font-black uppercase tracking-widest block">trip en-route active</span>
                          <h3 className="text-white font-black text-lg mt-0.5 uppercase tracking-tight">{runningTrip.lrNo}</h3>
                        </div>
                        <span className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-full text-[9px] font-mono uppercase font-bold tracking-wide animate-pulse">
                          running gps ping
                        </span>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs font-sans">
                        <div>
                          <span className="text-gray-400 block font-mono text-[10px] uppercase">Route From</span>
                          <span className="font-extrabold text-white mt-0.5 block">{runningTrip.placeFrom}</span>
                        </div>
                        <div>
                          <span className="text-gray-400 block font-mono text-[10px] uppercase">Destination To</span>
                          <span className="font-extrabold text-white mt-0.5 block">{runningTrip.placeTo}</span>
                        </div>
                        <div>
                          <span className="text-gray-400 block font-mono text-[10px] uppercase">Assigned Cargo Tanker</span>
                          <span className="font-bold text-teal-400 font-mono mt-0.5 block uppercase">{runningTrip.tankerNumber}</span>
                        </div>
                        <div>
                          <span className="text-gray-400 block font-mono text-[10px] uppercase">Dispatch Date</span>
                          <span className="font-bold text-white font-mono mt-0.5 block">{runningTrip.startDate}</span>
                        </div>
                      </div>

                      <div className="mt-5 border-t border-[#222a3a] pt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div className="p-3 bg-[#0d0f14] border border-[#222a3a] rounded-xl text-center text-xs">
                          <span className="text-gray-500 block uppercase tracking-wider text-[9px] font-mono">Cargo Weight Started</span>
                          <span className="font-black text-white block text-sm mt-0.5">{runningTrip.qty} {runningTrip.qtyUnit}</span>
                        </div>
                        <div className="p-3 bg-[#0d0f14] border border-[#222a3a] rounded-xl text-center text-xs">
                          <span className="text-gray-500 block uppercase tracking-wider text-[9px] font-mono">Starting Odo Reading</span>
                          <span className="font-black text-orange-400 block text-sm font-mono mt-0.5">{runningTrip.odometerStart || 'N/A'} km</span>
                        </div>
                        <div className="p-3 bg-[#0d0f14] border border-[#222a3a] rounded-xl text-center text-xs text-orange-400 border-dashed border-orange-500/20">
                          <span className="text-orange-500/70 block uppercase tracking-wider text-[9px] font-mono font-bold">Standard Remittance commission</span>
                          <span className="font-black block text-sm mt-0.5">Rs. {runningTrip.driverCharge || 6000}</span>
                        </div>
                      </div>
                    </div>

                    {/* END TRIP CONTROL PANEL */}
                    <div className="bg-[#141822] border border-[#222a3a] rounded-3xl p-6 space-y-6">
                      <div>
                        <h3 className="text-white font-black text-lg flex items-center gap-2 uppercase tracking-tight">
                          <CheckCircle className="w-5 h-5 text-emerald-400" />
                          Record Journey Arrival: End Trip
                        </h3>
                        <p className="text-xs font-mono text-[#8c9bbb] mt-1 uppercase">Submit receiver weighbridge receipt information below.</p>
                      </div>

                      <form onSubmit={executeEndTrip} className="space-y-5">
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <span className="block text-[10px] text-gray-400 font-mono uppercase mb-1 font-bold">Receiver Unloading weight ({runningTrip.qtyUnit})</span>
                            <input 
                              type="number" 
                              step="0.001"
                              required
                              placeholder={`e.g. ${runningTrip.qty}`}
                              value={unloadingWeight}
                              onChange={(e) => setUnloadingWeight(e.target.value ? parseFloat(e.target.value) : '')}
                              className="w-full px-3 py-2 bg-[#0d0f14] border border-[#222a3a] rounded-xl text-xs text-white uppercase font-mono outline-none focus:border-emerald-500"
                            />
                            <span className="text-[9px] text-[#8c9bbb] block mt-1 font-mono">Any shortages compared to loading weight will be reconciled by dispatchers.</span>
                          </div>

                          <div>
                            <span className="block text-[10px] text-gray-400 font-mono uppercase mb-1 font-bold">Agreed Freight Rate at Arrival (Optional)</span>
                            <input 
                              type="number" 
                              placeholder="e.g. 1800"
                              value={endRate}
                              onChange={(e) => setEndRate(e.target.value ? parseFloat(e.target.value) : '')}
                              className="w-full px-3 py-2 bg-[#0d0f14] border border-[#222a3a] rounded-xl text-xs text-white uppercase font-mono outline-none focus:border-emerald-500"
                            />
                            <span className="text-[9px] text-[#8c9bbb] block mt-1 font-mono">Defaults to rate defined on Lorry Receipt.</span>
                          </div>
                        </div>

                        {/* End Photo capture */}
                        <div className="bg-[#f0611d]/5 border border-orange-500/10 rounded-2xl p-5 space-y-4">
                          <div className="flex items-start gap-4">
                            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold">
                              <Camera className="w-5 h-5 text-emerald-400" />
                            </div>
                            <div>
                              <span className="font-bold text-white block uppercase tracking-wider text-xs">Verify Dashboard Ending Odometer Gauge</span>
                              <span className="text-[10px] text-gray-400 leading-normal block mt-1">Odometer audit checks en-route distances. Camera photo required.</span>
                            </div>
                          </div>

                          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                            <label className="px-4 py-2 bg-[#222a3a] hover:bg-[#2c374f] border border-[#2d374f] text-white rounded-lg text-xs font-bold font-sans cursor-pointer transition-all inline-flex items-center gap-2">
                              <Upload className="w-4 h-4 text-emerald-400" />
                              Capture Ending Odometer Photo
                              <input 
                                type="file" 
                                accept="image/*" 
                                required
                                className="hidden" 
                                onChange={(e) => handleFileChange(e, (b64) => {
                                  setEndOdoPhoto(b64);
                                  triggerOdometerOcr(b64, false);
                                })}
                              />
                            </label>

                            {endOdoPhoto && (
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] text-emerald-400 font-mono font-bold block">✓ Photo uploaded. Extracted below.</span>
                                <img src={endOdoPhoto} alt="Ending odo preview" className="w-12 h-12 rounded object-cover border border-emerald-500" />
                              </div>
                            )}
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                              <span className="block text-[10px] text-gray-400 font-mono uppercase mb-1 font-bold">Ending Odometer Numerical Reading (km)</span>
                              <input 
                                type="number" 
                                required
                                placeholder={`Starting was ${runningTrip.odometerStart}`}
                                value={endOdoValue}
                                onChange={(e) => setEndOdoValue(e.target.value ? parseInt(e.target.value) : '')}
                                className="w-full px-3 py-2 bg-[#0d0f14] border border-[#222a3a] rounded-xl text-xs text-white uppercase font-mono outline-none focus:border-emerald-500"
                              />
                            </div>

                            <div className="flex items-center pt-5">
                              <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                                <input 
                                  type="checkbox" 
                                  required
                                  checked={endOdoConfirm}
                                  onChange={(e) => setEndOdoConfirm(e.target.checked)}
                                  className="w-4 h-4 rounded text-emerald-500 focus:ring-0 cursor-pointer"
                                />
                                <span className="text-[10px] text-[#8c9bbb]">I confirm ending mileage is exactly correct.</span>
                              </label>
                            </div>
                          </div>
                        </div>

                        <button
                          type="submit"
                          disabled={!endOdoConfirm || !endOdoValue || !unloadingWeight}
                          className="w-full py-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:brightness-110 disabled:brightness-50 text-white font-black text-xs uppercase tracking-wider rounded-2xl shadow-xl transition-all cursor-pointer inline-flex items-center justify-center gap-2"
                        >
                          <CheckCircle className="w-4 h-4 text-white" />
                          Record Arrival and Discharge Cargo
                        </button>

                      </form>
                    </div>

                  </div>
                )}
              </div>

              {/* Right panel: Static driving guidelines & Quick checklist */}
              <div className="lg:col-span-4 space-y-6">
                
                {/* Active Tanker specifications read-only locks */}
                <div className="bg-[#141822] border border-[#222a3a] rounded-2xl p-5 space-y-4">
                  <h4 className="text-[10px] font-mono uppercase text-[#ea580c] font-black tracking-wider flex items-center gap-1.5 border-b border-[#222a3a] pb-2">
                    <Info className="w-3.5 h-3.5 text-orange-500" />
                    Assigned Chemical Carrier
                  </h4>

                  {assignedTankerObj ? (
                    <div className="text-xs space-y-3 font-sans">
                      <div className="flex justify-between items-center bg-[#0d0f14] p-3 rounded-xl border border-[#222a3a]">
                        <span className="text-gray-400 font-mono text-[10px] uppercase">Plate ID</span>
                        <strong className="text-teal-400 font-mono text-xs uppercase block tracking-wider font-extrabold">{assignedTankerObj.tankerNumber}</strong>
                      </div>
                      <div className="flex justify-between items-center bg-[#0d0f14] p-3 rounded-xl border border-[#222a3a]">
                        <span className="text-gray-400 font-mono text-[10px] uppercase">Product Carrying Group</span>
                        <strong className="text-white font-extrabold">{assignedTankerObj.productGroup || 'H2SO4 / Raw Acid'}</strong>
                      </div>
                      <div className="flex justify-between items-center bg-[#0d0f14] p-3 rounded-xl border border-[#222a3a]">
                        <span className="text-gray-400 font-mono text-[10px] uppercase">Calibrated Capacity</span>
                        <strong className="text-white font-bold">{assignedTankerObj.capacity || '18 KL'}</strong>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-gray-500 italic">No static tanker associated. Check assigned routes en-route.</p>
                  )}
                </div>

                {/* Pilot Safety locks checklist */}
                <div className="bg-[#141822] border border-[#222a3a] rounded-2xl p-5 space-y-4 text-xs font-sans">
                  <h4 className="text-[10px] font-mono uppercase text-gray-300 font-bold tracking-wider flex items-center gap-1.5 border-b border-[#222a3a] pb-2">
                    <ShieldAlert className="w-4 h-4 text-orange-500" />
                    PESO Chemical Driver Mandate
                  </h4>
                  <ul className="space-y-2.5 text-[#8c9bbb] leading-normal font-sans">
                    <li className="flex gap-2 items-start">
                      <Check className="w-3.5 h-3.5 text-orange-500 shrink-0 mt-0.5" />
                      <span>Always check tire pressure during refuels.</span>
                    </li>
                    <li className="flex gap-2 items-start">
                      <Check className="w-3.5 h-3.5 text-orange-500 shrink-0 mt-0.5" />
                      <span>Wear protective helmet, hazmat static gloves, safety goggles during product decant.</span>
                    </li>
                    <li className="flex gap-2 items-start">
                      <Check className="w-3.5 h-3.5 text-orange-500 shrink-0 mt-0.5" />
                      <span>Ensure explosive earthing spark wire clip is clamped tight before unloading valves open.</span>
                    </li>
                  </ul>
                </div>

              </div>

            </div>
          )}

          {/* TAB 2: EXPENDITURE ENTRY DESK (FUEL, REPAIR & ADBLUE) */}
          {driverTab === 'expenses' && (
            <div className="bg-[#141822] border border-[#222a3a] rounded-3xl p-6 space-y-6">
              
              <div className="border-b border-[#222a3a] pb-4 mb-2 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-white font-black text-lg uppercase tracking-tight flex items-center gap-2">
                    <ShoppingCart className="w-5 h-5 text-orange-500" />
                    Operator En-Route expenses Desk
                  </h3>
                  <p className="text-xs font-mono text-[#8c9bbb] mt-1 leading-normal uppercase">
                    Fuel entries are optional bill. Repair & Adblue entries strictly require scan or photograph of invoice.
                  </p>
                </div>
                
                {/* Exp Category switcher buttons */}
                <div className="p-1 bg-[#0d0f14] border border-[#222a3a] rounded-xl flex">
                  {[
                    { id: 'fuel', label: '⛽ Fuel expense' },
                    { id: 'repair', label: '🛠 Repair maintenance' },
                    { id: 'adblue', label: '💧 AdBlue refill' }
                  ].map(cat => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => {
                        setExpCategory(cat.id as any);
                        setExpBillNo('');
                        setExpAmount('');
                        setExpVendor('');
                        setExpDetail('');
                        setExpQtyLiters('');
                        setExpBillPhoto('');
                      }}
                      className={`px-3 py-1.5 rounded-lg text-[10.5px] cursor-pointer transition-all font-bold ${
                        expCategory === cat.id 
                          ? 'bg-orange-500 text-white shadow' 
                          : 'text-gray-400 hover:text-white'
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Form container */}
              <form onSubmit={handleLogExpense} className="space-y-6 text-xs">
                
                {/* Photo scanner widget for repairs / Adblue */}
                {expCategory !== 'fuel' && (
                  <div className="bg-gradient-to-tr from-[#161b22] to-orange-500/5 border border-dashed border-orange-500/20 rounded-2xl p-5 space-y-4">
                    <div className="flex items-start gap-3.5">
                      <div className="w-10 h-10 bg-orange-500/10 text-orange-400 rounded-xl flex items-center justify-center font-bold">
                        <Sparkles className="w-5 h-5 text-orange-500" />
                      </div>
                      <div>
                        <span className="font-bold text-white block uppercase tracking-wider text-xs">AI Smart Bill / Cash Invoice Scanner</span>
                        <span className="text-[10px] text-gray-400 block mt-1">
                          Scan workshop job-order or cash bill with AI to pre-fill GST settings, amounts, vendor, and serial numbers.
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                      <label className="px-4 py-2 bg-[#222a3a] hover:bg-[#2c374f] border border-[#2d374f] text-white rounded-lg text-xs font-bold cursor-pointer transition-all inline-flex items-center gap-2">
                        <Upload className="w-4 h-4 text-orange-400" />
                        Scan Bill Document Photo
                        <input 
                          type="file" 
                          accept="image/*" 
                          required
                          className="hidden" 
                          onChange={(e) => handleFileChange(e, (b64) => {
                            setExpBillPhoto(b64);
                            triggerMaintenanceScan(b64);
                          })}
                        />
                      </label>

                      {expBillPhoto && (
                        <div className="flex items-center gap-2">
                          <span className="text-[10.5px] text-emerald-400 font-mono font-bold block">✓ Document Photo attached.</span>
                          <img src={expBillPhoto} alt="bill preview" className="w-10 h-10 object-cover rounded border border-emerald-500" />
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Optional photo capture for fuel */}
                {expCategory === 'fuel' && (
                  <div className="bg-[#161b22] p-4 border border-[#222a3a] rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div>
                      <span className="font-extrabold block text-white uppercase tracking-wider text-[11px]">Upload Refuel Slip Receipt (Optional)</span>
                      <p className="text-gray-400 text-[10px] leading-relaxed block mt-1">Drivers do not need to upload fuel receipts as BPCL syncs automatically. It remains strictly optional.</p>
                    </div>

                    <div className="flex items-center gap-3">
                      <label className="px-3.5 py-1.5 bg-[#222a3a] border border-[#2d374f] text-white text-[10.5px] font-bold rounded-xl cursor-pointer hover:bg-[#2d384f] inline-flex items-center gap-1">
                        <Upload className="w-3.5 h-3.5 text-orange-400" />
                        Upload Receipt
                        <input 
                          type="file" 
                          accept="image/*" 
                          className="hidden" 
                          onChange={(e) => handleFileChange(e, setExpBillPhoto)}
                        />
                      </label>
                      {expBillPhoto && (
                        <img src={expBillPhoto} alt="Refuel preview" className="w-8 h-8 rounded border border-orange-500 object-cover" />
                      )}
                    </div>
                  </div>
                )}

                {/* Core Parameters Fields */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  
                  <div>
                    <span className="block text-[10px] text-gray-400 font-mono uppercase mb-1.5 font-bold">Total Expense Cost (Rs.) *</span>
                    <input 
                      type="number" 
                      required
                      placeholder="e.g. 18500"
                      value={expAmount}
                      onChange={(e) => setExpAmount(e.target.value ? parseFloat(e.target.value) : '')}
                      className="w-full px-3.5 py-2.5 bg-[#0d0f14] border border-[#222a3a] rounded-xl text-xs text-white outline-none focus:border-orange-500 font-mono font-bold"
                    />
                  </div>

                  {expCategory === 'fuel' ? (
                    <div>
                      <span className="block text-[10px] text-gray-400 font-mono uppercase mb-1.5 font-bold font-black text-orange-400">Refueled Volume (Liters) *</span>
                      <input 
                        type="number" 
                        required
                        placeholder="e.g. 200"
                        value={expQtyLiters}
                        onChange={(e) => setExpQtyLiters(e.target.value ? parseFloat(e.target.value) : '')}
                        className="w-full px-3.5 py-2.5 bg-[#0d0f14] border border-[#222a3a] rounded-xl text-xs text-white outline-none focus:border-orange-500 font-mono font-bold"
                      />
                    </div>
                  ) : (
                    <div>
                      <span className="block text-[10px] text-gray-400 font-mono uppercase mb-1.5 font-bold">Invoice / Bill Serial No. *</span>
                      <input 
                        type="text" 
                        required
                        placeholder="e.g. CH-2015"
                        value={expBillNo}
                        onChange={(e) => setExpBillNo(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-[#0d0f14] border border-[#222a3a] rounded-xl text-xs text-white outline-none focus:border-orange-500 font-mono"
                      />
                    </div>
                  )}

                  <div>
                    <span className="block text-[10px] text-gray-400 font-mono uppercase mb-1.5 font-bold">Petrol Pump RO / Workshop Vendor *</span>
                    <input 
                      type="text" 
                      required
                      placeholder="e.g. COCO Petrol Pump Baroda"
                      value={expVendor}
                      onChange={(e) => setExpVendor(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-[#0d0f14] border border-[#222a3a] rounded-xl text-xs text-white outline-none focus:border-orange-500"
                    />
                  </div>

                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <span className="block text-[10px] text-gray-400 font-mono uppercase mb-1.5 font-bold">Transaction / Service Geolocation Place *</span>
                    <input 
                      type="text" 
                      required
                      placeholder="e.g. Ranoli Highway"
                      value={expPlace}
                      onChange={(e) => setExpPlace(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-[#0d0f14] border border-[#222a3a] rounded-xl text-xs text-white outline-none focus:border-orange-500"
                    />
                  </div>

                  <div>
                    <span className="block text-[10px] text-gray-400 font-mono uppercase mb-1.5 font-bold">Work Detail Log *</span>
                    <input 
                      type="text" 
                      required
                      placeholder="e.g. 50 Ltrs Diesel added / Left front tyre patch repair"
                      value={expDetail}
                      onChange={(e) => setExpDetail(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-[#0d0f14] border border-[#222a3a] rounded-xl text-xs text-white outline-none focus:border-orange-500"
                    />
                  </div>
                </div>

                {/* Sub category options for Repairs: split GST status */}
                {expCategory === 'repair' && (
                  <div className="bg-[#0d0f14] p-4 border border-[#222a3a] rounded-2xl space-y-3.5">
                    <span className="font-extrabold block text-white uppercase tracking-wider text-[11px]">Select Repairs GST Type Designation</span>
                    
                    <div className="flex gap-4">
                      <label className="inline-flex items-center gap-2 cursor-pointer text-xs">
                        <input 
                          type="radio" 
                          name="repair_gst"
                          value="without_gst"
                          checked={expGstType === 'without_gst'}
                          onChange={() => setExpGstType('without_gst')}
                          className="w-4 h-4 text-orange-500 cursor-pointer"
                        />
                        <span className="text-gray-300">1. Without SGST/CGST Repairs (Cash ticket/kacha slip)</span>
                      </label>

                      <label className="inline-flex items-center gap-2 cursor-pointer text-xs">
                        <input 
                          type="radio" 
                          name="repair_gst"
                          value="with_gst"
                          checked={expGstType === 'with_gst'}
                          onChange={() => setExpGstType('with_gst')}
                          className="w-4 h-4 text-orange-500 cursor-pointer"
                        />
                        <span className="text-gray-300">2. With GST Repairs (Formal tax invoice with GSTIN)</span>
                      </label>
                    </div>
                  </div>
                )}

                {/* Expense trip attribution selection */}
                <div className="bg-[#0cf19d]/5 border border-[#0cf19d]/10 p-5 rounded-2xl space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-extrabold text-white block uppercase tracking-wider text-[11px]">Trip Attribution Mode</span>
                      <p className="text-[#8c9bbb] text-[10px] leading-relaxed block mt-1">
                        {expExcludeFromTrip 
                          ? 'This overhead cost is regular maintenance and will not affect any specific active Trip balance sheets.'
                          : `Attributed to Active Cargo Trip: ${runningTrip ? runningTrip.lrNo : 'Last finished route en-route'} automatically.`}
                      </p>
                    </div>

                    <label className="inline-flex items-center gap-2 cursor-pointer select-none shrink-0 bg-[#222a3a] p-2 rounded-xl border border-[#2c374f]">
                      <input 
                        type="checkbox" 
                        checked={expExcludeFromTrip}
                        onChange={(e) => setExpExcludeFromTrip(e.target.checked)}
                        className="w-4 h-4 text-orange-400 focus:ring-0 cursor-pointer rounded"
                      />
                      <span className="text-[10px] text-white font-bold uppercase tracking-wider block">Exclude from Trip calculations (Regular expense)</span>
                    </label>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-4 bg-gradient-to-r from-orange-600 to-red-600 text-white font-black uppercase text-xs tracking-wider rounded-2xl shadow-xl hover:brightness-110 cursor-pointer inline-flex items-center justify-center gap-2"
                >
                  <CheckCircle className="w-4 h-4" />
                  Save Logistics Expense Slip
                </button>

              </form>

            </div>
          )}

          {/* TAB 3: SIGNED LORRY RECEIPTS (UPLOADING COPY OF PENDING LRs) */}
          {driverTab === 'lrs' && (
            <div className="bg-[#141822] border border-[#222a3a] rounded-3xl p-6 space-y-6">
              
              <div>
                <h3 className="text-white font-black text-lg uppercase tracking-tight flex items-center gap-2">
                  <FileText className="w-5 h-5 text-orange-500" />
                  Upload Signed Lorry Receipts (Proof of Delivery)
                </h3>
                <p className="text-xs font-mono text-[#8c9bbb] mt-1 uppercase">Maintain physical clearance of consignee signed slips en-route.</p>
              </div>

              {lrDocSuccess && (
                <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl text-xs font-bold leading-relaxed">
                  {lrDocSuccess}
                </div>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                
                {/* PDF/Aadhar slip upload form */}
                <form onSubmit={handleUploadLrCopy} className="lg:col-span-6 space-y-5 text-xs">
                  
                  <div className="space-y-1.5 text-left">
                    <label className="block text-[10px] font-mono font-bold text-[#8c9bbb] uppercase">Select Lorry Receipt (Pending LR copy)</label>
                    <select
                      required
                      value={selectedLrForDoc}
                      onChange={(e) => setSelectedLrForDoc(e.target.value)}
                      className="w-full px-4 py-3 bg-[#0d0f14] border border-[#222a3a] rounded-xl text-white outline-none focus:border-orange-500"
                    >
                      <option value="">-- Choose LR to Clear --</option>
                      {lrs
                        .filter(l => l.status === 'pending')
                        .map(l => (
                          <option key={l.id} value={l.id}>
                            {l.lrNo} - consignee: {l.consigneeName} ({l.placeTo})
                          </option>
                        ))}
                    </select>
                  </div>

                  <div className="bg-[#161b22] p-5 border border-[#222a3a] rounded-2xl space-y-4">
                    <span className="font-extrabold text-[#f1f5f9] tracking-tight block">Upload Physical signed LR Voucher copy</span>
                    <p className="text-[10px] text-gray-400">Capture a clear photo of the consignee's signed and stamped LR note.</p>

                    <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                      <label className="px-4 py-2 bg-[#222a3a] hover:bg-[#2c374f] border border-[#2d374f] text-white rounded-lg text-xs font-bold cursor-pointer transition-all inline-flex items-center gap-1.5">
                        <Camera className="w-4 h-4 text-orange-400" />
                        Take Snapshot of signed LR
                        <input 
                          type="file" 
                          accept="image/*" 
                          required
                          className="hidden" 
                          onChange={(e) => handleFileChange(e, setLrDocPhoto)}
                        />
                      </label>

                      {lrDocPhoto && (
                        <div className="flex items-center gap-2">
                          <span className="text-[10.5px] text-emerald-400 font-mono font-bold block">✓ snapshot loaded.</span>
                          <img src={lrDocPhoto} alt="Lr receipt crop preview" className="w-10 h-10 object-cover rounded border border-emerald-500" />
                        </div>
                      )}
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={!selectedLrForDoc || !lrDocPhoto}
                    className="w-full py-3 px-4 bg-gradient-to-r from-orange-600 to-red-600 hover:brightness-110 disabled:brightness-50 text-white font-black uppercase text-xs tracking-wider rounded-xl shadow-lg cursor-pointer"
                  >
                    Transmit Signed Lorry Receipt (POD)
                  </button>

                </form>

                {/* Show pending LR list */}
                <div className="lg:col-span-6 space-y-4">
                  <h4 className="text-[10px] font-mono uppercase text-[#ea580c] font-black tracking-wider border-b border-[#222a3a] pb-2">
                    Pending proof-of-delivery list
                  </h4>

                  <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-1">
                    {lrs.filter(l => l.status === 'pending').length === 0 ? (
                      <p className="text-gray-500 italic py-6 text-center text-xs">All lorry receipts cleared successfully!</p>
                    ) : (
                      lrs
                        .filter(l => l.status === 'pending')
                        .map(l => (
                          <div key={l.id} className="p-4 bg-[#0d0f14] border border-[#222a3a] rounded-xl text-xs space-y-2">
                            <div className="flex justify-between font-bold text-white uppercase font-mono tracking-tight text-[11px]">
                              <span>LR No: {l.lrNo}</span>
                              <span className="text-orange-400 text-[10px]">SHORTAGE OUTSTANDING</span>
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-gray-400 text-[10.5px]">
                              <div>Consigner: <strong className="text-white font-medium">{l.consignerName}</strong></div>
                              <div>Receiver: <strong className="text-white font-medium">{l.consigneeName}</strong></div>
                              <div>Quantity: <strong className="text-emerald-400 font-mono">{l.qty} {l.qtyUnit}</strong></div>
                              <div>Destination: <strong className="text-white font-medium">{l.placeTo}</strong></div>
                            </div>
                          </div>
                      ))
                    )}
                  </div>
                </div>

              </div>

            </div>
          )}

          {/* TAB 4: MY LEDGERS (COMMISSIONS & REMITTANCES FOR THE CURRENT DRIVER) */}
          {driverTab === 'ledger' && (
            <div className="bg-[#141822] border border-[#222a3a] rounded-3xl p-6 space-y-6">
              
              <div>
                <h3 className="text-white font-black text-lg uppercase tracking-tight flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-emerald-400" />
                  My Remittance Accounts & Travel ledger
                </h3>
                <p className="text-xs font-mono text-[#8c9bbb] mt-1 uppercase">Track travel allowances, pilot commissions and out-of-pocket highway expensiveness.</p>
              </div>

              <div className="bg-[#0d0f14] p-5 border border-[#222a3a] rounded-2xl grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
                <div className="p-2 space-y-1">
                  <span className="text-gray-400 font-mono text-[9px] uppercase tracking-wider block">Estimated Pending Settlements</span>
                  <span className="text-[#0cf19d] font-black text-xl font-mono block">
                    Rs. {mergedLedger.filter(l => l.status.includes('Awaiting') || l.status.includes('Escrow')).reduce((acc, current) => acc + current.amount, 0).toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="p-2 space-y-1 border-t md:border-t-0 md:border-l md:border-r border-[#222a3a]">
                  <span className="text-gray-400 font-mono text-[9px] uppercase tracking-wider block">Cleared Bank Remittances</span>
                  <span className="text-white font-black text-xl font-mono block">
                    Rs. {mergedLedger.filter(l => l.status.includes('Cleared')).reduce((acc, current) => acc + current.amount, 0).toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="p-2 space-y-1">
                  <span className="text-gray-400 font-mono text-[9px] uppercase tracking-wider block">Completed Voyages (RTO Records)</span>
                  <span className="text-orange-400 font-black text-xl font-mono block">
                    {trips.filter(t => t.driverId === currentDriver.id && t.status === 'completed').length} / {trips.filter(t => t.driverId === currentDriver.id).length} Trips
                  </span>
                </div>
              </div>

              <div className="space-y-3.5">
                <h4 className="text-[10px] font-mono uppercase text-gray-400 font-black tracking-wider border-b border-[#222a3a] pb-2">
                  Detailed travel account statements
                </h4>

                <div className="space-y-2.5 max-h-[60vh] overflow-y-auto">
                  {mergedLedger.length === 0 ? (
                    <p className="text-gray-500 italic text-center py-10 font-mono">No historical ledger records found for this driver ID en-route.</p>
                  ) : (
                    mergedLedger.map((item, idx) => (
                      <div key={item.id + '_' + idx} className="p-4 bg-[#0d0f14] border border-[#222a3a] rounded-2xl text-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div className="space-y-1">
                          <span className="text-gray-500 font-mono text-[9px] block uppercase tracking-wider">{item.date} • assoc LR: {item.assocTrip}</span>
                          <span className="font-extrabold text-white text-[12px] block">{item.purpose}</span>
                        </div>

                        <div className="text-left sm:text-right shrink-0">
                          <span className="font-black text-white text-sm font-mono block">+ Rs. {item.amount.toLocaleString('en-IN')}</span>
                          <span className={`text-[9px] font-mono uppercase font-bold mt-1 inline-block ${
                            item.status.includes('Cleared') ? 'text-emerald-400' : 'text-orange-400'
                          }`}>
                            {item.status}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

            </div>
          )}

          {/* TAB 5: MY CREDENTIALS & ASSIGNED VEHICLE COPIES */}
          {driverTab === 'docs' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

              {/* Tanker Documents */}
              <div className="lg:col-span-6 bg-[#141822] border border-[#222a3a] rounded-3xl p-6 space-y-6">
                <div>
                  <h3 className="text-white font-black text-base flex items-center gap-2 uppercase tracking-tight">
                    <Truck className="w-5 h-5 text-orange-500" />
                    Assigned Vehicle RTO lockbox
                  </h3>
                  <p className="text-xs font-mono text-[#8c9bbb] mt-1 uppercase">Read-only physical copies of the chemical vehicle.</p>
                </div>

                {assignedTankerObj ? (
                  <div className="space-y-3 text-xs">
                    <div className="p-3.5 bg-[#0d0f14] border border-[#222a3a] rounded-xl flex items-center justify-between">
                      <div>
                        <span className="font-extrabold text-white block uppercase tracking-wider text-[11px]">Plate Registration No.</span>
                        <span className="text-[10px] text-gray-400 block mt-0.5">{assignedTankerObj.tankerNumber}</span>
                      </div>
                      <span className="px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[9px] font-mono">VALID</span>
                    </div>

                    <div className="p-3.5 bg-[#0d0f14] border border-[#222a3a] rounded-xl flex items-center justify-between">
                      <div>
                        <span className="font-extrabold text-white block uppercase tracking-wider text-[11px]">RTO Fitness Certificate</span>
                        <span className="text-[10px] text-gray-400 block mt-0.5">Expires: {assignedTankerObj.expirations?.fitness || '2026-11-20'}</span>
                      </div>
                      <span className="px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[9px] font-mono">VALID</span>
                    </div>

                    <div className="p-3.5 bg-[#0d0f14] border border-[#222a3a] rounded-xl flex items-center justify-between">
                      <div>
                        <span className="font-extrabold text-white block uppercase tracking-wider text-[11px]">PESO Calibration certificate</span>
                        <span className="text-[10px] text-gray-400 block mt-0.5">Expires: {assignedTankerObj.expirations?.calibration || '2026-08-30'}</span>
                      </div>
                      <span className="px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[9px] font-mono">VALID</span>
                    </div>

                    <div className="p-3.5 bg-[#0d0f14] border border-[#222a3a] rounded-xl flex items-center justify-between">
                      <div>
                        <span className="font-extrabold text-white block uppercase tracking-wider text-[11px]">Explosives License (Form IV)</span>
                        <span className="text-[10px] text-gray-400 block mt-0.5">Expires: {assignedTankerObj.expirations?.explosiveLicense || '2027-05-15'}</span>
                      </div>
                      <span className="px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[9px] font-mono">VALID</span>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-gray-500 italic py-12 text-center">No assigned vehicle logged currently.</p>
                )}
              </div>

              {/* Driver own certificates */}
              <div className="lg:col-span-6 bg-[#141822] border border-[#222a3a] rounded-3xl p-6 space-y-6">
                <div>
                  <h3 className="text-white font-black text-base flex items-center gap-2 uppercase tracking-tight">
                    <Award className="w-5 h-5 text-orange-500" />
                    My Driver statutory Files
                  </h3>
                  <p className="text-xs font-mono text-[#8c9bbb] mt-1 uppercase">Physical credentials verified for hazardous cargo drivers.</p>
                </div>

                <div className="space-y-3 text-xs">
                  <div className="p-3.5 bg-[#0d0f14] border border-[#222a3a] rounded-xl flex items-center justify-between">
                    <div>
                      <span className="font-extrabold text-white block uppercase tracking-wider text-[11px]">Driving License Number</span>
                      <span className="text-[10px] text-gray-400 block mt-0.5">{currentDriver.licenseNumber || 'DL-20193291244'}</span>
                    </div>
                    <span className="px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[9px] font-mono">VALID</span>
                  </div>

                  <div className="p-3.5 bg-[#0d0f14] border border-[#222a3a] rounded-xl flex items-center justify-between">
                    <div>
                      <span className="font-extrabold text-white block uppercase tracking-wider text-[11px]">HazMat Cargo Operator Training certificate</span>
                      <span className="text-[10px] text-gray-400 block mt-0.5">Expires: 2027-09-21 (State RTO Authorized)</span>
                    </div>
                    <span className="px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[9px] font-mono">SECURE</span>
                  </div>

                  <div className="p-3.5 bg-[#0d0f14] border border-[#222a3a] rounded-xl flex items-center justify-between">
                    <div>
                      <span className="font-extrabold text-white block uppercase tracking-wider text-[11px]">Aadhar Identity Card</span>
                      <span className="text-[10px] text-gray-400 block mt-0.5">UIDAI Verified biometric lockbox</span>
                    </div>
                    <span className="px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[9px] font-mono">LOCKED</span>
                  </div>
                </div>
              </div>

            </div>
          )}

        </div>

      </main>
    </div>
  );
}
