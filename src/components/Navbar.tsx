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
    { id: 'menu', label: 'Menu & Varian', icon: <UtensilsCrossed size={18} /> },
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
        <div className="p-5 border-b border-slate-700/80 bg-slate-900/90">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <HannaBeeLogo size="sm" variant="compact" />
              <div>
                <h1 className="text-lg font-black tracking-tight text-amber-400 flex items-center gap-1.5">
                  <span>HannaBee</span>
                  <span className="text-[10px] bg-amber-500/20 text-amber-300 font-bold px-1.5 py-0.5 rounded-xs border border-amber-400/30">POS</span>
                </h1>
                <p className="text-[10px] text-slate-300 italic font-medium">
                  Jajanan Wareg Seger
                </p>
                <div className="flex items-center gap-1 mt-1 text-[10px] text-slate-400 font-mono">
                  <Phone size={10} className="text-amber-400" />
                  <span>0821-7886-7116</span>
                </div>
              </div>
            </div>
            {mobileMenuOpen && (
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="lg:hidden text-slate-400 hover:text-white p-1 rounded-md"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto">
          {navItems.map(item => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                id={`sidebar-nav-${item.id}`}
                onClick={() => handleNavClick(item.id)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-sm font-medium transition text-left ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-4 h-4 rounded-xs border flex items-center justify-center transition ${
                      isActive ? 'border-white bg-white/20' : 'border-slate-500'
                    }`}
                  >
                    <div className={`w-1.5 h-1.5 rounded-xs ${isActive ? 'bg-white' : 'bg-transparent'}`} />
                  </div>
                  <span>{item.label}</span>
                </div>

                {item.badge && (
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-bold text-white ${
                      item.badgeColor || 'bg-slate-700'
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
          <div className="p-3 mx-3 mb-3 bg-slate-800/80 rounded-2xl border border-slate-700/80 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <div
                className={`w-8 h-8 rounded-xl ${
                  currentUser.avatarColor || 'bg-blue-600'
                } text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-2xs`}
              >
                {currentUser.name.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-slate-100 truncate">{currentUser.name}</p>
                <p className="text-[10px] text-slate-400 truncate font-mono">{currentUser.email}</p>
              </div>
            </div>

            <button
              id="sidebar-logout-btn"
              onClick={() => {
                if (window.confirm('Yakin ingin keluar dari akun?')) {
                  logout();
                }
              }}
              className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-700/80 rounded-lg transition shrink-0"
              title="Keluar / Logout"
            >
              <LogOut size={16} />
            </button>
          </div>
        )}

        {/* Bottom Cloud Sync Status Pill */}
        <div className="p-4 bg-slate-900 border-t border-slate-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div
                className={`w-2.5 h-2.5 rounded-full ${
                  syncState.status === 'synced'
                    ? 'bg-green-400 animate-pulse'
                    : syncState.status === 'offline'
                    ? 'bg-slate-500'
                    : 'bg-amber-400 animate-bounce'
                }`}
              />
              <div className="text-left">
                <p className="text-[11px] font-semibold text-slate-200">
                  {syncState.status === 'synced'
                    ? 'Cloud Sync: Aktif'
                    : syncState.status === 'offline'
                    ? 'Cloud Sync: Offline'
                    : 'Cloud Sync: Updating'}
                </p>
                <p className="text-[9px] text-slate-400 truncate max-w-[120px]">
                  HannaBee (0821-7886-7116)
                </p>
              </div>
            </div>

            <button
              id="sidebar-sync-now-btn"
              onClick={() => syncWithCloud()}
              disabled={syncState.isSyncing}
              className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg border border-slate-700 transition"
              title="Sinkronkan Sekarang"
            >
              <RefreshCw size={13} className={syncState.isSyncing ? 'animate-spin' : ''} />
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

