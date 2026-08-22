import {
  BackupDataPayload,
  LocalAutoBackupRecord,
  AutoBackupConfig,
  Customer,
  Product,
  Transaction,
  Expense,
  ManualJournalEntry,
  CashClosingRecord,
  ShoppingItem,
  StoreSettings,
  AppUser,
} from '../types';

export const LOCAL_BACKUP_STORAGE_KEY = 'warung_local_backup_snapshots';
export const AUTO_BACKUP_CONFIG_KEY = 'warung_auto_backup_config';

export const DEFAULT_AUTO_BACKUP_CONFIG: AutoBackupConfig = {
  enabled: true,
  targetRole: 'Admin 1',
  hourWIB: 0, // 00:00 WIB
  autoDownloadJSON: false, // Simpan ke local snapshot HP + opsi download
  lastBackupDateWIB: null,
  lastBackupTimestamp: null,
  keepMaxSnapshots: 14, // Simpan 14 hari terakhir snapshot harian
};

/**
 * Mendapatkan representasi waktu WIB (UTC+7 / Asia/Jakarta)
 */
export function getWIBDateTime(dateInput: Date = new Date()): {
  wibDateObj: Date;
  dateStrWIB: string; // e.g. "2026-08-22"
  timeStrWIB: string; // e.g. "00:00:00"
  formattedWIB: string; // e.g. "22 Agu 2026, 00:00 WIB"
  hourWIB: number;
  minuteWIB: number;
} {
  // Convert to UTC+7
  const utc = dateInput.getTime() + dateInput.getTimezoneOffset() * 60000;
  const wibDateObj = new Date(utc + 3600000 * 7);

  const year = wibDateObj.getFullYear();
  const month = String(wibDateObj.getMonth() + 1).padStart(2, '0');
  const day = String(wibDateObj.getDate()).padStart(2, '0');
  const hours = String(wibDateObj.getHours()).padStart(2, '0');
  const minutes = String(wibDateObj.getMinutes()).padStart(2, '0');
  const seconds = String(wibDateObj.getSeconds()).padStart(2, '0');

  const monthNames = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];

  const dateStrWIB = `${year}-${month}-${day}`;
  const timeStrWIB = `${hours}:${minutes}:${seconds}`;
  const formattedWIB = `${day} ${monthNames[wibDateObj.getMonth()]} ${year}, ${hours}:${minutes} WIB`;

  return {
    wibDateObj,
    dateStrWIB,
    timeStrWIB,
    formattedWIB,
    hourWIB: wibDateObj.getHours(),
    minuteWIB: wibDateObj.getMinutes(),
  };
}

/**
 * Format bytes to readable string (e.g. 142 KB, 1.2 MB)
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

/**
 * Generate full backup payload
 */
export function createBackupPayload(params: {
  customers: Customer[];
  products: Product[];
  transactions: Transaction[];
  expenses: Expense[];
  manualJournals: ManualJournalEntry[];
  cashClosings: CashClosingRecord[];
  shoppingItems: ShoppingItem[];
  storeSettings: StoreSettings;
  users: AppUser[];
  backupType?: 'FULL' | 'CUSTOMERS' | 'PRODUCTS' | 'TRANSACTIONS' | 'CASH_BOOK';
  backupTarget?: string;
}): BackupDataPayload {
  const wib = getWIBDateTime();
  const type = params.backupType || 'FULL';
  const target = params.backupTarget || 'Admin 1 (Penyimpanan Lokal HP)';

  return {
    appVersion: '2.5.0-warung-pintar',
    schemaVersion: 2,
    backupDate: new Date().toISOString(),
    backupDateWIB: wib.formattedWIB,
    backupType: type,
    backupTarget: target,
    store: params.storeSettings,
    counts: {
      customers: params.customers.length,
      products: params.products.length,
      transactions: params.transactions.length,
      manualJournals: params.manualJournals.length,
      cashClosings: params.cashClosings.length,
      expenses: params.expenses.length,
      shoppingItems: params.shoppingItems.length,
      users: params.users.length,
    },
    data: {
      customers: params.customers,
      products: params.products,
      transactions: params.transactions,
      manualJournals: params.manualJournals,
      cashClosings: params.cashClosings,
      expenses: params.expenses,
      shoppingItems: params.shoppingItems,
      storeSettings: params.storeSettings,
      users: params.users,
    },
  };
}

/**
 * Download payload as JSON file
 */
