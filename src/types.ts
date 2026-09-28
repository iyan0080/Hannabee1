export interface ProductVariant {
  id: string;
  name: string;
  priceAdjustment: number; // Tambahan harga jual (e.g. +5000)
  costAdjustment: number;  // Tambahan HPP / modal (e.g. +3000)
  sku?: string;
}

export type ProductCategory = 
  | 'Makanan'
  | 'Minuman'
  | 'Snack & Gorengan'
  | 'Sembako & Kebutuhan'
  | 'Rokok & Pulsa'
  | 'Lainnya';

export interface Product {
  id: string;
  name: string;
  category: ProductCategory;
  basePrice: number;       // Harga jual dasar
  baseCost: number;        // HPP / Modal dasar
  stock: number;
  unit: string;            // 'porsi', 'pcs', 'bungkus', 'gelas', 'kg', 'botol'
  barcode?: string;
  emoji?: string;
  imageUrl?: string;
  variants: ProductVariant[];
  isAvailable: boolean;
  isArchived?: boolean;    // Status arsip menu (tidak aktif/disembunyikan dari POS)
  notes?: string;
}

export interface CartItem {
  id: string; // unique item cart id
  productId: string;
  productName: string;
  basePrice: number;
  baseCost: number;
  selectedVariants: ProductVariant[];
  finalPricePerUnit: number; // basePrice + sum of variant priceAdjustments
  finalCostPerUnit: number;  // baseCost + sum of variant costAdjustments
  quantity: number;
  discountType?: DiscountType; // 'PERCENTAGE' | 'NOMINAL'
  discountValue?: number;      // e.g. 10 for 10%, or 5000 for Rp 5.000
  discountAmount?: number;     // calculated total discount value for this cart item
  subtotal: number;
  subtotalCost: number;
  notes?: string;
}

export type PaymentMethod = 'TUNAI' | 'QRIS' | 'TRANSFER' | 'KASBON' | 'SALDO_DEPOSIT';

export type CustomerType = 'UMUM' | 'RESELLER';
export type DiscountType = 'NOMINAL' | 'PERCENTAGE';

export interface DepositRecord {
  id: string;
  timestamp: string;
  type: 'TOPUP' | 'PAYMENT' | 'REFUND';
  amount: number;
  paymentMethod?: 'TUNAI' | 'TRANSFER' | 'QRIS';
  invoiceNumber?: string;
  notes?: string;
  remainingBalance: number;
}

export interface PaymentRecord {
  id: string;
  date: string;
  amount: number;
  notes?: string;
}

export interface ReturnedItemRecord {
  cartItemId: string;
  productId: string;
  productName: string;
  variantNames?: string;
  returnedQuantity: number;
  pricePerUnit: number;
  costPerUnit: number;
  refundSubtotal: number;
  refundCost: number;
}

export interface ReturnRecord {
  id: string;
  timestamp: string; // ISO date string
  type: 'FULL_CANCEL' | 'PARTIAL_RETURN';
  reason: string; // Kolom keterangan alasan batal / retur
  items: ReturnedItemRecord[];
  totalRefundAmount: number;
  totalRefundCost: number;
  refundMethod: 'TUNAI' | 'SALDO_DEPOSIT' | 'POTONG_KASBON' | 'TRANSFER';
  restockProducts: boolean; // Apakah stok barang dikembalikan ke inventory
  processedBy?: string;
}

export type TransactionStatus = 'LUNAS' | 'BELUM_LUNAS' | 'BATAL' | 'DIRETUR_SEBAGIAN';

export interface Transaction {
  id: string;
  invoiceNumber: string;
  timestamp: string; // ISO date string
  items: CartItem[];
  subtotal: number;
  discount: number;
  discountType?: DiscountType;
  discountRate?: number; // Nilai input persentase atau nominal
  tax: number;
  finalAmount: number;
  totalCost: number; // Total HPP
  grossProfit: number; // finalAmount - totalCost
  amountPaid: number;
  change: number;
  paymentMethod: PaymentMethod;
  cashierName: string;
  customerId?: string;
  customerName?: string;
  customerPhone?: string;
  customerType?: CustomerType;
  status: TransactionStatus;
  dueDate?: string; // Untuk Kasbon
  depositUsed?: number;
  remainingDeposit?: number;
  paymentHistory?: PaymentRecord[];
  notes?: string;
  // Detail Pembatalan & Retur
  cancellationReason?: string;
  cancelledAt?: string;
  cancelledBy?: string;
  returnRecords?: ReturnRecord[];
  totalReturnedAmount?: number; // Total rupiah dana yang sudah dikembalikan/diretur
  totalReturnedCost?: number;   // Total HPP yang sudah diretur
  // Transaksi Susulan & Riwayat Edit
  isRetroactive?: boolean;
  retroactiveDateLabel?: string;
  editedAt?: string;
  editedBy?: string;
  editReason?: string;
}

