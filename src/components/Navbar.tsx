import React from 'react';
import { useWarung } from '../context/WarungContext';
import { HannaBeeLogo } from './HannaBeeLogo';
import {
  ShoppingCart,
  TrendingUp,
  FileSpreadsheet,
  Receipt,
  ArrowDownCircle,
  UtensilsCrossed,
  Users,
  Settings,
  RefreshCw,
  Phone,
  LayoutDashboard,
  BarChart3,
  UserCheck,
  LogOut,
  Mail,
  BookOpen,
  ClipboardList,
} from 'lucide-react';

export type NavTab = 
  | 'pos'
  | 'shopping'
  | 'bookkeeping'
  | 'reports'
  | 'menu'
  | 'customers'
  | 'users'
  | 'settings';

interface NavbarProps {
  activeTab: NavTab;
  setActiveTab: (tab: NavTab) => void;
  mobileMenuOpen: boolean;
  setMobileMenuOpen: (open: boolean) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  mobileMenuOpen,
  setMobileMenuOpen,
}) => {
  const {
    storeSettings,
    syncState,
    syncWithCloud,
    transactions,
    cart,
    customers,
    currentUser,
    users,
    shoppingItems,
    logout,
  } = useWarung();

  const unpaidCount = transactions.filter(t => t.status === 'BELUM_LUNAS').length;
  const cartItemCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const totalDepositAll = customers.reduce((sum, c) => sum + (c.depositBalance || 0), 0);
  const pendingShoppingCount = shoppingItems.filter(s => s.status !== 'PURCHASED').length;

  const navItems: { id: NavTab; label: string; icon: React.ReactNode; badge?: number | string; badgeColor?: string }[] = [
    { id: 'pos', label: 'Dashboard & Kasir', icon: <LayoutDashboard size={18} />, badge: cartItemCount > 0 ? `${cartItemCount} item` : undefined, badgeColor: 'bg-blue-500' },
    { id: 'shopping', label: 'Catatan Belanja Bahan', icon: <ClipboardList size={18} />, badge: pendingShoppingCount > 0 ? `${pendingShoppingCount}` : undefined, badgeColor: 'bg-amber-500' },
    { id: 'bookkeeping', label: 'Buku Kas & Pembukuan', icon: <BookOpen size={18} /> },
    { id: 'reports', label: 'Pusat Laporan', icon: <BarChart3 size={18} />, badge: unpaidCount > 0 ? `${unpaidCount} Bon` : undefined, badgeColor: 'bg-amber-500' },
    { id: 'menu', label: 'Menu & Kategori', icon: <UtensilsCrossed size={18} /> },
    { id: 'customers', label: 'Pelanggan & Saldo', icon: <Users size={18} />, badge: totalDepositAll > 0 ? 'Saldo' : undefined, badgeColor: 'bg-emerald-500' },
    { id: 'users', label: 'Manajemen Pengguna', icon: <UserCheck size={18} />, badge: users.length > 0 ? `${users.length} Akun` : undefined, badgeColor: 'bg-indigo-500' },
    { id: 'settings', label: 'Pengaturan Usaha', icon: <Settings size={18} /> },
  ];

  const handleNavClick = (id: NavTab) => {
    setActiveTab(id);
    setMobileMenuOpen(false);
  };

  return (
    <>
      {/* Desktop & Tablet Sidebar adhering to Geometric Balance */}
      <aside
        className={`w-64 bg-[#0f172a] text-white flex flex-col border-r border-slate-800 transition-all z-30 ${
          mobileMenuOpen ? 'fixed inset-y-0 left-0 flex shadow-2xl' : 'hidden lg:flex'
        }`}
      >
        {/* Brand Header with HannaBee Logo */}
        <div className="px-5 py-4 border-b border-slate-800/80 bg-slate-900/60">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <HannaBeeLogo size="sm" variant="compact" />
              <div>
                <div className="flex items-center gap-1.5">
                  <h1 className="text-base font-bold tracking-tight text-white">
                    HannaBee
                  </h1>
                  <span className="text-[10px] bg-amber-500/15 text-amber-300 font-bold px-1.5 py-0.2 rounded font-mono border border-amber-500/20">
                    POS
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 font-medium">
                  Kasir & Pembukuan Warung
                </p>
              </div>
            </div>
            {mobileMenuOpen && (
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="lg:hidden text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition"
                title="Tutup Menu"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 px-3 py-3 space-y-1 overflow-y-auto">
          {navItems.map(item => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                id={`sidebar-nav-${item.id}`}
                onClick={() => handleNavClick(item.id)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs sm:text-sm font-medium transition-all text-left group ${
                  isActive
                    ? 'bg-blue-600 text-white font-semibold shadow-xs'
                    : 'text-slate-300 hover:bg-slate-800/70 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span
                    className={`transition-colors shrink-0 ${
                      isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-200'
                    }`}
                  >
                    {item.icon}
                  </span>
                  <span className="truncate">{item.label}</span>
                </div>

                {item.badge && (
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-md font-semibold shrink-0 font-mono transition-colors ${
                      isActive
                        ? 'bg-white/20 text-white'
                        : 'bg-slate-800 text-slate-300 border border-slate-700/60'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Current Logged In User Profile Card */}
        {currentUser && (
          <div className="p-2.5 mx-3 mb-2.5 bg-slate-800/60 rounded-xl border border-slate-800 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <div
                className={`w-8 h-8 rounded-lg ${
                  currentUser.avatarColor || 'bg-blue-600'
                } text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-xs`}
              >
                {currentUser.name.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-slate-100 truncate">{currentUser.name}</p>
                <p className="text-[10px] text-slate-400 truncate">{currentUser.email || 'Kasir Warung'}</p>
              </div>
            </div>

            <button
              id="sidebar-logout-btn"
              onClick={() => {
                if (window.confirm('Yakin ingin keluar dari akun?')) {
                  logout();
                }
              }}
              className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-700/60 rounded-lg transition shrink-0"
              title="Keluar / Logout"
            >
              <LogOut size={15} />
            </button>
          </div>
        )}

        {/* Bottom Cloud Sync Status */}
        <div className="px-4 py-3 bg-slate-950/60 border-t border-slate-800/80">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0">
              <div
                className={`w-2 h-2 rounded-full shrink-0 ${
                  syncState.status === 'synced'
                    ? 'bg-emerald-400'
                    : syncState.status === 'offline'
                    ? 'bg-slate-500'
                    : 'bg-amber-400 animate-pulse'
                }`}
              />
              <div className="text-left min-w-0">
                <p className="text-[11px] font-medium text-slate-300 truncate">
                  {syncState.status === 'synced'
                    ? 'Cloud Terhubung'
                    : syncState.status === 'offline'
                    ? 'Offline'
                    : 'Menyinkronkan...'}
                </p>
                <p className="text-[9px] text-slate-500 truncate">
                  {storeSettings.storeName || 'HannaBee POS'}
                </p>
              </div>
            </div>

            <button
              id="sidebar-sync-now-btn"
              onClick={() => syncWithCloud()}
              disabled={syncState.isSyncing}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition shrink-0"
              title="Sinkronkan Sekarang"
            >
              <RefreshCw size={13} className={syncState.isSyncing ? 'animate-spin text-amber-400' : ''} />
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile Backdrop */}
      {mobileMenuOpen && (
        <div
          onClick={() => setMobileMenuOpen(false)}
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-20 lg:hidden"
        />
      )}
    </>
  );
};

