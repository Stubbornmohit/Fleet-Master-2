export interface AccountingParty {
  id: string;
  name: string;
  type: 'Customer' | 'Supplier' | 'Both';
  contact?: string;
  address?: string;
  gstin?: string;
  pan?: string;
  openingBalance: number;
}

export interface AccountingVoucher {
  id: string;
  type: 'Contra' | 'Payment' | 'Receipt' | 'Journal' | 'Sales' | 'Purchase';
  voucherNo: string;
  date: string;
  debitAccount: string;
  creditAccount: string;
  amount: number;
  narration: string;
  gstRate?: number;
  gstType?: 'CGST/SGST' | 'IGST';
  gstin?: string;
  partyName?: string;
  particulars?: string;
  truckNumber?: string;
  signatureBase64?: string;
}

export interface DocumentRecord {
  id: string;
  name: string;
  category: 'Business' | 'Other';
  fileUrl?: string;
  addedDate: string;
}
