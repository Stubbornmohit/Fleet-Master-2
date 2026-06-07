import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sparkles, MessageSquare, Compass, ShieldAlert, Bot, ArrowRight, 
  Send, AlertTriangle, AlertCircle, Coins, Landmark, Calendar, 
  TrendingUp, HardDrive, RefreshCw, FileText, CheckCircle2, Copy 
} from 'lucide-react';
import { Tanker, Driver, LorryReceipt, Trip, MaintenanceBill, TankerExpense } from '../types';

interface AICabinProps {
  tankers: Tanker[];
  drivers: Driver[];
  lrs: LorryReceipt[];
  trips: Trip[];
  bills: MaintenanceBill[];
  expenses: TankerExpense[];
}

interface ChatMessage {
  role: 'user' | 'model';
  content: string;
}

export default function AICabin({ tankers, drivers, lrs, trips, bills, expenses }: AICabinProps) {
  const [activeSubTab, setActiveSubTab] = useState<'chat' | 'route' | 'finance' | 'health'>('chat');

  // Grounded Chat State
  const [chatInput, setChatInput] = useState('');
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([
    {
      role: 'model',
      content: "Hello! I am **Aditya**, your Chemical Fleet Operations Counselor. I have loaded your live fleet database (${tankers.length} Tankers, ${drivers.length} Drivers, ${trips.length} Trips). Ask me anything, or query details about expiring permits, route profits, or driver logs."
    }
  ]);
  const [isChatLoading, setIsChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Route Advisory State
  const [routeFrom, setRouteFrom] = useState('Ranoli Refinery');
  const [routeTo, setRouteTo] = useState('Hazira Port Complex');
  const [routeLoad, setRouteLoad] = useState('25');
  const [routeProduct, setRouteProduct] = useState('Liquid Ammonia (Cryogenic)');
  const [routeReport, setRouteReport] = useState<string>('');
  const [isRouteLoading, setIsRouteLoading] = useState(false);

  // Financial Auditor State
  const [financeReport, setFinanceReport] = useState<string>('');
  const [isFinanceLoading, setIsFinanceLoading] = useState(false);

  // Health Prediction Log State
  const [selectedTankerId, setSelectedTankerId] = useState('');

  // Auto Scroll Chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory, isChatLoading]);

  // Suggested prompts
  const suggestedPrompts = [
    { label: "🔍 Check Expiring Permits", prompt: "Summarize all tankers with expiring RC, Fitness, or Permit documents in the next 30 days and write warning messages for their drivers." },
    { label: "⛽ High Diesel Costs Analysis", prompt: "Which tankers are consuming the most fuel relative to their route weight? Suggest fuel economy actions." },
    { label: "📈 Top Profit Routes", prompt: "Evaluate the profitability of routes and let me know which combinations (From -> To) generated the highest margins." },
    { label: "✍️ Draft Driver Caution Notice", prompt: "Draft an urgent WhatsApp/SMS caution alert for drivers handling cryogenic chemicals under monsoon warning conditions." }
  ];

  // Markdown styling renderer function
  const renderFormattedMarkdown = (text: string) => {
    if (!text) return null;
    const lines = text.split('\n');
    return lines.map((line, idx) => {
      // Headers
      if (line.startsWith('### ')) {
        return <h4 key={idx} className="text-sm font-black text-rose-300 mt-4 mb-2 tracking-tight uppercase font-sans border-b border-white/[0.04] pb-1">{line.replace('### ', '')}</h4>;
      }
      if (line.startsWith('## ')) {
        return <h3 key={idx} className="text-base font-black text-white mt-5 mb-2.5 tracking-tight uppercase font-sans border-b border-[#ff5a1f]/15 pb-1 flex items-center gap-2">✨ {line.replace('## ', '')}</h3>;
      }
      if (line.startsWith('# ')) {
        return <h2 key={idx} className="text-lg font-black text-white mt-6 mb-3 tracking-tight uppercase font-sans flex items-center gap-2">{line.replace('# ', '')}</h2>;
      }

      // Bullets
      if (line.startsWith('- ') || line.startsWith('* ')) {
        const cleanContent = line.substring(2);
        return (
          <div key={idx} className="pl-5 pr-2 py-1 flex items-start gap-2 text-[13.5px] leading-relaxed text-gray-300 font-sans">
            <span className="text-[#ff5a1f] mt-1.5 shrink-0 select-none text-[8px]">●</span>
            <span dangerouslySetInnerHTML={{ __html: formatInlineStyles(cleanContent) }} />
          </div>
        );
      }

      // Ordered list numbered
      const numMatch = line.match(/^(\d+)\.\s(.*)/);
      if (numMatch) {
        return (
          <div key={idx} className="pl-4 pr-2 py-1.5 flex items-start gap-2.5 text-[13.5px] leading-relaxed text-gray-300">
            <span className="font-mono font-bold text-cyan-400 text-xs mt-0.5 shrink-0">{numMatch[1]}.</span>
            <span dangerouslySetInnerHTML={{ __html: formatInlineStyles(numMatch[2]) }} />
          </div>
        );
      }

      // Empty spacing
      if (line.trim() === '') {
        return <div key={idx} className="h-2" />;
      }

      // Default paragraph
      return (
        <p key={idx} className="text-[13.5px] leading-relaxed text-gray-300 font-sans my-1" dangerouslySetInnerHTML={{ __html: formatInlineStyles(line) }} />
      );
    });
  };

  const formatInlineStyles = (src: string) => {
    // Bold replaces
    let formatted = src.replace(/\*\*(.*?)\*\*/g, '<strong class="text-white font-bold">$1</strong>');
    // Code block highlights
    formatted = formatted.replace(/`(.*?)`/g, '<code class="bg-black/40 border border-white/[0.08] px-1.5 py-0.5 rounded font-mono text-cyan-300 text-[11.5px]">$1</code>');
    return formatted;
  };

  // 🗣 Grounded Chat Execute
  const handleSendChat = async (promptText?: string) => {
    const query = (promptText || chatInput).trim();
    if (!query) return;

    if (!promptText) {
      setChatInput('');
    }

    const newUserMessage: ChatMessage = { role: 'user', content: query };
    setChatHistory(prev => [...prev, newUserMessage]);
    setIsChatLoading(true);

    try {
      // Compile RAG databases as lightweight serialized structures
      const contextBundle = {
        tankers: tankers.map(t => ({
          id: t.id,
          tankerNumber: t.tankerNumber,
          status: t.status,
          partsCount: t.parts?.length || 0,
          expirations: {
            rc: t.expirations?.rc || 'N/A',
            fitness: t.expirations?.fitness || 'N/A',
            calibration: t.expirations?.calibration || 'N/A',
            permit: t.expirations?.permit || 'N/A'
          }
        })),
        drivers: drivers.map(d => ({
          id: d.id,
          name: d.name,
          contact: d.contactNumber,
          status: d.status
        })),
        lrsCount: lrs.length,
        trips: trips.map(t => ({
          id: t.id,
          lrNo: t.lrNo,
          tankerNumber: t.tankerNumber,
          driverName: t.driverName,
          from: t.placeFrom,
          to: t.placeTo,
          status: t.status,
          profit: t.profit || 0,
          loadingWeight: t.loadingWeight || t.qty
        })),
        outstandingMaintenanceBills: bills.filter(b => b.status === 'pending').map(b => ({
          id: b.id,
          billNo: b.billNo,
          vendor: b.vendorName,
          amount: b.amount,
          date: b.date
        })),
        recentExpensesAmount: expenses.reduce((sum, e) => sum + e.amount, 0)
      };

      const cleanHistory = chatHistory.slice(-12); // Send last 12 messages to keep payload compact

      const response = await fetch('/api/ai/cabin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          task: 'chat',
          message: query,
          chatHistory: cleanHistory,
          context: contextBundle
        })
      });

      const data = await response.json();
      if (data.success) {
        setChatHistory(prev => [...prev, { role: 'model', content: data.text }]);
      } else {
        setChatHistory(prev => [...prev, { role: 'model', content: `⚠️ **Server configuration notice**: ${data.error}` }]);
      }
    } catch (err: any) {
      setChatHistory(prev => [...prev, { role: 'model', content: `❌ Failed to receive connection from counselor server: ${err.message}` }]);
    } finally {
      setIsChatLoading(false);
    }
  };

  // 🧭 Compute Route Advisory
  const computeRouteAdvisory = async () => {
    setIsRouteLoading(true);
    setRouteReport('');

    try {
      const response = await fetch('/api/ai/cabin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          task: 'route-advisory',
          routeInfo: {
            placeFrom: routeFrom,
            placeTo: routeTo,
            loadWeight: routeLoad,
            productType: routeProduct
          }
        })
      });

      const data = await response.json();
      if (data.success) {
        setRouteReport(data.text);
      } else {
        setRouteReport(`⚠️ **Error formulating advisory report**: ${data.error}`);
      }
    } catch (err: any) {
      setRouteReport(`❌ Connection severed: ${err.message}`);
    } finally {
      setIsRouteLoading(false);
    }
  };

  // 💸 Audit Profit Leakages
  const computeFinancialAudit = async () => {
    setIsFinanceLoading(true);
    setFinanceReport('');

    try {
      // Formulate detailed accounting aggregates
      const aggregatedPnlData = {
        totalRevenue: trips.reduce((sum, t) => sum + ((t.loadingWeight || t.qty) * (t.freightRateAtEnd || 0)), 0),
        totalExpenses: trips.reduce((sum, t) => sum + (t.fuelExpense || 0) + (t.driverCharge || 0) + (t.tollExpense || 0) + (t.repairExpense || 0) + (t.adblueExpense || 0) + (t.otherExpense || 0), 0) + expenses.reduce((sum, e) => sum + e.amount, 0),
        tripsBreakdown: trips.slice(-6).map(t => ({
          route: `${t.placeFrom} -> ${t.placeTo}`,
          freightRevenue: (t.loadingWeight || t.qty) * (t.freightRateAtEnd || 0),
          fuelCost: t.fuelExpense || 0,
          tollCost: t.tollExpense || 0,
          driverCost: t.driverCharge || 0,
          repairCost: t.repairExpense || 0,
          profit: t.profit || 0
        })),
        pendingVoucherBills: bills.filter(b => b.status === 'pending').map(b => ({
          vendor: b.vendorName,
          amount: b.amount,
          category: b.category
        })),
        generalExpensesSummary: expenses.slice(-10).map(e => ({
          category: e.category,
          amount: e.amount,
          vendor: e.vendorName
        }))
      };

      const response = await fetch('/api/ai/cabin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          task: 'financial-pnl',
          financeInfo: aggregatedPnlData
        })
      });

      const data = await response.json();
      if (data.success) {
        setFinanceReport(data.text);
      } else {
        setFinanceReport(`### Operational Financial Diagnostic Failed\n${data.error}`);
      }
    } catch (err: any) {
      setFinanceReport(`### Connection Lost\n${err.message}`);
    } finally {
      setIsFinanceLoading(false);
    }
  };

  // Run initial finance query on screen switch
  useEffect(() => {
    if (activeSubTab === 'finance' && !financeReport) {
      computeFinancialAudit();
    }
  }, [activeSubTab]);

  // Compute expirations warnings for health subtab
  const currentDate = new Date('2026-05-23');
  const getExpirationWarnings = () => {
    const list: Array<{ tanker: string; type: string; daysLeft: number; date: string; relativeClass: string }> = [];
    tankers.forEach(t => {
      if (t.expirations) {
        Object.entries(t.expirations).forEach(([key, val]) => {
          if (val) {
            const expDate = new Date(val);
            const diffTime = expDate.getTime() - currentDate.getTime();
            const daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            if (daysLeft < 45) {
              list.push({
                tanker: t.tankerNumber,
                type: key.toUpperCase(),
                daysLeft,
                date: val,
                relativeClass: daysLeft < 0 ? 'bg-red-500/10 text-red-400 border border-red-500/20' : daysLeft < 15 ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
              });
            }
          }
        });
      }
    });
    return list.sort((a,b) => a.daysLeft - b.daysLeft);
  };

  const expirationAlerts = getExpirationWarnings();

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    alert("Response copied to clipboard!");
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">
      
      {/* Visual Header Grid Panel */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#121010]/90 border border-white/[0.04] rounded-2xl p-6 shadow-xl">
        <div className="space-y-1.5 text-left">
          <div className="text-[10px] font-mono text-[#ff7a4e] font-extrabold uppercase tracking-widest flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#ff5a1f] animate-ping" />
            AI COGNITIVE CABIN
          </div>
          <h2 className="text-xl font-black text-white tracking-tight">Autonomous Command Intelligence</h2>
          <p className="text-xs text-gray-400 font-sans max-w-xl">
            Stream, diagnose, and optimize chemical Logistics. High-fidelity reasoning powered by Gemini.
          </p>
        </div>

        {/* Live database stats pill */}
        <div className="flex items-center gap-3.5 bg-black/40 border border-white/[0.05] rounded-xl px-4 py-3 font-mono text-[11px] self-start md:self-auto">
          <HardDrive className="w-5 h-5 text-emerald-400 animate-pulse" />
          <div className="text-left space-y-0.5">
            <span className="text-gray-500 block uppercase font-bold tracking-wider leading-none text-[9.5px]">Data Lake Integration</span>
            <span className="text-emerald-400 font-extrabold text-[12px]">{tankers.length + drivers.length + trips.length + bills.length} items grounded</span>
          </div>
        </div>
      </div>

      {/* Primary Sub-Navigation inside the Cabin */}
      <div className="flex flex-wrap items-center gap-2.5 border-b border-white/[0.04] pb-4">
        {[
          { id: 'chat', label: '🗣 Aditya AI Counselor', icon: MessageSquare },
          { id: 'route', label: '🧭 Smart Hazards Radar', icon: Compass },
          { id: 'finance', label: '💸 CFO Operations Audit', icon: Coins },
          { id: 'health', label: '🔬 Preventive Health Forecasts', icon: ShieldAlert }
        ].map((subTab) => {
          const Icon = subTab.icon;
          const isSelected = activeSubTab === subTab.id;
          return (
            <button
              key={subTab.id}
              onClick={() => setActiveSubTab(subTab.id as any)}
              className={`px-4.5 py-3 rounded-xl text-xs font-bold flex items-center gap-2.5 transition-all border cursor-pointer ${
                isSelected 
                  ? 'bg-gradient-to-r from-[#ff5a1f] to-[#ff7a4e] text-white shadow-[#ff5a1f]/10 border-transparent' 
                  : 'bg-[#121010]/50 border-white/[0.03] text-gray-400 hover:text-white hover:border-white/[0.08]'
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span>{subTab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Main Dashboard Layout Workframe */}
      <div className="grid grid-cols-1 lg:col-span-12 gap-6 min-h-[450px]">
        
        <AnimatePresence mode="wait">
          
          {/* TAB 1: Conversational RAG Q&A Assistant */}
          {activeSubTab === 'chat' && (
            <motion.div
              key="chat"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="grid grid-cols-1 lg:grid-cols-12 gap-6"
            >
              {/* Chat Thread Panel */}
              <div className="lg:col-span-8 bg-[#121010]/80 border border-white/[0.04] rounded-2xl flex flex-col h-[525px] overflow-hidden shadow-2xl relative">
                
                {/* Chat Top header */}
                <div className="border-b border-white/[0.04] bg-black/40 px-5 py-3.5 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
                    <div>
                      <span className="text-[10px] font-mono font-bold text-gray-500 uppercase block tracking-wider leading-none">Console Assistant</span>
                      <span className="text-xs font-black text-white leading-none">Counselor Aditya (Active Grounded Mode)</span>
                    </div>
                  </div>

                  <span className="text-[9.5px] font-mono text-cyan-400 bg-cyan-400/10 px-2 py-0.5 rounded-full select-none uppercase font-bold">
                    Model: gemini-3.5-flash
                  </span>
                </div>

                {/* Messages Scroller */}
                <div className="flex-1 overflow-y-auto p-5 space-y-4 text-left scrollbar-thin scroll-smooth">
                  {chatHistory.map((msg, index) => {
                    const isModel = msg.role === 'model';
                    return (
                      <div 
                        key={index} 
                        className={`flex gap-3.5 ${isModel ? 'justify-start' : 'justify-end'}`}
                      >
                        {isModel && (
                          <div className="w-8 h-8 rounded-xl bg-gradient-to-r from-[#ff5a1f] to-rose-600 flex items-center justify-center shrink-0 shadow-lg text-white">
                            <Bot className="w-4 h-4" />
                          </div>
                        )}
                        <div className={`max-w-[85%] rounded-2xl p-4 text-[13.5px] border ${
                          isModel 
                            ? 'bg-[#181515] border-white/[0.03] text-gray-200' 
                            : 'bg-gradient-to-br from-[#ff5a1f]/15 to-transparent border-[#ff5a1f]/30 text-white'
                        }`}>
                          <div className="prose prose-invert max-w-none space-y-2">
                            {renderFormattedMarkdown(msg.content)}
                          </div>
                          {isModel && index > 0 && (
                            <div className="flex justify-end mt-2">
                              <button 
                                onClick={() => handleCopy(msg.content)}
                                className="p-1 text-gray-500 hover:text-white transition-colors cursor-pointer text-[10px] font-mono flex items-center gap-1.5 uppercase"
                                title="Copy response to clipboard"
                              >
                                <Copy className="w-3 h-3" />
                                Copy text
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}

                  {isChatLoading && (
                    <div className="flex gap-3.5 justify-start">
                      <div className="w-8 h-8 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 flex items-center justify-center shrink-0 animate-spin text-white">
                        <RefreshCw className="w-4 h-4" />
                      </div>
                      <div className="bg-[#181515] border border-white/[0.03] rounded-2xl p-4 text-xs font-mono text-cyan-400 flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-bounce" />
                        Aditya is crawling data lake models and structuring logs...
                      </div>
                    </div>
                  )}

                  <div ref={chatEndRef} />
                </div>

                {/* Input form */}
                <form 
                  onSubmit={(e) => { e.preventDefault(); handleSendChat(); }}
                  className="border-t border-white/[0.04] bg-black/40 p-4.5 flex items-center gap-3"
                >
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="Ask about drivers, expiring permits, high load profits..."
                    className="flex-1 bg-[#0d1013] border border-white/[0.05] rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:ring-1 focus:ring-[#ff5a1f] placeholder-gray-600 font-sans"
                    disabled={isChatLoading}
                  />
                  <button
                    type="submit"
                    className="p-3 bg-gradient-to-r from-[#ff5a1f] to-[#ff7a4e] text-white rounded-xl hover:brightness-110 active:scale-95 cursor-pointer disabled:opacity-40"
                    disabled={isChatLoading || !chatInput.trim()}
                  >
                    <Send className="w-4.5 h-4.5" />
                  </button>
                </form>
              </div>

              {/* suggested templates panel */}
              <div className="lg:col-span-4 flex flex-col gap-5 text-left">
                <div className="bg-[#121010]/80 border border-white/[0.04] rounded-2xl p-5 space-y-4 shadow-xl">
                  <span className="text-[10px] font-mono text-[#ff5a1f] font-bold uppercase tracking-widest block">
                    ⚡ QUICK INTEGRATED QUERIES
                  </span>
                  <p className="text-xs text-gray-400">
                    Click any quick intelligence query below. It immediately reads state arrays and outputs tailored strategic insights.
                  </p>

                  <div className="space-y-3 pt-1">
                    {suggestedPrompts.map((p, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleSendChat(p.prompt)}
                        className="w-full text-left p-3.5 rounded-xl border border-white/[0.03] bg-white/[0.01] hover:bg-white/[0.04] text-xs font-semibold text-gray-300 hover:text-white hover:border-[#ff5a1f]/20 transition-all cursor-pointer flex flex-col gap-1 pr-6 relative group"
                        disabled={isChatLoading}
                      >
                        <span className="text-[#ff7a4e]">{p.label}</span>
                        <span className="text-[10.5px] text-gray-500 font-sans line-clamp-1 group-hover:text-gray-400">
                          {p.prompt}
                        </span>
                        <ArrowRight className="w-3 h-3 text-gray-600 group-hover:text-[#ff5a1f] absolute right-3 top-1/2 -translate-y-1/2 transition-colors" />
                      </button>
                    ))}
                  </div>
                </div>

                <div className="bg-[#121010]/80 border border-white/[0.04] rounded-2xl p-5 text-xs font-mono space-y-3">
                  <span className="text-gray-500 uppercase font-bold block text-[9.5px]">Cabin Intelligence Metrics</span>
                  <div className="grid grid-cols-2 gap-3.5">
                    <div className="p-3 bg-black/40 rounded-xl border border-white/[0.03]">
                      <span className="text-[14px] font-black text-rose-400 block">{tankers.length}</span>
                      <span className="text-[9px] text-gray-550 uppercase">Tankers Tracked</span>
                    </div>
                    <div className="p-3 bg-black/40 rounded-xl border border-white/[0.03]">
                      <span className="text-[14px] font-black text-cyan-400 block">{trips.length}</span>
                      <span className="text-[9px] text-gray-550 uppercase">Active Logistics</span>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* TAB 2: Smart Hazards & Safety Road Advisor */}
          {activeSubTab === 'route' && (
            <motion.div
              key="route"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="grid grid-cols-1 lg:grid-cols-12 gap-6 text-left"
            >
              {/* Controls Column */}
              <div className="lg:col-span-5 bg-[#121010]/80 border border-white/[0.04] rounded-2xl p-5 space-y-4 shadow-xl self-start">
                <div className="space-y-0.5">
                  <span className="text-[10px] font-mono text-cyan-400 font-extrabold uppercase tracking-widest block">
                    🧭 Route Safety Counselor
                  </span>
                  <h3 className="text-sm font-black text-white">Advisory Cargo Dispatch Planner</h3>
                  <p className="text-[11px] text-gray-500 leading-normal font-sans">
                    Specify chemical load dispatch factors. Gemini queries route terrain maps, weather gradients, check-points, and safety limits.
                  </p>
                </div>

                <div className="h-px bg-white/[0.04]" />

                <div className="space-y-3.5 text-xs">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] text-gray-500 font-mono uppercase mb-1">Source origin</label>
                      <input
                        type="text"
                        value={routeFrom}
                        onChange={(e) => setRouteFrom(e.target.value)}
                        className="w-full bg-black/40 border border-white/[0.06] rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-gray-500 font-mono uppercase mb-1">Destination location</label>
                      <input
                        type="text"
                        value={routeTo}
                        onChange={(e) => setRouteTo(e.target.value)}
                        className="w-full bg-black/40 border border-white/[0.06] rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] text-gray-500 font-mono uppercase mb-1">Load Weight (MT)</label>
                      <input
                        type="number"
                        value={routeLoad}
                        onChange={(e) => setRouteLoad(e.target.value)}
                        className="w-full bg-black/40 border border-white/[0.06] rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-gray-500 font-mono uppercase mb-1">Substance payload product</label>
                      <input
                        type="text"
                        value={routeProduct}
                        onChange={(e) => setRouteProduct(e.target.value)}
                        className="w-full bg-black/40 border border-white/[0.06] rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none"
                      />
                    </div>
                  </div>

                  <button
                    onClick={computeRouteAdvisory}
                    disabled={isRouteLoading || !routeFrom || !routeTo}
                    className="w-full py-3.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-black rounded-xl border border-transparent shadow shadow-cyan-900/10 cursor-pointer disabled:opacity-40 transition-all text-center flex items-center justify-center gap-2"
                  >
                    {isRouteLoading ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        Compiling Hazard Models...
                      </>
                    ) : (
                      <>
                        <Compass className="w-4 h-4" />
                        Generate Route Safety Plan
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Report Display Frame */}
              <div className="lg:col-span-7 bg-[#121010]/80 border border-white/[0.04] rounded-2xl p-6 min-h-[350px] shadow-2xl relative overflow-hidden flex flex-col justify-between">
                <div>
                  <div className="border-b border-white/[0.04] pb-3.5 mb-4 flex justify-between items-center bg-black/10 px-4 py-2.5 -mx-6 -mt-6">
                    <span className="text-[10px] font-mono font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-pulse" />
                      HAZARDOUS HAZARDS RADAR ANALYSIS
                    </span>
                    {routeReport && (
                      <button 
                        onClick={() => handleCopy(routeReport)}
                        className="p-1 text-[10px] text-gray-500 hover:text-white transition-colors cursor-pointer flex items-center gap-1.5 font-mono uppercase font-bold"
                      >
                        <Copy className="w-3 h-3" />
                        Copy report
                      </button>
                    )}
                  </div>

                  {isRouteLoading && (
                    <div className="py-20 text-center space-y-4">
                      <div className="inline-flex p-3 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 animate-spin">
                        <RefreshCw className="w-6 h-6" />
                      </div>
                      <p className="text-xs text-[#8b949e] font-mono uppercase tracking-wider">
                        Running simulated geographic threat assessment ...
                      </p>
                    </div>
                  )}

                  {!routeReport && !isRouteLoading && (
                    <div className="py-20 text-center space-y-3 max-w-sm mx-auto">
                      <AlertCircle className="w-10 h-10 text-gray-650 mx-auto" />
                      <h4 className="text-xs font-bold text-white uppercase font-sans">No route analysis requested</h4>
                      <p className="text-[11px] text-gray-500 leading-normal font-sans">
                        Specify origin and destination coordinates in the control panel to generate physical threats, check-posts analysis and speed guidelines.
                      </p>
                    </div>
                  )}

                  {routeReport && !isRouteLoading && (
                    <div className="prose prose-invert max-w-none text-left space-y-3 select-text">
                      {renderFormattedMarkdown(routeReport)}
                    </div>
                  )}
                </div>

                <div className="text-[9.5px] font-mono text-gray-500 border-t border-white/[0.04] pt-2 mt-4 flex items-center justify-between">
                  <span>Routing Protocol: Chemical Carriage Safety Code (CCA)</span>
                  <span>System Code: READY</span>
                </div>
              </div>
            </motion.div>
          )}

          {/* TAB 3: CFO Operational P&L Profit Leak Auditor */}
          {activeSubTab === 'finance' && (
            <motion.div
              key="finance"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="grid grid-cols-1 lg:grid-cols-12 gap-6 text-left"
            >
              {/* Aggregated indicators */}
              <div className="lg:col-span-4 space-y-5">
                <div className="bg-[#121010]/80 border border-white/[0.04] rounded-2xl p-5 space-y-4 shadow-xl">
                  <div className="space-y-0.5">
                    <span className="text-[10px] font-mono text-[#ff7a4e] font-extrabold uppercase tracking-widest block">
                      Financial Diagnostics
                    </span>
                    <h3 className="text-sm font-black text-white">Aggregated Operations Ledgers</h3>
                  </div>

                  <div className="h-px bg-white/[0.04]" />

                  {/* Profit summary numbers card */}
                  <div className="space-y-3.5 font-mono text-[11.5px]">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500">Gross Freight Sales:</span>
                      <span className="text-emerald-400 font-bold">
                        ₹{trips.reduce((sum, t) => sum + ((t.loadingWeight || t.qty) * (t.freightRateAtEnd || 0)), 0).toLocaleString()}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500">Aggregated Costs:</span>
                      <span className="text-rose-400 font-bold">
                        ₹{(trips.reduce((sum, t) => sum + (t.fuelExpense || 0) + (t.driverCharge || 0) + (t.tollExpense || 0) + (t.repairExpense || 0) + (t.adblueExpense || 0) + (t.otherExpense || 0), 0) + expenses.reduce((sum, e) => sum + e.amount, 0)).toLocaleString()}
                      </span>
                    </div>

                    <div className="h-px bg-white/[0.03] my-1" />

                    <div className="flex items-center justify-between text-xs bg-black/40 p-2.5 rounded-lg border border-white/[0.03]">
                      <span className="text-gray-400 uppercase font-bold text-[9.5px]">Net System Profit:</span>
                      <span className="text-emerald-400 font-extrabold font-mono text-xs">
                        ₹{(trips.reduce((sum, t) => sum + (t.profit || 0), 0) - expenses.reduce((sum, e) => sum + e.amount, 0)).toLocaleString()}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={computeFinancialAudit}
                    disabled={isFinanceLoading}
                    className="w-full py-3 bg-gradient-to-r from-amber-600 to-amber-700 hover:brightness-115 text-white font-bold rounded-xl border border-transparent shadow shadow-amber-900/10 cursor-pointer disabled:opacity-40 transition-all text-xs flex items-center justify-center gap-2"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isFinanceLoading ? 'animate-spin' : ''}`} />
                    Recalculate AI financial diagnostic
                  </button>
                </div>

                <div className="bg-[#121010]/80 border border-white/[0.04] rounded-2xl p-5 space-y-3.5 text-xs">
                  <span className="text-gray-500 uppercase font-bold font-mono text-[9.5px]">Financial Data Grounding Checklist</span>
                  <div className="space-y-2 font-mono text-[11px] text-gray-300">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      Trip operational logs: grounded
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      Workshop billing ledgers: grounded
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      AdBlue emission costs: grounded
                    </div>
                  </div>
                </div>
              </div>

              {/* Audit report display frame */}
              <div className="lg:col-span-8 bg-[#121010]/80 border border-white/[0.04] rounded-2xl p-6 shadow-2xl relative flex flex-col justify-between overflow-hidden">
                <div>
                  <div className="border-b border-white/[0.04] pb-3.5 mb-4 flex justify-between items-center bg-black/10 px-4 py-2.5 -mx-6 -mt-6">
                    <span className="text-[10px] font-mono font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-ping" />
                      AI CORPORATE CFO OPERATIONS AUDIT
                    </span>
                    {financeReport && (
                      <button 
                        onClick={() => handleCopy(financeReport)}
                        className="p-1 text-[10px] text-gray-500 hover:text-white transition-colors cursor-pointer flex items-center gap-1.5 font-mono uppercase font-bold"
                      >
                        <Copy className="w-3 h-3" />
                        Copy report
                      </button>
                    )}
                  </div>

                  {isFinanceLoading && (
                    <div className="py-24 text-center space-y-4">
                      <div className="inline-flex p-3 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 animate-spin">
                        <RefreshCw className="w-6 h-6" />
                      </div>
                      <p className="text-xs text-[#8b949e] font-mono uppercase tracking-wider">
                        Analyzing ledger leaks, repair margins and pricing margins ...
                      </p>
                    </div>
                  )}

                  {financeReport && !isFinanceLoading && (
                    <div className="prose prose-invert max-w-none text-left space-y-3 select-text">
                      {renderFormattedMarkdown(financeReport)}
                    </div>
                  )}
                </div>

                <div className="text-[9.5px] font-mono text-gray-500 border-t border-white/[0.04] pt-2 mt-4">
                  CFO Audit generated dynamically with Gemini model intelligence. Values grounded strictly format-by-format.
                </div>
              </div>
            </motion.div>
          )}

          {/* TAB 4: Predictive Parts, Renewals and Document Healthcare Alerting */}
          {activeSubTab === 'health' && (
            <motion.div
              key="health"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="grid grid-cols-1 lg:grid-cols-12 gap-6 text-left"
            >
              {/* Alert List column */}
              <div className="lg:col-span-7 bg-[#121010]/80 border border-white/[0.04] rounded-2xl p-5 space-y-4 shadow-xl">
                <div className="space-y-0.5">
                  <span className="text-[10px] font-mono text-rose-400 font-extrabold uppercase tracking-widest block">
                    🛡 Predictive Doc Expire Radar
                  </span>
                  <h3 className="text-sm font-black text-white">Compliance Renewal Alerts</h3>
                  <p className="text-[11.5px] text-gray-400 font-sans">
                    These warning parameters are generated by monitoring document expirations and vehicle warnings mapped inside the active database.
                  </p>
                </div>

                <div className="h-px bg-white/[0.04]" />

                {expirationAlerts.length === 0 ? (
                  <div className="py-12 text-center text-gray-500 font-sans text-xs space-y-2">
                    <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
                    <p className="font-bold text-white uppercase font-sans">All compliant certificates are up to date!</p>
                    <p>No tanker warning certificates are expiring within 45 days.</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[350px] overflow-y-auto pr-1 scrollbar-thin">
                    {expirationAlerts.map((alertItem, idx) => (
                      <div 
                        key={idx}
                        className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 text-xs ${alertItem.relativeClass}`}
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 font-mono font-bold text-white">
                            <span className="bg-black/40 border border-white/[0.05] px-2 py-0.5 rounded text-[10.5px] uppercase">
                              {alertItem.tanker}
                            </span>
                            <span>{alertItem.type} Certificate</span>
                          </div>
                          <div className="text-[11px] text-gray-300">
                            Expires: <strong className="text-white">{alertItem.date}</strong>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          {alertItem.daysLeft < 0 ? (
                            <span className="font-mono text-red-400 font-extrabold uppercase tracking-tighter text-[10px] bg-red-400/5 px-2 py-0.5 rounded border border-red-400/10">EXPIRED</span>
                          ) : (
                            <span className="font-mono text-amber-400 font-extrabold uppercase tracking-tighter text-[10.5px]">
                              {alertItem.daysLeft} days remaining
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Parts Alerts Counselor Column */}
              <div className="lg:col-span-5 bg-[#121010]/80 border border-white/[0.04] rounded-2xl p-5 space-y-4 shadow-xl flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="space-y-0.5">
                    <span className="text-[10px] font-mono text-rose-400 font-extrabold uppercase tracking-widest block">
                      🔬 Proactive Vehicle Diagnostics
                    </span>
                    <h3 className="text-sm font-black text-white">Automated maintenance advice</h3>
                  </div>

                  <p className="text-[11.5px] text-gray-500 leading-normal font-sans">
                    Select any tanker to pre-generate strategic advisory schedules focused on tyre rotation, urea replenishment cycles, or gear work.
                  </p>

                  <div className="space-y-3 pt-2 text-xs">
                    <div>
                      <label className="block text-[10px] text-gray-500 font-mono uppercase mb-1">Select Tanker ID</label>
                      <select
                        value={selectedTankerId}
                        onChange={(e) => setSelectedTankerId(e.target.value)}
                        className="w-full bg-black/40 border border-white/[0.06] rounded-xl px-3.5 py-2.5 text-white focus:outline-none"
                      >
                        <option value="">-- Choose Truck --</option>
                        {tankers.map(t => (
                          <option key={t.id} value={t.id}>
                            {t.tankerNumber} - {t.status.toUpperCase()}
                          </option>
                        ))}
                      </select>
                    </div>

                    <button
                      onClick={() => {
                        const selectedT = tankers.find(t => t.id === selectedTankerId);
                        if (!selectedT) return;
                        setActiveSubTab('chat');
                        setChatInput(`Generate a customized predictive preventive maintenance advisory list for Tanker ${selectedT.tankerNumber}. Detail mechanical parts changed frequency, and write structured notes.`);
                        setTimeout(() => handleSendChat(`Generate a customized predictive preventive maintenance advisory list for Tanker ${selectedT.tankerNumber}. Detail mechanical parts changed frequency, and write structured notes.`), 400);
                      }}
                      disabled={!selectedTankerId}
                      className="w-full py-3 bg-gradient-to-r from-rose-600 to-rose-700 hover:brightness-110 text-white font-bold rounded-xl text-center text-xs border border-transparent cursor-pointer disabled:opacity-40 transition-all block flex items-center justify-center gap-1.5"
                    >
                      <Sparkles className="w-4 h-4 text-white" />
                      Get AI Parts advisory notes
                    </button>
                  </div>
                </div>

                <div className="p-3 bg-rose-500/5 border border-rose-500/10 rounded-xl text-[10.5px] leading-normal text-gray-400 font-sans">
                  ⚠️ <strong className="text-white">Caution Alert:</strong> Always make sure chemical trucks carry correct physical TREM Cards and hazardous warnings clearly.
                </div>
              </div>
            </motion.div>
          )}

        </AnimatePresence>

      </div>

    </div>
  );
}
