import React, { useState } from 'react';
import { useWarung } from '../context/WarungContext';
import { StoreSettings } from '../types';
import { formatDate } from '../utils/format';
import { BackupRestoreSection } from './BackupRestoreSection';
import { HannaBeeLogo } from './HannaBeeLogo';
import {
  Settings,
  Store,
  Printer,
  Cloud,
  RefreshCw,
  RotateCcw,
  CheckCircle2,
  Save,
  Globe,
  CreditCard,
  UserCheck,
  Shield,
  KeyRound,
  Mail,
  Trash2,
  Download,
  Lock,
  AlertCircle,
  Eye,
  EyeOff,
  X,
  ShieldAlert,
} from 'lucide-react';

export const SettingsView: React.FC = () => {
  const {
    storeSettings,
    updateStoreSettings,
    syncState,
    syncWithCloud,
    clearAllDatabase,
    clearSalesAndCashData,
    currentUser,
    users,
    triggerManualBackup,
  } = useWarung();

  const [formData, setFormData] = useState<StoreSettings>({ ...storeSettings });
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Security password modal for database reset and data deletion
  const [resetModalType, setResetModalType] = useState<'SALES_CASH' | 'ALL_DATABASE' | null>(null);
  const [resetPasswordInput, setResetPasswordInput] = useState('');
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [resetErrorMsg, setResetErrorMsg] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateStoreSettings(formData);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  return (
    <div className="max-w-4xl mx-auto p-3 sm:p-5 space-y-6">
      
      {/* Header */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="w-8 h-8 rounded-lg bg-blue-100 text-blue-800 flex items-center justify-center font-bold">
            ⚙️
          </span>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900">
              Pengaturan Usaha & Keamanan Warung
            </h2>
            <p className="text-xs text-slate-500">
              Kelola identitas usaha, format struk, cadangan data (backup), dan sinkronisasi multi-device.
            </p>
          </div>
        </div>

        <button
          id="header-backup-btn"
          type="button"
          onClick={() => triggerManualBackup('FULL')}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs transition shrink-0 active:scale-95"
        >
          <Download size={15} />
          <span>Backup Sekarang</span>
        </button>
      </div>

      {/* Cloud Synchronization Section */}
      <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white p-5 rounded-2xl shadow-md border border-slate-700 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center border border-blue-500/30">
              <Cloud size={22} />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white">Sinkronisasi Cloud & Multi-Perangkat</h3>
              <p className="text-xs text-slate-300">
                Akses kasir & laporan secara bersamaan dari HP kasir, tablet, dan laptop pemilik.
              </p>
            </div>
          </div>

          <button
            id="manual-sync-settings-btn"
            onClick={() => syncWithCloud()}
            disabled={syncState.isSyncing}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow-xs transition disabled:opacity-50"
          >
            <RefreshCw size={14} className={syncState.isSyncing ? 'animate-spin' : ''} />
            <span>{syncState.isSyncing ? 'Menyinkronkan...' : 'Sinkronkan Sekarang'}</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-xs">
          <div className="p-3 bg-slate-800/80 rounded-xl border border-slate-700 flex justify-between items-center">
            <span className="text-slate-400">Status Server Cloud:</span>
            <span className="font-bold text-emerald-400 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" /> Terhubung & Aktif
            </span>
          </div>

          <div className="p-3 bg-slate-800/80 rounded-xl border border-slate-700 flex justify-between items-center">
            <span className="text-slate-400">Terakhir Disinkron:</span>
            <span className="font-mono text-slate-200">
              {syncState.lastSyncedAt ? formatDate(syncState.lastSyncedAt) : 'Baru saja'}
            </span>
          </div>
        </div>
      </div>

      {/* Backup & Restore Dedicated Section */}
      <BackupRestoreSection />

      {/* Main Settings Form */}
      <form onSubmit={handleSubmit} className="space-y-5">
        
        {/* 1. Profil Warung */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
              <Store size={18} className="text-blue-600" />
              <span>Identitas & Kontak Warung</span>
            </h3>
            <span className="text-[11px] text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-full font-bold border border-amber-200">
              Logo Resmi Aktif
            </span>
          </div>

          {/* Logo & Brand Display Preview */}
          <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 text-white flex flex-col sm:flex-row items-center gap-4">
            <HannaBeeLogo size="lg" variant="badge" />
            <div className="text-center sm:text-left space-y-1">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                <span className="font-black text-amber-400 text-base">{formData.storeName || 'HannaBee'}</span>
                <span className="text-[10px] bg-amber-500/20 text-amber-300 font-bold px-2 py-0.5 rounded-md border border-amber-400/30">
                  Logo Aplikasi
                </span>
              </div>
              <p className="text-xs text-amber-200/90 italic font-medium">{formData.tagline || 'Jajanan Wareg Seger'}</p>
              <p className="text-[11px] text-slate-400">Logo ini otomatis terpasang pada favicon aplikasi, sidebar navigasi, struk cetak kasir, dan dasbor kasir POS.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-medium text-slate-700 mb-1">Nama Warung / Usaha *</label>
              <input
                type="text"
                required
                value={formData.storeName}
                onChange={e => setFormData({ ...formData, storeName: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl font-semibold"
              />
            </div>

            <div>
              <label className="block font-medium text-slate-700 mb-1">Slogan / Tagline Usaha</label>
              <input
                type="text"
                value={formData.tagline}
                onChange={e => setFormData({ ...formData, tagline: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block font-medium text-slate-700 mb-1">Alamat Lengkap Usaha *</label>
              <input
                type="text"
                required
                value={formData.address}
                onChange={e => setFormData({ ...formData, address: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl"
              />
            </div>

            <div>
              <label className="block font-medium text-slate-700 mb-1">Nomor WhatsApp Resmi *</label>
              <input
                type="tel"
                required
                value={formData.phone}
                onChange={e => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono"
              />
            </div>

            <div>
              <label className="block font-medium text-slate-700 mb-1">Nama Kasir Bertugas</label>
              <input
                type="text"
                value={formData.cashierName}
                onChange={e => setFormData({ ...formData, cashierName: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl"
              />
            </div>
          </div>
        </div>

        {/* 2. Format Printer & Struk */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
            <Printer size={18} className="text-blue-600" />
            <span>Format Struk Kasir & Printer Thermal</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-medium text-slate-700 mb-1">Ukuran Kertas Struk</label>
              <select
                value={formData.paperWidth}
                onChange={e => setFormData({ ...formData, paperWidth: e.target.value as any })}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl"
              >
                <option value="58mm">58mm (Printer Thermal Mini / Bluetooth)</option>
                <option value="80mm">80mm (Printer Desktop Standar)</option>
              </select>
            </div>

            <div>
              <label className="block font-medium text-slate-700 mb-1">Pesan Kaki Struk (Footer)</label>
              <input
                type="text"
                value={formData.receiptFooter}
                onChange={e => setFormData({ ...formData, receiptFooter: e.target.value })}
                placeholder="Terima kasih atas kunjungannya!"
                className="w-full px-3 py-2 border border-slate-300 rounded-xl"
              />
            </div>

            <div>
              <label className="block font-medium text-slate-700 mb-1">Info Rekening Pembayaran</label>
              <input
                type="text"
                value={formData.bankInfo || ''}
                onChange={e => setFormData({ ...formData, bankInfo: e.target.value })}
                placeholder="Contoh: BCA 8735019284 a.n. Warung Berkah"
                className="w-full px-3 py-2 border border-slate-300 rounded-xl"
              />
            </div>

            <div>
              <label className="block font-medium text-slate-700 mb-1">Info QRIS</label>
              <input
                type="text"
                value={formData.qrisInfo || ''}
                onChange={e => setFormData({ ...formData, qrisInfo: e.target.value })}
                placeholder="Contoh: NMID: ID1020304050607 / Warung Berkah"
                className="w-full px-3 py-2 border border-slate-300 rounded-xl"
              />
            </div>
          </div>
        </div>

        {/* 3. Konfigurasi Auto-Jurnal POS */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center font-bold text-xs">⚡</span>
              <span>Integrasi Auto-Jurnal POS & Buku Kas</span>
            </h3>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
              Otomatisasi Real-Time
            </span>
          </div>

          <p className="text-xs text-slate-500">
            Fitur Auto-Jurnal secara otomatis mencatat setiap transaksi penjualan kasir yang selesai ke dalam Buku Kas dengan klasifikasi kategori pemasukan dan saluran kas yang akurat.
          </p>

          <div className="space-y-3.5 pt-1 text-xs">
            {/* Toggle Active */}
            <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl border border-slate-200">
              <div>
                <p className="font-bold text-slate-800">Aktifkan Auto-Jurnal Transaksi Kasir</p>
                <p className="text-slate-500 text-[11px]">Setiap nota selesai di POS otomatis tercatat di Buku Kas & Jurnal Mutasi</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.autoJournalEnabled !== false}
                  onChange={e => setFormData({ ...formData, autoJournalEnabled: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-600"></div>
              </label>
            </div>

            {/* Classification Mode */}
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
              <label className="block font-bold text-slate-800">Mode Klasifikasi Kategori Penjualan:</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <label
                  className={`p-3 rounded-xl border cursor-pointer flex items-start gap-2.5 transition-all ${
                    (formData.autoJournalMode || 'DETAILED_PER_CATEGORY') === 'DETAILED_PER_CATEGORY'
                      ? 'bg-amber-50/80 border-amber-400 text-amber-950 font-medium'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="autoJournalMode"
                    value="DETAILED_PER_CATEGORY"
                    checked={(formData.autoJournalMode || 'DETAILED_PER_CATEGORY') === 'DETAILED_PER_CATEGORY'}
                    onChange={() => setFormData({ ...formData, autoJournalMode: 'DETAILED_PER_CATEGORY' })}
                    className="mt-0.5 text-amber-600 focus:ring-amber-500"
                  />
                  <div>
                    <span className="font-bold block text-xs">Rinci per Kategori Produk</span>
                    <span className="text-[11px] text-slate-500 block mt-0.5">
                      Memisahkan omzet otomatis ke Penjualan Makanan, Penjualan Minuman, Sembako, dll.
                    </span>
                  </div>
                </label>

                <label
                  className={`p-3 rounded-xl border cursor-pointer flex items-start gap-2.5 transition-all ${
                    formData.autoJournalMode === 'SIMPLE_PER_INVOICE'
                      ? 'bg-amber-50/80 border-amber-400 text-amber-950 font-medium'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="autoJournalMode"
                    value="SIMPLE_PER_INVOICE"
                    checked={formData.autoJournalMode === 'SIMPLE_PER_INVOICE'}
                    onChange={() => setFormData({ ...formData, autoJournalMode: 'SIMPLE_PER_INVOICE' })}
                    className="mt-0.5 text-amber-600 focus:ring-amber-500"
                  />
                  <div>
                    <span className="font-bold block text-xs">Ringkas per Nota Kasir</span>
                    <span className="text-[11px] text-slate-500 block mt-0.5">
                      Mencatat 1 baris jurnal per nota dengan kategori tunggal "Penjualan Kasir (POS)".
                    </span>
                  </div>
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Submit Save Settings */}
        <div className="flex items-center justify-between">
          {savedSuccess ? (
            <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1">
              <CheckCircle2 size={16} /> Pengaturan berhasil disimpan & diperbarui!
            </span>
          ) : (
            <div />
          )}

          <button
            id="save-settings-btn"
            type="submit"
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs flex items-center gap-2 shadow-xs transition"
          >
            <Save size={16} />
            <span>Simpan Pengaturan</span>
          </button>
        </div>
      </form>

      {/* 3. User Management & Security */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <UserCheck size={18} className="text-indigo-600" />
            <h3 className="font-bold text-sm text-slate-900">
              Akun Pengguna & Keamanan Sistem
            </h3>
          </div>
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
            {users.length} Akun Terdaftar
          </span>
        </div>

        {currentUser && (
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl ${currentUser.avatarColor || 'bg-blue-600'} text-white font-bold text-sm flex items-center justify-center`}>
                {currentUser.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="font-bold text-slate-900 text-sm">{currentUser.name}</p>
                <p className="text-slate-500 font-mono flex items-center gap-1">
                  <Mail size={12} className="text-slate-400" />
                  <span>{currentUser.email}</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 font-medium text-[11px] border border-emerald-200 flex items-center gap-1">
                <Shield size={12} />
                <span>Level: Hak Akses Setara</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 4. Pembersihan & Reset Data Operasional */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div>
          <h3 className="font-bold text-sm text-slate-900 border-b border-slate-100 pb-2">
            Pembersihan & Reset Database
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Kelola pembersihan data transaksi kasir, buku kas, atau reset total sistem secara aman dan tersinkronisasi langsung ke Cloud.
          </p>
        </div>

        <div className="pt-1 flex flex-col sm:flex-row gap-3">
          <button
            id="reset-sales-cash-btn"
            onClick={() => {
              setResetModalType('SALES_CASH');
              setResetPasswordInput('');
              setResetErrorMsg('');
              setShowResetPassword(false);
            }}
            className="w-full sm:w-auto px-5 py-3 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 rounded-xl flex items-center justify-center gap-2.5 font-bold text-xs transition"
          >
            <Trash2 size={16} className="text-amber-700" />
            <span>Hapus Semua Data Kas & Penjualan (Menu Tetap Aman)</span>
          </button>

          <button
            id="reset-sample-data-btn"
            onClick={() => {
              setResetModalType('ALL_DATABASE');
              setResetPasswordInput('');
              setResetErrorMsg('');
              setShowResetPassword(false);
            }}
            className="w-full sm:w-auto px-5 py-3 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-xl flex items-center justify-center gap-2.5 font-bold text-xs transition"
          >
            <Trash2 size={16} className="text-red-600" />
            <span>Reset Total Semua Data</span>
          </button>
        </div>
      </div>

      {/* Security Password Modal for Database Reset / Data Deletion */}
      {resetModalType && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200">
            {/* Header */}
            <div className={`p-4 sm:p-5 text-white flex items-center justify-between ${
              resetModalType === 'ALL_DATABASE' ? 'bg-red-600' : 'bg-amber-600'
            }`}>
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                  <ShieldAlert size={20} className="text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-sm">
                    {resetModalType === 'ALL_DATABASE'
                      ? 'Otorisasi Reset Total Database'
                      : 'Otorisasi Hapus Data Kas & Penjualan'}
                  </h3>
                  <p className="text-[11px] text-white/80">
                    Konfirmasi Keamanan & Password Otorisasi
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setResetModalType(null);
                  setResetPasswordInput('');
                  setResetErrorMsg('');
                }}
                className="p-1 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition"
              >
                <X size={18} />
              </button>
            </div>

            {/* Form */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                setResetErrorMsg('');

                if (!resetPasswordInput) {
                  setResetErrorMsg('Silakan masukkan password otorisasi.');
                  return;
                }

                if (resetModalType === 'SALES_CASH') {
                  const res = clearSalesAndCashData(resetPasswordInput.trim());
                  if (!res.success) {
                    setResetErrorMsg(res.message);
                    return;
                  }
                  setResetModalType(null);
                  setResetPasswordInput('');
                  alert(res.message);
                } else if (resetModalType === 'ALL_DATABASE') {
                  const res = clearAllDatabase(resetPasswordInput.trim());
                  if (!res.success) {
                    setResetErrorMsg(res.message);
                    return;
                  }
                  setResetModalType(null);
                  setResetPasswordInput('');
                  alert(res.message);
                }
              }}
              className="p-5 sm:p-6 space-y-4 text-xs"
            >
              {/* Warning Notice Box */}
              <div className={`p-3.5 rounded-2xl border text-xs leading-relaxed ${
                resetModalType === 'ALL_DATABASE'
                  ? 'bg-red-50 border-red-200 text-red-900'
                  : 'bg-amber-50 border-amber-200 text-amber-900'
              }`}>
                {resetModalType === 'ALL_DATABASE' ? (
                  <>
                    <p className="font-bold mb-1 flex items-center gap-1.5 text-red-700">
                      <span>⚠️</span>
                      <span>PERINGATAN RESET TOTAL DATABASE</span>
                    </p>
                    <p className="text-[11px] text-red-800">
                      Tindakan ini akan mengosongkan <strong>SELURUH</strong> data warung (produk/menu, kategori, transaksi penjualan, catatan kas, saldo deposit, data pelanggan, dan catatan belanja) dari perangkat ini dan Cloud Firestore. Tindakan ini <strong>tidak dapat dibatalkan</strong>.
                    </p>
                  </>
                ) : (
                  <>
                    <p className="font-bold mb-1 flex items-center gap-1.5 text-amber-800">
                      <span>⚠️</span>
                      <span>PEMBERSIHAN DATA KAS & TRANSAKSI</span>
                    </p>
                    <p className="text-[11px] text-amber-800">
                      Seluruh riwayat transaksi penjualan kasir, beban pengeluaran, mutasi kas manual, dan rekonsiliasi tutup kas akan dihapus dari memori dan Cloud Firestore. <strong>Katalog produk/menu dan daftar pelanggan tetap aman tersimpan.</strong>
                    </p>
                  </>
                )}
              </div>

              {/* Error Feedback */}
              {resetErrorMsg && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-start gap-2 animate-shake">
                  <AlertCircle size={16} className="shrink-0 text-rose-600 mt-0.5" />
                  <span className="font-medium">{resetErrorMsg}</span>
                </div>
              )}

              {/* Password Input Field */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1.5">
                  Password Otorisasi <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    id="reset-database-password-input"
                    type={showResetPassword ? 'text' : 'password'}
                    required
                    placeholder="Masukkan password otorisasi..."
                    value={resetPasswordInput}
                    onChange={(e) => {
                      setResetPasswordInput(e.target.value);
                      if (resetErrorMsg) setResetErrorMsg('');
                    }}
                    className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowResetPassword(!showResetPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                  >
                    {showResetPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
                <p className="text-[10px] text-slate-400 mt-1">
                  Masukkan password pemilik warung untuk mengonfirmasi tindakan ini.
                </p>
              </div>

              {/* Actions */}
              <div className="pt-2 flex gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    setResetModalType(null);
                    setResetPasswordInput('');
                    setResetErrorMsg('');
                  }}
                  className="flex-1 py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition"
                >
                  Batal
                </button>
                <button
                  id="confirm-reset-submit-btn"
                  type="submit"
                  disabled={!resetPasswordInput.trim()}
                  className={`flex-1 py-2.5 px-4 text-white rounded-xl text-xs font-bold shadow-xs transition flex items-center justify-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed ${
                    resetModalType === 'ALL_DATABASE'
                      ? 'bg-red-600 hover:bg-red-700'
                      : 'bg-amber-600 hover:bg-amber-700'
                  }`}
                >
                  <Trash2 size={14} />
                  <span>
                    {resetModalType === 'ALL_DATABASE' ? 'Reset Total Sekarang' : 'Hapus Data Kas & Jual'}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
