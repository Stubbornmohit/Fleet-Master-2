import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Truck, LayoutDashboard, FileText, ClipboardList, ShieldAlert, 
  CreditCard, BarChart2, Users, Wrench, LogOut, RefreshCw, Droplet,
  Sun, Moon, BookOpen, Plus, Menu, X, Trash2, Fuel, Sparkles, Bell, Layers
} from 'lucide-react';

import { FleetMasterStore } from './utils/storage';
import { Tanker, Driver, LorryReceipt, Trip, MaintenanceBill, TankerExpense } from './types';

// Modular Component Imports
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import LRManager from './components/LRManager';
import Trips from './components/Trips';
import Tankers from './components/Tankers';
import Drivers from './components/Drivers';
import Ledger from './components/Ledger';
import Reports from './components/Reports';
import AdBlueManager from './components/AdBlueManager';
import MasterAccounting from './components/MasterAccounting';
import FuelManager from './components/FuelManager';
import TrashManager from './components/TrashManager';
import AICabin from './components/AICabin';
import ShortageManager from './components/ShortageManager';
import DriverPortal from './components/DriverPortal';
import MaintenanceManager from './components/MaintenanceManager';
import DocumentPreviewer from './components/DocumentPreviewer';
import NotificationsPortal from './components/NotificationsPortal';
import WorkspaceManager from './components/WorkspaceManager';

