import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Trash2, RotateCcw, AlertTriangle, Info, Calendar, Tag, ShieldCheck, Fuel, 
  Sparkles, Filter, Database, X
} from 'lucide-react';

interface TrashManagerProps {
  trashedItems: any[];
  onRestore: (trashId: string) => void;
  onPermanentDelete: (trashId: string) => void;
  onEmptyTrash: () => void;
}

export default function TrashManager({ trashedItems, onRestore, onPermanentDelete, onEmptyTrash }: TrashManagerProps) {
  const [filterType, setFilterType] = useState<string>('all');

  const filteredItems = filterType === 'all' 
    ? trashedItems 
    : trashedItems.filter(item => item.type === filterType);

  const getReadableType = (type: string) => {
    switch (type) {
      case 'tanker': return 'Vessel Tanker';
      case 'driver': return 'Driver Profile';
      case 'lr': return 'Lorry Receipt (LR)';
      case 'trip': return 'Trip Ledger';
      case 'bill': return 'Maintenance Bill';
      case 'expense': return 'Other Expense';
      default: return type.toUpperCase();
    }
  };

  const getTypeStyle = (type: string) => {
    switch (type) {
      case 'tanker': return 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20';
      case 'driver': return 'bg-blue-500/10 text-blue-400 border border-blue-500/20';
      case 'lr': return 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/20';
      case 'trip': return 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
      case 'bill': return 'bg-purple-500/10 text-purple-400 border border-purple-500/20';
      case 'expense': return 'bg-rose-500/10 text-rose-400 border border-rose-500/20';
      default: return 'bg-gray-500/10 text-gray-400 border border-gray-500/20';
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 py-6 text-white selection:bg-[#ff5a5f] selection:text-white font-sans">
      
      {/* Upper header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#30363d] pb-6">
        <div>
          <div className="flex items-center gap-2">
            <Trash2 className="w-6 h-6 text-[#ff5a1f]" />
            <h2 className="text-2xl font-black tracking-tight uppercase">System Trash Bin</h2>
          </div>
          <p className="text-xs text-[#8b949e] font-mono mt-1">
            PROTECTION ARCHIVE FOR ACCIDENTALLY DELETED LEDGERS AND FLEET ENTRIES
          </p>
        </div>

        {trashedItems.length > 0 && (
          <button
            onClick={onEmptyTrash}
            className="px-4 py-2.5 bg-rose-500/10 text-rose-400 border border-rose-500/20 hover:bg-rose-500 hover:text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer transition-all"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Empty Trash Bin
          </button>
        )}
      </div>

      {/* Info Warning Shield */}
      <div className="p-4 bg-amber-500/10 border border-amber-500/20 text-amber-500 rounded-2xl text-xs font-mono flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />
        <div className="space-y-1">
          <strong className="block font-bold">Trash Ledger Protocol Active:</strong>
          <p className="text-gray-400 leading-relaxed">
            In accordance with system specifications, active deletions do NOT purge records permanently. 
            All objects are moved securely here where they can be restored back to primary tables without disrupting 
            active balances, accounting aggregates, or history.
          </p>
        </div>
      </div>

      {/* Main Table/Grid */}
      <div className="space-y-4">
        {/* Filtering buttons */}
        <div className="flex flex-wrap gap-1.5 border-b border-white/[0.03] pb-3 text-xs">
          {[
            { id: 'all', label: 'All Trashed Items' },
            { id: 'tanker', label: 'Tankers' },
            { id: 'driver', label: 'Drivers' },
            { id: 'lr', label: 'LR Records' },
            { id: 'trip', label: 'Trips' },
            { id: 'bill', label: 'Maintenance Bills' },
            { id: 'expense', label: 'Expenses' }
          ].map(btn => (
            <button
              key={btn.id}
              onClick={() => setFilterType(btn.id)}
              className={`px-3 py-1.5 rounded-xl font-semibold transition-all cursor-pointer ${
                filterType === btn.id 
                  ? 'bg-[#ff5a1f] text-white' 
                  : 'bg-[#161b22] border border-[#30363d] text-gray-400 hover:text-white'
              }`}
            >
              {btn.label}
            </button>
          ))}
        </div>

        {/* Trashed items rows */}
        <div className="space-y-3">
          <AnimatePresence mode="popLayout">
            {filteredItems.map((item) => (
              <motion.div
                layout
                key={item.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="p-5 bg-[#161b22] border border-[#30363d] rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all hover:border-white/[0.08]"
              >
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                  <div className={`px-2.5 py-1 text-[10px] font-mono font-bold uppercase rounded-full w-fit ${getTypeStyle(item.type)}`}>
                    {getReadableType(item.type)}
                  </div>
                  
                  <div className="space-y-1">
                    <h4 className="text-sm font-extrabold text-white tracking-tight">
                      {item.itemName}
                    </h4>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-gray-500 font-mono">
                      <span className="flex items-center gap-1">
                        <Database className="w-3 h-3 text-gray-600" />
                        Original ID: {item.originalId}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-gray-600" />
                        Deleted On: {new Date(item.deletedAt).toLocaleDateString()} at {new Date(item.deletedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onRestore(item.id)}
                    className="flex-1 md:flex-none px-3.5 py-2 bg-emerald-500/10 hover:bg-emerald-500 text-emerald-400 hover:text-white border border-emerald-500/20 text-xs font-bold rounded-xl inline-flex items-center justify-center gap-1.5 cursor-pointer transition-all font-mono"
                    title="Restore item back to working tables"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Restore Record
                  </button>
                  
                  <button
                    onClick={() => onPermanentDelete(item.id)}
                    className="px-3.5 py-2 bg-rose-500/10 hover:bg-rose-500 text-rose-400 hover:text-white border border-rose-500/20 text-xs font-bold rounded-xl inline-flex items-center justify-center gap-1.5 cursor-pointer transition-all"
                    title="Annihilate item permanently"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Purge
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {filteredItems.length === 0 && (
            <div className="p-12 text-center bg-[#161b22] border border-dashed border-[#30363d] rounded-2xl text-gray-500">
              <Trash2 className="w-10 h-10 text-gray-600 mx-auto mb-3" />
              <p className="text-xs font-mono">Trash Bin is entirely clean! No record templates found here.</p>
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
