export interface Part {
  id: string;
  serialNo: string;
  name: string;
  date: string;
  detail: string;
}

export interface TankerDocuments {
  rc?: string; // Base64 or filename placeholder
  fitness?: string;
  calibration?: string;
  permit?: string;
  nationalPermit?: string;
  suraksha?: string;
  explosiveLicense?: string;
  gTax?: string;
  insurance?: string;
}

export interface TankerDocExpirations {
  rc?: string; // YYYY-MM-DD
  fitness?: string;
  calibration?: string;
  permit?: string;
  nationalPermit?: string;
  suraksha?: string;
  explosiveLicense?: string;
  gTax?: string;
  insurance?: string;
}

export interface Tanker {
  id: string;
  tankerNumber: string;
  documents: TankerDocuments;
  expirations: TankerDocExpirations;
  parts: Part[];
  status: 'idle' | 'running' | 'maintenance';
  addedDate: string;
  capacity?: string;
  productGroup?: string;
}

export interface Driver {
  id: string;
  name: string;
  contactNumber: string;
  loginPhoneNumber?: string; // Explicit login phone number
  bankAccountNumber: string;
  bankName: string;
  ifscCode: string;
  licenseNumber: string;
  licenseDoc?: string; // Base64 or filename
  otherDoc?: string;
  status: 'idle' | 'active';
  password?: string; // Driver password for login
  username?: string; // Explicit custom driver username
  liveLocation?: {
    latitude: number;
    longitude: number;
    timestamp: string;
  };
}

export interface LorryReceipt {
  id: string;
  lrNo: string;
  dated: string;
  consignerName: string;
  consigneeName: string;
  tankerId: string;
  tankerNumber: string;
  product: string;
  qty: number;
  qtyUnit: 'KL' | 'MT';
  placeFrom: string;
  placeTo: string;
  freightRate: number; // base rate per unit or fixed
  freightTotal: number;
  status: 'pending' | 'received'; // 'pending' means LR copy yet to be received/marked
  receivedDateTime?: string; // Date & time when receipt received from driver
  lrType?: 'own' | 'commission';
  commissionAmount?: number;
  thirdPartyFleetName?: string;
}

export interface Trip {
  id: string;
  lrId: string;
  lrNo: string;
  tankerId: string;
  tankerNumber: string;
  driverId: string;
  driverName: string;
  placeFrom: string;
  placeTo: string;
  qty: number;
  qtyUnit: 'KL' | 'MT';
  startDate: string;
  endDate?: string;
  status: 'running' | 'completed';
  
  // Weights
  loadingWeight: number; // KL or MT
  unloadingWeight?: number; // KL or MT (entered when trip ends)
  
  // Distance / Fuel Estimates
  approxDistanceKm: number; // calculated roughly or entered
  expectedFuelLiters: number; // based on: 3km/ltr if loaded, 5km/ltr empty
  expectedAdblueLiters: number; // standard estimate (~5% of fuel or similar rule)

  // Actual Expenses
  fuelExpense: number;
  driverCharge: number;
  tollExpense: number;
  repairExpense: number;
  maintenanceExpense: number;
  adblueExpense: number;
  adblueAddedLiters: number;
  otherExpense: number;
  
  // Ending Calculations
  freightRateAtEnd?: number; // Rate to calculate profit
  revenue?: number; // calculated as unloadingWeight * freightRateAtEnd
  profit?: number; // revenue - expenses
  actualFuelAverage?: number; // calculated at end as 5km/ltr average? Or custom
  
  // Odometer Validation
  odometerStart?: number;
  odometerStartPhoto?: string; // photo base64
  odometerEnd?: number;
  odometerEndPhoto?: string; // photo base64

  // Empty tanker details and movement tracker
  emptyRunFrom?: string;
  emptyRunTo?: string;
  emptyRunDistanceKm?: number;
  emptyRunFuelLiters?: number;
  loadedFuelLiters?: number;
  tripDurationDays?: number;
  isFuelAlertTriggered?: boolean;
}

export interface MaintenanceBill {
  id: string;
  tankerId: string;
  tankerNumber: string;
  vendorName: string; // The repairing or adblue party
  billNo: string;
  date: string;
  amount: number;
  detail: string;
  status: 'pending' | 'collected';
  // Extended fields for rich ledgers
  category?: 'repair' | 'maintenance' | 'adblue';
  place?: string;
  workType?: string; // e.g., 'Spare Part Changed', 'Service', 'Tyre Work', 'AdBlue Refill', etc.
  gstType?: 'with_gst' | 'without_gst';
  isVerifiedByAdmin?: boolean; // Repair verification flow
}

export interface TankerExpense {
  id: string;
  tankerId: string;
  tankerNumber: string;
  date: string;
  category: 'fuel' | 'driver' | 'toll' | 'repair' | 'maintenance' | 'adblue' | 'other';
  amount: number;
  detail: string;
  tripId?: string; // If none, attached to last completed trip
  // Extendable fields for capturing vendor bill info
  vendorName?: string;
  billNo?: string;
  place?: string;
  workType?: string;
  paymentStatus?: 'pending' | 'collected';
  qtyLiters?: number;
  time?: string;
  excludeFromTrip?: boolean;
  gstType?: 'with_gst' | 'without_gst';
  billPhoto?: string; // Photo of bill uploaded by driver/admin
  isVerifiedByAdmin?: boolean; // Repair verification flow
}

export interface SystemEvent {
  id: string;
  title: string;
  detail: string;
  timestamp: string; // ISO string
  type: 'trip' | 'invoice' | 'fuel' | 'maintenance' | 'accounting' | 'general';
}

