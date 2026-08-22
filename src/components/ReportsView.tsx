import React, { useState } from 'react';
import { useWarung } from '../context/WarungContext';
import { ProfitLossReport } from './ProfitLossReport';
import { AnalyticsDashboard } from './AnalyticsDashboard';
import { DailyMenuSalesReport } from './DailyMenuSalesReport';
import { TransactionsView } from './TransactionsView';
import { ExpensesView } from './ExpensesView';
import { exportProfitLossToExcel, exportProfitLossToPDF, exportTransactionsToExcel, exportTransactionsToPDF } from '../utils/exportData';
import {
  FileSpreadsheet,
  TrendingUp,
  Receipt,
  ArrowDownCircle,
  Download,
  Calendar,
  Layers,
  FileText,
  DollarSign,
  PieChart,
  UtensilsCrossed,
} from 'lucide-react';

export type ReportSubTab = 'profit_loss' | 'daily_menu_sales' | 'analytics' | 'transactions' | 'expenses';

interface ReportsViewProps {
  initialSubTab?: ReportSubTab;
}

export const ReportsView: React.FC<ReportsViewProps> = ({ initialSubTab = 'profit_loss' }) => {
  const [activeSubTab, setActiveSubTab] = useState<ReportSubTab>(initialSubTab);
  const { storeSettings, calculateProfitLoss, transactions, expenses } = useWarung();

  // Quick export handlers
  const handleExportPLMonthExcel = () => {
    const start = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const end = new Date();
    const summary = calculateProfitLoss(start, end, 'Bulan Ini');
    exportProfitLossToExcel(summary, storeSettings);
  };

  const handleExportPLMonthPDF = () => {
    const start = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const end = new Date();
    const summary = calculateProfitLoss(start, end, 'Bulan Ini');
    exportProfitLossToPDF(summary, storeSettings);
  };

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
    {
      id: 'expenses' as ReportSubTab,
      label: 'Buku Pengeluaran',
      desc: 'Biaya Bahan Baku & Operasional',
      icon: <ArrowDownCircle size={16} />,
      color: 'text-rose-600',
    },
  ];

  return (
    <div className="space-y-4">
      {/* Top Sub-Navigation Header Bar */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-20 shadow-2xs">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 pt-3 pb-0">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-8 h-8 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center font-bold text-sm">
                  📊
                </span>
                <div>
                  <h1 className="text-base sm:text-lg font-bold text-slate-900">
                    Pusat Laporan & Pembukuan Warung
                  </h1>
                  <p className="text-xs text-slate-500">
                    Pantau seluruh performa laba rugi, grafik analitik, transaksi, dan pengeluaran secara real-time
                  </p>
                </div>
              </div>
            </div>

            {/* Quick Master Export Buttons */}
            <div className="flex items-center gap-2">
              <button
                id="report-hub-export-excel"
                onClick={handleExportPLMonthExcel}
                className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition shadow-2xs"
                title="Unduh Laporan Laba Rugi Bulan Ini dalam format Excel"
              >
                <FileSpreadsheet size={14} className="text-emerald-700" />
                <span>Unduh Excel Bulan Ini</span>
              </button>

              <button
                id="report-hub-export-pdf"
                onClick={handleExportPLMonthPDF}
                className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition shadow-2xs"
                title="Cetak/Unduh Laporan Laba Rugi Bulan Ini dalam format PDF"
              >
                <FileText size={14} className="text-slate-300" />
                <span>Cetak PDF Laba Rugi</span>
              </button>
            </div>
          </div>

          {/* Tab Selection Bar adhering to Geometric Balance */}
          <div className="flex space-x-1 sm:space-x-2 overflow-x-auto border-t border-slate-100 pt-2 scrollbar-none">
            {subTabs.map(tab => {
              const isActive = activeSubTab === tab.id;
              return (
                <button
                  key={tab.id}
                  id={`report-tab-${tab.id}`}
                  onClick={() => setActiveSubTab(tab.id)}
                  className={`flex items-center gap-2 px-3.5 py-2.5 rounded-t-xl text-xs font-semibold whitespace-nowrap transition border-b-2 ${
                    isActive
                      ? 'border-blue-600 text-blue-700 bg-blue-50/60 font-bold'
                      : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <span className={isActive ? 'text-blue-600' : 'text-slate-500'}>
                    {tab.icon}
                  </span>
                  <span>{tab.label}</span>
                  {tab.badge && (
                    <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-amber-500 text-white font-bold">
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
        {activeSubTab === 'expenses' && <ExpensesView />}
      </div>
    </div>
  );
};