export default function App() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<string>('Dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isJumpOpen, setIsJumpOpen] = useState(false);
  const [theme, setTheme] = useState<'dark' | 'light'>('light');

  const mainRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (mainRef.current) {
      mainRef.current.scrollTo({ top: 0, behavior: 'instant' });
    }
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [activeTab]);

  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    core: true,
    fleet: true,
    logistics: true,
    finance: true,
    system: false,
  });

  const toggleGroup = (group: string) => {
    setExpandedGroups(prev => ({ ...prev, [group]: !prev[group] }));
  };

  useEffect(() => {
    document.documentElement.classList.add('light-theme');
  }, []);

  const toggleTheme = () => {
    setTheme('light');
  };

  // Central Application States
  const [tankers, setTankers] = useState<Tanker[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [lrs, setLrs] = useState<LorryReceipt[]>([]);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [bills, setBills] = useState<MaintenanceBill[]>([]);
  const [expenses, setExpenses] = useState<TankerExpense[]>([]);

  // CENTRAL SYSTEM ROUTE MODAL ACTIONS
  const [autoOpenStartTripModal, setAutoOpenStartTripModal] = useState(false);
  const [autoOpenAddDriverModal, setAutoOpenAddDriverModal] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{
    type: 'tanker' | 'driver' | 'lr' | 'trip' | 'bill' | 'expense';
    id: string;
    name: string;
    data: any;
  } | null>(null);

  // Main Quick Expense State Triggers
  const [showMainExpenseModal, setShowMainExpenseModal] = useState(false);
  const [expenseTankerId, setExpenseTankerId] = useState('');
  const [expenseCategory, setExpenseCategory] = useState<'fuel' | 'driver' | 'toll' | 'repair' | 'maintenance' | 'adblue' | 'other'>('fuel');
  const [expenseAmount, setExpenseAmount] = useState('');
  const [expenseDate, setExpenseDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [expenseDetail, setExpenseDetail] = useState('');
  const [expenseVendorName, setExpenseVendorName] = useState('');
  const [expenseBillNo, setExpenseBillNo] = useState('');
  const [expensePlace, setExpensePlace] = useState('Ranoli');
  const [expenseWorkType, setExpenseWorkType] = useState('Service');
  const [excludeFromTrip, setExcludeFromTrip] = useState(false);

  const submitMainExpense = (e: React.FormEvent) => {
    e.preventDefault();
    if (!expenseTankerId || !expenseAmount || parseFloat(expenseAmount) <= 0) {
      alert("Please select a Tanker and enter a valid positive Amount.");
      return;
    }
    const selectedTanker = tankers.find(t => t.id === expenseTankerId);
    if (!selectedTanker) return;

    const newExpense: TankerExpense = {
      id: 'EXP-' + Date.now(),
      tankerId: selectedTanker.id,
      tankerNumber: selectedTanker.tankerNumber,
      date: expenseDate,
      category: expenseCategory,
      amount: parseFloat(expenseAmount),
      detail: expenseDetail,
      vendorName: expenseVendorName || undefined,
      billNo: expenseBillNo || undefined,
      place: expensePlace || undefined,
      workType: expenseWorkType || undefined,
      paymentStatus: 'collected',
      excludeFromTrip: excludeFromTrip
    };

    handleAddGeneralExpense(newExpense);
    alert(`Operational Expense (${expenseCategory.toUpperCase()}) of Rs. ${expenseAmount} logged successfully and attributed to Tanker ${selectedTanker.tankerNumber}!`);
    
    // Close & reset
    setShowMainExpenseModal(false);
    setExpenseTankerId('');
    setExpenseCategory('fuel');
    setExpenseAmount('');
    setExpenseDate(new Date().toISOString().split('T')[0]);
    setExpenseDetail('');
    setExpenseVendorName('');
    setExpenseBillNo('');
    setExcludeFromTrip(false);
  };

  // Try auto-login on initial mount only
  useEffect(() => {
    const sessionToken = localStorage.getItem('fleetmaster_session');
    if (sessionToken) {
      try {
        setCurrentUser(JSON.parse(sessionToken));
      } catch (e) {
        // ignore
      }
    }
  }, []);

  // Hydrate states reactive to login sessions
  useEffect(() => {
    FleetMasterStore.initializeAll();
    
    // Read user-specific collections
    setTankers(FleetMasterStore.get('tankers', []));
    setDrivers(FleetMasterStore.get('drivers', []));
    setLrs(FleetMasterStore.get('lrs', []));
    setTrips(FleetMasterStore.get('trips', []));
    setBills(FleetMasterStore.get('bills', []));
    setExpenses(FleetMasterStore.get('expenses', []));
    setTrashedItems(FleetMasterStore.get('trash', []));
  }, [currentUser]);

  // Synchronize remote WhatsApp Webhook expenses periodically
  useEffect(() => {
    if (!currentUser) return;

    const intervalId = setInterval(() => {
      fetch('/api/expenses/whatsapp-pending')
        .then(res => res.json())
        .then(data => {
          if (data && data.success && Array.isArray(data.expenses) && data.expenses.length > 0) {
            data.expenses.forEach((waExp: any) => {
              // Check if already exist
              const matchesExist = expenses.some(e => e.id === waExp.id);
              if (!matchesExist) {
                // Determine active matching running trip for the tanker plate number if possible
                const runningTrip = trips.find(t => t.status === 'running');
                
                const finalizedExpense = {
                  ...waExp,
                  id: waExp.id,
                  tankerId: runningTrip ? runningTrip.tankerId : 'TNK-GEN',
                  tripId: runningTrip ? runningTrip.id : undefined
                };

                // Add to general expenses list
                handleAddGeneralExpense(finalizedExpense);

                // Notify user via global events feed
                FleetMasterStore.addEvent('WhatsApp Sync', `Direct expense of ₹${waExp.amount.toLocaleString()} synced for Tanker`, 'accounting');
                
                // Approve/clear on the server-side to prevent duplicate ingests
                fetch('/api/expenses/whatsapp-approve', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ id: waExp.id })
                }).catch(err => console.warn("Cleared WhatsApp approve warning:", err));
              }
            });
          }
        })
        .catch(err => {
          // Soft warned log for offline/restarting server states to bypass Q.A console pollution
          console.warn("WhatsApp Webhook expenses polling skipped (dev server restarting or offline):", err.message || err);
        });
    }, 10000);

    return () => clearInterval(intervalId);
  }, [currentUser, expenses, trips]);

  const handleLoginSuccess = (user: any) => {
    setCurrentUser(user);
    localStorage.setItem('fleetmaster_session', JSON.stringify(user));
  };

  const handleSignOut = () => {
    setCurrentUser(null);
    localStorage.removeItem('fleetmaster_session');
  };

  const handleUpdateUser = (updatedUser: any) => {
    setCurrentUser(updatedUser);
    localStorage.setItem('fleetmaster_session', JSON.stringify(updatedUser));
    
    // Save to the global user database list in storage
    const users = FleetMasterStore.get('users', []);
    const idx = users.findIndex((u: any) => u.username.toLowerCase() === updatedUser.username.toLowerCase());
    if (idx !== -1) {
      users[idx] = updatedUser;
    } else {
      users.push(updatedUser);
    }
    FleetMasterStore.set('users', users);
  };

  // State Writers with Persistence Sync
  const updateTankersState = (newList: Tanker[]) => {
    setTankers(newList);
    FleetMasterStore.set('tankers', newList);
  };

  const updateDriversState = (newList: Driver[]) => {
    setDrivers(newList);
    FleetMasterStore.set('drivers', newList);
  };

  const updateLrsState = (newList: LorryReceipt[]) => {
    setLrs(newList);
    FleetMasterStore.set('lrs', newList);
  };

  const updateTripsState = (newList: Trip[]) => {
    setTrips(newList);
    FleetMasterStore.set('trips', newList);
  };

  const updateBillsState = (newList: MaintenanceBill[]) => {
    setBills(newList);
    FleetMasterStore.set('bills', newList);
  };

  const updateExpensesState = (newList: TankerExpense[]) => {
    setExpenses(newList);
    FleetMasterStore.set('expenses', newList);
  };

  const handleVerifyBillGenuine = (billId: string) => {
    const updated = bills.map(b => b.id === billId ? { ...b, isVerifiedByAdmin: true } : b);
    updateBillsState(updated);
    FleetMasterStore.addEvent('Operation Approved', `Admin verified repair bill ${billId} as genuine. Added to central ledger.`, 'general');
    alert('Successfully verified this garage repair bill and logged as genuine!');
  };

  const handleVerifyExpenseGenuine = (expenseId: string) => {
    const updated = expenses.map(e => e.id === expenseId ? { ...e, isVerifiedByAdmin: true } : e);
    updateExpensesState(updated);
    FleetMasterStore.addEvent('Operation Approved', `Admin verified direct cash ticket ${expenseId} as genuine. Added to central ledger.`, 'general');
    alert('Successfully verified direct cash ticket repair expense and logged to central ledger!');
  };

  const handleRejectBill = (billId: string) => {
    const matched = bills.find(b => b.id === billId);
    handleMoveToTrash('bill', billId, matched?.billNo || billId, matched);
    alert('Bill has been moved to system trash bin queue.');
  };

  const handleRejectExpense = (expenseId: string) => {
    const matched = expenses.find(e => e.id === expenseId);
    handleMoveToTrash('expense', expenseId, matched?.detail || expenseId, matched);
    alert('Direct cash ticket expense has been moved to system trash bin queue.');
  };

  // Systems Trash State and State Writer
  const [trashedItems, setTrashedItems] = useState<any[]>([]);

  const updateTrashedItemsState = (newList: any[]) => {
    setTrashedItems(newList);
    FleetMasterStore.set('trash', newList);
  };

  const handleMoveToTrash = (type: 'tanker' | 'driver' | 'lr' | 'trip' | 'bill' | 'expense', id: string, name: string, data: any) => {
    setDeleteConfirm({ type, id, name, data });
  };

  const executeMoveToTrash = () => {
    if (!deleteConfirm) return;
    const { type, id, name, data } = deleteConfirm;

    const newTrashedItem = {
      id: `TSH-${Date.now()}`,
      originalId: id,
      type,
      deletedAt: new Date().toISOString(),
      itemName: name,
      itemData: data
    };

    const updatedTrash = [newTrashedItem, ...trashedItems];
    updateTrashedItemsState(updatedTrash);

    // Remove from active states
    if (type === 'tanker') {
      updateTankersState(tankers.filter(t => t.id !== id));
    } else if (type === 'driver') {
      updateDriversState(drivers.filter(d => d.id !== id));
    } else if (type === 'lr') {
      updateLrsState(lrs.filter(l => l.id !== id));
    } else if (type === 'trip') {
      updateTripsState(trips.filter(t => t.id !== id));
    } else if (type === 'bill') {
      updateBillsState(bills.filter(b => b.id !== id));
    } else if (type === 'expense') {
      updateExpensesState(expenses.filter(e => e.id !== id));
    }

    setDeleteConfirm(null);
  };

  const handleRestoreFromTrash = (trashId: string) => {
    const item = trashedItems.find(t => t.id === trashId);
    if (!item) return;

    const { type, originalId, itemData, itemName } = item;

    if (type === 'tanker') {
      if (tankers.some(t => t.id === originalId || t.tankerNumber === itemData.tankerNumber)) {
        alert(`A tanker with registration number ${itemData.tankerNumber} already exists.`);
        return;
      }
      updateTankersState([itemData, ...tankers]);
    } else if (type === 'driver') {
      if (drivers.some(d => d.id === originalId)) {
        alert(`A driver with ID ${originalId} already exists.`);
        return;
      }
      updateDriversState([itemData, ...drivers]);
    } else if (type === 'lr') {
      if (lrs.some(l => l.id === originalId || l.lrNo === itemData.lrNo)) {
        alert(`An LR with No ${itemData.lrNo} already exists.`);
        return;
      }
      updateLrsState([itemData, ...lrs]);
    } else if (type === 'trip') {
      if (trips.some(t => t.id === originalId)) {
        alert(`A trip with ID ${originalId} already exists.`);
        return;
      }
      updateTripsState([itemData, ...trips]);
    } else if (type === 'bill') {
      if (bills.some(b => b.id === originalId)) {
        alert(`A bill with reference No ${itemData.billNo || originalId} already exists.`);
        return;
      }
      updateBillsState([itemData, ...bills]);
    } else if (type === 'expense') {
      if (expenses.some(e => e.id === originalId)) {
        alert(`An expense entry already exists.`);
        return;
      }
      updateExpensesState([itemData, ...expenses]);
    }

    const updatedTrash = trashedItems.filter(t => t.id !== trashId);
    updateTrashedItemsState(updatedTrash);
    alert(`Successfully restored ${type.toUpperCase()} (${itemName})!`);
  };

  const handlePermanentDelete = (trashId: string) => {
    const confirmDelete = window.confirm("Are you absolutely sure you want to permanently delete this item? This action is irreversible.");
    if (!confirmDelete) return;

    const updatedTrash = trashedItems.filter(t => t.id !== trashId);
    updateTrashedItemsState(updatedTrash);
  };

  const handleEmptyTrash = () => {
    const confirmDelete = window.confirm("Are you absolutely sure you want to permanently empty the entire trash bin?");
    if (!confirmDelete) return;

    updateTrashedItemsState([]);
  };

  const handleBulkImport = (data: { tankers?: Tanker[], drivers?: Driver[], lrs?: LorryReceipt[], trips?: Trip[], expenses?: TankerExpense[] }) => {
    if (data.tankers && data.tankers.length > 0) {
      const existingIds = new Set(tankers.map(t => t.id));
      const newTankers = data.tankers.filter(t => !existingIds.has(t.id));
      if (newTankers.length > 0) {
        updateTankersState([...newTankers, ...tankers]);
      }
    }
    if (data.drivers && data.drivers.length > 0) {
      const existingIds = new Set(drivers.map(d => d.id));
      const newDrivers = data.drivers.filter(d => !existingIds.has(d.id));
      if (newDrivers.length > 0) {
        updateDriversState([...newDrivers, ...drivers]);
      }
    }
    if (data.lrs && data.lrs.length > 0) {
      const existingNos = new Set(lrs.map(l => l.lrNo));
      const newLrs = data.lrs.filter(l => !existingNos.has(l.lrNo));
      if (newLrs.length > 0) {
        updateLrsState([...newLrs, ...lrs]);
      }
    }
    if (data.trips && data.trips.length > 0) {
      const existingIds = new Set(trips.map(t => t.id));
      const newTrips = data.trips.filter(t => !existingIds.has(t.id));
      if (newTrips.length > 0) {
        updateTripsState([...newTrips, ...trips]);
      }
    }
    alert("AI Excel Import Completed Successfully! Check loaded registers.");
  };

  // Handlers for dynamic state updates
  const handleAddTanker = (newTnk: Tanker) => {
    const updated = [newTnk, ...tankers];
    updateTankersState(updated);
    FleetMasterStore.addEvent('Vehicle Registered', `Tanker ${newTnk.tankerNumber} integrated into active chemical carrier fleet`, 'general');
  };

  const handleAddDriver = (newDrv: Driver) => {
    const updated = [newDrv, ...drivers];
    updateDriversState(updated);
    FleetMasterStore.addEvent('Driver Boarded', `Operator ${newDrv.name} registered with license ${newDrv.licenseNumber}`, 'general');
  };

  const handleUpdateDriver = (updatedDrv: Driver) => {
    const updated = drivers.map(d => d.id === updatedDrv.id ? updatedDrv : d);
    updateDriversState(updated);
    FleetMasterStore.addEvent('Driver Updated', `Profile file of Pilot ${updatedDrv.name} updated with latest details`, 'general');
  };

  const handleAddLr = (newLr: LorryReceipt) => {
    const updated = [newLr, ...lrs];
    updateLrsState(updated);
    FleetMasterStore.addEvent('Lorry Receipt Open', `LR ${newLr.lrNo} generated for ${newLr.consignerName} to ${newLr.placeTo}`, 'invoice');
  };

  const handleReceiveLr = (lrId: string, dateTime: string) => {
    const updated = lrs.map(l => {
      if (l.id === lrId) {
        return { ...l, status: 'received' as const, receivedDateTime: dateTime };
      }
      return l;
    });
    updateLrsState(updated);
    const matchedLr = lrs.find(l => l.id === lrId);
    if (matchedLr) {
      FleetMasterStore.addEvent('Receipt Cleared', `Physical proof of delivery uploaded for LR ${matchedLr.lrNo}`, 'invoice');
    }
  };

  const handleStartTrip = (newTrip: Trip) => {
    // Start trip updates:
    // 1. Add new trip record
    const updatedTrips = [newTrip, ...trips];
    updateTripsState(updatedTrips);

    // 2. Set tanker status to 'running'
    const updatedTankers = tankers.map(t => {
      if (t.id === newTrip.tankerId) {
        return { ...t, status: 'running' as const };
      }
      return t;
    });
    updateTankersState(updatedTankers);

    // 3. Set driver status to 'active'
    const updatedDrivers = drivers.map(d => {
      if (d.id === newTrip.driverId) {
        return { ...d, status: 'active' as const };
      }
      return d;
    });
    updateDriversState(updatedDrivers);

    FleetMasterStore.addEvent('Trip Dispatched', `Tanker ${newTrip.tankerNumber} under ${newTrip.driverName} dispatched ${newTrip.qty} ${newTrip.qtyUnit} to ${newTrip.placeTo}`, 'trip');

    // Trigger real server dispatch alerts asynchronously via Twilio & email
    fetch('/api/notify/trip-started', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        trip: newTrip,
        userContactPhone: currentUser?.phone || "+919723781353"
      })
    }).then(res => res.json())
      .then(resJson => {
         console.log("Trip notifier response details: ", resJson);
      })
      .catch(err => {
         console.warn("Trip notification channel status (offline or secrets not configured):", err);
      });
  };

  const handleEndTrip = (
    tripId: string, 
    unloadingWeight: number, 
    endRate: number,
    emptyRunTo?: string,
    emptyRunDistanceKm?: number
  ) => {
    // End trip calculations:
    const updatedTrips = trips.map(t => {
      if (t.id === tripId) {
        const totalExpensesSum = t.fuelExpense + t.driverCharge + t.tollExpense + t.repairExpense + (t.maintenanceExpense || 0) + t.adblueExpense + t.otherExpense;
        const totalRevenue = t.loadingWeight * endRate;
        const totalProfitVal = totalRevenue - totalExpensesSum;

        // Calculate days taken for completion
        const startDay = new Date(t.startDate);
        const endDay = new Date();
        const diffTime = Math.abs(endDay.getTime() - startDay.getTime());
        const tripDurationDays = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));

        // Calculate loaded fuel liters (at ₹95 avg/liter)
        const loadedFuelLiters = Math.round(t.fuelExpense / 95);

        // Check if fuel alert triggers
        const isFuelAlertTriggered = loadedFuelLiters > t.expectedFuelLiters + 20;

        return {
          ...t,
          status: 'completed' as const,
          endDate: new Date().toISOString().split('T')[0],
          unloadingWeight,
          freightRateAtEnd: endRate,
          revenue: totalRevenue,
          profit: totalProfitVal,
          actualFuelAverage: 5.0, // standard empty average rule
          tripDurationDays,
          loadedFuelLiters,
          emptyRunFrom: t.placeTo,
          emptyRunTo: emptyRunTo || undefined,
          emptyRunDistanceKm: emptyRunDistanceKm || undefined,
          emptyRunFuelLiters: emptyRunDistanceKm ? Math.round(emptyRunDistanceKm / 5) : undefined,
          isFuelAlertTriggered
        };
      }
      return t;
    });
    updateTripsState(updatedTrips);

    // Release Tanker & Driver
    const targetTrip = trips.find(t => t.id === tripId);
    if (targetTrip) {
      const updatedTankers = tankers.map(t => {
        if (t.id === targetTrip.tankerId) {
          return { ...t, status: 'idle' as const };
        }
        return t;
      });
      updateTankersState(updatedTankers);

      const updatedDrivers = drivers.map(d => {
        if (d.id === targetTrip.driverId) {
          return { ...d, status: 'idle' as const };
        }
        return d;
      });
      updateDriversState(updatedDrivers);

      // Trigger automatic warning events if excess fuel is noted
      const actualFuelLitVal = Math.round(targetTrip.fuelExpense / 95);
      if (actualFuelLitVal > targetTrip.expectedFuelLiters + 20) {
        FleetMasterStore.addEvent(
          'Excess Fuel Warning', 
          `Anomalous fuel consumption on Veh. ${targetTrip.tankerNumber} under trip ${targetTrip.lrNo}: actual logged is ${actualFuelLitVal} Liters vs. estimated target ${Math.round(targetTrip.expectedFuelLiters)} Liters`, 
          'fuel'
        );
      }

      FleetMasterStore.addEvent('Trip Completed', `Tanker ${targetTrip.tankerNumber} arrived safely in ${targetTrip.placeTo}. Payload unloaded successfully`, 'trip');
    }
  };

  const handleRegisterMaintenanceBill = (bill: MaintenanceBill) => {
    const updated = [bill, ...bills];
    updateBillsState(updated);
    FleetMasterStore.addEvent('Maintenance Logged', `Registered calibration/repair bill for Tanker ${bill.tankerNumber} by ${bill.vendorName} of Rs. ${bill.amount}`, 'maintenance');
  };

  const handleMarkBillCollected = (billId: string) => {
    const updated = bills.map(b => {
      if (b.id === billId) {
        return { ...b, status: 'collected' as const };
      }
      return b;
    });
    updateBillsState(updated);
  };

  const handleAddGeneralExpense = (expenseUnit: TankerExpense) => {
    FleetMasterStore.addEvent('Expense Recorded', `Logged Rs. ${expenseUnit.amount} under ${expenseUnit.category.toUpperCase()} for Tanker ${expenseUnit.tankerNumber}`, expenseUnit.category === 'fuel' ? 'fuel' : 'maintenance');

    if (expenseUnit.excludeFromTrip) {
      // Stand-alone regular repairing, maintenance or overhead expense not added to any trip
      updateExpensesState([expenseUnit, ...expenses]);
    } else {
      // Check if there is an explicit trip ID assigned (e.g. from BPCL statement sync)
      const explicitTrip = expenseUnit.tripId ? trips.find(t => t.id === expenseUnit.tripId) : null;
      
      // Check if the tanker is running inside an active trip
      const activeRoute = explicitTrip || trips.find(t => t.tankerId === expenseUnit.tankerId && t.status === 'running');

      if (activeRoute) {
        // Adding directly to running or merged trip parameters
        const updatedTrips = trips.map(t => {
          if (t.id === activeRoute.id) {
            const cat = expenseUnit.category;
            const amt = expenseUnit.amount;

            const nFuel = cat === 'fuel' ? t.fuelExpense + amt : t.fuelExpense;
            const nDrv = cat === 'driver' ? t.driverCharge + amt : t.driverCharge;
            const nToll = cat === 'toll' ? t.tollExpense + amt : t.tollExpense;
            const nRep = cat === 'repair' ? t.repairExpense + amt : t.repairExpense;
            const nMnt = cat === 'maintenance' ? (t.maintenanceExpense || 0) + amt : (t.maintenanceExpense || 0);
            const nAdb = cat === 'adblue' ? t.adblueExpense + amt : t.adblueExpense;
            const nOth = cat === 'other' ? t.otherExpense + amt : t.otherExpense;
            const nAdbLit = cat === 'adblue' ? t.adblueAddedLiters + (expenseUnit.detail.match(/(\d+(\.\d+)?)\s*(L|Liters|Ltr)/i) ? parseFloat(expenseUnit.detail.match(/(\d+(\.\d+)?)\s*(L|Liters|Ltr)/i)?.[1] || '0') : amt / 90) : t.adblueAddedLiters;

            const totalExp = nFuel + nDrv + nToll + nRep + nMnt + nAdb + nOth;
            const rev = t.revenue || 0;

            return {
              ...t,
              fuelExpense: nFuel,
              driverCharge: nDrv,
              tollExpense: nToll,
              repairExpense: nRep,
              maintenanceExpense: nMnt,
              adblueExpense: nAdb,
              otherExpense: nOth,
              adblueAddedLiters: nAdbLit,
              profit: rev - totalExp
            };
          }
          return t;
        });
        updateTripsState(updatedTrips);
        
        // Save global expense unit linked to active trip
        const expWithTrip = { ...expenseUnit, tripId: activeRoute.id };
        updateExpensesState([expWithTrip, ...expenses]);
      } else {
        // Tanker is NOT running currently. Under petro-chemical logistics rules:
        // "every expense of tanker should be added to last completed trip till new trip doesn't start"
        const tankersCompletedTrips = trips
          .filter(t => t.tankerId === expenseUnit.tankerId && t.status === 'completed')
          .sort((a,b) => new Date(b.endDate || '').getTime() - new Date(a.endDate || '').getTime());

        const lastEndedTrip = tankersCompletedTrips[0];

        if (lastEndedTrip) {
          const updatedTrips = trips.map(t => {
            if (t.id === lastEndedTrip.id) {
              const cat = expenseUnit.category;
              const amt = expenseUnit.amount;

              // Adding cost to last completed trip
              const nFuel = cat === 'fuel' ? t.fuelExpense + amt : t.fuelExpense;
              const nDrv = cat === 'driver' ? t.driverCharge + amt : t.driverCharge;
              const nToll = cat === 'toll' ? t.tollExpense + amt : t.tollExpense;
              const nRep = cat === 'repair' ? t.repairExpense + amt : t.repairExpense;
              const nMnt = cat === 'maintenance' ? (t.maintenanceExpense || 0) + amt : (t.maintenanceExpense || 0);
              const nAdb = cat === 'adblue' ? t.adblueExpense + amt : t.adblueExpense;
              const nOth = cat === 'other' ? t.otherExpense + amt : t.otherExpense;
              const nAdbLit = cat === 'adblue' ? t.adblueAddedLiters + (expenseUnit.detail.match(/(\d+(\.\d+)?)\s*(L|Liters|Ltr)/i) ? parseFloat(expenseUnit.detail.match(/(\d+(\.\d+)?)\s*(L|Liters|Ltr)/i)?.[1] || '0') : amt / 90) : t.adblueAddedLiters;

              const totalExp = nFuel + nDrv + nToll + nRep + nMnt + nAdb + nOth;
              const rev = t.revenue || 0;

              return {
                ...t,
                fuelExpense: nFuel,
                driverCharge: nDrv,
                tollExpense: nToll,
                repairExpense: nRep,
                maintenanceExpense: nMnt,
                adblueExpense: nAdb,
                otherExpense: nOth,
                adblueAddedLiters: nAdbLit,
                profit: rev - totalExp
              };
            }
            return t;
          });
          updateTripsState(updatedTrips);

          const expWithTrip = { ...expenseUnit, tripId: lastEndedTrip.id };
          updateExpensesState([expWithTrip, ...expenses]);
        } else {
          // Fallback if no trip exists yet
          updateExpensesState([expenseUnit, ...expenses]);
        }
      }
    }

    // Capture Repair, Maintenance & AdBlue bills automatically in the central ledger accounts
    if (expenseUnit.category === 'repair' || expenseUnit.category === 'maintenance' || expenseUnit.category === 'adblue') {
      const dummyBill: MaintenanceBill = {
        id: expenseUnit.billNo ? `BLL-${expenseUnit.billNo}` : `BLL-${Math.floor(100 + Math.random() * 900)}`,
        tankerId: expenseUnit.tankerId,
        tankerNumber: expenseUnit.tankerNumber,
        vendorName: expenseUnit.vendorName || (expenseUnit.category === 'adblue' ? 'Default AdBlue Depot' : expenseUnit.category === 'maintenance' ? 'Scheduled Maintenance Depot' : 'Direct Cash / Service Yard'),
        billNo: expenseUnit.billNo || `CASH-${Math.floor(1000 + Math.random() * 9000)}`,
        date: expenseUnit.date,
        amount: expenseUnit.amount,
        detail: expenseUnit.detail,
        status: expenseUnit.paymentStatus || 'collected',
        category: expenseUnit.category,
        place: expenseUnit.place || 'Ranoli',
        workType: expenseUnit.workType || (expenseUnit.category === 'adblue' ? 'AdBlue Refill' : expenseUnit.category === 'maintenance' ? 'Preventive Maintenance' : 'Mechanical Maintenance')
      };
      handleRegisterMaintenanceBill(dummyBill);
    }
  };

  const purgeDatabase = () => {
    if (confirm("Reset Fleet Master back to standard pre-seeded chemical tanker records?")) {
      FleetMasterStore.purge();
    }
  };

  if (!currentUser) {
    return <Login onLoginSuccess={handleLoginSuccess} theme={theme} toggleTheme={toggleTheme} />;
  }

  // Driver portal view lock
  if (currentUser && currentUser.role === 'driver') {
    return (
      <DriverPortal
        currentUser={currentUser}
        onSignOut={handleSignOut}
        trips={trips}
        tankers={tankers}
        drivers={drivers}
        expenses={expenses}
        onStartTrip={handleStartTrip}
        onEndTrip={handleEndTrip}
        onAddGeneralExpense={handleAddGeneralExpense}
        onReceiveLr={handleReceiveLr}
        lrs={lrs}
        onAddLr={handleAddLr}
        theme={theme}
        toggleTheme={toggleTheme}
      />
    );
  }

  // View Routing Tab Render
  const renderTabContent = () => {
    switch (activeTab) {
      case 'Notifications':
        return (
          <NotificationsPortal
            bills={bills}
            expenses={expenses}
            trips={trips}
            tankers={tankers}
            currentUser={currentUser}
            onAddGeneralExpense={handleAddGeneralExpense}
            onVerifyBill={handleVerifyBillGenuine}
            onVerifyExpense={handleVerifyExpenseGenuine}
            onRejectBill={handleRejectBill}
            onRejectExpense={handleRejectExpense}
          />
        );
      case 'Workspace':
        return (
          <WorkspaceManager
            trips={trips}
            tankers={tankers}
            drivers={drivers}
            bills={bills}
            expenses={expenses}
          />
        );
      case 'AICabin':
        return (
          <AICabin
            tankers={tankers}
            drivers={drivers}
            lrs={lrs}
            trips={trips}
            bills={bills}
            expenses={expenses}
          />
        );
      case 'Dashboard':
        return (
          <Dashboard
            tankers={tankers}
            drivers={drivers}
            lrs={lrs}
            trips={trips}
            bills={bills}
            onAddTanker={handleAddTanker}
            onAddDriver={handleAddDriver}
            onAddBill={handleRegisterMaintenanceBill}
            onStartTrip={handleStartTrip}
            onAddLr={handleAddLr}
            setActiveTab={setActiveTab}
            onTriggerAddExpense={() => {
              if (tankers.length > 0) {
                setExpenseTankerId(tankers[0].id);
              }
              setShowMainExpenseModal(true);
            }}
          />
        );
      case 'L.R. Record':
        return (
          <LRManager
            lrs={lrs}
            tankers={tankers}
            trips={trips}
            onAddLr={handleAddLr}
            onReceiveLr={handleReceiveLr}
            currentUser={currentUser}
            onUpdateUser={handleUpdateUser}
            onDeleteLr={(id) => handleMoveToTrash('lr', id, lrs.find(l => l.id === id)?.lrNo || id, lrs.find(l => l.id === id))}
          />
        );
      case 'Trips':
        return (
          <Trips
            trips={trips}
            lrs={lrs}
            tankers={tankers}
            drivers={drivers}
            expenses={expenses}
            onStartTrip={handleStartTrip}
            onEndTrip={handleEndTrip}
            onAddGeneralExpense={handleAddGeneralExpense}
            onAddLr={handleAddLr}
            autoOpenRegister={autoOpenStartTripModal}
            onCloseAutoOpen={() => setAutoOpenStartTripModal(false)}
            onDeleteTrip={(id) => handleMoveToTrash('trip', id, trips.find(t => t.id === id)?.lrNo || id, trips.find(t => t.id === id))}
            onImportBulkData={handleBulkImport}
            onUpdateTrip={(updatedTrip: Trip) => {
              const updated = trips.map(t => t.id === updatedTrip.id ? updatedTrip : t);
              updateTripsState(updated);
            }}
            onUpdateLr={(updatedLr: LorryReceipt) => {
              const updated = lrs.map(l => l.id === updatedLr.id ? updatedLr : l);
              updateLrsState(updated);
            }}
          />
        );
      case 'Tankers':
        return (
          <Tankers
            tankers={tankers}
            onAddPart={(tnkId, part) => {
              const updated = tankers.map(t => {
                if (t.id === tnkId) {
                  return { ...t, parts: [part, ...(t.parts || [])] };
                }
                return t;
              });
              updateTankersState(updated);
            }}
            onUpdateExpDate={(tnkId, docKey, date) => {
              const updated = tankers.map(t => {
                if (t.id === tnkId) {
                  return {
                    ...t,
                    expirations: { ...t.expirations, [docKey]: date }
                  };
                }
                return t;
              });
              updateTankersState(updated);
            }}
            onDeleteTanker={(id) => handleMoveToTrash('tanker', id, tankers.find(t => t.id === id)?.tankerNumber || id, tankers.find(t => t.id === id))}
          />
        );
      case 'Drivers':
        return (
          <Drivers 
            drivers={drivers} 
            onDeleteDriver={(id) => handleMoveToTrash('driver', id, drivers.find(d => d.id === id)?.name || id, drivers.find(d => d.id === id))}
            onAddDriver={handleAddDriver}
            onUpdateDriver={handleUpdateDriver}
            autoOpenRegister={autoOpenAddDriverModal}
            onCloseAutoOpen={() => setAutoOpenAddDriverModal(false)}
          />
        );
      case 'Ledgers':
        return (
          <Ledger
            trips={trips}
            lrs={lrs}
            bills={bills}
            tankers={tankers}
            drivers={drivers}
            expenses={expenses}
            currentUser={currentUser}
            onAddGeneralExpense={handleAddGeneralExpense}
            onMarkBillCollected={handleMarkBillCollected}
            onRegisterMaintenanceBill={handleRegisterMaintenanceBill}
            onDeleteBill={(id) => handleMoveToTrash('bill', id, bills.find(b => b.id === id)?.billNo || id, bills.find(b => b.id === id))}
            onDeleteExpense={(id) => handleMoveToTrash('expense', id, expenses.find(e => e.id === id)?.detail || id, expenses.find(e => e.id === id))}
            onImportBulkBills={(billsList) => {
              const existingIds = new Set(bills.map(b => b.id));
              const newBills = billsList.filter(b => !existingIds.has(b.id));
              if (newBills.length > 0) {
                updateBillsState([...newBills, ...bills]);
              }
              alert(`AI Statement Import Completed! Mapped & loaded ${newBills.length} invoice entries.`);
            }}
          />
        );
      case 'Adblue':
        return (
          <AdBlueManager
            tankers={tankers}
            trips={trips}
            expenses={expenses}
            onAddGeneralExpense={handleAddGeneralExpense}
          />
        );
      case 'Fuel':
        return (
          <FuelManager
            tankers={tankers}
            expenses={expenses}
            trips={trips}
            onAddGeneralExpense={handleAddGeneralExpense}
          />
        );
      case 'Trash':
        return (
          <TrashManager
            trashedItems={trashedItems}
            onRestore={handleRestoreFromTrash}
            onPermanentDelete={handlePermanentDelete}
            onEmptyTrash={handleEmptyTrash}
          />
        );
      case 'Reports':
        return (
          <Reports
            trips={trips}
            lrs={lrs}
            bills={bills}
          />
        );
      case 'MasterAccounting':
        return (
          <MasterAccounting 
            tankers={tankers}
            drivers={drivers}
          />
        );
      case 'ShortageManager':
        return (
          <ShortageManager
            trips={trips}
            drivers={drivers}
            tankers={tankers}
          />
        );
      case 'Maintenance':
        return (
          <MaintenanceManager
            tankers={tankers}
            bills={bills}
            expenses={expenses}
            trips={trips}
            lrs={lrs}
            onAddPart={(tnkId, part) => {
              const updated = tankers.map(t => {
                if (t.id === tnkId) {
                  return { ...t, parts: [part, ...(t.parts || [])] };
                }
                return t;
              });
              updateTankersState(updated);
            }}
            onAddBill={handleRegisterMaintenanceBill}
            onAddGeneralExpense={handleAddGeneralExpense}
            onMarkBillCollected={handleMarkBillCollected}
            onDeleteBill={(id) => handleMoveToTrash('bill', id, bills.find(b => b.id === id)?.billNo || id, bills.find(b => b.id === id))}
            onDeleteExpense={(id) => handleMoveToTrash('expense', id, expenses.find(e => e.id === id)?.detail || id, expenses.find(e => e.id === id))}
            onDeleteTrip={(id) => handleMoveToTrash('trip', id, trips.find(t => t.id === id)?.lrNo || id, trips.find(t => t.id === id))}
            onImportBulkBills={(billsList) => {
              const existingIds = new Set(bills.map(b => b.id));
              const newBills = billsList.filter(b => !existingIds.has(b.id));
              if (newBills.length > 0) {
                updateBillsState([...newBills, ...bills]);
              }
              alert(`AI Statement Import Completed! Mapped & loaded ${newBills.length} invoice entries.`);
            }}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className={`h-screen max-h-screen flex flex-col font-sans transition-colors duration-300 relative overflow-hidden ${theme === 'light' ? 'bg-[#f1f5f9] text-[#334155]' : 'bg-[#0c0908] text-[#fcece3]'}`}>
      
      {/* Global Scrolling Telemetry Coordinates & Moving Highway Highway lines */}
      <div className="highway-scrolling-lines" />
      
      {/* Autononous Gliding Ghost Tanker Rig Horizon */}
      <div className="ghost-tanker-scroller">
        <svg className={`ghost-tanker-asset h-14 transition-colors duration-300 ${theme === 'light' ? 'text-orange-500/15' : 'text-[#ff5a1f]/35'}`} viewBox="0 0 120 40" fill="currentColor">
          <path d="M88 24h18c2.5 0 3.5-1.2 3.5-3.2v-5.6c0-1.6-1.2-3.2-2.4-3.2H94l-2.4-3.2h-7.2V24z" />
          <path d="M95 11l1.2 2.4h5.2l-0.8-2.8z" fill={theme === 'light' ? '#cbd5e1' : '#0c0908'} opacity="0.5" />
          <rect x="12" y="9" width="62" height="13" rx="6.5" />
          <rect x="72" y="18" width="12" height="3.5" />
          <rect x="8" y="21" width="72" height="2.5" />
          <circle cx="18" cy="24.5" r="3.6" />
          <circle cx="26" cy="24.5" r="3.6" />
          <circle cx="58" cy="24.5" r="3.6" />
          <circle cx="66" cy="24.5" r="3.6" />
          <circle cx="92" cy="24.5" r="3.6" />
        </svg>
      </div>

      {/* Top Console Navigation Bar */}
      <header className={`border-b backdrop-blur-md shrink-0 z-40 px-6 py-4 flex items-center justify-between gap-4 transition-colors duration-300 ${theme === 'light' ? 'bg-white/60 border-slate-200' : 'bg-[#121010]/95 border-white/[0.04]'}`}>
        <div className="flex items-center gap-3.5">
          {/* Mobile Hamburguer trigger */}
          <button 
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-2.5 md:hidden hover:bg-white/[0.04] border border-white/[0.06] rounded-2xl text-white transition-all cursor-pointer"
            title="Toggle Menu"
          >
            {isMobileMenuOpen ? <X className="w-5 h-5 text-[#ff5a1f]" /> : <Menu className="w-5 h-5 text-[#ff7a4e]" />}
          </button>

          <div className="p-3 bg-gradient-to-tr from-[#ff7a4e] to-[#ff5a1f] rounded-2xl text-white shadow-lg shadow-[#ff5a1f]/20">
            <Truck className="w-5.5 h-5.5" />
          </div>
          <div>
            <h1 className="text-base md:text-lg font-extrabold text-white tracking-tight flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
              <span className="bg-gradient-to-r from-[#ff7a4e] to-[#ff5a1f] bg-clip-text text-transparent uppercase whitespace-nowrap overflow-hidden text-ellipsis max-w-[280px] sm:max-w-[450px]">
                {(currentUser.company === "Fleet Master Petrochem Transport" ? currentUser.username : currentUser.company) || "DELIVR. LOGISTICS"}
              </span>
              <span className="text-[9px] md:text-[10px] bg-[#ff5a1f]/10 border border-[#ff5a1f]/20 text-[#ff7a4e] font-mono px-2 py-0.5 rounded-full font-bold uppercase tracking-wide inline-flex items-center gap-1 w-fit">
                👤 {currentUser.username} (Operator)
              </span>
            </h1>
            <p className="text-[9px] md:text-[10px] text-[#8b949e] font-mono mt-0.5 tracking-wider uppercase opacity-80">
              Chemical Vessel Logistics Console
            </p>
          </div>
        </div>

        {/* Action controls */}
        <div className="flex items-center gap-2.5 md:gap-4 text-xs font-mono">
          <button 
            onClick={toggleTheme}
            title={theme === 'dark' ? "Switch to Light Theme" : "Switch to Dark Theme"}
            className="p-3 bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.06] rounded-2xl text-white transition-all cursor-pointer flex items-center justify-center shadow-inner"
          >
            {theme === 'dark' ? (
              <Sun className="w-4.5 h-4.5 text-amber-400" />
            ) : (
              <Moon className="w-4.5 h-4.5 text-[#ff7a4e]" />
            )}
          </button>

          <button 
            onClick={purgeDatabase}
            title="Reset pre-seeded database"
            className="p-3 bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.06] rounded-2xl text-[#8b949e] hover:text-[#ff7a4e] transition-all cursor-pointer hidden sm:flex items-center justify-center shadow-inner"
          >
            <RefreshCw className="w-4.5 h-4.5" />
          </button>
          
          <div className="h-6 w-px bg-white/[0.06] hidden sm:block" />

          <span className="text-[#8b949e] hidden md:inline text-[11px]">
            Dispatcher: <strong className="text-white text-xs">@{currentUser.username}</strong>
          </span>
          <button 
            onClick={handleSignOut}
            className="bg-[#1a1818] hover:bg-red-950/20 border border-white/[0.06] text-[#8b949e] hover:text-[#ff5a1f] hover:border-[#ff5a1f]/40 rounded-2xl px-4 py-2.5 inline-flex items-center gap-2 transition-all text-xs font-medium cursor-pointer"
          >
            <LogOut className="w-4 h-4 text-[#ff7a4e]" />
            <span className="hidden sm:inline">Log Out</span>
          </button>
        </div>
      </header>

      {/* Main Container Sidebar Grid Layout */}
      <div className="flex-1 flex flex-col md:flex-row relative overflow-hidden min-h-0">
        
        {/* Navigation Sidebar Panel with Glassmorphism & Structured Accordions */}
        <aside className="hidden md:flex w-68 bg-[#121010] border-r border-[#30363d] p-5 flex-col justify-between gap-4 flex-shrink-0 style-aside relative z-30 h-full overflow-y-auto scrollbar-thin">
          <div className="space-y-4 pr-1">
            
            <div className="px-3 flex items-center justify-between">
              <span className="text-[10px] font-mono font-bold text-[#8b949e] uppercase tracking-widest block opacity-70">
                DISPATCH CABIN
              </span>
            </div>

            {/* QUICK JUMP MODERN DROPDOWN SELECTOR (Addresses decluttering & sleek design) */}
            <div className="relative px-1 select-none">
              <button 
                onClick={() => setIsJumpOpen(!isJumpOpen)}
                className="w-full flex items-center justify-between px-3.5 py-2.5 bg-white/[0.04] hover:bg-white/[0.08] dark:bg-black/[0.02] dark:hover:bg-black/[0.05] border border-orange-500/20 hover:border-orange-500/40 rounded-xl text-xs sm:text-[11px] font-semibold text-[#ff7a4e] cursor-pointer transition-all dynamic-nav-dropdown"
              >
                <span className="flex items-center gap-2">
                  <Sparkles className="w-3.5 h-3.5 animate-pulse text-[#ff5a1f]" />
                  <span>JUMP TO VIEW...</span>
                </span>
                <span className={`text-[9px] transition-transform duration-300 ${isJumpOpen ? 'rotate-180' : ''}`}>▼</span>
              </button>
              <AnimatePresence>
                {isJumpOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    className="absolute left-0 right-0 mt-1 bg-white/95 text-slate-800 dark:bg-[#1a1312]/95 dark:text-gray-100 backdrop-blur-xl border border-black/10 dark:border-white/10 rounded-2xl shadow-xl z-50 text-left p-1 max-h-64 overflow-y-auto"
                  >
                    {[
                      { id: 'Dashboard', label: 'Dashboard' },
                      { id: 'AICabin', label: 'AI Intelligent Cabin' },
                      { id: 'L.R. Record', label: 'L.R Records' },
                      { id: 'Trips', label: 'Active Trips' },
                      { id: 'Tankers', label: 'Manage Tankers' },
                      { id: 'Drivers', label: 'Driver Directory' },
                      { id: 'Maintenance', label: 'Fleet Maintenance' },
                      { id: 'Adblue', label: 'Emission Control' },
                      { id: 'Fuel', label: 'Diesel & Fuel Register' },
                      { id: 'Ledgers', label: 'Ledger Books' },
                      { id: 'MasterAccounting', label: 'Central Accounts' },
                      { id: 'Reports', label: 'Analytics & Audits' },
                      { id: 'Trash', label: 'System Trash' }
                    ].map(opt => (
                      <button
                        key={opt.id}
                        onClick={() => {
                          setActiveTab(opt.id);
                          setIsJumpOpen(false);
                        }}
                        className={`w-full text-left px-3 py-1.5 rounded-xl text-[11px] font-semibold transition-all ${
                          activeTab === opt.id 
                            ? 'bg-gradient-to-r from-[#ff7c4f] to-[#ff5314] text-white' 
                            : 'hover:bg-slate-100 dark:hover:bg-white/5 text-[#475569] dark:text-gray-300'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="h-px bg-white/[0.04] dark:bg-black/[0.03] my-1" />

            <nav className="flex flex-col gap-3">
              {[
                {
                  id: 'core',
                  title: '🚀 CORE MONITORS',
                  items: [
                    { id: 'Dashboard', label: 'Monitor Dashboard', icon: LayoutDashboard, badge: null },
                    { id: 'Notifications', label: 'Admin Notifications', icon: Bell, badge: (bills.filter(b => (b.category === 'repair' || b.category === 'maintenance') && b.isVerifiedByAdmin !== true).length + expenses.filter(e => (e.category === 'repair' || e.category === 'maintenance') && e.isVerifiedByAdmin !== true).length) || null, badgeColor: 'bg-[#ff5a1f]/10 text-[#ff7a4e] border border-[#ff5a1f]/20' },
                    { id: 'AICabin', label: 'AI Intelligent Cabin', icon: Sparkles, badge: 'ACTIVE', badgeColor: 'bg-emerald-500/10 text-emerald-400 border border-[#10b981]/20' },
                    { id: 'Workspace', label: 'Google Workspace', icon: Layers, badge: 'NEW', badgeColor: 'bg-blue-500/10 text-blue-400 border border-blue-500/20 shadow' }
                  ]
                },
                {
                  id: 'fleet',
                  title: '🚛 FLEET CONTROL',
                  items: [
                    { id: 'L.R. Record', label: 'L.R Records', icon: FileText, badge: lrs.filter(l => l.status === 'pending').length || null, badgeColor: 'bg-[#ff5a1f]/10 text-[#ff7a4e] border border-[#ff5a1f]/20' },
                    { id: 'Trips', label: 'Active Trips', icon: ClipboardList, badge: trips.filter(t => t.status === 'running').length || null, badgeColor: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 animate-pulse' },
                    { id: 'Tankers', label: 'Manage Tankers', icon: Truck, badge: null },
                    { id: 'Drivers', label: 'Driver Directory', icon: Users, badge: null },
                    { id: 'Maintenance', label: 'Fleet Maintenance', icon: Wrench, badge: null }
                  ]
                },
                {
                  id: 'logistics',
                  title: '💧 FLUID LOGISTICS',
                  items: [
                    { id: 'Adblue', label: 'Emission Control', icon: Droplet, badge: null },
                    { id: 'Fuel', label: 'Fuel Register', icon: Fuel, badge: null }
                  ]
                },
                {
                  id: 'finance',
                  title: '📊 AUDITS & FINANCIALS',
                  items: [
                    { id: 'Ledgers', label: 'Ledger Books', icon: CreditCard, badge: bills.filter(b => b.status === 'pending').length || null, badgeColor: 'bg-rose-500/10 text-rose-400 border border-rose-500/20' },
                    { id: 'ShortageManager', label: 'Shortage Center', icon: ShieldAlert, badge: trips.filter(t => {
                      const loading = t.loadingWeight || 0;
                      const unloading = t.unloadingWeight ?? loading;
                      return t.status === 'completed' && Math.max(0, parseFloat((loading - unloading).toFixed(3))) > 0;
                    }).length || null, badgeColor: 'bg-orange-500/10 text-orange-400 border border-orange-500/20' },
                    { id: 'MasterAccounting', label: 'Central Accounts', icon: BookOpen, badge: null },
                    { id: 'Reports', label: 'Analytics & Audits', icon: BarChart2, badge: null }
                  ]
                },
                {
                  id: 'system',
                  title: '⚙️ OPERATOR PORTAL',
                  items: [
                    { id: 'Trash', label: 'System Trash Bin', icon: Trash2, badge: trashedItems.length || null, badgeColor: 'bg-rose-500/10 text-rose-400 border border-rose-500/20' }
                  ]
                }
              ].map(group => {
                const isOpen = expandedGroups[group.id] ?? true;
                return (
                  <div key={group.id} className="space-y-1">
                    {/* Collapsible Accordion Header */}
                    <button 
                      onClick={() => toggleGroup(group.id)}
                      className="w-full flex items-center justify-between px-3 py-1 text-[9px] font-mono font-extrabold text-[#ff7a4e] tracking-wider uppercase opacity-85 hover:opacity-100 cursor-pointer"
                    >
                      <span>{group.title}</span>
                      <span className="text-[7.5px] opacity-60">{isOpen ? '▼' : '▶'}</span>
                    </button>
                    
                    {/* Collapsible accordion container with standard heights and transitions */}
                    <AnimatePresence initial={false}>
                      {isOpen && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.25, ease: 'easeInOut' }}
                          className="overflow-hidden flex flex-col gap-0.5 pl-1"
                        >
                          {group.items.map((tab) => {
                            const Icon = tab.icon;
                            const isSelected = activeTab === tab.id;
                            
                            return (
                              <motion.button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                whileHover={{ scale: 1.01, x: 2 }}
                                whileTap={{ scale: 0.99 }}
                                className={`w-full text-left px-3 py-2.5 rounded-xl text-[11px] font-semibold flex items-center justify-between gap-2 cursor-pointer transition-all border ${
                                  isSelected 
                                    ? 'bg-gradient-to-r from-[#ff7c4f] to-[#ff5314] text-white shadow-md shadow-[#ff5a1f]/15 border-[#ff5314]/30 font-bold' 
                                    : 'text-[#475569] dark:text-[#b8a49c] border-transparent hover:bg-[#ea580c]/5 hover:text-[#ff5a1f] dark:hover:bg-white/[0.03] dark:hover:text-white'
                                }`}
                              >
                                <div className="flex items-center gap-2.5">
                                  <Icon className={`w-4 h-4 ${isSelected ? 'text-white' : 'text-[#8b949e] dark:text-[#b8a49c]'}`} />
                                  <span>{tab.label}</span>
                                </div>
                                {tab.badge !== null && (
                                  <span className={`text-[8.5px] font-mono font-bold px-1.5 py-0.5 rounded-full leading-none scale-90 ${tab.badgeColor}`}>
                                    {tab.badge}
                                  </span>
                                )}
                              </motion.button>
                            );
                          })}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}

              <div className="h-px bg-white/[0.04] dark:bg-black/[0.03] my-1" />

              <motion.button
                onClick={handleSignOut}
                whileHover={{ scale: 1.02, x: 2 }}
                whileTap={{ scale: 0.98 }}
                className="w-full text-left px-4 py-3 rounded-xl text-xs font-semibold flex items-center gap-2.5 cursor-pointer transition-all border border-transparent text-rose-400 hover:bg-rose-500/10 hover:text-rose-300"
              >
                <LogOut className="w-4 h-4 text-rose-500" />
                <span>Log Out</span>
              </motion.button>
            </nav>

            {/* Direct Dispatch Trip & Pilot Shortcut Actions */}
            <div className="pt-2 px-1 space-y-2">
              <button
                onClick={() => {
                  setActiveTab('Trips');
                  setAutoOpenStartTripModal(true);
                }}
                className="w-full text-center py-2.5 rounded-xl text-[#010409] font-bold flex items-center justify-center gap-2 cursor-pointer bg-gradient-to-r from-[#ff7a4e] to-[#ff5a1f] hover:brightness-110 text-white shadow-md shadow-[#ff5a1f]/10 group transition-all"
              >
                <Plus className="w-3.5 h-3.5 text-white group-hover:rotate-90 transition-transform duration-350" />
                <span>Register New Trip</span>
              </button>

              <button
                onClick={() => {
                  setActiveTab('Drivers');
                  setAutoOpenAddDriverModal(true);
                }}
                className="w-full text-center py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 cursor-pointer bg-slate-800 hover:bg-[#21262d] border border-[#30363d] hover:border-blue-500/50 text-white group transition-all"
              >
                <Users className="w-3.5 h-3.5 text-blue-400 group-hover:scale-110 transition-transform" />
                <span>Onboard / View Driver</span>
              </button>
            </div>
          </div>

          {/* Quick Stats Summary Card inside navigation footer */}
          <div className="p-3 bg-[#141212]/90 border border-white/[0.04] rounded-xl space-y-2 text-[10.5px] font-mono text-slate-700 dark:text-gray-300 style-aside-stats shadow-inner">
            <div className="flex items-center justify-between opacity-80">
              <span>Active Vehicles:</span>
              <span className="font-bold">{tankers.filter(t => t.status === 'running').length}/{tankers.length}</span>
            </div>
            <div className="w-full bg-white/[0.04] dark:bg-black/[0.05] h-1.5 rounded-full overflow-hidden">
              <div 
                className="bg-gradient-to-r from-[#ff7a4e] to-[#ff5a1f] h-full rounded-full transition-all duration-300" 
                style={{ width: `${tankers.length > 0 ? (tankers.filter(t => t.status==='running').length / tankers.length) * 100 : 0}%` }}
              />
            </div>
            <div className="flex justify-between items-center text-[9px] opacity-80">
              <span>System Node Code</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            </div>
          </div>
        </aside>

        {/* Sliding Menu drawer overlay strictly for Mobile screens */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <div className="fixed inset-0 top-[69px] z-50 md:hidden flex">
              {/* Back drop */}
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsMobileMenuOpen(false)}
                className="absolute inset-0 bg-black/70 backdrop-blur-sm"
              />
              {/* Drawer Content */}
              <motion.nav 
                initial={{ x: '-100%' }}
                animate={{ x: 0 }}
                exit={{ x: '-100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 220 }}
                className="relative w-80 max-w-[85%] bg-[#161b22] border-r border-[#30363d] h-full p-5 flex flex-col justify-between gap-6 overflow-y-auto scrollbar-thin"
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b border-[#30363d] pb-3 mb-2">
                    <span className="text-[10px] font-mono font-bold text-[#8b949e] uppercase tracking-wider">
                      Control Cabin Options
                    </span>
                    <button 
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="p-1 hover:bg-[#21262d] rounded-lg text-[#8b949e] hover:text-white"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="flex flex-col gap-1">
                    {[
                      { id: 'Dashboard', label: 'Dashboard', icon: LayoutDashboard, badge: null },
                      { id: 'AICabin', label: 'AI Intelligent Cabin', icon: Sparkles, badge: 'ACTIVE', badgeColor: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow' },
                      { id: 'Workspace', label: 'Google Workspace', icon: Layers, badge: 'NEW', badgeColor: 'bg-blue-500/10 text-blue-400 border border-blue-500/20 shadow' },
                      { id: 'L.R. Record', label: 'L.R Records', icon: FileText, badge: lrs.filter(l => l.status === 'pending').length || null, badgeColor: 'bg-amber-500/10 text-amber-400 border border-amber-500/20' },
                      { id: 'Trips', label: 'Trips Data', icon: ClipboardList, badge: trips.filter(t => t.status === 'running').length || null, badgeColor: 'bg-blue-500/10 text-blue-400 border border-blue-500/20' },
                      { id: 'Tankers', label: 'Manage Tankers', icon: Truck, badge: null },
                      { id: 'Drivers', label: 'Driver Directory', icon: Users, badge: null },
                      { id: 'Maintenance', label: 'Fleet Maintenance', icon: Wrench, badge: null },
                      { id: 'Adblue', label: 'Emission Control', icon: Droplet, badge: null },
                      { id: 'Fuel', label: 'Fuel & Diesel Register', icon: Fuel, badge: null },
                      { id: 'Ledgers', label: 'Ledger Books', icon: CreditCard, badge: bills.filter(b => b.status === 'pending').length || null, badgeColor: 'bg-rose-500/10 text-rose-400 border border-rose-500/20' },
                      { id: 'MasterAccounting', label: 'Central Tally Accounts', icon: BookOpen, badge: null },
                      { id: 'Reports', label: 'Analytics & Audits', icon: BarChart2, badge: null },
                      { id: 'Trash', label: 'System Trash Bin', icon: Trash2, badge: trashedItems.length || null, badgeColor: 'bg-rose-500/10 text-rose-400 border border-rose-500/20' }
                    ].map((tab) => {
                      const Icon = tab.icon;
                      const isSelected = activeTab === tab.id;

                      return (
                        <motion.button
                          key={tab.id}
                          onClick={() => {
                            setActiveTab(tab.id);
                            setIsMobileMenuOpen(false);
                          }}
                          whileHover={{ scale: 1.02, x: 2 }}
                          whileTap={{ scale: 0.98 }}
                          className={`w-full text-left px-3.5 py-3 rounded-xl text-xs font-semibold flex items-center justify-between gap-2.5 cursor-pointer border border-transparent transition-all ${
                            isSelected 
                              ? 'bg-blue-600/10 border-blue-500/20 text-white font-bold' 
                              : 'text-[#8b949e] hover:bg-[#21262d] hover:text-white'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <Icon className={`w-4 h-4 ${isSelected ? 'text-blue-400' : 'text-[#8b949e]'}`} />
                            <span>{tab.label}</span>
                          </div>
                          {tab.badge !== null && (
                            <span className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded-full ${tab.badgeColor}`}>
                              {tab.badge}
                            </span>
                          )}
                        </motion.button>
                      );
                    })}

                    <div className="h-px bg-[#30363d] my-2" />

                    <motion.button
                      onClick={() => {
                        handleSignOut();
                        setIsMobileMenuOpen(false);
                      }}
                      whileHover={{ scale: 1.02, x: 2 }}
                      whileTap={{ scale: 0.98 }}
                      className="w-full text-left px-3.5 py-3 rounded-xl text-xs font-semibold flex items-center gap-2.5 cursor-pointer border border-transparent transition-all text-rose-400 hover:bg-rose-500/10 hover:text-rose-300"
                    >
                      <LogOut className="w-4 h-4 text-rose-400" />
                      <span>Log Out</span>
                    </motion.button>
                  </div>

                  {/* Mobile Direct Dispatch Trip Shortcut Action */}
                  <div className="pt-2 px-1">
                    <button
                      onClick={() => {
                        setActiveTab('Trips');
                        setAutoOpenStartTripModal(true);
                        setIsMobileMenuOpen(false);
                      }}
                      className="w-full text-left px-3.5 py-3 rounded-xl text-xs font-black flex items-center gap-2.5 cursor-pointer bg-gradient-to-r from-[#ff5a5f] to-[#ff7b7f] hover:brightness-110 text-white shadow-lg group transition-all"
                    >
                      <Plus className="w-4 h-4 text-white group-hover:rotate-90 transition-transform duration-300" />
                      <span>Register New Trip</span>
                    </button>
                  </div>
                </div>

                <div className="p-3 bg-red-500/5 border border-red-500/10 rounded-xl text-[10.5px] text-[#8b949e] justify-self-end leading-normal">
                  <span className="font-bold text-white block mb-0.5">Real-time Node Connected</span>
                  Access centralized logs and compliancy audits on the go.
                </div>
              </motion.nav>
            </div>
          )}
        </AnimatePresence>

        {/* Content Viewframe */}
        <main ref={mainRef} className="flex-grow bg-[#0d1117] overflow-y-auto">
          {activeTab !== 'Dashboard' && (
            <div className="max-w-7xl mx-auto px-6 pt-6 -mb-2">
              <motion.div 
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-center justify-between bg-[#161b22]/50 border border-[#30363d] rounded-2xl px-5 py-3.5 backdrop-blur-md shadow-lg"
              >
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setActiveTab('Dashboard')}
                    className="inline-flex items-center justify-center w-8 h-8 rounded-xl bg-[#21262d] hover:bg-[#30363d] hover:border-[#ff5a5f]/40 text-white hover:text-[#ff5a5f] border border-[#30363d] transition-all cursor-pointer shadow group"
                    title="Return to Dashboard Controller"
                  >
                    <motion.span
                      animate={{ x: [0, -2, 0] }}
                      transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
                      className="font-bold text-xs"
                    >
                      ←
                    </motion.span>
                  </button>
                  <div className="font-mono text-xs text-[#8b949e]">
                    CONTROL BOARD / <span className="text-white font-bold">{activeTab.toUpperCase()}</span>
                  </div>
                </div>

                <div className="hidden sm:flex items-center gap-2.5">
                  <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                  <span className="text-[10px] font-mono text-blue-400 font-extrabold uppercase tracking-widest">SECURE DATA INTERFACE</span>
                </div>
              </motion.div>
            </div>
          )}
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, scale: 0.985, y: 16, rotateX: 1.5 }}
              animate={{ opacity: 1, scale: 1, y: 0, rotateX: 0 }}
              exit={{ opacity: 0, scale: 0.985, y: -16, rotateX: -1.5 }}
              transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
              className="h-full flex flex-col perspective-container"
              style={{ transformStyle: 'preserve-3d' }}
            >
              {activeTab !== 'Dashboard' && (
                <div className="flex items-center gap-3 px-6 pt-4 pb-1">
                  <button
                    onClick={() => setActiveTab('Dashboard')}
                    className="flex items-center gap-1.5 text-xs text-blue-400 hover:text-white font-bold px-3.5 py-2 bg-[#161b22] hover:bg-[#21262d] border border-[#30363d] rounded-xl transition-all cursor-pointer active:scale-95 shadow-md font-sans"
                    id="backToDashboardBtn"
                  >
                    <span className="text-sm font-black">←</span> Back to Dashboard Control Room
                  </button>
                </div>
              )}
              {renderTabContent()}
            </motion.div>
          </AnimatePresence>
        </main>

      </div>

      {/* Dynamic Main Quick Expense Modal */}
      {showMainExpenseModal && (
        <div className="fixed inset-0 bg-[#010409]/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-lg bg-[#161b22] border border-[#30363d] rounded-2xl overflow-hidden shadow-2xl shadow-[#010409]/50 text-left"
          >
            <div className="px-5 py-4 border-b border-[#30363d] flex items-center justify-between bg-[#1f242c]">
              <div>
                <h3 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
                  RECORD OPERATIONAL EXPENSE
                </h3>
                <p className="text-[10px] text-[#8b949e] font-mono mt-0.5">AUTO-CHANNELS TO TRIP LEDGERS & FINANCIAL STATUS</p>
              </div>
              <button 
                onClick={() => setShowMainExpenseModal(false)}
                className="p-1 px-2.5 bg-[#21262d] hover:bg-red-500/15 border border-[#30363d] text-[#8b949e] hover:text-red-400 rounded-lg text-xs font-mono transition-all cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={submitMainExpense} className="p-5 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4">
                {/* Tanker Select */}
                <div>
                  <label className="block text-[#8b949e] font-mono mb-1">SELECT TANKER *</label>
                  <select
                    required
                    value={expenseTankerId}
                    onChange={(e) => setExpenseTankerId(e.target.value)}
                    className="w-full bg-[#0d1117] border border-[#30363d] rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium"
                  >
                    <option value="" disabled>-- Select Tanker --</option>
                    {tankers.map(t => (
                      <option key={t.id} value={t.id}>{t.tankerNumber} ({t.status.toUpperCase()})</option>
                    ))}
                  </select>
                </div>

                {/* Expense Category */}
                <div>
                  <label className="block text-[#8b949e] font-mono mb-1">EXPENSE CATEGORY *</label>
                  <select
                    value={expenseCategory}
                    onChange={(e: any) => setExpenseCategory(e.target.value)}
                    className="w-full bg-[#0d1117] border border-[#30363d] rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium"
                  >
                    <option value="fuel">⛽ Fuel & Refueling</option>
                    <option value="driver">👤 Driver Allowance/Batta</option>
                    <option value="toll">🛣 Toll Plaza Expense</option>
                    <option value="repair">🔧 Workshop Repairs</option>
                    <option value="maintenance">🛠 Preventive Maintenance</option>
                    <option value="adblue">💧 AdBlue Refill / Additive</option>
                    <option value="other">📦 Other Operations Costs</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Date */}
                <div>
                  <label className="block text-[#8b949e] font-mono mb-1">TRANSACTION DATE *</label>
                  <input
                    type="date"
                    required
                    value={expenseDate}
                    onChange={(e) => setExpenseDate(e.target.value)}
                    className="w-full bg-[#0d1117] border border-[#30363d] rounded-xl px-3.5 py-2.5 text-white focus:outline-none"
                  />
                </div>

                {/* Amount */}
                <div>
                  <label className="block text-[#8b949e] font-mono mb-1">AMOUNT IN INR (₹) *</label>
                  <input
                    type="number"
                    required
                    placeholder="Enter amount"
                    value={expenseAmount}
                    onChange={(e) => setExpenseAmount(e.target.value)}
                    className="w-full bg-[#0d1117] border border-[#30363d] rounded-xl px-3.5 py-2.5 text-white focus:outline-none font-bold text-red-400 placeholder-[#484f58]"
                  />
                </div>
              </div>

              {/* Conditional Repair / Maintenance / AdBlue vendor inputs */}
              {(expenseCategory === 'repair' || expenseCategory === 'maintenance' || expenseCategory === 'adblue') && (
                <div className="p-3.5 bg-[#0d1117] border border-[#30363d] rounded-xl space-y-3">
                  <span className="text-[10px] font-mono text-red-400 font-bold block">
                    📋 SUPPLIER COMPLIANCE INVOICING INFO
                  </span>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] text-[#8b949e] font-mono mb-0.5">VENDOR / SHOP NAME</label>
                      <input
                        type="text"
                        placeholder="e.g. Surat Gasket Depot"
                        value={expenseVendorName}
                        onChange={(e) => setExpenseVendorName(e.target.value)}
                        className="w-full bg-[#161b22] border border-[#30363d] rounded-lg px-2.5 py-1.5 text-white focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-[#8b949e] font-mono mb-0.5">INVOICE/BILL NO</label>
                      <input
                        type="text"
                        placeholder="e.g. B-991"
                        value={expenseBillNo}
                        onChange={(e) => setExpenseBillNo(e.target.value)}
                        className="w-full bg-[#161b22] border border-[#30363d] rounded-lg px-2.5 py-1.5 text-white focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] text-[#8b949e] font-mono mb-0.5">PLACE & LOCATION</label>
                      <input
                        type="text"
                        value={expensePlace}
                        onChange={(e) => setExpensePlace(e.target.value)}
                        className="w-full bg-[#161b22] border border-[#30363d] rounded-lg px-2.5 py-1.5 text-white focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-[#8b949e] font-mono mb-0.5">WORK TYPE / SERVICE</label>
                      <input
                        type="text"
                        value={expenseWorkType}
                        onChange={(e) => setExpenseWorkType(e.target.value)}
                        className="w-full bg-[#161b22] border border-[#30363d] rounded-lg px-2.5 py-1.5 text-white focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Expense Details */}
              <div>
                <label className="block text-[#8b949e] font-mono mb-1">TRANSACTION MEMO & DESCRIPTION</label>
                <textarea
                  placeholder="Details of purchase refuel, battas, leaf spring breakdown or highway tolls..."
                  value={expenseDetail}
                  onChange={(e) => setExpenseDetail(e.target.value)}
                  rows={2}
                  className="w-full bg-[#0d1117] border border-[#30363d] rounded-xl px-3 py-2 text-white focus:outline-none font-sans"
                />
              </div>

              {/* Standalone Maintenance/Repair option */}
              <div 
                onClick={() => setExcludeFromTrip(p => !p)}
                className="flex items-start gap-2.5 p-3 bg-blue-500/5 hover:bg-blue-500/10 border border-blue-500/15 rounded-xl cursor-pointer select-none transition-colors"
                id="excludeFromTripWrapper"
              >
                <input
                  type="checkbox"
                  checked={excludeFromTrip}
                  readOnly
                  className="w-4 h-4 rounded mt-0.5 border-neutral-700 bg-neutral-900 text-blue-500 focus:ring-blue-500 cursor-pointer"
                  id="excludeFromTripCheckbox"
                />
                <div className="text-left leading-tight">
                  <span className="block text-xs font-bold text-white">Exclude from Trip Ledgers</span>
                  <span className="block text-[10px] text-gray-400 mt-0.5">Toggle this if this is a regular maintenance/repair or overhead expense that should NOT affect any trip's fuel or freight calculations.</span>
                </div>
              </div>

              {/* Direct Attribution Hint */}
              <div className="p-3 bg-red-500/5 border border-red-500/10 rounded-xl text-[10.5px] text-[#8b949e] leading-snug">
                {excludeFromTrip ? (
                  <span>📊 <strong>Standalone Expense:</strong> This expense is isolated. It will accrue to the overall Fleet Balance and Master Ledger, but will NOT affect any specific trip's diesel fuel average or freight margins.</span>
                ) : (
                  <span>⚠️ <strong>Attribution Mandate:</strong> This expense registers globally. If the tanker is in a current loading/running trip, it modifies trip freight accounting. Otherwise, it updates the last completed route's diesel and logistics metrics automatically.</span>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowMainExpenseModal(false)}
                  className="px-4 py-2.5 bg-[#21262d] hover:bg-[#30363d] border border-[#30363d] text-white rounded-xl font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white rounded-xl font-bold flex items-center gap-1.5 shadow-md shadow-red-900/15 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  Save Voucher
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Custom Safe Deletion Confirmation Overlay */}
      <AnimatePresence>
        {deleteConfirm && (
          <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#161b22] border border-rose-500/30 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl text-left"
            >
              <div className="p-5 border-b border-[#30363d] flex items-center justify-between bg-[#1f1a1d]">
                <h3 className="text-white font-extrabold text-sm flex items-center gap-2 tracking-tight">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />
                  MOVE TO SYSTEM TRASH?
                </h3>
                <button 
                  onClick={() => setDeleteConfirm(null)}
                  className="p-1 px-2.5 bg-[#21262d] hover:bg-neutral-800 border border-[#30363d] text-[#8b949e] hover:text-white rounded-lg text-xs font-mono transition-all cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <div className="p-5 space-y-4">
                <p className="text-[#8b949e] text-xs leading-relaxed">
                  Are you absolutely sure you want to move this <strong className="text-white font-mono uppercase text-[10px] bg-rose-500/10 border border-rose-500/20 px-1 py-0.5 rounded">{deleteConfirm.type}</strong> record to trash?
                </p>

                <div className="p-3 bg-[#0d1117] border border-[#30363d] rounded-xl flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-rose-500/10 text-rose-400 flex items-center justify-center text-xs font-bold">
                    🗑️
                  </div>
                  <div>
                    <span className="block text-[10px] text-[#8b949e] font-mono uppercase tracking-wider">Record Identifier</span>
                    <span className="font-bold text-white text-xs block">{deleteConfirm.name}</span>
                  </div>
                </div>

                <p className="text-[10px] text-yellow-500 font-mono leading-normal bg-yellow-500/5 border border-yellow-500/15 p-2.5 rounded-lg">
                  💡 This record is removed from active operations but can be fully restored at any time from the "System Trash" tab.
                </p>

                <div className="flex items-center justify-end gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => setDeleteConfirm(null)}
                    className="px-4 py-2 bg-[#21262d] hover:bg-[#30363d] border border-[#30363d] hover:border-[#8b949e] text-[#8b949e] hover:text-white rounded-xl text-xs font-bold transition-all cursor-pointer font-mono"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={executeMoveToTrash}
                    className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 shadow-lg shadow-rose-950/25"
                  >
                    Move to Trash
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <DocumentPreviewer />
    </div>
  );
}