export type ExpenseCategory = 
  | 'Belanja Bahan Baku'
  | 'Operasional & Listrik'
  | 'Sewa Tempat & Bangunan'
  | 'Gaji & Uang Makan Karyawan'
  | 'Peralatan & Kemasan'
  | 'Transportasi & Logistik'
  | 'Perawatan & Perbaikan'
  | 'Lain-lain';

export interface Expense {
  id: string;
  timestamp: string; // ISO string
  title: string;
  category: ExpenseCategory;
  amount: number;
  paymentMethod: 'TUNAI' | 'TRANSFER' | 'LAINNYA';
  recipient?: string; // Penerima / Toko tujuan
  notes?: string;
  cashierName?: string;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  customerType?: CustomerType; // 'UMUM' | 'RESELLER'
  storeName?: string; // Nama usaha / toko reseller
  resellerDiscountType?: DiscountType; // 'PERCENTAGE' | 'NOMINAL'
  resellerDiscountValue?: number; // Nilai diskon default reseller (misal: 10 untuk 10% atau 5000 untuk Rp 5.000)
  address?: string;
  notes?: string;
  totalTransactions: number;
  totalSpent: number;
  totalDebt: number; // Sisa kasbon yang belum lunas
  depositBalance?: number; // Saldo deposit uang untuk pembayaran pesanan
  depositHistory?: DepositRecord[];
  createdAt: string;
}

export type AutoJournalMode = 'DETAILED_PER_CATEGORY' | 'SIMPLE_PER_INVOICE';

export interface StoreSettings {
  storeName: string;
  tagline: string;
  address: string;
  phone: string;
  cashierName: string;
  receiptFooter: string;
  paperWidth: '58mm' | '80mm';
  enableTax: boolean;
  taxRate: number; // in percentage e.g. 10
  qrisInfo?: string;
  bankInfo?: string;
  logoUrl?: string;
  autoSyncCloud: boolean;
  // Auto-Jurnal POS Settings
  autoJournalEnabled?: boolean;
  autoJournalMode?: AutoJournalMode;
  autoJournalRecordHPP?: boolean;
  autoJournalRecordDiscount?: boolean;
}

export interface ProfitLossSummary {
  periodLabel: string;
  startDate: string;
  endDate: string;
  totalSales: number;       // Pendapatan Kotor (Omzet)
  totalCostOfGoods: number; // Total HPP (Harga Pokok Penjualan)
  grossProfit: number;      // Laba Kotor (totalSales - totalCostOfGoods)
  grossMargin: number;      // (grossProfit / totalSales) * 100
  totalExpenses: number;    // Total Beban Pengeluaran Operasional
  netProfit: number;        // Laba Bersih (grossProfit - totalExpenses)
  netMargin: number;        // (netProfit / totalSales) * 100
  transactionCount: number;
  averageTransactionValue: number;
  unpaidDebtTotal: number;  // Total Kasbon belum lunas pada periode ini
  expenseBreakdown: { [key in ExpenseCategory]?: number };
}

// === BOOKKEEPING / PEMBUKUAN TYPES ===

export type JournalEntryType = 'KAS_MASUK' | 'KAS_KELUAR';

export type JournalCategory =
  | 'Penjualan Kasir'
  | 'Penjualan Makanan'
  | 'Penjualan Minuman'
  | 'Penjualan Snack & Gorengan'
  | 'Penjualan Sembako & Kebutuhan'
  | 'Penjualan Rokok & Pulsa'
  | 'Penjualan Lainnya'
  | 'Pendapatan Pajak Penjualan'
  | 'Pelunasan Kasbon'
  | 'Top-Up Saldo Deposit'
  | 'Modal Awal / Tambahan Modal'
  | 'Pendapatan Lain-lain'
  | 'Beban Pokok Penjualan (HPP)'
  | 'Potongan Diskon Promosi Penjualan'
  | 'Pengembalian Dana / Retur Penjualan'
  | 'Prive / Penarikan Pemilik'
  | 'Setor Kas ke Bank'
  | 'Belanja Bahan Baku'
  | 'Operasional & Listrik'
  | 'Sewa Tempat & Bangunan'
  | 'Gaji & Uang Makan Karyawan'
  | 'Peralatan & Kemasan'
  | 'Transportasi & Logistik'
  | 'Perawatan & Perbaikan'
  | 'Pembelian Aset / Perlengkapan'
  | 'Pengeluaran Lain-lain';

