import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Cloud, 
  ExternalLink, 
  RefreshCw, 
  Send, 
  CheckCircle2, 
  ChevronRight, 
  Check, 
  AlertTriangle, 
  FileSpreadsheet, 
  FolderPlus, 
  MessageSquare, 
  Mail, 
  Layers, 
  Plus, 
  CornerDownRight, 
  Share2, 
  HelpCircle,
  FileText,
  Clock,
  Sparkles,
  Search,
  BookOpen,
  CheckCircle,
  Smartphone,
  Info
} from 'lucide-react';
import { initializeApp, getApp, getApps } from 'firebase/app';
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, User } from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

// Initialize Firebase App for Workspace Google sign-in
const firebaseApp = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(firebaseApp);

interface WorkspaceProps {
  trips: any[];
  tankers: any[];
  drivers: any[];
  bills: any[];
  expenses: any[];
}

export default function WorkspaceManager({ trips, tankers, drivers, bills, expenses }: WorkspaceProps) {
  // Authentication states
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [needsAuth, setNeedsAuth] = useState(true);
  const [apiMode, setApiMode] = useState<'real' | 'simulation'>('simulation');

  // Active Workspace Sub-tab
  const [activeSubTab, setActiveSubTab] = useState<'drive' | 'sheets' | 'gmail' | 'docs' | 'chat' | 'forms'>('drive');

  // Global Workspace state variables
  const [logs, setLogs] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Drive state
  const [driveFiles, setDriveFiles] = useState<any[]>([
    { id: '1', name: 'FleetMaster_Transporter_Deed.pdf', mimeType: 'application/pdf', size: '2.4 MB', createdTime: '2026-06-05' },
    { id: '2', name: 'Q2_Petroleum_Transit_Forecast.xlsx', mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', size: '1.2 MB', createdTime: '2026-06-04' },
    { id: '3', name: 'Driver_License_Validation_Roster.docx', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', size: '420 KB', createdTime: '2026-06-03' }
  ]);
  const [newFolderName, setNewFolderName] = useState('');

  // Sheets state
  const [spreadsheets, setSpreadsheets] = useState<any[]>([
    { id: 'sheet-101', name: 'Active Cargo Logistics Sheet', url: '#', lastModified: 'Today, 2:10 PM' },
    { id: 'sheet-102', name: 'AdBlue Emission Register 2026', url: '#', lastModified: 'Yesterday' }
  ]);
  const [exportSelectedTable, setExportSelectedTable] = useState<'trips' | 'tankers' | 'drivers'>('trips');

  // Gmail state
  const [gmailQuery, setGmailQuery] = useState('');
  const [emails, setEmails] = useState<any[]>([
    { id: 'mail-1', subject: 'Lorry Receipt #1024 Approved for Dispatch', sender: 'dispatcher@fleetmaster.com', date: '6:15 PM' },
    { id: 'mail-2', subject: 'Weekly BPCL Fuel Voucher Audit Consolidated', sender: 'finance@petrowork.in', date: 'Yesterday' },
    { id: 'mail-3', subject: 'Tanker TN-38-P-9011 Emission Clearances Complete', sender: 'rto-office@gov.in', date: 'Jun 4' }
  ]);
  const [recipientEmail, setRecipientEmail] = useState('stubbornnmohit@gmail.com');
  const [emailSubject, setEmailSubject] = useState('New Live Fleet Trip Route Details Dispatch Alert');
  const [emailBody, setEmailBody] = useState('This email was dispatched securely using standard Google Workspace Gmail API backend relay server channels.');

  // Docs state
  const [authDocuments, setAuthDocuments] = useState<any[]>([
    { id: 'doc-1', title: 'Carrier Standard Agreement & Lorry Receipt Terms', created: '2026-06-01' },
    { id: 'doc-2', title: 'Road hazard policy & Driver Emergency Protocol', created: '2026-06-02' }
  ]);
  const [docTemplateText, setDocTemplateText] = useState('Standard Lorry Transit Deed:\nAll fuel loaded must be verified on-site using BPCL receipts. Shortage ledger penalties apply at current petroleum rate of ₹104.20 per liter.');

  // Chat state
  const [chatSpaces, setChatSpaces] = useState<any[]>([
    { name: 'spaces/AAAABBBCC', displayName: 'Fleet-Dispatches-Command', type: 'ROOM' },
    { name: 'spaces/DDDEEEFFF', displayName: 'Urgent-Maintenance-Alerts', type: 'ROOM' }
  ]);
  const [chatPayload, setChatPayload] = useState('🚚 Tanker TN-38-P-9012 has completed transit. Ready to sync AdBlue emit statistics.');

  // Forms state
  const [workspaceForms, setWorkspaceForms] = useState<any[]>([
    { id: 'form-101', title: 'Daily Driver Fuel Register Log', url: 'https://docs.google.com/forms', responsesCount: 14 }
  ]);
  const [selectedTripForWhatsApp, setSelectedTripForWhatsApp] = useState<string>('');
  const [customWhatsAppPhone, setCustomWhatsAppPhone] = useState('+919723781353');
  const [whatsAppLink, setWhatsAppLink] = useState('');

  // Setup dynamic WhatsApp link
  useEffect(() => {
    let trip = trips[0];
    if (selectedTripForWhatsApp) {
      trip = trips.find(t => t.id === selectedTripForWhatsApp) || trips[0];
    }
    if (trip) {
      const template = `🟢 *VOYAGER TRIP DISPATCHED* 🟢\n\n*Trip ID:* ${trip.id}\n*Tanker Plate:* ${trip.tankerNumber}\n*Driver:* ${trip.driverName}\n*Route:* ${trip.placeFrom} ➔ ${trip.placeTo}\n*Fuel liters limit:* ${trip.expectedFuelLiters || 150} L\n*AdBlue limit:* ${trip.expectedAdblueLiters || 20} L\n\n💬 *Remote Cash Expense Tracker Reply*:\nReply to this text in style:\n\`Expense <category> <amount> "<detail>"\`\n\n*Example:* \`Expense repair 2800 "Replacement tyre roadside tyre workshop"\``;
      const encoded = encodeURIComponent(template);
      let phoneNum = customWhatsAppPhone.replace(/[^\d+]/g, '');
      if (!phoneNum.startsWith('+')) {
        if (phoneNum.length === 10) phoneNum = '91' + phoneNum;
      }
      setWhatsAppLink(`https://api.whatsapp.com/send?phone=${phoneNum}&text=${encoded}`);
    } else {
      setWhatsAppLink(`https://api.whatsapp.com/send?phone=${customWhatsAppPhone}&text=${encodeURIComponent('No trips scheduled currently on transport ledger.')}`);
    }
  }, [trips, selectedTripForWhatsApp, customWhatsAppPhone]);

  // Auth setup listeners
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user: User | null) => {
      if (user) {
        setCurrentUser(user);
        setNeedsAuth(false);
        addLog(`Google Account "${user.displayName}" active.`);
      } else {
        setCurrentUser(null);
        setAccessToken(null);
        setNeedsAuth(true);
      }
    });
    return unsub;
  }, []);

  const addLog = (msg: string) => {
    setLogs(prev => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev.slice(0, 15)]);
  };

  const handleGoogleSignIn = async () => {
    setIsLoggingIn(true);
    addLog("Initiating sign-in with Google Workspace popup...");
    const provider = new GoogleAuthProvider();
    // Standard merged scopes for user requests
    provider.addScope('https://www.googleapis.com/auth/drive');
    provider.addScope('https://www.googleapis.com/auth/spreadsheets');
    provider.addScope('https://www.googleapis.com/auth/gmail.send');
    provider.addScope('https://www.googleapis.com/auth/gmail.readonly');
    provider.addScope('https://www.googleapis.com/auth/documents');
    provider.addScope('https://www.googleapis.com/auth/chat.spaces');
    provider.addScope('https://www.googleapis.com/auth/chat.messages');
    provider.addScope('https://www.googleapis.com/auth/forms.body');
    provider.addScope('https://www.googleapis.com/auth/forms.responses.readonly');

    try {
      const result = await signInWithPopup(auth, provider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      if (credential?.accessToken) {
        setAccessToken(credential.accessToken);
        addLog(`OAuth Access Token stored successfully. Google Workspace Sync Active.`);
        setApiMode('real');
      } else {
        addLog(`Warning: No secure access token returned (acting in Enterprise sandbox fallback).`);
        setApiMode('simulation');
      }
      setCurrentUser(result.user);
      setNeedsAuth(false);
    } catch (err: any) {
      console.error(err);
      addLog(`OAuth registration error: ${err.message || err}. Reverting to developer sandbox mode.`);
      setApiMode('simulation');
      setNeedsAuth(false);
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleSignOut = async () => {
    await auth.signOut();
    setAccessToken(null);
    setCurrentUser(null);
    setNeedsAuth(true);
    addLog("Unlinked Google Workspace account context.");
  };

  // Google Drive: List files / Create Folders
  const fetchDriveFiles = async () => {
    setIsLoading(true);
    addLog(`Querying Drive API list files: https://www.googleapis.com/drive/v3/files`);
    if (apiMode === 'simulation' || !accessToken) {
      setTimeout(() => {
        setIsLoading(false);
        addLog("Drive sync: Mock fetched 3 system documents standard files.");
      }, 800);
      return;
    }

    try {
      const response = await fetch('https://www.googleapis.com/drive/v3/files?pageSize=12&fields=files(id,name,mimeType,size,createdTime)', {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      const data = await response.json();
      if (data.files) {
        setDriveFiles(data.files);
        addLog(`Live synced ${data.files.length} real files from Google Drive!`);
      } else {
        addLog(`Drive query details: ${JSON.stringify(data)}`);
      }
    } catch (e: any) {
      addLog(`Drive Error: ${e.message || e}`);
    } finally {
      setIsLoading(false);
    }
  };

  const createDriverFolderOnDrive = async () => {
    if (!newFolderName.trim()) return;
    const confirmed = window.confirm(`Create secure subdirectory folder "${newFolderName}" in corporate Google Drive cloud?`);
    if (!confirmed) return;

    setIsLoading(true);
    addLog(`Triggering drive folder creation query for: "${newFolderName}"`);

    if (apiMode === 'simulation' || !accessToken) {
      setTimeout(() => {
        setIsLoading(false);
        setDriveFiles(prev => [
          { id: `folder-${Date.now()}`, name: newFolderName, mimeType: 'application/vnd.google-apps.folder', size: '--', createdTime: new Date().toISOString().substring(0,10) },
          ...prev
        ]);
        setNewFolderName('');
        addLog(`Direct Drive folder "${newFolderName}" created inside Sandbox memory.`);
      }, 1000);
      return;
    }

    try {
      const response = await fetch('https://www.googleapis.com/drive/v3/files', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: newFolderName,
          mimeType: 'application/vnd.google-apps.folder'
        })
      });
      const data = await response.json();
      if (data.id) {
        addLog(`Google Drive Directory successfully provisioned. Folder ID: ${data.id}`);
        setNewFolderName('');
        fetchDriveFiles();
      } else {
        addLog(`Drive API response error: ${JSON.stringify(data)}`);
      }
    } catch (e: any) {
      addLog(`Error creating Google directory: ${e.message || e}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Google Sheets: Sync & Export registers
  const exportDataToSheets = async () => {
    const tableLabel = exportSelectedTable.toUpperCase();
    const confirmed = window.confirm(`Register New Sheet and append full rows for ${tableLabel}? User spreadsheet will be created.`);
    if (!confirmed) return;

    setIsLoading(true);
    addLog(`Generating outbound spreadsheet structure for standard ${tableLabel} list.`);

    if (apiMode === 'simulation' || !accessToken) {
      setTimeout(() => {
        setIsLoading(false);
        const name = `FleetMaster_${tableLabel}_Export_${Math.floor(Math.random()*900+100)}.xlsx`;
        setSpreadsheets(prev => [
          { id: `sheet-${Date.now()}`, name, url: 'https://docs.google.com/spreadsheets', lastModified: 'Just now' },
          ...prev
        ]);
        addLog(`Appended ${tableLabel === 'trips' ? trips.length : tableLabel === 'tankers' ? tankers.length : drivers.length} rows inside spreadsheet layout.`);
      }, 1200);
      return;
    }

    try {
      // 1. Create a spreadsheet
      const createRes = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          properties: { title: `FleetMaster ${tableLabel} Live Sync Registry` }
        })
      });
      const sheetData = await createRes.json();
      if (!sheetData.spreadsheetId) throw new Error('Failed to create sheet layout structure');

      const spreadId = sheetData.spreadsheetId;
      addLog(`Outbound sheet created. Spreadsheet ID: ${spreadId}`);

      // 2. Format details to send
      let values = [];
      if (exportSelectedTable === 'trips') {
        values = [
          ['Trip ID', 'Tanker', 'Driver Name', 'Route From', 'Route To', 'Status', 'Fuel Liters', 'Date Initiated'],
          ...trips.map(t => [t.id, t.tankerNumber, t.driverName, t.placeFrom, t.placeTo, t.status, t.expectedFuelLiters || 0, t.date || ''])
        ];
      } else if (exportSelectedTable === 'tankers') {
        values = [
          ['Tanker ID', 'Plate Number', 'Lorry Type', 'Ownership', 'Capacity', 'Under Maintenance'],
          ...tankers.map(t => [t.id, t.number, t.lorryType || 'General Cargo', t.ownership, t.capacity || 'N/A', t.isUnderMaintenance ? 'Yes' : 'No'])
        ];
      } else {
        values = [
          ['Driver ID', 'Full Name', 'License No', 'Rating', 'Active Status', 'Verified Contact'],
          ...drivers.map(d => [d.id, d.name, d.licenceNo || 'N/A', d.rating || 5, d.isPresent ? 'On Duty' : 'Off Duty', d.contactMob || 'N/A'])
        ];
      }

      // Append to sheet
      const updateRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadId}/values/Sheet1!A1:H${values.length}?valueInputOption=USER_ENTERED`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ values })
      });
      const updateData = await updateRes.json();
      addLog(`Appended ${updateData.updatedRows || 0} registry rows onto user's official Google Sheets.`);
      setSpreadsheets(prev => [
        { id: spreadId, name: `FleetMaster ${tableLabel} Live Sync Registry`, url: `https://docs.google.com/spreadsheets/d/${spreadId}`, lastModified: 'Just now' },
        ...prev
      ]);
    } catch (e: any) {
      addLog(`Spreadsheets failure: ${e.message || e}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Gmail: Send email updates on register / login
  const sendWorkspaceEmail = async () => {
    const confirmed = window.confirm(`Publish transaction updates and trigger outbound email to ${recipientEmail} via official Gmail SMTP API?`);
    if (!confirmed) return;

    setIsLoading(true);
    addLog(`Compiling SMTP MIME format for Gmail send targeting: ${recipientEmail}`);

    if (apiMode === 'simulation' || !accessToken) {
      setTimeout(() => {
        setIsLoading(false);
        addLog(`Gmail outbound success! Draft registered & sent on behalf of ${currentUser?.email || 'authenticated user'}`);
        setEmails(prev => [
          { id: `mail-${Date.now()}`, subject: emailSubject, sender: recipientEmail, date: 'Just now' },
          ...prev
        ]);
        alert(`Outgoing Gmail message successfully simulated to ${recipientEmail}!`);
      }, 1000);
      return;
    }

    try {
      const emailContent = [
        `To: ${recipientEmail}`,
        `Subject: ${emailSubject}`,
        'Content-Type: text/plain; charset=utf-8',
        'MIME-Version: 1.0',
        '',
        emailBody
      ].join('\r\n');

      // Base64url encode the message
      const base64Encoded = btoa(unescape(encodeURIComponent(emailContent)))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');

      const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ raw: base64Encoded })
      });
      const data = await response.json();
      if (data.id) {
        addLog(`Mailing thread spawned. Message ID: ${data.id}`);
        setEmails(prev => [
          { id: data.id, subject: emailSubject, sender: recipientEmail, date: 'Just now' },
          ...prev
        ]);
        alert(`Outbound Gmail dispatched to ${recipientEmail} successfully via Workspace relay!`);
      } else {
        addLog(`Gmail error details: ${JSON.stringify(data)}`);
      }
    } catch (e: any) {
      addLog(`Gmail API dispatch error: ${e.message || e}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Google Docs: Generate documents proposals
  const generateGoogleDocDraft = async () => {
    const confirmed = window.confirm(`Build real official cargo charter agreement on Google Docs?`);
    if (!confirmed) return;

    setIsLoading(true);
    addLog(`Generating Doc workspace payload: "Fleet Cargo Logistics Deed"`);

    if (apiMode === 'simulation' || !accessToken) {
      setTimeout(() => {
        setIsLoading(false);
        setAuthDocuments(prev => [
          { id: `doc-${Date.now()}`, title: 'Fleet Cargo Logistics Deed & LR Contract Standard', created: new Date().toISOString().substring(0,10) },
          ...prev
        ]);
        addLog(`Google Doc styled draft compiled successfully.`);
      }, 1100);
      return;
    }

    try {
      // Create Document
      const createRes = await fetch('https://docs.googleapis.com/v1/documents', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ title: 'FleetMaster Official Logistics Agreement Deed' })
      });
      const docData = await createRes.json();
      if (!docData.documentId) throw new Error('Docs layout generation rejected.');

      const docId = docData.documentId;
      addLog(`Docs asset provisioned. ID: ${docId}`);

      // Insert texts
      const updateRes = await fetch(`https://docs.googleapis.com/v1/documents/${docId}:batchUpdate`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          requests: [
            {
              insertText: {
                location: { index: 1 },
                text: `${docTemplateText}\n\nGenerated by: ${currentUser?.displayName || 'Fleet Master'} at ${new Date().toLocaleDateString()}\nStatus: Signed corporate logistics record`
              }
            }
          ]
        })
      });
      await updateRes.json();
      addLog(`Corporate paragraphs compiled on official document successfully.`);
      setAuthDocuments(prev => [
        { id: docId, title: 'FleetMaster Official Logistics Agreement Deed', created: new Date().toISOString().substring(0,10) },
        ...prev
      ]);
    } catch (e: any) {
      addLog(`Google Docs writer crash: ${e.message || e}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Google Chat: Broadcast live metrics
  const broadcastToChatSpace = async () => {
    setIsLoading(true);
    addLog(`Broadcasting message: "${chatPayload}" to connected Google Chat spaces.`);

    if (apiMode === 'simulation' || !accessToken) {
      setTimeout(() => {
        setIsLoading(false);
        addLog(`Broadcast details pushed: "[ROOM] Fleet-Dispatches-Command": "New Trip dispatch payload synchronized"`);
        alert(`Google Chat broadcast simulated successfully to live workspace room channels!`);
      }, 1000);
      return;
    }

    try {
      // Find room space
      const spaceRes = await fetch('https://chat.googleapis.com/v1/spaces', {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      const spaceData = await spaceRes.json();
      if (spaceData.spaces && spaceData.spaces.length > 0) {
        const targetSpace = spaceData.spaces[0].name;
        // Post message
        const response = await fetch(`https://chat.googleapis.com/v1/${targetSpace}/messages`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ text: chatPayload })
        });
        const msgResult = await response.json();
        addLog(`Broadcast pushed onto spaces successfully. Msg ID: ${msgResult.name || 'N/A'}`);
      } else {
        addLog(`Warning: No accessible Google Chat space rooms found for this corporate developer account.`);
      }
    } catch (e: any) {
      addLog(`Chat API Error: ${e.message || e}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Google Forms: Form registration options
  const createTripRegistrationForm = async () => {
    setIsLoading(true);
    addLog(`Creating live Trip checklist form onto master Google Drive.`);

    if (apiMode === 'simulation' || !accessToken) {
      setTimeout(() => {
        setIsLoading(false);
        setWorkspaceForms(prev => [
          { id: `form-${Date.now()}`, title: 'Daily Driver Fuel & Emission Checkup Log', url: 'https://docs.google.com/forms', responsesCount: 0 },
          ...prev
        ]);
        addLog(`Form successfully provisioned under Google Forms template.`);
      }, 1100);
      return;
    }

    try {
      // Build form
      const response = await fetch('https://forms.googleapis.com/v1/forms', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          info: {
            title: 'FleetMaster Driver Transit Checkup',
            description: 'Provide BPCL slip numbers and general fuel logging properties pre-transit.'
          }
        })
      });
      const data = await response.json();
      if (data.formId) {
        addLog(`Google Form generated. Form ID: ${data.formId}`);
        setWorkspaceForms(prev => [
          { id: data.formId, title: 'FleetMaster Driver Transit Checkup', url: data.responderUri || 'https://docs.google.com/forms', responsesCount: 0 },
          ...prev
        ]);
      } else {
        addLog(`Forms API generation query details: ${JSON.stringify(data)}`);
      }
    } catch (e: any) {
      addLog(`Forms API Error: ${e.message || e}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-[#0d1117] min-h-[85vh] text-[#c9d1d9] border border-[#30363d]/50 rounded-2xl shadow-xl overflow-hidden font-sans flex flex-col md:flex-row" id="workspace_control_main">
      
      {/* Sidebar configuration menu */}
      <div className="w-full md:w-80 bg-[#161b22] border-r border-[#30363d]/60 p-5 flex flex-col gap-6" id="workspace_sidebar">
        <div>
          <div className="flex items-center gap-2.5 mb-1.5Packed">
            <Layers className="w-5 h-5 text-blue-400" />
            <h2 className="text-sm font-semibold tracking-wide text-white">WORKSPACE CENTER</h2>
          </div>
          <p className="text-[11px] text-[#8b949e]">Enterprise level operations cockpit powered by standard Google workspace integration</p>
        </div>

        {/* User profile panel */}
        <div className="bg-[#0d1117] border border-[#30363d]/50 rounded-xl p-4 flex flex-col gap-3">
          {currentUser ? (
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2.5">
                {currentUser.photoURL ? (
                  <img src={currentUser.photoURL} alt="logo" className="w-8 h-8 rounded-full border border-blue-500/20" referrerPolicy="no-referrer" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-blue-500/10 text-blue-400 font-bold flex items-center justify-center text-xs">
                    {currentUser.displayName?.charAt(0) || 'U'}
                  </div>
                )}
                <div>
                  <h4 className="text-xs font-semibold text-white leading-tight">{currentUser.displayName}</h4>
                  <p className="text-[10px] text-gray-400 leading-normal truncate max-w-[150px]">{currentUser.email}</p>
                </div>
              </div>
              
              <div className="flex items-center justify-between mt-1 pt-2.5 border-t border-[#30363d]/40">
                <span className={`text-[10px] py-0.5 px-2 rounded-full font-semibold flex items-center gap-1 ${apiMode === 'real' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'}`}>
                  <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse"></span>
                  {apiMode === 'real' ? 'GSUITE ACTIVE' : 'SANDBOX SIMULATOR'}
                </span>
                <button 
                  onClick={handleSignOut}
                  className="text-[10px] text-zinc-400 hover:text-white underline cursor-pointer"
                >
                  Sign Out
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-3.5 items-center text-center">
              <p className="text-[11px] text-[#8b949e] leading-relaxed">OAuth configuration is verified. Pair your Google account to grant direct API scopes.</p>
              
              <button 
                onClick={handleGoogleSignIn} 
                disabled={isLoggingIn}
                className="gsi-material-button w-full cursor-pointer bg-white text-[#1f2328] hover:bg-neutral-50 px-4 py-2.5 rounded-xl border border-neutral-300 shadow-sm transition-all flex items-center justify-center gap-2 text-xs font-bold"
              >
                {isLoggingIn ? (
                  <RefreshCw className="w-4 h-4 animate-spin text-blue-600" />
                ) : (
                  <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" style={{ display: 'block', width: '16px', height: '16px' }}>
                    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                  </svg>
                )}
                <span>Sign in with Google</span>
              </button>
            </div>
          )}
        </div>

        {/* API Switcher */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-bold tracking-wider text-gray-400">ENGINE SELECTION</label>
          <div className="grid grid-cols-2 bg-[#0d1117] p-1 rounded-xl border border-[#30363d]/50 text-center">
            <button 
              onClick={() => {
                setApiMode('simulation');
                addLog("Switched active console to Developer sandbox engine.");
              }}
              className={`text-[10px] font-bold py-1.5 px-2.5 rounded-lg transition-all cursor-pointer ${apiMode === 'simulation' ? 'bg-blue-600/10 text-white' : 'text-gray-400 hover:text-white'}`}
            >
              Sandbox Sim
            </button>
            <button 
              onClick={() => {
                if (!currentUser) {
                  alert("Link your Google details via 'Sign in with Google' to enable live OAuth triggers.");
                  return;
                }
                setApiMode('real');
                addLog("Live GSuite backend activated.");
              }}
              className={`text-[10px] font-bold py-1.5 px-2.5 rounded-lg transition-all cursor-pointer ${apiMode === 'real' ? 'bg-emerald-500/15 text-emerald-400' : 'text-gray-400 hover:text-white'}`}
            >
              Live Google
            </button>
          </div>
        </div>

        {/* Workspace Suite Tabs */}
        <div className="flex flex-col gap-2 mt-2">
          <label className="text-[10px] font-bold tracking-wider text-gray-400">SELECT GOOGLE SERVICE</label>
          {[
            { id: 'drive', label: '📁 Google Drive', desc: 'Secure cloud folders' },
            { id: 'sheets', label: '📊 Google Sheets', desc: 'Excel spreadsheet registers' },
            { id: 'gmail', label: '✉️ Gmail Hub', desc: 'Outbound carrier mail' },
            { id: 'docs', label: '✍️ Google Docs', desc: 'SLA templates & deeds' },
            { id: 'chat', label: '💬 Google Chat', desc: 'Space Webhook broadcasts' },
            { id: 'forms', label: '📝 Google Forms', desc: 'Driver checking logs' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id as any)}
              className={`w-full text-left p-2.5 rounded-xl border transition-all cursor-pointer flex flex-col ${activeSubTab === tab.id ? 'bg-[#21262d] border-[#58a6ff]/40 text-white shadow-md' : 'bg-transparent border-transparent text-[#8b949e] hover:bg-[#1f242c]'}`}
            >
              <span className="text-[11px] font-bold text-left">{tab.label}</span>
              <span className="text-[8px] text-gray-500 text-left mt-0.5">{tab.desc}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Main panel displays */}
      <div className="flex-1 bg-[#0d1117] p-6 lg:p-8 flex flex-col gap-6" id="workspace_content_area">
        
        {/* Verification Alert Info */}
        <div className="bg-blue-600/10 border border-blue-500/20 rounded-2xl p-4 flex gap-3 text-xs leading-relaxed text-[#58a6ff]">
          <Info className="w-5 h-5 flex-shrink-0 text-blue-400" />
          <div className="space-y-1">
            <span className="font-bold text-white text-xs">Direct Webhooks & API Verification:</span>
            <p className="text-[11px] text-gray-300">Each action complies with GSuite authorization. For standard users without commercial GSuite accounts, we offer a <strong className="text-white">"Sandbox Sim"</strong> mode to fully emulate documents creation, spreadsheet uploads, and SMTP messages safely in local storage.</p>
          </div>
        </div>

        <div className="flex-1 bg-[#161b22] border border-[#30363d]/50 rounded-2xl p-6 shadow-inner flex flex-col gap-5">
          <AnimatePresence mode="wait">
            
            {/* Google Drive Tab */}
            {activeSubTab === 'drive' && (
              <motion.div 
                key="drive" 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-5"
              >
                <div className="flex items-center justify-between border-b border-[#30363d]/50 pb-3">
                  <div>
                    <h3 className="text-white text-sm font-semibold flex items-center gap-1.5">📁 Google Drive Cloud Explorer</h3>
                    <p className="text-[11px] text-gray-400 mt-0.5">List files, secure directories, and spawn custom storage folders per cargo trip.</p>
                  </div>
                  <button 
                    onClick={fetchDriveFiles}
                    disabled={isLoading}
                    className="p-1.5 hover:bg-[#30363d] rounded-lg text-gray-400 hover:text-white transition-all cursor-pointer flex items-center gap-1.5 text-[11px] border border-[#30363d]"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                    Sync Files
                  </button>
                </div>

                <div className="bg-[#0d1117] border border-[#30363d]/50 rounded-xl p-4 flex flex-col sm:flex-row items-center gap-3">
                  <div className="flex-1 w-full">
                    <label className="text-[10px] font-bold tracking-wider text-gray-400">PROVISION TRIP STORAGE DIRECTORY</label>
                    <input 
                      type="text"
                      value={newFolderName}
                      onChange={e => setNewFolderName(e.target.value)}
                      placeholder="e.g. Trip_LR_1024_TN38P9012"
                      className="w-full bg-[#161b22] border border-[#30363d] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500 mt-1"
                    />
                  </div>
                  <button 
                    onClick={createDriverFolderOnDrive}
                    className="w-full sm:w-auto mt-4 sm:mt-5 bg-blue-600 hover:bg-blue-500 text-white font-bold px-4 py-2 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                  >
                    <FolderPlus className="w-4 h-4" />
                    Create directory
                  </button>
                </div>

                <div className="space-y-2">
                  <h4 className="text-xs font-semibold text-gray-300">CLOUD STORAGE DIRECTORY LIST</h4>
                  <div className="bg-[#0d1117] border border-[#30363d]/50 rounded-xl overflow-hidden divide-y divide-[#30363d]/50">
                    {driveFiles.map(file => (
                      <div key={file.id} className="p-3 flex items-center justify-between text-xs hover:bg-[#161b22]/40 transition-all">
                        <div className="flex items-center gap-2.5 truncate">
                          <span className="p-1.5 bg-blue-500/10 text-blue-400 rounded">📁</span>
                          <div className="truncate">
                            <span className="font-semibold text-white block truncate">{file.name}</span>
                            <span className="text-[9px] text-gray-500">{file.mimeType.includes('folder') ? 'Workspace Directory' : file.mimeType}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-4 flex-shrink-0 text-[10px] text-gray-500">
                          <span>{file.size}</span>
                          <span>{file.createdTime}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {/* Google Sheets Tab */}
            {activeSubTab === 'sheets' && (
              <motion.div 
                key="sheets" 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-5"
              >
                <div className="flex items-center justify-between border-b border-[#30363d]/50 pb-3">
                  <div>
                    <h3 className="text-white text-sm font-semibold flex items-center gap-1.5">📊 Google Sheets Live Registers</h3>
                    <p className="text-[11px] text-gray-400 mt-0.5">Export and dynamically sync active fleet databases into formatted workbook rows.</p>
                  </div>
                </div>

                <div className="bg-[#0d1117] border border-[#30363d]/50 rounded-xl p-4 space-y-4">
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {[
                      { id: 'trips', label: 'Active Trips', count: trips.length },
                      { id: 'tankers', label: 'Logistics Tankers', count: tankers.length },
                      { id: 'drivers', label: 'Active Drivers', count: drivers.length }
                    ].map(tableOption => (
                      <button
                        key={tableOption.id}
                        onClick={() => setExportSelectedTable(tableOption.id as any)}
                        className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col gap-1 ${exportSelectedTable === tableOption.id ? 'bg-blue-600/10 border-blue-500/40 text-blue-400' : 'bg-[#161b22] border-[#30363d]/50 text-gray-400 hover:bg-[#1a202a]'}`}
                      >
                        <span className="text-xs font-bold">{tableOption.label}</span>
                        <span className="text-[10px] text-zinc-500">{tableOption.count} items recorded</span>
                      </button>
                    ))}
                  </div>

                  <div className="flex justify-end pt-2">
                    <button 
                      onClick={exportDataToSheets}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold p-2.5 rounded-xl text-xs flex items-center gap-1.5 cursor-pointer transition-all"
                    >
                      <FileSpreadsheet className="w-4 h-4" />
                      Build & Append Rows to Active Google Sheet
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="text-xs font-semibold text-gray-300">ACTIVE SHEETS INSTANCES</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {spreadsheets.map(sheet => (
                      <div key={sheet.id} className="bg-[#0d1117] border border-[#30363d]/50 p-3.5 rounded-xl flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2 truncate">
                          <span className="text-lg">📊</span>
                          <div className="truncate">
                            <span className="font-semibold text-white block truncate">{sheet.name}</span>
                            <span className="text-[9px] text-gray-500">Modified: {sheet.lastModified}</span>
                          </div>
                        </div>
                        <a 
                          href={sheet.url}
                          target="_blank"
                          rel="noreferrer"
                          className="p-1 text-gray-400 hover:text-white border border-[#30363d] rounded"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {/* Gmail Hub */}
            {activeSubTab === 'gmail' && (
              <motion.div 
                key="gmail" 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-5"
              >
                <div className="flex items-center justify-between border-b border-[#30363d]/50 pb-3">
                  <div>
                    <h3 className="text-white text-sm font-semibold flex items-center gap-1.5">✉️ Gmail Outbound Transport Hub</h3>
                    <p className="text-[11px] text-gray-400 mt-0.5">Send official platform updates or alerts directly using the authenticated active Gmail account.</p>
                  </div>
                </div>

                <div className="space-y-3.5 bg-[#0d1117] border border-[#30363d]/50 p-4 rounded-xl">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[9px] font-bold tracking-wider text-gray-400">TO ADDRESS</label>
                      <input 
                        type="email"
                        value={recipientEmail}
                        onChange={e => setRecipientEmail(e.target.value)}
                        className="w-full bg-[#161b22] border border-[#30363d] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500 mt-1"
                      />
                    </div>
                    <div>
                      <label className="text-[9px] font-bold tracking-wider text-gray-400">SUBJECT LINE</label>
                      <input 
                        type="text"
                        value={emailSubject}
                        onChange={e => setEmailSubject(e.target.value)}
                        className="w-full bg-[#161b22] border border-[#30363d] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500 mt-1"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[9px] font-bold tracking-wider text-gray-400">EMAIL BODY CONTENT</label>
                    <textarea 
                      value={emailBody}
                      onChange={e => setEmailBody(e.target.value)}
                      rows={3}
                      className="w-full bg-[#161b22] border border-[#30363d] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500 mt-1 resize-none"
                    />
                  </div>

                  <div className="flex justify-end pt-1">
                    <button 
                      onClick={sendWorkspaceEmail}
                      className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 transition-all cursor-pointer"
                    >
                      <Mail className="w-4 h-4" />
                      Send secure Gmail Alert
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="text-xs font-semibold text-gray-300">RECENT DISPATCH EMAILS</h4>
                  <div className="bg-[#0d1117] border border-[#30363d]/50 rounded-xl overflow-hidden divide-y divide-[#30363d]/40">
                    {emails.map(email => (
                      <div key={email.id} className="p-3 text-xs flex items-center justify-between hover:bg-[#161b22]/30 transition-all">
                        <div className="flex items-center gap-2 truncate">
                          <span className="p-1 bg-zinc-800 text-[#8b949e] rounded">✉️</span>
                          <div className="truncate">
                            <span className="font-semibold text-white block truncate">{email.subject}</span>
                            <span className="text-[10px] text-gray-500">To: {email.sender}</span>
                          </div>
                        </div>
                        <div className="text-[10px] text-gray-500">{email.date}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {/* Google Docs */}
            {activeSubTab === 'docs' && (
              <motion.div 
                key="docs" 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-5"
              >
                <div className="flex items-center justify-between border-b border-[#30363d]/50 pb-3">
                  <div>
                    <h3 className="text-white text-sm font-semibold flex items-center gap-1.5">✍️ Google Docs SLA Generator</h3>
                    <p className="text-[11px] text-gray-400 mt-0.5">Generate cargo transit agreements, road guidelines or Lorry Receipt templates on Docs.</p>
                  </div>
                </div>

                <div className="bg-[#0d1117] border border-[#30363d]/50 p-4 rounded-xl space-y-3.5">
                  <div>
                    <label className="text-[9px] font-bold tracking-wider text-gray-400">DOCUMENT CUSTOM STATEMENT</label>
                    <textarea 
                      value={docTemplateText}
                      onChange={e => setDocTemplateText(e.target.value)}
                      rows={3}
                      className="w-full bg-[#161b22] border border-[#30363d] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500 mt-1 resize-none"
                    />
                  </div>

                  <div className="flex justify-end pt-1">
                    <button 
                      onClick={generateGoogleDocDraft}
                      className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 transition-all cursor-pointer"
                    >
                      <FileText className="w-4 h-4" />
                      Create styled draft on Docs
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="text-xs font-semibold text-gray-300">RECENTLY PROVISIONED SLA DOCUMENTS</h4>
                  <div className="bg-[#0d1117] border border-[#30363d]/55 rounded-xl overflow-hidden divide-y divide-[#30363d]/40">
                    {authDocuments.map(doc => (
                      <div key={doc.id} className="p-3 fs-xs flex items-center justify-between hover:bg-[#161b22]/30 transition-all">
                        <div className="flex items-center gap-2 truncate">
                          <span className="p-1 bg-[#1f242c] text-blue-400 rounded">📝</span>
                          <span className="font-semibold text-white truncate text-xs">{doc.title}</span>
                        </div>
                        <span className="text-[10px] text-[#8b949e] flex-shrink-0">{doc.created}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {/* Google Chat */}
            {activeSubTab === 'chat' && (
              <motion.div 
                key="chat" 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-5"
              >
                <div className="flex items-center justify-between border-b border-[#30363d]/50 pb-3">
                  <div>
                    <h3 className="text-white text-sm font-semibold flex items-center gap-1.5">💬 Google Chat Commander</h3>
                    <p className="text-[11px] text-gray-400 mt-0.5">Broadcast system logs, shortage status, or RTO warnings directly to corporate Chat rooms.</p>
                  </div>
                </div>

                <div className="bg-[#0d1117] border border-[#30363d]/50 p-4 rounded-xl space-y-3.5">
                  <div>
                    <label className="text-[9px] font-bold tracking-wider text-gray-400">BROADCAST PAYLOAD MESSAGE</label>
                    <textarea 
                      value={chatPayload}
                      onChange={e => setChatPayload(e.target.value)}
                      rows={3}
                      className="w-full bg-[#161b22] border border-[#30363d] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500 mt-1 resize-none"
                    />
                  </div>

                  <div className="flex justify-end pt-1">
                    <button 
                      onClick={broadcastToChatSpace}
                      className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 transition-all cursor-pointer"
                    >
                      <MessageSquare className="w-4 h-4" />
                      Broadcast message
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="text-xs font-semibold text-gray-300">ACCESSIBLE CORPORATE CHAT ROOM SPACES</h4>
                  <div className="bg-[#0d1117] border border-[#30363d]/50 rounded-xl divide-y divide-[#30363d]/40">
                    {chatSpaces.map(space => (
                      <div key={space.name} className="p-3 text-xs flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-emerald-400 font-bold">●</span>
                          <span className="font-semibold text-white">{space.displayName}</span>
                        </div>
                        <span className="text-[9px] bg-[#30363d] text-gray-300 px-2.5 py-0.5 rounded-lg">{space.type}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {/* Google Forms / WhatsApp Register */}
            {activeSubTab === 'forms' && (
              <motion.div 
                key="forms" 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-5"
              >
                <div className="flex items-center justify-between border-b border-[#30363d]/50 pb-3">
                  <div>
                    <h3 className="text-white text-sm font-semibold flex items-center gap-1.5">📝 Google Forms Logistics Sync</h3>
                    <p className="text-[11px] text-gray-400 mt-0.5 font-sans">Deploy fuel tracking forms for drivers to self-report BPCL entries instantly.</p>
                  </div>
                </div>

                {/* Free dynamic WhatsApp dispatch box */}
                <div className="bg-emerald-950/20 border border-emerald-500/20 rounded-2xl p-5 space-y-4">
                  <div className="flex items-center gap-2">
                    <Smartphone className="w-5 h-5 text-emerald-400" />
                    <div>
                      <span className="font-bold text-emerald-400 text-xs block">🆓 FREE SETUP: WHATSAPP DEEP-LINK DISPATCH PANEL</span>
                      <span className="text-[9px] text-[#8b949e]">Instantly dispatch running trip particulars to drivers. Zero Twilio cost required.</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    <div>
                      <label className="text-[9px] font-bold text-gray-400 block mb-1">SELECT ACTIVE TRIP TO DISPATCH</label>
                      <select 
                        value={selectedTripForWhatsApp}
                        onChange={e => setSelectedTripForWhatsApp(e.target.value)}
                        className="w-full bg-[#0d1117] border border-[#30363d] rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                      >
                        <option value="">-- Choose Trip --</option>
                        {trips.map(t => (
                          <option key={t.id} value={t.id}>{t.tankerNumber} - {t.driverName} ({t.placeFrom} ➔ {t.placeTo})</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-[9px] font-bold text-gray-400 block mb-1">DRIVER WHATSAPP MOBILE NUMBER</label>
                      <input 
                        type="text"
                        value={customWhatsAppPhone}
                        onChange={e => setCustomWhatsAppPhone(e.target.value)}
                        placeholder="+919723781353"
                        className="w-full bg-[#0d1117] border border-[#30363d] rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="flex justify-between items-center gap-3 bg-[#0d1117] p-3 rounded-xl border border-[#30363d]/50">
                    <div className="truncate text-[10px] text-gray-400 font-mono">
                      {whatsAppLink.substring(0, 75)}...
                    </div>
                    <a 
                      href={whatsAppLink}
                      target="_blank"
                      rel="noreferrer"
                      className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2 px-3.5 rounded-xl text-xs flex items-center gap-1.5 cursor-pointer whitespace-nowrap transition-all"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                      Dispatch via WhatsApp
                    </a>
                  </div>
                </div>

                <div className="bg-[#0d1117] border border-[#30363d]/50 p-4 rounded-xl space-y-3.5">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-bold text-white text-xs block">DRIVER FUEL SURVEY CHECKS</span>
                      <span className="text-[9px] text-gray-400 leading-normal">Generate checking forms directly in Drive logs folder.</span>
                    </div>
                    <button 
                      onClick={createTripRegistrationForm}
                      className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-3 py-1.5 rounded-xl text-xs flex items-center gap-1 transition-all cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Spawn Form
                    </button>
                  </div>

                  <div className="divide-y divide-[#30363d]/40">
                    {workspaceForms.map(form => (
                      <div key={form.id} className="py-2.5 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2 truncate">
                          <span className="text-purple-400 text-base">📝</span>
                          <span className="font-semibold text-white truncate">{form.title}</span>
                        </div>
                        <a 
                          href={form.url}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-1 hover:text-white text-gray-400 text-[10px] bg-zinc-800 border border-[#30363d] px-2.5 py-1 rounded"
                        >
                          View Live
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Workspace Action Log Feed */}
        <div className="bg-[#161b22] border border-[#30363d]/50 rounded-2xl p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold tracking-wider text-gray-400">REALTIME WORKSPACE ACTIVITY LOGS</span>
            <button 
              onClick={() => setLogs([])}
              className="text-[9px] text-zinc-500 hover:text-white cursor-pointer"
            >
              Clear Logs
            </button>
          </div>
          <div className="bg-[#0d1117] border border-[#30363d]/40 rounded-xl p-3 h-28 overflow-y-auto font-mono text-[10px] text-zinc-400 space-y-1">
            {logs.length === 0 ? (
              <span className="text-zinc-600 italic">No activity recorded yet for Workspace session.</span>
            ) : (
              logs.map((log, index) => (
                <div key={index} className="truncate">{log}</div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
