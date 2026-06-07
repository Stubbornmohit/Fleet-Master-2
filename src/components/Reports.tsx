import React from 'react';
import { motion } from 'motion/react';
import { 
  BarChart3, Download, TrendingUp, Sparkles, Fuel, ShieldClose, ShoppingBag, Database, ShieldCheck 
} from 'lucide-react';
import { exportToPDF } from '../utils/exportUtils';
import { Trip, LorryReceipt, MaintenanceBill, TankerExpense } from '../types';

interface ReportsProps {
  trips: Trip[];
  lrs: LorryReceipt[];
  bills: MaintenanceBill[];
}

export default function Reports({ trips, lrs, bills }: ReportsProps) {
  const completed = trips.filter(t => t.status === 'completed');

  // Calculates financial aggregates
  const totalRevenue = completed.reduce((acc, t) => acc + (t.revenue || 0), 0);
  const totalFuelExp = completed.reduce((acc, t) => acc + t.fuelExpense, 0);
  const totalDriverExp = completed.reduce((acc, t) => acc + t.driverCharge, 0);
  const totalTollExp = completed.reduce((acc, t) => acc + t.tollExpense, 0);
  const totalRepairExp = completed.reduce((acc, t) => acc + t.repairExpense, 0);
  const totalAdblueExp = completed.reduce((acc, t) => acc + t.adblueExpense, 0);
  const totalOtherExp = completed.reduce((acc, t) => acc + t.otherExpense, 0);

  const totalTripExpenses = totalFuelExp + totalDriverExp + totalTollExp + totalRepairExp + totalAdblueExp + totalOtherExp;
  const netProfit = totalRevenue - totalTripExpenses;

  // Adblue aggregates
  const totalAdblueAddedLiters = completed.reduce((acc, t) => acc + t.adblueAddedLiters, 0);
  const totalAdblueExpectedLiters = completed.reduce((acc, t) => acc + t.expectedAdblueLiters, 0);

  // CSV Export helper for Business Reports
  const exportBusinessReport = () => {
    let rows = [
      ['Report Header', 'Business Summary FY 2026-27'],
      ['Total Completed Deliveries', completed.length],
      ['Total Invoiced Revenue (INR)', `Rs. ${totalRevenue}`],
      ['Total Freight Expenses (INR)', `Rs. ${totalTripExpenses}`],
      ['Fuel Diesel Expense (INR)', `Rs. ${totalFuelExp}`],
      ['Driver Remittances (INR)', `Rs. ${totalDriverExp}`],
      ['State Toll Charge (INR)', `Rs. ${totalTollExp}`],
      ['Repair maintenance (INR)', `Rs. ${totalRepairExp}`],
      ['AdBlue Catalyst Expense (INR)', `Rs. ${totalAdblueExp}`],
      ['Other Incidentals Expense (INR)', `Rs. ${totalOtherExp}`],
      ['Net Fiscal Profit (INR)', `Rs. ${netProfit}`],
      ['AdBlue Expected Volume Required (L)', `${totalAdblueExpectedLiters} L`],
      ['AdBlue Actual Added Volume (L)', `${totalAdblueAddedLiters} L`],
      [],
      ['Trip Route Wise Ledger Details'],
      ['Trip ID', 'LR Number', 'Tanker Plate', 'Driver Name', 'Cargo Product', 'Unloaded Qty', 'Net Fuel Average (KM/L)', 'Net Freight Revenue (INR)', 'Total Expenses (INR)', 'Profit/Loss (INR)']
    ];

    completed.forEach(t => {
      const associatedLr = lrs.find(l => l.id === t.lrId);
      const tripExp = t.fuelExpense + t.driverCharge + t.tollExpense + t.repairExpense + t.adblueExpense + t.otherExpense;
      const profit = (t.revenue || 0) - tripExp;

      rows.push([
        t.id,
        t.lrNo,
        t.tankerNumber,
        t.driverName,
        associatedLr?.product || 'Petrochemicals',
        `${t.unloadingWeight || t.loadingWeight} ${t.qtyUnit}`,
        '5.0', // standard ending fuel average
        t.revenue || 0,
        tripExp,
        profit
      ]);
    });

    const csvContent = "data:text/csv;charset=utf-8," 
      + rows.map(e => e.map(val => `"${String(val).replace(/"/g, '""')}"`).join(",")).join("\n");
      
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `FleetMaster_Business_Maintenance_Report_FY26-27.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 py-6 selection:bg-[#ff5a5f] selection:text-white">
      {/* Upper header */}
      <div className="border-b border-[#30363d] pb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Business & Maintenance Reports</h2>
          <p className="text-xs text-[#8b949e] font-mono mt-1">FLEET BUSINESS PROFIT MARGINS, ADBLUE COMPLIANCES & AUDIT METRICS</p>
        </div>

        <div className="flex gap-2">
          <button 
            onClick={exportBusinessReport}
            className="px-4 py-2.5 bg-[#21262d] hover:bg-[#30363d] text-emerald-400 border border-[#30363d] rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 transition-all cursor-pointer font-sans"
            title="Download full business log in Excel CSV format"
          >
            <Download className="w-4 h-4 text-emerald-400" />
            Excel Export
          </button>
          <button 
            onClick={() => {
              const reportData = completed.map(t => {
                const associatedLr = lrs.find(l => l.id === t.lrId);
                const tripExp = t.fuelExpense + t.driverCharge + t.tollExpense + t.repairExpense + t.adblueExpense + t.otherExpense;
                const profit = (t.revenue || 0) - tripExp;
                return {
                  id: t.id,
                  lrNo: t.lrNo,
                  tanker: t.tankerNumber,
                  driver: t.driverName,
                  product: associatedLr?.product || 'Petrochemicals',
                  qty: `${t.unloadingWeight || t.loadingWeight} ${t.qtyUnit}`,
                  revenue: `Rs. ${t.revenue || 0}`,
                  expenses: `Rs. ${tripExp}`,
                  profit: `Rs. ${profit}`
                };
              });
              const headers = ['Trip ID', 'LR No.', 'Tanker', 'Driver Name', 'Cargo Product', 'Unloaded Qty', 'Revenue', 'Expenses', 'Net Profit'];
              const keys = ['id', 'lrNo', 'tanker', 'driver', 'product', 'qty', 'revenue', 'expenses', 'profit'];
              exportToPDF('Business & Profit Analytics Summary', headers, keys, reportData, 'Business_Performance_Report.pdf', 'F05 Master Logistical Business Profit Margins & Compliancy');
            }}
            className="px-4 py-2.5 bg-[#21262d] hover:bg-[#30363d] text-red-400 border border-[#30363d] rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 transition-all cursor-pointer font-sans"
            title="Download PDF report of business analytics and profit margins"
          >
            <Download className="w-4 h-4 text-red-500" />
            PDF Export
          </button>
        </div>
      </div>

      {/* Aggregate metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Profit Card */}
        <div className="bg-[#161b22] border border-emerald-500/20 rounded-2xl p-6 space-y-2">
          <span className="text-[10px] font-mono uppercase tracking-widest text-[#8b949e]">Net Fleet Earnings</span>
          <div className="text-3xl font-black text-emerald-400">
            ₹{netProfit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <p className="text-xs text-[#8b949e] font-mono">Based on {completed.length} successfully delivered tankers.</p>
        </div>

        {/* Adblue tracker */}
        <div className="bg-[#161b22] border border-blue-500/20 rounded-2xl p-6 space-y-2">
          <span className="text-[10px] font-mono uppercase tracking-widest text-[#8b949e]">AdBlue Catalyst Balance</span>
          <div className="text-3xl font-black text-blue-400">
            {totalAdblueAddedLiters} Liters
          </div>
          <p className="text-xs text-[#8b949e] font-mono">
            System estimates: {totalAdblueExpectedLiters} Liters required based on route limits.
          </p>
        </div>

        {/* Efficiency index */}
        <div className="bg-[#161b22] border border-purple-500/20 rounded-2xl p-6 space-y-2">
          <span className="text-[10px] font-mono uppercase tracking-widest text-[#8b949e]">Fuel Average Compliance</span>
          <div className="text-3xl font-black text-yellow-400">
            5.0 KM/L
          </div>
          <p className="text-xs text-[#8b949e] font-mono">Adjusted ending routing standard for general tanker classes.</p>
        </div>

      </div>

      {/* Expense Split grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left: split details */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-[#161b22] border border-[#30363d] rounded-2xl p-6 space-y-4">
            <h3 className="text-base font-bold text-white mb-2">Freight Expense Breakdown</h3>

            <div className="space-y-3 text-xs font-mono text-[#8b949e]">
              <div className="flex justify-between items-center bg-[#0d1117] p-3 rounded-lg">
                <span>Diesel (Fuel Expenses)</span>
                <span className="text-white font-bold">₹{totalFuelExp.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center bg-[#0d1117] p-3 rounded-lg">
                <span>Driver Remittances</span>
                <span className="text-white font-bold">₹{totalDriverExp.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center bg-[#0d1117] p-3 rounded-lg">
                <span>State Toll Tax</span>
                <span className="text-white font-bold">₹{totalTollExp.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center bg-[#0d1117] p-3 rounded-lg">
                <span>Spare & Repair Charges</span>
                <span className="text-white font-bold">₹{totalRepairExp.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center bg-[#0d1117] p-3 rounded-lg text-blue-400 font-bold border border-blue-500/10">
                <span>AdBlue Catalyst Refills</span>
                <span className="text-[#58a6ff] font-bold">₹{totalAdblueExp.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center bg-[#0d1117] p-3 rounded-lg">
                <span>Other Logistics Incidentals</span>
                <span className="text-white font-bold">₹{totalOtherExp.toLocaleString()}</span>
              </div>
              <div className="h-px bg-[#21262d]" />
              <div className="flex justify-between items-center p-1 text-sm text-white font-bold font-sans">
                <span>Aggregate Running Cost:</span>
                <span className="text-[#ff5a5f] font-black">₹{totalTripExpenses.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right: historical list of completed routes */}
        <div className="lg:col-span-8 space-y-6">
          <div className="bg-[#161b22] border border-[#30363d] p-6 rounded-2xl">
            <h3 className="text-base font-bold text-white mb-4">Chronological Completed Trip Ledger</h3>

            <div className="space-y-3.5">
              {completed.map((trip) => {
                const associatedLr = lrs.find(l => l.id === trip.lrId);
                const tripCost = trip.fuelExpense + trip.driverCharge + trip.tollExpense + trip.repairExpense + trip.adblueExpense + trip.otherExpense;
                const profitVal = (trip.revenue || 0) - tripCost;

                return (
                  <div key={trip.id} className="p-4 bg-[#0d1117] border border-[#30363d] rounded-xl text-xs space-y-2.5">
                    <div className="flex justify-between items-center border-b border-[#21262d] pb-2 text-[10px] font-mono text-[#8b949e]">
                      <span>ID: {trip.id} | LR: {trip.lrNo}</span>
                      <span>Delivered Date: {trip.endDate}</span>
                    </div>

                    <div className="flex flex-wrap justify-between gap-3 font-sans">
                      <div>
                        <div className="text-sm font-black text-white">{trip.tankerNumber}</div>
                        <div className="text-[11px] text-[#8b949e] mt-0.5">{trip.placeFrom} ➔ {trip.placeTo}</div>
                      </div>
                      <div className="text-right">
                        <div className={`text-base font-black ${profitVal >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                          ₹{profitVal.toLocaleString()} Net
                        </div>
                        <div className="text-[10px] text-[#8b949e] mt-0.5">Billed weight: {trip.unloadingWeight} / {trip.loadingWeight} {trip.qtyUnit}</div>
                      </div>
                    </div>

                    <div className="pt-2 font-mono flex flex-wrap justify-between items-center gap-3 text-[10px] text-[#8b949e] border-t border-[#21262d]/60">
                      <div>Cargo Class: <span className="text-white font-semibold">{associatedLr?.product || 'Hazardous Fluid'}</span></div>
                      <div>AdBlue catalyst: <span className="text-blue-400 font-bold">{trip.adblueAddedLiters} L added</span> (estimated: {trip.expectedAdblueLiters} L)</div>
                    </div>
                  </div>
                );
              })}

              {completed.length === 0 && (
                <p className="text-xs text-[#8b949e] italic py-10 text-center">No ended petrochemical routes cataloged currently.</p>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
