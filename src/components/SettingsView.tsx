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
} from 'lucide-react';

export const SettingsView: React.FC = () => {
  const {
    storeSettings,
    updateStoreSettings,
    syncState,
    syncWithCloud,
    clearAllDatabase,
    currentUser,
    users,
    triggerManualBackup,
  } = useWarung();

  const [formData, setFormData] = useState<StoreSettings>({ ...storeSettings });
  const [savedSuccess, setSavedSuccess] = useState(false);

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
            Kosongkan seluruh data demo, riwayat transaksi, dan catatan pembukuan untuk memulai operasional warung dari awal yang bersih.
          </p>
        </div>

        <div className="pt-1">
          <button
            id="reset-sample-data-btn"
            onClick={() => {
              if (
                confirm(
                  'Apakah Anda yakin ingin menghapus semua database demo dan mengosongkan seluruh data transaksi, produk, kasbon, dan pengeluaran?\n\nTindakan ini akan membuat database warung Anda bersih dan siap untuk operasional nyata.'
                )
              ) {
                clearAllDatabase();
                alert('Semua data demo telah berhasil dihapus. Database warung Anda sekarang bersih dan siap digunakan!');
              }
            }}
            className="w-full sm:w-auto px-5 py-3 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-xl flex items-center justify-center gap-2.5 font-bold text-xs transition"
          >
            <Trash2 size={16} className="text-red-600" />
            <span>Kosongkan Semua Data & Mulai Baru</span>
          </button>
        </div>
      </div>

    </div>
  );
};
