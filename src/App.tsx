import React, { useState, useEffect, useRef } from 'react';
import { WarungProvider, useWarung } from './context/WarungContext';
import { Navbar, NavTab } from './components/Navbar';
import { POSView } from './components/POSView';
import { ShoppingListManager } from './components/ShoppingListManager';
import { ReportsView } from './components/ReportsView';
import { BookkeepingView } from './components/BookkeepingView';
import { MenuManagementView } from './components/MenuManagementView';
import { CustomersView } from './components/CustomersView';
import { UserManagementView } from './components/UserManagementView';
import { SettingsView } from './components/SettingsView';
import { GeminiChatBoard } from './components/GeminiChatBoard';
import { AuthScreen } from './components/AuthScreen';
import { exportProfitLossToExcel, exportProfitLossToPDF } from './utils/exportData';
import { Menu, Plus, FileSpreadsheet, FileText, ShoppingCart, BarChart3, LogOut, UserCheck, AlertTriangle, X, Check, Sparkles } from 'lucide-react';

function MainApp() {
  const [activeTab, setActiveTab] = useState<NavTab>('pos');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showExitConfirmModal, setShowExitConfirmModal] = useState(false);
  const [exitToastVisible, setExitToastVisible] = useState(false);
  const lastBackPressTimeRef = useRef<number>(0);
  const activeTabRef = useRef<NavTab>('pos');

  const { storeSettings, calculateProfitLoss, isAuthenticated, currentUser, logout } = useWarung();

  // Keep activeTabRef in sync
  useEffect(() => {
    activeTabRef.current = activeTab;
  }, [activeTab]);

  // Mobile Back Button Navigation Handler (HTML5 History API)
  useEffect(() => {
    if (!isAuthenticated) return;

    // Push initial baseline state
    window.history.replaceState({ appState: 'hannabee_dashboard', tab: 'pos' }, '', window.location.href);
    window.history.pushState({ appState: 'hannabee_active', tab: activeTab }, '', window.location.href);

    const handlePopState = (e: PopStateEvent) => {
      const currentTab = activeTabRef.current;

      if (currentTab !== 'pos') {
        // If not in dashboard/POS, return to dashboard
        setActiveTab('pos');
        // Push state back to maintain history buffer
        window.history.pushState({ appState: 'hannabee_active', tab: 'pos' }, '', window.location.href);
      } else {
        // Already in dashboard/POS: trigger Exit Confirmation Modal
        const now = Date.now();
        if (now - lastBackPressTimeRef.current < 2500) {
          // Double press detected, ensure modal is open
          setShowExitConfirmModal(true);
        } else {
          lastBackPressTimeRef.current = now;
          setShowExitConfirmModal(true);
          setExitToastVisible(true);
          setTimeout(() => setExitToastVisible(false), 2500);
        }
        // Maintain history buffer so the browser page doesn't abruptly unload
        window.history.pushState({ appState: 'hannabee_active', tab: 'pos' }, '', window.location.href);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [isAuthenticated]);

  // When changing tab programmatically, push history
  const handleTabChange = (newTab: NavTab) => {
    setActiveTab(newTab);
    if (newTab !== activeTab) {
      window.history.pushState({ appState: 'hannabee_active', tab: newTab }, '', window.location.href);
    }
  };

  const handleConfirmExit = () => {
    setShowExitConfirmModal(false);
    logout();
  };

  // If user is not authenticated, show AuthScreen (Login / Register)
  if (!isAuthenticated) {
    return <AuthScreen />;
  }

  // Quick export from header bar
  const handleQuickExcel = () => {
    const start = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const end = new Date();
    const summary = calculateProfitLoss(start, end, 'Bulan Ini');
    exportProfitLossToExcel(summary, storeSettings);
  };

  const handleQuickPDF = () => {
    const start = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const end = new Date();
    const summary = calculateProfitLoss(start, end, 'Bulan Ini');
    exportProfitLossToPDF(summary, storeSettings);
  };

  const tabTitles: { [key in NavTab]: { title: string; subtitle: string } } = {
    pos: {
      title: 'Kasir POS & Pesanan',
      subtitle: 'Operasional kasir, katalog produk & menu foto, pesanan cepat, dan cetak struk WhatsApp',
    },
    gemini: {
      title: 'Gemini Business AI & Strategy Board',
      subtitle: 'Asisten AI konsultan bisnis warung, analitik omzet cerdas, generator promo WhatsApp, dan papan catatan strategi',
    },
    shopping: {
      title: 'Catatan Belanja & Bahan Baku',
      subtitle: 'Perencanaan belanja stok dan bahan baku warung, pantau budget, dan otomatis catat ke buku kas',
    },
    bookkeeping: {
      title: 'Buku Kas & Pembukuan Warung',
      subtitle: 'Jurnal mutasi kas, rekonsiliasi opname laci kasir (tutup kas), dan laporan arus kas SAK EMKM',
    },
    reports: {
      title: 'Pusat Laporan & Analitik',
      subtitle: 'Laporan laba rugi lengkap, riwayat transaksi penjualan, dan beban pengeluaran operasional',
    },
    menu: {
      title: 'Manajemen Menu & Varian',
      subtitle: 'Katalog produk warung, foto menu (maks 1MB), varian harga tambahan, dan stok barang',
    },
    customers: {
      title: 'Pelanggan & Saldo Deposit',
      subtitle: 'Kelola kontak WhatsApp, dompet saldo deposit, dan penagihan kasbon pelanggan',
    },
    users: {
      title: 'Manajemen Pengguna',
      subtitle: 'Kelola akun pengguna, login Gmail, dan pengaturan password staf warung',
    },
    settings: {
      title: 'Pengaturan Usaha',
      subtitle: 'Profil usaha HannaBee, opsi printer thermal, dan sinkronisasi data cloud multi-perangkat',
    },
  };

  return (
    <div className="flex h-screen w-full bg-[#f8fafc] text-[#0f172a] font-sans overflow-hidden">
      {/* Sidebar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={handleTabChange}
        mobileMenuOpen={mobileMenuOpen}
        setMobileMenuOpen={setMobileMenuOpen}
      />

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Geometric Balance Top Header */}
        <header className="h-16 sm:h-20 bg-white border-b border-slate-200 flex items-center justify-between px-4 sm:px-8 no-print shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <button
              id="mobile-menu-toggle-btn"
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-2 rounded-lg text-slate-600 hover:bg-slate-100 shrink-0"
            >
              <Menu size={20} />
            </button>
            <div className="min-w-0">
              <h2 className="text-base sm:text-lg font-semibold tracking-tight text-slate-900 truncate">
                {tabTitles[activeTab]?.title}
              </h2>
              <p className="text-[11px] sm:text-xs text-slate-500 hidden sm:block truncate">
                {tabTitles[activeTab]?.subtitle}
              </p>
            </div>
          </div>

          {/* Quick Header Actions & User Info */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* Quick Gemini AI Header Button */}
            <button
              id="header-gemini-ai-btn"
              onClick={() => handleTabChange('gemini')}
              className={`px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition ${
                activeTab === 'gemini'
                  ? 'bg-amber-500 text-slate-950 shadow-xs'
                  : 'bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200'
              }`}
              title="Buka Gemini Business AI & Strategy Board"
            >
              <Sparkles size={14} className="text-amber-600 animate-pulse" />
              <span className="hidden sm:inline">Gemini AI</span>
            </button>

            <button
              id="header-excel-btn"
              onClick={handleQuickExcel}
              className="px-3 py-1.5 sm:px-4 sm:py-2 bg-white border border-slate-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 hover:bg-slate-50 text-slate-700 shadow-2xs transition"
              title="Ekspor Laporan Laba Rugi Bulan Ini ke Excel"
            >
              <FileSpreadsheet size={14} className="text-emerald-600" />
              <span className="hidden md:inline">Unduh Excel</span>
            </button>

            <button
              id="header-pdf-btn"
              onClick={handleQuickPDF}
              className="px-3 py-1.5 sm:px-4 sm:py-2 bg-white border border-slate-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 hover:bg-slate-50 text-slate-700 shadow-2xs transition"
              title="Cetak Laporan Laba Rugi Bulan Ini ke PDF"
            >
              <FileText size={14} className="text-red-500" />
              <span className="hidden md:inline">Cetak PDF</span>
            </button>

            {activeTab !== 'pos' ? (
              <button
                id="header-new-sale-btn"
                onClick={() => handleTabChange('pos')}
                className="px-3.5 py-1.5 sm:px-4 sm:py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-xs transition"
              >
                <Plus size={15} />
                <span>+ Kasir POS</span>
              </button>
            ) : (
              <button
                id="header-view-report-btn"
                onClick={() => handleTabChange('reports')}
                className="px-3.5 py-1.5 sm:px-4 sm:py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-xs transition"
              >
                <BarChart3 size={15} />
                <span>Lihat Laporan</span>
              </button>
            )}

            {/* Current User Quick Header Pill */}
            {currentUser && (
              <div className="hidden sm:flex items-center gap-2 pl-2 border-l border-slate-200">
                <button
                  onClick={() => handleTabChange('users')}
                  className="flex items-center gap-2 p-1 rounded-xl hover:bg-slate-100 transition"
                  title="Lihat Manajemen Pengguna"
                >
                  <div
                    className={`w-7 h-7 rounded-lg ${
                      currentUser.avatarColor || 'bg-blue-600'
                    } text-white font-bold text-xs flex items-center justify-center`}
                  >
                    {currentUser.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="text-left hidden xl:block">
                    <p className="text-xs font-bold text-slate-800 leading-tight">{currentUser.name}</p>
                    <p className="text-[10px] text-slate-400 font-mono leading-tight">{currentUser.email}</p>
                  </div>
                </button>

                <button
                  onClick={() => setShowExitConfirmModal(true)}
                  className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                  title="Keluar Aplikasi"
                >
                  <LogOut size={16} />
                </button>
              </div>
            )}
          </div>
        </header>

        {/* View Routing with Scroll */}
        <div className="flex-1 overflow-y-auto">
          {activeTab === 'pos' && <POSView />}
          {activeTab === 'gemini' && <GeminiChatBoard />}
          {activeTab === 'shopping' && <ShoppingListManager />}
          {activeTab === 'bookkeeping' && <BookkeepingView />}
          {activeTab === 'reports' && <ReportsView />}
          {activeTab === 'menu' && <MenuManagementView />}
          {activeTab === 'customers' && <CustomersView />}
          {activeTab === 'users' && <UserManagementView />}
          {activeTab === 'settings' && <SettingsView />}
        </div>
      </main>

      {/* Confirmation Modal to Exit Application */}
      {showExitConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden border border-slate-200">
            <div className="p-4 bg-slate-900 text-white flex justify-between items-center">
              <div className="flex items-center gap-2">
                <span className="w-7 h-7 rounded-lg bg-red-500/20 text-red-400 flex items-center justify-center">
                  <LogOut size={16} />
                </span>
                <h3 className="font-bold text-sm">Konfirmasi Keluar Aplikasi</h3>
              </div>
              <button
                onClick={() => setShowExitConfirmModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-5 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mx-auto">
                <AlertTriangle size={24} />
              </div>
              <div>
                <h4 className="font-bold text-slate-900 text-sm">
                  Yakin Ingin Keluar dari Aplikasi?
                </h4>
                <p className="text-xs text-slate-500 mt-1">
                  Sesi kasir dan perubahan data Anda telah tersimpan rapi. Anda dapat login kembali kapan saja dengan akun Gmail Anda.
                </p>
              </div>

              <div className="pt-3 grid grid-cols-2 gap-2">
                <button
                  id="cancel-exit-app-btn"
                  onClick={() => setShowExitConfirmModal(false)}
                  className="w-full py-2 px-3 border border-slate-300 text-slate-700 hover:bg-slate-50 rounded-xl text-xs font-semibold transition"
                >
                  Batal / Tetap di Kasir
                </button>
                <button
                  id="confirm-exit-app-btn"
                  onClick={handleConfirmExit}
                  className="w-full py-2 px-3 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-semibold shadow-xs transition"
                >
                  Ya, Keluar Aplikasi
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function App() {
  return (
    <WarungProvider>
      <MainApp />
    </WarungProvider>
  );
}

