import React from 'react';
import { Printer, X } from 'lucide-react';

interface TallyInvoiceProps {
  invoice: {
    invoiceNo: string;
    date: string;
    consignerName: string;
    consignerAddress?: string;
    consignerGstin?: string;
    consigneeName: string;
    consigneeAddress?: string;
    consigneeGstin?: string;
    tankerNumber: string;
    product: string;
    quantity: number;
    qtyUnit: string;
    rate: number;
    amount: number;
    hsnCode?: string;
    termsOfDelivery?: string;
  };
  onClose: () => void;
}

export default function TallyInvoice({ invoice, onClose }: TallyInvoiceProps) {
  const gstr = 0.18; // Standard 18% GST (CGST 9% + SGST 9%)
  const subtotal = invoice.amount / (1 + gstr);
  const cgstVal = subtotal * 0.09;
  const sgstVal = subtotal * 0.09;
  const totalVal = invoice.amount;

  // Convert number to words helper (Indian Numbering Style)
  const numberToWords = (num: number): string => {
    const a = [
      '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
      'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'
    ];
    const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

    const numString = num.toFixed(0);
    if (num === 0) return 'Zero';

    const n = parseInt(numString);
    if (n < 0) return 'minus ' + numberToWords(-n);

    const translate = (n: number): string => {
      let word = '';
      if (n < 20) {
        word = a[n];
      } else if (n < 100) {
        word = b[Math.floor(n / 10)] + ' ' + a[n % 10];
      } else if (n < 1000) {
        word = translate(Math.floor(n / 100)) + ' Hundred ' + translate(n % 100);
      } else if (n < 100000) {
        word = translate(Math.floor(n / 1000)) + ' Thousand ' + translate(n % 1000);
      } else if (n < 10000000) {
        word = translate(Math.floor(n / 100000)) + ' Lakh ' + translate(n % 100000);
      } else {
        word = translate(Math.floor(n / 10000000)) + ' Crore ' + translate(n % 10000000);
      }
      return word.trim();
    };

    return 'Rupees ' + translate(n) + ' Only';
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 overflow-y-auto selection:bg-[#ff5a5f] selection:text-white">
      <div className="bg-[#1c2128] border border-[#30363d] rounded-2xl w-full max-w-4xl print:border-none print:bg-white print:p-0 print:m-0 print:shadow-none print:max-w-none shadow-2xl overflow-hidden self-start my-8">
        
        {/* Navigation / Actions Bar */}
        <div className="bg-slate-900 text-white px-6 py-4 flex justify-between items-center print:hidden border-b border-slate-800">
          <div className="flex items-center gap-2">
            <span className="text-xs bg-emerald-500/20 border border-emerald-500/35 text-emerald-400 font-mono font-bold px-2 py-0.5 rounded tracking-wider uppercase">
              Tally.ERP 9 generated invoice
            </span>
          </div>
          <div className="flex items-center gap-2.5">
            <button
              onClick={handlePrint}
              className="px-4 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-lg text-xs flex items-center gap-1.5 cursor-pointer transition-all shadow"
            >
              <Printer className="w-3.5 h-3.5" /> Print Invoice (Tally Copy)
            </button>
            <button 
              onClick={onClose}
              className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-all cursor-pointer"
            >
              <X className="w-4.5 h-4.5" />
            </button>
          </div>
        </div>

        {/* Crisp monospaced Tally invoice page print wrap */}
        <div className="p-8 bg-white text-black min-h-[950px] font-mono text-[11px] leading-tight select-text print:p-0">
          
          <div className="border-[1.5px] border-black">
            
            {/* Header / Invoice Banner */}
            <div className="border-b-[1.5px] border-black text-center py-2 font-bold text-xs uppercase tracking-wider bg-slate-100">
              Tax Invoice
            </div>

            {/* Top Grid: Party details & transport items */}
            <div className="grid grid-cols-2 border-b-[1.5px] border-black">
              
              {/* Consigner Header */}
              <div className="p-2 border-r-[1.5px] border-black flex flex-col justify-between min-h-[140px]">
                <div>
                  <div className="font-bold uppercase text-[10px] text-gray-500 mb-1">Exporter / Consigner:</div>
                  <div className="font-bold text-xs uppercase text-slate-950">{invoice.consignerName}</div>
                  <div className="text-[10px] uppercase text-gray-800 leading-normal mt-1">
                    {invoice.consignerAddress || 'Bypass GIDC Cargo Yard Area, Vadodara, Gujarat India'}
                  </div>
                </div>
                <div className="mt-3 text-[10px] font-bold">
                  GSTIN/UIN: <span className="font-bold text-slate-950">{invoice.consignerGstin || '24AAAPV5899D1Z4'}</span>
                </div>
              </div>

              {/* Invoice ID Metadata */}
              <div className="grid grid-cols-2">
                <div className="p-2 border-r-[1.5px] border-black border-b-[1.5px] h-14">
                  <div className="text-[9px] text-gray-500 uppercase">Invoice No:</div>
                  <div className="font-bold text-xs">{invoice.invoiceNo}</div>
                </div>
                <div className="p-2 border-b-[1.5px] h-14">
                  <div className="text-[9px] text-gray-500 uppercase">Dated:</div>
                  <div className="font-bold text-xs">{invoice.date}</div>
                </div>
                
                <div className="p-2 border-r-[1.5px] border-black border-b-[1.5px] h-14">
                  <div className="text-[9px] text-gray-500 uppercase">Buyer\'s Ref / Order No:</div>
                  <div className="font-bold text-[10px]">BRC/ORD/{Math.floor(1000 + Math.random()*9000)}</div>
                </div>
                <div className="p-2 border-b-[1.5px] h-14">
                  <div className="text-[9px] text-gray-500 uppercase">Other References:</div>
                  <div className="font-bold text-[10px]">TANKER-LOG-{Math.floor(20000 + Math.random()*80000)}</div>
                </div>

                <div className="p-2 border-r-[1.5px] border-black h-14">
                  <div className="text-[9px] text-gray-500 uppercase">Dispatch Document No:</div>
                  <div className="font-bold text-[10px]">CON-{Math.floor(12345 + Math.random()*80000)}</div>
                </div>
                <div className="p-2 h-14">
                  <div className="text-[9px] text-gray-500 uppercase">Dated (Dispatch):</div>
                  <div className="font-bold text-[10px]">{invoice.date}</div>
                </div>
              </div>

            </div>

            {/* Consignee / Buyer details */}
            <div className="grid grid-cols-2 border-b-[1.5px] border-black">
              
              <div className="p-2 border-r-[1.5px] border-black flex flex-col justify-between min-h-[120px]">
                <div>
                  <div className="font-bold uppercase text-[9px] text-gray-500 mb-1">Consignee / Buyer:</div>
                  <div className="font-bold text-xs uppercase text-slate-950">{invoice.consigneeName}</div>
                  <div className="text-[10px] uppercase text-gray-800 leading-normal mt-1">
                    {invoice.consigneeAddress || 'Chemical Refinery Logistics Block, Ranoli GIDC, GJ 391350'}
                  </div>
                </div>
                <div className="mt-2 text-[10px] font-bold">
                  GSTIN/UIN: <span className="font-bold text-slate-950">{invoice.consigneeGstin || '24AAAPC1992E1Z8'}</span>
                </div>
              </div>

              {/* Transit & Terms Details */}
              <div className="grid grid-cols-2">
                <div className="p-2 border-r-[1.5px] border-black border-b-[1.5px] h-14 col-span-2">
                  <div className="text-[9px] text-gray-500 uppercase">Dispatch through:</div>
                  <div className="font-bold text-[10px] uppercase text-slate-950">BARODA ROAD CARRIERS (FLEET TYPE: HAZARDOUS TANKER)</div>
                </div>
                <div className="p-2 border-r-[1.5px] border-black h-16">
                  <div className="text-[9px] text-gray-500 uppercase">Terms of Delivery:</div>
                  <div className="text-[9px] text-gray-700 leading-tight">
                    {invoice.termsOfDelivery || 'Door delivery within 24 hours including chemical discharge warranty'}
                  </div>
                </div>
                <div className="p-2 h-16">
                  <div className="text-[9px] text-gray-500 uppercase">Registered Tanker Plate No:</div>
                  <div className="font-bold text-xs uppercase text-red-600">{invoice.tankerNumber}</div>
                </div>
              </div>

            </div>

            {/* Main Particulars Grid */}
            <table className="w-full text-left font-mono text-[10.5px] border-b-[1.5px] border-black">
              <thead>
                <tr className="border-b border-black font-bold uppercase text-[9.5px] bg-slate-50">
                  <th className="p-2 border-r border-black w-10 text-center">Sl</th>
                  <th className="p-2 border-r border-black w-1/2">Description of Goods / Services</th>
                  <th className="p-2 border-r border-black text-center w-20">HSN/SAC</th>
                  <th className="p-2 border-r border-black text-right w-16">Qty</th>
                  <th className="p-2 border-r border-black text-right w-20">Rate</th>
                  <th className="p-2 border-r border-black text-center w-12">per</th>
                  <th className="p-2 text-right">Amount (INR)</th>
                </tr>
              </thead>
              <tbody>
                {/* Main line item representing transport/fuel job */}
                <tr className="min-h-[220px]">
                  <td className="p-2 border-r border-black text-center valign-top">1</td>
                  <td className="p-2 border-r border-black valign-top leading-normal">
                    <strong className="text-[11px] uppercase block">{invoice.product} Petro-Chemical Cargo Transport Cargo Delivery Charges</strong>
                    <span className="text-[10px] text-gray-600 block mt-1">
                      Route Path: Ranoli, Vadodara to Bypass Corridor destinations.<br />
                      Loaded quantity safely delivered through premium logistics solutions.<br />
                      Compliance Standard: BS6 Compliant chemical vessel with fully updated explosive license parameters.
                    </span>
                  </td>
                  <td className="p-2 border-r border-black text-center valign-top font-bold text-gray-700">{invoice.hsnCode || '996511'}</td>
                  <td className="p-2 border-r border-black text-right valign-top font-bold">{invoice.quantity} {invoice.qtyUnit}</td>
                  <td className="p-2 border-r border-black text-right valign-top font-bold">₹{subtotal.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                  <td className="p-2 border-r border-black text-center valign-top font-semibold">{invoice.qtyUnit}</td>
                  <td className="p-2 text-right valign-top font-bold">₹{subtotal.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                </tr>

                {/* Sub tax rows */}
                <tr className="border-t border-dashed border-gray-400">
                  <td className="p-2 border-r border-black"></td>
                  <td className="p-2 border-r border-black text-right font-semibold">Central Tax (CGST @ 9%)</td>
                  <td className="p-2 border-r border-black"></td>
                  <td className="p-2 border-r border-black"></td>
                  <td className="p-2 border-r border-black"></td>
                  <td className="p-2 border-r border-black"></td>
                  <td className="p-2 text-right">₹{cgstVal.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                </tr>
                <tr>
                  <td className="p-2 border-r border-black"></td>
                  <td className="p-2 border-r border-black text-right font-semibold">State Tax (SGST @ 9%)</td>
                  <td className="p-2 border-r border-black"></td>
                  <td className="p-2 border-r border-black"></td>
                  <td className="p-2 border-r border-black"></td>
                  <td className="p-2 border-r border-black"></td>
                  <td className="p-2 text-right">₹{sgstVal.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                </tr>

                {/* Blank space padding spacer item */}
                <tr className="h-28 border-t border-black">
                  <td className="border-r border-black"></td>
                  <td className="border-r border-black p-2 leading-relaxed text-slate-500 italic">
                    -- End of bill declaration --
                  </td>
                  <td className="border-r border-black"></td>
                  <td className="border-r border-black"></td>
                  <td className="border-r border-black"></td>
                  <td className="border-r border-black"></td>
                  <td></td>
                </tr>

                {/* Grand Total Row */}
                <tr className="border-t-[1.5px] border-black bg-slate-50 font-bold uppercase">
                  <td className="p-2.5 border-r border-black"></td>
                  <td className="p-2.5 border-r border-black text-right text-[10px]">Total Aggregate</td>
                  <td className="p-2.5 border-r border-black"></td>
                  <td className="p-2.5 border-r border-black text-right">{invoice.quantity} {invoice.qtyUnit}</td>
                  <td className="p-2.5 border-r border-black"></td>
                  <td className="p-2.5 border-r border-black"></td>
                  <td className="p-2.5 text-right text-xs">₹{totalVal.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                </tr>
              </tbody>
            </table>

            {/* Total Aggregate in words */}
            <div className="p-3 border-b border-black">
              <span className="text-[9px] text-gray-500 uppercase font-bold">Amount Chargeable (in words):</span>
              <div className="font-bold text-[11px] uppercase font-mono text-slate-900 mt-1">
                {numberToWords(totalVal)}
              </div>
            </div>

            {/* Tax break-down detailed HSN box */}
            <div className="p-3 border-b border-black">
              <div className="font-bold uppercase text-[9px] text-gray-500 mb-2">Tax Analysis breakout details:</div>
              <table className="w-full text-left font-mono text-[9px] border border-black">
                <thead>
                  <tr className="border-b border-black font-bold uppercase text-center bg-slate-100">
                    <th className="p-1 border-r border-black" colSpan={1} rowSpan={2}>HSN/SAC</th>
                    <th className="p-1 border-r border-black" colSpan={1} rowSpan={2}>Taxable Value</th>
                    <th className="p-1 border-r border-black" colSpan={2}>Central Tax</th>
                    <th className="p-1 border-r border-black" colSpan={2}>State Tax</th>
                    <th className="p-1" colSpan={1} rowSpan={2}>Total Tax Amount</th>
                  </tr>
                  <tr className="border-b border-black font-bold uppercase text-center bg-slate-100 text-[8px]">
                    <th className="p-1 border-r border-black">Rate</th>
                    <th className="p-1 border-r border-black">Amount</th>
                    <th className="p-1 border-r border-black">Rate</th>
                    <th className="p-1">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-black text-center font-semibold">
                    <td className="p-1 border-r border-black font-bold">{invoice.hsnCode || '996511'}</td>
                    <td className="p-1 border-r border-black text-right">₹{subtotal.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                    <td className="p-1 border-r border-black">9.0%</td>
                    <td className="p-1 border-r border-black text-right">₹{cgstVal.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                    <td className="p-1 border-r border-black">9.0%</td>
                    <td className="p-1 border-r border-black text-right">₹{sgstVal.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                    <td className="p-1 text-right font-bold">₹{(cgstVal + sgstVal).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                  </tr>
                  <tr className="font-bold bg-slate-50 uppercase text-right">
                    <td className="p-1 border-r border-black text-center">Total</td>
                    <td className="p-1 border-r border-black">₹{subtotal.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                    <td className="p-1 border-r border-black"></td>
                    <td className="p-1 border-r border-black">₹{cgstVal.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                    <td className="p-1 border-r border-black"></td>
                    <td className="p-1 border-r border-black">₹{sgstVal.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                    <td className="p-1 font-bold">₹{(cgstVal + sgstVal).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Bottom block: Banking Details, Statutory Declarations, & Signatures */}
            <div className="grid grid-cols-2">
              
              {/* Bank Acc Details */}
              <div className="p-3 border-r-[1.5px] border-black text-[9px] flex flex-col justify-between">
                <div>
                  <div className="font-bold uppercase text-[9px] text-gray-500 mb-1">Company\'s Bank Details:</div>
                  <div className="font-bold text-slate-900 mt-1 uppercase text-[10px]">BANK NAME: ICICI BANK VADODARA</div>
                  <div>A/C NO: <span className="font-bold font-mono text-[10px]">002405001239</span></div>
                  <div>IFSC CODE: <span className="font-bold font-mono text-[10px]">ICIC0000024</span></div>
                  <div>BRANCH: <span className="uppercase">OP ROAD CORPORATE CENTER</span></div>
                </div>
                <div className="mt-3 text-[9px] text-gray-500 italic max-w-sm leading-normal">
                  Declaration: We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct.
                </div>
              </div>

              {/* Signatures block */}
              <div className="border-black p-3 flex flex-col justify-between items-end text-right min-h-[120px]">
                <div>
                  <div className="text-[10px] font-bold uppercase">For BARODA ROAD CARRIERS</div>
                  <p className="text-[8px] text-gray-500 italic mt-0.5">Automated Tally generated audit ledger</p>
                </div>
                
                {/* Simulated signature stamp */}
                <div className="border-2 border-dashed border-indigo-400 text-indigo-500 text-[8px] font-mono p-1 rounded uppercase tracking-wider scale-90 select-none">
                  🔐 DIGITAL AUDIT STAMPED <br />
                  <span className="font-sans text-[7px]">VERIFIED OK 2026</span>
                </div>

                <div className="font-bold text-[9px] uppercase pt-2 border-t border-gray-300 w-full text-right">
                  Authorised Signatory
                </div>
              </div>

            </div>

          </div>

          <div className="text-center text-[9px] text-gray-400 uppercase mt-4 print:mt-1 font-sans">
            This is a computer-generated tax compliance bill. No physical signature is required under GST Rule 46.
          </div>

        </div>

      </div>
    </div>
  );
}