export function downloadBackupJSON(payload: BackupDataPayload, customName?: string) {
  const jsonStr = JSON.stringify(payload, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const wib = getWIBDateTime(new Date(payload.backupDate));
  
  const cleanStoreName = (payload.store?.storeName || 'Warung')
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .substring(0, 30);
  
  const fileName = customName || `BACKUP_WARUNG_${cleanStoreName}_${wib.dateStrWIB}_${payload.backupType.toLowerCase()}.json`;

  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', fileName);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Local Snapshot Storage Operations
 */
export function getLocalBackupSnapshots(): LocalAutoBackupRecord[] {
  try {
    const raw = localStorage.getItem(LOCAL_BACKUP_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.error('Failed to parse local backup snapshots:', err);
    return [];
  }
}

export function saveLocalBackupSnapshot(
  payload: BackupDataPayload,
  type: 'AUTO_DAILY_00_00' | 'MANUAL' = 'AUTO_DAILY_00_00',
  targetDevice: string = 'HP Admin 1'
): LocalAutoBackupRecord {
  const snapshots = getLocalBackupSnapshots();
  const jsonStr = JSON.stringify(payload);
  const fileSizeBytes = new Blob([jsonStr]).size;
  const wib = getWIBDateTime(new Date(payload.backupDate));

  const newRecord: LocalAutoBackupRecord = {
    id: `snap-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
    timestamp: payload.backupDate,
    dateStrWIB: wib.dateStrWIB,
    timeStrWIB: wib.timeStrWIB,
    type,
    targetDevice,
    itemCounts: {
      customers: payload.counts.customers,
      products: payload.counts.products,
      transactions: payload.counts.transactions,
      cashRecords: payload.counts.manualJournals + payload.counts.cashClosings + payload.counts.expenses,
    },
    fileSizeBytes,
    fileSizeFormatted: formatBytes(fileSizeBytes),
    payload,
  };

  // Keep latest snapshots first, limit to max 20 snapshots to save localStorage space
  const updated = [newRecord, ...snapshots.filter(s => s.id !== newRecord.id)].slice(0, 20);
  try {
    localStorage.setItem(LOCAL_BACKUP_STORAGE_KEY, JSON.stringify(updated));
  } catch (err) {
    console.warn('LocalStorage quota warning, trimming old snapshots:', err);
    // If quota exceeded, trim more aggressively
    const trimmed = [newRecord, ...snapshots.slice(0, 5)];
    localStorage.setItem(LOCAL_BACKUP_STORAGE_KEY, JSON.stringify(trimmed));
  }

  return newRecord;
}

export function deleteLocalBackupSnapshot(id: string): LocalAutoBackupRecord[] {
  const current = getLocalBackupSnapshots();
  const updated = current.filter(s => s.id !== id);
  localStorage.setItem(LOCAL_BACKUP_STORAGE_KEY, JSON.stringify(updated));
  return updated;
}

export function clearAllLocalSnapshots(): void {
  localStorage.removeItem(LOCAL_BACKUP_STORAGE_KEY);
}

/**
 * Auto Backup Config
 */
export function getAutoBackupConfig(): AutoBackupConfig {
  try {
    const raw = localStorage.getItem(AUTO_BACKUP_CONFIG_KEY);
    if (!raw) return DEFAULT_AUTO_BACKUP_CONFIG;
    return { ...DEFAULT_AUTO_BACKUP_CONFIG, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_AUTO_BACKUP_CONFIG;
  }
}

export function saveAutoBackupConfig(config: Partial<AutoBackupConfig>): AutoBackupConfig {
  const current = getAutoBackupConfig();
  const updated = { ...current, ...config };
  localStorage.setItem(AUTO_BACKUP_CONFIG_KEY, JSON.stringify(updated));
  return updated;
}

/**
 * Validate imported JSON backup file
 */
export function validateBackupFile(fileContent: string): {
  isValid: boolean;
  error?: string;
  payload?: BackupDataPayload;
} {
  try {
    const parsed = JSON.parse(fileContent);
    if (!parsed || typeof parsed !== 'object') {
      return { isValid: false, error: 'File JSON kosong atau format tidak valid.' };
    }

    if (!parsed.data || typeof parsed.data !== 'object') {
      return { isValid: false, error: 'File cadangan tidak memiliki struktur data warung yang valid.' };
    }

    const { data } = parsed;
    const hasAnyModule =
      Array.isArray(data.customers) ||
      Array.isArray(data.products) ||
      Array.isArray(data.transactions) ||
      Array.isArray(data.expenses) ||
      Array.isArray(data.manualJournals);

    if (!hasAnyModule) {
      return { isValid: false, error: 'Struktur data cadangan tidak memuat modul pelanggan, menu, transaksi, atau kas.' };
    }

    return {
      isValid: true,
      payload: parsed as BackupDataPayload,
    };
  } catch (err: any) {
    return { isValid: false, error: `Gagal membaca file JSON: ${err.message || 'Format tidak valid'}` };
  }
}
