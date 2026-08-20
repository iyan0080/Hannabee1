import React, { useState } from 'react';
import { useWarung } from '../context/WarungContext';
import { StoreSettings } from '../types';
import { formatDate } from '../utils/format';
import {
  Settings,
  Store,
  Printer,
  Cloud,
  RefreshCw,
  Download,
  Upload,
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
} from 'lucide-react';

export const SettingsView: React.FC = () => {
  const {
    storeSettings,
    updateStoreSettings,
    syncState,
    syncWithCloud,
    clearAllDatabase,
    resetToSampleData,
    importAllData,
    products,
    transactions,
    expenses,
    customers,
    currentUser,
    users,
  } = useWarung();

  const [formData, setFormData] = useState<StoreSettings>({ ...storeSettings });
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateStoreSettings(formData);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  // Export full JSON backup
  const handleExportBackup = () => {
    const backupData = {
      exportedAt: new Date().toISOString(),
      storeSettings,
      products,
      transactions,
      expenses,
      customers,
    };

    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Backup_WarungKu_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Import JSON backup
  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = event => {
      try {
        const json = JSON.parse(event.target?.result as string);
        const ok = importAllData(json);
        if (ok) {
          alert('Data warung berhasil dipulihkan dari file cadangan!');
        } else {
          alert('Format file cadangan tidak valid.');
        }
      } catch {
        alert('Gagal membaca file JSON cadangan.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="max-w-4xl mx-auto p-3 sm:p-5 space-y-6">
      
      {/* Header */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-8 h-8 rounded-lg bg-blue-100 text-blue-800 flex items-center justify-center font-bold">
            ⚙️
          </span>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900">
              Pengaturan Profil Warung & Sistem
            </h2>
            <p className="text-xs text-slate-500">
              Kelola identitas usaha, format struk kasir, sinkronisasi multi-device, dan cadangan data.
            </p>
          </div>
        </div>
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

      {/* Main Settings Form */}
      <form onSubmit={handleSubmit} className="space-y-5">
        
        {/* 1. Profil Warung */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
            <Store size={18} className="text-blue-600" />
            <span>Identitas & Kontak Warung</span>
          </h3>

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

      {/* 4. Backup & Reset Data */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <h3 className="font-bold text-sm text-slate-900 border-b border-slate-100 pb-3">
          Cadangan & Pemulihan Data
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          {/* Download JSON */}
          <button
            id="download-backup-json-btn"
            onClick={handleExportBackup}
            className="p-4 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl flex flex-col items-center justify-center gap-2 text-slate-800 transition"
          >
            <Download size={20} className="text-blue-600" />
            <span className="font-bold">Unduh Cadangan JSON</span>
            <span className="text-[10px] text-slate-500 text-center">Simpan seluruh data ke file</span>
          </button>

          {/* Upload JSON */}
          <label className="p-4 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl flex flex-col items-center justify-center gap-2 text-slate-800 transition cursor-pointer">
            <Upload size={20} className="text-emerald-600" />
            <span className="font-bold">Pulihkan Data JSON</span>
            <span className="text-[10px] text-slate-500 text-center">Unggah file cadangan sebelumnya</span>
            <input type="file" accept=".json" onChange={handleImportBackup} className="hidden" />
          </label>

          {/* Hapus Semua Data Demo / Kosongkan Database */}
          <button
            id="reset-sample-data-btn"
            onClick={() => {
              if (
                confirm(
                  'Apakah Anda yakin ingin menghapus semua database demo dan mengosongkan seluruh data transaksi, produk, kasbon, dan pengeluaran?\n\nTindakan ini akan membuat warung Anda bersih dan siap untuk operasional nyata.'
                )
              ) {
                clearAllDatabase();
                alert('Semua data demo telah berhasil dihapus. Database warung Anda sekarang bersih dan siap digunakan!');
              }
            }}
            className="p-4 bg-red-50/70 hover:bg-red-100/80 border border-red-200 rounded-xl flex flex-col items-center justify-center gap-2 text-red-800 transition"
          >
            <Trash2 size={20} className="text-red-600" />
            <span className="font-bold">Kosongkan Semua Data</span>
            <span className="text-[10px] text-red-600/80 text-center">Hapus seluruh data demo & transaksi</span>
          </button>
        </div>
      </div>

    </div>
  );
};
