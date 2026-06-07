import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  User, Shield, Phone, CreditCard, Award, X, Key, HelpCircle, CheckCircle2,
  Download, UserPlus, Edit, Eye, Lock
} from 'lucide-react';
import { exportToExcel, exportToPDF } from '../utils/exportUtils';
import { Driver } from '../types';

interface DriversProps {
  drivers: Driver[];
  onDeleteDriver?: (id: string) => void;
  onAddDriver?: (driver: Driver) => void;
  onUpdateDriver?: (driver: Driver) => void;
  autoOpenRegister?: boolean;
  onCloseAutoOpen?: () => void;
}

export default function Drivers({ 
  drivers, 
  onDeleteDriver,
  onAddDriver,
  onUpdateDriver,
  autoOpenRegister,
  onCloseAutoOpen
}: DriversProps) {
  const [selectedDriverId, setSelectedDriverId] = useState<string | null>(drivers[0]?.id || null);

  // Auto-select first driver if selectedId is not active anymore/or empty
  const activeDriver = drivers.find(d => d.id === selectedDriverId) || drivers[0];

  // Add modal state
  const [showAddModal, setShowAddModal] = useState(false);
  // Edit modal state
  const [showEditModal, setShowEditModal] = useState(false);

  // Add form fields
  const [addName, setAddName] = useState('');
  const [addContact, setAddContact] = useState('');
  const [addLoginPhone, setAddLoginPhone] = useState('');
  const [addUsername, setAddUsername] = useState('');
  const [addPassword, setAddPassword] = useState('123456');
  const [addLicense, setAddLicense] = useState('');
  const [addBankName, setAddBankName] = useState('');
  const [addBankAcc, setAddBankAcc] = useState('');
  const [addIfsc, setAddIfsc] = useState('');

  // Edit form fields
  const [editName, setEditName] = useState('');
  const [editContact, setEditContact] = useState('');
  const [editLoginPhone, setEditLoginPhone] = useState('');
  const [editUsername, setEditUsername] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [editLicense, setEditLicense] = useState('');
  const [editBankName, setEditBankName] = useState('');
  const [editBankAcc, setEditBankAcc] = useState('');
  const [editIfsc, setEditIfsc] = useState('');

  // Handle shortcut automatic opening from navigation panel
  useEffect(() => {
    if (autoOpenRegister) {
      setShowAddModal(true);
      if (onCloseAutoOpen) {
        onCloseAutoOpen();
      }
    }
  }, [autoOpenRegister, onCloseAutoOpen]);

  // Open Edit Modal with active driver data prefilled
  const openEditModal = () => {
    if (!activeDriver) return;
    setEditName(activeDriver.name || '');
    setEditContact(activeDriver.contactNumber || '');
    setEditLoginPhone(activeDriver.loginPhoneNumber || '');
    setEditUsername(activeDriver.username || '');
    setEditPassword(activeDriver.password || '123456');
    setEditLicense(activeDriver.licenseNumber || '');
    setEditBankName(activeDriver.bankName || '');
    setEditBankAcc(activeDriver.bankAccountNumber || '');
    setEditIfsc(activeDriver.ifscCode || '');
    setShowEditModal(true);
  };

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!addName || !addContact) {
      alert("Name and emergency contact are required.");
      return;
    }

    const newDrv: Driver = {
      id: `DRV-${Math.floor(100 + Math.random() * 900)}`,
      name: addName.trim(),
      contactNumber: addContact.trim(),
      loginPhoneNumber: addLoginPhone ? addLoginPhone.trim() : undefined,
      username: addUsername ? addUsername.trim() : undefined,
      password: addPassword || '123456',
      licenseNumber: addLicense.trim(),
      bankName: addBankName.trim(),
      bankAccountNumber: addBankAcc.trim(),
      ifscCode: addIfsc.trim().toUpperCase(),
      status: 'idle'
    };

    if (onAddDriver) {
      onAddDriver(newDrv);
    }
    setSelectedDriverId(newDrv.id);
    setShowAddModal(false);

    // Reset fields
    setAddName('');
    setAddContact('');
    setAddLoginPhone('');
    setAddUsername('');
    setAddPassword('123456');
    setAddLicense('');
    setAddBankName('');
    setAddBankAcc('');
    setAddIfsc('');
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeDriver) return;
    if (!editName || !editContact) {
      alert("Name and emergency contact are required.");
      return;
    }

    const updatedDrv: Driver = {
      ...activeDriver,
      name: editName.trim(),
      contactNumber: editContact.trim(),
      loginPhoneNumber: editLoginPhone ? editLoginPhone.trim() : undefined,
      username: editUsername ? editUsername.trim() : undefined,
      password: editPassword || '123456',
      licenseNumber: editLicense.trim(),
      bankName: editBankName.trim(),
      bankAccountNumber: editBankAcc.trim(),
      ifscCode: editIfsc.trim().toUpperCase()
    };

    if (onUpdateDriver) {
      onUpdateDriver(updatedDrv);
    }
    setShowEditModal(false);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 py-6 selection:bg-[#ff5a5f] selection:text-white">
      {/* Upper header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#30363d] pb-6">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Active Driver Operations</h2>
          <p className="text-xs text-[#8b949e] font-mono mt-1">REMUNERATIVE BANK DETAILS, HAZARDOUS CARGO DRIVING CREDENTIALS & COMPLIANCE</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setShowAddModal(true)}
            className="px-3.5 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-lg text-xs font-bold inline-flex items-center gap-1.5 transition-all cursor-pointer font-sans"
          >
            <UserPlus className="w-3.5 h-3.5" />
            Onboard New Pilot
          </button>
          <button
            onClick={() => {
              const driversData = drivers.map(d => ({
                id: d.id,
                name: d.name,
                contactNumber: d.contactNumber,
                bankName: d.bankName,
                bankAccountNumber: d.bankAccountNumber,
                ifscCode: d.ifscCode,
                licenseNumber: d.licenseNumber,
                status: d.status.toUpperCase()
              }));
              const headers = ['Driver ID', 'Driver Name', 'Contact Number', 'Bank Name', 'Bank Account Number', 'IFSC Code', 'License Number', 'Current Status'];
              const keys = ['id', 'name', 'contactNumber', 'bankName', 'bankAccountNumber', 'ifscCode', 'licenseNumber', 'status'];
              exportToExcel('Driver Files & Compliance Accounts', headers, keys, driversData, 'Driver_Registry_Report.csv');
            }}
            className="px-3 py-2 bg-[#21262d] hover:bg-[#30363d] border border-[#30363d] hover:border-emerald-500/30 text-emerald-400 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 transition-all cursor-pointer font-sans"
          >
            <Download className="w-3.5 h-3.5" />
            Excel Export
          </button>
          <button
            onClick={() => {
              const driversData = drivers.map(d => ({
                id: d.id,
                name: d.name,
                contactNumber: d.contactNumber,
                bankName: d.bankName,
                bankAccountNumber: d.bankAccountNumber,
                ifscCode: d.ifscCode,
                licenseNumber: d.licenseNumber,
                status: d.status.toUpperCase()
              }));
              const headers = ['Driver ID', 'Name', 'Contact', 'Bank', 'Account Number', 'IFSC', 'License No', 'Status'];
              const keys = ['id', 'name', 'contactNumber', 'bankName', 'bankAccountNumber', 'ifscCode', 'licenseNumber', 'status'];
              exportToPDF('Driver Files & Compliance Accounts', headers, keys, driversData, 'Driver_Registry_Report.pdf', 'F03 Petrochem Logistics Driving Personnel Records');
            }}
            className="px-3 py-2 bg-[#21262d] hover:bg-[#30363d] border border-[#30363d] hover:border-red-500/30 text-red-400 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 transition-all cursor-pointer font-sans"
          >
            <Download className="w-3.5 h-3.5" />
            PDF Export
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left List of Drivers */}
        <div className="lg:col-span-4 space-y-2.5">
          {drivers.length === 0 ? (
            <div className="p-8 border border-[#30363d] rounded-xl text-center text-[#8b949e] font-mono text-xs bg-[#161b22]">
              No drivers saved. Add driver above.
            </div>
          ) : (
            drivers.map((drv) => {
              const isActive = activeDriver?.id === drv.id;
              return (
                <div 
                  key={drv.id}
                  onClick={() => setSelectedDriverId(drv.id)}
                  className={`p-4 rounded-xl border cursor-pointer flex items-center justify-between ${
                    isActive 
                      ? 'bg-gradient-to-r from-[#1b1f27] to-[#161b22] border-blue-500 shadow' 
                      : 'bg-[#161b22] border-[#30363d] hover:bg-[#21262d] card-tilt-3d'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-500/10 text-blue-400 flex items-center justify-center font-bold">
                      {drv.name?.[0] || 'D'}
                    </div>
                    <div>
                      <span className="block text-[10px] text-[#8b949e] font-mono tracking-wide uppercase">ID: {drv.id}</span>
                      <span className="font-bold text-white tracking-tight text-sm block">{drv.name}</span>
                    </div>
                  </div>
                  <div>
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold font-mono tracking-wide ${
                      drv.status === 'active' 
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                        : 'bg-[#21262d] text-[#8b949e] border border-[#30363d]'
                    }`}>
                      {(drv.status || 'idle').toUpperCase()}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Right driver detail pane */}
        <div className="lg:col-span-8">
          {activeDriver ? (
            <div className="bg-[#161b22] border border-[#30363d] rounded-2xl p-6 space-y-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-full bg-blue-500/5 rounded-bl-[100px] blur-3xl pointer-events-none" />

              {/* Bio block */}
              <div className="flex items-start justify-between border-b border-[#30363d] pb-5">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center text-2xl font-black">
                    {activeDriver.name?.[0] || 'D'}
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white tracking-tight">{activeDriver.name}</h3>
                    <div className="flex flex-wrap gap-2 items-center mt-1 text-[#8b949e] text-xs font-mono">
                      <span>D.O.L Registration: Registered Transporter Cargo</span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={openEditModal}
                    className="px-3 py-1.5 bg-[#21262d] border border-[#30363d] hover:border-blue-500/50 text-[#8b949e] hover:text-white rounded-xl text-xs font-bold transition-all cursor-pointer font-mono inline-flex items-center gap-1"
                    title="Edit Driver Contact / Bank records"
                  >
                    <Edit className="w-3.5 h-3.5 text-blue-400" />
                    Edit Details
                  </button>
                  {onDeleteDriver && (
                    <button
                      onClick={() => onDeleteDriver(activeDriver.id)}
                      className="px-3 py-1.5 bg-rose-500/10 border border-rose-500/20 hover:bg-rose-500 text-rose-400 hover:text-white rounded-xl text-xs font-bold transition-all cursor-pointer font-mono"
                      title="Move Driver to System Trash"
                    >
                      Delete Driver
                    </button>
                  )}
                </div>
              </div>

              {/* Contact and Statutory cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Mobile / Dial contact */}
                <div className="p-4 bg-[#0d1117] border border-[#30363d] rounded-xl text-xs space-y-2 card-tilt-3d">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-[#8b949e] flex items-center gap-1.5 font-bold">
                    <Phone className="w-4 h-4 text-blue-400" />
                    Operational Contact
                  </span>
                  <div className="text-base text-white font-extrabold tracking-wide pt-1">{activeDriver.contactNumber}</div>
                  <p className="text-[10px] text-[#8b949e]">Primary contact for en-route instructions.</p>
                </div>

                {/* Driving License Credentials */}
                <div className="p-4 bg-[#0d1117] border border-[#30363d] rounded-xl text-xs space-y-2 card-tilt-3d">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-[#8b949e] flex items-center gap-1.5 font-bold">
                    <Award className="w-4 h-4 text-emerald-400" />
                    Hazardous Materials License
                  </span>
                  <div className="text-sm text-white font-extrabold font-mono pt-1">{activeDriver.licenseNumber || 'N/A'}</div>
                  <p className="text-[10px] text-[#8b949e]">Validated certificate for petro-chemical tanker dispatch.</p>
                </div>

              </div>

              {/* Driver Login credentials summary */}
              <div className="bg-[#1b2230]/40 border border-[#30363d] rounded-xl p-5 space-y-4 font-sans">
                <span className="text-xs font-mono uppercase tracking-wider text-orange-400 flex items-center gap-2 border-b border-[#21262d] pb-2.5 font-bold">
                  <Key className="w-4 h-4 text-orange-400" />
                  Pilot App Login Portal Credentials
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-xs">
                  <div>
                    <span className="text-[#8b949e] block font-mono text-[10px] uppercase">Login Username</span>
                    <span className="font-extrabold text-white mt-1 block select-all font-mono text-xs">
                      {activeDriver.username || 'Not set'}
                    </span>
                    <span className="text-[9px] text-blue-400 mt-1 block font-mono">Custom Handle</span>
                  </div>
                  <div>
                    <span className="text-[#8b949e] block font-mono text-[10px] uppercase">Login Phone</span>
                    <span className="font-extrabold text-white mt-1 block select-all font-mono text-xs">
                      {activeDriver.loginPhoneNumber || 'Not set'}
                    </span>
                    <span className="text-[9px] text-teal-400 mt-1 block font-mono">Custom login mobile</span>
                  </div>
                  <div>
                    <span className="text-[#8b949e] block font-mono text-[10px] uppercase">Passcode</span>
                    <span className="font-bold text-emerald-400 font-mono mt-1 block select-all text-sm">
                      {activeDriver.password || '123456'}
                    </span>
                    <span className="text-[9px] text-gray-500 mt-1 block font-mono">App Passcode</span>
                  </div>
                  <div>
                    <span className="text-[#8b949e] block font-mono text-[10px] uppercase">Login Identifiers</span>
                    <div className="space-y-0.5 mt-1 font-mono text-[10.5px]">
                      <span className="text-[#8b949e] block">Primary Contact: <span className="text-white font-bold">{activeDriver.contactNumber}</span></span>
                      <span className="text-[#8b949e] block">Driver ID: <span className="text-white font-bold">{activeDriver.id}</span></span>
                    </div>
                  </div>
                </div>

                <div className="py-2.5 px-3 bg-[#0d1117] rounded-xl border border-[#21262d] text-[10.5px] leading-relaxed text-[#8b949e]">
                  💡 <strong>Driver Sign-in:</strong> In the <strong className="text-white">Driver Login</strong> portal, the operator can sign in using either their <strong className="text-white">Custom Username</strong>, custom <strong className="text-white">Login Phone</strong>, primary contact mobile, or driver ID, together with their secure passcode.
                </div>
              </div>

              {/* Bank Remittances (Core Account) */}
              <div className="bg-[#0d1117] border border-[#30363d] rounded-xl p-5 space-y-4 card-tilt-3d">
                <span className="text-xs font-mono uppercase tracking-wider text-white flex items-center gap-2 border-b border-[#21262d] pb-2.5">
                  <CreditCard className="w-4 h-4 text-orange-400" />
                  Trips Remittance Account Details
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                  <div>
                    <span className="text-[#8b949e] block font-mono text-[10px] uppercase">Bank Name</span>
                    <span className="font-semibold text-white mt-1 block">{activeDriver.bankName || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-[#8b949e] block font-mono text-[10px] uppercase">IFSC Code</span>
                    <span className="font-bold text-white font-mono mt-1 block uppercase">{activeDriver.ifscCode || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-[#8b949e] block font-mono text-[10px] uppercase">Account Number</span>
                    <span className="font-bold text-teal-400 font-mono mt-1 block select-all">{activeDriver.bankAccountNumber || 'N/A'}</span>
                  </div>
                </div>
              </div>

              {/* Document Attachments Panel */}
              <div className="space-y-2.5">
                <h4 className="text-xs font-mono uppercase text-[#8b949e] tracking-wider font-bold">Attached RTO Physical Log Copies</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-3 bg-[#0d1117] border border-[#30363d] rounded-xl flex items-center justify-between">
                    <div>
                      <span className="font-semibold text-white block">RTO License Copy</span>
                      <span className="text-[10px] text-[#8b949e] mt-0.5 block">{activeDriver.licenseDoc || 'license_pdf_scanned_rto.jpg'}</span>
                    </div>
                    <div>
                      <span className="px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded text-[9px] font-mono">
                        Secured
                      </span>
                    </div>
                  </div>

                  <div className="p-3 bg-[#0d1117] border border-[#30363d] rounded-xl flex items-center justify-between">
                    <div>
                      <span className="font-semibold text-white block">Aadhar & Hazmat Training Cert</span>
                      <span className="text-[10px] text-[#8b949e] mt-0.5 block">training_hazmat_cert_signed.pdf</span>
                    </div>
                    <div>
                      <span className="px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded text-[9px] font-mono">
                        Secured
                      </span>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          ) : (
            <div className="text-center py-20 text-[#8b949e] italic bg-[#161b22] border border-[#30363d] rounded-2xl font-mono text-xs">
              No active pilot selected. Complete registration to view driver profile file.
            </div>
          )}
        </div>

      </div>

      {/* Onboard New Pilot Modal */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#161b22] border border-[#30363d] rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl my-8"
            >
              <div className="p-6 border-b border-[#30363d] flex items-center justify-between bg-[#1c212b]">
                <h3 className="text-white font-extrabold text-base flex items-center gap-2">
                  <UserPlus className="w-5 h-5 text-blue-400" />
                  Onboard New Pilot
                </h3>
                <button 
                  onClick={() => setShowAddModal(false)}
                  className="p-1.5 hover:bg-[#21262d] rounded-xl text-[#8b949e] hover:text-white transition-all cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleAddSubmit} className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-mono text-[#8b949e] uppercase mb-1.5">Driver Full Name *</label>
                    <input 
                      type="text" 
                      placeholder="e.g. Ramesh Kumar"
                      required
                      value={addName}
                      onChange={(e) => setAddName(e.target.value)}
                      className="w-full px-4 py-2.5 bg-[#0d1117] border border-[#30363d] rounded-xl text-white outline-none focus:border-blue-500 text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-mono text-[#8b949e] uppercase mb-1.5">Emergency Contact Mobile *</label>
                    <input 
                      type="text" 
                      placeholder="e.g. 98765 43210"
                      required
                      value={addContact}
                      onChange={(e) => setAddContact(e.target.value)}
                      className="w-full px-4 py-2.5 bg-[#0d1117] border border-[#30363d] rounded-xl text-white outline-none focus:border-blue-500 text-xs font-mono"
                    />
                  </div>
                </div>

                <div className="p-4 bg-[#1b2230]/30 border border-[#30363d] rounded-xl grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-xs font-mono text-[#8b949e] uppercase">Login Username</label>
                      <span className="text-[9px] text-blue-400 font-mono">Optional</span>
                    </div>
                    <input 
                      type="text" 
                      placeholder="e.g. ramesh_petro"
                      value={addUsername}
                      onChange={(e) => setAddUsername(e.target.value)}
                      className="w-full px-4 py-2.5 bg-[#0d1117] border border-[#30363d] rounded-xl text-white outline-none focus:border-blue-500 text-xs font-mono"
                    />
                    <p className="text-[9px] text-[#8b949e] mt-1">Unique username wrapper.</p>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-xs font-mono text-[#8b949e] uppercase">Login Phone</label>
                      <span className="text-[9px] text-teal-400 font-mono">Optional</span>
                    </div>
                    <input 
                      type="text" 
                      placeholder="e.g. 9414012345"
                      value={addLoginPhone}
                      onChange={(e) => setAddLoginPhone(e.target.value)}
                      className="w-full px-4 py-2.5 bg-[#0d1117] border border-[#30363d] rounded-xl text-white outline-none focus:border-blue-500 text-xs font-mono"
                    />
                    <p className="text-[9px] text-[#8b949e] mt-1">Dedicated mobile identifier.</p>
                  </div>
                  <div>
                    <label className="block text-xs font-mono text-[#8b949e] uppercase mb-1.5">Access Passcode</label>
                    <input 
                      type="password" 
                      placeholder="e.g. 123456"
                      value={addPassword}
                      onChange={(e) => setAddPassword(e.target.value)}
                      className="w-full px-4 py-2.5 bg-[#0d1117] border border-[#30363d] rounded-xl text-white outline-none focus:border-blue-500 text-xs font-mono"
                    />
                    <p className="text-[9px] text-[#8b949e] mt-1">Password (Defaults to 123456).</p>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-mono text-[#8b949e] uppercase mb-1.5">Hazardous Materials License No</label>
                  <input 
                    type="text" 
                    placeholder="e.g. IN-RJ14-2024-8891-HZ"
                    value={addLicense}
                    onChange={(e) => setAddLicense(e.target.value)}
                    className="w-full px-4 py-2.5 bg-[#0d1117] border border-[#30363d] rounded-xl text-white outline-none focus:border-blue-500 text-xs font-mono"
                  />
                  <p className="text-[9px] text-[#8b949e] mt-1">State transport cargo certificate number.</p>
                </div>

                <div className="border-t border-[#30363d] pt-4 space-y-4">
                  <h4 className="text-xs font-extrabold text-white font-mono uppercase flex items-center gap-2 text-indigo-400">
                    <CreditCard className="w-4 h-4" />
                    Trip Remittances Bank Account (Confidential)
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-mono text-[#8b949e] uppercase mb-1.5">Bank Name</label>
                      <input 
                        type="text" 
                        placeholder="State Bank of India"
                        value={addBankName}
                        onChange={(e) => setAddBankName(e.target.value)}
                        className="w-full px-4 py-2.5 bg-[#0d1117] border border-[#30363d] rounded-xl text-white outline-none focus:border-blue-500 text-xs font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-mono text-[#8b949e] uppercase mb-1.5">Account Number</label>
                      <input 
                        type="text" 
                        placeholder="310245690184"
                        value={addBankAcc}
                        onChange={(e) => setAddBankAcc(e.target.value)}
                        className="w-full px-4 py-2.5 bg-[#0d1117] border border-[#30363d] rounded-xl text-white outline-none focus:border-blue-500 text-xs font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-mono text-[#8b949e] uppercase mb-1.5">IFSC Code</label>
                      <input 
                        type="text" 
                        placeholder="SBIN0001235"
                        value={addIfsc}
                        onChange={(e) => setAddIfsc(e.target.value)}
                        className="w-full px-4 py-2.5 bg-[#0d1117] border border-[#30363d] rounded-xl text-white outline-none focus:border-blue-500 text-xs font-mono uppercase"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-6 border-t border-[#30363d]">
                  <button 
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="px-4 py-2.5 bg-[#21262d] border border-[#30363d] hover:bg-[#30363d] text-gray-300 rounded-xl text-xs font-semibold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-blue-500/10 cursor-pointer"
                  >
                    Complete Pilot Registration
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit Driver Credentials Modal */}
      <AnimatePresence>
        {showEditModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#161b22] border border-[#30363d] rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl my-8 animate-fade-in"
            >
              <div className="p-6 border-b border-[#30363d] flex items-center justify-between bg-[#11141c]">
                <h3 className="text-white font-extrabold text-base flex items-center gap-2">
                  <Edit className="w-5 h-5 text-blue-400" />
                  Edit Pilot Record: {activeDriver?.name}
                </h3>
                <button 
                  onClick={() => setShowEditModal(false)}
                  className="p-1.5 hover:bg-[#21262d] rounded-xl text-[#8b949e] hover:text-white transition-all cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleEditSubmit} className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-mono text-[#8b949e] uppercase mb-1.5">Driver Full Name *</label>
                    <input 
                      type="text" 
                      placeholder="e.g. Ramesh Kumar"
                      required
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="w-full px-4 py-2.5 bg-[#0d1117] border border-[#30363d] rounded-xl text-white outline-none focus:border-blue-500 text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-mono text-[#8b949e] uppercase mb-1.5">Emergency Contact Mobile *</label>
                    <input 
                      type="text" 
                      placeholder="e.g. 98765 43210"
                      required
                      value={editContact}
                      onChange={(e) => setEditContact(e.target.value)}
                      className="w-full px-4 py-2.5 bg-[#0d1117] border border-[#30363d] rounded-xl text-white outline-none focus:border-blue-500 text-xs font-mono"
                    />
                  </div>
                </div>

                <div className="p-4 bg-[#1b2230]/30 border border-[#30363d] rounded-xl grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-xs font-mono text-[#8b949e] uppercase">Login Username</label>
                      <span className="text-[9px] text-blue-400 font-mono">Optional</span>
                    </div>
                    <input 
                      type="text" 
                      placeholder="e.g. ramesh_petro"
                      value={editUsername}
                      onChange={(e) => setEditUsername(e.target.value)}
                      className="w-full px-4 py-2.5 bg-[#0d1117] border border-[#30363d] rounded-xl text-white outline-none focus:border-blue-500 text-xs font-mono"
                    />
                    <p className="text-[9px] text-[#8b949e] mt-1">Custom sign-in handle.</p>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-xs font-mono text-[#8b949e] uppercase">Login Phone</label>
                      <span className="text-[9px] text-teal-400 font-mono">Optional</span>
                    </div>
                    <input 
                      type="text" 
                      placeholder="e.g. 9414012345"
                      value={editLoginPhone}
                      onChange={(e) => setEditLoginPhone(e.target.value)}
                      className="w-full px-4 py-2.5 bg-[#0d1117] border border-[#30363d] rounded-xl text-white outline-none focus:border-blue-500 text-xs font-mono"
                    />
                    <p className="text-[9px] text-[#8b949e] mt-1">Dedicated mobile identifier.</p>
                  </div>
                  <div>
                    <label className="block text-xs font-mono text-[#8b949e] uppercase mb-1.5">Access Passcode *</label>
                    <input 
                      type="password" 
                      placeholder="e.g. 123456"
                      required
                      value={editPassword}
                      onChange={(e) => setEditPassword(e.target.value)}
                      className="w-full px-4 py-2.5 bg-[#0d1117] border border-[#30363d] rounded-xl text-white outline-none focus:border-blue-500 text-xs font-mono"
                    />
                    <p className="text-[9px] text-[#8b949e] mt-1">Operator password.</p>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-mono text-[#8b949e] uppercase mb-1.5">Hazardous Materials License No</label>
                  <input 
                    type="text" 
                    placeholder="e.g. IN-RJ14-2024-8891-HZ"
                    value={editLicense}
                    onChange={(e) => setEditLicense(e.target.value)}
                    className="w-full px-4 py-2.5 bg-[#0d1117] border border-[#30363d] rounded-xl text-white outline-none focus:border-blue-500 text-xs font-mono"
                  />
                </div>

                <div className="border-t border-[#30363d] pt-4 space-y-4">
                  <h4 className="text-xs font-extrabold text-white font-mono uppercase flex items-center gap-2 text-indigo-400">
                    <CreditCard className="w-4 h-4" />
                    Trip Remittances Bank Account
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-mono text-[#8b949e] uppercase mb-1.5">Bank Name</label>
                      <input 
                        type="text" 
                        placeholder="State Bank of India"
                        value={editBankName}
                        onChange={(e) => setEditBankName(e.target.value)}
                        className="w-full px-4 py-2.5 bg-[#0d1117] border border-[#30363d] rounded-xl text-white outline-none focus:border-blue-500 text-xs font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-mono text-[#8b949e] uppercase mb-1.5">Account Number</label>
                      <input 
                        type="text" 
                        placeholder="310245690184"
                        value={editBankAcc}
                        onChange={(e) => setEditBankAcc(e.target.value)}
                        className="w-full px-4 py-2.5 bg-[#0d1117] border border-[#30363d] rounded-xl text-white outline-none focus:border-blue-500 text-xs font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-mono text-[#8b949e] uppercase mb-1.5">IFSC Code</label>
                      <input 
                        type="text" 
                        placeholder="SBIN0001235"
                        value={editIfsc}
                        onChange={(e) => setEditIfsc(e.target.value)}
                        className="w-full px-4 py-2.5 bg-[#0d1117] border border-[#30363d] rounded-xl text-white outline-none focus:border-blue-500 text-xs font-mono uppercase"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-6 border-t border-[#30363d]">
                  <button 
                    type="button"
                    onClick={() => setShowEditModal(false)}
                    className="px-4 py-2.5 bg-[#21262d] border border-[#30363d] hover:bg-[#30363d] text-gray-300 rounded-xl text-xs font-semibold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-emerald-500/10 cursor-pointer"
                  >
                    Update Profile File
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
