import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  FileText, ClipboardCheck, Plus, Calendar, ShieldCheck, 
  MapPin, AlertTriangle, CheckSquare, Search, ChevronRight, X, Printer, CheckCircle,
  Download, Trash2
} from 'lucide-react';
import { exportToExcel, exportToPDF } from '../utils/exportUtils';
import { LorryReceipt, Tanker } from '../types';

interface LRManagerProps {
  lrs: LorryReceipt[];
  tankers: Tanker[];
  trips?: any[];
  onAddLr: (lr: LorryReceipt) => void;
  onReceiveLr: (lrId: string, dateTime: string) => void;
  currentUser?: any;
  onUpdateUser?: (updatedUser: any) => void;
  onDeleteLr?: (id: string) => void;
}

export default function LRManager({ lrs, tankers, trips = [], onAddLr, onReceiveLr, currentUser, onUpdateUser, onDeleteLr }: LRManagerProps) {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [lrSearchField, setLrSearchField] = useState('');
  const [selectedLrId, setSelectedLrId] = useState<string | null>(null);
  const [goodsValues, setGoodsValues] = useState<Record<string, string>>({});

  // Custom LR Layout / Stationary configuration states
  const [showFormatConfig, setShowFormatConfig] = useState(false);
  const [formatType, setFormatType] = useState<'blank' | 'custom_image' | 'custom_text'>(currentUser?.lrFormat?.type || 'blank');
  const [customCompanyName, setCustomCompanyName] = useState(currentUser?.lrFormat?.companyName || currentUser?.company || '');
  const [customSubtitle, setCustomSubtitle] = useState(currentUser?.lrFormat?.companySubtitle || 'ROAD CARRIERS & FLEET OPERATORS');
  const [customAddress, setCustomAddress] = useState(currentUser?.lrFormat?.companyAddress || '');
  const [customPhone, setCustomPhone] = useState(currentUser?.lrFormat?.companyPhone || currentUser?.phone || currentUser?.contactNo || '');
  const [customEmail, setCustomEmail] = useState(currentUser?.lrFormat?.companyEmail || currentUser?.email || '');
  const [customPan, setCustomPan] = useState(currentUser?.lrFormat?.customPan || '');
  const [customGstin, setCustomGstin] = useState(currentUser?.lrFormat?.customGstin || '');
  const [logoB64, setLogoB64] = useState(currentUser?.lrFormat?.logoB64 || '');
  const [lrPerformaB64, setLrPerformaB64] = useState(currentUser?.lrFormat?.lrPerformaB64 || '');

  // Presets and alignment adjustments for uploaded/preprinted stationery layout logic
  const [hideHeaderOnPerforma, setHideHeaderOnPerforma] = useState<boolean>(currentUser?.lrFormat?.hideHeaderOnPerforma ?? true);
  const [hideBordersOnPerforma, setHideBordersOnPerforma] = useState<boolean>(currentUser?.lrFormat?.hideBordersOnPerforma ?? false);
  const [hideLabelsOnPerforma, setHideLabelsOnPerforma] = useState<boolean>(currentUser?.lrFormat?.hideLabelsOnPerforma ?? false);
  const [verticalPaddingOffset, setVerticalPaddingOffset] = useState<number>(currentUser?.lrFormat?.verticalPaddingOffset ?? 130);
  const [fieldsFontSize, setFieldsFontSize] = useState<number>(currentUser?.lrFormat?.fieldsFontSize ?? 12);

  // States for AI-Powered scanning and parsing of physical L.R papers
  const [isScanningLr, setIsScanningLr] = useState<boolean>(false);
  const [scanProgressMsg, setScanProgressMsg] = useState<string>('');
  const [scanSuccessMsg, setScanSuccessMsg] = useState<string>('');
  const [scanErrorMsg, setScanErrorMsg] = useState<string>('');

  useEffect(() => {
    if (lrs.length > 0 && !selectedLrId) {
      setSelectedLrId(lrs[0].id);
    }
  }, [lrs, selectedLrId]);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoB64(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleLrPerformaUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setLrPerformaB64(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleLrAutoScan = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsScanningLr(true);
    setScanProgressMsg("Reading upload file stream...");
    setScanErrorMsg("");
    setScanSuccessMsg("");

    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        try {
          const resultStr = reader.result as string;
          const commaIdx = resultStr.indexOf(',');
          if (commaIdx === -1) {
            throw new Error("Invalid file content format.");
          }
          const base64Content = resultStr.substring(commaIdx + 1);
          const mimeType = file.type || "image/jpeg";

          setScanProgressMsg("AI Deep-OCR & Cognitive Settlement processing...");

          const response = await fetch("/api/lr/parse-image", {
            method: "POST",
            headers: {
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              fileData: base64Content,
              mimeType: mimeType
            })
          });

          if (!response.ok) {
            throw new Error(`Server returned HTTP status ${response.status}`);
          }

          const data = await response.json();
          if (data.error) {
            throw new Error(data.error);
          }

          // Pre-fill fields
          if (data.lrNo) setLrNo(data.lrNo);
          if (data.dated) setDated(data.dated);
          if (data.consignerName) setConsigner(data.consignerName);
          if (data.consigneeName) setConsignee(data.consigneeName);
          if (data.product) setProduct(data.product);
          if (data.qty) setQty(data.qty);
          if (data.qtyUnit) {
            const unit = data.qtyUnit.toUpperCase() === 'KL' ? 'KL' : 'MT';
            setQtyUnit(unit);
          }
          if (data.placeFrom) setPlaceFrom(data.placeFrom);
          if (data.placeTo) setPlaceTo(data.placeTo);
          if (data.freightRate) setFreightRate(data.freightRate);

          if (data.tankerNumber) {
            // Find in tankers list
            const matched = tankers.find(t => 
              t.tankerNumber.replace(/[^A-Za-z0-9]/g, '').toLowerCase() === 
              data.tankerNumber.replace(/[^A-Za-z0-9]/g, '').toLowerCase()
            );
            if (matched) {
              setLrType('own');
              setSelectedTankerId(matched.id);
            } else {
              setLrType('commission');
              setThirdPartyFleetName(data.tankerNumber.toUpperCase());
              setCommissionAmount(1500); // default fallback
            }
          }

          setScanSuccessMsg(`AI Auto-Extraction successful! Consolidated receipt data imported.`);
          setTimeout(() => setScanSuccessMsg(''), 6000);
        } catch (err: any) {
          console.error("Scanning parse failed:", err);
          setScanErrorMsg(err.message || "Failed to analyze document format");
          setTimeout(() => setScanErrorMsg(''), 6000);
        } finally {
          setIsScanningLr(false);
          setScanProgressMsg("");
        }
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      console.error(err);
      setIsScanningLr(false);
      setScanProgressMsg("");
    }
  };

  const saveLrFormat = () => {
    if (onUpdateUser && currentUser) {
      const updated = {
        ...currentUser,
        lrFormat: {
          type: formatType,
          companyName: customCompanyName,
          companySubtitle: customSubtitle,
          companyAddress: customAddress,
          companyPhone: customPhone,
          companyEmail: customEmail,
          customPan: customPan,
          customGstin: customGstin,
          logoB64: logoB64,
          lrPerformaB64: lrPerformaB64,
          hideHeaderOnPerforma: hideHeaderOnPerforma,
          hideBordersOnPerforma: hideBordersOnPerforma,
          hideLabelsOnPerforma: hideLabelsOnPerforma,
          verticalPaddingOffset: verticalPaddingOffset,
          fieldsFontSize: fieldsFontSize
        }
      };
      onUpdateUser(updated);
      setShowFormatConfig(false);
    }
  };

  const downloadLrAsStandaloneHtml = (lr: LorryReceipt) => {
    const valueOfGoods = goodsValues[lr.id] !== undefined 
      ? goodsValues[lr.id] 
      : `Rs. ${(lr.qty * (lr.qtyUnit === 'MT' ? 95000 : 70)).toLocaleString()} /-`;

    const format = currentUser?.lrFormat || {
      type: 'blank',
      companyName: '',
      companySubtitle: '',
      companyAddress: '',
      companyPhone: '',
      companyEmail: '',
      customPan: '',
      customGstin: '',
      logoB64: '',
      lrPerformaB64: '',
      hideHeaderOnPerforma: true,
      hideBordersOnPerforma: false,
      hideLabelsOnPerforma: false,
      verticalPaddingOffset: 0,
      fieldsFontSize: 12
    };

    let headerHtml = '';
    let footerCompanyHtml = '';

    const isPerformaActive = !!format.lrPerformaB64;
    const shouldHideHeader = isPerformaActive && (format.hideHeaderOnPerforma ?? true);

    if (shouldHideHeader) {
      headerHtml = `
        <div style="height: ${format.verticalPaddingOffset ?? 130}px; display: flex; align-items: center; justify-content: center; margin-bottom: 15px;" class="no-print-bar">
          <span style="font-size:12px; color:#ff5a5f; font-family:sans-serif; font-weight:bold; background-color:rgba(255,255,255,0.9); padding:4px 8px; border-radius:4px; border:1px solid rgba(255,90,95,0.3);">
            [ Uploaded L.R. Performa Background Header Area — Height: ${format.verticalPaddingOffset ?? 130}px ]
          </span>
        </div>
        <div style="height: ${format.verticalPaddingOffset ?? 130}px; display: none;" class="print-only"></div>
      `;
      footerCompanyHtml = 'For Authorized Signatory';
    } else if (format.type === 'custom_text') {
      headerHtml = `
        <table class="header-table">
          <tr>
            <td class="header-text" style="padding-left:12px;">
              <h1 class="company-title" style="font-size:28px !important; font-weight:900; text-transform:uppercase; margin:0; line-height:1.2;">
                ${format.companyName || 'ENTERPRISE TRANSPORT'}
              </h1>
              <p class="company-subtitle" style="font-size:10px; font-weight:bold; letter-spacing:0.2em; margin: 4px 0 0 0; color:#444;">
                ${format.companySubtitle || 'ROAD CARRIERS & FLEET OPERATORS'}
              </p>
              <div class="company-details" style="font-size:11.5px; line-height:1.45; margin-top:8px; font-weight:bold;">
                ${format.companyAddress || ''} <br />
                Mob: ${format.companyPhone || ''} &nbsp;|&nbsp; Email: ${format.companyEmail || ''} <br />
                ${format.customPan ? `PAN No: ${format.customPan}` : ''} ${format.customGstin ? ` &nbsp;|&nbsp; GSTIN No: ${format.customGstin}` : ''}
              </div>
            </td>
          </tr>
        </table>
      `;
      footerCompanyHtml = `For ${format.companyName || 'Authorized Transporter'}`;
    } else if (format.type === 'custom_image' && format.logoB64) {
      headerHtml = `
        <div style="text-align: center; margin-bottom: 12px; width:100%;">
          <img src="${format.logoB64}" style="max-height: 120px; max-width: 100%; object-fit: contain;" />
        </div>
      `;
      footerCompanyHtml = 'For Authorised Transporter';
    } else {
      // type: 'blank'
      if (format.lrPerformaB64) {
        headerHtml = `
          <div style="height: 130px; display: flex; align-items: center; justify-content: center; margin-bottom: 15px;" class="no-print-bar">
            <span style="font-size:12px; color:#ff5a5f; font-family:sans-serif; font-weight:bold; background-color:rgba(255,255,255,0.9); padding:4px 8px; border-radius:4px; border:1px solid rgba(255,90,95,0.3);">
              [ Uploaded Performa Background Header Area — Original Alignment ]
            </span>
          </div>
          <div style="height: 130px; display: none;" class="print-only"></div>
        `;
      } else {
        headerHtml = `
          <div style="height: 130px; display: flex; align-items: center; justify-content: center; border-bottom: 1px dashed #cccccc; margin-bottom: 15px;" class="no-print-bar">
            <span style="font-size:12px; color:#888888; font-family:sans-serif; font-style:italic;">
              [ Preprinted Stationary Header Area - Kept completely blank on printed page! ]
            </span>
          </div>
          <div style="height: 130px; display: none;" class="print-only"></div>
        `;
      }
      footerCompanyHtml = 'For Authorized Signatory';
    }

    const docStr = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Lorry Receipt - ${lr.lrNo}</title>
  <style>
    body {
      background: white;
      color: black;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      padding: 0;
      margin: 0;
      font-size: ${format.fieldsFontSize ?? 12}px;
    }
    .main-wrapper {
      padding: 24px;
    }
    .no-print-bar {
      background: #111827;
      color: white;
      padding: 14px 24px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-family: sans-serif;
      border-bottom: 2px solid #ff5a1f;
    }
    .print-btn {
      background: #ff5a1f;
      color: white;
      border: none;
      padding: 10px 20px;
      font-weight: bold;
      border-radius: 6px;
      cursor: pointer;
      font-size: 13px;
    }
    .print-btn:hover {
      background: #e04b12;
    }
    .container {
      max-width: 800px;
      margin: 10px auto;
      border: ${format.hideBordersOnPerforma ? 'none' : '3px solid #000000'};
      padding: 24px;
      background-color: white;
      ${format.lrPerformaB64 ? `background-image: url('${format.lrPerformaB64}'); background-repeat: no-repeat; background-size: 100% 100%; background-position: center;` : ''}
    }
    .header-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 12px;
    }
    .header-text {
      text-align: left;
    }
    .company-title {
      font-size: 30px;
      font-weight: 900;
      color: #000000;
      margin: 0;
      letter-spacing: -0.5px;
    }
    .company-subtitle {
      font-size: 11px;
      font-weight: bold;
      letter-spacing: 0.18em;
      margin: 3px 0 0 0;
    }
    .company-details {
      font-size: 11.5px;
      font-weight: bold;
      line-height: 1.45;
      margin-top: 6px;
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(12, 1fr);
      border-top: 1px solid black;
      border-bottom: 1px solid black;
    }
    .col-9 { grid-column: span 9; }
    .col-3 { grid-column: span 3; }
    .col-7 { grid-column: span 7; }
    .col-5 { grid-column: span 5; }
    .border-r { border-right: 1px solid black; }
    .border-b { border-bottom: 1px solid black; }
    .p-2 { padding: 8px; }
    .p-3 { padding: 12px; }
    .bg-gray { background-color: #f3f4f6; }
    .font-mono { font-family: Courier, monospace; }
    
    table.goods-table {
      width: 100%;
      border-collapse: collapse;
      border-bottom: 1px solid black;
    }
    table.goods-table th, table.goods-table td {
      border-right: 1px solid black;
      border-bottom: 1px solid black;
      padding: 12px;
      text-align: left;
      font-size: 12px;
    }
    table.goods-table th:last-child, table.goods-table td:last-child {
      border-right: none;
    }
    .text-center { text-align: center; }
    .text-right { text-align: right; }
    
    .footer-section {
      display: grid;
      grid-template-columns: repeat(12, 1fr);
      font-size: 9px;
      margin-top: 15px;
    }

    .printed-value {
      font-size: ${format.fieldsFontSize ?? 12}px !important;
      font-family: Courier, monospace !important;
      font-weight: 900 !important;
      color: #000000 !important;
      visibility: visible !important;
    }

    ${format.hideBordersOnPerforma ? `
    .container { border: none !important; }
    .grid { border: none !important; }
    .border-b { border-bottom: none !important; }
    .border-r { border-right: none !important; }
    table.goods-table, table.goods-table th, table.goods-table td { border: none !important; }
    .goods-table th, .goods-table tbody tr { background: transparent !important; }
    .bg-gray { background: transparent !important; border-color: transparent !important; }
    ` : ''}

    ${format.hideLabelsOnPerforma ? `
    strong:not(.printed-value), span:not(.printed-value), .col-9:not(.printed-value), p:not(.printed-value), th:not(.printed-value) {
      color: transparent !important;
      background: transparent !important;
      border-color: transparent !important;
    }
    ` : ''}
    
    @media print {
      .no-print-bar { display: none !important; }
      body { padding: 0; background: white; }
      .main-wrapper { padding: 0; }
      .container { border: ${format.hideBordersOnPerforma ? 'none !important' : '2px solid black !important'}; max-width: 100%; margin: 0; }
      .print-only { display: block !important; }
    }
  </style>
</head>
<body>
  <div class="no-print-bar">
    <div style="font-size:14px; font-weight:bold; font-family: sans-serif;">Logistics Stationery Print System (LR #${lr.lrNo})</div>
    <button class="print-btn" onclick="window.print()">🖨️ Click to Print or Save as PDF</button>
  </div>
  
  <div class="main-wrapper">
    <div class="container">
      ${headerHtml}
      
      <div class="grid border-b">
        <div class="col-9 p-2 border-r text-gray-500" style="font-size:10px; font-weight:bold;">
          This consignment will not be diverted, rerouted without Consignee Bank's written permission. Will be delivered at the destination.
        </div>
        <div class="col-3 p-2 text-center bg-gray text-gray-700" style="font-size:12px; font-weight:900;">
          AT OWNER'S RISK
        </div>
      </div>
      
      <div class="grid border-b" style="font-size:12px;">
        <div class="col-7 border-r flex flex-col" style="min-height: 180px;">
          <div class="p-3 border-b" style="flex:1;">
            <strong style="font-size:9px; color:#555; text-transform:uppercase; display:block;">Consignor Name & Address:</strong>
            <div style="font-weight:900; font-size:14px; margin-top:4px;" class="printed-value">${lr.consignerName}</div>
            <p style="margin: 5px 0 0 0; font-size:11px; color:#333;">Point of Origin: <strong class="printed-value">${lr.placeFrom}</strong></p>
          </div>
          <div class="p-3" style="flex:1;">
            <strong style="font-size:9px; color:#555; text-transform:uppercase; display:block;">Consignee Name & Address:</strong>
            <div style="font-weight:900; font-size:14px; margin-top:4px;" class="printed-value">${lr.consigneeName}</div>
            <p style="margin: 5px 0 0 0; font-size:11px; color:#333;">Point of Destination: <strong class="printed-value">${lr.placeTo}</strong></p>
          </div>
        </div>
        
        <div class="col-5 flex flex-col font-mono" style="font-size:11px; font-weight:bold;">
          <div class="p-2 border-b bg-gray" style="display:flex; justify-content:space-between;">
            <span>L.R. NO:</span>
            <span style="font-weight:900; color:#b91c1c;" class="printed-value">${lr.lrNo}</span>
          </div>
          <div class="p-2 border-b" style="display:flex; justify-content:space-between;">
            <span>DATE:</span>
            <span class="printed-value">${lr.dated}</span>
          </div>
          <div class="p-2 border-b bg-gray" style="display:flex; justify-content:space-between;">
            <span>TANKER NO:</span>
            <span style="color:#b91c1c; font-weight:900;" class="printed-value">${lr.tankerNumber}</span>
          </div>
          <div class="p-2 border-b" style="display:flex; justify-content:space-between;">
            <span>PLACE FROM:</span>
            <span class="printed-value">${lr.placeFrom.toUpperCase()}</span>
          </div>
          <div class="p-2 border-b bg-gray" style="display:flex; justify-content:space-between;">
            <span>PLACE TO:</span>
            <span class="printed-value">${lr.placeTo.toUpperCase()}</span>
          </div>
          <div class="p-2" style="flex-grow:1; display:flex; flex-direction:column; justify-content:space-between;">
            <span style="font-size:9px; color:#555;">REMARKS:</span>
            <span style="font-size:10px; font-weight:bold; margin-top:4px;" class="printed-value">CARGO PRODUCT: ${lr.product}</span>
          </div>
        </div>
      </div>
      
      <table class="goods-table">
        <thead>
          <tr class="bg-gray">
            <th style="width:50%;">Description of Goods</th>
            <th class="text-center" style="width:25%;">Weight / Volume</th>
            <th class="text-right" style="width:25%;">Freight Value (INR)</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="padding: 30px 10px;">
              <div style="font-size:15px; font-weight:900; text-transform:uppercase;" class="printed-value">${lr.product}</div>
              <div style="font-size:10px; color:#555; margin-top:8px; line-height:1.4;">
                <p>• LIQUID PETROCHEMICAL BULK FLUIDS CARRIAGE</p>
                <p>• CARRIER VEHICLE PLATE REGISTRATION: <strong class="printed-value">${lr.tankerNumber}</strong></p>
                <p>• FREIGHT TARIFF RATE APPLIED: <span class="printed-value">₹${lr.freightRate.toLocaleString()} / ${lr.qtyUnit}</span></p>
              </div>
            </td>
            <td class="text-center printed-value" style="font-weight:bold; font-size:14px; padding:30px 10px;">
              ${lr.qty.toLocaleString()} ${lr.qtyUnit}
            </td>
            <td class="text-right font-mono printed-value" style="font-weight:900; font-size:14px; padding:30px 10px;">
              ₹${lr.freightTotal.toLocaleString()}
            </td>
          </tr>
          <tr class="bg-gray" style="font-weight:900; font-size:13px;">
            <td><strong class="printed-value">GRAND TOTALS</strong></td>
            <td class="text-center printed-value">${lr.qty.toLocaleString()} ${lr.qtyUnit}</td>
            <td class="text-right font-mono text-lg printed-value">₹${lr.freightTotal.toLocaleString()}</td>
          </tr>
        </tbody>
      </table>
      
      <div class="p-3 border-b" style="font-size:11px; font-weight:bold;">
        Value of Goods: <span style="font-weight:900;">${valueOfGoods}</span>
      </div>
      
      <div class="footer-section">
        <div class="col-7 font-mono" style="line-height:1.5;">
          <strong style="text-transform:uppercase; font-size:10px; font-family:sans-serif;">Subject to Local Jurisdiction</strong>  <br />
          (1) Please inspect the tanker and test the product properly before unloading. <br />
          (2) These goods are transported subject to conditions. <br />
          (3) Shortage if any must be noted on the face of the G. C. Note. <br />
          (4) No claim will be entertained subsequently. <br />
          (5) Service Tax / GST will be paid by Consignee / Consignor.
        </div>
        <div class="col-5 text-right flex flex-col justify-between" style="min-height:90px;">
          <div style="font-weight:bold; font-size:10px;">${footerCompanyHtml}</div>
          <div style="margin-top:auto;">
            <div style="border-top:1px solid black; width:150px; margin-left:auto; margin-bottom:3px;"></div>
            <div style="font-size:10px; font-weight:bold; text-align:center; width:150px; margin-left:auto;">Authorised Signature</div>
          </div>
        </div>
      </div>
    </div>
  </div>
  
  <script>
    window.onload = function() {
      setTimeout(function() {
        window.print();
      }, 500);
    };
  </script>
</body>
</html>`;

    const blob = new Blob([docStr], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Lorry_Receipt_${lr.lrNo.replace(/\s+/g, '_')}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // LR Creation Form States
  const [lrNo, setLrNo] = useState('');
  const [dated, setDated] = useState('');
  const [consigner, setConsigner] = useState('');
  const [consignee, setConsignee] = useState('');
  const [selectedTankerId, setSelectedTankerId] = useState('');
  const [product, setProduct] = useState('');
  const [qty, setQty] = useState<number>(0);
  const [qtyUnit, setQtyUnit] = useState<'KL' | 'MT'>('MT');
  const [placeFrom, setPlaceFrom] = useState('');
  const [placeTo, setPlaceTo] = useState('');
  const [freightRate, setFreightRate] = useState<number>(0);
  const [errorWord, setErrorWord] = useState('');

  // Extended Commission States
  const [lrType, setLrType] = useState<'own' | 'commission'>('own');
  const [commissionAmount, setCommissionAmount] = useState<number>(0);
  const [thirdPartyFleetName, setThirdPartyFleetName] = useState('');

  // LR Marking Receive Date State
  const [markingLrId, setMarkingLrId] = useState<string | null>(null);
  const [receivedTime, setReceivedTime] = useState('');

  // AI Design Template / Memory Cabin Handlers
  const [isAnalysingDesign, setIsAnalysingDesign] = useState(false);
  const [designMemory, setDesignMemory] = useState<any>(() => {
    try {
      const saved = localStorage.getItem('fleetmaster_lr_template_memory');
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  });
  const [isGeneratingAiLr, setIsGeneratingAiLr] = useState(false);

  // Kept scroll placement intact per user instructions to avoid page jumping when popups are opened
  useEffect(() => {
    // No-op to respect scroll focus where clicked
  }, []);

  const handleDesignTemplateUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsAnalysingDesign(true);
    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        try {
          const resultStr = reader.result as string;
          const commaIdx = resultStr.indexOf(',');
          if (commaIdx === -1) {
            throw new Error("Invalid file Content.");
          }
          const base64Content = resultStr.substring(commaIdx + 1);
          const mimeType = file.type || "image/jpeg";

          const response = await fetch("/api/lr/analyse-design", {
            method: "POST",
            headers: {
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              fileData: base64Content,
              mimeType: mimeType
            })
          });

          if (!response.ok) {
            throw new Error(`Design analysis error with status ${response.status}`);
          }

          const dataRes = await response.json();
          if (dataRes.success && dataRes.data) {
            const parsed = dataRes.data;
            setDesignMemory(parsed);
            localStorage.setItem('fleetmaster_lr_template_memory', JSON.stringify(parsed));

            // Automatically prefill Layout Settings form
            if (parsed.companyName) setCustomCompanyName(parsed.companyName);
            if (parsed.companySubtitle) setCustomSubtitle(parsed.companySubtitle);
            if (parsed.addressLine) setCustomAddress(parsed.addressLine);
            if (parsed.contactPhone) setCustomPhone(parsed.contactPhone);
            if (parsed.contactEmail) setCustomEmail(parsed.contactEmail);
            if (parsed.customPan) setCustomPan(parsed.customPan);
            if (parsed.customGstin) setCustomGstin(parsed.customGstin);
            setFormatType('custom_text');

            alert(`AI Design Memory trained successfully!\nLearned brand template parameters: "${parsed.companyName}"`);
          } else {
            throw new Error(dataRes.error || "No schema layout returned under analysis payload");
          }
        } catch (err: any) {
          console.error("AI template analysis failed:", err);
          alert(`Template analysis failed: ${err.message || err}`);
        } finally {
          setIsAnalysingDesign(false);
        }
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      console.error(err);
      setIsAnalysingDesign(false);
    }
  };

  const handleAiGenerateFromTrip = async (tripId: string) => {
    if (!tripId) return;
    const selectedTrip = trips.find(t => t.id === tripId);
    if (!selectedTrip) return;

    if (!designMemory) {
      alert("No design template memory found. Please upload/memorize your physical L.R design first!");
      return;
    }

    setIsGeneratingAiLr(true);
    try {
      const response = await fetch("/api/lr/generate-ai-lr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          designMemory: designMemory,
          tripDetails: {
            id: selectedTrip.id,
            tankerNumber: selectedTrip.tankerNumber,
            placeFrom: selectedTrip.placeFrom,
            placeTo: selectedTrip.placeTo,
            loadingWeight: selectedTrip.loadingWeight,
            qtyUnit: selectedTrip.qtyUnit || 'MT',
            startDate: selectedTrip.startDate,
            product: selectedTrip.product || 'Phenol Specialty Compounds'
          }
        })
      });

      if (!response.ok) {
        throw new Error(`AI generation error with status ${response.status}`);
      }

      const resData = await response.json();
      if (resData.success && resData.data) {
        const gen = resData.data;
        // Prefill Form Fields!
        if (gen.lrNo) setLrNo(gen.lrNo);
        if (gen.dated) setDated(gen.dated);
        if (gen.consignerName) setConsigner(gen.consignerName);
        if (gen.consigneeName) setConsignee(gen.consigneeName);
        if (gen.product) setProduct(gen.product);
        if (gen.qty) setQty(parseFloat(gen.qty) || 0);
        if (gen.qtyUnit) setQtyUnit(gen.qtyUnit.toUpperCase() === 'KL' ? 'KL' : 'MT');
        if (gen.placeFrom) setPlaceFrom(gen.placeFrom);
        if (gen.placeTo) setPlaceTo(gen.placeTo);
        if (gen.freightRate) setFreightRate(parseFloat(gen.freightRate) || 0);

        // Find and preselect matching tanker from tankers database if existing
        const matched = tankers.find(t => 
          t.tankerNumber.replace(/[^A-Za-z0-9]/g, '').toLowerCase() === 
          selectedTrip.tankerNumber.replace(/[^A-Za-z0-9]/g, '').toLowerCase()
        );
        if (matched) {
          setLrType('own');
          setSelectedTankerId(matched.id);
        }

        alert(`AI Generation & Design Matching Successful!\nAuto-created L.R. "${gen.lrNo}" matching the physical layout memory guidelines of "${designMemory.companyName}"!`);
      } else {
        throw new Error(resData.error || "No fields returned from AI generation node.");
      }
    } catch (err: any) {
      console.error(err);
      alert(`AI L.R Generation Failed: ${err.message || err}`);
    } finally {
      setIsGeneratingAiLr(false);
    }
  };

  const currentDate = new Date('2026-05-23');

  const formattedLrs = lrs.filter(l => 
    l.lrNo.toLowerCase().includes(lrSearchField.toLowerCase()) || 
    l.consignerName.toLowerCase().includes(lrSearchField.toLowerCase()) ||
    l.consigneeName.toLowerCase().includes(lrSearchField.toLowerCase())
  );

  const activeLr = lrs.find(l => l.id === selectedLrId) || lrs[0];

  const format = currentUser?.lrFormat || {
    type: 'blank',
    companyName: '',
    companySubtitle: '',
    companyAddress: '',
    companyPhone: '',
    companyEmail: '',
    customPan: '',
    customGstin: '',
    logoB64: '',
    lrPerformaB64: ''
  };

  const createLrSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorWord('');

    if (lrType === 'own') {
      if (!lrNo || !consigner || !consignee || !selectedTankerId || !product || qty <= 0 || freightRate <= 0) {
        setErrorWord('Ensure all fields are configured with valid quantities.');
        return;
      }
    } else {
      if (!lrNo || !consigner || !consignee || !thirdPartyFleetName || !product || qty <= 0 || commissionAmount <= 0) {
        setErrorWord('Ensure all fields including third-party vessel plate and commission amount are configured.');
        return;
      }
    }

    // Strict uniqueness check for LR number (consecutive audit rules)
    const exists = lrs.some(l => l.lrNo.trim().toUpperCase() === lrNo.trim().toUpperCase());
    if (exists) {
      setErrorWord(`Lorry Receipt No. ${lrNo} is already registered inside active logs. Choose an alternative unique number.`);
      return;
    }

    let tnkId = '3RD-PARTY';
    let tnkNum = thirdPartyFleetName;

    if (lrType === 'own') {
      const tnk = tankers.find(t => t.id === selectedTankerId);
      if (!tnk) return;
      tnkId = tnk.id;
      tnkNum = tnk.tankerNumber;
    }

    // Freight calculated (qty * freightRate or general fixed)
    const freightTotal = lrType === 'own' ? qty * freightRate : 0;

    const newLr: LorryReceipt = {
      id: `LR-${Math.floor(100 + Math.random() * 900)}`,
      lrNo: lrNo.trim().toUpperCase(),
      dated: dated || currentDate.toISOString().split('T')[0],
      consignerName: consigner,
      consigneeName: consignee,
      tankerId: tnkId,
      tankerNumber: tnkNum,
      product,
      qty,
      qtyUnit,
      placeFrom,
      placeTo,
      freightRate: lrType === 'own' ? freightRate : 0,
      freightTotal: freightTotal,
      status: 'pending',
      lrType,
      commissionAmount: lrType === 'commission' ? commissionAmount : undefined,
      thirdPartyFleetName: lrType === 'commission' ? thirdPartyFleetName : undefined
    };

    onAddLr(newLr);
    setSelectedLrId(newLr.id);
    setShowCreateModal(false);

    // reset forms
    setLrNo('');
    setConsigner('');
    setConsignee('');
    setSelectedTankerId('');
    setProduct('');
    setQty(0);
    setPlaceFrom('');
    setPlaceTo('');
    setFreightRate(0);
    setCommissionAmount(0);
    setThirdPartyFleetName('');
    setLrType('own');
  };

  const receiveSubmit = (lrId: string) => {
    if (!receivedTime) {
      alert("Please select a valid date/time.");
      return;
    }
    onReceiveLr(lrId, receivedTime);
    setMarkingLrId(null);
    setReceivedTime('');
  };

  // Warning calculator for overdue LR copies (> 10 days)
  const isLrOverdue = (lr: LorryReceipt) => {
    if (lr.status === 'received') return false;
    const lrDate = new Date(lr.dated);
    const diffTime = currentDate.getTime() - lrDate.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 10;
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 py-6 selection:bg-[#ff5a5f] selection:text-white relative">
      {/* Upper header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#30363d] pb-6">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Lorry Receipt Formats</h2>
          <p className="text-xs text-[#8b949e] font-mono mt-1">PESO CHEMICAL DECLARATIONS, VERIFIED CONSIGNEE DISPATCH & COMPLIANCE</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button 
            type="button"
            onClick={() => {
              const format = currentUser?.lrFormat || {
                type: 'blank',
                companyName: '',
                companySubtitle: '',
                companyAddress: '',
                companyPhone: '',
                companyEmail: '',
                customPan: '',
                customGstin: '',
                logoB64: '',
                lrPerformaB64: '',
                hideHeaderOnPerforma: true,
                hideBordersOnPerforma: false,
                hideLabelsOnPerforma: false,
                verticalPaddingOffset: 130,
                fieldsFontSize: 12
              };
              setFormatType(format.type || 'blank');
              setCustomCompanyName(format.companyName || '');
              setCustomSubtitle(format.companySubtitle || '');
              setCustomAddress(format.companyAddress || '');
              setCustomPhone(format.companyPhone || '');
              setCustomEmail(format.companyEmail || '');
              setCustomPan(format.customPan || '');
              setCustomGstin(format.customGstin || '');
              setLogoB64(format.logoB64 || '');
              setLrPerformaB64(format.lrPerformaB64 || '');
              setHideHeaderOnPerforma(format.hideHeaderOnPerforma ?? true);
              setHideBordersOnPerforma(format.hideBordersOnPerforma ?? false);
              setHideLabelsOnPerforma(format.hideLabelsOnPerforma ?? false);
              setVerticalPaddingOffset(format.verticalPaddingOffset ?? 130);
              setFieldsFontSize(format.fieldsFontSize ?? 12);
              setShowFormatConfig(true);
            }}
            className="px-4 py-2.5 bg-[#21262d] hover:bg-[#30363d] text-white border border-[#30363d] hover:border-[#ff5a5f]/40 font-semibold rounded-xl text-xs inline-flex items-center gap-1.5 transition-all cursor-pointer font-sans"
          >
            <FileText className="w-4 h-4 text-orange-400" />
            Stationary & L.R. Layout Setup
          </button>
          
          <button 
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2.5 bg-gradient-to-r from-[#ff5a5f] to-[#e11d48] hover:opacity-95 text-white font-semibold rounded-xl text-xs inline-flex items-center gap-1.5 shadow-md shadow-[#ff5a5f]/10 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Generate Unique L.R.
          </button>
        </div>
      </div>

      {/* L.R. Format Configuration overlay modal */}
      {showFormatConfig && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-[#161b22] border border-[#30363d] rounded-2xl max-w-xl w-full p-6 text-white font-sans max-h-[90vh] overflow-y-auto"
          >
            <div className="flex justify-between items-center pb-4 border-b border-[#30363d] mb-4">
              <h3 className="text-sm font-mono uppercase tracking-wider text-orange-400 font-bold flex items-center gap-1.5">
                📋 Lorry Receipt Stationary Format
              </h3>
              <button 
                onClick={() => setShowFormatConfig(false)}
                className="text-gray-400 hover:text-white cursor-pointer p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-5">
              <div>
                <label className="block text-xs font-mono text-gray-400 uppercase tracking-wider mb-2 font-bold">
                  Print Output Mode
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setFormatType('blank')}
                    className={`py-3 px-2 border rounded-xl text-xs font-mono font-bold flex flex-col items-center justify-center gap-1.5 cursor-pointer transition-all ${
                      formatType === 'blank'
                        ? 'bg-orange-500/10 text-orange-400 border-orange-500'
                        : 'bg-[#0d1117] text-gray-400 border-[#30363d] hover:bg-[#21262d]'
                    }`}
                  >
                    <span>🔳 PREPRINTED</span>
                    <span className="text-[9px] text-gray-500 font-sans not-italic text-center">Let headers stand blank for external stationery</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormatType('custom_text')}
                    className={`py-3 px-2 border rounded-xl text-xs font-mono font-bold flex flex-col items-center justify-center gap-1.5 cursor-pointer transition-all ${
                      formatType === 'custom_text'
                        ? 'bg-orange-500/10 text-orange-400 border-orange-500'
                        : 'bg-[#0d1117] text-gray-400 border-[#30363d] hover:bg-[#21262d]'
                    }`}
                  >
                    <span>🔤 CUSTOM TEXT</span>
                    <span className="text-[9px] text-gray-500 font-sans not-italic text-center">Overlay custom names & contacts digitally</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormatType('custom_image')}
                    className={`py-3 px-2 border rounded-xl text-xs font-mono font-bold flex flex-col items-center justify-center gap-1.5 cursor-pointer transition-all ${
                      formatType === 'custom_image'
                        ? 'bg-orange-500/10 text-orange-400 border-orange-500'
                        : 'bg-[#0d1117] text-gray-400 border-[#30363d] hover:bg-[#21262d]'
                    }`}
                  >
                    <span>🖼️ LOGO / BANNER</span>
                    <span className="text-[9px] text-gray-500 font-sans not-italic text-center">Upload dynamic B64 PNG stationery layout</span>
                  </button>
                </div>
              </div>

              {formatType === 'custom_text' && (
                <div className="space-y-3 bg-[#0d1117] p-4 rounded-xl border border-[#30363d]">
                  <p className="text-[10px] font-mono uppercase tracking-widest text-orange-400 font-bold mb-2">Configure Corporate Stamp Metadata</p>
                  
                  <div className="space-y-1">
                    <label className="block text-[10px] uppercase font-mono text-gray-400">Carrier Registered Name</label>
                    <input 
                      type="text"
                      value={customCompanyName}
                      onChange={(e) => setCustomCompanyName(e.target.value)}
                      placeholder="e.g. BALAJI EXPEDIEERS ROADWAYS"
                      className="w-full bg-[#161b22] px-3 py-2 border border-[#30363d] rounded-lg text-xs text-white outline-none focus:border-orange-500 font-sans"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[10px] uppercase font-mono text-gray-400">Tagline / Subheading</label>
                    <input 
                      type="text"
                      value={customSubtitle}
                      onChange={(e) => setCustomSubtitle(e.target.value)}
                      placeholder="e.g. CHEMICAL BULK FLUIDS SPECIALISTS"
                      className="w-full bg-[#161b22] px-3 py-2 border border-[#30363d] rounded-lg text-xs text-white outline-none focus:border-orange-500 font-sans"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[10px] uppercase font-mono text-gray-400">Offices & HQ Address</label>
                    <textarea 
                      value={customAddress}
                      onChange={(e) => setCustomAddress(e.target.value)}
                      placeholder="e.g. Plot No. 101, Phase-II GIDC Ankleshwar, Gujarat - 393002"
                      className="w-full bg-[#161b22] px-3 py-2 border border-[#30363d] rounded-lg text-xs text-white outline-none focus:border-orange-500 font-sans h-16 resize-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="block text-[10px] uppercase font-mono text-gray-400">Mob / Phone</label>
                      <input 
                        type="text"
                        value={customPhone}
                        onChange={(e) => setCustomPhone(e.target.value)}
                        placeholder="e.g. +91 98250 81023"
                        className="w-full bg-[#161b22] px-3 py-2 border border-[#30363d] rounded-lg text-xs text-white outline-none focus:border-orange-500 font-sans"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-[10px] uppercase font-mono text-gray-400">Email Address</label>
                      <input 
                        type="text"
                        value={customEmail}
                        onChange={(e) => setCustomEmail(e.target.value)}
                        placeholder="e.g. contact@balajiroadways.com"
                        className="w-full bg-[#161b22] px-3 py-2 border border-[#30363d] rounded-lg text-xs text-white outline-none focus:border-orange-500 font-sans"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="block text-[10px] uppercase font-mono text-gray-400">PAN Number</label>
                      <input 
                        type="text"
                        value={customPan}
                        onChange={(e) => setCustomPan(e.target.value)}
                        placeholder="e.g. ABCDE1234F"
                        className="w-full bg-[#161b22] px-3 py-2 border border-[#30363d] rounded-lg text-xs text-white outline-none focus:border-orange-500 font-sans"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-[10px] uppercase font-mono text-gray-400">GSTIN Number</label>
                      <input 
                        type="text"
                        value={customGstin}
                        onChange={(e) => setCustomGstin(e.target.value)}
                        placeholder="e.g. 24ABCDE1234F1Z0"
                        className="w-full bg-[#161b22] px-3 py-2 border border-[#30363d] rounded-lg text-xs text-white outline-none focus:border-orange-500 font-sans"
                      />
                    </div>
                  </div>
                </div>
              )}

              {formatType === 'custom_image' && (
                <div className="space-y-4 bg-[#0d1117] p-5 rounded-xl border border-[#30363d] text-center">
                  <p className="text-[10px] font-mono uppercase tracking-widest text-orange-400 font-bold mb-1">Upload Digital L.R Stationary Image</p>
                  <p className="text-xs text-gray-400 max-w-sm mx-auto">Upload any horizontal corporate letterhead, banner image, or complete high-res scan of physical stationery layout paper.</p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Col 1: Letter Head */}
                    <div className="space-y-2 text-center p-3 bg-[#0d1117] rounded-lg border border-[#21262d]">
                      <span className="block text-[10px] font-mono uppercase tracking-wider text-[#ff5a5f] font-bold">1. Company Letter Head Performa</span>
                      <div className="border border-dashed border-gray-600 rounded-xl p-4 bg-[#161b22] flex flex-col items-center justify-center space-y-2 cursor-pointer relative hover:border-orange-500 transition-all min-h-[110px]">
                        <FileText className="w-6 h-6 text-[#ff5a5f]" />
                        <span className="block text-[10px] font-bold text-white">Select Letterhead Image</span>
                        <input 
                          type="file" 
                          accept="image/*"
                          onChange={handleLogoUpload}
                          className="absolute inset-0 opacity-0 cursor-pointer"
                        />
                      </div>
                      {logoB64 ? (
                        <div className="space-y-1.5 text-center">
                          <div className="bg-white p-1 rounded border border-[#30363d] max-h-16 overflow-hidden flex items-center justify-center">
                            <img src={logoB64} alt="Letterhead" referrerPolicy="no-referrer" className="max-h-14 object-contain" />
                          </div>
                          <button
                            type="button"
                            onClick={() => setLogoB64('')}
                            className="w-full py-1.5 px-2.5 bg-rose-950/40 hover:bg-rose-900 border border-rose-500/30 text-rose-400 hover:text-white rounded-lg text-[10px] font-mono flex items-center justify-center gap-1.5 cursor-pointer transition-all"
                          >
                            <Trash2 className="w-3 h-3 text-rose-500 hover:text-white" />
                            Delete Letterhead
                          </button>
                        </div>
                      ) : (
                        <span className="text-[9px] text-[#8b949e] font-mono italic">No letterhead uploaded</span>
                      )}
                    </div>

                    {/* Col 2: L.R. Performa template */}
                    <div className="space-y-2 text-center p-3 bg-[#0d1117] rounded-lg border border-[#21262d]">
                      <span className="block text-[10px] font-mono uppercase tracking-wider text-cyan-400 font-bold">2. Company L.R. Performa</span>
                      <div className="border border-dashed border-gray-600 rounded-xl p-4 bg-[#161b22] flex flex-col items-center justify-center space-y-2 cursor-pointer relative hover:border-cyan-500 transition-all min-h-[110px]">
                        <Plus className="w-6 h-6 text-cyan-400" />
                        <span className="block text-[10px] font-bold text-white">Select L.R Performa Image</span>
                        <input 
                          type="file" 
                          accept="image/*"
                          onChange={handleLrPerformaUpload}
                          className="absolute inset-0 opacity-0 cursor-pointer"
                        />
                      </div>
                      {lrPerformaB64 ? (
                        <div className="space-y-1.5 text-center">
                          <div className="bg-white p-1 rounded border border-[#30363d] max-h-16 overflow-hidden flex items-center justify-center">
                            <img src={lrPerformaB64} alt="LR Performa" referrerPolicy="no-referrer" className="max-h-14 object-contain" />
                          </div>
                          <button
                            type="button"
                            onClick={() => setLrPerformaB64('')}
                            className="w-full py-1.5 px-2.5 bg-rose-950/40 hover:bg-rose-900 border border-rose-500/30 text-rose-400 hover:text-white rounded-lg text-[10px] font-mono flex items-center justify-center gap-1.5 cursor-pointer transition-all"
                          >
                            <Trash2 className="w-3 h-3 text-rose-500 hover:text-white" />
                            Delete L.R. Performa
                          </button>
                        </div>
                      ) : (
                        <span className="text-[9px] text-[#8b949e] font-mono italic">No L.R performa uploaded</span>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {formatType === 'blank' && (
                <div className="bg-[#0f1d1a] border border-[#1b3a32] p-4 rounded-xl flex items-start gap-3">
                  <CheckSquare className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-xs font-bold font-mono text-emerald-300 uppercase tracking-wide">Blank physical stationary alignment enabled</h4>
                    <p className="text-xs text-emerald-200/80 mt-1">This mode keeps layout coordinates empty/clean. Best suited when printing directly onto existing carbonized pre-printed receipt pads using impact matrix printers.</p>
                  </div>
                </div>
              )}

              {/* Preprinted Layout Tuning options */}
              <div className="p-4 bg-orange-950/20 border border-orange-500/30 rounded-xl space-y-4">
                <div className="flex items-center gap-2">
                  <span className="text-base">🛠️</span>
                  <div>
                    <h4 className="text-xs font-bold font-mono text-orange-400 uppercase tracking-wide">
                      AI Preprinted Layout & Fine-Tuning Calibration
                    </h4>
                    <p className="text-[10px] text-gray-400">
                      Perfectly align text lines and adjust boundaries over your uploaded preprinted pads.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Vertical Padding / Height Offset */}
                  <div className="space-y-1">
                    <div className="flex justify-between items-center">
                      <label className="block text-[10px] uppercase font-mono text-gray-400">
                        Vertical Header Spacing Offset
                      </label>
                      <span className="text-[10px] font-mono text-orange-400 font-bold">{verticalPaddingOffset}px</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <input 
                        type="range"
                        min="20"
                        max="350"
                        step="5"
                        value={verticalPaddingOffset}
                        onChange={(e) => setVerticalPaddingOffset(parseInt(e.target.value))}
                        className="w-full accent-orange-500 bg-[#161b22] h-2 rounded-lg cursor-pointer"
                      />
                      <input 
                        type="number"
                        min="20"
                        max="350"
                        value={verticalPaddingOffset}
                        onChange={(e) => setVerticalPaddingOffset(parseInt(e.target.value) || 130)}
                        className="w-16 bg-[#161b22] border border-[#30363d] px-2 py-0.5 rounded text-center text-xs text-white font-mono"
                      />
                    </div>
                  </div>

                  {/* Fields Font Size */}
                  <div className="space-y-1">
                    <div className="flex justify-between items-center">
                      <label className="block text-[10px] uppercase font-mono text-gray-400">
                        Values Font Size
                      </label>
                      <span className="text-[10px] font-mono text-orange-400 font-bold">{fieldsFontSize}px</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <input 
                        type="range"
                        min="9"
                        max="24"
                        step="1"
                        value={fieldsFontSize}
                        onChange={(e) => setFieldsFontSize(parseInt(e.target.value))}
                        className="w-full accent-orange-500 bg-[#161b22] h-2 rounded-lg cursor-pointer"
                      />
                      <input 
                        type="number"
                        min="9"
                        max="24"
                        value={fieldsFontSize}
                        onChange={(e) => setFieldsFontSize(parseInt(e.target.value) || 12)}
                        className="w-16 bg-[#161b22] border border-[#30363d] px-2 py-0.5 rounded text-center text-xs text-white font-mono"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2 pt-2 border-t border-[#30363d]/50">
                  {/* Hide Header Toggle */}
                  <label className="flex items-center gap-2.5 text-xs text-gray-300 font-mono cursor-pointer select-none">
                    <input 
                      type="checkbox"
                      checked={hideHeaderOnPerforma}
                      onChange={(e) => setHideHeaderOnPerforma(e.target.checked)}
                      className="w-4 h-4 accent-orange-500 rounded bg-[#161b22] border-[#30363d]"
                    />
                    <span>Hide digital Letterhead header content (prevent preprinted title overlaps)</span>
                  </label>

                  {/* Hide Borders Toggle */}
                  <label className="flex items-center gap-2.5 text-xs text-gray-300 font-mono cursor-pointer select-none">
                    <input 
                      type="checkbox"
                      checked={hideBordersOnPerforma}
                      onChange={(e) => setHideBordersOnPerforma(e.target.checked)}
                      className="w-4 h-4 accent-orange-500 rounded bg-[#161b22] border-[#30363d]"
                    />
                    <span>Hide receipt boxes & grid-lines (Value-Only print overlay mode)</span>
                  </label>

                  {/* Hide Labels Toggle */}
                  <label className="flex items-center gap-2.5 text-xs text-gray-300 font-mono cursor-pointer select-none">
                    <input 
                      type="checkbox"
                      checked={hideLabelsOnPerforma}
                      onChange={(e) => setHideLabelsOnPerforma(e.target.checked)}
                      className="w-4 h-4 accent-orange-500 rounded bg-[#161b22] border-[#30363d]"
                    />
                    <span>Hide label headings (prints raw parameters over matching preprinted fields)</span>
                  </label>
                </div>
              </div>

              {/* BRANDING DESIGN ANALYSER INSTRUCTOR */}
              <div className="p-4 bg-gradient-to-br from-indigo-950/25 to-[#0f141c] border border-indigo-500/40 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-base">📸</span>
                    <div>
                      <h4 className="text-xs font-bold font-mono text-indigo-400 uppercase tracking-wide">
                        AI Physical L.R Design Memory Trainer
                      </h4>
                      <p className="text-[10px] text-gray-400 leading-normal">
                        Upload a photo of your blank preprinted layout or letterhead paper. AI will analyze the styling and save it in memory to auto-generate perfect matches next time.
                      </p>
                    </div>
                  </div>
                  <span className="text-[9px] bg-indigo-505/10 text-indigo-400 font-mono font-bold uppercase py-0.5 px-2 rounded border border-indigo-500/20">
                    Design Cabin
                  </span>
                </div>

                <div className="border border-dashed border-indigo-500/40 rounded-xl p-4 bg-[#0d1117] flex flex-col items-center justify-center space-y-2 cursor-pointer relative hover:border-indigo-400 hover:bg-indigo-900/5 transition-all text-center">
                  {isAnalysingDesign ? (
                    <div className="py-1 flex flex-col items-center space-y-2">
                      <div className="w-6 h-6 rounded-full border-4 border-indigo-505 border-t-transparent animate-spin animate-duration-500" />
                      <span className="text-xs font-mono text-indigo-400 font-bold animate-pulse">Running Deep Layout Styling Extraction...</span>
                    </div>
                  ) : (
                    <>
                      <FileText className="w-6 h-6 text-indigo-400" />
                      <div>
                        <span className="block text-xs font-bold text-white">Select Blank L.R Template Scan / Photo</span>
                        <span className="block text-[9px] text-[#8b949e] mt-0.5 font-mono">PNG, JPG, WEBP formats</span>
                      </div>
                      <input 
                        type="file" 
                        accept="image/*"
                        onChange={handleDesignTemplateUpload}
                        className="absolute inset-0 opacity-0 cursor-pointer"
                        disabled={isAnalysingDesign}
                      />
                    </>
                  )}
                </div>

                {designMemory ? (
                  <div className="p-2.5 bg-[#0d1117] border border-[#21262d] rounded-xl text-[10.5px] font-mono leading-relaxed text-indigo-300 space-y-1.5">
                    <div className="font-bold text-indigo-400 uppercase text-[9.5px] tracking-wide mb-1 flex justify-between items-center">
                      <span>✨ Saved Memory Template: "{designMemory.companyName}"</span>
                      <button 
                        type="button" 
                        onClick={() => {
                          localStorage.removeItem('fleetmaster_lr_template_memory');
                          setDesignMemory(null);
                        }} 
                        className="text-rose-400 hover:text-rose-300 text-[9px] uppercase tracking-wider font-bold cursor-pointer"
                      >
                        Reset
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-gray-400 font-sans text-[10px]">
                      <div><strong className="text-indigo-300">Color Theme:</strong> {designMemory.brandingColorTheme}</div>
                      <div><strong className="text-indigo-300">Grid Style:</strong> {designMemory.layoutStyle}</div>
                      <div className="col-span-2"><strong className="text-indigo-300">Design Directive:</strong> {designMemory.aiDesignGuidelines}</div>
                    </div>
                  </div>
                ) : (
                  <div className="text-[10px] italic text-[#8b949e] text-center font-mono py-1">
                    No physical L.R design currently stored in memory. Upload one to build AI auto-generation capability!
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-6 border-t border-[#30363d] mt-6">
              <button
                type="button"
                onClick={() => setShowFormatConfig(false)}
                className="px-4 py-2 bg-[#21262d] hover:bg-[#30363d] text-white rounded-lg text-xs font-bold cursor-pointer transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={saveLrFormat}
                className="px-5 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-xs font-bold cursor-pointer transition-all flex items-center gap-1.5"
              >
                <CheckCircle className="w-3.5 h-3.5" />
                Apply Stationary Layout
              </button>
            </div>
          </motion.div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Side: Receipt Logs Picker List */}
        <div className="lg:col-span-4 space-y-4">
          <div className="relative">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-[#8b949e]">
              <Search className="w-4 h-4" />
            </span>
            <input 
              type="text" 
              placeholder="Search LR by No. or Party name..."
              value={lrSearchField}
              onChange={(e) => setLrSearchField(e.target.value)}
              className="w-full bg-[#161b22] pl-10 pr-4 py-2 border border-[#30363d] rounded-xl text-xs text-white outline-none focus:border-[#ff5a5f] text-sans"
            />
          </div>

          {/* Export Controls */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => {
                const headers = ['LR Number', 'Dated', 'Consigner', 'Consignee', 'Product', 'Quantity', 'Unit', 'From', 'To', 'Freight Total', 'Status'];
                const keys = ['lrNo', 'dated', 'consignerName', 'consigneeName', 'product', 'qty', 'qtyUnit', 'placeFrom', 'placeTo', 'freightTotal', 'status'];
                exportToExcel('Lorry Receipts Record', headers, keys, lrs, 'Lorry_Receipts_Record.csv');
              }}
              className="px-3 py-2 bg-[#21262d] hover:bg-[#30363d] border border-[#30363d] hover:border-emerald-500/30 text-emerald-400 rounded-lg text-xs font-semibold inline-flex items-center justify-center gap-1.5 transition-all cursor-pointer font-sans"
            >
              <Download className="w-3.5 h-3.5" />
              Excel Export
            </button>
            <button
              onClick={() => {
                const headers = ['LR No.', 'Dated', 'Consigner', 'Consignee', 'Product', 'Qty', 'Unit', 'From', 'To', 'Freight', 'Status'];
                const keys = ['lrNo', 'dated', 'consignerName', 'consigneeName', 'product', 'qty', 'qtyUnit', 'placeFrom', 'placeTo', 'freightTotal', 'status'];
                exportToPDF('Lorry Receipts Record', headers, keys, lrs, 'Lorry_Receipts_Record.pdf', 'Official PESO Chemical Declarations & Despatches');
              }}
              className="px-3 py-2 bg-[#21262d] hover:bg-[#30363d] border border-[#30363d] hover:border-red-500/30 text-red-400 rounded-lg text-xs font-semibold inline-flex items-center justify-center gap-1.5 transition-all cursor-pointer font-sans"
            >
              <Download className="w-3.5 h-3.5" />
              PDF Export
            </button>
          </div>

          <div className="space-y-2 max-h-[600px] overflow-y-auto">
            {formattedLrs.map((lr) => {
              const isActive = activeLr?.id === lr.id;
              const overdue = isLrOverdue(lr);

              return (
                <div 
                  key={lr.id}
                  onClick={() => setSelectedLrId(lr.id)}
                  className={`p-4 rounded-xl border cursor-pointer transition-all ${
                    isActive 
                      ? 'bg-gradient-to-r from-[#1b1f27] to-[#161b22] border-[#ff5a5f]' 
                      : 'bg-[#161b22] border-[#30363d] hover:bg-[#21262d]'
                  }`}
                >
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs font-mono font-bold text-[#ff5a5f]">{lr.lrNo}</span>
                    <span className="text-[10px] text-[#8b949e] font-mono">{lr.dated}</span>
                  </div>
                  <div className="text-sm font-semibold text-white tracking-tight truncate">{lr.consignerName}</div>
                  <div className="text-xs text-[#8b949e] truncate mt-0.5">➔ {lr.consigneeName}</div>
                  
                  <div className="flex justify-between items-center mt-3 pt-2.5 border-t border-[#21262d]">
                    <span className="text-[10px] font-mono text-[#8b949e] uppercase">{lr.product}</span>
                    <span className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold ${
                      lr.status === 'received' 
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                        : overdue 
                          ? 'bg-red-500/10 text-red-400 border border-red-500/20 animate-pulse'
                          : 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/20'
                    }`}>
                      {lr.status === 'received' ? 'RECEIVED COPY' : overdue ? 'LR DELAY OVERDUE' : 'LR AWAITING'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>        {/* Right Side: Professional Invoice/LR Layout Printable Sheet */}
        <div className="lg:col-span-8">
          {activeLr ? (
            <div className="space-y-6">
              
              {/* Receipt Control Bar (Only Visible in App, Hidden on Print) */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#161b22] border border-[#30363d] p-4 rounded-xl no-print">
                <div>
                  <span className="text-xs font-mono text-[#8b949e] block">BARODA ROAD CARRIERS STATIONERY PREVIEW</span>
                  <span className="text-[10px] text-cyan-400 font-mono mt-0.5 block">⚡ If direct printing is blocked by browser frame, use Standalone Download</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {onDeleteLr && (
                    <button
                      onClick={() => onDeleteLr(activeLr.id)}
                      className="px-3 py-1.5 bg-rose-500/10 border border-rose-500/20 hover:bg-rose-500 text-rose-400 hover:text-white rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 transition-all cursor-pointer"
                      title="Move this Lorry Receipt copy to System Trash"
                    >
                      Delete L.R.
                    </button>
                  )}
                  <button
                    onClick={() => window.print()}
                    className="px-3 py-1.5 bg-[#21262d] hover:bg-[#30363d] text-white border border-[#30363d] rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
                  >
                    <Printer className="w-4 h-4 text-[#ff5a5f]" />
                    Print in frame
                  </button>
                  <button
                    onClick={() => downloadLrAsStandaloneHtml(activeLr)}
                    className="px-3.5 py-1.5 bg-gradient-to-r from-[#ff5a5f] to-[#e11d48] hover:opacity-95 text-white rounded-lg text-xs font-bold inline-flex items-center gap-1.5 transition-all cursor-pointer shadow shadow-[#ff5a5f]/20"
                  >
                    📥 Standalone L.R. Download
                  </button>
                </div>
              </div>

              {/* Dynamic Printable styles */}
              <style>{`
                .lr-grid-borders th, .lr-grid-borders td {
                  border-right: ${format.hideBordersOnPerforma ? 'none !important' : '1px solid #111827 !important'};
                  border-bottom: ${format.hideBordersOnPerforma ? 'none !important' : '1px solid #111827 !important'};
                }
                .lr-grid-borders th:last-child, .lr-grid-borders td:last-child {
                  border-right: none;
                }

                ${format.hideBordersOnPerforma ? `
                  #printable-lr-sheet {
                    border-color: transparent !important;
                    box-shadow: none !important;
                  }
                  #printable-lr-sheet .grid, #printable-lr-sheet .border-b, #printable-lr-sheet .border-r, #printable-lr-sheet .divide-y, #printable-lr-sheet .border-b-2 {
                    border-color: transparent !important;
                  }
                  #printable-lr-sheet .bg-gray-50, #printable-lr-sheet .bg-gray {
                    background-color: transparent !important;
                  }
                ` : ''}

                ${format.hideLabelsOnPerforma ? `
                  #printable-lr-sheet strong:not(.printed-value), 
                  #printable-lr-sheet span:not(.printed-value), 
                  #printable-lr-sheet th,
                  #printable-lr-sheet p,
                  #printable-lr-sheet div:not(#printable-lr-sheet):not(.printed-value),
                  #printable-lr-sheet td:not(.printed-value) {
                    color: transparent !important;
                    background-color: transparent !important;
                  }
                ` : ''}

                #printable-lr-sheet .printed-value {
                  font-size: ${format.fieldsFontSize ?? 12}px !important;
                  font-family: Courier, monospace !important;
                  font-weight: 900 !important;
                  color: #000000 !important;
                  visibility: visible !important;
                }

                @media print {
                  body {
                    background: white !important;
                    color: black !important;
                  }
                  header, nav, aside, footer, button, .no-print, [role="button"], .no-print-wrapper {
                    display: none !important;
                  }
                  main, .main-content {
                    padding: 0 !important;
                    margin: 0 !important;
                    background: white !important;
                  }
                  #printable-lr-sheet {
                    position: absolute !important;
                    left: 0 !important;
                    top: 0 !important;
                    width: 100% !important;
                    margin: 0 !important;
                    box-shadow: none !important;
                    border: ${format.hideBordersOnPerforma ? 'none !important' : '2px solid #000000 !important'};
                    padding: 15px !important;
                    color: black !important;
                    background: white !important;
                  }
                }
              `}</style>

              {/* High-Fidelity Baroda Road Carriers Receipt */}
              <div 
                id="printable-lr-sheet" 
                className={`bg-white text-gray-900 rounded-xl p-6 relative overflow-hidden font-sans ${format.hideBordersOnPerforma ? 'border-none' : 'border-2 border-gray-900 shadow-xl'}`}
                style={format.lrPerformaB64 ? {
                  backgroundImage: `url(${format.lrPerformaB64})`,
                  backgroundSize: '100% 100%',
                  backgroundRepeat: 'no-repeat',
                  backgroundPosition: 'center',
                  fontSize: `${format.fieldsFontSize ?? 12}px`
                } : {
                  fontSize: `${format.fieldsFontSize ?? 12}px`
                }}
              >
                {/* Dynamic Letterhead Header depending on user custom setting */}
                {(() => {
                  const isPerformaActive = !!format.lrPerformaB64;
                  const shouldHideHeader = isPerformaActive && (format.hideHeaderOnPerforma ?? true);

                  if (shouldHideHeader) {
                    return (
                      <>
                        <div 
                          style={{ height: `${format.verticalPaddingOffset ?? 130}px` }} 
                          className="flex items-center justify-center mb-4 bg-transparent p-4 text-center select-none no-print"
                        >
                          <span className="text-[10px] font-mono font-bold text-[#ff5a5f] bg-white/90 px-3 py-1.5 rounded-lg border border-[#ff5a5f]/40 uppercase shadow-md pointer-events-none">
                            📸 L.R. Performa Background Header Area (Height: {format.verticalPaddingOffset ?? 130}px)
                          </span>
                        </div>
                        <div 
                          style={{ height: `${format.verticalPaddingOffset ?? 130}px` }} 
                          className="hidden print:block"
                        />
                      </>
                    );
                  }

                  if (format.type === 'custom_text') {
                    return (
                      <div className="text-left pb-4 border-b-2 border-gray-900 mb-4">
                        <h3 className="text-2xl font-black text-gray-950 tracking-tight uppercase">
                          {format.companyName || 'ENTERPRISE TRANSPORT'}
                        </h3>
                        <p className="text-[10px] font-bold text-gray-600 tracking-[0.2em] uppercase mt-0.5">
                          {format.companySubtitle || 'ROAD CARRIERS & LORRY TRANSPORTERS'}
                        </p>
                        <div className="text-[11px] text-gray-700 mt-2 space-y-0.5 leading-normal">
                          <p>{format.companyAddress}</p>
                          <p>Mob: {format.companyPhone} &nbsp;|&nbsp; Email: {format.companyEmail}</p>
                          {(format.customPan || format.customGstin) && (
                            <p className="font-bold pt-1">
                              {format.customPan && <>PAN: <span className="font-mono">{format.customPan}</span></>}
                              {format.customPan && format.customGstin && <> &nbsp;|&nbsp; </>}
                              {format.customGstin && <>GSTIN: <span className="font-mono">{format.customGstin}</span></>}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  } else if (format.type === 'custom_image' && format.logoB64) {
                    return (
                      <div className="text-center pb-4 border-b-2 border-gray-900 mb-4 w-full">
                        <img 
                          src={format.logoB64} 
                          alt="Custom LR Letterhead Template" 
                          referrerPolicy="no-referrer"
                          className="max-h-[120px] max-w-full object-contain mx-auto" 
                        />
                      </div>
                    );
                  } else {
                    // blank (otherwise keep it blank)
                    if (format.lrPerformaB64) {
                      return (
                        <div className="h-32 flex items-center justify-center mb-4 bg-transparent p-4 text-center select-none no-print">
                          <span className="text-[10px] font-mono font-bold text-[#ff5a5f] bg-white/90 px-3 py-1.5 rounded-lg border border-[#ff5a5f]/40 uppercase shadow-md pointer-events-none">
                            📸 Uploaded Performa Background Header Area
                          </span>
                        </div>
                      );
                    }
                    return (
                      <div className="h-32 flex flex-col items-center justify-center border border-dashed border-gray-300 rounded-lg text-gray-400 text-[11px] italic select-none mb-4 bg-gray-50/50 p-4 text-center print:hidden">
                        <p className="font-bold not-italic text-gray-500 mb-1">Preprinted Stationary Setup Enabled</p>
                        <p>This header section is kept completely blank so that print outputs will align perfectly with your pre-printed physical letterhead stationary.</p>
                      </div>
                    );
                  }
                })()}

                {/* Subheader Box */}
                <div className="grid grid-cols-12 border-b border-gray-900">
                  <div className="col-span-9 p-2.5 border-r border-gray-900 text-[10px] font-semibold text-gray-800 leading-normal">
                    This consignment will not be diverted, rerouted without Consignee Bank's written permission. Will be delivered at the destination.
                  </div>
                  <div className="col-span-3 p-2.5 flex items-center justify-center text-center font-black text-xs tracking-wider uppercase bg-gray-50 text-gray-950">
                    AT OWNER'S RISK
                  </div>
                </div>

                {/* Parties Details and Trip Identifiers */}
                <div className="grid grid-cols-12 border-b border-gray-900 text-xs">
                  {/* Left part: Consigner / Consignee */}
                  <div className="col-span-7 flex flex-col border-r border-gray-900 divide-y divide-gray-900">
                    <div className="p-3 min-h-[90px] flex flex-col justify-between">
                      <div>
                        <span className="block font-black uppercase text-[9px] tracking-wider text-gray-500">Consignor's Name & Address :</span>
                        <div className="font-black text-sm text-gray-900 pt-1 leading-snug printed-value">{activeLr.consignerName}</div>
                      </div>
                      <div className="text-[10px] text-gray-500 font-mono mt-2">
                        Point of Origin: <strong className="text-gray-900 printed-value">{activeLr.placeFrom}</strong>
                      </div>
                    </div>
                    
                    <div className="p-3 min-h-[90px] flex flex-col justify-between">
                      <div>
                        <span className="block font-black uppercase text-[9px] tracking-wider text-gray-500">Consignee's Name & Address :</span>
                        <div className="font-black text-sm text-gray-900 pt-1 leading-snug printed-value">{activeLr.consigneeName}</div>
                      </div>
                      <div className="text-[10px] text-gray-500 font-mono mt-2">
                        Point of Destination: <strong className="text-gray-900 printed-value">{activeLr.placeTo}</strong>
                      </div>
                    </div>
                  </div>

                  {/* Right part: Ledger Identifiers */}
                  <div className="col-span-5 flex flex-col divide-y divide-gray-900 text-[11px] font-bold">
                    <div className="p-2 flex justify-between items-center bg-gray-50">
                      <span className="text-[9px] font-bold uppercase text-gray-500">L. R. No. :</span>
                      <span className="font-mono font-black text-sm text-gray-950 printed-value">{activeLr.lrNo}</span>
                    </div>
                    <div className="p-2 flex justify-between items-center">
                      <span className="text-[9px] font-bold uppercase text-gray-500">Date :</span>
                      <span className="font-mono text-gray-950 printed-value">{activeLr.dated}</span>
                    </div>
                    <div className="p-2 flex justify-between items-center bg-gray-50">
                      <span className="text-[9px] font-bold uppercase text-gray-500">Tanker No. :</span>
                      <span className="font-mono font-black text-xs text-red-600 uppercase printed-value">{activeLr.tankerNumber}</span>
                    </div>
                    <div className="p-2 flex justify-between items-center">
                      <span className="text-[9px] font-bold uppercase text-gray-500">Place of Origin :</span>
                      <span className="font-sans text-gray-950 uppercase printed-value">{activeLr.placeFrom}</span>
                    </div>
                    <div className="p-2 flex justify-between items-center bg-gray-50">
                      <span className="text-[9px] font-bold uppercase text-gray-500">Place of Destination :</span>
                      <span className="font-sans text-gray-950 uppercase printed-value">{activeLr.placeTo}</span>
                    </div>
                    <div className="p-2 flex-grow min-h-[40px] flex flex-col justify-between">
                      <span className="text-[9px] font-bold uppercase text-gray-500 block">Remarks :</span>
                      <span className="text-[10px] font-mono font-black text-gray-950 uppercase mt-0.5 printed-value">
                        CARGO PRODUCT: {activeLr.product}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Logistics Items Table Grid */}
                <div className="border-b border-gray-900">
                  <table className="w-full text-xs text-left text-gray-950 lr-grid-borders">
                    <thead>
                      <tr className="border-b border-gray-900 font-black text-center uppercase text-[10px] tracking-wider bg-gray-50">
                        <th className="py-2.5 px-3 text-left w-1/2">Description of Goods</th>
                        <th className="py-2.5 px-3 w-1/4">Weight</th>
                        <th className="py-2.5 px-3 text-right w-1/4">Freight Amount (₹)</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="font-medium align-top">
                        <td className="py-12 px-3">
                          <div className="text-sm font-black text-gray-950 tracking-tight uppercase printed-value">
                            {activeLr.product}
                          </div>
                          <div className="text-[10px] font-mono text-gray-600 leading-normal mt-2 space-y-0.5">
                            <p>• LIQUID PETROCHEMICAL BULK FLUIDS CARRIAGE</p>
                            <p>• CARRIER VEHICLE REGISTRATION NO: <strong className="text-gray-900 printed-value">{activeLr.tankerNumber}</strong></p>
                            <p>• CARGO DECLARED COMPLIANT WITH TENSION SAFETY LIMITS</p>
                            <p>• TARIFF CALC RATE: <span className="printed-value">₹{activeLr.freightRate.toLocaleString()} / {activeLr.qtyUnit}</span></p>
                          </div>
                        </td>
                        <td className="py-12 px-3 text-center">
                          <div className="text-sm font-black text-gray-950 font-mono mt-1 printed-value">{activeLr.qty.toLocaleString()} {activeLr.qtyUnit}</div>
                        </td>
                        <td className="py-12 px-3 text-right font-bold">
                          <div className="text-sm font-black text-gray-950 font-mono printed-value">₹{activeLr.freightTotal.toLocaleString()}</div>
                        </td>
                      </tr>
                      
                      {/* Total Aggregates Row */}
                      <tr className="font-black border-t border-b border-gray-900 bg-gray-50 text-gray-950">
                        <td className="py-2.5 px-3 text-center uppercase tracking-wider text-[10px] printed-value">TOTAL</td>
                        <td className="py-2.5 px-3 text-center font-mono font-black text-sm printed-value">{activeLr.qty.toLocaleString()} {activeLr.qtyUnit}</td>
                        <td className="py-2.5 px-3 text-right font-mono font-black text-base text-gray-950 printed-value">₹{activeLr.freightTotal.toLocaleString()}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Customizable Value of Goods Section */}
                <div className="p-3 border-b border-gray-900 text-xs font-semibold bg-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 flex-wrap w-full">
                    <span className="text-gray-500 uppercase tracking-wider text-[9px] font-bold font-mono">Value of Goods :</span>
                    <input 
                      type="text"
                      className="text-gray-950 font-black outline-none border-b border-dashed border-gray-400 focus:border-[#ff5a5f] bg-transparent text-xs px-1 py-0.5 flex-grow max-w-[450px] printed-value"
                      value={goodsValues[activeLr.id] !== undefined ? goodsValues[activeLr.id] : `Rs. ${(activeLr.qty * (activeLr.qtyUnit === 'MT' ? 95000 : 70)).toLocaleString()} /-`}
                      onChange={(e) => {
                        setGoodsValues({
                          ...goodsValues,
                          [activeLr.id]: e.target.value
                        });
                      }}
                      title="Click directly to edit the value for printouts"
                      placeholder="e.g. Rs. 2,450,000 /-"
                    />
                  </div>
                  <span className="text-[9px] text-[#ff5a5f] uppercase tracking-wide font-mono shrink-0 no-print">✎ Click value to edit printout</span>
                </div>

                {/* Finepoint conditions and signatures */}
                <div className="grid grid-cols-12 text-[9px] text-gray-950 pt-3 leading-relaxed">
                  {/* Regulatory Conditions (Left) */}
                  <div className="col-span-7 pr-3 space-y-0.5 font-mono">
                    <span className="font-extrabold text-gray-900 uppercase text-[10px] block font-sans tracking-tight">
                      Subject to Vadodara Jurisdiction
                    </span>
                    <p>(1) Please inspect the tanker and test the product properly before unloading.</p>
                    <p>(2) These goods are transported subject to condition overleaf.</p>
                    <p>(3) Shortage if any must be noted on the face of the G. C. Note.</p>
                    <p>(4) No claim will be entertained subsequently.</p>
                    <p>(5) Service Tax will be paid by Consignee / Consignor.</p>
                  </div>

                  {/* Representative Seal Box (Right) */}
                  <div className="col-span-12 md:col-span-5 flex flex-col justify-between text-right pl-3 pr-1">
                    <div className="space-y-0.5">
                      <span className="font-black text-gray-950 uppercase text-[9.5px] tracking-wide block font-sans">
                        {(() => {
                          const format = currentUser?.lrFormat || { type: 'blank' };
                          if (format.type === 'custom_text' && format.companyName) {
                            return `For ${format.companyName}`;
                          } else if (format.type === 'custom_image') {
                            return 'For Authorised Transporter';
                          } else {
                            return 'For Authorized Signatory';
                          }
                        })()}
                      </span>
                      <div className="h-8"></div> {/* space padding for visual autograph stamp */}
                    </div>
                    <div>
                      <div className="border-t border-gray-950 w-44 ml-auto my-0.5" />
                      <span className="font-bold text-gray-800 uppercase text-[9px] block tracking-wide font-sans text-center ml-auto w-44">
                        Authorised Signature
                      </span>
                    </div>
                  </div>
                </div>

              </div>

              {/* Status Manager Controls block for internal bookkeeping */}
              <div className="bg-[#161b22] border border-[#30363d] rounded-2xl p-5 space-y-4">
                <span className="block text-xs font-mono uppercase text-white tracking-widest border-b border-[#21262d] pb-2">
                  L.R copy Verification Dashboard controls
                </span>

                <div className="flex flex-wrap justify-between items-center gap-4 text-xs font-mono">
                  <div>
                    <span className="text-[#8b949e] block mb-1">Receipt Status:</span>
                    <span className={`inline-block px-3 py-1 rounded text-xs font-bold leading-none ${
                      activeLr.status === 'received' 
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                        : 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 animate-pulse'
                    }`}>
                      {activeLr.status === 'received' 
                        ? `Received on: ${activeLr.receivedDateTime?.replace('T', ' ')}` 
                        : 'PENDING PHYSICAL RECEIPT FROM DRIVER'}
                    </span>
                  </div>

                  {activeLr.status !== 'received' && (
                    <div>
                      {markingLrId !== activeLr.id ? (
                        <button 
                          onClick={() => {
                            setMarkingLrId(activeLr.id);
                            // default today date time
                            const defaultNow = new Date().toISOString().substring(0, 16);
                            setReceivedTime(defaultNow);
                          }}
                          className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-lg text-xs font-semibold shadow cursor-pointer"
                        >
                          Mark as Received From Driver
                        </button>
                      ) : (
                        <div className="flex items-center gap-2">
                          <input 
                            type="datetime-local" 
                            value={receivedTime}
                            onChange={(e) => setReceivedTime(e.target.value)}
                            className="bg-[#0d1117] border border-[#30363d] px-2.5 py-1.5 rounded text-white text-xs outline-none"
                          />
                          <button 
                            onClick={() => receiveSubmit(activeLr.id)}
                            className="px-3 py-1.5 bg-emerald-500 text-white font-bold rounded"
                          >
                            Save Check-In
                          </button>
                          <button 
                            onClick={() => setMarkingLrId(null)} 
                            className="text-[#8b949e] text-xs hover:underline"
                          >
                            Cancel
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

            </div>
          ) : (
            <div className="text-center py-20 text-[#8b949e]">
              <AlertTriangle className="w-12 h-12 mx-auto mb-3" />
              <p className="text-sm font-semibold text-white">No active lorry receipts created</p>
              <p className="text-xs mt-1">Select Generate Unique L.R. to initialize petro-chemical lorry receipt books.</p>
            </div>
          )}
        </div>

      </div>

      {/* CREATE NEW UNIQUE LR MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-full max-w-2xl bg-[#161b22] border border-[#30363d] rounded-2xl shadow-2xl p-6 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex justify-between items-center pb-4 border-b border-[#30363d] mb-5">
              <div>
                <h3 className="text-lg font-bold text-white">Generate Hazardous Lorry Receipt</h3>
                <p className="text-xs text-[#8b949e] mt-0.5 font-mono">STRICT ENFORCEMENT UNIQUE LR NO CHECKING</p>
              </div>
              <button onClick={() => setShowCreateModal(false)} className="text-[#8b949e] hover:text-white cursor-pointer">
                <X className="w-6 h-6" />
              </button>
            </div>

            {errorWord && (
              <div className="p-3 mb-4 bg-red-900/20 border border-red-500/30 text-red-200 text-xs rounded-xl">
                {errorWord}
              </div>
            )}

            <form onSubmit={createLrSubmit} className="space-y-4 text-xs text-white">
              
              {/* AI physical L.R parser upload asset */}
              <div className="bg-gradient-to-br from-orange-950/20 to-[#0e171b] border border-orange-500/35 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">🤖</span>
                    <div>
                      <h4 className="text-xs font-bold text-orange-400 font-mono uppercase tracking-wider">
                        AI-Powered Scanned L.R. Import
                      </h4>
                      <p className="text-[10px] text-gray-400 mt-0.5">
                        Upload an existing physical L.R. receipt copy to have Gemini write and pre-fill form fields.
                      </p>
                    </div>
                  </div>
                  <span className="text-[9px] bg-orange-500/10 text-orange-400 font-mono font-bold uppercase tracking-widest px-2 py-0.5 rounded border border-orange-500/20">
                    Settled By AI
                  </span>
                </div>

                <div className="border border-dashed border-gray-600 rounded-xl p-4 bg-[#0d1117] flex flex-col items-center justify-center space-y-2 cursor-pointer relative hover:border-orange-400 hover:bg-orange-900/5 transition-all text-center">
                  {isScanningLr ? (
                    <div className="py-2 flex flex-col items-center space-y-2">
                      <div className="w-8 h-8 rounded-full border-4 border-orange-500 border-t-transparent animate-spin" />
                      <span className="text-xs font-mono text-orange-400 font-bold animate-pulse">
                        {scanProgressMsg}
                      </span>
                    </div>
                  ) : (
                    <>
                      <FileText className="w-7 h-7 text-orange-400" />
                      <div>
                        <span className="block text-xs font-bold text-white">
                          Select L.R Receipt Photo, Image or Doc Scan
                        </span>
                        <span className="block text-[9.5px] text-[#8b949e] mt-0.5 font-mono">
                          Format: PNG, JPG, WEBP, PDF (up to 10MB)
                        </span>
                      </div>
                      <input 
                        type="file" 
                        accept="image/*,application/pdf"
                        onChange={handleLrAutoScan}
                        className="absolute inset-0 opacity-0 cursor-pointer"
                        disabled={isScanningLr}
                      />
                    </>
                  )}
                </div>

                {scanErrorMsg && (
                  <div className="p-2 bg-rose-500/10 border border-rose-500/20 rounded-lg text-[10.5px] text-rose-400 font-mono">
                    ⚠️ Error parsing scan image: {scanErrorMsg}
                  </div>
                )}

                {scanSuccessMsg && (
                  <div className="p-2 bg-emerald-500/10 border border-emerald-500/25 rounded-lg text-[11px] text-emerald-400 font-mono font-bold flex items-center gap-1.5 animate-pulse">
                    <span>✨</span> {scanSuccessMsg}
                  </div>
                )}
              </div>

              {/* AI Auto-Generator via Saved Design Template & Trip particulars */}
              <div className="bg-gradient-to-r from-violet-950/25 to-[#0f141c] border border-violet-500/35 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-base">⚡</span>
                    <div>
                      <h4 className="text-xs font-bold text-violet-400 font-mono uppercase tracking-wider">
                        AI L.R Builder: Physical Match & Trip details
                      </h4>
                      <p className="text-[10px] text-gray-400 mt-0.5 leading-normal">
                        Create standard-perfect fields adhering to your saved physical template matching a live commercial trip.
                      </p>
                    </div>
                  </div>
                  <span className="text-[9px] bg-violet-500/10 text-violet-400 font-mono font-bold uppercase tracking-widest px-2 py-0.5 rounded border border-violet-500/20">
                    Auto-Composer
                  </span>
                </div>

                {designMemory ? (
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <label className="block text-[10px] uppercase font-mono text-gray-400 font-bold">Select Source Trip to Populate cargo details *</label>
                      <select 
                        onChange={(e) => handleAiGenerateFromTrip(e.target.value)}
                        defaultValue=""
                        className="w-full px-3 py-2 bg-[#0d1117] border border-[#30363d] rounded-lg text-white text-xs outline-none focus:border-violet-500 cursor-pointer"
                      >
                        <option value="" disabled>-- Choose a Logistics Trip to compose LR --</option>
                        {trips && trips.map(t => (
                          <option key={t.id} value={t.id}>
                            Trip: {t.id} ({t.tankerNumber}) | Route: {t.placeFrom} to {t.placeTo}
                          </option>
                        ))}
                      </select>
                    </div>

                    {isGeneratingAiLr && (
                      <div className="flex items-center gap-2 text-violet-400 font-mono text-[10px] animate-pulse py-1">
                        <div className="w-4 h-4 rounded-full border-2 border-violet-500 border-t-transparent animate-spin" />
                        <span>AI Billing Agent is mapping physical layouts and creating L.R fields...</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-[10px] text-gray-400 font-mono leading-relaxed bg-[#0d1117] p-2.5 rounded-lg border border-[#30363d] text-center">
                    📢 To unlock physical L.R matching, first upload and memorize your preprinted template scan inside the **Stationary & L.R. Layout Setup** menu above!
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[#8b949e] font-mono tracking-wider uppercase mb-1">Statutory L.R. Number *</label>
                  <input 
                    type="text" 
                    required
                    placeholder="e.g. LR-2026-1052"
                    value={lrNo}
                    onChange={(e) => setLrNo(e.target.value)}
                    className="w-full px-4 py-2.5 bg-[#0d1117] border border-[#30363d] rounded-xl text-white font-mono text-xs uppercase"
                  />
                </div>
                <div>
                  <label className="block text-[#8b949e] font-mono tracking-wider uppercase mb-1">Dated *</label>
                  <input 
                    type="date" 
                    required
                    value={dated}
                    onChange={(e) => setDated(e.target.value)}
                    className="w-full px-4 py-2.5 bg-[#0d1117] border border-[#30363d] rounded-xl text-white text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[#8b949e] font-mono tracking-wider uppercase mb-1">Consigner Party (Sender name) *</label>
                  <input 
                    type="text" 
                    required
                    placeholder="e.g. Reliance Petrochemicals Ltd"
                    value={consigner}
                    onChange={(e) => setConsigner(e.target.value)}
                    className="w-full px-4 py-2.5 bg-[#0d1117] border border-[#30363d] rounded-xl text-white text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[#8b949e] font-mono tracking-wider uppercase mb-1">Consignee Party (Recipient name) *</label>
                  <input 
                    type="text" 
                    required
                    placeholder="e.g. Supreme Chemical Industries"
                    value={consignee}
                    onChange={(e) => setConsignee(e.target.value)}
                    className="w-full px-4 py-2.5 bg-[#0d1117] border border-[#30363d] rounded-xl text-white text-xs"
                  />
                </div>
              </div>

              {/* Type Category Selection Pill Option */}
              <div className="space-y-1.5 bg-black/15 p-3.5 rounded-xl border border-white/[0.03]">
                <label className="block text-[#ff7a4e] font-mono tracking-widest uppercase font-bold text-[8px]">Lorry Receipt Provision Operational Type</label>
                <div className="grid grid-cols-2 gap-2 mt-1">
                  <button
                    type="button"
                    onClick={() => setLrType('own')}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                      lrType === 'own'
                        ? 'bg-[#ff5a1f] border-[#ff5a1f] text-white shadow-md'
                        : 'bg-[#0d1117] border-[#30363d] text-gray-400 hover:text-white hover:bg-white/[0.01]'
                    }`}
                  >
                    Our Company Active Trip
                  </button>
                  <button
                    type="button"
                    onClick={() => setLrType('commission')}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                      lrType === 'commission'
                        ? 'bg-[#ff5a1f] border-[#ff5a1f] text-white shadow-md'
                        : 'bg-[#0d1117] border-[#30363d] text-gray-400 hover:text-white hover:bg-white/[0.01]'
                    }`}
                  >
                    Other Company Trip (Commission Only)
                  </button>
                </div>
              </div>

              {lrType === 'own' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[#8b949e] font-mono tracking-wider uppercase mb-1">Select Compliant Tanker *</label>
                    <select 
                      required
                      value={selectedTankerId}
                      onChange={(e) => setSelectedTankerId(e.target.value)}
                      className="w-full px-4 py-2.5 bg-[#0d1117] border border-[#30363d] rounded-xl text-white text-xs animate-none"
                    >
                      <option value="">-- Select Vehicle --</option>
                      {tankers.map(t => (
                        <option key={t.id} value={t.id}>
                          {t.tankerNumber} ({t.status.toUpperCase()})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[#8b949e] font-mono tracking-wider uppercase mb-1">Chemical/Petro Product Name *</label>
                    <input 
                      type="text" 
                      required
                      placeholder="e.g. Benzene Solvent / Liquid Nitrogen"
                      value={product}
                      onChange={(e) => setProduct(e.target.value)}
                      className="w-full px-4 py-2.5 bg-[#0d1117] border border-[#30363d] rounded-xl text-white text-xs"
                    />
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[#ff7a4e] font-mono tracking-wider uppercase mb-1 font-bold">Third-Party Tanker Registration Plate *</label>
                    <input 
                      type="text" 
                      required
                      placeholder="e.g. MH-43-Q-2026"
                      value={thirdPartyFleetName}
                      onChange={(e) => setThirdPartyFleetName(e.target.value.toUpperCase())}
                      className="w-full px-4 py-2.5 bg-[#1b1f29] border border-[#ff5a1f]/35 rounded-xl text-white font-mono uppercase text-xs focus:border-[#ff5a1f]"
                    />
                  </div>
                  <div>
                    <label className="block text-[#ff7a4e] font-mono tracking-wider uppercase mb-1 font-bold">L.R Commission Charged (₹) *</label>
                    <input 
                      type="number" 
                      required
                      min={1}
                      placeholder="e.g. 1500"
                      value={commissionAmount || ''}
                      onChange={(e) => setCommissionAmount(Number(e.target.value))}
                      className="w-full px-4 py-2.5 bg-[#1b1f29] border border-[#ff5a1f]/35 rounded-xl text-white text-xs focus:border-[#ff5a1f]"
                    />
                  </div>
                  <div>
                    <label className="block text-[#8b949e] font-mono tracking-wider uppercase mb-1">Chemical/Petro Product Name *</label>
                    <input 
                      type="text" 
                      required
                      placeholder="e.g. Liquid Solvent"
                      value={product}
                      onChange={(e) => setProduct(e.target.value)}
                      className="w-full px-4 py-2.5 bg-[#0d1117] border border-[#30363d] rounded-xl text-white text-xs"
                    />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[#8b949e] font-mono tracking-wider uppercase mb-1">Quantity *</label>
                  <input 
                    type="number" 
                    step="any"
                    required
                    placeholder="e.g. 25 or 24000"
                    value={qty || ''}
                    onChange={(e) => setQty(parseFloat(e.target.value) || 0)}
                    className="w-full px-4 py-2.5 bg-[#0d1117] border border-[#30363d] rounded-xl text-white text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[#8b949e] font-mono tracking-wider uppercase mb-1">Weight Unit *</label>
                  <select 
                    value={qtyUnit}
                    onChange={(e) => setQtyUnit(e.target.value as 'KL' | 'MT')}
                    className="w-full px-4 py-2.5 bg-[#0d1117] border border-[#30363d] rounded-xl text-[#ff5a1f] text-xs font-bold"
                  >
                    <option value="MT">MT (Metric Tons)</option>
                    <option value="KL">KL (Kiloliters)</option>
                  </select>
                </div>
                
                {lrType === 'own' ? (
                  <div>
                    <label className="block text-[#8b949e] font-mono tracking-wider uppercase mb-1">Freight Base Rate (Per Unit) *</label>
                    <input 
                      type="number" 
                      step="any"
                      required
                      placeholder="e.g. 1500"
                      value={freightRate || ''}
                      onChange={(e) => setFreightRate(parseFloat(e.target.value) || 0)}
                      className="w-full px-4 py-2.5 bg-[#0d1117] border border-[#30363d] rounded-xl text-white text-xs"
                    />
                  </div>
                ) : (
                  <div>
                    <label className="block text-[#8b949e] font-mono tracking-wider uppercase mb-1">Freight rate (Flat N/A)</label>
                    <input 
                      type="text" 
                      disabled
                      value="N/A - Commission Billing"
                      className="w-full px-4 py-2.5 bg-white/[0.02] border border-[#30363d] rounded-xl text-gray-500 text-xs italic"
                    />
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[#8b949e] font-mono tracking-wider uppercase mb-1">Source (From) *</label>
                  <input 
                    type="text" 
                    required
                    placeholder="city, state"
                    value={placeFrom}
                    onChange={(e) => setPlaceFrom(e.target.value)}
                    className="w-full px-4 py-2.5 bg-[#0d1117] border border-[#30363d] rounded-xl text-white text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[#8b949e] font-mono tracking-wider uppercase mb-1">Destination (To) *</label>
                  <input 
                    type="text" 
                    required
                    placeholder="city, state"
                    value={placeTo}
                    onChange={(e) => setPlaceTo(e.target.value)}
                    className="w-full px-4 py-2.5 bg-[#0d1117] border border-[#30363d] rounded-xl text-white text-xs"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-[#30363d]">
                <button 
                  type="button" 
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 bg-[#21262d] text-[#8b949e] hover:text-white rounded-lg"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="px-5 py-2.5 bg-gradient-to-r from-[#ff5a5f] to-[#e11d48] text-white font-bold rounded-lg shadow-md"
                >
                  Register L.R Copy & Append
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