export type CashAccountType = 'KAS_TUNAI' | 'BANK_TRANSFER' | 'QRIS' | 'SALDO_DEPOSIT';

export type JournalSourceType =
  | 'POS_AUTO_SALE'           // Penjualan otomatis dari POS
  | 'POS_AUTO_HPP'            // Beban Pokok Penjualan (HPP) otomatis
  | 'POS_AUTO_DISCOUNT'       // Beban Diskon Promosi Penjualan
  | 'POS_AUTO_REFUND'         // Pengembalian Dana / Retur Penjualan
  | 'POS_DEBT_SETTLEMENT'     // Pelunasan Kasbon
  | 'CUSTOMER_DEPOSIT_TOPUP'  // Topup Saldo Deposit
  | 'OPERATIONAL_EXPENSE'     // Beban Operasional Kas
  | 'MANUAL_JOURNAL';         // Jurnal Umum Manual

export interface ManualJournalEntry {
  id: string;
  timestamp: string; // ISO string
  type: JournalEntryType; // 'KAS_MASUK' | 'KAS_KELUAR'
  category: JournalCategory | string;
  title: string;
  amount: number;
  account: CashAccountType;
  recipientOrSource?: string;
  notes?: string;
  actorName?: string;
}

export interface JournalEntryItem {
  id: string;
  timestamp: string;
  dateStr: string;
  type: JournalEntryType;
  category: string;
  title: string;
  amount: number;
  account: CashAccountType;
  accountLabel: string;
  referenceType: 'TRANSACTION' | 'EXPENSE' | 'DEBT_SETTLEMENT' | 'DEPOSIT_TOPUP' | 'MANUAL';
  referenceId?: string;
  sourceType?: JournalSourceType;
  isAutoJournal?: boolean;
  invoiceNumber?: string;
  productCategory?: string;
  customerName?: string;
  notes?: string;
  actorName?: string;
  runningBalance?: number;
}

export interface CashDenomination {
  k100000: number; // Pecahan Rp 100.000
  k50000: number;  // Pecahan Rp 50.000
  k20000: number;  // Pecahan Rp 20.000
  k10000: number;  // Pecahan Rp 10.000
  k5000: number;   // Pecahan Rp 5.000
  k2000: number;   // Pecahan Rp 2.000
  k1000: number;   // Pecahan Rp 1.000
  coins: number;   // Total Koin Logam (Rp)
}

export interface CashClosingRecord {
  id: string;
  timestamp: string;
  dateStr: string;
  cashierName: string;
  systemCashExpected: number;
  physicalCashActual: number;
  difference: number; // actual - expected (0 = cocok, >0 = lebih, <0 = kurang)
  denominations: CashDenomination;
  totalSalesCash: number;
  totalExpensesCash: number;
  totalManualInCash: number;
  totalManualOutCash: number;
  notes?: string;
}

export interface CashFlowSummary {
  periodLabel: string;
  startDate: string;
  endDate: string;
  initialCashBalance: number;
  // Operasional
  operatingInflows: {
    salesCash: number;
    salesNonCash: number;
    debtSettlements: number;
    depositTopUps: number;
    otherOperating: number;
    total: number;
  };
  operatingOutflows: {
    materials: number;
    operationalUtilities: number;
    salaries: number;
    rent: number;
    packaging: number;
    otherExpenses: number;
    total: number;
  };
  netOperatingCashFlow: number;
  // Investasi
  investingOutflows: {
    assetsAndEquipment: number;
    total: number;
  };
  netInvestingCashFlow: number;
  // Pendanaan
  financingInflows: {
    capitalInjections: number;
    total: number;
  };
  financingOutflows: {
    ownerDrawingsPrive: number;
    total: number;
  };
  netFinancingCashFlow: number;
  // Summary
  netCashChange: number;
  endingCashBalance: number;
}

