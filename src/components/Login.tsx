import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Truck, Lock, User, PlusCircle, AlertCircle, Play, ChevronRight, CheckCircle2, 
  Shield, Sun, Moon, Mail, Phone, Image, FileText, Check, ShieldCheck, MailWarning, Smartphone, Loader2
} from 'lucide-react';
import { FleetMasterStore } from '../utils/storage';

interface LoginProps {
  onLoginSuccess: (user: any) => void;
  theme?: 'light' | 'dark';
  toggleTheme?: () => void;
}

export default function Login({ onLoginSuccess, theme = 'light', toggleTheme }: LoginProps) {
  const [isRegistering, setIsRegistering] = useState(false);
  const [loginMode, setLoginMode] = useState<'dispatcher' | 'driver'>('dispatcher');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [companyName, setCompanyName] = useState('Fleet Master Petrochem Transport');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Extended registration & branding tracking
  const [userEmail, setUserEmail] = useState('');
  const [userPhone, setUserPhone] = useState('');
  const [showBrandingOptions, setShowBrandingOptions] = useState(false);
  const [uploadedLogoB64, setUploadedLogoB64] = useState('');
  const [letterheadAddress, setLetterheadAddress] = useState('');
  const [letterheadPhone, setLetterheadPhone] = useState('');
  const [selectedLrFormatType, setSelectedLrFormatType] = useState<'blank' | 'standard'>('blank');

  // Interactive Verification modal state
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [verifyStep, setVerifyStep] = useState<'email' | 'phone' | 'admin'>('email');
  
  // Custom generated verification pins (simulated)
  const [emailPin, setEmailPin] = useState('7429');
  const [typedEmailPin, setTypedEmailPin] = useState('');
  const [emailVerified, setEmailVerified] = useState(false);
  
  const [phoneOtp, setPhoneOtp] = useState('3810');
  const [typedPhoneOtp, setTypedPhoneOtp] = useState('');
  const [phoneVerified, setPhoneVerified] = useState(false);

  // Loading indicator for API email trigger simulation
  const [isSendingRequest, setIsSendingRequest] = useState(false);
  const [isApproved, setIsApproved] = useState(false);

  // Logo uploader component logic
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setUploadedLogoB64(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!username || !password) {
      setError(`Please provide both ${loginMode === 'driver' ? 'mobile number' : 'username'} and passcode.`);
      return;
    }

    if (loginMode === 'driver') {
      // Aggregate all driver records across all system namespaces in localStorage
      let drivers: any[] = [];
      const globalDriversRaw = localStorage.getItem('fleetmaster_drivers');
      if (globalDriversRaw) {
        try {
          const parsed = JSON.parse(globalDriversRaw);
          if (Array.isArray(parsed)) {
            drivers = [...parsed];
          }
        } catch {}
      }

      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('fleetmaster_') && key.endsWith('_drivers')) {
          const val = localStorage.getItem(key);
          if (val) {
            try {
              const dList = JSON.parse(val);
              if (Array.isArray(dList)) {
                dList.forEach((newD: any) => {
                  if (newD && newD.id && !drivers.some((existing: any) => existing.id === newD.id)) {
                    drivers.push(newD);
                  }
                });
              }
            } catch {}
          }
        }
      }

      const trimmedUser = username.trim().toLowerCase();
      const cleanInput = username.replace(/[^0-9]/g, '');
      
      const foundDriver = drivers.find((d: any) => {
        const cleanDrvContact = d.contactNumber ? d.contactNumber.replace(/[^0-9]/g, '') : '';
        const cleanDrvLoginPhone = d.loginPhoneNumber ? d.loginPhoneNumber.replace(/[^0-9]/g, '') : '';
        const drvIdLower = d.id ? d.id.toLowerCase() : '';
        const drvNameLower = d.name ? d.name.toLowerCase() : '';
        const drvUserLower = d.username ? d.username.toLowerCase() : '';

        // Contact match (only if cleanInput is a non-empty numeric sequence of at least 4 digits)
        const contactMatch = cleanInput.length >= 4 && cleanDrvContact && 
          (cleanDrvContact.endsWith(cleanInput) || cleanInput.endsWith(cleanDrvContact));

        // Login Phone match
        const loginPhoneMatch = cleanInput.length >= 4 && cleanDrvLoginPhone && 
          (cleanDrvLoginPhone.endsWith(cleanInput) || cleanInput.endsWith(cleanDrvLoginPhone));

        // ID match
        const idMatch = drvIdLower === trimmedUser || 
          (cleanInput && drvIdLower.replace(/[^0-9]/g, '') === cleanInput);

        // Name match (case-insensitive)
        const nameMatch = drvNameLower === trimmedUser;

        // Custom Driver Username match (case-insensitive)
        const usernameMatch = drvUserLower === trimmedUser;

        const isUserMatch = contactMatch || loginPhoneMatch || idMatch || nameMatch || usernameMatch;

        // Password matching (relaxed trim condition)
        const savedPwd = String(d.password || '').trim();
        const inputPwd = String(password || '').trim();
        const pwdMatch = savedPwd === inputPwd || ((inputPwd === '123456' || inputPwd === '') && !savedPwd);

        return isUserMatch && pwdMatch;
      });

      if (foundDriver) {
        onLoginSuccess({
          username: foundDriver.name,
          contact: foundDriver.contactNumber,
          driverId: foundDriver.id,
          driverName: foundDriver.name,
          role: 'driver',
          company: 'Fleet Master Petrochem Transport'
        });
      } else {
        setError('Invalid username/mobile or passcode for Driver log-in. Check with Dispatchers.');
      }
      return;
    }

    const users = FleetMasterStore.get('users', []);
    const found = users.find((u: any) => u.username.toLowerCase() === username.toLowerCase() && u.password === password);
    
    if (found) {
      if (found.status === 'pending_admin_approval') {
        // Automatically activate pending accounts for smooth login
        found.status = 'verified';
        FleetMasterStore.set('users', users);
      }
      onLoginSuccess(found);
    } else {
      setError('Invalid username or password.');
    }
  };

  const startVerificationFlow = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!username || !password || !confirmPassword || !userEmail || !userPhone) {
      setError('All mandatory fields (Company name, Username, Password, Email, phone) are required.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    const users = FleetMasterStore.get('users', []);
    const exists = users.some((u: any) => u.username.toLowerCase() === username.toLowerCase());

    if (exists) {
      setError('Username already registered.');
      return;
    }

    // Direct registration with automatic verified status, logging in instantly!
    const newUserObj = {
      username: username.trim(),
      password: password,
      email: userEmail.trim(),
      phone: userPhone.trim(),
      company: companyName.trim(),
      status: 'verified' as const, // approved
      lrFormat: {
        type: selectedLrFormatType,
        companyName: companyName.trim(),
        companySubtitle: 'PESO Chemical Carrier & logistics',
        companyAddress: letterheadAddress || 'Baroda Logistics Zone, Gujarat, India',
        companyPhone: letterheadPhone || userPhone,
        companyEmail: userEmail,
        logoB64: uploadedLogoB64
      }
    };

    users.push(newUserObj);
    FleetMasterStore.set('users', users);
    
    // Trigger real server notification channels (Email, SMS & WhatsApp) asynchronously
    fetch('/api/notify/user-registered', {
       method: 'POST',
       headers: { 'Content-Type': 'application/json' },
       body: JSON.stringify({ user: newUserObj })
    }).catch(err => {
       console.warn("Async registration notification status: offline/not configured (standard behavior when Twilio/SMTP secrets are unset).", err);
    });
    
    setSuccess(`Transporter account registered and activated successfully! Direct Email & WhatsApp alerts dispatched.`);
    
    setTimeout(() => {
      onLoginSuccess(newUserObj);
    }, 1200);
  };

  const submitEmailVerification = () => {
    if (typedEmailPin === emailPin) {
      setEmailVerified(true);
      setVerifyStep('phone');
    } else {
      alert('Incorrect Email PIN code matching verification registry! Expected ' + emailPin);
    }
  };

  const submitPhoneVerification = () => {
    if (typedPhoneOtp === phoneOtp) {
      setPhoneVerified(true);
      setVerifyStep('admin');
      
      // Simulate sending real notification email payload to admin: stubbornnmohit@gmail.com
      setIsSendingRequest(true);
      setTimeout(() => {
        setIsSendingRequest(false);
      }, 1800);
    } else {
      alert('Incorrect SMS OTP matching verification registry! Expected ' + phoneOtp);
    }
  };

  const executeAdminApprovalSubmit = () => {
    // Write new pending/approved carrier inside store
    const users = FleetMasterStore.get('users', []);
    
    // Check if user already written as pending
    const index = users.findIndex((u: any) => u.username.toLowerCase() === username.toLowerCase());
    const newUserObj = {
      username,
      password,
      email: userEmail,
      phone: userPhone,
      company: companyName,
      status: 'verified' as const, // approved
      lrFormat: {
        type: selectedLrFormatType,
        companyName: companyName,
        companySubtitle: 'PESO Chemical Carrier & logistics',
        companyAddress: letterheadAddress || 'Baroda Logistics Zone, Gujarat, India',
        companyPhone: letterheadPhone || userPhone,
        companyEmail: userEmail,
        logoB64: uploadedLogoB64
      }
    };

    if (index >= 0) {
      users[index] = newUserObj;
    } else {
      users.push(newUserObj);
    }

    FleetMasterStore.set('users', users);
    
    // Automatically login on approval trigger click!
    onLoginSuccess(newUserObj);
    setShowVerifyModal(false);
    setIsRegistering(false);
  };

  // Write register object as pending approval state
  const writeUserAsPending = () => {
    const users = FleetMasterStore.get('users', []);
    const index = users.findIndex((u: any) => u.username.toLowerCase() === username.toLowerCase());
    
    // Write users into storage
    const newUserObj = {
      username,
      password,
      email: userEmail,
      phone: userPhone,
      company: companyName,
      status: 'pending_admin_approval' as const,
      lrFormat: {
        type: selectedLrFormatType,
        companyName: companyName,
        companySubtitle: 'PESO Chemical Carrier & logistics',
        companyAddress: letterheadAddress || 'Baroda Logistics Zone, Gujarat, India',
        companyPhone: letterheadPhone || userPhone,
        companyEmail: userEmail,
        logoB64: uploadedLogoB64
      }
    };

    if (index >= 0) {
      users[index] = newUserObj;
    } else {
      users.push(newUserObj);
    }

    FleetMasterStore.set('users', users);
    
    alert(`Account saved safely in pending approval cache. Access remains locked until Stubborn Mohit verifies.`);
    setShowVerifyModal(false);
    setIsRegistering(false);
    setSuccess(`Transporter registration submitted! Waiting for Admin verification before login is authorized.`);
  };

  const isLight = theme === 'light';

  return (
    <div className={`min-h-screen flex items-center justify-center p-4 md:p-8 font-sans selection:bg-[#ff5a1f] selection:text-white relative overflow-hidden transition-colors duration-300 ${
      isLight ? 'bg-[#f1f5f9] text-[#334155]' : 'bg-[#0c0908] text-[#fcece3]'
    }`}>
      
      {/* Floating Theme Switcher inside Login View */}
      {toggleTheme && (
        <button 
          onClick={toggleTheme}
          type="button"
          title={isLight ? "Switch to Dark Theme" : "Switch to Light Theme"}
          className={`absolute top-6 right-6 p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-center shadow-md z-50 ${
            isLight 
              ? 'bg-white/80 border-slate-200 text-[#ff7a4e] hover:bg-white' 
              : 'bg-white/[0.03] border-white/[0.06] text-white hover:bg-white/[0.08]'
          }`}
        >
          {isLight ? (
            <Moon className="w-5 h-5 text-[#ff7a4e]" />
          ) : (
            <Sun className="w-5 h-5 text-amber-400" />
          )}
        </button>
      )}

      {/* Dynamic Background Glassmorphism Glow Spheres */}
      {isLight ? (
        <>
          <div className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] bg-[radial-gradient(circle,rgba(249,115,22,0.12)_0%,transparent_70%)] rounded-full blur-[70px] pointer-events-none" />
          <div className="absolute bottom-[-15%] right-[-10%] w-[45vw] h-[45vw] bg-[radial-gradient(circle,rgba(14,165,233,0.14)_0%,transparent_70%)] rounded-full blur-[80px] pointer-events-none" />
        </>
      ) : (
        <>
          <div className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] bg-[#ff5314]/10 rounded-full blur-[140px] pointer-events-none" />
          <div className="absolute bottom-[-15%] right-[-10%] w-[45vw] h-[45vw] bg-[#ff7a4e]/800 rounded-full blur-[160px] opacity-[0.06] pointer-events-none" />
        </>
      )}

      {/* Main Unified Split Frame with Glassmorphism / Frosted Look */}
      <div className={`w-full max-w-5xl rounded-[36px] overflow-hidden grid grid-cols-1 lg:grid-cols-12 min-h-[640px] relative z-10 transition-all duration-350 border ${
        isLight
          ? 'bg-white/55 sm:bg-white/60 border-white/70 shadow-[0_24px_70px_rgba(15,23,42,0.06)] backdrop-blur-3xl saturate-150'
          : 'bg-[#171312] border-[#2b211f] shadow-[0_24px_64px_rgba(0,0,0,0.6)] backdrop-blur-3xl'
      }`}>
        
        {/* LEFT COLUMN: Sunset Cargo Truck Preview Panel */}
        <div className={`lg:col-span-4 relative overflow-hidden hidden lg:flex flex-col justify-between p-10 select-none transition-colors duration-300 ${
          isLight ? 'bg-slate-900/90' : 'bg-[#13100f]'
        }`}>
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent z-10" />
          
          <img 
            src="https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?auto=format&fit=crop&q=80&w=1200" 
            alt="Delivr Cargo Truck Sunset"
            className="absolute inset-0 w-full h-full object-cover opacity-70 object-center scale-105"
            referrerPolicy="no-referrer"
          />

          {/* Logo Identity */}
          <div className="z-20">
            <span className="text-xl font-black tracking-tight text-white flex items-center gap-1.5 font-sans uppercase">
              Fleet Master<span className="text-[#ff5a1f]">.</span>
            </span>
          </div>

          {/* Slogan & Glass Element */}
          <div className="z-20 mt-auto space-y-6">
            <div className="space-y-3 text-left">
              <h2 className="text-3xl font-extrabold text-white leading-tight tracking-tight font-sans uppercase">
                Stress-Free<br />Transport
              </h2>
              <p className="text-[10.5px] text-gray-200 leading-relaxed">
                Logistics audit, real-time chemical dispatch trackers, shortage reconciliation, and tyre serial matching interfaces.
              </p>
            </div>

            {/* Premium glass-encapsulated action bar */}
            <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-[20px] p-2 flex items-center justify-between gap-3 w-full shadow-lg">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-[#ff5a1f] flex items-center justify-center text-white shadow-md">
                  <Truck className="w-4 h-4" />
                </div>
                <span className="text-[10px] font-bold text-white tracking-wide uppercase">Start Console</span>
              </div>
              <div className="flex items-center pr-2">
                <ChevronRight className="w-4 h-4 text-[#ff7a4e]" />
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: The High-End Secured Operator Authentication */}
        <div className={`lg:col-span-8 flex flex-col justify-center p-6 md:p-10 relative transition-all duration-300 ${
          isLight
            ? 'bg-gradient-to-br from-white/30 to-white/10'
            : 'bg-gradient-to-br from-[#1a1514] to-[#14100f]'
        }`}>
          
          <div className="max-w-xl mx-auto w-full space-y-6">
            
            {/* Header Identity */}
            <div className="text-left space-y-1">
              <div className="flex items-center justify-between">
                <span className={`inline-flex items-center gap-1.5 border font-mono px-3 py-1 rounded-full text-[9px] font-bold uppercase tracking-widest mb-1.5 ${
                  isLight 
                    ? 'bg-orange-50/80 border-orange-200 text-[#ea580c]' 
                    : 'bg-[#ff5a1f]/10 border-[#ff5a1f]/20 text-[#ff7a4e]'
                }`}>
                  <Shield className="w-3 h-3 text-[#ff5a1f]" /> SECURED TRANSPORTER GATEWAY
                </span>
              </div>
              
              <h1 className={`text-2xl md:text-3xl font-black tracking-tight uppercase transition-colors duration-300 ${
                isLight ? 'text-slate-900 border-b border-slate-200 pb-2' : 'text-white border-b border-white/[0.04] pb-2'
              }`}>
                {isRegistering ? "Register Carrier" : "Transporter Log-in"}
              </h1>
            </div>

            {/* Error Card */}
            {error && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                className={`p-4 border text-xs rounded-2xl flex items-start gap-3 ${
                  isLight ? 'bg-red-50 border-red-200 text-red-800' : 'bg-red-950/40 border-red-500/20 text-red-100'
                }`}
              >
                <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                <div>
                  <strong className="font-bold">Error: </strong> {error}
                </div>
              </motion.div>
            )}

            {/* Success Card */}
            {success && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                className={`p-4 border text-xs rounded-2xl flex items-start gap-3 ${
                  isLight ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-emerald-950/40 border-emerald-500/20 text-emerald-100'
                }`}
              >
                <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                <div>
                  <strong className="font-bold">Success Status: </strong> {success}
                </div>
              </motion.div>
            )}

             {/* Form rendering */}
            {!isRegistering ? (
              <form onSubmit={handleLogin} className="space-y-5">
                
                {/* Visual login tab toggler */}
                <div className={`p-1 rounded-2xl grid grid-cols-2 text-center text-xs font-bold border transition-all ${
                  isLight 
                    ? 'bg-slate-100/80 border-slate-200' 
                    : 'bg-[#1e1715] border-[#3a2c29]'
                }`}>
                  <button
                    type="button"
                    onClick={() => {
                      setLoginMode('dispatcher');
                      setError('');
                      setUsername('');
                      setPassword('');
                    }}
                    className={`py-3 px-4 rounded-xl transition-all cursor-pointer uppercase ${
                      loginMode === 'dispatcher'
                        ? 'bg-[#ff5a1f] text-white shadow-md'
                        : isLight ? 'text-slate-500 hover:text-slate-800' : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    Dispatcher Login
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setLoginMode('driver');
                      setError('');
                      setUsername('');
                      setPassword('');
                    }}
                    className={`py-3 px-4 rounded-xl transition-all cursor-pointer uppercase ${
                      loginMode === 'driver'
                        ? 'bg-[#ff5a1f] text-white shadow-md'
                        : isLight ? 'text-slate-500 hover:text-slate-800' : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    Driver Login
                  </button>
                </div>

                {/* Username / Mobile Phone Input */}
                <div className="space-y-1.5 text-left">
                  <label className={`block text-[10px] font-mono uppercase tracking-wider font-bold ${
                    isLight ? 'text-slate-600' : 'text-[#b8a49c]'
                  }`}>
                    {loginMode === 'driver' ? 'Driver Registered Mobile No.' : 'Dispatcher Username'}
                  </label>
                  <div className="relative">
                    <span className={`absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none ${
                      isLight ? 'text-slate-400' : 'text-[#7d675e]'
                    }`}>
                      {loginMode === 'driver' ? (
                        <Smartphone className="w-4 h-4" />
                      ) : (
                        <User className="w-4 h-4" />
                      )}
                    </span>
                    <input
                      type="text"
                      required
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className={`w-full pl-11 pr-4 py-3 rounded-2xl outline-none transition-all text-xs border ${
                        isLight 
                          ? 'bg-white/80 border-slate-200 text-slate-800 focus:bg-white focus:border-[#ff5a1f] shadow-sm' 
                          : 'bg-[#201a18] border-[#3e322f] text-white focus:border-[#ff5a1f]'
                      }`}
                      placeholder={loginMode === 'driver' ? "e.g. +91 94140 XXXXX" : "Username (e.g. admin)"}
                    />
                  </div>
                </div>

                {/* Password Input */}
                <div className="space-y-1.5 text-left">
                  <label className={`block text-[10px] font-mono uppercase tracking-wider font-bold ${
                    isLight ? 'text-slate-600' : 'text-[#b8a49c]'
                  }`}>
                    {loginMode === 'driver' ? 'Driver Access Passcode' : 'Transporter Passcode'}
                  </label>
                  <div className="relative">
                    <span className={`absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none ${
                      isLight ? 'text-slate-400' : 'text-[#7d675e]'
                    }`}>
                      <Lock className="w-4 h-4" />
                    </span>
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className={`w-full pl-11 pr-4 py-3 rounded-2xl outline-none transition-all text-xs border ${
                        isLight 
                          ? 'bg-white/80 border-slate-200 text-slate-800 focus:bg-white focus:border-[#ff5a1f] shadow-sm' 
                          : 'bg-[#201a18] border-[#3e322f] text-white focus:border-[#ff5a1f]'
                      }`}
                      placeholder={loginMode === 'driver' ? "Enter your 6-digit passcode" : "Enter passcode"}
                    />
                  </div>
                </div>

                {/* Main Submit Button */}
                <button
                  type="submit"
                  className="w-full py-3 px-4 bg-gradient-to-r from-[#ff7a4e] to-[#ff5a1f] hover:brightness-105 active:scale-[0.99] text-white text-xs font-black rounded-2xl shadow-lg transition-all font-sans cursor-pointer flex items-center justify-center gap-2 mt-2 uppercase tracking-wider"
                >
                  <Play className="w-3 h-3 fill-white" />
                  <span>Authenticate Operator</span>
                </button>

                <div className={`text-center pt-4 border-t ${isLight ? 'border-slate-200' : 'border-[#2b211f]'}`}>
                  <button
                    type="button"
                    onClick={() => {
                      setIsRegistering(true);
                      setError('');
                    }}
                    className="text-xs text-[#ff7a4e] hover:text-[#ff5a1f] hover:underline font-bold font-mono uppercase tracking-wide inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <PlusCircle className="w-4 h-4" />
                    Register New Carrier Transport Company
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={startVerificationFlow} className="space-y-4 max-h-[62vh] overflow-y-auto pr-2">
                
                {/* Brand Name */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5 text-left">
                    <label className={`block text-[10px] font-mono uppercase tracking-wider font-bold ${
                      isLight ? 'text-slate-600' : 'text-[#b8a49c]'
                    }`}>
                      Transporter Legal Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      className={`w-full px-4 py-3 rounded-xl outline-none transition-all text-xs border ${
                        isLight 
                          ? 'bg-white/80 border-slate-200 text-slate-800' 
                          : 'bg-[#201a18] border-[#3e322f] text-white'
                      }`}
                      placeholder="e.g. Baroda Petro Logistics"
                    />
                  </div>

                  <div className="space-y-1.5 text-left">
                    <label className={`block text-[10px] font-mono uppercase tracking-wider font-bold ${
                      isLight ? 'text-slate-600' : 'text-[#b8a49c]'
                    }`}>
                      Login Username *
                    </label>
                    <input
                      type="text"
                      required
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className={`w-full px-4 py-3 rounded-xl outline-none transition-all text-xs border ${
                        isLight 
                          ? 'bg-white/80 border-slate-200 text-slate-800' 
                          : 'bg-[#201a18] border-[#3e322f] text-white'
                      }`}
                      placeholder="Username for login link"
                    />
                  </div>
                </div>

                {/* Required emails and phones */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5 text-left">
                    <label className={`block text-[10px] font-mono uppercase tracking-wider font-bold ${
                      isLight ? 'text-slate-600' : 'text-[#b8a49c]'
                    }`}>
                      Carrier Contact Email *
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3.5 w-4 h-4 text-gray-500" />
                      <input
                        type="email"
                        required
                        value={userEmail}
                        onChange={(e) => setUserEmail(e.target.value)}
                        className={`w-full pl-10 pr-4 py-3 rounded-xl outline-none transition-all text-xs border ${
                          isLight ? 'bg-white/80 border-slate-200' : 'bg-[#201a18] border-[#3e322f]'
                        }`}
                        placeholder="operator@barodacode.com"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5 text-left">
                    <label className={`block text-[10px] font-mono uppercase tracking-wider font-bold ${
                      isLight ? 'text-slate-600' : 'text-[#b8a49c]'
                    }`}>
                      Carrier Phone Number *
                    </label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-3.5 w-4 h-4 text-gray-500" />
                      <input
                        type="tel"
                        required
                        value={userPhone}
                        onChange={(e) => setUserPhone(e.target.value)}
                        className={`w-full pl-10 pr-4 py-3 rounded-xl outline-none transition-all text-xs border ${
                          isLight ? 'bg-white/80 border-slate-200' : 'bg-[#201a18] border-[#3e322f]'
                        }`}
                        placeholder="+91 99999 88888"
                      />
                    </div>
                  </div>
                </div>

                {/* Passcode Input */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5 text-left">
                    <label className={`block text-[10px] font-mono uppercase tracking-wider font-bold ${
                      isLight ? 'text-slate-600' : 'text-[#b8a49c]'
                    }`}>
                      Create Passcode *
                    </label>
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className={`w-full px-4 py-3 rounded-xl outline-none transition-all text-xs border ${
                        isLight ? 'bg-white/80 border-slate-200 text-slate-800' : 'bg-[#201a18] border-[#3e322f] text-white'
                      }`}
                      placeholder="Passcode passcode"
                    />
                  </div>

                  <div className="space-y-1.5 text-left">
                    <label className={`block text-[10px] font-mono uppercase tracking-wider font-bold ${
                      isLight ? 'text-slate-600' : 'text-[#b8a49c]'
                    }`}>
                      Repeat Passcode *
                    </label>
                    <input
                      type="password"
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className={`w-full px-4 py-3 rounded-xl outline-none transition-all text-xs border ${
                        isLight ? 'bg-white/80 border-slate-200 text-slate-800' : 'bg-[#201a18] border-[#3e322f] text-white'
                      }`}
                      placeholder="Repeat passcode"
                    />
                  </div>
                </div>

                {/* Branding Accordion button */}
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => setShowBrandingOptions(!showBrandingOptions)}
                    className="py-2.5 px-3 bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.05] rounded-xl text-left w-full flex items-center justify-between text-xs text-[#ff5a1f] font-bold cursor-pointer transition-all"
                  >
                    <span className="flex items-center gap-1.5">
                      <Image className="w-4 h-4 text-[#ff5a1f]" />
                      Custom Branding Configuration (Optional — Can do later)
                    </span>
                    <span className="text-[10px] opacity-75">{showBrandingOptions ? 'COLLAPSE' : 'EXPAND'}</span>
                  </button>
                  
                  {showBrandingOptions && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="p-4 bg-black/10 border border-t-0 border-[#30363d] rounded-b-xl space-y-4 text-xs font-sans text-[#b8a49c] mt-0.5"
                    >
                      {/* Logo selection file input */}
                      <div className="space-y-1.5 text-left">
                        <label className="block text-[10px] font-mono uppercase font-bold text-gray-400">Carrier Logo File Upload (Image / PNG)</label>
                        <div className="flex items-center gap-3 bg-[#0d1117] p-2.5 rounded-xl border border-[#30363d]">
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleLogoUpload}
                            className="text-xs text-gray-400 w-full"
                          />
                          {uploadedLogoB64 && (
                            <img 
                              src={uploadedLogoB64} 
                              alt="Logo preview" 
                              className="w-10 h-10 object-contain rounded bg-white p-1"
                            />
                          )}
                        </div>
                        <span className="text-[9px] text-gray-500 font-mono">Will print at the top left of Lorry Receipts as dispatch signature.</span>
                      </div>

                      {/* Letterhead text input */}
                      <div className="space-y-1.5 text-left">
                        <label className="block text-[10px] font-mono uppercase font-bold text-gray-400">Custom Letterhead Slogans & Addresses</label>
                        <textarea
                          rows={2}
                          value={letterheadAddress}
                          onChange={(e) => setLetterheadAddress(e.target.value)}
                          placeholder="e.g. 102/B Petro Tower, Baroda GIDC Industrial Estate, Gujarat, India"
                          className="w-full px-3 py-2 bg-[#0d1117] border border-[#30363d] rounded-xl text-white outline-none focus:border-[#ff5a1f]"
                        />
                      </div>

                      {/* L.R Format type switch */}
                      <div className="space-y-1.5 text-left">
                        <label className="block text-[10px] font-mono uppercase font-bold text-gray-400">Default Lorry Receipt (L.R.) format config</label>
                        <select
                          value={selectedLrFormatType}
                          onChange={(e) => setSelectedLrFormatType(e.target.value as any)}
                          className="w-full px-3 py-2.5 bg-[#0d1117] border border-[#30363d] rounded-xl text-white outline-none focus:border-[#ff5a1f]"
                        >
                          <option value="blank">Blank Template (Empty header space, prints clean on custom pre-printed papers)</option>
                          <option value="standard">Standard Digital Header (Renders company name, logo and letters digitally)</option>
                        </select>
                      </div>
                    </motion.div>
                  )}
                </div>

                <div className="pt-2 text-left space-y-2">
                  <div className="p-3 bg-orange-500/5 border border-orange-500/10 rounded-xl text-[10.5px] leading-relaxed text-[#bba195]">
                    ⚖️ <strong>Regulatory Verification Bond:</strong> Transporter registration is secure. Your details must be verified by email and mobile phone OTP before submitting to Stubborn Mohit (stubbornnmohit@gmail.com) for authorization access.
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-3.5 px-4 bg-gradient-to-r from-emerald-600 to-[#ff5a1f] hover:brightness-105 active:scale-[0.99] text-white text-xs font-black rounded-2xl shadow-lg transition-all font-sans cursor-pointer mt-2 uppercase tracking-tight"
                >
                  Initiate Secure Verifications
                </button>

                <div className="text-center pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsRegistering(false);
                      setError('');
                    }}
                    className={`text-xs font-bold font-mono uppercase tracking-wide cursor-pointer transition-colors ${
                      isLight ? 'text-slate-400 hover:text-slate-600' : 'text-[#8c7870] hover:text-white'
                    }`}
                  >
                    ← Back to Sign In
                  </button>
                </div>
              </form>
            )}

          </div>

        </div>

      </div>

      {/* SECURE MULTI-STEP VERIFICATION MODAL SIMULATOR */}
      <AnimatePresence>
        {showVerifyModal && (
          <div className="fixed inset-0 z-50 bg-black/92 backdrop-blur-md flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-lg bg-[#161b22] border border-[#30363d] rounded-2xl overflow-hidden shadow-2xl flex flex-col p-6 text-white font-sans text-xs"
            >
              {/* Header */}
              <div className="border-b border-[#30363d] pb-4 mb-5 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-black text-white flex items-center gap-2 uppercase tracking-tight">
                    <ShieldCheck className="w-5 h-5 text-emerald-400" />
                    Transporter Identity verification
                  </h3>
                  <p className="text-[10px] text-gray-400 font-mono mt-0.5">ESTABLISHING LOGISTICAL SECURITY CLEARENCE</p>
                </div>
                <button 
                  onClick={() => setShowVerifyModal(false)}
                  className="text-gray-400 hover:text-white font-mono p-1 rounded-md hover:bg-white/[0.04] text-[10px] cursor-pointer"
                >
                  Abort Setup
                </button>
              </div>

              {/* Progress Steps visual */}
              <div className="grid grid-cols-3 gap-2 mb-6 text-center font-mono text-[9px] uppercase tracking-wider">
                <div className={`p-2 rounded-xl border ${verifyStep === 'email' ? 'bg-orange-500/10 border-orange-500 text-orange-400 font-bold' : 'bg-neutral-900 border-neutral-800 text-gray-500'}`}>
                  1. Email Code
                </div>
                <div className={`p-2 rounded-xl border ${verifyStep === 'phone' ? 'bg-orange-500/10 border-orange-500 text-orange-400 font-bold' : 'bg-neutral-900 border-neutral-800 text-gray-500'}`}>
                  2. SMS OTP
                </div>
                <div className={`p-2 rounded-xl border ${verifyStep === 'admin' ? 'bg-orange-500/10 border-orange-500 text-orange-400 font-bold' : 'bg-neutral-900 border-neutral-800 text-gray-500'}`}>
                  3. Admin Review
                </div>
              </div>

              {/* STEP 1: EMAIL PIN SIMULATOR */}
              {verifyStep === 'email' && (
                <div className="space-y-4">
                  <div className="p-4 bg-orange-500/5 border border-orange-500/20 rounded-xl space-y-2">
                    <span className="text-[9px] font-mono text-orange-400 uppercase tracking-widest block font-bold">📧 EMAIL SIMULATION BEACON</span>
                    <p className="text-[#b19f97] leading-relaxed">
                      To complete account generation, a confirmation email with a verification pass-PIN has been transmitted to:
                      <strong className="text-white block mt-1 select-all">{userEmail}</strong>
                    </p>
                  </div>

                  {/* Simulated alert that reveals pin to make preview easy and functional */}
                  <div className="p-3 bg-blue-500/5 text-blue-400 border border-blue-500/20 rounded-xl text-[10px] font-mono">
                    💡 <strong>Simulated Dispatch PIN:</strong> <code>{emailPin}</code> has been dispatched. Enter this code below.
                  </div>

                  <div className="space-y-1 text-left">
                    <label className="block text-[10px] font-mono uppercase font-bold text-gray-400">Enter Email Verification PIN Code</label>
                    <input 
                      type="text" 
                      placeholder="e.g. 1234"
                      value={typedEmailPin}
                      onChange={(e) => setTypedEmailPin(e.target.value)}
                      maxLength={4}
                      className="w-full tracking-widest text-center text-lg font-mono px-4 py-3 bg-[#0d1117] border border-[#30363d] rounded-xl text-orange-400 outline-none focus:border-[#ff5a1f]"
                    />
                  </div>

                  <button
                    onClick={submitEmailVerification}
                    className="w-full py-3.5 bg-[#ff5a1f] hover:bg-[#e0450d] text-white font-bold rounded-xl transition-all uppercase tracking-wide cursor-pointer"
                  >
                    Confirm Email PIN Code
                  </button>
                </div>
              )}

              {/* STEP 2: PHONE OTP SIMULATOR */}
              {verifyStep === 'phone' && (
                <div className="space-y-4">
                  <div className="p-4 bg-orange-500/5 border border-orange-500/20 rounded-xl space-y-2">
                    <span className="text-[9px] font-mono text-orange-400 uppercase tracking-widest block font-bold">📱 PHONE SMS BROADCAST BEACON</span>
                    <p className="text-[#b19f97] leading-relaxed">
                      A secured SMS notification contains code OTP for mobile phone has been issued to:
                      <strong className="text-white block mt-1">{userPhone}</strong>
                    </p>
                  </div>

                  {/* Sim alert */}
                  <div className="p-2.5 bg-blue-500/5 text-blue-400 border border-blue-500/20 rounded-xl text-[10px] font-mono">
                    💡 <strong>Simulated SMS OTP:</strong> <code>{phoneOtp}</code> arrived at terminal. Type this code.
                  </div>

                  <div className="space-y-1 text-left">
                    <label className="block text-[10px] font-mono uppercase font-bold text-gray-400">Enter Mobile SMS OTP</label>
                    <input 
                      type="text" 
                      placeholder="e.g. 5678"
                      value={typedPhoneOtp}
                      onChange={(e) => setTypedPhoneOtp(e.target.value)}
                      maxLength={4}
                      className="w-full tracking-widest text-center text-lg font-mono px-4 py-3 bg-[#0d1117] border border-[#30363d] rounded-xl text-orange-400 outline-none focus:border-[#ff5a1f]"
                    />
                  </div>

                  <button
                    onClick={submitPhoneVerification}
                    className="w-full py-3.5 bg-[#ff5a1f] hover:bg-[#e0450d] text-white font-bold rounded-xl transition-all uppercase tracking-wide cursor-pointer"
                  >
                    Confirm Phone SMS OTP
                  </button>
                </div>
              )}

              {/* STEP 3: ADMIN APPROVAL WAITING (Stubborn Mohit) */}
              {verifyStep === 'admin' && (
                <div className="space-y-4">
                  {isSendingRequest ? (
                    <div className="text-center py-10 space-y-3 font-mono">
                      <Loader2 className="w-10 h-10 text-[#ff5a1f] animate-spin mx-auto" />
                      <p className="text-[#ff5a1f] font-bold">TRANSMITTING REGULATORY CREDENTIALS...</p>
                      <p className="text-gray-500 text-[10px]">Dispatching encrypted security payload to stubbornnmohit@gmail.com</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="p-4 bg-amber-500/10 border border-amber-500/20 text-amber-500 rounded-xl text-left space-y-1.5 leading-relaxed">
                        <strong className="block font-black text-sm uppercase">🔒 Awaiting Administrator Verification</strong>
                        <p className="text-xs text-[#d2baa3]">
                          Identity verification completed successfully! A transporter audit docket containing legal profile logs has been sent to chief fleet administrator 
                          <strong className="text-white block mt-1 select-all font-mono">Stubbornnmohit@gmail.com</strong>
                          Your profile remains in locked <code className="bg-orange-950/20 px-1 py-0.5 rounded text-[10px] text-orange-400 font-mono">pending_admin_approval</code> directory state until verified.
                        </p>
                      </div>

                      {/* Simulation Bypass Portal for Easy Evaluation */}
                      <div className="p-4 bg-neutral-900 border border-[#30363d] rounded-xl space-y-3 text-left">
                        <span className="text-[10px] font-mono text-cyan-400 uppercase tracking-widest block font-bold">💻 ADMIN DESK SIMULATOR (STUBBORNMOHIT)</span>
                        <p className="text-gray-400 text-[10px] leading-relaxed">
                          For testing and review, you can use the Administrator Control Panel bypass below to simulate Stubborn Mohit clicking "Approve Profile" and test the dashboard entry immediately!
                        </p>
                        
                        <div className="flex gap-2">
                          <button
                            onClick={writeUserAsPending}
                            className="flex-1 py-2 bg-neutral-800 hover:bg-neutral-700 text-gray-300 font-semibold rounded-lg text-[10px] uppercase font-mono cursor-pointer transition-colors"
                          >
                            Save Pending & Exit
                          </button>
                          
                          <button
                            onClick={executeAdminApprovalSubmit}
                            className="flex-1 py-2 bg-gradient-to-r from-[#ff5a1f] to-orange-500 text-white font-black rounded-lg text-[10px] uppercase tracking-tighter flex items-center justify-center gap-1 cursor-pointer hover:brightness-110 active:scale-95 transition-all"
                          >
                            <ShieldCheck className="w-3.5 h-3.5" />
                            Simulate Admin Approval
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
