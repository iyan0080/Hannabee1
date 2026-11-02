import React, { useState } from 'react';
import { useWarung } from '../context/WarungContext';
import { ProfitLossReport } from './ProfitLossReport';
import { AnalyticsDashboard } from './AnalyticsDashboard';
import { DailyMenuSalesReport } from './DailyMenuSalesReport';
import { TransactionsView } from './TransactionsView';
import {
  FileSpreadsheet,
  TrendingUp,
  Receipt,
  UtensilsCrossed,
} from 'lucide-react';

export type ReportSubTab = 'profit_loss' | 'daily_menu_sales' | 'analytics' | 'transactions';

interface ReportsViewProps {
  initialSubTab?: ReportSubTab;
}

export const ReportsView: React.FC<ReportsViewProps> = ({ initialSubTab = 'profit_loss' }) => {
  const [activeSubTab, setActiveSubTab] = useState<ReportSubTab>(initialSubTab);
  const { transactions } = useWarung();

  const unpaidDebtCount = transactions.filter(t => t.status === 'BELUM_LUNAS').length;

  const subTabs = [
    {
      id: 'profit_loss' as ReportSubTab,
      label: 'Laba Rugi',
      desc: 'Omzet, HPP, Laba Kotor & Bersih',
      icon: <FileSpreadsheet size={16} />,
      color: 'text-blue-600',
    },
    {
      id: 'daily_menu_sales' as ReportSubTab,
      label: 'Penjualan Menu & Varian',
      desc: 'Laporan Penjualan Harian per Menu & Varian',
      icon: <UtensilsCrossed size={16} />,
      color: 'text-amber-600',
    },
    {
      id: 'analytics' as ReportSubTab,
      label: 'Analitik Penjualan',
      desc: 'Grafik Tren, Jam Ramai & Menu Terlaris',
      icon: <TrendingUp size={16} />,
      color: 'text-emerald-600',
    },
    {
      id: 'transactions' as ReportSubTab,
      label: 'Riwayat Transaksi',
      desc: 'Nota Penjualan, Struk WA & Kasbon',
      icon: <Receipt size={16} />,
      color: 'text-amber-600',
      badge: unpaidDebtCount > 0 ? `${unpaidDebtCount} Bon` : undefined,
    },
  ];

  return (
    <div className="space-y-4">
      {/* Top Sub-Navigation Header Bar */}
      <div className="bg-white border-b border-slate-200/80 sticky top-0 z-20 shadow-xs">
        <div className="max-w-7xl mx-auto px-3 sm:px-6">
          {/* Clean Segmented Tab Selection Bar */}
          <div className="flex space-x-1.5 overflow-x-auto py-2.5 scrollbar-none">
            {subTabs.map(tab => {
              const isActive = activeSubTab === tab.id;
              return (
                <button
                  key={tab.id}
                  id={`report-tab-${tab.id}`}
                  onClick={() => setActiveSubTab(tab.id)}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition cursor-pointer ${
                    isActive
                      ? 'bg-slate-900 text-white font-semibold shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <span className={isActive ? 'text-white' : 'text-slate-500'}>
                    {tab.icon}
                  </span>
                  <span>{tab.label}</span>
                  {tab.badge && (
                    <span
                      className={`px-1.5 py-0.2 rounded-md text-[10px] font-bold font-mono ${
                        isActive ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Sub-view Content */}
      <div className="pb-10">
        {activeSubTab === 'profit_loss' && <ProfitLossReport />}
        {activeSubTab === 'daily_menu_sales' && <DailyMenuSalesReport />}
        {activeSubTab === 'analytics' && <AnalyticsDashboard />}
        {activeSubTab === 'transactions' && <TransactionsView />}
      </div>
    </div>
  );
};
