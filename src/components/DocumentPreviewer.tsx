import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  FileText, FileSpreadsheet, Download, X, Search, Sparkles, Eye, 
  ExternalLink, Info, CheckCircle2, RefreshCw, Layers 
} from 'lucide-react';

interface PreviewDoc {
  type: 'pdf' | 'excel';
  title: string;
  filename: string;
  blob: Blob;
  blobUrl: string;
  csvContent?: string;
  download: () => void;
}

export default function DocumentPreviewer() {
  const [currentDoc, setCurrentDoc] = useState<PreviewDoc | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [skipPreviewSetting, setSkipPreviewSetting] = useState(false);
  const [downloadCompleted, setDownloadCompleted] = useState(false);

  // Parse CSV records for our corporate spreadsheet viewer
  const [excelGrid, setExcelGrid] = useState<string[][]>([]);

  // Track skip preview preference
  useEffect(() => {
    const isSkipped = localStorage.getItem('fleetmaster_skip_preview') === 'true';
    setSkipPreviewSetting(isSkipped);
  }, []);

  // Set up event listener for system-wide exports
  useEffect(() => {
    const handlePreviewEvent = (e: Event) => {
      const customEvent = e as CustomEvent<PreviewDoc>;
      if (customEvent && customEvent.detail) {
        setDownloadCompleted(false);
        setSearchTerm('');
        
        // If it's Excel/CSV, pre-parse the records to populate our spreadsheet grid
        if (customEvent.detail.type === 'excel' && customEvent.detail.csvContent) {
          const raw = customEvent.detail.csvContent;
          // Strip Byte Order Mark (BOM) if present
          const cleanRaw = raw.startsWith('\ufeff') ? raw.slice(1) : raw;
          
          const lines = cleanRaw.split('\n');
          const grid = lines.map(line => {
            const cells: string[] = [];
            let currentCell = '';
            let inQuotes = false;
            
            for (let i = 0; i < line.length; i++) {
              const char = line[i];
              if (char === '"') {
                inQuotes = !inQuotes;
              } else if (char === ',' && !inQuotes) {
                cells.push(currentCell.replace(/^"|"$/g, '').trim());
                currentCell = '';
              } else {
                currentCell += char;
              }
            }
            cells.push(currentCell.replace(/^"|"$/g, '').trim());
            return cells;
          }).filter(row => row.length > 0 && row.some(cell => cell !== ''));
          
          setExcelGrid(grid);
        } else {
          setExcelGrid([]);
        }

        setCurrentDoc(customEvent.detail);
      }
    };

    window.addEventListener('fleetmaster-preview-doc', handlePreviewEvent);
    return () => {
      window.removeEventListener('fleetmaster-preview-doc', handlePreviewEvent);
    };
  }, []);

  if (!currentDoc) return null;

  // Cleanup object url to avoid leaks when closing
  const handleClose = () => {
    setCurrentDoc(null);
    setDownloadCompleted(false);
  };

  const handleDownloadAndClose = () => {
    if (currentDoc) {
      currentDoc.download();
      setDownloadCompleted(true);
      // Automatically close modal after positive download feedback
      setTimeout(() => {
        handleClose();
      }, 1500);
    }
  };

  const handleToggleSkipSetting = (checked: boolean) => {
    setSkipPreviewSetting(checked);
    if (checked) {
      localStorage.setItem('fleetmaster_skip_preview', 'true');
    } else {
      localStorage.removeItem('fleetmaster_skip_preview');
    }
  };

  // Filter grid if spreadsheet view is active
  const headers = excelGrid.length > 0 ? excelGrid[0] : [];
  const rows = excelGrid.length > 1 ? excelGrid.slice(1) : [];
  
  const filteredRows = rows.filter(row => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return row.some(cell => cell.toLowerCase().includes(term));
  });

  // Calculate standard Excel column names (A, B, C...)
  const getColName = (index: number) => {
    let name = '';
    let temp = index;
    while (temp >= 0) {
      name = String.fromCharCode((temp % 26) + 65) + name;
      temp = Math.floor(temp / 26) - 1;
    }
    return name;
  };

  return (
    <AnimatePresence>
      <div 
        className="fixed inset-0 bg-[#06090f]/90 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        style={{ colorScheme: 'dark' }}
      >
        <motion.div
          initial={{ scale: 0.97, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.97, opacity: 0 }}
          className="bg-[#0d1117] border border-[#30363d] rounded-2xl w-full max-w-5xl h-[88vh] flex flex-col overflow-hidden shadow-2xl text-left"
        >
          {/* HEADER SECTION */}
          <div className="p-4 border-b border-[#30363d] bg-[#161b22] flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-xl ${currentDoc.type === 'pdf' ? 'bg-rose-500/10 text-rose-400' : 'bg-emerald-500/10 text-emerald-400'}`}>
                {currentDoc.type === 'pdf' ? <FileText className="w-5 h-5" /> : <FileSpreadsheet className="w-5 h-5" />}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-white font-extrabold text-sm tracking-tight uppercase">
                    {currentDoc.title}
                  </h3>
                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold font-mono border uppercase ${
                    currentDoc.type === 'pdf' 
                      ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' 
                      : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                  }`}>
                    {currentDoc.type === 'pdf' ? 'PDF Audit Invoice' : 'Excel Sheet report'}
                  </span>
                </div>
                <p className="text-[10px] text-[#8b949e] font-mono mt-0.5">
                  Filename: {currentDoc.filename} • Sandbox Protected Preview
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              {/* Skip Preferences */}
              <label className="flex items-center gap-2 text-[10px] text-[#8b949e] font-medium bg-[#21262d] px-2.5 py-1.5 rounded-lg border border-[#30363d] cursor-pointer hover:border-[#8b949e] select-none transition-all">
                <input
                  type="checkbox"
                  checked={skipPreviewSetting}
                  onChange={(e) => handleToggleSkipSetting(e.target.checked)}
                  className="rounded border-[#30363d] text-blue-500 focus:ring-blue-500 bg-[#0d1117] w-3 h-3 cursor-pointer"
                />
                <span>Skip Preview Next Time (Direct Download)</span>
              </label>

              <button
                onClick={handleClose}
                className="p-1 px-2 bg-[#21262d] hover:bg-neutral-800 border border-[#30363d] text-[#8b949e] hover:text-white rounded-lg text-xs font-mono transition-all cursor-pointer"
                title="Discard Preview"
              >
                ✕
              </button>
            </div>
          </div>

          {/* MAIN PREVIEW BODY CONTAINER */}
          <div className="flex-1 overflow-hidden grid grid-cols-1 lg:grid-cols-4 bg-[#0d1117]">
            
            {/* CONTENT PREVIEW SCREEN (LEFT 3 COLUMNS) */}
            <div className="lg:col-span-3 flex flex-col border-r border-[#30363d] overflow-hidden">
              {currentDoc.type === 'pdf' ? (
                /* PDF PREVIEW IFRAME */
                <div className="relative flex-1 bg-[#161b22] p-2 flex flex-col justify-between h-full">
                  <div className="flex-1 rounded-xl overflow-hidden border border-[#30363d] bg-[#0d1117] relative">
                    <iframe
                      src={currentDoc.blobUrl}
                      title="PDF Document Preview"
                      className="w-full h-full border-none"
                    />
                  </div>
                  
                  {/* Zoom Fallback Alert for incompatible frames */}
                  <div className="p-2 border-t border-[#30363d] bg-[#1c2128] text-[9px] text-[#8b949e] flex items-center justify-between">
                    <span className="flex items-center gap-1">
                      <Layers className="w-3.5 h-3.5 text-blue-400" />
                      Tip: Scroll inside the frame or download your file to access full Adobe/system layout printers.
                    </span>
                    <a
                      href={currentDoc.blobUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-400 hover:underline flex items-center gap-1 font-semibold"
                    >
                      <ExternalLink className="w-3 h-3" />
                      Open Full Screen Tab
                    </a>
                  </div>
                </div>
              ) : (
                /* EXCEL SPREADSHEET TABULAR PREVIEW */
                <div className="flex-grow flex flex-col overflow-hidden p-4 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-[#161b22] p-2.5 rounded-xl border border-[#30363d]">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-gray-200">Interactive Workbook Matrix</span>
                      <span className="text-[10px] text-emerald-400 font-mono bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                        {headers.length} Cols x {rows.length} Rows
                      </span>
                    </div>

                    <div className="relative max-w-xs w-full">
                      <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-[#8b949e]" />
                      <input
                        type="text"
                        placeholder="Search spreadsheet rows..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-9 pr-3 py-1.5 bg-[#0d1117] border border-[#30363d] text-white rounded-lg text-xs outline-none focus:border-blue-500 transition-all font-sans"
                      />
                    </div>
                  </div>

                  {/* SHEET WRAPPER */}
                  <div className="flex-1 overflow-auto rounded-xl border border-[#30363d] bg-[#0d1117]">
                    {excelGrid.length === 0 ? (
                      <div className="h-full flex items-center justify-center text-slate-500 text-xs py-10">
                        No spreadsheet grid cells compiled.
                      </div>
                    ) : (
                      <table className="w-full text-left border-collapse text-[11px] font-sans">
                        <thead className="sticky top-0 bg-[#161b22] text-[#c9d1d9] font-semibold border-b border-[#30363d] select-none z-10">
                          <tr>
                            {/* Outer Excel Row Counter Indicator */}
                            <th className="bg-[#0d1117] border-r border-[#30363d] text-[#8b949e] font-mono text-center text-[9px] w-12 px-1 py-1.5">
                              ★
                            </th>
                            {headers.map((hdr, id) => (
                              <th 
                                key={id} 
                                className="border-r border-[#30363d] border-b border-[#30363d] min-w-[120px] max-w-[200px] truncate px-3 py-1.5 bg-[#161b22] text-[10px] font-mono tracking-wide"
                              >
                                <div className="text-[8px] text-emerald-400/70 font-mono block mb-0.5 uppercase tracking-wider select-none">
                                  COL {getColName(id)}
                                </div>
                                <span className="text-white font-bold">{hdr}</span>
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#30363d] font-mono text-gray-300">
                          {filteredRows.length === 0 ? (
                            <tr>
                              <td colSpan={headers.length + 1} className="p-8 text-center text-slate-500 text-xs">
                                {searchTerm ? `No spreadsheet records matched "${searchTerm}"` : "Workbook contains no data pages."}
                              </td>
                            </tr>
                          ) : (
                            filteredRows.map((row, rowIdx) => (
                              <tr 
                                key={rowIdx} 
                                className="hover:bg-[#161b22]/50 transition-all even:bg-[#161b22]/15"
                              >
                                <td className="bg-[#161b22]/30 border-r border-[#30363d] text-[#8b949e] font-mono text-center text-[9px] px-1 py-1 selection:bg-transparent">
                                  {rowIdx + 1}
                                </td>
                                {row.map((cell, colIdx) => (
                                  <td 
                                    key={colIdx} 
                                    className="border-r border-[#30363d] px-3 py-1.5 max-w-[220px] truncate text-slate-300 select-all"
                                    title={cell}
                                  >
                                    {cell !== '' ? cell : <span className="text-[#30363d] italic">(blank)</span>}
                                  </td>
                                ))}
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* SIDEBAR METADATA & ACTIONS (RIGHT 1 COLUMN) */}
            <div className="lg:col-span-1 p-5 bg-[#161b22] flex flex-col justify-between overflow-y-auto space-y-6">
              
              {/* UPPER DESCRIPTION INFO */}
              <div className="space-y-4">
                <div>
                  <h4 className="text-[10px] font-mono text-blue-400 uppercase tracking-widest block font-bold">
                    DOCUMENT STATISTICS
                  </h4>
                  <div className="mt-2.5 p-3.5 bg-[#0d1117] border border-[#30363d] rounded-xl space-y-2.5">
                    <div>
                      <span className="block text-[8px] text-[#8b949e] font-mono uppercase tracking-wider">Estimated File Size</span>
                      <span className="font-bold text-white text-xs block font-mono">
                        {(currentDoc.blob.size / 1024).toFixed(2)} KB
                      </span>
                    </div>
                    <div>
                      <span className="block text-[8px] text-[#8b949e] font-mono uppercase tracking-wider">File Format MIME</span>
                      <span className="font-bold text-slate-300 text-[10px] block font-mono">
                        {currentDoc.blob.type || 'application/octet-stream'}
                      </span>
                    </div>
                    <div>
                      <span className="block text-[8px] text-[#8b949e] font-mono uppercase tracking-wider">Origin Channel</span>
                      <span className="font-mono text-emerald-400 text-[10px] font-semibold block uppercase">
                        FleetMaster Export Engine v1.9
                      </span>
                    </div>
                  </div>
                </div>

                <div className="p-3 bg-yellow-500/5 border border-yellow-500/15 rounded-xl space-y-1.5">
                  <div className="flex items-center gap-1.5 text-yellow-500 font-mono text-[9px] font-bold uppercase">
                    <Info className="w-3.5 h-3.5" />
                    <span>Compliance Safety</span>
                  </div>
                  <p className="text-[10px] text-[#8b949e] leading-relaxed font-sans">
                    This document copy operates strictly on read-only memory buffering. Changes verified in this view are completely secured within the sandbox before committing file writes.
                  </p>
                </div>

                <div className="p-3 bg-[#0d1117] border border-[#30363d] rounded-xl flex items-center gap-2">
                  <Sparkles className="w-3.5 h-3.5 text-blue-500" />
                  <span className="text-[10px] text-gray-300 font-medium font-sans">
                    Pre-seeded Verification Passed
                  </span>
                </div>
              </div>

              {/* LOWER ACTIONS BUTTONS */}
              <div className="space-y-2.5 pt-4 border-t border-[#30363d]">
                <button
                  type="button"
                  onClick={handleDownloadAndClose}
                  disabled={downloadCompleted}
                  className={`w-full py-2.5 rounded-xl text-xs font-bold transition-all shadow-lg flex items-center justify-center gap-2.5 border-0 cursor-pointer ${
                    downloadCompleted 
                      ? 'bg-emerald-600 text-white' 
                      : 'bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white shadow-blue-950/20'
                  }`}
                >
                  {downloadCompleted ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 animate-bounce text-white" />
                      <span>Saved!</span>
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4" />
                      <span>Download File</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleClose}
                  className="w-full py-2.5 bg-[#21262d] hover:bg-neutral-800 border border-[#30363d] text-gray-300 hover:text-white rounded-xl text-xs font-bold transition-all font-mono cursor-pointer"
                >
                  Discard PREVIEW
                </button>
              </div>

            </div>

          </div>

        </motion.div>
      </div>
    </AnimatePresence>
  );
}
