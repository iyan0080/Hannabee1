import {
  Product,
  Transaction,
  Expense,
  Customer,
  StoreSettings,
  AppUser,
  ManualJournalEntry,
  CashClosingRecord,
} from '../types';

export const INITIAL_USERS: AppUser[] = [
  {
    id: 'usr-1',
    name: 'Hanna',
    email: 'hanna.hannabee@gmail.com',
    password: 'hanna123',
    phone: '082178867116',
    avatarColor: 'bg-amber-600',
    role: 'Owner',
    isActive: true,
    createdAt: new Date().toISOString(),
    lastLogin: new Date().toISOString(),
  },
  {
    id: 'usr-2',
    name: 'IYAN',
    email: 'iyan0080@gmail.com',
    password: 'password123',
    phone: '082178867116',
    avatarColor: 'bg-blue-600',
    role: 'Admin 1',
    isActive: true,
    createdAt: new Date().toISOString(),
    lastLogin: new Date().toISOString(),
  },
  {
    id: 'usr-3',
    name: 'NIRMA',
    email: 'nirma.hannabee@gmail.com',
    password: 'nirma123',
    phone: '082178867116',
    avatarColor: 'bg-emerald-600',
    role: 'Admin 2',
    isActive: true,
    createdAt: new Date().toISOString(),
    lastLogin: new Date().toISOString(),
  },
];

export const INITIAL_STORE_SETTINGS: StoreSettings = {
  storeName: 'HannaBee',
  tagline: 'Jajanan Wareg Seger',
  address: 'Jl. Kuliner Nusantara No. 8, Pemesanan: 0821 7886 7116',
  phone: '082178867116',
  cashierName: 'Hanna (Owner)',
  receiptFooter: 'Terima kasih telah berbelanja di HannaBee! Jajanan Wareg Seger.',
  paperWidth: '58mm',
  enableTax: false,
  taxRate: 0,
  qrisInfo: 'NMID: ID1020304050607 / HannaBee',
  bankInfo: 'BCA: 8735019284 a.n. HannaBee (082178867116)',
  autoSyncCloud: true,
  autoJournalEnabled: true,
  autoJournalMode: 'DETAILED_PER_CATEGORY',
  autoJournalRecordHPP: true,
  autoJournalRecordDiscount: true,
};

// Database Bersih (Semua data demo telah dihapus)
export const INITIAL_PRODUCTS: Product[] = [];
export const INITIAL_CUSTOMERS: Customer[] = [];
export const INITIAL_TRANSACTIONS: Transaction[] = [];
export const INITIAL_EXPENSES: Expense[] = [];
export const INITIAL_MANUAL_JOURNALS: ManualJournalEntry[] = [];
export const INITIAL_CASH_CLOSINGS: CashClosingRecord[] = [];