export interface CloudSyncState {
  isSyncing: boolean;
  lastSyncedAt: string | null;
  status: 'synced' | 'unsynced' | 'offline' | 'error';
  errorMessage?: string;
}

export interface AppUser {
  id: string;
  name: string;
  email: string; // Gmail address
  password: string; // User-chosen password
  phone?: string;
  avatarColor?: string;
  role: string; // Equal level for all users: 'Pengguna Warung'
  isActive: boolean;
  createdAt: string;
  lastLogin?: string;
}

// === SHOPPING & RESTOCK NOTES TYPES ===

export type ShoppingItemPriority = 'URGENT' | 'HIGH' | 'NORMAL' | 'LOW';
export type ShoppingItemStatus = 'PENDING' | 'IN_CART' | 'PURCHASED';

export interface ShoppingItem {
  id: string;
  name: string; // Nama Bahan / Barang (e.g. "Beras Pulen 25kg", "Cup 16oz + Tutup", "Telur Ayam 2 Karpet")
  category: string; // Kategori: "Bahan Baku Utama", "Bumbu & Sayuran", "Minuman & Sirup", "Kemasan & Plastik", "Gas & Perlengkapan", "Lain-lain"
  quantity: number; // Jumlah yang mau dibeli
  unit: string; // Satuan: 'kg', 'pcs', 'karpet', 'karton', 'dus', 'botol', 'pack', 'ikat', 'liter', 'tabung'
  estimatedPrice: number; // Estimasi harga belanja
  actualPrice?: number; // Realisasi harga setelah dibeli
  priority: ShoppingItemPriority; // 'URGENT' | 'HIGH' | 'NORMAL' | 'LOW'
  supplierLocation?: string; // Toko / Supplier / Pasar (e.g. "Pasar Induk", "Toko Plastik Jaya", "Agen Sembako Makmur")
  status: ShoppingItemStatus; // 'PENDING' | 'IN_CART' | 'PURCHASED'
  notes?: string; // Catatan merek, spesifikasi khusus, dll.
  relatedProductId?: string; // Jika terhubung dengan menu produk tertentu
  createdAt: string;
  createdBy?: string;
  purchasedAt?: string;
  purchasedBy?: string;
  isRecordedToExpense?: boolean; // Apakah sudah dicatat ke Beban Pengeluaran / Buku Kas
  expenseId?: string; // ID pengeluaran terkait jika sudah dicatat
}

// === BACKUP & RESTORE TYPES ===

export interface BackupDataPayload {
  appVersion: string;
  schemaVersion: number;
  backupDate: string; // ISO string
  backupDateWIB: string; // e.g. "22 Agustus 2026, 00:00:00 WIB"
  backupType: 'FULL' | 'CUSTOMERS' | 'PRODUCTS' | 'TRANSACTIONS' | 'CASH_BOOK';
  backupTarget: string; // e.g. "Admin 1 (Penyimpanan Lokal HP)"
  store: StoreSettings;
  counts: {
    customers: number;
    products: number;
    transactions: number;
    manualJournals: number;
    cashClosings: number;
    expenses: number;
    shoppingItems: number;
    users: number;
  };
  data: {
    customers: Customer[];
    products: Product[];
    transactions: Transaction[];
    manualJournals: ManualJournalEntry[];
    cashClosings: CashClosingRecord[];
    expenses: Expense[];
    shoppingItems: ShoppingItem[];
    storeSettings: StoreSettings;
    users: AppUser[];
  };
}

export interface LocalAutoBackupRecord {
  id: string;
  timestamp: string; // ISO string
  dateStrWIB: string; // e.g. "2026-08-22"
  timeStrWIB: string; // e.g. "00:00:00"
  type: 'AUTO_DAILY_00_00' | 'MANUAL';
  targetDevice: string; // e.g. "HP Admin 1"
  itemCounts: {
    customers: number;
    products: number;
    transactions: number;
    cashRecords: number; // manualJournals + cashClosings + expenses
  };
  fileSizeBytes: number;
  fileSizeFormatted: string;
  payload: BackupDataPayload;
}

export interface AutoBackupConfig {
  enabled: boolean;
  targetRole: string; // e.g. "Admin 1"
  hourWIB: number; // 0 for 00:00 WIB
  autoDownloadJSON: boolean; // Also trigger file download at 00:00 WIB
  lastBackupDateWIB: string | null;
  lastBackupTimestamp: string | null;
  keepMaxSnapshots: number;
}

