import React, { useState, useRef } from 'react';
import { useWarung } from '../context/WarungContext';
import {
  Download,
  Upload,
  Database,
  Clock,
  HardDrive,
  Smartphone,
  ShieldCheck,
  FileJson,
  Calendar,
  AlertTriangle,
  Check,
  Layers,
  FolderDown,
  History,
  Trash2,
  RefreshCw,
  Info,
  ArrowDownToLine,
  FileSpreadsheet,
} from 'lucide-react';
import { exportCustomersToExcel, exportProductsToExcel, exportTransactionsToExcel, exportExpensesToExcel } from '../utils/exportData';
import {
  getWIBDateTime,
  validateBackupFile,
  downloadBackupJSON,
} from '../utils/backupService';
import { BackupDataPayload, LocalAutoBackupRecord } from '../types';

export const BackupRestoreSection: React.FC = () => {
  const {
    customers,
    products,
    transactions,
    expenses,
    manualJournals,
    cashClosings,
    shoppingItems,
    storeSettings,
    users,
    localBackupHistory,
    autoBackupConfig,
    lastAutoBackupNotice,
    dismissAutoBackupNotice,
    triggerManualBackup,
    saveCurrentAsLocalSnapshot,
    restoreDatabaseFromBackup,
    deleteLocalBackup,
    clearAllLocalBackups,
    updateAutoBackupConfig,
  } = useWarung();

  const [activeTab, setActiveTab] = useState<'AUTO_MANUAL' | 'SNAPSHOTS' | 'RESTORE'>('AUTO_MANUAL');
  const [selectedModule, setSelectedModule] = useState<'ALL' | 'CUSTOMERS' | 'PRODUCTS' | 'TRANSACTIONS' | 'CASH_BOOK'>('ALL');
  const [isProcessing, setIsProcessing] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  // Restore State
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadedPayload, setUploadedPayload] = useState<BackupDataPayload | null>(null);
  const [restoreMode, setRestoreMode] = useState<'REPLACE' | 'MERGE'>('REPLACE');
  const [restoreModalOpen, setRestoreModalOpen] = useState(false);

  const wibTime = getWIBDateTime();

  const handleManualBackup = (type: 'ALL' | 'CUSTOMERS' | 'PRODUCTS' | 'TRANSACTIONS' | 'CASH_BOOK' = 'ALL') => {
    setIsProcessing(true);
    try {
      const backupType = type === 'ALL' ? 'FULL' : type;
      triggerManualBackup(backupType);
      setFeedbackMessage({
        type: 'success',
        text: `Cadangan data (${type === 'ALL' ? 'Semua Data' : type}) berhasil dibuat dan diunduh sebagai file JSON!`,
      });
    } catch (err: any) {
      setFeedbackMessage({
        type: 'error',
        text: `Gagal membuat cadangan: ${err.message || 'Kesalahan sistem'}`,
      });
    } finally {
      setIsProcessing(false);
      setTimeout(() => setFeedbackMessage(null), 5000);
    }
  };

  const handleCreateSnapshot = () => {
    try {
      const snapshot = saveCurrentAsLocalSnapshot();
      setFeedbackMessage({
        type: 'success',
        text: `Snapshot lokal HP baru berhasil disimpan (${snapshot.fileSizeFormatted})!`,
      });
    } catch (err: any) {
      setFeedbackMessage({
        type: 'error',
        text: `Gagal membuat snapshot lokal: ${err.message || 'Kesalahan'}`,
      });
    }
    setTimeout(() => setFeedbackMessage(null), 4000);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const validation = validateBackupFile(content);

      if (!validation.isValid || !validation.payload) {
        setFeedbackMessage({
          type: 'error',
          text: validation.error || 'File JSON tidak valid atau rusak.',
        });
        setTimeout(() => setFeedbackMessage(null), 5000);
        return;
      }

      setUploadedPayload(validation.payload);
      setRestoreModalOpen(true);
    };

    reader.readAsText(file);
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleExecuteRestore = async () => {
    if (!uploadedPayload) return;

    setIsProcessing(true);
    const result = await restoreDatabaseFromBackup(uploadedPayload, restoreMode);
    setIsProcessing(false);
    setRestoreModalOpen(false);

    if (result.success) {
      setFeedbackMessage({
        type: 'success',
        text: result.message,
      });
      setUploadedPayload(null);
    } else {
      setFeedbackMessage({
        type: 'error',
        text: result.message,
      });
    }
    setTimeout(() => setFeedbackMessage(null), 6000);
  };

  const handleRestoreFromSnapshot = (snapshot: LocalAutoBackupRecord) => {
    setUploadedPayload(snapshot.payload);
    setRestoreModalOpen(true);
  };

  return (
    <div id="backup-restore-container" className="space-y-5">
      {/* Toast / Notification Banner */}
      {lastAutoBackupNotice && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-300 text-emerald-900 rounded-2xl flex items-center justify-between text-xs shadow-xs animate-fade-in">
          <div className="flex items-center gap-2 font-medium">
            <ShieldCheck size={18} className="text-emerald-600 shrink-0" />
            <span>{lastAutoBackupNotice}</span>
          </div>
          <button
            onClick={dismissAutoBackupNotice}
            className="px-2 py-1 text-[11px] font-bold bg-emerald-200/60 hover:bg-emerald-200 text-emerald-900 rounded-lg"
          >
            Tutup
          </button>
        </div>
      )}

      {feedbackMessage && (
        <div
          className={`p-3.5 rounded-2xl flex items-center gap-2 text-xs font-semibold shadow-xs ${
            feedbackMessage.type === 'success'
              ? 'bg-emerald-50 border border-emerald-300 text-emerald-900'
              : feedbackMessage.type === 'error'
              ? 'bg-rose-50 border border-rose-300 text-rose-900'
              : 'bg-blue-50 border border-blue-300 text-blue-900'
          }`}
        >
          {feedbackMessage.type === 'success' ? (
            <Check size={16} className="text-emerald-600 shrink-0" />
          ) : feedbackMessage.type === 'error' ? (
            <AlertTriangle size={16} className="text-rose-600 shrink-0" />
          ) : (
            <Info size={16} className="text-blue-600 shrink-0" />
          )}
          <span>{feedbackMessage.text}</span>
        </div>
      )}

      {/* Main Backup Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {/* Card Header with Tabs */}
        <div className="p-4 sm:p-5 border-b border-slate-100 bg-gradient-to-r from-slate-900 via-slate-800 to-blue-950 text-white">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-400/30 text-blue-400 flex items-center justify-center">
                <Database size={22} />
              </div>
              <div>
                <h3 className="font-bold text-sm sm:text-base text-white flex items-center gap-2">
                  <span>Pusat Cadangan Data & Keamanan Warung</span>
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                    Proteksi Lengkap
                  </span>
                </h3>
                <p className="text-xs text-slate-300 mt-0.5">
                  Cadangkan data pelanggan, menu, penjualan, dan kas ke format JSON & penyimpanan lokal HP.
                </p>
              </div>
            </div>

            {/* Quick Action: Backup Sekarang */}
            <button
              id="backup-sekarang-main-btn"
              onClick={() => handleManualBackup('ALL')}
              disabled={isProcessing}
              className="px-4 py-2.5 bg-blue-500 hover:bg-blue-600 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-md transition shrink-0 active:scale-95"
            >
              <ArrowDownToLine size={16} />
              <span>Backup Sekarang (JSON)</span>
            </button>
          </div>

          {/* Navigation Pills */}
          <div className="flex gap-2 mt-4 pt-3 border-t border-slate-700/60 overflow-x-auto pb-1">
            <button
              onClick={() => setActiveTab('AUTO_MANUAL')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === 'AUTO_MANUAL'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700'
              }`}
            >
              <Smartphone size={14} />
              <span>Cadangan & Auto-Backup 00.00 WIB</span>
            </button>

            <button
              onClick={() => setActiveTab('SNAPSHOTS')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === 'SNAPSHOTS'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700'
              }`}
            >
              <History size={14} />
              <span>Riwayat Snapshot HP ({localBackupHistory.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('RESTORE')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === 'RESTORE'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700'
              }`}
            >
              <Upload size={14} />
              <span>Pulihkan Data (Restore JSON)</span>
            </button>
          </div>
        </div>

        {/* Tab 1: Auto-Backup 00:00 WIB & Modular Backup */}
        {activeTab === 'AUTO_MANUAL' && (
          <div className="p-4 sm:p-5 space-y-5">
            {/* Automatic Daily Backup Section */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0 mt-0.5">
                    <Clock size={20} />
                  </div>
                  <div>
                    <h4 className="font-bold text-xs sm:text-sm text-slate-900">
                      Backup Otomatis Harian ke HP Admin 1 (Jam 00.00 WIB)
                    </h4>
                    <p className="text-[11px] sm:text-xs text-slate-600 mt-0.5">
                      Aplikasi secara otomatis mencadangkan data pelanggan, menu, penjualan, dan kas ke memori penyimpanan lokal HP setiap tengah malam.
                    </p>
                  </div>
                </div>

                {/* Toggle Switch */}
                <div className="flex items-center gap-2 self-end sm:self-center">
                  <span className="text-xs font-bold text-slate-700">
                    {autoBackupConfig.enabled ? 'Aktif' : 'Nonaktif'}
                  </span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={autoBackupConfig.enabled}
                      onChange={(e) => updateAutoBackupConfig({ enabled: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                  </label>
                </div>
              </div>

              {/* Status Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1 text-xs">
                <div className="p-3 bg-white rounded-xl border border-slate-200 flex flex-col justify-between">
                  <span className="text-slate-500 text-[11px]">Waktu Eksekusi Terjadwal:</span>
                  <div className="font-mono font-bold text-slate-900 text-sm mt-1 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    <span>Setiap 00.00 WIB</span>
                  </div>
                </div>

                <div className="p-3 bg-white rounded-xl border border-slate-200 flex flex-col justify-between">
                  <span className="text-slate-500 text-[11px]">Target Perangkat:</span>
                  <div className="font-bold text-indigo-700 text-xs mt-1 flex items-center gap-1">
                    <Smartphone size={14} />
                    <span>Penyimpanan Lokal {autoBackupConfig.targetRole || 'HP Admin 1'}</span>
                  </div>
                </div>

                <div className="p-3 bg-white rounded-xl border border-slate-200 flex flex-col justify-between">
                  <span className="text-slate-500 text-[11px]">Terakhir Dicadangkan:</span>
                  <div className="font-mono font-bold text-slate-900 text-xs mt-1">
                    {autoBackupConfig.lastBackupDateWIB ? (
                      <span className="text-emerald-700">{autoBackupConfig.lastBackupDateWIB} (00:00 WIB)</span>
                    ) : (
                      <span className="text-slate-400">Terjadwal untuk malam ini</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Additional Auto-Backup Options */}
              <div className="pt-2 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs border-t border-slate-200">
                <label className="flex items-center gap-2 cursor-pointer text-slate-700">
                  <input
                    type="checkbox"
                    checked={autoBackupConfig.autoDownloadJSON}
                    onChange={(e) => updateAutoBackupConfig({ autoDownloadJSON: e.target.checked })}
                    className="rounded text-blue-600 focus:ring-blue-500"
                  />
                  <span>Unduh otomatis file JSON ke folder Download HP saat jam 00:00 WIB</span>
                </label>

                <button
                  onClick={handleCreateSnapshot}
                  className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition"
                >
                  <HardDrive size={13} />
                  <span>Uji Buat Snapshot Sekarang</span>
                </button>
              </div>
            </div>

            {/* Scope Summary of Protected Data */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-xs sm:text-sm text-slate-900 flex items-center gap-2">
                  <ShieldCheck size={16} className="text-emerald-600" />
                  <span>Ringkasan Data yang Dicadangkan</span>
                </h4>
                <span className="text-[11px] text-slate-500">
                  Waktu WIB Saat Ini: <span className="font-mono font-bold text-slate-700">{wibTime.timeStrWIB} WIB</span>
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {/* 1. Pelanggan */}
                <div className="p-3.5 bg-blue-50/60 rounded-xl border border-blue-100 flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-blue-900">👥 Data Pelanggan</span>
                    <span className="px-2 py-0.5 text-[10px] font-extrabold rounded-md bg-blue-200 text-blue-800">
                      {customers.length}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 mt-2">
                    Profil, nomor WA, level reseller, kasbon, & saldo deposit.
                  </p>
                  <button
                    onClick={() => handleManualBackup('CUSTOMERS')}
                    className="mt-3 text-[11px] font-bold text-blue-700 hover:text-blue-900 flex items-center gap-1 underline"
                  >
                    <Download size={12} /> Unduh JSON Pelanggan
                  </button>
                </div>

                {/* 2. Menu & Produk */}
                <div className="p-3.5 bg-emerald-50/60 rounded-xl border border-emerald-100 flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-emerald-900">🍽️ Data Menu</span>
                    <span className="px-2 py-0.5 text-[10px] font-extrabold rounded-md bg-emerald-200 text-emerald-800">
                      {products.length}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 mt-2">
                    Kategori, harga jual, HPP, resep bahan baku, & stok.
                  </p>
                  <button
                    onClick={() => handleManualBackup('PRODUCTS')}
                    className="mt-3 text-[11px] font-bold text-emerald-700 hover:text-emerald-900 flex items-center gap-1 underline"
                  >
                    <Download size={12} /> Unduh JSON Menu
                  </button>
                </div>

                {/* 3. Penjualan */}
                <div className="p-3.5 bg-purple-50/60 rounded-xl border border-purple-100 flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-purple-900">🧾 Data Penjualan</span>
                    <span className="px-2 py-0.5 text-[10px] font-extrabold rounded-md bg-purple-200 text-purple-800">
                      {transactions.length}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 mt-2">
                    Riwayat nota faktur, laba kotor, diskon, & kasir.
                  </p>
                  <button
                    onClick={() => handleManualBackup('TRANSACTIONS')}
                    className="mt-3 text-[11px] font-bold text-purple-700 hover:text-purple-900 flex items-center gap-1 underline"
                  >
                    <Download size={12} /> Unduh JSON Penjualan
                  </button>
                </div>

                {/* 4. Kas & Jurnal */}
                <div className="p-3.5 bg-amber-50/60 rounded-xl border border-amber-100 flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-amber-900">💰 Data Kas</span>
                    <span className="px-2 py-0.5 text-[10px] font-extrabold rounded-md bg-amber-200 text-amber-800">
                      {manualJournals.length + cashClosings.length + expenses.length}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 mt-2">
                    Buku kas umum, tutup kas fisik, dan beban operasional.
                  </p>
                  <button
                    onClick={() => handleManualBackup('CASH_BOOK')}
                    className="mt-3 text-[11px] font-bold text-amber-700 hover:text-amber-900 flex items-center gap-1 underline"
                  >
                    <Download size={12} /> Unduh JSON Kas
                  </button>
                </div>
              </div>
            </div>

            {/* Comprehensive Single-Click Full Backup Bar */}
            <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl border border-blue-200 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold">
                  <FileJson size={22} />
                </div>
                <div>
                  <h4 className="font-bold text-xs sm:text-sm text-slate-900">
                    Cadangan Lengkap Satu Paket (All-in-One Backup)
                  </h4>
                  <p className="text-[11px] text-slate-600">
                    Menggabungkan seluruh data warung menjadi 1 file JSON terenkripsi untuk arsip aman atau pindah HP.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  id="backup-sekarang-full-btn"
                  onClick={() => handleManualBackup('ALL')}
                  disabled={isProcessing}
                  className="w-full sm:w-auto px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-xs transition active:scale-95"
                >
                  <Download size={15} />
                  <span>Unduh File Cadangan (.JSON)</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Snapshot History in Local Storage */}
        {activeTab === 'SNAPSHOTS' && (
          <div className="p-4 sm:p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h4 className="font-bold text-xs sm:text-sm text-slate-900 flex items-center gap-2">
                  <HardDrive size={16} className="text-indigo-600" />
                  <span>Daftar Snapshot Cadangan di Memori HP ({localBackupHistory.length})</span>
                </h4>
                <p className="text-[11px] text-slate-500">
                  Snapshot tersimpan aman di browser/HP secara offline tanpa memerlukan koneksi internet.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleCreateSnapshot}
                  className="px-3 py-1.5 bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 rounded-lg text-xs font-bold flex items-center gap-1.5 transition"
                >
                  <HardDrive size={13} />
                  <span>Ambil Snapshot Baru</span>
                </button>

                {localBackupHistory.length > 0 && (
                  <button
                    onClick={() => {
                      if (confirm('Hapus seluruh riwayat snapshot lokal di HP ini?')) {
                        clearAllLocalBackups();
                      }
                    }}
                    className="px-3 py-1.5 bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 rounded-lg text-xs font-bold flex items-center gap-1.5 transition"
                  >
                    <Trash2 size={13} />
                    <span>Bersihkan Riwayat</span>
                  </button>
                )}
              </div>
            </div>

            {localBackupHistory.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 space-y-2">
                <HardDrive size={32} className="mx-auto text-slate-400" />
                <p className="font-bold text-xs text-slate-700">Belum ada snapshot lokal yang tersimpan</p>
                <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
                  Snapshot akan dibuat otomatis setiap tengah malam (00:00 WIB) atau Anda dapat menekan tombol "Ambil Snapshot Baru" di atas.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {localBackupHistory.map((snap) => (
                  <div
                    key={snap.id}
                    className="p-3.5 bg-slate-50 hover:bg-slate-100/80 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition text-xs"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs ${
                          snap.type === 'AUTO_DAILY_00_00'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-indigo-100 text-indigo-800'
                        }`}
                      >
                        {snap.type === 'AUTO_DAILY_00_00' ? '00:00' : 'MANUAL'}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900">
                            {snap.dateStrWIB} • {snap.timeStrWIB} WIB
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              snap.type === 'AUTO_DAILY_00_00'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-indigo-100 text-indigo-800'
                            }`}
                          >
                            {snap.type === 'AUTO_DAILY_00_00' ? 'Otomatis 00:00 WIB' : 'Manual Snapshot'}
                          </span>
                          <span className="text-slate-400 text-[11px] font-mono">
                            {snap.fileSizeFormatted}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          {snap.itemCounts.customers} Pelanggan • {snap.itemCounts.products} Menu • {snap.itemCounts.transactions} Penjualan • {snap.itemCounts.cashRecords} Catatan Kas
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-center">
                      <button
                        onClick={() => downloadBackupJSON(snap.payload, `SNAPSHOT_${snap.dateStrWIB}_${snap.timeStrWIB.replace(/:/g, '-')}.json`)}
                        className="px-2.5 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1 shadow-2xs"
                        title="Unduh file JSON"
                      >
                        <Download size={12} />
                        <span>Unduh JSON</span>
                      </button>

                      <button
                        onClick={() => handleRestoreFromSnapshot(snap)}
                        className="px-2.5 py-1.5 bg-blue-50 border border-blue-200 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-bold flex items-center gap-1"
                        title="Pulihkan dari snapshot ini"
                      >
                        <RotateCcwIcon size={12} />
                        <span>Pulihkan</span>
                      </button>

                      <button
                        onClick={() => deleteLocalBackup(snap.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50"
                        title="Hapus snapshot ini"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Restore Database from File JSON */}
        {activeTab === 'RESTORE' && (
          <div className="p-4 sm:p-5 space-y-5">
            <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200 text-xs text-amber-900 flex items-start gap-3">
              <AlertTriangle size={20} className="text-amber-700 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-bold text-xs sm:text-sm">Perhatian Sebelum Memulihkan Data</h4>
                <p className="mt-1 text-amber-800 text-[11px] leading-relaxed">
                  Memulihkan cadangan akan menerapkan data dari file JSON ke aplikasi dan menyinkronkannya kembali ke Cloud Firestore. 
                  Anda dapat memilih mode <strong>Ganti Total (Replace)</strong> atau <strong>Gabungkan (Merge)</strong>.
                </p>
              </div>
            </div>

            {/* Upload Box */}
            <div className="p-6 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-300 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-700 flex items-center justify-center mx-auto">
                <Upload size={24} />
              </div>
              <div>
                <h4 className="font-bold text-xs sm:text-sm text-slate-900">
                  Pilih File Cadangan JSON (.json)
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  Klik tombol di bawah atau drag-and-drop file cadangan warung Anda.
                </p>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept=".json,application/json"
                onChange={handleFileUpload}
                className="hidden"
                id="restore-file-input"
              />

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold inline-flex items-center gap-2 shadow-xs transition"
              >
                <FolderDown size={16} />
                <span>Pilih File Cadangan JSON</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Restore Confirmation Modal */}
      {restoreModalOpen && uploadedPayload && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full p-5 sm:p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
              <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                <Upload size={22} />
              </div>
              <div>
                <h3 className="font-bold text-sm sm:text-base text-slate-900">
                  Konfirmasi Pemulihan Data Cadangan
                </h3>
                <p className="text-xs text-slate-500">
                  Periksa rincian data cadangan sebelum diterapkan ke sistem.
                </p>
              </div>
            </div>

            {/* Payload Statistics Preview */}
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-2">
              <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                <span className="text-slate-500">Nama Warung:</span>
                <span className="font-bold text-slate-900">{uploadedPayload.store?.storeName || 'Warung'}</span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                <span className="text-slate-500">Tanggal Backup:</span>
                <span className="font-bold text-slate-900">{uploadedPayload.backupDateWIB || uploadedPayload.backupDate}</span>
              </div>

              <div className="pt-1">
                <span className="text-slate-500 block mb-1.5 font-medium">Rincian Modul Data:</span>
                <div className="grid grid-cols-2 gap-2 font-mono text-[11px]">
                  <div className="p-2 bg-white rounded-lg border border-slate-200">
                    👥 Pelanggan: <strong>{uploadedPayload.data.customers?.length || 0}</strong>
                  </div>
                  <div className="p-2 bg-white rounded-lg border border-slate-200">
                    🍽️ Menu: <strong>{uploadedPayload.data.products?.length || 0}</strong>
                  </div>
                  <div className="p-2 bg-white rounded-lg border border-slate-200">
                    🧾 Penjualan: <strong>{uploadedPayload.data.transactions?.length || 0}</strong>
                  </div>
                  <div className="p-2 bg-white rounded-lg border border-slate-200">
                    💰 Kas & Jurnal: <strong>{(uploadedPayload.data.manualJournals?.length || 0) + (uploadedPayload.data.cashClosings?.length || 0) + (uploadedPayload.data.expenses?.length || 0)}</strong>
                  </div>
                </div>
              </div>
            </div>

            {/* Mode Selection */}
            <div className="space-y-2 text-xs">
              <span className="font-bold text-slate-800">Pilih Metode Pemulihan:</span>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <label
                  onClick={() => setRestoreMode('REPLACE')}
                  className={`p-3 rounded-xl border cursor-pointer flex flex-col justify-between transition ${
                    restoreMode === 'REPLACE'
                      ? 'bg-blue-50/80 border-blue-500 text-blue-900'
                      : 'bg-white border-slate-200 text-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="restoreMode"
                      checked={restoreMode === 'REPLACE'}
                      onChange={() => setRestoreMode('REPLACE')}
                      className="text-blue-600 focus:ring-blue-500"
                    />
                    <span className="font-bold text-xs">Ganti Total (Replace)</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1.5 pl-5">
                    Menimpa seluruh data dengan data cadangan ini (disarankan).
                  </p>
                </label>

                <label
                  onClick={() => setRestoreMode('MERGE')}
                  className={`p-3 rounded-xl border cursor-pointer flex flex-col justify-between transition ${
                    restoreMode === 'MERGE'
                      ? 'bg-blue-50/80 border-blue-500 text-blue-900'
                      : 'bg-white border-slate-200 text-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="restoreMode"
                      checked={restoreMode === 'MERGE'}
                      onChange={() => setRestoreMode('MERGE')}
                      className="text-blue-600 focus:ring-blue-500"
                    />
                    <span className="font-bold text-xs">Gabungkan (Merge)</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1.5 pl-5">
                    Menggabungkan data baru tanpa menghapus catatan yang ada saat ini.
                  </p>
                </label>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => {
                  setRestoreModalOpen(false);
                  setUploadedPayload(null);
                }}
                disabled={isProcessing}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition"
              >
                Batal
              </button>

              <button
                onClick={handleExecuteRestore}
                disabled={isProcessing}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs transition"
              >
                {isProcessing ? (
                  <>
                    <RefreshCw size={14} className="animate-spin" />
                    <span>Memulihkan Data...</span>
                  </>
                ) : (
                  <>
                    <Check size={14} />
                    <span>Ya, Pulihkan Sekarang</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

function RotateCcwIcon(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <path d="M3 3v5h5" />
    </svg>
  );
}
