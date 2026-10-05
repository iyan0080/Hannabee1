import React, { useState, useEffect, useRef } from 'react';
import { WarungProvider, useWarung } from './context/WarungContext';
import { ModalProvider, useModal, useRegisterModal } from './context/ModalContext';
import { Navbar, NavTab } from './components/Navbar';
import { POSView } from './components/POSView';
import { ShoppingListManager } from './components/ShoppingListManager';
import { ReportsView } from './components/ReportsView';
import { BookkeepingView } from './components/BookkeepingView';
import { MenuManagementView } from './components/MenuManagementView';
import { CustomersView } from './components/CustomersView';
import { UserManagementView } from './components/UserManagementView';
import { SettingsView } from './components/SettingsView';
import { AuthScreen } from './components/AuthScreen';
import { Menu, Plus, ShoppingCart, BarChart3, LogOut, UserCheck, AlertTriangle, X, Check, ArrowLeft } from 'lucide-react';

function MainApp() {
  const { closeTopModal, hasOpenModal } = useModal();
  const [activeTab, setActiveTab] = useState<NavTab>('pos');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showExitConfirmModal, setShowExitConfirmModal] = useState(false);
  const [menuHistory, setMenuHistory] = useState<NavTab[]>(['pos']);
  const [navNotice, setNavNotice] = useState<string | null>(null);

  const activeTabRef = useRef<NavTab>('pos');
  const menuHistoryRef = useRef<NavTab[]>(['pos']);
  const mobileMenuOpenRef = useRef<boolean>(false);
  const showExitConfirmModalRef = useRef<boolean>(false);

  const { isAuthenticated, currentUser, logout } = useWarung();

  // Register mobile drawer and exit confirm modal with ModalContext
  useRegisterModal(mobileMenuOpen, () => setMobileMenuOpen(false), 'app-mobile-menu-drawer');
  useRegisterModal(showExitConfirmModal, () => setShowExitConfirmModal(false), 'app-exit-confirm-modal');

  // Keep refs in sync for event listeners
  useEffect(() => {
    activeTabRef.current = activeTab;
  }, [activeTab]);

  useEffect(() => {
    menuHistoryRef.current = menuHistory;
  }, [menuHistory]);

  useEffect(() => {
    mobileMenuOpenRef.current = mobileMenuOpen;
  }, [mobileMenuOpen]);

  useEffect(() => {
    showExitConfirmModalRef.current = showExitConfirmModal;
  }, [showExitConfirmModal]);

  // Tab Titles dictionary
  const tabTitles: { [key in NavTab]: { title: string; subtitle: string } } = {
    pos: {
      title: 'Kasir POS & Pesanan',
      subtitle: 'Operasional kasir, katalog produk & menu foto, pesanan cepat, dan cetak struk WhatsApp',
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
      subtitle: 'Kelola akun pengguna, login Gmail, dan hak akses bebas password staf warung',
    },
    settings: {
      title: 'Pengaturan Usaha',
      subtitle: 'Profil usaha HannaBee, opsi printer thermal, dan sinkronisasi data cloud multi-perangkat',
    },
  };

  // Dedicated back action (used by device back button & header back button)
  const handleGoBack = () => {
    // 1. If mobile menu drawer is open, close it
    if (mobileMenuOpenRef.current) {
      setMobileMenuOpen(false);
      return;
    }

    // 2. If exit modal is open, close it
    if (showExitConfirmModalRef.current) {
      setShowExitConfirmModal(false);
      return;
    }

    // 3. If any pop-up / modal is open, close it!
    const closed = closeTopModal();
    if (closed) {
      return;
    }

    // 4. If no modal is open, navigate to previously opened menu!
    const currentHistory = [...menuHistoryRef.current];
    if (currentHistory.length > 1) {
      currentHistory.pop(); // Remove current tab
      const previousTab = currentHistory[currentHistory.length - 1]; // Previous menu opened

      setMenuHistory(currentHistory);
      menuHistoryRef.current = currentHistory;

      setActiveTab(previousTab);
      activeTabRef.current = previousTab;

      const tabTitle = tabTitles[previousTab]?.title || previousTab;
      setNavNotice(`Kembali ke: ${tabTitle}`);
      setTimeout(() => setNavNotice(null), 1800);

      window.history.pushState({ appState: 'hannabee_active', tab: previousTab }, '', window.location.href);
      return;
    }

    // 5. At root menu:
    if (activeTabRef.current !== 'pos') {
      setActiveTab('pos');
      activeTabRef.current = 'pos';
      setMenuHistory(['pos']);
      menuHistoryRef.current = ['pos'];
      window.history.pushState({ appState: 'hannabee_active', tab: 'pos' }, '', window.location.href);
      return;
    }

    // Already at POS root menu: open exit confirmation modal
    setShowExitConfirmModal(true);
  };

  // Mobile & Browser Back Button Navigation Handler (HTML5 History API)
  useEffect(() => {
    if (!isAuthenticated) return;

    // Push initial baseline state
    window.history.replaceState({ appState: 'hannabee_dashboard', tab: 'pos' }, '', window.location.href);
    window.history.pushState({ appState: 'hannabee_active', tab: activeTab }, '', window.location.href);

    const handlePopState = () => {
      // 1. Priority 1: Close active pop-up / modal
      if (mobileMenuOpenRef.current) {
        setMobileMenuOpen(false);
        window.history.pushState({ appState: 'hannabee_active', tab: activeTabRef.current }, '', window.location.href);
        return;
      }

      if (showExitConfirmModalRef.current) {
        setShowExitConfirmModal(false);
        window.history.pushState({ appState: 'hannabee_active', tab: activeTabRef.current }, '', window.location.href);
        return;
      }

      const closedModal = closeTopModal();
      if (closedModal) {
        // Pop-up successfully closed, keep history state intact
        window.history.pushState({ appState: 'hannabee_active', tab: activeTabRef.current }, '', window.location.href);
        return;
      }

      // 2. Priority 2: If no pop-up is open, navigate to PREVIOUSLY OPENED MENU!
      const currentHistory = [...menuHistoryRef.current];
      if (currentHistory.length > 1) {
        currentHistory.pop(); // Remove current tab
        const previousTab = currentHistory[currentHistory.length - 1]; // Previous menu opened

        setMenuHistory(currentHistory);
        menuHistoryRef.current = currentHistory;

        setActiveTab(previousTab);
        activeTabRef.current = previousTab;

        const tabTitle = tabTitles[previousTab]?.title || previousTab;
        setNavNotice(`Kembali ke: ${tabTitle}`);
        setTimeout(() => setNavNotice(null), 1800);

        window.history.pushState({ appState: 'hannabee_active', tab: previousTab }, '', window.location.href);
        return;
      }

      // 3. Priority 3: At root menu:
      if (activeTabRef.current !== 'pos') {
        setActiveTab('pos');
        activeTabRef.current = 'pos';
        setMenuHistory(['pos']);
        menuHistoryRef.current = ['pos'];
        window.history.pushState({ appState: 'hannabee_active', tab: 'pos' }, '', window.location.href);
        return;
      }

      // Already at POS root menu: open exit confirmation modal
      setShowExitConfirmModal(true);
      window.history.pushState({ appState: 'hannabee_active', tab: 'pos' }, '', window.location.href);
    };

    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [isAuthenticated, closeTopModal]);

  // When changing tab programmatically, record history stack
  const handleTabChange = (newTab: NavTab) => {
    if (newTab === activeTab) return;

    setActiveTab(newTab);
    activeTabRef.current = newTab;

    setMenuHistory(prev => {
      if (prev[prev.length - 1] === newTab) return prev;
      const updated = [...prev, newTab];
      if (updated.length > 30) updated.shift();
      return updated;
    });

    window.history.pushState({ appState: 'hannabee_active', tab: newTab }, '', window.location.href);
  };

  const handleConfirmExit = () => {
    setShowExitConfirmModal(false);
    logout();
  };

  // If user is not authenticated, show AuthScreen (Login / Register)
  if (!isAuthenticated) {
    return <AuthScreen />;
  }

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
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <button
              id="mobile-menu-toggle-btn"
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-2 rounded-lg text-slate-600 hover:bg-slate-100 shrink-0"
              title="Buka Menu Navigasi"
            >
              <Menu size={20} />
            </button>

            {menuHistory.length > 1 && (
              <button
                id="header-back-btn"
                onClick={handleGoBack}
                className="p-1.5 sm:p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition flex items-center gap-1.5 shrink-0 text-xs font-semibold cursor-pointer border border-slate-200"
                title="Kembali ke menu sebelumnya (atau gunakan tombol kembali perangkat)"
              >
                <ArrowLeft size={16} className="text-slate-700" />
                <span className="hidden sm:inline text-xs">Kembali</span>
              </button>
            )}

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
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150 cursor-pointer"
          onClick={() => setShowExitConfirmModal(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden border border-slate-200 cursor-default"
            onClick={e => e.stopPropagation()}
          >
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

      {/* Floating Notice Toast when Navigating Back to Previous Menu */}
      {navNotice && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-slate-900/90 text-white px-4 py-2 rounded-full text-xs font-semibold shadow-xl backdrop-blur-xs flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2 border border-slate-700 pointer-events-none">
          <ArrowLeft size={14} className="text-amber-400" />
          <span>{navNotice}</span>
        </div>
      )}
    </div>
  );
}

export default function App() {
  return (
    <WarungProvider>
      <ModalProvider>
        <MainApp />
      </ModalProvider>
    </WarungProvider>
  );
}

